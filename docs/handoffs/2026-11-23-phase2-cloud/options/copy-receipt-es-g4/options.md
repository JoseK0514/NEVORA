# Decision for Jose: Spanish for the Copy receipt (C8, G4)

The Copy receipt (after "Copy last week" or "Apply" on a template) has no Spanish. The signed-in app renders English
today; a stored language per person is still an open decision. Other screens keep their Spanish beside the English
(`workCopy()` on Employee screens), so a screen is ready when that decision lands.

## Options
- **A, English only (today).**
- **B, Spanish added.** Every string on the receipt and its two error states gets a Puerto Rico Spanish entry, written
  to `docs/design/voice.md`: tú, sentence case, the glossary ("Turno disponible", "Días libres", "Horario"), the app's
  existing "localidad" for location, and Spanish dates and times ("lun", "7–13 dic", "6:00 a. m. – 2:00 p. m."). The
  English is unchanged, and the existing copy-receipt tests pass.

Shots in `img/`, Owner, production build on fictional data, at 390, 390 with 200% text and 1440:
- `c8-all-…`: Copy last week into Dec 7–13; every copied shift has a warning ("All with warnings").
- `c8-some-…`: Copy last week into Nov 30–Dec 6, which already has shifts; 4 copied, 3 with warnings, 54 not copied
  ("With warnings 3", "Not copied 54").
- `…-A-en-…` is today; `…-B-es-…` is the same receipt in Spanish.

Axe finds 0 violations in all eight 390 and 1440 captures, and nothing is clipped or overlapping at 200% text in either
language. Spanish runs longer, and the rows still fit. To render these, B was switched on with `?lang=es` in a local
branch. The menu, search and other app-shell words stay English, because they wait on the same open language decision.

## Strings, English → Spanish
| Where | English | Spanish (PR) |
|---|---|---|
| summary count | 1 shift · 54 shifts | 1 turno · 54 turnos |
| not confirmed, title line | Some shifts may already be copied into Dec 7–13 | Puede que algunos turnos ya se hayan copiado en 7–13 dic |
| `weekCopied` | Week copied | Semana copiada |
| `templateApplied` | Template applied | Plantilla aplicada |
| `nothingCopied` | Nothing copied | No se copió nada |
| `reviewSchedule` | Review schedule | Revisar horario |
| `withWarnings` | With warnings | Con advertencias |
| `allWithWarnings` | All with warnings | Todos con advertencias |
| `notCopied` | Not copied | No copiados |
| `schedule` | Schedule | Horario |
| `result` | Result | Resultado |
| `openShift` | Open shift | Turno disponible |
| `shift` | Shift | Turno |
| `allDay` | All day | Todo el día |
| `templateNoShifts` | The template has no shifts | La plantilla no tiene turnos |
| `previousWeekNoShifts` | The previous week has no shifts | La semana anterior no tiene turnos |
| `templateChanged` | The template changed while copying | La plantilla cambió mientras se copiaba |
| `previousWeekChanged` | The previous week changed while copying | La semana anterior cambió mientras se copiaba |
| `didntPass` | Didn’t pass the schedule checks | No pasó las revisiones del horario |
| `notConfirmedTitle` | Copy not confirmed | Copia sin confirmar |
| `dontStartNew` | Don’t start a new copy. | No empieces otra copia. |
| `retryNeverTwice` | Retrying never adds a shift twice. | Al reintentar, nunca se añade un turno dos veces. |
| `retryThisCopy` | Retry this copy | Reintentar esta copia |
| `notFoundTitle` | Copy not found | No encontramos la copia |
| `incompleteLink` | This link is incomplete. | Este enlace está incompleto. |
| `AVAILABILITY_NOT_SUBMITTED` | Availability not confirmed | Disponibilidad sin confirmar |
| `TARGET_HOURS_EXCEEDED` | Goes over their weekly target | Pasa de su meta semanal |
| `PREFERENCE_NOT_MET` | Outside their preferred hours | Fuera de su horario preferido |
| `MULTIPLE_SHIFTS_SAME_DAY` | Already has a shift that day | Ya tiene un turno ese día |
| `PROJECTED_OVERTIME_REVIEW` | May go into overtime | Podría generar horas extra |
| `RULE_UNVERIFIABLE` | A scheduling rule couldn’t be checked | No pudimos verificar una regla del horario |
| `TEMPLATE_UNAVAILABLE` | The template isn’t available anymore | La plantilla ya no está disponible |
| `EMPLOYEE_UNAVAILABLE` | Open shifts aren’t copied | Los turnos disponibles no se copian |
| `ASSIGNMENT_UNAVAILABLE` | The person or location isn’t available anymore | La persona o la localidad ya no está disponible |
| `INVALID_LOCAL_TIME` | The time doesn’t exist that day (clock change) | Esa hora no existe ese día (cambio de hora) |
| `SHIFT_OVERLAP` | Overlaps another shift | Se solapa con otro turno |
| `APPROVED_TIME_OFF` | Approved time off | Días libres aprobados |
| `OUTSIDE_AVAILABILITY` | Outside their availability | Fuera de su disponibilidad |
| `WEEKLY_AVAILABILITY_CONFLICT` | Conflicts with an availability change | Choca con un cambio de disponibilidad |
| `AGREED_RESTRICTION` | Conflicts with an agreed restriction | Choca con una restricción acordada |
| `MAX_WEEKLY_HOURS` | Over their weekly hours limit | Pasa de su límite de horas semanales |
| `MAX_DAILY_HOURS` | Over the daily hours limit | Pasa del límite de horas por día |
| `MAX_SHIFT_HOURS` | Longer than the shift length limit | Pasa del límite de duración del turno |
| `MIN_REST` | Not enough rest between shifts | No tiene descanso suficiente entre turnos |
| `BREAK_REQUIREMENT` | Missing a required break | Le falta un descanso requerido |
| `EMPLOYEE_INACTIVE` | The person isn’t active | La persona no está activa |
| `LOCATION_INACTIVE` | The location isn’t active | La localidad no está activa |
| `LOCATION_NOT_ELIGIBLE` | Not set up for this location | No está configurado para esta localidad |
| `POSITION_INELIGIBLE` | Not qualified for the position | No cumple los requisitos del puesto |
| `POSITION_INACTIVE` | The position isn’t active | El puesto no está activo |
| `ROLE_INELIGIBLE` | Their role can’t take this shift | Su rol no puede tomar este turno |
| `LEAD_REQUIREMENT` | Needs a qualified lead | Necesita un líder que cumpla los requisitos |
The table holds every string the receipt and its two error states can show: the band title, the summary, the button,
both list headings, each warning and each reason a shift isn't copied, and the "not confirmed" and "not found" states.
Time, date and weekday words follow the voice guide's "Dates, times and numbers" table.

## Recommendation: B
Add the Spanish now, beside the English, as the Employee screens already do. It costs nothing in English, and C8 is
ready when the language decision is made. The two words to confirm are "Con advertencias" (warnings) and "No
copiados" (not copied). The code isn't merged; it is one string file (`src/components/copy-receipt-copy.ts`) plus the
view reading from it, ready if you choose B.
