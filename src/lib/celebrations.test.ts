import { describe, expect, it } from 'vitest';
import { decideCelebration, type CelebrationRequest } from './celebrations';

const fresh = { sessionUsed: false, seenKeys: new Set<string>() };
const ok: CelebrationRequest = { kind: 'TIME_OFF_APPROVED', key: 'req-1:v2', serverConfirmed: true };

describe('celebration gate', () => {
  it.each([
    ['allowed, confirmed and fresh', ok, fresh, true, undefined],
    ['unknown or disallowed moment (payroll approval, streaks, money)', { ...ok, kind: 'PAYROLL_APPROVED' }, fresh, false, 'not_allowed'],
    ['streaks never celebrate', { ...ok, kind: 'STREAK' }, fresh, false, 'not_allowed'],
    ['not yet confirmed by the server', { ...ok, serverConfirmed: false }, fresh, false, 'unconfirmed'],
    ['payroll actions by the person doing them', { ...ok, area: 'payroll-action' as const }, fresh, false, 'excluded_area'],
    ['the Clocker', { ...ok, area: 'clocker' as const }, fresh, false, 'excluded_area'],
    ['errors', { ...ok, area: 'error' as const }, fresh, false, 'excluded_area'],
    ['loading and partial states', { ...ok, area: 'loading' as const }, fresh, false, 'excluded_area'],
    ['a missing occurrence key', { ...ok, key: ' ' }, fresh, false, 'no_key'],
    ['the same occurrence again', ok, { sessionUsed: false, seenKeys: new Set(['TIME_OFF_APPROVED:req-1:v2']) }, false, 'already_seen'],
    ['a second moment in one session', { ...ok, kind: 'INBOX_CLEAR', key: '2026-10-16' }, { sessionUsed: true, seenKeys: new Set<string>() }, false, 'session_used'],
  ] as const)('%s', (_name, request, memory, celebrate, reason) => {
    const decision = decideCelebration(request, memory);
    expect(decision.celebrate).toBe(celebrate);
    if (!decision.celebrate) expect(decision.reason).toBe(reason);
  });
});

describe('celebration markup and triggers', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { createElement } = await import('react');
  const { Celebration } = await import('../components/celebration');
  const { approvalCelebration } = await import('../components/employee-home-reviewed');
  it('renders an idle, hidden burst on the server; it only plays after a client claim', () => {
    const html = renderToStaticMarkup(createElement(Celebration, { kind: 'INBOX_CLEAR', eventKey: '2026-10-16', confirmed: true }));
    expect(html).toContain('class="nevora-celebration" data-celebration="INBOX_CLEAR" aria-hidden="true"');
    expect(html).not.toContain('data-playing');
  });
  it('marks only approvals the employee receives', () => {
    const item = (kind: 'TIME_OFF' | 'EXCHANGE' | 'SCHEDULE', label: string) => ({ ref: { kind, id: 'r1', version: 'v3' }, label, href: '/app', required: false, actionable: false, deadlineAt: null, changedAt: '2026-10-16T12:00:00Z' });
    expect(approvalCelebration(item('TIME_OFF', 'Time off approved · Oct 25 – Oct 26, 2026'))).toEqual({ kind: 'TIME_OFF_APPROVED', key: 'r1:v3' });
    expect(approvalCelebration(item('EXCHANGE', 'Coverage approved'))).toEqual({ kind: 'SHIFT_CHANGE_APPROVED', key: 'r1:v3' });
    for (const label of ['Time off denied · Oct 25', 'Time off pending · Oct 25']) expect(approvalCelebration(item('TIME_OFF', label))).toBeNull();
    expect(approvalCelebration(item('EXCHANGE', 'Swap denied'))).toBeNull();
    expect(approvalCelebration(item('SCHEDULE', 'Time off approved'))).toBeNull();
  });
});
