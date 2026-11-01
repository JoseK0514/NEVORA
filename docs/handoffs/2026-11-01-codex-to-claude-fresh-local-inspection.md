# Fresh local inspection — Owner, Employee and Clocker

November 1, 2026. **Completed local inspection; application findings remain open.**

## Result

The requested October 12–18 Timecards view passed its populated-list, employee-detail, disclosure, close and period-persistence checks on phone and desktop in Chromium and WebKit. The focused run also passed Escape/focus return, approval-review safeguards and failed-read recovery. Clocker passed 42 checks. A new responsive defect was reproduced: **the Timecards Status column is clipped at 1024px and cannot be scrolled into view**. All seven earlier inspection findings recur.

**Recommendation: GO WITH CONDITIONS for this local inspection scope. No release certification.** Claude owns the UI corrections. This task changed no application code, existing tests, branch or deployment. No production data, real message, provider, model call, payment or actual tablet activation was used.

## Source, environment and authority

Jose explicitly requested another inspection using automated browsers and an isolated local copy after native computer use kept reporting a locked Mac and browser use remained disabled. This run follows that authorized alternative; it does not establish access to the protected hosted preview.

Origin was fetched before work. The latest fetched collab head was **`2c4431386308b58b2684fa21492ea0a57e9d0a68`**, dated November 1. A new detached worktree, `work/release1-local-recheck-20261101`, was created at that exact commit. The release branch was not changed. Today's fetched source is the same pin as the earlier November 1 inspection; these are newly executed tests and newly captured images, not reused results or proof of an unobserved later deployment.

The repository's owned-application helper copied and hashed committed application inputs, created a fresh loopback PostgreSQL database with fictional accounts/data, and started a derived Next development runtime. Its approved substitutions are the local database adapter and generated development type references. No application `.env` or existing database was reused. Delivery, provider and model configuration stayed disabled; browser requests to external origins were blocked. Local Clocker punching was enabled only inside the owned fictional environment for its existing test suite.

Target page reproduced locally: `/app/timecards?start=2026-10-12&end=2026-10-18`. The fixture contains three employees with four recorded hours and a 15-minute break each, plus other zero-entry cards. It is not a copy of the user's hosted records.

## Verification actually executed

All paths below are relative to the workspace evidence root `outputs/local-recheck-20261101/`. Full machine-readable accounting and source/custody hashes are in [summary.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/local-recheck-20261101/summary.json).

| Run | Actual result | Evidence and limits |
| --- | --- | --- |
| Owner/Employee route inspection | **180 route/role/engine records**, all route responses 200; **468 ordinary viewport captures**; no capture/record errors, no unsettled-loading records and no measured document-wide horizontal overflow. Process exit 0. | `portal-2/results.json`, `portal-2.log`. Owner phone: 36 routes; Owner desktop: 36; Employee phone: 16; published-pay fixture: two; each in Chromium/WebKit. Phone widths 320/390/coarse landscape 844; desktop 1024/1440. These are diagnostic records, **not 180 passed workflow tests**. |
| Historical Timecards interactions | **Four scenarios passed**, phone and desktop in each engine: exact period, populated employee sheet, four hours/15-minute break, Clock-ins and fixes disclosure, Done, reload and retained start/end query. | `portal-2/results.json` interactions and `*-historical-detail.png`. The initial desktop detail frame can be mid-transition; settled focused captures below supersede it for visual assessment. |
| Focused Timecards follow-up | Six engine/width records; **16 checks passed and two visibility checks failed**, both for the same 1024px clipping defect. No record/orchestration error. Process exit 0 reflects diagnostic completion, not all checks passing. | `timecards-focused/results.json`, `focused.log`. Widths 390/1024/1440 in Chromium/WebKit. Escape returned focus to the employee button in all six. The eight-person reviewed set excluded the current Owner; submit stayed disabled without confirmation. No approval/finalization command was submitted (`mutationRequests: []`). |
| Failed Timecards read and retry | In both engines at 390px, an injected local 503 cleared private card names; Try again restored the period/current cards. | `timecards-focused/*-390-read-error.png` and result checks. This is an isolated injected error, not evidence the hosted service is failing. |
| Clocker iPad suite | **42 checks passed**, process exit 0. | `clocker/clocker-ipad-results.json`, `clocker.log`. Setup/PIN inventory, portrait/landscape/enlarged controls, English/Spanish, privacy expiry, real owned punch/break transitions, exact-command retry, lost response, closed-tab recovery and read-only Owner handoff. Synthetic photo readiness/status cases do not test real cameras or photo collection. |
| Two Employee read boundaries | In each engine, operational authority returned only the employee's own identity/scope (200), while management Today returned 403; no tested peer-name disclosure. | `portal-2/results.json` permissions. Two endpoint samples, not a full authorization audit. |
| Independent fresh-image review | UI/UX analyst directly viewed **34 fresh captures** and checked source/result evidence. | [fresh-ux-review.md](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/local-recheck-20261101/fresh-ux-review.md). No implementation performed by the reviewer. |

## New finding — N1 / P2: Timecards Status is clipped at intermediate desktop width

Reproduction: fictional Owner, requested historical week, 1024 × 768 viewport, sidebar expanded, fixture including a long employee name. Both Chromium and WebKit reproduce it.

- Card/table container: **680px** wide, right edge **968px**.
- Chromium table: **742.73px**; Status column right edge **1030.73px**. WebKit table: **742.34px**, corresponding Status edge **1030.34px**.
- Container has `overflow-x: visible`; surrounding card has `overflow-x: clip`. Attempting to scroll the table container leaves `scrollLeft` at **0**. The missing text cannot be reached that way.
- At 1440px, card and table both measure 992px and the column fits. Document-level overflow checks remain clean at 1024px because the card clips its contents; those checks alone miss this defect.

Evidence: [1024px Chromium](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/local-recheck-20261101/timecards-focused/chromium-1024-table.png), [1024px WebKit](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/local-recheck-20261101/timecards-focused/webkit-1024-table.png), `timecards-focused/results.json`. Source: `src/components/timecards-corp.css`, particularly the clipped card/table container and column sizing; rendering in `src/components/timecards.tsx`.

**Required result:** at intermediate widths and with long names, Status stays readable. Claude can use the established responsive column treatment or deliberate, keyboard-accessible internal scrolling; preserve complete accessible names and the approved geometry at 1440px. Recheck 768/820/1024/1440 widths, recorded/break/status columns, long names, selection/review mode and the employee sheet. Keep approval rules unchanged.

## Seven existing findings reproduced

The IDs and severity come from the prior independent inspection; none is closed here.

| ID | Reproduced observation |
| --- | --- |
| A1 / P2 | Employee hub shows only November 11 for the fictional November 11–12 request. Repair the authorized date-range projection and displayed/accessibility summary, preserving stored dates. |
| B-01 / P2 | Owner Profile with enabled passkeys has invalid list composition; fresh axe `list` results recur in both engines on phone and desktop. |
| B-02 / P2 | Company timezone-help paragraph is directly inside a list; fresh `list` results recur in both engines/width groups. |
| B-03 / P2 | Features radio/list composition produces `listitem` violations in both engines/width groups. |
| B-04 / P2 | Copy Clocker link remains approximately 56.67 × 32px, below the agreed 44px phone hit area. This is a product-standard finding, not a claimed WCAG 24px failure. |
| A2 / P2 | Photo review still uses mixed alignment and disproportionate auxiliary actions compared with corporate settings. |
| A3 / P3 | Clocker tablet/setup cards still differ from neighboring phone settings gutters. |

Fresh main results contain **12 axe-violation records** representing the three semantic issues across two engines and two Owner layout groups. This is not a count of 12 distinct defects. No sampled Employee axe violation was reported; that does not certify all accessibility behavior.

## UX recommendations supported by the fresh inspection

- **Explain Timecards count scope before approval.** The fixture's summary says “Approve 8 ready” while the desktop tab says “Ready to approve 3.” Batch eligibility includes zero-entry cards, while the visible ready group emphasizes recorded-time cards. The focused review proves that all eight are placed in the reviewed set, with the current Owner excluded. This is a wording/review-context opportunity, not evidence of an incorrect eligibility rule. Make zero-hour selections and per-person recorded hours clear in the reviewed set; do not change eligibility policy to reconcile the text.
- **Keep the cleaner list and sheet.** The settled employee drawer is opaque and readable. Escape/Done and focus return worked in the sampled flows. An earlier translucent frame was captured before transition completion and is not an application defect.
- **Keep payroll/time meaning explicit.** The existing includes-breaks/non-payroll-hours explanation remains valuable. A disabled Finalize action could explain that approval comes first without adding another warning card.
- **Retain earlier bounded product priorities.** First-week operational readiness, Spanish Employee workflows, preserved return context and appropriate hours-budget/import/provider pilots still require separate scoping. These fresh tests do not implement or validate those future features.

## Runtime messages and unresolved scope

The main run retained **19 WebKit pageerrors**, and the focused run retained **two**, worded as access-control fetch failures during navigation among identity, notification, push-status and operational reads. No route capture or loading settlement failed. The current recordings lack full same-request cancellation traces, so **do not blanket-ignore these messages or call them confirmed application CORS defects**. Earlier evidence demonstrated one cancellation pattern; it does not classify every message in this run. Preserve raw events and correlate exact requests if they recur on the final candidate or while stationary.

There was no fresh physical iPhone/iPad, native Home Screen, OS permission, real passkey enrollment, real camera/photo, push delivery, provider import/payment or hosted-preview verification. Employee captures are phone/landscape layouts, not exhaustive 1440px Employee acceptance. Many forms were inspected without submitting them. Browser-emulated tablet dimensions are not physical-device acceptance. The actual Vercel alias's source identity remains unverified.

Preserve accepted scope: corporate light design; Lead held; tablet + PIN punches; Mobile Access off; Updates held; advisor work remains separate. Owned test fixtures can enable capabilities to exercise their views without authorizing those services in production.

## Harness attempts, integrity and cleanup

All failed attempts are retained:

1. `portal.log` / `portal/`: stopped during fixture seeding with `PAYROLL_DISABLED` because the caller's payroll fixture flag was omitted. No route records were counted. The fresh `portal-2` run added that **test-process** flag; application code was unchanged.
2. `timecards-followup.mjs` / `timecards-followup/`: geometry was measured, then an opacity wait queried an explicit role attribute instead of the native `<dialog>`, producing harness timeouts. The final record also lost its server when the main owned lifecycle ended. These are not sheet/approval/retry defect evidence.
3. `timecards-followup-2.log`: the corrected observer refused to attach to the already-closed server because its ownership guard worked. No successful inspection is claimed for that attempt.
4. `focused-owner-run.mjs` / `focused-runtime/` / `timecards-focused/`: created a new owned application/database, corrected the observer to the native open dialog, and completed the six focused scenarios. It supersedes the failed observer attempts for sheet, review and retry assessment; all earlier diagnostics remain preserved.

All **four owned application instances** (including the failed setup) closed with `sourceVerified: true` and `mirrorVerified: true`. Their application PIDs were checked absent. PostgreSQL wrapper logs record stopping newly created clusters. The isolated source checkout had no tracked or untracked changes before adding this handoff. Dependencies were reused locally; no subscription, service credentials or production settings changed.

External drivers and their hashes, raw JSON and custody records are in `outputs/local-recheck-20261101/summary.json`; main commands are preserved by the external runner scripts and run logs. Screenshots were freshly generated and retained without image editing. No assertions or application tests were weakened to obtain passing results.

**Next:** Claude corrects seven existing findings plus N1, supplies a new exact candidate with targeted before/after evidence, and receives independent closure. The count-scope recommendation remains separate product/UX work. Jose's device acceptance, exact frozen release SHA, CI and explicit production go remain mandatory. No commit, push, merge, deployment, migration or `main` movement was performed.
