# Employee mobile Pay, Alerts QA-OWN-3, status race, test repairs, Communications fixes: code and security review

- **Reviewer role:** independent senior code and security reviewer (reports findings only; no application or test file was edited)
- **Worktree / branch:** `.claude/worktrees/emp-mobile-p2` / `claude/employee-mobile-phase2-20261027`
- **Revision under review:** `848e9cc5e2240347d3967b65459027228c5eb541`
- **Base:** `6931d90de4a59c10b0bc60a23c7a8794b523dcbc` (`git diff 6931d90d..848e9cc5`, account-deletion files excluded)
- **Date:** 2026-10-28

## Scope

| Area | Files |
|---|---|
| A. Pay and protected PDFs | `src/lib/payroll/access.ts`, `contracts.ts`, `notices.ts`; `src/components/payroll/api.ts`, `use-payroll.ts`, `my-pay.tsx`; `src/app/app/my-pay/page.tsx`; `src/components/employee-mobile/pay.tsx/.css/.test.tsx`; `src/app/api/payroll/documents/navigation.ts` (+test), `[id]/route.ts`, `[id]/view/route.ts`; `src/lib/notifications/destinations.ts` (+test); integration changes in `configurable-payroll`, `company-access-notification-authority`, `employee-mobile-pay` |
| B. QA-OWN-3 | `src/lib/notifications/device-client.ts` (turn-off ledger), `device-ownership-replacement.test.ts` |
| C. Legacy status race | `device-client.ts` `api()` status lock, `device-client.test.ts` new case; `subscription-service.ts` `status()` (unchanged); `src/components/portal-device-setup.tsx` |
| D. Test repairs | `src/lib/data/scheduling-inputs.test.ts`, `src/app/app/requests/page.test.tsx`, `page.withdrawal-carry-forward.test.tsx`, `hub/page.test.tsx` |
| E. Communications | `src/components/employee-mobile/messages-view.tsx`, `messages.css`, `messages-view.test.tsx` (code correctness only) |

## Checks run by this reviewer

- `npx vitest run` on the 10 in-scope unit files (navigation, pay, destinations, device-client, device-ownership-replacement, scheduling-inputs, three requests page tests, messages-view): **10 files, 158 tests passed**.
- `npx tsc --noEmit -p tsconfig.json`: exit 0. `npx eslint` on the 9 changed source files: exit 0.
- Evidence provenance: `pay-browser-run-10.log` ran in `scratchpad/red-base`. That worktree's reflog shows checkout to `848e9cc5` at 00:46:04 and the run starting 00:46:05, `results.json` written 00:46:42; red-base was later moved to `e5965943` (00:52:49), so the directory no longer reflects 848e9cc5. Run 10: 31 checks, 3 engines; only expected 401/404 console errors. Runs 1–8 failed (URL cleaning, focus, WebKit console error), run 9 passed at `d72e21eb`. Payroll SQL logs: 37/37 and 39/39. RED log: two QA-OWN-3 safety cases fail on the pre-fix base, one passes.
- Not run by me: browser suites, SQL integration suites (no servers/databases per brief). The findings below rely on reading the code, plus the logs listed above.

## Findings

### A. Pay and protected PDFs

**PAY-CR-1: material: any 503 is reported to the employee as a failed file-integrity check**
- `src/app/api/payroll/documents/navigation.ts:12`; `src/lib/payroll/http.ts` `failure()` (503 for `PAYROLL_UNAVAILABLE` and `PAYROLL_DISABLED`); `src/lib/auth/session.ts:130-132`.
- Scenario: `navigationFailure` maps `status === 503` to `?document=failed`. That page then says "It didn't pass NEVORA's file check, so it wasn't opened." The same 503 also comes from: a Neon error or timeout; lock contention in `guarded()` (`store.ts` `locks()` takes `LOCK TABLE employees IN SHARE ROW EXCLUSIVE` plus `FOR UPDATE` on every employee row); `enabled()` throwing `PAYROLL_DISABLED`; and the `NEXT_REDIRECT` thrown by `requireSessionMutationProof()` when the session ends between `getSession()` and the proof read. That error is caught and stringified into a 503. In each of these cases the employee is told that their statement failed an integrity check, which is false. It may also prompt needless escalation ("ask your manager").
- Fix: pass the error code (not just the status) to `navigationFailure`. Map only `DOCUMENT_UNAVAILABLE` + 503 to `failed`. Map other 5xx to a third reason (for example `?document=error`, "We couldn't open that statement right now. Try again.") and add it to the page allow-list. Treat a caught `NEXT_REDIRECT` as 401. Add route tests for `PAYROLL_UNAVAILABLE` and the redirect case.

**PAY-CR-2: material: desktop Employees/Leads are silently bounced, with no explanation**
- `navigation.ts:11-12` (does not depend on viewport); `src/components/payroll/my-pay.tsx:54` onward (the desktop branch ignores `statement` and `document`).
- Scenario: An Employee at 1280px, or on a tablet ≥768px without a coarse pointer, or in Firefox landscape (recorded as desktop in run-10 `media`), clicks Download or View on a missing, revoked or integrity-failed statement. The server now answers 303 to `/app/my-pay?document=…`. The desktop page renders no notice, never cleans the URL and never focuses anything, so the click appears to do nothing. Before this change, the same request produced an explicit (if raw) JSON error. A desktop notification `?statement=` is likewise ignored. The brief requires desktop contracts to be preserved and every state to be truthful. This is a desktop regression.
- Fix: render the same notice (and the statement focus) in the desktop `MyPay` presentation. Alternatively, move the notice and URL-clean logic into a shared component used by both branches. Add a desktop unit or browser check.

**PAY-CR-3: minor: revoked access shows "Check your connection"**
- `src/components/employee-mobile/pay.tsx:81-82,105`; `use-payroll.ts` `errorCode`.
- Scenario: If authority fails, the statements read returns 403 `ACCESS_DENIED`. This happens with an inactive location, a workspace change, or the `payroll_authorization` guard (`store.ts` `authority()`). The read can also return a non-JSON 404. The Pay tab then shows "Couldn't load your statements. Check your connection, then try again." with a Retry that cannot succeed. The brief lists revoked access as a required state. The browser run covers only an ended session (401) and module-off.
- Fix: map `ACCESS_DENIED` (or any 403) to a distinct state, for example "Your access to pay statements changed. Ask your manager.", with no Retry. Add a unit case and a browser case that changes the actor's authority mid-session.

**PAY-CR-4: minor: management navigations on 401 are redirected, which contradicts the stated contract**
- `navigation.ts:10` runs before the role check. The `role` is `null` at the `getSession()` 401 and known later.
- Scenario: The comment and the test name ("keeps the JSON contract … for management") say management keeps JSON. However, a Manager or Owner whose session ended and who opens a document from `/app/payroll` by navigation is sent to `/login?returnTo=%2Fapp%2Fmy-pay`. That is the wrong return target for payroll work. Scripted reads do keep JSON, which is verified.
- Fix: either document this behaviour and return to a neutral `/app`, or restrict the 401 redirect to cases where the role is unknown or is Employee/Lead. Correct the test name and comment either way.

**PAY-CR-5: minor: a repeated identical arrival is not announced**
- `pay.tsx:42-44,52-53`.
- Scenario: After `history.replaceState`, the server props still carry `statement=X` (or `document=failed`). The page is now on My pay. If the person taps the same notification again, or a second PDF fails the same way while the page stays mounted, the props are unchanged, so the latch does not advance. The effect returns early (`arrived.current===latch.seq`). Nothing is focused, nothing is announced, and the URL keeps its parameters.
- Fix: latch on a navigation-level change, for example `useSearchParams()` returning to non-empty, or a nonce added by the redirect or destination, rather than on prop inequality.

**PAY-CR-6: advisory: View in a new tab from an iOS standalone PWA**
- `pay.tsx:74` (`target="_blank"`).
- Scenario: An installed iOS web app opens `_blank` in a separate browsing context that may not share the PWA's cookies. The result is a 401, then sign-in in that context, then a return to My pay rather than the PDF. `results.json` limits already exclude physical devices and native PDF viewers.
- Fix: verify on a device. If cookies are not shared, open View in the same tab when `display-mode: standalone`.

**PAY-CR-7: advisory: double announcement**
- `pay.tsx:87` gives the notice `role="alert"`, and `pay.tsx:57` also moves focus to it. Some screen readers announce it twice. No screen reader was run. Pick one mechanism.

**PAY-CR-8: advisory, pre-existing: global locks on every own-statement read**
- `src/lib/payroll/store.ts:19-26`, `guarded()`.
- The mobile Pay tab reloads on every `visibilitychange` and `online` event. Each `statements()` or `document()` call takes `LOCK TABLE employees IN SHARE ROW EXCLUSIVE` and `FOR UPDATE` on every employee row. These calls serialize against each other and against any employee write. Under load this produces the 503s that PAY-CR-1 then mislabels. Refer to the CTO; the diff does not need to change this.

Verified sound (no finding):
- The `corrects`/`correctedBy` subqueries are restricted to the same employee, `EMPLOYEE_STATEMENT`, and `publishedAs("o")` with current `APPROVED`. `payroll_one_correction` (unique `(workspace_id, correction_of)`, migration 0028:8) makes `LIMIT 1` deterministic. A coworker's document is never named; integration and browser tests cover this.
- Every PDF request re-runs the session, module, `guarded()` authority, own+published (`payrollObjectScopeSql` resolves to owner-only for Employee/Lead) and SHA-256 checks.
- Responses are `no-store, private`, and redirects are `no-store` + `no-referrer`.
- Redirect targets are fixed paths, so there is no open redirect. Cross-site requests are rejected with JSON 403 before redirect logic.
- The notice destination is lowercased, and `safeReturnTo` admits exactly one lowercase UUID on `/app/my-pay` only. An unknown or peer UUID gives the same "isn't available" copy (no existence oracle).
- The view shows no amounts, deposits or payment status. The next payday comes only from `currentPayPeriod()` and is labelled as schedule-derived.
- Hook order in `MyPay` is stable.

### B. QA-OWN-3 turn-off ledger

**OWN-CR-1: material (disclosure): the residual is wider than the commit states**
- `public/fuel-portal-sw.js:166` (push shown when `state.current === generation`); commit `663377ba` message.
- Scenario: This is the QA-OWN-3 sequence: the IDB suppression write fails, native unsubscribe rejects, and the server request gets no response. The service worker is then restarted, which browsers do routinely after about 30 seconds idle. The new worker's IDB still has `current = X`. Every push for X that arrives before the person next opens NEVORA is displayed. The ledger only stops page-side re-ownership, because the worker cannot read `localStorage`. On the server, the turn-off is retried only through status or mutation calls, which also need the app open. The commit names only "if localStorage also fails" as the residual. The QA author's standard is that "a production/release safety claim must not omit it".
- Fix: record this second residual (notifications can still be displayed between a worker restart and the next app open) in the QA risk record for Jose's decision. Optionally retry `turnOff` automatically when `readStatus` matches the ledger, instead of waiting for a manual Retry.

**OWN-CR-2: minor: the declared residual is neither surfaced nor tested**
- `device-client.ts:193` ignores the boolean that `rememberTurnOff` returns. `device-ownership-replacement.test.ts:42` defines `failLocalStorage()` but never calls it.
- Scenario: If `localStorage` throws (quota, blocked storage), the person sees the same "suppressed locally where possible" copy. Nothing records the turn-off, and no test characterizes that outcome.
- Fix: add a probe that asserts the documented unsafe outcome when every store fails (marked as a risk reproduction, not a pass). When the ledger write fails, say "This browser couldn't remember your choice; turn off again after reopening."

**OWN-CR-3: minor: single-slot ledger**
- `device-client.ts:237,434-438` (`TURN_OFF_KEY` holds one generation).
- Scenario: On a shared device (common in workforce settings), account A's turn-off fails entirely and the ledger holds X. Account B's later turn-off also fails and overwrites the ledger with Y. A's protection is lost and A's next visit re-owns X, which is the original QA-OWN-3 outcome.
- Fix: store a small bounded set (for example a JSON array of up to 8 generations), and remove only the exact entry when cleanup is confirmed.

**OWN-CR-4: advisory: stale entries are never removed**
- `device-client.ts:87` clears only when `status.enabled` is true and the generation matches. If a fresh controller sees `enabled:false`, the entry stays.
- This is harmless as written, for the reasons below. Optional cleanup only.

Verified sound (B):
- **No fresh opt-in can be blocked.** `enable()` never sends `ownershipGeneration`, so a re-subscribe while X is still active is rejected with 409 (`subscription-service.ts:250`) instead of reusing X. A tombstoned record always rotates to a new `randomUUID()` (`:260-264`), so X cannot become enabled again.
- **No other account can be affected.** A record owned by another employee is rejected (`:248`), and `status()` exposes `ownershipGeneration` only to the owning employee (`:145-148`).
- **Abuse is limited.** Writing the key needs same-origin script, and a forged entry can only force cleanup, which is the safe direction.
- **Clearing is correct.** The entry is set before any of the three cleanups and cleared only after confirmed cleanup.
- **The fix is effective.** The RED baseline shows both safety cases failing before the fix.

### C. Legacy unbound status-cookie race

**RACE-CR-1: minor: unbound status can now fail after 2.5s while another lifecycle operation holds the lock**
- `device-client.ts:262` (2.5s acquisition bound), `:396`; `portal-device-setup.tsx:62-70`.
- Scenario: The popover's controller (`browserRuntime()`, unbound) calls `start()` on mount and `reconcile()` on visibility. Its status read now queues behind any holder of `fuel-portal-subscription-lifecycle`. That includes an enrollment in another tab or runtime, which can run longer than 2.5s (native subscribe, an 8s fetch, a 1.8s owner message). It also includes a native unsubscribe, whose lock is deliberately never released until it settles. In those cases the read aborts and the popover shows "Device setup is unavailable" on every page load until the holder finishes. Before this change the read succeeded. No deadlock was found:
  - the same runtime bypasses the lock through `enrollmentLockHeld`;
  - `own()` and `unsubscribeCurrent()` never call status;
  - browsers without Web Locks are unchanged.
- Fix: for passive reads, wait for the holder (longer bound) or keep the previous snapshot with a "checking" state instead of an error. Add a test for the abort path.

**RACE-CR-2: advisory**
- The new test (`device-client.test.ts:418-432`) proves ordering with a serializing lock fixture, but not the abort timing or the popover's UI.
- `status()` on the server is unchanged and still refreshes the cookie for unbound reads (`subscription-service.ts:204-205`), so the client-side ordering is the actual control. The rationale in the comment is accurate.

### D. Test repairs

**TEST-CR-1: minor: the availability lock-order assertion is weaker than it needs to be**
- `src/lib/data/scheduling-inputs.test.ts:176-181`; `src/lib/data/week-settings.ts:203-208`.
- The mock change is a real fidelity repair. Neon's `query()` is lazy and `transaction()` receives the statements unevaluated, and the function now leads with `workspaceReadGuard`.
- However, the assertion moved from "the lock is first" to "the lock is before the first INSERT/DELETE/UPDATE". It would still pass if `deadline_guard`, `version_guard`, or the `FOR SHARE`/`FOR UPDATE` row locks moved ahead of the advisory lock, which would bring back the check-then-write race the lock exists to prevent.
- Fix: assert that the lock's index is lower than the indexes of the employees `FOR SHARE`, submissions `FOR UPDATE`, `deadline_guard` and `version_guard` statements.

**TEST-CR-2: advisory (no defect)**
- `requests/page.test.tsx`, `page.withdrawal-carry-forward.test.tsx` and `hub/page.test.tsx` only add a `requireSessionMutationProof` mock or a complete proof shape that the pages now require. Their assertions are unchanged. These are genuine repairs, not weakening.

**TEST-CR-3: minor: the "unpublished document is never named" step is vacuous**
- `src/test/integration/configurable-payroll.integration.ts` (new test, the "Until the correction is approved and published" step).
- At that point the draft correction run has no documents, so the step cannot fail even if `publishedAs("o")` were removed.
- Fix: insert a statement document in the correction run before the publication row exists, and assert `corrects`/`correctedBy` stay `null` and `document()` returns 404 for its owner.

### E. Communications CR-4 / UI-COM-002 / UI-COM-003

**COM-CR-1: minor: "Nothing confirmed on this page" is shown when confirmed rows are only filtered out**
- `messages-view.tsx:20`; `messages-view.test.tsx:19`.
- Scenario: With `partial` true and confirmed rows that the search or filter excludes, the copy says nothing was confirmed and that the items "aren't listed". That is false: confirmed rows exist but don't match. The test passes `items={search?[]:[]}`, which is empty in both branches, so this case is never covered.
- Fix: use the "Nothing confirmed" copy only when `rows.length === 0`. When rows exist but none match, show "No matches" plus a single partial warning. Add that test case.

**COM-CR-2: minor: the nested min-height chain likely forces a scroll on short pages**
- `messages.css:5-7` together with `requests.css:5` (`.page-frame:has(.em-requests-mobile){padding:0 0 var(--em-space-8) !important}`).
- Scenario: `.page-frame` is `border-box` with min-height H and bottom padding P. Its child `.em-requests-mobile` also has min-height H. The frame therefore grows to H+P, so every short Messages page scrolls by P. In addition, `100svh - nav` ignores any top inset.
- Fix: set min-height at one level only (for example a flex column on the frame with `flex:1` on the child), or subtract the padding. Confirm in a browser; no Communications browser evidence was in scope here.

**COM-CR-3: advisory: the comment says more than the rule does**
- `overflow-wrap:break-word` on `.em-requests.em-messages` overrides `anywhere` for every descendant, including user-written list titles (`row.title`). Only `.em-message-copy` keeps `anywhere`.
- The rendered result is still safe because `min-width:0` is present and `lang="en"` lets `hyphens:auto` work. The comment ("only user-written copy may break anywhere") overstates the scope; either align it or include `.em-request-entry strong`.

## Verdicts

| Area | Verdict | Conditions |
|---|---|---|
| A. Pay and protected PDFs | **GO with conditions** | Fix PAY-CR-1 and PAY-CR-2 before release. Fix PAY-CR-3 or record it as a risk. The security core (ownership, publication, per-request integrity, caching, destinations, no fabricated money data) is sound. |
| B. QA-OWN-3 | **GO with conditions** | The fix is correct and cannot block a fresh opt-in or another account. The residual record must add the worker-display window (OWN-CR-1). Add the storage-failure probe (OWN-CR-2). Closure stays with the Alerts QA author; residual acceptance is Jose's decision. |
| C. Status race | **GO** | Track RACE-CR-1 (degraded popover state under a long-held lock). No deadlock. |
| D. Test repairs | **GO with conditions** | Strengthen TEST-CR-1 and TEST-CR-3. The requests page repairs are genuine. |
| E. Communications | **GO with conditions** | Fix COM-CR-1. Verify COM-CR-2 in a browser. Closure stays with the original authors. |
| **Overall** | **GO with conditions** | No blockers. Two material items in Pay (PAY-CR-1, PAY-CR-2) and one material disclosure item in Alerts (OWN-CR-1) must be closed or explicitly accepted by Jose before release. |

## Closure at 240eb14b

- **Reviewed:** `git diff 848e9cc5..240eb14b -- src` (fixes in `28ee6a75`, `ec063e5f`, `ddd78c87`). I checked the author's dispositions against the code; I did not take them on trust. No application or test files were edited.
- **Checks run by this reviewer:** `npx vitest run` on navigation, pay, private-statements, device-client, device-ownership-replacement, scheduling-inputs, messages-view and destinations. Result: 8 files, 162 tests passed.
- **Evidence read:**
  - `pay-configurable-run-2.log`: the TEST-CR-3 case passed (1 passed, 36 skipped).
  - `docs/execution/employee-mobile-phase2/REMAINING-WORK.md` §"Decisions only Jose can make" item 1.
- **Gap: no passing Pay browser run at the fixed revision.**
  - `pay-browser-run-11.log` (00:57, red-base at `950ae1ea`) failed.
  - `pay-browser-run-12.log` (01:01, red-base at `28ee6a75`) failed: `expected … to contain 'Payday February 2, 2040'` (the no-break-space change; `ddd78c87` addresses this in the test).
  - red-base has since moved to `bc8a5742`. I found no passing three-engine run for `ddd78c87` or `240eb14b`. The last passing browser run is still run 10, at `848e9cc5`.

### Per-finding status

| ID | Status | Basis |
|---|---|---|
| PAY-CR-1 | **Closed** | `navigation.ts` `documentFailure()` gives `integrity` only for `PayrollError DOCUMENT_UNAVAILABLE`/503. The only thrower of that pair is the hash mismatch at `access.ts:59`. Any other error, including a caught `NEXT_REDIRECT`, maps to `temporary`, worded "couldn't open it just now". Route tests cover `PAYROLL_DISABLED`/503, `CONFLICT`/503 and a thrown `Error`. The page allow-list adds `temporary`. Scripted reads still get `failure()` JSON. |
| PAY-CR-2 | **Closed, with a minor residual** | Desktop `MyPay` renders a `role="alert"` notice for `unavailable`, `failed` and `temporary`, and `private-statements.test.tsx` covers it. Residual (minor): the desktop view does not clean the URL, so a refresh replays the notice, and it still ignores `?statement=`. |
| PAY-CR-3 | **Closed** | `use-payroll.ts` maps any 403 to `FORBIDDEN`. The phone view now has a `denied` state ("Your access to pay statements changed") with no Retry, and a unit test covers it. There is no browser case for revoked access; this gap is recorded. |
| PAY-CR-4 | **Closed** | The test is renamed. The redirect for an unauthenticated management navigation is documented in the comment and tested. |
| PAY-CR-5 | **Open, accepted (minor)** | Unchanged. The rationale holds for PDF failures, which arrive by full navigation. A repeated identical notification tap on a mounted page is still not announced. |
| PAY-CR-6 – 8 | **Open (advisory)** | Unchanged. PAY-CR-7 is partly improved: arrival notices now wait for a listed state. |
| OWN-CR-1 | **Closed as disclosure; residual for Jose** | REMAINING-WORK.md now states both residuals (localStorage failure, and a restarted worker showing pushes until NEVORA is next opened) and names a server-side mitigation option. Accepting the risk is Jose's decision. |
| OWN-CR-2 | **Closed** | `turnOff` records `intentUnsaved` when `rememberTurnOff` returns false and adds "This browser couldn't save your request…". The test uses `failLocalStorage()`. |
| OWN-CR-3 | **Closed** | The ledger is a JSON list of up to 8 generations, and a legacy single value is read as a one-item list. Removal is exact-match only. Malformed JSON reads as empty, which is the safe failure. Tested. |
| OWN-CR-4 | **Open (advisory), slightly more relevant** | Stale entries are still never removed when the server reports `enabled:false`. With an 8-slot limit, accumulated stale entries can now evict a live one. This needs at least 8 failed turn-offs; optionally prune generations that the server reports as off. |
| RACE-CR-1 / 2 | **Open (minor / advisory), recorded** | Unchanged. |
| TEST-CR-1 | **Closed, with a minor residual** | The test now asserts that the lock comes before the employee/submission row locks and before every write. Residual: `deadline_guard`/`version_guard` ordering is still not asserted. |
| TEST-CR-2 | n/a | No defect. |
| TEST-CR-3 | **Closed** | The worker loop reaches "documents exist, publication absent" and asserts that nothing is linked there. `unpublishedChecked` must be true, and the SQL run passed 1/1. |
| COM-CR-1 | **Closed** | With `rows.length > 0`, the copy now reads "No confirmed matches on this page". Test added. |
| COM-CR-2 | **Closed in code; still needs a browser check** | `min-height` is now set only on `.page-frame` (`border-box`), so the padding is included. |
| COM-CR-3 | **Partly addressed** | `hyphens:manual`. The comment still overstates scope (list titles use `break-word`). Advisory only. |

### New findings at 240eb14b

**PAY-CR-9: material: the new `download` attribute likely defeats Download failure recovery**
- `src/components/employee-mobile/pay.tsx` `actions()` now renders `download={item.filename}` on the Download link (`ec063e5f`).
- Scenario: Download is used on a missing, revoked, integrity-failed or temporarily failing statement. With the `download` attribute, browsers treat the click as a download rather than a page navigation, so the 303 to `/app/my-pay?document=…` does not return the person to Pay with a notice. Same-origin Chromium likely follows the redirect and saves the My pay HTML as `statement-….pdf`, an unopenable "statement" with no explanation. Other engines may show a failed download in their download UI. Either way, PAY-CR-1/2 recovery never reaches the person on this path.
- Not verified in a browser:
  - the browser suite tests only a *successful* Download click;
  - its failure cases use `page.goto` (a plain navigation);
  - no browser run has passed since this change.
- Fix: drop `download` (the route already sends `Content-Disposition: attachment; filename=…`). If it is kept, add a three-engine browser case that clicks Download for the coworker, tampered and missing statements and asserts the Pay notice.

**PAY-CR-10: material (evidence): no passing three-engine Pay browser run at the fixed revision** (see the gap above). Required before closure is final.

### Updated verdict

| Area | Verdict |
|---|---|
| A. Pay | **GO with conditions:** fix or disprove PAY-CR-9, and produce a passing three-engine Pay browser run at the final revision (PAY-CR-10). PAY-CR-1 through 4 are closed. |
| B. QA-OWN-3 | **GO with conditions:** code findings are closed. The two disclosed residuals need Jose's decision, and closure stays with the Alerts QA author. |
| C. Status race | **GO** (RACE-CR-1 recorded). |
| D. Test repairs | **GO.** TEST-CR-1 and TEST-CR-3 are closed; the guard-ordering residual is minor. |
| E. Communications | **GO with condition:** browser recheck of COM-CR-2 by the original authors. |
| **Overall** | **GO with conditions.** No blockers. Remaining before release: PAY-CR-9, the PAY-CR-10 browser evidence, and Jose's decision on the QA-OWN-3 residuals. |
