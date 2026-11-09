import { BrandWordmark } from "./brand-mark";
import { NUVORA_BRAND } from "@/lib/brand";

/** Shared refined identity, using the original NEVORA wordmark. */
export function AuthBrand() {
  return <span className="login-brand-lockup">
    <BrandWordmark />
    <span className="login-brand-module">{NUVORA_BRAND.module}</span>
  </span>;
}
