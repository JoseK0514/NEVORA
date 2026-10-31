# Backend source map

Accepted application: `8731362fcc05871db23fd303c311aa04d3a4dded`. Delivery adds docs only. All paths below are relative to `src/lib/owner-advisor/` unless noted.

| Responsibility | Source / interface |
| --- | --- |
| Existing activation/data/provider/host/model/daily-limit gates, plus explicit dialect and optional Responses effort | `config.server.ts`: `readConfig`, `ProviderConfig`. Omitted `apiStyle` remains Responses for existing internal callers. |
| Bounded wire body and complete-turn normalization/preflight | `provider.server.ts`: `providerBody(config,instructions,input,tools): string`, `providerItems(config,output): Record<string,unknown>[]`. Chat uses system/messages/function definitions and causal assistant/tool messages; Responses keeps encrypted stateless continuation. |
| Fresh read evidence, current goal/task context, original bounded orchestration and accepted answer | `loop.server.ts`: unchanged `investigate` / `Transport`. Mandatory company briefing and scoped-task reads remain; local review is not exposed through `AdvisorTools` or `inspect`. |
| Strict concise decision schema, reference/partial/freshness/choice checks and source-owned rendering | `decision.ts`: `DecisionEvidence`, `decisionTool`, `reviewDecision`, `decisionEvidenceSummary`. Accepted internal result carries selected `WorkflowEvidence`, not a new public chat contract. |
| Existing authority, reserve/replay/fail/settle, private memory and canonical reads | Unchanged `authority.server.ts`, `service.server.ts`, `store.server.ts`, `notebook*.ts`, `tools.server.ts`, `coverage-plan.server.ts`, `period-review.server.ts`. |
| Existing finite private transport/display lifecycle | Unchanged `src/components/owner-advisor/{controller,lifecycle,public-response}.ts` and route `src/app/api/owner/advisor/route.ts`. |
| New protocol/decision contracts | `provider.test.ts` (32), `decision.test.ts` (16), `intelligence.test.ts` (24). Existing `loop.test.ts` pins full-batch preflight; `adversarial.test.ts` retains explicit capability inventory with local review. |
| New actual service/PostgreSQL cases | `intelligence.integration.ts` (8), discovered by existing Owner SQL configuration. Uses fictional wire replies, real guarded service/SQL and original disposal. |
| Hand-authored fictional decision values | `src/test/fixtures/owner-decision.ts`; no live-model sample or production data. |

Period evidence identity uses tool plus start/end dates, independent of presentation language. A later identical-scope read supersedes an older read. Canonical whole-ledger coverage fingerprint changes/unavailability also retire older coverage choices across dates. Different current periods can be compared; only an unambiguous selected period/proposal set attaches its single public workflow card. No recommendation/unrelated references attach none; ambiguous sets emit a source-owned explanation. Plain-answer attachment behavior remains compatible.

Bounds:6 provider turns;8 combined read/review slots including the mandatory briefing;2 decision attempts;20s per provider call and60s overall;131072-byte response stream;48000-character individual context;262144-character aggregate request;12000-character public answer. The4096 output bound uses `max_output_tokens` for Responses, `max_tokens` for Neon unified Chat and `max_completion_tokens` for native OpenAI Chat. Unicode request lengths are JavaScript string units; these are not token/dollar/hosted-latency guarantees.

Complete-turn preflight rejects unknown shapes/capabilities, same-turn duplicate identities, explicit non-completed item status, over-budget batches and a decision mixed with reads before any sibling executes. Omitted item status remains compatible. Across-turn global call-ID uniqueness is an independently recorded, unproven compatibility question; no global uniqueness requirement was invented. Caller/authority checks still surround awaited results, and accepted decisions perform a final check before return and original guarded settlement.

No new package, migration, chat component/style, route, generation engine/store/harness, business action, production setting, notification or monitoring job changed. Actual frontier-model competence and provider compatibility remain the separately authorized live evaluation described in MODEL-EVALUATION.md.
