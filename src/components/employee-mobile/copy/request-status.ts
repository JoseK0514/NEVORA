/* Signed-in Spanish (Jose's gap closure, Nov 23, 2026): the one vocabulary for request states (request-status.ts) in
 * English and Puerto Rico Spanish (docs/design/voice.md: "Retirada", "gerente", "Por confirmar" kept for the pill words;
 * a request is "una solicitud", so its states are feminine). English is exactly as it was. */
const en = {
  timeOff: {PENDING: 'Waiting for approval', APPROVED: 'Approved', DENIED: 'Declined', CANCELLED: 'Withdrawn'} as Record<string, string>,
  recorded: 'Recorded history',
  released: 'Released assignment',
  previousApproval: 'Previous approval',
  approved: 'Approved',
  completed: 'Completed',
  needsAnswer: 'Needs your answer',
  waitingTeammate: 'Waiting for a teammate',
  waitingManager: 'Waiting for manager review',
  waitingCoverage: 'Waiting for coverage',
  ended: {DENIED: 'Declined', CANCELLED: 'Cancelled', EXPIRED: 'Expired'} as Record<string, string>,
  unknown: 'Open to check status',
};
const es: typeof en = {
  timeOff: {PENDING: 'En espera de aprobación', APPROVED: 'Aprobada', DENIED: 'Rechazada', CANCELLED: 'Retirada'},
  recorded: 'Historial registrado',
  released: 'Asignación liberada',
  previousApproval: 'Aprobación anterior',
  approved: 'Aprobada',
  completed: 'Completada',
  needsAnswer: 'Necesita tu respuesta',
  waitingTeammate: 'Esperando a un compañero',
  waitingManager: 'Esperando revisión del gerente',
  waitingCoverage: 'Esperando quien cubra',
  ended: {DENIED: 'Rechazada', CANCELLED: 'Cancelada', EXPIRED: 'Vencida'},
  unknown: 'Ábrela para ver el estado',
};
export const requestStatusCopy = {en, es};
