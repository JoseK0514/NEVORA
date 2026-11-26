/* Signed-in Spanish (es-rest): Home's live status line (the screen-reader summary under the band) in English and Puerto
 * Rico Spanish. The English is exactly the earlier wording. */
export type PremiumHomeLang = 'en' | 'es';

const en = {
  offline: 'You’re offline.',
  paused: 'Paused while you’re away.',
  failed: 'Couldn’t load everything.',
  checking: 'Checking what needs you…',
  today: (sentence: string) => `${sentence} today.`,
  /** Home's quiet look: the band's sentence when the count is exact ("3 things need you today."). */
  needsYou: (n: number) => n === 0 ? 'Nothing needs you right now.' : `${n}\u00a0${n === 1 ? 'thing needs' : 'things need'} you today.`,
  quiet: {
    notifications: 'Notifications', title: 'Today', rightNow: 'Right now',
    unavailable: 'Who’s on shift isn’t available', tryMoment: 'Try again in a moment', trying: 'Trying…', tryAgain: 'Try again',
    offline: 'You’re offline', paused: 'Paused while you’re away', checking: 'Checking who’s on shift…',
    updatesReconnect: 'Updates when you reconnect', updatesBack: 'Updates when you’re back',
    noneYet: 'No one on shift yet', noShifts: 'No shifts today', of: (on: number, all: number) => `${on} of ${all} on shift`, on: (n: number) => `${n} on shift`,
    firstAt: (time: string) => `First shift at ${time}`, startsAt: (name: string, time: string) => `${name} starts at ${time}`, noMore: 'No more shifts start today',
    openSchedule: ', open Schedule',
    thingsToDo: 'Things to do', nothing: 'Nothing needs you right now.',
    missed: 'Missed', notClockedIn: 'Not clocked in',
    ended: (time: string) => `Shift ended at ${time}`, began: (time: string) => `Shift began at ${time}`,
    lateLabel: (name: string) => `${name} hasn’t clocked in, open in Inbox`,
    notClockedInCount: (n: number) => `${n}\u00a0not clocked in`, noClockInLabel: (n: number) => `${n} shifts with no clock\u2011in, open in Inbox`,
    and: 'and', more: (n: number) => `${n} more`,
    openShifts: (n: number) => `${n} ${n === 1 ? 'open shift' : 'open shifts'}`, todayWord: 'Today', openShiftsLabel: (n: number) => `${n} ${n === 1 ? 'open shift' : 'open shifts'} today, open in Inbox`,
    urgent: (n: number) => `${n} ${n === 1 ? 'urgent item' : 'urgent items'}`, urgentLabel: (n: number) => `${n} ${n === 1 ? 'urgent item' : 'urgent items'}, open in Inbox`,
    requests: (n: number) => `${n} ${n === 1 ? 'request' : 'requests'}`, requestsLabel: (n: number) => `${n} ${n === 1 ? 'request' : 'requests'} waiting, open in Inbox`,
    kind: { TIME_OFF: 'time off', EXCHANGE: 'a shift swap', CALLOUT: 'a can’t-work request' } as Record<string, string>,
    from: (name: string) => ` from ${name}`,
    pendingChecking: 'Checking what needs you…', pendingReconnect: 'Updates when you reconnect.', pendingBack: 'Updates when you’re back.',
    pendingSignIn: 'Sign in again to see what needs you.', pendingDenied: 'You don’t have access to Things to do. Ask the Owner if you need it.',
    pendingFailed: 'What needs you isn’t available right now.', signIn: 'Sign in',
  },
};

const es: typeof en = {
  offline: 'No tienes conexión.',
  paused: 'En pausa mientras no estás.',
  failed: 'No pudimos cargar todo.',
  checking: 'Revisando qué necesita tu atención…',
  today: sentence => `${sentence} hoy.`,
  needsYou: n => n === 0 ? 'No tienes nada pendiente ahora.' : `${n}\u00a0${n === 1 ? 'asunto pendiente' : 'asuntos pendientes'} hoy.`,
  quiet: {
    notifications: 'Notificaciones', title: 'Hoy', rightNow: 'Ahora mismo',
    unavailable: 'No está disponible quién está en turno', tryMoment: 'Inténtalo de nuevo en un momento', trying: 'Intentando…', tryAgain: 'Intentar de nuevo',
    offline: 'No tienes conexión', paused: 'En pausa mientras no estás', checking: 'Revisando quién está en turno…',
    updatesReconnect: 'Se actualiza cuando vuelvas a conectarte', updatesBack: 'Se actualiza cuando regreses',
    noneYet: 'Nadie en turno todavía', noShifts: 'No hay turnos hoy', of: (on, all) => `${on} de ${all} en turno`, on: n => `${n} en turno`,
    firstAt: time => `El primer turno es a las ${time}`, startsAt: (name, time) => `${name} empieza a las ${time}`, noMore: 'No empiezan más turnos hoy',
    openSchedule: ', abrir Horario',
    thingsToDo: 'Pendientes', nothing: 'No tienes nada pendiente ahora.',
    missed: 'No marcó entrada', notClockedIn: 'Sin marcar entrada',
    ended: time => `El turno terminó a las ${time}`, began: time => `El turno empezó a las ${time}`,
    lateLabel: name => `${name} no ha marcado entrada, abrir en Pendientes`,
    notClockedInCount: n => `${n}\u00a0sin marcar entrada`, noClockInLabel: n => `${n} ${n === 1 ? 'turno' : 'turnos'} sin marcar entrada, abrir en Pendientes`,
    and: 'y', more: n => `${n} más`,
    openShifts: n => `${n} ${n === 1 ? 'turno disponible' : 'turnos disponibles'}`, todayWord: 'Hoy', openShiftsLabel: n => `${n} ${n === 1 ? 'turno disponible' : 'turnos disponibles'} hoy, abrir en Pendientes`,
    urgent: n => `${n} ${n === 1 ? 'asunto urgente' : 'asuntos urgentes'}`, urgentLabel: n => `${n} ${n === 1 ? 'asunto urgente' : 'asuntos urgentes'}, abrir en Pendientes`,
    requests: n => `${n} ${n === 1 ? 'solicitud' : 'solicitudes'}`, requestsLabel: n => `${n} ${n === 1 ? 'solicitud' : 'solicitudes'} en espera, abrir en Pendientes`,
    kind: { TIME_OFF: 'días libres', EXCHANGE: 'un cambio de turno', CALLOUT: 'un aviso de no puedo trabajar' },
    from: name => ` de ${name}`,
    pendingChecking: 'Revisando lo que te espera…', pendingReconnect: 'Se actualiza cuando vuelvas a conectarte.', pendingBack: 'Se actualiza cuando regreses.',
    pendingSignIn: 'Inicia sesión otra vez para ver lo que te espera.', pendingDenied: 'No tienes acceso a Pendientes. Pídeselo al dueño si lo necesitas.',
    pendingFailed: 'Lo que te espera no está disponible ahora.', signIn: 'Iniciar sesión',
  },
};

export const PREMIUM_HOME_COPY = { en, es };

export const copy = {
  en: {
    // src/components/premium-home.tsx:125
    premiumPendingFailedNvBtn: '.premium-pending-failed .nv-btn',
    // src/components/premium-home.tsx:130
    today: '{count} today.',
    // src/components/premium-home.tsx:131
    offline: 'You’re offline.',
    // src/components/premium-home.tsx:132
    paused: 'Paused while you’re away.',
    // src/components/premium-home.tsx:133
    failed: 'Couldn’t load everything.',
    // src/components/premium-home.tsx:134, src/components/premium-home.tsx:241
    checking: 'Checking what needs you…',
    // src/components/premium-home.tsx:167
    notifications: 'Notifications',
    // src/components/premium-home.tsx:168, src/components/premium-home.tsx:230
    todayLabel: 'Today',
    // src/components/premium-home.tsx:180
    anchorNoteAnd: ' and ',
    // src/components/premium-home.tsx:180
    more: '{first} and {firstCount} more',
    // src/components/premium-home.tsx:185
    rightNow: 'Right now',
    // src/components/premium-home.tsx:187
    whoOnShiftIsnAvailable: 'Who’s on shift isn’t available',
    // src/components/premium-home.tsx:187
    detail: 'Try again in a moment',
    // src/components/premium-home.tsx:190
    offlineTitle: 'You’re offline',
    // src/components/premium-home.tsx:190
    pausedLabel: 'Paused while you’re away',
    // src/components/premium-home.tsx:190, src/components/premium-home.tsx:197
    checkingWhoOnShift: 'Checking who’s on shift…',
    // src/components/premium-home.tsx:190
    detailLabel: 'Updates when you reconnect',
    // src/components/premium-home.tsx:190
    detail2: 'Updates when you’re back',
    // src/components/premium-home.tsx:198
    noOneOnShiftYet: 'No one on shift yet',
    // src/components/premium-home.tsx:198
    noShiftsToday: 'No shifts today',
    // src/components/premium-home.tsx:199
    onShift: '{onShift} of {scheduled} on shift',
    // src/components/premium-home.tsx:199
    onShift2: '{onShift} on shift',
    // src/components/premium-home.tsx:200
    firstShiftAt: 'First shift at {startAt}',
    // src/components/premium-home.tsx:200
    startsAt: '{employeeName} starts at {startAt}',
    // src/components/premium-home.tsx:201
    noMoreShiftsStartToday: 'No more shifts start today',
    // src/components/premium-home.tsx:202
    openSchedule: '{Boolean}, open Schedule',
    // src/components/premium-home.tsx:207, src/components/premium-home.tsx:221, src/components/premium-home.tsx:222, src/components/premium-home.tsx:244
    thingsDo: 'Things to do',
    // src/components/premium-home.tsx:207
    nothing: 'Nothing needs you right now.',
    // src/components/premium-home.tsx:218
    canWorkRequest: 'a can’t-work request',
    // src/components/premium-home.tsx:219
    from: '{kindInitial}{kindRemainder} from {requester}',
    // src/components/premium-home.tsx:220
    placesTwo: '{kinds} and {value}',
    // src/components/premium-home.tsx:224
    detail3: 'Shift ended at {endAt}',
    // src/components/premium-home.tsx:224
    detail4: 'Shift began at {startAt}',
    // src/components/premium-home.tsx:226
    hasnClockedInOpenInInbox: '{employeeName} hasn’t clocked in, open in Inbox',
    // src/components/premium-home.tsx:227
    notClockedIn: '{lateCount} not clocked in',
    // src/components/premium-home.tsx:228
    shiftsNoOpenInInbox: '{lateCount} shifts with no {CLOCK_IN}, open in Inbox',
    // src/components/premium-home.tsx:230
    todayOpenInInbox: '{gapsCount} today, open in Inbox',
    // src/components/premium-home.tsx:232
    openInInbox: '{otherUrgentCount}, open in Inbox',
    // src/components/premium-home.tsx:234
    waitingOpenInInbox: '{requestsCount} waiting, open in Inbox',
    // src/components/premium-home.tsx:241
    updatesReconnect: 'Updates when you reconnect.',
    // src/components/premium-home.tsx:241
    updatesBack: 'Updates when you’re back.',
    // src/components/premium-home.tsx:242
    signInAgain: 'Sign in again to see what needs you.',
    // src/components/premium-home.tsx:242
    noAccess: 'You don’t have access to Things to do. Ask the Owner if you need it.',
    // src/components/premium-home.tsx:242
    whatNeedsIsnAvailableRightNow: 'What needs you isn’t available right now.',
    // src/components/premium-home.tsx:246
    signIn: 'Sign in',
    // src/components/premium-home.tsx:247
    tryAgain: 'Try again',
  },
  es: {
    // src/components/premium-home.tsx:125
    premiumPendingFailedNvBtn: '.95um-pendiente-fallo.nv-btn',
    // src/components/premium-home.tsx:130
    today: '{count} hoy.',
    // src/components/premium-home.tsx:131
    offline: 'No tienes conexión.',
    // src/components/premium-home.tsx:132
    paused: 'En pausa mientras no estás.',
    // src/components/premium-home.tsx:133
    failed: 'No pudimos cargar todo.',
    // src/components/premium-home.tsx:134, src/components/premium-home.tsx:241
    checking: 'Revisando qué necesita tu atención…',
    // src/components/premium-home.tsx:167
    notifications: 'Notificaciones',
    // src/components/premium-home.tsx:168, src/components/premium-home.tsx:230
    todayLabel: 'Hoy',
    // src/components/premium-home.tsx:180
    anchorNoteAnd: ' y ',
    // src/components/premium-home.tsx:180
    more: '{first} y {firstCount} más',
    // src/components/premium-home.tsx:185
    rightNow: 'Ahora mismo',
    // src/components/premium-home.tsx:187
    whoOnShiftIsnAvailable: 'Quién está de turno no está disponible',
    // src/components/premium-home.tsx:187
    detail: 'Inténtalo de nuevo en un momento',
    // src/components/premium-home.tsx:190
    offlineTitle: 'No tienes conexión',
    // src/components/premium-home.tsx:190
    pausedLabel: 'En pausa mientras no estás',
    // src/components/premium-home.tsx:190, src/components/premium-home.tsx:197
    checkingWhoOnShift: 'Comprobando quién está en turno',
    // src/components/premium-home.tsx:190
    detailLabel: 'Actualiza cuando se vuelve a conectar',
    // src/components/premium-home.tsx:190
    detail2: 'Actualiza cuando estás de vuelta',
    // src/components/premium-home.tsx:198
    noOneOnShiftYet: 'Nadie en turno todavía',
    // src/components/premium-home.tsx:198
    noShiftsToday: 'No hay turnos hoy',
    // src/components/premium-home.tsx:199
    onShift: '{onShift} de {scheduled} en turno',
    // src/components/premium-home.tsx:199
    onShift2: '{onShift} en turno',
    // src/components/premium-home.tsx:200
    firstShiftAt: 'Primer turno en {startAt}',
    // src/components/premium-home.tsx:200
    startsAt: '{employeeName} comienza en {startAt}',
    // src/components/premium-home.tsx:201
    noMoreShiftsStartToday: 'No más turnos empiezan hoy',
    // src/components/premium-home.tsx:202
    openSchedule: '{Boolean}, abrir el horario',
    // src/components/premium-home.tsx:207, src/components/premium-home.tsx:221, src/components/premium-home.tsx:222, src/components/premium-home.tsx:244
    thingsDo: 'Pendientes',
    // src/components/premium-home.tsx:207
    nothing: 'No tienes nada pendiente ahora.',
    // src/components/premium-home.tsx:218
    canWorkRequest: 'una solicitud no puede funcionar',
    // src/components/premium-home.tsx:219
    from: '{kindInitial}{kindRemainder} de {requester}',
    // src/components/premium-home.tsx:220
    placesTwo: '{kinds} y {value}',
    // src/components/premium-home.tsx:224
    detail3: 'Turno finalizado en {endAt}',
    // src/components/premium-home.tsx:224
    detail4: 'El turno comenzó en {startAt}',
    // src/components/premium-home.tsx:226
    hasnClockedInOpenInInbox: '{employeeName} no ha registrado, abierto en el buzón de entrada',
    // src/components/premium-home.tsx:227
    notClockedIn: '{lateCount} sin reloj',
    // src/components/premium-home.tsx:228
    shiftsNoOpenInInbox: '{lateCount} cambia sin {CLOCK_IN}, abre en el buzón de entrada',
    // src/components/premium-home.tsx:230
    todayOpenInInbox: '{gapsCount} hoy, abre en el buzón de entrada',
    // src/components/premium-home.tsx:232
    openInInbox: '{otherUrgentCount}, abrir en el buzón de entrada',
    // src/components/premium-home.tsx:234
    waitingOpenInInbox: '{requestsCount} espera, abrir en el buzón de entrada',
    // src/components/premium-home.tsx:241
    updatesReconnect: 'Se actualiza cuando vuelvas a conectarte.',
    // src/components/premium-home.tsx:241
    updatesBack: 'Se actualiza cuando regreses.',
    // src/components/premium-home.tsx:242
    signInAgain: 'Inicia sesión otra vez para ver lo que te espera.',
    // src/components/premium-home.tsx:242
    noAccess: 'No tienes acceso a Pendientes. Pídeselo al dueño si lo necesitas.',
    // src/components/premium-home.tsx:242
    whatNeedsIsnAvailableRightNow: 'Lo que necesita no está disponible ahora mismo',
    // src/components/premium-home.tsx:246
    signIn: 'Iniciar sesión',
    // src/components/premium-home.tsx:247
    tryAgain: 'Intentar de nuevo',
  },
} as const;
