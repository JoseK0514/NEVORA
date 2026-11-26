
export const copy = {
  en: {
    // src/components/features-editor.tsx:56
    signInAgainToChangeFeatures: "Sign in again to change features.",
    // src/components/features-editor.tsx:57
    wordsSavedMessage: "Words saved. {message}",
    // src/components/features-editor.tsx:58
    settingsChangedSomewhereElseReloadToSeeTheLatest: "Settings changed somewhere else. Reload to see the latest before editing.",
    // src/components/features-editor.tsx:64
    featuresSaved: "Features saved",
    // src/components/features-editor.tsx:68
    itMayNotHaveSavedSaveAgainToRetry: "It may not have saved. Save again to retry safely, or reload to check.",
    // src/components/features-editor.tsx:82
    whatToCallPeopleAndPlaces: "What to call people and places",
    // src/components/features-editor.tsx:90
    features: "Features",
    // src/components/features-editor.tsx:97
    comingInALaterRelease: "Coming in a later release.",
    // src/components/features-editor.tsx:97
    availableWhenPayrollIsOn: "Available when payroll is on.",
    // src/components/features-editor.tsx:108
    saving: "Saving…",
    // src/components/features-editor.tsx:108
    saved: "Saved",
    // src/components/features-editor.tsx:109
    yourSessionEnded: "Your session ended",
    // src/components/features-editor.tsx:109
    notSavedYet: "Not saved yet",
    // src/components/features-editor.tsx:109
    notSaved: "Not saved",
    // src/components/features-editor.tsx:110
    signIn: "Sign in",
    // src/components/features-editor.tsx:110
    tryAgain: "Try again",
    // src/components/features-editor.tsx:57
    wordsSaved: "Words saved. ",
    // src/components/features-editor.tsx:57
    requestsAreStillWaiting: "Requests are still waiting.",
    // src/components/features-editor.tsx:109
    signInAgain: "Sign in again",
    // src/components/features-editor.tsx:109
    itMayNotHaveSaved: "It may not have saved",
  },
  es: {
    // src/components/features-editor.tsx:56
    signInAgainToChangeFeatures: "Vuelve a iniciar sesión para cambiar las funciones.",
    // src/components/features-editor.tsx:57
    wordsSavedMessage: "Términos guardados. {message}",
    // src/components/features-editor.tsx:58
    settingsChangedSomewhereElseReloadToSeeTheLatest: "La configuración cambió en otro lugar. Vuelve a cargar para ver lo más reciente antes de editar.",
    // src/components/features-editor.tsx:64
    featuresSaved: "Funciones guardadas",
    // src/components/features-editor.tsx:68
    itMayNotHaveSavedSaveAgainToRetry: "Puede que no se haya guardado. Guarda otra vez para reintentar sin riesgo, o vuelve a cargar para verificar.",
    // src/components/features-editor.tsx:82
    whatToCallPeopleAndPlaces: "Términos para el personal y las localidades",
    // src/components/features-editor.tsx:90
    features: "Funciones",
    // src/components/features-editor.tsx:97
    comingInALaterRelease: "Llega en una versión futura.",
    // src/components/features-editor.tsx:97
    availableWhenPayrollIsOn: "Disponible cuando la nómina está activa.",
    // src/components/features-editor.tsx:108
    saving: "Guardando…",
    // src/components/features-editor.tsx:108
    saved: "Guardado",
    // src/components/features-editor.tsx:109
    yourSessionEnded: "Tu sesión terminó",
    // src/components/features-editor.tsx:109
    notSavedYet: "Todavía sin guardar",
    // src/components/features-editor.tsx:109
    notSaved: "Sin guardar",
    // src/components/features-editor.tsx:110
    signIn: "Iniciar sesión",
    // src/components/features-editor.tsx:110
    tryAgain: "Intentar de nuevo",
    // src/components/features-editor.tsx:57
    wordsSaved: "Palabras guardadas. ",
    // src/components/features-editor.tsx:57
    requestsAreStillWaiting: "Todavía hay solicitudes en espera.",
    // src/components/features-editor.tsx:109
    signInAgain: "Iniciar sesión de nuevo",
    // src/components/features-editor.tsx:109
    itMayNotHaveSaved: "Puede que no se haya guardado",
  },
} as const;

/* Signed-in Spanish (es-rest): the words of Features and team terms (features-editor.tsx), English as written and Puerto
 * Rico Spanish. English module and word-set names stay in src/lib/workspace-presentation (modules.ts, words.ts); the
 * Spanish here is keyed by their ids. */
import { blockerText, type ModuleId } from '@/lib/workspace-presentation/modules';
import type { WordPresetId } from '@/lib/workspace-presentation/words';

const en = {
  modules: null as Partial<Record<ModuleId, string>> | null,
  presets: null as Partial<Record<WordPresetId, string>> | null,
  blocker: blockerText,
  signInAgain: 'Sign in again to change features.',
  wordsSaved: 'Words saved. ',
  stillWaiting: 'Requests are still waiting.',
  changedElsewhere: 'Settings changed somewhere else. Reload to see the latest before editing.',
  saved: 'Features saved',
  mayNotHaveSaved: 'It may not have saved. Save again to retry safely, or reload to check.',
  wordsLabel: 'What to call people and places',
  features: 'Features',
  comingLater: 'Coming in a later release.',
  needsPayroll: 'Available when payroll is on.',
  saving: 'Saving…',
  savedLine: 'Saved',
  sessionEnded: 'Your session ended',
  notSavedYet: 'Not saved yet',
  notSaved: 'Not saved',
  signIn: 'Sign in',
  tryAgain: 'Try again',
};
const es: typeof en = {
  modules: { timeOff: 'Días libres', marketplace: 'Cambios de turno y cubiertas', updates: 'Avisos de la empresa', payStatements: 'Comprobantes de pago', breaks: 'Descansos en el Clocker' },
  presets: { standard: 'Estándar', retail: 'Tiendas', restaurant: 'Restaurante', field: 'Servicios de campo', care: 'Cuidado' },
  blocker: (id: ModuleId, count: number) => {
    const n = count === 1 ? '1 solicitud' : `${count} solicitudes`;
    return id === 'timeOff'
      ? `${n} de días libres ${count === 1 ? 'espera' : 'esperan'} una decisión. ${count === 1 ? 'Decídela' : 'Decídelas'} primero.`
      : `${count === 1 ? '1 solicitud de turno (cambio, cubierta o no puedo trabajar) sigue abierta' : `${count} solicitudes de turno (cambios, cubiertas y no puedo trabajar) siguen abiertas`}. Deja que ${count === 1 ? 'termine' : 'terminen'} primero.`;
  },
  signInAgain: copy.es.signInAgainToChangeFeatures,
  wordsSaved: copy.es.wordsSaved,
  stillWaiting: copy.es.requestsAreStillWaiting,
  changedElsewhere: copy.es.settingsChangedSomewhereElseReloadToSeeTheLatest,
  saved: copy.es.featuresSaved,
  mayNotHaveSaved: copy.es.itMayNotHaveSavedSaveAgainToRetry,
  wordsLabel: copy.es.whatToCallPeopleAndPlaces,
  features: copy.es.features,
  comingLater: copy.es.comingInALaterRelease,
  needsPayroll: copy.es.availableWhenPayrollIsOn,
  saving: copy.es.saving,
  savedLine: copy.es.saved,
  sessionEnded: copy.es.yourSessionEnded,
  notSavedYet: copy.es.notSavedYet,
  notSaved: copy.es.notSaved,
  signIn: copy.es.signIn,
  tryAgain: copy.es.tryAgain,
};
export const FEATURES_EDITOR_COPY = { en, es };
