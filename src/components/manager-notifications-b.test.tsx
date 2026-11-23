import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, rs } from '@rstest/core';
import type { EmployeeNotificationItem } from '../lib/employee-view';
rs.mock('next/link', () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean }) => <a href={href} {...props}>{children}</a> }));
rs.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));
rs.mock('./manager-notifications-b.css', () => ({}));
rs.mock('./employee-b/account.css', () => ({}));
rs.mock('./employee-mobile/account-corp.css', () => ({}));
const read = { state: { snapshot: null as unknown, paused: false, refreshing: true }, refresh: () => undefined };
rs.mock('./employee-account-panel', () => ({ useEmployeeAccountRead: () => read }));
import { ManagerNotifications } from './manager-notifications-b';

const now = new Date().toISOString();
const ready = (items: EmployeeNotificationItem[]) => ({ state: 'ready', kind: 'notifications', observedAt: now, validForMs: 15000, timeZone: 'UTC', coverage: 'complete', items });
const html = () => renderToStaticMarkup(<ManagerNotifications authority="a" />).replace(/ /g, ' ');

// Phase 2 (B3): an Owner's and a Manager's Notifications draw the Lead's and the Employee's screen with their notices.
describe('Manager Notifications (B3, Direction B)', () => {
  it('groups the notices by day in the shared rows, and a summary keeps its past-tense count', () => {
    read.state = { snapshot: ready([
      { id: 'n1', label: 'Operations need review', eventType: 'MANAGER_REVIEW', count: 26, at: now, href: '/app/inbox', reviewState: 'unread', actionState: 'none' },
      { id: 'n2', label: 'Schedule', eventType: 'SCHEDULE_PUBLISHED', count: 5, subject: { kind: 'scheduleWeek', startDate: '2026-11-23', endDate: '2026-11-29' }, at: now, href: '/app/schedule', reviewState: 'read', actionState: 'none' },
    ]), paused: false, refreshing: false };
    const out = html();
    expect(out).toContain('Today');
    expect(out).toContain('26 items were waiting');
    expect(out).not.toMatch(/26 waiting/);
    expect(out).not.toContain('Operations need review');
    expect(out).toContain('href="/app/schedule"');
    // The title appears in the phone hero, the phone bar and the band (one shows per width), and in no row or card.
    expect(out.match(/>Notifications</g)?.length).toBe(3);
  });
  it('with nothing at all, the card leads to Things to do instead of an empty list', () => {
    read.state = { snapshot: ready([]), paused: false, refreshing: false };
    const out = html();
    expect(out).toContain('Requests from your team are in Things to do.');
    expect(out).toContain('href="/app/inbox"');
    expect(out).not.toContain('aria-label="Show notifications"');
  });
  it('a failed read offers Try again with the Lead’s words', () => {
    read.state = { snapshot: { state: 'unavailable', reason: 'read_failed' }, paused: false, refreshing: false };
    const out = html();
    expect(out).toContain('Your notifications couldn’t be checked.');
    expect(out).toContain('Try again');
  });
});
