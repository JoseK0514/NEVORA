// Signed-in Spanish (Nov 23, 2026): the Timecards table has the same keys in English and Spanish, every Spanish entry is
// filled, and the Spanish follows the glossary (docs/design/voice.md) and the time form "8:00 a. m.".
import {describe, expect, it} from '@rstest/core';
import {TIMECARDS_COPY} from './timecards-copy';

const keys = (value: unknown, prefix = ''): string[] => value && typeof value === 'object'
  ? Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => [`${prefix}${key}`, ...keys(inner, `${prefix}${key}.`)])
  : [];

describe('Timecards copy', () => {
  it('has the same keys in English and Spanish', () => {
    expect(keys(TIMECARDS_COPY.es).sort()).toEqual(keys(TIMECARDS_COPY.en).sort());
    for (const [key, value] of Object.entries(TIMECARDS_COPY.en)) expect(typeof TIMECARDS_COPY.es[key as keyof typeof TIMECARDS_COPY.es]).toBe(typeof value);
  });
  it('writes Spanish with the glossary and tú', () => {
    const es = TIMECARDS_COPY.es;
    expect(es.timecard).toBe('Tarjeta de tiempo');
    expect(es.status('Clocked in now')).toBe('En turno ahora');
    expect(es.issue.pending_correction).toBe('Corrección pendiente de revisión');
    expect(es.times('7:00 AM – 3:00 PM')).toBe('7:00 a. m. – 3:00 p. m.');
    expect(es.blockedWhy(es.approveVerb, 'correction')).toBe('Aprueba cuando se revise la corrección pendiente.');
    const all = JSON.stringify(Object.values(es).filter(value => typeof value === 'string'));
    expect(all).not.toMatch(/\b(usted|su gerente|timecard|Owner)\b/);
  });
  it('keeps English wording as it was', () => {
    const en = TIMECARDS_COPY.en;
    expect(en.status('Clocked in now')).toBe('Clocked in now');
    expect(en.times('7:00 AM – 3:00 PM')).toBe('7:00 AM – 3:00 PM');
    expect(en.blockedWhy(en.approveVerb, 'correction')).toBe('Approve after the waiting correction is reviewed.');
    expect(en.countLine(12, true, 'week')).toBe('12 timecards this week.');
  });
});
