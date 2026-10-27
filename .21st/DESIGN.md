# NEVORA mobile design context

Authoritative tokens: src/app/mobile-workforce.css and src/components/manager-home-mobile.css. Authoritative decisions: DESIGN.MD and .21st/design.json.

## Remaining mobile workforce pages (2026-10-13)

The user approved mobile Home and authorized its extension across the remaining mobile website. This supersedes the older rule that other mobile pages retain a List menu. At <=760px, authenticated routes other than /app use data-mobile-workforce="true". All Home views and authentication retain their approved world. Desktop retains the incumbent layout. The public Clocker has a separate data-mobile-clocker scope.

Use the original inverse NEVORA wordmark with centered Workforce, deep-blue masthead, one notification bell, and a regular Phosphor UserCircle for management navigation. Native action popovers become bottom sheets with a visible Close actions control; contextual triggers use Phosphor DotsThree with the original accessible name. Keep role-owned routes, keyboard focus, light dismissal and Escape behavior.

The mobile-workforce.css token family supplies #062959 masthead, #0756D9 action blue, #EDF4FF selected wash, #F7F8FA canvas, white cards, #111827 ink, #4B5563 secondary text, 16px outer inset, 24px group gap, 20px cards, 14px controls, 17px main labels/actions, 15px supporting copy and 24px page titles. Retain local Inter/JetBrains Mono and the existing Phosphor icon family. No ornamental media or animation.

Scheduling uses a single-row, horizontally scrollable day strip; the page itself must never overflow. People and settings use grouped rows with quiet separators rather than nested bordered cards. Timecards expose totals/issues before an optional Review timecard disclosure. Payroll population detail is optional only when a confirmed review is present; busy/retry states reveal its existing content. The same DOM children remain visible on desktop and print. Existing protected readers, current-actor checks, retry commands, approval rules, privacy clearing, and mutation handlers remain authoritative. Timecard refresh may remount cards and reset their local disclosure choice; no private data is retained to preserve it.

Mobbin references are inspiration, not pixel-clone targets: Gusto pay history 06042184-b5dd-4e9c-be17-f969ee4b6819, paycheck b9bf269f-2d5e-4f19-9ada-338ae6cdebdf, grouped fields f09f34c2-f06b-4dd1-b234-2ba87a2d665d, time-off 1d88efc1-af34-41ec-a9d0-641d625044c9 and 615a1c68-9a32-4425-90eb-17f6a318a269. InsightTimer 71782ac6-9f21-4620-8cc7-e1d53c6f57c0 supplies selected-day anatomy; Mindtrip 3c9062c0-27d9-4379-92c0-156da56b853c supplies date/time sheet organization.

Actual 21st component code retrieved through its authenticated CLI catalog: Preferences Card 30553 (ssychui), Calendar 34716 (halaska-studio), Sheet 35214 (kevingirelli). Adapted grouped rows/calendar states/sheet exit anatomy to native existing components; no demo data, dependencies or hosted AI generation. 21st MCP was not exposed in this session. Screenshots never become rendered page assets.

Scope/QA:41 remaining route patterns, actual employee and lead variants, phone sizes320/390, desktop1440 plus breakpoint checks. This is a light-only responsive web preview; no native iOS, touch/DPR, dark-mode, reduced-motion emulation or 200% browser zoom claim. Source-backed reduced-motion rules remain. Browser tests use an owned synthetic fixture, no real messages, credential edits, payroll processing or customer-data changes.

## Gusto Home — 2026-10-15

Jose rejected a blue-portal refinement as not Gusto-like enough and approved Gusto's layout and palette for the manager/Owner Home Overview, at all widths. This section supersedes, for that view only, the 2026-10-12 Overview rules (tab row, three planning metrics, week chart) and the 2026-10-13 mobile Home masthead/accent colours. Every other route, Employee/Lead Home, sibling Home views (Attendance, Schedule, Team, Requests, Activity) and authentication keep the portal blue.

Tokens live in `src/components/manager-home-gusto.css`, scoped to `.app-shell.nevora-portal:has(.manager-portal-home)`: teal accent #077572 (hover #055C5A, text on wash #07605F), wash #E7F3F2, phone masthead #1C4A47, ink #1C1C1C, muted #5F6368, border #D7D9DC, hairline #ECEDEF, white canvas, coral #E1553F for urgent task bars only, 6px desktop task cards and 12px phone cards. The same block remaps the portal tokens so the sidebar, focus rings and buttons are teal on Home. Inter/JetBrains Mono, Phosphor icons and the NEVORA wordmark are unchanged.

Overview content: time-of-day greeting in the workspace time zone and one subtitle; a Tasks column (the existing Action Center with the same filters, grouping, preview limit, URL state, provenance and Recovery tools) whose items are bordered cards with a left accent bar and a teal "›" text link; a plain right rail with This week (selected-week planned shifts including drafts, availability received/active employees, explicitly PUBLISHED locations, week arrows and View schedule), Clocked in now, and Shortcuts (Attendance, Team, Requests, Activity, keeping `?week=`). The Overview no longer renders the tab row, KPI strip or weekly chart; the other views still render the tab row. A verified-empty task source shows "You’re all caught up" above the unchanged checked-sources sentence; unconfirmed states never show it. Phones keep the masthead/overlapping-card structure, 17px/15px type tokens, 44px targets and the Review tasks disclosure, with teal link rows and a teal active tab without a wash.

References: Gusto web Home on Mobbin 40dc9c69-d27f-4616-bafb-0efbaaec4347, 1a6001a9-476b-4011-8e29-c2b84efbf2fb, c7f9f6bb-e33a-47a2-95c4-3cfac53c32f4; Gusto Mobile Home fa4081e0-675f-467a-aa70-8e7b16148c00. Composition and colour references only; no screenshot or Gusto asset is rendered.

### Home system refinements (Batch 1) — 2026-10-15

Jose gave Claude authority over NEVORA UI decisions, including overriding earlier rules in this file. These refinements apply to the manager/Owner Home and supersede anything above that conflicts with them.

- **Type:** five sizes (28 display, 20 section, 16 body, 14 small, 12 caption) at weights 400/500/600 only, with tabular figures for all numbers. Phones keep the 17px body and 15px caption tokens.
- **Buttons:** three tiers. Primary is a solid teal fill. Secondary is white with a #D7D9DC border and 8px radius. Tertiary is teal text, used for Refresh and "›" links. All share 120ms background/press feedback, removed under reduced motion. Every disclosure uses one Phosphor CaretDown that rotates when open; the +/− symbol is no longer used on Home.
- **Vocabulary:** "tasks" everywhere (headings, filters, counts, statuses, accessible names). Groups read as one sentence ("10 employees haven’t submitted availability") with a "Review" chevron. Rows inside a group show only the item sentence and its link. "Showing n of n" stays as a live status but is visually hidden when everything is visible. Timestamps read "Updated 4:49 PM", without seconds. Labels use sentence case ("On floor").
- **Numbers:** availability and published locations read "n of total" over a 4px teal progress bar. The text carries the meaning and the bar is aria-hidden. Count badges appear only when they add information; the "Clocked in now" badge is hidden at zero. Zero activity is one line: "No one is clocked in right now."
- **Organization:** category filters appear only when two or more categories have tasks (or a filter is active). Recovery tools moved from the task list into Shortcuts as Clocker recovery and Account recovery. "About these tasks" is a small info disclosure. Recent activity (latest published-schedule revision, when present) sits in the rail between Clocked in now and Shortcuts.
- **Sidebar (Home):** 40px rows, 14px labels, 20px icons, muted 12px group labels, teal left bar plus wash for the active item, a compact profile row, and only the platform credit in the footer (the workspace name leads the top bar). Moving the profile into a top-right menu is deferred to the portal-wide pass, because existing QA scripts sign out via `.sidebar-logout-row`.
- **Mobile tab bar:** the preview uses the production "Shifts" label for Shift requests.

### Portal-wide Gusto system (Batch 2) — 2026-10-15

The Gusto palette and system now cover every authenticated portal page, not only Home. They are defined in `src/app/app/portal-gusto.css`, imported after `portal-refinement.css`. This supersedes the portal blue (#0756D9 / #003AAE / #EDF4FF / #062959) and the mobile-workforce and employee-corporate blue tokens. Authentication (login, forgot access, activation) keeps its own blue world until it is reviewed separately.

- **Tokens:** teal accent #077572 (hover #055C5A; #07605F for text on the #E7F3F2 wash), ink #1C1C1C, muted #5F6368, border #D7D9DC, hairline #ECEDEF, inset #F6F7F8, white canvas, dark-teal phone masthead #1C4A47. The legacy portal aliases (`--design-*`, `--nevora-*`, `--nuvora-*`, `--coffee`, `--blue`, …) map onto these. Card radius is 12px, control radius 8px.
- **Type:** page h1 28/500, h2 20/500 in ink, h3 at 600, tabular figures in tables/definitions/times. Headings on coloured banners keep their own white text.
- **Buttons:** primary teal fill with white label, secondary white outline, ghost teal text. All use 8px radius, 120ms feedback and a .98 press, with no motion under reduced motion. Form controls get the hairline edge, teal focus ring and teal checkbox/radio accent.
- **Chrome:** white top bar with the workspace name, a borderless bell and a new top-right **account menu** (avatar initials, name, "Signed in as", Your profile for Employee/Lead, Profile and device settings when enabled, Sign out). On desktop the account menu replaces the sidebar profile and Sign out rows. Phones keep account actions in their existing menus. The compact sidebar (40px rows, 14px labels, 20px icons, muted group labels, teal bar plus wash for the active item, credit-only footer) applies on every page. Phone tab bars mark the active item with teal glyph and label only.
- **Accessibility:** axe (WCAG 2.2 AA rules) reports no violations on Owner/Manager/Employee Home at 1440px and 390px. The employee arrival date is white on the teal banner.
- **QA:** `scripts/payroll-workflow-ui-qa.mjs` now signs out through the account menu.

#### Real-data verification and contrast pass — 2026-10-15

The accent moved from #0A7E7E to **#077572** (5.5:1 on white, 4.9:1 on the #E7F3F2 wash) so teal text passes AA on every wash. Solid teal fills always carry white text. Earlier component rules that paired dark ink with the primary fill (made for the old orange) now use #FFFFFF. Page-local orange tokens and tints in portal stylesheets map to the teal ladder. The public Clocker kiosk shell and the authentication theme are unchanged. The management sidebar label for `/app` is "Home". The schedule roster's labelled shift container has `role="group"`.

Verified on an owned, disposable local PostgreSQL runtime with fictional accounts and payroll fixtures, with push delivery disabled. It was a separate instance; the existing preview runtime was not touched. The check covered 77 routes for Owner, Manager, Lead, Employee and the payroll owner/employee at 1440px and 390px: 154 page loads, each with zero axe WCAG 2.2 AA violations, no document overflow, no visible control under 44px, no client or server errors, and no remaining legacy blue or orange.

#### Phase 2: language, dates and empty states (2026-10-15)

The portal follows `docs/design/voice.md`.
- **Labels:** about 80 Title Case labels moved to sentence case. Exceptions are proper nouns and acronyms (NEVORA, Clocker, PIN, ID, Apple/Google Calendar), "Sign In", and the status words shared with the public Clocker kiosk ("Clock In", "Clock Out", "On Break", "Clocked In", "Off Clock", "Try Again"). The kiosk itself is unchanged. QA scripts and tests follow the new labels.
- **Links:** in-app links use a caret; the external arrow only marks links that leave NEVORA or open the Clocker URL.
- **Dates:** people see `formatDisplayDate` ("Tue, Oct 6") and `formatDateRange` ("Sep 28 – Oct 4, 2026") from `src/lib/date-utils.ts`. Payroll runs, backlog, settings and My pay no longer show ISO dates. Freshness lines read "Updated 7:31 PM"; the employee record-details disclosure keeps exact seconds.
- **Empty states:** `src/components/empty-state.tsx` (structure adapted from the 21st "Empty" block) is the empty-state pattern. Older full-panel variants share its look through `portal-gusto.css`.
- **Colour:** the remaining brand-peach tints (#F8EAE5, #FFF8F5) map to the teal ladder. Payroll's error state uses a red tint, and semantic warning and error colours are unchanged.

#### Phase 3: motion and materials (2026-10-15)

`src/app/app/portal-motion.css` and `src/components/sheet-gestures.tsx` follow Apple's fluid-interface guidance and Emil Kowalski's rules: interruptible transitions, motion from the trigger, and no motion on frequent keyboard paths.
- **Menus:** grow from their trigger corner over 150ms with a strong ease-out, from 0.96 scale with a fade, and close in 110ms. Uses `@starting-style` and `allow-discrete`.
- **Phone sheets** (manager More on workforce pages and Home, employee More): a grab handle, a slide up over 320ms on the iOS drawer curve `cubic-bezier(.32,.72,0,1)`, exit by the same path, and a dimmed backdrop. Swipe down to dismiss: 1:1 tracking from the grab point with pointer capture, single touch, rubber-band resistance upward. A sheet closes past 30% of its height or on a flick (over 0.11 px/ms and at least 24px); otherwise it snaps back from its live position. The click after a dismissing drag is suppressed.
- **Disclosures:** `details` animate their height through `::details-content` with `interpolate-size` where supported. The mobile Review disclosure fades in.
- **Materials:** the desktop top bar is sticky frosted glass, and its hairline edge appears only after 32px of scroll (scroll-driven animation, static fallback). The phone tab bar is frosted. Reduced transparency and increased contrast fall back to solid white, the latter with an ink edge. Reduced motion keeps fades and removes movement.

#### Phase 4: feedback and states (2026-10-15)

- **Toasts** (`src/components/toaster.tsx`): bottom-right on desktop and above the tab bar on phones, with a 4.5s life that pauses on hover, focus and hidden tabs, and a dismiss button. `toast()` is called only after confirmation, for example payroll receipts ("Payroll revision approved", "Statements published to employees"). Page-level redirect banners (`.form-success` with role="status") are presented as toasts by CSS and stay in the DOM. One-time success flags (`submitted`, `reviewed`, `published`, …) are removed from the URL after each navigation so a reload doesn't repeat them.
- **Skeletons** (`src/components/skeleton.tsx`): task cards and clock rows show content-shaped placeholders while loading, with a quiet status caption ("Loading tasks…"). Static under reduced motion.
- **Inline validation** (`src/components/form-validation.tsx`): native constraints on every portal form report under the field on blur or submit ("Enter employee ID", "Choose primary location"), clear as soon as the value is valid, and focus the first problem in document order. Errors are linked with `aria-describedby`/`aria-invalid`, and the browser bubble is replaced. Server validation remains authoritative.
- **Pending versus optimistic:** approve and decline already show pending labels ("Approving…", "Processing…") and lock while busy. Authority-checked decisions are never shown as done before the server confirms them.
- **Success moments:** publishing a schedule shows a success panel ("Main Office published. Employees can now see their Oct 12 – Oct 18 shifts in NEVORA.") with "Send an update" and "Back to Home". Payroll approval shows "Approval recorded" with the revision, the period and the next step.

#### U0: foundations (2026-10-15)

First phase of the full implementation plan (mobile first, enjoyable, customizable within limits).
- **Phone chrome:** `themeColor` and the web manifest use the masthead teal `#1C4A47` with a white background, so the phone status bar matches the portal header.
- **Offline page** (`public/fuel-portal-offline.html`): white canvas, a teal line illustration, "You're offline", "Reconnect to see your schedule and keep working." and a teal "Try again" button (48px, 8px radius). The service-worker cache moved to v4 so phones pick it up.
- **Route skeletons** (`src/components/route-skeleton.tsx` and `loading.tsx` in schedule, requests, requests/hub, exchange, timecards, payroll, my-pay, my-time, employees, updates, notifications and reports): page-shaped placeholders while server data loads. The shape is set by `data-shape`: a 7-day grid for schedule, cards for pay, time and reports, and lists elsewhere. Each announces "Loading [section]…" through role="status". Static under reduced motion. Home keeps its own client loading state.
- **Illustrations** (`src/components/illustrations/`): six spot drawings (empty-schedule, all-caught-up, payday, open-shift, offline, setup-checklist), drawn as one-weight lines in `currentColor` on a wash disc, so a company brand colour carries through without new artwork. `EmptyState` takes `illustration` for full-panel moments, such as the first-run team schedule. Small inline empties keep the icon tile. Under increased contrast the disc is removed.
- **Phone type floor:** below 767px, the small and caption type roles are 15px. Desktop keeps 14px and 12px. Hard-coded sizes on older components are not covered yet; they are handled as each surface is rebuilt (U2–U4) and in the token consolidation (U10).

#### U1: navigation and shared tabs (2026-10-15)

- **Phone tab bar** (`mobileTabsForRole()` in `src/lib/navigation.ts`): every role gets four destinations plus More.
  - Employees and leads: Home · Schedule · Requests · Pay (Hours while payroll is off) · More.
  - Managers and owners: Home · Schedule · Requests · Team · More.
  - Each tab owns the sidebar destinations that light it up. Availability and shift requests light Requests; My time lights Pay; anything without a tab lights More.
  - The manager More menu moved from the header into the tab bar. It keeps its id and its "More navigation" name, and opens as the same bottom sheet. More lists everything that has no tab, in sidebar order. The desktop sidebar is unchanged.
- **Section tabs** (`src/components/section-tabs.tsx`, drawn by the shell from `sectionTabsFor()`): one underline row between pages that share a place, each a real URL.
  - Requests: Time off · Shift requests · Availability, plus Overview for employees.
  - Time and pay: Timecards · Payroll runs · Time exports · Payroll settings. These tabs replace the payroll-only `pw-tabs`, and only destinations the role can open appear.
  - Pay for employees with payroll: Statements · Hours.
  - Nested pages (forms, details) show no tabs. On phones the row scrolls sideways instead of wrapping, keeps the current tab in view, and fades the edge that has more tabs. Tabs are 44px tall with a 2px teal underline and visible focus, and are static under reduced motion.
- **Words:** "My Time" became "My time" everywhere it showed.
- **Links:** manager time-off links and review redirects use `?tab=pending` instead of the unrecognized `?tab=team`. People land on the same Pending view.
- **Tab bar material:** the frosted phone tab bar is now 92% white, up from 82%. A teal element scrolled under the active tab had dropped its label to 4.26:1; at 92% every label stays at 4.5:1 or more over any content.
- **Deferred:** the manager Requests tab becomes Inbox, with one badge, when `/app/inbox` ships (U4).

#### U2: employee Today Home (2026-10-15)

Reference: the Future Pro home on Mobbin (time-of-day greeting on a light background above one coloured event card), adapted to NEVORA tokens.
- **Arrival:** employee Home drops the teal hero, so the next-shift pass is the one brand-colour moment under the teal app bar. The line under the heading reads "Good morning · Thursday, October 15, 2026" in the workspace time zone. The live Home still receives no name, by design; the "Hi, Alexandra." heading appears only where a name is supplied, as in the preview.
- **Next-shift pass:**
  - A diagonal gradient from the accent to the masthead, with white type, a soft light bloom, and a perforated stub (dashed rule and side notches in the page colour) before "View schedule".
  - "Today" or "Tomorrow" leads the date, counted from when Home was read.
  - A countdown pill ("Starts in 9 h 11 min") updates each minute after the page loads. Screen readers skip it, since the start time is the accessible fact.
  - The countdown is absent from server markup and from shifts already started.
  - No published shift, or an unavailable schedule, keeps the calm white card.
  - Increased contrast flattens the pass to the masthead colour; forced colours turn it into an outlined card.
- **To do:** each row has a 40px icon tile by kind (schedule, swap, time off, correction, update). "Required review" is a teal chip. With two or more items the card shows a stacked edge.
- **Quick actions:** four tiles, two per row, placed after To do and before Recent updates: Request time off, Swap a shift, Update availability, My time.
- **All set:** "You're all set." sits beside the all-caught-up illustration.
- **Footer:** "Updated 4:49 PM" with "Refresh home". The footer carries `data-home-updated`.
- **Phone type:** everything on Home is 15px or larger on phones, except the "Published" and clock status chips (14px).
- **Script contracts kept:** "Loading Home…", "Refresh recorded time", "Clocked In", `data-home-state`, `data-home-group`, `data-home-refresh`, "Refresh home"/"Retry home", "You're all set.", "Scheduled now", "No upcoming published shift", and next shift before To do.
- **Deferred:** a new pay statement in the pending stack needs a payroll read on Home. It moves to U6, where the Payday moment is wired to My pay.

#### U3: schedule (2026-10-16)

- **Employee: My shifts | Open shifts.** A segmented switch on real URLs (`/app/schedule?week=…` and `&view=open`) sits under the heading. Open shifts shows its available count, also announced to screen readers.
  - **My shifts:** the week agenda as before. The "Shift requests" link moved from the header into the "Planning ahead?" footer, so shifts sit higher on phones.
  - **Open shifts:** the same eligible, claimable coverage offers that the shift marketplace lists (`listOpenCoverage`, actionable and open). It also lists this person's own claims that are waiting for a manager, marked "Requested · waiting for approval".
  - Each card shows a date tile, the time, the location and position, and a link: "View and claim" or "View request". Claiming stays in the existing marketplace flow.
  - An empty list shows the open-shift illustration; a failed read says "Open shifts unavailable", never empty.
  - The page notes that claiming sends a request to your manager. Eligibility reasons wait for B3.
- **Manager: status chips.** Each location tab shows Published, Draft, or Not started from `listScheduleStatuses`, and All locations shows "1 of 2 published". A failed read hides the chips.
- **Manager: hours against target.** Under "56h assigned this week", a 4px meter reads "12 of 30h target", or "12 of 40h limit" without a target. It turns orange with "Over 40h limit" when hours pass the maximum.
  - The meter counts hours across all locations, using targets from `listEmployeeHourTargets`. A failed read hides it.
- **Manager: shift chips.** Six position tints, each a left bar and a wash, follow the workspace's position order: the first position gets the brand teal, then the other five in turn. A stable name hash covers positions outside the catalog. The position name is always printed, so colour is never the only cue. Drafts are white with a dashed border.
- **Manager: name column.** It stays in place while the week scrolls sideways (601px and up).
- **Manager: print.** "Print schedule" in the schedule's More menu prints a one-page landscape week. A title line gives the workspace, week, location and time zone. Navigation, controls, banners and empty cells are hidden, and tints print.
- **Deferred:**
  - Open shifts and conflicts inside the manager grid need an unassigned-shift and conflict source in the roster.
  - The phone toolbar consolidation moves to U8 (desktop finder and tables).

#### U4: manager Inbox (2026-10-16)

- **`/app/inbox`** (`src/app/app/inbox/page.tsx`, `src/components/manager-inbox.tsx`) is the manager's one place for what needs a decision. Employees are sent to the Requests overview.
  - It reads through the existing authority-checked action center, now shared as the `useActionCenter()` hook with Home Tasks. It pauses offline and in background tabs, and never keeps stale items.
  - **Order** (`src/lib/action-center/inbox.ts`): "Needs attention now" (urgent), then "To review" (corrections, attendance, coverage, hours, missing setup, timecards, acknowledgements), then "Requests" (time off, shift requests, unable-to-work).
  - **Filters:** All · To review · Requests, each with a count, plus "Updated 10:30 AM · Refresh".
  - Urgent rows carry a 4px coral left bar.
  - **Grouping:** three or more items of one kind at one location collapse into a single expandable card, for example "Coverage gap at Main Office · 14". One source can't bury the rest, and time-off rows always stay separate.
  - "Inbox clear", with the all-caught-up illustration, appears only for a ready, empty observation; loading, offline and lost-access states say so.
- **Deciding time off in place:** a time-off row carries the Time off page's own Approve and Decline buttons, posting the same `reviewTimeOffAction`.
  - **Swipe** (`src/components/swipe-row.tsx`): on phones, swipe right to approve or left to decline. The backdrop (teal or coral) says what releasing will do, and the swipe commits only past half the row by pressing that row's visible button. A short swipe snaps back, and vertical drags scroll the page.
  - **Confirmation:** the row shows "Approving…" until the server confirms. After a decision, the existing action still lands on the Time off page with "The request was reviewed."; returning to the Inbox needs a small server-action change awaiting Jose's approval.
  - **Swaps and unable-to-work requests** link to their review page, because their approval needs revision checks the action center doesn't carry.
- **Navigation:** the manager phone tab is now Inbox, lit for the Inbox and for Time off, Shift requests and Availability. The sidebar lists Inbox under Home. Home Tasks gains "Open inbox ›".
- **Deferred:**
  - Today tiles (Scheduled, Clocked in, Late) need published-only counts and late clock-ins, so they move to B4 with the missed-punch reader.
  - An Inbox tab badge needs a count on every page.
  - Per-device snooze, the Upcoming rail and the owner setup checklist come later.

#### U5: plain language (2026-10-16)

The visible text of every page, for owner, employee and both payroll roles, was collected from the fictional-data runtime: 1,064 lines, with disclosures opened. It was scanned for audit terms, ISO dates, 24-hour times and Title Case. 54 strings were rewritten across attendance, timecards, My time, Home, notifications, updates, payroll export, the payroll backlog, reports, Clocker recovery and devices, scheduling rules, workspace settings and task titles.
- The rules and examples live in `docs/design/voice.md`, under "Plain language over audit language".
- **Coverage-gap details:** "Mon, Oct 12 · 8:00 AM–4:00 PM", with "all day" and "midnight" where they apply. Ids, links and the stored `dateTime` keep their ISO values.
- **Reports:** readable periods ("Sep 28 – Oct 4, 2026"), "3 of 4 coverage requests filled", schedule changes and dates instead of revisions and ISO values. The "Report definitions" disclosure and the CSV keep their exact technical wording.
- **Timecard headers:** no revision number. Each card's history still lists every revision.
- **Payroll revisions** stay visible, because each approval belongs to one exact revision.
- **Tests and scripts** that pinned the old text change in the same commit:
  - `phase-d-attendance-ui-qa.mjs`: "Nothing to review"
  - `phase-d-browser-qa.mjs`: the partial-publication notice
  - the related unit tests
- **Script-pinned text kept unchanged:** "Some Home sections could not be fully checked. Counts show known items.", "Loading Home…", "Refresh recorded time", "Clocked In", "Approval recorded", and "I reviewed revision".
- **Not yet covered:** the payroll export's population manifest wording and the Clocker kiosk (U9) keep their current text. Spanish comes with B5.

#### U6: pay (2026-10-16)

- **Payroll stepper** (`src/components/payroll/payroll-stepper.tsx`) sits at the top of each run's review and reads Hours → Amounts → Review → Approve → Publish.
  - Every state comes from the run itself:
    - Hours waits on open timecards (`TIME_NOT_FINALIZED`).
    - Amounts waits on a provider import.
    - Review is blocked by other exceptions; correction notes don't block.
    - Approve waits on approval.
    - Publish waits until every employee statement is published.
  - The first unfinished step is marked current and carries `aria-current="step"`. Each step's spoken label includes its state and hint, and a hint line under the stepper says what to do now: "Hours: 2 timecards to finalize", "Publish: Statements are being prepared", "Publish: 3 statements to publish".
  - **Colour states:** done steps are teal with a check, the current step is ringed in teal, and blocked steps are ringed in orange.
  - Approval still shows "Approval recorded" and the exact revision.
- **Payday moment** (`PaydayMoment` in `my-pay.tsx`): the newest published statement leads My pay, with the payday illustration, "Latest statement", "Payday Fri, Oct 16", the period, "From your payroll provider" and its document link. Older statements follow under "Earlier statements".
  - Statements carry no amounts, so the moment shows no figures. A pay breakdown bar needs amounts in the statements response, which is a backend change for later approval.

#### U7: delight (2026-10-16)

- **Gate** (`src/lib/celebrations.ts`, table-tested): a moment plays only when it is on the allow-list, the server has already confirmed it, it isn't in an excluded area (payroll actions, the Clocker, errors, loading), it has an occurrence key, it hasn't been seen on this device, and nothing else celebrated this session.
  - A second moment refused for the session is marked seen, so an old approval never celebrates later.
  - If storage is blocked, the gate falls back to once per page.
- **Moment** (`src/components/celebration.tsx`): twelve particles on fixed angles in teal, masthead, gold and mint, bursting from the confirmed element in 560ms using only transform and opacity. It is hidden from assistive tech, because the surrounding text already carries the meaning.
  - Nothing renders, and the session isn't used, under reduced motion. It is never a modal and never moves money.
- **Wired, all server-confirmed:**

  | Moment | Plays when |
  |---|---|
  | Schedule confirmed | the "You're up to date" review card appears (keyed by week and confirmed revision) |
  | Schedule published | the manager's published panel shows |
  | Time off approved, swap/coverage approved | the employee's Home update arrives (the server writes these labels from the request status) |
  | Inbox clear | the Inbox is ready, empty and not limited |
  | Payday | the newest published statement on My pay is shown |

- **Not celebrated:** payroll approval and publishing by the person doing them, declines, lateness, streaks and amounts.
- **Waiting on data:** first published shift, first full week, everyone acknowledged and work anniversaries.
- **Per-device memory:** another device opening an already-confirmed week sees the moment once.

#### U8: finder, tables and Insights (2026-10-16)

- **⌘K / Ctrl+K finder** (`src/components/command-finder.tsx`, `src/lib/finder.ts`) for owners and managers: Actions (add a shift, add an employee, send an update), the pages the role can open, people and locations.
  - **Results:** an empty query shows actions and pages only, so opening the finder never lists the whole team. Matches rank by label start, then word start, then contains, then keywords. People link to their record; locations link to their schedule.
  - **Interaction:** a native modal dialog with a combobox and listbox (`aria-activedescendant`). Arrow keys move, Enter opens, Esc closes, and focus returns to where it was. There is no open animation, since it's a frequent keyboard tool. A "Search ⌘K" button (44px tall) sits in the desktop top bar (Ctrl K on other systems). Typed Employees searches replace the history entry, so Back returns to the page before Employees.
- **New read-only route, for review:** `GET /api/manager/finder` follows the clock-monitor pattern:
  - rejects cross-site requests and requires an `X-Nevora-Finder: 1` header
  - allows only owner or manager sessions
  - sends `no-store, private` headers
  - returns only active people (id, name, role label) and active locations (id, name), never phone, email or Clocker keys
  - reports a failure as unavailable, never as an empty list

  It writes nothing.
- **Employees** filter as you type (after 300ms) and as soon as a select changes. Typed queries replace the history entry, and the caret stays put while results update. "Apply filters" stays. On desktop, the table's column headers stay visible while the list scrolls.
- **Tables on phones:** a scan of every table at 390px found both (Employees, Reports) already stacking as cards with no sideways scroll, so nothing changed.
- **Insights:** Reports is now called Insights (same URL). An "At a glance" strip leads with six answers taken only from the loaded report: hours worked, scheduled vs worked, clock-in notes, time off and callouts, coverage filled, and timecards to finish.
  - Each card jumps to its detailed section; the tables, CSV and print stay as they were.
  - **Incomplete sources:** the cards read "Not available" or "Incomplete" rather than a number.
  - **Status headings** read "Insights unavailable…", updated in the QA script too.
- **Deferred:**
  - Sortable desktop headers, which need a sort parameter in the employee directory.
  - Compact density.
  - Payroll cost on Insights, which needs payroll totals in the report.
  - On phones, "At a glance" sits below the period controls. Moving it first means restructuring the report's tested lifetime and state handling.

#### U9: Clocker kiosk (2026-10-16)

- **Teal:** the kiosk defines its own teal tokens (`clocker-shell.module.css`), because it runs outside the portal shell.
  - Accent `#077572`, hover `#055C5A`, focus and icons `#07605F`, wash `#E7F3F2`, with white text on teal.
  - It also redefines `--design-primary`, which the root `typeface-theme.css` still sets to the old orange.
  - Hover keeps white text: the portal-wide hover rule in `typeface-theme.css` pairs `--design-accent` with dark ink, which reads 2.27:1 on the dark teal, so the kiosk overrides the colour (fixed in U10).
  - On phones it overrides the legacy blue tokens it inherited from `mobile-workforce.css` (masthead `#1C4A47`).
  - Main buttons are at least 56px tall.
- **Bilingual labels** (`src/components/clocker-language.tsx`): a Puerto Rico Spanish second line sits beside the unchanged English for:
  - actions: Marcar entrada, Iniciar descanso, Terminar descanso, Marcar salida, Confirmar salida, Seguir trabajando, Listo, Continuar
  - statuses: En turno, En descanso, Fuera de turno
  - receipts: Entrada registrada, Salida registrada and the break receipts
  - the PIN title: Ingresa tu PIN

  How it stays script-safe:
  - Buttons keep an exact English `aria-label`, so every name the phase-c scripts press is unchanged. Inside buttons, the Spanish line is hidden from assistive tech.
  - English titles and statuses keep their own elements, and the Spanish is a separate `lang="es"` line that screen readers announce in Spanish.
  - Personal greetings ("Hi, Avery."), legal text and payroll text stay English.
- **Language memory:** an "ES Spanish labels on/off" toggle on the PIN screen is remembered per tablet (`localStorage`, on by default).
- **Verified on fictional data:**
  - The same steps the phase-c scripts use: set a PIN, enroll a tablet, verify with "Number n" and "Continue", "Clock In", the "Clock In Recorded" heading, then "Clock Out", "Confirm Clock Out" and "Clock Out Recorded". This ran at 1024px and 390px, with axe clean once entrance animations settle.
  - The kiosk needs development mode for local http, because production requires an https Clocker origin.
- **Not run:** the seven phase-c scripts themselves need a disposable `FUEL_TEST_DATABASE_URL`. They are also already stale: they fill "New Clocker PIN", while the PIN form has read "New PIN" since commit e8ea9f5.
- **Deferred:** the optional company logo in the kiosk header waits for B1 (brand tier).

#### U10: tokens and cascade (2026-10-16)

- **Baselines first:** a computed-style snapshot of every element on 96 page views (owner, employee, both payroll roles and sign-in, at 1440px and 390px). It covers 38 properties per element: colour, fonts, spacing, borders, layout and size. Full-page screenshots mask times, countdowns and hours meters.
  - Two snapshots of the same build match exactly. Two builds of the same code differ only by timestamp widths and random device ids, which became the noise baseline.
- **`@layer` migration: tried, measured and reverted.** Wrapping the legacy files (`globals.css`, `typeface-theme.css`, `mobile-workforce.css`, `employee-mobile-corporate.css`, `portal-design-system.css`, `portal-refinement.css`) in `@layer legacy` changed 18,033 computed styles on 94 of 96 pages.
  - Why: the approved look depends on legacy rules out-ranking newer component CSS. For example, employee Home's heading renders at weight 500 because a legacy rule beats its module's 600. In the lowest layer, the dormant component declarations take over.
  - `globals.css` also carries 165 `!important` declarations, which would invert against every unlayered `!important`.
  - **Recommendation:** retire legacy CSS page by page, moving the rules each page really uses into its own stylesheet and deleting the rest. Layering then becomes a near-zero-diff step. B1 doesn't need layers, because company tokens are injected inline on `.app-shell`.
- **Legacy aliases kept as the bridge:** all 38 (`--design-*`, `--nevora-*`, `--nuvora-*`, …) are still referenced, some hundreds of times, and they route legacy rules through the `--g-*` tokens. Removing them would mean rewriting legacy CSS for no visible gain.
- **Brand hexes routed through tokens:** 60 literal teal values in 17 page stylesheets (mostly page-local aliases such as `--design-primary: #077572`) became `var(--g-accent, #077572)`, and likewise for hover, strong, wash and masthead. The kiosk keeps its own locally defined teal.
  - **Zero diff:** the snapshot matches the noise baseline exactly.
  - **Brand flows through:** overriding `--g-accent` on `.app-shell`, as B1 will, recolours every teal element on Add employee, Positions, Workspace and Payroll exports.

#### Owed testing: zoom, iOS Safari and screen-reader structure (2026-10-16)

- **200% zoom and 400% reflow** (Playwright, emulated the way browser zoom lays out: 1440 and 1280 screens at 200% are 720 and 640 CSS px wide at 2x density, and 400% is 320 by 256). 81 views across owner, employee and both payroll roles.
  - No page-level horizontal scroll, no clipped text and no control covered at rest, before or after the fixes.
  - **Fixed, focus hidden by the sticky chrome (WCAG 2.4.11):** on 55 of 81 views, tabbing to a control near the bottom left it behind the tab bar, and wrapping back to the top left it under the sticky header. `scroll-padding-block` on the page now keeps focus and in-page jumps clear of both (`portal-gusto.css`).
  - **Fixed, chrome too tall on short screens (WCAG 1.4.10):** at 400% the header and tab bar covered 53–57% of the screen. On screens 500px tall or less (zoom, phones in landscape) the header now scrolls away and only the tab bar stays, so the chrome covers 26–27%.
- **iOS Safari** (iPhone 17 Pro Max simulator, iOS 26.5, fictional data, dev-mode runtime because production's `Secure` cookie is dropped by WebKit on local http):
  - Checked: sign-in, employee Home, Schedule, Requests, My time, Profile, the More sheet, sign-out, the manager Inbox and a partial swipe on a time-off row. The swipe followed the finger, showed the Approve backdrop and snapped back without approving anything.
  - Safe areas, the masthead under the status bar and the floating Safari toolbar all render correctly.
  - **Fixed, the Home More sheet:** Home sits outside the `data-mobile-workforce` attribute, so its More sheet kept an older floating panel and both roles' menus had no "Close actions" button. They now match every other page (0 computed-style differences in WebKit and Chromium).
  - **Fixed, the section tab strip:** a legacy phone rule capped it at 100% inside its negative margins, so the hairline stopped 32px short on the right. It now runs edge to edge.
  - **Fixed, wording:** the My time heading no longer becomes "My Time" (a legacy `text-transform: capitalize`), and the phone footer and Record details say "Updated" rather than "Checked".
- **Screen-reader structure** (WebKit accessibility tree, the source VoiceOver reads; employee, payroll employee and manager on 8 key screens): one h1 per page, no skipped heading levels, no unnamed controls, every navigation landmark named, live regions present, `lang="en"`.
  - **Not run: VoiceOver itself.** It can't be driven on this Mac without enabling AppleScript control of VoiceOver, a system security setting, and the iOS Simulator has no VoiceOver. A tree review is not screen-reader coverage.
  - **VoiceOver script for Jose** (Safari on iPhone, or Safari with ⌘F5 on the Mac):
    1. Sign in as the fictional employee. On Home, swipe right through the page. The greeting, next-shift card and countdown should read once (the countdown isn't announced every minute), then Quick actions.
    2. Open the rotor and choose Headings: one "Home" heading, then section headings in order.
    3. Tab bar: each tab reads its name and "selected" on the current one. Open More, check that "Close actions" is announced and that a two-finger scrub (Z gesture) closes the sheet.
    4. Requests: the section tabs read as links, with the current one marked.
    5. Sign in as the fictional manager. In Inbox, Requests, focus a time-off row: Approve and Decline are reachable as buttons without swiping.
    6. On the kiosk PIN screen, the English label is read first, then the Spanish line in a Spanish voice.
- **Still owed:** a physical iPhone, and the VoiceOver script above.

#### B1: brand tier (2026-10-16)

- **What a company can change:** one brand colour and one logo, set by the Owner at Settings › Branding (`/app/settings/branding`).
  - Everything else in tier 0 stays locked: layout, navigation, type, spacing, the red, amber and green status colours, accessibility floors, legal and payroll copy, the NEVORA wordmark, and the Clocker's English labels.
- **One seed, a derived ladder** (`src/lib/workspace-presentation/derive.ts`, OKLCH, algorithm 1). The seed becomes ten tokens: accent, hover, strong, wash, line, tint, select, pressed, masthead and masthead ink.
  - NEVORA teal (#077572) returns the hand-tuned values exactly, and with no brand saved nothing is injected.
  - **Floors:**
    - White text on buttons is at least 5:1 for the accent and 4.5:1 for hover.
    - Links are at least 4.5:1 on white, on the wash, and on a 12% mix of the accent (teal reaches 4.65 there).
    - Selected text on its tint is at least 4.5:1.
    - White on the header is at least 7:1, and secondary header text at least 4.5:1.
    - Focus rings are at least 3:1 on white and on grey panels.
  - **Automatic adjustments, each explained in the editor in plain words:**
    - A grey seed (chroma under 0.03) falls back to teal.
    - A hue within 10° of an alert colour is moved to the nearest clear hue.
    - The accent is darkened until the floors hold.
    - A very dark seed is lightened to lightness 0.36, so buttons stay distinct from the header.
  - Tests check 2,000 random seeds plus edge colours against every floor.
- **Injection:** the layout sets only known `--g-*` keys inline on `.app-shell`. Values must be strict hex, and only a complete set is applied.
  - Five light tints that were hard-coded (#C9E0DE, #F3F9F8, #CDE7E5, #D3EAE8, #CFE3E1) now have tokens (`--g-accent-line`, `--g-accent-tint`, `--g-accent-select`, `--g-accent-pressed`, `--g-masthead-ink`). Their 23 uses route through them.
  - The browser theme colour and the manifest's `theme_color` follow the masthead.
  - The kiosk maps the brand onto its own four teal variables.
  - Reads never break a page: a missing table or bad row renders teal.
- **Logo:** PNG or WebP only, identified from the bytes; SVG is refused.
  - Limits: up to 256 KB, 32–2048 px a side, at most 4:1.
  - It shows in a white chip beside the unchanged wordmark: in the sidebar on desktop, in the header on phones, and in the Clocker header.
  - It is served from `/api/workspace-presentation/logo/[id]` with `nosniff`, `default-src 'none'; sandbox` and immutable caching. The route needs no sign-in, because a logo is public branding and ids are random UUIDs.
- **Storage** (`db/migrations/0031_workspace_presentation.sql`, following the 0025 pattern):
  - Immutable revisions: operation id, command hash, previous settings, changed keys.
  - Immutable logo assets.
  - Two Owner-only functions under an advisory lock, with idempotent replay and a revision check. A logo must belong to the workspace.
  - The server re-derives every colour and stores the seed, algorithm and snapshot.
- **Editor** (`src/components/brand-editor.tsx`):
  - Eight suggested colours, none of which need adjusting.
  - A colour picker and a hex field with inline validation.
  - Explanations of any adjustment, and a ten-row readability table.
  - Phone, desktop and Clocker previews running the same derivation.
  - Logo upload, replace and remove; reset to teal; and recent changes.
  - It retries an unconfirmed save with the same operation id, and a stale editor gets a conflict instead of overwriting.
- **Verified on fictional data:**
  - 20 SQL checks covering Owner-only access, replay, conflicts, immutability, SVG refusal and logo ownership.
  - 23 browser flows.
  - The 156-check sweep with the default brand, with an olive brand (yellow seed) and with a rose-red brand.
  - The kiosk flow with a violet brand and logo, and again after reset.
  - Zero colour, font or spacing difference from the U10 baseline with no brand.
  - Contrast failures found and fixed on the way: with an olive brand, seven components used the accent as text on its tints at 4.3–4.49:1. That is how the tint floor came about, and Ocean moved from #2563EB to #1D4ED8.
- **Test harness fix:** with Playwright's `isMobile`, Chromium widens the layout viewport to fit oversized content, so `scrollWidth - innerWidth` stays 0. The sweep and flows now measure against the configured width. Rerunning found no hidden overflow on earlier pages; the branding page's swatch row was the only case, and it is fixed.
- **Deferred:**
  - Separate light, dark and square-mark logos (one logo in a white chip works on every surface for now).
  - Branding on the sign-in page.
  - Cleanup of unused logo assets.
  - Words and modules (B2).
- **Before release:** apply migration 0031 to existing databases. New installs get it through `scripts/company-setup.ts`.

#### B2: words and modules (2026-10-16)

- **Where:** Settings › Features & words (`/app/settings/features`), Owner only. Branding stays about looks.
- **Words:** five fixed presets rather than free text, each with reviewed English and Puerto Rico Spanish slots: Standard, Retail, Restaurant, Field services and Care (`src/lib/workspace-presentation/words.ts`).
  - The slots are person, people, location and locations.
  - **Applied to:** the menu label for the people page, the people and locations page titles and their Add buttons, the settings hub rows, and the ⌘K "Add …" action.
  - Full sentences keep generic wording until strings move into dictionaries in B5, which will use these slots.
  - Standard reproduces today's wording exactly.
- **Modules** (`src/lib/workspace-presentation/modules.ts`): Time off, Shift swaps and cover, Company updates, Pay statements (only when payroll is on), and Breaks on the Clocker.
  - Kudos is left out because it doesn't exist yet.
  - Each module explains what changes while it's off. Turning a module off deletes nothing.
- **A module that is off disappears everywhere:**
  - sidebar, phone tabs (Pay becomes Hours), section tabs, the ⌘K finder and the settings hub;
  - employee Home quick actions and its time-off, swap and update sources (reported complete and empty, so no "unavailable" warnings);
  - manager Inbox and Home request counts;
  - the Requests overview (Availability only if both request modules are off);
  - on Schedule, the Open shifts view, per-shift swap and "Unable to work" options, and footer links.
- **And it is refused on the server:**
  - nine pages show a calm "… is turned off" page; Owners get a link to turn it back on;
  - time-off and shift-request server actions;
  - all updates API routes (404 `module_off`);
  - employee statement and statement-document APIs;
  - on the Clocker, no break types are offered (the kiosk says "Breaks aren't recorded on the Clocker here." instead of the setup warning) and START_BREAK is refused. A break already started can always end.
- **Nothing is stranded:** time off can't be turned off while a request waits for a decision, and shift swaps can't be turned off while a swap, cover or callout request is open.
  - The editor locks the switch and says why. The save function re-checks inside the same locked transaction.
- **Storage:** the same immutable revision chain as B1.
  - Each save carries one section (`brand`, `words` or `modules`) and the service merges it onto the latest settings, so saving one never overwrites another.
  - Migration 0032 replaces the save function to validate presets and module ids, record changed keys across all sections, and run the in-flight checks.
  - Each database holds one workspace (`workspaces.singleton`), so the request tables carry no workspace column; the first draft of 0032 assumed one and the runtime check caught it.
- **Verified on fictional data:**
  - 12 SQL checks: validation, changed keys, both busy refusals (a real pending request and a probe callout), replay of an already-off module, B1 checks, and rollback.
  - 30 browser flows covering words, locks, three modules off, deciding the request then turning off time off and swaps, every surface listed above, and a full reset.
  - The sweep with every module off (all 156 checks pass, including every turned-off page), and the default sweep (156/156).
  - Kiosk: breaks turned off mid-break, End Break works, no new break, calm note, back on restores Start Break; plus the U9 kiosk flow.
  - B1, U1, U2, U4 and U8 flows.
- **Not tested at runtime:** the server refusing a forced START_BREAK from a stale tablet (the kiosk never offers it once breaks are off). A real screen-reader pass of the switches.
- **Before release:** apply migrations 0031 and 0032 to existing databases.

#### B4: Today accuracy and missed punches (2026-10-16)

- **Reader:** `src/lib/data/today.server.ts` and a pure projection, `src/lib/today/project.ts`, behind `GET /api/manager/today`.
  - The route is read-only, for Owners and managers, and needs the `X-Nevora-Today` header. Responses are private and uncached.
  - One SQL snapshot compares today's published shifts with the punches actually recorded.
  - Published shifts come from the latest publication revision of each week, so they match what employees were shown. Approved callouts are left out, and yesterday's overnight shifts count only while still running.
- **Matching:** a punch belongs to a shift when it is the same person at the same place and overlaps the shift. A clock-in up to 90 minutes early is allowed. Nothing is inferred.
- **States, worded factually:**
  - Starts later, and Starting now (the first 5 minutes).
  - Started, not clocked in (more than 5 minutes after start, no punch).
  - No punches recorded (the shift ended with nothing).
  - Clocked in, On break and Finished.
  - Separately, a shift counts as late when its first clock-in is a minute or more after the start.
  - The words "no-show" and "absent" are never used; a test enforces it.
- **Manager Home tiles** (above Tasks; two by two on phones): Scheduled today, Clocked in now (everyone on the clock, scheduled or not), Clocked in after start, and Started, not clocked in.
  - The last tile gets the coral bar when it is above zero and links to the Inbox.
  - A note reads "Published shifts only · Updated <time>". If the read fails, the tiles say so and offer Try again; they never show zeros.
- **Inbox: Missed punches** at the top, listing started-not-clocked-in shifts first, then shifts with no punches.
  - Rows link to Contact (the employee profile) or Review timecard. On a calm day the panel is hidden.
- **Refresh:** the shared private snapshot controller polls every 30 seconds while the page is visible and online, and the snapshot expires after 60 seconds.
- **Home preview:** `/ui-preview/home` shows fictional tile numbers and never calls the API.
- **Verified on fictional data:**
  - The API shift list matches an independent SQL count of today's published shifts.
  - The counts agree with the list, and the tiles show the API numbers.
  - An early clock-in finishes a shift and clears it from missed punches; a clock-in 30 minutes late counts as after start.
  - The Inbox panel shows exactly the missed list.
  - An employee is refused (403), and so is a read without the marker header.
  - axe and overflow pass on Home and Inbox at 1440 and 390, and owner zoom (45 views) passes.
  - The 156-check sweep passes, as do U1, U2, U4 and U8.
- **Found and fixed:** on phones the Home grid has no named areas, so a `grid-area: today` placed the tiles in a 122px implicit column. The area is now set only where the grid names it.
- **Not covered:** a live shift in progress during testing (the states are unit-tested at their boundaries instead), and location-scoped managers, who see the whole workspace as the clock monitor already does.

#### B3: Open-shift eligibility reasons (2026-10-16)

- **What it does:** an open shift the claim rules refuse is no longer shown as claimable or with a generic notice. It sits in a collapsed "Shifts you can’t pick up" list under the claimable ones, with the reasons named in plain words. This appears on the employee Schedule › Open shifts view and on Requests › Shift requests › Available shifts.
- **The rules don't change.** The existing claim check, `readShiftChangeAvailability` (ACCEPT), decides as before. It now also returns the rules that refused the claim (`reasons`) and the kind of refusal (`refusal`: rules, review, stale or other). Both fields are additive; older callers read `allowed` and `notice` as before.
- **Mapping** (`src/lib/shift-changes/eligibility-reasons.ts`): only codes that block a claim become reasons. Warnings (target hours, availability not submitted, projected overtime review) never do. Each reason appears once, in a fixed order:
  - You have approved time off then
  - You already work during this time
  - You already have a shift that day
  - It’s outside your availability
  - It would go over your weekly hours limit / the daily hours limit
  - Not enough rest between your shifts
  - It’s longer than the shift length limit
  - The required break doesn’t fit
  - It needs a position / role you’re not set up for
  - You’re not set up to work at this location
  - It needs a qualified shift lead
  - It would leave required coverage short
  - Your manager needs to confirm some rules (rules the company hasn't set up yet; always listed last)
- **A blocking rule is always named,** even when other rules still need the Owner's review. Before B3, the fictional lead saw only "Needs Owner rule review" although availability also blocked the claim, so reviewing the rules would not have made the shift claimable.
- **Refusals without a named rule** say what is known: the shift just changed, or it doesn't fit the current rules. A failed check stays where it was before (listed, re-checked by the marketplace, and checked again on submit), rather than being guessed into either list.
- **Design** (`src/components/blocked-open-shifts.tsx`): a native `<details>`, collapsed by default, with a 52px summary, a neutral count chip and a caret that turns in 160ms (no turn under reduced motion). Each row has a grey date chip, time and place, and the reasons as a short list. There's no claim action. When any reason is availability, the list ends with "Update your availability ›". The Open shifts badge counts only claimable shifts. When every open shift is refused, the view reads "No open shifts fit your schedule right now" instead of the empty state.
- **Verified on fictional data** (owned runtime, offers made through the Exchange page):
  - As found, the lead is refused both shifts, with availability named first and the Owner review last.
  - After the fictional Owner reviews the lead's rules (on the employee page) and the lead gets fictional availability, both shifts are claimable.
  - Fictional approved time off on one date collapses that shift with "You have approved time off then", and the badge drops to 1. Removing the time off restores it.
  - The remaining shift claims through the unchanged flow.
  - Enter on the summary opens it and keeps focus there, with a visible ring.
  - axe, overflow and 44px targets pass at 320, 390 and 1440. Reduced motion is honoured, and there are no client errors.
  - The 156-check sweep passes, as do the U3 flows. Unit tests cover the mapping and the rendering.
- **Not covered:** the reasons for swaps (B3 covers open shifts only); the manager's approval screen, which keeps its own notices; and real shift-lead, coverage-gap and rest-rule refusals in the browser. Those are unit-tested through the mapping only.

#### D1: Desktop shell and page grid (2026-10-16)

- **One left edge.** Every page starts at the same position for every role: 276px at 1440. Before this, page wrappers capped themselves at anywhere from 880 to 1280px and some were centred, so the left edge moved between 272 and 402px from page to page.
  - Rules live in `src/app/app/portal-desktop.css` (desktop widths only).
  - Each page's root wrapper is left-aligned and uses one of two measures:
    - **Wide (1,440px):** Home, Inbox, schedules, employees, timecards, Insights and lists.
    - **Reading (1,120px):** settings hub, Branding, payroll steps, Updates and Profile.
  - The employee frame's extra 18px margin is gone, so employees and managers share the edge.
  - Section tabs match the measure of the page under them.
- **Page header.** Title, one-line description, actions on the right.
  - The icon tiles beside the Payroll and Insights titles are hidden on desktop. The markup stays because a QA script reads the payroll mark.
  - The Inbox title now comes first, with Missed punches under the header (`InboxSurface` `lead` slot).
- **Top bar.** It shows where you are: workspace › section › page (for example, "Northside QA Workforce › Time & Pay › Timecards").
  - On a deeper page, the page step links back to its section.
  - It's desktop only; phones keep their own header.
- **Sidebar.**
  - Rows are 36px for mouse and trackpad (phones keep 44px), and group spacing is tighter. The Owner's 16 items now fit at 1440×900 without scrolling.
  - The Workspace group (Settings, Scheduling rules) is pinned at the bottom of the list, so on shorter screens (1280×800) Settings stays visible while the rest scrolls.
  - The page you're on scrolls into view.
  - The old 34px drop shadow, which left a grey band over the page, is replaced by the hairline border alone.
  - Groups don't collapse: once the list fits, collapsing would only add clicks.
- **Kept from the plan as it was:** section tabs stay above the page title as a section bar on every page that has them. Moving them under the title would need each page's header markup changed.

#### D2: Dense lists on desktop (2026-10-16)

- **Timecards (managers): one row per person.**
  - Columns: select, employee, status, recorded, breaks, attention (first issue and "+N more"), and actions (Approve timecard, Finalize period).
  - Entries, issues, corrections, reopening and revision history open under each row's Details.
  - The period picker is a toolbar, the overview is a stat strip, and selected-timecard review is a slim bar.
  - A new "Select all eligible timecards" checkbox selects up to 100 eligible cards through the same batch rules.
  - Unavailable actions recede (outlined grey) instead of a faded teal button on every row.
  - Button names, checkbox names, `#timecard-<id>` anchors and the batch flow are unchanged. The employee timecard view is untouched.
  - Fictional 10-person period: page height went from 6,692 to 1,486px.
- **Employees.** Rows went from 96 to about 60px and column labels from 11 to 13px. The whole row opens the profile (a stretched link); the "View profile" link is still the keyboard and screen-reader target, and the row shows its focus.
- **Home tasks and Inbox groups** read as lists: one bordered container with hairline rows, and a coloured edge only on urgent work. Inbox group counts and arrows sit at the right edge.
- **Targets stay at least 44px** (row buttons, Details, the top-bar links). On phones the Timecards rows stack into compact cards with buttons side by side.
- **Verified on fictional data (production build):**
  - Same left edge on 16 manager and 9 employee pages.
  - Trail content and links; Settings visible at 1440×900 and 1280×800.
  - At 1920, wide pages stop at 1,440px and reading pages at 1,120px.
  - Inbox order; Timecards rows match the overview count and Details opens; Employees row click opens the profile.
  - axe, overflow, targets and client errors pass at 1440 and 390.
  - The 156-check sweep passes, as do U1, U4, U8, B3 and B4. Unit tests: 7,181 passed; the 17 tenancy and phase-E failures were load timeouts and all 217 pass when run alone.
- **Next (not done):**
  - D3 Home hierarchy: task titles name their location, and the tiles become a stat strip.
  - D4 component consistency: one segmented control (the Inbox's black "All" pill), one button size and radius, teal for actions only.
  - D5 employee desktop.
  - D6 craft pass.

#### D3: Home hierarchy and a shorter desktop sidebar (2026-10-16)

- **Sidebar (desktop only).** The Owner's list goes from 16 entries to 10: Home, Inbox, Schedule, Employees, Requests, Updates, Timecards, Payroll, Insights, Settings.
  - **Where the removed entries live now** (`sidebarNavigation` and `sidebarActiveHref` in `src/lib/navigation.ts`). Each is one step away and lights its holder in the sidebar:
    - Availability and Shift requests: the Requests tab row (the "Time off" entry is now "Requests").
    - Payroll export: the Time exports tab on Timecards.
    - Templates: the Schedule page.
    - Scheduling rules: the Settings hub.
    - My pay: "Your pay statements" in the account menu.
  - An entry stays when the place that would hold it is missing. Managers have no Settings, so they keep Scheduling rules; with Time off switched off, Availability and Shift requests keep their own entries.
  - Employees lose Availability (in their Requests tabs) and Profile (in the account menu).
  - Phone tab bars, More menus and the ⌘K finder are unchanged.
- **Today strip.** The four tiles are one bordered strip with 24px figures. Zeros are muted grey; only a started-not-clocked-in count turns coral with a top edge. The "Published shifts only · Updated" note is the strip's footer.
- **Tasks.**
  - Each row leads with a word tag: Urgent or Coverage need (coral), Setup needed (amber), Review (grey). The category follows in plain text. Colour is never the only signal.
  - Coverage-gap groups name their location ("14 coverage gaps at Main Office").
  - Only urgent rows keep the coral edge.
  - "Show all N tasks" and "Open inbox" share one row.
- **Rail.**
  - Rail headings are 16px, so they read below the 20px Tasks heading.
  - With the Today strip on screen, an empty "Clocked in now" card is hidden, along with its grid row, because the strip already shows 0. The card still appears when someone is on the clock.
  - All six shortcuts stay, because the Clocker and Account recovery tools have no other desktop entry.
- **Employee Home (desktop).** Quick actions are one-line tiles (56px instead of 104px), which shortens the right column. Phones keep the larger two-row tiles.
- **Verified on fictional data (production build):**
  - The Owner's 10 entries and the active holder for each moved page.
  - Every removed entry is still reachable (tabs, the Schedule page, the Settings hub, the account menu link opening My pay); the manager keeps Scheduling rules; the phone More menu is unchanged.
  - The strip has muted zeros; coverage-gap headings name the location; only urgent rows carry the coral edge.
  - axe, overflow, targets and client errors pass on Home for both roles at 1440 and 390.
  - The 156-check sweep passes, as do U1, U4, U8, B3, B4 and the D1/D2 checks. Unit tests: 7,202 passed.
- **Left for the error pass:** the employee Home notices "Some Home sections could not be fully checked", "Schedule partial" and "Schedule reviews partial" are data-source states, not layout.

#### D4: Component consistency (2026-10-16)

- **One segmented control (desktop).**
  - A light pill track (`--g-inset`, 1px `#E6E7E9` edge) with 44px segments. The chosen segment is white with ink text at weight 600 and a soft shadow; the others are muted at 500.
  - Applied to: Inbox filters (were black), Locations filters (were black), Home task filters (were teal chips), the request and time-off tabs, Updates and Notifications filters, My shifts / Open shifts, Shift requests views, and the Branding preview switch.
  - The Schedule location switcher keeps its status chips, but the chosen location reads in ink instead of teal.
  - Count chips inside a chosen segment are neutral grey.
  - Deliberately left as they are:
    - The Schedule day picker, which is a date chooser.
    - The payroll period list and the Branding preview, which are list selection and preview content, not segmented controls.
- **One button size (desktop).** Primary and secondary buttons are 44px tall with 8px corners (`--g-control-radius`) and 14px labels. Stragglers brought in line:
  - Add employee (was 48px with 17px corners) and Apply filters.
  - Fill gaps only (22px corners).
  - Locations Search (11px).
  - Time export buttons (13px).
  - Request hub buttons (52px tall).
  - Availability buttons (45px).
  - The Inbox time-off Approve and Decline buttons (pills at 15px).
- **Teal for actions only (every width).** Status labels use the status ladder: grey for neutral or waiting, amber for something to review, green for done.
  - Payroll badges: Review required is amber, Waiting for amounts is grey, Approved stays green. A `data-status` attribute was added in `payroll-runs.tsx`.
  - Employee Home's "Required review" is amber.
  - The "0 requests" count and "Owner access" label are grey.
  - Employees directory initials are neutral grey, as in Gusto's directory.
  - Teal remains on buttons, links, the active sidebar item, the account avatar and focus rings.
- **Verified on fictional data (production build):**
  - The inventory script confirms a single selected style across 14 pages and no off-standard primary or secondary buttons.
  - axe passes on the 14 pages touched.
  - The 156-check sweep passes, as do U1, U4, U6, U8, B4 and the D1/D2 and D3 checks. Unit tests: 7,202 passed.
  - **Found and fixed:** the Inbox count chip kept white text from the old black pill and failed contrast on white (U4 axe).

#### D5: Employee desktop pass (2026-10-16)

- **My schedule (1100px and wider).**
  - The week list leads on the left. Its status sits in a 340px column beside it that stays in view while scrolling: "not published yet", Review this week's schedule with a full-width Confirm, and What changed.
  - Each day is one compact row: the time on the first line, then place · position. Days with a single shift went from about 117px to about 75px; the Today row is 94px.
  - Two plain wrappers (`my-schedule-body`, `my-schedule-side`) hold the layout. Below 1100px and on phones it stays one column, in the same order as before.
  - The two-column grid applies only when there is status to show; otherwise the week uses the full width.
- **Availability.** Day rows went from 88 to 60px, with the switch and hours next to the day name instead of across the page.
- **Profile (fix for D3).** After D3, Profile lit Home in the sidebar and the trail read "Home". Profile now lives only in the account menu: no sidebar entry lights up, and the trail names the page. The same fallback names My pay for Owners.
- **Time zones** read "Puerto Rico time" instead of "America/Puerto_Rico" on Profile and My time (`src/lib/time-zone-label.ts`).
- **Details:**
  - The empty-state icon is centred again; an older rule pinned it top-left.
  - "Review needed" on Updates reads amber, following the D4 status ladder.
  - The schedule Confirm button takes the D4 button shape.
- **Verified on fictional data (production build):**
  - Profile shows no lit entry, the trail and the friendly zone; My time has no raw identifier.
  - My schedule columns sit side by side at 1440 and in one column at 1024; days are compact.
  - Availability rows are 61px, the empty icon is centred, and the review tag is amber.
  - axe, overflow, targets and client errors pass on nine employee pages at 1440 and three at 390.
  - The 156-check sweep passes, as do U1, U2, U3, U4, U8, B3 and the D1–D4 checks. Unit tests: 7,202 passed; one phase-E process test timed out under load and passes alone.
- **Still open for the error pass:** employee Home's "Some Home sections could not be fully checked" and the two "partial" notices.

#### D6: Desktop craft pass (2026-10-17)

- **Focus.** A Tab sweep through 15 pages (both roles) found one gap: date fields on Timecards and Insights showed no ring, because the browser focuses their inner parts. They now take the ring through `:focus-within`, as do time fields.
- **Arrow keys in dense lists** (`src/lib/row-navigation.ts`, wired once in `AppShell`).
  - Up and Down move focus to the same control in the next or previous row of Employees, Timecards and Home tasks.
  - Lists opt in with `data-row-nav` (the value is the row selector).
  - Text fields keep their own arrows, modified keys are ignored, and nothing moves past the first or last row.
  - Covered in the real browser: the repo has no DOM environment for unit tests, and none was added.
- **One row hover** for mouse users on Home tasks and Inbox groups (`--g-inset`, 120ms, off under reduced motion), matching Employees and Timecards.
- **One calm empty state.** Every full-panel empty state has a 1px hairline border, 12px corners and 40px padding. The dashed "drop zone" edge is gone (Time off, open shifts, the shift board), and Shift requests lost its extra padding.
- **Time zones as places** on the manager Schedule ("Times in Puerto Rico.") and in the Insights period summary ("Puerto Rico time").
- **Insights date fields** are 220px wide instead of half the page each.
- **1920 check:** Home, Schedule, Insights and Timecards hold at 1,440px wide, left-aligned, with no overflow.
- **Verified on fictional data (production build):**
  - The D6 checks cover arrow keys in all three lists, text fields keeping their arrows, the date-field focus ring, place-name time zones, one empty-state shape and the row hover.
  - axe, overflow and client errors pass at 1440 and 1920.
  - The 156-check sweep passes, as do U1, U2, U3, U4, U8, B4 and the D1–D5 checks.
  - Unit tests: 7,198 passed. Five tenancy and phase-E tests timed out under load; all 217 in those files pass alone.

#### Error pass: data-state messages (2026-10-17)

- **Employee Home: a week that isn't fully published is a known state, not a failure.**
  - On fictional data, Home said "Some Home sections could not be fully checked" and listed "Schedule partial" and "Schedule reviews partial". Nothing had failed: one location simply hadn't published this week.
  - The schedule source already said `unpublished`. The acknowledgements source reported the same condition as `unknown_source` (the server's fallback reason).
  - The server now names it `unpublished` (`employee-home.server.ts`), a value the Home contract already allowed. The response shape and the overall `partial` state are unchanged.
  - The view treats `unpublished` as known (`isComplete` in `employee-home-reviewed.tsx`). The publication note in the Next shift card stays. The "could not be fully checked" notice, "known" counts and source rows now appear only when a source really failed or was cut short.
- **Fixes to B3 found in this pass:**
  - The plain-language claim reasons ("You already work during this time") applied to manager approvals too, where "you" would describe someone else. They now apply only to a person's own claim; approvals keep their earlier notices.
  - Employee Home decided "partial" by comparing the notice text "Needs Owner rule review". B3 changed when that text appears, so Home stopped flagging offers whose rules still need review. Home now reads the structured `refusal` and `reasons` fields, which restores the earlier behaviour.
  - Two database integration tests expected the availability result to be exactly `{allowed, notice}`; B3 added fields. They now check the fields they care about. They had not run in B3 because they need a database.
- **Plainer notices** (shift requests, both roles):
  - "Stale or expired. Review the current assignment." → "This shift changed. Reload to see the latest."
  - "Unavailable with the current consent, eligibility or policy." → "Not available under the current rules."
  - "Reload the current request revision." and "This request needs a fresh revision before responding." → "This request changed. Reload to see the latest."
  - "Current eligibility/review is unavailable. Reconnect and reload." → "We couldn't check this right now. Reload to try again."
  - "Stale or unverified. Reload the current assignment or ask management to review." → "This request changed or needs a manager's review. Reload, or ask your manager."
  - One manager test was updated to the new wording.
- **Left as they are on purpose:** payroll and payroll-export wording ("revision", "provider amounts", "population revision"). Payroll copy is locked as approved, and QA scripts press "Approve revision". "Needs Owner rule review" also stays: it's short and a manager test reads it.
- **Verified:**
  - Employee Home on fictional data: both sources report `unpublished`, the view state is ready, and the false notice and partial rows are gone while the publication note remains.
  - Unit tests: 7,205 passed.
  - The exchanges integration suite (14 files, 163 tests) passed on a throwaway database inside the preview's disposable cluster. The database was created and dropped by the tests; no other database was touched.
  - Browser: the 156-check sweep passes, as do U1, U2, U3, U4, U8, B3, B4 and the D1–D6 checks.
  - The B3 flow now runs with as many future shifts as the calendar allows. On Oct 17 only the Oct 18 shift could still be offered.


## Employee mobile Notifications and Updates — 2026-10-27

This scoped Phase2 continuation follows Jose's approved teal Employee/Lead system in `docs/product/specs/employee-mobile-teal/README.md`; it does not change management, desktop or global style authority. Notifications use bounded current-source pages, native filter/search and exact source-safe open/return focus. Updates distinguish permitted own Mark as read from Acknowledge. Today-team publication uses native labels, canonical field validation and deliberate current audience review; withdrawal has explicit confirmation. Pending or unknown work retains its original operation; current module loss immediately removes private fields/actions and fences late replies. Existing authorization, activation and recovery owners remain mandatory.

Recorded free21st metadata references27135/36949/31789/28458 informed existing native primitives. No paid code, hosted generation, new dependency, competitor audit or visual exploration was added. The Cloud21st CLI is unavailable; actual browser captures and author-owned independent UI review are evidence. See `docs/execution/employee-mobile-communications/HANDOFF.md` for exact candidate, tests, original failures and the three retained nonblocking code/UI findings. These local results do not authorize production or complete the remaining Phase2 groups.
