# WP5 report: navigation, shell, More, Settings hub, Help, Search, wrong-role handling

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp5.patch` (86 KB; reverse-applies cleanly against the worktree).

`git diff HEAD --stat`: 30 files changed, 451 insertions, 76 deletions. New files: `src/app/app/restricted/page.tsx`, `src/app/app/restricted/page.test.tsx`, `src/app/app/more/page.test.tsx`. Nothing committed; only the worktree was edited.

ESLint passes on every changed file and the targeted tests pass. Nothing was checked in a browser and `tsc` was not run, as instructed; I read the diff for type errors.

## Findings

| ID | Status | What changed, or why not |
|---|---|---|
| BR-4 (tabs) | Done | `activeMobileTab` (`src/lib/navigation.ts:289`) lights no tab on More, Insights, Settings and its pages, Profile, Notifications, Help, Updates, My pay, AI manager, Clocker recovery. `MORE_FAMILY` is removed, and Notifications is no longer owned by the Home tab. |
| BR-4 (back link) | Partly | Owner and Manager Help now shows "‹ More" on phones and "‹ Home" on tablets and desktop (two bars, one per width, switched in `help.css`). The Employee and Lead desktop Help still says "‹ More": that label is in `src/components/employee-b/account-b.tsx:87`, outside my scope. |
| AR-13 / JR-4 | Done | "Plan and billing" row in Settings › Company and in the Owner's phone More, only when `commerceEnabled()` is true. Not added to Search (see Risks). |
| AR-18 / RA-7 | Done | New `/app/restricted` page; `requireRoles` redirects there (`permissions.ts:33,41`). Authorization is untouched. |
| AR-15 | Done for the labels I own | Exchange tab title follows the role; "Week templates"; "Help someone sign in" (title and Help); "Features and team terms" in Search. Leftovers are listed under Risks. |
| "Pay history" rename | Not needed | `navigation.ts` does not carry it. `finder.ts:56` has "Pay history" for the Employee's own `/app/my-pay?view=history`, which is a different page, so I left it. |
| AR-14 | Done | Search adds Clocker PINs, Punch photos (Owners) and Payroll settings (Owner with payroll on and `canConfigure`). |
| AR-9 (my part) | Done | "Availability · Who can work, and when" row in Schedule's "…" menu, phone and desktop. |
| RA-24 | Done | `root-loading.tsx` entries for billing, help, more, ai-manager, account/delete, timecards/corrections, plus the new restricted page. |
| BR-1 (my part) | Done | More's Insights figure now goes through `durationTotal` with unrounded whole minutes. |
| TB-012 | Done | The ⌘K / Ctrl K hint is filled only when `(pointer: fine)` matches; the existing `kbd:empty` rule hides it otherwise. |
| BR-12 | Done, layout unverified for Employees | "How to" section per role, filtered to pages the person can open. |
| AR-16 | Unchanged | Same tabs per role. |

## Decisions the coordinator should know

- **Restricted page wording for Managers.** A Manager can only land there from an Owner-only page (Clocker recovery, a person's Clocker PIN), so they see "That page is for Owners". Employees and Leads see the specified title. The page reuses `OwnerOnlyNotice` (the notice Payroll and Settings use); I made its `reason` prop optional.
- **Intentional redirects kept.** `requireSelfService` (managers sent on to their own page), Things to do → Requests hub, and More's own guard are unchanged. I found no flow that relied on `requireRoles` landing on Home: the pages that branch by role do so before calling it, and `/api/manager/attendance` checks the role first.
- **Four guards still go to Home.** `src/app/app/schedule/settings/actions.ts:33,125,179,216` call `redirect('/app')` directly, not through `requireRoles`. That file is outside my scope, so those form actions still return Home.
- **Things to do still lights Home** for an Owner with the Payroll tab (and Time off, Shift requests, Availability with it). I left it because it was not in the task's list and its back link goes to Home. Say if you want it unlit too.
- **Availability link carries the week** (`/app/availability?week=…`), so it opens on the week being planned rather than the default upcoming week.
- **How to links.** "Add your team" goes to Team, "Build and publish a week" to `/app/schedule/publish`, "Set up the time clock" to Settings › Clocker tablets. A location-scoped Manager gets no section, since those pages need company-wide access. If the reads fail, the section is left out and the rest of Help renders.
- **Help now does more reads** (session proof, payroll capabilities, operational authority, brand) to filter the list, the same ones More does.
- **Small behaviour fix.** The tab lookup now ignores the query string, so `/app/account-recovery?employee=…` lights Team (before, only the bare path did).

## Strings changed or added (all English-only surfaces, so no Spanish twins)

| Where | Old → New |
|---|---|
| `src/app/app/restricted/page.tsx:8` | new: "That page is for Owners and Managers" (Employee, Lead) / "That page is for Owners" (Manager); also the browser tab title |
| `src/app/app/restricted/page.tsx:21` | new: "Ask your Owner if you need access." and button "Go to Home" |
| `src/app/app/settings/page.tsx:79`, `src/app/app/more/page.tsx:152` | new row: "Plan and billing" |
| `src/app/app/help/page.tsx:103,119,121` | new heading: "How to" |
| `src/app/app/help/page.tsx:60-64` | new: "Add your team", "Build and publish a week", "Set up the time clock", "Approve timecards", "Prepare payroll" |
| `src/app/app/help/page.tsx:68-72` | new: "Confirm your schedule", "Ask for time off", "Swap or give away a shift", "Fix a missed punch", "See your pay statement" |
| `src/app/app/help/page.tsx:109` | new desktop back link: "Home" (phone keeps "More") |
| `src/app/app/help/page.tsx:131-132` | "Account recovery" → "Help someone sign in" (question detail and link text) |
| `src/app/app/account-recovery/page.tsx:12` | tab title "Account recovery" → "Help someone sign in" |
| `src/app/app/schedule/templates/page.tsx:28` | tab title "Templates" → "Week templates" |
| `src/app/app/exchange/page.tsx:97` | tab title "Shift requests" → "Shift requests" (Owner, Manager) / "Pick up and swap" (Employee, Lead) |
| `src/app/app/schedule/page.tsx:364` | new menu row: "Availability" with "Who can work, and when"; aria-label "Availability: who can work, and when" |
| `src/lib/finder.ts:43` | "Features & words" → "Features and team terms" |
| `src/lib/finder.ts:48,49,52` | new Search entries: "Clocker PINs", "Punch photos" (detail "Settings"), "Payroll settings" (detail "Payroll") |
| `src/app/app/more/page.tsx:91` | "383 h this week" keeps its form, now produced by `durationTotal` |
| `src/app/app/root-loading.tsx:25,37-42` | new screen-reader labels: "Loading time corrections…", "Loading More…", "Loading help…", "Loading plan and billing…", "Loading AI manager…", "Loading delete account…", "Loading this page…" |
| `src/app/app/root-loading.tsx:52` | "Loading features and words…" → "Loading features and team terms…" |

## Tests

- `npx eslint` on all changed and new `.ts`/`.tsx` files: clean.
- `npx vitest run` on the directories and files covering the changes: **731 tests passed** in the last run. That run covered help, more, restricted, settings, exchange, schedule page/templates/settings/generation-actions, requests, my-time, reports, payroll-export, employees, timecards, profile, account-recovery, app-shell, command-finder, manager-workflows, navigation, finder, time-clock, attendance-review, self-service-guards, b-viewport, ui-preview, corp, duration-format.
- A separate run of the branding, entrance-motion, action-menu, brand-lockup, employee-mobile-evidence, corp/owner-b/employee-b tests: 69 passed.
- New tests: restricted page and redirect target, More billing row, Settings billing row, finder entries, Help How to / back links / naming, exchange tab title, no-tab pages in navigation and app-shell.
- Existing tests updated for the new redirect target: `self-service-guards`, `manager-workflows`, `time-clock`, `attendance-review`, `generation-actions`.
- `src/test/integration/generation-cross-layer.integration.ts:208` was updated to the new target but not run (it needs a database).

## For Codex

Nothing blocking. One note: Search runs in the browser and cannot read `NEVORA_COMMERCE_ENABLED`, so "Plan and billing" is not in Search. It needs a flag passed through the shell's nav context from `src/app/app/layout.tsx`.

## Risks and things to check in the browser

1. **Employee and Lead Help, 390 and 1440.** The How to card is a kept block (`b-keep`) after the Direction B screen, because `EmployeeHelpB` is out of my scope. It is the last card on a phone; on desktop it spans both columns under the Contact / Questions grid. Check spacing and card look. The cleaner fix is a slot inside `EmployeeHelpB` so the card joins the grid.
2. **Owner and Manager Help, 390 and 1440.** Exactly one back link per width; phone hero unchanged.
3. **`/app/restricted`, each role and width.** The band title is a full sentence and wraps to two lines on a phone.
4. **Phone bottom bar on More, Insights, Settings, Profile, Notifications, Help, Updates.** No tab lit. This reverses the Nov 7 Direction B rule ("More and the pages it opens light Home"), so `DESIGN.MD` needs a line; I did not edit docs.
5. **Schedule "…" menu at 390.** The new row's grey value should fit on one line.
6. **Search hint.** A desktop browser emulating a touch viewport with a mouse still reports a fine pointer, so the hint shows there; real touch devices hide it.
7. **Loading skeleton band heights** for the new entries are estimates (128px flat; 152px for Time corrections), not measured.
8. **"‹ More" on desktop remains** on pages outside my scope: My pay (`src/components/payroll/my-pay.tsx:98`), manager Profile (`manager-profile.tsx:40`), Updates (`employee-updates.tsx:79,116`, `messages-b.tsx:155`), Employee Profile and Add to calendar (`account-b-client.tsx:53,113`, `employee-mobile/profile.tsx:55`, `profile/calendar/page.tsx:13`).
9. **"Account recovery" / "Features & words" remain** in files outside my scope: `account-recovery/loading.tsx:4`, the "Account recovery unavailable" state title in `account-recovery/page.tsx:16`, `mobile-home-overview.tsx:57`, `settings/wave-c-route-loading.tsx:17`. `root-loading.tsx` also still announces "Loading account recovery…" and "Loading shift requests…" for both roles.
