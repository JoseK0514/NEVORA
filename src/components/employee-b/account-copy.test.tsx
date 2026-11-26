import {describe, expect, it} from '@rstest/core';
import {ACCOUNT_COPY, accountCopy} from './account-copy';
import {notificationHeadline} from '../employee-mobile/notifications-list';
import type {EmployeeNotificationItem} from '../../lib/employee-view';

/* The words on the Employee and Lead account screens exist in English and Puerto Rico Spanish, key for key (signed-in
 * Spanish, Nov 23, 2026: tú and the glossary). */
const en = accountCopy('en'), es = accountCopy('es');
/** Every leaf as [path, text]; a function is called with sample arguments. */
const leaves = (value: unknown, path = ''): [string, string][] => typeof value === 'string' ? [[path, value]]
  : typeof value === 'function' ? [[path, String((value as (...args: unknown[]) => string)('x', 'y'))]]
  : Array.isArray(value) ? value.flatMap((item, index) => leaves(item, `${path}[${index}]`))
  : value && typeof value === 'object' ? Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key)) : [];

describe('account copy', () => {
  it('has the same keys in both languages, at every depth, and no empty string', () => {
    const paths = (lang: 'en' | 'es') => leaves(ACCOUNT_COPY[lang]).map(([path]) => path).sort();
    expect(paths('es')).toEqual(paths('en'));
    for (const [path, text] of [...leaves(en), ...leaves(es)]) expect(text.trim().length, path).toBeGreaterThan(0);
    for (const [path, value] of leaves(en)) expect(typeof value, path).toBe('string');
  });
  it('the Spanish entries are not the English ones', () => {
    const english = new Map(leaves(en));
    /** Punctuation-only joins and product names read the same in both languages. */
    const same = (text: string) => /^[\s.,·]*$/.test(text) || ['Passkeys'].includes(text);
    for (const [path, text] of leaves(es)) if (!same(text)) expect(text, path).not.toBe(english.get(path));
    expect(es.shifts(1)).toBe('1 turno');expect(es.shifts(0)).toBe('Sin turnos para ti');expect(en.shifts(3)).toBe('3 shifts');
  });
  it('the Spanish uses tú and the glossary', () => {
    const spanish = leaves(es).map(([, text]) => text).join('\n');
    expect(spanish).not.toMatch(/\b(usted|su gerente|Confirme|Envíe|Active o desactive|tiempo libre)\b/i);
    expect(es.timeOffApproved).toBe('Días libres aprobados');expect(es.scheduleConfirmWeek('9 nov')).toBe('Confirma la semana del 9 nov');
    expect(es.calloutApproved).toContain('No puedo trabajar'.toLowerCase());expect(es.updateShared).toBe('Nuevo aviso del equipo');
    expect(es.payStatementShared).toBe('Comprobante de pago compartido');expect(es.swapApproved).toBe('Cambio de turno aprobado');
    expect(es.common.signIn).toBe('Iniciar sesión');expect(es.signOut).toBe('Cerrar sesión');
  });
  it('follows the copy rules: no exclamation marks, em dashes or filler', () => {
    for (const [path, text] of [...leaves(en), ...leaves(es)]) expect(text, path).not.toMatch(/[!¡—]|\bsimply\b|\bjust\b|successfully|Oops/i);
  });
  it('a Spanish notification headline carries no English word from the copy', () => {
    const item = (extra: Partial<EmployeeNotificationItem>): EmployeeNotificationItem => ({id: 'n', label: 'x', at: '2026-11-05T18:10:00Z', href: '/app', reviewState: 'unread', actionState: 'none', ...extra});
    const english = new Set(Object.values(en).filter((value): value is string => typeof value === 'string'));
    for (const eventType of ['SCHEDULE_PUBLISHED', 'TIME_OFF_APPROVED', 'TIME_OFF_DENIED', 'CALLOUT_APPROVED', 'CALLOUT_DENIED', 'SWAP_APPROVED', 'SWAP_DENIED', 'COVERAGE_APPROVED', 'COVERAGE_DENIED', 'PAYROLL_STATEMENT', 'COMMUNICATION', 'AVAILABILITY_REMINDER'])
      expect(english.has(notificationHeadline(item({eventType}), 'es').title), eventType).toBe(false);
    expect(notificationHeadline(item({eventType: 'PAYROLL_STATEMENT'}), 'es').title).toBe('Comprobante de pago compartido');
  });
});

it('Profile no longer says Spanish is limited to the sign-in pages (lead, Nov 23: the choice now applies everywhere)', () => {
  for (const lang of ['en', 'es'] as const) expect(Object.keys(accountCopy(lang).profile)).not.toContain('languageHint');
});
