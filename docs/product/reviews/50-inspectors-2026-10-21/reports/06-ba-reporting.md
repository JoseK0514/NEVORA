# 06 Business Analyst (data and reporting): Insights, Timecards and Payroll exports as decision tools

## Verdict
The numbers NEVORA shows are careful and honest. It never shows a fake zero, it explains its definitions, and it says plainly that these hours "aren't payroll hours". But they answer only one owner question: how many hours were recorded. Labor cost, overtime risk and attendance trends never reach the page. Schedule vs actual is computed but hidden in a closed disclosure. Each page uses a different default period and a different meaning of "to review", and the payroll file sends hours that include breaks under a single earnings code.

## Recommendations

1. **Lead Insights with schedule vs actual, and add a "This week so far" period.**
   - *Why:* Owners ask most often "are we over or under plan?". The page computes that answer (`scheduleVsActual`, `src/lib/reports/project.ts:105-111`) but puts it inside the closed "Period details" disclosure (`src/components/reports.tsx:200-203`).
   - The ready-made headline answers in `src/lib/reports/insights.ts` (`periodInsights`: scheduled vs recorded ±, clock-in notes, coverage filled) are imported nowhere. They are dead code, so the spec's "At a glance comes first" rule isn't met.
   - Insights has no current-week view: "Week" means last week (`reports.tsx:62-63`, `src/app/app/reports/page.tsx:15-17`). In `QAOWNER-insights-1440.png` the owner sees **0h** while Timecards shows **50h 25m** for this week.
   - *Do:* make "Recorded vs scheduled (±h)" a top figure. Add a "This week so far" preset that compares against hours scheduled up to now.
   - *Impact:* High · *Effort:* M · *Owner:* UI

2. **Show overtime risk instead of the hard-coded "unavailable".**
   - *Why:* `project.ts` always returns `overtime:{state:'unavailable'}`, and the reports CSV writes `overtime … unavailable` (`src/lib/reports/csv.ts:22`).
   - Yet the product already has a configurable overtime rule (`OvertimeRiskRule` with threshold, day/week window and basis in `src/lib/business-improvements/company-policies/model.ts:36-44`). The runtime already evaluates it per employee (`attendance-policy/runtime.ts:333-395`), and scheduling has `projectedOvertime` (`src/lib/scheduling/operational-rules.ts:143-156`).
   - *Do:* when the rule is configured, show per person "hours this week vs threshold", plus "projected from the remaining schedule". Phrase it as risk, not as a pay decision.
   - *Impact:* High · *Effort:* M · *Owner:* Backend (read) + UI

3. **Fix what the payroll file sends as "Pay Hours".**
   - *Why:* every export uses `timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS'` (`src/lib/payroll-export/model.ts:4,19`). The ADP RUN profile maps `Pay Hours` to `recordedHours`, with one constant Earnings Code and an empty `Worked In Dept` (`model.ts:31-34`).
   - As a result, unpaid meal periods are exported as paid. All hours go out as one earnings line, with no regular/overtime split and no split by location or department.
   - A `CompensationRule.breakTreatment: EXCLUDE_SELECTED_BREAK_TYPES` already exists in company policies (`company-policies/model.ts:47-55`), but the export ignores it.
   - *Do:* add a "paid hours" basis that respects the break rule, and allow regular/OT earnings lines by location. This needs Jose's decision on the legal wording, which must stay exact.
   - *Impact:* High (it can overpay, and Puerto Rico has daily and weekly overtime) · *Effort:* L · *Owner:* Backend + Product

4. **Stop open punches from inflating the totals.**
   - *Why:* an entry or break with no end is counted up to "now" (`src/lib/timecards/project.ts:103,109`).
   - In `QAOWNER-timecards-1440.png`, Casey Rivera shows **25h 42m recorded with 22h 52m of breaks** and Jordan Rivera **24h 42m**. Both are "Missing clock-out". Together they make up the whole **50h 25m** "Recorded" figure, and the same accrual feeds the Insights chart and its totals.
   - *Do:* leave still-open time out of the totals and the chart, and show it separately: "+ 2 open punches (not counted)". Or at least mark the figure as including open time.
   - *Impact:* High · *Effort:* S–M · *Owner:* UI (Backend if the read changes)

5. **Use one default period for time, insights and exports, tied to the pay calendar.**
   - *Why:* each page starts on a different period:

     | Page | Default period | Source |
     |---|---|---|
     | Timecards (manager) | Current Monday to Sunday | `src/app/app/timecards/page.tsx:19-21` |
     | Insights | Last Monday to Sunday ("Week") | `reports/page.tsx:15` |
     | Insights "Month" | Rolling 30 days, including today | `reports.tsx:64` |
     | Time exports | Rolling 7 days ending today (Oct 15–21, Thursday to Wednesday) | `src/app/app/payroll-export/page.tsx:15` |

   - The pay schedule in `QAOWNER-payroll-1440.png` is weekly, anchored on Monday 09/21, so the Time exports default matches no pay week.
   - *Do:* start Time exports, and an Insights "Pay period" preset, from the pay calendar (`src/lib/payroll/calendar.ts`). Make "Month" a calendar month.
   - *Impact:* High · *Effort:* S · *Owner:* UI

6. **Add the timecard and report numbers to the count dictionary, and make them agree.**
   - *Why:* the spec's dictionary (`docs/product/specs/clean-manager/spec.md:131-141`) defines only Inbox and Schedule counts. On Timecards, "Need review" counts every card that isn't finalized, including approved ones (`src/components/timecards.tsx` `needsReview`). With every card approved, the page would read "Need review 13 · Approved 13 of 13".
   - Insights "Timecards to finish" counts all cards that aren't finalized, including empty ones (`reports.tsx:164`). For the same week that gives a different number than Timecards' "Need review" (`QAOWNER-insights-1440.png` shows 13; Timecards' own rule would count only the cards with time).
   - *Do:* define Recorded time, Need review, Ready to finalize, Finalized and People with time once. Rename one of the two overlapping counts.
   - *Impact:* Medium · *Effort:* S · *Owner:* Product + UI

7. **Ship an owner-readable CSV next to the audit CSV.**
   - *Why:* the Insights CSV is a 20-column long format with values in **nanoseconds** (`csv.ts:11`, `recorded_nanoseconds`). The neutral payroll profile also exports "Recorded nanoseconds" at 9 decimals (`payroll-export/model.ts:61`). Nobody can pivot that in Excel.
   - Separately, `REJECT_INEXACT` at 2 decimals rejects almost any real total that isn't a multiple of 36 seconds (`decimalHours`, `model.ts:39-44`). That pushes users into a failure state unless they find the HALF_UP option.
   - *Do:* make the default export one row per person, with scheduled hours, recorded hours, difference, break hours, a split by location, and time off days. Keep the current files as "Audit CSV".
   - *Impact:* Medium · *Effort:* S · *Owner:* UI (format) + Backend (route)

8. **Decide on labor cost: actual cost first, then an estimate, then labor %.**
   - *Why:* owners' top question is labor cost against sales. Rates and budgets exist as a type (`src/lib/business-improvements/labor-budget/model.ts:3-20`), but `laborBudgetReadiness` always returns `not_configured`, with `estimatedCost:null` (`:200-226`). Rates aren't editable in the policy editor, and the repo has no sales or revenue field at all.
   - Payroll runs already import gross pay per employee (`src/lib/payroll/contracts.ts:117-140`).
   - *Do, step by step:*
     - (a) Show "Payroll gross (imported)" for the matching period in Insights. It is real data with no new calculation.
     - (b) Add owner-entered hourly rates, labelled "Estimated labor cost, not payroll".
     - (c) Add daily sales entry or a POS import to get labor % of sales.
   - *Impact:* High · *Effort:* L · *Owner:* Product (scope and wording) + Backend

9. **Keep the last report visible when the window loses focus.**
   - *Why:* any window blur, tab switch or `pagehide` empties the report and shows "Insights paused" (`reports.tsx:268-275`). An owner can't keep Insights open next to a spreadsheet or the POS report.
   - The report also expires within ≤15s and quietly re-runs the full report query (timecards, plan, raw punches and attendance) about every 5 seconds while it is open (`reports.tsx:246`, `src/lib/reports/service.ts:96-101`). That is costly for 31-day periods.
   - *Do:* keep the last verified snapshot on screen with an "As of 10:15 AM · Refresh" stamp and dimmed actions, unless access is actually lost.
   - *Impact:* Medium · *Effort:* M · *Owner:* Backend (the freshness contract) + UI

10. **Add attendance trends and comparison periods.**
    - *Why:* "Clock-in notes" is a flat list of messages inside a disclosure (`reports.tsx:205`). It has no counts per person or per kind (late in, missing clock-out, short break) and no trend.
    - The longest period is 31 days (`PERIOD_ERROR`, `reports.tsx:31`; the payroll period limit is also ≤30 days apart, `src/lib/payroll/model.ts` `period`), and nothing compares against the previous period.
    - *Do:* add a people × kind count table, a 4–13 week trend of recorded vs scheduled and of attendance counts, and "vs previous period" deltas on the top figures.
    - *Impact:* Medium · *Effort:* M–L · *Owner:* Backend + UI

## What's good
- Honest numbers. An incomplete plan shows a dash and the reason, never a zero. Definitions live in one disclosure. "Hours include breaks… these aren't payroll hours" is said wherever hours appear. Hours by location and by position already exist.
- Exports are trustworthy as audit records. Only current finalized cards can export (`payroll-export/model.ts:17`), and each row carries its revision and source fingerprint. The ADP RUN profile is validated against the documented columns, and CSV cells are protected against formula injection (`csv.ts:3-6`).
- Pages hand off well. Timecards' Export carries its period into Time exports, and Insights rows and figures link to Timecards for the same period.

## Not checked / limits
- No browser (by brief). Findings come from code and the provided screenshots only. The fictional data has 0h last week, so I couldn't see the Insights chart or the schedule-vs-actual table with real values.
- **To verify (Backend):** in `src/lib/reports/service.ts` the `latest` CTE picks the newest publication revision per `week_start` without a workspace filter. Plan completeness is also judged per week, not per location: one location publishing marks the week "complete", even when the Schedule band says "1 of 2 locations published". If so, the unpublished location's people would show inflated "over plan" differences.
- I didn't open the Payroll runs or Time exports screens in the browser, or the employee My pay page. I didn't review the Puerto Rico overtime law itself; recommendation 3 needs Jose's legal confirmation.
