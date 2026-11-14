# Durable Billing Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The authorized sole finisher implements natively here; independent read-only review follows. Steps use checkbox syntax.

**Goal:** Recover identical billing retries without duplicate provider mutations, and reject changed actor/input/action under the same key.

**Architecture:** Add durable request and stage receipts beside the existing commerce catalog. Commit each prepared mutation before its provider call, serialize execution under existing business locks, retain original encrypted parameters/results, and perform private-projection authority checks after outcome persistence. Reuse the existing Checkout intent ledger and Stripe SDK; split prepare from execute where necessary rather than opening a parallel billing path.

**Tech Stack:** Existing TypeScript/Node24, pg8.23.1, PostgreSQL17.10 local, Stripe23.1.0 fictional transport, Vitest5.0.5; no dependency changes.

**Spec:** ../../handoffs/2026-11-12-billing-idempotency-decision.md

## Global Constraints

- Native implementation in sole finisher checkout; no new worker/chat/branch/provider effect.
- Preserve actual Cloud e803 and policy dd0 parents in local merge0f0ef77c925caeb6b0acb1ac0fda7883a3e42218.
- Exact development/main/Claude refs and all mandatory local/CI/source-artifact gates remain.
- Never erase uncertain custody, change original trial/binding, activate Tax, or weaken authority/release assertions.
- One-hour technical operation creation deadline is original and immutable; retries never extend it.
- Billing stage parameters and URLs use existing AEAD with identity-bound context; actor/input use keyed HMAC, never raw secret logging.

## Review Focus

- Provider success followed by authority revocation: commit the outcome, then deny projection, never rollback the known result.
- Database reply loss after stage preparation or provider completion: resume exact saved stage/key without another resource.
- Another operation key while prior work is uncertain: business-locked exclusion must prevent bypass across actions.
- First customer creation before Checkout parameters exist: it also needs a committed stage before its API mutation.
- Legacy intent without actor receipt, changed installation/customer and provider-retention expiry: fail closed with retained reconciliation evidence.

### Task 1: Durable catalog request/stage receipts

Files: create services/commerce/billing-operations.ts and migrations/0005_billing_operations.sql; modify schema.sql, principals.ts and service readiness; create services/commerce/billing-operations.integration.test.ts.

Interfaces: BillingOperationContext {actor:string;assertCurrent(client?:PoolClient):Promise<void>}, server-only; BillingOperation admission consumes business, UUID key, action, normalized language/plan and current context. prepareStage(name, prepare(client,business)) commits exact encrypted parameters; executeStage(name, mutate(client,business,params)) serializes and commits its encrypted result. finish(result) stores final result; replay returns that result only after current authority/binding checks. At most one started/unresolved operation per business, checked under existing business row lock. Separate request and stage tables preserve immutable input and multiple sequential customer/Checkout stages.

- [ ] Write real-SQL RED controls: changed actor/body/action409; identical request replay; company isolation; concurrent competing key; no API/SQL result loss after a committed preparation or terminal result; expired pending operation cannot authorize create or replacement; API column grants/enrollment denial; idempotent migration preserves old rows.
- [ ] Run owned commerce runner with an explicit allowlisted environment and PG17.10; retain actual RED, including any fixture errors separately.
- [ ] Implement admission/AEAD/HMAC/immutable deadline, staged preparation/execution/result and explicit pending/reconciliation errors. Callback result persistence occurs before authority projection checks. Never mark unknown terminal or permit replacement automatically.
- [ ] Run meaningful SQL controls GREEN; typecheck; read-only implementation review; commit this local checkpoint. No shared publication or migration execution.

### Task 2: Wire Checkout, Portal and plan-change through those receipts

Files: service.ts, stripe.ts, checkout.ts, plan-change.ts, existing plan-change-api/stripe integration tests and fictional transport.

Consumes Task1 typed context/stage API. Service derives actor HMAC from current authenticated bearer/Owner proof; accepted body is exactly lang, and plan for plan-change. Production Stripe adapter always receives this server context; direct internal fixture calls derive a stable non-browser actor and remain explicitly labelled.

- [ ] Add RED public HTTP + real SDK tests for changed actor/language/plan/endpoint under one key; concurrent identical retries; lost provider response; failed local commit after creation; changed subscription between retries; current revocation after success; same key across two businesses. Keep no-duplicate resource/job/trial assertions.
- [ ] Separate customer creation into its own prepared stage. Persist the reviewed Checkout plan and exact customer parameters before mutation, then retain the original legacy checkout intent and creation key. Reject open-intent/key reuse and legacy unknown actor attribution; do not silently swap input. Refuse paginated/ambiguous customer lookup.
- [ ] Refactor Portal/plan-change into read/prepare and execute phases with original saved parameters/key and customer/subscription identity. Do not recompute provider parameters on retry. Definite preflight refusal creates no started stage; uncertain started work retains exclusive custody.
- [ ] Save results before post-provider authority denial; validate current installation and expected customer/subscription before any new provider mutation. Preserve early binding creation only when it matches the saved prepared stage.
- [ ] Run SQL/SDK and all affected service/API/onboarding tests GREEN on combined source; retain old changed-language tests as historical contract and replace their live expectation only with stronger explicitly approved conflict/no-duplicate checks. Update bilingual consumer error contract; no UI redesign.
- [ ] Review and commit local runtime checkpoint, then regenerate source-bound guides and execute complete combined qualification before release publication.

### Task 3: Integration, recovery and release evidence

Files: current combined handoff, Step4 lifecycle evidence, exact-source packaging/custody helpers outside repo, any narrowly reproduced integration regression.

- [ ] Resume Step4 plan's full fictional lifecycle and resilience on the actual combined source using real SQL/normal login and simulated providers. Keep component/fixture/browser/hosted states distinct.
- [ ] Reproduce or safely diagnose retained failed CI gates without forced clicks, timeout inflation, assertions removed or blind reruns. Preserve nested evidence and honest causal limits.
- [ ] Freeze source/manuals, required local suites/types/lint/build/reviews; exact candidate20/10 plus all changed-source artifact families; ordinary development publication and independent actual-development qualification.
- [ ] Reconcile the reviewed additive schema step and rollback with the original unstarted finite hosting packet. No additional authority/effect/time follows from this plan; finish concrete preparation before any approval question actually required.

Self-review: tasks cover all spec requirements and each review-focus hazard; current owner/body policy is direct Jose approval. Full browser/hosted/production acceptance is deliberately pending, not inferred from this plan or source commits. Existing Step4 work is resumed rather than duplicated. No implementation delegation is selected.
