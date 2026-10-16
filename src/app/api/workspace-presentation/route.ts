import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import { parsePresentationCommand } from "@/lib/workspace-presentation/model";
import { saveWorkspacePresentation } from "@/lib/workspace-presentation/service";
import { correctionBoundary, correctionJson, readCorrectionJson } from "@/lib/time-corrections/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner-only save of the company brand colour and logo choice. The server
 * re-derives every colour from the seed; the editor's preview is advisory. */
export async function POST(request: Request) {
  const boundary = correctionBoundary(request, true, "x-nevora-presentation", 4096);
  if (boundary) return correctionJson({ state: "unavailable" }, boundary);
  try {
    const session = await getSession();
    if (!session) return correctionJson({ state: "unavailable" }, 401);
    if (session.role !== "OWNER") return correctionJson({ state: "unavailable" }, 403);
    let command;
    try { command = parsePresentationCommand(await readCorrectionJson(request, 4096)); }
    catch { return correctionJson({ state: "invalid", message: "Choose a colour like #1D4ED8." }, 400); }
    const result = await saveWorkspacePresentation(await requireSessionMutationProof(), command);
    return correctionJson({ state: "saved", result });
  } catch (error) {
    const message = String(error);
    if (/conflict/i.test(message)) return correctionJson({ state: "conflict" }, 409);
    if (/access_denied/i.test(message)) return correctionJson({ state: "unavailable" }, 403);
    return correctionJson({ state: "unavailable" }, 503);
  }
}
