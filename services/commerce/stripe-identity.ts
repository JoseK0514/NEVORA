import type Stripe from "stripe";
import type { Business } from "./store";
export const terminalSubscription = (status: string) =>
  ["canceled", "incomplete_expired"].includes(status);
export const stripeObjectId = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : value &&
        typeof value === "object" &&
        "id" in value &&
        typeof value.id === "string"
      ? value.id
      : null;
export function assertOwnedSubscription(
  subscription: Stripe.Subscription,
  business: Business,
) {
  if (
    subscription.metadata.nevora_business_id !== business.id ||
    stripeObjectId(subscription.customer) !== business.customerId
  )
    throw Error("subscription_identity_mismatch");
}
