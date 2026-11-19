import Link from "next/link";
import { NUVORA_BRAND } from "../lib/brand";
import { policiesVisible } from "../lib/legal/policies";

const LINKS = {
  en: { label: "Policies and help", privacy: "Privacy", terms: "Terms", support: "Support", copyright: NUVORA_BRAND.copyright },
  es: { label: "Políticas y ayuda", privacy: "Privacidad", terms: "Términos", support: "Ayuda", copyright: "© 2026 VELANI LLC. Todos los derechos reservados." },
} as const;

/** Sign-in pages' footer: VELANI LLC ownership, and the policy links once they're published. Server-only.
 * `lang` changes the copyright line and the link labels; the policies themselves are in English. */
export function BrandLegal({ lang = "en" }: { lang?: "en" | "es" }) {
  const t = LINKS[lang];
  return <div className="brand-legal">
    <span>{t.copyright}</span>
    <span>{NUVORA_BRAND.ownership}</span>
    {policiesVisible() ? <nav className="brand-legal-links" aria-label={t.label}>
      <Link href="/privacy">{t.privacy}</Link><Link href="/terms">{t.terms}</Link><Link href="/support">{t.support}</Link>
    </nav> : null}
  </div>;
}

/* Phase 5 (Nov 17, 2026, PB-018): the sign-in footer's own short labels. "(en inglés)" is gone from this line (it was
 * said twice on every page); Privacy and Terms say on the page that they are in English for now. */
const QUIET_LINKS = { en: { privacy: "Privacy", terms: "Terms", support: "Support" }, es: { privacy: "Privacidad", terms: "Términos", support: "Ayuda" } } as const;

/** Quiet (v4, approved Oct 23): one line under the sign-in pages, "© 2026 VELANI LLC · Privacy · Terms · Support". */
export function QuietLegal({ lang = "en" }: { lang?: "en" | "es" }) {
  const t = QUIET_LINKS[lang];
  // Review B4 (Nov 10, 2026, NV-317): each link keeps its dot, so a narrow Spanish line never strands "·" or one word.
  // Phase 5 (PB-018): the links are one group and the dot between the owner and the group is its own piece, so on a
  // phone the sign-in pages stack the two as centred lines and no line starts with a dot (auth-b.css). Read as text,
  // and on every page without that rule, the line is unchanged.
  return <p className="q-legal"><span className="q-legal__item q-legal__owner">© 2026 VELANI LLC</span>{policiesVisible() ? <>
    {" "}<span className="q-legal__links"><span className="q-legal__item"><span className="q-legal__lead">· </span><Link href="/privacy">{t.privacy}</Link></span>{" "}<span className="q-legal__item">· <Link href="/terms">{t.terms}</Link></span>{" "}<span className="q-legal__item">· <Link href="/support">{t.support}</Link></span></span>
  </> : null}<span className="q-sr" lang="en">{` ${NUVORA_BRAND.ownership}`}</span></p>;
}
