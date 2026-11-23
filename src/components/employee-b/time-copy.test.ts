import {expect, it} from '@rstest/core';
import {TIME_COPY, timeCopy} from './time-copy';
import {cardStatus, correctionStatus, issueText, kindLabel, statusWord} from '../employee-mobile/hours-model';

/* Signed-in Spanish (Nov 23, 2026): every word on the Employee Time screens has an English and a Spanish entry. */
const say = (value: unknown) => typeof value === 'function' ? (value as (...args: unknown[]) => string)('Condado', 'Ana R.', true) : typeof value === 'string' ? value : JSON.stringify(value);
const SAME = new Set<string>();

it('has the same keys in English and Spanish, and no Spanish entry is empty or left in English', () => {
  const en = TIME_COPY.en, es = TIME_COPY.es;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    if (!SAME.has(key)) expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(timeCopy()).toBe(en);expect(timeCopy('es')).toBe(es);
});

it('reads the shared Time model in Spanish instead of keeping its own word maps, and keeps the copy rules', () => {
  // The words Time shows from the model come back in the person's language (the screen no longer maps English words).
  expect(correctionStatus('REJECTED', 'es').word).not.toBe(correctionStatus('REJECTED').word);
  expect(cardStatus('APPROVED', [], 'es').word).not.toBe(cardStatus('APPROVED', []).word);
  expect(cardStatus('DRAFT', ['period_open'], 'es').open).toBe(true);
  expect(kindLabel('BREAK_BOUNDARY', 'es')).not.toBe(kindLabel.BREAK_BOUNDARY);
  expect(statusWord('PENDING', 'es')).not.toBe(statusWord.PENDING);
  expect(issueText('open_entry', 'es')).not.toBe(issueText.open_entry);
  expect(Object.keys(TIME_COPY.en)).not.toContain('statusWords');
  expect(TIME_COPY.es.shifts(1)).toBe('1 turno');expect(TIME_COPY.es.shifts(3)).toBe('3 turnos');
  for (const lang of ['en', 'es'] as const) for (const [key, value] of Object.entries(TIME_COPY[lang]))
    expect(say(value), key).not.toMatch(/[!—]|\b(simply|just|seamlessly|successfully|oops|usted|su gerente)\b/i);
});
