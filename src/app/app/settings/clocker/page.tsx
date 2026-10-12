import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { ClockerDeviceManager } from '@/components/clocker-device-manager';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listClockerDevices } from '@/lib/clocker/devices.server';
import { clockerDeviceView, type ClockerDeviceView, type ClockerLocationView } from '@/lib/clocker/views';
import { listLocations } from '@/lib/data/locations';
import { getWorkspace } from '@/lib/data/workspaces';
import { manageClockerDeviceAction } from './actions';
import './clocker-devices.css';

export const dynamic = 'force-dynamic';
export default async function ClockerDevicesPage() {
  await requireRoles(['OWNER']);
  const session = await requireSessionMutationProof();
  let data: { devices: ClockerDeviceView[]; locations: ClockerLocationView[]; timeZone: string } | null;
  try {
    const [devices, locations, workspace] = await Promise.all([
      listClockerDevices({ employeeId: session.employee.id, sessionTokenHash: session.sessionTokenHash }),
      listLocations({ includeInactive: true }), getWorkspace(),
    ]);
    data = {
      devices: devices.map(clockerDeviceView), timeZone: workspace.timeZone,
      locations: locations.map(({ id, name, clockerKey, active }) => ({ id, name, clockerKey, active })),
    };
  } catch { data = null; }
  return <div className="configuration-page clocker-devices-page">
    <PageHeader title="Clocker devices" description="A dedicated tablet for every location. Access you control."
      actions={<Link className="button secondary" href="/app/settings">Back to Settings</Link>} />
    {data ? <ClockerDeviceManager initialDevices={data.devices} timeZone={data.timeZone}
      locations={data.locations} action={manageClockerDeviceAction} />
      : <section className="panel"><h2>Device setup is unavailable</h2>
        <p>Clocker device data could not be loaded in this environment. No devices were changed.</p>
        <Link className="button secondary" href="/app/settings/clocker">Try Again</Link></section>}
  </div>;
}
