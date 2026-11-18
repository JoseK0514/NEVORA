export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness probe for an external uptime monitor.
 *
 * Answers only "this deployment is serving requests". It deliberately reads no
 * session, database, configuration or provider state: a monitor polling every
 * minute must not keep a scale-to-zero database awake (that would bill compute
 * around the clock) and must not learn anything about the workspace. It lives
 * outside `/api` so the commerce proxy matcher never gates it. Database or
 * provider readiness belongs to authenticated operator checks, not this route. */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}

/** HEAD lets lightweight monitors check liveness without a body. */
export function HEAD() {
  return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}
