import type Stripe from "stripe";
import type { StripeTaxConfig } from "./stripe-config";
import { CommerceError } from "./model";

export function taxTerms(tax: StripeTaxConfig) {
  return JSON.stringify({ version: 1, ...tax });
}

// Read only from the authenticated, encrypted checkout intent, never from
// webhook/session metadata or the runtime configuration of a later worker.
export function readTaxTerms(params: Stripe.Checkout.SessionCreateParams): StripeTaxConfig | undefined {
  const saved = typeof params.metadata === "object" ? params.metadata?.nevora_tax_terms : undefined;
  if (saved === undefined) return undefined;
  if (typeof saved !== "string") throw new CommerceError("stripe_tax_intent_invalid", 503);
  try {
    const value = JSON.parse(saved);
    if (value.version === 1 && /^txcd_\d{8}$/.test(value.code) && (value.behavior === "inclusive" || value.behavior === "exclusive"))
      return { code: value.code, behavior: value.behavior };
  } catch { /* Return one bounded error without including saved data. */ }
  throw new CommerceError("stripe_tax_intent_invalid", 503);
}

export async function assertTaxPrice(stripe: Stripe, price: Stripe.Price, tax: StripeTaxConfig) {
  const product = typeof price.product === "string" ? await stripe.products.retrieve(price.product) : price.product;
  if (!product || product.deleted || price.tax_behavior !== tax.behavior ||
      (typeof product.tax_code === "string" ? product.tax_code : product.tax_code?.id) !== tax.code)
    throw new CommerceError("stripe_tax_price_mismatch", 503);
}
