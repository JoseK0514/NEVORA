# Stripe runtime and conditional Tax implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare both Velani hosted invoicing and NEVORA subscription billing for sandbox acceptance without enabling live charges or unconfirmed tax collection.

**Architecture:** Velani uses owner-reviewed Stripe Dashboard invoices and Hosted Invoice Pages; no billing authority is added to its public inquiry/AI API. NEVORA retains classic Customers, hosted Checkout/Portal, durable intents and signed queued reconciliation. Runtime validates restricted keys and merchant account; optional Tax configuration is persisted in encrypted checkout intents so delayed subscription creation uses the authorized terms.

**Tech Stack:** Node24, TypeScript5.9, Stripe SDK23.1.0/API2026-10-28.endive, PostgreSQL17, Vitest5.0.5.

**Spec:** `docs/handoffs/2026-11-08-stripe-runtime-tax-spec.md`; official accepted guide iguide_61ViylNn83ZdXlB0f41HT1nhEuOJ2, exact JSON retained in `.omo/evidence/stripe-velani/2026-11-08/planner-accepted.json`.

## Global constraints

- Detached existing worktree; do not assemble unrelated development-source drift, push, merge or deploy real production.
- Claude owns UI. No Velani theme/public API edits.
- Existing USD1900/2900 monthly plans, capacity15/30, bounded30-day no-card trial and current Owner authorization remain in force.
- Sandbox account acct_1UZZK1HT1nhEuOJ2 only for provider checks; no real invoices/email, live charges, registrations or paid Tax plan.
- Jose is unsure of registrations. Tax defaults off and requires explicit classification and inclusive/exclusive policy before opt-in; enabling code is separate from enabling collection.
- MCP OAuth is not a runtime API key. Keys remain in approved secret stores; never print/extract connector credentials.

## Review focus

1. An incorrect account key fails before provider mutations or paid-access reconciliation.
2. Live keys and prices cannot enter staging; restricted test keys work.
3. Tax or classification changes between setup and retry cannot silently change authorized subscription terms.
4. Missing customer location or provider failure never falls back to an untaxed paid subscription.
5. Hosted protection/runtime-key gaps are reported separately from passing local SDK fixtures; no security bypass is created.

### Task 1: Restricted-key and account validation

**Files:** Create `services/commerce/stripe-config.ts`, `services/commerce/runtime.test.ts`; modify `runtime.ts`, `stripe.ts`, `checkout.ts`, `stripe-fixture.ts`, `stripe.integration.test.ts`.
**Interfaces:** `readStripeConfig(env, environment)` returns undefined or `{key,live,expectedAccountId?,prices,webhookSecret,tax?}`. `StripeBilling` accepts expectedAccountId and verifies `stripe.accounts.retrieveCurrent().id` before checkout/portal/reconciliation; rejected checks can retry. Checkout ports carry `live` and optional Tax config. No network work for unsigned webhooks.

- [x] Add runtime tests: rk_test accepted, rk_live rejected in staging, missing/invalid staging account rejected, malformed Tax flags rejected even when billing disabled; execute `npx vitest run services/commerce/runtime.test.ts`, expect behavioral failures against current runtime.
- [x] Add owned-SDK scenarios for wrong account before mutations, transient account failure retry and mismatched price mode; run `npm run test:commerce:owned` with owned PG binary, expect failures for missing guards.
- [x] Implement parser before Pool allocation and bounded shared account check; validate price mode at checkout and subscription reconciliation.
- [x] Run focused runtime tests and owned commerce suite, expect all pass; commit `feat: bind Stripe runtime to explicit merchant account`.

### Task 2: Conditional Tax with immutable checkout terms

**Files:** Create `services/commerce/stripe-tax.ts`; modify `checkout.ts`, `stripe.ts`, fixture/integration tests and `services/commerce/README.md`.
**Interfaces:** `StripeTaxConfig={code:string,behavior:"inclusive"|"exclusive"}`; Tax snapshot is a namespaced server-owned metadata field inside encrypted SessionCreateParams. Helpers validate/read it and verify Price tax_behavior/Product tax_code. Old intents without snapshot stay Tax-off. Delayed subscription creation uses the persisted snapshot, never the current flag.

- [x] Add failing owned-SDK scenarios for immediate automatic_tax, setup address collection without unsupported automatic_tax, delayed automatic_tax despite changed runtime flag, old Tax-off intent despite later enablement, and mismatched classification/price behavior rejection. Assert no subscriptions/access grant on invalid Tax state. Run owned commerce suite; expect new failures only.
- [x] Implement typed helpers, correct supported Checkout fields, delayed price/product revalidation and tax-aware authorization text. No tax-ID collection in setup mode without confirmed support. No retroactive migration.
- [x] Run owned commerce suite and runtime tests; expect all pass. Update runbook with explicit opt-in gates, restricted-key capabilities and account ID. Commit `feat: prepare optional Stripe Tax for subscription checkout`.

### Task 3: Provider readiness, verification and handoff

**Files:** Update preflight handoff, tracked setup receipt and add bounded planner receipt/readiness evidence. No Velani runtime changes.
**Interfaces:** Handoff distinguishes installed, authenticated, implemented, fixture-tested, provider-accepted and hosted-verified states.

- [ ] Read sandbox catalog/settings/registrations via actual discovered API operations. Do not infer real tax status from sandbox data. Record summaries only, excluding payment secrets/hosted URLs.
- [ ] If safe provider rehearsal is possible, create only explicitly fictional sandbox objects with collection disabled; validate setup-mode address parameters without sending email/charging. No approved real project prices exist, so use clearly marked fixtures only.
- [ ] Run `npx tsc --noEmit`, `npm run lint`, `npm test` sequentially; owned commerce/onboarding-commerce acceptance; source-custodied build after clean commit. Expect zero failures; retain exact logs/limitations.
- [ ] Commit implementation/handoff. Dispatch one fresh whole-change reviewer against ad7417dd938ef34da9322fd19240fc6b6b64ddae..HEAD. Fix Important/Critical findings once with RED/GREEN regression evidence; no re-review.
- [ ] Update SCRUM-174 plus linked onboarding readiness with actual evidence and remaining runtime-key/SSO/webhook/Tax gates. No claim of hosted flow completion until actually verified.
