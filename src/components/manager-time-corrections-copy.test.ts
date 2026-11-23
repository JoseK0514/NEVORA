import {expect, it} from '@rstest/core';
import {MANAGER_TIME_CORRECTIONS_COPY, managerTimeCorrectionsCopy, noticeIn} from './manager-time-corrections-copy';

/* Signed-in Spanish (Nov 23, 2026): the Time corrections queue's words in both languages. */
const say = (value: unknown): string => typeof value === 'function' ? (value as (arg: never) => string)('Avery QA' as never)
  : typeof value === 'object' && value ? Object.values(value).map(say).join('|') : String(value);

it('has the same keys in English and Spanish, and no Spanish entry is empty or left in English', () => {
  const {en, es} = MANAGER_TIME_CORRECTIONS_COPY;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  expect(Object.keys(es.modes).sort()).toEqual(Object.keys(en.modes).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(managerTimeCorrectionsCopy()).toBe(en);expect(managerTimeCorrectionsCopy('es')).toBe(es);
});

it('follows the copy rules and the glossary: tú, Rechazar and Aprobar, no exclamation marks or usted', () => {
  const es = MANAGER_TIME_CORRECTIONS_COPY.es, text = say(es);
  expect(text).not.toMatch(/[!¡]|\busted\b|\bTiempo libre\b|registro de horas/i);
  expect(es.decline).toBe('Rechazar');expect(es.approve).toBe('Aprobar');expect(es.heading).toBe('Solicitudes de corrección');
  expect(es.bandNote('America/Puerto_Rico')).toBe('Correcciones que pidió tu equipo. Las horas originales siempre se guardan. Hora de Puerto Rico.');
  expect(MANAGER_TIME_CORRECTIONS_COPY.en.bandNote('America/Puerto_Rico')).toBe('Fixes your team asked for. Original times are always kept. Times in Puerto Rico time.');
});

it('says a queue notice kept in English in the person’s language, and leaves unknown text as it came', () => {
  const {en, es} = MANAGER_TIME_CORRECTIONS_COPY;
  expect(noticeIn(en.conflict, 'es')).toBe(es.conflict);expect(noticeIn(en.unknownNotice, 'es')).toBe(es.unknownNotice);
  expect(noticeIn(en.conflict, 'en')).toBe(en.conflict);expect(noticeIn('Server text', 'es')).toBe('Server text');
});
