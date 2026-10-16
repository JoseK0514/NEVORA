import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import { parsePresentationCommand } from "@/lib/workspace-presentation/model";
import { ModuleBusy, saveWorkspacePresentation } from "@/lib/workspace-presentation/service";
import { blockerText } from "@/lib/workspace-presentation/modules";
import { correctionBoundary, correctionJson, readCorrectionJson } from "@/lib/time-corrections/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Owner-only save of one presentation section: the brand (colour and logo),
 * the vocabulary, or the modules. The server re-derives every colour and
 * refuses to turn a module off while its requests are still waiting. */
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
    if (error instanceof ModuleBusy) return correctionJson({ state: "busy", module: error.module, count: error.count, message: blockerText(error.module, error.count) }, 409);
    const message = String(error);
    if (/conflict/i.test(message)) return correctionJson({ state: "conflict" }, 409);
    if (/access_denied/i.test(message)) return correctionJson({ state: "unavailable" }, 403);
    return correctionJson({ state: "unavailable" }, 503);
  }
}
