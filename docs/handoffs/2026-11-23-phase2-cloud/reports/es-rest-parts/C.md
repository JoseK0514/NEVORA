# es-rest part C: Schedule parts, Availability, shift requests, coverage, Christmas bonus, swap

Fork C of `claude-codex-collab-nevora-es-rest`, based on 67b29e50d. Each area has one `{en, es}` table beside its
components, a key-set test (`copy-key-paths.test-support.ts`, shared helper) and Spanish render tests. English output is
unchanged (existing tests pass untouched, except the two noted below). Client parts read `usePortalLang()`; the one server
page in this part (`/app/availability`) reads `readPageLang()`.

## Areas

| Area | Table | Files wired | Strings |
|---|---|---|---|
| Schedule parts (components only; `/app/schedule` is screens-final's) | `schedule-copy.ts` | schedule-shift-form, schedule-publication-change, schedule-publication-controls, schedule-generation-controls, schedule-copy-form, schedule-cover-pick, schedule-coverage-line | ~120 |
| Availability | `availability-copy.ts` | availability-signature, availability-corp, availability-team-list, `/app/availability/page.tsx`, `agreement/page.tsx` (title), `agreement/error.tsx` | ~90 |
| Shift requests | `shift-copy.ts` | shift-change-form, shift-change-form-state (`shiftChangeFeedback(result, lang)`), shift-change-history, shift-request-decide, shift-review-recovery (`shiftDraftText(data, lang)`), shift-change-policy-fields, shift-requests-signature (`shiftPlace(shift, zone, lang)`) | ~70 |
| Coverage | `coverage-copy.ts` | coverage-review (`unconfirmedCheck(…, lang)`), coverage-assistant, coverage-minutes/coverage-minutes | ~75 |
| Christmas bonus (component; the route is /app/reports) | `christmas-bonus-copy.ts` | christmas-bonus-report, christmas-bonus-year-menu | ~45 |
| Swap and Can't work | `swap-copy.ts` | swap-page-content, callout-view, swap-shift-summary (`swapDateLabel/swapTimeLabel/swapPositionLabel(…, lang)`) | ~20 |

Made client components so they can read the language (props are plain data or server actions; behaviour unchanged):
schedule-publication-change, schedule-publication-controls, shift-change-history, shift-change-policy-fields,
coverage-review, coverage-assistant, christmas-bonus-report, swap-page-content, callout-view.

Existing tests changed: `src/app/app/schedule-sheet-gaps.test.ts` (a source-text contract now matches
`{name || w.chooseSomeone}` and checks the table's "Choose someone"); `src/components/decline-asks.test.tsx` (its React
stand-in gains `useContext`, so components that read the language render).

## Checks
- `tsc --noEmit -p .`: clean. oxlint on every changed file: clean.
- `run-rstest` over src/components, src/app/app/schedule, exchange, availability, reports: 3,654 passed after the two test
  fixes above (the run before them: 3,651 passed, 3 failed in decline-asks, fixed in 5a8a4dac8).
- No browser captures in this part (the lead's session does the Spanish screen checks).

## Gaps left
- Server text stays English: action results and `state.message` (schedule generation, availability actions), setup issue
  messages and labels from `lib/scheduling/generation/setup`, `schedulingIssueMessage` fallbacks, request history's
  `event`/`mode`/`at`, Find cover's `coverage.notice`, the availability team list's `updatedLabel`, calendar client notices.
- Callers outside this part still pass no language, so they stay English until their owners pass it:
  `/app/exchange/page.tsx` (`shiftPlace`, `shiftChangeFeedback`), employee-mobile (`shiftChangeFeedback`),
  configuration-form and wave-a/action-form (`shiftDraftText`), reviewed-swap-form (`swapDateLabel`, `swapTimeLabel`,
  `swapPositionLabel`, its own "Shift lead"/"Times in" words), the Christmas bonus page's own closed and error notices
  (/app/reports), ActionMenu's own words (shell).
- Kit: `CorpTime`/`timeParts` style "AM"/"PM" only; given "10:00 p. m." it shrinks the "p". Find cover draws the Spanish
  range as plain text instead (coverage-assistant). Proposed for the kit owner: teach `timeParts` "a. m."/"p. m.".
- Skipped, no route reaches them: publish-warning-review-surface (only manager-reviewed-views, itself unused),
  generation-explanation-panel, schedule-location-control, availability-editor, availability-feedback, shift-slot,
  coverage-review-content, exchange-assignment, shift-assignment-fields' components (its helpers are used; no words),
  and calendar-subscription-panel's desktop view (the live panel always draws employee-mobile's view).
- Words to settle with other sessions: "Insights" is "Análisis" here (owner-advisor has no Spanish name yet); "Build and
  publish" is "Crear y publicar"; Shift requests is "Solicitudes de turnos"; the location word follows the glossary
  ("localidad"), while the workspace word preset's Spanish default is "Ubicación".
- Loading files' screen-reader labels (`availability/agreement/loading.tsx`) stay English.

## For Jose to review (pay and legal wording, Christmas bonus hours)
| English | Spanish |
|---|---|
| Informational only. Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying. | Solo informativo. La elegibilidad, las cantidades y las exenciones del bono de Navidad dependen del tamaño del patrono y de la ley de Puerto Rico. Confírmalo con tu proveedor de nómina o tu abogado antes de pagar. |
| Christmas bonus hours | Horas para el bono de Navidad |
| Bonus year | Año del bono |
| Payment window | Período de pago |
| Exemption filing deadline | Fecha límite para radicar la exención |
| Reached / Check breaks / Not confirmed / Not reached / No hire date | Alcanzado / Revisar descansos / Sin confirmar / No alcanzado / Sin fecha de ingreso |
| 812 h of 700 h · Hired May 6, 2019 · Includes 3 h of breaks · 1 day not finalized · Inactive | 812 h de 700 h · Ingresó el 6 may 2019 · Incluye 3 h de descansos · 1 día sin finalizar · Inactivo |
| Hours count finalized timecards only | Las horas cuentan solo tarjetas de tiempo finalizadas |
| 1 person has recorded time on 1 day that isn’t on a finalized timecard yet. | 1 persona tiene tiempo registrado en 1 día que todavía no está en una tarjeta de tiempo finalizada. |
| No hours recorded in NEVORA for this bonus year | No hay horas registradas en NEVORA para este año del bono |
| Hours are recorded time on finalized timecards in this bonus year, breaks included. People hired before Jan 26, 2017 need 700 hours; people hired on or after need 1,350. “Check breaks” means they reach it only if their recorded breaks count as hours worked. Owners aren’t listed. | Las horas son el tiempo registrado en tarjetas de tiempo finalizadas en este año del bono, con los descansos incluidos. Quienes ingresaron antes del 26 ene 2017 necesitan 700 horas; quienes ingresaron ese día o después necesitan 1,350. “Revisar descansos” quiere decir que llegan a la meta solo si sus descansos registrados cuentan como horas trabajadas. Los dueños no aparecen. |
