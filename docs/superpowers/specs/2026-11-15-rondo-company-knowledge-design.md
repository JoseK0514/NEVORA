# Rondo company profile and document library

Jose approved this concrete text-first local backend/schema/test design in this
chat on November15,2026, after selecting the Owner-managed profile/library approach.
No repeated design approval is required for its bounded implementation.

## Intent and selected approach

Jose selected an **Owner-managed company profile and document library** as the
first source of business knowledge beyond NEVORA's workforce records. Rondo should
connect the company's objectives and operating knowledge to current canonical
records, prepare useful decisions and wait for management approval of changes.

Build a private, versioned knowledge store inside the existing NEVORA backend.
Reuse Owner/company admission, mutation proofs, immutable operation receipts,
revision fences and the current model/tool boundary. No separate vector database,
embedding service or new paid subscription. Existing company-policy settings stay
the enforced rule source; uploaded prose cannot change scheduling/payroll rules.
External sales/inventory/finance integrations follow after this foundation.

## First usable backend slice

1. **Company profile:** Owner-authored business description, products/services,
   customer commitments, normal operating procedures, management objectives and
   escalation contacts/roles. This is a workspace-shared, versioned profile with
   its own draft/publish lifecycle and an immutable digest of the reviewed text;
   it is separate from per-Owner private priorities and memory.
   Canonical company identity/timezone/locations remain
   sourced from NEVORA. Editable descriptions do not replace those records.
2. **Document library:** titles, language EN/ES, category, source filename/hash,
   effective/review dates and versioned text. Drafts are excluded from Rondo.
   An Owner reviews the exact text and explicitly publishes it for Rondo; edits
   create a new draft/version, never silently change an approved version.
3. **First-slice formats:** pasted text and UTF-8 TXT/Markdown, with Owner review
   before publication. The backend stores versioned approved text and provenance,
   not original binary files. PDF/Word/Excel/OCR ingestion follows as a separate
   adapter once bounded processing and hosting isolation are verified. PDF.js is
   a possible local extractor, not an installed or qualified feature. Do not expose
   a PDF upload control or imply PDF support from this text-first API.
4. **Lifecycle:** draft, published, archived; replacement/archival immediately
   removes the old source from future inference. Owner deletion purges stored
   document text while keeping only a non-content audit receipt. Historical chat
   retention is separate and must remain explicit. Revision-tag dependent answers
   and histories for **every workspace Owner**, not just the editor. Old turns may
   remain dated historical messages under the existing retention policy, but are
   excluded from new model input; stale completed request IDs conflict rather than
   replay a withdrawn source as current. Deleting local text cannot recall excerpts
   already transmitted to a provider. The UI contract must explain these effects.

## Authority, custody and limits

- Current company-wide OWNER authority is required for every read and write,
  with fresh server checks across awaits and in the transaction. Knowledge is
  workspace-owned and shared only with currently admitted Owners of that workspace.
  No new Manager/Employee access or general autonomous executor is created.
- Same-origin authenticated JSON/streaming upload endpoints, bounded bodies,
  private no-store responses, server-generated identifiers and safe text rendering.
  Caller workspace IDs, filenames and model tools never grant access or choose paths.
- Writes bind operation ID, normalized payload hash and expected knowledge revision.
  Concurrent edits conflict; identical replay recovers the original receipt; changed
  payload with the same ID conflicts. No blind retry after an uncertain result.
- Initial limits: profile16KiB UTF-8; uploaded UTF-8 text256KiB per version;
  20 documents,100 retained versions and10MiB total stored
  knowledge text per workspace. Enforce storage quotas atomically, including
  concurrent uploads. Never silently truncate and call a document fully reviewed.
- No raw upload/body/key logs. Future binary extraction must use a credential-free
  bounded worker with verified filesystem/egress isolation, bounded concurrent jobs
  and cleanup on every exit; spawning a child alone does not prove isolation.
- No real customer document is used during development. No hosted migration,
  shared secret change, production activation or ongoing model spending is implied.

## Rondo retrieval and factual boundaries

- Read current approved company profile for a question and expose an allowlisted
  `company_knowledge` read for relevant published documents. Use PostgreSQL text
  search and stable deterministic bounds before considering embeddings.
- Return at most6 knowledge sources/24KiB combined **across the whole investigation**,
  including the profile, with source/version IDs, publication and
  review/effective dates, completeness and missing-source status. Show excerpt
  limits honestly. Distinguish effective-from/through validity from advisory review-due
  dates. Future/expired/archived/draft content is unavailable for current-policy claims;
  overdue review is identified, not silently reinterpreted as expiry. Conflicting
  sources remain a visible conflict.
- Citations resolve to authenticated exact-version text endpoints. Extend the
  shared citation validator only for those concrete routes, preserving rejection
  of arbitrary URLs or identifiers. Claude can build the document UI on this API.
- Snapshot knowledge revision and active-version/time eligibility used by inference.
  Under a shared workspace lock, recheck both on settlement and replay; replacement,
  archival, deletion, expiry or authority loss invalidates the result, including
  expiry without a database mutation. Knowledge writers take the conflicting lock.
- Fit mixed workforce/knowledge sources to the client's existing eight-source
  final-answer limit; reserve current operational citations and explicitly return
  a source-limit/partial result when the remaining budget is insufficient. Never
  silently admit more citations or drop evidence required by a reviewed decision.
- Text is untrusted business evidence, never a system instruction. An uploaded
  handbook cannot override enforced rules, authorize a write, reveal another
  company, grant legal/financial clearance or make unconnected systems current.
- Do not automatically save inferred beliefs as company facts. Distinguish Owner
  statements, published company guidance and current operational records.
- Keep the existing exact draft approval, publication boundary, model budget,
  expiry, cancellation, retention and failure controls. Library CRUD remains
  available independently of model-key/grant expiry.

## Implementation and ownership

Add one ordered, reversible development migration and a focused knowledge
model/store/service/ingestion layer with private API handlers. The existing Owner
adviser gets read-only retrieval and revision-fenced context. Codex owns this
backend; Claude owns the profile/library screens and displayed approval controls.
Provide an executable API contract and synthetic examples before UI integration.
Keep shared development untouched until the integration owner assembles source.

## Acceptance

Prove profile/document CRUD, publication/version isolation, expiry and conflicts;
cross-workspace/role/session denial; authority revocation during upload/extraction;
quota races; exact replay and rollback; source deletion during inference;
prompt injection and contradictory guidance; UTF-8 validation and upload limits;
private exact-version citations; EN/ES retrieval; unavailable-model CRUD; and
unchanged scheduling authority. Real owned PostgreSQL and synthetic files provide
the evidence. Scripted retrieval tests and actual-model semantic tests are distinct.
Company-knowledge model cases are not currently enrolled by the comparison guard.
Qualify this slice offline first; live work needs explicit case enrollment under
verified scope and remaining allowance, or a concrete additional cap if required.
No new spending is inferred from an unused balance.

The deliverable is a tested backend candidate plus Claude's UI contract. A complete
customer-facing library requires the integrated UI, exact development source and
hosted acceptance. Broader sales/banking/inventory knowledge requires its actual
sources and permissions; this slice does not claim those integrations exist.

## Proposed decisions for Jose's review

The selected approach is Jose's. Format/storage limits, text-only retained custody,
Owner-only shared company scope and the publish-before-AI workflow above are
engineering proposals. Approving this design authorizes local backend/schema/tests
and the UI contract, not deployment, actual customer ingestion, new role powers,
production or spending beyond the existing explicit allowance.
