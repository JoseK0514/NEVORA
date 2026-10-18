# Phone search: Product Designer review

- **Initiative:** direction item 6 (A8). Reviewed: `spec.md`, `flows.md`, `visual.md`, `mockup.png` (frames A to J), the four `before-*.png` captures, `docs/product/prd-phone-search.md` and `docs/product/direction.md`.
- **Reviewed:** 2026-10-17 by the Product Designer, cycle 1 sign-off before Checkpoint 2.
- **Code checked:** `src/components/command-finder.tsx` (whole file), `src/components/app-shell.tsx:208-235`, `src/app/app/portal-gusto.css:178-181, 284-343`, `src/app/globals.css:12858`.
- **Method:** heuristic evaluation (Nielsen) and a brand-consistency check against direction §1.2. I didn't run the preview; the spec authors didn't either. Claims about rendering rest on the UI Designer's captures.

## 1. Final scorecard

| Line | Score | Reasoning |
|---|---|---|
| Usability | 2 | A manager reaches a person, place or action in two taps plus typing from any page, against three taps and a page load today |
| Familiarity | 2 | Magnifying glass top right, field on top with Close, as in Shopify, Doji and Perplexity (Mobbin links in `flows.md`) |
| Trust | 2 | The precedence fix stops "No matches." from appearing for a query the app couldn't check (`command-finder.tsx:89`), and offline gets its own line |
| Accessibility | 2 | 44px targets, 17px field, 15px floor on labels and status, `role="status"` line, focus return to the opener, forced-colours and increased-contrast rules |
| Brand distinctiveness | 1 | Neutral by design. It keeps "calm and verified" through honest status lines, and adds no new NEVORA trait |
| Durability | 2 | A system-standard search screen with no motion and no glass |
| Cost | 2 | Phone CSS, one DOM move, one exposed `open()`, one clear button. No backend |
| Continuity | 2 | Desktop look unchanged; four tabs plus More unchanged; More gains a button, not a destination |
| **Total** | **15 / 16** | No 0 on Trust, Accessibility or Usability |

**Verdict: Go,** with the three required changes in section 3 folded into the spec before slice 1 starts.

## 2. Checks

### Constants

| Constant | Kept? | Note |
|---|---|---|
| Teal for actions only | Yes | Teal sits on Close, the highlighted row (each row is a link) and focus rings. Status lines stay grey (`visual.md` §2) |
| Status ladder | Yes | Loading, unavailable and offline read as grey waiting text, not coral errors |
| Inter, Phosphor | Yes | `MagnifyingGlass`, `XCircle`; no new type |
| 44px targets | Yes | Header button, Clear, Close (56 by 44), rows 48px |
| 15px phone floor | Yes | Group labels move from 12px uppercase to 15px/600 in the phone query; detail and status 15px |
| WCAG 2.2 AA | Yes | Text 5.5:1 or more; field focus ring 4.72:1 against the inset fill; glyph on any B1 masthead at 7:1 or more |
| Script-pinned strings and ids | Yes | No script presses a finder string (PRD §7, re-checked). Dialog name, field name and trigger name stay exact |
| Navigation structure | Yes | `navigationForRole()`, `mobileTabsForRole()`, `mobileMoreForRole()` return the same lists (AC3.3) |
| Payroll and legal copy | Not touched | |
| B1 branding | Yes | Glyph uses the header ink the bell uses; 320 budget tested with the Ocean brand and a logo |

### Platforms and states

- **Platforms:** iOS Safari tab, iOS PWA, Android Chrome, Android PWA, the future store app and desktop all have a row (spec §1.2, §1.8; flows §3 per-platform table). Safe areas, Android Back, the iOS edge swipe and the hardware keyboard are each covered.
- **States:** closed, open empty, loading, results, partial, no match, unavailable, offline, role lost (403), success, page chosen offline, preview. Keyboard, screen reader, reduced motion, 200% zoom, 320px, landscape, increased contrast and forced colours each have a rule. Complete.

### Unapproved backend, legal or privacy work

None. The offline cause is a client-only value of the `Remote` type, and `/api/manager/finder` and `finder.ts` stay unchanged. "Recent searches" stays out because it would store names on a shared phone (PRD §6). Correct call.

### Things I found that the spec missed

1. **Taps in the top inset close the sheet.** The dialog closes on any click whose target is the dialog itself (`command-finder.tsx:72`). The spec puts `padding-top: env(safe-area-inset-top)` on the dialog (§1.3), so on an iPhone PWA a tap in the status-bar band hits the dialog's padding and closes search. The spec says "Tap outside: not available" (§1.8), but the code would still make it happen.
2. **The header gap.** `.mobile-header-actions` sets `gap: 8px` (`globals.css:12858`). The spec's 320 width budget and "0 gap between Search and the bell" assume no gap, but never say to remove it. Left as is, the chip loses 8px (66px becomes 58px). That still clears the 40px minimum, but the build won't match the spec.
3. **The desktop zero-diff baseline doesn't exist yet.** AC2.9 and check 1.15 compare the open dialog at 1440 against "the U10 snapshot". U10 captured 96 page views (DESIGN.MD U10), none with the finder open. The status `<p>` also moves ahead of the list in the DOM, so a snapshot that matches elements by position will report differences that aren't visible.
4. **Mock-up drift, minor.** Frame G highlights "Payroll" for the query "mar", which `rankFinder()` wouldn't return. Build from the spec's copy and state tables, not from frame contents.

## 3. Required changes before build

1. **Move the safe-area padding off the dialog.** Put `padding-top: env(safe-area-inset-top)` on `.command-finder-panel` and give the panel `height: 100%` inside the phone query, so the panel covers every pixel of the dialog. Or ignore clicks on the dialog element itself in the phone query. Add a check to slice 1: in the iOS PWA, tapping the status-bar band leaves the sheet open.
2. **State the header gap override.** Add `.mobile-header-actions { gap: 0 }` inside the phone query to spec §1.2, and keep check 1.4's chip range at 40 to 88px.
3. **Take the desktop baseline first.** Before any code change, capture the 1440 computed-style snapshot of the top bar and the open dialog in three states (empty query, typed query with results, blocked route) from the current code. Match elements by selector, not DOM index, and accept only the grid-row placement of the status line and results list as expected differences. Check 1.15 then compares against that capture.

Optional, not blocking: the offline line "People and places unavailable offline" has no full stop while the unavailable line has one. If the UX writer wants them to match, "People and places are unavailable offline." reads better. It isn't script-pinned.

## 4. Decisions for Jose at Checkpoint 2

The spec lists none, and I agree that nothing here needs Jose. For visibility:

| Item | My position |
|---|---|
| D3: desktop shows the unavailable line instead of "No matches." when the people read fails | Agree. It's a bug fix that AC4.4 already requires, and no script presses the string |
| D5: add a "Clear search" button the PRD didn't list | Agree. Phones have no Esc key, and Schedule already ships the same pattern ("Clear team search", `manager-weekly-roster.tsx:110`) |
| PRD Q3: 44px rows in the desktop finder | Agree with deferring it to a desktop pass. I'll put it on the cycle 2 list |
