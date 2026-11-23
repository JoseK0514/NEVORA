/* Signed-in Spanish (Nov 23, 2026): the Employee Time and Hours pages' own words (hours.tsx: titles, back links, loading
 * and redirect lines, and the messages it hands to the shared Time screens) in English and Puerto Rico Spanish
 * (docs/design/voice.md: tú, sentence case, the glossary: "Tarjeta de tiempo", "Solicitud de corrección", "gerente",
 * "Marcación", "Descanso", "Pago"; buttons in the infinitive). The page names its tab "Time" or "Hours" and Pay's link
 * "Pay"; `tabName` gives those names in the person's language and leaves any other name as it is. */
const namesEs: Record<string, string> = {Time: 'Tiempo', Hours: 'Horas', Pay: 'Pago'};
const en = {
  tabName: (name: string) => name,
  loadingTime: 'Loading your time…',
  openingTimecards: 'Opening your timecards…', openMyTimecards: 'Open my timecards', openPastTimecards: 'Open Past timecards',
  loadingTimecards: 'Loading your timecards…',
  requestMissing: 'Request missing time', requestCorrection: 'Request a correction', yourRequest: 'Your correction request',
  timeEntry: 'Time entry', pastTimecards: 'Past timecards', timecards: 'Timecards', corrections: 'Corrections',
  subEdit: 'The times you want your manager to review', subRequest: 'Recorded, requested and current times',
  subCards: 'Your effective hours and review history', subCorrections: 'Your requests and manager decisions',
  subRecords: 'Your punches, breaks and recorded time',
  time: 'Time', week: 'Week', back: 'Back', cancel: 'Cancel', timecardDay: 'Timecard day',
  yourRequests: 'Your correction requests', fixMyTime: 'Fix my time', sentForReview: 'Sent to your manager for review',
  earlierPending: 'An earlier correction request still needs to be checked. Return to it before starting a new one.',
  checkEarlier: 'Check your earlier request',
  notConfigured: 'Recorded time isn’t available for this account.',
  schemaMissing: 'Recorded time isn’t available yet.',
  readFailed: 'Your recorded time couldn’t be checked.',
  dayMissing: 'This day isn’t in your recent time. Past timecards has older weeks.',
  timeDidntLoad: 'Your time didn’t load. Go back to Time and try again.',
  sourcesFailed: 'Your correction sources couldn’t be checked. Return to Hours to review your records.',
};
const es: typeof en = {
  tabName: (name: string) => namesEs[name] ?? name,
  loadingTime: 'Cargando tu tiempo…',
  openingTimecards: 'Abriendo tus tarjetas de tiempo…', openMyTimecards: 'Abrir mis tarjetas de tiempo', openPastTimecards: 'Abrir tarjetas anteriores',
  loadingTimecards: 'Cargando tus tarjetas de tiempo…',
  requestMissing: 'Solicitar tiempo sin registrar', requestCorrection: 'Solicitar una corrección', yourRequest: 'Tu solicitud de corrección',
  timeEntry: 'Entrada de tiempo', pastTimecards: 'Tarjetas anteriores', timecards: 'Tarjetas de tiempo', corrections: 'Correcciones',
  subEdit: 'Las horas que quieres que tu gerente revise', subRequest: 'Horas registradas, solicitadas y actuales',
  subCards: 'Tus horas vigentes y el historial de revisión', subCorrections: 'Tus solicitudes y las decisiones de tu gerente',
  subRecords: 'Tus marcaciones, descansos y tiempo registrado',
  time: 'Tiempo', week: 'Semana', back: 'Atrás', cancel: 'Cancelar', timecardDay: 'Día de la tarjeta',
  yourRequests: 'Tus solicitudes de corrección', fixMyTime: 'Corregir mi tiempo', sentForReview: 'Enviadas a tu gerente para revisión',
  earlierPending: 'Todavía hay que verificar una solicitud de corrección anterior. Vuelve a ella antes de empezar otra.',
  checkEarlier: 'Revisar tu solicitud anterior',
  notConfigured: 'El tiempo registrado no está disponible para esta cuenta.',
  schemaMissing: 'El tiempo registrado todavía no está disponible.',
  readFailed: 'No pudimos verificar tu tiempo registrado.',
  dayMissing: 'Este día no está en tu tiempo reciente. Las semanas anteriores están en Tarjetas anteriores.',
  timeDidntLoad: 'No pudimos cargar tu tiempo. Vuelve a Tiempo e inténtalo de nuevo.',
  sourcesFailed: 'No pudimos verificar los datos para tu corrección. Vuelve a Horas para revisar tus registros.',
};
export const hoursCopy = {en, es};
