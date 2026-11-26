/* Signed-in Spanish (Nov 23, 2026): the words on the Alerts page (device-alerts.tsx: this browser's alert status, its
 * one action, the turn-off review and the notes), in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence
 * case, "Notificaciones", "Iniciar sesión", "tu trabajo", "gerente", "Aviso"). What the page says about permissions and
 * what stops is privacy text: the Spanish is a literal translation waiting for Jose's review. English is byte for byte
 * what the page said before; the pending turn-off sentence is still the device client's constant in English. */
import {DEVICE_TURN_OFF_PENDING_MESSAGE} from '../../lib/notifications/device-client';

const en = {
  titles: {
    // src/components/employee-mobile/device-alerts.tsx:19
    disabled: 'Workplace alerts are unavailable',
    // src/components/employee-mobile/device-alerts.tsx:19
    paused: 'Device settings paused',
    // src/components/employee-mobile/device-alerts.tsx:19
    accessChanged: 'Your access changed',
    // src/components/employee-mobile/device-alerts.tsx:19
    checking: 'Checking this device…',
    // src/components/employee-mobile/device-alerts.tsx:19
    cleanup: 'Alerts may still be on',
    // src/components/employee-mobile/device-alerts.tsx:19
    enabled: 'Alerts are on',
    // src/components/employee-mobile/device-alerts.tsx:19
    denied: 'Permission is blocked',
    // src/components/employee-mobile/device-alerts.tsx:19
    revoked: 'Device access changed',
    // src/components/employee-mobile/device-alerts.tsx:19
    install: 'Open from your Home Screen',
    // src/components/employee-mobile/device-alerts.tsx:19
    unavailable: 'Alerts are unavailable',
    // src/components/employee-mobile/device-alerts.tsx:19
    error: 'We couldn’t verify this device',
    // src/components/employee-mobile/device-alerts.tsx:19
    off: 'Alerts are off',
  },
  pills: {
    // src/components/employee-mobile/device-alerts.tsx:19
    check: 'Check',
    // src/components/employee-mobile/device-alerts.tsx:15
    on: 'On',
    // src/components/employee-mobile/device-alerts.tsx:20
    blocked: 'Blocked',
    // src/components/employee-mobile/device-alerts.tsx:13
    off: 'Off',
  },
  // src/components/employee-mobile/device-alerts.tsx:22
  reviewSetup: 'Review setup',
  // src/components/employee-mobile/device-alerts.tsx:22
  turnOn: 'Turn on alerts',
  // src/components/employee-mobile/device-alerts.tsx:23
  addToHome: 'Add to Home Screen',
  // src/components/employee-mobile/device-alerts.tsx:29
  thisDevice: 'This device',
  // src/components/employee-mobile/device-alerts.tsx:32
  notMadeAvailable: 'Your workplace has not made device alerts available. Your notifications remain in NEVORA.',
  // src/components/employee-mobile/device-alerts.tsx:32
  pausedLine: 'Return to this window to check the current status. No new setup will start automatically.',
  // src/components/employee-mobile/device-alerts.tsx:32
  signInAgain: 'Sign in again',
  // src/components/employee-mobile/device-alerts.tsx:32
  signInAgainTail: ' to check this account and device.',
  // src/components/employee-mobile/device-alerts.tsx:32
  finishing: 'Finishing your device request…',
  // src/components/employee-mobile/device-alerts.tsx:32
  checkingEnrollment: 'Checking permission and this device’s enrollment…',
  lines: {
    // src/components/employee-mobile/device-alerts.tsx:33
    cleanup: 'Check again asks NEVORA for the latest status. Retry turn off sends your earlier turn-off request again.',
    // src/components/employee-mobile/device-alerts.tsx:33
    enabled: 'This browser is set up for your account. Alerts also depend on your workplace and device settings.',
    // src/components/employee-mobile/device-alerts.tsx:33
    denied: 'Allow notifications in your browser or device settings, then check again here. NEVORA cannot change that permission for you.',
    // src/components/employee-mobile/device-alerts.tsx:33
    revoked: 'Permission or this browser’s setup changed. Turn off the previous setup before starting again.',
    // src/components/employee-mobile/device-alerts.tsx:33
    install: 'Add NEVORA to your Home Screen, then open it from that icon to set up alerts.',
    // src/components/employee-mobile/device-alerts.tsx:33
    unavailable: 'This browser or the current configuration cannot set up alerts. You can keep using your notifications in NEVORA.',
    // src/components/employee-mobile/device-alerts.tsx:33
    error: 'Check again before starting a new request. You can also turn off the previous setup.',
    // src/components/employee-mobile/device-alerts.tsx:33
    dismissed: 'Setup is postponed. You can return whenever you are ready.',
    // src/components/employee-mobile/device-alerts.tsx:33
    ready: 'Get schedule changes, request answers and updates on this device. If permission is needed, your browser will ask.',
  },
  // src/components/employee-mobile/device-alerts.tsx:34
  stepsSafari: 'In Safari, open Share, then Add to Home Screen. Turn on Open as Web App if offered. Open NEVORA from the new icon.',
  // src/components/employee-mobile/device-alerts.tsx:34
  stepsBrowser: 'Open your browser menu and choose Install app or Add to Home Screen if offered. Open NEVORA from the new icon.',
  // src/components/employee-mobile/device-alerts.tsx:33
  checkAgain: 'Check again',
  // src/components/employee-mobile/device-alerts.tsx:37
  test: 'Test notification',
  // src/components/employee-mobile/device-alerts.tsx:33
  retryTurnOff: 'Retry turn off',
  // src/components/employee-mobile/device-alerts.tsx:38
  turnOff: 'Turn off alerts',
  // src/components/employee-mobile/device-alerts.tsx:39
  notNow: 'Not now',
  // src/components/employee-mobile/device-alerts.tsx:43
  turnOffTitle: 'Turn off alerts here?',
  // src/components/employee-mobile/device-alerts.tsx:44
  turnOffTry: 'NEVORA will try to stop alerts for this account in this browser. We’ll check the result before confirming they’re off.',
  // src/components/employee-mobile/device-alerts.tsx:44
  turnOffStays: 'Your browser permission, other devices, and notifications in NEVORA stay the same. An alert already queued by your device may still appear.',
  // src/components/employee-mobile/device-alerts.tsx:45
  keepSetup: 'Keep current setup',
  // src/components/employee-mobile/device-alerts.tsx:4
  turnOffPending: DEVICE_TURN_OFF_PENDING_MESSAGE,
  // src/components/employee-mobile/device-alerts.tsx:47
  setupFailed: 'Setup could not finish. You can ask your manager for help.',
  // src/components/employee-mobile/device-alerts.tsx:48
  browserOnly: 'These settings apply to this browser only. Your notifications always stay in NEVORA, and your phone’s settings can turn off every alert.',
  // src/components/employee-mobile/device-alerts.tsx:8
  alerts: 'Alerts',
  // src/components/employee-mobile/device-alerts.tsx:55
  notifications: 'Notifications',
  // src/components/employee-mobile/device-alerts.tsx:55
  appNotAvailable: 'Your workplace has not made app alerts available. Your notifications remain in NEVORA.',
  // src/components/employee-mobile/device-alerts.tsx:70
  signingOut: 'Signing out…',
  // src/components/employee-mobile/device-alerts.tsx:19
  popoverTitle: 'Device settings',
  // src/components/employee-mobile/device-owner.tsx:63
  closePopover: 'Close device settings',
  // src/components/employee-mobile/device-owner.tsx:65
  popoverPaused: 'Device settings paused. Return to this window to check again.',
};
const es: typeof en = {
  titles: {
    // src/components/employee-mobile/device-alerts.tsx:19
    disabled: 'Las alertas de tu trabajo no están disponibles',
    // src/components/employee-mobile/device-alerts.tsx:19
    paused: 'Ajustes del dispositivo en pausa',
    // src/components/employee-mobile/device-alerts.tsx:19
    accessChanged: 'Tu acceso cambió',
    // src/components/employee-mobile/device-alerts.tsx:19
    checking: 'Verificando este dispositivo…',
    // src/components/employee-mobile/device-alerts.tsx:19
    cleanup: 'Puede que las alertas sigan activadas',
    // src/components/employee-mobile/device-alerts.tsx:19
    enabled: 'Las alertas están activadas',
    // src/components/employee-mobile/device-alerts.tsx:19
    denied: 'El permiso está bloqueado',
    // src/components/employee-mobile/device-alerts.tsx:19
    revoked: 'El acceso del dispositivo cambió',
    // src/components/employee-mobile/device-alerts.tsx:19
    install: 'Ábrela desde tu pantalla de inicio',
    // src/components/employee-mobile/device-alerts.tsx:19
    unavailable: 'Las alertas no están disponibles',
    // src/components/employee-mobile/device-alerts.tsx:19
    error: 'No pudimos verificar este dispositivo',
    // src/components/employee-mobile/device-alerts.tsx:19
    off: 'Las alertas están desactivadas',
  },
  pills: {
    // src/components/employee-mobile/device-alerts.tsx:19
    check: 'Revisar',
    // src/components/employee-mobile/device-alerts.tsx:15
    on: 'Activadas',
    // src/components/employee-mobile/device-alerts.tsx:20
    blocked: 'Bloqueadas',
    // src/components/employee-mobile/device-alerts.tsx:13
    off: 'Desactivadas',
  },
  // src/components/employee-mobile/device-alerts.tsx:22
  reviewSetup: 'Revisar configuración',
  // src/components/employee-mobile/device-alerts.tsx:22
  turnOn: 'Activar alertas',
  // src/components/employee-mobile/device-alerts.tsx:23
  addToHome: 'Añadir a pantalla de inicio',
  // src/components/employee-mobile/device-alerts.tsx:29
  thisDevice: 'Este dispositivo',
  // src/components/employee-mobile/device-alerts.tsx:32
  notMadeAvailable: 'Tu trabajo no ha habilitado las alertas en dispositivos. Tus notificaciones siguen en NEVORA.',
  // src/components/employee-mobile/device-alerts.tsx:32
  pausedLine: 'Vuelve a esta ventana para verificar el estado actual. No se iniciará ninguna configuración nueva por sí sola.',
  // src/components/employee-mobile/device-alerts.tsx:32
  signInAgain: 'Inicia sesión de nuevo',
  // src/components/employee-mobile/device-alerts.tsx:32
  signInAgainTail: ' para verificar esta cuenta y este dispositivo.',
  // src/components/employee-mobile/device-alerts.tsx:32
  finishing: 'Terminando la solicitud de tu dispositivo…',
  // src/components/employee-mobile/device-alerts.tsx:32
  checkingEnrollment: 'Verificando el permiso y el registro de este dispositivo…',
  lines: {
    // src/components/employee-mobile/device-alerts.tsx:33
    cleanup: 'Verificar de nuevo le pide a NEVORA el estado más reciente. Reintentar desactivación envía otra vez tu solicitud anterior para desactivarlas.',
    // src/components/employee-mobile/device-alerts.tsx:33
    enabled: 'Este navegador está configurado para tu cuenta. Las alertas también dependen de tu trabajo y de los ajustes de tu dispositivo.',
    // src/components/employee-mobile/device-alerts.tsx:33
    denied: 'Permite las notificaciones en los ajustes de tu navegador o dispositivo y luego verifica de nuevo aquí. NEVORA no puede cambiar ese permiso por ti.',
    // src/components/employee-mobile/device-alerts.tsx:33
    revoked: 'El permiso o la configuración de este navegador cambió. Desactiva la configuración anterior antes de empezar de nuevo.',
    // src/components/employee-mobile/device-alerts.tsx:33
    install: 'Añade NEVORA a tu pantalla de inicio y luego ábrela desde ese ícono para configurar las alertas.',
    // src/components/employee-mobile/device-alerts.tsx:33
    unavailable: 'Este navegador o la configuración actual no puede configurar alertas. Puedes seguir usando tus notificaciones en NEVORA.',
    // src/components/employee-mobile/device-alerts.tsx:33
    error: 'Verifica de nuevo antes de empezar una solicitud nueva. También puedes desactivar la configuración anterior.',
    // src/components/employee-mobile/device-alerts.tsx:33
    dismissed: 'La configuración está pospuesta. Puedes volver cuando quieras.',
    // src/components/employee-mobile/device-alerts.tsx:33
    ready: 'Recibe cambios de horario, respuestas a tus solicitudes y avisos en este dispositivo. Si hace falta permiso, tu navegador te lo pedirá.',
  },
  // src/components/employee-mobile/device-alerts.tsx:34
  stepsSafari: 'En Safari, abre Compartir y luego Añadir a pantalla de inicio. Activa Abrir como app web si aparece. Abre NEVORA desde el nuevo ícono.',
  // src/components/employee-mobile/device-alerts.tsx:34
  stepsBrowser: 'Abre el menú de tu navegador y elige Instalar aplicación o Añadir a pantalla de inicio si aparece. Abre NEVORA desde el nuevo ícono.',
  // src/components/employee-mobile/device-alerts.tsx:33
  checkAgain: 'Verificar de nuevo',
  // src/components/employee-mobile/device-alerts.tsx:37
  test: 'Probar notificación',
  // src/components/employee-mobile/device-alerts.tsx:33
  retryTurnOff: 'Reintentar desactivación',
  // src/components/employee-mobile/device-alerts.tsx:38
  turnOff: 'Desactivar alertas',
  // src/components/employee-mobile/device-alerts.tsx:39
  notNow: 'Ahora no',
  // src/components/employee-mobile/device-alerts.tsx:43
  turnOffTitle: '¿Desactivar alertas aquí?',
  // src/components/employee-mobile/device-alerts.tsx:44
  turnOffTry: 'NEVORA intentará detener las alertas de esta cuenta en este navegador. Verificaremos el resultado antes de confirmar que están desactivadas.',
  // src/components/employee-mobile/device-alerts.tsx:44
  turnOffStays: 'El permiso de tu navegador, tus otros dispositivos y las notificaciones en NEVORA no cambian. Puede que aún aparezca una alerta que tu dispositivo ya tenía en cola.',
  // src/components/employee-mobile/device-alerts.tsx:45
  keepSetup: 'Conservar configuración',
  // src/components/employee-mobile/device-alerts.tsx:4
  turnOffPending: 'La desactivación sigue pendiente. Para detener las alertas ahora, bloquea las notificaciones de NEVORA en los ajustes de tu dispositivo o navegador. Luego vuelve aquí e inténtalo de nuevo. Todavía puedes cerrar sesión.',
  // src/components/employee-mobile/device-alerts.tsx:47
  setupFailed: 'La configuración no pudo terminar. Puedes pedirle ayuda a tu gerente.',
  // src/components/employee-mobile/device-alerts.tsx:48
  browserOnly: 'Estos ajustes aplican solo a este navegador. Tus notificaciones siempre se quedan en NEVORA, y los ajustes de tu teléfono pueden desactivar todas las alertas.',
  // src/components/employee-mobile/device-alerts.tsx:8
  alerts: 'Alertas',
  // src/components/employee-mobile/device-alerts.tsx:55
  notifications: 'Notificaciones',
  // src/components/employee-mobile/device-alerts.tsx:55
  appNotAvailable: 'Tu trabajo no ha habilitado las alertas de la aplicación. Tus notificaciones siguen en NEVORA.',
  // src/components/employee-mobile/device-alerts.tsx:70
  signingOut: 'Cerrando sesión…',
  // src/components/employee-mobile/device-alerts.tsx:19
  popoverTitle: 'Configuración del dispositivo',
  // src/components/employee-mobile/device-owner.tsx:63
  closePopover: 'Cerrar configuración del dispositivo',
  // src/components/employee-mobile/device-owner.tsx:65
  popoverPaused: 'Configuración del dispositivo en pausa. Vuelve a esta ventana para verificar de nuevo.',
};
export const deviceAlertsCopy = {en, es} as const;

export const copy = {
  en: {
    // src/components/employee-mobile/device-alerts.tsx:19
    disabled: 'Workplace alerts are unavailable',
    // src/components/employee-mobile/device-alerts.tsx:19
    paused: 'Device settings paused',
    // src/components/employee-mobile/device-alerts.tsx:19
    accessChanged: 'Your access changed',
    // src/components/employee-mobile/device-alerts.tsx:19
    checking: 'Checking this device…',
    // src/components/employee-mobile/device-alerts.tsx:19
    cleanup: 'Alerts may still be on',
    // src/components/employee-mobile/device-alerts.tsx:19
    enabled: 'Alerts are on',
    // src/components/employee-mobile/device-alerts.tsx:19
    denied: 'Permission is blocked',
    // src/components/employee-mobile/device-alerts.tsx:19
    revoked: 'Device access changed',
    // src/components/employee-mobile/device-alerts.tsx:19
    install: 'Open from your Home Screen',
    // src/components/employee-mobile/device-alerts.tsx:19
    unavailable: 'Alerts are unavailable',
    // src/components/employee-mobile/device-alerts.tsx:19
    error: 'We couldn’t verify this device',
    // src/components/employee-mobile/device-alerts.tsx:19
    off: 'Alerts are off',
    // src/components/employee-mobile/device-alerts.tsx:20
    check: 'Check',
    // src/components/employee-mobile/device-alerts.tsx:20
    on: 'On',
    // src/components/employee-mobile/device-alerts.tsx:20
    blocked: 'Blocked',
    // src/components/employee-mobile/device-alerts.tsx:20
    off2: 'Off',
    // src/components/employee-mobile/device-alerts.tsx:22
    reviewSetup: 'Review setup',
    // src/components/employee-mobile/device-alerts.tsx:22
    turnOn: 'Turn on alerts',
    // src/components/employee-mobile/device-alerts.tsx:23
    addToHome: 'Add to Home Screen',
    // src/components/employee-mobile/device-alerts.tsx:29
    thisDevice: 'This device',
    // src/components/employee-mobile/device-alerts.tsx:32
    notMadeAvailable: 'Your workplace has not made device alerts available. Your notifications remain in NEVORA.',
    // src/components/employee-mobile/device-alerts.tsx:32
    pausedLine: 'Return to this window to check the current status. No new setup will start automatically.',
    // src/components/employee-mobile/device-alerts.tsx:32
    signInAgain: 'Sign in again',
    // src/components/employee-mobile/device-alerts.tsx:32
    signInAgainTail: ' to check this account and device.',
    // src/components/employee-mobile/device-alerts.tsx:32
    finishing: 'Finishing your device request…',
    // src/components/employee-mobile/device-alerts.tsx:32
    checkingEnrollment: 'Checking permission and this device’s enrollment…',
    // src/components/employee-mobile/device-alerts.tsx:33
    cleanup2: 'Check again asks NEVORA for the latest status. Retry turn off sends your earlier turn-off request again.',
    // src/components/employee-mobile/device-alerts.tsx:33
    enabled2: 'This browser is set up for your account. Alerts also depend on your workplace and device settings.',
    // src/components/employee-mobile/device-alerts.tsx:33
    denied2: 'Allow notifications in your browser or device settings, then check again here. NEVORA cannot change that permission for you.',
    // src/components/employee-mobile/device-alerts.tsx:33
    revoked2: 'Permission or this browser’s setup changed. Turn off the previous setup before starting again.',
    // src/components/employee-mobile/device-alerts.tsx:33
    install2: 'Add NEVORA to your Home Screen, then open it from that icon to set up alerts.',
    // src/components/employee-mobile/device-alerts.tsx:33
    unavailable2: 'This browser or the current configuration cannot set up alerts. You can keep using your notifications in NEVORA.',
    // src/components/employee-mobile/device-alerts.tsx:33
    error2: 'Check again before starting a new request. You can also turn off the previous setup.',
    // src/components/employee-mobile/device-alerts.tsx:33
    dismissed: 'Setup is postponed. You can return whenever you are ready.',
    // src/components/employee-mobile/device-alerts.tsx:33
    ready: 'Get schedule changes, request answers and updates on this device. If permission is needed, your browser will ask.',
    // src/components/employee-mobile/device-alerts.tsx:34
    stepsSafari: 'In Safari, open Share, then Add to Home Screen. Turn on Open as Web App if offered. Open NEVORA from the new icon.',
    // src/components/employee-mobile/device-alerts.tsx:34
    stepsBrowser: 'Open your browser menu and choose Install app or Add to Home Screen if offered. Open NEVORA from the new icon.',
    // src/components/employee-mobile/device-alerts.tsx:37
    checkAgain: 'Check again',
    // src/components/employee-mobile/device-alerts.tsx:37
    test: 'Test notification',
    // src/components/employee-mobile/device-alerts.tsx:38
    retryTurnOff: 'Retry turn off',
    // src/components/employee-mobile/device-alerts.tsx:38, src/components/employee-mobile/device-alerts.tsx:45
    turnOff: 'Turn off alerts',
    // src/components/employee-mobile/device-alerts.tsx:39
    notNow: 'Not now',
    // src/components/employee-mobile/device-alerts.tsx:43
    turnOffTitle: 'Turn off alerts here?',
    // src/components/employee-mobile/device-alerts.tsx:44
    turnOffTry: 'NEVORA will try to stop alerts for this account in this browser. We’ll check the result before confirming they’re off.',
    // src/components/employee-mobile/device-alerts.tsx:44
    turnOffStays: 'Your browser permission, other devices, and notifications in NEVORA stay the same. An alert already queued by your device may still appear.',
    // src/components/employee-mobile/device-alerts.tsx:45
    keepSetup: 'Keep current setup',
    // src/components/employee-mobile/device-alerts.tsx:47
    setupFailed: 'Setup could not finish. You can ask your manager for help.',
    // src/components/employee-mobile/device-alerts.tsx:48
    browserOnly: 'These settings apply to this browser only. Your notifications always stay in NEVORA, and your phone’s settings can turn off every alert.',
    // src/components/employee-mobile/device-alerts.tsx:55, src/components/employee-mobile/device-alerts.tsx:68
    alerts: 'Alerts',
    // src/components/employee-mobile/device-alerts.tsx:55
    appNotAvailable: 'Your workplace has not made app alerts available. Your notifications remain in NEVORA.',
    // src/components/employee-mobile/device-alerts.tsx:70
    signingOut: 'Signing out…',
  },
  es: {
    // src/components/employee-mobile/device-alerts.tsx:19
    disabled: 'Las alertas de tu trabajo no están disponibles',
    // src/components/employee-mobile/device-alerts.tsx:19
    paused: 'Configuración del dispositivo en pausa',
    // src/components/employee-mobile/device-alerts.tsx:19
    accessChanged: 'Tu acceso cambió',
    // src/components/employee-mobile/device-alerts.tsx:19
    checking: 'Verificando este dispositivo…',
    // src/components/employee-mobile/device-alerts.tsx:19
    cleanup: 'Puede que las alertas sigan activadas',
    // src/components/employee-mobile/device-alerts.tsx:19
    enabled: 'Las alertas están activadas',
    // src/components/employee-mobile/device-alerts.tsx:19
    denied: 'El permiso está bloqueado',
    // src/components/employee-mobile/device-alerts.tsx:19
    revoked: 'El acceso del dispositivo cambió',
    // src/components/employee-mobile/device-alerts.tsx:19
    install: 'Ábrela desde tu pantalla de inicio',
    // src/components/employee-mobile/device-alerts.tsx:19
    unavailable: 'Las alertas no están disponibles',
    // src/components/employee-mobile/device-alerts.tsx:19
    error: 'No pudimos verificar este dispositivo',
    // src/components/employee-mobile/device-alerts.tsx:19
    off: 'Las alertas están desactivadas',
    // src/components/employee-mobile/device-alerts.tsx:20
    check: 'Revisar',
    // src/components/employee-mobile/device-alerts.tsx:20
    on: 'Activadas',
    // src/components/employee-mobile/device-alerts.tsx:20
    blocked: 'Bloqueadas',
    // src/components/employee-mobile/device-alerts.tsx:20
    off2: 'Desactivadas',
    // src/components/employee-mobile/device-alerts.tsx:22
    reviewSetup: 'Revisar configuración',
    // src/components/employee-mobile/device-alerts.tsx:22
    turnOn: 'Activar alertas',
    // src/components/employee-mobile/device-alerts.tsx:23
    addToHome: 'Agregar a pantalla de inicio',
    // src/components/employee-mobile/device-alerts.tsx:29
    thisDevice: 'Este dispositivo',
    // src/components/employee-mobile/device-alerts.tsx:32
    notMadeAvailable: 'Tu trabajo no ha habilitado las alertas en dispositivos. Tus notificaciones siguen en NEVORA.',
    // src/components/employee-mobile/device-alerts.tsx:32
    pausedLine: 'Vuelve a esta ventana para verificar el estado actual. No se iniciará ninguna configuración nueva por sí sola.',
    // src/components/employee-mobile/device-alerts.tsx:32
    signInAgain: 'Inicia sesión de nuevo',
    // src/components/employee-mobile/device-alerts.tsx:32
    signInAgainTail: ' para verificar esta cuenta y este dispositivo.',
    // src/components/employee-mobile/device-alerts.tsx:32
    finishing: 'Terminando la solicitud de tu dispositivo…',
    // src/components/employee-mobile/device-alerts.tsx:32
    checkingEnrollment: 'Verificando el permiso y el registro de este dispositivo…',
    // src/components/employee-mobile/device-alerts.tsx:33
    cleanup2: 'Verificar de nuevo le pide a NEVORA el estado más reciente. Reintentar desactivación envía otra vez tu solicitud anterior para desactivarlas.',
    // src/components/employee-mobile/device-alerts.tsx:33
    enabled2: 'Este navegador está configurado para tu cuenta. Las alertas también dependen de tu trabajo y de los configuración de tu dispositivo.',
    // src/components/employee-mobile/device-alerts.tsx:33
    denied2: 'Permite las notificaciones en los configuración de tu navegador o dispositivo y luego verifica de nuevo aquí. NEVORA no puede cambiar ese permiso por ti.',
    // src/components/employee-mobile/device-alerts.tsx:33
    revoked2: 'El permiso o la configuración de este navegador cambió. Desactiva la configuración anterior antes de empezar de nuevo.',
    // src/components/employee-mobile/device-alerts.tsx:33
    install2: 'Añade NEVORA a tu pantalla de inicio. Ábrela desde ese ícono para configurar las alertas.',
    // src/components/employee-mobile/device-alerts.tsx:33
    unavailable2: 'Este navegador o la configuración actual no puede configurar alertas. Puedes seguir usando tus notificaciones en NEVORA.',
    // src/components/employee-mobile/device-alerts.tsx:33
    error2: 'Verifica de nuevo antes de empezar una solicitud nueva. También puedes desactivar la configuración anterior.',
    // src/components/employee-mobile/device-alerts.tsx:33
    dismissed: 'La configuración está pospuesta. Puedes volver cuando quieras.',
    // src/components/employee-mobile/device-alerts.tsx:33
    ready: 'Recibe cambios de horario, respuestas a tus solicitudes y avisos en este dispositivo. Si hace falta permiso, tu navegador te lo pedirá.',
    // src/components/employee-mobile/device-alerts.tsx:34
    stepsSafari: 'En Safari, abre Compartir y luego Agregar a pantalla de inicio. Activa Abrir como app web si aparece. Abre NEVORA desde el nuevo ícono.',
    // src/components/employee-mobile/device-alerts.tsx:34
    stepsBrowser: 'Abre el menú de tu navegador y elige Instalar aplicación o Agregar a pantalla de inicio si aparece. Abre NEVORA desde el nuevo ícono.',
    // src/components/employee-mobile/device-alerts.tsx:37
    checkAgain: 'Verificar de nuevo',
    // src/components/employee-mobile/device-alerts.tsx:37
    test: 'Probar notificación',
    // src/components/employee-mobile/device-alerts.tsx:38
    retryTurnOff: 'Reintentar desactivación',
    // src/components/employee-mobile/device-alerts.tsx:38, src/components/employee-mobile/device-alerts.tsx:45
    turnOff: 'Desactivar alertas',
    // src/components/employee-mobile/device-alerts.tsx:39
    notNow: 'Ahora no',
    // src/components/employee-mobile/device-alerts.tsx:43
    turnOffTitle: '¿Desactivar alertas aquí?',
    // src/components/employee-mobile/device-alerts.tsx:44
    turnOffTry: 'NEVORA intentará detener las alertas de esta cuenta en este navegador. Verificaremos el resultado antes de confirmar que están desactivadas.',
    // src/components/employee-mobile/device-alerts.tsx:44
    turnOffStays: 'El permiso de tu navegador, tus otros dispositivos y las notificaciones en NEVORA no cambian. Puede que aún aparezca una alerta que tu dispositivo ya tenía en cola.',
    // src/components/employee-mobile/device-alerts.tsx:45
    keepSetup: 'Conservar configuración',
    // src/components/employee-mobile/device-alerts.tsx:47
    setupFailed: 'La configuración no pudo terminar. Puedes pedirle ayuda a tu gerente.',
    // src/components/employee-mobile/device-alerts.tsx:48
    browserOnly: 'Estos configuración aplican solo a este navegador. Tus notificaciones siempre se quedan en NEVORA, y los configuración de tu teléfono pueden desactivar todas las alertas.',
    // src/components/employee-mobile/device-alerts.tsx:55, src/components/employee-mobile/device-alerts.tsx:68
    alerts: 'Alertas',
    // src/components/employee-mobile/device-alerts.tsx:55
    appNotAvailable: 'Tu trabajo no ha habilitado las alertas de la aplicación. Tus notificaciones siguen en NEVORA.',
    // src/components/employee-mobile/device-alerts.tsx:70
    signingOut: 'Cerrando sesión…',
  },
} as const;
