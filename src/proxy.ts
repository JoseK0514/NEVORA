import type { NextRequest } from "next/server";
import { commerceGate,commerceEnabled,publicOnboardingPath } from "./lib/commerce/access";
/** Billing enrollment is opt-in; all normal application authorization remains in place. */
export async function proxy(request: NextRequest) {
  if(!commerceEnabled()||request.nextUrl.pathname.startsWith('/api/billing/')||publicOnboardingPath(request.nextUrl.pathname))return undefined;
  if(process.env.NEVORA_WORKSPACE_MODE==='isolated'){
    if(request.nextUrl.pathname.startsWith('/api/auth/')||request.nextUrl.pathname.startsWith('/api/passkeys/'))return undefined;
    try{return await (await import('./lib/commerce/isolated-connection.server')).withCommerceRequest(request,async()=>await commerceGate(request.nextUrl.pathname,request.method)??undefined);}
    catch{return Response.json({error:{code:'billing_status_unavailable'}},{status:503,headers:{'cache-control':'no-store'}});}
  }
  return await commerceGate(request.nextUrl.pathname,request.method)??undefined;
}
export const config = {
  matcher: ["/app/:path*", "/api/:path*", "/clocker/:path*"],
};
