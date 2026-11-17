# Rondo company-knowledge backend candidate — November 15, 2026

Jose approved the Owner-managed profile/versioned text-library design in this
chat. The approved local backend/schema/tests/UI-contract slice is implemented;
Claude's screens and combined hosted development acceptance remain separate.
This is an isolated detached candidate, not an enabled customer feature.

## Source and custody

- Repository: `/Users/josek0514/.codex/worktrees/nevora-rondo-anthropic-20261115/NEVORA-UI-READINESS`.
- Final application commit: `c21f81d0a5dfde2cf25f869ddb0e1ccb896d70b0`.
- Feature commit: `232029988854fa337f7a504470de1d712f9563d7`; follow-up pins
  the new SQL checksum in the canonical bootstrap artifact and exact order test.
- Feature parent: `48bd4cad1d5ac59b073c7a1cb7d6b6660a197f17` (management evidence and approved design).
- Underlying verified development base: `b5085edb33d1bccc440588f950e728566c8a79ac`.
  Collaboration head observed during preflight was
  `bb00210b54e95a9af43375becf02c27b0648303c`; its Rondo labels were not imported.
  These are source receipts, not a claim that remotes stayed frozen afterward.
- Exact Jose noreply author/committer mapping verified before commit. No new
  working branch, shared development/main movement, push, remote CI or deployment.
- Public Velani candidate was unchanged by this slice. No public/private company
  knowledge bridge, source publication, customer upload or new role powers.

## Implemented behavior

Owners share a versioned structured company profile and a text/TXT/Markdown
library. Immutable versions are drafts until an Owner reviews the exact saved
text and publishes its SHA-256 digest. New drafts retain the published version;
publication replaces the active pointer, archive withdraws it, and delete purges
all retained version body/profile fields/title/filename while retaining non-content
operation audit custody. Current Owners can view historical nondeleted sources;
Managers/Employees and forged identifiers are denied.

Migration0064 adds state, entries, versions, immutable operation receipts and
knowledge identity tags on adviser profiles/requests. Workspace writer locking
precedes shared Owner guards; revision, quota and receipt changes are atomic.
Limits are16 KiB profile,256 KiB text/version,20 documents plus one profile,
100 retained text versions and10 MiB retained source-body text. JSON transport is
bounded at1 MiB of actual streamed bytes with fatal UTF-8 decoding and cancellation.

Rondo gets the published profile in its mandatory briefing and a read-only
`company_knowledge` token-search tool. Six source/24 KiB excerpt limits span the
whole investigation, with exact private version citations and explicit omissions.
Document search retains two citation slots for further operational evidence.
Knowledge-aware answers cap8 citations; existing operational-only answers retain
their preexisting15-source contract. The approved design mistakenly described that
baseline as8; source inspection and existing period-read regressions established15.
No source is silently dropped to force an answer through the contract.

Revision, active version/digest and advisory review status identify context for
every workspace Owner. Source edits, withdrawal, deletion, effective activation/
expiry and review-status transitions retire old history/replays and fence an
answer in progress. Overdue review keeps text eligible but changes its status.
Replay fingerprint checks run after the same advisory lock used for settlement;
final observations are guarded and their TTL ends at the nearest transition.
An operation receipt remains a historical event; refetch library metadata for
current state. Document deletion is not separate chat erasure or provider recall.

`NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED=false` ships in the registry/example.
CRUD requires no model credentials. Missing schema is unavailable, never an empty
all-clear. Feature-off fenced code excludes old tagged history/replays and can
operate before the additive schema. Guidance is untrusted evidence and cannot
override enforced scheduling/payroll rules, imply consent or execute writes.

## Verification and failed evidence

All results use fictional data. The owned runner created and stopped loopback
PostgreSQL clusters; no existing business database or production credential was
used. No paid company-knowledge case was enrolled or run. Prior metered management
and adapter evidence remains in its original handoff/ledgers; no reset or retry.

| Check | Observed result |
|---|---|
| Owner plus feature-registry focused units |306 passed in30 files|
| Full Owner owned PostgreSQL |186 passed in21 files on 23202998; operative adviser/migration bytes unchanged by c21f81d0|
| Fresh review rerun |Reviewer independently passed28 focused SQL and17 units; APPROVE/WATCH, no blockers|
| Chromium and WebKit |Passed actual Next/session/SQL draft, publication, private exact-version navigation, archive and deletion; script remained literal; zero external requests/errors; no model configured|
| Types and scoped lint |Passed|
| Safe release-environment Next build |Passed; both private knowledge routes present; no migration/provider work|
| Frozen full default unit gate |13070 passed,944 skipped,1 failure: manual-publication source hash;922 files total|
| Source/staged secret scan |Passed; see retained staged-evidence-secret-scan.log|

The first broad default run overlapped the source checkpoint and other host test
jobs. It reported manual-source drift plus unrelated timing/process assertions
and was explicitly interrupted (exit130), not counted as a completed release gate.
The first frozen replacement completed 13068 passing/944 skipped with three failures:
manual-source drift and two related bootstrap/order pins. The latter were repaired
by intentionally regenerating the canonical artifact and extending its exact order
assertion; every prior checksum/order entry is preserved. Five focused tests and
the generator check passed, with a separate fresh reviewer approval. The final
full run uses two workers against c21f81d0 with unchanged assertions/timeouts. Failed output is retained; no assertion/timeouts
or snapshots were relaxed. The final run completed with only the unchanged manual-publication gate failing: `Stale or foreign application content hash`. The earlier timing/process failures did not recur in either completed frozen run; this does not establish their root cause. The related bootstrap/order failures are fixed, not waived.

Initial migration syntax failures, draft current-status NULL bug, pre-fix stale
replay/history and code-review regressions are retained. Review found and root
fixed three HIGH issues: replay lock interleaving, briefing metric-shape regression,
and uncited all-library title exposure. Revision/review/TTL findings were also
fixed. The observation test initially triggered on admission rather than final
observation; the corrected exact-query case passes. Those failed diagnostics are
not represented as valid successful reproductions. The reviewer retained the
original BLOCK report and a separate remediation approval; this is code review,
not independent QA/release certification. Two redundant test assertions remain
nonblocking maintenance notes.

Evidence: `docs/handoffs/rondo-company-knowledge-evidence-20261115/`, with logs,
reviews, browser report/source receipt/screenshots and SHA-256 array manifest.
Browser raw custody remains at
`/tmp/rondo-company-knowledge-browser-final-20261115/company-knowledge/`; its source
checkpoint is c21f81d0 and its closed owner record confirms source/mirror checks.
Only the approved owned DB adapter and generated Next dev type-reference paths
were substituted; the actual API/business services were exercised.

## Applied operating positions

Product: Owner publication and explicit source gaps govern business claims.
Engineering: reuse canonical authority, storage and read-tool boundaries with
atomic quotas and replay. Security: private current-Owner access, strict text
handling, no content/key logs and opt-in inference. Delivery: preserve the isolated
candidate and Claude's UI ownership. Technical assurance: code review, scripted
behavior and actual native-model semantics are distinct evidence, never a claim
of universal manager capability or independent release certification.

## Integration, rollback and remaining gates

The UI contract is `docs/handoffs/2026-11-15-rondo-company-knowledge-ui-contract.md`.
Claude owns profile/library screens, exact-text publication review and loading,
conflict/quota/withdrawn/revoked states. The raw plain-text source route may scroll
for long lines/digests; an in-app mobile reader should use the JSON view and render
text with wrapping. The browser checks qualify transport/custody, not a finished
profile/library UI or its accessibility.

The integration owner must reconcile the candidate with the current development
source and migration order, join Claude's UI, refresh the manuals on that exact
combined release, and verify real hosted same-origin/session/source behavior
before enabling knowledge. All active adviser instances must run the fenced code
before any instance is enabled against knowledge-tagged data. Hosted flags/schema,
customer content and live-model document semantics are unverified. No approval
for those actions is inferred from this local implementation.

Prefer rollback by turning knowledge off under the new fenced code and retaining
the additive schema. Before reverting to old unfenced adviser source or dropping
identity columns, disable the adviser and explicitly reconcile/purge tagged chat/
request retention; dropping tags first can expose retained excerpts. No automatic
destructive down migration was run. Existing exact scheduling-draft acknowledgment
and separate publication controls remain in effect.

Development is the primary acceptance release, held to production standards.
Promotion of its exact verified UI/backend source to main/production still
requires Jose's approval. This slice does not establish complete business
understanding: sales, inventory, banking and other unconnected systems are not
current data sources; PDF/Word/OCR ingestion and unattended management remain
outside this approved backend slice. No further user decision is required for the
completed local backend. Next delivery owner: Claude UI, then development integration.
