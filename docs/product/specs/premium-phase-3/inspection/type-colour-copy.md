# Phase 7 inspection: type, colour and copy

October 18, 2026 · Inspector: type, colour and copy · Preview `http://127.0.0.1:51346` on fictional data · Source: worktree `.claude/worktrees/premium-phase-1` (read only, nothing changed)

## Verdict

**Not ready for a zero-defect pass. There are 2 P0, 9 P1 and 20 P2 findings.**

- **What holds.** The kit's token roles are right on almost every element, at 100% text size, on every screen, for both roles. Colour contrast passes everywhere text is used.
- **Where it breaks.** It breaks in three places:
  - **Large text and 320px.** The Today stat labels print over each other. On the review page, the Dates label shrinks to zero and the date is cut off. The "This week" value is clipped by its card.
  - **Wrapping.** Time ranges, clock times and double surnames break or truncate at 320px, at default text size.
  - **Copy that contradicts itself across screens:**
    - "missing", which F5 forbids, appears on 10 planning rows.
    - The Owner's Home says 8 planning items; the Inbox says 18.
    - Home says West Office is a draft; Schedule says "Not started".
- **Root cause of most P2 type drift.** A legacy phone rule, `src/app/mobile-workforce.css:68` and `:70`, outranks the kit on every `a`, `button` and `p` inside the page frame.

## How it was measured

- **Coverage.** I took 228 snapshots and read 27,447 elements with `getComputedStyle`.
- **Matrix:**
  - Manager `AUDIT-M` and Owner `QAOWNER`.
  - Screens:
    - Home
    - Inbox: All, Act now, Requests and Planning, with every `details` group open
    - The review from Inbox and from Home
    - Schedule, Team and Timecards
    - Payroll (Owner only)
    - The More sheet
  - Widths and text sizes: 320, 390 and 430 at root text size 100%, 125% and 150%. A spot-check at 1440.
- **Read per text element:**
  - font size, line height, weight, family and letter spacing
  - the colour, and the background composited through its ancestors' opacity
  - the WCAG contrast ratio
  - the words on each line, from Range client rects
  - clamp or ellipsis truncation
- **Icons.** I read each SVG's colour against its background.
- **Computed by hand.** Pseudo-element dots and bars aren't in the DOM scan, so I computed them by hand. The calculator is `cr.mjs`.
- **Cause lines.** Cascade sources come from CDP `CSS.getMatchedStylesForNode` (`why.mjs`).
- **Files.** Scripts, raw JSON and crops are in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/phase7/type-colour-copy/`. Below, `S/` stands for that folder.
- **Crops.** Element crops at 2x. The tab bar is hidden unless the crop is about it.

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-01 | Home · both · 320@125%, 320@150%, 390@150% | Today card stat labels `.nv-stat__label` "Scheduled today", "Clocked in now" | "Scheduled" is wider than its cell and prints into the next cell:<br>• 320@125: text right edge 128, cell right 112, 16px over<br>• 320@150: 145 vs 112, 33px over; "Clocked" 213 vs 208<br>• 390@150: 145 vs 135<br>The words overprint ("ScheduledClocked") and "Clocked" is cut by the coral cell. "No clock-in" breaks at the hyphen, "No / clock- / in". | `S/crops/tc-home-today-320-150.png`, `S/crops/tc-home-today-320-125.png` | `src/components/kit/kit.css:264-268`:<br>• three fixed `minmax(0,1fr)` columns<br>• 16px side padding<br>• no rule for when a label word is wider than its cell | • Make the card a size container: `.nv-card{container-type:inline-size}`.<br>• Add `@container (max-width:17.5rem){ .nv-stats{grid-template-columns:1fr} .nv-stat{flex-direction:row;justify-content:space-between;align-items:baseline;padding:12px 20px} .nv-stat+.nv-stat{border-left:0;border-top:1px solid var(--nv-hairline)} }`.<br>• Write "clock‑in" with U+2011, the non-breaking hyphen. | **P0** |
| TC-02 | Review (from Inbox and Home) · both · 320@150%, 320@125% | Request card, Dates row: `.nv-row__title` "Dates" and `.premium-fact` "Wed, Oct 28 – Thu, Oct 29" | • At 150% the "Dates" label is 0px wide and gone.<br>• The date starts at x 48 and ends at 354; the card ends at 304, so "Thu, Oc" is cut off.<br>• At 125% the date ends at 307 against 304, so "29" loses 3px plus the 20px padding. | `S/crops/tc-review-facts-320-150.png`, `S/crops/tc-review-facts-320-125.png` | • `kit.css:205`: `.nv-row__trail{flex:none}` keeps the max-content width of the fact.<br>• `.nv-row__text{flex:1;min-width:0}` (`kit.css:201`) collapses the label.<br>• The card's `overflow:hidden` (`kit.css:180`) clips the rest. | • `.premium-review .nv-row{flex-wrap:wrap}`<br>• `.premium-review .nv-row__text{flex:1 0 auto}`<br>• `.premium-review .nv-row__trail{flex:1 1 12rem;min-width:0;justify-content:flex-end}`<br>• `.premium-fact{white-space:normal}`<br>• Build each date with NBSPs (`Wed, Oct 28`) in `manager-time-off.tsx:35`, so the range breaks only at the dash. | **P0** |
| TC-03 | Home · both · 320@150% | This week, `.nv-progress__value` "1 of 2 locations" | The value is `nowrap` and ends at x 327; the card ends at 304. It reads "1 of 2 locatio" and the last 23px are clipped. | `S/crops/tc-home-week-320-150.png` | `kit.css:275-277`: the `.nv-progress__top` flex row doesn't wrap, and the value is `white-space:nowrap`. | `.nv-progress__top{flex-wrap:wrap;row-gap:2px}`. Keep the value `nowrap`, so it drops to its own line. | P1 |
| TC-04 | Home · both · 390 and 430 @100% | Today stat values `.nv-stat__value` | • At 390 and 430, "Scheduled today" and "Clocked in now" wrap to 2 lines (label height 40) and "No clock-in" stays on 1 (height 20).<br>• So the values don't line up: "3" and "0" have top 336, the coral "3" has top 316, 20px higher.<br>• At 320 all three labels wrap, so they align at 372.<br>• At 320@150 the tops are 476, 506 and 506. | `S/crops/tc-home-today-390.png` | `kit.css:265`: the value follows the label directly, with nothing aligning it to the cell bottom. | • `.nv-stat__value{margin-top:auto}`: grid cells already stretch to equal height.<br>• Optionally `.nv-stat__label{min-height:2lh}`, so the labels also share a top line. | P1 |
| TC-05 | Home "Also needs you", Inbox Act now, Inbox Earlier this week · both · 320@100% (and every width at 125% and 150%) | Coverage-gap meta `.nv-row__meta` | Time ranges break inside the range, at the default text size:<br>• "Sun, Oct 18 · 12:00 AM–" / "7:00 AM · Need 1 employee"<br>• "4:00 PM–" / "midnight · Need 1" / "employee"<br>• at 125%, "12:00" / "AM–7:00 AM"<br>Counts at 320@100: 2 rows on Home, 14 on Inbox. Across all runs: 128 time splits and 274 lines starting or ending on "·". | `S/crops/tc-home-alsoneeds-320.png`, `S/crops/tc-inbox-actnow-320.png` | `src/lib/assistance/manager-actions.ts:7-8` and `:126` build one plain string. The kit renders it as one text run (`premium-home.tsx:188`, `manager-inbox.tsx:62`). Only `ShiftRow` protects its time (`manager-inbox.tsx:74`, `nv-nowrap`). | In the kit, split `mobileActionDetail(detail)` on `" · "` and render each part as `<span class="nv-nowrap">`, joined by `" · "`. That keeps the data contract. A part longer than the row (sentence details have no " · ") stays plain. | P1 |
| TC-06 | Home Today card, Inbox band · both · 320@125%, 320@150% | Freshness stamp `.nv-fresh` "Updated 10:02 PM" | • The clock time breaks inside itself, "10:02" / "PM".<br>• The stamp takes 2 to 3 lines next to the card title.<br>• In the Inbox band at 320@125 it reads "Updated" with "10:02 / PM" stacked.<br>• 13 snapshots are affected. | `S/crops/tc-home-today-head-320-150.png`, `S/crops/tc-inbox-band-320-125.png` | `kit.css:291`: `.nv-fresh{display:inline-flex}` makes "Updated" and `<time>` separate flex items, and the `<time>` wraps on its own. | • `.nv-fresh{display:inline-flex;flex-wrap:wrap;column-gap:6px}`<br>• `.nv-fresh time{white-space:nowrap}`<br>• `.nv-card__head{flex-wrap:wrap}`, so the meta drops under the title instead of squeezing it | P1 |
| TC-07 | Inbox (All, Act now, Planning) · both · 320@100%; 390@125%; 430@150% | `.nv-row__title`: "María José Rivera Santiago With A Long Name", "Schedule acknowledgement pending" | • The double surname is clamped to "María José Rivera / Santiago With A Long…" at 320@100. It's the same person on Schedule, Team and Timecards, where the name is shown in full.<br>• "Schedule acknowledgement pending" is cut to "Schedule / acknowledgement…": scrollHeight 66 against clientHeight 44, text box 196px wide. The condition word "pending" is lost.<br>• Group titles ("Coverage gap at Main Office", "Weekly hour target missing") truncate at 320@125. | `S/crops/tc-inbox-actnow-320.png`, `S/crops/tc-inbox-ack-320.png`, `S/crops/tc-inbox-longname-390-125.png` | • `kit.css:202`: `-webkit-line-clamp:2` on every row title.<br>• Nested rows lose 26px to the group indent (`src/app/app/inbox/inbox.css:21`, 24px margin plus 2px border). | • Don't clamp person names: `.inbox-row .nv-row__title{display:block;-webkit-line-clamp:unset}`.<br>• Use 3 lines for the other row titles.<br>• Below 360px, reduce the nested indent to 12px: `margin-left:var(--nv-s-3)`. | P1 |
| TC-08 | More sheet · both · 320, 390 | `.nevora-action-menu-item` (Timecards, Time exports, Insights, Templates, Scheduling rules, Updates, My pay, Search, Sign out) | • The items are 14px/20.3px, weight 450, below the 15px floor.<br>• The group labels ("Time and reporting") are 15/20 at 600, so the headings outrank the items they head.<br>• The label text starts at x 85 and the item text at x 79, a 6px mismatch.<br>• "Close actions" is 17px. | `S/crops/tc-more-390.png` | • Items inherit the body's 14px (`body` 14px).<br>• Weight 450 comes from `src/app/app/portal-design-system.css` (`.nevora-action-menu-item`, cascade line 768).<br>• The group label padding is in `src/app/app/portal-premium.css:149`. | • `html body .app-shell.nevora-portal .nevora-action-menu-popover :is(.nevora-action-menu-item,.nevora-more-search){font:var(--nv-t-row)}` (17/22, 500)<br>• Keep the labels at `var(--nv-t-callout)` with weight 600.<br>• Change the label's `padding-inline-start` from 16px to 10px, so its text starts at 79. | P1 |
| TC-09 | Inbox All and Planning · both · all widths | Group and row titles: "Weekly hour target missing" (1 group and 10 rows) | F5 bans "missing" because it implies blame. The phrase shows 11 times, and the same work is "no weekly hour target" on the Owner setup card. `manager-actions.ts:110` also writes "…: N missing" into coverage-gap details; that isn't shown in this fixture. | `S/crops/tc-inbox-planning-390.png` | • `src/lib/assistance/manager-actions.ts:180` (title)<br>• `:110` (detail)<br>• `src/components/manager-action-center.tsx:26` (old group heading) | • Title: "No weekly hour target"<br>• Detail at `:110`: "{position}: {n} open"<br>• Group heading: "{n} people with no weekly hour target" | P1 |
| TC-10 | Owner · Home → Inbox · all widths | Home row "Planning and setup", meta "8 items to plan ahead. None are urgent." | The row opens `/app/inbox?filter=planning`, whose card says "Plan ahead 18". The 10 hour-target items moved to "Finish setting up" on Home but stayed in the Inbox. One link, two counts. | `S/crops/tc-owner-home-planning-row-390.png`, `S/crops/tc-owner-inbox-planahead-head-390.png` | `src/components/premium-home.tsx:76` (`withoutSetupItems` when `setupHoldsItems`) against `manager-inbox.tsx:127` (all items) | Use the same list on both. Either the Home meta says "18 items to plan ahead, 10 of them in Finish setting up", or the Inbox also drops setup items for the Owner and says where they went. | P1 |
| TC-11 | Home "This week" vs Schedule · both · all widths | "West Office is still a draft." vs the Schedule location tab "West Office · Not started" | The same location's state has two different names, and the Home sentence is wrong: nothing has been started. | `S/crops/tc-schedule-top-390.png`, `S/crops/tc-home-week-320-150.png` | • `premium-home.tsx:213-215` treats every unpublished location as a draft.<br>• `src/app/app/schedule/page.tsx:369` distinguishes Draft from Not started. | • Pass the state (published, draft or not started) into `PremiumHomeWeek.locations`.<br>• Say "West Office isn't started." or "…is still a draft." to match Schedule. | P1 |
| TC-12 | Home, Inbox, Review, Schedule, Team, Timecards · both · 320-430 | Kit `a`, `button` and `p` inside the page frame | A legacy phone rule with specificity 0,4,3 outranks the kit's single-class tokens:<br>• `.nv-filter` is 17/25.5 (token label 15/20).<br>• Band controls are 17/25.5 at 500 ("Add shift", "Add employee"); Refresh is 17/21.25 at 600 (token 15/20/500). So two weights for one control.<br>• Decline and Approve are 17/25.5; the Home button is 17/22 (token headline 17/22).<br>• "All pending time-off requests" is 17/25.5; every other `.nv-link` is 15/20.<br>• The Back link's line height is 25.5 (token 20).<br>• The review note is 15/24 (token body 17/24), so it's smaller than the 17px facts above it.<br>• Because the filters are wider, the Planning chip ends at x 383 at 390px, inside the 16px gutter. | `S/crops/tc-inbox-band-390.png`, `S/crops/tc-review-390.png` | • `src/app/mobile-workforce.css:70` (`:is(button,a,label,legend)` to `--mobile-body`/1.5)<br>• `:68` (`:is(p,li,dt,dd)` to `--mobile-caption`/1.6)<br>• `src/app/app/portal-gusto.css:150` lists `.inbox-refresh` (17px, 600, line height 1.25)<br>• Desktop at 1440 is correct (14/20, 16/22, 16/24), which confirms the phone rule. | • Scope both rules away from kit pages: `…:is(button,a,label,legend):not([data-nv-page] *)` and the same for `:is(p,li,dt,dd)`.<br>• Remove `.inbox-refresh` from `portal-gusto.css:150`. | P2 |
| TC-13 | Home · both · 320-1440 | Next up title `.nv-nextup__title` "3 shifts with no clock-in" | It renders at 550 weight, 20px/26px, −0.4px tracking. The token is title-3: 600, 19/25 and −0.012em on phone; 18/24 on desktop, where it also renders 20/26. | `S/crops/tc-home-nextup-390b.png` | `src/app/app/portal-design-system.css:47` (`.app-shell.nevora-portal .page-frame h2`, 0,3,1) beats `.nv-nextup__title`. `portal-premium.css:122` protects only `.nv-card__title`. | Next to `portal-premium.css:122`, add `html body .app-shell.nevora-portal .page-frame .nv-nextup .nv-nextup__title{font:var(--nv-t-title-3);letter-spacing:-.012em}`. | P2 |
| TC-14 | All screens · both · 320-430 | Tab labels `.mobile-nav-link span` | They render 12px/16.8px. The token is tab 13/16, 500, with 600 when selected. They don't follow text size: still 12 at 125%, and capped at 13 at 150%. | `S/crops/tc-tabbar-390.png` | `src/app/app/portal-gusto.css:346`: `font-size:min(0.75rem,13px)` | In `portal-premium.css:38-41` add `font:var(--nv-t-tab);letter-spacing:.01em`, and on `.active` `font-weight:600`. | P2 |
| TC-15 | All band screens · both · 320-430 | Header lockup "Workforce" `.login-brand-module` | It's 10px/15px and fixed in px, so it doesn't scale at 125% or 150%. Contrast is fine: #CFE3E1 on #1C4A47 is 7.42. This is a judgment call, because it's part of the logo lockup. | `S/crops/tc-header-390.png` | `src/app/app/portal-refinement.css:58-59` | Either draw "Workforce" inside the wordmark SVG so it's treated as logo, or set it to `.8125rem/1rem` (13px). | P2 |
| TC-16 | Inbox · both · all widths | Count badges `.inbox-section-count` (6, 1, 18, 10, 5, 12) | They're 13px/16px. The badge token is 12/16. That's above the floor, but off-token. | `S/crops/tc-inbox-actnow-320.png` | `src/app/app/inbox/inbox.css:9`: `font-size:.8125rem` after `font:var(--nv-t-badge)` | Remove `font-size:.8125rem`. | P2 |
| TC-17 | Home (Owner) · 320-1440 | "Finish setting up" card | Three weights for one row role:<br>• "Coverage periods" is 17/22 at **700** (a `strong`)<br>• "Set weekly hour targets" is 17/22 at 600<br>• kit rows are 500<br>The card's action link is 17/600, while every other text action (`.nv-link`) is 15/500. | `S/crops/tc-owner-setup-390.png` | • `portal-premium.css:92`: the UA's bold on `strong` survives `font:var(--nv-t-row)`.<br>• `portal-premium.css:94`: `font-weight:600`. | • `.owner-setup-done-row strong{font-weight:500}`<br>• `.owner-setup-link{font-weight:500}` | P2 |
| TC-18 | Review · both · 390@100% | "All pending time-off requests" link above the sticky decision bar | When the page loads, the link (y 704-748) sits under the decision bar (y 710-778). The bar's 16px fade covers the lower half of the link text, so it reads washed out until you scroll. | `S/crops/tc-review-bottom-390.png` | • `kit.css:301` (gradient bar)<br>• `portal-premium.css:134` (offset)<br>• the link is the bar's previous sibling (`manager-time-off.tsx:62`) | Move the link above the "Before you decide" card, or give `.premium-review-more` `margin-bottom:var(--nv-s-6)`, so it clears the fade at rest. | P2 |
| TC-19 | Home and Inbox bands · both · 320, 390 | Summaries `.nv-masthead__summary` | A count is split from its noun at the line end:<br>• Inbox at 390: "…3 urgent items and 1" / "request need you."<br>• Inbox at 320@125: "…clock-in, 3" / "urgent items…" | `S/crops/tc-inbox-band-390.png`, `S/crops/tc-inbox-band-320-125.png` | `src/lib/action-center/needs-you.ts:39` and `premium-home.tsx:47`: `${n} ${noun}` with a normal space | Use `${n} ${noun}` in both `plural` helpers. | P2 |
| TC-20 | Home and Inbox · both · 320-430 at 100% | Orphans in kit text | • Next up title "3 shifts with no" / "clock-in" at 320.<br>• Next up body "…· Main" / "Office" at 390@100.<br>• Shift rows "7:00 AM – 3:00 PM · Main" / "Office" at 320.<br>• Progress labels "Schedules" / "published" at 320.<br>• Owner setup "10 employees have no weekly hour" / "target." at 390.<br>• The masthead "Good evening," / "Morgan" at 320 is acceptable: two lines either way. | `S/crops/tc-home-nextup-320.png`, `S/crops/tc-inbox-actnow-320.png` | No `text-wrap` set on kit titles, and location names aren't protected | • `.nv-nextup__title,.nv-card__title,.nv-row__title,.nv-progress__label{text-wrap:balance}`<br>• `.nv-nextup__body,.nv-row__meta,.premium-home__setup p{text-wrap:pretty}`<br>• Wrap location names in `nv-nowrap` (`premium-home.tsx:140`, `manager-inbox.tsx:74`). | P2 |
| TC-21 | Inbox Planning · both · 320-430 | Meta "… is not included in hours-balance checks." | • It breaks at the hyphen, "hours-" / "balance checks.", on 12 rows at 320 and 390.<br>• "hours-balance checks" is internal jargon.<br>• "No clock-in" breaks the same way at 125% (TC-01). | `S/crops/tc-inbox-hyphen-390.png` | `src/lib/assistance/manager-actions.ts:181` | Change the copy to "{name} has no weekly hour target yet." (it ties to TC-09). Use U+2011 in "clock‑in". | P2 |
| TC-22 | Inbox groups · both · all widths | Group summary rows (`manager-inbox.tsx:85`) | • The title is one item's singular title: "Coverage gap at Main Office" heads 12 gaps; "Weekly hour target missing" heads 10.<br>• The count appears twice: the meta "10 items · earliest first" and the badge "10".<br>• "earliest first" makes no sense for undated items (hour targets, availability).<br>• Each child row repeats the group title word for word. | `S/crops/tc-inbox-planning-390.png`, `S/crops/tc-inbox-past-390.png` | • `src/lib/action-center/inbox.ts:60` (`title: item.title`)<br>• `manager-inbox.tsx:85` | • Group title: `taskGroupHeading(type, count, title)` (`manager-action-center.tsx:20`, after fixing TC-09's wording), e.g. "12 coverage gaps at Main Office".<br>• Meta: "Oldest first" only for dated types; otherwise none. Drop the number from the meta, since the badge carries it. | P2 |
| TC-23 | Home, Inbox, Schedule, Team · both | The same thing under different names | • **Planning:** "Planning and setup" (Home row), "Planning" (filter), "Plan ahead" (card).<br>• **Team:** the "Team" tab opens a page titled "Employees", next to "Team overview" and "Team tools".<br>• **Shifts:** "21 shifts this week" (Schedule band), "21 assignments" (the legacy line right below it), "21 shifts planned, drafts included" (Home).<br>• **Hour target:** "Set hour target" (Inbox action), "Set weekly hour targets" (Owner setup).<br>• **Partial day:** "Part of the day" (focused review), "Partial day" (pending list). | `S/crops/tc-schedule-top-390.png`, `S/crops/tc-team-band-390.png` | • `premium-home.tsx:229`<br>• `manager-inbox.tsx:25, 164`<br>• `navigation.ts` (tab) against the `employee-directory.tsx` band<br>• `schedule/page.tsx` band against legacy stats<br>• `action-center-navigation.ts:5`<br>• `manager-time-off.tsx:37` against `:96` | Pick one name for each:<br>• Filter, card and Home row all say "Plan ahead".<br>• The tab and h1 both say "Team".<br>• "shifts" everywhere, with the band saying "21 shifts this week, drafts included".<br>• "Set weekly hour target".<br>• "Part of the day" in both places. | P2 |
| TC-24 | Home, Team, Inbox · both | Numbers that don't name what they count (F8) | • "0 of 5" (Availability received; its neighbour says "1 of 2 locations")<br>• "10 active." (Team band)<br>• "4 items" (Also needs you)<br>• "3 urgent items" (Inbox band; they're coverage gaps) | `S/crops/tc-home-week-320-150.png`, `S/crops/tc-team-band-390.png` | • `premium-home.tsx:222, 180`<br>• `needs-you.ts:47`<br>• `employee-directory.tsx` band | • "0 of 5 people"<br>• "10 active employees"<br>• "3 coverage gaps today": name the type when every urgent item shares one, and keep "urgent items" only when they're mixed | P2 |
| TC-25 | Home, Inbox, Schedule · both | Time range format | • Server details: "12:00 AM–7:00 AM", no spaces.<br>• Shift rows: "7:00 AM – 3:00 PM", spaced.<br>• Dates: "Oct 28 – Oct 29", spaced.<br>• Legacy schedule: "8 am" / "– 4 pm".<br>• One list says "12:00 AM" for a start and "midnight" for an end. | `S/crops/tc-inbox-actnow-320.png`, `S/crops/tc-inbox-past-390.png` | • `manager-actions.ts:7`<br>• `manager-inbox.tsx:71`<br>• legacy schedule roster | Use one style: spaced en dash with NBSP and word joiner, `8:00 AM – 4:00 PM`. Say "midnight" for both ends, or for neither. | P2 |
| TC-26 | Inbox · both | Shift-row status: visible vs spoken | • The visible pill says "No clock-in" (finished) or "Not clocked in" (running).<br>• The row's accessible name says "No punches recorded" or "Started, not clocked in".<br>• That's four phrases for one state on top of Home's "shifts with no clock-in". | `S/crops/tc-inbox-actnow-320.png` | `manager-inbox.tsx:72` uses `STATUS_TEXT` (`src/lib/today/project.ts:86`); the pill is at `:75` | • Use the pill's words in the label: `${action} for ${name}: ${running ? "Not clocked in" : "No clock-in"}`.<br>• Keep exactly these two pill words everywhere. | P2 |
| TC-27 | Inbox Requests · both | Request row | • The title is "Time-off request" and the person goes in the meta, "Alexandra Rivera is waiting for review.", next to the pill "Waiting". That says waiting twice and buries the name.<br>• Act now rows put the person in the title. | `S/crops/tc-inbox-band-390.png` (row below the band) | `manager-actions.ts:142, 154, 165` + `manager-inbox.tsx:62` | Title: the person's name. Meta: "Time off · Wed, Oct 28 – Thu, Oct 29". Pill: "Waiting". | P2 |
| TC-28 | Inbox and Home, empty and offline states (read in code, not reachable with this fixture) | State copy | • The same state has different words: Home's band says "Nothing needs you right now."; Inbox says "Inbox clear" / "Nothing needs a decision in the checked sources." ("checked sources" is jargon).<br>• Offline: Home says "You’re offline. Numbers return when you reconnect."; Inbox says "Inbox unavailable offline" and "Updates paused — return to this tab to refresh." (em-dash style).<br>• Home's paused card says "Nothing here is out of date", which can't be promised while offline. | (code) | • `manager-inbox.tsx:19-22, 149`<br>• `premium-home.tsx:81-83, 202` | • Empty: "Nothing needs you right now." on both.<br>• Offline: "You’re offline. This updates when you reconnect." on both.<br>• Delete "Nothing here is out of date". | P2 |
| TC-29 | Home "Also needs you" (read in code; the fixture's 3 urgent items hide the request row) | Request avatar | The avatar initials come from the item title, so a time-off request shows "TR" ("Time-off request"), not the person's initials. | (code) | `premium-home.tsx:187`: `initials(item.title)` | Use the employee's name from the item (the field behind `request.employeeName`) or a `Tile` with `UserCheckIcon`, as the Inbox does (`manager-inbox.tsx:61`). | P2 |
| TC-30 | Inbox band · both | Live dot on the teal band `.nv-fresh::before` | The dot is #2E8A5B on #1C4A47: **2.31:1**, below 3:1 for a graphic. It's the only thing that tells live, stale and offline apart. In the card it's 4.28 on white, which is fine. | `S/crops/tc-inbox-band-390.png` | `kit.css:292` | `.nv-masthead .nv-fresh::before{background:#7FD6A8}`: 5.70 on #1C4A47 and 5.23 on the gradient top #1F504D. | P2 |
| TC-31 | New components · all | Strings that will block Spanish (F9) | These are hard-coded English sentence assembly, not templates:<br>• `needs-you.ts:35-51`: English plural, plus the list joined with ", " and " and ".<br>• `premium-home.tsx:47` `plural`; `:136` "X and N others"; `:140`; `:214-219` (draft sentences, "N of N locations"); `:229`.<br>• `manager-inbox.tsx:85` "{n} items · earliest first".<br>• `manager-time-off.tsx:37-42` "Wants … off.", "N full days".<br>• `kit.tsx:362` (spoken Duration).<br>The locale is hard-coded `en-US` in `premium-home.tsx:40`, `manager-inbox.tsx:35`, `manager-time-off.tsx:22, 26` and `manager-action-center.tsx:44`. | — | as listed | • Move each sentence to a keyed template with ICU plural, e.g. `{count, plural, one {# shift with no clock-in} other {# shifts with no clock-in}}`.<br>• Pass the workspace locale into every `Intl.DateTimeFormat`. | P2 |

Two judgement notes, not counted as findings:

- **"Today" as a coral pill.** F4 asks pills to state a condition. "Today" states timing.
  - In the Act now list, a gap timed "12:00 AM–7:00 AM" still says "Today" at 9:55 PM, after it has passed.
  - "Uncovered" would be the condition.
  - The past-gap logic belongs to the flow and data inspectors.
- **Progress bars on the track.** The bars are decoration and the words carry the value.
  - The amber fill #B87503 on the track #DDE2E1 is 2.87:1. The teal fill on the track is 4.22. The empty track on white is 1.31, so "0 of 5" draws almost nothing.
  - If the bar should count as a graphic, use #9A6200 (3.89 on the track, 5.10 on white).

Legacy content under the new bands (Schedule, Team, Timecards and Payroll keep their old content, as Phase 2 says) is outside the kit's floor. For the record, at 390 and 100%:

| Screen | Legacy text elements | Under 15px |
|---|---|---|
| Schedule | 104 | 11 (11px to 14px) |
| Team | 91 | 20 (avatars 13px, IDs 11px) |
| Timecards | 159 | 31 (13px to 14px) |
| Payroll | 168 | 44 (11px to 13px, including "Review required" at 11px) |

The legacy Schedule also repeats the band: "Oct 12 – Oct 18" a second time at 13px, and "1 of 2 published" at 12px.

## Checked and correct

**Type tokens at 100%, phone (320, 390, 430), both roles, every screen.** Each role matches its token:

| Role | Phone value | Where |
|---|---|---|
| title-1 | 30/36, 600, white | `h1.nv-masthead__title` on all 9 band screens |
| Eyebrow | 15/20, 500 | Masthead eyebrow |
| Summary | 17/24, 400 | Masthead summary |
| headline | 17/22, 600, #16191C | All 11 card titles, and the Owner "Finish setting up" title |
| Row title | 17/22, 500 | Rows |
| callout | 15/20, 400, #5F666A | Meta, foot, progress note and stat labels |
| Pills | 15/20, 500 | Status pills |
| Avatars | 15/20, 600 | Avatars |
| figure-l | 30/34, 600 | Stat values |
| Progress label | 17/22, 500 | Progress label |
| Progress value | 15/20, 600 | Progress value |
| Link | 15/20, 500 | Every `.nv-link` except TC-12 |
| Button | 17/22, 600 | Home `.nv-btn` link |

**Desktop at 1440.** The tokens switch correctly: title-1 32/40, headline 16/22, callout 14/20, figure 28/32, and the review note 16/24. The exceptions are TC-13 and the Back link at 17/20.

**Font family.** All text is Inter. The one exception is legacy employee IDs in JetBrains Mono on Team, which is intentional.

**Text size.** Every kit text element scales exactly with the root size at 125% and 150%, within 0.6px. The exceptions are the tab labels (TC-14) and "Workforce" (TC-15).

**No sideways scroll.** None of the 228 snapshots has any. `scrollWidth` equals the viewport.

**Contrast, measured** (ratio, then text on background):

| Text | Ratio | Colours |
|---|---|---|
| Masthead title | 9.91 | #FFFFFF on #1C4A47 |
| Over the watermark | 8.12 | #FFFFFF on #2C5754 |
| Band eyebrow and summary | 7.42 / 6.80 / 6.08 / 5.61 | #CFE3E1 on #1C4A47, on the gradient top #1F504D, over the watermark, and over both |
| Unselected filter | 6.33 | #E3EFEE on #335C59 |
| Selected filter | 7.38 | #07605F on #FFFFFF |
| Body ink | 17.65 | #16191C on white |
| Strong secondary | 10.01 | #3E4347 |
| Muted | 5.84 on white | #5F666A |
| Muted, hover and pressed rows | 5.52 / 5.14 | #5F666A on #F7F9F8 and #EEF1F0 |
| Waiting pill | 5.66 | #8A5300 on #FDF1DC |
| Today and No clock-in pills | 5.80 | #A3361F on #FBEAE6 |
| Urgent stat label | 6.20 | #A3361F on #FDF3F0 |
| Amber progress value | 6.33 | #8A5300 on white |
| Avatars and neutral tiles | 7.43 | #4A4F55 on #F1F3F4 |
| Links | 5.53 on white, 5.01 on the canvas | #077572 on #FFFFFF and #F2F4F3 |
| Primary button | 5.53 | white on #077572 |
| Selected tab | 7.35 (label), 5.67 (on its pill #CDE7E5) | #07605F |
| Unselected tab | 5.82 | #5F666A on #FEFFFF |
| More sheet labels | 5.84 | — |
| More sheet items | 17.04 | — |
| Inbox badges | 5.80 (coral), 7.43 (neutral) | — |

**Disabled states** (exempt from contrast rules, still readable):
- `.nv-btn:disabled`: 5.14, #5F666A on #EEF1F0.
- Disabled band control: 7.42.
- The only text under 4.5 is the legacy disabled "Fill gaps only" at 3.96 (opacity .55), which is exempt.

**Icons:**
- No SVG on any screen is under 3:1.
- Chevrons are 3.45 on white and 3.26 on the hover fill #F7F9F8.
- The masthead dot (#F08A6E) is 4.04 on #1C4A47.

**Wording rules:**
- No "missed", "live" or "Her note" anywhere in kit text, for either role. The review card title is "Note".
- No Approve or Decline in the Inbox or on Home.
- Actions are verbs in teal: Review timecard, View coverage gap, Review time off, Set hour target, Set deadline, View availability, View schedule, Contact, Open Inbox and Open schedule.
- Pills are states: Waiting, No clock-in, plus the "Today" judgement note above.
- All kit headings and labels are in sentence case.
- There's no "1 items": groups only form at 3 or more (`inbox.ts:48`), and the plural helpers are correct in every rendered count.

**F1 count.** "7 things need you today." equals "3 shifts with no clock-in, 3 urgent items and 1 request". That's Act now 6 plus Requests 1 on the badges, for both roles.

**The same element is consistent across screens:**
- Card meta, foot and freshness all use 15/20 with #5F666A.
- The freshness stamp is 400 weight in a card and 500 on the band. That follows the eyebrow role and is consistent within each context.

## Severity count

| Severity | Count | IDs |
|---|---|---|
| P0 | 2 | TC-01, TC-02 |
| P1 | 9 | TC-03 to TC-11 |
| P2 | 20 | TC-12 to TC-31 |
| **Total** | **31** | |

## Round 2

October 18, 2026, 22:53 to 23:39 · Same preview, same rules · Crops are under `S/r2/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

**The build changed while I was measuring.**
- Source files changed at 23:08, 23:13, 23:26, 23:31 and 23:37. A "Phase 7 round 3" block was being added to `portal-premium.css` as I finished.
- I discarded my first sweep (22:53) for anything those edits touched. I waited for the source to be quiet, then re-ran the full matrix from 23:17 to 23:35: 328 snapshots.
- Then I re-checked every item below directly, from 23:37 to 23:39.
- Anything changed after 23:37 isn't covered here.

**The matrix:**
- Both roles, every screen in the brief.
- Also the three Home views: `?view=attendance`, `?view=team` and `?view=activity`.
- The "Already decided" page (`requestId=does-not-exist`) and the pending list.
- 320, 390 and 430 at 100%, 125% and 150%, plus 1440.

**Loading placeholders and the toast:**
- I couldn't get a loading placeholder on screen. Holding the RSC request still left the old page showing. So I checked them in code: `src/components/route-skeleton.tsx` and every `loading.tsx`. They have no visible text, only an `sr-only` "Loading {label}…", and the band bars are decoration.
- I opened the real toast by visiting `?decided=timeoff-approved`. That's a URL only; no decision was made.

### Status of round 1 findings

| ID | Status | Measured now |
|---|---|---|
| TC-01 | Fixed | • At 320@125, 320@150 and 390@150 the Today stats change to stacked rows (`kit.css:272-277`). At 320@150, "Scheduled today" ends at 208 inside a 16–304 row, so nothing overprints.<br>• "No clock‑in" uses U+2011 and doesn't break. `S/r2/crops/r2-today-320-150.png` |
| TC-02 | Fixed | • The "Dates" label is visible (right edge 77–96) at every size.<br>• The fact stays inside the card: right edge 284 against card edge 304 at 320@150.<br>• What's left is a wrap issue, filed as TC-34. `S/r2/crops/r2-facts-320-150.png` |
| TC-03 | Fixed | At 320@150, "1 of 2 locations" drops under its label and ends at x 193 against card edge 304. `S/r2/crops/r2-week-320-150.png` |
| TC-04 | Fixed | The value tops are level: 326/326/326 at 390 and 430, 362×3 at 320 (`.nv-stat__value{margin-top:auto}`, `kit.css:271`). |
| TC-05 | Fixed | • At 100%, no kit row breaks inside a time or range at 320, 390 or 430. Times are kept whole with NBSP (`present.ts:12-16`).<br>• At 320@125 and 320@150, "12:00 AM – 7:00 AM" is about 170px and the text column is about 150px. It breaks once, after the dash, with both times whole. That's the best the column allows. `S/r2/crops/r2-alsoneeds-320-125.png` |
| TC-06 | Fixed | • `<time>` is `nowrap` (`kit.css:301`).<br>• In the Today card head at 320@150, "Updated 11:06 PM" is on one line under the title.<br>• In the Inbox band at 320@125 it breaks only between "Updated" and the time. `S/r2/crops/r2-today-head-320-150.png`, `S/r2/crops/r2-inbox-band-320-125.png` |
| TC-07 | Fixed | • The double surname shows in full in Inbox rows at every size (`inbox.css:28-29`).<br>• "Schedule not confirmed" isn't clamped.<br>• What's left is a group heading clamp, filed as TC-36. |
| TC-08 | Fixed | More sheet items are 17/22 at 500; group labels are 15/20 at 600. Both start their text at x 42. The button says "Close". `S/r2/crops/r2-more-full-390.png` |
| TC-09 | Fixed on Home and Inbox | No "missing" anywhere in their kit text. Titles read "No weekly hour target", "Schedule not confirmed" and "Not covered" (`present.ts:44-55`). "Missing" now appears in Attendance instead (TC-32). |
| TC-10 | Fixed | The Owner's Home says "18 items for the coming weeks", and the Inbox's Plan ahead says 18. |
| TC-11 | Fixed | Home says "West Office isn’t started yet.", which matches Schedule's "Not started". |
| TC-12 | Fixed | • Filters: 15/20.<br>• Refresh, Add shift and Add employee: all 15/20 at 500.<br>• Decline and Approve: 17/22.<br>• The review link: 15/20.<br>• The review note: 17/24.<br>• Back: 17/22.<br>• At 390 the "Plan ahead" chip ends at x 374, exactly the 16px gutter. |
| TC-13 | Fixed | 19/25, 600, −0.012em (`portal-premium.css:204`). |
| TC-14 | Partly fixed | • Tab labels are now 13/16 at 100%.<br>• They scale only to 15px: 15/20 at 125%, 15/24 at 150%. The cap is `min(.8125rem,15px)` at `portal-premium.css:41`.<br>• The selected label is 500, not 600 (`portal-premium.css:457`, ST-13, so the width doesn't change).<br>I accept both: the pill and the colour show which tab is selected, and a fixed tab bar is a reasonable place to cap. Logged so they're on record. |
| TC-15 | Fixed on band pages | "Workforce" is 13/16 and scales. It's still 10px on the pending list page (`/app/requests?tab=pending`), which has no band and is still legacy (`portal-refinement.css:58-59`). |
| TC-16 | Fixed | Badges are 12/16. |
| TC-17 | Fixed | "Coverage periods" is 500 and the link is 500. A size mismatch is left, filed as TC-35. |
| TC-18 | **Not fixed** | • The decision bar is now opaque after 8px. When the page loads, "All pending time-off requests" (y 698–742) is under it (y 700–776), so it's completely hidden.<br>• It only appears after a 74px scroll (scrollHeight 918).<br>• Cause: the link is the bar's previous sibling (`manager-time-off.tsx`, `premium-review-more`), and the bar is docked by `portal-premium.css` (ST-03/ST-07).<br>• Fix: put the link above the "Before you decide" card, or give it `margin-bottom: 80px`. `S/r2/crops/r2-review-bottom-390.png` |
| TC-19 | Fixed | Each count is joined to its noun with NBSP. At 320@125 the Inbox summary breaks as "3 coverage" / "gaps", so the number stays with its noun. |
| TC-20 | Partly fixed | • Titles are balanced: "3 shifts with no clock‑in" is on one line at 320.<br>• But at 390@100 the Next up body breaks as "Morgan Rivera and 2 others" / "· Main Office", so the line starts with the separator.<br>• Cause: `premium-home.tsx`, `noClockInPick`, builds `${names} · ${location}` with plain spaces.<br>• Fix: `${names} · ${location}`. `S/r2/crops/r2-nextup-390.png` |
| TC-21 | Partly fixed | • "hours-balance" is gone, and kit "clock‑in" no longer breaks.<br>• Team tools still breaks "Reconnect a shared clock-" / "in device" at 390@100 (`premium-home.tsx:275`).<br>• Fix: use `clock‑in` there too. `S/r2/crops/r2-tools-390.png` |
| TC-22 | Partly fixed | • Group headings are plural ("12 coverage gaps at Main Office", "10 people with no weekly hour target").<br>• "Oldest first" shows only for dated groups, and the count appears once.<br>• The child-row wording is filed as TC-37. |
| TC-23 | Partly fixed | Now consistent:<br>• Plan ahead (filter, card and Home row)<br>• Team (tab and h1)<br>• shifts (Schedule)<br>• "Set weekly hour target"<br>• "Partial day" in both places<br>The new name splits are filed as TC-38. |
| TC-24 | Partly fixed | • Now say what they count: "0 of 5 people", "3 coverage gaps", "10 active employees" (at 390 and up), "Showing 8 of 10 people".<br>• Still unnamed:<br>  • Home's "Also needs you" meta "3 of 4": 3 of 4 what?<br>  • Attendance's "0 to review · 0 people · 0 corrections" ("0 people" doing what?)<br>  • At 320 the Team eyebrow hides its noun and reads "10 active" (`.premium-wide-only`, `portal-premium.css:615`).<br>• Fix:<br>  • "3 of 4 items"<br>  • "0 people with something to review", or drop that count<br>  • see TC-33 for Team |
| TC-25 | Partly fixed | • Kit rows everywhere use "8:00 AM – 4:00 PM", and so does the rebuilt Activity.<br>• The Schedule roster still says "8 am" / "– 4 pm" (lowercase, minutes dropped, one shift split across two lines). |
| TC-26 | Fixed | The accessible label uses the pill's words: "No clock‑in" or "Not clocked in" (`manager-inbox.tsx:82-83`). |
| TC-27 | Fixed | Name as the title, then "Time off · sent Oct 18", then the Waiting pill. The sent date now uses the workspace day (`present.ts:20-27`). `S/r2/crops/r2c-requests-390.png` |
| TC-28 | Fixed (read in code) | • Empty state: "All caught up / Nothing needs you right now."<br>• Offline: "You’re offline. This updates when you reconnect." on both Home and Inbox.<br>• "out of date" is gone. |
| TC-29 | Fixed (read in code) | Initials come from the person (`premium-home.tsx:207`). |
| TC-30 | Fixed | The dot on the band is #7FD6A8: 5.70:1 on #1C4A47 and 5.23 on #1F504D (`kit.css:303`). |
| TC-31 | Deferred | Planned for Phase 6 (F9). Not refiled; I agree with deferring it. |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-32 | Attendance (Home view) · both · all widths | "What we compare" disclosure, opened | • It shows raw internal data on a page that now has the new band: "Observed 2026-10-18 23:37:39.083741-04 · Source b2f6e1a6ac6f" and "Company revision 0; location revision 0". The timestamp breaks inside itself at 430@125.<br>• The rule labels "Missing clock-in: Not configured" and "Missing clock-out: Not configured" break F5, and they contradict Home's "No clock‑in". | `S/r2/crops/r2c-attendance-390.png` | `src/components/configured-attendance-policies.tsx:6-7` (labels), `:104` (Observed and Source), `:115` (revisions) | • Labels: "No clock-in", "No clock-out".<br>• Replace the line with "Checked 11:37 PM" (workspace time, `Intl`).<br>• Move source and revision behind the existing "Source reference" disclosure, or drop them. | P1 |
| TC-33 | Team · both · 390@150, 430@150; 320 at every size | Band eyebrow "10 active employees" | • At 150% the eyebrow is cut to "10 active em…": scrollWidth 210 against clientWidth 161, `text-overflow: ellipsis`, sharing a row with "Add employee".<br>• At 340px and below, the noun is removed on purpose, so it reads "10 active". | `S/r2/crops/r2c-team-band-390-150.png` | • `portal-premium.css` (WR-42 block: `.premium-team .nv-pageband__eyebrow-row{flex-wrap:nowrap}` with the eyebrow ellipsis)<br>• `:615` (`.premium-wide-only`)<br>• `employee-directory.tsx:33` | Put the count in the summary, which can wrap: eyebrow empty, summary "10 active employees. Find someone, or add a new hire." Or let the eyebrow row wrap so "Add employee" drops below. | P2 |
| TC-34 | Review · both · 320@100 to 150%, 390@125/150, 430@150 | Request card facts | • The date range breaks at the dash, "Wed, Oct 28 –" / "Thu, Oct 29", because the value column next to "Dates" is about 195px at 320.<br>• At 390@150 "2 full days" drops below "Length" while "Dates" keeps its value beside it, so two rows of one card use two layouts. | `S/r2/crops/r2-facts-320-100.png`, `S/r2/crops/r2-facts-390-150.png` | `portal-premium.css:218` (`.premium-review .nv-row__trail{flex:1 1 10rem}`) | • Give the card a size container: `container-type:inline-size`.<br>• Under 22rem, stack every fact: `.nv-row{flex-direction:column;align-items:flex-start}`.<br>• Keep the range with NBSP and U+2060 around the dash, so it never breaks. | P2 |
| TC-35 | Home · Owner · all widths | "Finish setting up" steps | The two steps of one list are different sizes: the done step "Coverage periods" is 17/22, 500, ink; the open step "Set weekly hour targets" is 15/20, 500, teal. | `S/r2/crops/r2-owner-setup-390.png` | `portal-premium.css:130` (`.owner-setup-link{font:var(--nv-t-label)}`) | `.owner-setup-link{font:var(--nv-t-row)}`, so both steps are 17/22 at 500. | P2 |
| TC-36 | Inbox Plan ahead · both · 320@150 | Group heading "10 people with no weekly hour target" | It's clamped at 3 lines: scrollHeight 132 against clientHeight 99, 166px wide next to the caret. The end of the heading is cut. | `S/r2/crops/r2-planning-320-150.png` | `kit.css:203` (`-webkit-line-clamp:3` on every `.nv-row__title`, group summaries included) | `.premium-group summary .nv-row__title{display:block;-webkit-line-clamp:unset}` | P2 |
| TC-37 | Inbox Plan ahead · both · all widths | Availability group and its rows | • The heading says "5 people haven’t sent availability".<br>• Each row says "Availability not submitted", with the meta "{name} has not submitted availability for this week."<br>• "sent" and "submitted", and "haven’t" and "has not", are mixed inside one group. | `S/r2/crops/r2-planning-avail-390.png` | `src/lib/action-center/present.ts:39-56`: no `AVAILABILITY_MISSING` case | Add a case: title "No availability yet", detail "{name} hasn’t sent availability for this week." | P2 |
| TC-38 | Home views, Team, Schedule · both | The same thing under different names (new) | • The filter chip says "Activity"; the page title and Home row say "Schedule activity" (`manager-dashboard.tsx:111`).<br>• Team overview says "Active people" (`manager-dashboard.tsx:148`); Team says "10 active employees" and "10 employees".<br>• Home's row says "Who clocked in today, and corrections" (`premium-home.tsx:272`, with an awkward comma); Attendance's band says "Clock-ins today and corrections to review."<br>• One Team overview card says the same state three ways: stat "No hour target", meta "No weekly hour target yet" and pill "No target" (`manager-dashboard.tsx:161-163`).<br>• Schedule's Next up title says "Build West Office’s schedule" and its button says "Plan West Office" (`schedule/page.tsx:280-282`). | `S/r2/crops/r2c-teamview-390.png`, `S/r2/crops/r2c-schedule-390.png` | as listed | • Chip: "Schedule activity".<br>• "Active employees", in both places.<br>• Home row meta: "Clock-ins today and corrections to review".<br>• Hours rows: pill "No target" only; the meta gives scheduled hours ("0h scheduled").<br>• Button: "Build schedule". | P2 |
| TC-39 | Schedule, Payroll, pending list · both / Owner · 390 | Text still under 15px on rebuilt pages | • Schedule's "Build and publish" panel, opened: the location names "Main Office" and "West Office" are 13px at 700, in #1C1C1C, not kit ink.<br>• Payroll: stepper numbers "4" and "5", and "Import format and contents", are 13px.<br>• The pending list's "Workforce" is 10px. | `S/r2/crops/r2c-schedule-390.png`, `S/r2/crops/r2c-payroll-390.png` | • `globals.css` `.schedule-publication-location > strong` (about line 12873) is outside the WR-10 kit rules<br>• the Payroll stepper (`.pw-step` numbers) is outside the "Payroll remnants" rule in `portal-premium.css` | • `.schedule-publication-location > strong{font:var(--nv-t-row);color:var(--nv-ink)}`<br>• Payroll stepper numbers `var(--nv-t-badge)` (12, numbers only) or 15<br>• "Import format and contents" `var(--nv-t-label)` | P2 |
| TC-40 | Schedule · both · all widths | Week summary cells "21 / shifts", "3 / people assigned", "168 / hours assigned" | The number sits above the label. Home Today, Team overview and Timecards all put the label above the number, so one element works two ways. | `S/r2/crops/r2c-schedule-390.png` | The legacy Schedule week stats markup, under `premium-legacy-page` | Use `StatGrid` (label first) or reorder with `flex-direction:column-reverse`. | P2 |
| TC-41 | Attendance · both · all widths | Freshness stamp and Refresh | • "Updated" is muted at 400 and "11:37 PM" is bold at 600, with no live dot, in an inset box with a full-width Refresh.<br>• Home and Inbox use the kit stamp: a dot and one weight. | `S/r2/crops/r2c-attendance-390.png` | `manager-attendance-review.tsx` footer (`.attendance-review-footer`) | Use `<Freshness>Updated <time/></Freshness>` and the band's Refresh `nv-band-control`, as on the Inbox. | P2 |

### Checked and correct in round 2

**No sideways scroll.** None of the 328 snapshots has any.

**Colour:**
- No text pair falls below 4.5:1 and no icon below 3:1. The one exception is the exempt legacy disabled "Fill gaps only" at 3.96.
- The live toast is white on #10342A (13.58:1), 15/20 at 500; its close icon is #CFE3E1 and its check is #7FD6A8. Both kit toast lines are 15/20 (title 600, meta #A9C9C5).

**Desktop at 1440.** Only these exceptions are under 13px: the ⌘K hint (12), avatar initials (12) and count badges (12).

**Rebuilt screens:**
- **Team.** All kit text is 15px or more at 100%:
  - search field placeholder 17
  - filter chips 15/20, counts 600 when selected
  - rows 17/22 and 15/20
  - "Apply filters" 15/20 teal
- **Team overview** (kit): stats 15/20 label over 30/34 value, rows 17/22, "No target" pill 15/20.
- **Schedule activity** (kit): rows 17/22 and 15/20, with spaced ranges.
- **Timecards:** band summary "Approvals open after Oct 18.", stat cells label-first, names 17/22 and not broken.
- **"Already decided"** page:
  - title 30/36
  - summary 17/24
  - note 17/24
  - links 15/20
  - Back says "Inbox"
- **Review band:** at 320@100, "Wants Oct 28 – Oct 29 off." is on one line.
- **More sheet:** matches TC-08.

**Copy:**
- No "missed", "live" or "Her note" anywhere.
- "missing" appears only in TC-32, and in Payroll's "Missing pay periods", which is deliberately unchanged.
- Sentence case everywhere in kit text. "Close" replaced "Close actions".

### Disagreements with "Deliberately not changed"

None. One note: the Payroll punctuation I suspected came from how my collector joins text nodes ("Oct 18 ." and "Approve :"). Checked in screenshots, it isn't real, so nothing is filed.

### Zero open defects?

**No.** 18 remain open:
- 1 P1: TC-32.
- 17 P2:
  - Not fixed: TC-18.
  - Partly fixed: TC-14, TC-20, TC-21, TC-22, TC-23, TC-24 and TC-25. I accept TC-14's two deviations, so only the other six partly fixed items need work.
  - New: TC-33 to TC-41.

## Round 3

October 18–19, 2026 · Crops are under `S/r3/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

**The full sweep ran 23:49 to 23:59.**
- I waited until the source had been quiet for 4 minutes; the last edit before the sweep was at 23:44.
- I ran it on the same matrix as round 2, plus Time exports (`/app/payroll-export`): both roles, every screen, 320/390/430 at 100/125/150%, and 1440. That's 348 snapshots.

**Targeted re-checks ran 00:00 to 00:10.** There was another source edit at 23:58 (`portal-premium.css` and `manager-weekly-roster.tsx`), and the fixture rolled past midnight to the week of Oct 19–25, so I re-checked the affected items directly.

### Status of round 2 open items

| ID | Status | Measured now |
|---|---|---|
| TC-14 | Closed: accepted deviation | Unchanged, as I accepted in round 2:<br>• 13/16 at 100%, capped at 15px when text is larger (`portal-premium.css:41`)<br>• the selected tab at 500 (`:457`) |
| TC-18 | Fixed | When the page loads, "All pending time-off requests" is at y 580–624 and the decision bar at y 700–776, so 76px clear. `S/r3/crops/r3-review-bottom-390.png` |
| TC-20 | Fixed | • The body joins with ` · ` and the location keeps NBSPs (`premium-home.tsx:158`).<br>• Sweep at 390@125: "Morgan Rivera and 2 others ·" / "Main Office"; the separator ends the line and doesn't start the next.<br>• The fixture has no no-clock-in hero after midnight, so this is the last live measurement. |
| TC-21 | **Regressed** | Team tools now shows the literal text "Reconnect a shared clock‑in device", on Home for both roles at every width. See the table below. `S/r3/crops/r3-tools-390.png` |
| TC-22 | Fixed | The group "5 people haven’t sent availability" now holds rows titled "Availability not sent", each saying "{name} hasn’t sent availability yet." (`present.ts:55-57`). `S/r3/crops/r3-planning-avail-390.png` |
| TC-23 | Fixed | What's left is tracked under TC-38. |
| TC-24 | Partly fixed | • Fixed: "Showing 3 of 19", "See all 19 in Inbox", and the Team eyebrow keeps "employees" at every width.<br>• Not fixed: Attendance still says "0 to review · 0 people · 0 corrections", and "0 people" doesn't say people doing what (`manager-attendance-review.tsx` summary).<br>• Fix: "0 people with something to review", or drop that count. |
| TC-25 | Partly fixed | • Phone: the roster reads "8:00 AM – 4:00 PM" on one line at 390 (`S/r3/crops/r3-roster-shift-390.png`).<br>• 1440: the week grid cell breaks it as "8:00 AM –" / "4:00 PM" (`S/r3/crops/r3-roster-shift-1440.png`).<br>• The same list says "12:00 AM – 8:00 AM" and "8:00 PM – midnight" (`manager-actions.ts:7`).<br>• Fix:<br>  • In `manager-weekly-roster.tsx`, put "– " before the end time, or deliberately stack "8:00 AM" over "– 4:00 PM" as on phones.<br>  • Write "midnight" for both a start and an end. |
| TC-32 | Fixed | • "Checked 12:01 AM".<br>• Rule labels read "No clock-in: Not configured" and "No clock-out: Not configured".<br>• No timestamps with microseconds, hashes or revision numbers.<br>`S/r3/crops/r3-attendance-390.png` |
| TC-33 | Partly fixed | • At 390@150 and 430@150 the eyebrow is whole, and the band control shortens to "Add" at 320.<br>• At 320@150 it still reads "10 active employ…": scrollWidth 210 against clientWidth 198 (`portal-premium.css` WR-42 eyebrow ellipsis).<br>• Fix: let `.premium-team .nv-pageband__eyebrow-row` wrap below 22rem, or move the count into the summary. `S/r3/crops/r3-team-band-320-150.png` |
| TC-34 | Fixed | • Facts sit under their labels at 430px and below (`portal-premium.css`, TC-34 block).<br>• "Wed, Oct 28 – Thu, Oct 29" is on one line at 390@100.<br>• At 320@125/150 the 248px line can't hold it, so it breaks once, at the dash. That's acceptable. `S/r3/crops/r3-facts-390.png` |
| TC-35 | Fixed | Both setup steps are 17/22 at 500 (`portal-premium.css:736`). |
| TC-36 | Fixed | No group title is clamped at any width or size (`portal-premium.css:734`). |
| TC-37 | Fixed | See TC-22. |
| TC-38 | Partly fixed | • Fixed:<br>  • the chip says "Schedule activity"<br>  • "Active employees"<br>  • the stat "No weekly hour target" matches the row text, with the short pill "Not set"<br>  • Schedule's Next up title is now a condition, "West Office isn’t started", with the action "Plan West Office"<br>• Not fixed: Home's Team tools row still says "Who clocked in today, and corrections" (`premium-home.tsx:272`), while the Attendance band it opens says "Clock-ins today and corrections to review."<br>• Fix: use the band's sentence, without the final period, as the row text. |
| TC-39 | Partly fixed | • Fixed: the Payroll stepper.<br>• Still 13px:<br>  • Schedule's "Build and publish" panel location names "Main Office" and "West Office", 13/700, ink #1C1C1C (`globals.css` `.schedule-publication-location > strong`)<br>  • Payroll's "Import format and contents"<br>• Fix: `font: var(--nv-t-row)` and `var(--nv-t-label)`. |
| TC-40 | Partly fixed | • Labels now come first.<br>• But they're lowercase: "shifts", "people assigned", "hours assigned". Every other stat label is in sentence case ("Scheduled today", "Active employees", "Need attention").<br>• Fix: "Shifts", "People assigned", "Hours assigned". `S/r3/crops/r3-schedule-390.png` |
| TC-41 | Partly fixed | • Fixed: the weights are 400 and muted.<br>• Not fixed: the new green dot sits on its own line above "Updated" (dot at y about 935, text baseline about 962 in the 2x crop). There's also a wider gap between "Updated" and "12:01 AM" than in the kit stamp.<br>• Cause: `portal-premium.css`, TC-41 block, applies `display:inline-flex;flex-wrap:wrap` to `.attendance-review-footer > :first-child`, which also holds the "Updates every 30s…" line, so the `::before` dot wraps on its own.<br>• Fix: put the dot on the element that holds only "Updated <time>", or render `<Freshness>`. `S/r3/crops/r3-attendance-390.png` |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-21 (regressed) | Home Team tools, and the More sheet over Home · both · every width | "Clocker recovery" meta | The text shows a literal escape sequence: "Reconnect a shared clock‑in device". Found in all 40 Home snapshots of the sweep. | `S/r3/crops/r3-tools-390.png` | `src/components/premium-home.tsx:275`: `meta="…clock‑in…"` is a JSX attribute string, where `\u` escapes aren't interpreted | `meta={"Reconnect a shared clock‑in device"}`, or type the U+2011 character directly | P1 |
| TC-42 | Time exports (now on a band) · both · 320–430 | Choose finalized employees card | At 390@100, 42 text elements are under the 15px floor:<br>• "0 ready" pill: 10px<br>• selection summary: 11px<br>• the table heading: 11px<br>• employee names: 14px<br>• hours "0h 0m": 12px<br>• the row's status line: 10–12px<br>The hierarchy is inverted: "Recorded" and "Breaks" labels are larger than their values. The disabled "Select finalized" and "Clear" are 12px.<br>Copy:<br>• internal "Rev. 0"<br>• "0 finalized beyond the 100-card selection limit." is jargon<br>At 320@100 the period range breaks "Oct 12, 2026 – Oct" / "18, 2026". | `S/r3/crops/r3-exports-select-390.png`, `S/r3/crops/r3-exports-390.png` | `src/components/payroll-export.module.css:1, 35, 36, 38, 41, 48, 49, 53, 57, 61` (`calc(10–14 * var(--type-unit))`), with no kit overrides for this page in `portal-premium.css` | • Map to kit roles: names `--nv-t-row`; meta, hours and summary `--nv-t-callout`; the pill `--nv-t-label`; the table heading `--nv-t-label` (or drop it).<br>• Remove "Rev. N" from the row.<br>• Selection summary: "0 selected · 10 not finalized yet".<br>• Keep each date whole with NBSP. | P1 |
| TC-43 | Home views (Team overview, Schedule activity) · both · 320@125, 320@150 (edge at 320@100) | Week arrows in the band bar, "Next week" | • 320@125: the button spans x 288–332 on a 320px screen, so 12px is off-screen and the chevron is cut.<br>• 320@150: x 323–367, completely outside the screen, with no sideways scroll (scrollWidth 320).<br>• 320@100: the right edge is at 317, inside the 16px gutter. | `S/r3/crops/r3-activity-band-320-125.png` | `.premium-week-eyebrow` is `inline-flex`, `nowrap` text, with `margin-right:-13px` (`portal-premium.css:501, 758-759`). It shares one row with Back in `.nv-pageband__bar`, which doesn't wrap (`kit.css` `.nv-pageband__bar`, `manager-dashboard.tsx:232`). | • `.nv-pageband__bar{flex-wrap:wrap}`, so the week control drops below Back when it doesn't fit.<br>• Or move the week control into the eyebrow row under Back.<br>• Remove the negative right margin below 360px. | P1 |

### Checked and correct in round 3

- No sideways scroll in any of the 348 snapshots.
- **Contrast:** nothing below 4.5:1. The only items under it are disabled Time exports buttons at opacity .55 (2.06–2.78:1), which is exempt.
- **Icons:** none under 3:1.
- **Copy:** no "missed", "missing", "live" or "Her note" anywhere, Payroll included.
- **Kit text:** at 15px or more on every phone screen except the tab (13), badge (12) and "Workforce" (13) exceptions.
- **Attendance, Team overview, Timecards and Team:** no text under 15px.
- **Schedule:** the Next up card, location chips, day strip and roster are 15px or more. The one exception is the publish panel (TC-39).

### Zero open defects?

**No.** 10 remain open:
- **3 P1:** TC-21 (regressed), TC-42 and TC-43.
- **7 P2:** TC-24, TC-25, TC-33, TC-38, TC-39, TC-40 and TC-41.

## Round 4

October 19, 2026 · Crops are under `S/r4/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

- **Full sweep, 00:12 to 00:23.** I started it once the source had been quiet for 5 minutes; the last edit before it was at 00:07. Same matrix as round 3: both roles, every screen including Time exports, 320/390/430 at 100/125/150%, and 1440. That's 348 snapshots.
- **Targeted re-checks, 00:25 to 00:31.** These came after another edit at 00:24 (`portal-premium.css` and `kit/keep-selected-visible.tsx`), so they show the latest build.

### Status of round 3 open items

| ID | Status | Measured now |
|---|---|---|
| TC-21 | Fixed | It reads "Reconnect a shared clock‑in device" (`premium-home.tsx:275`, now a JS string). None of the 348 snapshots has a literal `\u` escape. `S/r4/crops/r4-tools-390.png` |
| TC-24 | Fixed | The Attendance summary reads "0 to review · 0 people affected · 0 corrections". |
| TC-25 | Fixed | • At 1440 the week grid deliberately stacks "8:00 AM" over "– 4:00 PM", the same way as on phones.<br>• No kit text anywhere shows "12:00 AM"; both ends say "midnight" (`present.ts:14`).<br>`S/r4/crops/r4-roster-shift-1440.png` |
| TC-33 | Fixed | At 320@150 the eyebrow reads "10 active employees" in full: scrollWidth 198, clientWidth 198. |
| TC-38 | Fixed | Home's row reads "Clock-ins today and corrections to review", which matches the Attendance band. |
| TC-39 | Fixed | No text under 15px on Schedule (publish panel opened) or Payroll at 390@100. |
| TC-40 | Fixed | The labels read "Shifts", "People assigned" and "Hours assigned", label first. |
| TC-41 | **Not fixed** | • There are now two green dots: one alone on an empty line, then one before "Updated 12:24 AM". `S/r4/crops/r4-attendance-foot-390.png`<br>• Cause: `portal-premium.css:831` (`.attendance-review-footer > div::before{content:none}`) loses to `:751` (`> :first-child::before{content:""}`), because `:first-child` outranks `div`. The new dot at `:833` on `small::before` then adds a second one.<br>• Fix: delete `:750-751` and `:784-785`, or change `:831` to `.attendance-review-footer > :first-child::before{content:none}`. |
| TC-42 | Partly fixed | • Fixed: no Time exports text under 15px at 390@100 (it had 42). Names, meta, pill, summary and hours are all on kit sizes.<br>• Not fixed: the period range still breaks at the dash, "Oct 13, 2026 –" / "Oct 19, 2026", at 390@100, because it sits next to the "0 ready" pill. It did the same at 320.<br>• Fix: build each date with NBSP (`Oct 13, 2026`) and put U+2060 before the dash, or drop the year when both dates are in the current year.<br>• "Rev. 0" and "100-card selection limit" are deferred for Jose; not refiled. `S/r4/crops/r4-exports-select-390.png` |
| TC-43 | Fixed | • The week control drops under Back when it doesn't fit.<br>• At 320 at 100/125/150% the "Next week" button spans x 273–317 and the screen is 320 wide, with no sideways scroll. The 44px button reaches into the gutter; its chevron sits about x 295.<br>`S/r4/crops/r4-activity-band-320-150.png` |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-44 | Time exports · both · all widths | Totals, "/ 0 ready" | #6B7280 text on the kit inset fill #EEF1F0 is **4.25:1** at 15px, below 4.5. It isn't disabled. | `S/r4/crops/r4-exports-390.png` | • `src/components/payroll-export.module.css:63` (`.totals dd span{color:#6B7280}`)<br>• `portal-premium.css:792` now gives the totals the #EEF1F0 inset | `color: var(--nv-muted)` (#5F666A gives 5.14:1 on #EEF1F0) | P2 |

### Checked and correct in round 4

- No sideways scroll in any of the 348 snapshots.
- **Contrast:** apart from TC-44, nothing below 4.5:1. The only others are disabled Time exports buttons at opacity .55 (2.03–2.78), which are exempt.
- **Icons:** none under 3:1.
- **Copy:**
  - No "missed", "missing", "live" or "Her note".
  - No leaked escapes, `undefined`, `NaN` or `null`.
  - No clamped or ellipsized text at any width or size.
- **Text size:** every phone screen keeps kit text at 15px or more, except the tab (13), badge (12) and "Workforce" (13) exceptions. That includes Team, Schedule, Timecards, Payroll, Time exports and the three Home views.

### The deferred Time exports wording

I don't refile it. One note:
- "Rev. 0" is an internal revision number rather than wording. Hiding it when it's 0 needs no new copy.
- "100-card selection limit" is wording, and I agree it waits for Jose.

### Zero open defects?

**No.** 3 P2 remain open: TC-41 (two dots), TC-42 (the range breaks at the dash) and TC-44 (4.25:1). There are no open P0 or P1 findings.

## Round 5

October 19, 2026 · Crops are under `S/r5/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

- **Full sweep, 00:34 to 00:45.** I started it once the source had been quiet for 5½ minutes; the last edit before it was at 00:28. Same matrix: both roles, every screen including Time exports, 320/390/430 at 100/125/150%, and 1440. That's 348 snapshots.
- **Re-checks after more edits.** `kit.css` and `portal-premium.css` changed at 00:45, as the sweep ended. So I re-checked the three open items directly (00:46), then ran a second spot sweep (00:47–00:51): both roles, every screen, at 390@100 and 320@150, 70 snapshots.
- **Before and after the 00:45 edit:** compared kit text by text at 390@100 (size, line height, weight, colour, line count), nothing changed across the edit (0 differences).

### Status of round 4 open items

| ID | Status | Measured now |
|---|---|---|
| TC-41 | Fixed | • One dot, on the same line as "Updated 12:46 AM". The only dot pseudo-element in the footer is `small::before` (#2E8A5B, inline-block).<br>• "Updates every 30s while this page is active." sits on its own line below.<br>• The same at 390@100 and 320@150. `S/r5/crops/r5-attendance-foot-390-100.png` |
| TC-42 | Fixed | • "Oct 13, 2026 – Oct 19, 2026" is on one line at 320, 390 and 430 at 100%: text widths 198, 268 and 308 (`payroll-export.tsx:122`, NBSP inside each date).<br>• At 320@150 and 390@150 the line is too short, so it breaks once, after the dash, with both dates whole. That's the same standard accepted for the review facts.<br>`S/r5/crops/r5-exports-head-390-100.png`, `S/r5/crops/r5-exports-head-320-150.png` |
| TC-44 | Fixed | "/ 0 ready" is now #5F666A on #EEF1F0: **5.14:1** at 15px. `S/r5/crops/r5-exports-totals-390.png` |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-45 | Any band page while the notification count is still loading or unavailable · seen as Manager (Inbox Act now, Inbox Plan ahead) and Owner (Payroll) · 320 and 390 | Header bell, `.portal-notification-unavailable` | • A bare em dash "—" floats above and to the right of the bell: 12px/17.4px at 100% (x 362, y 12 at 390), #CFE3E1.<br>• It's below the 15px floor; the badge exception covers numbers only. It's `aria-hidden`, and on screen it means nothing: it reads as a stray mark, not as "unavailable".<br>• It showed up in 9 of the 348 sweep snapshots, when the count read hadn't finished. It's intermittent and didn't come back in the 70-snapshot spot sweep.<br>Contrast is fine: 7.42:1. | `S/r5/crops/r5-bell-dash-390.png` | • `src/components/notification-bell.tsx:35` renders "—" when `!ready && !state.refreshing`<br>• sized at `portal-design-system.css:43` (`font-size: calc(12 * var(--type-unit))`)<br>• coloured by `portal-premium.css:714` | Show nothing while the count is unknown. The bell's accessible name can carry "Notifications unavailable" (the visible bell is enough). If a visible sign is wanted, use a 6px neutral dot (#858B8F, 3.45:1), not a glyph. | P2 |

### Checked and correct in round 5

- **Sideways scroll:** none in any of the 348 + 70 snapshots.
- **Contrast:** nothing below 4.5:1 except disabled Time exports controls at opacity .55, which are exempt.
- **Icons:** none under 3:1.
- **Copy:**
  - No "missed", "missing", "live" or "Her note".
  - No leaked escapes, `undefined`, `NaN`, `null` or `[object`.
  - No clamped or ellipsized text.
- **Text size:** every phone screen keeps kit text at 15px or more at 100%: Home, Inbox (all filters), both reviews, "Already decided", Schedule, Team, Timecards, Payroll, Time exports, Attendance, Team overview, Schedule activity and More. The only exceptions are the tab labels (13), badges (12), "Workforce" (13) and TC-45.
- **Round 1 to 4 fixes** are all still in place. The 390@100 comparison across the 00:45 edit found 0 changes in size, weight, colour or line count.

### Zero open defects?

**No.** One P2 remains open: TC-45, the bare "—" by the header bell, which appears while the notification count loads. All 44 earlier TC findings are fixed, closed or deferred by agreement:
- **Closed:** TC-14, an accepted deviation.
- **Deferred:** TC-31 (Spanish, Phase 6), and the Time exports wording "Rev. 0" and "100-card selection limit" (Jose's approval).

## Round 6

October 19, 2026 · Crops are under `S/r6/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

- **Full sweep, 01:05 to 01:18.** I started it once the source had been quiet for 6 minutes; the last edit before it was at 00:59. Same matrix: both roles, every screen, 320/390/430 at 100/125/150%, and 1440. That's 348 snapshots.
- **Change check.** I compared it text by text with round 5's sweep (size, line height, weight, colour, line count) to find what changed.
- **States and fields.** A separate probe (`r6/states.mjs`):
  - held, then aborted, the Attendance read (`GET /api/manager/attendance`) to show its loading and failed states;
  - aborted the notification count read to show the bell's unavailable state;
  - measured every field on Team, Schedule, Timecards, Time exports and Payroll at 320, 390 and 1440, at 100% and 150%.
- **Read only.** Nothing was submitted; held and aborted requests were all GETs.

### Status

| ID | Status | Measured now |
|---|---|---|
| TC-45 | Fixed | • With the count read aborted, the bell's name is "Notifications, current count unavailable" and `.portal-notification-unavailable` is `display:none` (end of `portal-premium.css`). Nothing shows next to the bell.<br>• When the read works, the name is "Notifications, 0 unread in your recent inbox". `S/r6/crops/r6-bell-fail-390.png` |
| TC-01 | **Regressed (P0)** | See TC-01 in the table below. |

### Fields (WR-55): checked and correct

- **Text size.**
  - Phones: every input, select and textarea on the band pages is 17px, line height 24px, 400, in #1C1C1C or #16191C. At 150% that's 25.5px.
  - 1440: 16/24.
  - Textareas went from line height 25.5 to 24, and on desktop from 14 to 16px.
- **Height.** Single-line fields are exactly 48px at 320, 390 and 1440, at 100% and 150%. Two exceptions:
  - Schedule's search is 46px inside its own 48px wrapper. That's by design.
  - Payroll's search grows to 58px at 320@150. This is height, so it's for the alignment inspector.
- **Placeholders.** #5F6368 on white is 6.0:1 on phones; #757575 is 4.6:1 at 1440.
- **Date fields.** At 320@150, "10/13/2026" plus the calendar icon fits the 246–286px field with no clipping (scrollWidth equals clientWidth).

### Root loading placeholder (ST-22): checked in code

`src/app/app/root-loading.tsx` picks the destination's shape and label. Its only text is the `sr-only` "Loading {label}…", for example "Loading time exports…" and "Loading time off…". No visible text.

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-01 (regressed) | Home Today card; Team overview "This week" · both · 320@125, 320@150 | Stat grid | • The stats are three columns again, sized to their content, in a 288px card.<br>• At 320@150 the columns are 177, 136 and 133px. "No clock‑in 3", the urgent count, runs from x 329 to 462, entirely outside the card, and clipped.<br>• At 320@125, "No clock‑in" (x 293–410) is mostly hidden.<br>• Team overview at 320@150: "Availability received 0 of 5" runs x 207–377 against the card edge at 304. Its label is cut ("Availabil…", "received…") and its value is gone.<br>• At 390@150 the container query still works (one column, 358px). | `S/r6/crops/r6-today-320-150.png`, `S/r6/crops/r6-today-320-125.png`, `S/r6/crops/r6-teamview-stats-320-150.png` | `src/components/kit/kit.css:337-342` (WR-54, added 00:45): `@media (max-width:340px){.nv-stats{grid-template-columns:repeat(var(--nv-stat-cols,3),minmax(min-content,1fr))}}` comes after the `@container (max-width:17.5rem)` block (`kit.css:272-278`). At the same specificity it wins, so the single-column rule never applies at 320. | • Move the WR-54 media block above the `@container` block,<br>• or limit it with `@container (min-width:17.5rem)` inside the media query,<br>• or raise the container rule's specificity (`.nv-card > .nv-stats{grid-template-columns:1fr}`). | **P0** |
| TC-46 | Team · both · 320@150 | Search field placeholder "Name or employee ID" | • It's cut to "Name or em…" in a 246px field at 25.5px.<br>• The field's only text hint is the placeholder, so the cut word "employee ID" is the useful part.<br>• At 100% it fits. | `S/r6/crops/r6-fields-team-320-150.png` | WR-55 raised field text to `--nv-t-body` (17px, so 25.5px at 150%) at the end of `portal-premium.css`, and the placeholder doesn't wrap | Shorten the placeholder to "Name or ID", or add a visible label "Search" above the field and keep the placeholder short. | P2 |
| TC-47 | Schedule day strip · both · 320, 390, 430 at 150% (edge at 125%) | Day buttons "Mon 19", "Wed 21"… | • At 150%, "Mon 19" is 46px of text in a 44px button (x 119–165 against 120–164). "Wed 21" is 48px (222–270 against 224–268).<br>• The text runs past the selected button's border.<br>• At 125% the margin is 2px. | `S/r6/crops/r6-daystrip-320-150.png` | `src/app/mobile-workforce.css:128`: `.mws-day-navigation button{flex:0 0 44px}` is a fixed width, while the label grows with text size (`.9375rem`, `portal-premium.css:580`) | `flex: 0 0 auto; min-width: 44px; padding-inline: 8px` | P2 |
| TC-48 | Attendance (Home view) · both · all widths | Footer while loading or failed (answers coordinator item 3) | • Loading and failed both read "Updated –" / "Updates every 30s while this page is active.", with a #D5DAD9 dot.<br>• My judgement: it doesn't read right.<br>  • "Updated –" looks like a missing value. Because the "–" is `aria-hidden`, a screen reader hears "Updated", which says an update happened.<br>  • When the read fails, "Updates every 30s…" promises a refresh that isn't happening, under "Attendance review unavailable".<br>  • The grey dot is 1.40:1 on white. The kit's stale dot is `--nv-icon` #858B8F (3.45:1), and its offline state is the coral ring.<br>• The main block's "Checking the authorized recorded-time source." is jargon too. | `S/r6/crops/r6-attendance-loading-390.png`, `S/r6/crops/r6-attendance-failed-390.png` | • `src/components/manager-attendance-review.tsx:203-204`<br>• `portal-premium.css`, ST-16 rules (`small[data-ready="false"]::before{background:var(--nv-border)}`) | • **Loading:** "Checking…" (the Inbox band says the same while it loads), with the stale dot #858B8F; hide the "Updates every 30s" line.<br>• **Failed:** "Couldn’t update. Try Refresh.", with the offline ring (`.nv-fresh[data-state="offline"]`).<br>• Main block while loading: "Checking today’s clock-ins…" | P2 |

### What changed between rounds 5 and 6

71 differences, all explained:
- Stat labels: TC-01's regression.
- The Inbox band stamp now sits on one line at 125%.
- Field and textarea typography: WR-55.
- One More-sheet item: the hover colour on whichever item sat under the pointer, an artifact.
- No contrast failures (except disabled controls), no icon under 3:1, no clamped text, no leaked escapes, no banned words, no sideways scroll.

### Zero open defects?

**No.** 4 remain open:
- **1 P0:** TC-01 regressed. The 00:45 WR-54 rule hides the urgent "No clock‑in" stat at 320@125/150.
- **3 P2:** TC-46, TC-47 and TC-48.

## Round 7

October 19, 2026 · Crops are under `S/r7/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

- **Full sweep, 01:32 to 01:45.** The source had been quiet since 01:30. Same matrix: both roles, every screen, 320/390/430 at 100/125/150%, and 1440. That's 348 snapshots.
- **Only the error screen changed during the sweep.** `app-error-screen.tsx` and `app-error-screen.css` were edited at 01:43. Nothing else in my area changed, so the sweep stands for everything else.
- **Change check.** I compared the sweep text by text with round 6's.
- **Attendance states** (`r7/att.mjs`). I opened the Attendance view in each state by intercepting its read (`GET /api/manager/attendance`):
  - held, for loading
  - aborted, for failed
  - answered with a mock 403, for no access
  - with the page marked hidden, for paused
  Nothing was submitted.

### Status

| ID | Status | Measured now |
|---|---|---|
| TC-01 | Fixed | • 320@100: three columns, 16–123, 123–214 and 214–304, in a 16–304 card. Values end at 111, 202 and 292.<br>• 320@125 and 320@150: one column, each stat 16–304, values ending at 284.<br>• 390@150: one column, 16–374.<br>• Team overview at 320: two columns of 144px at 100%; one column at 125% and 150%.<br>• No text is clipped by a card anywhere (0 kit-card text past its card edge across 348 snapshots). `S/r7/crops/r7-today-320-150.png` |
| TC-46 | Fixed | The placeholder is "Name or ID": scrollWidth 246 equals clientWidth 246 at 320@150 (25.5px). |
| TC-47 | Fixed | The day buttons grow with text size, and every label stays inside its button:<br>• 320@100: "Mon 19" text 126–158 in a 120–164 button<br>• 320@125: 146–185 in 138–193<br>• 320@150: 166–212 in 156–222<br>• "Full week" wraps to two lines inside its button (text 66–122 in 40–148 at 150%)<br>`S/r7/crops/r7-daystrip-320-150.png` |
| TC-48 | Partly fixed | **Footer: fixed.** Measured in all five states, 15/20 Inter:<br>• live: green dot #2E8A5B, "Updated 1:33 AM" / "Updates every 30s while this page is active."<br>• loading: dot #858B8F (3.45:1), "Checking…" / the same line<br>• failed: coral ring #E1553F (3.77:1), "Couldn’t update." / "Try Refresh."<br>• no access: coral ring, "No access." / "Sign in again to continue."<br>• paused: coral ring, "Paused." / "Return to this page to update."<br>**Still open: the main block's copy** (`manager-attendance-review.tsx`, its loading, unavailable and paused states):<br>• loading: "Checking the authorized recorded-time source."<br>• failed: "The latest recorded-time review could not be confirmed. Try refreshing.", which differs from the footer's "Try Refresh." in the same card<br>• paused: "Reconnect and return to this page to load a fresh protected snapshot." ("Reconnect" suggests the network, when the page is only in the background)<br>• no access: "Current Manager or Owner access is required."<br>Fix:<br>• loading: "Checking today’s clock-ins…"<br>• failed: "Today’s clock-ins couldn’t be loaded." (leave the action to the footer and the Refresh button)<br>• paused: "Paused while this page is in the background."<br>• no access: "Your Manager or Owner access has changed."<br>`S/r7/crops/r7-att-failed-390.png`, `S/r7/crops/r7-att-paused-390.png` |

### Branded error screen (WR-57/58)

**How I checked it.** I couldn't reach it on the preview, because causing a server error would change the app's state. So I read the current version (01:43) in code.

**Type and colour come from the kit:**
- `Masthead` title-1 30/36 white on #1C4A47 (9.91:1), with the real `BrandWordmark` SVG.
- The summary is 17/24 #CFE3E1 (7.42:1).
- The card text is `--nv-t-body` 17/24 #5F666A (5.84:1 on white).
- The buttons are `nv-btn` headline 17/22: "Try again" is white on #077572 (5.53:1); "Back to home" is ink on white with a #D5DAD9 edge.

**Measured: the old version.** I rendered the earlier, pre-01:43 version (its own CSS, a text "NEVORA" mark) statically at 320 to 1440 and 100 to 150%:
- no sideways scroll;
- the same contrast as above;
- its mark text was 13px, which the kit version replaces with the SVG.
`S/r7/crops/r7-error-inter-390.png`

**One finding, filed as TC-49.** The two crops of that old version show the problem. `S/r7/crops/r7-error-fallback-390.png` is what renders without the font file loaded: the system font, with different line breaks. The kit version has the same gap.

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-49 | Last-resort error screen (`global-error.tsx`) · all · all widths | All text | • The page asks for `"Inter"` (`--nv-font` falls back to the name, because `--design-font-body` isn't defined here), but no `@font-face` for Inter is loaded.<br>• So it renders in the system font. In the static render, the 390@125 paragraph took 3 lines in the system font against 4 in Inter.<br>• `app/error.tsx` is inside the root layout, which loads `typeface-theme.css`, so it gets Inter; only `global-error` doesn't. | `S/r7/crops/r7-error-fallback-390.png` against `S/r7/crops/r7-error-inter-390.png` | `src/app/global-error.tsx` renders its own `<html>` without the root layout, which is what imports `./typeface-theme.css` (`src/app/layout.tsx:5`) | Add `import "./typeface-theme.css";` to `global-error.tsx`, or put the Inter `@font-face` in `app-error-screen.css`. | P2 |

### What changed between rounds 6 and 7, and what's correct

**41 differences**, all from the TC-01 fix (stat labels back to one line in one-column rows) and the hover colour on whichever More item sat under the pointer (an artifact).

**Correct:**
- No contrast failures except disabled controls; no icon under 3:1.
- No clamped text, leaked escapes or banned words.
- No sideways scroll on any page.
- The Team status chips ("All 10 · Active 10 · Inactive 0") run past the edge at 320 and at 390@150 by design. They're a horizontal scroller with an edge fade (WR-42), like the Inbox filters.

### Zero open defects?

**No.** 2 P2 remain open, and no P0 or P1:
- TC-48: the main block of Attendance's loading, failed, paused and no-access states.
- TC-49: the last-resort error screen has no Inter.

## Round 8

October 19, 2026 · Crops are under `S/r8/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

- **Full sweep, 02:00 to 02:16.** I started it once the source had been quiet for 6 minutes; the last edit before it was at 01:53. Same matrix: both roles, every screen, 320/390/430 at 100/125/150%, and 1440. That's 348 snapshots.
- **Only the error screen changed during the sweep** (02:12). It doesn't appear in the sweep, and I checked it separately.
- **Change check.** I compared the sweep text by text with round 7's.
- **Attendance states** (`r8/att.mjs`). I opened all six states by intercepting the Attendance read (held, aborted, a mock 403, and a hidden page) and by switching the browser offline. Nothing was submitted.
- **Error screen** (`r8/err.mjs`). Rendered statically from `kit.css` and `app-error-screen.css` with the same markup `Masthead`, `KitStack`, `Card` and `CardBody` produce. The wordmark SVG is left out and replaced by an empty box of the same size.

### Status

| ID | Status | Measured now |
|---|---|---|
| TC-48 | Fixed | The main block now reads, in plain words:<br>• loading: "Loading attendance" / "Checking today’s clock records."<br>• failed: "Attendance unavailable" / "The latest records didn’t load."<br>• offline: "You’re offline" / "Updates when you reconnect."<br>• paused: "Attendance paused" / "Updates when you’re back."<br>• no access: "Sign in again" / "Manager or Owner access is needed."<br>The footers, all 15/20:<br>• live: green dot, "Updated 2:01 AM / Updates every 30s."<br>• loading: #858B8F dot, "Checking… / Updates every 30s."<br>• failed: coral ring, "Couldn’t update. / Try Refresh."<br>• offline: coral ring, "Offline. / Updates when you reconnect."<br>• paused: coral ring, "Paused. / Updates when you’re back."<br>• no access: coral ring, "No access. / Sign in again."<br>"Try Refresh." no longer clashes with the main block. One duplication remains, filed as TC-50. |
| TC-49 | Fixed | • `app-error-screen.css:11` declares the Inter face from `/fonts/typeface/inter/variable.ttf`, which the preview serves (200, font/ttf, 876,576 bytes). In the static render the face reports `Inter:loaded`.<br>• Type from the kit:<br>  • title 30/36 white on #1C4A47 (9.91:1)<br>  • summary 17/24 #CFE3E1 (7.42:1)<br>  • body 17/24 #5F666A (5.84:1)<br>  • buttons 17/22: primary white on #077572 (5.53:1), secondary #16191C on white<br>  • at 1440: 32/40, 16/24 and 16/22<br>• No sideways scroll at 320 to 1440, or at 100 to 150%.<br>`S/r8/crops/r8-error-390-100.png` |

**ST-24 (the Today placeholder), checked in code.** "Loading…" with the stale dot sits over an invisible "Updated 12:00 PM" ghost (`visibility:hidden`, `aria-hidden`, `portal-premium.css:890-893`), so the card head wraps the same way when the stamp arrives. Nothing new is visible.

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-50 | Attendance (Home view) · both · all widths · offline, paused and no-access states | Main block and footer in the same card | The footer repeats the main block's sentence word for word:<br>• offline: "Updates when you reconnect." under "You’re offline", then again under "Offline." in the footer<br>• paused: "Updates when you’re back." twice<br>• no access: the heading "Sign in again", then the footer "Sign in again."<br>The same instruction appears twice within about 160px. | `S/r8/crops/r8-att-offline-390.png`, `S/r8/crops/r8-att-paused-390.png` | `src/components/manager-attendance-review.tsx`: the main-block copy and the footer copy are chosen separately for the same state | When the main block shows a state, the footer shows only its dot and state word ("Offline.", "Paused.", "No access."), with no second line. Keep two lines only for live, checking and failed. | P2 |
| TC-51 | Schedule · both · 1440 | Day strip "Full week" | • At desktop the button is now 72px (4.5rem) and its 12px, 600-weight label wraps to "Full" / "week". In round 7 it was one line in 92px.<br>• It's below the desktop 13px minimum, and it's smaller and stacked next to day labels of about 15px. | `S/r8/crops/r8-daystrip-1440.png` | `portal-premium.css:889` (`.mws-day-navigation button:first-child{flex:0 0 4.5rem;width:4.5rem}`) applies at every width; the 12px comes from `manager-schedule.css:54` | • Scope the 4.5rem rule to the phone media query (`max-width:760px`).<br>• Or, at desktop, `width:auto; min-width:4.5rem; white-space:nowrap; font:var(--nv-t-label)`. | P2 |

### Judgement note (not counted)

The error screen's title "This page could not be loaded" leaves "loaded" alone on the second line at 390 (`S/r8/crops/r8-error-390-100.png`). The masthead titles have no `text-wrap: balance`; Home's "Good evening, Morgan" is the same case, which round 1 accepted. `.nv-masthead__title{text-wrap:balance}` would give "This page could" / "not be loaded" at no cost.

### What changed between rounds 7 and 8, and what's correct

**19 differences**, all explained:
- the Attendance footer's shorter second line, now 2 lines where it was 3–4 at large text;
- TC-51;
- hover colour on whichever More item sat under the pointer, an artifact.

**Correct:**
- No contrast failures except disabled controls; no icon under 3:1.
- No kit text clipped past its card, no clamped text, no leaked escapes, no banned words.
- No sideways scroll.
- No kit text under 15px on phones beyond the documented exceptions (tab labels, badges, "Workforce").

### Zero open defects?

**No.** 2 P2 remain open, and no P0 or P1:
- TC-50: the Attendance footer repeats the main block in the offline, paused and no-access states.
- TC-51: "Full week" at 1440 is 12px on two lines.

## Round 9

October 19, 2026 · Crops are under `S/r9/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

- **Full sweep, 02:30 to 02:47.** I started it once the source had been quiet for 10 minutes. Same matrix: both roles, every screen, 320/390/430 at 100/125/150%, and 1440. That's 348 snapshots.
- **Change check.** I compared it text by text with round 8's: only 4 differences, the Attendance footer line count and "Full week" at 1440.
- **Small CSS edits during the sweep** (02:37 to 02:40: day gaps, toolbar gaps, the day strip's left edge, and `app-error-screen.css`). None changes type or colour. I re-checked the affected items afterwards (02:47).
- **Attendance states** (`r9/att.mjs`, `r9/att-offline.mjs`): all six states, opened by intercepting its read or switching the browser offline.
- **In-portal error page** (`r9/inportal.mjs`). It can't be triggered without a server failure, so I mounted its markup, copied from `src/app/app/error.tsx` with the band taken from the live page, into the real shell's `.page-frame`. That was in my browser only. The cascade measured is the real one.

### Status

| ID | Status | Measured now |
|---|---|---|
| TC-50 | Fixed | • Offline, paused and no access now show one line each: "Offline.", "Paused.", "No access.", with the coral ring.<br>• Live and checking show "Updates every 30s." as their second line; failed shows "Try Refresh.".<br>• The footer `small` is 40px and the footer 105px in all six states at 390, so nothing moves between states.<br>• No sentence repeats the main block any more. |
| TC-51 | Fixed | At 1440, "Full week" is 92px wide on one line (`S/r9/crops/r9-daystrip-1440.png`). It's 12px, which is legacy desktop type left for the Phase 4 desktop pass, as before round 8. The phone rules (4.5rem and 2.75rem) apply only under 760px. |

**Round 8's uncounted note (error-page titles).**
- The in-portal page (`.premium-error`) is balanced: the title is 2 lines at 320 and 390, with no word alone.
- The standalone screen (`app/error.tsx`, `global-error.tsx`) isn't. The `.app-error-screen` balance rule lives in `portal-premium.css`, which only `src/app/app/layout.tsx` loads; neither standalone screen is under that layout. So "This page could not be loaded" still breaks with "loaded" alone at 390 there.
- Fix: move the rule into `app-error-screen.css`.
- Still not counted, as before.

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-52 | In-portal error page and Home's dashboard-read failure (`.premium-error`) · Manager, Owner · 320–430 | The card text "Try loading the page again before taking an action." | • On phones it renders 15/24, not the kit's body 17/24:<br>  • 320 and 390 at 100%: 15px<br>  • 430@125: 18.75px, where the kit gives 21.25<br>  • 320@150: 22.5px, where the kit gives 25.5<br>• The standalone error screen shows the same sentence at 17/24.<br>• The band summary above it is 17/24, so the card line is smaller than the line above it.<br>• At 1440 it's correct, 16/24.<br>Buttons are right: 17/22 and 52px. | `S/r9/crops/r9-inportal-error-390-100.png` | `src/app/mobile-workforce.css:68` (`html body .app-shell[data-mobile-workforce] .page-frame :is(p,li,dt,dd){font-size:var(--mobile-caption);line-height:1.6}`) outranks `.premium-error__text` (`portal-premium.css:898`), the same cascade as round 1's TC-12 | `html body .app-shell.nevora-portal.nevora-portal .page-frame .premium-error .premium-error__text { font: var(--nv-t-body); }` | P2 |

### Checked and correct

**In-portal error page**, apart from TC-52:
- band title 30/36 white (9.91:1), balanced;
- summary 17/24 #CFE3E1 (7.42:1);
- primary button 17/22 white on #077572 (5.53:1), secondary 17/22 #16191C;
- one `nv-sr` `role="alert"` holds the full message;
- no sideways scroll at 320–1440.

**Standalone error screen:**
- Inter loads from `app-error-screen.css` (`Inter:loaded`);
- title 30/36, summary and body 17/24, buttons 17/22;
- no sideways scroll at 320–1440 or at 100–150%.

**Sweep:**
- No contrast failures except disabled controls; no icon under 3:1.
- No kit text clipped past its card, no clamped text, no leaked escapes, no banned words.
- No sideways scroll.
- No kit text under 15px on phones beyond the documented exceptions (tab labels, badges, "Workforce").

### Zero open defects?

**No.** One P2 remains open, and no P0 or P1: TC-52, the in-portal error card's sentence at 15px. The fix is the one-line specificity rule above.

## Round 10

October 19, 2026 · Crops are under `S/r10/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

- **Full sweep, 02:55 to 03:13.** I started it once the source had been quiet for 6 minutes. Same matrix: both roles, every screen, 320/390/430 at 100/125/150%, and 1440.
- **Two page loads timed out** (the Manager review and the Owner's Attendance view at 390) while the dev server recompiled after edits at 03:08 and 03:11. I re-collected 390 for both roles at every text size afterwards (105 snapshots, no errors). Together that's 342 + 105 snapshots.
- **Change check.** I compared the sweep text by text with round 9's.
- **Error pages.** I re-checked the in-portal page (`r10/inportal.mjs`, its markup mounted in the real shell, in my browser only) and the standalone screen (`r10/err.mjs`), using the CSS on disk with nothing injected.

### Status

| ID | Status | Measured now |
|---|---|---|
| TC-52 | Fixed | • The card sentence is 17/24 #5F666A, the same as the band summary above it:<br>  • 320@100 and 390@100: 17/24<br>  • 430@125: 21.25/30<br>  • 320@150: 25.5/36<br>  • 1440: 16/24<br>• The rule is at the end of `portal-premium.css`.<br>`S/r10/crops/r10-inportal-error-390-100.png` |

**The uncounted title note is resolved.** `app-error-screen.css:13` now balances the standalone title. At 390 it reads "This page could" / "not be loaded", so no word is left alone (`S/r10/crops/r10-error-390-100.png`). The in-portal page is also balanced, at 2 lines at 320 and 390. Inter still loads (`Inter:loaded`).

### What changed between rounds 9 and 10

6 differences, none a defect:
- **"Full week" at 1440:** now 14/20 at 500 on one line (it was 12px at 600). That's an improvement, at the desktop minimum.
- **Attendance "Time corrections" description:** its text column narrowed from 318px to 276px at 390, so it's now 3 lines instead of 2 at 100% and 4 at 150%. It has no orphans or broken ranges. That's a layout change for the alignment inspector, and the type is unchanged.
- **More sheet:** the hover colour on whichever item sat under the pointer, an artifact.

### Checked and correct

- **Contrast:** nothing below 4.5:1 except disabled controls; no icon under 3:1.
- **Text:** no kit text clipped past its card, no clamped or ellipsized text, no leaked escapes, `undefined` or `NaN`.
- **Copy:** no "missed", "missing", "live" or "Her note".
- **No sideways scroll.**
- **Text size:** every phone screen keeps kit text at 15px or more at 100%, apart from the documented exceptions: tab labels 13, badges 12, "Workforce" 13.
- **Error pages:**
  - Standalone: Inter; title 30/36, balanced; summary and body 17/24; buttons 17/22; contrast 9.91, 7.42, 5.84 and 5.53:1.
  - In-portal: the same values, plus one hidden `role="alert"` with the full message.
- **Attendance footer:** unchanged since round 9 and still correct in every state.

### Zero open defects?

**Yes. Type, colour and copy have zero open defects on this build.**
- All 52 TC findings are fixed, apart from those closed or deferred by agreement:
  - TC-14: accepted deviation.
  - TC-31: Spanish, Phase 6.
  - Time exports wording "Rev. 0" and "100-card selection limit": waits for Jose.
  - Payroll wording: waits for Jose.
- Not testable here: real iOS/WebKit text rendering and VoiceOver.

## Round 11

October 19, 2026 · Crops are under `S/r11/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

**Short regression check** on the build as of 03:55, after a quiet period.

**Failure and paused states**, opened in my browser only. Nothing reached the server and no data changed.
- I answered these reads with 500s:
  - `GET /api/manager/today`
  - the action center read (`/api/manager/action-center`, a POST that reads)
  - `GET /api/payroll/runs`
- I held one Today retry to catch "Trying…".
- I marked the page hidden to get the paused state.
- Scripts: `r11/probe.mjs` and `r11/today.mjs`.
- Widths: 320, 390 and 1440, at 100%, 125% and 150%.

**Spot sweep** of every screen, both roles, at 390@100 and 320@150 (70 snapshots), compared text by text with round 10. Only 3 differences, all the More sheet's hover-colour artifact.

### Checked and correct

**ST-27, Today read failure.**
- Stats read "–" in 30/34 #16191C. Labels are callout 15/20 #5F666A, and at 320@150 they become one-column rows.
- The foot reads "Today’s numbers aren’t available." in 15/20 #5F666A.
- "Try again" in the head is #077572 on white (5.53:1). "Trying…" is #5F666A (5.84:1) and sits on the same 20px line.
- At 1440 the link is 14/20/600, the desktop callout.
- Wording reads right.
- One size issue is filed as TC-53.

**IS-54/55.**
- The Home Next up failure note "What needs you isn’t available right now." isn't in a live region (no `role` or `aria-live` on it or its ancestors), and the band says "Couldn’t load everything.".
- The paused sentence is "Paused while you’re away. It updates when you come back." on both Home and the Inbox.

**WR-61.**
- Payroll's failure is a white card with a primary "Try again": 17/22/600, white on #077572 (5.53:1), 52px.
- The Inbox's and Home's Next up "Try again" are primary too: 17/22, 52px.

**IS-56, Timecards.**
- At 320 the period toolbar is one 288px column. The date fields are 286px wide, with scrollWidth equal to clientWidth at 100% and 150%.
- At 390 it's two 173px columns.

### Findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-53 | Home Today (read failed) and Inbox (failed or paused) · Manager · 320–430 | Today's "Try again" / "Trying…"; the Inbox status line | Two new state elements lose their kit type to the legacy phone rules:<br>• Today's "Try again" and "Trying…" are 17/20/600 on phones. The CSS asks for callout 15/20/600 (`portal-premium.css`, `.premium-today-retry`), and it's 14/20 at 1440 as intended. So the link is larger than the "Today" title's own meta row.<br>• The Inbox status "The Inbox isn’t available right now." and "Paused while you’re away…" are 15/24. `inbox.css:23` asks for body 17/24.<br>• Home shows the same paused sentence at 15/20, so one sentence has two line heights on two screens. | `S/r11/crops/r11-today-fail-390-100.png`, `S/r11/crops/r11-inbox-fail-390.png` | • `src/app/mobile-workforce.css:70` (`:is(button,a,label,legend){font-size:var(--mobile-body);line-height:1.5}`) beats `.premium-today-retry`, whose high-specificity rule sets `line-height` and `height` but not `font-size`.<br>• `:68` (`:is(p,li,dt,dd)`) beats `.premium-inbox .inbox-status p`. | • `html body .app-shell.nevora-portal.nevora-portal .page-frame .premium-home .premium-today-retry{font:var(--nv-t-callout);font-weight:600}`<br>• `html body .app-shell.nevora-portal.nevora-portal .page-frame .premium-inbox .inbox-status p{font:var(--nv-t-callout)}` (or body, if 17 was meant), so both screens' paused line matches. | P2 |
| TC-54 | Payroll (read failed) · Owner · 320, 390 | Failure card title and text | • The card is now white with a kit button, but its text keeps legacy type: the title "Payroll unavailable" is 15/22.5 at weight **550** in #1C1C1C, and the text is 15/20 in #5F6368.<br>• The kit card's equivalents are headline 17/22/600 #16191C and callout #5F666A, as Home's and the Inbox's failure cards use.<br>• Wording is unchanged and still deferred; this is type only. | `S/r11/crops/r11-payroll-fail-390.png` | The WR-61 rules in `portal-premium.css` restyle `.pw-state` and `.pw-button` but not `.pw-state strong` or `.pw-state p` (`payroll-ui.tsx:28`) | • `….payroll-workflow.premium-legacy-page .pw-state strong{font:var(--nv-t-headline);color:var(--nv-ink)}`<br>• `….pw-state p{font:var(--nv-t-callout);color:var(--nv-muted)}` | P2 |
| TC-55 | Home (window in the background) · Manager · 390 | The state words on one screen | One state, four different signals on one screen:<br>• band: "Paused while you’re away."<br>• Today: "Loading…" with the grey dot and "–" stats; it isn't loading, it's paused<br>• Next up: "Paused while you’re away. It updates when you come back.", which repeats the band, above a primary "Try again", which contradicts "updates when you come back"<br>• Also needs you: "Not available", over a skeleton | `S/r11/crops/r11-paused-home-390.png` | `premium-home.tsx`: the Today, Next up and Also needs you cards each pick their own wording for the same `paused` connection; `PendingCard` shows Try again whenever `onRetry && connection !== "offline"` | • Today meta: "Paused" with the stale dot.<br>• Also needs you meta: "Paused".<br>• Next up: one line, "It updates when you come back.", since the band already says "Paused", and no Try again while paused (show it only for unavailable). | P2 |

### Zero open defects?

**No.** 3 P2 remain open, and no P0 or P1: TC-53, TC-54 and TC-55.
- Everything else checked in this round is correct.
- The spot sweep found no regressions against round 10's zero.

## Round 12

October 19, 2026 · Crops are under `S/r12/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

- **Build:** as of 04:13, quiet since then (a test file changed at 04:17).
- **States**, opened in my browser only. Nothing reached the server and no data changed.
  - I answered the Today, action center and Payroll runs reads with 500s.
  - I held a Today retry and tapped "Try again" with touch.
  - I marked the page hidden for the paused state.
  - Scripts: `r12/probe.mjs`, `r12/probe2.mjs`, `r12/today.mjs`, `r12/trying.mjs`.
- **Spot sweep** of every screen, both roles, at 390@100 and 320@150 (70 snapshots). No text differs from round 11 in size, weight, colour or line count.

### Status

| ID | Status | Measured now |
|---|---|---|
| TC-53 | Fixed | • Today's "Try again" is callout at 600 across text sizes:<br>  • 320 and 390: 15/20<br>  • 390@125: 18.75/25<br>  • 320@150: 22.5/30<br>  • 1440: 14/20<br>  It's #077572 on white (5.53:1).<br>• The Inbox status line is body muted, 17/24 #5F666A, in both failed ("The Inbox isn’t available right now.") and paused ("Paused while you’re away. It updates when you come back."). |
| TC-54 | Fixed | • The title "Payroll unavailable" is 17/22/600 #16191C.<br>• The text is 15/20 #5F666A.<br>• The alert icon is hidden.<br>• "Try again" is a primary 17/22/600, white on #077572 (5.53:1), 52px.<br>• At 320 it's the same, with the text on 2 lines. |
| TC-55 | Fixed | When Home is paused:<br>• band: "Paused while you’re away."<br>• Today: meta "Paused" with the stale dot (15/20 #5F666A), stats "–" at 30/34<br>• Next up: "It updates when you come back.", with no button<br>• Also needs you: meta "Paused"<br>One word for one state. `S/r12/crops/r12-paused-home-390.png` |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-56 | Payroll (read failed) · Owner · 320, 390 | The refresh icon inside the primary "Try again" | The new icon is #858B8F on the #077572 button: **1.60:1**, below 3:1 for a graphic. It looks greyed out next to the white label, as if disabled. Every other "Try again" icon is white. | `S/r12/crops/r12-payroll-fail-390.png` | The WR-61 rule `….payroll-workflow.premium-legacy-page .pw-state svg { color: var(--nv-icon); }` (`portal-premium.css`, WR-61 block) also matches the icon inside `.pw-button` | `….pw-state .pw-button svg { color: currentColor; }`, or scope the grey to `.pw-state > svg` | P2 |
| TC-57 | Home Today (read failed, retry busy) · Manager · 390 (touch) | "Trying…" | • While busy it reads **"Trying…" underlined in #055C5A**, the hover colour, like an active link. In round 11 it was muted #5F666A.<br>• The button carries `aria-disabled="true"` but not `disabled`, so `.premium-today-retry:disabled { color: var(--nv-muted) }` doesn't apply.<br>• On touch, the tap leaves `:hover` set, so the hover underline and colour show. | `S/r12/crops/r12-today-trying-390-100.png` | `premium-home.tsx` (busy state uses `aria-disabled`) together with `portal-premium.css`, ST-27 block (`:disabled` rule; hover rule not limited to hover devices) | • `.premium-today-retry[aria-disabled="true"] { color: var(--nv-muted); text-decoration: none; cursor: default; }`<br>• Put the hover rule inside `@media (hover: hover)`. | P2 |

### Notes (not counted)

- **Next up while paused** keeps its full height. Below the dashed cut there's an empty band about 75px tall, where the button was (`S/r12/crops/r12-paused-home-390.png`). That's space, not type, so it's for the alignment inspector.
- **Also needs you while paused** shows a loading skeleton under "Paused". A static "It updates when you come back." line would match Next up.

### Zero open defects?

**No.** 2 P2 remain open, and no P0 or P1: TC-56 (grey icon on the teal Payroll button, 1.60:1) and TC-57 (busy "Trying…" looks like an active link).

## Round 13

October 19, 2026 · Build as of 04:25.

### How it was measured

- **States**, opened in my browser only. Nothing reached the server.
  - Payroll read answered with a 500.
  - The Today read answered with 500s, and a retry held after a touch tap.
  - Scripts: `r13/probe2.mjs`, `r12/trying.mjs`, `r13/today.mjs`.
- **Spot sweep** of every screen, both roles, at 390@100 and 320@150 (70 snapshots), compared with round 12: 0 differences in size, weight, colour or line count.
- **Global checks:** no contrast failures (disabled controls aside), no icon under 3:1, no clamped text, no banned words, no sideways scroll.

### Status

| ID | Status | Measured now |
|---|---|---|
| TC-56 | Fixed | The refresh icon inside Payroll's primary "Try again" computes to rgb(255,255,255) on #077572 (5.53:1) at 320 and 390. The card's own alert icon stays hidden. Title 17/22/600 #16191C, text 15/20 #5F666A, button 17/22/600. |
| TC-57 | Fixed | After a touch tap with the retry held, "Trying…" is #5F666A (5.84:1) with no underline, although `:hover` is still set after the tap. Its type tracks text size: 15/20/600 at 320 and 390, 18.75/25 at 390@125, 22.5/30 at 320@150, and 14/20 at 1440. |

### The two notes from round 12

I won't count either one. Both follow the stability rule that nothing moves when the page goes to the background and comes back (ST-25, ST-27), and neither involves type, colour or wording.

### Zero open defects?

**Yes. Type, colour and copy have zero open defects on this build.** Still outside this zero, by agreement:
- TC-14: an accepted deviation.
- TC-31: Spanish, Phase 6.
- Payroll and Time exports wording: waiting for Jose.

## Round 14

October 19, 2026 · Build as of 04:38 · Crops are under `S/r14/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

Short regression check (`r14/probe.mjs`), in my browser only:
- **Home, paused:** visibility overridden.
- **Home, offline:** the browser context switched offline.
- **Attendance "Refresh" while busy:** I held the Attendance read and tapped Refresh. That's a read, and nothing was submitted.
- **Widths:** 390 and 320.

### Status

| Item | Status | Measured now |
|---|---|---|
| Paused Next up copy (IS-60) | Correct | • "Updates when you’re back.", 15/20/400 #5F666A (5.84:1), under "Next up" 15/20/500.<br>• It matches the Inbox and Attendance paused lines. The band keeps "Paused while you’re away.", so the state word isn't repeated. |
| Next up placeholder (WR-64) | Correct | • A 318×52 (390) / 248×52 (320) block, #EEF1F0 at opacity .6, `aria-hidden`, no text, no button.<br>• It's decoration, so no contrast rule applies.<br>• It matches the still placeholder rows in "Also needs you". `S/r14/crops/r14-nextup-paused-390.png` |
| Attendance "Refreshing…" at .55 | **Change it.** See TC-58. | • #16191C at opacity .55 on white composites to #7F8182: **3.91:1** at 15px/600.<br>• WCAG exempts inactive controls, so it isn't a hard failure. But "Refreshing…" is the only place the state is said, so it's status text a person needs to read.<br>• Today's equivalent, "Trying…", is muted #5F666A at full opacity (5.84:1) since TC-57. |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-58 | Attendance (Home view) · both · all widths | "Refreshing…" on the busy Refresh button | • 3.91:1 (#7F8182 effective on white), from opacity .55.<br>• It's the only on-screen sign that a refresh is running, and it's dimmer than Today's "Trying…" (5.84:1), so two busy states look different. | `S/r14/crops/r14-att-refreshing-390.png` | `portal-premium.css:972` (`.attendance-review-refresh[aria-disabled="true"]{opacity:.55}`) | Drop the opacity. Use `color: var(--nv-muted)` (#5F666A, 5.84:1) and keep the white fill with the #D5DAD9 edge, as `.nv-btn:disabled` already does for real disabled buttons (#5F666A on #EEF1F0, 5.14:1). | P2 |
| TC-59 | Home (offline) · Manager · 320, 390 | Next up text | • The card says "You’re offline. This updates when you reconnect." right under the band, which already says "You’re offline.".<br>• Round 14 shortened the paused card so it wouldn't repeat its band; offline still does.<br>• Attendance's offline line says "Updates when you reconnect.", so there are two phrasings for one state. | `S/r14/crops/r14-nextup-offline-390.png` | `premium-home.tsx`, `PendingCard` offline message | "Updates when you reconnect.", which matches Attendance and the paused pattern. | P2 |

### Zero open defects?

**No.** 2 P2 remain open, and no P0 or P1: TC-58 ("Refreshing…" at 3.91:1) and TC-59 (offline Next up repeats the band).

## Round 15

October 19, 2026 · Crops are under `S/r15/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

I re-ran the round 14 probe (`r14/probe15.mjs`) at 390 and 320, in my browser only. Nothing was submitted.

### Status

| ID | Status | Measured now |
|---|---|---|
| TC-58 | Fixed | • Mid-refresh at 390, "Refreshing…" is #5F666A at opacity 1 on a white fill with a 1px #D5DAD9 inset edge.<br>• Type 15/20/600, **5.84:1**. That matches Today's "Trying…".<br>`S/r15/crops/r15-att-refreshing-390.png` |
| TC-59 | Fixed | • Offline, the band reads "You’re offline." and Next up reads "Updates when you reconnect." (15/20 #5F666A, 5.84:1), the same as Attendance's offline line.<br>• Paused still reads "Updates when you’re back." under "Paused while you’re away.".<br>• Same at 320 and 390. The placeholder is unchanged (decoration, `aria-hidden`). |

### Zero open defects?

**Yes. Type, colour and copy have zero open defects on this build.** Still outside this zero, by agreement:
- TC-14: an accepted deviation.
- TC-31: Spanish, Phase 6.
- Payroll and Time exports wording: waiting for Jose.

## Phase 3, round 1

October 19, 2026 · Employee and Lead screens on the kit · Crops are under `S/p3/crops/`, full screenshots under `S/p3/shots/`, where `S/` is the scratchpad folder named above.

### How it was measured

**Accounts and states.** I used the saved signed-in states in `p3/state/`. Read only: nothing was submitted, claimed, swapped, withdrawn or confirmed. I opened `details` elements and the More sheet only.

**Snapshots** (`p3/dumpE.mjs` and `p3/dumpE2.mjs`):

| Account | Configurations |
|---|---|
| AUDIT-E | 320, 390 and 430 at 100/125/150%; 360@100; 844×390 landscape; 1440 |
| AUDIT-LEAD | 320@100/150, 390, 1440 |
| AUDIT-LONG | 320@100/150, 390@100/125 |
| payroll-qa-a | My pay, My time, Timecards and Home at 320 and 390 |
| AUDIT-M | Updates, Notifications and Time exports at 320, 390 and 1440 |

That's about 400 snapshots, 06:28–06:44. Afterwards I re-collected the pages changed by Jose's three approved edits (06:36): My time and Time off for all four employee accounts, and Time exports for AUDIT-M.

**Screens:**
- Home
- My schedule: mine, open and swap
- Requests overview
- Time off: new and my requests
- Shift requests: available and my requests
- Availability: usual and specific week
- My time, Timecards, My pay
- Profile, Updates, Notifications
- More sheet

**Measurements:**
- **Contrast** on the green pass was measured from rendered pixels (`p3/px.mjs`), because the pass's background is a gradient.
- **Cascade sources** come from CDP (`p3/why.mjs`).

### Checked and correct

**No sideways scroll** at any width or text size, landscape included.

**Contrast:**
- Band text: 7.42 to 9.91:1.
- The pass is a gradient from #077572 to #1C4A47. On it, white text measures 5.0 to 8.0 from rendered pixels, and the "Published" pill 4.6:1 (white on white-16% over the gradient).
- Kit cards: 5.84:1 and up. No icon under 3:1.

**Kit roles where the kit is used:**
- band title 30/36, except TC-P3-07
- summary 17/24
- pills 15/20
- card titles 17/22/600
- rows 17/22 and 15/20
- buttons 17/22/600

**The new copy you asked me to judge:**
- **Home summary:** "Next shift today, 8:00 AM.", "On shift until 4:00 PM.", "No published shifts coming up." are clear and short (wrap at 320@125 is TC-P3-09). Optional: "today at 8:00 AM" reads more naturally than the comma.
- **My schedule:** "5 shifts · 40h scheduled." says what it counts. The hours include breaks, which matches "Hours include breaks" on My time.
- **Time off timeline:**
  - "Sent Oct 18" and "Waiting for your manager" read right.
  - Jose's approved decided form, "Approved by <name> · <date>", and "Withdrawn · <date>" with no name, are correct in code (`requests/page.tsx:104-105`). No account in the fixture has a decided request, so I couldn't see them rendered.
- **"N request(s) waiting on your manager."** Grammar and plurals are right. The wording differs from the timeline, filed as TC-P3-11.
- **Availability scope lines:** "Your usual week. Let your team know when you can work." and "Changes here apply only to Oct 26 – Nov 1." are good. The naming and wrap issues are TC-P3-10 and TC-P3-09.
- **Timecards:** "Each day’s clock-ins and clock-outs." is good.

**Jose's approved changes:**
- **Time exports:** "Rev. N" is gone, and the line reads "0 selected · 10 not finalized.", with the limit sentence shown only when over the limit.
- **My time eyebrow:** "Payday Tue, Oct 27 · for Oct 19 – Oct 25", 15/20 #CFE3E1 on the band (7.42:1). It's one line at 320, 390@125 and up. At 320@150 it breaks after "for", see TC-P3-09.

**Names:** the long double surname is never truncated: "María José Rivera Santiago With A Long Name" wraps in full.

### Findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-P3-01 | My schedule (mine, swap) · Employee, Lead · 320–430 | Week strip, agenda, shift rows | Text under the 15px floor on a rebuilt screen:<br>• day names in the week strip ("Mon"…"Sun") **10px**<br>• agenda day labels 12px<br>• "Published assignments only" and "Shift options" 13px<br>• shift location and position, "What changed in your schedule", "Before:/After:" lines 14px | `S/p3/crops/schedule-weekdays-390.png`, `S/p3/crops/schedule-shift-390.png` | • `src/app/app/portal-design-system.css:82` (`.my-week-day span{font-size:.625rem}`)<br>• `src/app/app/schedule/employee-schedule.css` (agenda, shift copy) | • Day names `--nv-t-label` (15/20); agenda dates `--nv-t-callout`<br>• "Shift options" and the heading line `--nv-t-label`<br>• Location and position `--nv-t-callout`<br>• Change lines `--nv-t-callout` | P1 |
| TC-P3-02 | Time off (new request, my requests) · Employee · 320–430 | Form labels and helpers | • "Start date" and "End date" field labels 12px<br>• "Optional" 12px<br>• the counter "0 /250" 11px, with a stray space before the slash<br>• "Withdraw this request" 12px | `S/p3/crops/timeoff-dates-390.png` | • `src/app/app/requests/time-off.css:32` (`.nto-date-fields label>span`, 12)<br>• `:37` (`.nto-optional`, 12)<br>• the note hint and `.nto-withdrawal summary` in the same file | • Labels `--nv-t-label`; helpers `--nv-t-callout`<br>• Counter "0/250" at callout<br>• Withdraw summary `--nv-t-label` | P1 |
| TC-P3-03 | Availability (usual and specific week) · Employee · 320–430 | Day rows, deadline card | • Day names 14px<br>• per-day dates "Oct 26"… **11px in JetBrains Mono**, a second typeface inside a kit page<br>• "0 of 7 days available" 12px<br>• "Availability deadline" and "Not submitted" 13px<br>• "No cutoff has been set for this week." 12px | `S/p3/crops/avail-row-390.png` | `src/app/app/availability/availability.css:82` (`.av-day-count`, 12) and the day-name, date and deadline rules in that file | • Day names `--nv-t-row`; dates `--nv-t-callout` in Inter<br>• Count `--nv-t-callout`<br>• Deadline strongs `--nv-t-label`, its text `--nv-t-callout` | P1 |
| TC-P3-04 | Shift requests (your requests) · Employee · 320–430 | Assigned-shift cards | • "Main Office", "Customer Support" 12px<br>• "No designated Lead" and "Times in Puerto Rico time" 11px<br>• dates 13px | `S/p3/crops/exchange-row-390.png` | `src/components/exchange-review.css:51-53` | Detail, lead and zone `--nv-t-callout`; date `--nv-t-label` | P1 |
| TC-P3-05 | Updates, Notifications (shared, all roles) · 320–430 | Row meta, counts | • Updates: "Location announcement", "Review needed", the time "Oct 18, 2026, 9:10 PM", and filter counts, all 12px<br>• Notifications: filter count 11px | `S/p3/crops/updates-row-390.png` | • `src/components/updates-review.css:17` (`.updates-filter-count`, 12) and `:35` (`.updates-status`, 12)<br>• `notification-inbox.module.css` (count) | • Meta and status `--nv-t-callout`<br>• Counts `--nv-t-badge` (12 is allowed for number badges only, so make them true badges) or callout | P2 |
| TC-P3-06 | Home and the shell · Employee · 320–430 | Pass pill, clock badge, More sheet | • The pass's "Published" pill is 14px (kit pill 15/20).<br>• The "Off Clock" badge is 14px on Home (and 12px on the Lead's My time).<br>• The More sheet: label "MORE" 10px uppercase in **JetBrains Mono**; name "Alexandra Rivera" 12px; "Sign out" 11px. | `S/p3/crops/pass-390.png`, `S/p3/crops/more-390.png` | • `employee-home-reviewed.module.css` (`.published`)<br>• `src/app/employee-mobile-corporate.css:129` (`.employee-time-badge`)<br>• `src/app/globals.css:11537` (`.employee-more-label`, 10) and `:11543` (profile, 12) | • Pill and badge `--nv-t-label`<br>• More sheet like the Manager's: label `--nv-t-callout` 600 in Inter, sentence case; name `--nv-t-row`; "Sign out" `--nv-t-label` | P2 |
| TC-P3-07 | My time, Timecards · Employee (and Lead) · 320–430 | Band title; Lead's My time | • The band title is 24/30 on My time and Timecards. Every other band, employee or manager, is title-1 30/36.<br>• The Lead's My time uses older type: title 30 but "Off Clock" 12px, the date "October 19, 2026" 12px, "0 entries" 12px, the "Recorded time" figure **15px** (an employee's is 30px). So one screen has two type sets by role. | `S/p3/crops/mytime-band-390.png`, `S/p3/crops/lead-mytime-390.png` | • `src/app/employee-mobile-corporate.css:114` (`.employee-view h1{font-size:var(--corporate-type-page)}`, 1.5rem) outranks the kit title<br>• The Lead's page doesn't get the `employee-view` kit styles | • Exclude `.nv-masthead__title` from `:114`, or add `…[data-nv-page] .nv-masthead__title{font:var(--nv-t-title-1)}`<br>• Give the Lead's My time the same kit classes as the employee's | P2 |
| TC-P3-08 | Home · all employees · all widths | Band title | • The band title is always "Home". The design's "Hi, <name>." never appears for AUDIT-E, AUDIT-LEAD, AUDIT-LONG or payroll-qa-a.<br>• The greeting moved to the eyebrow ("Good morning · Monday, October 19"), so the title says nothing personal. | `S/p3/crops/home-band-390.png` | `src/components/employee-home-actions.tsx:78` renders `EmployeeHomeReviewedView` without `displayName`, so `employee-home-reviewed.tsx:246` falls back to "Home" (tests pass a name) | Pass the signed-in first name as `displayName`. | P2 |
| TC-P3-09 | Home, Availability, My time, My schedule · Employee · 320–430 | New lines that break inside a time or range | • Home band at 320@125/150: "Next shift today, 8:00" / "AM."<br>• Availability band at **360, 390 and 430 at 100%**: "Changes here apply only to Oct 26" / "– Nov 1."<br>• Home Recent activity at 360@100: "Time off pending · Oct" / "28, 2026 – Oct 29, 2026", and "Recorded Sun, Oct 18, 9:10" / "PM"<br>• My time eyebrow at 320@150: "…· for" / "Oct 19 – Oct 25"<br>• My schedule changes at 320@150: "8:00 AM – 4:00" / "PM" | `S/p3/crops/home-band-320-125.png`, `S/p3/crops/avail-band-360.png` | Plain spaces inside times and dates: `employee-home-reviewed.tsx:259`, `availability/page.tsx:155`, `my-time/page.tsx:22`, the Recent activity text | NBSP inside every time ("8:00 AM") and date ("Oct 26"); " –⁠ " around range dashes; "for Oct" | P2 |
| TC-P3-10 | Availability, My time, Timecards, Shift requests, Home · Employee | Same thing, different words | • **Usual vs normal:** the "Usual week" pill vs "Save normal availability" and "Your saved normal availability.".<br>• **Deadline vs cutoff:** "Availability deadline / No deadline set" vs "No cutoff has been set for this week." in the same card.<br>• **Corrections, three names:** "Report missing time" (My time, which also breaks F5's "missing"), "Request correction" (a My time entry), "Request a correction" (Timecards).<br>• **Unable to work:** "Unable to Work" (Shift requests) vs "Unable to work" (My schedule).<br>• **Review:** "3 items need your review" (band) vs "3 actions" (To do); the pills "Required review" (Home) vs "Review needed" (Updates) vs the filter "To review".<br>• **Time off state:** "Time off pending" (Recent activity) vs "Waiting" (Time off). | `S/p3/shots/AUDIT-E-availability-390x844-100.png`, `S/p3/shots/AUDIT-E-mytime-390x844-100.png` | Legacy strings in `availability/page.tsx`, `employee-time-*`, `timecards.tsx`, `exchange-review.tsx`, `employee-home-reviewed.tsx` | One name for each:<br>• "usual week" ("Save usual week")<br>• "deadline"<br>• "Request a correction"<br>• "Unable to work"<br>• "items" / "Review needed"<br>• "Waiting" | P2 |
| TC-P3-11 | Time off, My time, Home, Profile, Updates · Employee | Sentence case, punctuation, plurals | • Title Case: "Off Clock" (Home, My time), "Clock In" / "Clock Out" (My time entries), "Unable to Work".<br>• Straight apostrophes in kit copy: "Message today's team" (Updates), "Alerts on this device aren't turned on…" (Profile).<br>• Plural: "Showing 1 of 1 earlier entries" (payroll-qa-a, My time).<br>• "waiting on your manager" (band) vs "Waiting for your manager" (timeline).<br>• Notifications says "0 notifications in this view" and then "No notifications in this current view." ("this current", and the empty state twice). | `S/p3/shots/AUDIT-E-mytime-390x844-100.png`, `S/p3/shots/payroll-qa-a-mytime-390x844-100.png` | Strings in the employee time panel, Profile, Updates, Notifications, `requests/page.tsx:63` | • "Off clock", "Clock in", "Clock out", "Unable to work"<br>• ’ in both strings<br>• "Showing 1 earlier entry"<br>• "waiting for your manager"<br>• One empty line: "No notifications here." | P2 |
| TC-P3-12 | Home, My time, Timecards, Time exports · all | Duration and status formats | • Four duration styles: "Starts in 1 h 32 min" (pass), "40h scheduled" (band), "0h 0m" / "8h 0m" (Timecards, entries), "0m" (My time today).<br>• Time exports' row status now renders the raw enum in lowercase ("draft"); before the Rev removal it showed "Draft". | `S/p3/crops/exports-draft-390.png` | • `payroll-export.tsx:128` (`c.state.toLowerCase().replaceAll('_',' ')`)<br>• the countdown in `employee-home-reviewed.tsx` | • One duration style, the kit `Duration` ("1h 32m", "40h", "0m").<br>• A status label map ("Draft", "Finalized", "Needs review"). | P2 |
| TC-P3-13 | Home, My schedule (read failed) · Employee · 390 | Failure copy | • In a transient read failure during the sweep, the pass showed "Home unavailable — try again." while the band says "Couldn’t load Home.".<br>• My schedule repeated "Schedule unavailable — try again" on each of the 7 day rows, plus a card.<br>• Em-dash legacy phrasing, unlike the kit's "Couldn’t load…" and a single "Try again" button. | `S/p3/crops/schedule-top-390.png` | • `employee-home-reviewed.tsx:250` (recovery string)<br>• the employee schedule agenda's per-day unavailable text | • Pass: "Couldn’t load your shift." plus Try again.<br>• Schedule: one message for the week ("Your schedule couldn’t be loaded."), with day rows showing "–". | P2 |

### Not refiled (deliberately not changed)

- Decided-by on the timeline: now approved and done.
- Payday next to hours: now done as the My time eyebrow.
- Clock status inside the pass.
- Desktop beyond "nothing broken".
- Spanish.

### Zero open defects on the Phase 3 screens?

**No.** 13 are open:
- **4 P1**, text under the 15px floor on rebuilt employee screens: TC-P3-01 My schedule, TC-P3-02 Time off, TC-P3-03 Availability, TC-P3-04 Shift requests.
- **9 P2**: TC-P3-05 to TC-P3-13.

## Phase 3, round 2

October 19, 2026 · Crops are under `S/p3r2/crops/`, where `S/` is the scratchpad folder named above.

### How it was measured

**Sweep:** 07:21–07:37 on a source quiet since 07:15, 364 snapshots (`p3r2/dumpE.mjs`), same matrix as round 1:

| Account | Configurations |
|---|---|
| AUDIT-E | 320, 390 and 430 at 100/125/150%; 360; 844×390; 1440 |
| AUDIT-LEAD | 320@100/150, 390, 1440 |
| AUDIT-LONG | 320@100/150, 390 |
| payroll-qa-a | Home, My pay, My time, Timecards |
| AUDIT-M | Updates, Notifications, Time exports |

**Offline check:** Home with the browser switched offline (`p3r2/offline.mjs`).

Read only throughout. Note: `portal-premium.css` changed again at 07:37:20, after the sweep.

### Status

| ID | Status | Measured now |
|---|---|---|
| TC-P3-01 | Fixed | At 320–430 @100: week-strip days 15px, agenda dates 15px, location and position 15px, "Shift options" and "What changed" 15px. |
| TC-P3-02 | Fixed | Labels, "Optional", "0/250" (no stray space) and "Withdraw this request" are all 15px. |
| TC-P3-03 | Fixed | Day names are row type; dates are callout in **Inter**; counts and the deadline card are 15px. |
| TC-P3-04 | Fixed | Detail, lead and zone 15px; dates 15px. |
| TC-P3-05 | Partly fixed | **Fixed:** Updates meta, status, time and counts are all 15px, and the counts show "–" until read.<br>**Not fixed:** the Notifications rows. The fixture now has 2 notifications, which exposes them:<br>• the time "7:00 AM" **11px**<br>• "Unread" and "Action required" **11px**<br>• the destination line "Read the current team update" 12px<br>• "Read update" / "Review schedule" 12px<br>• the row heading "Team update" 14px<br>See TC-P3-14. |
| TC-P3-06 | Fixed | "Published" and "Off clock" are 15px. The More sheet is Inter, sentence case, at 15–17px (name and "Sign out" included). |
| TC-P3-07 | Fixed | The band title is 30/36 on My time and Timecards. The Lead's My time figures are kit figures. |
| TC-P3-08 | Fixed online | "Hi, Alexandra." See TC-P3-16 for offline. |
| TC-P3-09 | Partly fixed | **Fixed:** the Home summary, "Next shift today at 8:00 AM.", stays whole at 320@125/150. The Availability scope line, the payday eyebrow and Recent activity break only after a dash.<br>**Not fixed:** times and dates outside those lines still split:<br>• "Updated Oct 19, 7:21" / "AM" (Home clock, 320@150)<br>• "Updated Oct" / "19, 7:22 AM" (My time, 320@125)<br>• "Oct 13, 2026 – Oct" / "19, 2026" (Timecards, 320@125)<br>• "9:00 AM – 5:00" / "PM" and the "After: …" change lines (My schedule, 320@150)<br>Fix: run `keepWhole()` on the clock "Updated" stamps, My time, the Timecards period and the schedule shift and change lines. |
| TC-P3-10 | Partly fixed | **Fixed:** usual week, deadline, "Request a correction" ×3, "Unrecorded time", "Unable to work", "3 items", "Time off waiting".<br>**Not fixed:**<br>• Home To do still pairs the title "Schedule updated — review required" with the pill "Review needed": two phrasings of one state in one row.<br>• My schedule says "Request a swap"; Shift requests says "Swap shift" for the same action.<br>• The time zone is named three ways: "Times in Puerto Rico time" (pass, Shift requests), "Company time: Puerto Rico" (My schedule week card), "Puerto Rico time" (My time, Profile).<br>Fix: drop "— review required" from the title; "Request a swap" in both places; "Times in Puerto Rico time" everywhere. |
| TC-P3-11 | Fixed | "Off clock", "Clock in", "Clock out", curly apostrophes, "Showing 1 earlier entry", "waiting for your manager". Notifications says "No notifications here." when empty (all filter). |
| TC-P3-12 | Partly fixed | **Fixed:** the countdown reads "Starts in 37m", and Time exports shows "Draft".<br>**Not fixed:** durations still use three styles: "0h 0m" (Timecards, Time exports), "0m" (My time today), "8h 0m" (My time entries). The kit `Duration` would write "0h", "8h".<br>Fix: use the kit `Duration` in all three. |
| TC-P3-13 | Fixed | The pass failure line reads "Couldn’t load your shift. Try again below.". Unavailable schedule days show "–", and the week card carries the message. |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-P3-14 | Notifications (shared, all roles) · 320–430 | Notification rows | Text under the floor:<br>• the time 11px<br>• "Unread" and "Action required" 11px<br>• the destination line and "Read update" 12px<br>• the row heading 14px<br>This is the screen's main content once anything arrives (2 rows in the fixture now). | `S/p3r2/crops/notifications-row-390.png` | `notification-inbox.module.css` (`__rowHeading time`, `__statuses` spans, `__destination`, `__open`); round 2 fixed only `__count` | • Heading `--nv-t-row`<br>• Time and destination `--nv-t-callout`<br>• Statuses as a kit `Status` pill (15/20)<br>• Open link `--nv-t-label` | P1 |
| TC-P3-15 | Home · Employee · all phones | The shift time on the green pass | **Regressed:** "8:00 AM – 4:00 PM" is now **15/24** (the dash 12px), down from 32/40/600 in round 1. The pass's main fact is now smaller than its own "Next shift" heading. | `S/p3r2/crops/pass-390.png` | `src/app/mobile-workforce.css:68` (`.page-frame :is(p,li,dt,dd){font-size:var(--mobile-caption)}`) now beats `employee-home-reviewed.module.css:209` (`.assignment[data-pass] .interval{font-size:2rem}`), because `.interval` is a `<p>` | `html body .app-shell.nevora-portal.nevora-portal .page-frame [data-pass] [class*="__interval"]{font-size:2rem;line-height:2.5rem;font-weight:600}`, and the dash at .8em | P1 |
| TC-P3-16 | Home (offline) · Employee · 390 | Band title and pass message | • Offline, the band title falls back to "Home" (online it says "Hi, Alexandra."), because the name is read from the snapshot.<br>• The pass then says "You’re offline. This updates when you reconnect." under the band's "You’re offline.", which repeats the state the way Manager TC-59 did. | `S/p3r2/crops/home-offline-390.png` | • `employee-home-reviewed.tsx:246` (`name = snapshot ? displayName : undefined`)<br>• `:258` (recovery text) | • Use `displayName` whatever the snapshot state.<br>• Pass offline line: "Updates when you reconnect." | P2 |
| TC-P3-17 | Time off (no requests) · Lead, AUDIT-LONG · 320–430 | Empty state | "Choose your dates and send a request to your manager." is 13px. | `S/p3r2/crops/timeoff-empty-lead-390.png` | `time-off.css`, the `.nto-empty-state span` rule | `--nv-t-callout` | P2 |

### Checked and correct

- **No sideways scroll** at any width or size, landscape included.
- **Contrast:** nothing below 4.5:1 (disabled controls aside); no icon under 3:1. The pass is checked from pixels: the gradient is unchanged, so white text stays at 5.0:1 or more.
- **No clamped text.** The long double surname is shown whole.
- **No leaked escapes or banned words.**
- **New copy reads right:**
  - "Hi, Alexandra.", "Next shift today at 8:00 AM.", "Time off waiting"
  - "Save usual week", "No deadline has been set for this week."
  - "Request a correction", "1 request is waiting for your manager."
  - "Checking your current details…"
  - "Draft" / "Finalized"

### Zero open defects on the Phase 3 screens?

**No.** 7 are open:
- **2 P1:** TC-P3-14 (Notifications rows at 11–14px) and TC-P3-15 (the pass's shift time fell to 15px).
- **5 P2:** TC-P3-09, TC-P3-10, TC-P3-12, TC-P3-16, TC-P3-17.

TC-P3-05's remainder is tracked as TC-P3-14, so it isn't counted twice.

## Phase 3, round 3

October 19, 2026, 10:15–13:35 · Preview `http://127.0.0.1:51302` (build quiet since 09:44) · Crops and data under `S/p3r3/` (`crops/`, `states/`, `shots/`, `json/`), where `S/` is the scratchpad folder named above. Source lines refer to the preview's copy of the app (`src/…`).

### How it was measured

- **Sweep** (`p3r3/dump.mjs`, one browser at a time): computed type, colour, composited contrast, visual line breaks and truncation for every visible text node.
  - Chromium: AUDIT-E and AUDIT-LEAD on every Phase 3 screen at 320, 390 and 844×390; AUDIT-ON and AUDIT-BREAK on Home, My time and Timecards; AUDIT-LONG, payroll-qa-a and payroll-qa-b; spot checks at 360 and 430. Each at 100/125/150/200% text.
  - Phase 2, new checks only: Manager and Owner at 844×390 (100/150%) and 320@200%.
  - WebKit spot check: Employee Home, My schedule, Time off, Availability, My time, Shift requests; Manager Home and the review.
  - About 560 snapshots. Firefox and 768–1440 dropped per the coordinator's cuts. Shell parts (header, tab bar, More sheet, section tabs) are not filed.
- **States, in my browser only** (`p3r3/states.mjs`; every non-GET request held, aborted or answered locally, nothing reached the server): Home and My time with the My time read held, 503, 401 and 403; Home read 401/403; Withdraw pending and failed; Time off submit pending and failed; URL-only feedback (`?submitted=1`, `?saved=1`, `?error=locked|concurrent|invalid`, exchange `?error=…`).
- **Pixels:** pass text contrast sampled around each text box (`p3r3/passpx.mjs`).
- **Caveats:**
  - The dev server returned 503s and 60s timeouts throughout (load average 15–25). Every load was retried; pages that never loaded are listed under gaps.
  - Landscape snapshots at 125%+ taken after a full-page capture showed the desktop shell. A dedicated probe (`p3r3/landscape.mjs`, Chromium and WebKit, 100–150%) keeps the phone layout (`portal-location-nav` hidden, tab bar shown), so that was a capture artifact, not filed.
  - Timecards, Time exports and Updates load through POST reads. I first blocked them (that's how their failure copy was captured), then re-loaded them with load-time reads allowed and no interaction (`p3r3/json/post/`).

### Status of earlier items

| ID | Status | Measured now |
|---|---|---|
| TC-P3-05 | Closed | Remainder tracked as TC-P3-14, which is fixed. |
| TC-P3-09 | **Partly fixed** | **Fixed:** "Updated" stamps break only after "Updated" (My time, Home clock, 320@150); the Timecards period, My schedule shift lines and the "After:" times stay whole.<br>**Still split** (crops `crops/home-todo-320.png`, `crops/timeoff-my-320-125.png`, `crops/home-recent-320-150.png`, `crops/lead-schedule-change-390.png`):<br>• Home To do "Week of Mon, October" / "19, 2026" at **320@100**<br>• pass date "Today · Mon, October" / "19, 2026" (320@125); eyebrow "Good morning · Monday," / "October 19" (320@125)<br>• "Recorded Mon," / "Oct 19, 9:11 AM" (320@125); Recent activity dash alone on its line, "2026" / "–" / "Oct 30, 2026" (320@150)<br>• Time off row titles "Nov 18, 2026" / "– Nov 19, 2026" (320@125), so the range breaks before the dash<br>• timeline "Declined by Morgan Rivera" / "· Oct 17" (320@125, 390@150)<br>• schedule change lines "After: Oct 19 · 9:00 AM – 5:00 PM" / "· Main Office …" at **390@100** (Lead) and 390@125 (Employee)<br>• "Partial day · 9:00" / "AM – 1:00 PM" (320@200); Shift requests "8:00 AM – 4:00" / "PM" (390@200)<br>• My time durations "3h" / "40m", "1h" / "52m" (390@150), "Mon, Oct" / "19" (390@200)<br>Causes: `employee-home-reviewed.tsx:115, 158, 159` (dates not passed through `keepWhole`); `requests/page.tsx:94, 105` and the meta template (plain spaces); `exchange-assignment.tsx:11`; `lib/duration-text.ts:7` (`${hours}h ${rest}m`); `keep-whole.ts` handles " – " but not " · " or "Mon, ". |
| TC-P3-10 | Fixed | The To do title is "Schedule updated" with the "Review needed" pill; "Request a swap" in both places; "Times in Puerto Rico time" on the pass, Shift requests and Timecards. New splits are TC-P3-24. |
| TC-P3-12 | Fixed | "0h", "37m"-style, "3h 40m", "1h 52m", "Breaks: 0h", "Starts in 19h 7m" (Employee); Manager Timecards and Time exports "6h 51m", "4h 1m", "0h". No "0h 0m" or "h 0m" anywhere. |
| TC-P3-14 | Fixed | Notification rows: heading 17/22/500, time 15/20, "Unread" and "Action required" 15/20/500 pills (5.53 and 5.66:1), destination 15/20, "Read update" 15/20/500. |
| TC-P3-15 | Fixed | Pass shift time 32/40/600 at 320 and 390. |
| TC-P3-16 | Fixed in code, not re-measured | The pass's offline line is "Your shift updates when you reconnect." (`employee-home-reviewed.tsx:261`), not a repeat of the band. Both offline runs hit server timeouts before Home loaded, so I couldn't see it on screen. The name clearing is deliberate and not refiled. |
| TC-P3-17 | Fixed | "Choose your dates and send a request to your manager." is 15/20 #5F666A (AUDIT-LONG, 320). |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-P3-18 | Home, Time off, Availability (states) · Employee, Lead · 320–430; landscape | State messages under the 15px floor | • Home clock card title "Recorded time unavailable", "Loading recorded time" and "Sign in again" (401/403): **14/21/600**. The same title on My time is 17/24.<br>• Time off "Your request was submitted for manager review. Track the decision below." (toast): **14/19.6** #1C1C1C. The kit toast is 15/20.<br>• Availability feedback ("…has been updated.", "The availability deadline for this week has passed.", "Your availability changed while saving…", "Every available day needs…"): **14/21**.<br>• 844×390 @100: Availability specific-week card "Weekly submission" and "These hours apply to this schedule week." **12px**. | `states/home-clock-503-chromium-390.png`, `states/home-clock-403-chromium-390.png`, `states/url--app-requests-tab-my-submitted-1-chromium-390.png`, `states/url--app-availability-week-2026-10-26-saved-1-chromium-390.png`, `shots/emp3/chromium_AUDIT-E_-app-availability-week-2026-10-26_844x390_100.png` | • `globals.css:12802` (`.employee-time-message{font-size:calc(14*…)}`); `employee-mobile-corporate.css:116` only lifts it inside `.employee-view`, not Home's `.employee-clock-compact`<br>• `time-off.css:61` / `globals.css:757` (no kit role on `.form-success`)<br>• `availability.css:74-76` (`.av-feedback` sets no size)<br>• `availability.css:55, 57` (12px), with the phone fix at `:202-204` limited to `(max-width:760px)` | • `…[data-nv-page] .employee-clock-compact .employee-time-message strong{font:var(--nv-t-label);font-weight:600}`<br>• Toast and `.av-feedback`: `font:var(--nv-t-label)` (15/20), the kit toast's role<br>• Use the shared phone query (`…,(max-width:900px) and (max-height:430px) and (orientation:landscape) and (pointer:coarse)`) at `availability.css:202` | P1 |
| TC-P3-19 | Inbox (Phase 2) · Manager, Owner · all widths | "Period timecard needs review" row meta | Raw ISO dates in kit text: "Casey Rivera · **2026-10-19–2026-10-25** · Resolve recorded-time exceptions before finalizing." This appears now that AUDIT-ON and AUDIT-BREAK have open entries. | `crops/inbox-iso-390.png`, `shots/mgr/chromium_AUDIT-M_-app-inbox_844x390_100.png` | `lib/action-center/intelligence.ts:285` (`${start}–${end}` from ISO dates) | Format with the workspace dates and `keepWhole`: "Casey Rivera · Oct 19 – Oct 25 · Fix recorded-time issues before finalizing." | P1 |
| TC-P3-20 | Timecards · Employee (and Manager details) · all widths | Issue label on a clocked-in person's timecard | "Needs attention · **Missing clock out**" for AUDIT-ON, who is clocked in right now. "Missing" is an F5-banned blame word, and the state isn't missed, it's still open. | `json/post/` (AUDIT-ON 390, text "Missing clock out", 15px #7A4B15) | `components/timecards.tsx:21` (`open_entry:'Missing clock out'`) | `open_entry: 'Still clocked in'` (or "No clock-out yet") | P1 |
| TC-P3-21 | Home · Employee, Lead · 320–430 | "Published" pill on the pass | White text on the pill's 16% white fill measures **4.06–4.18:1** (pixel median inside the pill; 3.8 worst) at 15/20/500. The gradient right outside the pill is 5.7:1, so the 16% fill pushes it under 4.5. | `p3r3/passpx.mjs` output (AUDIT-E and AUDIT-LEAD, 390) | `employee-home-reviewed.module.css:206` (`.published{background:rgb(255 255 255/.16)}`) over the glow at `:199-202` | `background: rgb(0 0 0 / .18)` (white text ≥ 6:1), or drop the fill to `rgb(255 255 255/.08)` and re-measure | P2 |
| TC-P3-22 | My time, Timecards · Lead · 320–430 | Whole page type | The Lead still gets the legacy set while the Employee gets the corporate kit set: "Current status" and "Choose a period" 20/28/**550** (Employee 20/27/600); "Refresh" 17/25.5 ink (Employee 15/20/500 teal); "Period start" and "Period end" 17/25.5 (Employee 15/24); "Request a correction in My time →" vs the Employee's "Request a correction". This is TC-P3-07's role split coming back on these two pages. | `crops/lead-mytime-current-390.png` | `components/app-shell.tsx:170` sets `data-employee-corporate` only for `user.role === "EMPLOYEE"` | `["EMPLOYEE","LEAD"].includes(user.role)`, and one label, "Request a correction" | P2 |
| TC-P3-23 | My time, Home clock card · clocked in / on break · 320–430 | Current entry line | • "Oct 19, 7:12:14 AM · **Clock In**": Title Case, which TC-P3-11 fixed elsewhere, plus seconds in a person-facing time ("Record details" also says "10:52:52 AM").<br>• The entry reads "7:12 AM – In progress" with an "In progress" pill under it, so the same words twice.<br>• On break at 390@150, "4h 42m since clock-in · 1h" / "52m on break" splits a duration. | `crops/on-mytime-today-390-150.png`, `states/…home-ready-AUDIT-BREAK` text | `employee-time-panel.tsx:58` (hard-coded "· Clock In", `stamp()` with `second:'2-digit'` at `:17`); `lib/duration-text.ts:7` | "Clocked in at 7:12 AM" via `checked()` (no seconds); NBSP inside durations; end the range "7:12 AM – now" or drop the pill | P2 |
| TC-P3-24 | Home, Time off, Requests overview, Shift requests, Inbox, Schedule · all roles | Same thing, different words (new) | • Time off outcome: Recent activity says "Time off **denied**" and "Time off **cancelled**"; Time off says "Declined" and "Withdrawn".<br>• Waiting: hub "**Pending**, approved and past requests"; withdraw "I confirm withdrawal of this **pending** request" / "Withdraw **pending** request"; band "waiting for approval" vs timeline "Waiting for your manager".<br>• "callouts" / "callout" / "call-out" (hub, My schedule), while the action is "Unable to work".<br>• "Designated lead" vs "No designated **Lead**" in one card.<br>• "Back to home" (error page, Home views) vs "Back to Home" (Schedule, module-off).<br>• Manager Schedule "Times in Puerto Rico." vs "Times in Puerto Rico time" everywhere else.<br>• Inbox "Availability deadline not set" / "Set the weekly **cutoff**…" | `crops/home-recent-320-150.png`, `crops/hub-390.png`, `states/withdraw-open-chromium-390.png`, `crops/exchange-card-390.png` | • `lib/data/employee-home.server.ts:153` (raw status lowercased)<br>• `requests/hub/request-hub.tsx:29-39`<br>• `time-off-withdrawal.tsx:22-23`<br>• `employee-my-schedule.tsx:79`<br>• `exchange-assignment.tsx:14`, `shift-slot.tsx:4`<br>• `app/app/error.tsx:21`, `app-error-screen.tsx:22`, `app/app/page.tsx:73`<br>• `manager-weekly-roster.tsx:179`<br>• `manager-actions.ts:262` | • Map statuses on Home: waiting / approved / declined / withdrawn<br>• "Waiting, approved and past requests"; "Yes, withdraw this request" / "Withdraw request"; timeline "Waiting for approval"<br>• "Unable to work" in employee copy ("Swaps, coverage and unable-to-work requests")<br>• "No designated lead"<br>• "Back to Home"<br>• `timeZoneLabel()` in the roster<br>• "Set the availability deadline before employees finalize availability." | P2 |
| TC-P3-25 | Home, My time, Timecards, Updates, Profile, Notifications, Time off withdraw · Employee, Lead · all widths | Failure, session and pending copy | Four patterns for "couldn't load", system-speak, and buttons that don't match the sentence:<br>• "Couldn’t load your shift. **Try again below.**" over a button labelled "Retry home"<br>• "Recorded time unavailable / Your latest clock records could not be confirmed. **Try refreshing.**" (My time) vs "Couldn’t check your records. Try again." (Home)<br>• "Timecards unavailable. Try refreshing."; "Updates unavailable / Refresh to check current information."<br>• "We **could not** confirm your current information." (Notifications) vs "We **couldn’t** confirm…" (Profile)<br>• 401/403: "Sign in again / **Your current employee session is required.** / **Sign In**" (Title Case)<br>• Withdraw: "Checking current request and permission…"; failed: "The outcome could not be confirmed. Retry the same withdrawal to check its original result." + "Retry same withdrawal"<br>• Exchange errors in the third person to the employee, with a straight apostrophe: "The exchange is outside **the employee's** submitted availability.", "The employee is not eligible to work at that location." | `crops/home-clock-390.png`, `states/mytime-503-chromium-390.png`, `states/mytime-403-chromium-390.png`, `states/withdraw-failed-chromium-390.png`, `states/url--app-exchange-tab-requests-error-OUTSIDE-AVAILABILITY-chromium-390.png` | `employee-home-reviewed.tsx:261, 342`; `employee-time-panel.tsx:50-59`; `timecards.tsx` (error branch); `employee-updates.tsx:55`; `notification-inbox.tsx:90`; `employee-account-panel.tsx:21`; `time-off-withdrawal.tsx:22-30`; `exchange/page.tsx:47-62` | One pattern, as on the Manager side: "Couldn’t load {thing}." + a "Try again" button<br>• Session: "Your session ended. / Sign in"<br>• Withdraw: pending "Withdrawing…" only; failed "We couldn’t confirm the withdrawal. Try again. It won’t withdraw twice." + "Try again"<br>• Exchange: "That’s outside your availability.", "You can’t work at that location." | P2 |
| TC-P3-26 | Home, My time · Employee · WebKit, 390 | Date-and-time stamps | WebKit writes "Updated Oct 19 **at** 12:37 PM" and "Recorded Mon, Oct 19 at 9:11 AM"; Chromium writes "Oct 19, 12:37 PM". One stamp, two wordings by browser, and the "at" form splits ("Oct 19 at" / "9:11 AM" at 390@200). | `json/xb/` (WebKit AUDIT-E 390) | `employee-time-panel.tsx:16-17` and Home's `stamp()`: one `Intl.DateTimeFormat` with date and time fields, where Safari inserts "at" | Format the date and time parts separately (`formatToParts`, or two formatters) and join them with ", " | P2 |
| TC-P3-27 | Home · Employee, Lead (on shift) · all widths | Pass note | Straight apostrophe: "Clock status below shows whether you**'**re clocked in." Also in code: "This week's submitted hours are locked." (Availability, locked) and the exchange errors in TC-P3-25. | `crops/home-pass-320-125.png` | `employee-home-reviewed.tsx:299` (`&apos;`); `availability/page.tsx` (locked span) | ’ (U+2019) in all three | P2 |
| TC-P3-28 | Home, My time, Timecards, Profile, Time off · Employee, Lead · 320–430 | Headings and text actions off the kit | One screen has several heading and link sets:<br>• Home pass "Your shifts" 20/28/**550**; "Scheduled now" and "Next shift" 17/25.5/550; next to "To do" and "Quick actions" 19/25/600<br>• Home clock card "Refresh" 17/25.5/500 and "My time" 17/25.5/600, next to Quick actions links 15/20/600 and "View all activity" 15/20/500<br>• My time and Timecards "Current status", "Today", "Choose a period" 20/27/600 #1C1C1C; Profile "Work details" 20/28/550; Time off "Your request at a glance" 17/25.5/550; Updates failure "Updates unavailable" 16/22.4 | `crops/home-clock-390.png`, `shots/emp3/chromium_AUDIT-E_-app_320_100.png` | `portal-design-system.css:47` (page `h2`, weight 550, as in TC-13) and `mobile-workforce.css:70` (`a, button` at 17/1.5, as in TC-12) still reach these legacy parts | Card titles: `font:var(--nv-t-headline)` (17/22/600) or title-3 (19/25/600), one role per level, on the pass headings, `.employee-time-*` headings, Profile and Time off section titles. Text actions: `font:var(--nv-t-label)` (15/20/500) on `.employee-time-refresh` and `.employee-time-link`. | P2 |
| TC-P3-29 | Availability (specific week) · Employee, Lead · 320–430 | Context card line | "These hours apply to this schedule week." stays **15px** at 125%, 150% and 200% (want 18.75 / 22.5 / 30). It doesn't follow text size. Also in WebKit. | `crops/avail-week-390-200.png` | `availability.css:203-204` (`font-size:15px; line-height:1.45`; also `.av-upcoming-banner span`) | `font: var(--nv-t-callout)` | P2 |
| TC-P3-30 | Phase 2 screens at 320@200 · Manager | Wraps under the new 200% check | • Attendance "Updated 12:25" / "PM"<br>• Schedule band "…published · 42" / "shifts this week"<br>• Updates group "October" / "19, 2026" and row "Oct 19," / "2026, 9:11 AM"<br>• Notifications group "Monday, October" / "19, 2026"<br>• Home "Coverage gap at Main Office" row title **clamped** (scrollHeight over clientHeight, 3-line clamp) | `shots/mgr/chromium_AUDIT-M_-app_320_200.png`, `json/mgr/` | Attendance footer `<small>` and Updates/Notifications group headings don't use `keepWhole`; the schedule summary joins count and noun with a plain space; `kit.css` `.nv-row__title` clamp | `keepWhole` on those strings; NBSP between count and noun; `-webkit-line-clamp: unset` on Home's row titles as on Inbox (`inbox.css:28-29`) | P2 |
| TC-P3-31 | Time off · Employee · 390 | Submit failure | When the send fails (network), the whole page becomes "This page could not be loaded / Your current information is unavailable. / Try loading the page again before taking an action." The words don't say whether the request was sent, and the dates entered are gone. Behaviour is the interaction inspector's; the wording is mine. | `states/timeoff-failed-chromium-390.png` | The form posts a server action (`requests/time-off-form.tsx`, `requestTimeOffAction`) with no client catch, so the root error boundary renders | Catch the failure in the form and show an inline alert: "Your request wasn’t sent. Check your connection and send it again.", keeping the fields | P2 |

### Suggestions for Jose (payroll wording, not counted)

- **My pay:** "Contact your payroll administrator if a statement is missing." uses the F5 word. Suggested: "…if a statement isn’t here."
- **My pay:** the empty card says it twice: "Statements appear here after payroll publishes them." and "Your pay statements will appear when your company publishes them." Suggested: keep the second.
- **Data gap, not wording:** payroll-qa-b, described as "a lead with pay statements", shows "No published statements yet", so I couldn't check statement rows.

### Checked and correct

- **Floor at 100%:** ready states at 320, 390 and 844×390 have no text under 15px outside TC-P3-18 (tab 13, badge 12 and "Workforce" 13 are the accepted exceptions). Timecards ready, Updates ready and Notifications ready are all 15px or more.
- **Contrast:** nothing under 4.5:1 apart from TC-P3-21 and the exempt disabled Updates filters (2.29–3.84, shown only while the read fails). No icon under 3:1. Pass text: 5.6–9.2:1 from pixels.
- **New states read right:** "Hi, Jordan." / "Hi, Casey." / "Hi, Taylor."; "Clocked in", "On break", "Off clock" (15/20/500); "3h 40m since clock-in"; "Starts in 19h 7m"; "Designated lead" on the Lead's pass; "Approved by Morgan Rivera · Oct 17", "Declined by Morgan Rivera · Oct 17", "Withdrawn · Oct 17" (no name), "Partial day · 9:00 AM – 1:00 PM".
- **Copy:** no leaked escapes, `undefined` or `NaN`. No "missed" in kit text. Sentence case except TC-P3-23 and TC-P3-25. Curly apostrophes except TC-P3-27. No clamped or ellipsized names; the long double surname is whole.
- **Landscape and WebKit:** landscape keeps phone type at 100–150% (probe in both engines). WebKit matches Chromium apart from TC-P3-26.

### Gaps

- **Not seen on screen:**
  - Home offline (TC-P3-16): two attempts timed out on the server.
  - The Owner's Payroll at 844×390 and 320@200: page load timed out.
  - Manager Team at 320@200: page load timed out.
  - Profile ready state: its read failed on every load (Profile showed "We couldn’t confirm…").
- **Not run:** the On-screen keyboard, which belongs to the interaction inspector.
- **Server noise:** 503 and timeouts all session; none filed as defects.

### Zero open defects?

**No.** Type, colour and copy have 14 open on the Phase 3 and Phase 2 screens under the new checks:
- **3 P1:** TC-P3-18 (state messages at 12–14px), TC-P3-19 (ISO dates on the Inbox), TC-P3-20 ("Missing clock out" on a clocked-in timecard).
- **11 P2:**
  - Partly fixed: TC-P3-09.
  - New: TC-P3-21 to TC-P3-31.
