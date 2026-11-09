import type { NextRequest } from "next/server";
import { CLOCKER_PAUSED_PATH,commerceGate,commerceDenial,commerceEnabled,publicOnboardingPath } from "./lib/commerce/access";
/** Billing enrollment is opt-in; all normal application authorization remains in place. */
export async function proxy(request: NextRequest) {
  if(!commerceEnabled()||request.nextUrl.pathname.startsWith('/api/billing/')||publicOnboardingPath(request.nextUrl.pathname)||(request.method==='GET'&&request.nextUrl.pathname===CLOCKER_PAUSED_PATH))return undefined;
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
