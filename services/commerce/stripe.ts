import Stripe from "stripe";
import type { PoolClient } from "pg";
import type { BillingPort } from "./service";
import { CommerceStore, type Business } from "./store";
import { CommerceError, planFor, type PlanKey } from "./model";
import { seal, unseal } from "./security";
type BillingOptions = {
  origin: string;
  prices: Record<PlanKey, string>;
  webhookSecret: string;
  live: boolean;
  now?: () => number;
  facts?: (business: Business) => Promise<number>;
  policy?: (business: Business, limit: number) => Promise<void>;
};
const objectId = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : value &&
        typeof value === "object" &&
        "id" in value &&
        typeof value.id === "string"
      ? value.id
      : null;
export class StripeBilling implements BillingPort {
  constructor(
    readonly store: CommerceStore,
    readonly stripe: Stripe,
    readonly options: BillingOptions,
  ) {}
  now() {
    return this.options.now?.() ?? Date.now();
  }
  private async locked<T>(
    id: string,
    fn: (client: PoolClient, business: Business) => Promise<T>,
  ) {
    return this.store.transaction(async (client) => {
      await client.query(
        "SELECT id FROM commerce.businesses WHERE id=$1 FOR UPDATE",
        [id],
      );
      return fn(client, await this.store.business(id, client));
    });
  }
  private async facts(business: Business, client: PoolClient) {
    if (this.options.facts) return this.options.facts(business);
    const result = await client.query(
      "SELECT id,origin,instance_secret FROM commerce.slots WHERE business_id=$1",
      [business.id],
    );
    if (result.rowCount !== 1)
      throw new CommerceError("installation_unavailable", 503);
    const slot = result.rows[0];
    const secret = unseal(
      slot.instance_secret,
      this.store.key,
      `instance:${slot.id}`,
    );
    const response = await fetch(`${slot.origin}/api/commerce/facts`, {
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new CommerceError("installation_unavailable", 503);
    const data = await response.json();
    if (
      data.businessId !== business.id ||
      data.installationId !== slot.id ||
      !Number.isInteger(data.employeeCount) ||
      data.employeeCount < 0
    )
      throw new CommerceError("installation_identity_mismatch", 503);
    return Math.max(1, data.employeeCount);
  }
  private async pushPolicy(
    business: Business,
    limit: number,
    client: PoolClient,
  ) {
    if (this.options.policy) return this.options.policy(business, limit);
    const result = await client.query(
      "SELECT id,origin,instance_secret FROM commerce.slots WHERE business_id=$1",
      [business.id],
    );
    if (result.rowCount !== 1)
      throw new CommerceError("installation_unavailable", 503);
    const slot = result.rows[0];
    const secret = unseal(
      slot.instance_secret,
      this.store.key,
      `instance:${slot.id}`,
    );
    const response = await fetch(`${slot.origin}/api/commerce/policy`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ businessId: business.id, employeeLimit: limit }),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok)
      throw new CommerceError("installation_policy_unavailable", 503);
  }
  private async price(key: PlanKey) {
    const price = await this.stripe.prices.retrieve(this.options.prices[key]);
    if (
      !price.active ||
      price.currency !== "usd" ||
      price.unit_amount !== (key === "small" ? 1900 : 2900) ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1
    )
      throw new CommerceError("invalid_billing_price", 503);
    return price.id;
  }
  private async customer(client: PoolClient, business: Business) {
    if (business.customerId) {
      const customer = await this.stripe.customers.retrieve(
        business.customerId,
      );
      if (
        customer.deleted ||
        customer.metadata.nevora_business_id !== business.id
      )
        throw new CommerceError("customer_identity_mismatch", 503);
      return customer.id;
    }
    const matches = (
      await this.stripe.customers.list({ email: business.email, limit: 100 })
    ).data.filter((c) => c.metadata.nevora_business_id === business.id);
    if (matches.length > 1)
      throw new CommerceError("customer_reconciliation_required", 409);
    const customer =
      matches[0] ??
      (await this.stripe.customers.create(
        {
          email: business.email,
          metadata: { nevora_business_id: business.id },
        },
        { idempotencyKey: `nevora-customer:${business.id}` },
      ));
    await client.query(
      "UPDATE commerce.businesses SET stripe_customer_id=$2 WHERE id=$1",
      [business.id, customer.id],
    );
    return customer.id;
  }
  async checkout(input: Business, operation: string) {
    return this.locked(input.id, async (client, business) => {
      if (business.subscriptionId)
        throw new CommerceError("use_billing_portal", 409);
      const pending = await client.query(
        "SELECT checkout_id,checkout_url,checkout_expires_at FROM commerce.businesses WHERE id=$1",
        [business.id],
      );
      if (
        pending.rows[0].checkout_id &&
        new Date(pending.rows[0].checkout_expires_at).getTime() > Date.now()
      )
        return unseal(
          pending.rows[0].checkout_url,
          this.store.key,
          `checkout:${business.id}`,
        );
      const count = await this.facts(business, client),
        plan = planFor(count),
        price = await this.price(plan.key),
        customer = await this.customer(client, business);
      const subscriptions = await this.stripe.subscriptions.list({
        customer,
        status: "all",
        limit: 100,
      });
      const existing = subscriptions.data.filter(
        (s) =>
          s.metadata.nevora_business_id === business.id &&
          !["canceled", "incomplete_expired"].includes(s.status),
      );
      if (existing.length)
        throw new CommerceError("subscription_sync_pending", 409);
      const early = Boolean(
        business.trialEnd && business.trialEnd > this.now(),
      );
      const metadata = { nevora_business_id: business.id, nevora_price: price };
      const params: Stripe.Checkout.SessionCreateParams = {
        customer,
        mode: early ? "setup" : "subscription",
        currency: "usd",
        success_url: `${this.options.origin}/billing/return`,
        cancel_url: `${this.options.origin}/billing`,
        client_reference_id: business.id,
        metadata,
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      };
      if (early) {
        params.setup_intent_data = { metadata };
        params.custom_text = {
          submit: {
            message: `Authorize USD ${(plan.amount / 100).toFixed(2)} per month starting ${new Date(business.trialEnd!).toISOString().slice(0, 10)}. Cancel through billing settings.`,
          },
        };
      } else {
        params.line_items = [{ price, quantity: 1 }];
        params.subscription_data = { metadata };
      }
      const session = await this.stripe.checkout.sessions.create(params, {
        idempotencyKey: `nevora-checkout:${business.id}:${operation}`,
      });
      if (!session.url) throw new CommerceError("checkout_unavailable", 503);
      await client.query(
        "UPDATE commerce.businesses SET employee_count=$2,plan_key=$3,checkout_id=$4,checkout_url=$5,checkout_expires_at=$6 WHERE id=$1",
        [
          business.id,
          count,
          plan.key,
          session.id,
          seal(session.url, this.store.key, `checkout:${business.id}`),
          new Date(session.expires_at * 1000),
        ],
      );
      return session.url;
    });
  }
  async portal(input: Business, operation: string) {
    return this.locked(input.id, async (_client, business) => {
      if (!business.customerId)
        throw new CommerceError("subscription_required", 409);
      const session = await this.stripe.billingPortal.sessions.create(
        {
          customer: business.customerId,
          return_url: `${this.options.origin}/billing`,
        },
        { idempotencyKey: `nevora-portal:${business.id}:${operation}` },
      );
      return session.url;
    });
  }
  async webhook(raw: string, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        raw,
        signature,
        this.options.webhookSecret,
      );
    } catch {
      throw new CommerceError("invalid_signature");
    }
    if (event.livemode !== this.options.live)
      throw new CommerceError("mode_mismatch");
    const object = event.data.object as unknown as Record<string, unknown>;
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const id = objectId(object);
      if (!id) return;
      await this.store.transaction(async (client) => {
        const r = await client.query(
          "INSERT INTO commerce.webhooks(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",
          [event.id],
        );
        if (r.rowCount)
          await this.store.enqueue(client, "stripe", `stripe:${event.id}`, {
            sessionId: id,
          });
      });
      return;
    }
    let subscriptionId: string | null = null;
    if (event.type.startsWith("customer.subscription."))
      subscriptionId = objectId(object);
    else if (event.type.startsWith("invoice.")) {
      const parent = object.parent as
        | { subscription_details?: { subscription?: unknown } }
        | undefined;
      subscriptionId = objectId(parent?.subscription_details?.subscription);
    }
    if (subscriptionId) await this.store.webhook(event.id, subscriptionId);
  }
  async syncJob(payload: Record<string, string>) {
    if (payload.sessionId) await this.syncCheckout(payload.sessionId);
    else if (payload.subscriptionId)
      await this.syncSubscription(payload.subscriptionId);
    else throw Error("invalid_stripe_job");
  }
  private async syncCheckout(id: string) {
    const session = await this.stripe.checkout.sessions.retrieve(id, {
      expand: ["setup_intent"],
    });
    if (session.status !== "complete") return;
    const businessId = session.metadata?.nevora_business_id;
    if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId))
      throw Error("subscription_identity_mismatch");
    if (session.mode === "subscription") {
      const subscription = objectId(session.subscription);
      if (subscription) await this.syncSubscription(subscription);
      return;
    }
    if (session.mode !== "setup") return;
    const subscriptionId = await this.locked(
      businessId,
      async (client, business) => {
        const row = (
          await client.query(
            "SELECT checkout_id FROM commerce.businesses WHERE id=$1",
            [businessId],
          )
        ).rows[0];
        const setup = session.setup_intent;
        if (
          row.checkout_id !== session.id ||
          objectId(session.customer) !== business.customerId ||
          !setup ||
          typeof setup === "string" ||
          setup.status !== "succeeded" ||
          objectId(setup.customer) !== business.customerId ||
          !objectId(setup.payment_method)
        )
          throw Error("subscription_identity_mismatch");
        if (business.subscriptionId) return business.subscriptionId;
        const price = session.metadata?.nevora_price;
        if (
          !business.planKey ||
          price !== this.options.prices[business.planKey]
        )
          throw Error("invalid_billing_price");
        const previous = (
          await this.stripe.subscriptions.list({
            customer: business.customerId!,
            status: "all",
            limit: 100,
          })
        ).data.filter(
          (s) =>
            s.metadata.nevora_business_id === businessId &&
            s.metadata.nevora_checkout_session === id,
        );
        if (previous.length > 1)
          throw Error("subscription_reconciliation_required");
        const trialEnd =
          business.trialEnd && business.trialEnd > this.now()
            ? Math.floor(business.trialEnd / 1000)
            : undefined;
        const subscription =
          previous[0] ??
          (await this.stripe.subscriptions.create(
            {
              customer: business.customerId!,
              items: [{ price: price!, quantity: 1 }],
              default_payment_method: objectId(setup.payment_method)!,
              metadata: {
                nevora_business_id: businessId,
                nevora_checkout_session: id,
              },
              ...(trialEnd ? { trial_end: trialEnd } : {}),
            },
            { idempotencyKey: `nevora-subscription:${id}` },
          ));
        await client.query(
          "UPDATE commerce.businesses SET stripe_subscription_id=$2 WHERE id=$1",
          [businessId, subscription.id],
        );
        return subscription.id;
      },
    );
    await this.syncSubscription(subscriptionId);
  }
  async syncSubscription(id: string) {
    const initial = await this.stripe.subscriptions.retrieve(id),
      businessId = initial.metadata.nevora_business_id;
    if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId))
      throw Error("subscription_identity_mismatch");
    await this.locked(businessId, async (client, business) => {
      // Re-read after the database lock: event order and concurrent workers cannot publish an old snapshot.
      const subscription = await this.stripe.subscriptions.retrieve(id, {
        expand: ["latest_invoice"],
      });
      if (
        subscription.metadata.nevora_business_id !== businessId ||
        objectId(subscription.customer) !== business.customerId ||
        (business.subscriptionId && business.subscriptionId !== id)
      )
        throw Error("subscription_identity_mismatch");
      const item = subscription.items.data[0],
        key = Object.entries(this.options.prices).find(
          ([, price]) => price === item?.price.id,
        )?.[0] as PlanKey | undefined;
      if (
        subscription.items.data.length !== 1 ||
        !key ||
        item.quantity !== 1 ||
        item.price.unit_amount !== (key === "small" ? 1900 : 2900) ||
        item.price.currency !== "usd" ||
        item.price.recurring?.interval !== "month" ||
        item.price.recurring.interval_count !== 1
      )
        throw Error("invalid_subscription_price");
      const invoices = await this.stripe.invoices.list({
        subscription: id,
        status: "paid",
        limit: 100,
      });
      let paidThrough = business.paidThrough;
      for (const invoice of invoices.data) {
        if (
          invoice.status !== "paid" ||
          invoice.amount_paid <= 0 ||
          invoice.currency !== "usd"
        )
          continue;
        for (const line of invoice.lines.data) {
          if (
            objectId(line.pricing?.price_details?.price) === item.price.id &&
            Number.isFinite(line.period.end)
          )
            paidThrough = Math.max(paidThrough ?? 0, line.period.end * 1000);
        }
      }
      const failed = ["past_due", "unpaid"].includes(subscription.status),
        latest = subscription.latest_invoice;
      const failureAt =
        latest && typeof latest !== "string"
          ? latest.created * 1000
          : (paidThrough ?? this.now());
      const pastDue = failed
        ? (business.pastDueSince ?? Math.min(this.now(), failureAt))
        : null;
      await this.pushPolicy(business, key === "small" ? 15 : 30, client);
      await client.query(
        "UPDATE commerce.businesses SET stripe_subscription_id=$2,subscription_status=$3,paid_through=$4,past_due_since=$5,plan_key=$6,sync_at=clock_timestamp() WHERE id=$1",
        [
          businessId,
          id,
          subscription.status,
          paidThrough ? new Date(paidThrough) : null,
          pastDue ? new Date(pastDue) : null,
          key,
        ],
      );
    });
  }
  async reconcile() {
    const rows = await this.store.pool.query(
      "SELECT id,stripe_customer_id,stripe_subscription_id,checkout_id FROM commerce.businesses WHERE stripe_customer_id IS NOT NULL",
    );
    for (const row of rows.rows) {
      if (row.stripe_subscription_id)
        await this.syncSubscription(row.stripe_subscription_id);
      else if (row.checkout_id) await this.syncCheckout(row.checkout_id);
      else {
        const subscriptions = await this.stripe.subscriptions.list({
          customer: row.stripe_customer_id,
          status: "all",
          limit: 100,
        });
        for (const s of subscriptions.data)
          if (s.metadata.nevora_business_id === row.id)
            await this.syncSubscription(s.id);
      }
    }
  }
}
