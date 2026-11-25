/* The name picker's words (Clocker UI step 3, Option C). Jose, Nov 25, 2026: the kiosk's own term wins, so "employee ID" /
 * "ID de empleado" (never "núm."). Spanish uses tú, as the rest of the kiosk. Plain module, so a server test reads it. */
export const CLOCKER_ROSTER_COPY = {
  en: {
    title: 'Choose your name',
    names: 'Names',
    search: 'Search names',
    useId: 'Use employee ID',
    notListed: 'Not on the list? Use your employee ID.',
    noMatch: 'No name matches. Use your employee ID.',
    failed: 'Names couldn’t load. Use your employee ID.',
    stale: 'The list changed. Choose your name again.',
    back: 'Choose another name',
    backToNames: 'Back to names',
  },
  es: {
    title: 'Elige tu nombre',
    names: 'Nombres',
    search: 'Buscar nombre',
    useId: 'Usar ID de empleado',
    notListed: '¿No apareces? Usa tu ID de empleado.',
    noMatch: 'Ningún nombre coincide. Usa tu ID de empleado.',
    failed: 'No se pudieron cargar los nombres. Usa tu ID de empleado.',
    stale: 'La lista cambió. Elige tu nombre otra vez.',
    back: 'Elegir otro nombre',
    backToNames: 'Volver a los nombres',
  },
} as const;
export type ClockerRosterCopy = { [K in keyof typeof CLOCKER_ROSTER_COPY.en]: string };
