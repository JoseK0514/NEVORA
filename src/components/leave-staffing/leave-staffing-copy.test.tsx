// Signed-in Spanish (es-rest): the leave and staffing notes carry every word in both languages, and the Spanish shift line
// is written from the same facts as the English one.
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/navigation', () => ({useRouter: () => ({refresh() {}})}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import type {StaffingConflict} from '@/lib/time-off-staffing/model';
import {LEAVE_STAFFING_COPY} from './leave-staffing-copy';
import {LeaveConflictCheck} from './conflict-check';

const keys = (value: object): string[] => Object.entries(value).flatMap(([key, inner]) =>
  inner && typeof inner === 'object' ? keys(inner).map(child => `${key}.${child}`) : [key]).sort();
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();
const conflict = {id: 'c1', requestId: 'r1', state: 'approval_conflict', employeeId: 'e1', employeeName: 'Maria Rivera', ownerEmployeeId: null, reviewedAt: null,
  employeeInstruction: 'awaiting_decision', publicationId: 'p1', revisionNumber: 1, shiftId: 's1', locationId: 'l1', locationName: 'Condado',
  date: '2026-11-12', startTime: '07:00', endTime: '15:00', overlapMinutes: 480, overlapDates: ['2026-11-12']} satisfies StaffingConflict;

it('has a Spanish entry for every English one', () => {
  expect(keys(LEAVE_STAFFING_COPY.es)).toEqual(keys(LEAVE_STAFFING_COPY.en));
});

it('writes the shift, what approving does and the total in Spanish', () => {
  const {en, es} = LEAVE_STAFFING_COPY;
  expect(en.shift(conflict)).toBe('Thu, Nov 12 · 7:00 AM – 3:00 PM · Condado');
  expect(es.shift(conflict)).toBe('jue, 12 nov · 7:00 a. m. – 3:00 p. m. · Condado');
  expect(es.consequence(conflict)).toBe('El turno completo (8 h) necesitaría a otra persona');
  expect(es.total([conflict])).toBe('8 h en 1 turno');
  expect(es.fillShift('Maria Rivera')).toBe('Cubrir el turno de Maria Rivera');
});

it('draws the conflict check in Spanish', () => {
  const es = text(renderToStaticMarkup(<PortalLangProvider lang="es"><LeaveConflictCheck request={{id: 'r1', startDate: '2026-11-12', endDate: '2026-11-12'}} employeeName="Maria Rivera" /></PortalLangProvider>));
  expect(es).toContain('Turnos publicados');
  expect(es).not.toContain('Published shifts');
});
