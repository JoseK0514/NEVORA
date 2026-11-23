# Signed-in Spanish: Payroll (`src/components/payroll`)

Branch `claude-codex-collab-nevora-es-payroll`, from `claude-codex-collab-nevora` (shared tip with the language contract
960579cf merged). Fictional data only.

## Commits

| Commit | What |
|---|---|
| ce129650 | Language hook, `{en, es}` table skeleton, Spanish date helpers (`periodRange`, `payDay`, `shortDay`, `momentDay` take `lang`) |
| d7ac270c | Key-set test for the table |
| 5aad2501 | Payroll settings, pay date field, Payroll tabs |
| adff0097 | Native payroll: setup, tax fields, review, opening balances, profile form validation |
| 3c114071 | Status and blockers (104 codes), API errors, feedback, form problems, My pay, statements |
| 94d8963c | Pay runs, Prepare, Review, People, Fix, History; older payroll frame (`payroll-ui.tsx`); amount error in `money.ts` |
| 980a118f | Follows the shared `usePortalLang()`; Spanish render tests per main view |
| fb4257cf | One Spanish scope line on Pay runs and Payroll settings |
| 27b7b5c7 | axe fix (Prepare button's spoken name starts with its visible words); Spanish payday lines may break before the date at 200% text |
| (shots commit) | This report and the captures in `shots/es-payroll/` |

## What changed

- **One table for the area:** `src/components/payroll/payroll-copy.ts` exports `payrollCopy = {en, es}`, built from five
  sections in `src/components/payroll/copy/` (`runs`, `settings`, `native`, `status`, `myPay`). That's 917 string leaves,
  plus string lists and sentence builders. Each section is typed `const es: typeof en`. `payroll-copy.test.ts` checks
  that the keys and sentence-builder arities match, that no Spanish string is blank where the English has words, that
  the Spanish has no "!" or English role words, and that an unknown language falls back to English.
- **Language source:** `payroll-lang.tsx` forwards `usePortalLang()`. Components call `usePayrollCopy()` and get the
  table plus `lang`. Exported text helpers take an optional trailing `lang = 'en'`: `noticeReadiness`, `noticeOutcome`,
  `backlogDescription`, `payrollExceptionMessage`, `flagProblems`, `problemsMessage`, `fieldName`, `confirmedTitle`,
  `periodLabel`, `profileFromForm`, `openingFromForm`, `scopeFromForm`, `readNativeProfiles`, `dollarsToMinor`. Callers
  outside Payroll keep compiling and stay English.
- **No server page edits were needed.** Every Payroll component that reads the language renders inside a client component.
- **English is unchanged, word for word.** The existing Payroll tests pass without edits, except
  `payroll-feedback.test.tsx`, which reads the source of `use-payroll.ts` and now expects the new call forms.
- **Small logic changes needed for Spanish (English output identical):**
  - `nextStep` returns a `fixing` flag; it used to test the label against `/issue/i`.
  - The payday tile uses `shortDay`; it used to strip the weekday with `/^\w+,/`, which misses "mié".
  - The Sign in button on the older frame checks for the signed-out sentence in either language.
  - My pay checks `errorCode === 'SIGNED_OUT'`.
- **Formats (voice.md):** dates "mar, 20 oct", ranges "21–27 sep" and "28 sep–4 oct" (Intl's "sept" is written "sep"),
  money "$6,234.29" (US format, as Puerto Rico uses), times "a. m."/"p. m." from es-PR.
- **One word per concept:**
  - Timecards: "tarjeta(s) de tiempo", per the lead's note and voice.md. `payroll-import` still says "Hojas de tiempo" in 3
    places (es-owner's area).
  - Pay statement: "comprobante de pago". `payroll-import` still says "talonario".
  - Payroll notification: "notificación"; "aviso" is reserved for Updates. The exception is the legal workweek "aviso del
    patrono".
  - Owner: "dueño". Employer: "patrono".

## Checks run

- `tsc --noEmit`: clean. `oxlint` on `src/components/payroll`: clean.
- Whole `src/components` suite: 3,257 passed, 0 failed (run on 27b7b5c7).
- `payroll-es.test.tsx`: Pay runs (with the unpaid notice), Prepare, Review (US-format amounts), People, Fix, History and
  Settings each render in Spanish inside `PortalLangProvider` with no English words left in their text. Outside the
  provider they stay English.
- **Browser** (development build, owned local Postgres, fictional workspace, Owner, `nv-lang=es` cookie): 390, 390 with
  200% text (root font size), and 1440, with axe-core 4 (WCAG 2.0/2.1/2.2 A and AA).
  - No sideways scroll on any page at any width.
  - First scan: one axe finding (`label-content-name-mismatch` on Prepare: the Spanish spoken name "Preparar la nómina de
    21–27 sep" didn't contain the visible "Preparar 21–27 sep"). Fixed in 27b7b5c7.
  - First scan: at 200% the payday segment ("Día de pago vie, 13 nov", joined with no-break spaces) split mid-word. Fixed
    in 27b7b5c7: Spanish may break before the date. English is unchanged.
  - **Re-scan on 27b7b5c7:** axe finds 0 violations on Pay runs, Prepare, Review, People, Fix, History and Settings, at both
    390 and 1440. None of these pages scrolls sideways at 390, at 390 with 200% text, or at 1440. The probe flagged only
    screen-reader-only text as clipped: the step states ("Siguiente", "Después", `b-sr`) and the People search label
    (`c-sr`). Buttons that sit on one line in English also sit on one line in Spanish at 390.
  - **Shots:** `shots/es-payroll/<page>-owner-es-<390|390-text200|1440>.webp` (full page, quality 80) for pay-runs,
    prepare, review, people, fix, history and settings. The phone tab bar is fixed, so in full-page 390 shots it can
    cover a row partway down.
  - **Not checked in the browser:** the Employee "My pay" page (it's covered by the unit tests), keyboard and focus order,
    reduced motion, and a production build.

## Left for others (not in this area)

- **Shell:** `<html lang>` stays "en" on Spanish pages (axe reads `lang="en"`). voice.md asks for `lang="es"`. This belongs
  in `src/app/app/layout.tsx` (payroll-2).
- **Shell:** the Payroll tab names ("Pay runs", "Time exports", "Settings") and the sidebar and tab bar come from
  `navigation.ts` (payroll-2).
- **Import pay (`/app/payroll/import`)** is `components/payroll-import` (es-owner). It still renders English on a Spanish
  page because the route passes no language.
- **Server text:** the issue lines in Prepare's "Check dates" panel come from the server and stay English.

## For Jose to review

Every Payroll line is payroll, tax or money text, so all of them are listed. English is the approved wording, unchanged.
The Spanish is new. Rows are generated from the table (`{b}`, `{c}`… stand for filled-in values; numbers are sample
counts). Choices to look at first:

- Taxes are "contribuciones" (PR usage), withholding is "retención/retenidas", and employer contributions are
  "aportaciones patronales".
- Puerto Rico income tax is "Contribución sobre ingresos de Puerto Rico". Married filing jointly is "Casado, planilla
  conjunta". Opening balances are "Balances iniciales". Year to date is "Acumulado del año". Attest is "Certificar".
- The approved settle note reuses the existing Spanish from `payroll-import` word for word ("…resuelve la diferencia con
  la persona fuera de NEVORA"). The English says "employee".
- "I reviewed revision N" is "Revisé la versión N" (avoids "revisé la revisión").
- "Up next" is "Lo próximo". "Pay schedule" is "Calendario de pago".
- Provider and bank names (ADP RUN, QuickBooks Payroll, Paychex, Gusto, Popular Web Cash Manager, NACHA) stay as they are.

### runs

| Key | English | Spanish |
|---|---|---|
| `status.BLOCKED` | Needs attention | Necesita atención |
| `status.WAITING_FOR_AMOUNTS` | Waiting for amounts | Esperando cantidades |
| `status.REVIEW_REQUIRED` | Review required | Revisión requerida |
| `status.APPROVED` | Approved | Aprobada |
| `job.PREPARE` | Draft preparation | Preparación del borrador |
| `job.PDF` | PDF generation | Creación del PDF |
| `job.PUBLISH` | Pay statement sharing | Compartir comprobantes de pago |
| `job.REMINDER` | Private payroll notice | Notificación privada de nómina |
| `retryJob.PREPARE` | Retry draft preparation | Reintentar la preparación del borrador |
| `retryJob.PDF` | Retry pdf generation | Reintentar la creación del PDF |
| `retryJob.PUBLISH` | Retry pay statement sharing | Reintentar compartir los comprobantes de pago |
| `retryJob.REMINDER` | Retry notice queue | Reintentar la cola de notificaciones |
| `jobState.done` | Done | Hecho |
| `jobState.failed` | Failed | Falló |
| `jobState.running` | Running | En curso |
| `jobState.waiting` | Waiting | En espera |
| `retry` | Retry | Reintentar |
| `attempts` | 2 attempts | 2 intentos |
| `frequency.WEEKLY` | Weekly | Semanal |
| `frequency.BIWEEKLY` | Every two weeks | Cada dos semanas |
| `frequency.SEMIMONTHLY` | Twice a month | Dos veces al mes |
| `frequency.MONTHLY` | Monthly | Mensual |
| `frequencyPayroll.WEEKLY` | Weekly payroll | Nómina semanal |
| `frequencyPayroll.BIWEEKLY` | Every two weeks payroll | Nómina cada dos semanas |
| `frequencyPayroll.SEMIMONTHLY` | Twice a month payroll | Nómina dos veces al mes |
| `frequencyPayroll.MONTHLY` | Monthly payroll | Nómina mensual |
| `scopeLine` | Calculate pay and share statements. You pay your team outside NEVORA. | Calcula el pago y comparte los comprobantes. Tú le pagas a tu equipo fuera de NEVORA. |
| `nextSteps[0]` | Pay each person their net pay. | Págale a cada persona su pago neto. |
| `nextSteps[1]` | Send withheld taxes and employer contributions. | Envía las contribuciones retenidas y las aportaciones patronales. |
| `nextSteps[2]` | Keep the company summary for your accountant. | Guarda el resumen de la empresa para tu contador. |
| `nextNote` | NEVORA doesn’t pay anyone or send taxes. | NEVORA no le paga a nadie ni envía contribuciones. |
| `settleNote` | If pay changes, settle the difference with the employee outside NEVORA. | Si el pago cambia, resuelve la diferencia con la persona fuera de NEVORA. |
| `and` | and | y |
| `people` | 2 people | 2 personas |
| `employees` | 2 employees | 2 empleados |
| `otherPeople` | 2 other people | 2 otras personas |
| `payday` | Payday 2 | Día de pago 2 |
| `payroll` | Payroll | Nómina |
| `tryAgain` | Try again | Intentar de nuevo |
| `loading` | Loading payroll… | Cargando la nómina… |
| `cantReview` | Your account can’t review payroll. | Tu cuenta no puede revisar la nómina. |
| `missingTitle` | This payroll isn’t available | Esta nómina no está disponible |
| `missingLine` | It may have been replaced by a newer revision. | Puede que una revisión más reciente la haya reemplazado. |
| `goToPayroll` | Go to Payroll | Ir a Nómina |
| `preparePayroll` | Prepare payroll | Preparar nómina |
| `payrollHistory` | Payroll history | Historial de nómina |
| `fixBefore` | Fix before payroll | Corregir antes de la nómina |
| `payrollDetails` | Payroll details | Detalles de la nómina |
| `reviewPayroll` | Review payroll | Revisar nómina |
| `peopleTitle` | People | Personas |
| `reviewIssue` | Review issue | Revisar problema |
| `reviewIssues` | Review issues | Revisar problemas |
| `rangeNoPayroll` | 2 has no payroll | 2 no tiene nómina |
| `periodsNoPayroll` | 2 pay periods have no payroll | 2 períodos de pago no tienen nómina |
| `someNoPayroll` | Some pay periods have no payroll | Algunos períodos de pago no tienen nómina |
| `paydayWasLead` | Scheduled payday was  | El día de pago programado era  |
| `oldestIsLead` | Oldest is  | El más antiguo es  |
| `paydayWas` | Scheduled payday was 2 | El día de pago programado era 2 |
| `oldestIs` | Oldest is 2, scheduled payday {b} | El más antiguo es 2, día de pago programado {b} |
| `prepareRange` | Prepare 2 | Preparar 2 |
| `prepareRangeLabel` | Prepare 2 payroll | Preparar 2 (nómina) |
| `payPeriodsNoPayroll` | Pay periods with no payroll | Períodos de pago sin nómina |
| `periodsWithNoPayroll` | Periods with no payroll | Períodos sin nómina |
| `prepareEach` | Prepare payroll for each one | Prepara la nómina de cada uno |
| `check` | Check | Verificar |
| `correction` | Correction | Corrección |
| `replacedByCorrection` | Replaced by a correction | Reemplazada por una corrección |
| `approved` | Approved | Aprobada |
| `net` | Net | Neto |
| `timeExports` | Time exports | Exportar horas |
| `periodEnded` | Pay period ended | El período de pago terminó |
| `approvableFrom` | Can be approved from 2 | Se puede aprobar a partir del 2 |
| `payrollSettings` | Payroll settings | Ajustes de nómina |
| `settings` | Settings | Ajustes |
| `today` | today | hoy |
| `tomorrow` | tomorrow | mañana |
| `inDays` | in 2 days | en 2 días |
| `chipToday` | Scheduled payday today | Día de pago programado hoy |
| `chipTomorrow` | Scheduled payday tomorrow | Día de pago programado mañana |
| `chipInDays` | Scheduled payday in 2 days | Día de pago programado en 2 días |
| `chipPassed` | Scheduled payday passed | El día de pago programado pasó |
| `stepDone` | Done | Hecho |
| `stepNext` | Next | Siguiente |
| `stepLater` | Later | Después |
| `step1Started` | Started from approved time | Se empezó con el tiempo aprobado |
| `step1Bring` | Bring in approved time for this period | Trae el tiempo aprobado de este período |
| `fixIssues` | Fix issues | Corregir problemas |
| `reviewPay` | Review pay | Revisar el pago |
| `somethingStops` | Something stops this payroll | Algo detiene esta nómina |
| `hoursRates` | Hours, rates and deductions | Horas, tarifas y deducciones |
| `approvePayroll` | Approve payroll | Aprobar nómina |
| `sharedAutomatically` | Statements are shared with your team automatically | Los comprobantes se comparten con tu equipo automáticamente |
| `thenShare` | Then share pay statements | Luego comparte los comprobantes de pago |
| `upNext` | Up next | Lo próximo |
| `upNextWith` | Up next · 2 | Lo próximo · 2 |
| `thisPayroll` | This payroll | Esta nómina |
| `scheduledPayday` | Scheduled payday | Día de pago programado |
| `scheduledPaydaySep` |  · Scheduled payday  |  · Día de pago programado  |
| `netPay` | Net pay | Pago neto |
| `payrollApproved` | Payroll approved | Nómina aprobada |
| `payrollSteps` | Payroll steps | Pasos de la nómina |
| `timecards` | Timecards | Tarjetas de tiempo |
| `stepLabel` | 2, {b} | 2, {b} |
| `stepRead` | . 2 | . 2 |
| `paySchedule` | Pay schedule | Calendario de pago |
| `noSchedule` | No pay schedule yet | Todavía no hay calendario de pago |
| `setSchedule` | Set your pay schedule to see the current period. | Configura tu calendario de pago para ver el período actual. |
| `whatsNext` | What’s next | Qué sigue |
| `recentPayrolls` | Recent payrolls | Nóminas recientes |
| `pastPeriods` | Past periods | Períodos anteriores |
| `noPastLine` | No past payrolls yet. Approved payrolls appear here. | Todavía no hay nóminas anteriores. Las nóminas aprobadas aparecen aquí. |
| `noPastTitle` | No past payrolls yet | Todavía no hay nóminas anteriores |
| `noPastDetail` | Approved payrolls appear here. | Las nóminas aprobadas aparecen aquí. |
| `payrollTools` | Payroll tools | Herramientas de nómina |
| `downloadHours` | Download hours for payroll | Descarga las horas para la nómina |
| `netOnStatements` | Net pay on statements: 2 | Pago neto en los comprobantes: 2 |
| `across` |  across 2 |  en 2 |
| `noNetChange` |  (no one’s net pay changes) |  (no cambia el pago neto de nadie) |
| `netChangesByPerson` | Net pay changes by person | Cambios en el pago neto por persona |
| `teamMember` | A team member | Una persona del equipo |
| `wasNow` | was 2 · now {b} | antes 2 · ahora {b} |
| `totals` | Totals | Totales |
| `grossPay` | Gross pay | Pago bruto |
| `employeeDeductions` | Employee deductions | Deducciones del empleado |
| `employerContributions` | Employer contributions | Aportaciones patronales |
| `amountsAfterImport` | Amounts appear after your provider’s amounts are imported. | Las cantidades aparecen después de importar las cantidades de tu proveedor. |
| `amountsAfterFix` | Amounts appear after the items below are fixed and the draft is recalculated. | Las cantidades aparecen después de corregir lo de abajo y volver a calcular el borrador. |
| `noAmounts` | No pay amounts were entered for this payroll. | No se ingresaron cantidades de pago en esta nómina. |
| `replaced` | Replaced | Reemplazada |
| `correctionOf` | Correction of 2 | Corrección de 2 |
| `correctionOfEarlier` | Correction of an earlier payroll | Corrección de una nómina anterior |
| `originalRemains` | The original approval and statements remain in history. | La aprobación original y los comprobantes se quedan en el historial. |
| `correctionReason` | Correction reason | Razón de la corrección |
| `thingsToFix` | Things to fix | Cosas por corregir |
| `thingsBeforeApproving` | 2 things to fix before approving | 2 cosas por corregir antes de aprobar |
| `stopsPayroll` | Stops payroll | Detiene la nómina |
| `createLinkedCorrection` | Create a linked correction | Crear una corrección enlazada |
| `nativeCorrectionLine` | Corrections recalculate a separate linked draft from recorded time and current facts. The replacement requires a new review and approval; original statements stay in history.  | Las correcciones calculan de nuevo un borrador aparte y enlazado con el tiempo registrado y los datos actuales. El reemplazo necesita otra revisión y aprobación; los comprobantes originales se quedan en el historial.  |
| `createCorrectionDraft` | Create correction draft | Crear borrador de corrección |
| `moreActions` | More actions | Más acciones |
| `recalculateDraft` | Recalculate draft | Recalcular borrador |
| `freshRevision` | A fresh revision from current recorded time | Una revisión nueva con el tiempo registrado actual |
| `closeCorrection` | Close correction | Cerrar corrección |
| `fixThisPayroll` | Fix this payroll | Corregir esta nómina |
| `startsCorrection` | Starts a correction you approve separately | Empieza una corrección que apruebas aparte |
| `preparePaymentInstructions` | Prepare payment instructions | Preparar instrucciones de pago |
| `fileOnly` | A file only. NEVORA doesn’t send money. | Solo un archivo. NEVORA no envía dinero. |
| `noInstructionsForCorrection` | NEVORA doesn’t make payment instructions for a correction.  | NEVORA no prepara instrucciones de pago para una corrección.  |
| `reviewedCheck` | I reviewed revision 2, the recorded-time calculation and all employee details. | Revisé la versión 2, el cálculo con el tiempo registrado y todos los detalles de los empleados. |
| `nativeCalculated` | NEVORA calculated these amounts from your setup. Check withholding with your accountant. | NEVORA calculó estas cantidades con tu configuración. Verifica las retenciones con tu contador. |
| `approvingDoesnt` | Approving doesn’t pay anyone or send taxes. | Aprobar no le paga a nadie ni envía contribuciones. |
| `sharedWhenReady` |  Pay statements are shared with each employee once they’re ready. |  Los comprobantes de pago se comparten con cada empleado cuando estén listos. |
| `fixToApprove` | Fix the 2 things above to approve. | Corrige las 2 cosas de arriba para aprobar. |
| `approvingLocks` | Approving locks the reviewed amounts, finalized time, settings and employee exceptions. If any of them change, review again. | Aprobar fija las cantidades revisadas, el tiempo finalizado, los ajustes y las excepciones de los empleados. Si algo de eso cambia, revisa otra vez. |
| `someoneApprove` | Someone who can approve payroll needs to approve this version. | Alguien que pueda aprobar la nómina tiene que aprobar esta versión. |
| `shareConfirm` | Share the approved pay statements with each employee. | Compartir los comprobantes de pago aprobados con cada empleado. |
| `sharePayStatements` | Share pay statements | Compartir comprobantes de pago |
| `someoneShare` | Someone who can approve payroll needs to share the pay statements. | Alguien que pueda aprobar la nómina tiene que compartir los comprobantes de pago. |
| `documents` | Documents | Documentos |
| `documentsMaking` | Documents are being made. They show here when they’re ready. | Los documentos se están creando. Aparecen aquí cuando estén listos. |
| `notSharedYet` | Pay statements not shared yet | Comprobantes de pago sin compartir todavía |
| `notSharedLine` | Approved pay statements are shared with employees automatically once they are made and checked. Approval alone doesn’t mean a PDF is ready. | Los comprobantes de pago aprobados se comparten con los empleados automáticamente cuando se crean y se verifican. Aprobar no significa que el PDF ya esté listo. |
| `preparationDelivery` | Preparation and delivery | Preparación y entrega |
| `importProviderAmounts` | Import provider amounts | Importar cantidades del proveedor |
| `historicalProvider` | Historical provider runs retain their imported amounts. Native payroll does not replace the source of this historical review. | Las nóminas anteriores del proveedor conservan sus cantidades importadas. La nómina calculada en NEVORA no reemplaza la fuente de esta revisión histórica. |
| `keepsImported` | NEVORA keeps the amounts you import as they are. It doesn’t calculate taxes or deductions. | NEVORA guarda las cantidades que importas tal como están. No calcula contribuciones ni deducciones. |
| `timecardsNotFinalized` | 2 timecards not finalized | 2 tarjetas de tiempo sin finalizar |
| `chooseWhatToDo` | Choose what to do with 2 people this period | Elige qué hacer con 2 personas en este período |
| `forWho` | For 2 | Para 2 |
| `reviewTimecards` | Review timecards | Revisar tarjetas de tiempo |
| `chooseIncluded` | Choose who’s included | Elegir quién está incluido |
| `openSetup` | Open payroll setup | Abrir configuración de nómina |
| `openSettings` | Open Payroll settings | Abrir ajustes de nómina |
| `contactSupport` | Contact support | Contactar a soporte |
| `nothingStops` | Nothing stops this payroll | Nada detiene esta nómina |
| `approvableOnce` | Payroll can be approved once both are fixed. | La nómina se puede aprobar cuando ambos se corrijan. |
| `thenRecalculate` |  Then recalculate the draft. |  Luego recalcula el borrador. |
| `netPayEmployees` | Net pay · 2 employees | Pago neto · 2 empleados |
| `employeeAmounts` | Employee amounts | Cantidades por empleado |
| `findEmployeeAmounts` | Find employee amounts | Buscar cantidades por empleado |
| `findEmployee` | Find an employee | Buscar un empleado |
| `noEmployeeDeductions` | No employee deductions | Sin deducciones del empleado |
| `noImportedEmployeeDeductions` | No imported employee deductions | Sin deducciones del empleado importadas |
| `noEmployerContributions` | No employer contributions | Sin aportaciones patronales |
| `noImportedEmployerContributions` | No imported employer contributions | Sin aportaciones patronales importadas |
| `exceptionRevision` | Employee exception revision 2 | Revisión de excepción del empleado 2 |
| `noEmployeesMatch` | No employees match | Ningún empleado coincide |
| `checkSpelling` | Check the spelling or clear the search. | Revisa cómo se escribe o borra la búsqueda. |
| `noEmployeeAmounts` | No employee amounts are saved for this payroll | No hay cantidades por empleado guardadas para esta nómina |
| `addsUp` | Adds up approved hours. Nothing is approved until you say so, and no money moves. | Suma las horas aprobadas. Nada se aprueba hasta que lo digas, y no se mueve dinero. |
| `otherDates` | Other dates | Otras fechas |
| `outsideSchedule` | Outside your pay schedule | Fuera de tu calendario de pago |
| `chooseDates` | Choose dates | Elegir fechas |
| `periodStart` | Period start | Inicio del período |
| `periodEnd` | Period end | Fin del período |
| `paydayField` | Payday | Día de pago |
| `showFewer` | Show fewer | Mostrar menos |
| `showAll` | Show all 2 | Mostrar los 2 |
| `datesChecked` | 2 periods need their dates checked. | 2 períodos necesitan que se verifiquen sus fechas. |
| `scheduledPaydayLead` | Scheduled payday  | Día de pago programado  |
| `checkDates` | Check dates | Verificar fechas |
| `prepare` | Prepare | Preparar |
| `checkPeriodDates` | Check this period’s dates | Verifica las fechas de este período |
| `confirmBoundaries` |  Confirm these period boundaries and payday before you prepare it. |  Confirma el inicio, el fin y el día de pago de este período antes de prepararlo. |
| `usesSettings` | Uses your saved payroll settings. You review its timecards and amounts, then approve it separately. | Usa tus ajustes de nómina guardados. Revisas sus tarjetas de tiempo y cantidades, y luego la apruebas aparte. |
| `reviewedTransition` | I reviewed this schedule transition, period boundaries and payday. | Revisé este cambio de calendario, el inicio y el fin del período y el día de pago. |
| `moreFollow` | 2 more periods follow. Prepare one to see the next oldest. | Siguen 2 períodos más. Prepara uno para ver el siguiente más antiguo. |
| `payrolls` | Payrolls | Nóminas |
| `noPayrolls` | No payrolls yet | Todavía no hay nóminas |
| `prepareFromUpNext` | Prepare payroll from Up next. | Prepara la nómina desde Lo próximo. |

### settings

| Key | English | Spanish |
|---|---|---|
| `title` | Payroll settings | Ajustes de nómina |
| `payroll` | Payroll | Nómina |
| `scope` | Calculate pay and share statements. You pay your team outside NEVORA. | Calcula el pago y comparte los comprobantes. Tú le pagas a tu equipo fuera de NEVORA. |
| `loading` | Loading payroll settings… | Cargando los ajustes de nómina… |
| `tryAgain` | Try again | Intentar de nuevo |
| `unsavedStart` | These are unsaved starting preferences. Choose your company settings and an effective date. | Estas son preferencias iniciales sin guardar. Elige los ajustes de tu empresa y una fecha de vigencia. |
| `unsavedNative` | Native payroll uses verified recorded time and employee payroll facts. | La nómina en NEVORA usa el tiempo registrado verificado y los datos de nómina de cada empleado. |
| `unsavedImported` | imported provider amounts remain the authority. | las cantidades importadas del proveedor siguen siendo las que valen. |
| `people` | People | Personas |
| `peopleDifferent` | People with different settings | Personas con otros ajustes |
| `none` | None | Ninguna |
| `payrollAccess` | Payroll access | Acceso a la nómina |
| `ownerOnly` | Owner only | Solo el dueño |
| `payrollSetup` | Payroll setup | Configuración de nómina |
| `payrollSetupDetail` | Wages, withholding and opening balances | Salarios, retenciones y saldos iniciales |
| `changeHistory` | Change history | Historial de cambios |
| `changedBy` | 2 changed this {b} | 2 lo cambió el {b} |
| `changed` | Changed 2 | Cambiado el 2 |
| `noChanges` | No changes saved yet | Todavía no se ha guardado ningún cambio |
| `revisionLine` | Revision 2 · Effective {b} | Revisión 2 · Vigente desde {b} |
| `recorded` | Recorded 2 | Registrado 2 |
| `noRevisions` | No settings revisions have been saved. | No se ha guardado ninguna revisión de los ajustes. |
| `wholeNumber` | 2 must be a whole number from {b} to {c}. | 2 tiene que ser un número entero de {b} a {c}. |
| `percentRange` | Rule percentages must be between 0 and 100. | Los porcentajes de las reglas tienen que estar entre 0 y 100. |
| `checkPreferences` | Check payroll preferences. | Revisa las preferencias de nómina. |
| `checkException` | Check this employee exception. | Revisa esta excepción del empleado. |
| `companyDefaults` | Company defaults, revision 2 | Valores de la empresa, revisión 2 |
| `frequencies.WEEKLY` | Weekly | Semanal |
| `frequencies.BIWEEKLY` | Every two weeks | Cada dos semanas |
| `frequencies.SEMIMONTHLY` | Twice a month | Dos veces al mes |
| `frequencies.MONTHLY` | Monthly | Mensual |
| `notSet` | Not set | Sin configurar |
| `daysAfter` | 2 days after | 2 días después |
| `periodEnd` | Period end | Al final del período |
| `off` | Off | Desactivados |
| `onPayday` | On payday | El día de pago |
| `daysBefore` | 2 days before | 2 días antes |
| `paySchedule` | Pay schedule | Calendario de pago |
| `howOften` | How often | Frecuencia |
| `frequency` | Frequency | Frecuencia |
| `payday` | Payday | Día de pago |
| `paydayAfter` | Payday after period end | Día de pago después del cierre del período |
| `paydayAfterHelp` | Days after the period ends. | Días después de que termina el período. |
| `firstPeriod` | First period | Primer período |
| `started` | Started 2 | Empezó el 2 |
| `starts` | Starts 2 | Empieza el 2 |
| `anchorDate` | Schedule anchor date | Fecha de referencia del calendario |
| `anchorNoteA` | Weekly and every-two-week periods begin on the anchor date. Twice-a-month periods are days  | Los períodos semanales y de cada dos semanas empiezan en la fecha de referencia. Los períodos de dos veces al mes son los días  |
| `anchorNoteRange1` | 1–15 | 1–15 |
| `anchorNoteAnd` |  and  |  y  |
| `anchorNoteRange2` | 16–month end | 16–fin de mes |
| `anchorNoteB` | ; monthly periods use calendar months. For those schedules, the anchor is the date automation begins. | ; los períodos mensuales usan meses calendario. En esos calendarios, la fecha de referencia es cuando empieza la automatización. |
| `remindersGroup` | Reminders and pay statements | Recordatorios y comprobantes de pago |
| `payrollReminders` | Payroll reminders | Recordatorios de nómina |
| `draftsNote` | NEVORA prepares drafts and waits for the amounts and exceptions they need. Someone who can approve payroll still approves each one. | NEVORA prepara borradores y espera las cantidades y excepciones que necesitan. Alguien que pueda aprobar la nómina aprueba cada uno. |
| `prepareDrafts` | Prepare scheduled drafts | Preparar los borradores programados |
| `shareAfterApproval` | Share pay statements after payroll is approved | Compartir los comprobantes de pago después de aprobar la nómina |
| `nativeShareNote` | After you approve payroll, NEVORA makes and checks each pay statement, then shares it with the employee. Approving doesn’t send any payment. | Después de que apruebas la nómina, NEVORA prepara y verifica cada comprobante de pago y luego lo comparte con el empleado. Aprobar no envía ningún pago. |
| `queueNotices` | Queue private payroll notices | Poner en cola notificaciones privadas de nómina |
| `reminderWindow` | Preparation reminder window | Plazo del recordatorio de preparación |
| `reminderWindowHelp` | Remind once within this many days before payday; 0 is payday. A missed window can catch up with one current actionable notice. | Recuerda una vez dentro de esta cantidad de días antes del día de pago; 0 es el día de pago. Si se pasa el plazo, se puede recuperar con una notificación vigente que requiera acción. |
| `noticeNote` | The notice preference also enables statement-availability notices after pay statements are shared. Notices contain generic private references. Eligibility, consent and current access are checked separately; queued does not mean delivered. | La preferencia de notificaciones también activa las notificaciones de comprobante disponible después de compartir los comprobantes de pago. Las notificaciones llevan referencias privadas genéricas. La elegibilidad, el consentimiento y el acceso actual se verifican aparte; en cola no quiere decir entregado. |
| `noticeOff` | Notice sending is turned off, so queued notices aren’t sent. | El envío de notificaciones está desactivado, así que las notificaciones en cola no se envían. |
| `statementLanguage` | Pay statement language | Idioma del comprobante de pago |
| `companyName` | Company name on documents | Nombre de la empresa en los documentos |
| `defaultLanguage` | Default statement language | Idioma predeterminado del comprobante |
| `providerPreference` | Payroll provider preference | Proveedor de nómina preferido |
| `noProvider` | No provider preference saved | No se ha guardado un proveedor preferido |
| `otherProvider` | Other provider or accountant | Otro proveedor o contador |
| `nativeProviderNote` | NEVORA payroll uses finalized timecards and each employee’s payroll details. Past payrolls imported from a provider keep their imported amounts. | La nómina en NEVORA usa las tarjetas de tiempo finalizadas y los datos de nómina de cada empleado. Las nóminas anteriores importadas de un proveedor conservan sus cantidades importadas. |
| `importedProviderNote` | This saves your preference only. It doesn’t connect an account or check the provider’s file format. Every provider uses the standard payroll import for now. | Esto solo guarda tu preferencia. No conecta una cuenta ni verifica el formato de archivo del proveedor. Por ahora, todos los proveedores usan la importación de nómina estándar. |
| `deductionsGroup` | Deductions and contributions | Deducciones y aportaciones |
| `rulesNote` | These rules record company policy and what each employee chose. The actual amounts come from the provider import. A missing setting doesn’t mean zero tax or an exemption. | Estas reglas registran la política de la empresa y lo que eligió cada empleado. Las cantidades reales vienen de la importación del proveedor. Que falte un ajuste no quiere decir que no haya contribuciones ni una exención. |
| `addRule` | Add rule | Añadir regla |
| `paymentInstructions` | Payment instructions | Instrucciones de pago |
| `standardFile` | Standard file | Archivo estándar |
| `paymentFormat` | Payment file format | Formato del archivo de pago |
| `noPaymentFile` | No payment file set up | No hay un archivo de pago configurado |
| `standardFileUntested` | Standard file · not yet tested with your bank | Archivo estándar · todavía no se ha probado con tu banco |
| `bankPlan` | Bank you plan to use (for your records) | Banco que piensas usar (para tus registros) |
| `noBank` | No bank preference saved | No se ha guardado un banco preferido |
| `popularText` | Popular Web Cash Manager · text | Popular Web Cash Manager · texto |
| `popularNacha` | Popular Web Cash Manager · NACHA | Popular Web Cash Manager · NACHA |
| `popularManual` | Popular commercial · manual | Popular comercial · manual |
| `otherBank` | Other bank or file type | Otro banco o tipo de archivo |
| `paymentNote` | This saves how you plan to pay. NEVORA hasn’t tested the file with your bank. It makes a standard payment file; it doesn’t send payments or confirm that your bank processed them. | Esto guarda cómo piensas pagar. NEVORA no ha probado el archivo con tu banco. Prepara un archivo de pago estándar; no envía pagos ni confirma que tu banco los procesó. |
| `effectiveDate` | Effective date | Fecha de vigencia |
| `reasonForChange` | Reason for change | Razón del cambio |
| `approvedNote` | Approved payroll doesn’t change. Drafts that aren’t approved yet need a new review after settings or exceptions change. | La nómina aprobada no cambia. Los borradores que todavía no se han aprobado necesitan otra revisión cuando cambian los ajustes o las excepciones. |
| `saving` | Saving… | Guardando… |
| `saveCompany` | Save company preferences | Guardar preferencias de la empresa |
| `paydayOffset` | Payday offset | Días hasta el día de pago |
| `noRules` | No rules configured. Imported payroll amounts are still required. | No hay reglas configuradas. Las cantidades de nómina importadas siguen siendo necesarias. |
| `rule` | Rule 2 | Regla 2 |
| `ruleName` | Rule name | Nombre de la regla |
| `type` | Type | Tipo |
| `employeeDeduction` | Employee deduction | Deducción del empleado |
| `employerContribution` | Employer contribution | Aportación patronal |
| `method` | Method | Método |
| `fixedAmount` | Fixed USD amount | Cantidad fija en USD |
| `percentOfGrossOption` | Percentage of gross | Porcentaje del bruto |
| `amountUsd` | Amount in USD | Cantidad en USD |
| `percentOfGross` | Percent of gross | Porcentaje del bruto |
| `appliesTo` | Applies to | Aplica a |
| `allEmployees` | All employees | Todos los empleados |
| `employeeElection` | Employee election | Elección del empleado |
| `whoSends` | Who sends it | Quién la envía |
| `employer` | Employer | Patrono |
| `provider` | Payroll provider | Proveedor de nómina |
| `whoSendsHelp` | For your records. NEVORA doesn’t send payments. | Para tus registros. NEVORA no envía pagos. |
| `effectiveFrom` | Effective from | Vigente desde |
| `effectiveThrough` | Effective through · optional | Vigente hasta · opcional |
| `usdCap` | USD cap · optional | Tope en USD · opcional |
| `noCap` | No cap configured | Sin tope configurado |
| `removeRule` | Remove rule 2 | Quitar regla 2 |
| `futureImpact` | Future draft impact | Efecto en borradores futuros |
| `noImpact` | No affected future drafts were returned by the server. | El servidor no devolvió ningún borrador futuro afectado. |
| `employeeExceptions` | Employee exceptions | Excepciones de empleados |
| `exceptionsDescription` | Employees inherit company defaults unless an authorized exception takes effect. | Los empleados heredan los valores de la empresa, a menos que entre en vigor una excepción autorizada. |
| `employee` | Employee | Empleado |
| `chooseEmployee` | Choose an employee | Elige un empleado |
| `exceptionRevision` | Exception revision 2 ·  | Revisión de la excepción 2 ·  |
| `exceptionNative` | Wage, withholding and deduction details are checked separately from the statement language. | Los datos de salario, retenciones y deducciones se verifican aparte del idioma del comprobante. |
| `exceptionImported` | Provider imports still set the actual gross and net pay. | Las importaciones del proveedor siguen fijando el pago bruto y neto real. |
| `exceptionLanguage` | Statement language | Idioma del comprobante |
| `inheritLanguage` | Inherit company language | Usar el idioma de la empresa |
| `inheritRules` | Inherit company deduction and contribution rules | Usar las reglas de deducciones y aportaciones de la empresa |
| `addEmployeeRule` | Add employee rule | Añadir regla del empleado |
| `exceptionEffective` | Exception effective date | Fecha de vigencia de la excepción |
| `exceptionReason` | Exception reason | Razón de la excepción |
| `saveException` | Save employee exception | Guardar excepción del empleado |
| `accessNativeDescription` | Manager access must be assigned for specific payroll locations. | El acceso de un gerente se tiene que asignar para localidades de nómina específicas. |
| `accessNativeNote` | Scheduling access alone does not grant payroll access. Review and approval use the Owner’s current payroll location permissions. | El acceso al horario por sí solo no da acceso a la nómina. La revisión y la aprobación usan los permisos actuales de localidades de nómina del dueño. |
| `accessDescription` | Manager time-review permission does not grant access to financial records. | El permiso de un gerente para revisar el tiempo no da acceso a los registros financieros. |
| `grantRecipient` | Grant recipient | Persona que recibe el acceso |
| `reviewAccess` | Review payroll amounts and documents | Revisar las cantidades y los documentos de nómina |
| `approveAccess` | Approve an exact reviewed payroll revision | Aprobar una revisión exacta de nómina ya revisada |
| `accessReason` | Access change reason | Razón del cambio de acceso |
| `accessNote` | Approval requires review access. Clear both permissions to revoke this grant. The server checks the current grant on every action. | Para aprobar hace falta acceso de revisión. Quita los dos permisos para revocar este acceso. El servidor verifica el acceso actual en cada acción. |
| `saveAccess` | Save payroll access | Guardar acceso a la nómina |
| `chooseDate` | Choose a date | Elige una fecha |
| `payrollPages` | Payroll pages | Páginas de nómina |

### native

| Key | English | Spanish |
|---|---|---|
| `fields.choose` | Choose… | Elige… |
| `fields.notMapped` | Not mapped | Sin asignar |
| `fields.locations` | Payroll locations | Localidades de nómina |
| `fields.inactive` |  · Inactive |  · Inactiva |
| `fields.noLocations` | No payroll locations are available. | No hay localidades de nómina disponibles. |
| `review.taxLabels.PR_INCOME_TAX` | Puerto Rico income tax | Contribución sobre ingresos de Puerto Rico |
| `review.taxLabels.SOCIAL_SECURITY` | Social Security | Seguro Social |
| `review.taxLabels.MEDICARE` | Medicare | Medicare |
| `review.taxLabels.ADDITIONAL_MEDICARE` | Additional Medicare | Medicare adicional |
| `review.taxLabels.SINOT` | SINOT | SINOT |
| `review.earningLabels.REGULAR` | Regular pay | Pago regular |
| `review.earningLabels.OVERTIME` | Overtime pay | Pago de horas extra |
| `review.earningLabels.FLSA_TRUE_UP` | Overtime adjustment | Ajuste de horas extra |
| `review.sec` | sec | s |
| `review.grossPay` | Gross pay | Pago bruto |
| `review.netPay` | Net pay | Pago neto |
| `review.ssWages` | Social Security wages | Salarios del Seguro Social |
| `review.medicareWages` | Medicare wages | Salarios de Medicare |
| `review.sinotWages` | SINOT wages | Salarios de SINOT |
| `review.employerPrefix` | Employer · 2 | Patrono · 2 |
| `review.ytdLabel` | Year to date 2 | Acumulado del año 2 |
| `review.ytd` | Year to date | Acumulado del año |
| `review.before` | Before | Antes |
| `review.after` | After | Después |
| `review.notSupplied` | Not supplied | No provisto |
| `review.regularTime` | Regular time | Tiempo regular |
| `review.overtime` | Overtime | Horas extra |
| `review.unpaidBreaks` | Unpaid breaks | Descansos sin pago |
| `review.earningsTitle` | Earnings from recorded time | Ingresos del tiempo registrado |
| `review.baseWage` | Base wage | Salario base |
| `review.locationReference` | Location reference | Referencia de la localidad |
| `review.wageRevision` | Wage revision | Revisión del salario |
| `review.taxesTitle` | Taxes & deductions | Contribuciones y deducciones |
| `review.taxablePay` | Taxable pay | Pago tributable |
| `review.sourceDetails` | Source and calculation details | Detalles de la fuente y del cálculo |
| `review.inputReference` | Input reference | Referencia de los datos |
| `review.rulesReference` | Rules reference | Referencia de las reglas |
| `review.ruleset` | Ruleset | Conjunto de reglas |
| `review.wageRounding` | Wage rounding | Redondeo del salario |
| `review.prWithholding` | Puerto Rico withholding | Retención de Puerto Rico |
| `review.provisionalTitle` | Provisional calculation policy | Política de cálculo provisional |
| `review.provisionalLine` | This version uses a temporary calculation policy that the Owner chose and saved. Choosing it doesn’t confirm that the payroll meets legal requirements. | Esta versión usa una política de cálculo temporal que el dueño eligió y guardó. Elegirla no confirma que la nómina cumpla con los requisitos legales. |
| `review.policyReference` | Policy reference | Referencia de la política |
| `review.savedPolicyRecord` | Saved policy record | Registro guardado de la política |
| `review.federalTitle` | Calculated Social Security and Medicare withholding | Retención calculada del Seguro Social y Medicare |
| `review.federalLine` | Saved nearest-cent withholding calculated for Social Security, Medicare and Additional Medicare. This does not confirm payment or remittance. | Retención guardada, redondeada al centavo más cercano, calculada para el Seguro Social, Medicare y Medicare adicional. Esto no confirma el pago ni el envío. |
| `review.rate` | Rate | Tasa |
| `review.basisPoints` | basis points | puntos básicos |
| `review.exactCents` | Exact cents | Centavos exactos |
| `review.roundedMinusExact` | Rounded minus exact | Redondeado menos exacto |
| `review.cents` | cents | centavos |
| `review.calculationRule` | Calculation rule | Regla de cálculo |
| `review.otherRules` | Other withholding, wage and contribution rules retain their separate evidence. | Las demás reglas de retención, salario y aportaciones conservan su propia evidencia. |
| `review.workweekTitle` | Workweek evidence | Evidencia de la semana laboral |
| `review.savedBoundary` | Saved weekly boundary: | Límite semanal guardado: |
| `review.weekdays[0]` |  |  |
| `review.weekdays[1]` | Monday | lunes |
| `review.weekdays[2]` | Tuesday | martes |
| `review.weekdays[3]` | Wednesday | miércoles |
| `review.weekdays[4]` | Thursday | jueves |
| `review.weekdays[5]` | Friday | viernes |
| `review.weekdays[6]` | Saturday | sábado |
| `review.weekdays[7]` | Sunday | domingo |
| `review.policyRevision` | Policy revision | Revisión de la política |
| `review.policySource` | Policy source | Origen de la política |
| `review.absenceSource` | Documented absence of employer notice | Ausencia documentada de aviso del patrono |
| `review.noticeSource` | Documented employer notice | Aviso documentado del patrono |
| `review.federalEvidence` | Federal week evidence | Evidencia de la semana federal |
| `review.recordedContext` | Recorded context | Contexto registrado |
| `review.fullContext` | Full weekly context | Contexto semanal completo |
| `review.dailyInterpretation` | Daily interpretation | Interpretación diaria |
| `review.dailyAssessment` | Daily input assessment | Evaluación de los datos diarios |
| `review.shiftStartDay` | Each shift counts on the day it starts, even when it ends after midnight. Daily overtime is time over 8 hours in that day, and each minute counts once. The workweek and the pay period still split at the exact time. | Cada turno cuenta el día en que empieza, aunque termine después de la medianoche. Las horas extra diarias son el tiempo que pasa de 8 horas en ese día, y cada minuto cuenta una sola vez. La semana laboral y el período de pago se siguen dividiendo a la hora exacta. |
| `review.civilDays` | Civil days begin at midnight. All recorded time, including 00:00–00:01, is assigned once. The saved weekly boundary is evaluated separately. Daily/rest treatment follows the saved provisional calculation policy. | Los días civiles empiezan a la medianoche. Todo el tiempo registrado, incluido el de 00:00–00:01, se asigna una sola vez. El límite semanal guardado se evalúa por separado. El trato diario y de descanso sigue la política de cálculo provisional guardada. |
| `review.unresolved` | Daily precision remains unresolved. This saved source has no entries intersecting 00:00–00:01, and is invariant under the two retained daily models. A weekly policy does not certify a daily rule. | La precisión diaria sigue sin resolver. Esta fuente guardada no tiene entradas que crucen 00:00–00:01, y no cambia con ninguno de los dos modelos diarios conservados. Una política semanal no certifica una regla diaria. |
| `review.savedResults` | These are the saved calculation results for this revision. Approval checks current recorded time and payroll facts again. | Estos son los resultados del cálculo guardados para esta revisión. Al aprobar, se vuelven a verificar el tiempo registrado y los datos de nómina actuales. |
| `config.loadingTitle` | Loading employee payroll facts | Cargando los datos de nómina del empleado |
| `config.loadingLine` | Checking current Owner access. | Verificando el acceso actual del dueño. |
| `config.unavailableTitle` | Employee payroll facts unavailable | Los datos de nómina del empleado no están disponibles |
| `config.sourcesTitle` | Configuration choices unavailable | Las opciones de configuración no están disponibles |
| `config.sourcesLine` | Reload this page to check the current employee, location and break-type sources before editing. | Vuelve a cargar esta página para verificar los empleados, las localidades y los tipos de descanso actuales antes de editar. |
| `config.factsTitle` | Employee payroll facts | Datos de nómina del empleado |
| `config.factsDescription` | Document actual wages, withholding and workweek evidence. Saving facts does not approve payroll. | Documenta los salarios reales, la retención y la evidencia de la semana laboral. Guardar los datos no aprueba la nómina. |
| `config.employee` | Employee | Empleado |
| `config.employeeAria` | Employee payroll facts recipient | Empleado de los datos de nómina |
| `config.chooseEmployee` | Choose an employee | Elige un empleado |
| `config.chooseEmployeeLine` | Choose an employee to review saved facts and incomplete setup. Missing information remains missing. | Elige un empleado para revisar los datos guardados y la configuración incompleta. La información que falta sigue faltando. |
| `config.currentRevision` | Current revision 2 | Revisión actual 2 |
| `config.draftRevision` | Draft based on revision 2 | Borrador basado en la revisión 2 |
| `config.savedFacts` | Saved facts | Datos guardados |
| `config.wageRecords` | 2 effective wage records | 2 registros de salario vigentes |
| `config.taxSaved` | Withholding facts saved | Datos de retención guardados |
| `config.taxMissing` | Withholding facts missing | Faltan los datos de retención |
| `config.workweekSaved` | Workweek evidence saved | Evidencia de la semana laboral guardada |
| `config.workweekMissing` | Workweek evidence missing | Falta la evidencia de la semana laboral |
| `config.factsChanged` | Saved facts changed. Your draft is retained at its original revision. Review current facts before recording a replacement. | Los datos guardados cambiaron. Tu borrador se conserva en su revisión original. Revisa los datos actuales antes de registrar un reemplazo. |
| `config.reviewCurrent` | Review current facts | Revisar datos actuales |
| `config.replaceQuestion` | Replace this unsaved draft with the latest saved facts? All three configuration forms for this employee will reset. | ¿Reemplazar este borrador sin guardar con los últimos datos guardados? Los tres formularios de configuración de este empleado se reiniciarán. |
| `config.replaceDraft` | Replace draft | Reemplazar borrador |
| `config.keepEditing` | Keep editing | Seguir editando |
| `config.openingTitle` | Opening balances | Balances iniciales |
| `config.openingDescription` | Separately attest documented balances before the first native payroll. Missing differs from an attested zero. | Certifica por separado los balances documentados antes de la primera nómina calculada en NEVORA. Un dato que falta no es lo mismo que un cero certificado. |
| `config.openingRecord` | Opening record | Registro inicial |
| `config.newYear` | New documented tax year | Nuevo año contributivo documentado |
| `config.yearRevision` | Year 2 · Revision {b} | Año 2 · Revisión {b} |
| `config.loadQuestion` | Load this opening record? Unsaved opening fields will be replaced. Employee payroll facts and Manager access drafts stay in place. | ¿Cargar este registro inicial? Los campos iniciales sin guardar se reemplazarán. Los borradores de datos de nómina del empleado y de acceso del gerente se quedan como están. |
| `config.loadOpening` | Load opening record | Cargar registro inicial |
| `config.keepDraft` | Keep draft | Conservar borrador |
| `config.reloadHistory` | Reload approval history | Volver a cargar el historial de aprobaciones |
| `config.chooseAbove` | Choose an employee above. Prior gross, net and tax-specific wage bases require their own records. | Elige un empleado arriba. El bruto, el neto y las bases salariales de cada contribución anteriores necesitan sus propios registros. |
| `config.scopeTitle` | Manager payroll access | Acceso del gerente a la nómina |
| `config.scopeDescription` | Grant review or approval only for specific payroll locations. | Da permiso para revisar o aprobar solo en localidades de nómina específicas. |
| `config.chooseManager` | Choose an active Manager above. A scheduling assignment or an older grant does not establish current payroll permission. | Elige un gerente activo arriba. Una asignación en el horario o un permiso anterior no establece el permiso actual de nómina. |
| `profile.checkFacts` | Check employee payroll facts. | Verifica los datos de nómina del empleado. |
| `profile.wagesSummary` | Wages and recorded breaks | Salarios y descansos registrados |
| `profile.wagesLine` | Dates and times use Puerto Rico time. Keep effective records for every worked location. Payroll uses recorded time; these fields do not edit calculated pay. | Las fechas y horas usan la hora de Puerto Rico. Mantén registros vigentes para cada localidad trabajada. La nómina usa el tiempo registrado; estos campos no editan el pago calculado. |
| `profile.savedBreak` | Saved break reference 2 | Referencia de descanso guardada 2 |
| `profile.effectiveWage` | Effective wage 2 | Salario vigente 2 |
| `profile.removeWage` | Remove effective wage 2 | Quitar salario vigente 2 |
| `profile.hourlyWage` | Hourly wage · USD | Salario por hora · USD |
| `profile.hourlyHelp` | Up to six decimal places; no wage is assumed. | Hasta seis decimales; no se supone ningún salario. |
| `profile.wageFrom` | Wage effective from | Salario vigente desde |
| `profile.wageTo` | Wage effective until · optional | Salario vigente hasta · opcional |
| `profile.coverage` | Employment and minimum wage coverage | Cobertura de empleo y salario mínimo |
| `profile.coverageOption` | Documented hourly PR private nonexempt · standard 2026 coverage | Por hora documentado, sector privado de PR, no exento · cobertura estándar 2026 |
| `profile.overtime` | Documented overtime treatment | Trato documentado de horas extra |
| `profile.timeAndHalf` | Time and a half | Tiempo y medio |
| `profile.doublePreserved` | Preserved double-time entitlement | Derecho a tiempo doble conservado |
| `profile.savedInactive` |  · Saved/inactive |  · Guardado/inactivo |
| `profile.paidRest` | Paid rest | Descanso pagado |
| `profile.unpaidMeal` | Unpaid meal · relieved of duties | Comida sin pago · relevado de funciones |
| `profile.wageEvidence` | Wage and context evidence reference | Referencia de evidencia del salario y su contexto |
| `profile.wageAttest` | I verified that the evaluated context has no other wage premium. | Verifiqué que el contexto evaluado no tiene otra prima salarial. |
| `profile.legacy` | Preserved legacy coordinates: 2 / {b}. These are corroboration, not evidence of notice or a policy effective date. | Coordenadas anteriores conservadas: 2 / {b}. Sirven de corroboración, no de evidencia de aviso ni de la fecha de vigencia de una política. |
| `profile.addWage` | Add effective wage | Añadir salario vigente |
| `profile.workweekSummary` | Workweek evidence | Evidencia de la semana laboral |
| `profile.workweekLine` | Each effective wage retains its own workweek evidence. Edit only the interval covered by the documented record. Unknown blocks calculated amounts. A weekly notice does not establish a daily or flexitime agreement. A newly documented boundary replaces conflicting legacy corroboration; prior saved revisions remain unchanged. | Cada salario vigente conserva su propia evidencia de la semana laboral. Edita solo el intervalo que cubre el registro documentado. Si es desconocida, se bloquean las cantidades calculadas. Un aviso semanal no establece un acuerdo diario ni de horario flexible. Un límite documentado nuevo reemplaza la corroboración anterior que lo contradiga; las revisiones guardadas antes no cambian. |
| `profile.shiftDayLine` | Each shift counts on the day it starts, even when it ends after midnight. Daily overtime is time over 8 hours in that day. The workweek and pay period still split at the exact time. Keep recorded entries intact; no cent-policy election is available here. | Cada turno cuenta el día en que empieza, aunque termine después de la medianoche. Las horas extra diarias son el tiempo que pasa de 8 horas en ese día. La semana laboral y el período de pago se siguen dividiendo a la hora exacta. Conserva intactas las entradas registradas; aquí no se puede elegir otra política de centavos. |
| `profile.taxSummary` | Withholding and employer facts | Datos de retención y del patrono |
| `profile.taxEnabled` | Record documented withholding facts | Registrar datos de retención documentados |
| `profile.taxMissing` | Withholding facts remain missing. Native payroll will not calculate without them. | Siguen faltando los datos de retención. La nómina de NEVORA no se calculará sin ellos. |
| `profile.deductionSummary` | Authorized employee deductions | Deducciones autorizadas del empleado |
| `profile.deductionLine` | Record actual written post-tax authorizations and compliance evidence. A signature alone does not establish supported authority. | Registra las autorizaciones escritas reales para deducciones después de contribuciones y la evidencia de cumplimiento. Una firma sola no establece una autoridad válida. |
| `profile.deductionsReviewed` | I reviewed employee deduction records, including any absence of authorized deductions. | Revisé los registros de deducciones del empleado, incluida la ausencia de deducciones autorizadas. |
| `profile.reason` | Payroll facts change reason | Razón del cambio en los datos de nómina |
| `profile.saveLine` | This saves employee facts at draft revision 2. Changes invalidate an earlier payroll review, even if calculated cents would stay the same. | Esto guarda los datos del empleado en la revisión de borrador 2. Los cambios anulan una revisión de nómina anterior, aunque los centavos calculados no cambien. |
| `profile.save` | Save employee payroll facts | Guardar datos de nómina del empleado |
| `workweek.title` | Effective wage 2 · Workweek | Salario vigente 2 · Semana laboral |
| `workweek.savedPolicy` | Saved policy 2 · Revision {b} | Política guardada 2 · Revisión {b} |
| `workweek.status` | Workweek evidence status | Estado de la evidencia de la semana laboral |
| `workweek.unknown` | Unknown · evidence not established | Desconocida · evidencia sin establecer |
| `workweek.statutory` | Reviewed absence of employer notice | Ausencia revisada de aviso del patrono |
| `workweek.notice` | Actual employer notice | Aviso real del patrono |
| `workweek.policyFrom` | Policy effective from | Política vigente desde |
| `workweek.policyTo` | Policy effective until · optional | Política vigente hasta · opcional |
| `workweek.statutoryLine` | The documented statutory weekly boundary is Monday 00:01 in Puerto Rico. Select this only after an actual review confirming no employer notice covers this employee and interval. | El límite semanal que fija la ley y está documentado es el lunes a las 00:01 en Puerto Rico. Elige esto solo después de una revisión real que confirme que ningún aviso del patrono cubre a este empleado en este intervalo. |
| `workweek.absenceCheck` | I reviewed and confirmed the absence of employer notice for this employee and interval. | Revisé y confirmé que no hay aviso del patrono para este empleado en este intervalo. |
| `workweek.searchEvidence` | Notice search evidence reference | Referencia de evidencia de la búsqueda del aviso |
| `workweek.weekday` | Documented workweek day | Día documentado de la semana laboral |
| `workweek.weekdays[0]` | Monday | lunes |
| `workweek.weekdays[1]` | Tuesday | martes |
| `workweek.weekdays[2]` | Wednesday | miércoles |
| `workweek.weekdays[3]` | Thursday | jueves |
| `workweek.weekdays[4]` | Friday | viernes |
| `workweek.weekdays[5]` | Saturday | sábado |
| `workweek.weekdays[6]` | Sunday | domingo |
| `workweek.time` | Documented workweek time | Hora documentada de la semana laboral |
| `workweek.noticeReference` | Employer notice reference | Referencia del aviso del patrono |
| `workweek.delivered` | Notice delivered at | Aviso entregado el |
| `workweek.method` | Notice delivery method | Forma de entrega del aviso |
| `workweek.posted` | Accessible posting | Aviso fijado en un lugar accesible |
| `workweek.written` | Written notice to employee | Aviso escrito al empleado |
| `workweek.electronic` | Accessible electronic notice | Aviso electrónico accesible |
| `workweek.kind` | Notice type | Tipo de aviso |
| `workweek.initial` | Initial notice | Aviso inicial |
| `workweek.change` | Change to a previous policy | Cambio a una política anterior |
| `workweek.previous` | Previous policy reference · required for a change | Referencia de la política anterior · requerida para un cambio |
| `workweek.coverage` | I verified this notice covers the employee. | Verifiqué que este aviso cubre al empleado. |
| `workweek.noticeLine` | An initial notice cannot follow its effective date. A change requires five Puerto Rico calendar days of advance notice. The server validates the documented dates. | Un aviso inicial no puede ser posterior a su fecha de vigencia. Un cambio requiere un aviso con cinco días naturales de anticipación en Puerto Rico. El servidor valida las fechas documentadas. |
| `workweek.federalMatch` | I verified the same fixed boundary for the federal workweek. | Verifiqué el mismo límite fijo para la semana laboral federal. |
| `workweek.federalEvidence` | Federal workweek evidence reference | Referencia de evidencia de la semana laboral federal |
| `tax.from` | Withholding effective from | Retención vigente desde |
| `tax.to` | Withholding effective until · optional | Retención vigente hasta · opcional |
| `tax.coverage` | Employee tax coverage | Cobertura contributiva del empleado |
| `tax.coverageOption` | Documented regular PR taxable resident · standard FICA/SINOT | Residente de PR sujeto a contribución regular, documentado · FICA/SINOT estándar |
| `tax.certificateEvidence` | Signed withholding certificate reference | Referencia del certificado de retención firmado |
| `tax.certificateTitle` | Actual withholding certificate | Certificado de retención real |
| `tax.personal` | Personal exemption on certificate | Exención personal en el certificado |
| `tax.individual` | Individual · full | Individual · completa |
| `tax.marriedJoint` | Married filing jointly · full | Casado, planilla conjunta · completa |
| `tax.marriedHalf` | Married · half or optional full | Casado · mitad u opcional completa |
| `tax.noPersonal` | No personal exemption | Sin exención personal |
| `tax.fullDependents` | Full dependent exemptions | Exenciones completas por dependientes |
| `tax.halfDependents` | Half dependent exemptions | Medias exenciones por dependientes |
| `tax.allowances` | Deduction allowances | Concesiones por deducciones |
| `tax.veteran` | Veteran exemption on certificate | Exención de veterano en el certificado |
| `tax.yes` | Yes · documented | Sí · documentado |
| `tax.no` | No · documented | No · documentado |
| `tax.method` | Additional withholding method | Método de retención adicional |
| `tax.fixed` | Fixed USD amount | Cantidad fija en USD |
| `tax.percentage` | Percentage | Porcentaje |
| `tax.amount` | Additional withholding · USD | Retención adicional · USD |
| `tax.percent` | Additional withholding · percent | Retención adicional · porcentaje |
| `tax.rounding` | Gross-dollar treatment on certificate | Trato del bruto en dólares en el certificado |
| `tax.noRounding` | No gross-dollar rounding | Sin redondeo del bruto a dólares |
| `tax.nearestDollar` | Documented nearest-dollar treatment | Redondeo documentado al dólar más cercano |
| `tax.sinot` | Documented SINOT employee percent | Porcentaje documentado de SINOT del empleado |
| `tax.sinotHelp` | Actual supported employee rate, at most 0.30%. | Tasa real válida del empleado, 0.30% como máximo. |
| `tax.centLine` | Puerto Rico sub-cent withholding remains unverified for new facts. Federal employee tax collection uses its separately sourced server rule. This form does not elect another cent policy. | La retención de Puerto Rico en fracciones de centavo sigue sin verificar para datos nuevos. El cobro de la contribución federal del empleado usa su propia regla del servidor, con su fuente aparte. Este formulario no elige otra política de centavos. |
| `tax.employerTitle` | Employer applicability and rates | Aplicabilidad y tasas del patrono |
| `tax.employerLine` | Each opening wage basis must match the same-code separately attested opening balance. NEVORA advances current balances from approved native payroll. | Cada base salarial inicial tiene que coincidir con el balance inicial del mismo código certificado por separado. NEVORA actualiza los balances con la nómina aprobada calculada en NEVORA. |
| `tax.addEmployer` | Add documented employer obligation | Añadir obligación documentada del patrono |
| `tax.employerAttest` | I verified actual employer coverage, applicability, rates and supporting references. | Verifiqué la cobertura, la aplicabilidad, las tasas y las referencias reales del patrono. |
| `tax.obligation` | Employer obligation | Obligación del patrono |
| `tax.removeObligation` | Remove employer obligation 2 | Quitar obligación del patrono 2 |
| `tax.code` | Employer obligation code | Código de la obligación del patrono |
| `tax.label` | Employer obligation label | Nombre de la obligación del patrono |
| `tax.applicability` | Documented applicability | Aplicabilidad documentada |
| `tax.applicable` | Applicable · documented rate | Aplica · tasa documentada |
| `tax.exempt` | Exempt · actual exemption evidence | Exenta · evidencia real de la exención |
| `tax.rate` | Employer rate · percent | Tasa del patrono · porcentaje |
| `tax.cap` | Wage cap · USD · optional | Tope salarial · USD · opcional |
| `tax.capHelp` | Blank means uncapped only when the documented rule supports it. | En blanco significa sin tope solo cuando la regla documentada lo permite. |
| `tax.opening` | Documented opening wage basis · USD | Base salarial inicial documentada · USD |
| `tax.evidence` | Applicability and rate evidence reference | Referencia de evidencia de aplicabilidad y tasa |
| `deduction.none` | No authorized deduction rows entered. | No hay filas de deducciones autorizadas. |
| `deduction.add` | Add authorized deduction | Añadir deducción autorizada |
| `deduction.title` | Authorized deduction 2 | Deducción autorizada 2 |
| `deduction.remove` | Remove authorized deduction 2 | Quitar deducción autorizada 2 |
| `deduction.code` | Deduction code | Código de la deducción |
| `deduction.label` | Deduction label | Nombre de la deducción |
| `deduction.from` | Authorization effective from | Autorización vigente desde |
| `deduction.to` | Authorization effective until · optional | Autorización vigente hasta · opcional |
| `deduction.method` | Deduction method | Método de la deducción |
| `deduction.amount` | Authorized amount · USD | Cantidad autorizada · USD |
| `deduction.rate` | Authorized rate · percent | Tasa autorizada · porcentaje |
| `deduction.cap` | Authorization cap · USD · optional | Tope de la autorización · USD · opcional |
| `deduction.opening` | Previously withheld under this authorization · USD | Retenido antes bajo esta autorización · USD |
| `deduction.authority` | Documented deduction authority | Autoridad documentada de la deducción |
| `deduction.lawC` | Law 17 §5(c) · fixed written authorization | Ley 17 §5(c) · autorización escrita fija |
| `deduction.lawG` | Law 17 §5(g) · matched employer contribution | Ley 17 §5(g) · aportación patronal equivalente |
| `deduction.employerCode` | Matching employer contribution code | Código de la aportación patronal equivalente |
| `deduction.evidence` | Written authorization reference | Referencia de la autorización escrita |
| `deduction.compliance` | Compliance evidence reference | Referencia de evidencia de cumplimiento |
| `deduction.verified` | I verified the actual written post-tax authorization and compliance evidence. | Verifiqué la autorización escrita real para la deducción después de contribuciones y la evidencia de cumplimiento. |
| `deduction.revoked` | This authorization is revoked. | Esta autorización está revocada. |
| `opening.check` | Check documented opening balances. | Verifica los balances iniciales documentados. |
| `opening.frozen` | Opening balances are frozen by approved native payroll. Select another documented opening record to review a different year. | Los balances iniciales están congelados por una nómina aprobada calculada en NEVORA. Elige otro registro inicial documentado para revisar otro año. |
| `opening.verifying` | Checking approved opening references… | Verificando las referencias iniciales aprobadas… |
| `opening.historyError` | Approval history is unavailable. Reload current history before attesting an opening. | El historial de aprobaciones no está disponible. Vuelve a cargar el historial actual antes de certificar balances iniciales. |
| `opening.loaded` | Opening revision 2 · Year {b} · {c} | Revisión inicial 2 · Año {b} · {c} |
| `opening.none` | No opening balance is loaded for this draft. | No hay un balance inicial cargado para este borrador. |
| `opening.explain` |  These are same-employer cumulative balances before NEVORA’s first native payroll. Approved payroll freezes its referenced opening; editing is rejected by the server. |  Estos son los balances acumulados con el mismo patrono antes de la primera nómina calculada en NEVORA. La nómina aprobada congela el balance inicial al que se refiere; el servidor rechaza cualquier edición. |
| `opening.year` | Opening tax year | Año contributivo inicial |
| `opening.gross` | Opening gross pay · USD | Pago bruto inicial · USD |
| `opening.net` | Opening net pay · USD | Pago neto inicial · USD |
| `opening.socialSecurity` | Opening Social Security wages · USD | Salarios iniciales del Seguro Social · USD |
| `opening.medicare` | Opening Medicare wages · USD | Salarios iniciales de Medicare · USD |
| `opening.sinot` | Opening SINOT wages · USD | Salarios iniciales de SINOT · USD |
| `opening.separately` | Enter each actual balance separately, including documented zero. Gross is not a substitute for every tax-specific wage base. | Escribe cada balance real por separado, incluido un cero documentado. El bruto no sustituye la base salarial de cada contribución. |
| `opening.withheld` | Employee amounts already withheld | Cantidades ya retenidas al empleado |
| `opening.assessed` | Employer contributions already assessed | Aportaciones patronales ya calculadas |
| `opening.wageBases` | Employer-specific opening wage bases | Bases salariales iniciales de cada patrono |
| `opening.evidenceSummary` | Opening record evidence | Evidencia del registro inicial |
| `opening.evidence` | Opening balance evidence reference | Referencia de evidencia del balance inicial |
| `opening.fingerprint` | Opening record SHA-256 | SHA-256 del registro inicial |
| `opening.fingerprintHelp` | Use the documented 64-character fingerprint of the opening record. No fingerprint or ledger balance is inferred. | Usa la huella documentada de 64 caracteres del registro inicial. No se deduce ninguna huella ni ningún balance del libro. |
| `opening.attest` | I verified these documented balances before the first native payroll, including any entered zeros. | Verifiqué estos balances documentados antes de la primera nómina calculada en NEVORA, incluidos los ceros que escribí. |
| `opening.reason` | Opening balance change reason | Razón del cambio en el balance inicial |
| `opening.submit` | Attest opening balances | Certificar balances iniciales |
| `opening.balanceCode` | Balance code | Código del balance |
| `opening.documentedAmount` | Documented amount · USD | Cantidad documentada · USD |
| `opening.removeRow` | Remove 2 row {b} | Quitar fila {b} de 2 |
| `opening.noEntries` | No opening entries supplied in this category. | No hay entradas iniciales en esta categoría. |
| `opening.addEntry` | Add opening entry | Añadir entrada inicial |
| `scope.check` | Check current Manager scope. | Verifica el alcance actual del gerente. |
| `scope.revision` | Scope revision 2. The server verifies the current active Manager role and locations on every save and payroll action. | Revisión del alcance 2. El servidor verifica el rol de gerente activo y las localidades actuales cada vez que se guarda o se hace una acción de nómina. |
| `scope.review` | Review payroll amounts and private documents | Revisar las cantidades de nómina y los documentos privados |
| `scope.approve` | Approve a separately reviewed payroll revision | Aprobar una revisión de nómina revisada por separado |
| `scope.line` | Approval requires review and explicit locations. Clear both permissions to revoke payroll access; no wildcard or primary-location permission is inferred. | Aprobar requiere el permiso de revisar y localidades específicas. Quita ambos permisos para retirar el acceso a la nómina; no se supone ningún permiso general ni de localidad principal. |
| `scope.reason` | Manager payroll access change reason | Razón del cambio en el acceso del gerente a la nómina |
| `scope.save` | Save Manager payroll access | Guardar acceso del gerente a la nómina |
| `form.enter` | Enter 2. | Escribe 2. |
| `form.choose` | Choose 2. | Elige 2. |
| `form.confirm` | Confirm 2. | Confirma 2. |
| `form.wholeNumber` | Enter a whole number from 0 to 2 for {b}. | Escribe un número entero de 0 a 2 para {b}. |
| `form.validDate` | Enter a valid date for 2. | Escribe una fecha válida para 2. |
| `form.validInstant` | Enter a valid Puerto Rico date and time for 2. | Escribe una fecha y hora de Puerto Rico válidas para 2. |
| `form.percentage` | Check the percentage for 2. | Revisa el porcentaje de 2. |
| `form.locations` | Choose explicit payroll locations. | Elige localidades de nómina específicas. |
| `form.balanceCodes` | Use unique payroll balance codes. | Usa códigos de balance de nómina que no se repitan. |
| `form.hourlyDecimals` | Enter an hourly wage with up to six decimal places. | Escribe un salario por hora con hasta seis decimales. |
| `form.hourlyPositive` | Enter a positive hourly wage. | Escribe un salario por hora mayor que cero. |
| `form.weekday` | Choose the workweek day. | Elige el día de la semana laboral. |
| `form.clock` | Enter the documented time as HH:mm. | Escribe la hora documentada como HH:mm. |
| `form.addWage` | Add an effective wage. | Añade un salario vigente. |
| `form.fingerprint` | Use the documented 64-character opening record SHA-256. | Usa el SHA-256 documentado de 64 caracteres del registro inicial. |
| `form.approvalNeedsReview` | Approval requires review permission. | Aprobar requiere el permiso de revisar. |
| `form.labels.federalMatch` | the same fixed federal workweek | la misma semana laboral federal fija |
| `form.labels.noticeAbsence` | the reviewed absence of employer notice | la ausencia revisada de aviso del patrono |
| `form.labels.policyEvidence` | the notice search evidence reference | la referencia de evidencia de la búsqueda del aviso |
| `form.labels.noticeReference` | the actual employer notice reference | la referencia del aviso real del patrono |
| `form.labels.noticeCoverage` | this employee’s notice coverage | que el aviso cubre a este empleado |
| `form.labels.previousPolicy` | the preceding policy reference | la referencia de la política anterior |
| `form.labels.policyClock` | the documented workweek time | la hora documentada de la semana laboral |
| `form.labels.federalEvidence` | the federal week evidence reference | la referencia de evidencia de la semana federal |
| `form.labels.wageScope` | the supported employment and minimum wage coverage | la cobertura válida de empleo y salario mínimo |
| `form.labels.wageAttest` | the documented standard wage context | el contexto salarial estándar documentado |
| `form.labels.wageEvidence` | the wage/context evidence reference | la referencia de evidencia del salario y su contexto |
| `form.labels.taxCoverage` | the supported PR resident/FICA/SINOT coverage | la cobertura válida de residente de PR, FICA y SINOT |
| `form.labels.certificateEvidence` | the actual withholding certificate reference | la referencia del certificado de retención real |
| `form.labels.employerAttest` | documented employer applicability and rates | la aplicabilidad y las tasas documentadas del patrono |
| `form.labels.employerEvidence` | the actual employer applicability/rate reference | la referencia real de aplicabilidad y tasa del patrono |
| `form.labels.deductionsReviewed` | the reviewed employee deduction records, including any absence | que revisaste los registros de deducciones del empleado, incluida su ausencia |
| `form.labels.deductionAuthorization` | documented written post-tax authorization | la autorización escrita documentada para la deducción después de contribuciones |
| `form.labels.openingFingerprint` | the documented opening record fingerprint | la huella documentada del registro inicial |
| `form.labels.openingAttest` | the documented balances before the first native payroll | los balances documentados antes de la primera nómina calculada en NEVORA |
| `api.unreadable` | Employee payroll facts could not be read. Reload current Owner access. | No pudimos leer los datos de nómina del empleado. Vuelve a cargar el acceso actual del dueño. |
| `api.wages` | The saved wage facts are incomplete. Reload before editing. | Los datos de salario guardados están incompletos. Vuelve a cargar antes de editar. |
| `api.withholding` | The saved withholding facts are incomplete. | Los datos de retención guardados están incompletos. |
| `api.deductions` | The saved deduction facts are incomplete. | Los datos de deducciones guardados están incompletos. |
| `api.opening` | The opening payroll balances could not be read. | No pudimos leer los balances iniciales de nómina. |
| `api.scope` | The current Manager payroll scope could not be read. | No pudimos leer el alcance actual del gerente en la nómina. |

### status

| Key | English | Spanish |
|---|---|---|
| `notice.enabled` | Notice transport is enabled. Current access, consent and saved notice preferences are checked for each delivery. A queued notice is not a delivery confirmation. | El envío de notificaciones está activado. En cada entrega se verifican el acceso actual, el consentimiento y las preferencias de notificación guardadas. Una notificación en cola no confirma la entrega. |
| `notice.disabled` | Notice delivery is disabled. Private notice requests may be queued, but this environment will not send them. | El envío de notificaciones está desactivado. Las solicitudes de notificaciones privadas pueden quedar en cola, pero este entorno no las enviará. |
| `notice.outcome.QUEUED` | Notice queued. Sending and receipt are not confirmed. | Notificación en cola. No se ha confirmado el envío ni el recibo. |
| `notice.outcome.QUEUED_DELIVERY_DISABLED` | Notice queued while delivery was disabled. Sending and receipt are not confirmed. | Notificación en cola mientras el envío estaba desactivado. No se ha confirmado el envío ni el recibo. |
| `notice.outcome.NO_CURRENT_RECIPIENTS` | No currently eligible recipients. No notice was queued. | No hay destinatarios elegibles ahora. No se puso ninguna notificación en cola. |
| `notice.outcome.NOT_SENT_STUB` | Legacy preparation only. No notice was sent. | Solo preparación anterior. No se envió ninguna notificación. |
| `notice.outcome.none` | No queue result recorded yet. Sending and receipt are not confirmed. | Todavía no hay un resultado de la cola. No se ha confirmado el envío ni el recibo. |
| `backlog.overflow` | The history scan reached its limit. The missing-period count is unavailable; review older settings and original runs before preparing catch-up drafts. | La búsqueda en el historial llegó a su límite. No está disponible el conteo de períodos sin nómina; revisa los ajustes anteriores y las nóminas originales antes de preparar borradores atrasados. |
| `backlog.missing` | 2 earlier pay periods have no payroll yet. Start with the oldest. | 2 períodos de pago anteriores todavía no tienen nómina. Empieza por el más antiguo. |
| `blockers.RECORDED_SOURCE_COVERAGE_MISSING` | Review and finalize the employee timecards, including confirmed zero-hour periods, before recalculating. | Revisa y finaliza las tarjetas de tiempo de los empleados, incluidos los períodos confirmados sin horas, antes de recalcular. |
| `blockers.RECORDED_SOURCE_STALE` | Refresh and review the recorded timecards, then recalculate. | Actualiza y revisa las tarjetas de tiempo registradas y luego recalcula. |
| `blockers.RECORDED_SOURCE_STALE_SOURCE` | Refresh and review the recorded timecards, then recalculate. | Actualiza y revisa las tarjetas de tiempo registradas y luego recalcula. |
| `blockers.STALE_TIMECARD_SOURCE` | Refresh and review the recorded timecards, then recalculate. | Actualiza y revisa las tarjetas de tiempo registradas y luego recalcula. |
| `blockers.RECORDED_SOURCE_UNAVAILABLE` | Recorded timecards are unavailable. Reload their current status before recalculating. | Las tarjetas de tiempo registradas no están disponibles. Vuelve a cargar su estado actual antes de recalcular. |
| `blockers.OPEN_RECORDED_TIME` | Complete and review the open recorded time or break before recalculating. | Completa y revisa el tiempo o el descanso registrado que sigue abierto antes de recalcular. |
| `blockers.OPEN_RECORDED_BREAK` | Complete and review the open recorded time or break before recalculating. | Completa y revisa el tiempo o el descanso registrado que sigue abierto antes de recalcular. |
| `blockers.RECORDED_SOURCE_UNRESOLVED_TIME` | Complete and review the open recorded time or break before recalculating. | Completa y revisa el tiempo o el descanso registrado que sigue abierto antes de recalcular. |
| `blockers.TIME_FINALIZATION_REQUIRED` | Review and finalize the included recorded timecards. | Revisa y finaliza las tarjetas de tiempo registradas que están incluidas. |
| `blockers.FINALIZED_TIME_REQUIRED` | Review and finalize the included recorded timecards. | Revisa y finaliza las tarjetas de tiempo registradas que están incluidas. |
| `blockers.RECORDED_SOURCE_NOT_FINALIZED` | Review and finalize the included recorded timecards. | Revisa y finaliza las tarjetas de tiempo registradas que están incluidas. |
| `blockers.PENDING_CORRECTIONS` | A time correction is still waiting for review. Review it in Timecards, then recalculate. | Una corrección de tiempo todavía espera revisión. Revísala en Tarjetas de tiempo y luego recalcula. |
| `blockers.OVERLAPPING_RECORDED_TIME` | Two recorded times overlap. Fix the overlap in Timecards, then recalculate. | Dos tiempos registrados se solapan. Corrige el solapamiento en Tarjetas de tiempo y luego recalcula. |
| `blockers.CONFLICTING_RECORDED_SOURCE` | Two recorded times overlap. Fix the overlap in Timecards, then recalculate. | Dos tiempos registrados se solapan. Corrige el solapamiento en Tarjetas de tiempo y luego recalcula. |
| `blockers.COMPLETE_CONTEXT_REQUIRED` | NEVORA needs finalized timecards for the days just before and after this period to work out overtime. Finalize them, then recalculate. | NEVORA necesita las tarjetas de tiempo finalizadas de los días justo antes y después de este período para calcular las horas extra. Finalízalas y luego recalcula. |
| `blockers.RECORDED_SOURCE_INVALID_SOURCE` | NEVORA couldn’t confirm the recorded time for this payroll. Review the timecards, then recalculate. If it stays, contact support. | NEVORA no pudo confirmar el tiempo registrado para esta nómina. Revisa las tarjetas de tiempo y luego recalcula. Si sigue igual, comunícate con soporte. |
| `blockers.RECORDED_SOURCE_IDENTITY_MISMATCH` | NEVORA couldn’t confirm the recorded time for this payroll. Review the timecards, then recalculate. If it stays, contact support. | NEVORA no pudo confirmar el tiempo registrado para esta nómina. Revisa las tarjetas de tiempo y luego recalcula. Si sigue igual, comunícate con soporte. |
| `blockers.RECORDED_SOURCE_INCONSISTENT_LINEAGE` | NEVORA couldn’t confirm the recorded time for this payroll. Review the timecards, then recalculate. If it stays, contact support. | NEVORA no pudo confirmar el tiempo registrado para esta nómina. Revisa las tarjetas de tiempo y luego recalcula. Si sigue igual, comunícate con soporte. |
| `blockers.RECORDED_PROVENANCE_REQUIRED` | NEVORA couldn’t confirm the recorded time for this payroll. Review the timecards, then recalculate. If it stays, contact support. | NEVORA no pudo confirmar el tiempo registrado para esta nómina. Revisa las tarjetas de tiempo y luego recalcula. Si sigue igual, comunícate con soporte. |
| `blockers.CLOSING_CONTEXT_EVIDENCE_INVALID` | NEVORA couldn’t confirm the recorded time for this payroll. Review the timecards, then recalculate. If it stays, contact support. | NEVORA no pudo confirmar el tiempo registrado para esta nómina. Revisa las tarjetas de tiempo y luego recalcula. Si sigue igual, comunícate con soporte. |
| `blockers.BREAK_PAY_BASIS_REQUIRED` | NEVORA can’t calculate one of the recorded breaks. Check the break on the timecard and the break rules in payroll setup. | NEVORA no puede calcular uno de los descansos registrados. Revisa el descanso en la tarjeta de tiempo y las reglas de descanso en la configuración de nómina. |
| `blockers.UNSUPPORTED_UNPAID_BREAK_DURATION` | NEVORA can’t calculate one of the recorded breaks. Check the break on the timecard and the break rules in payroll setup. | NEVORA no puede calcular uno de los descansos registrados. Revisa el descanso en la tarjeta de tiempo y las reglas de descanso en la configuración de nómina. |
| `blockers.UNSUPPORTED_PAID_BREAK_BASIS` | NEVORA can’t calculate one of the recorded breaks. Check the break on the timecard and the break rules in payroll setup. | NEVORA no puede calcular uno de los descansos registrados. Revisa el descanso en la tarjeta de tiempo y las reglas de descanso en la configuración de nómina. |
| `blockers.INVALID_RECORDED_BREAK` | NEVORA can’t calculate one of the recorded breaks. Check the break on the timecard and the break rules in payroll setup. | NEVORA no puede calcular uno de los descansos registrados. Revisa el descanso en la tarjeta de tiempo y las reglas de descanso en la configuración de nómina. |
| `blockers.LOCATION_COVERAGE_REQUIRED` | Complete the recorded location coverage before recalculating. | Completa la cobertura de localidades registrada antes de recalcular. |
| `blockers.DAILY_BOUNDARY_SENSITIVE` | An older rule held this draft because recorded time touched midnight. Shifts now count on the day they start. Recalculate this draft. | Una regla anterior detuvo este borrador porque el tiempo registrado llegó a la medianoche. Ahora los turnos cuentan el día en que empiezan. Recalcula este borrador. |
| `blockers.POPULATION_REVIEW_REQUIRED` | Choose who’s in this payroll for the period, then recalculate. | Elige quién está en esta nómina para el período y luego recalcula. |
| `blockers.POPULATION_SOURCE_CONFLICT` | People or timecards changed after you chose who’s in this payroll. Review the list again, then recalculate. | Las personas o las tarjetas de tiempo cambiaron después de que elegiste quién está en esta nómina. Revisa la lista otra vez y luego recalcula. |
| `blockers.CORRECTION_POPULATION_CONFLICT` | A correction must include the same people as the original payroll. Review the original payroll before continuing. | Una corrección tiene que incluir a las mismas personas que la nómina original. Revisa la nómina original antes de continuar. |
| `blockers.WORKWEEK_EVIDENCE_REQUIRED` | Ask the Owner to document the employee workweek. Unknown notice history cannot select a default. | Pídele al dueño que documente la semana laboral del empleado. Sin el historial de avisos no se puede elegir una semana predeterminada. |
| `blockers.INVALID_WORKWEEK_POLICY` | Ask the Owner to review workweek evidence, delivery and effective dates. | Pídele al dueño que revise la evidencia de la semana laboral, su entrega y las fechas de vigencia. |
| `blockers.INVALID_NATIVE_PROFILE` | Ask the Owner to review the saved employee payroll facts and evidence. | Pídele al dueño que revise los datos de nómina guardados del empleado y su evidencia. |
| `blockers.WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED` | Ask the Owner to verify that the workweek evidence covers this employee. | Pídele al dueño que verifique que la evidencia de la semana laboral cubre a este empleado. |
| `blockers.WORKWEEK_PROFILE_CONFLICT` | Ask the Owner to resolve conflicting legacy workweek coordinates and documented policy. | Pídele al dueño que resuelva el conflicto entre los datos anteriores de la semana laboral y la política documentada. |
| `blockers.WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED` | Ask the Owner to verify workweek evidence covering the entire recorded context, including prior and terminal days. | Pídele al dueño que verifique que la evidencia de la semana laboral cubre todo el tiempo registrado, incluidos los días anteriores y los finales. |
| `blockers.INVALID_WORKWEEK_BOUNDARY` | NEVORA can’t use the saved workweek. Review the workweek in payroll setup. | NEVORA no puede usar la semana laboral guardada. Revisa la semana laboral en la configuración de nómina. |
| `blockers.INVALID_WORKWEEK_INSTANT` | NEVORA can’t use the saved workweek. Review the workweek in payroll setup. | NEVORA no puede usar la semana laboral guardada. Revisa la semana laboral en la configuración de nómina. |
| `blockers.INVALID_WORKWEEK_WINDOW` | NEVORA can’t use the saved workweek. Review the workweek in payroll setup. | NEVORA no puede usar la semana laboral guardada. Revisa la semana laboral en la configuración de nómina. |
| `blockers.UNRESOLVABLE_WORKWEEK_BOUNDARY` | NEVORA can’t use the saved workweek. Review the workweek in payroll setup. | NEVORA no puede usar la semana laboral guardada. Revisa la semana laboral en la configuración de nómina. |
| `blockers.NON_168_HOUR_WORKWEEK` | NEVORA can’t use the saved workweek. Review the workweek in payroll setup. | NEVORA no puede usar la semana laboral guardada. Revisa la semana laboral en la configuración de nómina. |
| `blockers.UNSUPPORTED_WORKWEEK_BASIS` | NEVORA can’t use the saved workweek. Review the workweek in payroll setup. | NEVORA no puede usar la semana laboral guardada. Revisa la semana laboral en la configuración de nómina. |
| `blockers.EMPLOYER_YTD_BASE_CONFLICT` | Ask the Owner to match the employer opening wage basis to the documented year-to-date balance for the same code. | Pídele al dueño que haga coincidir la base salarial patronal inicial con el saldo acumulado del año documentado para el mismo código. |
| `blockers.EMPLOYER_YTD_BASE_REQUIRED` | Ask the Owner to verify the employer contribution opening wage bases. | Pídele al dueño que verifique las bases salariales iniciales de las aportaciones patronales. |
| `blockers.ATTESTED_YTD_REQUIRED` | Ask the Owner to verify and attest the opening year-to-date balances. | Pídele al dueño que verifique y certifique los saldos acumulados del año iniciales. |
| `blockers.OPENING_YTD_REQUIRED` | Ask the Owner to verify the opening year-to-date balances. | Pídele al dueño que verifique los saldos acumulados del año iniciales. |
| `blockers.YTD_ATTESTATION_REQUIRED` | Ask the Owner to attest the documented year-to-date balances. | Pídele al dueño que certifique los saldos acumulados del año documentados. |
| `blockers.WAGE_PROFILE_REQUIRED` | Ask the Owner to complete the employee wage profile. | Pídele al dueño que complete el perfil salarial del empleado. |
| `blockers.CONFLICTING_WAGE_PROFILE` | Two saved wages cover the same dates and location. Keep one in payroll setup. | Dos salarios guardados cubren las mismas fechas y la misma localidad. Deja uno en la configuración de nómina. |
| `blockers.UNSUPPORTED_WAGE_PROFILE` | NEVORA can’t use the saved wage details. Review the wage in payroll setup. | NEVORA no puede usar los datos de salario guardados. Revisa el salario en la configuración de nómina. |
| `blockers.INVALID_WAGE_RATE` | NEVORA can’t use the saved wage details. Review the wage in payroll setup. | NEVORA no puede usar los datos de salario guardados. Revisa el salario en la configuración de nómina. |
| `blockers.OVERTIME_POLICY_CONFLICT` | NEVORA can’t use the saved wage details. Review the wage in payroll setup. | NEVORA no puede usar los datos de salario guardados. Revisa el salario en la configuración de nómina. |
| `blockers.WAGE_CONTEXT_ATTESTATION_REQUIRED` | NEVORA can’t use the saved wage details. Review the wage in payroll setup. | NEVORA no puede usar los datos de salario guardados. Revisa el salario en la configuración de nómina. |
| `blockers.MINIMUM_WAGE_COVERAGE_REQUIRED` | Minimum wage coverage isn’t confirmed for this wage. Confirm it in payroll setup. | No está confirmada la cobertura de salario mínimo para este salario. Confírmala en la configuración de nómina. |
| `blockers.BELOW_APPLICABLE_MINIMUM_WAGE` | The hourly rate is below the minimum wage NEVORA checks. Review the rate in payroll setup. | La tarifa por hora está por debajo del salario mínimo que verifica NEVORA. Revisa la tarifa en la configuración de nómina. |
| `blockers.TAX_PROFILE_REQUIRED` | Ask the Owner to complete the employee withholding facts. | Pídele al dueño que complete los datos de retención del empleado. |
| `blockers.UNSUPPORTED_CERTIFICATE_COMBINATION` | NEVORA can’t calculate this mix of withholding choices yet. Review the withholding details in payroll setup, or contact support. | NEVORA todavía no puede calcular esta combinación de opciones de retención. Revisa los datos de retención en la configuración de nómina o comunícate con soporte. |
| `blockers.EMPLOYER_COVERAGE_REQUIRED` | Employer contribution details are missing or not supported. Review them in payroll setup. | Faltan los datos de las aportaciones patronales o no son compatibles. Revísalos en la configuración de nómina. |
| `blockers.UNSUPPORTED_EMPLOYER_RULE` | Employer contribution details are missing or not supported. Review them in payroll setup. | Faltan los datos de las aportaciones patronales o no son compatibles. Revísalos en la configuración de nómina. |
| `blockers.DEDUCTION_AUTHORITY_REQUIRED` | NEVORA can’t apply one of the saved deductions. Review deductions in payroll setup. | NEVORA no puede aplicar una de las deducciones guardadas. Revisa las deducciones en la configuración de nómina. |
| `blockers.DUPLICATE_DEDUCTION_CODE` | NEVORA can’t apply one of the saved deductions. Review deductions in payroll setup. | NEVORA no puede aplicar una de las deducciones guardadas. Revisa las deducciones en la configuración de nómina. |
| `blockers.UNSUPPORTED_DEDUCTION` | NEVORA can’t apply one of the saved deductions. Review deductions in payroll setup. | NEVORA no puede aplicar una de las deducciones guardadas. Revisa las deducciones en la configuración de nómina. |
| `blockers.INSURANCE_EMPLOYER_MATCH_REQUIRED` | NEVORA can’t apply one of the saved deductions. Review deductions in payroll setup. | NEVORA no puede aplicar una de las deducciones guardadas. Revisa las deducciones en la configuración de nómina. |
| `blockers.DEDUCTION_CAP_HISTORY_REQUIRED` | NEVORA can’t apply one of the saved deductions. Review deductions in payroll setup. | NEVORA no puede aplicar una de las deducciones guardadas. Revisa las deducciones en la configuración de nómina. |
| `blockers.DEDUCTION_CAP_SOURCE_CONFLICT` | NEVORA can’t apply one of the saved deductions. Review deductions in payroll setup. | NEVORA no puede aplicar una de las deducciones guardadas. Revisa las deducciones en la configuración de nómina. |
| `blockers.DEDUCTIONS_EXCEED_GROSS` | Deductions are more than the pay for this period. Review deductions in payroll setup. | Las deducciones son más que el pago de este período. Revisa las deducciones en la configuración de nómina. |
| `blockers.NATIVE_INPUT_REQUIRED` | The recorded-time and employee payroll facts are incomplete. | El tiempo registrado y los datos de nómina del empleado están incompletos. |
| `blockers.YTD_TAXABLE_BASE_CONFLICT` | The opening year-to-date balances don’t add up for this employee. Review the opening balances in payroll setup. | Los saldos acumulados del año iniciales no cuadran para este empleado. Revisa los saldos iniciales en la configuración de nómina. |
| `blockers.INVALID_NATIVE_INPUT` | Some saved payroll details can’t be read. Review them in payroll setup. If it stays, contact support. | No se pueden leer algunos datos de nómina guardados. Revísalos en la configuración de nómina. Si sigue igual, comunícate con soporte. |
| `blockers.INVALID_NATIVE_MONEY` | Some saved payroll details can’t be read. Review them in payroll setup. If it stays, contact support. | No se pueden leer algunos datos de nómina guardados. Revísalos en la configuración de nómina. Si sigue igual, comunícate con soporte. |
| `blockers.INVALID_OPERATION` | Some saved payroll details can’t be read. Review them in payroll setup. If it stays, contact support. | No se pueden leer algunos datos de nómina guardados. Revísalos en la configuración de nómina. Si sigue igual, comunícate con soporte. |
| `blockers.INVALID_PRESENTATION` | Some saved payroll details can’t be read. Review them in payroll setup. If it stays, contact support. | No se pueden leer algunos datos de nómina guardados. Revísalos en la configuración de nómina. Si sigue igual, comunícate con soporte. |
| `blockers.INVALID_PAYROLL_INPUT` | Some saved payroll details can’t be read. Review them in payroll setup. If it stays, contact support. | No se pueden leer algunos datos de nómina guardados. Revísalos en la configuración de nómina. Si sigue igual, comunícate con soporte. |
| `blockers.SETTINGS_REQUIRED` | No payroll settings are saved for this payday. Save your pay schedule in Payroll settings. | No hay ajustes de nómina guardados para este día de pago. Guarda tu calendario de pago en Ajustes de nómina. |
| `blockers.ROUNDING_POLICY_ACCEPTANCE_REQUIRED` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.RULE_ACCEPTANCE_REQUIRED` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.EXACT_CENT_REQUIRED` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.WAGE_ROUNDING_REQUIRED` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.PR_ROUNDING_REQUIRED` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.PR_ROUNDING_RULE_UNVERIFIED` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.WAGE_CENT_RULE_UNVERIFIED` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.WAGE_DOLLAR_CENT_RULE_UNVERIFIED` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.OWNER_CALCULATION_POLICY_REQUIRED` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.EXACTNESS_EVIDENCE_LIMIT` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.POLICY_EVIDENCE_LIMIT` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.INVALID_NATIVE_RULE_INPUT` | NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support. | NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte. |
| `blockers.NATIVE_RULE_MAPPING_REQUIRED` | This company has saved deduction or contribution rules that NEVORA can’t use in its own calculation. Contact support. | Esta empresa tiene reglas de deducciones o aportaciones guardadas que NEVORA no puede usar en su propio cálculo. Comunícate con soporte. |
| `blockers.RULESET_NOT_APPLICABLE` | NEVORA can’t calculate paydays in that year yet. Contact support. | NEVORA todavía no puede calcular días de pago en ese año. Comunícate con soporte. |
| `blockers.UNSUPPORTED_NATIVE_TIME_ZONE` | NEVORA can’t calculate payroll for this company’s time zone yet. Contact support. | NEVORA todavía no puede calcular la nómina para la zona horaria de esta empresa. Comunícate con soporte. |
| `blockers.UNSUPPORTED_CONTINUOUS_REST_SEQUENCE` | Someone worked more than seven days in a row, which NEVORA can’t calculate yet. Contact support. | Alguien trabajó más de siete días seguidos, y NEVORA todavía no puede calcular eso. Comunícate con soporte. |
| `blockers.WORKWEEK_POLICY_TRANSITION_UNSUPPORTED` | This recorded context spans different workweek policies. Ask the Owner to review it; NEVORA can’t calculate across that change yet. | Este tiempo registrado abarca políticas de semana laboral distintas. Pídele al dueño que lo revise; NEVORA todavía no puede calcular a través de ese cambio. |
| `blockers.NATIVE_SOURCE_LIMIT` | This payroll is larger than NEVORA can calculate at once. Contact support. | Esta nómina es más grande de lo que NEVORA puede calcular de una vez. Comunícate con soporte. |
| `blockers.NATIVE_EARNINGS_LIMIT` | This payroll is larger than NEVORA can calculate at once. Contact support. | Esta nómina es más grande de lo que NEVORA puede calcular de una vez. Comunícate con soporte. |
| `blockers.YTD_SOURCE_LIMIT` | This payroll is larger than NEVORA can calculate at once. Contact support. | Esta nómina es más grande de lo que NEVORA puede calcular de una vez. Comunícate con soporte. |
| `blockers.WORKWEEK_CONTEXT_LIMIT` | This payroll is larger than NEVORA can calculate at once. Contact support. | Esta nómina es más grande de lo que NEVORA puede calcular de una vez. Comunícate con soporte. |
| `blockers.RECORDED_SOURCE_SOURCE_LIMIT` | This payroll is larger than NEVORA can calculate at once. Contact support. | Esta nómina es más grande de lo que NEVORA puede calcular de una vez. Comunícate con soporte. |
| `blockers.NATIVE_SOURCE_UNAVAILABLE` | NEVORA couldn’t read the time and payroll details for this payroll. Recalculate the draft. If it happens again, contact support. | NEVORA no pudo leer los datos de tiempo y de nómina de esta nómina. Recalcula el borrador. Si vuelve a pasar, comunícate con soporte. |
| `blockers.NATIVE_PERIOD_CONFLICT` | The dates of this pay period don’t match the saved time. Recalculate the draft. If it stays, contact support. | Las fechas de este período de pago no coinciden con el tiempo guardado. Recalcula el borrador. Si sigue igual, comunícate con soporte. |
| `blockers.INVALID_NATIVE_PERIOD` | NEVORA can’t calculate a pay period with these dates. Contact support. | NEVORA no puede calcular un período de pago con estas fechas. Comunícate con soporte. |
| `blockers.INVALID_PAY_PERIOD` | NEVORA can’t calculate a pay period with these dates. Contact support. | NEVORA no puede calcular un período de pago con estas fechas. Comunícate con soporte. |
| `blockers.YTD_LOCATION_COVERAGE_REQUIRED` | Verify location coverage for the prior payroll balances. | Verifica la cobertura de localidades de los saldos de nóminas anteriores. |
| `blockers.BACKDATED_YTD_RECALCULATION_REQUIRED` | Later payroll has already been approved. Ask the Owner to review the year-to-date order. | Ya se aprobó una nómina posterior. Pídele al dueño que revise el orden del acumulado del año. |
| `blockers.YTD_DEPENDENT_RUNS_REQUIRED` | Later approved payroll depends on these year-to-date balances. Ask the Owner to review the order of corrections. | Una nómina aprobada posterior depende de estos saldos acumulados del año. Pídele al dueño que revise el orden de las correcciones. |
| `blockers.YTD_LINEAGE_CONFLICT` | This year’s payroll totals don’t line up for this employee. Contact support. | Los totales de nómina de este año no cuadran para este empleado. Comunícate con soporte. |
| `blockers.YTD_SOURCE_CONFLICT` | This year’s payroll totals don’t line up for this employee. Contact support. | Los totales de nómina de este año no cuadran para este empleado. Comunícate con soporte. |
| `unknownBlocker` | Something stops this payroll that NEVORA can’t explain here. Recalculate the draft. If it stays, contact support. | Algo detiene esta nómina que NEVORA no puede explicar aquí. Recalcula el borrador. Si sigue igual, comunícate con soporte. |
| `waitingForAmounts` | Import provider or accountant amounts to review this draft. | Importa las cantidades del proveedor o del contador para revisar este borrador. |
| `timeNotFinalized` | Finalize timecards for employee reference 2 before approval. | Finaliza las tarjetas de tiempo del empleado con referencia 2 antes de aprobar. |
| `populationDisposition` | Choose what to do with employee reference 2 for this period before approval. | Elige qué hacer con el empleado con referencia 2 en este período antes de aprobar. |
| `employeeReference` |  Employee reference 2. |  Referencia del empleado: 2. |
| `api.unreadable` | The payroll response could not be read. Refresh to try again. | No se pudo leer la respuesta de nómina. Actualiza para intentar de nuevo. |
| `api.accessUnreadable` | The payroll access response could not be read. | No se pudo leer la respuesta de acceso a nómina. |
| `api.noticeUnreadable` | The payroll notice readiness response could not be read. | No se pudo leer la respuesta sobre las notificaciones de nómina. |
| `api.settingsIncomplete` | The payroll settings response is incomplete. | La respuesta de los ajustes de nómina está incompleta. |
| `api.reviewIncomplete` | The payroll review response is incomplete. | La respuesta de la revisión de nómina está incompleta. |
| `api.revisionUnreadable` | The payroll revision could not be read. Refresh before reviewing any amounts. | No se pudo leer la revisión de nómina. Actualiza antes de revisar cualquier cantidad. |
| `api.missingUnreadable` | The missing-period review response could not be read. | No se pudo leer la respuesta de los períodos sin nómina. |
| `api.historyUnreadable` | The payroll history summary could not be read. | No se pudo leer el resumen del historial de nómina. |
| `api.statementsIncomplete` | The pay statement response is incomplete. | La respuesta de los comprobantes de pago está incompleta. |
| `api.privateUnreadable` | The private statement history could not be read. Refresh your current access. | No se pudo leer el historial privado de comprobantes. Actualiza tu acceso actual. |
| `api.receiptUnreadable` | The action receipt could not be read. Check its reference before trying again. | No se pudo leer el recibo de la acción. Verifica su referencia antes de intentar de nuevo. |
| `api.requestReload` | Payroll could not complete this request. Reload current access and try again. | Nómina no pudo completar esta solicitud. Vuelve a cargar el acceso actual e inténtalo de nuevo. |
| `api.interrupted` | The payroll response was interrupted. Check its action reference before trying again. | La respuesta de nómina se interrumpió. Verifica la referencia de la acción antes de intentar de nuevo. |
| `api.requestFailed` | Payroll could not complete this request. | Nómina no pudo completar esta solicitud. |
| `api.SOURCE_CONFLICT` | Payroll inputs changed. Refresh this run and prepare a new review from its current source before approving. | Los datos de la nómina cambiaron. Actualiza esta nómina y prepara una revisión nueva con sus datos actuales antes de aprobar. |
| `api.NATIVE_REVIEW_STALE` | Recorded time or payroll facts changed. Refresh, recalculate this draft and review the new revision before approving. | El tiempo registrado o los datos de nómina cambiaron. Actualiza, recalcula este borrador y revisa la revisión nueva antes de aprobar. |
| `api.REVISION_CONFLICT` | This revision changed. Refresh and review the current payroll before continuing. | Esta revisión cambió. Actualiza y revisa la nómina actual antes de continuar. |
| `api.REVIEW_CONFLICT` | This payroll review changed. Refresh and review the current revision before approving. | La revisión de esta nómina cambió. Actualiza y revisa la revisión actual antes de aprobar. |
| `api.FINALIZED_TIME_REQUIRED` | Finalize the included employee timecards before approving payroll. | Finaliza las tarjetas de tiempo de los empleados incluidos antes de aprobar la nómina. |
| `api.SETTINGS_REQUIRED` | Save company payroll settings before preparing this payroll run. | Guarda los ajustes de nómina de la empresa antes de preparar esta nómina. |
| `api.importJson` | Choose a valid JSON payroll import. | Elige una importación de nómina JSON válida. |
| `api.importShape` | Use NEVORA_PAYROLL_IMPORT_V1 with USD, a source reference, dates and complete employee amounts. Amounts must be nonnegative whole cents as strings. | Usa NEVORA_PAYROLL_IMPORT_V1 con USD, una referencia de origen, fechas y las cantidades completas de cada empleado. Las cantidades tienen que ser centavos enteros no negativos, escritos como texto. |
| `api.importDates` | Import dates must be valid dates in YYYY-MM-DD format. | Las fechas de la importación tienen que ser fechas válidas en formato AAAA-MM-DD. |
| `api.importPeriod` | Choose a period of 1 to 31 days and a payday on or after the period ends. | Elige un período de 1 a 31 días y un día de pago igual o posterior al final del período. |
| `api.importOnce` | Each employee must appear once in the import. | Cada empleado tiene que aparecer una sola vez en la importación. |
| `resource.signedOut` | Your session ended. Sign in again to see payroll. | Tu sesión terminó. Inicia sesión otra vez para ver la nómina. |
| `resource.couldNotLoad` | Payroll could not load. | No se pudo cargar la nómina. |
| `resource.paused` | Payroll is paused while this page is hidden. Return to reload current access. | La nómina está en pausa mientras esta página está oculta. Vuelve para cargar el acceso actual. |
| `resource.offline` | Payroll is unavailable offline. Reconnect to reload current access. | La nómina no está disponible sin conexión. Vuelve a conectarte para cargar el acceso actual. |
| `operation.approved` | Payroll approved | Nómina aprobada |
| `operation.saved` | Saved | Guardado |
| `operation.paymentReady` | Payment file ready | Archivo de pago listo |
| `operation.savedCheck` | Saved. Check the status below. | Guardado. Revisa el estado abajo. |
| `operation.receiptMismatch` | The returned receipt does not match this action reference. Check the same reference again. | El recibo que llegó no coincide con la referencia de esta acción. Verifica la misma referencia otra vez. |
| `operation.noReceipt` | No receipt is available yet. Check this same reference again; the action has not been confirmed. | Todavía no hay un recibo disponible. Verifica esta misma referencia otra vez; la acción no se ha confirmado. |
| `operation.checkFailed` | The action reference could not be checked. | No se pudo verificar la referencia de la acción. |
| `operation.unconfirmed` | The action response is unconfirmed. Check its saved reference. | La respuesta de la acción no está confirmada. Verifica su referencia guardada. |
| `operation.stillUnconfirmed` | This reference remains unconfirmed. Check the original action before reconstructing it again; a recorded reference cannot accept changed details. | Esta referencia sigue sin confirmar. Verifica la acción original antes de volver a armarla; una referencia registrada no acepta datos cambiados. |
| `operation.interrupted` | The action response was interrupted. Check its reference. | La respuesta de la acción se interrumpió. Verifica su referencia. |
| `operation.reasonInvalid` | Enter a single-line reason of 1 to 300 characters. | Escribe una razón de 1 a 300 caracteres en una sola línea. |
| `operation.storageFailed` | The browser could not save a recovery reference. Enable browser storage before recording this action. | El navegador no pudo guardar una referencia de recuperación. Activa el almacenamiento del navegador antes de registrar esta acción. |
| `operation.resumePrompt` | Re-enter the original action and details below. Submission will reuse this exact reference; changed details cannot replace a recorded action. | Vuelve a escribir abajo la acción original y sus datos. Al enviarla se usará esta misma referencia; los datos cambiados no pueden reemplazar una acción registrada. |
| `feedback.checkStatus` | Check the status below. | Revisa el estado abajo. |
| `feedback.unconfirmedLabel` | Unconfirmed action | Acción sin confirmar |
| `feedback.recording` | Recording action… | Registrando la acción… |
| `feedback.checkUnconfirmed` | Check an unconfirmed action | Verificar una acción sin confirmar |
| `feedback.keepReference` | Keep this reference until the server confirms the result. | Guarda esta referencia hasta que el servidor confirme el resultado. |
| `feedback.reenterNote` | Re-enter the original action below. Its saved reference will be reused; no new action reference will be created. | Vuelve a escribir abajo la acción original. Se usará su referencia guardada; no se creará una referencia nueva. |
| `feedback.checkReference` | Check action reference | Verificar referencia |
| `feedback.retrySame` | Retry same action | Reintentar la misma acción |
| `feedback.reenter` | Re-enter original action | Volver a escribir la acción |
| `feedback.pause` | Pause re-entry | Pausar |
| `ui.signIn` | Sign in | Iniciar sesión |
| `ui.tryAgain` | Try again | Intentar de nuevo |
| `ui.publishedToEmployee` | Published to employee | Publicado para el empleado |
| `ui.privateNotPublished` | Private · not published | Privado · sin publicar |
| `ui.privateCompanyFile` | Private company file | Archivo privado de la empresa |
| `ui.neutralJson` | Neutral JSON · compatibility unverified · not submitted | JSON neutral · compatibilidad sin verificar · no enviado |
| `ui.pdfDocument` | PDF document | Documento PDF |
| `ui.amountInvalid` | Enter a nonnegative USD amount with up to two decimal places. | Escribe una cantidad en USD que no sea negativa, con hasta dos decimales. |
| `ui.view` | View | Ver |
| `ui.download` | Download | Descargar |
| `ui.viewFile` | View 2 | Ver 2 |
| `ui.downloadFile` | Download 2 | Descargar 2 |
| `form.thisField` | This field | Este campo |
| `form.and` | and | y |
| `form.fillInOne` | Fill in 2. | Completa 2. |
| `form.checkOne` | Check 2. {b} | Revisa 2. {b} |
| `form.many` | Fill in {b} fields: {c}. | Completa {b} campos: {c}. |

### myPay

| Key | English | Spanish |
|---|---|---|
| `pay` | Pay | Pago |
| `myPay` | My pay | Mi pago |
| `latest` | Latest statement | Comprobante más reciente |
| `paydaySr` | Payday  | Día de pago:  |
| `pdf` | PDF | PDF |
| `publishedSr` | , published pay statement | , comprobante de pago publicado |
| `view` | View | Ver |
| `viewStatementSr` |  statement, payday 2 |  comprobante, día de pago 2 |
| `downloadStatement` | Download statement, payday 2 | Descargar comprobante, día de pago 2 |
| `download` | Download | Descargar |
| `today` | Today | Hoy |
| `tomorrow` | Tomorrow | Mañana |
| `inDays` | In 2 days | En 2 días |
| `documentFailed` | We couldn’t open that statement. It didn’t pass NEVORA’s file check. Try again later, or ask your manager. | No pudimos abrir ese comprobante. No pasó la verificación de archivos de NEVORA. Inténtalo más tarde o pregúntale a tu gerente. |
| `documentTemporary` | We couldn’t open that statement just now. Try again in a moment. | No pudimos abrir ese comprobante ahora. Inténtalo de nuevo en un momento. |
| `documentUnavailable` | That statement isn’t available. It may have been replaced, or your access changed. | Ese comprobante no está disponible. Puede que se haya reemplazado o que tu acceso haya cambiado. |
| `scheduledPayday` | Scheduled payday is 2 | El día de pago programado es el 2 |
| `forPeriod` | for 2 | por 2 |
| `thisWeek` | This week | Esta semana |
| `myTime` | My time | Mi tiempo |
| `timecards` | Timecards | Tarjetas de tiempo |
| `statements` | Statements | Comprobantes |
| `loading` | Loading your statements… | Cargando tus comprobantes… |
| `signInAgain` | Sign in again to see your statements. | Inicia sesión otra vez para ver tus comprobantes. |
| `couldNotLoad` | Couldn’t load your statements. | No pudimos cargar tus comprobantes. |
| `signIn` | Sign in | Iniciar sesión |
| `tryAgain` | Try again | Intentar de nuevo |
| `paydayTitle` | Payday 2 | Día de pago: 2 |
| `downloadFile` | Download 2 | Descargar 2 |
| `viewFile` | View 2 | Ver 2 |
| `noneShared` | No pay statements shared yet. | Todavía no se han compartido comprobantes de pago. |
| `privacy` | Only your own pay statements are available here. Downloaded files may contain personal pay information. | Aquí solo están disponibles tus propios comprobantes de pago. Los archivos descargados pueden contener información personal de tu pago. |
| `correction` | Correction | Corrección |
| `correctionOf` | Correction of 2 | Corrección de 2 |
| `replaced` | Replaced by a correction | Reemplazado por una corrección |
| `payStatements` | Pay statements | Comprobantes de pago |
| `loadingStatements` | Loading pay statements… | Cargando comprobantes de pago… |
| `employee` | Employee | Empleado |
| `employeeStatement` | Employee statement | Comprobante del empleado |
| `revision` | 2, revision {b} | 2, revisión {b} |
| `payday` | Payday | Día de pago |
| `notShared` | Not shared yet | Sin compartir todavía |
| `viewPersonStatement` | View 2 pay statement, {b} | Ver comprobante de pago de 2, {b} |
| `downloadPersonStatement` | Download 2 pay statement, {b} ({c}) | Descargar comprobante de pago de 2, {b} ({c}) |
| `noStatements` | No pay statements yet | Todavía no hay comprobantes de pago |
| `noStatementsLine` | They appear once statements are made for payroll you can see. | Aparecen cuando se preparan comprobantes para nóminas que puedes ver. |
| `kind.EMPLOYEE_STATEMENT` | Pay statement | Comprobante de pago |
| `kind.COMPANY_SUMMARY` | Company summary | Resumen de la empresa |
| `kind.PAYMENT_INSTRUCTIONS` | Payment instructions | Instrucciones de pago |
| `sharedWithEmployee` | Shared with employee | Compartido con el empleado |
| `fileOnly` | File only · not sent to a bank | Solo archivo · no se envía a un banco |
| `forRecords` | For your records | Para tus récords |
| `personStatement` | 2 pay statement | comprobante de pago de 2 |
| `viewSubject` | View 2 | Ver 2 |
| `downloadSubject` | Download 2 ({b}) | Descargar 2 ({b}) |

