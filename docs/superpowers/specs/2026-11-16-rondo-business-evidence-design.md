# Rondo business evidence: foundation, finance and sales

Status: approved by Jose on November16 for local backend/schema/tests; implementation not started.
Codex owns backend/hosting; Claude owns UI and preserves Jose's selected **B2**.
This is the first slice of user step4, not completion of that step or all eight.

## Intent and existing evidence

Rondo must base difficult management decisions on the company's actual records.
The50-case source map currently identifies38 questions with missing readers.
Finance is needed by29 questions and sales by19; customer commitments13,
suppliers9, inventory7, market evidence4, equipment4, security3 and safety3
remain separate domain work. No question has an independent score yet.

The current workforce and published-text tools cannot stand in for these records.
Existing service admission, immutable knowledge versions, source fences, bounded
model loops and exact weekly receipts supply patterns to reuse. Relevant source:
`src/lib/owner-advisor/{authority.server,store.server,company-knowledge.server,
weekly-context.server,weekly-store.server,service.server,tools.server}.ts` and
`docs/qa/rondo-owner-50-source-matrix.json`.

## Approach and scope

Jose selected **everything** when offered Owner imports versus direct connections:
support both. Imports alone exclude companies needing continuous records;
connector-only work depends on unidentified provider accounts. The selected mixed
approach uses one typed evidence contract for imports and read-only connectors.

Codex proposes finance and sales first because they have the largest dependency
counts. This order and the bounds below are implementation proposals, not earlier
Owner policy decisions. Other eight-step work remains visible in the roadmap.

This slice delivers the common backend, real Owner import/review/publication APIs,
two actual read-only model tools, deterministic reconciliations and fictional
fixtures. It defines a connector adapter contract. It does **not** claim any
named accounting/POS/bank integration works before that adapter, its actual
account/permissions and isolated development behavior are separately verified.
The builder can implement this slice without selecting a real account.

No payments, refunds, orders, payroll calculation, employment actions, messages,
background refresh, subscriptions or provider activation are added. Documents
remain guidance; a PDF or a company profile never becomes a bank balance.

## Company source and version model

A source belongs to the resolved company/workspace and has a domain, an opaque
source ID, origin (`OWNER_IMPORT` or an actual supported connector), provider
record namespace, timezone, declared coverage, freshness policy and revision.
Only a current company-wide Owner can create, stage, review, publish or withdraw.
Every request uses the existing company-bound executor and server admission;
browser/model-supplied workspace IDs or SQL are not accepted.

Stage immutable versions; never modify a published record in place. A version
contains a canonical digest, observed/imported time, coverage from/to, source-as-of
time, completeness declaration, source identity, typed rows and validation result.
Provider-attested coverage and Owner-reported completeness stay distinguishable.
Neither declaration proves that the underlying business facts are true.

Publication makes exactly one validated version per source/window eligible; a
source can have several active, nonoverlapping windows. January and February
remain queryable together. Correcting January replaces only its exact window,
using its expected prior version and the current source revision. An overlapping
window with different boundaries is rejected; initial imports must split it to
match existing windows rather than silently retire unrelated periods. Every
record keeps the external/import record ID and source revision. Same ID/revision
with different content is a conflict; exact duplicates within an import are
rejected with row numbers. Separate sources are not deduplicated by amount/date:
matching a sale to a bank entry requires an explicit common reference and is a
reconciliation relationship, not deletion of one record.

Initial imports are complete snapshots for one source/domain/declared window.
Reject overlapping active windows for the same source namespace instead of
silently double-counting. Replacing a window withdraws the prior version at the
same atomic publication point. Partial imports may be retained for inspection,
but cannot qualify a complete-window metric. Incremental provider pages must
finish the declared snapshot before becoming publishable; no page is a complete
connection on its own.

Withdrawal invalidates all live evidence fences immediately. Deletion wipes
retained source payloads and derived private material for that source, retaining
only content-free operation/tombstone custody. Historical version access remains
company-authorized before deletion; deleted content is not recoverable through a
citation. Chat/provider retention remains separate and must be explained.

### Reporting perimeter and duplicate economic facts

An Owner-reviewed, revisioned coverage map designates one primary source for
each domain/metric/account-or-location scope and window. Corroborating sources
stay separately queryable and are never added to primary totals. Reject
overlapping primary coverage, including a company-wide accounting sales source
plus a POS source for one of the same locations. Changing the map is an exact
reviewed publication and invalidates dependent answers.

Company queries select primary sources on the server from that map, not a model
list. A named-source inspection is explicitly a source subtotal. A requested
period total requires every necessary active window, with no gap or overlap.
Sales ALL scope checks all currently active company locations; an unmapped new
location makes that total unavailable. Finance uses the Owner-declared account
perimeter and labels it as such; it cannot discover or verify omitted accounts.
No tool labels a chosen subset as the independently verified whole business.

## Finance contract and calculations

One version has one currency and an explicit minor-unit scale supplied by its
schema. Monetary values are bounded signed decimal integer strings, processed
with exact integer arithmetic and PostgreSQL numeric values, never JS floats.
Reject unsupported currency/scale combinations; never sum different currencies
or infer an exchange rate. Initial supported currency/scale configuration is an
explicit server allowlist included in the implementation plan and fixtures.

Finance records cover:

- Balance anchors: account reference, as-of instant and reported opening/closing
  amount. Missing anchors mean cash balance is unknown, not zero.
- Cash movements: immutable ID/revision, account, occurred/posted instants,
  posted/pending/reversed state, signed cash delta and optional reconciliation
  reference. A correction is a new source revision, preserving provenance.
- Obligations and receivables: reference, amount, due date, state and source
  confirmation. Expected collection is not posted cash.

Return balances **as of the supplied records**, posted inflow/outflow and the
anchor-to-closing reconciliation difference. State separately which pending,
reversed, missing or inconsistent items were excluded. A cash scenario uses a
named starting anchor and explicitly selected obligations/collection assumptions;
it never represents expected collections as guaranteed funds. Profit, wage cost,
tax applicability and currency conversion stay unavailable without their own
approved sources/contracts. Existing external-payroll direction remains intact.

Shared company bank accounts remain company-level evidence. An account may be
declared exclusive to one location, but no transaction amount is allocated to a
location by inference. A selected-location query returns explicit unavailable
complete-location cash if shared accounts prevent allocation, while any exclusive
account subtotal stays labeled a subtotal. Allocation records and allocation
models are a later contract, not hidden arithmetic in this slice.

A reconciliation difference is a valid business finding, not a malformed row.
Owners may publish structurally valid records carrying
`RECONCILIATION_MISMATCH`; Rondo reports the reported closing balance, calculated
closing balance and difference with source citations. It must not call either
a verified available-cash value. Cash scenarios are unavailable for that
unreconciled window in this initial slice. Structurally invalid amounts or
inconsistent within-record breakdowns remain nonpublishable.

## Sales contract and calculations

Sales records keep source order/event IDs and revisions, location reference,
business date/instant, currency/scale, sale/refund/cancellation state and an
explicit breakdown of merchandise, discounts, tax and collected amounts. Fees
are separately typed; the parser verifies that the source breakdown reconciles.
The implementation plan fixes one canonical sign convention and arithmetic
equation before code/tests, with independent worked examples for refunds and
partial refunds. Do not infer net revenue from an ambiguous gross column.

Return reported sales, refunds, discounts, tax and collections by requested
period/location; preserve counts and exclusions. Missing product costs mean
margin/profit is unavailable. Missing traffic/history means demand forecasting
is unavailable. Sales and bank inflows stay distinct even when related.

Locations must map explicitly to current company locations; unmapped locations
remain an admission error, not an invisible dropped subset. Customers use opaque
references only; names, contact details, payment-card data and bank credentials
are outside this import schema.

## Import, review, API and recovery

Reuse the private same-origin/header/Owner boundary. Proposed commands are:
`stage_source_version`, `read_source_version`, `publish_source_version`,
`withdraw_source`, `delete_source`, and `check_source_operation`. List/read APIs
return only current company data with private no-store headers and short leases.
Exact keys are validated on the server; the model receives none of these writers.

The backend accepts canonical typed JSON. A bounded CSV mapping adapter produces
that same payload and row-numbered validation errors; it does not guess columns,
signs, currencies, dates or source completeness. Treat all cells as untrusted
data, never instructions. No spreadsheet formula is executed or exported as an
active formula. Claude receives the API contract for B2 import/review UI later.

Publishing requires a fresh complete-version read receipt, version digest,
expected source revision and explicit acknowledgement. The full exact version
is reviewable, including all validation/exclusion results. Publication is an
atomic pointer/revision change; failure leaves the previous active version.
Missing coverage or inconsistent within-record finance/sales equations cannot be
approved away. A valid cross-record bank reconciliation discrepancy remains
publishable with the finding and restrictions defined above.

Every write has a durable operation ID and canonical request hash, bound to the
company and initiating Owner. Same operation/different payload conflicts. A lost
reply is recovered by checking the original operation, not importing again.
Receipt visibility requires current company/Owner authority. A different Owner
can read shared source versions, but cannot adopt someone else's pending approval.

Proposed initial limits:512KiB actual decoded input,1000 rows per version,
20 active sources,20 uncommitted versions,200 retained versions and100,000 retained
rows per workspace;5-minute review receipts,15-second private read leases,
20-second request deadlines and1.5-second lock waits. Reject before mutation when
a complete snapshot exceeds limits; never silently truncate. These are explicit
pilot capacity limits, not claims to ingest every size of company. No automatic
deletion or paid quota increase. Bounds must be measured with maximum fixtures.

## Read-only tools and answer freshness

Add separate typed finance and sales queries using source IDs, date window and
ALL/SELECTED company locations. Schema fixes the available operations; there is
no SQL, arbitrary property path or vendor URL passthrough. Both tools use the
existing8-call/6-round/source-slot budgets. Each bounded projection includes exact
version citations, observed/as-of times, declared coverage, origin, completeness,
currency/units, exclusions and deterministic metric identities.

An aggregate is computed from the complete admitted scope. If the complete scope
cannot be read/calculated within bounds, return an explicit unavailable metric;
do not summarize a truncated row sample as the business total. More than one
currency yields separate results, never an invented combined amount.

Current-versus-historical use is explicit. A historical period may be inspected
with its as-of qualification. A current-state question cannot use expired source
freshness or an incomplete requested window as current evidence. Freshness policy
is part of the published source revision and answer fence, not model discretion.

Extend typed decision evidence to bind returned finance/sales metrics to actual
tool occurrence, source version, period, location scope, units and currency. The
model explains the calculations and alternatives; it supplies no trusted amounts.
Maintain source/authority/version/freshness fences for every observed business
tool through final settlement and request replay. Do not re-import to revalidate
an answer. Source-derived turns stay out of reusable ordinary history, preserving
prior unrelated history; the original answer stays behind its fenced receipt.

Both import availability and model retrieval are separate default-off flags under
the parent Owner-adviser gate. No model/provider key is needed to maintain/import
records. Turning retrieval off denies new use while retaining authorized minimal
operation recovery. A configured adapter is not evidence of authentication,
refresh, completeness or accepted deployment.

Every aggregate and decision fence binds all contributing source/window
versions plus the coverage-map revision. Replacing one historical window or
changing which source is primary invalidates affected results without deleting
unrelated active windows.

## Connector contract and remaining domains

An adapter is server-owned and read-only, accepts an approved development secret
reference plus explicit source/account scope, and returns the identical typed
version. Record cursor, source revision, observed time and completeness; handle
pagination, rate limits, duplicates, refunds, outages and revoked access without
publishing a partial snapshot. Secrets never enter prompts, stored rows, citations
or logs. No generic credential/URL input executes network calls.

Provider-specific adapters, credentials and scheduled refresh require their own
concrete account/source review and acceptance. Future inventory, suppliers,
commitments, market/equipment/safety/security domains reuse custody interfaces,
but each needs its own typed facts and reader design. This slice does not mark
those missing readers complete.

## Verification, rollout and completion

Use fictional owned loopback fixtures. Independent arithmetic examples must
cover two locations, partial refunds, fees, mixed currencies, missing anchors,
duplicate/revised records, inconsistent windows and changed objectives. Add
cross-company/Owner denial, stale publication, source deletion, concurrent
publish/withdraw, quota/input/UTF-8 bounds, incomplete pagination, lost replies
and source-withdrawal-during-answer races. Test actual service/tool/API/SQL paths;
scripted protocol tests do not qualify actual-model reasoning.

Before merging, reconcile current development and reserve the next migration in
the canonical append order; do not assume the next numeric filename is free.
Keep the verified weekly candidate recoverable and preserve active worktrees.
Run impacted suites, boundary inventory, type/lint/build/manual qualification.
Claude receives exact DTOs, errors, leases and recovery fixtures for B2 UI.

Local completion means the two readers return correct, source-fenced results on
real synthetic service/API paths and no external action is created. It does not
mean named connectors, hosted acceptance, all38 source gaps or any10/10 model
score are complete. Actual model evaluation uses separately approved enrollment,
credentials and funding. No new spend, customer access, shared push, deployment
or main/production promotion is authorized by this proposed design.

## Fresh builder check and Codex proposals

A fresh read-only builder raised four planning questions. This revision resolves
them as explicit Codex proposals for Owner approval: multiple nonoverlapping
published windows with exact-window correction; a reviewed primary/corroborating
coverage map; no inferred allocation of shared accounts; and publication of valid
reconciliation discrepancies while refusing verified-cash/scenario claims.
These choices add no external action or spending. Actual providers/accounts
remain outside this slice's implementation/activation approval.
