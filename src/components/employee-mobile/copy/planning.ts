/* Signed-in Spanish (Nov 23, 2026): the one line the responsive planning wrapper (planning.tsx) shows while it decides
 * which presentation to draw, in English and Puerto Rico Spanish (docs/design/voice.md: "Cargando…"). English is byte
 * for byte what it said before. */
const en = {loading: 'Loading your planning…'};
const es: typeof en = {loading: 'Cargando tu planificación…'};
export const planningCopy = {en, es};
