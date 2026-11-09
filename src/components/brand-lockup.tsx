import { BrandMark, BrandWordmark } from "./brand-mark";
import { NUVORA_BRAND } from "../lib/brand";

export function BrandLockup({ variant = "standard", tone = "light", offline = false }: {
  variant?: "compact" | "standard" | "large";
  tone?: "light" | "dark";
  /** Static fallback selects the reviewed public icon for build-time embedding. */
  offline?: boolean;
}) {
  return <span className={`brand-lockup brand-lockup--${variant}`} data-tone={tone}>
    <BrandMark large={variant === "large"} offline={offline} />
    <span className="brand-lockup-copy">
      <BrandWordmark />
      <span className="brand-lockup-module">{NUVORA_BRAND.module}</span>
    </span>
  </span>;
}
