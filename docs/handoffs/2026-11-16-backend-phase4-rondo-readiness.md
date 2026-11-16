# Phase 4 — Rondo contract and dependency assessment

November 16, 2026. Read-only assessment; no Rondo code, migration, provider, configuration, UI, model evaluation or metered call changed. Source inclusion below describes the fixed Phase 1 baseline, not a decision to remove an intended launch capability.

## Immutable sources and custody

| Source | Identity / disposition |
| --- | --- |
| Application baseline used by Phase 4 | `edce7661c211aba588f29bd6d56327fabdc11b47`; existing Owner adviser retained. No company-knowledge route, knowledge implementation or migration 0064 in this tree. |
| Original separately delivered knowledge | Feature `232029988854fa337f7a504470de1d712f9563d7`; application `c21f81d0a5dfde2cf25f869ddb0e1ccb896d70b0`; historical bundle/docs `b3a086205813b6e4c609883cbf0438d7f1232491`. These are pre-alignment identities, not replacements for Phase 4's baseline. |
| Owner's aligned delivery | `8738bc18c670846e4c88c16e7c191d635af30e11`; documentation successor inspected immutably at `64747c2960e19a3184c36d5eaeb7baf326dc0ca3`. Rebased on development `22a9d598eb470cd380ee739d7396f06ecf335ed5`. |
| Aligned implementation identities | Provider `973bbce30e162ec91f6e762ae8ce91d2f8093a2e`, bounds/replay `fb2c72576434c3c351bc850f34db01363981b408`, knowledge `f9d5c48ab70c8ef3366af968a5bc12da9ff31dd3`, provenance `b6417780b9bbc8542bbc7210eb3dd6512f20840f`, 50-question catalogue `9e7e658c9579dc9efea5140c5d4af5a1008dffd4`. The existing integrator selects the owner's complete delivery and follow-ups; this is not a cherry-pick instruction for an incomplete subset. |

Existing Rondo worktree (read-only): `/Users/josek0514/.codex/worktrees/nevora-rondo-anthropic-20261115/NEVORA-UI-READINESS`. It had active uncommitted program/design edits; Phase 4 did not alter them or take them as accepted contracts. References below were also inspected with `git show 64747c29:<path>` to keep committed evidence separate from those edits. The progress document identifies `8738bc18` as its aligned candidate. No integrator expressly supplied a newer shared baseline to Phase 4; none was independently adopted.

Owner's existing handoffs at that source:

- `docs/handoffs/2026-11-15-rondo-claude-credit-migration.md`
- `docs/handoffs/2026-11-15-rondo-management-qualification.md`
- `docs/handoffs/2026-11-15-rondo-company-knowledge-backend.md`
- `docs/handoffs/2026-11-15-rondo-company-knowledge-ui-contract.md`
- `docs/handoffs/2026-11-16-rondo-manager-program-progress.md`
- `docs/qa/rondo-owner-50-acceptance.json` and `rondo-owner-50-source-matrix.json`

## Contracts already included in the Phase 4 application baseline

`GET/POST /api/owner/advisor` is Owner-only with current Company authority/session and explicit same-origin intent header `X-Nevora-Owner-Advisor: 1`. The transport bounds actual streamed JSON to 16,384 bytes and a single 60-second cancellation budget. Read selectors `view=lease|detail` and optional schema header `X-Nevora-Owner-Advisor-Schema: 2` select existing projections, never permissions. The typed request/response source is `src/lib/owner-advisor/contracts.ts` plus its workflow/coverage-action contracts; do not invent a universal chat schema.

Included command families: `ask`, `ask_decision`, `ask_task`, `inspect`, priorities, notebook, explicit memory, briefing review and prepare/apply/check of bounded coverage drafts. Preserve request IDs, expected revisions, exact source versions, current review IDs and explicit acknowledgement. The model's tools remain read-only. `apply_coverage_draft` is an explicit Owner command, not a registered model tool; it requires `{requestId,reviewId,acknowledged:true}`. A prepared review is not a saved or published schedule. Its immutable receipt and current progress are separate; check the original review after an unknown reply. Final scheduling publication remains separate.

Existing tools: operational insights, current company briefing, published staffing/coverage investigation, attendance/payroll period review, bounded date coverage proposals/plans and source-linked legal research. A period review reports `readiness:"unverified"`; missing/partial/unavailable input is not zero activity or financial readiness. Legal research is source evidence, not legal applicability certification. Tool arguments are closed/validated server-side and do not accept arbitrary SQL, URLs, tenant IDs or mutation instructions.

The baseline supports explicit OpenAI/Neon Responses or Chat Completions. It does **not** contain the separate direct Anthropic adapter. Configuration additionally requires `NEVORA_OWNER_ADVISOR_ENABLED`, `NEVORA_OWNER_ADVISOR_DATA_APPROVED`, an explicitly allowed provider/model/endpoint/key and bounded daily allowance. Flags and source code do not prove hosted configuration, provider authentication or customer-data authorization. No deployment-selected provider was verified in Phase 4.

Consumers must retire responses when `observedAt/validForMs`, authority or expected revision expires/changes. Keep `disabled`, `unavailable`, `invalid`, `forbidden`, `conflict`, `busy`, `daily_limit`, `prior_attempt_failed`, `cancelled`, `limit` and `provider_failed` distinct. Never regenerate an uncertain operation ID, silently retry a paid call or display stale foreign/revoked data as a current answer. Validate citations against the existing route/source allowlist; metadata/receipt presence is not permission to disclose another Owner/company's source.

Fresh Phase 4 offline fixtures include existing Owner HTTP, citation, coverage-action contract and provider-failure tests. They use mocks/fictional data, not paid inference. Their results are in the main evidence ledger. They do not qualify the separate knowledge delivery or the 50-question catalogue.

## Separately delivered company knowledge: consume its existing contract after integration

The owner's existing UI contract is authoritative for the full schema. Current Company Owners share the profile/text library; Managers/Employees cannot access it. Personal notes/priorities/memory remain private per Owner. CRUD needs no model credentials. The accepted source is text or UTF-8 TXT/Markdown decoded to JSON, not PDF, Word, spreadsheet, URL import, OCR or arbitrary HTML execution.

`GET/POST /api/owner/advisor/knowledge` uses `X-Nevora-Company-Knowledge: 1`. Writes require same-origin JSON/current Owner, a fresh deliberate UUIDv4 `requestId`, exact `expectedRevision`, closed operation payload, and current session/company binding. No caller company/Owner ID. Operations include `draft_document`, `draft_profile`, `publish`, `archive`, `delete` (explicit acknowledgement). Draft receipt: `{state:"draft_saved",operationId,documentId,versionId,textDigest,revision,savedAt}`. Publish must review the exact saved version/digest; a mismatched digest/revision conflicts. Preserve exact-body/ID recovery; a replacement session or changed body must not inherit an old receipt.

Exact source: `/api/owner/advisor/knowledge/entries/{documentId}/versions/{versionId}`. JSON accepts `Accept: application/json`; plain text identifies the exact version. Responses are private/no-store, no-referrer/nosniff. `X-Content-SHA256` hashes source body text, not the wrapped HTTP response. Render as inert text with wrapping. No public document links or share tokens.

Publication is explicit: new draft leaves the published pointer unchanged; publishing replaces it immediately. A future-effective replacement can create a gap until its start—there is no automatic old-version fallback. Effective end excludes the source; overdue review is advisory and keeps it eligible with changed status. Archive withdraws active use; deletion removes retained source text/profile/title/filename and denies reads, retaining non-content audit custody. Withdrawal/deletion is not provider recall or separate chat erasure.

Knowledge revision, active version/digest and review status fence answers/history/replays across Owners. Missing schema is `unavailable`, not an empty ready library. Missing matches and bounded excerpts must remain explicit; token search is not a semantic or guaranteed cross-language search. Foreign, revoked/deleted sources and stale fingerprints cannot become current citations. Contradictory documents require Owner resolution and cannot override enforced workforce rules, authorize writes or fabricate consent.

Document limit 256 KiB normalized UTF-8; profile 16 KiB; at most 20 nondeleted documents plus profile, 100 retained versions and 10 MiB retained source text; actual transport max 1 MiB. Retrieval: at most six knowledge sources/24 KiB across the investigation, with operational citation capacity reserved. Knowledge-aware answers cap eight citations; existing operational-only bounded reads retain their separate 15-source contract. Expected `400 invalid`, `401/403 forbidden`, `409 conflict`, `429 limit`, `503 unavailable/cancelled` keep their existing recovery meanings.

Integration requires the owner's **reserved 0064**, retained 0065, canonical order, fixture literal, generated bootstrap/checksums and tests to agree. The aligned owner's explicit order puts 0064 after already-present 0065; numerical sorting is invalid. Its recorded bootstrap hash is `428d38f14c17cdb15445d84e1aaef462da30599f477e23d9502f982cde3c0066`. The integrator must regenerate/verify the actual combined source rather than copying a stale artifact. Phase 4 allocated/applied/imported no migration.

`NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED=false` is the separate delivery default. Claude must join its approved library/review/source UI, then the integrator qualifies combined current-authority, conflict, quota, missing/overdue/revoked/deleted, EN/ES, mobile and keyboard cases. Keep additive schema and fenced history behavior on rollback; disable retrieval/adviser before reverting to unfenced source. Do not drop knowledge identity tags to expose old excerpts.

## Quality, launch dependency and spending limits

Earlier owner's evidence includes a nine-turn native fictional management sample, with an initial false eligibility explanation preserved and two post-fix bilingual turns; bounded day coverage prepare/apply/check and local browser proof have their original sources and limitations. Historical knowledge fixtures/browser/SQL evidence is separately documented at its original delivery. These are neither actual hosted acceptance nor universal manager capability.

At inspected committed source, the catalogue states **50 cases, zero actual model runs, zero independently scored questions**, all scores unqualified. The source matrix reports 38 questions depend on missing broader domain readers; the other 12 still need dedicated evidence. Weekly workflow implementation, broader finance/sales/inventory connectors, dedicated oracles, actual-model document judgment, independent semantic grading, cost/latency quality and combined UI/hosted release remain with their existing owners. A roadmap or catalogue is not a passed evaluation.

The prior $5 finite comparison and expiring credits are historical authorizations, not new spending approval. Phase 4 did not access a model key, query a provider, run evaluation, use metered services or extend a budget. Provider/token price estimates, settled billing, grant deduction and durable account-wide spend caps are separate evidence.

**Launch dependency remains explicit:** the intended knowledge/manager capabilities are not removed to declare Phase 4 done. Their existing delivery is available for the integrator's selection; schema reconciliation, Claude consumers and actual quality/hosted evidence remain outstanding. The Rondo owner retains all implementation/evaluation work. Phase 4 returns only contract evidence and independent access/support work; it does not merge the owner branch or certify that capability ready.
