# Wave B inspection round

- **Round:** 5 (on the release candidate)
- **Exit round:** yes. One full sweep by all five areas on the combined build, plus a re-check of every open ID.
- **Commit:** `6861082` on `claude/p35-wave-b-808dfd` = candidate `origin/codex/verify-preview-33` at `cd764f6` (fast-forward; it already held every Wave B commit) + Codex's IS-B31 fix `eb83869` from `codex/ready-wave-b`, cherry-picked unchanged.
- **Where it runs:** Codex (combined build). Local preview and inspectors are paused by machine load (load average 62).
- **status:** open

## Codex round 4 (on `9bd265e`) open IDs, and where they stand on this commit

| ID | Fix | Checked locally on this commit (Chromium 390, preview synced to `6861082`) |
|---|---|---|
| IS-B31 | `eb83869` (Codex): the Enter field stays focused and read-only while the save is held; other controls disabled one by one | **Fixed.** Held: focus stays on `staffing-loc-1` (read-only); a second Enter sends no second request (1 POST). After failure: same field focused and editable, error shown in the save bar |
| IS-B12 | `21e603b` (Codex, in the candidate) | **Fixed.** Update detail, Employee and Owner: read fails with 503, Try again, focus lands on the update (`article`). Payroll settings, Owner: held save keeps focus on "Saving…" (1 POST); after failure focus goes to the failure notice, not the page |
| TC-B-32 | `payroll-workflow.css:184` (in the candidate) | **Fixed.** Document filenames, the "Corrections and payment instructions" summary and job labels compute to 15px/500 at 390 and 14px at 1440 (measured on injected nodes with the page's classes; the fixture has no approved run with documents) |
| TC-B-16 | `2e40573` (Codex, in the candidate): an ended session is told apart from changed access | Not re-checked locally (the preview was killed mid-check) |

**Gates on `6861082`:** `tsc --noEmit` clean; `eslint src` clean (0 errors, 0 warnings); full `vitest run`: 7,358 passed, 801 skipped and 4 failed under a load average of 62. The 4 were the process marker, two typed-guarded-backfill and the 50-worker planner timing tests, none in Wave B. Re-run alone, their 3 files pass 136 of 136.

Everything else from round 4 was "pending measurement", not open. It is listed in `round-4-9bd265e/` on `codex/inspections`.

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
