import Link from "next/link";
import { NUVORA_BRAND } from "../lib/brand";
import { policiesVisible } from "../lib/legal/policies";

const LINKS = {
  en: { label: "Policies and help", privacy: "Privacy", terms: "Terms", support: "Support" },
  es: { label: "Políticas y ayuda", privacy: "Privacidad", terms: "Términos", support: "Soporte" },
} as const;

/** Sign-in pages' footer: VELANI LLC ownership, and the policy links once they're published. Server-only.
 * `lang` only changes the link labels; the policies themselves are in English. */
export function BrandLegal({ lang = "en" }: { lang?: "en" | "es" }) {
  const t = LINKS[lang];
  return <div className="brand-legal">
    <span>{NUVORA_BRAND.copyright}</span>
    <span>{NUVORA_BRAND.ownership}</span>
    {policiesVisible() ? <nav className="brand-legal-links" aria-label={t.label}>
      <Link href="/privacy">{t.privacy}</Link><Link href="/terms">{t.terms}</Link><Link href="/support">{t.support}</Link>
    </nav> : null}
  </div>;
}
