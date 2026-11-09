import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let database: ReturnType<typeof neon> | null = null;
const tenantRuntimeTransports = new Map<'APP' | 'WORKER', NeonQueryFunction<false, false>>();

/** Dedicated runtime principals only; the legacy/bootstrap URL is never a
 * tenant-runtime fallback. Cache transport configuration, never tenant state. */
export function getTenantRuntimeDb(role: 'APP' | 'WORKER') {
  if (role !== 'APP' && role !== 'WORKER') throw new Error('tenant_runtime_not_configured');
  const cached = tenantRuntimeTransports.get(role);
  if (cached) return cached;
  const url = role === 'APP' ? process.env.NEVORA_APP_DATABASE_URL : process.env.NEVORA_WORKER_DATABASE_URL;
  if (!url) throw new Error('tenant_runtime_not_configured');
  try {
    const transport = neon(url);
    tenantRuntimeTransports.set(role, transport);
    return transport;
  } catch { throw new Error('tenant_runtime_not_configured'); }
}

/** Shared legacy DATABASE_URL transport. Tenant-proof execution must select its
 * dedicated runtime principal through getTenantRuntimeDb instead; caching this
 * handle stores connection configuration and confers no workspace context. */
export function getDb() {
  if (database) return database;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  database = neon(connectionString);
  return database;
}

/** Compatibility adapter for bare Neon row arrays and driver {rows} responses.
 * Unrecognized results become an empty array and T is only a cast; security
 * boundaries needing strict malformed/unavailable handling must decode directly. */
export function queryRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }

  return [];
}
