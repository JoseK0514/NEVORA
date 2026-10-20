# Task 2 hosted follow-up: scoped spec and code review

- specStatus: PASS
- codeQualityStatus: WATCH
- binaryGate: PASS (scoped implementation review only)
- recommendation: APPROVE
- blockers: [] for this scoped implementation
- review range: `91f68893..293ffcf6304ea258697a4614d46a59fa3c626cc1`
- implementation checkpoint: `b4176f8796c2527999ae418da56f3bdcd0300435`
- reportPath: `/tmp/nevora-verify-33-browser-followup-review.md`
- role-required fallback copy: `.omo/evidence/task-2-hosted-followup-code-review.md`

This is not release, merge, production, or full hosted CI approval. Full final-candidate D2 and all 70 Phase E browser cells remain mandatory. The seven independent Manager/Owner findings remain open; this review does not close or accept them.

## Scope and inputs

Reviewed the supplied extended-context net diff (13 files), original and follow-up Task 2 briefs, follow-up report, verification plan/global constraints, clean-manager handoff, package scripts, and SDD progress/notepad at `.superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/progress.md`. The SDD follow-up report and durable `docs/product/specs/codex-joint/CLEAN-MANAGER-BROWSER-HOSTED-FOLLOWUP-2026-10-20.md` are byte-identical.

The application delta is two report-wrapper `tabIndex={0}` additions and a narrowly scoped correction-form select appearance/caret rule. The other executable changes adapt browser selectors/native disclosure readiness or add Phase E macro-budget/progress diagnostics. No business/API, schema, permission, receipt, payroll/legal wording, notification, CI suite-selection, or release-hold change appears in this diff.

Read-only review: no source/index/HEAD changes, pushes, DB queries, application runtimes, or broad suite reruns were performed. Task 4's concurrent documentation work was excluded. The only writes are these review artifacts. `omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING`; hence the fallback artifact location.

## Findings by severity

### CRITICAL

None found.

### HIGH

None found.

### MEDIUM

**Retained UI limitation, not a blocker to this bounded fix:** correction select's closed selected label still clips at 200% text scale. Related rule: `src/app/app/portal-premium.css:2138`. Evidence `select-focused-r6/report.json`, `selectFocus` and `selectLimitations`, records both engines: at 320px, text 282.21px versus 132px available; at 768px, 265.61px versus 260px. I inspected `select-focused-r6/webkit-select-320-text-2.png`: the field and caret remain visible, but the closed text is visibly cut off. The report accurately retains this limitation. Normal-size text fits; native option value/typeahead remains verified. This must not be described as a zero-clipping or 200% readability pass. Further design remediation or acceptance belongs to the subsequent UI/release decision, not this selector-and-sizing follow-up.

### LOW

**Evidence reproducibility limit, disclosed:** some exploratory ignored helper revisions were not retained. Their failure outputs support diagnostic history, not reproducible independent successful verification. Successful final focused harness sources and commands are retained. Do not elevate those exploratory attempts into pass receipts. No implementation change is required for this scoped approval.

## Required skill-perspective review

Loaded `remove-ai-slops/SKILL.md` and `programming/SKILL.md` from `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/`, plus the programming TypeScript reference. Consulted Superpowers SDD and repository executive/CTO review instructions. Applied these as review perspectives within the expressly bounded read-only task.

The overfit/slop pass found no deletion-only, removal-presence, prompt-prose, tautological, or useless added tests in this scope. The report attribute regression checks emitted accessible DOM contracts for a reproduced focusability defect and has retained RED evidence; it is complemented by real native traversal and axe checks. The timeout test exercises mode/suite selection and the unchanged CI ceiling; its numeric expectations are the authorized operational budget contract, not incidental implementation constants. The progress test verifies bounded output and omission of arbitrary URL/actor payloads, including invalid identifier/event cases.

No new untyped TypeScript escape hatch, business-layer parser/normalizer, or speculative application abstraction was introduced. The small Phase E functions expose actual timeout policy and the diagnostics serialization boundary. Browser geometry/paint measurements are required evidence, not extra application data extraction. Existing large modules and existing harness style were not used to demand unrelated refactoring. The animation-promise cancellation catches do not turn an interaction into success: actual native focus, Enter effects, command counts and accessibility assertions still determine success. Neither skill perspective identifies a blocking violation in this diff.

## Spec, correctness, and security assessment

- Reports preserve exact four accessible region names, headers, known 8h values, complete fictional long names, content visibility/unclipped assertions for nonoverflowing cells, page-overflow checks, visible focus, native forward/reverse traversal, exit/no-trap, and axe scrollable-region-focusable checks. All actual overflowing regions must be natively reached and scroll both directions. The new nonoverflowing-content branch is an appropriate adaptation to responsive layout rather than deleting the scrolling contract. Both engines and all seven widths remain.
- The report app fix creates real focus targets in the two wrapper definitions (`src/components/reports.tsx:123`, `:203`). Tests do not inject tabindex, force a click, disable motion, or substitute synthetic activation.
- Account/recovery selector changes keep command identity, exactly-once persisted request counts, stale-authority 401/403 rejection, late-reply/private clearing, session/account/role changes, immutable/supersession history and Manager independence. Native retry now proves focused/enabled state before Enter and POST count 1→2 afterward. No receipt assertion or assertion timeout was weakened.
- UI-remediation readiness uses actual style/layout settlement, two rendering frames and finite animation completion. It does not change application animation. The observed WebKit pre-state was open=true with hidden content, 0px block size and no yet-materialized animations; post-state was visible/272px and a natively focused enabled button. Both pages reported document focus before foreground changes, so foreground loss alone is not an established cause.
- Clocker adapts current labels and compares native focus with the exact accessible-name control rather than bilingual descendant text. Full PIN/retry/race/isolation/history checks remain. Actual paint assertions retain contrast ≥4.5, outline ≥2px and opacity 1, and now require solid paint. Retained values are 5.531365207934279, 3px and 1 in both engines.
- The select rule is restricted to `.employee-time-correction-form select`, using the established Safari remedy. Native select/options/value/disabled/focus semantics and wording are unchanged. Final evidence records 48px at normal text and 96px at enlarged text, a present caret, real tap plus native `r` typeahead, and the explicit clipping limitation above. Programmatic restoration is only for the label screenshot, not proof of native selection.
- Phase E all-browser budget is 45 minutes, single-suite remains 30 minutes, SQL remains 8 minutes; the workflow ceiling remains 50 minutes. The diff preserves 15-second assertions, complete matrix verification, ownership/source guards and teardown. Progress is a bounded identifier/timestamp/count allowlist, with no URL, actor, payload or error stack. A cell becomes passed only after context close and fixture/source verification. Overall errors still fail the aggregate. No local result here proves that final hosted execution fits the budget.

## Independently checked evidence

Evidence root: `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/browser-contracts/hosted-followup`.

- Recomputed SHA-256 and byte sizes for all **1,190 inventory entries**: zero mismatches. Physical files: **1,191**; only `inventory.json` is self-excluded.
- Recomputed all **156 source-index hashes/sizes**: zero mismatches.
- Read the original `/tmp/<run>/<scope>/ownership.json` and source manifest for all **33 custody entries**, not only the summary. All closed/sourceVerified/mirrorVerified fields were true and all 33 manifest hashes matched the retained summary.
- `remediation-r4/account/report.json`: 14 actual PASS results; missing report: 6 PASS. Account console errors are recorded failed-network/401/403 cases, not an empty-console claim; runtime errors are empty. Whole remediation r4 is not certified green.
- `reports-r5/report.json`: 28 checks, zero errors, 14 accessibility records and 56 geometry records. All 14 native paths reached [0,1,2,3]. At 1024px both engines overflow regions [0,1] and retain left/right keyboard receipts.
- `clocker-r3/report.json`: 90 checks, zero errors, both paint records.
- `d2-r6/report.json`: 224 checks and an explicit native-trigger-focus failure. Twelve retry receipts have foreground/button focus/enabled true and POST 1→2. This is a nonzero prefix result.
- `ui-focused-r2/report.json`: 130 checks, zero errors, both full affected helpers. Verified the WebKit render-readiness receipts, native datetime Tab with 2px outline, Manager focus and two Enter declines. Its retained harness calls the complete `verifyD2UiRemediation` for both engines.
- `select-focused-r6/report.json`: 26 checks, zero errors, eight native selection/paint cells and four clipping limitations. Inspected the focused source to distinguish native typeahead from later programmatic screenshot restoration.
- `focused-checks/reports-focus-red.log`: 48 passed/1 failed for missing tabindex. Final log: 49 passed. `release-engineering-final.log`: 61 passed/0 failed/0 skipped.

These counts overlap and are at different exact checkpoints; they must not be summed or presented as a whole D2 or final-candidate hosted pass. Hash verification establishes retained artifact integrity, not an independent rerun. No new tests were run because inspection identified no named behavioral doubt requiring a targeted execution and this assignment excludes runtime/broad-suite reruns.

## Handoff

Approve the bounded implementation for the controller's next gate. Controller owns combined validation/build and final hosted full D2/all-70 Phase E execution at the final candidate. Preserve the select text limitation, existing independent findings, physical-device/screen-reader gaps, and release/production authorization boundaries. No additional local whole-chain rerun is requested merely because hosted CI is pending.
