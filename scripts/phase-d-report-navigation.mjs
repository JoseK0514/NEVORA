import assert from 'node:assert/strict';
import {finishResponseByDeadline,runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {requestFailureCategory} from './rsc-caught-error-observer.mjs';

const stages=new WeakMap();
export function markReportNavigationStage(page,engine,control,phase){
 stages.set(page,{engine,control,phase,started:performance.now()});
}
export function reportNavigationStage(page){
 const stage=stages.get(page);
 return stage?{engine:stage.engine,control:stage.control,phase:stage.phase,elapsedMs:Math.round(performance.now()-stage.started)}:null;
}

export async function finishPeriodReportResponse(response,period,deadline){
 return runBeforeRecoveryDeadline(async()=>{
  assert(response.status()===200,'Protected report response must succeed');
  await finishResponseByDeadline(response,deadline);
  const body=await response.json();
  assert(body?.state==='ready','Protected report response must be ready');
  assert(body.source?.period?.startDate===period.startDate&&body.source?.period?.endDate===period.endDate,'Protected report must match the requested period');
  assert(Number.isSafeInteger(body.validForMs)&&body.validForMs>0&&body.validForMs<=15000,'Protected report lifetime must be bounded');
  return {status:200,bodyFinished:true,periodMatched:true};
 },deadline);
}

export function observeReportNavigation(page,origin,trace,onFrameworkFailure){
 const started=performance.now();
 trace.startedAtMs=Math.round(started);const requests=new WeakMap();let sequence=0;
 const event=(kind,detail={})=>{if(trace.events.length<64)trace.events.push({kind,elapsedMs:Math.min(60000,Math.max(0,Math.round(performance.now()-started))),...detail});else trace.omittedEvents++;};
 const describe=request=>{
  const url=new URL(request.url());if(url.origin!==origin)return;
  const resource=({'/app/payroll-export':'source-route','/app/reports':'report-route','/app':'role-home','/api/reports':'report-read','/api/company-access/operational-authority':'authority-read','/__nextjs_original-stack-frames':'next-frames'})[url.pathname];
  if(resource){
   const navigation=request.isNavigationRequest();
   if(navigation&&request.frame()!==page.mainFrame())return;
   if(!requests.has(request))requests.set(request,{requestId:++sequence,...(navigation?{sameAddress:request.url()===page.url()}:{} )});
   return {...requests.get(request),resource,navigation,rsc:request.headers().rsc==='1'};
  }
 };
 const request=r=>{const detail=describe(r);if(detail)event('request',detail);};
 const response=r=>{const detail=describe(r.request());if(detail)event('response',{...detail,status:r.status()});};
 const finished=r=>{const detail=describe(r);if(detail)event('finished',detail);};
 const failed=r=>{
  const detail=describe(r);if(!detail)return;
  let failureCategory='unavailable';try{failureCategory=requestFailureCategory(r.failure()?.errorText);}catch{}
  event('failed',{...detail,failureCategory});
 };
 const frame=f=>{if(f!==page.mainFrame())return;const path=new URL(f.url()).pathname;event('commit',{destination:path==='/app/reports'?'reports':path==='/app/payroll-export'?'source':'other'});};
 const consoleError=message=>{
  if(message.type()!=='error')return;
  const fallback=message.text().includes('Failed to fetch RSC payload for ')&&message.text().includes('Falling back to browser navigation.');
  event('console-error',{code:fallback?'rsc-navigation-fallback':'other'});
  if(fallback)onFrameworkFailure();
 };
 const listeners={request,response,requestfinished:finished,requestfailed:failed,framenavigated:frame,console:consoleError};
 for(const [name,listener] of Object.entries(listeners))page.on(name,listener);
 return ()=>{for(const [name,listener] of Object.entries(listeners))page.off(name,listener);};
}

export async function openPeriodReports(page,origin,engine,report,control='period-report'){
 const trace={engine,status:'pending',events:[],omittedEvents:0};(report.reportNavigation??=[]).push(trace);
 trace.control=control;trace.attempt=report.reportNavigation.length;
 const mark=phase=>markReportNavigationStage(page,engine,control,phase);
 const stop=observeReportNavigation(page,origin,trace,()=>report.errors.push('Reports navigation emitted a framework RSC fallback.'));
 try{
  mark('link');
  await page.bringToFront();
  const insights=page.locator('#desktop-primary-navigation a[href="/app/reports"]');
  assert.equal(await insights.getAttribute('href'),'/app/reports');
  await Promise.all([page.waitForURL(url=>url.pathname==='/app/reports'),insights.click()]);
  mark('destination-readiness');
  await page.getByRole('heading',{name:'Hours by person',exact:true}).waitFor();
  mark('period-entry');
  await page.getByRole('button',{name:/^Report period:/}).click();
  await page.getByRole('button',{name:'Custom period…',exact:true}).click();
  const period={startDate:'2026-09-21',endDate:'2026-09-27'};
  await page.getByLabel('First day',{exact:true}).fill(period.startDate);
  await page.getByLabel('Last day',{exact:true}).fill(period.endDate);
  assert.equal(await page.getByLabel('First day',{exact:true}).inputValue(),period.startDate);
  assert.equal(await page.getByLabel('Last day',{exact:true}).inputValue(),period.endDate);
  const deadline=performance.now()+15000;
  mark('period-submit');
  const incoming=page.waitForResponse(response=>{
   const request=response.request(),url=new URL(request.url());
   if(url.origin!==origin||url.pathname!=='/api/reports'||request.method()!=='POST'||request.headers()['x-nevora-reports']!=='1')return false;
   try{const body=request.postDataJSON();return Object.keys(body).length===2&&body.startDate===period.startDate&&body.endDate===period.endDate;}catch{return false;}
  },{timeout:15000});
  const [response]=await runBeforeRecoveryDeadline(()=>Promise.all([incoming,page.getByRole('button',{name:'View period',exact:true}).click()]),deadline);
  trace.protectedRead=await finishPeriodReportResponse(response,period,deadline);
  await runBeforeRecoveryDeadline(()=>page.locator('main').getByText('8h',{exact:true}).first().waitFor(),deadline);
  mark('complete');
  trace.status='passed';
 }catch(error){trace.status='failed';throw error;}
 finally{stop();}
}
