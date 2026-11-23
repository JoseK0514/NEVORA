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
  signInAgain: 'Vuelve a iniciar sesión para cambiar las funciones.',
  wordsSaved: 'Palabras guardadas. ',
  stillWaiting: 'Todavía hay solicitudes en espera.',
  changedElsewhere: 'La configuración cambió en otro lugar. Vuelve a cargar para ver lo más reciente antes de editar.',
  saved: 'Funciones guardadas',
  mayNotHaveSaved: 'Puede que no se haya guardado. Guarda otra vez para reintentar sin riesgo, o vuelve a cargar para verificar.',
  wordsLabel: 'Cómo llamar a las personas y los lugares',
  features: 'Funciones',
  comingLater: 'Llega en una versión futura.',
  needsPayroll: 'Disponible cuando la nómina está activa.',
  saving: 'Guardando…',
  savedLine: 'Guardado',
  sessionEnded: 'Tu sesión terminó',
  notSavedYet: 'Todavía sin guardar',
  notSaved: 'Sin guardar',
  signIn: 'Iniciar sesión',
  tryAgain: 'Intentar de nuevo',
};
export const FEATURES_EDITOR_COPY = { en, es };
