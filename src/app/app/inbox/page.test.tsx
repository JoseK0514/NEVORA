import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const fixture = vi.hoisted(() => ({ directory: vi.fn(), inbox: vi.fn(), role: 'MANAGER' }));
vi.mock('@/lib/auth/session', () => ({ requireSession: async () => ({ id: 'actor', role: fixture.role }), requireSessionMutationProof: async () => ({ employee: { id: 'actor', role: fixture.role } }) }));
vi.mock('@/lib/data/workspaces', () => ({ getWorkspace: async () => ({ timeZone: 'America/Puerto_Rico' }) }));
vi.mock('@/lib/company-access/operational-read.server', () => ({ readOperationalDirectory: fixture.directory }));
vi.mock('@/components/manager-inbox', () => ({ ManagerInbox: (props: Record<string, unknown>) => { fixture.inbox(props); return <p>Inbox</p>; } }));
import InboxPage from './page';
beforeEach(() => { fixture.role = 'MANAGER'; fixture.directory.mockReset(); fixture.inbox.mockClear(); });
it('retains company-directory authority and lifetime with active contact numbers', async () => {
  const observation = { authority: 'current-company', observedAt: '2026-10-21T12:00:00Z', validForMs: 15000 };
  fixture.directory.mockResolvedValue({ state: 'ready', ...observation, data: { mode: 'COMPANY', employees: [{ id: 'active', active: true, phone: '2025550141' }, { id: 'inactive', active: false, phone: '2025550142' }] } });
  renderToStaticMarkup(await InboxPage());
  expect(fixture.inbox).toHaveBeenCalledWith(expect.objectContaining({ contacts: { observation, phones: { active: '2025550141' } } }));
});
it.each(['scoped', 'unavailable', 'failed'])('withholds contact numbers when the directory is %s', async mode => {
  if (mode === 'failed') fixture.directory.mockRejectedValue(Error('Unavailable'));
  else fixture.directory.mockResolvedValue(mode === 'scoped' ? { state: 'ready', data: { mode: 'LOCATIONS' } } : { state: 'unavailable', reason: 'read_failed' });
  renderToStaticMarkup(await InboxPage());
  expect(fixture.inbox).toHaveBeenCalledWith(expect.objectContaining({ contacts: undefined }));
});

it.each(['OWNER', 'MANAGER'])('selects coverage-first presentation only for the actual %s session', async role => {
  fixture.role = role;
  fixture.directory.mockResolvedValue({state: 'unavailable'});
  renderToStaticMarkup(await InboxPage());
  expect(fixture.inbox).toHaveBeenCalledWith(expect.objectContaining({coverageFirst: role === 'OWNER'}));
});
