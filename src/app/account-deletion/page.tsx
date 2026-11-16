import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { AuthBackNav, DocBrand } from "@/components/auth-premium/auth-back-nav";
import { DocPolicyLinks } from "@/components/auth-premium/doc-links";
import { BlockView } from "@/components/legal/legal-document";
import { POLICY_OPERATOR, policiesVisible } from "@/lib/legal/policies";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { DELETION_COPY } from "./copy";
import "../login/login.css";
import "../login/auth-refinement.css";
import "../legal.css";
import "@/components/quiet/quiet.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: DELETION_COPY[await readAuthLang()].metaTitle };
}

/** Public: readable without signing in. Starting a request signs the person in first, so the server knows whose
 * account it is; an email address alone never deletes anything.
 * Quiet (v4, inspection Oct 24): the same white page and expandable sections as Privacy; the policy text is unchanged.
 * Inspection Nov 14, 2026 (PB-001): the page follows the sign-in language and carries its switch, so it draws the policy
 * pages' layout itself (QuietLegalDocumentPage's markup for a short document: no contents list, the how-to open first)
 * with the words from ./copy. English is the approved policy text; Spanish is its translation. */
export default async function Page() {
  if (!policiesVisible()) notFound();
  const lang = await readAuthLang();
  const t = DELETION_COPY[lang];
  return (
    <main className="q-page q-auth q-doc" data-nv-page="" lang={lang}>
      <div className="q-auth__col">
        <DocBrand lang={lang} langLabel={AUTH_COPY[lang].langLabel} />
        <AuthBackNav href="/login" label={t.back} />
        <div className="q-hd q-doc__hd"><div><h1 id="legal-title">{t.title}</h1><p>{POLICY_OPERATOR}</p></div>
          <div className="q-doc__action"><Link className="q-btn q-doc__start" href="/login?returnTo=%2Fapp%2Faccount%2Fdelete">{t.start}</Link></div></div>
        <p className="q-sr">{t.summary}</p>
        <ul className="q-list q-doc__list" id="legal-sections" aria-labelledby="legal-title">
          {t.sections.map((section, index) => <li key={section.heading}>
            <details className="q-details" id={`legal-section-${index + 1}`} open={index === 0 ? true : undefined}>
              <summary className="q-row q-row--one"><span className="q-rt"><b>{section.heading}</b></span><CaretDownIcon className="q-chev" weight="bold" aria-hidden="true" /></summary>
              <div className="q-doc__body" id={`legal-section-${index + 1}-text`}>{section.blocks.map((block, at) => <BlockView key={at} block={block} />)}</div>
            </details>
          </li>)}
        </ul>
        <DocPolicyLinks lang={lang} current="account-deletion" />
      </div>
    </main>
  );
}
