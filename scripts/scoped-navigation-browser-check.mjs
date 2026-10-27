import assert from 'node:assert/strict';
import {markReportNavigationStage,observeReportNavigation,openPeriodReports} from './phase-d-report-navigation.mjs';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {assignOwnedManagerCompanyAccess} from '../src/test/integration/owned-app-fixture.ts';

/** Real destination RSC timing control, using the original single-click/15s
 * Reports acceptance. Each case starts a separate source document; none rescues
 * an already failed navigation. Only the response timing/lifecycle event vary. */
export async function verifyReportRecoveryNavigation(page,app,engine,report,managerId){
 const origin=app.url;
 for(const recover of [false,true]){
  const control=recover?'held-destination-with-recovery':'held-destination-without-recovery';
  markReportNavigationStage(page,engine,control,'source-entry');
  await page.goto(origin+'/app/payroll-export?start=2026-09-21&end=2026-09-27');
  await page.getByRole('heading',{name:'Choose finalized employees',exact:true}).waitFor();
  const row={engine,recover,status:'pending',holdMs:1500,held:false,sourceRequests:0};
  (report.scopedNavigation??=[]).push(row);
  let holdTask;
  const source=request=>{const url=new URL(request.url());if(row.held&&url.origin===origin&&url.pathname==='/app/payroll-export'&&request.headers().rsc==='1')row.sourceRequests++;};
  const handler=route=>{
   const request=route.request(),url=new URL(request.url());
   if(row.held||url.origin!==origin||url.pathname!=='/app/reports'||request.headers().rsc!=='1')return route.continue();
   row.held=true;
   holdTask=(async()=>{
    const start=performance.now(),release=new Promise(ready=>setTimeout(ready,1500));
    if(recover)await page.evaluate(()=>window.dispatchEvent(new Event('storage')));
    await release;
    row.privateRetiredBeforeRelease=await page.getByRole('heading',{name:'Choose finalized employees',exact:true}).count()===0;
    row.actualHoldMs=Math.round(performance.now()-start);
    await route.continue();
   })();
   // Retain the same rejection for the awaited cleanup below.
   void holdTask.catch(()=>{});
   return holdTask;
  };
  page.on('request',source);await page.route('**/app/reports?*',handler);
  try{
   await openPeriodReports(page,origin,engine,report,control);
   assert.equal(row.held,true,'The controlled case must hold an actual Reports RSC');
   if(recover){
    assert.equal(row.privateRetiredBeforeRelease,true,'Source private content must stay retired while destination recovery is pending');
    assert.equal(row.sourceRequests,0,'Source recovery must not supersede the accepted destination');
   }
   row.status='passed';
  }catch(error){row.status='failed';throw error;}
  finally{
   if(holdTask)await holdTask;
   await page.unroute('**/app/reports?*',handler);page.off('request',source);
  }
 }
 await verifyExplicitRecovery(page,origin,engine,report);
 await verifyRoleRedirect(page,app,engine,report,managerId);
 markReportNavigationStage(page,engine,'restored-period-report','source-entry');
 await page.goto(origin+'/app/payroll-export?start=2026-09-21&end=2026-09-27');
 await page.getByRole('heading',{name:'Choose finalized employees',exact:true}).waitFor();
 await openPeriodReports(page,origin,engine,report,'restored-period-report');
}

async function verifyExplicitRecovery(page,origin,engine,report){
 const source='/app/payroll-export?start=2026-09-21&end=2026-09-27';
 const row={engine,case:'explicit-source-recovery',status:'pending'};report.scopedNavigation.push(row);
 const mark=phase=>{row.phase=phase;markReportNavigationStage(page,engine,row.case,phase);};
 let release,held,terminal,intercepted,stop=()=>{};
 const gate=new Promise(ready=>{release=ready;});
 const incoming=new Promise(ready=>{intercepted=ready;});
 const handler=route=>{
  const request=route.request();if(held||request.headers().rsc!=='1')return route.continue();
  held=request;
  terminal=new Promise(ready=>{
   const finished=r=>{if(r===request){stop();ready('finished');}};
   const failed=r=>{if(r===request){stop();ready('failed');}};
   stop=()=>{page.off('requestfinished',finished);page.off('requestfailed',failed);};
   page.on('requestfinished',finished);page.on('requestfailed',failed);
  });
  intercepted();
  // A discarded destination may already be cancelled by the browser (the explicit refresh supersedes it); Playwright then
  // counts its route as handled. The assertions below still require it to end and never replace the source.
  return gate.then(()=>route.continue()).catch(error=>{if(!/already handled/i.test(String(error?.message)))throw error;});
 };
 mark('source-entry');await page.goto(origin+source);await page.getByRole('heading',{name:'Choose finalized employees',exact:true}).waitFor();
 await page.route('**/app/reports?*',handler);
 const deadline=performance.now()+15000;
 try{
  await runBeforeRecoveryDeadline(async()=>{
   mark('hold-destination');
   // This route is deliberately held. Do not let Playwright's implicit navigation wait
   // block the recovery action; the held request and its terminal event are awaited explicitly.
   await Promise.all([incoming,page.locator('#desktop-primary-navigation a[href="/app/reports"]').click({noWaitAfter:true})]);
   assert(held,'An actual destination RSC must be held');
   mark('explicit-source-refresh');
   await page.evaluate(()=>window.dispatchEvent(new Event('storage')));
   await page.locator('main').getByRole('button',{name:'Refresh current view',exact:true}).click({noWaitAfter:true});
   await page.getByRole('heading',{name:'Choose finalized employees',exact:true}).waitFor();
   mark('release-discarded-destination');
   release();row.destinationTerminal=await terminal;
   await page.evaluate(()=>new Promise(ready=>requestAnimationFrame(()=>requestAnimationFrame(ready))));
   assert.equal(new URL(page.url()).pathname+new URL(page.url()).search,source,'A discarded destination must not replace explicit fresh source recovery');
   assert(await page.getByRole('heading',{name:'Choose finalized employees',exact:true}).isVisible());
   mark('complete');
   row.status='passed';
  },deadline);
 }catch(error){row.status='failed';throw error;}
 finally{release();stop();await page.unroute('**/app/reports?*',handler);}
}

async function verifyRoleRedirect(page,app,engine,report,managerId){
 const row={engine,case:'actual-role-redirect',actor:managerId,status:'pending',events:[],omittedEvents:0,fallbackErrorIndices:[]};report.scopedNavigation.push(row);
 const mark=phase=>markReportNavigationStage(page,engine,row.case,phase);
 const stopTrace=observeReportNavigation(page,app.url,row,()=>{row.fallbackErrorIndices.push(report.errors.length);report.errors.push('Role redirect emitted a framework RSC fallback.');});
 try{
 let attempted=false,changed=false,used=false,mutation;
 const handler=async route=>{
  if(used||route.request().headers().rsc!=='1')return route.continue();used=true;
  attempted=true;mutation=app.database.executor.query({text:"UPDATE employees SET role='EMPLOYEE' WHERE id=$1",values:[managerId]});await mutation;changed=true;row.roleChanged=true;
  mark('role-changed-destination-release');
  await page.evaluate(()=>window.dispatchEvent(new Event('storage')));
  row.storageTriggered=true;
  return route.continue();
 };
 mark('source-entry');await page.goto(app.url+'/app/payroll-export?start=2026-09-21&end=2026-09-27');
 await page.getByRole('heading',{name:'Choose finalized employees',exact:true}).waitFor();
 row.documentTimeOrigin=await page.evaluate(()=>performance.timeOrigin);
 await page.route('**/app/reports?*',handler);
 try{
  mark('request-destination');
  await Promise.all([page.waitForURL(url=>url.pathname==='/app'),page.locator('#desktop-primary-navigation a[href="/app/reports"]').click()]);
  assert(used&&changed,'The actual Reports request must encounter the fictional actor role change');
  await page.locator('.employee-home').waitFor();
  await page.locator('[data-nv-e5]').waitFor();
  assert.equal(await page.locator('[data-nv-clean]').count(),0,'The server must replace the old management shell after the role change');
  row.identityShellVerified=true;
  assert.equal(await page.getByRole('heading',{name:'Choose finalized employees',exact:true}).count(),0);
  row.sourcePrivateAbsent=true;row.destinationVerified=true;
  mark('complete');
  row.status='passed';
 }catch(error){row.status='failed';throw error;}
 finally{
  try{
   try{await page.unroute('**/app/reports?*',handler);}
   finally{try{await mutation;}finally{if(attempted){await app.database.executor.query({text:"UPDATE employees SET role='MANAGER' WHERE id=$1",values:[managerId]});await assignOwnedManagerCompanyAccess(app.database.executor,managerId);row.cleanupRestored=true;}}}
  }catch(error){row.status='failed';throw error;}
 }
 }finally{stopTrace();}
}
