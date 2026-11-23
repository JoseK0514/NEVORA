/* Signed-in Spanish (Nov 23, 2026): the words on Profile's "Personal info" card (profile-view.tsx), in English and Puerto
 * Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: "localidad", "Iniciar sesión", "Intentar de
 * nuevo"). English is byte for byte what the card said before. The time zone row shows the zone's place name, which
 * reads the same in both languages. */
const en = {
  personalInfo: 'Personal info', workProfile: 'Your work profile',
  name: 'Name', employeeId: 'Employee ID', signInWithId: 'You sign in with this ID.', locations: 'Locations', timeZone: 'Time zone',
  paused: 'Profile paused. Return to this window while online to refresh.',
  denied: 'Your access changed. Sign in again to check your current details.',
  checking: 'Checking your current work details…',
  failed: 'We couldn’t load your details.',
  signIn: 'Sign in', tryAgain: 'Try again',
};
const es: typeof en = {
  personalInfo: 'Información personal', workProfile: 'Tu perfil de trabajo',
  name: 'Nombre', employeeId: 'ID de empleado', signInWithId: 'Inicias sesión con este ID.', locations: 'Localidades', timeZone: 'Zona horaria',
  paused: 'Perfil en pausa. Vuelve a esta ventana con conexión para actualizar.',
  denied: 'Tu acceso cambió. Inicia sesión de nuevo para ver tus datos actuales.',
  checking: 'Verificando tus datos de trabajo actuales…',
  failed: 'No pudimos cargar tus datos.',
  signIn: 'Iniciar sesión', tryAgain: 'Intentar de nuevo',
};
export const profileViewCopy = {en, es};
