# Response/detail verification invocations

Run from `work/employee-app-phase1` in the Nevora design task. Inspect scripts first; use fictional isolated data only. The committed owned helper requires clean committed application inputs and verifies them again at closure. Do not edit application inputs while running.

Root final invocation (candidate333c4762):

```sh
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" \
 NEVORA_TEST_PG_BIN=/Users/josek0514/.codex/visualizations/2026/10/02/01a0f8c7-f196-7d22-8896-8d3c96547bd9/fuel-phase-3-pwa-notifications/local-postgres-runtime/package/native/bin \
 NEVORA_EMPLOYEE_RESPONSES_EVIDENCE=/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-responses/accepted/details \
 NEVORA_EMPLOYEE_MOBILE_EVIDENCE=/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-responses/accepted/pickup-regression \
 NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE=/Users/josek0514/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json \
 node scripts/payroll-postgres.mjs vitest.employee-mobile-responses.config.mts
```

Choose fresh evidence paths for another run; do not overwrite accepted or failed records. The two evidence environment variables are deliberately distinct. The config runs42 actual SQL tests and two orchestrated browser tests. Passing named checkpoints and contrast samples are not additional top-level test counts.

Focused RED→GREEN: component withdrawal copy and four real SQL privacy regressions. Root current broader unit invocation is retained exactly in `.omo/evidence/employee-mobile-responses/unit-fixed-command.txt` (20files166pass0skip). Type/lint invocations: `./node_modules/.bin/tsc --noEmit` and ESLint on the affected exchange projection/server/client/operation/test files. Logs reside in `.omo/evidence/employee-mobile-responses`.

Independent full replay uses the same config with separate external paths under `outputs/employee-mobile-responses/independent-qa/replay`. Its exact sanitized invocation and source-custody script are retained in that directory. Independent reviewers own their acceptance reports and closure.

Supporting primary documentation for invocation-local test behavior: [Apple Safari keyboard navigation](https://support.apple.com/en-gb/guide/safari/cpsh003/mac) and [Playwright screenshot caret option](https://playwright.dev/docs/api/class-page#page-screenshot-option-caret). WebKit uses actual Option-Tab. `caret:initial` avoids capture tooling changing input styles during streamed hydration. These choices do not alter user OS settings or weaken diagnostic assertions.
