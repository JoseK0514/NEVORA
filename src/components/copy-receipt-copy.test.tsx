// DEC4 / G4 (Jose, Nov 23, 2026): the Copy receipt's Spanish sits beside its English; the page renders English until a
// per-person language exists, and the view draws every word from the table in either language.
import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import type {CopyReceipt} from '@/lib/data/schedule-copy';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('@/components/schedule-copy-form', () => ({ScheduleCopyForm: ({label}: {label: string}) => createElement('button', {type: 'button'}, label)}));
import {CopyNotFound, CopyReceiptView} from './copy-receipt';
import {RECEIPT_WORDS, esTimes, esWeekRange, esWeekday} from './copy-receipt-copy';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();
const availability = {code: 'AVAILABILITY_NOT_SUBMITTED', message: 'x'};
const row = (id: string, extra: Partial<CopyReceipt['rows'][number]> = {}) => ({sourceId: id, status: 'COMMITTED' as const, reason: null, shiftId: 'c-' + id, warnings: [] as {code: string; message: string}[],
  employeeName: 'Fictional Worker', date: '2026-12-07', startTime: '06:00', endTime: '14:00', locationName: 'Condado', ...extra});
const receipt = (rows: CopyReceipt['rows']): CopyReceipt => ({operationId: 'op', command: {operationId: 'op', kind: 'PREVIOUS_WEEK', weekStart: '2026-12-07'}, rows});

it('has a Spanish entry for every English word, warning and reason', () => {
  const {en, es} = RECEIPT_WORDS;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  expect(Object.keys(es.warnings).sort()).toEqual(Object.keys(en.warnings).sort());
  expect(Object.keys(es.skips).sort()).toEqual(Object.keys(en.skips).sort());
});

it('renders English by default, and the same receipt in Puerto Rico Spanish when asked', () => {
  const r = receipt([row('a', {warnings: [availability]}), row('b', {warnings: [availability], employeeName: 'Second Person', date: '2026-12-08'})]);
  const en = text(renderToStaticMarkup(<CopyReceiptView receipt={r} />));
  expect(en).toContain('Week copied');expect(en).toContain('2 shifts');expect(en).toContain('All with warnings');expect(en).toContain('Availability not confirmed');
  const es = text(renderToStaticMarkup(<CopyReceiptView receipt={r} lang="es" />));
  for (const words of ['Semana copiada', '2 turnos', '7–13 dic', 'Revisar horario', 'Todos con advertencias', 'Disponibilidad sin confirmar', 'lun · 6:00 a. m. – 2:00 p. m.'])
    expect(es).toContain(words);
  for (const english of ['Week copied', 'shifts', 'Review schedule', 'warnings', 'AM', 'PM']) expect(es).not.toContain(english);
});

it('writes Spanish dates and times the voice guide way', () => {
  expect(esWeekday('2026-12-07')).toBe('lun');
  expect(esWeekRange('2026-11-30')).toBe('30 nov – 6 dic');
  expect(esTimes('6:00 AM – 2:00 PM')).toBe('6:00 a. m. – 2:00 p. m.');
  expect(esTimes('6:00\u00a0AM – 2:00\u00a0PM')).toBe('6:00 a. m. – 2:00 p. m.');
  expect(text(renderToStaticMarkup(<CopyNotFound lang="es" />))).toContain('No encontramos la copia');
});
