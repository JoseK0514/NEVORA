import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({ query: vi.fn(), session: vi.fn(), isolated: vi.fn() }));
vi.mock("@/lib/commerce/isolated-connection.server", () => ({ isolatedCommerceConnection: deps.isolated }));
vi.mock("@/lib/data/app-sql", () => ({
  applicationSql: () => ({ query: deps.query }),
}));
vi.mock("@/lib/db", () => ({
  getDb: () => ({ query: deps.query }),
  queryRows: (value: unknown) => value,
}));
vi.mock("@/lib/auth/session", () => ({
  readSessionMutationProof: deps.session,
}));
import { GET } from "./route";
const id = "22222222-2222-4222-8222-222222222222",
  secret = "a".repeat(43);
const binding = () => [
  {
    id: "OWNER",
    business_id: id,
    installation_id: "slot-a",
    instance_secret_hash: createHash("sha256").update(secret).digest("hex"),
  },
];
const presentation = () => ({
  state: "grace",
  operational: true,
  trialEndsAt: "2026-11-01T12:00:00.000Z",
  paidThrough: "2026-12-01T12:00:00.000Z",
  graceEndsAt: "2026-12-08T12:00:00.000Z",
  plan: "small",
  employeeLimit: 15,
  activeEmployees: 10,
  reason: "payment_failed",
  billing: true,
  export: true,
});
const authority = () => ({
  ...presentation(),
  businessId: id,
  installationId: "slot-a",
  validUntil: Date.now() + 60000,
  stripeCustomerId: "cus_fictional",
  instanceSecret: "must-not-serialize",
});
const request = (headers: HeadersInit = {}) =>
  new Request("https://company.example.test/api/commerce/status", { headers });
function expectPresentation(value:Record<string,unknown>){const {observedAt,validForMs,...status}=value;expect(status).toEqual(presentation());expect(typeof observedAt).toBe('string');expect(new Date(String(observedAt)).toISOString()).toBe(observedAt);expect(validForMs).toBeGreaterThan(0);expect(validForMs).toBeLessThanOrEqual(15000);}
beforeEach(() => {
  vi.stubEnv("NEVORA_COMMERCE_ENABLED", "true");
  vi.stubEnv("NEVORA_COMMERCE_API_ORIGIN", "https://billing.example.test");
  vi.stubEnv("NEVORA_COMMERCE_INSTALLATION_ID", "slot-a");
  vi.stubEnv("NEVORA_COMMERCE_INSTANCE_SECRET", secret);
  vi.stubEnv("FUEL_PORTAL_ORIGIN", "https://company.example.test");
  deps.query.mockReset().mockResolvedValue(binding());
  deps.session.mockReset().mockResolvedValue({
    sessionTokenHash: "f".repeat(64),
    employee: { id: "OWNER", role: "OWNER" },
  });
  vi.stubGlobal(
    "fetch",
    async (url: string | URL | Request, options?: RequestInit) => {
      if (
        String(url) !== "https://billing.example.test/internal/access" ||
        new Headers(options?.headers).get("authorization") !==
          `Bearer ${secret}` ||
        new Headers(options?.headers).get("x-nevora-installation") !== "slot-a"
      )
        throw Error("wrong installation request");
      return Response.json(authority());
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("uses the current isolated company origin instead of a shared portal setting", async () => {
  vi.stubEnv("NEVORA_WORKSPACE_MODE", "isolated");
  vi.stubEnv("FUEL_PORTAL_ORIGIN", "https://different.example.test");
  deps.isolated.mockResolvedValue({origin:"https://billing.example.test",companyOrigin:"https://company.example.test",installationId:"slot-a",businessId:id,secret,assertCurrent:async()=>{}});
  expect((await GET(request())).status).toBe(200);
});
it("rejects an insecure configured company origin in production", async () => {
  vi.stubEnv("NODE_ENV","production");
  vi.stubEnv("FUEL_PORTAL_ORIGIN","http://company.example.test");
  expect((await GET(new Request("http://company.example.test/api/commerce/status"))).status).toBe(403);
});
it("denies a changed Owner generation after the remote status read", async () => {
  deps.query.mockResolvedValueOnce(binding().map(row=>({...row,owner_generation:"1"})))
    .mockResolvedValueOnce(binding().map(row=>({...row,owner_generation:"2"})));
  expect((await GET(request())).status).toBe(403);
});
it("denies a different installation even when its business ID matches", async () => {
  vi.stubGlobal("fetch",async()=>Response.json({...authority(),installationId:"foreign-installation"}));
  expect((await GET(request())).status).toBe(503);
});
it("denies authority that expires during the final Owner binding lookup", async () => {
  let now=Date.now();vi.spyOn(Date,"now").mockImplementation(()=>now);
  deps.query.mockResolvedValueOnce(binding()).mockImplementationOnce(async()=>{now+=60001;return binding();});
  expect((await GET(request())).status).toBe(503);
});
it('reduces the private display lifetime by time spent in the final Owner lookup',async()=>{
 let now=Date.now();vi.spyOn(Date,'now').mockImplementation(()=>now);
 vi.stubGlobal('fetch',async()=>Response.json({...authority(),validUntil:now+500}));
 deps.query.mockResolvedValueOnce(binding()).mockImplementationOnce(async()=>{now+=400;return binding();});
 const result=await GET(request());expect(result.status).toBe(200);expect((await result.json()).validForMs).toBe(100);
});
it("returns only the authenticated Owner presentation without serializing installation or Stripe identity", async () => {
  const response = await GET(request({ "sec-fetch-site": "same-origin" }));
  expect(response.status).toBe(200);
  expectPresentation(await response.json());
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("requires sign-in", async () => {
  deps.session.mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
});
it("uses the canonical transport Host when Next reconstructs an internal request URL", async () => {
  const response = await GET(
    new Request("http://localhost:3100/api/commerce/status", {
      headers: {
        host: "company.example.test",
        "sec-fetch-site": "same-origin",
      },
    }),
  );
  expect(response.status).toBe(200);
  expectPresentation(await response.json());
});
it("does not trust a forwarded host to authorize a foreign transport Host", async () => {
  const response = await GET(
    new Request("https://company.example.test/api/commerce/status", {
      headers: {
        host: "foreign.example.test",
        "x-forwarded-host": "company.example.test",
      },
    }),
  );
  expect(response.status).toBe(403);
});
it.each(["EMPLOYEE", "MANAGER", "LEAD"])(
  "does not disclose billing details to %s",
  async (role) => {
    deps.session.mockResolvedValue({
      sessionTokenHash: "f".repeat(64),
      employee: { id: "STAFF", role },
    });
    const result = await GET(request());
    expect(result.status).toBe(403);
    expect(await result.json()).toEqual({ error: { code: "owner_required" } });
  },
);
it.each([
  { origin: "https://other.example.test" },
  { "sec-fetch-site": "cross-site" },
  { "sec-fetch-site": "same-site" },
] as HeadersInit[])("rejects foreign browser read %j", async (headers) => {
  expect((await GET(request(headers))).status).toBe(403);
});
it("does not accept a caller-selected company", async () => {
  expect(
    (
      await GET(
        new Request(
          "https://company.example.test/api/commerce/status?businessId=another",
        ),
      )
    ).status,
  ).toBe(400);
});
it("rejects a local installation mismatch before disclosing status", async () => {
  deps.query.mockResolvedValue([
    { ...binding()[0], installation_id: "other-slot" },
  ]);
  expect((await GET(request())).status).toBe(403);
});
it("rechecks current Owner authority after the network request", async () => {
  deps.query.mockResolvedValueOnce(binding()).mockResolvedValue([]);
  const result = await GET(request());
  expect(result.status).toBe(403);
  expect(await result.json()).toEqual({ error: { code: "owner_required" } });
});
it("rejects a central status for another business", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({
      ...authority(),
      businessId: "33333333-3333-4333-8333-333333333333",
    }),
  );
  expect((await GET(request())).status).toBe(503);
});
it.each([
  { operational: "yes" },
  { graceEndsAt: "tomorrow" },
  { reason: "arbitrary_provider_error" },
])("fails closed on an invalid presentation %j", async (invalid) => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ ...authority(), ...invalid }),
  );
  expect((await GET(request())).status).toBe(503);
});
it("reports authority outages without asking the Owner to pay", async () => {
  vi.stubGlobal("fetch", async () => {
    throw Error("offline");
  });
  const result = await GET(request());
  expect(result.status).toBe(503);
  expect(await result.json()).toEqual({
    error: { code: "billing_status_unavailable" },
  });
});
it("reads fresh status instead of sharing a previous billing presentation", async () => {
  expect((await GET(request())).status).toBe(200);
  vi.stubGlobal("fetch", async () =>
    Response.json({
      ...authority(),
      state: "restricted",
      operational: false,
      reason: "trial_ended",
    }),
  );
  expect(await (await GET(request())).json()).toMatchObject({
    state: "restricted",
    operational: false,
    reason: "trial_ended",
  });
});
it("keeps existing unenrolled installations off", async () => {
  vi.stubEnv("NEVORA_COMMERCE_ENABLED", "false");
  expect((await GET(request())).status).toBe(404);
});
