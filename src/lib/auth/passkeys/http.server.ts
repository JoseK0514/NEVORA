import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getSession, requireSessionMutationProof, writeSessionCookie } from "../session";
import { prepareInstallationForLogin } from "../../notifications/logout";
import { correctionJson, readCorrectionJson, correctionResponseHeaders } from "../../time-corrections/http.server";
import { passkeyConfig } from "./config";
import { PasskeyService } from "./service.server";
import { PasskeyError, validateFlowToken } from "./types";

type Action = "login_options" | "login_verify" | "register_options" | "register_verify" | "list" | "remove";
const errorJson = (error: string, status: number) => correctionJson({ error }, status);
const cookieName = (registration: boolean) => registration ? "nevora_pk_register" : "nevora_pk_login";
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function fields(value: unknown, expected: string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).sort().join(",") === expected.sort().join(",");
}

/** Shared same-origin HTTP boundary for passkey ceremonies and management.
 * Separate HttpOnly flow cookies bind login/registration challenges; registration
 * and management additionally require the actual session mutation proof. Login
 * writes the normal session cookie only after the service commits its session. */
export async function passkeyHttp(request: Request, action: Action, id?: string): Promise<Response> {
  const config = passkeyConfig(request.url);
  if (!config) return errorJson("not_supported", 404);
  const method = action === "list" ? "GET" : action === "remove" ? "DELETE" : "POST";
  if (request.method !== method) return errorJson("not_supported", 405);
  const site = request.headers.get("sec-fetch-site"), origin = request.headers.get("origin");
  if ((site && site !== "same-origin") || (origin && origin !== config.origin) || (method !== "GET" && origin !== config.origin))
    return errorJson("not_found", 403);
  if (new URL(request.url).search) return errorJson("not_found", 400);
  if (method === "POST" && request.body && request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return errorJson("not_found", 403);
  try {
    const options = action.endsWith("_options");
    let body: unknown = {};
    if (method === "POST") {
      try { body = options && !request.body ? {} : await readCorrectionJson(request, 65536); }
      catch { return errorJson("not_found", 400); }
      if (!(options ? fields(body, []) : fields(body, action === "register_verify" ? ["response", "name"] : ["response"])))
        return errorJson("not_found", 400);
    }
    const protectedAction = action.startsWith("register") || action === "list" || action === "remove";
    let proof;
    if (protectedAction) {
      if (!(await getSession())) return errorJson("not_found", 401);
      try { proof = await requireSessionMutationProof(); } catch { return errorJson("not_found", 401); }
    }
    const service = new PasskeyService(config);
    if (action === "list" && proof) return correctionJson({ passkeys: await service.list(proof) });
    if (action === "remove" && proof) {
      await service.remove(proof, id ?? "");
      return new Response(null, { status: 204, headers: correctionResponseHeaders });
    }
    const store = await cookies(), registration = action.startsWith("register");
    let token = store.get(cookieName(registration))?.value ?? "";
    if (options) {
      try { validateFlowToken(token); } catch { token = randomBytes(32).toString("base64url"); }
      const result = registration && proof
        ? await service.registrationOptions(proof, token) : await service.loginOptions(token);
      store.set(cookieName(registration), token, { httpOnly: true, secure: process.env.NODE_ENV === "production",
        sameSite: "strict", path: "/", maxAge: 900 });
      return correctionJson(result);
    }
    if (!record(body)) return errorJson("not_found", 400);
    if (action === "register_verify" && proof)
      return correctionJson({ passkey: await service.register(proof, token, body.response, body.name) });
    if (action === "login_verify") {
      const session = await service.login(token, body.response, async employeeId => { await prepareInstallationForLogin(employeeId); });
      await writeSessionCookie(session);
      return correctionJson({ redirect: "/app" });
    }
    return errorJson("not_found", 400);
  } catch (error) {
    if (error instanceof PasskeyError) return errorJson(error.code, error.code === "rate_limited" ? 429 :
      error.code === "account_disabled" ? 403 : error.code === "unavailable" ? 503 : 404);
    return errorJson("unavailable", 503);
  }
}
