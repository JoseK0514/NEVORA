# Package K: kit and shell (final fixes, Nov 23, 2026)

Branch `claude-codex-collab-nevora-kit-final`, from `1480ed4c`. Fictional data, throwaway local Postgres, production scan
harness (`tools/ui-scan/desk.sh`, with a local, uncommitted copy that also runs axe-core and a 200%-text pass). No deploys.

## Commits
| Commit | Item | What changed |
|---|---|---|
| `452f5e37` | K7 | `BLive`: the space between label, figure and line is screen-reader text (`.b-sr`, no-break space). A bare space between flex items was dropped from the name. The item's `aria` is no longer read, so a tile's name is its visible words. |
| `cfcdf808` | K8, G74 | `CorpCount` carries the same screen-reader space, so headings read "Clocked in 2"; Who's working's `headed()` uses `CorpCount`. |
| `19487309` | K6 | `owner-b.css`: `.b-day span` 12px → 0.75rem (and the day column `max(44px, 2.75rem)`), `.b-card__a` 14px → 0.875rem, `.b-chip` 12/16 → 0.75rem/1rem with height `max(var(--b-chip-h), 1.375rem)`, row chip line-height `max(22px, 1.375rem)`. Same at the default size. |
| `8ad4d3db` | K5, G79 | Header avatar initials capped at 13.5px (`min(var(--b-fs-meta), 13.5px)`), so they stay in the 40px circle at 200% text. |
| `998b4c17` | K4, G88 | State card title 16/22px → 1rem/1.375rem; title and line wrap; buttons and "also" links in a state card may wrap inside the card. Same at the default size. |
| `7c882d98` | K2, G-ST7/G87 | The G48 band paint also goes under section tabs on quiet pages (`.q-page > .q-hd ~ nav.c-seg`, Time off requests). |
| `05dbcd63` | tests | Two more tests updated for the screen-reader space. |

Tests updated with each commit (markup only): corp-upscale, whos-working, employees page, schedule publish page,
owner-home-corp, employee home-b, b-kit-labels, b-foundation, scoped-home, notifications-list.

## Item by item
1. **G48 (browser check):** axe at 768 and 1440 finds no contrast failures on the Payroll tabs, Team search, Schedule
   (`nav.c-week`) or Shift requests (`nav.c-seg`). Confirmed; no change.
2. **G-ST7 / G87:** Shift requests already passed after G48. Time off requests (Owner) failed: 2 nodes at 1.08:1 at
   768 and 1440 (white on #f3f6f5) because its tabs sit under `.q-hd`, not `header.c-title`. Fixed in `7c882d98`; axe
   now finds 0 at 390, 768 and 1440. On screen the strip changes by ≤5 levels a channel (not visible).
3. **G88 targets:** no change needed. The drawn sizes stay (36px segments, 32px back link from 768, 40px phone band
   buttons) and each already has a 44px or larger hit area: segment `::after` (b-foundation.css, `inset: -6px 0` /
   `calc(-1 * --b-seg-pad)`), `.b-btn::after` `height: max(100%, 44px)` (owner-b.css), back link G5. axe `target-size`
   finds nothing on any captured page.
4. **G88 closed card at 200%:** state card text and buttons now wrap inside the card (`998b4c17`). The Manager-without-
   grant closed page itself wasn't reachable with the scan's fictional roles. The Who's working and request pages at 390
   with 200% text show nothing clipped (audit `clipped: []`).
5. **G79 avatar:** fixed (`8ad4d3db`); seen at 390 with 200% text on Owner Home and Team.
6. **Fixed px kit text:** fixed (`19487309`).
7. **BLive names:** fixed (`452f5e37`); axe finds 0 on Employee Home at 390, 768 and 1440.
8. **G74:** fixed (`cfcdf808`). Things to do (`manager-inbox-corp.tsx`) has its own copy of `headed()` with the same
   problem; it's a screen file, so it's listed below rather than changed.
9. **B8 loading card:** no change. The card's children fade in (`b-arrive`, b-shimmer.css); a one-off axe read during
   the fade sees part-transparent text. With reduced motion (the scan's setting) and at rest it passes.
10. **Phone app device settings re-check:** the Owner's Device settings popover opens at 390 and 1440. All ten phone-app
    Alerts states (ready, enabled, denied, revoked, error, loading, two confirmations, paused) have no overflow. The red
    "Turn off alerts" has white words. axe finds 0 on the pages.

## No change at the default size (before/after)
BEFORE was captured from `1480ed4c` and AFTER from the fixes, in the same production scan: Owner Home, Team, Schedule,
Timecards, Payroll and Settings at 390, 768 and 1440, plus Employee Home. Pixel diff: Home 390/768/1440 and Payroll and
Settings at 390 are identical. Every other difference is live data: the bell's unread dot, "Schedule read at 9:02 →
9:08 AM", and the clocked hours and minutes on Timecards and Employee Home. Inspected side by side; no layout, size or
alignment changes. No page overflows horizontally at any width.

## Impeccable audit (kit changes)
- Hierarchy: unchanged at the default size. At 200% text, chips, day labels, card links and state-card titles now grow
  with the body text instead of staying small.
- Spacing: unchanged; the screen-reader spaces are absolutely positioned and take no room.
- Accessibility: figure and count names match their visible words (label in name). Time off tabs now pass contrast.
  Targets stay at 44px hit areas.
- States: state card (closed, failed, loading) wraps at 200% text; the loading fade is a measuring artefact only.

## Left, as proposed ledger rows (end sweep)
| Row | Where | What | Owner |
|---|---|---|---|
| K-1 | Things to do (`manager-inbox-corp.tsx` `headed()`) | Same "Title2" name as G74: use `CorpCount` | screens |
| K-2 | Timecards 390 (`.b-row--link[type=button]`, 12 rows) | axe label-content-name-mismatch | Timecards |
| K-3 | Payroll 390 (`.b-step--link`, `.b-link`), 768/1440 (Prepare row) | axe label-content-name-mismatch | Payroll |
| K-4 | Callers that still pass `aria` to `BLive` items (Employee Home and others) | Now unused; remove when those files are next touched | screens |
| K-5 | Device settings popover, fictional "unavailable" state | "Device setup needs attention." above "Device setup is unavailable…": near repeat | Alerts |
| K-6 | Closed-page card (Manager without a grant) | Re-capture at 390 with 200% text once a fictional role without the grant is seeded | QA |

Checks run: `tsc --noEmit` clean; oxlint clean on the changed TSX; unit tests beside every change pass. Full suite: the
only other failures are in `src/lib/tenancy/**` (they need commit `7c628e37`) and `src/lib/operations/managed-runtime.test.ts`; none touch the files changed here.
Captures: `shots/kit-final/` (webp, quality 80) and `rows.json`.

## Follow-up from the lead (13:20 UTC)
| Commit | What changed |
|---|---|
| `5eeac662` | Phone tab bar: for Owner and Manager, shift swaps, callouts, open shifts and Availability light Schedule, not Home or To do. They were listed under Home because Things to do links to them. Time off and Things to do stay with Home (To do for a Manager without Payroll). Every route under `/app` was checked for the four roles (`activeMobileTab`). Payroll's exports and Payroll settings light Payroll; without a Payroll tab, exports light Time. Settings pages light no tab, the same as Settings itself, which opens from the avatar. New test in `navigation.test.ts`. Seen at 390 for all four roles: `img/tabbar-mapping-390.webp`. |
| `15521816` | Things to do: card headings and the band's filter counts use `CorpCount`, so they read "Open shifts 1" and "All 5". The filters' `aria` ("All, 5") is dropped: their name is their visible words. |
| `57fe9ba7` | `BLiveItem` has no `aria` field any more; Employee Home's figures drop the unread names (and the unused `boardDuration` import). Nothing changes on screen or in what is read. |
Every test that asserts BLive markup (`b-live__v`) passes: b-kit-labels, employee home-large-text, payroll-premium, scoped-home, owner-home-corp, and all of `src/components/employee-b`. Typecheck is clean.

## Follow-up 2: segmented tabs at 200% text (13:45 UTC)
`cd348986`: in the kit, `.b-seg`, `.q-seg`, `.c-seg` and Payroll's `nav.c-pay-tabs` tracks and items have `height: auto`
(min 44px track, 36px pill, 44px hit area kept), `padding-block: 4px`, `line-height: 1.25rem`, and wrap between words
(`white-space: normal; overflow-wrap: break-word`, centred). These are the values the Employee and Lead band tabs use on
`claude-codex-collab-nevora-staff` (4fb23cbe, 27186f09), so whichever rule wins draws the same. The rule is in the
`nv-b` layer with id steps, so it outranks the per-page rules that pin a segment's height.
- **Default size, before and after:** identical at 390 and 768 on Payroll, Time off, Shift requests and Things to do,
  and on Employee Time off and Schedule. At 1440 the segment strips on every Owner page are identical. The other
  differences are live data: minutes, "1 min ago", and the seeded staffing hours on Home.
- **200% text:** the Owner's segment labels are a fixed 14px (`--b-seg-fs`), so they don't grow and didn't overlap
  before or after. On Employee Time off the "Waiting 2" pill now grows with its count instead of squeezing inside the
  track (`img/seg-timeoff-employee-390-200pct-before.webp` → `…-200pct.webp`).
- **Seen, not mine (proposed rows):** (a) at 768 with 200% text, the band's subtitle lines overlap on Payroll ("Calculate
  pay and share statements…") and Timecards ("Nov 23–29 · 12 people" over "Approval opens…"), because the title band's
  sub line-height is fixed. (b) On Employee Time off at 390 with 200% text, a row's time reads "9:00 AM – :00 PM", with
  the hour cut. (c) If segment labels should grow with text, `--b-seg-fs` would need to move to rem; that is a visible
  change at 200% and needs a decision.

## Follow-up 3: segment text and band subtitle in rem (lead's decision, 13:45 UTC)
- `735e06ee` + `b171c7fd`: `--b-seg-fs` is `min(0.875rem, 20px)` (narrow phones `min(0.78125rem, 18px)`): 14px at the
  default size, growing with text up to 20px. Uncapped 0.875rem (28px at 200%) made "Approved" wider than a third of the
  390px Time off track, so the labels ran together and the "5" count was pushed out (axe overlap 3). With the cap there
  is no overlap at 390 or 768, and two-word labels ("Open cover") wrap and the track grows. iOS segmented controls cap
  their text at large accessibility sizes in the same way.
- `1c23591e`: the band subtitle (`.c-title__sub`, `.q-hd > p`, from 768px, `owner-b-desktop.css`) has line-height
  1.3125rem (21px at the default size). At 768 with 200% text the subtitle lines of Payroll and Timecards no longer
  overlap (Timecards: 5 overlaps → 0; Payroll's title overlap is gone).
- Default size, before and after, 390/768/1440: Payroll, Things to do and Time off (390, 768) are identical; the rest
  differs only in live minutes, "x min ago" and the bell's dot.
- Still flagged at 200% text (page markup, not kit): Payroll's step titles (`.b-step__t`) and the Timecards team rows at
  390, and Shift requests' `dt` and facts lines (25 overlaps before and after).

## Follow-up 4: desktop sidebar focus ring (13:55 UTC)
`af6b43b0`: Tab through the sidebar at 1440 (Owner and Employee) showed the ring was there (2px inset teal on every
entry, outline on the brand, collapse button and Help) but only 5.9:1 on the sidebar and 5.4:1 on the current entry's
tint. In the sidebar the ring is now #08504C (the band's dark end): 9.0:1 and 8.2:1, same width and shape, for every
focusable control in the sidebar. Checked by keyboard Tab for both roles (`img/sidebar-focus-*`); unfocused, the sidebar
and pages are unchanged (the only differences were a loading frame, the "read at" time and the focus the Tab walk left).

## Follow-up 5: sidebar workplace name and J17 filters at 200% text (14:10 UTC)
- `5b2023f7` + `90559bbe`: the Employee and Lead sidebar's workplace name had a fixed 17px/18px line height while its
  font is rem, so at 200% its two clamped lines overlapped each other and the role line. The name's line height is now
  1.0625rem/1.125rem and the role line 0.75rem/0.9375rem (both the same at the default size); the name still clamps to
  two lines, and the full name is in the card's `title`. At 1440 with 200% text it now reads "Northside / QA…" over
  "Employee". At 768 the sidebar is the rail (no name). The Owner's card already wrapped cleanly. At the default size the
  sidebar is pixel-identical (Owner and Employee, 768 and 1440).
- J17 Clocker PINs: its filter is a `.c-seg`, so the segment commits (`cd348986`, `735e06ee`, `b171c7fd`) already make
  it grow and fit: at 390 with 200% text "No PIN 12" and "PIN set 0" sit inside their pills
  (`img/j17-pins-owner-390-200pct.webp`). No further change; default size identical at 390, 768 and 1440.

## Follow-up 6: band title in rem, phone band button 44px (14:25 UTC)
- `e14b4904`: the band title is rem everywhere it was px: 2rem/2.375rem (32/38px) on desktop titles (`.c-title`,
  `.q-hd`, the B band, sheet pages, `--bs-big-fs/lh`) and 2.125rem/2.5rem (34/40px) for the phone's big title and
  `.b-hbig`. At 768 and 1440 every page matches before (only live data differs); at 390 with 200% text no title is
  clipped, overlaps or overflows (Home, Timecards, Payroll, Schedule, Team, Updates; Employee Home and Schedule).
- `05fedbf6`: the phone band's action button (`.b-hero` white or glass, not full or big) has a 44px minimum, up from
  40px. This is the one intended change at the default size, at 390 only: Team's "Add", Payroll's "Settings",
  Schedule's band action and Timecards' "Select" (the same glass button; none to select in this fictional week). Pages
  with such a button are 4px taller. 768 and up already used 48px.

## Follow-up 7: phone band titles and CorpPill in rem (14:45 UTC)
Merged `origin/claude-codex-collab-nevora` (f73c450b, includes ef0905bf) first as `d8e3932a`. The shared versions were kept
for Things to do, Employee Home and their tests; one stale Things to do assertion now follows "All" without a count.
- `d8761477`: corp titles in rem: `.c-title h1`, `.c-nav__title`, `.c-skel__title` 1.75rem/2.125rem (28/34px), the
  phone nav title 1.375rem/1.75rem (22/28px) and 1.0625rem/1.375rem (17/22px).
- `43f2fd27`: the shared phone band title (`owner-b-pages.css`, `.c-nav--phone .c-nav__title, .q-nav__t`) and the quiet
  page titles (`.q-hd h1`, owner-b-pages and b-foundation) from `font: 700 28px/34px` to `1.75rem/2.125rem`.
- `0723d7cb`: CorpPill (`.c-pill`, corp.css 13/18px; owner-b-desktop and owner-b-pages `--b-fs-count`/16px) in rem, its
  height `max(22px, 1.375rem)`.
- `src/app/app/kit-text-rem.test.ts` guards these sizes, the segment cap and the band h1.
- Measured at 390 (computed sizes at 100% → 200%): Week templates' phone title 28px → 28px before, 28 → 56px after
  (wraps to two lines); the Insights pill "… under plan" 12px/22px tall → 24px/44px; Insights title 28 → 56px; Updates
  30 → 60px. At the default size every page is identical at 390, 768 and 1440 (only live hours and the bell differ).
- Gap: Rondo (`/app/ai-manager`, `/weekly`) shows "Page not found" in the scan because the scan's app server doesn't
  pass `NEVORA_OWNER_ADVISOR_ENABLED`, so I couldn't capture "Weekly plan" or "Rondo AI". Their titles use the shared
  rule fixed here, and Rondo's own rules (`weekly.css`, `advisor.css`) already set 1.75rem.
- Seen: at 390 with 200% text Insights' four period tabs wrap onto two rows inside a taller track (readable, no
  overlap); a page-level decision whether that strip should scroll instead.
