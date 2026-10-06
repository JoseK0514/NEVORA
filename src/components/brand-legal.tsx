import { NUVORA_BRAND } from "../lib/brand";

export function BrandLegal() {
  return <div className="brand-legal">
    <span>{NUVORA_BRAND.copyright}</span>
    <span>{NUVORA_BRAND.ownership}</span>
  </div>;
}
