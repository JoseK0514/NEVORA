/* The Owner's "Clock in at" control on the person page (Clocker UI step 1, Option A, Jose's pick Nov 25, 2026): where a
 * person may clock in, kept apart from where they're scheduled. English and Spanish (tú, glossary: Localidad). */
export type ClockerLocationLang = 'en' | 'es';

export const clockerLocationCopy = {
  en: {
    title: 'Clock in at',
    where: 'Where they work',
    only: 'Only these locations',
    every: 'Every location',
    everyDetail: 'Includes locations added later',
    locations: 'Locations',
    worksHere: 'Works here',
    main: 'Main',
    chooseOne: 'Choose at least one location to save.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved',
    cancel: 'Cancel',
    reload: 'Reload profile',
    unavailable: 'Unavailable',
    none: 'No active locations',
  },
  es: {
    title: 'Puede ponchar en',
    where: 'Donde trabaja',
    only: 'Solo estas localidades',
    every: 'Todas las localidades',
    everyDetail: 'Incluye las localidades que se añadan',
    locations: 'Localidades',
    worksHere: 'Trabaja aquí',
    main: 'Principal',
    chooseOne: 'Elige al menos una localidad para guardar.',
    save: 'Guardar',
    saving: 'Guardando…',
    saved: 'Guardado',
    cancel: 'Cancelar',
    reload: 'Volver a cargar el perfil',
    unavailable: 'No disponible',
    none: 'No hay localidades activas',
  },
} as const;

/** The server action's own sentences (saveClockerLocationAccessAction), in English as the server writes them, with the
 * Spanish shown for each. This is a translation table for display only; the screen's logic reads `refresh`, never the
 * words. An unknown sentence is shown as the server wrote it. */
export const clockerLocationServerCopy: Record<string, { es: string }> = {
  'Clocker location access could not be confirmed. Reload the profile before trying again.': {
    es: 'No se pudo confirmar dónde puede ponchar. Vuelve a cargar el perfil antes de intentarlo de nuevo.',
  },
  'This employee changed. Reload their profile before saving.': {
    es: 'Este empleado cambió. Vuelve a cargar su perfil antes de guardar.',
  },
  'Choose a location access mode and valid active locations.': {
    es: 'Elige dónde puede ponchar y localidades activas válidas.',
  },
  'Only an Owner may change Clocker location access.': {
    es: 'Solo un dueño puede cambiar dónde se puede ponchar.',
  },
};

/** The sentence the server sent when no reply came back at all (the request itself failed). */
export const CLOCKER_LOCATION_UNCONFIRMED = 'Clocker location access could not be confirmed. Reload the profile before trying again.';

export function clockerLocationServerText(message: string, lang: ClockerLocationLang) {
  return lang === 'es' ? clockerLocationServerCopy[message]?.es ?? message : message;
}
