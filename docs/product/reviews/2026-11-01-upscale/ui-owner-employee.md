# NEVORA UI and UX review: Owner and Employee (Nov 1, 2026)

Reviewer: UI Designer. Preview `http://localhost:59738` (fictional data, branch tip `61124988`). Read-only, and nothing was submitted.

Paths below are relative to this folder:
`scratchpad/review-ui/`
- `shots/` holds the single captures:
  - `O-` and `E-` are Owner and Employee pages, named `{role}-{engine}-{width}-{route}`.
  - `F-` are interaction flows.
  - `L-` is the login page.
  - `N-` and `T-` are loading timings.
- `mont/` holds side-by-side montages of those captures, so the evidence is easy to compare.
- The driver scripts are in this folder. The per-page metrics are in `metrics-*.json`.

## What was checked
- **Owner pages:** 33 routes and 13 flows.
- **Employee pages:** 13 routes and 8 flows.
- **Viewports and engines:** Chromium at 1440×900 and 390×844 (isMobile, touch), and WebKit at 390×844.
- **Per-page metrics:**
  - font family;
  - type sizes and weights;
  - horizontal overflow;
  - tap targets under 32px;
  - truncation;
  - icon viewBoxes;
  - red text;
  - card edges, radii and shadows.
- **Interactions** (each opened without submitting):
  - Schedule options menu;
  - phone day view;
  - Edit shift;
  - Build and publish;
  - next week;
  - person page;
  - timecard side panel;
  - time-off request detail;
  - Find cover;
  - avatar menu;
  - ⌘K search;
  - keyboard focus;
  - Employee shift panel, Swap, New request and the time-off form;
  - day timecard;
  - paycheck;
  - availability sheet;
  - opening a notification.
- **Motion:** sheet motion with and without reduced motion.
- **Loading:** the loading frames on a tab switch and on a notification deep link.
- **Login:** the login page compared with board `P-SignIn`, plus the manifest and app icon.

**Not checked:**
- anything after a submit;
- the Clocker kiosk;
- 768, 1024 and 1920 widths, apart from one Clocker measurement;
- screen readers;
- a real iPhone (WebKit stands in for it);
- the error page, beyond seeing it appear.

The error page ("This page could not be loaded") showed up as transient 500/503 errors while I ran four parallel captures against the dev server. Every one of those pages loaded on a sequential re-run. Treat it as dev-server load, not a defect.

**Baseline health:**
- Every page renders in Inter only, one family.
- No page has horizontal overflow at 390 or 1440.
- All icons are Phosphor (256 viewBox).
- No unexpected console errors, apart from one dev-only React "key" warning in `ManagerWeeklyRoster`. It shows as the Next "1 Issue" badge in dev and is invisible in production.

---

## (A) Before production — strict

### A1. Clock tablets: cards overhang the page column on desktop and tablet
- **Where:** Owner, Settings › Clocker tablets, at 1440 and 1024, in Chromium.
- **Evidence:** `mont/o-desk-4.png` (left) and `shots/O-chromium-1440-home_settings_clocker.png`.
- **What you see:**
  - The title is at x=340, but both cards and the note span 324–1076.
  - Every sibling Settings page spans 340–1060.
  - At 1024 the cards span 272–984 against a title at 288.
  - The cards stick out 16px on each side.
- **Why it falls short:** the approved spec says "no misaligned edges" with zero tolerance (rule 5, shared edges). This is the only page with the defect.
- **Cause:** `src/components/clocker-device-manager.css`, line 17. Inside the min-width media query it sets `.c-tablets__page { padding: 0 }`. The wrapper (`.q-page.c-tablets`) is wider than the title block, which carries its own 16px inset. Line 5's phone rule from today (`padding: 0 16px`) is correct.
- **Fix:** in the line-17 rule, change `padding: 0` to `padding: 0 16px`, or drop the property so line 5 applies at every width. The result is 340–1060 at 1440. Re-check the note's left edge as well.
- **Size:** S (one CSS value).

### A2. Owner phone: "Find cover" offered on past days
- **Where:** Owner, Schedule, phone day view, Thu Oct 29 (today is Nov 1). Seen in WebKit 390 and Chromium 390.
- **Evidence:** `mont/f-p-1.png` (2nd panel) and `shots/P-webkit-390-past-findcover.png`.
- **What you see:**
  - Two teal "Find cover" links appear on open shifts three days in the past, and the first "Open shift" is red.
  - Tapping one opens Find cover for "Thu, Oct 29 · 12:00 AM – 6:00 AM" and offers "Give to someone".
  - The desktop grid treats the same shifts as past: grey "3 open" with no action.
- **Why it falls short:** it's an action with no possible purpose (rule 6). It can lead an owner to give away a shift that's already over. It also contradicts the desktop view of the same data.
- **Fix:**
  - In the phone day list, render the Find cover link only when the shift's end is later than now.
  - Past open shifts show the grey detail "Not filled" with no link, using the same rule as the desktop grid's past "N open".
  - Ask the server/coverage owner whether the coverage page should also refuse a past shift. That part is not UI; I'm flagging it for the PM and Codex.
- **Size:** S.

### A3. Employee Updates is a leftover from the old design system
- **Status:** recommended. If the gate can't absorb it, it becomes the first item for 1.1.
- **Where:** Employee, More › Updates, on phone (WebKit and Chromium) and desktop.
- **Evidence:** `mont/e-phone-4.png` (1st panel) and `mont/e-desk-3.png` (right).
- **What you see on the phone:**
  - A full-width teal "Write an update" primary button for an employee.
  - A "Search this page" field and a "Show: All" select above an empty list.
  - An empty card reading "No current updates / There are no current items on this page.", with its title left-aligned and its body centred.
  - On WebKit the top-bar title sits 6px higher than on other pushed pages (y13 against y19).
- **What you see on desktop:**
  - A different design again: a three-part segmented control.
  - A bare "+" icon.
  - A plain-text empty state with no card: "Opening an update doesn't confirm it."
- **Why it falls short:**
  - Every other Employee page is corporate.
  - Notifications already dropped the same "Search this page / Show" controls (see `notifications-list.test.tsx`).
  - It breaks rules 6 and 7, plus "1 primary per screen" (the primary here is a rare action).
  - It doesn't match the Owner Updates page, the board `E-Updates`, or the Gusto/Homebase pattern (a list with an empty state).
- **Fix:**
  - Reuse the Owner Updates layout from `mont/o-phone-8.png`: a segmented control `All | To review`, then one empty-state card with the title "No updates yet" and the detail "Updates from your workplace show up here."
  - Put "Write an update" as a teal top-bar text action ("New"), shown only when the person can write.
  - Show Search and Show only when there is more than one page of results.
  - Use the same component at 1440, so the desktop "+" and bare text go away.
  - Keep the data and actions as they are.
- **Size:** M.

Everything else below is polish and not release-blocking.

---

## (B) Release 1.1 polish and upscale (ranked)

### B1. Sign-in doesn't match the approved board or the logo rule
- **Where:** `/login` at 390 (WebKit) and 1440.
- **Evidence:** `mont/login-vs-board.png`.
- **What you see:**
  - A warm beige page (`#F7F6F3`) instead of `#F5F6F6` or white.
  - System font instead of Inter.
  - The wordmark without "WORKFORCE" under it.
  - "Sign in." with a full stop.
  - 56px floating-label fields instead of 48px fields with labels above.
  - "Sign in with a passkey" as a teal outline button.
  - "Español" as a link.
- **Why it falls short:**
  - It is the first screen on every device.
  - It breaks Jose's logo rule ("NEVORA and below Workforce centralized").
  - It doesn't match board `P-SignIn`.
- **Fix:** build `P-SignIn` as drawn:
  - white page;
  - 20px wordmark with an 11px, 3.2px-tracked "WORKFORCE" label;
  - an English/Español segmented control;
  - "Sign in to Isla Verde Cafés" at 22/600, with the detail "Use the Employee ID your manager gave you.";
  - 48px inputs with 13/600 labels and a "Show" text toggle;
  - a 44px primary button;
  - a "Use Face ID" secondary;
  - "Forgot password?" as a teal link;
  - a footer row at the bottom.
- **Size:** M (presentation only; auth logic untouched).

### B2. One desktop shell for both roles
- **Where:** Employee at 1440.
- **Evidence:** `mont/e-desk-1.png` against `mont/o-desk-1.png`.
- **What you see:**

  | | Employee | Owner |
  |---|---|---|
  | Top bar height | 64px | 52px |
  | Sidebar width | 244px | 232px |
  | Page title position | y143 | y131 |
  | Top-bar order | avatar · "+" · bell | Search · bell · avatar |

  - The Employee "+" (New request) is a 20×25 hit area with no label.
  - The bell uses a teal count badge on desktop and a red dot on the phone.
- **Why it falls short:** "one desktop page layout" (A7), and rule 5 on equal sizes. The "+" fails rule 6 and the 44px target size.
- **Fix:**
  - Use the Owner shell values for Employee: 52px top bar, 232px sidebar, title at y131.
  - Use the order Search (when available), bell, avatar.
  - Remove the "+" (New request already sits on Requests), or make it a 32px labelled button.
  - Use one unread treatment on both viewports: the teal count badge.
- **Size:** M.

### B3. Status colour and past-shift logic on Schedule lists
- **Where:** Owner phone Schedule (today, Nov 2), in WebKit.
- **Evidence:** `shots/O-webkit-390-home_schedule.png` and `mont/f-p-4.png` (4th panel).
- **What you see:**
  - Only the first "Open shift" row is red; identical rows below it are ink.
  - The late person ("6 h 37 min late") is grey here, but red on Who's working and Things to do.
- **Why it falls short:** the same state in two colours reads as a bug. The red budget is spent on the wrong thing (R3: red at most once, and only for a real problem).
- **Fix:**
  - Set every "Open shift" label in ink.
  - Use red, as text, only for the late time, and in the same colour as Who's working.
  - Keep the dashed avatar as the open-shift cue.
- **Size:** S.

### B4. One Save rule and one primary per screen
- **Evidence:** `mont/o-desk-7.png`, `mont/o-phone-6.png`, `mont/o-phone-2.png`, `mont/e-phone-3.png`, `mont/o-desk-8.png` and `mont/o-phone-1.png`.
- **What you see:**
  - Save sits in four places:
    - a teal text link in the title row (Company policies, Branding);
    - a bottom-right button (Punch photos at 1440);
    - a full-width bottom button (Punch photos and Availability on the phone);
    - a top-bar text action (phone sheets).
  - On WebKit 390, Availability's Save is enabled teal with no changes. Chromium 1440 shows it disabled grey.
  - Company profile's Save is teal before any edit.
  - Duplicate actions:
    - "Prepare payroll" twice on Prepare payroll, once outlined and once filled;
    - "New update" twice on Updates, and the desktop copy is a teal outline button, which R4 removed;
    - Payroll's red notice offers a neutral "Start with Sep 21–27" while the primary button is for a later week.
- **Fix:**
  - **Phone pushed forms:** a top-bar "Save", teal 600, `#A7ACB1` until something changes.
  - **Desktop forms:** a 40px primary "Save" in the form card's action row, disabled until something changes.
  - Never use a text-link Save in the title row.
  - **Prepare payroll:** the Up next button becomes the only primary, and the expanded overdue row uses a secondary.
  - **Payroll:** while overdue periods exist, the notice button is the primary ("Prepare Sep 21–27"), and Up next's button drops to secondary.
  - **Updates:** keep only the empty-state button, as a neutral secondary.
- **Size:** S–M.

### B5. Back goes where you came from
- **Evidence:**
  - `mont/o-phone-4.png` (Payroll settings shows "‹ Payroll").
  - `mont/o-phone-5.png` (Scheduling rules shows "‹ Schedule"; both were opened from Settings).
  - `mont/f-p-2.png` (Find cover from Home shows "‹ Schedule").
  - `mont/load.png` (a notification deep link gives a bare "Back to notifications" text link inside the content, under the tab header).
- **Why it falls short:** P6 ("Back behaves like back"), and Apple navigation (Back names the previous screen).
- **Fix:**
  - Carry `from=` (as Clocker recovery already does) and label the back link with the source page.
  - The deep-link case uses the pushed-page header (`‹ Notifications`, centred "Schedule") instead of the inline text link.
- **Size:** M.

### B6. Same fact, one format
- **Evidence:** `mont/f-d-5.png`, `mont/e-phone-2.png`, `mont/e-phone-3.png`, `mont/f-p-4.png`, `mont/o-phone-3.png` and `shots/O-webkit-390-home_timecards.png`.
- **What you see:**
  - **An all-day shift** appears three ways:
    - "Open all day" (Home);
    - "All day" (Schedule);
    - "12:00 AM – 12:00 AM · Ends Mon, Nov 2" (Find cover).
  - **One time-off request** appears as both "Nov 11 – 12 · 2 days" (hub) and "Wed, Nov 11 – Thu, Nov 12 / 2 days" (Time off list).
  - **Availability** appears as "6 AM – 10 PM", "6:00 AM – 10:00 PM" and "06:00 AM" (inputs).
  - **Counts** appear as "Team (9)", "Tablets (2)" and "Waiting (2)", against "Open shifts 3" and "All 9".
  - **Paycheck** shows "Tue, Oct 13, 2026", the only date with a year.
- **Fix:**
  - All-day shifts read "All day" everywhere.
  - Ranges use the shared short label.
  - Times use "6:00 AM" (and inputs show it without the leading zero where the platform allows).
  - Counts use "Label N" with the N in grey, never in parentheses.
  - Show a year only when it isn't the current year.
- **Size:** S.

### B7. Notifications that say what happened
- **Where:** Employee, on phone and desktop.
- **Evidence:** `mont/e-phone-3.png` (2nd panel) and `mont/load.png` (1st).
- **What you see:**
  - Two identical rows: "Schedule update · 5:29 PM", each with a tinted calendar icon tile, an amber "Action needed" pill and a teal dot.
  - Tapping one shows "Opening current details…" as loose text under the list for more than 1s.
- **Why it falls short:** rule 6 (the reader can't tell the two apart), the Oct 23 rule against coloured icon tiles, and P4 (every tap answers in place).
- **Fix:**
  - Title "Nov 2 – 8 schedule is out", with the detail "Confirm it by Sun · 5:29 PM".
  - No icon tile.
  - One unread dot, and drop the pill.
  - On tap, show the row's pressed state and a 16px spinner in place of the chevron.
- **Size:** S–M.

### B8. Loading frames
- **Where:** Employee and Owner Schedule after a tab tap, at 150–400ms, in Chromium and WebKit.
- **Evidence:** `mont/load.png` (middle).
- **What you see:** only the title "Schedule" on an empty grey page, followed by a jump.
- **Fix:** a page-shaped skeleton (P7): the week-strip card plus four 56px rows in `#EDEEEF`, with no shimmer when reduced motion is on.
- **Size:** S–M.

### B9. Settings consistency
- **Evidence:** `mont/o-desk-7.png`, `mont/o-desk-4.png`, `mont/o-desk-5.png`, `mont/o-phone-6.png` and `mont/o-phone-7.png`.
- **What you see:**
  - Company policies is 992 wide while its sibling Settings pages are 720.
  - Branding and the Schedule grid cards use the flat `0 0 0 1px #E3E5E6` edge, while every other card uses the R5 edge plus a soft shadow.
  - Owner "My pay" and Owner "Time off requests" are older non-card layouts. My pay has no card at all, and Time off requests has its title in the content and 28px avatars.
  - Punch photos shows the "When to take a photo" toggles on and teal while the master toggle is off and the feature is unavailable.
- **Fix:**
  - Make every Settings page 720 wide.
  - Use one card finish everywhere.
  - Build My pay from `E-Paycheck` and `G-E-Pay`.
  - Time off requests becomes a pushed page with a centred title.
  - Dependent toggles are disabled at 40% opacity until the master toggle is on.
- **Size:** S–M.

### B10. Small text and layout defects on phones
- **Evidence:** `shots/O-webkit-390-home.png`, `mont/o-phone-1.png`, `mont/o-phone-3.png` and `mont/f-p-2.png`.
- **What you see:**
  - Home: "Missed clock-ins" wraps to two lines.
  - Insights: "Not available" wraps.
  - The top-bar title truncates to "Features and team …".
  - The person card wraps "(787) 555-0142 · / ID AR0142".
  - Scheduling rules truncates "How swaps and cover are appro…".
- **Fix:**
  - Phone stat labels become "On shift", "Missed" and "Open shifts".
  - Insights shows "—" with a footnote instead of "Not available".
  - The top bar reads "Features".
  - The person card puts the ID on its own line.
  - The detail becomes "Swap and cover approval".
- **Size:** S.

### B11. Timecards, made calmer
- **Evidence:** `shots/O-chromium-1440-home_timecards.png` and `shots/O-webkit-390-home_timecards.png`.
- **What you see:**
  - The Breaks column is all "—", and the company has no break types.
  - The phone lists six "No time yet" rows; desktop collapses them into "6 people with no time yet".
  - The 20px card "You can approve from Mon, Nov 2" stands alone on desktop, but on the phone it also carries "24 h 7 min recorded so far".
- **Fix:**
  - Hide Breaks while no break types exist.
  - Collapse the no-time rows on the phone too.
  - Give the desktop status card the same detail line.
  - Add the Scheduled column R10 promised (Scheduled, Recorded, Status).
- **Size:** S–M.

### B12. Employee small polish
- **Evidence:** `mont/e-phone-1.png`, `mont/e-phone-2.png`, `mont/e-desk-1.png`, `mont/f-e-2.png` and `mont/f-p-3.png`.
- **What you see:**
  - Schedule mixes a teal outline "Confirm" with neutral outlines ("Availability", "View"). The "View" button sits next to "No open shifts right now".
  - Pay reads "Payday in 2 days" plus a pill reading "Payday Tue, Nov 3", so payday appears twice.
  - On desktop Home, "View shift" is right-aligned while its caption is centred under it.
  - "New request" on desktop lands on the Time off list, while on the phone it opens the form.
  - Phone Swap shows "Marco S."; desktop shows "Marco Silva".
  - The Swap header's Send (desktop) doesn't match the bottom button (phone) or the time-off sheet's bottom Send.
  - The Employee pushed pages Notifications, Profile and More highlight the Home tab; the Owner's equivalents highlight nothing.
- **Fix:**
  - Use one secondary style (neutral) and drop "View" when there are no open shifts.
  - Pay title "Tue, Nov 3" with the detail "In 2 days".
  - Left-align the caption in the action row.
  - "New request" opens the time-off sheet directly on both viewports.
  - Show full names.
  - One sheet pattern: Cancel · Title · Send (teal, disabled until valid).
  - Pushed pages from the avatar highlight no tab.
- **Size:** S–M.

### B13. Owner small polish
- **Evidence:** `mont/o-desk-3.png`, `mont/f-d-4.png`, `shots/O-chromium-1440-home_schedule.png` and `mont/o-desk-6.png`.
- **What you see:**
  - Desktop Profile says "Alerts on this phone" on a computer.
  - "Add a passkey" is ink while the other row actions are teal.
  - Request detail repeats the name (subtitle and card).
  - Priya's grid chips carry an unexplained 12px lead glyph (Lead is on hold).
  - The Schedule options menu offers "Go to this week" while you're already on this week.
  - Add shift, Edit shift and Build and publish are centred 480px cards with the title inside, while Add employee uses the page title and a 720 card.
  - Insights says "Late clock-ins: Not available" on the same day Who's working shows someone 6 h late.
- **Fix:**
  - "Alerts on this device".
  - Teal for the passkey action.
  - Drop the subtitle.
  - Remove the glyph, or add a "Lead" text label with a tooltip.
  - Hide "Go to this week" when it's the current week.
  - One form shape: the page title at the standard position and a 720 form card.
  - Insights says why ("Needs clock-in rules: Settings › Company policies") instead of "Not available".
- **Size:** S each.

### B14. Home-screen icon colour
- **Evidence:** `mont/login.png` (right).
- **What you see:** the apple-touch icon and manifest icons (`/icons/fuel-*`) are a teal wordmark on white. The in-app wordmark is navy with a cyan A.
- **Fix:**
  - Export the icon from `BrandWordmark` in its real colours, inside the maskable safe zone.
  - Rename the files away from "fuel".
- **Size:** S (asset).

---

## (C) Bigger redesign ideas

### C1. Owner desktop Home as a real control room (Gusto and Homebase)
At 1440, the Home column leaves 340px empty on each side, and Today is a list.

Replace the three stat cells with a horizontal day timeline per location, like Homebase's "Today" bar. The timeline shows:
- who is on now and who is next;
- open gaps as dashed segments;
- late people as one red tick.

Keep Payday and Things to do as a right rail at 360px.

Data is unchanged; it's a new presentation of today's shifts and punches. **Size:** L.

### C2. Team as a Gusto-style directory, and a person page worth opening
- **Team on desktop:** a sortable table at 1200 max width. Columns:
  - Name;
  - Position;
  - Location;
  - This week (scheduled and worked hours);
  - Clocker PIN (set or not set);
  - Phone.

  Keep the phone list as it is.
- **Person page:** next shift, hours this week, pay rate (Owner only), availability summary and a "get ready" checklist. This is Wave B, so it needs PM sign-off on the data.

**Size:** L.

### C3. Insights that answer "am I over or under?"
Replace the four thin cards with:
- one KPI strip: hours worked against scheduled (with the delta), estimated labour cost, late clock-ins and filled cover;
- a paired bar chart per day (scheduled in grey, worked in teal) with a 0/max gridline;
- a location split;
- a "vs last week" note under each KPI.

This follows the dataviz rules and Gusto's reports. **Size:** L.

Other directions for later:
- A day view on desktop: click a column header to open a timeline day editor (Homebase).
- An Employee Home "live shift" state with a countdown and progress during a shift.
- A native wrapper with haptics and sheet detents.

---

## Good things to keep
- **One typeface:** Inter on every captured page, with no system-font leaks inside the app. Login is the exception (B1).
- **Phosphor icons only** (256 viewBox); no hand-drawn glyphs.
- **No horizontal overflow** at 390 or 1440 on any of the 46 routes.
- **Sheets that feel iOS:** 360ms `cubic-bezier(0.32, 0.72, 0, 1)` transform and opacity. Reduced motion removes the animation completely. Grabber, centred title and Done.
- **Desktop side panels** for the timecard, the Employee shift and Swap, with the page dimmed behind them.
- **⌘K search palette:** a Gusto-grade palette with Actions and Pages and key hints (`mont/f-d-6.png`).
- **Keyboard focus:** a visible 2px teal ring on navigation (`mont/f-d-6.png`, right).
- **Desktop Schedule grid:** today's column tinted, open shifts dashed, past open shifts quiet grey, and "Show 3 unscheduled".
- **Calm colour:**
  - Home stats in ink.
  - The payroll overdue notice as a white card with a red title.
  - Pay history name-first, with View and Download.
- **Phone tab bar and pushed-page header:** consistent, with good 44px targets.
- **Settings index:** clean grouped lists with values on the right (Gusto pattern).
- **Owner Things to do:** grouped by kind, with no Approve buttons in lists. Decisions happen on the detail page (rule met).
