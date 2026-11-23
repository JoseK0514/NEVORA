/* Signed-in Spanish, second release (es-rest R2, Nov 23, 2026): the messages Settings' server actions answer with
 * (company profile, locations, positions, break types, Clocker tablets, shift matching, punch photos and their review),
 * in English and Puerto Rico Spanish (docs/design/voice.md: tú, "Dueño", "localidad", "Marcación"). English is each
 * action's text, word for word. A sentence passed up from `lib` uses src/lib/i18n/server-messages.ts. */
import type { PortalLang } from '@/lib/i18n/portal-lang';

const en = {
  // settings/actions.ts
  saveFailed: 'Changes could not be saved. Check the name and key for duplicates, then try again.',
  profileSaved: 'Company profile saved.',
  locationAdded: 'Location added. Open Locations, then Scheduling Rules to finish setup.',
  locationUpdated: 'Location updated. Its Clocker link is unchanged.',
  positionAdded: 'Position added.',
  positionUpdated: 'Position updated. Existing memberships and history are retained.',
  // settings/breaks/actions.ts
  breaksOwnerOnly: 'Only an Owner may manage break types.',
  breaksInvalid: 'Check the break name, classification and reference duration.',
  breaksUnconfirmed: 'Break changes could not be confirmed. Reload before trying again.',
  // settings/clocker/actions.ts
  deviceInvalid: 'Check the device details and try again.',
  deviceOwnerOnly: 'Only an active Owner may manage Clocker devices.',
  deviceUnconfirmed: 'We could not confirm the update. Refresh Devices before trying again.',
  // settings/clocker/matching/actions.ts
  matchingOwnerOnly: 'Only an active Owner may change shift matching.',
  matchingInvalid: 'Enter a whole number of minutes from 0 to 30.',
  matchingUnconfirmed: 'Shift matching could not be confirmed. Reload the setting before trying again.',
  // settings/clocker/photos/actions.ts and review/actions.ts
  photosUnconfirmed: 'Photo settings could not be confirmed. Reload settings before trying again.',
  photosOwnerOnly: 'Only an active Owner may manage photo settings.',
  reviewUnconfirmed: 'The punch photo result could not be confirmed. Reload its protected review before continuing.',
  reviewOwnerOnly: 'Only an active Owner may review punch photos.',
  removeOwnerOnly: 'Only an active Owner may remove punch photos.',
};

export type SettingsActionsCopy = typeof en;

const es: SettingsActionsCopy = {
  saveFailed: 'No se pudieron guardar los cambios. Revisa que el nombre y la clave no estén repetidos e inténtalo de nuevo.',
  profileSaved: 'Perfil de la empresa guardado.',
  locationAdded: 'Localidad añadida. Abre Localidades y luego Reglas del horario para terminar la configuración.',
  locationUpdated: 'Localidad actualizada. Su enlace del Clocker no cambió.',
  positionAdded: 'Puesto añadido.',
  positionUpdated: 'Puesto actualizado. Las asignaciones y el historial se conservan.',
  breaksOwnerOnly: 'Solo un dueño puede administrar los tipos de descanso.',
  breaksInvalid: 'Revisa el nombre, la clasificación y el tiempo de referencia del descanso.',
  breaksUnconfirmed: 'No pudimos confirmar los cambios del descanso. Recarga antes de intentarlo de nuevo.',
  deviceInvalid: 'Revisa los datos de la tableta e inténtalo de nuevo.',
  deviceOwnerOnly: 'Solo un dueño activo puede administrar las tabletas Clocker.',
  deviceUnconfirmed: 'No pudimos confirmar el cambio. Actualiza las tabletas antes de intentarlo de nuevo.',
  matchingOwnerOnly: 'Solo un dueño activo puede cambiar la coincidencia de turnos.',
  matchingInvalid: 'Escribe un número entero de minutos, de 0 a 30.',
  matchingUnconfirmed: 'No pudimos confirmar la coincidencia de turnos. Recarga la configuración antes de intentarlo de nuevo.',
  photosUnconfirmed: 'No pudimos confirmar la configuración de fotos. Recárgala antes de intentarlo de nuevo.',
  photosOwnerOnly: 'Solo un dueño activo puede administrar la configuración de fotos.',
  reviewUnconfirmed: 'No pudimos confirmar el resultado de la foto de marcación. Recarga su revisión protegida antes de continuar.',
  reviewOwnerOnly: 'Solo un dueño activo puede revisar las fotos de marcación.',
  removeOwnerOnly: 'Solo un dueño activo puede eliminar fotos de marcación.',
};

export const SETTINGS_ACTIONS_COPY: Record<PortalLang, SettingsActionsCopy> = { en, es };
