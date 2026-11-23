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
  expect(html).toContain('class="c-page c-page--narrow c-setb"');
  expect(html).toMatch(/<button id="break-add" type="button" class="c-btn">Add break type<\/button>/);
  expect(html).not.toContain('role="alert"');
});

// Release 1 (board O-Breaks): archived break types sit in their own Archived card; the row opens the editor with Reactivate.
it('opens on Archived when every break type is archived', async () => {
  mocks.list.mockResolvedValue([{ id: 'rest', name: 'Rest', category: 'REST', targetMinutes: null, active: false, version: 3 }]);
  const html = renderToStaticMarkup(await BreakTypesPage());
  expect(html).toContain('id="break-type-rest"');
  // Screen-reader names match the visible text: no aria-label on the rows.
  expect(html).not.toMatch(/id="break-type-rest"[^>]*aria-label/);
  expect(html).toMatch(/<h2 class="c-card__label" id="break-types-archived-label">Archived.*1<\/span><\/h2>/);
  expect(html).toContain('No active break types');
  expect(html).toContain('Changes apply to new breaks only.');
});

it('does not represent a failed catalog read as an empty editable catalog', async () => {
  mocks.list.mockRejectedValue(Error('database unavailable'));
  const html = renderToStaticMarkup(await BreakTypesPage());
  expect(html).toContain('role="alert"');
  expect(html).toContain('Couldn’t load break types.');
  expect(html).toContain('The settings couldn’t be read. Existing break records haven’t changed.');
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
