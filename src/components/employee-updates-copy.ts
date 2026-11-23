/* Signed-in Spanish (Nov 23, 2026): the words on Updates (an Employee's or Lead's list of team updates, and the states
 * an Owner's or Manager's list passes to messages-manager-b), in English and Puerto Rico Spanish (docs/design/voice.md:
 * tú, sentence case; a team update is an "Aviso"). English is word for word what the screen said before the table. */
export type UpdatesLang = 'en' | 'es';

const en = {
  all: 'All', required: 'Required', toReview: 'To review', optional: 'Optional', reviewed: 'Reviewed',
  emptyPartial: 'No updates available in this view', emptyAll: 'No current updates', emptyRequired: 'No updates requiring acknowledgement',
  emptyOptional: 'No optional updates', emptyToReview: 'No updates waiting for review', emptyReviewed: 'No reviewed updates yet',
  descPartial: 'Some updates could not be checked. Refresh to try again.', descAll: 'New workplace updates will appear here.',
  descManager: 'View all updates to check other review requirements.', descReviewed: 'Updates you mark read or acknowledge will appear here.',
  descToReview: 'You can still find your reviewed updates in All.',
  pausedTitle: 'Updates paused', pausedLine: 'Return online and to this page to refresh.',
  endedTitle: 'Your session ended', endedLine: 'Sign in again to see updates.', signIn: 'Sign in',
  failedTitle: 'Couldn’t load updates', failedLine: 'Check your connection, then try again.', tryAgain: 'Try again',
  loading: 'Loading updates…', refreshing: 'Refreshing updates…',
  acknowledged: 'Acknowledged', reviewNeeded: 'Review needed', notRead: 'Not read',
  statePaused: 'Updates paused. Return online and to this page to refresh.', stateEnded: 'Your session ended. Sign in again to see updates.',
  stateFailed: 'Couldn’t load updates. Check your connection, then try again.',
  toConfirm: (n: number) => `${n} to confirm`, toReviewCount: (n: number) => `${n} to review`, caughtUp: 'All caught up',
  more: 'More', messageTeam: 'Message today’s team', title: 'Updates', workplaceUpdates: 'Workplace updates', filter: 'Filter updates',
  partialHelp: 'Some updates couldn’t load. Try again to check for the rest.', checking: 'Checking…', viewAll: 'View all updates',
  openingNote: 'Opening an update doesn’t confirm it.',
};

const es: typeof en = {
  all: 'Todos', required: 'Requeridos', toReview: 'Por revisar', optional: 'Opcionales', reviewed: 'Revisados',
  emptyPartial: 'No hay avisos disponibles en esta vista', emptyAll: 'No hay avisos actuales', emptyRequired: 'No hay avisos que requieran confirmación',
  emptyOptional: 'No hay avisos opcionales', emptyToReview: 'No hay avisos por revisar', emptyReviewed: 'Todavía no hay avisos revisados',
  descPartial: 'No pudimos verificar algunos avisos. Actualiza para intentarlo de nuevo.', descAll: 'Los avisos nuevos de tu trabajo aparecerán aquí.',
  descManager: 'Mira todos los avisos para revisar otros requisitos.', descReviewed: 'Los avisos que marques como leídos o confirmes aparecerán aquí.',
  descToReview: 'Todavía puedes encontrar tus avisos revisados en Todos.',
  pausedTitle: 'Avisos en pausa', pausedLine: 'Vuelve a conectarte y regresa a esta página para actualizar.',
  endedTitle: 'Tu sesión terminó', endedLine: 'Inicia sesión otra vez para ver los avisos.', signIn: 'Iniciar sesión',
  failedTitle: 'No pudimos cargar los avisos', failedLine: 'Revisa tu conexión e inténtalo de nuevo.', tryAgain: 'Intentar de nuevo',
  loading: 'Cargando avisos…', refreshing: 'Actualizando avisos…',
  acknowledged: 'Confirmado', reviewNeeded: 'Requiere revisión', notRead: 'Sin leer',
  statePaused: 'Avisos en pausa. Vuelve a conectarte y regresa a esta página para actualizar.', stateEnded: 'Tu sesión terminó. Inicia sesión otra vez para ver los avisos.',
  stateFailed: 'No pudimos cargar los avisos. Revisa tu conexión e inténtalo de nuevo.',
  toConfirm: (n: number) => `${n} por confirmar`, toReviewCount: (n: number) => `${n} por revisar`, caughtUp: 'Estás al día',
  more: 'Más', messageTeam: 'Enviar mensaje al equipo de hoy', title: 'Avisos', workplaceUpdates: 'Avisos de tu trabajo', filter: 'Filtrar avisos',
  partialHelp: 'Algunos avisos no cargaron. Inténtalo de nuevo para ver el resto.', checking: 'Verificando…', viewAll: 'Ver todos los avisos',
  openingNote: 'Abrir un aviso no lo confirma.',
};

export type UpdatesCopy = typeof en;
export const EMPLOYEE_UPDATES_COPY: Record<UpdatesLang, UpdatesCopy> = {en, es};
export const employeeUpdatesCopy = (lang: UpdatesLang = 'en'): UpdatesCopy => EMPLOYEE_UPDATES_COPY[lang];
export const UPDATES_LOCALE: Record<UpdatesLang, string> = {en: 'en-US', es: 'es-PR'};
