import { PayrollError } from "@/lib/payroll/model";

/** Why opening a statement failed, as the person can act on it. Only a stored-content hash mismatch is `integrity`;
 * a missing, unpublished, coworker's or turned-off statement is `unavailable`; anything else (database, lock,
 * payroll turned off, transport) is `temporary`, never reported as a file-check failure. */
export type DocumentFailure = "signed_out" | "unavailable" | "integrity" | "temporary";
export function documentFailure(error: unknown): DocumentFailure {
  if (error instanceof PayrollError && error.code === "DOCUMENT_UNAVAILABLE") return error.status === 503 ? "integrity" : "unavailable";
  return "temporary";
}

/** A person opening a statement (a link, a new tab) is a browser navigation, and a JSON error there is a dead end.
 * Employees and Leads go back to My pay, which explains the failure. Without a session the role is unknown, so any
 * navigation goes to sign-in and returns to My pay (statements are opened from My pay). Scripted reads and signed-in
 * management keep the JSON contract. Rejected cross-site or malformed requests never reach this. */
export function navigationFailure(request: Request, failure: DocumentFailure, role: string | null): Response | null {
  const mode = request.headers.get("sec-fetch-mode");
  const navigation = mode ? mode === "navigate" : (request.headers.get("accept") ?? "").includes("text/html");
  if (!navigation) return null;
  const to = (path: string) => new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  if (failure === "signed_out") return to("/login?returnTo=%2Fapp%2Fmy-pay");
  if (role !== "EMPLOYEE" && role !== "LEAD") return null;
  return to(`/app/my-pay?document=${failure === "integrity" ? "failed" : failure}`);
}
