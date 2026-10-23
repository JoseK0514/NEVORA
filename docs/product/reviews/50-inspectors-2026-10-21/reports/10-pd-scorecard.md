# 10 Product Designer: trend-and-trust scorecard, every Owner and Manager page

**Verdict.** The v3 rebuild clears the bar: 12 of 16 overall, with no 0 on Trust, Accessibility or Usability, so it's a **Go with required changes**. The page structure, one job per page and the count dictionary all hold up. Points drop in three places. Trust: a few figures on the same screen disagree, and one Owner page shows load errors. Brand: system font, iOS blue and orange icons, and no Spanish make NEVORA look like a generic iOS Settings clone. Cost: the v3 look is layered on top of 22 global stylesheets with 838 override selectors, so it will be expensive to maintain.

Evidence: screenshots in `review50/shots/` (QAOWNER-*, AUDIT-M-*, 390 and 1440) against `docs/product/specs/clean-manager/mockups/png/`. Routes come from `scratchpad/tools/shotset.mjs`. Lines: **U** Usability, **F** Familiarity, **T** Trust, **A** Accessibility, **B** Brand, **D** Durability, **C** Cost, **Co** Continuity. Go needs 12 or more and no 0 on T, A or U. The rubric is the one in `docs/product/direction.md` §2.1. The Next.js dev "N" badge (bottom left) and the tab bar floating mid-page in full-page captures come from the capture setup, so I ignored them.

## Overall product score

| U | F | T | A | B | D | C | Co | Total | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 2 | 2 | 1 | 2 | 1 | 2 | 0 | 2 | **12** | Go, with the changes below |

- **U 2:** each page answers one question; Home went from 8 sections to 3 (QAOWNER-home-390).
- **F 2:** iOS inset lists, segmented controls, split-view Inbox; the tab bar is unchanged.
- **T 1:** Home's timeline contradicts Working now. Timecards' headline total includes two open punches. Profile shows "Couldn't load" in four places.
- **A 2:** the QA rounds covered contrast, targets and large text. One clipped control remains (Availability 390).
- **B 1:** teal survives. The system font replaced Inter, More uses iOS blue `#007AFF` and orange `#FF9500` (`src/app/app/premium-clean-manager.css:249-250`), Settings uses filled teal squares as decoration, and there's no Spanish (`src/app/layout.tsx:25` is `lang="en"`, and the app has no locale layer).
- **D 2:** quiet, flat, system-native screens will still look right in three years.
- **C 0:** `src/app/app/layout.tsx:1-20` imports 18 global stylesheets (6,979 lines in `src/app/app/*.css` alone). It repeats the chain `html body .app-shell.nevora-portal.nevora-portal[data-nv-clean][data-nv-clean]:not(.cm-a):not(.cm-b):not(.cm-c):not(.cm-d)` 838 times. Each fix has to out-specify the last one.
- **Co 2:** the tab bar, key action names and old URLs all stay. The moved Home tools still have a sidebar group.

With recommendations 1 to 6 done, I'd expect T 2, B 2 and C 1, for **15/16**.

## Page scores

### Owner (QAOWNER)

| Page | U | F | T | A | B | D | C | Co | Total | Verdict | One line per weak score |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Home | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 13 | Go, fix T | Jordan shows as "in at 12:28 AM" in Working now and as a grey "Later today" bar in Shifts today. Casey is both "on break" and "Later today 9 AM–5 PM". The desktop left column ends at y447, leaving a 330px hole beside Later today (QAOWNER-home-1440). |
| Inbox | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 13 | Go, fix T | "Plan ahead 7" counts rows, but the rows add up to 12+13+2+8+5+6. The count dictionary doesn't say which. Close to the mockup otherwise. |
| Schedule | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 13 | Go, fix T | Today is a red circle on desktop ("Wed 21") and teal on the phone. Red is reserved for lateness and open shifts. The band says "West Office not planned", yet the grid shows West Office open shifts on all 7 days. Five of six people carry amber "over limit" text. |
| Timecards | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 13 | Go, fix T | "Recorded 50h 25m" is mostly two unclosed punches (25h 42m with 22h 52m of breaks). The Role column is "—" on all 13 rows. |
| Insights | 1 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 12 | Revise | The page defaults to last week and shows an empty 0–2h chart instead of an empty state. Timecards defaults to this week. Two pages, two default periods. |
| Team | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | 14 | Go | The boxed "Find people" form (48px fields, labels, a card) is heavier than a search bar plus chips. Sorting is case-sensitive, so lowercase names fall to the end. |
| Person | 1 | 1 | 1 | 2 | 1 | 2 | 1 | 2 | 11 | **Revise** | It opens straight into a live edit form, with Status (deactivate) as an inline select. It shows nothing about the person's week: hours, next shift, timecard. On desktop the back link sits top right. |
| Updates | 1 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 14 | Go | "Acknowledgement required" doesn't say how many people have acknowledged it, and that's the manager's question. |
| Notifications | 1 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 14 | Go | The placeholder reads "Search this inbox" (`src/components/notification-inbox.tsx:76,133`), which blurs it with Inbox. It also shows a search field on an empty list. |
| Time off | 1 | 2 | 2 | 2 | 1 | 1 | 2 | 2 | 13 | Go | Desktop uses the phone layout: Approve and Decline are about 530px wide each, with no coverage context. The phone review page (below) does this well. |
| Time-off review | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 15 | Go | The best page in the set. "Before you decide" puts context ahead of the decision. |
| Shift requests | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 15 | Go | Clean empty state that says where items will appear. |
| Availability | 1 | 2 | 1 | 1 | 1 | 2 | 2 | 2 | 12 | Revise | Amber "Not submitted" on all 8 rows breaks the calm-by-default rule. There's no "Remind" action. The segmented control clips "Submitted 0" at 390. |
| Profile | 1 | 2 | **0** | 2 | 1 | 2 | 2 | 2 | 12 | **Blocked** until checked | Email, Phone, Locations and alert choices all say "Couldn't load", with two "Try again" controls (QAOWNER-profile-390). It may be preview data, but a load failure on the Owner's own profile is a trust 0 until it's shown not to reproduce. |
| Settings hub | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 15 | Go | Filled teal icon squares on every row use teal as decoration (direction P1). Group subtitles plus two-line row text break "less text". |
| Payroll settings | 1 | 1 | 2 | 2 | 2 | 2 | 1 | 2 | 13 | Go | The page is one 3,355px form with three separate Save buttons. The section tabs put "Timecards" inside Payroll, a second home for the same page. The wording stays as approved, which is correct. |
| Scheduling rules | 1 | 1 | 2 | 2 | 1 | 2 | 1 | 2 | 12 | Revise | It repeats 13 identical Target/Maximum rows. The sticky save bar lies over the rows (QAOWNER-rules-1440, y590). A table with bulk-set would be faster. |
| Locations | 1 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 14 | Go | A search box, Search button and four filter tabs for 2 locations. The title sits at y196; other pages put it at y100. |

### Manager (AUDIT-M)

| Page | U | F | T | A | B | D | C | Co | Total | Verdict | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Home | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 13 | Go, fix T | Same timeline and Working-now contradiction as the Owner. The Open shifts icon is amber on the phone and red on desktop (AUDIT-M-home-390 and -1440). |
| Inbox | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 13 | Go | Same as the Owner. |
| Schedule | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 13 | Go | Same as the Owner. |
| Timecards | 2 | 2 | 1 | 2 | 1 | 2 | 1 | 2 | 13 | Go | Same as the Owner. |

## Recommendations (most score gained first)

1. **Make every figure on Home agree with every other.** Draw the Shifts today bar from the same clock state as Working now: teal if clocked in, on break shown inside the bar. Remove people who are working now from Later today, or label their second shift. *Why:* Jordan and Casey appear in conflicting states on QAOWNER-home-1440 and AUDIT-M-home-1440. "One number per idea" is clean-contract rule 2, and Home is the page everyone opens. *Impact* High (T 1→2 on 2 pages). *Effort* M. *Owner* UI, plus a Backend check that both reads use the same source.

2. **Fix or explain the Owner Profile load failure.** Find out whether "Couldn't load" in four places reproduces with real data. If it does, it blocks release. *Why:* QAOWNER-profile-390. It's the only Trust 0 in the set. *Impact* High. *Effort* S to diagnose. *Owner* Backend first, then UI for the partial-failure layout.

3. **Keep open punches out of headline totals.** Timecards' "Recorded" and Insights should exclude, or mark separately, time still running from a missing clock-out (for example "50h 25m, 2 still open"). *Why:* 48h of the 50h 25m on QAOWNER-timecards-1440 comes from two missing clock-outs. People pay from this number. *Impact* High (Trust, pay). *Effort* M. *Owner* Product decides the rule, then Backend and UI.

4. **Pay down the CSS before the next wave.** Fold `premium-wave-a/b/c`, `premium-desktop`, `portal-premium` and `premium-clean-manager` into the kit tokens and component CSS modules, and delete the 838-time `:not(.cm-a)…` chain. Set a budget: zero new global override files. *Why:* `src/app/app/layout.tsx:1-20` (18 global sheets), 6,979 lines. The Cost line sits at 0 and every later visual fix costs more. *Impact* High (C 0→1, and faster fixes). *Effort* L. *Owner* UI.

5. **Put Spanish on the v3 roadmap.** Build a locale layer and `lang` per user for the Owner and Manager app, starting with the shell, Home and Inbox. *Why:* direction.md A1 scored this 15/16 and named Spanish-first NEVORA's weakest trait. v3 shipped with `lang="en"` hard-coded (`src/app/layout.tsx:25`). Gusto, Rippling and Sling are English only, so this is the clearest edge over them. *Impact* High (B 1→2). *Effort* L. *Owner* Product to approve the scope, then UI and Backend.

6. **Put brand colour back in teal and the status ladder.** In More, replace iOS blue `#007AFF` and orange `#FF9500` with teal or the system grey (`premium-clean-manager.css:249-250`). On Settings, switch the decorative filled teal squares to grey squares with white glyphs and keep teal for the chevron and link. Make today's date teal on desktop Schedule, as it already is on the phone. *Why:* "Teal means you can act" (direction P1). Orange already means "needs review" on the ladder. Red today on desktop contradicts the red rule in spec §Colour. *Impact* Medium (B, T). *Effort* S. *Owner* UI.

7. **Give the person page a read-first summary.** Open on facts: role, location, this week's hours, next shift, timecard status, with "Edit" in the navigation bar. Move Deactivate to a separate destructive row with a confirm step. *Why:* QAOWNER-person-390 and -1440 open as a live form with an inline Status select. iOS Contacts and Gusto's employee page both open read-only first. It scored 11, the lowest on the list. *Impact* Medium. *Effort* M. *Owner* UI.

8. **Calm the "everyone" amber states and add the next action.** Availability: when nobody has submitted, show one summary row ("0 of 8 submitted · Remind all") and keep the row labels grey. Schedule: show "over limit" in amber only above the maximum, with one summary in the band. *Why:* 8 of 8 amber rows (QAOWNER-availability-1440) and 5 of 6 amber rows (QAOWNER-schedule-1440) break clean-contract rule 3. Fix the clipped segmented control at 390 at the same time. *Impact* Medium. *Effort* S to M. *Owner* UI (Remind needs Backend).

9. **Pick one rule per number and one default period.** Have "Plan ahead N" count items or say "7 topics". Have Insights default to the same period as Timecards, or show an empty state ("No time recorded Oct 12–18") instead of a flat 0–2h chart. Notifications: change "Search this inbox" to "Search notifications" and hide search when the list is empty. *Why:* QAOWNER-inbox-1440, QAOWNER-insights-1440, `notification-inbox.tsx:76,133`. These are count-dictionary gaps. *Impact* Medium. *Effort* S. *Owner* UI, with Product approving the Plan-ahead rule.

10. **Fit the long Owner forms and desktop request lists to the task.** Scheduling rules: show weekly hours as a table with "Set for selected", and keep the save bar off the rows. Payroll settings: add an "On this page" index like Scheduling rules has, plus one dirty-state save bar instead of three buttons. Move Timecards out of Payroll's section tabs (the sidebar already owns it), and keep the old tab URL as a redirect. Desktop Time off: use a list-plus-detail split like Inbox, with compact buttons and "who else is off". *Why:* QAOWNER-rules-1440 (2,740px), QAOWNER-payroll-1440 (3,355px), QAOWNER-timeoff-1440 (530px buttons). Rule 5 is "one home per tool". The payroll wording stays exactly as approved. *Impact* Medium. *Effort* M. *Owner* UI, with Jose approving the payroll layout.

**Continuity note for 7, 9 and 10:** every move keeps its old URL working. Payroll › Timecards redirects to `/app/timecards`. Person edit keeps its route under `?edit=1`. No tab-bar or sidebar names change.

## What's good

- The approved structure landed: Home is three short sections with one "Needs you" number, and the Inbox count matches across the badge, title and filters (QAOWNER-inbox-1440: All 4 = Act now 3 + Requests 1).
- The phone time-off review ("Before you decide", then Decline and Approve, QAOWNER-review-390) and the Shift requests empty state show how calm and verified NEVORA should feel.
- Honesty markers hold: "Updated 1:11 AM", "Puerto Rico time", "Some attendance comparisons are unavailable", and payroll copy kept word for word.

## Not checked / limits

- No browser use (brief). Everything comes from static screenshots and code reads. I didn't check focus, screen readers, reduced motion or sheets.
- Several Owner and Manager pages had no screenshot, so I didn't score them: More (phone), the Inbox item sheet, Payroll runs, Time exports, Templates, Attendance, Team overview, Schedule activity, both recovery pages, Branding and Clocker devices. I didn't open Manager Insights, Team, Updates or the request pages; I assume they match the Owner versions.
- The data is fictional and captured at about 1:10 AM, so the Home timeline had no "now" line. Some contradictions (Profile load errors, open punches) may come from the preview data. Recommendations 1 to 3 ask for that to be checked.
- Employee and Lead pages are out of scope for v3, so I didn't score them.
