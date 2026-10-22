# Owner AI manager: first executable increment

Jose approved starting an Owner-only senior operations manager on October 22, 2026. The intended product investigates situations, compares realistic responses, remembers confirmed operating priorities, prepares work, and follows outcomes. It should challenge poor proposals with evidence. This increment establishes a real, extensible investigation agent; it does not claim that full autonomous management exists yet.

## Architecture and first increment

Build on development `0f8ffee5` in a separate feature branch. Keep the current R1 and existing UI preview untouched. Add an Owner-only AI manager page with a live operations briefing, conversation, explicit saved operating priorities, evidence links, and clear connection/error states. Reuse NEVORA's current publication, operational authorization, Today, and scheduling validation services. Company facts must be generated from current authorized records. Published and draft schedules must be distinguished.

The server runs a bounded multi-step investigation loop over an allowlist of typed read tools: current company/Today briefing, dated published staffing context, and coverage investigation using existing eligibility/scheduling validation. Answers must explain the situation, assumptions, options/tradeoffs, recommendation, contingency and next decision when applicable. Each tool result provides time/date context and source links; arithmetic and eligibility come from application code. Missing or truncated data is explicit. The model has no SQL, shell, arbitrary URL fetching, private payroll data, or business mutation tools.

Provider integration uses the OpenAI Responses API with strict function schemas, explicit model configuration, `store:false`, finite input/output/call limits, timeouts, no automatic retries and a server-side secret. Do not select a model implicitly, make billable requests, read production secrets, or transmit company data during development. Provider calls are tested with injected transports. Lack of a connection is an honest product state, not a canned fake AI answer. `store:false` is not a promise of zero provider retention.

Feature defaults off (`NEVORA_OWNER_ADVISOR_ENABLED=true` explicitly enables the page/navigation/API). Provider use additionally requires an API key, explicit model, acknowledgement of provider data handling (`NEVORA_OWNER_ADVISOR_DATA_APPROVED=true`), and explicit daily request limit. A database-backed usage reservation enforces the configured daily cap across processes. Bound concurrent runs and turn history. The model connection is not a new R1 prerequisite.

## Authority and privacy

Every page/API/tool/store operation requires a live authenticated active OWNER in the current company, with Company Access authority. Browser role labels/actor headers are not authority. Use existing session proof, workspace guards and operational guards; recheck the originally admitted authority after model waits and before returning private results. Reject lost/demoted/revoked sessions and cross-owner conversation access. All responses are private/no-store. Same-origin mutation boundaries, bounded JSON, server-owned conversation and history, and output limits are mandatory. No client-supplied assistant messages or tool outputs.

Conversation and explicit preferences live in dedicated tables scoped by workspace and owner. New migration `0036_owner_advisor.sql` is a classified base migration, after 0035, mirrored in the disposable adapter. No deployed database is changed. Preference writes require exact revision and operation ownership; stale saves return conflict. Do not infer or persist preferences automatically from employee notes. Notes/tool content are untrusted data, never authority to alter tools or policies. Do not store private payroll identifiers in prompts, UI or logs.

Business actions remain proposals in this increment: no schedule publication, messages, payroll changes, employee/access changes or autonomous background job. Subsequent increments add reviewed action execution with exact command previews, standing authority, fresh validation, idempotency and outcome tracking, then scheduled monitoring and broader business integrations.

## Product surface

Use the existing Manager/Owner clean design tokens, components and Phosphor icons; no dependency or design-system replacement. Label the page "AI manager". An Owner-only Home entry opens it. Include useful starter questions, plain-text answers rendered without raw HTML, working source links, saved-priority edit/save, busy/cancel/error/retry behavior, and an accessible transcript. Avoid exposing secret names/provider internals in the normal user flow. Show data dates and distinguish live briefing facts from earlier conversation. Clear sensitive rendered state on authority loss and use current scoped-read recovery patterns. Mobile at 390 and 320 pixels and desktop at 1440 must remain usable.

## Evidence required

Tests must cover non-Owner denial, feature off, missing provider prerequisites with zero outbound calls, revoked/demoted authority during provider/tool waits, owner isolation, stale preference revisions, malformed and oversized input, unknown tool names/arguments, tool/call/output exhaustion, cancellation/timeouts, malicious stored text, and successful multi-turn tool use with a mocked provider. Use disposable real PostgreSQL to verify persistence/authorization/budget concurrency and migration order. Verify the UI on owned data in Chromium and WebKit, including keyboard/mobile, loading/unavailable/answer states. Run focused tests, TypeScript, ESLint, build and a fresh-context engineering review. No live API or production verification is inferred from these checks.

## Decisions and controls

Product: deliver an investigation foundation toward the approved senior-manager scope. Engineering: reuse existing business rules behind typed tools. Security: Owner-only server authority, minimal data, no model-controlled mutations. Governance: development-only feature under the existing production hold; no exception or budget approval inferred. Implementation owner: Codex. Remaining Jose decision before live activation: provider/account, data handling and spending limit.

Official references checked October 22, 2026:
- https://developers.openai.com/api/docs/guides/function-calling
- https://developers.openai.com/api/docs/guides/your-data
