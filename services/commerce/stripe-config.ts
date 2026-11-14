import type { PlanKey } from "./model";

export type StripeTaxConfig = {
  code: string;
  behavior: "inclusive" | "exclusive";
};
export function readStripeConfig(
  env: Readonly<Record<string, string | undefined>>,
  environment: string,
  usage:'application'|'worker'='application',
) {
  const flag = env.NEVORA_COMMERCE_TAX_ENABLED;
  let tax: StripeTaxConfig | undefined;
  if (flag !== undefined && flag !== "true" && flag !== "false")
    throw Error("stripe_tax_configuration_invalid");
  if (flag === "true") {
    const code = env.NEVORA_COMMERCE_TAX_CODE;
    const behavior = env.NEVORA_COMMERCE_TAX_BEHAVIOR;
    if (!code || !/^txcd_\d{8}$/.test(code) || (behavior !== "inclusive" && behavior !== "exclusive"))
      throw Error("stripe_tax_configuration_invalid");
    tax = { code, behavior };
  }
  const key = env.STRIPE_SECRET_KEY;
  if (!key) return undefined;
  const mode = /^(?:sk|rk)_(test|live)_[A-Za-z0-9_]+$/.exec(key)?.[1];
  const live = mode === "live";
  if (!mode || (live && (environment !== "production" || env.NEVORA_COMMERCE_STRIPE_LIVE_ENABLED !== "true")))
    throw Error("stripe_environment_mismatch");
  const expectedAccountId = env.STRIPE_ACCOUNT_ID;
  if ((environment !== "development" || expectedAccountId !== undefined) && !/^acct_[A-Za-z0-9]+$/.test(expectedAccountId ?? ""))
    throw Error("stripe_account_required");
  if (!env.STRIPE_PRICE_SMALL || !env.STRIPE_PRICE_TEAM || (usage==='application'&&!env.STRIPE_WEBHOOK_SECRET))
    throw Error("stripe_configuration_incomplete");
  if(usage==='worker'&&env.STRIPE_WEBHOOK_SECRET)throw Error('worker_webhook_credential_forbidden');
  const smallPortal=env.STRIPE_PORTAL_SMALL_CONFIG,teamPortal=env.STRIPE_PORTAL_TEAM_CONFIG;
  if((smallPortal!==undefined||teamPortal!==undefined)&&(!/^bpc_[A-Za-z0-9]+$/.test(smallPortal??'')||!/^bpc_[A-Za-z0-9]+$/.test(teamPortal??'')||smallPortal===teamPortal))throw Error('stripe_portal_configuration_invalid');
  const portalConfigurations:Record<PlanKey,string>|undefined=smallPortal&&teamPortal?{small:smallPortal,team:teamPortal}:undefined;
  const prices: Record<PlanKey, string> = { small: env.STRIPE_PRICE_SMALL, team: env.STRIPE_PRICE_TEAM };
  return { key, live, expectedAccountId, prices, webhookSecret: env.STRIPE_WEBHOOK_SECRET, ...(tax ? { tax } : {}), ...(portalConfigurations?{portalConfigurations}:{}) };
}
