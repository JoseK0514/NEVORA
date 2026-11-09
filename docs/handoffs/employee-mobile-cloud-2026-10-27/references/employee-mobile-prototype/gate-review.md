# Employee mobile final evidence gate

recommendation: APPROVE

blockers: []

## Original intent and desired outcome

originalIntent: Jose wants a detailed Employee mobile adaptation of the selected clean teal Owner direction, exposing only Employee-authorized actions.

desiredOutcome: A reviewable, connected local first slice covering Home, own published schedule/review, own full-day time off, recorded hours/correction and own profile/previews. The agreed plan explicitly defers complete Employee parity and application integration.

userOutcomeReview: The delivered React artifact satisfies this bounded outcome. It is an interactive fictional sample, identifies sample submissions, leaves requests Pending, preserves original punches and separates planned hours from recorded time. No manager scheduling, approval, team administration, payroll execution or phone-punch action was found in the reviewed source. This approval is not a production or authorization certificate.

## Criteria and direct evidence

Criteria identifiers below label the existing plan/AGENTS requirements for this report; they add no new requirements.

- C1 — Connected first-slice flows: inspected all feature modules and actual browser assertion source. Three independent result files each contain 38 passing checks, zero failures, empty runtime-error and operational-request arrays. Actions include review/edit/submit/cancel, original recorded-entry preservation and duplicate-pending prevention.
- C2 — Employee-only fictional scope: App.tsx owns local React state initialized from model.ts; Requests.tsx creates Pending requests and cancels only Pending entries; Hours.tsx adds correction requests without changing entries. More.tsx contains own read-only profile/previews. Inspected actual application permissions.ts:7 and employee-time-panel.tsx:118–150 at verified HEAD 46e202786863279302026ee03a0e225c359fa55c, supporting the manager/self-service and recorded-time boundaries. No backend enforcement claim is warranted.
- C3 — Coherent fixture state: model.ts retains approved November 6 leave and excludes shift offset 11; Schedule.tsx calculates visible count × 8 for its uniformly eight-hour fixture. Independently viewed evidence/flows/next-week-320.png: Monday 2 through Thursday 5, four shifts, 32 planned hours. check.cjs:37 checks count, total and absence of Friday 6. The old full UI finding and bounded resolution are both preserved.
- C4 — Mobile, focus, state and design evidence: inspected shared CSS, primitives, modal/navigation code, browser assertions and the independent UI report. The supplied results cover 320/390/430/660 widths, controlled enlarged text, modal Tab/Escape, loading/error/empty/partial states. The independent review documents its complete initial capture pass and bounded final recheck honestly. This gate did not repeat the entire visual pass.
- C5 — Final-artifact provenance: independently reconstructed the esbuild bundle and HTML entirely in memory using the inspected build recipe. Reconstructed bytes, saved index.html and GET http://127.0.0.1:18763/employee-mobile/index.html bytes are identical. SHA-256 for all three: 234593a6901187d4d68f2f40e463875e88cbc01aad78bdc37bed09501ca04db7. All three browser JSON hashes match; all output raster hashes and their artifact hashes match asset-provenance.json.
- C6 — Isolation and honest handoff: workspace is not a Git checkout; scoped package scripts contain no application migration or deployment. No production API, persistence or deployment mechanism exists in the inspected prototype source. The reports explicitly distinguish installed/configured/tested/deferred states. This gate performed local reads, in-memory compilation and one local GET; no deployment or application mutation.

## Direct remove-ai-slops and programming pass

Consulted both installed OMO skills at /Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/{remove-ai-slops,programming}/SKILL.md. Applied review criteria directly to complete new source and check.cjs because no Git diff exists.

- Excessive/useless tests: responsive loops test distinct geometry conditions; the three engines address actual browser differences. No new cleanup tests or prose-document wording tests were introduced by this gate.
- Deletion-only/removal tests: the Friday-6 absence assertion belongs to a visible date/count/hours consistency scenario, rather than merely verifying a source deletion. Role-exclusion assertions cover an explicit user requirement.
- Tautologies/implementation mirroring: main flows drive rendered controls and assert visible outcomes. Expected fixture dates and totals are independent literals, not recomputed from the output under test. A nav CSS-class assertion is implementation-coupled and provides weaker evidence than the accompanying overflow/touch assertions (NOTE).
- Unnecessary extraction/parsing/normalization: shared controls have real reuse; date and time conversion serves native form/display boundaries; no speculative backend abstraction or fake authorization service was added. Input validation is boundary validation. No material scope drift found.
- Maintenance/false-confidence notes: check.cjs chains some cases on shared browser state and uses a fixed local server/absolute Playwright installation. Failure can cascade and it is not portable isolated CI. Non-null/type assertions and screen-selection ternaries do not meet every aspirational programming skill preference, but no demonstrated scoped outcome failure results. Tiny unused CSS selectors and dense JSX are nonblocking cleanup opportunities, not reasons for another polish round.
- Coverage of reports: ui-review.md explicitly covers reusable components, source boundaries and module size, but does not explicitly enumerate both skill perspectives or all overfit classes. No separate code-review report was found in the scoped evidence directory. This direct pass supplies the missing perspective; the role instructions permit direct coverage rather than rejection solely for a missing report.

## Checked artifact paths

- outputs/employee-mobile/plan.md, feature-map.md, verification.md, checks.json, ui-review.md, design-record-check.md, index.html, asset-provenance.json and every raster named in that provenance file.
- work/employee-mobile/AGENTS.md, README.md, package.json, build.mjs, check.cjs, deliverable.cjs; all src/*.tsx, src/model.ts and all three src/*.css files.
- work/employee-mobile/evidence/{chromium,webkit,firefox}/results.json; evidence/flows/next-week-320.png; ui-review.md's other capture references were consulted as reviewed evidence, not independently re-viewed in this gate.
- work/employee-mobile/21st-review-final.log; .omo/evidence/employee-forms/report.md; .omo/evidence/employee-design-record/verification.json.
- Source application: /Users/josek0514/.codex/worktrees/pr32-dev-preview-20261025/Fuel Scheduler/src/lib/auth/permissions.ts and src/components/employee-time-panel.tsx.
- No separate notepad supplied: plan.md and scoped AGENTS.md serve as handoff context.

## Exact evidence gaps and limits

No blocking gap tied to C1–C6. Browser suites were inspected, not rerun. The gate independently reproduced artifact/served/source agreement, not every behavioral execution. No native-device, real date-picker/software keyboard, screen-reader, backend authorization, real request durability, feature-parity or deployment validation occurred. The 23 informational 21st token-declaration advisories are recorded; no whole-CSS zero-findings claim is supported. Formal Tastemaker KB/grade is unavailable and acknowledged.

The initial documentation hash discrepancy was resolved by refreshed validation. Independently rechecked every verification.json file hash: all now match, including DESIGN.md/PRODUCT.md; all 12 recorded static checks pass. The final check.cjs adds process.chdir to resolve the workspace from its own directory; inspection confirms this changes only QA invocation, not the artifact. No new product review was needed.

`omo-agent-toolkit ulw-loop status --json` returned ULW_LOOP_PLAN_MISSING. Required fallback report: .omo/evidence/employee-mobile-gate-review.md. No source files, design records, or independent UI report were changed by this reviewer.
