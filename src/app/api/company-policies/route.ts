import { parseCompanyPolicyCommand } from "@/lib/business-improvements/company-policies/model";
import {failed} from '@/lib/observability/log.server';
import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import {
  readCompanyPolicyHistory,
  saveCompanyPolicy,
} from "@/lib/business-improvements/company-policies/service";
import {
  correctionBoundary,
  correctionJson,
  readCorrectionJson,
} from "@/lib/time-corrections/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Private Owner recovery read; ready describes the read, not policy validity.
 * Each scope/revision has its own explicit validity state. */
export async function GET(request: Request) {
  const boundary = correctionBoundary(request, false, "x-nevora-company-policies");
  if (boundary) return correctionJson({ state: "unavailable" }, boundary);
  try {
    const session = await getSession();
    if (!session) return correctionJson({ state: "unavailable" }, 401);
    if (session.role !== "OWNER") return correctionJson({ state: "unavailable" }, 403);
    const history = await readCompanyPolicyHistory(await requireSessionMutationProof());
    return correctionJson({ state: "ready", history });
  } catch(error){return failed('/api/company-policies',error,correctionJson({ state: "unavailable" },503));}
}
export async function POST(request: Request) {
  const boundary = correctionBoundary(
    request,
    true,
    "x-nevora-company-policies",
    65536,
  );
  if (boundary) return correctionJson({ state: "unavailable" }, boundary);
  try {
    const session = await getSession();
    if (!session) return correctionJson({ state: "unavailable" }, 401);
    if (session.role !== "OWNER")
      return correctionJson({ state: "unavailable" }, 403);
    let command;
    try {
      command = parseCompanyPolicyCommand(
        await readCorrectionJson(request, 65536),
      );
    } catch {
      return correctionJson(
        {
          state: "invalid",
          message:
            "Review configured thresholds, effective timestamps and rule bases.",
        },
        400,
      );
    }
    const result = await saveCompanyPolicy(
      await requireSessionMutationProof(),
      command,
    );
    return correctionJson({ state: "saved", result });
  } catch (error) {
    const message = String(error);
    return correctionJson(
      { state: /conflict/i.test(message) ? "conflict" : "unavailable" },
      /conflict/i.test(message) ? 409 : 503,
    );
  }
}
