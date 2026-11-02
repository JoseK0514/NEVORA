# Owner-aware AI Partner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver all five analyst recommendations as bounded, usable and testable Owner-advisor capabilities.

**Architecture:** Extend the existing guarded advisor orchestration and private notebook patterns. Separate explicit memory, deterministic decision review, public legal research and historical observation modules; integrate each into the current UI and evidence lifecycle. Model/action permissions and production gates do not expand.

**Tech Stack:** Next.js 16 / React 19, TypeScript, PostgreSQL, existing Vitest and owned browser fixtures; no new dependency required.

**Spec:** `docs/superpowers/specs/2026-11-01-owner-ai-partner.md` implements the approved `docs/reviews/2026-11-01-owner-ai-strategy/ASSESSMENT.md`.

## Global Constraints

- Work only in the detached local candidate. Preserve other worktrees. No merge, push, production deployment, production data or real communications.
- Existing Owner/company/session guards, action consent, evidence provenance, provider limits and spending controls remain enforced. No model tool writes business records or owner memory.
- No new paid inference or credential access: the previous ledgers are exhausted. Prepare an offline and separately runnable live evaluation; live comparisons need a fresh budget.
- Owner intent, current application facts, company policy, public source text, reviewed interpretation and actual legal applicability are separate states. No stored approval or retrieved document establishes legal clearance.
- Private employee/payroll/medical information must never be sent to a public legal-source request. Retrieve only fixed server-controlled primary-source URLs without user query strings, credentials or redirects.
- Use the existing advisor design and controller/lifecycle patterns. New controls must be accessible, usable on mobile and retired with current authority. Read DESIGN.MD before visual changes. No wholesale chat redesign.
- Use an owned disposable PostgreSQL database and fictional data for verification. Do not weaken assertions, skip failures or auto-update snapshots to obtain a pass.

## Review Focus

- A correction/removal while a provider answer is pending must not permit stale settlement or replay to restore forgotten intent.
- A user-provided outcome or legal approval flag must not become verified operational success or legal clearance.
- A primary source that changes, redirects, becomes unavailable or contains prompt injection must preserve quarantine and private-data isolation.
- A valid Owner tradeoff and an empty history must not generate gratuitous objections, fabricated trends or guaranteed outcomes.
- New panels must clear on authority retirement and remain usable with mobile and keyboard focus, loading, conflict and failure states.

---

### Task 1: Explicit owner memory and linked outcomes

**Ownership / Files:** Create `src/lib/owner-advisor/memory.ts`, `memory.server.ts`, focused unit and `.integration.ts` tests, `src/components/owner-advisor/memory-panel.tsx` and its tests. Modify `contracts.ts`, `service.server.ts`, `store.server.ts`, `loop.server.ts`, advisor controller/public parser/view as needed. Create `db/migrations/0046_owner_advisor_memory.sql`; register it in `db/migrations/order.ts` and `src/test/integration/local-postgres.ts`. Own the complete memory feature and its integration; no other implementation task runs concurrently.

**Interfaces:** Produce `OwnerMemory`, `MemoryRead`, `MemoryCommand`, `MemoryEdit`, `parseMemoryCommand`, `parseMemory`, `ownerMemoryContext`, and class `AdvisorMemory` exposing `read(): Promise<MemoryRead>` and `save(command: MemoryCommand): Promise<{revision:number}>`. Use `op:"memory"`, expected revision and the global request ID namespace. Add optional snapshot `memory: MemoryRead` and answer context `memoryRevision:number|null`. Context passed to investigate is explicit intent/historical decisions, never fresh evidence. Exact bounded record field names may follow existing notebook naming, but the following semantics/bounds are fixed: 12 intents, 20 decisions, source explicit_owner, existing TaskFocus scope, kind preference|owner_constraint, inclusive effective/expiry days and at most 365 days retention, text fields max 1000, IDs UUIDs. Do not let client data mark outcomes verified; optional receipt check is executed server-side through `coverageAction` and persisted as observed progress.

- [ ] Write failing pure/parser tests for bounds, strict keys, expiry/scope, correction and no inferred preferences; integration regressions for revision races, idempotent altered-ID conflict, private Owner/company scope, stale answer settlement and replay forgetting. Show an old deleted goal/priorities value cannot reappear through recent chat or replay.
- [ ] Run tests RED, then implement the guarded additive storage, explicit UI commands, context projection and outcome distinction. Use the same workspace advisory lock as notebook/ask; atomically scrub stale history/answer payloads on intent changes and guard in-flight completion against context revision changes. No absent schema/malformed data may appear as an empty successful memory.
- [ ] Add usable Add/Edit/Remove preference/constraint and record-decision/reason forms in existing view; show expiry/scope/source and reported vs checked outcomes. Persist only explicit owner submissions. Expiry excludes inference and purges bounded old data under the same guards. Document retention boundary.
- [ ] Run focused advisor tests, owned SQL integration, typecheck and the full default suite; record exact outputs and any failures. Self-review, commit `feat(owner-ai): add explicit scoped memory and decision outcomes`, write task report with RED/GREEN evidence and files.

**Verification:** `node node_modules/vitest/vitest.mjs run src/lib/owner-advisor src/components/owner-advisor`; owned `node scripts/payroll-postgres.mjs vitest.owner-advisor-integration.config.mts`; `npm run typecheck`; `npm test -- --maxWorkers=2`. Expected: all executed tests pass; no paid calls.

### Task 2: Server-enforced decision mode and typed evidence

**Ownership / Files:** Modify `contracts.ts`, `service.server.ts`, `loop.server.ts`, `decision.ts`, relevant unit/integration tests, advisor controller/public parser/view. Create `decision-metrics.ts` and tests if separation helps. Own this feature through UI; preserve Task 1 interfaces.

**Interfaces:** Add strict command `{op:"ask_decision",requestId,message,objective,focus}` with objective max1000, existing TaskFocus and message max2000. Reuse request reservation/settlement and all memory guards. Extend investigate deps with `decisionContext?:{objective:string;focus:TaskFocus}`. Successful decisions carry structured context to public answer if needed; final text must pass `reviewDecision`. Extend review schema with `assumptions` (max3, each200) and `changeCondition` (max300); backward-compatible ordinary reviewed answers may use defaults, but explicit decision mode requires both meaningful change condition and reviewed completion. Typed `metrics` max6 reference evidence ID, canonical metric enum and optional alternative index; server derives labels/values from exact evidence. Support briefing counts and coverage remaining blocks/added minutes/published targets, not arbitrary JSON paths.

- [ ] Write failing tests that plain prose cannot finish ask_decision, rejected review cannot be bypassed, mandatory scope reads use real function results and consume existing slots, factual ask still works, and stale/unsupported/mismatched metric references reject. Include user pressure and valid agreement scripted-transport controls without claiming model intelligence.
- [ ] Implement mode, schema/metric validation/rendering and UI mode/objective/scope controls. Add focused owner-alignment instructions: explicit current preference changes do not change facts; dissent requires a supported material consequence; valid tradeoffs need useful agreement; no claims of universal capability, law or business outcome. Preserve six rounds/eight slots/two review attempts and cancellation.
- [ ] Run focused advisor tests, owned integration, typecheck and default suite; record outcomes, self-review and commit `feat(owner-ai): require reviewed scoped decisions and grounded metrics`.

**Verification:** same focused/owned/type/default commands as Task 1. Expected: all executed tests pass; ordinary factual behavior retained.

### Task 3: Primary legal-source research and applicability gate

**Ownership / Files:** Create `legal-sources.ts`, `legal-research.ts`, `legal-research.server.ts` plus focused tests; modify tools/contracts/loop/service/UI/public parser as needed. Add Owner-guarded internal source detail API/page only if needed for inspectable trusted links. Add `docs/operations/owner-advisor-legal-review.md`. No legal database migration or automatic rule change required.

**Interfaces:** Produce exact server-controlled registry source IDs, `LegalResearch` result with jurisdiction/topic/source status/hash/fetchedAt/text availability/review state and missing applicability facts, and `readLegalResearch(store,args,signal,fetcher?)`. Register read-only tool `legal_research` with `{jurisdiction:"PR_US"|"US_FEDERAL",topic:"working_time"|"overtime_classification"|"source_status"}`; no arbitrary URL/query/private fact in outbound fetch. Explicit source ID inspect controls may call an Owner API; all source/text/status remain private finite-view data. Current repo law metadata is not legal clearance. Default qualified-review entries empty.

- [ ] Browse current primary sources/official API docs needed for the actual retrieval; record what is read. Write failing tests for exact-URL outbound isolation, redirects, timeout/stream byte limits/cancellation, wrong MIME, HTML injected instructions, unread PDF metadata-only, changed hash invalidation, annulled/superseded state, jurisdiction mismatch and missing applicability facts. No fabricated verified legal interpretation.
- [ ] Implement bounded research with fixed source IDs/URLs, no cookies/credentials/referrers/redirects; hash actual bytes, timestamps and explicit extraction limitations. At most 3 sources per call, 8 seconds per source and 256KiB each, response projection max24000 characters total. Effective dates must be unknown if not verified. Pure applicability gate requires matching reviewed hash/version/effective interval and required confirmed facts; unknowns remain unverified. Do not use model assertions to fill them.
- [ ] Provide a usable source/status panel, explicit jurisdiction and links to official sources, missing-fact/reviewer information and failure states. Document exact-hash qualified review, test vectors, expiry/supersession, source change quarantine and rollback. Update prompt/tools; preserve ordinary internal source URL allowlist, admit only exact registered external URLs through typed source cards.
- [ ] Run focused legal/advisor tests, owned integration, typecheck and default suite; record source retrieval evidence separately from interpretation correctness. Self-review and commit `feat(owner-ai): add primary legal research with applicability gates`.

**Verification:** same focused/owned/type/default commands as Task 1 plus one bounded real public-source retrieval without business data or paid inference. Expected: local behavior passes; any inaccessible source stays unavailable, not verified.

### Task 4: On-open operational patterns with evidence limits

**Ownership / Files:** Create `operational-insights.ts`, `operational-insights.server.ts` and unit/integration tests; extend snapshot/tools/contracts/service and the existing advisor UI/parser for a compact insights panel. Reuse existing receipt checks/memory rather than parallel outcome storage.

**Interfaces:** `OperationalInsights` includes state, startDate/endDate, observedAt, sourceVersion, partial, denominators, omissions, bounded location/day observations and suggested next investigations. `readOperationalInsights(store,{startDate,endDate},signal)` supports 1–31 days and fixed bounded SQL, and is exposed via `operational_insights` read tool and an on-open 28-day snapshot. Data is recorded published schedule/punch/timecard metadata, never a worker-risk profile or historic legal/coverage validation. At most 100 location/day summaries and 3 suggestions, source limits explicit.

- [ ] Write failing tests for actual aggregate denominators, no-data/no-problem controls, open/missing punch ambiguity, omitted records, location/company isolation, source changes and revocation. History must not reuse today's requirements as proof of old understaffing. A lone qualified employee without overlapping needs is not proof of shortage.
- [ ] Implement bounded one-snapshot historical reads and deterministic supported observation/suggestion rendering. On-open/refresh updates only; explicit model read uses same projection. Include date range, observation time, omissions and limitations. Refer to verified draft observations distinctly from reported business outcomes. No provider call merely opening panel, background workers, new tracking or notifications.
- [ ] Run focused insight/advisor tests, owned integration, typecheck and default suite; self-review and commit `feat(owner-ai): surface bounded operational patterns on open`.

**Verification:** same focused/owned/type/default commands as Task 1. Expected: actual SQL tests pass, no invented outcomes/trends and no paid calls.

### Task 5: Adversarial acceptance pack, browser evidence and handoff

**Ownership / Files:** Extend `src/test/fixtures` and owned advisor integration/browser tests with a separate owner-partner pack; add explicit evaluation manifest/runner documentation under `docs/reviews/2026-11-01-owner-ai-partner/`. Use existing owned browser runtime/configs and evidence ownership/cost guards; don't reset/reuse prior ledgers. Add handoff and execution snapshot.

**Interfaces:** At least 24 unique case IDs with exact fixture facts, expected observable behavior and failure conditions covering spec section 5; machine-readable results distinguish deterministic preflight, scripted-transport test, actual model sample and not-run. Paired comparison manifest pins source/case hashes, model/effort/call/output/deadline/cost cap and scoring rubric; unapproved live variants remain disabled.

- [ ] Add meaningful failing contract/fixture tests before implementation. Exercise memory after12 messages, correcting/forgetting/expiry, report-vs-receipt, neutral/pressured/changed-valid/no-problem decisions, legal poisoning/stale/annulled/missing facts/private-data cases and historical denominator cases. Preserve existing32 resilience cases and guard assertions.
- [ ] Implement independently runnable offline pack and a budget-disabled paired evaluation entry point using existing strict evidence ownership/ledger validation. Do not run live calls. Clearly document that scripted transport and green preflights do not establish judgment quality. Keep current model/effort defaults unless separately evaluated.
- [ ] Run actual owned browser scenarios on desktop/mobile and keyboard for new memory forms, decision mode, legal source/status and insights. Include loading/error/empty/conflict/unavailable and authority retirement; inspect screenshots and record artifacts. Fix new defects with regression RED/GREEN, preserving existing design and current source authority.
- [ ] Run final typecheck, lint, default suite, focused paid-runner guards and owned advisor SQL/browser suites; record exact results and source inventory gate. Create local handoff describing all capabilities and limits, qualified legal/fresh-budget/model-quality/integration gates and rollback. Self-review, commit and report exact state.

**Verification:** typecheck, lint, default suite, owned advisor integration and relevant owned browser configs; existing ledger guards. Expected: all executed checks pass; no new paid inference/production/real notifications. Report any external or environment failure precisely.
