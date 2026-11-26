import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { pathEnabled } from "@/lib/workspace-presentation/modules";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from '@/lib/auth/session';
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import { currentPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { listLocations } from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { listBreakTypes } from "@/lib/clocker/break-types.server";
import { listClockerDevices } from "@/lib/clocker/devices.server";
import { WholeWordHeading } from "@/components/whole-word-heading";
import { CorpCard, CorpNav, CorpPage, CorpPill, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr/Buildings";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { PaintBrushIcon } from "@phosphor-icons/react/dist/ssr/PaintBrush";
import { ToggleRightIcon } from "@phosphor-icons/react/dist/ssr/ToggleRight";
import { ScrollIcon } from "@phosphor-icons/react/dist/ssr/Scroll";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { CoffeeIcon } from "@phosphor-icons/react/dist/ssr/Coffee";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { DeviceTabletIcon } from "@phosphor-icons/react/dist/ssr/DeviceTablet";
import { PasswordIcon } from "@phosphor-icons/react/dist/ssr/Password";
import { CameraIcon } from "@phosphor-icons/react/dist/ssr/Camera";
import { ClockCountdownIcon } from "@phosphor-icons/react/dist/ssr/ClockCountdown";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { CurrencyDollarIcon } from "@phosphor-icons/react/dist/ssr/CurrencyDollar";
import { CreditCardIcon } from "@phosphor-icons/react/dist/ssr/CreditCard";
import { commerceEnabled } from "@/lib/commerce/access";
import type { ReactNode } from "react";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "./settings-copy";
import "./settings-corp.css";
import "./settings-b.css";
import { copy as hubCopy } from "./page-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].settings }; }

/** The one place for the company's settings (Owner premium A9). Corporate cards with their group's label above them (R5), one-line
 * 15/400 rows, each with its current value. A count of zero says "None yet" instead of a bare 0. Your profile and the
 * notification feed live in More and the top bar, so they are not repeated here. */
export default async function SettingsPage() {
  await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  const lang = await readPageLang(), t = SETTINGS_COPY[lang];
  const payroll = payrollFeatureEnabled() ? await readPayrollCapabilities(proof) : undefined;
  // The Pay row names the pay schedule ("Weekly"), from the effective pay calendar.
  const pay = payroll?.canConfigure ? await currentPayPeriod().catch(() => null) : null;
  const frequency = pay?.frequency ? t.frequency[pay.frequency] : undefined;
  const presentation = await currentPresentation();
  const words = wordPreset(presentation.words)[lang];
  // Each value is a fact the page below already holds; a failed read leaves the value out, never a wrong number.
  const [locations, positions, breakTypes, devices] = await Promise.all([
    listLocations({ includeInactive: false }).catch(() => null),
    listPositions().catch(() => null),
    listBreakTypes({ employeeId: proof.employee.id, sessionTokenHash: proof.sessionTokenHash }).then(rows => rows.filter(row => row.active)).catch(() => null),
    listClockerDevices({ employeeId: proof.employee.id, sessionTokenHash: proof.sessionTokenHash }).catch(() => null),
  ]);
  // Clocker tablets (C2): the same read the page uses. Tablets waiting for setup come first, so the count never says 0
  // while the page lists two; otherwise the number in use; nothing at all reads "Set up".
  const waiting = devices?.filter(device => ["UNREGISTERED", "PENDING", "EXPIRED"].includes(device.state)).length ?? 0;
  const inUse = devices?.filter(device => device.state === "ACTIVE").length ?? 0;
  const tablets = devices === null ? null : waiting ? t.notSetUp(waiting) : inUse || 0;
  const count = (value: number | null | undefined) => value === null || value === undefined ? undefined : value === 0 ? t.noneYet : String(value);
  // Review B1 (NV-247): something waiting ("1 not set up") reads amber; plain counts stay grey.
  // Review B5 (NV-099): every navigation row leads with its Phosphor bold icon in a tinted circle, as on More, Team and Time.
  const icons: Record<string, ReactNode> = { "/app/settings/workspace": <BuildingsIcon weight="bold" />, "/app/settings/locations": <MapPinIcon weight="bold" />, "/app/settings/branding": <PaintBrushIcon weight="bold" />, "/app/settings/features": <ToggleRightIcon weight="bold" />, "/app/settings/company-policies": <ScrollIcon weight="bold" />, "/app/settings/positions": <BriefcaseIcon weight="bold" />, "/app/settings/breaks": <CoffeeIcon weight="bold" />, "/app/settings/time-off": <CalendarMinusIcon weight="bold" />, "/app/schedule/settings": <CalendarCheckIcon weight="bold" />, "/app/settings/clocker": <DeviceTabletIcon weight="bold" />, "/app/settings/clocker/pins": <PasswordIcon weight="bold" />, "/app/settings/clocker/photos": <CameraIcon weight="bold" />, "/app/settings/clocker/matching": <ClockCountdownIcon weight="bold" />, "/app/clocker-recovery?from=settings": <ArrowCounterClockwiseIcon weight="bold" />, "/app/settings/payroll": <CurrencyDollarIcon weight="bold" />, "/app/billing": <CreditCardIcon weight="bold" /> };
  const row = (href: string, title: string, value?: string | number | null, tone: "soft" | "amber" = "soft") => pathEnabled(href, presentation.modules)
    // Review B5 (NV-247, NV-260): something waiting is an amber chip, not grey or amber text.
    ? <li key={href}><CorpRow href={href} title={title} icon={icons[href]} one value={tone === "amber" || value === null || value === undefined ? undefined : typeof value === "number" ? count(value) : value} valueTone="soft"
      trail={tone === "amber" && value !== null && value !== undefined ? <CorpPill tone="amber">{String(value)}</CorpPill> : undefined} chevron /></li> : null;
  return (
    // Settings in Direction B (Nov 23, 2026): c-setb gives the hub the Settings pages' rules (one column on tablets, so a
    // row's title and its value are never cut).
    <CorpPage className="c-settings c-page--narrow c-setb" labelledBy="settings-title" lang={lang === "es" ? "es" : undefined}>
      <CorpNav back={{ href: "/app/more", label: t.more }} title={lang === "es" ? <WholeWordHeading text={t.settings} /> : t.settings} titleId="settings-nav-title" phoneOnly />
      <CorpTitle id="settings-title" title={t.settings} wide />
      <CorpSection id="settings-company" label={t.company}><CorpCard as="div">
        <CorpRows label={t.company}>
          {row("/app/settings/workspace", t.companyProfile)}
          {row("/app/settings/locations", words.locations, locations?.length)}
          {row("/app/settings/branding", t.branding)}
          {row("/app/settings/features", t.featuresAndTerms)}
          {row("/app/settings/company-policies", t.companyPolicies)}
          {/* Review Nov 14 (AR-13, JR-4): the subscription has a way in while the workplace is in good standing. Only where
            this deployment has billing on (the page is closed everywhere else). */}
          {commerceEnabled() ? row("/app/billing", t.planAndBilling) : null}
        </CorpRows>
      </CorpCard></CorpSection>
      <CorpSection id="settings-scheduling" label={t.scheduling}><CorpCard as="div">
        <CorpRows label={t.scheduling}>
          {row("/app/settings/positions", t.positions, positions?.length)}
          {row("/app/settings/breaks", t.breakTypes, breakTypes?.length)}
          {row("/app/settings/time-off", t.timeOffPolicies)}
          {row("/app/schedule/settings", t.schedulingRules)}
        </CorpRows>
      </CorpCard></CorpSection>
      <CorpSection id="settings-clocker" label={t.clocker}><CorpCard as="div">
        <CorpRows label={t.clocker}>
          {row("/app/settings/clocker", hubCopy[lang].tabletsRow, tablets, waiting ? "amber" : "soft")}
          {row("/app/settings/clocker/pins", t.clockerPins)}
          {row("/app/settings/clocker/photos", t.punchPhotos)}
          {row("/app/settings/clocker/matching", t.shiftMatching)}
          {/* Team's "Clocker PIN" row used to open this by mistake (A2); its place is with the other Clocker tools. */}
          {row("/app/clocker-recovery?from=settings", t.clockerRecovery)}
        </CorpRows>
      </CorpCard></CorpSection>
      {payroll?.canConfigure ? <CorpSection id="settings-pay" label={t.pay}><CorpCard as="div">
        <CorpRows label={t.pay}>
          {row("/app/settings/payroll", hubCopy[lang].payrollRow, frequency)}
        </CorpRows>
      </CorpCard></CorpSection> : null}
    </CorpPage>
  );
}
