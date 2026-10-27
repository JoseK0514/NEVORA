# Employee mobile Requests — independent whole-change code review

- codeQualityStatus: WATCH
- recommendation: APPROVE
- blockers: []
- Reviewed range: ae6767980ec21c5a0751eced6e0e60a23ea75cdf..d70487c6 on codex/employee-mobile-requests-20261027.
- Scope: bounded local Requests hub and eligible open-shift pickup; no release authorization.

## Findings by severity

### CRITICAL
None found.

### HIGH
None found.

### MEDIUM
None found.

### LOW
`src/test/integration/employee-mobile-requests.integration.ts:130-137`: the recorded scenario calls itself “Offline/background release” but drives synthetic offline/online events only. This proves the connectivity event path, not an actual background/visibility transition. Keep final evidence claims scoped to offline/resume, or add an actual visibility scenario in later lifecycle acceptance. The production visibility listener is present; this is evidence precision, not a demonstrated product failure.

## Review evidence and conclusions

Read the approved plan, Phase 1 HANDOFF, repository AGENTS.md, executive operating model, CTO, CISO and independent QA instructions. Reviewed the full changed-file diff, current Requests implementation, shared private snapshot controller, immutable ShiftChangeFormState, Employee SQL guards, existing reader SQL, route authentication, and added tests/configuration. No supplied notepad path; used docs/execution/employee-mobile-requests/plan.md as the scope record. No product/source/test changes made.

The endpoint rejects arbitrary selectors and wrong session/view binding; current SQL guards bracket each read. Existing read owners and the command planner remain authoritative. Projection omits peer identities, absence reasons and private source records. Module revision is rechecked, failed eligibility remains unavailable, and only positively checked rows expose pickup. The strict parser is justified at the private transport boundary; it is not unrelated data normalization. Optional executor injection preserves existing reader callers. Desktop direct-child rendering and management branch ownership remain intact; the desktop consequence-copy correction is consistent with actual automatic/manual outcomes.

Pickup delegates operation identity and payload retention to the established owner. Entry guards fence retired submission/recovery callbacks, pending and uncertain operations cannot be replaced by refreshed revisions, and hidden snapshots cannot render private operation results. Original operation reconciliation precedes resend; server commands retain final authority. No optimistic assignment was introduced.

Independently ran:
`npx vitest run src/lib/employee-requests.test.ts src/lib/data/employee-requests.server.test.ts src/lib/employee-view-route.test.ts src/components/employee-mobile/pickup-operation.test.ts src/components/employee-mobile/requests.test.tsx`
Result: 5 files, 19 tests passed (2026-10-27 01:16:28 local shell output).

Inspected saved `.omo/evidence/employee-mobile-requests/browser-run-5.log`: 3 files / 39 tests pass, including 38 existing real PostgreSQL tests and one browser journey. Log reports owned cluster stopped. Inspected `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-requests/run-5/results.json`: 27 named checks, all three engines represented, 35 capture references, 18 contrast measurements and four scenario-correlated intentional transport/401 errors; no recorded page errors. Read integration assertions against canonical assignment and one operation receipt, role/module/foreign-selector refusal, lost-response recovery and desktop isolation. These are inspected executor artifacts, not an independent browser replay by this reviewer; independent QA remains separate.

## Skill-perspective check

Loaded and consulted both `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md` and `programming/SKILL.md`. Ran the review perspective over production and tests. No material violation of either perspective found: no deletion-only or requested-removal tests, tautological assertions, prompt-text tests, new untyped production escape hatch, duplicated business planner, needless normalization or abstraction. Rendered HTML checks cover a real inherited direct-child CSS contract and stale-submit affordance; operation tests observe command calls, payload identity and pending/recovery behavior. Broad existing modules remain existing service owners; a broad refactor would exceed the bounded scope. Dense one-line style matches adjacent code and does not warrant a new blocking style requirement.

## Conditions and release limits

APPROVE is a code-review recommendation for this local candidate. Independent UI/QA acceptance, source inventory reconciliation, physical-device/assistive-technology checks and hosted parity remain separate gates. No merge, push, production credential use or deployment performed. No user approval or policy exception inferred.

ULW status returned ULW_LOOP_PLAN_MISSING, so the required fallback artifact is `.omo/evidence/employee-mobile-requests-code-review.md`; the durable requested copy is `docs/execution/employee-mobile-requests/code-review.md`.
