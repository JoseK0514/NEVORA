import {applicationSql} from "@/lib/data/app-sql";
import { createHash, timingSafeEqual } from "node:crypto";
import { queryRows } from "@/lib/db";
import { currentCommerceConnection, commerceEnabled } from "@/lib/commerce/access";
export async function GET(request: Request) {
  if (!commerceEnabled())
    return Response.json({ error: { code: "not_enabled" } }, { status: 404 });
  try {
    const c = await currentCommerceConnection(),
      supplied = createHash("sha256")
        .update(request.headers.get("authorization") ?? "")
        .digest(),
      expected = createHash("sha256").update(`Bearer ${c.secret}`).digest();
    if (!timingSafeEqual(supplied, expected))
      return Response.json(
        { error: { code: "unauthorized" } },
        { status: 401 },
      );
    const hash = createHash("sha256").update(c.secret).digest("hex");
    const rows = queryRows<{
      business_id: string;
      installation_id: string;
      employee_count: number;
    }>(
      await applicationSql().query(
        `SELECT i.business_id,i.installation_id,(SELECT count(*)::int FROM employees WHERE active AND role<>'OWNER') employee_count FROM public.nevora_commerce_installation i JOIN workspaces w ON w.singleton AND w.active WHERE i.singleton AND i.installation_id=$1 AND i.instance_secret_hash=$2`,
        [c.installationId, hash],
      ),
    );
    if (rows.length !== 1) throw Error("installation_not_ready");
    const r = rows[0];
    return Response.json(
      {
        ready: true,
        businessId: r.business_id,
        installationId: r.installation_id,
        employeeCount: r.employee_count,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: { code: "installation_not_ready" } },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
