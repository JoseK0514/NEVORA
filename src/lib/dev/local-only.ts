/** Development helpers use exact loopback hosts, never suffix matching. */
const hosts=/* @__PURE__ */ new Set(['localhost','127.0.0.1','[::1]']);
export type LocalCaptureContext={kind:'request';headers:Pick<Headers,'get'>}|{kind:'cli'};
export function loopbackOrigin(value:string|undefined):boolean {
  try {const u=new URL(value??'');return ['http:','https:'].includes(u.protocol)&&hosts.has(u.hostname)&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash;}catch{return false;}
}
export function localRequest(headers:Pick<Headers,'get'>):boolean {
  const host=headers.get('host');
  if(!host||!loopbackOrigin('http://'+host))return false;
  const forwardedHost=headers.get('x-forwarded-host');
  if(forwardedHost&&forwardedHost!==host)return false;
  const forwarded=headers.get('x-forwarded-for');
  if(forwarded&&!forwarded.split(',').every(v=>hosts.has(v.trim())))return false;
  if(headers.get('forwarded'))return false;
  const origin=headers.get('origin');
  return !origin||loopbackOrigin(origin);
}
export function localDevEnabled(env:Record<string,string|undefined>,flag:string):boolean {
  return process.env.NODE_ENV!=='production'&&env.NODE_ENV!=='production'&&env[flag]==='1';
}
