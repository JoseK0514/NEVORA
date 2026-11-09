# New Claude UI merged into development

Date: 2026-10-20. Owner: Codex (integration), Claude (UI source).
Authorization: Jose requested the new UI merge into development. Production authorization was not requested or inferred.

## Source identity

- Development parent: `d5e6e6f34f2754d4d79d6c1129eba14520f32504`.
- Claude UI source: `e9f2229a60a2c8332b37ba2c2c16546c707d64a6` (`claude/release-integration`).
- Merge commit: `8e2a8e7ab9c968db74c56431d6075e8fd0fb3ad3`; both parents remain ancestors.
- Verified application source: `b5ec32241ecc59494e608fa5e55a6c0510ae7af6`, adding the browser-discovered sheet focus fix. The later handoff commit changes documentation only.
- Integration checkout: `/Users/josek0514/.codex/worktrees/ui-development-20261020/Fuel Scheduler`, branch `codex/ui-development-20261020`.
- Separate compliance source `d0b6d1f5` is not an ancestor of this candidate and was not integrated. Main was verified at `7ffd013e39a9763a0655aa092b159dea4cbbfb50`.

## Merge decisions and resulting behavior

Nine conflicts were resolved across Schedule, Reports, Timecards, payroll settings, the shell and navigation tests. Incoming clean Manager/Owner pages, Employee/Lead presentation, Profile, Settings/auth/Clocker styles and desktop layouts are retained.

- Schedule keeps development's location-scoped DTO path. Company-only reads and Reports/manager Timecards remain inside current Company authorization and `ScopedReadFrame`.
- Team tools require Owner or current Company-scoped Manager authority. Add shift requires an authorized Schedule entry. Location-only and unassigned Managers do not receive Company-wide shortcuts or Finder/Today metadata.
- Timecards retains exact source/revision checks, finite private lifetimes, early refresh, single-flight commands and original unknown-command retry. The new detail sheet and failed-read recovery remain available.
- Native payroll branches, capabilities, preference revisions and configuration behavior remain. The company save action adopts the new in-card placement.
- Real browser approval found a missing focus return when refresh removed the sheet's original row. Escape/Done now query a current visible row or use the stable period chooser. Automatic blur/expiry retirement does not explicitly move focus. Five regression scenarios failed before the fix; all eight new focus scenarios pass afterward.

There are no changes versus development to API routes, Company Access services, payroll services, migrations, packages/lockfile, CI workflows or deployment configuration.

## Verification

All results below are local evidence, not independent certification or production verification.

- Clean `npm ci`: exit 0.
- Final `npm run typecheck`: exit 0.
- Final repository-wide `npm run lint`: exit 0, no diagnostics.
- Final `npm test -- --maxWorkers=1`: exit 0; 508 files passed, 8,849 tests passed, zero failed. 27 files / 801 tests remain prerequisite-skipped, with 55 existing pending assertions; these are not acceptance evidence.
- Final `npm run test:dev:production`: exit 0; production build passed and all development markers absent from 2,541 scanned artifacts.
- Focused conflict suites: shell/navigation 96 tests, Schedule/Reports 93 tests, Timecards/payroll 99 tests. Focus follow-up: 64 tests including eight new scenarios. Focused lint and whitespace checks pass.
- Read-only merge review: no correctness blocker in designated conflict boundaries. Advisories remain for the large Timecards component and the incoming deletion-only shell test. Actual replacement request navigation is verified by the browser checks below. Follow-up focus review: CLEAR / APPROVE, no blockers.

- Owned PostgreSQL/browser runs at the verified application SHA: 107 checks, 75 page captures and 80 PNGs across Chromium and WebKit; zero browser runtime errors. Both source/mirror custody checks passed and both owned clusters stopped.
- Chromium covers Owner, Company Manager, location-only Manager, unassigned Manager, Employee and Lead at 320/1440px. WebKit covers Company Manager and Employee at 320px. Both cover Clocker setup at 320/1024px. These are emulated viewports, not physical devices.
- Real hashed-account sign-in, current navigation, keyboard focus, no document overflow, native timecard approval against revision/source hash, modal focus restoration, failed-read recovery, blur clearing, scope denials, private Profile and a 200% root-text Insights check were exercised. Clocker evidence covers setup/shell rendering; it does not certify enabled PIN/punch workflows.
- Request pages were followed through Time off, Shift requests and Availability, including current-page URL semantics. WebKit uses Option-Tab for full link navigation per [Apple's keyboard shortcut documentation](https://help.apple.com/safari/mac/8.0/en.lproj/cpsh003.html).
- Earlier failed runs are retained: the real focus defect; a selector that failed on CSS separator text; a WebKit Tab assumption; and an initial forced reload that interrupted login's bootstrap reads. Final engine-specific runs use settled login and report no runtime errors. No failure was hidden or test expectation weakened.

## Evidence locations

Durable raw logs, the browser runner and review reports:
`/Users/josek0514/.codex/visualizations/2026/10/20/01a158ce-f75b-7f20-b4ef-879a40e11945/ui-development-merge-final-evidence`.

Successful browser receipts, source manifests and PNGs:
- `/Users/josek0514/.codex/visualizations/2026/10/20/01a158ce-f75b-7f20-b4ef-879a40e11945/ui-development-merge-chromium-verified`
- `/Users/josek0514/.codex/visualizations/2026/10/20/01a158ce-f75b-7f20-b4ef-879a40e11945/ui-development-merge-webkit-verified-r2`

Focused worker reports and red/green receipts remain under this integration checkout's `.omo/evidence/ui-development-schedule-reports/`, `.omo/evidence/ui-development-payroll-merge/` and `.omo/evidence/timecards-sheet-focus/`.

The owned runtime substitutes only local PostgreSQL transport and generated development type references. It starts a new marked disposable database, uses fictional records, disables sending/telemetry and blocks external browser requests. This is not a hosted migration or full SQL-suite acceptance.

## Director positions and next gate

Engineering: preserve development's backend while adopting the pinned Claude UI; focused code review approves the resolved boundaries and focus follow-up.
Security: current authority, private-response lifetime and native capability boundaries retained; no exception requested.
Product/program: this completes the bounded UI integration. Full role/page/state acceptance, retained large-text/device findings and release preparation remain separate Jira work.
Governance/release: development integration only. Existing `vercel.json` still disables Git deployment. No main merge, hosted data mutation, provider activation, bank submission or production deployment occurred.

Before this merge, development CI run [39409730347](https://github.com/JoseK0514/NEVORA/actions/runs/39409730347) failed at `d5e6e6f3`. Its missing server-only integration resolution, worker startup and communications-authority failures are tracked in SCRUM-77 through SCRUM-80. Local worker-startup tests passed here; that does not close the Linux CI finding. The new pushed candidate still needs its own CI results.

Incoming UI handoff backend requests (availability-deadline navigation, approved time-off schedule data and measured performance follow-up) retain their original status; this merge does not claim them implemented. Separate compliance integration and production migrations, independent QA, physical-device acceptance and Jose's production decision remain open. No Jose decision is required for this already-authorized development merge.

After the push, verify the remote development SHA and fast-forward the clean primary development checkout. Preserve both older attached worktrees and untracked evidence. SCRUM-70 records the completed integration; SCRUM-71/72/73 and the release gates remain open.

