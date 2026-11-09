# Independent Employee Profile QA — GO WITH CONDITIONS

**Tested candidate:** `2e4104ce89f1abbb2d3bafd5b87341eba9753c47` on `codex/employee-mobile-local-resume-20261027`. This is bounded local Profile acceptance, not release authorization.

**QA-PROFILE-001: VERIFIED CLOSED by its independent QA author.** The old actual writer reproduced the native Firefox mismatch on the first cycle. The corrected actual writer passed all 50 strict cycles. The unchanged application System-to-Light sequence and its existing assertions/timeouts then passed in Chromium, WebKit and Firefox, including every later Profile stage. Original `4bf72579` NO-GO and failure evidence remain immutable.

**Fresh gates:** 88 files / 682 unit tests passed; whole nonincremental TypeScript passed; 17 changed-file ESLint passed. Complete selector-free integration gate: 22 files / 183 cases passed, zero failed or pending, 597.75 seconds Vitest / 599.211 seconds recorder. Profile: 14 checkpoints per engine, 42 total, 111 listed captures plus 3 prehydration PNGs, 54 contrast measurements. Six fresh screenshots were personally inspected.

**Custody released:** all 8 owned Next apps closed with source/mirror verification; all 8 x 2,016 source-manifest entries independently SHA256-match the candidate. Every owned PID/port is absent, PostgreSQL stopped and its owned temp directory was removed. Tracked source/HEAD/index stayed unchanged. Corrected observer records real shared-object markers; original observer files and prior artifacts remain preserved.

## manualQa.surfaceEvidence

| Scenario | Criterion / surface | Verdict | Evidence |
|---|---|---|---|
| QA01 | Task 3 / QA-PROFILE-001 independent reproduction — Native Firefox isolated HTML; actual committed old/new theme writer | PASS | probe-proof, probe-red, probe-green, probe-script |
| QA02 | Task 3 broad relevant regression — Terminal / bounded Vitest corpus | PASS | units-invocation, units-result, units-log, unit-scope |
| QA03 | Task 3 whole typecheck — Terminal / TypeScript | PASS | typescript-invocation, typescript-result |
| QA04 | Task 3 scoped lint — Terminal / ESLint | PASS | eslint-invocation, eslint-result, lint-scope |
| QA05 | Task 3 complete acceptance gate — Owned PostgreSQL and all canonical/Employee integration projects | PASS | combined-invocation, combined-result, combined-log, suite |
| QA06 | Task 1 current own authority — Real owned SQL plus browser HTTP selector rejection | PASS | suite, profile-browser |
| QA07 | Task 2 private lifecycle / Task 3 layout and keyboard — Actual Chromium/WebKit/Firefox Profile | PASS | profile-browser, pixels |
| QA08 | Task 3 / QA-PROFILE-001 actual appearance closure — Actual 3-engine System-to-Light application transition | PASS | profile-browser, firefox-system, pixels |
| QA09 | Task 2/3 preferences, canonical legal and responsive ownership — Actual browser cookie/reload, legal disclosures/focus and desktop resize | PASS | profile-browser, pixels |
| QA10 | Task 1/3 native session lifecycle — Actual browser native POST/cookies and owned SQL | PASS | profile-browser, owner-profile |
| QA11 | Task 3 preceding Employee/canonical regression — Requests/Responses/Creation/Planning/Hours/Messages/Review and canonical SQL | PASS | suite, requests-browser, responses-browser, creation-browser, planning-browser, hours-browser, messages-browser, messages-review-browser, history |
| QA12 | Task 3 immutable inputs and full owned teardown — Filesystem SHA256 / terminal process checks / local sockets / read-only DB identity observations | PASS | combined-result, custody, observations, recorder-provenance, prior-preservation |

Exact complete acceptance invocation:

```text
python3 '/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/run-qa-v2.py' combined --candidate 2e4104ce89f1abbb2d3bafd5b87341eba9753c47 --attempt 2e4104ce
node scripts/payroll-postgres.mjs vitest.employee-mobile-profile.config.mts --reporter=default --reporter=json --outputFile=/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/suite-results.json
```

Exact static invocation:

```text
python3 '/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/run-qa.py' static --candidate 2e4104ce89f1abbb2d3bafd5b87341eba9753c47 --attempt 2e4104ce
```

Every full argument vector, scrubbed environment, candidate/hash and per-scenario detail is in the referenced invocation JSON and adjacent machine-readable manual-QA matrix. The probe-proof record contains the exact serial native Firefox RED/GREEN invocations.

## manualQa.adversarialCases

| Scenario | Class / expected behavior | Verdict | Evidence |
|---|---|---|---|
| ADV01 | Cross-user / role / workspace / location / session — Expose only current authorized own Employee/Lead facts; reject peers, management on own reader and stale eligibility. | PASS | suite, profile-browser |
| ADV02 | Offline / failed read / stale private state — Remove identity/work facts while private read is paused or unavailable; retain independent help/preferences and deliberate recovery. | PASS | profile-browser |
| ADV03 | Prehydration identity — Exclude static desktop identity from mobile server DOM. | PASS | profile-browser |
| ADV04 | Coalesced native appearance events / pending choice — System reconciles current media; pending work respects latest explicit or other-tab choice. | PASS | probe-red, probe-green, probe-proof, units-log, profile-browser |
| ADV05 | Narrow layout / 200% text / keyboard — No horizontal overflow; enlarged labels remain readable and controls/navigation usable. | PASS | profile-browser, pixels |
| ADV06 | Revocation / new account / native signout / partial device cleanup — Remove private facts immediately; delete own session; retain unresolved cleanup proof without false success. | PASS | profile-browser, suite |
| ADV07 | Concurrency / duplicate operation / revoked source / immutable history — Canonical operations, receipts, current authority and history remain correct. | PASS | suite, history, messages-browser, messages-review-browser |
| ADV08 | New arbitrary redirect / freeform editor — No newly introduced arbitrary URL or text-edit authority. | not_applicable | profile-browser |

## Conditions and untested gates

- GO is bounded to this local Profile/preferences/help/legal/native-signout batch and tested candidate.
- Physical iOS/Android devices, assistive technology, reverse keyboard traversal, hosted/production CI and release remain separate, unexecuted gates.
- The 200% test changes root text size; it is not physical OS Dynamic Type certification.
- Prehydration checks prove static identity exclusion; no-JavaScript Profile usability is not certified.
- Native passkey/provider enrollment and verified push-installation detach are not certified here; the actual signout checks cover no-installation cleanup and honest opaque pending-proof retention.
- Full Calendar/passkeys/current-device alerts/deletion/Pay ports and Phase 3 remain outside this accepted batch.
- Earlier Communications reviewer conditions are not closed by this Profile QA report. No blanket whole-app or all-feature release claim.
- Local headless browsers, fictional owned data, no real notifications, production data changes or deployment. QA made no app/config/test/HEAD/index edits.

**Next:** Record this exact candidate and independent closure; retain earlier failures. Continue only the authorized next Phase 2 group. Complete physical-device/AT/hosted/release gates before claiming those environments accepted.

## manualQa.artifactRefs

- **units-invocation** (invocation): Exact argv, scrubbed environment, candidate and recorder/helper hashes — [invocation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/units/invocation.json).
- **units-result** (execution-result): Actual exit result and immutable-source/custody state — [result.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/units/result.json).
- **units-log** (terminal-transcript): Unmodified executed stdout/stderr — [stdout.log](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/units/stdout.log).
- **typescript-invocation** (invocation): Exact argv, scrubbed environment, candidate and recorder/helper hashes — [invocation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/typescript/invocation.json).
- **typescript-result** (execution-result): Actual exit result and immutable-source/custody state — [result.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/typescript/result.json).
- **eslint-invocation** (invocation): Exact argv, scrubbed environment, candidate and recorder/helper hashes — [invocation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/eslint/invocation.json).
- **eslint-result** (execution-result): Actual exit result and immutable-source/custody state — [result.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/eslint/result.json).
- **combined-invocation** (invocation): Exact argv, scrubbed environment, candidate and recorder/helper hashes — [invocation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/invocation.json).
- **combined-result** (execution-result): Actual exit result and immutable-source/custody state — [result.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/result.json).
- **combined-log** (terminal-transcript): Unmodified executed stdout/stderr — [stdout.log](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/stdout.log).
- **suite** (assertion-results): Complete selector-free 22-file, 183-case results — [suite-results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/suite-results.json).
- **probe-proof** (browser-diagnostic): Independent actual-writer RED versus GREEN execution and strict 50-cycle validation — [independent-probe-verification.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/independent-probe-verification.json).
- **probe-red** (browser-action-log): Old actual writer reproduces the native Firefox System mismatch on cycle one — [theme-actual-writer-red.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/theme-actual-writer-red.json).
- **probe-green** (browser-action-log): Corrected actual writer: all 50 native Firefox cycles render current light System state — [theme-actual-writer-green.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/theme-actual-writer-green.json).
- **probe-script** (diagnostic-source): Independently executed probe; only output path differs from original author probe — [theme-actual-writer-independent.mjs](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/theme-actual-writer-independent.mjs).
- **probe-prep** (diagnostic-provenance): Original/copied script hashes and inspected prior evidence — [probe-preparation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/probe-preparation.json).
- **pixels** (visual-review): Six personally inspected current screenshots with hashes and bounded observations — [personally-inspected-pixels.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/personally-inspected-pixels.json).
- **firefox-system** (browser-screenshot): Personally inspected current Firefox System selected and light page rendered — [firefox-profile-system-light.png](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/profile/firefox-profile-system-light.png).
- **custody** (source-custody): Independent 8-manifest SHA256 and direct postrun PID/port verification — [final-source-custody-verification.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/final-source-custody-verification.json).
- **observations** (runtime-observations): Periodic frozen candidate, owned cluster, OID and correct shared-marker observations — [observations.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/observations.json).
- **recorder-provenance** (diagnostic-provenance): Versioned external observer correction; old files retained unchanged — [recorder-v2-provenance.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/recorder-v2-provenance.json).
- **unit-scope** (scope-record): Saved 76-file invocation plus justified fixture/Profile/shared cases: 88 files — [unit-argv-preparation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/unit-argv-preparation.json).
- **lint-scope** (scope-record): Exact 17 changed TS/TSX/MJS/MTS files — [lint-files.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/lint-files.json).
- **prior-no-go** (prior-report): Immutable NO-GO for candidate 4bf72579 — [employee-mobile-profile-manual-qa.md](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/employee-mobile-profile-manual-qa.md).
- **prior-finding** (prior-finding): Original independently authored OPEN finding with exact failed state — [QA-PROFILE-001.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/QA-PROFILE-001.json).
- **prior-suite** (prior-assertion-results): Immutable 182/183 acceptance failure on 4bf72579 — [suite-results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/4bf72579/combined/suite-results.json).
- **prior-preservation** (provenance): Prior report/failure hashes retained and reverified by final custody check — [retained-prior-failure-artifacts.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/retained-prior-failure-artifacts.json).
- **requests-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/requests/results.json).
- **responses-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/responses/results.json).
- **creation-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/creation/results.json).
- **planning-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/planning/results.json).
- **hours-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/hours/results.json).
- **messages-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/messages/results.json).
- **messages-review-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/messages-review/results.json).
- **profile-browser** (browser-action-log): Actual engine checkpoints, captures, contrast and diagnostic records — [results.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/profile/results.json).
- **owner-messages** (runtime-ownership): Owned mirror closure and exact disposable DB identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/messages/owned-next-4Oda31/ownership.json).
- **owner-responses** (runtime-ownership): Owned mirror closure and exact disposable DB identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/responses/owned-next-hkiZFq/ownership.json).
- **owner-planning** (runtime-ownership): Owned mirror closure and exact disposable DB identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/planning/owned-next-fadKyF/ownership.json).
- **owner-requests** (runtime-ownership): Owned mirror closure and exact disposable DB identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/requests/owned-next-jb04Re/ownership.json).
- **owner-messages-review** (runtime-ownership): Owned mirror closure and exact disposable DB identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/messages-review/owned-next-lvNcFb/ownership.json).
- **owner-creation** (runtime-ownership): Owned mirror closure and exact disposable DB identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/creation/owned-next-chGb2T/ownership.json).
- **owner-profile** (runtime-ownership): Owned mirror closure and exact disposable DB identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/profile/owned-next-Mxoc05/ownership.json).
- **owner-hours** (runtime-ownership): Owned mirror closure and exact disposable DB identity — [ownership.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/hours/owned-next-7gTHAE/ownership.json).
- **manifest-messages** (source-manifest): Frozen source hashes and explicit local DB transport substitution — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/messages/owned-next-4Oda31/source-manifest.json).
- **manifest-responses** (source-manifest): Frozen source hashes and explicit local DB transport substitution — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/responses/owned-next-hkiZFq/source-manifest.json).
- **manifest-planning** (source-manifest): Frozen source hashes and explicit local DB transport substitution — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/planning/owned-next-fadKyF/source-manifest.json).
- **manifest-requests** (source-manifest): Frozen source hashes and explicit local DB transport substitution — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/requests/owned-next-jb04Re/source-manifest.json).
- **manifest-messages-review** (source-manifest): Frozen source hashes and explicit local DB transport substitution — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/messages-review/owned-next-lvNcFb/source-manifest.json).
- **manifest-creation** (source-manifest): Frozen source hashes and explicit local DB transport substitution — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/creation/owned-next-chGb2T/source-manifest.json).
- **manifest-profile** (source-manifest): Frozen source hashes and explicit local DB transport substitution — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/profile/owned-next-Mxoc05/source-manifest.json).
- **manifest-hours** (source-manifest): Frozen source hashes and explicit local DB transport substitution — [source-manifest.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/hours/owned-next-7gTHAE/source-manifest.json).
- **history** (database-evidence): Canonical communication history preservation from this invocation — [communication-history-preservation.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/combined/canonical-e/communication-history-preservation.json).
- **closure** (finding-closure): Independent author-owned closure of QA-PROFILE-001 on exact corrected candidate — [QA-PROFILE-001-closure.json](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-review/qa/2e4104ce/QA-PROFILE-001-closure.json).

The adjacent JSON records bytes and SHA256 for every artifact reference. Every PASS points to nonempty evidence. No earlier failed attempt has been relabeled as a pass.
