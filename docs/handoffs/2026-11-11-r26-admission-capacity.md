# R26 bounded admission and provisioning-capacity port

Date: 2026-11-11. Owner: Codex admission/capacity worker; release integration and
remaining qualification: operations-closeout coordinator. Implementation baseline:
detached `260edee35` on development baseline
`0317598ae6886bc964bbd6bb5c1bbbd3add46069`.

## Scope and attribution

- Ported the admission helper, registration HTTP admission, public config wiring,
  optional total-capacity configuration, account-wide reservation lock and
  dispatch counting from `775aae1a5d2eadf0d28904f963f1b06614942894`.
- Reviewed and ported only `readSignupOrigin` and its config use/tests from
  `1b36e43f8d3246b5df4575dcbc3bbb8f11efb917`, including the production TLS-loopback
  rejection from `1f24a4d87dcab374bb04a66ea61a48bca5289031`.
- The coordinator explicitly added `src/app/api/onboarding/config/route.ts` to the
  bounded ownership so the public response reflects the real admission policy.
  Approved-recipient acceptance does not advertise public registration.
- Adapted only the provisioner role's capacity variable in the hosted allowlist;
  preserved the current commerce role fields. No signup assembly, page/UI,
  rewrite, legal-policy, production hosted-profile, schema or grant import.

## Preserved controls

Production admission defaults closed. Explicit production `open` plus a nonempty
approved-inbox fence closes admission. Approved-recipient mode requires a valid
normalized inbox; denied registration returns before storage or delivery.
Existing onboarding v1 public response shapes and legal references remain intact.

Production provider enablement requires an explicit integer total cap from 1 to
100000. Reservation counting is serialized per provider account across
environments; existing reservations remain counted. Dispatch counting is also
account-wide, across days and environments: distinct operations with PENDING,
UNKNOWN or ACCEPTED attempts consume capacity; only confirmed REJECTED attempts
release dispatch capacity. A lowered dispatch cap does not delete reservations.
These counters cover the control plane's managed operations, not independently
created provider projects or a provider's external quota inventory.

## Evidence obtained

All commands below used local source and fixtures, with no real email or provider
request. Receipts are in `/tmp/nevora-r26-20261111/` for this local work session.

| Check | Actual result |
|---|---|
| Tests before source port: config + HTTP | RED: 21 failed, 32 passed; `behavior-red.log`. Capacity, capability and public visibility assertions rejected the old behavior; missing origin helper also failed. |
| Initial full focused RED | 3 failed files; admission module absent; `unit-red.log`. |
| Admission helper alone, before handler port | RED: 3 failed, 8 passed; denied registration/default production handler returned the old responses; `admission-handler-red.log`. |
| Admission/config/HTTP/capability units after port | 4 files, 90 tests passed; `unit-green.log`. |
| `npx --no-install vitest run src/lib/onboarding services/hosted/neon/capabilities.test.ts --maxWorkers=1` | 14 files, 181 tests passed; `onboarding-units-green.log`. |
| ESLint for all owned TypeScript files | Exit 0; `eslint.log`. |
| Owned-path `git diff --check` | Exit 0. |

Added SQL regressions cover concurrent total reservations, the shared-account
cross-environment lock, lowered-cap concurrent dispatch and a prior-day UNKNOWN
attempt retaining its slot. The prior-day fixture assigns dispatch time on INSERT,
preserving the existing immutable-custody trigger.

## Remaining gates and release position

The worker did **not** run PostgreSQL, default, browser, full typecheck/build or
hosted suites, or push/trigger Actions/deploy. The coordinator owns the single
heavy-run slot and must run the disposable harness:
`node scripts/onboarding-owned.mjs --suite provisioning`, with an explicit verified
`NEVORA_TEST_PG_BIN` and existing application/test database targets unset. The
harness rejects pre-existing targets and creates/removes its own loopback cluster.
SQL tests are prepared, not certified by unit results.

CTO: bounded upstream reuse; CISO: fail-closed admission and conservative unknown
capacity accounting; Program: source port and focused checks complete, database
and candidate qualification pending; Governance: GO WITH CONDITIONS for continued
development qualification, release impact CONDITION. No policy exception or new
Jose decision is required for this local port. Root must retain exact candidate
review, mandatory Actions/development gates and separate production authorization.
No hosted activation or external acceptance is established by this handoff.
