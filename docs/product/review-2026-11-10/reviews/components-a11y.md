# NEVORA: interactive components and accessibility review

Date: 2026-11-10. Read-only review. No repository files were changed.

## Scope, inputs and method

**Scope.**
- Every captured interactive state in `/tmp/review/components/` (390 images). That covers:
  - all four roles' account menus and the Search finder, both empty and typed;
  - location and schedule-options menus, Insights period and export menus;
  - sidebar collapse and expand;
  - sheets and panels: timecard, request detail, employee and lead shift sheets;
  - disclosures, forms before and after an empty submit, hover crops, Tab walks and motion frames.
- Accessibility across all surfaces, aggregated from all 867 `*.audit.json` files (axe-core 4.13, probe, audit.js) and the 16 Tab-order lists in `manifest.json` → `data`.

**Image paths** below are relative to `/tmp/review/` (for example `components/owner-home-1440-open-search-ctrl-k.jpg`).

**Judged against:**
- DESIGN.MD Direction B: lines 1363–1666, including Round 4 (1478–1488) and the Owner and Manager desktop rules (1436–1450).
- The Direction B values: Inter; teal `#0B6E69`; band; canvas `#F2F5F4`; 22px white cards; pills; Phosphor bold in tinted circles; 48px+ targets; red stop, amber wait, green done, teal info.

**Not repeated:**
- Findings already in `code-design-system.md` (C1–C14, T1–T8, S1–S7, B1–B8, I1–I6, M1–M4, L1–L7, D1–D4).
- Findings already in `copy-audit.md`.
- Where a screen shows a new rendered instance of one of those, it is listed as "extends Cx" with only the new evidence.

**Skills applied:**
- better-ui, better-typography, better-colors, better-layout, better-interface and better-accessibility;
- design:design-critique and design:accessibility-review.

UX laws are named in each finding where they apply.

**Severity:**
- **High:** blocks or confuses a task, or fails accessibility (WCAG 2.2 A/AA, or a better-interface escalation trigger).
- **Medium:** a visible inconsistency or friction.
- **Low:** polish.

### What was verified, and what was not

- **Verified from rendered images:**
  - every open menu and popover at 1440;
  - the 390 location and schedule-options sheets;
  - the finder, empty and typed, for all 4 roles × 8 routes;
  - the shift sheet at 1440 and 390, with motion frames at 40/120/220/400ms under both preferences;
  - card-enter frames at 300/600/900/1500ms;
  - empty-submit validation on Add shift, Request time off and New update;
  - desktop hover crops;
  - Tab focus at stops 3/8/14/20.
- **Verified in code:** finder, ActionMenu, QuietSheet, FormValidation, the time-off PickField, BLive, the rail tooltip and the shell landmarks.
- **Not verified (capture gaps, not findings):**
  - **Phone Tab walks** for Owner, Manager, Employee and Lead `/app` at 390 were captured while the page was still loading ("Loading your shift…", or the Team skeleton), so main-content focus order on phones is unverified.
  - **Mis-clicked captures.** Owner and Manager `inbox-*-sheet-open` landed on the Schedule skeleton. `owner-timecards-390-sheet-open` landed on Time exports. `owner-employees-new-1440-form-submitted-empty` clicked Cancel, so it shows the Team list. `employee/lead-exchange-callout-*-form-empty` redirected to My requests.
  - Phone More and account sheets were not captured.
  - The 390 Manager inbox sheet was not captured.
  - Native select option popups and native date pickers are not drawn by headless Chromium.
  - Clocker and `components/` have no audit JSON.
  - Screen-reader output (VoiceOver/NVDA) was not run.
  - 200% zoom was not run; `overflowX` was 0 on all 867 audits, so 320px reflow holds.

### What works (keep it)

- **Finder:**
  - a native `<dialog>.showModal()` with focus trapped;
  - Escape closes it and focus returns to the opener (`command-finder.tsx:105–125`);
  - `aria-activedescendant` combobox, match emphasis and a breadcrumb detail ("Schedule › More");
  - opens with no animation, which is right for a high-frequency tool.
- **Rail tooltips** appear on hover and on keyboard focus after 300ms, can be dismissed with Escape, and are hoverable (WCAG 1.4.13) (`sidebar-rail-tooltip.tsx:5–60`).
- **QuietSheet** is a native modal dialog with drag-to-dismiss on the grabber, Escape and an outside tap, and no travel under reduced motion (`quiet/quiet-sheet.tsx:24–108`).
- **FormValidation:**
  - errors appear on blur and on submit;
  - fields get `aria-invalid` and `aria-describedby` to the inline error;
  - focus moves to the first invalid field;
  - it replaces the browser bubble (`form-validation.tsx:58–119`).
- **Every one of the 867 audits:**
  - has an h1;
  - has 0 horizontal overflow;
  - shows a white focus ring on the band and a teal one on cards, both 2px (manifest Tab orders).
- **Disclosures** (Why other shifts, How we count, What changed) use a grey down caret that flips up when open.

---

# Part A: Components

## A1. Search finder (Ctrl K)

Images (all 1440):
- `components/*-1440-open-search-ctrl-k.jpg` (32)
- `components/*-1440-open-search-ctrl-k-typed.jpg` (32)

Anchoring and scrim:
- Centred at 12vh and not anchored to the top-bar trigger. This matches Jakob's law for command palettes.
- Light neutral scrim: `rgb(28 28 28 / .32)`.
- No visible close button on desktop or tablet; Escape, a click outside and Ctrl K close it.

### CA-001 · High · Arrow-key selection can leave the visible list
- **Images:** `components/owner-home-1440-open-search-ctrl-k.jpg` (the list already fills the 542px dialog with 9 rows).
- **What's wrong:**
  - The results list scrolls (`portal-gusto.css:392` `overflow-y: auto`; `max-height: min(560px, 100vh − 120px)` at :385).
  - ArrowUp and ArrowDown only change `active` (`command-finder.tsx:157–161`). Nothing scrolls the active option into view.
  - An Owner query that returns Actions, Pages, People and Locations (up to 6 per group, so 24 rows plus 4 headers, about 1,070px) pushes the highlighted row below the fold. Enter then opens a result the user can't see.
  - The desktop list also has no `overscroll-behavior: contain`; only the phone rule at :447 sets it.
- **Principle:** WCAG 2.4.7 (the active row is the keyboard focus here), 2.4.11 Focus Not Obscured; Doherty (lost orientation).
- **Fix:**
  - In `command-finder.tsx`, add `useEffect(() => { document.getElementById(\`command-finder-${current}\`)?.scrollIntoView({ block: "nearest" }); }, [current])`.
  - Add `overscroll-behavior: contain` to `.command-finder-results` at `portal-gusto.css:392`.

### CA-002 · High · The active result is shown only by a 1.15:1 tint
- **Images:**
  - `components/owner-home-1440-open-search-ctrl-k.jpg` ("Add shift")
  - `components/employee-home-1440-open-search-ctrl-k-typed.jpg` ("Schedule")
  - every `*-open-search-ctrl-k*.jpg`
- **What's wrong:**
  - `corp-shell.css:695` paints the current option `#E6F1EF` on white, which measures 1.15:1.
  - `:696` then resets the label to ink and weight 400, cancelling the intended teal 600 label at `portal-gusto.css:398`.
  - For a keyboard user this tint is the only position cue.
- **Principle:** WCAG 1.4.11 Non-text Contrast (state indicator), 2.4.7 Focus Visible; figure-ground.
- **Fix:**
  - At `corp-shell.css:695–696`, keep the fill and add `box-shadow: inset 3px 0 0 #0B6E69`.
  - Set the label to `color: #0B6E69; font-weight: 600`.
  - The leading bar alone gives 6.09:1.

### CA-003 · Medium · Results are silently capped at 6 per group
- **Images:**
  - `components/employee-home-1440-open-search-ctrl-k.jpg`
  - `components/lead-home-1440-open-search-ctrl-k.jpg`
- **What's wrong:**
  - `rankFinder(..., perGroup = 6)` (`lib/finder.ts:114,120`) trims every group.
  - Employees and Leads have 12 pages (`finder.ts:51–63`), so the empty finder shows Home through Requests. Time off, Pick up and swap, Availability, Notifications, Profile and Help never appear without typing.
  - Updates and Notifications are in the Employee sidebar but cannot be browsed here.
  - Typed Owner queries such as "a" also truncate people at 6 of 12, with no count and no "more" row.
- **Principle:** Hick's law is served by grouping, not by hiding; visibility of system status; better-layout "hint at hidden content" (trigger).
- **Fix:**
  - Show every own page in the Employee and Lead empty state (12 rows fit).
  - For typed results, add a non-option status line: "6 of 11 people · keep typing".
  - Or add a "Show all people" option that raises `perGroup` for that group.

### CA-004 · Medium · Group names are hidden from assistive technology
- **Images:** `components/owner-home-1440-open-search-ctrl-k-typed.jpg` (Actions and Pages both contain "Schedule").
- **What's wrong:**
  - Group headings are `<li role="presentation" aria-hidden="true">` (`command-finder.tsx:189`).
  - A screen reader hears "Schedule" twice, once for the "Publish the schedule" action and once for the page, with no way to tell an action from a page.
- **Principle:** WCAG 1.3.1 Info and Relationships; Gestalt common region is visual only.
- **Fix:**
  - Render each group as `<li role="presentation"><ul role="group" aria-labelledby="g-actions">…options…</ul></li>`, with the visible heading as the label.
  - Or add `aria-describedby` on each option pointing at its group heading.

### CA-005 · Medium · Result rows don't use the Direction B row anatomy, and some matches are unexplained
- **Images:**
  - `components/owner-home-1440-open-search-ctrl-k-typed.jpg` ("Activity · Team tools" matches "sch" with no visible reason)
  - `components/manager-home-1440-open-search-ctrl-k.jpg`
- **What's wrong:**
  - Rows are text-only 40px lines. Actions, pages, people and places differ only by a 13px grey header.
  - Direction B rows lead with a Phosphor bold icon in a tinted circle.
  - A keyword-only hit ("Activity" via the `schedule` keyword) shows no match emphasis, so it reads as a wrong result.
- **Principle:** similarity and recognition over recall; aesthetic-usability.
- **Fix:**
  - Add a 28px tinted-circle lead to each option (`corp-shell.css:690` already lays rows out in flex with a 12px gap):
    - Lightning bold for Actions;
    - File bold for Pages;
    - initials (BAvatar tint) for People;
    - MapPin bold for Locations.
  - When the match is keyword-only, set detail to "Matches ‘schedule’".

### CA-006 · Low · The finder surface still wears the pre-B kit
- **Images:** `components/owner-home-1440-open-search-ctrl-k.jpg`.
- **What's wrong:** `portal-gusto.css:384–388` sets:
  - radius 14px;
  - a 1px border;
  - a neutral `rgb(28 28 28/.22)` shadow;
  - a neutral `.32` backdrop.
  The Direction B popover is a white card with the soft layered shadow (DESIGN 1588–1590), and the B scrim is green-black: `rgb(10 24 23/.32)` at `employee-b-desktop.css:146`. This extends S2 and C9.
- **Principle:** consistency, similarity.
- **Fix:**
  - Under `[data-nv-b]`, give `.command-finder` a 22px radius, no border and the shared popover elevation (`--b-elev-2`, per S2).
  - Use the B scrim colour on `::backdrop`.

### CA-007 · Low · Small finder details
- **Images:**
  - `components/employee-home-1440-motion-no-preference.png` (shows "⌘K" on a non-Mac before hydration)
  - every other shot shows "Ctrl K"
- **What's wrong:**
  - The SSR text is `⌘K` and an effect rewrites it (`command-finder.tsx:138,166`). The hint visibly swaps on Windows and Linux.
  - The Employee and Lead placeholder is "Search your pages" while the dialog's name is "Find a page, person or place" (`:111` vs `:168`).
  - The Employee and Lead finder has no Actions (Request time off, Swap a shift, Set availability). This is a "default until Jose decides" (DESIGN 1519/1556), so it is listed for that decision only.
- **Principle:** stability (no content swap after first paint); 2.5.3 Label in Name spirit.
- **Fix:**
  - Render the hint empty server-side and fill it on mount, or set it from the user agent in the server component.
  - Pass the role-specific label to `aria-label`.

## A2. Menus and popovers (account, location, schedule options, Insights)

Anchoring on desktop is good:
- Menus open 8px under their trigger, right-aligned to it (`action-menu-geometry.ts`), with no scrim and native light dismiss.
- The trigger caret flips.
- Keyboard open focuses the first item (`action-menu.tsx:97–111`).

### CA-008 · High · The phone "Schedule options" sheet renders unstyled
- **Images:** `components/owner-schedule-390-open-more-schedule-actions.jpg` and `components/manager-schedule-390-open-more-schedule-actions.jpg`.
- **What's wrong:**
  - Items sit flush at x=0: "This week", "Copy previous week", "Print schedule" and "Settings" touch the screen edge.
  - "Week templates", "Scheduling rules" and "Activity" are indented about 10px.
  - Every trailing chevron wraps onto its own line under the label.
  - "Availability deadline / Not set / ›" stacks into three lines.
  - Group labels are plain 14px ink.
  - Compare the Location sheet beside it (`components/owner-schedule-390-open-location-all-locations.jpg`): 50px rows and a trailing check.
  - The B phone menu (`app/app/schedule/page.tsx:405–407`) reuses the desktop `moreItems` markup (built for the corp popover at :447). No phone-sheet styles exist for those group and row classes.
- **Principle:** Gestalt proximity and continuity (a chevron detached from its label); alignment; aesthetic-usability. This is the main scheduling screen.
- **Fix:**
  - In the B phone sheet, style the menu's group labels as the B section label: 13.5px/600 grey, 16px inset, 20px above.
  - Style items as one flex row: 52px, 16px sides, label then value then a trailing 18px bold chevron, with hairlines between rows.
  - Reuse the Location sheet's row rule for the `b-schedule-more-actions` popover.

### CA-009 · Medium · Three menu looks, and the selected-check position flips
- **Images:**
  - `components/owner-home-1440-open-jose-natal-account-menu.jpg`
  - `components/owner-schedule-1440-open-location-all-locations.jpg` (check on the right)
  - `components/owner-reports-1440-open-report-period-this-week-so-far.jpg` (check on the left)
  - `components/owner-reports-1440-open-export.jpg`
- **What's wrong:**
  - **Account, Location and Schedule options:** one white surface, about 12px radius, hairline dividers, 15px/400 ink.
  - **Insights Period and Export:** every item is a separate white pill with its own drop shadow, 700 weight and 2px gaps. The band rule `owner-b-desktop.css:424` (`.c-title__actions > :last-child :is(.cm-insights__button, button, a)`) matches the popover's own `<button>` items. It excludes only `.nevora-action-menu-popover *`.
  - **The finder** is a third surface.
  - **Selection:** the Period menu shows a check on the left (`reports.tsx:445`); the Location menu shows a teal label with a trailing check.
  - **Export menu:** its note ("For a PDF, choose Save as PDF…") hangs under the last item and visually collides with "39 h 3 min over plan" beneath.
- **Principle:** similarity; Jakob's law (one menu idiom); common region.
- **Fix:**
  - Add `:not(.cm-insights__menu *)` to the selector at `owner-b-desktop.css:424`.
  - Define one B menu spec and apply it to `.nevora-action-menu-popover`, `.cm-insights__menu` and `.command-finder`:
    - white, 16px radius, `--b-elev-2`, 6px padding;
    - 44px items, 15px/400 ink, 8px item radius, hover `#F7F9F9`;
    - selected = teal label plus a trailing bold 16px check.
  - Move the Period check to the trailing edge.

### CA-010 · Medium · The workplace name is truncated in the account menu and the sidebar chip
- **Images:**
  - `components/employee-home-1440-open-maria-rivera-account-menu.jpg` ("Employee · Northside QA Workf…")
  - `components/manager-home-1440-open-elena-ruiz-account-menu.jpg` ("Northside Café & Bak…")
  - `components/employee-my-pay-1440-open-expand-sidebar.jpg` (chip "Northside QA Work…")
- **What's wrong:**
  - The account menu is fixed at 240px (`ActionMenu width`, `action-menu.tsx:23`).
  - The role-and-workplace line ellipsizes, and so does the sidebar workspace tile.
  - Neither has a tooltip or a second line.
- **Principle:** better-layout "truncate with a way back"; Miller's law (keep the one identifier legible).
- **Fix:**
  - Let the menu header wrap to two lines (`white-space: normal; -webkit-line-clamp: 2`) and raise the width to 280px.
  - Give the sidebar chip `title` and an `aria-label` with the full name.

### CA-011 · Medium · ActionMenu "sheet" claims to be modal but isn't
- **Images:** `components/owner-schedule-390-open-location-all-locations.jpg` and `components/owner-schedule-390-open-more-schedule-actions.jpg` (phone sheets built from ActionMenu).
- **What's wrong:**
  - With `sheet`, the popover gets `role="dialog" aria-modal="true"` (`action-menu.tsx:158–160`) but stays `popover="auto"`.
  - The page behind is not inert, so Tab walks out of the sheet into content hidden under it and the scrim.
  - `aria-modal` tells a screen reader the rest is unavailable when it isn't.
  - Browser behaviour was not walked at 390, because the phone sheets were not in the Tab captures.
- **Principle:** WCAG 2.4.3 Focus Order, 2.4.11 Focus Not Obscured, 4.1.2.
- **Fix:**
  - For `sheet`, render a `<dialog>` and call `showModal()`, as QuietSheet does.
  - Or set `inert` on `.page-frame` and `.mobile-nav` while it is open and remove it on toggle.

### CA-012 · Low · ActionMenu naming details
- **Images:** `components/*-open-*-account-menu.jpg`.
- **What's wrong:**
  - `aria-label` on a role-less popover `div` (`action-menu.tsx:161`) is ignored, since ARIA naming is prohibited on generic elements.
  - `title={ariaLabel}` on the trigger (`:138`) adds a native tooltip ("Jose Natal, account menu") that repeats the name.
  - The trigger and menu icons are regular weight; see I1, not repeated.
- **Principle:** WCAG 4.1.2; noise.
- **Fix:** give the non-sheet popover `role="group"` (or drop the label) and remove `title`.

## A3. Sheets and panels

### CA-013 · Medium · One panel, three header and close patterns
- **Images:**
  - `components/employee-schedule-1440-sheet-open.jpg`: 22px left title, grey 36px "Done" pill.
  - `components/owner-timecards-1440-sheet-open.jpg`: 17px centred "Timecard", teal text "Done".
  - `components/employee-schedule-390-sheet-open.jpg`: 15px centred title, teal "Done".
- **What's wrong:**
  - The same right-hand panel has three title sizes and positions and two close treatments.
  - The phone sheet also drops the "Change this shift" heading and the tinted icon circles that desktop shows.
  - Sources: `employee-b-desktop.css:151–152` (title 22/700, Done grey pill) and `employee-shift-sheet.css:28–30` (phone Done teal). The timecard panel follows the corp sheet nav.
- **Principle:** Jakob's law and similarity (a close control should look the same everywhere).
- **Fix:**
  - Adopt one B panel header: title 20/26 700 left (T2's sheet-title size).
  - Done is a teal 600 text button with a 44px hit area, top-right, in every role and width.
  - Use tinted-circle icons in the action rows at all widths.

### CA-014 · Medium · The employee modal panel's scrim leaves the top bar looking live
- **Images:** `components/employee-schedule-1440-sheet-open.jpg` and `components/lead-schedule-1440-open-tuesday-november-10-9-00-am-5-00-pm-cust.jpg`.
- **What's wrong:**
  - The dialog is opened with `showModal()`, so everything else is inert.
  - The backdrop starts at y=64 (`employee-b-desktop.css:146` `::backdrop { inset: 64px 0 0 0 }`).
  - Search, the bell, the account menu and the white sidebar-logo block stay fully bright but ignore clicks.
- **Principle:** figure-ground (the dimmed area should be exactly what's unavailable); affordance.
- **Fix:**
  - Use a full-viewport backdrop (`inset: 0`), keeping the panel at `top: 64px`.
  - Or make it a non-modal inspector like the Owner timecard panel.

### CA-015 · Medium · The phone shift sheet stops mid-screen when the page is scrolled
- **Images:**
  - `components/employee-schedule-390-motion-no-preference-sheet-220ms.jpg` and `-400ms.jpg`
  - `components/lead-schedule-390-motion-no-preference-sheet-400ms.jpg`
  - compare `…-motion-reduce-sheet-400ms.jpg`
- **What's wrong:**
  - With the page scrolled to reach a row, the sheet settles with its bottom edge at about 533 of 844px.
  - Schedule rows and the tab bar are visible and dimmed below it, and the sheet's flat bottom edge is exposed.
  - In the reduced-motion runs, with the page at scroll 0, it anchors to the bottom as designed.
  - Reproduced for both Employee and Lead.
  - The CSS (`quiet/quiet.css:670` fixed `inset: auto 0 0 0`; `corp/corp.css:256` `height: auto`) doesn't explain it. The cause is unconfirmed.
- **Principle:** figure-ground and continuity (a bottom sheet belongs to the bottom edge).
- **Fix:**
  - Reproduce on a device after scrolling the Schedule list.
  - If confirmed, check the scroll lock (`html[data-q-sheet]{overflow:hidden}`, quiet.css:669) against the dialog's containing block, and pin with `bottom: 0; top: auto` under `[data-nv-b]`.

### CA-016 · Medium · There's no keyboard path into the Owner timecard inspector
- **Images:** `components/owner-timecards-1440-sheet-open.jpg`.
- **What's wrong:**
  - The panel is a non-modal `<dialog>.show()` that deliberately leaves focus on the row (`quiet/quiet-sheet.tsx:47–51`).
  - Its controls (Clock-ins and fixes, Approve timecard, Done) come after the whole table in DOM order. A keyboard user tabs through every remaining row, the "people with no time" row and Time exports to reach Approve.
  - Escape closes it (good).
- **Principle:** WCAG 2.4.3 Focus Order; Fitts's law for keyboards (distance in Tab stops).
- **Fix:**
  - On a keyboard open (Enter on the row), move focus to the panel heading (`tabIndex=-1`).
  - Keep the current behaviour for pointer opens.
  - Add "Back to list" focus return on Escape (already wired through `onClose`).

### CA-017 · Medium · Loading shells lack the band, and the logo flashes
- **Images:**
  - `components/owner-inbox-1440-sheet-open.jpg` (desktop skeleton: flat 64px teal bar, no band)
  - `components/owner-inbox-390-sheet-open.jpg`, `components/owner-home-390-keyboard-tab14.jpg`, `components/owner-home-390-motion-no-preference-enter-300ms.jpg` (phone: white pre-B header with the navy "NEVORA WORKFORCE" wordmark)
  - `components/manager-home-390-motion-no-preference-enter-300ms.jpg` (wordmark drawn as a solid navy block with a black square)
- **What's wrong:**
  - RouteSkeleton draws the band only outside the Quiet and Corp shells (`route-skeleton.tsx:12–19`). Under B, `QuietSkeleton` and `CorpSkeleton` (:25–28) replace it.
  - Every route therefore loads on canvas grey, then the 128–308px band drops in. This is a large layout shift and a "two apps" flash on every tab tap.
  - `root-loading.tsx:10–46` already knows each route's band height.
- **Principle:** Gestalt continuity; Doherty threshold (perceived speed relies on a stable frame); CLS.
- **Fix:**
  - Under `[data-nv-b]`, render the B band at the route's final height in the Corp and Quiet skeletons, using the `band` prop already passed. On phones, render the B header (white wordmark on the band).
  - Give the wordmark explicit `width` and `height` and an inline SVG so it never paints as a block.

### CA-018 · Medium · Employee Home loads with a text line and no skeleton
- **Images:**
  - `components/employee-home-390-motion-no-preference-enter-1500ms.jpg` and `-reduce-enter-1500ms.jpg` (still "Loading your shift..." at 1.5s)
  - `components/employee-home-390-keyboard-tab8.jpg`
  - `components/employee-home-1440-motion-reduce.png`
- **What's wrong:**
  - The first card shows "Next shift / Loading your shift..." while the other Home cards are absent. When data lands, the card grows and two more cards appear.
  - Every other route uses a page-shaped skeleton.
  - The string uses three dots instead of "…".
- **Principle:** Doherty threshold (over 400ms with no structure); continuity.
- **Fix:** render the On shift card and the Things to do card as skeletons at their final heights (reuse `CorpSkeleton`'s Home shape) and use "…".

### CA-019 · Medium · The request detail loses its status colour and its insets
- **Images:** `components/employee-requests-1440-sheet-open.jpg` and `components/employee-requests-390-sheet-open.jpg`.
- **What's wrong:**
  - In the list, the request carries an amber "Waiting" chip (`components/employee-requests-1440-hover-row.png`). On its detail page, "Waiting for your manager" is plain ink with no chip or icon.
  - At 1440, "Sent Mon, Nov 9" starts at x=159 but "Thu, Nov 26" at x=155.
  - The helper under Withdraw is inset to x=181 while the button starts at 159.
  - The two cards are 55px apart; DESIGN says 20px.
- **Principle:** similarity (same state, same cue); amber = wait; alignment to shared edges.
- **Fix:**
  - Lead the status row with the amber Waiting chip, or an amber Hourglass bold icon in an amber-tint circle.
  - Put the title, date and helper on the card's 23px content edge.
  - Use a 20px card gap.

## A4. Disclosures

### CA-020 · Medium · Expanded disclosure contents aren't grouped, and switches drift from their labels
- **Images:**
  - `components/owner-profile-1440-open-privacy-and-terms.jpg` and `components/owner-profile-390-open-privacy-and-terms.jpg`
  - `components/manager-profile-1440-open-notifications-on.jpg`
- **What's wrong:**
  - **Privacy and terms:** opening it reveals Privacy Policy, Terms of Use, Support and Delete my account as same-level rows. There's no indent or tint, and the summary loses its divider (`quiet.css:274`), so the children read as siblings.
  - **Notifications at 1440:**
    - each topic row is about 130px tall;
    - the switch drops to its own line, about 700px from its label;
    - there's a large dead band under each row.
  - Source: `manager-profile/manager-profile-live.tsx:190–200`.
- **Principle:** Gestalt common region and proximity; Fitts's law (the switch is far from its label).
- **Fix:**
  - Put disclosure bodies in an inset block (the `q-disclose__body` treatment: 12px radius, `#F2F5F4` fill, 16px inset, `quiet.css:754`), or indent child rows 16px.
  - Lay the switch row out as a two-column grid (`minmax(0,1fr) auto`, `align-items: center`, `min-height: 64px`).

### CA-021 · Low · Disclosure carets mean two things
- **Images:**
  - `components/owner-profile-1440-open-privacy-and-terms.jpg` (Notifications ›, Privacy ⌄)
  - `components/manager-profile-390-open-notifications-on.jpg`
  - versus `components/employee-exchange-390-open-why-other-shifts-aren-t-available-date-l.jpg` (⌄/⌃)
- **What's wrong:**
  - Profile disclosures use CaretRight rotated 90° when open (`quiet.css:233`, `manager-profile-live.tsx:191`). A right chevron says "go to a page" everywhere else.
  - DESIGN Round 4 (1485): "Help, Calendar and Privacy open with the same grey down caret."
- **Principle:** Jakob's law and similarity.
- **Fix:** use CaretDown bold 16px `#6A7176` for every `<details>` summary, rotating to up when open.

### CA-022 · Medium · "What changed in your schedule" list is unsorted and cramped
- **Images:** `components/employee-schedule-1440-open-what-changed-in-your-schedule.jpg`.
- **What's wrong:**
  - The rows read Wed, Sat, Mon, Sun, Tue, Thu, Fri.
  - Hairlines sit directly under the second text line with no bottom padding.
  - All seven rows say "Added" with no chip or icon, so a real removal or time change won't stand out.
- **Principle:** Miller's law (chunk and order); visual hierarchy; similarity.
- **Fix:**
  - Sort by shift date.
  - Use 12px vertical padding per row.
  - Use a status chip per change: green "Added", amber "Changed", grey "Removed" with words, per the B chip rules.

## A5. Forms and validation

Validation placement is correct everywhere: the error sits under its field, the border turns red, focus goes to the first error, and `aria-describedby` is set.

### CA-023 · High · The time-off date field hides what a keyboard user types
- **Images:**
  - `components/employee-requests-tab-new-1440-keyboard-tab8.jpg` and `-390-keyboard-tab8.jpg`
  - Tab order in manifest `data` (employee and lead `/app/requests?tab=new`): stops 7–14 are four `input.` stops per date field, with `focusRing: "none"` on three of them.
- **What's wrong:**
  - `PickField` lays a transparent native `<input type="date">` over a fake "Choose date" span (`employee-mobile/timeoff.tsx:24–35`).
  - Keyboard Tab enters the month, day and year segments, but they are invisible. The field still reads "Choose date" while digits are typed, until a full valid date exists.
  - The only cue is a 1.5px border tint. A sighted keyboard user or a magnifier user cannot see the value being entered or which segment is active.
- **Principle:** WCAG 2.4.7 Focus Visible, 3.3.2 Labels or Instructions; Doherty (no feedback).
- **Fix:**
  - When the input has `:focus-visible` (keyboard), show the native control. Add to `requests.css`: `.tof-pick:has(> input:focus-visible) > span { visibility: hidden } .tof-pick:has(> input:focus-visible) > input { opacity: 1; color: #111517 }`.
  - Or replace the overlay with a visible button that calls `showPicker()`, plus a real text field fallback.

### CA-024 · Medium · Three validation voices, partial flagging, and no error icon
- **Images:**
  - `components/owner-schedule-new-1440-form-submitted-empty.jpg` ("Choose person", "Choose start": no period, lower-cased label)
  - `components/employee-requests-tab-new-390-form-submitted-empty.jpg` ("Choose a valid start date.": only From is flagged; To stays empty and unflagged)
  - `components/owner-updates-compose-1440-form-submitted-empty.jpg` ("Title must contain 1–120 characters." for an empty title)
- **What's wrong:**
  - The messages come from three systems: `form-validation.tsx:41–43` builds "Choose ${label}"; the time-off form validates one field at a time; Updates shows a server-style range message.
  - All errors are red text with no icon. Direction B pairs state with an icon, colour and words.
  - The copy audit doesn't cover these strings.
- **Principle:** consistency; WCAG 3.3.1 Error Identification (each missing field should be flagged); 1.4.1 (colour plus words is met, but the icon is the B convention).
- **Fix:**
  - One pattern in `form-validation.tsx:38–51`: "Choose a person.", "Choose a start time.", "Add a title." (field-specific nouns via a `data-error` override).
  - Flag every empty required field on submit in the time-off form too.
  - Prefix the error with WarningCircle bold 14px `#B42318`, `aria-hidden`.

### CA-025 · Medium · Start and End offer 96 quarter-hours from midnight
- **Images:**
  - `components/owner-schedule-new-1440-form-empty.jpg`
  - Tab order in manifest `data` (owner `/app/schedule/new`): the select text runs "Choose12:00 AM12:15 AM12:30 AM…"
- **What's wrong:**
  - `timeChoices()` returns all 96 `QUARTERS` starting at 12:00 AM (`schedule-shift-form.tsx:28–31`).
  - Reaching 9:00 AM in the desktop listbox is 36 steps, and the list has no default.
- **Principle:** Hick's law; Fitts's law (scroll distance).
- **Fix:**
  - Default Start to the location's usual opening time, or the previous shift's start, and End to Start plus 8h.
  - Order the list so it opens scrolled to the default.
  - Keep typeahead.

### CA-026 · Medium · Off switches nearly vanish, and the switch is 31px tall
- **Images:**
  - `components/owner-schedule-new-1440-form-submitted-empty.jpg` (Shift lead)
  - `components/owner-updates-compose-390-form-submitted-empty.jpg` (Ask them to confirm)
- **What's wrong:**
  - The off track is `--c-field #D5D8DA` on a white card: 1.43:1 (`corp/corp.css:186`), under a white knob.
  - The switch is 51×31px (probe: `input.c-switch` ×36 and `input.q-tog` ×64 under 44).
  - C6 covers field edges, not the switch.
- **Principle:** WCAG 1.4.11 Non-text Contrast (control boundary and state); Fitts's law.
- **Fix:**
  - Off track `#8C9397` (3.12:1), or keep the light fill with a `1.5px #6A7176` inset ring.
  - Give the switch a 44px hit area: `::before { inset: -7px -2px }`, or let the whole `label.c-shift__lead` row be the target (already a `<label>`, so make it at least 48px tall).

### CA-027 · Low · The Person field shows an empty avatar circle
- **Images:** `components/owner-schedule-new-390-form-empty.jpg`.
- **What's wrong:** `c-av c-av--grey` renders an empty grey disc before a person is chosen (`schedule-shift-form.tsx:111`). It reads as a broken image.
- **Principle:** aesthetic-usability.
- **Fix:** render a UserIcon bold 16px in the tinted circle until a person is chosen.

### CA-028 · Low · The desktop segmented-control thumb is squashed
- **Images:** `components/employee-requests-tab-new-1440-form-empty.jpg` (about 24px thumb in a 44px track) versus `-390-form-empty.jpg` (thumb fills the track).
- **What's wrong:** a new rendered instance of S5.
- **Principle:** concentric geometry; similarity.
- **Fix:** thumb `height: calc(100% − 8px)` with a 4px inset, as on phone (S5's one spec).

## A6. Hover, press and focus-visible

### CA-029 · Medium · Hover paints cards the canvas colour, and some rows have no hover
- **Images:**
  - `components/manager-timecards-1440-hover-row.png` (Time exports card turns `#F2F5F4` and merges with the page)
  - `components/employee-schedule-1440-hover-row.png` (Open shifts)
  - `components/employee-requests-1440-hover-row.png`
  - `components/owner-employees-1440-hover-row.png`
  - versus `components/owner-home-1440-hover-row.png` ("Cover 3 open shifts": no hover at all)
- **What's wrong:**
  - The row hover tint equals the canvas (`owner-b-desktop.css:402` `#F2F5F4`, listed in B4). A single-row card loses its edge on hover.
  - `.b-row__hit` rows that carry a trailing button show no hover.
- **Principle:** figure-ground; similarity (same row, same feedback).
- **Fix:**
  - One `--b-hover: #F7F9F9` (1.06:1, enough as a tint but distinct from the canvas) inside white cards.
  - Add a hover to `.b-row:has(.b-row__hit)`.
  - Keep all of it under `@media (hover: hover)` (B4).

### CA-030 · Medium · The live-tile focus ring is clipped to one edge
- **Images:** `components/owner-home-1440-keyboard-tab3.jpg` (crop: only the left edge of the white ring shows on "Open shifts").
- **What's wrong:**
  - `.b-live` clips its children (`owner-b.css:60` `overflow: hidden; border-radius: 18px`).
  - The tile ring uses `outline-offset: -2px` (`owner-b.css:30`).
  - At 1440 only the leading edge renders, so the focused figure is ambiguous among three tiles.
- **Principle:** WCAG 2.4.7 (weakened), 2.4.13; DESIGN 1483 "white focus rings on the hero".
- **Fix:** `.b-live__a:focus-visible { outline: none; box-shadow: inset 0 0 0 2px #fff; position: relative; z-index: 1 }`. Keep `border: 1px solid transparent` for forced colours.

### CA-031 · Low · Focus styles vary, and a badge covers the rail ring
- **Images:**
  - `components/owner-home-1440-keyboard-tab20.jpg` (the red "16" sits on top of the teal ring)
  - `components/employee-requests-tab-new-1440-keyboard-tab14.jpg` (date field: 1.5px border tint)
  - `components/manager-schedule-new-1440-keyboard-tab8.jpg` (note field: double ring)
- **What's wrong:**
  - Fields use three focus treatments: outline 2px, the inset box-shadow 2px on `.tof-note` (`employee-b/requests.css:129`), and a border colour change.
  - The rail count badge overlaps the focus ring.
- **Principle:** similarity; WCAG 2.4.7.
- **Fix:**
  - Fields: `outline: 2px solid #0B6E69; outline-offset: 2px` everywhere, with no inset box-shadow.
  - Rail: give `.nav-link:focus-visible` `z-index: 1`, or move the badge to `inset-inline-end: -4px; top: -4px` outside the ring path.

### CA-032 · Low · Rows stay tinted after a tap on phones
- **Images:**
  - `components/owner-timecards-390-sheet-open.jpg` ("Other dates" row grey)
  - `components/owner-profile-390-open-privacy-and-terms.jpg` ("Privacy and terms" row grey)
- **What's wrong:** the tapped row keeps a grey tint after the tap. This is likely latched `:hover` (B4 lists tablet layers; this is a 390 instance). Not verified on a device.
- **Principle:** better-ui "hover only on hover-capable pointers".
- **Fix:** wrap the q-row and c-row hover rules in `@media (hover: hover)`.

## A7. Motion

**Measured:**
- The sheet slides in about 200–240ms (40ms frame about 70% open, 120ms about 95%). It settles by 220ms, uses `cubic-bezier(.32,.72,0,1)`, and opens over a 360ms backdrop fade.
- Under reduced motion the sheet appears at full position at 40ms with no travel. That is an instant swap, not a cross-fade; see M2, not repeated.
- The card enter has 4px blur and translate, still visible at 600ms after navigation on Employee Home. Under reduced motion there is no blur (`employee-home-1440-motion-reduce.png`).
- No keyframes on toggles; the finder and menus open without animation (correct for frequent tools).

### CA-033 · Low · The entrance blurs the page title, not just the cards
- **Images:** `components/employee-home-390-motion-no-preference-enter-600ms.jpg` (hero "Home", date and avatar all blurred) and `components/employee-home-1440-motion-no-preference.png`.
- **What's wrong:**
  - The b-enter stagger is applied to the hero text as well as the cards. The page's identity (its h1) is unreadable for the first 300–600ms of every arrival.
  - Whether it also runs on routine tab taps, which DESIGN 1386 forbids ("No motion on routine taps"), was not verified.
- **Principle:** better-ui "stagger infrequent entrances"; Doherty (orientation first).
- **Fix:** keep the hero static and stagger only `.b-stack > *`. Run the entrance on first load per session, not on every tab change.

## A8. Sidebar collapse and expand

- **Images:** `components/*-open-collapse-sidebar.jpg` (18) and `components/*-open-expand-sidebar.jpg` (14).
- **Works:**
  - The toggle has `aria-expanded` and `aria-controls` (`app-shell.tsx:406`).
  - The collapsed state persists across pages.
  - Rail tooltips appear on focus and hover (`components/owner-home-1440-hover-sidebar-link.png`).
- Issues are folded into CA-031 (badge over the ring) and CA-038 (rail targets 40×40 on touch tablets).

---

# Part B: Accessibility across all surfaces

## B1. axe-core violations, grouped by rule (867 audits)

Audits per surface:

| Surface | Audits |
|---|---|
| employee-desktop | 34 |
| employee-phone | 62 |
| lead | 99 |
| manager | 212 |
| native-app | 23 |
| owner-desktop | 74 |
| owner-phone | 138 |
| public | 22 |
| tablet | 203 |
| clocker | 0 |
| components | 0 |

Violations by rule (number of audits affected):

| Rule (impact) | Audits | Nodes | emp-desk | emp-phone | lead | manager | native | own-desk | own-phone | public | tablet |
|---|---|---|---|---|---|---|---|---|---|---|---|
| color-contrast (serious) | 783 | 3,603 | 34 | 57 | 92 | 183 | 19 | 74 | 99 | 22 | 203 |
| definition-list (serious) | 60 | 60 | 3 | 3 | 6 | 18 | 4 | 5 | 7 | – | 14 |
| dlitem (serious) | 60 | 368 | 3 | 3 | 6 | 18 | 4 | 5 | 7 | – | 14 |
| landmark-unique (moderate) | 8 | 8 | – | – | – | 3 | – | 1 | 2 | – | 2 |
| aria-prohibited-attr (serious) | 8 | 8 | – | – | – | 3 | – | 1 | 2 | – | 2 |

No other rules fired: no missing names, labels, alt text, `aria-*` misuse beyond the above, or `button-name` / `link-name`. This confirms the code audit's "no icon-only control without a name".

### color-contrast targets, classified (real vs false positive)

| Class | Targets | Top selectors (count) | Verdict |
|---|---|---|---|
| Phone tab-bar labels | 1,293 | `.mobile-nav-link[href$="schedule"] > span` 291; `…timecards` 204; `…employees` 180; `…app` 130; `…my-time` 119; `…my-pay` 119; `a[aria-label="To do, 16 need you"] > span` 100 | **Real.** Measured 3.68:1 (probe) on every phone page. Already C3; fix there. |
| Finder trigger on band | 792 | `.command-finder-trigger > span` 400 (3.42:1); `> kbd` 392 (3.54:1) | **Real.** Already C1 (white .78 on glass). |
| h1 on the band | 410 (plus 422 probe h1 entries) | `h1` 100, `#owner-only-title` 42, `.b-title__text > h1` 24, `#b-timeoff-title` 20, `#not-found-title` | **False positive.** The tool resolves the background to canvas `#F2F5F4` (white on canvas = 1.10:1) because the band is painted with `border-image`, `box-shadow` and `outline` extensions (S7). Rendered pair: white on `#0C726C`–`#08504C`, which passes. |
| Other white text on the band | 366 | `.q-nav__l` 110, `.c-nav__back` 98, `.b-back` 92, `.b-eyebrow` 32, `dd.b-live__v` (probe 1.08:1 ×56) | **Mostly false positive** for the 100%-white labels and figures. The alpha sub-lines (`.b-eyebrow`, `.c-title__sub` ×20) are real under C1. |
| Visually hidden text | (probe) | `span.b-sr` 103 (1.06–4.26:1), `span.b-sr "# things to do today."` 26 | **False positive** (clip-path hidden). |
| Decorative dot separators | (probe) | `span.eb-dots__sep "·"` 246 (1.06–4.37:1) | **Exempt** if `aria-hidden` (they are decorative); see CA-035. |
| Remaining | 141 | `.c-select-btn` 14, `.q-nav__t` 6, `.ma-language` 6, public `.q-legal` and footer links 6 each, `.b-btn--glass` "Pay history" on the ink band 4, `.ep-next__k` 4 | **Real:** `.q-legal` `#8A8A87` on `#F2F5F4` = 3.16:1 (public). The others are band-glass labels under C1. |

## B2. Probe contrast (lowContrastText) not covered by C1–C5

- **Grey values on `#ECEEEF` fills, 4.26–4.30:1** (`rgb(107,112,117)` on `rgb(236,238,239)`, 15px):
  - Selectors: `span.q-rv.q-rv--l` ("Not yet" ×72, "Puerto Rico" ×54, "Not added" ×26), `span.nv-keep` ×100+, `p.wb-note`, `span.wc-meta`, the Profile notification sub-lines (×50 each), `span.pmp-part` (email parts ×24 each), `payroll-export…columnNumber` 4.15:1 ×64.
  - Surfaces: Settings, Profile, Payroll export.
  - This is C5's pair. It is listed because it shows up on about 620 nodes across Owner and Manager Settings, Profile and Payroll. Whether the row really renders on `#ECEEEF` or on a white row over a `#ECEEEF` list fill needs one browser check.
- **`p.q-legal` public footer:** 3.16:1. This is the warm Quiet grey `#8A8A87` (C10). Real.
- **`span.portal-notification-count` 1:1 at font-size 0px** (×252): visually hidden. False positive.

## B3. Target sizes

- **Under 24px (WCAG 2.5.8 AA):**
  - **Real:**
    - Payroll export per-person checkboxes, 20×20 (`input` "Export Carlos Vega" and 11 more, `tablet/owner-payroll-export-900`);
    - Scheduling-rules checkboxes, 22×22 (`tablet/owner-schedule-settings-900`);
    - public footer links Support 45×15, Privacy 42×15, Terms 35×15 (`public/public-welcome-390`), which sit in a row, not inside a sentence;
    - `a.ma-footer-help` 80×22, "Forgot password?" 147×22 (`public/public-login-1440`).
  - **Exempt (inline in sentences):** `support@thevelani.com` 170×19 ×144, "Forgot access", "Privacy Policy", "Account deletion" 19px tall in Help and Terms text.
  - **Not tab-reachable (`tabIndex=-1`):** `input.q-sr` and `button.q-sr` ("Save", "Add location").
  - **Real and invisible:** `button.b-sr` / `c-sr` "Apply search", 1×44. See CA-034.
- **Under 44px at touch-tablet widths** (the project's own 44/48px rule; extends B1 with shell selectors B1 didn't list):

  | Target | Size | Instances |
  |---|---|---|
  | Rail `a.nav-link` | 40×40 | about 3,000 |
  | `a.portal-notification-bell` | 40×40 | 385 + 35 |
  | Account trigger | 40px tall | about 420 |
  | `button.command-finder-trigger` | 40px tall | 286 |
  | `a.c-nav__back` | 80×32 | 50 |
  | `a.cm-block.open` (grid open shifts) | 75×28 | about 300 |
  | `a.b-btn--teal` "Find cover" | 99×36 | 48 |
  | `a.b-row__hit` | 40px tall | 41 |
  | `input.c-switch` / `q-tog` | 51×31 | 100 |

## B4. Text under 12px (new beyond T5)

| Element | Size | Instances | Source |
|---|---|---|---|
| `span.c-ampm` (the "a/p" in "12a–6a" on the Schedule grid) | 10.4px | 391 | `corp/corp.css:517` (`0.8em` of 13px) |
| Home "This week" chart day letters M T W T F S S | 11.5px | 294 | — |
| `span.portal-notification-count` | 11px | 310 | — |
| `span.q-count` "9 unread" | 11px | 65 | — |
| Payroll export column numbers | 11px | 64 | — |
| Public footer "NEVORA is a product of VELANI" | 10px | — | — |
| `span.login-brand-module` "Workforce" (logotype) | 9px | 219 | Exempt as part of the logo |

Already in T5: tab labels 10.5px (×1,970), `nav-count` 11.5px (×286), `b-tab-badge` 11px (×128) and chips at 11px.

## B5. Keyboard order, skip link and focus rings (manifest Tab orders)

- **Desktop, all roles:**
  - DOM order is skip link, sidebar toggle, rail links (7–9), breadcrumb (Schedule/new), Search, bell, account, then main.
  - That is 12–15 stops before content, and the skip link is the first stop (`app-shell.tsx:395`; `premium-desktop.css:256–263`).
  - The walks started with focus already in main (route focus moves to `#main-content`, `tabIndex=-1`), which is correct.
- **Focus rings:**
  - White 2px on the band and top bar; teal `#0B6E69` 2px on cards.
  - `rgb(8,117,113)` for the skip link and phone tab bar: a near-duplicate teal (a token nit, folded into CA-031).
- **Phone:** the skip link is `display: none` under 761px. That is acceptable (header has 3 stops), but external-keyboard and switch users on phones get none.
- **Invisible stops found:** "Refresh current view" at (−1, 794, 32×44) under the tab bar on Owner `/app` and `/app/schedule/new` and Manager `/app` and `/app/schedule/new` at 390. Also a zero-size `a.mobile-nav-link` "Time" (0×0) on Manager `/app/schedule/new` 390. See CA-034.
- **Employee and Lead request form (desktop):** the band "Cancel" back link is 89×32. Date fields consume 4 Tab stops each (CA-023).

## B6. Landmarks, headings and titles

- **Landmarks:** skip link → `<aside class="sidebar">` holding `<nav aria-label="Primary navigation">` → `<header class="mobile-header">` (with `<nav aria-label="You are here">`) → `<main id="main-content" tabIndex=-1>` → `<nav aria-label="Mobile navigation">`. One main on every page.
- **Headings:** all 867 audits have exactly one visible h1, except Manager Inbox "Done and older" (`manager/manager-inbox-view-more-320` and `-390`), which renders it twice.
- **Page titles:** covered by the copy audit; not repeated.

## Accessibility findings

### CA-034 · High · Visually hidden controls stay in the Tab order
- **Images and evidence:**
  - manifest Tab orders: Owner `/app` 390 stops 11 and 21; Owner `/app/schedule/new` 390 stops 13 and 18; Manager `/app` 390 stops 5, 13 and 17; Manager `/app/schedule/new` 390 stops 13 and 19;
  - probe `targetsUnder24` for `button.b-sr` / `c-sr` "Apply search" 1×44 on Owner and Manager Team, at phone and tablet widths;
  - `components/owner-home-390-keyboard-tab14.jpg` (the walk during the checking state).
- **What's wrong:**
  - **Refresh current view:** while a page's access check runs, `quiet/quiet.css:590` clips every child of `.portal-route-state[data-checking]` except the skeleton, including the "Refresh current view" button (`company-access/scoped-read-frame.tsx:181`). The button stays focusable, so Tab lands on an invisible control under the tab bar.
  - **Apply search:** the Team search's submit "Apply search" is visually hidden but tabbable (`owner-b/team-b.tsx:49`, `employee-directory.tsx:79`), and it comes before the search field.
  - In both cases focus disappears for a stop.
- **Principle:** WCAG 2.4.7 Focus Visible (escalation trigger), 2.4.3.
- **Fix:**
  - Add `tabIndex={-1}` to both "Apply search" buttons; Enter in the field still submits, as `new-location-form.tsx:114` already does.
  - In the checking state, render the refresh button only when `stuck` is true, or give it `tabIndex={-1}` and `aria-hidden` until then (`scoped-read-frame.tsx:181`).

### CA-035 · Medium · Contrast instances beyond the code audit
- **Images:** `public/*` login and welcome pages; Owner and Manager Settings, Profile and Payroll export (probe).
- **What's wrong:**
  - Public footer `p.q-legal` `#8A8A87` on `#F2F5F4` = 3.16:1 at 13px.
  - About 620 grey values at 4.26–4.30:1 on `#ECEEEF` (B2), on Settings, Profile and Payroll export.
  - `eb-dots__sep` separators are reported at 1.06–4.37:1. Mark them `aria-hidden="true"` so they are clearly decorative (they carry no meaning).
- **Principle:** WCAG 1.4.3.
- **Fix:**
  - `.q-legal` → `#6A7176` (4.52:1 on canvas).
  - Apply C5's `--b-grey-on-fill: #5E666B` to `q-rv`, `wb-note`, `wc-meta` and `pmp-part` wherever the row is a fill.
  - Add `aria-hidden` on `Dotted` separators (`employee-b/parts.tsx`).

### CA-036 · Medium · Live figures use invalid definition-list markup
- **Images:** every Home and the Employee and Lead Home band (`components/*-home-1440-*.jpg`). axe: `definition-list` 60 audits; `dlitem` 60 audits and 368 nodes. Top selectors `.b-live`, `a[aria-label="Late: 0. Missed clock-ins"] > .b-live__l`.
- **What's wrong:**
  - `<dl class="b-live">` contains `<div><a><dt/><dd/></a></div>` (`owner-b/b-kit.tsx:45–52`). `dt` and `dd` inside a link break the list.
  - The link's `aria-label` overrides the term and value anyway, so screen readers get inconsistent list counts.
- **Principle:** WCAG 1.3.1, 4.1.2.
- **Fix:** render `<ul class="b-live">` with `<li><a aria-label=…><span class="b-live__l"/><span class="b-live__v"/></a></li>`. Keep a `<dl>` only for the non-link variant.

### CA-037 · Low · A prohibited ARIA name and a duplicate landmark name
- **Images:**
  - axe on `manager/*`, `owner-desktop/*`, `owner-phone/*` and `tablet/*` inbox and compose (8 audits each);
  - `manager/manager-inbox-view-more-320` and `-390` (duplicate h1).
- **What's wrong:**
  - `div aria-label="Update review feedback"` (`communication-compose.tsx:148`) names a generic element.
  - The Approve/Decline `<form>` inside each inbox row (`.b-row__acts > form`) becomes a landmark with a duplicate name.
  - Inbox "Done and older" renders two h1s.
  - The primary navigation is wrapped in `<aside>` (`app-shell.tsx:396`), so it exposes as a complementary landmark.
- **Principle:** WCAG 4.1.2; landmark hygiene; the one-h1 recommendation.
- **Fix:**
  - Add `role="group"` to the feedback div.
  - Remove the form's accessible name, or make it unique ("Decide Maria Rivera’s time off").
  - Keep one h1 on `?view=more`.
  - Change `<aside class="sidebar">` to `<div>` (the nav inside is the landmark).

### CA-038 · Medium · Target sizes: real AA misses and touch-tablet shell targets
- **Images:** `tablet/owner-payroll-export-900.jpg`, `tablet/owner-schedule-settings-900.jpg`, `public/public-welcome-390.jpg`, `public/public-login-1440.jpg`, and every `tablet/*-900.jpg` (rail, bell, account, finder).
- **What's wrong:** see B3. The real 2.5.8 misses are:
  - 20px and 22px checkboxes;
  - footer link rows at 15px tall;
  - the 22px public help and forgot links.
  On touch tablets the whole top bar and rail sit at 40px, and grid open-shift blocks at 28px.
- **Principle:** WCAG 2.5.8 (AA); Fitts's law; the project's own 48px rule.
- **Fix:**
  - Checkboxes: wrap in a `label` row at least 44px tall, or give them `::after { inset: -12px }`.
  - Footer links: `display: inline-flex; min-height: 44px; align-items: center`.
  - Under `@media (pointer: coarse)` (with B1): rail links, bell and account at 44px; finder trigger at 44px; grid blocks at least 32px plus a 6px `::after` extension.

### CA-039 · Low · Text under 12px, new instances
- **Images:** `owner-desktop/owner-schedule-1440.jpg` (12a–6a), `owner-desktop/owner-home-1440.jpg` (week letters), and payroll export.
- **What's wrong:** see B4. The `.c-ampm` suffix at 10.4px is the smallest live text on the Schedule grid, the most-read grid in the app.
- **Principle:** better-typography size floors (12px).
- **Fix:**
  - `.c-ampm { font-size: 0.85em }` in 14px grid cells, or render "12:00 AM" style on desktop where width allows.
  - Week letters, counts and column numbers at 12px/700 (the T5 count rule).

### CA-040 · Low · The band defeats automated contrast checks
- **Images:** every band page; 410 axe targets plus 422 probe h1 entries are false positives (B1).
- **What's wrong:** the band is drawn with `border-image` and `box-shadow` extensions (S7), so axe and the probe read white text over `#F2F5F4`. About 22% of all colour-contrast nodes are noise, which hides real regressions.
- **Principle:** testability. This is not a user-facing failure.
- **Fix:** give the hero container a real `background` with the B band (S7's fix). Otherwise, add an axe `exclude` for `.b-hero h1, .c-title h1` only after a rendered pixel check passes.

---

## Top 10 for this area

| # | ID | Sev | Why first |
|---|---|---|---|
| 1 | CA-034 | High | Invisible focus stops on Owner and Manager phones and on Team at every width. A one-line fix each (`tabIndex={-1}`). |
| 2 | CA-023 | High | Keyboard users can't see the date they type on Request time off (Employee and Lead), the most common Employee form. |
| 3 | CA-002 | High | The finder's only keyboard-position cue is a 1.15:1 tint, on all 32 finder states. |
| 4 | CA-001 | High | Arrow keys can move the finder selection out of view. Add `scrollIntoView` and `overscroll-behavior`. |
| 5 | CA-008 | High | The phone Schedule options sheet looks broken (flush-left items, orphaned chevrons) on the main scheduling screen. |
| 6 | CA-017 | Medium | Every route loads without the band (pre-B header on phones), then the band pops in: CLS and a "two apps" flash on each tab tap. |
| 7 | CA-009 | Medium | Three menu looks. The Insights items render as stacked pills because `owner-b-desktop.css:424` leaks into the popover. Unify on one B menu spec. |
| 8 | CA-013, CA-014 | Medium | One right-hand panel has three header and close patterns, and the employee modal leaves the inert top bar bright. |
| 9 | CA-020 | Medium | Disclosure contents aren't grouped, and the notification switches sit about 700px from their labels on desktop Profile. |
| 10 | CA-036 | Medium | Invalid `dl` markup on every Home live strip (60 audits, 368 nodes). Swap to a list of links. |

**Counts:** 40 findings: **5 High · 23 Medium · 12 Low**. CA-030, the clipped focus ring, stays Medium because one ring edge stays visible.

**By ID:**
- **High (5):** CA-001, CA-002, CA-008, CA-023, CA-034.
- **Medium (23):** CA-003, 004, 005, 009, 010, 011, 013, 014, 015, 016, 017, 018, 019, 020, 022, 024, 025, 026, 029, 030, 035, 036, 038.
- **Low (12):** CA-006, 007, 012, 021, 027, 028, 031, 032, 033, 037, 039, 040.

**Verdict: Block.** Five High findings remain: three are WCAG 2.4.7 and 1.4.11 failures, and two block or confuse a task.
