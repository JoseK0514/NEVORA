# First-customer pricing proposal

**Working draft v0.1 · READY_FOR_REVIEW · no approved prices or offer.** Jose / Business Owner owns commercial decisions. Commercial Reviewer prepares the quote; Jose and appropriate commercial/legal reviewers must review binding terms before they are sent. Draft completion is not approval, customer acceptance or production authorization.

## Proposed model

**PROPOSED:** start with a written, customer-specific quote and manual invoicing for one configured company. It makes scope, service periods and charges reviewable while subscription billing is unverified. This requires an assigned operator, reconciliation and an agreed payment method; it does not create checkout, recurring debit, automated renewals, reminders, tax calculation or account suspension. Do not promise these capabilities.

| Option to evaluate | Fillable commercial basis | Decision needed |
| --- | --- | --- |
| Fixed company fee | [amount] per [period], [included scope] | Included locations/people and treatment of growth |
| Per active person | [amount] × [agreed count] per [period] | Count definition, snapshot date, role inclusion and changes |
| Per location | [amount] × [agreed locations] per [period] | What qualifies as a location and any included allowance |
| Hybrid | [base amount] plus [defined additional unit charge] | Included units, measurement and adjustment rule |
| Separately scoped onboarding | [amount] for [specific deliverables] | Whether charged, included or omitted; acceptance evidence |

Select one model: [ ]. No minimum, discount, trial, commitment or additional fee is presumed. A commercial seat means the agreed billable unit, not application permission or entitlement. Define whether Owners, Managers, Leads, inactive employees and pending invitations count. Confirm company, location and employee counts; employees differ from separate businesses.

## Inputs and quote record

| Required input | Value / evidence / owner |
| --- | --- |
| Customer legal entity and authorized buyer | [ ] / Customer Owner |
| Company, locations and count evidence | [ ] / Customer Owner |
| Included workflows, modules and launch acceptance | [ ] / Onboarding Lead + Engineering Lead |
| Pricing basis, unit amounts, allowances and adjustments | [ ] / Jose |
| Quote currency, cadence and service period | [ ] / Jose + Customer Owner |
| Tax treatment, jurisdiction, calculation and invoice requirements | [ ] / appropriate tax/commercial reviewer |
| Payment method, due date and collection owner | [ ] / Jose + Commercial Reviewer |
| Start, term, cancellation, refunds and export arrangements | [ ] / Jose + legal/commercial review |
| Quote ID, version, validity and approval references | [ ] / Commercial Reviewer |

Use [service responsibilities](SERVICE-RESPONSIBILITIES-DRAFT.md) for scope and unresolved terms. Public-policy employee Terms create no employee charge; any organizational fee needs separately reviewed commercial terms.

## Cost versus selling price

Record provider expenses, allocations, support/onboarding effort and contingency in [COST-WORKSHEET.csv](../infrastructure/COST-WORKSHEET.csv). Cost is what NEVORA spends; price is what the customer agrees to pay. Shared provider invoices must not silently become a per-customer cost or price. Compare revenue excluding collected tax with attributable recurring costs; identify one-time effort separately. Estimates need evidence; margin and tax treatment need review.

Historical `docs/product/reviews/50-inspectors-2026-10-21/reports/01-ba-value-pricing.md` contains research hypotheses and proposed features, not an approved price sheet or current entitlement list. Do not carry its amounts, trial or tiers into a quote without a recorded decision.

## Invoice preparation

Open [INVOICE-TEMPLATE.csv](INVOICE-TEMPLATE.csv) as a spreadsheet and add one row per charge, beginning at row 2. Repeat invoice metadata consistently. Issuer is VELANI LLC; enter the reviewed customer entity only in the controlled customer invoice copy. Keep this shared template blank. Currency, cadence, tax treatment and amounts are intentionally unresolved. Set status to DRAFT until review; record the issued copy and reconciliation separately.

Columns O–W contain quantity, unit, unit price, discount amount, tax-treatment reference, tax rate, net, tax and total. After approving all inputs, calculate `U2=O2*Q2-R2`; when a reviewer confirms a single rate on that net basis, `V2=U2*T2`; then `W2=U2+V2`. Enter an approved rate as a decimal. For other tax treatment, use the reviewed calculation and reference it in S. Blank does not mean zero: explicitly enter zero only for an approved no-discount/no-tax treatment. Round according to the selected currency and approved tax method. Copy formulas per row; sum U, V and W once per invoice, outside the line-item table. Do not sum repeated metadata or mix currencies. Preserve calculated totals in the issued copy because CSV does not preserve spreadsheet formatting.

Commercial Reviewer checks quantities, periods, duplicates, arithmetic, currency, tax, approval and due date before issue. Confirm payment instructions through the agreed channel; store only a method reference, never bank details. Reconcile receipts manually by invoice ID. Disputes, adjustments and overdue handling require documented decisions; billing status must not trigger an invented access restriction.

**Exit:** reviewed quote, approved responsibilities and invoice inputs, named operator and retained approval evidence. Actual issuance, sending and collection are outside this drafting task. Policy authority: `src/lib/legal/policies.ts`; delivery boundary: `docs/execution/single-company-20261012.md`, reference SHA `8e9073974b52053e557382ec5199dbce9d5aa32c`. Hosted behavior remains unverified.
