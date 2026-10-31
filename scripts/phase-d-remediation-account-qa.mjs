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
import {EMPLOYEE_DESKTOP_VIEWPORT} from './phase-d2-phone-hours-geometry.mjs';
import {MISSED_SHIFT_PATH,accessChanged,businessDay,checkSubmission,correctionPayload,fillMissedShiftForm,fixForm,hoursPaused,isCorrectionAction,recordedReceipt,sendFix} from './employee-fix-time-browser.mjs';
const pw=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),sourceClean=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()==='';
if(process.env.PHASE_D_EXPECTED_SHA){assert.equal(checkpoint,process.env.PHASE_D_EXPECTED_SHA);assert(sourceClean);}
const dir=resolve(process.env.PHASE_D_REMEDIATION_EVIDENCE_DIR+'/account');
await mkdir(dir,{recursive:true});const results=[],consoleErrors=[],runtimeErrors=[];let app,browser,activeCase='setup';
const q=(text,values=[])=>app.database.executor.query({text,values});
const headers=()=>({'X-Nevora-Time-Correction':'1',Origin:app.url,'Content-Type':'application/json'});
const local=instant=>Temporal.Instant.from(instant).toZonedDateTimeISO('America/Puerto_Rico').toPlainDateTime().toString().slice(0,16);
async function record(name,fn){activeCase=name;let observations={};try{await fn(v=>Object.assign(observations,v));results.push({name,result:'PASS',observations});}catch(e){results.push({name,result:'FAIL',observations,error:String(e.stack??e)});}await writeFile(dir+'/report.json',JSON.stringify({checkpoint,tree,sourceClean,results,consoleErrors,runtimeErrors},null,2));console.log(name+': '+results.at(-1).result);}
// Managers stay on the 390px phone. Employees use corporate Time (Release 1) at 768px: "Fix a missed punch" opens the Fix my
// time sheet, which sends through the saveEmployeeHoursCorrection Server Action and keeps one exact-operation recovery
// ("Check submission status") while the outcome is unconfirmed. Its Day field offers the last 31 days, so these
// browser-driven missed shifts use recent business dates.
async function context(viewport={width:390,height:844}){const c=await browser.newContext({viewport,serviceWorkers:'block'});await c.route('**/*',route=>{const u=new URL(route.request().url());return ['http:','https:'].includes(u.protocol)&&u.origin!==app.url?route.abort('blockedbyclient'):route.continue();});return c;}
async function login(c,id){const p=await c.newPage();p.setDefaultTimeout(12000);await p.goto(app.url+'/login');await p.getByLabel('Employee ID',{exact:true}).fill(id);await p.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await Promise.all([p.waitForURL(u=>u.pathname==='/app'),p.getByRole('button',{name:'Sign in',exact:true}).click()]);await p.waitForLoadState('networkidle');await p.close();}
async function page(c,path){const p=await c.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>runtimeErrors.push({case:activeCase,message:String(e).replaceAll(app.url,'[owned-origin]'),stack:e.stack?.replaceAll(app.url,'[owned-origin]')}));p.on('console',m=>{if(m.type()==='error')consoleErrors.push({case:activeCase,message:m.text().replaceAll(app.url,'[owned-origin]')});});const response=await p.goto(app.url+path,{waitUntil:'domcontentloaded'});assert(response?.ok());await p.bringToFront();return p;}
// Replays a captured correction Server Action from the same browser context (whatever session its cookies now hold).
async function replayAction(c,captured){const response=await c.request.post(app.url+MISSED_SHIFT_PATH,{headers:{'next-action':captured.headers['next-action'],'content-type':captured.headers['content-type'],accept:'text/x-component',origin:app.url},data:captured.body,maxRedirects:0});const text=await response.text();return {status:response.status(),recorded:/"status":"recorded"/.test(text),denied:/"status":"denied"/.test(text)};}
async function settleReply(release,done){release();let timer;try{await Promise.race([done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Held committed reply did not settle')),12000);})]);}finally{clearTimeout(timer);}}
try{
 for(const engine of ['chromium','webkit']){
 app=await createOwnedNextApp(dir);await seedOwnedApp(app.database.executor);const ph=await hashPassword(TEST_PASSWORD);
 for(const [id,role] of [['RV-E1','EMPLOYEE'],['RV-E2','EMPLOYEE'],['RV-M1','MANAGER'],['RV-M2','MANAGER']]){await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$1,'Fictional','555-0444',$2,'loc-1')",[id,role]);await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[id,ph]);await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);}
 for(const id of ['RV-M1','RV-M2'])await assignOwnedManagerCompanyAccess(app.database.executor,id);
  browser=await pw[engine].launch({headless:true});const dates=engine==='chromium'?['07','08','09']:['17','18','19'];
  // Each engine has its own fresh application, so the recent missed-shift days repeat per engine.
  const days={switch:businessDay(2),malformed:businessDay(3),committed:businessDay(4),session:businessDay(5),expired:businessDay(6)};
  await record(engine+' employee cross-tab account switch clears uncertain missing command',async o=>{
   const c=await context(EMPLOYEE_DESKTOP_VIEWPORT);try{
    await login(c,'RV-E1');const p=await page(c,MISSED_SHIFT_PATH);
    await fillMissedShiftForm(p,{date:days.switch,start:'2am',end:'3am',note:'RV-E1 private fictional reason '+engine});
    const commands=[];await p.route('**/app/my-time**',route=>{if(!isCorrectionAction(route.request()))return route.continue();commands.push({body:route.request().postData(),payload:correctionPayload(route.request())});return commands.length===1?route.abort('failed'):route.continue();});
    await sendFix(p).click();await checkSubmission(p).waitFor();
    const operationId=commands[0].payload.command.operationId;const preCount=(await q('SELECT count(*)::int AS n FROM time_correction_requests WHERE id=$1',[operationId]))[0].n;assert.equal(preCount,0);
    await login(c,'RV-E2');await p.bringToFront();await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await accessChanged(p).waitFor();
    const retryCount=await checkSubmission(p).count();
    await p.screenshot({path:dir+'/'+engine+'-employee-account-switch.png',fullPage:true,caret:'initial'});
    o({beforeCommit:true,originalAccount:'RV-E1',currentAccount:'RV-E2',retryCount,formAfterSwitch:await fixForm(p).count(),commandsBeforeRetry:commands.map(command=>command.payload),originalRequestCount:preCount});
    if(retryCount){await checkSubmission(p).click();await recordedReceipt(p).waitFor();o({replayedCommand:commands[1]?.payload,sameCommand:commands[1]?.body===commands[0].body,persisted:await q('SELECT id::text,employee_id,reason FROM time_correction_requests WHERE id=$1',[operationId])});}
    assert.equal(retryCount,0,'Recovery must be cleared when the authenticated account changes in another tab');
    assert.equal(await fixForm(p).count(),0,'The original account\'s unsent sheet is not shown to the new account');
   }finally{await c.close();}
  });
  await record(engine+' Manager cross-tab account switch clears uncertain review command',async o=>{
   const e=await context();await login(e,'RV-E1');const create=await e.request.post(app.url+'/api/employee/time-corrections',{headers:{...headers(),'X-Nevora-Correction-Authority':(await (await e.request.get(app.url+'/api/employee/time-corrections',{headers:headers()})).json()).authority},data:{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:`2020-10-${dates[1]}T08:00:00Z`,proposedEndAt:`2020-10-${dates[1]}T09:00:00Z`,reason:'Manager account-switch fictional fixture '+engine}});assert.equal(create.status(),202);const created=await create.json();await e.close();
   const c=await context();try{
    await login(c,'RV-M1');const p=await page(c,'/app?view=attendance#review');const commands=[];
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
   const c=await context(EMPLOYEE_DESKTOP_VIEWPORT);try{
    await login(c,'RV-E1');const p=await page(c,MISSED_SHIFT_PATH);await fillMissedShiftForm(p,{date:days.malformed,start:'2am',end:'3am',note:'Malformed body fictional '+engine});
    // The first send commits on the server; its reply is replaced with an unreadable body.
    const commands=[];await p.route('**/app/my-time**',async route=>{if(!isCorrectionAction(route.request()))return route.continue();commands.push({body:route.request().postData(),payload:correctionPayload(route.request())});if(commands.length!==1)return route.continue();const result=await route.fetch();assert.equal(result.status(),200);return route.fulfill({status:200,contentType:'application/json',body:'{'});});
    await sendFix(p).click();await checkSubmission(p).waitFor();assert.equal((await q('SELECT count(*)::int AS n FROM time_correction_requests WHERE id=$1',[commands[0].payload.command.operationId]))[0].n,1,'The first send committed');
    await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await hoursPaused(p).waitFor();assert.equal(await checkSubmission(p).count(),0);
    await p.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await checkSubmission(p).waitFor();await checkSubmission(p).click();await recordedReceipt(p).waitFor();
    assert.equal(commands.length,2);assert.equal(commands[1].body,commands[0].body,'The retry resends the exact original operation');assert.equal((await q('SELECT count(*)::int AS n FROM time_correction_requests WHERE id=$1',[commands[0].payload.command.operationId]))[0].n,1);o({commandsIdentical:true,postCalls:2,logicalMutations:1});
   }finally{await c.close();}
  });

  for(const [scenario,currentAccount] of [['committed account switch','RV-E2'],['same-account new login session','RV-E1']]){
   await record(engine+' '+scenario+' rejects stale intent and clears late committed responses',async o=>{
    const c=await context(EMPLOYEE_DESKTOP_VIEWPORT);let release;
    try{
     await login(c,'RV-E1');const p=await page(c,MISSED_SHIFT_PATH);
     const day=scenario==='committed account switch'?days.committed:days.session,ownBefore=(await q("SELECT count(*)::int AS n FROM time_correction_requests WHERE employee_id='RV-E1'"))[0].n;
     await fillMissedShiftForm(p,{date:day,start:'2am',end:'3am',note:'RV-E1 late private fictional reason '+engine+' '+scenario});
     let original,originalRequest,committed=false,replyFailure=false,replyOutcome,finishReply;const barrier=new Promise(resolve=>{release=resolve;}),replyDone=new Promise(resolve=>{finishReply=resolve;});
     await p.route('**/app/my-time**',async route=>{
      if(!isCorrectionAction(route.request()))return route.continue();
      try{originalRequest=route.request();original={headers:originalRequest.headers(),body:originalRequest.postData(),payload:correctionPayload(originalRequest)};const response=await route.fetch();assert.equal(response.status(),200);committed=true;await barrier;replyOutcome=await fulfillHeldResponse(route,{status:200,contentType:'application/json',body:'{'},false);}
      catch{replyFailure=true;}finally{finishReply();}
     });
     await sendFix(p).click();const deadline=Date.now()+15000;while(!committed&&!replyFailure){assert(Date.now()<deadline);await new Promise(resolve=>setTimeout(resolve,20));}assert.equal(replyFailure,false);
     await login(c,currentAccount);await p.bringToFront();await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await accessChanged(p).waitFor();
     await settleReply(release,replyDone);assert.equal(replyFailure,false);assert(['fulfilled','request-aborted'].includes(replyOutcome));if(replyOutcome!=='fulfilled')assert(originalRequest.failure());
     // Wait for the obsolete promise to settle; it must not resurrect shared recovery.
     await p.waitForTimeout(150);assert.equal(await checkSubmission(p).count(),0);assert.equal(await fixForm(p).count(),0);assert(!await p.locator('body').innerText().then(t=>t.includes('late private fictional reason')));
     // The stale intent replayed from this browser, now holding the newer session: it never creates or re-attributes a
     // request. (The Server Action binds the sender to the current session and the sheet's source basis; the original
     // operation stays the one committed RV-E1 request.)
     const replies=[];for(const attempt of [1,2])replies.push(await replayAction(c,original));
     if(currentAccount!=='RV-E1')assert(replies.every(reply=>!reply.recorded),'Another account cannot claim the stale operation');
     const rows=await q('SELECT employee_id FROM time_correction_requests WHERE id=$1',[original.payload.command.operationId]);assert.deepEqual(rows,[{employee_id:'RV-E1'}]);
     assert.equal((await q("SELECT count(*)::int AS n FROM time_correction_requests WHERE employee_id='RV-E1'"))[0].n,ownBefore+1,'One logical request');assert.equal((await q("SELECT count(*)::int AS n FROM time_correction_requests WHERE employee_id='RV-E2'"))[0].n,0);
     await p.reload({waitUntil:'networkidle'});assert.equal(await checkSubmission(p).count(),0);
     o({originalAccount:'RV-E1',currentAccount,staleReplays:replies,logicalRequests:1,lateReplyDiscarded:true,replyOutcome,remountHasNoStaleRetry:true});
    }finally{release?.();await c.close();}
   });
  }
  await record(engine+' expired employee session refuses uncommitted recovery',async o=>{
   const c=await context(EMPLOYEE_DESKTOP_VIEWPORT);try{
    await login(c,'RV-E1');const p=await page(c,MISSED_SHIFT_PATH);await fillMissedShiftForm(p,{date:days.expired,start:'2am',end:'3am',note:'Expired fictional intent '+engine});let captured;
    await p.route('**/app/my-time**',route=>{if(!isCorrectionAction(route.request()))return route.continue();captured={headers:route.request().headers(),body:route.request().postData(),payload:correctionPayload(route.request())};return route.abort('failed');});
    await sendFix(p).click();await checkSubmission(p).waitFor();
    await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='RV-E1'");await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await accessChanged(p).waitFor();assert.equal(await checkSubmission(p).count(),0);
    const reply=await replayAction(c,captured);assert.equal(reply.recorded,false);assert.equal((await q('SELECT count(*)::int AS n FROM time_correction_requests WHERE id=$1',[captured.payload.command.operationId]))[0].n,0);
    o({expiredReplay:reply,logicalRequests:0,retryCleared:true});
   }finally{await c.close();}
  });

  await record(engine+' manager late committed review clears recovery on account replacement',async o=>{
   const e=await context();await login(e,'RV-E1');const day=engine==='chromium'?'03':'13';
   const createdResponse=await boundCorrectionPost(e.request,app.url+'/api/employee/time-corrections',{headers:headers(),data:{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:`2020-12-${day}T08:00:00Z`,proposedEndAt:`2020-12-${day}T09:00:00Z`,reason:'Late manager commit '+engine}});assert.equal(createdResponse.status(),202);const created=await createdResponse.json();await e.close();
   const c=await context();let release;try{
    await login(c,'RV-M1');const p=await page(c,'/app?view=attendance#review');let command,authority,committed=false,originalRequest,replyOutcome,replyFailure=false,documentReplaced=false,finishReply;const barrier=new Promise(resolve=>{release=resolve;}),replyDone=new Promise(resolve=>{finishReply=resolve;});
    await p.route('**/api/manager/time-corrections',async route=>{if(route.request().method()!=='POST')return route.continue();try{originalRequest=route.request();command=originalRequest.postDataJSON();authority=originalRequest.headers()['x-nevora-correction-authority'];const r=await route.fetch();assert.equal(r.status(),200);committed=true;await barrier;replyOutcome=await fulfillHeldResponse(route,{status:200,contentType:'application/json',body:'{'},documentReplaced);}catch{replyFailure=true;}finally{finishReply();}});
    const originalRow=p.locator('.manager-correction-row').filter({hasText:'Late manager commit '+engine});
    const sourceDocument=await p.evaluate(()=>performance.timeOrigin);
    await originalRow.getByRole('button',{name:'Approve correction for RV-E1 Fictional',exact:true}).click();const deadline=Date.now()+15000;while(!committed&&!replyFailure){assert(Date.now()<deadline);await new Promise(resolve=>setTimeout(resolve,20));}assert.equal(replyFailure,false);
    await login(c,'RV-M2');await p.bringToFront();await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
    const currentResponse=await c.request.get(app.url+'/api/manager/time-corrections',{headers:{...headers(),'X-Nevora-Actor':'RV-M2'}});assert.equal(currentResponse.status(),200);const current=await currentResponse.json();assert.equal(current.state,'ready');assert.match(current.authority,/^[a-f0-9]{64}$/);assert.notEqual(current.authority,authority);
    await originalRow.waitFor({state:'detached'});documentReplaced=await p.evaluate(()=>performance.timeOrigin)!==sourceDocument;
    assert.equal(await originalRow.count(),0);assert.equal(await p.getByRole('button',{name:'Retry same decision',exact:true}).count(),0);
    await settleReply(release,replyDone);assert.equal(replyFailure,false);assert(['fulfilled','document-left','request-aborted'].includes(replyOutcome));if(replyOutcome!=='fulfilled')assert(originalRequest.failure());await p.waitForTimeout(150);assert.equal(await p.getByRole('button',{name:'Retry same decision',exact:true}).count(),0);
    assert.equal((await c.request.post(app.url+'/api/manager/time-corrections',{headers:{...headers(),'X-Nevora-Correction-Authority':authority},data:command})).status(),403);
    assert.deepEqual(await q("SELECT actor_employee_id FROM time_correction_events WHERE request_id=$1 AND event_kind='APPROVED'",[created.requestId]),[{actor_employee_id:'RV-M1'}]);
    await p.waitForLoadState('networkidle');assert.equal(await p.locator('.premium-error,.app-error-screen').count(),0);o({lateReplyDiscarded:true,currentActorBound:true,oldRowClearedBeforeLateReply:true,replyOutcome,staleRetryStatus:403,approvedEvents:1,approvedActor:'RV-M1'});
   }finally{release?.();await c.close();}
  });
  await browser.close();browser=null;
  await app.close();app=null;
 }
}finally{if(browser)await browser.close();if(app)await app.close();await writeFile(dir+'/report.json',JSON.stringify({checkpoint,tree,sourceClean,results,consoleErrors,runtimeErrors},null,2));}
if(results.some(r=>r.result==='FAIL')||runtimeErrors.length)process.exitCode=1;console.log(JSON.stringify({checks:results.length,failures:results.filter(r=>r.result==='FAIL').map(r=>r.name),runtimeErrors},null,2));
