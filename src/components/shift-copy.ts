/* Signed-in Spanish (es-rest, Nov 23, 2026): the words of the shift request parts (the request form's result lines and
 * buttons, Decline and Approve, request history, the trade and coverage rules on Scheduling rules, the held edit's
 * recovery and the shift's place line) in English and Puerto Rico Spanish (docs/design/voice.md: tú, the glossary). The
 * English is the text these parts showed before, word for word. */
import type { PortalLang } from '@/lib/i18n/portal-lang';

const en = {
  feedback: {
    completed: 'Completed. The current schedule and request history have been refreshed.',
    pending: 'Request recorded. Review its current status below; an assignment may still be awaiting consent or management review.',
    closed: 'Request closed. Review its current status below.',
    conflict: 'Stale request. The assignment or request changed; reload and review before submitting again.',
    unavailable: 'This action is unavailable for your current account or request.',
    blocked: 'This change cannot proceed with the current rules.',
    outcomeUnknown: 'Outcome uncertain. The request may have been saved. Check and retry the same operation; your original entries are preserved.',
  },
  form: {
    processing: 'Processing…', recordedOpen: 'Request recorded. Open Shift requests to review its current status.', offline: ' Offline. Reconnect before continuing.',
    viewStatus: 'View request status', checkRetry: 'Check & retry same request', refreshAssignment: 'Refresh and review assignment', reloadRequest: 'Reload current request',
  },
  decide: { decline: 'Decline', declining: 'Declining…', approve: 'Approve', approving: 'Approving…' },
  history: { unavailable: 'Request history is unavailable. Reconnect and reload.', title: 'Request history', revision: (n: number | string) => `revision ${n}`, source: 'Original source: ', target: 'Original target: ' },
  policy: {
    ownerHelp: 'Until a rule is set, trades and cover wait for a manager.', managerHelp: 'An Owner sets these.', approved: 'How requests are approved',
    notSet: 'Not set yet', automatic: 'Automatically', managerReviews: 'Manager reviews',
    askLabel: 'Ask at least this many minutes before the shift', askHelp: 'Leave blank if you haven’t decided. 0 means right up to the start.',
    finishLabel: 'Finish at least this many minutes before the shift', finishHelp: 'Use the same number or less than the time to ask. Requests already sent keep their earlier deadline.',
    trades: 'Trades', coverage: 'Coverage', save: (scope: 'swap' | 'coverage') => `Save ${scope === 'swap' ? 'trade' : 'coverage'} policy`,
    unknown: 'Unknown', minutesBefore: (n: number) => `${n} minutes before`, askAtLeast: 'Ask at least', finishAtLeast: 'Finish at least',
  },
  recovery: {
    fields: { employeeId: 'Employee', positionId: 'Position', date: 'Date', startTime: 'Start', endTime: 'End', isDesignatedLead: 'Shift lead', notes: 'Notes' },
    retained: 'Your unsaved changes are retained below. Copy any values you need before reloading to review the current shift. Reloading replaces this draft.',
    toCopy: 'Unsaved changes to copy', submitted: 'Submitted shift changes', reload: 'Reload current shift',
  },
  place: { position: (id: string) => `Position ${id}`, shiftLead: 'Shift lead', timesIn: (zone: string) => `Times in ${zone}` },
};

const es: typeof en = {
  feedback: {
    completed: 'Listo. Se actualizaron el horario y el historial de solicitudes.',
    pending: 'Solicitud registrada. Revisa su estado abajo; puede que una asignación todavía espere aceptación o revisión de la gerencia.',
    closed: 'Solicitud cerrada. Revisa su estado abajo.',
    conflict: 'Solicitud desactualizada. La asignación o la solicitud cambió; vuelve a cargar y revisa antes de enviarla otra vez.',
    unavailable: 'Esta acción no está disponible para tu cuenta o esta solicitud.',
    blocked: 'Este cambio no puede seguir con las reglas actuales.',
    outcomeUnknown: 'Resultado sin confirmar. Puede que la solicitud se haya guardado. Revisa y reintenta la misma operación; se guardan tus datos originales.',
  },
  form: {
    processing: 'Procesando…', recordedOpen: 'Solicitud registrada. Abre Solicitudes de turnos para revisar su estado.', offline: ' Sin conexión. Vuelve a conectarte antes de seguir.',
    viewStatus: 'Ver estado de la solicitud', checkRetry: 'Revisar y reintentar la misma solicitud', refreshAssignment: 'Actualizar y revisar la asignación', reloadRequest: 'Volver a cargar la solicitud',
  },
  decide: { decline: 'Rechazar', declining: 'Rechazando…', approve: 'Aprobar', approving: 'Aprobando…' },
  history: { unavailable: 'El historial de solicitudes no está disponible. Vuelve a conectarte y carga otra vez.', title: 'Historial de solicitudes', revision: (n: number | string) => `revisión ${n}`, source: 'Origen: ', target: 'Destino: ' },
  policy: {
    ownerHelp: 'Hasta que fijes una regla, los cambios y las coberturas esperan por un gerente.', managerHelp: 'Un Dueño las fija.', approved: 'Cómo se aprueban las solicitudes',
    notSet: 'Sin fijar', automatic: 'Automáticamente', managerReviews: 'Lo revisa un gerente',
    askLabel: 'Pedir al menos estos minutos antes del turno', askHelp: 'Déjalo en blanco si no lo has decidido. 0 quiere decir hasta que empiece.',
    finishLabel: 'Completar al menos estos minutos antes del turno', finishHelp: 'Usa el mismo número o menos que el tiempo para pedir. Las solicitudes ya enviadas mantienen su fecha límite anterior.',
    trades: 'Cambios de turno', coverage: 'Coberturas', save: (scope: 'swap' | 'coverage') => `Guardar regla de ${scope === 'swap' ? 'cambios' : 'coberturas'}`,
    unknown: 'Desconocido', minutesBefore: (n: number) => `${n} minutos antes`, askAtLeast: 'Pedir al menos', finishAtLeast: 'Completar al menos',
  },
  recovery: {
    fields: { employeeId: 'Empleado', positionId: 'Puesto', date: 'Fecha', startTime: 'Inicio', endTime: 'Fin', isDesignatedLead: 'Líder del turno', notes: 'Notas' },
    retained: 'Tus cambios sin guardar están abajo. Copia lo que necesites antes de volver a cargar para revisar el turno actual. Al volver a cargar, se reemplaza este borrador.',
    toCopy: 'Cambios sin guardar para copiar', submitted: 'Cambios de turno enviados', reload: 'Volver a cargar el turno',
  },
  place: { position: (id: string) => `Puesto ${id}`, shiftLead: 'Líder del turno', timesIn: (zone: string) => `Horas en ${zone}` },
};

export const SHIFT_COPY: Record<PortalLang, typeof en> = { en, es };
export const shiftCopy = (lang: PortalLang = 'en') => SHIFT_COPY[lang];
