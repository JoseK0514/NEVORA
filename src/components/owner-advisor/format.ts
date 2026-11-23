/* Rondo AI (Owner) presentation words (Nov 18, 2026). Dates read "Wed, Nov 18", clock times "9:27 PM", periods
 * "Nov 1–7", zones "Puerto Rico time". Presentation only: every value is the server's own; nothing here changes
 * what is sent, saved or compared. Calendar dates are the workspace's written day (read at noon UTC, so no zone can move
 * them); instants are read in the workspace's zone when the page knows it, else in the device's (as before). */
import { durationMinutes, formatTime, formatTimeRange } from "@/lib/date-utils";
import { dateRange, durationSentence } from "@/lib/duration-format";

export type Lang = "en" | "es";
const LOCALE: Record<Lang, string> = { en: "en-US", es: "es-PR" };
const noon = (date: string) => new Date(`${date}T12:00:00Z`);
const isDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

/** "Wed, Nov 18" ("mié, 18 nov" in Spanish); the year joins when it differs from `year` ("Mon, Jan 4, 2027"). */
export function dayText(date: string, lang: Lang = "en", year?: string) {
  if (!isDate(date)) return date;
  const withYear = !!year && date.slice(0, 4) !== year;
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) }).format(noon(date));
}

/** "Nov 1–7" ("1–7 nov"), the app's one date-range form; one day reads as that day. The year joins when the period
 * leaves `year`. */
export function periodText(start: string, end: string, lang: Lang = "en", year?: string) {
  if (!isDate(start) || !isDate(end)) return `${start} – ${end}`;
  if (start === end) return dayText(start, lang, year);
  const withYear = !!year && (start.slice(0, 4) !== year || end.slice(0, 4) !== year);
  return dateRange(start, end, { year: withYear ? "each" : "never", locale: LOCALE[lang] });
}

/** "8:00 AM – 12:00 PM" from stored "08:00" and "12:00", by the app's own helper: an end at 24:00 reads "12:00 AM" and
 * 00:00–24:00 reads "All day". */
export function clockRange(start: string, end: string, lang: Lang = "en") {
  return spanishTimes(formatTimeRange(start, end), lang);
}

/** The app's English times in Puerto Rico Spanish: "8:00 AM – 12:00 PM" reads "8:00 a. m. – 12:00 p. m." and "All day"
 * "Todo el día" (docs/design/voice.md). English passes through unchanged. */
export function spanishTimes(text: string, lang: Lang = "en") {
  if (lang === "en") return text;
  return text.replace(/\bAll day\b/g, "Todo el día").replace(/(\d) ?AM\b/g, "$1 a. m.").replace(/(\d) ?PM\b/g, "$1 p. m.");
}

/** One person's shift in the one time format (Nov 23, 2026): "6:45 PM – 12:00 AM"; a 00:00–24:00 shift reads "All day".
 * Its length is shiftLength ("24 h", "4 h 30 min"), shown beside it, so a shift never reads as zero hours (QA S-09). */
export function shiftRange(start: string, end: string, lang: Lang = "en") {
  return spanishTimes(formatTimeRange(start, end), lang);
}
export function shiftLength(start: string, end: string) {
  return durationSentence(durationMinutes(start, end));
}

/** Minutes said as hours in a sentence: "48 h", "5 h 15 min", "0 h". */
export function hoursText(minutes: number) {
  return durationSentence(minutes, "0 h");
}

/** A server state code said in sentence case in English ("DRAFT" reads "Draft", "IN_REVIEW" "In review"); Spanish
 * reviews keep the code as before, since there is no Spanish word list for it. */
export function stateText(code: string, lang: Lang = "en") {
  return lang === "en" && /^[A-Z][A-Z_]*$/.test(code) ? code.charAt(0) + code.slice(1).toLowerCase().replaceAll("_", " ") : code;
}

/** The calendar day of an instant in a zone ("2026-11-18"). */
export function dayOf(iso: string, timeZone?: string) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)); } catch { return iso.slice(0, 10); }
}

/** "9:27 PM" when the instant falls on `today` in the zone, else "Wed, Nov 18, 9:27 PM". */
export function whenText(iso: string, timeZone?: string, today?: string, lang: Lang = "en") {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  const zone = (() => { try { new Intl.DateTimeFormat("en-US", { timeZone }); return timeZone; } catch { return undefined; } })();
  const clock = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(at);
  const day = dayOf(iso, zone);
  return today && day === today ? clock : `${dayText(day, lang, today?.slice(0, 4))}, ${clock}`;
}

/** Everything the page reads instants against: the workspace's zone and today's date there, when known. */
export type Clock = { timeZone?: string; today?: string };

/** The server's attention sentences, said correctly: "1 published shift started …", "starting 11:30 PM". Only these
 * known forms change; any other sentence is shown exactly as the server wrote it. */
export function attentionDetail(detail: string, lang: Lang = "en") {
  const en = detail
    .replace(/^1 published shifts started without a recorded clock-in\./, "1 published shift started without a recorded clock-in.")
    .replace(/^1 finished published shifts have no recorded punches\./, "1 finished published shift has no recorded punches.")
    .replace(/^1 planning periods need review,/, "1 planning period needs review,")
    .replace(/(planning periods? needs? review, starting )(\d{2}:\d{2})\./, (_match, lead: string, time: string) => `${lead}${formatTime(time)}.`)
    // Rondo follow-up (Nov 23): the figure stays on the line with its label ("shortfall: 1." never leaves "1." alone).
    .replace(/(shortfall:) (\d+)/, "$1\u00a0$2");
  return lang === "es" ? attentionDetailEs(en) : en;
}

/** Signed-in Spanish: the server's attention sentences (owner-advisor/briefing.ts, fixed English patterns) in Puerto Rico
 * Spanish with tú. A sentence the patterns don't know stays as the server wrote it. */
function attentionDetailEs(text: string) {
  const n = (count: string, one: string, many: string) => count === "1" ? one : many;
  return text
    .replace(/^(\d+) published shifts? started without a recorded clock-in\. Verify attendance before choosing coverage\./, (_m, c: string) =>
      `${c} ${n(c, "turno publicado empezó", "turnos publicados empezaron")} sin entrada marcada. Verifica la asistencia antes de buscar cobertura.`)
    .replace(/^(\d+) finished published shifts? (?:has|have) no recorded punches\. Review the records before correcting time\./, (_m, c: string) =>
      `${c} ${n(c, "turno publicado terminado no tiene", "turnos publicados terminados no tienen")} marcas registradas. Revisa los registros antes de corregir el tiempo.`)
    .replace(/^Coverage cannot be fully assessed until missing or invalid staffing and coverage rules are reviewed\./,
      "No se puede evaluar toda la cobertura hasta que revises las reglas de personal y de cobertura que faltan o no son válidas.")
    .replace(/^(\d+) planning periods? needs? review, starting ([^.]+(?:\.[^.]*m\.)?)\./, (_m, c: string, time: string) =>
      `${c} ${n(c, "período de planificación necesita", "períodos de planificación necesitan")} revisión, desde las ${spanishTimes(time, "es").replace(/\.$/, "")}.`)
    .replace(/Maximum staffing shortfall:\s(\d+)\./, "Mayor falta de personal:\u00a0$1.")
    .replace(/ A designated lead is missing\./, " Falta un líder designado.")
    .replace(/ Unfilled positions: ([^.]*)\./, " Puestos sin cubrir: $1.")
    .replace(/Includes draft commitments; verify published staffing separately\./, "Incluye compromisos en borrador; verifica aparte el personal publicado.");
}
