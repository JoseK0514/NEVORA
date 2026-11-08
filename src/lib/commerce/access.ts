export type CommerceAuthority = {
  operational: boolean;
  state: string;
  validUntil: number;
  employeeLimit?: number;
};
let cached: { key: string; authority: CommerceAuthority } | null = null;
export function resetCommerceAccessCache() {
  cached = null;
}
export function commerceEnabled() {
  return process.env.NEVORA_COMMERCE_ENABLED === "true";
}
export function commerceConnection() {
  const origin = process.env.NEVORA_COMMERCE_API_ORIGIN ?? "",
    installationId = process.env.NEVORA_COMMERCE_INSTALLATION_ID ?? "",
    secret = process.env.NEVORA_COMMERCE_INSTANCE_SECRET ?? "";
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    url.origin !== origin ||
    !installationId ||
    !/^[A-Za-z0-9_-]{43}$/.test(secret)
  )
    throw Error("commerce_not_configured");
  return { origin, installationId, secret };
}
export async function readCommerceAuthority(
  fetcher: typeof fetch = fetch,
): Promise<CommerceAuthority> {
  const c = commerceConnection(),
    key = `${c.origin}:${c.installationId}:${c.secret}`;
  if (cached?.key === key && cached.authority.validUntil > Date.now())
    return cached.authority;
  const response = await fetcher(`${c.origin}/internal/access`, {
    headers: {
      authorization: `Bearer ${c.secret}`,
      "x-nevora-installation": c.installationId,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw Error("commerce_unavailable");
  const value = await response.json();
  if (
    typeof value.operational !== "boolean" ||
    typeof value.state !== "string" ||
    !Number.isFinite(value.validUntil) ||
    value.validUntil <= Date.now() ||
    value.validUntil > Date.now() + 61000
  )
    throw Error("invalid_commerce_authority");
  cached = { key, authority: value };
  return value;
}
export async function requireOperationalCommerce() {
  if (commerceEnabled() && !(await readCommerceAuthority()).operational)
    throw Error("commerce_subscription_required");
}
export async function commerceGate(
  path: string,
  method: string,
  fetcher: typeof fetch = fetch,
): Promise<Response | null> {
  if (!commerceEnabled()) return null;
  if (
    path.startsWith("/api/commerce/") ||
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/passkeys/")
  )
    return null;
  if (
    method === "GET" &&
    (path === "/api/payroll-export" ||
      path.startsWith("/api/payroll/documents/") ||
      path === "/app/payroll-export" ||
      path === "/app/pay")
  )
    return null;
  try {
    if ((await readCommerceAuthority(fetcher)).operational) return null;
    return Response.json(
      { error: { code: "subscription_required" } },
      { status: 402, headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: { code: "billing_status_unavailable" } },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
