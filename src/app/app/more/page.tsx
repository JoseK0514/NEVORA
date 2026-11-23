import {readFeatureFlags} from '../../../lib/feature-flags';
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { payrollFeatureEnabled, readPayrollCapabilities } from "@/lib/payroll/service";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { currentBrand } from "@/lib/workspace-presentation/current.server";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { navigationForRole } from "@/lib/navigation";
import { isManagerRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { initialsOf } from "@/components/quiet/quiet";
import { NotificationCount } from "@/components/notification-bell";
import { employeeViewAuthority } from "@/lib/employee-view-authority.server";
import { Suspense, type ReactNode } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { readReports } from "@/lib/reports/service";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr/Megaphone";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { ChatsCircleIcon } from "@phosphor-icons/react/dist/ssr/ChatsCircle";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { CreditCardIcon } from "@phosphor-icons/react/dist/ssr/CreditCard";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { CorpAvatar, CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import { PortalSignout } from "@/components/portal-signout";
import { Dotted } from "@/components/employee-b/parts";
import { getWorkspace } from "@/lib/data/workspaces";
import { pathEnabled } from "@/lib/workspace-presentation/modules";
import { commerceEnabled } from "@/lib/commerce/access";
import { durationTotal } from "@/lib/duration-format";
import "./more-corp.css";
import "@/components/employee-mobile/account-corp.css";
import { readEmployeeProfile } from "@/lib/data/employee-profile.server";
import { listAvailability } from "@/lib/data/availability";
import { availabilitySummary } from "@/components/employee-mobile/availability-summary";
import { EmployeeMoreB } from "@/components/employee-b/account-b";

export const metadata = { title: "More" };


/** Corporate (Release 1, board E-More): an Employee's More opens from the header avatar, with Home as its back link. The
 * profile card (name; work locations and company under it), Your work with the availability summary, Help and legal,
 * then Sign out (the one Sign out for an Employee). Each value is a fact the person's own reads already hold; a failed
 * read leaves the value out. */
async function EmployeeMoreCorp({ firstName, lastName, workspaceName }: { firstName: string; lastName: string; workspaceName: string }) {
  const [proof, brand] = await Promise.all([requireSessionMutationProof(), currentBrand()]);
  const has = new Set(navigationForRole("EMPLOYEE", undefined, { modules: brand.modules, words: wordPreset(brand.words).en }).map(entry => entry.href));
  const [profile, availability] = await Promise.all([
    readEmployeeProfile(proof).catch(() => null),
    has.has("/app/availability") ? listAvailability(proof.employee.id).then(availabilitySummary).catch(() => null) : Promise.resolve(null),
  ]);
  const locations = profile?.state === "ready" && profile.kind === "profile" ? profile.profile.locations : [];
  const name = `${firstName} ${lastName}`;
  const count = <NotificationCount authority={employeeViewAuthority(proof, "notifications")} />;
  return <CorpPage className="c-more c-more--employee" labelledBy="more-title">
    {/* Direction B on a phone (mock e-more): the same rows, links, values and Sign out. */}
    <EmployeeMoreB name={name} place={[...locations, workspaceName].join(" · ")} availability={availability}
      has={{ availability: has.has("/app/availability"), notifications: has.has("/app/notifications"), updates: has.has("/app/updates") }} count={count} />
    <CorpNav back={{ href: "/app", label: "Home" }} title="More" titleId="more-title" />
    <CorpCard as="div" ariaLabel="Profile">
      <CorpRows><li><CorpRow avatar={<CorpAvatar name={name} initials={initialsOf(name)} />} title={name} detail={[...locations, workspaceName].join(" · ")} bold /></li>
        <li><CorpRow href="/app/profile" title={<span className="c-link c-link--l">Profile and settings</span>} one label={`Profile and settings, ${name}`} /></li></CorpRows>
    </CorpCard>
    <CorpCard as="div" label="Your work">
      <CorpRows>
        {has.has("/app/availability") ? <li><CorpRow href="/app/availability" title="Availability" one value={availability ?? undefined} valueTone="soft" chevron /></li> : null}
        {has.has("/app/notifications") ? <li><CorpRow href="/app/notifications" title="Notifications" one value={count} /></li> : null}
        {has.has("/app/updates") ? <li><CorpRow href="/app/updates" title="Updates" one /></li> : null}
        <li><CorpRow href="/app/profile/calendar" title="Add shifts to your calendar" one /></li>
      </CorpRows>
    </CorpCard>
    <CorpCard as="div" label="Help and legal">
      <CorpRows>
        <li><CorpRow href="/app/help" title="Help" one /></li>
        <li><CorpRow href="/privacy" title="Privacy and terms" one /></li>
      </CorpRows>
    </CorpCard>
    <PortalSignout className="c-more__signout"><button type="submit" className="c-btn c-btn--secondary c-btn--full">Sign out</button></PortalSignout>
  </CorpPage>;
}

/** Insights' grey value on More: the hours recorded this week so far (Monday to today, as Insights opens), from the same
 * read Insights uses. It streams in after the page; a failed or empty read shows nothing, never a zero it doesn't know.
 * Review Nov 14 (BR-1): the figure is the read's whole minutes written by the shared duration formatter, so More,
 * Timecards and Insights round one way. */
async function weekHours(proof: SessionMutationProof, timeZone: string): Promise<string | null> {
  try {
    const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate();
    const monday = today.subtract({ days: today.dayOfWeek - 1 });
    const result = await readReports(proof, { startDate: monday.toString(), endDate: today.toString() });
    if (result.state !== "ready" || !/^\d+$/.test(result.report.summary.recordedNanoseconds)) return null;
    return `${durationTotal(Number(BigInt(result.report.summary.recordedNanoseconds) / BigInt(60_000_000_000)))} this week`;
  } catch { return null; }
}
async function WeekHours({ proof, timeZone }: { proof: SessionMutationProof; timeZone: string }) {
  return await weekHours(proof, timeZone);
}

export default async function MorePage() {
  const session = await requireSession();
  // A Lead has the Employee's More (Direction B, Nov 8, 2026).
  if (session.role === "EMPLOYEE" || session.role === "LEAD") return <EmployeeMoreCorp firstName={session.firstName} lastName={session.lastName} workspaceName={(await getWorkspace()).name} />;
  if (!isManagerRole(session.role)) redirect("/app");
  const proof = await requireSessionMutationProof();
  const [operational, payroll, brand, workspace] = await Promise.all([
    readOperationalAuthority(proof),
    payrollFeatureEnabled() ? readPayrollCapabilities(proof) : Promise.resolve(undefined),
    currentBrand(),
    getWorkspace(),
  ]);
  const words = wordPreset(brand.words).en;
  const navigation = navigationForRole(session.role, payroll, { operational, modules: brand.modules, words, ownerAdvisorEnabled: readFeatureFlags(process.env).ownerAdvisor, managerAdvisorEnabled: readFeatureFlags(process.env).managerAdvisor });
  const has = (href: string) => navigation.some(entry => entry.href === href);
  const label = (href: string, fallback: string) => navigation.find(entry => entry.href === href)?.label ?? fallback;
  const owner = session.role === "OWNER";
  // Navigation check (Nov 23, 2026): a location Manager's line names their places ("Manager · Condado · …"), from the
  // authority read this page already makes; a company-wide Manager or an Owner keeps "Manager · Company".
  const places = operational.state === "ready" && operational.scope?.mode === "LOCATIONS" ? operational.locations.map(location => location.shortName || location.name) : [];
  // Review B1 (NV-099): every navigation row leads with its Phosphor bold icon (a tinted circle, as Team and Timecards rows
  // do) and ends with its chevron; a row may end in a grey value before the chevron ("24 h this week").
  const rowIcons: Record<string, ReactNode> = { "/app/reports": <ChartBarIcon weight="bold" />, "/app/updates": <MegaphoneIcon weight="bold" />,
    "/app/my-pay": <ReceiptIcon weight="bold" />, "/app/ai-manager": <ChatsCircleIcon weight="bold" />, "/app/settings": <GearSixIcon weight="bold" />,
    "/app/schedule/settings": <SlidersHorizontalIcon weight="bold" />, "/app/help": <QuestionIcon weight="bold" />, "/app/billing": <CreditCardIcon weight="bold" /> };
  const row = (href: string, title: string, value?: ReactNode) =>
    <li key={href}><CorpRow href={href} title={title} value={value} valueTone="soft" icon={rowIcons[href]} one chevron /></li>;
  const settings = owner && pathEnabled("/app/settings", brand.modules);
  // Review Nov 14 (AR-13, JR-4): an Owner reaches the subscription from More (and Settings) wherever this deployment has
  // billing on; the page itself is closed everywhere else, so the row is left out there.
  const billing = owner && commerceEnabled();
  const name = `${session.firstName} ${session.lastName}`;
  const company = workspace.name;
  // Phase 8 (B #19, #40): "you" keeps your face tint, as in every list (DESIGN.MD Nov 7: one face tint on every screen;
  // white stays for the band and the top bar), and "Owner · Northside Café & Bakery" wraps between its parts only.
  // Owner premium A9 (structure-experience 2.5): one clean list, opened from the header avatar. You, then Insights and
  // Updates, then Settings (every business setting lives there, once) and Help, then Sign out as a quiet red row. More is
  // an ordinary pushed page: "‹ Home" on a phone, no Done. Only destinations the role has. Notifications is the bell.
  return <CorpPage className="c-more c-page--narrow" labelledBy="more-title">
    <CorpNav back={{ href: "/app", label: "Home" }} title="More" titleId="more-nav-title" phoneOnly />
    <CorpTitle id="more-title" title="More" wide />
    {/* Review Nov 11 (OW-032, TB-016), polish Nov 20, 2026: on tablets and desktop the groups read as one card in the
      812 column and Sign out is that card's last row (owner-b-settings.css); phones keep their separate cards. */}
    <CorpSection ariaLabel="You"><CorpCard as="div">
      <CorpRows label="You"><li><CorpRow href="/app/profile" bold title={name} detail={<Dotted text={[owner ? "Owner" : "Manager", ...places, company].join(" · ")} />}
        avatar={<CorpAvatar initials={initialsOf(name)} name={name} />} chevron /></li></CorpRows>
    </CorpCard></CorpSection>
    {/* Owner premium R5: each group is a section, 32px from the next (12px inside one); More's groups need no visible label. */}
    {has("/app/reports") || has("/app/updates") || has("/app/my-pay") || has("/app/ai-manager") ? <CorpSection ariaLabel="Work"><CorpCard as="div">
      <CorpRows label="Work">
        {has("/app/reports") ? row("/app/reports", label("/app/reports", "Insights"), <Suspense fallback={null}><WeekHours proof={proof} timeZone={workspace.timeZone} /></Suspense>) : null}
        {has("/app/updates") ? row("/app/updates", label("/app/updates", "Updates")) : null}
        {/* Your own pay: on a phone More is the only way to it (desktop has it in the account menu too). */}
        {has("/app/my-pay") ? row("/app/my-pay", "My pay") : null}
        {has("/app/ai-manager") ? row("/app/ai-manager", label("/app/ai-manager", "Rondo AI")) : null}
      </CorpRows>
    </CorpCard></CorpSection> : null}
    <CorpSection ariaLabel="Settings and help"><CorpCard as="div">
      <CorpRows label="Settings and help">
        {settings ? row("/app/settings", "Settings") : null}
        {billing ? row("/app/billing", "Plan and billing") : null}
        {/* A Manager has no Settings; Scheduling rules is theirs to open (it also opens from Schedule). */}
        {!settings && has("/app/schedule/settings") ? row("/app/schedule/settings", "Scheduling rules") : null}
        {row("/app/help", "Help")}
      </CorpRows>
    </CorpCard></CorpSection>
    <CorpSection id="more-signout" ariaLabel="Sign out"><CorpCard as="div">
      <PortalSignout className="c-more__signout"><button type="submit" className="c-row c-row--one c-more__signout-row"><span className="c-row__icon" aria-hidden="true"><SignOutIcon weight="bold" /></span><span className="c-row__main"><span className="c-row__title">Sign out</span></span></button></PortalSignout>
    </CorpCard></CorpSection>
  </CorpPage>;
}
