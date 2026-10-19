import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({ roles: vi.fn(), proof: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/auth/permissions', () => ({ requireRoles: mocks.roles }));
vi.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: mocks.proof }));
vi.mock('@/lib/clocker/break-types.server', () => ({ listBreakTypes: mocks.list }));
vi.mock('./actions', () => ({ saveBreakTypeAction: vi.fn() }));
import BreakTypesPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.roles.mockResolvedValue(undefined);
  mocks.proof.mockResolvedValue({ employee: { id: 'owner' }, sessionTokenHash: 'a'.repeat(64) });
});

it('renders a valid empty catalog with creation available', async () => {
  mocks.list.mockResolvedValue([]);
  const html = renderToStaticMarkup(await BreakTypesPage());
  expect(mocks.roles).toHaveBeenCalledWith(['OWNER']);
  expect(mocks.list).toHaveBeenCalledWith({ employeeId: 'owner', sessionTokenHash: 'a'.repeat(64) });
  expect(html).toContain('aria-label="Configured break types"');
  expect(html).toContain('Add break type');
  expect(html).not.toContain('role="alert"');
});

it('keeps archived records and their actions in the initial All view', async () => {
  mocks.list.mockResolvedValue([{ id: 'rest', name: 'Rest', category: 'REST', targetMinutes: null, active: false, version: 3 }]);
  const html = renderToStaticMarkup(await BreakTypesPage());
  expect(html).toContain('data-break-type="rest"');
  expect(html).toContain('Reactivate');
  expect(html).toContain('No reference time');
  expect(html).toContain('aria-pressed="true"');
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
