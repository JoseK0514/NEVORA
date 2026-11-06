import { keepWhole } from '@/lib/keep-whole';
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { payrollFeatureEnabled, readPayrollCapabilities } from "@/lib/payroll/service";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { currentBrand } from "@/lib/workspace-presentation/current.server";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { navigationForRole } from "@/lib/navigation";
import { isManagerRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { QuietHeader, QuietList, QuietPage, QuietRow, initialsOf } from "@/components/quiet/quiet";
import { NotificationCount } from "@/components/notification-bell";
import { employeeViewAuthority } from "@/lib/employee-view-authority.server";
import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr/Megaphone";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { Suspense, type ReactNode } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { readReports } from "@/lib/reports/service";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import { CorpAvatar, CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import { PortalSignout } from "@/components/portal-signout";
import { getWorkspace } from "@/lib/data/workspaces";
import { pathEnabled } from "@/lib/workspace-presentation/modules";
import "./more-corp.css";
import "@/components/employee-mobile/account-corp.css";
import { readEmployeeProfile } from "@/lib/data/employee-profile.server";
import { listAvailability } from "@/lib/data/availability";
import { availabilitySummary } from "@/components/employee-mobile/availability-summary";
import { EmployeeMoreB } from "@/components/employee-b/account-b";

export const metadata = { title: "More" };


/** v5 One look (approved Oct 24, mockup E15): an Employee's or Lead's More is a page too. The profile first, then the
 * places that aren't tabs, then help. The calendar row opens Profile's calendar setup (its existing deep link). */
async function EmployeeMore({ firstName, lastName, role }: { firstName: string; lastName: string; role: "EMPLOYEE" | "LEAD" }) {
  const [proof, brand] = await Promise.all([requireSessionMutationProof(), currentBrand()]);
  // Only places the company has switched on (Updates is a feature a company can turn off).
  const has = new Set(navigationForRole(role, undefined, { modules: brand.modules, words: wordPreset(brand.words).en }).map(entry => entry.href));
  const ic = (Icon: typeof BellIcon) => <Icon className="q-ic" aria-hidden="true" />;
  return <QuietPage className="em-more">
    <div className="q-top-gap" aria-hidden="true" />
    <QuietHeader title="More" />
    <QuietList style={{ marginTop: 16 }}>
      <QuietRow href="/app/profile" avatar={initialsOf(`${firstName} ${lastName}`)} title={`${firstName} ${lastName}`} detail={keepWhole(`${role === "LEAD" ? "Lead" : "Employee"} · Profile`)} label={`Profile, ${firstName} ${lastName}`} />
    </QuietList>
    <QuietList label="Your work" style={{ marginTop: 24 }}>
      {has.has("/app/updates") ? <QuietRow href="/app/updates" icon={ic(MegaphoneIcon)} title="Updates" /> : null}
      {has.has("/app/notifications") ? <QuietRow href="/app/notifications" icon={ic(BellIcon)} title="Notifications" value={<NotificationCount authority={employeeViewAuthority(proof, "notifications")} />} /> : null}
      {has.has("/app/availability") ? <QuietRow href="/app/availability" icon={ic(ClockIcon)} title="Availability" /> : null}
      <QuietRow href="/app/profile#employee-calendar-title" icon={ic(CalendarCheckIcon)} title="Add shifts to your calendar" />
    </QuietList>
    <QuietList label="Help" style={{ marginTop: 24 }}>
      <QuietRow href="/app/help" icon={ic(InfoIcon)} title="Support" />
      <QuietRow href="/privacy" icon={ic(ShieldCheckIcon)} title="Privacy and terms" />
    </QuietList>
    {/* Profile's Session section moved off Profile (board E-Profile); on a phone a Lead signs out here. */}
    <PortalSignout><button type="submit" className="q-btn q-btn--sec q-btn--danger" style={{ marginTop: 24 }}>Sign out</button></PortalSignout>
  </QuietPage>;
}

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
      <CorpRows><li><CorpRow avatar={<CorpAvatar initials={initialsOf(name)} />} title={name} detail={[...locations, workspaceName].join(" · ")} bold /></li>
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
    <PortalSignout className="c-more__signout"><button type="submit" className="c-btn c-btn--danger c-btn--full">Sign out</button></PortalSignout>
  </CorpPage>;
}

/** Insights' grey value on More: the hours recorded this week so far (Monday to today, as Insights opens), from the same
 * read Insights uses. It streams in after the page; a failed or empty read shows nothing, never a zero it doesn't know. */
async function weekHours(proof: SessionMutationProof, timeZone: string): Promise<string | null> {
  try {
    const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate();
    const monday = today.subtract({ days: today.dayOfWeek - 1 });
    const result = await readReports(proof, { startDate: monday.toString(), endDate: today.toString() });
    if (result.state !== "ready" || !/^\d+$/.test(result.report.summary.recordedNanoseconds)) return null;
    return `${Math.round(Number(BigInt(result.report.summary.recordedNanoseconds) / BigInt(60_000_000_000)) / 60)} h this week`;
  } catch { return null; }
}
async function WeekHours({ proof, timeZone }: { proof: SessionMutationProof; timeZone: string }) {
  return await weekHours(proof, timeZone);
}

export default async function MorePage() {
  const session = await requireSession();
  if (session.role === "EMPLOYEE") return <EmployeeMoreCorp firstName={session.firstName} lastName={session.lastName} workspaceName={(await getWorkspace()).name} />;
  if (session.role === "LEAD") return <EmployeeMore firstName={session.firstName} lastName={session.lastName} role={session.role} />;
  if (!isManagerRole(session.role)) redirect("/app");
  const proof = await requireSessionMutationProof();
  const [operational, payroll, brand, workspace] = await Promise.all([
    readOperationalAuthority(proof),
    payrollFeatureEnabled() ? readPayrollCapabilities(proof) : Promise.resolve(undefined),
    currentBrand(),
    getWorkspace(),
  ]);
  const words = wordPreset(brand.words).en;
  const navigation = navigationForRole(session.role, payroll, { operational, modules: brand.modules, words, ownerAdvisorEnabled: process.env.NEVORA_OWNER_ADVISOR_ENABLED === "true" });
  const has = (href: string) => navigation.some(entry => entry.href === href);
  const label = (href: string, fallback: string) => navigation.find(entry => entry.href === href)?.label ?? fallback;
  const owner = session.role === "OWNER";
  // Nov 1 upscale (board O-More): no row icons; a row may end in a grey value before its chevron ("24 h this week").
  const row = (href: string, title: string, value?: ReactNode) =>
    <li key={href}><CorpRow href={href} title={title} value={value} valueTone="soft" one chevron /></li>;
  const settings = owner && pathEnabled("/app/settings", brand.modules);
  const name = `${session.firstName} ${session.lastName}`;
  const company = workspace.name;
  // Owner premium A9 (structure-experience 2.5): one clean list, opened from the header avatar. You, then Insights and
  // Updates, then Settings (every business setting lives there, once) and Help, then Sign out as a quiet red row. More is
  // an ordinary pushed page: "‹ Home" on a phone, no Done. Only destinations the role has. Notifications is the bell.
  return <CorpPage className="c-more c-page--narrow" labelledBy="more-title">
    <CorpNav back={{ href: "/app", label: "Home" }} title="More" titleId="more-nav-title" phoneOnly />
    <CorpTitle id="more-title" title="More" wide />
    <CorpSection ariaLabel="You"><CorpCard as="div">
      <CorpRows label="You"><li><CorpRow href="/app/profile" bold title={name} detail={`${owner ? "Owner" : "Manager"} · ${company}`}
        label={`Your profile, ${name}`} avatar={<CorpAvatar initials={initialsOf(name)} />} chevron /></li></CorpRows>
    </CorpCard></CorpSection>
    {/* Owner premium R5: each group is a section, 32px from the next (12px inside one); More's groups need no visible label. */}
    {has("/app/reports") || has("/app/updates") || has("/app/ai-manager") ? <CorpSection ariaLabel="Work"><CorpCard as="div">
      <CorpRows label="Work">
        {has("/app/reports") ? row("/app/reports", label("/app/reports", "Insights"), <Suspense fallback={null}><WeekHours proof={proof} timeZone={workspace.timeZone} /></Suspense>) : null}
        {has("/app/updates") ? row("/app/updates", label("/app/updates", "Updates")) : null}
        {has("/app/ai-manager") ? row("/app/ai-manager", label("/app/ai-manager", "AI manager")) : null}
      </CorpRows>
    </CorpCard></CorpSection> : null}
    <CorpSection ariaLabel="Settings and help"><CorpCard as="div">
      <CorpRows label="Settings and help">
        {settings ? row("/app/settings", "Settings") : null}
        {/* A Manager has no Settings; Scheduling rules is theirs to open (it also opens from Schedule). */}
        {!settings && has("/app/schedule/settings") ? row("/app/schedule/settings", "Scheduling rules") : null}
        {row("/app/help", "Help")}
      </CorpRows>
    </CorpCard></CorpSection>
    <CorpSection ariaLabel="Sign out"><CorpCard as="div">
      <PortalSignout className="c-more__signout"><button type="submit" className="c-row c-row--one c-row--danger c-more__signout-row"><span className="c-row__main"><span className="c-row__title">Sign out</span></span></button></PortalSignout>
    </CorpCard></CorpSection>
  </CorpPage>;
}
