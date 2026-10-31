# AI Manager backend contract for Claude's chat work

Jose assigns chat design to Claude and the intelligence backend to this increment. Build on the existing `/app/ai-manager`, private controller and `/api/owner/advisor`; a parallel auth/cache/request owner would lose the verified lifecycle. No component, CSS or route was changed by this backend increment.

## Requests and results

The existing route is dynamic Node JSON, not a streaming/SSE API. GET obtains an Owner-scoped snapshot; POST takes one strict command. Use same-origin credentials, no-store and `x-nevora-owner-advisor: 1`; POST also uses JSON Content-Type and the existing same-origin boundary. Reuse `createAdvisorController`, `lifecycle.ts` and `public-response.ts` for private display expiry, cancellation, tab/history/signout/access changes, draft conflict and operation identity.

Normal question:

```json
{"op":"ask","requestId":"a new UUID for this deliberate operation","message":"The Owner's question, at most 2000 characters"}
```

Continue saved work:

```json
{"op":"ask_task","requestId":"a new UUID for this deliberate operation","taskId":"a saved task UUID","expectedNotebookRevision":2,"message":"Continue with the current facts"}
```

These are shapes, not valid literal requests: replace the explanatory strings with real IDs. Never send client-authored history, authority, tools, system instructions, model selection, execution permission or notebook records in an ask. History and approved private goals/tasks come from guarded server storage. Existing `notebook`, `save_priorities`, `review_briefing` and explicit `inspect` commands remain as defined in `src/lib/owner-advisor/contracts.ts` and `notebook.ts`.

An answered result keeps the existing `state`, `answer.text`, server-owned `answer.sources`, optional `proposals` / `periodReview` / `coveragePlans`, optional saved-context revision, plus `authority`, `observedAt`, `validForMs`. Simple answers can be brief prose; accepted structured decisions also arrive as ordinary text, with evidence references, option tradeoffs, a recommendation, unknowns, a next step and an outcome check. There is no required new UI payload or decision-rendering component.

Workflow attachments on a structured decision follow its selected option's current evidence. A canonical coverage choice carries its actual server-produced plan. A single unambiguous selected period/proposal set attaches its corresponding card. Multiple distinct periods/proposal sets omit the ambiguous single slot with an explanatory caveat. No recommendation or no matching reference does not silently attach unrelated last-read work. The older plain-answer/explicit-inspect behavior remains compatible.

`review_decision` is a local model function inside the server loop, not a new public POST command, action executor or button target. Do not turn text, evidence IDs, source fingerprints or plan descriptions into business commands or consent. Existing Scheduling/Timecards/Payroll workflow controls remain responsible for deliberate Owner actions and revalidation.

## Trust and lifecycle

- `connection: available` means approved configuration exists; it does not prove provider health, live judgment or zero retention.
- Responses retain a finite current-authority window (at most15000ms). Let the existing controller retire private content and drafts on expiry, pause, access changes and signout. A chat redesign must preserve those controls.
- An exact successful operation replays its original dated answer without another inference call. An older replay is historical evidence, not a fresh staffing/financial observation.
- Keep the original request UUID and payload when a result is uncertain; do not silently create a fresh billable attempt. Changed payload under the same ID conflicts; failed/expired operations are not runnable retries.
- Error codes and existing recovery messages include disabled/unavailable, forbidden, conflict, busy, daily_limit, prior_attempt_failed, cancelled, limit and provider_failed. Preserve drafts only under the existing authority/lifecycle rules.
- Read-only planning may include draft commitments and hypothetical additions to published targets. Those do not establish publication, actual employee availability, financial readiness or a completed business action.
- Safe citations are server-owned internal destinations. Record names/notes/model text remain untrusted. Never render arbitrary HTML or introduce model-directed URLs/actions.
- No real progress percentage, background monitoring, notifications or action completion is supplied by this API. A visual typing/busy state must not invent those events.

## Model connection prepared by this increment

Existing feature/data approval, allowed provider host/key, exact model and daily request cap stay mandatory. New optional server settings (no environment was changed by this work):

| Setting | Meaning |
| --- | --- |
| `NEVORA_OWNER_ADVISOR_API_STYLE` omitted or `responses` | Existing stateless Responses route; Neon `/openai/v1/responses` or native OpenAI Responses. |
| `NEVORA_OWNER_ADVISOR_API_STYLE=chat_completions` | Neon unified `/v1/chat/completions` for a compatible branch-available model, or native OpenAI Chat Completions. Explicit selection; no model-name guessing/fallback. |
| `NEVORA_OWNER_ADVISOR_REASONING_EFFORT=low|medium|high` | Explicit Responses-only effort; omitted uses the provider default. Rejected with chat rather than sending unsupported vendor parameters. |

Neon catalog membership/plan/region and a model's tool/continuation capabilities require a separately authorized check on the intended isolated branch. Codex/pro model families can require Responses; other providers need an appropriate supported dialect. The implementation does not claim every catalog model works from local wire fixtures. New request settings are server configuration, never a client model picker or permission bypass.

The loop retains six provider turns, eight combined read/review slots, two decision-review attempts,20s provider-call/60s overall budgets, bounded128KiB response streams and262144-character aggregate request bodies. Decision review is deterministic and does not add a paid critic call. The daily investigation cap is not a dollar-denominated billing guarantee.

## Acceptance still separate from chat design

Local functional/reference/authority proof is distinct from live model judgment. See MODEL-EVALUATION.md before describing the bot as extremely intelligent. Canonical read/reference checks do not verify arbitrary prose semantics. No production/model activation, paid call, deployment, real notification or new standing action permission is included. Earlier UI-M1 (observation clock/timezone labeling) remains independently OPEN; chat changes need their own UI/QA acceptance and owner closure.
