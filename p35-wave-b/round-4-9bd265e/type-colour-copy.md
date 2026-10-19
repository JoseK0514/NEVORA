# Wave B exit round4 — Type, colour and copy

**Verdict: not zero.**2 reproduced P2 IDs (TC-B-16,TC-B-32). Earlier unmeasured IDs are not closed.

Exact app source: `9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7` (remote handoff `564d193` adds documentation only). Source was detached/read-only. Fictional owned PostgreSQL17 and Next development runtime; DB adapter, bounded pool12 and generated type references are recorded in [source-manifest.json](source-manifest.json). No app edits, Claude-branch writes or server-reaching business-action browser submissions. All attempted business-action submissions were intercepted before navigation and held/aborted locally; only report POST reads were permitted.

The unchanged official checker (`e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d`) completed **45/48** cells: Owner, six base routes (except Update detail),320/390,100/200%,Chromium/WebKit. [Raw checker](checks-smoke.json), [log](checks-smoke.log). This was followed by limited manual proofs after the coordinator’s CPU pause. **No full matrix or axe pass; no zero certification.** The preview and browsers are closed; source/mirror verification and PostgreSQL shutdown passed ([manifest](manifest.json)).

## Status of earlier findings

| ID | Status |
|---|---|
| TC-B-01 | Additional soft hyphens exist in ACK_WORD;320/200% receipt/help measurement pending. |
| TC-B-02 | Glance container threshold21rem exists; child clipping judgment pending. |
| TC-B-16 | **Partly fixed, P2 open**: Compose offline is correct, retained draft returns on reconnect. Detail401 in Owner/Employee390 still says “Your session may have ended”; measured below. |
| TC-B-27 | Source totals/amount-line wrapping added; money/label geometry pending. |
| TC-B-28 | Source now says “Couldn’t save that template.” Query-state measurement pending. |
| TC-B-29 | Source unavailable/automatic labels unified; ready-state comparison pending. |
| TC-B-30 | Duplicate Clock-in notes empty text removed in source; ready-state judgment pending. |
| TC-B-31 | Reload copy now admits entries may be missing. Failure-state measurement pending; no closure from source alone. |

## Findings

| ID | Screen/role/width | Measured issue | Evidence | Cause and smallest fix | Severity |
|---|---|---|---|---|---|
| TC-B-16 | Update detail, Owner and Employee390 | Browser-local401 shows “Your session may have ended” and mixes ended-session/access-change wording. The brief requires **“Your session ended”** plus Sign in; the link is present. | [Owner401](crops/detail-401-QAOWNER.png), [Employee401](crops/detail-401-AUDIT-E.png), [states](manual-states.json). | `communications/client.ts:13` folds401/403; detail title/summary at `communication-detail.tsx:56–57`. Preserve401/403 distinction in client read metadata and render the brief’s ended-session wording only for401;403 must remain an access state. | **P2** |

| ID | Screen, role and width | Element | Measured issue | Screenshot crop | Cause | Smallest specific fix | Severity |
|---|---|---|---|---|---|---|---|
| TC-B-32 | Payroll runs; Owner QAOWNER; Chromium390/100%, WebKit320/100% | `.pw-document strong`; `.pw-secondary-actions > summary`; `.pw-job strong` | In each affected cell,11 filenames, “Corrections and payment instructions” and3 distinct job labels render at **13px**,2px below the phone15px floor. These are content/action labels, not allowed tab labels/number badges. The checker deduplicates them into15 text entries. Manual proof finds18 DOM nodes (11 filenames,1 summary,6 job labels). | [Filenames](crops/payroll-document-filenames-390.png), [summary](crops/payroll-corrections-summary-390.png), [jobs](crops/payroll-job-labels-390.png); manual13px measurements in [manual-typography.json](manual-typography.json). | `src/app/app/payroll/payroll-workflow.css:84,90,96` set legacy13px; these selectors are absent from the floor override in `src/app/app/portal-premium.css:637`. Markup: `src/components/payroll/payroll-ui.tsx:39`, `payroll-runs.tsx:47,114`. | Add a Wave B payroll-scoped override for these three selectors using kit callout/label fonts (15px on phones,14px desktop); preserve strong weight600/summary500 and all payroll words. Rerun affected cells/desktop and capture the controls. | **P2** |

## Checked and correct

- The48 observations contain no visible-small-text result on the other five base routes, no undersized targets and no page/console errors.
- No payroll/legal wording was changed. No new wording suggestion is counted as a defect.

## Gaps

Other roles and widths;125/150%; Update detail; empty/failed/paused/offline/signed-out content; colour/icon/field contrast judgment; manual date/time joining; axe and large data. The48 cells are a smoke subset and do not establish full ready-state or exit correctness. Limited offline checks passed for Compose as Owner/Employee390, with draft retention and Title focus on reconnect ([data](manual-offline.json)).

## Suggestions for Jose

The existing phone Output profile/provider/channel select wording and report-definition/payroll strings remain the owning chat’s approved wording suggestions. Their layout-only desktop portions still need recheck. No wording approval is inferred.

UI recommendation: **NO-GO** (TC-B-16/TC-B-32 open and exit evidence incomplete). QA recommendation: **NO-GO for exit certification**, with the exact gaps above.
