# es-rondo: signed-in Spanish for Rondo (H1–H4), Insights (H5) and Christmas bonus hours (H6)

Branch `claude-codex-collab-nevora-es-rondo`, from `claude-codex-collab-nevora` 7c1464eb, with the shared language
contract merged (960579cf). Fictional data only; no AI provider was called.

## Commits

| Commit | What |
|---|---|
| `6d97b968` | `owner-advisor/lang.tsx` (`useAdvisorLang`, `AdvisorLangProvider` for tests) and Spanish clock times in `format.ts` (`spanishTimes`: "8:00 a. m. – 12:00 p. m.", "Todo el día") |
| `5a7855aa` | Rondo for a Manager (`manager/manager-copy.ts`) |
| `cb440e51` | Merge of the shared tip (960579cf, `usePortalLang`) |
| `1b6ea378` | `useAdvisorLang` reads `usePortalLang()`; a provider set by a test or preview wins |
| `7891ef91` | Company knowledge (`knowledge/knowledge-copy.ts`) |
| `b57c03a3` | Weekly plan (`weekly/weekly-copy.ts`) and the route's error frame (`weekly-open-error.tsx`) |
| `a66426b6` | Rondo AI: briefing, attention, checks, period review, conversation, priorities (`advisor-copy.ts`); coverage plans and drafts (`coverage-copy.ts`); saved goals and tasks (`notebook-copy.ts`); Business records' existing Spanish moved to tú and "localidad" |
| `d9fd418b` | `advisor.css`: at 200% text a section's link drops under its label and the issue choices stack (Spanish ran off the card) |
| `725057e8` | Insights, "Informes" in Spanish (`reports-copy.ts`), and Christmas bonus hours (`christmas-bonus-copy.ts`) |
| `6779896b` | `christmas-bonus-report.css`: the bonus year's date labels wrap inside their card at 200% text |
| `0fd0e537` | Merge of the shared tip (8006f3b4); whole `src/components` + `src/app/app/reports` + `src/app/app/ai-manager`: 295 files, 3,330 tests, 0 failed; tsc 0; oxlint 0 |
| shots commit | This report and `shots/es-rondo/` |

How it works: every Rondo component reads `useAdvisorLang()` (the portal's language, from `usePortalLang()`) and picks
its strings from `<area>-copy.ts`, shaped `{en, es}` like `copy-receipt-copy.ts`. English is the same text as before,
character for character (each table's English points at the old strings or the `src/lib` tables it already used).
Controllers outside React take a `lang` at mount (`createAdvisorController(…, lang)`) or keep message codes
(`coverage-actions-controller.ts`: `messageCode`, English `message` unchanged). No request, response, permission or data
contract changed. About 1,050 strings moved or added in all (Rondo about 860, Insights about 150, Christmas bonus about 40).

Edits outside `src/components/owner-advisor` (all language wiring):
- `src/app/app/ai-manager/weekly/page.tsx`: its error frame renders `WeeklyOpenError`, a client component that reads the
  language.
- `src/app/app/reports/page.tsx` and `src/app/app/reports/christmas-bonus/page.tsx`: read
  `readPortalLanguage(proof)` (English if the read fails) for their own notices; the Christmas bonus page passes
  `lang` to `ChristmasBonusView`, a server component. `requireSessionMutationProof()` now runs before the role check, so
  the closed notice can be in Spanish too; it redirects only when there is no session, which `requireSession()` has
  already ruled out.
- `src/app/app/reports/christmas-bonus/error.tsx`, `src/components/reports.tsx`, `christmas-bonus-report.tsx`,
  `christmas-bonus-year-menu.tsx` and their tests. `report-lifetime.test.tsx` gets a `useContext` passthrough in its
  React mock (no assertion changed).

es-rest's earlier Insights slice (bdc9ea84 on its branch) is superseded by `725057e8`; the lead keeps this one.

## Tests
- Key sets match, deeply, per table: `advisor-copy.test.ts`, `coverage-copy.test.tsx`, `notebook-copy.test.tsx`,
  `manager/manager-copy.test.ts`, `knowledge/knowledge-copy.test.ts`, `weekly/weekly-copy.test.ts`,
  `business/copy.test.ts` (also: no usted, no "local"), `reports-copy.test.tsx`, `christmas-bonus-copy.test.ts`. Each also
  checks every function answers in both languages and that no Spanish line equals its English one except proper nouns.
- A Spanish render test per main view: Rondo AI (`render.test.tsx`, `attention.test.tsx`, `controller.test.ts`), Manager
  (`manager-rondo.es.test.tsx`), Weekly plan (`weekly-page.test.tsx`), Business records (`business-page.test.tsx`: list and
  review), Company knowledge (`knowledge-page.test.tsx`), Insights (`reports-copy.test.tsx`), Christmas bonus
  (`christmas-bonus-report.test.tsx`, `reports/christmas-bonus/page.test.tsx`, `reports/page.test.tsx`).
- Whole `src/components` suite plus `src/app/app/reports`, `tsc --noEmit -p .` and oxlint before each push. Last run, at
  `725057e8`: 294 files, 3,321 tests, 0 failed (after correcting one Spanish expectation, "Período de pago"); tsc 0; oxlint 0.

## Browser checks (Spanish, real sign-in language)
Development build of the owned app (`tools/ui-scan/desk.sh` in an isolated worktree of the pushed commit), fictional seed,
`NEVORA_SCAN_ADVISOR=1`. Spanish chosen the real way: the `nv-lang=es` cookie after sign-in, no saved Profile choice. Each
page at 390, 390 with 200% root text, and 1440; axe-core on the whole document at each width; the harness's audit
(clipped, offscreen, overlapping text) and a document overflow check.

| Row | Role | 390 | 390 at 200% | 1440 | axe |
|---|---|---|---|---|---|
| H1 Rondo AI | Owner | fits, buttons one line | fits after `d9fd418b` (before: "Verificar de nuevo" and "Actualizar historial" ran past the edge, "Dar seguimiento" overflowed its half-width button) | fits | 0 violations |
| H1 Rondo AI | Manager | fits | fits | fits | 0 |
| H2 Weekly plan | Owner | fits | fits | fits | 0 |
| H3 Business records | Owner | fits | fits | fits | 0 |
| H4 Company knowledge | Owner | fits | fits | fits | 0 |
| H5 Informes (Insights) | Owner, Manager | fits | fits | fits | 0 at 390 and 390 at 200%; 1440: `color-contrast` on `.c-ins__range` (the known false positive already in `rondo.md`, same as English). The audit's "overlap" entries are the closed "Cómo contamos" list, not visible text |
| H6 Christmas bonus hours | Owner, Manager | fits | fits after `6779896b` (before: "Fecha límite para solicitar la exención" ran 33px past the card) | fits | 0 |

Overflow (document wider than the viewport) was 0 everywhere. Captures: `shots/es-rondo/<row>-<o|m>-<390|390t|1440>.webp`.
Not checked in a browser: Weekly plan with a comparison open, Business records' review and Company knowledge's forms
(covered by Spanish render tests only); 768; reduced motion and keyboard order (no layout or motion changed except
`d9fd418b`, which only wraps and stacks).

## Impeccable audit (Spanish)
- Hierarchy: unchanged; titles, section labels and buttons keep their English roles. "Rondo AI" stays a proper noun.
- Spacing and alignment: unchanged at 390 and 1440. At 200% text the Rondo AI section links now sit under their label,
  left-aligned, and the attention choices stack full-width (English at 200% gets the same, which also stops "Track this
  issue" squeezing).
- Accessibility: axe 0 on all captured pages. Screen-reader-only text, aria-labels and live messages are in the tables.
  The shell still sets `<html lang="en">` on Spanish pages (below).
- States: loading, hidden, failed, offline, session-ended, empty and success lines are all in the tables and covered by
  render tests.
- Copy: tú throughout (Business records and the period review used usted; both fixed), glossary words (dueño, gerente,
  localidad, turno, Turno disponible, borrador, Nómina, tarjetas de tiempo, Por confirmar, marcar entrada), sentence case,
  no "¡", buttons in the infinitive, times "6:00 a. m. – 2:00 p. m.", dates "lun, 23 nov", ranges "23–29 nov",
  "período" spelled with the accent throughout.

## Word choices to confirm
Weekly plan "Fill gaps only" → "Cubrir lo que falta", "Still open" → "Aún sin cubrir", "OK" → "Entendido", "Open
Schedule" → "Abrir Horario". Manager "Released" → "liberado(s)" ("¿Cuántos turnos se liberaron?"), "Asked." → "Ya
preguntaste.", "Checked 3:04 PM" → "Revisado 3:04 p. m.". "Observed" → "Visto". Knowledge "Text fingerprint" → "Huella del
texto", "Gap until" → "Ninguna versión en uso hasta el", "Review by" → "Fecha de revisión", "Policy" → "Políticas".
Coverage "Scheduling" → "Horario", "Scheduling rules" → "Reglas del horario", "time slot" → "franja horaria", "Save
receipt" → "Constancia de lo guardado" ("Comprobante" is kept for pay statements). Business records "OK" → "Entendido".
Insights "Custom period" → "Otro período" (segment "Otro"), "Shift trade" → "Intercambio de turno".

## For Jose to review (money, tax, payroll, legal-adjacent and privacy lines)

### Christmas bonus hours (approved English note first)
1. Informational note (approved English, unchanged): "Informational only. Christmas bonus eligibility, amounts and
   exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying."
   → "Solo informativo. La elegibilidad, las cantidades y las exenciones del bono de Navidad dependen del tamaño del
   patrono y de la ley de Puerto Rico. Confírmalo con tu proveedor de nómina o tu asesor legal antes de pagar." (Title
   "Solo informativo".)
2. "Christmas bonus hours" → "Horas para el bono de Navidad"; "Who reached the Puerto Rico hours threshold" → "Quién
   alcanzó el mínimo de horas de Puerto Rico".
3. Footnote → "Las horas son el tiempo registrado en tarjetas de tiempo finalizadas de este año del bono, con los
   descansos incluidos. Las personas contratadas antes del 26 ene 2017 necesitan 700 horas; las contratadas en esa fecha
   o después, 1,350. “Revisar descansos” significa que lo alcanzan solo si sus descansos registrados cuentan como horas
   trabajadas. Los dueños no aparecen."
4. Statuses: Reached "Alcanzó", Check breaks "Revisar descansos", Not confirmed "Por confirmar", Not reached "No alcanzó",
   No hire date "Sin fecha de contratación". Facts: "{h} de {n} h", "{h} registradas", "Contratación: {date}", "Incluye {h}
   de descansos", "{n} días sin finalizar".
5. "1 persona tiene tiempo registrado en 3 días que todavía no están en una tarjeta de tiempo finalizada."; "Solo cuentan
   las tarjetas de tiempo finalizadas"; Payment window "Período de pago"; Exemption filing deadline "Fecha límite para
   solicitar la exención"; Bonus year "Año del bono"; "Fechas de este año del bono".
6. Notices: "Las horas para el bono de Navidad son para dueños y gerentes"; "Las horas para el bono de Navidad aplican a
   empresas en Puerto Rico"; "Este informe sigue las reglas del bono de Navidad de Puerto Rico, y esta empresa tiene otra
   zona horaria."; "No pudimos cargar las horas para el bono de Navidad"; "Horas para el bono de Navidad no disponibles".

### Insights (Informes)
- "El tiempo registrado incluye los descansos. Los descansos se muestran aparte; no se aplican reglas de pago ni de
  descuentos."
- "Entradas comparadas con el horario y las metas de descanso de cada persona. Estas notas no deciden tardanzas, medidas
  disciplinarias ni paga."
- "Las horas salen de las entradas e incluyen los descansos." / "Tarde significa después del inicio programado. No cambia
  la paga." / "Estas no son horas de nómina."
- Horas trabajadas; "{t} por debajo del plan"; "+{t} por encima del plan"; "de {t} planificadas"; Entradas tarde;
  Tarjetas de tiempo por terminar.

### Rondo AI: attendance and payroll period review, proposals
- Período de asistencia y nómina; "Elige de 1 a 31 días. El tiempo registrado y la preparación de nómina son revisiones
  separadas."; Revisar asistencia y nómina.
- Period review (shown in the review's own language): Excepciones del período; "Preparación de nómina sin verificar. Las
  reglas financieras actuales y los datos deben revisarse en Nómina; una lista sin excepciones no confirma que el pago sea
  correcto." (existing Spanish, kept); "La revisión está incompleta o una fuente está desactivada/no disponible."; Tiempo
  registrado; Tarjetas de tiempo no disponibles.; Personas en la fuente; "Sin localidad registrada en el período" (was
  "ubicación"); "Instantánea finalizada e histórica; no confirma que los datos actuales estén completos."; Corridas de
  nómina registradas; "Nómina desactivada/no disponible."; "No hay una corrida registrada para este período. La
  preparación sigue sin verificar."; Estado registrado; Revisión de reglas registrada; "Existe una corrida de corrección
  posterior."; "Revisa las correcciones y la población en Tarjetas de tiempo; las reglas y los bloqueos financieros en
  Nómina. No se infieren marcaciones ni tiempo compensado." (was "Revise", "marcajes").
- Issue labels, Spanish kept in `advisor-copy.ts` (the `src/lib` Spanish is unchanged): two fixes, "Sin tiempo
  registrado; revisa la población del período. Esto no establece una ausencia." and "La cobertura de localidades está
  incompleta."; new state words Borrador, Aprobado, Reabierto, Necesita revisión, Finalizado, Esperando importes,
  Bloqueado, Requiere revisión (Spanish reviews showed raw codes before).
- Proposals: "Elegible según las reglas actuales del horario. Horas programadas: X; meta: Y/sin definir."; "Asignación en
  borrador. Publicarla y avisar a los empleados requiere una decisión de publicación posterior."; "Horario publicado.
  Antes de guardar, se requiere un consentimiento aparte para publicar y notificar."; "Estas añaden una asignación. Las
  asignaciones existentes se mantienen; otros requisitos de personal o de puesto pueden seguir abiertos. La elegibilidad
  se verifica de nuevo al abrir y al guardar. Confirma la disponibilidad con la persona cuando haga falta."
- Briefing counts: Programados, En turno, Tarde, Sin marcar entrada. Access: "Tu acceso de dueño terminó. Inicia sesión
  de nuevo para continuar."

### Coverage plans and drafts
- "Estos planes salen de una búsqueda limitada, así que puede existir uno mejor. Si el horario cambia, compara de nuevo.
  Las horas añadidas no muestran costo laboral ni ahorros."
- "La cobertura en {X} está configurada para todo el día, así que este plan pone a una persona a trabajar las 24 horas. Si
  eso no es correcto, cambia los períodos de cobertura en Reglas del horario."
- "Añade {h} en {n} asignación/asignaciones. Con ella/ellas, se cubrirían {c} de las {r} que necesitan a alguien; …"
- "{n} localidad(es) de este plan ya tiene(n) un horario publicado. Cambiarlo es una decisión aparte en Horario, que
  incluye si notificar a las personas."
- "Cada plan es una opción aparte. Escoge uno; no mezcles partes de dos. Desde aquí no se guarda ni se publica nada, y no
  se notifica a nadie. Confirma con las personas involucradas antes de cambiar el horario."
- "Serían asignaciones en borrador. Las revisarías en Horario y decidirías después si publicarlas."; "Este plan incluye un
  horario publicado, así que no se puede guardar desde aquí. Revísalo en Horario."
- "{n} asignación guardada / asignaciones guardadas el {at}. No se publicó ningún horario ni se notificó a nadie."; "… como
  borrador. Los turnos existentes se quedan como están, y publicar es una decisión aparte."; "Algunas localidades o
  requisitos quedan fuera de esta revisión. Revisa el horario completo antes de publicar."; "Los borradores guardados no
  confirman que las personas aceptaron estos turnos ni que vayan a llegar."; "Revisé estas asignaciones y quiero
  guardarlas como borrador."; "{p} de {t} asignaciones exactas en el horario · {x} de {t} publicadas"; button "Guardar {n}
  borrador(es)" (shortened to stay one line); "Esta asignación necesita una comparación nueva solo de borradores. Revisa
  los horarios publicados en Horario."
- Saved goals: "Cerrar una tarea registra tu decisión. No verifica que se resolvió un problema de personal o de nómina.";
  "Escoge de 1 a 31 días. La preparación financiera todavía requiere revisión en Nómina."; Asistencia y nómina; Período de
  asistencia y nómina.

### Weekly plan (session, privacy, draft-only saves)
"Tu sesión terminó"; "Inicia sesión de nuevo para planificar una semana."; "Detalles ocultos"; "Los planes se ocultan
después de un rato."; "Aprobación anterior borrada" / "Se hizo con otro inicio de sesión."; "Puede que se haya guardado.
Enviarla de nuevo no la guarda dos veces."; "Guarda N turnos[ y reemplaza M] como borrador. Sin publicar y sin avisar a
nadie."; "Revisé todos los cambios propuestos y lo que queda sin cubrir"; "Tu acceso o la conexión cambió. Revísalo e
inténtalo de nuevo."

### Manager Rondo (privacy)
"Rondo oculta las respuestas cuando cambias de pantalla o se pierde la conexión."; "Respuesta oculta. Vuelve a preguntar
para verla."

### Company knowledge (privacy, deletion)
"Los chats de Rondo y el texto ya enviado al proveedor de IA se quedan"; "Borra su única versión para todos los dueños" /
"Borra las N versiones para todos los dueños"; "Borra todas las versiones"; "Entiendo que esto no se puede deshacer";
"Rondo deja de usarlo para todos los dueños. Las versiones se pueden seguir leyendo."; "Solo los dueños pueden ver esto";
"Privado · se abre en otra pestaña".

### Business records (cash, bills, sales, tax; privacy)
"Los chats de Rondo y el texto ya enviado al proveedor de IA se quedan"; "Este registro es tuyo. NEVORA no lo verifica y
no es una auditoría."; "Tú eliges lo que se incluye. NEVORA no puede saber si falta una cuenta."; "Rondo solo conoce las
cuentas que indicas. La caja compartida no se divide por localidad."; Caja y cuentas; Caja / Cuentas por pagar / Dinero
por cobrar / Ventas; Entradas de dinero / Salidas de dinero; Saldo inicial; Saldo final del archivo / Saldo final según
las filas; Diferencia; Cuentas aún por pagar / Te deben; Ventas antes de descuentos / Descuentos / Ventas netas; Impuesto
registrado; Cobrado en ventas / Reembolsos / Cargos; Ingresos netos; Órdenes canceladas; "Si se completan las cuentas y
cobros elegidos"; notes "no es efectivo / no es ganancia / no es impuesto a pagar / incluye las no confirmadas / una
cuenta, no un pronóstico"; "Diferencia de {amount}"; row kinds Saldo, Movimiento de caja, Cuenta por pagar, Dinero que te
deben, Venta, Reembolso, Cargo, Orden cancelada; fields Cantidad, Cambio en caja, Total de artículos, Descuento, Impuesto,
Cobrado, Cargo; "Las cantidades están escritas en" / "Dólares y centavos (12.50)" / "Centavos (1250)"; "Dólares de EE. UU.
(USD)" / "Euros (EUR)"; "Como aparece en tus archivos de caja"; "La caja compartida no se puede dividir por localidad"; "No
hay un saldo cuadrado para empezar"; "Los saldos no cuadran con las filas"; "Falta un saldo o aparece dos veces"; "Los
saldos no coinciden donde se unen dos períodos"; "Caja pendiente fuera de los totales" / "Caja revertida fuera de los
totales"; "Cuentas por pagar sin confirmar" / "Dinero por cobrar sin confirmar"; "No se calcula cambio de moneda ni
ganancia"; "La caja completa por localidad no está disponible con cuentas compartidas"; "Es tu propio archivo. NEVORA no lo
verifica"; "Una cantidad no es válida" / "Una cuenta tiene dos monedas"; "una cantidad" / "una venta que no cuadra".

## Left in English, and why (proposed ledger rows)
| Item | Where | Owner |
|---|---|---|
| `<html lang>` stays "en" on Spanish pages (voice.md asks for `lang="es"`) | `src/app/app/layout.tsx` | shell (payroll-2) |
| Phone tab bar in English (Home, Schedule, Time, Payroll, Team) | app shell | shell |
| Kit screen-reader text, e.g. "Loading…" in `BLoadingScreen`; `RouteSkeleton` "Loading {label}…" | `owner-b/b-kit.tsx`, route skeleton | kit / shell |
| Shared notices' built-in lines ("Company-wide access needed", "Try again") in `OwnerOnlyNotice`, `OperationalUnavailable`, `BRouteError` | shared components | es-rest / shell |
| Attention titles, details and basis written by the server ("Check shifts without a clock-in", "Review today's planning gaps", "… Maximum staffing shortfall: 1.", "Published shifts and recorded punches"); briefing source labels ("Today on the floor") | `src/lib/owner-advisor/briefing.ts` | server Spanish (lead to assign) |
| `issueLabel` Spanish in `src/lib/owner-advisor/workflow-contracts.ts` uses usted ("revise") and "ubicaciones" (Rondo now uses its own corrected copy) | `src/lib` | lead to assign |
| Insights report definitions, `overtime.reason`, clock-in observation messages; status codes outside the tables | server | server Spanish |
| `reviewCopy(lang)` shared review lines use usted in places | `review-details` | es-owner |
| Route `metadata` titles ("Weekly plan", "Insights", "Christmas bonus hours") | route files | needs `generateMetadata` (lead) |
| Rondo's controller messages keep the language the page opened in until reload | `controller.ts` | by design; noted |
| Saved goals' "Review current period" asks the server for an English review (`language: "en"`, unchanged request) | `notebook-panel.tsx` | Jose: follow the person's language? |
| Weekly plan "Available until" zone reads "GMT-4" in Spanish (Intl es-PR) | `weekly-page.tsx` | minor |
