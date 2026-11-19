# Phase 8 fix F2a: the Owner's and Manager's work pages

Builder F2a, Nov 17 to 18, 2026. Worktree `$S/wt/p8f2a`, detached on `e79ccdff` (temporary detached commits only, last one
`46242d69`). Patch `$S/p8fix/f2a.patch` (`git diff e79ccdff HEAD --binary -- . ':!zz-scan' ':!vitest.zz-scan.config.mts'`,
46 files, 537 insertions, 167 deletions, `git apply --check -R` passes). Evidence `f2a-evidence/` (58 full-page
pictures, named `owner-…`, `manager-…` and `sparse-…` by route and width). `S` =
`/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-CLAUDE-CODEX-COLLAB/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad`.
Nothing was pushed, no branch was created or moved, nothing ran in the main checkout. Later captures ran from a second
detached worktree of the same commits (`$S/wt/p8f2ac`, its `node_modules` linked to p8f2a's) so editing never broke a
running capture.

Skills loaded and used: `nevora-ui-readiness`, `anthropic-skills:tastemaker`, `anthropic-skills:better-interface`,
`anthropic-skills:stop-slop`.

Every after picture is the real local app, real sign-in, owned local Postgres, fictional data (roles `owner`, `manager`,
`sparse`). No state was forced. The captures ran after midnight, so the fixtures' "today" is Wed, Nov 18 and some figures
differ from the review's pictures (for example Gabriela's 12:00 AM shift).

## Defects

a.md rows (the Owner's work pages) first, then the b.md rows about a Manager's Home, Things to do, Team and Notifications.

| Row | Status | What changed | After evidence |
|---|---|---|---|
| a.md #1 (rail at 844x390) | not mine | F1's (shell, phone landscape). | |
| a.md #2 (band at 844x390) | not mine | F1's. | |
| a.md #3 (blocker: "alle Loíza") | fixed | The phone layer pulls a person's lines 13px left and gives the room back to each line's first element; the place was a bare text node, so its first letter was clipped. It is now its own element. "Calle Loíza" reads whole at 390 and 320. | `owner-person-390.png`, `owner-person-320.png` |
| a.md #4 (blocker: Payroll rows at 320) | fixed | Under 360px a payroll row's amount moves under its text on the text's edge ("$6,105.71 Net · Approved"), on Payroll, Payroll history and the replaced row (its own indent). The phone overdue notice puts its button under its words at every phone width. Prepare payroll's decorative "Prepare" and "Choose dates" pills step aside under 360px (the row and its caret still open it), so "Other dates / Outside your pay schedule" is one line. | `owner-payroll-320.png`, `owner-payroll-history-320.png`, `owner-payroll-prepare-320.png` |
| a.md #5 (blocker: calm Payday while Payroll is red) | fixed (count needs Codex) | Home now passes the preparation facts it already reads (`payrollStatus`, `readHomePayrollStatus`) to the Direction B screen. When a scheduled payday passed with no payroll, the right column leads with Payroll's own red notice in Payroll's own words: "Nov 2–8 has no payroll", "Scheduled payday was Fri, Nov 13", and Payroll's own button "Prepare Nov 2–8" to the same place (`/app/payroll/prepare#unpaid-…`). The payday tile's button steps back to glass. A schedule that needs review is amber ("Payroll schedule needs review"); a status that can't be read says so ("Payroll status isn’t available right now"); up to date shows nothing. The tile's line now names the period whose timecards it counts ("Pay period Nov 9–15 ended"). Home can't say "2 pay periods" because the Home read carries only the oldest period (For Codex). | `owner-home-1440.png`, `owner-home-390.png`, `owner-home-320.png`, `owner-home-900.png` |
| a.md #6 (blocker: week arrows at 320) | fixed | Owner and Manager Schedule arrows are whole 44x44 boxes under 360px (they were 32x36 with a pseudo-element; F1 reads that as not a defect, and both views now agree). Scan `small` is empty at 320 for both roles. | `owner-schedule-320.png`, `manager-schedule-320.png` |
| a.md #7 (band slots, Updates title) | not mine | F1's (band and title positions). | |
| a.md #8 (first card position) | not mine | F1's. | |
| a.md #9 (Paid time export, Import pay) | partly (band is F1's) | Opened with no payroll chosen, Import pay now says "Choose a payroll to import into" / "Open a payroll from Payroll, then choose Import pay." with the empty tray (not "replaced by a newer revision" and not a lock). A page that is only a state is at most 560px from 768px. Before a step starts the phone band says "‹ Back", not "Cancel". The band height (224 vs 196) is F1's. | `owner-import-pay-1440.png`, `owner-import-pay-390.png`, `owner-paid-time-export-1440.png`, `owner-paid-time-export-320.png` |
| a.md #10 (Time corrections empty) | fixed | The kit's state card: grey tray, "Nothing to fix", the line, and "Go to Timecards" as the quiet way on; left-aligned, at most 560px, on the page's text inset. | `sparse-time-corrections-1440.png`, `-390.png`, `-320.png` |
| a.md #11 (lateness colours, five wordings) | fixed | Team: "Clocked in late" is amber with an amber ring (desktop pill and phone chip), as on Home. Home's On now says "Clocked in" (Team's word), never "Working". Things to do's chip reads "Not clocked in · 45 min", Team's words. | `owner-team-1440.png`, `manager-team-390.png`, `owner-home-1440.png`, `owner-things-to-do-1440.png` |
| a.md #12 (face tints) | fixed | The Schedule grid, Time off requests and Shift requests draw each face in the person's own tint (the `faceTint` BAvatar uses; new `RequestFace` for the request rows). | `owner-schedule-1440.png`, `owner-time-off-requests-1440.png`, `owner-shift-requests-390.png` |
| a.md #13 (row grammar) | fixed | Home: "Gabriela Santos" / "Not clocked in · shift began 12:00 AM" (several: "Not clocked in · 2 people"); missed rows the same way. Things to do: "James Ortiz" / "Fri, Nov 27 · 9:00 AM – 5:00 PM · Calle Loíza" under "Can’t work". | `owner-home-1440.png`, `manager-things-to-do-390.png` |
| a.md #14 (two words for one thing) | fixed | "Shift swaps" card is "Shift requests". Shift requests says "Cover request · … · Picked up by Valeria Díaz", as Things to do does (was "Give to Valeria Díaz"). Scheduling rules: "Weekly hour targets" (the setup card's words) and "Shift requests / Who approves swaps and covers" (was "Trades and coverage"). Phone Payroll's Time exports says "Download hours for payroll", as Timecards does. Things to do says "3 days" for several whole days, as Time off requests does. "Who can work and when" everywhere. | `owner-things-to-do-1440.png`, `owner-shift-requests-390.png`, `manager-scheduling-rules-1440.png`, `owner-payroll-320.png` |
| a.md #15 ("Payday" for schedule dates) | fixed | "Scheduled payday" on Home's tile (Owner and Manager), Payroll's Up next, Prepare payroll's Up next and period rows ("Scheduled payday was Fri, Nov 13" once passed), the phone chip ("Scheduled payday in 9 days") and the phone tile. A past payroll's own payday ("Payday Fri, Nov 6" on run rows and statements) is the run's date, not the schedule's, so it keeps "Payday". | `owner-home-1440.png`, `owner-payroll-1440.png`, `owner-payroll-prepare-1440.png`, `owner-payroll-320.png`, `manager-home-1440.png` |
| a.md #16 (hero tiles' dots) | fixed | "Not clocked in" carries the amber dot when above zero. At 320 the labels have no room for a dot, so all three dots sit beside their figures there (same colours). The live dot keeps its halo (the hero spec). | `owner-home-1440.png`, `owner-home-320.png`, `manager-home-320.png` |
| a.md #17 (bell badge) | not mine | F1's (shell). | |
| a.md #18 (Timecards empty run at 1440) | fixed | On a wide table the columns share the width: name 34%, Recorded and Breaks 16% each, Status 34% (28/16/14/14/28 with Role). | `owner-timecards-1440.png` |
| a.md #19 (Schedule at 900) | fixed (published blocks verified) | Under 820px of card a block has 4px side padding (3px inside a draft's 1px dashed edge, so drafts get the same room) and a 12px time that stays on one line. "Front counter" and "12a–7:30a" read whole. The fixtures had no draft week in my runs, so the draft case is not in a picture. | `owner-schedule-900.png` |
| a.md #20 (menu glyph) | fixed | Desktop Schedule's menu uses Phosphor `DotsThree` bold, as the phone does. | `owner-schedule-1440.png` |
| a.md #21 (bare download icon, no face) | fixed | Each pay statement leads with the person's face and has a labelled "Download" pill beside View, as `DocumentRow` draws it. | `owner-payroll-history-1440.png`, `owner-payroll-history-320.png` |
| a.md #22 (grey tool circles on phones) | fixed | Timecards' and Payroll's phone tool rows lead with the teal-50 circle. | `owner-timecards-390.png`, `owner-payroll-320.png` |
| a.md #23 (restrictions) | partly (note offset is F1's) | The duplicated "Not confirmed" chip is gone on the Owner's and Manager's view (the heading says it). "See the hours they entered" starts on the paragraph's edge. The note's 6px offset is the `.b-note` rule (F1). | `owner-restrictions-1440.png`, `owner-restrictions-320.png` |
| a.md #24 (placeholders in ink on phones) | fixed | Add shift's and Add employee's unchosen selects are grey on phones, as from 768px. | `owner-add-shift-320.png`, `owner-add-employee-320.png` |
| a.md #25 (mid-row chevron) | fixed | Time off and Shift request rows that carry Decline and Approve have no chevron (OW-012); the name and line still open the request. | `owner-time-off-requests-1440.png`, `owner-shift-requests-1440.png` |
| a.md #26 (doubled hairline on phones) | fixed | Measured with a probe: each request's action row drew its own line (`.q-acts::after`, from 72px) 1px above the list's separator (from 18px). The action row's line is gone on phones; the list's one inset divider stays. | `owner-time-off-requests-390.png`, `owner-time-off-requests-320.png`, `owner-shift-requests-390.png` |
| a.md #27 (wraps and orphans) | fixed (one left to F1) | Ranges never split: `BWhen` keeps each time whole, writes the spaced en dash from 768px and never starts a line with "– 12 AM"; Things to do's lines keep ranges, dates and times whole (a word joiner after the dash, since an en dash allows a break before a no-break space). Band facts break only at " · " (Things to do, Timecards "Approval opens Mon, Nov 23"). Schedule's day title breaks after "Today ·". The setup card, Add shift's help ("or Lead.") and Paid time export's state use `text-wrap: pretty`. The restrictions note's "must respect." sits in F1's note. | `owner-home-390.png`, `manager-home-320.png`, `owner-things-to-do-320.png`, `manager-things-to-do-320.png`, `manager-timecards-390.png`, `owner-add-shift-320.png` |
| a.md #28 (dash tiles on phone Payroll) | fixed | People shows once the payroll knows them and Net pay once it holds amounts; no tile is a bare dash. | `owner-payroll-320.png`, `owner-payroll-390.png` |
| a.md #29 (three identical notification titles) | fixed | A manager summary's row is titled by its own count ("10 items were waiting") with what it gathered as its line ("Open shifts, requests or missing availability · Monday"). A fold of several keeps the kind's title and says how many. | `owner-notifications-1440.png`, `owner-notifications-390.png` |
| a.md #30 (Team) | fixed (one row not a defect) | Placeholder "Search people" at every width; the phone filter strip fades its last 40px so the cut reads as more to the right; the band says "N working now" at every width, as the desktop subtitle does. "All 12" with 8 rows and "See all 12" is the designed list limit (TEAM_SHOWN), not a defect. | `owner-team-1440.png`, `owner-team-390.png`, `owner-team-320.png` |
| a.md #31 (dash for scheduled hours) | fixed (lower bound needs Codex) | A null figure (schedule read incomplete) reads "Not available" with "The whole schedule couldn’t be read", never a bare dash. In my runs the read was complete ("0 h", "40 h"); the null case is proven by a unit test. | `owner-person-1440.png`; test in `page.test.tsx` |
| a.md #32 (Insights Attendance) | fixed | The line names the count the read lists ("15 clock-ins couldn’t be compared with the schedule."); cover reads "No one asked for cover this period."; the cover explanation shows only with the cover figure; Hours by day has one explainer (the light-bar sentence is the first item of "How we count"). | `owner-insights-1440.png` |
| a.md #33 (Schedule labels and glyphs) | partly | One location's card no longer repeats "Not published yet" over "Condado isn’t published"; the phone uses an amber eye-slash glyph for a week the team can't see (the warning glyph is for failures). Kept: "Covered this week" beside "Staffing" is Phase 3's approved grid head (OW-006); the grey "Not filled" chip is an open shift that already ended, drawn grey on the desktop grid too (`sb-openchip[data-over]`), so it is not a defect. | `manager-schedule-320.png` |
| a.md #34 (phone first card on Notifications, Updates) | not mine | F1's. | |
| a.md #35 (three labels for one action) | fixed | Each Prepare names its period ("Prepare Nov 2–8", "Prepare Nov 16–22") on Payroll and Prepare payroll; the phone steps card has no second "Prepare payroll" heading. | `owner-payroll-320.png`, `owner-payroll-prepare-1440.png` |
| a.md #36 (past shift end) | fixed | On now shows the amber "Still clocked in since 9:02 AM" (Employee Home's sentence) when a punch runs past the shift's end. | `manager-home-1440.png` |
| a.md #37 (phone row buttons in two places) | fixed | Under 360px Find cover and Fill sit at the row's right edge, as Review, Decline and Approve do. | `owner-home-320.png`, `owner-things-to-do-320.png` |
| a.md #38 (hour formats, polish) | partly | Timecards' period total is whole hours ("138 h"); rows keep "8 h 06". Not changed: Home's and Schedule's coverage line ("197 h 30 min of 336 h") uses the shared `minutesText` with the phone band, and changing one place would make three disagree. | `owner-timecards-1440.png` |
| a.md #39 (Team rail icons, polish) | fixed | Team's desktop tools rail leads each row with its teal circle. | `owner-team-1440.png` |
| a.md #40 (square call buttons, polish) | fixed | 44px circles on phones. | `owner-person-390.png` |
| a.md #41 (Scheduling rules icons, polish) | not done | The rows are a details summary; adding a lead slot needs layout work I could not verify in time. | |
| a.md #42 (step name, polish) | fixed | "Step 1 of 2 · Their details", "Step 2 of 2 · Where they work". | `owner-add-employee-1440.png` |
| a.md #43 (teal timecards icon, polish) | fixed | Amber, as every decision that waits. | `owner-things-to-do-1440.png` |
| a.md #44 (divider insets in Up next, polish) | not done | | |
| a.md #45 ("Off today" chip, polish) | fixed | Grey words (trail on desktop, line on phones, detail on a person's page). | `owner-team-1440.png`, `owner-person-390.png` |
| a.md #46 (Updates lead slot, polish) | not done | Updates is drawn by the shared `employee-updates` / messages component, outside my files. | |
| a.md #47 (punctuation, polish) | partly | "Replaced by a correction" everywhere. Time exports' sub-line periods left. | `owner-payroll-history-320.png` |
| a.md #48 (three "Choose", polish) | fixed | "Choose a location", "Choose a time". | `owner-add-shift-320.png` |
| b.md #11 (Team placeholder) | fixed | As a.md #30. | `manager-team-390.png` |
| b.md #12 (Team filter strip) | fixed (cue) | A 40px fade on the phone strip; the four items still scroll. | `manager-team-390.png` |
| b.md #24 (late arrival green on Team) | fixed | As a.md #11. | `manager-team-1440.png` |
| b.md #25 (22 vs 11 in Notifications) | fixed on the page (scope is Codex's) | The read is not wrong: the summary's count is what it gathered when it was sent, a wider scope (open shifts ahead, availability) than Things to do's count. The row now says it in the past with its scope ("20 items were waiting" / "Open shifts, requests or missing availability"). Aligning the summary's count with needs-you is a server change (For Codex). | `manager-notifications-1440.png`, `manager-notifications-390.png` |
| b.md #26 (ranges split on Manager Home and Things to do) | fixed | As a.md #27. | `manager-home-390.png`, `manager-home-320.png`, `manager-things-to-do-390.png`, `manager-things-to-do-320.png` |
| b.md #34 ("Payday" on Manager's tile) | fixed | "Scheduled payday Fri, Nov 27". | `manager-home-1440.png` |
| b.md #39 (unspaced dash on Home and Things to do) | fixed | `BWhen`'s full form is "11:30 PM – 12:00 AM". | `manager-home-1440.png` |
| b.md #44 (Can't work title) | fixed | As a.md #13. | `manager-things-to-do-1440.png` |
| b.md #46 (filled Find cover on Home) | fixed | The tinted pill, as on Things to do. | `manager-home-1440.png` |

Also covered on my pages (b.md rows outside the four named): #27 (Timecards band date, fixed), #28 ("Not filled", not a
defect, see a.md #33), #30 (Insights, fixed as a.md #32), #31 (restrictions chip, fixed as a.md #23), #45 (Timecards total,
fixed as a.md #38). #29 is F1's.

Found while checking and fixed: Schedule's phone Fill pill was 34px tall at 320 (scan `small: ["Fill"]` after the date
changed); it keeps 36px with a 44px hit area, as on Home and Things to do.

## Sentences changed

The signed-in app renders English, so a signed-in sentence has no Spanish on screen. Where a module is bilingual the
Spanish is given.

| Where | Old | New | Spanish |
|---|---|---|---|
| Home, right column (new; Owner with payroll) | none | "Nov 2–8 has no payroll" / "Scheduled payday was Fri, Nov 13" / "Prepare Nov 2–8" (Payroll's own words and button) | n/a |
| Home, schedule to check (new) | none | "Payroll schedule needs review" / "Pay period Nov 2–8 · Scheduled payday Fri, Nov 13" / "Open payroll" | n/a |
| Home, status unreadable (new) | none | "Payroll" / "Payroll status isn’t available right now" (the corporate Home's words) / "Open payroll" | n/a |
| Home ink tile (Owner) | "PAYDAY"; "Pay period ended" | "SCHEDULED PAYDAY"; "Pay period Nov 9–15 ended" (one period) | n/a |
| Home ink tile (Manager) | "Payday Fri, Nov 27" | "Scheduled payday Fri, Nov 27" | n/a |
| Home row | "1 not clocked in" / "Gabriela Santos" | "Gabriela Santos" / "Not clocked in · shift began 12:00 AM" | n/a |
| Home row | "1 missed clock-in" / names | name / "Missed clock-in · shift ended 11:30 PM" | n/a |
| Home On now chip | "Working" | "Clocked in"; past the shift's end "Still clocked in since 9:02 AM" | n/a |
| Things to do chip | "Started 49 min ago" | "Not clocked in · 49 min" | n/a |
| Things to do card | "Shift swaps" | "Shift requests" | n/a |
| Things to do, can't work | "James Ortiz can’t work Fri, Nov 27" / "9:00 AM – 5:00 PM · Calle Loíza" | "James Ortiz" / "Fri, Nov 27 · 9:00 AM – 5:00 PM · Calle Loíza" | n/a |
| Things to do, several whole days | "… · All day" | "… · 3 days" | n/a |
| Rails and Team tools | "Who can work, and when" | "Who can work and when" | n/a |
| Shift requests, cover | "Give to Valeria Díaz · Tue, Nov 24 · …" | "Cover request · Tue, Nov 24 · … · Picked up by Valeria Díaz" | n/a |
| Scheduling rules | "Weekly hours targets"; "Trades and coverage" / "How swaps and cover are approved" | "Weekly hour targets"; "Shift requests" / "Who approves swaps and covers" | n/a |
| Team search | "Search by name or position" | "Search people" | n/a |
| Team phone band | "12 employees · 1 not clocked in" | "12 employees · 2 working now" | n/a |
| Person page | the grey dash | "Not available" / "The whole schedule couldn’t be read" | n/a |
| Add employee | "Step 1 of 2"; "Choose" | "Step 1 of 2 · Their details", "Step 2 of 2 · Where they work"; "Choose a location" | n/a |
| Add shift | "Choose" (three) | "Choose a location", "Choose a time" | n/a |
| Time corrections empty | (same words, centred, no glyph) | adds "Go to Timecards" | n/a |
| Payroll phone (payroll sentences, see For Jose) | "Payday in 10 days" / "Payday today" / "Payday tomorrow"; tile "Payday" | "Scheduled payday in 10 days" / "… today" / "… tomorrow"; tile "Scheduled payday" | n/a |
| Payroll phone | button "Prepare"; card "Prepare payroll"; step "Prepare payroll"; "Hours by person and pay period" | "Prepare Nov 2–8"; no heading; "Prepare Nov 16–22"; "Download hours for payroll" | n/a |
| Payroll Up next, Prepare payroll | "· Payday Fri, Nov 27"; rows "Payday Fri, Nov 13"; buttons "Prepare payroll" | "· Scheduled payday Fri, Nov 27"; "Scheduled payday was Fri, Nov 13" / "Scheduled payday Fri, Nov 20"; "Prepare Nov 2–8" | n/a |
| Payroll rows | "Replaced by correction" | "Replaced by a correction" (the statements' words) | n/a |
| Payroll history | download glyph | "Download" | n/a |
| Insights | "Some clock-ins couldn’t be compared with the schedule." | "15 clock-ins couldn’t be compared with the schedule." (the read's count; "Some …" stays only when it has none) | n/a |
| Insights | "No cover requests were seen this period." | "No one asked for cover this period." | "Nadie pidió cobertura en este periodo." (was "No se vieron solicitudes de cobertura en este periodo.") |
| Import pay, no payroll chosen (new state) | "This payroll isn’t available" / "It may have been replaced by a newer revision." | "Choose a payroll to import into" / "Open a payroll from Payroll, then choose Import pay." | "Elige una nómina para importar" / "Abre una nómina desde Nómina y elige Importar pagos." |
| Import pay, Paid time export phone band before a step | "Cancel" | "‹ Back" | "‹ Atrás" |
| Notifications, manager summary | "Things to do are waiting for you" / "22 waiting · Yesterday" | "22 items were waiting" / "Open shifts, requests or missing availability · Yesterday" | n/a |
| Restrictions (Owner, Manager) | heading plus chip "Not confirmed" | heading only | chip removed |

## Files touched

Sheets: `owner-b-home.css` (Home, Things to do, and a new Team and person section, since Team uses Home's grid),
`owner-b-schedule.css`, `owner-b-time-pay.css`, `owner-b-requests.css`, `b-restrictions.css`, `b-payroll-import.css`.
Components and pages: `owner-b/home-b.tsx`, `owner-b/inbox-b.tsx`, `owner-b/team-b.tsx`, `owner-home-corp.tsx` (one prop
passed through), `manager-inbox-corp.tsx`, `team-live.tsx`, `employee-directory.tsx`, `company-access/new-employee-form.tsx`,
`manager-weekly-roster.tsx`, `schedule-shift-form.tsx`, `timecards.tsx`, `manager-time-corrections.tsx`,
`payroll/payroll-runs.tsx`, `payroll/portal-statements.tsx`, `payroll-import/{copy.ts,flow-kit.tsx,import-flow.tsx}`,
`reports.tsx`, `review-details/copy.ts` (one sentence, en and es), `notification-inbox.tsx`, `manager-shift-requests.tsx`,
`manager-time-off.tsx`, `time-off-waiting-list.tsx`, `restrictions/restrictions-screen.tsx`, new `request-face.tsx`,
`app/app/employees/[employeeId]/page.tsx`, `app/app/schedule/page.tsx`, `app/app/schedule/settings/page.tsx`.
`b-kit.tsx`: only `BWhen` (one hunk) and its `keepWhole` import; `BWhen` is used only by Home and Things to do.
Tests updated or added: `owner-home-corp.test.tsx` (new: Payroll red leads Home), `manager-inbox-corp.test.tsx`,
`payroll-premium.test.tsx`, `notification-inbox.fold.test.tsx` (new: summary wording), `employees/[employeeId]/page.test.tsx`
(new: not available hours, whole title), `review-details.test.tsx` (its text helper drops the word joiner),
`restrictions-screen.test.tsx`,
`timecards.batch.test.tsx`, `employees/page.test.tsx`, `schedule/settings/page.test.tsx`, `schedule/new/location.test.tsx`.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` through `heavy.sh`: `src` clean; 6 errors, all in
  `zz-scan/states.ts` (the capture tool's).
- `npx eslint` on every changed TypeScript file: clean.
- Targeted tests for every file touched, plus `b-viewport`, `b-foundation`, `b-reduced-motion` and the Phosphor weight test:
  pass.
- `heavy.sh npx vitest run --dir src src/app src/components src/lib --testTimeout=30000` on the final commit `46242d69`: 916
  files passed, 24 skipped; 14084 tests passed, 741 skipped; none failed.
- `git apply --check -R $S/p8fix/f2a.patch` in the worktree: passes.
- Captures (Owner, Manager, sparse; 1440, 900, 390, 320): overflow 0 and no small targets on every captured route after the
  Fill fix. Probes used: my `zz-scan/probe-f2a.js` (computed borders, pseudo-elements, flex, character codes).

## For Codex

- Home's payroll facts (`HomePayrollStatus`) carry only the oldest overdue period. To say what Payroll says ("2 pay periods
  have no payroll. Oldest is Nov 2–8."), Home needs `missingCount` (the backlog's count) beside `overdue`.
- A person's scheduled hours are null when the schedule read is incomplete (`projectPersonHours`, `scheduledComplete`). Sending
  the partial total as a lower bound would let the row say "At least 8 h" (DESIGN "Totals").
- The Manager's notification count is the summary's own item count at send time (`list-presentation.ts`, `MANAGER_SUMMARY`
  items), a wider scope than Things to do's needs-you count. If the summary should match the badge, it needs needs-you's
  scope; the page now says the count's time and scope either way.

## For Jose

- Payroll wording: per DESIGN "Payroll scope wording" I changed schedule-derived "Payday" to "Scheduled payday" on Payroll's
  phone chip ("Scheduled payday in 9 days", "… today", "… tomorrow"), the phone tile, Up next, and Prepare payroll's rows
  ("Scheduled payday was Fri, Nov 13" once passed). A past payroll's own "Payday Fri, Nov 6" is unchanged. Please confirm the
  chip; a shorter "Scheduled payday · Nov 27" tile with "In 9 days" would also work.
- New payroll-adjacent sentences for review: Import pay's "Choose a payroll to import into" / "Open a payroll from Payroll,
  then choose Import pay." (es: "Elige una nómina para importar" / "Abre una nómina desde Nómina y elige Importar pagos.");
  Home's "Open payroll" button on the review and unreadable notices; "Pay period Nov 9–15 ended" on the payday tile.
- Paid time export's "Choose who’s included first / Go through everyone on the team for this period on Time exports, then
  come back." is unchanged (locked). Suggested: "Choose who’s in this export / On Time exports, mark each person for
  Nov 16–22, then come back."
- Schedule's grid head keeps "Covered this week" beside "Staffing 57%" (Phase 3 OW-006). The reviewer suggests "Staffing 57%
  this week"; your call.
- The amber dot for "Not clocked in" moves beside the figure at 320 (all three dots do), because the label has no room for it.

## Needed from another package

- F1: the `.b-note` offset under restrictions (a.md #23), Paid time export's and Import pay's band height (a.md #9), and the
  phone bell (a.md #17) are the shell's and frame's. No change of mine depends on them.
- Shared `.b-row__s` clamps a row's sub-line to two lines on phones (`owner-b.css`); long Time correction lines on Things to
  do end with an ellipsis at 320 (the row opens the correction). If the kit owner agrees, three lines for rows whose line
  holds a range would show it whole.

## Not verified

- A draft week on the Schedule grid at 900 (no fixture had drafts in my runs) and the one-location "Not published" card on
  desktop (the week was published); both are covered by the code path, not by a picture.
- The person page's "Not available" hours on screen (the read was complete in my runs); unit test only.
- Home's "schedule needs review" and "status unreadable" notices on screen (the fixtures had an overdue period); unit test only.
- Phone landscape (844x390) and keyboard order were not re-walked; I changed no focus order, no handler and no motion.
- Owner Notifications failed to load in one capture run (the harness's notifications read is slow, noted by the reviewers);
  the next run loaded and is the evidence.


---
Filing note (Nov 18, 2026): paths under `p8cap/`, `p8fix/`, `wt/` or `f3work/` name working files in the session scratch that were not kept. The pictures kept are in the folders beside this report.
