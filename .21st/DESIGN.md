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

Tokens live in `src/components/manager-home-gusto.css`, scoped to `.app-shell.nevora-portal:has(.manager-portal-home)`: teal accent #0A7E7E (hover #075E5E, text on wash #07605F), wash #E7F3F2, phone masthead #1C4A47, ink #1C1C1C, muted #5F6368, border #D7D9DC, hairline #ECEDEF, white canvas, coral #E1553F for urgent task bars only, 6px desktop task cards and 12px phone cards. The same block remaps the portal tokens so the sidebar, focus rings and buttons are teal on Home. Inter/JetBrains Mono, Phosphor icons and the NEVORA wordmark are unchanged.

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

- **Tokens:** teal accent #0A7E7E (hover #075E5E; #07605F for text on the #E7F3F2 wash), ink #1C1C1C, muted #5F6368, border #D7D9DC, hairline #ECEDEF, inset #F6F7F8, white canvas, dark-teal phone masthead #1C4A47. The legacy portal aliases (`--design-*`, `--nevora-*`, `--nuvora-*`, `--coffee`, `--blue`, …) map onto these. Card radius is 12px, control radius 8px.
- **Type:** page h1 28/500, h2 20/500 in ink, h3 at 600, tabular figures in tables/definitions/times. Headings on coloured banners keep their own white text.
- **Buttons:** primary teal fill with white label, secondary white outline, ghost teal text. All use 8px radius, 120ms feedback and a .98 press, with no motion under reduced motion. Form controls get the hairline edge, teal focus ring and teal checkbox/radio accent.
- **Chrome:** white top bar with the workspace name, a borderless bell and a new top-right **account menu** (avatar initials, name, "Signed in as", Your profile for Employee/Lead, Profile and device settings when enabled, Sign out). On desktop the account menu replaces the sidebar profile and Sign out rows. Phones keep account actions in their existing menus. The compact sidebar (40px rows, 14px labels, 20px icons, muted group labels, teal bar plus wash for the active item, credit-only footer) applies on every page. Phone tab bars mark the active item with teal glyph and label only.
- **Accessibility:** axe (WCAG 2.2 AA rules) reports no violations on Owner/Manager/Employee Home at 1440px and 390px. The employee arrival date is white on the teal banner.
- **QA:** `scripts/payroll-workflow-ui-qa.mjs` now signs out through the account menu.
