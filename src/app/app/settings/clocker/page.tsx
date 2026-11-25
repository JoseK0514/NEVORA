import { ClockerDeviceManager, ClockerDevicesUnavailable } from '@/components/clocker-device-manager';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listClockerDevices } from '@/lib/clocker/devices.server';
import { clockerDeviceView, type ClockerDeviceView, type ClockerLocationView } from '@/lib/clocker/views';
import { listLocations } from '@/lib/data/locations';
import { getWorkspace } from '@/lib/data/workspaces';
import { manageClockerDeviceAction } from './actions';
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../settings-copy";
import { readPortalLanguage } from '@/lib/activation/language.server';
import type { ClockerOwnerLang } from '@/components/clocker-owner-copy';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].clockerTablets }; }

export const dynamic = 'force-dynamic';
export default async function ClockerDevicesPage() {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  let data: { devices: ClockerDeviceView[]; locations: ClockerLocationView[]; timeZone: string; shortNames: Record<string, string> } | null;
  try {
    const [devices, locations, workspace] = await Promise.all([
      listClockerDevices({ employeeId: session.employee.id, sessionTokenHash: session.sessionTokenHash }),
      listLocations({ includeInactive: true }), getWorkspace(),
    ]);
    data = {
      devices: devices.map(clockerDeviceView), timeZone: workspace.timeZone,
      locations: locations.map(({ id, name, clockerKey, active }) => ({ id, name, clockerKey, active })),
      // Rows and the location menu say "Condado", as every other page does (Owner premium R7).
      shortNames: Object.fromEntries(locations.filter(location => location.shortName).map(location => [location.id, location.shortName])),
    };
  } catch { data = null; }
  // Clocker UI step 2: the page speaks the Owner's portal language (Profile, then the nv-lang cookie), as the person
  // page's "Clock in at" does (step 1). English when it can't be read.
  let lang: ClockerOwnerLang = 'en';
  try { lang = (await readPortalLanguage(session)).language; } catch { /* English */ }
  if (data) return <ClockerDeviceManager initialDevices={data.devices} timeZone={data.timeZone} locations={data.locations} shortNames={data.shortNames} action={manageClockerDeviceAction} lang={lang} />;
  return <ClockerDevicesUnavailable lang={lang} />;
}
