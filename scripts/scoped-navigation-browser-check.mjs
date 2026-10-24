import assert from 'node:assert/strict';
import {openPeriodReports} from './phase-d-report-navigation.mjs';

/** Real destination RSC timing control, using the original single-click/15s
 * Reports acceptance. Each case starts a separate source document; none rescues
 * an already failed navigation. Only the response timing/lifecycle event vary. */
export async function verifyReportRecoveryNavigation(page,origin,engine,report){
 for(const recover of [false,true]){
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
   await openPeriodReports(page,origin,engine,report);
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
}
