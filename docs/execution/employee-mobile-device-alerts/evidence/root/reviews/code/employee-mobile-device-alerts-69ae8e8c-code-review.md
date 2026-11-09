# Device alerts independent test-only review — 69ae8e8c

Candidate: `69ae8e8c8199529f2ce3cbb4c9cac630de94e493`; previous application candidate `72b1c192e8f2f05bcdd51b41cbf895ebce0d3dc5`; overall base `059f4ac2fbd4cc50bb526bb0f1001465de2e2ce2`.

- codeQualityStatus: **WATCH**
- recommendation: **APPROVE** the bounded test-only correction for continued local verification.
- Runtime/feature acceptance: **NO-GO pending failed affected-suite recovery**.
- blockers: latest affected-recovery-01 exits1, with5failed files/1passed and12failed tests/11passed/4skipped; no passing terminal recovery evidence yet. Inherited QA-OWN-3 and global default16-failure condition remain unclosed. These are not newly attributed production defects from the test-only diff.

## CRITICAL
No new critical code defect identified.

## HIGH
No new high-severity code defect attributed to this five-file test-only delta. Retain independently authored QA-OWN-3 compound suppression/unsubscribe/server-failure outcome and its existing disposition; this review does not close or accept it.

## MEDIUM
No new test-code issue requiring changes identified. **Verification blocker:** inspected terminal `reviews/qa/affected-recovery-01/run.log` and exit-code.txt. Communications-review beforeAll timed out at30000ms; subsequent affected suites refused an existing disposable database. Guards were preserved. Result is5failed/1passed files,12failed/11passed/4skipped tests. No causal attribution to the new due-time helper is established by this log; do not report affected feature coverage as passed. Original full-run-01 failure also remains preserved (371tests,364passed,7failed per parent/QA report; this review's terminal inspection concentrated on affected-recovery-01).

## LOW
No new actionable finding.

## Scope and evidence
Independently verified git diff contains exactly five src/test/integration files and no changes to application routes/components/lib, scripts or package configuration relative72b1c192. Production application remains byte-identical to the prior independently reviewed candidate. `git diff --check 72b1c192..69ae8e8c` passes. Independently executed fixture URL and canonical notification policy units: **24/24 pass**, `fixture-policy-69ae8e8c.log`. These unit results do not validate the new SQL helper against a real database; that belongs to the affected integration gate. No new heavy run or source mutation performed by reviewer.

## Test correction assessment
1. Owned notices: exact environment=test, source_kind=COMMUNICATION, newly published source IDs and selected actor IDs bound the UPDATE. It changes only due_at to created_at. Transaction captures whole-table fixed-field fingerprints excluding due_at, requires exact target/update cardinality and identities, preserves created_at and all unrelated due timestamps, and checks due status afterward. Caller counts27,9 and2*publication count match the intended publication/actor scope. This is explicit fixture preconditioning for paging/access tests, not a production quiet-hours bypass. Original pagination, module permission, recipient and receipt assertions remain intact.
2. Quiet-hours evidence: read authoritative `reviews/qa/quiet-hours-observation-text.log`:2026-10-27 22:33 AST,27 COMMUNICATION rows,0currentlydue, all due2026-10-28 07:00 AST. Canonical policy source specifies21–07 and existing policy tests exercise quiet-hours behavior. This supports the fixture diagnosis while preserving real scheduling coverage elsewhere.
3. Held-route teardown: test now observes the intercepted handler starting, then only awaits its done promise in finally if it actually began. The original timeout/navigation assertions remain. A failed click before route entry is no longer masked by waiting forever for an impossible completion.
4. Keyboard: independent static-keyboard/results.json shows macOS WebKit ordinaryTab skips buttons while Alt+Tab reaches Keep and Turn off with3px outlines. Actual-app-characterization-07/run.log is a passing independent characterization. The corrected platform-specific native chord retains active-element, outline, bounds and navigation assertions; it does not substitute programmatic control focus or change app tabindex.
5. Capture: static-touch-transition.json shows installed Chromium fullPageShot changes maxTouchPoints1→0/coarse→fine while viewportShot preserves capability. Application remains unchanged. Viewport-only captures now accompany explicit coarse-media, palette, contrast,44px target and navigation-clearance assertions before/after captures in both themes. This removes observer interference and strengthens genuine coarse-layout checks; it does not waive overflow or geometry assertions. Back action additionally waits for actual destination URL/heading after hit-tested pointer click.

## Required skill perspectives
Previously loaded programming and remove-ai-slops criteria reapplied to this test-only delta. No deletion-only, LLM prompt-string or tautological test introduced. Fingerprints and explicit cardinality checks are scoped fixture invariants requested to prove unrelated data remains unchanged; they are not needless production normalization. All parsing/SQL inventory here is test evidence, and production code remains unchanged. No weakened behavior assertion found. Runtime failures cannot be relabeled success by the fixture/static unit results.

## Limits and next gate
Continue local diagnosis/recovery with original failure artifacts intact and exact source/owned-process identity. Do not close CR-2 actual browser gate until a completed matching-source run demonstrates it. Existing broader default run remains16failures (13known deterministic baseline plus3process failures with unresolved cause), rather than claiming the previous13 alone. Retain CalendarQA-CAL1, prior Communications conditions, process-observation instability, physical-device/OS, assistive technology, provider, hosted and release limits. No global Employee mobile completion, merge or deployment approval supplied. All earlier authored reports/reproductions preserved.
