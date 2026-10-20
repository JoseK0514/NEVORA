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

export async function withActorRole(query, actor, role, originalRole, read) {
 await query('UPDATE employees SET role=$1 WHERE id=$2',[role,actor]);
 try { return await read(); }
 finally { await query('UPDATE employees SET role=$1 WHERE id=$2',[originalRole,actor]); }
}
