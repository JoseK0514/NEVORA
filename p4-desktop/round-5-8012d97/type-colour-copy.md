# Type, colour and copy — Desktop round 5

**Verdict: not zero: 0 P0, 1 P1, 1 P2 measured; exit matrix incomplete.** The unchanged checker and source cascade identify two Desktop text-floor findings. Screenshot crops are pending the parent’s browser pause; copy/contrast and the remaining matrix are unfinished.


## Findings

| ID | Screen · role · width | Element | Measured defect | Screenshot | Likely cause | Specific minimum fix | Severity |
|---|---|---|---|---|---|---|---|
| TC-P4-22 | Availability · AUDIT-E · Chromium 1440×900 · 100% | `.av-time-range label > span` (`From`, `Until`) | Both field labels compute to **11px**, below the desktop **14px** floor. | Pending: browser work paused at the safe batch checkpoint for candidate gates. Raw measurement: `evidence/checks-AUDIT-E-chromium-1440-100.json`, `/app/availability`. | `src/app/app/availability/availability.css:102` sets 11px; `src/app/app/premium-desktop.css:407` floor list omits the spans. Candidate coordinator’s TC-P3-32 override is phone/landscape only. | Under the existing desktop/non-landscape-phone media query, add the scoped `.premium-employee-availability .av-time-range label > span` rule with `font: var(--nv-t-label)` (**14/20, 500**, rem-scaled). Keep phone ownership/rules. | P1 |
| TC-P4-23 | My pay · AUDIT-E · Chromium 1440×900 · 100% | `.pw-document strong`; `.pw-statements header p` | Published PDF filenames compute to **13px**; earlier-statement payday line computes to **12px**, both below 14px. No pay/legal wording change is proposed. | Pending: same safe pause. Raw measurement: `evidence/checks-AUDIT-E-chromium-1440-100.json`, `/app/my-pay`. | `src/app/app/payroll/payroll-workflow.css:84` (13px filename), `:120` (12px payday); Employee desktop floor omits these selectors. | Scope to `.premium-employee-pay` in the existing desktop query. Filename: `font: var(--nv-t-label)` (**14/20, 500**); payday line: `font: var(--nv-t-callout)` (**14/20, 400**), using the desktop floor rule’s specificity. Preserve text/document links. | P2 |

## Earlier findings

TCD-14 and TCD-16 fixes are present in source; their measured rechecks are pending. Historical statuses remain in `evidence/source-type-colour-copy.md`. Inbox failure/session copy will be inspected against the current brief.

## Checker observations outside Desktop body scope

Owner 1440/100 Chromium has legacy text-floor failures in the bodies of `/app/requests`, `/app/exchange`, `/app/availability`, `/app/updates` and `/app/reports`. The Desktop round scopes manager folded request pages, Updates and Reports to shell/trail inspection; these raw body observations are retained for Wave A/Wave B integration review, without double-counting them as Desktop defects.

## Checked and correct

- Owner 1440/100 Chromium: checker reports no text-floor failure on Home and its views, Inbox and filters, Schedule, Team, Timecards, Time exports, Payroll and Settings.
- All 21 Owner cells have no axe violations.

## Gaps

Font-role geometry, contrast sampling, copy states, all remaining roles/widths/text sizes/browsers and open details have not been judged.


Exact source: `claude/p4-desktop-240fe0` at `8012d9790e72987140f939c7d70e1df9612ea009`, detached `/workspace/inspect-desktop`. Read only. No app source edits, saves, decisions, sign-outs or production access. Fictional fixture-only owned preview.

The parent paused browser work for the candidate publication’s isolated gate runs. This is a checkpoint report, not an exit certification. Required matrix: 320, 360, 390, 430, landscape 844×390, 761, 768, 1023, 1024, 1179, 1180, 1440 and collapsed 1440; root text 100/125/150/200%; Chromium and WebKit; all brief roles/states. It remains incomplete.

Evidence: [round metadata](evidence/round-metadata.json), [checker summary](evidence/checker-summary.json), [source round](evidence/source-ROUND.md). `checks.mjs` runs unchanged under the external-origin guard. Raw 404 failures are retained; `/api/manager/inbox-count` is absent by this branch’s documented contract and belongs to backend integration.

Checkpoint addition: Employee 12/14 routes passed at 1440/100 Chromium with axe (Availability and My pay have small text). Combined raw result 14/35 pass; see unchanged JSON. Browser work is idle after this batch.
