# 05 Product Manager — Employee and Lead gap after v3

**Verdict.** Employees and Leads now use what looks like a different, older product than their managers. It has a dark teal band with a greeting, the wordmark on every phone page, Inter, shadowed cards, an outline tab bar with a pill, a numbered teal bell, and pages two to two-and-a-half phone screens long. These are the habits the v3 spec removed on purpose. The fix is cheap on the logic side, because the employee pages are small (about 840 lines of JSX across Home, Schedule, My time and Requests). Bring v3 to employees in four small slices, starting with the shell and the count and wording rules, and keep the next-shift card as the one brand moment. Leads need one lead-specific view, which they don't have today.

## Evidence summary (what differs today)

| Area | Manager/Owner (v3) | Employee/Lead (now) | Evidence |
|---|---|---|---|
| Gate | `data-nv-clean` on the shell | Explicitly excluded | `src/components/app-shell.tsx:209-210` ("so Employee and Lead pages never change"); `premium-clean-manager.css:1023` ("Employee and Lead pages keep Inter") |
| Phone header | Large title, search, bell dot; no wordmark | NEVORA Workforce wordmark and a dark teal band on every page | AUDIT-M-home-390 vs AUDIT-E-emp-{home,schedule,mytime,pay,updates}-390 |
| Tab bar | Filled icons, tint, red badge | Outline icons, teal pill on the active tab | same shots |
| Home | "Today", 3 grouped lists, about 1,050px | Greeting, gradient pass, Clock status, To do, a 2x2 Quick actions grid, Recent activity: **2,130px** | AUDIT-M-home-390 vs AUDIT-E-emp-home-390 |
| Schedule (phone) | about 900px, inset list | **2,486px**, card per day, banner and card for the same confirmation | AUDIT-M-schedule-390 vs AUDIT-E-emp-schedule-390 |
| Desktop top bar | Page name, Search ⌘K, bell, account | Breadcrumb "Workspace › Page", no search; Notifications in **both** the sidebar and the bell | AUDIT-M-home-1440 vs AUDIT-E-emp-home-1440 |
| Updates vocabulary | "Required / Optional", "Acknowledgement required" | "To review / Reviewed", "Review needed" | QAOWNER-updates-390 vs AUDIT-E-emp-updates-390 |

## Recommendations

1. **Approve an "Employee v3" spec with one product decision written into it: keep the next-shift pass and drop the band and greeting.**
   - *Why:* `direction.md:194` makes the next-shift pass the "single brand moment on employee Home (U2)". The v3 spec bans dark gradient hero cards and "Good morning" greetings (`spec.md`, Visual direction). Employee Home has both the pass and a dark band with a greeting (`employee-home-reviewed.tsx:105-107, 299`). If nobody decides, the UI engineer meets two approved documents that contradict each other.
   - *Recommendation:* The large title "Today" and the date, then the pass as the only coloured surface, then grouped lists.
   - *Impact:* High. *Effort:* S (decision) then M (spec). *Owner:* Product (Jose), then UI.

2. **Slice E1 is one shell for all roles: tab bar, top bar, sidebar, bell and font.**
   - *Why:* The shell is what people see first, and it can't differ by role. The shell rules could be moved out from under `[data-nv-clean]` to every role while the page rules stay gated.
   - *What E1 changes for employees:*
     - Filled tab icons with a red badge.
     - No wordmark on phone pages, which `spec.md` sets only for the desktop sidebar and the launch screen.
     - The system font.
     - The org chip on the desktop sidebar.
     - A desktop Search, scoped to their own records.
     - Notifications dropped from the desktop sidebar (`navigation.ts:37`), because the bell already holds it.
   - *Release slices, each with a Jose checkpoint:*
     - E1: shell and counts (recommendation 3).
     - E2: Home and Schedule.
     - E3: Requests hub, My time and Pay.
     - E4: Updates, Notifications and Profile.
     - E5: the Lead crew view (recommendation 7).
   - Every URL keeps working, as in v3.
   - *Impact:* High. *Effort:* M. *Owner:* UI.

3. **Apply the v3 count dictionary to employees: the bell becomes a dot, and each count shows once.**
   - *Why:* On AUDIT-E-emp-home-390 the number 3 appears three times: the bell, the band link "3 items need your review", and "To do 3 items".
     - They come from different sources. The bell counts unread notifications (`notification-bell.tsx:30`), and the band counts Home actions (`employee-home-reviewed.tsx:311`).
     - The Lead evidence proves they diverge: `qa-out/emp-a/_app-AUDIT-LEAD-chromium-390-100.png` has no bell number but says "3 items need your review".
     - "Recent activity 5 items" lists 3 rows plus "View all activity (2 more)", which shows a subset labelled like a total. That breaks contract rule 2.
   - *Impact:* High (trust). *Effort:* S. *Owner:* UI.

4. **Use one verb for "I've seen this", in both roles and in Spanish.**
   - *Why:* The same acknowledgement is worded differently on each surface:
     - The schedule says **Confirm** ("Your manager asks you to confirm this week", plus a "Confirm you've seen your schedule" card on the same page).
     - Home and Updates say **Review needed**, and the Updates filters say **To review / Reviewed**.
     - Managers see **Acknowledgement required** and **Required / Optional** (QAOWNER-updates-390).
   - *Recommendation:* "Confirm" for the employee's action, and "Waiting for confirmation, N of M" for the manager. One banner or card per page. Settle the wording before B5 Spanish so it is translated once.
   - *Impact:* Medium. *Effort:* S. *Owner:* Product (copy), then UI.

5. **Make the 4th phone tab open hours, not an empty statements page.**
   - *Why:* The tab labelled "Pay" opens `/app/my-pay` (`navigation.ts:150-152`). For this fictional employee that page reads "No published statements yet" (AUDIT-E-emp-pay-390). The weekly need (hours, breaks, payday "Tue, Oct 27") sits behind the second section tab (AUDIT-E-emp-mytime-390).
   - *Recommendation:* Land the tab on a v3 "Time and pay" page:
     - This week's hours.
     - The payday line.
     - A "Latest statement" row.
     - A "Request a correction" row.
   - The My pay and Timecards addresses keep working.
   - *Impact:* Medium-High. *Effort:* S-M. *Owner:* UI (Product approves the label).

6. **Give employee Home one job ("What's my next shift, and what do I owe?") and one home per tool.**
   - *Why:* "Request time off" sits in three places: the Home Quick actions, the Schedule "Planning ahead" list, and the Requests hub "Start a request". "Swap a shift" and "Update availability" do too. That breaks v3 rule 5 (one home, at most one shortcut).
   - The Clock status card on Home repeats My time. Recent activity belongs to Requests ("Track your requests").
   - *Recommendation:* Home is the title, the pass, "Needs you" (confirmations and returned requests) and one row "Clock: off · Main Office Clocker".
   - *Target:* about 1,100px on a phone (2,130px today). Apply the same to Schedule: an inset list and one confirm row (2,486px today).
   - *Impact:* High. *Effort:* M. *Owner:* UI.

7. **Give Leads one read-only "My shift today" view.**
   - *Why:* A Lead's Home is the employee Home plus one line, "Designated lead" (`_app-AUDIT-LEAD-chromium-390-100.png`). The UI treats `LEAD` and `EMPLOYEE` the same (`permissions.ts:7`, `app-shell.tsx:68`).
   - "Message today's team" is the only team action, and plain employees get it too (`employee-updates.tsx:54`). A lead running the floor can't see who is on with them or who hasn't clocked in.
   - *Recommendation:* On Lead Home, while a lead shift is under way, show the people on the same location and shift window and their clock state. Reuse the v3 "Working now" row. No decisions, no pay, no phone numbers.
   - This needs a new scoped read (Codex) and a privacy note.
   - *Impact:* High for Leads. *Effort:* M-L. *Owner:* Product (scope and privacy), then Backend, then UI.

8. **Order what employees get next. Don't add phone clock-in yet.**
   - (a) **Open shifts and swaps.** They already exist (Shift options, `view=open` at `employee-my-schedule.tsx:153`, Requests hub). In E2, put My shifts and Open shifts in a v3 segmented control with the count.
   - (b) **My time receipts and change history** (direction A6), so employees can check punches and edits themselves.
   - (c) **Time-off balances.** None exist; a search for balance or accrual found nothing in `src`. This is a common competitor expectation and needs Backend accrual data.
   - (d) **Own week readable offline** (A3b, after B6 and the privacy review).
   - (e) **Phone clock-in: not now.** Punching at the Clocker only is a deliberate choice (`direction.md:14`, `employee-time-panel.tsx` "Use your location's Clocker"). Phone punching needs a geofence or location policy, a privacy and legal review in Puerto Rico, and B6. Show the last punch receipt on Home instead.
   - *Impact:* High. *Effort:* varies. *Owner:* Product (order), Backend for (b)-(d).

9. **Port by deleting employee CSS, not by adding a third layer.**
   - *Why:* v3 already needs specificity hacks: `html body .app-shell.nevora-portal.nevora-portal[data-nv-clean][data-nv-clean]:not(.cm-a)…` (`premium-clean-manager.css:18, 1024`). It has about 758 `[data-nv-clean]` selectors.
   - Employee styling lives in `portal-premium.css` (486 `employee-shell` matches) and `premium-desktop.css` (124), plus `globals.css` employee blocks (e.g. `:11576`).
   - *Recommendation:* Each employee slice should move its page onto `kit.tsx` and the v3 rules, and delete that page's `employee-shell` rules in the same change. Measure the CSS line count per slice as the debt metric.
   - *Impact:* Medium (debt and regressions). *Effort:* L across slices. *Owner:* UI.

10. **Fix small parity items in E1.**
    - Phone tab "Schedule" versus sidebar "My schedule", and phone "Pay" versus sidebar "My pay". Pick one label per place.
    - The Requests hub section tabs clip "Availability" at 390 (`qa-out/emp-a/_app_requests_hub-AUDIT-E-chromium-390-100.png`). The v3 band-pills rule ("one pill row") applies.
    - The desktop breadcrumb "Northside QA Workforce › Home" versus the manager's plain page name.
    - *Impact:* Low-Medium. *Effort:* S. *Owner:* UI.

**Success metrics for the employee slices** (fictional runtime):
- Phone page height: Home ≤ 1,100px and Schedule ≤ 1,300px at 390.
- Each count appears once per screen.
- Taps to request time off from Home stay at 2.
- Employee CSS lines drop with each slice.
- The same Chromium and WebKit `checks.mjs` sweep the v3 pages passed.

## What's good
- The employee information architecture is sound and already matches the v3 thinking. There are 4 tabs plus More, the Requests hub separates "Start a request" from "Track your requests", and the shell rules keep every old URL working (`navigation.ts:96-104`).
- The trust wording is strong and should carry over word for word:
  - "Your manager reviews each request. Your original times are kept."
  - "Published assignments only."
  - The per-location publish notice.
  - The payday line on My time.
- The employee components are small and separate from their styling (`employee-dashboard.tsx` 41 lines, `request-hub.tsx` 46, `employee-time-panel.tsx` 138), so a v3 port is mostly CSS and layout, not logic.

## Not checked / limits
- I didn't use a browser, per the brief. Page heights come from the full-page screenshot sizes (AUDIT-E-emp-home-390 is 390×2130 and AUDIT-E-emp-schedule-390 is 390×2486).
- The employee More sheet, the Profile, Notifications and Availability pages in the current build, and the 768px tablet width weren't in the AUDIT-E set. I only looked at older QA shots.
- My time shows "0 entries". `scripts/premium-submissions.mts:43` seeds a finished entry for AUDIT-E yesterday, but the preview data may come from a different seed, so I didn't count this as a bug.
- I didn't verify the Lead data scope or the privacy rules for a crew view (recommendation 7). That needs Codex.
- I didn't check Spanish (B5), dark mode or large text on employee pages.
