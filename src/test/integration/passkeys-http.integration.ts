import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server";
import { createDisposableFoundationDatabase } from "./local-postgres";
import { fictionalAuthenticator } from "./passkey-authenticator.test-support";
import type { PasskeyMetadata } from "../../lib/auth/passkeys/types";

const state = vi.hoisted(() => ({ values: new Map<string, string>(), attributes: new Map<string, Record<string, unknown>>() }));
let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (key: string) => state.values.has(key) ? { value: state.values.get(key)! } : undefined,
  set: (key: string, value: string, attributes: Record<string, unknown>) => { state.values.set(key, value); state.attributes.set(key, attributes); },
  delete: (key: string) => state.values.delete(key),
}) }));
vi.mock("@/lib/db", () => ({
  getDb: () => ({ query: (text: string, values: unknown[] = []) => db.executor.query({ text, values }) }),
  queryRows: (value: unknown) => value,
}));
vi.mock("../../lib/data/notification-transactions", async original => ({
  ...await original<typeof import("../../lib/data/notification-transactions")>(), neonNotificationExecutor: () => db.executor,
}));
vi.mock("../../lib/notifications/logout", () => ({
  prepareInstallationForLogin: async () => ({ state: "complete" }), createLogoutDeps: () => ({}), terminatePortalSession: async () => ({}),
}));
import { POST as loginOptions } from "../../app/api/auth/passkey/login/options/route";
import { POST as loginVerify } from "../../app/api/auth/passkey/login/verify/route";
import { POST as registerOptions } from "../../app/api/auth/passkey/register/options/route";
import { POST as registerVerify } from "../../app/api/auth/passkey/register/verify/route";
import { GET as passkeys } from "../../app/api/auth/passkeys/route";
import { DELETE as remove } from "../../app/api/auth/passkeys/[id]/route";

const request = (path: string, body: unknown = {}, headers: Record<string, string> = {}, method = "POST") => new Request("http://localhost:3000" + path, {
  method, headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers },
  ...(method === "GET" || method === "DELETE" ? {} : { body: JSON.stringify(body) }),
});
describe("passkey JSON route contract", () => {
  beforeEach(async () => {
    vi.stubEnv("NEXT_PUBLIC_NEVORA_PASSKEYS", "on"); vi.stubEnv("NODE_ENV", "test");
    state.values.clear(); state.attributes.clear();
    db = await createDisposableFoundationDatabase({ mode: "current-runtime" });
    try {
      const token = Buffer.alloc(32, 5).toString("base64url");
      await db.executor.query({ text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('PK-HTTP','Fictional','HTTP','5550101','EMPLOYEE','loc-1'); INSERT INTO employee_credentials(employee_id,password_hash) VALUES('PK-HTTP','fictional-http-hash')", values: [] });
      await db.executor.query({ text: "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'PK-HTTP',clock_timestamp()+interval '1 hour')", values: [createHash("sha256").update(token).digest("hex")] });
      state.values.set("fuel_session", token);
    } catch (error) { await db.dispose(); throw error; }
  });
  afterEach(async () => { await db?.dispose(); vi.unstubAllEnvs(); });
  it("registers, lists, signs in and removes through all JSON endpoints", async () => {
    const device = fictionalAuthenticator();
    const creationResponse = await registerOptions(request("/api/auth/passkey/register/options"));
    expect(creationResponse.status).toBe(200);
    const creation: PublicKeyCredentialCreationOptionsJSON = await creationResponse.json();
    expect(creation.authenticatorSelection).toMatchObject({ residentKey: "required", userVerification: "required" });
    const registration = await registerVerify(request("/api/auth/passkey/register/verify", { response: device.register(creation.challenge), name: "Fictional phone" }));
    expect(registration.status).toBe(200);
    const { passkey }: { passkey: PasskeyMetadata } = await registration.json();
    expect(Object.keys(passkey).sort()).toEqual(["createdAt", "id", "lastUsedAt", "name"]);
    const list = await passkeys(request("/api/auth/passkeys", {}, {}, "GET"));
    expect(await list.json()).toEqual({ passkeys: [passkey] });
    state.values.delete("fuel_session");
    const optionsResponse = await loginOptions(request("/api/auth/passkey/login/options"));
    expect(optionsResponse.headers.get("cache-control")).toContain("no-store");
    const options: PublicKeyCredentialRequestOptionsJSON = await optionsResponse.json();
    const verified = await loginVerify(request("/api/auth/passkey/login/verify", { response: device.authenticate(options.challenge, creation.user.id) }));
    expect(verified.status).toBe(200); expect(await verified.json()).toEqual({ redirect: "/app" });
    expect(state.attributes.get("fuel_session")).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", secure: false });
    const deleted = await remove(request("/api/auth/passkeys/" + passkey.id, {}, {}, "DELETE"), { params: Promise.resolve({ id: passkey.id }) });
    expect(deleted.status).toBe(204); expect(await deleted.text()).toBe("");
  });
  it.each(["login/options", "login/verify", "register/options", "register/verify"])("uses the feature-off JSON error for %s", async path => {
    vi.stubEnv("NEXT_PUBLIC_NEVORA_PASSKEYS", "off");
    const action = path === "login/options" ? loginOptions : path === "login/verify" ? loginVerify : path === "register/options" ? registerOptions : registerVerify;
    const response = await action(request("/api/auth/passkey/" + path));
    expect(response.status).toBe(404); expect(await response.json()).toEqual({ error: "not_supported" });
  });
  it.each<Record<string, string>>([{ origin: "https://attacker.invalid" }, { "sec-fetch-site": "cross-site" }, { "content-type": "text/plain" }])("rejects unsafe request boundaries %j", async headers => {
    const response = await loginOptions(request("/api/auth/passkey/login/options", {}, headers));
    expect(response.status).toBe(403); expect(await response.json()).toEqual({ error: "not_found" });
  });
  it("requires sign-in for registration and metadata", async () => {
    state.values.delete("fuel_session");
    for (const response of [await registerOptions(request("/api/auth/passkey/register/options")), await passkeys(request("/api/auth/passkeys", {}, {}, "GET"))]) {
      expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: "not_found" });
    }
  });
  it("returns the documented error when a response has no server-side challenge", async () => {
    const response = await loginVerify(request("/api/auth/passkey/login/verify", { response: {} }));
    expect(response.status).toBe(404); expect(await response.json()).toEqual({ error: "not_found" });
  });
});
