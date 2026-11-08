import { afterEach, expect, it, vi } from "vitest";
import { commerceGate, resetCommerceAccessCache } from "./access";
afterEach(() => {
  vi.unstubAllEnvs();
  resetCommerceAccessCache();
});
const enable = () => {
  vi.stubEnv("NEVORA_COMMERCE_ENABLED", "true");
  vi.stubEnv("NEVORA_COMMERCE_API_ORIGIN", "https://billing.example.test");
  vi.stubEnv("NEVORA_COMMERCE_INSTALLATION_ID", "slot-a");
  vi.stubEnv("NEVORA_COMMERCE_INSTANCE_SECRET", "a".repeat(43));
};
it("leaves unenrolled existing installations unchanged without contacting commerce", async () => {
  expect(
    await commerceGate("/app/schedule", "POST", async () => {
      throw Error("must not fetch");
    }),
  ).toBeNull();
});
it("blocks operations after expiry while allowing authenticated export and billing recovery routes", async () => {
  enable();
  const fetcher = async () =>
    new Response(
      JSON.stringify({
        state: "restricted",
        operational: false,
        validUntil: Date.now() + 1000,
      }),
    );
  expect((await commerceGate("/app/schedule", "POST", fetcher))?.status).toBe(
    402,
  );
  expect(
    await commerceGate("/api/commerce/handoff", "POST", fetcher),
  ).toBeNull();
  expect(await commerceGate("/api/payroll-export", "GET", fetcher)).toBeNull();
  expect(
    (await commerceGate("/api/timecards/finalize", "POST", fetcher))?.status,
  ).toBe(402);
});
it("fails closed on invalid, expired or unavailable billing authority", async () => {
  enable();
  expect(
    (
      await commerceGate("/app", "GET", async () => {
        throw Error("offline");
      })
    )?.status,
  ).toBe(503);
  expect(
    (
      await commerceGate(
        "/app",
        "GET",
        async () =>
          new Response(JSON.stringify({ operational: true, validUntil: 0 })),
      )
    )?.status,
  ).toBe(503);
});
it("permits the actual expired-account export workflow and still blocks operational writes", async () => {
  enable();
  const restricted = async () =>
    Response.json({
      state: "restricted",
      operational: false,
      validUntil: Date.now() + 1000,
    });
  for (const [path, method] of [
    ["/api/timecards", "POST"],
    ["/api/payroll-export/profiles", "GET"],
    ["/api/payroll-export", "POST"],
  ])
    expect(await commerceGate(path, method, restricted)).toBeNull();
  expect(
    (await commerceGate("/api/timecards/finalize", "POST", restricted))?.status,
  ).toBe(402);
  expect(
    (await commerceGate("/api/payroll-export/profiles", "POST", restricted))
      ?.status,
  ).toBe(402);
});
