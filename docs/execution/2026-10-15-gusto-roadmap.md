# NEVORA Gusto-quality roadmap (approved 2026-10-15)

Jose approved every recommendation below. The NEVORA wordmark keeps its current colours.
Sources: Mobbin (Gusto web and Gusto Mobile first; Square, Fresha, Deputy and 7shifts for
scheduling patterns), the 21st catalog (paid tier, hosted AI off, so catalog components are
adapted rather than generated), and the design and critique skills Jose listed. Nothing generic:
every surface uses NEVORA data, routes, tokens, Inter and Phosphor.

Each phase is verified on an owned, disposable fictional-data runtime (separate from the existing
preview runtime, notifications disabled) at 1440px and 390px for every role. Checks: axe WCAG 2.2 AA,
no overflow, 44px targets, no client/server errors, no legacy colours, plus screenshot review.
Jose approves each commit.

## Phase 1 — Biggest visible gaps
- Employee Home in the Gusto Mobile anatomy: greeting, Next shift card, To do list, quiet clock
  status, This week summary (hours scheduled/worked), Shortcuts.
- Schedule grid: blank empty cells with a hover "+ Add", unscheduled people collapsed behind
  "Show N unscheduled", one-line shift chips ("8:00–4:00 · Main"), hours per person, totals per day.
- Sign-in, forgot access and activation pages in the teal system. The wordmark is unchanged.

## Phase 2 — Language, dates, numbers
- Sentence case for every label and button; in-app links use "›", not an external-link arrow.
- One date format ("Tue, Oct 14"; ranges "Sep 28 – Oct 4"), hours ("56 h"), right-aligned money.
- One empty-state pattern and a short writing guide (docs/design/voice.md).

## Phase 3 — Feel
- Menus and popovers grow from their trigger; phone sheets slide up with swipe-to-dismiss.
- Animated disclosures (opacity cross-fade under reduced motion).
- Translucent top bar and phone tab bar with a scroll-edge fade; solid fallbacks for reduced
  transparency and increased contrast.

## Phase 4 — Feedback and states
- Toasts after Refresh, Save, Publish and Approve; skeleton loading; inline form validation.
- Optimistic updates for approve/confirm, with reconciliation.
- Success moments for "Schedule published" and "Payroll approved".

## Phase 5 — Structure and navigation
- Slimmer sidebar: Schedule tabs (templates, rules); a Pay area (timecards, payroll, exports);
  a single employee Inbox (updates and notifications).
- Search with a ⌘K finder for people and pages.

## Phase 6 — Action center and Home
- Tasks: real due dates, approve/deny in place with undo, "done this week", snooze for
  review-only items.
- Manager Home "Upcoming": time off, next payday, publish deadline (existing data only).
- Owner setup checklist with progress, from existing configuration checks.

## Phase 7 — Insights
- Reports become Insights: hours vs target, coverage by day, attendance exceptions (4 weeks),
  time-off calendar (30 days), and payroll cost by period (payroll roles only). Real data only;
  every number links to the people or records behind it.

## Phase 8 — Platform and longevity
- Tables become stacked cards on phones; sticky headers, row hover and sorting on desktop.
- Phone status bar, PWA theme colour and manifest in dark teal; safe-area checks.
- Token consolidation (retire legacy aliases); screenshot regression baselines.
- Illustrations for empty and success states (teal/ink line style).
- Dark mode, built on the consolidated tokens.

## Status — full implementation plan
Phases 5–8 continue as the full implementation plan: UI phases U0–U10, then backend phases B1–B6, each of which needs Jose's go-ahead.
- **U0 foundations (done, 2026-10-15):** theme colour and manifest in dark teal, a teal offline page (SW cache v4), route skeletons for 12 sections, six spot illustrations with `EmptyState illustration`, and a 15px phone floor for the small and caption type roles.
- **U1 navigation and shared tabs (done, 2026-10-15):** four phone tabs plus More for every role (employees: Home, Schedule, Requests, Pay/Hours; managers: Home, Schedule, Requests, Team), section tabs on shared pages (Requests, Time and pay, Pay), "My time", and `?tab=pending` links.
- **U2 employee Today Home (done, 2026-10-15):** light arrival with a time-of-day greeting, a brand-gradient next-shift pass with Today/Tomorrow and a live countdown, a stacked To do card with kind icons, four quick action tiles, and a 15px phone type floor on Home.
- **U3 Schedule (done, 2026-10-16):** employee My shifts | Open shifts (claimable offers and own pending claims), manager location status chips, hours against target, position-tinted shifts with dashed drafts, a sticky name column and a print layout.
- **U4 manager Inbox (done, 2026-10-16):** `/app/inbox` with exceptions first, filters, in-place time-off decisions with swipe on phones, and the manager Inbox tab. Today tiles, the tab badge, snooze and the setup checklist are deferred (Today tiles to B4).
- **U5 plain language (done, 2026-10-16):** 54 audit-style strings rewritten from a scan of every page's visible text, with readable coverage-gap times and no revision numbers in timecard headers; the guide is in `docs/design/voice.md`.
- **U6 Pay (done, 2026-10-16):** a five-step payroll stepper derived from run state, and a Payday moment for the newest statement on My pay (no amounts, since statements carry none).
- **U7 delight (done, 2026-10-16):** a table-tested celebration gate and a 560ms burst for five server-confirmed moments, once per session and never under reduced motion.
- **U8 finder, tables and Insights (done, 2026-10-16):** a ⌘K finder over a new read-only names route, filter-as-you-type Employees with sticky headers, and Reports renamed Insights with an "At a glance" strip. Phone tables already stacked.
- **U9 Clocker kiosk (done, 2026-10-16):** locally defined teal (including the phone kiosk's leftover blue), 56px actions, Puerto Rico Spanish second lines with English names unchanged, and a per-tablet Spanish toggle.
- **U10 tokens and cascade (done, 2026-10-16):**
  - Computed-style and screenshot baselines are in place.
  - The `@layer` migration was measured (18,033 style changes on 94 of 96 pages) and reverted; the recommendation is to retire legacy CSS page by page first.
  - The 38 aliases are kept as the bridge.
  - 60 literal brand hexes now route through `--g-*` tokens, with zero diff, and a test brand override flows through.
- **Owed testing (2026-10-16):** 200% zoom and 400% reflow on 81 views, iOS Safari in the simulator, and a WebKit accessibility-tree review. Six fixes: focus kept clear of the sticky chrome, the header scrolls away on short screens, the Home More sheet matches other pages, the full-width tab strip, "My time" casing, and "Updated" wording.
- **UI track complete.**
- **B1 brand tier (done, 2026-10-16):** an Owner sets one brand colour and a logo at Settings › Branding.
  - Colours are derived in OKLCH under fixed contrast floors and injected as `--g-*` tokens. The kiosk, theme colour and manifest follow them.
  - Storage is migration 0031 (immutable, Owner-only, idempotent).
  - Verified with SQL checks, browser flows, a kiosk run, and the sweep under the default brand and two stress brands.
- **B2 words and modules (done, 2026-10-16):** vocabulary presets with English and Spanish slots, and five modules an Owner can turn off.
  - A module that is off is hidden everywhere and refused on the server.
  - It can't be turned off while requests in it are still waiting.
  - Migration 0032.
- **B4 Today accuracy (done, 2026-10-16):** today's published shifts are compared with recorded punches.
  - Four Today tiles on manager Home (including "Started, not clocked in").
  - A Missed punches panel at the top of the Inbox.
  - Read-only, with no migration.
- **B3 open-shift eligibility (done, 2026-10-16):** open shifts that can't be claimed are collapsed under "Shifts you can’t pick up" with plain reasons, on Schedule › Open shifts and the Exchange available tab.
  - Reasons come from the existing claim check. No rule changed, and there's no migration.
  - A blocking rule is named even when other rules also need the Owner's review.
- **D1 desktop shell and grid (done, 2026-10-16):** one left edge and two measures for every page, one header pattern, a workspace › section › page trail in the top bar, and a sidebar that fits a laptop with Workspace pinned.
- **D2 dense lists (done, 2026-10-16):** Timecards as one row per person (6,692 → 1,486px for 10 people), denser Employees rows that open the profile, and Home tasks and Inbox groups as lists.
- **Next:**
  - Desktop: D3 Home hierarchy, D4 component consistency, D5 employee desktop, D6 craft.
  - Backend: B5 Spanish or B6 offline (each needs Jose's go-ahead).
  - Apply migrations 0031 and 0032 before any release.

## Owed testing
- VoiceOver itself (it can't be driven here; the script is in `DESIGN.MD`) and at least one physical iPhone.
