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

/** Bounds streamed UTF-8 bytes, not just Content-Length, and releases the reader on abort/error. */
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

/** Owner-only transport adapter; service owns feature switches, operation state and provider work. */
async function execute(request: Request, write: boolean, signal: AbortSignal) {
  signal.throwIfAborted();
  const url = new URL(request.url);
  const view = !write && url.searchParams.size === 1 ? url.searchParams.get("view") : null;
  const selectedView = view === "lease" || view === "detail" ? view : undefined;
  const responseSchema = request.headers.get("x-nevora-owner-advisor-schema");
  if ((url.search && !selectedView) || (responseSchema !== null && responseSchema !== "2")) return correctionJson({ state: "error", code: "invalid" }, 400);
  // The sole validated read selector changes projection, never admission. Keep
  // the shared boundary's header/site checks, without broadening other routes.
  url.search = "";
  const boundaryRequest = selectedView ? new Request(url, { headers: request.headers, signal: request.signal }) : request;
  const boundary = correctionBoundary(
    boundaryRequest,
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
      undefined,
      { ...(selectedView ? { view: selectedView } : {}), ...(responseSchema === "2" ? { responseVersion: 2 as const } : {}) },
    ),
  );
}

/**
 * One cancellation budget spans authentication, streamed body parsing and the
 * advisor call. Race the response as well as passing the signal downstream;
 * non-cooperative pending I/O must not leave the HTTP request waiting forever.
 */
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
