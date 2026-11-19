import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { BCallout } from "@/components/owner-b/b-kit";
import { BlockView } from "@/components/legal/legal-document";
import { PolicyFrame } from "@/components/legal/policy-page";
import { POLICY_FACTS, SUPPORT, SUPPORT_EMAIL, policiesVisible, type Block } from "@/lib/legal/policies";
import { readAuthLang } from "@/lib/auth-lang.server";
import { SUPPORT_COPY, SUPPORT_ES } from "./copy";

export async function generateMetadata(): Promise<Metadata> {
  return { title: SUPPORT_COPY[await readAuthLang()].metaTitle };
}

const section = (heading: string) => SUPPORT.sections.find(item => item.heading === heading);
/** Premium pass FD (Nov 18, 2026): a two-word name in the safety note never splits across lines ("bank / details"); the
 * words are the note's own, joined by a no-break space. */
const keepPairs = (text: string) => text.replace(/\b(bank|datos) (details|bancarios)\b/g, "$1\u00a0$2");

/** Quiet (v4, approved Oct 23): Support on the white sign-in page. Email support, the one safety line, three common
 * questions that open their answers in place, then the mailing address. The response commitment and the address
 * are the approved policy facts, word for word.
 * Inspection Nov 14, 2026 (PB-001): the page follows the sign-in language and carries its switch. English is unchanged;
 * Spanish is the translation in ./copy. Phase 5: the policy pages' shared frame (PolicyFrame). */
export default async function Page() {
  if (!policiesVisible()) notFound();
  const lang = await readAuthLang();
  const t = SUPPORT_COPY[lang], es = lang === "es";
  const contact = section("Contact support"), work = section("Questions about your work"), signIn = section("Signing in"), report = section("Reporting content");
  const answers = es ? { signIn: SUPPORT_ES.signIn, work: SUPPORT_ES.work, report: SUPPORT_ES.report }
    : { signIn: signIn?.blocks, work: work?.blocks, report: [...(contact?.blocks.slice(1) ?? []), ...(report?.blocks ?? [])] };
  const question = (title: string, detail: string | null, blocks: Block[]) => <li>
    <details className="q-details"><summary className={detail ? "q-row" : "q-row q-row--one"}><span className="q-rt"><b>{title}</b>{detail ? <i>{detail}</i> : null}</span><CaretDownIcon className="q-chev" weight="bold" aria-hidden="true" /></summary>
      <div className="q-doc__body">{blocks.map((block, index) => <BlockView key={index} block={block} />)}</div></details>
  </li>;
  return (
    <PolicyFrame lang={lang} title={t.title} summary={es ? SUPPORT_ES.summary : SUPPORT.summary} current="support">
      {/* Review B4 (Nov 10, 2026): "Contact" stays as the group's name for assistive technology only (NV-058); the response
        * promise reads at 15px in a 68-character line and the safety line is a teal information note (NV-203).
        * Phase 5 (PB-033): a group heading sits 32px under the group before it and 12px above its own. */}
      {/* Phase 9 (Nov 18, 2026): the safety note is the kit's teal callout with the privacy glyph (ShieldCheck) and its own
        * title, at the top of the Email support card it is about: a tinted note lives on white, never on the canvas. */}
      <h2 className="q-sr">{t.contact}</h2>
      <div className="q-doc__card">
        <BCallout tone="teal" icon="privacy" title={t.safetyTitle}>{keepPairs(t.safety)}</BCallout>
        <ul className="q-list"><li><a className="q-row" href={`mailto:${SUPPORT_EMAIL}`}><span className="q-rt"><b>{t.emailSupport}</b><i>{SUPPORT_EMAIL}</i></span><CaretRightIcon className="q-chev" weight="bold" aria-hidden="true" /></a></li></ul>
      </div>
      <p className="q-help q-doc__promise">{es ? SUPPORT_ES.promise : POLICY_FACTS.SUPPORT_RESPONSE_TIME}</p>
      <h2 className="pl-grp" id="support-common">{t.common}</h2>
      <ul className="q-list" aria-labelledby="support-common">
        {answers.signIn ? question(t.cantSignIn, null, answers.signIn) : null}
        {answers.work ? question(t.work, null, answers.work) : null}
        {question(t.report, null, answers.report)}
      </ul>
      <h2 className="pl-grp">{t.mail}</h2>
      <p className="q-body q-doc__address">{POLICY_FACTS.BUSINESS_CONTACT_DETAILS}</p>
    </PolicyFrame>
  );
}
