# Rondo company knowledge — Claude UI contract

Jose approved this local backend/schema/test slice November15,2026. Codex owns
the backend; Claude owns the screens. No UI layout/component was built here.
Development is the primary acceptance release, held to production standards;
main/production promotion requires Jose's approval. These are synthetic local
contracts, not a deployed feature or authority to upload customer documents.

## Product behavior

Current company-wide Owners share the company profile and library. Managers and
Employees have no access. Personal Rondo priorities, notes and memory remain
private per Owner. The profile describes the business, products/services, customer
commitments, procedures, objectives and escalation roles; canonical company name,
timezone, locations and enforced rules still come from NEVORA.

Use an explicit Draft → Review exact saved text → Publish for Rondo flow. Saving
an edit creates an immutable new draft; the last published version remains in
use until replacement publication or archival. Publishing a future-dated version
replaces the old active pointer immediately; the new text starts at its effective
date. Explain that gap in review rather than implying automatic scheduled fallback.
An effective end excludes the source; a review-due date only marks overdue review.

This version accepts pasted text or client-decoded UTF-8 `.txt`/`.md` text in JSON.
There is no binary upload, PDF, Word, Excel, OCR or remote URL import endpoint.
Render source text as text; do not execute HTML or Markdown embedded HTML.
For an in-app reader, fetch the JSON view and wrap long source/digest lines
(`pre-wrap` plus overflow wrapping). The raw plain-text route is a source payload
and browser viewers can scroll horizontally for long lines.
Show all size errors before publication. Never silently shorten text and label
it reviewed. Server normalization trims surrounding whitespace and converts CRLF
to LF; fetch the exact saved version for the publication review.

## Transport and examples

`GET /api/owner/advisor/knowledge` lists metadata, current revision and retained
nondeleted entries/versions. Required header: `x-nevora-company-knowledge: 1`.
It returns `{state:"ready",revision,entries:[{documentId,kind,archived,deleted,
publishedVersionId,versions:[{versionId,title,locale,category,sourceName,textDigest,
createdAt,publishedAt,effectiveFrom,effectiveUntil,reviewDue}]}]}`. Text is fetched
separately below. Metadata includes historical versions, not an assertion that
each version is active. Deleted entries are omitted.

All writes use `POST` to the same endpoint, same-origin `Origin`, JSON content type,
the intent header and current Owner session. No caller company/workspace/Owner ID
is accepted. Server generates document/version IDs. Generate a fresh UUIDv4
`requestId` once per deliberate operation; preserve it and the exact payload while
an outcome is uncertain. `expectedRevision` is the last observed knowledge revision.
The immutable receipt binds actor, session, company authority and payload hash.
Identical recovery returns the receipt; a changed body or session with that ID
conflicts. Refetch after a conflict and let the Owner review/reapply deliberately.
Do not turn an uncertain result into a fresh automatic write.

Synthetic new document:

```json
{
  "op": "draft_document",
  "requestId": "11111111-1111-4111-8111-111111111111",
  "expectedRevision": 0,
  "documentId": null,
  "title": "Fictional opening procedure",
  "locale": "en",
  "category": "operations",
  "sourceName": "opening.md",
  "body": "Verify the roster before opening.",
  "effectiveFrom": null,
  "effectiveUntil": null,
  "reviewDue": null
}
```

To edit, pass that document's ID and the latest revision with a new operation ID.
Categories: `operations`, `products`, `service`, `policy`, `other`; locale `en`/`es`.
Dates are explicit ISO instants with offsets, or null/omitted. Convert Owner-selected
local times using the canonical company timezone and show the resolved date/time.
Do not infer legal jurisdiction from timezone.

Profile draft:

```json
{
  "op": "draft_profile",
  "requestId": "22222222-2222-4222-8222-222222222222",
  "expectedRevision": 1,
  "locale": "es",
  "fields": {
    "businessDescription": "Panadería ficticia para pruebas.",
    "productsServices": "Pan y pedidos prepagados.",
    "customerCommitments": "Confirmar cambios con el cliente.",
    "operatingProcedures": "Comprobar la lista antes de abrir.",
    "objectives": "Priorizar pedidos confirmados.",
    "escalationRoles": "El Owner decide excepciones."
  }
}
```

Only `businessDescription` is required. Validity/review fields match documents.
There is one nondeleted profile entry; subsequent profile drafts version it.

Draft receipt: `{state:"draft_saved",operationId,documentId,versionId,textDigest,
revision,savedAt}`. Before publishing, fetch exact saved text and confirm the
digest shown in that response. Publication payload:

```json
{
  "op": "publish",
  "requestId": "33333333-3333-4333-8333-333333333333",
  "expectedRevision": 2,
  "documentId": "44444444-4444-4444-8444-444444444444",
  "versionId": "55555555-5555-4555-8555-555555555555",
  "reviewedTextDigest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

The example IDs/digest are placeholders; use the actual private receipt. A wrong
digest or previously published version conflicts. Publication receipt has state
`published`. Archive uses `{op:"archive",requestId,expectedRevision,documentId}`;
delete adds `op:"delete"` and `acknowledged:true`. Both return a content-free receipt
with the new revision. Archive preserves historical source access for Owners;
delete purges all versions' stored body/profile fields/title/filename and denies
version reads. Receipt IDs/digests and non-content audit metadata remain.

## Private citations and lifecycle

`GET /api/owner/advisor/knowledge/entries/{documentId}/versions/{versionId}` opens
an exact-version `text/plain` view through current Owner authentication. Normal
same-origin browser navigation needs no custom header. Cross-site fetch metadata
is denied. `Accept: application/json` returns the source object for an editor,
including `body`, `profileFields`, dates, digest and `current`/`archived` booleans.
`current` means the published pointer equals this version; also inspect effective
dates. Plain text labels draft/historical/current-pointer status. No arbitrary
remote URL or generic API path is accepted by the citation validator.

Responses are private/no-store, vary by Cookie, nosniff and no-referrer. The text
view's `X-Content-SHA256` identifies **source body text**, not the metadata-wrapped
HTTP response bytes. There are no public document URLs or share tokens.

Explain withdrawal accurately: it stops future Rondo use for every company Owner;
in-flight old answers are rejected and old completed IDs conflict. Later model
input and displayed current history omit turns with a different revision/source/
review-status fingerprint. Even saving a new draft retires prior current answers;
published text itself remains unchanged until publication. Review-due transitions
retire old answers without making overdue sources ineligible. Response validity
is capped at the nearest effective/review transition. Existing retained dated chat/request data may still contain excerpts
under the separate chat retention policy; document deletion is not chat erasure
and cannot recall content already transmitted to a model provider. Do not promise
provider-wide zero retention.

## Limits, errors and states

- Profile:16KiB rendered UTF-8; document:256KiB normalized UTF-8; title240bytes;
  filename120bytes. At most20 nondeleted documents plus one profile,100 retained
  text versions and10MiB of retained source-body text per company. Archive retains
  quota; delete frees retained text/document quota. Audit metadata is retained.
- Actual streamed JSON body max1MiB. Controls/lone Unicode surrogates, unknown keys,
  binary filenames and malformed validity intervals are rejected.
- `400 invalid`: fix input; `401`/`403 forbidden`: sign in/check Owner/company access;
  `409 conflict`: refetch and review; `429 limit`: retained quota reached;
  `503 unavailable`/`cancelled`: retain operation custody and recover deliberately.
  Missing schema is unavailable, never an empty successful library.
- Rondo retrieval: max6 knowledge sources/24KiB serialized excerpts across the
  whole investigation, often less with mixed evidence. At least two citation slots
  are reserved from document search for further operational reads. Partial excerpts,
  source/context limits, missing matches, and advisory overdue review are explicit.
  PostgreSQL simple token search has no semantic/embedding matching or guaranteed
  cross-language translation. Try concise relevant EN/ES terms; do not label a
  no-match result proof that no company policy exists.
- Knowledge-aware answers cap8 total citations. Source inspection found the current
  baseline already supports15 for its bounded operational period reads; that
  baseline remains intact. The approved design's description of a baseline8 limit
  was inaccurate. This slice enforces8 only for its knowledge-aware investigation.

Knowledge guidance is untrusted evidence and cannot rewrite enforced scheduling
rules, create employee consent or authorize actions. Contradictory published
documents remain separate sources for explicit Owner resolution. Model tools are
read-only. Existing exact scheduling-draft review/acknowledgment and separate
publication remain required; a knowledge Publish button grants no scheduling powers.

## Integration acceptance

`NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED=false` is the shipped default. CRUD does not
require model credentials. The integration owner must apply0064 on the explicitly
selected development database, join Claude's screens, verify actual private
navigation and all loading/empty/draft/published/conflict/quota/revoked/deleted
states, EN/ES copy, mobile and keyboard focus, and repeat current-source races
before enabling retrieval. A typed flag, local SQL success or model adapter test
does not establish deployment. No paid company-knowledge model cases were enrolled
or executed in this slice; offline scripted provider qualification is distinct.

Rollback: disable the adviser before reverting to source that lacks the fences or
dropping their columns. Preserve/resolve tagged history/request retention first.
Prefer keeping the additive schema and turning the knowledge flag off under the
new fenced code; old knowledge-tagged history/replays remain excluded. Never drop
the tags and then expose old retained excerpts through unfenced old source.
