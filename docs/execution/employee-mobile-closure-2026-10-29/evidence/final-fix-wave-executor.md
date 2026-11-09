# Final whole-change findings — one bounded fix wave

Scope: R1–R3 from `.superpowers/sdd/PLAN/whole-change-review.md`. Worktree: `work/employee-mobile-closure-20261029`. Source commit: `9c5c303f7d1923c19b25533555b6816cd9323182`, parent `45766d8e` (parent's independent runner/navigation edits preserved). Six owned test/instrumentation files changed; no application UI, authorization, schema, production notification or process authority changed. No subagents spawned, no push/deploy/external messages. Shared work preserved.

## Repairs

- R1: browser observation uses the effective init/Request method and tags/records only GET on the exact same-origin Calendar path. Classifier explicitly requires method GET; POST, DELETE and unknown methods stay pending even with a matched successful GET positive control. The existing Profile request map already supplied method, so no unnecessary callsite edit was needed. Positive GET observations still work, including a POST Request overridden by init method GET. Real loopback HTTP proves a POST received by the server and then genuinely aborted has no GET observer receipt and nevertheless remains pending.
- R2: the actual 1,024-request cap emits one explicit `unavailable/capacity` event, then stays bounded. Any unavailable event disables every orphan exception; malformed tagged log evidence likewise fails closed rather than disappearing. A real local HTTP test sends1,025 uniquely tagged GETs, confirms all1,025 reached the server and proves the omitted overflow receipt cannot become absence authority. A further request confirms the unavailability event does not grow without bound. Existing no-abort/server-started/response-seen/unmatched-control/unrelated-path/invalid-marker negatives remain.
- R3: all Home roots, including hidden retained roots, are inspected at offline pause, session revocation and workspace deactivation. Checks retain exactly one visible root, display-none ancestry for any other root, and global zero OFF_CLOCK badges. New checks inspect all root text, private attributes and snapshot/assignment/action/week sections. Evidence records only booleans/counts. The original all-root Main Office text predicate is preserved via allTextContents, without a strict single-element locator or visibility exemption.

## Actual verification

- `red.log`:9 expected regression failures /9 existing passes. Failures cover non-GET/unknown classifier acceptance, saturated/malformed observer acceptance, browser mutation tagging and real received POST accounting.
- `green.log` + `green-exit.txt`:20/20 passing unit/real-HTTP tests, exit0. Includes stronger actual post-receipt AbortController POST case. The cap test uses the production cap, not an inflated timeout or smaller test seam; no existing deadline or assertion was loosened.
- `home-private-probe.mjs`, `.log`, `.json`:12 actual Chromium/WebKit/Firefox DOM cases using the exact callback extracted from the current Phase1 source. In each engine, a hidden private text, private attribute or snapshot section passes the old visible-text+geometry condition but fails the new private-clearance predicate; genuinely cleared hidden roots pass. This is test-harness negative/positive validation on an isolated browser document, not a claim of an application leak or full journey pass.
- `typecheck.log` + exit record: `tsc --noEmit`, exit0. An initial local implicit-any annotation error was corrected; final source passes.
- `lint.log` + exit record: ESLint on all6 changed files, exit0.
- `git diff --check`: clean.

## Residual and gate

Implementation recommendation: R1–R3 repaired with narrower classification and stronger privacy evidence. The parent owns one scoped re-review and frozen all13 configurations, landscape matrix, full default replay and final handoff; these checks were intentionally not duplicated in this subtask. No actual application hidden-root leak was established by this task. If strengthened real journey assertions reveal retained private DOM, that is a product defect requiring diagnosis, not grounds to relax the assertion. Physical devices/providers/AT/hosted/production and policy decisions remain outside local certification. Independent findings are not self-certified closed; submit this exact source/evidence to the reviewer and Claude.
