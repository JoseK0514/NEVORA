import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockView } from "@/components/legal/legal-document";
import { POLICY_COPY } from "@/components/legal/policy-copy";
import { PolicyFrame } from "@/components/legal/policy-page";
import { PolicySections } from "@/components/legal/policy-sections";
import { policiesVisible } from "@/lib/legal/policies";
import { readAuthLang } from "@/lib/auth-lang.server";
import { DELETION_COPY } from "./copy";

export async function generateMetadata(): Promise<Metadata> {
  return { title: DELETION_COPY[await readAuthLang()].metaTitle };
}

/** Public: readable without signing in. Starting a request signs the person in first, so the server knows whose
 * account it is; an email address alone never deletes anything.
 * Inspection Nov 14, 2026 (PB-001): the page follows the sign-in language and carries its switch, with the words from
 * ./copy. English is the approved policy text; Spanish is its translation.
 * Phase 5 (PB-024): the title says what the page is for, and "Start deletion request" is no longer the white pill on the
 * band. It is an outlined pill inside the card, under the how-to (which also says what to do if you cannot sign in), so
 * the action follows its explanation. The how-to is always open; the other sections open in place on phones and tablets
 * and read as plain headings from 1024px (PolicySections). */
export default async function Page() {
  if (!policiesVisible()) notFound();
  const lang = await readAuthLang();
  const t = DELETION_COPY[lang], chrome = POLICY_COPY[lang];
  const sections = t.sections.map((section, index) => ({ id: `legal-section-${index + 1}`, heading: section.heading,
    body: section.blocks.map((block, at) => <BlockView key={at} block={block} />) }));
  return (
    <PolicyFrame lang={lang} title={t.title} sub={t.sub} summary={t.summary} current="account-deletion">
      <div className="pl-body">
        <div className="pl-card">
          <PolicySections sections={sections} labels={{ openAll: chrome.openAll, closeAll: chrome.closeAll }} pinFirst
            afterFirst={<p className="pl-start"><Link className="pl-start__btn" href="/login?returnTo=%2Fapp%2Faccount%2Fdelete">{t.start}</Link></p>} />
        </div>
      </div>
    </PolicyFrame>
  );
}
