import { expect, it } from "vitest";
import { databaseTarget,readCommerceConfig } from "./config";
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
 const env={NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_COMMERCE_ENCRYPTION_KEY:Buffer.alloc(32,8).toString('base64'),NEVORA_COMMERCE_ORIGIN:'https://billing-staging.example.test',NEVORA_COMMERCE_UI_ORIGIN:'https://billing-staging.example.test',NEVORA_COMMERCE_DATABASE_URL:'postgresql://nv_commerce_api_111111111111111111111111:fictional-explicit@ep-stage.neon.tech/catalog?sslmode=verify-full'};
 expect(readCommerceConfig(env).provisioningMode).toBe('onboarding');
 expect(()=>readCommerceConfig({...env,NEVORA_COMMERCE_DATABASE_URL:'postgresql://nv_commerce_api_111111111111111111111111:fictional-explicit@ep-stage.neon.tech/catalog?sslmode=require'})).toThrow('database_tls_required');
 expect(()=>readCommerceConfig({...env,NEVORA_COMMERCE_PROVISIONING_MODE:'slots'})).toThrow('legacy_provisioning_development_only');
});
it('rejects ambient staging credentials and requires an explicit isolated UI destination',()=>{
 const env={NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_COMMERCE_ENCRYPTION_KEY:Buffer.alloc(32,8).toString('base64'),NEVORA_COMMERCE_ORIGIN:'https://signup-staging.example.test',NEVORA_COMMERCE_DATABASE_URL:'postgresql://catalog@ep-stage.neon.tech/catalog?sslmode=verify-full',PGUSER:'fictional_unintended_admin',PGPASSWORD:'fictional_ambient_only'};
 expect(()=>readCommerceConfig(env)).toThrow();
 const explicit={...env,NEVORA_COMMERCE_DATABASE_URL:'postgresql://nv_commerce_api_111111111111111111111111:fictional-explicit@ep-stage.neon.tech/catalog?sslmode=verify-full'};
 expect(()=>readCommerceConfig(explicit)).toThrow('staging_ui_origin_required');
 expect(()=>readCommerceConfig({...explicit,NEVORA_COMMERCE_UI_ORIGIN:'https://www.thevelani.com'})).toThrow('staging_ui_origin_required');
 expect(readCommerceConfig({...explicit,NEVORA_COMMERCE_UI_ORIGIN:'https://signup-staging.example.test'}).uiOrigin).toBe('https://signup-staging.example.test');
});
