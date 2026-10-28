# Passkeys code findings — author-owned closure

Original review `CODE_REVIEW.md`, fix review `CODE_REVIEW_B93A155B.md` and `CANCELLATION_EVIDENCE_INTERIM.md` are preserved without rewriting their historical dispositions.

**CR-PK-2 is CLOSED for controlled browser cancellation focus** at application candidate `b93a155b64f0273782a47e0efedbc00b2fe59bb1`, exercised by run07 test candidate `e3b2bea09e79f63de2cb8b3f692e70ad51a561f3`. CR-PK-1 and CR-PK-3 retain their previously authored code/controller and code/structure closure. This closes these three code findings; it does **not** make the full runtime gate green or close independent UI/QA findings.

## Exact scenarios and binary observations

| Scenario | Engines | Binary assertion before checkpoint | Artifact |
| --- | --- | --- | --- |
| Controlled native dismissal throws NotAllowedError after deliberate Add | Chromium, WebKit, Firefox | After cancellation text, `document.activeElement === Add button`; own server credential count equals 0 | `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-cancellation-closure/run-07-cancellation-checkpoints.json`, `run-07-numbered-test-source.txt:50` |
| Explicit Cancel setup while controlled native promise is held | Chromium, WebKit, Firefox | Cancel aborts held native operation; after cancellation text, `document.activeElement === Add button`; own server credential count equals 0 | Same checkpoint artifact and numbered test source line51 |

The test records each checkpoint only after those assertions. This reviewer inspected the test implementation (including the fictional native create/abort behavior), all six checkpoint entries, terminal outcome and source custody. The assertions inspect actual DOM focus; they do not set the focused element from the test. The application effect retains completion intent through refresh and chooses the Add ref for cancellation (`src/components/employee-mobile/passkeys.tsx:77-85`).

## Invocation and custody

Root-issued invocation: `node scripts/payroll-postgres.mjs vitest.employee-mobile-passkeys.config.mts src/test/integration/employee-mobile-passkeys.integration.ts`, from the repository workdir. Explicit evidence/owned PostgreSQL/Playwright path environment values and candidate are preserved at `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-cancellation-closure/run-07-invocation.json`, copied from `outputs/employee-mobile-passkeys/run-07/invocation.json`. That invocation record was reconstructed retrospectively from the issued tool call; it is **not a full inherited-environment snapshot**. This reviewer did not rerun the app server or full browser suite.

The owned runtime snapshot `run-07/owned-next-SeGzhx/app` was independently read. Its controller, Employee view, extracted desktop view and incumbent section each match application b93a155b byte-for-byte. Its test file matches e3b2bea0 byte-for-byte. Paths, SHA256 values and comparisons are recorded in `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-cancellation-closure/run-07-source-custody.json`. The branch delta b93a155b..e3b2bea0 changes only the browser test. The six cancellation checkpoints are contained in the actual 36-checkpoint result, whose 138 listed capture paths were verified present and nonempty; this file verification is not a visual-quality claim.

## Failed global gate remains failed

Run07's test body completed, but Vitest reports **1 unhandled error**: `route.fulfill: Route is already handled!`. Thus the overall invocation is **FAILED**, regardless of `result.json` saying passed or the root wrapper's postprocessing exit0. Evidence: original `run-07/stdout.log`, plus bounded `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume/.omo/evidence/passkeys-cancellation-closure/run-07-terminal-summary.txt`. The complete result is copied as `run-07-result.json` for checkpoint provenance. No suppression, causal fix or rerun pass is inferred here.

Separately, the independent UI reviewer has reported missing visible outline on the Firefox removal confirmation group. This is distinct from the cancellation-to-Add active-element defect closed here; this reviewer neither closes nor waives the UI author's finding. Current run08/new CSS evidence remains outside this closure record. Independent QA also retains ownership of broader baseline comparison and final runtime acceptance.

Physical native OS sheets, actual credential stores, device visibility event order and assistive technology were not exercised by the controlled native stub. Hosted/CI/production readiness is not certified. Calendar QA-CAL-1 remains **OPEN RISK, cause unresolved**.

## Review disposition

No open finding remains among this reviewer's CR-PK-1/2/3 for the stated application candidate and code-level scope. Overall completion/release remains blocked on the failed runtime gate and independent UI/QA requirements; no risk acceptance or production authorization is implied. Root owns the bounded UI/test corrections and next frozen evidence, while each independent author owns their finding closure.

No product/test/config edit, broad test, app/database startup, commit, push, merge or deployment was performed by this reviewer during this closure. Fresh independent unit/controller evidence for CR-PK-1/3 remains in `.omo/evidence/passkeys-code-rereview-b93a155b`; this closure independently inspected the root-produced runtime evidence and its source binding.
