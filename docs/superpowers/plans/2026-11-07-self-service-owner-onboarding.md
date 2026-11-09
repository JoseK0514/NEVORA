# Self-service Owner Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an Owner create and configure their own isolated NEVORA business and invite employees without routine operator provisioning.

**Architecture:** Keep one company per business database, provisioned automatically into an isolated Neon project. A separate control database owns verified registration, registered workspace routing and durable provisioning receipts. Workspace-bound routing/authentication and existing canonical business commands connect the new workflow to current application behavior.

**Tech Stack:** Existing Next.js16.4.2, React19.3.0, TypeScript, PostgreSQL/Neon, @neondatabase/serverless1.1.0, pg8.23.1, Nodemailer10.0.16 and Vitest5.0.5; no dependency upgrade or new paid service assumed.

**Spec:** [Design](../specs/2026-11-07-self-service-owner-onboarding-design.md).
**UI handoff:** [Proposed API and state contract](../../handoffs/2026-11-07-onboarding-backend-ui-contract.md).
**Source:** fetched origin/development e2872f30ea8548b1310ea4a9b25813352decf82a. Status: approved for backend implementation by Jose ("lets do it", November 7, 2026).
**Jira:** [SCRUM-166](https://thevelani-team.atlassian.net/browse/SCRUM-166), In Progress; backend implementation authorized, hosted/production enablement separate.
**Owners:** Codex backend/contracts/verification; Claude UI. Independent reviewers retain their own disposition authority.

## Global Constraints

- “Backend owner: Codex. UI owner: Claude. Production authorization remains separate.”
- “Existing businesses are not backfilled, moved or reconfigured by this work.”
- “Multi-company mode must never fall back to DATABASE_URL.”
- “No process-global active company or mutable tenant selection.”
- “Public provisioning defaults off and project-creation allowance defaults zero.”
- “No payment processor, automatic billing, AI activation, payroll calculation rewrite, statutory policy engine, SMS delivery or legacy-company migration is included.”
- “An identical operation ID/input returns the original receipt; changed input under the same ID conflicts.”
- “Provider acceptance is not confirmed delivery, and uncertain sends are not blindly resent.”
- Preserve existing guards, canonical migration ordering, employee-ID normalization, invitation validity/limits, original tests/failures and independent findings.
- Use a detached worktree from current development; permitted branch policy remains unchanged. No main merge, production write, provider/resource activation or real invitation test follows from planning approval.

## Review Focus

1. Identical company-local employee IDs in simultaneous A/B traffic must not cross hosts, sessions, caches, exports or jobs — Tasks2/3/9.
2. Provider creation succeeds but response/commit is lost: recovery finds the exact owned resource instead of creating another or dropping data — Task4.
3. Owner grant or invitation changes/expires while password hashing/lock waits: final credential transaction refuses stale authority — Tasks5/8.
4. Two tabs resume and save out of order: the newer canonical settings survive with an actionable conflict — Task6.
5. Selected-group invitation partially sends and then times out: original per-person receipts survive and uncertain sends are not replayed blindly — Task8.

## Execution boundaries and file map

New code belongs in focused src/lib/onboarding/ modules, src/lib/workspace-routing/ modules and route adapters under src/app/api/onboarding/. A separate db/control-migrations/ history must never enter the application database migration manifest. Proposed new business migration0048_self_service_onboarding.sql is unused at this baseline; recheck its name against freshly fetched development before allocating it. Do not renumber existing migrations.

Reuse actual existing functions, not similarly named shift-exchange code:
- scripts/company-setup.ts: setupCompany, readCompanyInput, readSetupTarget; extract narrow reusable bootstrap primitives while preserving existing public CLI behavior.
- src/lib/company-access/employee-profile.server.ts: createEmployeeWithAccess/readEmployeeCoreAccessOperation.
- src/lib/auth/invitations/service.server.ts: issueOrRevokeInvitation/readInvitationStatus/readInvitationOperation.
- src/lib/auth/invitations/claim.server.ts: claimInvitation; it requires an existing Owner issuer and cannot bootstrap the first Owner.
- src/lib/db.ts; src/lib/data/sql-executor.ts; src/lib/data/notification-transactions.ts; src/lib/auth/session.ts: transport/executor/session boundaries.
- db/migrations/order.ts: exact canonical migration manifest, not filename sorting.

No tests/install/build ran for this documentation-only plan. Before implementation inspect the current scripts and ~/Documents/ChatGPT/engineering-toolkit/README.md before using shared utilities. New owned-fixture runners must refuse production credentials and clean only their exact fictional resources.

### Task 0: Freeze executable contracts, configuration gates and source inventory

**Files:** create src/lib/onboarding/contracts.ts, contracts.test.ts, config.server.ts, config.test.ts; create docs/architecture/self-service-onboarding.md and docs/handoffs/onboarding-entrypoint-inventory.json; refine the UI handoff.
**Consumes:** this design and current canonical settings/auth types.
**Produces:** OnboardingSnapshot/Result/Command/StepId from the UI contract; readOnboardingConfig(env): DisabledConfig | EnabledConfig; explicit initial and complete entrypoint inventory.

- [ ] Write contract tests rejecting extra role/workspace/database fields, malformed UUID/version, unsafe return URLs and unsupported schema versions. Config tests require disabled/zero-resource defaults and deny enabled mode missing approved origin/region/secret/cap/retention inputs.
- [ ] Run `npx vitest run src/lib/onboarding/contracts.test.ts src/lib/onboarding/config.test.ts`; observe the new contract failures before implementation.
- [ ] Implement closed schemas and proposed verification/bootstrap TTL/cooldown defaults from the spec. Freeze stable reason codes and versioned fixtures with Claude's handoff.
- [ ] Inventory all direct transport users with `rg -l 'getDb\\(|getTenantRuntimeDb\\(|process\\.env\\.(DATABASE_URL|NEVORA_APP_DATABASE_URL|NEVORA_WORKER_DATABASE_URL)' src scripts`, then follow shared executors/caches, workers, native APIs and public endpoints to a complete responsibility list. Mark every entry UNCONVERTED initially.
- [ ] Run the focused tests, validate every inventory path at the pinned source, record account/domain/region/cost/retention gates without inventing configured values, and commit only this deliverable.

### Task 1: Verified registration and durable control records

**Files:** create db/control-migrations/0001_owner_onboarding.sql; src/lib/onboarding/registration.server.ts, registration.test.ts, control-store.server.ts; API registrations/route.ts and verification/route.ts; src/test/integration/onboarding-registration.integration.ts.
**Consumes:** Task0 schemas/config.
**Produces:** requestRegistration(command,control,delivery): Promise<OnboardingResult>; verifyRegistration(proof,control): Promise<VerifiedSignupSession>; readRegistration(proof,control): Promise<OnboardingSnapshot>. VerifiedSignupSession is server-only and cannot be constructed from client fields.

- [ ] Add tests: repeated identical operation has one receipt; changed replay409; same email response never reveals prior accounts; expired/reissued/wrong-environment proof fails; only one concurrent consumption succeeds; fake SMTP failure remains a delivery state.
- [ ] Run `npx vitest run src/lib/onboarding/registration.test.ts` and observe failures.
- [ ] Implement registration/consent-version receipts, domain-separated token hashes, secure signup cookies, explicit email/IP/platform counters and cooldowns. No provider resource exists at this stage.
- [ ] Add an owned PostgreSQL control-db fixture/runner `scripts/onboarding-owned.mjs` with new `vitest.onboarding-integration.config.mts`; integrate the existing fake SMTP pattern.
- [ ] Run `node scripts/onboarding-owned.mjs --suite registration`; require all named database/concurrency/counter cases with no environment-dependent skips; rerun focused tests and commit.

### Task 2: Registered workspace routing and transport isolation

**Files:** create src/lib/workspace-routing/{binding.server,resolver.server,transport.server,contracts}.ts and matching tests; modify src/lib/db.ts and shared executors; convert the complete Task0 entrypoint inventory.
**Consumes:** verified control-store workspace records, explicit lifecycle/incarnation and secret references.
**Produces:** resolveWorkspaceBinding(requestIdentity,registry): Promise<WorkspaceBinding>; getWorkspaceDb(binding): SqlExecutor. Binding is privately issued server-only routing custody, never sufficient business authorization.

- [ ] Add A/B tests with duplicate employee IDs, ambiguous/forged/forwarded host, disabled/suspended/restored workspace, wrong secret reference, bad environment and registry outage. Assert zero fallback calls to the legacy database in multi-company mode.
- [ ] Run `npx vitest run src/lib/workspace-routing`; observe failures.
- [ ] Implement canonical registered-host resolution and immutable per-workspace/role/incarnation transports. Refactor the shared boundaries and every inventory consumer to receive the binding; fail closed for unconverted paths. Keep old single-company mode behavior intact. Do not use mutable globals or treat request-local context as authorization.
- [ ] Partition server caches, public workspace-name reads, files and job lookup keys; avoid static/prebuilt tenant-specific responses. Derive runtime URLs from secret references server-side only.
- [ ] Run `node scripts/onboarding-owned.mjs --suite isolation-routing` with simultaneous requests and real separate company databases. Require every inventory row CONVERTED or PROVEN_NON_RUNTIME and typecheck; commit.

### Task 3: Workspace-bound credentials, sessions and non-browser entry points

**Files:** create src/lib/workspace-routing/token-envelope.server.ts and tests; modify src/lib/auth/session.ts, session-issuance.ts and login/recovery/passkey/invitation adapters; update native auth, Clocker/calendar/public file/worker adapters from the inventory.
**Consumes:** Task2 WorkspaceBinding and existing credential/session/business guards.
**Produces:** versioned workspace-bound bearer wrappers and binding-aware auth/worker adapters; no client-authored context or forged reviewed credential.

- [ ] Add tests: valid A login/session/reset/invitation/passkey challenge/Clocker token/calendar key/file locator is rejected on B; same employee ID remains legitimate in both. Native wrong-workspace selection, revoked membership and restoration incarnation changes deny.
- [ ] Run focused auth/envelope tests and observe failures.
- [ ] Implement signed/encrypted workspace/incarnation-bound envelopes with separate purposes and host-only cookies; preserve existing credential revision/lock/expiry/final-authority guards. Keep raw inner proofs off URLs/logs, preserve legacy single-company decoding only in explicit legacy mode.
- [ ] Give jobs explicit bound workspace/role/lease data; reread lifecycle before dispatch. Convert native discovery/sign-in contracts without editing Claude's visual components.
- [ ] Run `node scripts/onboarding-owned.mjs --suite isolation-auth`; require genuine two-database browser/worker/public-route negatives plus existing company-access claim/recovery/session tests; typecheck and commit.

### Task 4: Idempotent resource provisioning and seed-free company bootstrap

**Files:** create src/lib/onboarding/provisioning/{model,orchestrator.server,neon-provider.server,store.server}.ts and tests; scripts/onboarding-worker.mts; API workspaces/route.ts and operations/[operationId]/route.ts; create db/migrations/0048_self_service_onboarding.sql and update db/migrations/order.ts; extract scripts/company-setup.ts primitives into src/lib/company-bootstrap/server.ts with compatibility tests.
**Consumes:** verified signup session, canonical manifest, current control store and separate provisioner principal.
**Produces:** requestWorkspace(proof,command): Promise<OnboardingResult>; runProvisioningJob(job,provider): Promise<ProvisioningReceipt>; reconcileProvisioningOperation(operationId): Promise<OnboardingResult>.

- [ ] Add tests for simultaneous slug reservation, duplicate submits, worker crash after each receipt, provider429/transient failures, create response lost after actual resource creation, migration commit unknown and wrong/foreign resource recovery. Assert one owned resource and no existing company mutation.
- [ ] Run focused orchestrator tests; observe failures.
- [ ] Implement durable versioned reservations/leases, restricted resource tags/receipts, no customer-derived SQL identifiers, restricted runtime roles/secrets and canonical checksum migration receipts. The new0048 migration establishes company-side provisioning/activation receipts, initial-Owner grant custody, setup command/progress records and invitation-batch/item receipts for Tasks5–8 before any bootstrap depends on them. Start from an empty database; never branch/copy another customer's data.
- [ ] Add a narrow pending-Owner bootstrap function with no reusable Owner password in the control store. Preserve existing setupCompany CLI's empty-schema/atomic/second-run refusal. Persist company-side receipts before publishing control-plane progress; reconcile both stores explicitly.
- [ ] Run `node scripts/onboarding-owned.mjs --suite provisioning` using fake provider and actual fresh control/company PostgreSQL databases. Require crash/replay/unknown-response and old fresh-company setup regressions. No live Neon API write occurs before separate hosted authority; commit.

### Task 5: First-Owner credential activation and recovery

**Files:** create src/lib/onboarding/owner-activation.server.ts and tests; API bootstrap-grants/route.ts and owner-activation/route.ts; use the0048 tables/manifest installed by Task4; add0049 for tested activation functions.
**Consumes:** proven provisioned company, verified registration ownership, existing hashing and guarded session issuance.
**Produces:** issueOwnerBootstrapGrant(signupProof,operationId): Promise<BootstrapRedirect>; activateInitialOwner(binding,command): Promise<OnboardingResult>. A bootstrap grant is distinct from an employee invitation.

- [ ] Add real database tests for grant expiry/revocation/simultaneous claims, target host/email/workspace mismatch, initial Owner already activated, hash work interrupted, changed command replay, lost credential commit and failed browser cookie write.
- [ ] Run focused activation tests; observe failures.
- [ ] Implement one-use short-lived company-side grant custody and atomic credential+consume+receipt transaction, binding the server-assigned initial Owner. Recheck authority after hashing/lock waits. Never accept a client role or reuse an existing Owner's identity.
- [ ] Reconcile company activation receipt before marking control registration SETUP_IN_PROGRESS. Recover lost acknowledgement by original receipt/read and normal sign-in; do not reset a known credential or fabricate a session.
- [ ] Run `node scripts/onboarding-owned.mjs --suite owner-activation` plus existing session/claim-race tests. Verify canonical manifest separation and fresh/upgrade behavior; commit.

### Task 6: Resumable canonical business setup and derived readiness

**Files:** create src/lib/onboarding/{setup.server,readiness.server,steps}.ts and tests; API state/route.ts and steps/[stepId]/route.ts; adapt existing workspace/location/position/scheduling/payroll/Clocker commands only where required.
**Consumes:** current Owner proof, workspace binding, Task0 step schemas and existing domain command receipts.
**Produces:** readOnboardingState(ownerProof): Promise<OnboardingSnapshot>; saveOnboardingStep(ownerProof,command): Promise<OnboardingResult>; deriveReadiness(canonicalSnapshot): ReadinessSections.

- [ ] Add tests for refresh/resume, two-tab revision conflict, denied non-Owner, invalid timezone/location ownership, changed feature flags and readiness falling back when canonical settings are removed. Optional payroll/Clocker not configured must not prevent core business creation.
- [ ] Run `npx vitest run src/lib/onboarding/readiness.test.ts src/lib/onboarding/setup.test.ts`; observe failures.
- [ ] Implement business/timezone/locations/positions/scheduling/targets and enabled-feature adapters through canonical validation/writes; save command receipts/progress without making a second settings source of truth.
- [ ] Return section-specific blockers and destinations for timekeeping/payroll/company policies without invented wage/legal rules or automatic module activation. Preserve data on Back/refresh; use explicit expectedVersion.
- [ ] Run `node scripts/onboarding-owned.mjs --suite setup`; assert actual canonical rows and version races, not only checkbox state. Run affected domain validation tests, typecheck and commit.

### Task 7: Owner-managed team onboarding

**Files:** create src/lib/onboarding/people.server.ts and tests; API people/route.ts; reuse src/lib/company-access/employee-profile.server.ts and model.ts.
**Consumes:** current Owner authority, active location/position records and existing CreateEmployeeWithAccessCommand.
**Produces:** saveOnboardingPerson(ownerProof,command): Promise<OnboardingResult> and receipt-backed team status.
- [ ] Add tests for duplicate local employee number, same number in another company, inactive/foreign location, unqualified role/position assignment, missing optional email, changed replay and lost response after committed creation.
- [ ] Run focused people tests; observe failures.
- [ ] Implement a thin adapter around createEmployeeWithAccess/readEmployeeCoreAccessOperation, preserving current normalization, management grants and transactional profile/eligibility/qualification behavior. Saving a person never sends an email.
- [ ] Expose scheduling/pay profile requirements through existing commands; report invitation eligibility separately. Profiles without email remain saved and explicitly uninvitable by email.
- [ ] Run `node scripts/onboarding-owned.mjs --suite people` and affected company-access employee-actions/authority tests; commit.

### Task 8: Individual/group invitation orchestration and activation status

**Files:** create src/lib/onboarding/invitation-batch.server.ts and tests; API invitation-batches/route.ts and invitation-batches/[operationId]/route.ts; use the batch/item receipt tables installed by Task4; reuse existing invitation services/delivery.
**Consumes:** reviewed target employee versions/invitation revisions, explicit Owner send command and existing invitation backend.
**Produces:** issueInvitationBatch(ownerProof,command): Promise<OnboardingResult>; readInvitationBatch(ownerProof,operationId): Promise<BatchSnapshot> with per-person receipts.

- [ ] Add tests for partial group delivery, stale target email/role while queued, Owner demotion, batch retry after crash, provider-accepted response lost, malformed/expired/revoked/reissued/wrong-company proofs and known receipt recovery.
- [ ] Run focused batch tests; observe failures.
- [ ] Snapshot selected targets with deterministic child operation IDs; revalidate authority/target versions per issue and call issueOrRevokeInvitation. Preserve existing168-hour validity/issue limits and current security token size/handling.
- [ ] Expose PREPARED/PROVIDER_ACCEPTED/UNKNOWN/FAILED truthfully. Unknown external delivery waits for reconciliation or an explicit reviewed resend; no claim of exactly-once external email. No email bearer in a durable unencrypted queue.
- [ ] Run `node scripts/onboarding-owned.mjs --suite invitations` using actual control/company transactions plus fake SMTP and the existing invitation/claim-race suites. Require proof terminal cleanup and per-row recovery; commit.

### Task 9: Claude integration, operational safety and exact-source acceptance

**Files:** create src/test/integration/onboarding-journey.integration.ts and onboarding-browser.integration.ts; scripts/onboarding-acceptance.mjs; docs/handoffs/self-service-onboarding-readiness.md and docs/runbooks/self-service-onboarding.md; update the applicable CI workflow after inspecting current required gates.
**Consumes:** Tasks0–8 implemented APIs and Claude's actual UI.
**Produces:** source-pinned integrated evidence and an operating/rollback packet; public enablement remains separate.

- [ ] Add whole-journey tests that create two fictional companies concurrently, activate Owners, resume setup, create duplicate local employee numbers, send fake invitations, activate employees and exercise allowed versus forbidden existing business workflows.
- [ ] Add browser tests for keyboard/mobile320/390/tablet/desktop, EN/ES, loading/empty/invalid/error/success, two tabs, back/refresh, lost responses and optional-module skips. Claude owns rendering fixes; Codex owns server defects.
- [ ] Add owned resource/cost quota, poisoned host/token/cache, worker lease/restart, orphan quarantine, per-company migration, backup/restore and disabled-feature/kill-switch tests. Disabling new signup must preserve current customers' access; never drop databases as a rollback.
- [ ] Run `node scripts/onboarding-owned.mjs --suite all`, `node scripts/onboarding-acceptance.mjs`, `npm test`, `npm run typecheck`, `npm run lint` and required existing CI at the exact accepted source after inspecting script/environment effects. Keep skips/failures explicit.
- [ ] Under separate actual hosted authority, verify approved domain/region/provider capacity/secret roles, real owned two-company isolation, observed email/activation and resource/restore/failure behavior. Inspect plan entitlement and budget before creating resources or sending any real test email.
- [ ] Obtain required source-specific security/QA/UI dispositions, retain open findings, map deployment to SHA, document observed monitoring/cleanup/rollback and update Jira/handoff. Production remains blocked until Jose's explicit release authorization.

## Definition of done

An actual new Owner can complete registration, automated provisioning, business setup and explicit employee invitations in Claude's integrated UI with no routine operator/database step. Interrupted/repeated flows recover from the same durable operation. Existing customers remain isolated and functional. Source-specific CI, real owned databases, browser and authorized hosted evidence support the claim. A proposed contract, fake provider result, source inspection or deployment alone is not completion.

## Self-review and review gate

Coverage: registration0/1, isolation2/3, provisioning4, first Owner5, settings6, people7, invitations8, integrated operations9. Five Review Focus failure modes are pinned to owning test tasks. New functions/types are defined in their producer task or the UI contract. Migration filenames are reserved only against the baseline and rechecked before execution. No independent Phase F or production finding is self-closed.

Jose approved implementation on November7 with “lets do it”. Codex executes backend tasks; Claude owns UI against the versioned contract. The per-plan ledger records current task evidence. Hosted resource creation, real test messages and production release remain separately gated.

Execution state: attached detached worktree based on e2872f30. Plan/contracts and verified-registration increments are local commits; no remote branch/deployment change. Verification uses invocation-owned loopback PostgreSQL, fake provider/mail channels and the existing application suite. See .superpowers/sdd/2026-11-07-self-service-owner-onboarding/progress.md and the backend readiness handoff for source-specific results.
