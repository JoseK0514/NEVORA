# Independent Employee Profile QA — NO-GO

Candidate `4bf7257950f898b97b93293470f0677bdb70b6bf` on `codex/employee-mobile-local-resume-20261027`. Evidence recorded independently; this is a local bounded acceptance decision, not hosted or release certification.

**Open MEDIUM ISSUE QA-PROFILE-001:** the complete run reproduced Firefox System-to-Light mismatch. `data-theme=dark` while System is selected and current dark media query is false. Exact failure: `src/test/integration/employee-mobile-profile.integration.ts:91:122`. The root cause is not established. Earlier root green preflights do not close this fresh failure.

**Executed:**88 files / 679 unit cases passed; whole nonincremental TypeScript and15-file ESLint passed. Complete selector-free combined gate:22 files, 21 passed / 1 failed; 183 cases, 182 passed / 1 failed / 0 pending; 679.40 seconds Vitest. All 6 new Profile SQL cases passed. No retries or assertion changes.

**Runtime released:**8 owned Next apps and the owned PostgreSQL cluster closed, PIDs/ports absent, PG temp removed. All 8 manifests contain2,016 entries independently SHA256-matched with zero mismatches; tracked source/HEAD/index stayed unchanged. Original invalid setup attempt remains under `f52f314e/combined/`; its errors are not product failures and it is not counted as accepted evidence.

**Gate boundary:** Chromium and WebKit completed 14 Profile checkpoints each; Firefox completed7 then failed. Later Firefox language/legal/desktop/current-revocation/new-account/native-signout coverage is incomplete and rejected as full acceptance.35 Profile checkpoints / 91 registered captures / 54 contrast measurements are raw observations, not a full three-engine pass. Five screenshots were personally inspected and hashed.

## manualQa.surfaceEvidence

| Scenario | Criterion / surface | Verdict | Artifact references |
|---|---|---|---|
| QA01 | Task 3 broad relevant regressions — Terminal / Vitest88-file bounded corpus | PASS | units-invocation, units-result, units-log, argv |
| QA02 | Task 3 full nonincremental typecheck — Terminal / TypeScript | PASS | typescript-invocation, typescript-result |
| QA03 | Task 3 changed-file lint — Terminal / ESLint | PASS | eslint-invocation, eslint-result, lint-scope |
| QA04 | Task 3 expanded complete combined gate — Owned loopback PostgreSQL + all canonical and Employee integration projects | FAIL | combined-invocation, combined-result, combined-log, suite, finding |
| QA05 | Task 1 current own profile authority — Real owned SQL / profile-sql.integration.ts | PASS | suite, combined-log |
| QA06 | Task 2 private lifecycle and Task 3 initial server/mobile/focus/layout — Real Chromium/WebKit/Firefox Profile browser actions | PASS | profile-browser, pixels, owner-profile |
| QA07 | Task 3 System follows current device appearance — Real Firefox System-to-Light browser transition | FAIL | finding, theme, theme-pixels, theme-dom, pending, suite |
| QA08 | Task 3 language/contextual legal/desktop/new-account/native-signout complete three-engine journey — Actual browser, cookie and owned SQL assertions | FAIL | profile-browser, suite, finding |
| QA09 | Task 3 prior Employee and canonical regressions — Real3-engineRequests/Responses/Creation/Planning/Hours/Messages/Review plus canonicalSQL | PASS | suite, requests-browser, responses-browser, creation-browser, planning-browser, hours-browser, messages-browser, messages-review-browser, history |
| QA10 | Task 3 frozen source/mirror/PID/port/DB custody — Terminal / filesystem hashes / local process and sockets / read-only pg observations | PASS | combined-result, custody, observations, marker-note, marker-1, marker-2 |

Exact invocation for the browser/database scenarios:

```text
python3 '/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/run-qa.py' combined --candidate 4bf7257950f898b97b93293470f0677bdb70b6bf --attempt 4bf72579
node scripts/payroll-postgres.mjs vitest.employee-mobile-profile.config.mts --reporter=default --reporter=json --outputFile=/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/suite-results.json
```

All exact static and combined argument vectors/environments, including 88 unit paths and 15 lint paths, are preserved in the referenced invocation JSON. Each scenario’s full detail and exact invocation are also in the adjacent machine-readable manual-QA JSON.

## manualQa.adversarialCases

| Scenario | Class / expected result | Verdict | Evidence |
|---|---|---|---|
| ADV01 | Cross-user/role/workspace/location/session authority — Only current own Employee/Lead facts; deny foreign selector, management reader use, revoked/expired/ineligible context. | PASS | suite, profile-browser |
| ADV02 | Offline and read transport failure — Remove private identity and work facts; retain independent settings/help/signout; deliberate recovery. | PASS | profile-browser |
| ADV03 | Private facts before hydration — Exclude static desktop own identity from mobile serverDOM. | PASS | profile-browser |
| ADV04 | Narrow viewport/enlarged text/keyboard — No horizontal overflow, readable enlarged labels, labelled native controls and nav clearance. | PASS | profile-browser, pixels |
| ADV05 | Rapid system appearance transition — Current System setting must render current device media appearance under this test contract. | FAIL | finding, theme, suite |
| ADV06 | Revocation/new-account leakage/native logout and unresolved device cleanup — Remove identity and services on intent; delete session/cookie; retain opaque unresolved cleanup proof without false success. | FAIL | profile-browser, suite |
| ADV07 | Concurrency/retries/revocation/immutable history — Earlier canonical receipts, source revocations, original operations and history remain correct. | PASS | suite, history, messages-browser, messages-review-browser |
| ADV08 | New arbitrary URL/freeform preference input — No new user-entered redirect/editor/injection surface introduced by this bounded presentation. | not_applicable | profile-browser |

Incomplete cases above are FAIL gates, not claims that unexecuted later functionality is broken. The missing prerequisite is resolution and re-verification of QA-PROFILE-001.

## Limits and next required action

- Local headless macOS browsers with fictional isolated data only.
- Firefox later Profile workflow incomplete after mandatory System assertion failure.
- No physical iOS/Android device, reverse keyboard, assistive technology, hosted/production/release certification.
- Native provider/passkey enrollment, actual verified push-installation detach and remaining capability groups are not certified by this batch.
- Actual no-JavaScript Profile usability is not claimed; prehydration capture proves only identity exclusion.
- No app changes/commits, real messages, production data changes, secret reading or source cleanup performed by QA.

**Next:** Diagnose QA-PROFILE-001 with isolated evidence; apply the smallest justified app or faithful fixture correction without weakening outcomes/timeouts. Freeze new candidate and independently rerun affected3-engine journey and complete acceptance before advancing.

The legacy observer used `obj_description` for a shared database object; its null marker column is preserved. Separate read-only `shobj_description` observations verified real marker/OID values. See marker-note and both marker sidecars; active recorder/helper identity was not changed.

## manualQa.artifactRefs

- **units-invocation** (invocation): Exact argv, scrubbed environment, source count and recorder/helper hashes — [invocation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/units/invocation.json).
- **units-result** (execution-result): Actual process result and immutable-source/custody observations — [result.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/units/result.json).
- **units-log** (terminal-transcript): Unmodified stdout and stderr — [stdout.log](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/units/stdout.log).
- **typescript-invocation** (invocation): Exact argv, scrubbed environment, source count and recorder/helper hashes — [invocation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/typescript/invocation.json).
- **typescript-result** (execution-result): Actual process result and immutable-source/custody observations — [result.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/typescript/result.json).
- **eslint-invocation** (invocation): Exact argv, scrubbed environment, source count and recorder/helper hashes — [invocation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/eslint/invocation.json).
- **eslint-result** (execution-result): Actual process result and immutable-source/custody observations — [result.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/eslint/result.json).
- **combined-invocation** (invocation): Exact argv, scrubbed environment, source count and recorder/helper hashes — [invocation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/invocation.json).
- **combined-result** (execution-result): Actual process result and immutable-source/custody observations — [result.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/result.json).
- **combined-log** (terminal-transcript): Unmodified stdout and stderr — [stdout.log](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/stdout.log).
- **suite** (test-results): Full selector-free 22-file, 183-case assertion results — [suite-results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/suite-results.json).
- **finding** (finding): Open independent QA-PROFILE-001 with exact diagnostic state and artifact hashes — [QA-PROFILE-001.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/QA-PROFILE-001.json).
- **theme** (browser-diagnostic): Firefox root theme dark despite System and dark matchMedia false — [firefox-theme-diagnostic.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/profile/firefox-theme-diagnostic.json).
- **theme-pixels** (browser-screenshot): Personally inspected failure screenshot — [firefox-failure.png](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/profile/firefox-failure.png).
- **theme-dom** (browser-dom): Actual failure DOM — [firefox-failure.html](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/profile/firefox-failure.html).
- **pending** (browser-diagnostic): No outstanding app/API requests at the Profile failure — [firefox-pending-requests.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/profile/firefox-pending-requests.json).
- **pixels** (visual-review): Five personally inspected current-candidate screenshots and bounded observations — [personally-inspected-pixels.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/personally-inspected-pixels.json).
- **custody** (source-custody): Independent all-eight-manifest SHA256 and postrun PID/port checks — [final-source-custody-verification.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/final-source-custody-verification.json).
- **observations** (runtime-observations): Periodic candidate/owned cluster/PID/port/OID observations; original marker column retained — [observations.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/observations.json).
- **marker-note** (diagnostic-note): Separately identified correction from obj_description to shared-object shobj_description — [database-observer-note.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/database-observer-note.json).
- **marker-1** (database-observation): Read-only shared-comment disposable marker and OID, first owned app — [observed-database-shared-markers.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/observed-database-shared-markers.json).
- **marker-2** (database-observation): Read-only shared-comment disposable marker and OID, communications-review app — [observed-database-shared-markers-second.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/observed-database-shared-markers-second.json).
- **invalid-attempt** (failed-setup-record): Earlier f52 attempt invalid/incomplete, both observer and evidence-directory setup errors retained with teardown — [invalid-attempt-closure.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/f52f314e/combined/invalid-attempt-closure.json).
- **argv** (scope-record): Reconstructed saved 76-file corpus plus fixture guard/new Profile/shared regressions, 88 files — [unit-argv-preparation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/unit-argv-preparation.json).
- **lint-scope** (scope-record): Exact 15 changed TS/TSX/MJS/MTS files — [lint-files.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/lint-files.json).
- **requests-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/requests/results.json).
- **responses-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/responses/results.json).
- **creation-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/creation/results.json).
- **planning-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/planning/results.json).
- **hours-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/hours/results.json).
- **messages-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/messages/results.json).
- **messages-review-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/messages-review/results.json).
- **profile-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/profile/results.json).
- **owner-messages** (runtime-ownership): Owned mirror source/hash closure and exact database identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/messages/owned-next-9ClGEK/ownership.json).
- **owner-responses** (runtime-ownership): Owned mirror source/hash closure and exact database identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/responses/owned-next-ifA9Rx/ownership.json).
- **owner-planning** (runtime-ownership): Owned mirror source/hash closure and exact database identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/planning/owned-next-qBaAJL/ownership.json).
- **owner-requests** (runtime-ownership): Owned mirror source/hash closure and exact database identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/requests/owned-next-XCDdkG/ownership.json).
- **owner-messages-review** (runtime-ownership): Owned mirror source/hash closure and exact database identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/messages-review/owned-next-W7Gnel/ownership.json).
- **owner-creation** (runtime-ownership): Owned mirror source/hash closure and exact database identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/creation/owned-next-SRVvpL/ownership.json).
- **owner-profile** (runtime-ownership): Owned mirror source/hash closure and exact database identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/profile/owned-next-sQQuIC/ownership.json).
- **owner-hours** (runtime-ownership): Owned mirror source/hash closure and exact database identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/hours/owned-next-fApaCM/ownership.json).
- **manifest-messages** (source-manifest): Frozen source hashes and explicitly substituted local DB transport — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/messages/owned-next-9ClGEK/source-manifest.json).
- **manifest-responses** (source-manifest): Frozen source hashes and explicitly substituted local DB transport — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/responses/owned-next-ifA9Rx/source-manifest.json).
- **manifest-planning** (source-manifest): Frozen source hashes and explicitly substituted local DB transport — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/planning/owned-next-qBaAJL/source-manifest.json).
- **manifest-requests** (source-manifest): Frozen source hashes and explicitly substituted local DB transport — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/requests/owned-next-XCDdkG/source-manifest.json).
- **manifest-messages-review** (source-manifest): Frozen source hashes and explicitly substituted local DB transport — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/messages-review/owned-next-W7Gnel/source-manifest.json).
- **manifest-creation** (source-manifest): Frozen source hashes and explicitly substituted local DB transport — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/creation/owned-next-SRVvpL/source-manifest.json).
- **manifest-profile** (source-manifest): Frozen source hashes and explicitly substituted local DB transport — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/profile/owned-next-sQQuIC/source-manifest.json).
- **manifest-hours** (source-manifest): Frozen source hashes and explicitly substituted local DB transport — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/hours/owned-next-fApaCM/source-manifest.json).
- **history** (database-evidence): Canonical communication history preservation written in this valid attempt — [communication-history-preservation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/canonical-e/communication-history-preservation.json).

The adjacent JSON records each artifact’s byte count and SHA256. Every PASS refers to nonempty recorded evidence.
