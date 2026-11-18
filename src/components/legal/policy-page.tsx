import type { ReactNode } from "react";
import "@/components/auth-premium/auth-b.css";
import "@/components/quiet/quiet.css";
import "@/app/legal.css";
import { notFound } from "next/navigation";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { AuthBackNav, DocBrand } from "@/components/auth-premium/auth-back-nav";
import { AUTH_COPY, type AuthLang } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { POLICY_FACTS, POLICY_OPERATOR, SUPPORT_EMAIL, policiesVisible, type PolicyDocument } from "@/lib/legal/policies";
import { BlockView, QuietPolicyLinks, policySlug as slug } from "./legal-document";
import { POLICY_COPY } from "./policy-copy";
import { PolicySections } from "./policy-sections";

/** The policy pages' frame (Phase 5): the teal band with the wordmark, the sign-in language pill, the way back and the
 * title, then the page's own content and the closing links. Support and Account deletion draw their content in the
 * page's language; Privacy and Terms pass the English document. The band is the sign-in pages' own (auth-b.css). */
export function PolicyFrame({ lang, title, sub, summary, current, children }: {
  lang: AuthLang; title: string; sub?: string | null; summary: string; current: PolicyDocument["slug"]; children: ReactNode;
}) {
  return (
    <main className="q-page q-auth q-doc" data-nv-page="" lang={lang}>
      <div className="q-auth__col">
        <DocBrand lang={lang} langLabel={AUTH_COPY[lang].langLabel} />
        <AuthBackNav href="/login" label={POLICY_COPY[lang].back} />
        <div className="q-hd q-doc__hd"><div><h1 id="legal-title">{title}</h1>{sub ? <p>{sub}</p> : null}</div></div>
        <p className="q-sr">{summary}</p>
        {children}
        <QuietPolicyLinks current={current} lang={lang} />
        {/* Who provides the pages, as under the sign-in card: every policy page names the operator once. */}
        <p className="pl-operator">© 2026 {POLICY_OPERATOR}</p>
      </div>
    </main>
  );
}

/** Privacy and Terms (Phase 5, PB-001 and PB-034): the document in one reading card. From 1024px the contents list sits
 * beside the reading column and the headings are plain; on phones and tablets the first section is open and "Open all"
 * opens the rest (PolicySections). The document is legal text and is not translated: with Spanish chosen, the band, the
 * contents list's label, the controls and the closing links are in Spanish and one note at the top says the document is
 * in English; the document itself is marked `lang="en"`. */
export async function QuietLegalDocumentPage({ doc }: { doc: PolicyDocument }) {
  if (!policiesVisible()) notFound();
  const lang = await readAuthLang(), t = POLICY_COPY[lang];
  const effective = POLICY_FACTS.EFFECTIVE_DATE;
  const sub = doc.effective ? `Effective ${effective ?? "[CONFIRM_EFFECTIVE_DATE]"} · ${POLICY_OPERATOR}` : POLICY_OPERATOR;
  const sections = doc.sections.map(section => ({ id: `legal-${slug(section.heading)}`, heading: section.heading,
    body: section.blocks.map((block, index) => <BlockView key={index} block={block} />) }));
  // Privacy ends with where questions go; the contents list names it too (PB-034).
  const questions = doc.slug === "privacy";
  const tocTitle = doc.slug === "privacy" || doc.slug === "terms" ? t.contents[doc.slug] : t.onThisPage;
  return (
    <PolicyFrame lang={lang} title={doc.title} sub={sub} summary={doc.summary} current={doc.slug}>
      <div className="pl-body pl-body--toc">
        <nav className="pl-toc" aria-labelledby="legal-toc-title"><h2 id="legal-toc-title">{tocTitle}</h2>
          <ul lang="en">{sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}
            {questions ? <li lang={lang}><a href="#legal-questions">{t.questions}</a></li> : null}</ul></nav>
        <div className="pl-card">
          {t.englishOnly ? <p className="pl-note"><InfoIcon size={20} weight="bold" aria-hidden="true" /><span>{t.englishOnly.before}<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{t.englishOnly.after}</span></p> : null}
          <article lang="en" aria-labelledby="legal-title"><PolicySections sections={sections} labels={{ openAll: t.openAll, closeAll: t.closeAll }} /></article>
          {questions ? <section className="pl-sec pl-questions" id="legal-questions" aria-labelledby="legal-questions-title">
            <h2 className="pl-sec__h" id="legal-questions-title">{t.questions}</h2>
            <div className="pl-sec__body"><p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p></div>
          </section> : null}
        </div>
      </div>
    </PolicyFrame>
  );
}

