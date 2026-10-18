import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {verifyRequiredJobs} from './phase-e-owned.mjs';
const require=createRequire(import.meta.url);
const workflow=require('js-yaml').load(readFileSync('.github/workflows/ci.yml','utf8'));
const mandatory=['validate','clocker-postgres','release-postgres','phase-d-attendance-ui','phase-e-postgres','phase-e-ui'];
test('approved mobile integration branch runs CI on push without a shared-branch PR',()=>{
 assert(workflow.on.push.branches.includes('codex/nevora-mobile-launch'),
  'The isolated mobile candidate must trigger CI before any development or main merge');
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
