# First payroll rehearsal

November 24, 2026. This local rehearsal starts at the held SCRUM-83 backend `9c2d64ee6de08310accecd93dc50b21d8ce143e1`, based on Development `12263073083a2e5fc387a4728ed13ead7b346cc4`. Each database run created a disposable loopback PostgreSQL cluster and used fictional employees, shifts and providers.

The launch workflow uses reviewed paid hours from NEVORA and calculations from the customer's payroll provider. The existing SCRUM-83 integrator owns release qualification and publication. Claude owns the payroll review UI. [SCRUM-83](https://thevelani-team.atlassian.net/browse/SCRUM-83?focusedCommentId=10653)

## Seven findings

| Finding | Rehearsal and launch disposition |
| --- | --- |
| BL-09 · Unscheduled and ambiguous punches | The independent approver confirmed a fictional unscheduled eight-hour entry with an approval note. The finalized card retained all eight hours and the original entry. The attendance checks covered schedule evidence. When the shift match is ambiguous, verify actual work and location before approving. Shift reassignment is a separate workflow. |
| BL-12 · Paid and unpaid breaks | Classification is mandatory for each recorded break included in a paid export. New backend treatment `PAID_AS_WORKED` counts the reviewed interval as work. The fictional 8.50-hour shift with a 30-minute worked-through meal, a 15-minute paid rest and a 15-minute relieved meal exported 8.25 paid hours. A retry recovered the exact file. A changed decision on the same operation conflicted. The UI still needs the new choice. |
| BL-13 · Forgotten break-end | A pending correction blocked timecard approval. Independent approval shortened the effective meal to the confirmed 30 minutes. Eight recorded hours produced 7.50 paid hours, with the original break end retained. The operator must notice or receive the discrepancy and use the correction flow. |
| BL-15 · Forgotten clock-out | The management-close checks exercised choosing the actual end, recording the reason, rejecting out-of-scope and self-review attempts, and safe retry. Use the existing open-entry review and intentional end-time confirmation before processing the period. |
| BL-21 · Wrong location, duplicate entry, or missing break | Overlapping intervals blocked approval and finalization. For each of the three fictional referrals, a zero-time disposition was refused, only the Owner could record the exclusion and reason, the original time was preserved, and the prior handoff could not be submitted again. The current correction contract covers entry and break boundaries and missing work entries. Changing the recorded worksite, voiding a duplicate, and inserting an absent break still require either a verified provider correction or native correction work. |
| BL-22 · Current file after a correction | Reopening a finalized card made the previous company manifest historical. A fresh handoff was refused. An authorized reader retrieved the identical bytes and hash, and the original handoff replay returned the same event. A newer file requires a newly reviewed current manifest. |
| BL-24 · Overtime reconciliation | A fictional employee worked 42 paid hours across two locations. The reviewed export preserved daily totals and locations and reconciled to a fictional provider example showing 40 regular and 2 overtime hours. The actual provider account, template, approved workweek and pay categories remain required for first-customer acceptance. [SCRUM-49](https://thevelani-team.atlassian.net/browse/SCRUM-49?focusedCommentId=10650) |

## Backend contract for the break review

Send `PAID_AS_WORKED` as the `treatment` in the existing `paidTime.version=1` request for a reviewed recorded break that was worked. The reviewer confirms the entire effective interval. If only part of an interval was worked, verify the actual break boundaries and use the existing correction review when it can represent the correction. Cases that need multiple segments require separate review through the operator.

The export preserves every recorded break and the selected treatment. `paidNanoseconds` includes the worked interval. `paidRestNanoseconds` excludes it. The exact worked amount is present as `workedDuringBreakNanoseconds` on the canonical employee row and each affected day. Existing CSV headers and layouts stay compatible. Historical receipts retain their bytes and treatment. Missing or otherwise invalid break decisions still return `BREAK_CLASSIFICATION_REVIEW_REQUIRED`.

## First live handoff

1. Confirm the payroll provider product, account template, effective mapping, approved pay period and workweek, and an authorized sandbox or accountant reviewer. Reconcile paid hours and the provider's regular, overtime and premium results before relying on its output.
2. Review exceptions before approval. If no native correction is available, hold the affected export until the Owner and payroll reviewer agree on a supported external correction. Confirm that the employee's wages are included in the provider run and record the evidence without duplicating any submitted hours. The existing Owner-only exclusion records a reason and requires separate evidence that the employee was handled by the provider.
3. Preserve the file's company manifest ID, CSV hash, source revision and provider reference. Exact replay recovers the original record. If somebody changes a timecard afterward, reconcile what the provider already accepted and use its permitted correction process before submitting another file.

Production remains subject to the existing SCRUM-83 hold and the selected release's hosted acceptance.

## Local verification

- 366 focused unit and component tests passed. This includes paid export, export routes, the payroll-review consumer, Attendance projection, and Clocker schedule matching.
- 235 selected PostgreSQL tests passed across Attendance (30), correction review (36), managed clock-out (26), timecards (29), paid export (27), company period close (40), and provider intake (47). These counts exclude earlier reruns and the deliberate failing regressions.
- Typecheck, lint on the touched TypeScript, and `git diff --check` passed. The command logs are under `.omo/evidence/first-payroll-rehearsal/` in the local worktree.
