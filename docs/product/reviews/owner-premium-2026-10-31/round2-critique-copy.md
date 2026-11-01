# Owner premium, round 2: design critique and copy pass (Oct 31)

Branch `claude/owner-premium-20261031` (source read only at `.claude/worktrees/owner-premium`, head `97a3bca9`), local
preview with fictional data, signed in as QAOWNER (Carmen Ortiz, Isla Verde Cafés). Nothing was submitted or saved, no
server was started or stopped, and no app code changed.

Method: `design:design-critique` structure (first impression, usability, hierarchy, consistency, accessibility) per page;
`anthropic-skills:stop-slop` and `anthropic-skills:better-writing` over every visible string (rendered text was dumped from
the live pages, plus error maps in the source).

Severity: **Critical** (hurts trust, a fixed decision, or reads as unfinished), **Moderate** (inconsistent or slows the
Owner down), **Minor** (polish).

## Evidence

All paths are under `.claude/r1-tools/crit-design/`.

| Set | Path |
|---|---|
| Phone 390x844, WebKit, every page (viewport frames `-0`, `-1`…) | `cap/webkit-QAOWNER-light-390x844/` |
| Desktop 1440x900, Chromium, every page | `cap/chromium-QAOWNER-light-1440x900/` |
| Phone interactions: Schedule "…" sheet, Find cover, timecard sheet, person, time off request, Who's working, tablet sheet, Add employee step 2, payroll details, Insights "How these are counted", Sam Ortiz timecard | `int/w-*.png` |
| Desktop interactions: timecard sheet, Schedule options, Find cover, avatar menu, ⌘K search, Insights period menu | `int/d-*.png` |
| Contact sheets used for this review | `sheets/p1–p6` (phone pages), `s1–s5` (Settings and sub-pages), `i1–i3` (phone interactions), `d1–d10` (desktop), `di1–di3` (desktop interactions), `m1` (approved boards) |
| Rendered text inventories | `text-390.txt`, `text-390b.txt`, `text-1440.txt` |

Probes: every phone page renders in Inter (A1 is done), buttons are 44px everywhere, no horizontal overflow at 390,
no touch target under 44px on phone pages. Type sizes in use: 11, 12, 13, 15, 16, 17, 20, 22 (Time exports alone uses 11
of them in 6 sizes).

## Overall impression

The upgrade fixed the foundations: one typeface, one button height, one card radius, calm grey rows, a real wordmark. It
now reads as a tidy app, but not yet as Gusto. Three things hold it back:

1. **The words.** Several pages still talk like the database: "D2 canonical effective entries", "immutable snapshots",
   "Payroll population and handoff", a UUID as a hint, "Revision 1". Time uses four verbs for one action (review,
   approve, finalize, approval opens) and four hour formats (8 h 2 min, 24.1 h, 151h, 24h 7m).
2. **Status colour is back.** Red and amber numbers on Home, a red-bordered shift on Schedule, and amber or red pills
   ("2 need setup", "Waiting", "Not filled", "Due in 2 days", "Live") restate what the row already says.
3. **Patterns drift between pages.** Four phone header shapes, three ways to close a sheet (Done, Close, X), tablet sheet
   with four stacked full-width buttons, desktop widths of 640, 720, 760 and 990 with no rule, and a desktop timecard
   sheet that drops from the top bar like a phone sheet.

None of the top fixes needs new data. Most are copy and CSS.

---

## 1. Critique per page

### Home (`/app`)
Evidence: `cap/webkit-…-390x844/app-0.png`, `cap/chromium-…-1440x900/app-0.png`, board `../mock/C-Owner.png`.

| | Finding | Severity | Fix |
|---|---|---|---|
| Works | Greeting, one teal "Find cover", three cards, setup progress in words. Matches the C-Owner board structure. | | |
| Doesn't | "No clock-in **1**" in red and "Open shifts **3**" in amber. Two status colours in one card; the rule is ink and grey, red once for a real problem. | Critical | Ink numbers. If one item is urgent, a single red line under the stats ("Sam Ortiz hasn't clocked in"). |
| Doesn't | "Clocked in 0 of 1": unclear what 1 is (people scheduled right now). | Moderate | "On shift now · 0 of 1". |
| Doesn't | Payday card says "Approvals open after Sunday". It doesn't say what to do, and Home never mentions the 3 pay periods that were never run (Payroll leads with them in red). | Moderate | Copy now: "Approve timecards Mon, Nov 2". Unpaid periods on Home is Wave B (needs data on Home). |
| Doesn't | Things to do card lists "Time off requests 1" but not the open shifts or missed clock-in that make up the sidebar's "5". Counts don't add up across Home, sidebar and Things to do. | Moderate | Show the same 5 in the card or drop the sidebar badge to what the card shows. |
| Doesn't | Desktop: two thin columns at the top of a 990px area, rest empty; "Find cover" sits in a card that reads as a phone card stretched. | Minor | Keep content, set Home to the 720px single column on desktop or give the right column the Payroll card at full height. |

### Things to do (`/app/inbox`)
Evidence: `app_inbox-0.png` (both sizes), board `O-Inbox.png`.

| | Finding | Severity | Fix |
|---|---|---|---|
| Works | Grouped list, one line plus detail, chevrons, no Approve buttons in the list (decisions on the detail page). | | |
| Doesn't | "Shifts (4)" holds 3 open shifts and Sam Ortiz's missed clock-in. Different jobs under one heading. | Moderate | "Open shifts (3)" and "Missed clock-in (1)" (the aria labels already split them this way). |
| Doesn't | "Time off requests · Shift requests · Later and past" float as small centred text links under the cards; they look like a footer. | Moderate | One card "More lists" with three rows and chevrons. Rename "Later and past" to "Older items". |
| Doesn't | Open shift time "All day" and "2:00 PM – midnight" here vs "2:00 PM / 12:00 AM" on Schedule. | Minor | One format: "2:00 PM – 12:00 AM" or "midnight" everywhere. |
| Doesn't | Phone title is the 17px nav title; Home, Schedule, Time use the 22px large title. Same tab, two header styles. | Minor | Pick one for second-level pages (see Consistency). |

### Time off request (from Things to do)
Evidence: `int/w-request.png`.

Works: name, date, reason, "Others off" check, Decline and Approve side by side, "Alexandra gets a notification either way."
This is the best decision page in the app. Doesn't: amber "Waiting" pill (Minor, drop; the page only opens for waiting
requests). The list page `/app/requests` is titled "Time off" with a different header (back plus large title): Minor.

### Schedule (`/app/schedule`) and its "…" sheet
Evidence: `app_schedule-0.png` (both), `int/w-sched-more.png`, `int/d-schedmore.png`, `app_schedule_coverage-0.png` (error).

| | Finding | Severity | Fix |
|---|---|---|---|
| Works | Week strip, today list, desktop grid with people rows and hours; "Published" is clear. | | |
| Doesn't | First open shift has a red border and red title; the next two open shifts are grey. Red signals "problem" but they are the same kind of item. | Critical | No red border. Open shift rows identical; the dashed + avatar already marks them. |
| Doesn't | "Find cover" repeated three times as teal text on one screen. | Moderate | Row tap opens Find cover; keep the teal link only on desktop hover, or show "Find cover" once in a summary row ("3 open shifts · Find cover"). |
| Doesn't | Schedule options sheet: 7 rows, larger type than every other list, no dividers, one row with an icon ("Print schedule"), dismiss is "Close". "This week · Oct 26 – Nov 1" doesn't say what it does. | Moderate | Same row style as Settings, no icon, "Done". Name the row by its action (A12: "Publication details"). |
| Doesn't | Error state: "The shift information is incomplete or outside this week." renders as raw pink text touching the card edge (`app_schedule_coverage-0.png`). | Moderate | Use the kit error card; copy in the table. |
| Doesn't | Desktop "Open shifts · 24 this week" uses a red tile icon. | Minor | Grey icon or none. |
| Doesn't | Hour formats: "4 shifts · 6 h", "6 people · 151h", "32h". | Minor | "151 h", "32 h" (see copy). |

### Find cover (`/app/schedule/coverage?...`)
Evidence: `int/w-findcover.png`, `int/d-findcover.png`, board `O-FindCover.png`.

| | Finding | Severity | Fix |
|---|---|---|---|
| Works | Shift summary first, honest empty state with two next steps. | | |
| Doesn't | Copy says "No one meets this position, **lead**, location and availability". Lead is on hold. | Critical | Remove "lead" (copy table). |
| Doesn't | Red "Not filled" pill restates "Open shift". | Moderate | Drop the pill. |
| Doesn't | Board shows Post as open shift / Assign / Not available list; build shows a dead-end style empty state. | Moderate | Wave B (needs data). |

### Timecards (`/app/timecards`) and timecard sheet
Evidence: `app_timecards-0/1.png` (both), `int/w-timecard.png`, `int/w-noclockin.png`, `int/d-timecard.png`, board `G-O-Time.png`.

| | Finding | Severity | Fix |
|---|---|---|---|
| Works | Week segment, summary card, team list with hours, desktop table with Recorded / Breaks / Status. | | |
| Doesn't | Every row says "Needs review" while the page says approvals don't open until after Sunday, and the sheet ends with a grey "Approve after Nov 1". The status asks for something the Owner can't do yet. | Critical | Label mapping only: while the period is open, show "In progress"; "Ready to approve" after it closes. |
| Doesn't | "None approved yet" at 17px plus an empty progress bar: a big zero state with no next step (rule 4). | Moderate | One line: "You can approve from Mon, Nov 2". Hide the bar until approvals open. |
| Doesn't | Tab bar says "Time", page says "Timecards", back links say "Time". | Moderate | Tab, sidebar, title and back links: "Timecards". |
| Doesn't | Sheet: "Period information" grey box with one bullet; stats "Entries 1"; dismiss "Done" (Schedule sheet uses "Close", tablet sheet uses X). | Moderate | One sentence, no bullet. "Clock-ins 1". One dismiss word. |
| Doesn't | Desktop timecard sheet drops from under the top bar as a phone sheet at 1440. | Moderate | Right-side panel (Gusto pattern) or centred dialog. |
| Doesn't | Phone list shows Ana Colón "Draft · 0 min"; desktop shows "6 people with no time yet · 0 h". Same data, two treatments; "Draft" is unexplained. | Minor | Use the desktop treatment on phone. |
| Doesn't | "Export time" and "Time corrections" as teal link rows inside the team card. | Minor | Their own card, ink text with chevrons (like Team's tools card). |

### Time corrections (`/app/timecards/corrections`)
Evidence: `app_timecards_corrections-0.png` (both).

Works: plain empty state. Doesn't: header row "Correction requests 0" above "No correction requests" says the same thing
twice (Moderate, drop the header row when empty); intro and empty copy are wordy (copy table); back label "Time" (see
Timecards). Desktop uses the 720 width while Timecards uses 990 (Minor).

### Who's working (`/app?view=attendance`)
Evidence: `int/w-whosworking.png`. Works: clean. Doesn't: green "Live" pill (Minor, drop); last row "Clock-ins and
corrections" is a third name for Time corrections (Moderate, copy table).

### Payroll (`/app/payroll`)
Evidence: `app_payroll-0.png` (both).

| | Finding | Severity | Fix |
|---|---|---|---|
| Works | Unpaid periods lead in one red notice (A6), one teal "Prepare payroll", recent payrolls say "Approved" and never "Paid". | | |
| Doesn't | Two status signals for one fact: grey pill "Due in 2 days" in the header and "Not prepared yet" in the footer. | Moderate | One line under the title: "Prepare by Mon, Nov 2". |
| Doesn't | Phone has "Settings" and "Pay history" buttons in the title row; desktop has tabs "Payroll · Time exports · Payroll settings" plus a "Pay history" button and a duplicate "Time exports" card. | Moderate | Same entry points on both. Desktop: drop the Time exports side card (the tab exists). Phone: rename "Settings" to "Payroll settings" or move it to a row at the bottom with Time exports. |
| Doesn't | Two rows read "Oct 12 – 18", one starting "Correction ·". | Minor | "Oct 12 – 18 · Correction" as the title so the two rows differ at a glance. |

### Payroll details (from a recent payroll)
Evidence: `int/w-payrollrow.png`. Works: "No amounts are saved" keeps the trust rule (no fake zero); "not sent to a bank"
is honest. Doesn't: filenames are the row titles (Moderate; name first, as A11 asks for Pay history); "Revision 1
approved." as a footnote (Minor); "Neutral file" is jargon (copy table).

### Prepare payroll (`/app/payroll/prepare`)
Evidence: `app_payroll_prepare-0/1.png` (both).

| | Finding | Severity | Fix |
|---|---|---|---|
| Works | Up next card, list of periods with no payroll, "Choose dates" for anything else. | | |
| Doesn't | The red notice and the "Periods with no payroll" card say the same thing twice ("3 pay periods weren't run" / "3 earlier pay periods have no payroll yet. Start with the oldest."). | Moderate | Keep the red notice; drop the card's intro sentence. |
| Doesn't | Payroll's teal "Prepare payroll" lands on a page whose main button is an outlined "Prepare draft", with three teal "Prepare" links below. No primary action. | Moderate | One filled primary for the oldest unpaid period (the trust-first order), outlined for the others. Names: "Prepare payroll" (copy table). |
| Doesn't | Explainer "A draft checks approved time. It doesn't approve timecards, approve payroll or send a payment." reads as a disclaimer. | Moderate | Copy table (keeps the no-payment promise). |

### Pay history (`/app/payroll/history`)
Evidence: `app_payroll_history-0/1.png` (both).

| | Finding | Severity | Fix |
|---|---|---|---|
| Works | Name first on statements (A11 partly done), View and download aligned. | | |
| Doesn't | Each statement is four lines: dates, "Correction of Oct 12 – Oct 18 · Published to employee", the filename, "Revision 1" (wraps to "Revision / 1" at 390). | Critical | Two lines: "Alexandra Rivera" / "Oct 12 – 18 · Correction · Shared". Filename and revision move into View. |
| Doesn't | Two date formats on one page: "Oct 12 – 18" (payrolls) and "Oct 12 – Oct 18" (statements). | Moderate | "Oct 12 – 18". |
| Doesn't | Heading "Private employee statements". | Minor | "Pay statements". |

### Time exports (`/app/payroll-export`)
Evidence: `app_payroll_export-0.png` (both).

| | Finding | Severity | Fix |
|---|---|---|---|
| Doesn't | Most system-sounding page left: "Payroll population and handoff", "Provider file setup", "0 people · 0h", "9 not finalized", "Finalize approved timecards". | Critical | Copy table. |
| Doesn't | One radio option ("CSV file") shown as a choice. | Minor | Show as a fact: "File · CSV (opens in Excel or Numbers)". |
| Doesn't | Amber "3 timecards still need approval" (status colour) next to a disabled button. | Moderate | Grey text with the link: "Approve 3 timecards first · Review timecards". |
| Doesn't | Six type sizes on one page (11/12/13/15/16/17). | Minor | Map to the kit scale. |

### Team (`/app/employees`)
Evidence: `app_employees-0/1.png` (both).

Works: search, avatars in neutral grey, name plus position, tools card at the bottom. Doesn't: "Show all 9" while the
card already shows 8 and other pages say "See all" (Minor); outlined "+ Add" competes with nothing on the page and could be
the page's one teal action (Minor); Team list says "Barista · Condado" for Ana Colón and Luis Medina, who are Managers, and
Priya Lal, a Lead (aria says so) (Moderate, label shows position only; add role when it isn't Employee, except Lead, on hold).

### A person (`/app/employees/AR0142`)
Evidence: `int/w-person.png`, `cap/chromium-…/app_employees_AR0142-0.png`.

Works: call and message buttons, three plain rows. Doesn't: card header "Employee ID AR0142" is the first thing you read
(Moderate; move the ID to the detail line); "Access and sign-in · Employee · No Clocker PIN · Active" mixes role, PIN and
status (Moderate, copy table); page is thin (Wave B: hours, next shift, rate).

### Add employee (`/app/employees/new`)
Evidence: `app_employees_new-0/1.png` (both), `int/w-addemp2.png`, `text-390.txt` (error state).

| | Finding | Severity | Fix |
|---|---|---|---|
| Works | Two steps, Cancel / Next in the header, Role and Location side by side, 16px fields. | | |
| Doesn't | Role list offers "Lead". Lead is on hold. | Critical | Remove the option. **Not presentation-only** (role data); needs Jose/Codex sign-off. |
| Doesn't | Step 2 opens with "Employee ID" already red and "Enter employee ID" before the Owner has typed anything. | Moderate | Validate on Add, not on arrival. Not presentation-only (client validation timing). |
| Doesn't | The Owner must invent an employee ID ("e.g. 10482"). | Moderate | Wave B: suggest one. |
| Doesn't | Error "Employee could not be saved. Check that the ID and email are unique and the selected locations and positions are active." | Moderate | Copy table. |
| Doesn't | Desktop: 640px card, Cancel / Next at the bottom; phone puts them in the header. | Minor | Fine as a desktop form; align width to 720. |

### More (`/app/more`)
Evidence: `app_more-0.png` (both). Works: short, profile first, red Sign out. Doesn't: icons in rows (Insights, Updates,
Settings, Help) while every other list is text only (Minor; the O-More board has them, so keep or drop on all lists, not
some). Desktop: More page with a "‹ Home" back link duplicates the sidebar's More group (Minor; hide on desktop).

### Settings (`/app/settings`) and sub-pages
Evidence: `app_settings-0/1.png`, `sheets/s1–s5.png`, desktop `app_settings_*-0.png`.

| Page | Finding | Severity | Fix |
|---|---|---|---|
| Settings | Works: four groups, values on the right. "Break types · Set up" looks like a button. "Features and words" is unclear. | Minor | Value "None yet". Rename (copy table). |
| Company profile | "Business name" label sits outside the card, Time zone and Week starts inside a card; looks like two forms. Save in the header. Screen readers hear a long engineering sentence about time zone conversion. | Moderate | One card with three rows. Copy table. |
| Locations | Clean. "2 locations · 9 employees" header plus "9 employees" on each row (both locations show 9). | Minor | Header "2 locations". |
| Branding | Two saves ("Save" in header, "Save brand" below), helper "Buttons in #077572.", preview says "Main Street" and "Front desk" instead of their café. | Moderate | One Save. Preview with "Condado" and "Barista". Drop the hex. |
| Features and words | Disabled Time off toggle with "Decide it first." | Minor | Copy table. |
| Company policies | Legal footnote "They don't change pay, discipline or legal entitlements." "Private labor settings". | Moderate | Copy table. |
| Positions, Break types | Footnotes of 2–3 sentences; "0 break types" header above "No break types yet". | Minor | Drop the count header when empty; copy table. |
| Scheduling rules | Back link says "Schedule" when opened from Settings. "How swaps and cover are appro…" truncates at 390. | Moderate | Back to where you came from (needs a referrer param: not presentation-only). Shorter row text. |
| Clocker tablets | Amber "2 need setup" pill repeats "Needs setup" on each row; rows have device icons; setup steps look like tappable rows; the only button is outlined "Add another tablet" while no tablet is set up yet. | Moderate | Drop the pill. Steps as a numbered list (board O-ClockerDevices). Primary: "Set up Condado iPad". |
| Tablet sheet | Four full-width stacked buttons (Get setup code, Save name, red Revoke access, Cancel) plus an X. Left-aligned title, unlike the other sheets. | Critical | One primary ("Get setup code"), name saves on Done, "Remove tablet" as quiet red text at the bottom, no Cancel button. Same header as other sheets. |
| Employee PINs | Segments "Active · 9 / Not set · 9 / Inactive · 0" overlap (the same 9 in two tabs); rows show IDs ("QAOWNER") instead of positions. | Moderate | "No PIN · 9 / PIN set · 0". Detail line: position. |
| Punch photos | The feature is unavailable, but the page shows the full form: 4 toggles, a stepper, two text areas, **four** buttons (Save company settings, Reload saved settings, Save assistance settings, Reload assistance settings) and a "Current company notice" written for an auditor. | Critical | Collapse to one card: "Punch photos aren't available yet" plus the one toggle to turn them on later. One Save. Hide Reload buttons. Partly presentation; hiding forms needs Codex to confirm nothing depends on them. |
| Clocker recovery | Hint shows a UUID ("like 12345678-1234-…"); "Check a saved action", "Receipt"; tab bar highlights Team. | Critical | Copy table. Tab highlight: Settings context (not presentation-only if it depends on route). |
| Payroll settings | "Exceptions · None", "Periods start", "Notices and documents", "Audit details" read as system fields. Back link "Payroll" though it's listed in Settings. | Moderate | Copy table. |
| Week templates | Label "Name" and the button both say "Save this week" with the card header. | Minor | Copy table. |

### Updates (`/app/updates`) and Notifications (`/app/notifications`)
Evidence: `app_updates-0.png`, `app_notifications-0.png` (both). Works: good empty states, "New update" in the header.
Doesn't: Updates empty state has no button while "New update" sits in the header corner (Minor; add "Write an update" in
the card); Notifications highlights the Home tab (Minor).

### Insights (`/app/reports`)
Evidence: `app_reports-0.png` (both), `int/w-insights-how.png`, `int/d-insights-period.png`.

| | Finding | Severity | Fix |
|---|---|---|---|
| Doesn't | "How these are counted" opens 11 bullets of engineering language: "D2 canonical effective entries", "immutable snapshots", "append-only history", "observation". | Critical | Three plain bullets (copy table). |
| Doesn't | Desktop has two period controls: top-bar menu (This week so far / Last week / Last 30 days / Custom period…) and the segment (This week / Last week / Month). "Month" vs "Last 30 days". | Moderate | Keep one (the top-bar menu has more); remove the segment on desktop. |
| Doesn't | "24.1 h recorded" (decimal), chart labels "24h 7m", Timecards "8 h 2 min". | Moderate | "24 h 7 min". |
| Doesn't | Attendance shows "—" for Late clock-ins and Cover filled. A dash reads as "missing". | Moderate | Words: "None" when zero; "No cover requests" when there were none. |
| Doesn't | Week label "Oct 26 – 31" where every other page says "Oct 26 – Nov 1". | Minor | "Oct 26 – 31 so far". |

### Shell: desktop sidebar, top bar, menus
Evidence: `int/d-avatar.png`, `int/d-search.png`, any desktop capture.

- Avatar menu has "Your profile" and "Profile and device settings": two doors to one room (Moderate, merge into "Your profile").
- "Powered by VELANI LLC" at the bottom of every sidebar (Minor; move to Help/About, Jose's call).
- ⌘K says "Add a shift"; Schedule says "Add shift" (Minor).
- Desktop page widths: Home, Schedule, Timecards, Payroll, Insights about 990px; Things to do, Corrections, Prepare,
  Pay history, Team, More, Settings, Clocker, Updates about 720px; Notifications about 760px; Add employee 640px. Two
  widths are right (720 single column, 990 tables); Notifications and Add employee are off (Minor).

## Consistency summary

| Element | Issue | Recommendation |
|---|---|---|
| Phone header | Four shapes: wordmark + bell (tabs), back + centred 17px title (most sub-pages), back + large 22px title (Time off), back + Edit with no title (Your profile). Long titles shift off centre (Company profile, Features and words). | Tabs: wordmark. Everything else: back + centred title, truncate long titles. |
| Sheets | Dismiss is "Done" (timecard), "Close" (Schedule options), X (tablet). Title centred in two, left in one. | Centred title, grabber, "Done". |
| Status | Pills: Published (green), Needs review, Draft, Waiting (amber), Not filled (red), Due in 2 days, Live (green), 2 need setup (amber). | Keep "Published" and "Needs review"-type pills only where they change what the Owner does; grey; never amber or green. |
| Colour | Red used on Home stats, Schedule first open shift, Not filled, Payroll notice, Revoke access, Sign out. | Red only for the unpaid-periods notice and destructive text. |
| Hours | 8 h 2 min · 24.1 h · 151h · 32h · 0h · 24h 7m · 6 h | "8 h 2 min"; totals "151 h"; never decimals. |
| Dates | Oct 12 – 18 · Oct 12 – Oct 18 · Copy Oct 19 – Oct 25 · Oct 26 – 31 | "Oct 12 – 18", month repeated only when it changes. |
| Links to lists | See all · Show all 9 | "See all". |
| Row icons | Icons on More rows, tablet rows, Print schedule, none elsewhere. | Text rows everywhere except More (as on the board). |
| Saves | Header Save + body Save (Branding, Company policies aria), two Saves + two Reloads (Punch photos), Save name + Done (tablet). | One Save per form, in the header on phone, in the title row on desktop. |

## Accessibility notes (from what was run)

- Contrast: grey filenames on Pay history (`statement-…pdf`) are the lightest text in the app; check against 4.5:1 when
  they move into View.
- Touch targets: none under 44px on phone pages. Desktop reports small targets in the top bar and grid cells (pointer use,
  acceptable).
- Screen reader text that the visible copy doesn't match: Home "5 things need you today."; Company profile time-zone
  sentence; Team rows announce "Manager" and "Lead" roles that the screen doesn't show.
- Not run this round: keyboard order and focus rings page by page, VoiceOver, reduced motion, loading skeletons, offline.

---

## 2. Copy table

Voice target: a café owner reading between orders. Short, specific, second person where it helps, no disclaimers,
no system nouns. "Approve" for timecards and payroll; "review" only as a link to look at something; "finalize" removed.

| # | Page | Current text | Proposed text | Reason |
|---|---|---|---|---|
| 1 | Tab bar, sidebar, back links | Time | Timecards | One name per place (page is "Timecards") |
| 2 | Home | Clocked in · 0 of 1 | On shift now · 0 of 1 | Says what "1" is |
| 3 | Home | Today · Condado · 1 needed | Today · Condado · Needs 1 person | Plain |
| 4 | Home | Approvals open after Sunday | Approve timecards Mon, Nov 2 | Next step with a date, not a rule |
| 5 | Home | 1 of 2 steps done · Next, set weekly hour targets | 1 of 2 done · Next: weekly hour targets | Shorter |
| 6 | Home (screen reader) | 5 things need you today. | 5 things to do today | Matches the card title |
| 7 | Things to do | Shifts (4) | Open shifts (3) + Missed clock-in (1) | One kind of item per heading |
| 8 | Things to do, Schedule | No clock-in | Missed clock-in | Same term as Company policies ("Missed clock-ins") |
| 9 | Things to do | No clock-in · ended 2:00 PM | Shift ended 2:00 PM | Heading already says missed clock-in |
| 10 | Things to do | Later and past | Older items | Plain |
| 11 | Things to do | All day (open shift time) | Open all day | "All day" alone reads like a time-off value |
| 12 | Things to do | 2:00 PM – midnight | 2:00 PM – 12:00 AM | Same format as Schedule |
| 13 | Time off list | Time off (title) | Time off requests | Same name as the Home row and ⌘K |
| 14 | Time off list | Waiting · 1 | Waiting (1) | Count style used elsewhere: "Shifts (4)" |
| 15 | Time off request | Others off Mon, Nov 16 · None | Also off that day · No one | Human |
| 16 | Time off request | That week's schedule · See who's working that week | See that week's schedule | One line says it |
| 17 | Who's working | Clock-ins and corrections · Review flagged clock-ins and time corrections | Time corrections | Third name for one page |
| 18 | Who's working | People appear here when they clock in. | They show up here when they clock in. | Warmer, shorter |
| 19 | Schedule | 4 shifts · 6 h / 6 people · 151h / 32h | 4 shifts · 6 h / 6 people · 151 h / 32 h | One hour format |
| 20 | Schedule options | Close | Done | One sheet dismiss word |
| 21 | Schedule options | Activity · Publications and changes | Activity · What changed and when | No system noun |
| 22 | Schedule options | This week · Oct 26 – Nov 1 | Publication details · Published Oct 26 – Nov 1 | Name the action (A12) |
| 23 | Schedule options | Copy Oct 19 – Oct 25 into this week | Copy Oct 19 – 25 into this week | Date format |
| 24 | Schedule options | Templates · Reusable weeks | Week templates · Save a week and reuse it | Same name as the page |
| 25 | Schedule options | Scheduling rules · Coverage and hour targets | Scheduling rules · Staffing and weekly hours | Matches the rows on that page |
| 26 | Schedule error | The shift information is incomplete or outside this week. | Couldn't open that shift. Pick it again from this week. | What happened and what to do |
| 27 | ⌘K search | Add a shift | Add shift | Same as the Schedule button |
| 28 | Find cover | Not filled (pill) | (remove) | Repeats "Open shift" |
| 29 | Find cover | Best fit first · 0 people free | Who can cover · No one free | Plain; no big zero |
| 30 | Find cover | No one is free for this shift | No one is free | Card title says which shift |
| 31 | Find cover | No one meets this position, lead, location and availability right now. You can still add the shift for someone, or change what this time needs. | Everyone is busy, off or not set up for Condado. You can still give the shift to someone. | Lead is on hold; shorter |
| 32 | Find cover | Add shift for someone | Give to someone | Verb plus object, shorter |
| 33 | Find cover | Change coverage needs | Change what's needed | Plain |
| 34 | Timecards | None approved yet | You can approve from Mon, Nov 2 | Zero state with next step (rule 4) |
| 35 | Timecards | Approvals open after Sunday, Nov 1. | (remove, merged into 34) | Redundant |
| 36 | Timecards (status, period open) | Needs review | In progress | Owner can't act until the period closes |
| 37 | Timecards (desktop tab) | Need review | Ready to approve | Matches status; one verb |
| 38 | Timecards | Draft (Ana Colón, 0 min) | No time yet | "Draft" is unexplained |
| 39 | Timecards | Team (9) · See all | Team (9) | List already shows the team |
| 40 | Timecards | Export time | Time exports | Same name as the page |
| 41 | Timecards (screen reader) | 9 timecards in this period. | 9 timecards this week | Shorter |
| 42 | Timecard sheet | Period information · Period is still open · Totals can change until the period ends. Approval opens after Nov 1. | This week isn't over. Hours can still change. You can approve from Mon, Nov 2. | No bullet, no system heading |
| 43 | Timecard sheet | Entries | Clock-ins | Plain |
| 44 | Timecard sheet | Days · Puerto Rico time | Days | Every time in the app is Puerto Rico time |
| 45 | Timecard sheet | Punches and corrections | Clock-ins and fixes | "Punches" is industry slang |
| 46 | Timecard sheet | Approve after Nov 1 | You can approve from Mon, Nov 2 | Same sentence as the page |
| 47 | Timecard sheet | No hours recorded in this period. | No hours this week | Shorter |
| 48 | Time corrections | Fixes employees asked for. The original clock record is kept. | Fixes your team asked for. You'll always see the original time. | Second person, reassurance first |
| 49 | Time corrections | Correction requests · 0 | (remove header when empty) | Repeats the empty state |
| 50 | Time corrections | No correction requests · No employee time corrections are waiting for review. | Nothing to fix · When someone asks to fix a time, it shows up here. | Says what fills the page |
| 51 | Payroll | Settings (button) | Payroll settings | Not the app's Settings |
| 52 | Payroll | 3 pay periods weren't run | 3 pay periods have no payroll | Same words as Prepare; "run" is jargon |
| 53 | Payroll | Oldest: Sep 21 – 27 · payday was Tue, Sep 29. | Oldest is Sep 21 – 27 (payday Sep 29) | Shorter |
| 54 | Payroll | Start with Sep 21 – 27 | Prepare Sep 21 – 27 | Verb names the action |
| 55 | Payroll | Due in 2 days (pill) + Not prepared yet | Prepare by Mon, Nov 2 | One status, a date |
| 56 | Payroll | Correction · Payday Tue, Oct 20 · Approved | Oct 12 – 18 · Correction / Payday Tue, Oct 20 · Approved | Tell the two Oct 12 rows apart in the title |
| 57 | Payroll, Pay history | Recent payrolls · See all | Recent payrolls · Pay history | Link names its destination |
| 58 | Payroll | Time exports · Send hours to payroll or a file | Time exports · Send hours to your payroll provider | "Payroll or a file" is unclear |
| 59 | Prepare payroll | Prepare draft | Prepare payroll | One name for the action |
| 60 | Prepare payroll | A draft checks approved time. It doesn't approve timecards, approve payroll or send a payment. | Adds up approved hours. Nothing is approved or paid until you say so. | Keeps the trust promise in one human sentence |
| 61 | Prepare payroll | Periods with no payroll · 3 earlier pay periods have no payroll yet. Start with the oldest. | Periods with no payroll | Red notice already says it |
| 62 | Prepare payroll | Another period · Choose dates · Prepare a draft for dates outside your pay schedule. | Other dates · Choose dates | Header and link say it |
| 63 | Payroll details | No amounts are saved for this payroll. | No pay amounts were entered for this payroll. | Same honesty, plainer |
| 64 | Payroll details | statement-AR0142-oct05.pdf · Published to employee | Alexandra Rivera · Shared Oct 13 | Name first; no filename |
| 65 | Payroll details | Create correction · A linked draft that needs its own approval | Fix this payroll · Starts a correction you approve separately | Verb first, plain |
| 66 | Payroll details | Prepare payment instructions · Neutral file · not sent to a bank | Bank file · NEVORA doesn't send money | Trust promise in plain words |
| 67 | Payroll details | Revision 1 approved. | Approved | "Revision 1" is internal |
| 68 | Pay history | Private employee statements | Pay statements | Shorter; privacy is implied |
| 69 | Pay history | Oct 12 – Oct 18 · Payday Tue, Oct 20 | Oct 12 – 18 · Payday Tue, Oct 20 | Date format |
| 70 | Pay history | Correction of Oct 12 – Oct 18 · Published to employee | Correction · Shared | Shorter |
| 71 | Pay history | Replaced by a correction · Published to employee | Replaced by a correction | Sharing state is the same on every row |
| 72 | Pay history | statement-AR0142-oct12.pdf · Revision 1 | (move into View) | Filename and revision are internal |
| 73 | Time exports | Pay period: Oct 26 – Nov 1 · This week | Week: Oct 26 – Nov 1 (this week) | Shorter |
| 74 | Time exports | Send to · CSV file · Opens in Excel or Numbers | File · CSV (opens in Excel or Numbers) | Not a choice when there's one option |
| 75 | Time exports | 0 people · 0h | No approved timecards yet | Zero in words (rule 4) |
| 76 | Time exports | 3 timecards still need approval | Approve 3 timecards first | Instruction |
| 77 | Time exports | Finalize approved timecards to export them. Review timecards | Approve timecards to export them. Go to Timecards | One verb; link names destination |
| 78 | Time exports | People in this export · 0 selected · 9 not finalized. | People in this export · None approved yet | "Finalized" is a second verb |
| 79 | Time exports | Other dates · Up to 31 days of finalized time | Other dates · Up to 31 days | Same |
| 80 | Time exports | Provider file setup · Columns and IDs for your payroll system | File format · Columns your payroll provider needs | Plain |
| 81 | Time exports | Payroll population and handoff · Who is paid this period, and where the files went | Who's included and sent files · People in this payroll and where files went | Jargon |
| 82 | Time exports | Create export | Download export | Says what happens |
| 83 | Team | 9 employees · 0 working now | 9 people · No one working now | Zero in words |
| 84 | Team | Show all 9 | See all | One link term |
| 85 | Team | Hours this week · Scheduled hours, person by person | Hours this week · Scheduled hours for each person | Plain |
| 86 | Team | Add (button) | Add employee | Verb plus object (aria already says it) |
| 87 | Person | Employee ID AR0142 (card header) | (move to detail line: Barista · Condado · ID AR0142) | ID isn't the first thing you need |
| 88 | Person | Access and sign-in · Employee · No Clocker PIN · Active | Sign-in and PIN · No Clocker PIN yet | Says the one thing to act on |
| 89 | Add employee | Role: Lead (option) | (remove) | Lead is on hold; needs Jose/Codex |
| 90 | Add employee | Location: Choose | Choose a location | Placeholder that names the field |
| 91 | Add employee | Employee ID · It stays the same after it's created. | Employee ID · You can't change this later. | Second person |
| 92 | Add employee | Enter employee ID (shown on arrival) | Add an employee ID (only after Add) | Error only after an attempt |
| 93 | Add employee | Positions · None yet | Positions · Choose positions | Field placeholder, not a state |
| 94 | Add employee error | Employee could not be saved. Check that the ID and email are unique and the selected locations and positions are active. | Couldn't add this person. That employee ID or email is already in use. | What happened, how to fix |
| 95 | Add employee error | Enter a first and last name with no more than 160 characters each. | Enter a first and last name. | Limit is never hit by people |
| 96 | Add employee error | Enter a valid email address, or leave the optional email field empty. | Check the email, or leave it blank. | Shorter |
| 97 | More | Owner · Isla Verde Cafés | Owner · Isla Verde Cafés | Keep |
| 98 | Avatar menu (desktop) | Your profile / Profile and device settings | Your profile | Two doors, one room |
| 99 | Avatar menu | Signed in as Carmen Ortiz | (remove; name is on the button) | Redundant |
| 100 | Settings | Features and words | Features and team terms | Says what "words" means |
| 101 | Settings | Break types · Set up | Break types · None yet | Value, not a button |
| 102 | Settings | Employee PINs | Clocker PINs | Same as the person page |
| 103 | Company profile (screen reader) | Changing the business timezone requires a separately reviewed conversion because operational records already exist. | Time zone is locked because you have shifts and timecards. Contact support to change it. | Human, actionable |
| 104 | Locations | 2 locations · 9 employees | 2 locations | Rows already show people |
| 105 | Locations | Each location keeps its own schedule. | Keep | Good |
| 106 | Branding | Buttons in #077572. | (remove) | Hex code |
| 107 | Branding | Save brand (plus header Save) | Save (header only) | One Save |
| 108 | Branding | Front desk · Main Street / Clock in on the Main Street tablet | Barista · Condado / Clock in on the Condado tablet | Their café, not sample data |
| 109 | Features and words | Your team's words | What to call people and places | Plain |
| 110 | Features and words | 1 request for time off is waiting for a decision. Decide it first. | Answer the waiting time off request before turning this off. | Says why and what to do |
| 111 | Features and words | Breaks on the Clocker | Breaks on the tablet | "Clocker" vs "tablet" used for the same device |
| 112 | Company policies | Applies to · Whole company | Applies to · All locations | Concrete |
| 113 | Company policies | Alert me about | Tell me about | Warmer |
| 114 | Company policies | Overtime risk / Very long shifts | Close to overtime / Very long shifts | Plain |
| 115 | Company policies | Alerts only flag recorded times for review, from each rule's start date. They don't change pay, discipline or legal entitlements. | Alerts only flag times for you to check. They never change pay. | No legal tone |
| 116 | Company policies | Private labor settings · Owner only | Who can see these · Owner only | Plain |
| 117 | Company policies | Policy history · None | History · No changes yet | Words for zero |
| 118 | Positions | 2 positions (header) | (remove) | Repeats the list |
| 119 | Positions | Open a position to rename it or archive it. Archived positions stay on past shifts and timecards. Some people work more than one position. | Tap a position to rename or archive it. Past shifts keep their position. | Two short sentences |
| 120 | Break types | 0 break types (header) | (remove when empty) | Repeats the empty state |
| 121 | Break types | Add the breaks your team takes. | Add the breaks your team takes, like a 30-minute meal. | Example helps |
| 122 | Break types | Changes apply to future breaks only. Earlier breaks keep their recorded settings. | Changes apply to new breaks only. | Second sentence repeats the first |
| 123 | Scheduling rules | Used when you build a draft and before you publish. | NEVORA checks these when you build and publish a schedule. | Active voice |
| 124 | Scheduling rules | Weekly hours targets · Hours each person aims for | Weekly hours · Target for each person | Shorter |
| 125 | Scheduling rules | Staffing per location · Fewest people on each shift | Staffing · Fewest people on a shift | Shorter |
| 126 | Scheduling rules | Recurring coverage · Shifts that repeat every week | Weekly coverage · Shifts you need every week | Plain |
| 127 | Scheduling rules | Trades and coverage · How swaps and cover are approved | Swaps and cover · Who approves them | Truncates at 390 today |
| 128 | Scheduling rules | Availability deadline · Team updates availability by · Not set | Availability due · Not set | Shorter |
| 129 | Clocker tablets | 2 need setup (pill) | (remove) | Each row says it |
| 130 | Clocker tablets | Needs setup · Isla Verde Condado | Not set up · Condado | Shorter location name, used everywhere else |
| 131 | Clocker tablets | Set up a tablet in 3 steps | Set up a tablet | Count shows in the list |
| 132 | Clocker tablets | 2. Tap the tablet above, then Get setup code. | 2. Tap the tablet above and get a code. | Plain |
| 133 | Clocker tablets | 3. Pick the location. People use their PIN. | 3. Pick the location. Your team clocks in with their PIN. | Clear subject |
| 134 | Clocker tablets | Add another tablet | Add tablet | None is set up yet; "another" is wrong |
| 135 | Tablet sheet | Not connected yet. Get a setup code, then enter it on the tablet. The name shows in this list only. | Not set up yet. Get a code, then type it on the iPad. | Short, specific |
| 136 | Tablet sheet | Device name | Tablet name | Same noun as the page |
| 137 | Tablet sheet | Save name | (saves on Done) | One Save |
| 138 | Tablet sheet | Revoke access | Remove tablet | Nothing to revoke on a tablet that never connected |
| 139 | Tablet sheet | Cancel | (remove; Done in header) | One way out |
| 140 | Employee PINs | Active · 9 / Not set · 9 / Inactive · 0 | No PIN (9) / PIN set (0) | Tabs overlap today |
| 141 | Employee PINs | People · All 9 not set | People · None have a PIN yet | Words |
| 142 | Employee PINs | AC0109 (row detail) | Barista · Condado | IDs are internal |
| 143 | Employee PINs | Each person uses their own PIN on a registered tablet. Existing PINs are never shown. | Each person clocks in with their own PIN. You can't see a PIN once it's set. | Second person |
| 144 | Employee PINs | Find an employee | Search by name | Placeholder style used on Team |
| 145 | Clocker PIN (person) | 4 digits, different for each person. | 4 digits. Each person needs their own. | Plain |
| 146 | Punch photos | Photo capture is unavailable · You can save your preferences. Photo collection is not active on your tablets. | Punch photos aren't available yet · You can choose your settings now. | Human; no "collection" |
| 147 | Punch photos | Ask for punch photos · When capture is available, save a photo with the punches you pick. | Take a photo at clock-in · Starts when photos are available | Plain |
| 148 | Punch photos | Which punches need a photo? | When to take a photo | Plain |
| 149 | Punch photos | Keep photos for (days) · Choose 1–30 days. A shorter period also applies to existing photos. Increasing it applies only to new photos. | Keep photos for · 1 to 30 days. Shortening it deletes older photos. | Says the consequence |
| 150 | Punch photos | Save company settings / Reload saved settings / Save assistance settings / Reload assistance settings | Save | One Save; no Reload |
| 151 | Punch photos | Photo notice & assistance · Company: Isla Verde Cafés. The company name follows your company profile. | Help for your team | System note |
| 152 | Punch photos | Use a real person, team or contact method employees can reach for questions and assisted clock actions. | Who your team can ask for help, like "Carmen, 787-555-0100". | Example over rule |
| 153 | Punch photos | Explain how to request help or an accessible alternative. Instructions appear as one paragraph on Clocker. | How to ask for help. Shows on the tablet. | Shorter |
| 154 | Punch photos | Current company notice · Photo cleanup and backup details are still being verified; photo collection remains unavailable. Saving assistance does not publish a notice or activate photo collection. | (remove; covered by 146) | Auditor tone |
| 155 | Clocker recovery | Help requests · No one has asked for help. | Help requests · No one needs help right now | Warmer |
| 156 | Clocker recovery | Check a saved action | Check a tablet code | Plain |
| 157 | Clocker recovery | Shown on the employee's tablet, like 12345678-1234-1234-1234-123456789abc. | The code on the tablet screen | No UUID |
| 158 | Clocker recovery | Check | Check code | Verb plus object |
| 159 | Clocker recovery | Receipt | What was saved | Plain |
| 160 | Clocker recovery | Time wrong or missing? · Fix it in Timecards | Keep | Good |
| 161 | Payroll settings | How often · Weekly | Pay schedule · Weekly | Matches the section |
| 162 | Payroll settings | Periods start · Mon, Sep 21 | First period · Started Mon, Sep 21 | Clear meaning |
| 163 | Payroll settings | Notices and documents | Reminders and pay statements | Says what's inside |
| 164 | Payroll settings | Reminders · Off | Payroll reminders · Off | Specific |
| 165 | Payroll settings | Document language · English | Pay statement language · English | Specific |
| 166 | Payroll settings | Exceptions · None | People with different settings · None | "Exceptions" is vague |
| 167 | Payroll settings | Audit details · Last change Oct 31 · Carmen Ortiz | Change history · Carmen changed this Oct 31 | Plain, active |
| 168 | Week templates | No saved weeks yet / Save this week / Name / Save this week | No templates yet / Save this week as a template / Template name / Save template | Label and button said the same thing |
| 169 | Updates | No updates yet · Tell your team about hours, menus or events. Updates you send show up here. | No updates yet · Tell your team about hours, menus or events. + button "Write an update" | Second sentence is implied; add the action |
| 170 | Notifications | Requests, changes and alerts for you show up here. | You'll see requests and schedule changes here. | Second person |
| 171 | Insights | Labor hours · 24.1 h recorded | Hours worked · 24 h 7 min | One hour format; plain |
| 172 | Insights | Late clock-ins · — | Late clock-ins · None | Dash reads as missing |
| 173 | Insights | Cover filled · — | Cover filled · No requests | Same |
| 174 | Insights | Oct 26 – 31 · All locations | Oct 26 – 31 so far · All locations | Explains why not Nov 1 |
| 175 | Insights | Hours by day · 24.1 h total | Hours by day · 24 h 7 min | Same format |
| 176 | Insights (chart labels) | Mon, Oct 26: 24h 7m / Tue, Oct 27: 0h | Mon, Oct 26: 24 h 7 min / Tue, Oct 27: no hours | Same format; zero in words |
| 177 | Insights | How these are counted (11 bullets: "D2 canonical effective entries", "immutable snapshots", "append-only history", "observation"…) | How we count · Hours come from clock-ins and include breaks. · Late means after the scheduled start. It doesn't change pay. · These are not payroll hours. | Engineering notes in front of an Owner |
| 178 | Insights (desktop segment) | This week / Last week / Month | (remove; keep top-bar menu: This week so far / Last week / Last 30 days / Custom) | Two period controls |
| 179 | Error page | This page could not be loaded · Your current information is unavailable. · Try loading the page again before taking an action. | This page didn't load · Check your connection and try again. | Human, short |
| 180 | Loading timeout | Timecards is taking longer than usual | This is taking longer than usual | Grammar breaks with plural page names |
| 181 | Sidebar (desktop) | Powered by VELANI LLC | (move to Help) | Legal line on every screen; Jose's call |

**Count: 181 rows; 178 propose a change** (rows 97, 105 and 160 keep the text; 12 of the 178 are removals).

Strings not verified: notification and update text with real content (both lists are empty in the fixture), Find cover
with someone available, success notices after Approve, Publish or Save (never submitted), payroll amounts, and the
Edit shift, Add shift and Build draft flows.

---

## 3. Top 10 changes by premium impact per effort

| # | Change | Why it moves "premium" | Effort | Presentation only? |
|---|---|---|---|---|
| 1 | **Rewrite the engineering copy**: Insights "How these are counted", Punch photos notices, Clocker recovery UUID hint, Time exports jargon, Payroll details, Company profile time zone line (copy rows 63–67, 73–82, 103, 146–159, 177). | Nothing says "unfinished" faster than "D2 canonical effective entries". | S | Yes (copy) |
| 2 | **One vocabulary for time**: "Timecards" everywhere (tab, sidebar, back links); "approve" as the only verb (no finalize, no "approval opens"); status "In progress" while the week is open; one hour format "8 h 2 min" and one date format "Oct 12 – 18" (rows 1, 19, 34–47, 69, 77–79, 171–176). | Gusto feels calm because each thing has one name. | S | Yes (labels and formatting). Mapping "Needs review" to "In progress" is a label choice on an existing state; confirm with Codex that the state is reliable. |
| 3 | **Calm the colour**: ink numbers on Home; no red border on Schedule's first open shift; drop the "2 need setup", "Not filled", "Waiting", "Live", "Due in 2 days" pills; red only for unpaid periods and destructive text. | Removes the "status dashboard" look Jose rejected; rule 8 and the Oct 23 colour rule. | S | Yes |
| 4 | **Punch photos collapsed to one card** while the feature is unavailable: one toggle, one Save, no Reload buttons, no auditor notice. | The single most cluttered screen (4 buttons, 2 forms) for a feature that does nothing yet. | S–M | Mostly. Hiding the assistance form needs Codex to confirm nothing reads it before photos ship. |
| 5 | **One sheet pattern**: centred title, grabber, "Done"; tablet sheet reduced to one primary ("Get setup code"), name saves on Done, "Remove tablet" as quiet red text; desktop sheets as a right-side panel instead of a phone sheet dropped from the top bar. | Sheets are where the app feels most like a phone port; one pattern reads as designed. | M | Yes |
| 6 | **Pay history and Payroll details as name-first, two-line rows**: drop filenames and "Revision 1" from rows (into View), "Pay statements" heading, one date format. | Pay is where Owners judge trust; four grey lines per row look like a file browser. | S–M | Yes, if names come from authoritative data (A11 rule: never parsed from filenames). |
| 7 | **Payroll flow says one thing once**: drop "Due in 2 days" pill for "Prepare by Mon, Nov 2"; Prepare page has one filled primary for the oldest unpaid period, "Prepare payroll" as the only name; remove the duplicate "Periods with no payroll" sentence; desktop drops the duplicate Time exports card. | The money flow should be the calmest, most obvious path in the app. | S | Yes |
| 8 | **Remove Lead from Owner surfaces**: "lead" in Find cover copy now; the "Lead" role option in Add employee next. | Fixed decision; an Owner seeing a role that isn't supported erodes trust. | S | Copy: yes. Role option: **no** (role data; needs Jose and Codex). |
| 9 | **Things to do and Home agree**: split "Shifts (4)" into Open shifts and Missed clock-in; one "More lists" card instead of floating text links; Home Payday card says what to do and when; sidebar badge equals what Home lists. | First screen and the to-do list are the Owner's daily loop; mismatched counts feel broken. | S | Yes (unpaid periods on Home stays Wave B). |
| 10 | **One phone header and one desktop width rule**: back + centred title for every second-level page (Time off requests, Your profile); 720px for lists and forms, 990px for tables (fix Notifications 760 and Add employee 640); one Insights period control on desktop. | Pages that line up feel engineered; drift is what makes "better, but overall" true. | M | Yes. Back links that depend on where you came from (Scheduling rules, Payroll settings, Clocker recovery's tab highlight) need a route or referrer change: **not** presentation-only. |

Also worth doing, outside the top 10: Add employee validates on arrival (Moderate, not presentation-only); Employee PINs
tabs overlap and show IDs (S, presentation); Branding single Save and real preview (S); Settings row icons decision for
More (Jose's call against the board).

## Gaps (not checked this round)

Keyboard and focus order page by page, VoiceOver, reduced motion and loading skeletons, offline banner, 1024 and 320
widths, Firefox, any state after a submit (approve, publish, save, setup code), Find cover with an available person,
payroll amounts, Edit shift / Add shift / Build draft, Compose update, the desktop bell popover (the click timed out on
the selector; not captured).
