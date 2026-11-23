import type {ActionItem} from './project';
import {isStaffingRepair,repairPerson,repairTitle,repairWhen} from '../time-off-staffing/present';
import {concernsActor} from './review-routing';
import {reviewCopy} from '@/components/review-details/copy';
import {dateRange} from '../duration-format';

/* Phase 7: how an action center item reads on Home and in the Inbox.
 * Display only. The server's item (and the notifications built from it) is unchanged;
 * this rewrites wording to the product rules: names first, no "missing", one name
 * per thing, and time ranges that never break inside themselves. */

const NBSP = ' ', NBHY = '‑';
const WAITING = / is waiting for review\.?$/;

/** "8:00 AM–4:00 PM" → "8:00 AM – 4:00 PM", with the times kept whole. The one time format (Nov 23, 2026): a range
 * that ends or starts at "midnight" reads "12:00 AM" there, and "noon" "12:00 PM", like every other time. */
export function spacedRanges(text: string) {
  const word = (value: string) => value.toLowerCase() === 'noon' ? '12:00 PM' : '12:00 AM';
  return text
    .replace(/([AP]M)\s*[–-]\s*(midnight|noon)\b/gi, (_, mark: string, end: string) => `${mark} – ${word(end)}`)
    .replace(/\b(midnight|noon)\s*[–-]\s*(?=\d)/gi, (_, start: string) => `${word(start)} – `)
    .replace(/(\d{1,2}:\d{2}) ([AP]M)/g, `$1${NBSP}$2`)
    .replace(/(\d{1,2}:\d{2} [AP]M)\s*[–-]\s*/g, `$1${NBSP}– `);
}

/** TC-P3-19: "2026-10-19–2026-10-25" → "Oct 19–25" (the app's one date-range form, each date whole); a plain ISO date
 * reads "Oct 19". */
const isoDay = (iso: string) => {
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'}).format(date).replace(' ', NBSP) : iso;
};
const isoRange = (a: string, b: string) => Number.isFinite(Date.parse(`${a}T12:00:00Z`)) && Number.isFinite(Date.parse(`${b}T12:00:00Z`))
  ? dateRange(a, b, {year: 'never'}).replace(/ /g, NBSP) : `${isoDay(a)}–${isoDay(b)}`;
export function readableDates(text: string) {
  return text
    .replace(/\b(\d{4}-\d{2}-\d{2})\s*[–-]\s*(\d{4}-\d{2}-\d{2})\b/g, (_, a: string, b: string) => isoRange(a, b))
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, isoDay)
    .replace(/Resolve recorded-time exceptions before finalizing\./g, 'Fix recorded-time issues before finalizing.');
}

const requestKind: Partial<Record<ActionItem['type'], string>> = {TIME_OFF: 'Time off', EXCHANGE: 'Shift request', CALLOUT: 'Can’t work'};

/** Signed-in Spanish: the words presentItem writes itself, in Puerto Rico Spanish with tú. The server's own sentences and
 * the dates readableDates writes stay as they are. */
export type PresentLang = 'en' | 'es';
const ES = {
  kinds: {TIME_OFF: 'Días libres', EXCHANGE: 'Cambio de turno', CALLOUT: 'No puede trabajar'} as Partial<Record<ActionItem['type'], string>>,
  swap: 'Intercambio de turno', cover: 'Solicitud de cubrir', approvedTimeOff: 'Días libres aprobados',
  noTarget: 'Sin meta de horas semanal', noTargetFor: (p: string) => `${p} todavía no tiene meta de horas semanal.`, setTarget: 'Fija una meta de horas semanal.',
  notConfirmed: 'Horario no confirmado', notConfirmedBy: (p: string) => `${p} no ha confirmado su horario publicado.`,
  notSent: 'Disponibilidad no enviada', notSentBy: (p: string) => `${p} todavía no ha enviado su disponibilidad.`, notSentYet: 'Todavía no se ha enviado.',
  positionAt: 'Puesto sin cubrir en ', leadAt: 'Sin líder programado en ',
  addUnrecorded: 'Añadir tiempo no registrado', correction: 'Corrección de tiempo', setWeekly: 'Fijar meta de horas semanal',
};

const sentDate = (iso: string | undefined, timeZone: string, lang: PresentLang = 'en') => {
  if (!iso) return '';
  const dateOnly = iso.length === 10;
  const date = new Date(dateOnly ? `${iso}T12:00:00Z` : iso);
  if (!Number.isFinite(date.getTime())) return '';
  // A timestamp is shown on the workspace's calendar day (IS-32); a plain date stays as written.
  try {
    if (lang === 'es') return `enviada el ${new Intl.DateTimeFormat('es-PR', {month: 'short', day: 'numeric', timeZone: dateOnly ? 'UTC' : timeZone}).format(date).replace(/\./g, '').replace(' ', NBSP)}`;
    return `sent ${new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: dateOnly ? 'UTC' : timeZone}).format(date).replace(' ', NBSP)}`;
  }
  catch { return ''; }
};

/** A length in minutes, said the way the rest of Time says it: "30 min", "1 h", "1 h 15 min". */
const lengthText = (minutes: number) => {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h}${NBSP}h${m ? ` ${m}${NBSP}min` : ''}` : `${m}${NBSP}min`;
};

/** Backend contract (Nov 15, 2026): a correction item carries its work day, the workplace zone, the recorded interval
 * (either end may be missing) and the requested one. The line says what changes, in the workplace's clock:
 * "Wed, Nov 11 · 8:30 AM – 5:00 PM, was 9:00 AM – 5:00 PM · +30 min". The length difference is only given when both
 * intervals are complete; nothing recorded reads "Add …", never a zero-minute entry. Null when the facts can't be read. */
export function correctionLine(correction: NonNullable<ActionItem['correction']>): string | null {
  const at = (iso: string | null) => { if (!iso) return null; const value = Date.parse(iso); return Number.isFinite(value) ? value : null; };
  const askedStart = at(correction.requestedStartAt), askedEnd = at(correction.requestedEndAt);
  const wasStart = at(correction.recordedStartAt), wasEnd = at(correction.recordedEndAt);
  if (askedStart === null || askedEnd === null || askedEnd <= askedStart || !/^\d{4}-\d{2}-\d{2}$/.test(correction.workDate)) return null;
  let clock: Intl.DateTimeFormat;
  try { clock = new Intl.DateTimeFormat('en-US', {timeZone: correction.timeZone, hour: 'numeric', minute: '2-digit'}); } catch { return null; }
  // Each time stays whole on a narrow phone ("10:55 AM" never breaks before AM): a narrow no-break space, which the row
  // keeps (Things to do turns ordinary no-break spaces back into spaces).
  const time = (value: number) => clock.format(new Date(value)).replace(/[ \u00a0\u202f]([AP]M)$/, '\u202f$1');
  const day = new Intl.DateTimeFormat('en-US', {weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'}).format(new Date(`${correction.workDate}T12:00:00Z`)).replace(/ (\d+)$/, `${NBSP}$1`);
  const asked = `${time(askedStart)} – ${time(askedEnd)}`;
  if (wasStart === null && wasEnd === null) return `${day} · Add ${asked}`;
  // Only a start recorded: an open entry. A recorded end with no start, or an end not after the start, can't be described
  // truthfully, so the line gives the requested time alone.
  if (wasStart !== null && wasEnd === null) return `${day} · ${asked}, was ${time(wasStart)} with no clock-out`;
  if (wasStart === null || wasEnd === null || wasEnd <= wasStart) return `${day} · ${asked}`;
  const change = Math.round(((askedEnd - askedStart) - (wasEnd - wasStart)) / 60_000);
  return `${day} · ${asked}, was ${time(wasStart)} – ${time(wasEnd)} · ${change === 0 ? 'same length' : `${change > 0 ? '+' : '−'}${lengthText(Math.abs(change))}`}`;
}

/** The person an item is about, when its text names one. */
export function itemPerson(item: ActionItem) {
  if (isStaffingRepair(item)) return repairPerson(item);
  if (item.category === 'requests') return item.detail.replace(WAITING, '').trim() || null;
  const named = /^(.+?) (?:is not included|has not acknowledged|has not submitted|has no weekly)/.exec(item.detail);
  return named ? named[1] : null;
}

export type PresentedItem = {title: string; detail: string; person: string | null; action: string};

export function presentItem(item: ActionItem, actionLabel: string, timeZone = 'UTC', lang: PresentLang = 'en'): PresentedItem {
  const person = itemPerson(item), es = lang === 'es';
  let title = item.title, detail = item.detail;
  // Approved leave over a published shift (Nov 9, 2026): scheduling work named for the person, never a request to decide.
  if (isStaffingRepair(item)) return {title: repairTitle(item, lang), detail: spacedRanges([es ? ES.approvedTimeOff : 'Approved time off', repairWhen(item, lang)].filter(Boolean).join(' · ')), person, action: actionLabel};
  switch (item.type) {
    case 'TIME_OFF': case 'EXCHANGE': case 'CALLOUT': {
      title = person ?? title;
      // Backend (Nov 15, 2026): a shift request says whether it is a swap or a cover; without it, "Shift request".
      const kind = item.type === 'EXCHANGE' && item.request?.exchangeKind ? (item.request.exchangeKind === 'SWAP' ? es ? ES.swap : 'Shift swap' : es ? ES.cover : 'Cover request') : (es ? ES.kinds : requestKind)[item.type];
      detail = [kind, sentDate(item.dateTime, timeZone, lang)].filter(Boolean).join(' · ');
      break;
    }
    case 'TARGET_MISSING':
      title = es ? ES.noTarget : 'No weekly hour target';
      detail = person ? es ? ES.noTargetFor(person) : `${person} has no weekly hour target yet.` : es ? ES.setTarget : 'Set a weekly hour target.';
      break;
    case 'ACKNOWLEDGEMENT_MISSING':
      title = es ? ES.notConfirmed : 'Schedule not confirmed';
      detail = person ? es ? ES.notConfirmedBy(person) : `${person} hasn’t confirmed their published schedule.` : detail;
      break;
    case 'DEADLINE_MISSING':
      // Signed-in Spanish: the server's one sentence for a missing deadline (assistance/manager-actions.ts).
      if (es) { title = 'Fecha límite de disponibilidad'; if (/^Set the availability deadline/.test(detail)) detail = 'Fija la fecha límite de disponibilidad antes de que el equipo termine de enviar su disponibilidad.'; }
      break;
    case 'AVAILABILITY_MISSING':
      title = es ? ES.notSent : 'Availability not sent';
      detail = person ? es ? ES.notSentBy(person) : `${person} hasn’t sent availability yet.` : es ? ES.notSentYet : 'Not sent yet.';
      break;
    case 'COVERAGE_GAP':
      title = title.replace(/^Position coverage missing at /, es ? ES.positionAt : 'Position not covered at ').replace(/^Lead coverage missing at /, es ? ES.leadAt : 'No lead scheduled at ');
      detail = detail.replace(/: (\d+) missing/g, ': $1 open');
      break;
    case 'TIME_CORRECTION': {
      // Phase 3 (OW-002): the title is the person, the line under it what they asked for.
      const who = detail.split(' · ')[0]?.trim(), sent = sentDate(item.dateTime, timeZone, lang);
      // Phase 4 (U03): "yours" is the server's typed concernsActor, never the title's wording. A correction someone
      // sent for another person (a delegated requester) keeps that person's name.
      if (concernsActor(item)) title = reviewCopy(lang).yourCorrection;
      else if (who) title = who;
      // Backend (Nov 15): with the correction's facts the line says what changes; without them, the kind and the day sent.
      detail = (item.correction ? correctionLine(item.correction) : null)
        ?? [/Recorded entry not sent yet/.test(detail) ? es ? ES.addUnrecorded : 'Add unrecorded time' : es ? ES.correction : 'Time correction', sent].filter(Boolean).join(' · ');
      break;
    }
  }
  // Review B7 (NV-262): a detail that ends in a bare date range ("Casey · Nov 2–8.") is a label, not a sentence.
  if (item.type === 'TIMECARD') detail = detail.replace(/(\d)\.$/, '$1');
  const action = actionLabel === 'Set hour target' ? 'Set weekly hour target' : es && actionLabel === 'Fijar meta de horas' ? ES.setWeekly : actionLabel;
  return {title, detail: spacedRanges(readableDates(detail)), person, action};
}

/** One plain heading for a collapsed group of same-kind items. */
export function groupHeading(type: ActionItem['type'], count: number, title: string) {
  const n = (one: string, many: string) => `${count}${NBSP}${count === 1 ? one : many}`;
  switch (type) {
    case 'COVERAGE_GAP': {const at = / at (.+)$/.exec(title)?.[1]; return n('coverage gap', 'coverage gaps') + (at ? ` at ${at}` : '');}
    case 'TARGET_MISSING': return `${n('person', 'people')} with no weekly hour target`;
    case 'AVAILABILITY_MISSING': return `${n('person hasn’t', 'people haven’t')} sent availability`;
    case 'ACKNOWLEDGEMENT_MISSING': return `${n('person hasn’t', 'people haven’t')} confirmed the schedule`;
    case 'HOURS_REVIEW': return `${n('person', 'people')} outside their hour target`;
    case 'TIME_OFF': return n('time-off request', 'time-off requests');
    default: return `${title} (${count})`;
  }
}

/** Jose's attendance words (Nov 11, 2026). "Not clocked in": the shift started and there is no punch. "Missed": the shift
 * ended with no punch. "Clocked in late": the person arrived after the start. Today's read tells the first two apart by
 * the shift's status, so a shift still in progress is never called missed. */
export const ATTENDANCE_WORDS = {notClockedIn: 'Not clocked in', late: 'Clocked in late', missed: 'Missed'} as const;
/** Signed-in Spanish (es-rest R2): the same words in Puerto Rico Spanish (Team and Home already say these). */
export const ATTENDANCE_WORDS_ES: Record<keyof typeof ATTENDANCE_WORDS, string> = {notClockedIn: 'Sin marcar entrada', late: 'Marcó entrada tarde', missed: 'Sin marcar'};
export const attendanceWords = (lang: 'en' | 'es' = 'en'): Record<keyof typeof ATTENDANCE_WORDS, string> => lang === 'es' ? ATTENDANCE_WORDS_ES : ATTENDANCE_WORDS;
export function splitNoClockIn<T extends {status: string}>(shifts: readonly T[]): {running: T[]; ended: T[]} {
  return {running: shifts.filter(shift => shift.status !== 'no_punches'), ended: shifts.filter(shift => shift.status === 'no_punches')};
}

/** "clock-in" that never breaks at its hyphen. */
export const CLOCK_IN = `clock${NBHY}in`;
