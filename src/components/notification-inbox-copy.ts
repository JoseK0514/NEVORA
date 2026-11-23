/* Signed-in Spanish (Nov 23, 2026, second release): every word notification-inbox.tsx draws itself, for the Quiet list
 * (Employees, Leads, and Owners and Managers through the account panel) and the older full inbox, in English and Puerto
 * Rico Spanish (docs/design/voice.md: tú; glossary: Pendientes, Avisos, Días libres). English is word for word what the
 * screen said before. Row titles, groups and facts come from the lib helpers, which take the same language. */
import type {NotificationActionState, NotificationReviewState} from '@/lib/employee-view';
import type {NotificationFilter} from '@/lib/notification-inbox-view';

export type InboxLang = 'en' | 'es';

const en = {
  locale: 'en-US',
  review: {unread: 'Unread', read: 'Read', confirmed: 'Confirmed', unavailable: 'Review status unavailable'} as Record<NotificationReviewState, string>,
  action: {required: 'Action required', available: 'Action available', complete: 'Action complete', none: 'No action required', unavailable: 'Action status unavailable'} as Record<NotificationActionState, string>,
  filters: {all: 'All', unread: 'Unread', required: 'Needs action'} as Record<NotificationFilter, string>,
  marked: 'Marked read. Announcement acknowledgement and request actions are unchanged.',
  markFailed: 'We could not confirm the read status. Refresh to check it, or safely retry marking it read.',
  // Quiet list
  section: 'Notifications', filterLabel: 'Filter notifications', all: 'All', unread: 'Unread', unreadCount: (n: number) => `Unread, ${n}`,
  count: (n: number, unread: boolean) => `${n} ${n === 1 ? 'notification' : 'notifications'}${unread ? ' unread' : ''}`,
  pausedTitle: 'Updates paused', sessionTitle: 'Your session ended', failedTitle: 'Notifications didn’t load', loading: 'Loading…',
  pausedLine: 'Come back to this window while online.', sessionLine: 'Sign in again to see notifications.', offlineLine: 'Check your connection, then try again.',
  signIn: 'Sign in', tryAgain: 'Try again',
  partial: 'Some notifications couldn’t be checked.',
  foldCount: (n: number) => `${n} notifications`, latest: 'latest',
  foldLabel: (title: string, n: number, unread: number, when: string) => `${title}, ${n} notifications${unread ? `, ${unread} unread` : ''}, latest ${when}`,
  foldList: (title: string, n: number) => `${title}, ${n} notifications`,
  caughtUpTitle: 'You’re all caught up', nothingNew: 'Nothing new',
  nothingUnread: 'Nothing unread. Earlier notifications stay under All.', requestsThere: 'Requests from your team are in Things to do.', openThingsToDo: 'Open Things to do',
  caughtUp: 'You’re all caught up.', noneYet: 'No notifications yet.',
  readFailed: 'We couldn’t mark that one read.', notComplete: 'Opening one doesn’t complete it.',
  // Full inbox
  alerts: 'Your alerts', helper: 'Review an update. Take the next step.', checking: 'Checking…', refresh: 'Refresh',
  partialStrong: 'Some updates could not be checked.', partialLine: 'Some notifications are unavailable or outside this bounded view. Retry to check current access.',
  search: 'Search notifications', searchPlaceholder: 'Search this inbox',
  viewCount: (n: number, filter: NotificationFilter) => `${n} ${n === 1 ? 'notification' : 'notifications'} in this view${filter === 'required' ? ' · Action required' : filter === 'unread' ? ' · Unread' : ''}`,
  markReadFor: (title: string) => `Mark ${title} read`, marking: 'Marking read…', markRead: 'Mark read',
  emptySearch: 'No matching notifications', emptyUnread: 'No unread notifications in this view', emptyRequired: 'No notifications requiring action in this view',
  emptyHere: 'No notifications here.', emptyAvailable: 'No available notifications to show',
  emptySearchLine: 'Try another search, or clear it to see your updates.', emptyPartialLine: 'This view is incomplete. Retry to check what is available.',
  emptyLine: 'Check Requests and Schedule for their current status.', clearSearch: 'Clear search', viewAll: 'View all notifications',
  footer: 'Updates about your requests and schedule. Opening one doesn’t complete its action.', requests: 'Requests', schedule: 'Schedule',
  loadingNotifications: 'Loading notifications…',
  pausedFullLine: 'Return to this window while online to check current information.', checkingAccess: 'Checking your current access.',
};

export type InboxCopy = typeof en;

const es: InboxCopy = {
  locale: 'es-PR',
  review: {unread: 'Sin leer', read: 'Leída', confirmed: 'Confirmada', unavailable: 'Estado de lectura no disponible'},
  action: {required: 'Requiere acción', available: 'Acción disponible', complete: 'Acción completada', none: 'No requiere acción', unavailable: 'Estado de la acción no disponible'},
  filters: {all: 'Todas', unread: 'Sin leer', required: 'Requieren acción'},
  marked: 'Marcada como leída. La confirmación de avisos y las acciones de las solicitudes no cambian.',
  markFailed: 'No pudimos confirmar el estado de lectura. Actualiza para verificarlo, o vuelve a marcarla como leída sin problema.',
  section: 'Notificaciones', filterLabel: 'Filtrar notificaciones', all: 'Todas', unread: 'Sin leer', unreadCount: n => `Sin leer, ${n}`,
  count: (n, unread) => `${n} ${n === 1 ? 'notificación' : 'notificaciones'}${unread ? ' sin leer' : ''}`,
  pausedTitle: 'Actualizaciones en pausa', sessionTitle: 'Tu sesión terminó', failedTitle: 'No pudimos cargar las notificaciones', loading: 'Cargando…',
  pausedLine: 'Vuelve a esta ventana cuando tengas conexión.', sessionLine: 'Inicia sesión otra vez para ver las notificaciones.', offlineLine: 'Revisa tu conexión e inténtalo de nuevo.',
  signIn: 'Iniciar sesión', tryAgain: 'Intentar de nuevo',
  partial: 'No pudimos verificar algunas notificaciones.',
  foldCount: n => `${n} notificaciones`, latest: 'última',
  foldLabel: (title, n, unread, when) => `${title}, ${n} notificaciones${unread ? `, ${unread} sin leer` : ''}, la última ${when}`,
  foldList: (title, n) => `${title}, ${n} notificaciones`,
  caughtUpTitle: 'Estás al día', nothingNew: 'Nada nuevo',
  nothingUnread: 'Nada sin leer. Las anteriores siguen en Todas.', requestsThere: 'Las solicitudes de tu equipo están en Pendientes.', openThingsToDo: 'Abrir Pendientes',
  caughtUp: 'Estás al día.', noneYet: 'Todavía no tienes notificaciones.',
  readFailed: 'No pudimos marcarla como leída.', notComplete: 'Abrir una no la completa.',
  alerts: 'Tus alertas', helper: 'Revisa un aviso. Da el próximo paso.', checking: 'Verificando…', refresh: 'Actualizar',
  partialStrong: 'No pudimos verificar algunas actualizaciones.', partialLine: 'Algunas notificaciones no están disponibles o están fuera de esta vista. Intenta de nuevo para verificar tu acceso actual.',
  search: 'Buscar notificaciones', searchPlaceholder: 'Buscar en esta lista',
  viewCount: (n, filter) => `${n} ${n === 1 ? 'notificación' : 'notificaciones'} en esta vista${filter === 'required' ? ' · Requiere acción' : filter === 'unread' ? ' · Sin leer' : ''}`,
  markReadFor: title => `Marcar ${title} como leída`, marking: 'Marcando como leída…', markRead: 'Marcar como leída',
  emptySearch: 'Ninguna notificación coincide', emptyUnread: 'No hay notificaciones sin leer en esta vista', emptyRequired: 'No hay notificaciones que requieran acción en esta vista',
  emptyHere: 'No hay notificaciones aquí.', emptyAvailable: 'No hay notificaciones disponibles',
  emptySearchLine: 'Prueba otra búsqueda, o bórrala para ver tus actualizaciones.', emptyPartialLine: 'Esta vista está incompleta. Intenta de nuevo para ver lo disponible.',
  emptyLine: 'Revisa Solicitudes y Horario para ver su estado actual.', clearSearch: 'Borrar búsqueda', viewAll: 'Ver todas las notificaciones',
  footer: 'Actualizaciones sobre tus solicitudes y tu horario. Abrir una no completa su acción.', requests: 'Solicitudes', schedule: 'Horario',
  loadingNotifications: 'Cargando notificaciones…',
  pausedFullLine: 'Vuelve a esta ventana cuando tengas conexión para ver la información actual.', checkingAccess: 'Verificando tu acceso actual.',
};

export const INBOX_COPY: Record<InboxLang, InboxCopy> = {en, es};

/** "Tuesday, November 24, 9:02 AM" · "martes, 24 de noviembre, 9:02 a. m." in the workplace zone. */
export function whenLongFor(lang: InboxLang, at: string, timeZone?: string) {
  const text = new Intl.DateTimeFormat(INBOX_COPY[lang].locale, {weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', ...(timeZone ? {timeZone} : {})}).format(new Date(at));
  return lang === 'es' ? spanishClock(text) : text;
}
/** A row's clock time: "9:02 AM" · "9:02 a. m.". */
export function clockFor(lang: InboxLang, at: string, timeZone?: string) {
  const text = new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit', ...(timeZone ? {timeZone} : {})}).format(new Date(at));
  return lang === 'es' ? spanishClock(text) : text;
}
/** ICU writes "a.m." or "a. m." depending on the build; NEVORA writes "a. m." (voice.md). */
function spanishClock(text: string) {
  return text.replace(/\b(a|p)\.?[\s  ]?m\.?(?=$|[\s,])/gi, (_, half: string) => `${half.toLowerCase()}. m.`).replace(/[\s ]?\b(AM|PM)\b/g, (_, half: string) => ` ${half === 'AM' ? 'a' : 'p'}. m.`);
}
