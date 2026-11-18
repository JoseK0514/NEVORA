import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks = vi.hoisted(() => ({ role: vi.fn(), read: vi.fn() }));
vi.mock('@/lib/auth/permissions', () => ({ requireRoles: mocks.role }));
vi.mock('./actions', () => ({ readClockerGraceAction: mocks.read, saveClockerGraceAction: vi.fn() }));
vi.mock('@/components/clocker-owner-b.css', () => ({}));
vi.mock('@/components/clocker-schedule-grace.css', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => '/app/settings/clocker/matching' }));
import ClockerMatchingPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role.mockResolvedValue({ role: 'OWNER' });
  mocks.read.mockResolvedValue({ state: 'available', setting: { earlyClockInGraceMinutes: 10, version: 2 } });
});

it('is an Owner page in the Settings frame showing the saved grace', async () => {
  const html = renderToStaticMarkup(await ClockerMatchingPage());
  expect(mocks.role).toHaveBeenCalledWith(['OWNER']);
  expect(html).toContain('href="/app/settings"');
  expect(html).toContain('Shift matching');
  expect(html).toMatch(/<input[^>]*id="clocker-grace-minutes"[^>]*value="10"/);
});
it('denies access before reading the setting', async () => {
  mocks.role.mockRejectedValue(new Error('Access denied'));
  await expect(ClockerMatchingPage()).rejects.toThrow('Access denied');
  expect(mocks.read).not.toHaveBeenCalled();
});
it('shows the error card, never a fictional 0, when the setting cannot be read', async () => {
  mocks.read.mockResolvedValue({ state: 'unavailable', message: 'Shift matching could not be confirmed.' });
  const html = renderToStaticMarkup(await ClockerMatchingPage());
  expect(html).toContain('Couldn’t load shift matching');
  expect(html).not.toContain('clocker-grace-minutes');
});
