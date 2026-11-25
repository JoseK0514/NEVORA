import { beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks = rs.hoisted(() => ({ role: rs.fn(), proof: rs.fn(), devices: rs.fn(), locations: rs.fn(), workspace: rs.fn(), lang: rs.fn() }));
rs.mock('@/lib/auth/permissions', () => ({ requireRoles: mocks.role }));
rs.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: mocks.proof }));
rs.mock('@/lib/clocker/devices.server', () => ({ listClockerDevices: mocks.devices }));
rs.mock('@/lib/data/locations', () => ({ listLocations: mocks.locations }));
rs.mock('@/lib/data/workspaces', () => ({ getWorkspace: mocks.workspace }));
rs.mock('./actions', () => ({ manageClockerDeviceAction: rs.fn() }));
rs.mock('@/lib/activation/language.server', () => ({ readPortalLanguage: mocks.lang }));
import ClockerDevicesPage from './page';

beforeEach(() => {
  rs.clearAllMocks();
  mocks.role.mockResolvedValue({ role: 'OWNER' });
  mocks.proof.mockResolvedValue({ employee: { id: 'owner' }, sessionTokenHash: 'fixture-proof' });
  mocks.devices.mockResolvedValue([]);
  mocks.locations.mockResolvedValue([{ id: 'main', name: 'Main Office', clockerKey: 'main', active: true }]);
  mocks.workspace.mockResolvedValue({ timeZone: 'America/Puerto_Rico' });
  mocks.lang.mockResolvedValue({ language: 'en' });
});

it('loads the Owner inventory with live server authority and includes inactive locations for history', async () => {
  const html = renderToStaticMarkup(await ClockerDevicesPage());
  expect(mocks.role).toHaveBeenCalledWith(['OWNER']);
  expect(mocks.devices).toHaveBeenCalledWith({ employeeId: 'owner', sessionTokenHash: 'fixture-proof' });
  expect(mocks.locations).toHaveBeenCalledWith({ includeInactive: true });
  expect(html).toContain('href="/app/settings"');
  expect(html).toContain('data-nv-page=""');
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

// Clocker UI step 2: the page speaks the Owner's portal language; English when it can't be read.
it('speaks the Owner’s portal language, and English when it can’t be read', async () => {
  mocks.lang.mockResolvedValue({ language: 'es' });
  expect(renderToStaticMarkup(await ClockerDevicesPage())).toContain('Tabletas de Clocker');
  expect(mocks.lang).toHaveBeenCalledWith({ employee: { id: 'owner' }, sessionTokenHash: 'fixture-proof' });
  mocks.lang.mockRejectedValue(new Error('no language'));
  expect(renderToStaticMarkup(await ClockerDevicesPage())).toContain('Clocker tablets');
});
