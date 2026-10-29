# Reproduce Employee mobile closure evidence

Use an isolated detached review checkout with physical local dependencies, the approved local PostgreSQL runtime and the existing Playwright runtime. Never supply production credentials or a pre-existing DATABASE_URL. All application/SQL checks use invocation-owned fictional loopback databases; provider delivery is off. Read package scripts/AGENTS before running anything. No package install, paid service, real message, push or deployment is needed.

The exact tested commands and source revisions are in VERIFICATION.json and copied run summaries. Runtime application source is `e92b8bda`; final verification source is `20c5abed`. Documentation may be a later local commit. To replay the exact engineering source, create another detached checkout at that SHA rather than resetting this review checkout.

Default/static commands:

```sh
node node_modules/vitest/vitest.mjs run --maxWorkers=1
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js .
node --test scripts/phase-e-owned-startup.check.mjs
node scripts/release-build.mjs
node --import tsx scripts/employee-mobile-configuration-coverage.mjs
```

The source-bound build requires a committed clean checkout; the exact receipt/log records its SHA. Native startup requires the approved local `NEVORA_TEST_PG_BIN`; set existing paths rather than downloading or installing a different runtime. Browser verification also requires `NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE`, pointing to the installed browser runtime's package.json. Unset DATABASE_URL before running owned fixtures.

For the four original full configurations covering all36 effective contracts, prepare **every** directory returned by `employeeMobileEvidence(externalRoot,suite)` from `scripts/employee-mobile-evidence.mjs`, pass those variables to the owned runner, and keep each complete original configuration:

```js
import {mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {employeeMobileEvidence} from './scripts/employee-mobile-evidence.mjs';
// Run from the source root with existing approved runtimes selected.
const externalRoot='/absolute/new/external/evidence';
if(process.env.DATABASE_URL)throw Error('Unset DATABASE_URL');
for(const suite of ['device-alerts','phase1','deletion','pay']){
 const evidence=employeeMobileEvidence(externalRoot,suite);
 for(const directory of Object.values(evidence))mkdirSync(directory,{recursive:true});
 const result=spawnSync(process.execPath,['scripts/payroll-postgres.mjs',`vitest.employee-mobile-${suite}.config.mts`],{env:{...process.env,...evidence},stdio:'inherit'});
 if(result.status!==0)throw Error(suite+' failed');
}
```

This is the inspected complete-contract union, not selected browser-only tests. The committed `employee-mobile-closure-verification.mjs` also accepts an explicit external path and runs all13 specifications serially, if a reviewer chooses the longer duplicated replay. Keep failures and exit status; do not claim execution of omitted repetitions.

The extended real Employee26-task/936-case matrix uses `vitest.employee-mobile-closure.config.mts` with `NEVORA_EMPLOYEE_CLOSURE_EVIDENCE` pointing outside the checkout. The final affected Creation replay uses the original Creation configuration plus `src/test/integration/employee-mobile-creation.integration.ts`; it does not replace the original372 unaffected Device-alerts contract cases. All pageerrors and unexpected console errors remain failing.

Do not equate local WebKit with an actual iPhone/Safari or installed app. Actual providers, AT, OS scaling, keyboards, native passkeys/push, PDF destinations and representative performance remain in POLICY-AND-DEVICE-GATES.md. Do not deliver real notifications without Jose's authorized test scope.
