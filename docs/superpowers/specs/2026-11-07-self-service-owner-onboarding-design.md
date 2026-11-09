# Self-service Owner onboarding design

Status: approved for backend implementation by Jose on November 7, 2026. Hosted/production enablement and actual policy/resource settings remain separately gated.
Backend owner: Codex. UI owner: Claude. Production authorization remains separate.

## Goal and customer journey

An Owner can verify their email, create a new business, configure the enabled workforce features, add people, and issue employee invitations without an operator creating the company or accounts manually. Routine signup must recover automatically from transient interruptions. Exceptional provider outages still have an operating escalation path.

Journey: verified email -> business basics -> automatic isolated provisioning -> first Owner password/account activation -> resumable business setup -> team and invitations -> module-specific readiness and first-use guidance.

Account creation and setup are web-first, usable by Claude's responsive UI. Existing native sign-in must understand the resulting workspace URL/business code; native store publication is a separate release.

## Evidence and architectural decision

Baseline: origin/development e2872f30ea8548b1310ea4a9b25813352decf82a, fetched November 7. The normal checkout is older; implementation starts in isolation from the current development source.

Existing reusable seams:
- README.md and scripts/company-setup.ts implement one company per database, empty-schema checks, canonical migration order and atomic Owner creation.
- src/lib/company-access/employee-profile.server.ts provides createEmployeeWithAccess and actor-scoped idempotency receipts.
- src/lib/auth/invitations/{model,service.server,claim.server,delivery.server}.ts provide Owner-authorized issue/revoke/status, 168-hour invitation validity, target/revision checks and explicit uncertain delivery/commit states.
- src/lib/auth/session.ts, src/lib/data/sql-executor.ts and src/lib/db.ts still include a cached single-database transport; request routing and session/token binding therefore require material work.
- src/components/owner-setup-card.tsx currently checks only coverage and weekly hour targets.
- docs/architecture/tenant-foundation.md explicitly retains unfinished shared-database cutover/runtime/isolation gates. Its presence is not multi-customer readiness.

Recommended architecture: one isolated Neon project/database per business, plus a separate small control database for registration, routing, operation receipts, provisioning leases and secret references. Keep the existing one-company business schema within each database. A shared application can serve registered workspace hosts only after every request and non-request entry point is bound to the correct database and workspace.

This is a new bounded self-service scope, not activation of the held Phase F shared-database/RLS migration. Existing businesses are not backfilled, moved or reconfigured by this work. Do not resurrect the cancelled first-company form SCRUM-128.

Neon's official guidance recommends project-per-tenant for independent compute/history/restore. References:
- https://neon.com/docs/guides/multitenancy
- https://github.com/neondatabase/website/blob/main/content/faqs/postgres-services-saas-tenant-database-provisioning.md
- https://github.com/neondatabase/website/blob/main/content/faqs/best-postgres-services-isolated-database-tenants.md

Capacity, actual account entitlement, resource cost, region, secret custody and approved application-domain/DNS capability must be verified before hosted provisioning. This design makes no pricing or entitlement claim.

## Scope

1. Verified Owner registration with explicit terms/privacy version receipts, abuse controls and account recovery.
2. An authoritative workspace registry and deterministic, resumable provisioning workflow.
3. Workspace-bound application entry points, credentials, sessions, invitations, passkeys, resets, exports, Clocker, calendars, caches, jobs and native access.
4. First-Owner activation without an existing Owner issuer and without storing a reusable password in the control database.
5. Saved company profile, timezone, locations, positions/qualifications, working-week/scheduling rules, staffing/coverage, hour targets and enabled-feature settings.
6. Employee creation and scheduling/pay settings using existing canonical commands.
7. Explicit individual/selected-group invitations, resend/revoke/status and employee activation.
8. Server-derived readiness, clear recovery states, maintenance/cleanup and release evidence.

No payment processor, automatic billing, AI activation, payroll calculation rewrite, statutory policy engine, SMS delivery or legacy-company migration is included. Trial duration, subscription eligibility, public deletion promises and country-specific policy defaults are not invented. Configured feature readiness may link to existing payroll/Clocker/policy setup without enabling money movement, punches or employee messages implicitly.

## Identity and routing

Use an opaque registration ID and verified-email signup session before a business exists. Email verification is not evidence of incorporation, employment authority beyond this new workspace, trademark ownership or entitlement to an existing business. Business-name collisions never transfer ownership.

Create the initial Owner profile without a password via a new narrow pending-Owner bootstrap seam. The Owner chooses a company-local sign-in ID, validated with the existing ID rules; OWNER is assigned only by the server. After the business database and registered host are ready, issue a short-lived host/workspace-bound bootstrap grant. Consume it in that business database to create the Owner credential and a durable activation receipt. Password hashes live only in the business database. This is a separate protocol from employee invitations, which correctly require an existing Owner issuer.

After acknowledged activation, the Owner uses the existing guarded sign-in/session flow on their workspace host. A failed cookie write or lost response must not create a second Owner or claim rollback; a receipt/status read and normal sign-in recover the account.

Workspace host: a registry-owned slug under NEVORA_PORTAL_BASE_DOMAIN, with an opaque stable workspace ID. No real domain is assumed by this plan. Employee IDs remain company-local; duplicate employee IDs across companies are valid. Public central entry can send workspace access links after email verification without revealing a person's memberships to an unauthenticated caller.

Canonical-host resolution is database routing, not user authorization. Validate allowed proxy headers and exact registry lifecycle/incarnation, then validate a workspace-bound bearer and current business authority. Do not trust arbitrary tenant IDs, forwarded hosts, database URLs or role fields in forms.

Multi-company mode must never fall back to DATABASE_URL. Every route, Server Action, server render, public Clocker/calendar/activation endpoint, export/photo/PDF response and worker must use an explicitly issued workspace database binding. No process-global active company or mutable tenant selection. Existing single-company mode remains compatible and is not changed during rollout.

## State and persistence

Registration states: EMAIL_PENDING, EMAIL_VERIFIED, WORKSPACE_RESERVED, PROVISIONING, OWNER_ACTIVATION_REQUIRED, SETUP_IN_PROGRESS, READY.
Operational exceptions: RETRYABLE, ACTION_REQUIRED and OUTCOME_UNKNOWN; they include an operation ID and an allowed recovery action, never a fabricated success.

Each state change has a version and actor/registration-bound command hash. An identical operation ID/input returns the original receipt; changed input under the same ID conflicts. A different browser tab cannot overwrite a newer revision.

Provisioning stages have individual receipts: reservation, provider resource confirmed, migration manifest installed, company and pending Owner committed, runtime credentials installed, registered host available. Bind the exact provider resource, environment, schema/source manifest and operation ID. Unknown external creation/commit must be reconciled before another create/migration attempt.

Separate control and company transactions are not atomic together. Publish the next control state only after checking the exact company/provider receipt; fence recovery with operation IDs and resource ownership. No automatic deletion or compensating reset of a business that has acquired data.

Proposed security defaults for review: verification link 30 minutes, pre-business signup session 24 hours, resend cooldown 60 seconds; durable counters max 5 verification sends per email/IP in 15 minutes with an additional configurable platform cap. First-Owner bootstrap grant 15 minutes and single use. Preserve existing employee invitation 168-hour validity and issue limits (3 per target and 300 per company per 15 minutes). These are proposed signup defaults, not claimed existing policy.

Public provisioning defaults off and project-creation allowance defaults zero. Enabling hosted signup requires an explicit approved daily resource ceiling, provider/account checks, operating owner and retention/cost settings. Resource creation is never inferred from approval of this document.

## Resumable setup and readiness

Persist business settings through their existing domain commands, not a parallel onboarding copy of the business. Store onboarding progress/receipts separately; recompute completion from current canonical records.

Readiness sections:
- BUSINESS: verified initial Owner, active company, timezone and at least one location.
- LOCATIONS: active company-owned locations and their operational setup.
- POSITIONS: configured operational positions/qualifications where the selected scheduling setup requires them; access roles remain separate.
- SCHEDULING: configured coverage/working-week/targets and valid team/qualification inputs for the intended scheduling use.
- PEOPLE: valid profiles/location eligibility; uninvitable employees explain missing email or access conditions.
- INVITATIONS: sender is configured and observed delivery state is displayed.
- TIME_TRACKING: selected location/device and applicable Clocker/privacy/PIN setup.
- PAYROLL: required existing employer/pay/policy settings and applicable acceptance; optional until requested.
- OPTIONAL_FEATURES: existing feature gates remain authoritative.

An Owner may create a business and save setup without activating every optional module or adding staff immediately. Incomplete modules remain clearly pending rather than being marked ready. No fabricated wage/break/legal defaults, no auto-published schedule and no automatic invitation send on a profile save.

## Invitations and delivery

Reuse createEmployeeWithAccess and issueOrRevokeInvitation. Adding a person is separate from inviting them. Email is optional for a draft profile but required for the current email activation method.

A selected-group command snapshots reviewed employee versions, generates stable child operation IDs and returns per-person receipts. Recheck Owner authority, role generation, target email/version and company lifecycle before each issue. Partial success is visible and replay resumes existing operations. Preserve UNKNOWN: provider acceptance is not confirmed delivery, and uncertain sends are not blindly resent.

Protect invitation/reset/bootstrap bearers from query logs, referers, browser history, analytics and error reporting. Keep raw bearer handling request-local except any explicitly reviewed short-lived encrypted delivery payload; database proof records retain domain-separated hashes.

## Customer acceptance

- Two new fictional businesses complete the journey concurrently with the same employee IDs and overlapping names, with no cross-company reads, writes, cookies, cache entries, tokens, files or jobs.
- One verified registration plus repeated submits, timeouts and restarts creates exactly one business/resource binding and one initial Owner.
- The Owner resumes on another authenticated visit; saved canonical settings survive refresh. Out-of-order edits conflict.
- Invited staff activate successfully; expired/revoked/reissued/changed-email/wrong-company proofs fail without disclosure.
- Delivery failure and partial group success can be recovered from the UI without engineering database edits.
- Existing single-company company setup, employee access, scheduling, Clocker, payroll and native auth contracts still pass at the same accepted source.
- Claude's real integrated desktop/mobile/keyboard and loading/error/success flows pass against the implemented APIs, not only mocks.
- Exact-source hosted isolation/provisioning/recovery/restore/email evidence and required independent dispositions are recorded before public enablement.

## Material risks and controls

- A wrong routing/session/cache binding could expose one business to another: complete the entrypoint inventory and simultaneous A/B negatives before enablement; company name or host alone never authorizes data access.
- Per-business resources increase provisioning, migration, cost and recovery responsibilities: enforce approved capacity/resource ceilings, bounded provisioning workers, per-company migration receipts and restore runbooks. No public resource creation while those inputs are unapproved.
- The shared application/control/provisioner can be a cross-company compromise boundary even with separate databases: separate provisioner and runtime custody, minimize registry data, keep secret references server-only, restrict retrieval/roles, rotate credentials and audit administrative access. Physical database separation is not a claim of immunity to a compromised privileged service.
- Cross-provider/control/company transactions can leave partial or uncertain outcomes: reconcile durable exact-resource receipts before retries; quarantine ambiguous resources instead of reusing or deleting them.
- Existing employee phone and account validation limits remain authoritative; the UI must explain unsupported input rather than invent worldwide phone/payroll support.

## Open decisions and gates

The document proposes the isolation architecture and signup defaults for review. Before hosted enablement Jose must confirm the allowed account/resource budget, approved domain/region, operating/retention settings and any trial/subscription policy the product promises. Development implementation can use local fictional control/company databases, simulated provider responses and fake SMTP while these external settings remain disabled.

Product: proceed with resumable end-to-end onboarding. Engineering: isolated company databases reuse current schema, but require complete routing conversion. Security: host selection alone is insufficient; token/current-authority and A/B evidence are mandatory. Governance: GO for planning, production BLOCKER until required evidence/authority. No current independent finding or held migration is self-closed.
