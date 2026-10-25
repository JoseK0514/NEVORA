import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import {failed} from '@/lib/observability/log.server';
import { isOperationalAuthorizationError, OperationalAuthorizationError } from "@/lib/company-access/operational-scope.server";
import { isManagementAuthorizationError } from "@/lib/data/management-session";
import {
  readPeriodClose,
  savePeriodPopulation,
  preparePeriodManifest,
  recordPeriodHandoff,
} from "@/lib/period-close/service";
import {
  correctionBoundary,
  correctionJson,
  readCorrectionJson,
} from "@/lib/time-corrections/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const boundary = correctionBoundary(
    request,
    true,
    "x-nevora-period-close",
    262144,
  );
  if (boundary) return correctionJson({ state: "unavailable" }, boundary);
  let write = false;
  try {
    const session = await getSession();
    if (!session) return correctionJson({ state: "unavailable" }, 401);
    if (
      !["OWNER", "MANAGER"].includes(session.role) ||
      request.headers.get("x-nevora-actor") !== session.id
    )
      return correctionJson({ state: "unavailable" }, 403);
    // B13: a malformed or non-object body is a client error, never "outcome unconfirmed".
    let parsed: unknown;
    try {
      parsed = await readCorrectionJson(request, 262144);
    } catch {
      return correctionJson({ state: "invalid" }, 400);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return correctionJson({ state: "invalid" }, 400);
    const body = parsed as { action?: string; command?: unknown },
      proof = await requireSessionMutationProof();
    if (!["READ", "POPULATION", "MANIFEST", "HANDOFF"].includes(String(body.action)))
      return correctionJson({ state: "invalid" }, 400);
    write = body.action !== "READ";
    const result =
      body.action === "READ"
        ? await readPeriodClose(
            proof,
            body.command as { startDate: string; endDate: string },
          )
        : body.action === "POPULATION"
          ? await savePeriodPopulation(proof, body.command)
          : body.action === "MANIFEST"
            ? await preparePeriodManifest(proof, body.command)
            : body.action === "HANDOFF"
              ? await recordPeriodHandoff(proof, body.command)
              : null;
    if (!result) return correctionJson({ state: "invalid" }, 400);
    return correctionJson({ state: "ready", result });
  } catch (error) {
    const message = String(error);
    const conflict =
      /CONFLICT|STALE|REOPENED|OMISSION|DUPLICATE|EXTRA|WRONG_PERIOD/.test(
        message,
      );
    const invalid = /INVALID|Review every|ZERO_TIME/.test(message);
    const excludeWithTime = /EXCLUDE_WITH_RECORDED_TIME_REQUIRES_OWNER/.test(message);
    // B13: a permission refusal is a 403 with its reason, not "retry the original operation". For a READ any refusal
    // qualifies. A write is refused this way only by the admission check that runs before anything is written
    // (OperationalAuthorizationError); a refusal from inside or after the transaction can follow a commit (the
    // post-commit Company fence), so it keeps the honest "outcome unconfirmed" answer.
    const denied = isOperationalAuthorizationError(error) || isManagementAuthorizationError(error) || /authorization/.test(message);
    if (denied && (!write || error instanceof OperationalAuthorizationError))
      return correctionJson({ state: "unavailable", reason: "access_denied" }, 403);
    if (excludeWithTime)
      return correctionJson(
        {
          state: "invalid",
          message:
            "Someone you're leaving out of pay has recorded hours. Only an Owner can do that, with a reason of at least 10 characters.",
        },
        400,
      );
    const response = correctionJson(
      {
        state: conflict ? "conflict" : invalid ? "invalid" : "unavailable",
        message: conflict
          ? "Population, finalized revisions or selected export coverage changed. Reload and review."
          : invalid
            ? "Review every member, reason and employment attestation."
            : write
              ? "Outcome unconfirmed. Retry the original operation."
              : "Period close is unavailable right now. Try again.",
      },
      conflict ? 409 : invalid ? 400 : 503,
    );
    return conflict || invalid ? response : failed("/api/period-close", error, response);
  }
}
