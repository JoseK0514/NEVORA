# Using the launch workbook

The [Excel workbook](NEVORA-Launch-Workbook.xlsx) is an editable companion to the Markdown procedures and CSV templates. It uses ordinary spreadsheet formulas and contains no macros, provider connection, importer, email sender, billing integration or deployment automation.

## Safe working copy

1. Keep this reusable master free of actual employee and customer data. Create an authorized private customer copy in the approved business-controlled store; do not upload filled copies into the application checkout or a shared public folder.
2. Use the **Start Here** links to navigate the ten sheets. Blue cells contain editable inputs/reference rows; grey cells calculate results. Yellow/red/green status colors help tracking, but never constitute approval or evidence.
3. Complete **Company Intake** first. Confirm people versus separate businesses and the scope of the first-login cohort. The full questions and authority checks remain in [company intake](onboarding/COMPANY-INTAKE.md).
4. Assign named people to the operating roles using **Responsibilities**, then record actual decisions and evidence references in **Decisions**. R = responsible, A = accountable, C = consulted, I = informed. A/R is one accountable role that also executes. These labels do not change application permissions or replace independent release ownership.

## Staff and service tracking

- **Employee Roster:** blank collection rows, not an import file. Preserve employee IDs/phone formatting as text. Use Owner, Manager, Lead or Employee access roles as directed by [the roster guide](onboarding/ROSTER-GUIDE.md); qualifications do not grant access. Registered email is required for invitation activation even though it is optional to save a staff record. Only the appropriate application Owner issues invitations after delivery readiness is verified. Add more blank rows in the private working copy if required.
- **Service Inventory:** record service/account/environment identities, owners and evidence references. Credential references point to an approved secure store; never paste token values, database URLs, passwords, invitation proofs, PIN keys or bank details.
- **Acceptance:** all 28 scenarios start NOT_RUN. Record observed behavior and an evidence reference only after an authorized execution. A disabled invitation-delivery flag does not waive activation for people who need it. Conditional/N/A decisions must follow [the acceptance plan](acceptance/CUSTOMER-ACCEPTANCE-PLAN.md).

## Cost and pricing calculations

**Costs** mirrors the source [cost worksheet](infrastructure/COST-WORKSHEET.csv). Blank prices are unknown, not zero. Quantity 1 is a scenario assumption, not a customer count. Enter a reviewed quotation, currency, quantity and positive monthly normalization factor. For example, an annual quoted cost uses a monthly factor of 1/12; this describes arithmetic, not a provider price. Rejected optional rows must be removed and the included total range reviewed before treating a scenario as complete. The total stays blank until every included row is priced and currencies match. Taxes, overages, allocations and staff effort require explicit review; this is not an accounting ledger.

**Pricing Inputs** keeps cost distinct from selling price. Currency, rounding precision, unit definition, cadence, quantities, unit prices, discount and tax inputs are blank. Enter explicit zero only when no discount/no tax has been reviewed. Draft net charge = quantity × unit price − discount; draft tax = net × reviewed single rate; draft total = net + tax, rounded using the selected precision. Other tax bases require a reviewed calculation rather than this simple-rate model. The monthly comparison normalizes Monthly, Quarterly and Annual net revenue; a one-time charge has no recurring comparison. The contribution calculation is a scenario comparison, not accounting profit or a target margin.

**Invoice Lines** supplies blank metadata and line items plus draft arithmetic in columns U–W. It uses the currency/rounding precision in Pricing Inputs and requires each line to match that currency. Fill an invoice ID, dates, customer/issuer, service period, agreement/quote and payment-method reference in the private copy. Enter a description, quantity, unit, price, explicit discount, reviewed tax treatment and rate. Never mix invoice IDs or currencies in one calculation. Totals stay empty or show INCOMPLETE when required line calculations are absent. DRAFT is the starting status; entering ISSUED or PAID manually is not proof that an invoice was sent or collected.

## Calculation and export limits

- Open the workbook in a compatible spreadsheet application and allow its ordinary formulas to recalculate. The file requests full recalculation on open; no live commercial values or calculated quote results were entered or evaluated during preparation.
- The formulas were checked structurally, against their CSV source rows and with illustrative calculation checks. That validates template arithmetic, not any future customer invoice or tax treatment.
- CSV templates remain the documented collection/exchange worksheets. They do not retain workbook formatting, validation lists, multiple sheets, review notes or cached calculated values. If exporting, follow [pricing and invoice preparation](commercial/PRICING-PROPOSAL.md) and review the resulting issued copy.
- Keep an unmodified source template. A filled or adapted copy needs a customer ID/reference, document version, owner and actual approval/evidence records. Do not infer readiness from the presence of formulas, a status color or a completed document.

The workbook, brief and portable ZIP can be regenerated using `python3 _tools/build_exports.py` from the pack folder with Python packages `openpyxl` and `reportlab` available. This reads the pack only. It does not operate the application. After final validation evidence is saved, `python3 _tools/build_exports.py --archive-only` refreshes the ZIP without changing the workbook or PDF.
