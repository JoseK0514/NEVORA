/* Reminders (U10): every word the feature shows in English and Puerto Rico Spanish.
 * Words to keep: a queue receipt is "queued", never "sent" or "delivered"; an unknown result is "not confirmed",
 * never "failed"; nothing here promises that a person saw anything. */
import { esTimes } from '../copy-receipt-copy';

export type ReminderLang = 'en' | 'es';

const en = {
  remind: 'Remind',
  remindAria: (name: string) => `Remind ${name}`,
  remindMany: (count: number) => `Remind ${count} people`,
  checking: 'Checking if a reminder can go',
  sending: 'Queuing reminder…',
  cooldown: (when: string) => `One reminder a day · can remind again ${when}`,
  cooldownNone: 'One reminder a day · no time left before this closes',
  queuedAt: (time: string) => `Reminder queued · ${time}`,
  queued: 'Reminder queued',
  alreadyQueued: 'Reminder already queued',
  heldActivation: 'On hold: reminders are paused for this workplace',
  heldModule: 'On hold: Updates is off for this workplace',
  signedOut: 'Can’t remind: your session ended. Nothing was sent.',
  signIn: 'Sign in again',
  noAccessManager: 'Can’t remind: your access doesn’t cover this. Nothing was sent. Ask your workplace Owner to review your access.',
  noAccessOwner: 'Can’t remind: your current access doesn’t cover this. Nothing was sent.',
  support: 'Contact support',
  stale: 'Can’t remind: this page is out of date. Nothing was sent.',
  changed: 'This changed while you were looking.',
  expiresFirst: 'Too late to remind: this closes before a reminder could go out.',
  refresh: 'Refresh',
  unknown: 'We couldn’t confirm this reminder.',
  unknownStill: 'Still not confirmed. Nothing new was sent.',
  unknownAccess: 'We couldn’t confirm this reminder. Sign in again, then check.',
  checkAgain: 'Check again',
  looking: 'Checking…',
  notSent: 'Not confirmed yet. No queue receipt was found. It may still be queued.',
  sendAgain: 'Send again',
  error: 'Couldn’t check if a reminder can go.',
  tryAgain: 'Try again',
  reference: (id: string) => `Support reference ${id}`,
  offline: 'You’re offline. Connect to remind.',
  needsDeadline: 'Reminders need a deadline. Set one in Scheduling rules.',
  /** The words of `needsDeadline` that are its one link (to /app/schedule/settings). They must appear in it as written. */
  needsDeadlineLink: 'Scheduling rules',
  oneTitle: (name: string) => `Remind ${name}?`,
  manyTitle: (count: number) => `Remind ${count} people?`,
  manyTitleNone: 'No one to remind right now',
  factWho: 'Who gets it',
  factAbout: 'About',
  aboutAvailability: (week: string) => `Availability for the week of ${week}`,
  aboutUpdate: (title: string) => `The update “${title}”`,
  factHow: 'How it goes out',
  how: 'NEVORA puts a notification in the queue for them. We can’t confirm when they see it.',
  factWhen: 'Earliest it can go out',
  factDue: 'Due',
  factEnds: 'Reminder ends',
  factLimit: 'Limit',
  limit: 'One reminder per person a day. Quiet hours are 9:00 PM to 7:00 AM.',
  send: 'Send reminder',
  sendMany: (count: number) => (count === 1 ? 'Send 1 reminder' : `Send ${count} reminders`),
  cancel: 'Cancel',
  done: 'Done',
  people: 'People',
  ready: 'Ready',
  manyCount: (count: number, total: number) => `${count} of ${total} can be reminded now.`,
  resultsTitle: 'Reminder results',
  resultsSummary: (count: number, total: number) => `${count} of ${total} queued. Queued is not delivered.`,
  resultsWorking: 'Working through the list…',
  today: 'today',
  tomorrow: 'tomorrow',
  afterToday: (time: string) => `today after ${time}`,
  afterTomorrow: (time: string) => `tomorrow after ${time}`,
  afterDay: (day: string, time: string) => `${day} after ${time}`,
};

export type ReminderCopy = typeof en;

const es: ReminderCopy = {
  remind: 'Recordar',
  remindAria: name => `Recordar a ${name}`,
  remindMany: count => `Recordar a ${count} personas`,
  checking: 'Verificando si se puede enviar un recordatorio',
  sending: 'Poniendo el recordatorio en cola…',
  cooldown: when => `Un recordatorio al día · se puede recordar de nuevo ${when}`,
  cooldownNone: 'Un recordatorio al día · no queda tiempo antes del cierre',
  queuedAt: time => `Recordatorio en cola · ${time}`,
  queued: 'Recordatorio en cola',
  alreadyQueued: 'El recordatorio ya estaba en cola',
  heldActivation: 'En pausa: los recordatorios están detenidos para este lugar de trabajo',
  heldModule: 'En pausa: Avisos está desactivado para este lugar de trabajo',
  signedOut: 'No se puede recordar: la sesión terminó. No se envió nada.',
  signIn: 'Iniciar sesión de nuevo',
  noAccessManager: 'No se puede recordar: tu acceso no cubre esto. No se envió nada. Pídele al dueño que revise tu acceso.',
  noAccessOwner: 'No se puede recordar: tu acceso actual no cubre esto. No se envió nada.',
  support: 'Contactar a soporte',
  stale: 'No se puede recordar: esta página no está al día. No se envió nada.',
  changed: 'Esto cambió mientras lo veías.',
  expiresFirst: 'Ya es tarde para recordar: esto cierra antes de que pueda salir un recordatorio.',
  refresh: 'Actualizar',
  unknown: 'No pudimos confirmar este recordatorio.',
  unknownStill: 'Sigue sin confirmarse. No se envió nada nuevo.',
  unknownAccess: 'No pudimos confirmar este recordatorio. Inicia sesión de nuevo y vuelve a verificar.',
  checkAgain: 'Verificar de nuevo',
  looking: 'Verificando…',
  notSent: 'Aún sin confirmar. No se encontró un recibo de cola. Todavía puede quedar en cola.',
  sendAgain: 'Enviar de nuevo',
  error: 'No se pudo verificar si se puede enviar un recordatorio.',
  tryAgain: 'Intentar de nuevo',
  reference: id => `Referencia de soporte ${id}`,
  offline: 'No hay conexión. Conéctate para enviar el recordatorio.',
  needsDeadline: 'Los recordatorios necesitan una fecha límite. Fíjala en Reglas de horarios.',
  needsDeadlineLink: 'Reglas de horarios',
  oneTitle: name => `¿Recordar a ${name}?`,
  manyTitle: count => `¿Recordar a ${count} personas?`,
  manyTitleNone: 'Nadie a quien recordar por ahora',
  factWho: 'Quién lo recibe',
  factAbout: 'Sobre',
  aboutAvailability: week => `Disponibilidad para la semana del ${week}`,
  aboutUpdate: title => `El aviso «${title}»`,
  factHow: 'Cómo sale',
  how: 'NEVORA pone una notificación en cola para la persona. No podemos confirmar cuándo la ve.',
  factWhen: 'Lo más temprano que puede salir',
  factDue: 'Fecha límite',
  factEnds: 'El recordatorio termina',
  factLimit: 'Límite',
  limit: 'Un recordatorio por persona al día. Las horas de silencio son de 9:00 p. m. a 7:00 a. m.',
  send: 'Enviar recordatorio',
  sendMany: count => (count === 1 ? 'Enviar 1 recordatorio' : `Enviar ${count} recordatorios`),
  cancel: 'Cancelar',
  done: 'Listo',
  people: 'Personas',
  ready: 'Listo para recordar',
  manyCount: (count, total) => `Se puede recordar a ${count} de ${total} ahora.`,
  resultsTitle: 'Resultados de los recordatorios',
  resultsSummary: (count, total) => `${count} de ${total} en cola. En cola no significa entregado.`,
  resultsWorking: 'Pasando por la lista…',
  today: 'hoy',
  tomorrow: 'mañana',
  afterToday: time => `hoy después de las ${time}`,
  afterTomorrow: time => `mañana después de las ${time}`,
  afterDay: (day, time) => `el ${day} después de las ${time}`,
};

export const reminderCopy: Record<ReminderLang, ReminderCopy> = {en, es};

const locale = (lang: ReminderLang) => (lang === 'es' ? 'es-PR' : 'en-US');
const dayKey = (at: Date, timeZone: string) => new Intl.DateTimeFormat('en-CA', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(at);

/** "3:02 PM" in the workplace's zone. */
export function reminderTime(at: string, timeZone: string, lang: ReminderLang = 'en') {
  const clock = new Intl.DateTimeFormat(locale(lang), {timeZone, hour: 'numeric', minute: '2-digit', hour12: true}).format(new Date(at)).replace(/ /g, ' ').replace(/\s?([ap])\.\s?m\./i, (_, p: string) => ` ${p.toUpperCase()}M`);
  return lang === 'es' ? esTimes(clock) : clock;
}

const daysAway = (at: string, timeZone: string, now: Date) => {
  const stamp = (value: Date) => Date.parse(`${dayKey(value, timeZone)}T00:00:00Z`);
  return Math.round((stamp(new Date(at)) - stamp(now)) / 86400000);
};
const shortDay = (at: string, timeZone: string, lang: ReminderLang) => new Intl.DateTimeFormat(locale(lang), {timeZone, weekday: 'short', month: 'short', day: 'numeric'}).format(new Date(at));

/** "today, 9:00 PM", "tomorrow, 7:00 AM", then "Tue, Nov 24, 9:00 PM": days are counted in the workplace's zone. */
export function reminderWhen(at: string, timeZone: string, lang: ReminderLang = 'en', now: Date = new Date()) {
  const t = reminderCopy[lang], time = reminderTime(at, timeZone, lang), days = daysAway(at, timeZone, now);
  return `${days === 0 ? t.today : days === 1 ? t.tomorrow : shortDay(at, timeZone, lang)}, ${time}`;
}

/** When the next reminder can be queued: "today after 9:00 PM", "tomorrow after 9:00 PM", "Tue, Nov 24 after 9:00 PM". */
export function reminderAfter(at: string, timeZone: string, lang: ReminderLang = 'en', now: Date = new Date()) {
  const t = reminderCopy[lang], time = reminderTime(at, timeZone, lang), days = daysAway(at, timeZone, now);
  return days === 0 ? t.afterToday(time) : days === 1 ? t.afterTomorrow(time) : t.afterDay(shortDay(at, timeZone, lang), time);
}
