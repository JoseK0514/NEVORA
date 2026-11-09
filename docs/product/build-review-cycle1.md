# Cycle 1 build review: combined sign-off

- **Step:** 5, Review. Feeds Jose's Checkpoint 3 (commit approval).
- **Written:** 2026-10-17 by the Product Designer.
- **Inputs:** `build-review-cycle1-ui.md` (UI Designer), `build-review-cycle1-ux.md` (UX Designer), and each initiative's `spec.md`, `review.md` and `build-report.md` under `specs/{phone-search,owner-setup-card,phone-polish,phone-foundations}/`.
- **Code read:** worktree `.claude/worktrees/agent-af4063da4b128f176` (base `ce4fcb2`, run 1 plus run 2, uncommitted). I edited nothing there. Line numbers below refer to that worktree.
- **IDs:** both reviews used "F1" and "S1" for different things. Here every item carries its source: `UI-` for the UI review, `UX-` for the UX review.

## Summary for Jose

I recommend you approve the commit once one short fix loop passes its checks.

All four initiatives do what you approved. Search on phones works from the header and from More. Owners get the setup card. Employees see the shift they're on first. Android Back closes sheets without crashing. Phone text is ready to grow with the reader's text size. On desktop, only Schedule changes (the day picker and the teal marks you approved as J1).

The two reviews found three problems that matter, plus several small ones:

1. **Owner and Manager Home at large text:** the workspace name can slide off the dark band onto white, where it becomes almost unreadable. This build caused it. The fix changes nothing at normal text size.
2. **Payroll export on wide phones (430px, iPhone Pro Max and Plus):** employee rows jump from two columns to three or four and the figures land out of order. This build caused it, and it's a payroll page.
3. **Tapping outside the Schedule menu also taps the link underneath it,** so a manager can land on a different week without noticing. This bug predates the build, but your approved spec includes a check for it that still fails.

The loop also fixes seven small items: four phone-only, one restored header spacing, one focus ring, and one alignment on the new desktop setup card. Each has a check that proves it. Anything bigger becomes a listed follow-up.

You have seven decisions to make (section 3). My answers in short: keep `--type-unit` with guardrails; accept 12px tab labels; one 44px button height on phones; the large-text gaps go to J2 and a separate "Large text" item; restore 18px between the NEVORA wordmark and a company logo; accept the five wrapping labels; let your Android phone decide on the tap-outside crash.

Your phones aren't needed for the commit. They are needed before release: about 45 minutes (section 5).

---

## 1. The fix loop

The UI Engineer makes these changes in the worktree, runs every check, and doesn't commit. If a check fails, the engineer reverts that item and reports it. LOOP-1 and LOOP-2 are blockers: if either can't pass, the commit waits.

### 1.1 Code changes

| Loop | ID | What | Files and lines | Exact fix | Check that proves it |
|---|---|---|---|---|---|
| 1 | UX-M1 | Home masthead band stops at 112px while the heading grows; at a 200% root the workspace name ends up on white at about 1.3:1 | `src/components/manager-home-mobile.css:59-61` (band), `:64-68` (heading) | Keep the `.page-frame::before` band at 112px, so the default stays pixel-identical. In the same phone query, add to `.manager-portal-home .mobile-home-heading`: `border-image: linear-gradient(var(--mh-masthead) 0 0) fill 0 // 8px 100vw 46px;`. The band then reaches 8px above the heading and 46px below its last line at any root and any name length, which matches today's 22px overlap with the first card. If an ancestor clips the outset, use the UX review's option (a) instead: draw the band from the heading with negative side margins | (a) Step A snapshot at 320, 375, 390 on Owner and Manager Home: 0 pixel differences; the computed-style diff shows only the new `border-image` on `.mobile-home-heading`. (b) 200% root at 320×700, 375×667 and 390×844 with a 40-character fictional workspace name: every heading line sits on the band, with at least 22px of band under the last line. (c) Ocean and yellow stress brands at 390, 200% root: subtitle on the band at 4.5:1 or more |
| 2 | UI-F1 | Payroll export employee rows grow to 3 or 4 columns at 430 to 600px; figures land out of order | `src/components/payroll-export.module.css:142` (inside `@media (max-width: 600px)`) | `.employee { grid-template-columns: 18px repeat(auto-fit, minmax(max(6rem, calc((100% - 42px) / 2)), 1fr)); }` (42px is the 18px checkbox track plus two 12px gaps) | Chromium and WebKit at 320, 390, 430, 540 and 600, 16px root: 2 figure columns, `.hours:nth-last-child(2)` in column 2. At a 32px root: 1 column up to 430. Screenshots at 430 and 540 added to `build-run-2/after/` |
| 3 | UI-F2 | The 48px "lone primary" rule never wins: the base rule's `:is()` list carries more weight | `src/app/app/portal-gusto.css:144` | Delete the rule at `:144`. Every phone primary and secondary stays at 44px, which is what every after screenshot and the inventory already show. (Your call on D5 is in section 3, item 3) | Step A snapshot at 320, 375, 390 across the 49-path plan and the chrome plan: 0 computed differences, which proves the rule was dead. If any element changes, the engineer lists it by page and label before going on. Button inventory at 320 and 390: same heights as `inventory-buttons-p1-after.json` |
| 4 | UX-P1 | A tap outside a phone sheet closes it and also follows the link underneath; Schedule moved to another week. Fails spec check A2.10 (`phone-polish/spec.md:259`), which lists tap outside as a close path | `src/components/sheet-gestures.tsx:38-46` (pointer down), `:91-97` (`onBeforeToggle`), pattern at `:76-78` | In a capture `pointerdown` listener, set a flag when a primary pointer goes down outside every open phone sheet (`isSheet`) while one is open. Clear it on `pointercancel`, and on `pointerup` after `setTimeout(0)`. In `onBeforeToggle`, when a phone sheet closes while the flag is set, install the same one-shot capture `click` swallow as `:76-78`. Desktop menus and taps inside a sheet don't change | History script, Chromium and WebKit at 390: 15 of 15 (Schedule page menu, tap outside: URL and `history.length` unchanged). New cells: tap outside Manager More and employee More onto a link below: URL unchanged. A2.5 at 1440: desktop Esc and menus unchanged. Android emulator: Back matrix as in `a2-after-matrix-chrome-*.json` |
| 5 | UI-F3 | Reports at 390: "View period" and "Refresh" don't line up with the two date fields above them (gutters 17px apart) | `src/components/reports.module.css:113-114` (inside `@media (max-width: 600px)`) | Replace `.toolbar { display: flex; flex-wrap: wrap; }` with `.toolbar { display: grid; grid-template-columns: repeat(auto-fit, minmax(max(7rem, calc(50% - 5px)), 1fr)); }` and delete `.toolbar label { flex: 1 1 calc(50% - 5px); }`. Same pattern as manager Timecards (`timecards.module.css:155`) | Reports at 320 and 390: field and button column edges match within 1px; buttons 44px, one line each. 200% root at 390: one column, no sideways scroll |
| 6 | UI-F4 | Employee Timecards "View period" and "Refresh" stay at 48px; spec §1.4 says 44px for both roles. The cause is a fixed height, which also stops the buttons growing at large text | `src/app/employee-mobile-corporate.css:194` | Change `height: var(--corporate-action-height);` to `height: auto;`. The shared phone rule then gives `min-height: 44px`. (The UI review's fix, adding the classes to the pair list, won't help: they're already in it at `portal-gusto.css:145`) | Inventory, employee `/app/timecards` at 320 and 390: both buttons 44px, one line. 200% root at 390: the labels sit inside the buttons, nothing overflows |
| 7 | UI-F5 | Pair gaps of 8px and 10px where spec §1.3 says 12px | `src/app/app/employees/new/new-employee.css:98`; `src/app/app/requests/time-off.css:122`; `src/components/reports.module.css:112` (`.exports`) | Set `gap: 12px` in all three. These are rules this build added; desktop keeps its own values | Computed `column-gap` and `row-gap` 12px on all three at 390; step B diff lists exactly these three |
| 8 | UI-C1 | Desktop setup card: "Finish setting up" sits 10px above the step titles | `src/components/manager-home-gusto.css`, desktop card block (`@media (min-width: 900px)`, near `:423`) | Add `html body .app-shell.nevora-portal .manager-portal-home .owner-setup-summary { padding-top: 10px; }` in that block. **Listed desktop change:** Owner Home at 900px and wider, setup card only. The card is new in this build, so no existing user loses anything | 2x crops at 1440 and 1920: heading top aligns with the step titles within 1px. Card height unchanged; the Today strip starts at the same y as `after-card-two-gaps-1440.png` (y 337). Desktop snapshot: the only differences sit inside `.owner-setup-summary` |
| 9 | UI-S2 | With focus on Clear, its ring merges with the field's teal border | `src/app/app/portal-gusto.css:431`, `:444` (phone query; on desktop the field is `display: contents`) | At `:431` change `.command-finder-field:focus-within` to `.command-finder-field:has(input:focus)`. At `:444` give `.command-finder-clear:focus-visible` its own `outline-offset: -2px`. Close keeps its 2px offset | Keyboard at 390: Tab from the field to Clear; the field border turns grey and Clear's ring sits inside its 44px target. Screenshot replaces `after-focus-clear-390.png`. Desktop finder snapshot at 1440: 0 differences |
| 10 | UI open point 1 | With a company logo, the chip now sits 10px from the NEVORA wordmark (18px before this build) and reads as part of the lockup | `src/app/app/portal-gusto.css:490` | Change `margin-left: 10px` to `margin-left: 18px`. Keep `flex-wrap: nowrap` and the 40px chip minimum. Restores the spacing users see today | 320, 375, 390, Ocean brand with the fictional logo and a bell count: one header row, nothing clipped, chip about 58px at 320 and up to its 88px cap from 350px. Without a logo: 0 differences |

### 1.2 Evidence only

| Loop | ID | What to capture |
|---|---|---|
| 11 | UI-S3 | `after-focus-close-390.png` again, after a real Tab press, showing the ring on "Close" |
| 12 | UI-F6, UX-F4 | Re-capture the day picker crops named for states they don't show: `picker-1440-track`, `picker-390-today-chosen`, `picker-320-fullweek`, `picker-1440-fullweek`, `picker-{320,390}-loaded`, and forced colours at 390 and 1440 |
| 13 | UI gap | Owner Home at 800px, setup card in its stacked layout |
| 14 | UX-P4 | Employee Home with no shift under way (B1.4), if the loop runs outside the fixture's 8 AM to 4 PM shift |

### 1.3 Regression checks for the whole loop

- Step A snapshot at 320, 375 and 390, 49-path plan plus chrome plan: every difference maps to loops 1 to 10.
- 1440 and 1920: every difference sits inside the setup card summary (loop 8), plus Schedule as in run 2.
- `pages-test.mjs` 156 ok; U1, U2, U3, U4, U6, U8, B3, B4 and D1 to D6 ok; default brand and the yellow stress brand.
- Large-root run, 51 views: at least the same 43 pass in Chromium; Owner and Manager Home pass the new band check.
- `tsc`, eslint on changed files, vitest: 0 failures. Payroll copy diff empty.

---

## 2. Follow-ups and rejected items

### 2.1 Listed follow-ups

| ID | Item | Where it goes | Why not in the loop |
|---|---|---|---|
| UX-F1 | Stacked button pairs show the primary first on five pages and second on seven | Cycle 2 phone pass: pick one rule and apply it with its own inventory | See 2.3. The spec doesn't settle it, and the only clean fix changes desktop DOM order |
| UI-S1, UX-S2 | The finder's first-row highlight swallows the group label; a tap on the label opens the first row | Cycle 2 desktop finder pass, together with PRD Q3 (44px desktop rows) | The markup fix changes desktop. Needs a listed desktop change and U8 parity |
| UX-S1 | With the keyboard up, the last finder rows may sit out of reach | Device item 3. Fix only if confirmed: pad the list by the keyboard height from `visualViewport` in the phone query | Unproven; emulator only |
| UX-S3 | More › Search raising the iOS keyboard | Device item 3 | Needs an iPhone |
| UX-P2 | Tap outside a phone sheet crashes Chrome 133 on the emulator | Device item 2; see section 3, item 7 | Your phone decides |
| UX-F2 | 8 of 51 views fail at a 200% root | Two groups, see section 3, item 4 | Each fix moves the default layout and needs its own listed change |
| UX-F3 | Day picker: `scrollIntoView` after a tap can nudge the page | Next Schedule pass: set the picker's `scrollLeft` after input too | Follows spec §1.5 as written; the spec needs the change first |
| UX-C1 | Zero-locations card state only rendered in a unit test | Before release: preview fixture with `locationCount={0}`, or device item 8 | Logic covered by test; needs one real look |
| UX-P3 | Employee preview hides the countdown (frozen data, live clock) | Next preview pass | Preview only |
| UI-L1 | Sub-15px phone text kept in rem (Reports, Payroll export, Schedule "Today") | Next phone pass: floor sweep | Predates the build; step A had to keep it |
| UI-L2 | Timecards rows stack two full-width buttons (+201px at 390) | Timecards pass: one primary per row, "Finalize period" to the row menu | Behaviour change |
| UI-L3 | Preview Today strip and Tasks pill don't match the live look | Next preview pass | Preview only |
| UI-L4 | Pass location line 15px against spec's 17px | Next pass card pass | AC-B1.4 allowed only the opacity change |
| UI-L5 | Landscape header without wordmark; employee "To do" double edge at 1440; Locations chip ink fill | Landscape pass; desktop pass; J2 | Predate the build |
| UI-OP6 | `--type-unit` guardrails | DESIGN.MD entry and a dev-only lint script, before cycle 2 starts | Documentation and tooling, no UI change |
| UX-F5 | Employee Timecards stacks at 320 (before and after) | Main session corrects the spec §1.4 table | Spec text, not code |
| D5 and §1.5 | Spec text: D5 height (after your decision), §1.5 phone sizes from slice 0, a note that pairs inside a two-column form use the form's 10px gutter | Main session, after Checkpoint 3 | Spec files live in the main checkout |
| UI-F2 note | Other 48px controls outside this rule ("Create link" on Profile, employee Home quick actions) | Inventory under the amended D5 in the cycle 2 phone pass | Older rules; no harm at 48px |

### 2.2 Rejected

| ID | Proposal | Reason |
|---|---|---|
| UX-F1 fix | Reorder the DOM primary-first and use `flex-direction: row-reverse` on desktop | Desktop focus order would run right to left against the visual order (WCAG 2.4.3 risk). It changes desktop on seven pages, including Payroll, and spec B.3 (AC2.4) requires positions to stay. The problem stays on the follow-up list |
| UI-F2 option B | Raise the lone-primary rule's weight to keep 48px | Changes about 20 reviewed phone buttons after review, catches short lone primaries like "Add shift", and keeps a heuristic that can't tell full width from short |
| UX-F7 | Accept 48px for short lone primaries | Its premise was the build report's claim; those buttons measure 44px |
| UI-F4 mechanism | Add the employee classes to the pair rule | They're already listed; the fixed `height` at `employee-mobile-corporate.css:194` wins. Loop 6 replaces it |
| UX-M1 extra | Add a contrast check to `large-root-check.mjs` inside the loop | Worth doing, but tooling. Moved into the "Large text" follow-up so the loop stays UI-only |
| UI yellow header shot | Capture the yellow brand on the header search button | The build measured 10.21:1. Accepted on the measurement |

### 2.3 Stacked button order, resolved against spec §1.4

- **What §1.4 says:** "Buttons stack, primary first, full width", for the Timecards period controls at a 200% root. Timecards does that (`root200-390-manager-_app_timecards.png`).
- **What §1.3 says:** pairs wrap onto their own rows. It names no order. B.3 (AC2.4) says labels, names, actions and positions stay.
- **Ruling:** the build meets the spec. Keep DOM order for this commit, as the UI review says. Focus order matches what you see on every page, on phones and on desktop.
- **The gap is real:** a manager who learns "primary on top" on Timecards finds "Cancel" on top on New employee. The UX review is right about that. Cycle 2 sets one rule for stacked pairs on phones (my recommendation: primary first, as iOS and Material both stack the confirming action first) and changes each page's markup as a listed change with its desktop effect stated. It doesn't belong in a fix loop.

---

## 3. Recommendations on your open questions

| # | Question | Recommendation | Why |
|---|---|---|---|
| 1 | `--type-unit` as the house pattern | **Accept, as a transitional pattern, with four guardrails.** (a) DESIGN.MD documents it with one example, as the comment at `portal-gusto.css:83-87` does. (b) A dev-only lint script rejects a bare px `font-size` or `line-height` in shared rules, and any use without the `1px` fallback. (c) Later passes map the common sizes (12, 13, 14, 15, 16, 17, 20, 24, 28) to named `--g-t-*` tokens page by page and add no new half-pixel sizes. (d) Anything rendered outside `.app-shell.nevora-portal` (portals to `body`, sign-in, Clocker) stays px on phones; each new portal says which it is | Both reviews checked it: every value resolves to its old pixel, selector weight doesn't change, desktop pairs are pixel-identical. The only alternative, phone copies of 1,954 rules, doubles the CSS and reopens the cascade fights U10 warned about |
| 2 | Tab labels from 10px to 12px on employee Home, lead Home, the employee preview and owner `/app?view=*` | **Accept** | Both reviews agree. 12px is the U1 size every other screen already shows; 10px sat under every floor. "Schedule" and "Requests" keep about 8px between them at 320 |
| 3 | Lone primary height | **One phone button height: 44px. Amend D5 to "44px; 48px only for named sticky confirms and sheet actions, set by class; list rows stay 48px."** Loop 3 deletes the dead rule | The 48px rule never applied, so 44px is what everyone reviewed. Desktop D4 uses one size. A CSS rule can't tell a full-width primary from a short one. 44px meets the target constant |
| 4 | The 200% root gaps | **Follow-up, not before commit.** Fold into **J2**: Inbox owner and manager (filter count escapes the scroll box; Inbox goes first, it's a manager tab), Settings › Positions and Break types (segments clip). New **"Large text" item**, phone only: Payroll export "Clear selection" first (a lost label on an action), then Availability toggle column, Settings › Features grid, Settings › Branding cells, Timecards in-word breaks, the S.1 states at 200%, and the new contrast check in `large-root-check.mjs` | Today only Firefox and Samsung Internet users with a raised default font see these pages grow. Each fix moves the default by a pixel or two and needs its own listed change. J2 already re-snapshots the segmented controls, so one run covers both |
| 5 | Header chip at 10px from the wordmark versus 18px | **18px, in the loop (loop 10).** Veto it at Checkpoint 3 if you disagree; it's one line | The wordmark is a constant and needs its clear space; at 10px a company logo reads as part of the NEVORA lockup. 18px is what users see today. `nowrap`, not the gap, fixed the 320 wrap, and the chip still measures 58px at 320 |
| 6 | Five labels that wrap at 320 | **Accept** | Each sits in a full-width button and wraps to two balanced lines, against three or four lines in half-width pills before. "Generate reviewed export" and "Validate and import amounts" are payroll copy and stay as approved. The B5 copy pass may offer shorter phone labels for "Save normal availability", "Save company preferences" and "Name your first template" |
| 7 | Android tap-outside crash and its motion change | **Your Android phone decides (device item 2).** No crash on current Chrome: log it as a Chrome 133 emulator bug and change nothing. Crash: approve dropping `overlay` and `display` from the phone sheets' exit transition as a listed motion change | A tab crash loses the person's place and unsaved work, which costs more than part of a fade. Reduced-motion users see no difference either way. Loop 4 ships regardless; record whether it changes the crash |

---

## 4. Scorecards after the fix loop

Scored for the build as it will stand once loops 1 to 10 pass.

### Phone search

| Line | Score | Reasoning |
|---|---|---|
| Usability | 2 | A person, page or place in two taps plus typing from any manager page; status lines tell the truth |
| Familiarity | 2 | Magnifying glass top right, field on top with Close; More › Search for the reach-down path |
| Trust | 2 | Offline and unavailable never show as "No matches."; the wordmark keeps its space after loop 10 |
| Accessibility | 2 | axe 0 in both engines, 44px targets, focus returns to the opener, Clear's ring stands apart after loop 9. VoiceOver still to hear (device item 5) |
| Brand distinctiveness | 1 | Neutral by design |
| Durability | 2 | System-standard search screen, no glass, no motion |
| Cost | 2 | Phone CSS and one exposed `open()`; no backend |
| Continuity | 2 | Desktop finder pixel-identical; tabs and More unchanged |
| **Total** | **15 / 16** | **Go** |

### Owner setup card

| Line | Score | Reasoning |
|---|---|---|
| Usability | 2 | One tap from the top of Home to the section that fixes each gap; the real-data round trip passed |
| Familiarity | 2 | A two-step setup list, no tour |
| Trust | 2 | Keeps the last confirmed steps when a read fails; no celebration; heading and steps share a line after loop 8 |
| Accessibility | 2 | axe 0, 44px links, reasons tied by `aria-describedby`, progress in text. Zero locations still needs one real render (UX-C1) |
| Brand distinctiveness | 1 | A plain container; the calm shows in behaviour |
| Durability | 2 | Home's existing card, bar and grid |
| Cost | 2 | One shared read and filtered counts; no backend |
| Continuity | 2 | Inbox keeps every item; Manager Home unchanged apart from the green bars you approved |
| **Total** | **15 / 16** | **Go** |

### Phone polish

| Line | Score | Reasoning |
|---|---|---|
| Usability | 2 | Android Back closes the sheet and keeps your place; after loop 4 a tap outside only closes; the shift you're on reads first |
| Familiarity | 2 | Platform Back, launcher shortcuts, a now-then-next card |
| Trust | 2 | No more crash on Back, and no silent week change. Drops to 1 if your Android phone still crashes on tap outside and the motion change isn't approved |
| Accessibility | 2 | Pass text at 5.23:1 (was 4.39:1); distinct link names; focus returns to the opener in Chromium. WebKit leaves focus on the page body, which VoiceOver must judge (device item 5) |
| Brand distinctiveness | 2 | The pass stays the one brand moment, with one tear |
| Durability | 2 | Platform behaviour and manifest fields |
| Cost | 1 | Android needed only a focus move. iOS Back is unmeasured and may still need history entries |
| Continuity | 2 | Same sheets, same card, same pinned strings |
| **Total** | **15 / 16** | **Go**, with iOS Back still open for A3 |

### Phone foundations

| Line | Score | Reasoning |
|---|---|---|
| Usability | 2 | Text can grow on 43 of 51 views; buttons hold one line; the chosen day reads as chosen; payroll rows stay in order at 430 after loop 2 |
| Familiarity | 2 | Phones get the D4 button shape and segmented control desktop already uses |
| Trust | 2 | One button shape, teal for actions only on Schedule, and the Home heading stays on its band after loop 1 |
| Accessibility | 2 | Chosen-day ring at 5.64:1; inputs 16px or more; 44px kept at 200%; loop 1 removes the 1.3:1 regression |
| Brand distinctiveness | 1 | Neutral at default size; protects teal without adding a trait |
| Durability | 2 | Retires legacy pills and px type |
| Cost | 1 | 1,954 declarations now read `calc(n * var(--type-unit, 1px))`; maintainable only with the guardrails in section 3, item 1 |
| Continuity | 1 | Labels, names and desktop stay, but phone pairs that sat side by side now stack, and on seven pages the primary lands under the secondary. Cycle 2 settles one order |
| **Total** | **13 / 16** | **Go** |

No initiative scores 0 on Trust, Accessibility or Usability.

---

## 5. Jose-device list

Merged from both reviews and the phone polish build report; duplicates removed. Run it after the loop lands, on the fictional runtime: `adb reverse` for Android and the Mac's local address for the iPhone, no deployment. Note the phone model, OS version and browser version for each run.

**Time:** about 45 minutes. 10 to set up, 15 on the iPhone (VoiceOver included), 15 on the Android phone, 5 to write notes. Add 10 for TalkBack.

| # | Check | iPhone Safari tab | iPhone Home Screen app | Android Chrome tab | Android installed app |
|---|---|---|---|---|---|
| 1 | **A3 Back matrix:** open employee More, Manager More, the Schedule menu, the Locations menu and the finder; press Back each time. Expect "closes and stays". Then close another way and press Back once: you leave the page in one press. On iPhone, edge-swipe with More open, with the finder open and with nothing open | Edge swipe (expect "leaves the page") | Record "no system Back"; Close actions, swipe down and Close still work | Button and gesture navigation | Same (never run) |
| 2 | **Tap outside each sheet:** (a) onto a link: the sheet closes and the page and week stay (loop 4); (b) onto a text field: the field keeps focus and the keyboard opens; (c) Android: Chrome version, crash yes or no | (a), (b) | (a) | (a), (b), (c) | (a), (c) |
| 3 | **Finder and keyboard:** the keyboard rises from header Search and from More › Search; with the keyboard up, scroll to the last row for an empty query and for "ma" | ✓ | ✓ | ✓ | ✓ |
| 4 | **Edges:** tap the status-bar band above the finder field (sheet stays open); finder field clear of the Dynamic Island; last result above the home indicator; tab bar above the gesture bar | ✓ | ✓ | ✓ | ✓ |
| 5 | **VoiceOver:** header "Search, pop-up button"; finder field name; status read once per change; "Clear search", "Close search"; where focus lands after closing More; setup card "Set coverage periods, link" then its reason, and the Done row read as one item; "View schedule, Tue, Oct 13"; "Refresh timecards"; day picker "Sat, 17, today, selected"; two-finger scrub closes More. TalkBack optional, same list | ✓ | ✓ | TalkBack (optional) | |
| 6 | **Shortcuts (C2):** long-press the icon; Schedule then Time off; each opens in the app window | n/a | n/a | n/a | ✓ |
| 7 | **Large text:** Samsung Internet or Firefox at the largest default font: Owner Home with a long workspace name (loop 1), Inbox, Timecards, Payroll export | | | ✓ | |
| 8 | **Optional:** zero locations, if a fresh fictional company is to hand ("Add a location ›"); Payroll export rows in two columns, if your iPhone is a Pro Max or Plus (430px) | ✓ | | | |

Desktop needs nothing from your devices.

---

## 6. Verdict for Checkpoint 3

**Go,** on these conditions:

1. Loops 1 (UX-M1) and 2 (UI-F1) pass their checks. If either fails, hold the whole commit: the foundations changes share files with the other three initiatives.
2. Loops 3 to 10 pass, or the engineer reverts the failing item, lists it as a follow-up and reports it. A reverted item doesn't block the commit.
3. The section 1.3 regression checks pass: default-size differences only on listed items, desktop differences only on Schedule and the setup card summary, the sweep at 156 ok, unit tests green, payroll copy unchanged.
4. You confirm or veto loop 10 (chip spacing) and the D5 amendment.

The device pass gates release, not the commit. iOS Back and the Android tap-outside crash stay open until it runs.
