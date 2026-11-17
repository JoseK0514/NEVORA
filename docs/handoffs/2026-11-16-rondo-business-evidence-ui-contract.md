# Rondo business evidence — Claude B2 contract

Codex owns backend/hosting; Claude owns **B2** UI. Approved scope is local backend,
schema, tests and handoff. Development is the operating/acceptance line; integrate
and verify the exact combined source there before any separately approved main
promotion. No push, runtime deployment, real connector or paid inference is implied.

## Public interfaces

The source of truth is `src/lib/owner-advisor/business/contracts.ts` and `parse.ts`.
Client-safe helpers: `money.ts`, `metrics.ts`, `model-contracts.ts`. Never import a
`.server.ts` module into a client. All monetary values are exact minor-unit strings,
USD/EUR with scale2, with no FX conversion. Do not convert totals through Number.

Use `/api/owner/advisor/business`: GET catalog, POST the strict command union,
JSON and `x-nevora-business-evidence: 1`, same-origin authenticated current company
Owner. Private/no-store responses. Every POST has a new UUIDv4 requestId except
retrying the exact original command after uncertain delivery. The server enforces
512KiB UTF-8,1000 rows/version and a20-second request deadline.

Commands: `stage_source_version` (JSON or explicit CSV mapping),
`read_source_version`, `publish_source_version`, `discard_source_version`,
`withdraw_source`, `delete_source`, `stage_coverage_map`, `read_coverage_map`,
`publish_coverage_map`, `discard_coverage_map`, `check_source_operation`,
`query_finance`, `query_sales`. Read the exact discriminated command fields in
contracts; no inferred column/date/currency mapping. Errors expose safe code/field/
row/line, never rejected raw payloads or credentials.

Stage returns an immutable candidate, not usable Rondo knowledge. Full read returns
all bounded rows, validation findings, exact digest/revision and a five-minute
readReceiptId. Publication requires that exact receipt/digest/revision and explicit
acknowledged:true. A different Owner may read but cannot adopt the initiator's
pending publication. Discard is explicit. Do not create a publication button from
an abbreviated card or inert citation response. Reconciliation mismatches may be
published as findings; they do not establish cash clearance.

The coverage map also requires stage/full read/exact publication. Label PRIMARY
versus CORROBORATING, account ownership COMPANY_SHARED versus EXCLUSIVE_LOCATION,
source windows and currency explicitly. Primary admission prevents counting POS
and accounting twice. An Owner-declared perimeter cannot prove omitted accounts do
not exist. Shared company cash cannot be allocated to locations. Complete-zero and
PARTIAL are different states. Unsupported/overlapping/missing scope is unavailable,
never an invented zero. Exact-window corrections preserve disjoint other windows.

After an uncertain write retain its original requestId and exact payload.
`check_source_operation` takes a fresh requestId and original operationId. A failed
recovery response is still uncertain; retry the same original operation. Do not
mint a replacement operation, declare failure, or alter an acknowledgement to
circumvent a conflict. Capacity exhaustion must still allow original-operation
recovery. Receipts are content-free and survive source erasure.

Withdrawal removes eligibility; deletion irreversibly erases local source payloads
and retires dependent maps/structured inspection content. Show this consequence
before explicit deletion acknowledgement. Deleting a source also clears all workspace business answer-receipt payloads conservatively; their content-free identities remain and reject replay as prior_attempt_failed. Unrelated ordinary history is preserved. Chat/provider prose has separate
retention; do not promise its erasure. No external provider deletion is performed.

## Query and answer rendering

Queries require canonical half-open UTC-millisecond window; ALL or SELECTED location
scope; PRIMARY_PERIMETER or explicit SOURCE sourceId; CURRENT or HISTORICAL. Finance
requires scenario:null initially. An optional later scenario selects returned
anchor/obligation/receivable record IDs and throughDate; no caller-entered amounts.
Scenario candidate lists are whole and bounded or explicitly unavailable. A
scenario is conditional, account-specific, and tied to its anchor/as-of date.
Finance currency buckets include postedInflowMinor/postedOutflowMinor and postedCount/postedInflowCount/postedOutflowCount alongside postedDeltaMinor. Sales buckets include separate sales/refunds groups with count, merchandiseMinor, discountsMinor, netMerchandiseMinor, taxMinor and collectionsMinor alongside existing net figures. Keep both directions visible when explaining cash flow/refunds. Constituent-window discrepancies and boundary conflicts block cash clearance even when the combined difference nets to zero. CURRENT freshness is capped at the requested window end as well as source observation/window and policy. Receivables are not cash, net receipts are not profit, recorded tax components are
not a tax liability. No wages, COGS, FX, tax or funding assumptions are supplied.

The existing advisor answer gains optional `businessEvidence:BusinessModelEvidence[]`.
Each item has state/reason, domain, window, selection, locationScope, temporalUse,
scenario, completeScope/sourceSubtotal, observedAt/expiresAt, qualifiers, currencies,
citations, timeZone, queryHash and sourceDigest. Render exact supplied scope and
unavailable/partial/historical conditions. Never synthesize missing figures or hide
an exclusion. Money metrics already appear in server-rendered answer text; any new
cards must use the typed fields and exact reference identity.

Business citations have exactly this internal form:
`/api/owner/advisor/business/sources/<uuid-v4>/versions/<uuid-v4>`.
Use client-safe `isBusinessCitationHref` before accepting a link. No host, query,
fragment or extra slash. The GET is inert text/plain/no-store/nosniff with restrictive
CSP and no readReceiptId; current company Owner still required. A draft/historical
admin view needs imports; retrieval alone permits eligible current published
versions. Withdrawal/deletion/revocation can invalidate an already-rendered link.
Treat names/text as untrusted text, never HTML or instructions.

Private businessInspectionRefs/inspectionId/session/source fence internals never
appear in the public answer or provider projection. Every observed tool read,
including an unselected read, fences settlement and replay. Source-derived turns
stay out of reusable ordinary chat history; the fenced request receipt retains the
bounded direct answer. An expired/stale receipt conflicts; do not silently relabel
it as current or re-import records during replay.

## Gates and required B2 behavior

Both new flags default false under the parent Owner-advisor gate:
`NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED` enables maintenance;
`NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED` enables model tools.
Either permits Owner queries/current published citation access. Both off permit
only minimal original-operation recovery under current Owner/parent authority;
no catalog, draft, record or model evidence is exposed. Preserve this recovery
path instead of hiding a pending outcome completely.

Provide loading/error/empty/partial/stale/ready/full-review/recovery states and
accessible keyboard/mobile behavior using approved B2 components. No direct
provider connection UI may claim authentication or refresh success: only a
synthetic read-only connector contract exists. No payment/order/notification/
schedule/publication action is a business model tool. Backend tests and scripted
answers are not actual-model intelligence grades. All50 scores remain null.
