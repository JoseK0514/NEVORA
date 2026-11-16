# Payroll scope and product language (code reading, Nov 14, 2026)

PAYROLL SCOPE AND PRODUCT LANGUAGE INSPECTION — NEVORA, branch claude-codex-collab-nevora, HEAD ce4de4bc.

Evidence is code and document reading only; no app was run, nothing was rendered, no PDF was generated. Nothing was edited. This is not legal advice; points needing counsel or a CPA are marked. All paths are relative to /Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/.

Headline: the code goes further than "calculate pay from approved time". With migration 0031 applied, every new payroll is a native Puerto Rico 2026 calculation that produces gross, tax withholding, employer contributions, net and year-to-date, and shares statements with employees automatically on approval. It never moves money, stores bank details or files anything, and it has no "paid" state. The gaps are in what the product says: statements assert payment and remittance, nothing after approval tells the Owner to pay and remit outside NEVORA, and employees are shown paydays with no statement of who pays.

---

## A. Payroll capability as coded

**Two source modes** (`src/lib/payroll/contracts.ts:167`)
- `PROVIDER_IMPORT`: the Owner uploads a neutral JSON (`NEVORA_PAYROLL_IMPORT_V1`) with gross, deductions, employer contributions and net per person. NEVORA validates, totals and stores it; it does not calculate (`src/lib/payroll/service.ts:459-503`).
- `NATIVE_RECORDED_TIME`: used for every new run whenever the table `native_payroll_ledger` exists (`service.ts:399-401`, `native/source.server.ts:22-28`; migration `db/migrations/0031_native_payroll.sql`). Import and manual amounts are refused for native runs (`service.ts:460-461`). This is a schema switch, not a flag.

**Native inputs** (`src/lib/payroll/native/contracts.ts:50-158`)
- Finalized timecards: recorded entries and breaks, each break typed paid rest or unpaid relieved meal.
- Wage profile: hourly rate only, "PR private nonexempt", overtime at time and a half or preserved double time, workweek policy with evidence references.
- Tax profile: PR withholding-certificate elections (personal exemption, dependents, allowances, veteran, additional withholding), standard FICA, SINOT employee share up to 0.30%, a list of employer contributions with rate and cap.
- Attested opening year-to-date balances, written post-tax deductions (fixed or percentage, cap, "Law 17 §5(c)/(g)" basis), pay frequency, payday.
- Not supported: salary, tips, bonuses or Christmas bonus, commissions, paid leave, pre-tax deductions, exempt employees, non-PR, any payday outside 2026 (`native/calculate.ts:45`), rosters over 300 (`service.ts:56`). No meal-penalty premium was found.

**Native calculations** (`native/calculate.ts:23-151`)
- Regular and overtime: daily over 8 h, weekly over 40 h, seventh consecutive day, plus a federal weighted-rate true-up (`native/time.ts:210-215`).
- Minimum wage check at $10.50/h (`native/minimum-wage.ts:6`).
- Taxes, with statutory figures hard-coded:
  - PR income tax withholding from exemption and bracket tables (`native/rules/pr-2026.ts:46-62`; source cited is Hacienda's 2017 tables).
  - Social Security 6.2% to $184,500, Medicare 1.45%, Additional Medicare 0.9% over $200,000 (`pr-2026.ts:119-123`, `native/federal-employee-tax.ts:23`).
  - SINOT 0.6% combined on the first $9,000 (`pr-2026.ts:132`).
  - Employer Social Security, Medicare, SINOT and configured FUTA, PR unemployment and CFSE accruals (`native/obligations.ts:61`).
- Net = gross minus taxes minus authorized deductions; negative net blocks. Year-to-date before and after.
- Rounding follows an "Owner-authorized provisional policy" adopted "rather than waiting for the six accountant answer groups"; it "does not resolve the old statutory findings or authorize production" (`docs/payroll/owner-provisional-policy-20261014.md:3`).

**Run states** (`contracts.ts:158`): `WAITING_FOR_AMOUNTS`, `BLOCKED`, `REVIEW_REQUIRED`, `APPROVED`. There is no paid, finalized or disbursed state.
- Commands: PREPARE, IMPORT, RECALCULATE, APPROVE, PUBLISH, PAYMENT_EXPORT, CORRECT, CORRECT_NATIVE, RETRY_JOB (`contracts.ts:232-270`).
- Jobs: PREPARE, PDF, PUBLISH, REMINDER (`contracts.ts:200`); run by `scripts/payroll-worker.ts`, one job per invocation.

**What approval does** (`service.ts:504-542`, `src/lib/payroll/worker.ts:110-135`)
- Writes an immutable approved revision.
- Native: advances the year-to-date ledger at approval (`service.ts:518-519`).
- Queues the PDF job. Native runs then always queue PUBLISH (`worker.ts:121-122`); import runs publish only if the setting is on, otherwise through "Share pay statements".
- Optional reminder with generic text "NEVORA update / Open NEVORA to review your update." (`src/lib/payroll/notices.ts:120-121`).

**Corrections**: a linked new run that needs its own review and approval; the original stays in history (`service.ts:441-450, 459-503`). Reopening a timecard under an approved payroll is refused until a correction starts (`src/lib/timecards/service.ts:160-174`).

**Documents** (`contracts.ts:145`, `src/lib/payroll/documents.ts`)
- Employee statement PDF (pdf-lib, English or Spanish): earnings with hours and rates, taxes, other deductions, employer contributions, net, "This period / This year", run references, footer disclaimer.
- Company summary PDF: gross and net per employee, totals, employer contributions.
- Payment instructions JSON: employee ID and net amount, marked `compatibility: UNVERIFIED`, `submission: NOT_SUBMITTED` (`documents.ts:72-96`). Only for original approved import runs; refused for native runs and corrections (`src/lib/payroll/payment-policy.ts:5-8`).

**Exports**
- Time exports (`/app/payroll-export`, `src/lib/payroll-export/model.ts`): hours only. A CSV plus an exact JSON time record. Layouts are custom CSV or "ADP RUN generic v1"; no QuickBooks, Gusto or Paychex layout.
- Period close (`/api/period-close`): who is included, export manifests, and a manually recorded handoff marked `MANAGER_REPORTED_ONLY` (`src/lib/period-close/service.ts:776-777`).
- `/api/payroll/native-profiles` is employee wage, tax and deduction setup, opening balances and Manager payroll access. It is not provider profiles.
- There is no export of calculated amounts for native runs.

**My pay** (`src/app/app/my-pay/page.tsx`, `src/components/employee-mobile/pay-corp.tsx`, `src/components/employee-b/pay-b.tsx`): the next payday from the pay schedule, the person's own published statements as PDFs, and correction links. No amounts in the app UI.

**Flags**
- `NEVORA_PAYROLL_ENABLED=true` gates everything: pages return 404 (`src/app/app/payroll/payroll-route.tsx:21`), APIs 503 (`src/lib/payroll/store.ts:17-20`), the worker throws.
- Workspace module "Pay statements" hides My pay (`src/lib/workspace-presentation/modules.ts:26-27`).
- Notice delivery follows the notification configuration (`notices.ts:14-22`).

**Does / does not**

| Question | Answer |
|---|---|
| Calculates gross from approved time | Yes (native) |
| Calculates overtime and premiums | Yes |
| Calculates tax withholding and employer contributions | Yes, PR 2026 only, provisional policy, not accountant-validated |
| Calculates net and year-to-date | Yes |
| Moves money, direct deposit, checks | No |
| Stores bank account details | No (a bank-channel preference only, `contracts.ts:24,40`) |
| Has a "paid" state | No |
| Files or remits taxes; W-2, 499R-2, 941, 1099, year-end | No; no code or tables found in `db/` or `src/` |
| Exports calculated amounts as data | Only the import-mode payment JSON; nothing for native runs |

**Disclaimers that exist today**
- Prepare: "Adds up approved hours. Nothing is approved until you say so, and no money moves." (`src/components/payroll/payroll-runs.tsx:561`)
- Settings: "Approving doesn’t send any payment." (`src/components/payroll/payroll-settings.tsx:176`) and the payment-file note (`:188`)
- Payment instructions: "A file only. NEVORA doesn’t send money." (`payroll-runs.tsx:378`); "File only · not sent to a bank" (`src/components/payroll/document-row.tsx:15`)
- PDFs: "This statement documents approved payroll. It doesn’t confirm payment." (`src/lib/payroll/native/paystub-document.ts:488`, Spanish `:503`), drawn at 7.5pt in the footer (`:775`)
- Review detail: provisional-policy and "does not confirm payment or remittance" notes (`src/components/payroll/native-review.tsx:33-34`)
- Time exports: "your payroll system decides pay types" (`src/components/payroll-export.tsx:192`)
- Terms: "Your employer remains responsible for its employment decisions, payroll obligations and workplace rules." (`src/lib/legal/policies.ts:86`)
- User guides, outside the app: `docs/guides/web/owner.md:119-137`, `docs/guides/web/employee.md:96-100`
- None at Approve, on approved Payroll details, on Home, or on any Employee Pay screen. No plan or pricing copy in this repo mentions payroll; `/pages/plans` and `/pages/es-pago` are the Stripe billing page.

---

## B. Language table

Risk: None / Could mislead / Likely misleads. Suggested wording follows `docs/design/voice.md`.

| String (EN / ES) | Location | Surface, role | Risk | Why | Suggested wording |
|---|---|---|---|---|---|
| "Paid on" / "Pagado el" | `src/lib/payroll/native/paystub-document.ts:484,499`; used `:679` | Statement PDF, Employee | Likely misleads | States a payment date as fact; NEVORA only knows the scheduled payday | "Payday" / "Día de pago" |
| "You take home", "Take home" / "Recibes" | `paystub-document.ts:479,494` | Statement PDF, Employee | Likely misleads | Reads as money received | "Net pay" / "Pago neto" |
| "Taken from your pay and sent to the government for you." / "Se descuentan de tu pago y se envían al gobierno por ti." | `paystub-document.ts:481,496` | Statement PDF, Employee | Likely misleads | Asserts remittance NEVORA cannot know | "Taxes your employer withholds from your pay." / "Impuestos que tu patrono retiene de tu pago." |
| "Paid by your employer" / "Pagado por tu patrono"; "Your employer pays these on top of your wages." | `paystub-document.ts:483,498` | Statement PDF, Employee | Could mislead | "Paid" asserts payment | "Your employer’s contributions"; "Your employer owes these on top of your wages. They don’t come out of your pay." / "Aportaciones de tu patrono" |
| "This statement documents approved payroll. It doesn’t confirm payment." / "…No confirma el pago." | `paystub-document.ts:488,503` | Statement PDF footer | Could mislead | Right content, but small and contradicted by the lines above; silent on taxes | Next to net pay: "Calculated in NEVORA for {company}. Your employer pays you and sends taxes. This statement doesn’t confirm payment." / "Calculado en NEVORA para {empresa}. Tu patrono te paga y envía los impuestos. Este comprobante no confirma el pago." |
| "Publication does not confirm payment." / "Publicación no confirma pago." | `src/lib/payroll/documents.ts:226-227` | Import-mode statement PDF | None | Accurate; audit tone | "This statement doesn’t confirm payment." |
| "Net pay to your team" / "Pago neto a tu equipo" | `src/lib/payroll/native/company-summary-document.ts:32,43` | Company summary PDF, Owner | Could mislead | Reads as paid | "Net pay for this payroll" / "Pago neto de esta nómina" |
| "Employer contributions of $X are paid on top of gross pay."; "Paid by the company" / "Pagado por la empresa" | `company-summary-document.ts:32,35,43,46` | Company summary PDF | Could mislead | "Paid" | "…are owed on top of gross pay."; "Company contributions" / "Aportaciones de la empresa" |
| Spanish payday label "Pago" | `company-summary-document.ts:41` | Company summary PDF | Could mislead | "Pago 27 oct" reads as a payment | "Día de pago" |
| "Approve payroll" with "Approving locks the reviewed amounts, finalized time, settings and employee exceptions. If any of them change, review again." | `src/components/payroll/payroll-runs.tsx:385-386` | Review, Owner | Could mislead | Silent on what approval does not do, and on automatic sharing | Add: "Approving doesn’t pay anyone or send taxes. Pay statements are shared with each employee once they’re ready." |
| Step 3: "Approve payroll / Then share pay statements" | `payroll-runs.tsx:277` | Payroll home, Owner | Likely misleads (native) | Native statements share automatically (`worker.ts:121-122`) | Native: "Approve payroll / Statements are shared automatically. You pay your team outside NEVORA." |
| "Payroll approved" (card title and toast) | `payroll-runs.tsx:273`; `src/components/payroll/use-payroll.ts:74` | Owner | Could mislead | Workflow ends with no next step | Keep; add a "What’s next" card (PY-3) |
| "Adds up approved hours. Nothing is approved until you say so, and no money moves." | `payroll-runs.tsx:561` | Prepare, Owner | None | Good; reuse this pattern at Approve | — |
| "Prepare payment instructions / A file only. NEVORA doesn’t send money."; "File only · not sent to a bank" | `payroll-runs.tsx:378`; `document-row.tsx:15` | Owner, import mode | None | Clear | — |
| "{range} has no payroll … Its payday was {date}"; chip "Payday passed" | `payroll-runs.tsx:161,165,246,269-270` | Payroll home, Owner | Could mislead | Equates a NEVORA payroll with paying people | "Scheduled payday was {date}" |
| Page title "Pay history" for the list of payroll runs | `payroll-runs.tsx:117,283` | Owner | Could mislead | It lists approved calculations, not payments | "Payroll history" |
| "Net pay", "Net · Approved" on run rows | `payroll-runs.tsx:262,290,348` | Owner | None | Comment at `:48` shows "never Paid" was deliberate | — |
| "Fix this payroll / Starts a correction you approve separately"; "original statements stay in history" | `payroll-runs.tsx:363,376` | Corrections, Owner | Could mislead | Silent on settling any pay difference | Add: "If pay changes, settle the difference with the employee outside NEVORA." |
| "Statements not shared yet … shared with employees automatically once they are made and checked." | `payroll-runs.tsx:403` | Approved run, Owner | None | Accurate, but shown only after approval | Say it before approval too |
| "After you approve payroll, NEVORA makes and checks each pay statement, then publishes it to the employee. Approving doesn’t send any payment." | `src/components/payroll/payroll-settings.tsx:176` | Settings, Owner | None | Good; only in a collapsed settings row | Reuse at Approve |
| "Payroll setup / Wages, withholding and opening balances" | `payroll-settings.tsx:95` | Settings, Owner | Could mislead | Entering withholding certificates implies NEVORA handles withholding | Add: "NEVORA calculates withholding for the statement. You send taxes yourself." |
| Bank options "Popular Web Cash Manager · NACHA" and others; "Standard file · not yet tested with your bank" | `payroll-settings.tsx:186-188` | Settings, Owner, import mode | Could mislead | Naming a bank and NACHA implies that format; the output is neutral JSON | Remove the bank list or label it "Bank you plan to use (for your records)" |
| "Remitted by: Employer / Payroll provider" | `payroll-settings.tsx:208` | Rule editor, import mode | Could mislead | Remittance vocabulary for a record-only field | "Who sends it" with help "For your records. NEVORA doesn’t send payments." |
| "Provisional calculation policy … Choosing it doesn’t confirm that the payroll meets legal requirements." | `src/components/payroll/native-review.tsx:33` | People, inside two collapsed levels | Could mislead (placement) | The one calculation caveat is hidden | Show one line above Approve (PY-9) |
| "Federal employee tax collection … Collected minus exact … This does not confirm payment or remittance." | `native-review.tsx:34` | People detail, Owner | Could mislead | "Collection" and "Collected" imply money collected | "Calculated Social Security and Medicare withholding"; "Rounded minus exact" |
| "Documented regular PR taxable resident · standard FICA/SINOT"; "Law 17 §5(c) · fixed written authorization"; "I verified actual employer coverage, applicability, rates and supporting references." | `src/components/payroll/native-tax-fields.tsx:11,24,40,42` | Payroll setup, Owner | Could mislead | Statute citations and attestations read as legal validation | Counsel review; plain labels with the citation in Details |
| "The documented statutory weekly boundary is Monday 00:01 in Puerto Rico…"; "A change requires five Puerto Rico calendar days of advance notice." | `src/components/payroll/native-profile-editor.tsx:47,52` | Payroll setup, Owner | Could mislead | States a legal rule as fact | Counsel review; "Check this with your accountant or attorney." |
| "Ask the Owner to confirm the payroll rounding rules before approval." and similar | `src/components/payroll/workflow-status.ts:49,57,59-60` | Fix list, Owner and Manager | Likely misleads | The Owner has no screen that does this (PY-10) | Name a real next step, or "NEVORA can’t calculate this payroll yet. Contact support." |
| Raw codes such as `RULESET_NOT_APPLICABLE`, `BELOW_APPLICABLE_MINIMUM_WAGE` shown as card titles | fallback at `workflow-status.ts:63`; rendered `payroll-runs.tsx:483` | Fix list | Could mislead | Internal code shown to people | Map each one, for example "NEVORA can’t calculate paydays in 2027 yet." |
| "Payday is today / tomorrow / in N days"; "This pay period" | `src/components/employee-mobile/pay-corp.tsx:161-163` | Pay, Employee | Likely misleads | Promise from the schedule alone; says nothing of who pays | "Scheduled payday" with "Your employer pays you. NEVORA shows your pay statement." |
| "Next payday · Today"; "Last pay statement"; "Earlier pay"; "See all pay" | `src/components/employee-b/pay-b.tsx:135,147,151-152` | Pay (phone), Employee | Could mislead | "Pay" used for statements | "Next scheduled payday"; "Earlier statements"; "See all statements" |
| "Recent pay"; "See all pay" | `pay-corp.tsx:166-167` | Pay, Employee | Could mislead | Same | "Recent pay statements"; "See all statements" |
| "Next scheduled payday … From your workplace’s pay schedule. A statement appears here after payroll is published." | `src/components/employee-mobile/pay.tsx:115,119` | Pay (older phone view) | None | The best existing wording | Use on every Pay view |
| "Next payday" figure on Employee Home | `src/components/employee-b/home-b.tsx:80` | Home, Employee | Could mislead | Same promise | "Scheduled payday" |
| "Scheduled payday: {date} for {period}" | `src/app/app/my-time/page.tsx:39` | Time, Employee | None | Good | — |
| "Your statements appear here after your workplace publishes payroll." | `pay-corp.tsx:103`; `pay-b.tsx:75`; `pay.tsx:128` | Empty state, Employee | Could mislead | "Publishes payroll" is jargon; Owner side says "share" | "…after your employer shares them." |
| "A corrected statement replaced this one. Use the corrected statement for this period." | `pay-corp.tsx:125`; `pay-b.tsx:87`; `pay.tsx:98` | Correction, Employee | Could mislead | Silent on whether pay changes or whom to ask | Add: "If the amount differs from what you received, ask your manager." |
| "Shift, time off or pay / Ask your manager" | `src/app/app/help/page.tsx:60` | Help, Employee | None | The only in-app pointer for pay questions | Link it from Pay |
| Nav: "Payroll" (Owner), "My pay", "Pay" (Employee) | `src/lib/navigation.ts:71,213-214,258,271` | Navigation | Could mislead | "Payroll" commonly means paying and filing | Jose decision (PY-14); at minimum a subtitle "Calculate pay and share statements. You pay your team outside NEVORA." |
| "Sign in to see your schedule, time and pay." / "…tu horario, tus horas y tu pago."; preview "Next payday" / "Próximo pago" | `src/lib/auth-copy.ts:14,17,20,156,159,161` | Sign-in, everyone | Could mislead | "Pay" for statements | "…and pay statements" / "…y tus comprobantes de pago" |
| "Pay statement update / Open your current pay statement" | `src/lib/notification-inbox-view.ts:34`; `src/lib/notification-labels.ts:5` | Notifications, Employee | None | Accurate | — |
| "Your statement is ready" (key `PAYDAY_AVAILABLE`) | `src/lib/celebrations.ts:12` | Pay, Employee | None | Text is fine; the key and the rule "never for money, payroll" (`:3`) conflict | Rename the key |
| "Employees can see their pay" | `src/components/payroll/payroll-stepper.tsx:29` (imported only by its test) | Unused component | Could mislead if revived | "Pay" for statements | Delete, or "Employees can see their pay statements" |
| "Pay statements — Employees see their statements in NEVORA." | `src/lib/workspace-presentation/modules.ts:26-27` | Features, Owner | None | Accurate | — |
| "They preserve wage calculations, payment history and evidence for payroll questions or disputes." | `src/lib/legal/policies.ts:64` | Privacy Policy | Could mislead | NEVORA holds no payment history | "wage calculations, pay statements and evidence…" (counsel) |
| "Your employer remains responsible for its employment decisions, payroll obligations and workplace rules." | `src/lib/legal/policies.ts:86` | Terms | Could mislead by omission | No statement that NEVORA doesn’t pay, file or guarantee calculations | Counsel-drafted payroll scope clause (PY-12) |
| "Hours include breaks; your payroll system decides pay types."; "Handoff report saved. Provider import and payroll processing remain unverified." | `src/components/payroll-export.tsx:192`; `src/components/payroll-period-close.tsx:127` | Time exports | None | Clear on scope; second is audit-toned | "Saved. NEVORA can’t confirm your provider imported it." |
| "ADP RUN generic v1 · verify account template" | `src/components/payroll-export-mapping.tsx:30,35` | Export mapping | Could mislead | Names a provider; caveat is present | Keep the caveat next to the option |
| "Payroll readiness is unverified … an empty exception list does not establish correct pay." / Spanish equivalent | `src/components/owner-advisor/workflows.tsx:51`; prompt `src/lib/owner-advisor/loop.server.ts:48,72`; "Never guarantee … compliance" in the same file | Owner AI advisor | None | Well guarded; the advisor reads exceptions, never amounts | Plain-language pass only |
| "Comprobante de nómina" vs the glossary's "Comprobante de pago" | `paystub-document.ts:238,493`; `documents.ts:186`; glossary `docs/product/review-2026-11-10/reviews/copy-audit.md:313`; `src/app/app/billing/page.tsx:20` uses "comprobantes de pago" | Spanish PDFs | None (consistency) | Two Spanish names for one document | Pick one |
| Internal names visible in URLs: `?paycheck=`, `#unpaid-YYYY-MM-DD` | `pay-corp.tsx:32`; `pay-b.tsx:28`; `payroll-runs.tsx:170` | URLs | Could mislead (low) | "paycheck" and "unpaid" contradict the UI vocabulary | `?statement=`, `#period-…` |

**Vocabulary check against `docs/design/voice.md`**
- Voice asks for one word per concept and lists "pay statement". The app uses "pay", "pay statement", "statement" and "paycheck" (URL) for the same thing.
- "Share", "publish" and "publication" all name one action (`payroll-runs.tsx:37,390`; `use-payroll.ts:75`; `payroll-settings.tsx:176`).
- "Pay history" means payroll runs for the Owner and statements for the Employee.
- The "Truthful" rule ("Never imply a check, a publication or a count we didn’t confirm") is broken by "Paid on" and "sent to the government for you".
- `DESIGN.MD:1320` records payroll copy as locked, and the Nov 10 copy audit excluded payroll sentences (`copy-audit.md:346`). Jose must approve every change here.
- Payroll screens are English only by code reading; Spanish exists only in PDFs, sign-in, the advisor and billing.

---

## C. Findings

| ID | Finding | Type | Evidence | Affected role and workflow | Customer impact | Severity | Recommended improvement | Effort, dependencies | Owner | Already addressed? |
|---|---|---|---|---|---|---|---|---|---|---|
| PY-1 | The native engine calculates and prints PR income tax withholding, FICA, SINOT, employer contributions, net and year-to-date under a provisional policy with no accountant validation. This exceeds "calculate pay from approved time". | Design preference (scope decision) | `src/lib/payroll/native/calculate.ts:117-141`; `native/rules/pr-2026.ts:46-62`; `docs/payroll/owner-provisional-policy-20261014.md:3,43` | Owner (Review, Approve); Employee (statement) | A wrong withholding figure appears on an official-looking statement; the employer carries the penalty and NEVORA the blame | Release blocker for any customer with payroll on | Decide one: gross-only statements; taxes shown as "estimate" until validated; or CPA validation before release. Keep `NEVORA_PAYROLL_ENABLED` off for customers until decided. | L; CPA and counsel | Jose decision; Codex; counsel and CPA | Partly: `docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md:22`; `docs/payroll-engineering-review-disposition.md` ("internal statutory calculations … remain separate gates") |
| PY-2 | Statement and summary PDFs assert payment and remittance: "Paid on", "You take home", "sent to the government for you", "Paid by your employer", "Net pay to your team". The footer disclaimer contradicts them. | Observed defect | `src/lib/payroll/native/paystub-document.ts:479-488,494-503,679,775`; `native/company-summary-document.ts:30-49,137` | Employee (My pay PDF); Owner (summary) | An employee treats the statement as proof of payment and tax remittance; unpaid or underpaid staff blame NEVORA | Release blocker (with payroll on) | Reword per table B and move the disclaimer beside net pay. Issue as a new template version; issued statements keep their template. | S to M; Jose copy approval | Codex (template), Claude (wording), Jose; counsel review | Partly: `docs/handoffs/2026-11-02-pay-statement-v2.md:82` lists this copy review as open |
| PY-3 | Nothing after approval tells the Owner what is still theirs to do. The flow ends at "Payroll approved" and documents. | Observed defect | `src/components/payroll/payroll-runs.tsx:273-278,370-392`; `src/components/payroll/use-payroll.ts:74` | Owner (Approve, Payroll details, History) | The Owner assumes approval paid people or covered taxes; missed payday or missed deposits | High | A "What’s next" card on approved runs: pay each person their net pay; send withheld taxes and employer contributions; keep the summary for your accountant. One line under Approve. | S | Claude; Jose copy approval; counsel on the tax line | Partly: recommended in `docs/product/reviews/2026-11-01-upscale/business-and-product.md:91`, not built; `docs/guides/web/owner.md:119-137` says it outside the app |
| PY-4 | Approving a native payroll shares statements with employees automatically, but the UI says "Approve payroll / Then share pay statements" and the approve note doesn't mention it. | Observed defect | `src/lib/payroll/worker.ts:121-122`; `payroll-runs.tsx:277,341,386,388-391,403`; `src/components/payroll/payroll-settings.tsx:176` | Owner (Approve) | Statements reach employees before the Owner expects; a mistake is visible to staff at once | High | Say it at Approve. Jose decides whether native runs should get the manual share step import runs have. | S (copy); M (manual gate) | Claude; Codex if gated; Jose | No |
| PY-5 | Native runs have no export of calculated amounts. Payment export is refused, Time exports carry hours only, and the outputs are PDFs. | Proposed feature | `src/lib/payroll/payment-policy.ts:6`; `src/lib/payroll/service.ts:548-549`; `src/lib/payroll-export/model.ts:11` | Owner (after approval; accountant or provider handoff) | The Owner retypes net pay and withholding from a PDF; transcription errors | High | CSV of approved amounts per employee (gross, each tax, deductions, net, employer contributions), labelled "For your accountant or payroll provider. NEVORA doesn’t send it." | M | Codex (artifact), Claude (row); Jose | No (R13 covers refusal only) |
| PY-6 | Native payroll stops at the first payday in 2027 and shows the raw code `RULESET_NOT_APPLICABLE`. Today is Nov 14, 2026. | Observed defect | `native/calculate.ts:45`; `native/rules/pr-2026.ts:102-110`; fallback `src/components/payroll/workflow-status.ts:63` | Owner (Prepare, Fix) for periods paid in January 2027 | Payroll cannot be prepared at year end, with no warning | High; a blocker by late December for any live workspace | 2027 ruleset with the same validation question as PY-1; a plain message and advance notice | M to L; CPA input | Codex; Claude (message); Jose | Partly: flagged in `docs/product/code-inspection-2026-10-21/08-payroll-money.md` item 10; not fixed |
| PY-7 | Employee Pay and Home show "Payday is today" and "Next payday" from the schedule alone, never say the employer pays outside NEVORA, and give no guidance when a statement differs from what was received. | Observed defect | `src/components/employee-mobile/pay-corp.tsx:161-167`; `src/components/employee-b/pay-b.tsx:135-153`; `src/components/employee-b/home-b.tsx:80`; `src/app/app/my-pay/page.tsx:27-34` | Employee (Home, Pay, statement) | Employees expect money from NEVORA on that date and contact the wrong party when it is late or different | High | "Scheduled payday" everywhere, plus one line on Pay and on the statement page: "Your employer pays you. If the amount or date differs from what you received, ask your manager." | S | Claude; Jose copy approval; counsel on the discrepancy line | Partly: only in `docs/guides/web/employee.md:96-100` |
| PY-8 | Year-to-date and wage-base caps advance when a payroll is approved, not when it is paid. "This year" on statements assumes every approved payroll was paid as calculated. | Design preference | `service.ts:515-519`; `calculate.ts:144-148`; label "This year" at `paystub-document.ts:484` | Owner; Employee; accountant at year end | Statement year-to-date can differ from actual payments and the accountant's year-end forms | High | Label it "Year to date (approved payroll)" and tell the Owner to correct in NEVORA when actual pay differs | S (label); design question larger | Jose decision; Codex; Claude; CPA | No |
| PY-9 | The only calculation caveat is two collapsed levels deep on the People page. The Approve checkbox attests review only. | Observed defect | `src/components/payroll/native-review.tsx:32-33`; `payroll-runs.tsx:381,521-532` | Owner (Review, Approve) | The Owner approves tax figures believing NEVORA validated them | Medium | One visible line above Approve: "NEVORA calculated these amounts from your setup. Check withholding with your accountant." | S; depends on PY-1 | Claude; Jose; counsel | No |
| PY-10 | Fix cards tell people to "Ask the Owner to confirm the payroll rules", but no screen lets the Owner do it. New profiles save rounding as unverified and the form cannot choose the provisional policy. Unmapped codes show raw. | Observed defect (by code reading) | `src/components/payroll/native-profile-form.ts:42,46`; `src/lib/payroll/native/model.ts:118-119`; `workflow-status.ts:49,57,59-60,63`; `payroll-runs.tsx:457-458,485-487` | Owner and Manager (Fix before payroll) | A dead end: payroll stays blocked with an instruction nobody can follow | Medium; High if native payroll is offered to new companies | Decide how rules are confirmed (in-app step or support action) and word the card to match; map every code | M | Jose decision; Codex; Claude | No (`docs/product/review-2026-11-10/reviews/copy-audit.md:163` covers wording only) |
| PY-11 | Corrections show neither Owner nor Employee what changed, and say nothing about settling the difference. | Design preference | `payroll-runs.tsx:352-355,360-368,376`; `pay-corp.tsx:125-128`; `service.ts:441-450` | Owner (Fix this payroll); Employee (Replaced, Correction) | An under- or overpayment found by a correction is never settled, or the employee doesn't know to ask | Medium | Owner: "Net pay changed by $X for N people. Settle the difference outside NEVORA." Employee: one line pointing to their manager. | M (server delta) plus S (copy) | Codex; Claude | Partly: R13 refusal (`docs/handoffs/2026-11-11-r13-correction-payment-refusal.md`); Replaced and Correction chips (NV-082) |
| PY-12 | Terms and Privacy have no payroll scope clause, and Privacy says NEVORA preserves "payment history". The Owner-facing service agreement is not in the repo. | Observed defect (legal text) | `src/lib/legal/policies.ts:19,64-65,84-86` | Everyone (`/terms`, `/privacy`) | No written basis for "we calculate, you pay and file"; "payment history" overstates what is held | Medium | Counsel-drafted clause: calculates and documents; does not pay, withhold, remit or file; calculations depend on employer inputs; not tax or legal advice. Fix "payment history". | S; counsel | Jose; counsel; Claude | Partly: `docs/compliance/README.md:74-75` says payroll and legal wording needs Jose's approval |
| PY-13 | Payroll setup states legal rules and asks the Owner for attestations with statute citations (Law 17 §5, statutory workweek boundary, five-day notice, minimum-wage coverage). | Design preference | `src/components/payroll/native-tax-fields.tsx:11,20,24,40-42`; `src/components/payroll/native-profile-editor.tsx:23,35,47,52`; `src/components/payroll/native-opening-scope.tsx:18` | Owner (Payroll setup) | Reads as legal guidance from NEVORA; an Owner relies on it | Medium | Counsel reviews each legal statement; plain labels with citations in Details; "check with your accountant or attorney" | M; counsel | Jose; counsel; Claude | Partly: copy audit lists the screens (`copy-audit.md:163`) but marks payroll copy locked (`:346`) |
| PY-14 | The Owner feature is named "Payroll" with no scope line on its home; the industry meaning includes paying and filing. | Design preference | `src/lib/navigation.ts:213,271`; `src/app/app/payroll/page.tsx:4`; `payroll-runs.tsx:253,301` | Owner (navigation, Payroll home) | Expectation of a full payroll service from the first click | Medium | Keep the name and add a standing subtitle, or rename. Reword "has no payroll … its payday was". Don't build the planned red "Payday passed" tile (`docs/product/review-2026-11-11/backend-gaps.md:58`) with that wording. | S | Jose decision; Claude | No; the glossary fixes "Payroll (Owner)" (`copy-audit.md:314`) |
| PY-15 | Vocabulary is inconsistent across pay surfaces (see the vocabulary check in B). | Observed defect | `payroll-runs.tsx:37,117,390`; `use-payroll.ts:75`; `pay-corp.tsx:32,166`; `pay-b.tsx:152`; `paystub-document.ts:238,493`; `company-summary-document.ts:41` | Owner and Employee | Unclear whether "pay" means money or a document | Medium | One word each: pay statement; share; payroll history (Owner); pay statements (Employee); scheduled payday; one Spanish term | S (app); S to M (PDF template version) | Claude; Codex for PDFs; Jose | Partly: `copy-audit.md:206,313-315` |
| PY-16 | Payroll and Pay screens are English only, while statements can be Spanish. Any caveat added to the app would reach Spanish-reading employees only in English. | Proposed feature | No Spanish strings in `src/components/payroll/*`, `pay-corp.tsx`, `pay-b.tsx`; Spanish only at `paystub-document.ts:492-505` and `company-summary-document.ts:40-50` | Employee and Owner in Puerto Rico | The "your employer pays you" message doesn't reach the people who most need it | Medium | Spanish for Employee Pay first, then Owner payroll | M to L; app-wide language approach | Claude; Jose | Not found in the docs read |
| PY-17 | "Prepare payment instructions" is offered on approved import-mode corrections, where the server always refuses with the lower-cased code "correction payment export unavailable". | Observed defect | `payroll-runs.tsx:377-378`; `payment-policy.ts:7`; `src/lib/payroll/http.ts:80`; `src/components/payroll/api.ts:65-73` | Owner (legacy import corrections) | A confusing error on a money-adjacent action | Low | Hide the row for corrections and say why, as R13 asked | S | Claude | Partly: R13 handoff asks for exactly this |
| PY-18 | Import-mode settings name banks, NACHA and providers though the output is a neutral JSON and nothing is connected. Hidden when native is active. | Design preference | `payroll-settings.tsx:181-188,208` | Owner (Payroll settings, import mode) | Expectation of bank-ready files or provider integration | Low | Remove or relabel as "for your records" | S | Claude; Jose | Partly: notes at `payroll-settings.tsx:182,188` already disclaim |
| PY-19 | Small wording leaks: "Collected" for calculated withholding; unused stepper text "Employees can see their pay"; URLs `?paycheck=` and `#unpaid-`; celebration key `PAYDAY_AVAILABLE`. | Observed defect | `native-review.tsx:34`; `src/components/payroll/payroll-stepper.tsx:29`; `pay-corp.tsx:32`; `payroll-runs.tsx:170`; `src/lib/celebrations.ts:3,12` | Owner and Employee | Minor reinforcement of "NEVORA pays" | Low | Rename per table B; delete the unused stepper | S | Claude | Partly: `copy-audit.md:17` lists the stepper |
| PY-20 | The Owner AI advisor is well guarded on pay, but its legal-research tool returns extracts of labor-law sources inside a pay-adjacent product. | Design preference | `src/lib/owner-advisor/loop.server.ts:48,56,72`; `src/lib/owner-advisor/service.server.ts:99`; `src/lib/owner-advisor/legal-sources.ts:7-14`; `src/components/owner-advisor/workflows.tsx:51` | Owner (advisor) | Low risk of an Owner treating an extract as advice | Low | Counsel reviews the notice shown with legal research; no code change | S | Jose; counsel | Yes for pay claims; legal notice not separately reviewed in the docs read |
| PY-21 | Sign-in promises "pay": "Sign in to see your schedule, time and pay." with a "Next payday" preview. | Design preference | `src/lib/auth-copy.ts:14,17,20,156,159,161` | Everyone (sign-in) | Sets the "NEVORA handles my pay" frame before sign-in | Low | "…and pay statements"; "Scheduled payday" | S | Claude; Jose | No |

**Prior work with no scope-language coverage**: `docs/product/review-2026-11-11/README.md`, `PLAN.md` and `reviews/review-owner.md` are visual reviews; their payroll items (OW-005, OW-018, NV-006/007) concern layout. `backend-gaps.md` adds only the `payrollStatus` phone gap.

---

## D. Not verified from code reading

- Anything rendered: no screen, PDF or notification was seen. Placement and type-size claims (the 7.5pt footer, "two collapsed levels") come from code.
- Which mode runs in the development or production database: whether migration 0031 is applied, and whether any stored profile carries the provisional-policy reference. PY-10 rests on the UI form and validators; a script or direct API path may set it.
- The accuracy of the tax tables, caps and rates. I did not assess them and am not qualified to. The cited PR income tax source is Hacienda's 2017 tables, hash-pinned in code.
- Whether a meal-penalty premium exists outside the files read; none was found in `native/time.ts`.
- Marketing and plan copy: none in this repo mentions payroll. The public website and the Owner service agreement referred to in the Terms are outside it.
- Whether production shows the Terms and Privacy pages at all (`policiesVisible` hides them until every policy fact is filled).
- Payroll emails: none found; notifications are generic push text. Email templates outside `src/lib/auth` were not exhaustively read.
- Spanish coverage of the app shell: "English only" for payroll and Pay is from grep, not a full language audit.
- The exact message for every blocked-run code; only the map in `workflow-status.ts` and its fallback were read.
- Not read in full: `.omo/evidence/*`, `docs/plans/2026-10-12-configurable-payroll.md`, `src/lib/period-close/service.ts`, `native/recorded-source.server.ts`, `native/workweek-policy.ts`, and the review JSON files. The two Oct 12 payroll UI handoffs and `docs/payroll-exports-redesign.md` were skimmed by keyword.
- Licensing or regulatory status of calculating withholding, issuing statements or naming the feature "Payroll" in Puerto Rico. That is for counsel.
- No skills were loaded; suggested wording follows `docs/design/voice.md` and the Nov 10 glossary, and needs Jose's approval because payroll copy is locked.
