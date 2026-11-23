/* Signed-in Spanish (Nov 23, 2026): the Time corrections queue (Owner and Manager) in English and Puerto Rico Spanish.
 * English is word for word what the queue said before. The Spanish follows docs/design/voice.md (tú, the glossary:
 * "Solicitud de corrección", "Marcación", "Tarjeta de tiempo", "Aprobar", "Rechazar") and reads the same as the
 * employee's side (employee-time-copy.ts) and the delegated form (delegated-time-correction-copy.ts). */
import type {PortalLang} from '@/lib/i18n/portal-lang';
import {timeZoneLabel} from '@/lib/time-zone-label';

const place = (timeZone: string) => timeZone.split('/').at(-1)?.replaceAll('_', ' ').trim();

const en = {
  // Notices after a decision (fixed sentences: the queue tells them apart by their English text).
  unknownNotice: 'We couldn’t confirm your decision. Try again; it won’t be applied twice.',
  approvedNotice: 'Correction approved. The original recorded punch remains unchanged.',
  rejectedNotice: 'Correction declined. The original recorded punch remains unchanged.',
  conflict: 'This request changed while you were reviewing it. Refresh to see the latest.',
  finalizedPeriod: 'This period is finalized. Reopen it in Timecards before reviewing this correction.',
  selfReview: 'Another manager or an Owner reviews your own request.',
  staleSource: 'The recorded times changed. Refresh before deciding.',
  overlap: 'These times overlap another entry.',
  liveState: 'This person is still clocked in. Correct it after they clock out.',
  endAfterStart: 'The end time must be after the start time.',
  failed: 'That didn’t go through. Refresh and try again.',
  // Results
  approvedTitle: 'Correction approved', declinedTitle: 'Correction declined', nothingElse: 'Nothing else is waiting.',
  approvedLine: 'The timecard shows the new times. The original clock times stay in its history.',
  declinedLine: 'The timecard keeps its recorded times.',
  // Decide
  askGroup: (name: string) => `Decline the correction for ${name}?`,
  keepLabel: (name: string) => `Keep the correction request for ${name}`,
  declineLabel: (name: string) => `Decline correction for ${name}`,
  approveLabel: (name: string) => `Approve correction for ${name}`,
  decline: 'Decline', approve: 'Approve',
  // Kinds
  missingTime: 'Missing time', namedBreak: (name: string) => name + ' break', recordedBreak: 'Recorded break',
  // Band and header
  waiting: (count: number) => `${count} waiting · `,
  bandNote: (zone: string) => `Fixes your team asked for. Original times are always kept. Times in ${timeZoneLabel(zone)}.`,
  title: 'Time corrections', heading: 'Correction requests',
  headerNote: 'Fixes to past clock times wait here for your decision. The original Clocker record is kept.',
  retry: 'Retry same decision',
  // States
  modes: {
    loading: 'Loading correction requests', offline: 'Correction requests unavailable offline', reconnecting: 'Reconnecting to correction requests',
    unavailable: 'Correction requests unavailable', access_lost: 'Correction access ended', not_allowed: 'You don’t have access to time corrections', paused: 'Updates paused',
  },
  accessLostLine: 'Your access changed. Sign in again to review corrections.', notAllowedLine: 'Ask the Owner if you need it.',
  didntLoad: 'Corrections didn’t load. Refresh to try again.',
  // A request
  approvingNote: 'Approving changes the timecard; the original clock times stay in the history',
  approvedMissingTime: 'Approved missing time', recorded: 'Recorded',
  baseChanged: 'The timecard changed after this request. Check the current times before deciding.',
  theirReason: 'Their reason', requestedBy: (name: string) => `Requested by ${name} for this employee.`,
  // Empty
  emptyTitle: 'Nothing to fix', emptyLine: 'When someone asks to fix a time, it shows up here.', goToTimecards: 'Go to Timecards',
};

const es: typeof en = {
  unknownNotice: 'No pudimos confirmar tu decisión. Inténtalo de nuevo; no se aplicará dos veces.',
  approvedNotice: 'Corrección aprobada. La marcación original registrada no cambia.',
  rejectedNotice: 'Corrección rechazada. La marcación original registrada no cambia.',
  conflict: 'Esta solicitud cambió mientras la revisabas. Actualiza para ver lo más reciente.',
  finalizedPeriod: 'Este período está finalizado. Reábrelo en Tarjetas de tiempo antes de revisar esta corrección.',
  selfReview: 'Otro gerente o el dueño revisa tu propia solicitud.',
  staleSource: 'Las horas registradas cambiaron. Actualiza antes de decidir.',
  overlap: 'Estas horas se solapan con otra entrada.',
  liveState: 'Esta persona sigue en turno. Corrígelo después de que marque salida.',
  endAfterStart: 'La hora de salida tiene que ser después de la hora de entrada.',
  failed: 'No se completó. Actualiza e inténtalo de nuevo.',
  approvedTitle: 'Corrección aprobada', declinedTitle: 'Corrección rechazada', nothingElse: 'No hay nada más en espera.',
  approvedLine: 'La tarjeta de tiempo muestra las horas nuevas. Las horas originales del reloj quedan en su historial.',
  declinedLine: 'La tarjeta de tiempo conserva sus horas registradas.',
  askGroup: (name: string) => `¿Rechazar la corrección de ${name}?`,
  keepLabel: (name: string) => `Conservar la solicitud de corrección de ${name}`,
  declineLabel: (name: string) => `Rechazar la corrección de ${name}`,
  approveLabel: (name: string) => `Aprobar la corrección de ${name}`,
  decline: 'Rechazar', approve: 'Aprobar',
  missingTime: 'Tiempo faltante', namedBreak: (name: string) => 'Descanso: ' + name, recordedBreak: 'Descanso registrado',
  waiting: (count: number) => `${count} en espera · `,
  bandNote: (zone: string) => `Correcciones que pidió tu equipo. Las horas originales siempre se guardan. Horas en ${place(zone) ? `hora de ${place(zone)}` : zone}.`,
  title: 'Correcciones de tiempo', heading: 'Solicitudes de corrección',
  headerNote: 'Las correcciones de horas pasadas esperan aquí tu decisión. El registro original del Clocker se guarda.',
  retry: 'Reintentar la misma decisión',
  modes: {
    loading: 'Cargando solicitudes de corrección', offline: 'Solicitudes de corrección no disponibles sin conexión', reconnecting: 'Volviendo a conectar con las solicitudes de corrección',
    unavailable: 'Solicitudes de corrección no disponibles', access_lost: 'Terminó tu acceso a las correcciones', not_allowed: 'No tienes acceso a las correcciones de tiempo', paused: 'Actualizaciones en pausa',
  },
  accessLostLine: 'Tu acceso cambió. Inicia sesión otra vez para revisar correcciones.', notAllowedLine: 'Pídeselo al dueño si lo necesitas.',
  didntLoad: 'No pudimos cargar las correcciones. Actualiza para intentarlo de nuevo.',
  approvingNote: 'Al aprobar, cambia la tarjeta de tiempo; las horas originales del reloj quedan en el historial',
  approvedMissingTime: 'Tiempo faltante aprobado', recorded: 'Registrado',
  baseChanged: 'La tarjeta de tiempo cambió después de esta solicitud. Revisa las horas actuales antes de decidir.',
  theirReason: 'Su razón', requestedBy: (name: string) => `Pedida por ${name} para este empleado.`,
  emptyTitle: 'Nada que corregir', emptyLine: 'Cuando alguien pida corregir una hora, aparecerá aquí.', goToTimecards: 'Ir a Tarjetas de tiempo',
};

export type ManagerTimeCorrectionsCopy = typeof en;
export const MANAGER_TIME_CORRECTIONS_COPY: Record<PortalLang, ManagerTimeCorrectionsCopy> = {en, es};
export const managerTimeCorrectionsCopy = (lang: PortalLang = 'en'): ManagerTimeCorrectionsCopy => MANAGER_TIME_CORRECTIONS_COPY[lang];

/** A notice the queue keeps in English (its fixed sentences are compared by text) said in the person's language. */
export function noticeIn(notice: string, lang: PortalLang): string {
  if (lang === 'en') return notice;
  const key = (Object.keys(en) as (keyof typeof en)[]).find(k => en[k] === notice);
  const said = key ? es[key] : undefined;
  return typeof said === 'string' ? said : notice;
}
