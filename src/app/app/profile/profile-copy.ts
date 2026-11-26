/* Signed-in Spanish (es-rest): Profile's own route words (titles, the closed calendar page and the back links) in English
 * and Puerto Rico Spanish. The English is word for word what the pages said before; the screens they draw keep their own
 * copy, and the policy documents stay out of this pass. */
const en = {
  // src/app/app/profile/page.tsx:4
  profile: 'Profile',
  // src/components/owner-only-notice.tsx:29
  home: 'Home',
  // src/app/app/profile/calendar/page.tsx:7
  calendar: 'Add to calendar',
  // src/app/app/profile/calendar/page.tsx:11
  calendarReason: 'Calendar links are for Employees and Leads',
  // src/app/app/profile/calendar/page.tsx:11
  calendarHelp: 'They add a person’s own published shifts to their calendar.',
  // src/app/app/profile/calendar/page.tsx:11
  goToProfile: 'Go to Profile',
  // src/app/app/profile/calendar/page.tsx:13
  more: 'More',
  // src/app/app/profile/passkeys/page.tsx:9
  passkeys: 'Passkeys',
  // src/app/app/profile/device-alerts/page.tsx:8
  deviceAlerts: 'Alerts on this device',
};
const es: typeof en = {
  // src/app/app/profile/page.tsx:4
  profile: 'Perfil',
  // src/components/owner-only-notice.tsx:29
  home: 'Inicio',
  // src/app/app/profile/calendar/page.tsx:7
  calendar: 'Añadir al calendario',
  // src/app/app/profile/calendar/page.tsx:11
  calendarReason: 'Los enlaces de calendario son para empleados y líderes',
  // src/app/app/profile/calendar/page.tsx:11
  calendarHelp: 'Añaden al calendario los turnos publicados de cada persona.',
  // src/app/app/profile/calendar/page.tsx:11
  goToProfile: 'Ir al perfil',
  // src/app/app/profile/calendar/page.tsx:13
  more: 'Más',
  // src/app/app/profile/passkeys/page.tsx:9
  passkeys: 'Llaves de acceso',
  // src/app/app/profile/device-alerts/page.tsx:8
  deviceAlerts: 'Alertas en este dispositivo',
};
export const PROFILE_COPY = {en, es} as const;
