# Signed-in Spanish: /app/schedule, /app/exchange, company-access, communication (screens-final)

Branch `claude-codex-collab-nevora-screens-final`, on the shared contract `960579cf` (`usePortalLang`) and the shared tip
merged at `041b0d9f`. English output is unchanged (only React's `<!-- -->` text separators moved in three places where two
text pieces became one: "Search {people}", "Shift lead", the Schedule's "Copied N shifts…" note).

## Commits
| Commit | What |
|---|---|
| `b32b3193` | `components/company-access` in Spanish: `access-copy.ts` (263 entries), every client component on `usePortalLang()` (the read frame through two small children so its function-call tests keep working), `OperationalUnavailable`/`ScheduleRouteFeedback`/`ScopedShiftDetails` take `lang`; `scoped-person.tsx` reads the language itself; `employees/page.tsx` passes `lang` to the scoped Team (one-line read, allowed by the lead) |
| `356cf38c` (merge of `533bc31c`) | `/app/schedule` in Spanish: `schedule-copy.ts` (about 340 entries), every page reads the language once with `readPortalLanguage(proof)` (English if it fails) and sets `lang="es"` on its page; actions return Spanish messages when they have the proof (two settings actions call `requireSessionMutationProof()` again just for the language); the error boundaries use `usePortalLang()` |
| `d16ecfb9` (merge of `3418cc44`, `8d6c39f9`, `51551130`) | `/app/exchange` (`exchange-copy.ts`) and Updates compose and detail (`communication-copy.ts`), about 340 entries; Employee/Lead exchange, open shifts and swap pages read the language; compose, detail and the open-shift board use `usePortalLang()`; DEC6 kept ("Must be confirmed" / "Confirming is optional" → "Debe confirmarse" / "Confirmar es opcional"); the 9a6a529d source test now reads the table |
| `b21c6601` | Schedule pages pass `lang` to their closed and failed cards, route notes and the scoped shift sheet; Copy receipt reads the language before its closed card ("Resultado de la copia" / "Necesitas acceso a toda la empresa") |

About 940 strings in all (the inventory sized the area at 1,240 at ±15%, counting strings in other sessions' components
these pages render).

## Checks
- `tsc`, oxlint on every changed file, and `src/components` + `src/app/app/{schedule,exchange,updates,employees}`: 3,738
  tests, 0 failures. New tests: deep en/es key match per table, argument-count match, no "¡", no "usted", no English
  glossary words in the Spanish, plurals, date and time forms ("7–13 dic", "lunes, 7 de diciembre", "6:00 a. m."), and
  Spanish render tests (Spanish present, English absent) for Build and publish, Scheduling rules, the exchange page, the
  open-shift board, compose, detail, the read frame, closed and failed pages, scoped Home, Team, shift sheet, route notes,
  invitation panel and scope fields.
- Browser (held development build of the test app, fictional data, each person's saved language set to Spanish):
  390, 390 with 200% text and 1440, with axe. `shots/es-screens-final/`.

| Screen | Person | 390 / 390 200% / 1440 | English words left |
|---|---|---|---|
| Build and publish | Owner | no sideways scroll, no overlap, axe 0 | 0 |
| Scheduling rules | Owner | same | 0 |
| New update (compose) | Owner | same | 0 |
| Update detail | Owner | same | 3 (the fictional message body) |
| Copy receipt, closed card | Daniel | same | 0 |
| Team at his place | Daniel | same | 1–2 (the band's "Team", from `TeamB`) |
| Posted open shifts | Daniel | same | 0 |
| Schedule | Owner, Daniel | same (the 1440 overlap flags are hidden print and collapsed text, nothing visible) | 35 at 390, 90–190 at 1440: the week grid |
| Pick up and swap | Employee | same | about 20: the phone view |
| Write an update | Lead | same | 16: the Employee compose form |

The access frame's own states (checking, paused, needs a fresh check, couldn't check) are covered by the render tests;
they show only for a moment in the browser, so they weren't captured.

## Still English on these screens (other sessions' files)
- Week grid `manager-weekly-roster`, `components/schedule/*` (generation and publication controls, copy form, print), the
  shift form `ScheduleShiftForm`, Find cover and Review replacement (`CoverageAssistant`, `CoverageReview`), `RulesSaveForm`
  and the other rules fields, `TemplateFeedback`, `Celebration`, `HeldReviewNote`, `LeaveRepairNote`.
- Employee and Lead phone views: `ResponsiveEmployeeRequests` / `ResponsiveEmployeeExchange`, `SwapPageContent`,
  `CalloutView`, `ResponsiveEmployeeCreation`, `ShiftChangeForm`, `ShiftChangeHistory`, the Lead's compose (employee-mobile).
- Shell (nav, tab bar, "Loading {label}…" from `RouteSkeleton`), `TeamB`'s band, `BRouteLoading`, `ManagerMessagesPage`
  chrome, `ManagerShiftRequests` (the Manager's exchange page), `EmploymentDateFields`, `FormHead`, `ChoiceField`.
- Library messages: `schedulingIssueMessage`, the conflict errors, `momentsCopy('es')` (uses usted: "Su equipo…"), the
  reminder copy (uses usted). Both need tú; they belong to the owner-b and reminders rows.
- `QuietPage` has no `lang` prop, so the Employee exchange page can't set `lang="es"` (one line in `quiet/quiet.tsx`).
- Page `metadata` titles stay English (a translated title needs `generateMetadata` and another session read).

## For Jose to review
- "Payroll access is set separately." → "El acceso a nómina se asigna aparte."
- "Remove this person's manager access? They keep their employee account and any payroll access." → "¿Quitar el acceso de
  gerencia de esta persona? Mantiene su cuenta de empleado y cualquier acceso a nómina."
- "Clocked this week" / "Includes breaks" → "Marcadas esta semana" / "Incluye descansos"; "Scheduled today/this week" →
  "Programadas hoy/esta semana"
- "Shift saved, but the employee is now scheduled for more than 40 hours." → "Turno guardado, pero el empleado ahora tiene
  más de 40 horas programadas."; "…they may exceed 40 hours." → "…podrían pasar de 40 horas."
- "The termination date can't be before the hire date." → "La fecha de baja no puede ser antes de la fecha de contratación."
- "Without an email, this person can clock in on the tablet but can't sign in to NEVORA." → "Sin correo, esta persona puede
  marcar en la tableta, pero no puede iniciar sesión en NEVORA."
- "Confirming records receipt of this version. It does not indicate agreement or attendance." → "Al confirmar, queda
  registrado que recibiste esta versión. No indica que estés de acuerdo ni que asistirás."
- "You confirmed receipt of this version on …" → "Confirmaste que recibiste esta versión el …"
- "Sent to N recipients. Delivery does not confirm reading." → "Enviado a N destinatarios. Que se entregue no confirma que
  se leyó."
- "Posting and withdrawal require schedule publishing permission at a managed location." → "Para publicar y retirar turnos
  necesitas permiso para publicar horarios en una localidad que manejas."
- "Your current permission does not allow publication." → "Tu permiso actual no te deja publicar."

## Wording choices to confirm
"localidad", "gestionar" (manage), "Pide ayuda a un dueño", "Celular" (mobile phone), "Invitación emitida/revocada/
cancelada", "Crear y publicar" (Build and publish), "Disponibles" for the Open shifts tab (to fit three tabs at 390),
"Turnos disponibles publicados" (Posted open shifts, about 60% longer), "Aceptar intercambio" (voice.md forbids a bare
"Aceptar"). "Ustedes" appears only where a swap message speaks to both people (voice.md allows it for a group).
