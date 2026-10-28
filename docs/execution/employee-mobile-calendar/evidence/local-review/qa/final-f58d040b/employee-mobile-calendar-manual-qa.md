# Employee mobile Calendar manualQa —f58d040b

Independent QA recommendation: **NO-GO**. Required selector-free gate failed. Static/Calendar/SQL passes do not close QA-CAL-1. Original baseline and failed corrected run are preserved.

Criteria: `docs/execution/employee-mobile-calendar/calendar-plan.md` Tasks1–3 and accepted scoped teal brief. No ULW plan exists; caller evidence directory used. All PASS artifact references below were checked to exist and be nonempty.

Exact invocation aliases (cwd `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume`):

- S: `python3 /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/run-qa-fast-observer.py static --candidate f58d040b70909fa21dcb97b4f40edcfd5279226c --attempt final-f58d040b`. Exact spawned argv per static stage is recorded in invocation.json.
- B: `python3 /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/run-qa-fast-observer.py combined --candidate f58d040b70909fa21dcb97b4f40edcfd5279226c --attempt final-f58d040b`; exact child: `node scripts/payroll-postgres.mjs vitest.employee-mobile-calendar.config.mts --reporter=default --reporter=json --outputFile=/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/suite-results.json`. No selector. Browser tests are actual Playwright actions against owned Next; browser-context response observations are not claimed as a separate curl HTTP certification.
- D: `python3 /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/run-qa-profile-diagnostic.py combined --candidate f58d040b70909fa21dcb97b4f40edcfd5279226c --attempt diagnostic-f58d040b-profile-01`; child additionally selects `src/test/integration/employee-mobile-profile.integration.ts` and uses the externally recorded NODE_OPTIONS observer. Original assertions/timeouts unchanged.

## manualQa.surfaceEvidence

| scenarioId | criterionReference | surface | exactInvocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| CAL-01 | Calendar plan Task1/2/3; Schedule fixed hash opens the native Profile disclosure and focuses its summary; one current Calendar owner | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage schedule-entry | PASS | CAL, CI |
| CAL-02 | Calendar plan Task1/2/3; HTTP rejects an employee selector; no peer link or data exposed | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage schedule-entry browser-context request | PASS | CAL, CI |
| CAL-03 | Calendar plan Task1/2/3; Actual own issue and peer isolation; controlled clipboard failure/success, native full-link selection; evidence redacts the secret | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage actual-own-issue | PASS | CAL, CI |
| CAL-04 | Calendar plan Task1/2/3; Native Tab traversal uses visible focus, Copy then Select; Enter activates native selection | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage provider-and-reflow keyboard | PASS | CAL, CI |
| CAL-05 | Calendar plan Task1/2/3; Provider-specific native guides,320/390/430 light/dark and200% text plus coarse landscape; no overflow,44/48 targets and sampled text contrast | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage provider-and-reflow | PASS | CAL, CI, COPY, REPLACE, REVOKE |
| CAL-06 | Calendar plan Task1/2/3; Pause releases the URL; resume reads actual active state without reconstructing its one-time credential | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage private-pause | PASS | CAL, CI |
| CAL-07 | Calendar plan Task1/2/3; Replacement requires explicit consequence review; cancel returns exact focus, confirmed rotation invalidates the former feed | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage replace-confirmation | PASS | CAL, CI |
| CAL-08 | Calendar plan Task1/2/3; Lost actual committed rotation reply times out; media resize keeps owner/original; unrelated theme storage does not lose it; exact replay creates no second credential | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage unknown-command-resize | PASS | CAL, CI, REC-chromium, REC-webkit, REC-firefox |
| CAL-09 | Calendar plan Task1/2/3; Confirmed own revoke stops future feed access and leaves truthful copied-event limits | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage revoke-confirmation | PASS | CAL, CI |
| CAL-10 | Calendar plan Task1/2/3; Read failure removes all source actions and recovers only through an actual canonical read | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage read-unavailable | PASS | CAL, CI |
| CAL-11 | Calendar plan Task1/2/3; Actual DB session budget expires before polling; no stale actions; recovery requires current canonical session | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage finite-session-lease | PASS | CAL, CI |
| CAL-12 | Calendar plan Task1/2/3; Actual session loss clears private facts and denies all Calendar actions | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage current-session-denial | PASS | CAL, CI |
| CAL-13 | Calendar plan Task1/2/3; Native signout ends the mounted Calendar owner and removes the portal cookie | Actual owned Next browser journey in Chromium/WebKit/Firefox | B; employee-mobile-calendar.integration.ts stage native-signout | PASS | CAL, CI |
| STATIC-U | Task3 retained Profile682 corpus plus Calendar regressions | CLI actual component/contract unit corpus | S; exact98-fileargv in UI | PASS | U, UI |
| STATIC-TS | Task2/3 nonincremental TypeScript | CLI | S → node node_modules/typescript/bin/tsc --noEmit --incremental false | PASS | TS |
| STATIC-LINT | Task2/3 scoped lint | CLI | S → node node_modules/eslint/bin/eslint.js with recorded changed-file list | PASS | LINT |
| SQL-CAL | Task1 canonical tokens/feed/current-access rules | Actual disposable PostgreSQL,70canonical cases | B; phase-e-calendar-tokens + phase-e-calendar-feed + company-access-recovery-calendar | PASS | SUITE, LOG |
| REGRESSION | Task3 all required existing regression cases | 26-file selector-free SQL/browser combined gate | B | FAIL — Profile idle at new-account;253pass/1fail | SUITE, LOG, PROFILE, PENDING, PROFILE-HTML |
| CUSTODY | Task3 immutable source/mirror/HEAD/index/PID/port/DB closure | Read-only filesystem/process/loopback and DB observation audit | python3 /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/audit-run.py final-f58d040b | PASS for source/runtime closure; per-instance marker sampling limited as stated | AUDIT, OBS |
| DIAGNOSTIC | QA-CAL-1 missing completion-event diagnosis | Unchanged-candidate real Profile browser journey plus external event observer | D | PASS for diagnostic execution only; failure NOT REPRODUCED, QA-CAL-1 OPEN | DIAG, DIAG-AUDIT |

## manualQa.adversarialCases

| scenarioId | criterionReference | adversarialClass | expectedBehavior | verdict | artifactRefs |
|---|---|---|---|---|---|
| ADV-01 | Task1 strict contract | malformed/rebound status or receipt | Reject malformed/private URL/authority/operation/generation mismatch before adoption | PASS | U, UI |
| ADV-02 | Task1 finite waits | held read/write headers/body and late completion | Bound waits, fence late responses, retain immutable unknown original | PASS | U, CAL |
| ADV-03 | Task1 monotonic lease;CR-3 | delayed timers and advancing clock samples | Zero expired POST/clipboard side effects; fixed request-start deadline; preserve original recovery | PASS | U, UI |
| ADV-04 | Task1 lifecycle | lost committed reply, unrelated theme storage and media resize | Same original replay, no secondcredential; owner remains mounted; visible retry | PASS | CAL, REC-chromium, REC-webkit, REC-firefox |
| ADV-05 | Task1 authorization | current session/role/workspace/location refusal and peer selector | Own/current guards remain; no stale/private action admission | PASS | CAL, SUITE, U |
| ADV-06 | Task1 canonical lifecycle | concurrent rotate/revoke/replay and feed invalidation | Actual locking/generation winner rules and revoked feed denial | PASS | SUITE, LOG |
| ADV-07 | Task2 copy fallback | clipboard denial | Honest failure message and native select-all fallback; no claimed provider connection | PASS | CAL, COPY |
| ADV-08 | Task2 accessibility;UI-1/UI-3 | 320px/200%light/dark,keyboard,coarse landscape | No tested overflow;44pxtargets/48pxcritical controls; visible focus and retry above nav | PASS | CAL, COPY, REPLACE, REVOKE, REC-chromium, REC-webkit, REC-firefox |
| ADV-09 | Task1 privacy | pause/signout/expiry and stale completion | Clear private state, prevent reopened ended owner and no credential reconstruction | PASS | CAL, U |
| ADV-10 | Task3 retained Profile;QA-CAL-1 | new-account request completion accounting | Original10second idle assertion must drain genuine tracked requests | FAIL; isolated diagnostic did not reproduce; cause remains unresolved | LOG, PENDING, PROFILE-HTML, DIAG |
| ADV-11 | Scope boundary | provider service outage/retry | not_applicable: feature calls no external provider API; it supplies a feed link and instructions only | not_applicable | CAL |

## manualQa.artifactRefs

| id | kind | description | path |
|---|---|---|---|
| U | test-log | 98 files/799 unit tests, actual final-candidate run | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/units/stdout.log |
| UI | invocation | Exact98-file unit argv and sanitized environment | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/units/invocation.json |
| TS | custody-result | Nonincremental TypeScript exit0/source/Git custody | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/typescript/result.json |
| LINT | custody-result | Scoped ESLint exit0/source/Git custody | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/eslint/result.json |
| CI | invocation | Exact selector-free26-file combined argv/environment | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/invocation.json |
| SUITE | test-report | 253pass/1fail,26files, exact assertion records | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/suite-results.json |
| LOG | test-log | Full run including Profile idle failure stack and PGstop | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/stdout.log |
| AUDIT | independent-audit | Independent hashes/inventories/PID/port/DB checks and explicit marker caveat | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/audit-result.json |
| OBS | observation-log | 1376frozen samples including3null-marker snapshots | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/observations.json |
| CAL | browser-action-record | 39Calendar checkpoints,108captures,54contrasts, actual3engines | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/calendar/result.json |
| PLAN | scenario-invocation | Calendar scenarios stated before final Calendar execution | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/calendar-scenario-plan.json |
| REC-chromium | screenshot | Actual original-retry recovery above fixed navigation | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/calendar/chromium-calendar-unknown-original.png |
| REC-webkit | screenshot | Actual original-retry recovery above fixed navigation | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/calendar/webkit-calendar-unknown-original.png |
| REC-firefox | screenshot | Actual original-retry recovery above fixed navigation | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/calendar/firefox-calendar-unknown-original.png |
| COPY | screenshot | 320px200%Copy/Select controls | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/calendar/firefox-calendar-light-320-text200-copy.png |
| REPLACE | screenshot | Dark200%replace confirmation control | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/calendar/webkit-calendar-replace-dark-text200-control.png |
| REVOKE | screenshot | Light200%revoke confirmation control | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/calendar/chromium-calendar-revoke-light-text200-control.png |
| PROFILE | screenshot | Failed Firefox new-account Profile surface | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/profile/firefox-failure.png |
| PENDING | browser-diagnostic | One retained Calendar GET at original idle failure | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/profile/firefox-pending-requests.json |
| PROFILE-HTML | browser-DOM | Ready new-account Profile and current Calendar none at failure | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/final-f58d040b/combined/profile/firefox-failure.html |
| DIAG | browser-event-log | Unchanged-candidate diagnostic stableIDs, completion and consumer events; no reproduction | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/diagnostic-f58d040b-profile-01/combined/profile-events.jsonl |
| DIAG-AUDIT | independent-audit | Single diagnostic runtime closure; transient startup refusal explicitly retained | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/diagnostic-f58d040b-profile-01/audit-result.json |

## Explicit unexecuted gates and limitations

Physical devices, assistive technology, native OS clipboard permission behavior, real provider subscription/refresh, hosted production transport/build parity and release/production certification were not executed. No local PASS implies those results. Controlled clipboard stubs and synthetic pause events are labelled in browser records. The diagnostic did not reproduce QA-CAL-1 and cannot establish its cause or close the failed full gate.

Custody audit independently verifies9closed ownedNext instances, actual source/mirror hashes, deadPIDs/closedports, removedownedcluster and unchangedGit. It preserves3null-marker snapshots from faster observation; valid nonempty markers were separately observed for all3required namespaces. Do not read this as every short-lived fixture being independently sampled afterCOMMENT. Diagnostic startup observer recorded a transient refused5432probe before the actual ownedlistener; it made no successful SQLconnection there.

## Additional bounded event-only surfaceEvidence

| scenarioId | criterionReference | surface | exactInvocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| EO-01 | QA-CAL-1 original idle failure diagnosis | Real3engineProfile; Page+BrowserContext event observer; no fetch wrapper | python3 /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/run-qa-profile-event-only.py combined --candidate f58d040b70909fa21dcb97b4f40edcfd5279226c --attempt diagnostic-f58d040b-event-only-01 | PASS diagnostic only; NOT REPRODUCED; QA-CAL-1 OPEN | EO-01-EVENTS, EO-01-AUDIT |
| EO-02 | QA-CAL-1 original idle failure diagnosis | Real3engineProfile; Page+BrowserContext event observer; no fetch wrapper | python3 /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/run-qa-profile-event-only.py combined --candidate f58d040b70909fa21dcb97b4f40edcfd5279226c --attempt diagnostic-f58d040b-event-only-02 | PASS diagnostic only; NOT REPRODUCED; QA-CAL-1 OPEN | EO-02-EVENTS, EO-02-AUDIT |
| EO-03 | QA-CAL-1 original idle failure diagnosis | Real3engineProfile; Page+BrowserContext event observer; no fetch wrapper | python3 /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/run-qa-profile-event-only.py combined --candidate f58d040b70909fa21dcb97b4f40edcfd5279226c --attempt diagnostic-f58d040b-event-only-03 | PASS diagnostic only; NOT REPRODUCED; QA-CAL-1 OPEN | EO-03-EVENTS, EO-03-AUDIT |

### Additional artifactRefs

| id | kind | description | path |
|---|---|---|---|
| EO-01-EVENTS | browser-event-summary | Event-only diagnostic; no failure reproduction or acceptance closure | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/diagnostic-f58d040b-event-only-01/event-summary.json |
| EO-01-AUDIT | custody-audit | Event-only diagnostic; no failure reproduction or acceptance closure | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/diagnostic-f58d040b-event-only-01/audit-result.json |
| EO-02-EVENTS | browser-event-summary | Event-only diagnostic; no failure reproduction or acceptance closure | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/diagnostic-f58d040b-event-only-02/event-summary.json |
| EO-02-AUDIT | custody-audit | Event-only diagnostic; no failure reproduction or acceptance closure | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/diagnostic-f58d040b-event-only-02/audit-result.json |
| EO-03-EVENTS | browser-event-summary | Event-only diagnostic; no failure reproduction or acceptance closure | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/diagnostic-f58d040b-event-only-03/event-summary.json |
| EO-03-AUDIT | custody-audit | Event-only diagnostic; no failure reproduction or acceptance closure | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/diagnostic-f58d040b-event-only-03/audit-result.json |

## Minimal synthetic surfaceEvidence

| scenarioId | criterionReference | surface | exactInvocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| SYNTH-01 | QA-CAL-1 upstream rapid-abort hypothesis | Owned-loopback HTTP + real Chromium/WebKit/Firefox;21synthetic cases | node /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-rapid-abort.cjs | PASS controls/cleanup; orphan request NOT REPRODUCED; QA-CAL-1 OPEN | SYNTH, SYNTH-CUSTODY, SYNTH-FIREFOX |

| id | kind | description | path |
|---|---|---|---|
| SYNTH | browser-protocol-diagnostic | Pinned1.62.1 minimal rapid-abort experiment; no orphan reproduced | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-rapid-abort-01/result.json |
| SYNTH-CUSTODY | post-exit-custody | Pinned1.62.1 minimal rapid-abort experiment; no orphan reproduced | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-rapid-abort-01/post-exit-custody.json |
| SYNTH-FIREFOX | screenshot | Pinned1.62.1 minimal rapid-abort experiment; no orphan reproduced | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-rapid-abort-01/firefox-results.png |

## Held-body/navigation diagnostic surfaceEvidence

| scenarioId | criterionReference | surface | exactInvocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| SYNTH-02 | QA-CAL-1 afterheaders/navigation hypothesis | Owned-loopback HTTP; Chromium2cases thenstop | node /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-body-navigation.cjs | REPRODUCED native terminal gap; originalFirefoxcausalityOPEN; WebKit/FirefoxUNEXECUTED afterrequiredstop | BODY-NAV, BODY-NAV-EVENTS, BODY-NAV-CUSTODY |

| id | kind | description | path |
|---|---|---|---|
| BODY-NAV | browser-protocol-diagnostic | Chromium held-body navigation native terminal gap; later engines notrun afterstop | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-body-navigation-01/result.json |
| BODY-NAV-EVENTS | event-log | Chromium held-body navigation native terminal gap; later engines notrun afterstop | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-body-navigation-01/events.jsonl |
| BODY-NAV-CUSTODY | post-exit-custody | Chromium held-body navigation native terminal gap; later engines notrun afterstop | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-body-navigation-01/post-exit-custody.json |

## Targeted Firefox diagnostic surfaceEvidence

| scenarioId | criterionReference | surface | exactInvocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| SYNTH-03 | QA-CAL-1 Firefoxafterheaders/completeJSONnavigation | Owned-loopback HTTP; pinnedFirefox6cases and successfulsecondreads | node /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-firefox-navigation.cjs | PASS diagnostic controls/cleanup; orphanNOTREPRODUCED; originalQA-CAL-1OPEN | FF-NAV, FF-NAV-EVENTS, FF-NAV-CUSTODY |

| id | kind | description | path |
|---|---|---|---|
| FF-NAV | browser-protocol-diagnostic | SixFirefox cases with durable serverabort beacons; noorphan; originalcauseOPEN | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-firefox-navigation-01/result.json |
| FF-NAV-EVENTS | event-log | SixFirefox cases with durable serverabort beacons; noorphan; originalcauseOPEN | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-firefox-navigation-01/events.jsonl |
| FF-NAV-CUSTODY | post-exit-custody | SixFirefox cases with durable serverabort beacons; noorphan; originalcauseOPEN | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-firefox-navigation-01/post-exit-custody.json |

## Timed-abort diagnostic surfaceEvidence

| scenarioId | criterionReference | surface | exactInvocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| SYNTH-04 | QA-CAL-1 nexttaskabort16msheadershypothesis | Owned-loopback pinnedFirefox; 30cases defaultfetch | node /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-firefox-timed-abort.cjs | PASS diagnostic controls/cleanup; orphanNOTREPRODUCED; originalQA-CAL-1OPEN | SYNTH-04-RESULT, SYNTH-04-SUMMARY, SYNTH-04-CUSTODY |
| SYNTH-05 | QA-CAL-1 nexttaskabort16msheadershypothesis | Owned-loopback pinnedFirefox; 14cases canonicalfetchoptions | node /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-firefox-options-abort.cjs | PASS diagnostic controls/cleanup; orphanNOTREPRODUCED; originalQA-CAL-1OPEN | SYNTH-05-RESULT, SYNTH-05-SUMMARY, SYNTH-05-CUSTODY |

| id | kind | description | path |
|---|---|---|---|
| SYNTH-04-RESULT | browser-protocol-diagnostic | 30cases defaultfetch; noorphan; originalQA-CAL-1OPEN | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-firefox-timed-abort-01/result.json |
| SYNTH-04-SUMMARY | case-matrix | 30cases defaultfetch; noorphan; originalQA-CAL-1OPEN | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-firefox-timed-abort-01/case-summary.json |
| SYNTH-04-CUSTODY | post-exit-custody | 30cases defaultfetch; noorphan; originalQA-CAL-1OPEN | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-firefox-timed-abort-01/post-exit-custody.json |
| SYNTH-05-RESULT | browser-protocol-diagnostic | 14cases canonicalfetchoptions; noorphan; originalQA-CAL-1OPEN | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-firefox-options-abort-01/result.json |
| SYNTH-05-SUMMARY | case-matrix | 14cases canonicalfetchoptions; noorphan; originalQA-CAL-1OPEN | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-firefox-options-abort-01/case-summary.json |
| SYNTH-05-CUSTODY | post-exit-custody | 14cases canonicalfetchoptions; noorphan; originalQA-CAL-1OPEN | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/synthetic-f58d040b-firefox-options-abort-01/post-exit-custody.json |

## Actual-source bounded diagnostic surfaceEvidence

| scenarioId | criterionReference | surface | exactInvocation | verdict | artifactRefs |
|---|---|---|---|---|---|
| ACTUAL-01 | QA-CAL-1 actualnewaccountmountcleanup | ActualownedNext/markedPG;10Firefoxcycles | python3 /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/run-qa-actual-profile-v2.py combined --candidate f58d040b70909fa21dcb97b4f40edcfd5279226c --attempt actual-f58d040b-profile-cycles-02 | PASS10native-eventcycles; failureNOTREPRODUCED; optionalconsumerobservationUNEXECUTED; originalQA-CAL-1OPEN | ACTUAL-CYCLES, ACTUAL-EVENTS, ACTUAL-AUDIT |

| id | kind | description | path |
|---|---|---|---|
| ACTUAL-CYCLES | browser-action-record | Actualsource10Firefox account-switch cycles;32idleassertions; optionalconsumerobservernotactivated | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/actual-f58d040b-profile-cycles-02/combined/profile/result.json |
| ACTUAL-EVENTS | browser-event-log | Actualsource10Firefox account-switch cycles;32idleassertions; optionalconsumerobservernotactivated | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/actual-f58d040b-profile-cycles-02/combined/profile/events.jsonl |
| ACTUAL-AUDIT | independent-custody-audit | Actualsource10Firefox account-switch cycles;32idleassertions; optionalconsumerobservernotactivated | /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-calendar/local-review/qa/actual-f58d040b-profile-cycles-02/audit-result.json |
