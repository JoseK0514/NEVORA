# 28 Senior Frontend Architect — structure of src/components and src/app (Owner/Manager app)

## Verdict
The v3 screens rest on code built up over several design phases (premium, wave A/B/C, gusto, clean), and the earlier layers are still in place. The pure logic in `src/lib` is well tested. The structural risk is in a few very large client components that change often and carry both the manager and the employee path. Timecards and Inbox each had about 30 commits this month. The same reading code, formatting code and button markup are copied across 20 to 30 files, and a lot of the old design's code is never used. Fixing this needs no redesign. Deleting dead code and adding shared hooks first makes every later v3 change cheaper and safer. Do it after the release freeze, except step 1 below.

## Recommendations

1. **Split `Timecards` into one read hook and two views, and write the approve/finalize/reopen rules once.**
   *Why:* `src/components/timecards.tsx` is one 59 KB function (517 lines, the longest 799 characters, 24 lines over 300 characters). It has 21 `useState`, 11 `useRef`, 5 `useEffect` and 35 `manager` branches, and the fetch, abort, expiry and 401/403 handling sit inline (lines 122–140). The Approve, Finalize, Reopen and Retry buttons are written three times, and their disabled conditions already differ:
   - the detail sheet (396–402) uses `locked||own||…`;
   - the row (465–478) uses `busy||!!pending||!!outcomes||own||…`;
   - a third copy (499–511) sits inside the `manager?null:<HoldHeight…>` employee branch (488), so its `manager?` ternaries (493, 499, 500) are always false. That is dead code.
   The issues block is also copied (sheet, row details, employee card). The page already sends the two roles different props and wrappers (`app/app/timecards/page.tsx`).
   *Do:* create `useTimecardsRead(period, actorId)`, a pure `timecardActionState(item, ctx)` that returns `{approve, finalize, reopen}` with an enabled flag and a reason for each, one `<TimecardActions>` and one `<TimecardIssues>`. Then build `ManagerTimecards` and `EmployeeTimecards` on top, and drop `employeeCorporate` and the `corporate?` class concatenation from the manager file.
   *Impact:* High. *Effort:* M. *Owner:* UI.

2. **Give every live-data component one shared lifecycle hook for private reads, and share one read between Home, Inbox and the tab badge.**
   *Why:* `src/lib/private-snapshot-client.ts` (`createPrivateSnapshotController`) is a good primitive, but only 9 components use it. The rest hand-roll the same logic:
   - 20 component files register their own `pagehide`/`pageshow`/`focus`/`online` listeners (for example `clean/use-clock-monitor.ts`, `reports.tsx`, `payroll-export.tsx`, `timecards.tsx`, `payroll/use-payroll.ts`).
   - 24 check `visibilityState` and 18 hand-roll the 401/403 handling.
   - `useToday()` (`manager-today.tsx:11`) is a hook, not a provider, so Home and Inbox each poll their own copy.
   - The tab badge reads a separate endpoint (`use-inbox-count.ts:23`, `/api/manager/inbox-count`) from the Inbox list (`/api/manager/action-center`), so the badge and the list can disagree between polls.

   *Do:*
   - Add `usePrivateSnapshot(request, parse)` in `src/hooks/`, which wraps the controller and the listener wiring, and migrate the hand-rolled readers one per PR.
   - Mount Today and the action-center read once in the manager shell, as a provider.
   - Have Codex derive the badge count from the same observation, or return the count with it.

   *Impact:* High. *Effort:* M. *Owner:* UI, plus Backend for the count.

3. **Delete the dead code left by older designs, and add `knip` to CI so it stays gone.**
   *Why:* All of the following is unused in production:
   - **16 component modules with no production importer (about 60 KB):** `generation-explanation-panel`, `manager-reviewed-views`, `employee-shift-picker`, `activity-history-panel`, `mobile-home-overview`, `manager-week-overview`, `time-clock-widget`, `manager-action-list`, `location-configuration-fields`, `clocker-pin-icon`, `timecards-heading`, `payroll-export-motion`, `shift-slot`, `employee-directory-motion`, `brand-lockup`, `page-header`. Several are imported only by tests.
   - **Unused exports in live files:**
     - `ManagerActionCenter`;
     - `ActionIntelligenceSurface`, used only by the dead `manager-reviewed-views`;
     - `ManagerTodayTiles` and `MissedPunches`;
     - the kit's `KitPage`, `KitContent`, `IconButton`, `NextUp`, `Money`, `Duration`, `ActionBar` and `Toast`, which are used only by `kit-preview` or tests.
   - **Unused props:**
     - `homeWeek()` computes `PremiumHomeProps.week` on every render (`manager-dashboard.tsx:180–188`), and `greeting` is passed as well, but `PremiumHomeSurface` reads neither.
     - `overviewSlots.today/actions/activity` are ignored by `PremiumOverview` (`manager-dashboard.tsx:198–200`). Even so, `/ui-preview/home` builds the old `ActionCenterSurface`, `TodayTilesSurface` and `ClockMonitorCard` into those slots (`ui-preview/home-preview.tsx:123–127`), and those builds are the only thing keeping that code alive.
   - **Old Home CSS:** `manager-dashboard.tsx` still imports `manager-home.css`, `manager-home-gusto.css` and `manager-home-mobile.css`, although its own comment says the old Home is "deleted, not restyled".
   - **globals.css:** about 508 of its 852 class selectors (60%) do not appear in any TS/TSX. This is a substring heuristic, so verify it before deleting.

   *Impact:* High. Every later refactor touches less code. *Effort:* S–M. *Owner:* UI.

4. **Make the kit the real component API, and merge the three parallel kits into it.**
   *Why:* `kit/kit.tsx` `Button` (line 254) has no `onClick`, `disabled`/pending, `aria-label`, `name`/`value` or `form` support. As a result:
   - the code has 86 raw `button primary/secondary` class strings and 129 raw `nv-btn` usages, against 8 uses of `<Button>`;
   - 19 files hand-write `nv-row` markup;
   - Inbox has to re-implement Row as `KitRow` (`manager-inbox.tsx:58`) to add selection;
   - 5 files roll their own `<dialog>`/`showModal` sheet.

   There are also three parallel kits:
   - `wave-a/parts.tsx`: `Notice`, `Field`, `Fact`;
   - `app/app/settings/wave-c-kit.tsx`: a second `Notice`, `Fact` and `EmptyState`, besides `components/empty-state.tsx`;
   - `wave-b-forms.tsx`: an `ActionForm`, besides `wave-a/action-form.tsx`.

   *Do:* extend, without breaking anything:
   - give `Button` `onClick`, `pending`, `disabled`, `label` and form props;
   - give `Row` `selected`, `onSelect` and `as`;
   - add `Sheet` (one dialog/sheet with the iOS gestures), `Segmented`, `Field`, `Notice` and `EmptyState`.

   Then migrate one page at a time and delete the wave kits.
   *Impact:* Medium–High. *Effort:* M. *Owner:* UI.

5. **Create one formatting module (`src/lib/format/`) for dates, times, hours, plurals, initials and breakpoints.**
   *Why:* The same formatting is rewritten across files, and some copies disagree:
   - `new Intl.DateTimeFormat` appears 75 times in 33 component and page files, and `'en-US'` is hard-coded 93 times. The Spanish users in the brief cannot be served while locale is a literal in every file.
   - `initials()` is copied 10 times, with different behaviour. `manager-weekly-roster.tsx:39` splits on `" "` and does not uppercase. `availability-team-list.tsx:34` does not filter empty parts or uppercase. The others uppercase. The same person can get different avatar letters on Schedule and on Home.
   - `clock`, `stamp`, `dateLabel` and `plural` are re-declared in `premium-home`, `manager-inbox`, `reports`, `timecards`, `employee-*` and others.
   - The phone media query string is copied 3 times (`timecards.tsx:90`, `command-finder.tsx:16`, `clean/top-bar-slot.ts:15`).

   *Impact:* High (correctness, and a prerequisite for Spanish). *Effort:* M. *Owner:* UI.

6. **Keep `page.tsx` files thin: authentication and a role switch only, with loaders and views in their own files.**
   *Why:*
   - `app/app/schedule/page.tsx` is 443 lines and 31 KB with 52 imports. It mixes the employee marketplace claim checks (173–205) with the manager view-model mapping (260–317) and rendering.
   - `exchange/page.tsx` is 22 KB.
   - `app/app/page.tsx` loads the full dashboard (`daySummaries`, `hourRows`, locations) for the overview, although Home now reads only `managerActions`, `firstName` and `timeZone`.
   - `ManagerDashboard` takes a 27-field `Props` bag that is spread into every tab (`manager-dashboard.tsx:229, 236`).

   *Do:* move the code into `schedule/_manager/{load.ts,view.tsx}` and `_employee/…`, and add per-view loaders. Codex owns the loader split.
   *Impact:* Medium (performance on Home, reviewability). *Effort:* M. *Owner:* UI, plus Backend.

7. **Split `AppShell` by audience, and replace the shell DOM lookups with a React slot context.**
   *Why:* `app-shell.tsx` (28 KB) branches on `employee` 41 times. The v3 shell (`data-nv-clean`, `cm-org`, Add shift, the command finder) and the older employee shell share one component. Pages also reach into the shell through the DOM:
   - `useTopBarSlot` (`clean/top-bar-slot.ts:27–31`) runs `document.querySelector('.app-shell[data-nv-clean] .mobile-header')` and `insertBefore`;
   - the shell measures itself through `querySelector` (`app-shell.tsx:142–147`);
   - 15 `querySelector` calls in all depend on shell class names.

   A CSS class rename can break this without any type error.
   *Do:* create `ManagerShell` and `EmployeeShell` that share the navigation model, and a `ShellSlots` context that exposes portal targets through refs.
   *Impact:* Medium. *Effort:* M. *Owner:* UI.

8. **Stop deriving data from English display strings, and ask Codex for structured fields.**
   *Why:*
   - `gapLocation` (`premium-home.tsx:191`) and `gapPlace` (`manager-inbox.tsx:192`) are duplicates. Both parse the location out of `item.title` with `/\bat (.+)$/`, which breaks on Spanish titles or on place names that contain " at ".
   - `reports.tsx:52` `requestTone` guesses the tone from status text with regexes.
   - Live helpers such as `mobileActionDetail` still live in the mostly dead `manager-action-center.tsx`.

   *Do:* have Codex add `locationName` to `ActionItem`, then move the presenters into `src/lib/action-center/present.ts`.
   *Impact:* Medium. *Effort:* S. *Owner:* Backend, then UI.

9. **Name files by domain, not by project phase, and give `src/components` folders.**
   *Why:*
   - `src/components` has 155 non-test modules in one flat folder.
   - Many names describe the project phase, not what the file is: `premium-home.tsx` (the v3 Home), `wave-a/`, `wave-b-forms`, `wave-c-*`, `*-reviewed`, `clean/`, `manager-home-gusto.css`, `portal-gusto.css`.
   - v3 pages still carry `premium-legacy-page` (for example `timecards/page.tsx`: `employee-view premium-legacy-page nv-page cm-page cm-timecards`).
   - `layout.tsx` imports 15 global stylesheets whose order matters.

   *Do:* use the target layout below. Rename last, mechanically, one feature per PR. Note that `vi.mock` paths in `self-service-guards.test.ts` hard-code component paths.
   *Impact:* Low–Medium. *Effort:* M. *Owner:* UI.

10. **Add guardrails before the refactors: Prettier, size warnings, `knip`, and comments that explain behaviour instead of quoting QA tickets.**
    *Why:*
    - Two code styles coexist: dense one-liners in `timecards.tsx` and `reports.tsx`, and Prettier style in `manager-inbox.tsx`, but the repo has no Prettier config.
    - There are 114 QA-ticket comments (for example "r4 QA", "IS-P4-17", "ST-P4-03", "Final pass P2-7"). They record history in the code instead of explaining behaviour.
    - Nothing warns when a component grows past a reasonable size.

    *Do:* add Prettier and run it as a format-only commit per file just before that file is refactored, not as one big reformat. Add ESLint `max-lines`/`complexity` as warnings, and add `knip`.
    *Impact:* Low (it enables the steps above). *Effort:* S. *Owner:* UI.

### Target structure
```
src/ui/kit/          Button, Row, Card, Sheet, Segmented, Field, Notice, EmptyState, Status, Avatar (one kit, nv-)
src/ui/shell/        ManagerShell, EmployeeShell, ShellSlots context, nav model adapters
src/hooks/           usePrivateSnapshot, useMedia(PHONE|WIDE|DESK), useUrlParam (Inbox filter/item), useReducedMotion
src/lib/format/      dates, times, hours, plural, initials, locale (en/es)
src/features/<home|inbox|schedule|timecards|reports|requests|settings|payroll>/
    manager/  employee/  shared/   (each: *Live container, *Surface presentation, pure view-model + tests)
src/app/app/<route>/page.tsx   auth + role switch + loader call only
```

### Safe refactor order
1. Add guardrails: `knip`, ESLint warnings, and characterization tests (`renderToStaticMarkup`) for the manager and employee Timecards and for Inbox. Delete the dead code from rec. 3, checked with typecheck and the tests. This is low risk and the only step that suits the release freeze.
2. Create `src/lib/format` and one `initials()`. These are pure functions, so unit tests cover them.
3. Add `usePrivateSnapshot`, then migrate Reports, then Payroll export, then the others, one per PR.
4. Grow the kit additively (Button, selectable Row, Sheet), then migrate call sites page by page and delete the wave kits.
5. Split Timecards (rec. 1), building on steps 3 and 4.
6. Add the shared Today and action-center provider and a `useNeedsYou` selector for Home and Inbox, plus the badge-count change with Codex.
7. Split the shell and add the slot context.
8. Split the pages (Schedule, Exchange) and the Home loader, with Codex.
9. Move folders and rename files, as the last step.

## What's good
- The container/presentation split is already the pattern: `PremiumHomeLive`/`PremiumHomeSurface` and `ManagerInbox`/`InboxSurface`. It is what makes the fictional preview and the static-markup tests possible. Extend it rather than invent something new.
- The domain logic is pure and tested in `src/lib`: `action-center/needs-you`, `inbox`, `present`, `timecards/reviewed-batch`, and `private-snapshot-client`, which handles stale snapshots and expiry carefully. `retired-views.ts` cleanly redirects old URLs.
- The kit is small, documented and accessible by default: `Status` is a glyph plus a word, `Button` has `blockedReason`, `Card` gets landmark labelling. The API only needs to grow, not change.

## Not checked / limits
- No browser use, no `next build`, and no bundle-size or render-profiling numbers. The client cost of GSAP (16 importers) and the 15 global stylesheets is inferred, not measured.
- The dead-CSS share (60% of globals.css selectors) is a substring heuristic and may include false positives from class names built at runtime.
- "No production importer" was checked against static imports plus a name search. Dynamic `import()` built from strings could hide a use, so confirm with `knip` before deleting.
- The employee and Lead components were looked at only where they share a file with Owner/Manager code. No tests were run.
