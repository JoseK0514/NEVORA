'use client';

import { useSyncExternalStore } from 'react';
import { ClockerIcon } from './clocker-icon';

/** Spanish secondary labels for the shared Clocker, beside the unchanged
 * English. English stays the accessible name and the text scripts press;
 * Spanish is a second line marked lang="es". Each tablet remembers whether
 * to show it (on by default). Legal and payroll text stays English. */
export const CLOCKER_ES = {
  'Clock In': 'Marcar entrada', 'Start Break': 'Iniciar descanso', 'End Break': 'Terminar descanso', 'Clock Out': 'Marcar salida',
  'Confirm Clock Out': 'Confirmar salida', 'Keep Working': 'Seguir trabajando', 'Done': 'Listo', 'Back': 'Volver', 'Continue': 'Continuar',
  'Clocked In': 'En turno', 'On Break': 'En descanso', 'Off Clock': 'Fuera de turno',
  'Clock In Recorded': 'Entrada registrada', 'Break Start Recorded': 'Inicio de descanso registrado',
  'Break End Recorded': 'Fin de descanso registrado', 'Clock Out Recorded': 'Salida registrada',
  'Enter your PIN': 'Ingresa tu PIN', 'Choose a Break': 'Elige un descanso', 'Clock Out?': '¿Marcar salida?',
} as const;
export type ClockerPhrase = keyof typeof CLOCKER_ES;

const KEY = 'nevora:clocker-spanish';
const listeners = new Set<() => void>();
function read(): boolean { try { return window.localStorage.getItem(KEY) !== 'off'; } catch { return true; } }
function subscribe(listener: () => void) {
  listeners.add(listener);
  const storage = (event: StorageEvent) => { if (event.key === KEY) listener(); };
  window.addEventListener('storage', storage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', storage); };
}
export function useClockerSpanish() { return useSyncExternalStore(subscribe, read, () => true); }
function setSpanish(on: boolean) { try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage blocked: stays for this page */ } listeners.forEach(listener => listener()); }

/** The Spanish line for a phrase. Hidden from assistive tech inside buttons,
 * whose English aria-label is the name; announced (in Spanish) elsewhere. */
export function Es({ phrase, inButton = false }: { phrase: ClockerPhrase; inButton?: boolean }) {
  return <span className="clocker-es" lang="es" aria-hidden={inButton || undefined}>{CLOCKER_ES[phrase]}</span>;
}

/** Shows or hides the Spanish second lines. Named by its visible text; aria-pressed carries the state. */
export function ClockerLanguageToggle() {
  const on = useClockerSpanish();
  return <button type="button" className="clocker-language-toggle" aria-pressed={on} onClick={() => setSpanish(!on)}>
    <ClockerIcon name="globe" size={18}/><span lang="es">Español</span><b aria-hidden="true">{on ? 'On' : 'Off'}</b>
  </button>;
}
