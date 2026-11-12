# D2 authority attribution code review

codeQualityStatus: CLEAR
recommendation: APPROVE
blockers: []

Reviewed current uncommitted seven-file change against independently confirmed HEAD 40155983a5074dc51d4ba05eda60dfafc37e726c: .github/workflows/ci.yml; scripts/browser-navigation-diagnostic.mjs; scripts/browser-reload-diagnostic.mjs; scripts/notification-read-witness.mjs; scripts/phase-e-browser-qa.mjs; scripts/phase-d2-ui-remediation-qa.mjs; new scripts/d2-authority-reload.check.mjs. No ULW plan exists (status command returned ULW_LOOP_PLAN_MISSING). No notepad supplied.

## Findings by severity
- CRITICAL: none.
- HIGH: none.
- MEDIUM: none.
- LOW: none remaining. Earlier coexistence coverage suggestion resolved: the native control now exercises both wrappers installed together for notification and authority reads; the D2 authority qualification probe uses bothWitnesses=true.

## Correctness and scope
The authority branch requires explicit authorityDiagnosticVerified, requireAuthorityGetWitness and a verified per-document witness. The existing native signature, own plain URL, WebKit engine, scenario phase and actual pending main-frame navigation predicates still apply. Same-URL reload eligibility additionally depends on the existing verified reload mechanism. Defaults cannot enable authority attribution.

The shared classifier preserves notification wrapper export and fixed notification binding. Authority has a separate fixed binding/path and independent WeakMap state. Native Request conversion fixes GET/no-body before asynchronous reporting, while the existing synchronous recheck rejects unsupported mutations. Query, body, POST, Request input, accessors, invalid/mutated inputs and base-URI controls remain unproved/fatal. A witness requires exactly one pending attempt and zero unproved attempts; consume clears that attempt, preventing reuse. No requestfailed method inference was added.

Window error/unhandledrejection observation remains separately fatal, including when authority proof is the only diagnostic opt-in. D2 explicitly checks window/unproved errors at completion and in cleanup; unclassified page errors continue into its unchanged unexpected-runtime assertion. Only the exact error object classified by the observer is omitted from the normal-phase D2 runtime collection. No timeout, focus assertion, application UI, worker repair, or deployment behavior changed.

## Evidence independently inspected
- ../scrum146-ci-66-d2-runtime-failure/nevora-d2-browser-evidence/report.json: checkpoint 66bfaacfceb5401a325cfd578caff0cfbddb301a, 281 checks; final unexpected-runtime failure for manager authority read. Observer records plainOwnRead=true, pendingMainFrameNavigation=true, reload-requested sequence 2, age 93 ms. No window exception entries in the recorded runtimeErrors.
- ../d2-authority-attribution-red.log: authority native-control report verified=false before attribution implementation.
- ../d2-authority-related-regressions.log: reports 52 tests passed, zero failures. Inspected supplied evidence; did not independently rerun those 52.

## Checks independently run
1. NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/Users/josek0514/.codex/worktrees/nevora-hosted-closeout-20261112/tools/ci-browser-runtime/package.json node scripts/d2-authority-reload.check.mjs
   Latest independent rerun: exit 0. Native WebKit: 56 cells total — 17 notification-default, 17 notification with both witnesses, and 22 authority with both witnesses; all three reports verified=true. Full independent output: /tmp/d2-authority-review-composed-controls.log. Earlier 39-cell run retained at /tmp/d2-authority-review-controls.log. Authority positive controls retained source document identity, caught status 0, zero ingress and one classified native diagnostic; idle GET reached server with status 200 and no diagnostic. Negative controls remained fatal, including window errors/unhandledrejection, successor document, unsupported inputs, overlapping reads and both missing-proof modes.
2. node node_modules/eslint/bin/eslint.js scripts/browser-navigation-diagnostic.mjs scripts/browser-reload-diagnostic.mjs scripts/notification-read-witness.mjs scripts/phase-e-browser-qa.mjs scripts/phase-d2-ui-remediation-qa.mjs scripts/d2-authority-reload.check.mjs
   Passed with no output.
3. git diff --check: passed.

## Skill perspectives
The remove-ai-slops and programming skills were loaded earlier in this review session and their criteria were applied to this new diff. No material violations: these are behavioral native-browser controls, not deletion/prose/constant-mirroring tests. Generalizing the existing fixed-path witness avoids duplicating hardened input classification; added parsing/validation is confined to test evidence and is necessary to prove the requested attribution boundary. No application production extraction, type escape hatch, speculative abstraction or relaxed assertion was introduced. The coexistence coverage suggestion is resolved by native behavioral controls, without adding production behavior or weakening negative assertions.

## Ready verdict and limits
APPROVE for committing and proceeding to exact combined-candidate isolated D2/requalification. Not hosted acceptance, independent audit certification, development-push approval or release closure. Did not run full D2, providers, hosted checks or communications QA. No implementation/index/HEAD changes made. Only this review artifact and independent temporary test log were written.

## Composition follow-up
Reviewed the incremental bothWitnesses option, three-configuration focused runner, report metadata, and D2 composed authority probe. Both fixed bindings remain independently installed; without-native-proof and without-method-witness still disable their respective authority prerequisite even in composed mode. No new findings. Independently reran all 56 native controls, ESLint on the three follow-up files, and git diff --check: all passed. CLEAR / APPROVE remains unchanged; exact-source full D2/requalification is still pending and outside this review.
