import {boundCorrectionPost} from './phase-d-correction-http-fixture.mjs';
import {fulfillHeldResponse} from './browser-held-response.mjs';
import {execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {Temporal} from '@js-temporal/polyfill';
import {createOwnedNextApp} from '../src//test/integration/owned-next-app.ts';
import {seedOwnedApp,assignOwnedManagerCompanyAccess,TEST_PASSWORD} from '../src//test/integration/owned-app-fixture.ts';
import {hashPassword} from '../src//lib/auth/password.ts';
const pw=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),sourceClean=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()==='';
if(process.env.PHASE_D_EXPECTED_SHA){assert.equal(checkpoint,process.env.PHASE_D_EXPECTED_SHA);assert(sourceClean);}
const dir=resolve(process.env.PHASE_D_REMEDIATION_EVIDENCE_DIR+'/account');
await mkdir(dir,{recursive:true});const results=[],consoleErrors=[],runtimeErrors=[];let app,browser,activeCase='setup';
const q=(text,values=[])=>app.database.executor.query({text,values});
const headers=()=>({'X-Nevora-Time-Correction':'1',Origin:app.url,'Content-Type':'application/json'});
const local=instant=>Temporal.Instant.from(instant).toZonedDateTimeISO('America/Puerto_Rico').toPlainDateTime().toString().slice(0,16);
async function record(name,fn){activeCase=name;let observations={};try{await fn(v=>Object.assign(observations,v));results.push({name,result:'PASS',observations});}catch(e){results.push({name,result:'FAIL',observations,error:String(e.stack??e)});}await writeFile(dir+'/report.json',JSON.stringify({checkpoint,tree,sourceClean,results,consoleErrors,runtimeErrors},null,2));console.log(name+': '+results.at(-1).result);}
async function context(){const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await c.route('**/*',route=>{const u=new URL(route.request().url());return ['http:','https:'].includes(u.protocol)&&u.origin!==app.url?route.abort('blockedbyclient'):route.continue();});return c;}
async function login(c,id){const p=await c.newPage();p.setDefaultTimeout(12000);await p.goto(app.url+'/login');await p.getByLabel('Employee ID',{exact:true}).fill(id);await p.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([p.waitForURL(u=>u.pathname==='/app'),p.getByRole('button',{name:'Sign in',exact:true}).click()]);await p.waitForLoadState('networkidle');await p.close();}
async function page(c,path){const p=await c.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>runtimeErrors.push({case:activeCase,message:String(e).replaceAll(app.url,'[owned-origin]'),stack:e.stack?.replaceAll(app.url,'[owned-origin]')}));p.on('console',m=>{if(m.type()==='error')consoleErrors.push({case:activeCase,message:m.text().replaceAll(app.url,'[owned-origin]')});});await p.goto(app.url+path,{waitUntil:'networkidle'});await p.bringToFront();return p;}
try{
 app=await createOwnedNextApp(dir);await seedOwnedApp(app.database.executor);const ph=await hashPassword(TEST_PASSWORD);
 for(const [id,role] of [['RV-E1','EMPLOYEE'],['RV-E2','EMPLOYEE'],['RV-M1','MANAGER'],['RV-M2','MANAGER']]){await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$1,'Fictional','555-0444',$2,'loc-1')",[id,role]);await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[id,ph]);await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);}
 for(const id of ['RV-M1','RV-M2'])await assignOwnedManagerCompanyAccess(app.database.executor,id);
 for(const engine of ['chromium','webkit']){
  browser=await pw[engine].launch({headless:true});const dates=engine==='chromium'?['07','08','09']:['17','18','19'];
  await record(engine+' employee cross-tab account switch clears uncertain missing command',async o=>{
   const c=await context();try{
    await login(c,'RV-E1');const p=await page(c,'/app/my-time');
    await p.locator('main .employee-correction-center').getByRole('button',{name:'Request a correction',exact:true}).click();const form=p.locator('#employee-missing-time-correction');
    await form.getByLabel('Start',{exact:true}).fill(`2020-10-${dates[0]}T02:00`);await form.getByLabel('End',{exact:true}).fill(`2020-10-${dates[0]}T03:00`);await form.getByLabel('Reason',{exact:true}).fill('RV-E1 private fictional reason '+engine);
    const commands=[];await p.route('**/api/employee/time-corrections',route=>{if(route.request().method()!=='POST')return route.continue();commands.push(route.request().postDataJSON());return commands.length===1?route.abort('failed'):route.continue();});
    await form.getByRole('button',{name:'Send request',exact:true}).click();await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).waitFor();
    const preCount=(await q('SELECT count(*)::int AS n FROM time_correction_requests WHERE id=$1',[commands[0].operationId]))[0].n;assert.equal(preCount,0);
    await login(c,'RV-E2');await p.bringToFront();await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await p.locator('main .employee-time-message').getByText('Your session ended',{exact:true}).waitFor();
    const retryCount=await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).count();
    await p.screenshot({path:dir+'/'+engine+'-employee-account-switch.png',fullPage:true,caret:'initial'});
    o({beforeCommit:true,originalAccount:'RV-E1',currentAccount:'RV-E2',retryCount,commandsBeforeRetry:JSON.parse(JSON.stringify(commands)),originalRequestCount:preCount});
    if(retryCount){await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).click();await p.getByText('Correction request sent for manager review.',{exact:true}).waitFor();o({replayedCommand:commands[1],sameCommand:JSON.stringify(commands[1])===JSON.stringify(commands[0]),persisted:await q('SELECT id::text,employee_id,reason FROM time_correction_requests WHERE id=$1',[commands[0].operationId])});}
    assert.equal(retryCount,0,'Recovery must be cleared when the authenticated account changes in another tab');
   }finally{await c.close();}
  });
  await record(engine+' Manager cross-tab account switch clears uncertain review command',async o=>{
   const e=await context();await login(e,'RV-E1');const create=await e.request.post(app.url+'/api/employee/time-corrections',{headers:{...headers(),'X-Nevora-Correction-Authority':(await (await e.request.get(app.url+'/api/employee/time-corrections',{headers:headers()})).json()).authority},data:{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:`2020-10-${dates[1]}T08:00:00Z`,proposedEndAt:`2020-10-${dates[1]}T09:00:00Z`,reason:'Manager account-switch fictional fixture '+engine}});assert.equal(create.status(),202);const created=await create.json();await e.close();
   const c=await context();try{
    await login(c,'RV-M1');const p=await page(c,'/app?view=attendance');const commands=[];
    await p.route('**/api/manager/time-corrections',route=>{if(route.request().method()!=='POST')return route.continue();commands.push(route.request().postDataJSON());return commands.length===1?route.abort('failed'):route.continue();});
    const row=p.locator('.manager-correction-row').filter({hasText:'Manager account-switch fictional fixture '+engine});await row.getByRole('button',{name:'Approve correction for RV-E1 Fictional',exact:true}).click();await p.getByRole('button',{name:'Retry same decision',exact:true}).waitFor();
    await login(c,'RV-M2');await p.bringToFront();await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await row.waitFor({state:'detached'});await p.waitForLoadState('networkidle');o({afterSwitchText:await p.locator('body').innerText()});
    assert.equal(await p.locator('.premium-error,.app-error-screen').count(),0);const retryCount=await p.getByRole('button',{name:'Retry same decision',exact:true}).count();await p.screenshot({path:dir+'/'+engine+'-manager-account-switch.png',fullPage:true,caret:'initial'});
    o({originalAccount:'RV-M1',currentAccount:'RV-M2',retryCount,commandsBeforeRetry:JSON.parse(JSON.stringify(commands))});
    if(retryCount){const responseWait=p.waitForResponse(r=>r.url().endsWith('/api/manager/time-corrections')&&r.request().method()==='POST');await p.getByRole('button',{name:'Retry same decision',exact:true}).click();const response=await responseWait;await p.waitForTimeout(500);o({sameCommand:JSON.stringify(commands[1])===JSON.stringify(commands[0]),retryStatus:response.status(),persistedDecision:await q("SELECT event_kind,actor_employee_id FROM time_correction_events WHERE request_id=$1 AND event_kind='APPROVED'",[created.requestId]),afterRetryText:await p.locator('body').innerText()});}
    assert.equal(retryCount,0,'Manager recovery must be bound to the original authenticated account');
   }finally{await c.close();}
  });
  await record(engine+' Employee malformed committed body retains exact-operation recovery',async o=>{
   const c=await context();try{
    await login(c,'RV-E1');const p=await page(c,'/app/my-time');await p.locator('main .employee-correction-center').getByRole('button',{name:'Request a correction',exact:true}).click();const form=p.locator('#employee-missing-time-correction');await form.getByLabel('Start',{exact:true}).fill(`2020-10-${dates[2]}T02:00`);await form.getByLabel('End',{exact:true}).fill(`2020-10-${dates[2]}T03:00`);await form.getByLabel('Reason',{exact:true}).fill('Malformed body fictional '+engine);
    const commands=[];await p.route('**/api/employee/time-corrections',async route=>{if(route.request().method()!=='POST')return route.continue();commands.push(route.request().postDataJSON());if(commands.length!==1)return route.continue();const result=await route.fetch();assert.equal(result.status(),202);return route.fulfill({status:202,contentType:'application/json',body:'{'});});
    await form.getByRole('button',{name:'Send request',exact:true}).click();await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).waitFor();await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await p.getByText('Updates paused',{exact:true}).waitFor();await p.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).waitFor();await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).click();await p.getByText('Correction request sent for manager review.',{exact:true}).waitFor();assert.deepEqual(commands[1],commands[0]);assert.equal(commands.length,2);assert.equal((await q('SELECT count(*)::int AS n FROM time_correction_requests WHERE id=$1',[commands[0].operationId]))[0].n,1);o({commandsIdentical:true,postCalls:2,logicalMutations:1});
   }finally{await c.close();}
  });

  for(const [scenario,currentAccount] of [['committed account switch','RV-E2'],['same-account new login session','RV-E1']]){
   await record(engine+' '+scenario+' rejects stale intent and clears late committed responses',async o=>{
    const c=await context();let release;
    try{
     await login(c,'RV-E1');const p=await page(c,'/app/my-time');await p.locator('main .employee-correction-center').getByRole('button',{name:'Request a correction',exact:true}).click();const form=p.locator('#employee-missing-time-correction');
     const day=scenario==='committed account switch'?(engine==='chromium'?'03':'13'):(engine==='chromium'?'04':'14');
     await form.getByLabel('Start',{exact:true}).fill(`2020-11-${day}T02:00`);await form.getByLabel('End',{exact:true}).fill(`2020-11-${day}T03:00`);await form.getByLabel('Reason',{exact:true}).fill('RV-E1 late private fictional reason '+engine+' '+scenario);
     let original,authority,committed=false;const barrier=new Promise(resolve=>{release=resolve;});
     await p.route('**/api/employee/time-corrections',async route=>{
      if(route.request().method()!=='POST')return route.continue();original=route.request().postDataJSON();authority=route.request().headers()['x-nevora-correction-authority'];
      const response=await route.fetch();assert.equal(response.status(),202);committed=true;await barrier;return route.fulfill({status:202,contentType:'application/json',body:'{'});
     });
     await form.getByRole('button',{name:'Send request',exact:true}).click();const deadline=Date.now()+15000;while(!committed){assert(Date.now()<deadline);await new Promise(resolve=>setTimeout(resolve,20));}
     await login(c,currentAccount);await p.bringToFront();await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.locator('main .employee-time-message').getByText('Your session ended',{exact:true}).waitFor();
     const settled=p.waitForResponse(r=>r.url().endsWith('/api/employee/time-corrections')&&r.request().method()==='POST');release();await settled;
     // Wait for the obsolete promise to settle; it must not resurrect shared recovery.
     await p.waitForTimeout(150);assert.equal(await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).count(),0);assert(!await p.locator('body').innerText().then(t=>t.includes('late private fictional reason')));
     const refused=await Promise.all([1,2].map(()=>c.request.post(app.url+'/api/employee/time-corrections',{headers:{...headers(),'X-Nevora-Correction-Authority':authority},data:original})));
     assert.deepEqual(refused.map(r=>r.status()),[403,403]);const rows=await q('SELECT employee_id FROM time_correction_requests WHERE id=$1',[original.operationId]);assert.deepEqual(rows,[{employee_id:'RV-E1'}]);
     await p.reload({waitUntil:'networkidle'});assert.equal(await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).count(),0);
     o({originalAccount:'RV-E1',currentAccount,staleConcurrentStatuses:[403,403],logicalRequests:1,lateReplyDiscarded:true,remountHasNoStaleRetry:true});
    }finally{release?.();await c.close();}
   });
  }
  await record(engine+' expired employee session refuses uncommitted recovery',async o=>{
   const c=await context();try{
    await login(c,'RV-E1');const p=await page(c,'/app/my-time');await p.locator('main .employee-correction-center').getByRole('button',{name:'Request a correction',exact:true}).click();const form=p.locator('#employee-missing-time-correction');const day=engine==='chromium'?'05':'15';
    await form.getByLabel('Start',{exact:true}).fill(`2020-11-${day}T02:00`);await form.getByLabel('End',{exact:true}).fill(`2020-11-${day}T03:00`);await form.getByLabel('Reason',{exact:true}).fill('Expired fictional intent '+engine);let command,authority;
    await p.route('**/api/employee/time-corrections',route=>{if(route.request().method()!=='POST')return route.continue();command=route.request().postDataJSON();authority=route.request().headers()['x-nevora-correction-authority'];return route.abort('failed');});
    await form.getByRole('button',{name:'Send request',exact:true}).click();await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).waitFor();
    await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='RV-E1'");await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.locator('main .employee-time-message').getByText('Your session ended',{exact:true}).waitFor();assert.equal(await p.locator('main .employee-correction-center').getByRole('button',{name:'Try again',exact:true}).count(),0);
    const response=await c.request.post(app.url+'/api/employee/time-corrections',{headers:{...headers(),'X-Nevora-Correction-Authority':authority},data:command});assert.equal(response.status(),401);assert.equal((await q('SELECT count(*)::int AS n FROM time_correction_requests WHERE id=$1',[command.operationId]))[0].n,0);
    o({status:401,logicalRequests:0,retryCleared:true});
   }finally{await c.close();}
  });

  await record(engine+' manager late committed review clears recovery on account replacement',async o=>{
   const e=await context();await login(e,'RV-E1');const day=engine==='chromium'?'03':'13';
   const createdResponse=await boundCorrectionPost(e.request,app.url+'/api/employee/time-corrections',{headers:headers(),data:{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:`2020-12-${day}T08:00:00Z`,proposedEndAt:`2020-12-${day}T09:00:00Z`,reason:'Late manager commit '+engine}});assert.equal(createdResponse.status(),202);const created=await createdResponse.json();await e.close();
   const c=await context();let release;try{
    await login(c,'RV-M1');const p=await page(c,'/app?view=attendance');let command,authority,committed=false,documentReplaced=false,replyOutcome,replyFailure=false,originalRequest,finishReply;const barrier=new Promise(resolve=>{release=resolve;}),replyDone=new Promise(resolve=>{finishReply=resolve;});
    await p.route('**/api/manager/time-corrections',async route=>{
     if(route.request().method()!=='POST')return route.continue();
     try{originalRequest=route.request();command=originalRequest.postDataJSON();authority=originalRequest.headers()['x-nevora-correction-authority'];const r=await route.fetch();assert.equal(r.status(),200);committed=true;await barrier;replyOutcome=await fulfillHeldResponse(route,{status:200,contentType:'application/json',body:'{'},documentReplaced);}
     catch{replyFailure=true;}finally{finishReply();}
    });
    const originalRow=p.locator('.manager-correction-row').filter({hasText:'Late manager commit '+engine});
    const sourceDocument=await p.evaluate(()=>performance.timeOrigin);
    await originalRow.getByRole('button',{name:'Approve correction for RV-E1 Fictional',exact:true}).click();const deadline=Date.now()+15000;while(!committed&&!replyFailure){assert(Date.now()<deadline);await new Promise(resolve=>setTimeout(resolve,20));}assert.equal(replyFailure,false);
    await login(c,'RV-M2');await p.bringToFront();await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
    const currentResponse=await c.request.get(app.url+'/api/manager/time-corrections',{headers:{...headers(),'X-Nevora-Actor':'RV-M2'}});assert.equal(currentResponse.status(),200);const current=await currentResponse.json();assert.equal(current.state,'ready');assert.match(current.authority,/^[a-f0-9]{64}$/);assert.notEqual(current.authority,authority);
    await originalRow.waitFor({state:'detached'});documentReplaced=await p.evaluate(()=>performance.timeOrigin)!==sourceDocument;
    assert.equal(await originalRow.count(),0);assert.equal(await p.getByRole('button',{name:'Retry same decision',exact:true}).count(),0);
    release();let replyTimeout;try{await Promise.race([replyDone,new Promise((_,reject)=>{replyTimeout=setTimeout(()=>reject(Error('Held committed reply did not settle')),12000);})]);}finally{clearTimeout(replyTimeout);}assert.equal(replyFailure,false);assert(['fulfilled','document-left','request-aborted'].includes(replyOutcome));if(replyOutcome!=='fulfilled')assert(originalRequest.failure());await p.waitForTimeout(150);assert.equal(await p.getByRole('button',{name:'Retry same decision',exact:true}).count(),0);
    assert.equal((await c.request.post(app.url+'/api/manager/time-corrections',{headers:{...headers(),'X-Nevora-Correction-Authority':authority},data:command})).status(),403);
    assert.deepEqual(await q("SELECT actor_employee_id FROM time_correction_events WHERE request_id=$1 AND event_kind='APPROVED'",[created.requestId]),[{actor_employee_id:'RV-M1'}]);await p.waitForLoadState('networkidle');assert.equal(await p.locator('.premium-error,.app-error-screen').count(),0);
    o({lateReplyDiscarded:true,currentActorBound:true,oldRowClearedBeforeLateReply:true,replyOutcome,staleRetryStatus:403,approvedEvents:1,approvedActor:'RV-M1'});
   }finally{release?.();await c.close();}
  });
  await browser.close();browser=null;
 }
}finally{if(browser)await browser.close();if(app)await app.close();await writeFile(dir+'/report.json',JSON.stringify({checkpoint,tree,sourceClean,results,consoleErrors,runtimeErrors},null,2));}
if(results.some(r=>r.result==='FAIL')||runtimeErrors.length)process.exitCode=1;console.log(JSON.stringify({checks:results.length,failures:results.filter(r=>r.result==='FAIL').map(r=>r.name),runtimeErrors},null,2));
