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

Implemented creation protocol (Task4): POST `/api/onboarding/workspaces` on the signup origin with the existing verified signup cookie and the exact `OnboardingCommand<WorkspacePayload>` body. The server assigns OWNER, company identity, database/role names and region; none are accepted as caller authority. Duplicate submissions preserve the original body/operation ID; changed replay conflicts. A current verified policy acceptance is required for a new creation. A queued request is202, not a claim that the business is already usable.

Poll GET `/api/onboarding/operations/:operationId`, or `/api/onboarding/operations/current` after refresh when the browser no longer has the UUID. Both require the actual signup cookie and return the actor's durable operation ID. Pending stages include RESERVED, CREATING, RESOURCE_READY, BOOTSTRAPPING, RECONCILING_RESOURCE and OWNER_ACTIVATION_REQUIRED; respect pollAfterMs. At OWNER_ACTIVATION_REQUIRED the next action is the separate initial-Owner grant/password protocol (Task5), not ordinary employee invitation or a completed setup claim. Unknown external creation does not authorize a new operation/POST. Quarantine or source mismatch returns a safe unavailable reason; preserve data and provide status/recovery guidance.

The current code prepares/configures the provider adapter and disabled worker. It has not created hosted resources or proved hosted role/transport behavior. Claude retains rendering ownership. First-Owner activation, canonical setup/people and invitation-batch APIs are subsequent implementation stages, not yet claimed by this checkpoint.

Implemented first-Owner protocol (Task5): POST bootstrap-grants on the signup origin with {schemaVersion:1,operationId} and the signup cookie. Repeat the same operation ID to recover/poll.202 pending means the separate provisioner has not confirmed the company-side grant yet.200 ready returns {operationId,url,expiresAt}; the exact registered URL carries an opaque fragment proof and expires after15minutes. A new grant request is rate limited and revokes prior grants when published. Never store/log the redirect proof.

On that company origin, POST owner-activation with {schemaVersion:1,operationId,proof,password}. Preserve the operation ID and original body for a lost-response retry; changed replay conflicts. Known success is {state:activated,employeeId,nextAction:SIGN_IN}. Activation intentionally issues no session cookie. Wait for the original signup provisioning operation to reach ACTIVATED, then use normal company sign-in (existing guarded credential/session flow). Pending finalization is not a password failure: never reset/reissue a password automatically. A lost response recovers the receipt or normal sign-in, including when the browser could not receive a cookie. Owner-grant and employee-invitation proofs are separate purposes.

Implemented canonical setup (Task6): GET state on the ACTIVE company host under the real Owner session returns {state:ready,snapshot,configuration,destinations}. configuration contains current workspace, locations (exact updatedAt), positions, staffing, coverage and employee setup projections. Use these values after Back/refresh; the snapshot stays schemaVersion1. It is protected even when new signup is switched off.

POST steps/:stepId uses {schemaVersion:1,operationId,expectedVersion,payload}. BUSINESS payload={name,timeZone}. LOCATIONS payload={action:CREATE,name,shortName,clockerKey}, or {action:UPDATE,id,name,shortName,active,expectedUpdatedAt}. POSITIONS payload={action:CREATE,name}, or {action:UPDATE,id,name,active,expectedUpdatedAt}. SCHEDULING supports {action:STAFFING,staffingSettings:[{locationId,minimumStaffPerShift,requiresDesignatedLead}],hourTargets:[{employeeId,maximumWeeklyHours,targetWeeklyHours?}]}; {action:COVERAGE_CREATE,locationId,dayOfWeek,startTime,endTime,positionRequirements:[{positionId,quantity}],minimumStaff?}; {action:COVERAGE_DELETE,windowId}; {action:COVERAGE_POSITIONS,windowId,requirements:[{positionId,quantity}]}. Names/timezones/catalog ownership and qualification use existing canonical validation.

TIME_TRACKING/PAYROLL/OPTIONAL_FEATURES accept {action:SKIP} as an audited choice only. Configure those modules and company policies through their existing settings destinations/APIs; this flow never activates flags or invents defaults/legal rules. Optional sections deliberately remain OPTIONAL with current configuration/review reasons, and do not block core creation. A business can begin Owner-only and add employees/positions later. SCHEDULING readiness reuses actual location readiness; missing staffing/coverage/eligibility blocks that section and removing canonical data makes it incomplete again. READY describes core business/location/scheduling setup, not payroll/legal certification.

Implemented team setup (Task7): POST people uses {schemaVersion:1,operationId,expectedVersion,payload:{employee:{id,firstName,lastName,phone,email,role,primaryLocationId,eligibleLocationIds,positionIds},initialManagerScope?}}. email is explicitly null when absent. Manager creation requires the existing Owner-selected {mode:COMPANY,locationIds:[]} or {mode:LOCATIONS,locationIds:[...]} scope. Existing canonical validation normalizes the company-local ID/phone and checks actual catalog ownership; a role alone grants no position qualification. Known saved receipt includes subjectId=employee ID, with the new snapshot revision. Preserve the original body/operation on retry. Saving a person creates no invitation or login credential.

GET state returns actual people with updatedAt, invitationRevision, hasCredentials, email and current memberships. Those without email remain saved and have EMPLOYEE_EMAIL_REQUIRED in invitation readiness. Scheduling targets remain the existing SCHEDULING hourTargets command; payroll/pay settings remain their existing explicitly configured flows. Invitation eligibility and delivery are reviewed separately in Task8.

Implemented invitation batches (Task8): POST invitation-batches uses {schemaVersion:1,operationId,expectedVersion,payload:{targets:[{employeeId,expectedEmployeeVersion,expectedInvitationRevision}]}}. Get exact review versions from current state/invitation status. Select1–50 unique people explicitly; one target is the individual flow. Each request processes at most five still-PREPARED items. Replaying the same approved body continues remaining PREPARED targets; changed replay conflicts. Unknown items never dispatch again. Reissuing requires a newly reviewed command/operation and the current invitation revision, and retires the previous proof through the existing service. Existing168hour validity and issue limits remain.

POST202 returns stage INVITATIONS_REVIEW_STATUS, not a sent claim. GET invitation-batches/:operationId returns {state:ready,operationId,version,stage,receipt,items:[{employeeId,operationId,commandState,result,status}]}. stage is PENDING, COMPLETE, PARTIAL or UNKNOWN. Always show per-person canonical result.receipt.delivery (PREPARED, PROVIDER_ACCEPTED, FAILED or UNKNOWN) and current eligibility/status; provider acceptance does not prove inbox receipt. status is the existing masked invitation projection. GET reconciles receipts only and never sends. Version is a batch mutation hint; time-dependent expiry/delivery status must still be refreshed.

Profiles/roles/email and original Owner/target role generations are rechecked for each issue. Demotion/promotion cannot reactivate an old batch approval. A crash before/after canonical issue can leave UNKNOWN even if no email was ultimately sent; preserve that uncertainty and offer current-status review. Do not create a fresh operation automatically after a timeout. Revocation remains the existing invitation command, and employee activation remains its existing bound /activate flow.
