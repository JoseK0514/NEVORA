# es-rest part D

Areas: /app/requests, components/time-*, components/leave-staffing, components/activity, components/brand, components/native-shell,
components/team, /app/help, /app/my-time, /app/my-pay, /app/timecards (route files), /app/payroll and /app/payroll-export (route
files), /app/billing, /app/(root), /app/updates, /app/ai-manager.

Pattern: one `{en, es}` table per area, `const es: typeof en`; client parts read `usePortalLang()`, server pages `readPageLang()`;
shared server-rendered parts take an optional `lang` prop (English by default) so their callers can pass it. English text is
moved over unchanged. Every table has a key-set test and a Spanish render test.

## Per area

| Area | Table | Files changed | Notes |
|---|---|---|---|
| /app/requests | `src/app/app/requests/requests-copy.ts` (48 keys) | `page.tsx`, `time-off-signature.tsx`, `hub/page.tsx`, `hub/request-hub.tsx` | Titles are now `generateMetadata`. The page root gets `lang="es"`. |
| components/time | `src/components/time-copy.ts` (60 keys) | `time-off-waiting-list.tsx`, `time-off-review-actions.tsx`, `time-off-decision-form.tsx`, `time-off-withdrawal.tsx`, `time-correction-context.tsx` | `ASK` stays exported in English (Things to do, `owner-b/inbox-b.tsx`, imports it); `TIME_COPY[lang].ask` has both. `CorrectionComparison` and `PriorCorrectionDecisions` take `lang` (Spanish dates via `es-PR`, "3 nov, 9:02 a. m."). `time-off-withdrawal.test.tsx` now stubs `usePortalLang` (it calls the form as a function, outside a render). |
| components/leave-staffing | `leave-staffing-copy.ts` (75 keys) | `conflict-check.tsx`, `repair-note.tsx`, `failure-notice.tsx`, `own-leave-note.tsx`, plus the Waiting list's "On the schedule" line | The Spanish shift, duration and total lines are written from the same facts as `src/lib/time-off-staffing/present.ts` ("jue, 12 nov · 7:00 a. m. – 3:00 p. m. · Condado"). The failure notice's Spanish mirrors `FAILURE_MESSAGES` in `src/lib/http/nevora-failure.ts`. |
| components/brand | `src/components/brand-copy.ts` (45 keys) | `brand-editor.tsx` | Notices now carry a `kind` instead of matching English text with `startsWith`. `brand-legal.tsx` already had both languages (sign-in footer): unchanged. |
| components/native-shell | `native-shell-copy.ts` (36 keys) | `device-settings.tsx`, `unsupported-role.tsx` | `device-settings.tsx` is used (portal-device-setup and the phone app's Alerts); it was listed as unused in the claim by mistake. `UnsupportedNativeRole` takes `lang`; it stays synchronous because the layout's native test renders it synchronously. |
| components/team | `src/components/team-copy.ts` (40 keys) | `team-live.tsx`, `team-desk-people.tsx`, `team/team-forms.tsx`, `team/team-overview.tsx` | `notClockedInText` and `clockedInText` take an optional language (English by default; owner-b and the manager roster call them unchanged). Clocked in late uses `reviewCopy(lang)`. `TeamOverviewCorp` takes `lang`. |
| /app/help | `src/app/app/help/help-copy.ts` (31 keys) | `page.tsx` | The frame, How to and question titles are translated. The answers come from the support policy (`src/lib/legal`) and stay English; on a Spanish page they're marked `lang="en"`. |
| /app/(root) | `src/app/app/home-page-copy.ts` (13 keys) | `page.tsx`, `[...missing]/page.tsx` | Title, unavailable and error states, the location Manager's location menu, greeting and weekday names. The Employee onboarding guide now gets the person's language instead of a fixed `"en"`. |
| small routes | `src/app/app/route-copy.ts` (45 keys) | timecards, corrections and new correction, my-time, my-pay, payroll (route and 7 sub-page titles), payroll-export, ai-manager (4 titles and the weekly error), updates (3) | My time's payday line is Spanish ("Día de pago programado: viernes, 11 dic por 30 nov – 6 dic"). |

## Gaps left

- Server action messages stay English: `src/app/app/requests/actions.ts` (time-off send, review and withdraw results).
- Callers in other areas still need to pass the language: `CorrectionComparison` and `PriorCorrectionDecisions` (employee-time-corrections, manager-time-corrections, delegated-time-correction-form, employee-mobile/hours-corrections), `TeamOverviewCorp` (manager-dashboard), `UnsupportedNativeRole` (app layout, shell), `TimeOffDecisionForm`'s `waitingLine` where a caller passes its own English line.
- English from libraries shown inside these parts: the color adjustment message (`deriveBrand(...).adjustments[0].message`), a device failure message (`snapshot.message`), the Requests hub's subtitle and pills (`employee-requests-corp.tsx`, es-employee), `TimeOffListRow`, `TimeOffRequestCard` and `PickField` (employee-mobile), the closed Payroll line for a Manager (`closedPayrollForManager` in `owner-only-notice.tsx`, es-rest main), `formatWeekRange` on a location Manager's Home.
- Skipped: `src/app/app/billing/page.tsx` already has both languages (package P); `payroll-export/paid-time/page.tsx` already reads the language (payroll-2, G9); loading placeholders' labels go through `RouteSkeleton` (shell). Not imported by any route: `time-clock-widget.tsx`, `time-off-review-decision.tsx`, `brand-lockup.tsx`, `activity-history-panel.tsx`, `requests/time-off-form.tsx`.
- Default word preset: Spanish location word comes from the preset where used elsewhere; Home's location menu here says "Localidad" (glossary).

## For Jose to review (pay, payroll, privacy, billing)

| English | Spanish |
|---|---|
| Scheduled payday: {day} for {range} | Día de pago programado: {day} por {range} |
| Pay / My pay | Pago / Mi pago |
| Payroll | Nómina |
| Payroll is for Owners | La nómina es para dueños |
| Owners can give you payroll access. | Los dueños pueden darte acceso a la nómina. |
| give you payroll access | darte acceso a la nómina |
| Fix payroll / Payroll history / Import pay / Payroll people / Prepare payroll / Review payroll | Arreglar nómina / Historial de nómina / Importar pagos / Personas en la nómina / Preparar nómina / Revisar nómina |
| Time exports are for Owners and Managers. | Exportar tiempo es para dueños y gerentes. |
| See your pay statement | Ver tu comprobante de pago |
| Prepare payroll (Help, How to) | Preparar la nómina |
| Shift, time off or pay | Turnos, días libres o pago |
| Keep private details out of email | No envíes datos privados por email |
| Never email passwords, codes, bank details or pay documents. | Nunca envíes por email contraseñas, códigos, datos bancarios ni documentos de pago. |
| Privacy and terms / Privacy Policy / Terms of Use / Account deletion | Privacidad y términos / Política de privacidad / Términos de uso / Eliminar la cuenta |
| This connection isn’t secure. We cleared this page to protect your information. … | Esta conexión no es segura. Borramos esta página para proteger tu información. … |
| Your access changed. This information was cleared from the screen. … | Tu acceso cambió. Borramos esta información de la pantalla. … |
