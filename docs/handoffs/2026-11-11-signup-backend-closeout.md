# Codex → Claude: signup backend closeout, November 11

Backend owner: Codex. UI owner: Claude. This records backend implementation and source-specific qualification. Public customer admission and the website trial CTA remain held for joint acceptance.

## Source and environments

- Development base: `d80da2a35b586378b59bdadc5e989baffe430165`.
- Backend application checkpoint: `6f7de686ccaab385ef1a4474331ae32c4e98b0d8` (includes network admission `d0c2c6e6e229051be95965503dbfe5f54700fea8`). Qualification and review receipts are recorded separately below.
- Existing hosted signup remains deployed application source `3922df940deef009b3a357ed2788cc7bb28e3fed`, Vercel deployment `dpl_5WsYDzYbdFnXwUZtBDfcQNNgigSX`. Fresh CLI readback confirms Ready and aliases `signup.nevora.team` and `*.portal.nevora.team`. The new network fix is **not deployed** by this closeout. Do not replace the deployed assembly wholesale with development: held UI, routing/deployment configuration and active billing source must be reconciled first.
- `https://signup.nevora.team/api/onboarding/config`: 200, schemaVersion1, `signupEnabled:false`, EN/ES. This is the intended controlled-admission state, not a broken domain.
- `https://commerce.nevora.team/health` and `/ready`: 200. This is liveness/readiness only; ongoing billing work belongs to its existing owner.
- Synthetic fixture: `https://velani-acceptance-20261110.portal.nevora.team/login`. Owner ID `OWNER-1`. Acceptance password is not retained. Use normal recovery with Jose entering the replacement password; never insert a session or reset real customer data to get a test through.

## Backend corrections

1. HTTP signup now passes a validated Vercel edge address to the existing durable email/IP/platform counters. Only `VERCEL=1` with a single valid `x-vercel-forwarded-for` address is trusted; generic forwarding headers and direct-host spoofing cannot select a bucket. IPv6 forms normalize; missing/malformed identity keeps the conservative shared budget. Persisted subjects remain keyed digests; no raw address is added to responses or logs. See [Vercel request headers](https://vercel.com/docs/headers/request-headers).
2. Owner activation returns 202 pending until APP routing proves the same current workspace/incarnation is ready for sign-in. The same committed activation command then returns200 activated/SIGN_IN; it never creates an assumed login session. This deployed guard was missing from development and is now included.
3. Verification email links retain the selected EN/ES locale with `?lang=...`; the proof stays only in the fragment. Actual owned SMTP tests cover copy, safe links, definite refusal and uncertain delivery. External delivery is a separate observation.

No schema, provider allowance, sender credential, policy, UI, billing or website change is part of this fix. Development's newer session transaction transport remains preserved.

## Stable UI contract

`schemaVersion:1` remains unchanged. All route paths below share the `/api/onboarding` prefix, including paths abbreviated after their first appearance. Read the existing [full onboarding contract](2026-11-07-onboarding-backend-ui-contract.md) and actual fixture files under `src/lib/onboarding/fixtures/v1`. The opening historical “planned” wording in the November7 document is superseded by its implemented Task6–9 details and this handoff.

- Public config controls whether to present signup. POST `/api/onboarding/registrations` sends a generic receipt; POST `/verification` exchanges the fragment proof for the protected HttpOnly/Secure/SameSite=Strict `nevora_signup` cookie. GET `/registrations/current` resumes from that cookie, with private/no-store responses and no email, proof or secret projection.
- POST `/workspaces`, GET `/operations/<operationId>` and `/operations/current` use the same verified signup actor and durable operation. A pending or unknown create is never replaced with a new operation. The worker reconciles the existing provider resource first.
- POST `/bootstrap-grants` creates the single-use workplace-bound redirect. POST `/owner-activation` runs on the exact company host. Keep proof/password only in memory through a202 and replay the identical body. Only200 `activated`/`SIGN_IN` permits normal Employee ID/password sign-in. The signup cookie is not the employee session.
- On the company host, current authenticated Owner GET `/api/onboarding/state` returns `{state:"ready",snapshot,configuration,destinations}`. Use canonical data, server section readiness and decimal-string version; failure is not an empty business. Core sections BUSINESS, LOCATIONS, POSITIONS, SCHEDULING, PEOPLE, INVITATIONS; optional TIME_TRACKING/PAYROLL/OPTIONAL_FEATURES never enable themselves through a skip.
- Every setup write uses `{schemaVersion:1,operationId:UUID,expectedVersion:snapshot.version,payload}`. Preserve the ID and identical input through timeout, network loss,202 and unknown outcomes. On409 preserve input, reread state, review the new facts, then submit an explicitly changed command with a new ID.
- POST `/steps/<stepId>` uses the canonical setting commands from the contract. POST `/people` saves only a profile with its explicit current access scope. It neither creates a password nor sends an invitation.
- POST `/invitation-batches` explicitly selects1–50 reviewed people using employee versions and invitation revisions. At most five PREPARED targets process per request; replay the same command to continue. GET `/invitation-batches/<operationId>` reads/reconciles only. Display per-person partial/blocked/failed/unknown outcomes. Provider acceptance is not inbox delivery. Never automatically resend UNKNOWN; a newly reviewed reissue uses current revision and a new operation.
- HTTP200 known result;202 pending/unknown;400 validation;401 expired/missing session;403 denied;409 revision/replay conflict;429 limited;503 unavailable. Use supplied retry/poll timing; no guessed success, duplicate create or automatic second invitation.

Claude owns EN/ES desktop/mobile/keyboard/focus and loading, closed, invalid, stale, partial, waiting and recovery screens. No UI work was taken over by Codex.

## Hosted readback and limits

Fresh November11 read-only control queries confirm one registration SETUP_IN_PROGRESS, one provisioning ACTIVATED, one ACTIVE workspace and one verification PROVIDER_ACCEPTED. The private provisioner is deployment6, completed; its native minute trigger is enabled. SMTP and invitation environment names exist on the actual Vercel project; names alone do not prove a new delivery.

November10 receipts document real verification delivery, exactly one provider dispatch/company, uncertain-create reconciliation, one-use Owner activation, normal password sign-in, setup/person save/replay and changed replay409. They exercised NO_EMAIL invitation blocking, **not successful production employee invitation delivery**. Historical isolated staging separately exercised successful invitation/activation for two fictional companies. Neither replaces final-source joined production acceptance.

Creation remains bounded at2 total/1 new dispatch per day per prior production configuration; this closeout raises neither. No new company, external message, paid plan, production deploy, restore or live payment is performed here. Existing approved external test recipient is `support@thevelani.com` only.

## Remaining joined release gate

1. Claude finishes signup and post-sign-in setup UI against these services, including long pending/resume and version/partial/error states.
2. Select the combined deployment candidate without overwriting held UI or billing work; apply its existing required CI, exact-source hosted routing/provisioning checks and the reviewed deployment/rollback procedure.
3. Using the existing synthetic company and approved inbox, complete a successful actual employee invitation, delivered-link activation and normal employee sign-in, plus the authenticated responsive/keyboard Owner journey. Normal credential recovery requires Jose's interaction; no reusable fixture password is supplied.
4. Operating owners retain provider capacity/headroom, workers, alert/recovery and original independent release findings. Jose's scoped customer-launch authorization and resource ceiling must be current before changing admission. Only then change the website CTA and verify it reaches the accepted flow.

Codex retains backend defects and approved activation. The signup backend is implementable by Claude now; this record does not claim public signup is enabled or certify native/payroll/legal/provider operations.

## Qualification custody

At application checkpoint6f7: focused HTTP/email26 cases, owned registration22 and activation13 pass after observed RED. Typecheck and source-bound production build exit0; lint exit0 with the pre-existing monitor anonymous-export warning. Full default units identified the mandatory stale manual binding (12566pass,857skip,1failure). The existing builder regenerated all six guides from6f7 without changing guide prose or assertions; its unchanged verifier is the fix gate. Fresh reviewer found no material backend logic defect and requested this publication refresh (M1); the original review is retained, not relabelled an unconditional approval. Route-prefix clarity L1 is corrected above.

Final candidate full local and GitHub qualification, development publication and exact receipts are tracked at `/Users/josek0514/.codex/nevora-signup-closeout-20261111/` and SCRUM-190. This frozen handoff does not assert a pending run has passed. Main and hosted signup remain separate sources until their own approved release.

Director positions: Engineering supports the bounded corrections; Security retains validated edge-only identity, durable limits, one-use proofs and fail-closed readiness; Product retains the stable v1 contract and Claude UI ownership; Delivery/Governance require exact candidate evidence, controlled admission and original release-owner dispositions. No new policy exception or spend is requested. Rollback before deployment is to retain the existing deployed source; any eventual rollout must preserve compatible schema/keys and verify domains before enabling admission.
