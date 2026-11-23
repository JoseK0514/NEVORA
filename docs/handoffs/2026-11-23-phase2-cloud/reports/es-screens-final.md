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
- (Second pass, below: the week grid, the shift form, Find cover, Review replacement and `ManagerShiftRequests` are now
  Spanish.)
- Employee and Lead phone views: `ResponsiveEmployeeRequests` / `ResponsiveEmployeeExchange`, `SwapPageContent`,
  `CalloutView`, `ResponsiveEmployeeCreation`, `ShiftChangeForm`, `ShiftChangeHistory`, the Lead's compose (employee-mobile).
- Shell (nav, tab bar, "Loading {label}…" from `RouteSkeleton`), `TeamB`'s band, `BRouteLoading`, `ManagerMessagesPage`
  chrome, `EmploymentDateFields`, `FormHead`, `ChoiceField`.
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

## Second pass: the rest of the Schedule tools (Nov 23, evening)
Staff's tip merged first (`746074e3`, then `c9ba77d8` merged at `a2617040`; the newer tip carries staff's fix to
`management-close-card.test.ts`, which read English words from the Timecards form after the Spanish merge).

| Commit | What |
|---|---|
| `215fe886` | Week grid `manager-weekly-roster.tsx` in Spanish in all four views (desktop people × days grid, phone day card, Direction B phone, Quiet list): `manager-weekly-roster-copy.ts` (about 100 strings, screen-reader text included), dates and times through `schedule-copy.ts` ("lun, 23 nov", "6:00 a. m."). Spanish-only fix: the amber "missed" chip compared against the English word; it now reads the Spanish table |
| `2479d906` (merge `bcd72494`) | Shift requests `manager-shift-requests.tsx` in Spanish: `manager-shift-requests-copy.ts` (tabs, kind chips, facts, help lines such as "Approving gives this shift…", history, Decline/Approve/Close questions, empty states, the closed card); `/app/exchange` reads the language once in its manager branch. Reuses `exchange-copy`/`shift-copy` lines; passes `review-details` a Spanish copy with tú and the glossary (that file still says "Inténtelo", "Su tarjeta", "cobertura" on other screens) |
| `d96e6831` | Week grid "Find cover" reads "Buscar cobertura", the title of the page it opens (Find cover, Owner Home) |

The shift form (Add shift), Find cover and Review replacement were already Spanish from `coverage-copy.ts` and
`components/schedule-copy.ts`; the browser check below confirms it.

### Checks
- `tsc`, oxlint on every changed file, `src/components` + `src/app/app/{schedule,exchange}`: 4,082 tests, 0 failures. New
  tests: key, kind and argument-count match per table, no "¡", no usted, glossary, plurals, Spanish dates and times, and
  Spanish render tests for the four roster views and the three Shift requests tabs (English output unchanged).
- Browser (held development build, fictional data, saved language Spanish), 390, 390 with 200% text, 1440, axe:

| Screen | Person | Sideways scroll | Overlap | axe | English words left |
|---|---|---|---|---|---|
| Schedule week grid | Owner, Daniel | none | 0 at 390 and 390 200%; 1440 flags are hidden text (see below) | 0 | 0 (35 at 390, 90–190 at 1440 before) |
| Add shift | Owner | none | 0 | 0 | 0 |
| Find cover | Owner | none | 0 | 0 | 0 |
| Review replacement | Owner | none | 0 | 0 | 0 |
| Shift requests | Owner, Elena | none | 0 | 0 | 0 |

- The 1440 week grid's overlap flags are the phone coverage line and segments (`display:none` on desktop) and the grid
  bar's "Cubierto esta semana" summary, which sits under the grid's header cell in a 0-height bar (same element in
  English; nothing visible). One "esta semana" flag is a 1px screen-reader span.
- At 390 with 200% text the Shift requests tabs wrap to two lines and "Terminadas" breaks with a hyphen ("Termi-nadas");
  at the default size all three fit on one line. The tabs are the kit's segments (13px, can't grow); a shorter word for
  Done would lose meaning, so it's left for the kit's 200% segment work (G88).
- Shots `shots/es-screens-final/`: `owner-week-*`, `daniel-week-*`, `owner-add-shift-*`, `owner-find-cover-*`,
  `owner-review-*`, `owner-requests-*`, `elena-requests-*` (`-1440`, `-390`, `-390-200`, first viewport).

### Left in English (server data)
Role and position names, the server's availability notices on Shift requests ("Needs Owner rule review"; the publish link
matches the English text), and unknown status codes shown as they come.

### For Jose to review (second pass)
- Hour limits on the week grid: "4 h por encima del límite de 40 h", "12 de 30 h de meta", "12 de 40 h de límite", the
  short " · 4 h sobre 40 h", and "16 h asignadas esta semana".
- "Al aprobar, el turno sale de su horario. Todavía necesitará a alguien que lo cubra." (can't-work approval)
- "Ausencia aprobada" / "Ausencia rechazada" / "¿Rechazar esta ausencia?" (kept from review-details; "ausencia" isn't in
  the glossary).
- History steps: Creada, Aceptada, Completada, Rechazada, Retirada, Vencida, "Enviada a un gerente", Desactualizada.
- Glossary deviations to fit 390: the Open cover tab is "Por cubrir"; the cover request chip is "Reemplazo" (the full
  "Solicitud de reemplazo" is used in sentences and labels); grid chip "4 disponibles" (was "4 open").
- No payroll, tax or legal lines on these screens.
