# Owner experience: premium visual review (Nov 11, 2026)

Evidence: screenshots in `inspect2/owner/` at 390 and 1440 (plus state shots). Findings with values and code locations are in `review-owner.json` (39 findings: 8 High, 24 Medium, 7 Low).

## Top 10 changes

1. **Quiet the approve buttons in lists (OW-001).** Approve/Review becomes the tinted teal-50 pill, Decline a text button, no glow. Filled teal stays for one action per screen.
2. **Make row titles carry the fact (OW-002).** "James Ortiz · Clock-out fix +20 min", not four rows of "Time correction waiting for review"; Notifications must not be five rows of "Operations need review".
3. **One format for hours, times and dates (OW-003).** Home says 447 h and Schedule says 446.5 h for the same week; durations appear in about six formats.
4. **Fix the band seam on Time corrections, phone (OW-004).**
5. **Payroll phone: one Prepare, no empty tiles (OW-005);** bring the phone's "Up next" structure to desktop (OW-018).
6. **Coverage as one inline line, not a lone tile (OW-006).** Returns about 110px to the schedule grid and removes the "failed to load" look.
7. **One lead slot for avatars and icon circles, 36px (OW-007).** Titles then share one edge on the phone.
8. **Design the offline state (OW-008)** and use the state card for every error and 404 (OW-019); placeholder cards instead of "Loading update…" over a blank page (OW-020).
9. **One desktop frame (OW-009, OW-010).** Three band heights, a fixed title position, band actions always at the wide grid's right edge, a right rail on list pages.
10. **Phone request rows (OW-011) and desktop request rows (OW-013).** No broken time ranges, no lines starting with "·"; inline buttons on desktop.

## Keep (the bar)

- **Home hero and first card** (`owner-home-390-fold.png`): "16 things need you", the glass figure strip, Things to do overlapping the band. Clear at a glance.
- **Payday ink card:** the one dark surface, white pill, amber "In 9 days". Distinctive and calm.
- **Settings hub** (`owner-settings-1440.png`, `-390.png`): teal-50 icon circles, even 60px rows, counts and one amber chip. The most finished page.
- **Segmented control on the band:** consistent across Timecards, Requests, Notifications, Updates.
- **Desktop schedule grid:** teal-50 blocks, 12px position line, amber "Needs cover" block over time off, legend in the corner.
- **Time correction comparison:** Recorded (grey) beside Asked for (teal tint) with the changed time in bold and a "+20 min" chip.
- **Timecard side panel:** summary strip, days table with tabular hours, selected row marked in the list.
- **Time-off request detail:** the consequence ("8 h across 1 shift would need someone else") shown before the decision.
- **Phone forms** (Add shift, Edit shift): Cancel / title / white pill header, 48px fields, the locked Location field with its reason.
- **Status colour discipline in chips:** amber waits, green done, grey neutral.

## Cross-screen patterns

1. **One filled action per screen.** A list-level button spec (tinted pill + text button) fixes OW-001, OW-005, OW-012, OW-013 and the offline CTA in OW-008.
2. **One formatter set** for duration, time range, date range and relative time, with tabular numbers. Fixes OW-003, OW-011, OW-029, OW-033 and the ragged columns in OW-017.
3. **One desktop page frame:** band presets (160 / 200 / 296px), fixed title position, one right edge for band actions, one card-to-band rule, list pages with a right rail, forms capped at 560px. Fixes OW-009, OW-010, OW-021, OW-022, OW-031, OW-032, OW-038.
4. **One row anatomy:** 36px lead slot, title = the distinguishing fact, one nowrap sub-line, fixed trailing zone (value, chip or button, then chevron), fixed heights (56 / 64 / 72px). Fixes OW-002, OW-007, OW-011, OW-012, OW-016, OW-017, OW-025, OW-034.
5. **One state card and one vocabulary** for loading, empty, error, offline and success, with "Waiting" as the single word for "needs your decision". Fixes OW-008, OW-014, OW-019, OW-020, OW-023, OW-037.

## What I could not see

- **Team and Activity were not captured:** `owner-team-*` and `owner-activity-*` are the "Page not found" page (the capture's route did not resolve). Team is unreviewed. Worth checking whether the Team tab itself resolves.
- **Full-page phone shots** have the tab bar drawn mid-page, hiding 60px of content (Home's This week header, Payroll's Recent payrolls header, Settings' Punch photos row).
- **Motion, hover, press and reduced motion** cannot be judged from stills. `state-timecard-approved-1440.png` is mid-transition.
- **Contrast (OW-030)** is from token values, not measured pixels.
- No shots of: Earlier timecards, payroll review/approve steps, pay history, Add employee step 2, Branding, Positions, Clocker pages, Scheduling rules, the finder, account menu, empty states for Things to do/Updates/Schedule, or 768px tablet for pages other than Home.
- Focus shots: the ring is visible and clear on the sidebar entry and the week stepper; I did not review full keyboard order.
