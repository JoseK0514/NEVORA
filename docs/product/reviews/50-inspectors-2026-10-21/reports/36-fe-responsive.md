# 36 Frontend Engineer — responsive robustness (360–2560, zoom, split view)

**Verdict.** I found no horizontal page overflow on any of the 18 Owner routes at any width from 360 to 2560, including the zoom and split-view widths. The layout is still only tuned for 390 and 1440. Two bands are weak: 761–1099px (iPad portrait, split view, a 1440 laptop at 150% zoom), where a full 232px sidebar squeezes the content to 472–728px, and 1600px and up, where every page stops at 1,120px against the left edge and the page's own actions drift away from it. The Inbox split view also has one real bug: the detail pane doesn't stay in view.

Method: a Playwright geometry sweep with fictional data (QAOWNER, plus AUDIT-M at 911×512). I made about 260 page loads across 21 widths: 360, 414, 430, 585, 600, 678, 720, 768, 775, 834, 853, 911, 960, 981, 1024, 1180, 1280, 1366, 1920, 2149 and 2560. Zoom was emulated by setting the viewport in CSS px: 1440 at 150% = 960×600, 1366 at 150% = 911×512, 1440 at 67% = 2149×1343. I took no screenshots, so all numbers are measured `getBoundingClientRect` values.

## Recommendations

1. **Make 761–1099px a real tablet band. By default show the 80px sidebar rail (or keep the phone shell up to about 900px).**
   *Why:* content width goes down, not up, as the screen grows. It is 688px at 720 (phone shell), drops to **472px at 768**, then 538 at 834, 664 at 960 and 728 at 1024 (`.sidebar` is 232px from 761 up). As a result:
   - The Schedule week grid scrolls sideways at every width up to 1100. The `.cm-grid__scroll` clientWidth/scrollWidth is 470/860 at 768, 536/860 at 834, 662/860 at 960 (a 1440 laptop at 150%) and 726/860 at 1024.
   - Timecards hides Role and Breaks and cuts names to a 128px column at 768 ("María José Rivera Sa…" 128/295).

   With the rail collapsed (it already exists through `data-sidebar-collapsed`, `portal-design-system.css:29`), the grid fits at 1024 (878/878). At 834 it still needs 860px, so the 220px name column should also be flexible (`minmax(140px, 220px)`).
   *Impact:* High (iPad is a natural manager device). *Effort:* S–M. *Owner:* UI.

2. **Fix the Inbox detail pane so it stays on screen.**
   *Why:* `.inbox-side-column` has `position: sticky; top: 81px`, but the grid stretches it to the list's full height (908px), so the sticky rule never takes effect. At 1366×768 I scrolled to the bottom of the list and selected "Availability deadline". The URL changed and focus moved to `.inbox-detail__title`, but the title sat at **y = −181**, above the viewport, so a sighted user sees nothing happen. Add `align-self: start` and `max-height: calc(100dvh - 81px - 24px); overflow: auto`.
   At 1024 the columns are `420px 306px`, so the detail pane is narrower than the list. Use about `minmax(300px, 38%) 1fr`, or use the sheet up to 1179px.
   *Impact:* High. *Effort:* S. *Owner:* UI.

3. **Bring back the documented wide-page cap.**
   *Why:* DESIGN.MD (D1, line 1010; D6, line 1115) says that at 1920, wide pages (Home, Schedule, Insights, Timecards) hold at 1,440px and reading pages at 1,120px. The v3 build caps everything at 1,120px (`portal-premium.css:57`, `premium-desktop.css:204`). The empty space to the right of the content is:
   - 536px (28%) at 1920
   - 765px at 2149 (1440 at 67% zoom)
   - **1,176px (46%) at 2560**

   The Schedule day columns stay 128px at every width (`th` widths 220/128/128 at 1440, 1920 and 2560), and long names wrap to three lines while half the screen is blank. Apply 1440px (or `min(1600px, 100%)`) to Home, Inbox, Schedule, Timecards and Insights. Keep 1,120px and 720–752px for settings, reading and detail pages.
   *Impact:* Medium–High. *Effort:* S–M. *Owner:* UI.

4. **Keep page actions next to the content they control on wide screens.**
   *Why:* the 52px top bar spans the whole viewport, so page actions follow the right edge of the window. At 2560:
   - Schedule: the week stepper starts at x = 1756 and "Add shift" at x = 2024, but the grid ends at x = 1384, a gap of about 640px.
   - Timecards: "Export" is at x = 2036.
   - Home: "Add shift" is at x = 2038.

   Put the page-action slot (`clean/top-bar-slot.ts`) in an inner container with the same max-width as the content column. Leave search, the bell and the profile menu at the far right.
   *Impact:* Medium. *Effort:* S. *Owner:* UI.

5. **Balance the Home desktop columns.**
   *Why:* from 1024 to 2560, "Needs you" is 207–219px tall but the right column ("Working now" plus "Later today") is 520–538px. That leaves a blank area of about 310×550px under Needs you at 1440. It also pushes "Shifts today" to y = 801–1103, so the spec target "nothing below the fold at 1440" (spec.md:75) fails: the document is 1,167px tall at 1440×900.
   The approved mockup (`mockups/png/home-owner-1440.png`) puts Later today inside the Working now card. Do the same, or limit Later today to three rows, or let Shifts today fill the left column.
   *Impact:* Medium. *Effort:* S. *Owner:* UI (layout); Product (row cap).

6. **Write the responsive contract into the spec and the QA sweep.**
   *Why:* `spec.md:7` defines only 390 and 1440, and the screenshot set covers only those two sizes, which is why gaps 1–5 survived many QA rounds.
   - Define the bands: phone ≤760, tablet 761–1099 (rail), desktop 1100–1599, wide ≥1600.
   - Define the page caps: wide 1440, form/reading 1120, detail 720–752.
   - Add these widths to the regression sweep: 360, 600, 768, 834, 1024, 1180, 1920 and 2560, plus 960×600 (150% zoom).

   *Impact:* Medium. *Effort:* S. *Owner:* Product + UI.

7. **Cut down the number of breakpoints.**
   *Why:*
   - The CSS has **60 distinct width breakpoints** (from 300 to 1300px).
   - The long phone media query is pasted **82 times** in the CSS and repeated in `command-finder.tsx:16` and `timecards.tsx:90`.
   - JavaScript adds two more of its own: 1024 for the Inbox split (`manager-inbox.tsx:476`) and 1300 for the top bar (`top-bar-slot.ts:14`).

   The paired limits (760/761, 1023/1024, 1099/1100) can leave a sub-pixel gap at fractional zoomed widths, where neither rule applies. I couldn't reproduce this because an iframe rounds its width. Use named tokens (custom media through PostCSS, or one TS export) and range syntax (`width < 761px` / `width >= 761px`).
   *Impact:* Medium (drift risk). *Effort:* M. *Owner:* UI.

8. **Limit the line length of settings help text.**
   *Why:* on Payroll settings at ≥1440 the help paragraphs are 1,078px wide, about **154 characters per line** ("Provider selection records…", "Weekly and every-two-week…"). On Scheduling rules they are 886px, about 127 characters per line. Cap description text at about 68ch.
   *Impact:* Low–Medium. *Effort:* S. *Owner:* UI.

9. **Let name columns use the space they have.**
   *Why:* the label column of the Home "Shifts today" timeline cuts off "María José Rivera Sant…" at every desktop width, including 2560 with 1,176px free. The approved mockup shows the full name. The Timecards person column cuts names at 768–1024 (128 to 272px). Use `minmax(170px, 22%)`, or allow two lines with the full name in `title`.
   *Impact:* Low. *Effort:* S. *Owner:* UI.

10. **Refine the 585–760px band (foldables, iPad half split at 585/678, a desktop window at half width, 720).**
    *Why:* this band gets the phone shell stretched to 553–688px: 34px large titles, full-width rows, and sheets set to `width: 100%; max-width: none` (`premium-clean-manager.css:98`). Nothing overflows. Consider centring sheets at about 560px and limiting the length of list rows from 600px up. This needs a visual check, which I didn't do.
    *Impact:* Low. *Effort:* S. *Owner:* UI.

## What's good

- **No page overflow anywhere.** The horizontal overflow (`scrollWidth − innerWidth`) was 0 on all 18 Owner routes at every width from 360 to 2560, including the zoom and split-view widths. The few horizontal scroll areas are intentional and contained (availability chips, location pills, Payroll section tabs).
- **Zoom holds up.** At 960×600 and 911×512 the only sticky element is the 52px header. The sidebar nav scrolls inside itself (280/649, Manager 280/544), so Settings stays reachable.
- **Narrower desktops degrade cleanly.** Below 1024, Timecards drops the Role and Breaks columns instead of squeezing them. Home stacks into a single column at 768–834. Every desktop page shares one left edge (x = 264).

## Not checked / limits

- I took no screenshots, because the brief allows only one file. Judgements on empty space and imbalance come from measured geometry, not from viewing the pages.
- Browser zoom was emulated through the CSS viewport size. I didn't test real browser zoom or the sub-pixel breakpoint gap.
- I only tested Chromium, not iPad Safari, Stage Manager or WebKit.
- The Manager account was spot-checked only, at 911×512. I didn't check landscape phones, Employee or Lead pages, dark mode, or sheets and dialogs at tablet widths.
- The preview was slow under load from other reviewers. A few loads timed out or caught a loading state; I re-checked them and they don't affect any finding (for example, Payroll at 1180 measured as a skeleton the first time).
