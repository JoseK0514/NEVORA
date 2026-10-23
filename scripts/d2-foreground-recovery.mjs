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
