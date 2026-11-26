// The Owner's Clocker settings (Phase 6): one copy module, English and Spanish, key for key.
import {describe, expect, it} from '@rstest/core';
import {clockerOwnerCopy, clockerOwnerWhen} from './clocker-owner-copy';
import {englishIn} from './clocker-owner-copy.testkit';

const {en, es} = clockerOwnerCopy;
const keys = Object.keys(en) as (keyof typeof en)[];
const sample = (value: unknown): string[] => typeof value === 'string' ? [value] : Array.isArray(value) ? value as string[]
  : typeof value === 'function' ? [String((value as (...args: unknown[]) => string)('Maria Rivera', 'Front counter tablet', 3))] : [];

describe('Clocker owner copy', () => {
  it('has a Spanish line for every English key, of the same kind', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const key of keys) {
      expect(typeof es[key], String(key)).toBe(typeof en[key]);
      if (Array.isArray(en[key])) expect((es[key] as string[]).length, String(key)).toBe((en[key] as string[]).length);
      for (const line of sample(es[key])) expect(line.trim(), String(key)).not.toBe('');
    }
  });
  it('translates every sentence: only names stay the same in both languages', () => {
    const same = keys.filter(key => typeof en[key] === 'string' && en[key] === es[key]);
    expect(same).toEqual([]);
  });
  it('keeps the copy rules in both languages: no filler, no exclamation marks, no em dashes, no system words', () => {
    for (const lang of [en, es]) for (const key of keys) for (const line of sample(lang[key])) {
      expect(line, String(key)).not.toMatch(/!|—|\bOops\b|\bsimply\b|\bjust\b|\bseamlessly\b|\bsuccessfully\b|payload|operation id|\bentity\b|\bresource\b/i);
      expect(line, String(key)).not.toMatch(/\b(UNREGISTERED|PENDING|EXPIRED|ACTIVE|REVOKED|REGISTER|ROTATE|REVOKE)\b/);
    }
  });
  it('names the person or the tablet in the words that take one', () => {
    expect(en.pinDoneSet('Maria Rivera')).toBe('PIN set for Maria Rivera. Tell them in person.');
    expect(es.pinDoneSet('Maria Rivera')).toBe('PIN creado para Maria Rivera. Díselo en persona.');
    expect(en.removeTitle('Front counter tablet')).toBe('Remove Front counter tablet?');
    expect(en.ticketTitle('Patio tablet')).toBe('Connect Patio tablet');
    expect(en.pinsNeed(1)).toBe('1 person needs a PIN'); expect(en.pinsNeed(3)).toBe('3 people need a PIN');
    expect(es.pinsNeed(1)).toBe('1 persona necesita un PIN'); expect(es.pinsNeed(3)).toBe('3 personas necesitan un PIN');
  });
  it('never promises what the server did not confirm, and never shows "not confirmed" as failed or saved', () => {
    for (const lang of [en, es]) {
      for (const key of ['notConfirmedBody', 'pinUnknownBody', 'photosNotConfirmed', 'graceNotConfirmed'] as const) expect(lang[key]).not.toMatch(/failed|falló/i);
    }
    expect(en.removeBody).toContain('stops right away'); expect(en.removeBody).toContain('Time already recorded stays');
    expect(en.replaceBody).toContain('stops working right away');
    expect(en.ticketValid('4:05 PM')).toBe('Good until 4:05 PM. It works one time.');
  });
  it('writes a time in the workplace zone for each language', () => {
    expect(clockerOwnerWhen('2026-11-17T20:05:00Z', 'America/Puerto_Rico')).toBe('Nov 17, 4:05 PM');
    expect(clockerOwnerWhen('2026-11-17T20:05:00Z', 'America/Puerto_Rico', 'es')).toMatch(/^17 nov\.?, 4:05 p\.\sm\.$/);
    // Clocker UI step 2: Spanish is the same text on the server and in the browser (fixed words, no ICU day period).
    expect(clockerOwnerWhen('2026-11-17T20:05:00Z', 'America/Puerto_Rico', 'es')).toBe('17\u00A0nov, 4:05\u00A0p.\u00A0m.');
    expect(clockerOwnerWhen('2026-11-17T12:00:00Z', 'America/Puerto_Rico', 'es')).toBe('17\u00A0nov, 8:00\u00A0a.\u00A0m.');
    expect(clockerOwnerWhen('2026-09-03T16:30:00Z', 'America/Puerto_Rico', 'es')).toBe('3\u00A0sept, 12:30\u00A0p.\u00A0m.');
    expect(clockerOwnerWhen('not a date', 'America/Puerto_Rico')).toBe('Time unavailable');
  });
  it('the leak check itself finds an English sentence and ignores a Spanish one', () => {
    expect(englishIn('<p>Add tablet</p>')).toEqual(['addTablet: Add tablet']);
    expect(englishIn('<p>Añadir tableta</p><button aria-label="Administrar Patio">x</button>')).toEqual([]);
  });
});

it('announces singular and plural tablet counts independently', () => {
  expect(es.tabletsCount(1, 0, 2)).toBe('1 conectada, 0 sin configurar, 2 eliminadas');
  expect(es.tabletsCount(2, 0, 1)).toBe('2 conectadas, 0 sin configurar, 1 eliminada');
  expect(es.tabletsCount(0, 1, 0)).toBe('0 conectadas, 1 sin configurar, 0 eliminadas');
  expect(en.tabletsCount(1, 0, 1)).toBe('1 connected, 0 not set up, 1 removed');
});
