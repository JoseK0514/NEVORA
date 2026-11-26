/* Signed-in Spanish, second release (es-rest R2, Nov 23, 2026): the sentences a server action passes up from `lib`
 * (data and Clocker errors) when it answers a form, with their Puerto Rico Spanish (docs/design/voice.md: tú, "Dueño",
 * "localidad", "Ponche"). The English is each error's own text, word for word; an action shows the Spanish when the
 * person's language is Spanish and the sentence is listed here, and the English otherwise. Developer-only errors that
 * never reach a screen aren't listed. */
import type { PortalLang } from './portal-lang';

export const SERVER_MESSAGES_ES: Readonly<Record<string, string>> = {
  // Locations, positions and the company profile (src/lib/data, src/lib/workspace).
  'Location address must be text.': 'La dirección de la localidad debe ser texto.',
  'Location address must be at most 300 characters and contain only printable text or line breaks.': 'La dirección de la localidad puede tener hasta 300 caracteres, solo texto imprimible o saltos de línea.',
  'Location name must contain 1–160 characters.': 'El nombre de la localidad debe tener de 1 a 160 caracteres.',
  'Short name must contain 1–48 characters.': 'El nombre corto debe tener de 1 a 48 caracteres.',
  'Clocker key must be lowercase URL-safe text up to 64 characters.': 'La clave del Clocker debe estar en minúsculas, sin espacios ni símbolos especiales, y tener hasta 64 caracteres.',
  'Choose an active state.': 'Elige si está activo.',
  'Location not found.': 'No encontramos la localidad.',
  'Location configuration is unavailable.': 'La configuración de localidades no está disponible.',
  'Only an active Owner may edit locations.': 'Solo un dueño activo puede editar las localidades.',
  'Location changed while you were editing. Your entries are preserved; reload and review the latest details before saving.': 'La localidad cambió mientras la editabas. Tus datos siguen aquí; recarga y revisa los detalles más recientes antes de guardar.',
  'Position name must contain 1–80 characters.': 'El nombre del puesto debe tener de 1 a 80 caracteres.',
  'Position not found.': 'No encontramos el puesto.',
  'Position configuration is unavailable.': 'La configuración de puestos no está disponible.',
  'Choose configured active positions; only existing inactive memberships may be retained.': 'Elige puestos activos configurados; solo se pueden conservar los puestos inactivos que ya tenía.',
  'An active Owner is required for catalog edits; an active Manager or Owner is required for employee positions.': 'Para editar el catálogo se necesita un dueño activo; para los puestos de un empleado, un gerente o dueño activo.',
  'Position changed while you were editing. Your entries are preserved; reload and review the latest details before saving.': 'El puesto cambió mientras lo editabas. Tus datos siguen aquí; recarga y revisa los detalles más recientes antes de guardar.',
  'Enter your business name (1–160 characters).': 'Escribe el nombre de tu negocio (de 1 a 160 caracteres).',
  'Changing the business timezone requires a separately reviewed conversion because operational records already exist.': 'Cambiar la zona horaria del negocio requiere una conversión revisada aparte, porque ya hay registros de operación.',
  'Workspace configuration changed; reload and try again.': 'La configuración de la empresa cambió; recarga e inténtalo de nuevo.',
  'Only an active Owner may edit the workspace.': 'Solo un dueño activo puede editar la empresa.',
  // Branding (src/app/api/workspace-presentation/route.ts).
  'Choose a colour like #1D4ED8.': 'Elige un color como #1D4ED8.',
  // Break types (src/lib/clocker/break-types.server.ts).
  'Only a currently authorized Owner may manage break types.': 'Solo un dueño autorizado puede administrar los tipos de descanso.',
  'This break type changed. Reload before saving.': 'Este tipo de descanso cambió. Recarga antes de guardar.',
  'A break type already uses this name. Edit or reactivate the existing type.': 'Ya hay un tipo de descanso con este nombre. Edita o reactiva el que existe.',
  'Check the break name, classification and reference duration.': 'Revisa el nombre, la clasificación y el tiempo de referencia del descanso.',
  'Break settings could not be confirmed. Reload before trying again.': 'No pudimos confirmar la configuración del descanso. Recarga antes de intentarlo de nuevo.',
  // Clocker tablets and setup (src/lib/clocker/devices.server.ts, setup.server.ts).
  'Only an active Owner with a current session may manage Clocker devices.': 'Solo un dueño activo con una sesión vigente puede administrar las tabletas Clocker.',
  'Choose an active location in this workspace.': 'Elige una localidad activa de esta empresa.',
  'This device changed. Reload its current details and try again.': 'Esta tableta cambió. Recarga sus detalles e inténtalo de nuevo.',
  'This Clocker enrollment is unavailable. Request a new setup link.': 'Esta configuración del Clocker no está disponible. Pide un enlace de configuración nuevo.',
  'This Clocker device is not authorized.': 'Esta tableta Clocker no está autorizada.',
  'Clocker device data is unavailable. Please try again.': 'Los datos de las tabletas Clocker no están disponibles. Inténtalo de nuevo.',
  'Choose a valid device or location.': 'Elige una tableta o una localidad válida.',
  'Device name must contain 1–80 printable characters.': 'El nombre de la tableta debe tener de 1 a 80 caracteres imprimibles.',
  'A current device version is required.': 'Se necesita la versión actual de la tableta.',
  'Clocker setup is not configured for this environment.': 'La configuración del Clocker no está disponible en este entorno.',
  'Open Clocker directly on this site and try again.': 'Abre el Clocker directamente en este sitio e inténtalo de nuevo.',
  'Choose a valid Clocker location.': 'Elige una localidad válida para el Clocker.',
  // Shift matching (src/lib/clocker/schedule-grace.server.ts).
  'Only a currently authorized Owner may change shift matching.': 'Solo un dueño autorizado puede cambiar la coincidencia de turnos.',
  'Shift matching changed. Reload before saving.': 'La coincidencia de turnos cambió. Recarga antes de guardar.',
  'Enter a whole number of minutes from 0 to 30.': 'Escribe un número entero de minutos, de 0 a 30.',
  'Shift matching could not be confirmed. Reload before trying again.': 'No pudimos confirmar la coincidencia de turnos. Recarga antes de intentarlo de nuevo.',
  // Clocker PINs (src/lib/clocker/pin-authority.server.ts, pin-crypto.server.ts).
  'Your current account cannot manage this employee’s Clocker PIN.': 'Tu cuenta no puede administrar el PIN del Clocker de este empleado.',
  'The PIN settings changed. Reload before saving a new PIN.': 'La configuración del PIN cambió. Recarga antes de guardar un PIN nuevo.',
  'This PIN is unavailable. Choose a different PIN.': 'Este PIN no está disponible. Elige otro PIN.',
  'Use exactly four digits and current employee details.': 'Usa exactamente cuatro dígitos y los datos actuales del empleado.',
  'Clocker PIN security is unavailable. No verification can be confirmed.': 'La seguridad del PIN del Clocker no está disponible. No se puede confirmar ninguna verificación.',
  'PIN security is not configured for this environment.': 'La seguridad del PIN no está configurada en este entorno.',
  'Use exactly four digits for the Clocker PIN.': 'Usa exactamente cuatro dígitos para el PIN del Clocker.',
  // Punch photos (src/lib/clocker/photo-server/contracts.ts).
  'Check the photo request and try again using the original clock action.': 'Revisa la solicitud de la foto e inténtalo de nuevo con el ponche original.',
  'Verify your PIN again on this registered tablet.': 'Verifica tu PIN de nuevo en esta tableta registrada.',
  'Tablet verification changed. Clear the previous photo before continuing.': 'La verificación de la tableta cambió. Borra la foto anterior antes de continuar.',
  'A different photo already belongs to this clock action.': 'Este ponche ya tiene otra foto.',
  'Photo settings changed. Reload their current values before saving.': 'La configuración de fotos cambió. Recarga sus valores actuales antes de guardar.',
  'The photo result could not be confirmed. Check the original clock action; do not create a replacement punch.': 'No pudimos confirmar el resultado de la foto. Revisa el ponche original; no crees un ponche de reemplazo.',
};

/** The person's language for a sentence an action passes up from `lib`: Spanish when listed, else the English as is. */
export function serverMessage(lang: PortalLang, english: string): string {
  return lang === 'es' ? SERVER_MESSAGES_ES[english] ?? english : english;
}
