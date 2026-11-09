# UI-010 / UI-011 whole-branch code review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: []

Review date: 2026-10-12 America/Puerto_Rico. This is a fresh read-only code review of `ui-native-payroll`, branch `codex/nevora-native-payroll-ui-20261012`, exact range `2360b6012432d776460e7067a32ca06905374f8f..5bf85503ebb792877d41208465bcd98e16775d9a`. HEAD matched and the application checkout was clean before and after review. No application files were modified. The optional `omo-agent-toolkit ulw-loop status --json` command was unavailable (`command not found`); no ULW plan was found in the inspected evidence directories, so this report uses the requested fallback location.

## Goal and scope

Review bounded source-aware native payroll review/actions and private statement history against frozen Finance `420daae98ce039cbade7ca2641a141c580243ee8`. Success means native true decoding, null blocked monetary states, readable saved breakdowns, correct source-specific actions, opaque revision/token retention, exact retries, receipt recovery, current-access privacy, protected inline/attachment routes and original correction history. Existing UI017 and the earlier preview remain outside this increment.

Read the repository AGENTS.md, package scripts, `docs/execution/ui-010-011-native-payroll-ui.md`, and the notepad/ledger `.superpowers/sdd/ui-010-011-native-payroll-ui/progress.md`. Inspected the actual whole-range Git diff and affected component/test files, plus relevant frozen backend contracts/preparation/service behavior. The supplied full diff is `native-ui-evidence/whole-branch-review.diff` relative to the task root. Changes comprise 17 files: the execution plan; payroll-workflow.css; api.ts/api.test.ts; my-pay.tsx; native-review.tsx/native-review.test.tsx; native-settings.test.tsx; native-ui-fixture.test-support.ts; payroll-runs.tsx; payroll-settings.tsx; payroll-ui.tsx; portal-statements.tsx; use-payroll.ts; workflow-status.ts/workflow-status.test.ts.

## Findings by severity

### CRITICAL / Critical

None found.

### HIGH / Important

None found. No demonstrated correctness, authorization, revision/retry, or historical-document regression requiring changes before bounded code approval.

### MEDIUM

None found. New boundary validation is relevant to an unknown HTTP response and does not introduce client payroll calculations or unnecessary normalization. The import row count bound also matches the native preparation population bound; it is not an accidental restriction on a larger native population.

### LOW / Minor — optional maintainability suggestion

`src/components/payroll/payroll-runs.tsx:99` searches `nativeCalculation.employees` twice for the same employee and uses a non-null assertion on the second result. Bind the result once in the row-render callback and render through that narrowed value. The current array is stable within this render, so this is not a demonstrated runtime defect or approval blocker. It is a small duplication and type-discipline violation under the programming perspective. Do not expand this into a broad component refactor merely for this review.

## Skill-perspective review

Loaded and consulted both `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md` and `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/programming/SKILL.md`, including the TypeScript README. This was a review pass, not authorization to execute their cleanup/refactoring workflows.

The production/test overfit pass found no deletion-only tests, prompt-text tests, tautological expected values, or newly unnecessary parsing outside a trust boundary. Static render tests substitute the HTTP/lifecycle hook seam and inspect user-visible source, amount, history and privacy states; they are not treated as proof of interactive operations. Assertions on rendered UI labels and recovery messages exercise presentation behavior, rather than pinning agent prompts or deleted implementation text. Interactive claims have separate browser evidence. The small repeated lookup/non-null assertion above violates the programming preference for narrowing and the slop preference against needless duplication, but does not justify HIGH severity. Existing type-assertion-based response decoding remains a limitation: the client guards are presentation-boundary checks, not a second financial or authorization authority. No request to add new dependencies or replace the established validation architecture is warranted here.

## Verification actually performed

- Independently ran `npm test -- src/components/payroll --maxWorkers=2`: 8 files, 119 tests passed, 2.39 seconds. No browser or database suite was rerun.
- Independently ran `git diff --check 2360b6012432d776460e7067a32ca06905374f8f..HEAD`: clean.
- Read `native-ui-evidence/frozen-contract/UI_CORE_READY_CONTRACT.md` and `HANDOFF.md` and compared consumed structures with the actual contracts and native preparation code.
- Independently recomputed every protected-file SHA-256 listed in `native-ui-evidence/final-source-custody.json`: zero mismatches. The actual changed-file list contains no Finance backend/types/migrations/package/calculation/publication/authorization changes.
- Independently recomputed both final report hashes from `native-ui-evidence/browser-freeze.json`: both match. Inspected `browser-chromium-final-02/report.json` and `browser-webkit-final-02/report.json`: each records 43 passed checks, zero reported errors, source/mirror verification and PostgreSQL cleanup. Each directory contains 39 screenshots. This is artifact inspection, not independent visual acceptance of all screenshots.
- Independently recomputed the current `native-ui-browser.mjs` harness hash: `5fd36218de784686cc98fe22666c06e4c8d1719ba4371ad0578a54e411426555`, matching both reports. Inspected its actual assertions for hidden settings preservation, interrupted exact-body retry, stale no-ledger approval, separate generation/publication, correction navigation/history, stored PDF identity, scoped denial, privacy clearing, keyboard, width and axe checks.
- Independently compared all 1,376 entries in each browser source manifest against the current checkout: zero mismatches. The owned runtime explicitly substitutes `src/lib/db.ts` for its isolated database adapter; this is disclosed fixture infrastructure, not production database verification.
- Inspected `FULL-unit-frozen.log`: 428 passed files, 27 skipped files, 7,906 passed tests, 801 skipped, 8,762 total. The remaining 55 are held/not represented as passed. Inspected `TASK3-frozen-source.log`: 158 passed. Inspected `TYPECHECK-frozen.log` and `LINT-frozen.log`; these logs contain no diagnostic failures but the minimal text alone is not an independent exit-code record. Typecheck/lint/full-suite were not rerun by this reviewer.

## Assessment and limits

Native source authority controls recalculation/correction and suppresses provider imports/payment commands. Historical provider workflows remain separately available. Blocked states preserve unavailable money; ready results are displayed without computing money. Approval sends the saved token/revision; retries retain the original command object and operation reference. The receipt addition supports selection of the separately created correction, while refresh failures preserve confirmation without retaining monetary views. Own and portal history use shared same-origin document destinations and current resource loading/error states. Hidden native legacy settings values are retained when saving preferences.

This APPROVE applies only to code quality of this frozen bounded UI candidate. It does not certify release readiness, close independent UI/QA findings, or approve a push, merge, deployment, migration or native activation. Declined to judge: UI016/profile authoring from later READY899; employer/YTD counter correctness; legal workweek/default/notice and daily-boundary invariance; statutory calculations and independent activation; conditional fixture facts as real customer facts; live payment/remittance/notices; physical-device behavior, manual screen readers, 200% zoom, production credentials/data and production deployment. Browser reports are inspected evidence rather than a replacement for independent UI/QA acceptance. The earlier failed/held attempts remain part of the evidence history and were not rewritten or suppressed.

No mandatory user action or code fix is required by this review. Preserve the independent acceptance and activation gates already recorded by the owning review functions.
