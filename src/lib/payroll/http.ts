import { getSession, requireSessionMutationProof } from "../auth/session";
import {
  correctionBoundary,
  correctionJson,
  readCorrectionJson,
  correctionResponseHeaders,
} from "../time-corrections/http.server";
import { PayrollError, uuid } from "./model";
import { enabled } from "./store";
import { failed } from "../observability/log.server";
import type { SessionMutationProof } from "../shift-changes/types";
export const json = correctionJson;
export const headers = correctionResponseHeaders;
export function boundary(
  request: Request,
  write = false,
  receipt = false,
  download = false,
) {
  const url = new URL(request.url);
  if (receipt) {
    if (
      [...url.searchParams.keys()].length !== 1 ||
      !uuid(url.searchParams.get("operationId"))
    )
      return 400;
    url.search = "";
  } else if (url.search) return 400;
  const readHeaders = new Headers(request.headers);
  if (download && !write) {
    const site = readHeaders.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") return 403;
    readHeaders.set("x-nevora-payroll", "1");
    if (site === "none") readHeaders.delete("sec-fetch-site");
  }
  return correctionBoundary(
    new Request(url, { method: request.method, headers: readHeaders }),
    write,
    "x-nevora-payroll",
    1048576,
  );
}
export async function handle(
  request: Request,
  action: (proof: SessionMutationProof, input?: unknown) => Promise<object>,
  write = false,
  recovery = false,
) {
  const rejected = boundary(request, write, recovery);
  if (rejected)
    return json(
      { error: "REQUEST_REJECTED", message: "Request unavailable." },
      rejected,
    );
  try {
    enabled();
    if (!(await getSession()))
      return json(
        { error: "AUTHENTICATION_REQUIRED", message: "Sign in again." },
        401,
      );
    const proof = await requireSessionMutationProof();
    let input: unknown;
    if (write) {
      try {
        input = await readCorrectionJson(request, 1048576);
      } catch {
        throw new PayrollError("INVALID_INPUT", 400);
      }
    }
    return json(await action(proof, input));
  } catch (error) {
    return failure(error);
  }
}
export function failure(error: unknown) {
  if (error instanceof PayrollError)
    return json(
      {
        error: error.code,
        message: error.code.replaceAll("_", " ").toLowerCase(),
        ...(error.issues ? { issues: error.issues } : {}),
      },
      error.status,
    );
  const value = String(error);
  const denied = /authorization/.test(value),
    conflict = /CONFLICT|immutable|duplicate key/.test(value) ||
      (error instanceof Error && error.message === "OVERLAPPING_NATIVE_PAYROLL"),
    invalid = /invalid_body|JSON/.test(value);
  const response = json(
    {
      error: denied
        ? "ACCESS_DENIED"
        : conflict
          ? "PAYROLL_CONFLICT"
          : invalid
            ? "INVALID_INPUT"
            : "PAYROLL_UNAVAILABLE",
      message: denied
        ? "Payroll access is unavailable."
        : conflict
          ? "Reload and review current information."
          : "Request could not be completed.",
    },
    denied ? 403 : conflict ? 409 : invalid ? 400 : 503,
  );
  // B10: an unexpected payroll failure is logged with its code and carries a reference header.
  return response.status === 503 ? failed("/api/payroll", error, response) : response;
}
