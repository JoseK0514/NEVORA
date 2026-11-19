import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

test('an outer JSON reporter cannot change or break effective Employee execution coverage',()=>{
 const run=report=>{const env={...process.env};delete env.NEVORA_RSTEST_REPORT_FILE;if(report)env.NEVORA_RSTEST_REPORT_FILE='/fictional/external/outer-run.json';return JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/employee-mobile-configuration-coverage.mjs'],{env,encoding:'utf8',maxBuffer:16*1024*1024}));};
 const baseline=run(false),reported=run(true);assert.equal(reported.configurations.length,13);assert.deepEqual(reported.selected,['device-alerts','phase1','deletion','pay']);assert.deepEqual(reported.missing,[]);assert.ok(reported.distinctFiles>=36);assert.deepEqual(reported.contracts,baseline.contracts);
});
