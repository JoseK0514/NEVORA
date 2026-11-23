/* Signed-in Spanish (es-rest): Profile's own route words (titles, the closed calendar page and the back links) in English
 * and Puerto Rico Spanish. The English is word for word what the pages said before; the screens they draw keep their own
 * copy, and the policy documents stay out of this pass. */
const en = {
  profile: 'Profile', calendar: 'Add to calendar', calendarReason: 'Calendar links are for Employees and Leads',
  calendarHelp: 'They add a person’s own published shifts to their calendar.', goToProfile: 'Go to Profile', more: 'More',
  passkeys: 'Passkeys', deviceAlerts: 'Alerts on this device',
};
const es: typeof en = {
  profile: 'Perfil', calendar: 'Añadir al calendario', calendarReason: 'Los enlaces de calendario son para empleados y líderes',
  calendarHelp: 'Añaden al calendario los turnos publicados de cada persona.', goToProfile: 'Ir al perfil', more: 'Más',
  passkeys: 'Llaves de acceso', deviceAlerts: 'Alertas en este dispositivo',
};
export const PROFILE_COPY = {en, es};
