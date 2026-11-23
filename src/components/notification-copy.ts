/* Signed-in Spanish (es-rest): the Owner's and Manager's Notifications (notifications-manager-b.tsx) and the row words it
 * shares with notification-inbox.tsx, in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case,
 * "Pendientes" for Things to do). The English is word for word what the screens said before. */
import type {PortalLang} from '@/lib/i18n/portal-lang';
import {relativeTimeText} from '@/lib/duration-format';

const en = {
  title: 'Notifications',
  /** The band's title: one long Spanish word, so it may break at its soft hyphen at 390 with 200% text. */
  bandTitle: 'Notifications', home: 'Home', settings: 'Settings', show: 'Show notifications', all: 'All', unread: 'Unread',
  groups: {Today: 'Today', Yesterday: 'Yesterday', Earlier: 'Earlier'} as Record<string, string>,
  groupList: (group: string) => `${group} notifications`,
  reviewUnread: 'Unread',
  pausedTitle: 'Notifications paused', pausedLine: 'Come back to this window while online.',
  sessionTitle: 'Your session ended', sessionLine: 'Sign in again to see notifications.', signIn: 'Sign in',
  failedTitle: 'Notifications didn’t load', offlineLine: 'Check your connection, then try again.', tryAgain: 'Try again',
  loading: 'Loading notifications…',
  partial: 'Some notifications couldn’t be checked.',
  caughtUp: 'You’re all caught up', nothingNew: 'Nothing new',
  nothingUnread: 'Nothing unread. Earlier notifications stay under All.', requestsThere: 'Requests from your team are in Things to do.',
  openThingsToDo: 'Open Things to do',
  readFailed: 'We couldn’t mark that one read.',
  count: (n: number, unread: boolean) => `${n} ${n === 1 ? 'notification' : 'notifications'}${unread ? ' unread' : ''}`,
  foldCount: (n: number) => `${n}\u00a0notifications`, latest: 'latest',
  foldUnread: (n: number) => `, ${n} unread`,
  foldList: (title: string, n: number) => `${title}, ${n} notifications`,
  summaryWords: (n: number) => `${n} ${n === 1 ? 'item was' : 'items were'} waiting`,
  summaryScope: 'Open shifts, requests or missing availability',
};
const es: typeof en = {
  title: 'Notificaciones', bandTitle: 'Notifica\u00adciones', home: 'Inicio', settings: 'Configuración', show: 'Mostrar notificaciones', all: 'Todas', unread: 'Sin leer',
  groups: {Today: 'Hoy', Yesterday: 'Ayer', Earlier: 'Antes'},
  groupList: (group: string) => `Notificaciones de ${group.toLowerCase()}`,
  reviewUnread: 'Sin leer',
  pausedTitle: 'Notificaciones en pausa', pausedLine: 'Vuelve a esta ventana cuando tengas conexión.',
  sessionTitle: 'Tu sesión terminó', sessionLine: 'Inicia sesión de nuevo para ver las notificaciones.', signIn: 'Iniciar sesión',
  failedTitle: 'Las notificaciones no cargaron', offlineLine: 'Revisa tu conexión e inténtalo de nuevo.', tryAgain: 'Intentar de nuevo',
  loading: 'Cargando notificaciones…',
  partial: 'No pudimos verificar algunas notificaciones.',
  caughtUp: 'Estás al día', nothingNew: 'Nada nuevo',
  nothingUnread: 'Nada sin leer. Las anteriores siguen en Todas.', requestsThere: 'Las solicitudes de tu equipo están en Pendientes.',
  openThingsToDo: 'Abrir Pendientes',
  readFailed: 'No pudimos marcarla como leída.',
  count: (n: number, unread: boolean) => `${n} ${n === 1 ? 'notificación' : 'notificaciones'}${unread ? ' sin leer' : ''}`,
  foldCount: (n: number) => `${n}\u00a0notificaciones`, latest: 'última',
  foldUnread: (n: number) => `, ${n} sin leer`,
  foldList: (title: string, n: number) => `${title}, ${n} notificaciones`,
  summaryWords: (n: number) => `${n} ${n === 1 ? 'asunto estaba' : 'asuntos estaban'} en espera`,
  summaryScope: 'Turnos disponibles, solicitudes o disponibilidad sin enviar',
};
export const NOTIFICATION_COPY = {en, es};

/** "5 h ago" in the person's language: the same rule as relativeTimeText, in Spanish "hace 5 h", "Ayer", "sábado", "14 nov". */
export function relativeTimeFor(lang: PortalLang, at: string, timeZone?: string, now: Date = new Date()) {
  const text = relativeTimeText(at, now, timeZone);
  if (lang !== 'es') return text;
  if (text === 'Just now') return 'Ahora mismo';
  if (text === 'Yesterday') return 'Ayer';
  const ago = /^(\d+) (min|h) ago$/.exec(text);
  if (ago) return `hace ${ago[1]} ${ago[2]}`;
  const date = new Date(at), zone = timeZone ? {timeZone} : {};
  if (/^[A-Z][a-z]+day$/.test(text)) return new Intl.DateTimeFormat('es-PR', {weekday: 'long', ...zone}).format(date);
  return new Intl.DateTimeFormat('es-PR', {month: 'short', day: 'numeric', ...(/\d{4}$/.test(text) ? {year: 'numeric' as const} : {}), ...zone}).format(date);
}
