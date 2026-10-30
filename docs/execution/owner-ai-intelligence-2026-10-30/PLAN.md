# Owner AI reasoning backend implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Preserve this plan's ledger and evidence, including failures.

**Goal:** Make the existing bot backend support broader Neon models and evidence-checked operational decisions without chat-design work.

**Architecture:** A provider wire adapter preserves the current bounded loop and public response. A local decision tool validates references to fresh canonical reads and renders an accepted recommendation; it grants no business authority.

**Tech stack:** Existing TypeScript/Next, PostgreSQL, Vitest and owned browser runtime; no new dependency.

**Spec:** docs/execution/owner-ai-intelligence-2026-10-30/SPEC.md

## Global constraints

Base8d948736, detached worktree. Claude owns chat design. Preserve original activation/data/provider/authority/recovery controls and management behavior. No real model call, runtime environment change, production configuration, business execution, notification, background work, release or shared-branch integration. Only the already authorized `AI-owner` branch may receive this increment. Keep all old artifacts and ledgers.

## Review focus

1. Non-OpenAI models need correct Chat Completions tool definitions/results and content-block handling, without unsupported Gemini parameters. Task1 wire tests exercise actual outbound bodies and normalized responses.
2. A forged source ID, stale conversation, partial read or separately eligible coverage option must not become a verified joint decision. Task2 uses real decision parsing/validation and hand-derived coverage fixtures.
3. Multiple returned calls, duplicate identities, malformed late items and review correction must stay bounded and cannot execute an unauthorized tool. Task1/2 test complete-turn validation before tool effects.
4. Review failure, provider delay, authority loss or an unavailable notebook must retain request identity and settle without storing an invented successful answer. Task3 uses owned SQL service and existing browser cases.
5. A longer conversation/tool transcript must fail before an oversized outbound request, with no model fallback/retry or extra inference. Task1/2 test aggregate input and fixed limits; full checks preserve inherited behavior.

### Task1: provider protocols and bounded conversation

Files: `config.server.ts`, new `provider.server.ts` and `provider.test.ts`, `loop.server.ts`, focused existing tests as needed.

Interfaces: `ProviderConfig` adds optional `apiStyle: "responses"|"chat_completions"` and optional `reasoningEffort: "low"|"medium"|"high"`; omitted style remains Responses for existing internal callers. `providerBody(config,instructions,input,tools): string` builds a bounded wire payload. `providerItems(config,output): Record<string,unknown>[]` validates a complete turn and normalizes calls/text. Keep `investigate`/`Transport` signatures.

- [ ] Author failing configuration, chat content/tool continuation, refusal/incomplete/malformed/duplicate call, encrypted Responses, effort and aggregate-cap regressions. Observe and preserve RED.
- [ ] Implement adapter/configuration and integrate into existing loop. Check full turns before tool effects, preserve no-redirect/cancellation and existing per-call budgets. Focused protocol/Owner tests expected PASS.
- [ ] Commit code/tests and ledger actual results.

### Task2: evidence-based decision tool

Files: new `decision.ts`, `decision.test.ts`, `intelligence.test.ts`; `loop.server.ts`; existing tool-list expectation only where needed.

Interfaces: `DecisionEvidence {id,call,result}` is investigation-local. `reviewDecision(arguments,evidence)` returns bounded correction codes or accepted rendered text. `decisionTool` is a strict provider function definition; it is never added to `AdvisorTools`, `inspect` or a business writer. Local review attempts consume the existing eight-slot budget and are capped at two.

- [ ] Author failing real-loop scenarios for option comparison, canonical plan choice, missing/partial evidence, Spanish, blind malicious source text, rejected-review correction/bypass and review/cancellation budgets. Observe RED.
- [ ] Implement strict parsing/reference/scope checks and clear model operating instructions. Preserve existing prose for simple answers, exact public contract, current task evidence and server-owned plans. Focused intelligence/legacy Owner tests expected PASS.
- [ ] Commit code/tests and ledger results.

### Task3: real service regression, independent review and delivery

Files: new `intelligence.integration.ts` alongside all existing Owner suites; this handoff directory only for final documentation/interface contract/evidence indexes.

- [ ] Write real PostgreSQL service tests before changes they require: fictional Neon Chat Completions tool/decision continuation, exact replay without inference, malformed decision failure, stale/revoked authority, private notebook context and no business mutation. Run tests and preserve results.
- [ ] Freeze application source; run focused and full default unit suite, complete Owner SQL, three original browser suites, activation sentinels, whole TypeScript/ESLint/whitespace. Read actual results, retain failures and diagnose first causes before reruns.
- [ ] One fresh whole-change code/security/QA reviewer checks spec/plan/diff and boundaries. Remediate material findings with RED→GREEN and affected gates; do not self-close independent findings or UI-M1.
- [ ] Commit docs with backend interface guidance for Claude, truthful verification, remaining live-model/hosted conditions and exact state. Preserve ledger/evidence in a new artifact. Publish to `AI-owner` only with an exact expected-head check and verify GitHub tree/head. No merge/deploy.
