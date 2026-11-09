import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import type { SqlExecutor } from "@/lib/notifications/types";
const state = vi.hoisted(() => ({
  proof: null as SessionMutationProof | null,
  ex: null as SqlExecutor | null,
}));
vi.mock("@/lib/auth/session", () => ({
  getSession: async () => state.proof?.employee ?? null,
  requireSessionMutationProof: async () => state.proof,
}));
vi.mock("@/lib/data/sql-executor", () => ({
  neonNotificationExecutor: () => state.ex,
}));
import { GET, POST } from "@/app/api/owner/advisor/route";
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => {
  f = await companyAccessFixture();
  state.ex = f.db.executor;
  state.proof = f.owner;
  vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", "true");
  vi.stubEnv("NEVORA_OWNER_ADVISOR_PROVIDER", "");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await f?.db.dispose();
});
const request = (body?: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/owner/advisor", {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "x-nevora-owner-advisor": "1",
      "content-type": "application/json",
      origin: "http://localhost",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
it("returns private 401/403 for absent or non-Owner authority", async () => {
  state.proof = null;
  expect((await GET(request())).status).toBe(401);
  state.proof = f.manager;
  const r = await GET(request());
  expect(r.status).toBe(403);
  expect(r.headers.get("cache-control")).toBe("no-store, private");
});
it("checks same origin, header, bounded JSON and forbids client-controlled history", async () => {
  expect(
    (await POST(request({}, { origin: "https://evil.invalid" }))).status,
  ).toBe(403);
  expect(
    (await GET(request(undefined, { "x-nevora-owner-advisor": "" }))).status,
  ).toBe(403);
  expect(
    (
      await POST(
        request({
          op: "ask",
          requestId: crypto.randomUUID(),
          message: "x",
          history: [],
        }),
      )
    ).status,
  ).toBe(400);
  expect((await POST(request({ message: "x".repeat(17000) }))).status).toBe(
    400,
  );
});
it("returns honest disabled/unavailable states with no outbound fetch", async () => {
  const outbound = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("unexpected outbound"));
  try {
    vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", "false");
    expect((await GET(request())).status).toBe(404);
    vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", "true");
    const r = await GET(request());
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      state: "ready",
      connection: "unavailable",
    });
    const ask = await POST(
      request({ op: "ask", requestId: crypto.randomUUID(), message: "Hi" }),
    );
    expect(ask.status).toBe(503);
    expect(outbound).not.toHaveBeenCalled();
  } finally {
    outbound.mockRestore();
  }
});
it("omits only the history scan on lease renewal while full reads remain fresh and authority is enforced", async () => {
  const original = f.db.executor; let historyReads = 0;
  state.ex = { ...original, transaction: async (...args: Parameters<typeof original.transaction>) => {
    if (args[0].some(s => s.text.includes('AS fingerprint'))) historyReads++;
    return original.transaction(...args);
  } };
  const full = await GET(request()); expect(full.status).toBe(200);
  expect(await full.json()).toHaveProperty("operationalInsights"); expect(historyReads).toBe(1);
  const leaseRequest = () => new Request("http://localhost/api/owner/advisor?view=lease", { headers: { "x-nevora-owner-advisor": "1" } });
  const lease = await GET(leaseRequest()); expect(lease.status).toBe(200);
  const body = await lease.json(); expect(body).not.toHaveProperty("operationalInsights");
  expect(body).toMatchObject({ state: "ready", validForMs: expect.any(Number), profile: expect.any(Object), memory: expect.any(Object), notebook: expect.any(Object), attention: expect.any(Object) });
  expect(historyReads).toBe(1);
  await GET(request()); expect(historyReads).toBe(2);
  await f.q("DELETE FROM employee_sessions WHERE token_hash=$1", [f.owner.sessionTokenHash]);
  expect((await GET(leaseRequest())).status).toBe(403); expect(historyReads).toBe(2);
});
