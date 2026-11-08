import { expect, it } from "vitest";
import { createRuntime } from "./runtime";

const base = {
  NODE_ENV: "test" as const,
  NEVORA_COMMERCE_ENVIRONMENT: "development",
  NEVORA_COMMERCE_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString("base64"),
  NEVORA_COMMERCE_ORIGIN: "http://localhost:3100",
  NEVORA_COMMERCE_DATABASE_URL: "postgresql://fictional@127.0.0.1/catalog",
  STRIPE_SECRET_KEY: "sk_test_fictional_only",
  STRIPE_PRICE_SMALL: "price_small",
  STRIPE_PRICE_TEAM: "price_team",
  STRIPE_WEBHOOK_SECRET: "whsec_fictional_only",
};
function runtime(overrides: Record<string, string | undefined> = {}) {
  const result = createRuntime({ ...base, ...overrides });
  void result.pool.end();
  return result;
}
const staging = {
  NEVORA_COMMERCE_ENVIRONMENT: "staging",
  NEVORA_COMMERCE_ORIGIN: "https://signup-staging.example.test",
  NEVORA_COMMERCE_UI_ORIGIN: "https://signup-staging.example.test",
  NEVORA_COMMERCE_DATABASE_URL:
    "postgresql://nv_commerce_api_111111111111111111111111:fictional@db.example/catalog?sslmode=verify-full",
};

it("accepts restricted sandbox keys with an explicit account binding", () => {
  const result = runtime({ STRIPE_SECRET_KEY: "rk_test_fictional_only", STRIPE_ACCOUNT_ID: "acct_fictional" });
  expect(result.billing?.options).toMatchObject({ live: false, expectedAccountId: "acct_fictional" });
});
it("requires an explicit valid account when hosted billing is configured", () => {
  for (const STRIPE_ACCOUNT_ID of [undefined, "", "wrong", "acct_"]) {
    expect(() => runtime({ ...staging, STRIPE_ACCOUNT_ID })).toThrow("stripe_account_required");
  }
});
it.each(["sk_live_fictional_only", "rk_live_fictional_only", "pk_test_fictional_only"])("rejects %s in staging", (STRIPE_SECRET_KEY) => {
  expect(() => runtime({ ...staging, STRIPE_ACCOUNT_ID: "acct_fictional", STRIPE_SECRET_KEY })).toThrow("stripe_environment_mismatch");
});
it("requires a complete explicit Tax choice and rejects malformed flags before billing starts", () => {
  for (const env of [
    { NEVORA_COMMERCE_TAX_ENABLED: "yes" },
    { NEVORA_COMMERCE_TAX_ENABLED: "true" },
    { NEVORA_COMMERCE_TAX_ENABLED: "true", NEVORA_COMMERCE_TAX_CODE: "txcd_10103000", NEVORA_COMMERCE_TAX_BEHAVIOR: "unspecified" },
    { NEVORA_COMMERCE_TAX_ENABLED: "true", NEVORA_COMMERCE_TAX_CODE: "invented", NEVORA_COMMERCE_TAX_BEHAVIOR: "exclusive" },
  ]) expect(() => runtime({ ...env, STRIPE_SECRET_KEY: undefined })).toThrow("stripe_tax_configuration_invalid");
});
it("defaults Tax off and carries an explicit Tax choice only when enabled", () => {
  expect(runtime().billing?.options).not.toHaveProperty("tax");
  expect(runtime({ NEVORA_COMMERCE_TAX_ENABLED: "true", NEVORA_COMMERCE_TAX_CODE: "txcd_10103000", NEVORA_COMMERCE_TAX_BEHAVIOR: "exclusive" }).billing?.options).toMatchObject({ tax: { code: "txcd_10103000", behavior: "exclusive" } });
});
