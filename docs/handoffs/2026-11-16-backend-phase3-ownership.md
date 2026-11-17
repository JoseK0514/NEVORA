# Phase 3 ownership and reconciliation — November 16, 2026

Application baseline: `edce7661c211aba588f29bd6d56327fabdc11b47` (explicit Jose assignment overrides the older phase-number routing in Phase 1). Fresh origin/development is `22a9d598eb470cd380ee739d7396f06ecf335ed5`. Detached isolated worktree: `/Users/josek0514/.codex/worktrees/nevora-backend-phase3-20261116/Fuel Scheduler`. No shared branch publication, integration, other-checkout changes or deployment.

## Owned paths, recorded before application edits

- `src/lib/data/scheduling-restrictions.server.ts`
- `src/test/integration/scheduling-restrictions.integration.ts`
- New `src/test/integration/shift-change-phase3-facts.integration.ts` (uses existing owned exchange project)
- `src/lib/action-center/project.ts`, `src/lib/action-center/project.test.ts`
- `src/lib/action-center/needs-you.ts`, `needs-you.test.ts` (shared canonical count semantics; no presentation edits)
- New `src/lib/action-center/review-facts.ts` (behavioral tests in existing projection/count suites)
- New `src/lib/action-center/request-facts.ts` (public request type/parser)
- `src/lib/data/time-corrections.server.ts` (additive review identity projection only)
- `src/lib/time-corrections/read-model.ts` (additive identity validation only)
- `src/lib/today/project.ts`, `project.test.ts` (late-minute read fact and parser only)
- `src/lib/data/requests.ts`, `requests.test.ts` (existing createdAt normalization only)
- `src/lib/reports/project.ts`, `project.test.ts` (published scheduled time/day projection only; no pay/cost work)
- `src/lib/data/action-request-facts.server.ts`, `action-request-facts.server.test.ts`
- `src/lib/data/callouts.ts` (additive linked coverage history status; no mutation changes)
- `src/lib/employee-exchange.ts`, `employee-exchange.test.ts` (carry linked outcome through existing public summary/parser)
- `src/lib/time-corrections/read-model.test.ts`
- New `src/lib/employee-home/task-summary.ts` (behavioral tests in existing Home projection suite)
- `src/lib/employee-home/types.ts`, `src/lib/employee-home/project.ts`, `project.test.ts`
- `src/lib/scheduling/generation/types.ts`, `demand.ts`, `demand.test.ts`, `explanation-view.ts`, `explanation-view.test.ts`
- Phase 3 handoff, contract, review and test evidence under `docs/handoffs/2026-11-16-backend-phase3*`.

Any additional owned path must be recorded here before editing. No financial, auth/session, global test infrastructure, migration registry, Rondo or UI presentation files are owned.

## Initial field-by-field classification

| Area | Classification | Evidence / bounded action |
| --- | --- | --- |
| Firm restrictions, preference cutover, manual/copy/generation/publication/exchange | Already implemented; focused requalification required | Existing restrictions, validator, publication and generation cohorts. Do not rebuild engine. |
| Legacy/future/effective overnight custody | Implemented; focused verification | Existing real SQL race/overnight tests and pure validator/weekend tests. |
| earliestWeek read after a future employee version | Confirmed read-contract defect | Read returns workspace boundary; command requires max(boundary,last employee version + 7 days). Align read. |
| Own correction and timecard review | Missing typed read contract | combineManagerActions emits English ownership titles; needs-you and present consume titles. Add typed facts; Claude connects consumers. |
| Correction concerns actor versus authored by actor | Missing identity fact | Existing isSelf combines subject/requester; add separate boolean without disclosing IDs. |
| Required work beyond Home preview | Missing aggregate metadata; ranking already implemented | required/actionable/deadline already exist. Preserve canonical deadline/required ranking, expose full authorized totals, hidden-required counts and source completeness. |
| Failed/partial Home and action center reads | Already implemented; verify | Home sources carry partial/unavailable; action center canonical failures do not become ready empty. |
| Request dates/duration/note/counterpart name/kind | Already delivered | Preserve producer→parser exchangeKind regression. |
| Swap counterpart shift / sanitized omission; coverage/request outcome | Missing read facts | Enrich current authorized request projection only; current terms and full location scope required. |
| Correction intervals and work date | Already delivered | Preserve explicit workplace zone and original/requested times; validate at parser boundary. |
| Review actual period, deadline, next reviewer | Period missing as typed field; deadline/named assignment not stored | Expose period and independent COMPANY role requirement; null deadline and unassigned reviewer rather than inventing names/overdue. |
| Late minutes, Manager scope, permitted locations, planned hours/day | Reconcile existing canonical readers before adding | Use current attendance/today/report/scope DTOs, no duplicate financial projection. |
| Coverage percent | Formula delivered, semantics missing/mislabelled UI | Fully covered period minutes / configured period minutes, not staff-hours. Add typed semantics, preserve numbers. |
| Monetary optimization | Future improvement/product and financial dependency | Document minimum inputs/permission follow-up; no storage, calculations, AI tools or spending. |

## Controls and execution boundary

CTO: smallest additive contracts, existing canonical readers/mutations. CPO: no ranking, authority, deadline or legal-policy invention. CISO: current full-scope authorization and no foreign-location counterpart details. Technical assurance: producer/parser round trips, red/green defects, distinguish read eligibility from final command permission. Governance: no exception; local evidence only, whole release remains conditional on integrator/Claude/independent gates.

Existing execution handoff: `2026-11-16-readiness-development-integration.md` and `2026-11-16-readiness-webkit-navigation.md`; heavy build/browser qualification remains with that owner. This phase runs focused units, owned disposable PostgreSQL/API, type and lint checks serially. No heavy build/browser run, provider/model call, customer data or real message is authorized here.
