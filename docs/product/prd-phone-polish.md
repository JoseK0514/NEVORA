# PRD: Phone polish (Back closes sheets, small fixes, Android shortcuts)

- **Cycle:** 1, PRD step. Written 2026-10-17 by the Product Manager.
- **Approval:** direction items 11 (A17, score 15), 12 (fixes from §1.3) and 13 (A13, score 13), approved by Jose at Checkpoint 1 on 2026-10-17 (`docs/product/direction.md`, "Checkpoint 1 decision"). Item 11 needs Jose's physical phones for its final check.
- **Sources:** direction §1.3, §3.2 rows 11 to 13; trends T §2 (sheets and widgets rows), T §3.9, T §4; DESIGN.MD U1, U2, U5, B4, D3, Owed testing.
- **Status:** ready for design. No backend, migration, legal or privacy change.

## Contents

1. Summary
2. Problem
3. Users and platforms
4. User stories and acceptance criteria
   - Part A: Back closes sheets (item 11)
   - Part B: small fixes (item 12)
   - Part C: Android icon shortcuts (item 13)
5. States
6. Out of scope and later
7. Dependencies and constants
8. Metrics
9. Release slices
10. Open questions

---

## 1. Summary

Three independent pieces of phone polish, each shippable alone:

- **A. Back closes sheets.** On a phone, the system Back button or gesture closes the open sheet or dialog instead of leaving the page. First we measure what each platform does today on simulators, then fix only what fails, then Jose confirms on his own iPhone and Android phone.
- **B. Four small fixes.** Employee Home leads with the shift under way. One audit-style sentence becomes plain. The `/ui-preview/home` sidebar matches the live D3 sidebar. The preview's Today strip and side panel stop contradicting each other.
- **C. Android icon shortcuts.** The web manifest gains two shortcuts, Schedule and Time off, so a long press on the installed app's icon opens them.

## 2. Problem

**A. Back.**

- NN/g expects Back to close a sheet (T §4). NEVORA's sheets and menus are popovers and dialogs, and nobody has checked them against Back on a device.
- The employee More sheet is `popover="auto"` (`src/components/app-shell.tsx:265-268`). Chromium on Android treats Back as a close request for open popovers and modal dialogs, so it likely works there. On iOS, Safari's edge swipe goes back in history and may leave the page (T §4). None of this has run on a device (trends §7, direction "Not verified").
- An accidental page exit loses the person's place and feels broken.

**B. Small fixes** (direction §1.3):

1. Employee Home puts tomorrow's shift first and today's "Scheduled now" shift below it (`src/components/employee-home-reviewed.tsx:261-267`; `.claude/evidence/errors/employee-home-1440.png`). The shift under way should lead.
2. "Scheduled assignment; clock status is shown separately." (`employee-home-reviewed.tsx:265`) reads as audit language; U5 missed it.
3. The preview sidebar lists pre-D3 entries: Availability, Shift requests, Templates, Time off, Payroll export and Scheduling rules for the Owner; Availability and Profile for the employee. `PreviewShell` calls `navigationForRole()` directly and skips `sidebarNavigation()` (`src/components/ui-preview/home-preview.tsx:33,47`).
4. The Owner preview's Today strip says 4 people are clocked in (`previewToday`, `home-preview.tsx:15-16`), while the rail says "No one is clocked in right now." because `previewMonitor` has no rows (`home-fixtures.ts:33-35`). `previewToday` is also dated 2030-10-16, while the preview says its data is frozen at October 13, 2026 (`previewObservedAt`, `home-fixtures.ts:13`). Reviewers use this page, so it misleads them.

**C. Shortcuts.** The manifest has no `shortcuts` (`src/lib/notifications/manifest.ts`, T §2). Android users who install NEVORA open it and then tap through to Schedule or Time off.

## 3. Users and platforms

| User | Part | Job made easier | How often |
|---|---|---|---|
| Employee on a phone | A, B1, B2, C | Close More without losing the page; see today's shift first; jump to Schedule from the icon | Daily |
| Manager, Owner on a phone | A, C | Close More, account menu, finder and page menus with Back | Daily |
| Reviewer (Jose, product team) | B3, B4 | Trust the preview | Each review |
| Clocker kiosk | A (dialogs in Clocker admin pages only) | n/a for the kiosk itself | n/a |

| Platform | A. Back | B. Fixes | C. Shortcuts |
|---|---|---|---|
| iOS app | No app yet. The spike tests Back inside WKWebView (question 6) | Same web change | Not applicable. Native Home Screen quick actions come with the store build |
| Android app | No app yet. The spike tests the Capacitor `backButton` route (question 6) | Same | Not applicable. Native app shortcuts come with the store build |
| Desktop web | Esc already closes popovers and dialogs. Browser Back stays as today unless the fix adds history entries (AC-A2.5) | Same | Installed Chrome and Edge list the shortcuts in the taskbar or Dock menu |
| Mobile web | iOS Safari edge swipe; Android Chrome Back button and gesture | Same | Not applicable in a browser tab |
| PWA | iOS standalone; Android installed (WebAPK) | Same | Android: long press on the icon. iOS ignores `shortcuts` |

## 4. User stories and acceptance criteria

### Part A: Back closes sheets (item 11)

**Surfaces in scope** (every popover or modal dialog reachable on a phone):

| Surface | Code |
|---|---|
| Employee More sheet | `#employee-more-navigation`, `app-shell.tsx:265` |
| Manager More menu | `#manager-more-navigation` (`ActionMenu`), `app-shell.tsx:320` |
| Account menu | `PortalAccountMenu` (`src/components/portal-account-menu.tsx`) |
| Profile and device settings | `#portal-device-settings`, `src/components/portal-device-setup.tsx` |
| Page menus | `ActionMenu` in `src/app/app/schedule/page.tsx` and `src/app/app/settings/locations/page.tsx` |
| Issue focus popover | `src/components/manager-issue-focus.tsx` |
| Clocker admin dialogs | `src/components/clocker-break-types.tsx`, `src/components/clocker-device-manager.tsx` |
| Finder sheet | `src/components/command-finder.tsx`, once `prd-phone-search.md` ships |

#### A1. Measure today's behaviour

*As the product team, we want a recorded Back matrix for every sheet on every phone platform, so that we fix only what fails.*

- **AC-A1.1** Given each surface above, when the UI Engineer opens it and presses Back, then the matrix records the result on: iOS Safari tab and iOS standalone PWA (iOS 26.5 and 27.0 simulators), and Android Chrome tab and installed PWA (`Nevora_Pixel_7_API_36` emulator, button and gesture navigation).
- **AC-A1.2** Given each cell, when recorded, then it says one of: closes the sheet and stays; leaves the page; does nothing; or other (described). It links a screenshot or screen recording.
- **AC-A1.3** Given the matrix, when it's done, then the build report lists the failing cells. This becomes the fix list for A2.

#### A2. Back closes the top sheet

*As an employee, I want Back to close the menu I opened, so that I stay on my page.*

- **AC-A2.1** Given a phone platform and an open surface, when I press Back once (Android button or gesture, iOS edge swipe where the platform offers one), then the top surface closes, the page stays, its scroll position holds and focus returns to the control that opened it.
- **AC-A2.2** Given no surface is open, when I press Back, then the browser goes back in history as it does today.
- **AC-A2.3** Given I close a surface another way (Close actions, Esc, swipe down, tapping outside, choosing a link inside it), when I then press Back, then Back goes to the previous page. The fix leaves no extra history entry behind, so you never need two Back presses.
- **AC-A2.4** Given I choose a link inside a sheet, when the new page loads and I press Back, then I return to the page that had the sheet, with the sheet closed.
- **AC-A2.5** Given desktop web, when I open a popover or dialog, then Esc closes it. If the fix adds history entries on desktop, then browser Back closes the surface first and the next Back navigates. Otherwise desktop Back behaves as today.
- **AC-A2.6** Given a page reload or a link shared with a sheet open, when the page loads, then no sheet opens by itself.
- **AC-A2.7** Given the Next.js App Router, when the fix runs, then client navigations, `router.push`, the D6 row navigation and the Employees search history replacement (U8) behave as before. The U1, U4 and U8 flow checks pass.
- **AC-A2.8** Given the fix, when I check it, then it reuses the existing close paths (`hidePopover()`, `dialog.close()`) and keeps the swipe-down and "Close actions" behaviour from `src/components/sheet-gestures.tsx` and Phase 3 unchanged.

#### A3. Jose confirms on his phones

*As Jose, I want to try Back on my own iPhone and Android phone, so that I know it works beyond simulators.*

- **AC-A3.1** Given the fix on the fictional runtime, when Jose runs the matrix script (section 9, slice A3) on his iPhone (Safari and Home Screen app) and Android phone (Chrome and installed app), then every cell reads "closes the sheet and stays".
- **AC-A3.2** Given the device run, when it's done, then the build report records the device models, OS versions and any cell that differs from the simulator.

### Part B: small fixes (item 12)

#### B1. The shift under way leads

*As an employee at work, I want Home to show the shift I'm on first, so that I don't read tomorrow's shift as today's.*

- **AC-B1.1** Given an employee with a current shift (`snapshot.currentShift`) and a next shift, when Home renders at 390 and 1440, then inside the shift card the "Scheduled now" block comes first, in both reading order and visual order, and the next shift follows.
- **AC-B1.2** Given that order, when I check the script contracts, then:
  - the card keeps `aria-labelledby="employee-reviewed-next-heading"` (the `next()` locator in `scripts/phase-e-home-browser-scenarios.mjs`);
  - "Scheduled now" keeps its exact text inside that card (H01 presses it);
  - the "Next shift" text stays in the card and before the own-time slot (`employee-home-reviewed.test.tsx:116`);
  - the card stays before To do (DESIGN.MD U2).
- **AC-B1.3** Given the countdown pill, when a current shift exists, then the countdown stays on the future shift only and never on the shift under way (U2).
- **AC-B1.4** Given no current shift, when Home renders, then nothing changes: the U10 snapshot of employee Home shows zero differences.
- **AC-B1.5** Given a current shift, when Home renders, then it still infers nothing about clock status: "Clocked in" doesn't appear in the card (`employee-home-clock.test.tsx:15`).

#### B2. A plain sentence

*As an employee, I want a sentence I understand, so that I know where to check if I clocked in.*

- **AC-B2.1** Given "Scheduled now", when it renders, then the line under it reads in plain words and points to the Clock status panel. Suggested copy, for the UX writer to confirm: "This is your schedule. Clock status shows whether you've clocked in."
- **AC-B2.2** Given the change, when tests run, then `employee-home-clock.test.tsx:15` and `employee-home-reviewed.test.tsx:114` move to the new wording in the same commit, as U5 did. No script in `scripts/` pins the old sentence (searched 2026-10-17).

#### B3. Preview sidebar matches the live one

*As a reviewer, I want the preview sidebar to match the live D3 sidebar, so that I don't flag fixed problems.*

- **AC-B3.1** Given `/ui-preview/home` as Owner, Manager or Employee at 1440, when it renders, then its sidebar entries equal `sidebarNavigation(role, navigationForRole(role, payroll))` for the same capabilities, in the same groups, with Home lit through `sidebarActiveHref()`.
- **AC-B3.2** Given the Owner preview, when it renders, then the sidebar shows the D3 list. With payroll capabilities passed (Q3): Home, Inbox, Schedule, Employees, Requests, Updates, Timecards, Payroll, Insights, Settings.
- **AC-B3.3** Given the Employee preview, when it renders, then Availability and Profile no longer appear in the sidebar. Profile stays in the account menu.
- **AC-B3.4** Given the phone tab bar and More in the preview, when they render, then they stay as today (they already use `mobileTabsForRole()` and `mobileMoreForRole()`).
- **AC-B3.5** Given the preview test, when it runs, then a new assertion compares the preview sidebar with `sidebarNavigation()` for all three roles.

#### B4. Preview Today strip and rail agree

*As a reviewer, I want the preview's numbers to agree with each other, so that I can trust the sample.*

- **AC-B4.1** Given the Owner and Manager preview, when it renders, then the Today strip's "Clocked in now" figure equals the number of people the rail's clock monitor lists, both from one fixture source.
- **AC-B4.2** Given the preview fixtures, when they render, then `previewToday` uses the same frozen date and time as `previewObservedAt` (2026-10-13), and its zone label reads as a place ("Puerto Rico time"), as D5 and D6 require.
- **AC-B4.3** Given the fixture shows people clocked in, when the rail renders, then it lists them (fictional people from `home-records.json`). If the fixture shows zero, then the rail hides its empty "Clocked in now" card, as the live D3 Home does.
- **AC-B4.4** Given the preview's privacy test (`home-preview.test.tsx`), when it runs, then it still finds no credential, contact or device field in the fixtures.

### Part C: Android icon shortcuts (item 13)

*As an employee with NEVORA installed on Android, I want to long-press the icon and open Schedule or Time off, so that I skip two taps.*

- **AC-C1** Given `manifest()`, when it returns, then it includes two `shortcuts`, in this order:
  - `name` "Schedule", `url` `/app/schedule`;
  - `name` "Time off", `url` `/app/requests`.
- **AC-C2** Given those URLs, when any role opens them, then they work: Schedule serves both roles, and `/app/requests` serves the employee's own requests and the manager's review (`src/app/app/requests/page.tsx:49`). The labels reuse existing navigation names.
- **AC-C3** Given a company that turned the Time off module off (B2), when the manifest route answers, then it leaves out the Time off shortcut, using `pathEnabled()` from `src/lib/workspace-presentation/modules`. If reading modules in the route isn't possible without a data change, then both shortcuts ship and the existing module-off page handles the case (Q4).
- **AC-C4** Given each shortcut, when it ships with an icon, then the icon is a 96 by 96 PNG of the matching Phosphor glyph (the `NavIcon` schedule and time-off icons), drawn locally from the Phosphor SVG with no paid generation, and with `purpose: "any"`.
- **AC-C5** Given the manifest test (`src/lib/notifications/manifest.test.ts`), when it runs, then the existing identity and icon assertions still pass and a new assertion checks the two shortcuts and that each `url` sits inside `scope: "/app"`.
- **AC-C6** Given Chrome DevTools › Application › Manifest on the fictional runtime, when I inspect it, then both shortcuts show with no warnings.
- **AC-C7** Given NEVORA installed on Android, when I long-press the icon, then both shortcuts appear and each opens its page in the installed app window.
- **AC-C8** Given a signed-out phone, when I open a shortcut, then the existing redirect sends me to `/login` (`src/lib/auth/session.ts:113`). This PRD doesn't change sign-in or add a return URL.
- **AC-C9** Given an offline phone, when I open a shortcut, then the existing offline page shows.

## 5. States

| State | A. Back | B1, B2. Employee Home | B3, B4. Preview | C. Shortcuts |
|---|---|---|---|---|
| Loading | Back during a route skeleton with a sheet open closes the sheet | "Loading Home…" unchanged | Unchanged | Shortcut opens the route skeleton |
| Empty | n/a | No current shift: unchanged layout | n/a | n/a |
| Error | n/a | "Schedule unavailable" unchanged; no current shift shown | n/a | Route error page as today |
| Offline | Back still closes sheets (no network needed) | Paused Home unchanged | n/a | Offline page |
| Reduced motion | Close after Back uses the existing close transition, which reduced motion already shortens or removes (Phase 3) | No new motion | n/a | n/a |
| Keyboard | Esc closes, focus returns to the opener | Reading order matches visual order | Sidebar keyboard order follows the new list | n/a |
| Screen reader | VoiceOver's two-finger scrub (Z gesture) still closes the More sheet (Owed testing script, step 3) | "Scheduled now" heading first; one h1 | Landmarks unchanged | System menu |
| 200% zoom and large text | Matrix repeated at 200% zoom on one surface per platform | Both blocks wrap; no clipping at 320 | Sidebar wraps or scrolls as live does | n/a |

## 6. Out of scope and later

| Item | Why | When |
|---|---|---|
| Back inside the Capacitor shell | No shell yet | Spike question 6 |
| Predictive back animations on Android | Needs a native shell opting in (T §4) | Store build |
| New sheets or a sheet redesign | Not approved | Not planned |
| A return URL after sign-in for shortcuts | Auth change; not approved | With the passkey auth phase |
| Role-specific shortcuts (for example Inbox for managers) | One manifest serves every role on the device | Q5 |
| iOS Home Screen quick actions, widgets, Live Activities | Native shell only (A12) | After the spike |
| Other preview gaps (no trail, no finder) | The finder button comes with `prd-phone-search.md` slice 3 | That PRD |
| Further plain-language sweeps | U5 covered the product; this PRD fixes one missed line | Not planned |

## 7. Dependencies and constants

**Reuse, don't rebuild:**

- A: `src/components/app-shell.tsx`, `action-menu.tsx`, `portal-account-menu.tsx`, `portal-device-setup.tsx`, `sheet-gestures.tsx`, `command-finder.tsx`; the native `popover="auto"` and `<dialog>` close paths.
- B1, B2: `src/components/employee-home-reviewed.tsx:245-277`; tests `employee-home-reviewed.test.tsx`, `employee-home-clock.test.tsx`; script `scripts/phase-e-home-browser-scenarios.mjs` (H01, H12).
- B3, B4: `src/components/ui-preview/home-preview.tsx`, `home-fixtures.ts`, `home-records.json`, `home-preview.test.tsx`; `sidebarNavigation()` and `sidebarActiveHref()` in `src/lib/navigation.ts:64-79`; `TodayTilesSurface` and `ClockMonitorCard`; `src/lib/time-zone-label.ts`.
- C: `src/lib/notifications/manifest.ts`, `src/app/fuel-portal.webmanifest/route.ts`, `manifest.test.ts`; `NavIcon` glyph names.

**Dependencies:**

- A3 needs Jose's physical iPhone and Android phone, and Jose's time to run the script. Reaching the fictional runtime from a phone needs no deployment: the Android phone uses `adb reverse` to `localhost`; the iPhone uses the Mac's local network address with the development-mode runtime (production's `Secure` cookie is dropped on local http, DESIGN.MD Owed testing). Any hosted preview needs Jose's explicit authorisation.
- C7 may need Jose's Android phone too: Chrome on an emulator image without Google Play services may install a plain shortcut instead of a WebAPK, and manifest shortcuts appear only on WebAPKs. Slice C2 finds out.
- No dependency on B5, B6, migrations or the native wrapper.

**Constants touched: none.**

- Navigation structure and key action names: no entry moves or renames. The preview catches up with the approved D3 sidebar. Shortcut labels reuse existing names.
- Script-pinned strings (DESIGN.MD U2, U5): "Scheduled now", "No upcoming published shift", "Loading Home…", "Refresh home", "Clocked In" and the next-shift-before-To-do order stay. The one changed sentence isn't script-pinned; its two unit tests change in the same commit.
- Teal, Inter, Phosphor, 44px targets: unchanged. Shortcut icons use Phosphor glyphs.

## 8. Metrics

| Metric | Today | Target |
|---|---|---|
| Back matrix cells that leave the page or do nothing (simulator and emulator) | Unknown; slice A1 measures | 0 after A2 |
| Same, on Jose's phones | Unknown | 0 |
| Extra Back presses needed after closing a sheet another way | Unknown | 0 |
| Employee Home with a shift under way: position of "Scheduled now" in the card | Second | First |
| Audit-language lines on employee Home (U5 scan terms) | 1 | 0 |
| Preview sidebar entries that differ from `sidebarNavigation()` (Owner, Employee) | 6, 2 | 0, 0 |
| Preview figures that disagree (Today vs rail; preview date vs Today date) | 2 | 0 |
| Taps from the Android Home Screen to Schedule | 2 (open, Schedule tab) | 1 (long press › Schedule; a long press counts as one) |

## 9. Release slices

Parts A, B and C ship independently. Each slice ends with a checkpoint: the UI Engineer posts evidence, the Product Designer reviews, and nothing is committed until Jose approves at Checkpoint 3.

| Slice | Contents | Checkpoint evidence |
|---|---|---|
| **A1. Back matrix** | AC-A1, no code change | The matrix with recordings, in `docs/product/specs/phone-polish/build-report.md` |
| **A2. Fixes** | AC-A2 for failing cells only | The matrix re-run; U1, U4, U8 flow checks; 156-check sweep; desktop Esc check |
| **A3. Jose's phones** (Jose-only step) | AC-A3. The UI Engineer prepares a one-page script: open each surface, press Back, note the result | Jose's filled matrix |
| **B1. Employee Home order and sentence** | AC-B1, AC-B2 | Unit tests; H01 and H12 if a disposable database is available, otherwise a recorded gap; screenshots at 390 and 1440 with and without a current shift; zero diff without one |
| **B2. Preview fixes** | AC-B3, AC-B4 | Preview at 390 and 1440 for all three roles; preview tests |
| **C1. Manifest shortcuts** | AC-C1 to AC-C6, AC-C8, AC-C9 | Manifest test; DevTools manifest screenshot; installed desktop Chrome on the Mac showing the shortcuts |
| **C2. Android check** | AC-C7 on the emulator, or on Jose's Android phone (Jose-only) if the emulator can't mint a WebAPK | Long-press screenshot |

## 10. Open questions

| # | Question | Recommendation |
|---|---|---|
| Q1 | How should Back close sheets on iOS, where there's no close-request API and the edge swipe walks history? | Decide after A1. If iOS fails, push one history entry when a sheet opens and remove it on every other close path (AC-A2.3), scoped to the phone layout. If the App Router conflicts with that, ship Android-only fixes and record iOS as a known gap for the shell to solve |
| Q2 | With a shift under way, does the card's heading stay "Next shift"? | Keep the `h2` "Next shift" and its id for the scripts, and lead the card body with the "Scheduled now" block as the UX Designer lays it out. Renaming it breaks the unit test's order check (`indexOf('Next shift')`) and the H01 check wording for little gain |
| Q3 | Should the preview pass fictional payroll capabilities so the Owner sidebar shows Payroll? | Yes. Pass `enabled` and `canReview` as fictional flags, which affect navigation only and mount no payroll reader. The preview then shows the 10-entry D3 list reviewers expect |
| Q4 | Read company modules in the manifest route to drop Time off when it's off? | Yes, if `currentPresentation()` reads modules the way `currentBrand()` reads the brand, since both already serve this route's data. If not, ship both shortcuts and rely on the module-off page |
| Q5 | Add a third, manager-only shortcut (Inbox)? | No. One manifest serves every person on the device, and an employee would see a shortcut that refuses them |
| Q6 | Ship shortcut icons or let the platform use the app icon? | Ship the two Phosphor icons. Android shows a generic glyph without them, which looks unfinished |
