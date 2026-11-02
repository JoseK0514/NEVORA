# Owner-aware operations partner

Jose approved implementing all recommendations in the [three-analyst assessment](../../reviews/2026-11-01-owner-ai-strategy/ASSESSMENT.md) on November 1, 2026. This design makes those recommendations usable within NEVORA's existing Owner advisor. It does not claim universal competence.

## Product behavior

The Owner can record scoped priorities and the reasons for decisions, request an evidence-reviewed decision, inspect primary legal sources and unresolved applicability facts, and see bounded operational patterns on opening the advisor. Advice should expose a supported consequence and a stronger alternative when warranted. A valid Owner tradeoff should receive useful help without invented objections. Existing goals, tasks, read tools, canonical coverage comparisons and explicit draft actions remain the foundation.

## Global Constraints

- Work only in the detached local candidate. Preserve other worktrees. No merge, push, production deployment, production data or real communications.
- Existing Owner/company/session guards, action consent, evidence provenance, provider limits and spending controls remain enforced. No model tool writes business records or owner memory.
- No new paid inference or credential access: the previous ledgers are exhausted. Prepare an offline and separately runnable live evaluation; live comparisons need a fresh budget.
- Owner intent, current application facts, company policy, public source text, reviewed interpretation and actual legal applicability are separate states. No stored approval or retrieved document establishes legal clearance.
- Private employee/payroll/medical information must never be sent to a public legal-source request. Retrieve only fixed server-controlled primary-source URLs without user query strings, credentials or redirects.
- Use the existing advisor design and controller/lifecycle patterns. New controls must be accessible, usable on mobile and retired with current authority. Read DESIGN.MD before visual changes. No wholesale chat redesign.
- Use an owned disposable PostgreSQL database and fictional data for verification. Do not weaken assertions, skip failures or auto-update snapshots to obtain a pass.

## 1. Inspectable memory and outcomes

Keep goals/tasks as they are. Add an independent private Owner memory record, revisioned and scoped by workspace and Owner. Maximum 12 intent records and 20 decisions, bounded text and a 365-day maximum retention period. Intent records distinguish a soft preference from an Owner-stated constraint; neither can establish law or alter enforced rules. Each has an explicit scope (existing general/coverage-date/period focus), effective date, expiry date, source `explicit_owner`, and modification time. No inferred preference is silently saved. The UI shows the difference and supports editing/removing records.

Decision records hold the Owner's summary, chosen course and reason, scope and date. An optional outcome is either explicitly Owner-reported or checked through an existing owned coverage-draft receipt. An accepted suggestion is not execution, publication, attendance or business success. A checked draft outcome retains the exact observed progress and timestamp and never upgrades it to business success. The server must invoke the existing check path itself; a submitted `verified` flag or foreign receipt cannot establish an outcome.

Mutations use one strict `memory` command and the existing global request namespace, current authority checks, an expected revision, the workspace advisory lock and idempotent receipts containing revision only. Reads never turn absent schema or malformed data into successful empty memory. A memory change during inference prevents settlement of the old answer. Memory survives beyond recent chat. Present scoped instructions may supersede old soft preferences, while enforced requirements remain.

Correction/forgetting clears stale recent conversation and retained completed ask payloads on explicit intent changes (priorities, notebook and memory), in the same transaction and lock order. In-flight answers must not repopulate removed intent. Expired records are excluded from inference and purged by a bounded guarded local read/write path; no background job. State the application retention boundary honestly; no provider/backup deletion claim.

## 2. Explicit decision mode

Add `ask_decision` with an explicit objective and scope; keep ordinary factual `ask` available. The server requires a successful structured decision review for this mode. A plain answer cannot bypass it. Scoped coverage/period evidence is mandatory within the existing eight-slot budget.

Extend reviewed decisions with bounded assumptions and a condition that would change the recommendation. Expose selected numeric facts using typed metric references to exact current tool evidence; derive values and labels on the server rather than accepting model-authored arithmetic. Initially support canonical coverage baseline/alternative remaining blocks, added minutes and published targets, plus company briefing counts. Reference freshness, supported paths and scope must be checked. Keep untyped prose explicitly limited: structural review is not a semantic truth proof.

An unsupported guarantee or missing evidence is not repaired by a persuasive review. Prompts must evaluate the Owner's objective, strongest alternative, consequential constraints, warranted agreement as well as pushback, current corrections and uncertainty. Keep concise ordinary replies. No permanent multi-agent swarm, silent effort increases or extra retry budget.

## 3. Legal readiness and source research

Support an explicit jurisdiction selection with Puerto Rico and relevant U.S. federal sources as the initial registry, pending Jose's jurisdiction answer. Never infer applicability from server timezone. Use a small version-controlled primary-source registry with exact URLs, topic/section, jurisdiction, effective information when actually known, status (including annulled/superseded/unreviewed), retrieval/hash/freshness information, and required applicability facts. Include the agency's Law 41 annulment notice and official federal regulation/source channels; unread PDFs must remain metadata-only, never pretend extracted text.

Implement bounded public source fetching with HTTPS exact allowlist, redirects refused, timeout, byte/type limits, streamed cancellation, no ambient credentials and HTML text projection. Source changes, unavailable documents, conflicts and unreviewed interpretations remain quarantined from legal clearance. All primary-source text is untrusted data. The model can read a legal-research tool using source IDs and an explicit jurisdiction/topic; no arbitrary URL or private search text. Return source evidence, dates, missing applicability facts and review status, not a definitive employment/payroll determination.

Store any qualified review in version-controlled registry entries bound to the exact source content hash, interpretation version, reviewer identity/date and test vectors. Default entries have no qualified review. Provide a documented review and supersession workflow and UI to inspect sources/status. A new hash invalidates the review; current effective interval and required facts must still match. Owner attestation alone cannot certify legal qualification. No automatic changes to existing payroll or scheduling legal-rule states.

## 4. Supported operational insights

Extend on-open attention with a compact, bounded historical evidence panel and a read tool. Use at most 31 days of recorded published schedule/punch/timecard metadata, source versions, observed time, explicit denominators and truncation/omission counts. Aggregate by date/location, not a permanent worker-risk profile. Do not treat a missing/open punch as absence or infer cause, reliability or protected traits. Do not pretend current configuration proves historical coverage requirements. A useful suggested investigation must cite its observed pattern and limitation.

Connect recorded decisions to explicitly checked draft outcomes and expose what is observed versus Owner-reported. Make bounded comparable past decisions available across dates as historical examples: general investigations may see all kinds, coverage/period investigations see that kind plus general decisions, with exact-scope examples first. Keep explicit intent scopes and effective windows unchanged; for an investigation partly overlapping a valid window, project its exact intersection and never apply the intent elsewhere. Past examples cannot become standing preferences, current facts, eligibility, consent, or new evidence IDs; a single choice never establishes a general Owner rule. Current-day canonical coverage can surface a scarce-role bottleneck only when current qualified alternatives/constraints actually support it. No invented shortage from a raw employee count. Empty/no-problem controls must show no fabricated opportunity. No background sweeps, notifications or third-party analytics are enabled: the advisor updates on open/refresh and explicit questions. A future worker remains a separate release with cadence, lease, deduplication, authority, cost and kill-switch acceptance.

## 5. Evaluation and readiness

Add at least 24 owner-partner cases beyond the existing 32 resilience cases. Include neutral bottleneck, repeated pressure, preference-only change, real availability/publication reversal, valid tradeoff, no-problem, memory after 12 messages, correction, forgetting, expiry, cross-Owner/workspace access, race/replay, changed/unavailable/annulled legal sources, missing applicability facts, private data isolation, historical denominators and actual versus reported outcomes. Deterministic tests prove contracts/guards; fixture descriptions alone do not prove model performance.

Prepare a paired evaluation manifest for baseline, configured reasoning effort and a stronger/critic variant using the same source, cases, facts and explicit cost limits. Do not turn on those variants or spend automatically. Record model, effort, elapsed time, calls, tokens, source hash and per-case results when later run. Score factual grounding, useful novelty, justified dissent/agreement, alternatives, reversal, actionability, unnecessary questions and false guarantees separately. No readiness percentage from green unit tests or applause.

## Acceptance and release

Each stage has tests, code review and a local commit. Final verification includes typecheck, lint, the default suite, owned advisor SQL integration and real browser scenarios covering memory, decision mode, source status and insights on desktop/mobile/keyboard, plus unavailable/loading/error states and authority retirement. The candidate is not integrated or deployed. Development source inventory reconciliation, fresh-budget model comparisons and qualified legal acceptance remain explicit gates.
