# Phase 7, package A: overlays, press feedback and the reduced-motion audit

Worktree `wt/p7a`. Base `d74bdb30` (the Phase 7 scaffold on top of the pushed `2189fc4e`). Final temporary commit
`4623b8d6`. Patch: `p7patches/a.patch` (32 files, 657 lines added, 50 removed). Evidence: `evidence-overlays-and-press/`.
Nothing was pushed and no branch was made. No server module, route, data contract, user-facing copy, `DESIGN.MD`,
`b-tokens.css` or `b-kit.tsx` was edited. Captures ran on the owned local Postgres with fictional data, never in the main
checkout.

## 1. Findings

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Sheet and dialog enter and exit | **fixed** for the kit sheet (every `QuietSheet`), the settings dialogs (`wc-dialog`), the passkey dialogs and the To do detail sheet: one pattern, tokens only. **partly** on three points: from 768px the kit sheet stays the right-hand panel it was (it now fades and comes 12px from its edge) and was not turned into a centred dialog; in WebKit and Firefox the kit sheet stays open for its 150ms exit, so focus returns 150ms later there (section 3); the centred reminder dialog's rise is written but was not opened in a browser (section 14). | `sheet-shift-frames-390.png`, `sheet-shift-frames-1440.png`, `sheet-tablet-frames-390.png`, `sheet-tablet-frames-1440.png`, `sheet-timecard-frames-390.png`, `sheet-timecard-frames-900.png`, `sheet-timecard-inspector-frames-1440.png`, `dialog-position-frames-390.png`, `dialog-position-frames-1440.png`, `sheet-shift-drag-held-390.png`, `sheet-shift-focus-open-390.png`, `logs/frames-employee.txt`, `logs/frames-owner.txt` |
| 1b | Found on the way: a phone sheet opened from a scrolled page sat against the document, not the window | **fixed** (one rule) | `sheet-scrolled-page-before-after-390.png` |
| 2 | Popover and menu enter and exit | **fixed**: account menu, row and schedule menus, Insights menus, the device settings popover, the command finder. Phone menus are sheets and follow item 1. The exit plays in Chromium; WebKit and Firefox close a menu at once, as before. No tooltip was changed (the rail tooltip already fades 120ms and has a reduce rule). | `menu-account-frames-1440.png`, `menu-schedule-frames-1440.png`, `menu-schedule-sheet-frames-390.png`, `menu-insights-frames-1440.png`, `finder-frames-1440.png` |
| 3 | Toasts and the offline pill | **fixed**. A replaced toast is removed at once and only the new one moves. The redirect banner drawn as a toast (`nevora-banner-toast`) is unchanged: **needs Jose** (section 11, point 9). | `toast-frames-390.png`, `toast-frames-1440.png`, `toast-replaced-390.png`, `offline-pill-shown-390.png`, `offline-pill-shown-1440.png` |
| 4 | Row press feedback | **fixed** for the gaps the press audit found, for Owner, Manager, Employee and Lead, phone and desktop, pointer and keyboard. Left as they were: the wordmark link and one classless button on the desktop schedule (no press), the top-bar bell and avatar (they dim), the phone tab bar (its pill fades). | `press-row-390.png`, `press-row-1440.png`, `press-tab-390.png`, `press-sidebar-1440.png`, `press-qrow-1440.png`, `logs/press-audit.txt` |
| 5 | UI-7 and RA-21: reduced motion | The button scale was **already fixed** at its source (b-foundation.css, Nov 14) and is verified here in the browser. **fixed**: two other press movements that ignored the setting, the 12 sheets with motion and no rule (the brief's 14, less two that only turn motion off), 9 partial misses, and every overlay now opens and closes at once under reduced motion. | `press-button-reduced-390.png`, `sheet-shift-reduced-frames-390.png`, `menu-account-reduced-frames-1440.png`, `logs/inventory.txt` |
| 6 | Guard test | **fixed**: `src/app/app/b-reduced-motion.test.ts` | section 7 |

## 2. What was built, by pattern

All new rules are in `src/app/app/b-motion.css`, inside `@layer nv-b`, with the alias breakpoints only. Every transition
there sits under `prefers-reduced-motion: no-preference`, takes its duration and easing from the tokens, and moves
`transform` and `opacity` only. `overlay` and `display` appear in the exit lists only to keep a closing layer painted
for the 150ms (they are discrete: nothing moves). The guard test checks all of this.

**Sheets and dialogs.**
- Phones: the sheet rises from the bottom edge (`translateY(100%)` to its place) while the scrim fades. Enter
  `--b-dur-enter` (300ms), exit `--b-dur-exit` (150ms), `--b-ease-out`.
- From 768px: a dialog fades and rises 8px. The kit sheet is a 420px or 440px panel on the right edge there (corp.css,
  R8; employee-b-desktop.css), so it fades and comes 12px from that edge. That is the Timecards inspector's exit from
  review F3 (NV-251), now the one rule for every panel, in both directions.
- The open state never sets `transform` in the new sheet, so a dragged sheet keeps its inline offset and its exit
  starts from where the finger let go. Measured on the shift sheet: 180px at release, then 241, 295, 342, 379, 406px,
  with no step back (`logs/frames-employee.txt`, `drag`). The same on the Clocker tablet sheet, the Timecards sheet and
  the phone schedule menu.
- An exit never waits. `src/components/kit/overlay-exit.ts` is the one helper. Where the engine can keep a closed
  dialog painted (`CSS.supports('overlay', 'auto')`: Chromium), the dialog closes at once: focus is on the opener in the
  first frame after Escape, the page is no longer inert, and the closing sheet and its scrim take no pointer events. A
  click made on the page straight after Escape reached the page in every Chromium run (`tapAfterEscape` in the logs).
  The sheet's last content is held for the 150ms it is still seen (`useExitValue`), because several callers drop the
  content in the same render that closes the sheet.
- A sheet the caller closes itself (a save finished, the route changed) now leaves the same way instead of vanishing.
- Reduced motion: no transition and no hold. The sheet is open or closed in the first frame.

**Menus and popovers.** Opacity, 4px and a 0.98 scale, from the top corner nearest the trigger (top right, or top left
for a start-aligned menu; the command finder from its top edge). Enter uses `--b-dur-hover` (150ms), not the 300ms
entrance token: a menu answers a press the way hover feedback answers a pointer, and a menu that takes 300ms feels
late. Exit `--b-dur-exit`. Escape, outside click and focus return are the browser's own and were not touched. A
closing menu takes no pointer events.

**Toasts and the offline pill.** A toast fades and rises 8px (300ms) and leaves the same way (150ms). The pill fades
and rises 4px and now also leaves (it used to be removed in one frame): it keeps its words for 150ms through the same
`useExitValue`, marked `data-leaving`. Under reduced motion both appear and go at once. The fourth toast evicts the
first: measured in the frame it arrives, the two toasts that stay run no animation, the evicted one is gone and only
the new one enters.

**Press.** Two acknowledgements, as b-foundation.css already had them: a tint for rows, tappable cards, tabs and text
links; the 0.96 scale for compact controls. Nothing full-width scales.
- The tint is laid over the control's own background (`background-image`), so a selected row or a white tab thumb
  keeps its colour. Tabs, text links and the controls on the band tint in their own text colour (8%), so the tint is
  white on the band and dark on white with no rule per surface.
- At once: a pressed row used to fade its tint in over 150ms. It is there in the first frame now and still fades out
  on release.
- Reduced motion takes the scale away, and before this pass a pressed button then showed nothing at all. It now tints.
- The keyboard: `:active` covers a pointer, and Space on a button. Enter on a link, a row or a tab got nothing. A
  small listener (`src/components/kit/press-feedback.tsx`, mounted once in the shell) marks the focused control
  `data-b-pressed` for 150ms on Enter and Space, and the same rules style it.
- No hover style was added or changed. The audit forced `:hover` on every control in a touch context (where
  `hover: hover` is false) and found none that applies: no sticky hover, before or after.

## 3. What differs by browser

| | Chromium (Chrome, Edge, Android): measured | WebKit 26.5: measured. Firefox takes the same path: not run |
|---|---|---|
| Kit sheet exit | closes at once and leaves over 150ms; focus back in the first frame; a tap goes to the page | stays open 150ms with `data-closing`, then closes; focus returns after the exit; a tap in those 150ms is not taken |
| Settings, passkey and To do dialogs; finder | CSS exit, 150ms | close at once, as before |
| Menus | CSS exit, 150ms | close at once, as before |
| Phone menu sheets | CSS exit, 150ms, from the dragged position | the existing inert copy finishes the exit (now 150ms, ease-out; none under reduced motion) |
| Enter, drag, reduced motion | as designed | as designed |

The CSS exits that need a closed layer kept painted are behind `@supports (overlay: auto)`, so an engine without it
never shows a closed dialog out of place. Before this pass the kit sheet stayed open for 240ms on every engine. Where
it still waits, it waits 150ms. In WebKit a mouse click does not focus a link or a button, so after a sheet opened by a
click closes, focus is on the page, not the opener: that is the engine's own rule and was so before.

## 4. Components and sheets touched

Components:
- `src/components/kit/overlay-exit.ts` (new): `OVERLAY_EXIT_MS`, `overlayExitMs`, `closeDialogWithExit`,
  `cancelOverlayExit`, `useExitValue`, `useExitHold`. Tests in `overlay-exit.test.tsx`. The hooks keep their state in
  one reducer: `timecards.batch.test.tsx` replaces `useState` and `useRef` with slots counted in call order, so the
  sheet keeps its three `useRef` calls and adds no `useState`. No existing test was changed.
- `src/components/kit/press-feedback.tsx` (new): the keyboard press mark.
- `src/components/quiet/quiet-sheet.tsx`: `QuietSheet` closes through the helper, holds its content for the exit, marks
  itself `data-sheet-dragging` while dragged (it follows the finger 1:1 now; it used to chase it through a 360ms
  transition) and no longer writes an inline transition on release. `RouteSheet` stays mounted for the exit. The
  inspector (Timecards from 1024px) keeps its order from NV-251: it leaves, then the page re-flows.
- `src/components/sheet-gestures.tsx`: the inert copy for engines without `overlay` uses the exit token (150ms,
  ease-out; it was up to 240ms on the drawer curve) and is skipped under reduced motion.
- `src/components/toaster.tsx`: the exit timer reads the helper (150ms, 0 under reduced motion; it was 180ms).
- `src/components/owner-b/b-offline.tsx` and `src/components/app-shell.tsx`: both pills keep their words for the exit.
  `app-shell.tsx` has three small hunks: two imports, the pill, and `<PressFeedback />` after `<SheetGestures />`.
- `b-kit.tsx`: not touched.

Sheets:
- `src/app/app/b-motion.css`: everything in section 2, and the phone sheet's `position` (finding 1b).
- `src/app/app/b-foundation.css`: the inspector's own exit rule and its reduced-motion fade removed. The one sheet exit
  covers it. The press block is unchanged.
- `src/app/app/corp-shell.css`: `c-account-in` retired (the account menu uses the menu pattern); one reduce block.
- `src/components/leave-staffing/leave-staffing.css`: `ls-rise` retired. The failure notice enters like a toast, with
  the entrance token.
- Reduced-motion rules only (section 6): `corp-employee-bridge.css`, `schedule/schedule-corp.css`,
  `reports-corp.css`, `timecards-corp.css`, `schedule-shift-form.css`, `calendar-subscription-panel.css`,
  `employee-home-corp.css`, `owner-home-corp.css`, `shift-requests-signature.module.css`, `team/team-overview.css`,
  `employee-b/employee-b.css` and `employee-b/schedule.css` (these two in place, behind `no-preference`),
  `premium-clean-manager.css`, `payroll/payroll-corp.css`, `corp/corp.css`, `requests/hub/request-hub.css`,
  `schedule/employee-schedule.css`, `premium-wave-c.css`, `availability/availability.css`.

## 5. Inventory, before and after

**Overlay enter and exit in the signed-in app.**

| Surface | Before | After |
|---|---|---|
| Kit sheet, phone | rise 360ms on the drawer curve, exit 240ms on a second curve, scrim 360ms `ease`; focus back after 240ms | rise 300ms, exit 150ms, `ease-out`, scrim with it; focus back at once (Chromium) |
| Kit sheet, from 768px | a 420px slide from the right edge, 360ms in and 240ms out | fade and 12px, 300ms in and 150ms out |
| Timecards inspector | no enter rule of its own; 150ms fade and 12px out; a 150ms fade under reduced motion | the same pattern as every panel; at once under reduced motion |
| Settings dialogs, passkey dialogs, To do sheet, command finder | no enter, no exit | sheet pattern on phones, dialog pattern from 768px; the finder uses the menu pattern from 768px |
| Account menu | keyframes `c-account-in`, 140ms, no exit | menu pattern |
| Row and schedule menus, desktop | 150ms in with a 0.96 scale on a custom curve, 110ms out | menu pattern (0.98, tokens) |
| Insights menus, device settings popover | none | menu pattern |
| Phone menu sheets | rise 320 to 360ms on the drawer curve, 220 to 240ms out, the scrim by animating its colour | sheet pattern, the scrim by opacity |
| Toast | 180ms in and out, 12px in and 8px out, by `translate` | 300ms in, 150ms out, 8px, by `transform` |
| Offline pill | appears and vanishes in one frame | fade and 4px, in and out |
| Failure notice (`ls-failure`) | keyframes `ls-rise`, 180ms | the toast's enter, with the token (no exit: its own action removes it) |

Distinct enter and exit timings on these surfaces: eight before (360/240 rise, 360/240 slide, 150/110, 140 in only,
320/220, 180/180, 180 in only, 150 out only) and several with none. Two after: 300/150 for sheets, dialogs, toasts and
the pill; 150/150 for menus and the finder. The logs show three values only: 300ms ease-out, 150ms ease-out, and 150ms
on the discrete `display` and `overlay` entries.

**Press.** `logs/press-audit.txt` has every count and every control. One control of each kind was probed on each page.

| Role | Controls probed | With no press, before | With no press, after | What remains |
|---|---|---|---|---|
| Employee | 249 | 115 (28 kinds) | 25 | the wordmark link on each page, and one link on desktop More that was fixed after this run (see Lead) |
| Lead | 271 | not run | 26 | the wordmark link on each page |
| Owner | 316 before, 292 after | 156 (50 kinds) | 23, then 9 of 116 on the final commit | the wordmark link; "Show 1 unscheduled", a classless button on the desktop schedule; a 1px screen-reader search button |
| Manager | 252 | not run | 20 | as Owner; its desktop Sign out row was fixed after this run and verified in the Owner's final run |

Press styles before: four (row tint, button scale, a dim to 55% on the top-bar bell and avatar, a pill fade on the
phone tab bar). After: the same four; the last two were left (section 11, point 8).

**Keyframes.** 45 before, 43 after. Retired: `c-account-in`, `ls-rise`. Left, with the reason:
- `sig-sheet-rise`, `sig-fade-in`, `sig-toast-in`, `sig-toast-fade`, `sig-sheen`, `sig-btn-spin`: the Signature kit,
  a retired look. Only `ui-preview/signature` loads it.
- `tof-sheet-in`, `tof-sheet-in-fade`: dead code. They style `.tof-frame--sheet`, and no caller passes `sheet` to
  `PlanningFrame`.
- `ap-rise`, `q-auth-greeting-in`, `q-auth-greeting-hold`, `actSpin`: sign-in and activation, outside the signed-in
  app.
- `b-enter`, `b-fade`, `eb-keep-enter`, `eb-keep-fade`: the cards' entrance on the first page of a session (NV-326).
  Live in Direction B, approved, and not an overlay. They use a 4px blur and `translate`, which Phase 7 does not allow
  for new motion (section 11, point 7).
- `nevora-banner-toast`, `nevora-banner-fade`: the redirect banner on Scheduling rules and Week templates. Live. Left
  (section 11, point 9).
- `c-row-in`, `c-arrive`, `c-rail-reveal`, `c-progress-in`, `c-progress-run`, `cm-track-fade`,
  `portal-scroll-edge`: not overlays (a new row, a page arriving, the sidebar opening, the page progress bar, an edge
  fade tied to scroll position). Not changed.
- Other owners, not touched: `c-skel-in`, `c-skel-shimmer`, `nevora-shimmer`, `premium-pulse`, `b-spin`, `wc-spin`,
  `eb-spin`, `em-notif-spin`, `em-notif-pulse` (package C); `nevora-celebrate` (package B); `ck*` (the Clocker).

**Sheets with motion and no reduced-motion rule.** 12 before, 0 after (`logs/inventory.txt`). The brief listed 14. Two
of them, `employee-b-desktop.css` and `login/auth-support.css`, only declare `animation: none` or `transition: none`,
so they never moved anything. The guard test reads such a declaration as no motion.

## 6. Reduced motion, in detail

- **The button scale (UI-7).** The source was already right: b-foundation.css applies `scale` only under
  `no-preference` and cancels the older kits' `transform` press. Measured under reduced motion on `.b-btn`, Employee
  and Owner, phone and desktop: `scale: none` at rest, pressed and from the keyboard. Two press movements outside that
  block still ignored the setting and are fixed: the brand colour swatch (`.wc-swatch`, a 0.96 scale) and the old
  availability button (1px of travel).
- **The 12 sheets.** Each got the smaller change: a reduce block that turns its colour or opacity fade off, or, in
  the two Direction B sheets, the transition moved behind `no-preference` in place.
- **Partial rules.** A script read every transition and animation in every sheet and looked for one that no reduce
  rule in the same sheet names. Movement that was missed, now fixed (5): the To do group caret
  (premium-clean-manager.css), two payroll chevrons and the pay caret (payroll-corp.css) and the sliding tab line
  (`[data-c-slide="x"]::after`, corp.css). Colour fades that were missed, now fixed (4): two in corp-shell.css, one
  each in request-hub.css and employee-schedule.css. The script matches rules by name, so what it
  still lists is in `logs/inventory.txt`: the button transition in b-foundation.css (its `scale` only ever changes
  under `no-preference`), three rules portal-device-setup.css covers with a wider selector, the Signature kit's
  attribute selectors, and `cm-track-fade`, which follows scroll position and not time.
- **Overlays.** The older reduce rules kept a 120 to 160ms fade ("fades stay, movement goes"). Phase 7 says the end
  state appears at once, so the last block of b-motion.css turns every transition and animation off on every overlay
  this package owns, and the components skip their hold. In every `-reduce` section of the logs `getAnimations` is
  empty and the first frame is the end state: sheets, dialogs, menus, the finder, the toast and the pill.

## 7. The guard test

`src/app/app/b-reduced-motion.test.ts`, modelled on `b-viewport.test.ts`:
- Every stylesheet under `src` that declares a transition, an animation or keyframes must contain a
  `prefers-reduced-motion` query. A declaration that turns motion off (`none`, `0s`) is not motion. The allow-list is
  empty today. An entry needs a written reason, and the test fails when an entry is stale.
- `b-motion.css`: every moving rule is under `no-preference`, uses no literal duration and names only `opacity`,
  `transform`, `overlay` and `display`; the reduce block covers the overlays; `OVERLAY_EXIT_MS` equals `--b-dur-exit`.
- Checked that it fails: with the reduce block removed from `team/team-overview.css` the test for that sheet fails and
  names the declaration ("declares transition: opacity 150ms ease-out and has no prefers-reduced-motion rule"). The
  file was restored.
- Its limit: it is a rule per file. It does not prove that a file's reduce rule reaches every transition in it.

## 8. Evidence for motion, as PHASE7.md asks

For each pattern, at 390 and 1440 (900 too for the Timecards sheet, which is modal there):
1. **Timed frames.** `*-frames-*.png`: one row for the enter and one for the exit, at 0, 80, 160, 300 and 600ms. These
   are the page's own transitions, paused and set to each time (`Animation.currentTime`), then photographed, because a
   screenshot takes longer than a frame. For the exit rows of the kit sheet and the toast, the app's 150ms cleanup
   timer was held back in the page while the pictures were taken (runs `f8`, final commit): it would otherwise remove
   the closing layer between two screenshots. So those rows show the curve, not the order of events; the real-time log
   shows the order (for the inspector: it leaves, then the table behind it widens).
2. **Real-time log.** `logs/frames-employee.txt` and `logs/frames-owner.txt`, with the page untouched: for every
   animation frame after the input, the element's transform, opacity, scrim opacity, display, open state,
   pointer-events and the focused element, and the list from `getAnimations` (property, duration, easing). This is the
   proof of the durations and of the order.
3. **Reduced motion.** The same steps with `reducedMotion: 'reduce'`: the sections named `-reduce`, and two strips.
4. **Focus.** `enterFocusFirst` and `exitFocusFirst` are read in the first frame after the input, without waiting.
   Open: the sheet (or the field the form asks for: the tablet name; the finder's input). Close: the opener.
5. **Overflow and layout.** `overflowBefore`, `rest.overflow` and `after.overflow` are 0 in every section. `after`
   also shows no open dialog, no `data-closing` left and the page lock released. The overlays are in the top layer or
   fixed, so nothing in the page moves when they do.
6. **WebKit.** The sections marked `[webkit]`: the shift sheet, the availability sheet, the Clocker tablet sheet, the
   schedule menu on a phone and on desktop, the account menu, a settings dialog and the finder, with and without
   reduced motion, and the drag.
7. **Press.** `press-*.png`: at rest, pressed with a pointer, and with Enter held; `logs/press-audit.txt`.

Which run made what, and on which commit, is written at the head of each log. The overlay pictures are from the final
commit `4623b8d6` or from `8d954ad2`. The two differ in one press selector, the weight of the press selectors, a guard
for a sheet reopened during its exit, and the order of one attribute in the drag code; the sheet steps were run again
on the final commit.

## 9. Checks run

| Check | Result |
|---|---|
| `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` on `4623b8d6` | `src`: 0 errors. 6 errors, all in `zz-scan/states.ts` (the capture tool, a file I did not edit) |
| `npx eslint` on the 9 changed TypeScript files | clean |
| `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000` on `4623b8d6` | 912 files passed, 24 skipped; 13,955 tests passed, 741 skipped; no failure |
| `git apply --check -R p7patches/a.patch` in the worktree | passes |
| Browser captures (`cap.sh`; Owner, Manager, Employee, Lead; 390, 900, 1440; Chromium and WebKit 26.5) | sections 5 and 8. No `pageerror` in any run. The signed-in page's console logged "Failed to load resource" (404 once, 503 a few times) in the Owner and Manager runs, while several captures shared the machine; in the first Owner run five steps timed out loading a page for the same reason and were run again |
| Not run | `src/test/manual-publication.test.ts` (outside the set; fails by design after a source change); Firefox; a real phone |

New tests: `b-reduced-motion.test.ts` (98 cases, one per moving sheet plus the b-motion.css rules) and
`overlay-exit.test.tsx` (6). The exit helper is tested with a stand-in dialog and fake timers. The hooks are tested in
a server render only (the repo has no DOM test environment); their change over time is covered by the browser runs.
There is no user-facing string in this package, so there is nothing to translate.

## 10. For Codex

Nothing. No server behaviour, read or contract is involved.

## 11. For Jose to decide

1. **The desktop sheet is still a right-hand panel.** The brief describes a centred dialog from 768px. The kit sheet has
   been a 420px panel on the right edge there since Release 1 (R8), and the Employee shift panel and the Timecards
   inspector build on it. I changed how it moves (a fade and 12px in place of a 420px slide) and not where it sits.
   Making it a centred dialog is a layout change to every sheet built on it (about ten components). Say if you want it.
2. **Six values with no token.** `b-motion.css` defines them for itself: `--b-m-rise` (8px), `--b-m-side` (12px),
   `--b-m-menu` (4px and a 0.98 scale), `--b-m-press` (the row tint, `rgb(16 24 32 / 0.04)`, the value owner-b.css
   already wrote as a literal), `--b-m-press-own` (8% of the control's own text colour) and `--b-m-scrim`
   (`rgb(10 24 23 / 0.32)`, the scrim b-reminders.css and employee-b-desktop.css already write as a literal). If you
   want them as tokens they belong in `b-tokens.css`.
3. **Menu enter is 150ms (`--b-dur-hover`), not the 300ms entrance.** Confirm.
4. **WebKit and Firefox.** There the kit sheet stays open for its 150ms exit (it was 240ms), so focus returns 150ms
   later and a tap in that time is not taken; menus and the smaller dialogs close with no exit. A second route exists
   (an inert copy finishes the exit while the real sheet is already closed, as the phone menus do), but a copy of a
   form does not carry what was typed, so I did not use it for sheets. Accept, or ask for it.
5. **Reduced motion is now "at once" on overlays.** The Nov 10 and Nov 11 reviews kept a 120 to 160ms fade under
   reduced motion (NV-329) and a fade for the inspector (NV-251). Phase 7's rule replaces them. Confirm.
6. **A sheet the app closes itself now leaves over 150ms** with its last content, where it used to vanish with the
   result. It takes no input while it goes, but it is a visible change after a save.
7. **The first-page card entrance uses a 4px blur.** `b-enter` and `eb-keep-enter` (NV-326, approved) blur and move the
   cards on the first page of a session. Phase 7 allows only transform and opacity for new motion. I left them. Drop
   the blur, or keep it as the one exception.
8. **Three older press styles remain in the shell.** The bell and the avatar dim to 55%, the phone tab bar fades a
   pill, and the wordmark link shows nothing. They are chrome, not rows, and each is consistent with itself. Say if you
   want them on the tint as well.
9. **The redirect banner.** Scheduling rules and Week templates show their "saved" line as a fixed banner that runs a
   5.2 second keyframe (`nevora-banner-toast`) and stays in the page. It is the one toast-like surface this pass did
   not move to the pattern: doing it properly means sending those messages through the toaster, which changes how two
   pages behave. Say if you want it.
10. **A blanket rule.** Every sheet now has a reduce rule and the test keeps it so. One rule in the last sheet ("no
    transition under reduced motion, anywhere in the signed-in app") would also cover what a rule by name can miss. I
    did not add it, because it would switch off fades other owners chose to keep. Your call.
11. **The phone sheet position** (finding 1b) changes where a sheet sits when the page behind it is scrolled. It is a
    bug fix. It is worth one look on a real phone.
12. **Forced colours (Windows High Contrast).** The press tint is a background, and that mode replaces backgrounds, so
    a press shows no tint there. Focus rings are unchanged. Not built, not tested.

## 12. Needed from another package

Nothing blocks package A. Notes for the others:
- **B:** `.nevora-success-panel` (portal-motion.css) keeps a 240ms opacity fade under reduced motion; only its
  `translate` is removed there. The celebration burst is hidden under reduced motion, which is right. If the done
  state gains a mark that leaves, the shared exit time is `OVERLAY_EXIT_MS` in `kit/overlay-exit.ts`.
- **C:** the guard test counts `@keyframes` and any `animation` whose value is not `none`. Each of your sheets has a
  query today, so nothing fails; `b-shimmer.css` needs one once it moves anything. `c-skel-in`, `c-skel-shimmer`,
  `wc-spin`, `em-notif-spin`, `actSpin` and `c-progress-run` are declared outside a motion query and switched off in a
  separate reduce block: I did not check that each block reaches every use.
- **Both:** `b-kit.tsx` was not touched by A. `app-shell.tsx` has three small hunks from A (section 4). The rules in
  `b-motion.css` that name `.b-btn` add the keyboard mark and the reduced-motion tint; they do not change the press
  block in b-foundation.css.

## 13. Suggested DESIGN.MD lines (not edited)

Under "Inspection fixes", after the Phase 6 bullet:

- **Motion (Phase 7, built Nov 17, 2026).** Rules in `src/app/app/b-motion.css`; the timing a component needs in
  `src/components/kit/overlay-exit.ts`. Transform and opacity only, tokens only, all behind
  `prefers-reduced-motion: no-preference`.
  - *Sheets and dialogs.* On phones a sheet rises from the bottom edge while its scrim fades. From 768px a dialog fades
    and rises 8px; a panel on the right edge fades and comes 12px from that edge. Enter 300ms, exit 150ms.
  - *Menus and popovers.* Opacity, 4px and a 0.98 scale from the corner nearest the trigger. Enter 150ms, exit 150ms.
  - *Toasts and the offline pill.* Opacity and 8px (toast) or 4px (pill). Enter 300ms, exit 150ms. A replaced toast
    leaves at once.
  - *An exit never waits.* A closing sheet is already closed: focus is back on its opener and the page takes a tap
    while the sheet leaves (Chromium). Elsewhere the sheet stays open for the 150ms.
  - *A dragged sheet* follows the finger 1:1 and leaves from where it was let go.
  - *Press.* Rows, tappable cards, tabs and text links tint at once (4% ink on white; the control's own text colour at
    8% on the band and on tabs). Compact controls scale to 0.96. Nothing full-width scales. Enter and Space show the
    same for 150ms. Under reduced motion a button tints in place of the scale.
  - *Reduced motion.* Every overlay opens and closes at once, with no fade. Every stylesheet that moves anything has a
    reduced-motion rule; `src/app/app/b-reduced-motion.test.ts` fails when one does not.
  - *A phone sheet is fixed to the window*, whatever the scroll position of the page behind it.
  - Supersedes the 360ms and 240ms sheet timings and the 420px desktop slide (R8), the fades kept under reduced motion
    (NV-251, NV-329), `c-account-in` and `ls-rise`.

## 14. Not verified

- **A real phone or tablet.** Everything was measured in headless Chromium with touch emulation and in Playwright's
  WebKit 26.5. Firefox was not run. Safari on iOS itself was not run.
- **The centred reminder dialog** (`.b-rem-sheet`). Its 8px rise needs a rule that matches b-reminders.css's heavier
  selector; the rule is written, but the fixture has no availability deadline, so no reminder button was on the page
  to open it.
- **Surfaces that share a rule or the component but were not opened one by one:** the To do detail sheet
  (`cm-sheet`), the passkey dialogs (`pk-dialog`), the break type and brand colour dialogs (`wc-dialog`; Add position
  was opened), the device settings popover, the phone More sheets (`#manager-more-navigation`,
  `.employee-more-navigation`), the time off request sheet, the profile choice sheets, the time entry sheet and the
  exchange route sheet (`RouteSheet`). If one of the first three drops its content when it closes, it will leave empty
  for 150ms in Chromium; I did not see that on Add position.
- **A sheet closed by the app after a save.** The path is built and unit-tested in parts; in the browser the exits
  were triggered with Escape, a drag and the toast's close button.
- **The finder on a phone** and **the offline pill at the foot of a page without a band**: the rules cover both; the
  captures were the finder at 1440 and the pill in the band.
- **Manager and Lead** ran the press audit only, not the frame steps (they use the Owner's and the Employee's
  components).
- **Sticky hover** was checked by forcing `:hover` in a touch context, not with a finger.
- **The keyboard press** was measured in the frame Enter went down, with the probe cancelling the click so the page
  stayed. Navigation with the mark on was not timed.
- **320px and 200% text.** Not captured again: nothing here changes layout except the phone sheet's `position`.
- **The width band 761 to 767px.** portal-motion.css makes a menu a sheet up to 760px and the Direction B alias for a
  phone is 767px, so in those 7 pixels a menu that is not a sheet gets the sheet's rise. No device is that wide.
- **The exit strips of the kit sheet and the toast** were photographed with the cleanup timer held back (section 8).


---
Filing note (Nov 17, 2026): paths that start `p7a-work/`, `p7b-work/`, `p7c-work/` or `p7patches/` name the builder's working files, which were not kept. The pictures kept are in the evidence folder beside this report; where a builder captured more frames than are filed, the file named may not be there.
