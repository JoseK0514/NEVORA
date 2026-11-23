# es-mobile: Spanish for `src/components/employee-mobile` (signed-in Spanish, Nov 23)

Branch `claude-codex-collab-nevora-es-mobile`, from `claude-codex-collab-nevora` (7c1464eb), shared tip merged twice (last
at 7ae2ff19, merge 9e327da0). Fictional data only.

## Commits (code)
| Commit | What |
|---|---|
| e8ffde5f | `mobile-lang.tsx` (useMobileLang, useMobileCopy, MobileLangProvider for tests) and `mobile-format.ts` (Spanish times "7:00 a. m. – 3:00 p. m.", dates "mar, 6 oct", weeks "16–22 nov"; English goes through the existing src/lib formatters unchanged) |
| d94cdae8 | The hook follows `usePortalLang()` (contract 960579cf) |
| 28bd776f | Calendar link, profile, availability frame, week picker |
| 205cdf2e | Time, hours records, corrections, and the shared time helpers in `hours-model.ts` (trailing `lang`, English default) |
| 17e7674d | Availability; swap, cover and can't-work sheets; requests and open shifts |
| fb1596f7 | Updates, compose, notifications |
| 5878886e | Time off, delete my account, device alerts, passkeys |
| f966b337 | Time on the corporate kit, timecards, the Fix my time sheet |
| b8cc343b | Pick up and swap; Pay |
| 405b54f7 | `employee-mobile-copy.ts` (the area table: 34 `{en, es}` tables under `copy/`) and the key-match test |
| 8c220f0a | `wave-a/parts.test.tsx`: the deletion outcome test reads its six English sentences from `copy/deletion.ts` (one line, lead-approved) |
| 65f64f0f | Delete my account: Spanish password label shortened so it fits one line at 200% text |
| 9e327da0 | Merge of the shared tip |

## What changed
- 1,304 English entries (strings and string functions) moved into 34 tables, one per component file
  (`src/components/employee-mobile/copy/<file>.ts`, the `copy-receipt-copy.ts` pattern, `const es: typeof en`). English
  is byte for byte what it was; every existing English test passes unchanged. `device-owner.tsx` is left to the shell
  session (it's in the shell list). Files with no visible text (operations, `use-*` hooks, navigation-layout) are untouched.
- Client components read `useMobileCopy(table)`. Helpers that other areas import (`hours-model`, `hours-records`,
  `request-status`, `availability-summary`, `timeoff-parts`, `notifications-list`, `pay`, `exchange-view`) take a
  trailing `lang` that defaults to English, so `employee-b/*`, `payroll/my-pay.tsx` and `employee-my-schedule.tsx` keep
  English until they pass it.
- Spanish follows `docs/design/voice.md`: tú, sentence case, infinitive buttons, no "¡", the README glossary (Turno
  disponible, Días libres, Horario, localidad, Por confirmar), "tarjeta(s) de tiempo", "marcación", "comprobante de
  pago", "aviso", "llave de acceso" for passkey, "patrono" for employer. Where shared Spanish elsewhere still uses usted
  (`owner-b/moments-copy.ts`, `employee-b/account-copy.ts`), these screens carry their own tú Spanish and keep reading the
  shared English.

## Checks (after the last merge)
- `tsc --noEmit`: clean. `oxlint` on employee-mobile and wave-a: clean.
- Whole `src/components` suite: 3,397 passed, 0 failed.
- Key match: `employee-mobile-copy.test.ts` checks every table has the same keys, kinds and function arities in both
  languages, no empty Spanish, no exclamation marks, and that every file in `copy/` is listed (69 tests).
- Spanish render tests: one `<file>.es.test.tsx` per main view (24 files), plus helper tests for `hours-model`,
  `availability-summary`, `request-status`.
- Browser, Spanish via the `nv-lang` cookie, Employee (James, rich fictional data), 14 routes: `/app/my-time`,
  `/app/timecards`, `/app/my-pay`, `/app/requests`, `/app/requests/hub`, `/app/availability`, `/app/exchange`,
  `/app/updates`, `/app/notifications`, `/app/profile`, `/app/profile/calendar`, `/app/profile/passkeys`,
  `/app/profile/device-alerts`, `/app/account/delete`; 390, 390 with 200% text, 768, 1440. Harness: `tools/ui-scan`
  with three additions in a scratch copy (nv-lang cookie after sign-in; a 390/200% pass; axe-core wcag2a/aa/21aa/22aa).
  - Sideways scroll: 0 px on every route at 390 and at 390 with 200% text.
  - axe: 0 violations on every route at both sizes.
  - Clipping and overlap (audit.js): none in employee-mobile markup. One found and fixed: the delete page's password
    label cut off at 200% ("Escribe tu contraseña para c…"), now "Escribe tu contraseña" (the heading above says
    "Confirma que eres tú"). The remaining audit hits are in employee-b parts (below).

## What the shots show (important for review)
On the Employee phone (and at 768/1440 for the Employee), most of these pages draw their Direction B layer from
`components/employee-b`, which belongs to es-employee. So in these shots only the words that employee-mobile renders or
passes in are Spanish: e.g. Time's "Tiempo", "Tarjetas anteriores" and the date line; the "Tomar" buttons and the note
under the open shifts; the whole confirmation form on Delete account. Pay, Updates, Add to calendar, Requests and
Profile are drawn by employee-b and read English until es-employee lands. The lead confirmed this is expected.

Shots: 56 webp in `shots/es-mobile/`, named `<route>-employee-es-<390|390-200|768|1440>.webp` (390 and 390-200 full
page, 768 full page, 1440 first screen), captured after the last merge (9e327da0).

## For Jose to review
Payroll, pay, time-record, privacy and account lines, English → Spanish (literal translations).

**Pay** (`copy/pay.ts`, `copy/pay-corp.ts`)
- PAY_SCOPE_LINE: Your employer pays you. NEVORA shows your pay statement. → Tu patrono te paga. NEVORA muestra tu comprobante de pago.
- PAY_DIFFERENCE_LINE: If the amount differs from what you received, ask your manager. → Si la cantidad es distinta de lo que recibiste, pregúntale a tu gerente.
- statement / replaced statement / corrected statement → comprobante / comprobante reemplazado / comprobante corregido
- Use the corrected statement → Usar el comprobante corregido
- A corrected statement replaced this one. Use the corrected statement for this period. → Un comprobante corregido reemplazó a este. Usa el comprobante corregido para este período.
- This corrects your earlier statement for the same period. → Este corrige tu comprobante anterior del mismo período.
- Next scheduled payday → Próximo día de pago programado; Scheduled payday is today / tomorrow / in N days → El día de pago programado es hoy / mañana / en N días
- From your workplace’s pay schedule. A statement appears here after your employer shares it. → Según el calendario de pagos de tu trabajo. El comprobante aparece aquí cuando tu patrono lo comparte.
- It didn’t pass NEVORA’s file check, so it wasn’t opened. Try again later, or ask your manager. → No pasó la verificación de archivos de NEVORA, así que no se abrió. Inténtalo de nuevo más tarde o pregúntale a tu gerente.
- Your access to pay statements changed / NEVORA can’t show your statements right now. If that seems wrong, ask your manager. → Tu acceso a los comprobantes de pago cambió / NEVORA no puede mostrar tus comprobantes ahora. Si crees que es un error, pregúntale a tu gerente.
- Pay statements are turned off / Your workplace isn’t sharing pay statements in NEVORA right now. Ask your manager where to find your pay information. → Los comprobantes de pago están desactivados / Tu trabajo no está compartiendo comprobantes de pago en NEVORA ahora. Pregúntale a tu gerente dónde encontrar tu información de pago.
- Your session ended. Statements stay private until you sign in again. → Tu sesión terminó. Los comprobantes se mantienen privados hasta que vuelvas a iniciar sesión.
- No published statements yet / Your statements appear here after your employer shares them. → Todavía no hay comprobantes publicados / Tus comprobantes aparecen aquí cuando tu patrono los comparte.
- Only your own published statements are available here. Downloaded files may contain personal pay information. → Aquí solo están disponibles tus propios comprobantes publicados. Los archivos descargados pueden contener información personal de pago.
- View opens the PDF on its own. Close it to come back to Pay. → Ver abre el PDF aparte. Ciérralo para volver a Pago.
- Pay history / Your published pay statements, newest first. → Historial de pagos / Tus comprobantes de pago publicados, del más reciente al más antiguo.
- Pay statement (PDF), role, payday X (opens separately) → Comprobante de pago (PDF), role, día de pago X (se abre aparte)
- Notifications: View statement → Ver comprobante; A pay statement was shared with you → Se compartió contigo un comprobante de pago; New schedule, request and pay notices will show here. → Aquí verás las notificaciones nuevas de horario, solicitudes y pago.

**Time records and timecards** (`copy/hours-*.ts`)
- Elapsed time includes breaks. These are recorded intervals, not payroll totals. → El tiempo transcurrido incluye los descansos. Son intervalos registrados, no totales de nómina.
- Effective time includes breaks and approved adjustments. Totals cover the selected dates and aren’t a pay statement. → El tiempo efectivo incluye los descansos y los ajustes aprobados. Los totales cubren las fechas elegidas y no son un comprobante de pago.
- These are the original Clocker records. Approved adjustments appear in your timecard. → Estos son los registros originales del Clocker. Los ajustes aprobados aparecen en tu tarjeta de tiempo.
- Your manager reviews this request. Original punches stay unchanged, and approved adjustments appear in your timecard. Times in {zone}. → Tu gerente revisa esta solicitud. Las marcaciones originales no cambian y los ajustes aprobados aparecen en tu tarjeta de tiempo. Las horas están en hora de {lugar}.
- Times in {zone}. Your manager controls approval and finalization. → Las horas están en hora de {lugar}. Tu gerente controla la aprobación y la finalización.
- This timecard is finalized. Your manager controls reopening. → Esta tarjeta de tiempo está finalizada. Tu gerente decide si se reabre.
- This period is finalized. Ask your manager about reopening it. → Este período está finalizado. Pregúntale a tu gerente si se puede reabrir.
- Your timecard changed after this request. Check the current times before sending another request. → Tu tarjeta de tiempo cambió después de esta solicitud. Revisa las horas actuales antes de enviar otra.
- Approved missing time · No device punch was created. → Tiempo sin marcar aprobado · No se creó una marcación en el dispositivo.
- Timecard states: Draft / Approved / Finalized / Reopened / Needs review / In progress / Not approved yet → Borrador / Aprobada / Finalizada / Reabierta / Necesita revisión / En curso / Aún sin aprobar; "Approved/Finalized/Reopened by X" → "Aprobada/Finalizada/Reabierta por X"

**Delete my account** (`copy/deletion.ts`)
- Your access ends right away: you're signed out on every device and can't sign in again with your password or a passkey. Calendar feed links and device alerts stop. → Tu acceso termina de inmediato: se cierra tu sesión en todos los dispositivos y no puedes volver a iniciar sesión con tu contraseña ni con una llave de acceso. Los enlaces del calendario y las alertas del dispositivo se detienen.
- Within {period}, we aim to delete your profile, sign-in details, notification subscriptions, calendar links and the content you contributed. After you confirm, you can't cancel it in the app. → En un plazo de {period}, intentamos eliminar tu perfil, tus datos de inicio de sesión, tus suscripciones a notificaciones, tus enlaces del calendario y el contenido que aportaste. Después de confirmar, no puedes cancelarla en la aplicación.
- Deleting your NEVORA account doesn't end your employment or remove records your employer has to keep. → Eliminar tu cuenta de NEVORA no termina tu empleo ni borra los registros que tu patrono tiene que conservar.
- Your company's workspace stays open for the rest of your team. To close it, email {support}. → El espacio de trabajo de tu empresa sigue abierto para el resto de tu equipo. Para cerrarlo, escribe a {support}.
- We aim to finish within {period}. If we have your email address, we'll email you when it's done. → Intentamos terminar en un plazo de {period}. Si tenemos tu correo electrónico, te escribiremos cuando termine.
- To ask about it, email {support} with your reference. We'll never ask for your password. Changed your mind? Contact support before the request is processed. → Para preguntar sobre ella, escribe a {support} con tu referencia. Nunca te pediremos tu contraseña. ¿Cambiaste de idea? Comunícate con soporte antes de que se procese la solicitud.
- I understand my NEVORA account will be deleted and I won't be able to sign in again. → Entiendo que mi cuenta de NEVORA se eliminará y que no podré volver a iniciar sesión.
- The connection ended before NEVORA answered. Enter your password again and choose Check my request to find out. If it wasn't saved, this sends your deletion request now, so only check if you still want your account deleted. → La conexión terminó antes de que NEVORA respondiera. Escribe tu contraseña otra vez y elige Verificar mi solicitud para saberlo. Si no se guardó, esto envía tu solicitud de eliminación ahora, así que verifica solo si todavía quieres eliminar tu cuenta.
- Delete my account / This can't be undone. → Eliminar mi cuenta / No se puede deshacer. The other outcome lines (busy, failed, unavailable, receipt) are literal, in the same file. The support email subject ("Account deletion {ref}") stays English for support.

**Device alerts, passkeys, calendar link** (`copy/device-alerts.ts`, `copy/passkeys.ts`, `copy/calendar.ts`)
- These settings apply to this browser only. Your notifications always stay in NEVORA, and your phone's settings can turn off every alert. → Estos ajustes aplican solo a este navegador. Tus notificaciones siempre se quedan en NEVORA, y los ajustes de tu teléfono pueden desactivar todas las alertas.
- Turn-off is still pending. To stop alerts now, block NEVORA notifications in your device or browser settings. Then return here and retry. You can still sign out. → La desactivación sigue pendiente. Para detener las alertas ahora, bloquea las notificaciones de NEVORA en los ajustes de tu dispositivo o navegador. Luego vuelve aquí e inténtalo de nuevo. Todavía puedes cerrar sesión.
- Your device may use a fingerprint, face scan, screen-lock code or security key. NEVORA does not receive your biometric data. → Tu dispositivo puede usar una huella digital, un escaneo facial, un código de bloqueo de pantalla o una llave de seguridad. NEVORA no recibe tus datos biométricos.
- Anyone with the link can see your shift times and locations, so keep it to yourself. → Cualquier persona con el enlace puede ver las horas y las localidades de tus turnos, así que no lo compartas.
- For your privacy the link is shown only once. Get a new link if you need to copy it again. → Por tu privacidad, el enlace se muestra una sola vez. Obtén un enlace nuevo si necesitas copiarlo otra vez.
- Your calendar app will no longer receive shifts through this link. Events already copied may remain in the app. → Tu aplicación de calendario ya no recibirá turnos mediante este enlace. Los eventos ya copiados pueden quedarse en la aplicación.

**One sentence to decide:** Profile's language hint "Sign-in pages only. The rest of NEVORA is in English for now." →
"Solo las páginas de inicio de sesión. El resto de NEVORA está en inglés por ahora." It stops being true once signed-in
Spanish ships; an existing English test asserts it, so it's unchanged.

## Blocking items left, and owners
1. **`<html lang>` stays `en` in Spanish** (all 14 routes, from the app layout). voice.md asks for `lang="es"` so
   VoiceOver pronounces it. Shell (payroll-2).
2. **employee-b draws most visible text on these pages** (es-employee): `time-b`, `pay-b`, `messages-b`, `requests-b`,
   `exchange-b`, `availability-b`, `timeoff-b`, `account-b-client` (calendar providers, Delete and Alerts phone screens).
   `messages-b` and `time-b` call `messageTime`, `notificationHeadline` and the `hours-model` helpers without `lang`; all
   now accept a trailing `lang`. `time-b` compares `correctionStatus(...).word==='Declined'`, which only holds in English.
3. **Shared parts still English**: `availability-corp.tsx` ('Not available', 'Done', 'Available'),
   `employee-requests-corp.tsx` (its `managerWaits` check reads the English word 'Waiting'), `employee-account-panel.tsx`
   ('Personal info' wrapper), `time-correction-context.tsx`, `shift-change-form-state.ts`, `lib/time-zone-label.ts`
   ("Puerto Rico time"), `lib/notification-facts.ts`, `native-shell/device-settings.tsx`. These screens translate those
   outputs locally where they can.
4. **Server-sent text stays English**: check notices, history event labels, blocked-rule messages, passkey notices, the
   deletion period ("30 calendar days after we receive the request"), device snapshot messages.
5. **`BDay`, `Dotted`, `wallTime` lang props** (es-employee): not on the shared tip yet at 7ae2ff19; once they are, pass
   `lang` where employee-mobile uses them.
6. **Audit hits in employee-b parts at 200%** (not employee-mobile): the day chip ("Mon"/"23") overlaps its neighbours
   on Time and Pick up and swap; the Updates card body (`p.eb-upd__body`) clips and overlaps its Open/Confirm buttons.
7. Intl gives "sept" for September in es-PR; left as is.

## Wording choices to confirm
"Tarjetas anteriores" (Past timecards), "Tiempo" (Time tab), "Turno para tomar" (Shift pickup), "Oferta para cubrir"
(Cover offer), "Terminar" (Done), "patrono" (employer), a notification is "notificación" and a team update is "aviso".

## Impeccable audit (Spanish pass)
- Hierarchy: unchanged; titles, rows and buttons keep their structure, only words change.
- Spacing and fit: 0 sideways scroll at 390 and 390/200%; the one clipped Spanish label fixed; buttons in employee-mobile
  markup stay one line at 390 ("Tomar", "Eliminar mi cuenta", "Tarjetas anteriores").
- Accessibility: axe 0 violations on 14 routes at both sizes; aria-labels, hidden text and status messages translated;
  `lang` attribute is the shell's (item 1).
- States: loading, paused, offline, denied, empty and error copy translated in every file and covered by the Spanish
  render tests; no browser capture of the failure states.

## Gaps
- Browser checks were on the development build (Chromium), one Employee profile. No WebKit, no Lead role, no failure
  states in the browser.
- `message-session.tsx`'s return link isn't render-tested (needs a tap to set the origin); its copy is checked.
