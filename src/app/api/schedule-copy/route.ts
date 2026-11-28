import { isCopyOperationId, parseCopyCommand } from "@/lib/scheduling/copy-command";
import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import {
  executeScheduleCopy,
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
  let operationId: string | undefined;
  try {
    const session = await getSession();
    if (!session) return correctionJson({ state: "unavailable" }, 401);
    if (
      !["OWNER", "MANAGER"].includes(session.role) ||
      request.headers.get("x-nevora-actor") !== session.id
    )
      return correctionJson({ state: "unavailable" }, 403);
    const proof = await requireSessionMutationProof();
    const body = await readCorrectionJson(request);
    let command;
    if (body && typeof body === "object" && "recover" in body) {
      if (!isCopyOperationId(body.recover)) return correctionJson({ state: "invalid" }, 400);
      command = await readScheduleCopyCommand(proof, body.recover);
      if (!command) return correctionJson({ state: "unconfirmed" }, 404);
    } else {
      try {
        command = parseCopyCommand(body);
      } catch {
        const id = body && typeof body === "object" && "operationId" in body ? body.operationId : undefined;
        return correctionJson({ state: "invalid", ...(isCopyOperationId(id) ? { operationId: id } : {}) }, 400);
      }
    }
    operationId = command.operationId;
    const receipt = await executeScheduleCopy(proof, command);
    return correctionJson({
      state: "complete",
      operationId: receipt.operationId,
    });
  } catch (error) {
    if (operationId && error instanceof Error && error.message === "COPY_COMMAND_CONFLICT") {
      return correctionJson({ state: "conflict", operationId }, 409);
    }
    return correctionJson({ state: "unconfirmed" }, 503);
  }
}
