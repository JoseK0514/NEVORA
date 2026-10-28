# Calendar independent code review

- codeQualityStatus: WATCH
- recommendation: REQUEST_CHANGES
- Candidate: `0597a6590f683a601ff774e4555fc557fc833a41`
- Base: `a1b62ca68207a0fd3c6de300d55e17b621c9dc47`
- Review scope: all 19 changed files, canonical Calendar HTTP/service/types, responsive owner, unit/render tests, integration/config changes.
- Notepad inspected: `.superpowers/sdd/calendar-plan/progress.md`.
- `omo-agent-toolkit ulw-loop status --json` returned ULW_LOOP_PLAN_MISSING. Required fallback report: `.omo/evidence/employee-mobile-calendar-code-review.md`; external author-owned copy: `outputs/employee-mobile-calendar/reviews/code/CODE_REVIEW.md`.

## CRITICAL

None demonstrated.

## HIGH

None demonstrated in production code. This is not final browser acceptance or release certification.

## MEDIUM

### CR-1: Provider suppression assertion cannot detect the regression it names

Location: `src/components/employee-mobile/calendar.test.tsx:20` (test begins line18); implementation `src/components/employee-mobile/calendar.tsx:38`.

The paused/denied test asserts the absence of `Subscribe in your`. That wording belongs to the incumbent desktop view; the mobile provider heading is `Add to your calendar app`. Consequently this assertion passes even if the entire mobile provider section leaks into paused/denied rendering. The test still meaningfully covers the secret and revoke control, but its claimed provider coverage is false.

Fix the assertion to observe the actual provider section or its accessible links/structure, with a ready-state positive control and paused/denied negative checks. Avoid merely swapping one prose fragment for another if section semantics can be observed. Retain the meaningful private URL/control assertions. Closure requires the focused test to distinguish ready from paused and denied provider availability.

## LOW

### CR-2: Request return casts conceal the read/write relation from the compiler

Location: `src/lib/calendar/client.ts:18`, `:36`, `:53`.

The common request helper returns status-or-receipt, and callers force it to `Ready` or `CalendarManagementResult`. Runtime parsing currently enforces the right result and no bug is demonstrated. A read/write overload or similarly small typed seam would let the compiler preserve the relation without these caller assertions. Nonblocking; do not broaden this into a framework/dependency replacement.

## Evidence gate / blockers

1. Resolve CR-1's false-positive assertion and provide its focused passing run for author-owned closure.
2. Complete the planned actual owned-Next browser acceptance. At inspection, `outputs/employee-mobile-calendar/run-01/calendar/failure.json` reports Chromium timeout waiting for `.em-calendar` visibility at landscape. Only three recorded checks completed; WebKit/Firefox and later original-retry, revoke, lease/session scenarios are not established by this artifact. Diagnose pointer/viewport setup versus product behavior before classifying the failure. A partial log is not a three-engine pass. The browser runner also records three unexpected CSS-preload warnings, which require an explicit scoped disposition if still present at final runtime-message assertion.
3. Full combined-suite and cleanup/custody evidence must be reviewed when available. This code review did not execute broad suites or disturb the live owner.

The browser failure is an evidence limit, not a claimed production defect. No unsupported allegation of permission bypass or duplicate operation was found.

## Independent checks actually performed

- Confirmed clean git status and exact HEAD above before review.
- Read repository AGENTS, Calendar plan, teal specification, progress ledger, package scripts and full change scope.
- Ran `npx vitest run src/lib/calendar/contract.test.ts src/components/calendar-subscription-panel-lifetime.test.tsx src/components/employee-mobile/calendar.test.tsx`: 3 files,44 tests passed; elapsed162ms, start18:47:38. This is a focused independent rerun, not the broader113-unit or70-SQL execution.
- Inspected preserved `.superpowers/sdd/calendar-plan/task1-red.log` (7 failing tests), `task2-red.log` (5 failing tests), `task2-green.log` (113 passed), `task1-sql-green.log` (70 passed and owned cluster stopped). These establish the recorded runs, not independent reruns by this reviewer.
- Inspected browser `run-01/calendar/failure.json`, integration source and its redaction/cleanup paths. Did not certify visual quality from code or claim native/provider acceptance.

## Correctness and scope observations

The changed owner clears private status/URL before writes and refreshes; header/body waits share a10-second deadline. Cancel increments a sequence fence; pause releases data while retaining original uncertain intent; end clears intent and permanently prevents mounted resume. Appearance storage is ignored while account fences end the owner. Exact operation ID/kind validation and revoke-generation binding precede receipt consumption. Created URLs are admitted only after a new own-authority GET confirms both subscription ID and generation; URL parsing restricts origin/path and removes no data into persistent storage. Original uncertain commands remain immutable through retries;401/403 stop automatic polling and retain the command for later current authorization. One effect depends on authority, not media size.

The only service change is guarded status metadata and boundary parsing: a DB/session-bounded lease and actual existing eligible-location SQL. Existing management/feed lifecycle, role guards, workspace guards, replay and bearer semantics remain in their canonical service. Configuration adds files to existing namespace groups without replacing their prior lists. No added dependency, employee selector, persistent credential, or new source-of-truth engine was found.

## Skill-perspective review

Ran the `remove-ai-slops` and `programming` perspectives after reading both installed SKILL.md files under `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/`, plus the programming TypeScript reference. Also read repository executive routing, CTO, CISO and technical-assurance skills.

CR-1 violates both perspectives' requirement that an assertion detect its named behavior. CR-2 is a low-severity programming-perspective type escape; runtime checks keep it from being a demonstrated correctness failure. No deletion-only test, prompt-prose test, implementation-constant mirror or unnecessary production extraction/normalization was identified. Rendered UI assertions concern observable product guidance/controls rather than LLM prompt wording. Network/database parsing is at an actual boundary and required by this task; it is not speculative validation. The custom hook host is a limited transport/lifetime seam and cannot replace real React/browser resize/focus evidence. Existing repository stack choices take precedence over generic skill preferences for introducing new tools/dependencies.

## Ownership and disposition

Implementation remains with the parent executor. This reviewer owns CR-1/CR-2 findings and subsequent closure. Application/test/config/HEAD/index were not edited. No merge, push, deployment, subscription or customer-data operation was performed. Current recommendation requests the concrete test correction and completion of evidence; no Jose policy decision is needed for those bounded actions.


## Author-owned follow-up: CR-1 CLOSED

Reviewed candidate `fc3a1874937de55d9395a5e5c1ae915fb69252a5` against the previously reviewed candidate. The only committed changes are the mobile test and browser integration test; production behavior is unchanged.

`src/components/employee-mobile/calendar.test.tsx:19` now positively observes the real provider section's accessible label binding in ready state. Line21 asserts absence of that same structure and all three actual provider support-link origins in each paused/denied state, alongside the existing secret and revoke-control checks. These assertions would detect the named section leakage and no longer rely on wording absent from the mobile UI. CR-1 is CLOSED by its original reviewer.

Independent rerun: `npx vitest run src/components/employee-mobile/calendar.test.tsx` — 1 file,5 tests passed, start18:48:48, duration138ms. No source/HEAD/index modifications were made by the reviewer.

The browser change preserves the landscape visibility/no-overflow assertions and adds a native pointer:coarse assertion. Viewport captures replace full-page captures; explicit fixture roles and a narrowly matched, recorded local Next CSS-preload-warning disposition are also present. The progress ledger documents a standalone emulation diagnosis; this reviewer inspected that explanation and source changes but did not independently reproduce the screenshot/emulation fault. Run-01 remains a failure artifact. Run-02 and full combined-suite evidence remain pending. Viewport captures necessarily show less of a tall page; independent UI review must use appropriate scroll-position evidence where needed.

Current status remains WATCH / REQUEST_CHANGES solely pending final browser/combined-suite/custody evidence. CR-2 remains LOW and nonblocking. No open production CRITICAL/HIGH or MEDIUM finding remains from this reviewer.


## Author-owned additional review: CR-3 OPEN — HIGH

Current codeQualityStatus: BLOCK. Recommendation: REQUEST_CHANGES. Candidate `fc3a1874937de55d9395a5e5c1ae915fb69252a5`.

### Expired client authority still admits a command and private URL copy when timer delivery is delayed

Locations: `src/lib/calendar/client.ts:37-41` computes remaining budget but stores no absolute deadline; `:46-50` admits commands from the retained status; `:67-68` admits retry/copy without checking elapsed time.

The sole authority-expiry enforcement is a setTimeout callback. Timers are not exact deadlines: a delayed task queue can leave an expired status/URL in memory until the callback runs, and callbacks from another task source may execute first. Submit and copy only inspect retained state, so they can perform their side effects after the budget has elapsed. Submit also cancels the overdue expiry timer while beginning the POST.

Independent deterministic reproduction ran the actual imported createCalendarClient with a fake network, controlled performance.now and withheld timer delivery. No app source or test was edited. The first read at clock0 returned a100ms lease. At101, before delivery of the armed timer, ISSUE sent a POST. Its fresh confirmation read at101 returned another100ms lease; at202 copy() invoked clipboard.writeText with the retained URL. Output:

```json
{"stage":"read","clock":0,"status":"none","lease":100,"expiryArmed":true}
{"stage":"expired-command-before-timer-delivery","clock":101,"posts":1,"urlRevealed":true,"status":"active"}
{"stage":"expired-copy-before-timer-delivery","clock":202,"copies":1,"urlStillPresent":true}
```

This is a demonstrated client finite-admission failure, not evidence of backend authorization bypass. The POST remains protected by canonical server checks. The clipboard action is local and does not receive any renewed server authorization. Severity is HIGH because this task explicitly promises bounded client authority and release of the private credential, and the reproduction demonstrates a side effect beyond that budget rather than mere type/style weakness. The harness models delayed callback scheduling; it does not claim observed native-device throttling or a particular browser's task ordering. Visual clearing cannot happen while JS is suspended, but synchronous admission can and should enforce the deadline when execution resumes.

Required fix: retain the absolute monotonic expiry derived from the accepted read; check it synchronously before command/retry/copy side effects, release expired status/URL and require current recovery rather than using stale authority. Keep the existing expiry timer for proactive clearing. Add focused regressions that advance the monotonic clock beyond the budget without executing timers and assert zero POST/clipboard side effects; normal fake-timer advancement alone cannot detect this defect. Preserve the original uncertain command through expiration/recovery. No new backend policy or dependency is required.

Reproduction method: `node --import tsx --input-type=module` imported `./src/lib/calendar/client.ts`; setTimeout collected callbacks without invoking them; performance.now used a mutable clock; same-origin fetch returned strict valid100ms status objects and an operation-matching created result; clipboard.writeText incremented a count. Forty microtask turns drained each response before advancing the clock. Initial harness attempt failed on Node's getter-only navigator assignment before exercising the client; rerun defined navigator through Object.defineProperty and produced the output above.

CR-1 remains CLOSED. CR-2 remains LOW/nonblocking. CR-3 and final browser/combined-suite/custody evidence are the current blockers. This follow-up supersedes the earlier statement that no HIGH production finding had been demonstrated.


## Author-owned follow-up: CR-3 CLOSED

Candidate independently verified: `9d8d693dff9478e928cd5ee2dde518cce730bc7a`. Current codeQualityStatus: WATCH; recommendation: REQUEST_CHANGES pending final browser/combined-suite/custody acceptance. No open HIGH/CRITICAL finding from this reviewer remains. CR-2 is still LOW/nonblocking.

Reviewed the actual fix in `src/lib/calendar/client.ts`: cancellation resets validUntil, accepted reads establish an absolute monotonic deadline, and the shared hasCurrentLease guard synchronously expires status/URL before submit (including retry) and copy. Clipboard completion also checks validity before publishing feedback. Expiration preserves pending original intent. Existing proactive timers remain.

Independent rerun of `npx vitest run src/components/calendar-subscription-panel-lifetime.test.tsx`: 19/19 passed at18:50:55, duration141ms. Inspected `.superpowers/sdd/calendar-plan/cr3-red.log`:3 failed/16 passed before the change, including a real clipboard call; inspected `cr3-green.log`:116/116 passed after. The added tests deliberately move performance.now without delivering timer callbacks, so they detect this defect instead of merely repeating ordinary timer expiry coverage.

Reran the independent Node/tsx harness against the actual controller with withheld timer callbacks and a controlled monotonic clock, using the same valid100ms HTTP fixtures as the original finding. The original expired ISSUE now sends no POST. Then a fresh-read/create positive control proves a URL is genuinely present before the expired-copy check. An additional lost-response scenario proves the expired original retry sends no extra POST and retains ISSUE; after fresh authorization the replay body equals the immutable original. Exact output:

```json
{"stage":"original-expired-command","posts":0,"status":"unavailable","urlPresent":false}
{"stage":"fresh-create-control","posts":1,"urlPresent":true}
{"stage":"expired-copy","copies":0,"status":"unavailable","urlPresent":false}
{"stage":"expired-original-retry","posts":1,"status":"unavailable","pending":"ISSUE"}
{"stage":"fresh-original-recovery","posts":2,"sameOriginal":true,"pending":"ISSUE"}
```

This closes the original demonstrated admission bug on the strength of independent behavioral evidence. It does not certify native throttling, the ongoing browser run, the separate UI recovery-reveal issue reported by the parent, or the full combined suite. No application/test/config/HEAD/index edits by this reviewer.


## Final-candidate delta review — browser gate substantiated

Candidate: `5b3979f4f619422d1d26d114f8abb820aad3b7e3`. Independently compared all changes since CR-3 closure: only Employee mobile feedback effect and browser integration coverage changed. The feedback effect now reveals the recovery region when the same pending notice becomes canonically actionable; normal nonpending polls do not trigger it. No new code blocker found. UI finding closure remains with its original independent author.

Inspected `outputs/employee-mobile-calendar/run-04/calendar/result.json`: passed;13 recorded checkpoints per Chromium/WebKit/Firefox,39 total;108 captures (all referenced files exist);54 contrast samples; zero unexpected recorded runtime messages. Inspected `run-04/calendar-browser.log`: one actual three-engine browser test passed,80.87s; owned PostgreSQL cluster stopped. Inspected `run-04/calendar/owned-next-Ws1T7m/ownership.json`: closed=true, sourceVerified=true, mirrorVerified=true. Its source-manifest checkpoint matches this exact candidate. These are directly read runner artifacts; this reviewer did not rerun the live-browser suite or independently certify screenshot aesthetics.

Browser source preserves exact replay/peer/lease/signout assertions and adds native keyboard, actual coarse-pointer checks, and critical controls at200% text without weakening the recovery bounds. Remaining acceptance gate: independent final full combined suite, static checks and QA custody evidence. CR-2 is the LOW nonblocking typed-return observation, not the name of this evidence gate. Current status WATCH / REQUEST_CHANGES until final evidence is supplied.


## CR-3 REOPENED — HIGH: deadline construction can extend the original budget

Candidate remains `5b3979f4f619422d1d26d114f8abb820aad3b7e3`. Current codeQualityStatus: BLOCK; recommendation: REQUEST_CHANGES. The prior closure correctly established synchronous admission when clock accounting had no intervening delay; it did not exercise the separate clock reads used to construct validUntil. That closure is preserved above and superseded narrowly here.

Location: `src/lib/calendar/client.ts:39-40`. Remaining is computed with one performance.now reading; validUntil is assigned using a second reading plus that remaining. Any elapsed time between them is added back to the authority budget. A short session-bounded lease can therefore already be expired when accepted, and subsequent command/copy guards trust the extended deadline. This can arise from thread preemption or GC even though there is no await between the calls.

Independent actual-controller harness with a100ms lease returned monotonic readings0 at request start,0 while calculating remaining,101 while assigning validUntil. The controller published ready at101 and accepted ISSUE then, sending one POST despite the original budget ending at100. Exact output:

```json
{"stage":"after-read","clockReads":[0,0,101],"status":"none","originalBudgetEnds":100,"currentClock":101}
{"stage":"command-after-original-budget","posts":1,"clockReads":[0,0,101,101,101,101,101],"pending":"ISSUE"}
```

This is a deterministic timing-seam reproduction, not an assertion that native GC/preemption was observed. The effect is a real POST beyond the original client budget, not just numerical drift. Server authorization remains canonical and no backend bypass is claimed. Severity retains HIGH because it reopens the explicit finite-admission requirement for a demonstrated expired lease; native frequency is unmeasured.

Required correction: derive one fixed deadline from request start plus returned validForMs, check remaining against the current monotonic clock, and use that same deadline for synchronous admission. Do not add elapsed time back by constructing expiry from a later clock sample. Add a focused clock-sequence regression that would fail this implementation. Preserve the original delayed-callback cases and unknown-operation recovery. Source mutation must wait for the active frozen QA owner to close.

Exact independent harness (executed from worktree with `node --import tsx --input-type=module`; timers deliberately withheld):

```js
import imported from './src/lib/calendar/client.ts';
const {createCalendarClient}=imported;
let reads=0,now=0,posts=0;const clock=[];
Object.defineProperty(globalThis,'performance',{value:{now:()=>{
 reads++;now=reads<3?0:101;clock.push(now);return now;
}},configurable:true});
globalThis.setTimeout=()=>1;globalThis.clearTimeout=()=>{};
globalThis.location={origin:'https://nevora.test'};
const authority='a'.repeat(64);
globalThis.fetch=async(_url,init)=>{
 if(init.method==='POST'){posts++;throw Error('Fictional lost response');}
 return Response.json({state:'none',id:null,generation:null,issuedAt:null,
 allowedLocationIds:[],authority,observedAt:'2026-10-27T12:00:00Z',
 validForMs:100,canIssue:true});
};
const flush=async()=>{for(let n=0;n<40;n++)await Promise.resolve();};let state;
const client=createCalendarClient(authority,v=>{state=v;});
client.start();await flush();
console.log(JSON.stringify({stage:'after-read',clockReads:clock,
 status:state.status?.state,originalBudgetEnds:100,currentClock:now}));
client.command('ISSUE');await flush();
console.log(JSON.stringify({stage:'command-after-original-budget',posts,
 clockReads:clock,pending:state.pendingKind}));client.stop();
```

No source, tests, HEAD, index or owned process was modified. CR-1 remains closed; CR-2 remains LOW/nonblocking. Final QA evidence remains a separate pending gate.


## CR-3 arithmetic follow-up CLOSED by original reviewer

Candidate: `f58d040b70909fa21dcb97b4f40edcfd5279226c`. Independently inspected the committed production/test diff. The client now derives `deadline=started+result.validForMs`, computes remaining against that same deadline, and stores the fixed deadline. There is no second clock sample that adds elapsed time back to the authority budget.

Reran the exact reopened harness printed above, unchanged, against the actual candidate controller. Exact output:

```json
{"stage":"after-read","clockReads":[0,0],"status":"none","originalBudgetEnds":100,"currentClock":0}
{"stage":"command-after-original-budget","posts":0,"clockReads":[0,0,101],"pending":null}
```

The clock now advances to101 at admission; the fixed100ms deadline correctly blocks the POST. Independent `npx vitest run src/components/calendar-subscription-panel-lifetime.test.tsx` passed20/20 at19:06:49, duration390ms. Inspected arithmetic RED artifact (`cr3-arithmetic-red.log`,1 failed/19 passed) and focused GREEN artifact (`cr3-arithmetic-green.log`,117/117 passed). The new test observes the unwanted POST and expired state, rather than pinning the formula, so it is a relevant regression.

CR-3, including both delayed-timer admission and arithmetic extension, is CLOSED at this candidate. Prior finding/reopening/closure history remains preserved. CR-1 remains CLOSED; CR-2 remains LOW/nonblocking. Current codeQualityStatus WATCH / recommendation REQUEST_CHANGES solely pending exact-final-candidate combined QA/static/custody evidence. No source or HEAD mutation, broad suite, or owned browser launch performed by this reviewer. Final CODE_FINAL.md will follow inspection of final evidence; earlier5b browser/combined evidence is not represented as an f58 run.


## Final-f58 full-suite failure triage — classification pending native trace

The final selector-free run is not accepted: parent reports253/254 with Profile Firefox idle failure. Independently inspected Profile source31–33/113 and `local-review/qa/final-f58d040b/combined/profile/firefox-pending-requests.json`: one GET `/api/employee/calendar-subscriptions`, stage new-account, startedAt1793143125115 remains recorded.

The tracker keys by Request object identity, adds synchronously on request, and removes only on requestfinished/requestfailed. It does not reset between stages or merge requests by URL. Source inspection found no self-evident URL collision or asynchronous insertion bug. A current ready Calendar DOM proves a strict parsed response reached some client read, but does not alone prove completion of the exact retained Request (there could be another poll/resume request). Server200 completion is similarly not proof of client body consumption or native terminal event delivery.

Native trace must correlate stable per-request identity, response arrival, body/response.finished completion, terminal finished/failed event and map deletion. Potential explanations include an actual distinct unfinished read, a missing Firefox/automation terminal event, or request object identity mismatch. No product-versus-harness classification is yet supported. Do not clear/filter the map or raise idle timeout merely because DOM is ready. Existing CR-3 closure remains valid for its independent regression evidence; this new full-suite failure remains a separate acceptance blocker. No source edits or live-process interference by reviewer.


## Firefox upstream/source hypothesis assessment

Read primary upstream issue https://github.com/microsoft/playwright/issues/29101 (reported for1.41.1). A maintainer described rapidly aborted intercepted fetch behavior and demonstrated terminal events after waiting until request dispatch. This is historical supporting context, not proof that the final-f58 failure has the same cause. No500ms delay, filtering, timeout increase or application change is justified by this issue alone.

Verified the actual QA runtime's installed Playwright version1.62.1 at `/Users/josek0514/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json`. Inspected adjacent playwright-core/lib/coreBundle.js, SHA256 `9393fa79e1c67c74edc26b610d65a4f7ed73d345a762465cc88340a33a2454ac`:

- Lines44607/44630: Firefox native finished/failed handlers look up requestId; unknown IDs return without terminal propagation.
- Lines61939–61949: client completion emits context requestfinished, then page event only if a page is attached; response.finished resolves from that same terminal-event handler.

Therefore response.finished remaining pending is not an independent indication of hung browser consumption: it shares the event being investigated. A browser-side fetch/JSON outcome, tied to the same request identity where feasible, is stronger independent evidence. The actual trace must distinguish both-context-and-page absence from page-only absence and from terminal callbacks carrying another identity.

Read event-only diagnostic01 summary:1075 events,131 requests,32 Calendar requests, no terminal mismatches, zero consumer events. That clean replay does not reproduce or classify the original failure.

If current QA traces remain inconclusive after closure, a small owned-loopback reproduction can compare installed1.62.1 Firefox with and without route interception, immediate abort versus abort after observed request, and record browser fetch outcome, local-server hit IDs, and Page/Context terminal events. Use ephemeral port and fictional data, close all resources, and record unmatched requests as observations without changing the product gate. Do not run a parallel Next instance or introduce sleeps as a fix. No such reproduction was launched by this reviewer during active QA.


## Prospective exact-abort tracker fallback — conditional design assessment only

No implementation approved or performed here. The three event-only unchanged-f58 replays passing do not classify the preserved253/254 result. Minimal installed-runtime evidence remains prerequisite.

If the minimal reproduction demonstrates a native Request event without either terminal event while that exact native browser fetch rejects AbortError, an exact-correlation fallback can preserve the existing idle meaning: native requestfailed already removes aborted requests even when server work may continue. This is transport observation, not proof of database rollback.

Conditions:

- Require rejection of the native fetch promise with AbortError and the associated signal actually aborted. Signal abort notification alone, application error text, ready DOM, response headers, elapsed timeout or successful fetch promise resolution are insufficient. A successful fetch may still have an unfinished body.
- Prefer the narrow same-origin Calendar GET seam demonstrated here. Do not extend instrumentation to writes/navigation/other requests without evidence. Correlate by unique run/document/request test-only ID; never by URL alone.
- Preserve headers, signal, credentials, cache and redirect policy. The canonical correctionBoundary accepts extra headers while retaining marker/query/origin checks, and Calendar uses no-store; nevertheless the extra header changes wire shape and the wrapper changes timing. Demonstrate the underlying loss without instrumentation and the correlation mechanism with instrumentation.
- Observe native promise rejection without awaiting diagnostics or delaying/replacing the promise delivered to application code. Record observation errors explicitly.
- Native finished/failed remain primary. Retain original zero-pending/10s assertion. Buffer abort-before-request ordering with exact-ID tombstones; terminal-before-abort is idempotent. Never delete a distinct concurrent same-URL request. A fetch that never produces a native request creates no artificial pending entry.
- Regression controls must cover both event orders, duplicate terminal/abort observations, same-URL concurrent requests, unrelated cancellation, a held live request, and successful headers with a held body. Held/nonaborted requests remain pending.

Safer first alternatives remain native Page+Context attribution or correction of a demonstrated object-identity bug; current traces show neither. Local runtime reproduction can justify resilient tracking, but does not retroactively establish the original failure's exact cause. Do not introduce a500ms delay, increased timeout, or endpoint exclusion. No source edit/browser launch by this reviewer.


## Document-replacement fallback assessment — still conditional

Independently read `local-review/qa/synthetic-f58d040b-body-navigation-01/result.json`: installed1.62.1 Chromium held-body navigation request4 lacked Page and Context terminal events for11007ms; server response closed with writableEnded=false; a subsequent same-page complete JSON request had both terminal events. Git stayed exactf58 and recorded resources closed. This substantiates a general navigation-related tracker gap in the installed runtime, not the original Firefox failure's cause. No browser-side AbortError was recorded for the destroyed document.

A per-document fallback requires exact request-to-document attribution captured at dispatch, effective method GET and keepalive=false, and confirmed committed replacement by a different document ID. Page/frame identity alone persists through navigation; a hash/Next same-document navigation must not clear anything. Pagehide alone is insufficient, particularly persisted/BFCache cases. Preserve native terminal events as primary; no clearing live/same-document, write, keepalive, or unattributed requests. Lifecycle beacons must record whether actual cancellation was observed versus merely pagehide.

Critical applicability limit: the original retained GET was tagged new-account; Profile openProfile uses Next links. If no full document replacement followed that GET, the proposed document fallback cannot explain that orphan. Require document chronology, not inference from a later ready DOM. Await Firefox-specific proof/controls and ordering regressions before any implementation recommendation. No source mutation or parallel browser launch by this reviewer.


## Negative evidence — no justified production/tracker correction yet

Independently counted final-f58 Profile owned-Next log Calendar GET lines:19, all HTTP200; final two16ms each. No401/403/503 supports an unauthorized-unread-body cancellation explanation. This remains server response evidence, not per-request client consumption correlation.

Inspected installed1.62.1 Firefox synthetic result artifacts under local-review/qa: navigation6 cases, source-options14 total cases (including controls), timed-abort30 total cases (including controls). Each records outcome not_reproduced, no orphans, unchangedf58 source and closed listed server/browser resources. These negative controls do not establish absence of a rare race, but they do not justify applying the Chromium document fallback to the original Firefox failure.

A cancellation after a small body is fully written but before client settlement remains a proposed timing input, not a demonstrated defect. Await actual-source account-cycle evidence. The original253/254 acceptance failure remains unresolved; no tracker filtering, increased timeout, production delay, or speculative source fix is supported by the reviewed evidence.


## One full-context native diagnostic is justified; not causal closure

Independently read actual-source cycles02/profile/result.json:10 passed account-switch cycles on exactf58, correct own identity and absent other identity, ready Profile/Calendar none, identical documentTimeOrigin throughout. Thus these are useful same-document negative controls. The future-document observer installed later does not establish consumer observation in this unchanged document. Cycles01 is a separate preserved setup failure (exit1 before an ownedNext/cluster); it must not be counted as the successful run.

One bounded unchanged full-corpus event-only run is justified because prior workload and engine ordering remain untested by isolated replay. It adds native diagnostic evidence missing from the original run. Conditions: preserve exact26-file suite, original assertions/10s idle, candidate/runtime; attach native observers before any requests; use stable per-request Page/Context identities and stage/time data; retain full source/custody records. Do not add headers, JS wrappers, filters, retries or source changes. Limit this to one contextual run and analyze any failure rather than rerunning until green.

A passing result establishes that run passed; it is not a fix and cannot erase or causally close the earlier253/254 result. Independent QA owns the final historical-condition classification and whether conditional acceptance is justified. No such approval is inferred by this code reviewer.


## Final full-context evidence independently checked — awaiting QA disposition

Exact application candidatef58d040b70909fa21dcb97b4f40edcfd5279226c. Directly inspected full-context-f58d040b-01/combined/{result.json,suite-results.json}:26 files,254 passed,0failed/0pending,799.2s, exit0, unchanged source/HEAD/index. All9 owner entries are closed, sourceVerified/mirrorVerified, with recorded dead PIDs/closed ports; owned PostgreSQL directory removed and recorded PID/port closed.

This reviewer independently rehashed the2266 broad source inputs against the current checkout and all9 source manifests of2024 entries each:zero source mismatches, all checkpoints exactf58. Compared earlier exactf58 units/TypeScript/ESLint input maps with the final full-context inputs:identical. Direct stdout/invocation/result inspection confirms98files/799unit tests, nonincremental tsc --noEmit, and16-file scoped ESLint, all exit0. Mirror matching is additionally substantiated by QA audit-result; this reviewer rehashed source, not every derived mirror.

No further production/test/config changes were made. These final evidence gates now pass, but CODE_FINAL.md remains pending QA's author-owned treatment of the preserved historical253/254 failure. This passing run does not establish its original cause or a fix. No causal closure is claimed.
