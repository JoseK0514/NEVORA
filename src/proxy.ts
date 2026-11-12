import type { NextRequest } from "next/server";
import { APP_BILLING_RECOVERY_PATH,CLOCKER_PAUSED_PATH,commerceGate,commerceDenial,commerceEnabled,publicOnboardingPath } from "./lib/commerce/access";
/** Billing enrollment is opt-in; all normal application authorization remains in place. */
export async function proxy(request: NextRequest) {
  // These exact recovery GETs retain normal page/session/role checks, but must
  // not depend on the commerce binding whose failure they explain.
  if(!commerceEnabled()||request.nextUrl.pathname.startsWith('/api/billing/')||publicOnboardingPath(request.nextUrl.pathname)||(request.method==='GET'&&[CLOCKER_PAUSED_PATH,APP_BILLING_RECOVERY_PATH].includes(request.nextUrl.pathname)))return undefined;
  if(process.env.NEVORA_WORKSPACE_MODE==='isolated'){
    if(request.nextUrl.pathname.startsWith('/api/auth/')||request.nextUrl.pathname.startsWith('/api/passkeys/'))return undefined;
    try{return await (await import('./lib/commerce/isolated-connection.server')).withCommerceRequest(request,async()=>await commerceGate(request.nextUrl.pathname,request.method,fetch,request)??undefined);}
    catch{return commerceDenial(request.nextUrl.pathname,request.method,'billing_status_unavailable',request);}
  }
  return await commerceGate(request.nextUrl.pathname,request.method,fetch,request)??undefined;
}
export const config = {
  matcher: ["/app/:path*", "/api/:path*", "/clocker/:path*"],
};
