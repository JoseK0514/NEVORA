import assert from 'node:assert/strict';
import {runBeforeRecoveryDeadline} from './browser-response-deadline.mjs';

// glob: the inbox read the rendered page uses (phones read the employee messages view of the same notifications).
export async function interceptedInboxResponse(page, trigger, transformHeaders, glob='**/api/notifications') {
 let intercepted;
 const handler=route=>{
  const request=route.request();
  if(!intercepted&&request.method()==='GET')intercepted=request;
  return route.continue({headers:transformHeaders(request.headers())});
 };
 await page.route(glob,handler);
 const response=page.waitForResponse(response=>intercepted!==undefined&&response.request()===intercepted);
 try { const [result]=await Promise.all([response,trigger()]);return result; }
 finally { await page.unroute(glob,handler); }
}

/** An enabled filter may belong to the previous empty snapshot. Verify this
 * refresh's own response, then its rendered rows, before asserting restoration. */
export async function refreshInboxAndWaitForRows(page,trigger,expectedIds,deadline=performance.now()+15000,{glob='**/api/notifications',items=view=>view.items,rows='[data-private-view="notifications"] [data-inbox-row]'}={}){
 return runBeforeRecoveryDeadline(async()=>{
  const response=await interceptedInboxResponse(page,trigger,headers=>headers,glob);
  assert.equal(response.status(),200);
  const view=await response.json();assert.equal(view.state,'ready');
  assert.deepEqual(items(view).map(item=>item.id).sort(),[...expectedIds].sort());
  const timeout=Math.max(1,deadline-performance.now());
  const rendered=rows==='[data-private-view="notifications"] [data-inbox-row]'
   ?await page.waitForFunction(count=>document.querySelectorAll('[data-private-view="notifications"] [data-inbox-row]').length===count,expectedIds.length,{timeout})
   :await page.waitForFunction(({count,rows})=>document.querySelectorAll(rows).length===count,{count:expectedIds.length,rows},{timeout});
  await rendered.dispose();
  return view;
 },deadline);
}

export async function withActorRole(query, actor, role, originalRole, read) {
 await query('UPDATE employees SET role=$1 WHERE id=$2',[role,actor]);
 try { return await read(); }
 finally { await query('UPDATE employees SET role=$1 WHERE id=$2',[originalRole,actor]); }
}
