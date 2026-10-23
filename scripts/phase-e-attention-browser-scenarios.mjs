import assert from 'node:assert/strict';
import {join} from 'node:path';
import {Client} from 'pg';
import {writeFile} from 'node:fs/promises';
import {seedOwnedScenario,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';
import {publishScheduleWithRevision} from '../src/test/integration/management-api.ts';

export async function runScenario({app,context,page,engine,width,evidenceDirectory,runtimeErrors:cellRuntimeErrors}){
 const label=`AT${engine==='chromium'?'C':'W'}${width}`,index=[320,375,390,430,768,1024,1440].indexOf(width)+(engine==='webkit'?7:0);
 const scenario=await seedOwnedScenario(app.database.executor,label,index+56),actor=scenario.actors[0],q=(text,values=[])=>app.database.executor.query({text,values});
 const checks=[],runtimeErrors=[],details={engine,width,actor,week:scenario.week,actions:[]};let stage='login';page.on('pageerror',error=>{if(!cellRuntimeErrors.isNavigationDiagnostic(error))runtimeErrors.push({stage,name:error.name,message:error.message.replace(/https?:[^\s]+/g,'[URL]')});});
 page.on('request',request=>{if(request.method()==='POST')details.actions.push({stage,event:'request',serverAction:!!request.headers()['next-action'],documentNavigation:request.isNavigationRequest()});});
 cellRuntimeErrors.setStageReader(()=>stage);
 const screenshot=async name=>page.screenshot({path:join(evidenceDirectory,`attention-${engine}-${width}-${name}.png`),fullPage:true});
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
 let lost=false;await page.route('**/app/schedule?*',async route=>{if(!lost&&route.request().method()==='POST'&&route.request().headers()['next-action']){lost=true;details.actions.push({stage,event:'response-loss-intercept'});const response=await route.fetch();details.actions.push({stage,event:'response-loss-upstream',status:response.status()});await route.abort('failed');details.actions.push({stage,event:'response-loss-aborted'});}else await route.continue();});
 const recoveryOp=await operation();await confirm().click();
 try{await page.getByRole('alert').filter({hasText:'Confirmation outcome unknown.'}).waitFor();}
 catch(error){details.responseLoss={intercepted:lost};
  try{details.responseLoss.canonicalOperations=(await q('SELECT * FROM employee_attention_operations WHERE employee_id=$1 AND operation_id=$2',[actor,recoveryOp])).length;}catch{details.responseLoss.canonicalReadFailed=true;}
  try{details.responseLoss.view=await page.evaluate(()=>({unknown:!![...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent?.includes('Confirmation outcome unknown.')),blocked:!![...document.querySelectorAll('[role="alert"]')].find(e=>e.textContent?.includes('no longer authorized')),confirmation:document.querySelector('button[aria-busy]')?.getAttribute('aria-busy')??null,success:!![...document.querySelectorAll('h2')].find(e=>e.textContent==='You’re up to date')}));}catch{details.responseLoss.viewReadFailed=true;}
  await screenshot('response-loss-failure').catch(()=>{details.responseLoss.screenshotFailed=true;});throw error;}
 assert.equal(await operation(),recoveryOp);await screenshot('unknown');
 await page.unroute('**/app/schedule?*');await page.getByRole('button',{name:'Retry confirmation',exact:true}).click();await page.getByRole('heading',{name:'You’re up to date',exact:true}).waitFor();
 assert.equal((await q('SELECT * FROM employee_attention_operations WHERE employee_id=$1 AND operation_id=$2',[actor,recoveryOp])).length,1);checks.push('Actual committed action response loss renders outcome_unknown; original operation retry recovers one canonical result');
 stage='leave-and-revoke';await publish('11:00');await schedule();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.locator('input[name="authority"]').count(),0);checks.push('Leaving the view clears obsolete private intent and prevents late-response reuse');
 await schedule();await q('DELETE FROM employee_sessions WHERE employee_id=$1',[actor]);await confirm().click();await page.waitForURL(u=>u.pathname==='/login');checks.push('Actual session revocation is denied by server action and routes to login');
 await login();await schedule();
 if(width===390){
  stage='unavailable-retry';const blocker=new Client({connectionString:app.database.connectionString});await blocker.connect();
  try{
   const unavailableOperation=await operation();await blocker.query('BEGIN');await blocker.query('LOCK TABLE employee_attention_operations IN ACCESS EXCLUSIVE MODE');
   await confirm().click();await page.getByRole('alert').filter({hasText:'Confirmation unavailable.'}).waitFor();assert.equal(await operation(),unavailableOperation);await screenshot('unavailable');
   await blocker.query('COMMIT');await page.getByRole('button',{name:'Retry confirmation',exact:true}).click();await page.getByRole('heading',{name:'You’re up to date',exact:true}).waitFor();
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
 finally{details.stage=stage;details.checks=checks;details.runtimeErrors=runtimeErrors;try{await writeFile(join(evidenceDirectory,`attention-${engine}-${width}-report.json`),JSON.stringify(details,null,2));}catch(error){if(!scenarioFailure)throw error;console.error('Attention diagnostic report unavailable; original scenario failure retained');}}
}
