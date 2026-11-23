/* Signed-in Spanish (es-rest, Nov 23, 2026): the words of Availability (the person's desktop page and its editor, the day
 * rows and sheet, and the Owner's and Manager's team list) in English and Puerto Rico Spanish (docs/design/voice.md: tú,
 * sentence case, the glossary). The English is the text these parts showed before, word for word. */
import type { PortalLang } from '@/lib/i18n/portal-lang';
import { formatTime, formatWeekRange, joinTimeRange } from '@/lib/date-utils';
import { dateRange } from '@/lib/duration-format';
import { keepWhole } from '@/lib/keep-whole';
import { esWeekRange } from './copy-receipt-copy';
import { esTime } from './schedule-copy';

/** "4 dic, 5:00 p. m.": the Spanish form of formatBusinessDateTime's "Dec 4, 5:00 PM". */
export const esBusinessDateTime = (iso: string, timeZone: string) => new Intl.DateTimeFormat('es-PR', { timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)).replace(/\b(\w{3})\./, '$1');
const zoned = (locale: string, timeZone: string, options: Intl.DateTimeFormatOptions) => (date: Date) => new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);

const en = {
  /** Monday first, as the editor lists them; [dayOfWeek, name]. */
  days: [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']] as [number, string][],
  /** Sunday = 0. */
  shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  time: (time: string) => formatTime(time),
  range: (start: string, end: string) => joinTimeRange(formatTime(start), formatTime(end)),
  editor: {
    checkHours: 'Check the hours', dayLabel: (day: string, hours: string | null) => `${day}, ${hours ?? 'not available'}`,
    allUnavailable: 'Submitting with every day unavailable tells your manager you cannot work this week.',
    savingAvailability: 'Saving your availability…', unsaved: 'You have unsaved changes.', saving: 'Saving…',
    submitWeek: 'Submit this week', save: 'Save', reset: 'Reset changes',
    endAfterStart: 'The end time needs to be after the start time.', midnight: 'An end time of midnight includes the rest of that day.',
    unavailableDay: 'Your manager will see you as unavailable on this day.', switchLabel: (day: string) => `${day} availability`,
    from: 'From', until: 'Until', startLabel: (day: string) => `${day} start time`, endLabel: (day: string) => `${day} end time`,
    weeklyForm: 'Weekly availability submission', usualForm: 'Normal availability preferences',
    failedBefore: 'Your availability wasn’t saved. Check your connection and save again. If this keeps happening, ', failedLink: 'sign in again', failedAfter: '.',
  },
  rows: { byDay: 'Availability by day', notAvailable: 'Not available', done: 'Done', legend: (day: string) => `${day} availability`, available: 'Available' },
  team: {
    shown: (n: number) => `${n} ${n === 1 ? 'person' : 'people'} shown`, people: 'People', show: 'Show', notSent: 'Not sent', sent: 'Sent',
    unavailableAllWeek: (place: string) => `${place} · Unavailable all week`, updatedAt: (place: string, when: string) => `${place} · Updated ${when}`,
    hoursOf: (name: string) => `${name} available hours`, updated: (when: string) => `Updated ${when}`,
    noEmployees: 'Employees and Leads show here once they’re added.', everyoneSent: 'Everyone has sent theirs.', noneSent: 'No one has sent theirs yet.',
  },
  page: {
    title: 'Availability', schedule: 'Schedule', agreedTimes: 'Agreed times', loading: 'Loading your planning…',
    lockedNotSubmitted: 'Locked · not submitted', lockedNotSubmittedDetail: 'No weekly availability was submitted before the deadline.',
    lockedSubmitted: 'Locked · submitted', lockedUnavailableDetail: 'You submitted that you are unavailable for the entire week.',
    lockedDetail: 'Your submitted weekly availability is locked for this schedule.',
    submittedUnavailable: 'Submitted · unavailable all week', submittedUnavailableDetail: 'Management can see that you intentionally submitted no available hours.',
    submitted: 'Submitted', submittedDetail: 'Management can see that your weekly availability is complete.',
    notSubmitted: 'Not submitted', notSubmittedDeadline: 'Submit this week before the deadline so management can schedule accurately.',
    notSubmittedNoDeadline: 'Submit this week so management can schedule accurately.',
    weekLabel: (weekStart: string) => `Week of ${keepWhole(dateRange(weekStart, weekStart, { year: 'never' }))}`,
    closed: 'Closed', unavailableAllWeek: 'Unavailable all week',
    due: (deadline: Date, timeZone: string) => `Due ${zoned('en-US', timeZone, { weekday: 'short', month: 'short', day: 'numeric' })(deadline)}`,
    previousWeek: 'Previous week', nextWeek: 'Next week', usualWeek: 'Your usual week', changeOneWeek: 'Change one week',
    /** `deadline` is formatBusinessDateTime's "Dec 4, 5:00 PM" (the page formats it; this table stays free of server helpers). */
    sendBy: (week: string, deadline: string) => `Send ${en.page.weekLabel(week).toLowerCase()} by ${deadline}.`,
    deadlinePassed: 'The deadline passed. Your submitted hours are kept.',
    sendItBy: (deadline: Date, timeZone: string) => `Send it by ${zoned('en-US', timeZone, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })(deadline)}. Hours for this week only; your usual week stays the same.`,
    thisWeekOnly: 'Hours for this week only; your usual week stays the same.', usualWeekLink: 'Usual week',
    usualNote: 'Your manager uses this to build the schedule. One-off days off go in Requests.',
    usedForWeek: (weekStart: string) => `Used for the week of ${formatWeekRange(weekStart)}`, usedForFuture: 'Used to build your future schedules',
    errorLocked: 'The availability deadline for this week has passed.', errorConcurrent: 'Your availability changed while saving. Review this week and try again.',
    errorWeek: 'That schedule week is not valid.', errorTimes: 'Every available day needs a valid start and end time.',
    savedWeek: 'Your availability for this schedule week has been updated.', savedUsual: 'Your usual week has been updated.',
  },
};

const esPage: typeof en.page = {
  title: 'Disponibilidad', schedule: 'Horario', agreedTimes: 'Horarios acordados', loading: 'Cargando tu planificación…',
  lockedNotSubmitted: 'Cerrada · sin enviar', lockedNotSubmittedDetail: 'No se envió disponibilidad semanal antes de la fecha límite.',
  lockedSubmitted: 'Cerrada · enviada', lockedUnavailableDetail: 'Enviaste que no estás disponible en toda la semana.',
  lockedDetail: 'La disponibilidad semanal que enviaste está cerrada para este horario.',
  submittedUnavailable: 'Enviada · no disponible toda la semana', submittedUnavailableDetail: 'La gerencia puede ver que enviaste a propósito que no tienes horas disponibles.',
  submitted: 'Enviada', submittedDetail: 'La gerencia puede ver que tu disponibilidad semanal está completa.',
  notSubmitted: 'Sin enviar', notSubmittedDeadline: 'Envía esta semana antes de la fecha límite para que la gerencia haga un horario correcto.',
  notSubmittedNoDeadline: 'Envía esta semana para que la gerencia haga un horario correcto.',
  weekLabel: (weekStart: string) => `Semana del ${dateRange(weekStart, weekStart, { year: 'never', locale: 'es-PR' })}`,
  closed: 'Cerrada', unavailableAllWeek: 'No disponible toda la semana',
  due: (deadline: Date, timeZone: string) => `Vence ${zoned('es-PR', timeZone, { weekday: 'short', month: 'short', day: 'numeric' })(deadline).replace(/\./g, '')}`,
  previousWeek: 'Semana anterior', nextWeek: 'Semana siguiente', usualWeek: 'Tu semana habitual', changeOneWeek: 'Cambiar una semana',
  sendBy: (week: string, deadline: string) => `Envía la ${esPage.weekLabel(week).toLowerCase()} antes del ${deadline}.`,
  deadlinePassed: 'Pasó la fecha límite. Se guardan las horas que enviaste.',
  sendItBy: (deadline: Date, timeZone: string) => `Envíala antes del ${zoned('es-PR', timeZone, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })(deadline).replace(/\b(\w{3})\./, '$1')}. Horas solo para esta semana; tu semana habitual no cambia.`,
  thisWeekOnly: 'Horas solo para esta semana; tu semana habitual no cambia.', usualWeekLink: 'Semana habitual',
  usualNote: 'Tu gerente usa esto para hacer el horario. Los días libres sueltos van en Solicitudes.',
  usedForWeek: (weekStart: string) => `Para la semana del ${esWeekRange(weekStart)}`, usedForFuture: 'Para hacer tus próximos horarios',
  errorLocked: 'Ya pasó la fecha límite de disponibilidad de esta semana.', errorConcurrent: 'Tu disponibilidad cambió mientras se guardaba. Revisa esta semana e inténtalo de nuevo.',
  errorWeek: 'Esa semana del horario no es válida.', errorTimes: 'Cada día disponible necesita una hora de inicio y de fin válidas.',
  savedWeek: 'Se actualizó tu disponibilidad para esta semana del horario.', savedUsual: 'Se actualizó tu semana habitual.',
};

const es: typeof en = {
  days: [[1, 'Lunes'], [2, 'Martes'], [3, 'Miércoles'], [4, 'Jueves'], [5, 'Viernes'], [6, 'Sábado'], [0, 'Domingo']],
  shortDays: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  time: esTime,
  range: (start: string, end: string) => joinTimeRange(esTime(start), esTime(end)),
  editor: {
    checkHours: 'Revisa las horas', dayLabel: (day: string, hours: string | null) => `${day}, ${hours ?? 'no disponible'}`,
    allUnavailable: 'Si envías todos los días como no disponibles, tu gerente sabrá que no puedes trabajar esta semana.',
    savingAvailability: 'Guardando tu disponibilidad…', unsaved: 'Tienes cambios sin guardar.', saving: 'Guardando…',
    submitWeek: 'Enviar esta semana', save: 'Guardar', reset: 'Deshacer cambios',
    endAfterStart: 'La hora de fin tiene que ser después de la de inicio.', midnight: 'Si termina a la medianoche, incluye el resto de ese día.',
    unavailableDay: 'Tu gerente verá que no estás disponible ese día.', switchLabel: (day: string) => `Disponibilidad del ${day.toLowerCase()}`,
    from: 'Desde', until: 'Hasta', startLabel: (day: string) => `Hora de inicio del ${day.toLowerCase()}`, endLabel: (day: string) => `Hora de fin del ${day.toLowerCase()}`,
    weeklyForm: 'Envío de disponibilidad semanal', usualForm: 'Preferencias de disponibilidad habitual',
    failedBefore: 'Tu disponibilidad no se guardó. Revisa tu conexión y guarda otra vez. Si sigue pasando, ', failedLink: 'inicia sesión otra vez', failedAfter: '.',
  },
  rows: { byDay: 'Disponibilidad por día', notAvailable: 'No disponible', done: 'Listo', legend: (day: string) => `Disponibilidad del ${day.toLowerCase()}`, available: 'Disponible' },
  team: {
    shown: (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'} en la lista`, people: 'Personas', show: 'Mostrar', notSent: 'Sin enviar', sent: 'Enviada',
    unavailableAllWeek: (place: string) => `${place} · No disponible toda la semana`, updatedAt: (place: string, when: string) => `${place} · Actualizada ${when}`,
    hoursOf: (name: string) => `Horas disponibles de ${name}`, updated: (when: string) => `Actualizada ${when}`,
    noEmployees: 'Los empleados y líderes aparecen aquí cuando los añadas.', everyoneSent: 'Todos enviaron la suya.', noneSent: 'Nadie ha enviado la suya todavía.',
  },
  page: esPage,
};

export const AVAILABILITY_COPY: Record<PortalLang, typeof en> = { en, es };
export const availabilityCopy = (lang: PortalLang = 'en') => AVAILABILITY_COPY[lang];
