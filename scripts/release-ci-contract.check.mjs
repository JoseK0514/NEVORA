import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {clockerSourceHash,expectedClockerFiles,parseClockerArguments,validateClockerReport,verifyClockerAllocation,verifyClockerNeeds,verifyClockerShardSet} from './clocker-sql-shards.mjs';
import {verifyRequiredJobs, ownedExecutionTimeout} from './phase-e-owned.mjs';
const require=createRequire(import.meta.url);
const workflow=require('js-yaml').load(readFileSync('.github/workflows/ci.yml','utf8'));
const mandatory=['validate','clocker-postgres','release-postgres','phase-d-attendance-ui','management-review-ui','phase-e-postgres','phase-e-ui'];

test('mandatory backend gate executes durable commerce SQL and SDK cases and retains their report',()=>{
 const job=workflow.jobs['onboarding-backend'];
 const gate=job.steps.find(step=>step.name==='Durable commerce PostgreSQL and SDK gate');
 assert(gate,'Durable commerce SQL/SDK gate is absent');assert.equal(gate.if,undefined);assert.equal(gate['continue-on-error'],undefined);
 assert.equal(gate.run,'mkdir -p "$RUNNER_TEMP/nevora-onboarding-backend"\nnode scripts/commerce-postgres.mjs --reporter=default --reporter=json --outputFile="$RUNNER_TEMP/nevora-onboarding-backend/commerce-sql-sdk.json"\n');
 const upload=job.steps.find(step=>step.name==='Upload backend evidence, separate from UI and hosted approval');assert.equal(upload.with.path,'${{ runner.temp }}/nevora-onboarding-backend/**');assert.equal(upload.if,'always()');assert.equal(upload.with['if-no-files-found'],'error');
});

test('Owner advisor uploads nested reports, captures and traces with their source custody',()=>{
 const gate=workflow.jobs['phase-d-attendance-ui'].steps.find(step=>step.name==='Owner advisor PostgreSQL and browser gate');
 assert.equal(gate.if,undefined);
 const steps=workflow.jobs['phase-d-attendance-ui'].steps;
 assert(steps.findIndex(step=>step.name==='Combined company lifecycle and recovery gate')>steps.findIndex(step=>step.name==='Upload Owner advisor browser evidence'),'Original Owner advisor evidence must precede the combined journey');
 const upload=workflow.jobs['phase-d-attendance-ui'].steps.find(step=>step.name==='Upload Owner advisor browser evidence');
 assert.equal(upload.if,'always()');assert.equal(upload.with['if-no-files-found'],'error');
 const root='${{ runner.temp }}/nevora-owner-advisor-browser-evidence';
 for(const suffix of ['/**/*.json','/**/*.png','/**/*-trace.zip'])assert(upload.with.path.split('\n').includes(root+suffix),'Nested Owner advisor evidence missing: '+suffix);
 assert.equal(upload['continue-on-error'],undefined);
});

test('Clocker SQL sharding preserves original selectors and rejects partial/custom shard configurations',()=>{
 assert.deepEqual(parseClockerArguments([]),{selection:undefined,shard:undefined});
 for(const selection of ['--punch-ui','--pins-ui','--company-setup','vitest.clocker-integration.config.mts'])assert.deepEqual(parseClockerArguments([selection]),{selection,shard:undefined});
 for(const shard of ['1/4','2/4','3/4','4/4'])assert.deepEqual(parseClockerArguments(['--shard='+shard]),{selection:undefined,shard});
 for(const args of [['--shard=0/4'],['--shard=5/4'],['--shard=1/3'],['--shard','1/4'],['--shard=1/4','--shard=2/4'],['--punch-ui','--shard=1/4'],['other.config.mts','--shard=1/4']])assert.throws(()=>parseClockerArguments(args));
});
const fixtureSource='/fictional-owned-source';
const fixtureFiles=['src/test/integration/clocker-a.integration.ts','src/test/integration/clocker-b.integration.ts','src/test/integration/clocker-c.integration.ts','src/test/integration/clocker-d.integration.ts','src/test/integration/phase-c-release-migrations.integration.ts'];
const fixtureCustody={checkpoint:'a'.repeat(40),tree:'b'.repeat(40),hashes:{'source.ts':'c'.repeat(64)}};
function shardLeaf(shard,files){
 const report={success:true,numTotalTests:files.length,numPassedTests:files.length,numFailedTests:0,numPendingTests:0,numTodoTests:0,testResults:files.map(file=>({name:fixtureSource+'/'+file,status:'passed',assertionResults:[{status:'passed',fullName:'executed '+file}]}))};
 const receipt={schema:1,shard,checkpoint:fixtureCustody.checkpoint,tree:fixtureCustody.tree,sourceHash:clockerSourceHash(fixtureCustody),sourceClean:true,ownedClusterClosed:true,exitCode:0,status:'passed',files:[...files].sort(),tests:files.length,reportHash:createHash('sha256').update(JSON.stringify(report)).digest('hex')};
 return {receipt,report,manifest:{sourceClean:true,...JSON.parse(JSON.stringify(fixtureCustody))}};
}
const fixtureAllocation={schema:1,shards:{'1/4':[fixtureFiles[0],fixtureFiles[4]],'2/4':[fixtureFiles[1]],'3/4':[fixtureFiles[2]],'4/4':[fixtureFiles[3]]}};
const shardOptions=()=>({source:fixtureSource,custody:fixtureCustody,expectedFiles:fixtureFiles,allocation:fixtureAllocation,needs:{'clocker-postgres-suite':{result:'success'}}});
const shardLeaves=()=>Object.entries(fixtureAllocation.shards).map(([shard,files])=>shardLeaf(shard,files));
test('balanced allocation rejects missing, duplicate, foreign and empty source groups',()=>{
 for(const mutate of [
  value=>delete value.shards['4/4'],value=>value.shards['5/4']=[],
  value=>value.shards['1/4']=[],value=>value.shards['1/4'].pop(),
  value=>value.shards['2/4'].push(fixtureFiles[0]),value=>value.shards['2/4'].push('src/test/integration/foreign.integration.ts'),
 ]){
  const value=JSON.parse(JSON.stringify(fixtureAllocation));mutate(value);
  assert.throws(()=>verifyClockerAllocation(value,fixtureFiles));
 }
 const swapped=shardLeaves();
 [swapped[1].receipt.shard,swapped[2].receipt.shard]=[swapped[2].receipt.shard,swapped[1].receipt.shard];
 assert.throws(()=>verifyClockerShardSet(swapped,shardOptions()));
});
test('all Clocker SQL groups must cover every original source file exactly once',()=>{
 assert.deepEqual(verifyClockerShardSet(shardLeaves(),shardOptions()),{files:[...fixtureFiles].sort(),tests:5});
 for(const leaves of [shardLeaves().slice(0,1),[shardLeaf('1/4',[fixtureFiles[0]]),shardLeaf('2/4',[fixtureFiles[1]])],[shardLeaf('1/4',fixtureFiles),shardLeaf('2/4',[fixtureFiles[1]])],[shardLeaves()[0],shardLeaves()[0]]])assert.throws(()=>verifyClockerShardSet(leaves,shardOptions()));
});
test('Clocker aggregate rejects incomplete, stale, tampered or unclosed shard evidence',()=>{
 for(const mutate of [
  leaf=>leaf.receipt.status='failed',leaf=>leaf.receipt.exitCode=1,leaf=>leaf.receipt.sourceClean=false,leaf=>leaf.receipt.ownedClusterClosed=false,
  leaf=>leaf.receipt.checkpoint='d'.repeat(40),leaf=>leaf.receipt.tree='d'.repeat(40),leaf=>leaf.receipt.sourceHash='d'.repeat(64),
  leaf=>leaf.receipt.tests++,leaf=>leaf.receipt.files=[],leaf=>leaf.report.testResults[0].assertionResults[0].status='pending',
  leaf=>leaf.manifest.sourceClean=false,leaf=>leaf.manifest.hashes['source.ts']='d'.repeat(64),leaf=>delete leaf.manifest,
 ]){
  const leaves=shardLeaves();mutate(leaves[0]);assert.throws(()=>verifyClockerShardSet(leaves,shardOptions()));
 }
 for(const result of ['failure','cancelled','skipped','neutral',undefined]){
  assert.throws(()=>verifyClockerNeeds(result===undefined?{}:{'clocker-postgres-suite':{result}}));
 }
 assert.throws(()=>verifyClockerNeeds({'clocker-postgres-suite':{result:'success'},extra:{result:'success'}}));
});
test('Clocker reports cannot treat empty, skipped, unknown or duplicate files as passing execution',()=>{
 for(const mutate of [
  report=>report.numTotalTests=0,report=>report.numPendingTests=1,report=>report.numTodoTests=1,report=>report.success=false,
  report=>report.testResults[0].name='/foreign/source.ts',report=>report.testResults.push(report.testResults[0]),
  report=>report.testResults[0].assertionResults=[],report=>report.testResults[0].assertionResults[0].status='failed',
 ]){
  const {report}=shardLeaves()[0];mutate(report);assert.throws(()=>validateClockerReport(report,fixtureSource,fixtureFiles));
 }
});
test('Clocker SQL retains the full original file selectors and bounded four-group release gate',()=>{
 const expr=value=>'$'+'{{ '+value+' }}';
 const leaf=workflow.jobs['clocker-postgres-suite'],gate=workflow.jobs['clocker-postgres'];
 assert(leaf,'Clocker SQL shard leaves missing');
 assert.equal(leaf['timeout-minutes'],30);assert.equal(leaf.if,undefined);
 assert.deepEqual(leaf.strategy,{'fail-fast':false,'max-parallel':2,matrix:{shard:[1,2,3,4]}});
 assert.deepEqual(leaf.env,{CLOCKER_SQL_EXPECTED_SHA:expr('github.event.pull_request.head.sha || github.sha')});
 const execute=leaf.steps.find(step=>step.run==='npm run test:clocker:owned -- --shard='+expr('matrix.shard')+'/4');
 assert(execute);assert.equal(execute.if,undefined);
 assert.deepEqual(execute.env,{CLOCKER_SQL_EVIDENCE_DIR:expr('runner.temp')+'/clocker-sql-evidence'});
 const upload=leaf.steps.find(step=>step.uses?.startsWith('actions/upload-artifact@'));
 assert.equal(upload.if,'always()');assert.equal(upload.with.name,'clocker-sql-'+expr('github.event.pull_request.head.sha || github.sha')+'-'+expr('matrix.shard')+'-of-4');
 assert.equal(upload.with['if-no-files-found'],'error');assert.equal(upload.with['retention-days'],14);
 assert.deepEqual(gate.needs,['clocker-postgres-suite']);assert.equal(gate.if,expr('always()'));
 const download=gate.steps.find(step=>step.uses?.startsWith('actions/download-artifact@'));
 assert.deepEqual(download.with,{pattern:'clocker-sql-*',path:expr('runner.temp')+'/clocker-sql-artifacts','merge-multiple':false});
 const verify=gate.steps.find(step=>step.run==='node scripts/clocker-sql-shards.mjs aggregate');assert(verify);assert.equal(verify.if,undefined);
 assert.deepEqual(verify.env,{CLOCKER_SQL_EXPECTED_SHA:expr('github.event.pull_request.head.sha || github.sha'),CLOCKER_SQL_EVIDENCE_DIR:expr('runner.temp')+'/clocker-sql-aggregate',CLOCKER_SQL_ARTIFACTS_DIR:expr('runner.temp')+'/clocker-sql-artifacts',CLOCKER_SQL_CI_NEEDS_JSON:expr('toJSON(needs)')});
 for(const job of [leaf,gate]){assert.equal(job['continue-on-error'],undefined);for(const step of job.steps)assert.equal(step['continue-on-error'],undefined);}
 const config=readFileSync('vitest.clocker-integration.config.mts','utf8');
 assert(config.includes("include: ['src/test/integration/clocker-*.integration.ts', 'src/test/integration/phase-c-release-migrations.integration.ts']"));
 const expected=expectedClockerFiles(process.cwd());assert(expected.length>=35);
 assert.doesNotThrow(()=>verifyClockerAllocation(JSON.parse(readFileSync('scripts/clocker-sql-shards.json','utf8')),expected));
});
test('mandatory release SQL job always runs the isolated Owner advisor integration suite',()=>{
 const step=workflow.jobs['release-postgres'].steps.find(s=>s.run==='node scripts/payroll-postgres.mjs vitest.owner-advisor-integration.config.mts');
 assert(step,'Owner advisor PostgreSQL checks missing');
 assert.equal(step.if,undefined);
 assert.equal(step['continue-on-error'],undefined);
});
test('mandatory release SQL executes staff task cases unconditionally and retains their report',()=>{
 const config=readFileSync('vitest.staff-tasks-integration.config.mts','utf8');
 const scripts=JSON.parse(readFileSync('package.json','utf8')).scripts;
 assert.equal(scripts['test:staff-tasks:owned'],'node scripts/payroll-postgres.mjs vitest.staff-tasks-integration.config.mts');
 assert(config.includes("include:['src/test/integration/staff-tasks.integration.ts']"));
 const verify=job=>{
  assert.equal(job.if,undefined);assert.equal(job['continue-on-error'],undefined);
  const step=job.steps.find(s=>s.run==='npm run test:staff-tasks:owned -- --reporter=json --outputFile="$RUNNER_TEMP/staff-tasks.json"');
  assert(step,'Staff tasks SQL execution/report missing');
  assert.equal(step.if,undefined);assert.equal(step['continue-on-error'],undefined);
  const upload=job.steps.find(s=>s.name==='Upload dedicated payroll SQL evidence');
  assert(upload);assert.equal(upload.if,'always()');assert.equal(upload.with['if-no-files-found'],'error');
  assert(upload.with.path.includes('${{ runner.temp }}/staff-tasks.json'));
 };
 const job=workflow.jobs['release-postgres'];verify(job);
 for(const mutation of ['remove','condition','allow-failure','job-condition','job-allow-failure','ignore-exit','drop-artifact']){
  const broken=structuredClone(job),index=broken.steps.findIndex(s=>s.run?.includes('test:staff-tasks:owned'));
  if(mutation==='remove')broken.steps.splice(index,1);
  if(mutation==='condition')broken.steps[index].if='false';
  if(mutation==='allow-failure')broken.steps[index]['continue-on-error']=true;
  if(mutation==='job-condition')broken.if='false';
  if(mutation==='job-allow-failure')broken['continue-on-error']=true;
  if(mutation==='ignore-exit')broken.steps[index].run+=' || true';
  if(mutation==='drop-artifact')broken.steps.find(s=>s.name==='Upload dedicated payroll SQL evidence').with.path='${{ runner.temp }}/native-payroll.json';
  assert.throws(()=>verify(broken),undefined,mutation);
 }
});
test('mandatory release SQL runs both dedicated payroll suites and retains actual result files',()=>{
 const steps=workflow.jobs['release-postgres'].steps;
 for(const suite of ['native','configurable']){
  const config=suite==='native'?'vitest.native-payroll-integration.config.mts':'vitest.configurable-payroll-integration.config.mts';
  const step=steps.find(s=>s.run===`node scripts/payroll-postgres.mjs ${config} --reporter=json --outputFile="$RUNNER_TEMP/${suite}-payroll.json"`);
  assert(step,`${suite} payroll SQL gate missing`);
  assert.equal(step.if,undefined);
  assert.equal(step['continue-on-error'],undefined);
 }
 const upload=steps.find(s=>s.name==='Upload dedicated payroll SQL evidence');
 assert(upload,'Payroll SQL evidence upload missing');
 assert.equal(upload.if,'always()');
 assert.equal(upload.with['if-no-files-found'],'error');
 assert(upload.with.path.includes('${{ runner.temp }}/native-payroll.json'));
 assert(upload.with.path.includes('${{ runner.temp }}/configurable-payroll.json'));
});
test('mandatory release SQL selects the timestamp-fence regressions and retains their results',()=>{
 const config=readFileSync('vitest.timestamp-token-integration.config.mts','utf8');
 const verify=job=>{
  assert.equal(job.if,undefined);assert.equal(job['continue-on-error'],undefined);
  const step=job.steps.find(s=>s.run==='node scripts/payroll-postgres.mjs vitest.timestamp-token-integration.config.mts --reporter=json --outputFile="$RUNNER_TEMP/timestamp-token.json"');
  assert(step,'Timestamp-fence SQL gate missing');
  assert.equal(step.if,undefined);assert.equal(step['continue-on-error'],undefined);
  const upload=job.steps.find(s=>s.name==='Upload dedicated payroll SQL evidence');
  assert(upload);assert.equal(upload.if,'always()');assert.equal(upload.with['if-no-files-found'],'error');
  assert(upload.with.path.includes('${{ runner.temp }}/timestamp-token.json'));
 };
 assert.match(config,/include:\['src\/test\/integration\/employee-mobile-deletion-sql\.integration\.ts'\]/);
 const job=workflow.jobs['release-postgres'];verify(job);
 for(const mutation of ['remove','condition','allow-failure','drop-artifact']){
  const broken=structuredClone(job),index=broken.steps.findIndex(s=>s.run?.includes('vitest.timestamp-token-integration.config.mts'));
  if(mutation==='remove')broken.steps.splice(index,1);
  if(mutation==='condition')broken.steps[index].if='false';
  if(mutation==='allow-failure')broken.steps[index]['continue-on-error']=true;
  if(mutation==='drop-artifact')broken.steps.find(s=>s.name==='Upload dedicated payroll SQL evidence').with.path='${{ runner.temp }}/native-payroll.json';
  assert.throws(()=>verify(broken),undefined,mutation);
 }
});
test('mandatory browser job runs Owner advisor without a model connection and retains evidence',()=>{
 const steps=workflow.jobs['phase-d-attendance-ui'].steps;
 const step=steps.find(s=>s.name==='Owner advisor PostgreSQL and browser gate');
 assert(step,'Owner advisor browser checks missing');
 assert.deepEqual(step.run.trim().split('\n'),['node --import tsx --test scripts/owner-advisor-retirement.check.mts','node scripts/payroll-postgres.mjs vitest.owner-advisor-browser.config.mts']);
 assert.equal(step.if,undefined);
 assert.equal(step['continue-on-error'],undefined);
 assert.deepEqual(step.env,{NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE:'${{ runner.temp }}/nevora-owner-advisor-browser-evidence'});
 const upload=steps.find(s=>s.name==='Upload Owner advisor browser evidence');
 assert(upload);
 assert.equal(upload.if,'always()');
 assert.equal(upload.with['if-no-files-found'],'error');
 for(const item of ['/**/*.json','/**/*.png','/**/*-trace.zip'])assert(upload.with.path.includes('nevora-owner-advisor-browser-evidence'+item));
});
test('validation runs the spending guard suite without enabling live inference',()=>{
 const step=workflow.jobs.validate.steps.find(s=>s.run==='node --import tsx --test src/test/integration/owner-advisor-pilot.check.mts');
 assert(step,'Owner advisor pilot guard regressions missing');
 assert.equal(step.if,undefined);
 assert.equal(step.env,undefined);
});
test('independent Attendance stages retain fatal outcomes and run after earlier failure only with installed runtimes',()=>{
 const job=workflow.jobs['phase-d-attendance-ui'],steps=job.steps;
 const runtime=steps.filter(step=>step.id==='attendance_runtime');
 assert.equal(runtime.length,1);assert.equal(runtime[0].name,'Install PostgreSQL test runtime');assert.equal(runtime[0].if,undefined);
 assert(steps.findIndex(step=>step.name==='Install Chromium and WebKit')<steps.indexOf(runtime[0]));
 const names=['Exact-SHA D1.3 attendance browser gate','Verify SHA-bound report','Whole Phase D exact-candidate browser regression','Independent Phase D audit remediation regressions','Verify remediation SHA-bound evidence','Existing D2 correction browser regression','Existing Clocker lifecycle and recovery browser regression','Verify whole-phase SHA and mandatory UX evidence'];
 for(const name of names){
  const matching=steps.filter(step=>step.name===name);assert.equal(matching.length,1,name);
  assert.equal(matching[0].if,"${{ !cancelled() && steps.attendance_runtime.outcome == 'success' }}",name);
  assert(steps.indexOf(matching[0])>steps.indexOf(runtime[0]),name);
 }
 assert.equal(job['continue-on-error'],undefined);
 for(const step of steps)assert.equal(step['continue-on-error'],undefined,step.name+' must retain failures');
 assert.match(steps.find(step=>step.name==='Verify whole-phase SHA and mandatory UX evidence').run,/report\.errors\.length/);
 assert.match(steps.find(step=>step.name==='Verify remediation SHA-bound evidence').run,/r\.runtimeErrors/);
});
test('Clocker rendering controls run before the unchanged authenticated regression and retain their receipt',()=>{
 const steps=workflow.jobs['phase-d-attendance-ui'].steps;
 const step=steps.find(value=>value.name==='Existing Clocker lifecycle and recovery browser regression');
 assert.deepEqual(step.run.trim().split('\n'),[
  'node scripts/clocker-break-filter-readiness.check.mjs',
  'node scripts/phase-c-clocker-postgres.mjs --punch-ui',
 ]);
 assert.equal(step.env.PHASE_C_EXPECTED_SHA,'${{ github.event.pull_request.head.sha || github.sha }}');
 assert.equal(step.env.PHASE_C_EVIDENCE_DIR,'${{ runner.temp }}/nevora-clocker-browser-evidence');
 assert.equal(step['continue-on-error'],undefined);
 const upload=steps.find(value=>value.name==='Upload whole Phase D browser evidence');
 assert.equal(upload.if,'always()');assert.equal(upload.with['if-no-files-found'],'error');
 assert(upload.with.path.includes('${{ runner.temp }}/nevora-clocker-browser-evidence/*.json'));
});
test('runtime installers prefer the existing official mirror before every apt dependency step',()=>{
 for(const name of ['clocker-postgres-suite','release-postgres','phase-e-postgres','phase-d-attendance-ui','management-review-ui','phase-e-ui-suite']){
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
 assert.deepEqual(workflow.on.push.tags,['candidate/backend-completion/**']);
 for(const target of ['development','main','codex/verify-preview-33'])assert(workflow.on.pull_request.branches.includes(target));
 assert.equal(workflow.concurrency['cancel-in-progress'],"${{ github.event_name == 'pull_request' }}");
});
test('all triggered candidate branches receive mandatory SQL and browser gates',()=>{
 for(const name of mandatory) {
  assert(workflow.jobs[name], 'Missing mandatory gate '+name);
  assert.equal(workflow.jobs[name].if,['phase-e-ui','clocker-postgres'].includes(name) ? '${{ always() }}' : undefined,'Branch-dependent skipping is forbidden for '+name);
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

test('six bounded leaves retain both Home engines, strict aggregation and unique raw artifacts',()=>{
 const leaf=workflow.jobs['phase-e-ui-suite'], aggregate=workflow.jobs['phase-e-ui'];
 assert.equal(leaf.if,undefined);
 assert.deepEqual(leaf.strategy,{ 'fail-fast':false, 'max-parallel':2, matrix:{include:[
  {suite:'home',engine:'chromium',leaf:'home-chromium'},
  {suite:'home',engine:'webkit',leaf:'home-webkit'},
  {suite:'communications',leaf:'communications'},
  {suite:'calendar',leaf:'calendar'},
  {suite:'navigation',leaf:'navigation'},
  {suite:'attention',leaf:'attention'},
 ]} });
 assert.equal(leaf.env.PHASE_E_EXPECTED_SHA,'${{ github.event.pull_request.head.sha || github.sha }}');
 assert.equal(leaf.env.PHASE_E_BROWSER_SUITE,'${{ matrix.suite }}');
 assert.equal(leaf.env.PHASE_E_BROWSER_ENGINE,'${{ matrix.engine }}');
 assert.equal(leaf.name,'phase-e-ui-suite (${{ matrix.leaf }})');
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
 assert.equal(upload.with.name,'phase-e-browser-${{ github.event.pull_request.head.sha || github.sha }}-${{ matrix.leaf }}');
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
  PHASE_E_EXPECTED_SHA:'${{ github.event.pull_request.head.sha || github.sha }}',
  PHASE_E_EVIDENCE_DIR:'${{ runner.temp }}/nevora-phase-e-browser-aggregate',
  PHASE_E_ARTIFACTS_DIR:'${{ runner.temp }}/nevora-phase-e-suite-artifacts',
  PHASE_E_CI_NEEDS_JSON:'${{ toJSON(needs) }}',
 });
 assert(aggregate.steps.indexOf(download[0])<aggregate.steps.indexOf(gate));
});

test('management review and complete payroll sources are mandatory candidate gates',()=>{
 const job=workflow.jobs['management-review-ui'];assert.equal(job.if,undefined);assert.equal(job['continue-on-error'],undefined);
 for(const suite of ['management-close-ui','delegated-corrections']){
  const step=job.steps.find(s=>s.run===`node scripts/payroll-postgres.mjs vitest.${suite}-browser.config.mts`);assert(step);assert.equal(step['continue-on-error'],undefined);
 }
 assert(job.steps.some(s=>s.run?.startsWith('node scripts/management-review-evidence.mjs')));
 assert(workflow.jobs['phase-e-evidence'].needs.includes('management-review-ui'));
 const step=workflow.jobs['release-postgres'].steps.find(s=>s.run?.includes('vitest.payroll-source-pagination-integration.config.mts'));assert(step);assert.equal(step.if,undefined);assert.equal(step['continue-on-error'],undefined);
 const baseSql=workflow.jobs['release-postgres'].steps.find(s=>s.run==='npm run test:release:postgres');assert.equal(baseSql.env.NEVORA_CAPACITY_EVIDENCE,'${{ runner.temp }}/capacity-evidence');
 for(const step of job.steps)assert.equal(step['continue-on-error'],undefined);
 const upload=job.steps.find(s=>s.name==='Upload management review browser evidence');assert.equal(upload.if,'always()');assert.equal(upload.with['if-no-files-found'],'error');
});

test('the same immutable candidate runs the existing web Mobile Access gate',()=>{
 const mobile=require('js-yaml').load(readFileSync('.github/workflows/mobile-access.yml','utf8'));
 assert.deepEqual(mobile.on.push.tags,['candidate/backend-completion/**']);
 const job=mobile.jobs['mobile-access'];assert(job);assert.equal(job.if,undefined);assert.equal(job['continue-on-error'],undefined);
 assert(job.steps.some(s=>s.name==='Checkout exact candidate'&&s.with.ref==='${{ github.sha }}'));
 for(const step of job.steps)assert.equal(step['continue-on-error'],undefined);
});

test('conversations SQL is a mandatory owned release gate with retained evidence',()=>{
 const config=readFileSync('vitest.conversations-integration.config.mts','utf8');
 assert(config.includes("include:['src/test/integration/conversations.integration.ts']"));
 const verify=job=>{
  assert.equal(job.if,undefined);assert.equal(job['continue-on-error'],undefined);
  const step=job.steps.find(s=>s.run==='node scripts/payroll-postgres.mjs vitest.conversations-integration.config.mts --reporter=json --outputFile="$RUNNER_TEMP/conversations.json"');
  assert(step,'missing conversations owned SQL gate');assert.equal(step.if,undefined);assert.equal(step['continue-on-error'],undefined);
  const upload=job.steps.find(s=>s.with?.name==='conversations-sql-${{ github.event.pull_request.head.sha || github.sha }}');
  assert(upload);assert.equal(upload.if,'always()');assert.equal(upload.with['if-no-files-found'],'error');assert.equal(upload.with.path,'${{ runner.temp }}/conversations.json');
 };
 const job=workflow.jobs['release-postgres'];verify(job);
 for(const mutation of ['remove','condition','allow-failure','job-condition','job-allow-failure','ignore-exit','drop-artifact']){
  const broken=structuredClone(job),index=broken.steps.findIndex(s=>s.run?.includes('vitest.conversations-integration.config.mts'));
  if(mutation==='remove')broken.steps.splice(index,1);
  if(mutation==='condition')broken.steps[index].if='false';
  if(mutation==='allow-failure')broken.steps[index]['continue-on-error']=true;
  if(mutation==='job-condition')broken.if='false';
  if(mutation==='job-allow-failure')broken['continue-on-error']=true;
  if(mutation==='ignore-exit')broken.steps[index].run+=' || true';
  if(mutation==='drop-artifact')broken.steps.find(s=>s.with?.name?.startsWith('conversations-sql-')).with.path='${{ runner.temp }}/native-payroll.json';
  assert.throws(()=>verify(broken),undefined,mutation);
 }
});

test('combined Step4 lifecycle remains a mandatory exact-source browser gate with retained evidence',()=>{
 const job=workflow.jobs['phase-d-attendance-ui'];
 const gate=job.steps.find(step=>step.name==='Combined company lifecycle and recovery gate');
 assert(gate,'Combined lifecycle gate is absent');
 assert.equal(gate.run,'node scripts/step4-local-acceptance.mjs');
 assert.equal(gate.if,"${{ !cancelled() && steps.attendance_runtime.outcome == 'success' }}");
 assert.equal(gate['continue-on-error'],undefined);
 assert.equal(gate.env.NEVORA_STEP4_EXPECTED_SHA,'${{ github.event.pull_request.head.sha || github.sha }}');
 assert.equal(gate.env.NEVORA_STEP4_EVIDENCE,'${{ runner.temp }}/nevora-step4-local');
 const upload=job.steps.find(step=>step.name==='Upload combined company lifecycle evidence');
 assert.equal(upload.if,'always()');assert.equal(upload.with.name,'step4-local-${{ github.event.pull_request.head.sha || github.sha }}');assert.equal(upload.with['if-no-files-found'],'error');assert.equal(upload.with['retention-days'],14);
 for(const suffix of ['/**/*.json','/**/*.png','/**/*-trace.zip'])assert(upload.with.path.split('\n').includes('${{ runner.temp }}/nevora-step4-local'+suffix));
 assert.equal(job['timeout-minutes'],50);
});
