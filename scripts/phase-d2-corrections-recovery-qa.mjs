import {boundCorrectionPost} from './phase-d-correction-http-fixture.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {Temporal} from '@js-temporal/polyfill';

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
   const c=await context(browser,{width:390,height:844});await login(c,'D2-E');
   let releaseDelivery=()=>{};
   try{
    const page=await c.newPage();page.setDefaultTimeout(15000);watch(page);
    await page.goto(app.url+'/app/my-time',{waitUntil:'networkidle'});await page.bringToFront();
    let form;
    if(kind==='MISSING_ENTRY'){
     await page.locator('main .employee-correction-center').getByRole('button',{name:'Request a correction',exact:true}).click();
     form=page.locator('#employee-missing-time-correction');
     await form.getByLabel('Start',{exact:true}).fill(local(Temporal.Instant.from(entry.start).subtract({hours:3}).toString()));
     await form.getByLabel('End',{exact:true}).fill(local(Temporal.Instant.from(entry.start).subtract({hours:2}).toString()));
    }else{
     const details=page.locator('.employee-time-entry').first();await details.locator('summary').click();
     await details.getByRole('button',{name:'Request a correction',exact:true}).click();
     form=details.locator('.employee-time-correction-form');
     if(kind==='BREAK_BOUNDARY')await form.getByLabel('What needs correction?').selectOption({index:1});
    }
    await form.getByLabel('Reason',{exact:true}).fill('Fictional uncertain '+kind+' '+loss+' command.');
    const commands=[];
    let confirmCommit;
    const committedBeforeDelivery=new Promise(resolve=>{confirmCommit=resolve;});
    const deliveryHeld=new Promise(resolve=>{releaseDelivery=resolve;});
    await page.route('**/api/employee/time-corrections',async route=>{
     if(route.request().method()!=='POST')return route.continue();
     commands.push(route.request().postDataJSON());
     if(commands.length!==1)return route.continue();
     if(loss==='after'){
      const committed=await route.fetch();assert.equal(committed.status(),202);
      confirmCommit();await deliveryHeld;
     }
     await route.abort('failed');
    });
    await form.getByRole('button',{name:'Send request',exact:true}).click();
    if(loss==='after'){
     await committedBeforeDelivery;
     // Clear the real private reader while the first POST is still unresolved.
     await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
     await page.getByText('Updates paused',{exact:true}).waitFor();
     await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
     await page.locator('.employee-time-entry').first().waitFor();
     if(kind!=='MISSING_ENTRY')await page.locator('.employee-time-entry').first().locator('summary').click();
     await page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/}).waitFor();
     await page.locator(kind==='MISSING_ENTRY'?'main .employee-correction-center':'.employee-time-entry').first().getByRole('button',{name:'Request a correction',exact:true}).click();
     releaseDelivery();
     checked(`${engine}: ${kind} in-flight private pause preserves the command before response classification`);
    }
    await page.getByText('The server outcome could not be confirmed. Retry the same request safely.',{exact:true}).waitFor();
    assert.equal(await page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/}).count(),1);
    assert.equal(await form.getByRole('button',{name:'Send request',exact:true}).isDisabled(),true);
    // The inherited private reader really clears/unmounts its children on pause.
    await c.setOffline(true);await page.getByText('Updates paused',{exact:true}).waitFor();
    assert.equal(await page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/}).count(),0);
    await c.setOffline(false);await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
    await page.locator('.employee-time-entry').first().waitFor();
    if(kind!=='MISSING_ENTRY')await page.locator('.employee-time-entry').first().locator('summary').click();
    const retry=page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/});await retry.waitFor();
    if(kind==='ENTRY_BOUNDARY'&&loss==='after'){
     for(const width of [320,375,390,430,768,1024,1440]){
      await page.setViewportSize({width,height:width<=430?844:1000});
      await geometry(page,'.employee-time-correction','employee uncertain request',engine,width);
      const shot=join(evidence,`${engine}-employee-recovery-${width}.png`);await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
     }
    }
    await retry.focus();await page.keyboard.press('Enter');
    await page.getByText('Correction request sent for manager review.',{exact:true}).waitFor();
    assert.equal(commands.length,2);assert.deepEqual(commands[1],commands[0]);
    assert.deepEqual(await q('SELECT count(*)::int AS count FROM time_correction_requests WHERE id=$1',[commands[0].operationId]),[{count:1}]);
    await decide(owner,commands[0].operationId);
    observations.cases.push({engine,role:'Employee',kind,loss,operationId:commands[0].operationId,postCalls:commands.length,sameCommand:true,pausedSnapshotCleared:true,pausedBeforeDeliverySettled:loss==='after'});
    checked(`${engine}: ${kind} ${loss}-commit response loss recovers same operation after private pause`);
   }finally{releaseDelivery();await c.close();}
  }

  for(const decision of ['APPROVE','REJECT'])for(const loss of ['before','after','malformed','unknown']){
   const employee=await context(browser);await login(employee,'D2-E');
   const submitted=await boundCorrectionPost(employee.request,app.url+'/api/employee/time-corrections',{headers,data:entryCommand()});
   assert.equal(submitted.status(),202);const pending=await submitted.json();await employee.close();
   const c=await context(browser,{width:390,height:844});await login(c,'QAOWNER');
   try{
    const page=await c.newPage();page.setDefaultTimeout(15000);watch(page);
    await page.goto(app.url+'/app?view=attendance',{waitUntil:'networkidle'});await page.bringToFront();
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
    await page.getByText('The server outcome could not be confirmed. Retry the same decision safely.',{exact:true}).waitFor();
    await c.setOffline(true);
    await page.getByRole('button',{name:'Retry same decision',exact:true}).waitFor();
    await c.setOffline(false);await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
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
   await page.goto(app.url+'/app?view=attendance',{waitUntil:'networkidle'});await page.bringToFront();
   await page.route('**/api/manager/time-corrections',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());
   await page.getByRole('button',{name:'Approve correction for Avery Correction QA',exact:true}).click();
   await page.getByRole('button',{name:'Retry same decision',exact:true}).waitFor();
   await q("UPDATE employees SET role='LEAD' WHERE id='QAOWNER'");
   await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
   await page.getByText('Correction access ended',{exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Retry same decision',exact:true}).count(),0);
   checked(`${engine}: current Manager authority loss clears uncertain recovery`);
  }finally{
   await q("UPDATE employees SET role='OWNER' WHERE id='QAOWNER'");await manager.close();
   await decide(owner,pending.requestId);
  }

  // Real sign-out/sign-in unmounts the page-scoped command memory.
  const c=await context(browser,{width:390,height:844});await login(c,'D2-E');
  try{
   const page=await c.newPage();page.setDefaultTimeout(15000);watch(page);
   await page.goto(app.url+'/app/my-time',{waitUntil:'networkidle'});await page.bringToFront();
   const details=page.locator('.employee-time-entry').first();await details.locator('summary').click();
   await details.getByRole('button',{name:'Request a correction',exact:true}).click();
   await details.getByLabel('Reason',{exact:true}).fill('Fictional logout recovery boundary.');
   await page.route('**/api/employee/time-corrections',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());
   await details.getByRole('button',{name:'Send request',exact:true}).click();
   await page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/}).waitFor();
   await page.locator('.employee-more-trigger').click();
   await Promise.all([page.waitForURL(url=>url.pathname==='/login'),page.locator('#employee-more-navigation').getByRole('button',{name:'Sign out',exact:true}).click()]);
   await login(c,'QAOWNER');await page.goto(app.url+'/app?view=attendance',{waitUntil:'networkidle'});
   assert.equal(await page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/}).count(),0);
   await login(c,'D2-E');await page.goto(app.url+'/app/my-time',{waitUntil:'networkidle'});
   await page.locator('.employee-time-entry').first().waitFor();
   assert.equal(await page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/}).count(),0);
   checked(`${engine}: sign-out/account-switch/sign-in clears uncertain Employee command memory`);
  }finally{await c.close();}

  const denied=await context(browser,{width:390,height:844});await login(denied,'D2-E');
  try{
   const page=await denied.newPage();page.setDefaultTimeout(15000);watch(page);
   await page.goto(app.url+'/app/my-time',{waitUntil:'networkidle'});await page.bringToFront();
   const details=page.locator('.employee-time-entry').first();await details.locator('summary').click();
   await details.getByRole('button',{name:'Request a correction',exact:true}).click();
   await details.getByLabel('Reason',{exact:true}).fill('Fictional current authority-loss regression.');
   await page.route('**/api/employee/time-corrections',route=>route.request().method()==='POST'?route.abort('failed'):route.continue());
   await details.getByRole('button',{name:'Send request',exact:true}).click();
   await page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/}).waitFor();
   await q("UPDATE employees SET active=false WHERE id='D2-E'");
   await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
   await page.locator('main .employee-time-message').getByText('Your session ended',{exact:true}).waitFor();
   assert.equal(await page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/}).count(),0);
   await q("UPDATE employees SET active=true WHERE id='D2-E'");
   await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});
   await page.locator('.employee-time-entry').first().waitFor();
   await page.locator('.employee-time-entry').first().locator('summary').click();
   assert.equal(await page.locator('button.employee-time-correction-retry').filter({hasText:/^Try again$/}).count(),0);
   checked(`${engine}: current Employee authority denial clears uncertain recovery before re-entry`);
  }finally{await q("UPDATE employees SET active=true WHERE id='D2-E'");await denied.close();}
  assert.deepEqual(observations.runtimeErrors,[]);
 }finally{await owner.close();}
}
