/* Signed-in Spanish (es-rest): the words of the attendance review's "What we compare" (configured-attendance-policies.tsx),
 * English as written and Puerto Rico Spanish. The disclaimer names overtime pay and payroll: listed for Jose's review. */
import { esTimes } from './copy-receipt-copy';

const en = {
  names: {
    missing_clock_in: "No clock-in",
    missing_clock_out: "No clock-out",
    policy_lateness: "Lateness",
    policy_early_departure: "Early departure",
    unusually_long_entry: "Unusually long entry",
    overtime_risk: "Actual-time overtime risk",
  } as Record<string, string>,
  locale: "en-US",
  times: (text: string) => text,
  justNow: "just now",
  minutes: (value: string) => `${value} minutes`,
  loading: "Loading configured attendance comparisons",
  offlineHidden: "Policy observations unavailable while offline or hidden",
  expired: "Policy observations expired. Refresh to review current facts.",
  unavailable: "Configured attendance observations unavailable. Refresh to try again.",
  paused: "Policy observations paused",
  offline: "Policy observations unavailable offline",
  whatWeCompare: "What we compare",
  disclaimer: "Factual comparisons use configured thresholds and saved source revisions. They do not establish absence, disciplinary outcomes, overtime pay, or processed payroll.",
  checked: (when: string) => `Checked ${when}`,
  notConfigured: "Not configured",
  unverifiable: "Unverifiable — complete source evidence is unavailable",
  observations: (n: number) => `${n} observations`,
  observed: "observed",
  threshold: "threshold",
  sourceReference: "Source reference",
};
const es: typeof en = {
  names: {
    missing_clock_in: "Sin entrada",
    missing_clock_out: "Sin salida",
    policy_lateness: "Tardanza",
    policy_early_departure: "Salida temprano",
    unusually_long_entry: "Registro inusualmente largo",
    overtime_risk: "Riesgo de horas extra según el tiempo real",
  },
  locale: "es-PR",
  times: esTimes,
  justNow: "ahora mismo",
  minutes: (value: string) => `${value} minutos`,
  loading: "Cargando las comparaciones de asistencia configuradas",
  offlineHidden: "Las observaciones de la política no están disponibles sin conexión o con la página oculta",
  expired: "Las observaciones de la política expiraron. Actualiza para revisar los datos actuales.",
  unavailable: "Las observaciones de asistencia configuradas no están disponibles. Actualiza para intentarlo de nuevo.",
  paused: "Observaciones de la política en pausa",
  offline: "Las observaciones de la política no están disponibles sin conexión",
  whatWeCompare: "Qué comparamos",
  disclaimer: "Las comparaciones usan los límites configurados y las revisiones guardadas de los registros. No establecen ausencias, medidas disciplinarias, pago de horas extra ni nómina procesada.",
  checked: (when: string) => `Verificado ${when}`,
  notConfigured: "Sin configurar",
  unverifiable: "No se puede verificar — falta evidencia completa de los registros",
  observations: (n: number) => `${n} observaciones`,
  observed: "observado",
  threshold: "límite",
  sourceReference: "Referencia del registro",
};
export const CONFIGURED_ATTENDANCE_COPY = { en, es };

export const copy = {
  en: {
    // src/components/configured-attendance-policies.tsx:7
    noClockIn: 'No clock-in',
    // src/components/configured-attendance-policies.tsx:8
    noClockOut: 'No clock-out',
    // src/components/configured-attendance-policies.tsx:9
    lateness: 'Lateness',
    // src/components/configured-attendance-policies.tsx:10
    earlyDeparture: 'Early departure',
    // src/components/configured-attendance-policies.tsx:11
    unusuallyLongEntry: 'Unusually long entry',
    // src/components/configured-attendance-policies.tsx:12
    actualTimeOvertimeRisk: 'Actual-time overtime risk',
    // src/components/configured-attendance-policies.tsx:19
    age: '{ns} minutes',
    // src/components/configured-attendance-policies.tsx:36
    loadingConfiguredAttendanceComparisons: 'Loading configured attendance comparisons',
    // src/components/configured-attendance-policies.tsx:38
    policyObservationsUnavailableWhileOfflineHidden: 'Policy observations unavailable while offline or hidden',
    // src/components/configured-attendance-policies.tsx:65
    policyObservationsExpiredRefreshReviewCurrent: 'Policy observations expired. Refresh to review current facts.',
    // src/components/configured-attendance-policies.tsx:72
    configuredAttendanceObservationsUnavailableRefreshTry: 'Configured attendance observations unavailable. Refresh to try again.',
    // src/components/configured-attendance-policies.tsx:78
    policyObservationsPaused: 'Policy observations paused',
    // src/components/configured-attendance-policies.tsx:80
    policyObservationsUnavailableOffline: 'Policy observations unavailable offline',
    // src/components/configured-attendance-policies.tsx:102
    whatWeCompare: 'What we compare',
    // src/components/configured-attendance-policies.tsx:107
    factualComparisonsUseConfiguredThresholdsSaved: 'Factual comparisons use configured thresholds and saved source revisions. They do not establish absence, disciplinary outcomes, overtime pay, or processed payroll.',
    // src/components/configured-attendance-policies.tsx:115
    checkedAt: 'Checked {observedAt}',
    // src/components/configured-attendance-policies.tsx:127
    notConfigured: 'Not configured',
    // src/components/configured-attendance-policies.tsx:127
    unverifiableCompleteSourceEvidenceUnavailable: 'Unverifiable — complete source evidence is unavailable',
    // src/components/configured-attendance-policies.tsx:127
    observations: '{observationsCount} observations',
    // src/components/configured-attendance-policies.tsx:134
    observedThreshold: '{name} · observed {valueNanoseconds} · threshold ',
    // src/components/configured-attendance-policies.tsx:140
    sourceReference: 'Source reference',
  },
  es: {
    // src/components/configured-attendance-policies.tsx:7
    noClockIn: 'Sin registro de entrada',
    // src/components/configured-attendance-policies.tsx:8
    noClockOut: 'Sin ponchar salida',
    // src/components/configured-attendance-policies.tsx:9
    lateness: 'Tardanza',
    // src/components/configured-attendance-policies.tsx:10
    earlyDeparture: 'Salida temprana',
    // src/components/configured-attendance-policies.tsx:11
    unusuallyLongEntry: 'Entrada inusualmente larga',
    // src/components/configured-attendance-policies.tsx:12
    actualTimeOvertimeRisk: 'Riesgo de horas extra en tiempo real',
    // src/components/configured-attendance-policies.tsx:19
    age: '{ns} minutos',
    // src/components/configured-attendance-policies.tsx:36
    loadingConfiguredAttendanceComparisons: 'Cargando comparaciones de asistencia configuradas',
    // src/components/configured-attendance-policies.tsx:38
    policyObservationsUnavailableWhileOfflineHidden: 'Las observaciones de la política no están disponibles mientras están fuera de línea o ocultas',
    // src/components/configured-attendance-policies.tsx:65
    policyObservationsExpiredRefreshReviewCurrent: 'Las observaciones de la política caducaron. Actualiza para revisar los datos actuales',
    // src/components/configured-attendance-policies.tsx:72
    configuredAttendanceObservationsUnavailableRefreshTry: 'Las observaciones de asistencia configuradas no están disponibles. Actualiza para volver a intentarlo',
    // src/components/configured-attendance-policies.tsx:78
    policyObservationsPaused: 'Las observaciones de políticas se han pausado',
    // src/components/configured-attendance-policies.tsx:80
    policyObservationsUnavailableOffline: 'Las observaciones de políticas no están disponibles fuera de línea',
    // src/components/configured-attendance-policies.tsx:102
    whatWeCompare: 'Lo que comparamos',
    // src/components/configured-attendance-policies.tsx:107
    factualComparisonsUseConfiguredThresholdsSaved: 'Las comparaciones fácticas utilizan umbrales configurados y revisiones de origen guardadas. No establecen la ausencia, los resultados disciplinarios, el pago de horas extras ni la nómina procesada',
    // src/components/configured-attendance-policies.tsx:115
    checkedAt: 'Verificado {observedAt}',
    // src/components/configured-attendance-policies.tsx:127
    notConfigured: 'No configurado',
    // src/components/configured-attendance-policies.tsx:127
    unverifiableCompleteSourceEvidenceUnavailable: 'Irrefutable — la evidencia completa de la fuente no está disponible',
    // src/components/configured-attendance-policies.tsx:127
    observations: 'Observaciones {observationsCount}',
    // src/components/configured-attendance-policies.tsx:134
    observedThreshold: '{name} · observado {valueNanoseconds} · umbral ',
    // src/components/configured-attendance-policies.tsx:140
    sourceReference: 'Referencia de la fuente',
  },
} as const;
