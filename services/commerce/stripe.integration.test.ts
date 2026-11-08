import { dropTestDatabase } from "./test-database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { CommerceStore } from "./store";
import { StripeBilling } from "./stripe";
import { accessAt } from "./model";
const enabled = Boolean(process.env.NEVORA_COMMERCE_TEST_URL);
describe.skipIf(!enabled)("Stripe lifecycle with real catalog and SDK", () => {
  let admin: Pool, pool: Pool, store: CommerceStore, billing: StripeBilling;
  const id = randomUUID(),
    name = `commerce_test_${randomUUID().replaceAll("-", "")}`,
    now = Date.parse("2026-11-07T12:00:00Z");
  const state = {
    status: "active",
    customer: "cus_fixture",
    invoicePaid: false,
    invoiceEnd: 1799236800,
    mode: "",
    returnUrl: "",
    trialEnd: "",
  };
  const secret = "whsec_fictional_test_only";
  beforeAll(async () => {
    const url = new URL(process.env.NEVORA_COMMERCE_TEST_URL!);
    if (url.hostname !== "127.0.0.1" || process.env.DATABASE_URL)
      throw Error("owned cluster required");
    admin = new Pool({ connectionString: url.href });
    await admin.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`;
    pool = new Pool({
      connectionString: url.href,
      max: 2,
      statement_timeout: 1000,
    });
    await pool.query(
      await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
    );
    store = new CommerceStore(pool, Buffer.alloc(32, 3));
    await pool.query(
      "INSERT INTO commerce.accounts(id,email,profile,verified_at) VALUES($1,$2,$3,clock_timestamp())",
      [
        id,
        "owner@example.test",
        { businessName: "Example Shop", email: "owner@example.test" },
      ],
    );
    await pool.query(
      "INSERT INTO commerce.businesses(id,state,employee_count,trial_started_at,trial_ends_at) VALUES($1,'ready',10,$2,$3)",
      [id, new Date(now), new Date("2026-12-07T12:00:00Z")],
    );
    const http = Stripe.createFetchHttpClient(async (input, init) => {
      const url = new URL(
          typeof input === "string" ? input : (input as Request).url,
        ),
        form = new URLSearchParams(String(init?.body ?? ""));
      let value: unknown;
      if (url.pathname === "/v1/customers" && init?.method === "GET")
        value = { object: "list", data: [], has_more: false };
      else if (url.pathname === "/v1/customers" && init?.method === "POST")
        value = {
          id: "cus_fixture",
          object: "customer",
          metadata: { nevora_business_id: id },
        };
      else if (url.pathname === "/v1/customers/cus_fixture")
        value = {
          id: "cus_fixture",
          object: "customer",
          metadata: { nevora_business_id: id },
        };
      else if (url.pathname === "/v1/prices/price_small")
        value = {
          id: "price_small",
          active: true,
          unit_amount: 1900,
          currency: "usd",
          type: "recurring",
          recurring: { interval: "month", interval_count: 1 },
        };
      else if (url.pathname === "/v1/subscriptions" && init?.method === "GET")
        value = { object: "list", data: [], has_more: false };
      else if (
        url.pathname === "/v1/checkout/sessions" &&
        init?.method === "POST"
      ) {
        state.mode = form.get("mode") ?? "";
        state.returnUrl = form.get("success_url") ?? "";
        value = {
          id: "cs_fixture",
          object: "checkout.session",
          url: "https://checkout.stripe.com/c/pay/cs_fixture",
          expires_at: Math.floor(Date.now() / 1000) + 1800,
        };
      } else if (url.pathname === "/v1/checkout/sessions/cs_fixture")
        value = {
          id: "cs_fixture",
          object: "checkout.session",
          status: "complete",
          mode: "setup",
          customer: "cus_fixture",
          setup_intent: {
            id: "seti_fixture",
            status: "succeeded",
            payment_method: "pm_fixture",
            customer: "cus_fixture",
          },
          metadata: { nevora_business_id: id, nevora_price: "price_small" },
        };
      else if (
        url.pathname === "/v1/subscriptions" &&
        init?.method === "POST"
      ) {
        state.trialEnd = form.get("trial_end") ?? "";
        value = {
          id: "sub_fixture",
          object: "subscription",
          customer: "cus_fixture",
          metadata: { nevora_business_id: id },
        };
      } else if (url.pathname === "/v1/subscriptions/sub_fixture")
        value = {
          id: "sub_fixture",
          object: "subscription",
          customer: state.customer,
          status: state.status,
          metadata: { nevora_business_id: id },
          items: {
            data: [
              {
                quantity: 1,
                price: {
                  id: "price_small",
                  unit_amount: 1900,
                  currency: "usd",
                  recurring: { interval: "month", interval_count: 1 },
                },
                current_period_start: 1794052800,
                current_period_end: 1799236800,
              },
            ],
          },
          latest_invoice: { id: "in_current", created: 1794052800 },
        };
      else if (url.pathname === "/v1/invoices")
        value = {
          object: "list",
          data: state.invoicePaid
            ? [
                {
                  id: "in_paid",
                  object: "invoice",
                  status: "paid",
                  amount_paid: 1900,
                  currency: "usd",
                  lines: {
                    data: [
                      {
                        period: { start: 1794052800, end: state.invoiceEnd },
                        pricing: { price_details: { price: "price_small" } },
                      },
                    ],
                  },
                },
              ]
            : [],
          has_more: false,
        };
      else
        throw Error(
          `Unexpected Stripe test endpoint ${init?.method} ${url.pathname}`,
        );
      return new Response(JSON.stringify(value), {
        headers: {
          "content-type": "application/json",
          "request-id": "req_fixture",
        },
      });
    });
    const client = new Stripe("sk_test_fictional", {
      httpClient: http,
      maxNetworkRetries: 0,
    });
    billing = new StripeBilling(store, client, {
      origin: "https://accounts.example.test",
      prices: { small: "price_small", team: "price_team" },
      webhookSecret: secret,
      live: false,
      now: () => now,
      facts: async () => 10,
      policy: async () => {},
    });
  });
  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await dropTestDatabase(admin, name);
      await admin.end();
    }
  });
  it("reuses one open checkout under concurrent operation IDs without charging during the trial", async () => {
    const business = await store.business(id);
    const urls = await Promise.all([
      billing.checkout(business, randomUUID()),
      billing.checkout(business, randomUUID()),
    ]);
    expect(urls).toEqual([
      "https://checkout.stripe.com/c/pay/cs_fixture",
      "https://checkout.stripe.com/c/pay/cs_fixture",
    ]);
    expect(state.mode).toBe("setup");
    expect((await store.business(id)).paidThrough).toBeNull();
  });
  it("restores only the same owner after Stripe redirects without treating the return as payment", async () => {
    const returnUrl = new URL(state.returnUrl);
    const proof = new URLSearchParams(returnUrl.hash.slice(1)).get("handoff");
    expect(proof).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await store.exchange(proof!, "r".repeat(43), now, true);
    expect(await store.session("r".repeat(43), now)).toBe(id);
    expect((await store.business(id)).paidThrough).toBeNull();
    await expect(
      store.exchange(proof!, "q".repeat(43), now, true),
    ).rejects.toThrow("invalid_or_expired_link");
  });
  it("preserves the exact original trial deadline when completing an early setup checkout", async () => {
    await billing.syncJob({ sessionId: "cs_fixture" });
    expect(state.trialEnd).toBe("1796644800");
    expect((await store.business(id)).subscriptionId).toBe("sub_fixture");
  });
  it("deduplicates signed events and rejects signatures or live-mode mismatch", async () => {
    const event = JSON.stringify({
      id: "evt_fixture",
      object: "event",
      type: "invoice.paid",
      livemode: false,
      data: {
        object: {
          parent: { subscription_details: { subscription: "sub_fixture" } },
        },
      },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
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
  it("grants paid access only from an authoritative paid invoice and keeps it through cancellation", async () => {
    await pool.query(
      "UPDATE commerce.businesses SET trial_ends_at=$2 WHERE id=$1",
      [id, new Date(now - 1)],
    );
    state.invoicePaid = false;
    await billing.syncJob({ subscriptionId: "sub_fixture" });
    expect(accessAt(await store.business(id), now).state).toBe("restricted");
    state.invoicePaid = true;
    await billing.syncJob({ subscriptionId: "sub_fixture" });
    expect((await store.business(id)).paidThrough).toBe(
      Date.parse("2027-01-06T12:00:00Z"),
    );
    state.status = "canceled";
    await billing.syncJob({ subscriptionId: "sub_fixture" });
    expect(accessAt(await store.business(id), now).state).toBe("paid");
  });
  it("does not let an old failure event overwrite the subscription current state", async () => {
    state.status = "active";
    await billing.syncJob({ subscriptionId: "sub_fixture" });
    expect((await store.business(id)).subscriptionStatus).toBe("active");
  });
  it("does not restart failed-renewal grace on a repeated event", async () => {
    await pool.query(
      "UPDATE commerce.businesses SET paid_through=$2,past_due_since=NULL WHERE id=$1",
      [id, new Date(now - 1)],
    );
    state.status = "past_due";
    state.invoicePaid = false;
    await billing.syncJob({ subscriptionId: "sub_fixture" });
    const first = (await store.business(id)).pastDueSince;
    await billing.syncJob({ subscriptionId: "sub_fixture" });
    expect((await store.business(id)).pastDueSince).toBe(first);
    expect(accessAt(await store.business(id), now + 6 * 86400000).state).toBe(
      "grace",
    );
    expect(accessAt(await store.business(id), now + 7 * 86400000).state).toBe(
      "restricted",
    );
  });
  it("rejects subscription ownership changes without altering the business entitlement", async () => {
    state.customer = "cus_other";
    await expect(
      billing.syncJob({ subscriptionId: "sub_fixture" }),
    ).rejects.toThrow("subscription_identity_mismatch");
    expect((await store.business(id)).customerId).toBe("cus_fixture");
  });
});
