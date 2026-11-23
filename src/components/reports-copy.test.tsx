import { createElement, type ComponentProps, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, rs } from '@rstest/core';
import { projectReports } from '@/lib/reports/project';
import { PortalLangProvider } from '@/lib/i18n/portal-lang';
import { REPORTS_COPY } from './reports-copy';

rs.mock('next/link', () => ({ default: ({ href, children, prefetch: _p, ...props }: ComponentProps<'a'> & { prefetch?: boolean }) => createElement('a', { href, ...props }, children) }));
const { CorpReportsView, QuietReportsView, Reports, ReportsView } = await import('./reports');

/** Every key path of a copy table, with each function called on sample arguments. */
function leaves(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'function') {
    const out = (value as (...args: unknown[]) => unknown)(...(path.endsWith('change') ? ['coverage', 'filled'] : path.endsWith('zone') ? ['America/Puerto_Rico'] : /columns|underPlan|overPlan|ofPlanned/.test(path) ? ['Hours'] : [2, 3]));
    return [[path, String(out)]];
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => leaves(item, `${path}[${index}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
  return [[path, String(value)]];
}
// Values that may read the same in both languages (the locale is a code, not words).
const SAME = new Set(['locale']);

describe('Insights copy (Rondo Spanish, G98)', () => {
  it('has the same keys in English and Spanish, nested objects included', () => {
    expect(leaves(REPORTS_COPY.es).map(([path]) => path)).toEqual(leaves(REPORTS_COPY.en).map(([path]) => path));
  });
  it('writes every value, functions included, in both languages, and no Spanish value is left in English', () => {
    const en = new Map(leaves(REPORTS_COPY.en));
    for (const [path, words] of leaves(REPORTS_COPY.es)) {
      expect(words.trim().length, path).toBeGreaterThan(0);
      expect(en.get(path)?.trim().length, path).toBeGreaterThan(0);
      if (!SAME.has(path)) expect(words, path).not.toBe(en.get(path));
    }
  });
  it('agrees shift-change words with their noun in Spanish', () => {
    expect(REPORTS_COPY.es.change('coverage', 'filled')).toBe('Solicitud de cobertura cubierta');
    expect(REPORTS_COPY.es.change('older', 'sent')).toBe('Cambio de turno anterior enviado');
    expect(REPORTS_COPY.en.change('swap', 'approved')).toBe('Shift trade approved');
  });
});

// A fictional week: one person, one 8 h entry, one filled cover request.
const period = { startDate: '2026-09-21', endDate: '2026-09-27' };
const day = '2026-09-22';
const card = { employeeId: 'E1', employeeName: 'Ana Rivera', timeZone: 'America/Puerto_Rico', ...period, pendingCorrections: 0, corrections: [], entries: [{ id: 'T1', locationId: 'L1', locationName: 'Condado', positionId: 'P1', positionName: 'Barista', sourceKind: 'RECORDED', adjustmentId: null, recordedVersion: 1, startAt: `${day}T12:00:00Z`, endAt: `${day}T20:00:00Z`, rawStartAt: `${day}T12:00:00Z`, rawEndAt: `${day}T20:00:00Z`, breaks: [] }] };
const report = projectReports({ workspaceId: 'W1', timeZone: 'America/Puerto_Rico', observedAt: '2026-10-05T12:00:00Z', period, cards: [{ source: card, sourceHash: 'a'.repeat(32), revision: 0, state: 'DRAFT', history: [] }], schedules: [], requests: [], changes: [{ id: 'C1', requestId: 'X1', requestKind: 'EXCHANGE', eventKind: 'COMPLETED', requestRevision: 1, createdAt: `${day}T21:00:00Z`, sourceDate: day, employeeId: 'E1', outcomeMode: 'AUTOMATIC', kind: 'COVERAGE' }], publications: [], attendanceSources: [], publishedWeeks: ['2026-09-14', '2026-09-21'] });
const spanish = (node: ReactNode) => renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>).replace(/[  ]/g, ' ');

describe('Insights in Spanish (Rondo Spanish, G98)', () => {
  it('writes the page frame, periods and Export in Spanish', () => {
    const html = spanish(createElement(Reports, { initialPeriod: period, today: '2026-09-27' }));
    for (const words of ['Informes', 'Esta semana', 'Semana pasada', 'Exportar', 'Descargar CSV', 'Imprimir / Guardar PDF', 'Informes anuales', 'Horas para el bono de Navidad', 'Todas las localidades', 'Cargando…', 'Actualizar', '21–27 sept 2026'])
      expect(html).toContain(words);
    for (const english of ['Insights', 'Last week', 'Export', 'Download CSV', 'Yearly reports', 'All locations', 'Refresh']) expect(html).not.toContain(`>${english}<`);
  });
  it('writes the board cards in Spanish, with es-PR days and the zone', () => {
    const html = spanish(createElement(CorpReportsView, { report, state: 'ready' }));
    for (const words of ['Horas trabajadas', 'Asistencia', 'Días libres', 'Horas por día', 'Cómo contamos', 'Estas no son horas de nómina.', 'Hora de Puerto Rico', 'Al ']) expect(html).toContain(words);
    for (const english of ['Hours worked', 'Attendance', 'How we count', 'Puerto Rico time', 'As of']) expect(html).not.toContain(english);
  });
  it('writes the printed report and the Quiet figures in Spanish', () => {
    const printed = spanish(createElement(ReportsView, { report, state: 'ready' }));
    for (const words of ['Tiempo registrado por día', 'Horas por persona', 'Detalles del período', 'Programado y registrado', 'Horas por localidad', 'Notas de entradas', 'Cambios de turno y cobertura', 'Solicitud de cobertura cubierta', 'Estado de aprobación', 'Borrador', 'Definiciones del informe', 'mar, 22 sept'])
      expect(printed).toContain(words);
    for (const english of ['Hours by person', 'Period details', 'Coverage request filled', 'Approval status', 'Draft']) expect(printed).not.toContain(english);
    const quiet = spanish(createElement(QuietReportsView, { report, state: 'ready' }));
    expect(quiet).toContain('Personas sin tiempo');expect(quiet).toContain('Cómo se cuentan');expect(quiet).not.toContain('Time off taken');
  });
  it('writes the state cards in Spanish', () => {
    const html = spanish(createElement(CorpReportsView, { report: null, state: 'access_lost' }));
    expect(html).toContain('Tu sesión terminó');expect(html).toContain('Iniciar sesión');expect(html).not.toContain('Sign in');
  });
});
