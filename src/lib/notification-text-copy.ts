/* Signed-in Spanish (es-rest R2, Nov 23, 2026): the words the notification lists build from the list payload (titles,
 * facts, each row's destination and action), in English and Puerto Rico Spanish (docs/design/voice.md: tú, "Días libres",
 * "Pendientes", "Aviso", "Comprobante de pago", "Nómina"). English is the text the helpers wrote, word for word. */
export type NotificationLang = 'en' | 'es';

type Presentation = { destination: string; action: string };

const en = {
  /** Titles by the label the server sends (list-presentation titles, the kind labels, legacy labels). English keeps the
   * label as sent, so it has none. */
  titles: {} as Record<string, string>,
  rowTitles: { 'Operations need review': { title: 'Things to do are waiting for you', detail: 'Open shifts, requests or missing availability' } } as Record<string, { title: string; detail: string }>,
  weekOf: 'Week of ',
  dateLocale: 'en-US',
  status: { PENDING: 'waiting', OPEN: 'open', EMPLOYEE_PENDING: 'waiting on a coworker', MANAGER_PENDING: 'waiting on a manager', APPROVED: 'approved', DENIED: 'declined', CANCELLED: 'cancelled' } as Record<string, string>,
  now: (status: string) => `Now ${status}`,
  noShifts: 'No shifts for you',
  shifts: (n: number) => `${n}\u00A0${n === 1 ? 'shift' : 'shifts'}`,
  waiting: (n: number) => `${n}\u00A0waiting`,
  presentation: {
    schedule: { destination: 'Review your current schedule', action: 'Review schedule' } as Presentation,
    timeOff: { destination: 'Review your time-off request', action: 'View request' } as Presentation,
    exchange: { destination: 'Review your shift request', action: 'View request' } as Presentation,
    update: { destination: 'Read the current team update', action: 'Read update' } as Presentation,
    availability: { destination: 'Review your availability', action: 'View availability' } as Presentation,
    callout: { destination: 'Review your can’t-work request', action: 'View can’t-work request' } as Presentation,
    operations: { destination: 'Review current operational actions', action: 'Review actions' } as Presentation,
    payroll: { destination: 'Review the current payroll period', action: 'Review payroll' } as Presentation,
    statement: { destination: 'Open your current pay statement', action: 'View statement' } as Presentation,
    test: { destination: 'Review this device notification test', action: 'View test' } as Presentation,
    other: { destination: 'Open the current record', action: 'Open' } as Presentation,
  },
};

export type NotificationTextCopy = typeof en;

const es: NotificationTextCopy = {
  titles: {
    'Schedule published': 'Horario publicado', 'Schedule updated': 'Horario actualizado', 'Review your schedule': 'Revisa tu horario',
    'Time off approved': 'Días libres aprobados', 'Time off declined': 'Días libres rechazados',
    'Can’t-work request approved': 'Solicitud de no puedo trabajar aprobada', 'Can’t-work request declined': 'Solicitud de no puedo trabajar rechazada',
    'Swap request': 'Solicitud de intercambio', 'Swap approved': 'Intercambio aprobado', 'Swap declined': 'Intercambio rechazado',
    'Cover approved': 'Cobertura aprobada', 'Cover declined': 'Cobertura rechazada', 'A shift needs cover': 'Un turno necesita cobertura',
    'Pay statement available': 'Comprobante de pago disponible', 'Statements need preparation': 'Hay comprobantes por preparar',
    'Team update': 'Aviso del equipo', 'Items need review': 'Hay asuntos por revisar', 'Operations need review': 'Hay asuntos por revisar',
    'Schedule update': 'Cambio en el horario', 'Time-off update': 'Cambio en días libres', 'Time off update': 'Cambio en días libres',
    'Shift request update': 'Cambio en una solicitud de turno', 'Can’t-work update': 'Cambio en no puedo trabajar', 'Callout update': 'Cambio en no puedo trabajar',
    'Unable to work update': 'Cambio en no puedo trabajar', 'Availability update': 'Cambio en la disponibilidad',
    'Device notification test': 'Prueba de notificación del dispositivo', 'Pay statement update': 'Cambio en el comprobante de pago',
    'Payroll preparation update': 'Cambio en la preparación de nómina',
  },
  rowTitles: { 'Operations need review': { title: 'Tienes pendientes esperando', detail: 'Turnos disponibles, solicitudes o disponibilidad sin enviar' } },
  weekOf: 'Semana del ',
  dateLocale: 'es-PR',
  status: { PENDING: 'en espera', OPEN: 'abierta', EMPLOYEE_PENDING: 'esperando a un compañero', MANAGER_PENDING: 'esperando a un gerente', APPROVED: 'aprobada', DENIED: 'rechazada', CANCELLED: 'cancelada' },
  now: status => `Ahora ${status}`,
  noShifts: 'No tienes turnos',
  shifts: n => `${n}\u00A0${n === 1 ? 'turno' : 'turnos'}`,
  waiting: n => `${n}\u00A0en espera`,
  presentation: {
    schedule: { destination: 'Revisa tu horario actual', action: 'Revisar horario' },
    timeOff: { destination: 'Revisa tu solicitud de días libres', action: 'Ver solicitud' },
    exchange: { destination: 'Revisa tu solicitud de turno', action: 'Ver solicitud' },
    update: { destination: 'Lee el aviso actual del equipo', action: 'Leer aviso' },
    availability: { destination: 'Revisa tu disponibilidad', action: 'Ver disponibilidad' },
    callout: { destination: 'Revisa tu solicitud de no puedo trabajar', action: 'Ver solicitud de no puedo trabajar' },
    operations: { destination: 'Revisa las acciones pendientes', action: 'Revisar acciones' },
    payroll: { destination: 'Revisa el período de nómina actual', action: 'Revisar nómina' },
    statement: { destination: 'Abre tu comprobante de pago actual', action: 'Ver comprobante' },
    test: { destination: 'Revisa esta prueba de notificación del dispositivo', action: 'Ver prueba' },
    other: { destination: 'Abre el registro actual', action: 'Abrir' },
  },
};

export const NOTIFICATION_TEXT_COPY: Record<NotificationLang, NotificationTextCopy> = { en, es };
