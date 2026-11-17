# Rondo company knowledge implementation

> **For agentic workers:** Use superpowers:executing-plans in this chat. Root implements, with a fresh-context whole-slice review at the end.

**Goal:** Deliver the approved Owner-managed company profile and versioned text-library backend, with read-only Rondo retrieval and current-source fences.

**Architecture:** Reuse current Owner/company guards, database transactions and immutable request receipts. Add workspace knowledge state/entries/versions/operations, private JSON and exact-version text APIs, and optional knowledge-aware adviser context. A feature setting keeps existing deployments unchanged until explicit integration. No new service/dependency.

**Tech stack:** Existing TypeScript, Next Node handlers, PostgreSQL16, Vitest and owned database fixtures.

**Spec:** `docs/superpowers/specs/2026-11-15-rondo-company-knowledge-design.md`, approved by Jose in this chat November15.

## Global constraints

- Text-first: pasted UTF-8/TXT/Markdown; PDF/Word/OCR and Claude's screens are separate. No external parser, embeddings, new subscription or paid activation.
- Workspace-shared knowledge for currently admitted Owners only. Private per-Owner priorities/memory remain separate. No new Manager/Employee authority.
- Limits:16KiB profile,256KiB text/version,20 documents,100 retained versions,10MiB stored text/workspace,6 knowledge sources/24KiB across an investigation and8 final answer citations including operational sources.
- Exact immutable reviewed digest before publication; effective validity separate from advisory review due. Archived/deleted/future/expired/draft sources never enter current inference.
- Revision/active-eligibility fences cover all workspace Owners' model history and completed replay. Knowledge edits and answer settlement share workspace locking. No stale historical answer is returned as current.
- Same-origin/no-store APIs; server IDs/tenant scope, bounded bodies, no raw content/key logs. No actual customer ingestion, hosted migration, shared branch move or production deployment.
- Company guidance remains untrusted evidence and cannot override enforced rules or authorize model writes. Company-knowledge paid cases are not currently enrolled; default qualification is offline.

## Review focus

1. Different Owner edits/withdraws a source while another Owner's model call awaits: reject stale settlement/replay/history.
2. Validity expires or begins without any revision change: time eligibility must be rechecked.
3. Concurrent writes hit document/version/byte quota or reuse an operation ID with a changed payload: atomic deny/no partial writes.
4. Deleted text leaks through a historical version endpoint, operation receipt or model history: purge/omit it and retain only non-content audit metadata.
5. Mixed operational and knowledge citations exceed the existing client contract: explicit bound, no invalid answer or silently dropped required evidence.

### Task1: Pure model and source bounds

Files: `src/lib/owner-advisor/company-knowledge.ts`, `.test.ts`.
Consumes: unknown JSON. Produces normalized KnowledgeCommand, digests, excerpts, source routes and limits.

- [x] Write tests for exact command shape, invalid UTF-8/control characters, profile/document limits, exact publication digest, effective/review date distinctions and bounded Unicode excerpts. Observe RED.
- [x] Implement parsers, hashes and bounded extraction; no I/O or model/network calls. Run the whole focused model suite green.

### Task2: Schema and Owner store

Files: `db/migrations/0064_owner_company_knowledge.sql`, `db/migrations/order.ts`, mirrored `src/test/integration/local-postgres.ts`; `company-knowledge.server.ts`, `.integration.ts`.
Produces atomic draft/publish/archive/delete receipts and current leased knowledge snapshot.

- [x] Write owned SQL cases for exact reviewed publication, immutable versions, two Owners/workspaces, role/revocation, changed replay, concurrent revision/quota denial and purged text. Observe failure before schema/service.
- [x] Add the ordered additive migration and focused service using existing Owner guards and workspace lock. Profile is workspace-owned; operations also bind actor/session/authority. Keep receipt payload content-free.
- [x] Read active published versions under one observed time; derive next eligibility transition and fingerprint. Recheck revision/time at use. Prove effective expiry and review-due distinction, missing-schema state and no model requirement.

### Task3: Retrieval and adviser freshness

Files: adviser `contracts.ts`, `tools.server.ts`, `loop.server.ts`, `service.server.ts`, `store.server.ts`; dedicated knowledge integration regressions.
Consumes leased knowledge snapshot. Produces read-only `company_knowledge` evidence and knowledge-fenced history/replay/settlement.

- [x] Write regressions for approved profile/document use, draft/expired exclusion, prompt injection and conflicting guidance, all-Owner withdrawal, expiry during await, stale replay and historical-input exclusion. Observe RED.
- [x] Implement optional feature setting `NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED`; missing schema remains unavailable, not empty/all-clear. Existing feature-off adviser paths retain their current contract.
- [x] Enforce total6-source/24KiB knowledge bounds and8 final citations while keeping operational evidence. Guard write/finalization transactions with shared/exclusive workspace custody and source eligibility.
- [x] Run existing Owner plus new owned SQL and unit suites. No live model call by default.

### Task4: Private APIs and UI contract

Files: `src/app/api/owner/advisor/knowledge/route.ts`, exact-version text route, corresponding route tests, shared citation validators, `docs/handoffs/2026-11-15-rondo-company-knowledge-ui-contract.md`.

- [x] Write same-origin/body/auth/cross-company/no-store/exact-version citation tests first. Reject arbitrary URLs/IDs and deleted content.
- [x] Implement JSON CRUD and authenticated plain-text version view. Reads never grant scope by caller workspace ID. Keep binary import unsupported and truthful.
- [x] Publish concrete synthetic examples, publication/retention/withdrawal behavior and Claude's UI acceptance contract; do not edit UI layout/components.

### Task5: Review and handoff

- [x] Fresh-context whole-slice code review. Root remediates important findings with RED-to-GREEN evidence; no independent release certification claim.
- [x] Types, scoped lint, build, source/secret checks, relevant unit/owned PostgreSQL suites and full default gate. Preserve unrelated known manual-source failure; never weaken it.
- [x] Retain source-identified results, all open gates, migration/rollback and exact commits in a dated handoff. Integration owner owns shared development and manual refresh; Jose owns main/production approval.

## Preflight rulings

- User explicitly approved this design. Resume execution without another routine design/plan permission request.
- Existing release candidate is isolated and related to the unchanged verified development base. New migration is local-only until combined source/hosted review; do not apply it to a shared database.
- Root will use the repository's Node `.check.mjs` convention for Node harness checks and Vitest `.test.ts` for application tests.

## Execution record

Tasks1–4 implemented locally. Pure model/parser, owned CRUD/leases, adviser
retrieval/fenced history/replay/settlement, private API routes and Claude's UI
contract are present. No UI screens or paid company-knowledge cases were built/run.
Task5 review remediated three HIGH defects and revision/review/TTL findings with
retained failing and passing tests. The separate remediation reviewer reported
APPROVE/WATCH and personally passed28 owned SQL/17 focused units. Final broad
checks and exact-source browser acceptance are recorded in the dated handoff.

Implementation clarifications: the preexisting operational answer parser supports15
sources, proven by its period-read regressions. Preserve that baseline; knowledge-
aware investigations cap8. Persisted knowledge identity includes revision and
advisory review status as well as active versions/digests, and the response lease
is capped at the nearest effective/review transition. This supersedes the earlier
progress-ledger proposal to reuse history across draft-only revision changes.

Completed verification:186 owned SQL;306 focused Owner/flag units; final default13070pass/944skip/1manual-source failure; final Chromium/WebKit and safe build atc21f81d0. Bootstrap manifest/order pins intentionally updated and reviewed after the first frozen run; previous entries/checksums preserved. See dated backend handoff for all failed evidence and open integration gates.
