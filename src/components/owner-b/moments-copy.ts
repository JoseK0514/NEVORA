/* Phase 7 (moments): the sentences of the shared success pattern (`BState kind="done"`) where a screen had no copy module
 * of its own. A title names what is now true; the line is the next fact the reply or the screen already holds. "Sent" is
 * never "approved", and a result the server has not confirmed never reaches these strings. The signed-in app renders `en`
 * today; `es` (Puerto Rico, usted) is proved by moments-copy.test.tsx. Payroll sentences are not here: they are locked. */
export type MomentsLang = "en" | "es";

const en = {
  // A request the server recorded and a manager has yet to decide.
  requestSent: "Request sent",
  timeOffLine: "Your manager decides. Keep your scheduled shifts until it is approved.",
  viewRequest: "View my request",
  anotherRequest: "Make another request",
  // Shift changes, by what was sent.
  calloutSent: "Report sent",
  calloutLine: "Your manager has it. You keep the shift until they decide.",
  swapSent: "Swap request sent",
  swapLine: "Your teammate says yes first, then your manager may need to approve.",
  coverSent: "Cover offer sent",
  coverLine: "The shift stays yours until someone picks it up and any review is done.",
  // The reply says the change is already made.
  changeDone: "Shift change made",
  changeDoneLine: "Your schedule shows it now.",
  viewSchedule: "View my schedule",
  backToSchedule: "Back to my schedule",
  // The reply says the request closed without a change: not a success.
  changeClosed: "Request closed",
  changeClosedLine: "Nothing changed on your schedule. Open the request to see why.",
  // Pick up an open shift.
  pickupDone: "Shift picked up",
  pickupDoneLine: "It is on your schedule now.",
  pickupSent: "Pickup requested",
  pickupSentLine: "A manager reviews it before the shift is yours.",
  viewRequests: "View my requests",
  // A time correction.
  correctionSent: "Correction request sent",
  correctionLine: "Your manager reviews it. Your original punches stay unchanged.",
  anotherCorrection: "Request another correction",
  // Availability.
  usualSaved: "Usual hours saved",
  weekSubmitted: "Weekly availability submitted",
  usualLine: "Used to build your future schedules.",
  weekLine: (week: string) => `Used for the week of ${week}.`,
  reviewSaved: "Review saved hours",
  weekClosed: "This week is closed",
  // The week.
  weekConfirmed: "Week confirmed",
  weekConfirmedLine: "Your manager can see you checked it",
  // A published schedule.
  published: (name: string) => `${name} published`,
  publishedAll: "Schedules published",
  publishedLine: (week: string) => `Your team can now see their ${week} shifts.`,
  publishedCount: (done: number, total: number) => `${done} of ${total} locations published`,
  publishedCountLine: "Your team can see those. The rest are not published.",
  backHome: "Back to Home",
  sendUpdate: "Send an update",
  // Several timecards sent as one set: each card's own result, in words.
  batchAllApproved: (count: number) => count === 1 ? "1 timecard approved" : `${count} timecards approved`,
  batchAllFinalized: (count: number) => count === 1 ? "1 timecard finalized" : `${count} timecards finalized`,
  batchLine: "Refresh timecards before reviewing another set.",
  batchWord: { approved: "Approved", finalized: "Finalized", blocked: "Blocked", conflict: "Changed. Review it again", unavailable: "Not available", denied: "Not allowed", "outcome-unknown": "Not confirmed", "not-submitted": "Not sent" },
};

const es: typeof en = {
  requestSent: "Solicitud enviada",
  timeOffLine: "Su gerente decide. Mantenga sus turnos programados hasta que se apruebe.",
  viewRequest: "Ver mi solicitud",
  anotherRequest: "Hacer otra solicitud",
  calloutSent: "Aviso enviado",
  calloutLine: "Su gerente ya lo tiene. El turno sigue siendo suyo hasta que decida.",
  swapSent: "Solicitud de intercambio enviada",
  swapLine: "Su compañero acepta primero; luego su gerente quizá deba aprobarlo.",
  coverSent: "Oferta de cobertura enviada",
  coverLine: "El turno sigue siendo suyo hasta que alguien lo tome y termine la revisión.",
  changeDone: "Cambio de turno hecho",
  changeDoneLine: "Su horario ya lo muestra.",
  viewSchedule: "Ver mi horario",
  backToSchedule: "Volver a mi horario",
  changeClosed: "Solicitud cerrada",
  changeClosedLine: "Nada cambió en su horario. Abra la solicitud para ver por qué.",
  pickupDone: "Turno tomado",
  pickupDoneLine: "Ya está en su horario.",
  pickupSent: "Turno solicitado",
  pickupSentLine: "Un gerente lo revisa antes de que el turno sea suyo.",
  viewRequests: "Ver mis solicitudes",
  correctionSent: "Solicitud de corrección enviada",
  correctionLine: "Su gerente la revisa. Sus marcaciones originales no cambian.",
  anotherCorrection: "Pedir otra corrección",
  usualSaved: "Horas habituales guardadas",
  weekSubmitted: "Disponibilidad semanal enviada",
  usualLine: "Se usan para preparar sus próximos horarios.",
  weekLine: (week: string) => `Se usa para la semana del ${week}.`,
  reviewSaved: "Revisar las horas guardadas",
  weekClosed: "Esta semana está cerrada",
  weekConfirmed: "Semana confirmada",
  weekConfirmedLine: "Su gerente puede ver que usted la revisó",
  published: (name: string) => `${name} publicado`,
  publishedAll: "Horarios publicados",
  publishedLine: (week: string) => `Su equipo ya puede ver sus turnos del ${week}.`,
  publishedCount: (done: number, total: number) => `${done} de ${total} locales publicados`,
  publishedCountLine: "Su equipo puede ver esos. Los demás no están publicados.",
  backHome: "Volver a Inicio",
  sendUpdate: "Enviar un aviso",
  batchAllApproved: (count: number) => count === 1 ? "1 registro de horas aprobado" : `${count} registros de horas aprobados`,
  batchAllFinalized: (count: number) => count === 1 ? "1 registro de horas finalizado" : `${count} registros de horas finalizados`,
  batchLine: "Actualice los registros antes de revisar otro grupo.",
  batchWord: { approved: "Aprobado", finalized: "Finalizado", blocked: "Bloqueado", conflict: "Cambió. Revíselo de nuevo", unavailable: "No disponible", denied: "No permitido", "outcome-unknown": "Sin confirmar", "not-submitted": "No enviado" },
};

export const MOMENTS_COPY = { en, es } as const;
export type MomentsCopy = typeof en;
export function momentsCopy(lang: MomentsLang = "en"): MomentsCopy { return MOMENTS_COPY[lang]; }
