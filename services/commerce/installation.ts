import type { PoolClient } from "pg";
import { CommerceStore, type Business } from "./store";
import { CommerceError } from "./model";
import { unseal } from "./security";
async function installation(
  store: CommerceStore,
  business: Business,
  client?: PoolClient,
) {
  const result = await (client ?? store.pool).query(
    "SELECT id,origin,instance_secret FROM commerce.slots WHERE business_id=$1",
    [business.id],
  );
  if (result.rowCount !== 1)
    throw new CommerceError("installation_unavailable", 503);
  const slot = result.rows[0];
  return {
    ...slot,
    secret: unseal(slot.instance_secret, store.key, `instance:${slot.id}`),
  };
}
export async function readInstallationHeadcount(
  store: CommerceStore,
  business: Business,
  client?: PoolClient,
) {
  const slot = await installation(store, business, client);
  const response = await fetch(`${slot.origin}/api/commerce/facts`, {
    headers: { authorization: `Bearer ${slot.secret}` },
    signal: AbortSignal.timeout(5000),
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok) throw new CommerceError("installation_unavailable", 503);
  const data = await response.json();
  if (
    data.businessId !== business.id ||
    data.installationId !== slot.id ||
    !Number.isSafeInteger(data.employeeCount) ||
    data.employeeCount < 0
  )
    throw new CommerceError("installation_identity_mismatch", 503);
  return data.employeeCount as number;
}
export async function applyInstallationCapacity(
  store: CommerceStore,
  business: Business,
  limit: number,
  client?: PoolClient,
) {
  const slot = await installation(store, business, client);
  const response = await fetch(`${slot.origin}/api/commerce/policy`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${slot.secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ businessId: business.id, employeeLimit: limit }),
    signal: AbortSignal.timeout(5000),
    redirect: "error",
  });
  if (!response.ok)
    throw new CommerceError("installation_policy_unavailable", 503);
}
