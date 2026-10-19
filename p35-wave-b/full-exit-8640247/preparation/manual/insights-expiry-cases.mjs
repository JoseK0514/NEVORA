/** Reports expiry reads are harmless exact-period POSTs; every business write stays guarded. */
export function registerScopedCases(h){
 const {register,go,check,evidence,until,wait,fillDate}=h;
 register('exit-wb-insights-expiry',['IS-B29','ST-B13','IS-B30'],async({page,row})=>{
  const initial=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/reports'&&r.request().method()==='POST'&&r.status()===200);
  await page.bringToFront();await go(page,row,'/app/reports');const first=await(await initial).json();if(first.state!=='ready'||!first.source?.workspaceId)throw Error('Positive authorized Reports fixture required');
  const view=page.locator('.wb-insights-view');await view.waitFor();const definitions=view.locator('details').filter({hasText:'Report definitions'}).last(),summary=definitions.locator('summary');await summary.waitFor();
  let mode='held';const held=[];const requestFailed=request=>{for(const item of held)if(item.request===request)item.aborted=true;};page.on('requestfailed',requestFailed);
  await page.route('**/api/reports',async route=>{
   const request=route.request();if(request.method()!=='POST')return route.fallback();const body=request.postDataJSON();if(!body||Object.keys(body).sort().join(',')!=='endDate,startDate'||!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(body.endDate))throw Error('Unexpected Reports envelope; never allow a business write');
   if(mode==='normal')return route.fallback();held.push({route,request,body,release:()=>{},aborted:false});
  });
  // Measure the actual closed maximum before restoring the real user preference.
  if(!(await definitions.evaluate(e=>e.open)))await summary.click();await wait(250);await summary.click();await wait(250);const closedMax=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);await summary.click();await wait(250);await summary.focus();await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  row.before={...await evidence(page,row,'bottom-open-before-expiry'),closedMax,open:await definitions.evaluate(e=>e.open)};check(row,row.before.scrollY>closedMax+1,'Bottom-open fixture exceeds closed-document maxY',{savedY:row.before.scrollY,closedMax});
  await until(async()=>await view.count()===0,'Verified Reports snapshot did not retire by its mandatory expiry',20000);const retired=await evidence(page,row,'expired-private-cleared');check(row,await view.count()===0,'Expiry removes old private report DOM');
  if(row.variant==='moved-on')await page.locator('#report-first-day').focus();
  if(row.variant==='period'){
   await fillDate(page.locator('#report-first-day'),'2026-09-21');await fillDate(page.locator('#report-last-day'),'2026-09-27');await page.locator('.wb-insights-top form button[type=submit]').click();
  }
  if(row.variant==='hidden'){
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await wait(150);const hidden=await evidence(page,row,'hidden');check(row,await view.count()===0,'Hidden Reports never restores stale private DOM');row.reads=held.map(item=>({path:'/api/reports',method:'POST',aborted:item.aborted,period:item.body}));return;
  }
  await until(()=>held.some(item=>!item.aborted),'Expiry replacement read not held');await wait(125);const replacement=[...held].reverse().find(item=>!item.aborted);if(!replacement)throw Error('No live authorized replacement request');
  if(row.variant==='401'||row.variant==='403'){
   await replacement.route.fulfill({status:Number(row.variant),contentType:'application/json',body:'{}'});replacement.release();await until(async()=>/session ended|Sign in|access/i.test(await page.locator('.wb-report-state').innerText()),'Unauthorized Reports state did not settle');
   const denied=await evidence(page,row,'denied');check(row,await view.count()===0,'Denied replacement cannot restore private report/disclosure DOM');check(row,denied.active?.tag!=='SUMMARY','Denied replacement does not restore expired summary focus');row.reads=held.map(item=>({path:'/api/reports',method:'POST',aborted:item.aborted,period:item.body}));return;
  }
  // Only this known exact-period read is fetched. It produces a new authorized
  // snapshot after expiry; no old response is relabeled as fresh.
  const upstream=await replacement.route.fetch(),fresh=await upstream.json();if(upstream.status()!==200||fresh.state!=='ready')throw Error('Fresh canonical Reports read unavailable');check(row,fresh.source.workspaceId===first.source.workspaceId,'Fresh response stays in original authorized workspace');
  await replacement.route.fulfill({response:upstream});replacement.release();await view.waitFor();await wait(300);
  const after=await evidence(page,row,'fresh-authorized');const freshDefinitions=view.locator('details').filter({hasText:'Report definitions'}).last(),open=await freshDefinitions.evaluate(e=>e.open);row.afterPreferences={open,active:after.active,scrollY:after.scrollY,savedY:row.before.scrollY,closedMax};
  if(row.variant==='restore'){
   check(row,open,'Fresh same-view report restores original open Definitions preference',row.afterPreferences);check(row,after.active?.tag==='SUMMARY','Fresh same-view report restores original summary focus',row.afterPreferences);check(row,Math.abs(after.scrollY-row.before.scrollY)<=1,'Fresh same-view restoration retains bottom-open savedY rather than closed-height clamp',row.afterPreferences);
  }else if(row.variant==='moved-on')check(row,await page.locator('#report-first-day').evaluate(e=>document.activeElement===e),'Fresh replacement preserves deliberately moved-on period field focus');
  else{check(row,!open,'New period does not inherit old disclosure preference');check(row,fresh.source.period.startDate==='2026-09-21'&&fresh.source.period.endDate==='2026-09-27','New period response matches applied period');}
  row.reads=held.map(item=>({path:'/api/reports',method:'POST',aborted:item.aborted,period:item.body}));
 },{accounts:['QAOWNER'],sizes:[[390,844,100],[320,844,200]],variants:['restore','moved-on','401','403','hidden','period']});
}
