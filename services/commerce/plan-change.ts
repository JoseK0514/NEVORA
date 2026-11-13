import { createHmac } from "node:crypto";
import type Stripe from "stripe";
import type { PoolClient } from "pg";
import { CommerceError, type PlanKey } from "./model";
import type { CommerceStore, Business } from "./store";
import type { BillingOwner } from "./owner-authority";
import { billingPage, type CommerceLanguage } from "./language";
import { assertOwnedSubscription, stripeObjectId } from "./stripe-identity";
import { unseal } from "./security";
import { readTaxTerms, assertTaxPrice } from "./stripe-tax";
import type { PlanChangeResult } from "./service";

export type PlanChangePorts = {
  store: CommerceStore;
  stripe: Stripe;
  origin: string;
  prices: Record<PlanKey, string>;
  portalConfigurations?: Record<PlanKey, string>;
  live: boolean;
  now: () => number;
  headcount: (business: Business, client: PoolClient) => Promise<number>;
  assertCurrent?:(client:PoolClient)=>Promise<void>;
};
export type PreparedPlanChange={params:Stripe.BillingPortal.SessionCreateParams;customerId:string;subscriptionId:string;plan:PlanKey;effective:PlanChangeResult['effective']};

function validPrice(price: Stripe.Price, plan: PlanKey, live: boolean) {
  return price.livemode === live && price.currency === "usd" &&
    price.unit_amount === (plan === "small" ? 1900 : 2900) &&
    price.recurring?.interval === "month" && price.recurring.interval_count === 1;
}

function assertPortalPolicy(configuration: Stripe.BillingPortal.Configuration, price: Stripe.Price, live: boolean) {
  const update = configuration.features.subscription_update, product = update.products?.[0];
  if (
    !configuration.active || configuration.livemode !== live || !update.enabled ||
    update.default_allowed_updates.length !== 1 || update.default_allowed_updates[0] !== "price" ||
    update.billing_cycle_anchor !== "unchanged" || update.proration_behavior !== "always_invoice" ||
    update.trial_update_behavior !== "continue_trial" ||
    update.schedule_at_period_end.conditions.length !== 1 ||
    update.schedule_at_period_end.conditions[0].type !== "decreasing_item_amount" ||
    update.products?.length !== 1 || product?.product !== stripeObjectId(price.product) ||
    product.prices.length !== 1 || product.prices[0] !== price.id || product.adjustable_quantity.enabled
  ) throw new CommerceError("plan_change_policy_unavailable", 503);
}

/** Only creates hosted confirmation. Paid invoices, never the return URL, grant capacity. */
export async function preparePlanChange(
  ports: PlanChangePorts, client:PoolClient, business: Business, operation: string, plan: PlanKey,
  owner: BillingOwner | null | undefined, lang: CommerceLanguage,
): Promise<PreparedPlanChange> {
  const { store, stripe } = ports, configurationId = ports.portalConfigurations?.[plan];
  if (!configurationId) throw new CommerceError("plan_changes_unavailable", 503);
    if (!business.customerId || !business.subscriptionId)
      throw new CommerceError("subscription_required", 409);
    const subscription = await stripe.subscriptions.retrieve(business.subscriptionId);
    assertOwnedSubscription(subscription, business);
    if (subscription.id !== business.subscriptionId || subscription.livemode !== ports.live)
      throw new CommerceError("subscription_reconciliation_required", 409);
    if (!['active', 'trialing'].includes(subscription.status) || subscription.pending_update ||
        subscription.schedule || subscription.cancel_at_period_end)
      throw new CommerceError("subscription_change_pending", 409);
    const item = subscription.items.data[0], currentPlan = Object.entries(ports.prices)
      .find(([, price]) => price === item?.price.id)?.[0] as PlanKey | undefined;
    if (subscription.items.data.length !== 1 || !item.id || item.quantity !== 1 ||
        !currentPlan || !validPrice(item.price, currentPlan, ports.live))
      throw new CommerceError("invalid_subscription_price", 409);
    if (currentPlan === plan) throw new CommerceError("plan_already_selected", 409);
    if ((await stripe.invoices.list({ subscription: subscription.id, status: "open", limit: 1 })).data.length)
      throw new CommerceError("payment_required", 409);
    const count = await ports.headcount(business, client);
    await ports.assertCurrent?.(client);
    if (!Number.isSafeInteger(count) || count < 0 || count > 30)
      throw new CommerceError("assisted_quote_required", 409);
    if (plan === "small" && count > 15) throw new CommerceError("plan_employee_limit", 409);
    const price = await stripe.prices.retrieve(ports.prices[plan]);
    if (!price.active || !validPrice(price, plan, ports.live) ||
        stripeObjectId(price.product) !== stripeObjectId(item.price.product))
      throw new CommerceError("invalid_billing_price", 503);
    const configuration = await stripe.billingPortal.configurations.retrieve(configurationId, {
      expand: ["features.subscription_update.products"],
    });
    assertPortalPolicy(configuration, price, ports.live);
    const intent = (await client.query(
      "SELECT operation,params_secret FROM commerce.checkout_intents WHERE business_id=$1 AND operation=$2",
      [business.id, subscription.metadata.nevora_checkout_operation ?? ""],
    )).rows[0];
    if (intent) {
      const tax = readTaxTerms(JSON.parse(unseal(intent.params_secret, store.key, `intent:${business.id}:${intent.operation}`)));
      if (tax) await assertTaxPrice(stripe, price, tax);
    }
    const proof = createHmac("sha256", store.key)
      .update(`plan-portal-return:${business.id}:${operation}`).digest("base64url");
    await store.handoff(business.id, proof, ports.now(), client, 3600000, owner);
    const returnUrl = `${ports.origin}${billingPage(lang, 'billing')}#handoff=${proof}`;
    return {customerId:business.customerId,subscriptionId:subscription.id,plan,effective:plan==='team'?'after_payment':'period_end',params:{
        customer: business.customerId, configuration: configurationId, locale: lang, return_url: returnUrl,
        flow_data: {
          type: "subscription_update_confirm",
          subscription_update_confirm: {
            subscription: subscription.id, items: [{ id: item.id, price: price.id, quantity: 1 }],
          },
          after_completion: { type: "redirect", redirect: { return_url: returnUrl } },
        },
    }};
}

/** Revalidate mutable merchant policy without recomputing the saved intent. */
export async function validatePreparedPlanChange(ports:PlanChangePorts,prepared:PreparedPlanChange){
 const priceId=prepared.params.flow_data?.subscription_update_confirm?.items?.[0]?.price,configurationId=prepared.params.configuration;
 if(typeof priceId!=='string'||typeof configurationId!=='string')throw new CommerceError('plan_change_policy_unavailable',503);
 const price=await ports.stripe.prices.retrieve(priceId);
 if(!price.active||!validPrice(price,prepared.plan,ports.live))throw new CommerceError('invalid_billing_price',503);
 const configuration=await ports.stripe.billingPortal.configurations.retrieve(configurationId,{expand:['features.subscription_update.products']});
 assertPortalPolicy(configuration,price,ports.live);
}
