import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { QuietHeader } from "@/components/quiet/quiet";
import { AuthBackNav, DocBrand } from "@/components/auth-premium/auth-back-nav";
import { DocPolicyLinks } from "@/components/auth-premium/doc-links";
import { BlockView } from "@/components/legal/legal-document";
import { POLICY_FACTS, SUPPORT, SUPPORT_EMAIL, policiesVisible, type Block } from "@/lib/legal/policies";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { SUPPORT_COPY, SUPPORT_ES } from "./copy";
import "@/components/quiet/quiet.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: SUPPORT_COPY[await readAuthLang()].metaTitle };
}

const section = (heading: string) => SUPPORT.sections.find(item => item.heading === heading);

/** Quiet (v4, approved Oct 23): Support on the white sign-in page. Email support, the one safety line, three common
 * questions that open their answers in place, then the mailing address. The response commitment and the address
 * are the approved policy facts, word for word.
 * Inspection Nov 14, 2026 (PB-001): the page follows the sign-in language and carries its switch. English is unchanged;
 * Spanish is the translation in ./copy. */
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
    <main className="q-page q-auth q-doc" data-nv-page="" lang={lang}>
      <div className="q-auth__col">
        {/* Review B4 (Nov 10, 2026): the wordmark and one back control on the band (NV-200, NV-318); "Contact" stays as the
          * group's name for assistive technology only, so nothing is clipped by the band (NV-058); the response promise
          * reads at 15px in a 68-character line and the safety line is a teal information note (NV-203). */}
        <DocBrand lang={lang} langLabel={AUTH_COPY[lang].langLabel} />
        <AuthBackNav href="/login" label={t.back} />
        <QuietHeader title={t.title} titleId="legal-title" />
        <p className="q-sr">{es ? SUPPORT_ES.summary : SUPPORT.summary}</p>
        <h2 className="q-sr">{t.contact}</h2>
        <ul className="q-list"><li><a className="q-row" href={`mailto:${SUPPORT_EMAIL}`}><span className="q-rt"><b>{t.emailSupport}</b><i>{SUPPORT_EMAIL}</i></span><CaretRightIcon className="q-chev" weight="bold" aria-hidden="true" /></a></li></ul>
        <p className="q-help q-doc__promise">{es ? SUPPORT_ES.promise : POLICY_FACTS.SUPPORT_RESPONSE_TIME}</p>
        <p className="q-doc__note"><InfoIcon size={20} weight="bold" aria-hidden="true" /><span>{t.safety}</span></p>
        <div className="q-grp"><h2>{t.common}</h2></div>
        <ul className="q-list">
          {answers.signIn ? question(t.cantSignIn, null, answers.signIn) : null}
          {answers.work ? question(t.work, t.workDetail, answers.work) : null}
          {question(t.report, null, answers.report)}
        </ul>
        <div className="q-grp"><h2>{t.mail}</h2></div>
        <p className="q-body q-doc__address">{POLICY_FACTS.BUSINESS_CONTACT_DETAILS}</p>
        <DocPolicyLinks lang={lang} current="support" />
      </div>
    </main>
  );
}
