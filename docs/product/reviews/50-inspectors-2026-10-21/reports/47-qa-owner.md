# 47 QA Tester — Owner (QAOWNER) full exploratory pass, 390 and 1440

**Verdict.** The Owner app holds up. All 39 Owner routes render with an h1 and no sideways scroll at 390 or 1440. Search, the account menu, the More sheet, every Inbox tab, the Schedule More menu, the Timecards sheet, the Insights period and Export menus, and every Escape-and-return-focus path I tried worked. Five real bugs remain. Profile can't load its data for any Owner or Manager, and the cause is hidden because the error is thrown away. The setup row lands past the section it promises. Timecards has a "Role" column that is empty for everyone. Payroll shows a different name for a person than Team does. All-day times are written three different ways.

Shots folder: `.../scratchpad/review50/shots/`. All new evidence is named `qa47-*`.

## Recommendations

1. **Fix Profile's "Couldn't load", and log the server error behind it.**
   - *What I did:* opened `/app/profile` as QAOWNER at 1440 and 390, and called `GET /api/management/profile` as QAOWNER and as AUDIT-M.
   - *What happened:* the API returns `200 {"state":"unavailable","reason":"read_failed"}` every time, for both roles, in 24–190 ms. So it isn't a timeout under load. Email, Phone and Locations show "Couldn't load", alert choices show an error tile, and there are two "Try again" buttons.
   - *What I expected:* contact details, locations and the five alert toggles.
   - *Why the cause is hidden:* `src/lib/data/management-profile.server.ts:41` catches every error and returns `read_failed` without logging it. The preview's `next.log` has no entry for the failure.
   - *Likely causes (unverified):*
     - The preview database lacks migration `db/migrations/0033_management_alert_preferences.sql`, so the `management_alert_choices` column is missing.
     - The row fails the strict shape check at `:35-37`, which throws `invalid_profile_snapshot`.
   - *To do:* log `error.message` server-side, then check against a migrated database.
   - *Also seen:* at 390, Email and Phone wrap the label above the value, but Locations stays inline.
   - *Evidence:* `qa47-crawl-profile-1440.png`, `qa47-crawl-profile-390.png`.
   - Impact **High** (blocks a whole page for every Owner and Manager if it reproduces on real data) · Effort S–M · Owner Backend.

2. **Make the Home setup row land on the "Weekly hours" heading.**
   - *What I did:* clicked "Finish setting up · Next: set weekly hour targets" on Home at 1440.
   - *What happened:* the URL becomes `/app/schedule/settings#target-hours`, and focus goes to the section. But the "Weekly hours" heading ends up 345 px above the top of the viewport (`scrollY` 875, heading top −345). The person lands mid-list on Morgan Rivera's row and never sees the heading or the explanation.
   - *What I expected:* the heading at the top, below the header.
   - *Evidence:* `qa47-1440-05-setup-row-dest.png`, `qa47-1440-dom-target-hours.png`.
   - Impact Medium · Effort S · Owner UI.

3. **Fix the Timecards "Role" column, which is "—" for all 13 people.**
   - *What happened:* the desktop table's Role column is empty for everyone, including the Owner, Managers and a Lead.
   - *Why:* `src/components/timecards.tsx:79` fills it from the punch `positionName`, not the person's role. No preview punches captured a position ("Position not captured" in the sheet).
   - *What I expected:* either the person's role or their primary position. Alexandra's Scheduling tab shows "Customer Support". Otherwise rename the column "Position" and fall back to the assigned position.
   - *Evidence:* `qa47-crawl-timecards-1440.png`, `qa47-1440-19-tc-casey.png`, `qa47-390-25-emp-scheduling.png`.
   - Impact Medium · Effort S · Owner UI.

4. **Make Payroll and Team show the same name for a person.**
   - *What happened:* Payroll → "Review period" → Employee amounts lists "b Fictional QA". The same employee (`payroll-qa-b`) is "Robin Fictional QA" on Team, Timecards, Schedule and their own page (h1 checked).
   - *What I expected:* the current name, or a clear "name at the time of this revision".
   - *Evidence:* `qa47-1440-23-payroll-review.png`.
   - Impact Medium (Owners match payroll to people by name) · Effort S–M · Owner Backend (check the snapshot source) plus UI.

5. **Write all-day and midnight times one way everywhere.**
   - The same West Office open slot reads:
     - "all day" on Inbox and Home
     - "12a – 12a" on the desktop Schedule
     - "12:00 AM / 12:00 AM" on the phone Schedule
   - Main Office's evening slot reads "5:00 PM–midnight" in Inbox but "5p – 12a" on Schedule.
   - On the phone, the "West Office isn't planned · Nothing scheduled this week" card sits directly above an open shift at West Office on the same day.
   - *Evidence:* `qa47-1440-17-edit-shift.png` (schedule grid), `qa47-390-12-schedule.png`, `qa47-1440-10-inbox-request.png`.
   - Impact Low–Medium · Effort S · Owner UI.

6. **Align the Note value in the Inbox time-off detail on desktop.**
   - *What happened:* Dates, Length and Works at values start at x=869, but Note starts at x=857.
   - *Evidence:* `qa47-1440-10-inbox-request.png`.
   - Impact Low · Effort S · Owner UI.

7. **Let screen readers hear "over limit" on the desktop roster.**
   - *Why:* in `src/components/manager-weekly-roster.tsx:164` the visible "56h · over limit" is `aria-hidden`. The sr-only text says only "56h assigned this week", so VoiceOver users never hear the warning.
   - *Evidence:* `qa47-1440-14-schedule-more.png` (amber "over limit" on 5 rows).
   - Impact Low–Medium · Effort S · Owner UI.

8. **Flag stale open punches on Home.**
   - *What happened:* Home "Working now" shows Casey Rivera "on break" with no warning. Timecards shows the same punch started Oct 19 at 11:28 PM, with 26h recorded and 23h of break.
   - *What I expected:* an "open since Mon" hint, or a link to the timecard.
   - This is edge data, so leave the detail to reviewer 50.
   - *Evidence:* `qa47-crawl-home-1440.png`, `qa47-1440-19-tc-casey.png`.
   - Impact Low · Effort S · Owner UI.

9. **Give every page its own document title.** Every route has the title "NEVORA Workforce". Reviewer 24 already reported this, and I confirmed it on all 39 routes. Impact Medium · Effort S · Owner UI.

## What's good
- **No layout or console failures:** no sideways scroll on any of the 39 routes at 390 or 1440, and no page errors except dev-only noise.
- **Search works fully:** the button and ⌘K open it with focus in the input, typing filters, Enter opens the person, "No matches." shows for no results, and Escape returns focus to the Search button.
- **Overlays release focus correctly:** the account menu, More sheet, Schedule More menu, Inbox phone sheet and Timecards sheet all close on Escape and return focus to whatever opened them. Inbox tabs update `?filter=` and keep focus.

## Not checked / limits
- **The preview is behind HEAD.** It is built from checkpoint `8c4dd505` with a later file sync, so the three CSS changes from the last commits aren't in it. Its `public/` folder is also missing `fonts/typeface/inter/variable.woff2`, which gives a 404 on every page in the preview only (the file exists in the repo).
- **Dev-server artefacts were ignored:** the Next "N" dev badge covers "Powered by" on the sidebar, there are "Rendering…" delays, and `/app/my-time` throws a negative-timestamp error.
- **One transient 500:** `/app/employees/AUDIT-E` returned a 500 once ("canceling statement due to statement timeout", while about 20 reviewers were loading the preview). It loaded fine later, and I didn't count it as a page bug.
- **Read-only limits:** I never pressed Save, Approve, Set deadline, Copy previous week, Prepare, Import or Delete. So I didn't test success or error states after a save, and I opened the edit-shift form only to Cancel it (Cancel returned to Schedule correctly).
- **Not tried:**
  - at 390: the Timecards tabs, the period arrows and the Insights segmented periods (the phone uses different controls than my script)
  - Notifications with data (it was empty: All 0)
  - Shift requests detail sheets (no pending items)
  - payroll-export mapping forms (I only viewed them)
- **Browser time** was about 15–17 minutes in total, a little over the brief's ~15-minute guide. That ruled out reduced-motion, large-text and keyboard-only passes (other reviewers cover them).
