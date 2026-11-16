import assert from 'node:assert/strict';
import {finishResponseByDeadline,runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';
import {waitForPortalReady} from './browser-render-readiness.mjs';

// Home mounts its own private Hours read after hydration. An idle network can
// precede that read; require its completed, current body before leaving Home.
export async function waitForAttentionLoginReady({page,origin,signIn,deadline=performance.now()+15000}){
 const remaining=()=>Math.max(1,deadline-performance.now());
 return runBeforeRecoveryDeadline(async()=>{
  const response=page.waitForResponse(value=>{
   try{const request=value.request(),url=new URL(value.url());return request.method()==='GET'&&request.frame()===page.mainFrame()&&url.origin===origin&&url.pathname==='/api/employee/hours/records/overview'&&!url.search&&!url.hash&&!url.username&&!url.password;}catch{return false;}
  },{timeout:remaining()});
  const hours=runBeforeRecoveryDeadline(async()=>{
   const value=await response;
   assert.equal(value.status(),200,'Attention login Hours read must succeed');
   await finishResponseByDeadline(value,deadline);
   const body=await runBeforeRecoveryDeadline(()=>value.json(),deadline);
   assert(body?.state==='ready'&&body.kind==='hours'&&body.view==='records'&&body.selection==='overview'&&body.data?.state==='ready'&&Number.isFinite(body.validForMs)&&body.validForMs>0,'Attention login Hours body must be ready for records overview');
  },deadline);
  await Promise.all([page.waitForURL(url=>url.origin===origin&&url.pathname==='/app',{timeout:remaining()}),Promise.resolve().then(signIn),hours]);
  await runBeforeRecoveryDeadline(()=>waitForPortalReady(page),deadline);
  await runBeforeRecoveryDeadline(()=>page.waitForLoadState('networkidle',{timeout:remaining()}),deadline);
  return {status:200,bodyFinished:true,hoursReady:true,portalReady:true,networkIdle:true};
 },deadline);
}
