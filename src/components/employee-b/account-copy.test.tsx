import {describe, expect, it} from '@rstest/core';
import {accountCopy} from './account-copy';
import {notificationHeadline} from '../employee-mobile/notifications-list';
import type {EmployeeNotificationItem} from '../../lib/employee-view';

/* Phase 4: the words added for the Employee and Lead account screens exist in English and Spanish, key for key. The
 * signed-in app renders English today; this keeps the Spanish complete for the day a language is stored per person. */
const en = accountCopy('en'), es = accountCopy('es');
const flat = (value: unknown): string[] => typeof value === 'string' ? [value] : typeof value === 'function' ? [String((value as (...args: unknown[]) => string)(2, 'x'))]
  : value && typeof value === 'object' ? Object.values(value).flatMap(flat) : [];

describe('account copy', () => {
  it('has the same keys in both languages and no empty string', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(es.now).sort()).toEqual(Object.keys(en.now).sort());
    for (const text of [...flat(en), ...flat(es)]) expect(text.trim().length).toBeGreaterThan(0);
  });
  it('the Spanish entries are not the English ones', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      if (typeof en[key] === 'string') expect(es[key], key).not.toBe(en[key]);
    }
    expect(es.shifts(1)).toBe('1 turno');expect(es.shifts(0)).toBe('Sin turnos para usted');expect(en.shifts(3)).toBe('3 shifts');
  });
  it('follows the copy rules: no exclamation marks, em dashes or filler', () => {
    for (const text of [...flat(en), ...flat(es)]) expect(text).not.toMatch(/[!—]|\bsimply\b|\bjust\b|successfully|Oops/i);
  });
  it('a Spanish notification headline carries no English word from the copy', () => {
    const item = (extra: Partial<EmployeeNotificationItem>): EmployeeNotificationItem => ({id: 'n', label: 'x', at: '2026-11-05T18:10:00Z', href: '/app', reviewState: 'unread', actionState: 'none', ...extra});
    const english = new Set(Object.values(en).filter((value): value is string => typeof value === 'string'));
    for (const eventType of ['SCHEDULE_PUBLISHED', 'TIME_OFF_APPROVED', 'TIME_OFF_DENIED', 'CALLOUT_APPROVED', 'CALLOUT_DENIED', 'SWAP_APPROVED', 'SWAP_DENIED', 'COVERAGE_APPROVED', 'COVERAGE_DENIED', 'PAYROLL_STATEMENT', 'COMMUNICATION', 'AVAILABILITY_REMINDER'])
      expect(english.has(notificationHeadline(item({eventType}), 'es').title), eventType).toBe(false);
    expect(notificationHeadline(item({eventType: 'PAYROLL_STATEMENT'}), 'es').title).toBe('Comprobante de pago compartido');
  });
});
