# Employee mobile closure — scoped final fix-wave review

Date: 2026-10-29. Reviewer scope: `cc89df19ae259725e5553d145847b915e16f089a..9c5c303f7d1923c19b25533555b6816cd9323182` in `work/employee-mobile-closure-20261029`. This covers the parent runner/navigation repair `45766d8e` and findings repair `9c5c303f` only. It does not repeat or replace the whole-change review of `2f87e038..cc89df19`.

- **codeQualityStatus: CLEAR**
- **recommendation: APPROVE — scoped fix wave only**
- **blockers: [] for this scoped code review**
- Final combined execution, the historical WebKit navigation error, original acceptance ownership, physical-device/provider/assistive-technology checks and policy/release decisions remain separate gates. This report certifies none of those unfinished items.

## Findings by severity

- **CRITICAL:** none established in the scoped diff.
- **HIGH:** none established in the scoped diff.
- **MEDIUM:** none established in the scoped diff.
- **LOW:** none requiring a change in this bounded pass.

## R1 — addressed

`src/test/integration/calendar-request-monitor.ts:43` determines the effective method from RequestInit before Request, defaults a plain URL to GET, and bypasses instrumentation for non-GET. `:15` separately requires the actual pending request method to be exactly GET. Unknown methods therefore remain pending. The existing Profile request map supplies `request.method()` at `src/test/integration/employee-mobile-profile.integration.ts:33`; no missing callsite propagation was found.

The added regressions distinguish POST, DELETE and unknown methods from a GET positive control, test both Request/init precedence directions, and preserve actual positive GET tagging/abort accounting. The real HTTP POST test waits until the server receives the POST before aborting; the GET-only observer omits that mutation, but the classifier now retains it. This directly covers the original false-absence defect instead of asserting a renamed constant or the mere deletion of a header.

## R2 — addressed

`src/test/integration/owned-calendar-diagnostics.mjs:17` emits one explicit unavailable/capacity event when the actual 1,024-request bound is exceeded. Further events stay bounded. The classifier at `calendar-request-monitor.ts:9` refuses every orphan exception once observation is unavailable. The parser at `:20` also converts a malformed tagged observation into unavailable rather than discarding it and inferring absence.

The test sends 1,025 real tagged loopback GETs, independently counts all 1,025 server receipts, then demonstrates that the omitted overflow request remains pending despite a successful earlier control. A further request verifies bounded event retention. Existing abort, response, server-receipt, unrelated-path, invalid-marker and unmatched-control negative checks remain. No deadline increase or general idle tolerance was introduced.

## R3 — addressed as a verification repair

`src/test/integration/employee-mobile-phase1.integration.ts:55` now inspects every `.q-home` root, including hidden retained roots. It checks text, private attributes and snapshot/assignment/action/week sections, records only booleans/counts, preserves exactly one positive-size root and display-none ancestry for additional roots, preserves the original all-root Main Office predicate through `allTextContents`, and preserves the global zero OFF_CLOCK-badge check. The helper is used after offline pause, session revocation and workspace deactivation.

The saved three-engine DOM probe uses the callback extracted from this exact source. Hidden private text, a private attribute and a retained snapshot section all pass the old visible-only condition but fail the new predicate; a cleared hidden root passes. This supports test sensitivity. It does not prove that the actual app has a retained-content leak or that the strengthened full application journey has passed. The parent must retain that distinction and treat any real journey failure as a defect rather than relaxing these assertions.

## Parent runner and navigation repair

`scripts/employee-mobile-evidence.mjs` supplies distinct directories for all currently discovered Employee evidence variables under each configuration. Full configurations include earlier journeys, so supplying only their namesake variable was insufficient. The runner imports the helper and preserves all 13 configuration selections, source-SHA checks, raw logs, per-suite exit recording and final failure propagation. Source inspection confirms the current full configuration dependencies receive their required variables.

The new environment test derives machine-consumed variable names from actual integration source and checks both provision and directory separation. This is a small contract check for the observed missing-evidence failure; it is not a prose pin or a mirror of the helper's list. The preserved RED output shows the prior mapping returned undefined; the GREEN artifact records 1/1 pass.

`src/test/integration/employee-mobile-closure.integration.ts:77` avoids a redundant immediate Home navigation after login has already navigated there, while still waiting for its actual ready state. The same route/geometry/contrast/target checks remain, every pageerror is still recorded, and the final zero-failures assertion remains. This is reasonable test-flow correction, but it is **not a proven causal resolution** of the historical WebKit push-status access-control pageerror. The isolated caught-fetch/navigation probes did not reproduce that pageerror; a new strict matrix pass and accurate residual disposition are still required. Do not relabel the earlier failure as an established browser-only harmless event.

## Skill-perspective check

Explicitly consulted the available `omo:remove-ai-slops` and `omo:programming` SKILL.md files, including their behavioral-test, overfit/tautology, boundary, type and abstraction criteria. Also read repository AGENTS and the executive operating model, CTO, CISO and Governance & Risk skills.

The scoped diff adds no production UI, authorization, data extraction, normalization or service behavior. Its diagnostic parsing is at the actual log boundary and is necessary to prevent malformed evidence from becoming proof of absence. The evidence helper is a small testable seam used by the runner; the privacy helper replaces duplicated checks at three checkpoints. The new tests exercise meaningful method precedence, real server receipt, observation capacity and private-content clearance. No deletion-only, prompt-prose, tautological or implementation-mirroring test was established. No material violation of either required skill perspective was found. Existing compressed journey style and pre-existing type assertions were not expanded into a speculative refactor.

## Evidence inspected and limits

Read the complete 11-file diff for this range and its current callsites, the original R1–R3 report, fix-wave report, RED/GREEN logs, exit records, actual DOM probe source/results, runner RED/GREEN logs, and the isolated WebKit probe results. The inspected fix-wave artifacts record 9 expected RED failures, 20/20 GREEN tests, 12 DOM positive/negative cases, TypeScript exit0 and scoped ESLint exit0. These are executor artifacts inspected by the reviewer; **I did not rerun tests**.

`git diff --check cc89df19..9c5c303f` was clean. HEAD remained `9c5c303f7d1923c19b25533555b6816cd9323182`; tracked status was clean before report creation. `omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING`, so the required report uses the fallback `.omo/evidence/employee-mobile-final-fix-wave-code-review.md`. A matching copy is at the parent's requested `.superpowers/sdd/PLAN/final-fix-wave-scoped-review.md`.

Only these ignored review artifacts were written. No tests, browser interactions, database commands, process cleanup, tracked source edits, commits, pushes, deployments, external messages or subagents were performed by this review.

## Next gate

Engineering and security recommendation: retain these repairs and complete the frozen candidate replay. Governance recommendation: proceed with local verification; this scoped approval does not exit Phase 2, accept a residual risk, or authorize publishing or production. Parent owns the execution result and Claude handoff; the independent/physical/policy gates remain as documented.
