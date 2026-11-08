import type {BillingOwner} from "./owner-authority";
import { createHmac } from "node:crypto";
import type Stripe from "stripe";
import type { PoolClient } from "pg";
import { CommerceStore, type Business } from "./store";
import { CommerceError, planFor, type PlanKey } from "./model";
import { seal, unseal } from "./security";
import {
  assertOwnedSubscription,
  terminalSubscription,
} from "./stripe-identity";
type Ports = {
  store: CommerceStore;
  stripe: Stripe;
  origin: string;
  now: () => number;
  prices: Record<PlanKey, string>;
  live: boolean;
  headcount: (business: Business, client: PoolClient) => Promise<number>;
};
type Intent = {
  business_id: string;
  operation: string;
  previous_subscription_id: string | null;
  params_secret: string;
  employee_count: number;
  plan_key: PlanKey;
  expires_at: Date;
  session_id: string | null;
  result_secret: string | null;
};
async function customer(ports: Ports, client: PoolClient, business: Business) {
  if (business.customerId) {
    const c = await ports.stripe.customers.retrieve(business.customerId);
    if (c.deleted || c.metadata.nevora_business_id !== business.id)
      throw new CommerceError("customer_identity_mismatch", 503);
    return c.id;
  }
  const matches = (
    await ports.stripe.customers.list({ email: business.email, limit: 100 })
  ).data.filter((c) => c.metadata.nevora_business_id === business.id);
  if (matches.length > 1)
    throw new CommerceError("customer_reconciliation_required", 409);
  const c =
    matches[0] ??
    (await ports.stripe.customers.create(
      { email: business.email, metadata: { nevora_business_id: business.id } },
      { idempotencyKey: `nevora-customer:${business.id}` },
    ));
  await client.query(
    "UPDATE commerce.businesses SET stripe_customer_id=$2 WHERE id=$1",
    [business.id, c.id],
  );
  return c.id;
}
async function prepare(
  ports: Ports,
  id: string,
  operation: string,
  owner?:BillingOwner|null,
): Promise<Intent | { pending: true }> {
  return ports.store.withBusinessLock(id, async (client, business) => {
    if (business.subscriptionId) {
      const current = await ports.stripe.subscriptions.retrieve(
        business.subscriptionId,
      );
      assertOwnedSubscription(current, business);
      if (!terminalSubscription(current.status))
        throw new CommerceError("use_billing_portal", 409);
    }
    const exact = await client.query<Intent>(
      "SELECT * FROM commerce.checkout_intents WHERE business_id=$1 AND operation=$2",
      [id, operation],
    );
    if (exact.rowCount) {
      if (exact.rows[0].expires_at.getTime() <= Date.now())
        throw new CommerceError("checkout_expired", 409);
      return exact.rows[0];
    }
    const open = await client.query<Intent>(
      "SELECT * FROM commerce.checkout_intents WHERE business_id=$1 AND previous_subscription_id IS NOT DISTINCT FROM $2 AND expires_at>clock_timestamp() ORDER BY created_at DESC LIMIT 1",
      [id, business.subscriptionId],
    );
    if (open.rowCount) return open.rows[0];
    const count = Math.max(1, await ports.headcount(business, client)),
      plan = planFor(count),
      price = await ports.stripe.prices.retrieve(ports.prices[plan.key]);
    if (
      !price.active ||
      price.livemode !== ports.live ||
      price.currency !== "usd" ||
      price.unit_amount !== plan.amount ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1
    )
      throw new CommerceError("invalid_billing_price", 503);
    const customerId = await customer(ports, client, business),
      existing = (
        await ports.stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 100,
        })
      ).data.filter(
        (s) =>
          s.metadata.nevora_business_id === id &&
          !terminalSubscription(s.status),
      );
    if (existing.length) {
      for (const sub of existing)
        await ports.store.enqueue(
          client,
          "stripe",
          `checkout-recover:${sub.id}`,
          { subscriptionId: sub.id },
        );
      return { pending: true };
    }
    const chargeStart = Math.max(
        business.trialEnd ?? 0,
        business.paidThrough ?? 0,
      ),
      early = chargeStart > ports.now();
    const proof = createHmac("sha256", ports.store.key)
      .update(`checkout-return:${id}:${operation}`)
      .digest("base64url");
    await ports.store.handoff(id, proof, ports.now(), client, 3600000,owner);
    const metadata = {
        nevora_business_id: id,
        nevora_price: price.id,
        nevora_checkout_operation: operation,
      },
      expiresAt = Math.floor(Date.now() / 1000) + 2700;
    const params: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: early ? "setup" : "subscription",
      currency: "usd",
      success_url: `${ports.origin}/pages/nevora-billing-return#handoff=${proof}`,
      cancel_url: `${ports.origin}/pages/nevora-billing#handoff=${proof}`,
      client_reference_id: id,
      metadata,
      expires_at: expiresAt,
    };
    if (early) {
      params.setup_intent_data = { metadata };
      params.custom_text = {
        submit: {
          message: `Authorize USD ${(plan.amount / 100).toFixed(2)} per month starting ${new Date(chargeStart).toISOString().slice(0, 10)}. Cancel through billing settings.`,
        },
      };
    } else {
      params.line_items = [{ price: price.id, quantity: 1 }];
      params.subscription_data = { metadata };
    }
    const result = await client.query<Intent>(
      "INSERT INTO commerce.checkout_intents(business_id,operation,previous_subscription_id,params_secret,employee_count,plan_key,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [
        id,
        operation,
        business.subscriptionId,
        seal(
          JSON.stringify(params),
          ports.store.key,
          `intent:${id}:${operation}`,
        ),
        count,
        plan.key,
        new Date(expiresAt * 1000),
      ],
    );
    return result.rows[0];
  });
}
async function record(
  ports: Ports,
  client: PoolClient,
  intent: Intent,
  session: Stripe.Checkout.Session,
) {
  if (
    session.metadata?.nevora_business_id !== intent.business_id ||
    session.metadata.nevora_checkout_operation !== intent.operation
  )
    throw Error("checkout_identity_mismatch");
  await client.query(
    "UPDATE commerce.checkout_intents SET session_id=$3,result_secret=$4 WHERE business_id=$1 AND operation=$2",
    [
      intent.business_id,
      intent.operation,
      session.id,
      session.url
        ? seal(session.url, ports.store.key, `checkout:${intent.business_id}`)
        : null,
    ],
  );
  await client.query(
    "UPDATE commerce.businesses SET employee_count=$2,checkout_id=$3,checkout_url=$4,checkout_expires_at=$5 WHERE id=$1",
    [
      intent.business_id,
      intent.employee_count,
      session.id,
      session.url
        ? seal(session.url, ports.store.key, `checkout:${intent.business_id}`)
        : null,
      new Date(session.expires_at * 1000),
    ],
  );
}
export async function createCheckout(
  ports: Ports,
  business: Business,
  operation: string,
  owner?:BillingOwner|null,
) {
  const prepared = await prepare(ports, business.id, operation,owner);
  if ("pending" in prepared)
    throw new CommerceError("subscription_sync_pending", 409);
  return ports.store.withBusinessLock(business.id, async (client) => {
    const intent = (
      await client.query<Intent>(
        "SELECT * FROM commerce.checkout_intents WHERE business_id=$1 AND operation=$2",
        [business.id, prepared.operation],
      )
    ).rows[0];
    if (intent.result_secret)
      return unseal(
        intent.result_secret,
        ports.store.key,
        `checkout:${business.id}`,
      );
    if (intent.expires_at.getTime() <= Date.now())
      throw new CommerceError("checkout_expired", 409);
    const params = JSON.parse(
      unseal(
        intent.params_secret,
        ports.store.key,
        `intent:${business.id}:${intent.operation}`,
      ),
    ) as Stripe.Checkout.SessionCreateParams;
    const session = await ports.stripe.checkout.sessions.create(params, {
      idempotencyKey: `nevora-checkout:${business.id}:${intent.operation}`,
    });
    if (!session.url) throw new CommerceError("checkout_unavailable", 503);
    await record(ports, client, intent, session);
    return session.url;
  });
}
/** Recover provider-created checkouts when an acknowledged creation was lost before catalog commit. */
export async function recoverCheckouts(ports: Ports, business: Business) {
  if (!business.customerId) return;
  const intents = await ports.store.pool.query<Intent>(
    "SELECT * FROM commerce.checkout_intents WHERE business_id=$1 AND session_id IS NULL ORDER BY created_at",
    [business.id],
  );
  if (!intents.rowCount) return;
  const sessions = await ports.stripe.checkout.sessions.list({
    customer: business.customerId,
    limit: 100,
  });
  for (const intent of intents.rows) {
    const matches = sessions.data.filter(
      (s) =>
        s.metadata?.nevora_business_id === business.id &&
        s.metadata.nevora_checkout_operation === intent.operation,
    );
    if (matches.length > 1) throw Error("checkout_reconciliation_required");
    if (matches[0])
      await ports.store.withBusinessLock(
        business.id,
        async (client, current) => {
          if (
            current.subscriptionId === intent.previous_subscription_id ||
            !current.subscriptionId
          )
            await record(ports, client, intent, matches[0]);
        },
      );
  }
}
