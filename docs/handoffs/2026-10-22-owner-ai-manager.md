# Owner AI manager: development increment

Implementation owner: Codex. Development base: `0f8ffee52d85f48cd2fe890dc9aa682e995de4eb`. Feature branch: `codex/owner-advisor-20261022`. This feature is separate from R1 acceptance and defaults off. Neither development/main integration nor production activation is authorized by this work.

## Delivered scope

The investigation service supplies current company context, dated published staffing and coverage analysis using NEVORA's existing scheduling rules to a configured reasoning model, together with the Owner's explicitly saved priorities. The fictional local demo now has a verified Neon model connection under the bounded pilot below; ordinary runtimes still default off. Published staffing and current scheduling commitments, which can include drafts, carry different labels. Position-specific coverage recommendations retain the applicable position.

Company data, conversation and saved priorities require an active Owner with current Company Access authority. The server rechecks that original authority after asynchronous work. Another role cannot gain access through a URL, browser role label or client-provided identity. Preferences and history are isolated by workspace and Owner.

This increment proposes decisions. Schedule publication, employee messages, payroll, access changes and autonomous background work are subsequent work; there is no business mutation tool in this agent.

The implemented Owner interface at `/app/ai-manager` includes the live briefing, dated supporting links, a plain-text conversation, starter questions, Ask/Cancel and explicit priorities with revision-conflict review. Owner Home/navigation discover it only when the feature is enabled. Manager/employee discovery is unchanged. A persistent private-state controller refreshes authority proactively and retires private content on focus/visibility/network/signout/expiry changes. Long operations obtain a fresh access observation before displaying their result; stale reads cannot overwrite newer saves or clear uncertainty.

Jose explicitly authorized local commits and verification. The verified application commit is `f67ad18d2b571cf0eb8dd2da04cf3ad532aafe87`. The later owned-runtime pilot and guard are verified at `f9591e5ee87aefb82c8428ddce7c8198cf153e65`; they do not change production application logic. The branch is local, with no remote push, PR, development/main merge or deployment. The design and completed task checklist are in `docs/superpowers/specs/2026-10-22-owner-advisor-design.md` and `docs/superpowers/plans/2026-10-22-owner-advisor.md`.

The [connected local demo](http://localhost:65197/app/ai-manager) is running as a fictional Owner, with real owned local PostgreSQL persistence. It is separate from the earlier UI preview, which remains intact. Live demo controller PID99569 and ownership metadata live under `/Users/josek0514/.codex/owner-advisor-live-evidence-20261022/`. The original disconnected demo's evidence remains in the visualization directory from the first increment.

## Connection and activation

Jose prefers Neon AI Gateway. The implemented adapter uses a validated branch-scoped Neon HTTPS host and `/openai/v1/responses`; this route supports OpenAI models. Optional direct OpenAI uses the same bounded investigation protocol. The first increment used injected provider responses; the subsequent pilot completed real inference through Neon.

Connected metadata and the signed-in Neon Console verified that NEVORA preview and Yavi Barber development belong to VELANI LLC (MAIN), on Launch. AI credits are shared by organization. The existing fictional-preview gateway was enabled; the free authenticated model catalog returned HTTP200 and included `gpt-6-1-sol`. No gateway purchase or credit transfer was needed.

The page/navigation/API require `NEVORA_OWNER_ADVISOR_ENABLED=true`. Without provider configuration, the live briefing and explicit priorities remain useful while Ask is disabled. Live requests additionally require all of:

- `NEVORA_OWNER_ADVISOR_DATA_APPROVED=true`, following review of provider data handling.
- `NEVORA_OWNER_ADVISOR_PROVIDER=neon` and an explicitly selected `NEVORA_OWNER_ADVISOR_MODEL`.
- Server-side `NEON_AI_GATEWAY_BASE_URL` (bare official branch HTTPS host) and `NEON_AI_GATEWAY_TOKEN` in the existing approved secret store.
- `NEVORA_OWNER_ADVISOR_DAILY_LIMIT` from 1 to 100. This is a request cap, not a guaranteed dollar ceiling; model selection and provider-side credit limits determine cost.

Jose authorized up to $5 from the existing shared credit for this local fictional-data pilot. This does not authorize real company data, an ongoing production budget or deployment. Review the applicable provider handling and deployment controls before any such expansion.

`store:false` is sent to the Responses endpoint. It does not promise zero provider retention: Neon/Databricks documents up to 30 days for abuse/security handling. The agent excludes private payroll identifiers and contact details from its tool outputs. Names and operational shift/eligibility context are still company information.

### Bounded live pilot, October 22

The explicit owned-runtime launch uses preview project `dry-hall-36228257`, branch `br-blue-firefly-b759kjzm` (`fictional-preview`), and model `gpt-6-1-sol`. Only fictional NEVORA Demo facts are supplied. A dedicated `ai_gateway:invoke` credential is held in macOS Keychain (service `NEVORA Owner Advisor Neon Pilot 20261022`, account `br-blue-firefly-b759kjzm`); no secret is committed or included in evidence. Ordinary tests do not inherit ambient provider credentials.

The native Node preload restricts destination, route, model, redirect handling, request shapes, 64KiB input and 4096 output tokens. Before every attempted paid transport it durably reserves $0.25, at most twenty times. Failed or uncertain calls retain their reservation. The same private ledger survives restarts at `/Users/josek0514/.codex/owner-advisor-neon-pilot-20261022/ledger.json`; never delete/reset it or select another directory for this authorization. It expires **October 23, 2026 at 4:35:45 p.m. Puerto Rico time**. Locks, incomplete writes, tampering and expiry fail closed. This is a manual local pilot using the verified $2/M input and $10/M output rates, not generic production dollar metering or protection against a malicious operator rewriting all same-user state.

Two real UI investigations completed: today's priorities and a follow-up asking whether Morgan could replace absent Alex while protecting Bayamón. The answers used current operational read tools, dated sources and saved priorities; compared options; distinguished hypothetical absence from missing clock-ins; and acknowledged missing candidate/availability/hours evidence. The follow-up was not a verified feasible staffing proposal. No business execution tool exists. These samples establish working transport and useful initial reasoning, not broad model-quality certification.

Eight paid transport attempts used $2 of conservative **reservation allowance**, not $2 of billed spend. Signed-in billing showed **$14.98 before and $14.95 after**; this is the shared organization's displayed metering, not a per-feature invoice. No purchase, top-up or card charge was made. Twelve attempts remain in this pilot when that receipt was recorded; the guard also expires after 24 hours.

Evidence: `/Users/josek0514/.codex/owner-advisor-live-evidence-20261022/connection.json`, `live-browser-dom.txt`, `live-console.json` (zero warning/error entries), and screenshots. Root independently matched all **1,842 source and mirror files** to the captured final source manifest, including guard/preload hashes. Current preview remains running; its eventual teardown is pending. The earlier preflight closed its owned PostgreSQL/Next processes with source/mirror verification before the reviewed corrections.

The pilot guard has 18 passing tests, 36 passing affected owned-runtime tests, passing TypeScript/lint and meaningful failing-before-fix cases. Scoped review closed the loopback redirect escape and insufficient preload assertion, then approved `f9591e5e` with no blockers. See `docs/reviews/2026-10-22-owner-advisor-pilot.md`. Live cancellation and the full adversarial/operational quality matrix remain unevaluated; local fake-transport cancellation tests from the first increment still stand.

## Controls and practical limits

The server admits only its own conversation, explicit Owner priorities and typed operational read tools. Stored notes and model output are untrusted. The model has no SQL, shell, arbitrary URL or unrestricted application access. Responses are plain text; supporting links come from server metadata.

An investigation is bounded to 60 seconds, six model rounds and eight total read-tool calls, including the required current briefing. Individual provider calls have a 20-second timeout. Responses and answers have byte/character ceilings; truncated operational data is explicit. No automatic provider retries run.

PostgreSQL enforces one active investigation per workspace and a workspace-wide UTC daily request cap across server processes. Failed attempts count. Operation IDs and payload hashes prevent duplicate execution; failed or uncertain IDs cannot silently restart a charged run. A 65-second lease lets a crashed process release its running slot.

Conversation retention is bounded to 12 messages and six completed answer receipts containing text. Older operation IDs keep their hash/status to prevent repeat charges, without keeping their old answer text. Explicit priorities persist until changed. Usage/failed-request metadata and preference operation receipts do not yet have automatic age deletion; backups follow the deployment's existing retention policy. Do not describe this as zero-retention storage.

Migration `0036_owner_advisor.sql` is a classified base migration after 0035. Only owned disposable local PostgreSQL has applied it in this work. A deployed database has not changed.

## Verification record

Backend fix commit `22b5fdc2` has 23 passing focused tests (including HTTP cancellation/deadline and migration classification) and 19 passing real disposable PostgreSQL tests. TypeScript and focused ESLint passed. Provider responses were injected for those tests; this proves the application protocol, authorization, persistence and limits, not live model recommendation quality.

Initial engineering review found handler-body timeout/cancellation, missing position identity in coverage groups and unreadable compressed code. The implementer added regression cases, fixed the behavior and formatted the module. The scoped re-review approved the backend at `22b5fdc2`, with no material finding open. Minor HTTP fixture typing/cleanup improvements remain observations; live model injection resistance is not established by fake provider responses.

Final engineering review reproduced a lost update before Save: a refresh could advance the saved revision while preserving a dirty edit, allowing an overwrite without conflict review. The correction keeps an independent draft revision, requires review when it changes, and requires another review for any subsequent change. Both new regressions were observed failing before the correction. The final real browser journey also covers both changes before Save. Screen/controller size and minor fixture typing/cleanup are nonblocking maintainability follow-ups; no material behavior exception was accepted.

| Check | Actual result/source | Evidence |
| --- | --- | --- |
| Final default suite | 9,343 passed; 801 existing tests skipped; exit0 at `f67ad18d` | `.omo/evidence/owner-advisor-final/unit-final.log` |
| Affected UI/navigation/signout suite | 55 passed, including revision drift, long operations, uncertainty and state retirement | `.omo/evidence/owner-advisor-ui/stop-verification.txt` |
| TypeScript and ESLint | Full TypeScript, full-project lint and changed-source lint passed | UI stop receipt; `.omo/evidence/owner-advisor-final/lint-final.log` |
| Optimized production build | exit0; sourceUnchanged true at `f67ad18d`; 2,813 artifact hashes | `/Users/josek0514/.codex/owner-advisor-final-evidence-20261022/build-source.json` |
| Real owned PostgreSQL+Next browsers | 18 scenario groups passed in Chromium/WebKit at 320/390/1440; zero external requests/page errors; teardown source/mirror verified | `.omo/evidence/owner-advisor-ui/h1-final/`; original `/Users/josek0514/.codex/owner-advisor-ui-evidence-20261022/h1-final/` |
| Root's personal browser use | Real login, Home link, starter question, priorities save/reload, disconnected Ask disabled; console warning/error list empty | `.omo/evidence/owner-advisor-final/manual-browser.md`; full-page screenshot in the demo metadata directory |

The first increment's final browser manifest's 1,838 files were independently matched to committed blobs at `f67ad18d`. App/database journeys use real local persistence and role enforcement. Its answer/error/cancel display cases use explicitly labeled fulfilled UI fixtures. The subsequent pilot above separately proves gateway authentication and two real model answers. Owned development browsers substitute the approved local PostgreSQL transport and generated development type references; the production build uses the original application DB source. Physical devices, broad live model quality and production behavior remain unverified.

Earlier failed/provisional browser runs and an interrupted broad run remain identified in the executor report; they are not the final pass. Trace evidence tied a WebKit development-overlay failure to test navigation interrupting Home's initial RSC work. The final journey waits for settled Home and uses its actual link, retaining strict zero-error assertions. No app code was changed to suppress those errors.

Final scoped engineering disposition: **APPROVE / code quality WATCH, no blockers**, at `f67ad18d`. H1 is closed; size and LOW style observations remain nonblocking follow-ups. Raw local receipts are summarized in `.omo/evidence/owner-advisor-final/completion-verification.txt`; the original full review history and superseding disposition are preserved in `docs/reviews/2026-10-22-owner-advisor-engineering.md`.

## Subsequent senior-manager delivery

1. Expand the initial two-case Neon evaluation against actual business expectations, including conflicting priorities, missing facts, injection attempts and cancellation. A deployed connection and real company data require their own approved envelope.
2. Add proposal records with exact changes, fresh business-rule validation, outcome tracking and idempotent execution. Define which routine actions may run under standing Owner authority and which need a decision each time.
3. Add scheduled monitoring with explicit triggers, a bounded run budget and an Owner review queue. Investigations should follow outcomes rather than repeatedly raise the same unresolved item.
4. Add broader business sources only when their permissions and data quality are established. The current staffing/attendance context does not establish cash flow, sales, inventory or external market knowledge.

Further evaluation should continue with fictional business cases before company data: an uncovered shift with an unavailable candidate, two different position shortages, a changed published schedule after an earlier answer, incomplete staffing data and a proposed plan that conflicts with saved priorities. Check that the model investigates, cites dated facts, explains a realistic alternative and contingency, asks for missing information when needed and does not invent execution. The two pilot questions are initial evidence only; this broader matrix has not been completed. Passing transport/database tests alone cannot establish that the advisor is smart enough for operational use.

## Director positions and release impact

Product supports the investigation foundation toward Jose's senior-manager goal. Engineering reuses existing operational and scheduling services rather than implementing separate eligibility rules. Security requires current server-side Owner/company authority and minimized tool context. Governance keeps live spending, data activation, release integration and production authorization separate. No policy exception or production authorization was granted.

Live fictional demo answers are verified within Jose's $5 allowance. Product supports broader operational evaluation next; Engineering/CISO/Governance support this bounded pilot with its fixed ledger, minimized fictional data, invoke-only credential and expiry. Publishing/integration and any real-data/deployed activation need their own direction. Hosted CI has not run for this local feature branch. Independent UI/QA certification and production authorization remain separate; this increment adds no R1 acceptance gate.

## Implementation decisions made within the authorized scope

- Jose's product confirmations and request to start building authorize this bounded development increment without another design-approval round. Live activation and release decisions remain separate. If the chosen increment misses Jose's priority, the cost is development rework before integration.
- Preserve the existing UI preview and create an isolated feature worktree from current development. If this isolation was unnecessary, its cost is temporary local disk/runtime use; it preserves the prior deliverable and concurrent work.
- Add explicit Neon and optional OpenAI adapters after Jose preferred Neon, using the documented compatible route and validating its host. If gateway behavior changes, its cost is an adapter update; no live data or credit was used to make the choice.
- Keep screen/controller size and minor test-style observations as explicit follow-up rather than broaden the final correctness fix into a refactor. The cost is maintainability debt; a future responsibility-based split should preserve the verified state machine.

Official references checked October 22, 2026: [Neon overview](https://neon.com/docs/ai-gateway/overview), [Responses endpoint](https://neon.com/docs/ai-gateway/openai-responses), [data retention](https://neon.com/docs/ai-gateway/data-retention).
