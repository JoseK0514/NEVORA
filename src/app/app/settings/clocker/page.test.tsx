import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks = vi.hoisted(() => ({ role: vi.fn(), proof: vi.fn(), devices: vi.fn(), locations: vi.fn(), workspace: vi.fn() }));
vi.mock('@/lib/auth/permissions', () => ({ requireRoles: mocks.role }));
vi.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: mocks.proof }));
vi.mock('@/lib/clocker/devices.server', () => ({ listClockerDevices: mocks.devices }));
vi.mock('@/lib/data/locations', () => ({ listLocations: mocks.locations }));
vi.mock('@/lib/data/workspaces', () => ({ getWorkspace: mocks.workspace }));
vi.mock('./actions', () => ({ manageClockerDeviceAction: vi.fn() }));
import ClockerDevicesPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role.mockResolvedValue({ role: 'OWNER' });
  mocks.proof.mockResolvedValue({ employee: { id: 'owner' }, sessionTokenHash: 'fixture-proof' });
  mocks.devices.mockResolvedValue([]);
  mocks.locations.mockResolvedValue([{ id: 'main', name: 'Main Office', clockerKey: 'main', active: true }]);
  mocks.workspace.mockResolvedValue({ timeZone: 'America/Puerto_Rico' });
});

it('loads the Owner inventory with live server authority and includes inactive locations for history', async () => {
  const html = renderToStaticMarkup(await ClockerDevicesPage());
  expect(mocks.role).toHaveBeenCalledWith(['OWNER']);
  expect(mocks.devices).toHaveBeenCalledWith({ employeeId: 'owner', sessionTokenHash: 'fixture-proof' });
  expect(mocks.locations).toHaveBeenCalledWith({ includeInactive: true });
  expect(html).toContain('href="/app/settings"');
  expect(html).toContain('class="configuration-page clocker-devices-page"');
});

it('denies access before loading device or location data', async () => {
  mocks.role.mockRejectedValue(new Error('Access denied'));
  await expect(ClockerDevicesPage()).rejects.toThrow('Access denied');
  expect(mocks.proof).not.toHaveBeenCalled();
  expect(mocks.devices).not.toHaveBeenCalled();
  expect(mocks.locations).not.toHaveBeenCalled();
});

it('does not render a fictional empty inventory when device retrieval fails', async () => {
  mocks.devices.mockRejectedValue(new Error('database unavailable'));
  const html = renderToStaticMarkup(await ClockerDevicesPage());
  expect(html).toContain('href="/app/settings/clocker"');
  expect(html).not.toContain('aria-label="Device overview"');
  expect(html).not.toContain('data-clocker-device=');
  expect(html).not.toContain('database unavailable');
});
