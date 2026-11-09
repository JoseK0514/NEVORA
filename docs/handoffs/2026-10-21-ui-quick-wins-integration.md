# Claude handoff and UI quick wins integration

Jose approved integrating the handoff and verified quick wins into development, followed by a build. Base: `f27216dfff8f210ab92747ce47c8dd15a4cce11c`. Tested/built code candidate: `c9a58c333116e7e7b986de8d50b5df6af9d40724` (tree `cada58a8e5ea1d738e5d38c3bbed1e523e39b974`). Later publication changes are documentation only. This is development integration under the existing production hold.

## Integrated scope

- `claude/codex-handoff-20261021` at `0c365e5a`: Claude report, gap reviews and the UI design record. Historical inspection claims remain dated source material, not newly certified defects or release acceptance.
- `claude/upscale-quick-wins` at `56334f0b`: Manager/Owner status ladder, Home timeline/payday row, search synonyms, Insights periods, folded Timecards/drawer links, Inbox contacts and Owner-only notices.
- All 31 files in `claude/clean-manager-docs` at `44a8b751` are byte-identical in the handoff. Its branch remains a reference; another merge is unnecessary.
- `claude/business-foundations` and `claude/bold-joliot-ec227c` remain held. The latter also changes a Clocker component. The My pay redesign stays held; its current page and payroll presentation/calculation are unchanged.

Three merge conflicts were reconciled while retaining development's correction-recovery boundary, distinct Inbox pane/sheet heading IDs and Add shift date behavior. No auth service, Company Access service, database migration, locked dependency or production configuration changed.

Review found and resolved two timeline defects: unscheduled-only days now show the timeline, and an open punch attaches to one unfinished shift at its actual location. Three regression cases failed before the fix and pass afterward. Contact details preserve the directory's authority and finite observation, and the entire contact-bearing detail uses the existing ScopedReadFrame. Phone facts and Call/Text retire together on expiry/blur; the surrounding Inbox recovery remains mounted. Four server-composition regressions failed before this fix and pass afterward. Read-only engineering review approves the application changes at `5aac2897`; subsequent source changes are confined to the browser driver.

The employee snapshot remains an exact markup check. Its only explicit baseline reconciliation adds the three Signature wrapper attributes already in development (light/deep/sheet), plus a final newline; no application employee rendering code or assertion was weakened, and no snapshot auto-update was used.

## Verification obtained

See the committed [evidence receipt](evidence/2026-10-21-ui-quick-wins.json).

| Check actually run | Result |
| --- | --- |
| Full unit suite after the contact fix | 9,306 passed; 801 existing skips; 544 passing files and 27 skipped files |
| Root TypeScript and ESLint | Passed |
| Source inventory | 49 classified heads pass; 6 drift-check regressions pass |
| Owned Chromium/WebKit browser regression | 49 scenario records passed; zero runtime errors; Owner/Manager at 320/390/768/1440 |
| Optimized production compilation | `npm run build` exit 0 on c9a58c33; all 1,812 captured application inputs unchanged |
| Browser/build/current source comparison | All 1,812 input hashes match |

Browser checks cover unscheduled Home, folded Timecards keyboard focus and cross-page drawer navigation, responsive Insights period controls/empty previous period, Inbox, Add shift, search synonyms/dismissal and actual Settings deep links. A controlled Today response forces the contact case while directory SQL, login/session and authority remain real. It verifies expired contacts remain hidden even after Inbox rows are refreshed, and that expiry/blur require fresh authority plus a fresh page before contacts return. This is fixture browser evidence, not hosted transport or physical-device acceptance.

Earlier browser attempts remain recorded as failures: fixture omissions, a same-document hash test corrected to the actual cross-page workflow, desktop/mobile period-control selection, and WebKit provisional navigation fetch failures. The final driver retires private readers before full-document navigation; all runtime errors remain fatal. An expired Inbox read uses its existing Try again control during recovery; this integration does not change its polling policy. Every attempt closed its owned runtime and verified source/mirror custody; known Next PIDs are absent and each parent PostgreSQL runner reported successful stop.

The incoming-history Gitleaks scan returned four generic-api-key matches. Each is exactly an archived markup key generated from a guest tag, device and route. Raw findings and the exact equality checks are retained; no ignore rule or release control was added or relaxed.

Raw receipts, failed attempts, screenshots and the build remain under:

`/Users/josek0514/.codex/visualizations/2026/10/17/01a14a91-6077-78e0-9d01-5b454d2b8590/ui-quick-wins-20261021`

The full unit run started at b1a00437. Only the excluded browser driver changed afterward; application logic and executed unit inputs are unchanged. The passing browser run and build bind c9a58c33 exactly. The receipt does not relabel these runs as execution on a later documentation commit.

## Release and ownership

Engineering/product: integrate the bounded UI and its design record, retaining existing semantics and private recovery. Security: contacts obey existing company scope and observation lifetime. Governance: development integration is acceptable; release impact remains CONDITION under the existing hold. No policy exception or production approval is inferred.

Owner: Codex integration executor. Next release work resumes the open checks in [the development assembly handoff](2026-10-21-development-assembly.md): SQL classification, two older browser drivers, final-candidate restore/hosted checks, CI capacity and independent/device acceptance. The Actions budget remains unchanged. This task does not deploy, run hosted migrations, schedule production workers, contact customers or close independent findings.
