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
    // Phase 8 (review C, row 11): under 360px "of 56 h" leaves the figure and joins the line under it.
    ofHoursThisWeek: (hours: string) => `of ${hours} h this week`,
    // Phase 8 (review C, row 9): the card under the week names what it holds (its open shifts can be next week's).
    openAndChanges: 'Open shifts and changes',
    openShifts: 'Open shifts',
    // Phase 8 (review C, copy table): none to pick up is said once, with no sub-line repeating it.
    noOpenShifts: 'No open shifts',
    scheduleChanges: 'Schedule changes',
    // Phase 8 (review C, row 22): the phone's short reason is a whole sentence.
    managerAsked: 'Your manager asked for it',
    // Phase 8 (review C, row 15 and the copy table): a Lead's Today's team note.
    teamNote: 'Your message goes to everyone on today’s published schedule. They don’t have to confirm it.',
    // Phase 8 (review C, Time correction row): what the row opens, without claiming a state.
    correctionsSub: 'Waiting and decided',
    // Phase 8 (review C, row 23 and the copy table): Pick up and swap.
    cantTakeTitle: 'Shifts you can’t take', cantTake: (count: number) => `${count} ${count === 1 ? 'shift' : 'shifts'}, with the reason`,
    yourAvailability: 'Your availability',
    // Phase 8 (review C, row 12): the closed Payroll page offers an Employee their own pay.
    payIsInPay: 'Your pay statements are in Pay.',
    openPay: 'Open Pay',
    availabilitySub: 'Days and hours you can work',
    noMorePublishedThisWeek: 'No more published shifts this week.',
    noMoreToday: 'No more shifts today.',
    noMorePublishedToday: 'No more published shifts today.',
    today: 'Today',
    startsShort: (rest: string) => `In ${rest}`,
    cantWorkShort: 'Can’t work',
    leadShort: 'Lead',
    moreEarlierStatements: 'More earlier statements',
    // Phase 9 (spec 1.4): your own clock state on Time once a shift has started with no punch, with how long.
    notClockedInFor: (span: string) => `Not clocked in · ${span}`,
    // Round 2 (H2): Home's chip for a swap or cover request that waits for you, Requests' own words.
    needsYourAnswer: 'Needs your answer',
    // Round 2 (S4): Schedule's "What changed in your schedule" on a phone narrower than 360px.
    whatChanged: 'What changed',
    // Round 2 (S2): Schedule's Confirm row carries Home's chip.
    actionNeeded: 'Action needed',
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
    ofHoursThisWeek: (hours: string) => `de ${hours} h esta semana`,
    openAndChanges: 'Turnos abiertos y cambios',
    openShifts: 'Turnos abiertos',
    noOpenShifts: 'No hay turnos abiertos',
    scheduleChanges: 'Cambios en tu horario',
    managerAsked: 'Lo pidió tu gerente',
    teamNote: 'Tu mensaje llega a todos en el horario publicado de hoy. No tienen que confirmarlo.',
    correctionsSub: 'En espera y decididas',
    cantTakeTitle: 'Turnos que no puedes tomar', cantTake: (count: number) => `${count} ${count === 1 ? 'turno' : 'turnos'}, con el motivo`,
    yourAvailability: 'Tu disponibilidad',
    payIsInPay: 'Tus comprobantes de pago están en Pago.',
    openPay: 'Abrir Pago',
    availabilitySub: 'Días y horas en que puedes trabajar',
    noMorePublishedThisWeek: 'No quedan turnos publicados esta semana.',
    noMoreToday: 'No quedan turnos hoy.',
    noMorePublishedToday: 'No quedan turnos publicados hoy.',
    today: 'Hoy',
    startsShort: (rest: string) => `En ${rest}`,
    cantWorkShort: 'No puedo ir',
    leadShort: 'Líder',
    moreEarlierStatements: 'Más comprobantes anteriores',
    notClockedInFor: (span: string) => `Sin registrar entrada · ${span}`,
    needsYourAnswer: 'Necesita tu respuesta',
    whatChanged: 'Qué cambió',
    actionNeeded: 'Requiere acción',
  },
} as const;
export type WorkCopy = {[K in keyof typeof words.en]: (typeof words.en)[K] extends (...args: infer A) => string ? (...args: A) => string : string};
export const WORK_COPY: Record<WorkLang, WorkCopy> = words;
export const workCopy = (lang: WorkLang = 'en'): WorkCopy => WORK_COPY[lang];
