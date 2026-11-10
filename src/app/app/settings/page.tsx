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
import { CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import "./settings-corp.css";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Settings" };

/** The one place for the company's settings (Owner premium A9). Corporate cards with their group's label above them (R5), one-line
 * 15/400 rows, each with its current value. A count of zero says "None yet" instead of a bare 0. Your profile and the
 * notification feed live in More and the top bar, so they are not repeated here. */
export default async function SettingsPage() {
  await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  const payroll = payrollFeatureEnabled() ? await readPayrollCapabilities(proof) : undefined;
  // The Pay row names the pay schedule ("Weekly"), from the effective pay calendar.
  const pay = payroll?.canConfigure ? await currentPayPeriod().catch(() => null) : null;
  const frequency = pay?.frequency ? ({ WEEKLY: "Weekly", BIWEEKLY: "Every two weeks", SEMIMONTHLY: "Twice a month", MONTHLY: "Monthly" } as const)[pay.frequency] : undefined;
  const presentation = await currentPresentation();
  const words = wordPreset(presentation.words).en;
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
  const tablets = devices === null ? null : waiting ? `${waiting} not set up` : inUse || 0;
  const count = (value: number | null | undefined) => value === null || value === undefined ? undefined : value === 0 ? "None yet" : String(value);
  // Review B1 (NV-247): something waiting ("1 not set up") reads amber; plain counts stay grey.
  const row = (href: string, title: string, value?: string | number | null, tone: "soft" | "amber" = "soft") => pathEnabled(href, presentation.modules)
    ? <li key={href}><CorpRow href={href} title={title} one value={value === null || value === undefined ? undefined : typeof value === "number" ? count(value) : value} valueTone={tone} chevron /></li> : null;
  return (
    <CorpPage className="c-settings c-page--narrow" labelledBy="settings-title">
      <CorpNav back={{ href: "/app/more", label: "More" }} title="Settings" titleId="settings-nav-title" phoneOnly />
      <CorpTitle id="settings-title" title="Settings" wide />
      <CorpSection id="settings-company" label="Company"><CorpCard as="div">
        <CorpRows label="Company">
          {row("/app/settings/workspace", "Company profile")}
          {row("/app/settings/locations", words.locations, locations?.length)}
          {row("/app/settings/branding", "Branding")}
          {row("/app/settings/features", "Features and team terms")}
          {row("/app/settings/company-policies", "Company policies")}
        </CorpRows>
      </CorpCard></CorpSection>
      <CorpSection id="settings-scheduling" label="Scheduling"><CorpCard as="div">
        <CorpRows label="Scheduling">
          {row("/app/settings/positions", "Positions", positions?.length)}
          {row("/app/settings/breaks", "Break types", breakTypes?.length)}
          {row("/app/schedule/settings", "Scheduling rules")}
        </CorpRows>
      </CorpCard></CorpSection>
      <CorpSection id="settings-clocker" label="Clocker"><CorpCard as="div">
        <CorpRows label="Clocker">
          {row("/app/settings/clocker", "Clocker tablets", tablets, waiting ? "amber" : "soft")}
          {row("/app/settings/clocker/pins", "Clocker PINs")}
          {row("/app/settings/clocker/photos", "Punch photos")}
          {/* Team's "Clocker PIN" row used to open this by mistake (A2); its place is with the other Clocker tools. */}
          {row("/app/clocker-recovery?from=settings", "Clocker recovery")}
        </CorpRows>
      </CorpCard></CorpSection>
      {payroll?.canConfigure ? <CorpSection id="settings-pay" label="Pay"><CorpCard as="div">
        <CorpRows label="Pay">
          {row("/app/settings/payroll", "Payroll settings", frequency)}
        </CorpRows>
      </CorpCard></CorpSection> : null}
    </CorpPage>
  );
}
