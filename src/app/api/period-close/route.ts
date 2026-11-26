import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import { payrollExportLaunchRefusal } from "@/lib/payroll-export/launch-guard.server";
import {
  readPeriodClose,
  readPeriodCloseHistory,
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
  try {
    const session = await getSession();
    if (!session) return correctionJson({ state: "unavailable" }, 401);
    if (
      !["OWNER", "MANAGER"].includes(session.role) ||
      request.headers.get("x-nevora-actor") !== session.id
    )
      return correctionJson({ state: "unavailable" }, 403);
    const body = (await readCorrectionJson(request, 262144)) as {
      action?: string;
      command?: unknown;
    };
    if (body.action === "MANIFEST" || body.action === "HANDOFF") {
      const launchRefusal = payrollExportLaunchRefusal();
      if (launchRefusal) return launchRefusal;
    }
    const proof = await requireSessionMutationProof();
    const result =
      body.action === "HISTORY"
        ? await readPeriodCloseHistory(proof,body.command)
        : body.action === "READ"
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
    if (excludeWithTime)
      return correctionJson(
        {
          state: "invalid",
          message:
            "Someone you're leaving out of pay has recorded hours. Only an Owner can do that, with a reason of at least 10 characters.",
        },
        400,
      );
    return correctionJson(
      {
        state: conflict ? "conflict" : invalid ? "invalid" : "unavailable",
        message: conflict
          ? "The people, approved time or selected export changed. Refresh and review them again."
          : invalid
            ? "Review each person, explain any exclusions and confirm their employment details."
            : "We could not confirm the result. Try the same request again.",
      },
      conflict ? 409 : invalid ? 400 : 503,
    );
  }
}
