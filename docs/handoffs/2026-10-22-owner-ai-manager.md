# Owner AI manager: development increment

Implementation owner: Codex. Development base: `0f8ffee52d85f48cd2fe890dc9aa682e995de4eb`. Feature branch: `codex/owner-advisor-20261022`. This feature is separate from R1 acceptance and defaults off. Neither development/main integration nor production activation is authorized by this work.

## Delivered scope

The investigation service combines current company context, dated published staffing and coverage analysis using NEVORA's existing scheduling rules. It can compare options using those facts and the Owner's explicitly saved priorities. Published staffing and current scheduling commitments, which can include drafts, carry different labels. Position-specific coverage recommendations retain the applicable position.

Company data, conversation and saved priorities require an active Owner with current Company Access authority. The server rechecks that original authority after asynchronous work. Another role cannot gain access through a URL, browser role label or client-provided identity. Preferences and history are isolated by workspace and Owner.

This increment proposes decisions. Schedule publication, employee messages, payroll, access changes and autonomous background work are subsequent work; there is no business mutation tool in this agent.

Interface and final validation evidence will be recorded below when complete. The design and task checklist are in `docs/superpowers/specs/2026-10-22-owner-advisor-design.md` and `docs/superpowers/plans/2026-10-22-owner-advisor.md`.

## Connection and activation

Jose prefers Neon AI Gateway. The implemented adapter uses a validated branch-scoped Neon HTTPS host and `/openai/v1/responses`; this route supports OpenAI models. Optional direct OpenAI uses the same bounded investigation protocol. No gateway was provisioned, credit purchased, secret retrieved or paid inference requested during this work.

Read-only connected metadata verified that NEVORA is in `aws-us-east-1` and belongs to VELANI LLC (MAIN), which has a Launch plan. That meets the documented account/region prerequisites. Gateway activation, prepaid credit balance and actual inference remain unverified. Configuration availability is not an authenticated connection test.

The page/navigation/API require `NEVORA_OWNER_ADVISOR_ENABLED=true`. Without provider configuration, the live briefing and explicit priorities remain useful while Ask is disabled. Live requests additionally require all of:

- `NEVORA_OWNER_ADVISOR_DATA_APPROVED=true`, following review of provider data handling.
- `NEVORA_OWNER_ADVISOR_PROVIDER=neon` and an explicitly selected `NEVORA_OWNER_ADVISOR_MODEL`.
- Server-side `NEON_AI_GATEWAY_BASE_URL` (bare official branch HTTPS host) and `NEON_AI_GATEWAY_TOKEN` in the existing approved secret store.
- `NEVORA_OWNER_ADVISOR_DAILY_LIMIT` from 1 to 100. This is a request cap, not a guaranteed dollar ceiling; model selection and provider-side credit limits determine cost.

Before live activation, Jose still needs to select a spending limit and approve the provider's handling of the authorized operational data. Use a non-production branch/account context for the first controlled inference check. Inspect its actual result, tools, usage and cancellation before considering a deployment. No production permission follows from branch location or a passing local test.

`store:false` is sent to the Responses endpoint. It does not promise zero provider retention: Neon/Databricks documents up to 30 days for abuse/security handling. The agent excludes private payroll identifiers and contact details from its tool outputs. Names and operational shift/eligibility context are still company information.

## Controls and practical limits

The server admits only its own conversation, explicit Owner priorities and typed operational read tools. Stored notes and model output are untrusted. The model has no SQL, shell, arbitrary URL or unrestricted application access. Responses are plain text; supporting links come from server metadata.

An investigation is bounded to 60 seconds, six model rounds and eight total read-tool calls, including the required current briefing. Individual provider calls have a 20-second timeout. Responses and answers have byte/character ceilings; truncated operational data is explicit. No automatic provider retries run.

PostgreSQL enforces one active investigation per workspace and a workspace-wide UTC daily request cap across server processes. Failed attempts count. Operation IDs and payload hashes prevent duplicate execution; failed or uncertain IDs cannot silently restart a charged run. A 65-second lease lets a crashed process release its running slot.

Conversation retention is bounded to 12 messages and six completed answer receipts containing text. Older operation IDs keep their hash/status to prevent repeat charges, without keeping their old answer text. Explicit priorities persist until changed. Usage/failed-request metadata and preference operation receipts do not yet have automatic age deletion; backups follow the deployment's existing retention policy. Do not describe this as zero-retention storage.

Migration `0036_owner_advisor.sql` is a classified base migration after 0035. Only owned disposable local PostgreSQL has applied it in this work. A deployed database has not changed.

## Verification record

Backend fix commit `22b5fdc2` has 23 passing focused tests (including HTTP cancellation/deadline and migration classification) and 19 passing real disposable PostgreSQL tests. TypeScript and focused ESLint passed. Provider responses were injected for those tests; this proves the application protocol, authorization, persistence and limits, not live model recommendation quality.

Initial engineering review found handler-body timeout/cancellation, missing position identity in coverage groups and unreadable compressed code. The implementer added regression cases, fixed the behavior and formatted the module. The scoped re-review and final interface/whole-feature evidence remain to be recorded.

## Subsequent senior-manager delivery

1. Connect the selected Neon model with an approved cost/data envelope; evaluate representative staffing problems against actual business expectations, including conflicting priorities and missing facts.
2. Add proposal records with exact changes, fresh business-rule validation, outcome tracking and idempotent execution. Define which routine actions may run under standing Owner authority and which need a decision each time.
3. Add scheduled monitoring with explicit triggers, a bounded run budget and an Owner review queue. Investigations should follow outcomes rather than repeatedly raise the same unresolved item.
4. Add broader business sources only when their permissions and data quality are established. The current staffing/attendance context does not establish cash flow, sales, inventory or external market knowledge.

## Director positions and release impact

Product supports the investigation foundation toward Jose's senior-manager goal. Engineering reuses existing operational and scheduling services rather than implementing separate eligibility rules. Security requires current server-side Owner/company authority and minimized tool context. Governance keeps live spending, data activation, release integration and production authorization separate. No policy exception or production authorization was granted.

Next gate: complete the interface, observe it on owned data, finish fresh-context engineering review and publish the reviewable feature branch. Independent UI/QA certification, hosted CI and production behavior are separate evidence states.

Official references checked October 22, 2026: [Neon overview](https://neon.com/docs/ai-gateway/overview), [Responses endpoint](https://neon.com/docs/ai-gateway/openai-responses), [data retention](https://neon.com/docs/ai-gateway/data-retention).
