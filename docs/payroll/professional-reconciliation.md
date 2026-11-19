# Provisional payroll reconciliation

**Production calculation is held for payroll-professional validation.** The runtime admits the explicit native opt-in only in development or test processes. Production builds, missing runtime identity and conflicting production deployment or workspace markers select external amounts. The command, source capture, capability and worker paths use that decision. A future activation requires a reviewed code change and release authorization. Wage editing and schedule estimates have their own endpoints.

## Current calculation inventory

| Source or calculation | Implemented behavior | Professional validation outstanding |
| --- | --- | --- |
| Recorded time | Uses the existing finalized timecard and recorded-source capture, correction provenance, complete workweek context and source hashes. Open entries, reopened or stale cards, unresolved corrections and ambiguous coverage block calculation. | Reconcile approved-to-finalized workflow, overnight boundaries, corrections and replacements against timekeeping records. |
| Gross wages | Effective hourly rates by location, classified paid rests and relieved unpaid meals, daily and weekly overtime, preserved double time, consecutive rest-day treatment, weighted weekly rate and federal premium credit/true-up. The current rule attributes the entire entry to its shift-start day for daily overtime. | Verify employee classifications, applicable minimums and higher rights, actual workweek notices, daily/rest-day rules, break eligibility, mixed-rate and cross-period premiums. Salary, tips and other unsupported arrangements need separate rules before use. |
| Withholding | Standard 2026 Puerto Rico resident percentage tables for four pay frequencies and supported certificate elections. Federal employee Social Security, Medicare and Additional Medicare rules, program-specific wage bases and SINOT allocation. | Compare the applicable official year, actual payroll frequency, elections, limits and rounding at each collection stage. The existing PR guidance concerns final periodic cents in a limited scope. |
| Employer and voluntary amounts | Employer Social Security/Medicare/SINOT, declared FUTA, PR unemployment and CFSE rates/bases, supported authorized post-tax deductions, cap counters and employer-match checks. | Validate actual coverage, classifications, credits, signed deductions and remaining balances. Reconcile per-payment accruals to quarterly/annual obligations, filings and remittances. |
| Rounding, history and output | Exact rational durations and wage amounts, provisional paycheck-cent allocation, employee and employer lines, gross-to-net checks, attested opening YTD, immutable ledger heads and linked corrections. Evidence and documents refer to saved results. | Confirm pay-period versus group rounding and residual allocation, YTD transitions, caps, reversals and document totals against an independently calculated register. Payment execution and agency submissions need separate verification. |

## Fictional register

All money below is USD. The weekly fixture uses zero opening balances, a standard PR certificate, an attested 0.30% employee SINOT share, no voluntary deductions and exempt FUTA, PR unemployment and CFSE. Social Security and Medicare apply. The case inputs and expected cents are committed in the [reconciliation test](../../src/lib/payroll/native/professional-reconciliation.test.ts).

| Case | Gross calculation | Employee SS / Medicare / SINOT | Net | Employer SS / Medicare / SINOT |
| --- | --- | --- | ---: | --- |
| Noon raise with 30-minute relieved meal | 4 h × $15 + 3.5 h × $20 = $130.00 | $8.06 / $1.89 / $0.39 | $119.66 | $8.06 / $1.89 / $0.39 |
| 22:00 through 07:00, shift-start day | 8 h × $20 + 1 h × $30 = $190.00 | $11.78 / $2.76 / $0.57 | $174.89 | $11.78 / $2.76 / $0.57 |
| Finalized period with no entries | $0.00 | $0 / $0 / $0 | $0.00 | $0 / $0 / $0 |

The tests also require a blocked result for a card awaiting finalization and a 2027 payday under the 2026 policy. Existing independent vectors extend the register to mixed-rate weeks, fractional cents, program caps and deduction limits. [Vector tests](../../src/lib/payroll/native/provisional-vectors.test.ts)

## Validation record to complete

A payroll professional should independently calculate the supported scenarios and representative boundary cases for the intended employer and jurisdiction. Record the calculator/rules hash, effective year, source facts, reference register and per-line differences for time, gross, deductions, employer amounts, net and YTD. Document each discrepancy and disposition and identify supported and excluded cases. Record reviewer identity, date and signed scope after corrections are reconciled. Synthetic agreement alone supplies no professional sign-off.
