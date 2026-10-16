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
- **Next:** U3 Schedule, U4 manager Today and Inbox, U6 Pay.

## Owed testing
- VoiceOver pass, 200% zoom, and at least one physical iPhone.
