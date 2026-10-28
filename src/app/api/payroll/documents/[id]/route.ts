import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import { boundary, failure, headers, json } from "@/lib/payroll/http";
import { document } from "@/lib/payroll/access";
import { moduleEnabled } from "@/lib/workspace-presentation/current.server";
import { navigationFailure } from "../navigation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const rejected = boundary(request, false, false, true);
  if (rejected)
    return json(
      { error: "REQUEST_REJECTED", message: "Request unavailable." },
      rejected,
    );
  let role: string | null = null;
  try {
    const session = await getSession();
    if (!session)
      return navigationFailure(request, 401, null) ?? json(
        { error: "AUTHENTICATION_REQUIRED", message: "Sign in again." },
        401,
      );
    role = session.role;
    if (["EMPLOYEE", "LEAD"].includes(session.role) && !(await moduleEnabled("payStatements")))
      return navigationFailure(request, 404, role) ?? json({ error: "MODULE_OFF", message: "Pay statements are turned off." }, 404);
    const d = await document(
      await requireSessionMutationProof(),
      (await context.params).id,
    );
    return new Response(new Uint8Array(d.bytes), {
      headers: {
        ...headers,
        "Content-Type": d.contentType,
        "Content-Disposition": `attachment; filename="${d.filename}"`,
        "X-Content-SHA256": d.sha256,
      },
    });
  } catch (error) {
    const response = failure(error);
    return navigationFailure(request, response.status, role) ?? response;
  }
}
