import Stripe from "stripe";
type Metadata = Record<string, string>;
type Price = {
  id: string;
  livemode: boolean;
  active: boolean;
  unit_amount: number;
  currency: string;
  type: string;
  product: string;
  recurring: { interval: string; interval_count: number };
};
export type FixtureSubscription = {
  id: string;
  object: string;
  customer: string;
  status: string;
  metadata: Metadata;
  items: {
    data: {
      quantity: number;
      price: Price;
      current_period_start: number;
      current_period_end: number;
    }[];
  };
  latest_invoice: { id: string; created: number };
};
type Session = {
  id: string;
  object: string;
  customer: string;
  mode: string;
  status: string;
  url: string;
  expires_at: number;
  metadata: Metadata;
  setup_intent: {
    id: string;
    status: string;
    payment_method: string;
    customer: string;
  };
  subscription: string | null;
};
export class StripeFixture {
  readonly prices = new Map<string, Price>([
    [
      "price_small",
      {
        id: "price_small",
        livemode: false,
        active: true,
        unit_amount: 1900,
        currency: "usd",
        type: "recurring",
        product: "prod_nevora",
        recurring: { interval: "month", interval_count: 1 },
      },
    ],
    [
      "price_team",
      {
        id: "price_team",
        livemode: false,
        active: true,
        unit_amount: 2900,
        currency: "usd",
        type: "recurring",
        product: "prod_nevora",
        recurring: { interval: "month", interval_count: 1 },
      },
    ],
  ]);
  readonly customers = new Map<
    string,
    { id: string; object: string; email: string; metadata: Metadata }
  >();
  readonly subscriptions = new Map<string, FixtureSubscription>();
  readonly sessions = new Map<string, Session>();
  readonly payments = new Map<
    string,
    { end: number; price: string; amount: number }[]
  >();
  readonly counts = new Map<string, number>();
  readonly unavailableSubscriptions = new Set<string>();
  readonly requests: { method: string; path: string; form: URLSearchParams }[] =
    [];
  readonly cache = new Map<string, { body: string; value: unknown }>();
  loseCheckoutResponse = false;
  accountId = "acct_fictional";
  unavailableAccount = false;
  readonly client: Stripe;
  constructor() {
    this.client = new Stripe("sk_test_fictional", {
      httpClient: Stripe.createFetchHttpClient((input, init) =>
        this.fetch(input, init),
      ),
      maxNetworkRetries: 0,
    });
  }
  private metadata(form: URLSearchParams, prefix = "metadata"): Metadata {
    return Object.fromEntries(
      [...form]
        .filter(([key]) => key.startsWith(`${prefix}[`))
        .map(([key, value]) => [key.slice(prefix.length + 1, -1), value]),
    );
  }
  private response(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), {
      status,
      headers: {
        "content-type": "application/json",
        "request-id": "req_fixture",
      },
    });
  }
  private list(data: unknown[]) {
    return { object: "list", data, has_more: false, url: "/v1/fixture" };
  }
  createSubscription(
    customer: string,
    priceId: string,
    metadata: Metadata,
    trialEnd?: number,
  ) {
    const id = `sub_fixture_${this.subscriptions.size + 1}`,
      price = this.prices.get(priceId);
    if (!price) throw Error("unknown_fixture_price");
    const subscription: FixtureSubscription = {
      id,
      object: "subscription",
      customer,
      status: trialEnd ? "trialing" : "active",
      metadata,
      items: {
        data: [
          {
            quantity: 1,
            price,
            current_period_start: 1794052800,
            current_period_end: 1799236800,
          },
        ],
      },
      latest_invoice: { id: "in_fixture", created: 1794052800 },
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }
  complete(id: string) {
    const session = this.sessions.get(id);
    if (!session) throw Error("missing_fixture_checkout");
    session.status = "complete";
    if (session.mode === "subscription" && !session.subscription)
      session.subscription = this.createSubscription(
        session.customer,
        session.metadata.nevora_price,
        {
          nevora_business_id: session.metadata.nevora_business_id,
          nevora_checkout_operation: session.metadata.nevora_checkout_operation,
        },
      ).id;
    return session;
  }
  markPaid(id: string, end = 1799236800) {
    const sub = this.subscriptions.get(id);
    if (!sub) throw Error("missing_fixture_subscription");
    sub.status = "active";
    const price = sub.items.data[0].price;
    this.payments.set(id, [
      ...(this.payments.get(id) ?? []),
      { end, price: price.id, amount: price.unit_amount },
    ]);
  }
  private async fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      ),
      method = init?.method ?? "GET",
      body = String(init?.body ?? ""),
      form = new URLSearchParams(body),
      key = new Headers(init?.headers).get("idempotency-key");
    this.requests.push({ method, path: url.pathname, form });
    if (method === "POST" && key && this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      return cached.body === body
        ? this.response(cached.value)
        : this.response(
            {
              error: {
                type: "idempotency_error",
                message: "Parameters changed for the same operation",
              },
            },
            400,
          );
    }
    let value: unknown;
    if (url.pathname === "/v1/account") {
      if (this.unavailableAccount)
        return this.response({error:{type:"api_error",message:"Fixture account unavailable"}},503);
      value = { id: this.accountId, object: "account" };
    } else if (url.pathname === "/v1/customers" && method === "GET")
      value = this.list(
        [...this.customers.values()].filter(
          (c) => c.email === url.searchParams.get("email"),
        ),
      );
    else if (url.pathname === "/v1/customers" && method === "POST") {
      const customer = {
        id: `cus_fixture_${this.customers.size + 1}`,
        object: "customer",
        email: form.get("email")!,
        metadata: this.metadata(form),
      };
      this.customers.set(customer.id, customer);
      value = customer;
    } else if (url.pathname.startsWith("/v1/customers/"))
      value = this.customers.get(url.pathname.split("/").at(-1)!);
    else if (url.pathname.startsWith("/v1/prices/"))
      value = this.prices.get(url.pathname.split("/").at(-1)!);
    else if (url.pathname === "/v1/subscriptions" && method === "GET")
      value = this.list(
        [...this.subscriptions.values()].filter(
          (s) => s.customer === url.searchParams.get("customer"),
        ),
      );
    else if (url.pathname === "/v1/subscriptions" && method === "POST")
      value = this.createSubscription(
        form.get("customer")!,
        form.get("items[0][price]")!,
        this.metadata(form),
        Number(form.get("trial_end")) || undefined,
      );
    else if (url.pathname.startsWith("/v1/subscriptions/")) {
      const id = url.pathname.split("/").at(-1)!;
      if (this.unavailableSubscriptions.has(id))
        return this.response(
          {
            error: {
              type: "api_error",
              message: "Fixture subscription temporarily unavailable",
            },
          },
          503,
        );
      value = this.subscriptions.get(id);
    } else if (url.pathname === "/v1/checkout/sessions" && method === "GET")
      value = this.list(
        [...this.sessions.values()].filter(
          (s) => s.customer === url.searchParams.get("customer"),
        ),
      );
    else if (url.pathname === "/v1/checkout/sessions" && method === "POST") {
      const id = `cs_fixture_${this.sessions.size + 1}`,
        customer = form.get("customer")!;
      const session: Session = {
        id,
        object: "checkout.session",
        customer,
        mode: form.get("mode")!,
        status: "open",
        url: `https://checkout.stripe.com/c/pay/${id}`,
        expires_at:
          Number(form.get("expires_at")) ||
          Math.floor(Date.now() / 1000) + 86400,
        metadata: this.metadata(form),
        setup_intent: {
          id: `seti_${id}`,
          status: "succeeded",
          payment_method: "pm_fixture",
          customer,
        },
        subscription: null,
      };
      this.sessions.set(id, session);
      value = session;
    } else if (url.pathname.startsWith("/v1/checkout/sessions/"))
      value = this.sessions.get(url.pathname.split("/").at(-1)!);
    else if (url.pathname === "/v1/invoices") {
      const id = url.searchParams.get("subscription")!;
      value = this.list(
        [...(this.payments.get(id) ?? [])]
          .reverse()
          .map((payment, index) => ({
            id: `in_paid_${index}`,
            object: "invoice",
            status: "paid",
            amount_paid: payment.amount,
            currency: "usd",
            lines: {
              data: [
                {
                  period: { start: 1794052800, end: payment.end },
                  pricing: { price_details: { price: payment.price } },
                },
              ],
            },
          })),
      );
    } else if (url.pathname === "/v1/billing_portal/sessions")
      value = {
        id: "bps_fixture",
        object: "billing_portal.session",
        url: "https://billing.stripe.com/p/session_fixture",
      };
    else
      throw Error(`Unimplemented fixture endpoint: ${method} ${url.pathname}`);
    if (value === undefined)
      return this.response(
        {
          error: {
            type: "invalid_request_error",
            message: "Fixture object not found",
          },
        },
        404,
      );
    if (method === "POST" && key) this.cache.set(key, { body, value });
    if (
      method === "POST" &&
      url.pathname === "/v1/checkout/sessions" &&
      this.loseCheckoutResponse
    ) {
      this.loseCheckoutResponse = false;
      throw Error("Simulated lost successful checkout response");
    }
    return this.response(value);
  }
}
