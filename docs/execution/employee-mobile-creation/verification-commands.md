# Creation/report verification invocations

Run from the accepted worktree, after inspecting package scripts. Use fictional isolated data only. Owned Next reads require committed clean application inputs and a source freeze through verified runtime closure. Use fresh external evidence destinations; never overwrite accepted or failed runs.

Final full config:

```sh
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" \
 NEVORA_TEST_PG_BIN=/Users/josek0514/.codex/visualizations/2026/10/02/01a0f8c7-f196-7d22-8896-8d3c96547bd9/fuel-phase-3-pwa-notifications/local-postgres-runtime/package/native/bin \
 NEVORA_EMPLOYEE_CREATION_EVIDENCE=<fresh-external-dir>/creation \
 NEVORA_EMPLOYEE_RESPONSES_EVIDENCE=<fresh-external-dir>/responses \
 NEVORA_EMPLOYEE_MOBILE_EVIDENCE=<fresh-external-dir>/pickup \
 NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/Users/josek0514/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json \
 node scripts/payroll-postgres.mjs vitest.employee-mobile-creation.config.mts
```

The three evidence paths must differ. The config runs45actual SQL tests and three orchestrated browser tests:48top-level tests. Named journey checkpoints, screenshots and contrast samples are not additional tests. To replay only the affected browser, append `src/test/integration/employee-mobile-creation.integration.ts`.

Current unit invocation/file scope is retained in `.omo/evidence/employee-mobile-creation/unit-command.txt`. Final independent invocation adds `--no-file-parallelism` to avoid concurrent startup contention, retaining the same default timeout/assertions. TypeScript: `./node_modules/.bin/tsc --noEmit`; targeted ESLint on new/changed source and test files. No build/start or migration script was used for this batch.

Independent execution invocations, custody and raw diagnostics are under `outputs/employee-mobile-creation/independent-qa`. Root RED→GREEN unit and browser logs are retained in `.omo/evidence/employee-mobile-creation`; independent authors own their review closures. The final application/test candidate and deliberate test-only lineage are recorded in `candidate-verification.json`.
