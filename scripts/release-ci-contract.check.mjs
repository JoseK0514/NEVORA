import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {verifyRequiredJobs, ownedExecutionTimeout} from './phase-e-owned.mjs';
const require=createRequire(import.meta.url);
const workflow=require('js-yaml').load(readFileSync('.github/workflows/ci.yml','utf8'));
const mandatory=['validate','clocker-postgres','release-postgres','phase-d-attendance-ui','phase-e-postgres','phase-e-ui'];
test('the clean Manager verification branch triggers the full CI workflow',()=>{
 assert(workflow.on.push.branches.includes('codex/verify-preview-33'));
});
test('all triggered candidate branches receive mandatory SQL and browser gates',()=>{
 for(const name of mandatory) {
  assert(workflow.jobs[name], 'Missing mandatory gate '+name);
  assert.equal(workflow.jobs[name].if,undefined,'Branch-dependent skipping is forbidden for '+name);
 }
 assert.deepEqual([...workflow.jobs['phase-e-evidence'].needs].sort(),[...mandatory].sort());
 assert.match(workflow.jobs['phase-e-evidence'].if,/^\$\{\{\s*always\(\)\s*\}\}$/);
});
test('existing aggregate rejects failed, cancelled, skipped, neutral and missing jobs',()=>{
 const pass=Object.fromEntries(mandatory.map(name=>[name,{result:'success'}]));
 assert.doesNotThrow(()=>verifyRequiredJobs(pass));
 for(const name of mandatory)for(const state of ['failure','cancelled','skipped','neutral',undefined]){
  const candidate={...pass,[name]:state===undefined?undefined:{result:state}};
  assert.throws(()=>verifyRequiredJobs(candidate), name+' '+state+' must reject');
 }
});
test('owner release hold disables Vercel Git deployments for every branch',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 // Branch maps leave unspecified integration branches enabled by default.
 assert.equal(config.git?.deploymentEnabled,false,
  'The release hold requires global false; branch exclusions do not cover eventual integration');
});

test('all-browser budget fits the existing job while single-suite and SQL budgets stay bounded',()=>{
 assert.equal(ownedExecutionTimeout('browser','all'),45*60_000);
 assert.equal(ownedExecutionTimeout('browser','home'),30*60_000);
 assert.equal(ownedExecutionTimeout('sql','all'),8*60_000);
 assert.equal(workflow.jobs['phase-e-ui']['timeout-minutes'],50);
 assert.throws(()=>ownedExecutionTimeout('unknown','all'));
});
