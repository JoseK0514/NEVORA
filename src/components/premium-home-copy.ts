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
