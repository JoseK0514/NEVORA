# Type, colour and copy — Desktop round 5

**Verdict: not zero: 0 P0, 1 P1, 1 P2 in this area; exit matrix incomplete.** Two desktop text-floor findings have direct computed metrics and screenshot crops.

## Findings

| ID | Screen · role · width | Element | Measured defect | Screenshot | Likely cause | Specific minimum fix | Severity |
|---|---|---|---|---|---|---|---|
| TC-P4-22 | Availability · AUDIT-E · Chromium 1440×900 ·100% | `.av-time-range label > span` (“From”,“Until”) | Both field labels compute to **11/16.5px**, below desktop14px. Crops at requested200% retain11px because this desktop legacy role falls back to px. | [100% crop](evidence/shots/TC-P4-22-1440-100.png), [requested200%](evidence/shots/TC-P4-22-1440-200.png). `evidence/limited-proof.json`. | `src/app/app/availability/availability.css:102` sets 11×`--type-unit` with 1px desktop fallback; `premium-desktop.css:407` floor list omits these spans. Coordinator TC-P3-32 is phone/landscape only. | In the existing desktop/non-landscape-phone query, scoped `.premium-employee-availability .av-time-range label > span { font: var(--nv-t-label) }`: **14/20,500**, rem-scaled. Preserve phone rules. | P1 |
| TC-P4-23 | My pay · AUDIT-E · Chromium 1440×900 ·100% | `.pw-document strong`; `.pw-statements header p` | Published PDF filenames compute to **13/19.5px**; earlier payday line **12/17.4px**. Both are below 14px and stay fixed at requested200%. | [Document](evidence/shots/TC-P4-23-document-1440-100.png), [earlier statement](evidence/shots/TC-P4-23-earlier-1440-100.png). Requested200% counterparts retained. | `src/app/app/payroll/payroll-workflow.css:84` (13px filename),`:120` (12px payday). Employee desktop floor omits these roles. | Scoped `.premium-employee-pay` desktop rules: filename `font: var(--nv-t-label)` (**14/20,500**); payday `font: var(--nv-t-callout)` (**14/20,400**), using the floor rule’s specificity. Preserve document links and all pay/legal wording. | P2 |

## Earlier findings

TCD-14/16 fixes are present in source. Employee Updates has no under-floor text reported by the 1440 checker; this is not a full reclosure of every TCD-16 role/state. Other historical statuses remain in `evidence/source-type-colour-copy.md`.

## Checked and correct

- Frozen Desktop sidebar group/nav/footer text measures **14px**: [sidebar crop](evidence/shots/sidebar-reference-8012d97-1440-100.png), exact values in `evidence/limited-proof.json`. This is the source reference for inherited candidate RC-CB-TC-01.
- All35 checker cells have no axe violations. Owner Home/views, Inbox/filters, Schedule, Team, Timecards, Time exports and Payroll report no under-floor visible text at 1440/100.

## Gaps

Remaining type roles, contrast/copy judgments, other roles/widths/browsers, open details and failure/session states. Candidate corrections are the parent’s separate work; no correction on this frozen source is claimed.


Exact source: `claude/p4-desktop-240fe0` at `8012d9790e72987140f939c7d70e1df9612ea009`, detached `/workspace/inspect-desktop`. Read only; fictional owned preview only. No app source edits or app mutations. No production access.

The unchanged checker completed **35 unique cells**: Owner 21 + Employee 14, Chromium 1440×900/100%, axe enabled; **14 raw pass / 21 raw fail**. Owner 19 cells include the documented absent `/api/manager/inbox-count`404; legacy folded-request/Reports/Settings/manager-Updates body floors are retained as out-of-scope observations. Employee’s two failures are TC-P4-22/23. Raw JSON is unchanged. See [checker summary](evidence/checker-summary.json), [Owner raw](evidence/checks-QAOWNER-chromium-1440-100.json), [Employee raw](evidence/checks-AUDIT-E-chromium-1440-100.json), [source round](evidence/source-ROUND.md).

**Exit matrix incomplete.** Gates required pausing browser work; the resumed scope was limited to font crops, a sidebar reference, and controlled Inbox CLS attribution. No WebKit, other widths, collapsed sidebar, full role/state matrix or full manual five-area sweep was completed. No earlier finding is independently closed beyond the measurements stated here. Full matrix requirements are retained in [metadata](evidence/round-metadata.json).

All owned browser/checker/Next/PostgreSQL processes were stopped. Final closure verifies unchanged source and mirror, PostgreSQL stopped, and zero closure errors: [audit](evidence/closure-audit.json). Runtime substitutions are disclosed in [adapter manifest](evidence/runtime-adapter-manifest.json) and [source hashes](evidence/source-manifest.json).
