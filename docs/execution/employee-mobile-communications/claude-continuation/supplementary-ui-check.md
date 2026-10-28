# Communications mobile: supplementary independent UI check

- **Role:** independent senior UI/UX reviewer (NEVORA UI Designer agent). Read-only; no code changed.
- **Status of this check:** supplementary, **not closure**. The original authors own CR-4, UI-COM-002 and UI-COM-003.
- **Revision:** `bc8a5742`. The Communications code is the same at `e65ca90d`, which is the current HEAD of this worktree.
- **Date:** 2026-10-28.

## What I inspected

**Code.** `git diff 8ec15116 bc8a5742` for `messages-view.tsx` and `messages.css`, which covers commits `fb065b37`, `950ae1ea` and `bc8a5742`. I also read the `requests.css` root rule (`overflow-wrap:anywhere`) that the new `.em-requests.em-messages` rule overrides, and the CR-4 cases in `messages-view.test.tsx` at `bc8a5742`.

**Evidence.** `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8dc318c3-a7c1-41c9-b2d0-c675318ab347/scratchpad/evidence/messages-run-4/`. Its `results.json` records 69 checks; I also read the per-engine `*-clearance.json`.

**Images I viewed:**
- Full height: `chromium-detail-text-200.png`, `webkit-detail-text-200.png`
- Crops: `chromium-audience-text-200.png` from y=2200, `firefox-audience-text-200.png` from y=2200, `chromium-updates-text-200.png` from y=600
- Viewports: `webkit-detail-dark-430-viewport.png`, `firefox-detail-light-430-viewport.png`, `webkit-updates-text-200-viewport.png`, `firefox-audience-text-200-viewport.png`

**Pixel measurement.** I used my own PNG decoder, not the author's numbers.
- I sampled the original seam points: (40,750) in `*-detail-dark-430-viewport.png` and (40,580) in `*-detail-text-200-viewport.png`, in all three engines, plus extra points at (40,700), (400,760) and (215,720).
- I scanned every dark and 200% viewport capture in run 4 (60 files) for pure black at x = 8, 40, mid and width−8 on every row.
- For history, I sampled the same points in `messages-run-1` through `messages-run-3`.

## Original findings

### UI-COM-003 (black seam below short dark pages): appears resolved
- **Run 4 samples.** (40,750) is RGB 12,24,23 (`#0c1817`, the dark canvas) in Chromium, WebKit and Firefox. So are the extra points.
- **200% text.** (40,580) at 200% is also 12,24,23 in all three.
- **Light theme.** Light 430 at (40,750) is 244,247,246 (`#f4f7f6`).
- **Scan.** None of the 60 dark or 200% viewport captures contains a pure-black sample.
- **History.** It matches the commit story:
  - Runs 1–2: 430 was clean, but 200% was still black at (40,580).
  - Run 3: 430 had regressed to black at (40,750).
  - Run 4: both are clean.
- **Mechanism.** The fix moves the bottom spacing and full height from the unpainted frame padding onto the canvas-coloured page: `padding-bottom:0` on the frame, and `min-height:calc(100svh - nav)` on `.em-messages`. That is a sound approach.

### UI-COM-002 (acknowledgement words breaking at arbitrary letters, 320/200%): appears resolved
- **Rule.** `.em-requests.em-messages` now sets `overflow-wrap:break-word; hyphens:manual`. Only the user-written `.em-message-copy` keeps `anywhere`.
- **Places the original review cited, all now whole words:**
  - Detail button: "Acknowledge / update".
  - Detail status: "acknowledgement / is required" (Chromium and WebKit full height).
  - Audience review: "Optional / acknowledgement" (Chromium and Firefox).
  - Updates list status: "Acknowledged".
- **Hyphenation.** I saw no automatic hyphens in any inspected capture, so the over-hyphenation from earlier runs is gone.

### CR-4 (partial zero-item page claiming confirmed absence): appears resolved in code and unit test
- **Behaviour now.** A partial page with no rows shows "Nothing confirmed on this page" and explains that some items "couldn't be checked, so they aren't listed". A partial page whose rows are only filtered out shows "No confirmed matches on this page". The sentence "There are no current items on this page" is now reserved for a complete page.
- **No duplicate warning.** The status line above the list shows only when there are matches, so the warning isn't shown twice.
- **Tests.** The unit tests assert these strings.
- **Evidence limit.** Run 4 has no browser capture of either partial state, so I didn't inspect pixels for CR-4.

## New issues (none blocking)

- **S-1, advisory: "acknowledgement" has almost no spare width at 320/200%.** In the audience review and the detail status, the word fills the card's inner line with about 0–4 px left over (`firefox-audience-text-200-viewport.png`, `chromium-detail-text-200.png`). Under `break-word`, any larger text step (OS Dynamic Type beyond 200%) or a narrower viewport will break it mid-word again, without a hyphen. A soft hyphen in the interface strings (`acknowl&shy;edgement`) would make any break deliberate. Optionally, the detail status card's inner padding could be reduced below 360 px.
- **S-2, advisory: the list's middle dot can land at the start of a line.** At 200% a title such as "Opening update 0 · 26" wraps so that "· 26" starts a line (`chromium-updates-text-200.png`). These are fixture titles, but real titles that use " · " separators will do the same. Use a non-breaking space before the dot, or accept it as user content.
- **S-3, advisory: the row icon doesn't line up with the title.** In the updates and notifications rows at 200%, the leading note icon is vertically centred on a five-line row, so it floats beside the date instead of the title (`chromium-updates-text-200.png`). Top-align it with the title's first line, as the deletion fact rows do. This predates the fix.
- **S-4, advisory: CR-4 wording.** "Nothing confirmed on this page" is accurate but abstract for hourly employees. "We couldn't check this page" would say the same thing plainly. Copy owners should judge; I record it only as a suggestion.
- **S-5, evidence gap.** No browser capture exists of either partial state (CR-4) in light, dark or 200%. Add one, so the warning surface's hierarchy and its Refresh action above the navigation are proven in pixels.

## Summary

All three original findings appear resolved at `bc8a5742`. UI-COM-002 and UI-COM-003 are confirmed by my own pixel inspection in three engines, and their history across runs 1–4 is consistent with the commits. CR-4 is confirmed in code and unit tests only. The new items S-1 to S-5 are advisory. The original authors decide closure.
