import { handle, json } from "@/lib/payroll/http";
import { getSession } from "@/lib/auth/session";
import { moduleEnabled } from "@/lib/workspace-presentation/current.server";
import { statements } from "@/lib/payroll/access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = async (request: Request) => {
  // Pay statements turned off by the company (B2): employees see hours instead.
  const session = await getSession();
  if (session && ["EMPLOYEE", "LEAD"].includes(session.role) && !(await moduleEnabled("payStatements")))
    return json({ error: "MODULE_OFF", message: "Pay statements are turned off." }, 404);
  return handle(request, (proof) => statements(proof));
};
