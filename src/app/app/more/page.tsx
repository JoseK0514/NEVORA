import { routeTitle } from "@/app/app/route-titles";
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
import { readPortalLanguage } from "@/lib/activation/language.server";
import { SHELL_WORDS, navLabel } from "@/components/shell-copy";
import type { PortalLang } from "@/lib/i18n/portal-lang";

/** Signed-in Spanish: the person's language (Profile choice, then the sign-in cookie, then the browser's); English if the read fails. */
const langOf = (proof: SessionMutationProof): Promise<PortalLang> => readPortalLanguage(proof).then(result => result.language as PortalLang).catch((): PortalLang => "en");

export const generateMetadata = routeTitle("more");


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
  const lang = await langOf(proof), W = SHELL_WORDS[lang], L = (label: string) => navLabel(label, lang);
  const count = <NotificationCount authority={employeeViewAuthority(proof, "notifications")} />;
  return <CorpPage className="c-more c-more--employee" labelledBy="more-title">
    {/* Direction B on a phone (mock e-more): the same rows, links, values and Sign out. */}
    <EmployeeMoreB name={name} place={[...locations, workspaceName].join(" · ")} availability={availability}
      has={{ availability: has.has("/app/availability"), notifications: has.has("/app/notifications"), updates: has.has("/app/updates") }} count={count} />
    <CorpNav back={{ href: "/app", label: L("Home") }} title={L("More")} titleId="more-title" />
    <CorpCard as="div" ariaLabel={L("Profile")}>
      <CorpRows><li><CorpRow avatar={<CorpAvatar name={name} initials={initialsOf(name)} />} title={name} detail={[...locations, workspaceName].join(" · ")} bold /></li>
        <li><CorpRow href="/app/profile" title={<span className="c-link c-link--l">{W.profileAndSettings}</span>} one label={W.profileAndSettingsFor(name)} /></li></CorpRows>
    </CorpCard>
    <CorpCard as="div" label={W.yourWork}>
      <CorpRows>
        {has.has("/app/availability") ? <li><CorpRow href="/app/availability" title={L("Availability")} one value={availability ?? undefined} valueTone="soft" chevron /></li> : null}
        {has.has("/app/notifications") ? <li><CorpRow href="/app/notifications" title={L("Notifications")} one value={count} /></li> : null}
        {has.has("/app/updates") ? <li><CorpRow href="/app/updates" title={L("Updates")} one /></li> : null}
        <li><CorpRow href="/app/profile/calendar" title={W.addToCalendar} one /></li>
      </CorpRows>
    </CorpCard>
    <CorpCard as="div" label={W.helpAndLegal}>
      <CorpRows>
        <li><CorpRow href="/app/help" title={W.help} one /></li>
        <li><CorpRow href="/privacy" title={W.privacyAndTerms} one /></li>
      </CorpRows>
    </CorpCard>
    <PortalSignout className="c-more__signout"><button type="submit" className="c-btn c-btn--secondary c-btn--full">{W.signOut}</button></PortalSignout>
  </CorpPage>;
}

/** Insights' grey value on More: the hours recorded this week so far (Monday to today, as Insights opens), from the same
 * read Insights uses. It streams in after the page; a failed or empty read shows nothing, never a zero it doesn't know.
 * Review Nov 14 (BR-1): the figure is the read's whole minutes written by the shared duration formatter, so More,
 * Timecards and Insights round one way. */
async function weekHours(proof: SessionMutationProof, timeZone: string, lang: PortalLang = "en"): Promise<string | null> {
  try {
    const today = Temporal.Now.zonedDateTimeISO(timeZone).toPlainDate();
    const monday = today.subtract({ days: today.dayOfWeek - 1 });
    const result = await readReports(proof, { startDate: monday.toString(), endDate: today.toString() });
    if (result.state !== "ready" || !/^\d+$/.test(result.report.summary.recordedNanoseconds)) return null;
    return SHELL_WORDS[lang].thisWeek(durationTotal(Number(BigInt(result.report.summary.recordedNanoseconds) / BigInt(60_000_000_000))));
  } catch { return null; }
}
async function WeekHours({ proof, timeZone, lang }: { proof: SessionMutationProof; timeZone: string; lang: PortalLang }) {
  return await weekHours(proof, timeZone, lang);
}

export default async function MorePage() {
  const session = await requireSession();
  // A Lead has the Employee's More (Direction B, Nov 8, 2026).
  if (session.role === "EMPLOYEE" || session.role === "LEAD") return <EmployeeMoreCorp firstName={session.firstName} lastName={session.lastName} workspaceName={(await getWorkspace()).name} />;
  if (!isManagerRole(session.role)) redirect("/app");
  const proof = await requireSessionMutationProof();
  const [operational, payroll, brand, workspace, lang] = await Promise.all([
    readOperationalAuthority(proof),
    payrollFeatureEnabled() ? readPayrollCapabilities(proof) : Promise.resolve(undefined),
    currentBrand(),
    getWorkspace(),
    langOf(proof),
  ]);
  const W = SHELL_WORDS[lang], L = (text: string) => navLabel(text, lang);
  const words = wordPreset(brand.words).en;
  const navigation = navigationForRole(session.role, payroll, { operational, modules: brand.modules, words, ownerAdvisorEnabled: readFeatureFlags(process.env).ownerAdvisor, managerAdvisorEnabled: readFeatureFlags(process.env).managerAdvisor });
  const has = (href: string) => navigation.some(entry => entry.href === href);
  const label = (href: string, fallback: string) => L(navigation.find(entry => entry.href === href)?.label ?? fallback);
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
    <CorpNav back={{ href: "/app", label: L("Home") }} title={L("More")} titleId="more-nav-title" phoneOnly />
    <CorpTitle id="more-title" title={L("More")} wide />
    {/* Review Nov 11 (OW-032, TB-016), polish Nov 20, 2026: on tablets and desktop the groups read as one card in the
      812 column and Sign out is that card's last row (owner-b-settings.css); phones keep their separate cards. */}
    <CorpSection ariaLabel={W.you}><CorpCard as="div">
      <CorpRows label={W.you}><li><CorpRow href="/app/profile" bold title={name} detail={<Dotted text={[owner ? W.roles.OWNER : W.roles.MANAGER, ...places, company].join(" · ")} />}
        avatar={<CorpAvatar initials={initialsOf(name)} name={name} />} chevron /></li></CorpRows>
    </CorpCard></CorpSection>
    {/* Owner premium R5: each group is a section, 32px from the next (12px inside one); More's groups need no visible label. */}
    {has("/app/reports") || has("/app/updates") || has("/app/my-pay") || has("/app/ai-manager") ? <CorpSection ariaLabel={W.work}><CorpCard as="div">
      <CorpRows label={W.work}>
        {has("/app/reports") ? row("/app/reports", label("/app/reports", "Insights"), <Suspense fallback={null}><WeekHours proof={proof} timeZone={workspace.timeZone} lang={lang} /></Suspense>) : null}
        {has("/app/updates") ? row("/app/updates", label("/app/updates", "Updates")) : null}
        {/* Your own pay: on a phone More is the only way to it (desktop has it in the account menu too). */}
        {has("/app/my-pay") ? row("/app/my-pay", W.myPay) : null}
        {has("/app/ai-manager") ? row("/app/ai-manager", label("/app/ai-manager", "Rondo AI")) : null}
      </CorpRows>
    </CorpCard></CorpSection> : null}
    <CorpSection ariaLabel={W.settingsAndHelp}><CorpCard as="div">
      <CorpRows label={W.settingsAndHelp}>
        {settings ? row("/app/settings", L("Settings")) : null}
        {billing ? row("/app/billing", L("Plan and billing")) : null}
        {/* A Manager has no Settings; Scheduling rules is theirs to open (it also opens from Schedule). */}
        {!settings && has("/app/schedule/settings") ? row("/app/schedule/settings", L("Scheduling rules")) : null}
        {row("/app/help", W.help)}
      </CorpRows>
    </CorpCard></CorpSection>
    <CorpSection id="more-signout" ariaLabel={W.signOut}><CorpCard as="div">
      <PortalSignout className="c-more__signout"><button type="submit" className="c-row c-row--one c-more__signout-row"><span className="c-row__icon" aria-hidden="true"><SignOutIcon weight="bold" /></span><span className="c-row__main"><span className="c-row__title">{W.signOut}</span></span></button></PortalSignout>
    </CorpCard></CorpSection>
  </CorpPage>;
}
