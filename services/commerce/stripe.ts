import type {BillingOwner} from "./owner-authority";
import { createHmac } from "node:crypto";
import Stripe from "stripe";
import type { PoolClient } from "pg";
import type { BillingPort } from "./service";
import { CommerceStore, type Business } from "./store";
import { CommerceError, type PlanKey } from "./model";
import { createCheckout, recoverCheckouts } from "./checkout";
import type { StripeTaxConfig } from "./stripe-config";
import { assertTaxPrice, readTaxTerms } from "./stripe-tax";
import { unseal } from "./security";
import {parseStripeWebhook,enqueueStripeWebhook} from "./stripe-webhook";
import {
  applyInstallationCapacity,
  readInstallationHeadcount,
} from "./installation";
import {
  assertOwnedSubscription,
  stripeObjectId,
  terminalSubscription,
} from "./stripe-identity";
type BillingOptions = {
  origin: string;
  prices: Record<PlanKey, string>;
  webhookSecret?: string;
  live: boolean;
  expectedAccountId?: string;
  tax?: StripeTaxConfig;
  now?: () => number;
  facts?: (business: Business) => Promise<number>;
  policy?: (business: Business, limit: number) => Promise<void>;
};
export class StripeBilling implements BillingPort {
  private accountCheck?: Promise<string>;
  constructor(
    readonly store: CommerceStore,
    readonly stripe: Stripe,
    readonly options: BillingOptions,
  ) {}
  now() {
    return this.options.now?.() ?? Date.now();
  }
  private async verifyAccount() {
    const expected = this.options.expectedAccountId;
    if (!expected) return; // Loopback development fixtures may omit a binding.
    this.accountCheck ??= this.stripe.accounts.retrieveCurrent().then((account) => account.id);
    try {
      if (await this.accountCheck !== expected)
        throw new CommerceError("stripe_account_mismatch", 503);
    } catch (error) {
      this.accountCheck = undefined;
      if (error instanceof CommerceError) throw error;
      throw new CommerceError("stripe_account_unavailable", 503);
    }
  }
  private checkoutPorts() {
    return {
      store: this.store,
      stripe: this.stripe,
      origin: this.options.origin,
      prices: this.options.prices,
      live: this.options.live,
      tax: this.options.tax,
      now: () => this.now(),
      headcount: (business: Business, client: PoolClient) =>
        this.options.facts
          ? this.options.facts(business)
          : readInstallationHeadcount(this.store, business, client),
    };
  }
  async checkout(business: Business, operation: string,owner?:BillingOwner|null) {
    await this.verifyAccount();
    return createCheckout(this.checkoutPorts(), business, operation,owner);
  }
  async portal(input: Business, operation: string,owner?:BillingOwner|null) {
    await this.verifyAccount();
    return this.store.withBusinessLock(input.id, async (client, business) => {
      if (!business.customerId)
        throw new CommerceError("subscription_required", 409);
      const proof = createHmac("sha256", this.store.key)
        .update(`portal-return:${business.id}:${operation}`)
        .digest("base64url");
      await this.store.handoff(business.id, proof, this.now(), client, 3600000,owner);
      const session = await this.stripe.billingPortal.sessions.create(
        {
          customer: business.customerId,
          return_url: `${this.options.origin}/pages/nevora-billing#handoff=${proof}`,
        },
        { idempotencyKey: `nevora-portal:${business.id}:${operation}` },
      );
      return session.url;
    });
  }
  async webhook(raw: string, signature: string) {
    if(!this.options.webhookSecret)throw new CommerceError('webhook_not_configured',503);
    await enqueueStripeWebhook(this.store,parseStripeWebhook(raw,signature,this.options.webhookSecret,this.options.live));
  }
  async syncJob(payload: Record<string, string>) {
    await this.verifyAccount();
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
    const subscriptionId = await this.store.withBusinessLock(
      businessId,
      async (client, business) => {
        if (stripeObjectId(session.customer) !== business.customerId)
          throw Error("subscription_identity_mismatch");
        const intent = (
          await client.query(
            "SELECT * FROM commerce.checkout_intents WHERE business_id=$1 AND operation=$2",
            [businessId, session.metadata?.nevora_checkout_operation ?? ""],
          )
        ).rows[0];
        if (!intent) return null;
        if (intent.session_id && intent.session_id !== session.id)
          throw Error("checkout_identity_mismatch");
        if (
          session.metadata?.nevora_price !==
          this.options.prices[intent.plan_key as PlanKey]
        )
          throw Error("invalid_billing_price");
        if (session.mode === "subscription") {
          const incoming = stripeObjectId(session.subscription);
          if (!incoming) return null;
          if (business.subscriptionId === incoming) return incoming;
          if (business.subscriptionId !== intent.previous_subscription_id)
            return null;
          if (business.subscriptionId) {
            const current = await this.stripe.subscriptions.retrieve(
              business.subscriptionId,
            );
            assertOwnedSubscription(current, business);
            if (!terminalSubscription(current.status))
              throw Error("subscription_reconciliation_required");
          }
          return incoming;
        }
        if (session.mode !== "setup") return null;
        if (business.subscriptionId) {
          const current = await this.stripe.subscriptions.retrieve(
            business.subscriptionId,
          );
          assertOwnedSubscription(current, business);
          if (current.metadata.nevora_checkout_session === id)
            return current.id;
          if (business.subscriptionId !== intent.previous_subscription_id)
            return null;
          if (!terminalSubscription(current.status))
            throw Error("subscription_reconciliation_required");
        }
        const setup = session.setup_intent;
        if (
          !setup ||
          typeof setup === "string" ||
          setup.status !== "succeeded" ||
          stripeObjectId(setup.customer) !== business.customerId ||
          !stripeObjectId(setup.payment_method)
        )
          throw Error("subscription_identity_mismatch");
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
        const chargeStart = Math.max(
          business.trialEnd ?? 0,
          business.paidThrough ?? 0,
        );
        let subscription = previous[0];
        if (!subscription) {
          const originalParams = JSON.parse(unseal(intent.params_secret, this.store.key, `intent:${businessId}:${intent.operation}`)) as Stripe.Checkout.SessionCreateParams;
          const tax = readTaxTerms(originalParams);
          if (tax) {
            const price = await this.stripe.prices.retrieve(this.options.prices[intent.plan_key as PlanKey]);
            if (!price.active || price.livemode !== this.options.live || price.currency !== "usd" ||
                price.unit_amount !== (intent.plan_key === "small" ? 1900 : 2900) ||
                price.recurring?.interval !== "month" || price.recurring.interval_count !== 1)
              throw new CommerceError("invalid_billing_price", 503);
            await assertTaxPrice(this.stripe, price, tax);
          }
          subscription = await this.stripe.subscriptions.create(
            {
              customer: business.customerId!,
              items: [
                {
                  price: this.options.prices[intent.plan_key as PlanKey],
                  quantity: 1,
                },
              ],
              default_payment_method: stripeObjectId(setup.payment_method)!,
              automatic_tax: { enabled: Boolean(tax) },
              metadata: {
                nevora_business_id: businessId,
                nevora_checkout_session: id,
                nevora_checkout_operation: intent.operation,
              },
              ...(chargeStart > this.now()
                ? { trial_end: Math.floor(chargeStart / 1000) }
                : {}),
            },
            { idempotencyKey: `nevora-subscription:${id}` },
          );
        }
        return subscription.id;
      },
    );
    if (subscriptionId) await this.syncSubscription(subscriptionId);
  }
  async syncSubscription(id: string) {
    await this.verifyAccount();
    const initial = await this.stripe.subscriptions.retrieve(id),
      businessId = initial.metadata.nevora_business_id;
    if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId))
      throw Error("subscription_identity_mismatch");
    const taxReviewRequired = await this.store.withBusinessLock(businessId, async (client, business) => {
      const subscription = await this.stripe.subscriptions.retrieve(id, {
        expand: ["latest_invoice"],
      });
      assertOwnedSubscription(subscription, business);
      if (business.subscriptionId !== id) {
        if (
          business.subscriptionId &&
          terminalSubscription(subscription.status)
        )
          return;
        const intent = (
          await client.query(
            "SELECT previous_subscription_id FROM commerce.checkout_intents WHERE business_id=$1 AND operation=$2",
            [businessId, subscription.metadata.nevora_checkout_operation ?? ""],
          )
        ).rows[0];
        if (
          !intent ||
          intent.previous_subscription_id !== business.subscriptionId
        )
          throw Error("subscription_identity_mismatch");
        if (business.subscriptionId) {
          const current = await this.stripe.subscriptions.retrieve(
            business.subscriptionId,
          );
          assertOwnedSubscription(current, business);
          if (!terminalSubscription(current.status))
            throw Error("subscription_reconciliation_required");
        }
      }
      const item = subscription.items.data[0],
        key = Object.entries(this.options.prices).find(
          ([, price]) => price === item?.price.id,
        )?.[0] as PlanKey | undefined;
      if (
        subscription.items.data.length !== 1 ||
        item?.price.livemode !== this.options.live ||
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
      const intent = (await client.query(
        "SELECT operation,params_secret FROM commerce.checkout_intents WHERE business_id=$1 AND operation=$2",
        [businessId, subscription.metadata.nevora_checkout_operation ?? ""],
      )).rows[0];
      const tax = intent ? readTaxTerms(JSON.parse(unseal(intent.params_secret, this.store.key, `intent:${businessId}:${intent.operation}`))) : undefined;
      const taxIssues = new Set<string>();
      if (tax && (!subscription.automatic_tax?.enabled || subscription.automatic_tax.disabled_reason))
        taxIssues.add(`stripe_tax_subscription_review:${id.slice(0,100)}`);
      let matchingPaidThrough = 0;
      for (const invoice of invoices.data) {
        if (
          invoice.status !== "paid" ||
          invoice.amount_paid <= 0 ||
          invoice.currency !== "usd"
        )
          continue;
        if (tax && (!invoice.automatic_tax?.enabled || invoice.automatic_tax.status !== "complete" || invoice.automatic_tax.disabled_reason)) {
          taxIssues.add(`stripe_tax_invoice_review:${invoice.id.slice(0,100)}`);
          continue;
        }
        for (const line of invoice.lines.data)
          if (
            stripeObjectId(line.pricing?.price_details?.price) ===
              item.price.id &&
            Number.isFinite(line.period.end)
          )
            matchingPaidThrough = Math.max(
              matchingPaidThrough,
              line.period.end * 1000,
            );
      }
      const paidThrough =
        Math.max(business.paidThrough ?? 0, matchingPaidThrough) || null;
      // Preserve previously paid capacity until a replacement price has paid coverage.
      const confirmedPlan =
        business.planKey &&
        business.paidThrough &&
        matchingPaidThrough <= this.now()
          ? business.planKey
          : key;
      const latest = subscription.latest_invoice,
        failed = ["past_due", "unpaid"].includes(subscription.status),
        failureAt =
          latest && typeof latest !== "string"
            ? latest.created * 1000
            : (paidThrough ?? this.now()),
        pastDue = failed
          ? (business.pastDueSince ?? Math.min(this.now(), failureAt))
          : null;
      if (this.options.policy)
        await this.options.policy(
          business,
          confirmedPlan === "small" ? 15 : 30,
        );
      else
        await applyInstallationCapacity(
          this.store,
          business,
          confirmedPlan === "small" ? 15 : 30,
          client,
        );
      await client.query(
        "UPDATE commerce.businesses SET stripe_subscription_id=$2,subscription_status=$3,paid_through=$4,past_due_since=$5,plan_key=$6,sync_at=clock_timestamp() WHERE id=$1",
        [
          businessId,
          id,
          subscription.status,
          paidThrough ? new Date(paidThrough) : null,
          pastDue ? new Date(pastDue) : null,
          confirmedPlan,
        ],
      );
      for (const event of taxIssues) {
        // Namespaced internal event receipts use the existing durable dedup table.
        // The API principal can insert audit rows, but deliberately cannot read them.
        const receipt = await client.query(
          "INSERT INTO commerce.webhooks(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",
          [`tax-review:${businessId}:${event}`],
        );
        if (receipt.rowCount) await client.query("INSERT INTO commerce.audit(business_id,event) VALUES($1,$2)", [businessId, event]);
      }
      return taxIssues.size > 0;
    });
    // Commit the retained coverage and operator exception before retrying the job.
    // A paid provider invoice is irreversible here; this gate does not undo a charge.
    if (taxReviewRequired) throw new CommerceError("stripe_tax_review_required", 503);
  }
  async reconcile({limit=25}:{limit?:number}={}) {
    if(!Number.isSafeInteger(limit)||limit<1||limit>25)throw Error('invalid_reconcile_limit');
    await this.verifyAccount();
    // Commit attempt order before any provider call. A crashed or failing first
    // business therefore cannot starve later ticks, including fresh runtimes.
    const rows=await this.store.transaction(async client=>{
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('commerce-reconcile-selection',0))");
      const selected=await client.query("SELECT b.id FROM commerce.businesses b WHERE stripe_customer_id IS NOT NULL ORDER BY (SELECT max(a.id) FROM commerce.audit a WHERE a.business_id=b.id AND a.event='billing_reconcile_attempt') NULLS FIRST,b.id LIMIT $1",[limit]);
      for(const row of selected.rows)await client.query("INSERT INTO commerce.audit(business_id,event) VALUES($1,'billing_reconcile_attempt')",[row.id]);
      return selected;
    });
    let failed = 0;
    for (const row of rows.rows) {
      try {
        let business = await this.store.business(row.id);
        await recoverCheckouts(this.checkoutPorts(), business);
        const checkout = (
          await this.store.pool.query(
            "SELECT checkout_id FROM commerce.businesses WHERE id=$1",
            [row.id],
          )
        ).rows[0]?.checkout_id;
        if (checkout) await this.syncCheckout(checkout);
        business = await this.store.business(row.id);
        if (business.subscriptionId)
          await this.syncSubscription(business.subscriptionId);
        else {
          const subscriptions = (
            await this.stripe.subscriptions.list({
              customer: business.customerId!,
              status: "all",
              limit: 100,
            })
          ).data.filter(
            (s) =>
              s.metadata.nevora_business_id === business.id &&
              !terminalSubscription(s.status),
          );
          if (subscriptions.length > 1)
            throw Error("subscription_reconciliation_required");
          if (subscriptions[0])
            await this.syncSubscription(subscriptions[0].id);
        }
      } catch {
        failed++;
        await this.store.pool.query(
          "INSERT INTO commerce.audit(business_id,event) VALUES($1,'billing_reconcile_retry_required')",
          [row.id],
        );
      }
    }
    return { checked: rows.rowCount ?? 0, failed };
  }
}
