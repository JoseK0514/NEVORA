import { parsePostgresUrl } from "../../src/lib/postgres-url";
import { CommerceError } from "./model";
export function safeOrigin(value: string, development: boolean) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CommerceError("invalid_origin", 503);
  }
  if (
    url.origin !== value ||
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        development &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new CommerceError("invalid_origin", 503);
  return url.origin;
}
export function databaseTarget(value: string, environment: string) {
  if (!["development", "staging", "production"].includes(environment))
    throw Error("explicit_database_environment_required");
  const url = parsePostgresUrl(value);
  if(environment!=='development'&&(!url.username||!url.password))throw Error('explicit_database_credentials_required');
  if(environment==='staging'&&!/^nv_commerce_(api|enroll)_[a-f0-9]{24}$/.test(decodeURIComponent(url.username)))throw Error('staging_principal_required');
  if (
    ["postgres", "template0", "template1"].includes(
      decodeURIComponent(url.pathname.slice(1)),
    )
  )
    throw Error("application_database_required");
  if (
    environment !== "development" &&
    url.searchParams.get("sslmode") !== "verify-full"
  )
    throw Error("database_tls_required");
  if (
    environment === "development" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw Error("development_database_must_be_loopback");
  return value;
}
export function readCommerceConfig(env: Readonly<Record<string,string|undefined>>) {
  const environment = env.NEVORA_COMMERCE_ENVIRONMENT;
  if (environment !== "development" && environment !== "staging" && environment !== "production")
    throw Error("explicit_commerce_environment_required");
  const provisioningMode=env.NEVORA_COMMERCE_PROVISIONING_MODE??'onboarding';
  if(!['onboarding','slots'].includes(provisioningMode))throw Error('explicit_provisioning_mode_required');
  if(provisioningMode==='slots'&&environment!=='development')throw Error('legacy_provisioning_development_only');
  const key = Buffer.from(env.NEVORA_COMMERCE_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw Error("commerce_encryption_key_required");
  const origin = safeOrigin(
    env.NEVORA_COMMERCE_ORIGIN ?? "",
    environment === "development",
  );
  if(environment==='staging'&&(/^https:\/\/br-[a-z0-9-]+-commerceapi\.compute\.c-15\.us-east-1\.aws\.neon\.tech$/.test(origin)||!env.NEVORA_COMMERCE_UI_ORIGIN||env.NEVORA_COMMERCE_UI_ORIGIN!==origin)){
    const branch=env.NEVORA_NEON_BRANCH_ID;
    // This exact staging profile separates machine ingress from the protected
    // staging UI without permitting real Velani/customer redirects.
    if(env.NEVORA_WORKSPACE_MODE!=='isolated'||env.NEVORA_ONBOARDING_ENVIRONMENT!=='test'||!/^br-[a-z0-9-]+$/.test(branch??'')||origin!==`https://${branch}-commerceapi.compute.c-15.us-east-1.aws.neon.tech`||env.NEVORA_COMMERCE_UI_ORIGIN!=='https://signup-staging.nevora.team'||(env.NEVORA_COMMERCE_ALLOWED_ORIGINS!==undefined&&env.NEVORA_COMMERCE_ALLOWED_ORIGINS!=='https://signup-staging.nevora.team'))throw Error('staging_ui_origin_required');
  }
  const uiOrigin = safeOrigin(
    env.NEVORA_COMMERCE_UI_ORIGIN ?? "https://www.thevelani.com",
    environment === "development",
  );
  const allowedOrigins = [
    ...new Set([
      origin,
      uiOrigin,
      ...(env.NEVORA_COMMERCE_ALLOWED_ORIGINS ?? "")
        .split(",")
        .filter(Boolean)
        .map((v) => safeOrigin(v.trim(), environment === "development")),
    ]),
  ];
  const databaseUrl = databaseTarget(
    env.NEVORA_COMMERCE_DATABASE_URL ?? "",
    environment,
  );
  const port = Number(env.PORT ?? "3100");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("invalid_port");
  return {
    environment,
    provisioningMode:provisioningMode as "onboarding"|"slots",
    key,
    origin,
    uiOrigin,
    allowedOrigins,
    databaseUrl,
    port,
  };
}
