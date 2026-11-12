import { readSessionMutationProof } from "@/lib/auth/session";
import { readBillingOwnerBinding } from "@/lib/commerce/owner-binding";
import { currentCommerceConnection, commerceEnabled, fetchCommerceAuthority } from "@/lib/commerce/access";
import { parseCommerceStatus } from "@/lib/commerce/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "cache-control": "no-store", "referrer-policy": "no-referrer", vary: "Cookie, Origin" };
  const error = (code: string, status: number) => Response.json({ error: { code } }, { status, headers });
  if (!commerceEnabled()) return error("not_enabled", 404);
  if (new URL(request.url).search) return error("invalid_request", 400);
  try {
    const connection = await currentCommerceConnection();
    const origin = connection.companyOrigin ?? process.env.FUEL_PORTAL_ORIGIN;
    let configuredHost: string | null = null;
    try {
      if (origin) {
        const configured = new URL(origin);
        const local = process.env.NODE_ENV !== "production" && configured.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(configured.hostname);
        if (configured.origin === origin && (configured.protocol === "https:" || local)) configuredHost = configured.host;
      }
    } catch { /* An invalid configured origin is never an allowed host. */ }
    // Next may reconstruct a localhost URL. Use its transport Host, never a
    // caller's forwarded-host override; Origin/fetch-site and session follow.
    const host = request.headers.get("host") ?? new URL(request.url).host;
    if (!configuredHost || host.toLowerCase() !== configuredHost.toLowerCase() ||
      (request.headers.has("origin") && request.headers.get("origin") !== origin) ||
      (request.headers.has("sec-fetch-site") && !["same-origin", "none"].includes(request.headers.get("sec-fetch-site")!)))
      return error("origin_denied", 403);
    const proof = await readSessionMutationProof();
    if (!proof) return error("unauthorized", 401);
    if (proof.employee.role !== "OWNER") return error("owner_required", 403);
    const initial = await readBillingOwnerBinding(proof, connection);
    if (!initial) return error("owner_required", 403);
    const authority = await fetchCommerceAuthority(connection);
    if (authority.businessId !== initial.business_id || authority.installationId !== connection.installationId)
      throw Error("installation_identity_mismatch");
    const current = await readBillingOwnerBinding(proof, connection);
    if (!current || current.business_id !== initial.business_id || current.owner_generation !== initial.owner_generation)
      return error("owner_required", 403);
    await connection.assertCurrent?.();
    if (authority.validUntil <= Date.now()) throw Error("invalid_commerce_authority");
    return Response.json(parseCommerceStatus(authority), { headers });
  } catch {
    return error("billing_status_unavailable", 503);
  }
}
