import { expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server";
import { createOwnedNextApp } from "./owned-next-app";
import { fictionalAuthenticator } from "./passkey-authenticator.test-support";

it("completes discoverable passkey sign-in through a real owned Next HTTP runtime", async () => {
  const evidence = process.env.NEVORA_PASSKEY_NETWORK_EVIDENCE;
  if (!evidence) throw Error("Select an external evidence directory with NEVORA_PASSKEY_NETWORK_EVIDENCE");
  const app = await createOwnedNextApp(evidence, { passkeysEnabled: true });
  try {
    const q = (text: string, values: unknown[] = []) => app.database.executor.query({ text, values });
    const session = randomBytes(32).toString("base64url");
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('PK-NETWORK','Fictional','Network','5550199','EMPLOYEE','loc-1'); INSERT INTO employee_credentials(employee_id,password_hash) VALUES('PK-NETWORK','fictional-network-hash')");
    await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'PK-NETWORK',clock_timestamp()+interval '1 hour')",
      [createHash("sha256").update(session).digest("hex")]);
    const origin = app.url.replace("127.0.0.1", "localhost"), jar = new Map([["fuel_session", session]]);
    const receipts: { path: string; status: number }[] = [];
    async function request(path: string, body: unknown = {}, method = "POST") {
      const response = await fetch(origin + path, {
        method, redirect: "manual", headers: { origin, "content-type": "application/json",
          cookie: [...jar].map(([name, value]) => name + "=" + value).join("; ") },
        ...(method === "GET" || method === "DELETE" ? {} : { body: JSON.stringify(body) }),
      });
      for (const value of response.headers.getSetCookie()) {
        const pair = value.split(";", 1)[0], separator = pair.indexOf("=");
        jar.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
      receipts.push({ path, status: response.status });
      return response;
    }
    const device = fictionalAuthenticator();
    const start = await request("/api/auth/passkey/register/options");
    expect(start.status).toBe(200);
    const creation: PublicKeyCredentialCreationOptionsJSON = await start.json();
    const registered = await request("/api/auth/passkey/register/verify", {
      response: device.register(creation.challenge, origin), name: "Fictional network passkey",
    });
    expect(registered.status).toBe(200);
    const { passkey }: { passkey: { id: string } } = await registered.json();
    jar.delete("fuel_session");
    const anonymous = await request("/api/auth/passkeys", {}, "GET");
    expect(anonymous.status).toBe(401);
    const optionsResponse = await request("/api/auth/passkey/login/options");
    expect(optionsResponse.status).toBe(200);
    const options: PublicKeyCredentialRequestOptionsJSON = await optionsResponse.json();
    const assertion = device.authenticate(options.challenge, creation.user.id, 0, origin);
    const verified = await request("/api/auth/passkey/login/verify", { response: assertion });
    expect(verified.status).toBe(200); expect(await verified.json()).toEqual({ redirect: "/app" });
    const cookie = verified.headers.getSetCookie().find(value => value.startsWith("fuel_session="));
    expect(cookie).toContain("HttpOnly"); expect(cookie).toContain("SameSite=lax");
    const list = await request("/api/auth/passkeys", {}, "GET");
    expect(list.status).toBe(200);
    const items: { passkeys: { id: string }[] } = await list.json();
    expect(items.passkeys.map(item => item.id)).toEqual([passkey.id]);
    expect((await request("/api/auth/passkey/login/verify", { response: assertion })).status).toBe(404);
    expect((await request("/api/auth/passkeys/" + passkey.id, {}, "DELETE")).status).toBe(204);
    await writeFile(evidence + "/http-verification.json", JSON.stringify({ source: app.sourceHashes, receipts, fictionalOnly: true,
      ownedLoopbackDatabase: true, platformFaceIdTested: false, allChecksPassed: true }, null, 2));
  } finally { await app.close(); }
});
