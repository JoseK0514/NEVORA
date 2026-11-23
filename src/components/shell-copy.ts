/* Signed-in Spanish (gap closure, Nov 23, 2026): the app shell's words, English and Puerto Rico Spanish (tú, voice.md
 * glossary). English is exactly what the shell said before; Spanish follows the glossary (Pendientes, Días libres,
 * Horario, Turno disponible, Cambios de turno, Aviso, Nómina, Tarjeta de tiempo, Iniciar/Cerrar sesión, Dueño) and the
 * app's existing Spanish ("Exportar horas", "Añadir", "Configuración"). */
import type { PortalLang } from '@/lib/i18n/portal-lang';

/** Navigation labels from `src/lib/navigation.ts` and `src/lib/finder.ts`, keyed by their English text so the navigation
 * module, its access rules and its tests stay as they are; a label a company renamed (its word preset) has no entry and
 * shows as the company wrote it. */
const NAV_ES: Record<string, string> = {
  'Home': 'Inicio',
  'Things to do': 'Pendientes',
  'To do': 'Pendientes',
  'Schedule': 'Horario',
  'Availability': 'Disponibilidad',
  'Time off': 'Días libres',
  'Shift requests': 'Cambios de turno',
  'Updates': 'Avisos',
  'Team': 'Equipo',
  'Timecards': 'Tarjetas de tiempo',
  'Insights': 'Informes',
  'Time exports': 'Exportar horas',
  'Week templates': 'Plantillas de semana',
  'Scheduling rules': 'Reglas del horario',
  'My schedule': 'Mi horario',
  'My time': 'Mis horas',
  'Requests': 'Solicitudes',
  'Notifications': 'Notificaciones',
  'Profile': 'Perfil',
  'Time': 'Horas',
  'Pay': 'Pago',
  'Who’s working': 'Quién está en turno',
  'Hours this week': 'Horas esta semana',
  'Activity': 'Actividad',
  'Clocker recovery': 'Recuperar el Clocker',
  'Help someone sign in': 'Ayudar a iniciar sesión',
  'More': 'Más',
  'Team tools': 'Herramientas del equipo',
  'Time and pay': 'Horas y pago',
  'Planning': 'Planificación',
  'Account': 'Cuenta',
  'Plan and billing': 'Plan y facturación',
  'Rondo AI': 'Rondo AI',
  'Payroll': 'Nómina',
  'My pay': 'Mi pago',
  'Settings': 'Configuración',
  'Time corrections': 'Correcciones de tiempo',
  'Pay runs': 'Nóminas',
  'Help': 'Ayuda',
  // Finder pages and actions (src/lib/finder.ts).
  'Pages': 'Páginas',
  'Actions': 'Acciones',
  'People': 'Personas',
  'Locations': 'Localidades',
  'Company profile': 'Perfil de la empresa',
  'Branding': 'Marca',
  'Features and team terms': 'Funciones y términos del equipo',
  'Company policies': 'Políticas de la empresa',
  'Break types': 'Tipos de descanso',
  'Positions': 'Posiciones',
  'Clocker tablets': 'Tabletas Clocker',
  'Clocker PINs': 'PIN del Clocker',
  'Punch photos': 'Fotos de marcación',
  'Shift matching': 'Coincidencia con el turno',
  'Payroll settings': 'Configuración de nómina',
  'Pay history': 'Historial de pago',
  'Pick up and swap': 'Tomar y cambiar turnos',
  'Request time off': 'Pedir días libres',
  'Swap a shift': 'Cambiar un turno',
  'Set availability': 'Indicar disponibilidad',
  'Add shift': 'Añadir turno',
  'Add employee': 'Añadir empleado',
  'Write an update': 'Escribir un aviso',
  'Build and publish': 'Preparar y publicar',
  'Copy previous week': 'Copiar la semana anterior',
  'Schedule › More': 'Horario › Más',
  'Review time-off requests': 'Revisar solicitudes de días libres',
  'Approve timecards': 'Aprobar tarjetas de tiempo',
  'Set a Clocker PIN': 'Asignar un PIN del Clocker',
  'Open the person on Team': 'Abre a la persona en Equipo',
};

/** A navigation or finder label in the person's language. */
export function navLabel(label: string, lang: PortalLang): string {
  return lang === 'es' ? NAV_ES[label] ?? label : label;
}
/** For tests: every Spanish navigation label, keyed by its English. */
export const NAV_LABELS_ES: Readonly<Record<string, string>> = NAV_ES;

/** Search words that find a page in Spanish, added to its English ones (the finder matches either). */
export const FINDER_KEYWORDS_ES: Readonly<Record<string, string>> = {
  '/app': 'inicio hoy',
  '/app/inbox': 'pendientes solicitudes decisiones aprobar rechazar',
  '/app/schedule': 'horario turnos semana',
  '/app/employees': 'equipo personas empleados',
  '/app/timecards': 'tarjetas de tiempo horas marcaciones aprobar',
  '/app/reports': 'informes horas',
  '/app/updates': 'avisos mensajes',
  '/app/my-time': 'horas tarjeta marcaciones',
  '/app/my-pay': 'pago comprobante día de pago',
  '/app/requests': 'solicitudes',
  '/app/requests/hub': 'solicitudes',
  '/app/exchange': 'turno disponible cambiar cubrir',
  '/app/availability': 'disponibilidad cuándo puedo trabajar',
  '/app/notifications': 'notificaciones alertas',
  '/app/profile': 'perfil cuenta idioma',
  '/app/help': 'ayuda soporte preguntas',
  '/app/payroll': 'nómina pago',
  '/app/settings': 'configuración',
};

type ShellWords = {
  roles: Record<'OWNER' | 'MANAGER' | 'LEAD' | 'EMPLOYEE', string>;
  offlineUpdated: (time: string) => string;
  offline: string;
  logoAlt: (company: string) => string;
  expandSidebar: string;
  collapseSidebar: string;
  primaryNavigation: string;
  mobileNavigation: string;
  youAreHere: string;
  yourProfile: string;
  profileAndDevice: string;
  addToCalendar: string;
  myPay: string;
  alertsOnDevice: string;
  deviceSettings: string;
  help: string;
  privacyAndTerms: string;
  signOut: string;
  skipToContent: string;
  notifications: string;
  addShift: string;
  moreFor: (name: string, initials: string) => string;
  /** "Things to do, 3" for a screen reader on a nav entry with a count. */
  withCount: (label: string, count: string) => string;
  sectionPages: (section: string) => string;
  accountMenu: (name: string) => string;
  // Notification bell.
  bellUnavailable: string;
  bellUnread: (count: number, partial: boolean) => string;
  bellUnreadVisible: (count: number, partial: boolean) => string;
  bellChecking: string;
  bellUnknown: string;
  // Toasts.
  toastMessages: string;
  toastDismiss: string;
  timeOffApproved: string;
  timeOffDeclined: string;
  // Action menus.
  done: string;
  actionsFor: (label: string) => string;
  // The app's error and not-found pages.
  errorTitle: string;
  errorLine: string;
  errorReference: (reference: string) => string;
  goHome: string;
  notFoundTitle: string;
  notFoundLine: string;
  pageNotFound: string;
  errorAdvice: (online: boolean) => string;
  openSchedule: string;
  // More.
  profileAndSettings: string;
  profileAndSettingsFor: (name: string) => string;
  yourWork: string;
  helpAndLegal: string;
  you: string;
  work: string;
  settingsAndHelp: string;
  thisWeek: (hours: string) => string;
};

const en: ShellWords = {
  roles: { OWNER: 'Owner', MANAGER: 'Manager', LEAD: 'Lead', EMPLOYEE: 'Employee' },
  offlineUpdated: time => `Offline · updated ${time}`,
  offline: 'You’re offline. Reconnect to see the latest.',
  logoAlt: company => `${company} logo`,
  expandSidebar: 'Expand sidebar',
  collapseSidebar: 'Collapse sidebar',
  primaryNavigation: 'Primary navigation',
  mobileNavigation: 'Mobile navigation',
  youAreHere: 'You are here',
  yourProfile: 'Your profile',
  profileAndDevice: 'Profile and device settings',
  addToCalendar: 'Add shifts to your calendar',
  myPay: 'My pay',
  alertsOnDevice: 'Alerts on this device',
  deviceSettings: 'Device settings',
  help: 'Help',
  privacyAndTerms: 'Privacy and terms',
  signOut: 'Sign out',
  skipToContent: 'Skip to content',
  notifications: 'Notifications',
  addShift: 'Add shift',
  moreFor: (name, initials) => `More, ${name}, ${initials}`,
  withCount: (label, count) => `${label}, ${count}`,
  sectionPages: section => `${section} pages`,
  accountMenu: name => `${name}, account menu`,
  bellUnavailable: 'Notifications unavailable',
  bellUnread: (count, partial) => `Notifications, ${partial ? 'at least ' : ''}${count} unread in your recent inbox`,
  bellUnreadVisible: (count, partial) => `${partial ? 'at least ' : ''}${count} unread`,
  bellChecking: 'Notifications, checking updates',
  bellUnknown: 'Notifications, current count unavailable',
  toastMessages: 'Messages',
  toastDismiss: 'Dismiss message',
  timeOffApproved: 'Time off approved',
  timeOffDeclined: 'Time off declined',
  done: 'Done',
  actionsFor: label => `${label} actions`,
  errorTitle: 'This page didn’t load',
  errorLine: 'Nothing was changed.',
  errorReference: reference => `Reference: ${reference}`,
  goHome: 'Go to Home',
  notFoundTitle: 'This page doesn’t exist',
  notFoundLine: 'The link may be old, or the page may have moved.',
  pageNotFound: 'Page not found',
  errorAdvice: online => online ? 'Something went wrong on our side. Try again.' : 'Check your connection, then try again.',
  openSchedule: 'Open Schedule',
  profileAndSettings: 'Profile and settings',
  profileAndSettingsFor: name => `Profile and settings, ${name}`,
  yourWork: 'Your work',
  helpAndLegal: 'Help and legal',
  you: 'You',
  work: 'Work',
  settingsAndHelp: 'Settings and help',
  thisWeek: hours => `${hours} this week`,
};

const es: ShellWords = {
  roles: { OWNER: 'Dueño', MANAGER: 'Gerente', LEAD: 'Líder de turno', EMPLOYEE: 'Empleado' },
  offlineUpdated: time => `Sin conexión · actualizado ${time}`,
  offline: 'Estás sin conexión. Conéctate para ver lo más reciente.',
  logoAlt: company => `Logo de ${company}`,
  expandSidebar: 'Abrir el menú lateral',
  collapseSidebar: 'Cerrar el menú lateral',
  primaryNavigation: 'Navegación principal',
  mobileNavigation: 'Navegación',
  youAreHere: 'Estás aquí',
  yourProfile: 'Tu perfil',
  profileAndDevice: 'Perfil y configuración del dispositivo',
  addToCalendar: 'Añadir turnos a tu calendario',
  myPay: 'Mi pago',
  alertsOnDevice: 'Alertas en este dispositivo',
  deviceSettings: 'Configuración del dispositivo',
  help: 'Ayuda',
  privacyAndTerms: 'Privacidad y términos',
  signOut: 'Cerrar sesión',
  skipToContent: 'Ir al contenido',
  notifications: 'Notificaciones',
  addShift: 'Añadir turno',
  moreFor: (name, initials) => `Más, ${name}, ${initials}`,
  withCount: (label, count) => `${label}, ${count}`,
  sectionPages: section => `Páginas de ${section}`,
  accountMenu: name => `${name}, menú de la cuenta`,
  bellUnavailable: 'Notificaciones no disponibles',
  bellUnread: (count, partial) => `Notificaciones, ${partial ? 'al menos ' : ''}${count} sin leer entre las recientes`,
  bellUnreadVisible: (count, partial) => `${partial ? 'al menos ' : ''}${count} sin leer`,
  bellChecking: 'Notificaciones, buscando novedades',
  bellUnknown: 'Notificaciones, no pudimos verificar cuántas hay',
  toastMessages: 'Mensajes',
  toastDismiss: 'Cerrar mensaje',
  timeOffApproved: 'Días libres aprobados',
  timeOffDeclined: 'Días libres rechazados',
  done: 'Listo',
  actionsFor: label => `Acciones de ${label}`,
  errorTitle: 'Esta página no cargó',
  errorLine: 'No se cambió nada.',
  errorReference: reference => `Referencia: ${reference}`,
  goHome: 'Ir a Inicio',
  notFoundTitle: 'Esta página no existe',
  notFoundLine: 'Puede que el enlace sea viejo o que la página se haya movido.',
  pageNotFound: 'Página no encontrada',
  errorAdvice: online => online ? 'Algo falló de nuestro lado. Inténtalo de nuevo.' : 'Revisa tu conexión e inténtalo de nuevo.',
  openSchedule: 'Abrir Horario',
  profileAndSettings: 'Perfil y configuración',
  profileAndSettingsFor: name => `Perfil y configuración, ${name}`,
  yourWork: 'Tu trabajo',
  helpAndLegal: 'Ayuda y aviso legal',
  you: 'Tú',
  work: 'Trabajo',
  settingsAndHelp: 'Configuración y ayuda',
  thisWeek: hours => `${hours} esta semana`,
};

export const SHELL_WORDS: Record<PortalLang, ShellWords> = { en, es };

/** A clock time from the shared helpers ("4:49 PM") in the person's language ("4:49 p. m."). */
export function localClock(time: string, lang: PortalLang): string {
  return lang === 'es' ? time.replace(/\bAM\b/g, 'a. m.').replace(/\bPM\b/g, 'p. m.') : time;
}

type FinderWords = {
  placeholderDesktop: string; placeholderPhone: string; placeholderOwn: string;
  trigger: string; dialogOwn: string; dialog: string; clear: string; closeSearch: string; close: string; results: string;
  offline: string; unavailable: string; loading: string; nothing: (query: string) => string;
  shownOf: (shown: number, total: number, group: string) => string; keepTyping: string;
  move: string; open: string; toClose: string;
};
/** The finder (command-finder.tsx). */
export const FINDER_WORDS: Record<PortalLang, FinderWords> = {
  en: {
    placeholderDesktop: 'Search pages, people and places', placeholderPhone: 'Search', placeholderOwn: 'Search your pages',
    trigger: 'Search', dialogOwn: 'Search your pages', dialog: 'Find a page, person or place', clear: 'Clear search', closeSearch: 'Close search', close: 'Close', results: 'Results',
    offline: 'People and places unavailable offline', unavailable: 'People and places are unavailable right now.', loading: 'Loading people and places…',
    nothing: query => `Nothing matches “${query}”`,
    shownOf: (shown, total, group) => `${shown} of ${total} ${group.toLowerCase()}`, keepTyping: 'keep typing to narrow',
    move: 'to move', open: 'to open', toClose: 'to close',
  },
  es: {
    placeholderDesktop: 'Buscar páginas, personas y localidades', placeholderPhone: 'Buscar', placeholderOwn: 'Buscar tus páginas',
    trigger: 'Buscar', dialogOwn: 'Buscar tus páginas', dialog: 'Buscar una página, persona o localidad', clear: 'Borrar búsqueda', closeSearch: 'Cerrar búsqueda', close: 'Cerrar', results: 'Resultados',
    offline: 'Personas y localidades no disponibles sin conexión', unavailable: 'Personas y localidades no están disponibles ahora.', loading: 'Cargando personas y localidades…',
    nothing: query => `Nada coincide con “${query}”`,
    shownOf: (shown, total, group) => `${shown} de ${total} ${group.toLowerCase()}`, keepTyping: 'sigue escribiendo para acotar',
    move: 'para moverte', open: 'para abrir', toClose: 'para cerrar',
  },
};

type ValidationWords = {
  choose: (label: string) => string; chooseOption: string; selectToContinue: string; enter: (label: string) => string; fillIn: string;
  email: string; atLeast: (count: number) => string; orMore: (value: string) => string; orLess: (value: string) => string;
};
/** Form validation's own sentences (form-validation.tsx); a field's own sentence (data-missing, title) is the page's. */
export const VALIDATION_WORDS: Record<PortalLang, ValidationWords> = {
  en: {
    choose: label => `Choose ${label}`, chooseOption: 'Choose an option', selectToContinue: 'Select this to continue', enter: label => `Enter ${label}`,
    fillIn: 'Fill in this field', email: 'Enter an email like name@example.com', atLeast: count => `Use at least ${count} characters`,
    orMore: value => `Use ${value} or more`, orLess: value => `Use ${value} or less`,
  },
  es: {
    choose: label => `Elige ${label}`, chooseOption: 'Elige una opción', selectToContinue: 'Marca esta opción para continuar', enter: label => `Escribe ${label}`,
    fillIn: 'Completa este campo', email: 'Escribe un correo como nombre@ejemplo.com', atLeast: count => `Usa al menos ${count} caracteres`,
    orMore: value => `Usa ${value} o más`, orLess: value => `Usa ${value} o menos`,
  },
};

type DeviceState = 'loading' | 'unavailable' | 'install' | 'ready' | 'enabled' | 'denied' | 'revoked' | 'pending' | 'error' | 'dismissed';
type DeviceWords = {
  states: Record<DeviceState, string>;
  exampleFrom: string; exampleTitle: string; exampleLine: string; exampleNow: string;
  keepHandy: string; addToHome: string; standalone: string; standaloneUnknown: string; addToHomeButton: string; showInstructions: string;
  instructionsIos: string; instructionsOther: string; instructionsNote: string;
  stayUpdated: string; stayUpdatedLine: string; enable: string; turnOff: string; test: string; checkAgain: string; checking: string; updating: string; notNow: string;
  updateReady: string; installAccepted: string; installPostponed: string; installUnavailable: string;
};
/** Device settings (portal-device-setup.tsx). */
export const DEVICE_WORDS: Record<PortalLang, DeviceWords> = {
  en: {
    states: {
      loading: 'Checking this device…', unavailable: 'Notifications are unavailable in this browser or configuration. You can keep using NEVORA.',
      install: 'Open NEVORA from your Home Screen to set up notifications on this device.', ready: 'Enable notifications for schedule updates and requests on this device.',
      enabled: 'Notifications are enabled on this device.', denied: 'Notifications are blocked. Restore permission in your browser or device settings, then reopen NEVORA.',
      revoked: 'Browser notification access changed. Turn off the old enrollment, then check permission in your browser or device settings.',
      pending: 'Updating this device…', error: 'Device setup needs attention.', dismissed: 'Setup postponed. You can return here whenever you are ready.',
    },
    exampleFrom: 'NEVORA · Example', exampleTitle: 'Your shift moved', exampleLine: 'Thursday is now 12:00 – 8:00 PM.', exampleNow: 'now',
    keepHandy: 'Keep NEVORA Handy', addToHome: 'Add NEVORA to your Home Screen for quick access to your schedule.', standalone: 'Opened as a standalone app.',
    standaloneUnknown: 'We cannot confirm whether this window is standalone.', addToHomeButton: 'Add to Home Screen', showInstructions: 'Show install instructions',
    instructionsIos: 'In Safari, use Share → Add to Home Screen. Enable “Open as Web App” if offered, then open NEVORA from the new icon.',
    instructionsOther: 'Open your browser menu and choose Install app or Add to Home Screen if available, then open NEVORA from the new icon.',
    instructionsNote: 'Reading these instructions does not install the app.',
    stayUpdated: 'Stay updated', stayUpdatedLine: 'Receive important schedule changes and reminders.', enable: 'Enable notifications', turnOff: 'Turn off',
    test: 'Test notification', checkAgain: 'Check again', checking: 'Checking…', updating: 'Updating…', notNow: 'Not now',
    updateReady: 'An update is ready. Close NEVORA tabs and reopen when your work is saved.',
    installAccepted: 'Browser install request accepted. Open NEVORA from its icon to confirm standalone use.',
    installPostponed: 'Install postponed. You can use the browser menu later.', installUnavailable: 'The browser install prompt is unavailable. Use the install instructions.',
  },
  es: {
    states: {
      loading: 'Verificando este dispositivo…', unavailable: 'Las notificaciones no están disponibles en este navegador o configuración. Puedes seguir usando NEVORA.',
      install: 'Abre NEVORA desde tu pantalla de inicio para activar las notificaciones en este dispositivo.', ready: 'Activa las notificaciones de cambios de horario y solicitudes en este dispositivo.',
      enabled: 'Las notificaciones están activadas en este dispositivo.', denied: 'Las notificaciones están bloqueadas. Permítelas en la configuración de tu navegador o dispositivo y vuelve a abrir NEVORA.',
      revoked: 'Cambió el permiso de notificaciones del navegador. Desactiva el registro anterior y revisa el permiso en la configuración de tu navegador o dispositivo.',
      pending: 'Actualizando este dispositivo…', error: 'La configuración del dispositivo necesita atención.', dismissed: 'Configuración pospuesta. Puedes volver aquí cuando quieras.',
    },
    exampleFrom: 'NEVORA · Ejemplo', exampleTitle: 'Tu turno cambió', exampleLine: 'El jueves ahora es de 12:00 – 8:00 p. m.', exampleNow: 'ahora',
    keepHandy: 'Ten NEVORA a la mano', addToHome: 'Añade NEVORA a tu pantalla de inicio para llegar rápido a tu horario.', standalone: 'Abierto como app.',
    standaloneUnknown: 'No podemos confirmar si esta ventana está abierta como app.', addToHomeButton: 'Añadir a la pantalla de inicio', showInstructions: 'Ver cómo instalar',
    instructionsIos: 'En Safari, toca Compartir → Añadir a pantalla de inicio. Activa “Abrir como app web” si aparece y luego abre NEVORA desde el ícono nuevo.',
    instructionsOther: 'Abre el menú de tu navegador y elige Instalar app o Añadir a pantalla de inicio si aparece, y luego abre NEVORA desde el ícono nuevo.',
    instructionsNote: 'Leer estas instrucciones no instala la app.',
    stayUpdated: 'Mantente al día', stayUpdatedLine: 'Recibe los cambios de horario importantes y los recordatorios.', enable: 'Activar notificaciones', turnOff: 'Desactivar',
    test: 'Probar notificación', checkAgain: 'Verificar de nuevo', checking: 'Verificando…', updating: 'Actualizando…', notNow: 'Ahora no',
    updateReady: 'Hay una actualización lista. Cierra las pestañas de NEVORA y vuelve a abrirlas cuando hayas guardado tu trabajo.',
    installAccepted: 'El navegador aceptó instalar la app. Abre NEVORA desde su ícono para confirmar que abre como app.',
    installPostponed: 'Instalación pospuesta. Puedes usar el menú del navegador más tarde.', installUnavailable: 'El navegador no ofrece instalar ahora. Sigue las instrucciones.',
  },
};

/** What the loading frames say is loading (route-skeleton.tsx, root-loading.tsx and each route's loading.tsx pass the
 * English); Spanish keyed by that English, lower-cased. A label without an entry reads "Cargando la página…". */
const LOADING_ES: Record<string, string> = {
  'add location': 'el formulario de localidad', 'branding': 'la marca', 'break types': 'los tipos de descanso', 'christmas bonus hours': 'las horas del bono de Navidad',
  'clocker pins': 'los PIN del Clocker', 'clocker recovery': 'la recuperación del Clocker', 'clocker tablets': 'las tabletas Clocker', 'company policies': 'las políticas de la empresa',
  'company profile': 'el perfil de la empresa', 'features and team terms': 'las funciones y términos', 'help someone sign in': 'la ayuda para iniciar sesión', 'location': 'la localidad',
  'locations': 'las localidades', 'positions': 'las posiciones', 'settings': 'la configuración', 'time off policies': 'las políticas de días libres', 'availability': 'la disponibilidad',
  'import pay': 'la importación de pago', 'inbox': 'los pendientes', 'insights': 'los informes', 'notifications': 'las notificaciones', 'paid time export': 'la exportación de tiempo pagado',
  'pay rates': 'las tarifas de pago', 'payroll settings': 'la configuración de nómina', 'payroll': 'la nómina', 'profile': 'el perfil', 'punch photo settings': 'la configuración de fotos de marcación',
  'punch photos': 'las fotos de marcación', 'requests': 'las solicitudes', 'schedule': 'el horario', 'scheduling rules': 'las reglas del horario', 'shift matching': 'la coincidencia con el turno',
  'shift requests': 'los cambios de turno', 'team': 'el equipo', 'templates': 'las plantillas', 'the clocker pin': 'el PIN del Clocker', 'the agreement': 'el acuerdo',
  'the copy result': 'el resultado de la copia', 'the new employee form': 'el formulario de empleado nuevo', 'the report form': 'el formulario', 'the shift': 'el turno',
  'the staff list import': 'la importación del personal', 'the swap': 'el cambio', 'the time off balance': 'el balance de días libres', 'the update form': 'el formulario del aviso',
  'this shift': 'este turno', 'this team member': 'esta persona', 'time exports': 'Exportar horas', 'time off': 'los días libres', 'timecards': 'las tarjetas de tiempo', 'update': 'el aviso',
  'updates': 'los avisos', 'your agreed times': 'tus horarios acordados', 'your pay': 'tu pago', 'your time': 'tus horas', 'more': 'Más', 'help': 'la ayuda', 'plan and billing': 'el plan y la facturación',
  'rondo ai': 'Rondo AI', 'delete account': 'la eliminación de la cuenta', 'this page': 'esta página', 'the new location form': 'el formulario de localidad', 'account recovery': 'la recuperación de cuenta',
  'your workspace': 'tu trabajo', 'time corrections': 'las correcciones de tiempo',
};
/** "Loading your pay…" · "Cargando tu pago…". */
export function loadingLine(label: string, lang: PortalLang): string {
  return lang === 'es' ? `Cargando ${LOADING_ES[label.toLocaleLowerCase()] ?? 'la página'}…` : `Loading ${label}…`;
}
