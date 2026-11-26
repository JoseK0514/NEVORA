/* Signed-in Spanish (Jose's gap closure, Nov 23, 2026): the few words that say a person's weekly availability
 * (availability-summary.ts, More's "Availability" row) in English and Puerto Rico Spanish (docs/design/voice.md: lowercase
 * days, "Todo el día"). English is the summary exactly as it was; times come from mobile-format.ts. */
const en = {
  dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  notSet: 'Not set',
  everyDay: 'Every day',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  daysAWeek: (n: number) => `${n} days a week`,
  allDay: 'all day',
};
const es: typeof en = {
  dayNames: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  notSet: 'Sin indicar',
  everyDay: 'Todos los días',
  weekdays: 'Días de semana',
  weekends: 'Fines de semana',
  daysAWeek: (n: number) => `${n} días a la semana`,
  allDay: 'todo el día',
};
export const availabilitySummaryCopy = {en, es};
