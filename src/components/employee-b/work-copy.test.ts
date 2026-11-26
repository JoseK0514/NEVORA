import {expect, it} from '@rstest/core';
import {WORK_COPY, workCopy} from './work-copy';

/* Phase 4: every new sentence on the Employee and Lead work screens has an English and a Spanish entry. */
const say = (value: unknown) => typeof value === 'function' ? (value as (...args: unknown[]) => string)('9 AM – 5 PM', 'Main Office') : String(value);

it('has the same keys in English and Spanish, and no Spanish entry is left in English or empty', () => {
  const en = WORK_COPY.en, es = WORK_COPY.es;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(workCopy()).toBe(en);expect(workCopy('es')).toBe(es);
});

it('follows the copy rules: sentence case, no exclamation marks, no em dashes, no filler', () => {
  for (const lang of ['en', 'es'] as const) for (const [key, value] of Object.entries(WORK_COPY[lang])) {
    const text = say(value);
    // This literal moved from the collab component and must keep its original punctuation.
    if (lang === 'en' && key === 'sourcePartlyShown') {
      expect(text).toBe('Partly shown — more records are available');
      continue;
    }
    expect(text, key).not.toMatch(/[!—]|\b(simply|just|seamlessly|successfully|oops)\b/i);
  }
  expect(WORK_COPY.en.shiftEnded('9 AM – 5 PM', 'Main Office')).toBe('Your 9 AM – 5 PM shift has ended. Clock out on the Main Office tablet.');
  expect(WORK_COPY.es.shiftEnded('9 AM – 5 PM', 'Main Office')).toBe('Tu turno de 9 AM – 5 PM terminó. Poncha tu salida en la tableta de Main Office.');
  expect(WORK_COPY.en.leadAll(3)).toBe('You lead all 3');expect(WORK_COPY.es.leadAll(3)).toBe('Lideras los 3');
  // Phase 9: your own clock state once a shift has started with no punch, with how long.
  // Round 2: Home's chip is Requests' own words; Schedule's narrow title and its Confirm chip.
  expect(WORK_COPY.en.needsYourAnswer).toBe('Needs your answer');expect(WORK_COPY.es.needsYourAnswer).toBe('Por responder');
  expect(WORK_COPY.en.whatChanged).toBe('What changed');expect(WORK_COPY.es.whatChanged).toBe('Qué cambió');
  expect(WORK_COPY.en.actionNeeded).toBe('Action needed');expect(WORK_COPY.es.actionNeeded).toBe('Pendiente');
  expect(WORK_COPY.en.notClockedInFor('12 min')).toBe('Not clocked in · 12 min');expect(WORK_COPY.es.notClockedInFor('12 min')).toBe('Sin ponchar · 12 min');
});

it('Signed-in Spanish (Nov 23, 2026): the glossary on Home and Schedule, tú, and English kept as it was', () => {
  const {en, es} = WORK_COPY;
  // Open shift is "Turno disponible"; clocking is "ponchar"; things to do is "Pendientes"; shift lead is "Líder de turno".
  expect(es.openShifts).toBe('Turnos disponibles');expect(es.noOpenShifts).toBe('No hay turnos disponibles');expect(es.openToPickUp(1)).toBe('1 turno disponible para tomar');
  expect(es.clockInOnTablet('Calle Loíza')).toBe('Poncha entrada en la tableta de Calle Loíza');expect(es.thingsToDo).toBe('Pendientes');expect(es.shiftLead).toBe('Líder de turno');
  expect(es.scTimeOff).toBe('Días libres');expect(es.scCallout).toBe('No puedo trabajar');
  for (const value of Object.values(es)) expect(say(value)).not.toMatch(/\b(usted|su|sus)\b/i);
  // English is word for word what the screens said before the move.
  expect(en.openToPickUp(2)).toBe('2 open shifts to pick up');expect(en.noUpcoming).toBe('No upcoming shift. New shifts show here once they’re published.');
  expect(en.dayWorked('Today, Monday, November 23', '8 hours', '8')).toBe('Today, Monday, November 23: 8 hours worked of 8 scheduled');
  expect(en.sourcePartlyShown).toBe('Partly shown — more records are available');expect(en.scheduledPayday).toBe('Scheduled payday');
});

it.each([
  ['1:05 p. m.', 'la'],
  ['1:00 a. m.', 'la'],
  ['11:05 a. m.', 'las'],
  ['12:00 p. m.', 'las'],
])('uses the article for the employee’s recorded clock-in at %s', (time, article) => {
  expect(WORK_COPY.es.stillClockedIn(time)).toBe(`Sigues en turno desde ${article} ${time}`);
  expect(WORK_COPY.es.clockedInAt(time)).toBe(`Ponchaste entrada a ${article} ${time}`);
});

it.each([
  ['1:05 p. m.', 'la'],
  ['1:00 a. m.', 'la'],
  ['11:05 a. m.', 'las'],
  ['12:00 p. m.', 'las'],
])('uses the article for the employee’s recorded clock-in at %s', (time, article) => {
  expect(WORK_COPY.es.stillClockedIn(time)).toBe(`Sigues en turno desde ${article} ${time}`);
});
