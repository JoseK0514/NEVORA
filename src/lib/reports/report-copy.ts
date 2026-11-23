/* Signed-in Spanish (es-rest, second release, Nov 23, 2026): the sentences the period report projection writes
 * (definitions, the overtime reason, the coverage and stability definitions, and the two fallback labels), in English and
 * Puerto Rico Spanish (docs/design/voice.md: tú, "Informes", "Tarjeta(s) de tiempo", "No puedo trabajar", "horas extra").
 * The projection (project.ts) keeps writing English: it is the report's data, and the CSV export carries it as is. The
 * Insights view shows each sentence in the person's language with reportText(). The overtime and payroll lines are listed
 * for Jose's review in docs/handoffs/2026-11-23-phase2-cloud/reports/es-rest-parts/R2-B.md. */
import type { PortalLang } from '@/lib/i18n/portal-lang';

const en = {
  definitions: [
    'Actual time uses D2 canonical effective entries and breaks; finalized cards use their immutable snapshots.',
    'Scheduled time is elapsed time in the latest published plan at observation, with released Unable to work requests excluded. It is not the immutable schedule originally captured on a punch.',
    'Attendance observations use preserved raw punches and their exact captured publication references. They do not recalculate approved time or decide lateness/discipline.',
    'Position labels come from captured punch context; absent labels remain unknown. Location and roster labels are current; finalized snapshot labels are retained.',
    'Time off and Unable to work rows reflect current request state; shift-change outcomes use append-only history. Private absence reasons are excluded.',
    'Unavailable policy and incomplete source evidence never become zero or healthy scores.',
  ],
  overtimeReason: 'Overtime needs your pay rules and employee classifications. Hours here aren’t payroll hours.',
  coverageDefinition: 'Coverage requests in this period and how many were filled. A count, not a reliability score.',
  stabilityDefinition: 'Schedule changes published for this period. No stability score is applied.',
  positionNotCaptured: 'Position not captured',
  historicalEmployee: 'Historical employee',
};

export type ReportCopy = typeof en;

const es: ReportCopy = {
  definitions: [
    'El tiempo real usa las entradas y los descansos efectivos de D2; las tarjetas de tiempo finalizadas usan su copia fija.',
    'El tiempo programado es el tiempo transcurrido en el horario publicado más reciente al momento de la consulta, sin las solicitudes de No puedo trabajar liberadas. No es el horario fijo que se registró con cada marcación.',
    'Las notas de asistencia usan las marcaciones originales conservadas y la publicación exacta que se registró con cada una. No recalculan el tiempo aprobado ni deciden tardanzas o medidas disciplinarias.',
    'Los puestos vienen del contexto registrado con cada marcación; si falta, se queda como desconocido. Las localidades y la lista del equipo son las actuales; las tarjetas finalizadas conservan sus nombres.',
    'Las filas de días libres y de No puedo trabajar muestran el estado actual de cada solicitud; los resultados de cambios de turno usan un historial que solo añade registros. No se incluyen los motivos privados de ausencia.',
    'Una política no disponible o datos de origen incompletos nunca se muestran como cero ni como un resultado saludable.',
  ],
  overtimeReason: 'Las horas extra necesitan tus reglas de pago y la clasificación de cada empleado. Estas horas no son horas de nómina.',
  coverageDefinition: 'Solicitudes de cobertura en este período y cuántas se cubrieron. Es un conteo, no una medida de confiabilidad.',
  stabilityDefinition: 'Cambios de horario publicados para este período. No se aplica ninguna medida de estabilidad.',
  positionNotCaptured: 'Puesto no registrado',
  historicalEmployee: 'Empleado anterior',
};

export const REPORT_COPY: Record<PortalLang, ReportCopy> = { en, es };

/** One sentence or label from the report in the person's language. Text the table doesn't know (a company's own
 * position or person name, a sentence from another source) comes back as it is. */
export function reportText(text: string, lang: PortalLang = 'en'): string {
  if (lang === 'en') return text;
  const at = en.definitions.indexOf(text);
  if (at >= 0) return es.definitions[at];
  for (const key of ['overtimeReason', 'coverageDefinition', 'stabilityDefinition', 'positionNotCaptured', 'historicalEmployee'] as const)
    if (en[key] === text) return es[key];
  return text;
}
