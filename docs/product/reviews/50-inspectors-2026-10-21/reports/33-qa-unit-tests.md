# 33 QA Engineer (automated tests): the vitest suite against the Owner and Manager v3 code

**Verdict.** The suite is large and its privacy-lifetime tests are strong (Reports R01–R16, Timecards batch approval). The v3 rebuild added code much faster than it added tests, though. Since the first `clean-manager` commit (9ad15dd6), 1,723 lines of component code and 2,411 lines of CSS came in, but only 197 lines of tests. Most of the tests that do exist compare static SSR markup strings. That leaves v3's interactive behaviour untested: filters writing the URL, the phone sheet, Mark read, the top-bar portal, the Schedule day handoff and focus return. There is no DOM test environment in the repo at all.

## Evidence summary

| Changed in v3 (since 9ad15dd6) | Code +/− | Test lines added | What the tests actually do |
|---|---|---|---|
| `src/components/timecards.tsx` | +263/−6 | +20 | A hand-written hook emulator runs **only the first effect** (`timecards.batch.test.tsx:23` `cleanup=host.effects[0]()`). The v3 effects never run in a test: keyboard/pointer at `timecards.tsx:222`, the phone query at `:230`, `useTopBarSlot` at `:236` and the sheet dialog at `:237`. |
| `src/components/reports.tsx` | +212/−49 | +3 | The privacy lifetime is well covered (48 tests). The v3 top-bar portal copy of Export and the stepper is never rendered, because `top-bar-slot.ts:13` returns early when `matchMedia` is missing. |
| `src/components/manager-inbox.tsx` | +203/−71 | +5 | 8 static-markup tests. None exercise `choose()` (URL `?filter`, `:276-281`), row selection and the sheet (`:300-309`), pause closing the sheet and dropping `?item` (`:284-290`), the Refresh/"Refreshing…" state (`:458-461`), Escape/Shift+Tab back to the row (`:486-497`) or focus recovery (`:325-336`). |
| `src/components/manager-weekly-roster.tsx` | +197/−169 | +4 | Static markup only. The week-strip day choice, "Show N more", Full week and the `cm-schedule-day` event (`:102`) are untested. |
| `src/components/premium-home.tsx` | +170/−200 | 0 | **Nothing tests `PremiumHomeSurface` directly.** It is only reached through `ManagerDashboard`, for the loading line (`manager-dashboard.test.tsx`) and the preview's "Needs you" and "Updated" text (`home-preview.test.tsx`). Untested: `NeedsYouCard` rows and hrefs (`:159`), `PeopleCards` monitor-vs-shift fallback and count (`:219`), "Show N more" (`:246`), `ShiftTimeline` (`:253`), every `PendingCard` state (`:284`), and the rule that holds the count until Today is in (`:101`). |
| `src/components/clean/*` (6 files, 174 lines) | new | 0 | Only `WeekSummary` is rendered (once). `useTopBarSlot`, `TopBarTools`, `DayAwareLink`, `useClockMonitor` and `RequestPagesNav` have no unit tests of their own. `RequestPagesNav` only shows up in the `app-shell` markup. |
| Updates (manager) / Notifications (manager) | +77 / +69 | +40 / +19 | Markup "pins" in every state. Clicking a filter (`employee-updates.tsx:35-50`) and Mark read (`notification-inbox.tsx:40`: gate, pending label, success and failure notices) are never clicked. `EmployeeAccountPanel`'s POST, headers, refresh and `nevora:notifications-changed` dispatch (`employee-account-panel.tsx:52-54`) are untested. |

Other measurements:
- `package.json` has no jsdom, happy-dom or `@testing-library/*`, and `vitest.config.mts` sets no environment. All 128 component test files therefore run in Node, either with `renderToStaticMarkup` (98 files) or with **hand-written React hook emulators that `vi.mock('react')`** (10 files, including `timecards.batch`, `report-lifetime` and `employee-account-panel-lifetime`).
- Production code has test-only guards ("A test document without querySelector…" at `top-bar-slot.ts:13`, `timecards.tsx:231`). As a result the desktop and phone paths can't run in tests.
- There are 160 raw-HTML assertions (`toContain('<…')` and `toMatch(/<…/)`). Examples:
  - `manager-inbox.test.tsx:28`: `'<span class="inbox-action" aria-hidden="true">Review time off</span>'`
  - `employee-updates.test.tsx:69`: exact ICU output `Oct.11,.2026,.10:00.PM`
  - `employee-account-panel.test.tsx:36`: a regex over the `</a><button class=…>` sibling sequence

  These fail on a class rename or a Node ICU update, yet they pass when CSS hides the element. Many negatives (`not.toContain('<form')`, `not.toContain('id="inbox-urgent"')`) would pass vacuously if the subtree stopped rendering.
- No coverage tool is installed (no `@vitest/coverage-*`), and there are no snapshot tests.
- **The flaky `src/test/phase-e-process.test.ts`:**
  - Logged failure: `retained Linux marker observation: recycled-birth`. The test expected status 1 and got 0, with `elapsedMs: 3756` and `departureTriggered: false`, during a run with 465 parallel workers (`…/8c7acfe8…/scratchpad/p3/vitest-tc.log`).
  - Cause: the test races real processes against fixed wall-clock windows. The worker changes its title at 800 ms, the child kills everything 2,000 ms after registration, the supervisor times out at 3,500 ms and the departure fires after more than 600 ms. Earlier cases use 750/1,250 ms budgets and assert `title.changedAt < fixtureStartedAt + 1250`. Under load, the supervisor's `ps` polls can miss the roughly 1.2 s window.
  - **I ran it 3 times on its own and 4 times concurrently: 12/12 passed each time (17–19 s).** It fails only under full-suite parallel load. CI runs `npm test -- --maxWorkers=1` (`.github/workflows/ci.yml:36`), so the flake hits local runs (Claude/Jose), not CI.
  - It is also the slowest file I timed, at about 17 s.
- All the target files pass right now: inbox 8, roster 8, dashboard 3, home-preview 4, timecards.batch 19, report-lifetime 48, employee-updates 8, account-panel 6, needs-you 6.

## Recommendations

1. **Add a DOM test tier.** Use a vitest `projects` entry, `*.dom.test.tsx`, with `environment: 'happy-dom'` or `'jsdom'`, plus `@testing-library/react` and `user-event`, and use it for v3 interaction tests. Keep the existing Node SSR tests as they are.
   - *Why:* v3 behaviour lives in effects, `matchMedia`, `history.replaceState`, `<dialog>`, portals and focus. The suite can't run any of these, so the code carries test-only escape hatches (`top-bar-slot.ts:13`, `timecards.tsx:231`). The hook emulators skip effects (`timecards.batch.test.tsx:23` runs only `effects[0]`) and break if hook order changes.
   - High · M · UI (the dev dependency needs Jose's OK).
2. **Write the 10 tests below, in order.** Start with 1–4: Inbox, Home, Mark read and the top-bar portal.
   - *Why:* these are the v3 surfaces with the most new code and zero behaviour tests (table above).
   - High · M · UI.
3. **Take `src/test/phase-e-process.test.ts` out of the default unit run.** Give it its own config or fold it into `test:release-engineering`. Replace the fixed timers with handshake files: the child should wait for an "observed-changed" acknowledgement from the supervisor before it closes. Until then, run it with `--maxWorkers=1`.
   - *Why:* the logged failure is timing-only (`elapsedMs 3756` under 465 workers). It never failed in 7 runs here. It costs about 17 s per run, and a red local `npm test` teaches people to ignore failures.
   - High · S–M · Backend (Codex owns the phase-e runner).
4. **Replace raw-markup pins with role, text and attribute queries.** In SSR tests, parse the HTML once (`new DOMParser()` in the DOM tier, or a small `query(html, selector)` helper) and assert `getByRole('button', {name})`, `aria-pressed`, `href`, and so on. Pair every `not.toContain` with a positive anchor in the same subtree. Format dates in assertions with the same `Intl` call the component uses instead of literal ICU strings.
   - *Why:* 160 raw-HTML assertions. Examples are cited above.
   - Medium · M · UI.
5. **Fix and guard the duplicate `id="inbox-detail-title"` on phones.** When the sheet is open below 1024 px, `ItemSheet` (`manager-inbox.tsx:465`) and the side-column `InboxDetail` (`:467`) both render an `h2#inbox-detail-title` (`:500`). Focus at `:521` and Shift+Tab at `:489` work only because the sheet comes first in DOM order. Render the pane only when `wide`, or give the sheet its own id. Then add a "no duplicate ids" assertion to every v3 surface test.
   - *Why:* found by reading the code. A one-line DOM-tier test would have caught it.
   - Medium · S · UI.
6. **Extract and unit-test the pure Home and Roster rules.** For Home: the working-now count (`premium-home.tsx:219`), the timeline axis and tick math (`:253-270`), `gapLocation` (`:191`) and `locationCounts` (`:152`). For the roster: the day lists (`manager-weekly-roster.tsx:108-110`), including where an overnight shift appears.
   - *Why:* this logic decides the numbers a manager acts on. It's buried in JSX, so nothing tests it.
   - Medium · S · UI.
7. **Add `@vitest/coverage-v8`,** reported for `src/components/**` and `src/lib/**` with no threshold at first. After that, set a floor on new and changed files only.
   - *Why:* there's no coverage tooling today. The gaps in the table above had to be found by hand-grepping.
   - Medium · S · UI.
8. **Test the `cm-schedule-day` contract between `ManagerWeeklyRoster` and `DayAwareLink`.** It is an untyped window event between two sibling trees (`manager-weekly-roster.tsx:102`, `day-aware-link.tsx:11`). It works only if the link subscribes before the roster's mount effect fires. Give the event name and payload one shared constant and type.
   - *Why:* a refactor that reorders the header and the roster would quietly make Add shift ignore the chosen day.
   - Medium · S · UI.
9. **Commit a small v3 browser regression spec to the repo.** Cover Home, Inbox, Schedule, Timecards, Updates and Notifications for Owner and Manager at 390 and 1440 px. Check one h1, no horizontal scroll, no duplicate ids, the sheet opens and closes, and focus is visible after Tab. The spec can reuse the QA probe logic.
   - *Why:* all v3 QA evidence and probes live in `/tmp` scratchpads. `scripts/` has no clean-manager spec, and the 2,411 new CSS lines have no automated guard.
   - Medium · M · UI.
10. **Fix the stale doc comment.** `clean/top-bar-tools.tsx:6` says "1180px and wider", but `top-bar-slot.ts:16-20` uses 1300 px, scaled by the text size. Pin the 1300 px and 200%-text rule in test 4 below.
    - *Why:* the comment and the code disagree. The CSS that hides the in-page copy (`schedule.css:289`, `updates.css:42`) depends on `data-cm-topbar`.
    - Low · S · UI.

### The 10 most valuable tests to add (ranked)

1. **Inbox interaction (DOM tier, `InboxSurface`).**
   - Clicking the Requests filter sets `aria-pressed`, and `replaceState` writes `?filter=requests`; All removes the param.
   - A plain click on a row: narrower than 1024 px opens the `<dialog>` and sets `?item=`; at 1024 px or wider it moves focus to the pane title. A meta-click is not intercepted.
   - `connection → 'paused'` closes the sheet and drops `?item`. Done closes the sheet and drops `?item`.
   - Escape in the pane returns focus to the selected row.
2. **The Home `PremiumHomeSurface` state matrix (SSR is enough).**
   - Actions ready and Today null: no count shows (`:101`).
   - Today unavailable: the count shows, plus "Couldn't load everything".
   - Offline beats loading. `access_lost` shows Sign in → `/login`.
   - `setupHoldsItems` removes setup items from the count.
   - Needs you rows link to `?filter=now` and `?filter=requests`, with the right `aria-label`s.
   - Working now prefers monitor rows over shift rows, and the count fallback (`:219`) holds.
   - More than 4 shifts later today shows "Show N more" → `/app/schedule`. The timeline renders only when there are shifts.
3. **Notifications Mark read (DOM tier).**
   - A click shows "Marking read…" and disables the other buttons. A double click calls `onMarkRead` once.
   - Success and failure each show their notice.
   - `EmployeeAccountPanel` POSTs `/api/notifications/read` with `X-Nevora-Notification-Read` and the employee-view authority header. A non-2xx response throws. Success refreshes and dispatches `nevora:notifications-changed`.
4. **`useTopBarSlot` / `TopBarTools` (DOM tier, `matchMedia` stub).**
   - At 1300 px or wider, it portals into `.app-shell[data-nv-clean] .mobile-header` before `.mobile-header-actions` and sets `data-cm-topbar="1"`.
   - At 200% root font size it needs 2,600 px.
   - Narrower, children render inline and the flag is `"0"`.
   - Unmount removes the slot element. The `phone` flag follows the phone query.
5. **Timecards v3 effects.** Run all effects, not only `effects[0]`.
   - Opening a card on a phone calls `showModal`.
   - A window blur, actor change or expiry closes the sheet and leaves no `PRIVATE` text in the dialog.
   - The top-bar copy of the stepper and Export retires along with the page.
6. **Reports top-bar Export.** With the slot present, the portaled Export and stepper are disabled or removed under the same R01, R06 and R13 retire events as the in-page copy. Portaled DOM isn't part of today's `html()` assertions.
7. **Schedule day handoff.**
   - Render `ManagerWeeklyRoster` and `DayAwareLink` together. On mount, Add shift's `href` carries `date=<today>`.
   - Tapping Thursday in the week strip changes it to Thursday's date.
   - `reviewDay` wins. The rest of the query (`week`, `l`) is kept.
8. **Updates manager filters (DOM tier).**
   - Required and Reviewed narrow the list and set `aria-pressed`. Each filter's empty state has its own title, and its button resets to All.
   - Refresh shows "Refreshing…" until `observedAt` changes, and a second click is ignored.
9. **Inbox Refresh and focus recovery.**
   - Refresh while ready shows "Refreshing…" with `aria-disabled`, and the `role=status` text is announced.
   - When the list goes away with focus on `body`, focus moves to `.inbox-status-message`. When it comes back, focus lands on the selected row or the first heading, but not on the very first load (`:325-336`).
10. **v3 surface hygiene sweep.** One parametrised test renders Home, Inbox (ready, loading, empty), Roster, Updates and Notifications in their manager modes. On each it asserts one `h1`, unique ids, every `aria-labelledby` and `aria-controls` resolving to a single element, and no positive `tabindex`. It's cheap and catches recommendation 5's class of bug everywhere.

## What's good
- The privacy-lifetime tests are excellent. `report-lifetime.test.tsx` (48 tests: blur, print, expiry, stale bodies, export blobs) and `timecards.batch.test.tsx` (selection, confirmation, partial and unknown outcomes, retry identity) test real behaviour with controlled time and fetch.
- Pure domain logic sits in `src/lib`, with focused tests: `needs-you.test.ts`, `inbox.test.ts`, `manager-roster-presentation`. Home and Inbox share one counting rule that is tested in one place.
- The negative safety assertions are deliberate and useful: no Approve or Decline in the Inbox pane, no forms, nothing private after a pause. They need a positive anchor beside them (recommendation 4).

## Not checked / limits
- No full suite run, per the brief. I could not reproduce the `phase-e-process` flake: 3 runs on its own and 4 concurrent runs all passed. The cause comes from the logged failure and from reading the code.
- No coverage numbers, since no coverage tool is installed. "Untested" here means no test imports or renders that path, found by grep and by reading the code. No mutation testing was run, because the repo is read-only.
- I did not open the browser, so the duplicate-id finding (recommendation 5) is from reading the code. I didn't confirm whether the hidden pane is `display:none` at phone widths.
- I didn't review the integration configs (`vitest.*-integration.config.mts`), the Postgres tests or the `scripts/*-ui-qa.mjs` browser suites in depth.
