# es-rest part B: notifications, Team pages, Profile, account, passkeys, employment dates

Every table is `{en, es}` with the same keys (tests check recursively); the English is moved over word for word.
Client components read `usePortalLang()`; server pages read `readPageLang()`. Static page titles became
`generateMetadata` with the same English.

## Areas

### components/notification, components/notifications, /app/notifications, /app/inbox
- New `src/components/notification-copy.ts` (+ `notification-copy.test.tsx`): the Owner's and Manager's Notifications
  (`notifications-manager-b.tsx`): band, All/Unread, Today/Yesterday/Earlier, states, empty cards, folds, counts, and a
  Spanish relative time (`relativeTimeFor`: "hace 5 min", "Ayer", "viernes", "2 nov").
- `notification-inbox.tsx`: `rowText`/`rowFacts` take the language (summary rows "3 asuntos estaban en espera").
- `/app/notifications/page.tsx`: title, the Employee frame's title, Home and Settings. `/app/inbox/page.tsx`: "Pendientes".
- Gaps: notification titles and facts come from `src/lib/notification-inbox-view.ts` and `notification-facts.ts` (lib,
  English). `NotificationInbox` and `NotificationInboxSignature` bodies are not reached by any route (the panel always
  takes the employee-mobile view or the Manager view), so they stay English. `ManagerMessagesPage`/`ManagerStateCard`
  (`messages-manager-b.tsx`) are not in this part.

### /app/employees (all files)
- New `src/app/app/employees/employees-copy.ts` (+ test): the person page (who, Hours, Work rows, Access and sign-in,
  sign-in states, the Positions and Hours and rules sheets, the Manager's locked sheet), Add employee (errors, notices),
  Team, Clocker PIN, restrictions, pay and time-off titles, and the six route error titles. Roles: Dueño, Gerente, Líder,
  Empleado (as roster-import's copy). The Clocker PIN rows use `clockerOwnerCopy[lang]`. The import page uses
  `rosterImportCopy[lang]` (was `.en`).
- Spanish render test added to `[employeeId]/page.test.tsx` (mocks `readPageLang`); `import/page.test.tsx` reads
  `generateMetadata` instead of `metadata`.
- Gaps: `actions.ts` and `[employeeId]/clocker-pin/actions.ts` messages stay English. `loading.tsx` labels ("this team
  member") stay English: the words are the shell's RouteSkeleton's, and a loading file shouldn't wait on a read. The
  forms and screens these pages draw belong to other rows (team forms, core profile form, invitation, access grants,
  wages, time off, restrictions, directory); the directory still gets the `.en` company words.

### components/manager-profile, /app/profile, components/profile
- New `manager-profile-copy.ts` (+ test): the Owner's and Manager's Profile (details, access reach, states, alert topics
  by id with the approved Spanish only when the read sends the approved English, save errors, Notifications, device
  alerts). `manager-profile.tsx`: More, Edit, and the company's Spanish word for locations.
- New `src/app/app/profile/profile-copy.ts`: titles of Profile, Add to calendar (and its closed notice), Passkeys and
  Alerts on this device.
- Skipped: `[document]/page.tsx` (policy documents, out of this pass); `profile-calendar-disclosure.tsx` (no route).
  Time zone names ("Puerto Rico time") come from `timeZoneLabel` (lib, English).

### components/account, /app/account
- New `src/components/account-copy.ts`: Delete account's title and role names (the page now passes `lang` to
  `AccountDeletionForm`, which already had it for the last-Owner card), and the assisted recovery code's three messages.
- Gaps: the request and reset messages in `account-recovery.tsx` serve the sign-in pages and stay English, as the
  component's note says. `account/delete/actions.ts` messages stay English. The deletion view itself is
  `employee-mobile/deletion.tsx` (another row).

### components/passkeys
- `passkey-section.tsx`, `passkey-desktop-view.tsx`, `passkey-offer.tsx` now use the existing Spanish in
  `src/lib/passkeys/copy.ts` (they used `.en` only), dates in es-PR ("14 nov 2026"). New `passkeys-copy.ts` for the
  Profile row ("Llaves de acceso", "2 configuradas", "Sin configurar").

### components/employment
- New `employment-date-fields-copy.ts`: the hire, termination and birth date labels, help lines and field errors.
  `TERMINATION_BEFORE_HIRE` keeps its English value.

## For Jose to review (pay, payroll, privacy, account security)
| English | Spanish |
|---|---|
| Payroll and Settings are for Owners. | La nómina y la configuración son para los dueños. |
| Payroll ready to review / When a pay period is ready for you | Nómina lista para revisar / Cuando un período de pago está listo para ti |
| Pay rate (person page row and title) | Tarifa de pago |
| Time off balance | Balance de días libres |
| Christmas bonus hours use this date. | Las horas del bono de Navidad usan esta fecha. |
| Back to Christmas bonus hours | Volver a horas del bono de Navidad |
| Date of birth (optional) | Fecha de nacimiento (opcional) |
| Private. Only Owners and Managers who can edit this profile see it. | Privada. Solo la ven los dueños y gerentes que pueden editar este perfil. |
| Termination date (optional) / For your records only. It doesn’t deactivate anyone. | Fecha de terminación (opcional) / Solo para tus récords. No desactiva a nadie. |
| Delete account | Eliminar cuenta |
| Reset password / Give them a link to set a new password | Restablecer contraseña / Envíale un enlace para crear una contraseña nueva |
| The recovery code could not be confirmed. Check current access before preparing another code. | No pudimos confirmar el código de recuperación. Revisa el acceso actual antes de preparar otro código. |
| This code expired. Verify identity again before issuing another. | Este código venció. Verifica la identidad de nuevo antes de emitir otro. |
| Your session ended. Sign in again to issue a code. | Tu sesión terminó. Inicia sesión de nuevo para emitir un código. |
| Passkeys / N set up / Not set up | Llaves de acceso / N configuradas / Sin configurar |
| Sign-in active / No email, can’t sign in / Invited Oct 12, not activated / Invitation expired / Not invited yet | Acceso activo / Sin correo, no puede iniciar sesión / Invitado el 12 oct, sin activar / Invitación vencida / Aún sin invitar |

Also: the company word presets' Spanish ("Ubicación", "Ubicaciones") differs from the glossary's "localidad"; this
part's own sentences say "localidad", and the Manager's reach uses the company's word.
