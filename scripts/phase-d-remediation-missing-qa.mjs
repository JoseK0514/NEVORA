import {execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {boundCorrectionPost} from './phase-d-correction-http-fixture.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src//test/integration/owned-next-app.ts';
import {seedOwnedApp,TEST_PASSWORD} from '../src//test/integration/owned-app-fixture.ts';
import {hashPassword} from '../src//lib/auth/password.ts';
const pw=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),sourceClean=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()==='';
if(process.env.PHASE_D_EXPECTED_SHA){assert.equal(checkpoint,process.env.PHASE_D_EXPECTED_SHA);assert(sourceClean);}
const dir=resolve(process.env.PHASE_D_REMEDIATION_EVIDENCE_DIR+'/missing');await mkdir(dir,{recursive:true});const results=[],runtimeErrors=[],landingReads=[];let app,browser;
const q=(text,values=[])=>app.database.executor.query({text,values});const h=()=>({'X-Nevora-Time-Correction':'1',Origin:app.url});
const save=()=>writeFile(dir+'/report.json',JSON.stringify({checkpoint,tree,sourceClean,results,runtimeErrors,landingReads},null,2));
async function record(name,fn){let observations={};try{await fn(v=>Object.assign(observations,v));results.push({name,result:'PASS',observations});}catch(e){results.push({name,result:'FAIL',observations,error:String(e.stack??e)});}console.log(name+': '+results.at(-1).result);await save();}
async function context(id){
 const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await c.route('**/*',route=>{const u=new URL(route.request().url());return ['http:','https:'].includes(u.protocol)&&u.origin!==app.url?route.abort('blockedbyclient'):route.continue();});const p=await c.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>runtimeErrors.push(String(e)));await p.goto(app.url+'/login');await p.getByLabel('Employee ID',{exact:true}).fill(id);await p.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
 const reads=id==='QAOWNER'?[{path:'/api/manager/today',method:'GET'},{path:'/api/manager/action-center',method:'POST'},{path:'/api/manager/clock-monitor',method:'GET'}]:[];
 const pending=reads.map(async({path,method})=>{const response=await p.waitForResponse(response=>new URL(response.url()).pathname===path&&response.request().method()===method);assert.equal(response.status(),200,'Current Manager landing read succeeds before navigation');assert.equal(await response.finished(),null,'Current Manager landing body completes');landingReads.push({path,method,status:response.status()});});
 await Promise.all([p.waitForURL(u=>u.pathname==='/app',{waitUntil:'commit'}),p.getByRole('button',{name:'Sign in',exact:true}).click(),...pending]);
 await p.locator('.app-shell.nevora-portal').waitFor();await p.waitForLoadState('networkidle');return {c,p};
}
try{
 app=await createOwnedNextApp(dir);await seedOwnedApp(app.database.executor);const ph=await hashPassword(TEST_PASSWORD);
 for(const engine of ['chromium','webkit']){
  const eid='MC-'+engine;await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$1,'Fictional','555-0777','EMPLOYEE','loc-1')",[eid]);await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[eid,ph]);await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[eid]);
  browser=await pw[engine].launch({headless:true});const e=await context(eid),m=await context('QAOWNER');
  try{
   const day=engine==='chromium'?'05':'15',t=(hm)=>`2020-10-${day}T${hm}:00Z`;
   const submit=async(start,end,extra={})=>{const r=await boundCorrectionPost(e.c.request,app.url+'/api/employee/time-corrections',{headers:h(),data:{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:t(start),proposedEndAt:t(end),reason:'Independent missing context '+engine,...extra}});assert.equal(r.status(),202);return r.json();};
   const review=async(requestId)=>{const r=await boundCorrectionPost(m.c.request,app.url+'/api/manager/time-corrections',{headers:h(),data:{operationId:randomUUID(),requestId,expectedRevision:1,decision:'APPROVE',note:'Independent fictional prior approval.'}});return {status:r.status(),body:await r.json()};};
   const aRequest=await submit('08:00','09:00');const a=await review(aRequest.requestId);assert.equal(a.status,200);
   const target={targetAdjustmentId:a.body.adjustmentId,expectedBaseRevision:a.body.revision};
   const b=await submit('08:05','09:00',target);const c=await submit('10:00','11:00',target);
   const accepted=await review(c.requestId);assert.equal(accepted.status,200);
   const [canonical]=await q('SELECT adjustment_id::text,start_at::text,end_at::text FROM nevora_effective_time_entries WHERE employee_id=$1',[eid]);assert.equal(canonical.adjustment_id,accepted.body.adjustmentId);
   const manager=await (await m.c.request.get(app.url+'/api/manager/time-corrections',{headers:h()})).json();assert.equal(manager.state,'ready');const pending=manager.requests.find(x=>x.id===b.requestId);assert(pending);
   await m.p.goto(app.url+'/app?view=attendance',{waitUntil:'networkidle'});await m.p.getByRole('button',{name:'Approve correction for '+eid+' Fictional',exact:true}).waitFor();const row=m.p.locator('.manager-correction-row').filter({hasText:eid+' Fictional'});const text=await row.innerText();await m.p.screenshot({path:dir+'/'+engine+'-stale-missing-manager.png',fullPage:true});
   await record(engine+' pending missing replacement shows current canonical successor and stale baseline',async o=>{o({a:a.body,b,c,canonical,pending,renderedText:text});assert.equal(pending.context.state,'confirmed','Current effective missing time exists and must not be reported as none');assert.equal(pending.baseChanged,true,'A superseded captured base must be flagged stale');assert(!text.includes('No approved missing-time adjustment'));});
   const employee=await (await e.c.request.get(app.url+'/api/employee/time-corrections',{headers:h()})).json();await e.p.goto(app.url+'/app/my-time',{waitUntil:'networkidle'});await e.p.getByRole('heading',{name:'Corrections',exact:true}).waitFor();const employeeText=await e.p.locator('.employee-correction-center').innerText();await e.p.screenshot({path:dir+'/'+engine+'-missing-history-employee.png',fullPage:true});
   await record(engine+' missing supersession history distinguishes replaced approval from absent effective time',async o=>{const prior=employee.requests.find(x=>x.id===aRequest.requestId);const stale=employee.requests.find(x=>x.id===b.requestId);o({canonical,prior,stale,current:employee.requests.find(x=>x.id===c.requestId),renderedText:employeeText});assert(!employeeText.includes('No approved missing-time adjustment'),'Earlier approved/superseded missing history must not falsely imply no effective approval exists');});
   await record(engine+' stale missing approval still fails closed and retains the current leaf',async o=>{const denied=await review(b.requestId);assert.equal(denied.status,409);assert.equal(denied.body.reason,'stale_source');const rows=await q('SELECT adjustment_id::text FROM nevora_effective_time_entries WHERE employee_id=$1',[eid]);assert.deepEqual(rows,[{adjustment_id:accepted.body.adjustmentId}]);o({denied,currentLeafUnchanged:true});});
  }finally{await e.c.close();await m.c.close();await browser.close();browser=null;}
 }
}finally{if(browser)await browser.close();if(app)await app.close();await save();}
if(results.some(x=>x.result==='FAIL')||runtimeErrors.length)process.exitCode=1;console.log(JSON.stringify({checks:results.length,failed:results.filter(x=>x.result==='FAIL').map(x=>x.name),runtimeErrors},null,2));
