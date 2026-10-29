import assert from 'node:assert/strict';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';

export async function interceptedInboxResponse(page, trigger, transformHeaders) {
 let intercepted;
 const handler=route=>{
  const request=route.request();
  if(!intercepted&&request.method()==='GET')intercepted=request;
  return route.continue({headers:transformHeaders(request.headers())});
 };
 await page.route('**/api/notifications',handler);
 const response=page.waitForResponse(response=>intercepted!==undefined&&response.request()===intercepted);
 try { const [result]=await Promise.all([response,trigger()]);return result; }
 finally { await page.unroute('**/api/notifications',handler); }
}

/** An enabled filter may belong to the previous empty snapshot. Verify this
 * refresh's own response, then its rendered rows, before asserting restoration. */
export async function refreshInboxAndWaitForRows(page,trigger,expectedIds,deadline=performance.now()+15000){
 return runBeforeRecoveryDeadline(async()=>{
  const response=await interceptedInboxResponse(page,trigger,headers=>headers);
  assert.equal(response.status(),200);
  const view=await response.json();assert.equal(view.state,'ready');
  assert.deepEqual(view.items.map(item=>item.id).sort(),[...expectedIds].sort());
  const rendered=await page.waitForFunction(count=>document.querySelectorAll('[data-private-view="notifications"] [data-inbox-row]').length===count,expectedIds.length,{timeout:Math.max(1,deadline-performance.now())});
  await rendered.dispose();
  return view;
 },deadline);
}

export async function withActorRole(query, actor, role, originalRole, read) {
 await query('UPDATE employees SET role=$1 WHERE id=$2',[role,actor]);
 try { return await read(); }
 finally { await query('UPDATE employees SET role=$1 WHERE id=$2',[originalRole,actor]); }
}
