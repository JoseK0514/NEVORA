# Fix loop 1: build report (cycle 1, before Checkpoint 3)

- **Built:** 2026-10-17 by the UI Engineer, from the fix-loop table in `docs/product/build-review-cycle1.md` (Product Designer sign-off), sections 1.1 to 1.3.
- **Code:** worktree `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/agent-a64089143934d5286`, branch `worktree-agent-a64089143934d5286`, reset to `ce4fcb2`. It holds run 1 plus run 2 (copied from R2 `agent-af4063da4b128f176`) plus this loop. Nothing committed, pushed or deployed.
- **R2 copy:** the sandbox refused `git -C` on R2, so I copied with `rsync -c` (no `docs/`, `node_modules/`, `.next/`, `.git`). `diff -rq` against R2 afterwards: no differences. R2 untouched. `node_modules` is an APFS clone of the main checkout's.
- **Runtime:** two owned fictional runtimes on disposable Postgres clusters. The sandbox also refused `git init` in a scratch copy, so the scratch runtime lists the copy's files from a file inventory instead of `git ls-files` (`rt-f1/owned-preview-app-nogit.ts`; the inventory matched the worktree's `git ls-files -co` exactly, 1,443 files, `schedule/coverage` included). Runtime A ran from the R2 copy and took the loop's files by sync, for paired before/after runs. Runtime B ran fresh from the final worktree copy for the flows and the sweep. Both stopped with `postgresStopped: true`. Jose's preview (pid 6061, Postgres 6097) and Postgres 18847 and 75730 were not touched.
- **Evidence:** `evidence/` next to this file (`before/`, `after/`, `day-picker/`, `android/`, `data/`). "Before" is the R2 build.

## Summary

| Loop | ID | Result |
|---|---|---|
| 1 | UX-M1 | **Pass** (blocker cleared) |
| 2 | UI-F1 | **Pass** (blocker cleared) |
| 3 | UI-F2 | **Pass**: 0 differences, so the rule was dead |
| 4 | UX-P1 | **Pass**, with one note on the history script (see loop 4) |
| 5 | UI-F3 | **Reverted, now a follow-up**: "View period" wraps to two lines in an equal column |
| 6 | UI-F4 | **Pass** |
| 7 | UI-F5 | **Pass** |
| 8 | UI-C1 | **Reverted, now a follow-up**: card grows 0.39px and the Today strip moves |
| 9 | UI-S2 | **Pass**, with one added rule: the rings were white (see loop 9) |
| 10 | Open point 1 | **Pass** (Jose may veto; exact line below) |
| 11 to 14 | Evidence | Captured |

Needs Jose: loop 10 veto or keep; the loop 9 added rule; the two reverted items; the history-script note in loop 4.

## Files and lines changed (against R2)

| Loop | File | Lines (worktree) | Change |
|---|---|---|---|
| 1 | `src/components/manager-home-mobile.css` | 65-68 | Comment plus `.mobile-home-heading { border-image: linear-gradient(var(--mh-masthead) 0 0) fill 0 // 8px 100vw 46px; }` in the phone query. The 112px `::before` band is unchanged |
| 2 | `src/components/payroll-export.module.css` | 142 | `.employee` columns: `18px repeat(auto-fit, minmax(max(6rem, calc((100% - 42px) / 2)), 1fr))` |
| 3 | `src/app/app/portal-gusto.css` | old 144 deleted; comment 131-139 | Lone-primary 48px rule deleted; block comment now says one 44px phone height |
| 4 | `src/components/sheet-gestures.tsx` | 87-107, 116-120, 126-128, 135-138 | Capture `pointerdown` flag for a primary press outside every open phone sheet; cleared on `pointercancel` and after `setTimeout(0)` on `pointerup`. In `onBeforeToggle`, a phone sheet closing while the flag is set arms a one-time capture `click` swallow (pattern of `:76-78`). Listeners removed on unmount |
| 6 | `src/app/employee-mobile-corporate.css` | 194 | `height: var(--corporate-action-height)` became `height: auto` |
| 7 | `src/app/app/employees/new/new-employee.css` | 98 | `gap: 8px` to `12px` |
| 7 | `src/app/app/requests/time-off.css` | 122 | `gap: 10px` to `12px` |
| 7 | `src/components/reports.module.css` | 112 | `.exports` `gap: 8px` to `12px` |
| 9 | `src/app/app/portal-gusto.css` | 431 | `.command-finder-field:focus-within` became `:has(input:focus)` |
| 9 | `src/app/app/portal-gusto.css` | 445-446 | `.command-finder-clear:focus-visible { outline-offset: -2px; }` |
| 9 (added) | `src/app/app/portal-gusto.css` | 447-448 | `html body .app-shell.nevora-portal.nevora-portal .mobile-header .command-finder :is(.command-finder-close, .command-finder-clear):focus-visible { outline-color: var(--g-accent); }` |
| 10 | `src/app/app/portal-gusto.css` | **494 only** | `.mobile-header .company-logo-chip`: `margin-left: 10px` to `margin-left: 18px`. To veto, change 18px back to 10px on that line; nothing else depends on it |

Nine files differ from R2. Loops 5 and 8 leave no trace: `manager-home-gusto.css` is byte-identical to R2, and `reports.module.css` differs only at line 112 (loop 7).

## Each loop item

### Loop 1 (UX-M1): pass

The border-image route worked; no ancestor clips the outset, so the fallback wasn't needed.

- **(a) Default size, 320, 375, 390:** Owner Home (extra plan, also 430, 800, 1440, 1920) and Manager Home (chrome plan): 0 computed differences and 0 pixel differences. The snapshot tool doesn't record `border-image`, so I read it separately: `linear-gradient(rgb(28, 74, 71) 0px, …)`, outset `8px <100vw> 46px`, slice `0 fill`. Measured band end in the left gutter: 112px below the frame top at all six role and size pairs, before and after (`data/loop-check-chromium-…-after.json`).
- **(b) 200% root, 40-character fictional name** ("Fictional Harbor Logistics Workforce PR", put into the heading by script; no data changed), owner and manager at 320×700, 375×667, 390×844: every heading line sits on the band (pixel under each line = masthead), 49px of band under the last line (needs 22), no sideways scroll. Before: the second and later name lines sampled white (`before/l1-band-owner-320x700-root200.png` against `after/…`). WebKit passes the same checks.
- **(c) Brands at 390, 200%:** Ocean subtitle 8.15:1 on #273B66; yellow stress 7.59:1 on #533E00. Both engines.

### Loop 2 (UI-F1): pass

Chromium and WebKit, 16px root, 320/390/430/540/600: two figure columns at every width; Recorded starts at column 2, Breaks beside it on the same row. Before: 3 columns at 430, 4 at 540 and 600. 32px root: one figure column at 320, 390, 430. Screenshots: `after/l2-payroll-export-430.png`, `after/l2-payroll-export-540.png` (before versions in `before/`). The doc asks for these in `phone-foundations/build-run-2/after/`; the main session can copy them there.

Note (unchanged by this loop, recorded for the "Large text" item): at a 32px root, with one figure column, "Breaks" auto-places into the 18px checkbox column on the next row (x 37 where Recorded sits at 67). R2 did the same.

### Loop 3 (UI-F2): pass

- Step A snapshot, 49-path plan at 320, 375, 390 (and 1440, 1920) plus the chrome plan: no difference traces to the deleted rule. The only differences in the whole run belong to loops 6 and 7 (see regression set).
- Button inventory at 320 and 390 against `inventory-buttons-p1-after.json`: every matched button has the same height except the four employee Timecards buttons (48 to 44, loop 6). Other mismatches are fixture data only (Inbox counts, notification times).

### Loop 4 (UX-P1): pass, one script note

History script, 390, Chromium and WebKit (`data/history-*.json`):

| Cell | Before (R2), Chromium | After, Chromium | After, WebKit |
|---|---|---|---|
| Run 1's 15 cells except the one below | pass | pass | pass |
| Schedule page menu, "tap outside" at (195, 120) | FAIL | FAIL | FAIL |
| New: tap outside onto a link, Manager More ("Add shift", then header "Workforce") | FAIL, len 4->5 | pass, len 4->4, URL same | pass |
| New: tap outside onto a link, employee More ("My shifts", then header) | FAIL | pass | pass |
| New: tap outside onto a link, Schedule page menu (header "Workforce") | FAIL | pass | pass |
| New: tap outside on nothing, outside the sheet box (all three) | pass | pass | pass |

The original cell's failure, verbatim, after the fix: `FAIL chromium schedule page menu / tap outside len 4->5 url-same:false back:/app/schedule keys-same:true focus:A` (WebKit identical, focus BODY). **Why it still fails:** at 390×844 the Schedule page menu sheet runs from y 81.5 to 828, so run 1's point (195, 120) lies inside the sheet, on a week link (`/app/schedule?week=2026-10-12`). That tap chooses a menu item, and changing the week is what the item does. Events show no light dismiss at all (`pointerdown … click`, all on the link's `STRONG`). So UX-P1's "Schedule moved to another week" came from this test point, not from a tap outside. The real tap-outside bug did exist on all three sheets (new cells fail on R2), and the fix closes it. **Jose / Product Designer:** I count loop 4 as passed on the corrected cells; the original cell needs its point moved outside the sheet.

Desktop A2.5 at 1440, both engines: account menu opens, Esc closes it, history and URL unchanged, no `tabindex` added; a click outside the open account menu onto a sidebar link still follows it (desktop unchanged).

Android emulator (Pixel 7, Android 16, Chrome 133.0.6943.137, three-button navigation, system Back): second run matches run 1's `a2-after-matrix-chrome-button.json` cell for cell (manager More, employee More, employee More on Home, both page menus "closes and stays"; finder "1st Back hides the keyboard, 2nd closes and stays"; no surface open "navigates back as today"). The first run straight after re-pointing Chrome left Manager More open after the first Back (second Back closed it); the repeat run passed. I didn't switch the emulator to gesture navigation. Tap outside the preview's More sheet on the emulator still crashes the tab ("Aw, Snap!", `android/tap-outside-preview-chrome133-crash.png`), so loop 4 doesn't change UX-P2.

### Loop 5 (UI-F3): reverted, follow-up

The grid gives equal columns, and at 390 the edges match (34-190 and 200-356). But the check also needs one line per button, and "View period" with its 20px arrow needs about 173px (its width under the old flex). An equal column is 156px at 390 and 121px at 320, so the label wraps. Failure, verbatim:

- `FAIL chromium L5 reports 390 root100: buttons 44px, one line each [{"…width":156,"text":"View period","lines":2, "height":64.5}, {"…width":156,"text":"Refresh","lines":1,"height":44}]`
- `FAIL chromium L5 reports 320 root100: field and button column edges match within 1px` (View period 64.5px tall, Refresh 44px, so the two buttons don't share a top line)

Reverted to R2's flex lines. Follow-up options for the next phone pass: drop the arrow icon on phones, or cut the button's inline padding to 12px, then re-run this check. Screenshots of the tried grid: `after/l5-reverted-tried-grid-reports-toolbar-{320,390}.png`.

### Loop 6 (UI-F4): pass

Employee `/app/timecards`: both buttons 44px and one line at 320 and 390 (were 48px). 200% root at 390: labels inside the buttons (they grow to 107px, two lines), no overflow, no sideways scroll; before, the labels spilled out of fixed 48px buttons.

### Loop 7 (UI-F5): pass

Computed `column-gap` and `row-gap` 12px at 390 on New employee footer, Time off footer and Reports `.exports`. Snapshot diff lists exactly these three gaps plus the rows they push down.

### Loop 8 (UI-C1): reverted, follow-up

With `padding-top: 10px` the heading lines up (heading text top 218.3, both step titles 218.3, at 1440 and 1920). The card doesn't keep its height in today's fixture state (one step done): the summary column becomes 72.69px against the steps column's 72.3px. Failure, verbatim from my check:

- before: `"card":{"top":190.3,"height":106.3},"stripTop":316.6`
- after: `"card":{"top":190.3,"height":106.7},"stripTop":317`

The Today strip moves 0.39px, which breaks "card height unchanged" and the desktop rule (differences only inside `.owner-setup-summary`). Reverted. Tested alternative for the follow-up, by injected CSS only: add `margin-bottom: -10px` to the same rule. Measured: card 106.3px, strip 316.59, heading 217.3 lined up with the link text. That would need its own listed desktop change.

### Loop 9 (UI-S2): pass, one added rule

The doc's two edits work: with focus on Clear, the field border is transparent and its teal shadow gone, and Clear's ring has `outline-offset: -2px` inside its 44px box. But the ring computed **white** (`solid 2px rgb(255, 255, 255)`), on Home and on Schedule alike. The finder dialog sits inside `.mobile-header`, and `mobile-workforce.css:52` (`[data-mobile-workforce] .mobile-header :is(a,button):focus-visible { outline-color: var(--mobile-surface) }`) outranks the finder's `:444` rule. The same applies to Close. That also explains UI-S3: run 1's Close screenshot had a ring, in white on white.

I added one phone-only rule (line 447-448) so the finder's own accent colour wins. After: Clear and Close both `solid 2px rgb(7, 117, 114)` on Home and Schedule (`after/l9-focus-clear-390-crop3x.png`, `after/l11-focus-close-390-crop3x.png`, `after/after-focus-clear-390.png`). Desktop finder snapshot at 1440 and 1920: 0 differences (Close and Clear stay `display: none`). **Jose:** this rule goes past the doc's exact fix; it's one line to drop if you'd rather list it separately, but without it the ring stays invisible.

WebKit doesn't Tab to buttons by default, so the keyboard part is Chromium only.

### Loop 10: pass (veto point)

Ocean brand with the fictional logo, owner and manager (manager shows a bell count of 1), 320/375/390, Chromium and WebKit: one header row, chip 18px from the wordmark, 58px wide at 320 and 88px at 375 and 390, logo not clipped, Search and bell after the chip, no sideways scroll. Without a logo: 0 differences. Screenshots `after/l10-header-ocean-logo-*.png`. The change is line 494 of `portal-gusto.css` only.

### Evidence items

- **11 (UI-S3):** Close ring after a real Tab press: `after/after-focus-close-390.png`, `after/l11-focus-close-390-crop3x.png` (teal after loop 9).
- **12 (UI-F6, UX-F4):** `day-picker/picker-320-loaded.png`, `picker-390-loaded.png` (Sat 17 chosen), `picker-1440-track.png`, `picker-{320,390,1440}-fullweek.png`, `picker-390-today-chosen.png`, `picker-{390,1440}-forced-colors.png`. Each crop is the picker element itself.
- **13:** Owner Home at 800px, card stacked (one column, steps one column): `after/l13-owner-home-800.png`, `after/l13-owner-setup-card-800.png`.
- **14 (UX-P4, B1.4):** run at 9:26 PM Puerto Rico time, no shift under way: `h2` "Next shift", no "Your shifts", no "Scheduled now", at 390 and 1440: `after/l14-employee-home-no-shift-under-way-{390,1440}.png`.

## Regression set

| Check | Result |
|---|---|
| Step A snapshot, 49 paths × 320/375/390/1440/1920 (245 views) plus chrome plan (38 views), R2 base against final | 9 views differ, all phone: employee Timecards 320/375/390 (loop 6) and New employee and Reports at 320/375/390 (loop 7 gaps and the rows below them). Chrome plan: 0. `data/classify2-u10.txt` |
| 1440 and 1920 | **0 differences** in every view (styles and pixels). Loop 8 was reverted, so no desktop change remains |
| Extra paired plan (Owner Home 320 to 1920 and 800, Time off, Payroll export 430/540/600/1440, Reports 430/1440, Manager Home 430) | Differences only in Time off gap, Payroll export rows at 430 to 600 (loop 2) and Reports `.exports` (loop 7). Owner Home 0 at every width. `data/classify-extra.txt` |
| `pages-test.mjs` sweep, fresh final runtime, default brand | **156 ok** |
| Sweep, yellow stress brand (#EAB308, accent #886600) | **156 ok**; brand reset afterwards |
| U4 (first, fresh DB), U1, U2, U3, U6, U8 | all ok |
| B3, B4, D1/D2, D3, D4, D5, D6 | all ok. B4 first exited on `ECONNREFUSED 127.0.0.1:5432` because my flow script left out its port argument; rerun with the runtime's port: "B4 checks all ok" |
| Run 1 `search-check` | 90 pass, 0 fail |
| Run 1 `card-check` (read) | 76 pass, 0 fail |
| Run 1 `polish-check` | 49 pass, 10 fail. The 10 are B1.1, B1.2, B2.1, B1.x and B1.6 at 390 and 1440, which need a shift under way; this ran after 9 PM, past the fixture's 4 PM end. Same 10 as run 2 |
| Large-root run, 51 views, Chromium, 200% root | **43 of 51 pass**, the same 43 as run 2. Failures unchanged: owner and manager Inbox, Payroll export, Settings › Positions, Breaks, Branding, Features, employee Availability. Owner and Manager Home pass, and pass the loop 1 band check |
| `npx tsc --noEmit -p .` | pass |
| eslint on changed files | `sheet-gestures.tsx` clean. eslint has no CSS config ("File ignored because no matching configuration was supplied"), so I parsed the seven changed CSS files with PostCSS: all parse |
| `npx vitest run --exclude '.claude/**' --exclude 'node_modules/**'` | 428 files passed, 27 skipped; 7,221 tests passed, 0 failed (no timeouts this run) |
| Payroll copy diff | Empty: no TSX, copy or markup changed on payroll pages; `payroll-export.module.css` line 142 only |

## Screenshots

- **Before (R2) and after, same names:** `evidence/before/` and `evidence/after/`. Loop crops: `l1-band-*`, `l2-payroll-*`, `l5-*`, `l6-employee-timecards-*`, `l8-*`, `l9-*`, `l11-*`. Full masked snapshot pages: `snap-owner-home-{320,375,390,430,1440,1920}`, `snap-manager-home-{320,375,390,1440,1920}`, `snap-employee-{320,390,1440,1920}-_app_timecards`, `snap-owner-{320,390,1440}-_app_employees_new`, `snap-employee-timeoff-{320,390,1440}`, `snap-owner-390-_app_payroll_export`, `snap-owner-payroll-export-{430,540}`, `snap-owner-{1440,1920}-_app_payroll_export`, `snap-owner-reports-430`, `snap-owner-finder-390`, `snap-owner-finder-desk-1440`.
- **After only:** `l10-header-ocean-logo-*`, `l13-*`, `l14-*`, `after-focus-clear-390.png`, `after-focus-close-390.png`, brand band shots (`l1-band-owner-390-root200-{ocean,yellow}*.png`).
- **Day picker:** `evidence/day-picker/`. **Android:** `evidence/android/`.

## Known gaps

- **Two items reverted** (loops 5 and 8), with measured causes and a tested next step each, above.
- **History script cell:** run 1's Schedule page menu "tap outside" point lands inside the sheet. It still fails, and it can't pass without moving the point.
- **Loop 9 added rule** beyond the doc's text (the white ring). Needs Jose's acceptance or a separate listing.
- **Real devices:** none. Loop 4's swallow is cleared one task after `pointerup`; an iPhone that fires the click later than that would still follow the link. Device item 2(a) covers it. Android tap-outside crash on Chrome 133 still happens (UX-P2, device item 2(c)).
- **Android gesture navigation** not re-run (button navigation only, two runs; the first had one stray cell).
- **WebKit keyboard:** WebKit doesn't Tab to buttons by default, so the finder ring checks are Chromium only.
- **B1.x** (shift under way) couldn't run: the fixture shifts end at 4 PM and this loop ran 8 to 10 PM. B1.4 (no shift) ran instead (item 14).
- **Payroll export at 32px root:** "Breaks" lands in the checkbox column (unchanged from R2), for the "Large text" item.
- **Runtime records:** both runtimes report `Close: Application mirror bytes changed: next-env.d.ts` (Next rewrites the mirror's copy in dev; run 2 saw the same). The worktree's `next-env.d.ts` is unchanged. The emulator's Chrome still carries run 1's test command-line flags.
