import {describe, expect, it} from '@rstest/core';
import {reminderAfter, reminderCopy, reminderTime, reminderWhen} from './copy';

const sample = (value: unknown): string => (typeof value === 'function' ? String((value as (...args: unknown[]) => string)('Ana Colon', 'X')) : String(value));
const numeric = (value: unknown): string => (typeof value === 'function' ? String((value as (...args: unknown[]) => string)(3, 5)) : String(value));

describe('reminder copy', () => {
  const keys = Object.keys(reminderCopy.en) as (keyof typeof reminderCopy.en)[];
  it('has every key in both languages and no Spanish entry left in English', () => {
    expect(Object.keys(reminderCopy.es).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      expect(typeof reminderCopy.es[key]).toBe(typeof reminderCopy.en[key]);
      expect(sample(reminderCopy.es[key]), key).not.toBe(sample(reminderCopy.en[key]));
      expect(sample(reminderCopy.es[key]).trim().length, key).toBeGreaterThan(0);
    }
  });
  it('follows the copy rules: no em dash, no exclamation mark, no filler, no system words', () => {
    for (const lang of ['en', 'es'] as const) for (const key of keys) for (const text of [sample(reminderCopy[lang][key]), numeric(reminderCopy[lang][key])]) {
      expect(text, `${lang}.${key}`).not.toMatch(/[—!¡]|\b(simply|just|seamlessly|successfully|oops|payload|operation id|entity|resource|simplemente|exitosamente)\b/i);
      expect(text, `${lang}.${key}`).not.toMatch(/outcome_unknown|already_queued|activation_held|access_denied|module_off/);
    }
  });
  it('never calls a queue receipt sent or delivered', () => {
    for (const lang of ['en', 'es'] as const) for (const key of ['queued', 'alreadyQueued'] as const) expect(reminderCopy[lang][key]).not.toMatch(/sent|delivered|enviad|entregad/i);
    expect(reminderCopy.en.queuedAt('3:02 PM')).toBe('Reminder queued · 3:02 PM');
    expect(reminderCopy.es.queuedAt('3:02 PM')).toBe('Recordatorio en cola · 3:02 PM');
    expect(reminderCopy.en.resultsSummary(2, 3)).toBe('2 of 3 queued. Queued is not delivered.');
  });
  it('says plainly that nothing was sent where access stops the reminder (manual Owner help)', () => {
    for (const key of ['noAccessManager', 'noAccessOwner', 'signedOut', 'stale'] as const) {
      expect(reminderCopy.en[key]).toContain('Nothing was sent.');
      expect(reminderCopy.es[key]).toContain('No se envió nada.');
    }
    expect(reminderCopy.en.noAccessManager).toContain('Ask your workplace Owner to review your access.');
  });
  it('formats times in the workplace zone, in both languages', () => {
    const now = new Date('2026-11-17T15:00:00.000Z');
    expect(reminderTime('2026-11-17T19:02:00.000Z', 'America/Puerto_Rico')).toBe('3:02 PM');
    expect(reminderTime('2026-11-17T19:02:00.000Z', 'America/Puerto_Rico', 'es')).toBe('3:02 p. m.');
    expect(reminderWhen('2026-11-18T01:00:00.000Z', 'America/Puerto_Rico', 'en', now)).toBe('today, 9:00 PM');
    expect(reminderWhen('2026-11-18T11:00:00.000Z', 'America/Puerto_Rico', 'en', now)).toBe('tomorrow, 7:00 AM');
    expect(reminderWhen('2026-11-20T21:00:00.000Z', 'America/Puerto_Rico', 'en', now)).toBe('Fri, Nov 20, 5:00 PM');
    expect(reminderWhen('2026-11-18T11:00:00.000Z', 'America/Puerto_Rico', 'es', now)).toBe('mañana, 7:00 a. m.');
    expect(reminderAfter('2026-11-18T01:00:00.000Z', 'America/Puerto_Rico', 'en', now)).toBe('today after 9:00 PM');
    expect(reminderAfter('2026-11-19T01:00:00.000Z', 'America/Puerto_Rico', 'en', now)).toBe('tomorrow after 9:00 PM');
    expect(reminderAfter('2026-11-21T01:00:00.000Z', 'America/Puerto_Rico', 'en', now)).toBe('Fri, Nov 20 after 9:00 PM');
    expect(reminderAfter('2026-11-18T01:00:00.000Z', 'America/Puerto_Rico', 'es', now)).toBe('hoy después de las 9:00 p. m.');
    expect(reminderAfter('2026-11-21T01:00:00.000Z', 'America/Puerto_Rico', 'es', now)).toMatch(/^el vie, 20 (de )?nov\.? después de las 9:00 p\. m\.$/);
  });
});
