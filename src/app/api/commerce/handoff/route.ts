import { readSessionMutationProof } from "@/lib/auth/session";
import { getDb, queryRows } from "@/lib/db";
import { commerceConnection, commerceEnabled } from "@/lib/commerce/access";
export async function POST(request: Request) {
  if (!commerceEnabled())
    return Response.json({ error: { code: "not_enabled" } }, { status: 404 });
  if (
    !process.env.FUEL_PORTAL_ORIGIN ||
    request.headers.get("origin") !== process.env.FUEL_PORTAL_ORIGIN
  )
    return Response.json({ error: { code: "origin_denied" } }, { status: 403 });
  const session = await readSessionMutationProof();
  if (session?.employee.role !== "OWNER")
    return Response.json(
      { error: { code: "owner_required" } },
      { status: 403 },
    );
  try {
    const c = commerceConnection();
    const response = await fetch(`${c.origin}/internal/handoff`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${c.secret}`,
        "x-nevora-installation": c.installationId,
      },
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw Error("unavailable");
    const result = await response.json();
    if (
      typeof result.handoff !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(result.handoff)
    )
      throw Error("invalid_handoff");
    const current = queryRows(
      await getDb().query(
        `SELECT e.id FROM employee_sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp() AND e.active AND e.role='OWNER' AND e.id=$2`,
        [session.sessionTokenHash, session.employee.id],
      ),
    );
    if (current.length !== 1)
      return Response.json(
        { error: { code: "owner_required" } },
        { status: 403, headers: { "cache-control": "no-store" } },
      );
    return Response.json(
      {
        url: `https://www.thevelani.com/pages/plans#handoff=${result.handoff}`,
      },
      {
        headers: {
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
        },
      },
    );
  } catch {
    return Response.json(
      { error: { code: "billing_unavailable" } },
      { status: 503 },
    );
  }
}
