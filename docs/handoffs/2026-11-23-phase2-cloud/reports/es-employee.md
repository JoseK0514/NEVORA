# Signed-in Spanish: `components/employee` and `components/employee-b` (es-employee)

Branch `claude-codex-collab-nevora-es-employee`, from `7c1464eb`, with the shared tip merged at `960579cf` and again at `df92294d`.
Fictional data only. English is unchanged everywhere: every string was moved into a table without rewording, except the
one Profile hint the lead removed (below).

## Commits (code)
| Commit | What |
|---|---|
| `c72a2b5b` | `employee-b/es-format.ts`: Spanish forms for times and dates the pages pass in already formatted ("7:00 a. m. – 3:00 p. m.", "lun, 7 dic", "7–13 dic") |
| `8d42c8db` | Time panel, My time and corrections (`employee-time-copy.ts`) |
| `2a8cb017` | employee-b Account, Requests, Home, Schedule, Time and Pay; the Team directory and the person's profile |
| `f7be67e1` | Employee Home, Schedule, Updates and the Requests card. Server pages pass the language. Profile drops the sign-in-only hint |
| `87526152` | Fixes from the Spanish browser pass (see "Found in the browser") |
| `e6e613fd` | More: one `readPortalLanguage` import after the merge |
| `f198f7f2`, next | 200% text fixes (Updates buttons, Pick up and swap tabs, day chips and link), a declined correction is told by its status code |

Shots: one separate final commit with `shots/es-employee/img/*.webp` and this report.

## Tables (`{en, es}`, same keys, each with a key-set test)
- **Extended:**
  - `employee-b/account-copy.ts`: about 300 new strings for More, Help, policy pages, Profile, Calendar, Alerts, Delete my account, Availability, Notifications, Updates and Compose.
  - `employee-b/work-copy.ts`: about 90 new strings for Home, Your week, Schedule, Open shifts and the shared parts.
- **New:**
  - in `employee-b`: `requests-copy.ts` (108 keys), `time-copy.ts` (83), `pay-copy.ts` (40)
  - top level: `employee-home-copy.ts` (~150), `employee-time-copy.ts` (123), `employee-schedule-copy.ts` (~165), `employee-updates-copy.ts` (47), `employee-team-copy.ts` (~105)
- **Existing Spanish fixed** to tú and the glossary. Examples:
  - "Confirma tu horario"
  - "Días libres aprobados" (was "Tiempo libre")
  - "Turnos disponibles" (was "Turnos abiertos")
  - "Marca tu salida"
  - "No puedo trabajar"
  - "Sin turnos para ti"
  - "esta empresa" (was "espacio de trabajo")
- **Language source:**
  - Client components call `usePortalLang()`.
  - Server-rendered components take an optional `lang` prop (default `'en'`).
  - Exported helpers that other areas call take an optional trailing `lang`, so existing callers are unchanged. Examples: `bPillText`, `timeOffPill`, `todoTitle`, `wallTime`, `BDay`, `Dotted`, `formatEmployeeMetric`.

## Page edits outside my area (lead-approved, one line each plus the import)
All use `(await readPortalLanguage(proof).catch(()=>null))?.language??'en'`, so a page falls back to English if the read fails:
- `src/app/app/more/page.tsx`: `EmployeeMoreB`
- `src/app/app/help/page.tsx`: `EmployeeHelpB`
- `src/app/app/profile/[document]/page.tsx`: `EmployeeDocumentB`
- `src/app/app/availability/page.tsx`: `AvailabilityB`, `AvailabilityStatusB`, `availabilitySubB`
- `src/app/app/schedule/page.tsx`: `EmployeeMySchedule`, which passes it on to Schedule B
- `src/app/app/employees/page.tsx`: `EmployeeDirectory`

Not edited: `src/app/app/requests/hub/request-hub.tsx`. It has no proof, and its own strings ("Time off", "Shift requests") belong to es-rest. Its helpers `timeOffPill`, `timeOffDetail` and `requestsSubtitle` accept `lang` when es-rest wires it.

Test files outside my area, changed with the lead's OK:
- `employee-mobile/notifications-list.test.tsx:69`: now expects the tú "Confirma la semana…".
- `employee-mobile/profile-preferences.test.tsx:33`: no longer expects the removed hint.

## Profile hint removed (the lead's call, for Jose to see)
"Sign-in pages only. The rest of NEVORA is in English for now." is removed in both languages from Profile (`account-copy.ts`, `account-b-client.tsx`). The same goes for the Team profile's "Used on the sign-in pages for now." (`employee-team-copy.ts`). A test checks it stays gone. The copy in `employee-mobile/profile.tsx:27` belongs to es-mobile and still shows on the desktop Profile.

## Browser checks (Spanish via the `nv-lang` cookie, development build, Employee and Lead)
Pages: Home, Schedule, Time (`/app/my-time`), Pay (`/app/my-pay`), Requests, Updates, Profile, More, Help and Availability, each at 390, at 390 with 200% text, and at 1440, with axe (WCAG 2.2 AA tags).

- **Sideways scroll:** none on any page, width or role.
- **axe:** no findings on any page after the fixes.
- **Clipping fixed:**
  - Home shortcut tiles ("No puedo tr…", "Cambiar tur…", "Corregir mi …") now wrap to two lines in `employee-b.css`. English labels still fit on one line, so they look the same.
  - Chips at 200% text ("Necesita tu respue…", "Requiere ac…") now read "Por responder" and "Pendiente", which are shorter than the English "Needs your answer" and "Action needed".
- **Remaining clip:** Home's hours figure on phones reads "trabajadas esta sem…" at 390. The rule is `.b-live__m` (nowrap + ellipsis, `!important`) in `src/app/app/employee-b-work.css`, which is not in my area. It needs either that rule to allow two lines, or Jose to choose a shorter Spanish word.
- **Targets under 36px at 1440:** the desktop back links "Inicio" (More), "Solicitudes" (Requests) and "Schedule" (Availability) are kit or shell links. Proposed as end-sweep rows.
- Shots are in `shots/es-employee/img/` as `es-<page>-<employee|lead>-<390|390-200|1440>.webp` (60 files).

### Found in the browser and fixed (`87526152`, `e6e613fd`)
- **Schedule and Requests failed to compile (Turbopack, 500):** `employee-schedule-copy.ts` imported a label function from `lib/data/employee-schedule`, a database module, into client components. The words now live in the table, and a test guards against it happening again.
- **Home:** to-do titles, source names, "At least" and the unpublished-locations note were still English. They now follow the language.
- **Time:** day chips and the shift-ended times now follow the language.
- **More:** the merge left two identical `readPortalLanguage` imports. tsc allows that, Turbopack doesn't. Now there is one.

## For Jose to review (pay, privacy, account)
**Pay (`pay-copy.ts`, `work-copy.ts`):**
- Pay → Pago
- Pay statement → Comprobante de pago
- Pay history → Historial de pago
- Recent pay statements → Comprobantes de pago recientes
- Last pay statement → Último comprobante de pago
- Statement ready → Comprobante listo
- Scheduled payday · {when} → Día de pago programado · {when}
- Today / Tomorrow / In {n} days → Hoy / Mañana / En {n} días
- Payday → Día de pago
- Pay period {period} → Período de pago {period}
- For work {period} → Por el trabajo del {period}
- Replaced / Corrected → Reemplazado / Corregido
- Replaced by the {day} correction → Reemplazado por la corrección del {day}
- A corrected statement replaced this one. Use the corrected statement for this period. → Un comprobante corregido reemplazó este. Usa el comprobante corregido para este período.
- This corrects your earlier statement for the same period. → Este corrige tu comprobante anterior del mismo período.
- Use the corrected statement → Usar el comprobante corregido
- No published statements yet → Todavía no hay comprobantes publicados
- Your statements appear here after your employer shares them. → Tus comprobantes aparecen aquí cuando tu patrono los comparte.
- That statement isn’t available / It may have been replaced, or your access changed. → Ese comprobante no está disponible / Puede que lo hayan reemplazado o que tu acceso haya cambiado.
- Downloaded files may contain personal pay information. → Los archivos descargados pueden contener información personal de pago.
- Open a statement to download its PDF. … → Abre un comprobante para descargar su PDF. …
- Pay statement (PDF), {role}, payday {day} (opens separately) → Comprobante de pago (PDF), {role}, día de pago {day} (se abre aparte)
- View statement → Ver comprobante
- See all statements / Earlier statements / Every published statement → Ver todos los comprobantes / Comprobantes anteriores / Todos los comprobantes publicados
- See your hours → Ver tus horas
- Pay statement shared (notification) → Comprobante de pago compartido
- Schedule, request and pay notices → Avisos de horario, solicitudes y pago

**Time and payroll hours (`employee-time-copy.ts`):**
- Today's totals include breaks and aren't payroll hours. → Los totales de hoy incluyen descansos y no son horas de nómina.
- Ask a manager to reopen the finalized timecard period before requesting a correction. → Pide a un gerente que reabra el período cerrado de la tarjeta de tiempo antes de pedir una corrección.
- The original Clocker record stays unchanged. A manager reviews the proposed adjustment. → El registro original del Clocker no cambia. Un gerente revisa el ajuste propuesto.
- Your manager reviews each request. Your original times are kept. → Tu gerente revisa cada solicitud. Tus horas originales se guardan.
- Missing time is submitted as a correction record. It does not create a recorded Clocker punch. → El tiempo faltante se envía como una corrección. No crea una marcación en el Clocker.

**Privacy and account (`account-copy.ts`, `employee-team-copy.ts`):**
- Keep private details out of email → No envíes datos privados por correo
- Never email passwords, codes, bank details or pay documents. → Nunca envíes por correo contraseñas, códigos, datos bancarios ni documentos de pago.
- Keep the link to yourself / Anyone with it can see your shift times and locations. → No compartas el enlace / Cualquiera que lo tenga puede ver las horas y localidades de tus turnos.
- For your privacy the link is shown only once… → Por tu privacidad, el enlace se muestra una sola vez. Obtén uno nuevo si necesitas copiarlo otra vez.
- Every Delete my account line. Examples:
  - "Eliminar tu cuenta de NEVORA no termina tu empleo ni borra los registros que tu patrono tiene que guardar."
  - "Procuramos eliminar tu perfil, tus datos de inicio de sesión, tus suscripciones a notificaciones, tus enlaces de calendario y el contenido que aportaste. Después de confirmar, no puedes cancelarlo en la app."
  - "Qué guarda {workplace}"
  - "Nunca te pediremos tu contraseña."
- Ends your access to this workspace → Termina tu acceso a esta empresa
- Team sheet:
  - "Su sesión se cierra de inmediato. Su historial se queda y puedes reactivarlo."
  - "Después, el dueño le asigna su acceso de gerencia. No se otorga ningún acceso automáticamente."
  - "Restablecer una contraseña o un PIN de Clocker"
  - "Ayudar a iniciar sesión"
- Christmas bonus hours show the saved details. → Las horas del bono de Navidad muestran los datos guardados.

## Still English on these screens (other owners, already relayed to the lead)
- **es-mobile:**
  - Page titles: Time ("Time", "Past timecards", "Mon, Nov 23"), "Profile and settings", the Availability phone page.
  - The locked pay lines `PAY_SCOPE_LINE` and `PAY_DIFFERENCE_LINE` in `employee-mobile/pay.tsx`.
  - Request row titles in `employee-mobile/requests.tsx`.
  - `messageTime`: my files wrap it with `esDate`.
- **es-owner:** `owner-b/moments-copy.ts` Spanish still uses usted. It shows on Fix my time's finish card.
- **es-rest or screens-final:**
  - "What changed in your schedule" (`schedule-publication-change.tsx`)
  - More's "6 days a week" (availability summary)
  - `update-visual.tsx` kind labels
  - The comparison block and time picker in `time-correction-context.tsx` and `correction-time-ticket.tsx`
- **Data:** position and location names (fictional "Customer Support", "Main Office") stay as entered.

## Checks before each push
- tsc: 0 errors.
- oxlint (`src/components`, `src/app`): no errors.
- Whole `src/components` + `src/app/app` suite: 4388 passed, 0 failed at `e6e613fd`.
- Per table: key sets match, no empty Spanish, no usted, glossary terms.
- Spanish render tests for every main view: Home (Employee and Lead), Schedule (week, shift sheet, Open shifts), Weekly confirmation, Time, Past timecards, Corrections, Pay, Statement, Pay history, Requests, Time off, Pick up and swap, Updates, Notifications, More, Help, Profile, Calendar, Alerts, Delete, Availability, the Team directory, the person's sheets and the account panel.

## Impeccable audit (Spanish)
- **Hierarchy:** titles, bands and chips keep their English order.
- **Spacing and fit:**
  - Buttons stay on one line at 390 wherever the English does.
  - The Home shortcut tiles wrap a long Spanish label onto a second line instead of cutting it off.
  - Two chips were shortened so they fit at 200% text.
- **Accessibility:** axe is clean, and aria-labels are translated together with the visible text.
- **States:** loading, failed, paused, denied, empty and success are all translated and covered by render tests.

## Second pass (es-mobile's notes, relayed by the lead)
- **Updates at 200% text:** "✓ Confirmar" spilled out of its half of the row. Open and Confirm now stack once a label doesn't fit; the rule is scoped to `lang="es"`, so English is unchanged.
- **Pick up and swap at 200% text:**
  - The three places wrap onto rows. This needed a rule inside the `nv-b` layer, because `b-foundation.css` sets the track with a layered `!important`.
  - The Open shifts tab reads "Disponibles".
  - Day chips follow the language.
  - "Ver todos los turnos publicados" wraps instead of running off the card.
- **Time:** a declined correction is now told by its status code (`REJECTED`) instead of the English word "Declined".
- **Left for es-mobile:** `messageTime` and the hours-model helpers take `lang` only on es-mobile's branch. Until that lands, my screens run their English output through `esDate` and the word maps, and passing `lang` is a one-line change afterwards.
- **For the shell (lead):** signed-in pages always set `<html lang="en">` (`documentLang` in `src/app/layout.tsx` returns English whenever a session cookie exists). Spanish pages are therefore announced as English. My Updates and Pick up and swap wrappers set `lang` themselves.

## Proposed end-sweep rows
- **`employee-b-work.css` `.b-live__m`:** let the Home hours line wrap at 390 (Spanish "trabajadas esta semana").
- **Desktop back links under 36px:** "Inicio" on More, "Solicitudes" on Requests, "Schedule" on Availability.

## Second release (lead, 18:43): time corrections queue and the lang-aware helpers
Staff's tip (`836964e4`) was merged first. Code: `198cea83`, `bb17dd9e`, `04d3cae5`. Shots: `es2-*.webp` in `shots/es-employee/img/` (this commit).

**What changed:**
- **Manager time corrections queue** (`manager-time-corrections.tsx`):
  - New table `manager-time-corrections-copy.ts` (about 40 keys and a 7-entry `modes` group), with a key-set test and Spanish render tests. The tests cover the queue, a request's review, the empty, loading, failed and no-access states, approved and declined results, and conflicts.
  - The component is a client component that reads `usePortalLang()`; no page edit was needed.
  - `time-correction-context.tsx` and `correction-time-ticket.tsx` were already bilingual.
  - The Employee side (`employee-time-corrections.tsx`) was done in `8d42c8db`.
- **Time (`time-b.tsx`)** now takes its words in the person's language from es-mobile's `hours-model` helpers: dates, times, status words, request kinds, timecard notes and the tablet's name.
  - The `esDate`/`esTime` rewriting is gone.
  - The English word maps in `time-copy.ts` are gone: `statusWords`, `kinds`, `issues`, `tablet` and `timeWord`.
  - States are told by flags and status codes (`open`, `REJECTED`), never by the word.
  - A test checks that the model returns Spanish and that the maps stay gone.
- **Home and Updates** do the same with `dayWord`, `clock`, `weekRange` and `messageTime`.
- **Still uses `esTime`, deliberately:** wall-clock times from `formatTime` (`src/lib/date-utils.ts`) on Schedule, the Requests card and `wallTime`. The shared library has no language-aware form of that function yet.

**Browser check:** the language was a **saved Spanish profile choice** (`user_language_preferences`), not the cookie. Widths 390, 390 with 200% text and 1440, with axe.

| Role | Pages | Sideways scroll | axe |
|---|---|---|---|
| Employee | Home, Time, Past timecards, Your correction requests, Updates | none | no findings |
| Owner (queue with 2 requests) | `/app/timecards/corrections` | none | no findings |
| Manager Elena | `/app/timecards/corrections` | none | no findings |

- Elena has no correction permission in the fictional data, so her capture shows the Spanish no-access state ("No tienes acceso a las correcciones de tiempo").
- Fixed in the browser pass: the band's zone read "Horas en hora de Puerto Rico". It now reads "Hora de Puerto Rico".

**For Jose to review (approval and timecard wording):**
- Correction approved. The original recorded punch remains unchanged. → Corrección aprobada. La marcación original registrada no cambia.
- Correction declined. The original recorded punch remains unchanged. → Corrección rechazada. La marcación original registrada no cambia.
- The timecard shows the new times. The original clock times stay in its history. → La tarjeta de tiempo muestra las horas nuevas. Las horas originales del reloj quedan en su historial.
- The timecard keeps its recorded times. → La tarjeta de tiempo conserva sus horas registradas.
- Approving changes the timecard; the original clock times stay in the history → Al aprobar, cambia la tarjeta de tiempo; las horas originales del reloj quedan en el historial
- This period is finalized. Reopen it in Timecards before reviewing this correction. → Este período está finalizado. Reábrelo en Tarjetas de tiempo antes de revisar esta corrección.
- Fixes to past clock times wait here for your decision. The original Clocker record is kept. → Las correcciones de horas pasadas esperan aquí tu decisión. El registro original del Clocker se guarda.
- Fixes your team asked for. Original times are always kept. Times in {zone}. → Correcciones que pidió tu equipo. Las horas originales siempre se guardan. Hora de {lugar}.
- We couldn’t confirm your decision. Try again; it won’t be applied twice. → No pudimos confirmar tu decisión. Inténtalo de nuevo; no se aplicará dos veces.
- Another manager or an Owner reviews your own request. → Otro gerente o el dueño revisa tu propia solicitud.

**Checks:**
- tsc: 0 errors.
- oxlint: no errors.
- `src/components` + `src/app/app` suite: 4794 passed, 0 failed (at `bb17dd9e`).
- After `04d3cae5`, the corrections tests: 30 passed.
