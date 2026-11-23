/* Signed-in Spanish (Nov 23, 2026): the words on the Employee Notifications and Updates pages (messages.tsx): the
 * loading line, the page titles and back links, the state notices and their Try again, paging and the open flow, in
 * English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: Update → "Aviso",
 * Notifications → "Notificaciones", "Intentar de nuevo", "Iniciar sesión"). English is byte for byte what the page said
 * before. A notice in the Notifications list is a "notificación" in Spanish, so it never reads as a team "aviso". */
const en = {
  loading: {notifications: 'Loading your notifications…', updates: 'Loading your updates…'},
  titles: {notifications: 'Notifications', updates: 'Updates', detail: 'Team update', compose: 'Write an update'},
  /** The phone heading, with soft hyphens so the long word breaks cleanly at 200% text. */
  notificationsHeading: 'Notifi­ca­tions',
  home: 'Home', more: 'More', updates: 'Updates', notifications: 'Notifications', cancel: 'Cancel', settings: 'Settings',
  subtitles: {updates: 'Current messages shared with you', compose: 'A message for today’s team', other: 'Read, review and respond'},
  sessionRefresh: 'Your session needs to be refreshed. Reload this page to continue.',
  checking: 'Checking…', tryAgain: 'Try again', signIn: 'Sign in',
  updatesOff: 'Your workplace doesn’t use updates in NEVORA. Everything else still works.',
  updatesAccessUnchecked: 'Updates access couldn’t be checked. Refresh to continue.',
  noticesUnchecked: 'Your current notices couldn’t be checked. Refresh before continuing.',
  updatesUnchecked: 'Your updates couldn’t be checked. Access may have changed, or Updates may not be available yet. Refresh to continue.',
  updateGone: 'This update is no longer available to you. It may have been withdrawn or your access may have changed.',
  composeUnchecked: 'Your current team and publishing access couldn’t be checked. Refresh to continue.',
  accessChanged: 'Your access changed. Sign in again to continue.',
  /** Before a read: paused, checking and failed, for each list. */
  status: {
    notifications: {paused: 'Your notifications are paused. Return to this page or reconnect to refresh.', checking: 'Checking your current notifications…', failed: 'Your notifications couldn’t be checked.'},
    updates: {paused: 'Your updates are paused. Return to this page or reconnect to refresh.', checking: 'Checking your current updates…', failed: 'Your updates couldn’t be checked. Try again.'},
  },
  pages: 'Message pages', newerPage: 'Newer page', newestItems: 'Newest items', olderPage: 'Older page',
  earlierSubmission: 'An earlier submission still needs to be checked before starting another.',
  returnToSubmission: 'Return to my submission',
  opening: 'Opening current details…',
  openError: 'This notice couldn’t be opened with your current access. Refresh and try again.',
};
const es: typeof en = {
  loading: {notifications: 'Cargando tus notificaciones…', updates: 'Cargando tus avisos…'},
  titles: {notifications: 'Notificaciones', updates: 'Avisos', detail: 'Aviso del equipo', compose: 'Escribir un aviso'},
  notificationsHeading: 'Notifi­ca­cio­nes',
  home: 'Inicio', more: 'Más', updates: 'Avisos', notifications: 'Notificaciones', cancel: 'Cancelar', settings: 'Ajustes',
  subtitles: {updates: 'Mensajes actuales compartidos contigo', compose: 'Un mensaje para el equipo de hoy', other: 'Lee, revisa y responde'},
  sessionRefresh: 'Tu sesión necesita actualizarse. Vuelve a cargar esta página para continuar.',
  checking: 'Verificando…', tryAgain: 'Intentar de nuevo', signIn: 'Iniciar sesión',
  updatesOff: 'Tu trabajo no usa avisos en NEVORA. Todo lo demás sigue funcionando.',
  updatesAccessUnchecked: 'No pudimos verificar tu acceso a Avisos. Actualiza para continuar.',
  noticesUnchecked: 'No pudimos verificar tus notificaciones actuales. Actualiza antes de continuar.',
  updatesUnchecked: 'No pudimos verificar tus avisos. Puede que tu acceso haya cambiado o que Avisos aún no esté disponible. Actualiza para continuar.',
  updateGone: 'Este aviso ya no está disponible para ti. Puede que lo hayan retirado o que tu acceso haya cambiado.',
  composeUnchecked: 'No pudimos verificar tu equipo actual ni tu acceso para publicar. Actualiza para continuar.',
  accessChanged: 'Tu acceso cambió. Inicia sesión de nuevo para continuar.',
  status: {
    notifications: {paused: 'Tus notificaciones están en pausa. Vuelve a esta página o reconéctate para actualizar.', checking: 'Verificando tus notificaciones actuales…', failed: 'No pudimos verificar tus notificaciones.'},
    updates: {paused: 'Tus avisos están en pausa. Vuelve a esta página o reconéctate para actualizar.', checking: 'Verificando tus avisos actuales…', failed: 'No pudimos verificar tus avisos. Inténtalo de nuevo.'},
  },
  pages: 'Páginas de mensajes', newerPage: 'Página más reciente', newestItems: 'Lo más reciente', olderPage: 'Página anterior',
  earlierSubmission: 'Hay que verificar un envío anterior antes de empezar otro.',
  returnToSubmission: 'Volver a mi envío',
  opening: 'Abriendo los detalles actuales…',
  openError: 'No pudimos abrir esta notificación con tu acceso actual. Actualiza e inténtalo de nuevo.',
};
export const messagesCopy = {en, es};
