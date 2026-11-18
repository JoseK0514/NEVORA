# Phase 8 fix F2b: the Owner's Settings and account pages, a Manager's closed pages

Worktree `$S/wt/p8f2b`, detached, last temporary commit `5ac81a11` on `e79ccdff` (never pushed, no branch).
Patch: `$S/p8fix/f2b.patch` (21 files, `git apply --check -R` passes in the worktree).
Evidence: `f2b-evidence/` (59 PNGs, the three scan logs). Every state is from the real local server on the
owned Postgres with fictional data; nothing was forced.
S = `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-CLAUDE-CODEX-COLLAB/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad`.

Review A (`a.md`) has no row on these pages; every row below is review B's (`b.md`).

## Defects (review B numbering)

| B # | Status | What changed, or why not | After evidence |
|---|---|---|---|
| 1 | other package (F1) | Clocker PINs search and tabs band wrap is the shared band layout. | |
| 2 | other package (F1) | Tablet rail at 844x390. | |
| 3 | fixed | "How this works" is a card 16px in from both edges with its words 19px inside, like the cards above it (`owner-b-settings.css`, scoped to `.wc-recovery`, so F4's sheet is untouched). Probe: card 16 to 304 at 320, padding 18. | help-sign-in-after-320, -390 (before: help-sign-in-before-390) |
| 4 | other package (F3) | Account deletion. | |
| 5 | fixed | The legend over the four moments spans the row, so its divider runs the card's width like the blocks around it (a legend shrinks to its words, which made the stub). | punch-photos-off-1440, -320 (before: punch-photos-before-1440) |
| 6 | fixed | While photos are off each moment switch is unchecked in the page (drawn and announced off; the kept choice stays in the draft and returns when photos go on), drawn with the disabled pair (#F0F2F3 track, #8C9397 edge, knob left, no greyscale filter), and its label is #8C9397 at every width. Probe: bg rgb(240,242,243), knob transform none, title rgb(140,147,151) at 390 and 1440. | punch-photos-off-1440, -900, -768, -390, -320 |
| 7 | fixed | Save shows only when the form differs from what is saved (`photoSettingsChanged`), as on the other Settings forms. Measured: no Save on load, Save after changing the days, gone again after undoing the change. When the pressed Save leaves with a saved change, focus moves to the "Saved" line (read once, no ring, no live region). | punch-photos-off-1440, punch-photos-changed-save-1440, -390, punch-photos-saved-focus-1440, -390 |
| 8 | other package (F1) | Search and track spacing and band depth on Clocker PINs are the shared band layout. | |
| 9 | other package (F1) | `.b-note` offset. | |
| 10 | fixed | The tablet sub-line wraps only between its parts (the kit's `Dotted`), and at 359px and under a row's two actions stack, each on the words' left edge. | clocker-tablets-320 |
| 11 | fixed (Clocker recovery part) | The placeholder is gone; the label and the help line already say what to type. Team's placeholder is F2a's. | clocker-recovery-320 |
| 12 | other package (F2a) | Team filters. | |
| 13 | fixed | At 359px and under, "How you checked" puts its answer on its own line under the label, so "In person, photo ID" shows whole (probe: 222px wide, no scroll width). | help-sign-in-after-320 |
| 14 | fixed | The hint keeps 16px above the footer's divider from 768px. | help-sign-in-after-1440, -900 |
| 15, 16, 17 | other package (F3) | Account deletion. | |
| 18 | fixed | At 359px and under, a chip or a worded value moves under its row's title ("Clocker tablets" over "1 not set up", "Payroll settings" over "Weekly"); short counts stay beside the title. | settings-hub-320, -390 |
| 19 | fixed | Same rule on More: "Insights" over "138 h this week". The profile line wraps between whole parts ("Owner" / "Northside Café & Bakery"). | more-owner-320, manager-more-320 |
| 20 | partly | The empty Statements card is the kit's empty state card (grey tray circle, title, line, on the rows' inset); "In 10 days" is plain grey text. The words are the existing ones: "Only you can see them." is a payroll sentence, so the rewrite is under For Jose. | my-pay-1440, my-pay-320 |
| 21 | partly; needs F1 | Fixed on these pages: at 359px and under the quiet link under the tinted pill starts on the text edge (it sat 8px in; review C #29 is the same on the 404). Not changed: the bell, avatar and 14px gutter. They come from the shared state-screen frame (`.c-route-state--checking > .b-screen--back`), which also draws loading, route-error and access states; see Needed from another package. | not-found-320, manager-payroll-closed-320 |
| 22 | fixed | The Owner's name is joined with non-breaking spaces (names only; "or" between two names can still break), and closed-page and 404 lines use `text-wrap: pretty`. | manager-settings-closed-1440, -900, -390, -320 |
| 23 | fixed | Same two rules: no lone "them." at any width. The sentence is unchanged (payroll); a shorter one is under For Jose. | manager-payroll-closed-1440, -900, -390, -320 |
| 24, 25, 26 | other package (F2a) | Team, Notifications, Manager Home and Things to do. | |
| 27, 28, 30, 31 | other package (F2a) | Timecards, Schedule, Insights and restrictions are shared with the Owner's work pages. | |
| 29 | other package (F1) | First-card position on Schedule. | |
| 32 | partly | The contact note is the Contact card's footer at every width (it floated on the canvas on phones), grey 13.5/18 on the rows' inset, at most 68 characters a line. The words are the support policy's (`policies.ts`) and are unchanged; the shorter version is under For Jose. | help-1440, help-320 |
| 33 | fixed | A Manager's locked Phone and Email now read alike: value and a 16px bold lock on the right, who can change it under them (as Company profile). At 359px and under both stack the same way so the address is never squeezed. | manager-profile-1440, -390, -320 |
| 34 | other package (F2a) | Manager Home tile. | |
| 35 | fixed | The band's sub-line is the approved Payroll scope sentence that Payroll shows over the same tabs ("US dollars" read as a stray fact; the currency is fixed). At 359px and under a value stays on one line ("Started Mon, Oct 19") and a long title wraps, as its neighbours do. | payroll-settings-1440, -320 |
| 36 | fixed | In a save card (Company profile, Help someone sign in, a location) the row dividers and the footer divider stop at the 560px field block (probe: background size calc(100% - 44px), line 319 to 879). | company-profile-1440, help-sign-in-after-1440 |
| 37 | fixed | From 768px the Clocker pages use the Settings measures: cards 20px apart, headers, rows, forms, footers and state cards on the 22px inset (lead circles at 319), inset row dividers and an inset footer divider. | clocker-tablets-1440, clocker-pins-1440, clocker-recovery-1440 |
| 38 | fixed | One lock per locked feature: the one in the switch stays, the one after the title goes. | features-1440 |
| 39 | other package (F2a) | `BWhen` range spacing. | |
| 40 | fixed | Your own face on More keeps your face tint (DESIGN.MD Nov 7), white stays on the band and top bar. This reverses review F2's NV-105 white circle; see For Jose. | more-owner-320, -1440, manager-more-320 |
| 41 | not a defect | The tablet order is TB-015, a recorded decision in the sheet that balances the two columns. Suggested DESIGN.MD line under For Jose. | settings-hub-900 |
| 42 | other package (F3) | Account deletion. | |
| 43 | needs Jose | "Privacy Policy" and "Terms of Use" are the documents' own titles (`policies.ts`, legal). Changing the rows alone would make the row and its page disagree. | |
| 44, 45, 46 | other package (F2a) | Things to do, Timecards, Manager Home. | |

Also fixed on these pages, found while checking them:
- Clocker tablets: a new setup code no longer sends a toast as well; the code card is the result and focus moves to its
  title (Phase 7 "a result drawn inline sends no toast"). clocker-setup-code-1440, -390, -320.
- Setup code card: the end date and time stay on one line ("Nov 18," / "12:15 AM" split on phones) and the sub-line
  uses `text-wrap: pretty`.
- Help someone sign in: "How this works" reads at the 560px block width from 768px (its note ran about 125 characters).
- Punch photos: the "Saved" line sits on the rows' text edge with the card's bottom space.
- Profile band: "Manager · Northside Café & Bakery" wraps between whole parts at 320.
- Locations: a dash inside a location's full name stays at the end of its line (a line started with the dash at 390).

Checked and fine as they are at 1440, 900, 390, 320: Positions, Break types, Branding, Company policies, Punch photo
review, Billing (commerce off, the 404), the Owner's Profile. Scan logs: overflow 0 and no small targets on all 84 Owner
and 36 Manager route and width pairs, no page errors.

## Sentences changed

| Where | Old | New | Spanish |
|---|---|---|---|
| Clocker recovery, code field placeholder (`lookupPlaceholder`) | The code shown on the tablet | (removed; the label "Code from the tablet" and the help line stay) | "El código que muestra la tableta" removed |
| Payroll settings, band sub-line | US dollars | Calculate pay and share statements. You pay your team outside NEVORA. (the approved scope sentence, reused word for word) | n/a, signed-in app is English |

No other wording changed. Non-breaking spaces were added inside names (closed pages), inside the setup code's end date
and time, and before a dash in location names; these change wrapping only. The signed-in app renders English, so only
the Clocker copy module has Spanish; its key was removed from both languages and the Spanish render tests still pass.

## Files touched

- Styles: `src/app/app/owner-b-settings.css` (one new Phase 8 block, the Manager profile phone rules narrowed to the
  editable email), `src/components/clocker-owner-b.css`, `src/app/app/more/more-corp.css`.
- Components and pages: `src/components/clocker-photo/photo-settings.tsx`, `src/components/clocker-device-manager.tsx`,
  `src/components/clocker-recovery-review.tsx`, `src/components/clocker-owner-copy.ts`,
  `src/components/manager-profile/manager-profile-live.tsx`, `src/components/payroll/my-pay.tsx` (QuietMyPay only),
  `src/components/payroll/payroll-settings.tsx`, `src/app/app/help/page.tsx`, `src/app/app/more/page.tsx`,
  `src/app/app/settings/layout.tsx`, `src/app/app/settings/locations/page.tsx`, `src/app/app/payroll/payroll-route.tsx`
  (the Manager branch only).
- Tests: `photo-settings.test.tsx`, `clocker-device-manager.test.tsx`, `manager-profile.test.tsx`,
  `settings/layout.test.tsx`, `payroll/native-settings.test.tsx`, new `payroll/quiet-my-pay.test.tsx`.
- Not touched: `b-kit.tsx`, shared sheets, `access-recovery/*` (F4), `owner-only-notice.tsx`, any server module. The brief
  names `src/components/access-recovery/assisted-recovery.tsx`; the component is `src/components/assisted-recovery.tsx`
  and needed no change (the fix is CSS in my sheet).

## Checks run

- Type check through `heavy.sh` on the final tree: `src` clean; 6 errors, all in `zz-scan/states.ts` (the capture tool).
- `npx eslint` on every changed TypeScript file: clean.
- Targeted tests: 39 files, 536 tests passed (Settings, Clocker, recovery, More, Profile, My pay, Payroll settings, the
  viewport, foundation and reduced-motion guards).
- `heavy.sh npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 917 files passed, 24 skipped,
  14,086 tests passed, no failure.
- `git apply --check -R $S/p8fix/f2b.patch`: passes.
- Captures (final tree): Owner 1440, 900, 390, 320 on 21 routes with a geometry probe; Manager 1440, 900, 390, 320 on 9
  routes; touch 844x390 on 9 Owner routes. Interaction states in my own `zz-scan/states-f2b.ts` (untracked): Punch photos
  change, Save by keyboard and focus after it; the setup code card; Help someone sign in's error by keyboard at 320,
  390, 1440 (focus lands on the switch with its red edge).

## For Codex

- `src/lib/workspace-presentation/modules.ts:66` (`blockerText`): the Features reason for open shift requests ends "Let
  them finish first." while time off's says "Decide them first." Suggested: "7 shift requests are still open (swaps,
  cover and can't work). Decide them first." It lives in `src/lib`, so I left it.

## For Jose

- My pay, no statements (payroll sentence, unchanged): "No statements yet. / Only you can see them." Suggested: "No pay
  statements yet. / They show here after payroll is shared, and only you can see them."
- Closed Payroll for a Manager (payroll sentence, unchanged; the wrap is fixed): suggested "You approve timecards. Jose
  Natal runs payroll from them."
- Help, Contact (support policy text, unchanged; now the card's footer at 68 characters a line): suggested "We answer
  within two business days (Monday to Friday, except Puerto Rico holidays). Never email passwords, codes, bank details
  or pay documents.", with the full text kept in the policy.
- Help rows "Privacy Policy" and "Terms of Use" are the documents' titles. Sentence case would need the documents
  renamed too.
- Payroll settings now carries the Payroll scope sentence under its title (reused, not rewritten). Confirm.
- More: your own face now keeps your tint (DESIGN.MD Nov 7), reversing review F2's white circle (NV-105).
- Suggested DESIGN.MD lines: "Settings on tablets: Company then Pay on the left, Clocker then Scheduling on the right
  (TB-015)." and "A switch that can't be used right now is drawn off with the disabled pair (#F0F2F3 track, #8C9397
  edge, knob on the left) and a grey label; a feature locked on keeps the lock in its switch."

## Needed from another package

- F1 (shell and frame), review B #21: on a phone the state screens (`.c-page.c-route-state--checking >
  .b-screen--back`: the 404, closed pages, route errors, "unavailable" and access-check states) draw the root header
  (bell, avatar with its caret) and the 14px Home gutter, while pushed pages draw only "‹ label" at 16px. Suggested: in
  `owner-b-shell.css`, hide the phone header's bell and avatar when the page is a `b-screen--back` state screen, and give
  `.c-route-state--checking > .b-screen--back` the 16px hero and stack gutter. I did not change it because it is the
  shared frame of every state screen, including loading and errors.
- F1, landscape: at touch 844x390 the band fills most of the screen and the back link sits under the top bar on these
  pages too (help-sign-in-touch-844x390, punch-photos-touch-844x390). Nothing of these pages' own layout breaks there.
- F4 (optional copy): Help someone sign in's button "Make reset link" (`access-recovery/copy.ts`); review B suggests
  "Create reset link".

## Not verified

- One person's PIN form and its "PIN set for ..." result: the harness has no PIN secret, so the page shows "PINs can't
  be set right now" (real server state). The form is covered by its unit tests only.
- Keyboard order across whole pages, screen readers, 200% text, Safari and Firefox. Keyboard was exercised only for
  Punch photos' Save and Help someone sign in's error.
- Reduced motion: no motion was added or changed (the captures use reduced motion).
- Help requests rows on Clocker recovery with data (the harness has none); Branding's preview; a location's own page.
- The Manager pages at 844x390 (Owner only was run in touch landscape).


---
Filing note (Nov 18, 2026): paths under `p8cap/`, `p8fix/`, `wt/` or `f3work/` name working files in the session scratch that were not kept. The pictures kept are in the folders beside this report.
