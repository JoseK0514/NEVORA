import Link from "next/link";
import { NUVORA_BRAND } from "@/lib/brand";
import { policiesVisible } from "@/lib/legal/policies";
import type { AuthLang } from "@/lib/auth-copy";
import "./signed-out-footer.css";

/* The one footer of every signed-out page (Phase 8, Nov 17, 2026): Sign in and its sub-pages, the policy pages, the 404
 * and the public error screen. One set of names in each language. Each link carries its own separator, drawn only when
 * the line has room for every item (768px and wider: "© 2026 VELANI LLC · Privacy · Terms · Support"). Narrower, the
 * owner is the first line and the links wrap under it 20px apart with no separator, so no line starts or ends with "·".
 * Rules in ./signed-out-footer.css, which the component brings with it (the 404 and the error screen do not load the
 * sign-in sheets). */
export type SignedOutLink = "privacy" | "terms" | "support" | "account-deletion";

const WORDS: Record<AuthLang, { label: string; owner: string; links: Record<SignedOutLink, string> }> = {
  en: { label: "Policies and help", owner: "© 2026 VELANI LLC", links: { privacy: "Privacy", terms: "Terms", support: "Support", "account-deletion": "Account deletion" } },
  es: { label: "Políticas y ayuda", owner: "© 2026 VELANI LLC", links: { privacy: "Privacidad", terms: "Términos", support: "Ayuda", "account-deletion": "Eliminar cuenta" } },
};

export const SIGNED_OUT_LINK_NAMES = { en: WORDS.en.links, es: WORDS.es.links } as const;

/** `deletion` adds Account deletion (the policy pages); `current` marks the page the person is on. `links` is false where
 * the page cannot know whether the policies are published (it then shows the owner only). */
export function SignedOutFooter({ lang, current, deletion = false, links = true }: { lang: AuthLang; current?: SignedOutLink; deletion?: boolean; links?: boolean }) {
  const t = WORDS[lang];
  const items: SignedOutLink[] = deletion ? ["privacy", "terms", "support", "account-deletion"] : ["privacy", "terms", "support"];
  return <div className="so-foot">
    <span className="so-foot__owner">{t.owner}</span>
    {links && policiesVisible() ? <nav className="so-foot__links" aria-label={t.label}>
      {items.map(slug => <span className="so-foot__item" key={slug}><span className="so-foot__dot" aria-hidden="true">·</span>{slug === current
        ? <span aria-current="page">{t.links[slug]}</span>
        : <Link href={`/${slug}`}>{t.links[slug]}</Link>}</span>)}
    </nav> : null}
    {/* Z3 (A4-07): the ownership line is English in both languages, so a Spanish page marks it (as brand-legal.tsx does). */}
    <span className="q-sr" lang="en">{` ${NUVORA_BRAND.ownership}`}</span>
  </div>;
}
