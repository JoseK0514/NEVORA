# Signed-in Spanish: owner package (`claude-codex-collab-nevora-es-owner`)

Areas: `components/owner-b`, `payroll-import`, `roster-import`, `restrictions`, `time-off-admin`, `wages`, `review-details`,
`reminders`, the Copy receipt (`copy-receipt*`, the inventory's "copy") and `workforce`. Merged
`origin/claude-codex-collab-nevora` at 655d4e79 (it has the `usePortalLang()` contract, 960579cf). Fictional data only.

## Commits
- aa1c5b2b: owner-b copy table and wiring for Home, Things to do, Team and the billing notice. The package's client screens take the person's language.
- 5bed837e: merge of the shared branch (language contract).
- 77f1203c: views follow `usePortalLang()` when the page passes no language.
- 01158e3b: fixes from the Spanish scan (200% text, axe, glossary).
- ff08df11: more 200% text fixes.
- Shots and this report: the final commit on the branch.

## What changed
- **New `src/components/owner-b/owner-b-copy.ts`**: `{en, es}` for Home (`home-b.tsx`), Things to do and Later and done
  (`inbox-b.tsx`), Team (`team-b.tsx`) and the plan and billing notice (`billing-notice-card.tsx`), about 230 strings.
  English moved unchanged. Spanish times are written "7:00 a. m." and dates "vie, 27 nov" / "9–22 nov".
- **`src/components/owner-b/use-owner-lang.ts`**: `useViewLang(lang?)` returns the page's language if passed, otherwise `usePortalLang()`.
  These screens now use it: Home, Things to do, Team, billing notice, payroll import and paid time export, staff list import,
  restrictions, time off policies and balance, Cancel approval, pay rate, labor cost card, reminders, Manager actions
  and Week starts on. Pages that already pass `lang` (from `readPortalLanguage`) behave as before.
- **Other areas' tables were already complete.** The inventory's ES counts are a heuristic that undercounts Spanish. Every
  `copy.ts` there already had a typed `es` half, so nothing was missing. The new key-set test covers all 15 tables
  (`owner-b/area-copy-keys.test.ts`).
- **Glossary fixes in existing Spanish:**
  - "tiempo libre" → "días libres" in `time-off-admin/copy.ts` and `workforce/permission-copy.ts`, with agreement, e.g.
    "¿Cancelar estos días libres?" and "Días libres aprobados".
  - "ubicación" → "localidad" in `wages/copy.ts`, `wages/cost-copy.ts`, `workforce/permission-copy.ts` and
    `planning-window-card.tsx`.
- **Words chosen:**

  | Concept | English | Spanish |
  |---|---|---|
  | Page title | Things to do | Pendientes |
  | Clocked-in state | Clocked in | En turno |
  | Not clocked in | Not clocked in | Sin marcar entrada |
  | Missed (band tile) | Missed | No marcó entrada |
  | Missed (row line) | Missed clock-in | Entrada no marcada |
  | Open shift | Open shifts | Turnos disponibles |
  | Timecard | Timecard | Tarjeta de tiempo |
  | Message to the team | Update | Aviso |
  | Owner | Owner | Dueño |

  Fit fixes for 200% text:
  - Button "Find cover" → "Cubrir". Fill a shift for approved leave → "Asignar".
  - "Turnos dispo­nibles" carries a soft hyphen so it can break mid-word.
  - This week's labels: Planeado · Turnos · Equipo.
  - "Time clock" (the not-set-up tile) → "Clocker", the glossary's proper noun.

## Checks run
- `tsc --noEmit`: clean. `oxlint`: no errors (warnings are older, outside these areas).
- Whole `src/components` suite: 3267 passed, 0 failed (final run on ff08df11).
- New tests:
  - `owner-b-copy.test.tsx`:
    - key and type parity, and the Spanish times
    - Home in English and Spanish, with its states and the payroll notice
    - Things to do, with its read states and Later and done
    - Team, and the billing notice
    - the provider: a view with no `lang` follows `PortalLangProvider`, and an explicit `lang` wins
  - `area-copy-keys.test.ts`: 15 tables, same keys and shapes, and lists of the same length.
- Browser (the scan harness, with an `nv-lang=es` cookie): Owner (QAOWNER) and Manager (OWN-ELENA) at 390, 390 with 200%
  text and 1440, with axe (WCAG 2.0, 2.1 and 2.2 A/AA).
  - Owner pages: Home, Things to do, Team, Time off policies, a person's Time off balance and Pay rate.
  - Manager pages: Home, Things to do, Team.
  - Final run: **0 axe violations**, 0 sideways scroll, nothing off-screen, no button wrapped to two lines.
  - The first run found, and this branch fixed:
    - axe `label-content-name-mismatch` on Home's "Ver todo" (its name now starts with the visible words)
    - Things to do and Home rows crushed by a long "Buscar quién cubra" button at 200%
    - "Turnos disponibles" clipped on the band
    - "Personal" off the right edge in This week
    - "11 tarjetas de tiempo por aprobar" running off the band
    - Spanish time ranges running off the open-shift rows
- Not captured live: **Import a staff list.** In the scan the workspace has no routing config, so the page shows its
  "not available" notice. That notice is built in the route page from `rosterImportCopy.en`. The import screens'
  Spanish is covered by `roster-import/views.test.tsx`.

## For the lead: English still on these screens, outside my files
- **Shell** (payroll-2): nav, Search, account menu, `<html lang="en">` (voice.md asks for `lang="es"`), `BOffline`, b-loading,
  b-route-error, and the kit's `partOfDay` (I translate its result in Home).
- **Home route (`src/app/app/page.tsx` and the Manager and scoped Home):**
  - the date label ("Monday, November 23")
  - the hidden status sentence ("15 things to do today.")
  - the corporate desktop H1 ("Welcome back, …", hidden at 1440 behind the Direction B band)
- **Things to do (`components/manager-inbox-corp.tsx` and the inbox route):**
  - the group titles and row details ("Open shifts", "Today · Condado")
  - the status line
- **Team route (`src/app/app/employees/page.tsx`):** `people_word` and `person_word`, the tool rows, and the search placeholder the page passes ("Buscar employees").
- **`src/app/app/employees/import/page.tsx`:** uses `rosterImportCopy.en`. It should read `readPortalLanguage` like `employees/[id]/pay/page.tsx`.
- **Shared libs:** these still write English inside Spanish rows:
  - `lib/action-center/present.ts`: `ATTENDANCE_WORDS`, `presentItem`, `repairTitle`. I map the attendance words and the repair title locally.
  - `lib/time-off-staffing/present.ts`: `repairWhen`, `conflictShift` dates.
  - `components/team-live.tsx`: `notClockedInText`, `TeamLivePill`.
  - `employee-directory-filters` search.
- **Kit (read-only):** a row title with a trail button can still get narrow in Spanish at 320px with 200% text. That width wasn't in scope and wasn't checked.

## For Jose to review (pay, wage, tax and billing lines in Spanish)
Home's payroll and timecard tile:
- Nómina · El estado de la nómina no está disponible ahora · Abrir nómina
- Períodos de pago sin nómina · El calendario de nómina necesita revisión · «{período} no tiene nómina»
- El día de pago programado era {día} · Período de pago {período} · Día de pago programado {día}
- Preparar {período} · Preparar nómina
- Tarjetas de tiempo · Período(s) de pago terminado(s) · Abierto ahora · Abre el {día}
- Aprobación de tarjetas · Nada pendiente · Revisar tarjetas de tiempo · Ver las horas de la semana
- Aprobar tarjetas de tiempo · Desde el {día} · Abrir tarjetas de tiempo

Plan and billing notice:
- Plan y facturación · Tu prueba gratis termina el {día} / pronto
- Último día. · Queda 1 día. · Quedan {n} días. · Elige un plan para seguir usando NEVORA.
- No pudimos cobrar a tu tarjeta · Actualiza tu método de pago. · El acceso sigue hasta el {día}.
- El acceso está en pausa · Abre Plan y facturación para ver lo que hace falta.

Wages and labor cost: "ubicación" became "localidad" in these existing lines; nothing else changed:
- La tarifa aplica en cada localidad que elijas.
- Para dejar una localidad sin tarifa…
- Elige al menos una localidad.
- …tarifas de {name} en estas localidades.
- Esto reemplaza una tarifa…
- {n} localidades
- Revisa las localidades…
- No se cargó el estimado de esta localidad

Time off balances: the paid-time lines now say "días libres":
- Aprobar días libres los descuenta de ese balance; cancelar una aprobación los devuelve.
- Se cancelaron los días libres. El tiempo pagado que usaron volvió al balance.

## Impeccable audit (Spanish, these screens)
- **Hierarchy unchanged:** one main action per column (Preparar {período} / Revisar tarjetas de tiempo). Row buttons stay the tinted pill.
- **Spacing:** no layout or CSS changes. At 200% text the long Spanish words were the only problem, fixed by shorter words, a soft hyphen or allowing a wrap.
- **Accessibility:**
  - axe is clean.
  - Spoken names start with the visible words.
  - The hyphen hint is invisible to screen readers.
  - `html lang` is still "en" (shell).
- **States:** loading, failed, offline, paused, signed out, no access and empty are all in Spanish (unit-tested).

## Shots
`shots/es-owner/<row>-<O|M>-es-<390|390-200|1440>.webp`:
- B1 Home
- B2 Things to do
- F1 Team
- F7 Time off policies and balance
- F5 Pay rate

That's 27 files.

The scan used a scratch copy of the harness with three additions: the `nv-lang` cookie, a 200% text pass and axe. `tools/ui-scan` is unchanged; adding the same options there would be a kit-owner change.

## Follow-ups from the lead (second round)
- **Commits:** merge 0b78510a, then eb750176, then merge c24ef0d4 (shared tip at the time). Shots and report: the final commit.
- **`owner-b/moments-copy.ts` Spanish now uses tú and "tarjeta(s) de tiempo", with feminine agreement.** Examples:
  - "Tu gerente decide. Mantén tus turnos programados…"
  - "Actualiza las tarjetas de tiempo antes de revisar otro grupo."
  - "¿Finalizar la tarjeta de tiempo de {first}?"
  - "{n} tarjetas de tiempo aprobadas"
  - "{done} de {total} localidades publicadas"

  A test checks there's no usted and no "registro de horas" left.
- **`owner-b/b-loading.tsx`:** placeholder titles follow `usePortalLang()`. They use the shell's `navLabel` words, plus a small table for titles that aren't nav labels, e.g. "Tarifa por hora", "Balance de días libres", "Políticas de días libres", "Horas del bono de Navidad".
- **`owner-b/b-route-error.tsx`:** "Try again" → "Intentar de nuevo" in Spanish.
- **One line outside my area, as the lead allowed:** `src/app/app/employees/import/page.tsx` now takes its notice copy from `readPortalLanguage` (English if the read fails) instead of `rosterImportCopy.en`.
- **Re-checked after the merge:**
  - tsc clean; oxlint no errors; src/components 3282/3282.
  - Spanish scan, Owner and Manager, at 390, 390 with 200% text and 1440, now including Import a staff list: 0 axe violations, no sideways scroll, nothing clipped, no two-line buttons.
  - Import a staff list shows "Importar personal" (the not-available notice, since the scan has no routing config).
- **Shots:** refreshed, and F3-import added for Owner and Manager.

Correction to "For the lead" above: the import page item is done.

## Second release (lead, Nov 23, 19:23 UTC)
I merged staff's tip (414f0da0, which includes es-rest's lang-aware lib helpers, 66e8160d), then translated what staff left in English.

- **Code commit:** 8319cb7d. Shots and this section: the commit after it.
- **(1) `notification-inbox.tsx`:** the new `notification-inbox-copy.ts` table holds every word the component draws, for both the Quiet list and the older full inbox, so English and Spanish never mix on one screen. That covers the states, status lines, filters, read and action states, empty cards, footer, the aria names, and the long date and row times ("martes, 24 de noviembre, 9:02 a. m.").
  - Row titles, groups, facts and the "5 h ago" text now get the language from the lib helpers (`notificationTitle`, `groupNotifications`, `notificationPresentation`, `rowFacts`, `relativeTimeFor`).
  - Fixed: the read-failure check compared the English sentence with `startsWith`; it now compares against the table.
  - The fold test's hand-made hook host now returns a context's default for `usePortalLang()`; that one test-harness line is the only change in that test.
- **(2) Quiet Home (`premium-home.tsx`):** Right now, Things to do and the pending card are added to `premium-home-copy.ts`, along with the band sentence and the bar and title. Times and attendance words are in Spanish, and row dates use `mobileActionDetail(detail, lang)`.
- **(3) Business times:**
  - `manager-availability.tsx` (server) reads `readPortalLanguage(proof)`. It passes the language to `formatBusinessDateTime` and the week range, and to the deadline day. Its own words are in a new exported `MANAGER_AVAILABILITY_WORDS` table (Disponibilidad, Fecha límite, Sin fijar, "Semana del 23–29 nov"), so the page doesn't mix languages.
  - `manager-dashboard.tsx` takes a `lang` prop. It uses it for `homeWeek`'s last-published time (`formatBusinessTimestamp`) and the fallback date label. `app/app/page.tsx` passes it with one line, `lang={lang}`, using the page's existing read.
  - `manager-action-center.tsx`: `mobileActionDetail(detail, lang = 'en')` writes "22 nov 2026" in Spanish. The Quiet Home passes it. Two callers outside my area could pass `w.lang` / `lang` in one line each: `manager-inbox.tsx` and `manager-inbox-corp.tsx`.
  - In that file, `formatUpdated`'s "Updated 3:02 PM" is drawn only by `ActionCenterSurface`, which is used only by `ui-preview/home-preview.tsx`. I left it unchanged.
- **Tests:** `es-owner-r2.test.tsx` has 8 tests:
  - key and shape matches for the three tables
  - Spanish renders: the Quiet list with its states, the full inbox, the Quiet Home with its pending state, and the action row date
  - the voice-guide date and time forms
  - English unchanged

  tsc clean, oxlint no errors, src/components plus the availability and Home routes: 3720/3720.
- **Browser:** Spanish profile, Owner and Manager, at 390, 390 with 200% text and 1440, with axe, on Home, Team availability and Notifications. 0 axe violations, no sideways scroll, no two-line buttons. Team availability is fully Spanish and fits at 200%.
- **Not live:** neither `NotificationInbox` nor the Quiet Home is reachable from a live route now.
  - `/app/notifications` gives Employees and Leads the corporate list (`EmployeeNotificationsSnapshotView`) and Owners and Managers `ManagerNotifications`.
  - Every Home passes `corporate`.

  Their Spanish is covered by the render tests, not by captures.
- **For the lead (not my file):** on `/app/notifications` (`notifications-manager-b.tsx`), "Notificaciones" in the band title runs past the right edge at 390 with 200% text, for Owner and Manager. That's shot `B3-notifications-O-es-390-200.webp`. A soft hyphen ("Notifica­ciones") or the band's title wrap would fix it.
