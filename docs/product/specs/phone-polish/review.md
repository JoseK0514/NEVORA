# Phone polish: Product Designer review

- **Initiative:** direction items 11 (A17, Back closes sheets), 12 (small fixes) and 13 (A13, Android shortcuts). Reviewed: `spec.md`, `flows.md`, `visual.md`, `mockup.png` (frames A to E), `before-employee-shift-card-390.png`, `docs/product/prd-phone-polish.md` and `docs/product/direction.md`.
- **Reviewed:** 2026-10-17 by the Product Designer, cycle 1 sign-off before Checkpoint 2.
- **Code checked:** `scripts/phase-e-home-browser-scenarios.mjs:18-19, 37, 41-44, 161, 173, 179, 190`; `src/components/employee-home-reviewed.test.tsx:105-117`.
- **Verified fact:** `phase-e-home-browser-scenarios.mjs:179` asserts `assignments().count() === 2` in the source-failure stage, where `assignments()` finds "View schedule" links inside the card (`:19`). The spec's choice to keep one link per block (D2) is required, not optional.
- **Method:** heuristic evaluation, brand check against direction §1.2 (the pass is the single brand moment, U2).

## 1. Final scorecard

| Line | Score | Reasoning |
|---|---|---|
| Usability | 2 | Back keeps your place, the shift you're on reads first, and a long press opens Schedule |
| Familiarity | 2 | Platform Back, launcher shortcuts and a now-then-next shift card people know from other work apps |
| Trust | 2 | The card still says nothing about clock status, and the preview stops contradicting itself (4 clocked in against "No one is clocked in") |
| Accessibility | 2 | Fixes a 4.44:1 text failure on the pass, returns focus to the opener after Back, and gives the two "View schedule" links distinct names |
| Brand distinctiveness | 2 | Keeps the pass and its tear line as the one brand moment, with one tear per card |
| Durability | 2 | No new patterns; platform behaviour and manifest fields |
| Cost | 1 | Parts B and C are small. Part A may need history entries on iOS, which sit awkwardly with the Next.js App Router and need careful upkeep |
| Continuity | 2 | Same sheets, same card, same pinned strings and link count |
| **Total** | **15 / 16** | No 0 on Trust, Accessibility or Usability |

I lowered the draft's Cost from 2 to 1. The history work only happens if slice A1 finds failures, and iOS Safari has no close-request API, so plan for it.

**Verdict: Go,** with the three required changes in section 3.

## 2. Checks

### Constants

| Constant | Kept? | Note |
|---|---|---|
| Teal for actions only | Yes | No new teal. The pass already carries the brand gradient as the U2 exception; shortcut icons use the masthead #1C4A47 like the app icon |
| Status ladder | Yes | No "Now" badge, no green, no live dot on the shift under way |
| Inter, Phosphor | Yes | Shortcut glyphs are the `NavIcon` Phosphor glyphs, drawn locally with no paid generation |
| 44px targets | Yes | No target changes |
| 15px phone floor | Yes | Pass eyebrow 15px, headings 17px |
| WCAG 2.2 AA | Yes, improved | Pass secondary text from 82% to 94% white (J1) |
| Script-pinned strings and ids | Yes | `employee-reviewed-next-heading` id, "Scheduled now" once, "No upcoming published shift", "Next shift" before `data-test-own-time` (`employee-home-reviewed.test.tsx:116`), card before To do, two "View schedule" links. The keyboard stage takes `.first()` (`:161`), which becomes the current block's link and still passes |
| Navigation structure | Yes | Preview catches up with the approved D3 sidebar; shortcut labels reuse nav names |
| Payroll and legal copy | Not touched | |
| B1 branding | Yes | 94% text holds about 4.6:1 at the brand floor; shortcut icons stay NEVORA teal like the app icon |

**One rename:** the card's `h2` reads "Your shifts" while a shift is under way (D1). It's a heading, not an action or nav name, the id stays, and the reason holds: under "Next shift", the first thing you'd read is a shift that isn't next. I accept it. The H01 description string at `:44` must change in the same build.

### Platforms and states

- **Platforms:** Part A has a full matrix (iOS Safari tab, iOS PWA on 26.5 and 27.0, Android Chrome and PWA with button and gesture navigation) plus desktop Esc. Part C covers Android WebAPK, desktop Chrome and Edge, and notes that iOS ignores `shortcuts`. Part B is web markup on every platform.
- **States:** Part B covers current and next, current only, next only, no shifts, loading, schedule unavailable, paused, overnight. Part A covers offline, reduced motion, screen reader (the Z gesture) and 200% zoom. Part C covers signed out, offline, loading and module off. Complete.

### Unapproved backend, legal or privacy work

None. The shortcuts don't add a return URL after sign-in (that waits for the passkey auth phase). Phone testing uses `adb reverse` and the Mac's local address, with no hosted preview. Reading modules in the manifest route uses an existing read and exposes only whether Time off is on, which the logged-out module-off page already reveals.

### Things I found that the spec missed

1. **Part A has no test for history length.** AC-A2.3 and A2.4 promise that you never need two Back presses, but the checks only describe manual steps. A leftover history entry is the most likely bug in this work, and the App Router keeps its own state in `history.state`.
2. **The hidden date suffix needs one source.** The spec's example "View schedule for Sat, October 17, 2026" uses a long date. Elsewhere NEVORA writes "Tue, Oct 6" through `formatDisplayDate` (DESIGN.MD Phase 2). A one-off format will drift, and a concatenated suffix is hard to translate in B5.
3. **The mock-up is behind the spec.** Frame B shows one "View schedule" link for the whole card and the sentence "...shows if you're clocked in." The spec keeps two links (required by `:179`) and uses "whether". Build from the spec.

## 3. Required changes before build

1. **Automated history checks for Part A.** For each surface that A2 fixes, the build script records `history.length` and the current URL before opening, after closing by each path (Back, Close actions, Esc, swipe down, tap outside, choosing a link), and after one more Back. Pass means one Back always leaves the page and the history never holds a sheet entry after the sheet closes. Run it in WebKit and Chromium. Write any pushed entry so it merges the existing `history.state` rather than replacing it, and keep the PRD Q1 fallback (Android fixes alone, iOS recorded as a gap) if Next's router fights it.
2. **Build the link name from existing helpers.** Set the "View schedule" accessible name as one whole string, "View schedule, {date}", with `{date}` from the existing display-date helper, either through `aria-label` (the visible "View schedule" stays at the start, so WCAG 2.5.3 holds) or a single hidden span. Check B1.6 confirms the script still counts two links.
3. **Mark the mock-up as superseded on two points.** Add one line to `spec.md` §1 Part B saying frame B's single link and its sentence wording are superseded by this spec, so the UI Engineer doesn't build from the picture.

## 4. Decisions for Jose at Checkpoint 2

| # | Decision | Spec recommends | My recommendation |
|---|---|---|---|
| J1 | Amend AC-B1.4 ("no current shift: zero diff") to allow one listed change: pass secondary text from 82% to 94% white on every next-shift pass | Yes | **Agree.** Today's eyebrow measures 4.44:1 at the gradient's lightest point, which fails WCAG 1.4.3 on a constant we promise. The fix is one value and holds for every B1 brand. I haven't measured the gradient myself; check B1.7 must confirm 4.5:1 or more on the default and one stress brand before sign-off |
| J2 | Lend your iPhone (Safari and Home Screen app) and Android phone (Chrome and installed app) for about 20 minutes after slice A2, and possibly the Android phone for slice C2 | Schedule it after A2 | **Agree.** Simulators can't settle the iOS edge swipe or WebAPK shortcuts. The phones reach the fictional runtime locally, with no deployment. Any hosted preview still needs your explicit go-ahead |
