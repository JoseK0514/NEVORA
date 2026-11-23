# es-rest R2, part C: shared lib sentences in Spanish

Base `836964e4e` (staff integration). Each function takes an optional language (`'en' | 'es'`, English by default), so
English output and every existing caller are unchanged.

## Functions changed

| Module | Function | Spanish |
|---|---|---|
| `src/lib/notification-inbox-view.ts` | `notificationTitle(item, lang)` | The server's labels ("Time off approved" → "Días libres aprobados", 30 labels), the summary row ("Tienes pendientes esperando"), "Semana del 30 nov–6 dic", Spanish date ranges (`dateRange` with `es-PR`) |
| same | `notificationPresentation(label, eventType, lang)` | Each row's destination and action ("Revisa tu solicitud de días libres" / "Ver solicitud") |
| same | `groupNotifications(items, zone, lang)` | Day headings ("lunes, 7 de diciembre de 2026") |
| `src/lib/notification-facts.ts` | `notificationOutcomeNote(item, lang)`, `notificationCountNote(item, lang)` | "Ahora cancelada", "3 turnos", "No tienes turnos", "5 en espera" |
| `src/lib/time-zone-label.ts` | `timeZoneLabel(zone, lang)` | "Hora de Puerto Rico" |
| `src/lib/business-time.ts` | `formatBusinessDateTime(iso, zone, lang)`, `formatBusinessTimestamp(...)` | "7 dic, 6:05 p. m." |
| `src/lib/clocker/photo-client/review.ts` | `photoReviewStateLabel(state, lang)`, `PHOTO_STATE_LABELS` | Same words as Photo review's own table |
| `src/lib/action-center/present.ts` | `attendanceWords(lang)`, `ATTENDANCE_WORDS_ES` | "Sin marcar entrada", "Marcó entrada tarde", "Sin marcar" |

Table: `src/lib/notification-text-copy.ts` (`{en, es}`). Test: `src/lib/lib-es-sentences.test.ts`: key match for every table, a
Spanish result for every function, and English results as before.

Not changed:
- `durationRow` and the other duration helpers: "1 h 30 min" is the same in Spanish (voice guide, "Dates, times and numbers").
- `sinceLabel` lives in `components/manager-attendance-review.tsx` (timecards-final's area), not in a library.
- `src/lib/reports`: part B of this release has it.

## Callers wired (es-rest area)

- `notifications-manager-b.tsx`: row icons, the folded row's title. `notification-inbox.tsx`: `rowText`, `rowFacts`
  (the Owner and Manager list now shows Spanish titles, dates, outcome and count).
- `whos-working-corp.tsx`: the "Not clocked in" card's label and list name.
- `time-correction-context.tsx`, `delegated-time-correction-form.tsx` (also its punch times), `shift-requests-signature.tsx`,
  `reviewed-swap-form.tsx` and `manager-profile/manager-profile.tsx`: time zone names.
- `reviewed-swap-form.tsx`: the swap time with the overnight next day (in Spanish times and day name) and its
  screen-reader label now come from `swapTimeLabel(shift, lang)`, which already had the Spanish form.

## Callers left for other sessions (they can pass `lang`)

- `notificationTitle`, `notificationOutcomeNote`, `notificationCountNote`: `employee-mobile/notifications-list.tsx`,
  `employee-mobile/copy/notifications-list.ts` (es-mobile). `notificationPresentation`: `notification-inbox-signature.tsx`
  (no route renders it).
- `timeZoneLabel`: `employee-profile-details`, `employee-b/account-b-client`, `restrictions/restrictions-screen`,
  `manager-time-corrections`, `employee-account-panel`, `timecards`, `communication-copy`, `employee-time-panel`,
  `employee-mobile/*` (availability, profile, hours copies), `owner-advisor/coverage-copy`.
- `ATTENDANCE_WORDS`: `manager-weekly-roster`, `owner-b/owner-b-copy`, `owner-b/home-b`.
- `formatBusinessDateTime`/`formatBusinessTimestamp`: `manager-availability`, `manager-action-center`, `manager-dashboard`.
  In es-rest, `company-policy-copy.ts`, `management-close-copy.ts` and `availability-copy.ts` already write the same Spanish
  form with their own helpers; they can switch to the library's `lang` later with no visible change.
- `swapTimeLabel` without `lang`: `swap-shift-summary` (its parts render nowhere today), `wave-a/swap-sent` (unused).

## For Jose to review

- "Pay statement available" → "Comprobante de pago disponible"; "Statements need preparation" → "Hay comprobantes por preparar";
  "Pay statement update" → "Cambio en el comprobante de pago"; "Payroll preparation update" → "Cambio en la preparación de nómina".
- "Review the current payroll period" / "Review payroll" → "Revisa el período de nómina actual" / "Revisar nómina".
- "Open your current pay statement" / "View statement" → "Abre tu comprobante de pago actual" / "Ver comprobante".
- Photo states (privacy): "Photo exception recorded" → "Excepción de foto registrada"; "Photo removed" → "Foto eliminada";
  "Photo expired" → "Foto vencida".
