# FB: Owner settings and account pages, and the Manager's More, Help and Profile (final verification, Nov 18, 2026)

Builder FB. Worktree `.ui-work/wt/fb`, base `16a64b001` (the combined premium tree), detached temporary commits only, never
pushed, no branch. Captures ran from a second detached worktree, `.ui-work/wt/fbcap`, checked out at each `wt/fb` commit,
so a running capture never saw an uncommitted edit. Fictional workspace on a throwaway local Postgres; not Development,
not production.

Release sequence (Jose's policy, Nov 12): this is local UI work on fictional data. Codex integrates and verifies the
combined backend and UI on Development; only the exact verified release goes to main after Jose approves. Nothing here
authorizes a merge, a deployment or a paid activation.

- Patch: `.ui-work/p9/fb.patch` = `git diff 16a64b001 6c94ec1ee --binary -- . ':!zz-scan' ':!vitest.zz-scan.config.mts'`
  (9 files). `git apply --check -R` passes on `wt/fb`.
- Evidence: `.ui-work/p9/fb-evidence/` (before and after crops; names start with the review row).
- Captures: before `cap/fin-owner2`, `cap/fin-manager`, `cap/fin-manager-844`, `cap/fin-employee` (the reviewer's) and
  `cap/fb-base-844` (mine, at `16a64b001`, the sideways phone for PINs, Profile, Delete account and More); after
  `cap/fb-owner` (Owner, 14 routes, 1440/900/390/320), `cap/fb-manager` (More, Help, Profile, 4 widths),
  `cap/fb-owner-844` and `cap/fb-manager-844` (sideways phone, `NEVORA_SCAN_DESK=0`), `cap/fb-owner-final` (Profile,
  Shift matching, Punch photos after the last Profile fix), `cap/fb-pins-320` (PINs at 390 and 320 after the last grid
  fix), `cap/fb-manager-final` (Manager Profile at 1440 and 390) and `cap/fb-employee` (Employee Help at 1440 and 390, at
  the final commit `6c94ec1ee`). Measurements come from a deeper rect probe (`zz-scan/probe-rects.js`,
  committed in `wt/fb` only and excluded from the patch) in `cap/fb-probe0` (before) and `cap/fb-a1`, `cap/fb-owner`.
- Skills: `nevora-ui-readiness`, `tastemaker`, `better-interface`, `stop-slop`.

## Rows

| # | Result | What changed, with numbers | Evidence |
|---|---|---|---|
| 1 (blocker) | Fixed | Clocker PINs from 768px: the search and the No PIN / PIN set filter sat on the band's last pixel (strip 220 to 264, band end 264). The content kept the frame's 52px gap above it, so the foundation's 20px rule never applied. Now the strip is 20px under the title block, 188 to 232, the band ends at 264 with 32px of band under the strip, and the first card starts at 288, 24px under the band: the same frame as Notifications (title 130, strip 188 to 232, band 264, card 288). Same at 900 and on the sideways phone. The `.c-pins__seg + *` 56px gap the foundation intended now holds (my Clocker sheet had overridden it with 24px). | `r01-pins-1440-*`, `r01-pins-844-sideways-*` |
| 4 | Fixed | More, Owner and Manager: your face takes the 36px lead slot (it was 32px, and from 768px the shared desktop avatar rule added 14px after it), so your name starts on the other labels' edge: 1440 name x377 to x367 (labels x367); 390 x79 to x83 (labels x83); the sideways phone matches. Initials 13px at 600 in your own tint (spec 3.5; it was 700). | `r04-more-1440-*`, `r04-manager-more-390-*`, `r04-manager-more-844-sideways-*` |
| 5 | Fixed on my pages | One ladder. Full-width primary on phones, 52px at 16/22 600: Make reset link (was 44), Check code (was 48), Delete my account and Keep my account (were 48), Add tablet (was already 52; its label goes from 14.5/18 to 16/22 so all four match). Form footers from 768px, 44px at 14.5/20 600: Make reset link (was 48), Delete my account and Keep my account (were 48); Check code, Add tablet and Go to Home were already 44. Every Settings page footer button from 768px (Save on a save card, Punch photos' Save) follows the same 44px step. Profile's band Edit: 48px from 768px (was 42; still centred on the name line, y83 to 131 around 107) and 40px on phones (was 36; now level with the 40px back circle; the 44px target stays). | `r05-arec-1440-*`, `r05-arec-390-*`, `r05-r13-r23-delete-1440-*`, `r05-r13-delete-320-*`, `r05-r11-r12-profile-1440-*`, `r05-r34-profile-390-*`, `r05-r11-r12-profile-844-sideways-*` |
| 9 (Clocker recovery part) | Fixed | "Time wrong or missing? Fix it in Timecards" draws Timecards' glyph, the Clock, instead of the counter-clockwise clock (which is Time corrections). | `r09-crec-1440-*` |
| 10 | Fixed | Help's Common questions divides its rows as How to and Privacy and terms do. The question rows were drawn on their own white fill, which covered the list's inset divider from 768px; on phones they drew a second, full-width line instead. Now every question row after the first shows the list's own inset divider at every width, Owner and Manager. | `r10-help-1440-*`, `r10-help-390-*` |
| 11 (Profile part) | Fixed | Profile's values are no longer tabular: "555 - 0100" reads "555-0100" (64px wide at 1440, was 73). The rule that forced tabular figures on every Profile value is in my Settings sheet; it now sets Inter's normal figures. | `r05-r11-r12-profile-844-sideways-*`, `r05-r11-r12-profile-1440-*` |
| 12 | Fixed | Every value in Your details ends on one edge. An Owner's Time zone keeps the chevron's place (value right edge 1085 to 1057, as Phone and Email). A Manager's Time zone and Access keep the lock's place (1085 to 1063, the locked values' text edge). Under 360px a Manager's locked rows stack, so that rule steps aside there. | `r05-r11-r12-profile-1440-*`, `r12-r24-manager-profile-1440-*` |
| 13 | Fixed | The consent box sits on the first line: 1440 box y977 to y966 (first line 965 to 987, box centre 976 on the line's centre); 390 y1003 to y981 (first line 980 to 1002); 320 the same. | `r05-r13-r23-delete-1440-*`, `r05-r13-delete-320-*` |
| 14 | Fixed | Payroll settings under 360px moves each value under its title, as the Settings hub does: "First period" over "Started Mon, Oct 19" in grey 13.5/18, the chevron centred on the row. No title or value breaks beside the other. (This replaces Phase 8's B #35 rule, which kept the value on one line and let the title break.) | `r14-payroll-320-*` |
| 18 | Fixed | A locked switch's thumb carries the bold LockSimple outline, at 16px (was the filled glyph at 14px), the same lock Company profile draws. | `r18-features-lock-1440-*-2x.png` (2x enlargement) |
| 22 | Fixed | The Settings hub keeps one order from 768px: Company then Scheduling on the left, Clocker then Pay on the right, at 900 as at 1440 (900 had Pay under Company and Scheduling on the right). | `r22-settings-900-*` |
| 23 | Fixed | Delete account from 768px: "Your job and your workplace" and its two sentences start on the cards' text edge (x296 to x319, as the notes on Clocker PINs and Clocker tablets), at the notes' 13.5/18 (was 13), and the heading is 600 in ink 2 (was grey 500), so it reads as a heading over its sentences. Phones keep the group-label look of the page's other labels. | `r05-r13-r23-delete-1440-*` |
| 24 | Fixed | One rule for reason lines, no closing period: "Jose Natal can change this." is now "Jose Natal can change this", matching "Locked while you have shifts" and the field errors. See "Every changed word" and "For Jose". | `r12-r24-manager-profile-1440-*` |
| 29 | Fixed | Clocker PINs on phones. 390: the card starts 16px under the band (y270 to y280; it sat 6px under). 320: each person's action stays on their name's line and the position and location run under both (rows 112px to 82px; the card 1390px to 1030px tall). The name column is 119px, so every fixture name fits on one line, Gabriela Santos included; a longer name wraps beside the pill. Names stay on the x83 text edge. The kit still moves a row's button under its words below 360px everywhere else; this is page-scoped. | `r29-pins-390-top-*`, `r29-pins-320-rows-*` |
| 34 | Fixed | Profile on phones: the band's face starts on the 16px gutter (x20 to x16), under the back button and on the cards' edge; the name moves from x86 to x82. | `r05-r34-profile-390-*` |
| 36 | Fixed | Punch photos' helper lines wrap with `text-wrap: pretty`: at 320 "Turn on Take punch photos to / choose these." (no one-word last line). | `r36-photos-320-*` |
| Coordinator note (FC) | Fixed | Help's How to list (Employee and Lead) uses the Employee pages' glyphs: CalendarCheck for "Confirm your schedule" (was CalendarBlank, the Schedule tab's glyph) and PencilSimple for "Fix a missed punch" (was Clock). More, Profile and my other files draw none of these concepts (confirm a schedule, fix your time, Availability), so nothing else changed. The Clocker recovery link keeps the Clock: it opens the Owner's Timecards, per review row 9. | `r-fc-help-employee-1440-*` |

Rows 2, 3, 6 to 8, 9 (Timecards part), 11 (Timecards part), 15 to 17, 19 to 21, 25 to 28, 30 to 39 belong to builder FA,
another builder, or are pending; I did not touch them.

## Every changed word

| Where | Before | After |
|---|---|---|
| Profile, a Manager's locked Phone and Email, the line under the value | Jose Natal can change this. (or "An Owner can change this.") | Jose Natal can change this (or "An Owner can change this") |

English only: the Owner and Manager signed-in pages carry no Spanish. No other word changed. No payroll or legal sentence
changed (the deletion consent and retention sentences are as they were).

## Files

- `src/app/app/owner-b-settings.css`: tablet hub order (B #22), Payroll settings under 360px (B #14), Profile values'
  figures (B #11), the locked switch's lock (B #18), More's lead slot (B #4), Settings footer buttons from 768px and Help
  someone sign in's phone primary (B #5).
- `src/components/clocker-owner-b.css`: Clocker PINs frame on phones and from 768px (B #1, #29), the 320 grid (B #29),
  full-width primaries' label on phones and Check code at 52px (B #5), helper wrap (B #36).
- `src/components/clocker-recovery-review.tsx`: the Clock glyph on the Timecards link (B #9).
- `src/app/app/help/help.css`: Common questions dividers (B #10).
- `src/app/app/help/page.tsx`: How to glyphs (coordinator note).
- `src/app/app/account/delete/account-deletion.css`: buttons on the ladder (B #5), the box on the first line (B #13), the
  workplace note (B #23).
- `src/components/manager-profile/manager-profile-upscale.css`: phone band face on the gutter (B #34), values on one edge
  (B #12), Edit at 40 and 48 (B #5).
- `src/components/manager-profile/manager-profile-live.tsx` and `manager-profile.test.tsx`: the reason line (B #24).

All new `!important` declarations are inside `@layer nv-b`; media queries are only `(max-width: 767px)`,
`(min-width: 768px)`, `(min-width: 768px) and (max-width: 1023px)` and `(max-width: 359px)`; colours are tokens. Nothing
animates.

## Checks

- Type check through `heavy.sh` (`NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`): 0 errors in `src`;
  6 in `zz-scan/states.ts` (the capture tool's).
- `npx eslint` on `clocker-recovery-review.tsx`, `manager-profile-live.tsx`, `manager-profile.test.tsx`,
  `help/page.tsx`: clean.
- Tests for touched areas: `b-viewport.test.ts`, `b-foundation.test.ts`, `src/app/app/settings`, `src/app/app/more`,
  `src/components/manager-profile`, Clocker recovery, Clocker photo, PIN inventory, account deletion: 30 files, 298 tests
  passed; Help: `help-not-found.test.tsx` and the access-help page test, 14 passed.
- Full run `heavy.sh npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 935 files passed, 24
  skipped; 14,425 tests passed, 741 skipped; 0 failed. It ran on the tree before the last two commits (the 320 grid
  column and Help's two glyph imports); after them the CSS guard tests, the touched-area tests and Help's tests were run
  again and pass.
- `git apply --check -R .ui-work/p9/fb.patch` on `wt/fb`: passes.
- Captures: every run `exit 0`; no horizontal overflow on any captured route and width; frame probe unchanged on every
  Owner route from 768px (titles 88 or 130, band ends 196, 224, 264 or 296, first cards 220, 244, 248 or 288, as before).
  The only console error is the 404 that `/app/nope` is meant to produce (the base has it too).
- Controls under 44px after (phones): PINs' segment buttons 36px (with the foundation's 44px `::after` target, unchanged),
  switches 51x31 and checkboxes 20x20 inside 48 to 64px labelled rows, Profile's Edit 58x40 with a 44px target, Clocker
  recovery's Refresh 80x36 with a 44px `::after` target (a card-header pill, 36 on the ladder).

## Needed from the kit (FA)

1. The save-card footer button, `src/app/app/b-foundation.css` (NV-102 block, about line 538), is 48px; the spec's
   ladder gives form footers 44px. My Settings sheet sets 44px on the Settings frame only, so the kit and every page agree
   if the kit moves too:
   ```diff
   -      flex: none !important; width: auto !important; min-width: 96px !important; height: 48px !important; min-height: 48px !important; margin: 0 !important;
   -      padding: 0 var(--b-space-24) !important; border-radius: var(--b-radius-pill) !important; font-size: var(--b-fs-body) !important; line-height: 20px !important;
   +      flex: none !important; width: auto !important; min-width: 96px !important; height: var(--b-btn-h) !important; min-height: var(--b-btn-h) !important; margin: 0 !important;
   +      padding: 0 var(--b-space-20) !important; border-radius: var(--b-radius-pill) !important; font-size: var(--b-fs-body-sm) !important; line-height: var(--b-lh-body-sm) !important;
   ```
   (and "a right-aligned 48px pill" in its comment becomes 44px). Shift matching's Save (`.c-grace__foot`, another
   builder's page) still draws 48px from this kit rule; I left it out of my rule on purpose.
2. Desktop band pills in `src/app/app/owner-b-desktop.css` are 42px (`.q-nav > .q-nav__r` at about lines 187, 204 and
   294); the ladder gives the band 48px from 768px. I moved only Profile's Edit (in my Profile sheet). Proposed: replace
   `height: 42px !important; min-height: 42px !important` with `height: var(--b-btn-h-band) !important; min-height:
   var(--b-btn-h-band) !important` in those three rules, and re-check the absolutely placed pills' `top` so they stay
   centred on the title line (Profile needed `top: -5px` for 48px).
3. Optional tidy-up, `src/app/app/b-foundation.css` NV-130 block: `.wc-content:has(> .c-pins > .c-pins__search) {
   margin-top: 20px }` never applied (it lost to the frame's 52px); my Clocker sheet now sets it on the PINs page. The kit
   rule can stay or go; nothing depends on it.

## Needed from another package

- Shift matching (other builder): its footer Save is the kit's 48px; with the kit change above it becomes 44px like the
  rest of Settings.

## For Codex

Nothing. No read, contract, route, flag or server file changed.

## For Jose

- The reason line under a Manager's locked Phone and Email lost its closing period ("Jose Natal can change this"), to
  match "Locked while you have shifts" and the field errors (DESIGN.MD: errors carry no closing period). Say if you want
  the period back on both instead.
- Clocker PINs at 320: the person's action now sits on their name's line with the position and location under both. A
  name wider than 119px (longer than "Gabriela Santos") wraps to a second line beside the pill at 320 only.
- Profile: a read-only value keeps the chevron's (Owner) or the lock's (Manager) place so every value ends on one edge, as
  the review asked. Native settings apps usually set such a value flush to the right edge instead; I followed the review.

## Not verified

- `/app/billing`: billing is off in the harness (the route renders the in-app 404), so the page was not seen.
- Settings forms' footer Save at 44px (Company profile, Payroll settings, a location, Branding, Punch photos): Save
  appears only after a change, so it was not in a capture; the rule is the same one that measured 44px on Help someone
  sign in.
- Clocker PINs' PIN set and Inactive tabs at 320 (the fixture has no PIN set and no inactive person): their Reset PIN and
  View profile buttons are wider than Set PIN, so names wrap sooner there.
- Hover, focus rings and keyboard order, reduced motion, High Contrast, 200% text, screen readers, menus and dialogs were
  not exercised in this pass. Signed-in Owner and Manager pages are English only.
