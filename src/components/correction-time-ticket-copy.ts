/* Signed-in Spanish (es-rest): the words of the correction form's Start and End ticket (correction-time-ticket.tsx),
 * English as written and Puerto Rico Spanish ("8:00 a. m.", "mié, 14 oct"). */
const en = {
  locale: 'en-US', am: 'AM', pm: 'PM',
  start: 'Start', end: 'End', chooseTime: 'Choose a time',
  selectTime: 'Select a time to change it', endAfterStart: 'End must be after start',
};
const es: typeof en = {
  locale: 'es-PR', am: 'a. m.', pm: 'p. m.',
  start: 'Inicio', end: 'Fin', chooseTime: 'Elige una hora',
  selectTime: 'Elige una hora para cambiarla', endAfterStart: 'El fin tiene que ser después del inicio',
};
export const CORRECTION_TIME_TICKET_COPY = { en, es };
