/* Signed-in Spanish (es-rest, Nov 23, 2026): Christmas bonus hours (Insights) in English and Puerto Rico Spanish
 * (docs/design/voice.md: tú, the glossary: "Tarjeta de tiempo", "localidad", "Dueño"). The English is the page's text
 * before, word for word, including Jose's disclaimer (Nov 18, 2026). The Spanish of this page is pay and legal wording:
 * every line is listed for Jose's review in the es-rest report. */
import type { PortalLang } from '@/lib/i18n/portal-lang';
import { formatDateRange } from '@/lib/date-utils';
import { dateRange } from '@/lib/duration-format';

const grouped = (value: number) => value.toLocaleString('en-US');
const esDate = (date: string) => new Intl.DateTimeFormat('es-PR', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)).replace(/\./g, '').replace(/ de /g, ' ');

const en = {
  disclaimer: 'Informational only. Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying.',
  fullDate: (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)),
  dateRange: (start: string, end: string) => formatDateRange(start, end),
  days: (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`,
  yearLabel: (endYear: number) => `Oct ${endYear - 1} – Sep ${endYear}`,
  status: { REACHED: 'Reached', CHECK_BREAKS: 'Check breaks', NOT_CONFIRMED: 'Not confirmed', NOT_REACHED: 'Not reached', NEEDS_HIRE_DATE: 'No hire date' },
  ofThreshold: (hours: string, threshold: number) => `${hours} of ${grouped(threshold)} h`, recorded: (hours: string) => `${hours} recorded`,
  hired: (date: string) => `Hired ${date}`, id: (id: string) => `ID ${id}`, includesBreaks: (hours: string) => `Includes ${hours} of breaks`,
  notFinalized: (days: string) => `${days} not finalized`, inactive: 'Inactive',
  unfinalized: (people: number, days: string, dayCount: number) => `${people === 1 ? '1 person has' : `${people} people have`} recorded time on ${days} that ${dayCount === 1 ? 'isn’t' : 'aren’t'} on a finalized timecard yet.`,
  insights: 'Insights', title: 'Christmas bonus hours', allLocations: 'All locations', bonusYear: 'Bonus year', bonusYearIs: (label: string) => `Bonus year: ${label}`,
  about: 'About this report', dates: 'Dates for this bonus year', paymentWindow: 'Payment window', exemptionDeadline: 'Exemption filing deadline',
  atAGlance: 'At a glance', people: 'People', finalizedOnly: 'Hours count finalized timecards only', openTimecards: 'Open Timecards',
  peopleInYear: 'People in this bonus year', noHours: 'No hours recorded in NEVORA for this bonus year',
  note: 'Hours are recorded time on finalized timecards in this bonus year, breaks included. People hired before Jan 26, 2017 need 700 hours; people hired on or after need 1,350. “Check breaks” means they reach it only if their recorded breaks count as hours worked. Owners aren’t listed.',
};

const es: typeof en = {
  disclaimer: 'Solo informativo. La elegibilidad, las cantidades y las exenciones del bono de Navidad dependen del tamaño del patrono y de la ley de Puerto Rico. Confírmalo con tu proveedor de nómina o tu abogado antes de pagar.',
  fullDate: esDate,
  dateRange: (start: string, end: string) => start.slice(0, 4) === end.slice(0, 4) ? `${dateRange(start, end, { year: 'never', locale: 'es-PR' }).replace(/\./g, '').replace(/ de /g, ' ')} ${end.slice(0, 4)}` : `${esDate(start)} – ${esDate(end)}`,
  days: (count: number) => `${count} ${count === 1 ? 'día' : 'días'}`,
  yearLabel: (endYear: number) => `oct ${endYear - 1} – sep ${endYear}`,
  status: { REACHED: 'Alcanzado', CHECK_BREAKS: 'Revisar descansos', NOT_CONFIRMED: 'Sin confirmar', NOT_REACHED: 'No alcanzado', NEEDS_HIRE_DATE: 'Sin fecha de ingreso' },
  ofThreshold: (hours: string, threshold: number) => `${hours} de ${grouped(threshold)} h`, recorded: (hours: string) => `${hours} registradas`,
  hired: (date: string) => `Ingresó el ${date}`, id: (id: string) => `ID ${id}`, includesBreaks: (hours: string) => `Incluye ${hours} de descansos`,
  notFinalized: (days: string) => `${days} sin finalizar`, inactive: 'Inactivo',
  unfinalized: (people: number, days: string, dayCount: number) => `${people === 1 ? '1 persona tiene' : `${people} personas tienen`} tiempo registrado en ${days} que todavía no ${dayCount === 1 ? 'está' : 'están'} en una tarjeta de tiempo finalizada.`,
  insights: 'Análisis', title: 'Horas para el bono de Navidad', allLocations: 'Todas las localidades', bonusYear: 'Año del bono', bonusYearIs: (label: string) => `Año del bono: ${label}`,
  about: 'Sobre este informe', dates: 'Fechas de este año del bono', paymentWindow: 'Período de pago', exemptionDeadline: 'Fecha límite para radicar la exención',
  atAGlance: 'Resumen', people: 'Personas', finalizedOnly: 'Las horas cuentan solo tarjetas de tiempo finalizadas', openTimecards: 'Abrir Tarjetas de tiempo',
  peopleInYear: 'Personas en este año del bono', noHours: 'No hay horas registradas en NEVORA para este año del bono',
  note: 'Las horas son el tiempo registrado en tarjetas de tiempo finalizadas en este año del bono, con los descansos incluidos. Quienes ingresaron antes del 26 ene 2017 necesitan 700 horas; quienes ingresaron ese día o después necesitan 1,350. “Revisar descansos” quiere decir que llegan a la meta solo si sus descansos registrados cuentan como horas trabajadas. Los dueños no aparecen.',
};

export const CHRISTMAS_BONUS_COPY: Record<PortalLang, typeof en> = { en, es };
export const christmasBonusCopy = (lang: PortalLang = 'en') => CHRISTMAS_BONUS_COPY[lang];
