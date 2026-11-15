# Package D: offline, error and loading, designed once

Worktree `wt/p2d`, final temp commit `ae0d1100`. Base `c545bea5`. Patch `p2patches/d.patch` (23 files, 603 lines added, 164 removed). One optional extra patch, `p2patches/d-optional-home-error.patch`, see "Needed from another package". Screenshots: `p2patches/d-shots/` (one before sheet, ten after pictures).
All paths below that start with `p2d-shots/` are under the scratch root `S`.
Numbers are "where the teal band ends", in px from the top of the window, unless said otherwise.

## Audit: every loading, error and offline presentation (signed-in app)

"Seen" means I made it appear in the real app (fictional data) and looked at the picture. "Source" means read in code only.
Before pictures: `p2d-shots/before-owner`, `p2d-shots/before-employee` (1440, 900, 390). After: `p2d-shots/a3-*`, `p2d-shots/a4-*`.

### Loading

| # | Where it shows | Pattern | Before | Seen? (before picture) | After |
|---|---|---|---|---|---|
| L1 | A menu or tab tap, every role. 34 `loading.tsx` files and `root-loading.tsx` go through `RouteSkeleton`, then `CorpSkeleton`. | `BLoadingScreen` inside `.c-route-state--checking`. Older shapes (`route-skeleton-*`, `q-skel`, `c-skel__*`) are in the DOM but hidden. | Main tabs: band at the tab's loaded height, no title, two identical cards of grey bars, 707px wide. Every other route: band 204 (phone 162 to 170), empty band, the same two cards. | Seen. `before-owner/d-load-settings-locations-1440.png`, `before-employee/d-load-my-time-1440.png` | Page's own frame. Fixed. |
| L2 | The same placeholder after 2.5 s (`CorpSkeleton` "slow"). | `c-error-card` (older white card, grey Try again), `role="alert"`. | The band disappears. Band ends at 64 (the top bar) on desktop and tablet, 0 on phones. Card sits under the top bar. | Seen. `before-owner/d-slow-timecards-1440.png`, `before-employee/d-slow-my-time-1440.png` | Band stays, one state card. Fixed. |
| L3 | The access check on Owner and Manager pages (`ScopedReadFrame`, "checking"). | `BLoadingScreen` plus a hidden status section. | Same generic placeholder as L1. | Source for the before. After seen as part of L1 (same component). | Page's own frame. Fixed. |
| L4 | Settings and its sub-pages when opened from inside Settings (10 `loading.tsx`, `SettingsLoading`), Account recovery, Clocker recovery. | Wave C frame: the real band with the real title and summary, then `wc-skeleton` blocks. No slow state. | Band 221, real words, faint blocks. Loaded Locations ends at 196. | Seen after only. `a2-owner/d-load-settings-locations-from-settings-1440.png` | Left alone. See "left alone". |
| L5 | The shift change sheet on a phone (`@sheet/(.)exchange/loading.tsx`, `CreationSheetSkeleton`). | Sheet-shaped static placeholder. | Not looked at. | Source. | Left alone. |
| L6 | A card whose own read is still loading (Employee Home, Time, Requests, Things to do, Notifications). | `BState kind="loading"` or `p.b-state role="status"`. Owner Notifications used `q-emptyblock`. | Grey circle with a spinner and one line, inside the page's frame. | Seen in passing. | Owner Notifications moved to `BState`. Others unchanged. |

### Error

| # | Where it shows | Pattern | Before | Seen? (before picture) | After |
|---|---|---|---|---|---|
| E1 | Any page whose server read throws (`src/app/app/error.tsx`). | Older kit page (`PageBand`, `nv-btn`), plus an Employee-only Signature copy that no shell shows. | No band at any width. On desktop the title is dark text cut off under the top bar. On a phone the title is missing. | Seen. `before-employee/d-break-availability-1440.png`, `-390.png` | State screen. Fixed. |
| E2 | Owner and Manager pages whose read comes back "unavailable" (`OperationalUnavailable`, 77 uses: "Schedule unavailable", "Employee profile unavailable", ...). | Quiet page (`q-unavailable`) plus the frame's "Refresh current view". | Desktop and tablet: band 154, the sentence is white text on the canvas (unreadable), a full-width grey "Return to Home", a loose teal "Refresh current view". | Seen. `before-owner/d-break-schedule-1440.png`, `d-break-employees-QA-SCAN-A-1440.png` | State screen. Fixed. |
| E3 | The access check failed, paused or offline (`ScopedReadFrame`). | `BState` on phones and for Employees. Owner and Manager on desktop and tablet got a second copy in the older corporate card with a grey Try again. | Band 154, plain line, grey button. | Seen (failed). `before-owner/d-apierr-home-1440.png`. Paused and offline: source. | State screen. Fixed. |
| E4 | Settings, Locations failed (`settings/locations/error.tsx`). | Wave C frame plus `EmptyState`. | Band 221. Card without the state icon. | Seen. `before-owner/d-break-settings-locations-1440.png` | State screen. Fixed. |
| E5 | Seven Wave A pages (`employees/[id]`, `employees/new`, `employees/import`, `schedule/new`, `edit`, `copy-receipt`, `coverage`: `WaveARouteError`) and `employees/error.tsx`. | Older kit page; Team used the old directory module styles. | Not seen. | **Source only.** I could not make these boundaries appear: when I broke their tables the pages answered "… unavailable" (E2) instead of throwing. | State screen, same component as E1 and E4. |
| E6 | Unknown address (`app/app/not-found.tsx`). | `BState` on phones and for Employees; older title and card for Owner and Manager on desktop. | Owner band 154. Employee card 812 wide. | Seen. `before-owner/d-404-nothing-here-1440.png`, `before-employee/d-404-nothing-here-1440.png` | State screen. Fixed. |
| E7 | Unknown location (`settings/locations/[locationId]/not-found.tsx`). | Wave C frame plus `EmptyState`. | Band 221. | Seen. `before-owner/d-404-settings-locations-nope-1440.png` | State screen. Fixed. |
| E8 | Owner or Manager Home when its read fails (`src/app/app/page.tsx`, inline block). | Older kit page. | No band. White strip with a dark title, square card. | Seen. `before-owner/d-break-home-1440.png`, `-390.png` | **Not in my file scope.** Optional patch offered. |
| E9 | The whole shell failed (`AppErrorScreen`, used by `src/app/error.tsx` and `global-error.tsx`). | Older kit page outside the shell. | Dark green band, square buttons. | Seen. `before-owner/d-break-timecards-1440.png` | Left alone (outside `src/app/app`). |
| E10 | Owner Notifications did not load (`notification-inbox.tsx`). | `q-emptyblock`, grey Try again. | Plain title, grey button. | Seen. `before-owner/d-apierr-notifications-1440.png` | `BState`. Fixed. |
| E11 | Timecards, My pay (Owner), Clocker photos: a card did not load (`CorpErrorCard`). | `c-error-card`, grey Try again. | Three plain lines, grey button. | Seen. `a2-owner/d-partial-timecards-1440.png` (taken before this card was changed). | `BState` inside the same card, teal pill. Fixed. `a4-owner/d-partial-timecards-1440.png` |
| E12 | Things to do: the list and the clock-ins both fail (`inbox-b.tsx`). | Two `BState` cards, each with Try again, same refresh. | Two retry buttons for one failure. | **Source only** (I could not make both reads fail at once in the browser). | One Try again. Fixed. Unit test `inbox-b.retry.test.tsx`. |
| E13 | Employee cards (Home, Time, Requests, Time off, Pick up and swap, Notifications, Updates). | `BState kind="failed"`, one teal Try again. | Already the kit card. One retry per screen at every width. | Seen. `before-employee/d-apierr-*.png` | Unchanged. |
| E14 | Employee Pay ("Couldn't load your statements"), Profile ("We couldn't load your details."), Calendar. | A B card with a full-width quiet Try again; not `BState`. | One retry. | Seen. `before-employee/d-apierr-my-pay-1440.png`, `d-apierr-profile-1440.png` | Left alone. See list. |
| E15 | Payroll ("Payroll could not complete this request."), Updates for the Owner ("Couldn't load updates."), Insights. | Older cards with a grey Try again. | One retry. | Seen. `a2-owner/d-partial-payroll-1440.png`, `d-partial-updates-1440.png` | Left alone (Payroll files are closed to me). |

### Offline

| # | Where it shows | Pattern | Before | Seen? (before picture) | After |
|---|---|---|---|---|---|
| O1 | Owner and Manager, tablet and desktop: the shell's line (`.c-offline` in `app-shell.tsx`). | Grey strip, `position: sticky`. | A 36px grey strip across the page between the top bar and the band. The band starts 36px lower. | Seen. `before-owner/d-offline-schedule-1440.png` | Dark pill at the foot of the window. Fixed. |
| O2 | Employee and Lead, tablet and desktop. | Dark pill. | The pill sits on the band, right under the top bar (y 76 to 112). | Seen. `before-employee/d-offline-my-pay-1440.png` | Same pill, at the foot of the window. Fixed. |
| O3 | Owner and Manager phones, on a page without a Direction B screen (Settings and the pages under it). | Grey strip. | A strip across the very top, above the band. | Seen. `before-owner/d-offline-settings-390.png` | Dark pill above the tab bar. Fixed. |
| O4 | Phones on a Direction B screen (all roles). | Dark pill above the tab bar. | Already right. | Seen. `before-employee/d-offline-home-390.png` | Unchanged. |
| O5 | Employee Home, Pay, Profile clear private rows when offline. | Deliberate privacy rule. | As designed. | Seen. | Unchanged (not touched). |
| O6 | A menu tap while offline. | The browser's offline page (the service worker's `fuel-portal-offline.html`). | White page in the capture. | **Could not see it.** The capture tool blocks service workers, so I only got the browser's blank error page (`before-owner/d-offnav-schedule-1440.png`). | Not touched. |
| O7 | Slow placeholder while offline ("You're offline / Reconnect, then try again."). | Same card as L2. | As L2. | **Source only.** | Same fix as L2 (amber offline kind). |

## What changed

### 1. No banner splitting the band (O1, O2, O3)

- One rule set at the end of `owner-b.css`. From 768px the line is a dark pill, centred in the page column, 24px above the foot of the window. It is `position: sticky` with its own height given back (`margin-bottom: -36px`), so it takes no room in the page and nothing sits between the top bar and the band.
- Measured at 1440 and 900 (window 900 tall): pill at y 840 to 876, about 225 wide, centred on the page column (x 723 at 1440, 379 at 900). Band unchanged: Schedule 295, Settings 154, Employee Home 235.
- Before, Owner Schedule at 1440: strip at y 64 to 100, full width. Employee Pay at 1440: pill at y 76 to 112, on the band.
- Phones: the pill above the tab bar now applies to every page, not only Direction B screens. Owner Settings at 390: was a strip at y 0 to 36 above the band, now the pill at y 732 to 768.
- The words, `role="status"` and the amber dot are unchanged (`app-shell.tsx` is not touched).

### 2. No repeated "Try again"

- I counted visible retry controls on every state I could force, at 1440, 900 and 390, for Owner and Employee (and Manager, Lead at 1440 and 390). After: never more than one per screen. Zero where the state has no retry (offline, 404).
- The slow placeholder plus its page: before, the older card; after, one card, one button.
- Access states (E3) and the 404 (E6) had two copies of the message in the DOM (one hidden by CSS per width). Now one copy.
- "… unavailable" pages (E2): "Refresh current view" moved inside the card with the other actions. It is the page's only retry; "Return to Home" and "Sign in again" / "Open your schedule" are ways out.
- Things to do (E12): when the list and the clock-ins both fail, the clock-ins card keeps its words and drops its button; the list's card carries the one Try again (same refresh).

### 3. Real skeletons (L1, L2, L3)

`BLoadingScreen` now takes the page's frame: title (the real one where it is a fixed word, the one the page showed last time when known, a bar otherwise), back row, sub-line, band action, strip or figure strip, band height, content width, overlap or not, and card shapes (rows with avatars, lines, figures, a right-rail card). One table, `src/components/owner-b/b-loading.tsx`, holds the frame per address and per shell. Both `loading.tsx` (via `CorpSkeleton`) and the access check read it, so a tab tap and the check that follows look the same.

Band bottom at 1440 (900 is identical), skeleton before, skeleton after, the loaded page today:

| Page | Before | After | Loaded today |
|---|---|---|---|
| Owner Home | 383 | 383 | 383 |
| Owner Schedule | 295 | 296 | 295 |
| Owner Timecards | 295 | 296 | 295 |
| Owner Payroll | 299 | 296 | 322 |
| Owner Team (measured at 900) | 297 | 296 | 297 |
| Things to do | 204 | 296 | 295 |
| Insights | 204 | 196 | 198 |
| Updates (Owner) | 204 | 296 expected (a2 read 302 before the 6px fix; not measured again) | 296 |
| Notifications (Owner) | 204 | 296 | 296 |
| Time off requests (Owner) | 204 | 296 | 264 |
| Shift requests (Owner) | 204 | 296 expected (a2 read 302 before the 6px fix; not measured again) | 264 |
| Team member | 204 | 224 | 221 |
| Add shift | 204 | 196 | 160 |
| Time exports | 204 | 224 | 222 |
| Settings | 204 | 196 | 154 |
| More (Owner) | 204 | 196 | 196 |
| Employee Home | 363 | 363 | 363 |
| Employee Schedule | 293 | 293 | 293 |
| Employee Time | 335 | 335 | 335 |
| Employee Pay | 347 | 347 | 348 |
| Employee Requests | 357 | 357 | 357 |
| Pick up and swap | 204 | 296 | 260 |
| Availability (Employee) | 204 | 224 | 217 |
| Profile and settings | 204 | 196 | 156 |
| Notifications (Employee) | 204 | 224 | 222 |
| Updates (Employee) | 204 | 224 | 228 |
| More (Employee) | 204 | 296 | 294 |

- The after column is exactly the ladder (196, 224, 296) for every page that is not a main tab with its own height. Where "loaded today" differs by more than 2px the page itself is off the ladder today (packages A, B, C decide those); see the list below.
- Slow state (after 2.5 s): before, band 64 on desktop and tablet and 0 on phones on every route. After, the band is the same as the skeleton's on every route, the title stays, and one state card (560 wide from 768px, full width on a phone) says "This is taking longer than usual / Check your connection, then try again." with one teal Try again. Same words, same `role="alert"`, same refresh.
- Card shapes: before, two identical cards 707 wide everywhere. After, per page: Schedule and Timecards one 1080 card of avatar rows, Things to do and Home 707 plus the 353 rail, detail pages one 812 column, Insights a figures card and a lines card, and so on.
- Phones: Employee and Lead placeholders gain the title, sub-line, strip and card shapes; band bottom at 390 measured from the pictures: Home 321 (loaded 322), Time 274 (274), Requests 251 (251), Pick up and swap 222 (222; was 162), Profile 162 (162). Owner and Manager phones gain the title and card shapes; their band height is unchanged for pages whose cards start under the band (170 as before), Home 318 (318), Schedule 469 (469), Things to do 230 (loaded 251; was 170). The slow card keeps the same band on phones too (Things to do 230 and 230, Schedule 469 and 469, Notifications 170 and 170).
- Reduced motion: the placeholder bars are static in both modes. No animation, transition or keyframes were added (unit test). With motion allowed (Manager run) the only running animations in the placeholder's wrapper are on the older hidden shapes (`c-skel__shapes`, `c-skel__card::after`), which no shell displays.

### 4. Older state patterns moved onto the kit

New kit pieces in `b-kit.tsx`: `BStateScreen` (one band, one state card, at every width) and `BState`'s `silent` option (no live region when the screen already has one alert). New `b-route-error.tsx` (`BRouteError`) for every route error.

State screen numbers at 1440 and 900: band ends at 196 (short), title top 88, card 560 wide at x 296, 24px under the band. Before: 154 (access check, unavailable pages, Owner 404), 194 (Employee 404), 221 (Locations error and not found), no band (E1).

| State | Before | After |
|---|---|---|
| E1 route error | No band, title cut | Band 196, title "This page didn't load", sub-line "Nothing was changed.", red state card, Try again (teal), Go to Home (quiet), reference line |
| E2 "… unavailable" | Band 154, white sentence on the canvas | Band 196, lock or red state, readable sentence, Return to Home (teal), second way out (quiet), Refresh current view (quiet) |
| E3 access check failed, paused, offline | Band 154, older card, grey button (Owner, Manager desktop) | Band 196, kit state card, teal Try again, every role and width |
| E4 Locations failed | Band 221 | Band 196, red state, Try again, Back to Settings |
| E6, E7 not found | Band 154 / 194 / 221; card 812 for Employees | Band 196, card 560 |
| E10 Notifications failed | Plain title, grey button | Red state, teal Try again |
| E11 `CorpErrorCard` | Three lines, grey button | Red state inside the same card, teal Try again |

Focus and announcements: route errors still say the whole message once in one `role="alert"` (now inside the screen, so it survives the desktop layer that hides page siblings), the visible card is not a second live region, and after Try again focus moves to the recovered page's title or back to the button (`focusAfterRetry`; the target is now any page title, the old selector only matched the older kit pages). Try again shows the kit focus ring (2px solid teal, measured). Access states and the 404 keep `role="status"`.

## Rules behind it

- Frame rule 2 (band height): placeholders and state screens read `--b-band-short`, `--b-band-sub`, `--b-band-strip` and `--b-title-top` from `b-tokens.css`. No new numbers for band heights.
- Frame rule 3 (card to band): a placeholder overlaps the band by 52px only where the page does; otherwise its cards start 24px under it. A strip keeps 52px (overlapping pages) or 28px plus 24px of clear band and canvas above the first card.
- Frame rule 4 (content width): placeholders use 1080 (wide), 812 (read) or Home's two columns; a state card is at most `--b-frame-form` (560).
- Kit rule "one state card, say the state once" (DESIGN.MD, batch B2): `BState` everywhere touched; one live region per state.
- B8 layering: every `!important` added is inside `@layer nv-b`; only `(max-width: 767px)` and `(min-width: 768px)` are used; no colour literal added (the pill uses `color-mix` on `--b-ink`).
- Offline rule (Jose, Nov 10): the line's words, the held page and the disabled actions are untouched; only where the line is drawn changed.

## Checks run

All on the final commit `ae0d1100` unless a line says otherwise.

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no errors in `src`. (The capture tool's own `zz-scan/states.ts` has older implicit-any errors. It is not in the patch.)
- `npx eslint <the 23 changed and new ts/tsx files>`: clean.
- `npx vitest run --dir src src/app src/components`: 302 files, 3121 tests, all pass. The known failure `src/test/manual-publication.test.ts` is outside these folders, so it did not run.
- New unit tests: `src/components/owner-b/b-states.test.tsx` (11 tests: the placeholder's frame, the route table, both shells, the state screen, the route error's one alert and one retry, the offline rules, no animation) and `src/components/owner-b/inbox-b.retry.test.tsx` (2 tests). Four existing tests updated for the new markup: `help-not-found.test.tsx`, `operational-unavailable.test.tsx`, `employee-account-panel.test.tsx`, `app-error-screen.test.tsx` (its tree walker now skips a piece that reads a hook; the retry assertion is unchanged).
- Browser capture, real app, real sign-in, fictional data, with my own state script (`zz-scan/states-d.ts`, not in the patch). It holds a page in its loading state by locking the disposable database's tables, fails a server read by renaming one table for one load, fails client reads by answering `/api` with 500, and goes offline with Playwright.
  - Final commit: `p2d-shots/a5-owner` (Owner at 390 and 1440: Things to do, Notifications and Schedule loading and slow, Settings offline, the 404).
  - Owner and Employee at 1440, 900 and 390, reduced motion: `p2d-shots/a3-owner`, `p2d-shots/a3-employee`, then `p2d-shots/a4-owner`, `p2d-shots/a4-employee`. The a4 runs are two temp commits before the final one; the later changes are one new test file and one attribute that keeps a phone band's height when the slow card appears (checked in a5). The a3 runs are one commit before a4; the later changes are the older failure card's pill, the Owner phone band rule and one test.
  - Longer route lists (18 Owner routes, 11 Employee routes, all three widths): `p2d-shots/a2-owner`, `p2d-shots/a2-employee`. Two commits earlier: pages with a back row measured 6px lower there (fixed after; re-measured in a3 and a4 for Notifications, Time off requests, Team member, Add shift, Pick up and swap, Availability).
  - Manager at 1440 and 390 with motion allowed: `p2d-shots/a4-manager`. Lead at 1440 and 390, reduced motion: `p2d-shots/a4-lead`. Same numbers as Owner and Employee (Home 383 / 363, Schedule 296 / 293, state screens 196, pill at y 840, one retry).
  - Optional Home patch: `p2d-shots/opt-owner` (1440, 900, 390): band 196, one Try again.
  - Per state the script records the band, the offline line's box, visible retry controls, live regions, the focused element and `overflow`. Read with `node p2d-sum.mjs <dir>`.
  - `overflow` is 0 in every probe at every width. No `pageerror`. The only console strings are "503 (Service Unavailable)" from the reads my script broke on purpose.
- Phones did not move, normal pages: I compared first-screen pictures at 390 with `p2before`, pixel by pixel. Owner Settings and Help, Employee Pick up and swap and Profile: 0 differing pixels (also 0 at 1440 and 900 for the ones I compared). Owner Home, Schedule, Timecards and Employee Home, Time differ in 0.07% to 1.2% of pixels, all inside content rows that show clock-driven figures; I did not trace each of those pixels.
- Keyboard: Try again takes focus and shows the kit ring (2px solid teal) on the route error and Locations error screens at all three widths (measured by the script). I did not tab through every state by hand.
- Not run: the integration suites under `src/test/integration`, the Clocker, the signed-out pages, Spanish, text sizes above 100%, real devices, a screen reader.

States I could not make appear in the browser (source and unit tests only): E5 (the seven Wave A route errors and Team's), E12 (both Things to do reads failing together), the paused and offline variants of E3, O6 (the service worker's offline page), O7 (slow while offline), L5 (the sheet placeholder).

## Pages off the ladder or left alone, and why

Placeholders target the ladder. These loaded pages are off it today, so the placeholder and the page differ until their package lands (numbers are loaded band bottoms at 1440): Owner Payroll 322, Time off requests and Shift requests 264, Add shift 160, Settings 154, Pick up and swap 260, Profile and settings 156, Availability 217, Updates (Employee) 228. If a package keeps one of them off the ladder, change that page's line in `b-loading.tsx` (one table).

Main tabs that keep their own height (no `band` in the table): Owner and Manager Home; Employee and Lead Home, Schedule, Time, Pay, Requests. Their heights come from `--b-ph-band` in `b-foundation.css`.

Left alone:

- L4 Settings placeholders (Wave C). They already draw the real band and words. Moving them to the kit placeholder would change their phone band, which is not on a ladder. Their band is 221 against 196 loaded for Locations.
- L5 the shift change sheet placeholder. A sheet, not a page.
- E9 `AppErrorScreen` (shell-level failure). Outside `src/app/app`; it draws without the shell, so the kit classes do not reach it.
- E14 Employee Pay, Profile and Calendar failure cards. Already Direction B cards with one retry; they live in the Employee components whose stylesheets are closed to me.
- E15 Payroll's failure card (`payroll-ui.tsx` / `payroll-runs.tsx`), the Owner's Updates and Insights failure blocks.
- Phone band heights for Owner and Manager pages that are not main tabs: unchanged (170). They need a phone ladder first.
- The older hidden shapes inside `RouteSkeleton` and `CorpSkeleton` (`route-skeleton-*`, `QuietSkeleton`, `SkelShape`): still rendered and hidden, as before. Removing them touches closed stylesheets and several tests.
- `EmptyState` (Wave C) in Settings pages, `CorpEmpty`, `c-empty` rows, `SkeletonRows` in the older Manager components: empty states and older-era components, not the three named problems. Not converted.
- Heading level: the Owner Notifications failure title was an `h2`; inside `BState` it is a paragraph (the kit card has no heading). Status role kept.

## Wording changed

None on screen. Every sentence and button label is the one the screen had. (One visual detail: Try again on the error pages no longer carries the circular-arrows glyph; it is the kit's plain teal pill.)

Two spoken-only changes:

- Team failed (`employees/error.tsx`, not seen in the browser): the alert now says the whole message once, "Team didn't load. Check your connection, then try again. Directory unavailable. Try again to load your employees." It used to announce only the card ("Directory unavailable. Try again to load your employees.").
- The Employee-only Signature error copy in `app/app/error.tsx` ("… Check your connection, then try again." and "Still stuck? Sign out and back in, or ask your manager.") is removed. No shell displayed it; Employees already saw the online-aware words.

## For Jose to decide

1. Offline pill place on desktop: foot of the window, centred in the page column (done). The other approved option was a card on the canvas under the band.
2. Shimmer: the placeholder is static in both motion modes, as DESIGN.MD says today. Say so if you want a soft pulse when motion is allowed.
3. The slow card uses the grey "still loading" look with a spinner glyph. Amber "paused" is the alternative.
4. On "… unavailable" pages the teal pill is "Return to Home" (first in the old order) and "Refresh current view" is quiet. For a failed read you may prefer the retry as the teal one.
5. Owner Home's failure page (E8): apply the optional patch or leave it to package A.

## Needed from another package

- `src/app/app/page.tsx` (Home), the `if(!dashboardData)` block near line 103: replace the older kit markup with `BRouteError` (it takes `retryHref` for a server-drawn retry). Ready as `p2patches/d-optional-home-error.patch` (one file, applies on top of `d.patch`; type check, lint and the 302 test files pass with it; seen at 1440, 900, 390 in `p2d-shots/opt-owner`: band 196, one Try again, same words).
- `src/app/app/b-foundation.css` lines 646 to 667: the `--b-ph-band` heights for the ten main tabs are the loaded heights measured on Nov 11. If a package moves a main tab's band, update the matching line or the placeholder will jump.
- `employee-b-desktop.css` line 384 and `owner-b-shell.css` lines 17 to 20 and 79: the older offline pill rules are now overridden by `owner-b.css`. They can be deleted by whoever owns those files.
- Payroll's failure card and the Employee Pay / Profile failure cards could take `BState` (owners of those files).

## For Codex

- Nothing needs the server.
- Observation only: when the device is offline and the window regains focus, some pages re-read and the router falls back to a full page load, which lands on the browser's offline page (blank in the capture, where service workers are blocked). Worth a look on a real device with the service worker on.
- `OperationalUnavailable` and the route error boundaries: several pages answer "… unavailable" for a failed read instead of throwing, so their `error.tsx` is rarely reached. Fine as it is; noted because I could not exercise those boundaries.

## Notes for whoever merges

- New files: `src/components/owner-b/b-loading.tsx` (the frame table), `b-route-error.tsx`, `src/components/company-access/scoped-refresh.tsx`, and the two test files.
- The wrapper class `c-route-state--checking` now also wraps state screens (not only the placeholder). The desktop layer keys on it to draw a Direction B screen on tablets and desktop; I reused it instead of repeating about 35 selectors from `owner-b-desktop.css`, which I may not edit.
- A state screen's band on a phone is as tall as its words (`--b-ph-band: 0px` on `[data-b-state]`), so it does not take a main tab's loaded height.
- DESIGN.MD is not touched. Suggested entry: "Phase 2 package D: `BLoadingScreen` takes the page's frame from `b-loading.tsx`; `BStateScreen` and `BRouteError` are the one state screen; the offline line is a pill at the foot of the window from 768px and above the tab bar on every phone page."

## Follow-up (Nov 15): placeholders matched to the settled frames of packages A and B

Patch: `p2patches/d2.patch` (diff from `ae0d1100` to `b5eee4a8`; 4 files: `b-loading.tsx`, `b-kit.tsx`, `owner-b.css`, `b-states.test.tsx`). `src/app/app/page.tsx` is not in it.

What changed, measured on the placeholder at 1440 and 900 (`p2d-shots/f1-owner`, `f1-employee`, `f2-owner`, `f2-employee`, `f3-employee`):

- Owner and Manager. Time exports and Payroll settings: title 88, no back row, strip, band 296, cards 24 under it. Payroll: band 314 (its own number; `band` now also takes a px value), card lifted (top 262). Team: band 296, two columns from 1024px (707 and 353 at 1440), one column on tablets (764 at 900). Profile: no back row, 196. Add shift, Edit shift, Build and publish, New update: title 88, band 196. Add employee and Scheduling rules: back row and sub-line, 224. Time off requests, Shift requests, Availability: 296. More, Help, My pay: back row (title 130), 196. Settings: two columns of 530.
- Employee and Lead. Schedule: band 296 (it had the shell's 293). Notifications and Updates: title 88, strip, band 296, first card lifted (card top 244). Pick up and swap and More: band 296, two columns of 530 from 1024px. Availability: 224, one card 1080 wide. Time off 296. Profile 196. Profile sub-pages, New update, Delete account: back row, 224. Swap, cover and Can't work forms: back row, 196. Home, Time, Pay and Requests carry no band in the table, so package B's `--b-ph-band` (363) decides them.
- A band action no longer lowers the title in the placeholder (Pay and Updates read 98, now 88).
- New frame values: `rail-desktop` (Team) and `pair` (two equal columns from 1024px). Both are one column from 768 to 1023.

Checks: type check clean for `src`, lint clean, `npx vitest run --dir src src/app src/components` 302 files and 3122 tests pass, `overflow` 0, one retry in every slow state. Phones: Employee Notifications, Updates, Time off, Pick up and swap and More placeholders end at 222 (loaded before pictures: 222, 224, n/a, 222, 310); Owner phone bands unchanged.

Could not match or verify:

- Employee Time, Pay and Requests read 335, 347 and 357 in my worktree, because package B's `--b-ph-band` override is not in it. I did not see 363 myself.
- The loaded pages in my worktree are the old ones, so I compared placeholders with the tables in `a.md` and `b.md`, not with a merged build.
- Pages told apart only by a query string take their parent's frame: Employee Time off form and one request (the placeholder gives 296, the table says 196), `/app/my-time?view=...` and `/app/my-pay?view=history`, Owner `/app?view=team`.
- Edit shift, Copy week, one update, and Owner Updates' gap were not in A's table; I kept Edit shift like Add shift and the others as they were.
- Time corrections' card starts 60 under the band in A's table; the placeholder starts 24 under.
- The Swap form placeholder did not appear in the capture (the route opens as a sheet), so it is checked by unit test only.
- Employee Help's two columns and Profile calendar were not captured after the last change (Help errored under my table lock, as before).
