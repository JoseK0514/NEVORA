# 07 Business Analyst (payroll and compliance): Puerto Rico and US labor-rule exposure

*This report looks at product risk, not legal questions. Every rule mentioned here is something to confirm with Puerto Rico labor counsel and US wage-and-hour counsel. None of it is a legal conclusion.*

## Verdict

NEVORA's time record is strong. It keeps the raw punches, adds corrections as a separate layer, stores approve and finalize revisions that can't be changed, blocks self-review, and asks for a reason before reopening a period. The weak point is what happens after time is finalized. The export sends one total for the whole period, and that total includes breaks. Nothing in the data model says whether a recorded break is paid. The review screens flag no meal-period, overtime, rest or day-of-rest problems. A manager can also exclude a worker who has recorded hours from payroll, and nobody else has to sign off. Payroll can be correct only if the provider or the manager catches these problems by hand. For a Puerto Rico employer under Ley 379, the 8-hour day, meal-period timing and meal penalties are where the exposure sits.

## Recommendations

1. **Export daily and weekly hours, with paid and unpaid time separated, not one period total that includes breaks.**
   - *Why:* The canonical export is fixed to `timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS'` (`src/lib/payroll-export/model.ts:4,19`). A period can run up to 31 days (`src/lib/timecards/project.ts` `parsePeriod`). The ADP RUN profile maps **Pay Hours** to that total under a single constant Earnings Code (`model.ts:31`).
     - A provider that only gets a period total can't work out daily overtime (more than 8 hours in a day under Ley 379 Art. 4(a), per `docs/product/competitive-2026-10.md` §7.1).
     - On a biweekly period it also can't work out weekly overtime. For example, 50 hours plus 30 hours shows up as 80 hours with no overtime.
     - Unpaid meal time goes out as pay hours. If a customer subtracts the separate `breakHours` column downstream, short rest breaks become unpaid as well. Under the FLSA, short breaks are generally treated as paid time; check with counsel.
     - The UI does say "Hours include breaks" (`src/components/payroll-export.tsx:137`). That disclosure doesn't fix the data.
     - The same profile accepts `hourDecimals` 0 with `HALF_UP` (`model.ts:22`), so totals can be rounded to the whole hour. Set a minimum precision.
   - *Fix:* Add per-day and per-workweek rows to the canonical model, with `paidHours` and `unpaidBreakHours`. Overtime and meal-penalty columns come later, after counsel signs off.
   - *Impact:* High · *Effort:* M · *Owner:* Backend (model), UI (export summary)

2. **Classify each recorded break as paid or unpaid, and connect the setting that already exists.**
   - *Why:* The setting `CompensationRule.breakTreatment` / `excludedBreakTypeIds` is defined and validated (`src/lib/business-improvements/company-policies/model.ts:46-54,254`), but no other file uses it.
   - Break types carry only REST/MEAL/OTHER plus a target that is "informational display only" (`src/lib/clocker/break-types.ts:1,22`).
   - The scheduling break rule does have `paid` (`src/lib/shift-changes/policy.ts` `breakRule`), but punched breaks don't.
   - Without this flag, NEVORA can't produce paid hours, a meal-penalty line, or a check that "a meal shorter than 30 minutes counts as paid".
   - *Impact:* High · *Effort:* M · *Owner:* Backend + Product (Jose decides the defaults with counsel)

3. **Show compliance exceptions on the timecard before approval, and require each one to be acknowledged in batch Finalize.**
   - *Why:* A timecard can raise only five issues: `period_open`, `open_entry`, `open_break`, `pending_correction` and `overlapping_time` (`src/lib/timecards/project.ts:23`).
   - The review list shows Recorded, Breaks and Status only (`shots/QAOWNER-timecards-1440.png`). That screenshot even shows a 25h 42m card with 22h 52m of breaks, with "Missing clock-out" as the only flag.
   - "Approve selected / Finalize selected" (`src/components/timecards.tsx:319-326`) lets a manager approve many cards without seeing any exceptions.
   - *Fix:* Add warnings, not blocks, for:
     - meal not started by the 6th consecutive hour
     - meal shorter than the configured or stipulated length
     - more than 10 hours with no second meal
     - more than 8 hours in a day, and more than 40 hours in a week
     - too little rest between shifts
     - a 7th consecutive day worked
   - Record the approver's acknowledgement in the revision snapshot.
   - This is the timecard half of the planned A2 / Ley 379 pack (`docs/product/direction.md:75,114`) and needs counsel's wording.
   - *Impact:* High · *Effort:* L · *Owner:* Backend (rules), UI (flags, acknowledgement), Product (counsel)

4. **Stop anyone from excluding a worker with recorded hours from payroll on one person's say-so.**
   - *Why:* Period close checks evidence only for `ZERO_TIME` (`src/lib/period-close/service.ts:403-409`). `EXCLUDE` is accepted with any free-text reason even when `recordedNanoseconds > 0`.
   - The payroll import then requires that person's gross pay to be 0 (`src/lib/payroll/service.ts:552-560`). Worked hours can leave the pay run without a second check, which is direct unpaid-wage exposure.
   - *Fix:* When recorded time is above zero, require a structured reason (for example, "paid outside NEVORA", with a reference) and a second approver. Show these people at the top of the payroll review.
   - *Impact:* High · *Effort:* S–M · *Owner:* Backend + UI

5. **Check the provider's imported pay against NEVORA's finalized hours.**
   - *Why:* `PayrollImportRow` has gross, deductions and net, but no hours (`src/lib/payroll/contracts.ts`, `model.ts` `parseImport`). At approval, the only check is that each included timecard is FINALIZED (`service.ts:552`).
   - If the provider paid 72 hours and NEVORA finalized 80, nobody sees it.
   - *Fix:* Accept optional hours lines in the import: regular, overtime and meal penalty. Show the difference from finalized paid hours as an exception that must be acknowledged before approval.
   - *Impact:* Medium-High · *Effort:* M · *Owner:* Backend + UI

6. **Add an optional two-person rule to payroll, and flag approvers who appear in the run.**
   - *Why:* The Owner holds every permission: configure, review and approve (`service.ts:108-110`). Approve, Publish, Payment export and Retry all use the same permission (`service.ts:580`).
   - Nothing stops the person who imported or corrected a run from approving it. Nothing stops an approver from approving a run that pays themselves.
   - Timecards already enforce this split (`CHECK(actor_employee_id<>employee_id)`, `db/migrations/0018_timecards.sql:19`), so payroll is the weaker link.
   - *Fix:* Add a workspace setting that requires approver ≠ importer, plus a warning when the approver's own row is in the run.
   - *Impact:* Medium · *Effort:* S–M · *Owner:* Backend + UI, Product (default on or off)

7. **Let employees dispute finalized time inside the app, and optionally confirm their own hours.**
   - *Why:* Once a period is finalized, the employee only sees "Ask a manager to reopen the finalized timecard period…" (`src/components/employee-time-corrections.tsx:56`). The dispute then happens outside the app and leaves no record.
   - Employees never confirm their hours: the codebase has no attestation step.
   - In a wage claim, a logged dispute and the employee's own confirmation are the evidence that protects the employer.
   - *Fix:* Add a "Dispute finalized time" request. It goes to the manager inbox, appears on the timecard and in its history, and blocks payroll export of that card until the manager answers.
   - *Impact:* Medium · *Effort:* M · *Owner:* Backend + UI

8. **Give managers a way to close out time and final pay for workers who leave.**
   - *Why:* Only employees can ask for corrections, and only for their own time: submit passes `actor` as both employee and actor (`src/lib/time-corrections/service.ts` `submitTimeCorrection`). Managers have no way to fix a missing clock-out for someone who has left.
   - Approval is blocked while an entry is still open (`0018_timecards.sql` `UNRESOLVED`), so that person's period can never be finalized.
   - The ADP RUN export also refuses inactive employees (`nevora_export_INACTIVE`, `db/migrations/0019_payroll_export_mappings.sql:48`).
   - Final pay for people who have left is the case most likely to be late or wrong.
   - *Fix:* Add a manager-initiated correction that requires a reason and is reviewed by a different manager or the Owner. Allow ADP export for inactive employees after an explicit "final pay" confirmation.
   - *Impact:* Medium · *Effort:* S–M · *Owner:* Backend + UI

9. **Change the rule settings so they can hold the Ley 379 checks before the pack is built.**
   - *Why:* The current settings can't represent the rules the pack needs:
     - The overtime-risk alert has one window, either a business day or a business week, not both (`company-policies/model.ts:37-45`). Ley 379 needs both at once.
     - Projected overtime on schedules is weekly only (`src/lib/scheduling/operational-rules.ts:143`).
     - The break rule is a single break with a "starts no later than" limit (`operational-rules.ts:122`). It has no "not before the end of hour 2" check, no second meal over 10 hours, no short-shift waiver, and no per-employee stipulation (30 or 20 minutes).
     - There is no flag for hire date before Ley 4-2017, no alternate-week agreement, and no day-of-rest count.
   - Planning the pack (A2) without these changes would put it on top of a model that can't express it.
   - *Fix:* Allow several overtime rules, a break-rule set and per-employee agreement records now. Shipped behavior stays the same until counsel signs off.
   - *Impact:* Medium-High · *Effort:* M · *Owner:* Backend, Product (counsel)

10. **Records: define retention, add a per-employee inspection packet, and make raw punches append-only.**
    - *Why:* NEVORA has no retention policy for time or payroll records. The FLSA recordkeeping rule (29 CFR 516, 2 to 3 years) and Puerto Rico requirements should be confirmed with counsel and written into the product.
    - When an inspector or a claim asks for records, nothing exports the raw punches, adjustments, correction reasons and revision history for one employee and one period. All the data already exists.
    - Raw `time_entries` / `break_entries` are protected only after FINALIZE (`0018_timecards.sql:153-179`). Before that, the database allows UPDATE and DELETE. App code never does this; integration tests do.
    - *Fix:* Make raw punches append-only at the database level, with every change going through the correction layer.
    - *Impact:* Medium · *Effort:* S–M · *Owner:* Backend, UI (packet download), Product (retention period)

## What's good

- **The audit trail is real.** Raw punches sit beside effective time, and corrections are separate adjustments, each with a reason. Timecard revisions, export receipts and the payroll period records can't be changed: triggers in `0018`, `0019` and `0027` block edits. Nobody can review their own correction or timecard. Reopening needs a reason, and earlier revisions are kept ("Earlier revisions remain preserved").
- **Each step depends on the one before.** Finalize needs an earlier Approve on the same source hash. Corrections are blocked inside finalized periods. Payroll approval and export both need the current finalized revision, and the export is checked again by fingerprint in SQL. There is no automatic break deduction, no punch rounding and no clock-in grace period, so recorded time is exact.
- **The copy is honest about limits.** Timecards say "These aren't payroll hours" (`timecards.tsx:38`). The export says "Your payroll system decides pay types" (`payroll-export.tsx:137`). The code reports `internalCalculatorAvailable:false`, and payroll settings say a missing setup "is not a zero tax or an exemption" (`QAOWNER-payroll-1440.png`).

## Not checked / limits

- I'm not giving legal advice. The rule references come from the team's own DTRH summary (`competitive-2026-10.md` §7.1) and general FLSA knowledge. Counsel has to verify all of them. I didn't verify the Puerto Rico day-of-rest law, the Puerto Rico record-retention periods or pay-statement content rules.
- I didn't use a browser, as the brief says. UI evidence comes from screenshots and component copy only. I didn't test any flow, including batch finalize, payroll approve or export, or the Spanish wording on payroll and legal copy.
- I didn't read every SQL function from start to finish: `nevora_submit_time_correction` authorization, the payroll documents and notices, and all of `period-close/service.ts`. I ran no tests.
- I didn't check pay-statement content (`src/lib/payroll/documents.ts`) for hours, rates or overtime lines.
- I checked Lead and Employee time screens only for the dispute and correction path.
