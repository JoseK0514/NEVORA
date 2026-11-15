# Phase 3, package E: Settings, forms, Profile, More, Insights and the pages closed to a Manager

Builder E, taken over from a stopped builder. Base `ed7f8b4c`. Patch: `e.patch` (32 files, 587 insertions, 76 deletions).
All new CSS is in `src/app/app/owner-b-settings.css`. No shared stylesheet was edited. Nothing was pushed. Fictional local data only.

Release sequence (Jose's policy of Nov 12, 2026): this is UI work on the UI checkout. It is uncommitted and waits for Jose.
It then goes to Development for the combined backend and UI check, and to main only after Jose approves. No deploy, no
paid service, no real notification was used. Evidence is from a local Next development server on an owned local Postgres
with the capture tool's fictional workspace ("Northside Café & Bakery", Owner Jose Natal, Manager Elena Ruiz).

## What I kept, fixed and removed from the partial work

- Kept: the closed-page state screen for a Manager, the Settings sentence that names the section, the sub-line on locked
  features, the Save-on-change idea, the validation sentences, the Attendance tiles.
- Fixed: the Settings layout called `requireSessionMutationProof` inside a `catch`, which could swallow a sign-in redirect.
  It now uses `readSessionMutationProof` (returns null) and a failed read only removes the button. The Payroll notice read
  the Manager's navigation without a guard; a failed read now leaves the notice without links instead of an error page.
- Fixed: the Access row claimed "all locations" wording before the read arrived. It now says only "Manager" until the
  read gives locations, and never adds a third "Couldn't load".
- Restored: the email break rule (TC-02). The partial work had removed it. The address still breaks only after the @ or
  before a dot; on a phone it now sits under its label so it does not need to break.
- Changed: Company profile's reason is a sibling of the value, not nested in it, so the value markup the tests protect
  is unchanged.
- Added: every CSS rule (the partial work had none), the Save-on-change baseline from rendered defaults, tests.

## Findings

| Id | Status | What I did or found | Evidence | Remains |
|---|---|---|---|---|
| OW-023 | fixed | One error style on Owner and Manager forms: 16px bold warning glyph, red 13.5/18, 6px under the field, no closing period. Add employee and New location now match. Sentences have an article. Partial phone reads "Enter all 10 digits of the phone number". | `owner-b-settings.css:14-18`, `form-validation.tsx:43`, `wave-c-form.tsx` Field, `e-shots/state-add-employee-error-390.png`, `e-shots/state-new-location-error-1440.png`. Measured at 1440, 900, 390: all messages 13.5px/18px, rgb(180,35,24), glyph 16x16. | The Employee shell keeps its own error style (out of scope). |
| OW-024 | fixed | "Locked while you have shifts" sits under each locked value (grey value, 16px lock, reason beneath). Save shows only after a change, and hides again when the entry is put back. | `workspace/page.tsx:29-45`, `wave-c-form.tsx:194-256`, `owner-b-settings.css:20-27`, `e-shots/state-company-profile-changed-1440.png`. Save buttons found: 0 before, 1 after a change, 0 after reverting, at 1440, 900 and 390. | Saving itself was not exercised (no data was saved). |
| OW-025 | fixed | The reason is the row's sub-line (13.5/18, 2px gap, row at least 64px). Lock glyph 16px bold. Locked switch at 60% with a lock cut into its thumb. | `features-editor.tsx:103-107`, `owner-b-settings.css:29-38`, `e-shots/owner-settings-features-1440.png`, `p3e-work/s4/state-features-locked-zoom.png` | The thumb lock uses `mask-composite`. Seen in Chromium only. |
| TB-013 | fixed | From 768px the list inside each section has no radius, shadow, edge or fill. Phones keep the list as the card (the section title sits on the canvas there). | `owner-b-settings.css:117-118`, `owner-settings-features-900.png` in `p3e-work/s4` | None |
| OW-026 | partly | Bars are 56px wide at most, 6px top radius, at least 4px tall. Attendance tiles with no data are left out; the reason line stays (Nov 14 wording kept). | `owner-b-settings.css:67-69`, `reports.tsx:296-304`, `e-shots/owner-reports-1440.png` (bar 56x108, radius 6) | Planned hours per day as a backing bar: needs Codex (see For Codex). Chart height left at 176px. |
| OW-030 | fixed | Helper lines and group labels set on the canvas use `--b-grey-on-fill` at 13.5/18 on Settings and its pages, Help and Payroll settings. Found with a scan of 15 routes at 1440 and 390. | `owner-b-settings.css:55-57, 83-84` | Time exports and time-off detail are not my screens. |
| OW-032 | fixed | Desktop More is one grouped card, 560px, with Sign out as a quiet white pill under it. | `more/page.tsx:136-160`, `owner-b-settings.css:97-112`, `e-shots/owner-more-1440.png` | The sidebar still lights "Home" on More (shell, see Needed). |
| TB-016 | fixed | Same on tablets: one 560px card, Sign out a 44px pill. | `owner-more-900.png`, `owner-more-768.png` in `p3e-work/s4` | The account pill opening the menu instead of More is a shell change (see Needed). |
| OW-033 | partly | Locations: a long place name wraps to a second line instead of being cut. Sub-lines on my screens have no closing period. | `owner-b-settings.css:59-62`, `owner-settings-locations-390.png` in `p3e-work/s4` | The spaced em dash is in the fixture's location name ("Northside Bakery — Condado"), not in the app. Time exports and Things to do are other packages. |
| OW-036 | fixed | Values keep normal letter spacing with tabular figures. Ten-digit numbers already read "(787) 555-0100" (existing test). The 48px avatar is on the desktop and tablet band. | `owner-b-settings.css:71-72, 126-129`, `e-shots/manager-profile-390.png`, `manager-profile-1440.png` | The fixture Manager's number has seven digits, so it shows as stored. |
| OW-022 (rest) | fixed | Positions: the form under a row is one quiet panel, no nested cards. From 768px Cancel and Save position sit side by side on the right (96px and 137px wide; they were two 528px bars). Phones keep stacked buttons. The "Add position" dialog field no longer has a card inside the dialog. | `owner-b-settings.css:40-53, 114-115`, `e-shots/state-positions-open-900.png` | See next row for the 651px field. |
| OW-022 (651px field) | already fixed | The 651px element on Company policies is the invisible select behind the "Applies to · All locations" row. It draws as right-aligned text and a chevron, not as a field. The real fields are 560px at 1440, 1100, 900 and 768. | Measured: `select.q-select-row__control` 651px, inputs 560px. | None |
| MG-002 | fixed | Payroll: reason "Payroll is for Owners", line "Your part is timecards. Jose Natal runs payroll after you approve them.", tinted pill "Open Timecards", text link "See my pay". Settings: "Settings are for Owners", "You can change scheduling rules. For anything else, ask Jose Natal.", pill "Open Scheduling rules". Both 44px tall, tinted, never filled. Each link shows only when the Manager's navigation has that page. The page is never rendered. | `owner-only-notice.tsx:15-23, 50-60`, `payroll-route.tsx:28-39`, `settings/layout.tsx:21-31`, `e-shots/manager-payroll-390.png`, `e-shots/manager-payroll-1440.png` | A way to ask the Owner from the page needs a server action (see For Codex). |
| MG-009 | fixed | A closed page under Settings names its section: "Locations are part of Settings, which only Owners can change. Ask Jose Natal." It uses the workspace's own word ("Stores"). Titles have no closing period on my screens. | `settings/closed-line.tsx`, `layout.test.tsx`, `e-shots/manager-settings-locations-900.png` | "Time exports are for Owners and Managers." still has its period (other package). |
| MG-013 | fixed | New row "Access": "Manager, all locations" or the location names, with "Schedule, time, team and requests. Payroll and Settings are for Owners." under it. The bare lock is replaced by "Jose Natal can change this." under Phone and Email. The email sits under its label on phones and stays whole. | `manager-profile-live.tsx:32-44, 176-193`, `manager-profile.tsx:42-44`, `owner-b-settings.css:73-95`, `e-shots/manager-profile-390.png` | See For Codex for what the read does not give. |
| MG-015 | fixed | Decision: the state card's holder is a circle, 48px, everywhere. The kit already draws it round (`.b-ico`, radius 999px). The Manager's closed pages now use that one state card at every width (desktop and tablet used a second layout with no icon). | Measured holder 48x48, radius 999px. `owner-only-notice.tsx:50-60` | Closed pages owned by other packages still use the two-layout notice (see Needed). |
| TB-015 | fixed | Tablets (768 to 1023): Company then Pay on the left, Clocker then Scheduling on the right. Column bottoms at 700 and 760 (they were 820 and 640). Applies when the Pay card is shown; without it the page keeps its two columns as before. | `owner-b-settings.css:131-140`, `e-shots/owner-settings-900.png` | Keyboard order stays Company, Scheduling, Clocker, Pay (see For Jose). |
| TB-019 | fixed | The form card of Company profile, a location, New location and Branding gets the 1px edge other cards have. Labels, fields and row titles now start at x=131 at 900 on all of them (forms were at 130). The first field starts 22px under the card top. | `owner-b-settings.css:120-124`. Measured left edges at 900: 131 on Company profile, Locations, a location, New location, Branding, Features, Positions, Add employee. | Employee Profile is out of scope. |
| Nov 14 BR-4 (Help back link) | already fixed | Desktop Help's back link says "Home". | `owner-help-1440.png` in `p3e-work/s4` | The tab bar lighting "Home" on More is the shell's. |
| Nov 14 BR-11 (small targets) | partly | On my screens at 390 the only target under 44px was a location's "Clocker link" (94x20). It is now 44px tall. Help has none left. | `owner-b-settings.css:64-65` | Band back links are 32px tall on tablets and the Payroll tabs 36px (shared, see Needed). |
| Nov 14 BR-14, RA-24 | already fixed | The email warning is on Add employee. More and Help have their own loading shapes. | `new-employee-form.tsx:46`, `b-loading.tsx:56-57` | None |

## What changed, by screen

- **Payroll and Settings closed to a Manager, `/app/restricted`, Add to calendar closed**: one state screen at every width
  (band, title, one card with the lock circle, reason, sentence, tinted pill, optional text link). An Employee's notices
  are drawn as before.
- **Company profile**: reason under each locked value; Save appears after a change; 1px card edge; first field at 22px.
- **Features and team terms**: sub-line reasons, 16px lock, locked switch, one card per section from 768px.
- **Positions**: flat edit panel, side-by-side Cancel and Save from 768px, flat field in the Add position dialog.
- **Locations**: place name wraps. **A location**: Clocker link target 44px.
- **Settings hub**: tablet column order. Phone group labels in the fill grey.
- **Company policies, Branding, Break types, Clocker tablets, Clocker PINs, Payroll settings, Help**: grey text on the
  canvas in `--b-grey-on-fill` at 13.5/18. No layout change.
- **Add employee, edit person, New location, edit location, Break types, Clocker tablets, Positions**: one error style
  and sentence form.
- **Profile**: Access row and "can change this" lines for a Manager; avatar on the wide band; phone layout of the rows.
- **More**: one card and a Sign out pill from 768px. Phones unchanged (four cards, measured).
- **Insights**: bar shape; Attendance tiles with no data left out.

## Wording changed (old to new)

- Closed Payroll, Manager: "Jose Natal can give you payroll access." to "Your part is timecards. Jose Natal runs payroll
  after you approve them." New: "Open Timecards", "See my pay". Desktop "Back to Home" button removed for a Manager.
- Closed Settings, Manager: "Jose Natal can change a setting for you." to "You can change scheduling rules. For anything
  else, ask Jose Natal." New: "Open Scheduling rules". The old sentence stays when the Manager has no Scheduling rules.
- Closed Settings sub-pages, Manager: new "{Section} is/are part of Settings, which only Owners can change. Ask Jose
  Natal." Sections: Company profile, Locations (workspace word), Branding, Features and team terms, Company policies,
  Positions, Break types, Clocker tablets, Clocker PINs, Punch photos, Payroll settings. Without a name: "Ask an Owner."
- "Insights is for Owners and Managers." to "Insights is for Owners and Managers" (an Employee sees this one).
- "Calendar links are for Employees and Leads." to "Calendar links are for Employees and Leads".
- Add employee and edit person: "Enter first name" to "Enter a first name"; "Enter last name" to "Enter a last name";
  "Enter mobile phone" to "Enter a mobile phone number"; "Choose location" to "Choose a location"; "Enter employee ID" to
  "Enter an employee ID"; "A ten-digit phone number" to "Enter all 10 digits of the phone number".
- Periods removed: "Enter a {location} name.", "Enter a short name.", "Use lowercase letters, numbers and single hyphens,
  like downtown-office.", "Enter your business name.", "Enter a position name.", "Enter a break name.", "Choose a
  classification.", "Enter whole minutes, from 1 to 1,440.", "Enter a tablet name.", "Choose a location.", "Check this
  entry."
- "Enter a timezone, such as America/New_York." to "Enter a time zone, such as America/New_York".
- Profile, Manager: lock with the name "Read-only" to "Jose Natal can change this." (or "An Owner can change this.").
  New row: "Access", "Manager, all locations" or "Manager, {names}" or "Manager"; "Schedule, time, team and requests.
  Payroll and Settings are for Owners."; for a Manager kept to some locations "Schedule and team at your locations.
  Payroll and Settings are for Owners."; before the read arrives "Payroll and Settings are for Owners."
- Company profile: "Locked while you have shifts" is said under each locked value (same words, was once under the card).
- No payroll or legal wording changed.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` on the final commit: no errors outside `zz-scan/`.
- `npx eslint` on the 31 changed `.ts` and `.tsx` files: clean.
- `npx vitest run --dir src src/app src/components src/lib` on the final commit: 814 files passed, 24 skipped; 12,286
  tests passed, 741 skipped; none failed.
- `npx vitest run --dir src src/app/app/settings src/app/app/restricted src/components/manager-profile
  src/components/owner-only-notice.test.tsx src/app/app/reports src/app/app/more src/app/app/b-viewport.test.ts
  src/app/app/b-foundation.test.ts`: 23 files, 194 tests, all passed.
- The eight tests that failed with the partial work now pass. What each protects is still true and still asserted:
  a Manager is never told an Owner's page is theirs (the assertion now allows the title's `tabindex`); Settings is never
  rendered for a Manager (kept, plus four new cases); the workspace name stays editable and the time zone is not
  submitted when locked (kept; only the note's markup assertion changed); the email break rule (kept unchanged).
- New tests: `owner-only-notice.test.tsx` (6), `settings/wave-c-form.test.ts` (3), four cases in `settings/layout.test.tsx`,
  one in `manager-profile.test.tsx`.
- Browser, real app and real sign-in on fictional data, final commit `d5cff0db`, pictures in `$S/p3e-work/s4` (212):
  - Owner, 20 routes at 1440, 1100, 900, 768 and 390: horizontal overflow 0 on all 100; no console or page errors.
  - Manager, 11 routes at the same five widths: overflow 0 on all 55; titles, sentences and links read from the page.
  - States at 1440, 900 and 390: Add employee with four errors, New location with two, Company profile clean, changed,
    reverted and empty, Positions with a row open. Company profile also at 320: overflow 0.
  - Keyboard: the tinted pill, "See my pay" and Sign out each show a 2px teal focus ring. The session ran with reduced
    motion on; I added no motion.
  - An Employee (fixture `OWN-LUIS`) at 1440 and 390: the closed Insights and Settings notices keep the old layout and
    the filled "Open Time" button.
  - Twelve pages outside the package at 1440 and 390 against the Phase 2 pictures: 20 of 24 have the same height. The
    four that differ are Schedule 1440, Things to do (both) and Payroll 1440; Things to do shows 14 items now and 13 in
    the before picture, and the Payroll before picture predates the base's dropped pay-frequency line.
- The local Postgres of each of my three capture sessions stopped ("Owned cluster stopped" in each log).

Not run: `cap.sh`'s plain sweep (I used its interactive mode on the same runner), the `sparse` workspace, 320px beyond
Company profile, a production build.

## For Codex

1. **OW-026, planned hours by day.** The period report gives planned time per person (`scheduleVsActual`), not per day.
   A per-day list (date, scheduled nanoseconds or null) on `PeriodReports` would be read in
   `src/components/reports.tsx` (`CorpReportsView`, "Hours by day") to draw the light backing bar.
2. **MG-013, Profile.** The profile read (`readManagementProfile`) gives `locations { scope, names }` and contact. It does
   not say what the Manager's access covers, so the sentence under Access is derived in the UI from the scope, mirroring
   `src/lib/navigation.ts`. If that rule changes, the sentence must follow, or the read could carry the covered areas.
   The Owners' names come from `listEmployees()` on the page; a `changedBy` in the read would save that team read.
3. **MG-002, asking the Owner.** The finding notes there is no way to ask the Owner from the closed page. That needs a
   request or notification action. Not built.
4. **OW-036.** A stored number without an area code ("555-0120") cannot be shown as "(787) 555-0120".

## For Jose to decide

1. Sign out on desktop and tablet More is a white pill under the card. The other option was a quiet row inside the card.
2. Tablet Settings: the visual order is now Company, Pay | Clocker, Scheduling. The Tab key still goes Company,
   Scheduling, Clocker, Pay (the page's order, which phones keep). Reordering the page would change the phone order too.
3. The sentence for a Manager kept to some locations is mine: "Schedule and team at your locations. Payroll and Settings
   are for Owners."
4. A Manager's closed pages on desktop no longer show "‹ Home" or "Back to Home"; the sidebar has Home.
5. The validation style now applies to every Owner and Manager form, also in other packages (Add shift and others),
   because the finding says "everywhere". Say so if it should be limited to my screens.
6. The capture fixture's location names use a spaced em dash. That is fixture data. Change it there if wanted.

## Needed from another package

- Shell (`app-shell.tsx`, `navigation.ts`): More lights "Home" in the sidebar, rail and tab bar (TB-009, BR-4); the
  account pill on tablets should open the menu and not More (TB-016).
- Other closed pages a Manager can reach use the old two-layout notice: `my-time/page.tsx`, `requests/hub/page.tsx`,
  `employees/import/page.tsx`. Passing `state` to `OwnerOnlyNotice` there gives the one state card (MG-015).
- `payroll-export/page.tsx`: "Time exports are for Owners and Managers." keeps its period (MG-009 rule).
- Shared frame: band back links are 32px tall at 768 and 900 (`.q-nav__l`, `.c-nav__back`, `.c-formhead__up`); the
  Payroll tabs are 36px there (seen on Payroll settings).

## Not verified

- A Manager kept to some locations, a Manager with no My pay, and an Owner without payroll setup access: unit tests only.
  The fixture Manager has company-wide access.
- The locked switch's thumb lock outside Chromium. Safari gets `-webkit-mask-composite: xor`; I did not open Safari.
- A real phone or tablet. Widths were emulated in desktop Chromium.
- Saving Company profile after a change, and the Save button hiding after a successful save (code path only).
- Loading, offline and failed states of Insights and Profile were not captured on purpose. One failed profile read
  appeared by chance during a busy moment and drew "Couldn't load" twice, "Manager" and Try again, as intended.
- A "503" console error appeared a few times on pages left open while six builders shared the machine (the local
  database logged statement timeouts). A 36-load probe of the shell's polls found none. I could not name the request.
- Observed, not fixed: on Add employee (desktop), pressing Next while the phone field holds a partial number shows the
  phone error on blur, which moves Next 24px; that first press is lost. It was so before this work.
