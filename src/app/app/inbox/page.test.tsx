import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const fixture = vi.hoisted(() => ({ directory: vi.fn(), inbox: vi.fn(), role: 'MANAGER' }));
vi.mock('@/lib/auth/session', () => ({ requireSession: async () => ({ id: 'actor', role: fixture.role }), requireSessionMutationProof: async () => ({ employee: { id: 'actor', role: fixture.role } }) }));
vi.mock('@/lib/data/workspaces', () => ({ getWorkspace: async () => ({ timeZone: 'America/Puerto_Rico' }) }));
vi.mock('@/lib/company-access/operational-read.server', () => ({ readOperationalDirectory: fixture.directory }));
vi.mock('@/components/manager-inbox-corp', () => ({ ManagerInboxCorp: (props: Record<string, unknown>) => { fixture.inbox(props); return <p>Things to do</p>; } }));
import InboxPage from './page';
beforeEach(() => { fixture.role = 'MANAGER'; fixture.directory.mockReset(); fixture.inbox.mockClear(); });

// Release 1 (board O-Inbox): rows open the full review; Call and Text live on the person's page, so the page no longer
// reads the company directory's phone numbers (fewer private fields reach the browser).
it('reads no directory phone numbers and passes no contacts', async () => {
  renderToStaticMarkup(await InboxPage());
  expect(fixture.directory).not.toHaveBeenCalled();
  expect(fixture.inbox).toHaveBeenCalledWith(expect.not.objectContaining({ contacts: expect.anything() }));
  expect(fixture.inbox).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'actor', timeZone: 'America/Puerto_Rico' }));
});

// Round 5 (Nov 7, 2026): Owners and Managers see Things to do in the same order as Home's Needs you (coverage first).
it.each(['OWNER', 'MANAGER'])('selects coverage-first presentation for the %s session, as Home does', async role => {
  fixture.role = role;
  renderToStaticMarkup(await InboxPage());
  expect(fixture.inbox).toHaveBeenCalledWith(expect.objectContaining({coverageFirst: true}));
});
