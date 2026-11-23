/* Signed-in Spanish (es-rest): the Owner's and Manager's Profile in English and Puerto Rico Spanish (docs/design/voice.md:
 * tú, Dueño, Nómina, localidad, Días libres, Marcación, "No puedo trabajar"). The English is word for word what the
 * Profile said before. */
import type {ManagerAlertTopic} from './contract';

const en = {
  more: 'More', edit: 'Edit',
  owner: 'Owner', manager: 'Manager',
  closed: 'Payroll and Settings are for Owners.',
  allPlaces: (word: string) => `All ${word}`,
  coversAll: (closed: string) => `Schedule, time, team and requests. ${closed}`,
  coversSome: (word: string, closed: string) => `Schedule and team at your ${word}. ${closed}`,
  offline: 'You’re offline', paused: 'Updates paused', checking: 'Checking…',
  deniedRow: 'Sign in to see this', deniedSaid: 'Your session ended. Sign in again to see your contact details, locations and alert choices.',
  failedRow: 'Couldn’t load', failedSaid: 'We couldn’t load your contact details, locations and alert choices.',
  stillFailed: 'Still couldn’t load your contact details, locations and alert choices.',
  notShown: 'Not shown yet',
  notSavedOffline: 'Not saved. You’re offline.', notSavedSignIn: 'Not saved. Sign in again.', notSavedRetry: 'Not saved. Try again.',
  saving: 'Saving…',
  noteOffline: 'You’re offline. Your alert choices show again when you’re back online.',
  notePaused: 'Updates paused. Your alert choices show again when you come back to this window.',
  noteDenied: 'Your session ended. Sign in again to see your alert choices.', noteFailed: 'Your alert choices couldn’t load.',
  changeLine: (who: string | null | undefined) => `${who || 'An Owner'} can change this`,
  loaded: 'Your details loaded.', details: 'Your details',
  phone: 'Phone', email: 'Email', notAdded: 'Not added', timeZone: 'Time zone', access: 'Access',
  tryAgain: 'Try again', tryingAgain: 'Trying again…', signIn: 'Sign in',
  notificationsAndAccount: 'Notifications and account', notifications: 'Notifications', on: 'On', off: 'Off',
  toldAbout: 'You’re told about', allNotifications: 'All notifications',
  alertsOnThis: 'Alerts on this ', thisPhone: 'phone', thisDevice: 'device',
  /** The approved topics (CODEX.md) by id: the read's own words are used unless they are these English ones. */
  topics: {
    'time-off': {label: 'Time-off requests', detail: 'When someone asks for time off'},
    'shift-changes': {label: 'Shift requests', detail: 'When someone asks to swap or give up a shift'},
    'unable-to-work': {label: 'Can’t work', detail: 'When someone can’t make a shift'},
    'clock-review': {label: 'Clock-ins to review', detail: 'When a clock-in needs your review'},
    'payroll-ready': {label: 'Payroll ready to review', detail: 'When a pay period is ready for you'},
  } as Record<string, {label: string; detail: string}>,
};
const es: typeof en = {
  more: 'Más', edit: 'Editar',
  owner: 'Dueño', manager: 'Gerente',
  closed: 'La nómina y la configuración son para los dueños.',
  allPlaces: (word: string) => `${/^(restaurantes)$/i.test(word) ? 'Todos los' : 'Todas las'} ${word}`,
  coversAll: (closed: string) => `Horario, tiempo, equipo y solicitudes. ${closed}`,
  coversSome: (word: string, closed: string) => `Horario y equipo en tus ${word}. ${closed}`,
  offline: 'Estás sin conexión', paused: 'Actualizaciones en pausa', checking: 'Verificando…',
  deniedRow: 'Inicia sesión para verlo', deniedSaid: 'Tu sesión terminó. Inicia sesión de nuevo para ver tus datos de contacto, localidades y alertas.',
  failedRow: 'No cargó', failedSaid: 'No pudimos cargar tus datos de contacto, localidades y alertas.',
  stillFailed: 'Aún no pudimos cargar tus datos de contacto, localidades y alertas.',
  notShown: 'Aún no se muestra',
  notSavedOffline: 'No se guardó. Estás sin conexión.', notSavedSignIn: 'No se guardó. Inicia sesión de nuevo.', notSavedRetry: 'No se guardó. Inténtalo de nuevo.',
  saving: 'Guardando…',
  noteOffline: 'Estás sin conexión. Tus alertas se mostrarán cuando vuelvas a conectarte.',
  notePaused: 'Actualizaciones en pausa. Tus alertas se mostrarán cuando vuelvas a esta ventana.',
  noteDenied: 'Tu sesión terminó. Inicia sesión de nuevo para ver tus alertas.', noteFailed: 'Tus alertas no cargaron.',
  changeLine: (who: string | null | undefined) => `${who || 'Un dueño'} puede cambiarlo`,
  loaded: 'Tus datos cargaron.', details: 'Tus datos',
  phone: 'Teléfono', email: 'Correo', notAdded: 'Sin añadir', timeZone: 'Zona horaria', access: 'Acceso',
  tryAgain: 'Intentar de nuevo', tryingAgain: 'Intentando de nuevo…', signIn: 'Iniciar sesión',
  notificationsAndAccount: 'Notificaciones y cuenta', notifications: 'Notificaciones', on: 'Activadas', off: 'Desactivadas',
  toldAbout: 'Te avisamos sobre', allNotifications: 'Todas las notificaciones',
  alertsOnThis: 'Alertas en este ', thisPhone: 'teléfono', thisDevice: 'dispositivo',
  topics: {
    'time-off': {label: 'Solicitudes de días libres', detail: 'Cuando alguien pide días libres'},
    'shift-changes': {label: 'Solicitudes de turnos', detail: 'Cuando alguien pide cambiar o ceder un turno'},
    'unable-to-work': {label: 'No puedo trabajar', detail: 'Cuando alguien no puede trabajar un turno'},
    'clock-review': {label: 'Marcaciones por revisar', detail: 'Cuando una marcación necesita tu revisión'},
    'payroll-ready': {label: 'Nómina lista para revisar', detail: 'Cuando un período de pago está listo para ti'},
  },
};
export const MANAGER_PROFILE_COPY = {en, es};
export type ManagerProfileWords = typeof en;

/** A topic in the person's language: the approved Spanish when the read sent the approved English, else the read's words. */
export function topicWords(topic: ManagerAlertTopic, t: ManagerProfileWords): ManagerAlertTopic {
  const known = en.topics[topic.id], mine = t.topics[topic.id];
  return known && mine && known.label === topic.label && known.detail === topic.detail ? {...topic, label: mine.label, detail: mine.detail} : topic;
}
