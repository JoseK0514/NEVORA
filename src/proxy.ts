import {NextResponse, type NextRequest} from "next/server";
import { CLOCKER_PAUSED_PATH,commerceGate,commerceDenial,commerceEnabled,publicOnboardingPath } from "./lib/commerce/access";
import {isCommerceRecoveryRequest, RECOVERY_ROUTE_HEADER} from './lib/commerce/recovery-routes';
import {AUTH_RETURN_TO_HEADER} from './lib/auth/request-destination';
import {safeReturnTo} from './lib/notifications/destinations';
function passThrough(request: NextRequest) {
  const portal = request.nextUrl.pathname === '/app' || request.nextUrl.pathname.startsWith('/app/');
  if (!portal && !request.headers.has(AUTH_RETURN_TO_HEADER)) return undefined;
  const headers = new Headers(request.headers);
  // Derive only from this request's actual route. Referer and forwarded host
  // never establish a destination or evidence that a session existed.
  headers.delete(AUTH_RETURN_TO_HEADER);
  if (!portal) return NextResponse.next({request: {headers}});
  const returnTo = safeReturnTo(request.nextUrl.pathname + request.nextUrl.search);
  if (returnTo) headers.set(AUTH_RETURN_TO_HEADER, returnTo);
  // Never trust a caller's presentation marker, even when commerce is disabled.
  headers.delete(RECOVERY_ROUTE_HEADER);
  if (commerceEnabled() && isCommerceRecoveryRequest(request.nextUrl.pathname,request.method))
    headers.set(RECOVERY_ROUTE_HEADER, request.nextUrl.pathname);
  return NextResponse.next({request: {headers}});
}
/** Billing enrollment is opt-in; all normal application authorization remains in place. */
export async function proxy(request: NextRequest) {
  // These exact recovery requests retain normal page/session/role checks, but must
  // not depend on the commerce binding whose failure they explain.
  if(!commerceEnabled()||request.nextUrl.pathname.startsWith('/api/billing/')||publicOnboardingPath(request.nextUrl.pathname)||isCommerceRecoveryRequest(request.nextUrl.pathname,request.method)||(request.method==='GET'&&request.nextUrl.pathname===CLOCKER_PAUSED_PATH))return passThrough(request);
  if(process.env.NEVORA_WORKSPACE_MODE==='isolated'){
    if(request.nextUrl.pathname.startsWith('/api/auth/')||request.nextUrl.pathname.startsWith('/api/passkeys/'))return passThrough(request);
    try{return await (await import('./lib/commerce/isolated-connection.server')).withCommerceRequest(request,async()=>await commerceGate(request.nextUrl.pathname,request.method,fetch,request)??passThrough(request));}
    catch{return commerceDenial(request.nextUrl.pathname,request.method,'billing_status_unavailable',request);}
  }
  return await commerceGate(request.nextUrl.pathname,request.method,fetch,request)??passThrough(request);
}
export const config = {
  matcher: ["/app/:path*", "/api/:path*", "/clocker/:path*"],
};
