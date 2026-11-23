/* Signed-in Spanish (es-rest): the words Home's route itself writes (its title, the unavailable and error states, the
 * location menu and greeting of a location Manager's Home), in English and Puerto Rico Spanish. The Home screens' own
 * words belong to their components. */
const en = {
  title: 'Home · NEVORA',
  unavailable: 'Home unavailable',
  location: 'Location',
  locationIs: (place: string) => `Location: ${place}`,
  allLocations: 'All your locations',
  welcome: (first: string) => `Welcome back, ${first}`,
  locale: 'en-US',
  didntLoad: 'This page didn’t load',
  nothingChanged: 'Nothing was changed.',
  spoken: 'This page didn’t load. Nothing was changed. Check your connection, then try again.',
  checkConnection: 'Check your connection, then try again.',
  backHome: 'Back to Home',
  notFound: 'Page not found',
};
const es: typeof en = {
  title: 'Inicio · NEVORA',
  unavailable: 'Inicio no disponible',
  location: 'Localidad',
  locationIs: (place: string) => `Localidad: ${place}`,
  allLocations: 'Todas tus localidades',
  welcome: (first: string) => `Hola de nuevo, ${first}`,
  locale: 'es-PR',
  didntLoad: 'Esta página no cargó',
  nothingChanged: 'No se cambió nada.',
  spoken: 'Esta página no cargó. No se cambió nada. Revisa tu conexión e inténtalo de nuevo.',
  checkConnection: 'Revisa tu conexión e inténtalo de nuevo.',
  backHome: 'Volver a Inicio',
  notFound: 'Página no encontrada',
};
export const HOME_PAGE_COPY = {en, es};
