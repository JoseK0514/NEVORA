# QA-CAL-1 root-cause investigation (read-only)

Labels: **[V]** checked in code, logs or traces. **[I]** inferred. Paths are relative to the emp-p2-assembly worktree unless they are absolute.

## 1. The original failure
- **[V]** The run was final-f58d040b, 2026-10-27, with 253/254 tests passing. The failure text was `AssertionError: expected 1 to be +0`, and vitest added `Matcher did not succeed in time`. Source: the external stdout.log under `~/Documents/Codex/.../final-f58d040b/combined/` (lines 223-237) and the in-repo `suite-results.json` (testResults[12]).
- **[V]** The assertion is the `idle()` poll at `employee-mobile-profile.integration.ts:33:65`, called from `113:94`. That is `stage='new-account';…openProfile();await ready();await idle();` as of `git show f58d040b:` lines 30-33 and 113. The test file and the Calendar sources are unchanged between f58d040b and HEAD.
- **[V]** The one leftover entry is `{GET /api/employee/calendar-subscriptions, stage:new-account, startedAt:1793143125115}` (`profile/firefox-pending-requests.json`).
- **[V]** In the failure DOM, Calendar shows `data-calendar-state="none"` and Profile shows `ready` (`firefox-failure.html`). `calendar.tsx:25` only renders `none` after a read has been parsed successfully. So the page fully consumed one Calendar response.
- **[V]** In the owned server log (`profile/owned-next-DKEQhm/next.log`, tail), the last Firefox new-account sequence logs exactly **one** `GET /api/employee/calendar-subscriptions 200 in 16ms`.

## 2. What the monitor sees, and the mechanism
- **[V]** The monitor (lines 30-32) adds a Page `request` event to a map and removes it only on Page `requestfinished` or `requestfailed`. It records no request identity, response, failure text or timing. Service workers are blocked, so they cannot explain the leftover. Every request goes through an async `context.route('**/*')` handler, so in Firefox every request is intercepted (Juggler `isIntercepted`).
- **[V] Dev-mode double requests.** `next.config.ts:4` sets `reactStrictMode:true`, and the harness runs `next dev` (`owned-next-app.ts:311`). The panel effect (`calendar-subscription-panel.tsx:72-83`) calls `resume()` → `start()` → `fetch`. The StrictMode cleanup then calls `client.stop()` → `abort()` in the same task, and the effect remounts and fetches again. Each mount therefore makes two requests in a row: the first is aborted, the second completes. These are dev-only and never reach the server.
- **[V] The passing full-context trace shows this pattern** (`full-context-f58d040b-01/combined/full-context-events.jsonl`, Profile pid 67843):
  - Chromium and WebKit: 5 pairs, each an aborted request (`requestfailed` 1-11 ms after the request) followed 1-3 ms later by one that completes. There is 1 single request, from the online-resume refresh.
  - Firefox: only 3 of its 5 mounts show the aborted request. In the other two, the abort won before Juggler reported the request at all. That matches QA's synthetic result for immediate aborts.
  - So in Firefox, whether this aborted request is visible is a timing race, and it happens about 3 times per Profile run.
- **[I] Most likely cause.** In the failing run, the new-account mount's aborted request reached Playwright as `request`, but Firefox never sent it a terminal event. The surviving second request is the one the server logged and the page rendered.
- **[I] A plausible Juggler drop point** (Firefox 1538 `omni.ja`, `chrome/juggler/content/NetworkObserver.js`):
  - When an intercepted request is continued, `_onInternalRedirect` (line 224) swaps `this.httpChannel` to the new channel.
  - `onStopRequest` (line 426) returns early with `if (aRequest !== this.httpChannel) return;`. It emits neither RequestFinished nor RequestFailed.
  - So if the page's cancel reaches the old intercepted channel after Playwright's `route.continue()` started the internal redirect, no terminal event is ever sent and the server is never hit.
- **[V]** QA's synthetic tests covered aborts before `continue` (terminal events arrived) and timed aborts at 0-5 ms (30+14 cases, no orphan). Neither aimed the abort at the moment `continue` runs. The full gate ran slower (867 s, against 799 s for the full-context run), which plausibly widens that window.
- **[V] Other explanations, checked against Playwright 1.62.1 `coreBundle.js`:**
  - `FFNetworkManager` lines 44505-44650 and the BrowserContextDispatcher/client `requestFinished` path have no filtering that could lose the event.
  - The dispatcher garbage-collection limit is 10,000 objects, and Profile only made about 130 requests.
  - Losing `requestfinished` for the completed request would need Juggler's `responseEndTime === undefined` branch (lines 578-600) on a normal 200 that was also reported as a request. That is unlikely. **[I]**

## 3. Classification
| Hypothesis | Confidence | For | Against |
|---|---|---|---|
| **A test-observation artifact.** Firefox/Juggler drops the terminal event for the dev-only aborted StrictMode request while it is being intercepted. | **~65%** | One server GET; the page consumed the surviving response; aborted pairs appear in all three engines; Firefox visibility is racy; it happened only under the loaded full gate; ~40 visible Firefox aborts in replays had no orphan, so it is a rare race. | The original run recorded no identity, so it cannot show the leftover was the first of the pair. The exact Juggler window has not been reproduced. |
| **A genuine app defect** (duplicate read, retry, Link prefetch) | **~10%** | The app does issue and abort a request on every dev mount. | Exactly one GET reached the server. The path is not a prefetch. The aborting is correct cancel behaviour, and production builds do not double-run effects. |
| **Undetermined** (another Juggler or Playwright path, or a lost finish event on the completed request) | **~25%** | The original evidence is too thin to tell. | Nothing points to it specifically. |

## 4. Smallest decisive experiments
1. **Firefox synthetic with the abort aimed at `continue`.** Pinned Playwright 1.62.1 on an owned loopback server, using `context.route('**/*')`. Hold each route, then run `Promise.all([route.continue(), page.evaluate(()=>window.__c.abort())])`, plus offsets of ±0-3 ms. About 200 iterations, stopping at the first orphan.
   - Log per request: a WeakMap id, `request.frame().url()`, `isNavigationRequest()`, `resourceType()`, `serviceWorker()`, `failure()`, timestamps for response, finished and failed, and server hits.
   - An orphan with zero server hits confirms the Juggler drop.
2. **Diagnostic copy of the Profile test only** (Firefox, new-account segment). Extend the monitor with the same fields. On a leftover, dump all Calendar requests in that stage. If the leftover is the first of the pair, with no response and no server hit, that confirms hypothesis A.
3. **Confirm where the aborted request comes from.** Run once against `next build && next start`, or with StrictMode off in a diagnostic config only. Chromium's aborted Calendar requests should drop from 5 to 0.

## 5. Fix proposals
- **Monitor fix that does not weaken the check.** Add server-side accounting to the owned harness: per-path counts of received and in-flight requests. `idle()` passes only if the browser map is empty, or if every leftover entry:
  - has no `response`, **and**
  - was never received by the server (received count equals completed browser count for that path and stage), **and**
  - has zero server in-flight requests.
  
  Log each tolerated leftover with its identity, and fail on any tolerated leftover in Chromium or WebKit. It still catches duplicate reads, retries and prefetches, because those reach the server and add to its counts. It still catches hung requests, because they stay in flight at the server.
- **Optional app-side change** (not proof of the cause): put `start()` in a cancellable `setTimeout(0)` inside the effect. The StrictMode probe would then never reach the network. This is an application change, so it needs Jose's and QA's agreement, and it does not by itself close QA-CAL-1.
