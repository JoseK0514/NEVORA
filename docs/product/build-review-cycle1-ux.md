# Cycle 1 build review: UX

- **Step:** 5 of the cycle (Review). Jose decides on the commit at Checkpoint 3.
- **Reviewed:** 2026-10-17 by the UX Designer.
- **Code:** worktree `.claude/worktrees/agent-af4063da4b128f176` (base `ce4fcb2`, run 1 plus run 2, uncommitted), read with `git diff`. I edited nothing there.
- **Specs:** `docs/product/specs/{phone-search,owner-setup-card,phone-polish,phone-foundations}/` (`spec.md` is authoritative; `flows.md` for flows and states).
- **Evidence I read:** each `build-report.md`, `build-run-1/` and `build-run-2/` screenshots, `phone-polish/build-run-1/history-{chromium,webkit}.json`, `a2-after-matrix-chrome-*.json`, `phone-foundations/build-run-2/data/inventory-buttons-p1-{before,after}.json`.
- **My own browser check:** I copied the worktree to my scratchpad, ran `next dev` there and opened `/ui-preview/home` (fictional data, no database) at 390×844, 375×667 and 320×700, at the default root and with the root set to 200%. Then I stopped the server. That run found M1 below. I did not sign in to the full portal and ran nothing on a simulator or device.

## Summary

| Initiative | Verdict | Must-fix before commit | Should-fix | Later |
|---|---|---|---|---|
| Phone search | Pass | 0 | 1 (device-dependent) | 2 |
| Owner setup card | Pass | 0 | 0 | 2 |
| Phone polish | Pass for what it built; iOS Back unbuilt | 0 | 1 | 2 |
| Phone foundations | Pass with one fix | **1 (M1)** | 2 | 5 |

1. **One must-fix:** at a large root the Owner and Manager Home masthead band stops at a fixed 112px while the heading grows. The workspace name then falls off the dark band, and its pale ink lands on white at about 1.3:1. The fix changes nothing at the default size (M1).
2. **Commit after M1.** Everything else predates this build, needs Jose's phones, or can follow as a listed change.
3. **iOS Back is still open.** The build wrote no history entries, because nobody could measure iOS. A3 on Jose's iPhone is the first iOS measurement, and an edge swipe with a sheet open will most likely still leave the page.
4. **Fix the Schedule menu tap-through before A3** (P1). It predates this build, but a dismissing tap that also changes the week can send a manager to edit the wrong week.

---

## 1. Phone search

**Verdict: pass.** Every state in spec §1.4 shows the exact copy, the status precedence fix holds at 390 and 1440, and focus returns to the opener on all three entries.

### Proven where

| Item | Browser (engineer) | Unit test or code only | Not proven |
|---|---|---|---|
| States and copy: loading, unavailable, offline, "No matches." precedence | Chromium and WebKit (checks 1.16 to 1.19; `after-s1-{loading,unavailable,offline}-390-chromium.png`) | `finderStatus()` tests (`command-finder.test.ts`) | |
| Names: "Search", "Close search", "Clear search", field "Search pages, people and places", dialog "Find a page, person or place" | Accessible names read in Playwright (1.11, 1.14); axe 0 violations both engines (1.21) | | VoiceOver and TalkBack speech |
| Keyboard order: header brand, chip, Search, bell; sheet field, Clear, Close; focus trapped | Chromium only (`after-focus-*-390.png`); WebKit doesn't Tab to buttons by default | | Safari with Full Keyboard Access |
| Focus return: header, More (to "More navigation"), ⌘K | Chromium and WebKit (1.13, 2.3) | `command-finder.tsx:70-76` | |
| Preview button and notice | Engineer (3.1, 3.2) and my run: tap shows status "Search is not connected in this sample." | | |
| Safe areas: panel carries the top inset, dialog padding 0, panel box equals dialog box | Chromium measurement (1.6a) | `portal-gusto.css` phone block | iOS Home Screen app status-bar tap |
| Keyboard raises on open | Android emulator, header entry only (`after-android-emulator-sheet-keyboard-up.png`) | `command-finder.tsx:65-67` focuses inside the tap | iOS Safari, iOS Home Screen app, More › Search on any real keyboard |
| Android Back | Emulator: first Back hides the keyboard, second closes the sheet (`a2-android-finder-*.png`) | | Real Android phone, installed PWA |
| iOS edge swipe with the sheet open | | | Not measured; likely leaves the page (no history entry) |
| 200% zoom (720 CSS px) and 320 | Chromium (1.22, `after-s1-zoom-720-chromium.png`) | | |
| 200% root | Run 2 converted the finder to rem; 51-view large-root run passed for the finder views | | |
| Landscape 844×390 | Chromium (1.3, `after-s1-open-844x390-chromium.png`) | | Real phone in landscape |
| Desktop zero diff | 0 property differences against the 1.0 baseline (1.15) | | |
| Forced colours, increased contrast | | CSS written | Not rendered |

### Findings

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| S1 | Should-fix if Jose's iPhone confirms it | With the keyboard up, the last rows of the list may sit behind the keyboard where you can't scroll them into view. The sheet is `height: 100dvh`, and the viewport meta sets no `interactive-widget`, so neither iOS Safari nor Chrome 108+ shrinks the layout for the keyboard. The empty query alone lists 9 rows plus 2 labels (about 540px under the search row), and on a 390×844 iPhone about 450px stays visible above the keyboard. In the emulator capture "Availability" is cut at the keyboard edge and "Time off" and "Shift requests" are out of sight. | `after-android-emulator-sheet-keyboard-up.png`; `src/app/layout.tsx:14-18`; spec check 1.7 only asks for the first row | On the device step, scroll to the last row with the keyboard up (empty and typed query). If a row can't be reached, pad the results list by the keyboard's height from `visualViewport` in the phone query (the shell already reads the keyboard in `src/lib/mobile-keyboard`). Leave `interactive-widget` alone: it would change every page |
| S2 | Later | The group label sits inside the first row of each group (`<span class="command-finder-group">` inside the `<li role="option">`). On phones the teal highlight wraps "Actions" together with "Add a shift", so row 1 reads as a two-line row, and a tap on the "Pages" label opens "Home". Desktop has had the same markup since U8 | `command-finder.tsx:137-140`; `after-android-emulator-sheet-keyboard-up.png` | Phone query: draw the highlight on the label and detail only, or render the group label as its own `role="presentation"` row before the option. Check U8 desktop parity |
| S3 | Later | The More › Search entry and the header button both depend on the iOS keyboard rule, and the More path now runs the A2 focus move (`sheet-gestures.tsx:91-97`) in the same tap before `open()` focuses the field. The code order is right (the field gets focus last, inside the click handler), but nobody has seen it on iOS | `app-shell.tsx:323-331`; `command-finder.tsx:57-68` | Device list item 4 |

---

## 2. Owner setup card

**Verdict: pass.** Copy matches spec §1.6 word for word (J3 wording, B2 nouns, two whole strings). Links name the step and describe the reason through `aria-describedby`. Tasks counts come from the filtered list. The card holds its last confirmed steps on a failed live read.

My run confirmed at 390 and 320: tab order goes Search, notifications, "Set coverage periods", "Set weekly hour targets", then the Today tiles. Each link is 44px tall, and each description matches spec §1.6. No sideways scroll at 320 with a 200% root.

### Proven where

| Item | Browser | Unit test or code only | Not proven |
|---|---|---|---|
| Two gaps, one gap, only-setup Tasks, zero gaps (card gone), Owner-only | Engineer at 320, 390, 1440 (`after-card-*.png`); real data change round trip (`after-mutate-{1,2,3}-*.png`) | | |
| Live read fails (500) and offline: card keeps "1 of 2 done" | Engineer (2.12, `after-card-failed-read-{390,1440}.png`) | | |
| Server read fails: no card | | Code path: the page returns "Dashboard unavailable" before rendering the dashboard | Browser |
| Zero locations (J2): "Add a location ›" | | `owner-setup-card.test.tsx`; ternary at `owner-setup-card.tsx:48-50`; `locationCount` comes from `locations.length` on the server | Browser |
| Landing focus on `#target-hours` | Engineer at 390 and 1440 (`after-card-landing-target-hours-*.png`) | `#coverage-staffing` by href and unit test | Coverage landing in a browser |
| Keyboard order | Chromium; my run | | WebKit with Full Keyboard Access |
| Names and descriptions | Playwright names; my run | | VoiceOver, TalkBack speech, including the Done row |
| 200% zoom and 200% root | Engineer (2.15, `after-card-zoom-*.png`; root-200 run); my run at 320 and 375 | | |
| Reduced motion, B1 Ocean brand | Engineer (2.16, 2.17) | | |
| Forced colours, increased contrast | | CSS written | Not rendered |

Safe areas: the card adds no inset, as specified. Platforms: the card is web content with plain links, so iOS, Android, desktop and PWA share one behaviour. Back from the settings page walks history, which can take two Backs after a coverage save (flows §1.2); the Home tab stays the one-tap return.

### Findings

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| C1 | Later, before release | Zero locations is the first-run state, and first-run Owners are the people this card serves. Only a unit test has rendered it | Build report gap; `owner-setup-card.tsx:48-50` | Render it once in a browser before release: a fresh fictional company with no location, or a preview fixture variant with `locationCount={0}`. Add it to Jose's device pass if a fresh company is to hand |
| C2 | Later | At a large root the card no longer straddles the masthead edge; it starts below the band. Harmless once M1 lands | My run, 375×667 at 200% root | None beyond M1 |

---

## 3. Phone polish

**Verdict: pass for what was built.** Part B (shift card, sentence, link names, 94% text) and Part C (manifest) match the spec. Part A fixed the Android crash on Back. iOS Part A was neither measured nor fixed.

### The A2 fix (`src/components/sheet-gestures.tsx:87-97`, `:103`)

- **What it does:** a capture `beforetoggle` listener. When a phone sheet (`--sheet: 1`) is about to close with focus outside it, the listener gives the sheet `tabindex="-1"` and focuses it without scrolling. The popover then restores focus as the platform does. It writes no history entry, so the App Router's `history.state` stays untouched (A2.11 pass).
- **Phone only:** `isSheet()` reads `--sheet`, which desktop menus don't set. A2.5 confirms desktop Esc and Back unchanged.
- **Back results after the fix:** Android Chrome 133, button and gesture navigation: Manager More, both page menus, employee More and the finder close and stay; no surface open, Back navigates as before (`a2-after-matrix-chrome-*.json`, `a2-android-*.png`). 200% font scale on Manager More passes.
- **Other close paths** (history script, Chromium and WebKit, 390): 14 of 15 pass in each engine. `history.length` and URL hold after Close actions, Esc, tap outside and swipe down; a chosen link leaves `[page, new page]` and one Back returns with the sheet closed. The failure is P1.
- **Focus after closing:** Chromium returns focus to "More navigation" or "More" after Close actions, Esc, swipe and a chosen link; tap outside leaves focus on `BODY`. WebKit leaves focus on `BODY` after every path, because Safari doesn't focus a button on click, so the popover has no opener to return to (`history-webkit.json`). Spec Part A asks for return to the opener after Back. That holds in Chromium; on iOS it needs VoiceOver to judge (device item 7).
- **Not yet known:** whether moving focus before close affects a tap outside that lands on a text field. The tapped field might lose focus to the restored opener. Device item 9.

### Proven where

| Item | Browser or emulator | Unit test or code only | Not proven |
|---|---|---|---|
| Android Back on sheets (Chrome tab) | Emulator, Chrome 133, both navigation modes | | Real phone on current Chrome; installed PWA cells |
| History integrity per close path | Playwright WebKit and Chromium | | |
| iOS Safari edge swipe, iOS Home Screen app | | | Not measured (no simulator run). Expect "leaves the page" in Safari and "no system Back" in the Home Screen app |
| Shift card order, headings, one zone line, countdown on the future block only | Engineer, Chromium and WebKit (B1.1 to B1.3); my run in the preview: `h2` "Your shifts", `h3` "Scheduled now", `h3` "Next shift", one zone line | | |
| Link names "View schedule, {date}" | Engineer (B1.6a); my run: "View schedule, Tue, Oct 13" and "View schedule, Wed, Oct 14" | | Speech |
| 94% text contrast | Measured from pixels: 5.23:1 default, 6.23:1 Ocean, 5.01:1 yellow stress (B1.7) | | |
| Next-shift-only state (B1.4) | | Unit test and CSS | Browser: the fixture always had a shift under way |
| Preview sidebar and figures | Engineer (B3, B4) | `home-preview-shell.test.tsx` | |
| Manifest shortcuts | CDP manifest parse (C.6) | `manifest.test.ts` | Android long press (C2), installed desktop Chrome |

### Findings

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| P1 | Should-fix before A3 (predates this build) | A tap outside the Schedule page menu closes the menu and also follows the link under the tap. In the history run it opened `/app/schedule?week=2026-10-12`: the manager tapped to dismiss and the schedule moved to another week without notice. A manager who then edits shifts may edit the wrong week | `history-chromium.json` and `history-webkit.json`, "schedule page menu / tap outside", `pass: false`; same on untouched `ce4fcb2` | On phone sheets, a tap outside only closes. When a phone sheet closes by light dismiss, swallow the click that ends that tap, with the pattern `sheet-gestures.tsx:76-78` already uses after a swipe. Apply it to every phone sheet, not only this menu. Re-run the history script: 15 of 15 |
| P2 | Decision at A3 (predates this build) | Tap outside a phone sheet still crashes Chrome 133 on the emulator. See open point 3 | Build report "Known gaps"; `a1-android-before-more-after-back-crash.png` | See open point 3 |
| P3 | Later | The employee preview shows no countdown on the next shift. The preview freezes its data at 2026-10-13 while `Countdown` counts from `Date.now()`, so the shift sits in the past and the pill hides. Reviewers can't see B1.3 in the preview | My run; `employee-home-reviewed.tsx:75-87` | Give `Countdown` the preview's frozen time in the preview only, or move the fixture shifts relative to today |
| P4 | Later | B1.4 (next shift only, no shift under way) has no browser capture | Build report | Capture it on the next fictional run outside 8 AM to 4 PM, or with a fixture employee who has no shift today |

---

## 4. Phone foundations

**Verdict: pass with one must-fix (M1).** Step A shows 0 differences at the default size across 245 views. Desktop stays in px. Tab labels hold 13px on one line at 200% on all 51 views. Inputs stay at 16px or more, and every phone primary and secondary button keeps 8px corners and 44px or more. The day picker and J1 marks match §1.5 and §1.6, and "Refresh" keeps the name "Refresh timecards".

### Proven where

| Item | Browser | Unit test or code only | Not proven |
|---|---|---|---|
| Zero diff at default (A.1 to A.3) | Snapshot runs, Chromium | | |
| 200% root (A.5, A.6) | 43 of 51 views pass in Chromium (root 200% and real 32px default font); 42 of 51 in WebKit | | Loading, error, offline, partial and permission states at 200% (S.1 partial) |
| 200% zoom, 400% reflow | 7 pages | | The 81-view run |
| Keyboard and focus clear of sticky chrome | 4 pages at 390, 28 to 30 stops each | | |
| Day picker: chosen ring, today dot, `aria-pressed`, ", today", scroll on load without page scroll | Chromium 36/36, WebKit 35/36 (6.1 to 6.8); `picker-*-track.png`, `picker-390-forced-colors.png` | `manager-weekly-roster.test.tsx` | Speech ("Sat, 17, today, selected") |
| "Refresh" visible, "Refresh timecards" name | 320, 390, 1440 both roles (4.1); `timecards-manager-320.png` | | Speech |
| Safe areas | Tab bar keeps `env(safe-area-inset-bottom)` (unchanged) | | Notch and home indicator on a real phone |
| Platforms | Chromium, WebKit | | Firefox and Samsung Internet with a large default font: the only people who see text grow before the store shell |

### Findings

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| **M1** | **Must-fix before commit** | The Owner and Manager Home masthead is a `.page-frame::before` band with `height: 112px`. The heading above the card now grows with the root, but the band does not. At 375×667 with a 200% root, the workspace name's last line ends at 111.4px, on the band's last pixels. At 320 it wraps to two lines and the second line ("Workforce") sits on the white canvas in `--mh-masthead-secondary` #CFE3E1, about 1.3:1. A longer company name hits the same problem at 390. Before this build the heading stayed in px and always fit. The large-root checker didn't flag it because it looks for overflow and clipping, not text that leaves its background | `src/components/manager-home-mobile.css:59-61` (band), `:68` (subtitle colour); my run of the worktree preview, Owner, 320×700 and 375×667, root 200%; engineer's `root-200/root200-390-owner-_app.png` (name on the band's bottom edge) | Make the band end a fixed overhang below the heading's last line at any root and any name length, and keep 112px at a 16px root. Two ways: draw the band from `.mobile-home-heading` (background with negative side margins, a px `padding-bottom` for today's overhang, the card pulled up by the same amount), or, if the name never wraps, `height: calc(58px + 3.375rem)`, which is 112px at a 16px root. Prove it with the step A snapshot (0 differences at 320, 375, 390) and a 200% root capture at 320 with a 40-character fictional workspace name. Add a check to `scripts/dev/large-root-check.mjs`: text whose computed colour fails 4.5:1 against the colour behind it |
| F1 | Should-fix | Stacked button pairs don't share one order. Spec §1.4 says buttons stack "primary first". In the after inventory, 7 pairs stack with the secondary on top: employee Requests "Cancel" over "Submit request" (320), Availability "Reset changes" over "Save normal availability" (320 and 390), Break types "Reload break types" over "Add break type" (320), Clocker "Refresh devices" over "Add device" (320), Payroll "Refresh" over "Prepare a draft" (320), New employee "Cancel" over "Create employee" and Workspace "Cancel" over "Save workspace" (390). Timecards, Reports, Payroll export, Policies and Branding put the primary on top. The person learns the primary's place on one page and finds the other button there on the next | `build-run-2/data/inventory-buttons-p1-after.json` (parent and width per button; both full width means stacked) | When a pair stacks on phones, the primary comes first in visual and focus order. Reorder those components' DOM so the primary comes first and keep desktop's left-right order with `flex-direction: row-reverse` in the desktop rule. Don't use CSS `order` alone: focus order would no longer match what you see. List it as a step B change; payroll copy stays unchanged |
| F2 | Should-fix, next cycle | 8 of 51 views fail at a 200% root. See open point 1 | Build report "Known gaps"; `root-200/*.png` | See open point 1 |
| F3 | Later | Day picker: after a tap, `scrollIntoView({ block: 'nearest' })` can nudge the page when the picker straddles the fold at 390, where spec §1.5 says it sits. The spec assumed the picker would be on screen in full | `manager-weekly-roster.tsx` (new effect on `day`) | Scroll only the picker after input as well (set its `scrollLeft`, the method the load path already uses) |
| F4 | Later | Evidence gap: `day-picker/picker-{320,390}-{loaded,fullweek,today-chosen}.png` show the roster header and "Search team", not the picker. The `*-track.png` files do show it (`picker-320-track.png`: Sat 17 chosen with ring and dot) | Those files | Re-capture the six crops on the next run |
| F5 | Later | Employee Timecards at 320 stacks the date fields and both buttons at the default size. Spec §1.4 says side by side at 390 and 320. The employee layout already stacked before this build, and labels stay on one line | `day-picker/timecards-employee-320.png`; before inventory (both buttons 248px wide at 320) | Accept; correct the spec table |
| F6 | Later | Five single buttons wrap at 320. See open point 2 | B.2 | See open point 2 |
| F7 | Later | The 48px "lone primary" also catches short buttons ("Add shift", "Create link") | Build report | Accept 48px: they are page-level actions and the larger target costs nothing. No change |

Tab labels moving from 10px to 12px on employee Home, lead Home, the employee preview and owner `/app?view=*`: accept. 12px was the measured baseline the spec assumed, and 10px sat below every floor we use.

---

## 5. Views on the open points

### 1. 200% root failures: fix before commit, or follow-up?

**Follow-up, not before commit.** Two reasons:

- Today, only Firefox and Samsung Internet users with a raised default font size see these pages grow (spec §1.10). iOS and Android Chrome users see nothing change until the store shell maps the OS text size to the root.
- Each fix moves the default layout by a pixel or two. Each needs its own listed step B change and snapshot, and Jose should approve it as listed, not find it in a diff.

Group them as two follow-ups:

| Follow-up | Views | Default-size change to list |
|---|---|---|
| **Fold into J2** (next cycle's segmented-control pass, which already re-snapshots those controls) | Inbox (owner and manager), Settings › Positions, Settings › Break types | `position: relative` on the Inbox filter buttons so the hidden count stays inside the scroll box; filter segments that scroll sideways instead of clipping at the card edge |
| **"Large text" item** (its own small listed change, phone only) | Availability, Settings › Features, Settings › Branding, Payroll export | Availability toggle column grows with its label (rows move about 1.8px, and the label already overflows by 1.8px today); Features grid track contained; Branding result cells allowed to wrap; Payroll export selection bar wraps so "Clear selection" stays whole |

**Should the Inbox fix go with J2? Yes.** The fix sits in a J2 control, and J2 already covers Inbox filters with its own inventory and snapshot. Splitting them would mean two snapshot runs over the same control. In the 200% capture the first filter reads "iew 40" and the page scrolls 25px sideways (`root-200/root200-390-owner-_app_inbox.png`). Inbox is one of a manager's four tabs, so J2 should take it first.

Payroll export "Clear selection" is the one with a lost label on an action. Put it first in the "Large text" item.

### 2. Five labels wrap at 320; pairs wrap onto two rows

- **Five labels: accept.** "Name your first template", "Generate reviewed export", "Save normal availability", "Validate and import amounts" and "Save company preferences" wrap to two balanced lines inside a full-width button, with nothing cut. Before the build these labels wrapped to three or four lines inside half-width pills (before inventory). Don't shrink the type to fit. "Generate reviewed export" and "Validate and import amounts" are payroll copy and stay as approved. The other three can get shorter labels in the B5 copy pass if the PM wants.
- **Pairs on two rows: accept the stacking, fix the order (F1).** One-line labels in full-width buttons beat three-line labels in half-width pills: easier to read, larger targets, the familiar stacked pattern. The open problem is that half the stacks put the primary on top and half put it underneath.

### 3. Tap-outside crash on Android Chrome 133

**Don't block the commit.** It predates this build, and the build fixed the path most people use (Back). Chrome 133 dates from early 2025; a real phone on today's Chrome may not crash at all.

Let A3 decide. On Jose's Android phone, record the Chrome version, then tap outside the Manager More menu, the employee More sheet and the Schedule menu:

- **No crash:** log it as an emulator-only Chrome 133 bug and change nothing.
- **Crash:** a tab crash loses the person's place and any unsaved work, which costs far more than a shorter exit animation. Drop `overlay` and `display` from the phone sheets' exit transition. You lose part of the Phase 3 exit animation (the sheet and backdrop may leave without their full fade). Jose approves that as a listed motion change, and the P1 click-swallow fix ships with it.

### 4. Tap outside the Schedule menu also follows the link underneath

**Fix it now, before A3 (P1).** On iOS and Android, a tap on the dimmed area only closes a sheet (Jakob's law). Here the dismissing tap also changed the week. Jose should test the fixed version on his phones, not the old one. The fix is a few lines in the file A2 already touched, and the history script proves it.

### 5. Setup card states shown only in unit tests

The live-read failure was shown in a browser (`after-card-failed-read-*.png`). Two states were not:

- **Server read failed:** accept the code-path proof. The page returns "Dashboard unavailable" before the dashboard renders, so the card can't appear. Forcing it would mean breaking the database.
- **Zero locations (J2):** accept for the commit and render it in a browser before release (C1). The logic is a two-branch choice on `locationCount === 0`, fed by the server's `locations.length`, and a unit test covers both branches. The state still deserves a real look, because a new Owner with no location meets it on day one.

### 6. Phones show "Refresh" while the name stays "Refresh timecards"

**Accept.** The visible word starts the accessible name, so WCAG 2.5.3 holds, and Voice Control's "Tap Refresh" works. A screen reader user hears the fuller name, which says more on a page that has other refresh controls. The employee path already ships the same pair (`timecards.tsx:156`), so managers and employees now match. `phase-d-browser-qa.mjs:66,70,82` keeps pressing "Refresh timecards" and passes (4.1).

---

## 6. Jose-device list

About 30 minutes after M1 and P1 land. Use the fictional runtime over `adb reverse` (Android) and the Mac's local address (iPhone), with no deployment. Record the phone model, OS version and browser version for each.

| # | Check | iPhone Safari tab | iPhone Home Screen app | Android Chrome tab | Android installed app |
|---|---|---|---|---|---|
| 1 | **A3 Back matrix:** with each surface open (employee More, Manager More, Schedule menu, Locations menu, finder sheet), use Back. Expect "closes and stays". Then close another way and Back once: you leave the page in one press | Edge swipe (expect "leaves the page"; if so, iOS needs a history-entry build under rules 1 to 8) | Record "no system Back"; confirm Close actions, swipe down and Close still work | System Back, button and gesture navigation | Same; these cells were never run |
| 2 | **iOS swipe-back** with More open, with the finder open and with no sheet open | ✓ | n/a | n/a | n/a |
| 3 | **Tap-outside crash:** tap outside each sheet. Record the Chrome version | n/a | n/a | ✓ | ✓ |
| 4 | **Keyboard raises** from the header Search button and from More › Search | ✓ | ✓ | ✓ | ✓ |
| 5 | **Finder with keyboard up (S1):** empty query and "ma": scroll to the last row. Can you reach it without closing the keyboard? | ✓ | ✓ | ✓ | |
| 6 | **Status-bar band (1.6a):** tap above the field in the finder; the sheet stays open | | ✓ | | ✓ |
| 7 | **VoiceOver:** header button ("Search, pop-up button"); finder field name; status line read once on change; "Clear search", "Close search"; where focus lands after closing More (WebKit put it on the page body in Playwright); setup card ("Set coverage periods, link", then its reason; the Done row as "Coverage periods, Done", not run together); "View schedule, Tue, Oct 13"; "Refresh timecards"; day picker "Sat, 17, today, selected"; the two-finger scrub closes More | ✓ | ✓ | | |
| 8 | **TalkBack** (optional, same list as 7) | | | ✓ | |
| 9 | **Tap outside onto a text field** with a sheet open: the field keeps focus and the keyboard opens (A2 side effect) | ✓ | | ✓ | |
| 10 | **Safe areas:** finder field clear of the Dynamic Island or status bar; last result above the home indicator; tab bar above the gesture bar | ✓ | ✓ | ✓ | ✓ |
| 11 | **C2 shortcuts:** long-press the icon; Schedule then Time off; each opens in the app window | n/a | n/a | n/a | ✓ |
| 12 | **Large text:** Samsung Internet or Firefox with the largest default font: Owner Home masthead after M1, Inbox, Timecards | | | ✓ | |
| 13 | **Zero locations (C1),** if a fresh fictional company is to hand: the card shows "Add a location ›" | ✓ | | | |

Desktop web needs nothing from Jose's devices: Chromium and WebKit runs cover it, and installed desktop Chrome shortcuts (C.6) can wait.

---

## 7. Gaps in this review

- I didn't sign in to the full portal, so every live-app claim rests on the engineer's evidence files and on the code. My own browser check covered `/ui-preview/home` only.
- I didn't run a screen reader, a simulator or a device.
- The M1 measurement comes from the preview, which uses the same Home CSS and masthead rule as the live app (`manager-home-mobile.css:59-61` applies to any `.manager-portal-home` page). The engineer's live 390 capture at 200% shows the same band edge.
