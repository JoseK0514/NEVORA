import { it, expect, afterEach } from "vitest";
import { boundary, handle, failure } from "./http";
const op = "11111111-1111-4111-8111-111111111111";
afterEach(() => {
  delete process.env.NEVORA_PAYROLL_ENABLED;
  delete process.env.FUEL_PORTAL_ORIGIN;
});
it("receipt recovery permits only one bounded UUID query and rejects cross-site reads", () => {
  const req = (query: string, site = "same-origin") =>
    new Request(`https://qa.example/api/payroll/receipts${query}`, {
      headers: { "x-nevora-payroll": "1", "sec-fetch-site": site },
    });
  expect(boundary(req(`?operationId=${op}`), false, true)).toBeNull();
  for (const query of [
    "",
    `?operationId=${op}&extra=1`,
    `?operationId=${op}&operationId=${op}`,
    "?operationId=invalid",
  ])
    expect(boundary(req(query), false, true)).toBe(400);
  expect(boundary(req(`?operationId=${op}`, "cross-site"), false, true)).toBe(
    403,
  );
});
it("mutations require explicit header, JSON and exact origin", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://qa.example/api/payroll/runs", {
      method: "POST",
      headers,
    });
  expect(
    boundary(
      req({
        "x-nevora-payroll": "1",
        "content-type": "application/json",
        origin: "https://qa.example",
      }),
      true,
    ),
  ).toBeNull();
  expect(
    boundary(
      req({
        "x-nevora-payroll": "1",
        "content-type": "application/json",
        origin: "https://other.example",
      }),
      true,
    ),
  ).toBe(403);
  expect(
    boundary(
      req({ "content-type": "application/json", origin: "https://qa.example" }),
      true,
    ),
  ).toBe(403);
});
it("disabled API returns a private 503 without invoking business action", async () => {
  const response = await handle(
    new Request("https://qa.example/api/payroll/runs", {
      headers: { "x-nevora-payroll": "1" },
    }),
    async () => {
      throw Error("Business action must remain disabled");
    },
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ error: "PAYROLL_DISABLED" });
  expect(response.headers.get("Cache-Control")).toBe("no-store, private");
});
it("authenticated download boundary allows direct same-origin navigation and rejects cross-site", () => {
  expect(
    boundary(
      new Request("https://qa.example/api/payroll/documents/" + op),
      false,
      false,
      true,
    ),
  ).toBeNull();
  expect(
    boundary(
      new Request("https://qa.example/api/payroll/documents/" + op, {
        headers: { "sec-fetch-site": "cross-site" },
      }),
      false,
      false,
      true,
    ),
  ).toBe(403);
});
it("maps only the exact native overlap guard to the ordinary private conflict contract", async () => {
  const response = failure(new Error("OVERLAPPING_NATIVE_PAYROLL"));
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "PAYROLL_CONFLICT", message: "Reload and review current information." });
  expect(response.headers.get("Cache-Control")).toBe("no-store, private");
});
it.each([
  new Error("connection terminated"),
  new Error("OVERLAPPING_NATIVE_PAYROLL transport interrupted"),
  new Error("UNKNOWN_NATIVE_PAYROLL"),
  "OVERLAPPING_NATIVE_PAYROLL",
  { message: "OVERLAPPING_NATIVE_PAYROLL" },
])("keeps unknown or unestablished failures unavailable without raw database detail %#", async error => {
  const response = failure(error);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "PAYROLL_UNAVAILABLE", message: "Request could not be completed." });
});
it("preserves authorization precedence over a mentioned overlap", async () => {
  const response = failure(new Error("payroll_authorization OVERLAPPING_NATIVE_PAYROLL"));
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "ACCESS_DENIED", message: "Payroll access is unavailable." });
});
