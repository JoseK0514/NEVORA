import { requireSessionMutationProof } from "@/lib/auth/session";
import { readPeriodArtifact } from "@/lib/period-close/service";
import {
  correctionResponseHeaders,
  correctionJson,
} from "@/lib/time-corrections/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return correctionJson({ state: "unavailable" }, 403);
  const params = new URL(request.url).searchParams,
    format = params.get("format");
  if (!["manifest", "csv", "canonical"].includes(format ?? ""))
    return correctionJson({ state: "invalid" }, 400);
  try {
    const artifact = await readPeriodArtifact(
      await requireSessionMutationProof(),
      params.get("id") ?? "",
      format as "manifest" | "csv" | "canonical",
      Number(params.get("index") ?? 0),
    );
    return new Response(artifact.content, {
      headers: {
        ...correctionResponseHeaders,
        "Content-Type": artifact.contentType,
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
        "X-Artifact-SHA256": artifact.sha256,
      },
    });
  } catch {
    return correctionJson({ state: "unavailable" }, 403);
  }
}
