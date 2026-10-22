# Task 4 implementation handoff

Owner: task-4 executor. Scope: owned Next launch seam, native Node fetch preload, persistent pilot reservation guard, local tests. No application/backend/UI/schema edits, paid calls, credentials, deployment or production changes. Root owns live proof and connection.

## Exact launch API

From `src/test/integration/owner-advisor-pilot.mts`, import `initializePilot` and optionally `PILOT`. Use Node 24 (verified v24.19.0). The runner imports `createOwnedNextApp` through its existing tsx context.

```ts
const ownerAdvisorPilot = {
  pilotId: 'owner-advisor-20261022',
  baseUrl: 'https://br-blue-firefly-b759kjzm-api.ai.c-13.us-east-1.aws.neon.tech',
  model: 'gpt-6-1-sol',
  credential, // explicitly supplied by root from approved private store
  ledgerPath: '/absolute/canonical/private/pilot-directory/ledger.json',
};
// ONCE, before first launch. Parent directory must already exist.
// pilot-directory MUST NOT exist; this creates it exclusively with mode 0700.
initializePilot(ownerAdvisorPilot);
const app = await createOwnedNextApp(externalEvidenceDirectory, {
  ownerAdvisorEnabled: true,
  ownerAdvisorPilot,
  // existing fictional initializer and ownership lifecycle options
});
// Always await app.close(), preserving the original source/mirror custody checks.
```

Never call initializePilot on restart; retain exactly the same canonical ledgerPath for this entire authorized pilot. Launch requires an existing ledger and refuses missing, malformed, symlinked or expired state. macOS `/tmp` and `/var` aliases must be resolved to their `/private/...` canonical paths. Ledger basename is fixed `ledger.json`. No directory deletion, lock clearing, ledger rollback or new pilot path is an authorized budget reset. State owned by the same OS account is not a security boundary against a malicious operator who rewrites all files or provisions another directory; root must retain this one approved path.

The child gets only explicit provider values and finite daily request cap 20. Ordinary runtimes still have no provider or model settings. Known preload is installed with Node `--import` before Next; Next child forks inherit exec arguments. Runtime ownership metadata records endpoint, model, pilot identity, ledger path, limits, guard/preload hashes, with no credential. Both files live under tracked `src/` and are included in existing source/mirror hashes and close verification.

## Guard and budget semantics

Only exact approved responses POST and authenticated free `/v1/models` GET are permitted remotely, with redirect mode `error`; local HTTP loopback remains available to Next. No retries, no provider response substitutions. Requests must use JSON UTF-8 <=65536 bytes, store:false, no streaming, output tokens 1..4096, approved model/credential, text/function/encrypted-reasoning shapes and function tools. Unsupported route, remote provider, reference/image/audio/builtin tool or unknown top-level settings fail closed.

Exclusive reservation lock, private files, fsync, immutable initialization identity and per-attempt receipts protect persistence. A durable reservation occurs before transport; failed/uncertain calls remain spent. Ledger `attempts * 250000` gives reserved microdollars; individual receipts also record cumulative reservedMicrodollars. Cap is 20 lifetime attempts / 5,000,000 microdollars. Lock contention rejects immediately. Crash residue and uncertain writes require stopping; no automatic recovery/refund. Lifetime is 24 hours from initialization.

This is a bounded manual pilot using the rates root verified today ($2/M input, $10/M output), not general production metering. Even budgeting 65536 input tokens plus 8192 protocol tokens and 4096 output tokens gives $0.188416, below the $0.25 reservation. Root must verify actual balance/usage; reservations are not billed spend.

## Direct evidence and binary observables

Evidence root: `.omo/evidence/owner-advisor-task-4/`. No active ULW attempt was present (`ULW_LOOP_PLAN_MISSING`). All transports in guard tests are fake except the preload test, whose forbidden remote request is rejected before transport. No real inference was performed.

| Criteria/scenario | Exact invocation | Binary observable | Captured artifact |
| --- | --- | --- | --- |
| Valid Request, free catalog, function/message/reasoning rounds; wrong endpoint/model/credential/body/output/redirect; oversized/invalid UTF-8; failure reservation; restart/exhaustion; malformed/symlink/missing/lock/pending/tampered state; permissions; six-process concurrency; 24h expiry; native preload before app | `node --test src/test/integration/owner-advisor-pilot.check.mts` | 17 tests pass, 0 fail, exit=0; asserts exact attempt counts and zero fake transport invocations for invalid requests | `.omo/evidence/owner-advisor-task-4/guard-green.log` |
| Meaningful RED for output cap | Same invocation with temporary mutation of output cap from 4096 to 99999, then restored | Required rejection fails; 15 pass, 1 fail, exit=1 | `.omo/evidence/owner-advisor-task-4/guard-red-output-cap.log` |
| Ambient credential isolation, explicit activation, fixed config; affected initializer/path/payroll/mail contracts | `npx vitest run src/test/integration/owned-next-advisor.test.ts src/test/integration/owned-next-payroll.test.ts src/test/integration/owned-next-invitation.test.ts src/test/integration/owned-next-initializer.test.ts src/test/integration/owned-next-path.test.ts` | 5 files / 36 tests pass, exit=0 | `.omo/evidence/owner-advisor-task-4/owned-runtime.log` |
| Type validity | `npx tsc --noEmit` | exit=0 | `.omo/evidence/owner-advisor-task-4/typecheck.log` |
| Owned-file lint | `npx eslint src/test/integration/owned-next-app.ts src/test/integration/owned-next-advisor.test.ts src/test/integration/owner-advisor-pilot.mts src/test/integration/owner-advisor-pilot-preload.mts src/test/integration/owner-advisor-pilot.check.mts` | exit=0 | `.omo/evidence/owner-advisor-task-4/lint.log` |
| Root runner import compatibility | `node --import tsx --input-type=module -e "import {ownedAdvisorEnvironment} from './src/test/integration/owned-next-app.ts'; console.log(JSON.stringify(ownedAdvisorEnvironment()));"` | Prints only disabled feature flag | `.omo/evidence/owner-advisor-task-4/tsx-import.log` |

Initial fixture run rejected macOS symlinked tmp paths; fixed test fixture to use realpath while retaining strict guard. Its historical log is retained as `guard-first.log`, not used as success evidence.

## Positions and next gate

Engineering: bounded test-runtime seam; no new dependency. Security: explicit credential injection, restrictive egress/request schema, persistent failure-closed allowance. Governance: GO WITH CONDITIONS for root's bounded fictional local pilot only; no policy exception or production authorization requested. Release impact: CONDITION, root must validate actual Next wrapper/child preload and source/mirror teardown in its real local runtime before live connection. The executor's native preload, Request-shaped transport and unit contract evidence do not claim a completed Next/browser/live-provider scenario. Independent audit closure is not claimed. Root owns live proof, review, fixed ledger-path custody, credential lifecycle and actual credit reporting.
