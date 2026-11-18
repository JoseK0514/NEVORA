# Phase 8 review B: Owner settings and account pages, every Manager page

Reviewer B, Nov 17, 2026. Evidence: `$S/p8cap/owner/` and `$S/p8cap/manager/` (Manager files keep the `owner-` prefix),
with each set's `scan-log.json`. Source read (never run) in `$S/wt/p8b`. Pixel measurements were taken from the PNGs
with a small sharp script (`crops-b/img.cjs`); zoomed crops are in `crops-b/`.
S = `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-CLAUDE-CODEX-COLLAB/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad`.

Skills loaded and applied: `nevora-ui-readiness`, `anthropic-skills:tastemaker` (craft floor CR rules, ladder and
ceiling), `anthropic-skills:better-interface` (severity triggers, one row per root cause), `anthropic-skills:stop-slop`
(every on-screen sentence), `critique-composition` (balance, whitespace, rhythm, gestalt). Standard: DESIGN.MD "Current
direction", every "Inspection fixes (November 15, 2026)" bullet through Phase 7 and the decisions after it, the Direction B
sections it points to, and `.21st/DESIGN.md` (history only since Nov 8).

Ceiling used: Settings and account pages are convention pages, so their ceiling is Coherent. Manager Home and Things to
do are the core loop, so their ceiling is Characterful.

## Verdict per surface

| Route | Widths | Rung reached / ceiling | Verdict |
|---|---|---|---|
| Owner Settings hub `/app/settings` | 1440, 900, 390, 320, 844 | Coherent / Coherent at 1440, 900, 390; below it at 320 and 844 | Fail (320 wraps, 844 rail) |
| Payroll settings | all five | Coherent / Coherent | Fail (stray "US dollars" sub-line; 320 value split) |
| Features and team terms | all five | Coherent / Coherent | Pass (polish only) |
| Company profile (Workspace) | all five | Coherent / Coherent | Pass (polish only: divider overshoot) |
| Clocker tablets | all five | Correct / Coherent | Fail |
| Clocker PINs | all five | Correct / Coherent; broken at 844 | Fail (blocker) |
| Punch photos | all five | Correct / Coherent | Fail |
| Clocker recovery | all five | Coherent / Coherent at 390 and up | Fail (320 clipped placeholder) |
| Billing `/app/billing` | all five | n/a: commerce is off, the route renders the 404 by design (`src/app/app/billing/page.tsx:24`) | See 404 |
| More | all five | Coherent / Coherent at 1440, 390 | Fail (320) |
| Help | all five | Correct / Coherent | Fail |
| My pay | all five | Correct / Coherent | Fail (weak empty state) |
| Profile (Owner) | all five | Coherent / Coherent | Pass |
| Help someone sign in (account recovery) | all five | Coherent at 768 and up; broken on phones | Fail (blocker) |
| Account deletion | all five | Correct / Coherent | Fail (blocker) |
| Not found `/app/nope` | all five | Coherent / Coherent from 768; phones off-frame | Fail at phones |
| Manager Home | 1440, 900, 390, 844 | Characterful / Characterful at 1440; phone wraps | Fail |
| Manager Things to do | 1440, 900, 390, 844 | Coherent / Characterful | Fail (phone wraps) |
| Manager Schedule | 1440, 900, 390, 844 | Coherent / Coherent | Fail |
| Manager Payroll (closed) | 1440, 900, 390, 844 | Coherent / Coherent | Fail (orphan) |
| Manager Settings (closed) | 1440, 900, 390, 844 | Coherent / Coherent | Fail (name split) |
| Manager Timecards | 1440, 900, 390, 844 | Coherent / Coherent at 768 and up | Fail at 390 |
| Manager Team | 1440, 900, 390, 844 | Coherent / Coherent | Fail (late chip colour, clipped placeholder) |
| Manager restrictions | 1440, 900, 390, 844 | Correct / Coherent | Fail |
| Manager Availability | 1440, 900, 390, 844 | Coherent / Coherent | Pass |
| Manager Insights | 1440, 900, 390, 844 | Correct / Coherent | Fail (Attendance card) |
| Manager More | 1440, 900, 390, 844 | Coherent / Coherent | Pass |
| Manager Help | 1440, 900, 390, 844 | Correct / Coherent | Fail (same as Owner Help) |
| Manager Profile | 1440, 900, 390, 844 | Correct / Coherent | Fail (mixed rows) |
| Manager Notifications | 1440, 900, 390, 844 | Correct / Coherent | Fail (22 vs 11) |

What is good, and why. The Settings hub at 1440 holds one strong left edge (cards at 296, row text at 367), 36px teal-50
lead circles with bold glyphs, inset dividers, grey counts, and one amber "1 not set up" chip as the only exception: that
is the row rule exactly. The Manager closed pages (Payroll, Settings) are designed states, not denials: one 560 card, the
48px lock holder, whose page it is, the reader's part, one tinted next step and a quiet second way, matching Phase 3
"Closed pages". Manager Things to do at 1440 follows the row action rule (quiet Decline, tinted Approve and Review), the
"Pay period still open" card carries Jose's decision word for word, and the rail sits on the band edge with the first
card. Clocker recovery at 1440 has the right empty kind (grey circle, tray glyph), a 560 field with Check code on the
block's right edge, and copy that says what checking does not do. The 404 at 1440 is the state card done right. What the
Manager cannot do is never broken or generic on these surfaces; the defects below are craft and copy.

## Defects

Counts: 4 blocker, 31 visible, 11 polish.

| # | Severity | Route and width | What is wrong, exactly (measure it) | Evidence (file, and the region) | Rule it breaks | Likely source file | Fix in one sentence |
|---|---|---|---|---|---|---|---|
| 1 | blocker | Clocker PINs, 844x390 (any content width under about 760, so 768 to 850 tablets too) | The "No PIN 12 / PIN set 0" track wraps under the search with 0px between them, hangs across the band's bottom edge (track 268 to 308, band ends 298), so "PIN set 0" glass sits on the grey canvas; the first card then starts 74px under the band (scan `gapUnderBand: 74`). | `owner/owner-settings-clocker-pins-844.png`, y 220 to 380; crop `bcrop/pins-844-strip.png` | Phase 2 frame (strip on the band, card 24 under a back-link band); "layout break" | `src/app/app/b-foundation.css:391-396` (search `flex: 0 1 520px`, fixed `border-image-outset ... 130px`, track `margin: 0 0 36px 12px`) | Let the search shrink (`flex: 1 1 auto; min-width: 0`) so search and track always share one row, or grow the band when they stack. |
| 2 | blocker | Every page, 844x390 (shell) | The tablet rail shows Home, Schedule, Time, Payroll (Owner) or Home, Things to do, Schedule, Time (Manager), then Help; Team, Things to do and its 11 count (Owner), Insights, Updates, Settings and the lit current entry are below the 390px window. The list scrolls (`overflow-y: auto`) with no cue, so on Settings no rail item is lit. | `owner/owner-settings-844-fold.png` left 80px; `manager/owner-inbox-844-fold.png` left 80px | better-interface trigger "control reachable only past a scroll edge with no cue"; Phase 3 "current sidebar and rail icon is drawn filled" | `src/app/app/corp-shell.css:92`; rail rules in `src/app/app/owner-b-shell.css` | Under 560px of height, drop the rail labels to 40px rows (all ten fit) or add a bottom fade and keep the current entry scrolled into view. |
| 3 | blocker | Help someone sign in, 390 and 320 | The "How this works" card runs edge to edge (white from x 0 to 320 at y 600) while every other card sits 16px in; its text starts at 23px against the cards' 35px. | `owner/owner-account-recovery-390.png` y 505 to 780; `owner/owner-account-recovery-320.png`; crop `bcrop/rec-acct-320.png` | Phone cards 16px in (Direction B phones); "layout break" | `src/components/assisted-recovery.tsx:112` (`section.ar-how.b-card`), `src/components/access-recovery/access-recovery.css` | Give `.ar-how` the same 16px side margin and 18 to 19px inner inset as the cards above it. |
| 4 | blocker | Account deletion, all widths | The destructive action is a disabled grey pill ("Confirm deletion request", #F0F2F3) and "Keep my account" uses the same #F0F2F3 fill on the #F2F5F4 canvas, so the enabled and disabled buttons look alike and neither edge is visible; the "access ends" icon is teal. | `owner/owner-account-delete-1440.png` y 1040 to 1140 and y 560 to 600; `owner-account-delete-320.png` y 1165 to 1265 | B6: "Delete my account is a working red pill from the start", "a red-tinted access ends icon"; better-interface trigger "destructive action with no distinct treatment" | `src/components/account-deletion-form.tsx:184-186` | Make the confirm a working red pill named "Delete my account" that reports what is missing on press, and give Keep my account the white secondary pill. |
| 5 | visible | Punch photos, all widths | A 154px divider stub (x 319 to 472 at 1440; 35 to 183 at 320) hangs under "Take punch photos" and stops in mid-card. | `owner/owner-settings-clocker-photos-1440.png` y 435; crop `bcrop/photos-1440-top.png` | CR-402 one strong edge; "nothing that looks unfinished" | `src/components/clocker-photo/photo-settings.tsx:63-70`, `.c-photos__*` rules in `src/components/clocker-owner-b.css` | Remove the stub, or run the divider the full row width like the rows below. |
| 6 | visible | Punch photos, 768 and up | With photos Off, the four moment switches are drawn #595959 with the knob on the right, so they read as On and are the darkest shapes on the page; their labels stay ink at 768 and up but turn grey on phones. | `owner/owner-settings-clocker-photos-1440.png` x 1034 to 1085, y 515 to 725; compare `-320.png` y 470 to 650 | B5 "Punch photos off: the moment switches are disabled and look it"; B1 disabled pair #F0F2F3 / #8C9397 | `.c-switch:disabled` inside `fieldset[data-off]`, `photo-settings.tsx:69` | Draw disabled switches with the disabled pair (track #F0F2F3, knob edge #8C9397) and grey the labels at every width. |
| 7 | visible | Punch photos, all widths | The filled Save shows on load, before anything changed. | `owner/owner-settings-clocker-photos-1440.png` y 1063 to 1107 | Phase 3 Forms: "Save appears after a change" | `src/components/clocker-photo/photo-settings.tsx:87-90` | Render the footer only when the draft differs from the saved policy. |
| 8 | visible | Clocker PINs, 1440 and 900 | The search (x 296 to 816, 46px tall) and the filter track (from x 816, 44px tall) touch with 0 to 2px between them and end 2px apart at the bottom; the band ends at 298 and the first card starts 26px under it (scan: band 298, gap 26). | `owner/owner-settings-clocker-pins-1440.png` y 220 to 268; crop `bcrop/pins-strip-1440.png` | Phase 2 band ends at 296, card 24 under; F5 one segmented control (44px track) | `src/app/app/b-foundation.css:395-396` (the 12px `margin-left` is not taking effect) | Put 12px between search and track, give both 44px, and end the band at 296. |
| 9 | visible | Clocker tablets, Clocker PINs, restrictions (both roles), all widths | The note under the card starts 6px in from the card edge (x 302 to 303 at 1440 against a 296 card edge and 319 text edge; x 22 to 23 on phones against 16 and 35), so it lines up with nothing. | `owner/owner-settings-clocker-1440.png` y 518 to 534; `owner-settings-clocker-pins-1440.png` y 1158; `manager/owner-employees-person-restrictions-1440.png` y 494 to 526 | Feature screens: "A note that qualifies a card is that card's footer (13.5/18 grey, 12px above, 16px below)"; CR-402 | `src/components/owner-b/owner-b.css:168` (`.b-note { padding: 2px 6px }`), `src/components/clocker-device-manager.tsx:243`, `src/components/clocker-pin-inventory.tsx` | Move each note into its card as the footer, or inset `.b-note` to the card's text edge (22px desktop, 19px phone). |
| 10 | visible | Clocker tablets, 320 | The sub-line breaks inside a segment ("Connected · Not" / "used yet"), and the second row's "Manage" sits 14px right of the first row's "Manage" because the quiet button keeps its pill padding when stacked. | `owner/owner-settings-clocker-320.png` y 215 to 245 and 430 to 455; crop `bcrop/ck-320-rows.png` | Round 4: dotted lines wrap between whole segments; CR-402 one edge | `src/components/clocker-device-manager.tsx` row sub-line and actions; `src/components/clocker-owner-b.css` | Use the `Dotted` wrapper for the sub-line and zero the quiet button's left padding when it stacks under the text. |
| 11 | visible | Clocker recovery 320; Team (both roles) 390 | Placeholders are cut at the field edge: "The code shown on the tablet" ends "table" + half a "t"; "Search by name or position" reads "Search by name or pos". | `owner/owner-clocker-recovery-320.png` y 515 to 550 (crop `bcrop/rec-320-field.png`); `manager/owner-employees-390-fold.png` y 150 to 190 (crop `bcrop/oteam390.png`) | better-interface trigger "truncated content"; "a placeholder that does not match its page" | `src/components/clocker-owner-copy.ts:249` (`lookupPlaceholder`); `src/components/owner-b/team-b.tsx:57` | Drop the recovery placeholder (label and hint already say it) and shorten Team's to "Search people". |
| 12 | visible | Team (both roles), 390 | The filter track clips its third item mid-label ("Not clocked in" with its count cut) and hides "Off today". | `manager/owner-employees-390-fold.png` y 232 to 268 | F5 phone tracks; "awkward wrap" | `src/components/owner-b/team-b.tsx`, segmented rules in `b-foundation.css` | Fit four items with the narrow-phone track sizing F5 already defines, or drop to "All, Clocked in, Not clocked in" plus a filter menu. |
| 13 | visible | Help someone sign in, 320 | The "How you checked" value is truncated to "In perso…". | `owner/owner-account-recovery-320.png` y 270 to 300 | better-interface trigger "truncated content with no way to see it" | `src/components/assisted-recovery.tsx` | Let the value wrap under the title on narrow phones. |
| 14 | visible | Help someone sign in, 768 and up | The hint's last line ends at y 519 and the divider is drawn at y 524, 4px under the descenders, with the button 14px below it. | `owner/owner-account-recovery-1440.png` y 490 to 590; crop `bcrop/acr-hint.png` | CR-001 / CR-002 proximity; Phase 5 rhythm (24 to the button) | `src/components/assisted-recovery.tsx`, `src/components/access-recovery/access-recovery.css` | Remove the divider above the button (the footer needs none) or give the hint 16px below. |
| 15 | visible | Account deletion, 768 and up | "Your account" and "What happens" each hold a second rounded card inside the card (an inner shadow edge at y 297 and y 549). | `owner/owner-account-delete-1440.png` y 290 to 300 and 545 to 555; crop `bcrop/del-1440-a.png` | B6 "no card in a card" | `src/components/account-deletion-form.tsx` (`.q-list` inside the card), delete rules in `owner-b-settings.css` | Strip the inner list's radius and shadow so rows sit on the card. |
| 16 | visible | Account deletion, 768 and up | The password field is 766px (scan `maxField: 766`) and both buttons run the full 812px card width. | `owner/owner-account-delete-1440.png` y 860 to 1140 | Phase 2: "A form's field block stops at 560px ... with its buttons on the block's right edge" | `src/components/account-deletion-form.tsx`; `owner-b-desktop.css:950` | Cap the field at 560 and put the two buttons on the block's right edge. |
| 17 | visible | Account deletion, 390 and 320 | The tab bar shows on the delete form, and the password placeholder repeats its label ("Password"). | `owner/owner-account-delete-390-fold.png` y 785 to 845; `owner-account-delete-320.png` y 925 to 975 | B6 "Delete account hides the tab bar, bell and avatar on a phone"; Phase 5 "Empty placeholders" | `src/components/account-deletion-form.tsx:163`; shell tab-bar gate | Hide the tab bar on this route and remove `placeholder="Password"`. |
| 18 | visible | Settings hub, 320 | Chips and values squeeze titles onto two lines: "Clocker / tablets" beside "1 not set up", "Payroll / settings" beside "Weekly", "Features and / team terms". | `owner/owner-settings-320.png` y 320 to 360, 705 to 760, 980 to 1040 | Direction B narrow phones: "a row's button moves under its text"; Round 4: at 320 a chip moves under the row's text | `src/app/app/owner-b-settings.css` (no 359px rule for `.c-settings` rows) | At 359px and under, move the chip and the value under the title. |
| 19 | visible | More (Owner), 320 | "Insights" and its value sit 10px apart and read as one phrase, "Insights 138 h this week"; the profile line wraps to a line that starts "& Bakery". | `owner/owner-more-320.png` y 250 to 280 and 160 to 195; crop `bcrop/more-320.png` | CR-002 proximity; dotted-line wrap rule | `src/app/app/more/page.tsx`; `owner-b-settings.css:101-109` | Move the value under the title at 359px and under, and keep "Northside Café & Bakery" together with non-breaking spaces. |
| 20 | visible | My pay (Owner), all widths | The empty Statements card is two lines of text with no state circle, and "Only you can see them." describes statements that do not exist; "In 10 days" is a teal chip on a normal state. | `owner/owner-my-pay-1440.png` y 350 to 475 and y 288 to 310 | "States and menus": the empty kind is grey with a tray glyph; B5 empty states use the state card; Phase 3 "a chip marks an exception, plain grey text marks the normal state" | `src/components/payroll/my-pay.tsx` | Use `BState kind="empty"` with the tray glyph and a line that says when statements arrive, and make "In 10 days" grey text. |
| 21 | visible | 404, Billing (commerce off), Manager closed Payroll and Settings, 390 and 320 | These pages use a different phone header (back, bell, avatar with a caret badge) from every other pushed page (back and label only); the card sits at x 14 (others 16) and the title stem at x 21 (others 17). | `owner/owner-nope-320.png` y 0 to 60 (crop `bcrop/nope-320-head.png`) and y 130 to 340; `manager/owner-settings-390.png` | Phase 5 phone band (row 1 wordmark, row 2 back link) for pushed pages; one 16px phone gutter | `b-screen--back` frame in `src/components/owner-b/owner-b.css` / `owner-b-pages.css` | Give `b-screen--back` the pushed-page header and the 16px gutter the other account pages use. |
| 22 | visible | Manager Settings (closed), 1440, 900, 844 | The line breaks inside the Owner's name: "...ask Jose" / "Natal." | `manager/owner-settings-1440.png` y 265 to 300; `-844.png` same | "an orphaned word"; names never split | `src/app/app/settings/closed-line.tsx` | Join the name with a non-breaking space and set `text-wrap: pretty` on state-card lines. |
| 23 | visible | Manager Payroll (closed), 1440, 900, 844 | "them." sits alone on the second line. | `manager/owner-payroll-1440.png` y 265 to 300 | "an orphaned word in a title" (same for lines) | `src/app/app/payroll/payroll-route.tsx:40-42` | Apply `text-wrap: pretty` to `.b-statecard__s`, or tighten the sentence (Copy). |
| 24 | visible | Team (both roles), 1440 and 390 | "Clocked in late · 2 min" is a green chip on Team and an amber chip on Home's On now for the same person at the same time. | `manager/owner-employees-1440.png` x 790 to 952, y 680 to 702 (crop `bcrop/team-late.png`); `manager/owner-home-1440.png` x 838 to 980, y 848 to 868 | Nov 7: "lateness is amber, never red"; status colours, amber waits or checks | `src/components/team-live.tsx:59` | Make "Clocked in late" amber on Team, as on Home. |
| 25 | visible | Manager Notifications, all widths | The only notification reads "Things to do are waiting for you · 22 waiting" while Home, Things to do and the badge say 11. | `manager/owner-notifications-1440.png` y 330 to 372; `-390.png` | Phase 3 "Home, Things to do and the badge show the same number"; B2 "Counts name their scope" | `src/lib/notification-inbox-view.ts` | Use the same count and scope as Things to do, or name the scope ("22 waiting, including reviews"). |
| 26 | visible | Manager Home 390, Manager Things to do 390 | Time ranges and dotted lines break badly: "Next: today, 11:30 PM" / "– 12 AM" starts a line with a dash (Home and two open-shift titles); swap rows split "12:00 PM –" / "8:00 PM" and "9:00 AM – 5:00" / "PM". | `manager/owner-home-390.png` y 340 to 380; `manager/owner-inbox-390.png` (full) open shifts y 270 to 410, Shift swaps y 1320 to 1550 | Round 4 dotted-line rule; Phase 3 `BWhen` short form on phones | `BWhen` in `src/components/owner-b/`, swap rows in the Things to do screen | Keep each time range in one no-wrap span (or the short form "11:30 PM–12 AM") and wrap only between segments. |
| 27 | visible | Manager Timecards, 390 | The band sub-line splits the date: "Approval opens Mon," / "Nov 23". | `manager/owner-timecards-390-fold.png` y 115 to 150 | "awkward wrap" | Timecards band sub-line (`src/app/app/timecards/`) | Put a non-breaking space inside the date and use `text-wrap: balance` on band sub-lines. |
| 28 | visible | Manager Schedule, 390 | Unfilled open shifts carry a grey "Not filled" chip, while the desktop grid marks open shifts amber. | `manager/owner-schedule-390-fold.png` x 290 to 356, y 625 to 710 | Status colours: amber waits; B5 open shifts amber | Phone day list in the Schedule screen | Make "Not filled" amber, as on desktop. |
| 29 | visible | Schedule (both roles), 1440, 900, 844 | The first card overlaps the band by 72px, not 52, so its top (y 224) sits 8px under the week stepper (bottom y 215). | `manager/owner-schedule-1440-fold.png` y 170 to 230 (scan `gapUnderBand: -72`) | Phase 2 "the first card overlaps the band by 52px" | `src/app/app/owner-b-schedule.css` | Overlap 52px, which leaves 28px between stepper and card. |
| 30 | visible | Manager Insights, all widths | The Attendance card is one figure ("Time off 0") and a passive sentence ("No cover requests were seen this period."); the page then offers two "What this measures" pills and a "How we count" disclosure. | `manager/owner-reports-1440.png` y 365 to 565 and 845 to 935 | TS-005 edge cases designed; TS-010 editing; stop-slop (passive) | `src/components/review-details/copy.ts`, Insights screen | Show the attendance figures the read has (late, not clocked in, time off) or a designed empty line, and keep one explanation control per card. |
| 31 | visible | Restrictions (both roles), all widths | The state is said twice: heading "Not confirmed yet" and an amber chip "Not confirmed" on the same line. | `manager/owner-employees-person-restrictions-1440.png` y 265 to 290 | B2 "Say the state once" | `src/components/restrictions/copy.ts` and the state card | Keep the heading and drop the chip (or the reverse). |
| 32 | visible | Help (both roles), all widths | The Contact paragraph runs about 125 characters a line at 1440 (x 319 to 1075, 13.5px); on phones it floats on the canvas outside any card as an 8-line grey block. | `owner/owner-help-1440.png` y 335 to 385; `owner-help-320.png` y 230 to 390 | CR-103 45 to 75 characters; feature screens "a note that qualifies a card is that card's footer" | `src/components/employee-b/account-b.tsx`, `src/lib/legal/policies.ts` | Cap the paragraph at 68ch, put it inside the Contact card on phones, and shorten it (Copy). |
| 33 | visible | Manager Profile, 390 | One card mixes three row layouts: Phone right-aligns value and reason, Email stacks value and reason on the left, Access puts the value right and the reason under the title; locked values carry no lock glyph, while Company profile's do. | `manager/owner-profile-390.png` y 175 to 440 | B5 "One read-only field: a grey value ..., a 16px bold lock and the reason under it" | `src/app/app/owner-b-settings.css:87-93` (`.pmp-email`, `.pmp-access`) | Use one layout for locked rows (value and lock right, reason under it, as on Company profile). |
| 34 | visible | Manager Home, all widths | The timecards tile says "Payday Fri, Nov 27"; Owner Home's tile says "PAYDAY" while My pay says "Scheduled payday". | `manager/owner-home-1440.png` y 460 to 478; `owner/owner-home-1440-fold.png` y 365; `owner/owner-my-pay-1440.png` y 250 | Inspection fixes: "Scheduled payday" in place of "Payday" wherever NEVORA shows a date from the pay schedule | Home ink tile component under `src/components/owner-b/` | Say "Scheduled payday" on both tiles. |
| 35 | visible | Payroll settings, 768 and up; 320 | The only sub-line under the title is "US dollars", which reads as a stray fact; at 320 "First period" splits its value into "Started" / "Mon, Oct 19". | `owner/owner-settings-payroll-1440.png` y 132 to 150; `-320.png` y 270 to 305 | stop-slop specificity; "awkward wrap" | `src/components/payroll/payroll-settings.tsx` | Move the currency into a "Currency" row (or drop it) and keep the date in one no-wrap span. |
| 36 | polish | Company profile and Help someone sign in, 768 and up | Row dividers run 22px past the 560 field (field x 319 to 878, dividers 319 to 900). | `owner/owner-settings-workspace-1440.png` y 335 and 399; `owner-account-recovery-1440.png` y 362, 422, 524 | Phase 2: the field block stops at 560 | `src/app/app/owner-b-desktop.css:950` (`max-width: calc(560px + 2 * 22px)` on row boxes) | Cap the row box at 560 plus the left inset only. |
| 37 | polish | Clocker tablets, PINs, recovery vs the rest of Settings, 1440 | Clocker pages inset rows 4px less than the hub (lead circles at x 315 vs 319); Clocker recovery's cards are 16px apart (others 20); tablet dividers run edge to edge while the hub's are inset. | `owner-settings-clocker-1440.png` x 315; `owner-clocker-recovery-1440.png` y 380 to 396; `owner-settings-1440.png` y 329 | Desktop: 22px card insets, cards 20px apart, one inset divider | `src/components/clocker-owner-b.css` | Use `--b-inset-wide`, a 20px stack gap and inset dividers on the Clocker pages. |
| 38 | polish | Features and team terms, all widths | Each locked feature shows two locks (one after the title, one inside the switch knob). | `owner/owner-settings-features-1440.png` y 650 to 750 | B5 "drawn on, with a lock" (one) | Features page under `src/app/app/settings/features/` | Keep the lock in the switch and drop the one beside the title. |
| 39 | polish | Owner and Manager Home, Things to do, 1440 | One page mixes range spacing: "11:30 PM–12:00 AM" (no spaces) and "9:00 AM – 5:00 PM". | crops `bcrop/mhome-when.png` and `bcrop/mhome-when2.png` | Phase 3 `BWhen`: "3:00 PM – 4:30 PM" from 768px | `BWhen` in `src/components/owner-b/` | Spaced en dash from 768px everywhere. |
| 40 | polish | More and Profile vs PINs, Team, Timecards (both roles) | Jose Natal's face is peach in lists and white with a grey ring in More and the Profile band; Elena Ruiz green vs white. | `owner/owner-more-1440.png` x 319, y 251; `owner-settings-clocker-pins-1440.png` y 785 | Nov 7: "a person keeps one face tint on every screen" | More and Profile avatar (`.q-av`, `owner-b-settings.css:127`) | Use BAvatar's tint for the person's own face too (white stays only on the band). |
| 41 | polish | Settings hub, 900 and 844 vs 1440 | Card order changes with width: Company, Scheduling / Clocker, Pay on desktop; Company, Pay / Clocker, Scheduling on tablets. | `owner-settings-900.png`, `owner-settings-1440.png` | TS-006 single voice (deliberate per TB-015 comment) | `src/app/app/owner-b-settings.css:132-139` | Keep one order, or record TB-015 in DESIGN.MD. |
| 42 | polish | Account deletion, all widths | "Your access ends now." ends with a period while its sibling titles do not; the page has two h1s ("Delete your NEVORA account", "What may be kept"). | `owner-account-delete-1440.png` y 568; scan-log h1 list | Phase 3 Forms "no closing period" (titles); one h1 per page | `src/components/account-deletion-form.tsx` | Drop the period and make "What may be kept" an h2. |
| 43 | polish | Help (both roles), all widths | "Privacy Policy" and "Terms of Use" are title case beside "Account deletion". | `owner-help-1440.png` y 1110 to 1260 | Sentence case labels (Phase 2 words, 2026-10-15) | Help screen copy | "Privacy policy", "Terms of use", unless these are the documents' registered names. |
| 44 | polish | Manager Things to do, 1440 | The Can't work row's title is a sentence ("James Ortiz can't work Fri, Nov 27") while every other row's title is the person. | `manager/owner-inbox-1440.png` y 1275 to 1310 | Phase 3 rows: title is the person, sub-line is what and when | Things to do row presenter (`src/lib/action-center/present.ts`) | Title "James Ortiz", sub-line "Can't work Fri, Nov 27 · 9:00 AM – 5:00 PM · Calle Loíza". |
| 45 | polish | Manager Timecards, 1440 | The period total reads "138 h 16 min" while rows read "8 h 06". | `manager/owner-timecards-1440.png` y 940 to 965 | Nov 7: "period totals are whole hours ('511 h') and rows '24 h 06'" | Timecards totals row | "138 h". |
| 46 | polish | Manager Home, 1440 | "Find cover" is the filled teal pill on Home and the tinted pill on Things to do, and Home also carries the ink tile's white pill. | `manager/owner-home-1440.png` y 390 to 425; `owner-inbox-1440.png` y 305 to 340 | One filled button; Phase 2 row buttons are tinted | Home Things to do card | Tinted "Find cover" on Home too. |

## Copy

Every sentence below should change. The signed-in app renders English; Spanish is given where the module is bilingual
(`clocker-owner-copy.ts`). Other modules: change their `es` entry to match the meaning.

| Where | Now | Rewrite (EN) | Rewrite (ES, Puerto Rico, usted) |
|---|---|---|---|
| Manager Settings closed | You can change scheduling rules. For anything else, ask Jose Natal. | You can change scheduling rules. Ask Jose Natal about the rest. (non-breaking space in the name) | |
| Manager Payroll closed | Your part is timecards. Jose Natal runs payroll after you approve them. | You approve timecards. Jose Natal runs payroll from them. | |
| Notifications (Manager and Owner) | Things to do are waiting for you · 22 waiting | 11 things need you · 2 min ago (same count and scope as Things to do) | |
| My pay, empty | No statements yet. Only you can see them. | No pay statements yet. They show here after payroll is shared, and only you can see them. | |
| Payroll settings sub-line | US dollars | (remove; add a row) Currency: US dollars | |
| Payroll settings history | Jose changed this Nov 17 | Last changed by Jose Natal on Nov 17 | |
| Features, locked swaps | 7 shift requests (swaps, cover and can't work) are still open. Let them finish first. | 7 shift requests are still open (swaps, cover and can't work). Decide them first. | |
| Punch photos sub-line (`photosSub`) | A photo with a clock-in or clock-out on your shared tablets. | Your tablets take a photo when someone clocks in or out. | Sus tabletas toman una foto cuando alguien marca entrada o salida. |
| Punch photos lead (`photosWhat`) | When this is on, the tablet takes one photo at the moments you choose, so you can see who clocked in. | Choose when the tablet takes a photo, so you can see who clocked in. | Elija cuándo la tableta toma una foto, para que vea quién marcó. |
| Clocker recovery placeholder (`lookupPlaceholder`) | The code shown on the tablet | (remove; the label and hint already say it) | (remove) |
| Help someone sign in, button | Make reset link | Create reset link | |
| Insights, Attendance | Some clock-ins couldn't be compared with the schedule. No cover requests were seen this period. | Some clock-ins have no matching shift, so they aren't compared. No one asked for cover this period. | |
| Help, Contact | We aim to respond to support and privacy inquiries within two business days. Business days are Monday through Friday, excluding public holidays observed in Puerto Rico. Requests that need investigation may take longer to resolve. Never email passwords, codes, bank details or pay documents. | We answer within two business days (Monday to Friday, except Puerto Rico holidays). Never email passwords, codes, bank details or pay documents. (If this is policy text from `policies.ts`, keep the full version in the policy and link to it.) | |
| Restrictions | Not confirmed yet + chip "Not confirmed" | Not confirmed yet (no chip) | |
| More, Insights value | 138 h this week | 138 h worked | |
| Home tiles (Owner, Manager) | PAYDAY / Payday Fri, Nov 27 | Scheduled payday · Fri, Nov 27 | |
| Account deletion | Confirm deletion request | Delete my account | |
| Account deletion | Your access ends now. | Your access ends now | |
| Things to do, Can't work row | James Ortiz can't work Fri, Nov 27 | James Ortiz / Can't work Fri, Nov 27 · 9:00 AM – 5:00 PM · Calle Loíza | |
| Help rows | Privacy Policy, Terms of Use | Privacy policy, Terms of use | |

Sentences checked and fine as they are: the Clocker tablets sub-line and note, the PINs note, Clocker recovery's "Check a
code" line and hint, the closed-page titles, "Pay period still open" with "You can approve these from Mon, Nov 23.", the
404 lines, the Company profile lock reasons.

## Consistency across surfaces

- Late arrival is amber on Home and green on Team for the same person and moment (defect 24).
- The scheduled-payday date is "Scheduled payday" on My pay, "PAYDAY" on Owner Home and "Payday" on Manager Home (34).
- The things-to-do count is 11 on Home, Things to do and the badge, and 22 in the Manager's notification (25).
- Notes under cards sit 6px in on the Clocker and restrictions pages; Employee pay insets the same `.b-note` to 22px (9).
- Clocker pages use an 18 to 19px card inset and 16px card gaps; the rest of Settings uses 22 to 23px and 20px (37).
- Phone headers: account pages show back and label; the 404, Billing-off and Manager closed pages add bell and avatar and
  sit 2px off the gutter (21).
- Punch photos greys its moment labels on phones but not at 768 and up (6).
- Face tints for the signed-in person differ between lists and More or Profile (40).
- Settings hub card order differs between tablets and desktop (41).
- Team's band sub-line is "12 employees · 4 working now" on desktop and "12 employees · 1 not clocked in" on phones.
- Insights puts the date line under the tabs on phones and under the title on desktop.
- Phone tab "To do" and sidebar "Things to do" name one place two ways (shortened for the tab; consider "To do" only if
  Jose agrees).
- Owner and Manager versions of shared routes (Home, Things to do, Schedule, Timecards, Team, restrictions, Availability,
  Insights, More, Help, Profile, Notifications) match in frame: band height, title top, first-card position and column
  width are identical in both scan logs. The differences a Manager sees (no Payroll, closed Settings, Profile without
  Edit, Help without payroll and time-clock items, Things to do first in the sidebar per MG-006/007) are designed.

## Not reviewed

- The Billing recovery page: commerce is off in the harness, so `/app/billing` returns the 404 by design
  (`src/app/app/billing/page.tsx:17-24`). Only the 404 was seen.
- The Phase 6 QR setup card, the issued setup code, the PIN set form and its "PIN set for ..." result, and any Clocker
  tablet chip other than "Not set up": not in the captures.
- Keyboard order, focus rings, hover, press, reduced motion, sheets and dialogs: the evidence is static full-page and fold
  PNGs, so none of this was exercised.
- Loading, error and offline states of these routes: not captured.
- Spanish rendering: the signed-in app renders English; Spanish strings were read in `clocker-owner-copy.ts` only.
- Manager pages at 320: not in the capture set (widths 1440, 900, 390, 844).
- The bell's coral dot is missing on My pay, Billing and 404 captures and present on Settings, More and Profile. The
  Owner and Manager notifications reads take 5 to 6 s in the harness (F5, NV-012), so this may be capture timing; not
  judged.
- Data gaps from failed seed steps (schedules, corrections, some swaps) were not reported; Insights' "+61 h 49 min over
  plan" and the 13.5-hour open shift come from them.
- Full-page phone captures draw the fixed tab bar mid-page; that is a capture artifact and was not reported.

This assesses craft, taste and copy from captures. It does not prove the pages work for keyboard or screen-reader users,
and a page marked Pass here is not a release approval.


---
Filing note (Nov 18, 2026): paths under `p8cap/`, `p8fix/`, `wt/` or `f3work/` name working files in the session scratch that were not kept. The pictures kept are in the folders beside this report.
