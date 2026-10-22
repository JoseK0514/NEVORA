# 25 Accessibility Engineer (vision): contrast, text resize, reflow, text spacing and forced colours

**Verdict.** Text resize, reflow and text spacing pass: no page scrolls sideways at 320×256, and nothing new is clipped at 200% text or with the 1.4.12 spacing override. Focus rings and form-field borders also pass 3:1. What's left is mostly in Windows High Contrast (forced colours), plus a few graphics that show status with very faint colour. The v3 rebuild draws selection with `box-shadow` underlines and fills, and gives status bars a background only. Forced colours removes both, and v3's CSS (`premium-clean-manager.css`, `clean-manager/*.css`) has no `@media (forced-colors: active)` rule at all. In High Contrast, an Owner can't tell which filter, tab, sidebar page or day is selected, and the Home timeline renders empty.

Method: Playwright Chromium on the fictional preview (QAOWNER and AUDIT-M, 390 and 1440 wide). I used `emulateMedia({forcedColors:"active", colorScheme:"dark"})` and diffed computed styles of selected and unselected siblings. Contrast was computed with alpha compositing. I walked about 600 focus stops with Tab and measured each outline against the colour beside it. I tested reflow at a 320×256 viewport, which is what 400% zoom of a 1280×1024 window gives. Text size was raised by setting the root font-size to 200%, and text spacing by injecting the 1.4.12 override.

## Recommendations

1. **Add one v3 forced-colours layer for selected and current states.** On desktop, the selected-tab underline is `box-shadow: inset 0 -2px 0 #111`, and forced colours sets `box-shadow` to none. Measured in forced mode, selected and unselected siblings showed **no difference at all** in four places:
   - Schedule location tabs (`clean-manager/schedule.css:182`)
   - Timecards filter tabs (`timecards.css:187`)
   - Time off and Shift requests "Pending / Approved…" filters (`premium-clean-manager.css:418`)
   - Availability chips (`:681`)

   Inbox, Team, Notifications and Updates filters (`:450`, `:570`, `:707`) differ only by weight 500→600. Fix: in `@media (forced-colors: active)`, give `[aria-pressed=true]`, `[aria-current]`, `[aria-selected=true]` and `.selected` inside v3 tab and filter groups a real `border-bottom: 2px solid Highlight`, or `outline: 2px solid Highlight`. A `border-bottom` in normal mode would also work and survive forced colours by itself. *Impact High · Effort S · Owner UI.*

2. **Fix the current-page and selected-day cues that vanish in forced colours.**
   - **Desktop sidebar:** v3 removed the old `::before` indicator (`premium-clean-manager.css:344-345`, `content: none`). The current page now relies on a `#EDEDEB` fill, about 1.1:1 on the `#FAFAF9` sidebar, plus darker text. In forced mode the computed difference is only "background black vs transparent on black", so nothing shows.
   - **Phone week-day picker:** the selected day is a filled circle (`schedule.css:71-72`). That fill disappears, and the selected day and today are both bold, so they can't be told apart. The 5px "has shifts" dots (`schedule.css:74`) also vanish: 7 of 7 were lost on the Schedule page at 390.
   - **Fix:** in forced colours, set `.sidebar .nav-link.active { border-inline-start: 3px solid Highlight }` (or an outline). Set `.cm-week__day[aria-pressed=true] > b { forced-color-adjust: none; background: Highlight; color: HighlightText }`, and give the dots `background: CanvasText`.

   *Impact High · Effort S · Owner UI.*

3. **Home "Shifts today" timeline: make each status visible without relying on faint colour.** Three statuses are drawn with colour alone:
   - "No clock-in" is a white bar with a 1px `#E5958A` inset outline, **2.3:1** (`premium-clean-manager.css:56`).
   - "Later today" is a `#E4E4E1` fill, **1.27:1** on white (measured, `:57`).
   - Status words exist only as `sr-only` text (`src/components/premium-home.tsx:271`), and the legend is `aria-hidden` (`:279`).

   In forced colours, all bars, the now-line and the legend swatches disappear (6 bars and 3 swatches lost, measured), leaving names next to an empty track. Fix:
   - "No clock-in": a 2px `#D70015` border, or a hatched pattern.
   - "Later today": a fill with a ≥3:1 border, such as `#8A8A87`.
   - Forced colours: `border: 1px solid CanvasText`, with dashed for "No clock-in".
   - Consider a short visible red "No clock-in" label on that row, since it is the exception the Owner must act on.

   *Impact High · Effort S–M · Owner UI.*

4. **Phone badges and tiles use iOS system red and orange under white, which fail contrast.**
   - The tab-bar count badge is white 13px/400 on `#FF3B30`, **3.55:1**, below the 4.5:1 text minimum (`premium-clean-manager.css:228`). Desktop `.nav-count` uses `#D92D20` and passes at 4.83.
   - The phone "review" tile is a white glyph on `#FF9500`, **2.2:1** (`:29`). The "done" tile, white on `#34C759`, is about 2.2:1 too.
   - Earlier QA never measured these: `scratchpad/tools/contrast.mjs` skips `.mobile-nav-count`, `.nav-count` and `.nv-avatar`.
   - Fix: use the existing tokens `--cm-red #D70015` (about 5.4:1 with white) and `--cm-orange #C93400` (about 5.3:1) for the badge and tile backgrounds, and a darker green for "done".

   *Impact Medium · Effort S · Owner UI.*

5. **Give the phone segmented controls a selected state that doesn't rely on a faint pill.** The selected segment is a white pill on a 12% grey track, **1.27:1** (shadow 1.31), plus weight 500→600 (`premium-clean-manager.css:207`, `:259`, `:298`, `:562`, `:613`; `schedule.css:94`). It is used on Inbox, Team, Timecards, Insights, Notifications, Updates, Time off and Availability at 390. In forced colours only the weight change is left. Fix: add a ≥3:1 hairline to the selected pill, such as `#8E8E93` (about 3.3:1), or tint the selected label. In forced colours, use `outline: 2px solid Highlight`. *Impact Medium · Effort S · Owner UI.*

6. **Insights chart: make it readable in forced colours and at 200% text.**
   - Bars have a background fill only (`clean-manager/insights.css:189`), so they disappear in forced colours.
   - Axis labels are fixed at 11px "on purpose" (`insights.css:222`) and don't grow with 200% text.
   - The values list is `nv-sr` (visually hidden), so a sighted low-vision user has no enlarged alternative.
   - Fix: in forced colours, use `forced-color-adjust: none; background: CanvasText` on the bars. Add a visible "Show as list" disclosure that reveals the existing per-day list.

   *Impact Medium · Effort S–M · Owner UI.*

7. **Give the Notifications search field a visible boundary.** Its only boundary is a grey fill: **1.14:1** at 390 and **1.30:1** at 1440 against the page, with no border (`clean-manager/notifications.css:14-15`). Fix: add a 1px border of ≥3:1 (for example `#8A8A8E`), or a ≥3:1 bottom rule. Form fields on Add shift and New employee already pass. *Impact Low–Medium · Effort S · Owner UI.*

8. **Add forced-colours and non-text checks to the QA harness so this doesn't come back.** The checks would:
   - Emulate `forcedColors:"active"`.
   - Diff computed styles of `[aria-pressed|current|selected]` against a sibling and fail on "no difference".
   - List text-free elements whose only paint is a background or `box-shadow`.
   - Measure badges, which the contrast probe currently skips.

   The probes I ran this session can be the starting point. *Impact Medium · Effort S · Owner UI.*

9. **At 400% zoom (320×256), the review screens keep only about 46% of the screen for content.** On Time off review, the fixed action bar (y 118–192) plus the fixed tab bar (y 191–256) leave 118px of the 256px viewport. On Scheduling rules, the sticky action bar plus the tab bar leave 114px. The short-height rule exists only for `pointer: coarse` landscape, so desktop zoom users with a mouse don't get it. Fix: under `(max-height: 420px)`, whatever the pointer type, hide the tab bar while an action bar is shown, or let the action bar scroll with the page. *Impact Low–Medium · Effort S · Owner UI.*

10. **Show the full organisation name somewhere when it's cut off at 200% text.** At 200% text on desktop, the sidebar `.cm-org__name` ("Northside QA Workf…") is cut off with an ellipsis on every page, and María José Rivera is cut off in the Home timeline and Timecards. Show the full text in a tooltip or `title`, or let it wrap to two lines. *Impact Low · Effort S · Owner UI.*

## What's good
- **Reflow and text spacing pass.** None of the 20 Owner and 4 Manager pages scrolls sideways at 320×256. The 1.4.12 spacing override caused **zero** new clipping on 16 pages at both widths: the only clipped elements were screen-reader-only. At 200% root text there is no horizontal overflow on any of 16 pages at either width.
- **Focus rings pass.** The 2px `#087571` outline was ≥3:1 at every one of about 600 Tab stops across 7 pages at both widths. All rings are drawn with `outline`, so they survive forced colours. Form-field borders and the native accent-colour checkboxes pass 3:1.
- **Some state cues don't rely on colour.** The phone tab bar switches to a *filled* icon for the current tab, which is a real non-colour cue: tint and grey differ by only 1.01:1 in luminance. The desktop Inbox selected row keeps a `Highlight` edge in forced colours (`premium-desktop.css:133-135`).

## Not checked / limits
- **Forced colours was emulated, not tested on Windows.** I used Chromium's emulation with a dark scheme, not real Windows High Contrast or other themes. I took no forced-colours screenshots, because the brief allows writing only this file, so the findings come from computed styles.
- **Pages and states not covered:** Employee and Lead pages, dark mode, WebKit and Firefox, and phone landscape.
- **Not opened:** popovers and sheets (More menu, inbox sheet, date pickers), and loading, error and empty states.
- **Missing fictional data:** the Insights chart had 0h data, so I verified bar loss from the CSS rather than from rendered bars. The setup ring (a conic gradient, which forced colours removes) wasn't present for this account.
- **Zoom was approximated:** browser zoom by the viewport size, and text-only zoom by the root font-size.
