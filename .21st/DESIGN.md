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
