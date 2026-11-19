# Final regression review of the premium pass (fz pictures against fin pictures, Nov 18, 2026)

Review only. No app file was edited, nothing was run except the picture tools (`imgdiff.mjs`, `pair.mjs` and small read-only
crop and measuring scripts in the scratchpad), and nothing was committed. Fictional Northside data on the local capture
harness. This is not Development and not production. Release sequence unchanged: the combined UI goes to Development as
one release, is verified there, and reaches main or production only after Jose approves that exact release.

Crops are in `U/p9/fz-review/`. `ow-` crops are mine (Owner work pages and cross-checks), `el-` covers Employee and Lead,
`sm-` covers settings, account and Manager, and `r30-` covers the 30-day spot checks. The diff rankings are the `diff-*.txt`
files in the same folder.

## Sets compared

Every final set was captured at `3e8f88124` and every earlier set at `16a64b001`. Each scan log records a clean tracked
tree at the start of its run.

| Final | Earlier | Reviewed |
|---|---|---|
| fz-owner (23 routes, 4 widths) | fin-owner | yes, except /app/notifications (did not load; being re-captured) |
| fz-owner2 (17 routes) | fin-owner2 | yes |
| fz-manager (14 routes) | fin-manager | yes |
| fz-employee, fz-lead (18 routes each) | fin-employee, fin-lead | yes |
| fz-owner-844, fz-manager-844, fz-employee-844, fz-lead-844 | the fin 844 sets | yes (all four finished with exit 0) |
| fz30-manager | fin30-manager | spot check only: the closed Shift matching page and the field-error line, because no other final set draws them |

Not reviewed: fz-public-desk (signed-out pages, outside this brief), the rest of fz30-manager, Clocker PINs on the sideways
phone (fz-owner-844 has no PINs route), and the sidebar at exactly 1024px (no capture at that width).

The scan logs list no new overflow. The list of controls under 44px only got shorter in every set. Band actions went
from 36 to 40 drawn, explainers from 32 to 36, week arrows from 32 to 36, and the Restrictions pair and Confirm left the
list. No control got smaller anywhere.

## Regressions and fixes that did not hold

There are no blockers. Every blocker from final reviews A and B still holds.

| # | Severity | Route | Width | What is wrong | Before picture | After picture | Crop | Likely cause |
|---|---|---|---|---|---|---|---|---|
| 1 | visible (regression) | /app/profile/calendar, Employee and Lead | 900, 1440, 844 sideways (every width from 768px) | "Create calendar link" is now a 44px bar across the whole card (717px at 900, 573px at 1440). It was a right-aligned pill hugging its label, and FC's own after picture shows that pill. The ladder has no full-width 44px button. Phones are correct (52 full width). | cap/fin-employee/owner-profile-calendar-900.png, -1440.png; cap/fin-employee-844/owner-profile-calendar-844.png (same in fin-lead) | cap/fz-employee/owner-profile-calendar-900.png, -1440.png; cap/fz-employee-844/owner-profile-calendar-844.png (same in fz-lead) | el-calendar-900.png, el-calendar-1440.png, el-profile-calendar-844.png | The FA and FC patches clash. FA deleted the kit rule `section.b-card[aria-labelledby="b-calendar-heading"] .eb-body > .b-btn--full { display: flex; width: fit-content; min-width: 96px; margin-left: auto }` from `src/app/app/b-foundation.css` (commit a0c8ddae5, "follows the Employee sheet's own rule (FC)"). FC's rule at `src/app/app/employee-b-account.css:248` sets only height, padding and font, so `.b-btn--full` stretches again. Add `display: flex; width: fit-content; min-width: 96px; margin-left: auto` to the FC rule from 768px. |
| 2 | visible (fix did not hold) | /app/notifications, Manager (Owner uses the same component) | 390, 320 | Detail lines still end on the middle dot: "Week of Nov 23 – 29 · 5 shifts ·" then "1 min ago", and "Open shifts, requests or missing availability ·" then "1 min ago". Review B #8 named this page. The coordinator's BSegs change did not reach these roles. | cap/fin-manager/owner-notifications-390.png, -320.png | cap/fz-manager/owner-notifications-390.png, -320.png | sm-mgr-notif-390.png, sm-mgr-notif-320.png | `src/components/notification-inbox.tsx:123` still writes `{text.detail} · ` before the time, and `rowFacts` at `:62` joins with `' · '`. Commit 60d595f8c changed only `src/components/employee-mobile/notifications-list.tsx`, which is the Employee and Lead list. |
| 3 | visible (fix did not hold) | /app/payroll/history, Pay statements list, Owner | 390, 320 | "Oct 26–Nov 1 · Payday" / "Fri, Nov 6 · Correction" still splits "Payday Fri, Nov 6". At 390 the next row ends a line on "·" ("… Payday Fri, Nov 6 ·" / "Replaced by a correction"). FA #10 says "Payday Fri, Nov 6" never splits on Payroll and its history, and review A #10 cited this picture. The Payrolls list above it is fixed. | cap/fin-owner/owner-payroll-history-390.png, -320.png | cap/fz-owner/owner-payroll-history-390.png, -320.png | ow-history-390.png, ow-history-390-statements-2x.png, ow-history-320.png | `src/components/payroll/portal-statements.tsx:51` and `:58` join with `' · '` and `' · Payday '`. The dot sticks to the fact before it and may break after it, and "Payday" and the date are separated by a breakable space. FA's patch does not touch this file. Use `BSegs` with the no-break "Payday Fri, Nov 6" unit, as `payroll-runs.tsx:217` and `:223` already do. |
| 4 | visible (side effect of FA #6) | /app/payroll band, Owner | 390 | Now that the countdown is grey text instead of a chip, two facts run together with only a gap: "Up next · Weekly payroll  Scheduled payday in 9 days". Nothing separates them, so it reads as one run-on line. At 320 the countdown wraps to its own line and reads fine. FA's own capture shows the same. | cap/fin-owner/owner-payroll-390.png | cap/fz-owner/owner-payroll-390.png (same in cap/fa-owner) | ow-payroll-390.png, ow-payroll-390-upnext-3x.png, ow-payroll-390-upnext-fa-vs-fz.png | `src/components/payroll/payroll-runs.tsx:317` to `:320` puts the kicker span and the `b-hkicker__when` span side by side with no separator. Join them with `BSegs`, so a "·" shows when they share a line and disappears when the countdown wraps. |
| 5 | polish (side effect of FA #28) | /app/employees filter, Owner and Manager | 320 | In the two-by-two filter, "Not clocked in 3" fills its 121px half. The words start 5px from the track's edge (about 1px inside the pill), while the other three labels sit centred with room. When this filter is selected, the white thumb will touch the words. | cap/fin-owner/owner-employees-320.png | cap/fz-owner/owner-employees-320.png (same in fz-manager) | ow-team-320-filter-3x.png, ow-team-320.png | `src/app/app/owner-b-home.css:215` and `:216`: two equal columns with 8px sides and `white-space: nowrap` at 13.5px. Under 360px, use the narrow segment size `--b-seg-fs` (12.5px) or 4px sides, as FC did for the three-tab segment. |
| 6 | polish (side effect of FA #21) | /app/account/delete, Owner (Manager likely the same) | 320, 390 | The consent sentence went from weight 500 to 600 on phones. At 320 it now takes four lines ("… and I won't be able to sign" / "in again."). It reads as heavy as a heading. The box does sit on the first line, as fixed. | cap/fin-owner2/owner-account-delete-320.png | cap/fz-owner2/owner-account-delete-320.png | sm-delete-320-consent.png, sm-delete-320.png | The FA #21 title rule `src/app/app/owner-b-requests.css:108` (`.q-page .q-row .q-rt > b` at 600) also matches `label.q-row.q-deletion__check > .q-rt > b`. Exclude `.q-deletion__check`. |
| 7 | polish (fix partly held) | /app/availability, Manager | 1440, 390 | Faces are still 32px. FA (B #19) reports 36px on Team, Timecards and Availability. Team and Timecards now measure 36, but Availability measures 32 before and after. | cap/fin-manager/owner-availability-1440.png | cap/fz-manager/owner-availability-1440.png, -390.png | sm-mgr-avail-390.png | The 36px rule at `src/app/app/owner-b-home.css:219` matches `.c-row > .c-av` and `.c-tc-person > .c-av`. Availability draws `.q-row.q-row--av > .q-av` (`src/components/availability-team-list.tsx:81`). |
| 8 | polish (side effect of FA #10) | /app/inbox, Time corrections card, Owner and Manager | 390, 320 | Each correction row now takes four short lines: "Thu, Nov 12" / "6:00 AM – 2:41 PM, was" / "6:00 AM – 2:06 PM" / "+35 min". The card is about 150px taller, and "was" still ends a line. No line ends on "·", which was the aim. | cap/fin-owner/owner-inbox-390.png, -320.png | cap/fz-owner/owner-inbox-390.png, -320.png (same in fz-manager) | ow-inbox-390-a.png, ow-inbox-320-a.png | `src/lib/action-center/present.ts:74` builds "asked, was old range" as one fact, so `BSegsText` (`src/components/owner-b/inbox-b.tsx:44`) cannot place it beside the date and wraps it inside, after "was". Making "was …" its own segment would give two lines ("Thu, Nov 12 · 6:00 AM – 2:41 PM" / "was 6:00 AM – 2:06 PM · +35 min"), but it changes the line's punctuation, so it is Jose's call. |

### Still open, not regressions

These were the same before, and no fix round claimed them. They are listed so nobody reads them as new.

- Things to do band at 320: "19 things need you ·" / "11 timecards to approve" ends a line on the dot (`inbox320`).
- Team rows at 320: "Front counter · Manager ·" / "Calle Loíza", and a line that starts "· Off today". Cause:
  `src/components/employee-directory.tsx:49`, `:61` and `:101` join with a plain " · ".
- Same-month ranges are still spaced in some places: the Timecards band, the Insights band ("Nov 16 – 18 so far"),
  Notifications ("Week of Nov 23 – 29") and the Employee pages. FA closed them up only on the Owner pages it lists.
- Add employee at 390: the half-width Location select still reads "Choose a loca…". FA #3 fixed this only on Add shift.
- Employee "Delete my account" is about 56px at 320 and 900, which is off the ladder.

### Capture artifacts, not defects

- fz30-manager `r30-edit-err-future-390.png` shows "Skip to content" over the Mobile phone field. FF #13 now scrolls the
  refused field into view. The skip link is `position: fixed` and is hidden with `translateY(-200%)`
  (`src/app/app/premium-desktop.css:257`), so the full-page capture draws it at the scroll offset minus 76px. On a device
  it stays off screen. This is the same effect as the phone tab bar appearing mid-page.
- Data that changes with the time of day (who is clocked in, minutes late, totals and the Things to do count) was not
  judged.

## Fixes spot-checked that held

- Person page status line (A #1, blocker). At 390 it reads "555-0199 · Off today". At 320 the line is whole and the two
  call circles sit under the text. At 900 and 1440 the state sits inline after the phone, and positions are one grey line.
  Crops: `ow-person-390.png`, `ow-person-320.png`, `ow-person-900.png`, `ow-person-1440.png`.
- Phone touch targets (A #2, blocker). In the scan, no control got smaller in any set. Edit, Save, Next and New update
  went from 36 to 40 drawn with a 44 hit area, the explainers from 32 to 36, and the Restrictions pair is 44 and full width
  on phones. Crops: `ow-restr-320.png`, `ow-addshift-390.png`, `sm-mgr-restr-320.png`.
- Clocker PINs band (B #1, blocker). At 1440 and 900 the strip runs from 188 to 232, the band ends at 264 and the card
  starts at 288. On phones the 390 card starts 16px under the band, and at 320 each action stays on its name's line.
  Crops: `sm-pins-1440-band.png`, `sm-pins-900-band.png`, `sm-pins-390-top.png`, `sm-pins-320-top.png`.
- Sidebar after the rem rewrite. A pixel diff of the sidebar column at 1440 (Owner, Owner settings, Manager, Employee,
  Lead) and of the 900 rail found only one change: the Things to do count, 18 to 19. Crop: `sm-sidebar-badge-manager.png`.
- Closed pages. Shift matching closed to a Manager limited to one location names itself on the band and offers one
  tinted "Return to Home" at 390 and 1440. Manager Payroll and Settings are unchanged with their own step. Crops:
  `r30-scoped-390.png`, `r30-scoped-1440.png`, `sm-mgr-payroll-closed-1440.png`.
- Field-error line. The glyph has its own column, the message sits directly under the field and the helper follows.
  Crop: `r30-err-future-1440.png`.
- Height ladder. The phone band is 40 and the band from 768px is 48. Row and card actions are 44 (Prepare, Approve,
  Find cover, Confirm this week, Restrictions). Full-width phone primaries are 52 (Prepare Nov 2–8 on Home, Make reset
  link, Delete my account). Explainers are 36. Crops: `ow-home-390.png`, `ow-prepare-390.png`, `sm-arec-320.png`,
  `el-sched-390.png`.
- Owner pages:
  - Home: the payroll card is one row with a 44 pill on tablets, its own-width pill in the 1440 rail, and the amber circle
    for a group of people (`ow-home-900-after.png`, `ow-home-1440-after.png`).
  - Payroll: Up next's dividers all run from 1046 to 1375 at 1440 (measured) (`ow-payroll-1440.png`).
  - Restrictions: amber callout with the Question glyph (`ow-restr-1440.png`).
  - Paid time export: hourglass and the "‹ Time exports" back link (`ow-paidtime-320.png`, `ow-paidtime-1440.png`).
  - Schedule: at 320 "Published" sits under the dates with the arrows kept on the dates' row, and at 900 long times break
    after the dash (`ow-sched-320.png`, `ow-sched-900.png`).
  - Time corrections: the per-card chip is gone (`ow-corr-320.png`).
  - Team: "clocked in" in the band, "Starts 5:00 PM", and the Timer glyph (`ow-team-390.png`, `ow-team-1440-after.png`).
- Employee and Lead pages: every FC row we checked held. That covers Review on the text edge, Confirm at 44 in amber with
  CalendarCheck, lead geometry, the 20px consent box on the first line, the clock line with no panel, the 320 segment, the
  Updates search at 320, the status under the name on phones and inset hairlines. The FC row 15 revert behaves as intended
  (cards end together on tablets and the sideways phone). Notification detail lines for Employee and Lead never start or
  end on "·". Crops: `el-home-900.png`, `el-sched-390.png`, `el-delete-320.png`, `el-home-390.png`, `el-exchange-320.png`,
  `el-updates-320.png`, `el-hub-390.png`, `el-notifications-390.png`.
- Settings and account pages (FB):
  - Profile: one value edge and no tabular "555 - 0100".
  - Delete account: consent box on the first line, 52 on phones and 44 in the footer.
  - Payroll settings at 320: the value sits under the title.
  - Help: dividers in Common questions.
  - Settings hub: same order at 900.
  - More: the 36px face lines up with the labels.
  - Features: outline lock.
  - Crops: `sm-profile-1440-values.png`, `sm-delete-1440-foot.png`, `sm-setpayroll-320.png`, `sm-help-1440-questions.png`,
    `sm-settings-900.png`, `sm-more-390.png`, `sm-features-320.png`.
