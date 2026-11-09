# Clocker filter completion repair

## State and scope

PR30 targets development. Source `725ab6c83256d6ce3aea41eefa6d8dc5a96d68a8` completed [cloud run40112046593](https://github.com/JoseK0514/NEVORA/actions/runs/40112046593) with ten of twelve jobs passing. Validate, all three SQL jobs, all five Phase E browser jobs and their aggregate passed. Attendance failed after87 Clocker checks at WebKit reactivation: the old filter still contained one row when the driver expected zero. Final evidence failed because Attendance failed. This is not release acceptance.

The same run's raw whole Phase D report has207 checks and zero errors, remediation28 and zero errors, and D2 282 and zero errors. Both actual-role-redirect cases pass with employee-shell, private-source absence and cleanup evidence. The previous navigation correction is retained.

Jose authorized this CI repair while preserving Claude's design. This follow-up changes only browser drivers, controls, the existing CI step and documentation. No application, stylesheet, asset, wording, schema or hosted configuration changes.

## Cause and correction

`ClockerBreakTypes` queues `setTypes` and synchronously closes its native dialog. Dialog closure can precede React's filtered-row commit. The old `archiveBreak` driver used closure as completion and immediately counted rows.

The unchanged driver was extracted into `scripts/clocker-break-editor.mjs` and exercised against the actual component, actual form stylesheet and real React MessageChannel scheduler. With scheduler delivery held after the fictional action returns, the dialog closes while the row remains. At `2c0380e041722457b5a554a03e958303f58e5979`, both WebKit operations reproduce the original `1 !== 0` assertion. Chromium had not reached the count at that observation boundary and passed. This establishes the gap and matching mechanism; it does not reconstruct historical cloud scheduler timing.

The driver now waits for that exact row to detach, with a15-second maximum, and retains the original zero-row assertion. No sleep, retry, error exemption or longer scenario deadline. Existing authorization, version, persistence and Clocker cases remain intact.

Six controls run before the unchanged authenticated Clocker command in the existing Attendance step. Their receipt uses the existing artifact upload. A release-contract test guards both commands, exact SHA/environment binding, fatal failures and receipt retention. There are still twelve mandatory jobs and seventy Phase E browser cells.

## Evidence actually obtained

Implementation checkpoint: `75854ec76376f1bc581a8f1f81cc0758c284d2fb`. Later additions are the CI contract guard and documentation; exercised component, driver, fixture and workflow bytes are unchanged.

- Six native controls pass: archive, reactivate, and a permanently held commit in each engine. The negative cases require TimeoutError after a200ms test-only removal limit; they completed in379/407ms including setup. Closing a dialog without committing the row still fails. Positives verify full versioned payload, one action, target row in its new filter, unrelated row preserved, zero external requests and zero runtime errors.
- Authenticated Next/PostgreSQL Owner flow passes all four operations, with old-filter removal, new-filter presence and exactly one persisted revision each. Chromium151.0.7922.34, WebKit26.5, Playwright1.62.1, PostgreSQL16.15. Final receipt: zero runtime errors/external requests, unchanged source, verified source/mirror, browser/app/owned cluster closed.
- Existing shared-scheduler Attention intent and SSR lifecycle controls pass in both engines.
- Release-engineering:159 passed, zero failed/skipped/cancelled. Break-type units:21 passed. TypeScript, targeted ESLint and diff checks pass. Fresh source gate:57 classified sources, six active branches, exact archives/development ancestry verified; eleven inventory contracts pass.

Private evidence root: `/Users/josek0514/.codex/quiet-ui-pr30-evidence-20261023/`. Receipts: `clocker-filter-red-styled/`, `clocker-filter-green/`, `clocker-shared-scheduler-green/`, `clocker-filter-owned-app-idle-boundaries/`, `clocker-fix-release-engineering-final.log`. Earlier fixture setup failures remain under `clocker-filter-red/` and `clocker-filter-diagnostic/`. The first authenticated collector remains under `clocker-filter-owned-app/`: all four operations passed, but immediate navigation interrupted pending management reads and the collector failed. The final run waits for those reads before navigation/closure, retaining all errors as fatal. No repository classifier changed.

## Ownership and next gate

Engineering recommends this bounded test correction. Technical assurance is the failing-before/passing-after actual-component control plus persisted real-app behavior. Governance permits publication with conditions: full matching cloud acceptance remains required, including remaining Clocker checks and final evidence. This is not independent certification or production authorization.

Codex owns one combined publication through existing PR30/`codex/premium-backend`. Review all twelve matching cloud jobs and raw receipts before development integration, then verify development-push CI before the approved DEV Preview procedure. Claude's exact `a5470f79` lineage remains recoverable through `archive/branches/2026-10-24/claude/role-nav-webkit`. Main, production, hosted databases and real notifications remain untouched. No additional Jose decision is required for this authorized cloud submission.
