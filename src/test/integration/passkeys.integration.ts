import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createDisposableFoundationDatabase } from "./local-postgres";
import { fictionalAuthenticator } from "./passkey-authenticator.test-support";
import { PasskeyService } from "../../lib/auth/passkeys/service.server";
import { consumeLoginAttempt } from "../../lib/auth/login-limits";
import type { SessionMutationProof } from "../../lib/shift-changes/types";

describe("passkeys with real signed WebAuthn messages and owned PostgreSQL", () => {
  let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
  let service: PasskeyService;
  const config = { rpID: "localhost", origin: "http://localhost:3000" };
  const flow = () => randomBytes(32).toString("base64url");
  const proof: SessionMutationProof = { sessionTokenHash: "a".repeat(64), employee: {
    id: "PK-FICTIONAL", firstName: "Fictional", lastName: "Passkey", role: "EMPLOYEE", primaryLocationId: "loc-1",
  } };
  const q = <T = Record<string, unknown>>(text: string, values: unknown[] = []) => db.executor.query<T>({ text, values });
  beforeEach(async () => {
    db = await createDisposableFoundationDatabase({ mode: "current-runtime" });
    try {
      await q(await readFile("db/migrations/0035_passkeys.sql", "utf8"));
      await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
        VALUES('PK-FICTIONAL','Fictional','Passkey','5550100','EMPLOYEE','loc-1');
        INSERT INTO employee_credentials(employee_id,password_hash) VALUES('PK-FICTIONAL','fictional-test-hash');
        INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'PK-FICTIONAL',clock_timestamp()+interval '1 hour');`);
      service = new PasskeyService(config, db.executor);
    } catch (error) { await db.dispose(); throw error; }
  });
  afterEach(async () => { await db?.dispose(); });
  async function enrolled(counter = 0) {
    const device = fictionalAuthenticator(), token = flow();
    const options = await service.registrationOptions(proof, token);
    const passkey = await service.register(proof, token, device.register(options.challenge, config.origin, config.rpID, counter), "Fictional Face ID");
    return { device, passkey, handle: options.user.id };
  }
  it("registers discoverable user-verified credentials and signs in with the existing session format", async () => {
    const { device, passkey, handle } = await enrolled();
    expect(await service.list(proof)).toEqual([passkey]);
    const token = flow(), options = await service.loginOptions(token);
    expect(options.allowCredentials ?? []).toEqual([]);
    expect(options.userVerification).toBe("required");
    const session = await service.login(token, device.authenticate(options.challenge, handle));
    expect(session.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await q("SELECT employee_id FROM employee_sessions WHERE token_hash=$1", [session.tokenHash])).toEqual([{ employee_id: "PK-FICTIONAL" }]);
    expect((await service.list(proof))[0].lastUsedAt).not.toBeNull();
    expect(await q("SELECT event FROM auth_passkey_audit ORDER BY created_at")).toEqual([{ event: "register" }, { event: "sign_in" }]);
  });
  it.each(["origin", "rp", "user", "uv", "signature"])("rejects a wrong %s and consumes the attempted challenge", async mode => {
    const { device, handle } = await enrolled(), token = flow(), options = await service.loginOptions(token);
    const response = device.authenticate(options.challenge, mode === "user" ? flow() : handle, 1,
      mode === "origin" ? "https://attacker.invalid" : config.origin, mode === "rp" ? "attacker.invalid" : config.rpID, mode !== "uv");
    if (mode === "signature") response.response.signature = Buffer.alloc(70).toString("base64url");
    await expect(service.login(token, response)).rejects.toMatchObject({ code: "not_found" });
    await expect(service.login(token, device.authenticate(options.challenge, handle, 1))).rejects.toMatchObject({ code: "not_found" });
    expect(await q("SELECT count(*)::int n FROM employee_sessions WHERE token_hash<>repeat('a',64)")).toEqual([{ n: 0 }]);
  });
  it("allows only one concurrent use of a signed challenge", async () => {
    const { device, handle } = await enrolled(), token = flow(), options = await service.loginOptions(token);
    const response = device.authenticate(options.challenge, handle, 1);
    const results = await Promise.allSettled([service.login(token, response), service.login(token, response)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await q("SELECT count(*)::int n FROM auth_passkey_audit WHERE event='sign_in'")).toEqual([{ n: 1 }]);
  });
  it("allows zero counters and rejects repeated, decreased or reset nonzero counters", async () => {
    const { device, handle } = await enrolled();
    for (const counter of [0, 0, 2]) {
      const token = flow(), options = await service.loginOptions(token);
      await service.login(token, device.authenticate(options.challenge, handle, counter));
    }
    for (const counter of [2, 1, 0]) {
      const token = flow(), options = await service.loginOptions(token);
      await expect(service.login(token, device.authenticate(options.challenge, handle, counter))).rejects.toMatchObject({ code: "not_found" });
    }
  });
  it("revokes disabled accounts and does not restore their passkeys on reactivation", async () => {
    const { device, handle } = await enrolled(), token = flow(), options = await service.loginOptions(token);
    await q("UPDATE employees SET active=false WHERE id='PK-FICTIONAL'");
    await expect(service.login(token, device.authenticate(options.challenge, handle))).rejects.toMatchObject({ code: "account_disabled" });
    await q("UPDATE employees SET active=true WHERE id='PK-FICTIONAL'");
    expect(await service.list(proof)).toEqual([]);
  });
  it("removes only an owned passkey and refuses the removed credential", async () => {
    const { device, handle, passkey } = await enrolled();
    await service.remove(proof, passkey.id);
    await service.remove(proof, passkey.id);
    expect(await service.list(proof)).toEqual([]);
    const token = flow(), options = await service.loginOptions(token);
    await expect(service.login(token, device.authenticate(options.challenge, handle))).rejects.toMatchObject({ code: "not_found" });
    expect(await q("SELECT count(*)::int n FROM auth_passkey_audit WHERE event='remove'")).toEqual([{ n: 1 }]);
  });
  it("revokes passkeys on credential reset and fences session issuance if reset races verification", async () => {
    const { device, handle } = await enrolled(), token = flow(), options = await service.loginOptions(token);
    await expect(service.login(token, device.authenticate(options.challenge, handle), async () => {
      await q("UPDATE employee_credentials SET password_hash='fictional-new-hash',password_updated_at=clock_timestamp() WHERE employee_id='PK-FICTIONAL'");
    })).rejects.toMatchObject({ code: "not_found" });
    expect(await service.list(proof)).toEqual([]);
    expect(await q("SELECT count(*)::int n FROM employee_sessions WHERE token_hash<>repeat('a',64)")).toEqual([{ n: 0 }]);
  });
  it("shares the account login budget with password sign-in", async () => {
    const { device, handle } = await enrolled();
    for (let i = 0; i < 10; i++) expect(await consumeLoginAttempt("pk-fictional", db.executor)).toBe(true);
    const token = flow(), options = await service.loginOptions(token);
    await expect(service.login(token, device.authenticate(options.challenge, handle))).rejects.toMatchObject({ code: "rate_limited" });
  });
  it("requires a current session to register or manage passkeys", async () => {
    await q("DELETE FROM employee_sessions WHERE token_hash=repeat('a',64)");
    await expect(service.registrationOptions(proof, flow())).rejects.toMatchObject({ code: "not_found" });
    await expect(service.list(proof)).rejects.toMatchObject({ code: "not_found" });
  });
  it("rejects expired challenges and a response from another browser cookie", async () => {
    const { device, handle } = await enrolled(), token = flow(), options = await service.loginOptions(token);
    const response = device.authenticate(options.challenge, handle);
    await expect(service.login(flow(), response)).rejects.toMatchObject({ code: "not_found" });
    await q("UPDATE auth_passkey_challenges SET expires_at=clock_timestamp()-interval '1 second'");
    await expect(service.login(token, response)).rejects.toMatchObject({ code: "not_found" });
  });
  it("does not let an old response consume a newer challenge in the same browser", async () => {
    const { device, handle } = await enrolled(), token = flow();
    const old = await service.loginOptions(token), fresh = await service.loginOptions(token);
    await expect(service.login(token, device.authenticate(old.challenge, handle))).rejects.toMatchObject({ code: "not_found" });
    await service.login(token, device.authenticate(fresh.challenge, handle));
  });
  it("rejects a registration from the wrong origin without saving a credential", async () => {
    const device = fictionalAuthenticator(), token = flow(), options = await service.registrationOptions(proof, token);
    await expect(service.register(proof, token, device.register(options.challenge, "https://attacker.invalid"), "Fictional"))
      .rejects.toMatchObject({ code: "not_found" });
    expect(await service.list(proof)).toEqual([]);
  });
  it("does not create a session when removal races verification", async () => {
    const { device, handle, passkey } = await enrolled(), token = flow(), options = await service.loginOptions(token);
    await expect(service.login(token, device.authenticate(options.challenge, handle), () => service.remove(proof, passkey.id)))
      .rejects.toMatchObject({ code: "not_found" });
    expect(await q("SELECT count(*)::int n FROM employee_sessions WHERE token_hash<>repeat('a',64)")).toEqual([{ n: 0 }]);
  });
  it("does not revive a credential after its password row is replaced", async () => {
    await enrolled();
    await q("DELETE FROM employee_credentials WHERE employee_id='PK-FICTIONAL'; INSERT INTO employee_credentials(employee_id,password_hash) VALUES('PK-FICTIONAL','fictional-replacement')");
    expect(await service.list(proof)).toEqual([]);
  });
  it("keeps enrollment and removal scoped to the current session's employee", async () => {
    const { passkey } = await enrolled();
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('PK-OTHER','Other','Fictional','5550102','EMPLOYEE','loc-1'); INSERT INTO employee_credentials(employee_id,password_hash) VALUES('PK-OTHER','fictional-other'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'PK-OTHER',clock_timestamp()+interval '1 hour')");
    const other: SessionMutationProof = { sessionTokenHash: "b".repeat(64), employee: { ...proof.employee, id: "PK-OTHER" } };
    expect(await service.list(other)).toEqual([]);
    await expect(service.remove(other, passkey.id)).rejects.toMatchObject({ code: "not_found" });
    const device = fictionalAuthenticator(), token = flow(), options = await service.registrationOptions(proof, token);
    await expect(service.register(other, token, device.register(options.challenge), "Wrong subject")).rejects.toMatchObject({ code: "not_found" });
    await service.register(proof, token, device.register(options.challenge), "Correct subject");
  });
  it("serializes two distinct nonzero challenges against the stored counter", async () => {
    const { device, handle } = await enrolled(1), a = flow(), b = flow();
    const [oa, ob] = await Promise.all([service.loginOptions(a), service.loginOptions(b)]);
    let entered = 0, release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const beforeSession = async () => { if (++entered === 2) release(); await barrier; };
    const results = await Promise.allSettled([
      service.login(a, device.authenticate(oa.challenge, handle, 2), beforeSession),
      service.login(b, device.authenticate(ob.challenge, handle, 2), beforeSession),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await q("SELECT count(*)::int n FROM auth_passkey_audit WHERE event='sign_in'")).toEqual([{ n: 1 }]);
  });
  it("keeps audit history append-only", async () => {
    await enrolled();
    await expect(q("UPDATE auth_passkey_audit SET event='sign_in'")).rejects.toThrow("passkey_audit_immutable");
    await expect(q("DELETE FROM auth_passkey_audit")).rejects.toThrow("passkey_audit_immutable");
  });
});
