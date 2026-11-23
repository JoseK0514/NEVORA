/* Signed-in Spanish (es-rest): Team's own pages (/app/employees: the person, Access and sign-in, the Positions and Hours
 * and rules sheets, Add employee, and the route titles) in English and Puerto Rico Spanish (docs/design/voice.md: tú,
 * Dueño, localidad, Días libres, Tarjeta de tiempo). The English is word for word what the pages said before. The forms
 * and panels these pages draw (team forms, invitation, access grants, pay, time off, restrictions) keep their own copy. */
import type {PortalLang} from '@/lib/i18n/portal-lang';

const en = {
  team: 'Team', teamMember: 'Team member', employeesUnavailable: 'Employees unavailable', profileUnavailable: 'Employee profile unavailable',
  edit: 'Edit', cancel: 'Cancel', save: 'Save',
  roles: {OWNER: 'Owner', MANAGER: 'Manager', LEAD: 'Lead', EMPLOYEE: 'Employee'} as Record<string, string>,
  pinSet: 'Set', pinNotSet: 'Not set', unavailable: 'Unavailable',
  inactive: 'Inactive', invited: 'Invited', notActivated: 'Not activated', active: 'Active', placeInactive: ' (inactive)',
  signInActive: 'Sign-in active', noEmail: 'No email, can’t sign in',
  invitedOn: (date: string | null) => `Invited${date ? ` ${date}` : ''}, not activated`,
  invitationExpired: 'Invitation expired', notInvited: 'Not invited yet', noPin: 'No Clocker PIN yet',
  notAvailable: 'Not available', scheduleUnread: 'The whole schedule couldn’t be read',
  noPhone: 'No phone number', call: (name: string) => `Call ${name}`, message: (name: string) => `Message ${name}`,
  hours: 'Hours', scheduledToday: 'Scheduled today', scheduledWeek: 'Scheduled this week', clockedWeek: 'Clocked this week', includesBreaks: 'Includes breaks',
  work: 'Work', shifts: 'Shifts', timecards: 'Timecards', availability: 'Availability', restrictions: 'When they can be scheduled',
  payRate: 'Pay rate', timeOffBalance: 'Time off balance',
  accessTitle: 'Access and sign-in', access: 'Access', role: 'Role', account: 'Account', employeeId: 'Employee ID',
  resetPassword: 'Reset password', resetDetail: 'Give them a link to set a new password',
  scopeUnconfirmed: 'Management access could not be confirmed. Refresh this employee before changing access.',
  positions: 'Positions', noPositions: 'No positions yet. Positions are optional.', inactiveQualification: 'Inactive, kept as a qualification',
  workLocations: 'Locations they can work at', theirLocation: 'Their location, always included',
  hoursRules: 'Hours and rules', operationalRules: 'Operational rules', rulesFailed: 'Couldn’t load the rules. Reconnect and reload the page.',
  setWeeklyFirst: 'Set this person’s weekly hours first. No maximum is created by this review.', setWeekly: 'Set weekly hours',
  noneYet: 'None yet', backToBonus: 'Back to Christmas bonus hours',
  editEmployee: 'Edit employee', whatYouCanChange: 'What you can change',
  ownerOnly: 'Only an Owner can change another Owner', positionsStay: 'Positions and hours stay available here.',
  addEmployee: 'Add employee', addUnavailable: 'Add employee unavailable',
  addErrors: {
    permission: 'Only an Owner can add another Owner.',
    save: 'Couldn’t add this person. Check that the employee ID and email aren’t already in use.',
    id: 'Enter a unique employee ID with no more than 128 characters.',
    name: 'Enter a first and last name.',
    email: 'Check the email, or leave it blank.',
  } as Record<string, string>,
  addIncomplete: 'Complete all required employee fields.', addLocationFirst: 'Add a location first.', locations: 'Locations',
  askOwnerLocation: 'Ask an Owner to add a location first.',
  clockerPin: 'Clocker PIN', clockerPinUnavailable: 'Clocker PIN unavailable',
};
const es: typeof en = {
  team: 'Equipo', teamMember: 'Miembro del equipo', employeesUnavailable: 'Empleados no disponibles', profileUnavailable: 'Perfil no disponible',
  edit: 'Editar', cancel: 'Cancelar', save: 'Guardar',
  roles: {OWNER: 'Dueño', MANAGER: 'Gerente', LEAD: 'Líder', EMPLOYEE: 'Empleado'},
  pinSet: 'Configurado', pinNotSet: 'Sin configurar', unavailable: 'No disponible',
  inactive: 'Inactivo', invited: 'Invitado', notActivated: 'Sin activar', active: 'Activo', placeInactive: ' (inactiva)',
  signInActive: 'Acceso activo', noEmail: 'Sin correo, no puede iniciar sesión',
  invitedOn: (date: string | null) => `Invitado${date ? ` el ${date}` : ''}, sin activar`,
  invitationExpired: 'Invitación vencida', notInvited: 'Aún sin invitar', noPin: 'Aún sin PIN de Clocker',
  notAvailable: 'No disponible', scheduleUnread: 'No pudimos leer todo el horario',
  noPhone: 'Sin número de teléfono', call: (name: string) => `Llamar a ${name}`, message: (name: string) => `Enviar mensaje a ${name}`,
  hours: 'Horas', scheduledToday: 'Programado hoy', scheduledWeek: 'Programado esta semana', clockedWeek: 'Marcado esta semana', includesBreaks: 'Incluye descansos',
  work: 'Trabajo', shifts: 'Turnos', timecards: 'Tarjetas de tiempo', availability: 'Disponibilidad', restrictions: 'Cuándo se le puede programar',
  payRate: 'Tarifa de pago', timeOffBalance: 'Balance de días libres',
  accessTitle: 'Acceso e inicio de sesión', access: 'Acceso', role: 'Rol', account: 'Cuenta', employeeId: 'ID de empleado',
  resetPassword: 'Restablecer contraseña', resetDetail: 'Envíale un enlace para crear una contraseña nueva',
  scopeUnconfirmed: 'No pudimos confirmar el acceso de gerencia. Vuelve a cargar su perfil antes de cambiar el acceso.',
  positions: 'Puestos', noPositions: 'Aún no hay puestos. Los puestos son opcionales.', inactiveQualification: 'Inactivo, se mantiene como cualificación',
  workLocations: 'Localidades donde puede trabajar', theirLocation: 'Su localidad, siempre incluida',
  hoursRules: 'Horas y reglas', operationalRules: 'Reglas operativas', rulesFailed: 'No pudimos cargar las reglas. Vuelve a conectarte y recarga la página.',
  setWeeklyFirst: 'Primero fija las horas semanales de esta persona. Esta revisión no crea ningún máximo.', setWeekly: 'Fijar horas semanales',
  noneYet: 'Ninguno aún', backToBonus: 'Volver a horas del bono de Navidad',
  editEmployee: 'Editar empleado', whatYouCanChange: 'Lo que puedes cambiar',
  ownerOnly: 'Solo un dueño puede cambiar a otro dueño', positionsStay: 'Los puestos y las horas siguen disponibles aquí.',
  addEmployee: 'Añadir empleado', addUnavailable: 'Añadir empleado no está disponible',
  addErrors: {
    permission: 'Solo un dueño puede añadir a otro dueño.',
    save: 'No pudimos añadir a esta persona. Revisa que el ID de empleado y el correo no estén en uso.',
    id: 'Ingresa un ID de empleado único de 128 caracteres o menos.',
    name: 'Ingresa un nombre y un apellido.',
    email: 'Revisa el correo o déjalo en blanco.',
  },
  addIncomplete: 'Completa todos los campos requeridos del empleado.', addLocationFirst: 'Primero añade una localidad.', locations: 'Localidades',
  askOwnerLocation: 'Pide al dueño que añada una localidad primero.',
  clockerPin: 'PIN de Clocker', clockerPinUnavailable: 'PIN de Clocker no disponible',
};
export const EMPLOYEES_COPY = {en, es};

/** "Nov 14" in English, "14 nov" in Spanish, in the workplace's zone. */
export function invitedDate(lang: PortalLang, date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-PR' : 'en-US', {timeZone, month: 'short', day: 'numeric'}).format(date);
}
