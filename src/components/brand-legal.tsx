import Link from "next/link";
import { NUVORA_BRAND } from "../lib/brand";
import { policiesVisible } from "../lib/legal/policies";

/** Sign-in pages' footer: VELANI LLC ownership, and the policy links once they're published. Server-only. */
export function BrandLegal() {
  return <div className="brand-legal">
    <span>{NUVORA_BRAND.copyright}</span>
    <span>{NUVORA_BRAND.ownership}</span>
    {policiesVisible() ? <nav className="brand-legal-links" aria-label="Policies and help">
      <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link>
    </nav> : null}
  </div>;
}
