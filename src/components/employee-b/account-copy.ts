/* Words added for the Employee and Lead account screens in Phase 4 (Nov 17, 2026): Notifications row titles and
 * objects, Time off, Availability, Profile, More and the page that isn't found. English and Puerto Rico Spanish
 * ("usted"-neutral, as the existing Spanish pages). The signed-in app renders English today; the Spanish entries are
 * kept beside it and checked by account-copy.test.tsx so a later language switch has every sentence. */
export type AccountLang = 'en' | 'es';

const words = {
  en: {
    // Notifications: the title is the outcome, the sub-line is the object.
    schedulePublished: 'Schedule published', scheduleUpdated: 'Schedule updated', scheduleConfirm: 'Confirm your schedule', scheduleConfirmWeek: (day: string) => `Confirm the week of ${day}`,
    timeOffApproved: 'Time off approved', timeOffDeclined: 'Time off declined', timeOffAnswered: 'Time-off request answered',
    calloutApproved: 'Can’t-work request approved', calloutDeclined: 'Can’t-work request declined', calloutAnswered: 'Can’t-work request answered',
    swapApproved: 'Shift swap approved', swapDeclined: 'Shift swap declined', coverApproved: 'Shift cover approved', coverDeclined: 'Shift cover declined',
    swapForYou: 'Swap request waiting for you', coverForYou: 'Cover request waiting for you', requestForYou: 'Shift request waiting for you',
    requestClosed: 'Shift request closed', requestUpdated: 'Shift request updated',
    availabilityDue: 'Send your availability', availabilitySent: 'Availability sent', availabilityReminder: 'Availability reminder',
    updateToAcknowledge: 'Confirm the team update', updateShared: 'New team update',
    // Payroll scope: a statement is shared, never "paid".
    payStatementShared: 'Pay statement shared',
    weekOf: (day: string) => `Week of ${day}`, from: (name: string) => `From ${name}`,
    shifts: (n: number) => n === 0 ? 'No shifts for you' : `${n} ${n === 1 ? 'shift' : 'shifts'}`,
    now: {waiting: 'Now waiting', open: 'Now open', 'waiting on a coworker': 'Now waiting on a coworker', 'waiting on a manager': 'Now waiting on a manager', approved: 'Now approved', declined: 'Now declined', cancelled: 'Now cancelled'} as Record<string, string>,
    // Final polish, round 2: a swap or cover request that waits for this person carries the Requests page's chip.
    actionNeeded: 'Action needed', needsAnswer: 'Needs your answer', unread: 'unread',
    // Time off
    waiting: 'Waiting', decided: 'Decided',
    // Availability
    availabilityNoteLead: 'One-off days off go in', availabilityNoteLink: 'Requests',
    // Profile
    personalNote: 'Your manager keeps these up to date.', deleteTitle: 'Delete my account', deleteSub: 'Ends your access to this workspace', signOut: 'Sign out',
    roleEmployee: 'Employee', roleLead: 'Lead',
    // Page not found
    openSchedule: 'Open Schedule',
    // Phase 8 (review C, copy table): More's Updates row and Profile's alerts row say what they are for.
    updatesSub: 'Messages for your team',
    alertsSub: 'Turn alerts on or off',
    // Phase 8 (review C, row 19): one verb for an update that needs you.
    toAcknowledge: 'To confirm', otherUpdates: 'Other updates',
    // Phase 8 (review C, row 18): the same notice sent more than once, folded into one row.
    folded: (n: number) => `${n} notifications`,
    // Phase 9 (spec 2.3): Help's safety note carries the title Support's note has.
    privateTitle: 'Keep private details out of email',
  },
  es: {
    schedulePublished: 'Horario publicado', scheduleUpdated: 'Horario actualizado', scheduleConfirm: 'Confirme su horario', scheduleConfirmWeek: (day: string) => `Confirme la semana del ${day}`,
    timeOffApproved: 'Tiempo libre aprobado', timeOffDeclined: 'Tiempo libre rechazado', timeOffAnswered: 'Solicitud de tiempo libre respondida',
    calloutApproved: 'Solicitud de ausencia aprobada', calloutDeclined: 'Solicitud de ausencia rechazada', calloutAnswered: 'Solicitud de ausencia respondida',
    swapApproved: 'Cambio de turno aprobado', swapDeclined: 'Cambio de turno rechazado', coverApproved: 'Cobertura de turno aprobada', coverDeclined: 'Cobertura de turno rechazada',
    swapForYou: 'Solicitud de cambio en espera de su respuesta', coverForYou: 'Solicitud de cobertura en espera de su respuesta', requestForYou: 'Solicitud de turno en espera de su respuesta',
    requestClosed: 'Solicitud de turno cerrada', requestUpdated: 'Solicitud de turno actualizada',
    availabilityDue: 'Envíe su disponibilidad', availabilitySent: 'Disponibilidad enviada', availabilityReminder: 'Recordatorio de disponibilidad',
    updateToAcknowledge: 'Confirme el aviso del equipo', updateShared: 'Nuevo aviso del equipo',
    payStatementShared: 'Comprobante de pago compartido',
    weekOf: (day: string) => `Semana del ${day}`, from: (name: string) => `De ${name}`,
    shifts: (n: number) => n === 0 ? 'Sin turnos para usted' : `${n} ${n === 1 ? 'turno' : 'turnos'}`,
    now: {waiting: 'Ahora en espera', open: 'Ahora abierta', 'waiting on a coworker': 'Ahora en espera de un compañero', 'waiting on a manager': 'Ahora en espera de un gerente', approved: 'Ahora aprobada', declined: 'Ahora rechazada', cancelled: 'Ahora cancelada'} as Record<string, string>,
    actionNeeded: 'Requiere acción', needsAnswer: 'Necesita su respuesta', unread: 'sin leer',
    waiting: 'En espera', decided: 'Decididas',
    availabilityNoteLead: 'Los días libres sueltos van en', availabilityNoteLink: 'Solicitudes',
    personalNote: 'Su gerente mantiene estos datos al día.', deleteTitle: 'Eliminar mi cuenta', deleteSub: 'Termina su acceso a este espacio de trabajo', signOut: 'Cerrar sesión',
    roleEmployee: 'Empleado', roleLead: 'Líder',
    openSchedule: 'Abrir Horario',
    updatesSub: 'Mensajes para su equipo',
    alertsSub: 'Active o desactive las alertas',
    toAcknowledge: 'Por confirmar', otherUpdates: 'Otros avisos',
    folded: (n: number) => `${n} notificaciones`,
    privateTitle: 'No envíe datos privados por correo',
  },
} satisfies Record<AccountLang, Record<string, unknown>>;

export type AccountCopy = typeof words.en;
export const accountCopy = (lang: AccountLang = 'en'): AccountCopy => words[lang];
export const ACCOUNT_LOCALE: Record<AccountLang, string> = {en: 'en-US', es: 'es-PR'};
