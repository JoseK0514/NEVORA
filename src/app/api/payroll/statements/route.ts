import { failure, handle, json } from "@/lib/payroll/http";
import { getSession } from "@/lib/auth/session";
import { moduleState } from "@/lib/workspace-presentation/current.server";
import { statements } from "@/lib/payroll/access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = async (request: Request) => {
  // Pay statements turned off by the company (B2): employees see hours instead. B18: these reads run inside a try,
  // so a database failure answers with the JSON contract instead of an uncaught HTML 500. B12: a settings read that
  // failed is "try again" (503 SETTINGS_UNAVAILABLE), never "turned off".
  try {
    const session = await getSession();
    if (session && ["EMPLOYEE", "LEAD"].includes(session.role)) {
      const gate = await moduleState("payStatements");
      if (gate === "unknown") return json({ error: "SETTINGS_UNAVAILABLE", message: "Pay statements could not be checked. Try again." }, 503);
      if (gate === "off") return json({ error: "MODULE_OFF", message: "Pay statements are turned off." }, 404);
    }
  } catch (error) {
    return failure(error);
  }
  return handle(request, (proof) => statements(proof));
};
