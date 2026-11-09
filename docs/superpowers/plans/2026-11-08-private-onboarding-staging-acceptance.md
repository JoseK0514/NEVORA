# Private onboarding staging acceptance

**Scope:** Resume Jose's approved backend work from detached 5cf004d9691a5134cbaa3510f54f379ee8e246fe. Claude owns UI; Jose will deliver the handoff. Finish application email, isolated company provisioning and backend/HTTP acceptance with fictional data. No production launch, paid plan, existing-native-staging mutation, SSO weakening or unrelated chat contact.

**Spec:** docs/runbooks/self-service-onboarding.md; docs/handoffs/2026-11-07-onboarding-backend-ui-contract.md; docs/handoffs/2026-11-08-integrated-onboarding-commerce.md. Latest baseline evidence is docs/handoffs/2026-11-08-neon-sandbox-credential-acceptance.md. Preserve all authority, idempotency, operation provenance, source, grant and rollback contracts.

## Global constraints

- Existing accounts and Free quotas only; no Render spend or other upgrade. API credentials never appear in source, commands, logs, Jira or chat.
- Only support@thevelani.com may receive actual test email. Web/signup/invitation mail must enforce the selected staging recipient before SMTP work. Keep live payments and Tax off.
- Browser creation of persistent administrative access requires its action-time confirmation. Prepared proposal: separate Free NEVORA Onboarding Staging organization and provisioner key confined to it; no existing organizations are exposed. Current form is unsubmitted while confirmation is pending.
- Secrets are role-separated. Only the private provisioner gets management/control/enrollment capability. Never put those credentials in the web app, billing worker or webhook receiver.
- Preserve Vercel SSO ALL. A protected redirect is not application acceptance. Do not use bypass/share links, automation bypass secrets or security exceptions.
- Root and UI/data semantics remain unchanged except a proven backend defect. Reproduce defects, add meaningful regression tests, fix minimally, then run targeted and full relevant suites. Reversible configuration is verified directly rather than by tests that mirror its implementation.
- Current worktree is already detached/isolated and clean. Resume its approved candidate; do not create branches. Fetch/check development sources before integration; do not assemble unreviewed branch drift.

## Task 1: Enforce the approved staging mail recipient

**Owner/files:** Codex; src/lib/auth/mail-transport.server.ts, its tests and existing onboarding/invitation delivery tests. Add a bounded test-environment recipient setting, shared by verification/invitation/recovery sends. Missing required staging recipient or a different recipient must fail before SMTP traffic. Preserve production and owned-loopback behavior and definite/unknown delivery semantics.

1. Reproduce remote staging transport accepting an unapproved destination using controlled mailer instrumentation, without a real send. Expected: regression fails before the fix.
2. Implement the smallest shared guard and configuration documentation. Expected: blocked sends never call SMTP; the approved recipient still works through the existing transport contract.
3. Run focused transport/invitation/registration tests, types and lint. Expected: all pass; no assertions weakened. Commit the bounded change.

## Task 2: Configure and verify application SMTP

**Owner/interfaces:** Codex; domain-scoped Resend sending-only key, dedicated Vercel staging Preview variables, existing application transport. Existing verified nevora.team domain; no unrelated production key reuse. Confirm official SMTP settings and key restrictions. Store sensitive SMTP password Preview-only, with other mail settings separately. Initially leave delivery flags off.

1. Inventory existing key names and Preview environment names; never decrypt unrelated values. Expected: no duplicate staging SMTP credential.
2. Create the domain-scoped sender credential and save securely to the approved staging destination. Expected: metadata confirms sensitive Preview-only, no temporary file remains.
3. Authenticate SMTP without sending, then use the real app registration/invitation paths with the approved inbox during bounded acceptance. Expected: exact envelope recipient, truthful provider acceptance/delivery, no new operation after uncertain outcomes.

## Task 3: Configure private provisioning with bounded resources

**Owner/interfaces:** Codex; existing private Neon provisioner, restricted control/enrollment roles, distinct crypto keys, reviewed resource policy and an organization-scoped provider key. Approval-dependent work waits for the pending exact browser confirmation; independent preparation continues.

1. Verify Free organization and key scope. Prefer the prepared isolated organization over an admin key covering existing native projects. Expected: no paid selection or existing-project access.
2. Store exact staging worker/control/enrollment configuration only in the provisioner; use a passwordless APP identity and required distinct keys. Expected: positive role-name preflight, named restricted DSNs, source/branch/account/region binding and actual denials.
3. Bound this run to two fictional companies, 0.25 CU, autosuspend and explicit provider quotas. Exercise a real queued provisioning operation, source validation, bootstrap, enrollment and initial-Owner state; preserve unknown-result recovery. Expected: exact identities and no unexpected project creations.

## Task 4: Resolve protected application and service connectivity

**Owner/interfaces:** Codex; existing app/commerce/private company endpoints, exact registered origins, current Owner/session authority and private entitlements.

1. Inspect actual service-to-service calls and SSO behavior. Expected: determine the precise blocked path without extracting browser auth or bypassing SSO.
2. Use existing supported authenticated paths if sufficient. Any additional narrowly scoped backend adapter must preserve current source/Owner/signature/role checks and receive only reviewed necessary credentials; document the concrete boundary before exposure. New persistent sensitive access through browser waits for action-time confirmation.
3. Verify correct/wrong host, revoked authority, cross-business access and unavailable source. Expected: only the original authorized business/Owner succeeds; failures do not grant access or trigger privileged work.

## Task 5: Complete backend acceptance, review and Claude handoff

**Owner:** Codex. Run the complete signup/verification/provision/Owner activation/normal sign-in/setup/person/invitation/employee activation/billing journey through real backend interfaces for two fictional businesses. UI rendering is explicitly Claude's gate. Test duplicate/reordered/changed-replay, failure/recovery/cancellation and cross-business denials. Use Stripe sandbox only; retain uncertain receipts and retire only owned fixtures explicitly.

Run appropriate owned PostgreSQL, targeted, root, types, lint and clean-source build/artifact checks after implementation. Get one fresh whole-phase review, address Important/Critical findings with RED/GREEN and one fix pass, preserve independent gates. Deploy only exact reviewed staging source/configuration and verify actual hosted behavior. Restore bounded schedules/flags when finished. Update SCRUM-166/SCRUM-174 and durable docs with evidence, remaining failures, exact source/deployment state, rollback and Claude's exact integration contract. Do not label incomplete hosted or browser evidence complete.

## Review focus

Credential scope and custody; API/APP/WORKER/provisioner separation; SSO and company/Owner authority; sender-recipient restrictions and unknown SMTP results; concurrency/idempotency/partial provider outcomes; source/manifest/region/resource quotas; two real company database isolation; omitted configuration and safe rollback; evidence claims versus actual hosted scope.
