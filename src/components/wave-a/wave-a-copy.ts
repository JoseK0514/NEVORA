/* Signed-in Spanish (es-rest): the Wave A form parts' own words (offline-notice.tsx, action-form.tsx), English as written
 * and Puerto Rico Spanish. */
const en = {
  offlineTitle: 'You’re offline',
  offlineBody: 'Nothing can be sent until you’re back online. What you’ve entered stays here.',
  unconfirmed: 'This change could not be confirmed. Review the current schedule before making another change; it may already have completed.',
  deletionUnknown: 'Deletion outcome unknown',
};
const es: typeof en = {
  offlineTitle: 'No tienes conexión',
  offlineBody: 'No se puede enviar nada hasta que vuelvas a tener conexión. Lo que ingresaste se queda aquí.',
  unconfirmed: 'No pudimos confirmar este cambio. Revisa el horario actual antes de hacer otro cambio; puede que ya se haya completado.',
  deletionUnknown: 'No sabemos si se borró',
};
export const WAVE_A_COPY = { en, es };
