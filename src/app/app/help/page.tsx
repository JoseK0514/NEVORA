import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { POLICY_FACTS, SUPPORT, SUPPORT_EMAIL, policiesVisible, type Block } from "@/lib/legal/policies";
import { BlockView } from "@/components/legal/legal-document";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import { EmployeeHelpB } from "@/components/employee-b/account-b";
import "./help.css";

export const metadata: Metadata = { title: "Help" };

const section = (heading: string) => SUPPORT.sections.find(item => item.heading === heading);

/** One question that opens its answer in place: a kit row (title, chevron that turns) over the answer. */
function Question({ title, detail, blocks, employee }: { title: string; detail?: string; blocks: Block[]; employee: boolean }) {
  return <li><details className="c-help__q">
    <summary className={detail ? "c-row" : "c-row c-row--one"}>
      <span className="c-row__main"><span className="c-row__title">{title}</span>{detail ? <span className="c-row__detail"><span>{detail}</span></span> : null}</span>
      <CaretRightIcon className="c-chev" weight="bold" aria-hidden="true" />
    </summary>
    <div className="c-help__a">{blocks.map((block, index) => <BlockView key={index} block={block} context={employee ? "employee" : undefined} />)}</div>
  </details></li>;
}

/** Nov 1 upscale (kit consistency 9): Help inside the app, reached from More. The same content as the public /support page
 * (lib/legal/policies SUPPORT), in kit cards, with "‹ More" back on a phone and the kit's title on tablets and desktop.
 * The questions are worded for the person reading: an Owner or Manager is never told to ask their manager. Facts that are
 * still unconfirmed are left out rather than shown as placeholders; the policy links appear only where the policies are
 * published (the same rule as /support). */
export default async function HelpPage() {
  const session = await requireSession();
  const manager = isManagerRole(session.role);
  const employee = !manager;
  const work = section("Questions about your work"), signIn = section("Signing in"), contact = section("Contact support"), report = section("Reporting content");
  const response = POLICY_FACTS.SUPPORT_RESPONSE_TIME;
  const legal = policiesVisible();
  const doc = (slug: string) => employee ? `/app/profile/${slug}` : `/${slug}`;
  // "Report a problem": what to include (the second Contact paragraph) and how to report content; no unconfirmed facts.
  const reportBlocks = [...(contact?.blocks.slice(1) ?? []), ...(report?.blocks ?? [])];
  return <CorpPage className="c-help c-page--narrow" labelledBy="help-title">
    {/* Direction B on an Employee's phone (mock e-help): the same content, links and questions. */}
    {employee ? <EmployeeHelpB email={SUPPORT_EMAIL} response={response ?? null} signIn={signIn?.blocks ?? null} work={work?.blocks ?? null} report={reportBlocks} legal={legal} /> : null}
    <CorpNav back={{ href: "/app/more", label: "More" }} title="Help" titleId="help-nav-title" phoneOnly />
    <CorpTitle id="help-title" title="Help" wide />
    <CorpSection id="help-contact" label="Contact">
      <CorpCard as="div">
        <CorpRows label="Contact">
          <li><CorpRow href={`mailto:${SUPPORT_EMAIL}`} native title="Email support" detail={SUPPORT_EMAIL} chevron label={`Email support, ${SUPPORT_EMAIL}`} /></li>
        </CorpRows>
      </CorpCard>
      <p className="c-note c-help__note"><span>{response ? `${response} ` : ""}Never email passwords, codes, bank details or pay documents.</span></p>
    </CorpSection>
    <CorpSection id="help-questions" label="Common questions">
      <CorpCard as="div">
        <ul className="c-rows" aria-label="Common questions">
          {signIn ? <Question title="I can’t sign in" blocks={signIn.blocks} employee={employee} /> : null}
          {manager && signIn ? <Question title="Someone on my team can’t sign in" detail="Account recovery" employee={false}
            blocks={[{ p: ["Open ", { href: "/app/account-recovery", text: "Account recovery" }, " to verify them and give them a recovery code. They never need to share a password or a verification code with you."] }]} /> : null}
          {employee && work ? <Question title="Shift, time off or pay" detail="Ask your manager" blocks={work.blocks} employee /> : null}
          {reportBlocks.length ? <Question title="Report a problem" blocks={reportBlocks} employee={employee} /> : null}
        </ul>
      </CorpCard>
    </CorpSection>
    {legal ? <CorpSection id="help-legal" label="Privacy and terms">
      <CorpCard as="div">
        <CorpRows label="Privacy and terms">
          <li><CorpRow href={doc("privacy")} title="Privacy Policy" one /></li>
          <li><CorpRow href={doc("terms")} title="Terms of Use" one /></li>
          <li><CorpRow href={doc("account-deletion")} title="Account deletion" one /></li>
        </CorpRows>
      </CorpCard>
    </CorpSection> : null}
  </CorpPage>;
}
