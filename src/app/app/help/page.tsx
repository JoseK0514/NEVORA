import type { Metadata } from "next";
import { readPortalLanguage } from "@/lib/activation/language.server";
import type { ReactNode } from "react";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/domain";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import { navigationForRole } from "@/lib/navigation";
import { payrollFeatureEnabled, readPayrollCapabilities } from "@/lib/payroll/service";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { currentBrand } from "@/lib/workspace-presentation/current.server";
import { pathEnabled } from "@/lib/workspace-presentation/modules";
import { POLICY_FACTS, SUPPORT, SUPPORT_EMAIL, policiesVisible, type Block } from "@/lib/legal/policies";
import { BlockView } from "@/components/legal/legal-document";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import { EmployeeHelpB } from "@/components/employee-b/account-b";
import { BCallout, BCard, BIcon, BList, BRow, BScreen } from "@/components/owner-b/b-kit";
import "./help.css";

export const metadata: Metadata = { title: "Help" };

const section = (heading: string) => SUPPORT.sections.find(item => item.heading === heading);

/** One question that opens its answer in place: a kit row (title, chevron that turns) over the answer. */
function Question({ title, detail, blocks, employee }: { title: string; detail?: string; blocks: Block[]; employee: boolean }) {
  return <li><details className="c-help__q">
    <summary className={detail ? "c-row" : "c-row c-row--one"}>
      <span className="c-row__main"><span className="c-row__title">{title}</span>{detail ? <span className="c-row__detail"><span>{detail}</span></span> : null}</span>
      <CaretDownIcon className="c-chev c-chev--down" weight="bold" size={16} aria-hidden="true" />
    </summary>
    <div className="c-help__a">{blocks.map((block, index) => <BlockView key={index} block={block} context={employee ? "employee" : undefined} />)}</div>
  </details></li>;
}

type HowTo = { href: string; title: string; icon?: ReactNode };

/** Review Nov 14 (BR-12): "How to", the few jobs each role does most, each one line that opens the page where the job is
 * done (the longer guides are docs/guides/web). Only pages this person can open are listed: the same role, scope, module
 * and payroll reads the menus use. Nothing is granted here; each page still checks its own access. A failed read leaves
 * the section out, and the rest of Help stays. */
async function howTo(role: UserRole, proof: SessionMutationProof): Promise<HowTo[]> {
  try {
    const manager = isManagerRole(role);
    const [operational, payroll, brand] = await Promise.all([
      manager ? readOperationalAuthority(proof) : Promise.resolve(undefined),
      payrollFeatureEnabled() ? readPayrollCapabilities(proof) : Promise.resolve(undefined),
      currentBrand(),
    ]);
    const has = new Set(navigationForRole(role, payroll, { operational, modules: brand.modules }).map(entry => entry.href));
    const open = (href: string) => pathEnabled(href, brand.modules);
    if (manager) {
      // Company-wide work only: a Manager limited to locations has none of these pages.
      if (!has.has("/app/timecards")) return [];
      return [
        ...(has.has("/app/employees") ? [{ href: "/app/employees", title: "Add your team" }] : []),
        ...(has.has("/app/schedule") ? [{ href: "/app/schedule/publish", title: "Build and publish a week" }] : []),
        ...(has.has("/app/settings") ? [{ href: "/app/settings/clocker", title: "Set up the time clock" }] : []),
        { href: "/app/timecards", title: "Approve timecards" },
        ...(has.has("/app/payroll") ? [{ href: "/app/payroll", title: "Prepare payroll" }] : []),
      ];
    }
    // Final verification (Nov 18, 2026): one glyph per concept, as on the Employee's own pages: confirming a schedule is
    // CalendarCheck (CalendarBlank is the Schedule tab's), fixing your time is PencilSimple.
    return [
      { href: "/app/schedule", title: "Confirm your schedule", icon: <CalendarCheckIcon weight="bold" /> },
      ...(open("/app/requests") ? [{ href: "/app/requests?tab=new", title: "Ask for time off", icon: <CalendarMinusIcon weight="bold" /> }] : []),
      ...(open("/app/exchange") ? [{ href: "/app/exchange", title: "Swap or give away a shift", icon: <ArrowsLeftRightIcon weight="bold" /> }] : []),
      { href: "/app/my-time", title: "Fix a missed punch", icon: <PencilSimpleIcon weight="bold" /> },
      ...(has.has("/app/my-pay") ? [{ href: "/app/my-pay", title: "See your pay statement", icon: <ReceiptIcon weight="bold" /> }] : []),
    ];
  } catch { return []; }
}

/** Nov 1 upscale (kit consistency 9): Help inside the app, reached from More. The same content as the public /support page
 * (lib/legal/policies SUPPORT), in kit cards, with "‹ More" back on a phone and the kit's title on tablets and desktop.
 * The questions are worded for the person reading: an Owner or Manager is never told to ask their manager. Facts that are
 * still unconfirmed are left out rather than shown as placeholders; the policy links appear only where the policies are
 * published (the same rule as /support).
 * Review Nov 14 (BR-4): the back link names the real parent for the width. A phone opens Help from More; tablets and
 * desktop have no More page there (Help opens from the sidebar and the account menu), so their back link is Home. The two
 * links are drawn one per width by help.css. */
export default async function HelpPage() {
  const session = await requireSession();
  const manager = isManagerRole(session.role);
  const jobs = await howTo(session.role, await requireSessionMutationProof());
  const employee = !manager;
  const work = section("Questions about your work"), signIn = section("Signing in"), contact = section("Contact support"), report = section("Reporting content");
  const response = POLICY_FACTS.SUPPORT_RESPONSE_TIME;
  const legal = policiesVisible();
  const doc = (slug: string) => employee ? `/app/profile/${slug}` : `/${slug}`;
  // "Report a problem": what to include (the second Contact paragraph) and how to report content; no unconfirmed facts.
  const reportBlocks = [...(contact?.blocks.slice(1) ?? []), ...(report?.blocks ?? [])];
  return <CorpPage className="c-help c-page--narrow" labelledBy="help-title">
    {/* Direction B on an Employee's phone (mock e-help): the same content, links and questions. */}
    {employee ? <EmployeeHelpB lang={(await readPortalLanguage(await requireSessionMutationProof()).catch(()=>null))?.language??'en'} email={SUPPORT_EMAIL} response={response ?? null} signIn={signIn?.blocks ?? null} work={work?.blocks ?? null} report={reportBlocks} legal={legal} /> : null}
    {/* How to for an Employee or Lead: one more Direction B card, kept under the screen's own cards (b-keep) at every
      width. The inner b-screen gives the card the kit's own tokens, resets and desktop sizes; it holds no hero or stack. */}
    {employee && jobs.length ? <div className="b-keep c-help__how">
      <BScreen>
        <BCard title="How to" id="b-help-how">
          <BList>{jobs.map(job => <BRow key={job.href} href={job.href} lead={<BIcon tone="grey">{job.icon}</BIcon>} title={job.title} />)}</BList>
        </BCard>
      </BScreen>
    </div> : null}
    <CorpNav back={{ href: "/app/more", label: "More" }} title="Help" titleId="help-nav-title" phoneOnly />
    <CorpNav back={{ href: "/app", label: "Home" }} phoneOnly />
    <CorpTitle id="help-title" title="Help" wide />
    <CorpSection id="help-contact" label="Contact">
      <CorpCard as="div">
        <CorpRows label="Contact">
          <li><CorpRow href={`mailto:${SUPPORT_EMAIL}`} native title="Email support" detail={SUPPORT_EMAIL} chevron /></li>
        </CorpRows>
        {/* Phase 8 (B #32): the note that qualifies Email support is the card's footer at every width (it floated on the
          canvas on a phone); its words are the support policy's and are unchanged. */}
        {response ? <p className="c-note c-help__note"><span>{response}</span></p> : null}
        {/* Phase 9 (premium pass): the safety sentence is the kit's teal privacy callout, titled as on Support and the
          Employee's Help. The sentence is the support policy's, unchanged. */}
        <div className="c-help__safe"><BCallout tone="teal" icon="privacy" title="Keep private details out of email">Never email passwords, codes, bank details or pay documents.</BCallout></div>
      </CorpCard>
    </CorpSection>
    {jobs.length ? <CorpSection id="help-how" label="How to">
      <CorpCard as="div">
        <CorpRows label="How to">
          {jobs.map(job => <li key={job.href}><CorpRow href={job.href} title={job.title} one chevron /></li>)}
        </CorpRows>
      </CorpCard>
    </CorpSection> : null}
    <CorpSection id="help-questions" label="Common questions">
      <CorpCard as="div">
        <ul className="c-rows" aria-label="Common questions">
          {signIn ? <Question title="I can’t sign in" blocks={signIn.blocks} employee={employee} /> : null}
          {/* Review Nov 14 (AR-15): the page is "Help someone sign in" in Team's row, its heading and here. */}
          {manager && signIn ? <Question title="Someone on my team can’t sign in" employee={false}
            blocks={[{ p: ["Open ", { href: "/app/account-recovery", text: "Help someone sign in" }, " to verify them and give them a one-time reset link. They never need to share a password or a verification code with you."] }]} /> : null}
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
