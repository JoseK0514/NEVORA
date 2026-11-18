/* Phase 4 (Nov 17, 2026): the new words on the Employee and Lead Home, Schedule, Time and Pay, in English and Puerto
 * Rico Spanish. The signed-in app renders English today (a stored language per person is an open decision), so the
 * screens read `workCopy()`; the Spanish entries are kept beside them so no new sentence waits for a translation.
 * Existing sentences on these screens are still written where they were. Pay wording that is locked ("Scheduled
 * payday", "Your employer pays you") is not here: it was restyled, not rewritten. */
export type WorkLang = 'en' | 'es';
const words = {
  en: {
    hours: 'Hours',
    workedThisWeek: 'worked this week',
    scheduledThisWeek: 'scheduled this week',
    ofHours: (hours: string) => `of ${hours} h`,
    nextShift: 'Next shift',
    onShiftUntil: 'On shift until',
    leadAll: (count: number) => `You lead all ${count}`,
    stillClockedIn: (time: string) => `Still clocked in since ${time}`,
    shiftEnded: (range: string, place: string) => `Your ${range} shift has ended. Clock out on the ${place} tablet.`,
    thisWeek: 'This week',
    managerAsked: 'Your manager asked',
    noMorePublishedThisWeek: 'No more published shifts this week.',
    noMoreToday: 'No more shifts today.',
    noMorePublishedToday: 'No more published shifts today.',
    today: 'Today',
    startsShort: (rest: string) => `In ${rest}`,
    cantWorkShort: 'Can’t work',
    leadShort: 'Lead',
    moreEarlierStatements: 'More earlier statements',
  },
  es: {
    hours: 'Horas',
    workedThisWeek: 'trabajadas esta semana',
    scheduledThisWeek: 'programadas esta semana',
    ofHours: (hours: string) => `de ${hours} h`,
    nextShift: 'Próximo turno',
    onShiftUntil: 'En turno hasta las',
    leadAll: (count: number) => `Lideras los ${count}`,
    stillClockedIn: (time: string) => `Tu entrada sigue abierta desde las ${time}`,
    shiftEnded: (range: string, place: string) => `Tu turno de ${range} terminó. Registra tu salida en la tableta de ${place}.`,
    thisWeek: 'Esta semana',
    managerAsked: 'Lo pidió tu gerente',
    noMorePublishedThisWeek: 'No quedan turnos publicados esta semana.',
    noMoreToday: 'No quedan turnos hoy.',
    noMorePublishedToday: 'No quedan turnos publicados hoy.',
    today: 'Hoy',
    startsShort: (rest: string) => `En ${rest}`,
    cantWorkShort: 'No puedo ir',
    leadShort: 'Líder',
    moreEarlierStatements: 'Más comprobantes anteriores',
  },
} as const;
export type WorkCopy = {[K in keyof typeof words.en]: (typeof words.en)[K] extends (...args: infer A) => string ? (...args: A) => string : string};
export const WORK_COPY: Record<WorkLang, WorkCopy> = words;
export const workCopy = (lang: WorkLang = 'en'): WorkCopy => WORK_COPY[lang];
