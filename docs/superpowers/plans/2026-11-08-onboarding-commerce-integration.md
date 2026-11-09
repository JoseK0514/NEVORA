# Onboarding and Stripe integration with isolated staging

Jose authorized completing integration and preparing non-production staging on November8. Claude owns every rendered UI. Continue inline; one fresh whole-change review at the end. This plan extends the approved onboarding and commerce specifications; neither approved business policy nor production activation changes.

## Source and scope

Freshly fetched origin/development e2872f30 remains the common baseline. Resume onboarding e3864bd5d and import the exact separate commerce a67ed1a8 through local detached assembly; do not edit the commerce source worktree or shared branches. Source inventory flags collaboration drift; do not silently assemble unrelated UI. Existing companies remain unenrolled/default-off.

Canonical creation is onboarding registration -> verified consent -> durable constrained Neon provisioning -> inactive Owner -> one-use activation -> normal login -> canonical setup/team/invitations. Commerce enrolls the resulting immutable workspace, preserves one 30-day no-card trial from successful provision, and supplies existing Stripe Checkout/Portal/webhook/reconciliation/entitlement logic. It never creates a second company or sets an Owner password. Storefront remains Shopify/Velani; Stripe remains the approved subscription direction unless Jose changes it. Hosted Stripe sandbox needs authenticated access and a test credential; no live key/charge or production change.

## Task 0: Assemble the reviewed source candidates

- Preserve new dependency pins and canonical migration/bootstrap implementation.
- Combine existing worker routing and commerce checks without removing either.
- Keep old standalone commerce slot code only behind explicit legacy configuration; the integrated runtime selects onboarding.
- Run imported unit/route checks and types. Capture failures and resolve actual integration causes.
- Commit detached assembly, recording exact source heads.

## Task 1: Enroll exactly one provisioned workspace

Interfaces: onboarding pending-company bootstrap and immutable provider receipt produce company identity; commerce billing consumes that identity and its verified original contact, not a second signup/password.

- RED: actual owned PostgreSQL provisioned-company enrollment, replay, concurrent attempts, changed identity, two businesses with the same contact email, unknown catalog commit and unchanged trial deadline.
- Add a canonical company commerce-binding/capacity migration; no historical migration changes. Runtime APP/WORKER cannot rewrite enrollment identity or capacity directly. Existing legacy/company installs remain unenrolled.
- Bootstrap an optional authenticated private binding atomically with the new pending company. On a replay verify the exact binding; no implicit adoption of occupied companies.
- Private provisioner publishes into a dedicated commerce catalog through separate constrained credentials before announcing onboarding readiness. No company database URL/password is stored in commerce for this path.
- Durable cross-store recovery reads the same committed receipt; duplicate or changed enrollment never resets trials, credentials or employee data.
- The normal integrated commerce API refuses its old public signup/setup/slot creation path. Billing sessions originate from the current company Owner; account contact is not company authority.
- GREEN: new owned integration tests and relevant original provisioning/commerce suites.

## Task 2: Bind billing transports and enforcement to the current company

Interfaces: private registered WorkspaceBinding selects a company; existing actor/session/role checks authorize billing; commerce lifecycle supplies operational/headcount policy.

- RED: request/worker A/B isolation, copied binding secrets and billing handoffs, expired/mutated Owner session, unknown host, restored incarnation and missing enrollment fail closed. Public registration/activation remain reachable; expired-company billing/export recovery remains reachable.
- Resolve per-company commerce connection from current routing custody and immutable company binding; preserve legacy environment behavior only in single_company mode. No process-wide authority cache crosses companies.
- Convert imported direct getDb commerce accesses to the canonical scoped transport. Apply policy through a narrow checked capability rather than broad installation-row writes. Register new route/job imports in the real entrypoint inventory.
- Keep existing Stripe price/currency/interval/metadata, idempotency, signature, successor subscription and replay checks. The checkout return is never payment authority.
- GREEN: original commerce, onboarding and new transport/HTTP/database regressions.

## Task 3: Prepare the staging runtime and UI contract

- Test explicit staging configuration: HTTPS/TLS verified remote DB, test-only Stripe credentials, exact origins, signup/company bindings, no production/legacy credentials; defaults remain disabled outside the isolated deployment.
- Prepare source-pinned app/API/worker deployment configuration, migrations, private role/secret inventory and rollback/default-off procedure. Workers remain bounded invocations; no unauthenticated worker endpoint.
- Prefer existing Vercel web host; determine a verified private worker/API placement before provisioning duplicate services. Use only existing free entitlements unless separately approved. Do not repurpose native staging.
- Set up only dedicated fictional staging resources authorized by this task. If a required credential/domain/provider connection is missing, prepare all independent artifacts and name the exact blocker; do not fabricate readiness or weaken access.
- Update Claude's versioned backend contract and fixtures, without rendering changes or messaging another chat. Update SCRUM-166/168/169 with actual implementation/integration/hosted states.

## Task 4: Verify the integrated source and hosted flow

- Local owned DB/API journey: verify -> one company -> activate Owner -> login -> canonical setup/team/invite -> trial -> Stripe fixture checkout/signed webhook -> entitlement -> cancel/recover; second company isolation, retries and backup retirement.
- Full root, affected PostgreSQL suites, types/lint, zero dependency audit, canonical source manifest and source-bound production build. No UI/browser certification from fixtures.
- One fresh-context whole-change review, preserving original independent verdicts. One regression-backed fix pass for Important/Critical findings; report remaining independent release gates honestly.
- Hosted actual test-mode journey only with isolated environment, authenticated providers, approved support@thevelani.com recipient and genuine deployed source. Keep Claude UI acceptance separate until integrated.
- Commit and preserve evidence. No main/production merge, live charge or public enablement.

## Review focus

Look deliberately for duplicate signup/provisioning authority, enrollment adoption of an occupied company, trial resets after lost acknowledgements, control/catalog/company privilege mixing, cross-company cache/secret/routing leaks, bootstrap or billing proof replay after restore, excessive APP/WORKER capacity privileges, checkout redirect authority, failed/reordered subscription events, accidental live billing in staging, implicit production-secret reuse, unbounded hosted spending and any UI change outside Claude ownership.
