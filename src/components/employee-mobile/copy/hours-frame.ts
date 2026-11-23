/* Signed-in Spanish (Nov 23, 2026): the older Hours frame (hours-frame.tsx: its tabs and the status shown before the
 * private read is ready) in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary:
 * "Tarjetas de tiempo", "Iniciar sesión", "Intentar de nuevo", "Verificando…"). */
const en = {
  pastTimecards: 'Past timecards',
  yourTime: 'Your time', hours: 'Hours', timecards: 'Timecards', corrections: 'Corrections',
  timeAccess: 'Time access',
  paused: 'Your time records are paused. Return to this page or reconnect to refresh.',
  denied: 'Your access changed. Sign in again to continue.',
  checkingRecords: 'Checking your current time records…',
  failed: 'Your records couldn’t be checked.',
  signIn: 'Sign in', checking: 'Checking…', tryAgain: 'Try again',
};
const es: typeof en = {
  pastTimecards: 'Tarjetas anteriores',
  yourTime: 'Tu tiempo', hours: 'Horas', timecards: 'Tarjetas de tiempo', corrections: 'Correcciones',
  timeAccess: 'Acceso a tu tiempo',
  paused: 'Tus registros de tiempo están en pausa. Vuelve a esta página o reconéctate para actualizar.',
  denied: 'Tu acceso cambió. Inicia sesión de nuevo para continuar.',
  checkingRecords: 'Verificando tus registros de tiempo actuales…',
  failed: 'No pudimos verificar tus registros.',
  signIn: 'Iniciar sesión', checking: 'Verificando…', tryAgain: 'Intentar de nuevo',
};
export const hoursFrameCopy = {en, es};
