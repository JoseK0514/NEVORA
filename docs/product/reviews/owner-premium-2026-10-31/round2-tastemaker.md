# Owner premium, round 2: taste and craft critique (Oct 31)

Method: `anthropic-skills:tastemaker` (CR craft floor, then TS taste ladder), sharpened with `better-ui` and
`better-typography`. Critique only; no app code changed, nothing submitted or saved.

**What was looked at.** Branch `claude/owner-premium-20261031` on the local fictional preview (`state.json` URL),
signed in as `QAOWNER` and, for comparison, Employee `AR0142`. Captured with `cap.mjs`, light mode, 11 Owner routes:
- Desktop, Chromium 1440x900: `.claude/r1-tools/crit-taste/cap/chromium-QAOWNER-light-1440x900/`
- Phone, WebKit 390x844 (2 frames each): `.claude/r1-tools/crit-taste/cap/webkit-QAOWNER-light-390x844/`
- Employee Home: `.claude/r1-tools/crit-taste/cap/webkit-AR0142-light-390x844/app-0.png` and `chromium-AR0142-light-1440x900/app-0.png`
- Contact sheets: `.claude/r1-tools/crit-taste/cap/sheet-round2-desktop.png`, `sheet-round2-phone.png`

Values below come from computed styles read in the browser (a read-only probe over the same session), not from
estimating pixels, unless marked "measured from the screenshot". Contrast ratios are WCAG 2 relative luminance.

All screenshot paths below are relative to `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/crit-taste/cap/`.
`D/` = `chromium-QAOWNER-light-1440x900/`, `P/` = `webkit-QAOWNER-light-390x844/`.

---

## 1. Verdict

**Reading this as:** an operations tool for a small-business owner (cafe owner, moderate design literacy, often in a
hurry), register calm, confident, trustworthy; stakes medium to high (payroll, coverage). Contextual ceiling
(TS-011): **Characterful**, the Gusto level. Convention does most of the work, and a few owned details make it
recognisable. Convicted distinctiveness would be over-reaching for payroll.

**Grade: Competent.** The craft floor mostly holds: Inter is now everywhere (27 of 27 checked text nodes on Home), a
3-step radius set (6 chips, 8 controls, 12 cards), a clean cool-grey ink ramp (#1A1C1E / #4A4F54 / #6B7075), one teal.
The work has reached **Coherent** in structure but stops short of it in finish, and it has not started on
**Characterful**.

**Why it still reads as a template.** At thumbnail size (`sheet-round2-desktop.png`) all six desktop pages look the
same: grey canvas, white boxes with a 44px title strip, a small 22px title, everything in 13–15px semibold. No page
has a focal weight, and the only mass of colour on any page is the pink payroll banner. Three things cause it:
1. **No type contrast.** The page title (22/600) is only 1.1× the card hero (20/600) and 1.3× the numbers (17/600),
   and weight 600 carries every level: 13px/600 is the most-used style on the desktop (224 text nodes in 11 pages).
   When everything is semibold, nothing is.
2. **Every card is the same object.** Header band, divider, rows, all at the same ring weight, the same 12px gap, and
   the same 52–56px rows on all 11 pages. That's the admin-kit signature (TS-007: monotony instead of rhythm).
3. **Decisions not yet taken.** Several Wave A items are still visible, among them status pills, amber and red used
   three times on one screen, title heights that wander, four button heights and two period controls. These are
   the leftover choices that make the product read as assembled rather than authored (TS-006).

Owner is now less decided than Employee. Employee Home (`webkit-AR0142-light-390x844/app-0.png`) has one hero (the
next shift at 22px) and one action. Owner Home has three equal cards and two status colours. Gusto feels premium
because of a few strong decisions (big confident titles, quiet labels, one colour doing one job, aligned numbers),
not because of decoration. All of those decisions fit inside the approved look.

---

## 2. Craft-floor findings (CR rules)

> KB note: the tastemaker install on this Mac ships only `SKILL.md`; the `kb/` entry files and ID validators are not
> bundled. IDs and titles below are taken from the skill's own index tables. Consensus grade is given where the
> index states it (CR-201 and CR-301 law, CR-502 heuristic); elsewhere it is marked "grade n/a".

### Finding-01: type hierarchy is flat (weight and size both)
`CRAFT` · `TYPE` · CR-101 (hierarchy via weight + colour) · CR-102 (cap ~5 sizes) · grade n/a

**Measured.** Desktop uses 8 sizes: 9 (wordmark "Workforce"), 12, 13, 14, 15, 17, 20, 22. Phone uses 8: 9, 11, 13, 15,
16, 17, 20, 22. Weight 600 appears at 13, 15, 17, 20 and 22. Section labels ("Today", "Up next", "People") are 13/600
#4A4F54, the same weight as schedule chips, column headers and tab labels. Card hero "Weekly payroll" is 20/600 and
page title is 22/600: 2px apart.

**The fix.** Five text styles in the app body (the wordmark and the ⌘K hint are exempt):
| Role | Now | Fix |
|---|---|---|
| Page title | 22/28 600, -0.3px | **desktop 28/34 600, letter-spacing -0.56px; phone 24/30 600, -0.45px** |
| Card hero / key figure | 20/26 and 17/22 600 | **20/26 600, -0.36px** (one size for both "Weekly payroll" and KPI figures) |
| Row title / name | 15/20 600 | 15/20 **500** (Inter Medium), -0.13px |
| Body / detail | 15/20 400, 13/18 400 | unchanged |
| Section label, column header, chip | 13/18 600 #4A4F54 | **13/18 500 #6B7075**, letter-spacing -0.04px |

The 17px step disappears, and 600 is kept for the title and the hero only. The title-to-hero ratio goes from 1.1× to
1.4× (desktop). That one change gives the page an entry point.

**The rule.** Hierarchy comes from contrast. When levels differ by 2px and share one weight, the eye cannot rank them.

**Train your eye.** Squint at `D/app_payroll-0.png`. If the page title, "Weekly payroll" and "Up next" blur to the
same grey, the hierarchy is flat.

### Finding-02: title block lands at five different heights
`CRAFT` · `ALIGNMENT` · CR-402 (one strong edge, no drift) · grade n/a · *still showing from PLAN A7*

**Measured (h1 top, desktop).** 104 Home, Timecards, Insights · 106 Payroll, Team · 112 Schedule · 128 Clocker
tablets · ~132 Pay history and More (back link above). The gap from title to first content runs 12 to 28px: Inbox card
at 146, Insights tabs at 144, Team search at 168, Schedule week bar at 196.

**The fix.**
- `.page-head { margin-top: 48px; min-height: 40px; display:flex; align-items:center; gap:16px }`. Actions sit in this
  row, so a 40px button never pushes the title down.
- Subtitle 4px below the title. First content always 24px below the title block (`.page-head + * { margin-top: 24px }`).
- Desktop back links ("‹ Payroll", "‹ Settings", "‹ Home") move into the top bar's left slot, which is empty today,
  so the h1 is at the same y on every page.

**The rule.** The title is the strongest repeated edge in an app. If it moves between pages, every page change reads
as a layout shift.

**Train your eye.** Flip between two tabs quickly. If the title jumps, the system has drifted.

### Finding-03: four button heights and two badge styles
`CRAFT` · `ALIGNMENT` · CR-403 (radius and size consistency) · grade n/a · *Jose rule 5; still showing from PLAN A7*

**Measured (visible box, from the screenshots).** Top-bar Search/Export 30px · Pay history, Add, All locations 32px
(44 hit area via 6px transparent border) · Find cover, Prepare payroll 40px · Add another tablet 44px. Outline buttons
come in two colours: neutral (Pay history, Settings) and teal (Add, Add another tablet). The sidebar "Things to do"
badge is teal-filled (5) while row badges are neutral grey (1), which goes against the fixed neutral-badge decision.

**The fix.** Desktop has two tiers: utility 32px (top bar only) and action 40px (everything on the page). Phone is 44px.
Secondary is one style: `background:#fff; box-shadow: inset 0 0 0 1px #D5D8DA; color:#1A1C1E; height:40px;
padding:0 16px; border-radius:8px; font:500 15px/20px Inter`. Sidebar badge: `background:#EDEEEF; color:#1A1C1E;
font:600 12px/20px Inter; min-width:20px; height:20px; border-radius:10px`.

**Train your eye.** Line up every button on a page against one ruler. More than two heights means nobody decided the
size.

### Finding-04: colour discipline breaks on four screens
`CRAFT` · `COLOR` · CR-203 (one reserved accent) · CR-204 (semantic colour) · grade n/a · *Jose rules: red once, as
text; no status colours or pills; still showing from PLAN A5*

**Measured.**
- Home (`D/app-0.png`, `P/app-0.png`): "No clock-in 1" red #B42318 **and** "Open shifts 3" amber #8A4B00 in one card.
- Payroll (`D/app_payroll-0.png`, `P/app_payroll-0.png`): pink fill #FDECEA + red title + red body + red underlined
  link, so red appears four times. There is also a grey "Due in 2 days" pill.
- Phone Schedule (`P/app_schedule-0.png`): the open-shift row has a red 1px border, red text and a red dashed plus
  icon, and sits next to a teal "Published" pill and a grey "No clock-in" pill. Desktop Schedule
  (`D/app_schedule-0.png`) has a pink icon tile beside "Open shifts" and a teal "Published" pill.
- Clocker tablets (`D/app_settings_clocker-0.png`): amber pill "2 need setup" on #FEF4E6, while Settings shows the
  same fact as plain grey text.
- Teal does 7 jobs on Schedule: primary button, links, active nav, today marker, Published pill, shift-chip fill
  (#E6F1EF, 21 chips), and the sidebar badge. When teal fills every shift it no longer marks the action.

**The fix.** Ink for figures (`Open shifts 3` in #1A1C1E). Red is allowed once per screen, as text, for the real
problem: the payroll banner becomes a white card with a red title, body in #4A4F54, and "Start with Sep 21 – 27" as
the 40px secondary button. Drop the "Published", "Due in 2 days" and "2 need setup" pills and use plain 13/500 #6B7075
text in the same place. Remove the red border and icon from the phone open-shift row; the words "Open shift" plus
"Find cover" are enough. Shift chips become `background:#F1F3F4; color:#1A1C1E`, and teal stays only on today's column
header and on actions.

**Train your eye.** Count the colours that aren't ink or grey on a screen. If more than one teal role and one red word
show, the screen is shouting.

### Finding-05: past open shifts fail contrast and add noise
`CRAFT` · `COLOR` · CR-201 (contrast threshold) · **law**

**Measured.** On the desktop schedule, past-day open-shift chips ("12a – 6a", "12:30p – 12a") are #A7ACB1 on white =
**2.29:1**, which fails 4.5:1. Mon–Fri hold four of them each, so 18 low-contrast chips take up the tallest row of the
grid (136px).

**The fix.** For past days, collapse the column to a single line, "4 open", in 13/500 #6B7075 (5.0:1), set at the top
of the cell. Today and future days keep their chips at full ink. The data stays the same; only the rendering changes.

**Train your eye.** Greyed-out text on white below about #8A8F94 almost always fails. If content is not worth
reading, remove it instead of fading it.

### Finding-06: flat surfaces; the card edge is a 1.08:1 whisper
`CRAFT` · `SHADOW` · CR-302 (elevation ramp) · CR-303 (layered, tinted shadows) · grade n/a

**Measured.** Cards are #FFF on a #F5F6F6 canvas (1.08:1), separated only by `0 0 0 1px #E3E5E6` (1.17:1 to the
canvas). The app has no elevation token, and cards, banners, the segmented control and the week bar all sit at the
same level. Old warm greys still appear: Insights top-bar controls use border #E2E2DF with radius 7px, Schedule uses
#ECECEA and #FAFAFA. Everything else uses the cool #E3E5E6, #EDEEEF and #F5F6F6.

**The fix.** One card elevation, cool-tinted and layered:
`box-shadow: 0 0 0 1px rgb(16 24 32 / 0.07), 0 1px 2px rgb(16 24 32 / 0.05), 0 2px 8px -2px rgb(16 24 32 / 0.05);`
Sheets and popovers get the next step: `0 0 0 1px rgb(16 24 32/.06), 0 8px 24px -4px rgb(16 24 32/.14)`. Map #E2E2DF
and #ECECEA to #E3E5E6, map #FAFAFA to #F5F6F6, and make the radius 8px.

**Train your eye.** Cover the borders with your thumb. If the cards vanish into the page, the surface has no depth.

### Finding-07: rhythm is one beat repeated
`CRAFT` · `DENSITY` · CR-004 (rhythm) · CR-502 (tension/release) · **heuristic**

**Measured.** The gap between cards is 12px on 10 pages and 16px on Home. Every card opens with a 44px header band
plus a divider. Within a group, the gap is 12px, and the gap between different topics is also 12px (Settings:
Company / Scheduling / Clocker / Pay).

**The fix.** Two gaps: 12px inside a group and **32px between groups**. On list pages (Settings, More, Team, Pay
history, Things to do), move the section label above the card as an inset-grouped header:
`font:500 13px/18px Inter; color:#6B7075; margin:0 16px 8px`. The 44px band and its divider go away. Cards that carry
an action (Today, Up next) keep the in-card header.

**Train your eye.** Look at a long page in thumbnail. If every gap is the same, the page has no paragraphs.

### Finding-08: Pay history rows wrap and stack
`CRAFT` · `TYPE` · CR-103 (measure) · grade n/a · *PLAN A11 partly still showing*

**Measured.** Desktop statement rows have 4 lines (name, period, status, filename) and are 96px tall. On phone
(`P/app_payroll_history-0.png`) they reach 6 lines and ~170px, with an orphaned "1" from "Revision 1" and View and
Download on a separate line.

**The fix.** Two lines: name (15/500), then `Oct 12 – 18 · Payday Tue, Oct 20 · Correction` (13/400 #6B7075).
Put the filename and revision in the View sheet. Keep the actions on the first line, right-aligned, with the 20px
download icon in a 44px hit area. Add `text-wrap: pretty` on detail lines.

### Craft score
Spacing ✗ (title drift 104–132, one 12px beat) · Type ✗ (8 sizes, 600 everywhere) · Colour ✗ (red ×4 on Payroll,
amber, pills, 2.29:1 past chips) · Shadow ✗-minor (no elevation, warm-grey leftovers) · Alignment ✗ (4 button
heights, 2 badge styles) · Density ✓-for-context (rows 52/56, card padding 16, nothing cramped).

---

## 3. Taste findings (TS principles)

### Finding-09: no page has one thing
`GAP` · `COHERENT` · TS-003 The One-Thing Rule

> *Verdict: each page needs one element that is clearly bigger than the rest. Right now none of them has it.*

**What I see.** Desktop Home (`D/app-0.png`) has three cards of near-equal weight in a 992px frame that ends at y=392,
leaving 500px of empty canvas. The left column ends at 342 and the right at 392, so their bottoms don't line up.
Payroll (`D/app_payroll-0.png`) has a 601px main column and a 375px side column that holds one 56px "Time exports"
card, which is also a tab directly above it. Employee Home, by contrast, leads with the shift time.

**Judgment.** Owner Home lists what is happening today instead of choosing what matters most. That is the clearest
sign it was assembled rather than designed.

**Fix.** On Home, the Today card becomes the hero: full content width, KPI figures at 20/600, "Find cover" as the only
filled button. Payday and Things to do sit below it as a 2-column pair with `align-items:stretch`, so their bottoms
line up. On Payroll, remove the side column and go to a single 720px column (Up next, then Recent payrolls). Time exports
stays as a tab. *After:* each page opens with one confident block, and a second look shows a short, calm list.

### Finding-10: the same idea, said several ways
`GAP` · `COHERENT` · TS-006 Single Voice · TS-010 Editing vs Listing

**What I see.**
- Counts appear in five styles: "Shifts (4)", "Team (9)", tab "All 9", badge "1", "Show all 9", pill "2 need setup".
- The period is chosen in two places on Insights: top-bar "This week so far ▾" and a segmented control
  (*PLAN A8 still showing*).
- Page actions sit in the top bar on Insights (Export) but in the title row on Payroll and Team.
- Timecards repeats its date: the subtitle reads "Oct 26 – Nov 1 · 9 people" and the card header reads "Oct 26 – Nov 1".
- Insights shows 24.1 h twice ("24.1 h recorded" and "24.1 h total").
- Payroll offers Pay history twice and Time exports twice on one screen.
- Things to do ends with three centred grey text links under a left-aligned column (`D/app_inbox-0.png`).

**Judgment.** Each repeat is small. Together they read as a product that was never edited, and editing is what
premium looks like.

**Fix.** One count voice: label, then a figure in #6B7075 with no brackets ("Shifts  4"), and badges only in
navigation. One period control per page, in the title row. Delete the duplicate date, the duplicate total and the
duplicate links. Turn the Things to do footer into a final inset group, "More requests", with three normal rows.

### Finding-11: no signature detail yet
`GAP` · `CHARACTERFUL` · TS-008 Type as First Material

**What I see.** Times, dates and money are the product's core material, and they render as default text: "12:00 AM –
8:00 AM", "12a – 6a", "8 h 2 min". Tabular figures are on for KPI numbers (`tnum` measured), but there is no
case-sensitive punctuation, no consistent AM/PM treatment and no thin spacing. The en dash sits at x-height between
capital-height digits.

**Judgment.** Gusto earns "premium" largely through how carefully it sets numbers. NEVORA lives in shift times, so
setting them well is the cheapest way for it to become recognisable inside the approved look.

**Fix.** A `.nv-time` treatment on every time, range, date and amount:
`font-feature-settings: "tnum" 1, "case" 1, "cv11" 1;` (`case` lifts the dash to capital height in Inter).
Separate ranges with thin spaces (`8:00 – 4:00`). Set AM/PM in `<span class="ampm">` at
`font-size:0.8em; font-weight:500; letter-spacing:0.02em; color:#4A4F54`. Durations use the same spans
(`8<span class="u">h</span> 2<span class="u">m</span>`, unit at 0.85em #6B7075). *After:* a cropped screenshot of any
NEVORA list is identifiable by its times.

### Finding-12: the register is right, and should be protected
`STRENGTH` · `CHARACTERFUL` · TS-009 Register-Stakes Match · TS-002 Unused Tools as Strength

**What I see.** No gradients, no illustrations, no icon tiles in lists (apart from the Schedule one in Finding-04),
one filled button per screen (Find cover, Prepare payroll), sentence-case calm copy ("Approvals open after Sunday"),
and a real wordmark.

**Protect.** That restraint is deliberate and it fits payroll stakes. The upgrades above add contrast and precision,
not decoration. Don't add colour, illustration or motion to make it "feel premium".

### Ceiling check (TS-011)
Convention is right here. The approved ADP/Gusto/Homebase structure should stay. The gap is finish (Coherent) plus one
or two owned details (Characterful), not a new layout.

**Motion and hover:** [motion not evaluable from static capture]. The Chromium 1440 run used `isMobile`/`hasTouch`
(coarse pointer = true), so desktop row hover was not seen either.

---

## 4. Top 10 refinements, ranked by premium impact per effort

All ten are presentation-only (CSS, markup, copy, which links render). None touches server reads, actions, routes or
data. Effort: S = under half a day, M = about a day.

| # | Refinement | Exact change | Evidence | Effort | Presentation-only |
|---|---|---|---|---|---|
| 1 | **Type contrast** | Page title desktop `28px/34px 600, -0.56px`, phone `24px/30px 600, -0.45px`. Card hero and KPI `20px/26px 600, -0.36px` (retire 17px). Row titles `15px/20px 500, -0.13px`. Section labels, column headers, chips `13px/18px 500 #6B7075`. | `D/app_payroll-0.png`, `D/app-0.png`, `P/app_payroll-0.png` | S | Yes |
| 2 | **Colour calm** | `Open shifts 3` in #1A1C1E. Payroll alert: `background:#fff`, title `#B42318 600 15px`, body #4A4F54, action as the 40px secondary button. Remove the Published, Due in 2 days and 2 need setup pills (use 13/500 #6B7075 text). Phone open-shift row: no red border or icon. Desktop: remove the pink icon tile. Sidebar badge `#EDEEEF / #1A1C1E`. | `D/app-0.png`, `D/app_payroll-0.png`, `P/app_schedule-0.png`, `D/app_schedule-0.png`, `D/app_settings_clocker-0.png` | S | Yes |
| 3 | **One title block** | `.page-head{margin-top:48px;min-height:40px;display:flex;align-items:center;gap:16px}`, subtitle `margin-top:4px`, first content `margin-top:24px`. Desktop back link moves into the top bar's left slot. Target: h1 at the same y on all 11 pages (today 104/106/112/128/~132). | `D/app_schedule-0.png` vs `D/app-0.png` vs `D/app_settings_clocker-0.png` | S | Yes |
| 4 | **One button system** | Desktop action buttons 40px, phone 44px. Top-bar utilities 32px. Secondary: `#fff; box-shadow: inset 0 0 0 1px #D5D8DA; color:#1A1C1E; 500 15px/20px; padding:0 16px; radius 8px`. No teal outline buttons. | `D/app_payroll-0.png` (Pay history 32), `D/app_employees-0.png` (Add 32 teal), `D/app_settings_clocker-0.png` (44) | S | Yes |
| 5 | **Shift-time signature** | `.nv-time{font-feature-settings:"tnum" 1,"case" 1,"cv11" 1}`. Thin-space en dash ranges. `.ampm{font-size:.8em;font-weight:500;letter-spacing:.02em;color:#4A4F54}`. Duration units 0.85em #6B7075. Apply to Schedule, Timecards, Things to do, Home, Payroll. | `D/app_schedule-0.png`, `D/app_timecards-0.png`, `P/app_inbox-0.png` | S | Yes (markup spans) |
| 6 | **Card elevation** | Cards `box-shadow: 0 0 0 1px rgb(16 24 32/.07), 0 1px 2px rgb(16 24 32/.05), 0 2px 8px -2px rgb(16 24 32/.05)`. Retire warm greys #E2E2DF→#E3E5E6, #ECECEA→#E3E5E6, #FAFAFA→#F5F6F6, and radius 7px→8px. | `D/app_reports-0.png` (top-bar controls), `D/app_schedule-0.png` | S | Yes |
| 7 | **Rhythm: groups breathe** | Gaps of 12px inside a group and 32px between groups. On Settings, More, Team, Pay history and Things to do, the section label moves above the card (`500 13px/18px #6B7075; margin:0 16px 8px`), which removes the 44px band and its divider. | `P/app_settings-0.png`, `D/app_settings-0.png`, `P/app_more-0.png` | M | Yes |
| 8 | **Home and Payroll composition** | Home: Today card full content width as the hero. Payday and Things to do as a 2-column row with `align-items:stretch`. Payroll: single 720px column; remove the lone right-hand Time exports card (the tab remains). | `D/app-0.png`, `D/app_payroll-0.png` | M | Yes |
| 9 | **Schedule grid calm** | Past days: open shifts collapse to "4 open" (13/500 #6B7075) instead of 4 chips at 2.29:1. Shift chips `#F1F3F4 / #1A1C1E`. Teal only on today's header and actions. | `D/app_schedule-0.png` | M | Yes (same data, different rendering) |
| 10 | **Edit the repeats** | One count voice (label, then figure in #6B7075, no brackets). Insights keeps one period control in the title row and moves Export there. Timecards drops the duplicate date header and the empty progress bar while 0 are approved (use the sentence alone). Insights drops "24.1 h total". The Things to do footer becomes a "More requests" group. Pay history rows go to 2 lines with filename and revision in the View sheet. | `D/app_reports-0.png`, `D/app_timecards-0.png`, `D/app_inbox-0.png`, `P/app_payroll_history-0.png` | M | Yes |

**The climb.** Items 1–4 bring the craft floor to Coherent, which is about a day of CSS. Item 5 is the one move toward
Characterful: it makes NEVORA recognisable by how it sets time. Items 6–10 finish the job.

**What to protect.** One filled teal action per screen, no decoration, calm sentence-case copy, the real wordmark, and
the phone week strip on Schedule (`P/app_schedule-0.png`), the most designed element in the app.

---

## Coverage note
- CR IDs cited: CR-004, CR-101, CR-102, CR-103, CR-201, CR-203, CR-204, CR-302, CR-303, CR-402, CR-403, CR-502.
  TS IDs cited: TS-002, TS-003, TS-006, TS-008, TS-009, TS-010, TS-011. All are from the skill's index tables; the
  entry files themselves are not installed locally, so the rule wording is paraphrased, not quoted.
- Candidate with no entry: "numeric typesetting for time and money" (Finding-11) `[no CR entry — candidate]`.
- PLAN items still visible this round: A5 (pills, amber, red more than once), A7 (title position, button heights),
  A8 (Insights double period control), A11 (Pay history rows), plus the neutral-badge decision (sidebar badge).
- **Not checked:** hover, focus, pressed and motion states; 1024 and 320 widths; loading, error and empty states;
  sheets and popovers; anything after a submit; WebKit desktop or Chromium phone; dark mode is out of scope (light only).

**Masking caveat.** This assesses craft and taste only. It does not show that the pages work (usability,
accessibility, keyboard) or that the flows are right. A cleaner, more premium surface can hide a broken path, so
"premium" here does not mean ready to ship.
