/* Signed-in Spanish (Nov 23, 2026): the words on the Employee calendar subscription page (calendar.tsx, the tablet and
 * desktop cards), in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, infinitive buttons, the
 * glossary: "Turno", "localidad", "gerente", "Iniciar sesión", "Intentar de nuevo"). English is byte for byte what the
 * screen said before. The calendar apps' names and setup steps come from employee-b/account-b-client.tsx and are not
 * here. The privacy lines are literal translations, for Jose's review. */
const en = {
  // src/components/employee-mobile/calendar.tsx:36
  active: 'Active',
  // src/components/employee-mobile/calendar.tsx:36
  turnedOff: 'Turned off',
  // src/components/employee-mobile/calendar.tsx:36
  off: 'Off',
  // src/components/employee-mobile/calendar.tsx:16
  subscription: 'Subscription',
  // src/components/employee-mobile/calendar.tsx:42
  paused: 'Calendar settings paused. Return to this window to check your link.',
  // src/components/employee-mobile/calendar.tsx:42
  saving: 'Saving your calendar request…',
  // src/components/employee-mobile/calendar.tsx:42
  checking: 'Checking your calendar link…',
  // src/components/employee-mobile/calendar.tsx:43
  unauthorized: 'Your access could not be confirmed. Sign in again to manage your link.',
  // src/components/employee-mobile/calendar.tsx:43
  unchecked: 'Calendar settings could not be checked. Try again to see the current status.',
  // src/components/employee-mobile/calendar.tsx:43
  signIn: 'Sign in',
  // src/components/employee-mobile/calendar.tsx:43
  tryAgain: 'Try again',
  // src/components/employee-mobile/calendar.tsx:46
  keepPrivate: 'Anyone with the link can see your shift times and locations, so keep it to yourself.',
  // src/components/employee-mobile/calendar.tsx:47
  previousPending: 'Your previous request still needs to be checked before you can change this link.',
  // src/components/employee-mobile/calendar.tsx:49
  linkLabel: 'Your private calendar link',
  // src/components/employee-mobile/calendar.tsx:53
  shownOnce: 'Shown once. Copy it now, or reset it later to get a new link.',
  // src/components/employee-mobile/calendar.tsx:54
  privacyOnce: 'For your privacy the link is shown only once. Get a new link if you need to copy it again.',
  // src/components/employee-mobile/calendar.tsx:55
  revoked: 'Future access through the previous link has stopped.',
  // src/components/employee-mobile/calendar.tsx:56
  noLocation: 'No eligible work location is currently available. Ask your manager to review your access.',
  // src/components/employee-mobile/calendar.tsx:59
  copyLink: 'Copy calendar link',
  // src/components/employee-mobile/calendar.tsx:60
  createLink: 'Create calendar link',
  // src/components/employee-mobile/calendar.tsx:64
  retryOriginal: 'Retry original request',
  // src/components/employee-mobile/calendar.tsx:16
  providers: 'Or add it straight to',
  // src/components/employee-mobile/calendar.tsx:74
  newTab: ' (opens a new tab)',
  // src/components/employee-mobile/calendar.tsx:78
  confirmRotate: 'Get a new calendar link?',
  // src/components/employee-mobile/calendar.tsx:78
  confirmRevoke: 'Turn off your calendar link?',
  // src/components/employee-mobile/calendar.tsx:79
  rotateBody: 'The old link stops working right away. Copy the new link and add it to your calendar app again.',
  // src/components/employee-mobile/calendar.tsx:79
  revokeBody: 'Your calendar app will no longer receive shifts through this link. Events already copied may remain in the app.',
  // src/components/employee-mobile/calendar.tsx:80
  keepLink: 'Keep current link',
  // src/components/employee-mobile/calendar.tsx:54
  getNew: 'Get a new link',
  // src/components/employee-mobile/calendar.tsx:80
  turnOff: 'Turn off link',
  // src/components/employee-mobile/calendar.tsx:79
  oldStops: 'The old link stops working right away.',
};
const es: typeof en = {
  // src/components/employee-mobile/calendar.tsx:36
  active: 'Activa',
  // src/components/employee-mobile/calendar.tsx:36
  turnedOff: 'Desactivada',
  // src/components/employee-mobile/calendar.tsx:36
  off: 'Inactiva',
  // src/components/employee-mobile/calendar.tsx:16
  subscription: 'Suscripción',
  // src/components/employee-mobile/calendar.tsx:42
  paused: 'Ajustes del calendario en pausa. Vuelve a esta ventana para verificar tu enlace.',
  // src/components/employee-mobile/calendar.tsx:42
  saving: 'Guardando tu solicitud del calendario…',
  // src/components/employee-mobile/calendar.tsx:42
  checking: 'Verificando tu enlace del calendario…',
  // src/components/employee-mobile/calendar.tsx:43
  unauthorized: 'No pudimos confirmar tu acceso. Inicia sesión de nuevo para administrar tu enlace.',
  // src/components/employee-mobile/calendar.tsx:43
  unchecked: 'No pudimos verificar los ajustes del calendario. Inténtalo de nuevo para ver el estado actual.',
  // src/components/employee-mobile/calendar.tsx:43
  signIn: 'Iniciar sesión',
  // src/components/employee-mobile/calendar.tsx:43
  tryAgain: 'Intentar de nuevo',
  // src/components/employee-mobile/calendar.tsx:46
  keepPrivate: 'Cualquier persona con el enlace puede ver las horas y las localidades de tus turnos, así que no lo compartas.',
  // src/components/employee-mobile/calendar.tsx:47
  previousPending: 'Tu solicitud anterior todavía tiene que verificarse antes de que puedas cambiar este enlace.',
  // src/components/employee-mobile/calendar.tsx:49
  linkLabel: 'Tu enlace privado del calendario',
  // src/components/employee-mobile/calendar.tsx:53
  shownOnce: 'Se muestra una sola vez. Cópialo ahora o restablécelo luego para obtener un enlace nuevo.',
  // src/components/employee-mobile/calendar.tsx:54
  privacyOnce: 'Por tu privacidad, el enlace se muestra una sola vez. Obtén un enlace nuevo si necesitas copiarlo otra vez.',
  // src/components/employee-mobile/calendar.tsx:55
  revoked: 'El enlace anterior ya no da acceso de aquí en adelante.',
  // src/components/employee-mobile/calendar.tsx:56
  noLocation: 'No hay una localidad de trabajo elegible disponible en este momento. Pide a tu gerente que revise tu acceso.',
  // src/components/employee-mobile/calendar.tsx:59
  copyLink: 'Copiar enlace del calendario',
  // src/components/employee-mobile/calendar.tsx:60
  createLink: 'Crear enlace del calendario',
  // src/components/employee-mobile/calendar.tsx:64
  retryOriginal: 'Reintentar solicitud original',
  // src/components/employee-mobile/calendar.tsx:16
  providers: 'O añádelo directamente a',
  // src/components/employee-mobile/calendar.tsx:74
  newTab: ' (abre una pestaña nueva)',
  // src/components/employee-mobile/calendar.tsx:78
  confirmRotate: '¿Obtener un enlace nuevo del calendario?',
  // src/components/employee-mobile/calendar.tsx:78
  confirmRevoke: '¿Desactivar tu enlace del calendario?',
  // src/components/employee-mobile/calendar.tsx:79
  rotateBody: 'El enlace anterior deja de funcionar enseguida. Copia el enlace nuevo y añádelo otra vez a tu aplicación de calendario.',
  // src/components/employee-mobile/calendar.tsx:79
  revokeBody: 'Tu aplicación de calendario ya no recibirá turnos mediante este enlace. Los eventos ya copiados pueden quedarse en la aplicación.',
  // src/components/employee-mobile/calendar.tsx:80
  keepLink: 'Mantener enlace actual',
  // src/components/employee-mobile/calendar.tsx:54
  getNew: 'Obtener enlace nuevo',
  // src/components/employee-mobile/calendar.tsx:80
  turnOff: 'Desactivar enlace',
  // src/components/employee-mobile/calendar.tsx:79
  oldStops: 'El enlace anterior deja de funcionar enseguida.',
};
export const calendarCopy = {en, es} as const;

export const copy = {
  en: {
    // src/components/employee-mobile/calendar.tsx:36
    active: 'Active',
    // src/components/employee-mobile/calendar.tsx:36
    turnedOff: 'Turned off',
    // src/components/employee-mobile/calendar.tsx:36
    off: 'Off',
    // src/components/employee-mobile/calendar.tsx:40
    subscription: 'Subscription',
    // src/components/employee-mobile/calendar.tsx:42
    paused: 'Calendar settings paused. Return to this window to check your link.',
    // src/components/employee-mobile/calendar.tsx:42
    saving: 'Saving your calendar request…',
    // src/components/employee-mobile/calendar.tsx:42
    checking: 'Checking your calendar link…',
    // src/components/employee-mobile/calendar.tsx:43
    unauthorized: 'Your access could not be confirmed. Sign in again to manage your link.',
    // src/components/employee-mobile/calendar.tsx:43
    unchecked: 'Calendar settings could not be checked. Try again to see the current status.',
    // src/components/employee-mobile/calendar.tsx:44
    signIn: 'Sign in',
    // src/components/employee-mobile/calendar.tsx:44
    tryAgain: 'Try again',
    // src/components/employee-mobile/calendar.tsx:46
    keepPrivate: 'Anyone with the link can see your shift times and locations, so keep it to yourself.',
    // src/components/employee-mobile/calendar.tsx:47
    previousPending: 'Your previous request still needs to be checked before you can change this link.',
    // src/components/employee-mobile/calendar.tsx:49
    privateCalendarLink: 'Your private calendar link',
    // src/components/employee-mobile/calendar.tsx:53
    shownOnce: 'Shown once. Copy it now, or reset it later to get a new link.',
    // src/components/employee-mobile/calendar.tsx:54
    privacyOnce: 'For your privacy the link is shown only once. Get a new link if you need to copy it again.',
    // src/components/employee-mobile/calendar.tsx:55
    revoked: 'Future access through the previous link has stopped.',
    // src/components/employee-mobile/calendar.tsx:56
    noLocation: 'No eligible work location is currently available. Ask your manager to review your access.',
    // src/components/employee-mobile/calendar.tsx:59
    copyLink: 'Copy calendar link',
    // src/components/employee-mobile/calendar.tsx:60
    createLink: 'Create calendar link',
    // src/components/employee-mobile/calendar.tsx:64
    retryOriginal: 'Retry original request',
    // src/components/employee-mobile/calendar.tsx:68
    providers: 'Or add it straight to',
    // src/components/employee-mobile/calendar.tsx:74
    newTab: ' (opens a new tab)',
    // src/components/employee-mobile/calendar.tsx:78
    confirmRotate: 'Get a new calendar link?',
    // src/components/employee-mobile/calendar.tsx:78
    confirmRevoke: 'Turn off your calendar link?',
    // src/components/employee-mobile/calendar.tsx:79
    rotateBody: 'The old link stops working right away. Copy the new link and add it to your calendar app again.',
    // src/components/employee-mobile/calendar.tsx:79
    revokeBody: 'Your calendar app will no longer receive shifts through this link. Events already copied may remain in the app.',
    // src/components/employee-mobile/calendar.tsx:80
    keepLink: 'Keep current link',
    // src/components/employee-mobile/calendar.tsx:80, src/components/employee-mobile/calendar.tsx:83
    getNew: 'Get a new link',
    // src/components/employee-mobile/calendar.tsx:80, src/components/employee-mobile/calendar.tsx:85
    turnOff: 'Turn off link',
    // src/components/employee-mobile/calendar.tsx:84
    oldStops: 'The old link stops working right away.',
  },
  es: {
    // src/components/employee-mobile/calendar.tsx:36
    active: 'Activa',
    // src/components/employee-mobile/calendar.tsx:36
    turnedOff: 'Desactivada',
    // src/components/employee-mobile/calendar.tsx:36
    off: 'Inactiva',
    // src/components/employee-mobile/calendar.tsx:40
    subscription: 'Suscripción',
    // src/components/employee-mobile/calendar.tsx:42
    paused: 'Configuración del calendario en pausa. Vuelve a esta ventana para verificar tu enlace.',
    // src/components/employee-mobile/calendar.tsx:42
    saving: 'Guardando tu solicitud del calendario…',
    // src/components/employee-mobile/calendar.tsx:42
    checking: 'Verificando tu enlace del calendario…',
    // src/components/employee-mobile/calendar.tsx:43
    unauthorized: 'No pudimos confirmar tu acceso. Inicia sesión de nuevo para administrar tu enlace.',
    // src/components/employee-mobile/calendar.tsx:43
    unchecked: 'No pudimos verificar los configuración del calendario. Inténtalo de nuevo para ver el estado actual.',
    // src/components/employee-mobile/calendar.tsx:44
    signIn: 'Iniciar sesión',
    // src/components/employee-mobile/calendar.tsx:44
    tryAgain: 'Intentar de nuevo',
    // src/components/employee-mobile/calendar.tsx:46
    keepPrivate: 'Cualquier persona con el enlace puede ver las horas y las localidades de tus turnos. No lo compartas.',
    // src/components/employee-mobile/calendar.tsx:47
    previousPending: 'Tu solicitud anterior todavía tiene que verificarse antes de que puedas cambiar este enlace.',
    // src/components/employee-mobile/calendar.tsx:49
    privateCalendarLink: 'Tu enlace privado del calendario',
    // src/components/employee-mobile/calendar.tsx:53
    shownOnce: 'Se muestra una sola vez. Cópialo ahora o genera otro enlace más adelante.',
    // src/components/employee-mobile/calendar.tsx:54
    privacyOnce: 'Por tu privacidad, el enlace se muestra una vez. Si necesitas copiarlo otra vez, genera otro.',
    // src/components/employee-mobile/calendar.tsx:55
    revoked: 'El enlace anterior ya no da acceso.',
    // src/components/employee-mobile/calendar.tsx:56
    noLocation: 'No hay una localidad de trabajo elegible disponible en este momento. Pide a tu gerente que revise tu acceso.',
    // src/components/employee-mobile/calendar.tsx:59
    copyLink: 'Copiar enlace',
    // src/components/employee-mobile/calendar.tsx:60
    createLink: 'Crear enlace',
    // src/components/employee-mobile/calendar.tsx:64
    retryOriginal: 'Reintentar solicitud original',
    // src/components/employee-mobile/calendar.tsx:68
    providers: 'O añádelo directamente a',
    // src/components/employee-mobile/calendar.tsx:74
    newTab: ' (abre una pestaña nueva)',
    // src/components/employee-mobile/calendar.tsx:78
    confirmRotate: '¿Generar otro enlace del calendario?',
    // src/components/employee-mobile/calendar.tsx:78
    confirmRevoke: '¿Desactivar el enlace del calendario?',
    // src/components/employee-mobile/calendar.tsx:79
    rotateBody: 'El enlace anterior deja de funcionar al instante. Copia el nuevo y añádelo a tu calendario.',
    // src/components/employee-mobile/calendar.tsx:79
    revokeBody: 'Tu calendario dejará de recibir turnos de este enlace. Los eventos ya copiados podrían quedarse.',
    // src/components/employee-mobile/calendar.tsx:80
    keepLink: 'Mantener enlace',
    // src/components/employee-mobile/calendar.tsx:80, src/components/employee-mobile/calendar.tsx:83
    getNew: 'Generar otro enlace',
    // src/components/employee-mobile/calendar.tsx:80, src/components/employee-mobile/calendar.tsx:85
    turnOff: 'Desactivar enlace',
    // src/components/employee-mobile/calendar.tsx:84
    oldStops: 'El enlace anterior deja de funcionar al instante.',
  },
} as const;
