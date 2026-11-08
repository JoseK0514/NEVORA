import type { NextRequest } from "next/server";
import { commerceGate } from "./lib/commerce/access";
/** Billing enrollment is opt-in; all normal application authorization remains in place. */
export async function proxy(request: NextRequest) {
  return (
    (await commerceGate(request.nextUrl.pathname, request.method)) ?? undefined
  );
}
export const config = {
  matcher: ["/app/:path*", "/api/:path*", "/clocker/:path*"],
};
