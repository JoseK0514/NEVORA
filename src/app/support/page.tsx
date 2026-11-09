import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { QuietHeader, QuietNav } from "@/components/quiet/quiet";
import { BlockView, QuietPolicyLinks } from "@/components/legal/legal-document";
import { POLICY_FACTS, SUPPORT, SUPPORT_EMAIL, policiesVisible } from "@/lib/legal/policies";
import "@/components/quiet/quiet.css";

export const metadata: Metadata = { title: "Support · NEVORA" };

const section = (heading: string) => SUPPORT.sections.find(item => item.heading === heading);

/** Quiet (v4, approved Oct 23): Support on the white sign-in page. Email support, the one safety line, three common
 * questions that open their answers in place, then the mailing address. The response commitment and the address
 * are the approved policy facts, word for word. */
export default function Page() {
  if (!policiesVisible()) notFound();
  const contact = section("Contact support"), work = section("Questions about your work"), signIn = section("Signing in"), report = section("Reporting content");
  const question = (title: string, detail: string | null, blocks: NonNullable<typeof contact>["blocks"]) => <li>
    <details className="q-details"><summary className={detail ? "q-row" : "q-row q-row--one"}><span className="q-rt"><b>{title}</b>{detail ? <i>{detail}</i> : null}</span><CaretRightIcon className="q-chev" aria-hidden="true" /></summary>
      <div className="q-doc__body">{blocks.map((block, index) => <BlockView key={index} block={block} />)}</div></details>
  </li>;
  return (
    <main className="q-page q-auth q-doc" data-nv-page="">
      <div className="q-auth__col">
        <QuietNav back={{ href: "/login", label: "Sign in" }} />
        <QuietHeader title="Support" titleId="legal-title" />
        <p className="q-sr">{SUPPORT.summary}</p>
        <div className="q-grp"><h2>Contact</h2></div>
        <ul className="q-list"><li><a className="q-row" href={`mailto:${SUPPORT_EMAIL}`}><span className="q-rt"><b>Email support</b><i>{SUPPORT_EMAIL}</i></span><CaretRightIcon className="q-chev" aria-hidden="true" /></a></li></ul>
        <p className="q-help">{POLICY_FACTS.SUPPORT_RESPONSE_TIME}</p>
        <p className="q-help">Never email passwords, codes, bank details or pay documents.</p>
        <div className="q-grp"><h2>Common questions</h2></div>
        <ul className="q-list">
          {signIn ? question("I can’t sign in", null, signIn.blocks) : null}
          {work ? question("Shift, time off or pay", "Ask your manager", work.blocks) : null}
          {question("Report a problem", null, [...(contact?.blocks.slice(1) ?? []), ...(report?.blocks ?? [])])}
        </ul>
        <div className="q-grp"><h2>Mail</h2></div>
        <p className="q-body" style={{ marginTop: 8 }}>{POLICY_FACTS.BUSINESS_CONTACT_DETAILS}</p>
        <QuietPolicyLinks current="support" />
      </div>
    </main>
  );
}
