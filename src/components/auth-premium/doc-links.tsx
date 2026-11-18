import { Fragment } from "react";
import Link from "next/link";
import { QuietPolicyLinks } from "@/components/legal/legal-document";
import type { AuthLang } from "@/lib/auth-copy";

/* Inspection Nov 14, 2026 (PB-001): Support and Account deletion read in Spanish, so their closing line of links does
 * too. Phase 5 (Nov 17, 2026, PB-018): the links no longer repeat "(en inglés)"; that Privacy and Terms are in English
 * for now is said once, on those pages. */
const ES = [["privacy", "Privacidad"], ["terms", "Términos"], ["support", "Ayuda"], ["account-deletion", "Eliminar cuenta"]] as const;

/** The policy pages' closing links in the page's language. English is the policy pages' own line, unchanged. */
export function DocPolicyLinks({ lang, current }: { lang: AuthLang; current: "support" | "account-deletion" }) {
  if (lang === "en") return <QuietPolicyLinks current={current} />;
  return <nav className="q-doc__links" aria-label="Políticas y ayuda de NEVORA">
    {ES.map(([slug, label], index) => <Fragment key={slug}>{index ? " " : null}<span className="q-legal__item">{index ? "· " : null}{slug === current
      ? <span aria-current="page">{label}</span>
      : <Link href={`/${slug}`}>{label}</Link>}</span></Fragment>)}
  </nav>;
}
