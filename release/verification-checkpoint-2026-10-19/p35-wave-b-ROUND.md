# Wave B inspection round

- **Round:** 4
- **Exit round:** yes. One full sweep by all five areas, plus a re-check of every open ID.
- **Commit:** `9bd265e` on `claude/p35-wave-b-808dfd` (preview synced to it)
- **Where it runs:** pushed for Codex, and five local inspectors on the same commit. Whichever reports first is used; both are kept.
- **status:** open

## Routes and roles

| Page | Route | Roles |
|---|---|---|
| Insights | `/app/reports` | Owner `QAOWNER`, Manager `AUDIT-M`; Employee is sent to `/app` |
| Templates | `/app/schedule/templates` (`?week=`, `?saved=1`, `?archived=1`, `?error=save`, `?applied=3&skipped=1&warnings=1`) | Owner, Manager |
| Scheduling rules | `/app/schedule/settings` (`?saved=1`, `?error=invalid_hours`, `?windowSaved=1`) | Owner (edits the trade policy), Manager (reads it) |
| Update detail | `/app/updates/<id>` (first link on `/app/updates`) | Owner, Manager, Lead `AUDIT-LEAD`, Employee `AUDIT-E`, `AUDIT-LONG` |
| Compose | `/app/updates/compose` | Owner and Manager ("Create update"), Lead and Employee ("Message today’s team") |
| Payroll settings | `/app/settings/payroll` | Owner `QAOWNER`, `payroll-qa-owner`; Manager is sent to `/app` |
| Payroll runs | `/app/payroll` | Manager with payroll access `payroll-qa-reviewer` (and the Owner, no regression) |

## Open IDs to re-check (from round 3)

- **Alignment:** AL-B16, AL-B29, AL-B30 (fixed at the merge by the coordinator's 62cd033; on this preview the landscape toast still covers the tab bar, so don't refile it), AL-B31, AL-B32
- **Bars and stability:** ST-B08, ST-B13, ST-B14
- **Type, colour and copy:** TC-B-01, TC-B-02, TC-B-16, TC-B-27, TC-B-28, TC-B-29, TC-B-30, TC-B-31
- **Interaction and states:** IS-B12, IS-B29, IS-B30, IS-B31, IS-B32, IS-B33
- **Widths, roles and consistency:** WR-B-09, WR-B-10 (phones need Jose's wording; 1024+ should fit), WR-B-11, WR-B-17, WR-B-22, WR-B-23, WR-B-24

## What the round-3 fixes touched

- **Insights:**
  - The quiet refresh starts a third of the way through each snapshot.
  - The scroll place is restored only once the report is back on the page.
  - At a glance stays one column until a cell fits its value (two from a 21rem card, three from 34rem, six from 62rem).
  - Wording: "Not available" everywhere, and Clock-in notes says it only once.
- **Update detail:**
  - Wording: soft hyphens in "Acknowledgement", and "Your session may have ended".
  - Focus:
    - It goes to a notice's button, and to the update after a failed read recovers.
    - Check status and Try again stay focusable while they run.
  - The Withdraw confirm comes fully into view.
  - The in-page loading band holds the placeholder height.
- **Compose:**
  - Offline, ended-session and paused wording.
  - Focus goes to Title after a failed load recovers.
  - "Require acknowledgement", and no title placeholder.
- **Templates:**
  - Rows wrap before the name is squeezed (Apply and Archive in `minmax(0, 12rem)` columns).
  - "Couldn’t save that template."
- **Scheduling rules:**
  - Select chevron room.
  - Rows from 1180 put the name on the field's centre line.
  - The save bar button is on one line at 768.
  - Facts margin.
  - Focus returns to the field after a save.
  - Focus stays clear of the bars in WebKit (a focusin nudge).
  - Policy options "Automatically" and "Manager reviews", with honest recovery copy.
  - A soft hyphen in the title.
- **Payroll settings:**
  - The output profile spans its row.
  - Selects keep chevron room.
  - The focus nudge, as on Scheduling rules.
- **Payroll runs** (Owner and Manager):
  - Save progress and failures float in view.
  - Totals stack and amount lines wrap at narrow widths.
  - Weekdays stay with their dates.
  - The "Next step" guidance is on the callout role.
- **Placeholders:** exact two- and three-slope formulas at 390 for Insights, Templates and Rules.

## Decided, don't refile

The table in `inspection/ROUND-2.md` still applies. It adds:
- Shared WR-49 textarea and search border on other pages (sent to the coordinator).
- Report definitions and payroll strings, which wait on Jose.
- The Update detail band height depends on the title's length, so its placeholder can't match every title.
- Weekday joins and the landscape toast are also fixed on the coordinator's branch (keepWhole, 62cd033) and arrive with the merge.
- The Inter font swap (ST-B07) is fixed at the merge (62cd033, aae87e4).

## Checks

`checks.mjs` results for this build: `.../scratchpad/wb/r3/*.txt` and `.../scratchpad/preview/checks/*.json` (newest).
