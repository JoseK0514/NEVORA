# Signed-in Spanish: the rest (es-rest)

Branch `claude-codex-collab-nevora-es-rest`, from `7c1464eb`. Area: /app/settings, components/company, components/reports, components/premium, and every English-only signed-in area in reports/language-inventory.md that the README's owners table doesn't name. Work order: settings, company, reports, premium, then the remaining areas by size.

## Summary

Signed-in Spanish for /app/settings, components/company, components/reports, components/premium and the English-only
areas no other row owns. The session split the work into its own slice (Settings, Company policies, the closed notice,
Owner Home's cards) and five parallel parts (A: reports and premium; B: notifications, Team pages, profile, account;
C: schedule parts, availability, shift, coverage, Christmas bonus, swap and callout; D: requests, time, leave and staffing,
brand, native shell, team, help, small routes; E: the long tail). Notes for each part, with its own "For Jose to review"
list, are in `es-rest-parts/A.md` to `E.md` beside this report.

How it works:
- Server pages call `readPageLang()` (`src/lib/i18n/page-lang.server.ts`): the same `readPortalLanguage` read the app
  layout gives `PortalLangProvider`, cached per request, English when there is no session or the read fails.
- Client parts call `usePortalLang()` (payroll-2's contract, cherry-picked as 61d22816; identical content).
- Every area has a `<area>-copy.ts` table `{en, es}` with the same keys, a key-set test and a Spanish render test.
  English was moved over word for word; the existing English tests pass unchanged.

## Commits (branch claude-codex-collab-nevora-es-rest)

- `034c5e11` the claim (below)
- `61d22816f` Signed-in Spanish contract: PortalLangProvider in the app layout (readPortalLanguage, English if it fails) and usePortalLang() for client components
- `67b29e50d` es-rest: readPageLang(), the person's language for server components (same readPortalLanguage read as the layout, cached per request)
- `6094a450d` es-rest: Settings and its pages follow the person's language (J1–J18 words, Break types, Punch photos and Photo review, the closed-page notice)
- `d4cbb83cd` es-rest (premium): Home's live summary line follows the person's language (premium-home-copy.ts, en and es)
- `bdc9ea841` es-rest (reports): Insights and Christmas bonus hours in Puerto Rico Spanish (reports-copy.ts, en and es; page passes readPageLang, views fall back to usePortalLang)
- `301ec7d37` es-rest: settings-es test passes children as a prop (tsc)
- `6fef1f53c` es-rest: Company policies (J6) follows the person's language; device-manager test shim reads context
- `e60d304d9` es-rest: Spanish render tests use JSX children (oxlint no-children-prop)
- `d041859af` es-rest B: Notifications (Owner and Manager), Things to do and Notifications titles in Puerto Rico Spanish
- `a15e40a2e` es-rest B: Team pages (/app/employees: person, Access and sign-in, sheets, Add employee, titles) in Puerto Rico Spanish
- `31c0265dd` es-rest B: Owner and Manager Profile and the Profile route titles in Puerto Rico Spanish
- `ae3ce055b` es-rest B: account (Delete account, assisted recovery code), passkeys and employment date fields in Puerto Rico Spanish
- `90ccf86eb` es-rest B: notes (areas, gaps, lines for Jose to review)
- `773c2602f` es-rest D: Time off and Requests hub follow the person's language (requests-copy.ts, en and Puerto Rico Spanish)
- `a94a38b56` es-rest D: time-off decision parts, Withdraw request and the correction comparison in Spanish (time-copy.ts; lang prop on the correction comparison for its callers)
- `614eb37cb` es-rest D: leave and staffing notes in Spanish (leave-staffing-copy.ts: conflict check, repair note, failure notice; Spanish shift and duration lines from the same facts)
- `a4012f352` es-rest D: Branding editor in Spanish (brand-copy.ts); notices keyed instead of matched on English text
- `faf6ecb5f` es-rest D: Team live states, filters and form fields in Spanish (team-copy.ts; the attendance helpers take an optional language)
- `bd27f7bd8` es-rest D: phone app Alerts settings and the use-the-browser page in Spanish (native-shell-copy.ts; UnsupportedNativeRole takes lang for the layout to pass)
- `b4d932275` es-rest D: an Employee's own leave note and Team's Hours this week in Spanish (lang prop for the dashboard to pass)
- `3e031c2f9` es-rest D: Help's frame follows the person's language (help-copy.ts); the support policy's answers stay as published, marked lang=en
- `66e5e6b66` es-rest D: small signed-in routes and Home's route words follow the person's language (route-copy.ts, home-page-copy.ts: tab titles, closed and unavailable notices, the location menu, the payday line)
- `420301128` es-rest D: notes (areas, gaps, Spanish pay and privacy lines for Jose)
- `285358edc` es-rest (E): time and attendance parts follow the person's language (close a punch, fix someone's time, correction ticket, period history, attendance comparison, Who's working, operational rules, Can't work and Swap sheets)
- `d3fafb451` es-rest (E): settings forms, Updates list, error screens, shared parts and small routes follow the person's language; key-set and Spanish render tests
- `c522f77c7` es-rest (E): notes, gaps and Spanish lines for Jose to review
- `0fa4090d4` es-rest: Owner Home's corporate cards and the setup row follow the person's language
- `a813e48a1` es-rest: closed-page notices pass the person's language; Help says correo electrónico; report body
- `9a2c975ad` es-rest (C): Schedule's shared parts follow the person's language (Add and Edit shift, What changed, publishing, Build draft, Copy previous week, Find cover, coverage line)
- `d7398529e` es-rest (C): Availability follows the person's language (the person's page and editor, day rows and sheet, the team list, Agreed times title)
- `714ca4d95` es-rest (C): shift request parts follow the person's language (request results, Decline and Approve, request history, trade and coverage rules, held-edit recovery, place line)
- `76ddbead4` es-rest (C): Find cover, Review replacement and the coverage figures follow the person's language
- `454b62097` es-rest (C): Christmas bonus hours follows the person's language (report and year menu; Spanish pay wording listed for Jose)
- `9fb56037e` es-rest (C): Swap shift, Offer for cover, Can't work's reason check and the swap labels follow the person's language
- `f4cc67c3a` es-rest (C): tests follow the language wiring (decline-asks' React stand-in reads context; swap label test types)
- `06175bf79` es-rest (C): notes for part C (areas, checks, gaps, pay wording for Jose)
- `6f4707263` es-rest: Christmas bonus calls Insights Informes, as the Insights page does
- `b03450dad` es-rest: Spanish fits at 200% text (Break types button, Christmas bonus deadline row); Settings band says Configuración
- `cc60de9ba` es-rest: Christmas bonus exemption row fits at 200% text (Plazo de la exención)
- the shots and this report: the last commit on the branch

## Checks

- **Unit tests:** whole `src/components` plus `src/app/app` on the merged tip: 4,390 passed, 0 failed (6f470726). The
  final fixes were re-run on their own files (settings, clocker, Christmas bonus, reports). The final code tip (cc60de9ba): 4,392 passed, 0 failed
  (src/components, src/app/app, src/lib/i18n).
- **tsc and oxlint:** clean before every push.
- **Key sets:** every new `*-copy.ts` has a test that its `en` and `es` keys match (recursively). Each main view has a
  Spanish render test that checks the Spanish words and the absence of the English ones. Existing English tests are unchanged,
  apart from five tests whose hand-written React stand-ins needed `useContext` or a language stub (clocker-device-manager,
  decline-asks, time-off-withdrawal, configuration-form, period-close-history-lifetime). No assertion was changed.
- **Browser (Spanish, Owner, fictional data, development build):** the `nv-lang=es` cookie the sign-in switch sets
  (no saved Profile language). 19 pages: Settings and its pages (J1–J18 rows the Owner opens, including Time off policies,
  Payroll settings and Plan and billing), Insights and Christmas bonus hours. Each one was checked at 390, at 390 with 200%
  text and at 1440, and axe ran on all 57 views (wcag2a/aa, 21a/aa, 22aa).
  - **Sideways scroll:** none.
  - **Clipped or past-the-edge text:** none after the fixes. Two items were fixed: Break types' empty-state button at 200%
    text is now "Añadir descanso", and the Christmas bonus exemption row is now "Plazo de la exención".
  - **axe:** 0 violations, except one `color-contrast` on Insights at 1440 (`.c-ins__range`, the grey range line on the
    band). That is the same element in English, so it isn't caused by the language. It's proposed below as an end-sweep row.
  - **Data:** `shots/es-rest/scan-summary.json` holds the per-view results. The captures are in `shots/es-rest/img/`
    (`es-<page>-owner-<390|390-200|1440>.webp`).
- **Not checked in a browser:** the other roles, the pages from parts B–E outside Settings and Insights (they have render
  tests only), the production build, keyboard order and reduced motion. Those are outside this package's browser brief.

## Impeccable audit (Settings and Insights in Spanish)

- **Hierarchy:** the band title, the card labels and the rows keep the English structure. Spanish titles wrap to two lines
  on the band at 390 at 200% ("Tipos de descanso"), as the English ones do; nothing is truncated.
- **Spacing and alignment:** unchanged, because only the words changed. The values on the right ("Aún no hay", "Semanal")
  fit beside their titles at 390.
- **Accessibility:** `lang="es"` is set on each Spanish page root (Payroll settings and Billing are drawn by other rows'
  components, so they lack it). Screen-reader-only lines are translated, and button names start with their visible words.
- **States:** the failure, empty and closed states are translated (Positions, Break types, Policies unavailable, the
  Settings-for-Owners notice, Photo review unavailable).
- **Leftover English on these pages, owned elsewhere:** the shell (tab bar, desktop sidebar, Search, account menu) and the
  bodies of Payroll settings and Billing.
- **Note:** at 200% text the native "Aplica a" select on Company policies shows "Todas las localidade…". That is the
  browser's own truncation of a select.

## Proposed ledger rows (end sweep)

- Insights band range line (`.c-ins__range`) fails color-contrast at 1440 over the band's lighter top; same in English.
- `CorpTime`/`timeParts` should render "a. m."/"p. m." at the same size (kit).
- Settings `RouteSkeleton` labels and server action messages in Spanish (see Decisions 3–4).



## Decisions for Jose and the lead

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

## For Jose to review

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

## Claim

### Areas and files taken (scan of 7c1464eb; EN count per file)

**components/premium (307)**

- `src/components/premium/treatments.tsx` (227)
- `src/components/premium-home.tsx` (67)
- `src/components/premium/clocker.tsx` (8)
- `src/components/premium/surfaces.tsx` (3)
- `src/components/premium/feedback.tsx` (2)

**route: /app/settings (252)**

- `src/app/app/settings/page.tsx` (33)
- `src/app/app/settings/positions/position-catalog.tsx` (30)
- `src/app/app/settings/closed-line.tsx` (18)
- `src/app/app/settings/workspace/page.tsx` (16)
- `src/app/app/settings/wave-c-form.tsx` (11)
- `src/app/app/settings/locations/page.tsx` (11)
- `src/app/app/settings/settings-b-form.tsx` (8)
- `src/app/app/settings/layout.tsx` (8)
- `src/app/app/settings/locations/locations-search.tsx` (8)
- `src/app/app/settings/actions.ts` (7)
- `src/app/app/settings/company-policies/page.tsx` (6)
- `src/app/app/settings/payroll/page.tsx` (6)
- `src/app/app/settings/clocker/actions.ts` (6)
- `src/app/app/settings/clocker/photos/review/page.tsx` (6)
- `src/app/app/settings/wave-c-kit.tsx` (5)
- `src/app/app/settings/locations/error.tsx` (5)
- `src/app/app/settings/locations/[locationId]/not-found.tsx` (5)
- `src/app/app/settings/breaks/page.tsx` (5)
- `src/app/app/settings/clocker/photos/actions.ts` (5)
- `src/app/app/settings/wave-c-focus.tsx` (4)
- `src/app/app/settings/clocker/photos/review/actions.ts` (4)
- `src/app/app/settings/locations/[locationId]/page.tsx` (3)
- `src/app/app/settings/locations/new/page.tsx` (3)
- `src/app/app/settings/breaks/actions.ts` (3)
- `src/app/app/settings/clocker/matching/actions.ts` (3)
- `src/app/app/settings/clocker/photos/page.tsx` (3)
- `src/app/app/settings/branding/page.tsx` (3)
- `src/app/app/settings/features/page.tsx` (2)
- `src/app/app/settings/clocker/pins/page.tsx` (2)
- `src/app/app/settings/positions/page.tsx` (2)
- `src/app/app/settings/loading.tsx` (1)
- `src/app/app/settings/settings-b.tsx` (1)
- `src/app/app/settings/locations/loading.tsx` (1)
- `src/app/app/settings/locations/[locationId]/loading.tsx` (1)
- `src/app/app/settings/locations/new/loading.tsx` (1)
- `src/app/app/settings/breaks/loading.tsx` (1)
- `src/app/app/settings/time-off/loading.tsx` (1)
- `src/app/app/settings/time-off/page.tsx` (1)
- `src/app/app/settings/company-policies/loading.tsx` (1)
- `src/app/app/settings/payroll/loading.tsx` (1)
- `src/app/app/settings/features/loading.tsx` (1)
- `src/app/app/settings/workspace/loading.tsx` (1)
- `src/app/app/settings/clocker/loading.tsx` (1)
- `src/app/app/settings/clocker/page.tsx` (1)
- `src/app/app/settings/clocker/matching/loading.tsx` (1)
- `src/app/app/settings/clocker/matching/page.tsx` (1)
- `src/app/app/settings/clocker/pins/loading.tsx` (1)
- `src/app/app/settings/clocker/photos/loading.tsx` (1)
- `src/app/app/settings/clocker/photos/review/loading.tsx` (1)
- `src/app/app/settings/branding/loading.tsx` (1)
- `src/app/app/settings/positions/loading.tsx` (1)

**components/reports (216)**

- `src/components/reports.tsx` (216)

**components/company (175)**

- `src/components/company-policy-editor.tsx` (175)

**components/notification (164)**

- `src/components/notification-inbox-signature.tsx` (82)
- `src/components/notification-inbox.tsx` (82)

**route: /app/employees (153)**

- `src/app/app/employees/[employeeId]/page.tsx` (86)
- `src/app/app/employees/new/page.tsx` (10)
- `src/app/app/employees/[employeeId]/clocker-pin/actions.ts` (9)
- `src/app/app/employees/actions.ts` (8)
- `src/app/app/employees/[employeeId]/time-off/page.tsx` (5)
- `src/app/app/employees/[employeeId]/pay/page.tsx` (5)
- `src/app/app/employees/[employeeId]/restrictions/page.tsx` (4)
- `src/app/app/employees/page.tsx` (3)
- `src/app/app/employees/[employeeId]/clocker-pin/page.tsx` (3)
- `src/app/app/employees/import/page.tsx` (3)
- `src/app/app/employees/[employeeId]/error.tsx` (2)
- `src/app/app/employees/[employeeId]/time-off/error.tsx` (2)
- `src/app/app/employees/[employeeId]/pay/error.tsx` (2)
- `src/app/app/employees/[employeeId]/restrictions/error.tsx` (2)
- `src/app/app/employees/new/error.tsx` (2)
- `src/app/app/employees/error.tsx` (1)
- `src/app/app/employees/[employeeId]/loading.tsx` (1)
- `src/app/app/employees/[employeeId]/time-off/loading.tsx` (1)
- `src/app/app/employees/[employeeId]/pay/loading.tsx` (1)
- `src/app/app/employees/[employeeId]/restrictions/loading.tsx` (1)
- `src/app/app/employees/[employeeId]/clocker-pin/loading.tsx` (1)
- `src/app/app/employees/new/loading.tsx` (1)

**components/owner (126)**

- `src/components/owner-home-corp.tsx` (75)
- `src/components/owner-setup-card.tsx` (36)
- `src/components/owner-only-notice.tsx` (13)
- `src/components/owner-only-title.tsx` (2)

**components/clocker-photo (122)**

- `src/components/clocker-photo/photo-review.tsx` (37)
- `src/components/clocker-photo/notice-settings.tsx` (19)
- `src/components/clocker-photo/photo-notice.tsx` (9)
- `src/components/clocker-photo/photo-settings.tsx` (2)

**components/schedule (121)**

- `src/components/schedule-shift-form.tsx` (31)
- `src/components/schedule-publication-change.tsx` (24)
- `src/components/schedule-publication-controls.tsx` (17)
- `src/components/schedule-generation-controls.tsx` (17)
- `src/components/schedule-copy-form.tsx` (11)
- `src/components/schedule-cover-pick.tsx` (9)
- `src/components/schedule-coverage-line.tsx` (7)
- `src/components/schedule-form-keys.tsx` (2)
- `src/components/schedule-template-controls.tsx` (1)

**components/availability (85)**

- `src/components/availability-signature.tsx` (26)
- `src/components/availability-team-list.tsx` (19)
- `src/components/availability-corp.tsx` (6)

**components/shift (84)**

- `src/components/shift-change-policy-fields.tsx` (22)
- `src/components/shift-assignment-fields.tsx` (15)
- `src/components/shift-review-recovery.tsx` (13)
- `src/components/shift-change-form.tsx` (9)
- `src/components/shift-change-form-state.ts` (8)
- `src/components/shift-requests-signature.tsx` (6)
- `src/components/shift-change-history.tsx` (3)
- `src/components/shift-request-decide.tsx` (3)

**components/manager-profile (84)**

- `src/components/manager-profile/manager-profile-live.tsx` (59)
- `src/components/manager-profile/contract.ts` (21)
- `src/components/manager-profile/manager-profile.tsx` (4)

**route: /app/requests (83)**

- `src/app/app/requests/time-off-form.tsx` (30)
- `src/app/app/requests/page.tsx` (23)
- `src/app/app/requests/time-off-signature.tsx` (16)
- `src/app/app/requests/hub/request-hub.tsx` (8)
- `src/app/app/requests/hub/page.tsx` (5)
- `src/app/app/requests/loading.tsx` (1)

**components/time (77)**

- `src/components/time-off-waiting-list.tsx` (23)
- `src/components/time-off-review-actions.tsx` (19)
- `src/components/time-off-withdrawal.tsx` (14)
- `src/components/time-correction-context.tsx` (8)
- `src/components/time-off-decision-form.tsx` (4)

**components/coverage (72)**

- `src/components/coverage-review.tsx` (38)
- `src/components/coverage-assistant.tsx` (28)
- `src/components/coverage-review-hold.tsx` (3)

**components/brand (72)**

- `src/components/brand-editor.tsx` (59)
- `src/components/brand-legal.tsx` (12)

**components/generation (72)**

**components/calendar (61)**

- `src/components/calendar-subscription-panel.tsx` (61)

**components/activity (58)**

**components/leave-staffing (57)**

- `src/components/leave-staffing/repair-note.tsx` (22)
- `src/components/leave-staffing/conflict-check.tsx` (19)
- `src/components/leave-staffing/failure-notice.tsx` (4)

**components/native-shell (56)**

- `src/components/native-shell/unsupported-role.tsx` (4)

**route: /app/availability (47)**

- `src/app/app/availability/page.tsx` (41)
- `src/app/app/availability/agreement/error.tsx` (2)
- `src/app/app/availability/agreement/page.tsx` (2)
- `src/app/app/availability/actions.ts` (1)
- `src/app/app/availability/agreement/loading.tsx` (1)

**components/team (44)**

- `src/components/team-desk-people.tsx` (8)
- `src/components/team-live.tsx` (4)
- `src/components/team/team-forms.tsx` (4)
- `src/components/team/phone.ts` (3)
- `src/components/team/return-to-next.tsx` (2)

**components/christmas (43)**

- `src/components/christmas-bonus-report.tsx` (38)
- `src/components/christmas-bonus-year-menu.tsx` (5)

**route: /app/help (42)**

- `src/app/app/help/page.tsx` (42)

**components/publish (40)**

- `src/components/publish-warning-review-surface.tsx` (40)

**components/management (38)**

- `src/components/management-close-form.tsx` (38)

**components/wave-a (38)**

- `src/components/wave-a/route-error.tsx` (4)
- `src/components/wave-a/pending-button.tsx` (3)
- `src/components/wave-a/action-form.tsx` (3)
- `src/components/wave-a/parts.tsx` (2)
- `src/components/wave-a/offline-notice.tsx` (2)

**components/wave (36)**

- `src/components/wave-b-forms.tsx` (36)

**components/operational (35)**

- `src/components/operational-rule-fields.tsx` (35)

**components/reviewed (35)**

- `src/components/reviewed-callout-form.tsx` (21)
- `src/components/reviewed-swap-form.tsx` (14)

**components/delegated (34)**

- `src/components/delegated-time-correction-form.tsx` (34)

**components/edit (33)**

- `src/components/edit-location-form.tsx` (33)

**components/whos (32)**

- `src/components/whos-working-corp.tsx` (32)

**components/notifications (31)**

- `src/components/notifications-manager-b.tsx` (31)

**components/assisted (30)**

- `src/components/assisted-recovery.tsx` (30)

**components/clean (30)**

- `src/components/clean/top-bar-slot.ts` (4)

**components/period (29)**

- `src/components/period-close-history.tsx` (29)

**components/new (28)**

- `src/components/new-location-form.tsx` (28)

**route: /app/reports (25)**

- `src/app/app/reports/christmas-bonus/page.tsx` (16)
- `src/app/app/reports/page.tsx` (6)
- `src/app/app/reports/christmas-bonus/error.tsx` (2)
- `src/app/app/reports/christmas-bonus/loading.tsx` (1)

**components/create (22)**

**components/mobile (20)**

**components/configured (20)**

- `src/components/configured-attendance-policies.tsx` (20)

**components/swap (19)**

- `src/components/swap-page-content.tsx` (10)
- `src/components/swap-shift-summary.tsx` (9)

**components/signature (19)**

- `src/components/signature/sig-overlays.tsx` (2)

**components/auth-premium (18)**

- `src/components/auth-premium/signed-out-footer.tsx` (10)
- `src/components/auth-premium/lang-switch.tsx` (4)
- `src/components/auth-premium/auth-validation.tsx` (1)
- `src/components/auth-premium/auth-back-nav.tsx` (1)
- `src/components/auth-premium/password-input.tsx` (1)
- `src/components/auth-premium/auth-shell.tsx` (1)

**route: /app/profile (18)**

- `src/app/app/profile/calendar/page.tsx` (7)
- `src/app/app/profile/passkeys/page.tsx` (4)
- `src/app/app/profile/[document]/page.tsx` (4)
- `src/app/app/profile/page.tsx` (2)
- `src/app/app/profile/device-alerts/page.tsx` (1)

**route: /app/payroll (18)**

- `src/app/app/payroll/payroll-route.tsx` (11)
- `src/app/app/payroll/page.tsx` (1)
- `src/app/app/payroll/history/page.tsx` (1)
- `src/app/app/payroll/review/page.tsx` (1)
- `src/app/app/payroll/prepare/page.tsx` (1)
- `src/app/app/payroll/import/page.tsx` (1)
- `src/app/app/payroll/fix/page.tsx` (1)
- `src/app/app/payroll/people/page.tsx` (1)

**components/messages (17)**

- `src/components/messages-manager-b.tsx` (17)

**components/features (17)**

- `src/components/features-editor.tsx` (17)

**components/coverage-minutes (17)**

- `src/components/coverage-minutes/coverage-minutes.tsx` (17)

**components/employment (16)**

- `src/components/employment-date-fields.tsx` (16)

**components/action (16)**

- `src/components/action-center-navigation.ts` (16)

**route: /app/(root) (15)**

- `src/app/app/page.tsx` (14)
- `src/app/app/[...missing]/page.tsx` (1)

**components/kit (14)**

**route: /app/timecards (14)**

- `src/app/app/timecards/corrections/page.tsx` (6)
- `src/app/app/timecards/corrections/new/[employeeId]/page.tsx` (5)
- `src/app/app/timecards/page.tsx` (3)

**components/first (13)**

- `src/components/first-week-setup.tsx` (13)

**components/rules (12)**

- `src/components/rules-hours-list.tsx` (12)

**route: /app/my-time (11)**

- `src/app/app/my-time/page.tsx` (10)
- `src/app/app/my-time/loading.tsx` (1)

**components/account (10)**

- `src/components/account-recovery.tsx` (9)
- `src/components/account-deletion-form.tsx` (1)

**components/app (10)**

- `src/components/app-error-screen.tsx` (10)

**route: /app/payroll-export (10)**

- `src/app/app/payroll-export/page.tsx` (6)
- `src/app/app/payroll-export/paid-time/page.tsx` (3)
- `src/app/app/payroll-export/loading.tsx` (1)

**route: /app/billing (10)**

- `src/app/app/billing/page.tsx` (10)

**components/correction (9)**

- `src/components/correction-time-ticket.tsx` (9)

**components/quiet (9)**

- `src/components/quiet/quiet-sheet.tsx` (5)
- `src/components/quiet/quiet.tsx` (4)

**route: /app/ai-manager (8)**

- `src/app/app/ai-manager/weekly/page.tsx` (5)
- `src/app/app/ai-manager/page.tsx` (1)
- `src/app/app/ai-manager/business/page.tsx` (1)
- `src/app/app/ai-manager/knowledge/page.tsx` (1)

**route: /app/updates (7)**

- `src/app/app/updates/page.tsx` (2)
- `src/app/app/updates/[id]/page.tsx` (2)
- `src/app/app/updates/compose/page.tsx` (2)
- `src/app/app/updates/compose/loading.tsx` (1)

**components/location (6)**

**components/policy (6)**

- `src/components/policy-save-form.tsx` (6)

**route: /app/account (6)**

- `src/app/app/account/delete/page.tsx` (6)

**components/module (5)**

- `src/components/module-off.tsx` (5)

**components/recovery (5)**

- `src/components/recovery-reset.tsx` (3)
- `src/components/recovery-request.tsx` (2)

**components/exchange (5)**

**components/sidebar (5)**

- `src/components/sidebar-rail-tooltip.tsx` (5)

**components/configuration (5)**

- `src/components/configuration-form.tsx` (5)

**components/blocked (5)**

- `src/components/blocked-open-shifts.tsx` (5)

**route: /app/notifications (5)**

- `src/app/app/notifications/page.tsx` (4)
- `src/app/app/notifications/open/route.ts` (1)

**components/update (4)**

- `src/components/update-visual.tsx` (4)

**components/theme (4)**

- `src/components/theme-switch.tsx` (4)

**components/passkeys (4)**

- `src/components/passkeys/passkey-section.tsx` (3)
- `src/components/passkeys/passkey-desktop-view.tsx` (1)

**route: /app/restricted (4)**

- `src/app/app/restricted/page.tsx` (4)

**components/position (3)**

- `src/components/position-quota-fields.tsx` (3)

**components/public (3)**

- `src/components/public-error-screen.tsx` (3)

**route: /app/my-pay (3)**

- `src/app/app/my-pay/page.tsx` (2)
- `src/app/app/my-pay/loading.tsx` (1)

**route: /app/clocker-recovery (3)**

- `src/app/app/clocker-recovery/page.tsx` (2)
- `src/app/app/clocker-recovery/loading.tsx` (1)

**route: /app/account-recovery (3)**

- `src/app/app/account-recovery/page.tsx` (2)
- `src/app/app/account-recovery/loading.tsx` (1)

**components/profile (2)**

**components/callout (2)**

- `src/components/callout-view.tsx` (2)

**components/finder (2)**

- `src/components/finder-glyph.tsx` (2)

**route: /app/inbox (2)**

- `src/app/app/inbox/page.tsx` (2)

**components/unconfirmed (1)**

- `src/components/unconfirmed-action-form.tsx` (1)

**components/status (1)**

**components/print (1)**

- `src/components/print-schedule-button.tsx` (1)

**components/skeleton (1)**

- `src/components/skeleton.tsx` (1)

**components/celebration (1)**

- `src/components/celebration.tsx` (1)

**components/illustrations (1)**

**components/onboarding (1)**

- `src/components/onboarding/signup-ui.tsx` (1)

**route: /app/@sheet (1)**

- `src/app/app/@sheet/(.)exchange/layout.tsx` (1)

### Not taken

- Owned by other rows (README table): shell files, employee-mobile, payroll, manager, timecards, employee, employee-b, /app/schedule, /app/exchange, communication, company-access, owner-advisor, owner-b, payroll-import, roster-import, restrictions, time-off-admin, wages, review-details, reminders, copy, workforce.
- Out of scope: components/ui-preview (preview-only), components/legal and src/lib/legal, public or kiosk areas with their own Spanish (clocker, mobile-access, access-recovery, commerce-recovery), shared kit (components/corp, components/kit, owner-b/b-kit).
- Not imported by any route (dead code, no visible text to translate):
  - `src/components/clocker-photo/punch-photo-flow.tsx`
  - `src/components/schedule-location-control.tsx`
  - `src/components/availability-editor.tsx`
  - `src/components/availability-feedback.tsx`
  - `src/components/shift-slot.tsx`
  - `src/components/time-clock-widget.tsx`
  - `src/components/time-off-review-decision.tsx`
  - `src/components/coverage-review-content.tsx`
  - `src/components/brand-lockup.tsx`
  - `src/components/generation-explanation-panel.tsx`
  - `src/components/activity-history-panel.tsx`
  - `src/components/leave-staffing/own-leave-note.tsx`
  - `src/components/native-shell/device-settings.tsx`
  - `src/components/team/team-overview.tsx`
  - `src/components/wave-a/swap-sent.tsx`
  - `src/components/wave-a/callout-sent.tsx`
  - `src/components/wave-a/shift-block.tsx`
  - `src/components/wave-a/keep-height.ts`
  - `src/components/clean/week-summary.tsx`
  - `src/components/clean/request-pages-nav.tsx`
  - `src/components/create-shift-form.tsx`
  - `src/components/mobile-home-overview.tsx`
  - `src/components/signature/system-state.tsx`
  - `src/components/kit/kit.tsx (kit, read-only)`
  - `src/components/kit/press-feedback.tsx`
  - `src/components/kit/focus-on-arrival.tsx (kit, read-only)`
  - `src/components/kit/focus-after-retry.ts (kit, read-only)`
  - `src/components/kit/overlay-exit.ts`
  - `src/components/kit/use-discard-guard.ts (kit, read-only)`
  - `src/components/kit/keep-selected-visible.tsx (kit, read-only)`
  - `src/components/location-configuration-fields.tsx`
  - `src/components/exchange-assignment.tsx`
  - `src/components/profile-calendar-disclosure.tsx`
  - `src/components/status-pill.tsx`
  - `src/components/illustrations/index.tsx`
