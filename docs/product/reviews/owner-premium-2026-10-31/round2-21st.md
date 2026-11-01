# Owner premium, round 2: 21st.dev patterns vs NEVORA Owner screens (Oct 31)

Reviewer: Claude, `21st:21st-ui` skill in explore and review modes only. Nothing was installed, nothing was generated, and no app code changed. `get_usage` reported `aiGenerationEnabled: false` and a paid retrieval tier with no daily cap. I used `search` and `get_inspiration` (free) and read the source of 12 catalog components with `get_component` so the values quoted below are exact. Reading source is not installing and costs no credits.

**What was captured (fictional preview, QAOWNER, light theme, viewport only, reduced motion on):**

- Desktop 1440x900, Chromium: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/chromium-QAOWNER-light-1440x900/` (`app-0.png`, `app_schedule-0.png`, `app_timecards-0.png`, `app_payroll-0.png`, `app_employees-0.png`, `app_more-0.png`, `app_settings-0.png`, `report.json`)
- Phone 390x844, WebKit: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/webkit-QAOWNER-light-390x844/` (same file names)
- Phone contact sheets: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/sheet-mobile-a.png` (Home, Schedule, Timecards, Payroll) and `sheet-mobile-b.png` (Team, More, Settings)
- Zoomed crops: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/zoom/` (`tc-table.png`, `sched-grid.png`, `pay-banner.png`)
- Opened states (Chromium): `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/click/` (`sched-locations-390.png` is the Location sheet, `find-cover-390.png` is Find cover, `prepare-1440.png` is Prepare payroll; `sheet-click.png` combines the two phone captures)

Probe results from `report.json`: no horizontal overflow on any route, and the only non-Phosphor SVG is the wordmark. The phone's only sub-44px target is a 1x44 hidden "Apply search" submit on Team. On desktop the sidebar rows are 36px tall, which is acceptable for a pointer. The type sizes in use are 11, 13, 15, 17, 20 and 22. Off-scale sizes also appear: 12px and 14px in the desktop top bar (search keycap and label) and 9px in the lockup, which is intended.

## Read this first: what 21st.dev can and cannot give NEVORA

Most of the 21st catalog targets marketing and SaaS dashboards. It leans on coloured stat cards, count-up numbers, pulsing status dots, glow, backdrop blur, sparklines and staggered entrances, and the approved look bans all of these. I used the catalog the way Gusto would. From each reference I took only the craft details: track and thumb shadows, motion curves, table rhythm, how a sheet's scrim follows a drag, single-slot validation and layout-stable loading. I left out the decoration.

**NEVORA already matches or beats the best references here.** The kit's sheet curve `cubic-bezier(.32,.72,0,1)` is the exact curve coss.com's Drawer uses. Its skeleton waits 120ms before showing, which is Skeleton Swap's default. The toaster pauses on hover and focus, and taps go through 44px hit areas with pressed states. The gains left are in **calm** (one red, one teal action per screen), **continuity** (indicators that slide instead of jumping) and **table and grid rhythm**.

**Rejected outright as anti-references:**

| Reference | Why it's out |
|---|---|
| sean0205 Statistics Card 2 | Coloured cards with decorative SVG shapes |
| ravikatiyar162 Card | Count-up value animation |
| diceui Status | Pulsing dot status |
| ai2 Styled Badges | Glow and gradient badges |
| cult-ui Halo Toggle Group | Frosted track |
| ayushmxxn Tubelight Navbar | Glow and frosted glass |
| arunachalam Bottom Nav Bar | Pill tabs whose labels animate in and out |
| coss.com Drawer | Its `backdrop-blur-sm`. The rest of this component is a good reference |
| cnippet Empty | Its rotated icon tiles. The rest of this component is a good reference |

---

## 1. Dashboard summary cards

**References**
1. **sean0205 Statistics Card 2** (https://21st.dev/@sean0205/components/statistics-card-2). I took the card shell only and rejected the colour. Header `min-h-14` (56px), `px-5`, hairline under it. The value is followed by a context line ("Vs last month: …") at 12px, separated by `border-t` with `pt-2.5`. The pattern worth borrowing is that a number always comes with a context line, not a trend arrow.
2. **olewandowski1 Welcome Checklist Card** (https://21st.dev/@olewandowski1/components/onboarding-1). The progress line reads "Setup progress … **1** of 3" in `tabular-nums`, with both numbers at the same size, which satisfies Rule 4. The checklist uses `py-4` rows with full-bleed separators.
3. **uvain Charts & KPI Cards** (https://21st.dev/@uvain/components/revenue-charts-kpi). This comes from the catalog description only; I did not read the source. Each KPI knows whether "up" is good, and each chart ships a hidden data table for screen readers.

**NEVORA now.** Home's "Today" card has three stats. "Clocked in" reads **0 of 1** in ink at 17/600, "No clock-in" reads **1** in red, and "Open shifts" reads **3** in **amber #8A4B00**. The stats are not links. On the phone the same strip sits above the shift row and "Find cover".
- Desktop: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/chromium-QAOWNER-light-1440x900/app-0.png`
- Phone: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/webkit-QAOWNER-light-390x844/app-0.png`

Amber is a status colour, which the Oct 23 rule bans. The stat cells look tappable but do nothing.

**Adaptation (kit)**
```css
/* corp.css: a stat can be a link; amber retires; an optional 13px context line */
:is(#c-root, html) a.c-stat { display: block; color: inherit; transition: background-color var(--c-dur-press) ease-out; }
@media (hover: hover) { :is(#c-root, html) a.c-stat:hover { background: #F7F8F8; } }
:is(#c-root, html) a.c-stat:active { background: #EDEEEF; transition: none; }
:is(#c-root, html) .c-stat__value--amber { color: var(--c-ink); }            /* deprecate */
:is(#c-root, html) .c-stat__ctx { display: block; margin-top: 2px; font-size: 13px; line-height: 18px; color: var(--c-grey); }
```
```html
<a class="c-stat" href="/app/schedule?open=1">
  <span class="c-stat__label">Open shifts</span><span class="c-stat__value">3</span><span class="c-stat__ctx">this week</span>
</a>
```
The red value on "No clock-in" stays, because it is the screen's one red. **Fits the approved look.** It removes a colour and adds no decoration.

## 2. List rows with status

**References**
1. **uiable List Group Badge** (https://21st.dev/@uiable/components/list-group-badge). A count badge sits at the trailing edge, one per row, and the label never wraps.
2. **bundui Item List with Actions** (https://21st.dev/@bundui/components/item7). Each row has an avatar, a two-line text block and one trailing action, grouped in a single card.
3. **serafimcloud Status Badge, inspired by Tremor** (https://21st.dev/@serafimcloud/components/status-badge). This is an anti-reference for the dot. It shows why a status sits better as trailing text than as a coloured chip.

**NEVORA now.** On desktop, Team, Payroll and Settings rows are already text-first and on benchmark. The phone Schedule "Today" list is the loudest list in the product (`/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/webkit-QAOWNER-light-390x844/app_schedule-0.png`):
- **Red appears three times on one row:** a red ring around the row (`.c-row--open`), red "Open shift" text and a red dashed "+" avatar.
- **Teal "Find cover" repeats three times** in the same list.
- **The detail wraps:** "Barista · / Condado" breaks over two lines, which breaks the zero-tolerance wrap rule.
- **"No clock-in" is a grey pill.**

**Adaptation**
```css
/* the open-shift emphasis without a box: no ring, no dashed avatar; one red text line on the urgent row only */
:is(#c-root, html) .c-row--open { box-shadow: none !important; margin: 0; width: 100%; padding: 8px 16px; border-radius: 0; }
:is(#c-root, html) .c-av--open { border: 1.5px dashed var(--c-field); color: var(--c-ink2); }
:is(#c-root, html) .c-row__detail--urgent { color: var(--c-red); }             /* "Starts now · not covered" */
:is(#c-root, html) .c-row__detail { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }  /* one line, always */
```
Markup changes:
- Only the first row that is not covered carries the teal "Find cover" link. The other open rows end in a chevron that opens the shift.
- "No clock-in" becomes trailing 13px grey text (`.c-row__value--soft`), not a pill.
- When one location is filtered, leave the location out of the detail line.

**Fits.** It enforces the existing rules: one red, one teal action, no pills.

## 3. Segmented controls

**References**
1. **ddoemonn Segmented Control** (https://21st.dev/@ddoemonn/components/segmented-control), source read:
   - Track: `rounded-[9px]`, `p-[3px]`, 1px border, `shadow: inset 0 1px 2px rgba(28,25,23,.07)`.
   - Thumb: one element, `rounded-[6px]`, `shadow: 0 1px 2px rgba(28,25,23,.28)`. It moves on a spring (stiffness 520, damping 34, mass 0.45) and jumps without animation under reduced motion.
   - Labels: 13/18, weight 500, `tracking -0.01em`, `py 7 px 12`.
   - Accessibility: `role="radiogroup"` with roving `tabIndex`, plus arrow, Home and End keys.
2. **halaska-studio Segmented Control** (https://21st.dev/@halaska-studio/components/segmented-control). An iOS-style sliding thumb.
3. **adobe CSS Segmented Control** (https://21st.dev/@adobe/components/css-segmentedcontrol). A CSS-only animated thumb, so no motion library is needed.

**NEVORA now.** `.c-seg` is a 36px `#EDEEEF` track with radius 8. Each segment draws its own white `::before`, so the selection **jumps** with no travel and there is no track inset. Timecards' "This week / Last week / Earlier" is 480px wide on desktop.
- Zoom: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/zoom/tc-table.png`
- Phone: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/webkit-QAOWNER-light-390x844/app_timecards-0.png`

**Adaptation.** `CorpSegments` sets `style="--n:3; --i:<current index>"`.
```css
:is(#c-root, html) .c-seg { position: relative; box-shadow: inset 0 1px 2px rgba(26, 28, 30, .06); }
:is(#c-root, html) .c-seg::before { content: ""; position: absolute; top: 2px; bottom: 2px; left: 2px; width: calc((100% - 4px) / var(--n, 2));
  border-radius: 6px; background: #FFFFFF; box-shadow: 0 1px 2px rgba(0, 0, 0, .08), 0 0 0 .5px rgba(0, 0, 0, .04);
  transform: translateX(calc(100% * var(--i, 0))); transition: transform var(--c-dur-ui) var(--c-ease); pointer-events: none; }
:is(#c-root, html) .c-seg > :is(a, button)::before { display: none; }            /* the per-segment shape retires */
:is(#c-root, html) .c-seg > :is(a, button) { transition: color var(--c-dur-press) ease-out; }
@media (prefers-reduced-motion: reduce) { :is(#c-root, html) .c-seg::before { transition: none; } }
```
Segments that are links must keep the control mounted across the route change (put it in the section layout), or the thumb cannot travel. Keep `aria-current` as it is. **Fits.** There is no colour change and the motion is 200ms on the kit curve.

## 4. Bottom sheets and action menus

**References**
1. **coss.com Drawer** (https://21st.dev/@coss.com/components/drawer), source read:
   - Motion: 450ms on `cubic-bezier(.32,.72,0,1)`.
   - Scrim: `bg-black/32` at `opacity: calc(1 - var(--drawer-swipe-progress))`, so the scrim fades **as you drag**.
   - Dismiss: `duration: calc(var(--drawer-swipe-strength) * 400ms)`, so a fast fling closes faster.
   - Shape: `rounded-t-2xl` (16px). The drag bar is 48x4 inside a 12px pad. The footer clears `env(safe-area-inset-bottom) + 16px`.
   - Menu inside the drawer: items `min-h-9` (36px) and 32px on wide screens; separator `mx-2 my-1`; group label 12px muted `px-2 py-1.5`.
   - Leave out its `backdrop-blur-sm`.
2. **hero_ui Dropdown** (https://21st.dev/@hero_ui/components/heroui-dropdown). Sections with headers, item descriptions, `Kbd` shortcuts, a danger variant and typeahead (React Aria).
3. **shadcn-style DropdownMenu**, as shipped with sean0205's card registry (source read):
   - Panel: `p-2`, `rounded-md`, `shadow-md shadow-black/5`, 1px border.
   - Items: `px-2 py-1.5 rounded-md gap-2`, with icons at opacity .6.
   - Separator: `-mx-2 my-1.5`.
   - Enter: fade, zoom from 95% and a 2px slide from the trigger side.

**NEVORA now.** The phone Location sheet is on par with coss (`/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/click/sched-locations-390.png`). It has a 16px top radius, a 36x5 handle, a centred 17/600 title with teal "Close", a teal Phosphor check and the kit's 360ms in and 240ms out on the same curve. Two gaps remain: the scrim does not follow the drag, and the close speed ignores fling velocity. I did not open the desktop "…" and account menus in this round.

**Adaptation**
- `SheetGestures` writes `--sheet-drag` (0 to 1 over the sheet's height) and `--fling` (0.5 to 1 from release velocity).
```css
:is(#c-root, html) dialog.q-sheet::backdrop { background: rgba(0, 0, 0, .32); opacity: calc(1 - var(--sheet-drag, 0)); }
:is(#c-root, html) dialog.q-sheet[data-closing] { transition-duration: calc(var(--c-dur-sheet-out) * var(--fling, 1)); }
/* desktop popover menu */
@media (min-width: 768px) {
  .nevora-action-menu-popover { padding: 4px; border-radius: 10px; background: #FFFFFF; box-shadow: 0 0 0 1px #E3E5E6, 0 8px 24px rgba(16, 24, 40, .08);
    transform-origin: var(--origin, top right); animation: c-pop-in 160ms var(--c-ease) both; }
  .nevora-action-menu-popover :is(a, button) { min-height: 36px; padding: 0 10px; border-radius: 6px; font: 400 15px/20px Inter, sans-serif; }
  .nevora-action-menu-popover :is(a, button):hover { background: #F5F6F6; }
  .nevora-action-menu-popover hr { height: 1px; margin: 4px -4px; border: 0; background: #EDEEEF; }
}
@keyframes c-pop-in { from { opacity: 0; transform: translateY(-4px) scale(.98); } }
```
**Fits.** No blur, and the shadow is one soft layer plus the kit ring.

## 5. Empty states

**References**
1. **cnippet-dev Empty** (https://21st.dev/@cnippet-dev/components/cnippet-empty), source read:
   - Layout: `gap-6`, `px-6`, `py-12` that grows to `md:py-20`, `text-balance`.
   - Header: `max-w-sm` (384px). The description sits `mt-1` under the title.
   - Leave out the stacked, rotated icon tiles.
2. **serafimcloud Empty State** (https://21st.dev/@serafimcloud/components/empty-state). An empty-state card with paired buttons.
3. **uiable Empty Background** (https://21st.dev/@uiable/components/empty-background). A muted surface with a title, description and one refresh action.

**NEVORA now.**
- **Find cover** (`/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/click/find-cover-390.png`). "No one is free for this shift" offers **two** actions: an outline "Add shift for someone" button and a teal "Change coverage needs" link.
- **Timecards** (`/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/zoom/tc-table.png`). "None approved yet" sits above an **empty 0% progress bar**.
- **Kit.** `.c-empty--card` is close already: 32px padding, a 15/600 line, a 13px line and one action.

**Adaptation**
```css
:is(#c-root, html) .c-empty__body { text-wrap: balance; }
@media (min-width: 768px) { :is(#c-root, html) .c-empty--card { padding: 48px 24px; } }
```
- **Find cover:** keep one action. "Change coverage needs" moves to the page's "…" menu.
- **Timecards:** render the progress bar only when at least one card is approved. At zero, the card is just "None approved yet" with "Approvals open after Sunday, Nov 1" under it.

**Fits.** No illustration.

## 6. Skeleton loaders

**References**
1. **ddoemonn Skeleton Swap** (https://21st.dev/@ddoemonn/components/skeleton-swap), source read:
   - Timing: `delay 120ms`, then **`minVisible 380ms`**, so a skeleton that has appeared never flickers off.
   - Layout: a reserved box, so nothing shifts.
   - Bars: 9px tall with radius 5 on a 21px line, widths 100/93/97/88/95/91% and the last line at 62%.
   - Swap: content crossfades in on a spring (stiffness 260, damping 34, mass 0.8) from opacity 0 and scale .99. It also blurs, which should be left out.
   - Accessibility: `aria-busy` plus an sr-only "loaded" status.
2. **cnippet-dev Settings Page Skeleton** (https://21st.dev/@cnippet-dev/components/v-skeleton-10). A page-shaped skeleton: header, action, tab row and grouped rows.
3. **vijayksingh Skeleton** (https://21st.dev/@vijayksingh/components/skeleton). Block, line and circle placeholders that fade into the content.

**NEVORA now.** The kit's `.c-skel` waits 120ms, fades in over 160ms and is page-shaped, which is the same idea. It has no minimum visible time and no crossfade into content. Its bars are 12px and 10px at 46% and 68%. **I did not capture this live.** The preview loads too fast to see the skeleton, so this is a gap.

**Adaptation**
- In the loading boundary, keep the skeleton for at least 380ms once it has shown.
- Mark `main` with `aria-busy="true"` while loading.
```css
:is(#c-root, html) .c-page.c-page--from-skel { animation: c-in 200ms var(--c-ease) both; }   /* only after a skeleton showed */
@keyframes c-in { from { opacity: 0; } }
:is(#c-root, html) .c-skel__row > span > b { height: 10px; border-radius: 5px; }  /* bars on the 15/20 rhythm */
@media (prefers-reduced-motion: reduce) { :is(#c-root, html) .c-page.c-page--from-skel { animation: none; } }
```
**Fits.**

## 7. Data tables for timecards

**References**
1. **originui Table** (https://21st.dev/@originui/components/table), source read:
   - Header: `th` at `h-12` (48px), `px-3`, weight 500, muted.
   - Cells: `td` at `p-3`. Rows have `border-b`, `hover:bg-muted/50` and `data-[state=selected]:bg-muted`, and the last row has no border.
   - **Footer:** `tfoot` has a `border-t`, weight 500 and a transparent background, with a right-aligned **Total** row.
2. **ephraimduncan Data Table** (https://21st.dev/@ephraimduncan/components/table-05). Sortable columns, search, a per-row actions menu and pagination (from the description).
3. **theshanelevine Records Table** (https://21st.dev/@theshanelevine/components/records-table). A sticky first column and a calculations footer. Leave out its coloured tag chips.

**NEVORA now** (`/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/chromium-QAOWNER-light-1440x900/app_timecards-0.png`):
- The table has a grey header band and four columns: Person, Recorded, Breaks, Status. Numbers are right-aligned and tabular, which is good.
- There is **no total** and no "Scheduled" column to compare against.
- "Export time" and "Time corrections" are link rows **inside the table card**.
- The page stacks **two tab systems**: the week segmented control, then All, Need review and Approved as underline tabs.

**Adaptation**: a kit `.c-table`.
```css
:is(#c-root, html) .c-table { width: 100%; border-collapse: separate; border-spacing: 0; font-variant-numeric: tabular-nums; }
:is(#c-root, html) .c-table th { position: sticky; top: 0; z-index: 1; height: 40px; padding: 0 16px; background: #FFFFFF; box-shadow: inset 0 -1px 0 var(--c-line);
  font-size: 13px; line-height: 18px; font-weight: 600; color: var(--c-grey); text-align: left; white-space: nowrap; }
:is(#c-root, html) .c-table td { height: 52px; padding: 0 16px; box-shadow: inset 0 -1px 0 var(--c-line); font-size: 15px; line-height: 20px; }
:is(#c-root, html) .c-table :is(th, td).c-num { text-align: right; }
@media (hover: hover) { :is(#c-root, html) .c-table tbody tr:hover { background: #F7F8F8; } }
:is(#c-root, html) .c-table tfoot td { font-weight: 600; box-shadow: inset 0 1px 0 var(--c-ring); }
```
- **Columns:** Person, Scheduled, Recorded, Breaks, Status. Add a footer row: "Total · 24 h 7 min".
- **Actions:** move Export to the title row as the one secondary button, and Time corrections to "…".
- **Tabs:** the week control could become the Schedule-style "‹ Oct 26 – Nov 1 ›" stepper. Gusto uses this, and it would leave one tab system per page.

**Fits.**

## 8. Week schedule grids

**References**
1. **cnippet-dev Weekly Availability Checkbox Grid** (https://21st.dev/@cnippet-dev/components/v-checkbox-11). A day-by-slot grid with a header row and a live selected count.
2. **bidyut10 Booking Slot Calendar** (https://21st.dev/@bidyut10/components/booking-slot-calendar). A week strip, then that day's slots. This is the same model as NEVORA's phone day picker.
3. **sean0205 Week Number Calendar** (https://21st.dev/@sean0205/components/week-number-calendar). The week shown as a leading column.

No 21st component is a real person-by-day roster. NEVORA's grid is ahead, so only micro-details transfer.

**NEVORA now.**
- Desktop: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/chromium-QAOWNER-light-1440x900/app_schedule-0.png`
- Zoom: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/zoom/sched-grid.png`

Findings:
- The week bar and the grid are **two separate cards**.
- The "Open shifts" row leads with a **red-tinted icon tile**, which is banned.
- Open-shift stacks are **vertically centred**, so Wed's three chips start lower than Mon's four and the tops are ragged.
- Past open chips are faded outlines while assigned chips are teal-tint fills.
- Today is marked only by the teal "31" badge in the header.

**Adaptation**
```css
.c-week { /* one card: the week bar is the card head */ }
.c-week__bar { display: flex; align-items: center; gap: 8px; height: 52px; padding: 0 8px 0 4px; box-shadow: inset 0 -1px 0 var(--c-line); }
.c-week__cell { align-content: start; }                                      /* chip stacks share a top edge */
.c-week__chip--open { background: #FFFFFF; box-shadow: none; border: 1px dashed var(--c-field); color: var(--c-ink2); }
.c-week__col--today { background: #FAFBFB; }                                 /* whole column, header label teal 600, no filled circle on desktop */
.c-week__head, .c-week__person { position: sticky; }                         /* top and left on tablet-width scroll */
```
Remove the icon tile so the row reads "Open shifts" with "24 this week" under it. **Fits.** It removes a colour tile and a card.

## 9. Settings lists

**References**
1. **sean0205 Switch List Card** (https://21st.dev/@sean0205/components/c-switch-6), source read. A card with `p-0`, rows at `px-4 py-3` with the label and switch `justify-between`, and full-bleed 1px separators.
2. **uiable List Group Links** (https://21st.dev/@uiable/components/list-group-links). A bordered card of links with active and disabled states.
3. **cnippet-dev Settings Page Skeleton** (https://21st.dev/@cnippet-dev/components/v-skeleton-10). The grouped-rows layout.

**NEVORA now.** This is on benchmark:
- Grouped cards with a 44px section label row.
- 52px rows, trailing values in grey ("2", "Set up", "2 need setup") and 16px chevrons.
- Desktop: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/chromium-QAOWNER-light-1440x900/app_settings-0.png`
- Phone: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/sheet-mobile-b.png`

**Adaptation (low priority)**
- Drop the section label row to 36px so it reads as a label, not a row: `.c-card__head--label { min-height: 36px; }`.
- On desktop only, Gusto's two-pane settings (a section list on the left and the page on the right) would end the round trip back to the hub. This is structural, so it needs Jose.

**Fits.**

## 10. Form layouts and validation

**References**
1. **ai2 Field Validation** (https://21st.dev/@ai2/components/field-validation), source read:
   - Label to control gap: 6px.
   - Both help and message are wired into `aria-describedby`.
   - `aria-invalid` is set on the control for errors only. Warnings carry a tone without `aria-invalid`.
   - The message row is 12–13px.
2. **ddoemonn Inline Validation** (https://21st.dev/@ddoemonn/components/inline-validation). The hint and the error **crossfade in one slot**, so the form never jumps.
3. **coss.com Field** (https://21st.dev/@coss.com/components/field). Field validity tracking on Base UI, with required and disabled states.

**NEVORA now.** The kit already matches the craft:
- 13/600 label, 6px gap, 48px field, 2px teal focus ring and 2px red invalid ring.
- 13/18 red message, and 16px fields on phones so iOS never zooms.

**I did not open a form in this round**, so this is a gap. Prepare payroll is a list, not a form.

**Adaptation**
```css
:is(#c-root, html) .c-field__msg { min-height: 18px; font-size: 13px; line-height: 18px; color: var(--c-grey); transition: color var(--c-dur-press) ease-out; }
:is(#c-root, html) .c-field__msg[data-error] { color: var(--c-red); }       /* help text and the error share this one slot */
```
Wire `aria-describedby` to the slot. Validate on blur and on submit, and clear the error on input. Add no icons, because of the icons rule. **Fits.**

## 11. Notification and inline banners

**References**
1. **uiable Alert Action** (https://21st.dev/@uiable/components/alert-action), source read:
   - White background, 1px border, radius 8, padding 16.
   - An icon at left 16 and top 16, with the text indented 28px.
   - Title weight 500, `leading-none`, `mb-1`. A small action button sits in its own slot.
2. **serafimcloud Banner** (https://21st.dev/@serafimcloud/components/banner). A shadcn-format page banner.
3. **cnippet-dev Toast** (https://21st.dev/@cnippet-dev/components/toast). Stacked toasts on Base UI with auto-dismiss and an action. NEVORA's `toaster.tsx` already does this well (Sonner-style, pauses on hover and focus).

**NEVORA now.** The Payroll overdue banner is **all red**: a `#FDECEA` fill, a red title, a red body and a red underlined "Start with Sep 21 – 27" link.
- Zoom: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/zoom/pay-banner.png`
- Phone: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/webkit-QAOWNER-light-390x844/app_payroll-0.png`

It shows again on Prepare payroll (`/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/click/prepare-1440.png`), directly above a "Periods with no payroll" card that says the same thing. That page also has five teal actions and no filled primary. Its header link "Choose dates" overhangs the card's 16px content edge by 8px (it ends at x=1052, the other actions at 1044).

**Adaptation**
```css
:is(#c-root, html) .c-callout--red { align-items: center; padding: 12px 16px; border-radius: 12px; background: #FFFFFF; color: var(--c-grey);
  box-shadow: inset 0 0 0 1px var(--c-ring); }
:is(#c-root, html) .c-callout--red b { color: var(--c-red); }                /* the screen's one red */
:is(#c-root, html) .c-callout__action { margin-left: auto; }                 /* a .c-btn--neutral, not an underlined link */
```
- **Optional:** a 3px inset left rule (`inset 3px 0 0 var(--c-red)`), as Gusto and Carbon use. Jose decides whether that counts as decoration.
- **Prepare payroll:** drop the banner.
- **Choose dates:** use the in-header `.c-link` margins (`-13px -8px`), not `.c-link--l`.

**Fits.** It cuts red from four elements to one.

## 12. Tab bars and sidebars

**References**
1. **wensity Sidebar** (https://21st.dev/@wensity/components/sidebar). Collapses to an icon rail, with sections, badges, a user footer and an **animated active item** (from the description).
2. **starc007 Animated Sidebar** (https://21st.dev/@starc007/components/animated-sidebar). An icon rail on desktop and a focus-managed sheet on phones.
3. **cnippet-dev Underline Tabs** (https://21st.dev/@cnippet-dev/components/v-tabs-2) and **coss.com Tabs**, underline variant (https://21st.dev/@coss.com/components/tabs). An underline indicator that slides between tabs. I took this from the descriptions; the indicator code was not in the payload.
4. **shadcnui-blocks Mobile Navigation Tabs** (https://21st.dev/@shadcnui-blocks/components/tabs-08). A plain icon-over-label bottom bar, which is what NEVORA already has.

**NEVORA now.**
- **Sidebar:** 36px rows at 15/500, tint `#E6F1EF` with a teal active row and a teal count. It switches instantly.
- **Payroll's section tabs and Timecards' filter tabs:** a 2px underline that also jumps.
- **Phone tab bar:** 56px, 11px labels, the current tab teal with a filled icon. This is good.
- Desktop: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-21st/cap/chromium-QAOWNER-light-1440x900/app_payroll-0.png`

**Adaptation**: one moving indicator per tab row.
```css
.c-tabs { position: relative; }
.c-tabs::after { content: ""; position: absolute; bottom: 0; left: 0; height: 2px; width: 1px; background: var(--c-ink);
  transform: translateX(var(--x, 0)) scaleX(var(--w, 0)); transform-origin: 0 0; transition: transform var(--c-dur-ui) var(--c-ease); }
@media (prefers-reduced-motion: reduce) { .c-tabs::after { transition: none; } }
```
- A tiny client hook measures the current tab and sets `--x` and `--w`.
- The sidebar gets the same treatment vertically (`--y`, with the 36px tint as the moving shape).
- Leave the tab bar as it is. **Fits.**

## 13. Subtle motion (press, sheet, list)

**References**
1. **rmahammad Animated List** (https://21st.dev/@rmahammad/components/animated-list), source read:
   - Enter from `opacity 0, y 10`. Exit to `opacity 0, y -8, scale .98`.
   - 260ms on `ease [0.2, 0, 0, 1]`, with layout `"position"` for reorders.
   - Instant under reduced motion. It also staggers 60ms, which should be left out for a calm page load.
2. **motiondotdev Exit animation** (https://21st.dev/@motiondotdev/components/motion-exit-animation). AnimatePresence exit from the official Motion examples.
3. **ddoemonn Segmented Control** (see 3). Spring travel for a selection.

**NEVORA now.** Press states (120ms), sheets (360ms in, 240ms out) and the skeleton fade are in place. **List changes jump.** Approving a timecard or finishing a to-do removes its row instantly and the rows below snap up. This was not captured as motion, because the captures run with reduced motion; it comes from reading the CSS.

**Adaptation** (CSS only, no new dependency)
```css
@media (prefers-reduced-motion: no-preference) {
  :is(#c-root, html) .c-rows > li { interpolate-size: allow-keywords; }
  :is(#c-root, html) .c-rows > li[data-leaving] { overflow: hidden; animation: c-row-out 200ms var(--c-ease) forwards; }
  :is(#c-root, html) .c-rows > li[data-new] { animation: c-row-in 200ms var(--c-ease) both; }
}
@keyframes c-row-out { to { opacity: 0; height: 0; min-height: 0; padding-block: 0; } }
@keyframes c-row-in { from { opacity: 0; transform: translateY(4px); } }
```
- Add `data-leaving` only after the server confirms, which matches the toaster's rule.
- For reorders, use the View Transitions API with `view-transition-name` per row.

**Fits.**

---

## Top 8 adaptations, ranked by premium impact per effort

Effort: S is CSS in `corp.css` or one page, under a day. M adds a small TSX change (one hook or a markup tweak) or touches several pages.

| # | Adaptation | Screens | Effort | Why it ranks here | Fits the approved look |
|---|---|---|---|---|---|
| 1 | **Calm the phone Schedule "Today" list.** No red ring and no red dashed avatar; red only on the urgent row's detail; a single "Find cover"; one-line details; "No clock-in" as grey text, not a pill (§2) | Schedule (phone) | S | The most-used owner screen shows 3 reds and 3 teal actions today. This brings it into line with Jose's rules at once | Yes, it enforces rules 6 and 7 and the Oct 23 colour rule |
| 2 | **Payroll overdue banner as a white callout.** One red title, grey body, neutral button; remove the duplicate on Prepare payroll; fix the 8px "Choose dates" overhang (§11) | Payroll, Prepare payroll | S | Biggest red area in the product. A white callout reads like Gusto, and the pink block reads as an alarm | Yes. The optional 3px left rule needs Jose's yes |
| 3 | **Home stats.** Retire amber, make each stat a link with hover and press, add an optional 13px context line (§1) | Home (both) | S | Home is the first impression; this removes a banned colour and adds an obvious next step | Yes |
| 4 | **Sliding segmented thumb with an inset track.** One thumb, 200ms on the kit curve (§3) | Timecards, Payroll and any `.c-seg` | S–M | The single most "Apple-smooth" upgrade per line of CSS | Yes |
| 5 | **Timecards `.c-table`.** Sticky 40px header, 52px rows, Scheduled column, Total footer; actions moved out of the table card; no 0% bar (§7, §5) | Timecards (desktop) | M | Turns a list in a box into a payroll-grade timesheet, where Gusto is strongest | Yes |
| 6 | **Schedule grid in one card.** Top-aligned chip stacks, today column tint, dashed open chips, no red icon tile (§8) | Schedule (desktop) | M | Fixes ragged edges and a banned tile, and removes a card | Yes |
| 7 | **Sliding underline and sidebar indicator** (§12) | Payroll tabs, Timecards filter, sidebar | S–M | Continuity on every section switch | Yes |
| 8 | **List change motion.** Rows leave and arrive in 200ms after server confirmation; reorders use View Transitions (§13) | Things to do, Timecards, Team | M | Removes the last "web page" jump in daily approvals | Yes, with reduced motion respected |

Next in line, small and safe:
- Hold the skeleton at least 380ms once shown, then crossfade into content (§6).
- Make the sheet scrim follow the drag, and close faster on a fling (§4).
- Give each form field one message slot (§10).
- Use `text-wrap: balance` and 48px desktop padding on empty states, with one action only (§5).
- Desktop popover menus at 36px rows, 10px radius and a 160ms pop (§4).
- Clean the off-scale 12px and 14px sizes out of the desktop top bar.

## Checks run and gaps

**Run:**
- 7 routes at 1440x900 in Chromium and 390x844 in WebKit, with the probe reports.
- 3 opened states: the Location sheet, Find cover and Prepare payroll.
- 3 zoom crops.
- Kit source read in `src/components/corp/corp.css` and `src/app/app/corp-shell.css` (worktree `owner-premium`, read only).
- On 21st.dev: 20 searches and inspiration queries, and 12 component sources read.

**Not checked in this round:**
- Desktop "…" and account menus.
- Any form, so validation was not exercised.
- Loading, error and offline states live.
- Keyboard and focus.
- Motion with reduced motion off (all captures had it on).
- Tablet widths.
- Visual previews of the 21st components: I read code and descriptions and did not download preview images. Values marked "from the description" were not checked against source.
