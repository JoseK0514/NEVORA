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
import { QuietGroup, QuietRow } from "@/components/quiet/quiet";
import { SettingsFrame } from "./wave-c-kit";

/** Quiet (v4, approved Oct 23): three short groups of one-line rows, each with its current value. */
export const metadata = { title: "Settings" };
export default async function SettingsPage() {
  await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  // Shared with the layout's read in this render; a failed read leaves the Pay group out instead of failing Settings.
  const payroll = payrollFeatureEnabled() ? await readPayrollCapabilities(proof).catch(() => undefined) : undefined;
  // Quiet (v4): the Pay row names the pay schedule ("Weekly"), from the effective pay calendar.
  const pay = payroll?.canConfigure ? await currentPayPeriod().catch(() => null) : null;
  const frequency = pay?.frequency ? ({ WEEKLY: "Weekly", BIWEEKLY: "Every two weeks", SEMIMONTHLY: "Twice a month", MONTHLY: "Monthly" } as const)[pay.frequency] : undefined;
  const presentation = await currentPresentation();
  const words = wordPreset(presentation.words).en;
  // Each value is a fact the page below already holds; a failed read leaves the value out, never a wrong number.
  const [locations, positions, breakTypes, devices] = await Promise.all([
    listLocations({ includeInactive: false }).catch(() => null),
    listPositions().catch(() => null),
    listBreakTypes({ employeeId: proof.employee.id, sessionTokenHash: proof.sessionTokenHash }).then(rows => rows.filter(row => row.active)).catch(() => null),
    listClockerDevices({ employeeId: proof.employee.id, sessionTokenHash: proof.sessionTokenHash }).then(rows => rows.filter(row => row.state === 'ACTIVE').length).catch(() => null),
  ]);
  const row = (href: string, title: string, value?: number | string | null) => pathEnabled(href, presentation.modules)
    ? <QuietRow key={href} prefetch href={href} title={title} value={value === null || value === undefined ? undefined : String(value)} tone="l" /> : null;
  return (
    <SettingsFrame back={{ href: "/app/more", label: "More" }} title="Settings">
      <QuietGroup label="Company" id="settings-company"><ul className="q-list">
        {row("/app/settings/workspace", "Company profile")}
        {row("/app/settings/locations", words.locations, locations?.length)}
        {row("/app/settings/branding", "Branding")}
        {row("/app/settings/features", "Features and words")}
        {row("/app/settings/company-policies", "Company policies")}
      </ul></QuietGroup>
      <QuietGroup label="Scheduling" id="settings-scheduling"><ul className="q-list">
        {row("/app/settings/positions", "Positions", positions?.length)}
        {row("/app/settings/breaks", "Break types", breakTypes?.length)}
        {row("/app/settings/clocker", "Clocker devices", devices)}
      </ul></QuietGroup>
      {payroll?.canConfigure ? <QuietGroup label="Pay" id="settings-pay"><ul className="q-list">
        {row("/app/settings/payroll", "Payroll settings", frequency)}
      </ul></QuietGroup> : null}
    </SettingsFrame>
  );
}
