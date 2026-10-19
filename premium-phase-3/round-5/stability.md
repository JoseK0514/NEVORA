**Not zero — 0 P0, 2 P1, 0 P2 newly verified.** Interim exit round 5 on `227150bb2658cb5a30db3c644b6b8f76031d3c79`. The earlier stability findings and complete matrix remain in progress. This is not a completed round or exit certificate.

## Status of earlier findings

P3-ST-02, -04 and -14 through -23 are not closed: their complete re-checks remain outstanding. Cloud **ST-P3-24** is the Availability control; local **P3-ST-24** is a distinct shared-placeholder finding. The Availability issue remains; new ST-P3-27 measures the separate Calendar control. Local P3-ST-26 is Manager Timecards and is a different ID, still pending re-check.

## Findings

| ID | Screen, role and width | Element | Measured defect | Crop | Likely cause | Specific fix | Severity |
|---|---|---|---|---|---|---|---|
| ST-P3-24 | Specific-week Availability, Employee and Lead, 320/200; Chromium and WebKit | `form.av-editor button[type=submit]` | Idle **248×132px** becomes **248×52px** while saving. Its top moves **469.52→549.52px**, an **80px** jump. Chromium document height and scroll decrease **80px**. WebKit reproduces the same button geometry; its document/scroll decrease 128px because other pending content also reflows. At 390/100 the button stays 52px high. | [Before](crops/chromium-AUDIT-E-availability-320-t200-before.png), [Chromium pending](crops/ST-P3-24-chromium-320-t200-pending.png), [WebKit pending](crops/ST-P3-24-webkit-320-t200-pending.png) | `src/components/availability-editor.tsx:74` replaces the wrapping idle label and icon with short “Saving…” text without preserving their dimensions. | Put idle and pending content in the **same grid cell**, keeping the inactive content invisible and `aria-hidden`; retain the maximum intrinsic width/height. Here the pending button must remain **248×132px**, with its top and scroll unchanged. Keep the existing 52px minimum at ordinary text size. | P1 |
| ST-P3-27 | Calendar subscription, Employee/Lead, 320/200; Chromium/WebKit | Create link → Saving… | Chromium changes **206×52→168×52px** (**38px** narrower). WebKit changes **216×88→184.52×52px** (**31.48px** narrower, **36px** shorter), so content below moves while the request is held. Both roles reproduce in both browsers. | [WebKit idle label after failure](crops/ST-P3-27-webkit-idle-label-after-failure.png), [pending](crops/ST-P3-27-webkit-pending.png); [Chromium pending](crops/ST-P3-27-chromium-pending.png) | `src/components/calendar-subscription-panel.tsx:25–26` swaps the idle and pending text directly without reserving both labels. | Put Create link/Replace link and Saving… in the same intrinsic grid cell with the inactive label hidden but in layout. Keep **206×52px** in the measured Chromium case and **216×88px** in WebKit, with **0px** width/height/scroll change; retain a **52px** minimum where a single line fits. | P1 |

## Checked and correct

- Both roles sent exactly **one intercepted POST** after two presses; it was aborted in the browser.
- Time off at 320/200 keeps its submit button **248×88px** while pending. Its failure outcome has a separate visibility issue, IS-P3-02.
- Source, before/pending/failure measurements and keyboard proof are in [submission evidence](submissions.json) and [causal proof](availability-causes.json).

- Calendar before/pending/failure geometry is retained in [calendar/withdrawal evidence](calendar-withdraw.json) and [Lead retry](calendar-retry.json). The failed-state crop shows the original idle label again; the initial before dimensions are in the JSON.

## Gaps

Other stability IDs, loading/refresh/paused states, large-data bands, motion and the remaining matrix are incomplete. No source code, CSS or tests were edited. Later coordinator fixes are not substituted for the exact handoff commit.

Large-data checker snapshot: [checks-large.json](checks-large.json), incomplete; standard snapshot is [checks.json](checks.json).
