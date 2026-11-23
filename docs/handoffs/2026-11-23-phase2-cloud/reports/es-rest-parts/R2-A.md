# es-rest R2-A: server action messages in the person's language

Second Spanish release, on 836964e4. A server action reads `readPageLang()` (cached per request, English on failure)
where it builds a message, and picks the sentence from an `{en, es}` table. Result shapes, codes, `refresh` flags,
statuses, permissions and data are unchanged; English is word for word.

## Files

| Table | Actions |
|---|---|
| `src/app/app/settings/actions-copy.ts` | `settings/actions.ts` (company profile, locations, positions), `settings/breaks/actions.ts`, `settings/clocker/actions.ts` (tablets), `settings/clocker/matching/actions.ts`, `settings/clocker/photos/actions.ts`, `settings/clocker/photos/review/actions.ts` |
| `src/app/app/employees/actions-copy.ts` | `employees/actions.ts` (create/save command, scheduling profile, operational rules), `employees/[employeeId]/clocker-pin/actions.ts` |
| `src/lib/i18n/server-messages.ts` (new, shared) | Sentences passed up from `lib` that reach a form: location, position and company-profile validation and concurrency errors, break types, Clocker tablets and setup origin checks, shift matching, Clocker PIN authority, punch photo errors, Branding's colour message. `serverMessage(lang, english)` returns the Spanish when listed, else the English as is. |
| `src/app/api/workspace-presentation/route.ts` | Features: "Choose a colour like #1D4ED8." and the module blocker sentence (Spanish from `FEATURES_EDITOR_COPY.es.blocker`). |

No client compares these messages' English text (checked), so nothing else changed.

Not changed, because they return no sentences: `requests/actions.ts` (redirect codes; the page already shows them in
Spanish) and `account/delete/actions.ts` (kinds only).

## Tests

- `src/app/app/settings/actions-es.test.ts`: key match; `serverMessage` passes unknown sentences through; company
  profile, location add, a concurrency error, the fallback, and Shift matching (invalid, stale, unavailable) come back in
  Spanish with the same shape; English when the language is English.
- `src/app/app/employees/actions-es.test.ts`: key match; the command, scheduling profile and Clocker PIN messages in
  Spanish, English when English.
- Existing action tests are unchanged and pass (no session read, so `readPageLang` falls back to English).
- `src/app/app` plus `api/workspace-presentation`, clocker, features-editor and brand: 1,367 passed, 0 failed. tsc and
  oxlint clean.

## Gaps

- Field errors from the company-access service (`saveEmployeeCoreAccessProfile`, `createEmployeeWithAccess`) and from
  `parseOperationalProfileForm`/`saveOperationalRuleProfile` come from `lib` with their own codes; they stay English
  unless the screen maps them.
- A `lib` sentence not listed in `server-messages.ts` stays English (by design: never a wrong translation).
- /app/schedule, /app/exchange and payroll actions belong to other rows.

## For Jose to review (security and access messages)

| English | Spanish |
|---|---|
| Only an Owner may set a Clocker PIN. | Solo un dueño puede configurar un PIN del Clocker. |
| Enter the same four-digit PIN twice. | Escribe el mismo PIN de cuatro dígitos dos veces. |
| PIN changes could not be confirmed. Reload the current settings before trying again. | No pudimos confirmar los cambios del PIN. Recarga la configuración actual antes de intentarlo de nuevo. |
| Your current account cannot manage this employee’s Clocker PIN. | Tu cuenta no puede administrar el PIN del Clocker de este empleado. |
| This PIN is unavailable. Choose a different PIN. | Este PIN no está disponible. Elige otro PIN. |
| Clocker PIN security is unavailable. No verification can be confirmed. | La seguridad del PIN del Clocker no está disponible. No se puede confirmar ninguna verificación. |
| PIN security is not configured for this environment. | La seguridad del PIN no está configurada en este entorno. |
| Only an active Owner may review punch photos. / … remove punch photos. | Solo un dueño activo puede revisar las fotos de marcación. / … eliminar fotos de marcación. |
| The punch photo result could not be confirmed. Reload its protected review before continuing. | No pudimos confirmar el resultado de la foto de marcación. Recarga su revisión protegida antes de continuar. |
| The photo result could not be confirmed. Check the original clock action; do not create a replacement punch. | No pudimos confirmar el resultado de la foto. Revisa la marcación original; no crees una marcación de reemplazo. |
| You don’t have access to make this change here. Reload to see your current access, or ask the Owner. | No tienes acceso para hacer este cambio aquí. Recarga para ver tu acceso actual o pregúntale al dueño. |
| Changing the business timezone requires a separately reviewed conversion because operational records already exist. | Cambiar la zona horaria del negocio requiere una conversión revisada aparte, porque ya hay registros de operación. |
