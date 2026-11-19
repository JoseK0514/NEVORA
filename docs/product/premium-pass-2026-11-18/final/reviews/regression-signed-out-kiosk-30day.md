# Final regression review 2: signed-out pages, Clocker kiosk and 30-day screens (fz against fin, Nov 18, 2026)

Review only. No app file was edited, the app, tests and captures were not run, nothing was committed, pushed or branched.
Only the picture tools (`imgdiff.mjs`, `pair.mjs`) and small read-only crop scripts in the scratchpad were run. Fictional
Northside data on the local capture harness (throwaway PostgreSQL, Mobile Access on for the signed-out pages). This is not
Development and not production.

Source and environment evidence: every final set records head `3e8f88124` (worktree `U/wt/p9c`), `trackedClean: true` at
start and end and `sourceVerified: true`. Source causes were read with `git show 3e8f88124:<path>` (the worktree has since
moved to `1997287e8`). Release sequence (Jose's policy): the combined UI goes to the Development release, is integrated and
verified there, and the exact verified release is promoted to main or production only after Jose approves it. This review
authorizes no merge, activation, deployment or send.

`U` is `.ui-work`. Crops are in `U/p9/fz-review2/` (`fz2-*.png`); the pixel rankings are the `diff-*.txt` files there.

## Sets compared

| Final (3e8f88124) | Earlier | Also compared with the fix builder's own after set | Result |
|---|---|---|---|
| fz-public-desk (1440, 900, 320, EN and ES, plus HC and 200% at 1440) | fin-public-desk (16a64b001) | fd-a3-desk (8530a57ab): only `pub-signin-err-es-320` differs (FD's last commit) | reviewed |
| fz-public-touch (390, 844, EN and ES, plus HC and 200% at 390) | fin-public-touch (16a64b001) | fd-a4-touch, fd-a5-touch: only the 200% Sign in and Forgot pictures differ (128px taller, coordinator commit e12e74aca) | reviewed |
| fz-clocker-en, fz-clocker-es | fin30-clocker-en, -es (3f802fcb7) | fe2-clocker-en, -es (983968e0b): largest change 2.1%, clock times and references only | reviewed |
| fz-kiosk (200% text, High Contrast) | fin30-kiosk | fe-kiosk: largest change 0.9% | reviewed |
| fz-clocker-paused, fz-clocker-preview | none at 3f802fcb7 | fe-clocker-paused (0 pictures changed), fe-clocker-preview (clock only) | reviewed against FE only |
| fz30-owner, fz30-manager, fz30-touch | fin30-owner, -manager, -touch (3f802fcb7) | ff-owner, ff-owner-who, ff-manager, ff-touch, ff-t200base | reviewed |

Could not compare: fz30 has no 200% pictures of Add employee or Who's working (FF's own run had them); the company-wide
Manager's Shift matching page timed out again (`r30error: matching`, as in fin30 and FF); the signed-out error states
(Forgot, Reset, Set up) are not in the fz sets (FD's fd-a3/fd-a4 hold them); signed-out High Contrast and 200% at 1440 have
no earlier picture; a wrong PIN at 200% text is not captured.

Scan logs: no failed step and no new console error anywhere. Clocker 48 of 48 and 47 of 47 steps (as fin30), kiosk extras 3
of 3, paused 4 of 4, preview 2 of 2. axe: 0 violations in every run (signed-out 42 and 42 runs, new; Clocker 24, 24, 3, 3,
3; 30-day 22, 10, 16). Overflow: none in any set. Console errors: signed-out 4 and 4 (all the forced 503 of the new "Forgot
refused" extras), 30-day 2, 0, 2 (fin30: 3, 0, 2; 404 and 503 resource loads of the same kinds). New under-44 entries:
"Use a different code" (32px drawn, the kit's 44px `::after` band) and the 30-day header pills now drawn 40px (were 36).

## Regressions, ranked

No blocker. Nothing regressed on the signed-out pages.

| # | Rank | Route or step | Size | What is wrong | Before | After | Crop | Likely cause |
|---|---|---|---|---|---|---|---|---|
| 1 | visible | Edit employee (Owner), Role and Location pair | 390 phone, 200% text | The two selects cut their values mid-word with no ellipsis: "Employ" and "Calle Lo". F10 made field text scale (correct), but the pair stays two columns of about 150px, so the bigger value no longer fits. Before F10 the values stayed 16px and fitted (only the long placeholder "Choose a loca" was cut on Add employee). Add employee shares the row; its 200% picture was not recaptured. | cap/ff-t200base/r30-text200-editmaria-390-fold.png | cap/fz30-owner/r30-text200-editmaria-390-fold.png | fz2-edit-200pct-390-selects.png | `src/app/app/owner-b-pages.css` 260 to 262 and 273 to 276 stack `.c-teamform .c-field__row` only under `max-width: 359px`, a viewport width blind to text size; `src/app/app/b-thirty-day.css` 123 now sets `.c-in` to 1rem. Selects get `text-overflow: ellipsis` only inside `.q-row` (owner-b-pages.css 265). Fix: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr))` on the pair (rem, so 200% stacks it) and ellipsis on `.c-teamform select`. |
| 2 | visible | Who's working, Not clocked in rows | 320 | Each row now runs to four lines: names break ("Carlos / Vega", "Gabriela / Santos") and "Due" sits alone above its time ("Due" / "12:00 PM" / "Calle Loíza"). F25 fixed "In since" alone on the Clocked in rows; the Not clocked in rows show the same defect whenever the wait reads "N h NN min", which is most of the day. fin (2:06 PM, "2 h 6 min") had whole names and "Due 12:00 PM ·" on one line; FF's own recapture (4:02 PM, "4 h 2 min") already wrapped "Gabriela / Santos". 390 and wider are fine. | cap/fin30-owner/r30-attendance-320.png (and cap/ff-owner-who/r30-attendance-320.png) | cap/fz30-owner/r30-attendance-320.png | fz2-who-320-notclockedin.png | `b-thirty-day.css` 188 and 189: the phone row value is 15px semibold with `max-width: 35%` (about 88 of the 252px row), leaving about 90px for the name column. `src/components/whos-working-corp.tsx` 111 passes `` `Due ${clock}` `` to BSegs, and `keepWhole` binds "12:00 PM" but not "Due" to its time. Fix: a no-break space after "Due", and under 360px put the waiting time under the name, as F25 did for the chip. |
| 3 | polish | Christmas bonus hours, year menu open | sideways phone 844x390 | F03 holds (the menu opens under its pill and scrolls). New with it: the fifth row is cut at the menu's foot and the page's "15 – Dec 15, 2026" (Payment window value) is drawn inside that row, beside "Oct 2021 – Sep 2022". fin showed five clean rows (while covering the pill). The scan's own probe reports the menu opaque (white, opacity 1) and on top at its sample points, and FF reverted two attempts, so this may be a paint glitch of the anchored, scrolled top-layer popover; it is still what the final picture shows. | cap/fin30-touch/r30-bonus-yearmenu-844.png | cap/fz30-touch/r30-bonus-yearmenu-844.png | fz2-yearmenu-844-lastrow.png, fz2-yearmenu-844-lastrow-zoom.png | `b-thirty-day.css` 92 to 98 (`position-area: bottom span-left`, `max-height`, `overflow-y: auto` on `#bonus-year-menu:popover-open`). Check on a real phone; if it reproduces, end the menu on a whole row (max-height in row steps) or scroll an inner list instead of the popover box. |
| 4 | polish | Clocker, Enter your PIN | 768x1024 and 1024x768, 200% text | The field help now fills the reserved slot under the field (FE #14) and at 200% it sits 6 to 8px above the keys (keys are 14px apart; one line in portrait, two in landscape and in Spanish), so the field, help and keypad read as one block. A refusal at 200% (three lines in Spanish) is taller than the 2.8em slot and would move the keypad; not captured. Default size is fine. | cap/fin30-kiosk/ck-02-r30-text200-pin-768x1024.png | cap/fz-kiosk/ck-02-r30-text200-pin-768x1024.png; cap/fz-clocker-es/ck-50-text200-pin-1024x768.png | fz2-kiosk-200pct-pin-help-768.png | `src/components/clocker.module.css` 292 to 295 (`.pinMsg { min-height: 2.8em }` holding `.fieldHelp`). Add 12px under the slot, and capture a wrong PIN at 200% in both languages. |

## Fixes spot-checked that held

- Signed-out blocker 1 (footer reserve): Sign in ES at 1440x900 is 900 tall (was 989), help and legal line in view; cards end
  about 52px above "Need help?" (Check your email ES 1363 to 1151). `fz2-signin-es-1440x900-holds.png`.
- Signed-out blocker 2 (High Contrast): fields, buttons, pills and cards keep 1px edges at 390 (identical to FD's after) and
  at 1440 (new). `fz2-hc-390-fields-holds.png`, `fz2-hc-1440-brand-panel.png`.
- Signed-out blocker 3: Access help and Find your Employee ID titles sit on the card's text edge at 390 and 320 in both
  languages. `fz2-access-help-es-390-holds.png`, `fz2-access-help-id-en-320-holds.png`.
- Signed-out also held: tablet card overlaps the band (row 6), Check your email layout (row 10), expired invitation (row 13),
  every 900 and 768 page 1024 tall (row 20), Welcome and Find your ID spacing (row 24); keyboard order identical to fin on
  every width; the coordinator's 3rem phone fields stop the label running into the value at 200%.
  `fz2-forgot-sent-es-900.png`.
- Clocker: decision 2 (amber Question), one glyph map, one red tone per outage with the band dot, one state anatomy, Done
  and Start over, the offline screen's Done as the filled button, portrait PIN card ending at y 991, High Contrast with no
  edge rule and no 2px scroll (document 768), D34 to D36 at 200% and HC (clock 297 of 297, no scrolling).
  `fz2-kiosk-pin-portrait-holds.png`, `fz2-kiosk-not-reached-768.png`, `fz2-kiosk-ready-offline-1024.png`.
- 30-day: F02 (`compare.inCard 1`), F03 (menu under the pill, `overlap: false`), F04, F05, F06 (focus lands on
  `input#new-birth` and `input#new-termination` at 1440 and 844), F07, F08, F09, F11, F13 (`input#edit-birth` at y 479 of
  900 with its message), F16, F17 (18px sheet inset, bold teal check), F18, F19 ("750 h 30 min of 700 h"), F20, F21, F23,
  F29 (amber at 1440), F30 (pills 40px), F31 (no spinner). `fz2-matching-invalid-1440.png`.
- Checked and not a regression: the Add employee field errors no longer appear in the scan's alert list. On submit the
  message is read through focus and `aria-describedby` instead of `role="alert"` (`form-validation.tsx`, `show(field,
  false)`, "an alert as well would say it twice"); the message is drawn in every picture.

## Seen for the first time in the new extras (no earlier picture, so not regressions)

- High Contrast at 1440, every desktop sign-in page: the NEVORA wordmark, the three brand-panel icons and the step bars
  vanish (white on the forced white canvas). `auth-b.css` 94 (`filter: brightness(0) invert(1)` on the wordmark); the
  forced-colours block at 779 does not reset it. `fz2-hc-1440-brand-panel.png`.
- 200% text at 1440, Sign in EN and ES: the links under the card overlap each other ("New here? Set / up your account";
  in Spanish "¿Primera vez?" runs into "¿Olvidaste tu contraseña?"), while the card's title, values, workplace pill, button,
  language pill (15px in the scan log) and legal line stay at 100%. Cause not traced. `fz2-200pct-signin-en-1440-links.png`,
  `fz2-200pct-signin-es-1440-links.png`.

## Verdict

The final tree holds the three signed-out blockers, every Clocker fix and every 30-day row FF marked Fixed, with all flows
complete, axe clean, no overflow and no new console error. Nothing regressed on the signed-out pages or in the kiosk flows.
Two visible regressions are side effects of 30-day fixes: at 200% text on a phone Edit employee cuts its Role and Location
values, and at 320 the Not clocked in rows split names and leave "Due" alone. The year menu artifact and the crowded PIN
help at 200% are polish. All four are CSS-sized fixes.
