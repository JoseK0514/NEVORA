/* Signed-in Spanish (es-rest): the words of the portal's error screens (app-error-screen.tsx, wave-a/route-error.tsx),
 * English as written and Puerto Rico Spanish (docs/design/voice.md: what happened, then what to do). Outside the
 * signed-in app's language provider these read English. */
const en = {
  adviceOnline: 'Something went wrong on our side. Try again.',
  adviceOffline: 'Check your connection, then try again.',
  didntLoad: 'This page didn’t load',
  nothingChanged: 'Nothing was changed.',
  spoken: (advice: string, reference: string | null) => `This page didn’t load. Nothing was changed. ${advice}${reference ? ` Reference: ${reference}` : ''}`,
  reference: (reference: string) => `Reference: ${reference}`,
  tryAgain: 'Try again',
  /** Try again while the page is read again (Nov 26, 2026). */
  tryingAgain: 'Trying again…',
  goHome: 'Go to Home',
  routeOnline: 'Something went wrong on our side. Nothing was changed.',
  routeOffline: 'You’re offline. Nothing was changed.',
  titleDidntLoad: (title: string, line: string) => `${title} didn’t load. ${line}`,
};
const es: typeof en = {
  adviceOnline: 'Algo falló de nuestro lado. Inténtalo de nuevo.',
  adviceOffline: 'Revisa tu conexión y vuelve a intentarlo.',
  didntLoad: 'Esta página no cargó',
  nothingChanged: 'No se cambió nada.',
  spoken: (advice: string, reference: string | null) => `Esta página no cargó. No se cambió nada. ${advice}${reference ? ` Referencia: ${reference}` : ''}`,
  reference: (reference: string) => `Referencia: ${reference}`,
  tryAgain: 'Intentar de nuevo',
  tryingAgain: 'Intentando de nuevo…',
  goHome: 'Ir a Inicio',
  routeOnline: 'Algo falló de nuestro lado. No se cambió nada.',
  routeOffline: 'No tienes conexión. No se cambió nada.',
  titleDidntLoad: (title: string, line: string) => `${title} no cargó. ${line}`,
};
export const ERROR_SCREENS_COPY = { en, es };
