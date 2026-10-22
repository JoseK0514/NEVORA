# 03 Product Manager — Owner end-to-end journey (setup → first publish → first approval → first export)

**Verdict.** Each page works on its own, but nothing guides an Owner from one step to the next. Home's "Finish setting up" row tracks only 2 of about 11 real setup steps, and one of those 2 can never finish because of a copy and logic contradiction. Three handoffs are hard to find or break the journey: publishing a schedule on desktop, going from "approved" to "finalized" timecards, and going from timecards to an export for the same period. A new Owner can do everything, but often can't tell what to do next or whether they're finished.

Journey walked: Settings, then Company and Locations, then Positions, then Scheduling rules, then Team (add a person), then Activation, then Clocker devices and PINs, then Schedule (build and publish), then Timecards (approve and finalize), then Time exports and Payroll. I worked from code and the QAOWNER-* screenshots only, with no browser.

## Recommendations

1. **Turn the Owner setup row into a real launch checklist built from data that already exists.**
   *What:* Replace the 2-step row with ordered steps:
   1. Confirm company name and timezone.
   2. Add a location.
   3. Positions (optional).
   4. Coverage periods.
   5. Add your team.
   6. Team activated (N of M).
   7. Clocker tablet per location.
   8. Clocker PINs (N of M).
   9. Publish the first schedule.
   10. Finalize the first timecards.
   11. First export.

   Each step should link to the page that fixes it and show "Done" once complete. Keep the current slim row on Home and open the full list from it.
   *Why:*
   - `src/lib/action-center/setup.ts:5` sets `SETUP_TYPES` to `COVERAGE_RULES_MISSING` and `TARGET_MISSING` only.
   - `owner-setup-card.tsx:69-73` picks the next step from those two alone.
   - `prd-owner-setup-card.md` §6 deferred "new setup steps" to Q3, which has never been answered.
   - The data already exists: `locations.length`, `activeEmployees`, the device list (`listClockerDevices`), `configured` on PINs (`src/lib/clocker/pins.server.ts:13`), `has_credential` (`src/lib/data/employees.ts:185-205`), schedule statuses, and timecard states.
   - Timezone is the riskiest default for a Puerto Rico business, and no step checks it.

   *Impact:* High. *Effort:* M. *Owner:* Product (step list) + Backend (one summary read) + UI.

2. **Fix the hour-target contradiction that keeps setup at "1 of 2" forever.**
   *What:* Pick one fix:
   - (a) Count only people who can be scheduled (Employee and Lead) toward the setup step.
   - (b) Add an explicit "No target" choice that counts as set.
   - (c) Add "Apply a target to everyone without one".

   *Why:*
   - The Scheduling rules page says "Leave a target blank to leave it out of the hours review" (`src/app/app/schedule/settings/page.tsx:124`).
   - But every blank target becomes `TARGET_MISSING` (`src/lib/data/manager-dashboard.ts:179-184`). That includes Owners and Managers: QAOWNER-rules-1440 shows 13 people "Not set", starting with "Fictional Owner".
   - So QAOWNER-home-1440 and QAOWNER-home-390 show "Finish setting up · 1 of 2" permanently.
   - Filling in 13 fields one by one is the only way to clear it.

   *Impact:* High. *Effort:* S–M. *Owner:* Product + Backend.

3. **Make publishing visible on desktop Schedule, and prompt for it from Home.**
   *What:*
   - On desktop, show the same "Locations the team can't see yet" card that phones get, with a Review / Publish button.
   - Keep the status-line links even when there are more than 3 locations.
   - Add a Home "Needs you" item when next week isn't published.

   *Why:*
   - The desktop top bar's only primary button is "Add shift" (QAOWNER-schedule-1440).
   - The "Build and publish" panel is hidden unless opened (`src/app/app/clean-manager/schedule.css:14`). The only ways in are More › Build and publish, or the teal status text "West Office not planned".
   - The phone card is phone-only (`cm-sched-phone`, `schedule/page.tsx:423-430`).
   - With more than 3 locations, the status line turns into plain text with no link (`schedule/page.tsx:306-307`).
   - Home receives `week.locations` (published, draft or not started) but never shows it (`premium-home.tsx:24-33`).
   - `ManagerActionItem` has no "unpublished week" type (`src/lib/assistance/manager-actions.ts:17-27`).

   *Impact:* High. *Effort:* S (UI) + S (Backend action item). *Owner:* UI + Backend.

4. **Close the approve/finalize gap on Timecards.**
   *What:*
   - Rename the summary tile and tab to "Finalized X of N", or show both Approved and Finalized.
   - Change the ended-period copy to "Approve, then finalize, each timecard".
   - After the last approval, offer "Finalize N approved timecards".

   *Why:*
   - Export accepts only `FINALIZED` (`src/components/payroll-export.tsx:100,103`).
   - But `isApproved` counts APPROVED and FINALIZED together (`src/components/timecards.tsx:67`), and the tile reads "Approved 0 of 13" (`:313`, QAOWNER-timecards-1440).
   - The ended-period summary says only "Review and approve each timecard" (`:300`).
   - An Owner who approves everyone sees "13 of 13" and then hits "No finalized timecards are ready to export" (`payroll-export.tsx:132`).

   *Impact:* High. *Effort:* S. *Owner:* UI.

5. **Keep the same period from Timecards to Time exports.**
   *What:*
   - Default both pages to the pay schedule period from Payroll settings, or to the last completed Monday–Sunday week.
   - Carry `?start&end` across the Time and pay tabs and the export page's "Timecards" link.

   *Why:*
   - Timecards defaults to the current Monday–Sunday week (`src/app/app/timecards/page.tsx:20-22`).
   - Time exports defaults to a rolling "today − 6 … today" (`src/app/app/payroll-export/page.tsx:15`).
   - The "Time exports" tab (`src/lib/navigation.ts:235`) and the export page's `/app/timecards` link (`payroll-export.tsx:132`) both drop the period.
   - Only the toolbar Export button passes it (`timecards.tsx:281`).
   - Opened from a tab, the export shows a different week from the one just finalized.

   *Impact:* Medium–High. *Effort:* S. *Owner:* UI (Backend only if the pay-period default is read server-side).

6. **Give "Add employee" a finished state instead of a refilled form.**
   *What:* On success, replace the form with a "done" panel that shows:
   - the Employee ID to hand over, with Copy and Print/Share for the activation steps and `/activate` link;
   - next steps: "Set Clocker PIN", "Set weekly hours", "View profile" and "Add another".

   *Why:*
   - The action returns "Employee created. Open Employees to view the scheduling profile." with no link (`src/app/app/employees/actions.ts:84`).
   - `ConfigurationForm` keeps every value filled in (`src/components/configuration-form.tsx:33-36`), so a second tap gives the generic duplicate-ID save error.
   - The "What happens next" card says "Give them their Employee ID" but offers no way to give it to them (`employees/new/page.tsx:92-99`).

   *Impact:* High. *Effort:* S–M. *Owner:* UI.

7. **Show activation and PIN status on Team.**
   *What:*
   - Add "Not activated" and "No Clocker PIN" labels on rows and on the person header, plus a filter.
   - Later, add a bulk "Set PINs" flow.

   *Why:*
   - The Team list shows only Role, Location and Phone (QAOWNER-team-1440).
   - The person page shows only "Employee · Active" (QAOWNER-person-1440).
   - The Owner can't see who never activated or who can't clock in.
   - Today PINs are set one person at a time, three levels deep (Team › person › Clocker PIN).
   - Both facts already exist on the server: `getEmployeeActivationState` returns `has_credential`, and `EmployeePinView.configured` holds PIN status.

   *Impact:* Medium–High. *Effort:* M. *Owner:* Backend (list read) + UI.

8. **Decide what happens to the Owner's own timecard.**
   *What:* Pick one:
   - Let a sole Owner finalize their own time with a recorded reason.
   - Leave people with no recorded time out of the review set.
   - At minimum, say "Add a Manager to review your time" with a link.

   *Why:*
   - The database blocks any self-approval (`db/migrations/0018_timecards.sql:93`, `nevora_timecard_SELF_REVIEW`).
   - Owners appear in Timecards ("Fictional Owner", QAOWNER-timecards-1440).
   - The message "A different manager must review your timecard" (`timecards.tsx:56`) leaves a one-owner shop with nowhere to go.
   - That shop's own hours can never be finalized or exported.

   *Impact:* Medium. *Effort:* S–M. *Owner:* Product + Backend.

9. **Make "Payroll" vs "Time exports" clear.**
   *What:*
   - On the Payroll runs empty state, and on first visit, add: "Only need hours for your payroll provider? Use Time exports."
   - Consider naming the sidebar entry "Pay statements" or "Payroll runs".

   *Why:*
   - The desktop sidebar's "Payroll" opens a provider-JSON-import and statement workflow (`src/components/payroll/payroll-runs.tsx:28,38,94`).
   - The simpler CSV handoff most first-time Owners want ("Time exports") is hidden from the desktop sidebar (`navigation.ts:46` folds it into Timecards).
   - So the Owner's "first payroll export" sends them to the wrong tool.

   *Impact:* Medium. *Effort:* S. *Owner:* UI + Product (naming).

10. **Finish the Clocker guide.**
    *What:* Add guide steps for "Give each person a Clocker PIN (N of M set)" with a link, and "Do a test clock-in".
    *Why:* The "Connect a shared tablet" guide stops at "Enter the setup code" (`src/components/clocker-device-manager.tsx:139-143`). Nothing on the page says that employees can't clock in without a PIN, which is set elsewhere.
    *Impact:* Medium. *Effort:* S. *Owner:* UI.

## What's good

- **Locations is a model for every setup page.** It has "Needs setup / Ready" filters, a "Scheduling setup is complete" line on each location, and Scheduling rules one tap away (QAOWNER-locations-1440). After a new location is saved, the confirmation links to Scheduling rules and Employee eligibility (`new-location-form.tsx:115`).
- **Clocker devices handles every state clearly.** Statuses are plain-language (Needs setup / Awaiting setup / Setup expired / Registered / Revoked), there is a first-tablet empty state, and a "No active location" notice links to Locations.
- **The publish confirmation gives clear next actions.** "<Location> published. Employees can now see their … shifts", followed by "Send an update" and "Back to Home" (`schedule/page.tsx:369-380`). That is the right pattern for the other milestones too.

## Not checked / limits

- I did not use a browser. All fixtures are a mature workspace (2 locations, 13 people, published week), so I couldn't see a truly empty first-day Home, Schedule or Timecards. Empty-state findings are inferred from code.
- I found no self-serve Owner sign-up or workspace-creation flow in `src/app`. Workspaces seem to be provisioned outside the app, so I couldn't review the Owner's real first sign-in.
- I didn't exercise the Build and publish generation, the Payroll runs import, or the export download. All of these change data.
- Spanish copy and the phone versions of Timecards and Time exports weren't checked.
