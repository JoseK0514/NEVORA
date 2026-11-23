# Signed-in Spanish: integration on `claude-codex-collab-nevora-staff`, Nov 23, 2026

All the Spanish branches are combined here, for the second release. The lead merges this branch after the first
release. Nothing went to `claude-codex-collab-nevora`.

Rules followed: README "Signed-in Spanish". English is unchanged, Spanish uses tú (Puerto Rico Spanish), each area has
one `{en, es}` copy table with a key test, the server reads `readPageLang()` and the client calls `usePortalLang()`.
All data is fictional, and nothing was sent or published.

## What is merged

| Source | Taken | How |
|---|---|---|
| es-payroll 27b7b5c7, es-mobile 9e327da0, es-owner ff08df11, es-rest 6f470726 (without bdc9ea84's reports files), es-rondo 0fd0e537 | code | first merges (d2485a35) |
| shared branch `claude-codex-collab-nevora` 32732335 (includes 505d2b1e and 1e06ede4) | all | 73d941d2 |
| es-rest 00f7ac71 (b03450da, cc60de9b, the shared-tip merge, report b401bc95) | all | 2f3a42ff |
| es-employee 3d56fb1f (c72a2b5b … e6e613fd, f198f7f2, 06606316 whole, report 0ee44941) | all | 5e873760 |
| es-owner 53e70934 (eb750176, report) | all | 060ef054 |
| screens-final 23474a05 (b32b3193 356cf38c d16ecfb9 b21c6601, report) | all | dfbbe518 |
| payroll-2 d9282e71 (`<html lang>` only; the rest of that branch is payroll work) | cherry-pick | a7fff9e8 |
| timecards-final 093f5ca0 (8347506a plus its shared-tip merge) | all | e09b9b06 |
| release candidate `claude-codex-collab-nevora` 91c08d19 (Insights `.c-ins__range` contrast 95bad13a, the English Close open punch card, the guide rebuild) | all; the guide PDFs and manifest are the candidate's; Close open punch keeps the Spanish wiring on the same card layout | 164bd39b |
| es-employee second release 84e8109b (198cea83 time corrections queue and Time on the lang-aware helpers, bb17dd9e Home and Updates on the shared helpers, 04d3cae5 the queue's zone in Spanish, report) | all, no conflicts | 5eb14ec9 |
| screens-final second pass bfdd3d80 (215fe886, 2479d906 with bcd72494, d96e6831; merges 746074e3, a2617040; report) | fast-forward (it had merged staff) | bfdd3d80 |
| es-rest second release eced81af (95d99a10, 2a196e30, 2acc7c31, 66e8160d, 772f7ae8, report) | all, no conflicts; `reports.tsx` keeps es-rondo's version plus the `reportText()` wrapping | 71d394d3 |

### How the conflicts were settled

- **Insights and Christmas bonus:** es-rondo's files win: `reports.tsx`, `christmas-bonus-report`,
  `christmas-bonus-copy.ts` and the year menu. es-rest's `christmas-bonus-copy.test.tsx` checked es-rest's own copy, so
  it is dropped. "Informes" stays.
- **Team directory:** es-employee's `employee-team-copy` and `employee-directory.tsx` are taken. The location Manager's
  Team (`scoped-team.tsx`) takes screens-final's `access-copy`. My own `team-list-copy.ts` duplicated both, so it is
  removed.
- **Closed and unavailable notices, the scoped person page, Refresh:** screens-final's `access-copy` versions are taken.
  On top of them, the read frame keeps the shared branch's 505d2b1e (a lapsed page stays in place under the state
  screen), the scoped person page reads its own language, and the band trims the plural "no disponibles" too.
- **Scheduling rules** (`/app/schedule/settings`): screens-final's fully translated page is taken.
- **Exchange:** screens-final's page copy is taken; `shiftPlace` and `shiftChangeFeedback` get `lang`. The tab titles
  keep `generateMetadata` (route-titles.ts), so they follow the person; screens-final's static English titles are not
  used.
- **Employee parts** (`employee-b/parts.tsx`): es-employee's `wallTime`, `BDay` and `Dotted` with `lang` are taken. The
  weekday drops the "." that es-PR writes ("sáb", not "sáb.").
- **Close open punch:** timecards-final's Spanish kit card is taken over the older Spanish form already on staff. When
  the English kit card reaches the shared branch, keep this file's Spanish wiring on top of that layout.
- **Imports:** after each merge I checked every file in `src` for an import name brought in twice (the problem
  e6e613fd fixed). None remain, and the merges left three unused `readPortalLanguage` imports, which are removed.

## Cross-area gaps closed on this branch

| Commit | Gap |
|---|---|
| 09191803 | Things to do (manager-inbox-corp): new `manager-inbox-copy.ts` (group and card titles, status lines, pay-period and timecard lines, empty and error states, More card); `UnsupportedNativeRole` and Home's `actionCenterNavigation` get `lang`; repair title and line (`time-off-staffing/present`) in Spanish |
| e2ff1294 | `shiftPlace`/`shiftChangeFeedback` callers (exchange, phone requests and creation), `CorrectionComparison` (phone, delegated form), `PositionQuotaFields`; kit `CorpTime`/`timeParts` write "a. m./p. m." with `lang="es"` (the roster passes it) |
| c7ff2810 | Owner and Manager Home date label and greeting in the person's language; the corporate Home status sentence; preset Spanish "Localidad/Localidades" |
| daa9718d | Spoken "Loading…" and the slow-loading card; the access notices' callers pass `lang` (superseded in part by screens-final's copy) |
| 04b18b77 | Owner advisor attention titles and the server's known sentences in Spanish; the period review's issue lines use tú and "localidades"; 16 route tab titles from `route-titles.ts` |
| f9e1db81 | `presentItem` writes its own words in Spanish (request kinds, "enviada el …", planning titles, coverage titles, correction kinds) |
| 88531f9a | `Dotted` gets `lang` in own-leave-note and manager-profile-live; Messages uses `messageTime(…, lang)` instead of rewriting English |
| 54b3e394 | One spelling: "período" (224 uses) replaces the 30 "periodo" |
| 4d261595 | More: `availabilitySummary` never got the language (`.then(availabilitySummary)`), so the summary read "6 days a week" in Spanish |
| (this commit) | `review-details/copy.ts` uses tú ("Tu tarjeta de tiempo", "Inténtalo", "Abre la solicitud"); Things to do follows the glossary ("Turnos disponibles", "No puedo trabajar", "Solicitud de cobertura") |
| 6a873b26 | Phone Profile: the hint "Sign-in pages only. The rest of NEVORA is in English for now." is no longer true and is removed, as es-employee removed it elsewhere |

## Still English or open

Closed since: Insights' report definitions, server action messages for Settings and Team, shared lib sentences,
`clocker-owner-copy` and reminders (tú, localidad) (es-rest's second release); the manager's time corrections queue and the Employee Time screen on the language-aware helpers
(es-employee's second release); the week grid, the shift form, Find cover, Review replacement and ManagerShiftRequests
(screens-final's second pass); `review-details/copy.ts` now uses tú (integration, this branch).

The lead assigned these: Schedule tools to screens-final; `lib/reports`, server messages, `clocker-owner-copy` and
reminders to es-rest; time corrections and the time-b helpers to es-employee; `components/manager` to timecards-final.
They are integrated here as each lands. Jose's word decisions below wait for his answer.


- **TeamB's band, QuietPage's `lang` prop, "What changed in your schedule", the Time, Profile and Availability page
  titles** (employee-mobile): from the session reports, not yet checked here.
- **Lib callers wired on staff after es-rest R2** (R2-C.md's list): time zone names in Team profile details, the
  account panel, B Profile, restrictions and Company profile; Timecards' "Times in" line (its Spanish said "Horas de
  Puerto Rico time"; now "Hora de Puerto Rico."). Left English on purpose: `notification-inbox.tsx`'s own component (its
  states and status lines are English, so only its titles would be Spanish), and the older Quiet Home's needs-you list.
  The copy tables (communication, reports, coverage, messages compose, hours) already pass their own Spanish zone.
  `formatBusinessDateTime` in `manager-availability`, `manager-dashboard` and `manager-action-center` is still English
  (those are server parts or the preview-only surface).
- **The old ManagerActionCenter surface** stays English; it renders only on `/ui-preview`.

## Words for Jose to settle (seen across sessions)

- "Fecha de terminación" (3, es-rest part B) or "fecha de baja" (1, screens-final) for the termination date.
- "Informes" for Insights (es-rest, es-rondo); the shell nav should say the same.
- "empresa" (122 uses) or "compañía" (14, mostly in access and Home lines) for "company". The glossary in
  `docs/design/voice.md` already says **Empresa**, so the 14 "compañía" lines are the ones off the glossary.
- "Owner" in Spanish sentences: es-rest's second release writes "dueño"; other screens keep "Owner" or "Dueño" as the
  role name (the glossary lists Owner → Dueño). One form for Jose to confirm.
- "Novedades" became "Avisos" (es-rest), as the glossary's word for an update.
- Insights' "D2" definition ("Actual time uses D2 canonical effective entries…") is internal wording; Jose to decide how
  it reads in both languages.
- Cover request: "Solicitud de cobertura" (review-details, Things to do) or "Solicitud de reemplazo" (screens-final
  sentences; the 390 chip says "Reemplazo").
- Can't work, approved or declined: "Ausencia aprobada/rechazada" (review-details) or the glossary's "No puedo trabajar".
  Things to do's group title and the request kind now say "No puedo trabajar", as the glossary does.
- "Dueño/Gerente" (capitalised as roles) or "dueños/gerentes" in running text: both are used in role sentences.

## Browser pass (Spanish profile, fictional data)

The scan harness runs the merged tree in `next dev` (Turbopack) with a signed-in Spanish session (the `nv-lang=es` cookie
after sign-in). Each page is checked at 390, 390 with 200% text, 1440 and 1440 with 200% text. Each check records axe
(WCAG 2 A/AA), horizontal overflow, `<html lang>`, and an English-leak probe that lists English sentences in a Spanish
page, including screen-reader-only text.

| Run | Pages | Result |
|---|---|---|
| Owner, Spanish (first pass) | Home, Things to do, Later and done, Schedule, Team, Timecards, Requests, More, Insights, Settings, Availability, Shift requests, Scheduling rules, Updates (14) | `lang="es"` on every page; no overflow; axe 0 except Insights at 1440 (below). English found in the roster's live words and caption, the quota hint, the missing-deadline item, Insights' definitions and the manager shift requests. Home's band labels ran into each other at 390. |
| Employee, Spanish (first pass) | Home, Schedule, Time, Requests hub, Requests, Updates, an update, Availability, Shift requests, Profile, Pay, More (12) | `lang="es"`, axe 0, no overflow, no page errors on any route (es-employee's Turbopack fixes hold after the merges). English found in the claim refusal reasons and Pay's scope line. Home's hours line was cut to "trabajadas esta sem…" at 390. The update text is the manager's own fictional message. |
| Recheck after the fixes (4bee7a8d, 5162a36f, 745e7d75) | Owner Home, Schedule, Scheduling rules, Later and done; Employee Home, Shift requests, Requests, Pay | `lang="es"`, axe 0, no overflow, no English found. Band labels and the hours line wrap. |
| Owner, English profile | Home, Things to do, Schedule, Team | `lang="en"`, axe 0, no overflow; the English is unchanged. |

Keyboard at 1440: the first stop is the skip link ("Ir al contenido" / "Skip to content"), then the sidebar. The probe
finds no outline on the sidebar links in both languages; they likely show focus with a background, which this probe
doesn't read. That is unchanged by this work, not confirmed either way.

Still open from the pass:
- Insights at 1440: axe `color-contrast` on `.c-ins__range` (the date line on the band). Fixed on the release
  candidate (95bad13a), merged in 164bd39b.
- Insights' "Report definitions" (screen-reader and disclosure text) are server sentences from `lib/reports/project.ts`.
- Shift requests (Owner): ManagerShiftRequests' "Approving gives this shift to the person who picked it up." and
  "Show the shift" (screens-final's open list).

Screens: `/tmp/es-owner`, `/tmp/es-emp`, `/tmp/es-owner2`, `/tmp/es-emp2`, `/tmp/es-emp3`, `/tmp/en-owner` on the session
machine. They are not committed, because they're working evidence and the session reports already hold the shots.

## Checks

- `tsc --noEmit`: clean.
- `oxlint src`: 0 errors; 1 warning that was already there (`<img>` in `premium/clocker.tsx`).
- After merging the release candidate (164bd39b): tsc clean; whole `src` suite 16,427 passed, 2 failed. One was
  `target-size-44-desk.test.ts`, a source-text check for the English "Select all eligible timecards" literal, which now
  names the copy key (the English is unchanged in `timecards-copy.ts`); it is fixed. The other is
  `manual-publication.test.ts`, which fails by design on staff until the Spanish release gets its own guide rebuild
  (lead, Nov 23). `management-close-card.test.ts` reads the card's words from `management-close-copy.ts`.
- Before that merge: whole `src` suite 16,411 passed. Four tests failed. Three were my
  expectations written before the merges (screens-final's Spanish wording "toda la empresa", and the role label mocked to
  the raw role); they are fixed and pass (35 of 35 in those files). The fourth, `src/test/manual-publication.test.ts`
  ("Stale or foreign application content hash"), was already failing before this work (G44, another session) and is
  not touched here.
- Duplicate imports: none in `src` (checked after every merge).

## For Jose to review (every session's list, collected)

### integration (this branch): new Spanish lines for Jose

- Things to do (`manager-inbox-copy.ts`): "Período de pago terminado / abierto / aún abierto", "Puedes aprobarlas desde
  el {día}.", "{n} de {total} tarjetas de tiempo", "Tarjetas de tiempo por aprobar".
- Claim refusal reasons (`eligibility-reasons.ts`): "Pasaría tu límite de horas semanales", "Pasaría el límite de horas
  diarias", "Tu gerente tiene que confirmar algunas reglas", "No cumple las reglas actuales de este turno".
- Owner advisor (`format.ts`): "Mayor falta de personal: {n}.", "Incluye compromisos en borrador; verifica aparte el
  personal publicado."
- Access notice (`access-copy`, screens-final's wording kept): "Necesitas acceso a toda la empresa".

### es-rest: Decisions for Jose and the lead

From `reports/es-rest.md`.


1. **"Insights" in Spanish.** Reports says **Informes**; fork C's Christmas bonus used "Análisis" and was changed to
   Informes. The shell nav and es-rondo (owner-advisor) should use the same word.
2. **"Location" in Spanish.** The default word preset (`src/lib/workspace-presentation/words.ts`, unowned) says
   "Ubicación/Ubicaciones"; the glossary says "localidad". Settings follows the company's preset, so Locations reads
   "Ubicaciones" today. Changing the preset's default Spanish to Localidad/Localidades fixes every page at once.
3. **Server action messages stay English** (Settings actions, breaks, clocker, photos, matching, employees, requests,
   scheduling, policies). They need the language read inside each action; that is a small server change per action file.
4. **Loading labels** (`RouteSkeleton`) stay English: the shell owns b-loading, and a loading screen shouldn't wait on a read.
5. **Callers in other rows' areas** must pass `lang` to parts that now take it: `UnsupportedNativeRole` (app layout),
   `CorrectionComparison`/`PriorCorrectionDecisions`, `TeamOverviewCorp` (manager-dashboard), `actionCenterNavigation`
   (home-b, manager-inbox), `BlockedOpenShifts`, `PositionQuotaFields` (/app/schedule/settings), `shiftPlace` and
   `shiftChangeFeedback` (/app/exchange, employee-mobile), `shiftDraftText`, the swap label helpers.
6. **Kit:** `CorpTime`/`timeParts` only know "AM"/"PM" and shrink the "p" in "10:00 p. m."; the kit owner should
   teach it "a. m."/"p. m." (fork C draws Find cover's Spanish range as plain text meanwhile).
7. **Shared libraries** still produce English inside Spanish pages: `lib/reports` sentences, notification titles and facts,
   `time-zone-label`, `sinceLabel`, `ATTENDANCE_WORDS`, `formatBusinessDateTime`, `durationRow`, photo state labels in
   `lib/clocker/photo-client/review.ts` (Photo review now uses its own table).

### es-rest: For Jose to review

From `reports/es-rest.md`.


Every Spanish line about pay, payroll, billing, tax, privacy or account security is listed English → Spanish in:
- `es-rest-parts/A.md` (Insights, Christmas bonus hours, Home summary)
- `es-rest-parts/B.md` (notifications, Team person page, profile, account, passkeys)
- `es-rest-parts/C.md` (Christmas bonus report, including the disclaimer)
- `es-rest-parts/D.md` (payday, payroll titles, Help's privacy lines, security notices)
- `es-rest-parts/E.md` (payroll corrections, operational rules disclaimer, attendance comparison, help-someone-sign-in)

From this session's own slice:

| English | Spanish |
|---|---|
| Payroll settings | Configuración de nómina |
| Payroll settings need payroll setup access | La configuración de nómina requiere acceso de configuración de nómina |
| Ask an Owner with payroll access if something here needs to change. | Pide ayuda a un dueño con acceso a nómina si algo aquí necesita cambiar. |
| Plan and billing | Plan y facturación |
| Weekly / Every two weeks / Twice a month / Monthly | Semanal / Cada dos semanas / Dos veces al mes / Mensual |
| Your part is timecards. {who} runs payroll after you approve them. | Lo tuyo son las tarjetas de tiempo. {who} corre la nómina cuando las apruebas. |
| {who} can give you payroll access. / Owners can give you payroll access. | {who} puede darte acceso a nómina. / Los dueños pueden darte acceso a nómina. |
| Labor settings · Owner only | Configuración laboral · Solo el dueño |
| Pay rates, budgets and pay rules saved with these policies. Changing an alert keeps them as they are. | Tarifas de pago, presupuestos y reglas de pago guardados con estas políticas. Cambiar una alerta no los cambia. |
| Compensation reference / Employee rates / Labor budgets / Calculation method reference | Referencia de compensación / Tarifas de empleados / Presupuestos de personal / Referencia del método de cálculo |
| per hour / per shift / per salary period | por hora / por turno / por período de salario |
| Alerts only flag times for you to check, from each rule’s start date. They never change pay. | Las alertas solo marcan horas para que las revises, desde la fecha de inicio de cada regla. Nunca cambian el pago. |
| Actual-time overtime risk / Close to overtime | Riesgo de horas extra según el tiempo real / Cerca de horas extra |
| Private company photos. Removing a photo preserves its time record. | Fotos privadas de la empresa. Eliminar una foto conserva su registro de tiempo. |
| Images open privately on request and clear when you close the record or leave this screen. No photo download or bulk export is provided. | Las imágenes se abren en privado cuando las pides y se borran al cerrar el registro o salir de esta pantalla. No se pueden descargar fotos ni exportarlas en grupo. |
| The time record stays intact. This removes the private stored image; backup handling follows your company photo notice. | El registro de tiempo no cambia. Esto elimina la imagen privada guardada; las copias de respaldo siguen el aviso de fotos de tu empresa. |
| Punch photo removal confirmed. The time record is preserved. Backup handling follows your company photo notice. | Se confirmó que se eliminó la foto de marcación. El registro de tiempo se conserva. Las copias de respaldo siguen el aviso de fotos de tu empresa. |
| Photo records appear after an authorized clock action. No camera or employee photo collection is started by this page. | Los registros de fotos aparecen después de una marcación autorizada. Esta página no enciende ninguna cámara ni recoge fotos de empleados. |
| Time zone is locked because you have shifts and timecards. Contact support to change it. | La zona horaria está bloqueada porque tienes turnos y tarjetas de tiempo. Comunícate con soporte para cambiarla. |
| Payday · Pay period {range} · Payroll to prepare · Payroll schedule needs review | Día de pago · Período de pago {range} · Nómina por preparar · El calendario de nómina necesita revisión |
| Review {n} timecards · Before payroll · {period} | Revisar {n} tarjetas de tiempo · Antes de la nómina · {period} |

### es-rest part B: For Jose to review (pay, payroll, privacy, account security)

From `reports/es-rest-parts/B.md`.

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

### es-rest part C: For Jose to review (pay and legal wording, Christmas bonus hours)

From `reports/es-rest-parts/C.md`.

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

### es-rest part D: For Jose to review (pay, payroll, privacy, billing)

From `reports/es-rest-parts/D.md`.


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
| Keep private details out of email | No envíes datos privados por correo electrónico |
| Never email passwords, codes, bank details or pay documents. | Nunca envíes por correo electrónico contraseñas, códigos, datos bancarios ni documentos de pago. |
| Privacy and terms / Privacy Policy / Terms of Use / Account deletion | Privacidad y términos / Política de privacidad / Términos de uso / Eliminar la cuenta |
| This connection isn’t secure. We cleared this page to protect your information. … | Esta conexión no es segura. Borramos esta página para proteger tu información. … |
| Your access changed. This information was cleared from the screen. … | Tu acceso cambió. Borramos esta información de la pantalla. … |

### es-rest part E: For Jose to review (pay, payroll, overtime, privacy)

From `reports/es-rest-parts/E.md`.

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

### es-owner: For Jose to review (pay, wage, tax and billing lines in Spanish)

From `reports/es-owner.md`.

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

### es-employee: Profile hint removed (the lead's call, for Jose to see)

From `reports/es-employee.md`.

"Sign-in pages only. The rest of NEVORA is in English for now." is removed in both languages from Profile (`account-copy.ts`, `account-b-client.tsx`). The same goes for the Team profile's "Used on the sign-in pages for now." (`employee-team-copy.ts`). A test checks it stays gone. The copy in `employee-mobile/profile.tsx:27` belongs to es-mobile and still shows on the desktop Profile.

### es-employee: For Jose to review (pay, privacy, account)

From `reports/es-employee.md`.

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

### es-employee (second release): For Jose to review (approval and timecard wording)

From `reports/es-employee.md`, section "Second release".

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

### es-rest second release, R2-A: For Jose to review (security and access messages)

From `reports/es-rest-parts/R2-A.md`.

| English | Spanish |
|---|---|
| Only an Owner may set a Clocker PIN. | Solo un dueño puede configurar un PIN del Clocker. |
| Enter the same four-digit PIN twice. | Escribe el mismo PIN de cuatro dígitos dos veces. |
| PIN changes could not be confirmed. Reload the current settings before trying again. | No pudimos confirmar los cambios del PIN. Recarga la configuración actual antes de intentarlo de nuevo. |
| Your current account cannot manage this employee’s Clocker PIN. | Tu cuenta no puede administrar el PIN del Clocker de este empleado. |
| This PIN is unavailable. Choose a different PIN. | Este PIN no está disponible. Elige otro PIN. |
| Clocker PIN security is unavailable. No verification can be confirmed. | La seguridad del PIN del Clocker no está disponible. No se puede confirmar ninguna verificación. |
| PIN security is not configured for this environment. | La seguridad del PIN no está configurada en este entorno. |
| Only an active Owner may review punch photos. / … remove punch photos. | Solo un dueño activo puede revisar las fotos de marcación. / … eliminar fotos de marcación. |
| The punch photo result could not be confirmed. Reload its protected review before continuing. | No pudimos confirmar el resultado de la foto de marcación. Recarga su revisión protegida antes de continuar. |
| The photo result could not be confirmed. Check the original clock action; do not create a replacement punch. | No pudimos confirmar el resultado de la foto. Revisa la marcación original; no crees una marcación de reemplazo. |
| You don’t have access to make this change here. Reload to see your current access, or ask the Owner. | No tienes acceso para hacer este cambio aquí. Recarga para ver tu acceso actual o pregúntale al dueño. |
| Changing the business timezone requires a separately reviewed conversion because operational records already exist. | Cambiar la zona horaria del negocio requiere una conversión revisada aparte, porque ya hay registros de operación. |

### es-rest second release, R2-B: For Jose to review (overtime, payroll, attendance and privacy wording)

From `reports/es-rest-parts/R2-B.md`.

| English | Spanish |
|---|---|
| Overtime needs your pay rules and employee classifications. Hours here aren’t payroll hours. | Las horas extra necesitan tus reglas de pago y la clasificación de cada empleado. Estas horas no son horas de nómina. |
| Actual time uses D2 canonical effective entries and breaks; finalized cards use their immutable snapshots. | El tiempo real usa las entradas y los descansos efectivos de D2; las tarjetas de tiempo finalizadas usan su copia fija. |
| Scheduled time is elapsed time in the latest published plan at observation, with released Unable to work requests excluded. It is not the immutable schedule originally captured on a punch. | El tiempo programado es el tiempo transcurrido en el horario publicado más reciente al momento de la consulta, sin las solicitudes de No puedo trabajar liberadas. No es el horario fijo que se registró con cada marcación. |
| Attendance observations use preserved raw punches and their exact captured publication references. They do not recalculate approved time or decide lateness/discipline. | Las notas de asistencia usan las marcaciones originales conservadas y la publicación exacta que se registró con cada una. No recalculan el tiempo aprobado ni deciden tardanzas o medidas disciplinarias. |
| Position labels come from captured punch context; absent labels remain unknown. Location and roster labels are current; finalized snapshot labels are retained. | Los puestos vienen del contexto registrado con cada marcación; si falta, se queda como desconocido. Las localidades y la lista del equipo son las actuales; las tarjetas finalizadas conservan sus nombres. |
| Time off and Unable to work rows reflect current request state; shift-change outcomes use append-only history. Private absence reasons are excluded. | Las filas de días libres y de No puedo trabajar muestran el estado actual de cada solicitud; los resultados de cambios de turno usan un historial que solo añade registros. No se incluyen los motivos privados de ausencia. |
| Unavailable policy and incomplete source evidence never become zero or healthy scores. | Una política no disponible o datos de origen incompletos nunca se muestran como cero ni como un resultado saludable. |
| Coverage requests in this period and how many were filled. A count, not a reliability score. | Solicitudes de cobertura en este período y cuántas se cubrieron. Es un conteo, no una medida de confiabilidad. |
| Schedule changes published for this period. No stability score is applied. | Cambios de horario publicados para este período. No se aplica ninguna medida de estabilidad. |
| Position not captured / Historical employee | Puesto no registrado / Empleado anterior |

### es-rest second release, R2-C: For Jose to review

From `reports/es-rest-parts/R2-C.md`.

- "Pay statement available" → "Comprobante de pago disponible"; "Statements need preparation" → "Hay comprobantes por preparar";
  "Pay statement update" → "Cambio en el comprobante de pago"; "Payroll preparation update" → "Cambio en la preparación de nómina".
- "Review the current payroll period" / "Review payroll" → "Revisa el período de nómina actual" / "Revisar nómina".
- "Open your current pay statement" / "View statement" → "Abre tu comprobante de pago actual" / "Ver comprobante".
- Photo states (privacy): "Photo exception recorded" → "Excepción de foto registrada"; "Photo removed" → "Foto eliminada";
  "Photo expired" → "Foto vencida".

### screens-final (Spanish): For Jose to review

From `reports/es-screens-final.md`.

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

### screens-final (second pass): For Jose to review

From `reports/es-screens-final.md`, "Second pass".

- Hour limits on the week grid: "4 h por encima del límite de 40 h", "12 de 30 h de meta", "12 de 40 h de límite", the
  short " · 4 h sobre 40 h", and "16 h asignadas esta semana".
- "Al aprobar, el turno sale de su horario. Todavía necesitará a alguien que lo cubra." (can't-work approval)
- "Ausencia aprobada" / "Ausencia rechazada" / "¿Rechazar esta ausencia?" (kept from review-details; "ausencia" isn't in
  the glossary).
- History steps: Creada, Aceptada, Completada, Rechazada, Retirada, Vencida, "Enviada a un gerente", Desactualizada.
- Glossary deviations to fit 390: the Open cover tab is "Por cubrir"; the cover request chip is "Reemplazo" (the full
  "Solicitud de reemplazo" is used in sentences and labels); grid chip "4 disponibles" (was "4 open").
- No payroll, tax or legal lines on these screens.

### timecards-final: For Jose to review (payroll wording in Spanish)

From `reports/timecards-final.md`.

- "Aprueba cada tarjeta de tiempo y luego finaliza la semana para cerrarla para la nómina."
- "Empieza una corrección de nómina antes de cambiar tiempo en este período de nómina aprobado."
- "Exportar horas" / "Descargar horas para la nómina".

