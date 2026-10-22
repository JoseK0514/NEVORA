# 18 UX Designer — forms and editing flows

Scope: Add shift, Edit shift, coverage repair, Compose update, Add employee, Edit employee, settings forms (Wave B and Wave C), Payroll settings, and the time-off, swap and "Unable to work" decisions. I read the code and looked at earlier QA screenshots. I did not use a browser (my brief does not allow it).

## Verdict

The mechanics are solid. Forms save once per tap, keep what you typed when a save fails, show "Saving…", and catch stale versions. The weak part is judgement. Managers commit first and find out later: shift conflicts appear only after Save (and only the first one), time-off is approved without seeing the person's shifts, and declines carry no message. Three flows end in a dead end or a likely bug: Add employee success, saving both employee tabs in one visit, and editing a shift that ends at midnight. Destructive actions use four different patterns, and one of them (deactivating an employee) has no confirmation at all.

## Recommendations

1. **Show conflicts and fit before Save in Add shift and Edit shift.**
   - *What to do:*
     - In the Person picker, show each person's fit for the chosen day and time ("Off Tue", "34 of 40 h", "Not at this location"). The coverage ranking already computes this.
     - Run a quick check while the person fills in the form, before Save.
     - List every blocking issue and warning in plain words with the numbers and a way to fix it.
   - *Why:*
     - `createShiftAction` and `updateShiftAction` stop at the first blocking issue (`validation.issues.find(... "error")`, `src/app/app/schedule/actions.ts:103,252`) and return the engine's text as is, for example "Insufficient rest under the configured rule." and "Exceeds configured per-shift maximum." (`src/lib/scheduling/validate-shift.ts:111-113`). These name no hours and no fix.
     - Warnings (overtime, outside availability, weekly hours) appear only after the shift is already saved, through `&warning=<code>` on the schedule page (`actions.ts:133-139`).
     - The Person list shows every active employee, whatever the location or availability (`src/components/shift-assignment-fields.tsx:95-103`). Picking someone who can't work at the location is caught only on the server.
     - The Summary card says "checked when you save" (`create-shift-form.tsx:81`), which confirms the order is commit first, learn later.
   - *Impact:* High · *Effort:* M–L · *Owner:* UI + Backend (a read-only check endpoint that returns all issues with their values).

2. **Give the time-off and shift-request decisions their context, a message, and a next step.**
   - *What to do:*
     - On the time-off review, show the person's shifts inside the requested dates and who else is off.
     - Add an optional note to the employee when declining.
     - After approving an "Unable to work" report, offer "Find cover" right there.
   - *Why:*
     - "Before you decide" only links out to the whole week's schedule, so the manager has to leave the decision to learn the impact (`src/components/manager-time-off.tsx:72-79`).
     - `reviewTimeOffAction` accepts only `requestId` and `decision`, with no reason field (`src/app/app/requests/actions.ts:62-74`). Swap and callout declines are also one tap with no message (`src/components/manager-shift-requests.tsx:119,137`).
     - The callout card says "It will still need someone to cover it" (`manager-shift-requests.tsx:133`), but after Approve the card refreshes away (`shift-change-form.tsx:13` calls `router.refresh()`) with no link to the coverage assistant.
     - The success line sits inside that card, so the confirmation probably disappears with it. This is likely from the code but not checked in a browser.
   - *Impact:* High · *Effort:* M · *Owner:* Backend (decline note, conflicting-shifts read) + UI.

3. **Fix the stale-version collision between the two employee forms (likely bug).**
   - *What to do:* After one form saves, refresh the saved version the other form holds. Alternatively, have each form check only its own fields.
   - *Why:*
     - The Details and Scheduling forms on `/app/employees/[id]` each keep `employee.updatedAt` from when the page loaded (`ConfigurationForm` `useState(reviewedUpdatedAt)`, `configuration-form.tsx:23`; page lines 72 and 89).
     - Both saves check, and then bump, the same `employees.updated_at` (`src/lib/data/employees.ts:338-342` and `472`/`506`).
     - Tabs hide panels rather than unmounting them (`employee-profile-tabs.tsx:64`).
     - So editing a new hire's phone and then their positions in one visit should fail with "This employee changed since you opened the profile. Reload…". This is the most common edit sequence.
     - Not checked in a browser.
   - *Impact:* High · *Effort:* S · *Owner:* UI.

4. **Replace the Add employee success dead end with a hand-off screen.**
   - *What to do:*
     - After success, show the Employee ID and phone to give to the person, the three activation steps, and buttons for "View profile", "Add another" and "Done".
     - Show a duplicate ID or email at the field that caused it.
     - Optionally suggest the next free ID.
   - *Why:*
     - On success, the inline action returns only "Employee created. Open Employees to view the scheduling profile." (`src/app/app/employees/actions.ts:83`).
     - The form stays filled in with "Add employee" still active. Tapping it again fails with the catch-all "Employee could not be saved. Check unique ID/email and active locations/positions." (`actions.ts:210`), which doesn't say which field is wrong.
     - The person must invent a unique sign-in ID by hand (`employees/new/page.tsx:51-53`).
     - The primary location picked under Access is not reflected in "Locations they can work at": it isn't ticked or locked on create (`employee-scheduling-fields.tsx:47-51` relies on an `employee` that doesn't exist yet).
   - *Impact:* High · *Effort:* S–M · *Owner:* UI (Backend only if field-level duplicate codes are needed).

5. **Adopt one pattern for destructive actions and apply it everywhere.**
   - *What to do:*
     - Low risk and reversible: act at once and offer Undo.
     - Medium risk: an inline confirm, like Wave B's `confirm`.
     - High risk: an explicit button that states the consequences, then a confirm.
   - *Why:* Today there are four patterns.
     - Delete shift sits in a `<details>` disclosure (`schedule/edit/page.tsx:113-121`).
     - Removing a coverage period and archiving a template use an inline confirm (`schedule/settings/page.tsx:160`, `schedule/templates/page.tsx:156`).
     - Location deactivation is a switch with a dirty-state notice (`edit-location-form.tsx:117-122`).
     - Employee deactivation is just a "Status: Active/Inactive" select inside the general "Save details" form, with no confirmation (`employee-core-profile-form.tsx:60-62`). That select signs the person out immediately and says nothing about their future shifts.
     - Payroll access is revoked by unticking two boxes (`payroll-settings.tsx:201-204`).
     - Decline on time-off, swaps and callouts is one tap with no undo.
   - *Impact:* High · *Effort:* M · *Owner:* UI (Backend for a future-shift count on deactivation).

6. **Make the date and time pickers work for phones and for the one-week window.**
   - *What to do:*
     - Replace the week-limited `type="date"` with 7 day chips (Mon–Sun) in Add and Edit shift.
     - Prefill the times from the location's usual hours, the last shift, or a template chip. Templates already exist at `/app/schedule/templates`.
     - Change the out-of-range message to plain words, for example "Pick a day from Mon, Oct 19 to Sun, Oct 25".
     - Normalise `24:00` before it reaches the Edit form.
   - *Why:*
     - On iOS WebKit, an empty `type="time"` shows a grey "12:30 PM" that looks already filled while the Summary says "Choose times" (screenshot `qa-out/confirm-phone/wk/QAOWNER-_app_schedule_new-webkit-390x844-100-01.png`).
     - The shared validator turns an out-of-range date into "Use 2026-10-25 or less", a raw ISO date (`src/components/form-validation.tsx:47-48`, with min/max from `create-shift-form.tsx:61`).
     - Add shift converts an end time of `24:00` to `00:00` (`create-shift-form.tsx:29`), but Edit shift passes `shift.endTime` through unchanged (`schedule/edit/shift-edit-timing.tsx:19,25`). Midnight-ending shifts exist: coverage repair uses `24:00` (`schedule/new/page.tsx:66`) and so does the generator (`generation/periods.ts:148`). A time input can't show `24:00`, so Ends should appear empty and block Save. This is likely from the code; not checked in a browser.
   - *Impact:* Medium–High · *Effort:* S–M · *Owner:* UI.

7. **Guard unsaved changes, and keep Save within reach on long forms.**
   - *What to do:*
     - Track dirty state and confirm on Back or Cancel in Add and Edit shift, both employee forms, Compose and Payroll settings. Reuse the dirty logic from `edit-location-form.tsx:38`.
     - Use the Wave C sticky save bar (`settings/wave-c-form.tsx:136-158`) on long forms.
   - *Why:*
     - Only `availability-editor.tsx` and the location form track changes. Everywhere else Cancel is a plain `<Link>` (`create-shift-form.tsx:87`, `schedule/edit/page.tsx:109`, `employees/new/page.tsx:90`).
     - Compose keeps the draft only in an in-memory ref and has no saved draft (`communication-compose.tsx:116`).
     - Payroll settings is one form across six cards with a single Save at the bottom and a required "Reason for change". It takes 7 phone screens at 100% (`qa-out/final-mgr-phone/c390b/QAOWNER-_app_settings_payroll-…-00..06.png`).
     - In Payroll settings, client errors such as "Payday offset must be a whole number…" appear only next to the bottom Save, not at the field (`payroll-settings.tsx:36,111,130`).
     - On Add shift, Save sits about two screens down on a 390px phone, below a Summary that repeats every field (screenshots `…schedule_new-webkit-390x844-100-00..02.png`).
   - *Impact:* Medium · *Effort:* M · *Owner:* UI.

8. **Compose update: stop losing the audience preview, and put "who receives it" first.**
   - *What to do:*
     - Clear the preview only when a delivery field changes, not when the title or message changes.
     - Move Delivery above the message, as email does.
     - Add "All my locations" for Owners.
     - Merge "Optional update" with "Informational only", or explain the difference.
     - Add Save draft.
   - *Why:*
     - Every keystroke in the title or message calls `changed()`, which sets the preview to null (`communication-compose.tsx:54,78,83`). Fixing a typo after the preview hides "Publish update" and forces a second "Preview audience" round trip.
     - Work location defaults to `context.locations[0]` (line 27), so a multi-location Owner can easily send to the wrong place, and has to send once per location.
     - The four update types and three "Review requirement" options add choices with overlapping meanings (lines 93, 97).
   - *Impact:* Medium · *Effort:* S–M · *Owner:* UI (Backend for an all-locations scope).

9. **Merge the form kits into one.**
   - *What to do:* Keep one `Field`, one form wrapper, one action form with confirm, one place for the result, and one tone of error wording.
   - *Why:*
     - There are currently four systems:
       - Wave A: `ConfigurationForm` with global `FormValidation`. The result appears *below* Save and Cancel.
       - Wave B: `ActionForm`, `RulesSaveForm`, `InlineConfigForm` and `PolicyForm` in `wave-b-forms.tsx`.
       - Wave C: `SettingsForm`, with the result *above* the buttons and its own field errors.
       - Compose and Payroll, each with their own `wb-*` markup.
     - Two different components are both called `ActionForm`, with different APIs (`wave-a/action-form.tsx:12`, `wave-b-forms.tsx:53`).
     - Error headings vary: "Not saved", "The shift wasn't saved" and "That decision wasn't saved".
     - Wave B has a translation table from engine messages to plain words (`wave-b-forms.tsx:39-49`); Wave A shows the engine's words directly.
     - Every new form currently picks one of these at random, which drifts.
   - *Impact:* Medium · *Effort:* L · *Owner:* UI.

10. **Smaller edit-flow gaps.**
    - *What to do:*
      - Add Notes to Add shift. Today notes can only be added after creation; Edit has them at `schedule/edit/page.tsx:99-105`, and `createShiftAction` already reads `notes` (`actions.ts:50`).
      - Let Edit shift change the location, or offer "Move to…". Today the help text says "delete it and add a new one" (`edit/page.tsx:85`), and deleting can be refused when the shift has exchange history (`actions.ts:302-305`).
      - When coverage has no candidates, offer "Post as open shift", or show the people who were close and what blocked each one, instead of only "Back to schedule" (`coverage-assistant.tsx:126-130`).
      - Make the two "cover this shift" paths behave alike. The normal path opens an editable Add shift form; the repair path opens a read-only review (`schedule/coverage/page.tsx:91` vs `178`).
    - *Why:* Each of these turns a one-step task into a workaround or a dead end.
    - *Impact:* Medium · *Effort:* S–M · *Owner:* UI (Backend for move-location and open shift).

## What's good

- Saving is reliable. There is one request per tap (`single-submit`, `inFlight`), the button shows its pending words without changing size, the fieldset is disabled while saving, and entries stay after a failure. The result is scrolled into view and focused (`pending-button.tsx:47-55`).
- Stale-version and conflict handling is thorough: `expectedUpdatedAt`, the "Coverage changed — Open current review" screen (`schedule/new/page.tsx:48-62`), and Compose's "Check status / Retry original publication" when the outcome is unknown.
- The coverage assistant is a strong base. It gives a ranked list, explains how the order is chosen, and says "Nothing is saved on this page" before a review. The shift form should reuse it (recommendation 1).

## Not checked / limits

- No browser use (not allowed by my brief). Recommendations 2 (the success line disappearing), 3 (the stale collision) and 6 (`24:00` in Edit) come from reading the code and need one browser check each.
- I did not exercise the Android Chrome date and time pickers, and I did not open the Inbox side-sheet version of the decisions.
- I did not open company policies, breaks, features, branding, clocker or the operational-rules editor in depth.
- I did not cover the employee-side forms (time-off request, swap request, callout, availability) beyond `reviewed-swap-form.tsx`.
- I did not check Spanish copy. All the form strings I read are hard-coded in English.
