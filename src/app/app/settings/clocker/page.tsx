import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { ClockerDeviceManager } from '@/components/clocker-device-manager';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listClockerDevices } from '@/lib/clocker/devices.server';
import { clockerDeviceView, type ClockerDeviceView, type ClockerLocationView } from '@/lib/clocker/views';
import { listLocations } from '@/lib/data/locations';
import { getWorkspace } from '@/lib/data/workspaces';
import { manageClockerDeviceAction } from './actions';
import { EmptyState, SettingsFrame } from '../wave-c-kit';

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
  if (data) return <ClockerDeviceManager initialDevices={data.devices} timeZone={data.timeZone} locations={data.locations} shortNames={data.shortNames} action={manageClockerDeviceAction} />;
  return <SettingsFrame title="Clocker tablets">
    <section className="nv-card" role="alert" aria-labelledby="clocker-unavailable-title">
      <EmptyState tone="urgent" icon={<WarningCircleIcon size={22} weight="bold" />} titleId="clocker-unavailable-title" title="Couldn’t load Clocker tablets."
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- a retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript
        action={<a className="nv-btn" data-kind="primary" href="/app/settings/clocker">Try again</a>}>
        Tablet details couldn’t be read. No tablets were changed.
      </EmptyState>
    </section>
  </SettingsFrame>;
}
