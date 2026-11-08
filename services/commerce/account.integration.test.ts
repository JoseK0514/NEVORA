import { verifyPassword } from "../../src/lib/auth/password";
import { workerOnce } from "./worker";
import { createHttpServer } from "./http";
import { dropTestDatabase } from "./test-database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { CommerceStore } from "./store";
import { createCommerce } from "./service";
const enabled = Boolean(process.env.NEVORA_COMMERCE_TEST_URL);
describe.skipIf(!enabled)("commerce accounts on owned PostgreSQL", () => {
  let pool: Pool,
    admin: Pool,
    store: CommerceStore,
    app: ReturnType<typeof createCommerce>;
  const name = `commerce_test_${randomUUID().replaceAll("-", "")}`;
  const key = Buffer.alloc(32, 9);
  beforeAll(async () => {
    const url = new URL(process.env.NEVORA_COMMERCE_TEST_URL!);
    if (
      process.env.DATABASE_URL ||
      url.hostname !== "127.0.0.1" ||
      url.pathname !== "/postgres"
    )
      throw Error("owned loopback cluster required");
    admin = new Pool({ connectionString: url.href });
    await admin.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`;
    pool = new Pool({ connectionString: url.href });
    await pool.query(
      await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
    );
    store = new CommerceStore(pool, key);
    app = createCommerce({
      store,
      origin: "https://accounts.example.test",
      allowedOrigins: ["https://accounts.example.test"],
      now: () => Date.parse("2026-11-07T12:00:00Z"),
    });
  });
  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await dropTestDatabase(admin, name);
      await admin.end();
    }
  });
  const request = (
    path: string,
    body?: unknown,
    bearer?: string,
    origin = "https://accounts.example.test",
  ) =>
    app(
      new Request(`https://accounts.example.test${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          origin,
          "content-type": "application/json",
          ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      "127.0.0.1",
    );
  let ownerSession = "";
  const signup = {
    email: "owner@example.test",
    password: "fictional-owner-pass123",
    firstName: "Taylor",
    lastName: "Example",
    phone: "7875550101",
    businessName: "Example Shop",
    timeZone: "America/Puerto_Rico",
    locationName: "Main",
    employeeCount: 10,
  };
  it("accepts duplicate signup without duplicate accounts or leaking identity", async () => {
    const responses = await Promise.all([
      request("/v1/signup", signup),
      request("/v1/signup", signup),
    ]);
    expect(responses.map((r) => r.status)).toEqual([202, 202]);
    expect(await responses[0].json()).toEqual({ state: "check_email" });
    expect(
      (await pool.query("SELECT count(*)::int n FROM commerce.accounts"))
        .rows[0].n,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM commerce.jobs WHERE kind='mail'",
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it("verifies email once without accepting credentials or provisioning from unverified signup", async () => {
    const jobs = await pool.query(
      "SELECT * FROM commerce.jobs WHERE kind='mail'",
    );
    const payload = store.openJob(jobs.rows[0]);
    const proof = new URL(payload.url).hash.slice("#token=".length);
    const responses = await Promise.all([
      request("/v1/verify", { token: proof }),
      request("/v1/verify", { token: proof }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
    const session = await responses.find((r) => r.status === 200)!.json();
    ownerSession = session.accessToken;
    expect(
      (await request("/v1/status", undefined, session.accessToken)).status,
    ).toBe(200);
    expect((await request("/v1/status")).status).toBe(401);
    expect((await request("/v1/status", undefined, "forged")).status).toBe(401);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM commerce.jobs WHERE kind='provision'",
        )
      ).rows[0].n,
    ).toBe(0);
    expect(
      (await pool.query("SELECT password_hash FROM commerce.accounts")).rows[0]
        .password_hash,
    ).toBeNull();
  });
  it("accepts business credentials only from the verified owner and deduplicates setup", async () => {
    const setup = {
      ...signup,
      password: "verified-owner-secret456",
      businessName: "Verified Owner Shop",
    };
    const responses = await Promise.all([
      request("/v1/setup", setup, ownerSession),
      request("/v1/setup", setup, ownerSession),
    ]);
    expect(responses.map((r) => r.status)).toEqual([202, 202]);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM commerce.jobs WHERE kind='provision'",
        )
      ).rows[0].n,
    ).toBe(1);
    const account = (
      await pool.query("SELECT password_hash,profile FROM commerce.accounts")
    ).rows[0];
    expect(await verifyPassword(signup.password, account.password_hash)).toBe(
      false,
    );
    expect(
      await verifyPassword("verified-owner-secret456", account.password_hash),
    ).toBe(true);
    expect(account.profile.businessName).toBe("Verified Owner Shop");
    expect(
      (
        await request(
          "/v1/setup",
          { ...setup, businessName: "Different Shop" },
          ownerSession,
        )
      ).status,
    ).toBe(409);
  });
  it("rejects foreign origins and oversized transport before processing signup", async () => {
    expect(
      (await request("/v1/signup", signup, undefined, "https://evil.example"))
        .status,
    ).toBe(403);
    expect(
      (await request("/v1/signup", { ...signup, password: "x".repeat(20000) }))
        .status,
    ).toBe(413);
  });
  it("serves real HTTP and returns a bounded oversized-body error", async () => {
    const server = createHttpServer(app, "http://127.0.0.1");
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address();
      if (!address || typeof address === "string")
        throw Error("missing_address");
      const origin = `http://127.0.0.1:${address.port}`;
      expect(await (await fetch(`${origin}/health`)).json()).toEqual({
        state: "alive",
      });
      const response = await fetch(`${origin}/v1/signup`, {
        method: "POST",
        headers: {
          origin: "https://accounts.example.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...signup, password: "x".repeat(100000) }),
      });
      expect(response.status).toBe(413);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
  it("claims a durable job once under concurrent workers", async () => {
    const jobs = await Promise.all([
      store.claimJob(),
      store.claimJob(),
      store.claimJob(),
    ]);
    const ids = jobs.filter(Boolean).map((j) => j!.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(2);
  });
  it("retries failed mail delivery durably and purges delivered link material", async () => {
    const account = (
      await pool.query("SELECT id FROM commerce.accounts LIMIT 1")
    ).rows[0].id;
    const proof = "m".repeat(43);
    const { digest } = await import("./security");
    await pool.query(
      "INSERT INTO commerce.tokens(hash,account_id,purpose,expires_at) VALUES($1,$2,'signin',$3)",
      [digest(proof), account, new Date(Date.now() + 1800000)],
    );
    await store.transaction((client) =>
      store.enqueue(client, "mail", "worker-mail-test", {
        email: "owner@example.test",
        url: `https://accounts.example.test/verify#token=${proof}`,
        template: "signin",
      }),
    );
    const failed = await workerOnce(store, undefined, async () => {
      throw Error("simulated provider timeout with private information");
    });
    expect(failed).toEqual({
      state: "retry_scheduled",
      kind: "mail",
      code: "retry_required",
    });
    const job = (
      await pool.query(
        "SELECT state,last_error,payload FROM commerce.jobs WHERE dedupe_key='worker-mail-test'",
      )
    ).rows[0];
    expect(job.state).toBe("pending");
    expect(job.last_error).toBe("retry_required");
    expect(job.payload).not.toContain(proof);
    await pool.query(
      "UPDATE commerce.jobs SET available_at=clock_timestamp() WHERE dedupe_key='worker-mail-test'",
    );
    const delivered: { email: string }[] = [];
    expect(
      await workerOnce(store, undefined, async (message) => {
        delivered.push(message);
      }),
    ).toEqual({ state: "processed", kind: "mail" });
    expect(delivered[0].email).toBe("owner@example.test");
    expect(
      (
        await pool.query(
          "SELECT payload FROM commerce.jobs WHERE dedupe_key='worker-mail-test'",
        )
      ).rows[0].payload,
    ).toBe("");
  });
  it("enforces rate limits in shared storage and honors a disabled public signup", async () => {
    await store.rate("rate-test", 2, 60, Date.now());
    await store.rate("rate-test", 2, 60, Date.now());
    await expect(store.rate("rate-test", 2, 60, Date.now())).rejects.toThrow(
      "rate_limited",
    );
    const disabled = createCommerce({
      store,
      origin: "https://accounts.example.test",
      allowedOrigins: ["https://accounts.example.test"],
      signupEnabled: false,
    });
    expect(
      (
        await disabled(
          new Request("https://accounts.example.test/v1/signup", {
            method: "POST",
            headers: {
              origin: "https://accounts.example.test",
              "content-type": "application/json",
            },
            body: JSON.stringify(signup),
          }),
          "127.0.0.1",
        )
      ).status,
    ).toBe(503);
  });
});
