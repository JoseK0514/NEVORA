# Phase 7 inspection: alignment and geometry

October 18, 2026 · Inspector: alignment and geometry (prefix AL-) · Preview `http://127.0.0.1:51346`, fictional data, Manager `AUDIT-M` and Owner `QAOWNER`.

## Verdict

The kit holds its geometry: every kit row, chevron, avatar, tile, status pill, progress bar, stat divider and tab bar column measured to 0 px offset at 320, 390 and 430. The defects come from three places. **Kit details:** stat values that drop when a label wraps, two baselines set by a leading dot or glyph, and the tab pill sitting 2 px low. **Older shell and mobile CSS overriding the kit:** the Home header is a different size from every other page, kit buttons are 44 px instead of 52 off Home, labels are 17 px instead of 15 px, the More group labels are indented, and summary rows lose their gap. **Unchanged legacy content under the new bands:** a Timecards card with no padding, a Payroll heading indented twice, and Schedule and Team inner edges that don't match. One item is broken: the review's "Dates" label splits into "Dat / es" at 320 and disappears at 150% text. Jose would find at least 8 of these on a phone without measuring. Count: **1 P0, 7 P1, 20 P2.**

Method: Playwright with saved sessions, `getBoundingClientRect` for boxes, and Range client rects plus canvas font metrics for baselines, x-height and cap-height centres. CSS causes were traced by matching every stylesheet rule against the element (`who.js`). Scripts, JSON dumps and crops are in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/phase7/alignment/`. "Crops" below means that folder's `crops/` directory. Coordinates are CSS px in page space.

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-01 | Review (both origins) · M and O · 320, and 390 at 125% and 150% | Request card, "Dates" row label (`.premium-review .nv-row__title`) | The label is squeezed by the nowrap fact "Wed, Oct 28 – Thu, Oct 29". At 320 it breaks mid-word into "Dat / es" (2 lines, row 64 px tall against 56). At 390 and 125% it reads "Date / s". At 150% the label column reaches 0 width and the word **vanishes**: the row shows a date with no label. "Length" is fine (1 line). | crops/AL-01-review-dates-320.png, AL-01-review-dates-390-125.png, AL-01-review-dates-390-150.png | `kit.css:201` `.nv-row__text{flex:1;min-width:0}` lets the label shrink to 0. `kit.css:205` `.nv-row__trail{flex:none}` keeps the fact rigid. `kit.css:202` `overflow-wrap:anywhere` and line-clamp 2 break, then clip, the word. | In `portal-premium.css` after line 128: `.premium-review .nv-row:not(:has(.nv-row__chev)) .nv-row__text{flex:0 0 auto}` `.premium-review .nv-row__trail{flex:1 1 auto;min-width:0;justify-content:flex-end}` `.premium-fact{white-space:normal}`. The label then keeps its width and the value wraps, right-aligned. | P0 |
| AL-02 | Home · M and O · 390, 430 (OK at 320 and ≥768) | Today card stat values `.nv-stat__value` | The values aren't on one baseline. "No clock-in" fits on 1 line while "Scheduled today" and "Clocked in now" wrap to 2, so its "3" sits **20 px higher**: baseline 344 against 364 and 364 (390, Manager). Owner: 633 against 653. Cell heights are equal (110). | crops/AL-02-home-stats-390.png, AL-02-home-stats-430.png | `kit.css:265` `.nv-stat{flex-direction:column;gap:8px}` stacks the value right under the label, with nothing pinning it to the cell bottom. | `kit.css:269` add `margin-top:auto` to `.nv-stat__value`. Grid cells already stretch, so all values bottom-align. Result at 390: baseline 364 in every cell. | P1 |
| AL-03 | Home (`/app`) vs every other page · M and O · 390, 430 (OK at ≤360) | Shell header `.mobile-header` and wordmark | On Home only, the header has 20 px side padding and is 76 px tall; everywhere else it is 16 px and 68 px. The wordmark sits at x 20 on Home and x 16 elsewhere, so it **jumps 4 px right and 4 px down** going Inbox → Home. On Home it is 4 px right of the band eyebrow and title (x 16). Header icons end at 370 against 374. | crops/AL-03-header-home-390.png against AL-03-header-inbox-390.png | `app-shell.tsx:147` sets `data-mobile-workforce` only when `pathname !== "/app"`. Home therefore misses `mobile-workforce.css:39-40` (16 px, 68 px) and gets `portal-refinement.css:122` (`padding:12px 20px;min-height:76px`). | `portal-premium.css:7-9` (the `:has([data-nv-band])` header rule): add `padding:12px 16px;min-height:68px`, giving one header on every band page. Don't flip the attribute on `/app`: it would pull in AL-04's overrides. | P1 |
| AL-04 | Review, Inbox, Schedule, Team (every page but Home) · M and O · all phone widths | `.nv-btn` (Decline/Approve), `.nv-band-control` (Refresh, Add shift, Add employee), `.nv-filter`, `.nv-link` ("All pending time-off requests") | Kit sizes are overridden. Decline and Approve are **44 px tall**; kit and Home's Next up button are 52 (kit.css:237). Labels are **17 px / 25.5** where kit is 15/20. Refresh, filters, Add shift and the review link are 17 px, while Home's "Open Inbox" and "Open schedule" are 15 px. The same control family has two sizes depending on the tab. | crops/AL-04-review-buttons-390.png against AL-04-home-nextup-390.png; AL-04-inbox-filters-390.png | `mobile-workforce.css:70` `.page-frame :is(button,a,label,legend){font-size:var(--mobile-body);line-height:1.5}` and `:71` `:is(button,summary,.button){min-height:44px}`. Also `portal-design-system.css:50` `.page-frame :is(button,.button){min-height:44px}` (this is why buttons are 44 at 768 and 1440 too). | In `portal-premium.css` (loaded last), at specificity (0,5,2) or higher: `html body .app-shell.nevora-portal .page-frame [data-nv-page] .nv-btn{min-height:52px;font:var(--nv-t-headline)}` `html body .app-shell.nevora-portal .page-frame [data-nv-page] :is(.nv-band-control,.nv-filter,.nv-link,.nv-masthead__back){font:var(--nv-t-label)}`. Keep the Back link at its own 17 px (`kit.css:142`). | P1 |
| AL-05 | More sheet · M and O · 320, 390, 430 | Group labels `.nevora-more-group-label` ("Time and reporting", ...) | Group labels start at x 85 while every item's text starts at x 79 (390): labels are **indented 6 px past their items**. This holds at all widths (320: 37 against 31). | crops/AL-05-more-owner-390.png, AL-05-more-manager-390.png | `portal-premium.css:149` `padding: 8px 16px 4px`; items use `padding: 9px 10px`. | `portal-premium.css:149` → `padding: var(--nv-s-2) 10px var(--nv-s-1)`. | P1 |
| AL-06 | Timecards · M and O · 320, 390, 430 | Period panel `[class*=periodPanel]` (Period start/end, View period, Refresh) | A white card with shadow and radius 12 has **0 padding**. The "Period start" label, both date fields and both buttons touch the card's left edge (x 16 = card x 16), right edge (374) and top (label top 276 = card top 276). The status line "10 timecards in this period." sits on the bottom edge. | crops/AL-06-timecards-panel-390.png | `timecards.module.css:98` `.managerRoot .periodPanel{padding:0;background:transparent;border-radius:0}` means "no card", but `mobile-workforce.css:179` re-adds `background:var(--mobile-surface)`, shadow and radius at ≤760. | Choose one. Either remove `[class*="timecards-module"][class$="__periodPanel"]` from `mobile-workforce.css:179` (a flat toolbar on the canvas), or keep the card and add `padding:20px` (`--nv-s-5`). The first matches the module's intent. | P1 |
| AL-07 | Timecards · M and O · 390 | "Review selected timecards" batch card (`[class*=__batch]`) | The title's cap top is about 8 px from the card top (card 501.5, baseline 523.5, 20 px type). The left inset is 17 px (text x 33) while other cards use 20. The title is 20 px though the module sets 15 px. The heading looks jammed against the border. | crops/AL-07-timecards-batch-390.png | `timecards.module.css:110` `.managerRoot .batch{padding:0 16px}` + 1 px border; `:111` min-height 52 with no vertical padding; heading size from the mobile font overrides. | `timecards.module.css:110` → `padding: 16px 20px` (border 1 px → text at x 37; or `padding: 16px 19px` for x 36). | P1 |
| AL-08 | Payroll · O · 320–430 (also 768, 1440) | `.pw-toolbar`, `.pw-panel` heading ("Missing pay periods") | **Inside one card the heading is 20 px right of the body text:** heading x 56, body "Checked Mon, Sep 21 …" x 36. Heading top is 40 px below the card top, against 20 everywhere else. Above the card, the bare toolbar ("1 payroll run", Refresh, Prepare a draft) is inset to x 36 on the canvas while band text and card edges are at 16. | crops/AL-08-payroll-panel-390.png | `mobile-workforce.css:180` applies `padding:20px` to `.pw-panel` and to its nested `.pw-panel-heading` (and to the unboxed `.pw-toolbar`). | In `mobile-workforce.css:180`, drop `.pw-panel-heading` and `.pw-toolbar` from the list, or add `html body .app-shell.nevora-portal .pw-panel .pw-panel-heading{padding:0}` and `.pw-toolbar{padding-inline:0}`. Result: heading x 36 = body x 36; toolbar x 16. | P1 |
| AL-09 | Home · M and O · all widths | Today card head: "Today" and the meta "● Updated 9:53 PM" | The meta baseline is **2 px below** the title baseline (390: 2 px; 125%: 3.5; 150%: 5). Other card heads ("This week", "Also needs you") measure 0. | crops/AL-09-today-head-390.png | The head aligns `baseline` (`kit.css:181`). `.nv-fresh` (`kit.css:291`) is `inline-flex` whose first item is the empty `::before` dot, so its baseline is synthesised from the dot's box, not the text. | `kit.css:291` add `align-items:baseline`; `kit.css:292` add `align-self:center` to `.nv-fresh::before`. | P2 |
| AL-10 | Review · M and O · all widths | Request card head: "Request" and the "Waiting" pill | The pill's text baseline is **2 px above** "Request". The title starts **24 px** below the card top, against 20 on "Note", "Before you decide" and every other card. Measured at 320, 390, 430, 768 and 1440. | crops/AL-10-review-head-390.png, AL-10-review-cards-390.png | `.nv-status` (`kit.css:219`) is `inline-flex` with the svg first, so its baseline is the svg's bottom edge (21 px into a 28 px pill against text 19.5). The head's `align-items:baseline` then lifts the pill 3.8 px above the title and grows the head. | `kit.css:220` add `align-items:baseline` and `kit.css:223` `.nv-status svg{flex:none;align-self:center}` (fixes the baseline everywhere). Plus `.nv-card__head > .nv-card__meta .nv-status{margin-block:-3px}` so the title stays 20 px from the top. | P2 |
| AL-11 | Tab bar · M and O · all phone widths and text sizes | Selected tab pill (`.mobile-nav-link.active::before`) | The pill centre is **2 px below** the icon centre: pill 786.2–818.2 (centre 802.2), icon 789.2–811.2 (centre 800.2). That leaves 3 px above the icon and 7 px below. Horizontal centring is 0. | crops/AL-11-tabbar-390.png | `portal-premium.css:43` `top:3px;height:32px` with the link's `padding-top:6px` and a 22 px icon. | `portal-premium.css:43` → `top:1px` (pill 784.2–816.2, centre 800.2). | P2 |
| AL-12 | Inbox (All, Planning) · M and O · all widths | Collapsible group rows (`.premium-group summary.nv-row`): "Weekly hour target missing", "Availability not submitted", "Coverage gap at …" | Summary-row titles start at x **84**; plain item rows in the same card start at 88 (4 px left). The divider above a summary row starts at 88, 4 px right of its own title. Same at 1440 (360 against 364). | crops/AL-12-inbox-group-390.png | `portal-design-system.css:91` `.app-shell.nevora-portal .page-frame summary{gap:8px}` beats `.nv-row{gap:12px}`. | `inbox.css:16` add `gap: var(--nv-s-3)` to `.premium-group > details > summary` (or `display:flex;gap:12px` at higher specificity). | P2 |
| AL-13 | Inbox vs Schedule and Team · M and O · all widths | Band control: Refresh against Add shift and Add employee | The same control renders three ways. Refresh's label ends at x 370 (**4 px inside** the 374 gutter) while Add shift's ends at 374. Its icon-to-label gap is 8 px against 6, weight 600 against 500, padding 10/16 against 0/12. Switching tabs shows the control shift. | crops/AL-13-refresh-390.png against AL-13-addshift-390.png | `portal-gusto.css:150` includes `.inbox-refresh` in the generic page-button rule (`padding:10px 16px;gap:8px`, weight 600). | Remove `.inbox-refresh` from `portal-gusto.css:150`'s list, so `.nv-band-control` (`kit.css:152-155`) applies alone. | P2 |
| AL-14 | Inbox · M and O · 390 | Filter pills row | At 390 the four pills end at x 382.7, **8.7 px past** the column edge (cards and band text end at 374), so the row neither fits nor clearly scrolls. At 320 "Planning" is cut at the screen edge (an expected scroller). | crops/AL-04-inbox-filters-390.png | 17 px labels from AL-04 (`mobile-workforce.css:70`) plus `portal-premium.css:123` `padding:0 14px`. | Fix AL-04 (15 px labels): the row shrinks by about 30 px and fits within 374 at 390. Re-measure; if it still doesn't fit, use `padding:0 12px`. | P2 |
| AL-15 | Home · M and O · 430, 768, 1440 (wraps at 320 and 390) | "This week" foot: "21 shifts planned, drafts included" and "Open schedule" | `justify-content:space-between` has no effect. The link sits 12 px after the sentence and ends at x 387, **7 px short** of the card's text edge (394). Baselines are equal (1415/1415). At 390 the link wraps under the sentence. | crops/AL-15-week-foot-430.png | `portal-premium.css:71` `.premium-week-foot` is a shrink-wrapped flex item inside the flex foot (`portal-premium.css:73`), so its width equals its content. | `portal-premium.css:71` add `flex:1;min-width:0`. | P2 |
| AL-16 | Schedule · M and O · all widths | The toolbar card's overlap of the band | It overlaps the band by **48 px**; Home, Inbox, Team and Review overlap by 72 (desktop: 32 against 56). The toolbar card straddles the band edge differently from every other first card. | crops/AL-16-schedule-overlap-390.png against AL-16-home-overlap-390.png | The page wrapper `.manager-schedule-page` is a grid with `gap:24px` (`manager-schedule.css:1`, `mobile-workforce.css:116`) between the band and `.nv-content`. | `html body .app-shell.nevora-portal .manager-schedule-page.premium-legacy-page{gap:0}` (the content's own 16 px gap stays). | P2 |
| AL-17 | Schedule · M and O · 390 (legacy content) | Week summary "21 assignments · 3 people assigned · 168 hours assigned" | The third figure wraps to its own line (baselines 445 and 445, then 485), leaving one number alone under two. | crops/AL-17-schedule-summary-390.png | `.mws-week-summary{display:flex;flex-wrap:wrap;gap:16px}` (schedule CSS, `@max-width:600px`). | `display:grid;grid-template-columns:repeat(3,auto);justify-content:start;column-gap:16px` on phones, with labels allowed to wrap under their numbers. Or shorten to "168 h". | P2 |
| AL-18 | Schedule · M and O · 390 (legacy content) | Team schedule card (`.mws-roster`) inner left edges | One card has four left edges: title and search field at x 36 (search 36–354), day strip, result line and shift cards at x 32 (32–358), person names at 48, shift text at 51. The search box and the day strip below it are offset 4 px on both sides. | crops/AL-18-schedule-roster-390.png | `mobile-workforce.css:120` gives `.mws-roster-heading` `padding:20px`; `mobile-workforce.css:124` and `:137` give `.mws-day-navigation` and `.mws-person` 16 px. | Use one inset: change `mobile-workforce.css:120` to `padding:20px 16px`, giving 32 for heading, search, strip and shifts. | P2 |
| AL-19 | Team · M and O · 390 (legacy content) | Directory card: search, filters, segment control against employee rows | The toolbar is inset 20 (x 36–354); the rows below are inset 16 (x 32–358). The avatars are 42 px with radius 14 (rounded squares); the kit's avatars on Home and Inbox are 40 px circles. | crops/AL-19-team-toolbar-390.png | `mobile-workforce.css:171` toolbar `padding:20px`; employee-directory module rows `padding:20px 16px` (@600); module `__avatar{width:42px;border-radius:14px}`. | `mobile-workforce.css:171` → `padding:20px 16px`. The avatar shape is a judgment call left to Phase 3 (legacy content), but 40 px circles would match the kit. | P2 |
| AL-20 | Payroll · O · all widths | Vertical rhythm of the content blocks | Gaps between top-level blocks are **38, 34, 36 px** (toolbar → panel → review layout → privacy note); kit pages use 16. | crops/AL-20-payroll-gaps-390.png | The `.nv-content` gap of 16 plus `payroll-workflow.css:10` `.pw-toolbar{margin-bottom:22px}`, `:5` `.pw-panel{margin-bottom:var(--pw-gap)}` (18) and `.pw-privacy` margin 20. `portal-premium.css:141` `.premium-legacy-content > *{margin:0}` loses on specificity. | `html body .app-shell.nevora-portal .page-frame .premium-legacy-content > *{margin-block:0}` (or scope the reset `.payroll-workflow.premium-legacy-content > *`). | P2 |
| AL-21 | All band pages · M and O · 768, 1440 (spot check) | Band text against card text | The band eyebrow, title and summary start at x 276 (768) and 308 (1440); card text starts at 280 and 312. It is **4 px off**, aligned to neither the card edge (260 and 292) nor the card text. | crops/AL-21-band-768.png | `portal-premium.css:56` band `padding-inline:32px` against `:57` content `padding-inline:16px` + card padding 20 = 36. | `portal-premium.css:56` → `padding-inline:36px`. Desktop is Phase 4, so log it now. | P2 |
| AL-22 | Review (and the Inbox limited-attendance note) · M and O · all widths | "All pending time-off requests" link (`.premium-review-more`), `.inbox-note` | The link text starts at x 20: 4 px in from the card edge (16) and 16 px short of card text (36). It aligns with nothing. | crops/AL-22-review-link-430.png | `portal-premium.css:130` and `inbox.css:24` `padding:0 var(--nv-s-1)`. | `padding:0 var(--nv-s-5)` (text at 36, matching card text). | P2 |
| AL-23 | Review · M · 390×844, 430×932 | Sticky decision bar | At 390 at rest, the link (704–748) sits under the bar's 16 px gradient (bar 710–778, buttons from 722), so ghost text shows behind the top of Decline and Approve. At 430×932 the bar isn't stuck: it floats 32 px above the tab bar at rest and 68 px at the scroll end, while at 390 it touches the tab bar. | crops/AL-23-review-bar-390.png, AL-23-review-bar-430-bottom.png | `kit.css:301` gradient `rgba(…,0) → bg 16px`; `portal-premium.css:138` `margin-top:auto` has no effect because neither `.premium-review` nor its form is a flex container that fills the screen. | Make the page a flex column: `.premium-review{display:flex;flex-direction:column}` `.premium-review-form{flex:1}`. Make the gradient opaque by 8 px: `linear-gradient(rgba(242,244,243,0), var(--nv-bg) 8px)`. Then verify at 390 and 430. Judgment: the float is minor; the ghost text is the visible part. | P2 |
| AL-24 | More sheet · M and O · 320–430 | Dividers and group spacing | The Search divider is inset 2 px each side (71–367); the group border lines run 69–369. The first group label sits 6 px below the Search divider; later labels sit 9 px below their group border. | crops/AL-05-more-owner-390.png | `globals.css:307-310` `.nevora-action-menu-divider{margin:6px 2px 8px}`; `portal-gusto.css:483` `margin:0 2px 4px`; `portal-premium.css:148` group `margin-top:8px;padding-top:8px`. | `portal-gusto.css:483` → `margin:0 0 7px` (inset 0; first label 9 px below, like the others). | P2 |
| AL-25 | More sheet · O · 390, 430 | "Sign out" against sticky "Close actions" | When the sheet opens, Sign out (774–828) is fully covered by the sticky Close button (775–823), so the last action is invisible until the sheet is scrolled. Manager's list is shorter and unaffected (Sign out 666–720, Close 730). | crops/AL-05-more-owner-390.png | `mobile-workforce.css:102` `.mobile-workforce-sheet-close{position:sticky;bottom:0}` over a list taller than the sheet. | Give the scrolling list `padding-bottom:56px` (the Close height plus 8), or place Close outside the scroller. Judgment: it isn't misalignment, but a careful Owner will notice a missing Sign out. | P2 |
| AL-26 | Timecards, Payroll · M and O · phones | Section tabs on the band ("Timecards", "Payroll runs", ...) | The tab text starts at x 18; the band title and eyebrow below start at 16. The underline runs 16–106. | crops/AL-26-sectiontabs-390.png | `portal-gusto.css:312` `.section-tab{padding:0 2px}`. | In the band context (`portal-premium.css:20`), set `.section-tab{padding-inline:0}`; the underline then matches the text. | P2 |
| AL-27 | Team, Timecards, Payroll · M and O · 390 | Band watermark against the summary text | The summary lines cross the watermark's left stroke and inner triangle. Payroll's "…amounts and" runs to x 373 across the stroke (ink about 294–323) and the triangle (about 355–377). Timecards' "pay period." reaches 341, stroke 281–310. Team's summary reaches 353, stroke about 318. Home, Inbox, Review and Schedule clear it. | crops/AL-27-payroll-mark-390.png | `kit.css:124-133` mark fixed at `right:-96px;bottom:-40px`; long summaries reach it. | Judgment, since the mark is 7% white and the text stays readable. Cap the summary width at 280 px on phones (`.nv-masthead__summary{max-width:min(36em, calc(100% - 64px))}`), or move the mark down 24 px when a summary wraps. | P2 |
| AL-28 | Home "This week" against other cards · all | Divider insets | Rows dividers start at the text edge (x 88, or 36) and run to the card's right edge. The progress separators and card foot lines in "This week" run edge to edge (16–374). Two divider styles appear in adjacent cards. | crops/AL-15-week-foot-430.png | `portal-premium.css:75` `border-top` on `.nv-progress` (padded box) and `kit.css:185` foot border. | Judgment. Either inset the progress separator like rows (`box-shadow: inset 0 1px var(--nv-hairline)` on an inner wrapper starting at 20 px), or accept "sections full width, rows inset" as the rule and write it in the token sheet. | P2 |

## Checked and correct (for the re-check)

Measured on Home, Inbox (All, `now`, `requests`, `planning`, groups opened), Review (Inbox and Home origins), Schedule, Team, Timecards and Payroll (Owner). Both roles at 320, 390 and 430; spot checks at 768 and 1440; Home, Inbox and Review at 125% and 150%.

- **Kit card edges:** left and right edges are equal down every page: 16/374 at 390, 16/304 at 320, 16/414 at 430. Radius is 20 px on phones and 16 at ≥768. Card titles are 20 px from the left edge and 20 from the top (Request card aside, AL-10). Gaps between kit cards are 16 px.
- **Kit rows:** every leading avatar or tile is centred on the text block and the row (0 px offset, all rows and widths). Tile icons are centred in their tile (0, 0). Avatar initials are within 0.46 px of the circle centre. Chevrons are centred on the row (0) and 20 px from the card's right edge. Title, meta and status left edges are equal down every list (x 88; nested group rows 114). Dividers start exactly at the title x on every item row.
- **Inbox status line:** the pill and the action link are both 28 px tall with equal centre and baseline (for example 434/434 and 439/439). At 320 and at large text they stack, left-aligned at x 88.
- **Band:** eyebrow, title, summary and Back caret share x 16 on phones (Inbox's eyebrow text is at 28 because its live dot occupies 16–22, as intended). The overlap is 72 px on Home, Inbox, Team and Review (56 at ≥768). Flat bands (Timecards, Payroll) leave 16 px to the content. The Refresh icon is 0.81 px from the label's cap centre; the Back caret is 0.93. Refresh's and the eyebrow's label baselines differ by 0.6 px.
- **Progress rows:** label and value share a baseline (0). The track runs from the label's left edge to the value's right edge (0/0). The note is left-aligned with the label (0).
- **Stats:** cell heights are equal (110 at phone, 88 at ≥768). The 1 px dividers run the full cell height. Label tops are equal. Values align at 320 and ≥768 (AL-02 covers 390 and 430).
- **Decision bar:** Decline and Approve have equal widths (173 at 390), equal tops (722), equal baselines (749.25), a 12 px gap and 16 px outer margins. Icons are within 0.93 px of cap centre, and icon plus label is centred in each button (≤0.01 px).
- **Tab bar:** column widths 76.39–76.41 (≤0.02 px). The five icon boxes share centre y 800.2; labels share baseline 829.2. Icons and labels are centred in their columns (≤0.01 px). This holds at 320, 390 and 430 and at 125% and 150%. The pill is horizontally centred on its icon (0). Icon ink: Team's glyph ink ends 1.4 px above the others (807.1 against 808.5). That comes from the Phosphor glyph design, so it isn't logged.
- **Status pills:** the glyph is within 0.46 px of the label's cap centre, with a 5 px gap.
- **Next up:** the label triangle is centred on the label (0.9 px from x-height centre). The cut line and button sit at a 16 px rhythm. The tile is top-aligned to the title box (tile top 799 = title top 799). That is deliberate (`flex-start`, `kit.css:254`), so it isn't logged.
- **Owner "Finish setting up":** step marks are centred on their rows (346/346, 407/407). "Done" shares the step title's baseline (351/351). Text is inset 20.
- **More sheet:** every item is 54 px tall with text at x 79 (390). The Search icon's left edge equals the item text's left edge (79). The Close icon is within 0.93 px of cap centre.
- **Team rows (legacy):** the avatar is centred on the name and ID block (0.01 px). The "Active" pill centre matches the role line's centre within 0.25 px; phone and "View profile" baselines are within 0.5 px.
- **Schedule toolbar (legacy):** the period control and "…" button share centre y 304.
- **Filter pills:** all 44 px tall, same top and baseline, 8 px gaps. Pressing a pill (weight 600) shifts later pills by up to 0.5 px. That is below visibility and isn't logged.
- No horizontal page scroll on any page or width tested.

## Gaps

- Not run: landscape 844×390 and the 360 width. The brief's widths for this role were 320/390/430, with 768/1440 as spot checks. AL-03 does not occur at ≤360 (both headers are 16 px there).
- Desktop (768, 1440) was spot-checked on Home, Inbox, Review, Schedule, Team, Timecards and Payroll only; desktop layout is Phase 4.
- Closed `<details>` content still reports layout boxes in Chrome. Nested rows were measured only with groups opened.
- Outside this role, seen in passing: tab labels compute to 12 px (kit token 13 px) and the Next up title to 20 px (kit 19 px). Both are typography, left for that inspector.
- No data was changed. The More sheet was opened and measured, but Sign out and the other actions were not pressed.

## Round 2

October 18, 2026, late evening · Same preview and fictional accounts, both roles. Re-measured at 320, 390 and 430, with Home, Inbox, Review and Team also at 125% and 150% text, and spot checks at 768 and 1440. Newly covered:
- rebuilt Team
- Schedule's Next up, summary, location chips, search and day strip
- restyled Timecards and Payroll
- Home's Attendance, Team overview and Schedule activity views
- "Already decided" (`requestId=does-not-exist`)
- the docked decision bar
- the More bottom sheet (Home and Inbox)
- the decision toast (`?decided=` on Inbox and Home)
- loading placeholder band heights

New crops are in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/phase7/alignment/r2/` ("r2/" below). Round-1 JSON is kept in `json-r1/`; the current dumps are in `json/`. No horizontal page scroll on any page at any width.

### Status of round-1 findings

| ID | Status | Measurement now |
|---|---|---|
| AL-01 | **Fixed** | "Dates" stays one line at 320 and at 125% and 150%; the value wraps instead (r2/R2-review-dates-320.png). A new, smaller row issue is AL-38. |
| AL-02 | **Fixed** | Home stat values share baseline 354/354/354 at 390 and 430, and 390/390/390 at 320. |
| AL-03 | **Fixed** | The header is 16 px and 68 px on Home and every other page; the wordmark is at x 16 on Home, equal to the band text. |
| AL-04 | **Fixed** | Decline and Approve are 52 px at all widths, including 768 and 1440. Refresh, Add shift, Add employee, the filters and the review link are 15 px (weight 500; pressed filter 600). |
| AL-05 | **Fixed** | More group labels at x 42 equal the item text at x 42 (320, 390, 430). |
| AL-06 | **Fixed** | The Timecards period panel is now flat on the canvas: labels, fields and buttons at x 16–374 with no card behind them. |
| AL-07 | **Fixed** | The batch card text is inset 20 (x 36). The two-line title is centred in the 60 px card with 8 px above and below the line box (r2/R2-timecards-batch-390.png). |
| AL-08 | **Fixed** | The Payroll heading and body share x 36; the toolbar starts at x 16. |
| AL-09 | **Fixed** | Today's meta baseline equals the title's (Δ 0) at all widths and text sizes. |
| AL-10 | **Partly fixed** | The title is now 20 px from the card top. The "Waiting" text baseline is still **2 px above** "Request" (Δ −2 at 320, 390, 430, 768, 1440), because the pill's baseline is still taken from its glyph. Fix as in round 1 (`.nv-status{align-items:baseline}` plus `svg{align-self:center}`). |
| AL-11 | **Fixed** | The tab pill centre is 0.5 px above the icon centre (was 2 px below). |
| AL-12 | **Fixed** | Inbox summary rows have titles at x 88, matching the item rows; dividers start at the title (0). |
| AL-13 | **Fixed** | Refresh's label ends at x 374 (gutter), with a 6 px gap and weight 500, identical to Add shift and Add employee. |
| AL-14 | **Fixed** | At 390 the filter row ends at 374.27, 0.27 px past the column (not visible). At 320 it scrolls as intended. |
| AL-15 | **Fixed** | At 430, "Open schedule" ends at x 394 (= card text edge) and shares the sentence's baseline (1409/1409). |
| AL-16 | **Fixed** | The Schedule overlap is 72 px, like Home, Inbox, Team and Review. |
| AL-17 | **Fixed** | The week summary is a three-column card; values share baseline 684 and labels 709. |
| AL-18 | **Partly fixed** | Heading, search, day strip and shift cards now share x 32–358, but person names in the roster are still at x **48**, 16 px right of everything else in the card (r2/R2-schedule-roster-390.png). Cause: `mobile-workforce.css:137` `.mws-person{padding:20px 16px 12px}` inside the 16 px row. Fix: `padding:20px 0 12px`. See also AL-35. |
| AL-19 | **Fixed** | Team is rebuilt with kit rows: 40 px circles at x 36, names at 88, chevrons 20 px from the card edge, and the find card inset 20 like the list card. |
| AL-20 | **Fixed** | Payroll block gaps are 16/16/16. |
| AL-21 | **Fixed** | At 768 the band text is at x 280, equal to card text 280; at 1440, 312 equals 312. |
| AL-22 | **Fixed** | "All pending time-off requests" text is at x 36, equal to card text. |
| AL-23 | **Fixed** | The bar is docked flush on the tab bar at 320×568, 390×844 and 430×932 (bar bottom = tab bar top). The gradient is opaque by 8 px, so no ghost text shows behind Decline and Approve. |
| AL-24 | **Partly fixed** | The Search divider and group borders now run 32–358, but the divider above Sign out is still 34–356 (2 px inset, `globals.css:309` `margin:6px 2px 8px`). The first group label sits 9 px below the Search divider while later labels sit 4 px below their group border (label boxes 166 against 377). |
| AL-25 | **Fixed** | Sign out (710–754) is fully clear of Close (764–812) for both roles. |
| AL-26 | **Fixed** | Section tab text at x 16 equals the band title. |
| AL-27 | **Partly fixed** | Clear at 390 (Timecards, Payroll and Team summaries end 40+ px before the stroke). At 430 the Timecards summary ("…close each pay period.") still runs to x 341 over the stroke's ink edge at about 322, and Payroll's line 1 runs to 338.7 against about 335 (r2/R2-timecards-band-430.png). Judgment call, as in round 1. |
| AL-28 | Kept by rule | Not refiled. I agree with the rule. |

### New findings, round 2

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-29 | Timecards · M and O · 320–430 | People card: header row against person rows | **The header row is 16 px left of every row.** Header checkbox centre x 46, row checkboxes x 62. "Employee" at x 92, names at x 108. "Details ›" at x 92, also 16 px left of the row text above it. Each row's checkbox centre (751) is also 4 px above its name's centre (755). | r2/R2-timecards-rows-390.png | `portal-premium.css:300` pads each row `article` 16/20 on top of the module's `.rowMain` padding (`timecards.module.css:166` `14px 16px 8px`). `portal-premium.css:299` pads the header only 12/20. The module's `.rowDetails` (`timecards.module.css:176` `padding-left:56px`) ignores the extra 20. | `portal-premium.css:299` → `padding: var(--nv-s-3) 36px` (header checkbox centre 62, "Employee" 108). Add `.rowDetails{padding-left:72px}` in the same block ("Details" 108). Add `.rowMain > .rowSelect{margin-top:6px}` to centre the checkbox on the name line. | P1 |
| AL-30 | Home › Team overview · M and O · 320–430 | Summary figures "10 / 0% / 10 / 0" | **"0%" sits 8.5 px higher than "10" beside it:** baselines 638 against 646.5. The right cell has an extra line ("0 of 5 employees and leads") and the row centres the cells. The hours list below starts at x 44, 8 px right of the card heading (x 36). | r2/R2-teamoverview-390.png | `globals.css:9938` `.manager-team-summary-line{align-items:center}`; hours rows `globals.css:10198` `padding:10px 8px`. | `globals.css:9938` → `align-items:flex-start` (values 646.5/646.5). Set `.manager-team-hours-row` to `padding-inline:0` on the band page. | P1 |
| AL-31 | Home › Attendance · M and O · 320–430 | The stacked cards: What we compare, Today's clock-ins, Nothing to review, Updated, Correction requests | One page has **four different text insets:** 35 ("What we compare"), 37 ("TODAY"), 33 ("Updated", "TIME CORRECTIONS"). The Refresh button sits off-centre in its card (17 px left, 13 px right). Radii are 18 and 12 where kit cards are 20. Card gaps are 12, 12 and 16 where the rest of the app uses 16. "No correction requests" is a bordered card nested inside a card (x 17–373). The "0" count circle (centre 1031.5) aligns with neither the eyebrow (1021.5) nor the title (1050). | r2/R2-attendance-390.png | Legacy attendance styles: `globals.css:12898`, `12905`, `13127`, `13187`, `13214` (header pad 18/20, footer `9px 12px 9px 16px`, panel 18); `globals.css:13409` `.manager-corrections`. None were mapped to kit tokens when the view moved onto the band. | On the band page set every attendance card to the kit card: `padding:20px`, `border-radius:var(--nv-r-card)`, gap 16. Footer `padding:16px 20px` (Refresh centred, 20/20). Drop the nested empty card's border and radius. Align the count circle to the title row (`align-self:center` against the h2). | P1 |
| AL-32 | More sheet · M and O · 320–430 (Home and Inbox) | Bottom sheet frame | The sheet floats **16 px above the screen bottom with square bottom corners** (radius 24 24 0 0). The tab bar shows through that strip, and its labels (y 817.5–833.5) are sliced by the sheet's bottom edge at 828. | r2/R2-more-sheet-390.png | `action-menu.tsx:51-55` writes inline `left:16px; width:358px; bottom:16px; max-height`. Inline styles beat `portal-premium.css:459` (`bottom:0; left:0; right:0; width:auto`). | Skip the inline geometry when the menu is the phone bottom sheet (`#manager-more-navigation` at ≤760 px), so the CSS anchors it to 0/0/0 and covers the tab bar. If the floating look is intended instead, use `border-radius:24px` on all corners and keep the sheet above the tab bar (`bottom ≥ 76px`). | P1 |
| AL-33 | Team · M and O · 320 | Band control "Add employee" | At 320 the eyebrow row wraps, so "Add employee" drops to its own line (y 108–152) under "10 active employees". Its icon sits at x 28, 12 px right of the band text edge (16), and the title moves 44 px down compared with 390. The control is right-aligned at 390 and 430 and left-indented at 320. | r2/R2-team-320.png | `portal-premium.css:93` `.nv-pageband__eyebrow-row{flex-wrap:wrap}`, together with `.nv-band-control`'s `margin-right:-12px` and `padding:0 12px`. Inbox has a no-wrap override (`portal-premium.css:490-491`); Team doesn't. | Use Inbox's rule for Team: `flex-wrap:nowrap` plus eyebrow ellipsis. At 320 that leaves about 130 px for the eyebrow, so also shorten it to "10 active" at ≤359 px, or show the control icon-only (44 px, aria-label kept). | P1 |
| AL-34 | Team · M and O · 320 | Status filters All / Active / Inactive | "Inactive 0" wraps alone to a second row (tops 566 and 618) under two pills. | r2/R2-team-320.png | `portal-premium.css:255` `.premium-team-status{flex-wrap:wrap;overflow:visible}`. | `flex-wrap:nowrap; overflow-x:auto` (the Inbox pattern), or `padding:0 12px` at ≤359 px so all three fit in 248 px. | P2 |
| AL-35 | Schedule · M and O · 320–430 | Card insets down the page | Kit cards (Next up, the week summary) put text at x 36. The legacy cards between them (week toolbar, Build and publish, Team schedule) put their content at x 32, and roster names at 48 (AL-18). The left text edge alternates 36, 32, 36, 32 down one screen. | r2/R2-schedule-chips-390.png, r2/R2-schedule-roster-390.png | `.mws-toolbar` padding 16; `mobile-workforce.css:120` (`.mws-roster-heading` 20, overridden to 16); `.mws-planning summary` 16; `mobile-workforce.css:124`. | Use one inset per page. Either raise the Schedule legacy cards to 20 (`.mws-toolbar`, `.mws-planning > summary`, `.mws-roster-heading`, `.mws-day-navigation` margin and `.mws-person` all 20), or accept 16 for Schedule and say so in the token sheet. | P2 |
| AL-36 | Schedule · M and O · 320–430 | Location chips (`.segmented`) | The strip loads with `scrollLeft` 4, so the selected "All locations" chip sits flush on the container's left edge (both x 16) and loses the 4 px inset it has on the other three sides. | r2/R2-schedule-chips-390.png | `portal-premium.css:360-361` `scroll-snap-type:x mandatory` with `scroll-snap-align:start` on the chips; the snapport ignores the container's 4 px padding. | Add `scroll-padding-inline:4px` to the `.segmented` rule at `portal-premium.css:360`. | P2 |
| AL-37 | Schedule · M and O · 390 | Day strip | Scrolled to its end (scrollLeft 120 of 120), the visible days sit 17 px from the strip's left edge but 5 px from its right. A faded 9 px sliver of "Mon" shows at the left under the mask. | r2/R2-schedule-roster-390.png | `manager-weekly-roster.tsx:94-99` centres or clamps the chosen day; `portal-premium.css:365-366` `scroll-snap-align:center` on 44 px buttons in a 324 px strip. | Snap days to `start` with `scroll-padding-inline:4px`, and end-align today (`inline:"end"`), so a whole day shows at each edge with equal 4 px insets. | P2 |
| AL-38 | Review · M and O · 320; 390 at 125% and 150% | Request card rows "Dates" and "Length" | When the value wraps to two lines, the label is centred against both, so its baseline sits 10 px (320), 13 px (125%) or 15 px (150%) below the value's first line. At 150%, "Length" drops its value onto a separate line under the label, while "Dates" keeps label and value side by side: two row shapes in one card. | r2/R2-review-dates-320.png, r2/R2-review-dates-390-150.png | `kit.css:191` `.nv-row{align-items:center}` with the round-1 fix letting the trail grow and wrap. | `.premium-review .nv-row:not(:has(.nv-row__chev)){align-items:baseline}`, so label and first value line share a baseline. Keep the trail from wrapping onto its own line: `flex-wrap:nowrap` on these rows, and let the fact wrap inside its box. | P2 |
| AL-39 | Loading placeholders · M and O · 390 (and 320) | Band height in `RouteSkeleton` against the loaded band | When the page arrives, the placeholder band jumps by 24 px on Team (skeleton 244, real 220), 36 px on the review (300 against 264; "Already decided" is 288), and 44 px on Payroll (196 against 152 under the section tabs). At 320 every real band is taller (Home 256 against 220). | Values from `src/app/app/*/loading.tsx` against the measured bands (`json/M-*-390.json`). Not captured live: client navigation keeps the old page while the payload loads. | `employees/loading.tsx` `band={244}`, `requests/loading.tsx` `band={300}`, `payroll/loading.tsx` `band={196}`. | Set Team 220, requests 264, payroll 152. For 320, size the skeleton band in `rem` and text lines rather than fixed px, or accept the 36 px change at 320. | P2 |
| AL-40 | Home › Attendance / Team overview / Activity · M and O · 320–430 | The three view pills on the band | The pill row is at y 236 on Attendance but y 280 on Team overview and Activity (Attendance has no week eyebrow). Tapping between the three views makes the pills **jump 44 px**, and the band is 308 against 352 px. The selected pill's bold weight also moves the following pills by 1.3 px. | r2/R2-attendance-band-390.png against r2/R2-teamview-band-390.png | The Attendance band has no `eyebrow`, while the other two pass the week. | Give Attendance an eyebrow (today's date, as Home has), or show the pills above the eyebrow, so the pill row stays at one y. Optionally reserve bold width (`text-shadow` or a hidden bold duplicate) to stop the 1.3 px shift. | P2 |
| AL-41 | Home › Schedule activity · M and O · 390 | Activity rows | "Open" sits at baseline 657, between the title (642) and the meta's first line (664.7), so it aligns with neither. Icon tiles are 34 px squircles at x 36, with text at x 90, against kit rows' 40 px circles and text at 88 on Home and Team. | r2/R2-activity-390.png | `globals.css:9995`, `10137-10141` (`.manager-activity-row`, `> a`). | `.manager-activity-row > a{align-self:center}` (or align it to the title baseline), and use the kit `Tile` (40 px circle, text at 88). | P2 |
| AL-42 | Toast · M and O · 320, 390 | Decision toast | The toast spans the gutters (16–374) and sits 12 px above the tab bar. Its padding is 14 px left and 12 px right, and the dismiss glyph is centred in a 44 px button: the check glyph is 14 px from the left edge and the X glyph 18 px from the right. The icon, two text lines and the X share centre 732. Judgment call. | r2/R2-toast-390.png | `portal-premium.css:416` together with the toaster padding `12px 12px 12px 14px`. | `padding:12px 4px 12px 18px`, so both glyphs sit 18 px in. Optional. | P2 |
| AL-43 | Payroll · O · 320–430 | "1 payroll run" | The only centred line on the page (x 139–250 at 390); everything else starts at x 16. Judgment call. | r2/R2-payroll-top-390.png | `portal-premium.css:345` `.pw-toolbar` wraps, and the paragraph inherits centred text from the legacy toolbar. | `text-align:left; justify-content:flex-start` on `.pw-toolbar p`. | P2 |

Checked and correct in round 2:
- **Team (rebuilt):** "Find people" title and meta share baseline 253. The search field is x 36–354 and the selects are 36–189 and 201–354, a 12 px gap. Pills, rows and chevrons are measured above under AL-19.
- **Schedule:** Next up matches Home's (label triangle, tile and button at 36; the cut line full width). The week summary's dividers run full height, labels sit at a 2-line height and values share a baseline. The toolbar's period control and "…" share centre y 526.
- **"Already decided":** band and Back link at x 16. The card text is inset 20, the title 20 px from the top, and both links sit on one line (by screenshot, not measured).
- **Docked decision bar:** equal widths (138, 173 and 193 at 320, 390 and 430), a 12 px gap, flush on the tab bar. At 150% text it stacks to full width, 16–374.
- **Home views:** Back "‹ Home" caret at x 16, within 0.18 px of cap centre. The pills are 44 px tall with one baseline per page.
- **Tab bar:** unchanged and correct (widths ≤0.02 px apart; icons at y 800.5, labels at baseline 830.5).
- **Toast:** centred vertically; 12 px clear of the tab bar.

### Round 2 verdict

My area does **not** yet have zero open defects. There are 5 new P1s: AL-29 (Timecards header against rows), AL-30 (Team overview figures), AL-31 (Attendance card insets), AL-32 (More sheet frame) and AL-33 (Team at 320). There are 10 new P2s (AL-34 to AL-43), and 4 round-1 items are only partly fixed (AL-10, AL-18, AL-24, AL-27).

Of the 27 round-1 findings filed for fixing, 23 are fixed. AL-28 was kept by rule, and none has regressed. Most of the new P1s are in views newly moved onto the band.

## Round 3

October 18, 2026, night · Same preview and fictional accounts, both roles. Re-measured at 320, 360, 390 and 430, in **landscape 844×390** (touch, coarse pointer, phone shell with tab bar), and at 125% and 150% text on Review and Team. Crops are in `.../scratchpad/phase7/alignment/r3/` ("r3/" below).

Landscape was checked with viewport screenshots only. A full-page capture stretches the viewport past the 430 px landscape query and draws the desktop shell instead, so it isn't evidence. No horizontal page scroll anywhere.

### Status of open items

| ID | Status | Measurement now |
|---|---|---|
| AL-10 | **Partly fixed** | At 100% text the "Waiting" baseline equals "Request" (Δ 0) at 320, 360, 390, 430 and landscape. At 125% it drifts 1.5 px low and at 150% 3 px low, because the 14 px glyph doesn't scale with the text. Fix: size the status glyph in `em` (`width:.9375em;height:.9375em`) so the pill's box grows with its label. |
| AL-18 | **Fixed** | Roster names at x 36, matching the heading, search, day strip and shift cards (320–430). |
| AL-24 | **Partly fixed** | Both dividers now run the full group width (16–374), and Sign out and Close are clear. Label spacing is still uneven: the first group label sits 9 px below the Search divider (173→182), later labels 4 px below their group border (389→393). Fix: give `.nevora-more-group + .nevora-more-group` `padding-top:13px`, or drop the first label's top padding by 5 px. |
| AL-27 | **Fixed** | No summary line crosses the watermark stroke on any page at 390, 430 or landscape. |
| AL-29 | **Partly fixed** | Header checkbox, row checkboxes, "Employee", names and "Details" share x 42/88 at 320–430 (landscape 50/96). At 390 the checkbox centre is 1 px from the name's. Residuals: at 430 the checkbox is 4 px above the name centre (727 against 731). In landscape it is 5 px below (659 against 654). At 430 the "Draft" pill ends at x 398, 4 px past the 394 text edge every other card keeps (r3/R3-timecards-rows-430.png). |
| AL-30 | **Fixed** | Team overview is rebuilt as kit stats: values share a baseline (488/488 and 579/579 at 390; 532/532 at 320 with labels wrapping). |
| AL-31 | **Fixed** | Attendance is two kit cards, text at x 36 throughout, radius 20, gap 16. Refresh spans 36–354 (centred); the count pill sits on the eyebrow baseline (802/802). |
| AL-32 | **Fixed** | The More sheet runs edge to edge (0–390) and to the screen bottom (844), covering the tab bar; no sliced labels. In landscape it is a 560 px sheet, centred (142–702). |
| AL-33 | **Fixed** | Team's eyebrow row no longer wraps. At 320 the eyebrow reads "10 active" and "Add employee" stays right-aligned, its text ending at the gutter; the title is at y 124, the same as 390. |
| AL-34 | **Fixed** | Team's status pills are now a horizontal scroller with an edge fade at 320 and 360, like Inbox (r3/R3-team-320.png). |
| AL-35 | **Partly fixed** | Phones: toolbar control, summary, Build and publish icon, roster title, search, day strip, names, shift cards and "Show 7 not scheduled" all start at x 36. One straggler: the result line "10 of 10 team members · Sun, Oct 18" is still at x **32** at every phone width (`.mws-result-summary` padding 8 px 16 px → use 20). Landscape: see AL-45. |
| AL-36 | **Not fixed** | The location chips still load with `scrollLeft` 4 at 320–430, so the selected chip sits flush on the container's left edge (both x 16) (r3/R3-schedule-chips-390.png). Landscape is correct (scroll 0, chip at 28 = 4 px inset). Cause and fix unchanged: `portal-premium.css:360-361` needs `scroll-padding-inline:4px`. |
| AL-37 | **Not fixed** | The day strip still scrolls to its end, leaving a cut day at the left edge: "Wed 14" half-visible under the fade at 320 (first button 27–71 against strip 36), and a 1 px sliver of "Mon" at 390. The right inset is 5 px (r3/R3-schedule-strip-320.png). Landscape fits all days (scroll 0). |
| AL-38 | **Partly fixed** | At 320, 125% and 150% the label now starts at the value's first line (Δ was 10–15 px). But rows are top-aligned, so the 15 px label's baseline is **2 px above** the 17 px value's at every width (`portal-premium.css:611` `align-items:flex-start`; use `baseline`). At 150%, "Length" still puts "2 full days" on its own line under the label while "Dates" stays side by side (`portal-premium.css:216` `flex-wrap:wrap` with `:218` `flex:1 1 10rem`). |
| AL-39 | **Partly fixed** | Payroll (152), review (264), Schedule (244) and Home (220) now match at 390. But Team, Inbox and Timecards bands grew, so their skeletons are now **24 px short**: Team real 244 against skeleton 220, Inbox 332 against 308, Timecards 148 against 172 (24 px too tall). At 320, Home is 280 against 220 and the review 288 against 264. Fix: `employees/loading.tsx` 244, `inbox/loading.tsx` 332, `timecards/loading.tsx` 148. Or derive the height from the band's own content rather than one px value. |
| AL-40 | **Fixed** | The view pills sit at y 280 on Attendance, Team overview and Activity at 390 (y 304 at 320); Attendance now has an eyebrow. |
| AL-41 | **Fixed** | Activity is a kit row list: tiles at 36, titles at 88, chevrons 20 px from the edge, dividers at 88. |
| AL-42 | **Partly fixed** (judgment) | The check glyph is 16 px from the toast's left edge and the X glyph 14 px from its right edge (padding `8px 8px 8px 16px`). Fix: `padding-right:10px` to make both 16. Optional. |
| AL-43 | **Not fixed** | "1 payroll run" is still centred (x 139–250 at 390) while everything else starts at 16. Cause: at ≤600 px the module stacks `.pw-toolbar` as a column, and `portal-premium.css:345` sets `align-items:center`, which centres horizontally in a column. Fix: `align-items:flex-start` (or `align-self:flex-start` on the paragraph). |

### New findings, round 3

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-44 | Home › Team overview · M and O · 320–430 and landscape | Card heads "This week" and "Hours this week" | The titles start **30 px** below the card top; every other kit card is 20. The meta is a 44 px-tall link ("View availability", "Manage targets"), and the baseline-aligned head grows to fit it (head 72 px against 50). At 320 the "Hours this week" link wraps under the title instead. | r3/R3-teamview-cards-390.png | `kit.css:232` `.nv-link{min-height:44px}` inside `.nv-card__meta`, with `kit.css:182` `.nv-card__head{align-items:baseline}`. | `.nv-card__meta > .nv-link{min-height:0;padding-block:12px;margin-block:-12px}`: keeps a 44 px target and brings the title back to 20 px. | P2 |
| AL-45 | Schedule · M and O · landscape 844×390 | Inner edges and widths | The phone fix (AL-35) doesn't reach landscape, where the ≥768 tokens apply (gutter 24, card text at 44). The left edges are 41 ("Team schedule"), 44 (summary), 45 (Build and publish icon), 47 (shift cards), 49 (day strip and result line), and names at 109. The day strip spans only 49–532 of a 24–820 card. The location chip strip ends at 750 while every card ends at 820. Next up's "Plan West Office" button is 360 px wide, left-aligned (44–404), in a 796 px card. | r3/R3-land-schedule-300.png, r3/R3-land-schedule-600.png | The AL-35 rules in `portal-premium.css` are scoped to the ≤760 px phone query. Landscape matches the `(max-height:430px) and (orientation:landscape) and (pointer:coarse)` shell query, but the legacy `mws-*` desktop rules still lay out the content. | Add the landscape query to the AL-35 block, so Schedule's legacy cards use a 20 px inset there too. Let the day strip and chip strip span the card (`width:100%`) in landscape. Give the Next up button `width:100%` (block), as on phones. | P2 |

Checked and correct in round 3:
- **Review:**
  - Docked bar: equal halves at 320, 360, 390 and 430 (138/158/173/193), 12 px gap, flush on the tab bar.
  - In landscape the bar is in the page flow (static, by rule at `portal-premium.css`) rather than docked. That saves height on a 390 px screen, so I treat it as intended, not a defect. Halves there are 392/392.
- **Bands:** band, eyebrow, title and Back caret at the gutter on every page at 320–430 (16) and in landscape (24); the overlap is 72 px on phones and 32 px in landscape.
- **Team overview and Activity:** the "‹ Oct 12 – Oct 18 ›" week controls in the band put the previous-week glyph's left edge at x 17 against band text 16 (1 px), sharing centre y 142 with the eyebrow text.
- **Timecards:** at 390 the header, rows and Details share x 42/88. The overview and batch cards are inset 20.
- **More sheet:** labels and items share x 26 at every width, and x 161 in landscape.
- **Tab bar:** unchanged and correct at 320–430 and in landscape.

### Round 3 verdict

My area does **not** yet have zero open defects. 12 items remain open: AL-10, AL-24, AL-29, AL-35, AL-36, AL-37, AL-38, AL-39, AL-42 and AL-43 carried over, plus new AL-44 and AL-45. All of them are P2; no P0 or P1 is open.

## Round 4

October 18, 2026, night · Both roles at 320, 360, 390 and 430, in landscape 844×390 (phone shell), and at 125% and 150% text on the review. Newly covered: Time exports (`/app/payroll-export`, now banded) and the Home views' combined Back and week row. Crops are in `.../scratchpad/phase7/alignment/r4/` ("r4/" below); landscape uses viewport captures only. No horizontal page scroll anywhere.

### Status of open items

| ID | Status | Measurement now |
|---|---|---|
| AL-10 | **Fixed** | The "Waiting" baseline is within 0.44 px of "Request" at 100%, 0.8 px at 125%, 1.15 px at 150%, and 0.88 px in landscape. |
| AL-24 | **Partly fixed** | Was 9 px against 4 px; now the first group label box sits 6 px below the Search divider (176→182) and later labels 4 px below their border (389→393). A 2 px difference remains. Fix: `margin-top:-2px` on the first `.nevora-more-group-label`. |
| AL-29 | **Partly fixed** | At 320, 360, 390 and landscape the checkbox and name centres are equal (0 px), and header, rows and Details share x 42/88. At 430 the checkbox is still 3 px above the name (729 against 732), and "Draft" ends at x 398, 4 px past the 394 text edge (r3/R3-timecards-rows-430.png still applies). |
| AL-35 | **Fixed** | Every Schedule element starts at x 36 at 320–430, including the result line. |
| AL-36 | **Partly fixed** | At 360, 390 and 430 the strip loads at scroll 0 and the selected chip keeps its 4 px inset (x 20). At **320** it loads with scroll 11, so the selected chip starts at x 9 and is clipped by the container's left edge at 16 (r4/R4-schedule-chips-320.png). Fix: don't scroll the strip when the selected chip is the first, or `scroll-padding-inline:4px` with `scroll-snap-align:start`. |
| AL-37 | **Not fixed** | The day strip still ends on a cut day at the left: at 320 the first visible button is 28–72 inside a strip starting at 36 (8 px under the fade); at 390 a 2 px sliver of "Mon" (−6–38); at 430, 34–78 (2 px). The right inset is 4–5 px (r4/R4-schedule-strip-390.png). |
| AL-38 | **Regressed (P1)** | At ≤430 the review's "Dates" and "Length" rows are now a column, and each row is **206 px tall**. The value floats 93 px below its label with about 60 px of empty space above and below it. At 125% the rows are 251 px, at 150% 296 px (r4/R4-review-390.png). Cause: `portal-premium.css:745` sets `flex-direction:column` while `portal-premium.css:220` `.premium-review .nv-row__trail{flex:1 1 10rem}` still applies, so 10rem (160 px) becomes the value's **height**. Fix: in the `:745` block, add `.premium-review .nv-row:not(:has(.nv-row__chev)) .nv-row__trail{flex:none}`. Rows return to about 64 px with the value directly under the label. Landscape is correct (rows 56 px, baselines equal). |
| AL-39 | **Partly fixed** | Per-route bands match at 320, 390 and 430 and in landscape (Home 220/256/172, Team 220/244/172, review 264/216, Inbox 308/332/260, Schedule 244/172, Timecards 148/140, Payroll and Time exports 152 or 128/96). At **exactly 360** the `@media (max-width:360px)` block (`portal-premium.css:685`) applies, but the real bands at 360 are the 390 values: Home 256 against 220 (36 px), Team 244 against 220 (24), Time exports 152 against 128 (24). Fix: `max-width:359px`. |
| AL-42 | **Fixed** | Both toast glyphs are 16 px from their edges (padding `8px 10px 8px 16px`). |
| AL-43 | **Fixed** | "1 payroll run" starts at x 16, like everything else. |
| AL-44 | **Fixed** | "This week" and "Hours this week" titles are 20 px from the card top at 320–430 and in landscape. |
| AL-45 | **Partly fixed** | The landscape Next up button now spans the card (44–800). Left edges are 44 (period, summary) and 45 (Build and publish icon, roster title, day strip, result line, "Show 7"), a 1 px difference. Shift cards are inset to 51. The day strip still spans only 45–526 of the 24–820 card, and the chip strip ends at 751 against 820 (r4/L-M-schedule-650.png). |

### New findings, round 4

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-46 | Home › Team overview and Schedule activity · M and O · 320 | The Back and week row on the band | "Oct 12 – Oct 18" **wraps to two lines** ("Oct 12 – Oct / 18") between its arrows. The row grows to 51 px, so Back and the arrows sit 3.5 px lower (centre 93.5 against 90), and the title moves to y 131 against 124 on Attendance and at 360+. | r4/R4-teamview-band-320.png | `portal-premium.css:501` `.premium-week-eyebrow` has no `nowrap`. Back (88) + arrow (44) + label (117) + arrow (44) = 293 px in 288 px of row. | `white-space:nowrap` on the week label. At ≤359 px, either show a short label ("Oct 12–18") or render Back as the caret only (keep `aria-label="Home"`); either fits within 288. | P1 |
| AL-47 | Home › Schedule activity · M and O · 320–430 | View pills on the band | The **current** view's pill, "Schedule activity", runs off the screen: 278–431 at 390 (viewport 390) and 270–419 at 320. The strip loads at `scrollLeft` 0, so the page's own selected pill is cut under the fade ("Schedule acti…"). It was "Activity" in round 3 and fit. | r4/R4-activity-band-390.png | The label grew, and the strip doesn't scroll the current pill into view. | On load, scroll the strip so the current pill is fully visible (`el.scrollIntoView({inline:"nearest",block:"nearest"})` plus `scroll-padding-inline:16px`), or go back to the shorter label "Activity". | P1 |
| AL-48 | Home views · M and O · 320–430 | Right end of the Back row | The row's right edge differs between the three views reached from the same pills. Attendance's "Today" text ends at x 374 (the gutter); on Team overview and Activity the next-week glyph ends at 361, because its 44 px box ends at 374. Baselines match (Back 96, week 95.25, Today 95). | r4/R4-attendance-band-390.png against r4/R4-activity-band-390.png | `portal-premium.css:502` `.premium-week-arrow{margin:0}`. Other band controls use `margin-right:-12px` so their glyph or label ends at the gutter. | `.premium-week-eyebrow .premium-week-arrow:last-child{margin-right:-13px}` (glyph ends at 374). | P2 |
| AL-49 | Time exports · M and O · 320–430 | "Choose finalized employees" selection bar | "Select finalized" is squeezed to 69 px and **wraps to two lines** (button 67 px tall) beside a one-line "Clear". Their label baselines are 872 and 884.75, **12.75 px apart**, and the status text beside them wraps to three lines (r4/R4-exports-choose-390.png). | r4/R4-exports-choose-390.png | The payroll-export module's `__selectionBar` keeps text and both buttons on one row at phone width. | On phones, stack the bar: status text full width, then the two buttons in one row (`white-space:nowrap`, equal height, shared baseline). | P1 |
| AL-50 | Time exports · M and O · 390 | Last panel "Complete payroll population and handoff"; card head count | The last panel is a legacy `.panel` with radius 18 and text at x 35, against kit cards' 20 and 36 above it. In the "Choose finalized employees" head, the title wraps to two lines and the "0 ready" count is centred on the whole block, so it aligns with neither line (judgment call). | (full page) r4/O-_app_payroll_export-390-full.png | `.panel` isn't mapped in the Time exports kit block (`portal-premium.css:698-700`). | Add `.premium-exports .panel` to the kit-card rule (radius 20, padding 20). Optionally align the count to the title's first line (`align-self:flex-start; margin-top:4px`). | P2 |

Checked and correct in round 4:
- **Time exports:** card edges 16–374, radius 20, text at 36. Section icon tiles are centred on their heading blocks (316.5/316.5). Employee checkboxes are centred on the names (947 against 948.5). Section tabs are at the gutter (x 16; 24 in landscape).
- **Home views at 360+ and in landscape:** Back, week label and arrows share one row and centre (90), with baselines within 0.75 px.
- **Team overview** stats share baselines at every width. The "Hours this week" link wraps under its title at 320, as intended.
- **More sheet:** label and item text x 26 (161 in landscape); edge to edge.
- **Tab bar:** unchanged and correct.

### Round 4 verdict

My area does **not** yet have zero open defects. Open: 4 P1 (AL-38 regressed, plus new AL-46, AL-47 and AL-49) and 8 P2 (AL-24, AL-29, AL-36, AL-37, AL-39, AL-45, AL-48, AL-50).

## Round 5

October 19, 2026 · Both roles at 320, 360, 390 and 430, in landscape 844×390 (phone shell), and at 125% and 150% text on the review. Crops are in `.../scratchpad/phase7/alignment/r5/` ("r5/" below). The preview's date rolled over to Monday, Oct 19 (a new week), so today is now the first day in the Schedule strip. I also selected Sunday in the day strip (a view filter only) to test the end-of-week case. No horizontal page scroll anywhere.

I've read the "Additions from later rounds" table. I don't refile any of it, and I agree with each item: the 8 px inner radius is the token sheet's `--nv-r-inner`; the 0.25–0.89 px one-frame tab drift is sub-pixel; the landscape sheet without Close has three other ways to close; the export wording is copy, not geometry.

### Status of open items

| ID | Status | Measurement now |
|---|---|---|
| AL-24 | **Fixed** | Every More group label sits 4 px below its divider or border: 178→182 for the first, 389→393 for the rest (landscape 96→100 and 307→311). |
| AL-29 | **Fixed** | At 430 the checkbox and name centres are equal (735/735 and 982/982), "Draft" ends at x 394 (the text edge), and its baseline is 1 px from the name's (740 against 741). 320–390 are unchanged and correct. |
| AL-36 | **Fixed** | The location strip loads at scroll 0 at every phone width; the selected chip keeps its 4 px inset (x 20 in a container at 16). |
| AL-37 | **Partly fixed** | With today first (Monday), the strip starts at scroll 0: "Full week" at 40 (4 px inset), today "Mon 19" fully visible, and the fade cuts only the trailing days (r5/R5-schedule-strip-390.png). With **Sunday selected**, the end-of-week case still leaves a cut day at the left: at 320 "Wed" is 28–72 in a strip starting at 36 (8 px under the fade), and at 390 the first full day sits 10 px in against 4 px at the right (r5/R5-schedule-strip-sun-320.png). Cause: `manager-weekly-roster.tsx:98-99` centres or clamps the chosen day, so at maximum scroll the left edge falls mid-button. Fix: snap so whole buttons show at the left (`scroll-snap-align:start`, `scroll-padding-inline:4px`), or end-align the last day with a 4 px inset. |
| AL-38 | **Fixed** | Review fact rows at ≤430 now stack label over value, 68 px each, with value 24 px under label (one 20 px label line plus a 2 px gap), both at x 36 (r5/R5-review-390.png). At 125% and 150% the rows are 78.5 and 89 px. Landscape keeps them side by side with equal baselines (Δ 0). |
| AL-39 | **Partly fixed** | The `max-width:359px` block now gives the right values at 320 and 360 for Home, Team and Time exports, and every route matches at 390, 430 and landscape. One mismatch remains: **Inbox at 360** is really 332 px (its summary wraps) but gets the 308 px skeleton, a 24 px jump. Fix: move the Inbox override into its own `@media (max-width:389px)` (Inbox measures 332 at 320 and 360, 308 at 390 and 430). |
| AL-45 | **Partly fixed** | Landscape Schedule: the day strip now spans 45–799, the chip strip 24–820, shift cards start at 45, and Next up's button spans 44–800. A **1 px** split remains: Next up, the week controls and the summary start at x 44, while Build and publish, Team schedule, the day strip, the result line and "Show 7" start at 45. The legacy cards add a 1 px border inside the same 20 px padding. Fix: `padding-inline:19px` on the bordered legacy cards in landscape, or drop their border in favour of the kit shadow. |
| AL-46 | **Fixed** | The week label stays on one line at 320 ("Oct 19 – Oct 25", 163–271). The row is 44 px and the title sits at y 124 on all three Home views at every width. |
| AL-47 | **Fixed** | On Schedule activity the strip scrolls the current pill into view: 209–362 at 390, 179–332 at 360, 139–292 at 320, all inside the viewport. |
| AL-48 | **Fixed** | The right end of the Back row matches across views: the next-week glyph ends at 374 (390), 304 (320) and 820 (landscape), the same as Attendance's "Today". Baselines: Back 96, week 95, Today 95. |
| AL-49 | **Fixed** | Time exports' selection bar is an inset strip. "Select finalized" and "Clear" are each one line, 44 px tall, sharing baseline 867 at 390 (969.5 at 320 and 826.5 at 430). |
| AL-50 | **Fixed** (count kept as judgment) | The last panel now has radius 20 with text at x 36, like the kit cards. The "0 ready" count is still centred on the whole heading block (cy 750.75 beside a two-line title and two-line date). That was the optional, judgment-call part; I don't count it as a defect. |

### New findings, round 5

None. The sweep covered every kit card, row, stat grid, progress row, band, filter strip, button group and tab bar, plus the Timecards, Schedule, Team, Time exports and Payroll legacy blocks, at 320, 360, 390, 430 and landscape for both roles. It found nothing beyond the items above. The only flagged lines were the intended ones: the stacked review rows, and the "Manage targets" link wrapping under its title at 320.

Checked and correct in round 5:
- **Review:** decision bar halves equal at every width; the "Waiting" pill within 0.44 px of the title baseline at 100% text.
- **Home views:**
  - Back, week label and arrows share a row and centre (90) at 320–430.
  - The current pill is fully visible on all three views.
- **Timecards:** header, rows and Details at x 42/88 (50/96 in landscape), checkbox and name centres equal at every width.
- **Time exports:** cards radius 20, text at 36 (86 beside the section icons), the selection bar's buttons on one baseline.
- **More sheet:**
  - Labels and items at x 26 (161 in landscape).
  - Label spacing is equal (4 px).
  - The sheet runs edge to edge.
- **Tab bar:** columns equal (≤0.02 px apart), icons on one centre line, labels on one baseline.

### Round 5 verdict

My area does **not** yet have zero open defects. 3 P2 items remain, all partly fixed: AL-37 (a cut day at the left of the strip when the selected day is late in the week), AL-39 (Inbox skeleton 24 px short at 360) and AL-45 (a 1 px left-edge split in landscape Schedule). No P0 or P1 is open.

## Round 6

October 19, 2026 · Both roles at 320, 360, 390 and 430, in landscape 844×390 (phone shell), and at 125% and 150% text on the review. Crops are in `.../scratchpad/phase7/alignment/r6/` ("r6/" below). In the Schedule day strip I selected Thursday, Saturday and Sunday, a view filter only. No horizontal page scroll anywhere.

### Status of open items

| ID | Status | Measurement now |
|---|---|---|
| AL-37 | **Partly fixed** (see judgment below) | Mid-week (Thursday) and today (Monday): the strip starts on a whole day exactly 4 px in ("Full week" or "Tue" at x 40 in a strip at 36), and the chosen day is fully visible, at every width. **End of row** (Saturday or Sunday selected, maximum scroll): 390 shows a 2 px sliver of "Mon" (−6–38 against 36); at 430 "Mon" is clipped by 2 px (34–78). At **320**, "Wed" is clipped by 8 px (28–72) and the "W" is visibly cut. At **360**, "Tue" is clipped by **20 px** (16–60), leaving a 24 px fragment where "ue / 0" is legible (r6/R6-schedule-strip-360-7.png, r6/R6-schedule-strip-320-7.png). |
| AL-39 | **Fixed** | Every placeholder band matches its loaded band at 320, 360, 390, 430 and landscape. Inbox is now 332 at 320 and 360 (`portal-premium.css:685` `max-width:389px`), 308 at 390 and 430, 260 in landscape. |
| AL-45 | **Fixed** | Landscape Schedule: Next up's button, week controls, summary, Build and publish icon, roster title, day strip, result line, shift cards and "Show 7" all start at x 44; the right edges (Build and publish chevron, search, day strip) end at 800. |

**AL-37 judgment, as asked.** The coordinator's note says the end-of-row sliver is 2–8 px. At 390 and 430 that holds (a 2 px sliver or a 2 px clip), and I don't consider those defects: the edge fade reads as a scroll cue. At 320 the clip is 8 px of an otherwise readable day, which is borderline but acceptable as a scroll cue. At **360 it is not 2–8 px**: 20 px of the 44 px day is clipped and a 24 px fragment ("ue 0") shows under the fade. That reads as a broken half-day, and I consider it a defect (P2).

Fix options, either sufficient:
1. Size the day buttons so a whole number fits the strip at each width. At 360 the strip's inner width is 280 px; five buttons at `(100% − 4×8px) / 5` ≈ 49.6 px fit exactly, so the end-of-row start also lands on a whole day.
2. At the end of the row, add trailing padding equal to the remainder (`(scrollWidth − clientWidth) mod 52`), so the last whole-day start is reachable. The last day then sits slightly further from the right edge instead of slicing the first.

### New findings, round 6

None. The sweep covered:
- every kit card, row, stat grid, progress row, band, filter strip, button group and tab bar
- the Timecards, Schedule, Team, Time exports and Payroll blocks
- the Home views
- the More sheet

at 320, 360, 390, 430 and landscape for both roles, plus the review at 125% and 150%. The only flagged lines were already accepted: the "Manage targets" link wrapping under its title at 320, and the "Waiting" pill sitting 1.15 px off the title baseline at 150% (below my 1.2 px threshold, as in round 5).

Regression spot checks still hold:
- More sheet: labels and items at x 26, label spacing 4/4 px.
- Timecards at 320 and 430: checkbox and name centres equal; "Draft" ends at 394.
- Time exports: "Select finalized" and "Clear" one line each, sharing a baseline.
- Home views: the week label stays on one line at 320; the next-week glyph ends at the gutter; the current pill is in view.

### Round 6 verdict

My area does **not** yet have zero open defects. One P2 remains: AL-37, the half-day fragment (20 px clipped, "ue 0" legible) at the start of the Schedule day strip at 360 when the last days of the week are selected.

## Round 7

October 19, 2026 · Same preview, Manager account. In the Schedule day strip I chose Thursday, Saturday and Sunday, a view filter only. Crops are in `.../scratchpad/phase7/alignment/r7/` ("r7/" below). Read only; the password was never printed.

### Status

| ID | Status | Measurement now |
|---|---|---|
| AL-37 | **Fixed** | With the trailing `.mws-day-tail` spacer, the first visible day starts at **x 40** (4 px inside the strip at 36) in every case tested: Thursday, Saturday and Sunday at 320, 360, 390 and 430. The chosen day is always fully visible. At the end of the row the spacer leaves empty strip after Sunday (320: Sunday ends 240, strip ends 284). That is the price of a whole-day start; I don't consider it a defect (r7/R7-schedule-strip-320-7.png, r7/R7-schedule-strip-360-7.png). Mid-week the spacer adds nothing (Thursday at 360–430 stays at scroll 0). |
| Attendance footer (interaction inspector's item) | **Fixed** (geometry) | The freshness block now spans 36–354 at 390 (36–284 at 320, 36–394 at 430). Its live dot sits at 36 with "Updated 12:51 AM" at 48 (the same dot-then-text pattern as Inbox's eyebrow), and the second line "Updates every 30s…" starts at 36. Refresh spans 36–354. Every other text block in the card starts at 36. See AL-51 for a remaining visual issue on the same footer. |
| Home stats at ≤340 px (WR-54) | **Correct** | At 320 the columns are 107/90/90 px and at 340 107/100/100. Labels share a baseline (329 at 320; 293 at 340), as do values (390; 354). All three cells are 110 px tall, so the 1 px dividers run full height. In every cell the value starts exactly at its label's x (36, 136.11, 226.55 at 320). "Scheduled" ends at 111 inside a column ending at 123. The first column's text stays at 36, matching the card title and foot. Text sits 12 px inside its divider at ≤340 and 16 px at ≥341; that is a deliberate padding change and the same within each width. |

### New finding, round 7

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-51 | Home › Attendance · M and O · 320–430 and landscape | Footer (Updated / Refresh) inside the "Today's clock-ins" card | The footer still carries the legacy card shadow (`rgba(24,25,31,.035) 0 4px 12px` + `0 1px 3px`), with no background, inside a kit card. It draws a faint ghost card from x 36 to 354 under the hairline, a nested-card edge on both sides of the Refresh area. No other block in the card has it: header, empty state and both correction blocks measure `box-shadow:none`. | r7/R7-attendance-footer-390.png, r7/R7-attendance-390.png | `globals.css:12898` gives `.attendance-review-footer` `box-shadow:var(--shadow-premium)` (shared with the header, list and empty blocks). `portal-premium.css:538` resets its border, radius and background for the band page, but not its shadow. | Add `box-shadow:none` to `portal-premium.css:538`. | P2 |

### Round 7 verdict

My area does **not** yet have zero open defects. AL-37 is fixed, and the Attendance footer geometry and the ≤340 px Home stats are correct. One P2 is new: AL-51, the leftover shadow on the Attendance footer, a one-line fix.

## Round 8

October 19, 2026 · Same preview, both roles, at 320, 360, 390, 430 and landscape 844×390. Read only; the password was never printed. For the loading state I delayed the page's own `/api/*` reads in my browser only. Nothing was sent or changed.

### Status

| Item | Status | Measurement now |
|---|---|---|
| AL-51 (Attendance footer shadow) | **Fixed** | `box-shadow:none` on the footer at 320, 390 and landscape. The header, empty state and both correction blocks are also `none`; nothing in either card draws a nested edge. |
| Fields on band pages are 48 px | **Correct** | Every single-line field measures 48 px tall. On Time exports (320/390): 2 date fields, 1 number field, 12 text fields and 12 selects, all `padding-block:0`, plus a 72 px textarea. Timecards dates and select, Team search and selects, and Payroll search are also 48. Payroll's search keeps `padding:10px 13px` but is still 48 px, with text centred (below). Inside its 48 px wrapper, Schedule's search field is 46 px (1 px border each side). |
| Text centred in date, number and select fields | **Correct** | Measured by ink on the rendered pixels (glyph rows inside the field, borders and icons excluded). For text without descenders, the ink centre sits within 0.5 px of the field's centre: date "10/13/2026" +0.5, number "9" 0.0, selects "neutral" −0.25, "ISO" +0.25, "revision" −0.25. Landscape (16 px text) gives the same: date +1.25 (from the "/" descender; cap-centre about −0.2), number +0.25, selects 0 to +0.25. Values with descenders (y, p, j) read +1 to +1.5, which is the descender, not an offset. Team's search icon is centred on its field (Δ 0.00). |
| Field text size | **Correct** | 17 px at 320–430, and 16 px in landscape (844 px wide uses the ≥768 desktop tokens, like all other landscape type). |
| Attendance footer while loading | **Correct** | With the attendance read held, the footer shows "● Updated –" (dot at 36, text at 48), then "Updates every 30s…" at 36 and the Refresh button 36–354. The footer is 105 px tall, the same as when loaded, so nothing moves when the time arrives (r8/R8-attendance-loading-390.png). |
| Bell "—" hidden | **Correct** | The header holds no visible text besides the wordmark's "Workforce". Search and bell are 44 px boxes sharing centre y 34; their glyphs are centred in their boxes (cy 34), and the bell box ends at the gutter (374 at 390, 304 at 320). |
| Root placeholder takes the destination's shape | **Not captured live** | A client-side tab change keeps the old page until the payload arrives, so I couldn't hold the root placeholder on screen. I read `app/loading.tsx` → `RootLoading`. The per-route band heights it would use were verified in round 6 (AL-39). |

### Sweep

Same probe as earlier rounds over Home, Inbox, review, Schedule, Team, Timecards, Payroll, Time exports and the three Home views, at 320, 360, 390, 430 and landscape. Nothing new:
- every card edge, row, stat grid, progress row, band, filter strip, button pair and tab bar is within the round 1–7 tolerances
- no horizontal page scroll

The only flagged line is the accepted wrap of "Manage targets" under its title at 320. One probe of Timecards at 320 loaded without its band during a dev-server recompile; a re-run measured it correctly (band 148).

### Round 8 verdict

My area now has **zero open defects**: AL-51 is fixed, and the field-height, centring and loading changes measure correctly with nothing new found.

## Round 9

October 19, 2026 · Short regression check of what changed since round 8, on the same preview. Read only; the password was never printed.
- In the Schedule day strip I chose days (a view filter only).
- I focused the Schedule search without typing.
- For the Attendance footer states I held, failed or refused the page's own `/api/manager/attendance` read in my browser only, and simulated a hidden tab.

Crops are in `.../scratchpad/phase7/alignment/r9/` ("r9/" below).

### Status

| Item | Status | Measurement now |
|---|---|---|
| Day strip, whole-day start (TC-47) | **Correct** | **100%:** with Sat or Sun chosen, the first visible day starts at x **40** (4 px inside the strip at 36) at 320, 360, 390 and 430. Day buttons are 44 px. **125%:** buttons are 55 px; with Thu or Sun chosen the first visible day starts at 40 at 320 and 390. **150%:** buttons are 66 px; same, x 40 at 320 and 390. "Full week" stays 72 px. |
| Day labels centred in wider buttons | **Correct** | Day name and date centres are within **0.02 px** of each button's centre at 125% and 150% (every day, 320 and 390). "Full week" wraps to two lines at 150%, both centred on its 72 px button (centre 76 = 76) (r9/R9-schedule-strip-320-1-fs150.png). |
| Home stats, 320 at 100% (TC-01) | **Correct, unchanged from round 7** | Columns 107.11/90.44/90.45 px. Labels share baseline 329 and values 390. Cells are 110 px with full-height dividers. Text x 36 / 136.11 / 226.55, and "Scheduled" ends at 111. 340 and 360 also match round 7. |
| Home stats at 125% and 150% | **Correct** | At 320 (125% and 150%) and 390 (150%) the stats are a **single column** (grid `288px` / `358px`). Each row has label at x 36 and value right-aligned to 284 (354 at 390) on the **same baseline** (400.5/400.5, 460.5/460.5…). Rows are separated by a 1 px top border; the first row has none, so it is 1 px shorter (59 against 60). At 390 and 125% it stays three columns, with labels and values on shared baselines (362.5 and 435.5). |
| Attendance footer by state | **Correct** | Live "Updated 1:35 AM" (green dot), "Checking…" (grey dot), "Couldn't update. / Try Refresh." (coral ring), "Paused. / Return to this page to update." (coral ring) and "No access. / Sign in again to continue." (coral ring, Sign In link). In every state the dot sits at x 36 and the text at 48. The first-line baseline is 578 and the second line starts at 36. The footer stays 105 px tall (390), so nothing shifts between states. The control spans 36–354 (36–284 at 320). The 6 px dot sits 2 px above the baseline, its centre about 1 px above the x-height centre, in every state (r9/R9-att-footer-*.png). |
| Schedule search | **Correct** | The wrapper is **48 px** at 320, 390 and landscape. The inner input is 46 px with `outline:none`. On focus the wrapper shows the 2 px ring at 2 px offset (`:focus-within`). Icon and input are centred on the wrapper (Δ 0.00). |
| Branded error screen | **Not reachable** | I tried read-only URLs with bad parameters (`?week=not-a-date`, bad `start`/`end`, an invalid request id, an invalid week on Home's Team view). Every page handled them without erroring, and a malformed employee URL gave the plain 400 page. I couldn't make `app/error.tsx` render without changing data or code, so it is unmeasured. |

### Sweep

Home, Inbox, review, Schedule, Team, Timecards, Attendance, Team overview, Payroll and Time exports at 320 and 390 for both roles, plus Home and Schedule in landscape. Nothing new; no horizontal page scroll. The first probe of Home at 320 caught a dev-server recompile; a re-run measured it correctly. The only flagged line is the accepted "Manage targets" wrap at 320.

### Round 9 verdict

My area still has **zero open defects**: every change since round 8 measures correctly, and only the error screen remains unmeasured because I couldn't reach it read-only.

## Round 10

October 19, 2026 · Short regression check of what changed since round 9, on the same preview. Read only; the password was never printed.
- In the Schedule day strip I chose days (a view filter only).
- For loading and error states I held, failed or refused the page's own `/api/*` reads in my browser only, and simulated a hidden tab.

Crops are in `.../scratchpad/phase7/alignment/r10/` ("r10/" below).

### Status

| Item | Status | Measurement now |
|---|---|---|
| Day strip with "Full week" at 4.5rem | **Correct** | "Full week" is 72 / 90 / 108 px at 100 / 125 / 150%. With Monday chosen the strip starts at scroll 0 and "Full week" sits at x 40. With Sunday chosen (end of row) the first visible day starts at x **40** at 320 and 390, at all three sizes. "Full week" wraps to two lines at every size. Both lines are centred on the button (Δx 0.00 / 0.00 / 0.00), and the two-line block sits 0.75 / 0.57 / 0.38 px above the button's vertical centre. |
| Attendance, shorter copy by state | **Correct** | Live "Updated 2:03 AM / Updates every 30s.", Checking "Checking… / Updates every 30s.", Error "Couldn't update. / Try Refresh.", No access "No access. / Sign in again.", Paused "Paused. / Updates when you're back.". In every state the footer dot is at x 36, the text at 48 on baseline 578, and the second line at 36. The footer stays 105 px tall and starts at the same y (550 at 390), so the main block's height doesn't change between states either. In the main block the heading, count row, empty title and empty text all start at x 36 in every state. (The second count moves from x 136 to 134 when "0" becomes "–", because the counts are an inline sentence, not columns. I don't count that.) |
| Today placeholder meta | **Not as described**, see AL-52 | The hidden stamp "Updated 12:00 PM" puts its dot at x 211.8 and its text at **223.8**. "Loading…" starts at **211.8**, which is the dot's position, 12 px left of where the stamp's text starts. The loaded stamp then puts its text at 226.5 (390) or 156.5 (320), so the visible text moves about 14.7 px right when data arrives. |
| `.nv-card:has(.nv-stats)` at any depth | **Correct** | Every card that contains stats (Home Today; Team overview "This week") keeps its full width (16–304, 16–374; 24–820 in landscape) with `container-type:inline-size`. Their grids span the card, and values and labels each share one baseline (Home 390/329 at 320 and 354/293 at 390; Team overview 398/357 at 390). |
| Branded error screen | **Not reachable** | It is used by `src/app/error.tsx` and `global-error.tsx`, which only render when a root-level segment throws. I couldn't cause that read-only, so the band-to-card alignment at ≥640 px is unmeasured. Note for whoever owns it: errors inside `/app` routes still render `src/app/app/error.tsx`, the older unbranded `portal-route-state` markup, not the new screen. |

### New finding, round 10

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-52 | Home · M and O · 320–430 | Today card head while loading: "Loading…" over the hidden "Updated 12:00 PM" stamp | "Loading…" starts at the hidden stamp's **dot** (x 211.8 at 390, 141.8 at 320), not at its text (223.8 and 153.8), so it is 12 px left of the brief's intended position. Against the loaded stamp, whose text lands at 226.5 (390) and 156.5 (320), the visible text **jumps about 14.7 px right** when the time arrives. The meta box also narrows 2.7 px (142.2 to 139.5) because "12:00 PM" is wider than the real time. | r10/R10-today-loading-390.png | `portal-premium.css:891-893` stacks both children at `grid-area:1/1; justify-self:start`, and "Loading…" (`premium-home.tsx:124`) has no dot or indent, while the `.nv-fresh` stamp starts with a 6 px dot and a 6 px gap. | Render the placeholder as `<Freshness state="stale">Loading…</Freshness>`, so a grey dot sits where the green dot will be and the text starts 12 px in, exactly where the stamp's text starts. Alternatively, give the "Loading…" span `padding-left:12px`. | P2 |

### Round 10 verdict

My area does **not** have zero open defects this round. One P2 is new: AL-52, "Loading…" in the Today card starts 12 px left of the stamp's text (14.7 px from the loaded text), with a one-line fix. The day strip, Attendance states and stats cards all hold.

## Round 11

October 19, 2026 · Same preview, Manager account. Read only; the password was never printed. For the Today placeholder I held the page's own `/api/*` reads in my browser only. Crops are in `.../scratchpad/phase7/alignment/r11/` ("r11/" below).

### Status

| Item | Status | Measurement now |
|---|---|---|
| AL-52 (Today "Loading…" position) | **Fixed** | "Loading…" now starts exactly where the hidden stamp's text starts, behind a grey dot: 153.8 / 223.8 / 263.8 at 320 / 390 / 430, and 193.67 / 164.53 at 390 with 125% / 150% text. Its baseline equals the "Today" title's (289 at 320, 253 at 390 and 430). |
| The 2.7 px shift when the real time arrives (your question) | **Not a defect** | Measured shifts from the "Loading…" text to the loaded "Updated" text: 2.73 px at 320, 390 and 430 (for "2:xx AM"), 4.0 px at 125% and 4.86 px at 150%. That's my ruling, for three reasons: the shift happens in the same frame the words change ("Loading…" becomes "Updated 2:03 AM"), so the eye reads a content swap, not a jitter; it is under 5 px at the largest text size; and the stamp stays right-aligned to the card's 20 px text edge in both states, which is the alignment that matters in the head. Pinning the loaded stamp to the placeholder's left edge would leave a ragged gap at the right for most times, which is worse. If you want it to be exact, two options: (1) render the time with tabular figures and a fixed two-digit hour slot (a figure space before single-digit hours), so every time string has the same width as "12:00 PM"; or (2) after load, keep the ghost "Updated 12:00 PM" as an invisible width reserve under the real stamp, and set `justify-self:end` on both so they share the right edge. Option 1 changes how times look; option 2 keeps a fixed meta width. I'd leave it as is. |
| `src/app/app/error.tsx` (error inside `/app`) | **See AL-53** | I couldn't make an `/app` route throw read-only. Instead I rendered the boundary's exact static markup (`section.portal-route-state` with h1, p and `.portal-state-actions`) into the shell's `.page-frame` in my own browser, on the Inbox route, and measured it with the live CSS (r11/R11-app-error-inject-390.png, -320.png). This is a markup-equivalent check, not the live boundary; the boundary renders the same markup into the same container. |

### New finding, round 11

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-53 | In-portal error state (`app/app/error.tsx`) · any role · 320, 390, landscape | `section.portal-route-state` and its buttons | It doesn't follow the kit used on every other band page. The card edge is correct at 16–374 on phones (in landscape it sits at 32–812, against 24–820 for every other landscape card), but its padding is 32 px plus a 1 px border, so the heading and text start at **x 49** (65 in landscape). Every other card's text is at 36 (44). The radius is 12 against the kit's 20. "Try again" and "Back to home" are **44 px** against the kit's 52 (side by side at 390; stacked full-width at 320). The grey canvas ends at the bottom of the page frame (y about 472 at 390), with **white below it** down to the tab bar, so the canvas is two-toned. Kit pages fill the canvas to the tab bar. There's no band, so the page lacks the teal surface that every other phone screen has under the header. | r11/R11-app-error-inject-390.png, r11/R11-app-error-inject-320.png | `src/app/app/error.tsx` renders the legacy `portal-route-state` markup. The band-page rules key on `[data-nv-page]` (`portal-premium.css:17-18`, the 100dvh canvas rule), which this markup doesn't carry, so the legacy styles apply. | Render the in-portal error as a kit page: wrap it in `<div className="nv-page" data-nv-page>` with a `PageBand` (title "This page could not be loaded", summary as the paragraph), then a `Card` with the two actions as `.nv-btn` (52 px). Or reuse `AppErrorScreen` inside the shell. Either gives text at 36, radius 20, 52 px buttons and a full-height canvas. | P2 |

### Round 11 verdict

My area does **not** have zero open defects. AL-52 is fixed, and I rule the 2.7 px time-width shift not a defect. One P2 is new: AL-53, the in-portal error state still uses legacy geometry (text at 49, radius 12, 44 px buttons, a two-tone canvas, no band). It was measured from its exact markup rendered in the shell, since I couldn't trigger the live boundary read-only.

## Round 12

October 19, 2026 · Same preview. Read only; the password was never printed.
- For the error page I rendered the new `app/app/error.tsx` markup (kit classes, copied from the source) into the shell's page frame in my own browser and measured it with the live CSS.
- For Attendance states I held, failed or refused the page's own attendance read in my browser only, and simulated a hidden tab and an offline browser.

Crops are in `.../scratchpad/phase7/alignment/r12/` ("r12/" below).

### Status

| Item | Status | Measurement now |
|---|---|---|
| AL-53 (in-portal error state) | **Fixed** | **390:** band 0–390 from y 68, title and summary at x 16, card 16–374 overlapping the band by 72 px, radius 20, text 36–321. Buttons are 52 px from x 36 ("Try again" 36–151.6, "Back to home" 159.6–310), sharing baseline 328. **320:** card 16–304, buttons stacked full width 36–284, both 52 px. **430:** the title fits on one line, and the card and buttons are as at 390. **Landscape:** band text at 24 = card edge, text 44, radius 16. **1440:** band 282–1402, title at 318, card 298–1386, text and buttons from 318, so band and card text share one edge. In every case the canvas fills the screen to the tab bar (page 68–836 on an 844 screen) and the legacy section is `display:none`. The title wraps "This page could not / be loaded" at 320 and 390 (balanced). (r12/R12-app-error-{320,390,430,844L,1440}.png) |
| Attendance footer, state word only | **Correct** | "Paused.", "Offline." and "No access." are each a single line at x 48 behind the dot at 36, on baseline 578. The footer holds its 105 px height (`min-height:2lh`) and the same y (550), so nothing moves between live, checking, error, paused, offline and no-access. "Couldn't update. / Try Refresh." keeps its second line at 36. The Refresh button spans 36–354 in every state that has it. |
| Error titles `text-wrap: balance` | **Correct** | The 30 px band title breaks as 207 / 178 px lines at 320 and 390, and stays one line at 430. |
| Strip width rules phone-only | **Phones correct; desktop see AL-55** | 320–430 and landscape are unchanged: "Full week" 72 px, days 44 px, 8 px gaps, whole-day start at x 40 (phones) and 48 (landscape, strip 44–800). At 768 and 1440 the phone rules no longer apply, which exposes AL-55. |

One transient note, not a defect: one Attendance run with the read failing showed the full error page instead of "Couldn't update". Three re-runs, including a 12-second trace, all showed "Couldn't update. / Try Refresh." in the footer, so the one-off was the dev server recompiling at that moment.

### New findings, round 12

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-54 | In-portal error · Timecards · Payroll · decision bar · phones | Gap between paired buttons | Two side-by-side buttons are spaced differently on different screens: **8 px** on the new error page ("Try again" / "Back to home", and 8 px vertically when stacked at 320), **10 px** on Timecards ("View period" / "Refresh", 190→200) and Payroll ("Refresh" / "Prepare a draft", 147.4→157.4), and **12 px** in the review's decision bar (`.nv-actionbar`, kit). | r12/R12-app-error-390.png | No shared token for a button pair: the error page sets its own 8 px gap; the legacy toolbars keep 10 px. | Use the kit's 12 px (`--nv-s-3`, as in `.nv-actionbar`) for every two-button row and stack, including `.premium-error__actions` and the Timecards and Payroll toolbars. | P2 |
| AL-55 | Schedule day strip · M and O · 768 and 1440 (desktop, Phase 4) | Day buttons | With the width rules now phone-only, desktop day buttons are content-sized: 53.7, 48.4, 54.3, 49.8, 44, 45.3 and 49.7 px. Their centres step 55.1, 55.3, 56.0, 50.9, 48.6 and 51.5 px, so the days are visibly unevenly spaced. At 1440 the end fade still dims "Sun" although the strip doesn't scroll (scroll 0/0), and the strip spans only 322–803 of a 298–1386 card. At 768 the strip starts at x 284 against card text at 280 (4 px), and the gap between days is 4 px against 8 on phones. | r12/R12-strip-1440.png | The equal-width and gap rules for `.mws-day-navigation button` are now inside the phone media query; the legacy desktop rules size days to content. The end mask isn't tied to `data-more-end`. | At ≥761 px give day buttons the same `flex:0 0 2.75rem` (or equal `1fr` columns across the strip) and an 8 px gap. Start the strip at the card's text edge, and apply the end fade only when `[data-more-end]` is set. Desktop is Phase 4, so this can be scheduled there. | P2 |

### Round 12 verdict

My area does **not** have zero open defects. AL-53 is fixed, and the Attendance footer, error titles and phone strip are correct. Two P2s are new: AL-54 (button-pair gaps of 8, 10 or 12 px across screens) and AL-55 (unequal day spacing in the desktop strip, which can wait for Phase 4).

## Round 13

October 19, 2026 · Same preview. Read only; the password was never printed.
- The error pages were measured by rendering their kit markup in my own browser.
- In Schedule I opened "Build and publish" (a `details`) to reach the generation buttons, and chose Sunday in the day strip (a view filter).

Crops are in `.../scratchpad/phase7/alignment/r13/` ("r13/" below).

### Status

| ID | Status | Measurement now |
|---|---|---|
| AL-54 (button-pair gaps) | **Partly fixed** | 12 px now everywhere listed:<br>• In-portal error page: 12 side by side at 390 and 1440, 12 stacked at 320. `app-error-screen.css:5` also uses `gap:var(--nv-s-3)`.<br>• Timecards toolbar: stacked 12/12/12 at 320 and 390.<br>• Time exports toolbar: 12/12/12.<br>• Schedule generation buttons: 12 at 320 and 390.<br>• Review action bar: 12.<br>**Still 10 px: Payroll's "Refresh" / "Prepare a draft"** (147.4→157.4 at 390, 112→122 at 320), from `payroll-workflow.css:18` `.payroll-workflow .pw-actions { gap: 10px }`, a pair your list didn't cover. Fix: `gap: var(--nv-s-3)` there; it also covers every other `.pw-actions` row on Payroll. |
| AL-55 (day strip) | **Fixed on phones and in the strip itself; partly on desktop** | Day buttons are 44 px at every width. "Full week" is 72 px on phones and in landscape, 92 px at 768 and up. Gaps are 8 px between days at every width. The strip box starts at the result line's text: 36/36 at 320 and 390, 280/280 at 768 and 1024, 318/318 at 1440, 44/44 in landscape. The fade is now conditional: right-only at 320, 390 and 768 where the strip scrolls; none at 1024, 1440 or landscape. With Sunday chosen, the first whole day is at x 40 at 320 and 390. **Remaining, desktop only:** inside the same Team schedule card, the heading and its subline start at **284** (1440: 322) because `.mws-roster-heading` keeps 24 px padding, while the strip box and the "10 of 10 team members" line start at **280** (318) and the "Full week" shift cards at 282. Three left edges 2–4 px apart in one card (r13/R13-roster-768.png). On phones all three are 36. Fix: at ≥761 px set `.mws-roster-heading { padding-inline: 20px }`, so heading, strip, result line and shift cards share 280 (318). Desktop is Phase 4. |
| Error card sentence 17 px | **Correct** | 17 px / 24 px on phones and 16 px at 1440; its text starts at the card's 20 px inset (36; 318 at 1440). |

Notes (not filed):
- Between "Full week" and Monday the gap is 8 px on phones but 16 px at 768 and up and in landscape, with the separator line centred in it. Both read as intentional (a separator, not a day gap), so I don't count it.
- Home's "Try again" keeping the query is behaviour, not geometry; I didn't test it.

### Sweep

Home, Inbox, review, Schedule, Team, Timecards, Time exports, Payroll and the three Home views at 320 and 390 for both roles, plus Home, Schedule and Timecards in landscape. Nothing new; no horizontal scroll. Two probes caught a dev-server recompile without the band (Time exports at 320, Home at 390); re-runs measured both correctly. The only flagged line is the accepted "Manage targets" wrap at 320.

### Round 13 verdict

My area does **not** have zero open defects. Two P2s remain, each partly fixed: AL-54 (Payroll's button pair is still 10 px apart) and AL-55 (desktop only: the Team schedule heading starts 4 px right of the strip and result line).

## Round 14

October 19, 2026 · Same preview. Read only; the password was never printed. To see the failure and loading states, I answered the page's own `/api/manager/action-center` read with a 500, or held it, in my browser only. Crops are in `.../scratchpad/phase7/alignment/r14/` ("r14/" below).

### Status

| ID / item | Status | Measurement now |
|---|---|---|
| AL-54 (button-pair gaps) | **Fixed** | Payroll's "Refresh" / "Prepare a draft" is **12** at 320 (111.4→123.4) and 390 (146.4→158.4). Schedule's "Templates" / "More" at 1440 is 1159.75–1288.02 and 1300.02–1386, also 12. With earlier rounds, every two-button row and stack I've measured is now 12. |
| WR-60 (Timecards period toolbar, two columns) | **Correct** | Two columns again with a 12 px gap at every phone width: 16–154 / 166–304 (320), 16–174 / 186–344 (360), 16–189 / 201–374 (390), 16–209 / 221–414 (430). The date-field labels share a baseline (291 at 390), and "View period" / "Refresh" share one too (389), with 12 px between the field row and the button row. |
| AL-55 residual (roster heading inset) | **Fixed** | From 761 px the heading is `padding: 24px 20px`. At 768 the heading, subline, day strip and result line all start at **280**; at 1024 also **280**; at 1440 **318**. Landscape is 44 for all, phones 36 for all. |
| "Full week" from 761 px (IS-52) | **Correct** | One line (`nowrap`), 14 px at 100%. At 1440 the button is 322–414 (92 px) with text 336.67–399.31, centred to within 0.01 px horizontally and 0.5 px vertically; 768 is the same. It scales with the text: 115 px / 17.5 px at 125%, 138 px / 21 px at 150%, still one line and centred. Phones are unchanged (72 px, two centred lines). |
| Home, "needs you" read fails (ST-25) | **Correct** | The Next up card keeps its shape: "Next up" at 52 (behind its triangle at 36), the message "What needs you isn't available…" at x 36, centred in the 60 px main row (520–540, row 500–560), the cut line full width, and "Try again" a 52 px button spanning 36–354. "Also needs you" keeps its title at 36 on baseline 718, and its meta "● Not available" sits on the same baseline (dot 250.8, text 262.8, ends at 354). Its still placeholder rows put a 40 px dot at x 36 and lines at x 88, matching the real rows' tile and title edges, each dot centred on its row. (r14/R14-app-500-390.png) |
| Inbox status above placeholder (ST-26) | **Correct order; see AL-56** | Loading: "Loading your Inbox…" (x 36) sits above three placeholder rows (dot 36, lines 88, rows 62 px). Failed: the message at 36, then "Try again", a 52 px `.nv-btn` from x 36. Left edges and button height are right. (r14/R14-appinbox-hold-390.png, r14/R14-appinbox-500-390.png) |

### New finding, round 14

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-56 | Inbox (loading and failed states) · M and O · phones | First line of the status card | The first line starts **28 px** below the card's top edge (card 304, text box 332). Every other kit card's first line, including Home's failed Next up card ("Next up" at 444→464), starts 20 px down, so the Inbox status card's text sits 8 px lower than the rest of the system. | r14/R14-appinbox-hold-390.png | `inbox.css:22` gives `.inbox-status` `padding-top:20px`, and `inbox.css:23` adds `margin: 8px 0` to its paragraph. | `inbox.css:23` → `margin: 0 0 var(--nv-s-2)` (keep the 8 px below, drop it above). | P2 |

Note (not filed): Home's still "Also needs you" placeholder rows are 150 px tall, while the Inbox's are 62 px and the real rows they stand for are 124 px at 390. That's a placeholder-height choice, not an edge or baseline misalignment, so I leave it to the stability inspector.

### Sweep

Home, Inbox, review, Schedule, Team, Timecards, Attendance, Payroll and Time exports at 390 for both roles, plus Home, Inbox, Schedule, Team and Timecards at 320. Nothing else flagged; no horizontal scroll. One Timecards probe at 390 caught a recompile (page height 844, no toolbar); a re-run measured it correctly.

### Round 14 verdict

My area does **not** have zero open defects. AL-54, WR-60 and the AL-55 residual are fixed, and the new "Full week" type and the needs-you failure state are correct. One P2 is new: AL-56, the Inbox status card's first line sits 8 px lower than every other card's (28 against 20 px), a one-line fix.

## Round 15

October 19, 2026 · Same preview. Read only; the password was never printed. For the Inbox, I answered its `/api/manager/action-center` read with a 500, or held it, in my browser only. Crops: `.../scratchpad/phase7/alignment/r15/`.

| ID | Status | Measurement now |
|---|---|---|
| AL-56 (Inbox status card inset) | **Fixed** | The status line now starts **20 px** below the card top in both states and at both widths, matching every other card (Home's failed Next up: 444→464).<br>• **Loading:** card 304, "Loading your Inbox…" at 324 (390); card 328, line at 348 (320).<br>• **Failed:** card 304, line at 324 (390); card 328, line at 348 (320).<br>In both states the line comes first at x 36. 8 px below it come either the placeholder rows (dot at 36, lines at 88) or the 52 px "Try again" button from x 36. The card's bottom padding is 20 in both cases (placeholder ends 542, card 562; button ends 408, card 428, at 390). |

**Round 15 verdict:** My area has **zero open defects**: AL-56 is fixed in the loading and failed states at 320 and 390, and nothing else is open.

## Round 16

October 19, 2026 · Same preview. Read only; the password was never printed. I answered `/api/manager/today` (Home, Manager) and `/api/payroll/runs` (Payroll, Owner) with a 500 in my browser only. Crops are in `.../scratchpad/phase7/alignment/r16/` ("r16/" below).

### Status

| Item | Status | Measurement now |
|---|---|---|
| ST-27, Today card when its read fails | **Correct** | The card keeps the loading shape: head 50, stats 110, foot 52 (212 total) at 320, 390 and 430; landscape 50 / 88 / 52. The inline "Try again" sits in the meta slot **on the title's baseline**: 253 against 253 at 390 and 430, 289 against 289 at 320, 245 against 245 in landscape, and 348.02 against 348.02 at 150%. Its text **ends at the card text edge**, like the "Updated" stamp: 354 (390), 284 (320), 394 (430), 800 (landscape). Its 16 px icon is centred within 1 px of the label's x-height centre at 100% (cy 248 against about 248.9); at 150% it is about 1.1 px below, because the icon doesn't scale. The "–" values keep the loaded positions (x 36 / 152.33 / 271.66, baseline 354), and the foot message starts at 36. (r16/R16-app-390.png) |
| WR-61, Payroll failure card (`.pw-state`) | **Card correct; icon see AL-57** | White card 16–374 (16–304 at 320; 24–820 in landscape), padding 20, radius 20 (16 in landscape), no border, kit e1 shadow. The 25 px warning icon starts at the card text edge (x 36; 44 in landscape). Title, body and "Try again" share x 73 (icon + 12 px gap). The button is 52 px, teal, with its label centred (text 93–168.6 in 73–188.6). |

### New finding, round 16

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-57 | Payroll failure card · O · 320, 390, landscape | Warning icon against the title "Payroll unavailable" | The icon is top-aligned with a 2 px top margin, so its centre (314.5 at 390) sits **4 px below the title's cap-height centre** (310.5) and 3.25 px below the title line's centre (311.25). In landscape it's 258.5 against 254.5, also 4 px. Every other leading icon or tile in the system is centred on its first text line or block to within 1 px. | r16/R16-apppayroll-390.png | `payroll-workflow.css:36` `.payroll-workflow .pw-state svg { margin-top: 2px }` with the card's `align-items:flex-start`. A 25 px icon on a 22.5 px title line overshoots. | Set `margin: 0` and size the icon to the title line (22 px): its centre then lands at 311, matching the line centre. Or keep 25 px with `margin-top:-1.25px`. | P2 |

Note, a judgment call (not filed): the Payroll failure card puts "Try again" in the text column (x 73, after the icon), while the Inbox and Home failure states, which have no icon, put theirs at the card text edge (x 36). Inside an icon-plus-text card that's a reasonable layout, so I don't count it. If you want every failure button on the same edge, drop it to x 36 under the icon.

Also outside my area, for the interaction inspector: the Today card's inline "Try again" is 20 px tall (258–354 × 237–257 at 390), below the 44 px touch target the other controls keep.

### Round 16 verdict

My area does **not** have zero open defects. ST-27 is correct and the WR-61 card is correct. One P2 is new: AL-57, the Payroll failure icon sits 4 px low against its title.

## Round 17

October 19, 2026 · Same preview. Read only; the password was never printed. I answered the page's own reads with a 500 in my browser only (`/api/payroll/runs` as Owner; `/api/manager/action-center` and `/api/manager/today` as Manager), and simulated a hidden tab on Home. Crops are in `.../scratchpad/phase7/alignment/r17/` ("r17/" below).

### Status

| ID / item | Status | Measurement now |
|---|---|---|
| AL-57 / WR-62 (Payroll failure card) | **Fixed** | The alert icon is gone. Title "Payroll unavailable" (kit headline, 20 px below the card top at y 300), body text and "Try again" all start at the **card text edge**: x 36 at 320 and 390, x 44 in landscape. The card is 16–374 (16–304; 24–820), padding 20, radius 20 (16 in landscape), no border. The button is 52 px. |
| "Try again" icon and label centring | **Correct, one size note (AL-58)** | In every button, the icon plus label is centred on the button (offset 0.00), the gap between them is 8 px, and the icon sits within 1.2 px of the label's cap-height centre:<br>• Home "needs you" failure: 18 px icon, +0.18<br>• Inbox failure: 18 px, +0.18; at 150% text −0.22<br>• Payroll failure: **20 px**, +1.18<br>• Home Today inline retry (16 px by design): +0.46, 4 px gap<br>The error pages use the same `ArrowsClockwise size={18}` in an `.nv-btn`, which centres the same way as Home's. |
| "Paused" stamps on Home | **Correct** | "● Paused" (grey dot) in the Today and "Also needs you" heads sits on each title's baseline (253/253 and 718/718 at 390; 289/289 and 754/754 at 320) and ends at the card text edge (354 / 284), with text at 301.5 behind the dot at 289.5 (like the "Updated" stamp). |

### New finding, round 17

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-58 | Payroll failure card · O · phones and phone landscape | Refresh icon in "Try again" | It renders at **20 px** (56–76 at 390); every other "Try again" icon is 18 px. The source asks for 18 (`payroll-ui.tsx:31`, `size={18}`), but a legacy rule resizes it, so this icon sits 1.18 px below the label's cap centre against 0.18 for the 18 px ones. | r17/R17-apppayroll-390.png | `portal-gusto.css:158` (phones and phone landscape) sets `width:20px; height:20px` on SVGs inside `.pw-button` among other legacy buttons. | Exclude the payroll state button, or match kit buttons: `html body .app-shell.nevora-portal .page-frame .pw-state .pw-button svg { width:18px; height:18px }`. | P2 |

### Round 17 verdict

My area does **not** have zero open defects. AL-57 is fixed (Payroll's failure card now matches the others' edges), and the "Try again" centring and the "Paused" stamps are correct. One P2 is new: AL-58, Payroll's refresh icon is 20 px against 18 px everywhere else.

## Round 18

October 19, 2026 · Same preview, Owner account. Read only; the password was never printed. I answered `/api/payroll/runs` with a 500 in my browser only. Crops: `.../scratchpad/phase7/alignment/r18/R18-apppayroll-{390,844L}.png`.

| ID | Status | Measurement now |
|---|---|---|
| AL-58 (Payroll "Try again" icon size) | **Fixed** | The icon is **18×18** with no margin:<br>• 390: 56–74, centre y 388, 0.18 px from the label's cap centre. That matches Inbox's "Try again" (0.18) and Home's.<br>• 320: 56–74, centre 408 (+0.18).<br>• 390 at 150% text: centre 531.02 (−0.22).<br>• Phone landscape: 64–82, centre 332 (−0.18).<br>• Desktop width 844: 300–318 (−0.18).<br>Icon and label are centred together on the button (offset 0.00), with an 8 px gap. |

**Round 18 verdict:** My area has **zero open defects**: AL-58 is fixed at every width and text size checked, and nothing else is open.

## Round 19

October 19, 2026 · Same preview, Manager account. Read only; the password was never printed. In my browser only, I paused Home (a `visibilityState` override), took it offline (`setOffline`), answered the Inbox read with a 500, and held the Attendance read. Crops are in `.../scratchpad/phase7/alignment/r19/` ("r19/" below).

### Status

| Item | Status | Measurement now |
|---|---|---|
| Home paused or offline, "needs you" column | **Correct** | The column is held at its ready height: 761 px before and after at 390 (paused and offline), 872 at 320, 701 at 430.<br>• **Next up** takes its natural 221 px. The faint button placeholder is **52 px, x 36–354** (284 at 320, 394 at 430), with radius 12, matching the real "Try again" (20 px edges, radius 12). Its bottom sits 20 px above the card's bottom edge. The message "Updates when you're back." sits at x 36 in the main row.<br>• **Also needs you** starts 16 px below (681 at 390) and fills the rest of the column. Its "● Paused" stamp shares the title's baseline. Still rows: dot at 36, lines at 88.<br>• Both cards keep radius 20 with `overflow:hidden`. At 430 the third still row is clipped by the card's bottom edge (row to 1181, card to 1145) cleanly inside the rounded corner, and its dot stays whole.<br>(r19/R19-home-paused-{320,390,430}.png, R19-home-offline-390.png) |
| Inbox failure, filter row `tabIndex=-1` | **Correct (no visual change)** | Same geometry ready and failed: strip 0–390 at y 232, h 52; pills All 16–62.69, Act now 70.69–157.02, Requests 165.02–259.34, Plan ahead 267.34–374.27, all 44 px on baseline 263. The only difference is the existing disabled look (opacity .6). |
| Attendance Refresh busy (aria-disabled) | **Geometry correct; the look differs from your note** | Live, busy ("Refreshing…") and disabled (paused) all measure 36–354 × 44 at y 611, label on baseline 638, centred. The busy state is **not** at .55 opacity: `portal-premium.css:973` gives `[aria-disabled="true"]` `opacity:1` with a muted label, a white fill and a 1 px border. The disabled (paused) button is at .55. So busy and disabled look different, not the same. That's a visual or interaction call for whoever owns the intended look, not an alignment defect, so I haven't filed it. |

Notes (not filed, already with the stability inspector): the still rows are 150 px tall with the dot centred, so the first still dot sits about 55 px below the "Also needs you" head. At 320 the held column leaves about 135 px of empty card below the third still row (rows end 1217, card ends 1352). Both come from the 150 px row height noted in round 14; the edges and insets themselves are correct.

**Round 19 verdict:** My area has **zero open defects**. The held "needs you" column, the button placeholder's 20 px insets and 12 px radius, the cards' bottom radius, the Inbox filter row and the Attendance button geometry all measure correctly. One note for you: the Attendance busy state renders at opacity 1 with a muted label, not .55 as described.

## Round 20

October 19, 2026 · Same preview, Manager account. Read only; the password was never printed. In my browser only, I paused Home (a `visibilityState` override), took it offline (`setOffline`), and held the Attendance read. Crops are in `.../scratchpad/phase7/alignment/r20/`.

| Item | Status | Measurement now |
|---|---|---|
| Next up pinned when paused or offline | **Correct** | The card keeps its last ready height: **275** at 320, **230** at 390 and 430, identical before and after. The label row (464–484 at 390), the main row (500–569, h 69; 536–650, h 114 at 320), the cut (585; 666 at 320) and the slot don't move. The message "Updates when you're back." starts at **x 36** and is **centred in the main row**: its centre is 534.5 against the row's 534.5 at 390 and 430, 593 against 593 at 320. The 52 px slot keeps **20 px edges** (36–354 / 36–284 / 36–394), radius 12, and sits **20 px above the card's bottom edge** in every case. Paused and offline measure the same. |
| Plan ahead pinned | **Correct** | Same height before and after: 96 px at 390 and 430 (1558–1654 at 390), 116 px at 320. The "needs you" column also holds its height (761 / 872 / 701). |
| Attendance Refresh disabled = busy | **Correct** | Busy ("Refreshing…", aria-disabled), offline (disabled) and paused (disabled) now share one look: opacity **1**, muted label (rgb 95,102,106), white fill, 1 px inset border (rgb 213,218,217). Live differs only in its ink label. All four are 36–354 × 44 at y 611, with the label centred on baseline 638. |

**Round 20 verdict:** My area has **zero open defects**: the pinned Next up and Plan ahead hold every edge, the paused message is centred at the card text edge, and the Attendance busy and disabled states now match with no geometry change.

## Phase 3, round 1

October 19, 2026 · Employee and Lead screens on the same preview. Read only: no form, claim, swap, withdrawal, confirmation or correction was submitted, and the password was never printed.

**Accounts:** AUDIT-E (employee, in the shell's `data-employee-corporate` mode), AUDIT-LEAD, AUDIT-LONG and payroll-qa-a, plus AUDIT-M and QAOWNER for the shared Updates and Notifications.

**Coverage:** every screen in `PHASE-3-BRIEF.md`.
- AUDIT-E at 320, 390 and 430.
- AUDIT-LEAD at 320 and 390.
- AUDIT-LONG and payroll-qa-a at 390 on their relevant pages.
- Landscape 844×390 and 1440 for "nothing broken".

**Method:** a new generic probe (`probe2.js`), because the employee screens use CSS-module classes rather than `.nv-card` and `.nv-row`. It finds every white rounded surface, then measures its edges, radius, padding, first-text inset and the left edges of all its text, the gaps between cards, the band-to-content distance, head baselines and row centring. Crops are in `.../scratchpad/phase7/alignment/p3/crops/` ("p3/" below); JSON is in `p3/json/`.

### Correct (measured)

- **Band and shell:** no horizontal page scroll on any screen, width or account.
  - The header is 68 px with the wordmark at x 16, and the bell's box ends at 374.
  - Band eyebrow, title, summary, band link and band pills all start at x 16 (24 in landscape).
  - Band pills are 44 px with equal baselines and 8 px gaps (My shifts / Open shifts, New request / My requests, Available / Your requests, Usual week / Specific week).
  - Section tabs (Pay / Hours, Requests) start at 16.
  - Tab bar: five equal columns (73.19–73.2 px), icons on one centre line (800.75), labels on one baseline (830.75).
- **Home:**
  - The next-shift pass is 16–374 with its text at 36.
  - Clock status, To do and Recent activity are 16–374, radius 20, kit shadow, with their first text 20 px from the top. Head meta ("3 actions", "1 item", "Off Clock") sits on the title baseline (Δ 0 to 0.45) and ends at the 354 text edge.
  - To do and Recent rows centre their 40 px tile and chevron on the row (Δ ≤ 0.5). Card gap is 16.
- **Requests overview:** kit cards and rows (tile 36, text 88), gaps 16.
- **Time off:** the kit card's title and "1 request" share a baseline. The status tag and the timeline start at the card text edge (36); timeline dots sit 8 px before their text (52 and 164.6) on one baseline (505). "Withdraw this request" is at 36.
- **Availability:** a single card at 16–374, radius 20, text at 36.

### Findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-P3-01 | Several employee screens · E and L · 320–430 | Card radius and elevation | Kit cards are radius 20 with the e1 shadow (Home, Requests overview, Time off, Availability, Shift requests, My pay). Other employee cards on the same app use other styles:<br>• My time (E): 16, no shadow (×3)<br>• Timecards card: 16, no shadow<br>• My time (L, and E in landscape): 12<br>• Profile: Work details 12; settings list and Sign out 14 with a 1 px border and no shadow<br>• Notifications: 12, border, no shadow<br>• Updates: 12<br>• Open shifts (`?view=open`): 12<br>• Shift board empty state: 12, border<br>• Schedule's "What changed" and swap-intent feedback: 14, border<br>Moving between tabs, card corners and edges visibly change. | p3/P3-profile-390.png, p3/P3-mytime-emp-390.png, p3/P3-notifications-head-390.png | Legacy surfaces not mapped to the kit: `employee-mobile-corporate.css:124` and `:188` (radius 16), `profile.css:52` (14), `employee-schedule.css:27` and `:36` (14), `employee-schedule.css:78`, `updates-review.css:11`, `notification-inbox.module.css`, and the `globals.css` `.employee-view-surface` / `.employee-view-empty` rules. The employee block in `portal-premium.css` (from line 979) covers Home, Shift requests and the main Schedule cards only. | Map every employee surface to the kit card: `border-radius: var(--nv-r-card)`, `box-shadow: var(--nv-e1)`, `border: 0`. Do this in the employee block of `portal-premium.css` for `.employee-view-surface`, `.profile-settings-list`, `.profile-signout`, `.employee-view-empty`, `.my-schedule-feedback`, `.schedule-publication-change`, `.my-open-shifts`, `.updates-inbox`, the notification inbox and the corporate time and timecard surfaces. | P2 |
| AL-P3-02 | My schedule, Updates, Notifications, Home quick actions · E and L · 390 | Text inset inside cards | Kit cards inset text 20 px (x 36), but within the same screens:<br>• Schedule "Your week at a glance" and its rows start at **x 32** (agenda `padding: 0`, headings 16 in), while the amber banner above sits at 36. Open shifts (`?view=open`) is also at 32.<br>• The week card is padded 18/14/12.<br>• The swap-intent card text is at 33 and "What changed in your schedule" at 37.<br>• Updates: the "October 18, 2026" heading is at **32** while the filter group and rows start at 36.<br>• Notifications: the filter group and search field start at 31, "0 notifications" at 35, the bell icon at 35 and the title at 67.<br>• Home quick-action tiles inset their icon and label 14 px (label x 30 in a tile from 16). | p3/P3-schedule-cards-390.png, p3/P3-updates-top-390.png, p3/P3-notifications-head-390.png, p3/P3-home-quick-390.png | `employee-schedule.css:38` (`.my-schedule .my-schedule-agenda { padding: 0 }`, with headings at 16) and `:80` (`.my-open-shifts { padding: 0 16px 16px }` on phones); `.my-week-overview` phone padding 18/14/12; `updates-review.css` group heading; `notification-inbox.module.css` header and filters; `portal-premium.css:993` (quick tiles). | Use one 20 px inner inset. Agenda and open-shift headings and rows at 20 (text 36). Week card `padding: 20px`. Updates date heading at 20. Notifications filters, search and count at 20, with the title block starting at 36 (icon at 36, text after it). Quick tiles `padding: 20px` (or keep 14 and treat them as tiles, deliberately). | P2 |
| AL-P3-03 | Flat-band employee screens · E and L · 390 | Distance from band bottom to first card | It varies screen to screen: **20** (Time off, Schedule, Availability, Profile, Notifications, Shift board), **16** (My pay), **44** (My time, E), and **−72** (Requests overview overlaps the band like a Manager kit page). The Manager flat bands (Timecards, Payroll) use 16. Switching between Requests overview and Time off, two tabs of the same section, the first card jumps 92 px relative to the band. | p3/P3-hub-band-390.png against p3/P3-timeoff-band-390.png | The employee pages set their own content top margins. Requests overview uses the overlap band; Time off and the others use a flat band with 20 px. | Pick one per band type, as on Manager pages: flat bands put the first card 16 below the band; overlap bands overlap by 72. Make the four Requests tabs (Overview, Time off, Shift requests, Availability) use the same type. | P2 |
| AL-P3-04 | Shift requests, Profile, Home, Schedule · E · 390 | Gaps between cards | Kit gap is 16. Measured:<br>• Shift requests: **12** between assigned-shift cards (×4)<br>• Profile: **60** and **36** (the "App settings" heading sits loose between cards)<br>• Home quick-action tiles: **10** both ways<br>• Schedule: 36 before "Planning ahead"<br>• Lead My time: 20 | p3/P3-exchange-gaps-390.png, p3/P3-profile-390.png | `portal-premium.css:1027` (`gap: var(--nv-s-3)` for the exchange feed); `profile.css:34` (`margin-top: 24px` on Sign out) plus the settings heading margins; the quick grid's 10 px gap; `employee-schedule.css` footer margin. | Card stacks: `gap: var(--nv-s-4)` (16). Quick tiles: 12 (the kit's two-item gap). Put "App settings" inside the 16 rhythm (heading margin 0 0 12, card 16 below the previous one). | P2 |
| AL-P3-05 | Notifications · E, L, M and O · 320, 390, 1440 | "Your alerts" head and Refresh | The **Refresh** button's label sits **6.4 px below** the "Your alerts" title's baseline (9.7 px at 1440): the button is centred on the two-line title block, not the title. The bell icon (x 35) sits beside the second line, "Review an update.", rather than the title. | p3/P3-notifications-head-390.png | `notification-inbox.module.css` header grid (icon in a column spanning both lines; actions centred on the block). | Align the head to the title line: icon and Refresh `align-self:start` with a top margin that centres them on the title (`margin-top: calc((1lh - 44px) / 2)` for the 44 px button), or move "Review an update…" below the full-width head row. | P2 |
| AL-P3-06 | My time · E (phones) and L / E-landscape · 320–430, landscape, 1440 | Card head meta against the title | **E variant:** "Off Clock" pill baseline +2 px at 320 and −1 px at 390 and 430; "0 entries" −1.5 px. **L variant (and E in landscape and 1440):** "Off Clock" **−3.4 px**, "October 19, 2026" −2.6, "0 entries" −2.6, and the "Report missing time" button's label +6.9 (+7.4 landscape) against the "Corrections" title. Kit heads measure Δ 0. | p3/P3-mytime-lead-390.png, p3/P3-mytime-emp-390.png | My time card heads are `align-items:center` with mixed font sizes. They aren't the kit `.nv-card__head` (`kit.css:182`, baseline). | Use `align-items: baseline` on these heads (or the kit head), so the pill, date and count share the title baseline. Put "Report missing time" below the title, as in the E variant. | P2 |
| AL-P3-07 | Home · E, L and G · 390 | To do and Recent activity rows | Row titles start at **x 90** (40 px tile at 36, 14 px gap). Kit rows everywhere else, including the employee Requests overview two tabs over, put titles at **88** (12 px gap), so the two lists sit 2 px apart. | p3/P3-home-todo-390.png | The Home rows' own CSS-module gap (14 px) in `employee-home-reviewed.module.css`, not overridden by `portal-premium.css:989-991`. | `gap: var(--nv-s-3)` (12) on the Home row links, so titles start at 88. | P2 |
| AL-P3-08 | Updates · E, L, M and O · 390 | Update row arrow | In each update row the trailing arrow sits 55.8 px above the row's centre. It lines up with neither the row centre nor a text line: it falls between "Review needed" and the title (see crop). The leading icon is top-aligned to "Location announcement". | p3/P3-updates-top-390.png | `updates-review.css:26` `.updates-row { display:grid; align-items:start; … }`, so the arrow cell sits at the top of a tall row. | Centre the arrow on the row (`align-self:center`), as kit chevrons are (Δ 0), or top-align it with the title line. Keep the icon on the first line. | P2 |
| AL-P3-09 | My pay · E and P · 390 | "No published statements yet" state | A white card with its own shadow nested inside the white "Pay statements" card (inner box 36–354, radius 20, text at 56): card in card. Its text is inset 20 px further than the card's own text (36). | p3/P3-mypay-390.png | `payroll-ui.tsx` renders the empty state as `.pw-state` (styled as a full card in the Phase 2 WR-61 change) inside `.pw-panel`. | Inside a panel, render the empty state flat: `.pw-panel .pw-state { padding: 0; box-shadow: none; background: transparent; border-radius: 0 }`. Text then starts at 36. | P2 |

Notes, not filed:
- **My time's design depends on the account at phone width.** AUDIT-E (the shell's `data-employee-corporate` mode) gets the plain variant; AUDIT-LEAD gets the icon-and-inset variant that E also gets in landscape. The geometry issues are filed above (AL-P3-01, -06); whether one design should serve both is a product call.
- **Typography, for that inspector:** the band title is 24/30 px on My time and Timecards against 30/36 on every other band, so those two bands are shorter.
- Landscape and 1440 render without breakage (no sideways scroll, every band and card on its gutter). Desktop layout is Phase 4.

### Phase 3 verdict

My area does **not** have zero open defects on the Phase 3 screens. There are nine P2s (AL-P3-01 to -09), mostly legacy employee surfaces whose radius, inset, gap and head alignment don't yet follow the kit. Home, Requests overview, Time off and Availability measure clean.

## Phase 3, round 2

October 19, 2026 · Re-check of AL-P3-01 to -09 and a fresh sweep on the same preview. This was read only. Nothing was submitted, claimed, confirmed or saved, and the password was never printed.

**Timing:** the preview's source was still being edited from 07:39 to 07:51 (other inspectors' P3-WR fixes in `portal-premium.css`, `notification-inbox.tsx`, `employee-home-reviewed.tsx` and `employee-my-schedule.tsx`). I waited until the source had been quiet for three minutes. Then I re-ran the whole probe (96 page and width captures, 07:54 to 07:56) and every spot check below. All numbers are from after that point.

**Coverage:**
- AUDIT-E at 320, 390 and 430.
- AUDIT-LEAD at 320 and 390.
- AUDIT-M, QAOWNER and payroll-qa-a on their shared pages at 390.
- Landscape 844×390 (E and L).
- 1440 (E), for "nothing broken".

**Evidence:** crops are in `.../scratchpad/phase7/alignment/p3/crops2/` ("c2/" below), and the JSON is in `p3/json/`.

### Status of round 1 findings

| ID | Status | Measured now |
|---|---|---|
| AL-P3-01 | **Fixed** | Every employee card at 320–430 (E, L, M, O, P) is radius 20, e1 shadow, border 0; 16 at ≥768. The two bordered cards in landscape are filed as AL-P3-17. |
| AL-P3-02 | **Partly fixed** | **Fixed:** agenda heading and rows, open shifts, swap-intent and "What changed" now sit at 36. The week card has 20 padding. The Updates date heading and filters are at 36. The Notifications filters, search, count and footer are at 36. Quick-tile labels are at 36.<br>**Still open (all at 390):**<br>• **Notifications:** the date heading and row icons are at **34**. `.groups` has padding 0 8px and `.groupHeading`/`.row` have padding 10px (`notification-inbox.module.css:61`). c2/R2-notifications-390.png<br>• **Profile settings:** the "Notifications" row and Sign out put their icon at **32** and text at 64 (`profile.css:21`/`:55`, padding 12px 16px; the note is 48px in at `:61`). The calendar row in the same card puts its icon at 36. c2/R2-profile-settings-390.png<br>• **My pay:** the privacy note's icon is at **x 20** (`portal-premium.css:353`, `padding: 0 var(--nv-s-1)`). The band text, the card edge and the Updates footnote all start at 16. c2/R2-mypay-note-390.png<br>**Fix:**<br>• `.groups { padding: 0 0 12px }` with `.groupHeading`/`.row` padding-inline 20, so the heading and icon start at 36. Keep the unread tint full-bleed inside the card.<br>• Profile settings rows: `padding: 12px 20px`. Note: `padding-left: 68px`.<br>• `.pw-privacy { padding: 0 }`. |
| AL-P3-03 | **Partly fixed** | **Fixed:** the band-to-first-card gap is 16 on Hub, Time off, Shift requests, Availability, Profile, Notifications (E and L), Schedule and L My time. Updates runs band → compose button → footnote → card at **16 / 16 / 16**. My pay runs band → privacy note → card at **16 / 16**.<br>**Still open:**<br>• **E My time:** band (bottom 284) → content 308 → first card 324 = **40**.<br>• **E Timecards:** band 260 → "Choose a period" 300 = **40**. The cause for both is `employee-mobile-corporate.css:112`/`:118` (`.employee-view` / `.employee-my-time-view { gap: var(--corporate-space-6) }` = 24), plus the content's 16.<br>• **M and O Notifications:** the lead line "Alerts and messages for you…" ends at 257.5 and the card starts at 289.5 = **32**. `.premium-card-lead { margin-bottom: 16px }` (`portal-premium.css:1005`) adds to the column's 16 gap. c2/R2-notif-lead-M-390.png<br>**Fix:**<br>• `gap: 0` on `.employee-view`/`.employee-my-time-view` inside `.premium-employee-time` and the employee Timecards page.<br>• `.premium-employee-content > .premium-card-lead { margin: 0 }`. |
| AL-P3-04 | **Partly fixed** | **Fixed:**<br>• Shift requests 16 (×4).<br>• Profile 16, with "App settings" inside the rhythm.<br>• My time 16.<br>• Requests overview 16.<br>• Quick tiles 12 both ways (154→166, 1574.8→1586.8 at 320).<br>**Still open, Schedule:**<br>• **Before "Planning ahead": L 32, E 36.**<br>&nbsp;&nbsp;– L: the empty `.my-schedule-side` (height 0) still takes a 16 flex gap.<br>&nbsp;&nbsp;– E: `.my-schedule-changes .schedule-publication-change { margin: 0 0 20px }` (`employee-schedule.css:36`). Its phone reset at `:128` only applies in the wide layout.<br>• **Review jump → agenda: 28** (`.my-review-jump { margin: 0 0 12px }`, `employee-schedule.css:135`, plus the 16 gap).<br>• **`?intent=swap`, swap card → review jump: 32** (`.my-schedule-feedback { margin-bottom: 16px }`, `employee-schedule.css:27`).<br>**Still open, Timecards (E):** sections are spaced **24** (`employee-mobile-corporate.css:188`, `gap: var(--corporate-space-6)`).<br>Evidence: c2/R2-schedule-footer-390.png, c2/R2-schedule-footer-L-390.png, c2/R2-review-jump-390.png, c2/R2-timecards-top-390.png.<br>**Fix:** in the employee Schedule block, set `margin: 0` on `.my-review-jump`, `.my-schedule-feedback` and `.my-schedule-changes .schedule-publication-change`, and `.my-schedule-side:not(:has(> :not(:empty))) { display: none }` (or `:empty`, once the whitespace is gone). Timecards: `gap: var(--nv-s-4)`. |
| AL-P3-05 | **Fixed** | The Refresh button's centre and the bell's centre are both on the "Your alerts" line centre (Δ **0.00** at 320, 390 and 430; E, L, M and O). The label-to-title baseline difference (−1) comes from the 15 px label centred against the 17 px title, as with every kit head button. |
| AL-P3-06 | **Partly fixed** | **Fixed (E at phone widths):** "Off clock" and "0 entries" are Δ 0.<br>**Still open (L at 320 and 390, E and L in landscape, E at 1440):** "Off clock" **+3** and "0 entries" **+3**. The date is Δ 0.<br>**Cause:** the round 1 fix `portal-premium.css:1109` (`align-items: baseline`) aligns the badge to the h2's *synthesized* baseline. In this variant the h2's first flex item is `.my-time-section-icon` (20 px, no text), so the h2's baseline is the icon's bottom edge (y 344) rather than the "Current status" text baseline (y 341). c2/R2-mytime-L-head-390.png<br>**Fix:** the same as AL-P3-11, below. |
| AL-P3-07 | **Fixed** | Home To do and Recent row titles are at **88** (×5); the tile and chevron are centred (Δ ≤ 0.5). |
| AL-P3-08 | **Fixed** | The Updates row arrow's cyΔrow is **0** at 320, 390 and 430 for E, L, M and O. The icon stays on the first line. |
| AL-P3-09 | **Fixed** | My pay has one "Pay statements" card (16–374, radius 20); the empty-state text is at **36**; no card in card (E, L and P). |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-P3-10 | Home · E and L · 320–430 (all widths ≤ 760) | Space between the pass and Clock status | A **teal (#077572) slab** fills the 16 px gap between the pass (bottom 619) and Clock status (top 635) at 16–374. It also shows behind all four rounded corners of the Clock status card. It is the HoldHeight wrapper (`…__primary`, 16–374, 565 px tall, radius 8) painted as a primary button. It isn't present in landscape (wider than 760). | c2/R2-home-teal-390.png, c2/R2-pass-none-390.png | `mobile-workforce.css:81` styles every `[class$="__primary"]` under `.page-frame` as a primary button (`background: var(--mobile-accent)`, radius 8, min-height 48). The Home column wrapper's CSS-module class `employee-home-reviewed-module__…__primary` (`employee-home-reviewed.tsx`, `HoldHeight … className={styles.primary}`) ends in `__primary`. | Restrict the attribute selector to controls: `:is(button, a)[class$="__primary"]`. Or rename the module class (e.g. `.primaryColumn`). Then check that no other `__primary` layout box matches. A scan of all employee pages found only this one. | **P1** |
| AL-P3-11 | Home · E and L · 320–430, landscape, 1440 | Clock status "Off clock" pill | The pill's text baseline sits **+4.25 px** below the "Clock status" baseline. It was +0.45 in round 1, so this is a **regression**. | c2/R2-home-clock-390.png | `portal-premium.css:1109` (the AL-P3-06 fix) also matches Home's `.employee-time-current-heading`. Its h2 is `display:flex; align-items:center` with the 18 px clock svg first, so the h2's baseline is synthesized from the svg's bottom (y 675.25), not the text's (y 671). | Give both headings a text baseline: `:is(.employee-time-section-heading, .employee-time-current-heading) > h2 { align-items: baseline } … > h2 > :is(svg, .my-time-section-icon) { align-self: center }`. Then the h2's baseline is its text, and the pill, date and count sit on it (fixes AL-P3-06's remainder too). | P2 |
| AL-P3-12 | Timecards · E · 320–430 | "Draft" status on the "Your timecard" card head | The pill's baseline is **+2 px** below the title's. This was also present in round 1 and I missed it. | c2/R2-timecards-draft-390.png | `timecards.module.css:45` `.card > header { align-items: flex-start }`, with the pill's 5 px padding and 23 px line. | `.employee-corporate-timecard > header { align-items: baseline }` in the employee block. Kit heads measure Δ 0. | P2 |
| AL-P3-13 | Updates, Notifications, Profile · E, L, M and O · 390 | Leading tile or icon and the text after it | The same "icon then title" row is built four ways:<br>• **Kit and Home:** 40 tile at 36, gap 12 → text **88**.<br>• **Updates:** 36 at 36, gap 10 → **82**.<br>• **Notifications:** 40 at 34, gap 12 → **86**.<br>• **Profile "Work details":** 44 at 36, gap 12 → **92**.<br>Small-icon rows also differ: Schedule "Planning ahead" 20 + 12 → **68**; Profile settings 20 at 32 + 12 → **64**; Profile calendar 22 + 8 → **66**. | c2/R2-updates-row-390.png, c2/R2-notifications-390.png, c2/R2-profile-settings-390.png | `updates-review.css:96` (`36px … gap:10px`), `notification-inbox.module.css:61`, `profile.css:43` (`.profile-icon-tile` 44), and `profile.css:21`/`:55`. | One recipe: tile rows use a 40 tile at 36 with a 12 gap (text 88); small-icon rows use a 20 icon at 36 with a 12 gap (text 68). Apply it to Updates rows, Notification rows (after AL-P3-02), the Work details head tile and the Profile settings rows. | P2 |
| AL-P3-14 | Home · E · 390 (Home data held or failed) | Pass placeholder lines | Every placeholder line sits **8 px lower** than the line it stands in for:<br>• date 66 vs 58<br>• time 96 vs 88<br>• countdown 146 vs 138<br>• place 192 vs 184<br>• footer 234 vs 226<br>The padding also makes the block 24 px (8 + 16) taller than the lines it stands in for. When Home loads, every line moves up 8. | c2/R2-pass-hold-390.png against c2/R2-pass-none-390.png | `employee-home-reviewed.module.css:114` `.recovery { min-height: 96px; padding-block: 8px 16px }` is still applied to the placeholder (`premium-pass-placeholder` reuses `.recovery`). | `.premium-employee-home .premium-pass-placeholder { padding-block: 0; min-height: 0 }` beside `portal-premium.css:1188`. | P2 |
| AL-P3-15 | My schedule · E and L · 320 and 360 | Week strip | The strip is one row of 44 px days (no more wrapping). It spans the card (padding 6px 20px, margin −6px −20px):<br>• **360:** content is 348 against a 328 window. Sunday ends at **344, the card's edge**, so the left inset is 20 (Mon at 36) and the right inset is 0 until scrolled.<br>• **320:** content is 348 against 288. Sunday shows as a **4 px sliver** (300–304) and the strip scrolls 60 px with no other cue.<br>390 and 430 fit (Sunday ends 354/394). | c2/R2-weekstrip-320.png | `portal-premium.css:1149-1150` (`flex: 1 0 44px`, `padding: 6px 20px`, gap 0). Seven 44 px days plus 40 px of padding need 348 px. | At 360: `padding-inline: 10px; margin-inline: -10px` below 390 px. Seven 44 px days then fit exactly (26–334, equal 10 px insets). At 320 it must scroll: snap to days and keep at least half a day showing at the right edge, with the trailing fade used on the Manager day strip (Phase 2, AL-37), or accept 40 px days (7 × 40 = 280 within 288). | P2 |
| AL-P3-16 | Home · E and L · landscape 844×390 (and 1440) | Clock status, To do and Recent activity cards | Clock status and To do have a **1 px border plus the kit shadow**. Recent activity, beside To do, has no border. Text insets differ by the border (469.56 against 468.56). | p3/json/E-_app-844L.json (cards) | `employee-home-reviewed.module.css:163` (container ≥ 52rem: `.assignment, .recordedSlot, .actions { border: 1px solid … }`). `portal-premium.css:985` re-adds the shadow but not `border: 0`. | Add `border: 0` to the `portal-premium.css:985` rule. | P2 |

### Checked and correct

- **Page scroll:** no horizontal page scroll on any of the 96 captures. Every band is present.
- **Band titles:** My time and Timecards band titles are now 30/36 like every band.
- **Bands and skeletons:** the band heights match the employee skeleton values in `portal-premium.css:1158-1175` at 390:
  - Profile 104, Hub 104, Shift requests 236, Availability 192, My time 172, Timecards 148, My pay, Updates and Notifications 128.
- **Home band review line:**
  - "3 items need your review" is at x 16, 44 px tall.
  - While Home is held, the line becomes a 44 px placeholder note.
  - The band is 272 in both states.
- **Updates filters:** the group is at 36–354, with count chips on one baseline (395).
- **Employee More sheet:** full width (0–W) and docked to the bottom (844).
  - Rows run 16–374 with icons and labels at 28.
  - The name is at 28. "Sign out" ends at 362, mirroring the 28 inset.
  - Close is full width.
- **Week strip at 390 and 430:** seven days in one row, Monday at 36, Sunday ending at 354/394, labels centred (Δ 0). An interim state seen at 07:3x, where Sunday wrapped onto its own full-width row at 320–390, is gone after the settled edit.
- **Quick tiles:**
  - 12 px gaps both ways, label text at 36, radius 20.
  - Labels are bottom-aligned, so a one-line label sits on the same last line as a two-line neighbour. This is consistent.
- **Not filed:**
  - Landscape Schedule's "Today" navigation (+9.1) and "Confirm schedule" (+12.5) sit beside two-line blocks. They are centred on the block together with the calendar or check icon, a consistent pattern rather than a stray offset.
  - Shift requests' "Your assigned shifts" heading sits 24 below the band (its 8 px section-heading top margin). This is the kit section heading's 8 px top margin (`portal-premium.css:1028`), applied the same way on every Shift requests tab.

**Not measured:** the RouteSkeleton rows (for example Profile's placeholder rows). Next resolves the tab navigation without showing the segment placeholder when the request is held, so I couldn't keep it on screen. Two notes for the stability inspector:
- My schedule's real band is 192 at 320 against the skeleton's 168 (`portal-premium.css:1159` has no ≤ 389 override for `schedule`).
- AUDIT-LEAD's Time off band is 192 at 390 against the skeleton's 168.

### Phase 3, round 2 verdict

Not zero:
- AL-P3-01, -05, -07, -08 and -09 are fixed. AL-P3-02, -03, -04 and -06 are partly fixed.
- There are seven new findings:
  - one P1: AL-P3-10, a teal slab behind Home's Clock status from a stray `[class$="__primary"]` button rule;
  - six P2s: AL-P3-11 to -16, including the Home "Off clock" baseline regression caused by the AL-P3-06 fix.

## Phase 3, round 3

October 19, 2026 · Preview `http://127.0.0.1:51302`, fictional accounts (AUDIT-E, AUDIT-LEAD, AUDIT-ON, AUDIT-BREAK, payroll-qa-b, payroll-qa-a, AUDIT-LONG, AUDIT-M, QAOWNER). Read only: every non-GET request was answered in my browser (none reached the server), nothing was submitted, claimed, swapped, withdrawn, confirmed or saved, and the password was never printed.

**Coverage:** Chromium at 320 and 390 (and 360/430 for E and L), 100/125/150/200% text, and fresh-load landscape 844×390 for E, L, M and O. WebKit spot checks at 390 (100/200%) on E Home, Schedule, Time off (both tabs), L My time, Notifications, M Home, Inbox, review and O Payroll. Per the coordinator's cuts: no Firefox, no 768–1440 for E/L, and the shell (header, tab bar, More sheet, section tabs) isn't filed. Method: a new probe (boxes, Range text rects + font metrics for baselines, card insets, gaps, head baselines), one load per page with widths and text sizes applied in the page (checked identical to fresh loads at 390). Crops are in `.../scratchpad/phase7/alignment/crops/` ("crops/" below); source references are to the preview's copy of `src/` (checkpoint `8c4dd50` + this round's fixes).

**Server:** under the day's load the dev server answered `/api/employee/home`, `/api/timecards`, `/api/manager/action-center` and others with 503 on most attempts (retried 2–4 times each). Employee Home loaded once in Chromium and once in WebKit (AUDIT-E, now on shift); Lead, AUDIT-ON and AUDIT-BREAK Home, both Timecards pages and the Manager Inbox only rendered their failure states. Those failure states were measured; the loaded states listed under Gaps were not.

### Status of earlier items

| ID | Status | Measured now |
|---|---|---|
| AL-P3-02 | **Fixed** | Notifications date heading at 36, rows' tile at 36 and text at 88 (E, L, M, O). Profile settings rows: icon 36, text 68 (calendar row too). My pay privacy note icon at 16, text 41. |
| AL-P3-03 | **Partly fixed** | E My time: band → first card 16 (320–430, landscape). E Timecards: band 284 → "Choose a period" 300 = 16 (320). **Still open: M and O Notifications**, lead line box 212–257.5 → card 289.5 = **32** at 320 and 390 (200%: 485 → 517 = 32). The round-2 fix `portal-premium.css:1322` targets `.nv-content > .premium-card-lead`, but the line's parent is `.premium-employee-content` (`app/app/notifications/page.tsx:13`). Fix: `.premium-employee-content > .premium-card-lead { margin: 0 }`. |
| AL-P3-04 | **Fixed** | Schedule blocks 16/16/16 (E and L, 320 and 390, up to 200%); review jump → agenda 16, swap card → review jump 16; E Timecards sections 16 (h2 → fields 20 is the legend gap, then 12/12/16/16/16). |
| AL-P3-06 | **Fixed** | "Current status"/"Off clock", "Recent entries"/"0 entries" and "Today"/date Δ 0 for E and L at 320, 360, 390, 430 and landscape, 100–200%, and for AUDIT-ON ("Clocked in") and AUDIT-BREAK ("On break"). WebKit Δ 0.01. |
| AL-P3-10 | **Fixed** | The Home column is `…__mainColumn` with a transparent background; the 16 px between the pass and Clock status (955 → 971 at 390) is canvas (crops/R3-home-pass-clock-390-webkit.png). |
| AL-P3-11 | **Fixed** | Home "Clock status"/"Off clock" Δ 0 (Chromium and WebKit, 390). |
| AL-P3-12 | **Not fixed** | Timecards "Your timecard" vs "Draft": **+2** at 100% (803/805 at 320; 623/625 at 390), −2 at 200%. Both boxes start at the same top (783), so they are still top-aligned. The round-2 rule `portal-premium.css:1330` sets `align-items: baseline` on `> header`, yet the boxes still align at the top. Likely cause (not confirmed live: my computed-style probe hit a 503 on `/api/timecards`): `employee-mobile-corporate.css:199` restyles the same header for `data-employee-corporate`, and the identity block (`timecards.module.css:46`, `align-items: center`, an avatar first) gives the row no text baseline. Fix: add `align-items: baseline` to the `employee-mobile-corporate.css:199` rule itself (or `align-self: baseline` on `header > strong`). Kit heads measure Δ 0. |
| AL-P3-13 | **Partly fixed** | Fixed: Updates and Notifications rows (text 88), Work details (88), Profile settings (68), Planning ahead (68). Still four other recipes for an icon-led title inside a card at 390: My time (L) "Current status"/"Recent entries" 20 icon + 10 → **66**; Timecards "Period information" → **66**; Schedule week card 26 icon + 12 → **74**; Schedule "Confirm you've seen your schedule" → **78**. Fix as before: small icon 20 at 36 + 12 gap (68); tile 40 at 36 + 12 (88). |
| AL-P3-14 | **Fixed** | Held Home read (AUDIT-E, 390): the placeholder's lines sit at 326 / 356–396 / 406–440 / 452–476, the same 6/10/12 px steps as the loaded pass (date 646–670 → time 676–716 → countdown 726–760); the head at 286–314 equals the loaded "Your shifts" head. No 8 px offset. |
| AL-P3-15 | **Fixed** | 360: days 26–334 in a 16–344 card (10/10). 320: Monday at 26, the strip scrolls with the fade over a 14 px Sunday sliver (crops/B-AUDIT-E-app_schedule-320x844-t100.png). New text-size problem filed as AL-P3-17. |
| AL-P3-16 | **Fixed** (as far as rendered) | Landscape Clock status card: border 0 with the kit shadow. To do and Recent activity didn't render in landscape (Home read 503). |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-P3-17 | My schedule (and `?intent=swap`) · E and L · 320, 360, 390, 430, at 150% and 200% · Chromium and WebKit | Week strip day labels | Day buttons stay 44 px (45.4 at 390, 51 at 430) while their labels grow. **200%:** labels overlap by up to 13 px ("Mon" 18–78 against "Tue" 67–117 at 320) and the dates run together ("19202122232425"); at 390 the overlap is 11.6 px, at 430 5.9 px. **150%:** labels touch, 0.12 px apart at 320/360 and 1.56 at 390 ("TueWedThu"). | crops/AL-P3-17-weekstrip-320-200.png, crops/AL-P3-17-weekstrip-320-150.png | `portal-premium.css:1150` `.my-week-day { flex: 1 0 44px; min-width: 44px }` in px, with no gap (`:1149` `gap: 0`). | `.my-week-day { flex: 1 0 2.75rem; min-width: max-content; padding-inline: 4px }` and `gap: 4px` on `.my-week-days`, so buttons grow with the text and the strip scrolls (its fade already handles overflow), as the Manager strip does (44/55/66 px at 100/125/150%). | **P0** |
| AL-P3-18 | Time off, New request · E and L · 320, 390, landscape, all text sizes · Chromium and WebKit | Fieldset spacing | "Choose your dates" starts exactly at the bottom of the hint above it (500/500 at 390; 565/565 at 320; 861/861 at 200%), and "Note" starts at the bottom of the date fields (610/610 at 390; 763/763 at 320). The first fieldset sits 16 below the lead line. Headings jam against the content above them. | crops/AL-P3-18-timeoff-form-390.png | `portal-premium.css:1017` sets `margin: 0` on `.nto-fieldset` (removing `time-off.css:22`/`:114`'s 22–26 px) and adds no gap. | `.premium-employee-timeoff .nv-card .nto-form-fields { display: flex; flex-direction: column; gap: var(--nv-s-5) }` (20 between fieldsets and the note field). | P1 |
| AL-P3-19 | Time off, My requests (decided timeline) · E · 320 and 390 at 100% (390 at 150%) · Chromium and WebKit | Status pill per request | The pill alternates sides down one list: under the title at x 48–66 for "Waiting", "Declined" and the second "Approved" (two-date titles), right-aligned ending at 354 for "Withdrawn" and the first "Approved" (one-date titles). At 150% and 200% all five go under; in landscape all five are right. The timeline does the same: "Sent · Withdrawn" on one line, "Sent / Declined by …" on two. | crops/AL-P3-19-timeoff-pills-390.png | `portal-premium.css:1010` `.premium-timeoff-row__head { flex-wrap: wrap; justify-content: space-between }`; `:1011` `.premium-timeline { flex-wrap: wrap }`. | Pick one position: `.premium-timeoff-row__head { flex-direction: column; align-items: flex-start; gap: var(--nv-s-2) }` (the Inbox status-line pattern), and stack the timeline (`.premium-timeline { flex-direction: column }`). | P1 |
| AL-P3-20 | Profile · E and L · landscape 844×390 | Card widths and inset | The three cards in one column have three widths: Work details 16–459, App settings 16–513, Sign out 16–828 (at 150%: 16–636, 16–704, 16–828), with empty canvas to the right. Work details is padded **28** (text at 44) while every other landscape card uses 20 (text at 36). | crops/AL-P3-20-profile-844L.png | `profile/profile.css:6` `.profile-layout { align-items: start }` inside `portal-premium.css:1098`'s flex column, so cards shrink to content; `profile.css:8` `.employee-profile-panel { padding: 28px }` is reset only at ≤600 (`:41`). | In `portal-premium.css:1098` add `align-items: stretch`; add `.premium-employee-profile .employee-profile-panel { padding: var(--nv-s-5) }`. | P1 |
| AL-P3-21 | Availability, specific week (`?week=`) · E and L · 320, 390, landscape, all text sizes | Week context card | Content is inset **40** inside the card: tile at 56, "Weekly submission" at 120, the deadline icon at 56 with text at 88, "Not submitted" at 56; the first text is 42 below the card top. The grey deadline block spans 36–354 instead of the card width. Kit cards put text at 36, 20 from the top. | crops/AL-P3-21-avweek-390.png | `portal-premium.css:1044` gives `.av-week-panel` `padding: 20px` on top of its sections' own padding (`availability.css:168` `.av-week-context, .av-deadline { padding: 20px }`, `:170` `.av-submission-detail { padding: 16px 20px }`). | `.premium-employee-availability .av-week-panel { padding: 0; overflow: hidden }`: sections then run edge to edge with their own 20 inset (tile at 36, deadline band full width, text at 36/68). | P2 |
| AL-P3-22 | Home, My time (L), Updates, Notifications, My time (E) · E and L · 390 | Refresh control | One control, four shapes: Home `employee-time-refresh` radius 4, no border; Lead My time `employee-time-refresh` **radius 8 with a 1 px border**, white, ink label; Updates `updates-refresh` **45.5 px tall, radius 10**; Notifications and E My time radius 12, 44 px, no border. Labels stop short of the card text edge: Notifications 342 and E My time 342 (12 px), Updates 346 (8 px), against 354. | crops/AL-P3-22-refresh-mytime-L-390.png, crops/AL-P3-22-refresh-updates-390.png | `portal-premium.css:1282` (the quiet Refresh rule) lists only the Notifications button and `.employee-corporate-button--quiet`; `.employee-time-refresh` and `.updates-refresh` keep legacy styles. | Add `.employee-time-refresh, .updates-refresh` to the `:1282` rule (44 px, radius 12, no border, accent label), and `margin-right: -12px` on head-trailing Refresh controls so the label ends at 354, as band controls do. | P2 |
| AL-P3-23 | Shift requests, Your requests · E and L · 320, 390 | Assigned-shift cards | First text is **16** below the card top (every other card: 20–21). Inside, the date line starts at **62** (18 px icon + 8) and the detail lines at **60** (16 px icon + 8). | crops/AL-P3-23-shift-entry-390.png | `portal-premium.css:1029` `padding: var(--nv-s-4) var(--nv-s-5)`; `exchange-review.css:48`/`:51` (18 vs 16 px icons, both 8 px gaps). | `padding: var(--nv-s-5)` at `:1029`; date icon at 16 px (or a 6 px gap) so all three lines start at 60. | P2 |
| AL-P3-24 | My time · L · 320 and 360 (below 375) | Card padding | All four cards are padded **16** (text at 32) at 320 and 360, 20 at 390 and 430. Every other employee card is 20 at every phone width. | crops/AL-P3-24-mytime-L-320.png | `app/app/my-time/my-time.css:127` (`@media (max-width: 374px) … .employee-time-panel > section { padding: 16px }`). | In the employee time block of `portal-premium.css`: `.premium-employee-time .employee-time-panel > section { padding: var(--nv-s-5) }`. | P2 |
| AL-P3-25 | My time, Today's entries · AUDIT-ON (clocked in) · 320, 390 | Entry row | The total column ("4h 54m / In progress") ends at 283 and the "+" disclosure at about 315: the row's trailing edge sits **39 px** inside the card text edge (354), where kit chevrons end. The total's baseline (901.8) aligns with neither "Mon, Oct 19" (888) nor "7:12 AM" (916.5): it is centred on the three-line block. | crops/AL-P3-25-entry-390.png | `employee-mobile-corporate.css:167` (3-column grid) with the legacy `globals.css:12826` `summary::after { content: '+' }` taking a track. | Hide `::after` in the corporate view and put the disclosure in the last 24 px column ending at 354; `align-self: start` on the total so it shares the date's baseline. | P2 |
| AL-P3-26 | Several card heads · see measurement | Head meta against the title | Δ from the title baseline: Home pass "Your shifts"/"Published" **−2** (Chromium) / **−1.8** (WebKit) at 320 and 390; Schedule agenda "Your week at a glance"/"Published assignments only" and Open shifts head in landscape **−1.5** (−3 at 200%); Payroll run head in landscape (O) **+2** (−3 at 150/200%); review "Waiting" at 200% **+1.87** (Chromium) / +1.8 (WebKit). Kit heads measure Δ 0. | crops/AL-P3-26-pass-head-390-webkit.png, crops/AL-P3-26-agenda-844L.png | Centre-aligned heads: `employee-schedule.css:39` `.my-agenda-heading { align-items: center }`; the pass head in `employee-home-reviewed.module.css`; the review pill's glyph not fully scaling at 200%. | `align-items: baseline` on those heads (the pill's svg `align-self: center`), as on kit heads. | P2 |
| AL-P3-27 | Payroll · O · landscape 844×390 | Toolbar "1 payroll run" | The status line sits at the top of the row: its baseline is 247 while Refresh and "Prepare a draft" labels sit at 259.4, so it is about 10 px above the buttons' centre line. | crops/AL-P3-27-payroll-toolbar-844L.png | `portal-premium.css:675`–`676` (`.pw-toolbar { align-items: stretch }`, `> p { align-self: flex-start }`) apply at every width, though they were written for the stacked phone toolbar. | Scope `:675`–`676` to `@media (max-width: 600px)`; in a row the paragraph uses `align-self: center`. | P2 |
| AL-P3-28 | Updates · L, M (and any role when the read fails or is empty) · 390, landscape | "Updates unavailable" / empty block | A bordered (1 px), radius-12 box is nested full-width inside the Updates card (16–374; 16–828 in landscape), with its own top border under the Refresh row: a card inside a card. | crops/AL-P3-28-updates-failure-390.png | `.updates-empty` (`updates-review.css`) isn't flattened in the kit block (`portal-premium.css:1077` maps `.updates-inbox` only). | `.updates-inbox .updates-empty { border: 0; border-radius: 0; background: transparent; padding: var(--nv-s-5) }`. | P2 |

### Checked and correct

- Kit cards on E/L pages: 16–(W−16), radius 20, e1 shadow, border 0, text at 36, gaps 16 (320–430, landscape 16–828).
- Band → first card 16 on every flat-band employee page; band text at 16 (also in landscape).
- Profile: 16 above "App settings", 12 below it, 16 to Sign out (320, 390, 200%).
- Updates and My pay rhythm 16/16/16; Notifications heading, search, rows at 36/88.
- Clocked-in and on-break My time: heads Δ 0, card gaps 16, band → card 16.
- Manager/Owner (Home, Attendance, Team overview, review, Schedule, Team, Notifications, Updates, Payroll, Time exports, in-portal error page) at 320/390, 100–200%: no new edge, inset or baseline issue beyond AL-P3-26/-27; the error page keeps text at 36, overlap 72.

### Gaps

- **Not measured loaded (server 503s on every attempt):** Lead, AUDIT-ON and AUDIT-BREAK Home (pass for a lead, clocked-in and on-break clock cards); E and L Timecards with data (Draft measured from earlier loads); Manager and Owner Inbox; Time exports with data; Owner Home at 320/390 rendered the in-portal error page.
- payroll-qa-b's My pay showed "No published statements yet", so statement rows weren't measured.
- Submitting states (pending, failure, double tap) were not driven; every write was blocked in my browser.
- Seen in passing, not mine: at 150–200% the pass's "8:00 AM – 4:00 PM" breaks with the dash left at the end of the first line (type/copy).

### Phase 3, round 3 verdict

Not at zero: 1 P0 (AL-P3-17), 3 P1 (AL-P3-18, -19, -20), 8 P2 (AL-P3-21 to -28), plus AL-P3-12 not fixed and AL-P3-03 and AL-P3-13 partly fixed.

## Phase 3, round 4

October 19, 2026 · Preview `http://127.0.0.1:60059`, restarted after the 15:25 crash of 51349; the same code, freshly seeded. Fictional accounts: AUDIT-E, AUDIT-LEAD, AUDIT-ON, AUDIT-BREAK, AUDIT-LONG, payroll-qa-b, AUDIT-M and QAOWNER.

This was read only:
- Every non-GET request was answered in my browser.
- Nothing was submitted, sent, withdrawn or saved.
- The password was never printed.

Source references are to `.claude/worktrees/premium-phase-1` at 8c4264c. Scripts, JSON and crops are in `.../scratchpad/phase7/alignment/p3r4/` ("r4/" below).

**Coverage:**
- **Chromium, E and L, every listed page:** 320 and 390 at 100% and 200%.
- **Chromium, AUDIT-E, every listed page:** also 360 and 430 at 100, 150 and 200%.
  - About half of these ran before the crash (Home through My pay).
  - The rest were re-run on 60059.
- **Landscape 844×390 at 100% and 150%:**
  - E and L: Home, Schedule, Time off (My requests), Profile, My time and Timecards.
  - AUDIT-E only: Availability `?week=`.
  - Not run in landscape: Open shifts, Requests overview, Time off (New request), Shift requests, Availability (usual week), My pay, Updates and Notifications. The landscape run was cut by the crash and not repeated.
- **Specific states:**
  - AUDIT-ON and AUDIT-BREAK: Home and My time.
  - AUDIT-M and QAOWNER: Notifications and Updates.
  - QAOWNER: Payroll in landscape.
  - AUDIT-M: the single review at 200%.
  - AUDIT-LONG: Availability and Profile.
  - payroll-qa-b: My pay and Timecards.
- **More sheet:** all four roles at 320×568 and 390, at 100% and 200%, and in landscape.
- **WebKit at 390, 100% and 200%:** E Home, Time off (both tabs), Schedule, Profile and Timecards, and L My time.

The probe is the same as round 3 (box, Range and font-metric baselines), plus a per-selector computed-style probe (`sel-extra.js`) and a More-sheet probe (`more-extra.js`).

### Verdict

**Not at zero.**
- **Re-check:** 10 of 15 IDs are fixed (AL-P3-28 in source only, because it didn't render). 4 are partly fixed: AL-P3-13, -22, -25, and -26, which is still off on the Home pass head. 1 is still unmeasured (AL-P3-12).
- **New findings:** 1 P1 (AL-P3-29) and 2 P2 (AL-P3-30, -31).
- **Open in total:** 1 P1 and 6 P2. AL-P3-12 is also open as a gap.

### Status of earlier items

| ID | Status | Measured now |
|---|---|---|
| AL-P3-03 | **Fixed** | M and O Notifications: the lead line ends at 257.5 and the card starts at 273.5 (**16**) at 320 and 390. At 200%: 485.02 → 501.02 (16). |
| AL-P3-12 | **Not re-measured (gap)** | `/api/timecards` answered **503** on every load on 60059 (E, L and payroll-qa-b, Chromium and WebKit), so only "Couldn’t load timecards" rendered. The `align-items: baseline` rule is still at `portal-premium.css:1340`. |
| AL-P3-13 | **Partly fixed** | **Fixed:** My time heads are now plain titles at 36 (E and L). The week title has a 20 icon at 36 and its text at **68**. Planning ahead, Profile settings and Sign out are at 68. Notifications, Updates and Work details are at 88.<br>**Still off:** the "Confirm you’ve seen your schedule" card puts its 24 icon in a **32** column, so the text is at **80** (320–430, E and L, WebKit too). The icon is also centred on the whole copy block (icon centre 1981 against the title's first line at about 1940).<br>**Cause:** `employee-schedule.css:62` (phone `.my-schedule-review { grid-template-columns: 32px … }`) and `:117`. The round-3 fix at `portal-premium.css:1500` changed only the gap.<br>**Fix:** `.premium-employee-schedule .my-schedule-review:not(#nv-kit) { grid-template-columns: 20px minmax(0,1fr); align-items: start }` with the icon at 20 px, giving text at 68. Alternatively use a 40 tile at 36 for text at 88.<br>Crop: r4/crops/c-sched-review-390.png |
| AL-P3-17 | **Fixed** | Day buttons are now 44 / 66 / 88 px at 100 / 150 / 200%.<br>• The smallest label gap is 14.0 / 22.1 / 31.0 px and the smallest date gap is 20.7 / 31.2 / 41.6 px, at 320, 360, 390 and 430. Nothing overlaps.<br>• `data-overflow="true"` (the fade is on) whenever the strip overflows: at 320 for every text size, and at 150% and 200% at every width. |
| AL-P3-18 | **Fixed** | Time off form: lead line → first group **16** (366 → 382). Between groups **20** (500 → 520 and 630 → 650). The same at 320, 200% and in WebKit. |
| AL-P3-19 | **Fixed** (one position) | All five status pills sit under the dates at 390 and 320, 100% and 200%, in Chromium and WebKit (text at 66.13 in every row), and the timeline is stacked. P3-WR-08 (`portal-premium.css:1398`, phones and landscape) wins over the round-3 "top right" rule at `:1470–1472`, which is therefore unused on phones. The result is consistent. |
| AL-P3-20 | **Fixed** | In landscape (E and L, 100% and 150%), all three Profile cards span **16–828**, and Work details is padded 20 (text at 36). In portrait, all three cards span 16–(W−16). |
| AL-P3-21 | **Fixed** (portrait) | The specific-week card has `padding: 0`. Its first text is 20 from the top, the deadline icon is at 36 with its text at 68, and "Submitted" is at 36 (320, 390 and 200%; E and L). The landscape remainder is filed as AL-P3-31. |
| AL-P3-22 | **Partly fixed** | **Fixed:** Home Clock status, My time (E and L), Updates and Notifications Refresh are all one shape: 44 tall, radius 12, no border, padding 0 12, accent label.<br>**Still different, Home footer "Refresh home":** radius **4**, padding **8px 4px**, a **17 px** label next to the 15 px "Updated 3:13 PM", 205.7–325.4 at 390. Cause: `employee-home-reviewed.module.css:112` (`.refreshButton`) isn't in the `portal-premium.css:1292` list.<br>**Still different, head-trailing Refresh:** the label still ends **12 px** inside the card text edge (box 354, label 342), and in the Home clock card the icon starts at 48 rather than 36.<br>**Fix:** add `[class*="employee-home-reviewed-module"][class*="__refreshButton"]` to the `:1292` selector list (font `var(--nv-t-label)`). Optionally add `margin-inline: -12px` on the start or end side, so the label meets the 36/354 text edges.<br>Crop: r4/crops/c-home-refresh-390.png |
| AL-P3-23 | **Fixed** | Shift requests cards are padded 20 with text 20 from the top. The date line and both detail lines start at **60** (E and L, 320 and 390). |
| AL-P3-24 | **Fixed** | L My time at 320: all cards are padded 20, with text at 36. |
| AL-P3-25 | **Partly fixed** | **Fixed:**<br>• The total "2h 5m" now shares the date's line (baseline 885 against 886).<br>• The legacy `summary::after` resolves to `content: none` (`portal-premium.css:1488` works).<br>**Still open, AUDIT-ON at 390:**<br>• The total column ends at **233**.<br>• A "+" disclosure glyph still draws at about x 249–262 (crop).<br>• So the row's trailing edge is about **92 px** inside the card's text edge (354).<br>• The summary's computed grid is `minmax(0,1fr) max-content 24px`, yet the total starts at 153.6, so the children aren't in the columns intended.<br>**Likely cause:**<br>• Grid placement from `employee-mobile-corporate.css:167` and `my-time/my-time.css:117`.<br>• Another child or pseudo-element draws the "+". I didn't locate which, because the `::after` is already none.<br>**Fix:** give the summary's parts explicit columns: the date block `grid-column: 1`, the total `grid-column: 2; justify-self: end`, and the disclosure `grid-column: 3; justify-self: end`. The "+" then ends at 354 and the total ends 12 px before it.<br>Crop: r4/crops/c-ON-entry-390.png |
| AL-P3-26 | **Partly fixed; not fixed on Home** | **Fixed:** the Schedule agenda head and the Open shifts head (Δ ≤ 0.6, also in landscape), and Payroll's landscape toolbar (see AL-P3-27).<br>**Still off, Home pass "Your shifts"/"Published":**<br>• Chromium: Δ **+2.5** at 320, 390 and landscape (E, L, AUDIT-ON and AUDIT-BREAK), and **+5.5** at landscape 150%.<br>• WebKit: Δ **+3.16**.<br>• In round 3 it was −2, so the fix overshot. "Published" now sits low.<br>**Cause:** `employee-home-reviewed.module.css:42`: `.published` is `inline-flex; align-items: center` with the 5 px dot `::before` first. The pill's baseline is therefore synthesized from the dot's bottom edge, and `portal-premium.css:1491` aligns that to the title.<br>**Fix:** `[data-pass="true"] > header > [class*="__published"] { align-items: baseline } … ::before { align-self: center }`, so the text sets the pill's baseline.<br>Crop: r4/crops/c-home-passhead-390.png |
| AL-P3-27 | **Fixed** | Payroll in landscape (O, 100/150/200%): the status line box (268–288) is centred on the button row (256–300). |
| AL-P3-28 | **Fixed in source; not rendered** | On the reseeded data, Updates had items for E, L, M and O, so the empty or failed block didn't render. The rule is at `portal-premium.css:1494`. |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL-P3-29 | Availability (usual week and `?week=`) · E and L · 320 at 200% (also tight at 360 at 200%) · Chromium | "7 of 7 days available" count pill | The pill is one unbreakable line, 36–**327.9** wide, inside a card that ends at **304** (text edge 284). It runs **24 px past the card edge** and its last letter meets the viewport edge. At 360 at 200% it ends at 327.9, against a text edge of 324. Fits at 390 and 430. | r4/crops/c-av-daycount-320-200.png | `portal-premium.css:1290` `.av-day-count { white-space: nowrap; display: inline-flex }` | Let it wrap: `white-space: normal; max-width: 100%`, with `align-items: baseline` and the number kept whole. Or drop `nowrap` below 390 px. | **P1** |
| AL-P3-30 | My schedule (and `?intent=swap`) · E and L · 320–430, every text size, Chromium and WebKit | "West Office hasn’t published" note under the week strip | The note's top equals the day buttons' bottom: **0 px gap** (474.39 / 474.39 at 390; 554.11 / 554.11 at 150%; 735.81 / 735.81 at 200%). The selected teal "Mon 19" button sits directly on the grey note. The note's computed margin is 0, so `employee-schedule.css:143`'s `margin: 14px 0 0` is lost. The strip's `margin-bottom: −6px` (`portal-premium.css:1157`) also pulls the note up into the strip's padding. | r4/crops/c-sched-week-390.png | `portal-premium.css:1157` (strip `margin: -6px -20px`) and a reset of `.my-week-note` margin to 0 | `.premium-employee-schedule .my-week-note:not(#nv-kit) { margin-top: calc(var(--nv-s-3) + 6px) }`. That gives 12 px from the buttons; use 16 to match the card rhythm. | P2 |
| AL-P3-31 | Availability `?week=` · E · landscape 844×390 | Week context card inset | In landscape the sections are padded **24**: "Submitted" is at 40, the tile text at 104 and the first text 24 from the top. Every other landscape card uses 20 (text at 36), and the same card in portrait is 20. | r4/crops/X-E-avweek-844.png | `availability.css:168`/`:170` section padding at the landscape breakpoint. The round-3 fix only zeroed the panel. | `.premium-employee-availability .av-week-panel > :is(.av-week-context, .av-deadline, .av-submission-detail):not(#nv-kit) { padding: var(--nv-s-5) }` | P2 |

### Checked and correct

**Shared shell and More sheet:**
- E, L, M and O at 320×568 and 390, 100% and 200%. Close is 16–(W−16), 48 tall, ending 16 above the bottom.
- When the list scrolls, Close stays put (identical box at scrollTop 0 and at the end). The last row ("Sign out") ends 10 px above it (765 against 775).
- In landscape the sheet is 142–702 for all four roles, with Close sticky too.

**Bands and gaps:**
- Band → first card is 16 on every E/L page measured, in Chromium and WebKit.
- Card gaps are 16; Profile is 16 / "App settings" / 12 / 16.
- Kit cards are radius 20, e1 shadow, border 0, text at 36.

**Heads:** "Clock status"/"Off clock" and "To do"/"3 items" are Δ 0. "My requests"/"5 requests" is Δ 0. The agenda head is Δ ≤ 0.6.

**Time off form:** groups are 20 apart and the lead line → form is 16.

**Notifications:** M and O lead line → card is 16.

**Payroll in landscape:** the toolbar line is centred.

**Page scroll:** no horizontal scroll on any load. The AL-P3-29 pill overflows its card but not the page.

**Not filed:**
- **Profile tile:** `profile-icon-tile` stays 40 px at 200% (not rem). "Avatars and tiles sized in rem" may refer only to kit avatars, none of which render on these pages. Judgment call.
- **Calendar subscription in landscape:** its inner content measured at 44/72 in landscape against 36/64 in portrait. Those texts belong to a collapsed `details`, so they may not be on screen. I didn't open it, so this isn't filed.

### Gaps

- **Timecards with data (E, L and P) and AL-P3-12:** `/api/timecards` answered 503 on every load on 60059.
- **Landscape:** Open shifts, Requests overview, Time off (New request), Shift requests, Availability (usual week), My pay, Updates and Notifications weren't re-run after the crash.
- **Not measured on 60059:** 360/430 and 150% for E Profile, Updates and Notifications (Profile has 320/390 only). Every L page at 360/430.
- **AL-P3-28:** the Updates empty and failed states didn't render on the reseeded data.
- **Loading placeholders:** not measured by me this round; that is the stability inspector's area.
