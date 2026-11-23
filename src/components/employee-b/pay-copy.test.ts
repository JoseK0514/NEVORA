import {expect, it} from '@rstest/core';
import {PAY_COPY, payCopy} from './pay-copy';

/* Signed-in Spanish (Nov 23, 2026): every word on the Employee Pay screens has an English and a Spanish entry. The
 * English is the approved pay wording. */
const say = (value: unknown) => typeof value === 'function' ? (value as (...args: unknown[]) => string)('Nov 9–15', 'Friday, November 20, 2026', 'Nov 2–8') : String(value);

it('has the same keys in English and Spanish, and no Spanish entry is empty or left in English', () => {
  const en = PAY_COPY.en, es = PAY_COPY.es;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(payCopy()).toBe(en);expect(payCopy('es')).toBe(es);
});

it('keeps the pay glossary and the copy rules', () => {
  expect(PAY_COPY.es.payStatement).toBe('Comprobante de pago');expect(PAY_COPY.es.pay).toBe('Pago');
  expect(PAY_COPY.en.downloadNote).toBe('Downloaded files may contain personal pay information.');
  for (const lang of ['en', 'es'] as const) for (const [key, value] of Object.entries(PAY_COPY[lang])) {
    expect(say(value), key).not.toMatch(/[!—]|\b(simply|just|seamlessly|successfully|oops|usted|paid|pagado)\b/i);
  }
});
