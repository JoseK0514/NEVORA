# PRD: Owner setup progress card

- **Cycle:** 1, PRD step. Written 2026-10-17 by the Product Manager.
- **Approval:** direction item 10 (A10, score 15), approved by Jose at Checkpoint 1 on 2026-10-17 (`docs/product/direction.md`, "Checkpoint 1 decision").
- **Sources:** direction §2.3 A10, §3.2 row 10; trends T §2 (onboarding row), T §3.7; DESIGN.MD U4 (deferred checklist), B4, D3; roadmap Phase 6 ("Owner setup checklist with progress, from existing configuration checks").
- **Status:** ready for design. No backend, migration, legal or privacy change.

## Contents

1. Summary
2. Problem
3. Users and platforms
4. User stories and acceptance criteria
5. States
6. Out of scope and later
7. Dependencies and constants
8. Metrics
9. Release slices
10. Open questions

---

## 1. Summary

When an Owner's workspace still has configuration gaps, Home shows one "Finish setting up" card above the Today strip. It lists the gaps that Home Tasks already reports as "Setup needed", shows "1 of 2 done" over the existing 4px Home bar, and links each step to the page that fixes it. Those items leave the Owner's Tasks list while the card shows them. The card disappears when a confirmed read finds no gaps. It adds no tour, no coach marks and no new data source.

## 2. Problem

- **Setup hides among daily work.** The action center mixes one-time configuration with daily items. On the Owner's Home, "Availability deadline not set" and "10 weekly hour targets missing" sit in Tasks beside coverage gaps and requests (`.claude/evidence/d3/home-1440.png`). Tasks sort Urgent, then Review, then Setup needed (`src/lib/action-center/project.ts:18`), so setup lands at the bottom and the 20-row preview can push it behind "Show all N tasks" (`manager-action-center.tsx:54-57`).
- **The checks already exist.** `buildManagerActionItems()` (`src/lib/assistance/manager-actions.ts:237-288`) emits four `MISSING_INPUT` items:

| Type | Title today | Scope | Configuration or weekly? |
|---|---|---|---|
| `COVERAGE_RULES_MISSING` (`SETUP:COVERAGE_RULES`) | "Coverage periods not fully configured" | Workspace: every location needs a minimum staff count, a lead rule and a coverage window (`src/lib/data/manager-dashboard.ts:131-137`) | **Configuration** |
| `TARGET_MISSING` (`HOURS:<employee>`) | "Weekly hour target missing" | Per employee, until set (`manager-dashboard.ts:178-184`) | **Configuration** |
| `DEADLINE_MISSING` (`SETUP:DEADLINE`) | "Availability deadline not set" | Per week (`schedule_week_settings.availability_deadline`, `src/lib/data/week-settings.ts:24-46`) | Weekly planning |
| `AVAILABILITY_MISSING` | "Availability not submitted" | Per employee, per week | Weekly employee input |

- **Only two are setup.** Coverage periods and hour targets stay done once done. The deadline and availability recur every week, so a card built on them would never finish. This PRD builds the card from the two configuration checks (Q1 covers the deadline).
- **Tours don't help.** NN/g found tutorial readers no faster and rating tasks harder (T §3.7). Square, Klaviyo and HoneyBook show setup progress instead.

## 3. Users and platforms

| User | Job made easier | How often |
|---|---|---|
| Owner, new workspace | See what's left to configure and go straight to it | Daily in the first weeks, then whenever a new location or employee lacks setup |
| Owner, established workspace | Notice a regression (a new location without coverage periods) | Rarely |
| Manager | No change this cycle: managers keep setup items in Tasks (Q2) | n/a |
| Employee, lead, Clocker | No change | n/a |

| Platform | Behaviour |
|---|---|
| iOS app, Android app | No store app yet. In the Capacitor shell the same web card renders; steps open full pages |
| Desktop web | Card at the top of the Home overview, above the Today strip and Tasks. Owners do most setup here |
| Mobile web | Card at the top of Home, above the Today strip. A step whose page is hard to use on a phone can say "Easier on a computer" (Q4) |
| PWA | Same as mobile web |

## 4. User stories and acceptance criteria

### S1. See what's left

*As a new Owner, I want one place that shows what setup is left, so that I finish it without hunting through my task list.*

- **AC1.1** Given an Owner on the Home overview (`view=overview`), when the Home read reports at least one `COVERAGE_RULES_MISSING` or `TARGET_MISSING` item, then a card titled "Finish setting up" appears above the Today strip at every width.
- **AC1.2** Given the card, when it renders, then it lists exactly two steps in this order: coverage periods, then weekly hour targets. Each shows done or not done.
- **AC1.3** Given the card, when it renders, then a text line states progress ("1 of 2 done") and the existing `.home-progress` bar shows the same share. The bar is `aria-hidden`, as in `Fraction` (`src/components/mobile-home-overview.tsx:6-12`), so the text carries the meaning.
- **AC1.4** Given a step that isn't done, when it renders, then it shows a short reason and a link that names the result and ends with "›" (voice guide). Suggested copy, for the UX writer to confirm:
  - "Set coverage periods ›" with "So NEVORA can spot shifts with too few people."
  - "Add weekly hour targets ›" with "7 employees don't have one yet." The noun comes from the workspace's vocabulary slots (B2 `words.person` / `words.people`), never a hard-coded "employees".
- **AC1.5** Given a step that is done, when it renders, then it shows a check and "Done" on the status ladder (green for done), not teal, and carries no link.
- **AC1.6** Given a Manager, employee or lead, when Home renders, then no card appears and Tasks are unchanged.

### S2. Go straight to the fix

*As an Owner, I want each step to open the page that fixes it, so that I don't have to learn where settings live.*

- **AC2.1** Given the coverage step, when I follow its link, then I land on `/app/schedule/settings`, the `href` the action item already carries (`manager-actions.ts:274`).
- **AC2.2** Given the hour-targets step, when I follow its link, then I land on `/app/schedule/settings`. One step covers all employees; per-employee links stay in the Inbox.
- **AC2.3** Given I fix a step and come back to Home (Back, the Home tab or focus on the tab), when the shared action-center read refreshes, then the step shows "Done" and the count updates, without a page reload.

### S3. Tasks stop repeating setup

*As an Owner, I want each setup gap to appear once on Home, so that my task list shows today's work.*

- **AC3.1** Given the card shows, when Tasks render for the Owner, then Tasks leave out every `COVERAGE_RULES_MISSING` and `TARGET_MISSING` item.
- **AC3.2** Given Tasks without those items, when they render, then the total ("Total tasks"), the category counts, "Review N tasks" on phones, the filter counts, "Showing N of M" and "Show all N tasks" all count the filtered list. No count includes an item the list doesn't show.
- **AC3.3** Given only setup items remained, when Tasks render, then they show the existing calm empty state ("You’re all caught up", "No tasks found in the checked sources.") and the card above still shows what's left.
- **AC3.4** Given the Inbox (`/app/inbox`), when the Owner opens it, then setup items stay under "To review" as today (DESIGN.MD U4). The Inbox stays the complete list.
- **AC3.5** Given `DEADLINE_MISSING` and `AVAILABILITY_MISSING` items, when Tasks render, then they stay in Tasks with their "Setup needed" tag (Q1).

### S4. Honest when the read fails

*As an Owner, I want the card to say nothing it hasn't checked, so that I never think setup is finished when the app couldn't look.*

- **AC4.1** Given the page loads, when the server renders Home, then the card's first state comes from the server-rendered `managerActions` prop (`src/app/app/page.tsx:83`), so the card is in place on first paint and the Today strip doesn't jump down.
- **AC4.2** Given the shared action-center read becomes ready, when it differs from the first state, then the card updates to the ready read.
- **AC4.3** Given the live read is loading, offline, paused, reconnecting or unavailable, when the card already shows, then it keeps its last confirmed steps and links. It never switches to "done" or disappears on a read that failed.
- **AC4.4** Given the server render couldn't read setup (Home shows "Dashboard unavailable", `page.tsx:59`), when the page renders, then no card appears, and none appears until a ready read reports gaps.
- **AC4.5** Given a ready read with zero configuration gaps, when Home renders or refreshes, then the card is gone. No "setup complete" celebration plays: setup isn't on the U7 allow-list.
- **AC4.6** Given the card and Tasks, when I count network requests, then Home makes one action-center request per refresh cycle. The card shares the Tasks read; it doesn't start a second one.

### S5. Reviewers can see it

*As a reviewer, I want the preview to show the card, so that I can check it without a database.*

- **AC5.1** Given `/ui-preview/home` as Owner, when it renders, then the card appears with fictional gaps: coverage periods not configured and some hour targets missing (fixture flags in `src/components/ui-preview/home-fixtures.ts`).
- **AC5.2** Given the preview as Manager, when it renders, then no card appears and the setup items stay in Tasks.
- **AC5.3** Given the preview test (`home-preview.test.tsx`), when the fixture changes, then the test's expected counts change in the same commit.

## 5. States

| State | Trigger | Card | Tasks (Owner) |
|---|---|---|---|
| Hidden, not Owner | Manager, employee or lead | None | Unchanged |
| Hidden, nothing to set up | Ready read, zero configuration gaps | None | Unchanged |
| Showing, first paint | Server props report gaps | Steps from server props | Setup items removed |
| Showing, live ready | Shared read ready | Steps from the live read | Setup items removed; counts filtered |
| Showing, live loading or reconnecting | Shared read in flight | Last confirmed steps | Existing skeleton and "Loading tasks…" |
| Showing, live offline or unavailable | Shared read failed | Last confirmed steps; links still work (each destination page checks again) | Existing "Tasks unavailable offline" or "Tasks unavailable" |
| Hidden, server read failed | "Dashboard unavailable" | None | Not rendered |
| Done | A ready read clears the last gap | Gone on that read | Unchanged |
| Regressed | A new location or employee creates a gap | Back, with the new count | Setup items removed again |

| Cross-cutting state | Requirement |
|---|---|
| Loading | No separate skeleton: the server render places the card |
| Empty | "Hidden, nothing to set up". No empty card |
| Error | The card never claims "done" from a failed read (S4) |
| Offline | As "live offline"; following a link offline shows the offline page |
| Reduced motion | No entrance or exit animation. The bar's width doesn't animate at any setting, matching `Fraction` |
| Keyboard | Card links sit in reading order before the Today strip; each link has a visible focus ring; the card isn't a single large link |
| Screen reader | A section with a heading ("Finish setting up"); progress read as text; each step reads its state ("Done" or the reason) and link name |
| 200% zoom and large text | Steps wrap; the count line and bar stay paired; no sideways scroll at 320 or 720 CSS px. Once phone type moves to `rem` (`prd-phone-foundations.md`), the card follows the root size |
| B1 company brand | Links use the brand action colour within the B1 floors; done marks use the ladder green |

## 6. Out of scope and later

| Item | Why | When |
|---|---|---|
| New setup steps (locations added, team invited, first schedule published, Clocker enrolled, payroll connected) | Not existing checks. Some data is on Home already (`locations.length`, `activeEmployees`), but each step is a new product rule | Q3 |
| A dismiss or "hide for now" control | Hides real configuration gaps; per-device storage | Later, if Owners ask |
| Card for managers | Q2 | After this cycle |
| Removing setup items from the Inbox | The Inbox stays the full list (U4) | Not planned |
| Tours, coach marks, carousels | Rejected (X8) | Not planned |
| A celebration on completion | Not on the U7 allow-list | Not planned |
| Changes to `buildManagerActionItems()`, `/api/manager/action-center` or `parseActionCenter()` | Data contracts stay | Not planned |
| Spanish copy | B5 isn't approved. Write copy that translates cleanly (no string joins around counts) | B5 |

## 7. Dependencies and constants

**Reuse, don't rebuild:**

- `src/lib/assistance/manager-actions.ts`: the four `MISSING_INPUT` types and their `href`s.
- `src/components/manager-action-center.tsx`: `useActionCenter()` (lift it so the card and `ActionCenterSurface` share one read) and `ActionCenterSurface` (accept a filtered item list and compute counts from it).
- `src/components/manager-dashboard.tsx:430-511`: the overview grid, the `role` prop, and `overviewSlots` (add a `setup` slot for the preview).
- `src/app/app/page.tsx:60-112`: server-rendered `managerActions` for first paint.
- `src/components/mobile-home-overview.tsx:6-12` (`Fraction`) and `.home-progress` (`src/components/manager-home-gusto.css:290-291`).
- `src/components/manager-home-gusto.css:355-365`: grid areas for `today` and `tasks`; add a `setup` area that leads at every width.
- B2 vocabulary: `PresentationProvider` and `lower()` from `src/lib/workspace-presentation/words`.
- Preview: `src/components/ui-preview/home-fixtures.ts`, `home-preview.tsx`.

**Dependencies:** none on B5, B6, migrations or the native wrapper.

**Constants touched: none.**

- Navigation: no entry added, moved or renamed. Each step links to an existing URL.
- Teal: links are actions. Done marks use the ladder. The bar reuses the existing teal `.home-progress` (Q5).
- Key action names and script-pinned strings: unchanged. "Open inbox", "Show all N tasks", "You’re all caught up" and the Tasks status lines keep their text.
- Payroll and legal copy: not touched.

## 8. Metrics

Measured on the fictional runtime (owner fixture with coverage periods unset and some hour targets missing) and in the preview.

| Metric | Today | Target |
|---|---|---|
| Taps from Home to the coverage periods page at 390 | Open "Review N tasks", scroll, possibly "Show all", then the row: 2 to 3 taps and a scroll | 1 tap, no scroll |
| Vertical position of the first setup link on Home at 390 | Below the Today strip and This week, inside Tasks | Above the Today strip |
| Setup items duplicated between card and Tasks | n/a | 0 |
| Action-center requests per refresh cycle on Home | 1 | 1 |
| Card shown after a forced failed read with gaps unfixed | n/a | Shows last confirmed steps; never "done" |

**Later, with real use:** days from workspace creation to both steps done, and the share of new Owners who finish setup within their first week.

## 9. Release slices

Each slice ends with a checkpoint: the UI Engineer posts evidence, the Product Designer reviews, and nothing is committed until Jose approves at Checkpoint 3.

| Slice | Contents | Checkpoint evidence |
|---|---|---|
| **1. Shared read and filtered Tasks** | Lift `useActionCenter()`; `ActionCenterSurface` takes a filtered list and filtered counts. No card yet; with no filter applied, the U10 snapshot shows zero diff | Unit tests for count filtering; network check (one request); 156-check sweep; U4 Inbox checks |
| **2. The card** | S1 to S4 on live Home for Owners | Screenshots at 320, 390 and 1440 for: two gaps, one gap, failed live read, zero gaps; axe; keyboard order; 200% zoom; manager view unchanged |
| **3. Preview** | S5 fixtures and test | Preview at 390 and 1440 as Owner and Manager |

## 10. Open questions

| # | Question | Recommendation |
|---|---|---|
| Q1 | Should the weekly "Availability deadline not set" be a card step? | **No.** It resets every week (`schedule_week_settings`), so the card would come back each Monday and setup would never look finished. Keep it in Tasks with its "Setup needed" tag |
| Q2 | Owner only, or managers too? | **Owner only** this cycle, as approved. Managers keep every setup item in Tasks, so they lose nothing. Revisit if managers do setup in real workspaces |
| Q3 | Two steps make a short card. Add steps from data Home already loads (team added, locations added, first schedule published)? | Approve as a follow-up item with its own PRD. Each is a new product rule, even without a new route |
| Q4 | Should phone steps say "Easier on a computer"? | Only for a step whose page the UX Designer finds hard at 390. Scheduling rules has dense forms, so check it at design time |
| Q5 | The existing `.home-progress` fill is teal on a non-interactive bar, which strains P1 ("teal means you can act") | Reuse it unchanged for consistency with This week, and ask the Product Designer to rule on both bars together at Checkpoint 2 |

## Decisions (Jose, 2026-10-17)

- **Q1:** the weekly availability deadline stays out of the card and remains a
  Task.
- **Q2:** the card is for Owners only; managers keep setup items in Tasks.
- **Q3:** extra setup steps (team added, first schedule published) are not part of
  this cycle; propose them as a follow-up.
