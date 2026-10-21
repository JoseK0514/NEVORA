# Task 2 browser contract review

- specStatus: FAIL (bounded contrast-helper correctness issue; browser rewrite requirements otherwise satisfied)
- codeQualityStatus: BLOCK
- recommendation: REQUEST_CHANGES
- reviewed base: 62cb5dd76aea255fb464163ad1ae76d4e0e1a0fb
- reviewed head: 14a7acf76749e040e1ad78b652fdeef5af7eccae
- branch/worktree: codex/verify-preview-33, /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler
- notepad: no separate notepad path supplied; task brief/report inspected under .superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/.

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM
M1 — Composite the background color beneath a translucent gradient, or reject this unsupported combination.
Location: scripts/browser-contrast.mjs:34 and :54.

The colors(layer) path returns backgroundColor only when backgroundImage is none. Otherwise the gradient is composited directly onto the parent's background, omitting the element's own background color. CSS paints that color beneath the gradient. Consequently an accepted alpha-gradient input can produce a false accessibility pass. A focused, read-only Node reproducer using the helper's existing fake-DOM seam returned 21:1 for white text on an element with white backgroundColor and `linear-gradient(145deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 100%)`, above a black parent. The actual contrast is 1:1 because the gradient is fully transparent. This is within the helper's accepted grammar, not an exotic unsupported image.

Fix before approval: paint each layer's background color before its gradient, or fail closed when translucent image stops combine with a nontransparent background color. Add a focused regression that cannot pass the above white-on-white combination. Keep 4.5 unchanged. This finding does not establish a current Home CSS contrast failure: its reviewed primary gradient is opaque, and the recorded Home measurements remain evidence for that current rendering.

### LOW
None requiring action.

## Spec and scope assessment

Reviewed the supplied complete seven-file diff and task brief/report. No application, schema, dependency, policy/payroll copy, or workflow YAML changes. The package change adds the four helper regressions to the existing release-engineering command. Timecards use actual employee rows and detail-dialog approve/finalize/reopen; immutable revision comparison remains. Insights opens Period details and Export while retaining print/download, offline and authority-loss checks. Corrections are followed from Inbox to the exact request and focus. Clocker and account-recovery labels track the current UI while preserving exactly-once outcomes, receipt verification, session invalidation and reused/expired proof assertions. Native keyboard disclosure and focus coverage remains.

The request.note replacement is precise, not a deletion of privacy coverage: one authorized time-off note is asserted in the response request object and selected detail, excluded from compact fields/list, and cleared with rows/counts on offline, reconnecting, unavailable and forbidden states. HANDOFF.md:592–608 explicitly supports the optional authority-checked request.note contract. Existing route-denial and restricted-location test logs were inspected.

## Skill-perspective review

Loaded /Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md and programming/SKILL.md. Applied the overfit/slop and programming test-discipline perspectives in read-only review mode. No deletion-only, requested-removal-only, tautological, prompt-prose or implementation-constant-only test additions found. UI text selectors here target real workflows and privacy states rather than model prompt wording. The numeric helper regressions test actual compositing/contrast behavior, although they miss M1. No production data extraction/parsing/normalization or untyped production escape hatch was introduced. The computed-style parser is justified at a browser-measurement boundary; the defect is incomplete compositing, not needless production abstraction. Dense browser scripts are an established pattern, not new architectural scope. No independent slop-perspective violation found; M1 is a correctness gap in the test measurement boundary.

## Evidence independently inspected

Evidence root: /Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/browser-contracts

- d-final4/report.json: clean 14a7acf7, 201 checks, zero errors; earlier failed reports retained.
- e-home-final1, e-navigation-final1, e-attention-final1/browser-report.json: each 14 passing executions, zero errors, checkpoint 688279ce.
- e-communications-r4 and e-calendar-r4/browser-report.json: each 14 passing executions, zero errors, checkpoint 75d565cb.
- covering-checks/source-custody.json checked against Git: no src changes after75d565cb; only package.json and phase-d-browser-qa.mjs changed after688279ce.
- covering-checks logs: request-facts unit3/3, integration10/10, action-center route13/13, release-engineering56/56; static syntax/eslint/diff checks recorded exit0.
- artifact-manifest.json: independently hashed all370 copied artifacts; zero missing/hash mismatches.
- covering-checks/contrast-summary.json and current assignment CSS inspected: unchanged4.5 threshold; recorded minimum4.938449529801125. M1 limits the generality of the helper, not the authenticity of these recorded samples.

No full suites rerun. The sole executed functional probe was the focused M1 reproduction, which returned {actualWhiteTextOnWhiteBackground:1, reported:21}. No source fixes, commits, pushes, production actions or real notifications performed. The ULW status command returned ULW_LOOP_PLAN_MISSING, so this report uses the required fallback path, with the requested /tmp copy.

## Remaining gate and blockers

Blocker: resolve M1 and demonstrate its focused regression passes without relaxing the threshold. Task evidence otherwise supports the scoped browser rewrite. Combined hosted CI remains pending and no single final-HEAD70-cell Phase E run is claimed. Existing four P1/three P2 independent UI findings remain OPEN and outside this task; this review is not release approval.
# Task 2 scoped re-review — M1 correction

- M1: ADDRESSED
- specStatus: PASS (Task 2 scope, incorporating prior review)
- codeQualityStatus: CLEAR
- recommendation: APPROVE
- blockers: []
- Reviewed base14a7acf76749e040e1ad78b652fdeef5af7eccae to head6eb1c074bb3cdf8285cf96eb79829021a99e5142.

## Scope and conclusion

Read the supplied review-14a7acf7..6eb1c074.diff once and the Task2 correction-round report. Git confirms exactly two changed files: scripts/browser-contrast.mjs and scripts/browser-contrast.check.mjs. Review is limited to prior M1 and breakage introduced by this fix; original review remains the assessment of unchanged workflows. No separate notepad supplied.

At browser-contrast.mjs:54, the new paint function composites same-element backgroundColor over the ancestor first, then the image over that result. It is applied consistently to normal layers and pseudo overlays. This directly fixes the omitted same-layer paint that made white-on-white falsely report21:1. Varying-alpha stops now retain the full endpoint range, avoiding unpremultiplied interpolation when narrowing geometry. Composited premultiplied interpolants over a fixed background remain within these endpoint channel bounds. Uniform-alpha current gradients retain their existing local geometry behavior. Solid-color paths and optional overlay bounds remain equivalent. No new breakage identified in the bounded change.

Three behavioral regressions cover the original transparent-image false pass, a half-alpha image over its own white paint, and varying-alpha endpoint retention. They are meaningful independent fixtures: the same tests failed before the fix, and expected127.5 gray derives from compositing50% black onto white, not from the implementation under test. Fail-closed handling of white-on-white satisfies M1 without relaxing4.5.

## Findings by severity

- CRITICAL: none.
- HIGH: none.
- MEDIUM: none open. Prior M1 addressed by same-layer paint order plus regressions.
- LOW: none.

## Skill-perspective check

Consulted the remove-ai-slops and programming skills already loaded during initial review; applied their overfit and test-relevance criteria to the correction diff. No deletion-only, tautological, implementation-constant-only or brittle prompt test found. No production parsing/normalization, untyped escape hatch or needless abstraction introduced. The small paint helper shares the necessary CSS paint ordering between actual layers and pseudo overlays. No violation of either skill perspective identified in this fix.

## Evidence checked

Root: /Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/browser-contracts/m1

- contrast-m1-red.log: original4 pass/new3 fail, with missing-exception and incorrect-black-vs-gray failures matching M1.
- contrast-m1-green.log:7/7 pass.
- release-engineering-m1.log:59/59 pass.
- static-checks.json: all four recorded checks exit0.
- home/browser-report.json and owned-browser-report.json: clean exact6eb1c074 checkpoint,14/14 cells pass, zero errors, ownershipClosed true.
- Independently read the per-cell Home checks:56 actual recorded state ratios, minimum4.938449529801125; threshold remains4.5.
- Independently hashed all100 m1 inventory entries: zero missing/hash mismatches.
- inventory-reconciliation.json explicitly distinguishes prior370 copied-artifact manifest entries from390 broader inventory entries and names20 additional artifacts; no conflicting count claim remains.

No suites rerun because no unresolved functional doubt remained after source and regression/evidence inspection. No code edits, commits, pushes, production actions, or subagents. Only review artifacts written. ULW plan was absent in the initial review, so the required fallback report path is retained separately from the requested /tmp report.

## Separate gates

Approval closes this Task2 code-review blocker only. Combined hosted CI remains pending. Existing four P1/three P2 independent UI findings remain OPEN; no release or production approval is granted. The prior passing D and other E evidence is not represented as rerun at6eb1c074.
