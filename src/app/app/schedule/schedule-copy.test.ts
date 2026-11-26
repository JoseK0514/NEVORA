// Signed-in Spanish for Schedule: every English word has a Spanish entry with the same shape, and the date and time
// forms follow docs/design/voice.md.
import { expect, it } from '@rstest/core';
import { SCHEDULE_WORDS, esDayLabel, longDay, shortDay, times, weekRange, zonedDay } from './schedule-copy';

/** Every key path, nested objects included; a function or a string is a leaf, an array is its length. */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return [`${path}[${value.length}]`];
  if (value && typeof value === 'object') return Object.keys(value).sort().flatMap(key => shape((value as Record<string, unknown>)[key], `${path}.${key}`));
  return [`${path}:${typeof value}`];
}

it('has a Spanish entry for every English word, nested tables included', () => {
  const { en, es } = SCHEDULE_WORDS;
  expect(shape(es)).toEqual(shape(en));
  // Functions take the same arguments in both languages.
  const arity = (words: unknown, path = ''): string[] => words && typeof words === 'object'
    ? Object.entries(words).flatMap(([key, value]) => arity(value, `${path}.${key}`))
    : typeof words === 'function' ? [`${path}/${words.length}`] : [];
  expect(arity(es).sort()).toEqual(arity(en).sort());
});

it('keeps Spanish free of exclamation marks and of the English glossary words', () => {
  const all = (value: unknown): string[] => typeof value === 'string' ? [value] : typeof value === 'function' ? [String((value as (...a: unknown[]) => unknown)(2, 2, 2))]
    : value && typeof value === 'object' ? Object.values(value).flatMap(all) : [];
  const spanish = all(SCHEDULE_WORDS.es).join('\n');
  expect(spanish).not.toMatch(/[!¡]/);
  for (const english of ['Owner', 'Schedule', 'Draft', 'Publish', 'shift', 'Usted', 'usted', ' su equipo']) expect(spanish).not.toContain(english);
});

it('pluralises counts in both languages', () => {
  const { en, es } = SCHEDULE_WORDS;
  expect(en.page.drafts(1)).toBe('1 draft'); expect(en.page.drafts(3)).toBe('3 drafts');
  expect(es.page.drafts(1)).toBe('1 borrador'); expect(es.page.drafts(3)).toBe('3 borradores');
  expect(es.page.copiedLong('1', '0', '0')).toBe('Se copió 1 turno de la semana anterior.');
  expect(es.page.copiedLong('4', '2', '1')).toBe('Se copiaron 4 turnos de la semana anterior. 2 turnos se omitieron por conflictos actuales del horario. 1 turno copiado tiene advertencias para el gerente.');
  expect(en.page.copiedLong('4', '1', '0')).toBe('Copied 4 shifts from the previous week. 1 shift skipped because of current scheduling conflicts.');
  expect(es.cover.morePeople(1)).toBe('Falta 1 persona más'); expect(es.cover.morePeople(2)).toBe('Faltan 2 personas más');
  expect(es.templates.applied('1')).toBe('Se aplicó 1 turno.'); expect(en.templates.applied('3')).toBe('Applied 3 shifts.');
});

it('writes dates and times the voice guide way, and leaves English as it was', () => {
  expect(weekRange('2026-12-07')).toBe('Dec 7–13');
  expect(weekRange('2026-12-07', 'es')).toBe('7–13 dic');
  expect(longDay('2026-12-07', 'es')).toBe('lunes, 7 de diciembre');
  expect(longDay('2026-12-07')).toBe('Monday, December 7');
  expect(shortDay('2026-12-07', 'es')).toBe('lun, 7 dic');
  expect(shortDay('2026-12-07')).toBe('Mon, Dec 7');
  expect(esDayLabel('2026-12-09')).toEqual({ weekday: 'mié', day: '9 dic' });
  expect(times('6:00 AM – 2:00 PM', 'es')).toBe('6:00 a. m. – 2:00 p. m.');
  expect(times('All day', 'es')).toBe('Todo el día');
  expect(times('6:00 AM – 2:00 PM')).toBe('6:00 AM – 2:00 PM');
  expect(zonedDay('2026-12-07T13:00:00Z', 'America/Puerto_Rico', 'es', true)).toBe('lun, 7 dic, 9:00 a. m.');
  expect(zonedDay('2026-12-07T13:00:00Z', 'America/Puerto_Rico', 'en', true)).toBe(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Puerto_Rico', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date('2026-12-07T13:00:00Z')));
});
