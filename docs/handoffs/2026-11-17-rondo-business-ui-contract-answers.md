# Rondo business evidence: answers 2–9 for Claude

Date: November 17, 2026. Backend follow-up to Claude's November 16 B2 plan.
Base: freshly fetched Development `e8181384fc98d3c0edd988ae1cfc04819f63d2ee`.
Codex owns this backend/contract follow-up; Claude owns the business page, answer
card, navigation and their UI acceptance. Question 1's citation/parser correction
is already in the base. No UI component, migration, flag default, hosted service,
provider activation, customer data or main/production change is included here.

Development is Jose's primary operating/acceptance release, held to production
standards. Promotion of the exact verified release to main/production requires
his separate approval. Development publication is authorized for this follow-up;
its exact commit and CI result are recorded in Jira and the completion handoff.

## 2. Location names — use the authorized catalog

`BusinessCatalog` now includes `activeLocations: { id: string; name: string }[]`.
It retains `activeLocationIds: string[]` for compatibility. The two are in the
same ID order, contain only this workplace's active locations and are read under
the current Company Owner authority. Display the name as text, send its ID in
sales rows, CSV constants, map cells, account ownership and SELECTED scope.
A renamed location invalidates an in-flight catalog observation; refresh instead
of combining a new label with an old authorization observation. Treat all names
as untrusted text. Do not fetch a second, differently scoped location list.

Catalog GET requires the imports flag. Retrieval-only access does not grant a
maintenance catalog. Minimized internal reads omit both ID and name lists.
Both child flags off never exposes a catalog, including locations (see 8).

## 3. Review expiry — use the returned SQL time

Full `read_source_version` / `read_coverage_map` responses return both:

```ts
readReceiptId: string;
readReceiptExpiresAt: string; // canonical UTC ISO instant from persisted SQL expiry
```

Other responses carry **both fields as null**, including operation recovery and
inert citation text. Five minutes is a maximum, not a promised lifetime. SQL uses
the earlier of five minutes and current context validity. Do not compute
`observedAt + 5 minutes`. A receipt can become invalid before its expiry if the
session, authority, source, map, location perimeter or context changes.

`validForMs` remains the separate response privacy/authority observation lease,
never more than 15 seconds. Preserve the existing privacy fences: do not keep
rendering private rows for five minutes merely because publication's receipt has
not expired. Account conservatively for response transit time and local elapsed
time; a wall-clock comparison alone is insufficient. Re-read when observation or
review permission is no longer current, reset the acknowledgement for new content,
and use the new receipt, digest and revision. The server remains authoritative.

## 4. Exact revision/digest pairing

Never substitute `catalog.revision` or `evidenceRevision` for these expectations.
Use current values from the same review/catalog observation; a conflict requires
a fresh read and a new decision, not an automatically rewritten acknowledgement.

| Command | expectedRevision | digest / review handle |
| --- | --- | --- |
| Stage a new source | `input.source.expectedRevision = 0`, `sourceId = null` | No caller digest; server normalizes and hashes records |
| Stage an existing source | Latest `catalog.sources[].revision` in `input.source.expectedRevision` | No caller digest |
| Publish source version | Full source read's `receipt.revision` (current **source** revision) | That read's `version.digest` and `readReceiptId` |
| Discard source version | Current source revision; the full read's `receipt.revision` if still current | Target `version.digest`; no review handle field |
| Withdraw source | Latest catalog source's `revision` | Same source's `scopeDigest`; no review handle field |
| Delete source | Latest catalog source's `revision` | Same source's `scopeDigest`; no review handle field |
| Stage coverage map | Latest `catalog.mapRevision` (0 before any map) in `map.expectedRevision` | No caller digest |
| Publish coverage map | Full map read's `receipt.revision` (current **map** revision) | That read's `map.digest` and `readReceiptId` |
| Discard coverage map | Current map revision; full map read's `receipt.revision` if still current | Target `map.digest`; no review handle field |

The six publish/discard/withdraw/delete commands also require explicit
`acknowledged: true`. Read/check/query commands have no expectedRevision/digest.
A staged input's expectedRevision records the **pre-stage** expectation: it is
not the current revision for publication. For example, an empty map staged at 0
is reviewed at revision 1, and publication expects 1, not `map.input.expectedRevision`.
The same principle applies to a new source. A receipt's revision has the meaning
of its command; do not reuse a receipt from an unrelated command.

Retries after uncertain delivery keep the original requestId and exact command,
including the original expectations. Do not update its revision or digest on retry.

## 5–6. Closed copy codes and error envelope

Import only client-safe exports from
`@/lib/owner-advisor/business/contracts`:

```ts
BUSINESS_FINDING_CODES;       // BusinessFindingCode
BUSINESS_QUALIFIER_CODES;     // BusinessQualifierCode
BUSINESS_UNAVAILABLE_CODES;   // BusinessUnavailable
BUSINESS_SCENARIO_UNAVAILABLE_CODES; // BusinessScenarioUnavailable
BUSINESS_VALIDATION_CODES;    // BusinessValidationCode
BUSINESS_VALIDATION_FIELDS;   // BusinessValidationField
BUSINESS_ERROR_CODES;         // BusinessErrorCode
isBusinessErrorResult;        // strict runtime guard for unknown HTTP JSON
```

The `as const` arrays are the exhaustive source for reviewed EN/ES copy. Their
unions now type the calculation findings, qualifiers and safe validation producers.
Keep unavailable-reason, finding, qualifier, validation and transport copy separate.
Unknown codes must produce a safe unavailable state, never an invented translation
or a successful zero. No server-only imports belong in a client bundle.

```ts
type BusinessErrorResult = {
  state: 'error';
  code: 'forbidden' | 'invalid' | 'conflict' | 'limit' |
        'unavailable' | 'cancelled' | 'disabled' | 'busy';
  detail?: {
    code: BusinessValidationCode;
    field: BusinessValidationField | null;
    row: number | null;
    line: number | null;
  };
};
```

Rows/lines are positive one-based positions when supplied; null means unspecified.
CSV row includes the header (first data row is 2); line is the physical CSV line,
which can differ for quoted multiline records. JSON duplicate rows are one-based
record positions. Never print the rejected value, raw upstream message or stack.
Unknown internal field text is reduced to null. `isBusinessErrorResult` rejects
unknown codes/fields, extra fields and invalid positions. HTTP status: forbidden
401/403; invalid 400/405; conflict 409; limit 429; remaining codes 503. A streamed
body-size boundary refusal is 400/invalid, while a parsed input limit is 429/limit.
No business-route error exposes generic model/provider codes.

## 7. Pending operation storage — proposal accepted

Keep financial payloads, mapped rows, full commands, query results and review
handles **in memory only**. SessionStorage may hold only content-free recovery
metadata: `{ operationId, op, sourceId?, versionId? }` (and `mapVersionId?` when
needed), bound to the current workplace, Owner and session. Validate stored JSON,
bound its size/count and clear it on sign-out/identity/workplace/session changes.
No names, amounts, source contents or acknowledgement bodies in browser storage.
These identifiers are not credentials and never authorize a write.

After a reload, call `check_source_operation` with a fresh requestId and the
original operationId. It requires current Owner/parent authority. A completed
operation returns its content-free receipt. `not_saved` means **no completed
receipt observed**, not proof that an in-flight request cannot still commit.
A failed/forbidden recovery is also not proof of failure. Show “Not confirmed yet”
and retain the original identity for another authorized check.

Exact original-command retry is possible only while the exact payload remains in
memory. If reload lost it, do not mint a replacement or reconstruct a supposedly
identical write from new form values. Check the original identity, reconcile the
current catalog after authorization, and keep uncertainty visible. Scope changes
can make recovery unavailable; do not promise recovery under a different Owner or
session. A changed command with the same requestId conflicts.

## 8. Route, flags and ownership — proposal accepted

Claude owns `/app/ai-manager/business`, its `page.tsx`, Rondo navigation entry and
answer evidence card. Follow the existing weekly/knowledge route assembly with
`readFeatureFlags(process.env)`, `ownerAdvisor`, `ownerAdvisorBusinessImports` and
`ownerAdvisorBusinessRetrieval`. Enforce current Company Owner access on the
server as well as the API. No SSR data that the corresponding API would refuse.

| Parent / child flags | Allowed experience |
| --- | --- |
| Parent off, or actor is not an authorized current Company Owner | No business access |
| Parent on, imports on | Maintenance catalog, stage/review/publish and authorized queries |
| Parent on, retrieval on, imports off | Query/current eligible published citations; no catalog/drafts/maintenance |
| Parent on, both children off | Original-operation minimal recovery only; no catalog/records/evidence |

Preserve the pending recovery entry when maintenance is disabled. Do not present
“empty library” for unavailable/disabled access. Either child permits eligible
current published citation reads; only retrieval enables model business tools.
Flags still default false; this follow-up does not activate them anywhere.

## 9. Acknowledgement — exact action, accessible complete review

A publish acknowledgement means: the Owner reviewed the provided complete bounded
records, scope, exclusions, findings and qualifiers, and explicitly authorizes
publication of **that exact version/map** for Rondo. Completeness and account
perimeter remain Owner reports; this is not independent verification, an audit,
accountant approval, proof that no accounts are omitted, or cash clearance.

Up to 1,000 records may be paged, scrolled or virtualized, provided the full bounded
response has loaded, the total is clear and every row plus all findings is
reachable before publication. Do not hide truncation or enable Publish from a
summary, inert citation or partial load. The backend receipt proves delivery of a
full packet under authority; it does not prove the human read every row. Do not
claim that stronger guarantee in copy or telemetry.

Reset consent when reviewed identity/content changes. A fresh explicit action is
needed for each publication. Discard, withdrawal and deletion need their own
consequence-specific confirmation; never reuse publication consent. Deletion
irreversibly erases local imported source contents and retires dependent evidence;
it does not promise deletion of ordinary chat/provider prose or external records.

## Evidence and Claude's next step

New regression cases were observed failing before the backend correction. All
checks use fictional data and owned loopback PostgreSQL, with no model spending,
external messages or customer access. Detailed final checks accompany the verified
Development SHA in Jira/completion. No migration is required.

Claude can build the page/card against the qualified Development commit, preserve
question 1's parser correction, cover EN/ES and mobile/keyboard states, and return
an exact reviewed UI commit for combined API/browser acceptance. Existing evidence
of backend and transport behavior is not acceptance of a page that is not built.
