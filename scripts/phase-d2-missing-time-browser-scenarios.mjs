import {boundCorrectionPost} from './phase-d-correction-http-fixture.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

// Real authenticated HTTP and rendered UI on the caller's newly owned loopback app.
export async function missingTimeBrowserScenarios({app,browser,engine,employee,page,context,login,geometry,checked,localValue,evidence,report}) {
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  const q=(text,values=[])=>app.database.executor.query({text,values});
  const day=engine==='chromium'?'05':'06';
  const start=`2026-01-${day}T08:00:00Z`,end=`2026-01-${day}T09:00:00Z`;
  const headers={'X-Nevora-Time-Correction':'1','Origin':app.url};
  const post=(c,path,data,custom=headers)=>boundCorrectionPost(c.request,app.url+path,{headers:custom,data});
  const employeePath='/api/employee/time-corrections',managerPath='/api/manager/time-corrections';
  const raw=async()=>{
    const result={};
    for(const table of ['time_entries','break_entries','clocker_devices','clocker_device_events','clocker_command_ledger','clocker_employee_clock_state','shifts','schedule_publication_revisions','schedule_publication_revision_shifts']) {
      result[table]=await q(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`);
    }
    return result;
  };
  const rawBefore=await raw();
  const rootCommand={operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:start,proposedEndAt:end,reason:'Fictional browser missing time.'};
  const rootResponse=await post(employee,employeePath,rootCommand);
  assert.equal(rootResponse.status(),202);
  const aRequest=await rootResponse.json();
  const manager=await context(browser);
  try {
    await login(manager,'QAOWNER');
    const decision=(requestId)=>({operationId:randomUUID(),requestId,expectedRevision:1,decision:'APPROVE'});
    const aResponse=await post(manager,managerPath,decision(aRequest.requestId));
    assert.equal(aResponse.status(),200);
    const a=await aResponse.json();
    checked(engine+': missing A approved through authenticated HTTP');

    await page.reload({waitUntil:'networkidle'});
    const center=page.locator('.employee-correction-center');
    // Each engine owns a distinct missing-time chain; unrelated current roots also stay selectable.
    const correct=center.locator('.employee-correction-history-row').first().getByRole('button',{name:'Correct missing time',exact:true});
    await correct.waitFor();
    assert.equal(await correct.count(),1);
    for(const width of [320,375,390,430,768,1024,1440]) {
      await page.setViewportSize({width,height:width<=430?844:1000});
      await geometry(page,'.employee-correction-center','missing-time history action',engine,width);
    }
    const replacement={...rootCommand,operationId:randomUUID(),targetAdjustmentId:a.adjustmentId,expectedBaseRevision:a.revision,proposedStartAt:`2026-01-${day}T08:05:00Z`};
    const stale=await post(employee,employeePath,{...replacement,expectedBaseRevision:1});
    assert.equal(stale.status(),409);assert.deepEqual(await stale.json(),{state:'blocked',reason:'stale_source'});
    assert.equal((await post(employee,employeePath,{...replacement,employeeId:'QAOWNER'})).status(),400);
    assert.equal((await post(employee,employeePath,replacement,{'X-Nevora-Time-Correction':'1'})).status(),403);
    assert.equal((await post(employee,managerPath,decision(aRequest.requestId))).status(),403);
    assert.equal((await post(manager,employeePath,replacement)).status(),403);
    const anonymous=await context(browser);
    try {assert.equal((await post(anonymous,employeePath,replacement)).status(),401);}finally{await anonymous.close();}
    checked(engine+': supersession input/origin/session/role and stale HTTP boundaries');

    await correct.focus();
    assert.equal(await correct.evaluate(el=>document.activeElement===el),true);
    await correct.press('Enter');
    const form=center.locator('form');
    await form.waitFor();
    const locationControl=form.locator('select');
    assert.equal(await locationControl.count(),1);
    assert.equal(await locationControl.isDisabled(),true);
    report.missingTimeLocationLabels??=[];
    report.missingTimeLocationLabels.push({engine,label:await locationControl.evaluate(el=>el.closest('label').textContent.trim())});
    await form.getByLabel('Start',{exact:true}).fill(localValue(replacement.proposedStartAt));
    await form.getByLabel('Reason',{exact:true}).fill('Fictional approved interval replacement.');
    for(const width of [320,375,390,430,768,1024,1440]) {
      await page.setViewportSize({width,height:width<=430?844:1000});
      await geometry(page,'.employee-time-correction-form.missing','missing-time replacement form',engine,width);
    }
    await page.setViewportSize({width:375,height:844});
    const shot=join(evidence,engine+'-missing-time-replacement.png');
    await page.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
    const requestPromise=page.waitForRequest(request=>request.url().endsWith(employeePath)&&request.method()==='POST');
    await form.getByRole('button',{name:'Send request',exact:true}).click();
    const submitted=(await requestPromise).postDataJSON();
    assert.equal(submitted.targetAdjustmentId,a.adjustmentId);assert.equal(submitted.expectedBaseRevision,2);
    await center.getByText('Correction request sent for manager review.',{exact:true}).waitFor();
    checked(engine+': keyboard-driven B submission carries exact effective A identity');
    const bReplay=await post(employee,employeePath,submitted);
    assert.equal(bReplay.status(),202);
    const b=await bReplay.json();
    assert.equal((await post(employee,employeePath,{...submitted,reason:'Changed operation reuse.'})).status(),409);

    const managerPage=await manager.newPage();managerPage.setDefaultTimeout(15000);
    managerPage.on('pageerror',error=>errors.push(String(error)));
    await managerPage.goto(app.url+'/app?view=attendance',{waitUntil:'networkidle'});
    await managerPage.getByText('Approved missing time',{exact:true}).waitFor();
    const approvalRequest=managerPage.waitForRequest(request=>request.url().endsWith(managerPath)&&request.method()==='POST');
    await managerPage.getByRole('button',{name:'Approve correction for Avery Correction QA'}).click();
    const bDecision=(await approvalRequest).postDataJSON();
    await managerPage.getByText('Correction approved. The original recorded punch remains unchanged.',{exact:true}).waitFor();
    const approvedReplay=await post(manager,managerPath,bDecision);
    assert.equal(approvedReplay.status(),200);
    const accepted=await approvedReplay.json();
    assert.equal((await post(manager,managerPath,{...bDecision,decision:'REJECT'})).status(),409);
    const staleAfter=await post(employee,employeePath,{...submitted,operationId:randomUUID()});
    assert.equal(staleAfter.status(),409);assert.equal((await staleAfter.json()).reason,'stale_source');
    checked(engine+': B approved by independent Owner; receipt replay and changed/stale operations protected');

    await page.reload({waitUntil:'networkidle'});
    assert.equal(await correct.count(),1);
    const history=await (await employee.request.get(app.url+employeePath,{headers:{'X-Nevora-Time-Correction':'1'}})).json();
    assert.equal(history.requests.find(item=>item.id===aRequest.requestId).currentAdjustmentId,null);
    assert.equal(history.requests.find(item=>item.id===b.requestId).currentAdjustmentId,accepted.adjustmentId);
    assert.equal(await center.getByRole('button',{name:'Correct missing time',exact:true}).count(),
      history.requests.slice(0,5).filter(item=>item.currentAdjustmentId).length);
    assert.deepEqual(await q('SELECT id,supersedes_adjustment_id FROM time_correction_adjustments WHERE id=ANY($1::uuid[]) ORDER BY created_at',[[a.adjustmentId,accepted.adjustmentId]]),[
      {id:a.adjustmentId,supersedes_adjustment_id:null},{id:accepted.adjustmentId,supersedes_adjustment_id:a.adjustmentId},
    ]);
    assert.deepEqual(await q('SELECT adjustment_id FROM nevora_effective_time_entries WHERE adjustment_id=ANY($1::uuid[])',[[a.adjustmentId,accepted.adjustmentId]]),[{adjustment_id:accepted.adjustmentId}]);
    assert.deepEqual(await raw(),rawBefore);
    checked(engine+': immutable A/B history, one current action/leaf and identical raw attendance/device/schedule history');

    // The new action uses the existing loading and unavailable history states.
    await page.route('**/api/employee/time-corrections',route=>route.fulfill({status:503,contentType:'application/json',body:'{"state":"unavailable"}'}));
    await page.reload({waitUntil:'networkidle'});
    await center.getByText('Correction history is unavailable right now.',{exact:true}).waitFor();
    assert.equal(await correct.count(),0);
    await page.unroute('**/api/employee/time-corrections');
    await page.reload({waitUntil:'networkidle'});await correct.waitFor();
    assert.deepEqual(errors,[]);
    checked(engine+': unavailable history offers no supersession action; reload recovers without runtime errors');
  } finally {await manager.close();}
}
