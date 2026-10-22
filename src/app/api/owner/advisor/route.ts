import { getSession, requireSessionMutationProof } from "@/lib/auth/session";
import { neonNotificationExecutor } from "@/lib/data/sql-executor";
import { isManagementAuthorizationError } from "@/lib/data/management-session";
import { isOperationalAuthorizationError } from "@/lib/company-access/operational-scope.server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import {
  correctionBoundary,
  correctionJson,
} from "@/lib/time-corrections/http.server";
import { advisorService } from "@/lib/owner-advisor/service.server";
import { AdvisorError } from "@/lib/owner-advisor/contracts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readBody(
  request: Request,
  signal: AbortSignal,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new AdvisorError("invalid");
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let body = "";
  try {
    if (signal.aborted) cancel();
    signal.throwIfAborted();
    while (true) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16384) {
        cancel();
        throw new AdvisorError("invalid");
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body);
  } catch {
    cancel();
    if (signal.aborted) throw new AdvisorError("cancelled");
    throw new AdvisorError("invalid");
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

async function execute(request: Request, write: boolean, signal: AbortSignal) {
  signal.throwIfAborted();
  const boundary = correctionBoundary(
    request,
    write,
    "x-nevora-owner-advisor",
    16384,
  );
  if (boundary)
    return correctionJson({ state: "error", code: "invalid" }, boundary);
  const session = await getSession();
  signal.throwIfAborted();
  if (!session)
    return correctionJson({ state: "error", code: "forbidden" }, 401);
  if (session.role !== "OWNER")
    return correctionJson({ state: "error", code: "forbidden" }, 403);
  const proof = await requireSessionMutationProof();
  signal.throwIfAborted();
  if (proof.employee.id !== session.id || proof.employee.role !== "OWNER") {
    return correctionJson({ state: "error", code: "forbidden" }, 403);
  }
  const value = write ? await readBody(request, signal) : undefined;
  signal.throwIfAborted();
  return correctionJson(
    await advisorService(
      proof,
      neonNotificationExecutor(),
      process.env,
      signal,
      value,
    ),
  );
}

async function handle(request: Request, write: boolean) {
  // One entry deadline covers authentication, body consumption and all service work.
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
  let abort = () => {};
  try {
    signal.throwIfAborted();
    return await Promise.race([
      execute(request, write, signal),
      new Promise<never>((_, reject) => {
        abort = () => reject(new AdvisorError("cancelled"));
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
      }),
    ]);
  } catch (error) {
    if (isRedirectError(error))
      return correctionJson({ state: "error", code: "forbidden" }, 401);
    if (
      isManagementAuthorizationError(error) ||
      isOperationalAuthorizationError(error)
    ) {
      return correctionJson({ state: "error", code: "forbidden" }, 403);
    }
    const code =
      error instanceof AdvisorError
        ? error.code
        : error instanceof Error &&
            ["AbortError", "TimeoutError"].includes(error.name)
          ? "cancelled"
          : "unavailable";
    const status =
      code === "forbidden"
        ? 403
        : code === "disabled"
          ? 404
          : code === "invalid"
            ? 400
            : ["conflict", "busy", "prior_attempt_failed"].includes(code)
              ? 409
              : code === "daily_limit"
                ? 429
                : 503;
    return correctionJson({ state: "error", code }, status);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
