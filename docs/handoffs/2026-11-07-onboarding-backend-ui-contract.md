# Proposed onboarding backend/UI contract — November 7, 2026

Status: contract/configuration and verified registration endpoints implemented locally; later workspace/setup/invitation endpoints remain planned. Backend: Codex. UI: Claude. Public/hosted signup is disabled by default.
Baseline e2872f30ea8548b1310ea4a9b25813352decf82a.
Spec: ../superpowers/specs/2026-11-07-self-service-owner-onboarding-design.md

## Ownership and sequencing

Claude owns screens, forms, navigation, visual design and accessible rendering. Codex owns validation, signup proof, API/schema contracts, persistence, provisioning, authority, readiness and invitation orchestration. No existing UI file is assigned to Codex in this plan. This document is a handoff artifact; no other chat was messaged.

Freeze and implement versioned schemas/fixtures first. Claude may build against those fixtures while backend tasks proceed. Integrate against the real local/isolated APIs before claiming completion. UI must not infer a saved command, sent email or completed setup from a click, timeout or optimistic state.

## Proposed routes and capabilities

| Route | Allowed caller | Request / result |
| --- | --- | --- |
| GET /api/onboarding/config | Public | schemaVersion, signupEnabled, locales and current reviewed terms/privacy version+URL only; no private configuration |
| POST /api/onboarding/registrations | Public, abuse-limited | email, locale, termsVersion, privacyVersion, operationId -> generic verification_requested |
| POST /api/onboarding/verification | Possessor of verification proof | proof in POST body -> verified signup cookie and registration snapshot |
| POST /api/onboarding/workspaces | Verified signup session | operationId, expectedVersion, businessName, timeZone, requestedSlug, initialLocation, ownerProfile -> operation receipt |
| GET /api/onboarding/operations/:operationId | Same signup actor or current workspace Owner | bounded operation status and next action |
| POST /api/onboarding/bootstrap-grants | Current verified signup session for its provisioned business | operationId -> one-use workspace-bound redirect, no general credential |
| POST /api/onboarding/owner-activation | Bound workspace host plus bootstrap proof | operationId, proof, password -> activated receipt / invalid / outcome_unknown |
| GET /api/onboarding/state | Current authenticated workspace Owner | canonical section status, revision, allowed next actions |
| POST /api/onboarding/steps/:stepId | Current workspace Owner | operationId, expectedVersion, schema-validated step payload -> saved receipt/conflict/errors |
| POST /api/onboarding/people | Current workspace Owner | operationId and existing employee command shape -> employee receipt |
| POST /api/onboarding/invitation-batches | Current workspace Owner | operationId and selected employee IDs/versions/revisions -> per-person issue status |
| GET /api/onboarding/invitation-batches/:operationId | Current workspace Owner with receipt access | bounded per-person receipts and overall pending/partial/complete state |

Revocation/resend/status use the existing company-access invitation commands; route adapters may be added but must call the same services. No universal arbitrary settings payload, role escalation, tenant/database selector, unrestricted return URL or automatic published action.

## Shared schemas to implement in src/lib/onboarding/contracts.ts

RegistrationState = EMAIL_PENDING | EMAIL_VERIFIED | WORKSPACE_RESERVED | PROVISIONING | OWNER_ACTIVATION_REQUIRED | SETUP_IN_PROGRESS | READY.
StepId = BUSINESS | LOCATIONS | POSITIONS | SCHEDULING | PEOPLE | INVITATIONS | TIME_TRACKING | PAYROLL | OPTIONAL_FEATURES.
SectionState = NOT_STARTED | IN_PROGRESS | READY | OPTIONAL | BLOCKED.

OnboardingSnapshot: schemaVersion:1, version:string, registrationState, workspace:{id,displayName,portalUrl}|null, sections:[{id,state,reasonCodes,allowedActions}], nextStep:StepId|null.
OnboardingCommand: schemaVersion:1, operationId:UUID, expectedVersion:string, payload: the closed schema for that route/step.
OnboardingResult: saved(receipt,snapshot), pending(operationId,stage,pollAfterMs), invalid(fieldErrors), conflict(snapshot), limited(retryAfterMs), unavailable(reasonCode), outcome_unknown(operationId).
OperationReceipt: operationId, commandKind, committedAt, resultingVersion; never passwords, bearer proofs, secret references, raw provider errors or connection strings.
FieldError: field:string, code:string, params: bounded scalar map. Claude maps codes to reviewed EN/ES strings.

HTTP: saved200/201; pending202; invalid400; missing/expired authority401; authenticated forbidden403; revision/changed-replay conflict409; limited429; unavailable503. An uncertain submitted command uses202 with outcome_unknown and receipt polling, not a generic500 that encourages a new operation. Public verification/registration responses remain non-enumerating.

Idempotency scope includes actor/registration or actor/workspace plus operation ID and command kind. Keep the same ID when recovering that command. A user-confirmed changed command gets a new ID after a fresh source read.

## UI behavior

Implemented registration details: fetch current published policy versions from GET config. Registration body is {schemaVersion:1,operationId,email,locale,termsVersion,privacyVersion}; verification body is {schemaVersion:1,operationId,proof}. Keep the verification operation ID stable for receipt recovery; it is not an authority token. Successful verification sets an HttpOnly host-only nevora_signup cookie; neither raw token nor private proof is in JSON. A reissued verification resumes the same unfinished signup, preserving business provisioning progress. Fresh verification of an expired signup revokes its old signup sessions. Public registration outcome_unknown recovers by replaying the exact original POST; protected operation polling requires the signup/Owner authority, not just a guessed UUID.

Sender outcome remains separate from the generic public verification_requested acknowledgement. Identical accepted cooldown requests are also durably idempotent. New commands require current configured reviewed policy versions; replaying an already committed request retains its historical receipt. Do not present this as a new policy acceptance.

- Persist progress on the server; refresh/resume from GET state. No PII/password/proof storage in localStorage.
- Preserve entered non-secret form values for invalid/conflict where safe; never silently overwrite another tab's newer settings.
- Verification/bootstrap/invitation bearers arrive in fragments, are scrubbed before third-party content and are submitted only to the correct host in a POST.
- Progress, expectedVersion and allowedActions come from current server state; optional module skips do not claim that module is ready.
- Show employee creation, invitation validity and delivery as separate statuses. PREPARED, PROVIDER_ACCEPTED, UNKNOWN and FAILED retain their existing meaning; never label provider acceptance “delivered”.
- Disabled/missing sender, expired verification, unavailable provisioning, slug conflict and partial invitation batch all have explicit next actions.
- On outcome_unknown poll the original operation. Do not repeat a resource create or email send under a fresh ID.
- The initial Owner chooses a password only on the verified provisioned workspace; existing employee activation follows its current flow.
- Owner profile input includes the chosen company-local sign-in ID, first/last name and validated phone; email comes from the verified registration. OWNER is server-assigned, not a submitted access role. On activation, show the workspace URL and sign-in ID for later sign-in.
- Claude owns the website/app entry links and their destinations as well as the setup screens; top-level navigation to the approved signup origin must not reuse the separate public-assistant API or its CORS policy.
- Final summary offers existing draft schedule/Clocker/payroll destinations only when their readiness allows it. No action is auto-published or sent.

## Fixture and acceptance handoff

Create versioned fixtures for the normal journey and every result union, plus two-tab conflict, resumed provisioning, unknown provider result, invalid/expired/wrong-host activation, absent email, sender unavailable and partial group invitations.

Claude's acceptance: desktop/mobile layouts, keyboard/focus, password manager/autofill, EN/ES error text, refresh/back navigation, slow/offline/reconnected cases, loading/empty/error/success and optional module skips. Joint acceptance uses two actual fictional company databases, not tenant IDs mocked in one unqualified database.


Implemented transport contract (Task3): isolated portals require their exact registered business host. Browser auth/device/passkey/installation cookies remain HttpOnly and host-only; their opaque values now bind company, environment, restore incarnation and purpose. Application services receive the original inner proof only after validation. Never parse or synthesize these cookie values in UI.

Invitation/recovery/Clocker setup/calendar links now carry bounded opaque `nw1_...` envelopes in isolated mode. Treat them as opaque strings (up to4096 characters); employee invitation and recovery fragments are still scrubbed immediately. Existing component changes here are syntax admission/input limits only. The server continues validating the inner proof, expiry, target and current authority. Legacy single-company links retain their existing encoding.

Cookie-free discovery: POST `/api/mobile/v1/workspaces/resolve` on the configured signup origin with `Content-Type: application/json`, `x-nevora-workspace:1`, body `{schemaVersion:1,slug}` and no Cookie header. Success: `{schemaVersion:1,status:"ready",origin}`; only the exact registered ACTIVE business origin is returned. Unknown/suspended businesses return generic404, platform-budget exhaustion429, source/config failure503. It does not reveal employees or grant a session. Native `WorkspaceSelection` validates this projection for the requested slug and configured base domain; selecting/persisting the business and clearing web/native private state when changing it remain UI integration responsibilities. Current installed binary/entitlement support has not been verified here.

Optional Clocker photo capture retains its existing staging-only provider gate. The legacy provider cleanup function and held PhaseF selected-locator auth explicitly deny isolated mode; they do not select an existing company as fallback. Manual supported workers require an explicit registered `NEVORA_WORKER_WORKSPACE_ORIGIN` and dedicated WORKER secret. Public isolated logo responses are private/no-store.
