# es-rest part E: the long tail

Areas: management, wave-a, wave(-b), operational, reviewed, delegated, edit, whos, assisted, period, configured, signature,
messages, features, action, first, rules, app, correction, quiet, policy, module, configuration, blocked, update, theme,
position, print; routes /app/restricted, /app/clocker-recovery, /app/account-recovery, /app/@sheet. Every component reads
`usePortalLang()`; server pages read `readPageLang()`. English output is unchanged (the existing tests pass as before).

## Files and tables

| Area | Files changed | Table | Strings |
|---|---|---|---|
| management | management-close-form.tsx | management-close-copy.ts | 34 |
| period | period-close-history.tsx | period-close-history-copy.ts | 24 |
| wave-b | wave-b-forms.tsx | wave-b-forms-copy.ts | 19 (incl. 9 server-message rewrites) |
| operational | operational-rule-fields.tsx | operational-rule-fields-copy.ts | 34 |
| reviewed | reviewed-callout-form.tsx, reviewed-swap-form.tsx | reviewed-forms-copy.ts | 36 |
| delegated | delegated-time-correction-form.tsx | delegated-time-correction-copy.ts | 35 |
| edit, new | edit-location-form.tsx, new-location-form.tsx | location-forms-copy.ts | 44 |
| whos | whos-working-corp.tsx | whos-working-copy.ts | 26 |
| assisted | assisted-recovery.tsx (lang now defaults to the person's) | assisted-recovery-copy.ts | 23 |
| configured | configured-attendance-policies.tsx | configured-attendance-policies-copy.ts | 24 |
| messages | messages-manager-b.tsx | messages-manager-copy.ts | 12 |
| features | features-editor.tsx | features-editor-copy.ts | 22 |
| action | action-center-navigation.ts (optional `lang` argument) | inline COPY, exported | 16 |
| first | first-week-setup.tsx (lang now defaults to the person's; it already had Spanish) | — | 0 new |
| rules | rules-hours-list.tsx | rules-hours-list-copy.ts | 10 |
| app, wave-a | app-error-screen.tsx, wave-a/route-error.tsx, wave-a/action-form.tsx, wave-a/offline-notice.tsx | error-screens-copy.ts, wave-a/wave-a-copy.ts | 15 |
| correction | correction-time-ticket.tsx | correction-time-ticket-copy.ts | 7 |
| small parts | quiet/quiet-sheet.tsx, policy-save-form.tsx, configuration-form.tsx, module-off.tsx (+ `lang` from current.server.tsx moduleGate), blocked-open-shifts.tsx, position-quota-fields.tsx, update-visual.tsx, theme-switch.tsx, print-schedule-button.tsx, signature/sig-overlays.tsx | small-parts-copy.ts | 38 |
| routes | restricted/page.tsx, clocker-recovery/page.tsx, account-recovery/page.tsx (generateMetadata), @sheet/(.)exchange/layout.tsx | app/app/route-pages-copy.ts | 9 |

Tests: `src/components/es-rest-e-copy.test.tsx` (every table's en/es key paths match; Spanish renders of Who's working,
the hours list, Updates, a turned-off feature, the error screens, the correction ticket, the period history, the
attendance comparison, the operational rules, Features, Add location, the quota fields, blocked open shifts and the theme
switch; English outside the provider). `configuration-form.test.tsx` and `period-close-history-lifetime.test.tsx` call the
components as plain functions with a mocked `react`, so they now mock `usePortalLang` to English (no assertion changed).

## Gaps left
- Server action messages stay English (as briefed): the scheduling actions behind wave-b-forms (a message not in the
  rewrite list passes through), the location save messages (edit/new location forms show the server's text), the
  operational rules and policy actions, `body.message` from /api/workspace-presentation (features), AccountRecovery's own
  sentences.
- Callers outside part E still render English where the part needs a `lang` argument or prop: `actionCenterNavigation`
  (owner-b/home-b.tsx, manager-inbox.tsx, manager-action-center.tsx), `BlockedOpenShifts` (employee-my-schedule.tsx,
  employee-schedule-corp.tsx), `PositionQuotaFields` (/app/schedule/settings/page.tsx), `updateDay`/`acknowledgedLine`
  (communication-*.tsx). Each takes `lang` now; the owning rows can pass it.
- Strings that come from shared libraries stay English: `sinceLabel` ("yesterday") in manager-attendance-review,
  `ATTENDANCE_WORDS`, `swapTimeLabel`'s overnight weekday, `blockerText` when the server sends it, `formatBusinessDateTime`
  dates in the close and correction forms, `durationRow`.
- Not changed: quiet/quiet.tsx relative times and wave-a/parts.tsx "Optional" (shared by server and client components,
  no language there yet); loading.tsx skeleton labels (an async read would delay the placeholder); recovery-request/
  recovery-reset (public sign-in pages with their own Spanish); sidebar-rail-tooltip, skeleton, celebration, onboarding,
  clean/top-bar-slot, unconfirmed-action-form (no user copy).
- Location word defaults: Spanish uses "Localidad" when no company words are passed; the Settings pages pass English words
  today (lead's area), so the Spanish forms show the English company word until those pages pass `words.es`.
- No browser capture in this part (the lead runs the Spanish passes at 390 and 1440).

## For Jose to review (pay, payroll, overtime, privacy)
- "Start a payroll correction before changing time in this approved payroll period." → "Empieza una corrección de nómina antes de cambiar el tiempo en este periodo de nómina aprobado."
- "Reopen the finalized timecard through the existing review process first." → "Primero reabre la tarjeta de tiempo finalizada con el proceso de revisión existente."
- "Manager reported. Provider import and payroll processing remain unverified." → "Lo informó el gerente. La importación del proveedor y el proceso de nómina siguen sin verificar."
- "Server artifact response recorded. Browser file completion is unverified." → "Se registró la respuesta del servidor con el archivo. No se verificó que el navegador completara la descarga."
- "Full period history" → "Historial completo del periodo"; "Period artifact and handoff history" → "Historial de archivos y entregas del periodo"; "Artifact fingerprint" → "Huella del archivo".
- Operational rules disclaimer (approved legal wording): "Scheduled projections are not worked time, proof of breaks taken, final overtime pay or legal certification. Review applicability explicitly; no values are inferred from the employee’s role." → "Las proyecciones del horario no son tiempo trabajado, prueba de descansos tomados, pago final de horas extra ni certificación legal. Revisa explícitamente si aplican; ningún valor se deduce del rol del empleado."
- "Break payment" → "Pago del descanso"; "Paid" → "Pagado"; "Unpaid" → "No pagado"; "Projected overtime routing" → "Manejo de horas extra proyectadas"; "Weekly threshold (minutes)" → "Límite semanal (minutos)".
- Attendance comparison: "Factual comparisons use configured thresholds and saved source revisions. They do not establish absence, disciplinary outcomes, overtime pay, or processed payroll." → "Las comparaciones usan los límites configurados y las revisiones guardadas de los registros. No establecen ausencias, medidas disciplinarias, pago de horas extra ni nómina procesada."; "Actual-time overtime risk" → "Riesgo de horas extra según el tiempo real".
- Features: "Pay statements" → "Comprobantes de pago"; "Available when payroll is on." → "Disponible cuando la nómina está activa."
- Help someone sign in (identity, privacy): "Check against details you already have, not a new email or phone number they give you. You don’t need documents, codes or other personal details." → "Compara con datos que ya tienes, no con un correo electrónico o teléfono nuevo que te den. No necesitas documentos, códigos ni otros datos personales."; "I independently confirmed this employee’s identity and can hand over this link securely." → "Confirmé por mi cuenta la identidad de este empleado y puedo entregarle este enlace de forma segura." The method values the server records stay English; only their labels are Spanish.
