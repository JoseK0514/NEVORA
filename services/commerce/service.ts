import {parseBillingOwner,type BillingOwner} from "./owner-authority";
import {verifyInstallationOwner} from "./installation";
import { businessAccess } from "./access";
import { hashPassword } from "../../src/lib/auth/password";
import { CommerceError, parseSignup, parseEmail, planFor,type PlanKey } from "./model";
import { token } from "./security";
import { CommerceStore, type Business } from "./store";
import {commerceLanguage,type CommerceLanguage} from './language';
import type {PoolClient} from 'pg';
import {billingActorHash,type BillingOperationContext} from './billing-operations';
import {terminalSubscription} from './stripe-identity';
export interface BillingPort {
  checkout(business: Business, operation: string,owner?:BillingOwner|null,lang?:CommerceLanguage,context?:BillingOperationContext): Promise<string>;
  portal(business: Business, operation: string,owner?:BillingOwner|null,lang?:CommerceLanguage,context?:BillingOperationContext): Promise<string>;
  planChange?(business:Business,operation:string,plan:PlanKey,owner?:BillingOwner|null,lang?:CommerceLanguage,context?:BillingOperationContext):Promise<PlanChangeResult>;
  webhook(raw: string, signature: string): Promise<void>;
}
export type PlanChangeResult={url:string;plan:PlanKey;effective:'after_payment'|'period_end'};
export type CommerceOptions = {
  store: CommerceStore;
  origin: string;
  uiOrigin?: string;
  allowedOrigins: string[];
  billing?: BillingPort;
  pathPrefix?:string;
  signupEnabled?: boolean;
  provisioningMode?: "onboarding"|"slots";
  now?: () => number;
  headcount?: (business: Business) => Promise<number>;
};
async function body(request: Request, maximum = 16384) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.length;
    if (length > maximum) {
      await reader.cancel();
      throw new CommerceError("body_too_large", 413);
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export function createCommerce(options: CommerceOptions) {
  const { store } = options;
  return async (request: Request, ip: string): Promise<Response> => {
    const origin = request.headers.get("origin"),
      pathname = new URL(request.url).pathname,
      path=options.pathPrefix&&pathname.startsWith(options.pathPrefix+'/')?pathname.slice(options.pathPrefix.length):pathname;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      vary: "Origin",
    };
    const answer = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), { status, headers });
    try {
      if (origin && !options.allowedOrigins.includes(origin))
        throw new CommerceError("origin_denied", 403);
      if (origin) headers["access-control-allow-origin"] = origin;
      if (request.method === "OPTIONS") {
        headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
        headers["access-control-allow-headers"] =
          "Authorization, Content-Type, Idempotency-Key";
        return new Response(null, { status: 204, headers });
      }
      if (path === "/health" && request.method === "GET")
        return answer({ state: "alive" });
      if (path === "/ready" && request.method === "GET") {
        const schema = await store.pool.query(
          "SELECT CASE WHEN to_regclass('commerce.accounts') IS NOT NULL AND to_regclass('commerce.external_installations') IS NOT NULL AND to_regclass('commerce.billing_operations') IS NOT NULL AND to_regclass('commerce.billing_operation_stages') IS NOT NULL AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='commerce' AND table_name='checkout_intents' AND column_name='reconciled_expired_at') AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='commerce' AND table_name='tokens' AND column_name='owner_binding') AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='commerce' AND table_name='external_installations' AND column_name='worker_secret_hash') THEN true ELSE false END installed",
        );
        if (!schema.rows[0].installed)
          throw new CommerceError("catalog_not_ready", 503);
        return answer({ state: "ready" });
      }
      if (path === "/v1/plans" && request.method === "GET")
        return answer({
          currency: "usd",
          trialDays: 30,
          plans: [planFor(1), planFor(16)],
        });
      if(options.provisioningMode==='onboarding'&&['/v1/signup','/v1/setup','/v1/login-link','/v1/verify'].includes(path))throw new CommerceError('use_onboarding',409);
      const now = options.now?.() ?? Date.now();
      const bearer =
        request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
      if (path === "/webhooks/stripe" && request.method === "POST") {
        if (!options.billing)
          throw new CommerceError("billing_unavailable", 503);
        await options.billing.webhook(
          await body(request, 262144),
          request.headers.get("stripe-signature") ?? "",
        );
        return answer({ received: true });
      }
      if (path.startsWith("/internal/")) {
        const business = await store.installation(
          request.headers.get("x-nevora-installation") ?? "",
          bearer,
          path==='/internal/access'&&request.method==='GET',
        );
        if (path === "/internal/access" && request.method === "GET")
          return answer({
            businessId: business.id,
            installationId: business.slotId,
            ...(await businessAccess(store, business, now, options.headcount)),
            validUntil: Math.min(
              now + 60000,
              ...[
                business.trialEnd,
                business.paidThrough,
                business.pastDueSince
                  ? business.pastDueSince + 7 * 86400000
                  : null,
              ].filter((v): v is number => v !== null && v > now),
            ),
          });
        if (path === "/internal/handoff" && request.method === "POST") {
          await businessAccess(store,business,now,options.headcount);
          const proof = token();
          let owner:BillingOwner|null=null;
          if(business.enrollmentSource==='onboarding'){
            try{owner=parseBillingOwner(JSON.parse(await body(request,2048)).owner);}catch{throw new CommerceError('owner_required',403);}
            if(!owner||!await verifyInstallationOwner(store,business,owner))throw new CommerceError('owner_required',403);
          }
          await store.handoff(business.id, proof, now,undefined,120000,owner);
          return answer({
            handoff: proof,
            businessId: business.id,
            url: `${options.uiOrigin ?? options.origin}/pages/plans#handoff=${proof}`,
            expiresIn: 120,
          });
        }
        throw new CommerceError("not_found", 404);
      }
      if (request.method === "POST" && !origin)
        throw new CommerceError("origin_required", 403);
      if (
        request.method === "POST" &&
        request.headers.get("content-type")?.split(";")[0] !==
          "application/json"
      )
        throw new CommerceError("json_required", 415);
      let input: Record<string, unknown> = {};
      if (request.method === "POST") {
        try {
          input = JSON.parse(await body(request));
        } catch (error) {
          if (error instanceof CommerceError) throw error;
          throw new CommerceError("invalid_json");
        }
        if (!input || typeof input !== "object" || Array.isArray(input))
          throw new CommerceError("invalid_json");
      }
      if (path === "/v1/signup" && request.method === "POST") {
        if (options.signupEnabled === false)
          throw new CommerceError("signup_unavailable", 503);
        await store.rate(`signup:${ip}`, 10, 3600, now);
        const email = parseEmail(input.email);
        await store.rate(`signup-email:${email}`, 3, 3600, now);
        await store.signup(
          email,
          token(),
          `${options.uiOrigin ?? options.origin}/pages/nevora-verify`,
          now,
        );
        return answer({ state: "check_email" }, 202);
      }
      if (path === "/v1/login-link" && request.method === "POST") {
        const email =
          typeof input.email === "string"
            ? input.email.trim().toLowerCase()
            : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
          throw new CommerceError("invalid_email");
        await store.rate(`signin:${ip}`, 20, 3600, now);
        await store.rate(`signin-email:${email}`, 3, 3600, now);
        await store.loginLink(
          email,
          token(),
          `${options.uiOrigin ?? options.origin}/pages/nevora-verify`,
          now,
          typeof input.businessId==='string'&&/^[a-f0-9-]{36}$/i.test(input.businessId)?input.businessId:undefined,
        );
        return answer({ state: "check_email" }, 202);
      }
      if (
        (path === "/v1/verify" || path === "/v1/handoff/exchange") &&
        request.method === "POST"
      ) {
        await store.rate(`verify:${ip}`, 30, 60, now);
        if (
          typeof input.token !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(input.token)
        )
          throw new CommerceError("invalid_or_expired_link");
        const session = token();
        await store.exchange(
          input.token,
          session,
          now,
          path.includes("handoff"),
          (business,owner,client)=>verifyInstallationOwner(store,business,owner,client),
        );
        return answer({ accessToken: session, expiresIn: 28800 });
      }
      const id = await store.session(bearer, now,(business,owner,client)=>verifyInstallationOwner(store,business,owner,client));
      const owner=await store.tokenOwner(bearer);
      if (path === "/v1/logout" && request.method === "POST") {
        await store.logout(bearer);
        return answer({ state: "signed_out" });
      }
      const business = await store.business(id);
      let expectedCustomer=business.customerId;
      const assertCurrentBilling = async (checkCustomer = true,client?:PoolClient) => {
        const currentId = await store.session(bearer, options.now?.() ?? Date.now(), (b, o, c) => verifyInstallationOwner(store, b, o, c),client);
        const current = await store.business(currentId,client);
        if (currentId !== id || current.state !== business.state || current.slotId !== business.slotId ||
          current.incarnation !== business.incarnation || current.origin !== business.origin ||
          ((checkCustomer||expectedCustomer!==null)&&current.customerId!==expectedCustomer) ||
          (checkCustomer&&current.subscriptionId!==business.subscriptionId))
          throw new CommerceError('billing_binding_changed', 409);
      };
      if (path === "/v1/setup" && request.method === "POST") {
        await store.rate(`setup:${id}`, 10, 3600, now);
        const setup = parseSignup({ ...input, email: business.email });
        await store.submitSetup(id, setup, await hashPassword(setup.password));
        return answer({ state: "setup_accepted" }, 202);
      }
      if (path === "/v1/status" && request.method === "GET") {
        const access = await businessAccess(store, business, now, options.headcount);
        // Paid access can outlive a terminal subscription. This is presentation
        // guidance from the catalog; Checkout still verifies the live provider,
        // original coverage and durable operation fences before any mutation.
        const billingAction = !options.billing || business.state !== 'ready' ? null
          : !business.subscriptionId ? business.subscriptionStatus === null ? 'checkout' : null
          : terminalSubscription(business.subscriptionStatus ?? '') ? 'checkout'
          : ['active','trialing','past_due','unpaid','incomplete','paused'].includes(business.subscriptionStatus ?? '') ? 'portal' : null;
        await assertCurrentBilling();
        return answer({
          billingAction,
          businessId: id,
          businessName: business.profile.businessName ?? null,
          setup: business.state,
          applicationUrl: business.state === "ready" ? business.origin : null,
          ownerEmployeeId: business.profile.ownerEmployeeId ?? "OWNER",
          ...access,
        });
      }
      if (
        (path === "/v1/checkout" || path === "/v1/portal" || path === '/v1/plan-change') &&
        request.method === "POST"
      ) {
        const allowed=path==='/v1/plan-change'?['plan','lang']:['lang'];
        if(Object.keys(input).some(key=>!allowed.includes(key)))throw new CommerceError('invalid_billing_input',400);
        const lang=input.lang===undefined?undefined:commerceLanguage(input.lang);
        if (business.state !== "ready")
          throw new CommerceError("setup_pending", 409);
        if (!options.billing)
          throw new CommerceError("billing_unavailable", 503);
        await businessAccess(store,business,now,options.headcount);
        const operation = request.headers.get("idempotency-key") ?? "";
        if (!/^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(operation))
          throw new CommerceError("idempotency_key_required");
        await store.rate(`billing:${id}`, 20, 3600, now);
        await assertCurrentBilling();
        const context:BillingOperationContext={actor:billingActorHash(store.key,[bearer,owner]),assertCurrent:client=>assertCurrentBilling(path!=='/v1/checkout',client),bindCustomer:customerId=>{
          if(!/^cus_[A-Za-z0-9_]{1,100}$/.test(customerId)||(expectedCustomer!==null&&expectedCustomer!==customerId))throw new CommerceError('billing_binding_changed',409);
          expectedCustomer=customerId;
        }};
        if(path==='/v1/plan-change'){
          if(input.plan!=='small'&&input.plan!=='team')throw new CommerceError('invalid_plan');
          if(!options.billing.planChange)throw new CommerceError('plan_changes_unavailable',503);
          const result=await options.billing.planChange(business,operation,input.plan,owner,lang,context);
          await assertCurrentBilling();
          return answer(result);
        }
        const url = path === "/v1/checkout"
          ? await options.billing.checkout(business, operation, owner, lang,context)
          : await options.billing.portal(business, operation, owner, lang,context);
        // Checkout may legitimately create the first customer/subscription binding.
        await assertCurrentBilling(path !== "/v1/checkout");
        return answer({ url });
      }
      throw new CommerceError("not_found", 404);
    } catch (error) {
      return answer(
        {
          error: {
            code:
              error instanceof CommerceError
                ? error.code
                : "temporarily_unavailable",
          },
        },
        error instanceof CommerceError ? error.status : 503,
      );
    }
  };
}
