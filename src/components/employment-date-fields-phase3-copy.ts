/* Signed-in Spanish (es-rest): the hire, termination and birth date fields of Add employee and Edit employee, in English
 * and Puerto Rico Spanish. The English is word for word what the fields said before (field errors: no closing period). */
const en = {
  choose: 'Select date', previous: 'Previous month', next: 'Next month', month: 'Month', year: 'Year', clear: 'Clear date', cancel: 'Cancel',
  terminationBeforeHire: 'The termination date can’t be before the hire date',
  floor: 'Enter a date in 1900 or later',
  hire: 'Hire date (optional)', hireBonus: 'Christmas bonus hours use this date.', hireRecords: 'For your records.',
  termination: 'Termination date (optional)', terminationHelp: 'For your records only. It doesn’t deactivate anyone.',
  birth: 'Date of birth (optional)', birthHelp: 'Private. Only Owners and Managers who can edit this profile see it.',
};
const es: typeof en = {
  choose: 'Elegir fecha', previous: 'Mes anterior', next: 'Mes siguiente', month: 'Mes', year: 'Año', clear: 'Quitar fecha', cancel: 'Cancelar',
  terminationBeforeHire: 'La fecha de terminación no puede ser antes de la fecha de contratación',
  floor: 'Ingresa una fecha de 1900 o después',
  hire: 'Fecha de contratación (opcional)', hireBonus: 'Las horas del bono de Navidad usan esta fecha.', hireRecords: 'Para tus récords.',
  termination: 'Fecha de terminación (opcional)', terminationHelp: 'Solo para tus récords. No desactiva a nadie.',
  birth: 'Fecha de nacimiento (opcional)', birthHelp: 'Privada. Solo la ven los dueños y gerentes que pueden editar este perfil.',
};
export const EMPLOYMENT_DATES_COPY = {en, es};
