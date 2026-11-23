/* Signed-in Spanish (es-rest, Nov 23, 2026): the words of Find cover, Review replacement and the coverage figures in
 * English and Puerto Rico Spanish (docs/design/voice.md: tú, the glossary: "Turno disponible", "Dueño", "localidad").
 * The English is the text these parts showed before, word for word. */
import type { PortalLang } from '@/lib/i18n/portal-lang';
import { formatDayLabel, formatTime } from '@/lib/date-utils';
import { esDay, esTime } from './schedule-copy';

/** "3\u00a0people": the count stays with its word, as on the page before. */
const plural = (n: number, one: string, many: string) => `${n}\u00a0${n === 1 ? one : many}`;

const en = {
  /** "Wed, Oct 14". */
  shortDate: (date: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)),
  time: (time: string) => formatTime(time),
  ends: (date: string) => { const day = formatDayLabel(date); return `Ends ${day.weekday}, ${day.day}`; },
  shiftLead: 'Shift lead', openShift: 'Open shift',
  review: {
    warnings: { TARGET_HOURS_EXCEEDED: 'Goes over their weekly target', AVAILABILITY_NOT_SUBMITTED: 'Availability not confirmed' } as Record<string, string>,
    notifyOnPublish: (first: string) => `We’ll notify ${first} when you publish.`, seesOnPublish: (first: string) => `${first} sees it once you publish the week.`,
    permissionTitle: 'Publishing permission needed', permissionLine: 'This week is published. Ask the Owner to make this change, or to let you publish.',
    accessTitle: 'Company-wide access needed', accessLine: 'Ask the Owner to make this change.',
    replacement: 'Replacement', replacedBy: 'replaced by', date: 'Date', time: 'Time', place: 'Place', position: 'Position', weekHours: 'Week hours',
    thisWeek: (hours: string) => `${hours} this week`, target: (hours: string) => ` (target\u00a0${hours})`, beforePublish: 'Before you publish',
    publishing: 'Publishing…', publishChange: 'Publish change', saving: 'Saving…', saveDraft: 'Save draft', addDraft: 'Add draft shift',
    cancel: 'Cancel', backToCoverage: 'Back to coverage', coverage: 'Coverage', title: 'Review replacement',
    unconfirmedPublish: 'This change could not be confirmed. It may already be published; check coverage before you publish again.',
    unconfirmedSave: 'This change could not be confirmed. It may already be saved; check coverage before you save again.', checkCoverage: 'Check coverage',
  },
  assistant: {
    availableForShift: 'Available for this shift', noTarget: (hours: string) => `${hours} this week · No target set`,
    ofTarget: (hours: string, target: string) => `${hours} of ${target} this week`, thisWeek: (hours: string) => `${hours} this week`,
    covered: 'Covered', leadNeeded: 'Shift lead needed', schedule: 'Schedule', title: 'Find cover', saved: 'Replacement saved.', shift: 'Shift',
    chooseWhat: 'Choose what to fill', whatItNeeds: 'What it needs', selected: 'Selected', whoCanCover: 'Who can cover', free: (n: number) => `${plural(n, 'person', 'people')} free`,
    noOneFree: 'No one is free', everyoneBusy: 'Everyone is busy, off or not set up for this location.', giveToSomeone: 'Give to someone',
    changeNeeded: 'Change what’s needed', changed: 'Coverage changed', refresh: 'Refresh', reviewFirst: 'You review the shift before it’s saved.',
  },
  figures: {
    label: 'Coverage this week', staffing: 'Staffing', positions: 'Positions', lead: 'Lead',
    nothingRequired: 'Nothing required', noPositions: 'No positions required', noLead: 'No lead required', of: (a: string, b: string) => `${a} of ${b}`,
    bothNotRequired: 'Positions and leads aren’t required', positionsNotRequired: 'Positions aren’t required', leadsNotRequired: 'Leads aren’t required',
  },
};

const es: typeof en = {
  shortDate: esDay,
  time: esTime,
  ends: (date: string) => `Termina ${esDay(date)}`,
  shiftLead: 'Líder del turno', openShift: 'Turno disponible',
  review: {
    warnings: { TARGET_HOURS_EXCEEDED: 'Pasa de su meta semanal', AVAILABILITY_NOT_SUBMITTED: 'Disponibilidad sin confirmar' },
    notifyOnPublish: (first: string) => `Le avisaremos a ${first} cuando publiques.`, seesOnPublish: (first: string) => `${first} lo verá cuando publiques la semana.`,
    permissionTitle: 'Necesitas permiso para publicar', permissionLine: 'Esta semana está publicada. Pídele al Dueño que haga este cambio o que te deje publicar.',
    accessTitle: 'Necesitas acceso a toda la empresa', accessLine: 'Pídele al Dueño que haga este cambio.',
    replacement: 'Reemplazo', replacedBy: 'reemplazado por', date: 'Fecha', time: 'Hora', place: 'Lugar', position: 'Puesto', weekHours: 'Horas de la semana',
    thisWeek: (hours: string) => `${hours} esta semana`, target: (hours: string) => ` (meta\u00a0${hours})`, beforePublish: 'Antes de publicar',
    publishing: 'Publicando…', publishChange: 'Publicar cambio', saving: 'Guardando…', saveDraft: 'Guardar borrador', addDraft: 'Añadir turno en borrador',
    cancel: 'Cancelar', backToCoverage: 'Volver a cobertura', coverage: 'Cobertura', title: 'Revisar reemplazo',
    unconfirmedPublish: 'No pudimos confirmar este cambio. Puede que ya esté publicado; revisa la cobertura antes de publicar otra vez.',
    unconfirmedSave: 'No pudimos confirmar este cambio. Puede que ya esté guardado; revisa la cobertura antes de guardar otra vez.', checkCoverage: 'Revisar cobertura',
  },
  assistant: {
    availableForShift: 'Disponible para este turno', noTarget: (hours: string) => `${hours} esta semana · Sin meta`,
    ofTarget: (hours: string, target: string) => `${hours} de ${target} esta semana`, thisWeek: (hours: string) => `${hours} esta semana`,
    covered: 'Cubierto', leadNeeded: 'Necesita líder del turno', schedule: 'Horario', title: 'Buscar cobertura', saved: 'Reemplazo guardado.', shift: 'Turno',
    chooseWhat: 'Elige qué cubrir', whatItNeeds: 'Lo que necesita', selected: 'Elegido', whoCanCover: 'Quién puede cubrir', free: (n: number) => `${plural(n, 'persona libre', 'personas libres')}`,
    noOneFree: 'Nadie está libre', everyoneBusy: 'Todos están ocupados, de días libres o sin configurar para esta localidad.', giveToSomeone: 'Dárselo a alguien',
    changeNeeded: 'Cambiar lo que se necesita', changed: 'La cobertura cambió', refresh: 'Actualizar', reviewFirst: 'Revisas el turno antes de que se guarde.',
  },
  figures: {
    label: 'Cobertura de esta semana', staffing: 'Personal', positions: 'Puestos', lead: 'Líder',
    nothingRequired: 'Nada requerido', noPositions: 'No se requieren puestos', noLead: 'No se requiere líder', of: (a: string, b: string) => `${a} de ${b}`,
    bothNotRequired: 'No se requieren puestos ni líderes', positionsNotRequired: 'No se requieren puestos', leadsNotRequired: 'No se requieren líderes',
  },
};

export const COVERAGE_COPY: Record<PortalLang, typeof en> = { en, es };
export const coverageCopy = (lang: PortalLang = 'en') => COVERAGE_COPY[lang];
