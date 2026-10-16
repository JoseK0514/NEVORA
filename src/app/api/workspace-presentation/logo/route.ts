import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import { LOGO_PROBLEM_TEXT } from "@/lib/workspace-presentation/logo";
import { parseLogoCommand } from "@/lib/workspace-presentation/model";
import { LogoRejected, uploadWorkspaceLogo } from "@/lib/workspace-presentation/service";
import { correctionBoundary, correctionJson, readCorrectionJson } from "@/lib/time-corrections/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY = 360_200; // a 256 KB image as base64, plus the JSON around it

/** Owner-only logo upload. The image only becomes the company logo when the
 * Owner saves the brand; until then it is an unused, immutable asset. */
export async function POST(request: Request) {
  const boundary = correctionBoundary(request, true, "x-nevora-presentation", MAX_BODY);
  if (boundary) return correctionJson({ state: "unavailable" }, boundary);
  try {
    const session = await getSession();
    if (!session) return correctionJson({ state: "unavailable" }, 401);
    if (session.role !== "OWNER") return correctionJson({ state: "unavailable" }, 403);
    let command;
    try { command = parseLogoCommand(await readCorrectionJson(request, MAX_BODY)); }
    catch { return correctionJson({ state: "invalid", message: LOGO_PROBLEM_TEXT.too_large }, 400); }
    const result = await uploadWorkspaceLogo(await requireSessionMutationProof(), command);
    return correctionJson({ state: "saved", result });
  } catch (error) {
    if (error instanceof LogoRejected) return correctionJson({ state: "invalid", message: LOGO_PROBLEM_TEXT[error.problem] }, 400);
    const message = String(error);
    if (/conflict/i.test(message)) return correctionJson({ state: "conflict" }, 409);
    if (/access_denied/i.test(message)) return correctionJson({ state: "unavailable" }, 403);
    return correctionJson({ state: "unavailable" }, 503);
  }
}
