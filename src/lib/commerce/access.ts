export type CommerceAuthority = {
  operational: boolean;
  state: string;
  validUntil: number;
  employeeLimit?: number;
  reason?: unknown;
  trialEndsAt?: unknown;
};
let cached: { key: string; authority: CommerceAuthority } | null = null;
export function resetCommerceAccessCache() {
  cached = null;
}
export function commerceEnabled() {
  return process.env.NEVORA_COMMERCE_ENABLED === "true";
}
export function commerceConnection() {
  const origin = process.env.NEVORA_COMMERCE_API_ORIGIN ?? "",
    installationId = process.env.NEVORA_COMMERCE_INSTALLATION_ID ?? "",
    secret = process.env.NEVORA_COMMERCE_INSTANCE_SECRET ?? "";
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    url.origin !== origin ||
    !installationId ||
    !/^[A-Za-z0-9_-]{43}$/.test(secret)
  )
    throw Error("commerce_not_configured");
  return { origin, installationId, secret };
}
export async function currentCommerceConnection():Promise<{origin:string;installationId:string;secret:string;businessId?:string;role?:'APP'|'WORKER';companyOrigin?:string;incarnation?:string;assertCurrent?:()=>Promise<void>}> {
 const mode=process.env.NEVORA_WORKSPACE_MODE??'single_company';
 if(mode==='single_company')return commerceConnection();
 if(mode!=='isolated')throw Error('commerce_not_configured');
 return (await import('./isolated-connection.server')).isolatedCommerceConnection();
}
export function publicOnboardingPath(path:string){
 return /^\/api\/onboarding\/(?:config|registrations(?:\/current)?|verification|workspaces|bootstrap-grants|owner-activation|operations\/(?:current|[a-f0-9-]{36}))$/.test(path);
}
export async function readCommerceAuthority(
  fetcher: typeof fetch = fetch,
): Promise<CommerceAuthority> {
  const c = await currentCommerceConnection(),
    key = `${c.origin}:${c.installationId}:${c.secret}`;
  const entry=cached;
  if (entry?.key === key && entry.authority.validUntil > Date.now()) {
    await c.assertCurrent?.();
    if (entry.authority.validUntil <= Date.now()) throw Error("invalid_commerce_authority");
    return entry.authority;
  }
  const authority = await fetchCommerceAuthority(c, fetcher);
  cached = { key, authority };
  return authority;
}
/** Fresh server authority for the authenticated billing bridge; never use a
 * cached operational grant to present an Owner's current billing state. */
export async function fetchCommerceAuthority(
  c: Awaited<ReturnType<typeof currentCommerceConnection>>,
  fetcher: typeof fetch = fetch,
): Promise<CommerceAuthority & Record<string, unknown>> {
  const response = await fetcher(`${c.origin}/internal/access`, {
    headers: {
      authorization: `Bearer ${c.secret}`,
      "x-nevora-installation": c.installationId,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw Error("commerce_unavailable");
  const value = await response.json();
  if (
    (c.businessId!==undefined&&(value.businessId!==c.businessId||value.installationId!==c.installationId)) ||
    typeof value.operational !== "boolean" ||
    typeof value.state !== "string" ||
    !Number.isFinite(value.validUntil) ||
    value.validUntil <= Date.now() ||
    value.validUntil > Date.now() + 61000
  )
    throw Error("invalid_commerce_authority");
  await c.assertCurrent?.();
  if (value.validUntil <= Date.now()) throw Error("invalid_commerce_authority");
  return Object.freeze(value);
}
export async function requireOperationalCommerce() {
  if (commerceEnabled() && !(await readCommerceAuthority()).operational)
    throw Error("commerce_subscription_required");
}
/** Tablet-safe recovery only. The return path is a bounded local Clocker key;
 * request query strings and caller-provided destinations are never forwarded. */
export const CLOCKER_PAUSED_PATH='/clocker/access/paused';
export const APP_BILLING_RECOVERY_PATH='/app/billing';
/** Jose's trial-expiry exception admits existing tablet handlers, never an
 * operational grant. Their authenticated SQL writer fences the recorded shift. */
export function trialContinuationEnd(authority:CommerceAuthority,now=Date.now()):number|null {
  if(authority.operational||authority.state!=='restricted'||authority.reason!=='trial_ended'||typeof authority.trialEndsAt!=='string')return null;
  const end=Date.parse(authority.trialEndsAt);
  return Number.isFinite(end)&&new Date(end).toISOString()===authority.trialEndsAt&&end<=now?end:null;
}
export function clockerContinuationPath(path:string,method:string):boolean {
  const key='[a-z0-9]+(?:-[a-z0-9]+)*';
  const match=method==='GET'?new RegExp('^/clocker/('+key+')(?:/manifest\\.webmanifest)?$').exec(path)
    :method==='POST'?new RegExp('^/api/clocker/('+key+')/(?:setup|pin|punch)$').exec(path):null;
  return Boolean(match&&match[1].length<=64);
}
export function commerceDenial(path:string,method:string,code:'subscription_required'|'billing_status_unavailable',request?:Request):Response {
  const appPage=path==='/app'||path.startsWith('/app/');
  const appApi=path==='/app/api'||path.startsWith('/app/api/');
  const accepted=(request?.headers.get('accept')??'').split(',').map(part=>{
    const [type,...parameters]=part.trim().toLowerCase().split(';');
    const weights=parameters.map(value=>value.trim()).filter(value=>value.startsWith('q='));
    const quality=weights.length===0?1:weights.length===1&&/^q=(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(weights[0])?Number(weights[0].slice(2)):0;
    return {type:type.trim(),quality};
  });
  const html=accepted.some(value=>value.type==='text/html'&&value.quality>0);
  const refusedHtml=accepted.some(value=>value.type==='text/html')&&!html;
  const dataRequest=request?.headers.has('rsc')||accepted.some(value=>value.quality>0&&
    (value.type==='application/json'||value.type.endsWith('+json')||value.type==='text/x-component'));
  const document=request&&!dataRequest&&!refusedHtml&&(request.headers.get('sec-fetch-mode')==='navigate'||html);
  if(request&&method==='GET'&&appPage&&!appApi&&path!==APP_BILLING_RECOVERY_PATH&&document){
    return new Response(null,{status:303,headers:{
      location:new URL(APP_BILLING_RECOVERY_PATH+'?'+new URLSearchParams({reason:code}),request.url).href,
      'cache-control':'no-store','referrer-policy':'no-referrer',
    }});
  }
  const locationKey=path.startsWith('/clocker/')?path.slice('/clocker/'.length):'';
  if(request&&method==='GET'&&locationKey.length<=64&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey)&&!request.headers.get('accept')?.includes('application/json')){
    const query=new URLSearchParams({reason:code,from:path});
    return new Response(null,{status:303,headers:{location:new URL(CLOCKER_PAUSED_PATH+'?'+query,request.url).href,'cache-control':'no-store','referrer-policy':'no-referrer'}});
  }
  return Response.json({error:{code}},{status:code==='subscription_required'?402:503,headers:{'cache-control':'no-store'}});
}
export async function commerceGate(
  path: string,
  method: string,
  fetcher: typeof fetch = fetch,
  request?: Request,
): Promise<Response | null> {
  if (!commerceEnabled()) return null;
  if(publicOnboardingPath(path))return null;
  if(path===CLOCKER_PAUSED_PATH&&method==='GET')return null;
  if (
    path.startsWith("/api/commerce/") ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/passkeys/")
  )
    return null;
  if (
    (method === "POST" &&
      ["/api/payroll-export", "/api/timecards"].includes(path)) ||
    (method === "GET" &&
      (path === "/api/payroll-export" ||
        path === "/api/payroll-export/profiles" ||
        path === "/api/company-access/operational-authority" ||
        path === "/api/payroll/statements" ||
        path === "/api/payroll/portal-statements" ||
        path.startsWith("/api/payroll/documents/") ||
        path === "/app/payroll-export" ||
        path === "/app/my-pay" ||
        path === "/app/billing" ||
        path === "/app/pay"))
  )
    return null;
  try {
    const authority=await readCommerceAuthority(fetcher);
    if (authority.operational) return null;
    if(trialContinuationEnd(authority)!==null&&clockerContinuationPath(path,method))return null;
    return commerceDenial(path,method,'subscription_required',request);
  } catch {
    return commerceDenial(path,method,'billing_status_unavailable',request);
  }
}
