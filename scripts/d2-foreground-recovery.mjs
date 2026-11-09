import assert from 'node:assert/strict';
import {finishResponseByDeadline,runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';

export async function finishD2ForegroundRecovery(rsc,corrections,expectedIds,deadline){
 return runBeforeRecoveryDeadline(async()=>{
  assert.equal(rsc.status(),200);
  assert.equal(corrections.status(),200);
  await finishResponseByDeadline(corrections,deadline);
  const recovered=await corrections.json();
  assert.equal(recovered.state,'ready');
  assert.deepEqual(recovered.requests.filter(request=>expectedIds.includes(request.id)).map(request=>request.id).sort(),[...expectedIds].sort());
 },deadline);
}

/** React may schedule another RSC after the previous transport finishes. A
 * transient empty set is not a safe boundary for a separate driver reload. */
export async function waitForD2RscQuiescence(snapshot,deadline,{quietMs=500,pollMs=25}={}){
 assert(Number.isFinite(quietMs)&&quietMs>0&&Number.isFinite(pollMs)&&pollMs>0);
 return runBeforeRecoveryDeadline(async()=>{
  let previous=null,quietSince=performance.now();
  while(performance.now()<deadline){
   const current=snapshot();
   assert(Number.isInteger(current.pending)&&current.pending>=0&&Number.isInteger(current.version)&&current.version>=0);
   const now=performance.now();
   if(previous===null||current.pending>0||current.version!==previous.version||current.pending!==previous.pending)quietSince=now;
   previous=current;
   if(current.pending===0&&now-quietSince>=quietMs)return {version:current.version};
   await new Promise(resolve=>setTimeout(resolve,Math.min(pollMs,Math.max(1,deadline-performance.now()))));
  }
  throw Error('Original owned recovery deadline exceeded');
 },deadline);
}
