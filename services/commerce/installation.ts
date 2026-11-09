import {installationFetch} from './installation-transport';
import type {BillingOwner} from "./owner-authority";
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
    "SELECT id,origin,instance_secret FROM (SELECT id,origin,instance_secret,business_id FROM commerce.slots UNION ALL SELECT id,origin,instance_secret,business_id FROM commerce.external_installations) s WHERE business_id=$1",
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
  const response = await installationFetch(slot.origin,'/api/commerce/facts', {
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
  const response = await installationFetch(slot.origin,'/api/commerce/policy', {
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

export async function verifyInstallationOwner(store:CommerceStore,business:Business,owner:BillingOwner,client?:PoolClient){
 if(owner.businessId!==business.id||owner.installationId!==business.slotId||owner.incarnation!==business.incarnation)return false;
 const slot=await installation(store,business,client);
 const reply=await installationFetch(slot.origin,'/api/commerce/owner',{method:'POST',headers:{authorization:'Bearer '+slot.secret,'content-type':'application/json'},body:JSON.stringify(owner),signal:AbortSignal.timeout(5000),redirect:'error',cache:'no-store'});
 if(reply.status===401||reply.status===403||reply.status===404)return false;
 if(!reply.ok)throw new CommerceError('installation_unavailable',503);
 const r=await reply.json();return r.valid===true&&r.businessId===owner.businessId&&r.installationId===owner.installationId&&r.incarnation===owner.incarnation&&r.employeeId===owner.employeeId&&r.generation===owner.generation;
}
