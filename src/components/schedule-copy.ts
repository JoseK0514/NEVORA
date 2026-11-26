/* Signed-in Spanish (es-rest, Nov 23, 2026): the words of the Schedule's shared parts (Add and Edit shift, What changed,
 * per-location publishing, Build draft, Copy previous week, Find cover's list and the grid's coverage line) in English and
 * Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary). The English is the text these parts showed
 * before, word for word. Each part reads the person's language with usePortalLang(). */
import type { PortalLang } from '@/lib/i18n/portal-lang';
import { formatDayLabel, formatTime } from '@/lib/date-utils';

const NBSP = ' ';
/** "6:00 a. m." keeps the day period intact and allows a line break after the numeric time. */
export const esTime = (time: string) => formatTime(time).replace(/ AM$/, ` a.${NBSP}m.`).replace(/ PM$/, ` p.${NBSP}m.`);
const esShort = (iso: string, part: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-PR', { ...part, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`)).replace('.', '');
/** "mié, 14 oct" (voice.md, Dates). */
export const esDay = (iso: string) => `${esShort(iso, { weekday: 'short' })}, ${esShort(iso, { day: 'numeric' })}${NBSP}${esShort(iso, { month: 'short' })}`;
/** "14 oct". */
export const esDate = (iso: string) => `${esShort(iso, { day: 'numeric' })}${NBSP}${esShort(iso, { month: 'short' })}`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const en = {
  /** "Wed, Oct 14". */
  dayText: (date: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)),
  /** "Mon, Nov 2" (the publication list's form). */
  dayLabel: (date: string) => { const label = formatDayLabel(date); return `${label.weekday}, ${label.day}`; },
  /** "Nov 2". */
  shortDate: (date: string) => formatDayLabel(date).day,
  time: (time: string) => formatTime(time),
  shiftForm: {
    editShift: 'Edit shift', addShift: 'Add shift', cancel: 'Cancel', save: 'Save',
    person: 'Person', chooseSomeone: 'Choose someone', selected: (name: string) => `Selected employee: ${name}`,
    location: 'Location', fixedHelp: 'A shift keeps its location. To move it, delete it and add a new one.',
    position: 'Position', none: 'None', unavailable: (name: string | undefined) => `${name ?? 'Existing position'} (unavailable)`,
    date: 'Date', choose: 'Choose', start: 'Start', end: 'End', ends: (day: string) => `Ends ${day}`,
    shiftLead: 'Shift lead', leadHelp: 'Must be an Owner, Manager or Lead.', note: 'Note', optional: 'Optional',
    saving: "Saving…", saveChanges: 'Save changes', saveShift: 'Save shift',
  },
  change: {
    verbs: { ADDED: 'Added', REMOVED: 'Removed', TIME_CHANGED: 'New time', EMPLOYEE_REASSIGNED: 'Reassigned', LOCATION_CHANGED: 'New location', POSITION_CHANGED: 'New position', LEAD_CHANGED: 'Lead changed', CALLOUT_CHANGED: 'Can’t work updated' } as Record<string, string>,
    moved: 'Moved', locationUnavailable: 'Location unavailable', shiftLead: 'Shift lead', cantWorkApproved: 'Can’t work approved',
    was: (what: string) => `Was ${what}`, hadNoPosition: 'Had no position', summary: 'What changed in your schedule',
  },
  publish: {
    label: 'Publish weekly schedule',
    notPublished: (n: number) => `${n} ${n === 1 ? 'change' : 'changes'} not published`, changesNotPublished: 'Changes not published',
    heldLine: 'Publishing also sends the changes to published days. Review them in Build and publish first.', reviewChanges: 'Review changes',
    reviewBefore: (place: string) => `Review ${place} before publishing this week.`,
    coverageGaps: (n: number) => `${n} uncovered coverage blocks.`, missingLead: (n: number) => `${n} blocks missing a designated lead.`,
    positionSetup: 'Position requirements need setup.', staffingSetup: 'Staffing requirements need setup.', coverageSetup: 'Coverage windows need setup.',
    under: (n: number) => `${n} employees below their weekly hour target.`, over: (n: number) => `${n} employees above their weekly hour target.`,
    noTarget: (n: number) => `${n} employees without a weekly hour target.`,
    hoursNote: 'Employee hour counts cover the business week across locations. Publishing makes this location’s schedule visible to employees.',
    unconfirmed: (place: string) => `Publishing ${place} could not be confirmed. It may already be published; check the schedule before you publish again.`,
    checkSchedule: 'Check the schedule', publishing: 'Publishing…', publishPlace: (place: string) => `Publish ${place}`, anyway: ' anyway',
    returnToDraft: 'Return to draft', noLocations: 'No active locations are available to publish.',
  },
  generate: {
    building: 'Building…', buildDraft: 'Build draft', filling: 'Filling…', fillGaps: 'Fill gaps only', allowing: 'Allowing…', allowAutoFill: 'Allow auto-fill',
    reviewSetup: (n: number) => `Review location setup (${n})`,
    summary: (added: number, removed: number, preserved: number) => `${added} added · ${removed} removed · ${preserved} preserved · `,
    attempted: (n: number) => ` · ${n} locations attempted`, needSetup: (n: number) => ` · ${n} need setup`,
    reviewGaps: (n: number) => `Review gaps and warnings (${n})`,
    staffNeeded: (n: number) => `${n} staff needed`, leadNeeded: 'Lead needed', positionNeeded: (n: number, name: string) => `${n} ${name} needed`,
    excluded: 'Manager excluded · Automatic fill off', designatedLead: 'Designated lead', controlsLabel: 'Automatic draft scheduling',
    locationsNeedSetup: (n: number) => ` · ${n} locations need setup`, unavailable: 'Scheduling review unavailable. Reload to try again.',
    draftOnlyNot: (names: string) => `Build changes Draft locations only. Not in Draft: ${names}.`, selectedNeedSetup: 'Selected locations need setup.',
    draftOnly: 'Build changes Draft locations only.', excludedCount: (n: number) => `Manager excluded · Automatic fill off (${n})`, fillAllowed: 'Automatic fill allowed',
  },
  copy: {
    copyPrevious: 'Copy previous week',
    storageUnavailable: 'Local recovery storage is unavailable. Enable browser storage before copying.',
    notRetained: 'Could not retain the operation for retry. No copy was sent.', checking: 'Checking the original operation…',
    didntGoThrough: 'The original copy didn’t go through. You can start a new copy when ready.',
    accessRequired: 'Current management access is required. Sign in again to check the original operation.',
    unconfirmed: 'Outcome is unconfirmed. Check or retry the original operation; its reference is retained across reloads.',
    noResponse: 'Response unavailable. Check or retry the original operation. A new copy is blocked until it is resolved.',
    checkRetry: 'Check / retry original copy', viewOriginal: (id: string) => `View original operation ${id}`,
  },
  cover: {
    opening: 'Opening review…', reviewReplacement: 'Review replacement', assign: 'Assign', chooseWho: 'Choose who covers it', bestFit: 'Best fit',
    showMore: (n: number) => `Show ${n} more`, reviewFor: (name: string) => `Review replacement for ${name}`, assignName: (name: string) => `Assign ${name}`,
  },
  coverage: { staffing: 'Staffing', positions: 'Positions', lead: 'Lead', nothingRequired: 'Nothing required', of: (a: string, b: string) => `${a} of ${b}` },
};

const es: typeof en = {
  dayText: esDay,
  dayLabel: esDay,
  shortDate: esDate,
  time: esTime,
  shiftForm: {
    editShift: 'Editar turno', addShift: 'Añadir turno', cancel: 'Cancelar', save: 'Guardar',
    person: 'Persona', chooseSomeone: 'Elige a alguien', selected: (name: string) => `Persona elegida: ${name}`,
    location: 'Localidad', fixedHelp: 'Un turno mantiene su localidad. Para moverlo, bórralo y añade uno nuevo.',
    position: 'Puesto', none: 'Ninguno', unavailable: (name: string | undefined) => `${name ?? 'Puesto existente'} (no disponible)`,
    date: 'Fecha', choose: 'Elegir', start: 'Inicio', end: 'Fin', ends: (day: string) => `Termina ${day}`,
    shiftLead: 'Líder del turno', leadHelp: 'Debe ser Dueño, Gerente o Líder.', note: 'Nota', optional: 'Opcional',
    saving: "Guardando…", saveChanges: 'Guardar cambios', saveShift: 'Guardar turno',
  },
  change: {
    verbs: { ADDED: 'Añadido', REMOVED: 'Eliminado', TIME_CHANGED: 'Nueva hora', EMPLOYEE_REASSIGNED: 'Reasignado', LOCATION_CHANGED: 'Nueva localidad', POSITION_CHANGED: 'Nuevo puesto', LEAD_CHANGED: 'Cambió el líder', CALLOUT_CHANGED: 'No puedo trabajar actualizado' },
    moved: 'Movido', locationUnavailable: 'Localidad no disponible', shiftLead: 'Líder del turno', cantWorkApproved: 'No puedo trabajar aprobado',
    was: (what: string) => `Antes: ${what}`, hadNoPosition: 'No tenía puesto', summary: 'Qué cambió en tu horario',
  },
  publish: {
    label: 'Publicar horario semanal',
    notPublished: (n: number) => `${plural(n, 'cambio', 'cambios')} sin publicar`, changesNotPublished: 'Cambios sin publicar',
    heldLine: 'Al publicar, también se envían los cambios a los días ya publicados. Revísalos primero en Crear y publicar.', reviewChanges: 'Revisar cambios',
    reviewBefore: (place: string) => `Revisa ${place} antes de publicar esta semana.`,
    coverageGaps: (n: number) => `${n} bloques de cobertura sin cubrir.`, missingLead: (n: number) => `${n} bloques sin líder asignado.`,
    positionSetup: 'Falta configurar los requisitos de puestos.', staffingSetup: 'Falta configurar los requisitos de personal.', coverageSetup: 'Falta configurar los horarios de cobertura.',
    under: (n: number) => `${n} empleados por debajo de su meta de horas semanales.`, over: (n: number) => `${n} empleados por encima de su meta de horas semanales.`,
    noTarget: (n: number) => `${n} empleados sin meta de horas semanales.`,
    hoursNote: 'Las horas de cada empleado cubren la semana laboral en todas las localidades. Al publicar, los empleados verán el horario de esta localidad.',
    unconfirmed: (place: string) => `No pudimos confirmar la publicación de ${place}. Puede que ya esté publicado; revisa el horario antes de publicar otra vez.`,
    checkSchedule: 'Revisar el horario', publishing: 'Publicando…', publishPlace: (place: string) => `Publicar ${place}`, anyway: ' de todos modos',
    returnToDraft: 'Volver al borrador', noLocations: 'No hay localidades activas para publicar.',
  },
  generate: {
    building: 'Creando…', buildDraft: 'Crear borrador', filling: 'Cubriendo…', fillGaps: 'Solo cubrir faltantes', allowing: 'Permitiendo…', allowAutoFill: 'Permitir llenado automático',
    reviewSetup: (n: number) => `Revisar configuración de localidades (${n})`,
    summary: (added: number, removed: number, preserved: number) => `${added} añadidos · ${removed} eliminados · ${preserved} conservados · `,
    attempted: (n: number) => ` · ${n} localidades intentadas`, needSetup: (n: number) => ` · ${n} necesitan configuración`,
    reviewGaps: (n: number) => `Revisar faltantes y advertencias (${n})`,
    staffNeeded: (n: number) => `Faltan ${n} personas`, leadNeeded: 'Falta líder', positionNeeded: (n: number, name: string) => `Faltan ${n} ${name}`,
    excluded: 'Excluido por el gerente · Llenado automático apagado', designatedLead: 'Líder asignado', controlsLabel: 'Horario borrador automático',
    locationsNeedSetup: (n: number) => ` · ${n} localidades necesitan configuración`, unavailable: 'La revisión del horario no está disponible. Vuelve a cargar para intentarlo de nuevo.',
    draftOnlyNot: (names: string) => `Crear solo cambia localidades en borrador. No están en borrador: ${names}.`, selectedNeedSetup: 'Las localidades elegidas necesitan configuración.',
    draftOnly: 'Crear solo cambia localidades en borrador.', excludedCount: (n: number) => `Excluido por el gerente · Llenado automático apagado (${n})`, fillAllowed: 'Llenado automático permitido',
  },
  copy: {
    copyPrevious: 'Copiar semana anterior',
    storageUnavailable: 'El almacenamiento local no está disponible. Activa el almacenamiento del navegador antes de copiar.',
    notRetained: 'No pudimos guardar la operación para reintentarla. No se envió ninguna copia.', checking: 'Revisando la operación original…',
    didntGoThrough: 'La copia original no se completó. Puedes empezar otra copia cuando quieras.',
    accessRequired: 'Necesitas acceso de gerencia vigente. Inicia sesión otra vez para revisar la operación original.',
    unconfirmed: 'El resultado no está confirmado. Revisa o reintenta la operación original; su referencia se mantiene al recargar.',
    noResponse: 'No hubo respuesta. Revisa o reintenta la operación original. No puedes hacer otra copia hasta resolverla.',
    checkRetry: 'Revisar / reintentar copia original', viewOriginal: (id: string) => `Ver operación original ${id}`,
  },
  cover: {
    opening: 'Abriendo revisión…', reviewReplacement: 'Revisar reemplazo', assign: 'Asignar', chooseWho: 'Elige quién lo cubre', bestFit: 'Mejor opción',
    showMore: (n: number) => `Ver ${n} más`, reviewFor: (name: string) => `Revisar reemplazo para ${name}`, assignName: (name: string) => `Asignar a ${name}`,
  },
  coverage: { staffing: 'Personal', positions: 'Puestos', lead: 'Líder', nothingRequired: 'Nada requerido', of: (a: string, b: string) => `${a} de ${b}` },
};

export const SCHEDULE_COPY: Record<PortalLang, typeof en> = { en, es };
export const scheduleCopy = (lang: PortalLang = 'en') => SCHEDULE_COPY[lang];
