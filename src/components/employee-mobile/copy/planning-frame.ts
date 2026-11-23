/* Signed-in Spanish (Nov 23, 2026): the words on the Employee planning pages' frame (planning-frame.tsx: Time off and
 * Availability), in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: "Días
 * libres", "Disponibilidad", "Iniciar sesión", "Intentar de nuevo", "Cancelar"). English is byte for byte what the frame
 * said before. The read states name the page's own subject; Spanish needs the whole sentence per subject ("tu
 * disponibilidad" is singular, "tus días libres" plural), so each state is a function of the page. */
export type PlanningSubject = 'availability' | 'timeoff';
/** The Availability page's title in each language: the frame tells its subject from the title the page passes. */
export const planningTitle = {en: 'Availability', es: 'Disponibilidad'};
const en = {
  requests: 'Requests', cancel: 'Cancel', access: 'Planning access',
  paused: (subject: PlanningSubject) => `${subject === 'availability' ? 'Availability' : 'Time off'} is paused. Return to this page or reconnect to refresh.`,
  denied: 'Your access changed. Sign in again to continue.',
  loading: (subject: PlanningSubject) => `Loading your ${subject === 'availability' ? 'availability' : 'time off'}…`,
  failed: (subject: PlanningSubject) => `Your ${subject === 'availability' ? 'availability' : 'time off'} didn’t load.`,
  signIn: 'Sign in', tryAgain: 'Try again',
};
const es: typeof en = {
  requests: 'Solicitudes', cancel: 'Cancelar', access: 'Acceso a la planificación',
  paused: (subject: PlanningSubject) => `${subject === 'availability' ? 'Tu disponibilidad está' : 'Tus días libres están'} en pausa. Vuelve a esta página o reconéctate para actualizar.`,
  denied: 'Tu acceso cambió. Inicia sesión de nuevo para continuar.',
  loading: (subject: PlanningSubject) => `Cargando ${subject === 'availability' ? 'tu disponibilidad' : 'tus días libres'}…`,
  failed: (subject: PlanningSubject) => `No pudimos cargar ${subject === 'availability' ? 'tu disponibilidad' : 'tus días libres'}.`,
  signIn: 'Iniciar sesión', tryAgain: 'Intentar de nuevo',
};
export const planningFrameCopy = {en, es};
