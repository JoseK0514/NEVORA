# FC: Employee and Lead, final verification of the premium pass (Nov 18, 2026)

Fix builder FC for final review C (`U/p9/fin-review-c.md`, 17 rows). Worktree `U/wt/fc`, base `16a64b001` (the combined
premium tree), final commit `0cec84d92` (detached temporary commits, never pushed, no branch). Patch: `U/p9/fc.patch`
(`git diff 16a64b001 HEAD --binary -- . ':!zz-scan' ':!vitest.zz-scan.config.mts'`, 16 files, `git apply --check -R`
passes). Evidence: `U/p9/fc-evidence/` (43 pictures: before and after pairs, plus the time-off form after).

Release sequence (Jose's policy of Nov 12): local captures of a temporary tree with fictional data only. The patch goes to
the combine step, then Development for the combined backend and UI check, then main only after Jose approves that exact
release. Nothing here was pushed, merged, deployed or committed in the main checkout.

Paths: `U` is `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/.ui-work`; evidence names are in `U/p9/fc-evidence/`.
Before pictures are the reviewer's (`U/cap/fin-employee`, `fin-lead`, `fin-employee-844`, `fin-lead-844`, same commit as
my base). After pictures: `U/cap/fc-employee-final` (desktop widths at the final CSS for those widths),
`fc-employee-phone` (900, 390, 320 at the final commit), `fc-lead2`, `fc-lead-844`, `fc-employee-844`, `fc-form`,
`fc-form-844`. Geometry below was measured in the browser with a probe in my worktree's own harness copy
(`zz-scan/probe-rects.js`, excluded from the patch), before (`U/cap/fc-probe-before`, `fc-probe-before-844`) and after.

## Rows

| # | Result | What changed, measured | Evidence |
|---|---|---|---|
| 1 | Fixed | A button that moves under its row's words now starts on the row's text edge at every width: one offset, `--eb-text-in` (36px lead plus 12px on phones, plus 22px from 768px), used by Home's and Requests' moved Review and by Schedule's Confirm status line. Home 900: Review x179 against text 189, now 189 and 189; Requests 900 the same; 844 Home and Requests 189 and 189 (Lead too). The last such row keeps the card's bottom inset under the button: 11px before, now 22px from 768px and 18px on phones (plus the card's 1px edge). | `r01-home-900-*`, `r01-lead-home-844-end-*`, `r06-hub-320-*` |
| 2 | Fixed | Confirm this week is the 44px step: 82.9x44 at 390 and 320 (was 112x36), 128x44 at 900 and 1440 (was 112x40; the desktop layer's 40px Approve pill outranked it, now outranked), 14/20 on phones and 14.5/20 with 18px sides from 768px, as Pick up and Review. The 44px hit band (`::after`) is gone. At 390 the reason keeps one line ("Your manager asked for it", the row is 68px, was 82). On the touch phone sideways it is 48px, the Employee pages' touch floor that Pick up and Review also get there (92.8x48 against Review 86.3x48), so the three agree. NV-152's "keeps its width while Confirming…" holds from 768px (min 128px covers "Confirming…" at 14.5px, 92px of words); phones draw the pill at its label's width, as touch screens already did (the coarse rule overrode the 112px minimum). | `r02-sched-390-*`, `r02-sched-1440-*` |
| 3 | Fixed | One lead geometry for rows built outside the kit row, in the Employee sheet only: from 768px Time's Right now, Delete account's points, Schedule's What changed and the add rows take a 22px inset and a 22px gap after the 36px circle; the add row's circle is 36px with the 18px lead glyph at every width (was 32px with 16px). Time 900: Right now circle x127 and text 175, Fix a missed punch text 175, corrections 189; now 131 and 189 for all three. Time 1440: 319 and 377. Delete account 1440: circle 315, text 363; now 319 and 377. Schedule What changed: 917 against 927 at 1440 and 179 against 189 at 900; now 927 and 189. On phones every icon row's text is at 48px (the add row was 44). Time's day rows keep their own 12px gap after the day (as Home's Coming up and Schedule do), so in This week the times start at 179 and "Fix a missed punch" at 189 at 900. | `r03-time-900-*`, `r03-delete-1440-*`, `r02-sched-1440-*` |
| 4 | Fixed in my files; Help's list needs another package | One glyph each: confirming a schedule is CalendarCheck (Home's to-do, Schedule's Confirm this week, a Notifications notice that asks you to confirm); Availability is UserCheck, the navigation's own Availability glyph, which pairs with Can't work's UserMinus (More, Pick up and swap's side card, Schedule's band pill, Notifications' availability kind); fixing your time is PencilSimple (Time, and Home's TIME_CORRECTION to-do, which drew Clock). I did not use CalendarBlank for Availability as the review suggested: CalendarBlank is the navigation's Schedule glyph, so Availability would share Schedule's. Help's How to list is in `src/app/app/help/page.tsx`, not in my files (see "Needed from another package"). | `r04-notifications-1440-*`, `r04-more-1440-*`, `r02-sched-1440-*` |
| 5 | Fixed | Updates' To acknowledge row leads with the amber circle (was grey, quieter than the teal read-only row under it); Schedule's Confirm this week is amber (was teal), as Home's and Notifications' same task. | `r05-updates-1440-*`, `r02-sched-390-*` |
| 6 | Fixed | Phones and tablets: in Things to do, Swaps for you and every row whose button moves under its words, the status drops under the name and sub-line ("Confirm this week's schedule", "Nov 16 – 22 · 7 shifts", then "Action needed"), as the Waiting rows' chips already did at 320. Rows with a short title (Pay's dates, Time's weeks) keep the chip beside the title, where it fits (a first version moved those too and made Pay's rows taller for nothing; scoped back). Pay at 320: "Statement ready" sits under "Last pay statement", which keeps one line. Done in the Employee sheet (the title line becomes `display: contents` and the chip takes the column's last place), so no kit change. | `r01-home-900-*`, `r06-hub-320-*`, `r06-pay-320-*` |
| 7 | Fixed | Under 360px Updates' filter takes 10px sides instead of 14px: the search field is 156.5px (was 148.5) and "Search update titles" (144.8px of words) shows whole. The 16px caret stays; no word changed. | `r07-updates-320-*` |
| 8 | Fixed in my files; Agreed times goes to FA | Shift details is the 44px step at 14.5/20 600 at every width (was 38px in the desktop footer, 48px at 15.5/700 full width on phones). From 768px Create calendar link and Send request are the 44px step at 14.5/20 600, as a state card's and a form footer's action (both were 48px); phones keep the full-width primary. I used 44 rather than the review's 52 for Create calendar link from 768px: spec 3.5 gives 52 to a full-width primary and 44 to form and footer actions, and from 768px it is a footer pill hugging its label; on phones it stays 52 full width. Sign out measured 123.6x44 at 900 and 1440 before and after (the review's 42 is probably the inset ring), so it is unchanged. Ask for agreed times is still 36px: the coordinator moved `src/components/restrictions/**` and `b-restrictions.css` to FA; the exact rule is under "Needed from another package". | `r08-r09-home-390-*`, `r09-home-1440-shift-*`, `r08-r16-calendar-1440-*`, `r08-timeoff-form-1440-after.png` |
| 9 | Fixed | Home's clock line is one treatment at every width, the desktop's: the teal clock circle and two lines on the card's white, no panel (phones drew a canvas panel holding a teal-50 circle). The live fact leads: "● Clocked in at 12:02 PM" in ink at 14.5/20 600 with its dot; the instruction is the grey line under it at 13.5. Before a shift the first line is "Clock in on the Main Office tablet" (ink) over "Take breaks and clock out there too" (grey), so the first line is always the one that matters. A place name of 20 characters or fewer stays whole ("Main Office" no longer splits at 390; a longer name keeps its spaces so a narrow phone can wrap it). Words unchanged. Better than both versions: phones lose the tint inside a tint, and on every width the fact now outranks the instruction. | `r08-r09-home-390-*`, `r09-home-1440-shift-*`, `r01-home-900-*` |
| 10 | Fixed (partly the review's numbers) | Under 360px the three-tab segment's labels take the narrow-phone segment size the foundation already defines (`--b-seg-fs`, 12.5px, NV-103) instead of 13.5px; the count stays the 18px pill 4px from its label. The text now starts 7.1px inside each thumb (was 4.6px). The review's 10px is not reachable at 13.5px: the three labels and counts need 248px of the 272px track. | `r10-exchange-320-tabs-*` |
| 11 | Fixed | The consent box is the kit's checkbox: 20px, 6px corners, a 1.5px `--b-field-edge` ring, teal with a 14px check, the disabled pair while sending, the system box under forced colours (was 24px, 7px corners, `#9AA3A8`). It sits on the first line at every width: box centre y402.2 against the first line's 401.5 at 1440 (was 414 against 401.5); the label is a two-column grid whose one row is centred, so a one-line consent still centres in its 48px target. | `r03-delete-1440-*`, `r11-delete-390-*` |
| 12 | Fixed as scoped | Home's started-shift state uses Time's words from `work-copy.ts`: "Not clocked in · 30 min" (and "· 2 h" after an hour), computed from the snapshot's read time and the shift's start (it was "Not clocked in yet"). The instruction sentences and the repeated 7:00 PM are unchanged and listed for Jose. | unit test (`home-b.test.tsx`; the fixture has James clocked in) |
| 13 | Fixed at 1440; tablet chip size left | DESIGN.MD records "Shift lead" for the desktop week card (Direction B final round, line 1797: "a 'Shift lead' chip on the day block … ('Lead' on a tablet's narrow day)"). The week is now a size container: where every day block holds a status chip and "Shift lead" on one row (137px or more, which is the 1080px card), every block says "Shift lead" (1440: "Now" and "Shift lead" share one row in today's 139px block with 4px to spare). Narrower blocks (1024 to about 1420px, tablets) keep "Lead" for the whole week, as Phase 4 decided, so one week still has one word. A plain 1280px switch would have stacked the two chips and grown every block (checked at 1280 before switching to the container). Tablet chips stay 18px; listed for Jose. | `r13-lead-week-1440-*` |
| 14 | Fixed | From 768px Help's reply line, Delete account's "What may be kept" and Availability's day rows divide on the card's 22px text edge, as the kit list does (they ran edge to edge). Phones keep full-width rules, as their lists do. | `r14-help-1440-*`, `r14-availability-1440-*`, `r03-delete-1440-*` |
| 15 | Fixed | Each card ends at its content: Home on tablets and the sideways phone (Employee and Lead), and Schedule's Today card with This week from 1024px. Employee Home 900: Coming up no longer stretches 110px; Lead Home 900 and 844: Things to do ends under Review (no 135 to 150px void); Schedule 1440: Today is 130px tall with its row under the header (was stretched to 183 with the row floating). This reverses "end together" from TB-006 and EM-013 (builder decisions in the Nov 11 review, not Jose's); listed for Jose. | `r15-lead-home-900-*`, `r01-home-900-*`, `r01-lead-home-844-end-*`, `r02-sched-1440-*` |
| 16 | Fixed | "Off" (and "Turned off") on Your calendar link is the quiet status text, not a grey chip; device alerts' "Off" is the same ("Active" and "On" stay teal chips). A declined notice keeps its kind's glyph in the grey circle: "Time off declined" is CalendarMinus (the X read as a dismiss control); approved keeps the green check. | `r08-r16-calendar-1440-*`, `r04-notifications-1440-*` |
| 17 | Not mine | Shell (rail cover at 844); left to its owner. | |

## Every changed word

| Where | Before | After | Spanish |
|---|---|---|---|
| Home, shift card, a shift under way with no punch | Not clocked in yet | Not clocked in · 30 min (Time's existing `work-copy` form) | Sin registrar entrada · 30 min (existing `work-copy` entry; the signed-in app renders English) |

No other word changed. The clock line shows the same words with the emphasis swapped; "Main Office" is joined by a
no-break space. No payroll or legal sentence changed.

## Files

`src/app/app/employee-b-account.css`, `employee-b-desktop.css`, `employee-b-work.css`;
`src/components/employee-b/` `account-b-client.tsx`, `account-b.tsx`, `account.css`, `employee-b.css`, `exchange-b.tsx`,
`home-b.tsx`, `messages-b.tsx`, `schedule-b.tsx`, `schedule.css`; tests `account-b.test.tsx`, `home-b.test.tsx`,
`schedule-b.test.tsx`, `src/components/employee-mobile/calendar.test.tsx`. No kit, shell, Owner, Manager, signed-out,
Clocker or restrictions file changed.

CSS rules: every `!important` is inside `@layer nv-b`; media queries are the aliases (767, 768, 1023, 359, 1280); the
one new container query (`eb-week`) follows the `c-sched` container queries already in `employee-b-desktop.css`; values
are tokens (`--b-btn-h`, `--b-inset`, `--b-inset-wide`, `--b-space-12`, `--b-ic-lead`, `--b-fs-*`, `--b-lh-*`,
`--b-seg-fs`, `--b-field-edge`, `--b-quiet-edge`, `--b-disabled-bg`, `--b-focus-*`), with 6px and 10px as the recorded
literals. Rules that touch a button's height stay under the Employee coarse-pointer rule, so touch screens keep 48px.

## Checks

- Captures (each exit 0, source check held): base probe `U/cap/fc-probe-before` (Employee, 14 routes at 1440, 900, 390,
  320) and `fc-probe-before-844`; after `fc-employee` (first pass), `fc-employee-final` (16 routes at 1440, 900, 390,
  320, including the time-off form), `fc-employee-phone` (6 routes at 900, 390, 320 at the final commit), `fc-lead` and
  `fc-lead2` (Lead at 1440, 1280, 900, 390, 320), `fc-employee-844` and `fc-lead-844` (touch phone sideways; the log
  records landscape and coarse matched), `fc-form` and `fc-form-844`. I looked at every after picture of the routes I
  changed region by region against the before, and measured the geometry the reviewer measured (table above).
- Scan logs: no horizontal overflow on any route; small targets on Schedule 390 fell from 3 to 2 (Confirm left the list),
  Home 900 from 3 to 2 (Shift details left it); the delete consent box is listed at 20x20 as it was at 24x24 (its target
  is the 48px label row). Page errors are the same as the base (the `/api/notifications` 403 on the fictional seed).
- Type check through `U/heavy.sh` (`NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`): clean in `src`; the
  6 errors are in `zz-scan/states.ts` (the capture tool's).
- `npx eslint` on the changed TypeScript files: clean (one `react-hooks/static-components` finding on my first version of
  the notice glyph was fixed by choosing the glyph inline).
- Targeted tests: `src/components/employee-b`, `src/components/employee-mobile`, `employee-schedule-corp`,
  `b-viewport`, `b-reduced-motion`, `b-foundation`, `b-tokens`, `owner-b`: all pass (386 and 250 tests).
- Full run `U/heavy.sh npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 935 files passed, 24 skipped; 14,428 tests passed, 741 skipped (at `0cec84d92`). The manuals guard outside that set
  was not run (it fails by design after any source change).
- `git apply --check -R U/p9/fc.patch`: passes.

## Needed from another package

- FA (restrictions, per the coordinator): "Ask for agreed times" is 36px at every width (scan 168x36). The ladder's state
  action step, in `src/app/app/b-restrictions.css`:
  ```css
  :is(#c-root, html) .app-shell[data-nv-b] .rs .rs-main > .b-btn { min-height: var(--b-btn-h); padding: 0 18px; font-size: var(--b-fs-body-sm); line-height: var(--b-lh-body-sm); }
  ```
  (one id, so the Employee coarse-pointer rule still makes it 48px on touch).
- Help's How to list (`src/app/app/help/page.tsx`, owner of that page):
  ```diff
  -import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
  +import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
  +import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
  -      { href: "/app/schedule", title: "Confirm your schedule", icon: <CalendarBlankIcon weight="bold" /> },
  +      { href: "/app/schedule", title: "Confirm your schedule", icon: <CalendarCheckIcon weight="bold" /> },
  -      { href: "/app/my-time", title: "Fix a missed punch", icon: <ClockIcon weight="bold" /> },
  +      { href: "/app/my-time", title: "Fix a missed punch", icon: <PencilSimpleIcon weight="bold" /> },
  ```
  (keep the `ClockIcon` import only if something else in the file uses it).
- Kit (optional, nothing blocks): b-foundation.css TB-031 still sets Create calendar link to 48px from 768px; my Employee
  rule outranks it. Changing that foundation line to `min-height: var(--b-btn-h)` with 14.5/20 would let the override go.
  Rows 3, 6 and 10 needed no kit change: each is an Employee-scoped rule in `employee-b-account.css` inside `@layer nv-b`.

## For Codex

Nothing. No server file, read, handler or contract changed; "Not clocked in · N min" is computed in the page from the
snapshot it already has.

## For Jose

- Row 12, left as they are: Home says "Breaks and clock out on the Main Office tablet", Time says "Take breaks and clock out
  on your location's tablet." Home's first screen says 7:00 PM three times (hero "On shift until", the card's "Until"
  meta, the range); B6 dropped the "Until" meta for a Lead when the hero says it, and the same could apply to an Employee.
  Time's card says "● Clocked in" in its header and "Clocked in at …" under it, and "1 h 19 min so far" beside a row
  reading "1 h 19".
- Row 13: on tablets the week card's chips are 18px ("Now", "Lead") rather than the 22px kit chip, kept small on purpose
  by P3 so they fit a 77px day. Keep, or grow them and let the time take two lines?
- Row 15: cards now end at their content on Home tablets and Schedule desktop, reversing "end together" (TB-006, EM-013).
  The neighbours' bottoms no longer line up; in exchange no card carries empty white.
- Row 8: Send request (time-off form) and Create calendar link are 44px from 768px; on phones Send request is still 56px at
  17px (the phone form's own rule) where the ladder says 52.
- Seen, not changed (not in the review): Delete my account is 56px at 17px on every width; the ladder gives a destructive
  confirm 52px. "Change one week" on Availability keeps CalendarBlank (it picks a week).
- Row 4: Availability now uses UserCheck everywhere in the Employee screens (the navigation's glyph), not CalendarBlank.

## Not verified

- On break, "Not clocked in · N min" and "Still clocked in" on Home: the fixture has James clocked in, so these are unit
  tests only.
- Device alerts' "Off" and the calendar link's "Turned off": markup and unit test only (routes not captured).
- The Confirm pill while "Confirming…" (a server action); its width hold from 768px is by measurement of the words, not by
  pressing it.
- Real phones and tablets: the 390 and 320 captures are a desktop browser; the 844 captures are Chromium's touch emulation.
- Keyboard order, focus rings, reduced motion, High Contrast and 200% text were not re-run; no focus or motion code
  changed. The consent box's forced-colours rule is source only.
- The Lead's "Shift lead" container switch was checked at 1440 and 1280 only (not at 1400 to 1440).

## Coordinator note (after combining)

Row 15 was reverted when FC's patch was combined. Phase 4 approved the end-together cards on Home (tablets and the phone
held sideways) and on Schedule's Today and This week; making each card end at its content changes that approved layout,
which is not clearly an upscale. Home's `.b-stack` is back to `align-items: stretch`, and Schedule's `#b-my-agenda` and
`.es-tw` are back to `align-self: stretch`, with the TB-006 and EM-013 comments. The choice is on Jose's list.
