import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

export const copy = {
  en: {
    // src/components/period-close-history.tsx:38
    historyPausedLoadHistoryAgainToReviewCurrentAccess: "History paused. Load history again to review current access.",
    // src/components/period-close-history.tsx:52
    historyUnavailableReconnectAndLoadHistoryAgain: "History unavailable. Reconnect and load history again.",
    // src/components/period-close-history.tsx:57
    loadingHistory: "Loading history…",
    // src/components/period-close-history.tsx:59
    historyExpiredLoadHistoryAgain: "History expired. Load history again.",
    // src/components/period-close-history.tsx:73
    moreEventsAreAvailable: "More events are available.",
    // src/components/period-close-history.tsx:73
    allEventsInThisHistorySnapshotAreLoaded: "All events in this history snapshot are loaded.",
    // src/components/period-close-history.tsx:74
    historyUnavailableLoadHistoryAgainToRetry: "History unavailable. Load history again to retry.",
    // src/components/period-close-history.tsx:77
    periodArtifactAndHandoffHistory: "Period artifact and handoff history",
    // src/components/period-close-history.tsx:78
    fullPeriodHistory: "Full period history",
    // src/components/period-close-history.tsx:80
    eventscountOfTotalEventsEventsLoadedNewestFirstSnapshotThroughAt: "{eventsCount} of {totalEvents} events loaded. Newest first. Snapshot through {at}. Refresh history to include newer events.",
    // src/components/period-close-history.tsx:80
    eventscountOfTotalEventsEventsLoadedNewestFirstRefreshHistoryTo: "{eventsCount} of {totalEvents} events loaded. Newest first. Refresh history to include newer events.",
    // src/components/period-close-history.tsx:81
    refreshHistory: "Refresh history",
    // src/components/period-close-history.tsx:81
    loadHistory: "Load history",
    // src/components/period-close-history.tsx:82
    loadOlderEvents: "Load older events",
    // src/components/period-close-history.tsx:84
    kindCreatedAtActorActorId: "{kind} · {createdAt} · actor {actorId}",
    // src/components/period-close-history.tsx:85
    eventDetails: "Event details",
    // src/components/period-close-history.tsx:85
    manifestManifestId: "Manifest {manifestId}",
    // src/components/period-close-history.tsx:86
    file: "File",
    // src/components/period-close-history.tsx:86
    destination: "Destination",
    // src/components/period-close-history.tsx:86
    reference: "Reference",
    // src/components/period-close-history.tsx:86
    format: "Format",
    // src/components/period-close-history.tsx:86
    artifactFingerprint: "Artifact fingerprint",
    // src/components/period-close-history.tsx:87
    serverArtifactResponseRecordedBrowserFileCompletionIsUnverified: "Server artifact response recorded. Browser file completion is unverified.",
    // src/components/period-close-history.tsx:87
    managerReportedProviderImportAndPayrollProcessingRemainUnverified: "Manager reported. Provider import and payroll processing remain unverified.",
    // src/components/period-close-history.tsx:26
    loadHistoryToReviewAllArtifactAndHandoffEvents: "Load history to review all artifact and handoff events.",
  },
  es: {
    // src/components/period-close-history.tsx:38
    historyPausedLoadHistoryAgainToReviewCurrentAccess: "Historial en pausa. Cárgalo otra vez para verificar tu acceso actual.",
    // src/components/period-close-history.tsx:52
    historyUnavailableReconnectAndLoadHistoryAgain: "El historial no está disponible. Vuelve a conectarte y cárgalo otra vez.",
    // src/components/period-close-history.tsx:57
    loadingHistory: "Cargando historial…",
    // src/components/period-close-history.tsx:59
    historyExpiredLoadHistoryAgain: "El historial expiró. Cárgalo otra vez.",
    // src/components/period-close-history.tsx:73
    moreEventsAreAvailable: "Hay más eventos disponibles.",
    // src/components/period-close-history.tsx:73
    allEventsInThisHistorySnapshotAreLoaded: "Se cargaron todos los eventos de esta copia del historial.",
    // src/components/period-close-history.tsx:74
    historyUnavailableLoadHistoryAgainToRetry: "El historial no está disponible. Cárgalo otra vez para reintentar.",
    // src/components/period-close-history.tsx:77
    periodArtifactAndHandoffHistory: "Historial de archivos y entregas del período",
    // src/components/period-close-history.tsx:78
    fullPeriodHistory: "Historial completo del período",
    // src/components/period-close-history.tsx:80
    eventscountOfTotalEventsEventsLoadedNewestFirstSnapshotThroughAt: "{eventsCount} de {totalEvents} eventos cargados. Los más recientes primero. Copia hasta {at}. Actualiza el historial para incluir eventos más nuevos.",
    // src/components/period-close-history.tsx:80
    eventscountOfTotalEventsEventsLoadedNewestFirstRefreshHistoryTo: "{eventsCount} de {totalEvents} eventos cargados. Los más recientes primero. Actualiza el historial para incluir eventos más nuevos.",
    // src/components/period-close-history.tsx:81
    refreshHistory: "Actualizar historial",
    // src/components/period-close-history.tsx:81
    loadHistory: "Cargar historial",
    // src/components/period-close-history.tsx:82
    loadOlderEvents: "Cargar eventos anteriores",
    // src/components/period-close-history.tsx:84
    kindCreatedAtActorActorId: "{kind} · {createdAt} · Responsable: {actorId}",
    // src/components/period-close-history.tsx:85
    eventDetails: "Detalles del evento",
    // src/components/period-close-history.tsx:85
    manifestManifestId: "Manifiesto {manifestId}",
    // src/components/period-close-history.tsx:86
    file: "Archivo",
    // src/components/period-close-history.tsx:86
    destination: "Destino",
    // src/components/period-close-history.tsx:86
    reference: "Referencia",
    // src/components/period-close-history.tsx:86
    format: "Formato",
    // src/components/period-close-history.tsx:86
    artifactFingerprint: "Huella del archivo",
    // src/components/period-close-history.tsx:87
    serverArtifactResponseRecordedBrowserFileCompletionIsUnverified: "Se registró la respuesta del servidor con el archivo. No se verificó que el navegador completara la descarga.",
    // src/components/period-close-history.tsx:87
    managerReportedProviderImportAndPayrollProcessingRemainUnverified: "Lo informó el gerente. La importación del proveedor y el proceso de nómina siguen sin verificar.",
    // src/components/period-close-history.tsx:26
    loadHistoryToReviewAllArtifactAndHandoffEvents: "Carga el historial para revisar todos los eventos de archivos y entregas.",
  },
} as const;

/* Signed-in Spanish (es-rest): the words of the payroll period's full history (period-close-history.tsx), English as
 * written and Puerto Rico Spanish (docs/design/voice.md). Payroll text: listed for Jose's review. */
const en = {
  loadToReview: 'Load history to review all artifact and handoff events.',
  paused: 'History paused. Load history again to review current access.',
  unavailableReconnect: 'History unavailable. Reconnect and load history again.',
  loading: 'Loading history…',
  expired: 'History expired. Load history again.',
  more: 'More events are available.',
  allLoaded: 'All events in this history snapshot are loaded.',
  unavailableRetry: 'History unavailable. Load history again to retry.',
  sectionLabel: 'Period artifact and handoff history',
  title: 'Full period history',
  loaded: (count: number, total: number, through: string | null) => `${count} of ${total} events loaded. Newest first.${through ? ` Snapshot through ${through}.` : ''} Refresh history to include newer events.`,
  refresh: 'Refresh history',
  load: 'Load history',
  older: 'Load older events',
  actor: (id: string) => `actor ${id}`,
  details: 'Event details',
  manifest: (id: string) => `Manifest ${id}`,
  file: 'File', destination: 'Destination', reference: 'Reference', format: 'Format', fingerprint: 'Artifact fingerprint',
  served: 'Server artifact response recorded. Browser file completion is unverified.',
  reported: 'Manager reported. Provider import and payroll processing remain unverified.',
};
const es: typeof en = {
  loadToReview: copy.es.loadHistoryToReviewAllArtifactAndHandoffEvents,
  paused: copy.es.historyPausedLoadHistoryAgainToReviewCurrentAccess,
  unavailableReconnect: copy.es.historyUnavailableReconnectAndLoadHistoryAgain,
  loading: copy.es.loadingHistory,
  expired: copy.es.historyExpiredLoadHistoryAgain,
  more: copy.es.moreEventsAreAvailable,
  allLoaded: copy.es.allEventsInThisHistorySnapshotAreLoaded,
  unavailableRetry: copy.es.historyUnavailableLoadHistoryAgainToRetry,
  sectionLabel: copy.es.periodArtifactAndHandoffHistory,
  title: copy.es.fullPeriodHistory,
  loaded: (count: number, total: number, through: string | null) => `${count} de ${total} eventos cargados. Los más recientes primero.${through ? ` Copia hasta ${through}.` : ''} Actualiza el historial para incluir eventos más nuevos.`,
  refresh: copy.es.refreshHistory,
  load: copy.es.loadHistory,
  older: copy.es.loadOlderEvents,
  actor: (id: string) => `persona ${id}`,
  details: copy.es.eventDetails,
  manifest: (id: string) => formatPortalCopy(copy.es.manifestManifestId, { manifestId: id }),
  file: copy.es.file, destination: copy.es.destination, reference: copy.es.reference, format: copy.es.format, fingerprint: copy.es.artifactFingerprint,
  served: copy.es.serverArtifactResponseRecordedBrowserFileCompletionIsUnverified,
  reported: copy.es.managerReportedProviderImportAndPayrollProcessingRemainUnverified,
};
export const PERIOD_CLOSE_HISTORY_COPY = { en, es };
