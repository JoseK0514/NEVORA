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

export function getDb() {
  if (database) return database;

  const connectionString =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    throw new Error("A Neon database connection variable is not configured.");
  }

  database = neon(connectionString);
  return database;
}

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
