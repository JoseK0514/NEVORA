import {applicationSql} from "@/lib/data/app-sql";
import { createHash, timingSafeEqual } from "node:crypto";
import { queryRows } from "@/lib/db";
import { currentCommerceConnection, commerceEnabled } from "@/lib/commerce/access";
export async function POST(request: Request) {
  if (!commerceEnabled())
    return Response.json({ error: { code: "not_enabled" } }, { status: 404 });
  try {
    const c = await currentCommerceConnection(),
      expected = createHash("sha256").update(`Bearer ${c.secret}`).digest(),
      provided = createHash("sha256")
        .update(request.headers.get("authorization") ?? "")
        .digest();
    if (!timingSafeEqual(expected, provided))
      return Response.json(
        { error: { code: "unauthorized" } },
        { status: 401 },
      );
    const reader = request.body?.getReader();
    let raw = "";
    if (reader)
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        raw += Buffer.from(part.value).toString("utf8");
        if (raw.length > 1024) {
          await reader.cancel();
          return Response.json(
            { error: { code: "body_too_large" } },
            { status: 413 },
          );
        }
      }
    const body = JSON.parse(raw);
    if (
      ![15, 30].includes(body.employeeLimit) ||
      typeof body.businessId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.businessId)
    )
      return Response.json(
        { error: { code: "invalid_policy" } },
        { status: 400 },
      );
    const hash = createHash("sha256").update(c.secret).digest("hex");
    const result = queryRows(
      c.businessId ? await applicationSql().query(
        "SELECT $1::text business_id WHERE nevora_commerce_apply_capacity($1,$2,$3,$4)",
        [body.businessId,c.installationId,c.secret,body.employeeLimit]
      ) : await applicationSql().query(
        "UPDATE public.nevora_commerce_installation SET employee_limit=$1 WHERE singleton AND business_id=$2 AND installation_id=$3 AND instance_secret_hash=$4 RETURNING business_id",
        [body.employeeLimit, body.businessId, c.installationId, hash],
      ),
    );
    if (result.length !== 1) throw Error("binding_unavailable");
    return Response.json(
      { state: "applied" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: { code: "policy_unavailable" } },
      { status: 503 },
    );
  }
}
