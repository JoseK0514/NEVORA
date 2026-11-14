vi.mock('@/lib/data/sql-session-contract',()=>import('../../../test/fixtures/business-sql-session'));
import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({ query: vi.fn(), session: vi.fn() }));
vi.mock("@/lib/db", () => ({
  getDb: () => ({ query: deps.query }),
  queryRows: (value: unknown) => value,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionMutationProof: async () => {
    const employee = await deps.session();
    return employee ? { sessionTokenHash: "f".repeat(64), employee } : null;
  },
}));
import { GET as facts } from "./facts/route";
import { POST as policy } from "./policy/route";
import { POST as handoff } from "./handoff/route";
const secret = "a".repeat(43),
  id = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  vi.stubEnv("NEVORA_COMMERCE_ENABLED", "true");
  vi.stubEnv("NEVORA_COMMERCE_API_ORIGIN", "https://billing.example.test");
  vi.stubEnv("NEVORA_COMMERCE_INSTALLATION_ID", "slot-a");
  vi.stubEnv("NEVORA_COMMERCE_INSTANCE_SECRET", secret);
  vi.stubEnv("FUEL_PORTAL_ORIGIN", "https://company.example.test");
  deps.query.mockReset();
  deps.session.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("rejects installation facts and policy requests with another installation secret", async () => {
  expect(
    (
      await facts(
        new Request("https://company.example.test/api/commerce/facts", {
          headers: { authorization: "Bearer other" },
        }),
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await policy(
        new Request("https://company.example.test/api/commerce/policy", {
          method: "POST",
          headers: { authorization: "Bearer other" },
        }),
      )
    ).status,
  ).toBe(401);
});
it("returns only bounded installation facts after the current binding is verified", async () => {
  deps.query.mockResolvedValue([
    { business_id: id, installation_id: "slot-a", employee_count: 12, time_zone: "America/New_York" },
  ]);
  const response = await facts(
    new Request("https://company.example.test/api/commerce/facts", {
      headers: { authorization: `Bearer ${secret}` },
    }),
  );
  expect(await response.json()).toEqual({
    ready: true,
    businessId: id,
    installationId: "slot-a",
    employeeCount: 12,
    timeZone: "America/New_York",
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("rejects invalid capacity values and a business outside the installation binding", async () => {
  const req = (businessId: string, employeeLimit: number) =>
    new Request("https://company.example.test/api/commerce/policy", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      body: JSON.stringify({ businessId, employeeLimit }),
    });
  expect((await policy(req(id, 999))).status).toBe(400);
  deps.query.mockResolvedValue([]);
  expect((await policy(req(id, 15))).status).toBe(503);
});
it("requires a current Owner and same-origin request for the Velani billing handoff", async () => {
  deps.session.mockResolvedValue({ id: "EMP-1", role: "EMPLOYEE" });
  const req = (origin: string) =>
    new Request("https://company.example.test/api/commerce/handoff", {
      method: "POST",
      headers: { origin },
    });
  expect((await handoff(req("https://other.example.test"))).status).toBe(403);
  expect((await handoff(req("https://company.example.test"))).status).toBe(403);
  deps.session.mockResolvedValue({ id: "OWNER", role: "OWNER" });
  deps.query.mockResolvedValue([
    {
      id: "OWNER",
      business_id: id,
      installation_id: "slot-a",
      instance_secret_hash: createHash("sha256").update(secret).digest("hex"),
    },
  ]);
  vi.stubGlobal("fetch", async () =>
    Response.json({
      handoff: "b".repeat(43),
      businessId: id,
      url: `https://www.thevelani.com/pages/plans#handoff=${"b".repeat(43)}`,
    }),
  );
  const response = await handoff(req("https://company.example.test"));
  expect((await response.json()).url).toBe(
    `https://www.thevelani.com/pages/plans#handoff=${"b".repeat(43)}`,
  );
});
it("does not return a billing handoff if Owner authority is revoked during the network request", async () => {
  deps.session.mockResolvedValue({ id: "OWNER", role: "OWNER" });
  deps.query
    .mockResolvedValueOnce([
      {
        id: "OWNER",
        business_id: id,
        installation_id: "slot-a",
        instance_secret_hash: createHash("sha256").update(secret).digest("hex"),
      },
    ])
    .mockResolvedValue([]);
  vi.stubGlobal("fetch", async () =>
    Response.json({
      handoff: "b".repeat(43),
      businessId: id,
      url: `https://www.thevelani.com/pages/plans#handoff=${"b".repeat(43)}`,
    }),
  );
  const response = await handoff(
    new Request("https://company.example.test/api/commerce/handoff", {
      method: "POST",
      headers: { origin: "https://company.example.test" },
    }),
  );
  expect(response.status).toBe(403);
});
it("does not mint or return another installation billing session when its local binding disagrees", async () => {
  deps.session.mockResolvedValue({ id: "OWNER", role: "OWNER" });
  deps.query.mockResolvedValue([
    {
      id: "OWNER",
      business_id: id,
      installation_id: "slot-b",
      instance_secret_hash: "mismatch",
    },
  ]);
  vi.stubGlobal("fetch", async () =>
    Response.json({ handoff: "b".repeat(43), businessId: id }),
  );
  const response = await handoff(
    new Request("https://company.example.test/api/commerce/handoff", {
      method: "POST",
      headers: { origin: "https://company.example.test" },
    }),
  );
  expect(response.status).toBe(403);
});

it("keeps a staging billing handoff on its configured trusted frontend", async () => {
  vi.stubEnv("NEVORA_COMMERCE_UI_ORIGIN", "https://staging.example.test");
  deps.session.mockResolvedValue({ id: "OWNER", role: "OWNER" });
  deps.query.mockResolvedValue([
    {
      id: "OWNER",
      business_id: id,
      installation_id: "slot-a",
      instance_secret_hash: createHash("sha256").update(secret).digest("hex"),
    },
  ]);
  vi.stubGlobal("fetch", async () =>
    Response.json({
      handoff: "b".repeat(43),
      businessId: id,
      url: `https://staging.example.test/pages/plans#handoff=${"b".repeat(43)}`,
    }),
  );
  const response = await handoff(
    new Request("https://company.example.test/api/commerce/handoff", {
      method: "POST",
      headers: { origin: "https://company.example.test" },
    }),
  );
  expect((await response.json()).url).toBe(
    `https://staging.example.test/pages/plans#handoff=${"b".repeat(43)}`,
  );
});
