/* Signed-in Spanish (Nov 23, 2026): the Schedule week picker's words (week-picker.tsx), in English and Puerto Rico
 * Spanish (docs/design/voice.md: sentence case, infinitive buttons, lowercase months, the glossary: "Horario"). English
 * is byte for byte what the picker said before. `label` is the week's first day, already in the person's language
 * ("Nov 16, 2026" · "16 nov 2026"). */
const en = {
  choose: (label: string) => `Choose schedule week, week of ${label}`,
  weekOf: 'Week of ',
  anyDay: 'Choose any day in the week', view: 'View week', sync: 'Calendar sync',
};
const es: typeof en = {
  choose: (label: string) => `Elegir semana del horario, semana del ${label}`,
  weekOf: 'Semana del ',
  anyDay: 'Elige cualquier día de la semana', view: 'Ver semana', sync: 'Sincronizar calendario',
};
export const weekPickerCopy = {en, es};
