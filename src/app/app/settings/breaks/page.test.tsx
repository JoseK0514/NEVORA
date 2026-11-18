import { beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = rs.hoisted(() => ({ roles: rs.fn(), proof: rs.fn(), list: rs.fn() }));
rs.mock('@/lib/auth/permissions', () => ({ requireRoles: mocks.roles }));
rs.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: mocks.proof }));
rs.mock('@/lib/clocker/break-types.server', () => ({ listBreakTypes: mocks.list }));
rs.mock('./actions', () => ({ saveBreakTypeAction: rs.fn() }));
import BreakTypesPage from './page';

beforeEach(() => {
  rs.clearAllMocks();
  mocks.roles.mockResolvedValue(undefined);
  mocks.proof.mockResolvedValue({ employee: { id: 'owner' }, sessionTokenHash: 'a'.repeat(64) });
});

it('renders a valid empty catalog with creation available', async () => {
  mocks.list.mockResolvedValue([]);
  const html = renderToStaticMarkup(await BreakTypesPage());
  expect(mocks.roles).toHaveBeenCalledWith(['OWNER']);
  expect(mocks.list).toHaveBeenCalledWith({ employeeId: 'owner', sessionTokenHash: 'a'.repeat(64) });
  expect(html).toContain('No break types yet');
  expect(html).toMatch(/<button type="button" class="wc-addrow">.*Add break type<\/button>/);
  expect(html).not.toContain('role="alert"');
});

// Release 1 (board O-Breaks): archived break types sit in their own Archived card; the row opens the editor with Reactivate.
it('opens on Archived when every break type is archived', async () => {
  mocks.list.mockResolvedValue([{ id: 'rest', name: 'Rest', category: 'REST', targetMinutes: null, active: false, version: 3 }]);
  const html = renderToStaticMarkup(await BreakTypesPage());
  expect(html).toContain('data-break-type="rest"');
  expect(html).toContain('aria-label="Edit Rest"');
  expect(html).toContain('Archived<span class="wc-count c-num">1</span>');
  expect(html).toContain('No active break types');
});

it('does not represent a failed catalog read as an empty editable catalog', async () => {
  mocks.list.mockRejectedValue(Error('database unavailable'));
  const html = renderToStaticMarkup(await BreakTypesPage());
  expect(html).toContain('role="alert"');
  expect(html).not.toContain('aria-label="Configured break types"');
  expect(html).not.toContain('Add break type');
  expect(html).toContain('href="/app/settings/breaks"');
});

it('does not read configuration when Owner authorization fails', async () => {
  mocks.roles.mockRejectedValue(Error('access denied'));
  await expect(BreakTypesPage()).rejects.toThrow('access denied');
  expect(mocks.proof).not.toHaveBeenCalled();
  expect(mocks.list).not.toHaveBeenCalled();
});
