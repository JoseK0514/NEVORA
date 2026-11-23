// Signed-in Spanish (es-rest, second release): the report projection's sentences in both languages. The projection keeps
// its English data byte for byte; reportText shows each sentence in the person's language.
import {expect, it} from '@rstest/core';
import {projectReports} from './project';
import {REPORT_COPY, reportText} from './report-copy';

const leaves = (value: unknown, path = ''): [string, string][] => typeof value === 'string' ? [[path, value]]
  : value && typeof value === 'object' ? Object.entries(value).flatMap(([key, inner]) => leaves(inner, `${path}.${key}`)) : [];

it('holds the same keys, and as many definitions, in English and Spanish, each one written', () => {
  const en = new Map(leaves(REPORT_COPY.en));
  expect(leaves(REPORT_COPY.es).map(([path]) => path)).toEqual([...en.keys()]);
  for (const [path, words] of leaves(REPORT_COPY.es)) expect(words, path).not.toBe(en.get(path));
});

it('writes the report sentences in Spanish and leaves other text as it is', () => {
  expect(reportText(REPORT_COPY.en.overtimeReason, 'es')).toBe('Las horas extra necesitan tus reglas de pago y la clasificación de cada empleado. Estas horas no son horas de nómina.');
  expect(reportText('Position not captured', 'es')).toBe('Puesto no registrado');
  expect(reportText('Historical employee', 'es')).toBe('Empleado anterior');
  REPORT_COPY.en.definitions.forEach((sentence, index) => expect(reportText(sentence, 'es')).toBe(REPORT_COPY.es.definitions[index]));
  expect(reportText('Barista', 'es')).toBe('Barista');
  expect(reportText(REPORT_COPY.en.overtimeReason)).toBe(REPORT_COPY.en.overtimeReason);
});

it('keeps the projection’s English data exactly as before', () => {
  const report = projectReports({workspaceId: 'W1', timeZone: 'America/Puerto_Rico', observedAt: '2026-10-05T12:00:00Z', period: {startDate: '2026-09-21', endDate: '2026-09-27'},
    cards: [], schedules: [], requests: [], changes: [], publications: [], attendanceSources: [], publishedWeeks: ['2026-09-14', '2026-09-21']}) as unknown as {
    overtime: {reason: string}; coverageReliability: {definition: string}; scheduleStability: {definition: string}; definitions: string[]};
  expect(report.overtime.reason).toBe('Overtime needs your pay rules and employee classifications. Hours here aren’t payroll hours.');
  expect(report.coverageReliability.definition).toBe('Coverage requests in this period and how many were filled. A count, not a reliability score.');
  expect(report.scheduleStability.definition).toBe('Schedule changes published for this period. No stability score is applied.');
  expect(report.definitions[0]).toBe('Actual time uses D2 canonical effective entries and breaks; finalized cards use their immutable snapshots.');
  expect(report.definitions[5]).toBe('Unavailable policy and incomplete source evidence never become zero or healthy scores.');
  expect(report.definitions).toHaveLength(6);
});
