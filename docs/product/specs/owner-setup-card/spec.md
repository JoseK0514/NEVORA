# Owner setup card: build spec

Status: approved for build (Checkpoint 2, 2026-10-17); review changes applied.

- **Initiative:** direction item 10 (A10). PRD: `docs/product/prd-owner-setup-card.md` (3 slices), including "Decisions (Jose, 2026-10-17)": the weekly availability deadline stays a Task; the card is for Owners only; extra steps wait for a follow-up. Merges `flows.md` (UX Designer) and `visual.md` (UI Designer) in this folder.
- **Written:** 2026-10-17 by the UI/UX Designer, cycle 1 merge step. Updated 2026-10-17 with the required change from `review.md` §3 and Jose's Checkpoint 2 decisions (J1, J2, J3 in this build; J4 a separate item).
- **Evidence:** the code at the lines cited, read on 2026-10-17; `before-owner-home-1440.png` (setup items fifth in Tasks under an amber "Setup needed" tag); `../phone-search/before-owner-home-390.png` and `before-owner-home-320.png`; `mockup.png` frames A to C. I did not start the dev server for this merge.
- **The mock-up copy is stale.** Frames A to C show "Add weekly hour targets" and "7 employees don't have one yet.", and a teal bar. Build from the copy table in §1.6 and the bar colour in §1.3, not from the frames.
- **Not in this build:** J4 (sticky save bar and unsaved-changes prompt on the phone settings page) is its own small UI item after the card ships. The explicit "No target" choice for weekly hours (J3 follow-up) is a later item that needs its own backend go-ahead.

## Contents

1. Screens
2. Decisions log
3. Decisions for Jose at Checkpoint 2
4. Acceptance checks for the build
5. Draft scorecard

---

## 1. Screens

### 1.1 Components to reuse

| Need | Reuse | Change |
|---|---|---|
| Setup checks | `COVERAGE_RULES_MISSING` and `TARGET_MISSING` items from `buildManagerActionItems()` (`src/lib/assistance/manager-actions.ts:237-288`) | None |
| One shared read | `useActionCenter()` in `src/components/manager-action-center.tsx` | Lift it so the card and `ActionCenterSurface` share one request per refresh cycle |
| Filtered Tasks | `ActionCenterSurface` | Accepts a filtered item list and computes every count from it |
| First paint | Server-rendered `managerActions` (`src/app/app/page.tsx:83`) | Card's first state |
| Grid | `.home-layout` areas (`src/components/manager-home-gusto.css:355-365`); overview grid and `overviewSlots` (`src/components/manager-dashboard.tsx:430-511`) | New `setup` area and slot |
| Progress bar | `Fraction` pattern (`src/components/mobile-home-overview.tsx:6-12`) and `.home-progress` (`manager-home-gusto.css:290-291`) | Fill colour at `:291` reads `var(--home-progress-fill, var(--g-accent))` (slice 1, zero diff). Slice 2 sets `--home-progress-fill: #1D6F42` (`--color-state-success`) on `.manager-portal-home`, so the card bar and the This week bars turn ladder green (J1) |
| Location count | The location count Home already loads | Picks the coverage step's copy and link when there are zero locations (J2). No new request |
| Vocabulary | B2 `words.person` / `words.people`, `lower()` (`src/lib/workspace-presentation/words`) | None |
| Section focus on arrival | `ManagerIssueFocus` with the `coverage-`, `staffing-` and `target-` prefixes (`src/app/app/schedule/settings/page.tsx:42`); sections `#coverage-staffing` (`:75`) and `#target-hours` (`:96`) carry `tabIndex={-1}` | None. `src/components/action-center-navigation.ts:24` already links to `#coverage-staffing` |
| Preview | `src/components/ui-preview/home-fixtures.ts`, `home-preview.tsx` (`stayInPreview`, `:89`), `home-preview.test.tsx` | Fixture flags, `setup` slot, test counts |

New component: `OwnerSetupCard` (suggested file `src/components/owner-setup-card.tsx`), rendered by the overview for `role === 'OWNER'` only.

### 1.2 When the card shows

| Condition | Card |
|---|---|
| Not Owner | None |
| Server read failed ("Dashboard unavailable", `page.tsx:59`) | None, until a ready read reports gaps |
| Server props or a ready read report one or more `COVERAGE_RULES_MISSING` / `TARGET_MISSING` | Shows |
| Ready read with zero gaps | Gone on that read; no message, no motion |
| Live read loading, reconnecting, paused, offline or unavailable | Keeps the last confirmed steps and links, unchanged in look |
| A new location or employee creates a gap later | Returns with the new count, no highlight |

### 1.3 Desktop, 900px and up (1440, 1920)

**Position.** A full-width `setup` row above `today`: `grid-template-areas: "setup setup" "today today" "tasks week" "tasks live" "tasks activity" "tasks shortcuts" "tasks ."`, 20px gap to the strip. 761 to 899px: `"setup" "today" "week" "tasks" …`. The card sits first in DOM order, so it comes first in reading and Tab order.

**Card.** `--g-canvas`, 1px `--g-border`, 12px radius, no shadow (the Tasks container). Padding 16px 20px; about 112px tall with two open steps.

**Inside.** Two columns: a 260px left block (heading, count line, bar), then the steps in a two-column grid, each step after a 1px `--g-hairline` left rule with 16px padding. At 761 to 899px the steps stack under the left block with hairlines between rows.

| Part | Desktop value |
|---|---|
| Heading (`h2`) | "Finish setting up", 600 16px `--g-ink` |
| Count line | Number in ink 600, " of 2 done" in `--g-muted`, 14px |
| Bar | 4px, 999px radius, track `--g-hairline`, fill `--home-progress-fill` = ladder green #1D6F42 (5.27:1 against the track, J1); 8px above, 4px below; `aria-hidden="true"`; width never animates |
| Step link | 16px/600 `--g-accent`, followed by a 16px Phosphor `CaretRight` (the voice guide's "›") |
| Reason | 14px `--g-muted`, `text-wrap: pretty` |
| Done status | "Done", 14px/600 #1D6F42 (`--color-state-success`, `globals.css:25`), right-aligned on the title line |

**This week bars (J1, every width, manager and Owner Home).** The "This week" facts ("Availability received 3 of 10", "Locations published 1 of 2") use the same `.home-progress` bar. With `--home-progress-fill` set, they turn from teal to ladder green with no other change. Both bars count finished things and you can't press either, so teal would break "teal for actions only". These are listed intended differences in slice 2 (check 2.20).

### 1.4 Phone (390, 320; iOS Safari, iOS PWA, Android Chrome, Android PWA; the future store app shows the same web card)

**Position.** The card takes the place the Today tiles hold today: the first white surface, straddling the masthead edge. The Today tiles follow on the canvas with 12px space. One element straddles the edge, as today.

**Card.** `--mh-surface`, 12px radius, `--mh-shadow`, no border. Padding 16px 20px. Heading, count line, bar (8px above, 4px below), then the steps as rows with 1px `--g-hairline` between them.

| Part | Phone value |
|---|---|
| Heading (`h2`) | "Finish setting up", 400 15px `--g-muted` (the "This week" label style) |
| Count line | "1 of 2 done", 600 20px ink |
| Step link | 17px/600 `--g-accent` plus 16px `CaretRight`; the link is a block at least 44px tall; the caret stays with the last word (`white-space: nowrap` on a span holding the last word and the caret) |
| Reason | 15px `--g-muted` |
| Done status | "Done", 15px/600 #1D6F42, right-aligned; drops under the name at 320 and at a 200% root |

### 1.5 Step rows

| Part | Open step | Done step |
|---|---|---|
| Mark | Phosphor `Circle` regular, 20px, `--g-muted` (6.05:1), aligned to the first line, `aria-hidden` | Phosphor `CheckCircle` fill, 20px, #1D6F42 (6.17:1), `aria-hidden` |
| Title | The step name is the link | Plain name, ink 600, no link, no strike-through |
| Reason | Under the link, plain text, tied to the link with `aria-describedby` | None |

| Link state | Look |
|---|---|
| Default and visited | `--g-accent` 600 (5.53:1) |
| Hover (pointer only) | `--g-accent-hover` (7.82:1), underline at 3px offset, 120ms colour |
| Pressed | Same as hover, no scale |
| Focus | 2px `--g-accent` outline, offset 2px, 4px radius. Each step has its own ring; the card is never one big link |

### 1.6 Copy

| Element | Copy (exact) |
|---|---|
| Heading | Finish setting up |
| Count line | 0 of 2 done / 1 of 2 done |
| Coverage step, open: link | Set coverage periods |
| Coverage step, open: reason | Each location needs a minimum staff count, a lead rule and a coverage period. |
| Coverage step, done | Coverage periods · Done |
| Hours step, open: link | Set weekly hour targets |
| Hours step, open: reason, plural | {n} {people} have no weekly hour target. |
| Hours step, open: reason, singular | 1 {person} has no weekly hour target. |
| Hours step, done | Weekly hour targets · Done |
| Coverage step, no locations (J2): link | Add a location (with the `CaretRight` icon: "Add a location ›") |
| Coverage step, no locations (J2): reason | Then set its staffing and coverage periods. |
| Tasks empty only because the card took the setup items: heading | You’re all caught up (unchanged) |
| Tasks empty only because the card took the setup items: second line | Setup steps are listed above. |

- The hours wording states a fact (J3, approved): a blank target can be a deliberate choice, since the settings page invites it (`page.tsx:97`). Never "missing" or "don't have one yet".
- `{people}` and `{person}` come from B2 `lower(words.people)` and `lower(words.person)`; never a hard-coded "employees".
- Plural and singular are two whole strings, so B5 can translate them. No string joins around the count.
- The "›" is the `CaretRight` icon, not a typed character, so it isn't read aloud.

### 1.7 Links

| Step | `href` |
|---|---|
| Coverage | `/app/schedule/settings#coverage-staffing` |
| Hours | `/app/schedule/settings#target-hours` |
| No locations (J2, approved) | `/app/settings/locations` (the page the settings empty state already links to with "Manage locations", `page.tsx:92`). Shown instead of the coverage link whenever the location count is 0 |

The path for both main steps is the action item's `href`; only the fragment is new. The settings page focuses the section on arrival.

**Coming back.** No new link on the settings page. The Owner returns with the Home tab (phone) or the sidebar (desktop). Home re-renders from fresh server props; the shared read then confirms.

### 1.8 Tasks after filtering (Owner, every width)

- Tasks leave out every `COVERAGE_RULES_MISSING` and `TARGET_MISSING` item while the card shows.
- Every count uses the filtered list: "Total tasks", category counts, "Review N tasks" (phone disclosure), filter counts, "Showing N of M", "Show all N tasks".
- `DEADLINE_MISSING` and `AVAILABILITY_MISSING` stay, with the amber "Setup needed" tag (`portal-desktop.css:119`).
- Only setup items left (the source returned items, but the card took all of them): keep the heading "You’re all caught up" and replace the second line with "Setup steps are listed above." The card sits above it. The phone disclosure summary uses the same line where it shows "No tasks found in the checked sources." today (`manager-action-center.tsx:75`). The list empty state is at `:79`.
- A source that is truly empty (zero items before filtering) keeps "No tasks found in the checked sources." in both places. The D7 unit test reserves that line for a verified empty source (`manager-action-center.test.tsx:15`), and that test stays unchanged.
- Never show "No tasks found in the checked sources." while the card lists open setup steps: it would say the sources found nothing right under two open steps.
- No gap or placeholder where the removed rows were.
- Inbox (`/app/inbox`) unchanged: setup items stay under "To review".
- Script-pinned strings unchanged: "Open inbox", "Show all N tasks", "You’re all caught up", the Tasks status lines, and "No tasks found in the checked sources." for a truly empty source.

### 1.9 States

| State | Phone | Desktop |
|---|---|---|
| Two gaps | "0 of 2 done", empty bar, two open steps (frames A, C) | Same, side by side |
| One gap | "1 of 2 done", half bar, one done row, one open (frame B) | Same |
| First paint | From server props; no skeleton; the Today strip doesn't jump | Same |
| Live read loading, reconnecting, offline, unavailable | Identical to the last confirmed state: no stale badge, no spinner, no dimming. Tasks shows its own status line ("Loading tasks…", "Tasks unavailable offline", "Tasks unavailable") | Same |
| Step link tapped offline | The offline page (`public/fuel-portal-offline.html`) | Same |
| Only setup items in Tasks | Card above; Tasks shows "You’re all caught up" / "Setup steps are listed above." | Same |
| Zero locations | Coverage step reads "Add a location ›" / "Then set its staffing and coverage periods.", linking to `/app/settings/locations` | Same |
| Done | Card gone; no "setup complete" line; no celebration (U7 allow-list) | Same |
| Server read failed | No card; Home shows "Dashboard unavailable" | Same |
| Manager, employee, lead | No card; setup items stay in Tasks | Same |
| Preview, Owner | Card with fictional gaps; tapping a step shows the existing preview notice built by `stayInPreview` | Same |
| Preview, Manager | No card | Same |

### 1.10 Behaviour details

**Keyboard order.** Card links come before the Today strip. Within the card: coverage link (if open), then hours link (if open). Done rows hold no focusable element.

**Screen readers.**
- The card is a `<section aria-labelledby>` pointing at the `h2` "Finish setting up".
- The count line is plain text, read in order. It isn't a live region: it changes while the Owner is away, and announcing it on every refresh would be noise.
- Open step: "Set coverage periods, link, Each location needs a minimum staff count, a lead rule and a coverage period." (name from the link text, description from `aria-describedby`).
- Zero locations: "Add a location, link, Then set its staffing and coverage periods."
- Done step: "Coverage periods, Done", as text.
- Tasks, filtered-empty case: the existing `role="status"` paragraph reads "You’re all caught up, Setup steps are listed above."
- The bar and marks are `aria-hidden`.

**Gestures.** None. Steps are plain links.

**Safe areas.** The card sits below the masthead like the tiles do today; no new inset.

**Offline.** Covered in 1.9.

**Reduced motion.** No enter or exit animation and no bar animation at any setting. Link hover colour changes instantly under reduced motion.

**200% zoom and a 200% root.** Desktop steps stack below 900 CSS px. Phone rows wrap; "Done" drops under the name; the count line and bar stay paired. No sideways scroll at 320 or 720 CSS px. Once phone type moves to `rem` (phone foundations), the card follows the root.

**Increased contrast.** Desktop border and phone hairlines turn `--g-ink`; bar track `--g-muted`.

**Forced colours.** Card border `CanvasText`; bar fill and marks `CanvasText`; the word "Done" carries the state.

**B1 brand.** Links and focus ring follow the brand action colour within the B1 floors (Ocean #1D4ED8 measures 6.70:1). Done marks stay ladder green. The heading stays ink or muted.

---

## 2. Decisions log

| # | Conflict or open point | Resolution | Why |
|---|---|---|---|
| D1 | Progress bar colour (PRD Q5, UX V2, UI-1): teal on a bar nobody can press strains P1 | Build the bar on `--home-progress-fill`, defaulting to `--g-accent` (slice 1), and set it to ladder green #1D6F42 for both Home bars in slice 2 (J1, approved). The This week bars are listed intended changes | The card marks finished steps green, so a green bar keeps one meaning for "done". 5.27:1 against the track |
| D2 | Step links to the page top (PRD AC2.1) or to the section (flows decision 2) | `#coverage-staffing` and `#target-hours` | Same path, so AC2.1 holds. Without the fragment the hours step lands on Location staffing and the Owner has to scroll past it. The page already focuses these sections, and Tasks already links to `#coverage-staffing` |
| D3 | The coverage reason line | "Each location needs a minimum staff count, a lead rule and a coverage period." | The check needs all three for every location (`manager-dashboard.ts:131-137`). "Set coverage periods" alone leaves an Owner who skipped the lead rule with no reason the step stays open (flows F2) |
| D4 | "Blank target counts as missing" contradiction (flows F3, P1): the settings page invites blank targets ("Leave a target blank to leave it out of the hours review.", `page.tsx:97`) while Home counts every blank as missing | Softer wording in this build: "{n} {people} have no weekly hour target." (a fact, not an error) and the link "Set weekly hour targets" (J3, approved). An explicit "No target" choice is a later item with its own backend go-ahead | Trust: the card must not call a deliberate choice a mistake. The real fix needs a data change, so it can't ship in this UI cycle |
| D5 | Hours link verb: PRD suggested "Add weekly hour targets" | "Set weekly hour targets" | Matches "Set coverage periods"; "Set" fits a value that may stay blank on purpose |
| D6 | Reason line in the link's accessible name (flows 2.1 left it open) | Link name is the step title; the reason joins through `aria-describedby` | Short link names in the rotor; the reason still reaches VoiceOver and TalkBack |
| D7 | Phone heading style: flows drew a bold `h2`; UI used the 15px muted label style | UI's label style on phones; 600 16px ink on desktop; `h2` at both | Matches "This week" on phone Home; the 20px count line carries the weight |
| D8 | Card position on phones (UX V1) | The card straddles the masthead edge; the Today tiles follow | One element straddles, as today; both designers agree |
| D9 | "Easier on a computer" on phone steps (PRD Q4) | No | The steps are short numeric fields that work on a phone once phone foundations slice 8 fixes the settings page's type and targets (flows F5) |
| D10 | `setup-checklist` illustration (UX V3, UI-2) | No | It adds height on phones and pushes the Today strip down |
| D11 | Done title strike-through | None | Keeps legibility; the card reads as status, not history |
| D12 | "Add a location ›" when no locations exist (flows P2) | In this build (J2, approved); copy in 1.6, link in 1.7 | Without it the Owner lands on an empty state and needs one more tap. A new presentation rule and `href` outside AC2.1, which Jose approved |
| D13 | Filtered-empty Tasks said "No tasks found in the checked sources." under two open setup steps (review §2.1) | Keep "You’re all caught up"; second line "Setup steps are listed above."; the original line stays for a truly empty source | Trust: the original line claims the sources found nothing. The D7 test (`manager-action-center.test.tsx:15`) keeps its meaning |
| D14 | Mock-up frames show old hours copy and a teal bar (review §2.2) | Build from §1.6 and §1.3 | The tables carry the approved copy and J1 |
| D15 | Phone settings page loses unsaved edits (flows F4, J4) | Not in this build and not in foundations slice 8. Its own small UI item after the card ships | A save bar and leave-page prompt change behaviour, which would break the foundations zero-diff proof |

---

## 3. Decisions for Jose at Checkpoint 2

Resolved 2026-10-17.

| # | Decision | Outcome |
|---|---|---|
| J1 | Progress bar colour for both Home bars (this card and This week), via `--home-progress-fill` | **Approved, in this build.** Ladder green #1D6F42 for both. Slice 2 lists the This week bars as intended changes (§1.3, check 2.20) |
| J2 | With zero locations, switch the coverage step to "Add a location ›" with "Then set its staffing and coverage periods.", linking to `/app/settings/locations` | **Approved, in this build** (§1.6, §1.7, check 2.21) |
| J3 | Softer hours wording now, and a follow-up for an explicit "No target" choice | **Approved.** The wording is in this build (§1.6). The "No target" choice needs a stored value, so it is a later item with its own backend go-ahead |
| J4 | Sticky save bar and unsaved-changes prompt on the phone settings page (flows F4) | **Approved as its own small UI item after the card ships.** Not in this build and not in phone foundations slice 8 |

---

## 4. Acceptance checks for the build

Run on the fictional runtime in a worktree (owner fixture with coverage unset and some targets missing), Chromium and WebKit.

### Slice 1: shared read and filtered Tasks

| # | Check | From |
|---|---|---|
| 1.1 | With no filter applied, the U10 snapshot of Home shows zero differences | Slice 1 |
| 1.2 | Unit tests: every Tasks count computes from the filtered list | AC3.2 |
| 1.2a | New unit test: a ready snapshot whose only items are `COVERAGE_RULES_MISSING` and `TARGET_MISSING`, filtered for the card, renders "You’re all caught up" and "Setup steps are listed above." and does not contain "No tasks found in the checked sources". The D7 test at `manager-action-center.test.tsx:15` passes unchanged | Review §3.1 |
| 1.2b | `.home-progress > span` reads `var(--home-progress-fill, var(--g-accent))`; with the token unset, Home shows zero differences (covered by 1.1) | J1 |
| 1.3 | One action-center request per refresh cycle on Home | AC4.6 |
| 1.4 | 156-check sweep and the U4 Inbox checks pass | Slice 1 |

### Slice 2: the card

| # | Check | From |
|---|---|---|
| 2.1 | Owner, overview, gaps present: "Finish setting up" above the Today strip at 320, 390, 1440 | AC1.1 |
| 2.2 | Exactly two steps, coverage then hours, each done or open | AC1.2 |
| 2.3 | Count line text matches the bar share; bar `aria-hidden` | AC1.3 |
| 2.4 | Open steps: copy exactly as the §1.6 table (not the mock-up frames); link ends with the caret; B2 noun used; no "missing" or "don't have one yet" in the hours reason | AC1.4, J3 |
| 2.5 | Done step: green check and "Done", no link, no teal | AC1.5 |
| 2.6 | Manager, employee, lead: no card; Tasks unchanged | AC1.6 |
| 2.7 | Coverage link lands on `/app/schedule/settings#coverage-staffing` with that section focused; hours link on `#target-hours` with that section focused | AC2.1, AC2.2, D2 |
| 2.8 | Fix a step, return by the Home tab: step shows "Done" and the count updates, no reload | AC2.3 |
| 2.9 | Tasks leave out both setup types; all counts filtered; deadline and availability items stay with "Setup needed"; Inbox unchanged | AC3.1 to AC3.5 |
| 2.9a | Only setup items in the source, at 320, 390 and 1440: Tasks shows "You’re all caught up" and "Setup steps are listed above." in the list and in the phone disclosure summary; "No tasks found in the checked sources." appears nowhere on the page. A truly empty source still shows "No tasks found in the checked sources." | Review §3.1 |
| 2.10 | Card present on first paint from server props; no layout shift of the Today strip | AC4.1 |
| 2.11 | Ready read that differs from first paint updates the card | AC4.2 |
| 2.12 | Force a failed live read with gaps unfixed: card keeps last confirmed steps; never "done", never gone | AC4.3, metric |
| 2.13 | Server read failed: no card | AC4.4 |
| 2.14 | Ready read with zero gaps: card gone, no celebration | AC4.5 |
| 2.15 | axe zero violations; keyboard order card links before the Today strip; 200% zoom at 320 and 720 CSS px with no sideways scroll | Slice 2 evidence |
| 2.16 | Reduced motion: no enter, exit or bar animation | PRD §5 |
| 2.17 | Default brand and Ocean brand: links in the brand colour, done marks green | PRD §5 |
| 2.18 | Taps from Home to the coverage page at 390: 1, no scroll; first setup link above the Today strip | Metrics |
| 2.19 | Screenshots at 320, 390, 1440: two gaps, one gap, failed live read, zero gaps, zero locations, only-setup Tasks; manager view | Slice 2 evidence |
| 2.20 | Card bar and the This week bars (manager and Owner Home, 390 and 1440) compute to #1D6F42; they are the only bar differences against the slice 1 snapshot and are listed as intended | J1 |
| 2.21 | Owner fixture with zero locations: coverage step reads "Add a location" with the caret and "Then set its staffing and coverage periods.", links to `/app/settings/locations`; no extra request | J2 |
| 2.22 | No sticky save bar or unsaved-changes prompt added to `/app/schedule/settings` | J4 |

### Slice 3: preview

| # | Check | From |
|---|---|---|
| 3.1 | `/ui-preview/home` as Owner: card with fictional gaps (coverage not configured, some targets missing); bars green | AC5.1, J1 |
| 3.2 | As Manager: no card; setup items in Tasks | AC5.2 |
| 3.3 | `home-preview.test.tsx` expected counts updated in the same change | AC5.3 |
| 3.4 | Screenshots at 390 and 1440 for Owner and Manager | Slice 3 evidence |

---

## 5. Draft scorecard (for the Product Designer)

| Line | Score | Why |
|---|---|---|
| Usability | 2 | One tap from the top of Home to the exact section that fixes each gap |
| Familiarity | 2 | Setup checklists in Square, HoneyBook and Klaviyo |
| Trust | 2 | Never claims done from a failed read; no celebration; no wording that calls a blank target an error |
| Accessibility | 2 | Progress carried by text; 44px links with their own rings; text contrast 5.5:1 or more |
| Brand distinctiveness | 1 | Plain container; the calm, verified trait shows in behaviour |
| Durability | 2 | The list container Home already uses |
| Cost | 2 | Existing checks, tokens and grid; one lifted hook |
| Continuity | 2 | Same destinations; the Inbox keeps every item |
| **Total** | **15 / 16** | Go |


## Checkpoint 2 decisions (Jose, 2026-10-17)

- **J1 approved:** both Home progress bars (the setup card and This week) use the done-green from the status ladder, through `--home-progress-fill`. Slice 2 lists the This week bars as intended changes.
- **J2 approved:** with zero locations, show "Add a location ›" linking to `/app/settings/locations`.
- **J3 approved:** softer hours wording now. The explicit "No target" option is a later follow-up and needs its own backend go-ahead.
- **J4 approved as its own item:** the sticky save bar and unsaved-changes prompt on the phone settings page are a separate small UI item after the card ships. Not part of foundations slice 8, and not part of this build.
- **Approved to build** once the review's required changes are applied to this spec.
