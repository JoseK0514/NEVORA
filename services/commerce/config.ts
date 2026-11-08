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
  if (!["development", "production"].includes(environment))
    throw Error("explicit_database_environment_required");
  const url = parsePostgresUrl(value);
  if (
    ["postgres", "template0", "template1"].includes(
      decodeURIComponent(url.pathname.slice(1)),
    )
  )
    throw Error("application_database_required");
  if (
    environment === "production" &&
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
export function readCommerceConfig(env: NodeJS.ProcessEnv) {
  const environment = env.NEVORA_COMMERCE_ENVIRONMENT;
  if (environment !== "development" && environment !== "production")
    throw Error("explicit_commerce_environment_required");
  const key = Buffer.from(env.NEVORA_COMMERCE_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw Error("commerce_encryption_key_required");
  const origin = safeOrigin(
    env.NEVORA_COMMERCE_ORIGIN ?? "",
    environment === "development",
  );
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
    key,
    origin,
    uiOrigin,
    allowedOrigins,
    databaseUrl,
    port,
  };
}
