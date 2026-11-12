# Browser-safe v1 onboarding examples

These are fictional data, not a hosted response capture. Use the November 11
[current contract](../../../../../docs/handoffs/2026-11-11-signup-backend-closeout.md)
and the actual types. Never persist passwords, cookies or fragment bearers.
`readiness-cases.json` contains canonical **test inputs**, not another API payload.

| Fixture | Actual response/type boundary | Covered use |
| --- | --- | --- |
| `setup-state.json` | `OnboardingSnapshot`, `contracts.ts`; nested `snapshot` in GET state | All nine sections of an Owner-only workplace before scheduling setup |
| `readiness-cases.json` | `deriveReadiness`, `readiness.server.ts`; canonical projection in `setup.server.ts` | All currently emitted section reasons/actions, empty/invalid inputs, regression and optional configuration |
| `command-results.json` | `OnboardingResult`, `onboardingHttpStatus`, `contracts.ts` | Saved/recovered, pending, invalid, stale/changed replay, limited, unavailable, expired session, denied, unknown |
| `invitation-batches.ts` | `BatchSnapshot`, `invitation-batch.server.ts`; nested `InvitationResult`/`InvitationStatusResult`, `auth/invitations/model.ts` | PENDING, COMPLETE, PARTIAL, UNKNOWN, unavailable; each person's PREPARED/SAVED/BLOCKED/UNKNOWN, missing email, accepted/failed/ambiguous sends |
| `verification-requested.json` | `RegistrationRequestResult`, `registration.server.ts` | Generic acknowledgment; says nothing about account existence or inbox delivery |
| `provisioning-pending.json` | `OnboardingResult` | Current resource-reconciliation illustration; actual stage is supplied by the server |
| `version-conflict.json` | `OnboardingResult` | Preserve input, read current state, review, then create a new changed command |

GET `/api/onboarding/state` returns `{state:'ready',snapshot,configuration,destinations}`.
The outer `ready` means the read succeeded. It does not certify modules. The
configuration types (`OnboardingSetup`, `OnboardingConfiguration`,
`OnboardingPerson` in `setup.server.ts`) contain current canonical fields and exact
timestamps for subsequent writes. Prefer this projection after refresh/back.
Missing/unavailable state is never converted to an empty configuration.

Current section emissions (all examples in `readiness-cases.json` or setup):

| Section | Reasons and actions |
| --- | --- |
| BUSINESS | `BUSINESS_PROFILE_REQUIRED` or none; OPEN, SAVE |
| LOCATIONS | `ACTIVE_LOCATION_REQUIRED` or none; OPEN, SAVE |
| POSITIONS | `POSITIONS_OPTIONAL_UNLESS_REQUIRED` or none; OPEN, SAVE |
| SCHEDULING | `WORKSPACE_INACTIVE`, `LOCATION_INACTIVE`, `STAFFING_NOT_CONFIGURED`, `COVERAGE_NOT_CONFIGURED`, `POSITION_REQUIREMENT_INVALID`, `NO_ELIGIBLE_EMPLOYEES`, or none; OPEN, SAVE |
| PEOPLE | `TEAM_CAN_BE_ADDED_LATER` or none; OPEN, SAVE |
| INVITATIONS | `EXPLICIT_SEND_REQUIRED`, `EMPLOYEE_EMAIL_REQUIRED`, `DELIVERY_NOT_CONFIGURED`, or none; OPEN, CHECK_STATUS; INVITE only with a configured sender |
| TIME_TRACKING | `TIMEKEEPING_SETUP_REQUIRED` or `REVIEW_CURRENT_TIMEKEEPING_SETUP`; OPEN |
| PAYROLL | `PAYROLL_DISABLED`, `PAYROLL_SETUP_REQUIRED`, or `REVIEW_CURRENT_PAYROLL_SETUP`; OPEN |
| OPTIONAL_FEATURES | `FEATURES_REQUIRE_EXPLICIT_CONFIGURATION`; OPEN |

`SectionState` accepts NOT_STARTED, IN_PROGRESS, READY, OPTIONAL, BLOCKED. Current
canonical setup emits the last four; NOT_STARTED is reserved, not proof of a
missing endpoint. `OnboardingAction` also reserves RESEND, REVOKE, ACTIVATE, RETRY;
GET setup currently emits OPEN/SAVE/INVITE/CHECK_STATUS. Actual invitation status
uses a separate `allowedCommands` ISSUE/REVOKE contract. Do not infer permission
from the union or map INVITE into an automatic send. The status/receipt can become
stale even if the batch version is unchanged (expiry is clock based).

Registration states are EMAIL_PENDING, EMAIL_VERIFIED, WORKSPACE_RESERVED,
PROVISIONING, OWNER_ACTIVATION_REQUIRED, SETUP_IN_PROGRESS, READY. Earlier signup
snapshots can have `workspace:null,sections:[],nextStep:null`; they are not company
setup responses. See registration and provisioning HTTP integration cases.

HTTP: 200 known result; 202 pending/unknown; 400 invalid; 401 session missing or
expired; 403 denied; 409 stale/changed replay; 429 limited; 503 unavailable. Some
service failures intentionally combine access and source failure. Do not guess
the cause from that safe projection. Respect `pollAfterMs`/`retryAfterMs`.

Recovery: same operation ID and identical body through lost replies/202. GET
operations/current recovers an actor-owned provisioning ID after refresh. A
changed command needs current facts and a new ID. GET invitation-batches reads
only; POST replays process at most five remaining PREPARED targets. UNKNOWN is
never automatically resent. A reviewed reissue uses current person version and
invitation revision with a new ID. Provider acceptance is not inbox delivery.

Setup writes remain current-Owner-only and commercially gated. An audited SKIP
does not activate Clocker, payroll, notifications or Rondo. The provisioning trial
receipt is immutable; setup READY does not restart it or create a deletion timer.
Claude owns all EN/ES copy, controls, navigation, rendering and visual acceptance.
