# PRD: Phone foundations (type that follows text size, one button shape, selection off teal)

- **Cycle:** 1, PRD step. Written 2026-10-17 by the Product Manager.
- **Approval:** direction item 8 (A9, score 14), approved by Jose at Checkpoint 1 on 2026-10-17 (`docs/product/direction.md`, "Checkpoint 1 decision").
- **Sources:** direction §1.3, §1.4 P1, §3.2 row 8; trends T §2 (larger text row), T §3.3, T §3.10; competitive C §8 (Dynamic Type note); DESIGN.MD U0, U10, D4, Owed testing.
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
9. Release slices and the zero-diff proof
10. Open questions

---

## 1. Summary

Three changes to phone pages, made page by page:

1. **Type in `rem`.** Phone-width font sizes move from `px` to `rem` with the root left at the browser default (100%). At default settings every computed size stays the same, so the default look doesn't change. When a browser or the future store app raises the root size, NEVORA text grows with it and layouts wrap instead of clipping.
2. **One button shape on phones.** Legacy phone buttons (pills, 14px and 20px corners) take the D4 shape already used on desktop: 44px minimum height and 8px corners (`--g-control-radius`).
3. **Selection off solid teal.** The Schedule day picker's chosen day, including "Full week", stops using a solid teal fill, so teal means "act here" again (P1).

Change 1 must produce zero visible difference at default size. Changes 2 and 3 produce intended differences, listed per page before they ship.

## 2. Problem

- **Type ignores text size.** `src/` has about 2,430 `px` font declarations against 56 in `rem` (count on 2026-10-17; T §2 counted 2,272 in `src/app` and `src/components`). The phone tokens are fixed: `--mobile-body: 17px`, `--mobile-caption: 15px`, `--mobile-title: 24px`, `--mobile-card-title: 20px` (`src/app/mobile-workforce.css:13-38`), and the Gusto tokens `--g-t-*` set 28/20/16/14/12px with a 15px phone floor (`portal-gusto.css:27-32`, `:77-80`). A browser that raises its default font size, or a store app that maps the OS setting to the root, changes nothing in NEVORA today.
- **Why it's page by page.** U10 measured that layering the legacy CSS changed 18,033 computed styles on 94 of 96 pages, because the approved look depends on legacy rules out-ranking newer ones (DESIGN.MD U10). `globals.css` alone holds 747 `px` font declarations. A global switch would move the look.
- **Legacy buttons on phones.** D4 fixed button shape on desktop only. On the phone Timecards page, "Refresh timecards" is a pill that wraps to two lines beside a teal pill (`.claude/evidence/d12/phone-app-timecards.png`, direction §1.3). The legacy phone tokens still define `--mobile-pill: 999px` and `--mobile-control-radius: 14px` (`mobile-workforce.css`).
- **Teal used for selection.** The day picker's chosen day is white text on `--design-primary` (`src/app/app/schedule/manager-schedule.css:55`), shown in `.claude/evidence/d6/owner-app-schedule-1920.png`. D4 left it alone on purpose because it is a date chooser; the Product Designer wants it on the ladder now (direction §1.3).
- **It blocks later work.** Dark mode (A16) waits on legacy CSS retirement, and the store app's text-size check (spike question 5) needs `rem` type to have something to scale.

## 3. Users and platforms

| User | What changes for them | How often |
|---|---|---|
| Employee on a phone | Text can grow with their setting once a platform passes it on; one button shape | Daily |
| Manager, Owner on a phone | Same; Schedule's chosen day reads in ink | Daily |
| Low-vision users | Largest gain: no pinch-zoom once the setting reaches the page | Every session |
| Desktop users | No change at any setting. Desktop rules keep `px` this cycle | n/a |
| Clocker kiosk | No change (own shell, `clocker-shell.module.css`) | n/a |

| Platform | What `rem` gives now | What it gives later |
|---|---|---|
| iOS app | No app yet | The shell maps Dynamic Type to the root size (spike question 5) |
| Android app | No app yet | The shell or WebView passes the system font scale (spike question 5) |
| Desktop web | Nothing visible: desktop rules stay in `px` | A separate decision (Q2) |
| Mobile web | Browsers with a default-font-size setting (Firefox, Samsung Internet) now grow phone text. Safari's "Aa" and Chrome's page zoom already scale the page and keep working | Same |
| PWA | Layout ready. iOS standalone has no "Aa" menu, so the OS setting reaches it only through the shell or Q3 | Same as the apps once the shell exists |

Write this plainly in the release notes: until the shell exists, most iPhone users won't see their text grow. The win today is layouts that hold large text, proven on every migrated page.

## 4. User stories and acceptance criteria

"Phone layout" means `max-width: 760px` plus the landscape phone query (`portal-gusto.css:284`); legacy rules at `max-width: 767px` count as phone rules too. "Default size" means a browser default font size of 16px.

### S1. Phone text follows the root size

*As an employee who uses large text, I want NEVORA's words to grow with my setting, so that I can read my shift without pinching.*

- **AC1.1** Given a migrated page in the phone layout at default size, when I compare the U10 computed-style snapshot before and after, then every element's 38 properties match within the noise baseline (timestamp widths, random device ids).
- **AC1.2** Given the same page, when I compare masked full-page screenshots at 320, 375 and 390, then no pixel differs outside the existing masks (times, countdowns, hours meters).
- **AC1.3** Given any slice, when I run the snapshot at 1440, then desktop shows zero differences on every page in the sweep.
- **AC1.4** Given the stylesheets after a slice, when I search them, then no rule sets `font-size` on `html` or `:root` in `px`. The root stays at the browser default.
- **AC1.5** Given a migrated page at 390 with the root at 200% (the same as a 32px browser default), when it renders, then:
  - the page has no sideways scroll;
  - no text element clips or truncates where it didn't at default size (an element's `scrollWidth` doesn't exceed its `clientWidth` on `overflow: hidden` text);
  - no two targets overlap, and each stays 44px or larger;
  - the focus ring stays visible on every control and clear of the sticky header and tab bar (the U10 `scroll-padding` fix holds).
- **AC1.6** Given the root at 200%, when I look at the dense pieces T §3.3 names, then they wrap and stay readable: tab labels (see Q4), Today strip figures, the next-shift pass, Timecards rows and the Employees cards.
- **AC1.7** Given form fields on a migrated page, when the root is at default, then every input's computed font size is at least 16px, so iOS doesn't zoom on focus.

### S2. One button shape on phone pages

*As an employee, I want buttons that look the same on every page, so that the app feels finished and I know what I can press.*

- **AC2.1** Given a migrated page in the phone layout, when the button inventory runs (the D4 inventory script, extended to 390), then every primary and secondary button has a computed `border-radius` of 8px, a height of at least 44px and a single-line label at 320px wherever the label fits on one line at 390.
- **AC2.2** Given phone Timecards (employee and manager), when it renders at 320 and 390, then "Refresh timecards" sits on one line or uses its existing short phone label "Refresh", and its accessible name stays exactly "Refresh timecards" (pressed by `scripts/phase-d-browser-qa.mjs:66,70,82`).
- **AC2.3** Given the exceptions list (section 7), when the inventory runs, then it skips those controls by name and reports everything else.
- **AC2.4** Given a button's label, when the shape changes, then the label text, accessible name, action and position on the page stay the same.

### S3. The chosen day reads in ink, not teal

*As a manager, I want the chosen day to look chosen without looking like a button I still need to press, so that teal keeps meaning "act here".*

- **AC3.1** Given the manager Schedule day picker (`src/components/manager-weekly-roster.tsx:114`) at 390 and 1440, when "Full week" or a day is chosen, then the chosen control has no teal fill and no teal text.
- **AC3.2** Given the chosen control, when I compare it with its neighbours, then at least two cues mark it (for example ink text at weight 600 and a fill or border), and the cue that carries the selection meets 3:1 against the unchosen state (WCAG 1.4.11).
- **AC3.3** Given the picker, when I use it, then `aria-pressed`, the label "Full week" (`manager-weekly-roster.test.tsx:44`), the result summary " · Full week", the 44px targets and the "today" marker behave as before.
- **AC3.4** Given the P1 inventory script at 390 and 1440, when it runs on Schedule, then it finds no teal fill or text on the day picker.

## 5. States

These are page-level checks each slice repeats on the pages it touches.

| State | Requirement |
|---|---|
| Loading | Route skeletons (`src/components/route-skeleton.tsx`) and Home's loading lines keep their shape at default size and grow with the root at 200% without overlapping |
| Empty | `EmptyState` titles and descriptions wrap at 200%; illustrations keep their size |
| Error | "Unavailable" notices and Retry buttons wrap at 200%; no figure appears as 0 |
| Offline | The offline page (`public/fuel-portal-offline.html`) is outside the app CSS; its "Try again" button takes the D4 shape in the slice that touches the shell |
| Reduced motion | No new motion. The day picker's colour transition (`.18s`, `manager-schedule.css:50`) turns off under reduced motion |
| Keyboard | Focus order and ring unchanged; at 200% the ring stays clear of sticky chrome |
| Screen reader | No change to names, roles or headings. The day picker keeps `aria-pressed` |
| 200% browser zoom and 400% reflow | The 81-view zoom run from Owed testing still passes on migrated pages |
| Large root (200%) | AC1.5 and AC1.6 on every migrated page |
| Increased contrast, forced colours | Existing `prefers-contrast` and `forced-colors` rules still apply; the chosen day keeps a visible border in forced colours |

## 6. Out of scope and later

| Item | Why | When |
|---|---|---|
| Desktop type in `rem` | Desktop stays unchanged this cycle | Q2 |
| Spacing, targets and media queries in `rem` or `em` | Targets stay 44px in `px`; growing spacing changes the default look | Later, with the UI Designer |
| iOS Safari and PWA following Dynamic Type through `font: -apple-system-body` | Sets the root to 17px at default, a visible change | Q3 |
| Mapping the OS setting in the store app | Needs the shell | Spike question 5, then the build |
| Deleting legacy CSS files or the 38 aliases | U10 keeps the aliases as the bridge; this PRD retires only the rules each page uses | Later slices, after this PRD |
| `@layer` migration | Becomes a near-zero-diff step only after retirement (U10) | After retirement |
| Dark mode | A16, after legacy CSS retirement | Later |
| Clocker kiosk and sign-in pages | Own shells and approval history | Separate PRDs |
| New type sizes or a new scale | Constants: Inter and the current scale stay | Not planned |

## 7. Dependencies and constants

**Reuse, don't rebuild:**

- Tokens: `--g-t-*` and the phone floor in `src/app/app/portal-gusto.css:27-32,77-80`; `--mobile-*` in `src/app/mobile-workforce.css`; `--g-control-radius`.
- The D4 button standard and inventory script (DESIGN.MD D4).
- The U10 computed-style snapshot, screenshot masks and noise baseline (DESIGN.MD U10).
- The 200% zoom and 400% reflow harness from Owed testing.
- The 156-check sweep and the U1, U2, U3, U4, U8, B3, B4 and D1 to D6 checks.

**Tooling gap.** A search of `scripts/`, `tools/` and `docs/` on 2026-10-17 found no computed-style snapshot script; it isn't committed. Slice 0 either finds it or rebuilds it (Q1).

**Button shape exceptions** (not buttons in the D4 sense, or approved separately): tab bar items, section tabs, the D4 segmented control track and segments, status chips and task tags, the next-shift pass link, the "Close actions" sheet button (Q5), swipe-row backdrops, and anything inside the Clocker kiosk.

**Dependencies:** none on B5, B6, migrations or the native wrapper. The spike's question 5 depends on this PRD: it needs at least slice 1 and one page slice to measure.

**Constants touched: none.**

- Inter and the type scale: sizes stay the same at default; only the unit changes.
- Teal as the action colour: S3 strengthens the rule.
- Targets of 44px or more: kept, and checked at 200%.
- WCAG 2.2 AA, focus ring, reduced motion: checked per slice.
- Payroll and legal copy: no copy changes. Button shape changes on Payroll keep every label.
- Navigation and key action names: unchanged. "Refresh timecards", "Approve revision" and every other script-pinned name in DESIGN.MD U2 and U5 stay exact.
- B1 company branding: each slice runs the sweep under the default brand and one stress brand.

## 8. Metrics

All measured on the fictional runtime in a worktree.

| Metric | Today | Target |
|---|---|---|
| Phone-rule `px` font declarations on migrated pages | Counted in slice 0 per page | 0 on each migrated page |
| Computed-style differences at default size (390, 1440) | n/a | 0 beyond the noise baseline, per slice |
| Pages that pass AC1.5 at a 200% root | 0 (type doesn't respond) | Every migrated page |
| Off-standard phone buttons in the inventory | Counted in slice 0 | 0 on migrated pages |
| "Refresh timecards" lines at 320 | 2 | 1 |
| Teal fills on non-interactive elements (P1 inventory) on Schedule | 1 (chosen day) | 0 |
| Sweep and flow checks | Pass | Still pass |

**Later, with real use:** share of sessions with a non-default root size, and support reports about unreadable text.

## 9. Release slices and the zero-diff proof

### How each page slice proves the default look is unchanged

Every page slice is two reviewable steps on the same branch:

1. **Step A, type to `rem`.** Convert the phone-rule font sizes the page uses (in its own stylesheet and in the legacy rules that reach it), moving them out of legacy files where they belong to the page, as U10 recommends. Run the snapshot at 320, 375, 390 and 1440 against the baseline taken right before the step. **Pass only on zero differences.** Then run AC1.5 and AC1.6 at a 200% root and fix wrap and clip problems. Those fixes must also show zero differences at default size, or they move to step B with a listed reason.
2. **Step B, intended changes.** Apply the D4 button shape (and the day picker change on Schedule). Before the change, the UI Engineer lists every element expected to change and its property. The snapshot diff must match that list exactly: nothing missing, nothing extra.

Each slice ends with a checkpoint: the UI Engineer posts the two diff reports, screenshots at 320, 390 and 1440, and the 200% root screenshots. The Product Designer reviews them. Nothing is committed until Jose approves at Checkpoint 3.

### Slices

| Slice | Pages | Notes |
|---|---|---|
| **0. Baselines and inventories** | All phone pages | Find or rebuild the U10 snapshot (Q1); take baselines at 320, 375, 390, 1440; count `px` font rules per page; run the button and P1 inventories at 390; add a test helper that sets the root to 200%. No user-visible change |
| **1. Shared phone tokens and chrome** | Header, tab bar, More sheets, section tabs, account menu, the finder sheet, offline page button | Redefine `--mobile-*` and the phone `--g-t-*` values in `rem` inside the phone query. Affects every page, so the zero-diff run covers the full sweep |
| **2. Employee Home and My schedule** | `/app` (employee), `/app/schedule` (employee) | Next-shift pass and countdown at 200% |
| **3. Requests** | `/app/requests/hub`, `/app/requests`, `/app/exchange`, `/app/availability` | Both roles |
| **4. Time and pay, employee** | `/app/my-time`, `/app/my-pay`, employee Timecards | Includes "Refresh timecards" (AC2.2) |
| **5. Manager Home and Inbox** | `/app` (manager), `/app/inbox` | Today strip figures, Tasks, swipe rows at 200% |
| **6. Manager Schedule** | `/app/schedule` (manager) and its More menu | S3 (day picker) at every width, plus the phone grid |
| **7. Team and messages** | `/app/employees` and profiles, `/app/updates`, `/app/notifications`, `/app/profile` | |
| **8. Payroll, exports, Insights, Settings** | `/app/timecards` (manager), `/app/payroll*`, `/app/payroll-export`, `/app/reports`, `/app/settings*`, recovery pages | Payroll copy diff must stay empty |

Slices 2 to 8 can run in any order after slice 1. Each ships alone.

## 10. Open questions

| # | Question | Recommendation |
|---|---|---|
| Q1 | The U10 snapshot script isn't in the repo. Rebuild it, and commit it? | Rebuild it in slice 0 as a dev-only script under `scripts/`, run only against the fictional runtime, and ask Jose to approve committing it at Checkpoint 3. Every later CSS retirement needs it |
| Q2 | Should desktop type also move to `rem` (it helps desktop users who raise their browser's default size)? | Not this cycle. Jose approved phone type only, and desktop users rely on the D1 to D6 layout. Propose it as its own item after slice 8 |
| Q3 | Should iOS Safari and the PWA follow Dynamic Type now through `font: -apple-system-body` on the root? | No. At default it sets the root to 17px, which changes the look everywhere. Let spike question 5 compare it with a shell-set root size first |
| Q4 | How far should tab bar labels grow? Five 12px labels at 200% won't fit in 390px | Let them grow to a cap the UI Designer sets (iOS caps tab labels and offers the large content viewer instead). Browser zoom still scales them fully, which keeps WCAG 1.4.4 met |
| Q5 | Does the full-width "Close actions" pill on More sheets take the D4 shape? | Keep the pill. It's a sheet dismiss control, matches HIG sheet anatomy and passed the U10 and Owed testing checks. The UI Designer can overrule |
| Q6 | The phone primary button height: 44px (D4 desktop) or 48px (the current `min-height: 48px` on phone menu items)? | 44px minimum, matching D4, with the UI Designer free to use 48px for full-width primary buttons on phones |

## Decisions (Jose, 2026-10-17)

- **Q1 approved:** rebuild the U10 computed-style snapshot script and commit it as
  a dev-only tool. The originals are `u10-styles.mjs` and `u10-compare.mjs` in the
  main session's scratch folder; the UI Engineer adds it in the baseline slice.
- **Q2:** desktop type stays in px this cycle; only phones move to rem.
