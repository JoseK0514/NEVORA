# Reference board: Find cover review and the one-location manager's Home and Schedule

- **Author:** UX Researcher, Nov 22, 2026.
- **For:** the Product Designer and the UX and UI designers, ahead of the first two Direction B redesigns.
- **Status:** research input. No app code was changed. Scorecards are drafts; the Product Designer sets the final
  scores and Jose picks a direction at Checkpoint 2.
- **Rules applied:** [DESIGN.MD](../../../DESIGN.MD) "Current direction" and the Nov 15 and Nov 21 refinements,
  [TEAM-RULES.md](../TEAM-RULES.md), the design OS skill (`.claude/skills/nevora-design-os/`, density and voice) and
  [docs/design/voice.md](../../design/voice.md).

## Summary

1. **Find cover review** has 105 words on the published case. It names Ana Colon twice and the date twice, and its
   two notes and checkbox add 52 words. The data it needs for "who replaces whom" and for hour warnings is not in the
   page's read today, so two of the directions depend on a data decision (see [Data limits](#data-limits)).
2. **The one-location manager's Home and Schedule** still use the pre-Direction B panels. The Schedule is about 390
   words, and the location name appears on all 20 shift rows. The full-access manager already has Direction B versions
   of both screens, so the cheapest familiar fix is to give the scoped manager those screens.
3. **Patterns to adopt:** old → new on one line; warnings counted and placed next to the action they affect; the
   notification stated as a consequence beside the button; a button that names the outcome and replaces the consent
   checkbox; the location as a label when there is only one; a day strip plus one day's list on phones.
4. **Recommended:** 1A (Change card) for the review and 2A (Same screen, one location) for Home and Schedule. Both
   score 15 of 16 in the draft scorecard.

## Today's screens

### Screen 1: Review replacement (`/app/schedule/new?review=`)

Evidence: `docs/product/page-inventory/thumbs/om/C3-M-390.webp`, `C3-Mg-390.webp`, `C3-M-1440.webp`; code in
`src/app/app/schedule/new/page.tsx:62-145`.

| What | Today | Rule it breaks |
|---|---|---|
| Frame | Old `PageBand` on a grey canvas; no teal band | DESIGN.MD Current direction |
| Facts | Six label/value rows: Person, Day, Time, Location, Position, Shift lead | Density 1: the person and date are also in the summary line; "None needed" and "Not needed" are routine values shown every time |
| Notes | "This fills the staffing requirement" (23 words) and "Published schedule change" (29 words), stacked | Density 5: the first note is shown on every visit |
| Consent | A required checkbox: "I also approve publishing this replacement and queuing the applicable employee notifications." (13 words) | Voice: audit words ("queuing", "applicable") in the main text |
| Actions | Full-width teal "Save replacement" and a full-width white "Back to coverage", which repeats the back link | One primary; Cancel only closes |
| Words | 105 on the published case, excluding the tab bar | |

### Screen 2: Home and Schedule for a manager limited to one location

Evidence: `thumbs/le/B1-Ml-390.webp`, `B1-Ml-1440.webp`, `C1-Ml-390.webp`, `C1-Ml-1440.webp`,
`thumbs/fill/B1-Ml-768-tab.webp`, `B1-Ml-1024-tab.webp`, `C1-Ml-768-tab.webp`, `C1-Ml-1024-tab.webp`; code in
`src/components/company-access/scoped-operational-views.tsx:33-75`.

| Screen | Today | Rule it breaks |
|---|---|---|
| Home | Heading "Home" and "Your locations"; a card "Your managed locations" holding one name, View schedule and View team, and a 22-word paragraph about company-wide access; then "Clocked in now" with "Updates every 30 seconds while this page is open" and Refresh. About 64 words before the rows | No band; density 5 (the access paragraph shows on every visit); two actions on one card |
| Schedule | A 28-word description; "Posted open shifts"; Add shift; week stepper; a Location select with a separate "Show schedule" button; seven day cards where every row repeats "Northside Bakery — Condado" and "Published"; a roster of 12 people, most at "0h 0m". About 390 words | Density 1 and 2 (location and status on every row); "0h 0m" rows are noise; a form submit for a filter |
| Full-access equivalent | `thumbs/om/B1-M-390.webp` (Home) and `C1-M-390.webp` and `C1-M-1440.webp` (Schedule) already use the band, glass figures, week card with a day strip and open-shift dots, and the Today list | This is the pattern a manager meets if an Owner later grants company-wide access |

### Data limits

These decide which directions can ship without a backend change.

- **The review's read carries:** the replacement's ID and name, the shift's date, times, location, position, lead flag,
  and whether the week is published (`projectCoverageSelection`, `src/lib/data/coverage-repair.server.ts:147-150`).
- **It doesn't carry the person being replaced.** A coverage gap is a staffing shortfall, not a person. The approved
  leave repair knows the person on leave (DESIGN.MD, Nov 9 "Shifts to fill"), but that name doesn't reach this page.
- **It doesn't carry hours or soft warnings.** The ranking already computes them for each candidate
  (`src/lib/scheduling/coverage-ranking.ts:26-40`): `scheduledHours`, `targetHours` and validation warnings such as
  `TARGET_HOURS_EXCEEDED`, `AVAILABILITY_NOT_SUBMITTED` and `PREFERENCE_NOT_MET`
  (`src/lib/scheduling/validate-shift.ts:115-148`). Candidates with blocking issues or operational warnings never
  reach the review (`eligible` requires both empty, line 191). The selection drops the rest.
- **Notification is not optional.** A published save queues the employee's notification; the server requires
  `publicationConsent` and offers no "don't notify" path (`page.tsx:126-129`). A Notify toggle like 7shifts' or
  Amie's would need a server change.
- **Location-limited managers can't save a replacement** from this page: they get "Add draft shift" or "Ask the
  Owner" (`page.tsx:119-122`). Every direction needs that state.
- **The scoped Schedule read carries:** locations, shifts (person, date, times, location, position, draft or
  published), each person's scheduled minutes in scope, open shifts with a Find cover link, and a Build and publish
  link when the manager holds that grant (`scoped-operational-views.tsx:46`). Home reads only the location list and the
  clock monitor.

## Method

- **Mobbin:** 18 searches (screens and flows, iOS and web), retrieved Nov 22, 2026. Mobbin has Deputy and 7shifts on
  web. It doesn't have Homebase, When I Work, Sling, Square Team, Gusto (web) or Rippling screens for these tasks, so
  those come from their help centres.
- **Web:** vendor help pages, Apple's Human Interface Guidelines and Nielsen Norman Group. The 7shifts and Deputy help
  pages returned HTTP 403 to the fetcher; their rows below rely on search-result text and are marked so.
- **Skills:** the role's listed skills (`mobbin-design`, `jakobs-law`, `peak-end-rule`, `doherty-threshold`,
  `gesture-patterns`, `navigation-patterns`, `heuristic-evaluation`) are not installed in this checkout. I used the
  NEVORA design OS references (`density.md`, `voice.md`) and the Mobbin tool directly.
- **Word counts** on reference screens are approximate counts of visible words in the Mobbin capture, excluding the
  status bar, the app's own navigation and Mobbin's footer.

## References for screen 1: reviewing a change that affects another person

| # | App and screen | What changes, before → after | Where warnings go | Words | Actions | Confirmation and notification wording | Take |
|---|---|---|---|---|---|---|---|
| 1 | **Linear**, project update composer [M1] | One line per changed field: "Priority · No priority → Urgent", "Target date · Not set → Apr 15th" | None | ~70 | "Post update" bottom right; "Save as draft" as text top right | None | The old → new line. Only changed fields get an arrow |
| 2 | **Turo**, Confirm changes (flow "Changing dates and location") [M2] | New end time "12:30 PM" with the old "12:00 PM" struck through under it; start time unchanged, no strike | An info note ("Free cancellation…") under the totals | ~70 | One full-width primary, "1 step to go" | After: "You've successfully changed your trip" toast | Strike the old value only where it changed. Avoid the vague button label |
| 3 | **Linear**, Retire team [M3] | Consequences as rows with an icon and a count: "13 issues will be canceled", "3 projects will become read-only", "Cycles will be disabled" | The consequences are the body | ~60 | "Cancel" quiet, "Retire team" red, right-aligned | Button repeats the verb | Each consequence is one row with a number, not a paragraph |
| 4 | **Deel**, Approve payroll? [M4] | A five-row fact table (entity and period, employees, cost) | One info note above the facts | ~55 | "No, Go Back" and "Yes, Approve Payroll" | "Once approved, you will be able to proceed with payments" | Facts as a compact table. Avoid Yes/No buttons (voice.md: repeat the verb) |
| 5 | **Revolut Business**, Review transfer [M5] | Facts grouped: Arriving, Amount, Fees, From, Recipient | A warning card with ⚠ at the top ("Do you know and trust …?") | ~45 | One centred "Send"; "Save draft" as a text link top right | Plain verb | A warning that can stop you goes first; the draft is a quiet secondary |
| 6 | **Melio**, Payment and bill details [M6] | Status, amount, payee, method | Amber "Action required: make sure this payment is approved before Dec 2, 2025" heads the panel | ~60 in panel | "Approve" bottom right; everything else under "More" | Deadline in the warning | One primary; the rest in a menu (density rule 4) |
| 7 | **Employment Hero**, Leave request clashes [M7] | The request card (Marie Curie, 15 days) with Decline and Approve | "Leave request clashes 1" listed under the decision, naming the other person and dates | ~50 | Decline red, Approve green, per card | None | A clash is shown as the person and dates it clashes with, beside the decision |
| 8 | **Deputy**, Invite to work (Find replacement flow) [M8], [F1] | Shift block on grey: "Thursday, 26 February 1:30 pm – 3:00 pm · Support, ASMobbin" | Candidates split into "Recommended" and "Not recommended"; each shows week hours ("18h 0m", "27h 0m"); one carries a "Stressed" flag | ~35 | "Send invite (1)": the button carries the count | Prefilled message "Would you like to work this shift?" | Week hours beside the person; the button counts what it sends |
| 9 | **7shifts**, Publish Schedule popover [M9] | Lists the departments being published | Toolbar chips "2 Conflicts", "1 Overtime" with "Fix warnings"; overtime also on the person's row ("5h Total OT") | ~45 | "Publish now" | "Who would you like to notify? ● Notify everyone ○ Don't notify anyone". After: toast "Schedules published." [M10] | Notification as an explicit line next to the action; warnings counted once, detail on the row |
| 10 | **Amie** (web), Edit recurring event [M11] | "1 CHANGE ›" collapses the diff | None | ~25 | "Notify guests" toggle on the left of "Discard" and "Update event" | The toggle is the notification decision | Put the notify state beside the button that triggers it |
| 11 | **HoneyBook**, Notify invitees? [M12] and **Amie** (iOS), Update event [M13] | n/a | n/a | ~20 | Two buttons that each name the outcome: "Notify by email" / "Schedule without notifying"; "Notify" / "Don't notify" | "Send an email to let invitees know you are scheduling this session." | Both options say what happens; no "OK" |
| 12 | **Airbnb**, Are you sure? (withdraw a request) [M14] | n/a | ⚠ icon over the title | ~35 | "Withdraw request" primary, "Remind host" secondary | "Eric should respond by 17:30 tomorrow. You'll be refunded if you don't get a response." | Name the other person and when it affects them. Avoid "Are you sure?" as a title |

**Also seen (supporting):**

- **Remote**, time-off request [M15]: the figure leads ("5 hours", "Nov 24"); Decline and Approve sit side by side in
  a bar pinned to the bottom of the phone screen.
- **Mercury**, reimbursement panel [M16]: Approve, Decline and More inline under the amount on a desktop side panel.
- **Stripe**, Radar risk setting [M17]: "Baseline → Projected" figures, the same arrow pattern on numbers.
- **Airtasker**, Reschedule task [M18]: "C L. has been notified of the rescheduled due date." This claims delivery;
  NEVORA can't (voice.md "Truthful").
- **Meetup**, event cancelled [M19]: "Attendees will get an update that … is no longer happening." Future tense, closer
  to what NEVORA can truthfully say.

**What the workforce apps say (help centres, not screens):**

| App | Source and date | What it says |
|---|---|---|
| 7shifts | [Approve or Deny Shift Pool Requests](https://kb.7shifts.com/hc/en-us/articles/4417505005459), undated, page blocked to the fetcher; search-result text | Trades that cause conflicts, overtime or labour infractions are flagged, viewed with a "Conflicts" button; managers are told to review overtime and exception warnings before approving |
| When I Work | [Processing Shift Requests](https://help.wheniwork.com/articles/processing-shift-requests-computer), updated Mar 18, 2026 | "Approve" or "Deny"; users on the request are notified automatically; denying notifies only the person who asked (mobile) |
| Sling | [Available shifts, shift swaps and shift offers](https://support.getsling.com/en/articles/12824084-available-shifts-shift-swaps-and-shift-offers), updated Mar 24, 2026 | The original employee stays responsible until the manager approves; both employees are notified once it's approved |
| Square Team | [Manage schedule requests](https://squareup.com/help/us/en/article/8388-manage-schedule-requests), undated | "Approve" or "Decline"; the team member gets a push notification with the result |
| Deputy | [Find Replacement](https://help.deputy.com/hc/en-au/articles/4688987465743), undated, page blocked; search-result text | Deputy notifies the original person that they're no longer required to come in |
| Homebase | [Shift swapping](https://www.joinhomebase.com/employee-scheduling/shift-swapping), marketing page, undated | Approve or deny from the phone; an accepted trade shows "request accepted, pending manager final approval" |
| Apple HIG | [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts), [Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets), read Nov 22, 2026 | Title the cancel button "Cancel"; don't give a destructive action the primary role; avoid alerts for common, undoable actions |
| Nielsen Norman Group | [Confirmation dialogs](https://www.nngroup.com/articles/confirmation-dialog/), read Nov 22, 2026 | Overused confirmations get clicked through; the text must name what the person agrees to |

Gusto and Rippling: no screen for approving a change to another person's shift was found on Mobbin, and their public
help pages don't describe one, so this board leaves them out.

## References for screen 2: one location's Home and week schedule

| # | App and screen | Phone or desktop | What it shows | Words | Actions | Take |
|---|---|---|---|---|---|---|
| 0 | **NEVORA**, full-access Manager Home and Schedule (`thumbs/om/B1-M-390.webp`, `C1-M-390.webp`, `C1-M-1440.webp`) | Both | Band with greeting and three glass figures; Things to do; week card with a day strip, open-shift dots and a Published pill; Today list; desktop week grid | Home ~120, Schedule ~90 above the fold | One white band action ("Add shift") | The scoped manager's nearest familiar pattern is inside NEVORA |
| 1 | **7shifts**, Here's what's happening [N1] | Desktop | Tabs "Sales vs. Labor · Who's working? · Location Overview"; rows "2 time off requests ›", "1 employee to invite [Invite employees]"; a day timeline of who works, with the location picker | ~70 | One button per row that needs one | Home rows count what needs you; who's working is a day view |
| 2 | **7shifts**, schedule week [N2] | Desktop | Location "SLMobbin"; "2 Overtime" chip and "Fix warnings"; "5h Total OT" on the person; headcount per day; "Publish schedule" top right | dense | One primary, top right | Warnings counted once in the toolbar, detail on the row |
| 3 | **Deputy**, schedule week [N3], [N4] | Desktop | Location selector ("ASMobbin" or "All Locations"); "Open shifts" pinned as the first row; "All shifts published" status pill; footer legend "9 published · 2 open shifts · 0 warnings" | dense | "Publish 13 shifts" carries the count | Publish state is one pill; open shifts first |
| 4 | **Deputy**, shift popover [N5] | Desktop | Person, date, time, area; "Total 5h"; "Can't work ▾" opens "Offer shift" and "Swap shift" | ~20 | One menu button | Secondary actions behind one menu |
| 5 | **Fresha**, Scheduled shifts [N6] | Desktop | Day headers carry the day's hours ("21h 55mins"); the person cell carries week hours ("38h", "No shifts") | ~80 | "Add" top right | Hours once per person and once per day, inside the grid, not a separate roster |
| 6 | **Shopify**, store home [N7] | Phone | The store name is the header; one figure strip; "1 Order to fulfill" tile; "That's it for now" when nothing is left | ~35 | Tiles are the actions | One location's name is the page's identity, not a card |
| 7 | **Whatnot**, Seller Hub [N8] | Phone | "Today's Tasks: You're all caught up"; Upcoming list with two rows | ~45 | Two pills on top | A verified empty line instead of an empty card |
| 8 | **Jobber**, Home [N9] | Phone | Date line at top; "Business health: Job value, Visits scheduled · This week" | ~40 | FAB | A week's figures as two rows, not a dashboard |
| 9 | **Binance**, Calendar [N10] | Phone | Week strip with small markers under days that have events; the week as a list grouped by day ("20 Monday", "21 Tuesday") | ~30 visible | Filter icon | Markers under the day strip; a grouped list under it |
| 10 | **ClassPass**, studio schedule [N11] | Phone | Day tabs; list grouped by day; time and length on the left, class and instructor on the right, one sub-line | ~60 | Row tap | Time leads, two-line rows |
| 11 | **Open**, studio schedule [N12] | Phone | The studio ("Venice 001") is the title; week strip; time column; person under each class | ~50 | Row tap | Location as title when there is one; person on the row |
| 12 | **Gusto Mobile**, Calendar [N13] | Phone | A left date column ("Thu 15") with a card per event; teal cards on a light canvas | ~25 | Close | Date rail plus card, close to Direction B's colours |

## Patterns to adopt

| # | Pattern | Seen in | How it lands in NEVORA |
|---|---|---|---|
| P1 | **Old → new on one line, only for what changes.** Unchanged facts are plain | Linear [M1], Turo [M2], Stripe [M17] | "Open shift → Ana C." on the Who row. Day, time and place have no arrow because they don't change |
| P2 | **Warnings are counted and sit next to the action they affect.** One line each; amber for "check", red only when it blocks; detail on the row it concerns. Always-true explanations go behind an info button | 7shifts [M9], [N2], Melio [M6], Revolut [M5], Employment Hero [M7] | The review's checks block sits right above the button. "Coverage is checked again when you save" moves behind (i) (density 5) |
| P3 | **The notification is a stated consequence, next to the button, naming the person** | 7shifts [M9], Amie [M11], HoneyBook [M12], Meetup [M19] | "Ana C. will see this shift in her schedule. We'll also send her a notification." A toggle isn't possible without a server change (Data limits) |
| P4 | **The button names the outcome and is the consent** | Linear [M3], Deputy [M8], HIG alerts | "Publish change" replaces the checkbox. The button posts `publicationConsent=on`, so the server contract stays. Cancel is the only secondary |
| P5 | **One location is a label, not a control** | Shopify [N7], Open [N12], Deputy [N3] | The band shows "Condado" as a static chip (no chevron) when the manager has one location; two or more get the existing location menu. No "Show schedule" button |
| P6 | **Phones: a day strip plus one day's list. Desktop: a grid with hours inside it** | NEVORA C1-M [0], Binance [N10], ClassPass [N11], Fresha [N6], Deputy [N3] | The scoped Schedule uses the full-access week card and Today list; the roster card goes, its hours move into the grid's name cells |

## Anti-patterns to avoid

- **A consent checkbox in legal tone.** Jira, Pipedrive and Contra use "By checking this box, I confirm…". NEVORA's
  current 13-word checkbox is this pattern. The button is the consent (P4).
- **Yes, No, OK or Confirm buttons.** Deel's "Yes, Approve Payroll" and 7shifts' bare "Confirm · OK · Cancel" dialog
  [M20] break voice.md's "the button repeats the verb".
- **Illustrated, exclaiming warning modals.** 7shifts' "We found some warnings. Let us fix them!" [M21] uses an
  illustration and exclamation marks for a routine check. That fails the Trust rule and voice.md.
- **Claiming delivery.** "C L. has been notified" (Airtasker [M18]) states something NEVORA can't confirm. Say what
  the published schedule shows and that a notification is sent.
- **The same fact three times.** Today's review shows the person and date in the summary and again in the table.
- **The location on every row when there is one location.** Today's scoped Schedule shows "Northside Bakery —
  Condado" 20 times.
- **"0h 0m" rows.** A roster of people with no hours in scope is noise. Show hours only where a person has shifts.
- **A separate submit button for a filter** ("Show schedule").
- **A full person × day grid squeezed onto a phone.** Deputy and 7shifts show their grids on desktop only; on a 390 phone the cells drop below readable size.
- **Two full-width stacked buttons where one is navigation** ("Back to coverage" under "Save replacement").
- **Confirmation dialogs for routine, reversible actions** (HIG, NN/g). The review page is already the confirmation;
  don't add a second "Are you sure?" on top.

## Screen 1 directions: Review replacement

Shared rules for all three:

- **Frame:** Direction B band, back link "Coverage", the card under the band. From 768px, the 812px read column
  (`--b-frame-read`), with the buttons on the block's right edge.
- **Names:** first name and last initial ("Ana C.") per voice.md. Time short on phones ("6 PM – 12 AM"), full from 768
  ("6:00 PM – 12:00 AM"), per `BWhen`.
- **One teal primary.** Cancel is a quiet text button. No "Back to coverage" button; the back link does that.
- **States every direction covers:** draft week; published week with publish permission; published week without it;
  location-limited manager (draft link or ask the Owner); out of date ("Coverage changed", unchanged); saving
  ("Publishing…"); failed save (what happened, then Try again); offline (the band's glass pill; the button is disabled
  with "Publishing needs a connection" under it).
- **Trust wording** (the consequence lines and button names) goes to Jose before it ships (density.md, "How we decide").
- **Spanish** needs 20–30% more room; every line must hold at 390px and at 200% text.

### 1A: Change card (recommended)

Based on Linear's old → new rows [M1], Turo's struck-through change [M2] and 7shifts' notify line [M9].

**Top to bottom (phone, 390):**

1. **Band (196):** back link "‹ Coverage"; title "Review replacement". No figures, no sub-line; the card carries the
   facts.
2. **Card "The change"**, three rows (title plus one line each, a 36px duotone icon circle):
   - Who: "Open shift → Ana C." The old side in grey, the arrow, the new side in ink 600 with her avatar. For a
     can't-work or approved-leave repair, the old side is the person: "Luis M. → Ana C." (needs the data decision).
   - When: "Sun, Nov 22" over "6 PM – 12 AM · 6 h". "Ends Mon, Nov 23" appears only when the shift runs past midnight.
   - Where: "Calle Loíza". Position and "Shift lead" are added to this line only when the shift needs them.
3. **Checks**, between two hairlines inside the same card (Jose's "facts between hairlines" pick):
   - Green tick: "Fills the staffing need" (or "the Baker need", "the lead need").
   - Amber dot, only when true: "42 h this week · target 40" and "Availability not confirmed for this week" (both need
     the data decision; without it, no check lines beyond the first).
   - An (i) button opens "Anything else this shift still needs stays open. Coverage is checked again when you save."
4. **Action area**, at the foot of the card:
   - Published week: one line "Ana C. will see this shift in her schedule. We'll also send her a notification.", then
     the teal "Publish change" and a quiet "Cancel".
   - Draft week: "Draft week. Nobody is notified until you publish." and "Save to draft".
   - No permission: the amber notice "Only someone who can publish schedules here can save this. Ask the Owner." in
     place of the button; no teal button on the page.
   - Location-limited: "Add draft shift" as the primary, with "Saving a replacement needs company-wide access." as the
     one line.

**Phone action placement:** the card's foot, not a pinned bar, so the consequence line and the button read together
and nothing covers the tab bar. If the card is taller than 844 at 200% text, the button still follows the consequence
line in the flow.

**Desktop and tablet:** the same card in the 812px column, 24px under the 196 band; the action row right-aligned
(Cancel, then Publish change).

**Platforms:**

- iOS and Android app, mobile web, PWA: the same layout. The back gesture and Android's back button return to Coverage,
  which loses nothing because the review holds no input.
- Desktop: Enter on the focused primary publishes; Esc does nothing (it's a page, not a dialog).
- Offline: the glass pill sits in the band; the button is disabled with its reason under it.

**Text budget:** at most 45 words on the published case (today 105). Draft case at most 35.

**Draft scorecard (Product Designer sets the final):** Usability 2, Familiarity 2, Trust 2, Accessibility 2, Brand 2,
Durability 2, Cost 2, Continuity 1. **15 of 16.** Continuity is 1 because the page's layout changes; the route,
back link and action name stay.

### 1B: Decision sheet over the cover list

Based on Airbnb's sheet [M14], Remote's pinned decision bar [M15], Amie's and HoneyBook's notify choices [M12], [M13],
and Apple's action sheets.

**Top to bottom:**

1. **The Coverage list stays behind.** Choosing a person opens the review as a bottom sheet on phones and as the
   right-hand panel on desktop (the timecard panel's pattern, DESIGN.MD Nov 7). The `?review=` URL still opens it
   directly, over the Coverage page, so old links keep working.
2. **Sheet header:** the sentence is the title: "Ana C. covers Sun, Nov 22". Sub-line "6 PM – 12 AM · Calle Loíza".
   Close (X) top right.
3. **Checks**, three rows at most, each a dot and words: "Fills the staffing need" (green); "Published week" (teal,
   information); amber hour or availability lines only when true.
4. **Pinned footer:** the consequence line, then two buttons side by side: "Cancel" (white) and "Publish change"
   (teal). On a draft week: "Save to draft".

**Desktop:** a 420px right panel under the top bar; the Coverage list stays visible and scrollable on the left; the
footer is pinned to the panel's foot.

**Platforms:**

- iOS and Android: a sheet with a grabber at medium height. Swipe down and the back gesture close it, which equals
  Cancel. The footer clears the home indicator (safe-area inset).
- Mobile web and PWA: the same sheet. The browser's back closes the sheet, which needs a history entry for it.
- Keyboard: focus moves into the sheet, is trapped while it's open, and returns to the chosen row on close.

**Text budget:** at most 35 words.

**Draft scorecard:** Usability 2, Familiarity 2, Trust 2, Accessibility 1 (focus trap, sheet at 200% text), Brand 1
(sheets are generic), Durability 2, Cost 1 (sheet plus route state), Continuity 1. **12 of 16.**

### 1C: The day in context

Based on Deputy's and 7shifts' schedule views [N2], [N3] and Employment Hero's clashes beside the decision [M7].

**Top to bottom (phone):**

1. **Band (224):** back link "‹ Coverage"; title "Review replacement"; sub-line "Sun, Nov 22 · Calle Loíza".
2. **Decision card** first: Ana C.'s avatar and "Covers the open shift, 6 PM – 12 AM"; the checks (as 1A); the
   consequence line; "Publish change" and Cancel.
3. **Card "That evening at Calle Loíza"**: the location's shifts that overlap 6 PM – 12 AM, as two-line rows. Ana C.'s
   row is marked with a "New" chip; anyone on approved leave or with a can't-work request shows that as a chip. The
   person being replaced appears here, from the schedule read, without changing the review's own read.

**Desktop:** Home's two-column grid from 1024px: the evening list on the left (2fr), the decision card in the right
rail (1fr). Tablets stack them, decision first.

**Platforms:** as 1A. The evening list is a plain list, so screen readers and 200% text need nothing special.

**Text budget:** at most 50 words in the decision card; the evening list is rows (title plus one line).

**Draft scorecard:** Usability 2, Familiarity 1, Trust 2, Accessibility 2, Brand 2, Durability 2, Cost 1 (a second
read on the page), Continuity 1. **13 of 16.**

## Screen 2 directions: Home and Schedule for a one-location manager

Shared rules for all three:

- **Location as a label (P5).** One location: a static chip "Condado" in the band, no chevron. Two or more: the
  existing location menu, with "All your locations" first.
- **Access explanations show once.** The "company-wide access" paragraph leaves Home and Schedule. When the manager
  opens something outside their scope, the existing closed-page state card says whose it is and what to do
  (DESIGN.MD Phase 3, "Closed pages").
- **Rows:** person first, then "7 AM – 3 PM · Kitchen". No location on rows; "Published" shows once in the week card,
  and "Draft" appears on a row only when that row differs from its week.
- **Tablets (768–1023):** the 80px rail the fill thumbnails already show, with Home, Schedule and Team.
- **Offline:** the glass pill in the band; the clock list keeps its last "Updated" time.

### 2A: Same screen, one location (recommended)

The scoped manager gets the full-access Direction B Home and Schedule, filtered to their location. Based on NEVORA's
own B1-M and C1-M [0], Shopify's store-as-title [N7] and Deputy's location selector [N3].

**Home, top to bottom (phone):**

1. **Band:** greeting "Good morning, Daniel"; title is the location, "Condado"; date line "Sunday, November 22".
   Three glass figures: "Clocked in 2", "On break 0", "Open shifts 1". The open-shift figure needs the scoped open
   shifts read on Home (it exists for Schedule today).
2. **Card "Needs you"**, only when there's something: "Cover 1 open shift" over "Sun, 6 PM – 12 AM" with "Find cover"
   (B1-M's row). With nothing waiting, the card isn't drawn; the band figure already says 0.
3. **Card "Clocked in now"**: rows "Daniel C." over "Since 7:03 AM · Front counter"; amber line only for an exception.
   Footer: "Updated 7:47 AM" and a 44px refresh icon button. The "every 30 seconds" sentence moves behind (i).
4. **Shortcut tiles:** "Add shift" and "Team", the Owner Home's 56px tiles.

**Schedule, top to bottom (phone):** C1-M as it is, scoped. Band: "Schedule", the date, the "Condado" chip, the white
"Add shift" button, and a ⋯ menu holding "Build and publish" when the manager has that grant. Week card: stepper, the
Published or Draft pill, the day strip with open-shift dots. Then the chosen day's list, open shifts first, each with
"Find cover". No roster card.

**Desktop (1024+):** Home uses the two-column Home grid (Needs you and Clocked in on the left, shortcuts and This week
on the right). Schedule uses C1-M-1440's grid with person rows; each name cell carries that person's week hours in this
location ("38 h"), replacing the 12-row roster card. People with no shifts this week collapse into "Show 3 people with
no shifts".

**Platforms:** iOS, Android, mobile web and PWA use the phone layout with the tab bar (Home, Schedule, Team). Pull to
refresh on Home updates the clock list.

**Text budget:** Home at most 40 words plus rows (today 64 plus rows). Schedule at most 90 words above the fold on a
390 phone, and the full week view at most 200 (today about 390).

**Draft scorecard:** Usability 2, Familiarity 2, Trust 2, Accessibility 2, Brand 2, Durability 2, Cost 1 (the scoped
reads differ from the full-access reads, so the screens need an adapter), Continuity 2 (it matches the screens these
managers see if they gain company-wide access, and the nav is unchanged). **15 of 16.**

### 2B: Today first, week as an agenda

Home answers "who's here and who's next"; the Schedule is a grouped list. Based on 7shifts' "Here's what's happening"
[N1], Whatnot's Today's Tasks [N8], Binance's grouped calendar [N10] and ClassPass [N11].

**Home, top to bottom (phone):**

1. **Band:** title "Today at Condado"; date line. Figures: "Clocked in 2 of 5", "Next shift 2 PM", "Open 1". "Of 5"
   and "Next shift" need today's shifts on Home.
2. **Card "Right now":** who's clocked in, then anyone due who hasn't clocked in (amber "Not clocked in · 12 min").
3. **Card "Later today":** the rest of today's shifts, two-line rows.
4. **Row "This week":** "1 open shift" with "Find cover", then "Schedule ›".

**Schedule (phone):** band "Schedule", the "Condado" chip, the week stepper on glass. Under it, the whole week as one
list with sticky day headers ("Mon, Nov 16 · 3 shifts"); open shifts lead their day with "Find cover". The day strip
scrolls the list to that day instead of filtering it.

**Desktop:** the week list in the 812 column, with a right rail "This week": total hours and each person with hours
("Sofía M. · 40 h"), people with none left out.

**Platforms:** sticky headers need the scroll container to clear the top bar's height and the safe area on iOS.

**Text budget:** Home at most 35 words plus rows. Schedule about 150 words for the full week (no location or status on
rows, no arrows).

**Draft scorecard:** Usability 2, Familiarity 2, Trust 2, Accessibility 2, Brand 2, Durability 2, Cost 1, Continuity 1
(it differs from the full-access Schedule). **14 of 16.**

### 2C: Week by person

The Schedule leads with people and their week; Home is a week summary. Based on Fresha [N6], Deputy [N3] and
7shifts [N2].

**Schedule (phone):** band "Schedule", the "Condado" chip, week stepper, and two figures "156 h" and "21 shifts".
Then an "Open shifts" row pinned first (Deputy), then one row per person: "Sofía M." over "5 shifts · 40 h", with
seven small day marks beside it (teal for a shift, grey for none). Tapping a row opens that person's week as a list.
People with no shifts collapse at the end.

**Home (phone):** band with the location title and "This week" figures; "Clocked in now"; the Owner Home's "Shifts by
day" bars; "Schedule ›".

**Desktop:** the person × day grid with the open-shifts row first, hours in the name cell and under each day header.

**Platforms:** the day marks are decorative; each row reads as one sentence for screen readers ("Sofía M., 5 shifts,
40 hours, Monday to Friday"). The row is the 44px target, never a mark.

**Text budget:** Schedule at most 120 words for the week.

**Draft scorecard:** Usability 1 (a manager most often asks "who's on today", which this hides one tap down),
Familiarity 1, Trust 2, Accessibility 1, Brand 2, Durability 2, Cost 1, Continuity 1. **11 of 16**, under the bar.

## Decisions for Jose

1. **Pick a direction for each screen** (recommended: 1A and 2A), after the designers render two or three options at
   390 and 1440.
2. **Show the person being replaced** on the review? It needs the review's read to carry the original assignee for
   can't-work and approved-leave repairs (a data contract change, src/lib/data/coverage-repair.server.ts:147-150).
3. **Show week hours and soft warnings** on the review? The ranking computes them already; passing them through the
   selection is a data contract change.
4. **The button as consent:** "Publish change" posts `publicationConsent` in place of the checkbox. The server rule
   stays; the wording needs Jose's OK as trust wording.
5. **The notification line:** "Ana C. will see this shift in her schedule. We'll also send her a notification."
   (Spanish to be written, not translated.)
6. **Open shifts and today's shifts on the scoped Home:** both need reads that Home doesn't make today.

## Mobbin links

Screens and flows retrieved Nov 22, 2026.

- [M1] Linear, project update: <https://mobbin.com/screens/64e4516f-bb0f-42b6-9576-6b4f1d7e6f72?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M2] Turo, Changing dates and location (flow): <https://mobbin.com/flows/5e1e7af5-a26d-4584-9b6a-7c84a4768adc?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M3] Linear, Retire team: <https://mobbin.com/screens/e12db837-1358-4b0e-ab73-fea4512e5539?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M4] Deel, Approve payroll: <https://mobbin.com/screens/c9e32890-21bd-4a44-9199-eea36b3cbeff?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M5] Revolut Business, Review transfer: <https://mobbin.com/screens/14836e01-df66-4ecf-83d0-9248b6b01cc5?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M6] Melio, Payment and bill details: <https://mobbin.com/screens/2f89852c-25d3-4fc0-8f22-fa72d4aaf85e?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M7] Employment Hero, Leave request clashes: <https://mobbin.com/screens/cc36ef47-419d-4956-9f5e-9dffcb089d0a?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M8] Deputy, Invite to work: <https://mobbin.com/screens/c49c996c-cdba-4916-81d5-2e524589d4d3?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [F1] Deputy, Finding a replacement (flow): <https://mobbin.com/flows/08be4446-6a47-443f-a8cb-f879fd3f6e00?tab=screens&utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M9] 7shifts, Publish Schedule popover: <https://mobbin.com/screens/3fb5adfb-9996-4d21-80de-70094d795699?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M10] 7shifts, "Schedules published." toast: <https://mobbin.com/screens/b97148c4-bac6-4657-a2c8-d9ae9f3ac529?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M11] Amie (web), Edit recurring event: <https://mobbin.com/screens/8994f49b-c563-4d97-ac2a-e97f16dfd4d0?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M12] HoneyBook, Notify invitees: <https://mobbin.com/screens/3b8428ce-1bcc-40a1-9e38-cdda62ddd8eb?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M13] Amie (iOS), Update event: <https://mobbin.com/screens/13e6df47-6eda-4817-9e06-b02e1ab958f3?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M14] Airbnb, Are you sure? sheet: <https://mobbin.com/screens/c8fa3a80-384a-4092-961b-6fd367fe969e?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M15] Remote, Time off request: <https://mobbin.com/screens/0cbdcc18-5e9d-4678-8d0f-b8c2af3c49ab?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M16] Mercury, Reimbursement panel: <https://mobbin.com/screens/acd32944-7f4b-445f-a510-5a7750b11a19?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M17] Stripe, Radar risk setting: <https://mobbin.com/screens/5c4fc742-3352-45ca-92c5-e34aee82dded?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M18] Airtasker, Reschedule task: <https://mobbin.com/screens/7cc47933-fb67-465f-ad59-9346f0ef332a?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M19] Meetup, Event cancelled: <https://mobbin.com/screens/e0d5e16b-d164-498c-8acb-02305535f6c2?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M20] 7shifts, bare Confirm dialog: <https://mobbin.com/screens/59166c6f-ea70-4d6f-b377-abbea3e64c84?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [M21] 7shifts, "We found some warnings": <https://mobbin.com/screens/8796902e-18e6-4f82-98d8-2146b96be325?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N1] 7shifts, Here's what's happening: <https://mobbin.com/screens/d5fce95f-df76-4443-bbb0-3dc0ad0bfd5d?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N2] 7shifts, schedule week: <https://mobbin.com/screens/354d5688-06cf-4b94-8d53-03828448fec0?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N3] Deputy, schedule week (one location): <https://mobbin.com/screens/9915dbfc-159b-425c-a1be-e1fc81df62a8?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N4] Deputy, schedule week (all locations, published): <https://mobbin.com/screens/a0e97f81-c13c-4ca3-ba74-1e00efd1ad19?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N5] Deputy, shift popover with Can't work: <https://mobbin.com/screens/42d9229d-2df6-4245-a3c1-0802e8c89350?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N6] Fresha, Scheduled shifts: <https://mobbin.com/screens/b8de201c-7704-499d-a678-3a6277217219?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N7] Shopify, store home: <https://mobbin.com/screens/635cf029-446c-4cdb-a3aa-bb1278e8291e?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N8] Whatnot, Seller Hub: <https://mobbin.com/screens/3d9cd38b-74bd-4443-aba7-471f838e791b?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N9] Jobber, Home: <https://mobbin.com/screens/a4225b0f-c803-45c1-aa43-1dfa1916b8f4?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N10] Binance, Calendar: <https://mobbin.com/screens/83c9a4da-c2c7-45b5-bba0-e2013ad1b268?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N11] ClassPass, studio schedule: <https://mobbin.com/screens/92ed613f-effa-4c81-9db2-283d6a4e9437?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N12] Open, studio schedule: <https://mobbin.com/screens/1e339d42-4e73-4aab-b876-429c65c0a3d7?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
- [N13] Gusto Mobile, Calendar: <https://mobbin.com/screens/8d3fd4b4-ef21-4b61-9972-b2c251883e62?utm_source=claude&utm_medium=ai-assistant&utm_source_platform=mcp>
