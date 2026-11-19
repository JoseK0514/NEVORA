# Phase 7, package C: loading (shimmer, hand-over, one spinner)

Worktree `wt/p7c`. Base `d74bdb30`. Patch `p7patches/c.patch`. Evidence `evidence-loading/`. Working captures and logs: `p7c-work/` under the scratch root.
English only is touched: no new user-facing sentence was written (see "Copy").

## Findings

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Inventory of every loading presentation | fixed (table below) | this file |
| 2 | One shimmer | fixed | `owner-schedule-placeholder-*`, `owner-schedule-shimmer-*`, `employee-home-shimmer-*`, `*-reduced-motion-*`, `trace-*.json`, `p7c-log-*.json` |
| 3 | The hand-over from placeholder to page | partly. Measured on 36 route and width pairs. Fixed: Owner phone Schedule and Timecards bands, Employee phone More, Home's title bar (both shells), the Settings hub and ten Settings pages (they drew a retired placeholder with no band on a phone), the page rise at the swap. Remains: Owner and Manager phone pages that are not main tabs (no phone ladder), Employee Home's phone band (it depends on the day's state), three desktop first-card widths, Time off's 9px. See "Hand-over" | `owner-schedule-handover-*`, `employee-more-*`, `owner-settings-*`, `things-to-do-loading-card-band-390.png`, table below |
| 4 | One spinner | partly. One keyframe and one drawing everywhere (the Clocker keeps its own). The kit button has a busy state that keeps its width. About 190 older busy labels still swap words with no spinner and may change width (list below) | `things-to-do-request-row-busy-*`, `owner-notifications-loading-card-*`, `sign-in-busy-*` |
| 5 | Long waits say what they do in words | already fixed, one gap reported (Rondo's first-load skeleton cards have a spoken label and no visible words) | source read; `owner-notifications-loading-card-*` |
| 6 | Signed-out pages | fixed for the spinner (same ring, same keyframe, still when motion is reduced). They have no placeholder. `q-auth-greeting-*` already respects reduced motion and is untouched | `sign-in-busy-*` |
| 7 | Tests | fixed. 82 tests in `b-loading-motion.test.tsx`; five older tests updated | "Checks run" |

## 1. Inventory: every place a signed-in or signed-out page shows loading

"Moves" is with motion allowed. "RM" is what reduced motion does. After this package, unless a row says otherwise.

| Where | What shows | Moves? | Keyframes | RM |
|---|---|---|---|---|
| Route placeholders: 50 of the 52 `loading.tsx` files go through `RouteSkeleton`, `CorpSkeleton`, `BRouteLoading` and the table in `b-loading.tsx` (44 Owner and Manager entries, 19 Employee and Lead entries, a fallback each). `app/loading.tsx` uses `RootLoading`, which is the same component with the destination's shape | The page's band, title, strip and card blocks (`BLoadingScreen`) | Before: static, except that the title and cards rise 12px on arrival (`b-enter`, a page-enter rule that also reaches the placeholder). After: the same, plus one light band crossing every block after 300ms | `b-shimmer` (new), `b-enter` (package A's) | Static, no band drawn |
| The same placeholder after 2.5s on a client navigation ("This is taking longer than usual", or "You're offline") | Band and title stay, one state card with the 20px ring, words and one Try again | Ring turns | `b-spin` | Ring still. Words and `role="alert"` carry it |
| Access check on Owner and Manager pages (`ScopedReadFrame`, "checking") | The same `BRouteLoading` placeholder | As the first row | `b-shimmer` | Static |
| Access check stuck, paused or offline | `BStateScreen` with a state card | No | none | Same |
| Settings hub and ten pages under it, Account recovery (11 `loading.tsx`) | Before: the Wave C placeholder (`SettingsLoading`): on a phone no band, a dark title on the canvas and square blocks; on desktop its band ended at 242 against the page's 196; blocks pulsed (`premium-pulse`). After: the kit placeholder from the table | Before: opacity pulse. After: the one shimmer | Before `premium-pulse`. After `b-shimmer` | Static |
| Shift change sheet on a phone (`@sheet/(.)exchange/loading.tsx`, `CreationSheetSkeleton`) | Sheet-shaped static blocks, `aria-busy`, label "Loading" | No | none | Same. Left alone (a sheet is package A's surface) |
| A card or list that loads after its page: `BState kind="loading"` (Things to do, Employee Time, Notifications, Updates, Requests, Clocker recovery, Clocker requests, roster import, payroll import "sending", export "planning", Rondo approval checks) | 48px grey circle with the 20px ring, a title or a line, `role="status"`, `aria-busy` | Ring turns | `b-spin` | Ring still; the words are always present |
| The same, older form: `p.b-state[role="status"]` (31 uses: "Checking your current requests…", "Checking who's clocked in…") | One grey sentence | No | none | Same |
| Rondo cards while a read is out (`be-skel`, `kn-skel`, `wk-skel`: knowledge, weekly plan, business) | Placeholder-grey bars and dots in a card, `aria-busy`, a spoken label | Before: static. After: the one shimmer | `b-shimmer` | Static |
| Busy buttons, kit (`BButton busy`, the state card's retry) | Label and busy words share one cell; 16px ring beside the busy words; `aria-busy`; disabled | Ring turns | `b-spin` | Ring still, busy words shown |
| Busy buttons, Signature pattern (`SigPendingLabel`: sign-in, recovery, passkeys, 14 Employee submit buttons, weekly confirmation) | Same idea: shared cell, 16px ring, `aria-busy`, `aria-disabled`, focus kept | Before: a Phosphor arc icon turned, also defined to stop under RM. After: the one ring | Before `sig-btn-spin`. After `b-spin` | Ring still |
| Busy buttons, words only (about 190 labels: "Saving…", "Approving…", `PendingButton`, `CorpButton`, raw `b-btn`, `q-btn`, `nv-btn`) | The label changes to the busy words; most set `disabled`, 42 set `aria-busy` | No | none | Same. Width can change with the words (not converted, see item 4) |
| A notification row that is opening (Employee, `messages-b.tsx`) | 16px ring where the unread dot sits, row `aria-busy` | Ring turns | Before `eb-spin`. After `b-spin` | Still |
| The older Employee notification list (`employee-mobile/notifications-list.tsx`, corporate look, not drawn under Direction B) | 16px arc icon | Turns | Before `em-notif-spin`, and under RM it pulsed (`em-notif-pulse`). After `b-spin`, only with motion allowed | Still (fixed) |
| Locations search button (Settings) | Before: 20px gap-spinner icon. After: the 16px ring; a status line says "Searching locations…" | Turns | Before `wc-spin`. After `b-spin` | Still |
| Sign-in, activation, recovery, reset buttons | `SigPendingLabel` or `SigSpinner`: ring and busy words, `aria-busy`, a `role="status"` line beside the button | Ring turns | `b-spin` | Still |
| Sign-in greeting | `q-auth-greeting-hold` (a 0s visibility step) and `q-auth-greeting-in` (opacity, hover duration, only with motion allowed) | Fade | unchanged | No fade. Left as it is |
| Activation page | `.act-spin` and `actSpin` existed in CSS with no markup using them | n/a | removed (dead) | n/a |
| Policy pages, 404, public error | No loading state | n/a | none | n/a |
| Clocker | `ckSpin`, the glow, the receipt | not mine | `ckSpin` | not mine |

A spinner alone on a blank page: none found. Every ring sits in a state card or a button with words.
One thing found on the way: a loading state card whose retry was also busy drew two rings (Employee Updates, "Checking your current updates…" with a busy "Checking…" button). A loading card now shows its own ring only.

## 2. The shimmer

- One keyframe, `b-shimmer`, in `src/app/app/b-shimmer.css`. It moves a pseudo-element (`::after`) by `transform: translateX` only. Each block clips its own band (`overflow: hidden` and its radius).
- Applied by the shared placeholder: the sheet keys on `.b-screen[data-b-load] .b-skel`, which is what `BLoadingScreen` draws. No page, no `loading.tsx` and no table entry names it (a test walks the source and fails if one does). Rondo's in-page skeleton bars take it from the same rule by class.
- Duration 1600ms per pass, linear, endless. It waits 300ms before the first pass; until then the band is outside its block, so a page that arrives sooner never shows it.
- One clock: every band has the same width (30% of the travel, at most 160px), the same travel (the window on a phone, 1080px from 768px) and the same start. Measured: 22 running animations, spread of `currentTime` between them 0ms (`phaseSpread: 0`). Row lines start 48px right of the card edge, so their band starts 48px earlier.
- Contrast: white at 72% at the band's centre over the `#ECEEEF` blocks; on the teal band the light is `--b-glass-edge` over the glass blocks. Looked at by eye at 390 and 1440 for Owner Schedule and Employee Home: soft on the cards, a faint lift on the band, nothing reads as a white bar.
- Cost, measured with Chrome tracing for 2 seconds (120 frames) while the bands run, Owner Schedule placeholder: 0 frames with a Paint event and 0 with a Layout event at 390 and at 1440. The layer tree lists 21 (390) and 22 (1440) layers with the reason `ActiveTransformAnimation`: the compositor moves them. (`trace-owner-390.json`, `trace-owner-1440.json`.)
- Reduced motion: `getAnimations` on the placeholder is empty at first paint and at 900ms, and the `::after` content is `none`. The placeholder is the static one Phase 2 built.
- `getAnimations` log (Owner, 1440): `b-shimmer`, pseudo `::after`, properties `transform`, duration 1600, delay 300, linear, infinite, count 22. One more animation is in the list, `b-enter` (filter, translate, opacity, 300ms): the existing page-enter rule on the placeholder's cards. It is package A's pattern and it blurs; see "Needed from another package".

## 3. The hand-over

How the placeholder was held: the local server streams `loading.tsx` with the page, and it runs `next dev`, where a held navigation request shows nothing. So the capture tool puts a small pass-through server in front of the owned app and stops forwarding the document after the chunk that carries the placeholder. The browser then holds the real shell and the real route placeholder. Where the server sent the page in one piece ("not seen" below) the placeholder is unit tested only. For Owner and Manager pages the access check's placeholder (the same component) was held by holding its request. The loaded page was measured on a direct load.

What was wrong and is fixed (placeholder box against page box):

| Page | Before | After |
|---|---|---|
| Owner and Manager Schedule, 390 | band 469, first card 429; page 503 and 463 (34px jump) | 503 and 463 |
| Owner and Manager Timecards, 390 | band 339, card 299; page 358 and 318 (19px) | 358 and 318 |
| Employee and Lead More, 390 | band 222, card 182; page 310 and 270 (88px): a 44px strip stood where the profile tile is | 310 and 270; cards have heads and lead circles like the page |
| Home, both shells, 390 and 1440 | the title bar stood on the greeting's line: 17px (phone) and 18px (desktop) above the title | title bar top equals the title's top (94, 86 and 109) |
| Settings hub and ten pages under it, Account recovery | the retired Wave C placeholder: no band on a phone; on desktop title at 148 and band 242 against 88 and 196 | the kit placeholder from the table: desktop band 196 and first card at 220, the page's numbers |
| Paid time export, 1440 | band 196, card 220; page 224 and 248 (28px): the page has a line under its title | the table entry takes the 224 band (changed after the last measuring run; unit tested, see "Not verified") |
| The swap itself | the arriving page rose 12px with a blur (`b-enter`), and the older rule faded the whole page from nothing, band included; when the access check followed a tab tap the second placeholder faded in too (the band blinked) | no rise and no whole-page fade at the swap. Only what is inside each white card fades in over `--b-dur-hover`, opacity only. Kit screens take it; the Owner and Manager desktop pages that are not kit screens swap at once |
| Things to do and Employee Updates, 390, while their own list loads (the state card after the placeholder) | band 170 and 162; loaded 251 and 232 (81px and 70px jump when the list arrives) | the band keeps 251 and 232 while loading (rule added; see "Not verified" for what the last run confirmed) |

Measurements, final source (runs `p7c-work/f1-owner`, `f1-employee`). Each cell is placeholder / page (difference). Title is its top edge; band is where it ends (on a phone: the hero's height); card is the first card's left, top and width. "n/a" means the page is not a kit screen at that width, so only the generic probe's card reading exists. "The page in its own loading card" means the route placeholder was gone before the reading and the row compares the page's in-page loading state with the loaded page.

| Role | Page | Width | What was held | Title | Band | First card |
|---|---|---|---|---|---|---|
| owner | home | 390 | route placeholder (stream held) | 94 / 94 (0) | 318 / 318 (0) | [14, 278, 362] / n/a (top , width ) |
| owner | schedule | 390 | route placeholder (stream held) | 74 / 74 (0) | 503 / 503 (0) | [14, 463, 362] / [14, 463, 362] (top 0, width 0) |
| owner | timecards | 390 | route placeholder (stream held) | 74 / 74 (0) | 358 / 358 (0) | [14, 318, 362] / [14, 318, 362] (top 0, width 0) |
| owner | payroll | 390 | not seen (the server sent the page in one piece) | | | |
| owner | employees | 390 | route placeholder (stream held) | 77 / 74 (-3) | 253 / 253 (0) | [14, 213, 362] / [14, 213, 362] (top 0, width 0) |
| owner | inbox | 390 | the page in its own loading card | 74 / 74 (0) | 170 / 251 (+81) | [14, 130, 362] / [14, 211, 362] (top +81, width 0) |
| owner | settings | 390 | route placeholder (stream held) | 74 / 62 (-12) | 170 / n/a | [14, 130, 362] / [16, 156, 358] (top +26, width -4) |
| owner | settings-locations | 390 | route placeholder (stream held), not a kit screen | n/a / n/a | n/a / n/a | n/a / [16, 130, 358] (top , width ) |
| owner | settings-positions | 390 | not seen (the server sent the page in one piece) | | | |
| owner | settings-workspace | 390 | not seen (the server sent the page in one piece) | | | |
| owner | account-recovery | 390 | route placeholder (stream held) | 77 / n/a | 170 / n/a | [14, 130, 362] / [16, 130, 358] (top 0, width -4) |
| owner | reports | 390 | route placeholder (stream held) | 74 / 62 (-12) | 170 / n/a | [14, 130, 362] / [16, 231, 358] (top +101, width -4) |
| owner | notifications | 390 | not a kit screen | n/a / n/a | n/a / n/a | n/a / [16, 208, 358] (top , width ) |
| owner | requests | 390 | route placeholder (stream held) | 77 / 62 (-15) | 170 / n/a | [14, 130, 362] / [16, 192, 358] (top +62, width -4) |
| owner | payroll-import | 390 | not seen (the server sent the page in one piece) | | | |
| owner | payroll-export-paid-time | 390 | route placeholder (stream held) | 74 / 17 (-57) | 170 / n/a | [14, 130, 362] / [16, 80, 358] (top -50, width -4) |
| owner | employees-QA-SCAN-A-restrictions | 390 | route placeholder (stream held) | 74 / 62 (-12) | 206 / n/a | [14, 166, 362] / [16, 142, 358] (top -24, width -4) |
| owner | employees-QA-SCAN-A-clocker-pin | 390 | route placeholder (stream held) | 74 / n/a | 170 / n/a | [14, 130, 362] / [16, 130, 358] (top 0, width -4) |
| owner | settings-clocker | 390 | not seen (the server sent the page in one piece) | | | |
| owner | settings-clocker-pins | 390 | route placeholder (stream held) | 74 / n/a | 170 / n/a | [14, 130, 362] / [16, 272, 358] (top +142, width -4) |
| owner | settings-clocker-photos | 390 | route placeholder (stream held) | 74 / n/a | 170 / n/a | [14, 130, 362] / [16, 130, 358] (top 0, width -4) |
| owner | clocker-recovery | 390 | route placeholder (stream held) | 74 / n/a | 170 / n/a | [14, 130, 362] / [16, 130, 358] (top 0, width -4) |
| owner | home | 1440 | route placeholder (stream held) | 109 / 109 (0) | 383 / 383 (0) | [296, 331, 707] / [296, 331, 707] (top 0, width 0) |
| owner | schedule | 1440 | route placeholder (stream held) | 88 / 88 (0) | 296 / 296 (0) | [296, 244, 1080] / [296, 244, 1080] (top 0, width 0) |
| owner | timecards | 1440 | route placeholder (stream held) | 88 / 88 (0) | 296 / 296 (0) | [296, 244, 1080] / [296, 244, 1080] (top 0, width 0) |
| owner | payroll | 1440 | not seen (the server sent the page in one piece) | | | |
| owner | employees | 1440 | route placeholder (stream held) | 91 / n/a | 296 / 296 (0) | [296, 244, 707] / [296, 244, 707] (top 0, width 0) |
| owner | inbox | 1440 | not seen (the server sent the page in one piece) | | | |
| owner | settings | 1440 | route placeholder (stream held) | 88 / n/a | 196 / 196 (0) | [296, 220, 530] / [296, 220, 530] (top 0, width 0) |
| owner | settings-locations | 1440 | not seen (the server sent the page in one piece) | | | |
| owner | settings-positions | 1440 | not seen (the server sent the page in one piece) | | | |
| owner | settings-workspace | 1440 | not seen (the server sent the page in one piece) | | | |
| owner | account-recovery | 1440 | route placeholder (stream held) | 133 / 130 (-3) | 224 / 224 (0) | [296, 248, 812] / [296, 248, 812] (top 0, width 0) |
| owner | reports | 1440 | route placeholder (stream held) | 88 / n/a | 196 / 196 (0) | [296, 220, 1080] / [296, 220, 1080] (top 0, width 0) |
| owner | notifications | 1440 | not seen (the server sent the page in one piece) | | | |
| owner | requests | 1440 | route placeholder (stream held) | 133 / 130 (-3) | 296 / 296 (0) | [296, 320, 812] / [296, 320, 812] (top 0, width 0) |
| owner | payroll-import | 1440 | not seen (the server sent the page in one piece) | | | |
| owner | payroll-export-paid-time | 1440 | route placeholder (stream held) | 130 / 130 (0) | 196 / 224 (+28) | [296, 220, 812] / [296, 248, 812] (top +28, width 0) |
| owner | employees-QA-SCAN-A-restrictions | 1440 | route placeholder (stream held) | 130 / n/a | 224 / 224 (0) | [296, 248, 812] / [296, 248, 812] (top 0, width 0) |
| owner | employees-QA-SCAN-A-clocker-pin | 1440 | route placeholder (stream held) | 130 / 130 (0) | 224 / 224 (0) | [296, 248, 812] / [296, 248, 812] (top 0, width 0) |
| owner | settings-clocker | 1440 | not seen (the server sent the page in one piece) | | | |
| owner | settings-clocker-pins | 1440 | route placeholder (stream held) | 130 / 130 (0) | 296 / 298 (+2) | [296, 320, 812] / [296, 324, 812] (top +4, width 0) |
| owner | settings-clocker-photos | 1440 | route placeholder (stream held) | 130 / 130 (0) | 224 / 224 (0) | [296, 248, 812] / [296, 248, 812] (top 0, width 0) |
| owner | clocker-recovery | 1440 | route placeholder (stream held) | 130 / 130 (0) | 224 / 224 (0) | [296, 248, 812] / [296, 248, 812] (top 0, width 0) |
| employee | home | 390 | route placeholder (stream held) | 86 / 86 (0) | 321 / 297 (-24) | [14, 281, 362] / [14, 257, 362] (top -24, width 0) |
| employee | schedule | 390 | route placeholder (stream held) | 66 / 66 (0) | 321 / 321 (0) | [14, 281, 362] / [14, 281, 362] (top 0, width 0) |
| employee | my-time | 390 | route placeholder (stream held) | 66 / 66 (0) | 274 / 274 (0) | [14, 234, 362] / [14, 234, 362] (top 0, width 0) |
| employee | my-pay | 390 | not seen (the server sent the page in one piece) | | | |
| employee | requests-hub | 390 | not seen (the server sent the page in one piece) | | | |
| employee | requests | 390 | the page in its own loading card | 70 / 70 (0) | 226 / 226 (0) | [14, 195, 362] / [14, 186, 362] (top -9, width 0) |
| employee | exchange | 390 | route placeholder (stream held) | 66 / 66 (0) | 222 / 222 (0) | [14, 182, 362] / [14, 182, 362] (top 0, width 0) |
| employee | availability | 390 | not seen (the server sent the page in one piece) | | | |
| employee | availability-agreement | 390 | not seen (the server sent the page in one piece) | | | |
| employee | notifications | 390 | not seen (the server sent the page in one piece) | | | |
| employee | updates | 390 | the page in its own loading card | 66 / 74 (+8) | 162 / 232 (+70) | [14, 122, 362] / [14, 192, 362] (top +70, width 0) |
| employee | profile | 390 | not seen (the server sent the page in one piece) | | | |
| employee | more | 390 | route placeholder (stream held) | 66 / 66 (0) | 310 / 310 (0) | [14, 270, 362] / [14, 270, 362] (top 0, width 0) |
| employee | help | 390 | not seen (the server sent the page in one piece) | | | |
| employee | home | 1440 | route placeholder (stream held) | n/a / 109 | 363 / 363 (0) | [296, 311, 707] / [296, 311, 510] (top 0, width -197) |
| employee | schedule | 1440 | route placeholder (stream held) | n/a / 88 | 296 / 296 (0) | [296, 244, 1080] / [296, 244, 1080] (top 0, width 0) |
| employee | my-time | 1440 | route placeholder (stream held) | n/a / n/a | 363 / 363 (0) | [296, 311, 707] / [296, 311, 644] (top 0, width -63) |
| employee | my-pay | 1440 | the page in its own loading card | 88 / 88 (0) | 363 / 363 (0) | [296, 311, 1080] / [296, 311, 530] (top 0, width -550) |
| employee | requests-hub | 1440 | the page in its own loading card | n/a / 88 | 363 / 363 (0) | [296, 311, 1080] / [296, 311, 1080] (top 0, width 0) |
| employee | requests | 1440 | not seen (the server sent the page in one piece) | | | |
| employee | exchange | 1440 | route placeholder (stream held) | n/a / 130 | 296 / 296 (0) | [296, 320, 530] / [296, 320, 530] (top 0, width 0) |
| employee | availability | 1440 | the page in its own loading card | 130 / 130 (0) | 224 / 224 (0) | [296, 248, 1080] / [296, 248, 1080] (top 0, width 0) |
| employee | availability-agreement | 1440 | the page in its own loading card | 130 / 130 (0) | 224 / 224 (0) | [296, 248, 812] / [296, 248, 812] (top 0, width 0) |
| employee | notifications | 1440 | not seen (the server sent the page in one piece) | | | |
| employee | updates | 1440 | not seen (the server sent the page in one piece) | | | |
| employee | profile | 1440 | the page in its own loading card | n/a / n/a | 196 / 196 (0) | [296, 220, 812] / [296, 220, 812] (top 0, width 0) |
| employee | more | 1440 | route placeholder (stream held) | n/a / 130 | 296 / 296 (0) | [296, 320, 530] / [296, 320, 530] (top 0, width 0) |
| employee | help | 1440 | not seen (the server sent the page in one piece) | | | |


The swap, measured where the placeholder is drawn by the client (the access check, Owner Schedule and Timecards; run `p7c-work/v2-owner`, final source):

- 390, motion allowed, the frame in which the page replaces the placeholder: the only animations under the page are `b-arrive`, property `opacity`, 150ms, on the children of the cards (the card's heading, its list, its add row). No `b-enter`, nothing on the title, the band or the cards themselves. Title top 74 (placeholder 74), first card 462.6 (placeholder 463). 600ms later nothing is running and the boxes have not moved: no late start.
- 390, reduced motion: no animation at the swap on Schedule; the first frame is the end state. On Timecards one existing fade runs under reduced motion, `eb-keep-fade` (opacity, 150ms, on the `.b-keep` parts beside the screen). It is not mine; see "Needed from another package".
- 1440 (these two pages are not kit screens there): no animation at all at the swap, with motion allowed and reduced. The page stands in the placeholder's place at once.
- How the mark works: as the placeholder leaves, `<html>` carries `data-c-arrived` for 250ms, and at 150ms the screens that arrived get `data-b-arrived`, which stays. The rules match either, so they never stop matching. (A first version removed the mark on a timer; that would have started the page's rise late. The 600ms reading is the check for it.)
- On a first page load the server streams the placeholder and React swaps it without running the placeholder's code, so there is no fade there: the page appears in place and does its usual entrance.
- Pictures: `owner-schedule-handover-placeholder-390.png`, `-swap-t0-390.png`, `-swap-t80-390.png`, `-swap-t300-390.png`, `-swap-t0-1440.png`.

What remains (measured, not changed):

- **Owner and Manager phone pages that are not main tabs.** They are not kit screens on a phone and have no band ladder there, so the kit placeholder (first card at 130) does not match them: Clocker PINs first card at 272, Insights 231, Time off requests 192, Settings hub 156, a person's scheduling restrictions 142, Paid time export 80. Account recovery, Clocker recovery, Punch photos and a person's Clocker PIN match (130). Phase 2 reported the same gap.
- **Owner Timecards, 390, the page itself.** After the page appears its first card moves from 299 to 318 (a line arrives in the band a moment later). The placeholder now matches the settled page (318). The 19px shift belongs to the page, not to loading.
- **Clocker PINs, 1440.** The placeholder's band ends at 296 and its card starts at 320; the page's at 298 and 324. It needs a phone ladder, which is a design decision (see "For Jose").
- **Employee Home, 390.** The placeholder band is 321 (the Nov 11 number). The loaded page measured 297 in this fixture. The band's height depends on the day's state (a status line under the title), so I did not move it.
- **Employee Time off.** While its own list loads, the first card sits 9px lower than the loaded one (195 against 186 at 390, 328 against 320 at 1440). That is the page's in-page loading card, not the route placeholder.
- **First card width on Employee desktop pages.** The top matches everywhere. The width differs on Home (placeholder 707, page 510) and Time (707, 644). Pay's in-page loading card is 1080 wide and the loaded first card is 530.
- **Employee Updates' route placeholder** was not seen in a browser (the server sent that page in one piece). Its table entry is unit tested.
- **In-page loading cards follow the placeholder with another shape** (a state card where the list will be). That is Phase 2's design; I only kept the band's height for the two pages above.

## 4. The spinner

One drawing: a ring in the current text colour with a quarter left open. Two sizes: 20px in a state card's icon circle, 16px beside words. One keyframe, `b-spin`, defined once in the root sheet `src/components/signature/components.css` (it loads on every page, so the signed-out pages share it). It turns only under `prefers-reduced-motion: no-preference`; otherwise the ring is still and the busy words, `aria-busy` and the status line carry the state.

Kit changes (`b-kit.tsx`): `BSpin`, `BBusyLabel`, `BButton` props `busy` and `busyLabel`, `BState` action `busyLabel`. A busy kit button stacks its label and its busy words in one grid cell, so it is as wide as the longer of the two before, during and after.

Measured, Things to do, Approve on a time off request (the decision request held for a moment; fictional local data):

| Width | Before (Decline, Approve) | While busy | Ring | Announced |
|---|---|---|---|---|
| 390 | 134px, 134px | 134px, 134px. Approve reads "Approving…", `aria-busy="true"`, disabled; Decline disabled | 16px, the button's own text colour (`rgb(140, 147, 151)` on the disabled pill), `b-spin`, `rotate`, 800ms | row status line: "Saving your decision…" |
| 390, reduced motion | 134px, 134px | 134px, 134px, same words | 16px ring, no animation | same |
| 1440 | 112.8px, 96px | 112.8px, 96px, "Approving…" | not drawn (the 96px pill holds the words alone, as before) | same |
| 1440, reduced motion | 112.8px, 96px | 112.8px, 96px | not drawn | same |

No overflow. Run `p7c-work/v1-owner`; pictures `things-to-do-request-row-busy-*`.
One thing seen and not changed: the pressed button is natively disabled while it works (it was before this package), so keyboard focus falls to the page while the decision is saved. The Signature pattern keeps focus by using `aria-disabled`. Moving the kit button to that is a behaviour change for every form that uses it, so I left it; see "For Jose".

State card ring (Owner Notifications while its list loads, the request held): 20px, colour equals the text colour (`rgb(63, 70, 75)`), `b-spin`, `rotate`, 800ms, linear; the card says "Loading…", `role="status"`, `aria-busy="true"`. With reduced motion: no animation, same words. (`owner-notifications-loading-card-*.png`.)

Keyframes, before and after:

| Keyframe | Where | Now | Why |
|---|---|---|---|
| `b-spin` | `b-foundation.css` | moved: defined once in `signature/components.css`, used by `.b-spin` and `.sig-btn__spin` | the one keyframe |
| `sig-btn-spin` | `signature/components.css` | merged into `b-spin`; the icon became the ring | duplicate |
| `eb-spin` | `employee-b/account.css` | removed; the row uses the kit ring | duplicate |
| `wc-spin` | `premium-wave-c.css` | removed; Locations search uses the kit ring | duplicate |
| `actSpin` and `.act-spin` | `activate/activation.css` | removed | dead: no markup used it |
| `em-notif-spin`, `em-notif-pulse` | `employee-mobile/account-corp.css` | removed; that older list uses `b-spin`, only with motion allowed | duplicate, and it animated under reduced motion |
| `nevora-shimmer` | `portal-motion.css` | removed | dead since Phase 1 |
| `sig-sheen` | `signature/components.css` | removed | dead since Phase 1 |
| `ckSpin` | `clocker.module.css` | left | the Clocker's |
| `c-skel-shimmer`, `c-skel-in` | `corp/corp.css` | left | the retired corporate shapes inside `CorpSkeleton`; they are `display: none` under Direction B so they never run; `corp-upscale.test.tsx` pins the keyframe text |
| `premium-pulse` | `portal-premium.css` | left | the older Inbox pane's `premium-skeleton`, a retired look not drawn under Direction B. Its second use, the Settings placeholders, is gone with those files (the rule in `premium-wave-c.css` is now dead) |
| `c-arrive` | `corp/corp.css` | left, switched off under Direction B from my sheet | replaced by `b-arrive` |
| `b-shimmer`, `b-arrive` | `b-shimmer.css` | new | items 2 and 3 |

Before: 7 spinner keyframes, 6 shimmer or pulse keyframes, 1 hand-over fade. After: 2 spinner keyframes (`b-spin`, and the Clocker's), 1 shimmer that runs (`b-shimmer`; three retired ones stay in older sheets and do not run under Direction B), 1 hand-over fade (`b-arrive`).

Not converted (item 4 is "partly" for this): the busy labels that only swap words. They keep their label or their busy words and never show motion alone, but their width follows the words where the button is not full width. The main families: `PendingButton` (14 uses, older management forms), `CorpButton` with a ternary label, raw `q-btn`, `q-bs`, `nv-btn` and `b-btn` buttons in the Nov 17 feature screens (reminders, restrictions, payroll import, Clocker owner pages). Converting each is a one-line change to `BBusyLabel`, but there are about 190 and several belong to screens other builders are editing now.

## 5. Long waits

| Wait | What the screen says | Gap |
|---|---|---|
| Payroll import, sending batches | State card: title "sending" and a line (`r.sendingTitle`, `r.sendingLine`), `role="status"` | none |
| Export planning | State card with `p.planning` | none |
| Rondo business evidence read | The button reads "Reading…" and the results area shows a skeleton card with the spoken label "Reading…" | The skeleton card itself has no visible words. With the button out of view the screen shows only grey bars (now with the shimmer). Presentation could add one line; I did not write a new sentence without Jose |
| Rondo knowledge, weekly plan, business: first load | Skeleton card, spoken label ("Loading company knowledge") | Same: no visible words |
| Reminders eligibility | "Checking if a reminder can go", "Queuing reminder…", "Checking…" | none |
| Route placeholder over 2.5s | "This is taking longer than usual. Check your connection, then try again." with Try again | Only on a client navigation. On a first page load React does not run the placeholder's timer (a streamed fallback is not hydrated), so a slow first load shows the placeholder with no words however long it takes. That needs a server-side or inline-script change, not presentation |

## 6. Signed-out pages

- Sign-in, recovery and reset use `SigPendingLabel`; activation and the passkey row use `SigSpinner`. All draw the one ring from the root sheet now, in the button's own text colour.
- They have no placeholder and no `loading.tsx`.
- `actSpin` and `.act-spin` were dead and are removed (with their dark-theme and reduced-motion lines).
- `q-auth-greeting-in` already sits behind `prefers-reduced-motion: no-preference`; untouched.
- Measured on sign-in with a wrong fictional password, the request held for a moment: the button is 318 by 52 before and while busy at 390, and 376 by 52 at 1440; `aria-busy="true"`, `aria-disabled="true"`, focus stays on it, the status line says "Signing in…"; the ring is 16px in the button's white; `getAnimations`: `b-spin`, `rotate`, 800ms. With reduced motion the ring has no animation and the words are the same. No overflow. (`sign-in-busy-390.png`, `sign-in-busy-reduced-motion-1440.png`; run `p7c-work/v1-employee`.) Spanish was not captured: the words come from the existing copy and were not changed.

## Components and sheets touched

- `src/app/app/b-shimmer.css`: everything new (shimmer, hand-over, spinner sizes, busy label, phone bands by address).
- `src/components/owner-b/b-kit.tsx` (shared file, my hunks only): `BSpin`, `BBusyLabel` and the `busy`, `busyLabel` props on `BButton` (the block before and at `BButton`); `STATE_LOOK.loading` uses `BSpin`; the comment above `BLoadingShape`; `route` on `BLoadingShape` and `data-b-for` on `BLoadingScreen`; `busyLabel` on `BState`'s action and its two button lines.
- `src/components/owner-b/b-loading.tsx`: the arrival mark on unmount, `route` passed to both frames, `B_LOADING_TABLE` export, Employee More's cards.
- `src/components/owner-b/inbox-b.tsx`: the two decide buttons use `busy` (words unchanged: "Declining…", "Approving…").
- `src/components/signature/sig-button.tsx` and `components.css` (root sheet): the ring, the one keyframe, `sig-sheen` removed.
- `src/app/app/b-foundation.css` line 288 only: the nested `@keyframes b-spin` removed, the duration reads `--b-spin-dur`.
- `src/components/employee-b/account.css` (two lines removed), `messages-b.tsx` (the ring), `src/app/app/premium-wave-c.css` (three lines removed), `settings/locations/locations-search.tsx` (the ring), `src/components/employee-mobile/account-corp.css` (four lines to two), `src/app/activate/activation.css` (dead rules), `src/app/app/portal-motion.css` (one dead keyframe).
- Eleven `loading.tsx` under `src/app/app/settings/**` and `account-recovery/` now return `RouteSkeleton`. Deleted: `settings/wave-c-loading.tsx`, `wave-c-route-loading.tsx`, `wave-c-recovery-loading.tsx` (nothing else imported them).
- Tests: new `src/components/owner-b/b-loading-motion.test.tsx`. Updated: `b-states.test.tsx` (a test name), `sig-button.test.tsx`, `sig-pending-label.test.tsx` (the ring is a span, not an svg), `restrictions-screen.test.tsx` and `manager-inbox-corp.test.tsx` (a label now sits inside the busy stack).

## Copy

No new sentence. Things to do's busy words are the ones it had. The state card's default busy words stay "Checking…" (English; they are written only while busy, so a Spanish screen holds no stray word at rest; a caller can pass `busyLabel`).

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no errors in `src` (and none in my capture script).
- `npx eslint` on the 23 changed or new TypeScript files: clean.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 911 files passed, 24 skipped; 13,933 tests passed, 741 skipped; 0 failed. (`p7c-work/vitest-final.log`.)
- `git apply --check -R p7patches/c.patch` in the worktree: passes.
- New tests, `src/components/owner-b/b-loading-motion.test.tsx` (82): every table entry of both shells renders its shape (band rung, frame, lift, back row, title or bar, sub-line, action, strip or figures, card count, rail cards, rows, heads, lead circles, figures, one "Loading…", nothing focusable); a sample address exists for every pattern; the shimmer comes from the sheet and no other source file names it; one keyframe, transform only, 1600ms after 300ms, nothing outside a no-preference block; the band tint; the hand-over rules and the arrival mark; all 52 `loading.tsx` files draw the one placeholder (two named exceptions); `data-b-for` and the phone bands; one spinner keyframe across every sheet (plus the Clocker's); ring colour and motion gate; two sizes; a loading card has words and `role="status"`; the busy button idle and busy (label kept, `aria-busy`, disabled, the same markup shape so the width cannot change, the 16px slot), the state card's retry.
- Browser, real app (`next dev` on an owned local Postgres, fictional data, real sign-in), my own steps in `zz-scan/p7c.ts` (not in the patch). Runs: `f1-owner` and `f1-employee` (shimmer frames, exact-pass frames, tracing, reduced motion, state card spinner, hand-over measurements at 390 and 1440), `v1-employee` (re-measure of four Employee pages, sign-in button), `v1-owner` (the swap's fade, the busy request row, the newer Owner routes). `overflow` was 0 in every probe. No `pageerror`.
- How states were produced: the route placeholder by holding the document's stream in a pass-through server (real server output, real shell, scripts running); the access check placeholder, the state card spinner and the busy buttons by holding one request in the browser (`page.route`), then letting it go. Nothing was faked: every response is the local server's own.
- Not run: integration suites under `src/test/integration`, the manuals guard, Spanish, 900px, 320px, 200% text, a screen reader, a real device.

## For Codex

- Nothing needs the server.
- Observation: through a pass-through origin the app's own client reads (the access check, the Employee lists) never complete, so pages stay in their loading card. I did not look for the cause; it only matters to capture tools.

## For Jose to decide

1. **Private properties** in `b-shimmer.css` (no token is this long): `--b-shimmer-dur` 1600ms, `--b-shimmer-wait` 300ms, `--b-shimmer-span` (derived: the window on a phone, `--b-frame-wide` from 768px), `--b-spin-dur` 800ms (the value the spinner already had). Say if any should become tokens.
2. **Shimmer strength.** White at 72% on the grey blocks, the glass edge on the band, 1.6s a pass. It is deliberately quiet; on desktop it is easy to miss on a short wait.
3. **A phone ladder for Owner and Manager pages that are not main tabs.** Without one their placeholders cannot match (numbers under "What remains").
4. **Desktop pages that are not kit screens swap at once**, with no fade. The fade is on kit screens only, because fading a whole page blinks the band. Say if you want the card contents of the older desktop pages to fade too (each has its own header variant, so it is a page-by-page job).
5. **Visible words on Rondo's skeleton cards** ("Reading your records…" or similar under the bars). It needs a sentence from you.
6. **Request row busy words from 768px.** The tinted pill is 96px wide, so there it shows "Approving…" without the ring; phones show the ring and the words.
7. **Focus while a kit button is busy.** It is natively disabled, so focus leaves it. Say if the kit button should keep focus (`aria-disabled`, as the sign-in button does).
8. **Employee Home's phone band** changes with the day's state (297 measured, placeholder 321). Either the page reserves the line or the placeholder follows the state.

## Needed from another package

- **Package A.** `b-enter` (`b-foundation.css` line 243, used by `owner-b.css` line 351, `owner-b-home.css` line 29, `employee-b/time.css` line 191, `requests.css` line 150; and `eb-keep-enter` in `account.css`) rises 12px with a 4px blur on every screen mount, the placeholder included. Phase 7 bans blur. I only switch it off at the swap (`html[data-c-arrived]`, in my sheet). If A changes `b-enter`, the layer block at the foot of `b-shimmer.css` should still match its selectors.
- **Package A.** `b-foundation.css` line 288: I edited that one rule (mine), in its own hunk.
- **Package B.** `BState` kind `done` is untouched. My hunks in `b-kit.tsx` are at `BButton`, `STATE_LOOK.loading`, `BLoadingShape`, `BLoadingScreen` and the action lines of `BState`.
- **Package A.** `eb-keep-fade` (`employee-b/account.css`) runs under reduced motion: opacity, 150ms, on `.b-keep` parts when a page mounts (seen on Owner Timecards at 390). The Phase 7 rule is "the end state appears at once".
- Nothing was needed from A or B to finish.

## Suggested DESIGN.MD lines

- **Loading (Phase 7).** A placeholder block shimmers: one light band, 1.6s a pass, after loading has lasted 300ms, the same clock for every block, transform only. With reduced motion it is static. The rule is in `b-shimmer.css` and keys on the shared placeholder; a page never asks for it.
- **Hand-over.** When the page replaces its placeholder nothing moves: the band, the title and the cards are already in place and only the contents of each card fade in over the hover duration. A placeholder that no longer matches its page is a bug; a phone page's band is set by address in `b-shimmer.css` (`data-b-for`).
- **Spinner.** One ring in the text colour, 20px in a state card and 16px beside words, one keyframe (`b-spin`, in the root sheet). It is never alone: words sit beside it. With reduced motion it is still.
- **Busy button.** `BButton busy` keeps the button's width (label and busy words share a cell), sets `aria-busy` and refuses a second press. A loading state card shows one ring, its own.
- **Settings placeholders** are the kit placeholder. The Wave C loading files are gone.

## Not verified

- **Route placeholders not seen in a browser** (the server sent the page in one piece each time; their table entries are unit tested): Owner Payroll, Payroll import, Clocker tablets, Settings positions, Settings company profile, Settings locations at 1440; Employee Pay and Requests at 390, Availability, Agreed times, Notifications, Updates, Profile and Help at one or both widths. The hand-over table marks each.
- **Ten Settings pages and Account recovery** now draw the kit placeholder. Seen: the Settings hub (390 and 1440) and Account recovery (390). The other sub-pages use the table's "form" entry (back row, band 196, one card); I did not measure each loaded page against it.
- **The fade on a client navigation's placeholder** (a tab tap in production). The local server runs `next dev`, where a held navigation shows no placeholder. The same code path was seen through the access check.
- **Employee and Lead swap.** Their pages have no access check, so the swap with the fade was seen for Owner pages only.
- **Employee Updates' band while its list loads** (232 at 390): the rule is written, and the run after it did not reach that state. Things to do's (251) was confirmed.
- **Things to do with nothing to do, and Updates with no updates:** whether the loaded band is still 251 and 232 there.
- **Manager and Lead** were not run (same components as Owner and Employee). **900px, 320px, 200% text, Spanish, a screen reader, a real device, Safari and Firefox** were not run. The compositor reading is Chromium's.
- **The busy request row** was measured on the commit before the last one; the last commit changed only the arrival mark and one table entry.
- **The shimmer on Rondo's skeleton cards** (`be-skel`, `kn-skel`, `wk-skel`): the rule covers them by class; no Rondo page was opened in a browser (the flags were off in these runs).
- **Locations search's ring and the older Employee notification list's ring**: source and unit tests only.
- The capture tool's `scan-log.json` was not kept for runs where I edited source while they ran (the tool refuses to write it then). My own step log, `p7c-log.json`, is saved after every step and is in the evidence folder.


---
Filing note (Nov 17, 2026): paths that start `p7a-work/`, `p7b-work/`, `p7c-work/` or `p7patches/` name the builder's working files, which were not kept. The pictures kept are in the evidence folder beside this report; where a builder captured more frames than are filed, the file named may not be there.
