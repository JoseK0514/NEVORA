# Independent QA review — Employee mobile communications

Authored 2026-10-27T18:47:51.126065+00:00 by independent Senior QA (`/root/communications_qa_acceptance`), reporting directly to Jose. This records the original frozen candidate; later remediation and author-owned closure must be appended with its new candidate identity, without rewriting this failure history.

**QA recommendation: NO-GO for completion or local acceptance of this communications batch.** Required combined and lint gates failed. Independent code/UI material findings also remain open. Successful units, TypeScript, communications scenarios and custody do not waive those failures.

Candidate: `f7e331a7859ef55400eb1ce1e6420d4b5a9fdff9`. Base: `564c71371e16f528a94aa242e42bf906d5890314`. Branch: `codex/employee-mobile-cloud-handoff-20261027`. Working directory: `/workspace/NEVORA`. Phase2 remains active; this report does not start Phase3 or authorize integration, activation, deployment or production.

## VERIFIED — actual required execution

I personally ran the following gates against the frozen candidate, retained their complete stdout, exact JSON argv/environment, timestamps, exit codes and input hashes, and inspected every result. Evidence root: [/workspace/nevora-evidence/independent-qa](/workspace/nevora-evidence/independent-qa). The exact JSON commands are reviewable in each gate's `invocation.json`; results are in `result.json`, logs in `stdout.log`.

| Required gate | Personally observed result |
| --- | --- |
| `node scripts/payroll-postgres.mjs vitest.employee-mobile-communications.config.mts` | **RED**, exit1; 19 files: 8 failed/11 passed; 172 tests: **94 failed/78 passed**; 759.47s Vitest, 760.597s recorder. All six canonical suites were included. |
| Saved `units-invocation.json` argv, parsed as JSON with current cwd | **GREEN**, 76 files, 600/600 tests; 34.50s Vitest. The argv was unchanged, including `--no-file-parallelism`, and ran after every Next runtime and PostgreSQL teardown. |
| `./node_modules/.bin/tsc --noEmit --incremental false` | **GREEN**, exit0, 40.27s; empty diagnostic stdout. |
| Changed-source ESLint, base..candidate, src/scripts/root config TS/TSX/MJS/MTS | **RED**, exit1, 37 files; one error/zero warnings; 5.162s. Exact file argv retained. |

The combined run's exact per-file counts are in [suite-results.json](/workspace/nevora-evidence/independent-qa/combined/suite-results.json), and all 94 individual failed case names are retained in [failed-case-index.json](/workspace/nevora-evidence/independent-qa/combined/failed-case-index.json). The new communications browser case and all eight communications SQL cases passed. Of the incumbent 71 Employee cases, 69 passed and two failed strict browser diagnostics. The 92 additional canonical cases never reached their business assertions because their fixture setup was refused.

| Browser fixture | Checkpoints completed | Captures | Unexpected page errors | Retained warnings |
| --- | ---: | ---: | ---: | ---: |
| creation | 40 | 192 | 0 | 12 |
| hours | 51 | 105 | 0 | 6 |
| messages | 69 | 210 | 0 | 26 |
| mobile | 28 | 36 | 0 | 3 |
| planning | 63 | 114 | 2 | 12 |
| responses | 34 | 90 | 2 | 3 |

All six fixtures ran Chromium, WebKit and Firefox. Checkpoint completion does **not** turn a fixture with fatal diagnostics into a pass. Selected action contrast samples have minimum 6.089452668960573:1; this is not a comprehensive contrast audit. Expected fault-stage console errors and failed/cancelled requests remain in each fixture's raw `results.json`. I did not personally inspect every capture, and this QA run does not substitute for the separately authored pixel review.

## BLOCKER — QA-COM-001, strict WebKit runtime diagnostics

**OPEN; QA owns closure.** [Original finding](/workspace/nevora-evidence/independent-qa/QA-COM-001.json), [additional occurrence](/workspace/nevora-evidence/independent-qa/QA-COM-001-additional-occurrence.json).

- Responses failed at `src/test/integration/employee-mobile-responses.integration.ts:182`, after 34 workflow checkpoints, with two unexpected WebKit `pageerror` entries in `own-pickup`: loopback `/api/notifications` and `/api/employee/exchange` fetches “due to access control checks.”
- Planning failed at its final strict diagnostics assertion, after 63 workflow checkpoints, with two unexpected WebKit `pageerror` entries in `authority-loss`: loopback `/api/notifications` and `/api/employee/planning/timeoff/list`, with the same diagnostic.

Exact stacks, stage and engine are in the two fixture result files and the finding records. Cause remains undetermined. I have not relabelled the errors as harmless cancellation, an environmental issue or expected authority refusal. No failure PNG/HTML was produced because the final assertion ran after each engine had closed and cleared its per-engine failure callback; this limit is explicit. Existing scenario captures and Next logs remain available. Closure requires cause-backed correction or diagnosis and independently observed clean strict diagnostics on the required final candidate; no pageerror allowlist or assertion weakening.

## BLOCKER — QA-COM-002, expanded runner cannot admit its canonical fixtures

**OPEN; QA owns closure.** [Finding](/workspace/nevora-evidence/independent-qa/QA-COM-002.json).

The runner chooses `nevora_exchange_test_` for this combined config. Five canonical suites, including Company access through its default fixture, require `nevora_foundation_test_`; the notification suite requires `fuel_phase3_test_`. All 92 canonical tests failed setup at `src/test/integration/local-postgres.ts:59:11` with **“Refusing non-disposable/remote SQL target.”** Counts: schema11, Company access40, notifications11, communications17, gap remediation7, acknowledgement6. This is a harness integration defect and a missing acceptance gate, not evidence that the canonical business protections failed.

Keep all 19 files and the exact full command. Correct owned environment mapping while preserving the strict per-fixture prefix, loopback, new-database, marker, OID and create/drop guards. Root has proposed per-project environment derivation from the validated owned cluster; that proposal is **not independently approved** until the actual patch and runtime evidence exist. Removing the canonical files or widening the guards would not close this finding.

## BLOCKER — QA-COM-003, required lint gate

**OPEN; QA owns closure.** [Finding](/workspace/nevora-evidence/independent-qa/QA-COM-003.json).

`src/lib/data/employee-notification-list.server.ts:167:5`: `@next/next/no-assign-module-variable`, “Do not assign to the variable module.” One error, zero warnings. The local declaration needs correction without changing current source/module policy; rerun required changed-source lint on the final candidate. No rule disable or waiver is accepted.

## ISSUE — other independent material findings remain open

I read and retained hashes of the original [whole-change code review](/workspace/nevora-evidence/reviews/FINAL_CODE_REVIEW.md) and [independent UI review](/workspace/nevora-evidence/reviews/INDEPENDENT_UI_REVIEW.md). Their authors own closure; I did not execute their probes or browser reproductions myself.

- CR-1: a refused lookup clears an already-unknown original operation, preventing recovery and permitting a new UUID after restoration.
- CR-2: notification-open transport/body is unbounded and can block subsequent opens across refresh/pause.
- CR-3: OPTIONAL update detail loses the independently permitted Mark as read action.
- UI-COM-001: custom compose errors lack actual-field association and first-invalid focus.

CR-4 partial-empty wording and UI-COM-002/003 enlarged-word readability/canvas continuity are authored nonblocking conditions. UI-COM-R1 is an explicit gap in evidence after the held response is released while Updates remains off. I have not silently closed or changed any of those classifications.

## VERIFIED — candidate, source, mirror, environment and cleanup custody

[Independent custody audit](/workspace/nevora-evidence/independent-qa/combined/custody-audit.json) passed. I checked all six retained mirror inventories against the committed candidate's **2,004** application inputs, with exactly the approved derived DB adapter (`src/lib/db.ts`) and generated dev type references (`next-env.d.ts`). The two derived contents/hashes were independently reconstructed; no other substituted source or `.env` input was admitted. All six source/mirror closure flags and all six PID/process-group/port checks passed. Preserved dependency/build derivatives were released by the owned harness after verification.

The execution recorder monitored **2,197** tracked app/script/config inputs. All four gates ended with source/index/branch unchanged and no observed source changes. The original PG cluster was independently observed at loopback42795/PID9647, with marker-derived c1 database name, OID and disposable marker; its directory was removed, its PID was no longer live and its port refused connections. Each app's database identity matched an independently observed owned cluster identity. No live owned Next/PG/Vitest process remained at each gate's final check. Ownership metadata preserves each exact PID and port.

The initial optional Python observer could not run absent `psql`; those errors are retained in `observations.jsonl`. A supplemental read-only observer using the existing `pg` package independently captured actual database identities and teardown in `database-observations.jsonl` and `database-custody-result.json`. This corrected the instrumentation gap without changing the test command, fixture or guard. Artifact hashes were finalized after output streams closed. A transient execution-service disconnect occurred before starting the custody auditor; the resumed auditor completed successfully.

Runtime: Debian13, Node24.19.0, PostgreSQL17.9, Playwright1.57.0; executable/package hashes and runtime paths are in [runtime-environment.json](/workspace/nevora-evidence/independent-qa/runtime-environment.json). Environment was rebuilt from an allowlist, without ambient `DATABASE_URL` or delivery credentials. Owned apps disable push/delivery and use fictional fixtures; canonical worker tests use their mock sender. Rootless WebKit library setup and the host-cache-heuristic bypass are documented in the inherited runtime record; I personally observed successful browser execution, not a separate LD/CDLL setup rehearsal. No source-policy or activation bypass, real notification, paid service, hosted database or production operation was used by this review.

## RISK — remaining limits and next gate

This is local Cloud evidence only. Physical devices, screen readers/assistive technology, actual phone keyboards/pickers, OS/safe-area/background behavior, abrupt forced reload, hosted environment/CI, migration/rollback rehearsal, development source assembly and production remain separate unverified gates. Phase3 has not begun. No material policy exception, production authorization or risk acceptance is inferred.

All owned runtimes and commands were released after the final gates and custody audit, before root may edit the next candidate. Implementation owner: active communications root agent. Next gate: retain this RED baseline, correct the material findings and harness/lint defects, add meaningful regression evidence, freeze the new candidate, rerun affected three-engine and required broad gates, and return the actual artifacts for independent author-owned closure. A new candidate cannot inherit this candidate's green checks as if they had run on its changed source.
