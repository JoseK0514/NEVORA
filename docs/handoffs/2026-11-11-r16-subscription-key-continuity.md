# R16 WebPush protection-key continuity (prepared locally)

No hosted credentials were read, copied, created or rotated. All tests use fictional
keys and endpoints. This is a bounded runtime capability and operator procedure;
hosted rollout/custody, real client coverage and retirement are not certified.

## Runtime contract

`installation.ts` accepts its existing raw32-byte key (unchanged v1 reads/writes)
or a keyring with one active write key, one optional decrypt-only key and one
explicit legacy-v1 key ID. New ring writes are `v2.<id>.<ciphertext>`. The key ID,
version, purpose and existing subscription environment/installation/generation
context are authenticated. IDs are nonsecret 1–32 character URL-safe labels.
Distinct keys require distinct IDs. Unknown/missing/retired IDs, malformed keys,
partial configuration and ambiguous legacy selection fail closed; no key guessing.

Subscription material, installation cookies and signed cleanup receipts all use
this contract. The worker, enrollment/status, logout/account preparation and session
destruction resolve the same keyring. V2 cleanup signatures authenticate the whole
labelled ciphertext and retain current lifetime/revocation limits. Current session,
ownership, generation and consent checks are unchanged. Encryption rotation does
not rotate VAPID keys, extend delivery lifetimes or resend accepted notifications.
The active-key-derived browser dismissal scope may change; it grants no authority.

| Runtime field | Environment variable | Purpose |
| --- | --- | --- |
| subscriptionEncryptionKey | PUSH_SUBSCRIPTION_ENCRYPTION_KEY | Active32-byte base64url key; existing field |
| subscriptionEncryptionKeyId | PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID | Active ID; enables v2 writes |
| subscriptionPreviousEncryptionKey | PUSH_SUBSCRIPTION_PREVIOUS_KEY | Optional decrypt-only32-byte key |
| subscriptionPreviousEncryptionKeyId | PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID | Required together with decrypt-only key |
| subscriptionLegacyEncryptionKeyId | PUSH_SUBSCRIPTION_LEGACY_KEY_ID | Select exactly one configured key for unlabelled v1 |

With no added fields, the old configuration remains v1. With an active ID but no
legacy ID, unlabelled material is deliberately refused. Invalid rotation metadata
disables feature/delivery readiness and returns no usable protection key. These
server-only fields must never be copied into browser props or logs.

## Bounded rollout, migration and rollback procedure

An authorized operator must select the exact workspace/database, environment and
approved credential store, record a rollback owner and hold sending if continuity
is uncertain. No commands below were executed against hosted data.

1. Deploy the capable binary to **every** app, worker and recovery process with the
   unchanged original key and no new metadata. It continues to write v1. Verify
   the exact source/environment; an installed plugin or successful deployment is
   not proof of configured key custody or old-client continuity.
2. In the existing approved store, give the old key a stable ID. Preload the new
   key in the decrypt-only slot on all capable readers while leaving the old key
   active and selecting the old ID for legacy v1. New writes can be v2-old at this
   stage. Confirm every reader can consume both v2 IDs before changing writers.
   Do not reuse an ID for different material.
3. Switch writers to the new key/ID, move the old key/ID to the decrypt-only slot,
   and keep legacy ID pointing to old. During a mixed rollout, the preloaded
   readers can consume both labelled versions and unlabelled old ciphertext.
4. Inventory active stored subscription versions/IDs using counts only. Unknown
   versions/IDs, unreadable ciphertext or missing custody stop retirement. Prepare
   at most100 selected rows per operator batch. Decrypt with the ring, validate the
   subscription through `validatePushSubscription`, reseal with the active ring,
   and verify with an active-only ring **in memory before writing**. Never log
   endpoints, ciphertext, auth keys, cookie/proof or session material.
5. Write only encrypted_material with an exact compare-and-set against row ID,
   employee, environment, installation hash, generation, active status and the
   old ciphertext. Do not change consent_at, session association, fingerprint,
   generation, expiration or deliveries. A zero-row result means a race: reread
   and review current state, never force it. An invalid preparation or failed
   write rolls back that batch; retries use current rows. The actual SQL regression
   proves the same ownership/generation/ciphertext CAS preserves every other
   column and cannot revive a detached row.
6. Cookies require a **separate** continuity gate. A zero old-ciphertext database
   count does not prove old installations or pending cleanup receipts are gone.
   Installation cookies are currently issued for up to365days; cleanup receipts
   retain up to14days. Preserve the old key while a valid old installation or
   cleanup obligation may return. Confirm re-enrollment/session preparation under
   the new key or verified server-side revocation/cleanup for affected devices.
   Bound status reads intentionally do not blindly reseal an unchanged generation
   after a delay: that would reintroduce a newer-enrollment cookie overwrite race.
   Do not infer all-client migration from a status hit, elapsed time alone or a
   subscription count. Do not delete opaque cleanup evidence to claim success.
7. Retire only after all reader/writer, database **and client/cleanup** gates have
   evidence. Remove the decrypt-only key/ID and the old legacy ID together. Old
   material then fails closed; this code does not claim automatic recovery after
   premature key removal. If those gates cannot be established, **refuse
   retirement** and retain decrypt continuity. A compromise response/revocation or
   forced re-enrollment policy needs its own explicit incident scope.

Rollback after any v2 write must keep a capable binary and both keys. Flip the
active/decrypt-only assignments back as a controlled change; retain the old legacy
selection until drained. Never roll back to a v1-only binary, delete a required key
or clear consent to make decryption appear healthy. A change in active key cannot
undo provider submissions and does not claim to remedy a compromised old key.

## Local evidence and next gate

Evidence: `/Users/josek0514/.codex/release-completion-20261111/r12-r13-r16/`.
Nine crypto/config RED failures and two real runtime RED failures preceded changes.
The first runtime GREEN exposed a missed keyring-to-HMAC conversion; that failure
is preserved and fixed. The broad corrected check passed676 related tests with25
separately gated SQL skips; final crypto/config/logout check passed53. Full package
TypeScript passed. The complete notification SQL cohort passed78 checks with no
skips (`r16-actual-notification-sql-owned-prefix.json`), including the actual stored
rewrap/CAS proof, lease/concurrency/logout and no-network worker recovery. Scoped
ESLint passed. The offline crypto scanner inspected45 notification source files
with zero findings; this cannot certify injected keys, hosted custody or history.
The owned runner was extended only to choose the
existing notification fixture's required `fuel_phase3_test_` namespace; its first
wrong-namespace attempt correctly refused and all evidence is retained. No remote
database guard was weakened. Full combined default/build/browser and independent
review are coordinator-owned, not claimed by these targeted checks.

Engineering/security position: GO for local continuity review, CONDITION for any
operator use. Governance: no exception or new Jose policy decision used; actual
hosted rotation/retirement stays unauthorized here. Independent reviewers own their
verdict. Native and production remain outside this packet, with no Actions/push,
real provider notification, customer mutation, dependency, purchase or metered call.
