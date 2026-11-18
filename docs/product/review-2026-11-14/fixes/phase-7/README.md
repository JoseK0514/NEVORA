# Phase 7: motion and finishing moments (Nov 17, 2026)

Phase 7 of the Nov 11 plan. Commit `3278e7d16e289d03f5c34710f8575fb5c1b7f3bc` on `claude-codex-collab-nevora`, built on `21aa6fec`. The work started on
`2189fc4e`; seven commits from another session landed on the branch while it was being built (`c18b19a7` to
`21aa6fec`: Phase 4 and 5 leftovers, ported browser tests, a Home fix, rebuilt guides). One file overlapped
(`src/components/employee-b/employee-b.css`, different lines) and merged cleanly. The checks below were run again on
`21aa6fec` plus this change. Development had not moved (`22107a24`).

Presentation, client modules, copy, styles and tests. No server read, handler, authorization rule, route, data
contract or calculation changed. No payroll or legal sentence changed. The Clocker's own motion (the glow, the receipt
check, the wrong-PIN shake) is untouched.

## What changed

97 files (1,901 lines added, 333 removed), in three packages.

| Area | Report | Main changes |
|---|---|---|
| Sheets, menus, toasts, press, reduced motion | [a-overlays-press-reduced-motion.md](a-overlays-press-reduced-motion.md) | One enter and exit for every kit sheet, the settings and passkey dialogs, menus, the command finder, toasts and the offline pill. One press feedback: rows, cards, tabs and links tint; compact controls scale. Every stylesheet with motion has a reduced-motion rule, and a test keeps it so. A phone sheet opened from a scrolled page no longer sits off screen. |
| One success pattern | [b-success-moments.md](b-success-moments.md), [b2-follow-up.md](b2-follow-up.md) | The kit's done state with one mark, in two sizes. Request sent (time off, pick up, can't work, correction, availability, agreed times), week confirmed, schedule published, timecard approved and payroll approved all use it. Four results that claimed more than the server said were corrected. The celebration is the same mark with one ring. |
| Loading | [c-loading-shimmer-spinner.md](c-loading-shimmer-spinner.md) | One shimmer on the shared placeholder. Nothing moves when a page replaces its placeholder. One spinner in place of seven. Busy buttons keep their width. The Settings pages use the kit placeholder. |

## The numbers

| Measure | Before | After |
|---|---|---|
| Controls that showed nothing when pressed, Employee | 115 of 249 | 0 rows or cards; the wordmark link remains |
| Controls that showed nothing when pressed, Owner | 156 of 316 | the wordmark link and one classless button remain |
| Stylesheets with motion and no reduced-motion rule | 12 | 0, kept by a test |
| Reduced-motion rules that covered only part of a sheet | 9 | 0 found |
| Distinct "done" looks | 16 | 1 pattern, 2 sizes |
| Spinner keyframes in the signed-in and signed-out app | 7 | 1 (plus the Clocker's) |
| Paint or layout frames during 2 seconds of shimmer (Chrome trace) | | 0 |

## What you will notice

- A sheet rises and leaves; a menu arrives from its corner; a toast that replaces another does not stack.
- Tapping a row shades it at once, on every role's lists. Pressing Enter on a row shows the same.
- After you send a request the form is replaced by a short result: a green check, "Request sent", who decides, and
  one next step.
- "Payroll approved" is said once, in the card. The toast is gone where the card shows.
- After publishing, Schedule shows which locations published ("1 of 2 locations published") from the page's own read.
- A loading page has a quiet light band crossing it after the first 300ms. Buttons that are busy keep their size and
  show a ring with their words ("Approving…", "Signing in…").
- With reduced motion on, none of this moves.

## What was corrected for truth

| Where | Before | Now |
|---|---|---|
| A shift change the server answered `completed` or `closed` | "Request recorded… keep your shift" | "Shift change made", or an amber "Request closed" with no mark |
| Schedule after publishing | Drawn from `?published=` alone, so a typed address or a partial publish claimed success | Drawn from the page's read of each location |
| Several timecards approved at once | Raw codes ("outcome unknown") | Words; the mark only when every card is confirmed |
| Payroll and Time exports | One teal callout for both success and "not confirmed" | Only a confirmed receipt gets the done card |

## How it was checked

On `21aa6fec` plus this change, in an isolated copy with an owned local Postgres and fictional data.

| Check | Result |
|---|---|
| Type check | Clean |
| Lint on the changed TypeScript files | Clean |
| Unit tests (`vitest run --dir src`, 1,042 files) | 15,298 pass, 944 skipped. 1 fails by design: the manuals guard. One tenancy migration test (`backfill.test.ts`) failed in the full run and passes alone (68 of 68); it has done this under load before. |
| Browser sweep, combined build, real sign-in | On `2189fc4e` plus this change: Owner (37 routes) and Employee (16) at 1440, 900 and 390, Manager (9) at 1440 and 390. No page errors, no horizontal overflow. On `21aa6fec` plus this change: Owner (9 routes) and Employee (8) at 1440 and 390, the same result. |
| Kiosk journey, English | 45 of 45 steps on `2189fc4e` plus this change (the Clocker is untouched; one shared spinner keyframe moved to the root sheet). Not run again on `21aa6fec`. |
| Motion, per pattern | Timed frames at 0, 80, 160, 300 and 600ms, the page's own animation log (properties, duration, easing), and the same trigger with reduced motion, by each builder on its own build |
| Sheets and menus | Focus on the opener in the first frame after closing; a tap straight after Escape reaches the page (Chromium). Drag-to-dismiss measured in Chromium and WebKit. |
| Success moments | Real server confirmations for time off, week confirmed, pick up, can't work, correction, availability, agreed times, timecard approval and schedule publish, at 390 and 1440 |

**Forced or unit tested only.** Payroll approval was seen with a forced reply (the fixture's payrolls are already
approved or wait for amounts). The U01 import and export finishes, swap and cover results, and several timecards at
once are unit tested. Sending, not confirmed and offline around the results were forced. 24 route and width pairs
never showed a placeholder in the browser (the local server sent the page in one piece) and are unit tested.

**Not run:** a production build, the browser integration suites, the QA scripts, a real phone, Safari on iOS, Firefox
(WebKit was Playwright's), a screen reader, forced colours, Manager and Lead beyond the press audit, the timed-frame
steps on the combined build (the sweep above checks pages, not motion), 900 and 320 for the success moments.

Evidence: [evidence-overlays-and-press/](evidence-overlays-and-press/), [evidence-moments/](evidence-moments/)
(the corrected Schedule and Payroll pictures are in `follow-up/`), [evidence-loading/](evidence-loading/).

## The tracker

`status.json` has no row for UI-7 or RA-21 (they are category findings, fixed here). Rows this phase touches:

| Finding | State | Note |
|---|---|---|
| OW-037 | partly, unchanged | The calm result is built. The 1.2s hold and automatic advance is your decision. |
| SY-022 | partly, note updated | The done and loading states are now one pattern each; the remaining state patterns are not all merged. |
| UI-7, RA-21 | fixed | Not tracker rows. |

Totals: 134 fixed, 24 partly, 12 open (the other session closed PB-014 while this phase was being built).

## Left partly done

| Item | What remains |
|---|---|
| Placeholder shape on Owner and Manager phone pages that are not main tabs | The placeholder's first card sits at 130; the pages' sit between 80 and 272 (Clocker PINs, Insights, Time off requests, the Settings hub, restrictions, Paid time export). They need a phone band ladder for those pages. |
| Older busy buttons | About 190 still only swap their words, so their width can change. The kit's `BButton busy` is the pattern to move them to. |
| The desktop sheet | Still a right-hand panel; only its movement changed. |
| WebKit and Firefox | The sheet stays open for its 150ms exit; menus close with no exit. |
| Two fades that still run under reduced motion | `eb-keep-fade` (a 150ms opacity fade on Employee cards) and `.nevora-success-panel` (an older panel). Both are opacity only. |
| The first-page card entrance | `b-enter` and `eb-keep-enter` keep their approved 4px blur. |
| The redirect "saved" banner on Scheduling rules and Week templates | Not moved to the toaster; that changes how two pages behave. |

## For Codex

1. `publishDraftsAction` redirects with `published=all` when at least one location published. The page now counts
   what its read shows; the action could carry the count, or a one-time receipt in place of the query parameter.
2. The payroll `PUBLISH` receipt cannot tell "queued" from "shared".
3. **Labels and markup that tests or scripts may match on:** the success results replace several banners and toasts
   ("Request sent", "Correction request sent", "Week confirmed", "Payroll approved" as a card title, "<location>
   published"); the U02 screen no longer sends a toast; `schedule-generation-controls.tsx` uses `<div>` where two
   `<p>` wrapped a disclosure (a hydration error since U09); busy buttons carry `aria-busy` and a ring; the Wave C
   Settings loading files are deleted.
4. **Manuals.** `src/test/manual-publication.test.ts` fails until the guides are rebuilt on the integrated commit.
5. Nothing in this phase needs a server change to ship.

## For you to decide

Each report has its full list. The ones that change what people see:

1. **Auto-advance after approving a timecard** (OW-037). Not built.
2. **"Pay statements shared"** shows when the server has only queued the statements. It is locked wording and is
   unchanged; the inline result says "Saved. Check the status below." with no mark.
3. **The mark's colour.** Green in the app ("green is done"), teal on the signed-out finish.
4. **A queued reminder** keeps its grey line and gets no mark. Say if a queue receipt should carry it.
5. **Celebrations with no place to show.** "Time off approved", "Shift change approved", "Your statement is ready"
   and "Inbox clear" are on the allow-list, but no Direction B screen draws them.
6. **Results on wide pages** fill their card. Capping them at 560 is one rule.
7. **Shimmer strength.** It is quiet and easy to miss on desktop. Phase 2 left loading static; say if you prefer that.
8. **Reduced motion means "at once" on overlays.** The Nov 10 and Nov 11 reviews kept a short fade.
9. **The desktop sheet as a centred dialog** is a layout change to about ten components.
10. **Private values.** Phase 7 defines ten values no token covers: six in `b-motion.css` (rise, side, menu, two press
    tints, scrim) and four in `b-shimmer.css` (1600ms pass, 300ms wait, span, 800ms spin). Say which become tokens.
11. **A sheet the app closes after a save now leaves over 150ms** where it used to vanish.
12. **A busy button** is natively disabled, so focus drops to the page while it works. Keeping focus needs
    `aria-disabled`.

## Seen and not fixed

- The payroll review phone page has a white gap in its band.
- Time off date fields overlap when the form is disabled.
- Owner Timecards shifts 19px by itself after it appears.
- The reminder sheet closes before the reply arrives (`reminders.tsx`).
- Rondo's skeleton cards have a spoken label and no visible words.

## Release sequence

Unchanged. Codex integrates and verifies with the backend on development. The exact verified release is promoted to
main only after Jose approves. Nothing here authorizes a main merge, a production activation, copied production data,
a paid activation or a live charge.
