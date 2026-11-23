/* Signed-in Spanish, second release (es-rest R2, Nov 23, 2026): the messages Team's server actions answer with
 * (scheduling profile, operational rules, Clocker PIN), in English and Puerto Rico Spanish (docs/design/voice.md: tú,
 * "Dueño", "localidad"). English is each action's text, word for word. A sentence passed up from `lib` uses
 * src/lib/i18n/server-messages.ts. */
import type { PortalLang } from '@/lib/i18n/portal-lang';

const en = {
  // employees/actions.ts
  submitCommand: 'Submit one complete employee command.',
  schedulingSaved: 'Scheduling profile updated.',
  noAccessHere: 'You don’t have access to make this change here. Reload to see your current access, or ask the Owner.',
  profileStale: 'This employee changed since you opened the profile. Reload and review the latest scheduling details.',
  profileFailed: 'Profile could not be saved. Choose active positions and locations; existing inactive references may be retained.',
  rulesIncomplete: 'Choose every rule status explicitly and complete configured values, time basis and routing.',
  rulesOwnerOnly: 'Only an active Owner can review operational rules.',
  // employees/[employeeId]/clocker-pin/actions.ts
  pinOwnerOnly: 'Only an Owner may set a Clocker PIN.',
  pinCheckDetails: 'Check the employee details and try again.',
  pinTwice: 'Enter the same four-digit PIN twice.',
  pinReload: 'Reload before saving a new PIN.',
  pinReloadSettings: 'Reload the employee’s current PIN settings.',
  pinUnconfirmed: 'PIN changes could not be confirmed. Reload the current settings before trying again.',
  pinReviewOwnerOnly: 'Only an Owner may review a Clocker PIN save.',
  pinOriginal: 'Use the original employee and save reference.',
  pinNotChecked: 'This save could not be checked. Keep its reference and try again.',
};

export type EmployeesActionsCopy = typeof en;

const es: EmployeesActionsCopy = {
  submitCommand: 'Envía los datos completos del empleado de una vez.',
  schedulingSaved: 'Perfil de horario actualizado.',
  noAccessHere: 'No tienes acceso para hacer este cambio aquí. Recarga para ver tu acceso actual o pregúntale al dueño.',
  profileStale: 'Este empleado cambió desde que abriste el perfil. Recarga y revisa los detalles de horario más recientes.',
  profileFailed: 'No se pudo guardar el perfil. Elige puestos y localidades activos; se pueden conservar los inactivos que ya tenía.',
  rulesIncomplete: 'Elige el estado de cada regla y completa los valores configurados, la base de tiempo y a quién se envía.',
  rulesOwnerOnly: 'Solo un dueño activo puede revisar las reglas de operación.',
  pinOwnerOnly: 'Solo un dueño puede configurar un PIN del Clocker.',
  pinCheckDetails: 'Revisa los datos del empleado e inténtalo de nuevo.',
  pinTwice: 'Escribe el mismo PIN de cuatro dígitos dos veces.',
  pinReload: 'Recarga antes de guardar un PIN nuevo.',
  pinReloadSettings: 'Recarga la configuración actual del PIN del empleado.',
  pinUnconfirmed: 'No pudimos confirmar los cambios del PIN. Recarga la configuración actual antes de intentarlo de nuevo.',
  pinReviewOwnerOnly: 'Solo un dueño puede revisar si se guardó un PIN del Clocker.',
  pinOriginal: 'Usa el empleado y la referencia originales de cuando se guardó.',
  pinNotChecked: 'No pudimos revisar si se guardó. Conserva su referencia e inténtalo de nuevo.',
};

export const EMPLOYEES_ACTIONS_COPY: Record<PortalLang, EmployeesActionsCopy> = { en, es };
