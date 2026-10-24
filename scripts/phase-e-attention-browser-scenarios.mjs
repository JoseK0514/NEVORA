import assert from 'node:assert/strict';
import {join} from 'node:path';
import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {seedOwnedScenario,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {publishScheduleWithRevision} from '../src/test/integration/management-api.ts';
import {safeEvaluationFailure,safeScheduleServerRequests,safeDatabaseWaits} from './release-browser-diagnostics.mjs';
import {observeDocumentNavigation} from './browser-navigation-diagnostic.mjs';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {waitForPrivateIntentClear} from './browser-render-readiness.mjs';
import {observeRevocationActions,captureRevocationFailure} from './attention-revocation-diagnostic.mjs';

export async function runScenario({app,context,page,engine,width,evidenceDirectory,runtimeErrors:cellRuntimeErrors}){
 const label=`AT${engine==='chromium'?'C':'W'}${width}`,index=[320,375,390,430,768,1024,1440].indexOf(width)+(engine==='webkit'?7:0);
 const scenario=await seedOwnedScenario(app.database.executor,label,index+56),actor=scenario.actors[0],q=(text,values=[])=>app.database.executor.query({text,values});
 const checks=[],runtimeErrors=[],details={engine,width,actor,week:scenario.week,actions:[]};let stage='login';page.on('pageerror',error=>{if(!cellRuntimeErrors.isNavigationDiagnostic(error))runtimeErrors.push({stage,name:error.name,message:error.message.replace(/https?:[^\s]+/g,'[URL]')});});
 const startedAt=performance.now(),navigation=observeDocumentNavigation(page,()=>app.url),browser=context.browser();details.lifecycle=[];
 const atMs=()=>Math.round(performance.now()-startedAt);
 const revocationActions=observeRevocationActions(page,app.url,()=>stage,atMs);
 const record=(event,fields={})=>{details.lifecycle.push({stage,event,atMs:atMs(),...fields});if(details.lifecycle.length>64)details.lifecycle.shift();};
 const disconnected=()=>record('browser-disconnected');browser?.on('disconnected',disconnected);
 for(const event of ['close','crash','domcontentloaded','load'])page.on(event,()=>record(event));
 page.on('request',request=>{
  if(request.method()==='POST')details.actions.push({stage,atMs:atMs(),event:'request',serverAction:!!request.headers()['next-action'],documentNavigation:request.isNavigationRequest()});
  if(request.isNavigationRequest()&&request.frame()===page.mainFrame())record('document-request',{navigation:navigation.snapshot()});
 });
 for(const event of ['response','requestfinished','requestfailed'])page.on(event,value=>{
  const request=event==='response'?value.request():value;
  if(stage==='unavailable-retry'&&request.method()==='POST'&&request.headers()['next-action'])
   details.actions.push({stage,atMs:atMs(),event,...(event==='response'?{status:value.status()}:{} )});
 });
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())record('document-history-or-commit',{navigation:navigation.snapshot()});});
 await context.exposeBinding('__nevoraQaAttentionLifecycle',(source,value)=>{
  if(source.page!==page||!value||!['focus','blur','pagehide','pageshow','visibilitychange'].includes(value.event))return;
  record(value.event,{visibility:['visible','hidden'].includes(value.visibility)?value.visibility:'unknown',focused:value.focused===true});
 });
 await context.addInitScript(()=>{
  const report=event=>{void globalThis.__nevoraQaAttentionLifecycle({event,visibility:document.visibilityState,focused:document.hasFocus()}).catch(()=>{});};
  for(const event of ['focus','blur','pagehide','pageshow'])window.addEventListener(event,()=>report(event));
  document.addEventListener('visibilitychange',()=>report('visibilitychange'));
 });
 cellRuntimeErrors.setStageReader(()=>stage);
 const screenshot=async (name,options={})=>page.screenshot({path:join(evidenceDirectory,`attention-${engine}-${width}-${name}.png`),fullPage:true,...options});
 async function login(target=page){await target.goto(app.url+'/login');await target.getByLabel('Employee ID',{exact:true}).fill(actor);await target.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([target.waitForURL(u=>u.pathname==='/app'),target.getByRole('button',{name:'Sign in',exact:true}).click()]);await target.waitForLoadState('networkidle');}
 async function schedule(extra=''){await page.goto(app.url+`/app/schedule?week=${scenario.week}${extra}`);await page.waitForLoadState('networkidle');}
 async function publish(start){if(start)await q('UPDATE shifts SET start_time=$1 WHERE id=$2',[start,scenario.sourceId]);await publishScheduleWithRevision({locationId:'loc-1',weekStart:scenario.week,managerId:'QAOWNER'},app.database.executor);}
 const confirm=()=>page.getByRole('button',{name:'Confirm schedule',exact:true});
 const operation=()=>page.locator('input[name="operationId"]').inputValue();
 let scenarioFailure;
 try{
 await login();stage='full-review';await schedule('&acknowledged=1');
 assert.equal(await page.getByText('Schedule confirmed.',{exact:true}).count(),0,'query cannot fabricate success');assert(await confirm().isEnabled());
 details.reviewedRevision=await page.locator('input[name="expectedRevisionId"]').inputValue();
 assert.equal(await page.getByRole('heading',{level:1,name:'My schedule',exact:true}).count(),1);assert.equal(await page.getByRole('navigation',{name:'Schedule views',exact:true}).count(),1);assert.equal(await page.locator('#schedule-'+scenario.sourceDate).count(),1);assert.equal(await page.locator('input[name="sessionTokenHash"]').count(),0);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const rect=await confirm().boundingBox();assert(rect&&rect.height>=44&&rect.x>=0&&rect.x+rect.width<=width);
 await screenshot('review');checks.push('Actual authenticated weekly content and displayed revision; forged success query ignored; 44px bounded control; no raw session proof in form');
 stage='native-focus';const tab=process.platform==='darwin'&&engine==='webkit'?'Alt+Tab':'Tab';let reached=false;
 for(let i=0;i<50;i++){await page.keyboard.press(tab);if(await confirm().evaluate(e=>e===document.activeElement)){reached=true;break;}}
 assert(reached,'native keyboard reaches confirmation');assert(await confirm().evaluate(e=>e.matches(':focus-visible')));checks.push('Native keyboard traverses to visible confirmation focus');
 stage='revision-conflict';const original=await operation();let release;const gate=new Promise(r=>{release=r;});let started;const seen=new Promise(r=>{started=r;});let captured;
 const route=async request=>{if(request.request().method()==='POST'&&request.request().headers()['next-action']){captured={headers:request.request().headers(),body:request.request().postData()};started();await gate;}await request.continue();};
 await page.route('**/app/schedule?*',route);
 if(width<768)await confirm().tap();else await confirm().click();await seen;
 await page.getByRole('button',{name:'Confirming…',exact:true}).waitFor();assert(await page.getByRole('button',{name:'Confirming…',exact:true}).isDisabled());await screenshot('pending');
 await publish('09:00');release();await page.getByRole('alert').filter({hasText:'The schedule changed.'}).waitFor();await page.unroute('**/app/schedule?*',route);
 assert.equal(await operation(),original);assert.equal((await q('SELECT * FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,scenario.week])).length,0);await screenshot('conflict');
 checks.push('Actual delayed server command shows pending/disabled state; unseen republish returns conflict and no canonical acknowledgement');
 stage='confirmation';await page.getByRole('button',{name:'Review current schedule',exact:true}).click();await confirm().waitFor();await page.waitForFunction(old=>document.querySelector('input[name="operationId"]')?.value!==old,original);
 const current=await operation();assert.notEqual(current,original);await confirm().click();await page.getByRole('heading',{name:'You’re up to date',exact:true}).waitFor();
 const canonical=await q('SELECT publication_revision_id FROM schedule_acknowledgements WHERE employee_id=$1 AND week_start=$2',[actor,scenario.week]);const latest=await q('SELECT id FROM schedule_publication_revisions WHERE week_start=$1 ORDER BY revision_number DESC LIMIT 1',[scenario.week]);assert.equal(canonical[0].publication_revision_id,latest[0].id);await screenshot('success');
 checks.push('Review current schedule issues a new displayed intent; explicit confirmation is proven against current canonical revision');
 stage='republish';await publish();await schedule();assert.equal(await confirm().count(),0);assert.equal(await page.getByRole('heading',{name:'You’re up to date',exact:true}).count(),1);checks.push('Equivalent own-shift republish preserves canonical confirmation');
 await publish('10:00');await schedule();assert(await confirm().isEnabled());
 stage='response-loss';
 // Abort one action response in the browser after the actual server commit.
 let lost=false;await page.route('**/app/schedule?*',async route=>{if(!lost&&route.request().method()==='POST'&&route.request().headers()['next-action']){lost=true;details.actions.push({stage,atMs:atMs(),event:'response-loss-intercept'});const response=await route.fetch();details.actions.push({stage,atMs:atMs(),event:'response-loss-upstream',status:response.status()});await route.abort('failed');details.actions.push({stage,atMs:atMs(),event:'response-loss-aborted'});}else await route.continue();});
 const recoveryOp=await operation();await confirm().click();
 try{await page.getByRole('alert').filter({hasText:'Confirmation outcome unknown.'}).waitFor();}
 catch(error){details.responseLoss={intercepted:lost,atMs:atMs(),pageClosed:page.isClosed(),browserConnected:browser?.isConnected()??null,navigation:navigation.snapshot()};
  try{details.responseLoss.canonicalOperations=(await q('SELECT * FROM employee_attention_operations WHERE employee_id=$1 AND operation_id=$2',[actor,recoveryOp])).length;}catch{details.responseLoss.canonicalReadFailed=true;}
  try{details.responseLoss.view=await runBeforeRecoveryDeadline(()=>page.evaluate(()=>({unknown:!![...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent?.includes('Confirmation outcome unknown.')),blocked:!![...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent?.includes('no longer authorized')),confirmation:document.querySelector('button[aria-busy]')?.getAttribute('aria-busy')??null,success:!![...document.querySelectorAll('h2')].find(e=>e.textContent==='You’re up to date')})),performance.now()+5000);}catch(error){details.responseLoss.viewReadFailure=safeEvaluationFailure(error);}
  await screenshot('response-loss-failure',{timeout:5000}).catch(error=>{details.responseLoss.screenshotFailure=safeEvaluationFailure(error);});throw error;}
 assert.equal(await operation(),recoveryOp);await screenshot('unknown');
 await page.unroute('**/app/schedule?*');await page.getByRole('button',{name:'Retry confirmation',exact:true}).click();await page.getByRole('heading',{name:'You’re up to date',exact:true}).waitFor();
 assert.equal((await q('SELECT * FROM employee_attention_operations WHERE employee_id=$1 AND operation_id=$2',[actor,recoveryOp])).length,1);checks.push('Actual committed action response loss renders outcome_unknown; original operation retry recovers one canonical result');
 stage='leave-and-revoke';await publish('11:00');await schedule();await page.locator('input[name="authority"]').waitFor({state:'attached'});assert.equal(await page.locator('input[name="authority"]').count(),1);await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await waitForPrivateIntentClear(page),0);checks.push('Leaving the view clears obsolete private intent and prevents late-response reuse');
 await schedule();stage='session-revocation';await q('DELETE FROM employee_sessions WHERE employee_id=$1',[actor]);await confirm().click();
 try{await page.waitForURL(u=>u.pathname==='/login');}
 catch(error){
  details.sessionRevocation={failedAtMs:atMs(),pageClosed:page.isClosed(),browserConnected:browser?.isConnected()??null,navigation:navigation.snapshot(),actionsAtFailure:revocationActions.snapshot()};
  try{Object.assign(details.sessionRevocation,await captureRevocationFailure({
   view:()=>page.evaluate(()=>({route:location.pathname==='/login'?'login':location.pathname==='/app/schedule'?'schedule':'other',readyState:document.readyState,focused:document.hasFocus(),visibility:document.visibilityState,signInVisible:[...document.querySelectorAll('button')].some(e=>e.textContent?.trim()==='Sign in'&&e.getClientRects().length>0),confirmPending:[...document.querySelectorAll('button')].some(e=>e.textContent?.trim()==='Confirming…'),authorityInputs:document.querySelectorAll('input[name="authority"]').length,operationPresent:!!document.querySelector('input[name="operationId"]')})),
   sessions:()=>q('SELECT count(*)::int AS sessions FROM employee_sessions WHERE employee_id=$1',[actor]),
   databaseWaits:()=>q('SELECT state,wait_event_type,wait_event,count(*)::int AS connections,sum(cardinality(pg_blocking_pids(pid)))::int AS blockers FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY state,wait_event_type,wait_event ORDER BY state,wait_event_type,wait_event'),
   serverRequests:()=>readFile(join(app.root,'next.log'),'utf8'),
   screenshot:()=>screenshot('session-revocation-failure',{timeout:5000,mask:[page.locator('input')]}),
  }));}catch(captureError){details.sessionRevocation.captureFailure=safeEvaluationFailure(captureError);}
  throw error;
 }
 checks.push('Actual session revocation is denied by server action and routes to login');
 await login();await schedule();
 if(width===390){
  stage='unavailable-retry';const blocker=new Client({connectionString:app.database.connectionString});await blocker.connect();
  try{
   const unavailableOperation=await operation();await blocker.query('BEGIN');await blocker.query('LOCK TABLE employee_attention_operations IN ACCESS EXCLUSIVE MODE');
   await confirm().click();
   try{await page.getByRole('alert').filter({hasText:'Confirmation unavailable.'}).waitFor();}
   catch(error){
    details.unavailableRetry={atMs:atMs(),pageClosed:page.isClosed(),browserConnected:browser?.isConnected()??null,navigation:navigation.snapshot()};
    try{details.unavailableRetry.view=await runBeforeRecoveryDeadline(()=>page.evaluate(()=>({
     unavailable:!![...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent?.includes('Confirmation unavailable.')),
     unknown:!![...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent?.includes('Confirmation outcome unknown.')),
     blocked:!![...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent?.includes('no longer authorized')),
     confirmation:document.querySelector('button[aria-busy]')?.getAttribute('aria-busy')??null,
     authorityFields:document.querySelectorAll('input[name="authority"]').length,
     success:!![...document.querySelectorAll('h2')].find(e=>e.textContent==='You’re up to date'),
    })),performance.now()+5000);}catch(error){details.unavailableRetry.viewReadFailure=safeEvaluationFailure(error);}
    try{details.unavailableRetry.databaseWaits=await q('SELECT wait_event_type,wait_event,count(*)::int AS connections FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY wait_event_type,wait_event ORDER BY wait_event_type,wait_event');}catch{details.unavailableRetry.databaseReadFailed=true;}
    await screenshot('unavailable-failure',{timeout:5000}).catch(error=>{details.unavailableRetry.screenshotFailure=safeEvaluationFailure(error);});throw error;
   }
   assert.equal(await operation(),unavailableOperation);await screenshot('unavailable');
   await blocker.query('COMMIT');details.retryAfterRelease={lockReleasedAtMs:atMs()};await page.getByRole('button',{name:'Retry confirmation',exact:true}).click();
   try{await page.getByRole('heading',{name:'You’re up to date',exact:true}).waitFor();}
   catch(error){
    const diagnostic=details.retryAfterRelease;
    try{
    diagnostic.failedAtMs=atMs();diagnostic.pageClosed=page.isClosed();diagnostic.browserConnected=browser?.isConnected()??null;diagnostic.navigation=navigation.snapshot();
    const deadline=performance.now()+5000;
    const observations=await Promise.allSettled([
     runBeforeRecoveryDeadline(()=>page.evaluate(operation=>({unavailable:!![...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent?.includes('Confirmation unavailable.')),unknown:!![...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent?.includes('Confirmation outcome unknown.')),pending:!!document.querySelector('button[aria-busy="true"]'),success:!![...document.querySelectorAll('h2')].find(e=>e.textContent==='You’re up to date'),authorityFields:document.querySelectorAll('input[name="authority"]').length,sameOperation:document.querySelector('input[name="operationId"]')?.value===operation}),unavailableOperation),deadline),
     runBeforeRecoveryDeadline(()=>q('SELECT count(*)::int AS committed FROM employee_attention_operations WHERE employee_id=$1 AND operation_id=$2',[actor,unavailableOperation]),deadline),
     runBeforeRecoveryDeadline(()=>q('SELECT state,wait_event_type,wait_event,count(*)::int AS connections,sum(cardinality(pg_blocking_pids(pid)))::int AS blockers FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY state,wait_event_type,wait_event ORDER BY state,wait_event_type,wait_event'),deadline),
     runBeforeRecoveryDeadline(async()=>safeScheduleServerRequests(await readFile(join(app.root,'next.log'),'utf8')),deadline),
    ]);
    for(const [index,name] of ['view','operation','databaseWaits','serverRequests'].entries()){const observation=observations[index];if(observation.status==='rejected'){diagnostic[name+'Failure']=safeEvaluationFailure(observation.reason);continue;}diagnostic[name]=name==='databaseWaits'?safeDatabaseWaits(observation.value):name==='operation'?{committed:Number.isSafeInteger(observation.value[0]?.committed)?observation.value[0].committed:null}:observation.value;}
    await screenshot('retry-after-release-failure',{timeout:5000,mask:[page.locator('input')]}).catch(error=>{diagnostic.screenshotFailure=safeEvaluationFailure(error);});
    }catch(failure){diagnostic.captureFailure=safeEvaluationFailure(failure);}
    throw error;
   }
   assert.equal((await q('SELECT * FROM employee_attention_operations WHERE employee_id=$1 AND operation_id=$2',[actor,unavailableOperation])).length,1);
   await blocker.query('BEGIN');await blocker.query('LOCK TABLE schedule_publication_revisions IN ACCESS EXCLUSIVE MODE');
   await schedule();assert.equal(await confirm().count(),0);assert.equal(await page.locator('.employee-schedule-shift').count(),0);assert(await page.getByRole('status').filter({hasText:'Schedule unavailable'}).count());await screenshot('source-unavailable');
   await blocker.query('COMMIT');checks.push('Actual lock timeout renders unavailable and original-operation retry commits once; blocked weekly source displays no private assignments');
  }finally{await blocker.query('ROLLBACK');await blocker.end();}
 }
 // Empty week is a true source state, not a false success.
 stage='empty';const empty=new Date(scenario.week+'T12:00:00Z');empty.setUTCDate(empty.getUTCDate()+7);await page.goto(app.url+'/app/schedule?week='+empty.toISOString().slice(0,10));await page.waitForLoadState('networkidle');assert.equal(await confirm().count(),0);assert.equal(await page.getByText('Schedule not published yet',{exact:true}).count(),7);assert.equal(await page.getByText('Off — no assignment',{exact:true}).count(),0);assert(await page.getByRole('status').filter({hasText:'published this week yet'}).count());await screenshot('empty');checks.push('Unpublished empty week has no confirmation and no fabricated off/success state');
 // Return to real schedule for driver's WCAG scan.
 stage='layout';await schedule();details.responseCaptured=!!captured;
 return {checks};
 }catch(error){scenarioFailure=error;throw error;}
 finally{revocationActions.close();details.sessionRevocationActions=revocationActions.snapshot();browser?.off('disconnected',disconnected);details.stage=stage;details.checks=checks;details.runtimeErrors=runtimeErrors;try{await writeFile(join(evidenceDirectory,`attention-${engine}-${width}-report.json`),JSON.stringify(details,null,2));}catch(error){if(!scenarioFailure)throw error;console.error('Attention diagnostic report unavailable; original scenario failure retained');}}
}
