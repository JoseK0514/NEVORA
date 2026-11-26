/* Signed-in Spanish (Nov 23, 2026): the words timeoff-parts.tsx draws for one time-off request (its dates, length,
 * state and decision), in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: "Días
 * libres", "solicitud de días libres", "gerente", "Retirar solicitud"). The parts are drawn by the phone view, the
 * desktop Requests page (a server component) and employee-b/timeoff-b.tsx, so they take a trailing language that
 * defaults to English and those callers keep their English byte for byte. A request ("solicitud") is feminine, so its
 * states agree with it ("Aprobada", "Retirada"). */
const en = {
  partOfDay: (range: string) => 'Part of day · ' + range,
  days: (n: number) => n + ' days',
  allDay: 'All day',
  status: {PENDING: 'Waiting', APPROVED: 'Approved', DENIED: 'Declined', CANCELLED: 'Withdrawn'} as Record<string, string>,
  openToCheck: 'Open to check',
  /** "Oct 26 at 3:00 PM" */
  at: (day: string, time: string) => day + ' at ' + time,
  waitingForManager: 'Waiting for your manager',
  youWithdrew: 'You withdrew it',
  approved: 'Approved', declined: 'Declined', decided: 'Decided',
  by: (name: string) => ' by ' + name,
  managerDecides: 'Your manager decides on this request',
  sent: (day: string) => 'Sent ' + day,
  timeOffRequest: 'Time-off request',
};
const es: typeof en = {
  partOfDay: (range: string) => 'Parte del día · ' + range,
  days: (n: number) => n + ' días',
  allDay: 'Todo el día',
  status: {PENDING: 'En espera', APPROVED: 'Aprobada', DENIED: 'Rechazada', CANCELLED: 'Retirada'} as Record<string, string>,
  openToCheck: 'Abrir para revisar',
  /** "26 oct a las 3:00 p. m." · "a la 1:00 p. m." */
  at: (day: string, time: string) => day + (/^1:/.test(time) ? ' a la ' : ' a las ') + time,
  waitingForManager: 'En espera de tu gerente',
  youWithdrew: 'La retiraste',
  approved: 'Aprobada', declined: 'Rechazada', decided: 'Decidida',
  by: (name: string) => ' por ' + name,
  managerDecides: 'Tu gerente decide sobre esta solicitud',
  sent: (day: string) => 'Enviada el ' + day,
  timeOffRequest: 'Solicitud de días libres',
};
export const timeoffPartsCopy = {en, es};
