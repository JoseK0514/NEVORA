import {boundCorrectionPost} from './phase-d-correction-http-fixture.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {Temporal} from '@js-temporal/polyfill';
import {EMPLOYEE_DESKTOP_VIEWPORT} from './phase-d2-phone-hours-geometry.mjs';
import {MISSED_SHIFT_PATH,accessChanged,checkSubmission,clockText,correctionPayload,fillMissedShiftForm,fixForm,hoursPage,hoursPaused,isCorrectionAction,recordedReceipt,sendFix,whatToFix} from './employee-fix-time-browser.mjs';

const WIDTHS=[320,375,390,430,768,1024,1440];
// Corporate Time (Release 1): a recorded day is fixed on its Fix my time sheet (edit=entry:<id>); its breaks are choices
// under "What to fix"; a missed shift is "Fix a missed punch" (edit=new). The sheet sends through the
// saveEmployeeHoursCorrection Server Action and, while an original outcome is unconfirmed, offers only "Check submission
// status", which resends that exact operation.
const ENTRY_FIX='/app/my-time?view=corrections&edit='+encodeURIComponent('entry:d2-browser-entry');

/** Real authenticated commands with deliberately lost delivery; owned fictional data only. */
export async function verifyCorrectionRecovery({browser,engine,app,q,context,login,checked,report,evidence,geometry}){
 const observations=report.recovery??={cases:[],consoleErrors:[],runtimeErrors:[]};
 const headers={'X-Nevora-Time-Correction':'1','Content-Type':'application/json',Origin:app.url};
 const [entry]=await q('SELECT clock_in_at::text AS start,clock_out_at::text AS finish FROM time_entries WHERE id=$1',['d2-browser-entry']);
 const local=at=>Temporal.Instant.from(at).toZonedDateTimeISO('America/Puerto_Rico').toPlainDateTime().toString().slice(0,16);
 const entryCommand=()=>({operationId:randomUUID(),kind:'ENTRY_BOUNDARY',timeEntryId:'d2-browser-entry',proposedStartAt:Temporal.Instant.from(entry.start).add({minutes:5}).toString(),proposedEndAt:Temporal.Instant.from(entry.finish).subtract({minutes:5}).toString(),reason:'Fictional response recovery regression.'});
 const watch=page=>{page.on('pageerror',error=>observations.runtimeErrors.push(String(error)));page.on('console',message=>{if(message.type()==='error')observations.consoleErrors.push(message.text());});};
 const decide=async(c,id,decision='REJECT')=>{
  const response=await boundCorrectionPost(c.request,app.url+'/api/manager/time-corrections',{headers,data:{operationId:randomUUID(),requestId:id,expectedRevision:1,decision}});
  assert.equal(response.status(),200);return response.json();
 };
 const owner=await context(browser);await login(owner,'QAOWNER');
 try{
  for(const kind of ['ENTRY_BOUNDARY','BREAK_BOUNDARY','MISSING_ENTRY'])for(const loss of ['before','after']){
   const c=await context(browser,EMPLOYEE_DESKTOP_VIEWPORT);await login(c,'D2-E',{reuseSession:true});
   let releaseDelivery=()=>{};
   try{
    const page=await c.newPage();page.setDefaultTimeout(15000);watch(page);
    const note='Fictional uncertain '+kind+' '+loss+' command.';
    if(kind==='MISSING_ENTRY'){
     await page.goto(app.url+MISSED_SHIFT_PATH,{waitUntil:'networkidle'});await page.bringToFront();
     const start=local(Temporal.Instant.from(entry.start).subtract({hours:3}).toString()),end=local(Temporal.Instant.from(entry.start).subtract({hours:2}).toString());
     await fillMissedShiftForm(page,{date:start.slice(0,10),start:clockText(start),end:clockText(end),note});
    }else{
     await page.goto(app.url+ENTRY_FIX,{waitUntil:'networkidle'});await page.bringToFront();await fixForm(page).waitFor();
     if(kind==='BREAK_BOUNDARY'){await whatToFix(page,'Break').click();await page.waitForURL(url=>url.searchParams.get('edit')?.startsWith('break:d2-browser-entry:'));await fixForm(page).waitFor();}
     await fixForm(page).getByLabel('Note (required)',{exact:true}).fill(note);
    }
    const commands=[];
    let confirmCommit;
    const committedBeforeDelivery=new Promise(resolve=>{confirmCommit=resolve;});
    const deliveryHeld=new Promise(resolve=>{releaseDelivery=resolve;});
    await page.route('**/app/my-time**',async route=>{
     if(!isCorrectionAction(route.request()))return route.continue();
     commands.push({body:route.request().postData(),payload:correctionPayload(route.request())});
     if(commands.length!==1)return route.continue();
     if(loss==='after'){
      const committed=await route.fetch();assert.equal(committed.status(),200);
      confirmCommit();await deliveryHeld;
     }
     await route.abort('failed');
    });
    await sendFix(page).click();
    if(loss==='after'){
     await committedBeforeDelivery;
     // Clear the real private reader while the first send is still unresolved.
     await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
     await hoursPaused(page).waitFor();assert.equal(await fixForm(page).count(),0);
     await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
     await page.getByRole('heading',{name:'Checking your request…',exact:true}).waitFor();
     releaseDelivery();
     checked(`${engine}: ${kind} in-flight private pause preserves the command before response classification`);
    }
    await page.getByRole('heading',{name:'Check your earlier request',exact:true}).waitFor();
    assert.equal(await checkSubmission(page).count(),1);
    assert.equal(await sendFix(page).count(),0,'No new send while the original outcome is unconfirmed');
    // The inherited private reader really clears/unmounts its children on pause.
    await c.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await hoursPaused(page).waitFor();
    assert.equal(await checkSubmission(page).count(),0);
    await c.setOffline(false);await page.evaluate(()=>{window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
    const retry=checkSubmission(page);await retry.waitFor();
    if(kind==='ENTRY_BOUNDARY'&&loss==='after'){
     // The private view re-checks when its short validity window ends and remounts; the uncertain command survives it.
     for(const width of WIDTHS){
      await page.setViewportSize({width,height:width<=430?844:1000});
      await retry.waitFor();
      await geometry(page,'.c-hours','employee uncertain request',engine,width);
      const shot=join(evidence,`${engine}-employee-recovery-${width}.png`);await page.screenshot({path:shot});report.screenshots.push(shot);
     }
     await page.setViewportSize(EMPLOYEE_DESKTOP_VIEWPORT);
    }
    await retry.waitFor();await retry.focus();
    const native=await retry.evaluate(e=>({documentFocused:document.hasFocus(),buttonFocused:document.activeElement===e,enabled:!e.disabled&&e.getAttribute('aria-disabled')!=='true'}));
    observations.nativeRetries??=[];const receipt={engine,kind,loss,...native,postCallsBefore:commands.length};observations.nativeRetries.push(receipt);
    assert(native.documentFocused&&native.buttonFocused&&native.enabled,'Native retry must have foreground focus and be enabled');
    await page.keyboard.press('Enter');
    await recordedReceipt(page).waitFor();receipt.postCallsAfter=commands.length;
    const operationId=commands[0].payload.command.operationId;
    assert.equal(commands.length,2);assert.equal(commands[1].body,commands[0].body);
    assert.deepEqual(await q('SELECT count(*)::int AS count FROM time_correction_requests WHERE id=$1',[operationId]),[{count:1}]);
    await decide(owner,operationId);
    observations.cases.push({engine,role:'Employee',kind,loss,operationId,postCalls:commands.length,sameCommand:true,pausedSnapshotCleared:true,pausedBeforeDeliverySettled:loss==='after'});
    checked(`${engine}: ${kind} ${loss}-commit response loss recovers same operation after private pause`);
   }finally{releaseDelivery();await c.close();}
  }

  for(const decision of ['APPROVE','REJECT'])for(const loss of ['before','after','malformed','unknown']){
   const employee=await context(browser);await login(employee,'D2-E',{reuseSession:true});
   const submitted=await boundCorrectionPost(employee.request,app.url+'/api/employee/time-corrections',{headers,data:entryCommand()});
   assert.equal(submitted.status(),202);const pending=await submitted.json();await employee.close();
   const c=await context(browser,{width:390,height:844});await login(c,'QAOWNER',{reuseSession:true});
   try{
    const page=await c.newPage();page.setDefaultTimeout(15000);watch(page);
    const attendanceNavigation=await page.goto(app.url+'/app?view=attendance#review',{waitUntil:'domcontentloaded'});assert(attendanceNavigation?.ok());await page.bringToFront();
    const commands=[];
    await page.route('**/api/manager/time-corrections',async route=>{
     if(route.request().method()!=='POST')return route.continue();
     commands.push(route.request().postDataJSON());
     if(commands.length!==1)return route.continue();
     if(loss!=='before'){const committed=await route.fetch();assert.equal(committed.status(),200);}
     if(loss==='malformed')return route.fulfill({status:200,contentType:'application/json',body:'{'});
     if(loss==='unknown')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({state:'outcome_unknown',operationId:commands[0].operationId})});
     await route.abort('failed');
    });
    await page.getByRole('button',{name:`${decision==='APPROVE'?'Approve':'Decline'} correction for Avery Correction QA`,exact:true}).click();
    // B7 wording (NV-020): the unknown-outcome notice is plain language now.
    await page.getByText('We couldn’t confirm your decision. Try again; it won’t be applied twice.',{exact:true}).waitFor();
    await c.setOffline(true);
    await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.getByRole('heading',{name:'View paused',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Retry same decision',exact:true}).count(),0);assert.equal(await page.locator('.manager-correction-row').count(),0);
    await c.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
    const ready=await c.request.get(app.url+'/api/manager/time-corrections',{headers});
    assert.equal((await ready.json()).requests.some(item=>item.id===pending.requestId),loss==='before');
    if(loss!=='before')await page.getByRole('button',{name:'Approve correction for Avery Correction QA',exact:true}).waitFor({state:'detached'});
    const retry=page.getByRole('button',{name:'Retry same decision',exact:true});await retry.waitFor();
    // UX-04 keeps retry disabled until this tab has a current authorized snapshot.
    // The separate API inspection above does not establish the browser's authority.
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Retry same decision'&&!button.disabled));
    assert.equal(await retry.isEnabled(),true);
    if(decision==='APPROVE'&&loss==='after')for(const width of [320,375,390,430,768,1024,1440]){
     await page.setViewportSize({width,height:width<=430?844:1000});await geometry(page,'.manager-corrections','manager uncertain decision',engine,width);
     const shot=join(evidence,`${engine}-manager-recovery-${width}.png`);await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
    }
    // Retry is disabled whenever the queue is not ready (manager-time-corrections: mode!=='ready'), for example while
    // its snapshot renews; the seven screenshots above take over 10 s in WebKit and can overlap that. Press it only
    // once it is enabled again, as UX-04 requires.
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent==='Retry same decision'&&!button.disabled));
    await retry.focus();await page.keyboard.press('Enter');
    await page.getByText(decision==='APPROVE'?'Correction approved. The original recorded punch remains unchanged.':'Correction declined. The original recorded punch remains unchanged.',{exact:true}).waitFor();
    assert.equal(commands.length,2);assert.deepEqual(commands[1],commands[0]);
    assert.deepEqual(await q("SELECT count(*)::int AS count FROM time_correction_events WHERE request_id=$1 AND event_kind IN ('APPROVED','REJECTED')",[pending.requestId]),[{count:1}]);
    assert.deepEqual(await q('SELECT count(*)::int AS count FROM time_correction_adjustments WHERE request_id=$1',[pending.requestId]),[{count:decision==='APPROVE'?1:0}]);
    observations.cases.push({engine,role:'Manager',decision,loss,operationId:commands[0].operationId,postCalls:commands.length,sameCommand:true,queueRowPresent:loss==='before'});
    checked(`${engine}: ${decision} ${loss} delivery recovers same operation independent of queue row`);
   }finally{await c.close();}
  }

  const employee=await context(browser);await login(employee,'D2-E');
  const submitted=await boundCorrectionPost(employee.request,app.url+'/api/employee/time-corrections',{headers,data:entryCommand()});
  assert.equal(submitted.status(),202);const pending=await submitted.json();await employee.close();
  const manager=await context(browser);await login(manager,'QAOWNER');
  try{
   const page=await manager.newPage();page.setDefaultTimeout(15000);watch(page);
   await page.goto(app.url+'/app?view=attendance#review',{waitUntil:'networkidle'});await page.bringToFront();
   await page.route('**/api/manager/time-corrections',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());
   await page.getByRole('button',{name:'Approve correction for Avery Correction QA',exact:true}).click();
   await page.getByRole('button',{name:'Retry same decision',exact:true}).waitFor();
   await q("UPDATE employees SET role='LEAD' WHERE id='QAOWNER'");
   await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
   await page.locator('.manager-corrections').waitFor({state:'detached'});
   assert.equal(await page.getByRole('button',{name:'Retry same decision',exact:true}).count(),0);
   assert.equal((await manager.request.get(app.url+'/api/manager/time-corrections',{headers})).status(),403);
   checked(`${engine}: current Manager authority loss clears uncertain recovery`);
  }finally{
   await q("UPDATE employees SET role='OWNER' WHERE id='QAOWNER'");await manager.close();
   await decide(owner,pending.requestId);
  }

  // Real sign-out/sign-in unmounts the page-scoped command memory.
  const c=await context(browser,EMPLOYEE_DESKTOP_VIEWPORT);await login(c,'D2-E');
  try{
   const page=await c.newPage();page.setDefaultTimeout(15000);watch(page);
   await page.goto(app.url+ENTRY_FIX,{waitUntil:'networkidle'});await page.bringToFront();
   await fixForm(page).getByLabel('Note (required)',{exact:true}).fill('Fictional logout recovery boundary.');
   await page.route('**/app/my-time**',route=>isCorrectionAction(route.request())?route.abort('failed'):route.continue());
   await sendFix(page).click();
   await checkSubmission(page).waitFor();
   // An Employee signs out from More (Release 1).
   await page.goto(app.url+'/app/more',{waitUntil:'networkidle'});
   await Promise.all([page.waitForURL(url=>url.pathname==='/login',{waitUntil:'commit'}),page.locator('main').getByRole('button',{name:'Sign out',exact:true}).click()]);
   await login(c,'QAOWNER');await page.goto(app.url+'/app?view=attendance#review',{waitUntil:'networkidle'});
   assert.equal(await checkSubmission(page).count(),0);
   await login(c,'D2-E');await page.goto(app.url+ENTRY_FIX,{waitUntil:'networkidle'});
   await fixForm(page).waitFor();
   assert.equal(await checkSubmission(page).count(),0);
   checked(`${engine}: sign-out/account-switch/sign-in clears uncertain Employee command memory`);
  }finally{await c.close();}

  const denied=await context(browser,EMPLOYEE_DESKTOP_VIEWPORT);await login(denied,'D2-E');
  try{
   const page=await denied.newPage();page.setDefaultTimeout(15000);watch(page);
   await page.goto(app.url+ENTRY_FIX,{waitUntil:'networkidle'});await page.bringToFront();
   await fixForm(page).getByLabel('Note (required)',{exact:true}).fill('Fictional current authority-loss regression.');
   await page.route('**/app/my-time**',route=>isCorrectionAction(route.request())?route.abort('failed'):route.continue());
   await sendFix(page).click();
   await checkSubmission(page).waitFor();
   await q("UPDATE employees SET active=false WHERE id='D2-E'");
   await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
   await accessChanged(page).waitFor();
   assert.equal(await checkSubmission(page).count(),0);
   await q("UPDATE employees SET active=true WHERE id='D2-E'");
   await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
   await hoursPage(page,'corrections').waitFor();
   assert.equal(await checkSubmission(page).count(),0);
   checked(`${engine}: current Employee authority denial clears uncertain recovery before re-entry`);
  }finally{await q("UPDATE employees SET active=true WHERE id='D2-E'");await denied.close();}
  assert.deepEqual(observations.runtimeErrors,[]);
 }finally{await owner.close();}
}
