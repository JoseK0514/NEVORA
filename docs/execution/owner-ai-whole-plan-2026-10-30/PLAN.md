# Owner AI whole-plan implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Preserve this plan's ledger and evidence, including failures.

**Goal:** Compare jointly validated, read-only selected-day staffing allocations using current company facts.

**Architecture:** Preserve the canonical synchronous weekly planner facade; add cooperative planning steps with an explicit read-only date scope. The advisor bounds and projects real source evidence into at most two alternatives, outside model authority, and displays them through the existing finite private controller.

**Tech stack:** Existing TypeScript, Next/React, PostgreSQL, Vitest and owned Playwright Chromium/WebKit runtime. No new dependency or schema/configuration change.

**Spec:** docs/execution/owner-ai-whole-plan-2026-10-30/SPEC.md

## Global constraints

Preserve approved rules, design, role/tenant/session boundaries, provider consent/activation/budgets, all business writers and default management generation behavior. No paid provider, hosted/production mutation, release/CI/push/merge. Keep original evidence/ledgers immutable. Detached base da1dab3e.

## Review focus

1. A published or archived location mixed with ready draft targets must not disappear behind an unqualified complete claim. Task1/2 pin scope/status and omitted targets.
2. A scarce multi-location worker, position or Lead cannot be promised to two overlapping assignments; every final addition sees all others and adjacent weeks. Task1 pins hand-derived allocations and independent validation.
3. Enumeration and final validation must not bypass cancellation or block other requests indefinitely. Task1/2 measure real yielding/latency, bounds and abort behavior.
4. Source or authority changes during a solve/replay must not become current execution permission. Task2 pins fresh reads, denied roles/revocation and historical-only evidence.
5. Long/untrusted names, empty demand and partial search must remain readable and honest on mobile/desktop, with no accidental business action. Task3 exercises real browser controls, reflow, focus and privacy.

### Task1: cooperative canonical planning

Files: generation/{planner,search,demand,scope}.ts; new generation/coverage-review.test.ts. Keep GenerationInput and synchronous planWeek caller contract intact.

Interfaces: export `planWeekSteps(input, controls?)` generator of checkpoints, returning GenerationPlan. Controls carry optional read-only date scope, stop predicate, maximum additions and excluded candidate IDs; default planWeek drains the same generator without review controls. Demand/scope accept the explicit review scope; default behavior is unchanged.

- [ ] Write tests for selected-day joint scarcity, published review vs unchanged weekly rejection, archived/setup exclusion, fixed/adjacent capacity, reservations, cooperative stop and alternative exclusion. Run RED and retain it.
- [ ] Implement generator/checkpoints and review-only demand scope with canonical eligibility/allocation and final validation. Run the new tests and existing generation tests; expected PASS.
- [ ] Commit source/tests and append exact commands/results to the ledger.

### Task2: bounded advisor evidence and model integration

Files: new owner-advisor/coverage-plan{.server,.test,.integration}.ts and coverage-plan-contracts.ts; contracts.ts, tools.server.ts, service.server.ts, loop.server.ts and focused existing tests.

Interfaces: `readCoveragePlans(store, date, signal)` returns ToolResult with optional `coveragePlans`; `coverage_plan {date}` is read-only and allowed in inspect/model tools. `WorkflowEvidence.coveragePlans` retains server-produced provenance, scope, baseline and at most two legal alternatives. Coverage tasks force this tool before inference.

- [ ] Write failing tests for parsing, bounded cancellation/partial search, alternative comparison and trusted evidence retention; real SQL tests cover no writes, roles, changed source, published/archived and revoked authority. Retain RED.
- [ ] Implement source limits, cooperative runtime, exact fingerprint, strict bounded projection, model instructions and source-owned evidence retention. Retain existing proposals/actions and all allowance/replay controls. Expected focused unit and SQL PASS.
- [ ] Commit and ledger outcomes.

### Task3: existing-style review and exact-source acceptance

Files: new components/owner-advisor/coverage-plans.tsx and focused render/parser tests; workflows.tsx, public-response.ts; new/extended real Owner browser coverage in existing configuration.

- [ ] Add failing render/parser/browser cases for actual explicit compare controls, baseline/alternatives/remaining needs, unsafe content/overlarge claims, 320/390/1440 reflow and private retirement. Retain RED.
- [ ] Implement readable review-only results with existing tokens/components; no execution buttons or new reader/cache. Expected PASS.
- [ ] Freeze source, run actual browser serially, SQL, full unit suite, whole TypeScript/ESLint/whitespace and existing activation guards. Preserve commands/status, screenshots/logs/JSON and source/runtime custody.
- [ ] Commit source; obtain one fresh independent whole-change reviewer for code/UI/QA and independently owned issue closure. Fix material findings with RED→GREEN; rerun affected gates and required suite after changes.
- [ ] Preserve ledgers, reports, failures, verification and exact Git/environment identity in a new recoverable bundle/patch/compact evidence artifact. No shared integration or release.
