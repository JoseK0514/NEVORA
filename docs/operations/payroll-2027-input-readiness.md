# 2027 payroll input readiness

Prepared November 10, 2026. **2027 native payroll is blocked.** `src/lib/payroll/native/calculate.ts` rejects a payday outside 2026 with `RULESET_NOT_APPLICABLE` and checks matching attested YTD year. This packet collects prerequisites; it does not change the calculator, import contract, employer settings, payments or tax filing.

## Current source evidence

The [SSA 2027 fact sheet](https://www.ssa.gov/cola/factsheets/2027.html), rechecked November 10, lists a $192,300 Social Security taxable maximum for 2027, versus $184,500 for 2026. This is one year-dependent parameter, not a complete rule pack. The [IRS current Publication 15 link](https://www.irs.gov/forms-pubs/about-publication-15) still opened [Publication 15 (2026)](https://www.irs.gov/publications/p15) during this check. The [Hacienda withholding index](https://hacienda.pr.gov/comerciantes/patronos-y-agentes-retenedores/tablas-de-retencion-withholding-tables) lists the manual for wages paid after December 31, 2016; its listing alone does not qualify every 2027 input or employer's applicability.

These observations supersede no approved policy and authorize no constants. Engineering must acquire applicable year/effective-date sources and independently qualify the whole supported scope before enabling a 2027 payday. Preserve current 2026 snapshots/PDFs and the unsupported-year guard. The [2026 owner provisional policy](../payroll/owner-provisional-policy-20261014.md) is year scoped; it is not automatic approval for a 2027 cent-allocation policy.

## Required private input register

Store actual inputs/evidence in the approved payroll system or restricted operator case, not this repository, chat or an email attachment. Repository records contain evidence references/status only. Missing values stay missing; do not infer jurisdiction from timezone or reuse a fictional fixture as a business fact.

| Input and evidence | Accountable owner | Acceptance before use |
|---|---|---|
| Employer/workspace, worker coverage and actual jurisdiction; supported vs excluded populations | Jose/employer with qualified adviser | Explicit applicable scope and exclusions; unsupported scope remains blocked |
| First 2027 payday, schedule frequency/anchor, period boundaries, attribution across Dec/Jan and historical corrections | Employer + engineering | Approved actual dates and applicability rule; resolve mixed-year periods instead of changing dates to pass the guard |
| Effective wage profiles, paid/unpaid break treatment, overtime/rest basis and retained exceptions | Employer + qualified adviser | Dated source/profile revisions; no default wage, invented classification or retroactive rewrite |
| Current employee tax certificates, FICA/SINOT coverage and PR withholding evidence | Employer + qualified adviser | Complete effective interval and current applicable source references |
| Employer FUTA applicability/credit/rate/cap, PR UI assigned rate/cap, CFSE classification/policy/rate and other obligations | Employer + qualified adviser | Individually evidenced values and exclusions; never assume maximum FUTA credit or a generic employer rate |
| Opening 2027 YTD and employer wage counters for all period members, including zero/inactive/correction populations | Payroll operator | Signed/attested revision and evidence reference; zero must be attested, not filled automatically; reconcile prior-system totals |
| Authorized deductions, signed caps/consents and employer-only contributions | Employer/payroll operator | Complete authorization/effective dates; employer charges never reduce employee net |
| 2027 calculation/rounding/allocation policy where statutory precision is unresolved | Jose with adviser input | New explicit year-scoped decision; no inherited 2026 exception presented as current approval |
| Provider import mapping/payment procedure, if using imported payroll | Employer + adapter owner | Complete `NEVORA_PAYROLL_IMPORT_V1` reconciliation; saved provider choice does not establish an API/CSV/payment integration |

Operational intake states are `missing`, `provided-private`, `reviewed`, `qualified-for-candidate`. A provided document or owner attestation does not replace engineering/independent qualification. The actual input register is unfilled here because no business inputs were supplied to this task.

## Engineering acceptance and release sequence

1. Version a separate 2027 rule/source manifest, content hashes, publication/retrieval/effective dates, scope and unresolved applicability. Review federal, Hacienda, DTRH minimum-wage/overtime/SINOT/UI and employer CFSE facts under the actual supported scope; a single SSA update is insufficient.
2. Implement the new year behind unchanged blocked defaults with regression evidence. Keep prior calculation provenance, approved source heads, cash, PDFs and corrections immutable.
3. Qualify independent vectors plus owned SQL for first/last supported payday; Dec/Jan period attribution; opening zero/nonzero YTD; Social Security/SINOT/FUTA/UI cap crossings; Additional Medicare; effective-profile changes; exact money/cent allocation; zero/inactive populations; stale approval/source changes; correction history; and exact resulting employee/company PDFs. Unsupported year, coverage or incomplete input must still block without partial pay.
4. Obtain independent technical/payroll policy qualification on the exact candidate. The coordinator then handles development integration/exact-source CI and separately authorized isolated hosted acceptance.
5. Complete these gates **before the first actual 2027 native-calculator payday**, including preparation/review scheduling. Do not promise a date without the employer's first payday and input register. An imported payroll workflow is separately qualified and does not make the native calculator support 2027.

Owner decisions to bundle: first intended 2027 payday and actual supported employer/population; private input owner/adviser; any new year-scoped policy decision after source review. No tax-law conclusion, payroll payment or Production activation is certified by this packet.
