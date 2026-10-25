import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import {
  executeScheduleCopy,
  parseCopyCommand,
  readScheduleCopyCommand,
} from "@/lib/data/schedule-copy";
import {
  correctionBoundary,
  correctionJson,
  readCorrectionJson,
} from "@/lib/time-corrections/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Executes or recovers a copy operation with fresh proof. Recovery loads the
 * stored command by its original ID before re-execution; it must not rebuild
 * the command from current UI defaults. Unconfirmed responses preserve that ID
 * for later reconciliation and do not establish that nothing was written.
 */
export async function POST(request: Request) {
  const boundary = correctionBoundary(request, true, "x-nevora-schedule-copy");
  if (boundary) return correctionJson({ state: "unavailable" }, boundary);
  try {
    const session = await getSession();
    if (!session) return correctionJson({ state: "unavailable" }, 401);
    if (
      !["OWNER", "MANAGER"].includes(session.role) ||
      request.headers.get("x-nevora-actor") !== session.id
    )
      return correctionJson({ state: "unavailable" }, 403);
    const proof = await requireSessionMutationProof();
    const body = (await readCorrectionJson(request)) as { recover?: unknown };
    let command;
    try {
      command =
        typeof body.recover === "string"
          ? await readScheduleCopyCommand(proof, body.recover)
          : parseCopyCommand(body);
    } catch {
      return correctionJson({ state: "invalid" }, 400);
    }
    if (!command) return correctionJson({ state: "unconfirmed" }, 404);
    const receipt = await executeScheduleCopy(proof, command);
    return correctionJson({
      state: "complete",
      operationId: receipt.operationId,
    });
  } catch (error) {
    return correctionJson(
      {
        state: String(error).includes("CONFLICT") ? "conflict" : "unconfirmed",
      },
      String(error).includes("CONFLICT") ? 409 : 503,
    );
  }
}
