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
import { ArrowsLeftRightIcon, BuildingsIcon, CalendarXIcon, ChartBarIcon, CoffeeIcon, DeviceTabletIcon, MapPinIcon, PaletteIcon, ReceiptIcon, SlidersHorizontalIcon, SparkleIcon, TagIcon, ToggleRightIcon, UserCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { CorpAvatar, CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { PortalSignout } from "@/components/portal-signout";
import { getWorkspace } from "@/lib/data/workspaces";
import { listLocations } from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { listBreakTypes } from "@/lib/clocker/break-types.server";
import { listClockerDevices } from "@/lib/clocker/devices.server";
import { currentPayPeriod } from "@/lib/payroll/pay-calendar.server";
import { pathEnabled } from "@/lib/workspace-presentation/modules";
import { lower } from "@/lib/workspace-presentation/words";
import "./more-corp.css";
import "@/components/employee-mobile/account-corp.css";
import { readEmployeeProfile } from "@/lib/data/employee-profile.server";
import { listAvailability } from "@/lib/data/availability";
import { availabilitySummary } from "@/components/employee-mobile/availability-summary";

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
      <QuietRow href="/support" icon={ic(InfoIcon)} title="Support" />
      <QuietRow href="/privacy" icon={ic(ShieldCheckIcon)} title="Privacy and terms" />
    </QuietList>
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
  return <CorpPage className="c-more c-more--employee" labelledBy="more-title">
    <CorpNav back={{ href: "/app", label: "Home" }} title="More" titleId="more-title" />
    <CorpCard as="div" ariaLabel="Profile">
      <CorpRows><li><CorpRow avatar={<CorpAvatar initials={initialsOf(name)} />} title={name} detail={[...locations, workspaceName].join(" · ")} bold /></li>
        <li><CorpRow href="/app/profile" title={<span className="c-link c-link--l">Profile and settings</span>} one label={`Profile and settings, ${name}`} /></li></CorpRows>
    </CorpCard>
    <CorpCard as="div" label="Your work">
      <CorpRows>
        {has.has("/app/availability") ? <li><CorpRow href="/app/availability" title="Availability" one value={availability ?? undefined} valueTone="soft" chevron /></li> : null}
        {has.has("/app/notifications") ? <li><CorpRow href="/app/notifications" title="Notifications" one value={<NotificationCount authority={employeeViewAuthority(proof, "notifications")} />} /></li> : null}
        {has.has("/app/updates") ? <li><CorpRow href="/app/updates" title="Updates" one /></li> : null}
        <li><CorpRow href="/app/profile/calendar" title="Add shifts to your calendar" one /></li>
      </CorpRows>
    </CorpCard>
    <CorpCard as="div" label="Help and legal">
      <CorpRows>
        <li><CorpRow href="/support" title="Help" one /></li>
        <li><CorpRow href="/privacy" title="Privacy and terms" one /></li>
      </CorpRows>
    </CorpCard>
    <PortalSignout className="c-more__signout"><button type="submit" className="c-btn c-btn--danger c-btn--full">Sign out</button></PortalSignout>
  </CorpPage>;
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
  // Each value is a fact its page already holds; a failed read leaves the value out, never a wrong number.
  const ids = { employeeId: proof.employee.id, sessionTokenHash: proof.sessionTokenHash };
  const [locations, positions, breakTypes, devices, pay] = owner ? await Promise.all([
    listLocations({ includeInactive: false }).then(rows => rows.length).catch(() => null),
    listPositions().then(rows => rows.length).catch(() => null),
    listBreakTypes(ids).then(rows => rows.filter(row => row.active).length).catch(() => null),
    listClockerDevices(ids).then(rows => rows.filter(row => row.state === "ACTIVE").length).catch(() => null),
    payroll?.canConfigure ? currentPayPeriod().catch(() => null) : Promise.resolve(null),
  ]) : [null, null, null, null, null];
  const frequency = pay?.frequency ? ({ WEEKLY: "Weekly", BIWEEKLY: "Every two weeks", SEMIMONTHLY: "Twice a month", MONTHLY: "Monthly" } as const)[pay.frequency] : undefined;
  const ic = (Icon: typeof BellIcon) => <Icon className="c-ic" aria-hidden="true" />;
  const row = (href: string, title: string, Icon: typeof BellIcon, value?: number | string | null) =>
    <li key={href}><CorpRow href={href} title={title} icon={ic(Icon)} value={value === null || value === undefined ? undefined : String(value)} chevron /></li>;
  const settings = owner && pathEnabled("/app/settings", brand.modules);
  const company = workspace.name;
  // Corporate (Release 1, board O-More): opened from the header avatar. The company, Insights and Updates, the
  // business's settings with their counts, the company and the account, then Sign out. Only destinations the role has.
  return <CorpPage className="c-more" labelledBy="more-title">
    <CorpNav title="More" right={<Link href="/app">Done</Link>} phoneOnly />
    <CorpTitle id="more-title" title="More" wide />
    <CorpCard as="div" ariaLabel="Company">
      <CorpRows label="Company"><li><CorpRow href={owner ? "/app/settings/workspace" : "/app/profile"} bold title={company}
        detail={[locations !== null ? `${locations} ${locations === 1 ? lower(words.location) : lower(words.locations)}` : null, `${session.firstName} ${session.lastName}, ${owner ? "owner" : "manager"}`].filter(Boolean).join(" · ")}
        avatar={<CorpAvatar initials={initialsOf(company)} />} chevron /></li></CorpRows>
    </CorpCard>
    <CorpCard as="div" ariaLabel="Work">
      <CorpRows label="Work">
        {has("/app/reports") ? row("/app/reports", label("/app/reports", "Insights"), ChartBarIcon) : null}
        {has("/app/updates") ? row("/app/updates", label("/app/updates", "Updates"), MegaphoneIcon) : null}
        {has("/app/ai-manager") ? row("/app/ai-manager", label("/app/ai-manager", "AI manager"), SparkleIcon) : null}
        {has("/app/my-pay") ? row("/app/my-pay", label("/app/my-pay", "My pay"), ReceiptIcon) : null}
        {has("/app/requests") ? row("/app/requests", label("/app/requests", "Time off"), CalendarXIcon) : null}
        {has("/app/exchange") ? row("/app/exchange", label("/app/exchange", "Shift requests"), ArrowsLeftRightIcon) : null}
        {has("/app/availability") ? row("/app/availability", label("/app/availability", "Availability"), ClockIcon) : null}
      </CorpRows>
    </CorpCard>
    {settings || has("/app/schedule/settings") ? <CorpCard as="div" ariaLabel="Business settings">
      <CorpRows label="Business settings">
        {settings && pathEnabled("/app/settings/locations", brand.modules) ? row("/app/settings/locations", words.locations, MapPinIcon, locations) : null}
        {settings ? row("/app/settings/positions", "Positions", TagIcon, positions) : null}
        {settings ? row("/app/settings/breaks", "Break types", CoffeeIcon, breakTypes) : null}
        {settings ? row("/app/settings/clocker", "Clocker devices", DeviceTabletIcon, devices) : null}
        {has("/app/schedule/settings") ? row("/app/schedule/settings", "Scheduling rules", CalendarCheckIcon) : null}
        {settings && payroll?.canConfigure ? row("/app/settings/payroll", "Payroll settings", SlidersHorizontalIcon, frequency) : null}
      </CorpRows>
    </CorpCard> : null}
    <CorpCard as="div" ariaLabel="Account">
      <CorpRows label="Account">
        {settings ? row("/app/settings/workspace", "Company profile", BuildingsIcon) : null}
        {settings ? row("/app/settings/branding", "Branding", PaletteIcon) : null}
        {settings ? row("/app/settings/features", "Features and words", ToggleRightIcon) : null}
        {settings ? row("/app/settings/company-policies", "Company policies", ShieldCheckIcon) : null}
        {row("/app/profile", "Your profile", UserCircleIcon)}
        {has("/app/notifications") ? row("/app/notifications", "Notifications", BellIcon) : null}
        {row("/support", "Help", InfoIcon)}
      </CorpRows>
    </CorpCard>
    <PortalSignout className="c-more__signout"><button type="submit" className="c-btn c-btn--danger c-btn--full">Sign out</button></PortalSignout>
  </CorpPage>;
}
