import { expect, it } from "vitest";
import { databaseTarget } from "./config";
it("rejects driver target overrides, duplicate TLS modes and maintenance databases", () => {
  for (const target of [
    "postgresql://test@localhost/app?host=remote.example",
    "postgresql://test@localhost/app?port=6543",
    "postgresql://test@localhost/app?sslmode=verify-full&sslmode=disable",
    "postgresql://test@localhost/postgres",
    "postgresql://test@localhost/template1",
  ])
    expect(() => databaseTarget(target, "development")).toThrow();
  expect(
    databaseTarget("postgresql://test@127.0.0.1/application", "development"),
  ).toBe("postgresql://test@127.0.0.1/application");
  expect(() =>
    databaseTarget(
      "postgresql://test@db.example/application?sslmode=disable",
      "production",
    ),
  ).toThrow();
});

it('permits explicit remote staging only with verified TLS and keeps provisioning on the canonical onboarding path',async()=>{
 const {readCommerceConfig}=await import('./config');
 const env={NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_COMMERCE_ENCRYPTION_KEY:Buffer.alloc(32,8).toString('base64'),NEVORA_COMMERCE_ORIGIN:'https://billing-staging.example.test',NEVORA_COMMERCE_DATABASE_URL:'postgresql://catalog@ep-stage.neon.tech/catalog?sslmode=verify-full'};
 expect(readCommerceConfig(env).provisioningMode).toBe('onboarding');
 expect(()=>readCommerceConfig({...env,NEVORA_COMMERCE_DATABASE_URL:'postgresql://catalog@ep-stage.neon.tech/catalog?sslmode=require'})).toThrow('database_tls_required');
 expect(()=>readCommerceConfig({...env,NEVORA_COMMERCE_PROVISIONING_MODE:'slots'})).toThrow('legacy_provisioning_development_only');
});
