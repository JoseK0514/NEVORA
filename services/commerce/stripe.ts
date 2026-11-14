import type {BillingOwner} from "./owner-authority";
import { createHmac } from "node:crypto";
import Stripe from "stripe";
import type { PoolClient } from "pg";
import type { BillingPort,PlanChangeResult } from "./service";
import { CommerceStore, type Business } from "./store";
import { CommerceError, type PlanKey } from "./model";
import {prepareCheckoutPlan,executeCheckoutCustomer,prepareCheckoutIntent,executePreparedCheckout,recoverCheckouts,type CheckoutPlan,type PreparedCheckout,type KnownCheckout} from "./checkout";
import {preparePlanChange,validatePreparedPlanChange,type PreparedPlanChange} from './plan-change';
import {openBillingOperation,billingActorHash,type BillingOperationContext,type BillingAction} from './billing-operations';
import {verifyInstallationOwner} from './installation';
import type { StripeTaxConfig } from "./stripe-config";
import { assertTaxPrice, readTaxTerms } from "./stripe-tax";
import { unseal } from "./security";
import {parseStripeWebhook,enqueueStripeWebhook} from "./stripe-webhook";
import {reviewStripeRisk} from './stripe-risk';
import {billingPage,type CommerceLanguage} from './language';
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
  portalConfigurations?:Record<PlanKey,string>;
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
  private checkoutPorts(assertCurrent?:(client:PoolClient)=>Promise<void>) {
    return {
      store: this.store,
      assertCurrent,
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
  private billingContext(business:Business,owner:BillingOwner|null|undefined,context?:BillingOperationContext):BillingOperationContext {
    if(context)return context;
    // Internal server/owned fixtures only. HTTP always supplies its current
    // authenticated billing-session fingerprint and final authority callback.
    return {actor:billingActorHash(this.store.key,['internal-server',owner??null]),assertCurrent:async client=>{
      if(business.enrollmentSource==='onboarding'){
        const current=await this.store.business(business.id,client);
        if(!owner||!await verifyInstallationOwner(this.store,current,owner,client))throw new CommerceError('owner_required',403);
      }
    }};
  }
  private async operation(business:Business,operation:string,action:BillingAction,lang:CommerceLanguage|null,owner:BillingOwner|null|undefined,context:BillingOperationContext|undefined,plan?:PlanKey){
    const selected=this.billingContext(business,owner,context);
    const scope=billingActorHash(this.store.key,['stripe',this.options.expectedAccountId??'owned-local-fixture',this.options.live,this.options.origin]);
    return {context:selected,op:await openBillingOperation(this.store,{business,operation,action,request:{lang,...(plan?{plan}:{})},context:selected,scope})};
  }
  private bindCustomer(business:Business,context:BillingOperationContext,customerId:string){
    if(business.customerId!==null&&business.customerId!==customerId)throw new CommerceError('billing_binding_changed',409);
    context.bindCustomer?.(customerId);
  }
  async checkout(business:Business,operation:string,owner?:BillingOwner|null,lang:CommerceLanguage='en',provided?:BillingOperationContext):Promise<string>{
    const {op,context}=await this.operation(business,operation,'checkout',lang,owner,provided);
    try{
      await this.verifyAccount();
      const cached=await op.replay<{url:string;customerId:string;expiresAt:number}>();
      if(cached){this.bindCustomer(business,context,cached.customerId);if(cached.expiresAt<=Date.now())throw new CommerceError('checkout_expired',409);return cached.url;}
      const ports=this.checkoutPorts(client=>op.assertCanIssue(client));
      const plan=await op.prepareStage<CheckoutPlan>('plan',(client,current)=>prepareCheckoutPlan(ports,client,current,op.operation,owner,lang));
      if(plan.state==='subscription_sync_pending')throw new CommerceError('subscription_sync_pending',409);
      await op.prepareStage('customer',async()=>plan.customer);
      const customer=await op.executeStage<typeof plan.customer,{id:string}>('customer',(client,current,params)=>executeCheckoutCustomer(ports,client,current,params));
      this.bindCustomer(business,context,customer.id);
      await op.prepareStage<PreparedCheckout>('checkout',(client,current)=>prepareCheckoutIntent(ports,client,current,op.operation,plan,customer.id));
      const result=await op.executeStage<PreparedCheckout,KnownCheckout>('checkout',(client,current,params)=>executePreparedCheckout(ports,client,current,params));
      if(!result.url)throw new CommerceError(result.code??'checkout_reconciliation_required',409);
      const complete=await op.finish({url:result.url,customerId:customer.id,expiresAt:result.expiresAt});
      if(complete.expiresAt<=Date.now())throw new CommerceError('checkout_expired',409);return complete.url;
    }catch(error){return op.fail(error);}
  }
  async portal(business:Business,operation:string,owner?:BillingOwner|null,lang?:CommerceLanguage,provided?:BillingOperationContext):Promise<string>{
    const {op,context}=await this.operation(business,operation,'portal',lang??null,owner,provided);
    type Prepared={params:Stripe.BillingPortal.SessionCreateParams;customerId:string};
    try{
      await this.verifyAccount();
      const cached=await op.replay<{url:string;customerId:string}>();
      if(cached){this.bindCustomer(business,context,cached.customerId);return cached.url;}
      await op.prepareStage<Prepared>('portal',async(client,current)=>{
        if(!current.customerId)throw new CommerceError('subscription_required',409);
        this.bindCustomer(business,context,current.customerId);
        const proof=createHmac('sha256',this.store.key).update(`portal-return:${business.id}:${op.operation}`).digest('base64url');
        await this.store.handoff(current.id,proof,this.now(),client,3600000,owner);
        return {customerId:current.customerId,params:{customer:current.customerId,return_url:`${this.options.origin}${billingPage(lang??'en','billing')}#handoff=${proof}`,...(lang===undefined?{}:{locale:lang})}};
      });
      const result=await op.executeStage<Prepared,{url:string;customerId:string}>('portal',async(client,current,prepared)=>{
        if(current.customerId!==prepared.customerId)throw new CommerceError('billing_binding_changed',409);
        this.bindCustomer(business,context,prepared.customerId);await op.assertCanIssue(client);
        const session=await this.stripe.billingPortal.sessions.create(prepared.params,{idempotencyKey:`nevora-portal:${business.id}:${op.operation}`});
        return {url:session.url,customerId:prepared.customerId};
      });
      const complete=await op.finish(result);return complete.url;
    }catch(error){return op.fail(error);}
  }
  async planChange(business:Business,operation:string,plan:PlanKey,owner?:BillingOwner|null,lang:CommerceLanguage='en',provided?:BillingOperationContext):Promise<PlanChangeResult>{
    const {op,context}=await this.operation(business,operation,'plan-change',lang,owner,provided,plan);
    type Complete={value:PlanChangeResult;customerId:string;subscriptionId:string};
    try{
      await this.verifyAccount();
      const ports={...this.checkoutPorts(client=>op.assertCanIssue(client)),portalConfigurations:this.options.portalConfigurations};
      const cached=await op.replay<Complete>();
      if(cached){
        this.bindCustomer(business,context,cached.customerId);
        if(business.subscriptionId!==cached.subscriptionId)throw new CommerceError('billing_binding_changed',409);
        return cached.value;
      }
      await op.prepareStage<PreparedPlanChange>('portal',(client,current)=>preparePlanChange(ports,client,current,op.operation,plan,owner,lang));
      const result=await op.executeStage<PreparedPlanChange,Complete>('portal',async(client,current,prepared)=>{
        if(current.customerId!==prepared.customerId||current.subscriptionId!==prepared.subscriptionId)throw new CommerceError('billing_binding_changed',409);
        this.bindCustomer(business,context,prepared.customerId);
        await validatePreparedPlanChange(ports,prepared);await op.assertCanIssue(client);
        const session=await this.stripe.billingPortal.sessions.create(prepared.params,{idempotencyKey:`nevora-plan-portal:${business.id}:${op.operation}`});
        return {value:{url:session.url,plan:prepared.plan,effective:prepared.effective},customerId:prepared.customerId,subscriptionId:prepared.subscriptionId};
      });
      return (await op.finish(result)).value;
    }catch(error){
      const safe=error instanceof Error&&'type' in error&&error.type==='StripeIdempotencyError'?new CommerceError('idempotency_conflict',409):error;
      return op.fail(safe);
    }
  }
  async webhook(raw: string, signature: string) {
    if(!this.options.webhookSecret)throw new CommerceError('webhook_not_configured',503);
    const event = parseStripeWebhook(raw, signature, this.options.webhookSecret, this.options.live);
    // The endpoint secret verifies delivery; an explicit account must also match
    // this installation's merchant. No provider request is needed for admission.
    if (event.account !== undefined && event.account !== this.options.expectedAccountId)
      throw new CommerceError('stripe_account_mismatch', 503);
    await enqueueStripeWebhook(this.store, event);
  }
  async syncJob(payload: Record<string, string>) {
    await this.verifyAccount();
    if (payload.riskType) await reviewStripeRisk(this.store,this.stripe,payload,this.options.live);
    else if (payload.sessionId) await this.syncCheckout(payload.sessionId);
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
            line.amount > 0 &&
            Number.isFinite(line.period.end)
          )
            matchingPaidThrough = Math.max(
              matchingPaidThrough,
              line.period.end * 1000,
            );
      }
      const paidThrough =
        Math.max(business.paidThrough ?? 0, matchingPaidThrough) || null;
      // Preserve the existing trial or paid plan until a replacement price has paid coverage.
      const confirmedPlan =
        business.planKey &&
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
    // Commit a single admission cursor before provider work. The existing
    // admission table is writable by this principal; audit stays write-only.
    // A failed or crashed business advances the next tick, without scanning
    // every business's audit history or changing any database grants.
    const rows=await this.store.transaction(async client=>{
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('commerce-reconcile-selection',0))");
      const marker=await client.query("SELECT key,expires_at>clock_timestamp() AS active FROM commerce.rate_limits WHERE key LIKE 'reconcile-cursor:%' FOR UPDATE");
      if((marker.rowCount??0)>1)throw Error('invalid_reconcile_position');
      const oldKey=marker.rows[0]?.key as string|undefined,cursor=marker.rows[0]?.active?oldKey?.slice('reconcile-cursor:'.length):undefined;
      if(marker.rows[0]?.active&&(!cursor||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(cursor)))throw Error('invalid_reconcile_position');
      let selected=await client.query("SELECT id FROM commerce.businesses WHERE stripe_customer_id IS NOT NULL"+(cursor?' AND id>$2::uuid':'')+" ORDER BY id LIMIT $1",cursor?[limit,cursor]:[limit]);
      if(cursor&&!selected.rowCount)selected=await client.query("SELECT id FROM commerce.businesses WHERE stripe_customer_id IS NOT NULL ORDER BY id LIMIT $1",[limit]);
      if(selected.rowCount){
        const nextKey='reconcile-cursor:'+selected.rows.at(-1)!.id;
        if(oldKey)await client.query("UPDATE commerce.rate_limits SET key=$1,count=1,expires_at=clock_timestamp()+interval '7 days' WHERE key=$2",[nextKey,oldKey]);
        else await client.query("INSERT INTO commerce.rate_limits(key,count,expires_at) VALUES($1,1,clock_timestamp()+interval '7 days')",[nextKey]);
        for(const row of selected.rows)await client.query("INSERT INTO commerce.audit(business_id,event) VALUES($1,'billing_reconcile_attempt')",[row.id]);
      }
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
