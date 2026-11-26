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

export const copy = {
  en: {
    // src/components/notification-inbox.tsx:40, src/components/notification-inbox.tsx:42, src/components/notification-inbox.tsx:134
    unread: 'Unread',
    // src/components/notification-inbox.tsx:40
    read: 'Read',
    // src/components/notification-inbox.tsx:40
    confirmed: 'Confirmed',
    // src/components/notification-inbox.tsx:40
    unavailable: 'Review status unavailable',
    // src/components/notification-inbox.tsx:41
    required: 'Action required',
    // src/components/notification-inbox.tsx:41
    available: 'Action available',
    // src/components/notification-inbox.tsx:41
    complete: 'Action complete',
    // src/components/notification-inbox.tsx:41
    none: 'No action required',
    // src/components/notification-inbox.tsx:41
    unavailable2: 'Action status unavailable',
    // src/components/notification-inbox.tsx:42, src/components/notification-inbox.tsx:133
    all: 'All',
    // src/components/notification-inbox.tsx:42
    unread2: 'unread',
    // src/components/notification-inbox.tsx:42
    needsAction: 'Needs action',
    // src/components/notification-inbox.tsx:53
    openShiftsRequestsMissingAvailability: 'Open shifts, requests or missing availability',
    // src/components/notification-inbox.tsx:55
    itemWasWaitingOne: '{n} item was waiting',
    // src/components/notification-inbox.tsx:55
    itemsWereWaitingOther: '{n} items were waiting',
    // src/components/notification-inbox.tsx:71
    markedReadAnnouncementAcknowledgementRequestActions: 'Marked read. Announcement acknowledgement and request actions are unchanged.',
    // src/components/notification-inbox.tsx:71
    weCouldNotConfirmReadStatus: 'We could not confirm the read status. Refresh to check it, or safely retry marking it read.',
    // src/components/notification-inbox.tsx:130, src/components/notification-inbox.tsx:179
    notifications: 'Notifications',
    // src/components/notification-inbox.tsx:132, src/components/notification-inbox.tsx:190
    filterNotifications: 'Filter notifications',
    // src/components/notification-inbox.tsx:134
    unreadLabel: 'Unread, {unread}',
    // src/components/notification-inbox.tsx:136
    notificationUnreadOne: '{sortedCount} notification unread',
    // src/components/notification-inbox.tsx:136
    notificationOne: '{sortedCount} notification',
    // src/components/notification-inbox.tsx:136
    notificationsUnreadOther: '{sortedCount} notifications unread',
    // src/components/notification-inbox.tsx:136
    foldedOther: '{sortedCount} notifications',
    // src/components/notification-inbox.tsx:142, src/components/notification-inbox.tsx:214
    updatesPaused: 'Updates paused',
    // src/components/notification-inbox.tsx:142, src/components/notification-inbox.tsx:214
    endedTitle: 'Your session ended',
    // src/components/notification-inbox.tsx:142, src/components/notification-inbox.tsx:214
    notificationsDidnLoad: 'Notifications didn’t load',
    // src/components/notification-inbox.tsx:142
    loading: 'Loading…',
    // src/components/notification-inbox.tsx:143
    line: 'Come back to this window while online.',
    // src/components/notification-inbox.tsx:143, src/components/notification-inbox.tsx:214
    lineLabel: 'Sign in again to see notifications.',
    // src/components/notification-inbox.tsx:143, src/components/notification-inbox.tsx:214
    checkConnection: 'Check your connection, then try again.',
    // src/components/notification-inbox.tsx:146
    someNotificationsCouldnBeChecked: 'Some notifications couldn’t be checked.',
    // src/components/notification-inbox.tsx:156
    notificationsUnreadLatest: '{title}, {count} notifications, {unreadIdsCount} unread, latest {at}',
    // src/components/notification-inbox.tsx:156
    notificationsLatest: '{title}, {count} notifications, latest {at}',
    // src/components/notification-inbox.tsx:163
    notificationsLabel: '{title}, {count} notifications',
    // src/components/notification-inbox.tsx:168
    caughtUp: 'You’re all caught up',
    // src/components/notification-inbox.tsx:168
    nothingNew: 'Nothing new',
    // src/components/notification-inbox.tsx:169
    nothingUnreadEarlierNotificationsStayUnder: 'Nothing unread. Earlier notifications stay under All.',
    // src/components/notification-inbox.tsx:169
    requestsFromTeamAreInThings: 'Requests from your team are in Things to do.',
    // src/components/notification-inbox.tsx:171
    allCaughtUp: 'You’re all caught up.',
    // src/components/notification-inbox.tsx:171
    noNotificationsYet: 'No notifications yet.',
    // src/components/notification-inbox.tsx:172
    weCouldnMarkOneRead: 'We couldn’t mark that one read.',
    // src/components/notification-inbox.tsx:173
    openingOneDoesnComplete: 'Opening one doesn’t complete it.',
    // src/components/notification-inbox.tsx:181
    alerts: 'Your alerts',
    // src/components/notification-inbox.tsx:181
    reviewUpdateTakeNextStep: 'Review an update. Take the next step.',
    // src/components/notification-inbox.tsx:182
    signIn: 'Sign in',
    // src/components/notification-inbox.tsx:182
    checking: 'Checking…',
    // src/components/notification-inbox.tsx:182
    tryAgain: 'Try again',
    // src/components/notification-inbox.tsx:182
    refresh: 'Refresh',
    // src/components/notification-inbox.tsx:188
    someUpdatesCouldNotBeChecked: 'Some updates could not be checked.',
    // src/components/notification-inbox.tsx:188
    someNotificationsAreUnavailableOutsideBounded: ' Some notifications are unavailable or outside this bounded view. Retry to check current access.',
    // src/components/notification-inbox.tsx:191
    searchNotifications: 'Search notifications',
    // src/components/notification-inbox.tsx:191
    placeholder: 'Search this inbox',
    // src/components/notification-inbox.tsx:193
    notificationInViewActionRequiredOne: '{itemsCount} notification in this view · Action required',
    // src/components/notification-inbox.tsx:193
    notificationInViewUnreadOne: '{itemsCount} notification in this view · Unread',
    // src/components/notification-inbox.tsx:193
    notificationInViewOne: '{itemsCount} notification in this view',
    // src/components/notification-inbox.tsx:193
    notificationsInViewActionRequiredOther: '{itemsCount} notifications in this view · Action required',
    // src/components/notification-inbox.tsx:193
    notificationsInViewUnreadOther: '{itemsCount} notifications in this view · Unread',
    // src/components/notification-inbox.tsx:193
    notificationsInViewOther: '{itemsCount} notifications in this view',
    // src/components/notification-inbox.tsx:206
    markRead: 'Mark {title} read',
    // src/components/notification-inbox.tsx:206
    markingRead: 'Marking read…',
    // src/components/notification-inbox.tsx:206
    markRead2: 'Mark read',
    // src/components/notification-inbox.tsx:209
    noMatchingNotifications: 'No matching notifications',
    // src/components/notification-inbox.tsx:209
    noUnreadNotificationsInView: 'No unread notifications in this view',
    // src/components/notification-inbox.tsx:209
    noNotificationsRequiringActionInView: 'No notifications requiring action in this view',
    // src/components/notification-inbox.tsx:209
    noNotificationsHere: 'No notifications here.',
    // src/components/notification-inbox.tsx:209
    noAvailableNotificationsShow: 'No available notifications to show',
    // src/components/notification-inbox.tsx:210
    tryAnotherSearchClearSeeUpdates: 'Try another search, or clear it to see your updates.',
    // src/components/notification-inbox.tsx:210
    viewIncompleteRetryCheckWhatAvailable: 'This view is incomplete. Retry to check what is available.',
    // src/components/notification-inbox.tsx:210
    checkRequestsScheduleTheirCurrentStatus: 'Check Requests and Schedule for their current status.',
    // src/components/notification-inbox.tsx:211
    pinsClearSearch: 'Clear search',
    // src/components/notification-inbox.tsx:211
    viewAllNotifications: 'View all notifications',
    // src/components/notification-inbox.tsx:213
    updatesAboutRequestsScheduleOpeningOne: 'Updates about your requests and schedule. Opening one doesn’t complete its action.',
    // src/components/notification-inbox.tsx:213
    requests: 'Requests',
    // src/components/notification-inbox.tsx:213
    schedule: 'Schedule',
    // src/components/notification-inbox.tsx:214
    loadingNotifications: 'Loading notifications…',
    // src/components/notification-inbox.tsx:214
    returnWindowWhileOnlineCheckCurrent: 'Return to this window while online to check current information.',
    // src/components/notification-inbox.tsx:214
    checkingCurrentAccess: 'Checking your current access.',
  },
  es: {
    // src/components/notification-inbox.tsx:40, src/components/notification-inbox.tsx:42, src/components/notification-inbox.tsx:134
    unread: 'Sin leer',
    // src/components/notification-inbox.tsx:40
    read: 'Leída',
    // src/components/notification-inbox.tsx:40
    confirmed: 'Confirmado',
    // src/components/notification-inbox.tsx:40
    unavailable: 'Situación de la revisión no disponible',
    // src/components/notification-inbox.tsx:41
    required: 'Medidas necesarias',
    // src/components/notification-inbox.tsx:41
    available: 'Medidas disponibles',
    // src/components/notification-inbox.tsx:41
    complete: 'Acción completa',
    // src/components/notification-inbox.tsx:41
    none: 'No se requiere ninguna medida',
    // src/components/notification-inbox.tsx:41
    unavailable2: 'Estado de la acción no disponible',
    // src/components/notification-inbox.tsx:42, src/components/notification-inbox.tsx:133
    all: 'Todos',
    // src/components/notification-inbox.tsx:42
    unread2: 'sin leer',
    // src/components/notification-inbox.tsx:42
    needsAction: 'Necesidades',
    // src/components/notification-inbox.tsx:53
    openShiftsRequestsMissingAvailability: 'Horarios abiertos, peticiones o disponibilidad perdida',
    // src/components/notification-inbox.tsx:55
    itemWasWaitingOne: 'El artículo {n} estaba esperando',
    // src/components/notification-inbox.tsx:55
    itemsWereWaitingOther: 'Los elementos de {n} estaban esperando',
    // src/components/notification-inbox.tsx:71
    markedReadAnnouncementAcknowledgementRequestActions: 'Lee el aviso y las acciones de solicitud no han cambiado',
    // src/components/notification-inbox.tsx:71
    weCouldNotConfirmReadStatus: 'No pudimos confirmar el estado de lectura. Refrescar para comprobarlo, o volver a intentar con seguridad marcarlo',
    // src/components/notification-inbox.tsx:130, src/components/notification-inbox.tsx:179
    notifications: 'Notificaciones',
    // src/components/notification-inbox.tsx:132, src/components/notification-inbox.tsx:190
    filterNotifications: 'Notificaciones de filtro',
    // src/components/notification-inbox.tsx:134
    unreadLabel: 'Sin leer, {unread}',
    // src/components/notification-inbox.tsx:136
    notificationUnreadOne: 'Notificación {sortedCount} no leída',
    // src/components/notification-inbox.tsx:136
    notificationOne: 'Notificación {sortedCount}',
    // src/components/notification-inbox.tsx:136
    notificationsUnreadOther: 'No se han leído las notificaciones {sortedCount}',
    // src/components/notification-inbox.tsx:136
    foldedOther: '{sortedCount} notificaciones',
    // src/components/notification-inbox.tsx:142, src/components/notification-inbox.tsx:214
    updatesPaused: 'Actualizaciones en pausa',
    // src/components/notification-inbox.tsx:142, src/components/notification-inbox.tsx:214
    endedTitle: 'Tu sesión terminó',
    // src/components/notification-inbox.tsx:142, src/components/notification-inbox.tsx:214
    notificationsDidnLoad: 'Notificaciones no cargaron',
    // src/components/notification-inbox.tsx:142
    loading: 'Cargando…',
    // src/components/notification-inbox.tsx:143
    line: 'Vuelve a esta ventana mientras estás en línea',
    // src/components/notification-inbox.tsx:143, src/components/notification-inbox.tsx:214
    lineLabel: 'Inicia sesión de nuevo para ver las notificaciones.',
    // src/components/notification-inbox.tsx:143, src/components/notification-inbox.tsx:214
    checkConnection: 'Verifica tu conexión e inténtalo de nuevo.',
    // src/components/notification-inbox.tsx:146
    someNotificationsCouldnBeChecked: 'Algunas notificaciones no pudieron ser revisadas',
    // src/components/notification-inbox.tsx:156
    notificationsUnreadLatest: '{title}, notificaciones {count}, {unreadIdsCount} no leído, la última {at}',
    // src/components/notification-inbox.tsx:156
    notificationsLatest: '{title}, notificaciones {count}, las últimas {at}',
    // src/components/notification-inbox.tsx:163
    notificationsLabel: 'Notificaciones {title}, {count}',
    // src/components/notification-inbox.tsx:168
    caughtUp: 'Estás al día',
    // src/components/notification-inbox.tsx:168
    nothingNew: 'Nada nuevo',
    // src/components/notification-inbox.tsx:169
    nothingUnreadEarlierNotificationsStayUnder: 'Nada no leído, las notificaciones anteriores permanecen bajo todo',
    // src/components/notification-inbox.tsx:169
    requestsFromTeamAreInThings: 'Las peticiones de tu equipo están en Cosas que hacer',
    // src/components/notification-inbox.tsx:171
    allCaughtUp: 'Estás al día.',
    // src/components/notification-inbox.tsx:171
    noNotificationsYet: 'No hay notificaciones todavía. de la Comunidad Europea de de la Comunidad Europea de la ex República Checa de',
    // src/components/notification-inbox.tsx:172
    weCouldnMarkOneRead: 'No podíamos marcar esa lectura',
    // src/components/notification-inbox.tsx:173
    openingOneDoesnComplete: 'Abrir uno no lo completa',
    // src/components/notification-inbox.tsx:181
    alerts: 'Tus alertas',
    // src/components/notification-inbox.tsx:181
    reviewUpdateTakeNextStep: 'Revisa una actualización, da el siguiente paso',
    // src/components/notification-inbox.tsx:182
    signIn: 'Iniciar sesión',
    // src/components/notification-inbox.tsx:182
    checking: 'Verificando…',
    // src/components/notification-inbox.tsx:182
    tryAgain: 'Intentar de nuevo',
    // src/components/notification-inbox.tsx:182
    refresh: 'Actualizar',
    // src/components/notification-inbox.tsx:188
    someUpdatesCouldNotBeChecked: 'Algunas actualizaciones no se pudieron comprobar',
    // src/components/notification-inbox.tsx:188
    someNotificationsAreUnavailableOutsideBounded: ' Algunas notificaciones no están disponibles o no están fuera de esta vista limitada. Intenta volver a comprobar el acceso actual',
    // src/components/notification-inbox.tsx:191
    searchNotifications: 'Notificaciones de búsqueda',
    // src/components/notification-inbox.tsx:191
    placeholder: 'Buscar en esta lista',
    // src/components/notification-inbox.tsx:193
    notificationInViewActionRequiredOne: 'Notificación {itemsCount} en esta opinión · Medidas necesarias',
    // src/components/notification-inbox.tsx:193
    notificationInViewUnreadOne: 'Notificación {itemsCount} en esta vista · No leído',
    // src/components/notification-inbox.tsx:193
    notificationInViewOne: 'Notificación {itemsCount} en esta opinión',
    // src/components/notification-inbox.tsx:193
    notificationsInViewActionRequiredOther: 'Las notificaciones {itemsCount} en esta vista · Acción requerida',
    // src/components/notification-inbox.tsx:193
    notificationsInViewUnreadOther: 'Notificaciones {itemsCount} en esta vista · No leído',
    // src/components/notification-inbox.tsx:193
    notificationsInViewOther: 'Las notificaciones {itemsCount} en esta vista',
    // src/components/notification-inbox.tsx:206
    markRead: 'Marca {title}',
    // src/components/notification-inbox.tsx:206
    markingRead: 'Marcando leído',
    // src/components/notification-inbox.tsx:206
    markRead2: 'Mark leyó',
    // src/components/notification-inbox.tsx:209
    noMatchingNotifications: 'No hay notificaciones coincidentes',
    // src/components/notification-inbox.tsx:209
    noUnreadNotificationsInView: 'No hay notificaciones no leídas en esta vista',
    // src/components/notification-inbox.tsx:209
    noNotificationsRequiringActionInView: 'No hay notificaciones que requieran la adopción de medidas a este respecto',
    // src/components/notification-inbox.tsx:209
    noNotificationsHere: 'No hay notificaciones aquí',
    // src/components/notification-inbox.tsx:209
    noAvailableNotificationsShow: 'No hay notificaciones disponibles que mostrar',
    // src/components/notification-inbox.tsx:210
    tryAnotherSearchClearSeeUpdates: 'Prueba otra búsqueda o despeje para ver tus actualizaciones',
    // src/components/notification-inbox.tsx:210
    viewIncompleteRetryCheckWhatAvailable: 'Esta vista está incompleta. Intenta volver a comprobar lo que está disponible',
    // src/components/notification-inbox.tsx:210
    checkRequestsScheduleTheirCurrentStatus: 'Verifica las solicitudes y programa para su estado actual',
    // src/components/notification-inbox.tsx:211
    pinsClearSearch: 'Borrar búsqueda',
    // src/components/notification-inbox.tsx:211
    viewAllNotifications: 'Ver todas las notificaciones',
    // src/components/notification-inbox.tsx:213
    updatesAboutRequestsScheduleOpeningOne: 'Actualizaciones sobre sus peticiones y horarios. Abrir uno no completa su acción',
    // src/components/notification-inbox.tsx:213
    requests: 'Solicitudes',
    // src/components/notification-inbox.tsx:213
    schedule: 'Horario',
    // src/components/notification-inbox.tsx:214
    loadingNotifications: 'Cargando notificaciones',
    // src/components/notification-inbox.tsx:214
    returnWindowWhileOnlineCheckCurrent: 'Regresar a esta ventana mientras está en línea para comprobar la información actual',
    // src/components/notification-inbox.tsx:214
    checkingCurrentAccess: 'Comprobando tu acceso actual',
  },
} as const;
