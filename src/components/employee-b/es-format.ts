/* Signed-in Spanish (Nov 23, 2026): many times and dates reach the Employee screens already formatted in English by the
 * page ("7:00 AM – 3:00 PM", "Mon, Dec 7", "Dec 7 – 13"). These helpers rewrite such a formatted value into the
 * Puerto Rico Spanish forms of docs/design/voice.md ("7:00 a. m. – 3:00 p. m.", "lun, 7 dic", "7–13 dic") when the
 * person reads Spanish, and return the text untouched in English. Names, places and numbers pass through. */
export type FormatLang = 'en' | 'es';

const DAYS: Record<string, string> = {
  Monday: 'lunes', Tuesday: 'martes', Wednesday: 'miércoles', Thursday: 'jueves', Friday: 'viernes', Saturday: 'sábado', Sunday: 'domingo',
  Mon: 'lun', Tue: 'mar', Wed: 'mié', Thu: 'jue', Fri: 'vie', Sat: 'sáb', Sun: 'dom',
};
const MONTHS: Record<string, string> = {
  January: 'enero', February: 'febrero', March: 'marzo', April: 'abril', May: 'mayo', June: 'junio', July: 'julio',
  August: 'agosto', September: 'septiembre', October: 'octubre', November: 'noviembre', December: 'diciembre',
  Jan: 'ene', Feb: 'feb', Mar: 'mar', Apr: 'abr', Jun: 'jun', Jul: 'jul', Aug: 'ago', Sep: 'sep', Sept: 'sep', Oct: 'oct', Nov: 'nov', Dec: 'dic',
};
const MONTH = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const DAY = Object.keys(DAYS).sort((a, b) => b.length - a.length).join('|');

/** "7:00 AM" → "7:00 a. m."; "12 PM" → "12 p. m.". Spacing before AM/PM (plain, no-break or narrow no-break) is kept. */
export function esTime(text: string, lang: FormatLang = 'es'): string {
  if (lang !== 'es') return text;
  return text.replace(/(\d)([   ]?)(AM|PM)\b/g, (_m, digit: string, space: string, half: string) => `${digit}${space || ' '}${half === 'AM' ? 'a. m.' : 'p. m.'}`);
}

/** A formatted English date or range in Spanish: "Mon, Dec 7" → "lun, 7 dic"; "Dec 7 – 13" → "7–13 dic";
 * "Dec 28 – Jan 3, 2027" → "28 dic – 3 ene 2027"; "Today"/"Tomorrow"/"Yesterday" → "Hoy"/"Mañana"/"Ayer". Times in the
 * same text are rewritten too. Unknown words pass through. */
export function esDate(text: string, lang: FormatLang = 'es'): string {
  if (lang !== 'es') return text;
  let out = text;
  // "Dec 7 – 13" (same month) → "7–13 dic"
  out = out.replace(new RegExp(`\\b(${MONTH})\\.? (\\d{1,2}) ?[–-] ?(\\d{1,2})\\b(?!:)`, 'g'), (_m, mon: string, a: string, b: string) => `${a}–${b} ${MONTHS[mon]}`);
  // "Dec 7" → "7 dic" ("Dec 7, 2026" → "7 dic 2026")
  out = out.replace(new RegExp(`\\b(${MONTH})\\.? (\\d{1,2})(?:, (\\d{4}))?\\b(?!:)`, 'g'), (_m, mon: string, d: string, y?: string) => `${d} ${mon.length > 4 ? 'de ' : ''}${MONTHS[mon]}${y ? ` ${y}` : ''}`);
  // A bare month name ("December 2026") → "diciembre 2026"
  out = out.replace(new RegExp(`\\b(${MONTH})\\b`, 'g'), (m: string) => MONTHS[m] ?? m);
  out = out.replace(new RegExp(`\\b(${DAY})\\b`, 'g'), (m: string) => DAYS[m] ?? m);
  out = out.replace(/\bToday\b/g, 'Hoy').replace(/\bTomorrow\b/g, 'Mañana').replace(/\bYesterday\b/g, 'Ayer');
  return esTime(out, lang);
}

/** Both: any formatted English value that may hold a date, a time or both. */
export const esFormatted = (text: string, lang: FormatLang = 'es') => esDate(text, lang);

/** "All day" from the shared time formatter. */
export const esAllDay = (text: string, lang: FormatLang = 'es') => (lang === 'es' && text === 'All day' ? 'Todo el día' : text);

/** The Intl locale for a language. */
export const LOCALE: Record<FormatLang, string> = {en: 'en-US', es: 'es-PR'};
