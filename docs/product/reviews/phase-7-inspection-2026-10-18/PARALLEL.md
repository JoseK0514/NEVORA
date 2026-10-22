# Parallel sessions: shared brief

October 19, 2026. Jose's bar for demanding clients is every page, every role, every state, every device, with no lowering of it. To finish faster, the work is split into chats that run at the same time. Each chat has its own worktree, preview, database and five inspectors. Read this whole file before you start, then `PLAN.md` ("Revised plan, October 19"), `BRIEF.md` and `PHASE-3-BRIEF.md` in this folder.

## Sessions and what each one owns

Every session starts from branch `claude/premium-phase-1` at the commit that added this file's stylesheets. It works on its own branch in its own worktree. **Edit only the files your session owns.** If you need a change in a file you don't own, ask the coordinating session by message. Don't edit it yourself.

| Session | Pages | Files it owns |
|---|---|---|
| **Coordinator** (the original chat) | Phase 3: every Employee and Lead page; groundwork | `src/components/kit/*`, `src/app/app/portal-premium.css`, `layout.tsx`, `root-loading.tsx`, every employee and lead component, `src/lib/keep-whole.ts`, `src/lib/duration-text.ts` |
| **Profile** | A new Profile page for Owners and Managers (name, contact, role, locations, notification settings, My pay, Sign out), the same layout as the employee Profile | New components you create for it; in `src/app/app/profile/page.tsx`, only the role check at the top; `premium-profile.css` |
| **Wave A** | Add shift, Edit shift, Coverage, Copy-week receipt; the full Time-off list for managers (keep the single-request review at zero); Shift requests and Availability for managers; Team member detail; New employee; Clocker PIN; the employee Swap and "Unable to work" forms | `src/app/app/schedule/{new,edit,coverage,copy-receipt}/*` and their components; `manager-time-off.tsx`; the manager branch of `exchange/page.tsx` and `availability/page.tsx`; `availability-team-list.tsx`; `exchange/swap/*`, `exchange/callout/*`; `employees/[employeeId]/*`, `employees/new/*`; `premium-wave-a.css` |
| **Wave B** | Insights, Templates, Scheduling rules, Update detail, Compose, Payroll settings, Payroll runs for managers | `reports/*`, `schedule/templates/*`, `schedule/settings/*`, `updates/[id]/*`, `updates/compose/*`, `settings/payroll/*`, the manager parts of `payroll/*` and their components; `premium-wave-b.css` |
| **Wave C** | The Settings hub and every Settings page (Company profile, Locations list, detail and new, Branding, Features & words, Company policies, Break types, Positions, Clocker devices), Account recovery, Clocker recovery | `settings/*` except `settings/payroll`; `account-recovery/*`; `clocker-recovery/*`; and their components; `premium-wave-c.css` |
| **Desktop (Phase 4)** | The desktop layout (768–1440) of the pages built in Phase 2: Home and its views, Inbox as list and detail, Schedule, Team, Timecards, Payroll, Time exports; the sidebar ("Team"); Requests folded into Inbox with `/app/requests` still working | `app-shell.tsx` (desktop sidebar only), `navigation.ts`, `portal-desktop.css`, `premium-desktop.css`, `premium-home.tsx`, `manager-inbox.tsx`, `manager-dashboard.tsx`, and other manager-only components. A component that employees also use (for example `timecards.tsx`) is the coordinator's; ask. |

Each wave builds **phone and desktop together** (320 to 1440), so each page is built and inspected once. Spanish comes later, in one pass over every page.

If a shared file genuinely needs editing by two sessions, the session that doesn't own it describes the change in a message. The coordinator applies it and tells everyone.

## Codex owns the backend

Don't change server code: no route handlers, server actions, SQL, `src/lib/data/*`, auth, payroll calculations, notification or email delivery. Build the UI against today's server behaviour. Where a page needs data the server doesn't give, build against a written contract and a fixture. Write the contract in `docs/product/specs/<your-session>/CODEX.md`. That item is set aside for joint testing with Codex (see the list in `PLAN.md`).

## The bar (exit rule)

Your session is done only when all of these hold:

1. **Zero open P0, P1 and P2** in all five areas (alignment and geometry; bars and stability; type, colour and copy; interaction and states; widths and roles) and in the new checks below.
2. **Every check passes on your final build:** `npx vitest run` (full suite), `npx tsc --noEmit -p .` and `npx eslint src`. One lint error already exists at `src/app/app/exchange/swap/page.tsx:51`. Wave A owns that file and fixes it.
3. **The report is written** at `docs/product/specs/<your-session>/README.md`: what changed, every check run with its result, what was set aside for Codex, and screenshots at 390 and 1440.
4. **The coordinator is told** by message. Jose decides on merging.

### What every inspection covers, for every page you own

- **Roles:** every role that can open the page.
- **Widths:** 320, 360, 390, 430, landscape 844×390, 768, 1024, 1440.
- **Text size:** 100%, 125%, 150% and 200% zoom, at every width.
- **Browsers:** Chromium and WebKit (Firefox is cut, Jose, Oct 19). Playwright has both at `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`.
- **States:** loading, ready, empty, partial, offline, paused, failed read (block the request in the browser), no access, signed out mid-use (force a 401 in the browser), decided, and large data.
- **Submitting, on screen only:** for every action, check before, pending, failure (block the request), double tap (exactly one request leaves the browser) and slow network (throttle it). The real server outcome of a submission is joint testing with Codex. Run submissions only on the local fictional data, and restart your preview to reset it.
- **Motion:** normal and reduced motion.
- **On-screen keyboard:** every form, in the iOS Simulator (iPhone 17 Pro) and the Android emulator (`Nevora_Pixel_7_API_36`, adb at `~/Library/Android/sdk/platform-tools/adb`). The simulators are shared, so tell the coordinator before you use one and when you finish.
- **Print and PDF:** any page with Print / Save PDF.
- **Dark mode:** not applicable. The app has none.

### How the design must look

Use the existing kit and the Phase 2 and Phase 3 pages as the precedent. Read `DESIGN.MD` and `.21st/DESIGN.md`. Gusto is the benchmark.

- **Page structure:** the kit `PageBand`, then kit cards (radius 20, shadow e1, no border), with 16px between band and first card and between cards. Text sits 20px inside each card. On phones the page edge is 16px.
- **Type:** kit roles only, with nothing under 15px except tab labels (13px) and number badges (12px).
- **Pills** state a condition; **teal links** state an action. Buttons are `.nv-btn` (52px, radius 12, primary teal `#077572`). Touch targets are at least 44px.
- **Forms (one pattern for every session):**
  - Labels above fields, in the kit label role.
  - Fields are 48px tall (single-line inputs and selects), radius 12, a 1px `--nv-border` border, white, text in the kit body role. The shared rule in `portal-premium.css` (WR-55) already sets the 48px and the text size, so don't set them yourself. Buttons stay 52px.
  - Help text in the callout role, muted, 8px under the field.
  - Errors in urgent ink with an icon and a word, never colour alone.
  - 16px between fields; groups of fields are cards, with the group title in the card head.
  - The main action is a primary `.nv-btn`. On phones it's full width at the bottom of the form, or in the kit action bar when the form is long. Secondary actions are secondary buttons or teal links.
  - Pending: the button says what it's doing ("Saving…"), is disabled, and the page doesn't move.
- **Icons:** Phosphor only.
- **Words:** plain sentence case, curly apostrophes, no blame words ("missing", "missed"). Payroll and legal wording needs Jose's approval, so leave it as it is and list it in your report.
- **Times and dates** never split across lines: use `keepWhole()` from `src/lib/keep-whole.ts`. Durations use `durationText()` from `src/lib/duration-text.ts`.

Don't override old styles with ever-heavier selectors when you can retire them for your pages instead. Most Phase 3 defects came from old phone stylesheets (`mobile-workforce.css`, `portal-gusto.css`, `employee-mobile-corporate.css`) still applying under the kit.

## How each session works

1. **Inventory:** list your pages, the roles that can open each one, every state and every action.
2. **Build** phone and desktop together, against the inspection checklist above, so round 1 starts close to zero.
3. **Jose's sign-off on built screens:** post screenshots at 390 and 1440 for each page in your chat, for Jose. Carry on into inspection while you wait. If he asks for changes, make them, and the inspectors re-check.
4. **Inspect with five inspectors, one per area.** They're background agents and read only: they never edit code or data, never submit, never print the password. Give each one this file, `BRIEF.md` and the matrix above. Each writes its report to `docs/product/specs/<your-session>/inspection/<area>.md`.
5. **Keep the preview frozen while inspectors look.** Apply all fixes for a round, run your checks, then start the next round. Repeat until all five report zero.
6. **Exit:** run the full exit rule, write the report, tell the coordinator.

**Commits:** commit on your own branch at the end of each round, locally. Never push, never merge, never touch another branch.

## Your preview

Each session runs its own preview, database and port. The shared files are in `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/` and are read only.

Start it in the background (it takes a few minutes and prints `PREVIEW_READY <url>`):

```
PREVIEW_OUT=<your scratchpad>/preview node --import tsx /Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/preview/preview-runtime.mjs
```

Run it from the main checkout `/Users/josek0514/Desktop/NEVORA-UI-READINESS` so `tsx` resolves.

- **Sync your worktree's code into it** after each change (the dev server hot-reloads):
  ```
  sh /Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/scripts/sync.sh <your worktree> <your scratchpad>/preview
  ```
- **Sign in and save browser states** for the inspectors:
  ```
  PREVIEW_OUT=<your scratchpad>/preview node /Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/scripts/login.mjs QAOWNER AUDIT-M AUDIT-LEAD AUDIT-E AUDIT-LONG
  ```
- **Accounts:** Owner `QAOWNER`, Manager `AUDIT-M`, Lead `AUDIT-LEAD`, Employee `AUDIT-E`, long name `AUDIT-LONG`, payroll accounts in `access.json`. The password is in `<PREVIEW_OUT>/evidence-*/access.json`. Read it from the file and never print it, write it into a report or put it in a URL.
- **Fictional data only.** Nothing is sent outside this machine.

### Extra test data and automated checks (ready Oct 19)

**Extra test data.** Run this once your preview prints `PREVIEW_READY`, from the main checkout:

```
PREVIEW_OUT=<your scratchpad>/preview node --import tsx .claude/parallel/scripts/seed-extra.mts
```

It adds:
- time-off requests for `AUDIT-E` that are approved, partial-day approved, declined and withdrawn, and an approved one for `AUDIT-LEAD`
- `AUDIT-ON`, clocked in, and `AUDIT-BREAK`, on break, both on today's published schedule
- the lead `AUDIT-LEAD`, with published shifts this week and next
- `payroll-qa-b`, now a lead with pay statements

It writes only to your own preview's database, after checking it belongs to that preview, and running it twice is safe. Run `login.mjs` again for the new accounts.

**Large data.** Start a second preview with its own `PREVIEW_OUT`, then run the same command with `--large`. It adds 200 people (some with very long names), a location with a very long name, 50 shifts a day this week and a year of timecards. Keep it separate so your main preview's numbers stay the same.

**Automated checks.** Run these after every fix and before every inspection round:

```
PREVIEW_OUT=<your scratchpad>/preview node .claude/parallel/scripts/checks.mjs --routes <your routes, comma-separated> --accounts <accounts> --browsers chromium,webkit --axe
```

The defaults are every width (320 to 1440, plus 844x390) and text at 100, 125, 150 and 200%. For each page it reports:
- sideways overflow
- text under the kit floor (15px on phones, 14px on desktop; tab labels 13, number badges 12)
- targets under 44px on phones or 24px with a mouse
- layout shift while loading above 0.01
- console and page errors
- axe violations

A round goes to the inspectors only when this passes, or when every remaining failure is written down with a reason.

## Cuts (Jose, October 19): less duplicated work, same bar

These apply from each chat's next round break. Don't stop a round that's running.

1. **The shared shell isn't yours to inspect.**
   - The phone header, tab bar, More sheet and section tabs belong to the coordinator.
   - The desktop sidebar, desktop account menu and desktop header belong to the desktop chat.
   - Every other chat's inspectors skip them and file only their own pages. If the script flags a shell element on your page, ignore it.
2. **The script does the sweep; inspectors do the judgment.**
   - `checks.mjs` covers every width, text size and browser for overflow, the text floor, targets, layout shift, errors and axe. Run it before each round, give the inspectors its results file, and don't have them sweep those by hand.
   - Inspectors spend their time on what the script can't judge: alignment and spacing, wording, states, focus and keyboard, behaviour, and consistency.
   - They check those at 320, 390, landscape and 1440 (plus 768 and 1024 for desktop work), in Chromium, with spot checks in WebKit.
3. **Rounds 2 and later re-check, not re-sweep.**
   - After round 1, each inspector re-checks its open findings by ID, plus anything the round's fixes touched.
   - The script re-runs in full every round to catch regressions.
   - Each chat's exit still has one full sweep by all five inspectors, so the bar holds.
4. **Short reports.** Findings stay complete, with measurement, crop, `file:line`, fix and severity. "Checked and correct" becomes a short bullet list, not paragraphs.
5. **No 768–1440 checks of Employee and Lead pages in Phase 3.** The desktop chat inspects those pages fully after Phase 3 closes.
6. **No Firefox.** Jose cut it: hardly any users have it. Chromium (Chrome, Edge, Android) and WebKit (Safari and every iPhone browser) stay. Drop `firefox` from `--browsers`, and don't file Firefox-only findings.
7. **Fix while the round is still running.**
   - As each inspector's report lands, apply its fixes in your worktree straight away. Commit locally, but don't sync the frozen preview.
   - When the last report of the round is in, sync once, run checks.mjs and start the next round.
   - Don't wait for all five reports before starting fixes.
8. **Codex's snapshot-and-restore task waits.** Real submission testing is joint testing with Codex later. Keep testing submissions on screen only.

## Coordinator notes (read these before filing shared-file items)

Updated Oct 19. This list replaces repeated messages. The app limits how many messages one chat can send to the others, so check here first.

- **Landscape phones (844×390), already fixed in `9f7b649`** on `claude/premium-phase-1`. Landscape phones keep phone type tokens in kit.css, and `mobile-workforce.css`, `employee-mobile-corporate.css` and `typeface-theme.css` treat them as phones. The header "Search" label and the compact brand link (44px target) are fixed in the same commit. Bring it in with `git cherry-pick 9f7b649` if you want it on your preview now. Don't work around it in your own CSS. Remove any workaround you added, so the merge has one rule.
- **`checks.mjs`** now changes text size after the page loads and counts layout shift only at 100%. If your runs show 0.2–0.9 at 125/150/200%, you're on an old copy or an old process; re-run.
- **Dev server 500s under load** (statement timeouts, "Workspace configuration is unavailable") come from the Mac running many browsers at once. Retry once, and don't file them as page defects.
- **Desktop session's items:** sidebar group labels at 12px; "Powered by VELANI LLC" at 10px; the header actions moving 4px on hydration at desktop widths; the Owner and Manager Profile links in `navigation.ts` and the desktop account menu in `app-shell.tsx` (asked for by the Profile chat).
- **`root-loading.tsx`:** each wave may add one entry per route it owns to the shapes list, with the route's measured phone band height, and nothing else in that file. Wave C: `/app/settings`, `/app/account-recovery`, `/app/clocker-recovery`.
- **Dead CSS:** `mobile-workforce.css` has `.settings-hub*` rules that Wave C's rebuild no longer uses. The coordinator removes them after the merge.
- **Swap flow test data, fixed (Oct 19, about 3 PM):**
  - Re-run `seed-extra.mts` (safe to repeat). AUDIT-E and AUDIT-SWAP now have reviewed rules, 6 AM–10 PM availability every day and next week's availability sent.
  - `/app/exchange/swap?sourceShiftId=audit-next-0-1` as AUDIT-E offers `x-swap-5` and `x-swap-6`.
  - Side effect: AUDIT-E's Availability page is no longer empty. Use another employee, such as AUDIT-LONG, for the empty state.
- **Simulators:** tell the coordinator before you use the iOS Simulator or the Android emulator and when you're done. The coordinator's round 3 interaction inspector uses them too.
- **Shared fields and payroll errors, fixed in `a62cc79`** (cherry-pick at your round break):
  - fields have 3:1 edges (`--nv-field-border`)
  - fields grow with text size (`min-height: 3rem` instead of a fixed 48px)
  - landscape shows the band summary in full
  - payroll network errors show the existing plain words, with an icon
- **Employee and Lead desktop has started in parallel** (Jose, Oct 19). The desktop chat works only in `premium-desktop.css`, under the desktop query (761px and up, not landscape phones). Employee and Lead components stay the coordinator's.
- **Codex inspects from each chat's next round (Jose, Oct 19, about 2 PM).** Don't start new local inspector agents. Finish any round that's already running.
  1. When a round's fixes are done, commit, then write `docs/product/specs/<folder>/ROUND.md` with:
     - the round number and the commit
     - the routes and roles
     - the finding IDs to re-check
     - what the fixes touched
     - whether it's the exit round
  2. Commit your earlier inspection reports under `docs/product/specs/<folder>/inspection/`, then **push your own branch** (Jose's OK, for this purpose only).
  3. Codex's reports arrive on `origin/codex/inspections` under `<folder>/round-<N>/`. `STATUS.md` there has a one-line summary per round. Run `git fetch origin codex/inspections` and read them with `git show origin/codex/inspections:<path>`.
  4. Fix, push, repeat until an exit round reports zero.
  - The on-screen keyboard checks (iOS Simulator, Android emulator) stay local, once at exit.
  - The brief Codex follows is `docs/product/specs/codex-joint/INSPECTION-BRIEF.md` on `claude/premium-phase-1`.
- **Faster local previews (Codex, Oct 19):** the 503s and 500s came from too many database connections ("too many clients"), not from the pages. At your next round break:
  1. `git checkout origin/codex/premium-backend -- src/test/integration/owned-pg-transport.ts`
  2. Commit it.
  3. Sync your preview.
  It's test-only (a pool of 12 connections). Codex measured 205 failures out of 880 requests before and 0 out of 880 after.
- **Placeholder bands that grow with text size (cf58953, Oct 19):** the root layout now sets `--nv-text-scale` (root font size ÷ 16) before first paint, and the band placeholder's height is `--route-band + --route-band-grow × (scale − 1)`.
  - Measure your route's real band at 100% and at 200% text. Set `--route-band-grow` to the difference, next to your `--route-band`.
  - Landscape needs its own `--route-band`: bands are 40–60px shorter there.
  - `HoldHeight` now holds in the same render that swaps the content, so scroll position survives a failed read or a pause. Use it for any block that empties while loading.
- **Rolling merges (Jose, Oct 19, about 2:40 PM):** Codex merges each chat into `codex/release-candidate` as soon as that chat reaches zero, and checks the merged build piece by piece.
  - If Codex ran your exit round, its zero report is enough.
  - If you ran your exit round on the Mac, add `status: zero` and the exit round number to `ROUND.md`, commit, and push.
  - After you reach zero, change nothing more unless a combined-check finding names your chat.
  - Merge conflicts go to the coordinator, never to you directly.
- **Known before the merge: one console 404 for `/api/manager/inbox-count` per Manager or Owner page load.** That endpoint is on `codex/premium-backend`. Since e7671e6 the count stops after a 404, so it's one line per load, not one a minute. Don't file it; the merged candidate has the route.
