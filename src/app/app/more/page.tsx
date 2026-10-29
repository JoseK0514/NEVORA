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

export const metadata = { title: "More" };

/** Quiet (v4): More is a page. Work first (time, pay, updates), then the account. Only destinations the role has. */
const WORK = ["/app/timecards", "/app/payroll", "/app/reports", "/app/updates", "/app/my-pay"];
const ACCOUNT = ["/app/settings", "/app/profile"];

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
      <QuietRow href="/support" icon={ic(InfoIcon)} title="Support" />
      <QuietRow href="/privacy" icon={ic(ShieldCheckIcon)} title="Privacy and terms" />
    </QuietList>
  </QuietPage>;
}

export default async function MorePage() {
  const session = await requireSession();
  if (session.role === "EMPLOYEE" || session.role === "LEAD") return <EmployeeMore firstName={session.firstName} lastName={session.lastName} role={session.role} />;
  if (!isManagerRole(session.role)) redirect("/app");
  const proof = await requireSessionMutationProof();
  const [operational, payroll, brand] = await Promise.all([
    readOperationalAuthority(proof),
    payrollFeatureEnabled() ? readPayrollCapabilities(proof) : Promise.resolve(undefined),
    currentBrand(),
  ]);
  const navigation = navigationForRole(session.role, payroll, { operational, modules: brand.modules, words: wordPreset(brand.words).en, ownerAdvisorEnabled: process.env.NEVORA_OWNER_ADVISOR_ENABLED === "true" });
  const item = (href: string) => navigation.find(entry => entry.href === href);
  const work = WORK.map(item).filter(entry => entry !== undefined);
  const account = ACCOUNT.map(item).filter(entry => entry !== undefined);
  return <QuietPage>
    <div className="q-bar" aria-hidden="true" />
    <QuietHeader title="More" />
    {work.length ? <QuietList label="Work" style={{ marginTop: 16 }}>
      {work.map(entry => <QuietRow key={entry.href} href={entry.href} title={entry.label} />)}
    </QuietList> : null}
    <QuietList label="Account" style={{ marginTop: 32 }}>
      {account.map(entry => <QuietRow key={entry.href} href={entry.href} title={entry.label} />)}
      <QuietRow href="/support" title="Support" />
    </QuietList>
  </QuietPage>;
}
