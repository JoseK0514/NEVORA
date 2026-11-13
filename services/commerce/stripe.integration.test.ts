import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { Pool } from "pg";
import { createHmac,randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { CommerceStore } from "./store";
import { StripeBilling } from "./stripe";
import { StripeFixture } from "./stripe-fixture";
import { dropTestDatabase } from "./test-database";
import { accessAt } from "./model";
import { createCommerce } from "./service";
import { digest } from "./security";
import { commercePrincipalGrants } from "./principals";
const enabled = Boolean(process.env.NEVORA_COMMERCE_TEST_URL),
  id = "11111111-1111-4111-8111-111111111111",
  now = Date.parse("2026-11-07T12:00:00Z"),
  secret = "whsec_fictional_test_only";
describe.skipIf(!enabled)("Stripe lifecycle with real catalog and SDK", () => {
  let admin: Pool,
    pool: Pool,
    store: CommerceStore,
    billing: StripeBilling,
    provider: StripeFixture,
    name: string;
  async function business(businessId = id) {
    await pool.query(
      "INSERT INTO commerce.accounts(id,email,profile,verified_at) VALUES($1,$2,$3,clock_timestamp())",
      [
        businessId,
        `${businessId}@example.test`,
        { businessName: "Example Shop", email: `${businessId}@example.test` },
      ],
    );
    await pool.query(
      "INSERT INTO commerce.businesses(id,state,employee_count,trial_started_at,trial_ends_at) VALUES($1,'ready',10,$2,$3)",
      [businessId, new Date(now), new Date("2026-12-07T12:00:00Z")],
    );
    return store.business(businessId);
  }
  beforeEach(async () => {
    const url = new URL(process.env.NEVORA_COMMERCE_TEST_URL!);
    if (url.hostname !== "127.0.0.1" || url.search || process.env.DATABASE_URL)
      throw Error("owned cluster required");
    admin = new Pool({ connectionString: url.href });
    name = `commerce_test_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`;
    pool = new Pool({
      connectionString: url.href,
      max: 2,
      statement_timeout: 2000,
    });
    await pool.query(
      await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
    );
    store = new CommerceStore(pool, Buffer.alloc(32, 3));
    provider = new StripeFixture();
    billing = new StripeBilling(store, provider.client, {
      origin: "https://accounts.example.test",
      prices: { small: "price_small", team: "price_team" },
      webhookSecret: secret,
      live: false,
      now: () => now,
      facts: async (b) => provider.counts.get(b.id) ?? 10,
      policy: async () => {},
    });
    await business();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await pool?.end();
    if (admin) {
      if (name) await dropTestDatabase(admin, name);
      await admin.end();
    }
  });
  async function checkout(businessId = id, operation = randomUUID()) {
    await billing.checkout(await store.business(businessId), operation);
    return [...provider.sessions.values()].at(-1)!;
  }
  async function subscribed(businessId = id) {
    const session = await checkout(businessId);
    provider.complete(session.id);
    await billing.syncJob({ sessionId: session.id });
    const b = await store.business(businessId);
    return {
      session,
      subscription: provider.subscriptions.get(b.subscriptionId!)!,
    };
  }
  it("reuses one open checkout under concurrent operation IDs without charging during trial", async () => {
    const b = await store.business(id),
      urls = await Promise.all([
        billing.checkout(b, randomUUID()),
        billing.checkout(b, randomUUID()),
      ]);
    expect(urls).toEqual([
      "https://checkout.stripe.com/c/pay/cs_fixture_1",
      "https://checkout.stripe.com/c/pay/cs_fixture_1",
    ]);
    expect(provider.sessions.size).toBe(1);
    expect([...provider.sessions.values()][0].mode).toBe("setup");
    expect((await store.business(id)).paidThrough).toBeNull();
  });
  it('keeps Spanish checkout, cancel and Portal destinations on the approved origin',async()=>{
    const b=await store.business(id),operation=randomUUID();
    const first=await billing.checkout(b,operation,null,'es');
    expect(await billing.checkout(b,operation,null,'en')).toBe(first);
    const checkoutRequest=provider.requests.find(r=>r.path==='/v1/checkout/sessions'&&r.method==='POST')!.form;
    expect(checkoutRequest.get('locale')).toBe('es');
    const success=new URL(checkoutRequest.get('success_url')!),cancel=new URL(checkoutRequest.get('cancel_url')!);
    expect(success.origin).toBe('https://accounts.example.test');expect(success.pathname).toBe('/pages/es-pago');expect(success.hash).toMatch(/^#handoff=[A-Za-z0-9_-]{43}$/);
    expect(cancel.pathname).toBe('/pages/es-facturacion');
    await billing.portal(await store.business(id),randomUUID(),null,'es');
    const portalRequest=provider.requests.find(r=>r.path==='/v1/billing_portal/sessions'&&r.method==='POST')!.form;
    expect(portalRequest.get('locale')).toBe('es');expect(new URL(portalRequest.get('return_url')!).pathname).toBe('/pages/es-facturacion');
    expect((await store.business(id)).trialEnd).toBe(b.trialEnd);expect((await store.business(id)).paidThrough).toBeNull();
  });
  it('replays an in-flight Portal request created before language support with identical provider parameters',async()=>{
    await checkout();const b=await store.business(id),operation=randomUUID();
    const proof=createHmac('sha256',store.key).update(`portal-return:${id}:${operation}`).digest('base64url');
    const previous=await provider.client.billingPortal.sessions.create({customer:b.customerId!,return_url:`https://accounts.example.test/pages/nevora-billing#handoff=${proof}`},{idempotencyKey:`nevora-portal:${id}:${operation}`});
    expect(await billing.portal(b,operation)).toBe(previous.url);
    const requests=provider.requests.filter(r=>r.path==='/v1/billing_portal/sessions'&&r.method==='POST');
    expect(requests).toHaveLength(2);expect(requests[0].form.has('locale')).toBe(false);expect(requests[1].form.toString()).toBe(requests[0].form.toString());
  });
  it("keeps the Checkout integration label stable when a refused creation is retried", async () => {
    const operation=randomUUID();provider.failCheckoutBeforeCreate=true;
    await expect(checkout(id,operation)).rejects.toThrow();
    const first=provider.requests.find(r=>r.path==='/v1/checkout/sessions'&&r.method==='POST')!.form.get('integration_identifier');
    expect(first).toEqual(expect.stringMatching(/^nevora-billing-[a-z]{8}$/));
    provider.failCheckoutBeforeCreate=false;
    await checkout(id,operation);
    const attempts=provider.requests.filter(r=>r.path==='/v1/checkout/sessions'&&r.method==='POST');
    expect(attempts).toHaveLength(2);
    expect(attempts[1].form.get('integration_identifier')).toBe(first);
    expect(provider.sessions.size).toBe(1);
  });
  it("rejects the wrong merchant before checkout, portal or reconciliation", async () => {
    Object.assign(billing.options, { expectedAccountId: "acct_wrong" });
    const stored = await store.business(id);
    for (const action of [
      () => checkout(),
      () => billing.portal({ ...stored, customerId: "cus_unknown" }, randomUUID()),
      () => billing.syncJob({ subscriptionId: "sub_unknown" }),
      () => billing.reconcile(),
    ]) await expect(action()).rejects.toThrow("stripe_account_mismatch");
    expect(provider.requests.filter((r) => r.method === "POST")).toHaveLength(0);
    expect((await store.business(id)).paidThrough).toBeNull();
  });
  it("retries a failed account check and shares a successful check across concurrent calls", async () => {
    Object.assign(billing.options, { expectedAccountId: provider.accountId });
    provider.unavailableAccount = true;
    await expect(checkout()).rejects.toThrow();
    expect(provider.sessions.size).toBe(0);
    provider.unavailableAccount = false;
    await Promise.all([checkout(), checkout()]);
    expect(provider.requests.filter((r) => r.path === "/v1/account")).toHaveLength(2);
    expect(provider.sessions.size).toBe(1);
  });
  it("rejects a price from another mode before creating a customer", async () => {
    provider.prices.get("price_small")!.livemode = true;
    await expect(checkout()).rejects.toThrow("invalid_billing_price");
    expect(provider.customers.size).toBe(0);
  });
  function enableTax() {
    billing.options.tax = { code: "txcd_10103000", behavior: "exclusive" };
    provider.prices.get("price_small")!.tax_behavior = "exclusive";
    provider.prices.get("price_team")!.tax_behavior = "exclusive";
  }
  it("enables Tax for immediate subscription Checkout with a persisted billing address", async () => {
    enableTax();
    await pool.query("UPDATE commerce.businesses SET trial_ends_at=$2 WHERE id=$1", [id, new Date(now - 1)]);
    await checkout();
    const form = provider.requests.find((r) => r.path === "/v1/checkout/sessions" && r.method === "POST")!.form;
    expect(form.get("mode")).toBe("subscription");
    expect(form.get("automatic_tax[enabled]")).toBe("true");
    expect(form.get("billing_address_collection")).toBe("required");
    expect(form.get("customer_update[address]")).toBe("auto");
    expect(form.get("tax_id_collection[enabled]")).toBe("true");
  });
  it("preserves authorized Tax across a setup checkout and changed runtime configuration", async () => {
    enableTax();
    const session = await checkout();
    const form = provider.requests.find((r) => r.path === "/v1/checkout/sessions" && r.method === "POST")!.form;
    expect(form.get("automatic_tax[enabled]")).toBeNull();
    expect(form.get("billing_address_collection")).toBe("required");
    expect(form.get("customer_update[address]")).toBe("auto");
    expect(form.get("tax_id_collection[enabled]")).toBeNull();
    expect(form.get("custom_text[submit][message]")).toContain("plus applicable tax");
    billing.options.tax = undefined;
    session.metadata.nevora_tax_terms = "provider-metadata-is-not-authority";
    provider.complete(session.id);
    await billing.syncJob({ sessionId: session.id });
    await billing.syncJob({ sessionId: session.id });
    const requests = provider.requests.filter((r) => r.path === "/v1/subscriptions" && r.method === "POST");
    expect(requests).toHaveLength(1);
    expect(requests[0].form.get("automatic_tax[enabled]")).toBe("true");
    expect((await store.business(id)).paidThrough).toBeNull();
  });
  it("does not enable Tax for an older Tax-off intent when runtime configuration changes", async () => {
    const session = await checkout();
    enableTax();
    provider.complete(session.id);
    await billing.syncJob({ sessionId: session.id });
    const form = provider.requests.find((r) => r.path === "/v1/subscriptions" && r.method === "POST")!.form;
    expect(form.get("automatic_tax[enabled]")).not.toBe("true");
  });
  it.each(["classification", "behavior"])("rejects incorrect Tax %s before checkout", async (kind) => {
    enableTax();
    if (kind === "classification") provider.products.get("prod_nevora")!.tax_code = "txcd_10000000";
    else provider.prices.get("price_small")!.tax_behavior = "inclusive";
    await expect(checkout()).rejects.toThrow("stripe_tax_price_mismatch");
    expect(provider.customers.size).toBe(0);
    expect(provider.sessions.size).toBe(0);
  });
  it("blocks delayed subscription creation when authorized Tax classification changes", async () => {
    enableTax();
    const session = await checkout();
    provider.products.get("prod_nevora")!.tax_code = "txcd_10000000";
    provider.complete(session.id);
    await expect(billing.syncJob({ sessionId: session.id })).rejects.toThrow("stripe_tax_price_mismatch");
    expect(provider.subscriptions.size).toBe(0);
    expect((await store.business(id)).paidThrough).toBeNull();
  });
  it("retains the Tax requirement after missing location, then retries exactly once", async () => {
    enableTax();
    const session = await checkout();
    provider.complete(session.id);
    provider.taxLocationValid = false;
    await expect(billing.syncJob({ sessionId: session.id })).rejects.toThrow();
    expect(provider.subscriptions.size).toBe(0);
    expect((await store.business(id)).paidThrough).toBeNull();
    provider.taxLocationValid = true;
    await billing.syncJob({ sessionId: session.id });
    const requests = provider.requests.filter((r) => r.path === "/v1/subscriptions" && r.method === "POST");
    expect(requests).toHaveLength(2);
    expect(requests.every((r) => r.form.get("automatic_tax[enabled]") === "true")).toBe(true);
    expect(requests[0].form.toString()).toBe(requests[1].form.toString());
    expect(provider.subscriptions.size).toBe(1);
  });
  it("does not extend paid coverage from a Tax-disabled renewal and records an operator exception", async () => {
    enableTax();
    const { subscription } = await subscribed();
    provider.markPaid(subscription.id, 1799236800); // A completed calculation can legitimately have zero Tax.
    await billing.syncJob({ subscriptionId: subscription.id });
    const paidThrough = (await store.business(id)).paidThrough;
    expect(paidThrough).toBe(1799236800000);
    subscription.automatic_tax = { enabled: false, disabled_reason: "requires_location_inputs" };
    provider.markPaid(subscription.id, 1801915200);
    await expect(billing.syncJob({ subscriptionId: subscription.id })).rejects.toThrow("stripe_tax_review_required");
    expect((await store.business(id)).paidThrough).toBe(paidThrough);
    const events = (await pool.query("SELECT event FROM commerce.audit WHERE business_id=$1 AND event LIKE 'stripe_tax_%'", [id])).rows;
    expect(events.length).toBeGreaterThan(0);
    await expect(billing.syncJob({ subscriptionId: subscription.id })).rejects.toThrow("stripe_tax_review_required");
    expect((await store.business(id)).paidThrough).toBe(paidThrough);
    expect((await pool.query("SELECT event FROM commerce.audit WHERE business_id=$1 AND event LIKE 'stripe_tax_%'", [id])).rows).toEqual(events);
  });
  it("rejects failed invoice Tax calculation even when the subscription still enables Tax", async () => {
    enableTax();
    const { subscription } = await subscribed();
    provider.markPaid(subscription.id);
    provider.payments.get(subscription.id)![0].automatic_tax!.status = "failed";
    await expect(billing.syncJob({ subscriptionId: subscription.id })).rejects.toThrow("stripe_tax_review_required");
    expect((await store.business(id)).paidThrough).toBeNull();
  });
  it("records a Tax exception using the existing restricted catalog API principal", async () => {
    enableTax();
    const { subscription } = await subscribed();
    subscription.automatic_tax = { enabled: false, disabled_reason: "requires_location_inputs" };
    provider.markPaid(subscription.id);
    const suffix = randomUUID().replaceAll("-", "").slice(0, 24);
    const api = `nv_commerce_api_${suffix}`, enrollment = `nv_commerce_enroll_${suffix}`;
    await pool.query(`CREATE ROLE ${api} NOLOGIN; CREATE ROLE ${enrollment} NOLOGIN`);
    for (const statement of commercePrincipalGrants(api, enrollment)) await pool.query(statement);
    const url = new URL(process.env.NEVORA_COMMERCE_TEST_URL!); url.pathname = `/${name}`;
    const restricted = new Pool({ connectionString: url.href, options: `-c role=${api}`, max: 1 });
    try {
      const scoped = new StripeBilling(new CommerceStore(restricted, store.key), provider.client, billing.options);
      await expect(scoped.syncJob({ subscriptionId: subscription.id })).rejects.toThrow("stripe_tax_review_required");
      expect((await pool.query("SELECT event FROM commerce.audit WHERE business_id=$1 AND event LIKE 'stripe_tax_%'", [id])).rows.length).toBeGreaterThan(0);
    } finally {
      await restricted.end();
      await pool.query(`DROP OWNED BY ${api},${enrollment}; DROP ROLE ${api},${enrollment}`);
    }
  });
  it("revalidates an encrypted immediate Checkout after failure before the first provider creation", async () => {
    enableTax();
    await pool.query("UPDATE commerce.businesses SET trial_ends_at=$2 WHERE id=$1", [id, new Date(now - 1)]);
    const operation = randomUUID();
    provider.failCheckoutBeforeCreate = true;
    await expect(checkout(id, operation)).rejects.toThrow();
    expect(provider.sessions.size).toBe(0);
    provider.products.get("prod_nevora")!.tax_code = "txcd_10000000";
    await expect(checkout(id, operation)).rejects.toThrow("stripe_tax_price_mismatch");
    expect(provider.sessions.size).toBe(0);
    expect(provider.requests.filter((r) => r.path === "/v1/checkout/sessions" && r.method === "POST")).toHaveLength(1);
  });
  it("recovers an already-created Tax checkout after a lost response without another creation POST", async () => {
    enableTax();
    provider.loseCheckoutResponse = true;
    const operation = randomUUID();
    await expect(checkout(id, operation)).rejects.toThrow();
    provider.products.get("prod_nevora")!.tax_code = "txcd_10000000";
    await expect(billing.checkout(await store.business(id), operation)).resolves.toContain("checkout.stripe.com");
    expect(provider.sessions.size).toBe(1);
    expect(provider.requests.filter((r) => r.path === "/v1/checkout/sessions" && r.method === "POST")).toHaveLength(1);
  });
  it("does not validate a different configured price in place of the original saved Tax price", async () => {
    enableTax();
    const operation = randomUUID();
    provider.failCheckoutBeforeCreate = true;
    await expect(checkout(id, operation)).rejects.toThrow();
    provider.products.set("prod_alternate", { id: "prod_alternate", object: "product", tax_code: "txcd_10103000" });
    provider.prices.set("price_alternate", { ...provider.prices.get("price_small")!, id: "price_alternate", product: "prod_alternate" });
    billing.options.prices.small = "price_alternate";
    provider.products.get("prod_nevora")!.tax_code = "txcd_10000000";
    await expect(checkout(id, operation)).rejects.toThrow("invalid_billing_price");
    expect(provider.sessions.size).toBe(0);
  });
  it("restores the same owner after a hosted redirect without treating return as payment", async () => {
    await checkout();
    const request = provider.requests.find(
      (r) => r.path === "/v1/checkout/sessions" && r.method === "POST",
    )!;
    const proof = new URLSearchParams(
      new URL(request.form.get("success_url")!).hash.slice(1),
    ).get("handoff");
    expect(proof).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await store.exchange(proof!, "r".repeat(43), now, true);
    expect(await store.session("r".repeat(43), now)).toBe(id);
    expect((await store.business(id)).paidThrough).toBeNull();
    await expect(
      store.exchange(proof!, "q".repeat(43), now, true),
    ).rejects.toThrow("invalid_or_expired_link");
  });
  it("preserves the original trial deadline when completing an early setup checkout", async () => {
    await subscribed();
    expect(
      provider.requests
        .find((r) => r.path === "/v1/subscriptions" && r.method === "POST")!
        .form.get("trial_end"),
    ).toBe("1796644800");
  });
  it("deduplicates signed events and rejects signatures or live-mode mismatch", async () => {
    const event = JSON.stringify({
        id: "evt_fixture",
        object: "event",
        type: "invoice.paid",
        livemode: false,
        data: {
          object: {
            id: 'in_fixture', object: 'invoice',
            parent: { subscription_details: { subscription: "sub_fixture_1" } },
          },
        },
      }),
      signature = Stripe.webhooks.generateTestHeaderString({
        payload: event,
        secret,
      });
    await Promise.all([
      billing.webhook(event, signature),
      billing.webhook(event, signature),
    ]);
    expect(
      (await pool.query("SELECT count(*)::int n FROM commerce.webhooks"))
        .rows[0].n,
    ).toBe(1);
    await expect(billing.webhook(event, "invalid")).rejects.toThrow(
      "invalid_signature",
    );
    const live = event.replace('"livemode":false', '"livemode":true');
    await expect(
      billing.webhook(
        live,
        Stripe.webhooks.generateTestHeaderString({ payload: live, secret }),
      ),
    ).rejects.toThrow("mode_mismatch");
  });
  function signedEvent(extra:Record<string,unknown>={}) {
    const raw=JSON.stringify({id:'evt_step3',object:'event',type:'invoice.paid',livemode:false,
      data:{object:{id:'in_step3',object:'invoice',parent:{subscription_details:{subscription:'sub_fixture_1'}}}},...extra});
    return {raw,signature:Stripe.webhooks.generateTestHeaderString({payload:raw,secret})};
  }
  it('rejects a signed event from a foreign account before durable admission or provider I/O',async()=>{
    Object.assign(billing.options,{expectedAccountId:'acct_fictional'});
    const {raw,signature}=signedEvent({account:'acct_foreign'});
    await expect(billing.webhook(raw,signature)).rejects.toThrow('stripe_account_mismatch');
    expect((await pool.query('SELECT count(*)::int n FROM commerce.webhooks')).rows[0].n).toBe(0);
    expect((await pool.query('SELECT count(*)::int n FROM commerce.jobs')).rows[0].n).toBe(0);
    expect(provider.requests).toHaveLength(0);
  });
  it('rejects modified raw bodies and stale signatures without any durable work',async()=>{
    const {raw,signature}=signedEvent();
    await expect(billing.webhook(raw+' ',signature)).rejects.toThrow('invalid_signature');
    const stale=Stripe.webhooks.generateTestHeaderString({payload:raw,secret,timestamp:Math.floor(Date.now()/1000)-600});
    await expect(billing.webhook(raw,stale)).rejects.toThrow('invalid_signature');
    expect((await pool.query('SELECT count(*)::int n FROM commerce.webhooks')).rows[0].n).toBe(0);
  });
  it('does not acknowledge a failed durable admission and recovers one job after a lost acknowledgment',async()=>{
    const {raw,signature}=signedEvent();
    const app=createCommerce({store,origin:'https://accounts.example.test',allowedOrigins:[],billing});
    const send=()=>app(new Request('https://accounts.example.test/webhooks/stripe',{method:'POST',headers:{'stripe-signature':signature},body:raw}),'127.0.0.1');
    await pool.query("CREATE FUNCTION public.reject_step3_job() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic job admission failure'; END $$");
    await pool.query('CREATE TRIGGER reject_step3_job BEFORE INSERT ON commerce.jobs FOR EACH ROW EXECUTE FUNCTION public.reject_step3_job()');
    const failed=await send();expect(failed.status).toBe(503);expect(await failed.json()).toEqual({error:{code:'temporarily_unavailable'}});
    expect((await pool.query('SELECT count(*)::int n FROM commerce.webhooks')).rows[0].n).toBe(0);
    await pool.query('DROP TRIGGER reject_step3_job ON commerce.jobs');
    await pool.query('DROP FUNCTION public.reject_step3_job()');
    // Commit succeeds; the transport loses that reply. Concurrent redelivery recovers the receipt.
    await send();
    const replies=await Promise.all([send(),send()]);expect(replies.map(r=>r.status)).toEqual([200,200]);
    expect((await pool.query('SELECT count(*)::int n FROM commerce.webhooks')).rows[0].n).toBe(1);
    expect((await pool.query("SELECT count(*)::int n FROM commerce.jobs WHERE dedupe_key='stripe:evt_step3'")).rows[0].n).toBe(1);
  });
  it('keeps two fictional companies status, handoff and subscription coverage isolated',async()=>{
    const second='22222222-2222-4222-8222-222222222222';await business(second);
    const one=await subscribed(),two=await subscribed(second);
    provider.markPaid(one.subscription.id);await billing.syncJob({subscriptionId:one.subscription.id});
    expect((await store.business(second)).paidThrough).toBeNull();
    const proof='h'.repeat(43),bearer='s'.repeat(43);
    await store.handoff(second,proof,now);await store.exchange(proof,bearer,now,true);
    const app=createCommerce({store,origin:'https://accounts.example.test',allowedOrigins:[],now:()=>now,headcount:async()=>10});
    const status=await app(new Request('https://accounts.example.test/v1/status?businessId='+id,{headers:{authorization:'Bearer '+bearer}}),'127.0.0.1');
    expect(await status.json()).toMatchObject({businessId:second,paidThrough:null});
    const before=await store.business(id);two.subscription.customer=one.subscription.customer;
    await expect(billing.syncJob({subscriptionId:two.subscription.id})).rejects.toThrow('subscription_identity_mismatch');
    expect((await store.business(id)).paidThrough).toBe(before.paidThrough);
  });
  it('rejects expired and wrong-purpose handoffs without consuming a valid link',async()=>{
    const proof='h'.repeat(43);await store.handoff(id,proof,now);
    await expect(store.exchange(proof,'x'.repeat(43),now,false)).rejects.toThrow('invalid_or_expired_link');
    await store.exchange(proof,'y'.repeat(43),now,true);
    await expect(store.exchange(proof,'z'.repeat(43),now,true)).rejects.toThrow('invalid_or_expired_link');
    await store.handoff(id,'e'.repeat(43),now);
    await expect(store.exchange('e'.repeat(43),'v'.repeat(43),now+120000,true)).rejects.toThrow('invalid_or_expired_link');
  });
  it("grants access only from a paid invoice and retains paid-through coverage after cancellation", async () => {
    const { subscription } = await subscribed();
    await pool.query(
      "UPDATE commerce.businesses SET trial_ends_at=$2 WHERE id=$1",
      [id, new Date(now - 1)],
    );
    await billing.syncJob({ subscriptionId: subscription.id });
    expect(accessAt(await store.business(id), now).state).toBe("restricted");
    provider.markPaid(subscription.id);
    await billing.syncJob({ subscriptionId: subscription.id });
    expect((await store.business(id)).paidThrough).toBe(
      Date.parse("2027-01-06T12:00:00Z"),
    );
    subscription.status = "canceled";
    await billing.syncJob({ subscriptionId: subscription.id });
    expect(accessAt(await store.business(id), now).state).toBe("paid");
  });
  it("uses current provider state instead of a delayed failure event", async () => {
    const { subscription } = await subscribed();
    subscription.status = "active";
    await billing.syncJob({ subscriptionId: subscription.id });
    expect((await store.business(id)).subscriptionStatus).toBe("active");
  });
  it("does not restart failed-renewal grace on repeated events", async () => {
    const { subscription } = await subscribed();
    await pool.query(
      "UPDATE commerce.businesses SET paid_through=$2,trial_ends_at=$2,past_due_since=NULL WHERE id=$1",
      [id, new Date(now - 1)],
    );
    subscription.status = "past_due";
    await billing.syncJob({ subscriptionId: subscription.id });
    const first = (await store.business(id)).pastDueSince;
    await billing.syncJob({ subscriptionId: subscription.id });
    expect((await store.business(id)).pastDueSince).toBe(first);
    expect(accessAt(await store.business(id), now + 6 * 86400000).state).toBe(
      "grace",
    );
    expect(accessAt(await store.business(id), now + 7 * 86400000).state).toBe(
      "restricted",
    );
  });
  it("rejects a subscription belonging to a different customer", async () => {
    const { subscription } = await subscribed();
    const customer = subscription.customer;
    subscription.customer = "cus_other";
    await expect(
      billing.syncJob({ subscriptionId: subscription.id }),
    ).rejects.toThrow("subscription_identity_mismatch");
    expect((await store.business(id)).customerId).toBe(customer);
  });
  it("recovers a lost checkout response using stable provider parameters and one remote checkout", async () => {
    const operation = randomUUID();
    provider.loseCheckoutResponse = true;
    await expect(checkout(id, operation)).rejects.toThrow();
    const realNow = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(realNow + 2000);
    expect(await billing.checkout(await store.business(id), operation)).toBe(
      "https://checkout.stripe.com/c/pay/cs_fixture_1",
    );
    expect(provider.sessions.size).toBe(1);
  });
  it("recovers provider-created checkout from the reconciliation sweep after an ambiguous response", async () => {
    const operation = randomUUID();
    provider.loseCheckoutResponse = true;
    await expect(checkout(id, operation)).rejects.toThrow();
    expect(await billing.reconcile()).toEqual({ checked: 1, failed: 0 });
    expect(await billing.checkout(await store.business(id), operation)).toBe(
      "https://checkout.stripe.com/c/pay/cs_fixture_1",
    );
    expect(provider.sessions.size).toBe(1);
  });
  it("allows a verified successor after cancellation and ignores delayed predecessor events", async () => {
    const { subscription: old } = await subscribed();
    old.status = "canceled";
    await billing.syncJob({ subscriptionId: old.id });
    await pool.query(
      "UPDATE commerce.businesses SET trial_ends_at=$2,paid_through=$2 WHERE id=$1",
      [id, new Date(now - 1)],
    );
    const next = await checkout();
    provider.complete(next.id);
    await billing.syncJob({ sessionId: next.id });
    const current = await store.business(id);
    expect(current.subscriptionId).not.toBe(old.id);
    await billing.syncJob({ subscriptionId: old.id });
    expect((await store.business(id)).subscriptionId).toBe(
      current.subscriptionId,
    );
  });
  it("continues reconciling healthy businesses after an earlier business fails", async () => {
    const first = await subscribed(),
      secondId = "22222222-2222-4222-8222-222222222222";
    await business(secondId);
    const second = await subscribed(secondId);
    provider.markPaid(second.subscription.id);
    provider.unavailableSubscriptions.add(first.subscription.id);
    await billing.reconcile();
    expect((await store.business(secondId)).paidThrough).toBe(
      Date.parse("2027-01-06T12:00:00Z"),
    );
  });
  it("durably advances bounded ticks past a failing first business", async () => {
    const first=await subscribed(),secondId='22222222-2222-4222-8222-222222222222';await business(secondId);const second=await subscribed(secondId);provider.markPaid(second.subscription.id);provider.unavailableSubscriptions.add(first.subscription.id);
    expect(await billing.reconcile({limit:1})).toEqual({checked:1,failed:1});
    // A fresh object has no in-memory cursor. Its next tick must reach the later business.
    const resumed=new StripeBilling(store,billing.stripe,billing.options);
    expect(await resumed.reconcile({limit:1})).toEqual({checked:1,failed:0});expect((await store.business(secondId)).paidThrough).toBe(Date.parse('2027-01-06T12:00:00Z'));
  });
  it("reconciles with the real API grants while audit remains write-only and failed businesses do not starve later ticks",async()=>{
    const suffix=randomUUID().replaceAll('-','').slice(0,24),api='nv_commerce_api_'+suffix,enrollment='nv_commerce_enroll_'+suffix;
    await pool.query(`CREATE ROLE ${api} NOLOGIN; CREATE ROLE ${enrollment} NOLOGIN`);
    for(const statement of commercePrincipalGrants(api,enrollment))await pool.query(statement);
    const url=new URL(process.env.NEVORA_COMMERCE_TEST_URL!);url.pathname='/'+name;
    const restricted=new Pool({connectionString:url.href,options:`-c role=${api}`,max:1});
    try{
      expect((await restricted.query("SELECT has_table_privilege(current_user,'commerce.audit','SELECT') AS allowed")).rows[0].allowed).toBe(false);
      const scoped=new StripeBilling(new CommerceStore(restricted,store.key),provider.client,billing.options);
      expect(await scoped.reconcile({limit:1})).toEqual({checked:0,failed:0});
      const first=await subscribed(),secondId='22222222-2222-4222-8222-222222222222';await business(secondId);const second=await subscribed(secondId);provider.markPaid(second.subscription.id);provider.unavailableSubscriptions.add(first.subscription.id);
      expect(await scoped.reconcile({limit:1})).toEqual({checked:1,failed:1});
      const resumed=new StripeBilling(new CommerceStore(restricted,store.key),provider.client,billing.options);
      expect(await resumed.reconcile({limit:1})).toEqual({checked:1,failed:0});
      expect((await store.business(secondId)).paidThrough).toBe(Date.parse('2027-01-06T12:00:00Z'));
      expect(await resumed.reconcile({limit:1})).toEqual({checked:1,failed:1});
      await expect(restricted.query('SELECT id FROM commerce.audit LIMIT 1')).rejects.toThrow('permission denied');
    }finally{await restricted.end();await pool.query(`DROP OWNED BY ${api},${enrollment}; DROP ROLE ${api},${enrollment}`);}
  });
  it.each(['reconcile-cursor:11111111-1111-4111-8111-111111111111','reconcile-cursor:'])('restarts an expired retained cursor from the first eligible business: %s',async oldKey=>{
    const first=await subscribed(),secondId='22222222-2222-4222-8222-222222222222';await business(secondId);await subscribed(secondId);provider.unavailableSubscriptions.add(first.subscription.id);
    await pool.query("INSERT INTO commerce.rate_limits(key,count,expires_at) VALUES($1,1,clock_timestamp()-interval '1 second')",[oldKey]);
    expect(await billing.reconcile({limit:1})).toEqual({checked:1,failed:1});
    expect((await pool.query("SELECT key,expires_at>clock_timestamp() AS active FROM commerce.rate_limits WHERE key LIKE 'reconcile-cursor:%'")).rows).toEqual([{key:'reconcile-cursor:'+id,active:true}]);
  });
  it('rejects a malformed durable reconciliation position',async()=>{await pool.query("INSERT INTO commerce.rate_limits(key,count,expires_at) VALUES('reconcile-cursor:',1,clock_timestamp()+interval '1 day')");await expect(billing.reconcile({limit:1})).rejects.toThrow('invalid_reconcile_position');});
  it("restricts operational access when a downgrade is below actual active headcount", async () => {
    provider.counts.set(id, 30);
    const { subscription } = await subscribed();
    provider.markPaid(subscription.id);
    await billing.syncJob({ subscriptionId: subscription.id });
    expect((await store.business(id)).planKey).toBe("team");
    subscription.items.data[0].price = provider.prices.get("price_small")!;
    await billing.syncJob({ subscriptionId: subscription.id });
    expect((await store.business(id)).planKey).toBe("team");
    provider.markPaid(subscription.id);
    await billing.syncJob({ subscriptionId: subscription.id });
    expect((await store.business(id)).planKey).toBe("small");
    await pool.query(
      "INSERT INTO commerce.tokens(hash,account_id,purpose,expires_at) VALUES($1,$2,'session',$3)",
      [digest("k".repeat(43)), id, new Date(now + 86400000)],
    );
    const app = createCommerce({
      store,
      origin: "https://accounts.example.test",
      allowedOrigins: ["https://accounts.example.test"],
      now: () => now,
      headcount: async (b) => provider.counts.get(b.id) ?? 10,
    });
    const response = await app(
      new Request("https://accounts.example.test/v1/status", {
        headers: { authorization: `Bearer ${"k".repeat(43)}` },
      }),
      "127.0.0.1",
    );
    const status = await response.json();
    expect(status.operational).toBe(false);
    expect(status.reason).toBe("employee_limit_exceeded");
    expect(status.export).toBe(true);
  });
  function enablePlanChanges(){Object.assign(billing.options,{portalConfigurations:{small:'bpc_small',team:'bpc_team'}});}
  it('creates a target-only upgrade confirmation and reuses its exact provider operation',async()=>{
    enablePlanChanges();const {subscription}=await subscribed(),before=await store.business(id),operation=randomUUID();
    const first=await billing.planChange(before,operation,'team',null,'es');
    expect(first).toEqual({url:'https://billing.stripe.com/p/session_fixture',plan:'team',effective:'after_payment'});
    expect(await billing.planChange(before,operation,'team',null,'es')).toEqual(first);
    const requests=provider.requests.filter(r=>r.method==='POST'&&r.path==='/v1/billing_portal/sessions');
    expect(requests).toHaveLength(2);expect(requests[1].form.toString()).toBe(requests[0].form.toString());
    const form=requests[0].form;
    expect(form.get('configuration')).toBe('bpc_team');expect(form.get('locale')).toBe('es');
    expect(form.get('flow_data[type]')).toBe('subscription_update_confirm');
    expect(form.get('flow_data[subscription_update_confirm][subscription]')).toBe(subscription.id);
    expect(form.get('flow_data[subscription_update_confirm][items][0][id]')).toBe(subscription.items.data[0].id);
    expect(form.get('flow_data[subscription_update_confirm][items][0][price]')).toBe('price_team');
    expect(form.get('flow_data[subscription_update_confirm][items][0][quantity]')).toBe('1');
    const returned=new URL(form.get('return_url')!);expect(returned.origin).toBe('https://accounts.example.test');expect(returned.pathname).toBe('/pages/es-facturacion');expect(returned.hash).toMatch(/^#handoff=[A-Za-z0-9_-]{43}$/);
    expect(form.get('flow_data[after_completion][redirect][return_url]')).toBe(returned.href);
    const after=await store.business(id);expect(after.planKey).toBe(before.planKey);expect(after.paidThrough).toBe(before.paidThrough);expect(after.trialEnd).toBe(before.trialEnd);
  });
  it.each([0,15])('offers the Small renewal flow only when current headcount fits and preserves paid Team coverage: %s',async count=>{
    enablePlanChanges();provider.counts.set(id,16);const {subscription}=await subscribed();provider.markPaid(subscription.id);await billing.syncJob({subscriptionId:subscription.id});
    await expect(billing.planChange(await store.business(id),randomUUID(),'small')).rejects.toMatchObject({code:'plan_employee_limit',status:409});
    provider.counts.set(id,count);expect(await billing.planChange(await store.business(id),randomUUID(),'small')).toMatchObject({plan:'small',effective:'period_end'});
    expect(provider.requests.find(r=>r.path==='/v1/billing_portal/sessions')!.form.get('configuration')).toBe('bpc_small');
    expect((await store.business(id)).planKey).toBe('team');
  });
  it.each([-400,0])('keeps unpaid upgrades and non-positive credit lines from granting paid Team capacity: %s',async lineAmount=>{
    const {subscription}=await subscribed();provider.markPaid(subscription.id);await billing.syncJob({subscriptionId:subscription.id});
    const before=await store.business(id);expect(before.planKey).toBe('small');
    subscription.items.data[0].price=provider.prices.get('price_team')!;
    await billing.syncJob({subscriptionId:subscription.id});expect((await store.business(id)).planKey).toBe('small');
    provider.payments.get(subscription.id)!.push({end:1799236800,price:'price_team',amount:1000,lineAmount});
    await billing.syncJob({subscriptionId:subscription.id});expect((await store.business(id)).planKey).toBe('small');
    provider.payments.get(subscription.id)!.push({end:1799236800,price:'price_team',amount:500,lineAmount:500});
    await billing.syncJob({subscriptionId:subscription.id});const paid=await store.business(id);expect(paid.planKey).toBe('team');expect(paid.trialEnd).toBe(before.trialEnd);
  });
  it('retains Small trial capacity before the first paid Team invoice without changing the trial deadline',async()=>{
    const {subscription}=await subscribed(),before=await store.business(id);
    expect(before.planKey).toBe('small');expect(before.paidThrough).toBeNull();
    const policy=vi.fn(async()=>{});Object.assign(billing.options,{policy});
    subscription.items.data[0].price=provider.prices.get('price_team')!;
    await billing.syncJob({subscriptionId:subscription.id});
    expect((await store.business(id)).planKey).toBe('small');expect(policy).toHaveBeenLastCalledWith(expect.anything(),15);
    expect((await store.business(id)).trialEnd).toBe(before.trialEnd);
    provider.markPaid(subscription.id);await billing.syncJob({subscriptionId:subscription.id});
    expect((await store.business(id)).planKey).toBe('team');expect(policy).toHaveBeenLastCalledWith(expect.anything(),30);
    expect((await store.business(id)).trialEnd).toBe(before.trialEnd);
  });
  it('keeps legitimate initial Team trial assignment when there is no earlier plan',async()=>{
    provider.counts.set(id,16);const {subscription}=await subscribed();
    const initial=await store.business(id);expect(initial.planKey).toBe('team');expect(initial.paidThrough).toBeNull();expect(subscription.status).toBe('trialing');expect(provider.payments.get(subscription.id)).toBeUndefined();
  });
  it('rejects changed confirmation parameters on the same operation rather than silently selecting a different language',async()=>{
    enablePlanChanges();await subscribed();const b=await store.business(id),operation=randomUUID();
    await billing.planChange(b,operation,'team',null,'en');
    await expect(billing.planChange(b,operation,'team',null,'es')).rejects.toMatchObject({code:'idempotency_conflict',status:409});
  });
  it('keeps plan-change disabled until configured and rejects a second selection of the current plan',async()=>{
    await subscribed();await expect(billing.planChange(await store.business(id),randomUUID(),'team')).rejects.toMatchObject({code:'plan_changes_unavailable',status:503});
    enablePlanChanges();await expect(billing.planChange(await store.business(id),randomUUID(),'small')).rejects.toMatchObject({code:'plan_already_selected',status:409});
    expect(provider.requests.filter(r=>r.path==='/v1/billing_portal/sessions')).toHaveLength(0);
  });
  it.each(['pending','scheduled','canceling','past_due','open_invoice','wrong_customer','live_mode','wrong_price','wrong_merchant'] as const)('refuses an unsafe plan-change source: %s',async reason=>{
    enablePlanChanges();const {subscription}=await subscribed();
    if(reason==='pending')subscription.pending_update={expires_at:1899236800};
    if(reason==='scheduled')subscription.schedule='sub_sched_existing';
    if(reason==='canceling')subscription.cancel_at_period_end=true;
    if(reason==='past_due')subscription.status='past_due';
    if(reason==='open_invoice')provider.openInvoices.add(subscription.id);
    if(reason==='wrong_customer')subscription.customer='cus_foreign';
    if(reason==='live_mode')subscription.livemode=true;
    if(reason==='wrong_price')subscription.items.data[0].price={...subscription.items.data[0].price,unit_amount:1};
    if(reason==='wrong_merchant')Object.assign(billing.options,{expectedAccountId:'acct_foreign'});
    await expect(billing.planChange(await store.business(id),randomUUID(),'team')).rejects.toThrow();
    expect(provider.requests.filter(r=>r.path==='/v1/billing_portal/sessions')).toHaveLength(0);
  });
  it.each(['immediate_downgrade','end_trial','free_upgrade','quantity','wrong_target','live_config','inactive'] as const)('rejects a Portal configuration that violates the approved policy: %s',async reason=>{
    enablePlanChanges();await subscribed();const config=provider.portalConfigurations.get('bpc_team')!,update=config.features.subscription_update;
    if(reason==='immediate_downgrade')update.schedule_at_period_end.conditions=[];
    if(reason==='end_trial')update.trial_update_behavior='end_trial';
    if(reason==='free_upgrade')update.proration_behavior='none';
    if(reason==='quantity')update.default_allowed_updates.push('quantity');
    if(reason==='wrong_target')update.products[0].prices=['price_small'];
    if(reason==='live_config')config.livemode=true;
    if(reason==='inactive')config.active=false;
    await expect(billing.planChange(await store.business(id),randomUUID(),'team')).rejects.toMatchObject({code:'plan_change_policy_unavailable',status:503});
    expect(provider.requests.filter(r=>r.path==='/v1/billing_portal/sessions')).toHaveLength(0);
  });
});
