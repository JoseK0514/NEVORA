# Independent UI investigation — QA-AT01

UI recommendation: **NO-GO for closing QA-AT01. Cause remains unresolved.** This is a read-only causality assessment, not a new runtime certification. No demonstrated product UI defect or corrective patch is established by this review. The earlier Owner UI-1 closure is separate and unchanged.

Reviewed checkout: `/Users/josek0514/.codex/worktrees/owner-ai-integration-20261023/Fuel Scheduler`, clean HEAD `328822972cc600b1b0af5759406fc3528561cb93`. Installed framework sources are Next 16.4.2 / React 19.3.0. No application, test, index, HEAD, global preference, or runtime changes were made. No app/browser/database runtime was started, and none needs closure from this reviewer. The ULW status command reported `ULW_LOOP_PLAN_MISSING`; evidence therefore uses the caller's external directory.

## Findings

**VERIFIED — historical failure, not its cause.** I read the retained WebKit 390 cell report and browser-failure-report, not only summaries. The last action is a server-action POST at 23,830 ms in `unavailable-retry`, with no document navigation. The last recorded lifecycle event is at 22,917 ms. Eight prior checks are recorded; `runtimeErrors` is empty. The failed assertion waited 15,000 ms for a visible role alert containing `Confirmation unavailable.`. That establishes failure to observe the expected alert within the criterion. It does not establish that the request remained pending, rejected, returned a different result, or was ignored by a retired component. The historical observer did not capture response completion. The existing earlier unknown-state screenshot is not evidence of the later lock failure; I did not substitute it for missing final-state evidence.

**VERIFIED — this is not the previous immediate pagehide assertion.** The current scenario explicitly waits for private intent detachment after synthetic pagehide, then performs fresh schedule/login/schedule navigation before acquiring the operations-table lock (`scripts/phase-e-attention-browser-scenarios.mjs:85–93`). The unavailable assertion itself polls for a visible DOM result. Adding a generic render wait or extending its timeout would not identify the cause. A `networkidle` boundary is not proof of React hydration/commit readiness, but the recorded server-action POST proves dispatch occurred; failure to click alone cannot explain this incident.

**VERIFIED — distinct component outcomes need distinct evidence.** `src/components/employee-weekly-confirmation.tsx:14–37` has these paths:

| Observed action/component condition | Source behavior | Evidence needed in the failed cell |
|---|---|---|
| Promise still pending | Transition can retain Confirming state; no component-local deadline settles it | Scoped button state plus correlated action request and response completion, then server-stage timing |
| Promise resolves `unavailable`, same generation | Schedules expected retry alert | Semantic result status, active generation, and DOM commit timing |
| Promise rejects, same generation | Schedules outcome-unknown alert | Safe rejection classification and unknown alert; HTTP status alone is insufficient |
| Generation changes before response | Ignores response or rejection | Component instance/generation, cleanup reason and result-discard event |
| Resolves blocked/conflict/committed | Different alert/status/refresh behavior | Safe semantic status plus exact current visible state |

**RISK — browser lifecycle logs do not cover every retirement path.** `blur`, `pagehide`, and hidden visibility retire the generation and schedule blocked UI. Effect cleanup also increments the generation, and depends on `[router]`; it is not recorded by the browser lifecycle observer. The page keys the component by `intent.operationId` (`src/app/app/schedule/page.tsx:198`); a new canonical unconfirmed weekly read issues a new random intent (`employee-weekly-review.server.ts:56`, `employee-attention-receipts.server.ts:20`). Thus a refresh can remount it without a document navigation. Installed `useRouter()` memoization depends on both router and contextual BFCache id (`node_modules/next/dist/client/components/navigation.js:145–172`), so assuming the object can never change is also unjustified. These are source-supported possible paths, not evidence that any occurred after the failed submit.

**VERIFIED — ordinary unavailable completion does not itself require that refresh.** `acknowledge-actions.ts:28` returns noncommitted results before `revalidatePath`; the client refreshes on committed results or a focus event, not on unavailable. Installed Next's action handler skips page rendering when no path was revalidated (`node_modules/next/dist/server/app-render/action-handler.js:947–966`); its reducer resolves the result and returns existing router state when there is no redirect, revalidation, or Flight data (`.../server-action-reducer.js:212–272`). Therefore “server actions always rerender the page and replace the intent” is not an adequate causal explanation for this case. An actual refresh/revalidation/remount needs evidence.

**RISK — database bounds are not a measured end-to-end UI deadline.** The operations SELECT precedes mutation dispatch in `commitAttention`; specified SQL lock/cancellation codes map to unavailable (`employee-attention-receipts.server.ts:91–137`). The 8-second signal starts inside this function, after action authorization/proof acquisition. Server-action queueing, authorization, transport/RSC decoding and React commit are outside a simple 1.5-second lock-timeout claim. The component does not impose its own timeout on the action promise. This explains why static timeout constants alone cannot exonerate the transport or convict React. It is not proof of an actual unbounded wait in this incident, nor a recommendation to fabricate a known-uncommitted outcome after a client timeout.

**ISSUE — diagnostic evidence is improved but not complete for UI attribution.** Current scenario lines 25–28 capture safe response/finished/failed events, and lines 94–105 preserve failure DOM booleans, grouped database waits and screenshot before releasing the lock, then rethrow the original error. The assertion remains 15 seconds. Important limits remain:

- Events use mutable stage and lack stable per-request correlation; late responses after a stage transition can be omitted. Request failure records do not identify a safe failure category.
- HTTP 200/finished is not the semantic action result or a React state commit. RSC/application results and redirects can use successful HTTP status.
- Failure snapshot has unavailable/unknown/blocked, but no conflict classification, component instance/generation, or original-operation equality. Operation equality is checked only after the expected alert succeeds.
- The first `button[aria-busy]` is global rather than scoped to the confirmation form. Authority count alone cannot distinguish preserved original intent from a replacement intent.
- A single snapshot after timeout, followed by separate database/screenshot observations, can reflect later state. Each checkpoint needs its own relative timestamp for timing attribution. Grouped DB waits do not identify this action's SQL progress.

This is an instrumentation limitation, not a proven product rendering defect. No secret, authority value, raw session proof, SQL parameter, or RSC payload needs to be exposed to close these gaps.

## Discriminating evidence and closure

Preserve the original 15-second criterion and real table lock. Correlate one opaque request id through request/response/finished/failed; capture a safe semantic result enum and server stage durations if available. Record confirmation DOM state and **same original operation boolean** at submission and failure, with snapshot timestamps. For a recurrence with completed response but missing alert, capture instance/generation/cleanup/result-delivery/commit boundaries using bounded test-only observation, without changing product behavior. Focus/visibility/route and conflict state improve the failure snapshot.

A request not completed by the deadline leaves transport/server/action-queue investigation open; a completed HTTP response alone does not localize the bug. A decoded unavailable result in the same active generation with no expected DOM commit would support UI/render investigation. A changed generation or intent before result delivery supports a retirement/remount investigation, but still requires its trigger and intended privacy behavior to be assessed. A rejected action with unknown alert supports a transport/decoding path rather than a missing unavailable rendering path. Eventual unavailable after the deadline is still a failed timing criterion.

A green diagnostic cloud run demonstrates that run's scenario passed. It does not establish a cause or corrective fix for the retained failure. Closure requires an evidence-backed cause and correction (product, harness, or environment), a focused regression that discriminates the cause, and the relevant exact-source gate passing without weakening the original criterion. If the failure does not recur, report that limitation explicitly rather than converting lack of reproduction into a root cause.

I read the QA investigation and diagnostic-publication reports as context. Their local 14-cell green result is not represented as my runtime execution or independent UI closure. New workflow 40005779835 was in progress when assigned; this report makes no claim about its outcome.

## Artifact references

- `ui-attention-readonly/source-custody.json`: reviewed source SHA-256 values, clean HEAD and no-runtime declaration.
- `ui-attention-readonly/historical-timeline-extract.json`: selected raw historical action/lifecycle/failure data with origin.
- `cloud-pr-corrected/phase-e-browser-93b38fec015824b625f183fbfef4779b206f6880-attention/nevora-phase-e-browser-evidence/attention-webkit-390-report.json`: original cell report.
- Same directory `browser-failure-report.json`: original 15-second failure.
- `reviews/qa-attention-93b38fec-investigation.md` and `reviews/qa-attention-4789a761-diagnostic-publication.md`: independently read contextual reviews, not substituted for raw artifacts.
- `ui-attention-readonly/qa-at01-manual-qa.md`: explicit scope/matrix; no new runtime passes claimed.
