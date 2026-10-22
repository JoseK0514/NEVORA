import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {verifyRequiredJobs, ownedExecutionTimeout} from './phase-e-owned.mjs';
const require=createRequire(import.meta.url);
const workflow=require('js-yaml').load(readFileSync('.github/workflows/ci.yml','utf8'));
const mandatory=['validate','clocker-postgres','release-postgres','phase-d-attendance-ui','phase-e-postgres','phase-e-ui'];
test('runtime installers prefer the existing official mirror before every apt dependency step',()=>{
 for(const name of ['clocker-postgres','release-postgres','phase-e-postgres','phase-d-attendance-ui','phase-e-ui-suite']){
  const steps=workflow.jobs[name].steps,preference=steps.findIndex(step=>step.name==='Prefer official Ubuntu archive');
  assert(preference>=0,name+' archive preference missing');
  assert.equal(steps[preference].if,undefined);
  assert.match(steps[preference].run,/sudo --preserve-env=GITHUB_ACTIONS,RUNNER_OS .*scripts\/ci-ubuntu-mirrors\.mjs/);
  const installers=steps.filter(step=>/apt-get|install --with-deps/.test(step.run??''));
  assert(installers.length>0,name+' dependency installer missing');
  for(const step of installers)assert(steps.indexOf(step)>preference,name+' must prefer the mirror before installation');
 }
});
test('feature candidates run through PRs without a duplicate branch-push execution',()=>{
 assert.deepEqual(workflow.on.push.branches,['development','main']);
 for(const target of ['development','main','codex/verify-preview-33'])assert(workflow.on.pull_request.branches.includes(target));
 assert.equal(workflow.concurrency['cancel-in-progress'],"${{ github.event_name == 'pull_request' }}");
});
test('all triggered candidate branches receive mandatory SQL and browser gates',()=>{
 for(const name of mandatory) {
  assert(workflow.jobs[name], 'Missing mandatory gate '+name);
  assert.equal(workflow.jobs[name].if,name === 'phase-e-ui' ? '${{ always() }}' : undefined,'Branch-dependent skipping is forbidden for '+name);
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
 assert.equal(workflow.jobs['phase-e-ui-suite']['timeout-minutes'],50);
 assert.throws(()=>ownedExecutionTimeout('unknown','all'));
});

test('five bounded leaves retain strict current-source aggregation and unique raw artifacts',()=>{
 const leaf=workflow.jobs['phase-e-ui-suite'], aggregate=workflow.jobs['phase-e-ui'];
 assert.equal(leaf.if,undefined);
 assert.deepEqual(leaf.strategy,{ 'fail-fast':false, 'max-parallel':2, matrix:{suite:['home','communications','calendar','navigation','attention']} });
 assert.equal(leaf.env.PHASE_E_EXPECTED_SHA,'${{ github.sha }}');
 assert.equal(leaf.env.PHASE_E_BROWSER_SUITE,'${{ matrix.suite }}');
 assert.deepEqual(aggregate.needs,['phase-e-ui-suite']);
 assert.equal(aggregate.if,'${{ always() }}');
 for(const job of [leaf,aggregate]) {
  assert.equal(job['continue-on-error'],undefined);
  assert.equal(job.permissions,undefined);
  for(const step of job.steps) assert.equal(step['continue-on-error'],undefined);
 }
 const execute=leaf.steps.find(step=>step.run==='node scripts/phase-e-owned.mjs browser --suite "$PHASE_E_BROWSER_SUITE"');
 const verify=leaf.steps.find(step=>step.run==='node scripts/phase-e-browser-evidence.mjs leaf --suite "$PHASE_E_BROWSER_SUITE"');
 assert(execute && verify);
 assert.equal(execute.if,undefined);assert.equal(verify.if,undefined);
 assert(leaf.steps.indexOf(execute)<leaf.steps.indexOf(verify));
 const home=leaf.steps.filter(step=>step.run==='node --import ./scripts/qa-server-context.mjs --import tsx scripts/phase-e-home-held-response.check.mjs');
 assert.equal(home.length,1);assert.equal(home[0].if,"${{ matrix.suite == 'home' }}");
 const upload=leaf.steps.find(step=>step.uses?.startsWith('actions/upload-artifact@'));
 assert.equal(upload.if,'always()');
 assert.equal(upload.with.name,'phase-e-browser-${{ github.sha }}-${{ matrix.suite }}');
 assert.equal(upload.with['if-no-files-found'],'error');assert.equal(upload.with['retention-days'],14);
 for(const path of ['/*-report.json','/source-manifest.json','/owned-postgres-*/ownership.json','/owned-next-*/ownership.json','/owned-next-*/source-manifest.json']) assert(upload.with.path.includes('nevora-phase-e-browser-evidence'+path));
 assert(upload.with.path.includes('nevora-phase-e-home-readiness-evidence/*.json'));
 const download=aggregate.steps.filter(step=>step.uses?.startsWith('actions/download-artifact@'));
 assert.equal(download.length,1);
 assert.equal(download[0].uses,'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093');
 assert.deepEqual(download[0].with,{pattern:'phase-e-browser-*',path:'${{ runner.temp }}/nevora-phase-e-suite-artifacts','merge-multiple':false});
 const gate=aggregate.steps.find(step=>step.run==='node scripts/phase-e-browser-evidence.mjs aggregate');
 assert(gate);assert.equal(gate.if,undefined);
 assert.deepEqual(gate.env,{
  PHASE_E_EXPECTED_SHA:'${{ github.sha }}',
  PHASE_E_EVIDENCE_DIR:'${{ runner.temp }}/nevora-phase-e-browser-aggregate',
  PHASE_E_ARTIFACTS_DIR:'${{ runner.temp }}/nevora-phase-e-suite-artifacts',
  PHASE_E_CI_NEEDS_JSON:'${{ toJSON(needs) }}',
 });
 assert(aggregate.steps.indexOf(download[0])<aggregate.steps.indexOf(gate));
});
