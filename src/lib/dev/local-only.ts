/** Development helpers use exact loopback hosts, never suffix matching. */
const hosts=/* @__PURE__ */ new Set(['localhost','127.0.0.1','[::1]']);
export type LocalCaptureContext={kind:'request';headers:Pick<Headers,'get'>}|{kind:'cli'};
export function loopbackOrigin(value:string|undefined):boolean {
  try {const u=new URL(value??'');return ['http:','https:'].includes(u.protocol)&&hosts.has(u.hostname)&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash;}catch{return false;}
}
/** Admit only an exact loopback Host with compatible forwarding/origin headers.
 * Ambiguous proxy forwarding disables development helpers instead of treating a
 * loopback Origin alone as evidence that the whole request stayed local. */
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
/** Both the real process and supplied environment must be nonproduction; an
 * injected environment cannot enable a development flag in a production process. */
export function localDevEnabled(env:Record<string,string|undefined>,flag:string):boolean {
  return process.env.NODE_ENV!=='production'&&env.NODE_ENV!=='production'&&env[flag]==='1';
}
