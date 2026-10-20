import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import { boundary, failure, headers, json } from "@/lib/payroll/http";
import { document } from "@/lib/payroll/access";
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
  try {
    if (!(await getSession()))
      return json(
        { error: "AUTHENTICATION_REQUIRED", message: "Sign in again." },
        401,
      );
    const d = await document(
      await requireSessionMutationProof(),
      (await context.params).id,
    );
    return new Response(new Uint8Array(d.bytes), {
      headers: {
        ...headers,
        "Content-Type": d.contentType,
        "Content-Disposition": `inline; filename="${d.filename}"`,
        "X-Content-SHA256": d.sha256,
        "Content-Security-Policy":"frame-ancestors 'self'",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
