# Puerto Rico statutory PTO

- Application base is Development `e0e8efe9c` with the PTO checkpoint `2de0c4b70`. Codex owns the backend. Claude retains the UI and the separate Owner and Manager controls integration.
- Puerto Rico Act 180 accrual uses finalized timecards and the existing vacation and sick ledgers. Development is the operating and acceptance environment. Main and production promotion require Jose's approval of the verified combined release.

## Source and calculation

[Act 180 Articles 3–4](https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/Trabajo/180-1998/180-1998.pdf#page=4),
[DTRH Consultation 15833](https://trabajo.pr.gov/docs/Opiniones_Oficina_del_Procurador_del_Trabajo/C15833%20Acumulaci%C3%B3n%20Licencias%20Vacaciones%20y%20Enfermedad%20-%20Ley%20180-1998%20seg%C3%BAn%20enmendada%20por%20Ley%204-2017.pdf#page=2),
[DTRH Guide §§ 6.1–6.3](https://trabajo.pr.gov/docs/Boletines/Guias_Legislacion_Laboral.pdf#page=79),
[Act 80 Article 8](https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/Trabajo/80-1976/80-1976.pdf#page=6),
[Act 28 Article 3(f)](https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/Salud/28-2018.pdf#page=4),
and the [DTRH Act 41 notice](https://www.trabajo.pr.gov/ley41_2022.asp).

- Full-time and part-time employees use the same 7,800-minute threshold. Actual worked time and verified vacation, sick and Act 28 leave used in the window count. The regular-workday calculation uses a verified fixed day, regular minutes divided by days worked for variable schedules, or 480 minutes for a confirmed indeterminate schedule.
- Standard qualifying vacation rates are ½, ¾, 1 and 1¼ workdays at the statutory service tiers. A confirmed qualifying Puerto Rico resident small employer owes ½ day in the post-reform cohort. The verified ordinary same-employer pre-2017 protection here uses 1¼ vacation days. The standard sick rate is one regular workday per qualifying window, including probation.
- If the employer has a verified vacation vesting date in the future, the sick award posts independently and vacation can be posted retroactively by retrying the same finalized cards after vesting. Shorter, interrupted and unsuccessful probation arrangements require verified employment evidence. Retain statutory vacation balances. Leave scheduling, two-year deferral agreements, and any pay or separation settlement go through employer and payroll review.
- At January 1, the statutory sick carryover is up to 15 days. Current-year accrual can build above 15. The dedicated carryover command handles accounts with a verified uniform workday equivalent and honors a higher configured employer carryover cap. A mixed or unknown day equivalence requires review.

## Owner API

All requests use the existing signed-in, same-origin workforce boundary and `x-nevora-workforce: 1`. See [the request parser and reason values](../../src/lib/workforce/puerto-rico-pto.ts).

- Send `POST /api/workforce/pto-accrual` with `action: "preview"` or `"post"`, `timecardOperationId` from a finalized company timecard, `policyIds: {vacation, sick}` with the enabled VACATION and SICK policy revision UUIDs, and `evidence`. The same evidence and policy IDs are required on retry. Use the returned `vacationDeferred` field to explain any postponed vacation credit.
- Evidence includes a short reference to the employer's payroll and policy review, the verified coverage, accrual-window method, vacation vesting date, reconciliation of opening and previously posted balances, a time-classification review flag, whole-minute category totals and the supported schedule method. Store only an opaque internal reference. Keep payroll files and medical details in their owning system. The calculation uses the stored employee hire and termination dates and reconciles regular and overtime minutes with the finalized timecard, including validated paid breaks.
- Consultation 14805 anchors the monthly calculation to hire. Set `windowMethod` to `HIRE_ANNIVERSARY` or `FIXED_30_DAYS` only when the employer has verified that interpretation. A null method requires those readings to agree for the window. If overtime changes eligibility, a day or award is unclear, the window crosses year-end, the year is closed, or the correction would reduce either previously earned amount, the endpoint returns `409 review_required` with reason codes and makes no posting. A reviewer can resolve the source evidence or use the existing documented Owner ledger adjustment where appropriate.
- For verified fixed-day sick rollover send `POST /api/workforce/settings` with `kind: "PR_SICK_CARRYOVER"`, a UUID `operationId`, `employeeId`, `expectedPolicyRevision` for SICK, January 1 of the current Puerto Rico calendar year as `effectiveDate`, the verified uniform `regularDayMinutes`, and the opaque `reference`. A null day length or incompatible record returns `review_required`. Use the same operation ID and body for retries. Reconcile December and any historical adjustments before closing the year.
- Verify industry decrees, coverage exclusions, and protected or more generous agreements where applicable. The standard calculator supports the ordinary higher pre-2017 vacation rate and the stated small-employer exception. Mark any additional terms unresolved for review before choosing an employer-specific adjustment.

## Verification and handoff

The fictional acceptance covers full-time and part-time posting, paid leave at the threshold, the irregular workday, positive and downward corrections, replay, Owner admission, probation, and the annual sick carryover. The service writes the two balance changes and their timecard receipts in the same transaction. A review result is returned to the Owner caller for follow-up. It does not create a separate task queue. The legal interpretation on the held cases remains with DTRH or Puerto Rico labor counsel.
