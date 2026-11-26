export const copy = {
  en: {
    // src/components/correction-time-ticket.tsx:13
    am: "AM",
    // src/components/correction-time-ticket.tsx:13
    pm: "PM",
    // src/components/correction-time-ticket.tsx:24
    chooseATime: "Choose a time",
    // src/components/correction-time-ticket.tsx:34
    start: "Start",
    // src/components/correction-time-ticket.tsx:36
    end: "End",
    // src/components/correction-time-ticket.tsx:38
    selectATimeToChangeIt: "Select a time to change it",
    // src/components/correction-time-ticket.tsx:38
    endMustBeAfterStart: "End must be after start",
  },
  es: {
    // src/components/correction-time-ticket.tsx:13
    am: "a.\u00a0m.",
    // src/components/correction-time-ticket.tsx:13
    pm: "p.\u00a0m.",
    // src/components/correction-time-ticket.tsx:24
    chooseATime: "Elige una hora",
    // src/components/correction-time-ticket.tsx:34
    start: "Inicio",
    // src/components/correction-time-ticket.tsx:36
    end: "Fin",
    // src/components/correction-time-ticket.tsx:38
    selectATimeToChangeIt: "Elige una hora para cambiarla",
    // src/components/correction-time-ticket.tsx:38
    endMustBeAfterStart: "El fin tiene que ser después del inicio",
  },
} as const;

/* Signed-in Spanish (es-rest): the words of the correction form's Start and End ticket (correction-time-ticket.tsx),
 * English as written and Puerto Rico Spanish ("8:00 a. m.", "mié, 14 oct"). */
const en = {
  locale: 'en-US', am: 'AM', pm: 'PM',
  start: 'Start', end: 'End', chooseTime: 'Choose a time',
  selectTime: 'Select a time to change it', endAfterStart: 'End must be after start',
};
const es: typeof en = {
  locale: 'es-PR', am: copy.es.am, pm: copy.es.pm,
  start: copy.es.start, end: copy.es.end, chooseTime: copy.es.chooseATime,
  selectTime: copy.es.selectATimeToChangeIt, endAfterStart: copy.es.endMustBeAfterStart,
};
export const CORRECTION_TIME_TICKET_COPY = { en, es };
