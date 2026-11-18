import type { ReactNode } from "react";
import "@/components/auth-premium/auth-b.css";
import "@/components/quiet/quiet.css";
import "@/app/legal.css";
import { notFound } from "next/navigation";
import { BCallout, BEmail } from "@/components/owner-b/b-kit";
import { AuthBackNav, DocBrand } from "@/components/auth-premium/auth-back-nav";
import { AUTH_COPY, type AuthLang } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { SignedOutFooter } from "@/components/auth-premium/signed-out-footer";
import { POLICY_FACTS, SUPPORT_EMAIL, policiesVisible, type PolicyDocument } from "@/lib/legal/policies";
import { BlockView, policySlug as slug } from "./legal-document";
import { POLICY_COPY, effectiveLine } from "./policy-copy";
import { PolicySections } from "./policy-sections";

/** The policy pages' frame (Phase 5): the teal band with the wordmark, the sign-in language pill, the way back and the
 * title, then the page's own content and the closing links. Support and Account deletion draw their content in the
 * page's language; Privacy and Terms pass the English document. The band is the sign-in pages' own (auth-b.css).
 * Phase 8 (Nov 17, 2026): one back link (AuthBackNav's single row, as on the sign-in pages' phones) and the footer every
 * signed-out page shares, with Account deletion added; the operator is the footer's first line. */
export function PolicyFrame({ lang, title, sub, summary, summaryLang, current, children }: {
  lang: AuthLang; title: string; sub?: string | null; summary: string; summaryLang?: AuthLang; current: PolicyDocument["slug"]; children: ReactNode;
}) {
  return (
    <main className="q-page q-auth q-doc" data-nv-page="" lang={lang}>
      <div className="q-auth__col">
        <DocBrand lang={lang} langLabel={AUTH_COPY[lang].langLabel} />
        <AuthBackNav href="/login" label={POLICY_COPY[lang].back} />
        <div className="q-hd q-doc__hd"><div><h1 id="legal-title">{title}</h1>{sub ? <p>{sub}</p> : null}</div></div>
        <p className="q-sr" lang={summaryLang && summaryLang !== lang ? summaryLang : undefined}>{summary}</p>
        {children}
        <footer className="q-doc__foot"><SignedOutFooter lang={lang} current={current} deletion /></footer>
      </div>
    </main>
  );
}

/** Privacy and Terms (Phase 5, PB-001 and PB-034): the document in one reading card. From 1024px the contents list sits
 * beside the reading column and the headings are plain; on phones and tablets the first section is open and "Open all"
 * opens the rest (PolicySections). The document is legal text and is not translated: with Spanish chosen, the band, the
 * contents list's label, the controls and the closing links are in Spanish and one note at the top says the document is
 * in English; the document itself is marked `lang="en"`.
 * Phase 8 (Nov 17, 2026): the title, the tab, the date line and the screen reader's summary are in the page's language
 * and the title and the tab agree ("Política de privacidad"). The contents list names the document's own English
 * headings and is marked `lang="en"`; "Questions" is listed there in English only, because in Spanish it is a Spanish
 * section after the document, not one of its headings.
 * Phase 9 (Nov 18, 2026): the Spanish note is the kit's teal callout (BCallout): the fact as a one-line title, the help
 * path as its body, the support address as its one teal link (BEmail: it wraps only after "@"), a 1px teal edge, and
 * 12px between it and "Abrir todo". The document itself is unchanged. */
export async function QuietLegalDocumentPage({ doc }: { doc: PolicyDocument }) {
  if (!policiesVisible()) notFound();
  const lang = await readAuthLang(), t = POLICY_COPY[lang];
  // The operator is the footer's first line, so the date line is the date alone and never splits a name (Phase 8).
  const sub = doc.effective ? effectiveLine(lang, POLICY_FACTS.EFFECTIVE_DATE) : null;
  const sections = doc.sections.map(section => ({ id: `legal-${slug(section.heading)}`, heading: section.heading,
    body: section.blocks.map((block, index) => <BlockView key={index} block={block} />) }));
  // Privacy ends with where questions go; the contents list names it too (PB-034).
  const questions = doc.slug === "privacy";
  const known = doc.slug === "privacy" || doc.slug === "terms" ? doc.slug : null;
  const tocTitle = known ? t.contents[known] : t.onThisPage;
  return (
    <PolicyFrame lang={lang} title={known ? t.title[known] : doc.title} sub={sub} summary={known ? t.summary[known] : doc.summary} summaryLang={known ? lang : "en"} current={doc.slug}>
      <div className="pl-body pl-body--toc">
        <nav className="pl-toc" aria-labelledby="legal-toc-title"><h2 id="legal-toc-title">{tocTitle}</h2>
          <ul lang="en">{sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}
            {questions && lang === "en" ? <li><a href="#legal-questions">{t.questions}</a></li> : null}</ul></nav>
        <div className="pl-card">
          {t.englishOnly ? <BCallout tone="teal" title={t.englishOnly.title}>{t.englishOnly.before}<a href={`mailto:${SUPPORT_EMAIL}`}><BEmail address={SUPPORT_EMAIL} /></a>{t.englishOnly.after}</BCallout> : null}
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

