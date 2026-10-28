/** A person opening a statement (a link, a new tab) is a browser navigation, and a JSON error there is a dead end.
 * Employees and Leads go back to My pay, which explains the failure; an ended session goes to sign-in and returns
 * to My pay. Scripted reads and management keep the JSON contract. Rejected cross-site or malformed requests never
 * reach this: they stay JSON so no redirect is offered to them. */
export function navigationFailure(request: Request, status: number, role: string | null): Response | null {
  const mode = request.headers.get("sec-fetch-mode");
  const navigation = mode ? mode === "navigate" : (request.headers.get("accept") ?? "").includes("text/html");
  if (!navigation) return null;
  const to = (path: string) => new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  if (status === 401) return to("/login?returnTo=%2Fapp%2Fmy-pay");
  if (role !== "EMPLOYEE" && role !== "LEAD") return null;
  return to(`/app/my-pay?document=${status === 503 ? "failed" : "unavailable"}`);
}
