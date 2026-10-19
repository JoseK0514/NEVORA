# Wave B round4 — Type, colour and copy

**Verdict: not zero.** One measured P2 (TC-B-32),0 P0/0 P1 in this partial checkpoint. Other open IDs are unclosed until manual recheck; the full exit round is incomplete.

Source `9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7`, detached read-only worktree. Fictional owned PostgreSQL/Next development preview; DB adapter, bounded transport pool 12 and generated type imports are recorded in [source-manifest.json](source-manifest.json). No application edits, Claude-branch mutations or browser submissions reached a server. Bootstrap used the owned fixture executor; credentials remain outside reports.

The unchanged checker (`e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d`) completed **45/48** cells: Owner, six base routes (all except Update detail), 320/390, 100/200%, Chromium/WebKit. Raw evidence: [checks-smoke.json](checks-smoke.json), [checks-smoke.log](checks-smoke.log). No axe pass yet. The coordinator then paused browser work for uncontended candidate gates. **This is incomplete exit evidence and never a zero certification.**

## Status of earlier findings

| ID | Status |
|---|---|
| TC-B-01 | Additional soft hyphens exist in ACK_WORD;320/200% receipt/help measurement pending. |
| TC-B-02 | Glance container threshold21rem exists; child clipping judgment pending. |
| TC-B-16 | Compose offline/ended-session wording updated. Update detail still folds401/403 and says “Your session may have ended”; reproduction pending, not newly counted. |
| TC-B-27 | Source totals/amount-line wrapping added; money/label geometry pending. |
| TC-B-28 | Source now says “Couldn’t save that template.” Query-state measurement pending. |
| TC-B-29 | Source unavailable/automatic labels unified; ready-state comparison pending. |
| TC-B-30 | Duplicate Clock-in notes empty text removed in source; ready-state judgment pending. |
| TC-B-31 | Reload copy now admits entries may be missing. Failure-state measurement pending; no closure from source alone. |

## New findings

| ID | Screen, role and width | Element | Measured issue | Screenshot crop | Cause | Smallest specific fix | Severity |
|---|---|---|---|---|---|---|---|
| TC-B-32 | Payroll runs; Owner QAOWNER; Chromium390/100%, WebKit320/100% | `.pw-document strong`; `.pw-secondary-actions > summary`; `.pw-job strong` | In each affected cell,11 filenames, “Corrections and payment instructions” and3 job labels render at **13px**,2px below the phone15px floor. These are content/action labels, not allowed tab labels/number badges. All15 entries are preserved in raw smallText arrays. | Not captured: browser work was paused immediately after checker completion for uncontended candidate gates. Pending crop must be added on resume. | `src/app/app/payroll/payroll-workflow.css:84,90,96` set legacy13px; these selectors are absent from the floor override in `src/app/app/portal-premium.css:637`. Markup: `src/components/payroll/payroll-ui.tsx:39`, `payroll-runs.tsx:47,114`. | Add a Wave B payroll-scoped override for these three selectors using kit callout/label fonts (15px on phones,14px desktop); preserve strong weight600/summary500 and all payroll words. Rerun affected cells/desktop and capture the controls. | **P2** |

## Checked and correct

- The48 observations contain no visible-small-text result on the other five base routes, no undersized targets and no page/console errors.
- No payroll/legal wording was changed. No new wording suggestion is counted as a defect.

## Gaps

Crop for TC-B-32; other roles and widths;125/150%; Update detail; empty/failed/paused/offline/signed-out content; colour/icon/field contrast judgment; manual date/time joining; axe and large data. The48 cells are a smoke subset and do not establish full ready-state or exit correctness.

## Suggestions for Jose

The existing phone Output profile/provider/channel select wording and report-definition/payroll strings remain the owning chat’s approved wording suggestions. Their layout-only desktop portions still need recheck. No wording approval is inferred.

UI recommendation: **NO-GO** (TC-B-32 open and exit evidence incomplete). QA recommendation: **NO-GO for exit certification**, with the exact gaps above.
