# Spanish wording: "ponche" and "empresa" (Nov 26, 2026)

Jose's decisions, Nov 26, 2026:

1. "Ponche / ponchar" is the one Spanish word for a time-clock punch. It replaces "marcación / marcaciones" and the
   punch sense of "marcar".
2. "Espacio de trabajo" becomes "empresa" / "tu empresa".

Only Spanish values changed. English text, object keys and lookup keys are unchanged; a word-level diff of the commit
shows only Spanish words added or removed.

## Counts

- Shipped source: 318 Spanish UI strings in 83 files, plus 16 source comments that quote the glossary word. Nine
  files change only in a comment, so 92 files in all.
- Tests: 25 pinned Spanish strings and 1 comment in 13 test files. `src/test/spanish-glossary.test.ts` now also bans
  `/marcaci[oó]n/i` and `/espacio de trabajo/i` in shipped source.
- QA script: `scripts/clocker-ipad-ui-qa.mjs` waits for the "Ponchar entrada" button instead of "Marcar entrada".
- Voice guide: `docs/design/voice.md`, 8 examples and glossary rows plus Jose's dated note.

## Judgment calls

| Where | Decision | Why |
|---|---|---|
| Status labels "Sin marcar entrada" | "Sin ponchar" | Jose's approved wording. |
| "Sin marcar" (short label) | "Sin ponchar" | Same word. In `team-copy.ts`, the label and the filter now read the same, "Sin ponchar". |
| "sin marcar entrada" inside a sentence | "sin ponchar entrada" | Keeps the sentence specific to the clock-in: "Turnos que terminaron sin ponchar entrada", "3 turnos sin ponchar entrada, abrir en Pendientes". The count chip `{n} sin ponchar` follows the status label. |
| "Sin marcar salida", "Falta marcar salida", "sin marcar salida" | "Sin ponchar salida", "Falta ponchar salida", "sin ponchar salida" | Jose's "Sin ponchar" applies to the clock-in label, so the clock-out labels keep "salida". |
| `ATTENDANCE_WORDS_ES.missed` in `src/lib/action-center/present.ts` was "Sin marcar" | "No ponchó entrada" | A straight swap would make "Not clocked in" and "Missed" both "Sin ponchar", and the comment says Today tells them apart. "No ponchó entrada" is the missed word Owner B already uses (`owner-b-copy.ts` `ATTENDANCE.es.missed`). |
| "entrada(s) no marcada(s)" (Owner B, manager inbox) | "entrada(s) sin ponchar" | Matches "Entradas sin ponchar" elsewhere. |
| "Marcado/Marcadas esta semana" (hours clocked this week) | "Ponchado/Ponchadas esta semana" | Punch sense: hours recorded by punches. Agreement kept as it was (each file had its own gender). |
| "Un registro no tiene salida marcada." (advisor issue label, two files) | "Un registro no tiene ponche de salida." | Punch sense. "ponche de salida" reads better than "salida ponchada". The English pair is unchanged. |
| "Registra una tableta para marcar ponches" | "Registra una tableta para ponchar" | "marcar ponches" becomes the one verb. |
| "Fotos de marcación" | "Fotos de ponche" | Same noun swap in the nav, settings and Clocker. |
| "Estado de marcación (de hoy)" | "Estado de ponche (de hoy)" | Same noun swap. |
| "Dirección del espacio de trabajo" (sign-up web address field) | "Dirección web de tu empresa" | "Dirección de tu empresa" would read as the street address. "readyBody" uses the same "dirección web de tu empresa". |
| "Terminando tu espacio de trabajo." | "Terminando de preparar tu empresa." | "Terminando tu empresa" reads as finishing off the business. |
| "Esto crea tu espacio de trabajo." | "Esto crea tu empresa en NEVORA." | Without "en NEVORA" it reads as founding the business. |
| Account deletion: "el espacio de trabajo de tu empresa sigue/permanece abierto … Para cerrarlo" | "Tu empresa sigue/permanece abierta en NEVORA … Para cerrarla" | "en NEVORA" makes clear the account stays open, not the business; pronoun and participle now agree with "empresa". |
| Public account-deletion page: "cerrar un espacio de trabajo es un trámite aparte" | "cerrarla es un trámite aparte" | Avoids repeating "empresa" and avoids "cerrar una empresa" (dissolving the business). |
| Pronouns after the noun | "Pide a tu gerente que lo revise", "revísalo", "no lo registrará" | Each pronoun that pointed at "marcación" now points at "ponche". "Esta referencia … que la revise" keeps "la" because it points at "referencia". |

## Skipped: "marcar" that is not a punch

| File:line | Text | Sense |
|---|---|---|
| src/components/availability-editor-copy.ts:114 | todos los días marcados como no disponibles | days marked unavailable |
| src/components/roster-import/copy.ts:399 | las filas marcadas abajo | flagged rows |
| src/components/notification-copy.ts:41 | marcarla como leída | mark as read |
| src/components/communication-compose-copy.ts:372 | marcarlo como leído | mark as read |
| src/components/communication-copy.ts:173, 199, 207, 208 | marcarlo / Marcado / marcar / Marcar como leído | mark as read |
| src/components/communication-detail-copy.ts:256, 286 | Lectura marcada / marcar esta aviso como leída | mark as read |
| src/components/employee-b/messages-b-copy.ts:276, 284 | No has marcado … / Marcar como leído | mark as read |
| src/components/employee-b/account-copy.ts:333, 335 | No has marcado … / Marcar como leído | mark as read |
| src/components/employee-mobile/messages-view-copy.ts:202, 210 | No has marcado … / Marcar como leído | mark as read |
| src/components/employee-mobile/copy/messages-view.ts:69, 72 | No has marcado … / Marcar como leído | mark as read |
| src/components/notification-inbox-copy.ts:53, 54, 67, 72, 292, 342, 378, 380 | Marcada como leída, marcarla, Marcar … como leída, Marcando | mark as read |
| src/components/notifications-manager-b-copy.ts:106 | No podíamos marcar esa lectura | mark as read |
| src/components/employee-mobile/deletion-copy.ts:251, 484 | Marca esta casilla | check a box |
| src/components/shell-copy.ts:341 | Marca esta opción para continuar | check an option |
| src/components/employee-mobile/messages-compose-copy.ts:88, copy/messages-compose.ts:40 | los campos marcados | flagged fields |
| src/lib/onboarding/signup-copy.ts:234 | Revisa los campos marcados. | flagged fields |
| src/components/owner-advisor/coverage-plans-copy.ts:182, coverage-copy.ts:180 | localidades marcadas como Incluida | locations marked Included |
| src/components/owner-advisor/attention-copy.ts:146 | Marcado como no aplica hoy. | marked not applicable |
| src/components/company-policy-editor-copy.ts:530, 546 | Las alertas solo marcan horas / Una versión marcada como no utilizable | flag, mark unusable |
| src/app/app/schedule/schedule-copy.ts:384, 394; schedule/settings/page-copy.ts:282, 314 | Los máximos marcan horas de más / El horario marca la cobertura | flag |
| src/components/shell-copy.ts:57, 403; brand-editor-copy.ts:110, 114, 118, 138; settings/closed-line-copy.ts:54; settings/branding/*; settings/page-copy.ts:86 | Marca, la marca | brand |
| src/components/premium/treatments-copy.ts:644-686 | Marco … | frame |
| src/components/manager-week-overview-copy.ts:64 | marcha | "in progress" |
| src/test/fixtures/owner-advisor-resilience.ts:31 | Marca la nómina lista | mark payroll ready (test fixture) |

No legitimate non-punch use of "marcación" exists in shipped source, so the glossary test bans it outright.

Not touched: `src/lib/legal/` (no hits), the 1:1 English lookup keys in `src/components/clocker-copy.ts`, and the
older review and handoff documents under `docs/` that quote the old wording as history.

## Every changed string

Line numbers are in the new file. "(comment)" marks a source comment, not UI copy. Each row is one string literal;
a long string is shown whole.

## Shipped source (318 UI strings, 16 comments, 92 files)

#### `src/app/account-deletion/copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 29 | "Eliminar tu cuenta de NEVORA no termina tu empleo ni borra los registros que tu patrono tiene que conservar. Si eres el dueño, el espacio de trabajo de tu empresa sigue abierto para el resto de tu equipo; cerrar un espacio de trabajo es un trámite aparte, así que escribe a " | "Eliminar tu cuenta de NEVORA no termina tu empleo ni borra los registros que tu patrono tiene que conservar. Si eres el dueño, tu empresa sigue abierta en NEVORA para el resto de tu equipo; cerrarla es un trámite aparte, así que escribe a " |

#### `src/app/app/employees/[employeeId]/page-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 182 | "Marcado esta semana" | "Ponchado esta semana" |

#### `src/app/app/employees/employees-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 54 | 'Marcado esta semana' | 'Ponchado esta semana' |

#### `src/app/app/help/help-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 51 | 'Corregir una marcación' | 'Corregir un ponche' |

#### `src/app/app/help/page-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 88 | 'Corregir una marcación' | 'Corregir un ponche' |

#### `src/app/app/route-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 6 (comment) | "Marcación" | "Ponche" |

#### `src/app/app/settings/clocker/photos/page-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 12 | "Fotos de marcación" | "Fotos de ponche" |

#### `src/app/app/settings/clocker/photos/review/page-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 22 | "Revisar fotos de marcación" | "Revisar fotos de ponche" |
| 32 | "Fotos de marcación" | "Fotos de ponche" |

#### `src/app/app/settings/closed-line-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 42 | "Las fotos de marcación forman" | "Las fotos de ponche forman" |

#### `src/app/app/settings/page-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 110 | "Fotos de marcación" | "Fotos de ponche" |

#### `src/components/brand-editor-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 164 | "Marca entrada en la tableta de {place}" | "Poncha entrada en la tableta de {place}" |

#### `src/components/clocker-copy.ts` (60)

| Line | Before | After |
|---|---|---|
| 6 | "La verificación de tu PIN cambió. Ingresa tu PIN de nuevo; no se registró ninguna marcación dos veces." | "La verificación de tu PIN cambió. Ingresa tu PIN de nuevo; no se registró ningún ponche dos veces." |
| 7 | "Esta referencia pertenece a otra marcación. Pide a tu gerente que la revise." | "Esta referencia pertenece a otro ponche. Pide a tu gerente que la revise." |
| 8 | "No pudimos confirmar tu marcación. Toca Verificar estado de la acción antes de volver a intentarlo." | "No pudimos confirmar tu ponche. Toca Verificar estado de la acción antes de volver a intentarlo." |
| 9 | "No pudimos confirmar tu marcación. Toca Verificar estado de la acción antes de volver a intentarlo." | "No pudimos confirmar tu ponche. Toca Verificar estado de la acción antes de volver a intentarlo." |
| 11 | "Foto para marcar entrada" | "Foto para ponchar entrada" |
| 12 | "Foto para marcar salida" | "Foto para ponchar salida" |
| 19 | "Esta tableta no puede guardar marcaciones" | "Esta tableta no puede guardar ponches" |
| 21 | "Verifica tu marcación" | "Verifica tu ponche" |
| 27 | "Preparando tu marcación…" | "Preparando tu ponche…" |
| 33 | "Foto temporal para esta marcación" | "Foto temporal para este ponche" |
| 36 | "La cámara está apagada. Confirma la foto para registrar tu marcación." | "La cámara está apagada. Confirma la foto para registrar tu ponche." |
| 49 | "Reintentar la misma marcación" | "Reintentar el mismo ponche" |
| 56 | "{company} usa fotos en las marcaciones seleccionadas. Se conservan por {days} días. Solo un dueño autorizado puede revisarlas." | "{company} usa fotos en los ponches seleccionados. Se conservan por {days} días. Solo un dueño autorizado puede revisarlas." |
| 61 | "Puedes continuar sin foto. Tu marcación y la falta de foto se registran por separado." | "Puedes continuar sin foto. Tu ponche y la falta de foto se registran por separado." |
| 70 | "Tu tiempo está registrado. El resultado de la foto no está confirmado. Verificarla no repetirá tu marcación." | "Tu tiempo está registrado. El resultado de la foto no está confirmado. Verificarla no repetirá tu ponche." |
| 73 | "Esta tableta indica que está sin conexión. No se ha enviado ninguna marcación. Reconecta la tableta o usa la opción de asistencia de tu empresa. Las fotos no se guardan en una cola del navegador." | "Esta tableta indica que está sin conexión. No se ha enviado ningún ponche. Reconecta la tableta o usa la opción de asistencia de tu empresa. Las fotos no se guardan en una cola del navegador." |
| 76 | "Esta tableta indica que está sin conexión. El resultado no está confirmado. Verifica la marcación original cuando la tableta se reconecte." | "Esta tableta indica que está sin conexión. El resultado no está confirmado. Verifica el ponche original cuando la tableta se reconecte." |
| 77 | "Esta tableta indica que está sin conexión. No se ha enviado ninguna marcación. Reconecta la tableta o usa la opción de asistencia de tu empresa." | "Esta tableta indica que está sin conexión. No se ha enviado ningún ponche. Reconecta la tableta o usa la opción de asistencia de tu empresa." |
| 94 | "Tu marcación anterior queda en esta tableta para revisión. No se registró nada nuevo." | "Tu ponche anterior queda en esta tableta para revisión. No se registró nada nuevo." |
| 139 | "Las marcaciones aún no están activadas. No uses esta tableta para registrar tiempo." | "Los ponches aún no están activados. No uses esta tableta para registrar tiempo." |
| 166 | "{device} está lista. Tu personal ya puede marcar." | "{device} está lista. Tu personal ya puede ponchar." |
| 185 | "¿Marcar salida?" | "¿Ponchar salida?" |
| 196 | "No se envió ninguna marcación. Pide a un gerente que revise esta tableta." | "No se envió ningún ponche. Pide a un gerente que revise esta tableta." |
| 199 | "Aún no hemos confirmado tu última marcación. Toca Reintentar la misma marcación; no se marcará dos veces." | "Aún no hemos confirmado tu último ponche. Toca Reintentar el mismo ponche; no se ponchará dos veces." |
| 200 | "Registrando tu marcación…" | "Registrando tu ponche…" |
| 201 | "Revisa tu última marcación" | "Revisa tu último ponche" |
| 202 | "La marcación anterior necesita revisión" | "El ponche anterior necesita revisión" |
| 208 | "Tu tiempo se registra al marcar la entrada." | "Tu tiempo se registra al ponchar la entrada." |
| 226 | "Una marcación guardada no se puede leer. Pide a tu gerente que la revise." | "Un ponche guardado no se puede leer. Pide a tu gerente que lo revise." |
| 229 | "Revisar estado de la marcación" | "Revisar estado del ponche" |
| 230 | "Reintentar la misma marcación" | "Reintentar el mismo ponche" |
| 232 | "No borres los datos del navegador mientras haya una marcación sin confirmar." | "No borres los datos del navegador mientras haya un ponche sin confirmar." |
| 249 | "Marcar entrada" | "Ponchar entrada" |
| 250 | "Marcar salida" | "Ponchar salida" |
| 268 | "No puede guardar marcaciones" | "No puede guardar ponches" |
| 298 | "Vuelve a conectar esta tableta antes de marcar." | "Vuelve a conectar esta tableta antes de ponchar." |
| 299 | "No pudimos confirmar el resultado de la marcación." | "No pudimos confirmar el resultado del ponche." |
| 300 | "Las marcaciones no están activadas en este entorno." | "Los ponches no están activados en este entorno." |
| 309 | "Las fotos de marcación no están activadas en este entorno." | "Las fotos de ponche no están activadas en este entorno." |
| 311 | "El horario publicado cambió mientras se registraba esta marcación. Revisa el estado actual y reintenta la misma marcación." | "El horario publicado cambió mientras se registraba este ponche. Revisa el estado actual y reintenta el mismo ponche." |
| 313 | "Revisa la marcación y actualiza su estado." | "Revisa el ponche y actualiza su estado." |
| 315 | "La verificación de la tableta cambió. No repitas la marcación anterior." | "La verificación de la tableta cambió. No repitas el ponche anterior." |
| 316 | "Tu estado cambió. Actualiza antes de elegir una marcación." | "Tu estado cambió. Actualiza antes de elegir un ponche." |
| 317 | "Esta referencia ya pertenece a otra marcación. Revisa su comprobante guardado." | "Esta referencia ya pertenece a otro ponche. Revisa su comprobante guardado." |
| 318 | "Esta marcación no está disponible en tu estado actual." | "Este ponche no está disponible en tu estado actual." |
| 322 | "No pudimos confirmar el resultado de la marcación. Revisa la marcación original antes de reintentar." | "No pudimos confirmar el resultado del ponche. Revisa el ponche original antes de reintentar." |
| 330 | "Se acabó el tiempo de tu PIN. Una marcación sin confirmar queda en esta tableta." | "Se acabó el tiempo de tu PIN. Un ponche sin confirmar queda en esta tableta." |
| 334 | "Esta marcación no coincide con lo que tiene NEVORA. Pide a un gerente que la revise." | "Este ponche no coincide con lo que tiene NEVORA. Pide a un gerente que lo revise." |
| 359 | "Esta tableta guardó tu marcación y no la registrará dos veces." | "Esta tableta guardó tu ponche y no lo registrará dos veces." |
| 361 | "Sin conexión. Espera a que regrese antes de marcar, o avísale a un gerente." | "Sin conexión. Espera a que regrese antes de ponchar, o avísale a un gerente." |
| 368 | "Revisa tu última marcación" | "Revisa tu último ponche" |
| 371 | "Tu última marcación aún no está confirmada. Toca Enviar de nuevo. No se registrará dos veces." | "Tu último ponche aún no está confirmado. Toca Enviar de nuevo. No se registrará dos veces." |
| 376 | "Esta tableta no puede leer sus marcaciones guardadas" | "Esta tableta no puede leer sus ponches guardados" |
| 377 | "La marcación de otra persona está pendiente" | "El ponche de otra persona está pendiente" |
| 378 | "La persona anterior tiene una marcación sin confirmar en esta tableta. Pídele que ingrese su PIN de nuevo. No se registró nada para ti." | "La persona anterior tiene un ponche sin confirmar en esta tableta. Pídele que ingrese su PIN de nuevo. No se registró nada para ti." |
| 379 | "Tu marcación anterior no se registró" | "Tu ponche anterior no se registró" |
| 384 | "Tu marcación está guardada en esta tableta" | "Tu ponche está guardado en esta tableta" |
| 385 | "Tus marcaciones están guardadas en esta tableta" | "Tus ponches están guardados en esta tableta" |
| 395 | "Tu marcación aún no está confirmada. Toca Revisar si se guardó antes de hacer otra cosa." | "Tu ponche aún no está confirmado. Toca Revisar si se guardó antes de hacer otra cosa." |
| 397 | "Ingresa tu PIN de nuevo para revisar una marcación sin confirmar." | "Ingresa tu PIN de nuevo para revisar un ponche sin confirmar." |

#### `src/components/clocker-device-manager-copy.ts` (3)

| Line | Before | After |
|---|---|---|
| 88 | "Una tableta de registro de tiempo es una tableta compartida en una localidad. Tu equipo marca entrada y salida en ella con su ID de empleado y su PIN." | "Una tableta de registro de tiempo es una tableta compartida en una localidad. Tu equipo poncha entrada y salida en ella con su ID de empleado y su PIN." |
| 132 | "Marcar entrada y salida en esta tableta se detiene de inmediato, y cualquier código de configuración suyo deja de funcionar. El tiempo ya registrado se conserva. Puedes configurarla de nuevo después." | "Ponchar entrada y salida en esta tableta se detiene de inmediato, y cualquier código de configuración suyo deja de funcionar. El tiempo ya registrado se conserva. Puedes configurarla de nuevo después." |
| 138 | "Las tabletas compartidas donde tu equipo marca entrada y salida." | "Las tabletas compartidas donde tu equipo poncha entrada y salida." |

#### `src/components/clocker-owner-copy.ts` (14)

| Line | Before | After |
|---|---|---|
| 424 | 'La tableta conectada ahora deja de funcionar de inmediato. Nadie puede marcar en ella hasta que se configure una tableta con el código nuevo. El tiempo ya registrado se conserva.' | 'La tableta conectada ahora deja de funcionar de inmediato. Nadie puede ponchar en ella hasta que se configure una tableta con el código nuevo. El tiempo ya registrado se conserva.' |
| 518 | 'Las personas inactivas no pueden marcar. Actívala de nuevo antes de crear un PIN.' | 'Las personas inactivas no pueden ponchar. Actívala de nuevo antes de crear un PIN.' |
| 523 | 'No puede marcar en una tableta hasta que cree uno.' | 'No puede ponchar en una tableta hasta que cree uno.' |
| 526 | 'Fotos de marcación' | 'Fotos de ponche' |
| 529 | 'Las fotos de marcación aún no están disponibles' | 'Las fotos de ponche aún no están disponibles' |
| 531 | 'Tomar fotos de marcación' | 'Tomar fotos de ponche' |
| 536 | 'Marcar entrada' | 'Ponchar entrada' |
| 539 | 'Marcar salida' | 'Ponchar salida' |
| 545 | 'Revisar fotos de marcación' | 'Revisar fotos de ponche' |
| 561 | 'Las marcaciones hechas hasta esta cantidad de minutos antes del inicio de un turno cuentan para ese turno. El tiempo pagado sigue empezando en la marcación real. 0 mantiene la asociación estricta.' | 'Los ponches hechos hasta esta cantidad de minutos antes del inicio de un turno cuentan para ese turno. El tiempo pagado sigue empezando en el ponche real. 0 mantiene la asociación estricta.' |
| 578 | 'Cuando una tableta no puede confirmar una marcación, guarda un código. Verificar un código aquí nunca cambia el tiempo registrado.' | 'Cuando una tableta no puede confirmar un ponche, guarda un código. Verificar un código aquí nunca cambia el tiempo registrado.' |
| 591 | `Verificar la marcación guardada de ${name}` | `Verificar el ponche guardado de ${name}` |
| 604 | 'Esta marcación se guardó' | 'Este ponche se guardó' |
| 622 | 'Marcación registrada' | 'Ponche registrado' |

#### `src/components/clocker-owner-requests-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 62 | "Verificar la marcación guardada de {name}" | "Verificar el ponche guardado de {name}" |

#### `src/components/clocker-photo/photo-notice-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 36 | 'Puedes continuar sin una foto. Tu marcación y la foto que falta se registran por separado' | 'Puedes continuar sin una foto. Tu ponche y la foto que falta se registran por separado' |

#### `src/components/clocker-photo/photo-owner-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 5 (comment) | "Marcación" | "Ponche" |
| 105 | `Foto privada de marcación de ${name}: ${action.toLowerCase()}` | `Foto privada de ponche de ${name}: ${action.toLowerCase()}` |

#### `src/components/clocker-photo/photo-review-copy.ts` (9)

| Line | Before | After |
|---|---|---|
| 72 | "Marcar entrada" | "Ponchar entrada" |
| 78 | "Marcar salida" | "Ponchar salida" |
| 92 | "Se confirmó que se eliminó la foto de marcación. El registro de tiempo se conserva. Las copias de respaldo siguen el aviso de fotos de tu empresa." | "Se confirmó que se eliminó la foto de ponche. El registro de tiempo se conserva. Las copias de respaldo siguen el aviso de fotos de tu empresa." |
| 96 | "Marcaciones" | "Ponches" |
| 104 | "Aún no hay registros de fotos de marcación" | "Aún no hay registros de fotos de ponche" |
| 106 | "Los registros de fotos aparecen después de una marcación autorizada. Esta página no enciende ninguna cámara ni recoge fotos de empleados." | "Los registros de fotos aparecen después de un ponche autorizado. Esta página no enciende ninguna cámara ni recoge fotos de empleados." |
| 108 | "Registros de fotos de marcación" | "Registros de fotos de ponche" |
| 120 | "Foto privada de marcación de {employeeName}: {labels}" | "Foto privada de ponche de {employeeName}: {labels}" |
| 128 | "¿Eliminar esta foto de marcación?" | "¿Eliminar esta foto de ponche?" |

#### `src/components/clocker-photo/photo-settings-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 28 | "Activa Tomar fotos de marcación para elegirlos." | "Activa Tomar fotos de ponche para elegirlos." |

#### `src/components/clocker-photo/punch-photo-flow-copy.ts` (6)

| Line | Before | After |
|---|---|---|
| 120 | 'Esta tableta no puede guardar marcaciones' | 'Esta tableta no puede guardar ponches' |
| 124 | 'Comprueba tu última marcación' | 'Comprueba tu último ponche' |
| 126 | 'Guardando la foto de tu marcación…' | 'Guardando la foto de tu ponche…' |
| 138 | 'Tu marcación aún no está confirmada. Toca Comprobar si se guardó antes de hacer cualquier otra cosa' | 'Tu ponche aún no está confirmado. Toca Comprobar si se guardó antes de hacer cualquier otra cosa' |
| 162 | 'Tu última marcación aún no está confirmada. Toca Enviarlo de nuevo. No se registrará dos veces' | 'Tu último ponche aún no está confirmado. Toca Enviarlo de nuevo. No se registrará dos veces' |
| 170 | 'Ingresa tu PIN de nuevo para comprobar una marcación que no está confirmada' | 'Ingresa tu PIN de nuevo para comprobar un ponche que no está confirmado' |

#### `src/components/clocker-pin-editor-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 8 | "Las personas inactivas no pueden marcar. Reactiva a la persona antes de crearle un PIN." | "Las personas inactivas no pueden ponchar. Reactiva a la persona antes de crearle un PIN." |

#### `src/components/clocker-pin-inventory-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 26 | "Crea un PIN para cada persona que marca en una tableta." | "Crea un PIN para cada persona que poncha en una tableta." |
| 30 | "Cada persona marca con su propio ID de empleado y su PIN. Nadie puede ver un PIN después de crearlo, ni tú." | "Cada persona poncha con su propio ID de empleado y su PIN. Nadie puede ver un PIN después de crearlo, ni tú." |

#### `src/components/clocker-recovery-review-copy.ts` (3)

| Line | Before | After |
|---|---|---|
| 94 | "Cuando una tableta no puede confirmar una marcación, guarda un código. Verificar un código aquí nunca cambia el tiempo registrado." | "Cuando una tableta no puede confirmar un ponche, guarda un código. Verificar un código aquí nunca cambia el tiempo registrado." |
| 112 | "Esta marcación se guardó" | "Este ponche se guardó" |
| 134 | "Marcación registrada" | "Ponche registrado" |

#### `src/components/clocker-setup-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 48 | "Tu equipo usará esta tableta para marcar en esta localidad." | "Tu equipo usará esta tableta para ponchar en esta localidad." |

#### `src/components/company-access/access-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 348 | 'Marcadas esta semana' | 'Ponchadas esta semana' |
| 357 | 'Sin correo, esta persona puede marcar en la tableta, pero no puede iniciar sesión en NEVORA.' | 'Sin correo, esta persona puede ponchar en la tableta, pero no puede iniciar sesión en NEVORA.' |

#### `src/components/company-access/new-employee-form-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 112 | "Sin correo, esta persona puede marcar en la tableta, pero no puede iniciar sesión en NEVORA." | "Sin correo, esta persona puede ponchar en la tableta, pero no puede iniciar sesión en NEVORA." |

#### `src/components/company-access/scoped-person-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 42 | "Marcadas esta semana" | "Ponchadas esta semana" |

#### `src/components/company-policy-editor-copy.ts` (4)

| Line | Before | After |
|---|---|---|
| 298 | "Falta marcar entrada" | "Falta ponchar entrada" |
| 300 | "Falta marcar salida" | "Falta ponchar salida" |
| 310 | "Entradas sin marcar" | "Entradas sin ponchar" |
| 312 | "Salidas sin marcar" | "Salidas sin ponchar" |

#### `src/components/configured-attendance-policies-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 114 | 'Sin marcar salida' | 'Sin ponchar salida' |

#### `src/components/delegated-time-correction-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 5 (comment) | * and Puerto Rico Spanish (docs/design/voice.md: Marcación, Tarjeta de tiempo, Solicitud de corrección). */ | * and Puerto Rico Spanish (docs/design/voice.md: Ponche, Tarjeta de tiempo, Solicitud de corrección). */ |

#### `src/components/delegated-time-correction-form-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 92 | "Cierra la marcación abierta antes de proponer una corrección." | "Cierra el ponche abierto antes de proponer una corrección." |
| 116 | ", en {timeZone}. Las marcaciones originales se conservan." | ", en {timeZone}. Los ponches originales se conservan." |

#### `src/components/employee-b/account-b-client-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 596 | 'El espacio de trabajo de tu empresa permanece abierto para el resto de tu equipo. Para cerrarlo, envía un correo electrónico a {support}' | 'Tu empresa permanece abierta en NEVORA para el resto de tu equipo. Para cerrarla, envía un correo electrónico a {support}' |

#### `src/components/employee-b/home-b-copy.ts` (3)

| Line | Before | After |
|---|---|---|
| 144 | 'Marcaste entrada a las {clockInAt}' | 'Ponchaste entrada a las {clockInAt}' |
| 148 | 'Marca entrada en la tableta de {locationLabel}' | 'Poncha entrada en la tableta de {locationLabel}' |
| 150 | 'Marca tus descansos y tu salida allí también' | 'Poncha tus descansos y tu salida allí también' |

#### `src/components/employee-b/time-b-copy.ts` (9)

| Line | Before | After |
|---|---|---|
| 222 | "Sin marcar entrada" | "Sin ponchar" |
| 228 | "Marca entrada en {tablet}" | "Poncha entrada en {tablet}" |
| 234 | "Marca tus descansos y tu salida allí también" | "Poncha tus descansos y tu salida allí también" |
| 238 | "Marca tus descansos y tu salida en la tableta de tu localidad." | "Poncha tus descansos y tu salida en la tableta de tu localidad." |
| 248 | "Corregir una marcación" | "Corregir un ponche" |
| 266 | "Marcaciones" | "Ponches" |
| 296 | "Para corregir un día que ya marcaste, ábrelo desde Tiempo." | "Para corregir un día que ya ponchaste, ábrelo desde Tiempo." |
| 326 | "Tu gerente revisa esta solicitud. Tus marcaciones originales no cambian." | "Tu gerente revisa esta solicitud. Tus ponches originales no cambian." |
| 384 | "Sin marcaciones registradas" | "Sin ponches registrados" |

#### `src/components/employee-b/time-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 6 (comment) | * Marcación, En turno, Tarjeta de tiempo, Solicitud de corrección). English is the approved wording, unchanged. Status words, | * Ponche, En turno, Tarjeta de tiempo, Solicitud de corrección). English is the approved wording, unchanged. Status words, |

#### `src/components/employee-b/work-copy.ts` (5)

| Line | Before | After |
|---|---|---|
| 124 | `Tu turno de ${range} terminó. Marca tu salida en la tableta de ${place}.` | `Tu turno de ${range} terminó. Poncha tu salida en la tableta de ${place}.` |
| 147 | `Sin marcar entrada · ${span}` | `Sin ponchar · ${span}` |
| 170 | `Marcaste entrada a ${withSpanishHourArticle(time)}` | `Ponchaste entrada a ${withSpanishHourArticle(time)}` |
| 172 | `Marca entrada en la tableta de ${place}` | `Poncha entrada en la tableta de ${place}` |
| 173 | 'Ahí también marcas descansos y salida' | 'Ahí también ponchas descansos y salida' |

#### `src/components/employee-home-actions-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 110 | 'El estado de tu marcación, abajo, indica si estás en turno.' | 'El estado de tu ponche, abajo, indica si estás en turno.' |

#### `src/components/employee-home-copy.ts` (3)

| Line | Before | After |
|---|---|---|
| 159 | `Marca entrada en la tableta de ${place}` | `Poncha entrada en la tableta de ${place}` |
| 164 | 'El estado de tu marcación, abajo, indica si estás en turno.' | 'El estado de tu ponche, abajo, indica si estás en turno.' |
| 164 | 'El estado de tu marcación, abajo, indica si estás en turno.' | 'El estado de tu ponche, abajo, indica si estás en turno.' |

#### `src/components/employee-home-reviewed-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 312 | 'El estado de tu marcación, abajo, indica si estás en turno.' | 'El estado de tu ponche, abajo, indica si estás en turno.' |

#### `src/components/employee-mobile/copy/hours-cards.ts` (1)

| Line | Before | After |
|---|---|---|
| 6 (comment) | * de tiempo", "Marcación", "Descanso", "Comprobante de pago", "gerente"). A timecard ("tarjeta") is feminine, so its | * de tiempo", "Ponche", "Descanso", "Comprobante de pago", "gerente"). A timecard ("tarjeta") is feminine, so its |

#### `src/components/employee-mobile/copy/hours-corp.ts` (2)

| Line | Before | After |
|---|---|---|
| 6 (comment) | "Marcación" | "Ponche" |
| 242 | 'Tu gerente la revisa. Tus marcaciones originales no cambian.' | 'Tu gerente la revisa. Tus ponches originales no cambian.' |

#### `src/components/employee-mobile/copy/hours-corrections.ts` (1)

| Line | Before | After |
|---|---|---|
| 6 (comment) | * corrección", "Marcación", "Descanso", "gerente", "Tarjeta de tiempo", "localidad"; buttons in the infinitive). A | * corrección", "Ponche", "Descanso", "gerente", "Tarjeta de tiempo", "localidad"; buttons in the infinitive). A |

#### `src/components/employee-mobile/copy/hours-model.ts` (1)

| Line | Before | After |
|---|---|---|
| 6 (comment) | "Marcación" | "Ponche" |

#### `src/components/employee-mobile/copy/hours-records.ts` (1)

| Line | Before | After |
|---|---|---|
| 5 (comment) | "Marcación" | "Ponche" |

#### `src/components/employee-mobile/copy/hours.ts` (1)

| Line | Before | After |
|---|---|---|
| 6 (comment) | "Marcación" | "Ponche" |

#### `src/components/employee-mobile/deletion-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 153 | 'El espacio de trabajo de tu empresa sigue abierto para el resto de tu equipo. Para cerrarlo, escribe a ' | 'Tu empresa sigue abierta en NEVORA para el resto de tu equipo. Para cerrarla, escribe a ' |
| 402 | 'El espacio de trabajo de tu empresa permanece abierto para el resto de tu equipo. Para cerrarlo, envía un correo electrónico a {support}' | 'Tu empresa permanece abierta en NEVORA para el resto de tu equipo. Para cerrarla, envía un correo electrónico a {support}' |

#### `src/components/employee-mobile/hours-cards-copy.ts` (4)

| Line | Before | After |
|---|---|---|
| 98 | "A una entrada todavía le falta la marcación de salida." | "A una entrada todavía le falta el ponche de salida." |
| 122 | "No pudimos verificar tu tarjeta de tiempo. Tus marcaciones registradas siguen disponibles en Horas." | "No pudimos verificar tu tarjeta de tiempo. Tus ponches registrados siguen disponibles en Horas." |
| 154 | "Marcaciones originales" | "Ponches originales" |
| 158 | "Tiempo sin marcar aprobado · No se creó una marcación en el dispositivo." | "Tiempo sin ponchar aprobado · No se creó un ponche en el dispositivo." |

#### `src/components/employee-mobile/hours-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 116 | "Tus marcaciones, descansos y tiempo registrado" | "Tus ponches, descansos y tiempo registrado" |

#### `src/components/employee-mobile/hours-corp-copy.ts` (14)

| Line | Before | After |
|---|---|---|
| 352 | "Sin marcar entrada" | "Sin ponchar" |
| 358 | "Marca tu entrada en {tablet}." | "Poncha tu entrada en {tablet}." |
| 362 | "Toma tus descansos y marca tu salida en la tableta de tu localidad." | "Toma tus descansos y poncha tu salida en la tableta de tu localidad." |
| 372 | "Corregir una marcación" | "Corregir un ponche" |
| 382 | "Marcaciones" | "Ponches" |
| 450 | "No se creó una marcación en el dispositivo para este tiempo." | "No se creó un ponche en el dispositivo para este tiempo." |
| 452 | "Tus marcaciones originales se conservan." | "Tus ponches originales se conservan." |
| 478 | "Para corregir un día que ya marcaste, ábrelo desde Tiempo." | "Para corregir un día que ya ponchaste, ábrelo desde Tiempo." |
| 486 | "Sin marcaciones registradas" | "Sin ponches registrados" |
| 508 | "Tu gerente revisa esta solicitud. Tus marcaciones originales no cambian." | "Tu gerente revisa esta solicitud. Tus ponches originales no cambian." |
| 616 | "Marcar entrada" | "Ponchar entrada" |
| 620 | "Marcar salida" | "Ponchar salida" |
| 628 | "Un turno completo sin marcar, sin entrada ni salida" | "Un turno completo sin ponchar, sin entrada ni salida" |
| 630 | "Cambia tu tiempo aprobado de un turno sin marcar" | "Cambia tu tiempo aprobado de un turno sin ponchar" |

#### `src/components/employee-mobile/hours-corrections-copy.ts` (4)

| Line | Before | After |
|---|---|---|
| 170 | "No pudimos verificar tu historial de correcciones. Tus marcaciones registradas siguen en Horas." | "No pudimos verificar tu historial de correcciones. Tus ponches registrados siguen en Horas." |
| 190 | "Para corregir una marcación o un descanso, abre su entrada registrada en Horas o en Tarjetas de tiempo. Tu gerente revisa cada solicitud." | "Para corregir un ponche o un descanso, abre su entrada registrada en Horas o en Tarjetas de tiempo. Tu gerente revisa cada solicitud." |
| 208 | "Tu gerente revisará esta solicitud. Las marcaciones originales no cambian." | "Tu gerente revisará esta solicitud. Los ponches originales no cambian." |
| 286 | "Tu gerente revisa esta solicitud. Las marcaciones originales no cambian y los ajustes aprobados aparecen en tu tarjeta de tiempo. Las horas están en {timeZone}." | "Tu gerente revisa esta solicitud. Los ponches originales no cambian y los ajustes aprobados aparecen en tu tarjeta de tiempo. Las horas están en {timeZone}." |

#### `src/components/employee-mobile/hours-model-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 54 | "A una entrada todavía le falta la marcación de salida." | "A una entrada todavía le falta el ponche de salida." |
| 82 | "Turno sin marcar" | "Turno sin ponchar" |

#### `src/components/employee-mobile/hours-records-copy.ts` (4)

| Line | Before | After |
|---|---|---|
| 110 | "Marcaciones registradas" | "Ponches registrados" |
| 138 | "Estado de marcación de hoy" | "Estado de ponche de hoy" |
| 144 | "Usa el Clocker de tu localidad para marcar entrada, salida o un descanso." | "Usa el Clocker de tu localidad para ponchar entrada, salida o un descanso." |
| 158 | "No hay marcaciones registradas hoy. Usa el Clocker de tu localidad cuando empieces a trabajar." | "No hay ponches registrados hoy. Usa el Clocker de tu localidad cuando empieces a trabajar." |

#### `src/components/employee-time-copy.ts` (3)

| Line | Before | After |
|---|---|---|
| 6 (comment) | "Marcación" | "Ponche" |
| 7 (comment) | "Corregir una marcación" | "Corregir un ponche" |
| 86 | 'Marcaste entrada a las' | 'Ponchaste entrada a las' |

#### `src/components/employee-time-corrections-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 198 | "El tiempo faltante se envía como una corrección. No crea una marcación en el Clocker." | "El tiempo faltante se envía como una corrección. No crea un ponche en el Clocker." |

#### `src/components/employee-time-panel-copy.ts` (7)

| Line | Before | After |
|---|---|---|
| 188 | "Estado de marcación" | "Estado de ponche" |
| 192 | "Marcaste entrada a las " | "Ponchaste entrada a las " |
| 206 | "Revisando tus marcaciones y descansos." | "Revisando tus ponches y descansos." |
| 208 | "Usa el Clocker de tu localidad para registrar tus marcaciones." | "Usa el Clocker de tu localidad para registrar tus ponches." |
| 210 | "Solo marcaciones registradas." | "Solo ponches registrados." |
| 234 | "No hay marcaciones registradas hoy." | "No hay ponches registrados hoy." |
| 276 | "Las marcaciones vienen del Clocker de tu localidad." | "Los ponches vienen del Clocker de tu localidad." |

#### `src/components/management-close-copy.ts` (7)

| Line | Before | After |
|---|---|---|
| 9 | 'Revisando la marcación actual…' | 'Revisando el ponche actual…' |
| 10 | 'Revisando la nueva marcación…' | 'Revisando el nuevo ponche…' |
| 17 | 'Marcación cerrada. Se guardaron la hora de salida y la razón.' | 'Ponche cerrado. Se guardaron la hora de salida y la razón.' |
| 18 | 'Revisa la marcación actual antes de seguir.' | 'Revisa el ponche actual antes de seguir.' |
| 19 | 'La operación original tiene un conflicto. Actualiza y revisa la marcación actual.' | 'La operación original tiene un conflicto. Actualiza y revisa el ponche actual.' |
| 21 | 'Otro gerente tiene que cerrar tu marcación.' | 'Otro gerente tiene que cerrar tu ponche.' |
| 22 | 'Esta marcación cambió. Actualiza y revísala otra vez.' | 'Este ponche cambió. Actualiza y revísalo otra vez.' |

#### `src/components/management-close-form-copy.ts` (13)

| Line | Before | After |
|---|---|---|
| 76 | "Otro gerente debe cerrar tu marcación." | "Otro gerente debe cerrar tu ponche." |
| 78 | "La marcación cambió. Actualiza la página y revísala de nuevo." | "El ponche cambió. Actualiza la página y revísalo de nuevo." |
| 100 | "Marcación cerrada. Se registraron la hora de salida elegida y el motivo." | "Ponche cerrado. Se registraron la hora de salida elegida y el motivo." |
| 102 | "Revisa la marcación actual antes de continuar." | "Revisa el ponche actual antes de continuar." |
| 104 | "Hay un conflicto con el cierre original. Actualiza la página y revisa la marcación actual." | "Hay un conflicto con el cierre original. Actualiza la página y revisa el ponche actual." |
| 108 | "Hay una nueva marcación abierta. Revisa su hora actual antes de otro cierre." | "Hay un nuevo ponche abierto. Revisa su hora actual antes de otro cierre." |
| 110 | "Revisar la nueva marcación" | "Revisar el nuevo ponche" |
| 112 | "Cerrar marcación abierta" | "Cerrar ponche abierto" |
| 118 | "Esta marcación ya está cerrada." | "Este ponche ya está cerrado." |
| 120 | "La información de la marcación no está disponible." | "La información del ponche no está disponible." |
| 122 | "Revisando la marcación actual…" | "Revisando el ponche actual…" |
| 132 | "Actualizar la marcación" | "Actualizar el ponche" |
| 144 | "Verificando la nueva marcación…" | "Verificando el nuevo ponche…" |

#### `src/components/manager-attendance-review-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 106 | "Las marcaciones no cuadran. Revisa la tarjeta de tiempo." | "Los ponches no cuadran. Revisa la tarjeta de tiempo." |
| 148 | "Verificando las marcaciones de hoy." | "Verificando los ponches de hoy." |

#### `src/components/manager-clock-monitor-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 96 | 'Aquí solo aparecen las marcaciones registradas' | 'Aquí solo aparecen los ponches registrados' |

#### `src/components/manager-inbox-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 91 | "Entradas no marcadas" | "Entradas sin ponchar" |
| 405 | 'Sin marcar entrada' | 'Sin ponchar' |

#### `src/components/manager-inbox-corp-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 252 | 'Sin marcar entrada' | 'Sin ponchar' |

#### `src/components/manager-profile/profile-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 253 | 'Cuando una marcación de entrada requiere revisión' | 'Cuando un ponche de entrada requiere revisión' |

#### `src/components/manager-time-corrections-copy.ts` (3)

| Line | Before | After |
|---|---|---|
| 108 | "Corrección aprobada. La marcación original registrada no cambia." | "Corrección aprobada. El ponche original registrado no cambia." |
| 110 | "Corrección rechazada. La marcación original registrada no cambia." | "Corrección rechazada. El ponche original registrado no cambia." |
| 208 (comment) | "Marcación" | "Ponche" |

#### `src/components/manager-today-copy.ts` (3)

| Line | Before | After |
|---|---|---|
| 64 | 'Marcaciones que faltan ' | 'Ponches que faltan ' |
| 66 | 'Turnos publicados para hoy sin marcación de entrada. Un turno se considera empezado si han pasado más de {START_GRACE_MINUTES} minutos.' | 'Turnos publicados para hoy sin ponche de entrada. Un turno se considera empezado si han pasado más de {START_GRACE_MINUTES} minutos.' |
| 68 | 'Sin marcaciones registradas' | 'Sin ponches registrados' |

#### `src/components/owner-advisor/advisor-messages.ts` (1)

| Line | Before | After |
|---|---|---|
| 196 | "Un registro no tiene salida marcada." | "Un registro no tiene ponche de salida." |

#### `src/components/owner-advisor/attention-copy.ts` (7)

| Line | Before | After |
|---|---|---|
| 102 | "Revisar turnos terminados sin marcaciones" | "Revisar turnos terminados sin ponches" |
| 106 | "Turnos publicados y marcaciones registradas" | "Turnos publicados y ponches registrados" |
| 114 | "{n} turno publicado terminó sin marcaciones registradas. Revisa los registros antes de corregir las horas." | "{n} turno publicado terminó sin ponches registrados. Revisa los registros antes de corregir las horas." |
| 116 | "{n} turnos publicados terminaron sin marcaciones registradas. Revisa los registros antes de corregir las horas." | "{n} turnos publicados terminaron sin ponches registrados. Revisa los registros antes de corregir las horas." |
| 138 | "Las marcaciones registradas ya cubren los turnos en seguimiento." | "Los ponches registrados ya cubren los turnos en seguimiento." |
| 166 | "Problemas de hoy con el personal y las marcaciones registradas." | "Problemas de hoy con el personal y los ponches registrados." |
| 178 | "No se encontraron problemas de personal ni de marcaciones en las fuentes evaluadas hoy." | "No se encontraron problemas de personal ni de ponches en las fuentes evaluadas hoy." |

#### `src/components/owner-advisor/format-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 12 | "1 turno publicado empezó sin una marcación de entrada." | "1 turno publicado empezó sin un ponche de entrada." |
| 14 | "1 turno publicado terminó sin marcaciones registradas." | "1 turno publicado terminó sin ponches registrados." |

#### `src/components/owner-advisor/workflows-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 162 | "Revisa las correcciones y la población en Tarjetas de tiempo; las reglas y los bloqueos financieros en Nómina. No se infieren marcaciones ni tiempo compensado." | "Revisa las correcciones y la población en Tarjetas de tiempo; las reglas y los bloqueos financieros en Nómina. No se infieren ponches ni tiempo compensado." |

#### `src/components/owner-b/inbox-b-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 152 | 'Puede que falten personas que no han marcado entrada.' | 'Puede que falten personas que no han ponchado entrada.' |

#### `src/components/owner-b/moments-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 143 | "Tu gerente la revisa. Tus marcaciones originales no cambian." | "Tu gerente la revisa. Tus ponches originales no cambian." |

#### `src/components/owner-b/owner-b-copy.ts` (9)

| Line | Before | After |
|---|---|---|
| 148 | "entrada no marcada" | "entrada sin ponchar" |
| 148 | "entradas no marcadas" | "entradas sin ponchar" |
| 148 | "Entrada no marcada" | "Entrada sin ponchar" |
| 200 | "Puede que falten personas que no han marcado entrada." | "Puede que falten personas que no han ponchado entrada." |
| 217 | "Sin marcar" | "Sin ponchar" |
| 218 | "Todos los que tienen turno marcaron entrada." | "Todos los que tienen turno poncharon entrada." |
| 242 | "Sin marcar entrada" | "Sin ponchar" |
| 242 | "Marcó entrada tarde" | "Ponchó entrada tarde" |
| 242 | "No marcó entrada" | "No ponchó entrada" |

#### `src/components/owner-b/team-b-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 82 | "Sin marcar" | "Sin ponchar" |
| 88 | "Todos los que tienen turno marcaron entrada." | "Todos los que tienen turno poncharon entrada." |

#### `src/components/owner-home-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 103 | 'Sin marcar' | 'Sin ponchar' |
| 158 | 'Los turnos disponibles y las entradas sin marcar están en Hoy.' | 'Los turnos disponibles y las entradas sin ponchar están en Hoy.' |

#### `src/components/owner-setup-card-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 90 | 'crea los PIN para marcar' | 'crea los PIN para ponchar' |

#### `src/components/premium-home-copy.ts` (5)

| Line | Before | After |
|---|---|---|
| 54 | 'No marcó entrada' | 'No ponchó entrada' |
| 54 | 'Sin marcar entrada' | 'Sin ponchar' |
| 56 | `${name} no ha marcado entrada, abrir en Pendientes` | `${name} no ha ponchado entrada, abrir en Pendientes` |
| 57 | `${n}\u00a0sin marcar entrada` | `${n}\u00a0sin ponchar` |
| 57 | `${n} ${n === 1 ? 'turno' : 'turnos'} sin marcar entrada, abrir en Pendientes` | `${n} ${n === 1 ? 'turno' : 'turnos'} sin ponchar entrada, abrir en Pendientes` |

#### `src/components/reports-copy.ts` (4)

| Line | Before | After |
|---|---|---|
| 504 | "Las horas salen de las marcaciones e incluyen los descansos." | "Las horas salen de los ponches e incluyen los descansos." |
| 522 | "No se pudo comparar {unmatched} marcación de entrada con el horario." | "No se pudo comparar {unmatched} ponche de entrada con el horario." |
| 526 | "No pudimos leer las marcaciones de entrada de {unread} persona." | "No pudimos leer los ponches de entrada de {unread} persona." |
| 546 | "Las horas aparecen aquí a medida que las personas marcan entrada y salida." | "Las horas aparecen aquí a medida que las personas ponchan entrada y salida." |

#### `src/components/roster-import/copy.ts` (4)

| Line | Before | After |
|---|---|---|
| 237 | "Sin un correo electrónico, la persona puede marcar su entrada en la tableta, pero no puede iniciar sesión en NEVORA." | "Sin un correo electrónico, la persona puede ponchar su entrada en la tableta, pero no puede iniciar sesión en NEVORA." |
| 285 | "Sin correo. Solo puede marcar en la tableta." | "Sin correo. Solo puede ponchar en la tableta." |
| 364 | "1 persona no tiene correo. Puede marcar su entrada en la tableta, pero no puede iniciar sesión en NEVORA." | "1 persona no tiene correo. Puede ponchar su entrada en la tableta, pero no puede iniciar sesión en NEVORA." |
| 365 | `${n} personas no tienen correo. Pueden marcar su entrada en la tableta, pero no pueden iniciar sesión en NEVORA.` | `${n} personas no tienen correo. Pueden ponchar su entrada en la tableta, pero no pueden iniciar sesión en NEVORA.` |

#### `src/components/shell-copy.ts` (5)

| Line | Before | After |
|---|---|---|
| 64 | 'Fotos de marcación' | 'Fotos de ponche' |
| 97 | 'tarjetas de tiempo horas marcaciones aprobar' | 'tarjetas de tiempo horas ponches aprobar' |
| 100 | 'horas tarjeta marcaciones' | 'horas tarjeta ponches' |
| 408 | 'la configuración de fotos de marcación' | 'la configuración de fotos de ponche' |
| 409 | 'las fotos de marcación' | 'las fotos de ponche' |

#### `src/components/team-copy.ts` (3)

| Line | Before | After |
|---|---|---|
| 48 | 'Sin marcar entrada' | 'Sin ponchar' |
| 49 | 'Sin marcar' | 'Sin ponchar' |
| 59 | 'Todos los que tienen turno marcaron entrada.' | 'Todos los que tienen turno poncharon entrada.' |

#### `src/components/team-desk-people-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 28 | "Sin marcar" | "Sin ponchar" |
| 34 | "Todos los que tienen turno marcaron entrada." | "Todos los que tienen turno poncharon entrada." |

#### `src/components/team-live-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 20 | "Sin marcar entrada" | "Sin ponchar" |

#### `src/components/team/clocker-location-access-copy.ts` (4)

| Line | Before | After |
|---|---|---|
| 25 | 'Puede marcar en' | 'Puede ponchar en' |
| 49 | 'No se pudo confirmar dónde puede marcar. Vuelve a cargar el perfil antes de intentarlo de nuevo.' | 'No se pudo confirmar dónde puede ponchar. Vuelve a cargar el perfil antes de intentarlo de nuevo.' |
| 55 | 'Elige dónde puede marcar y localidades activas válidas.' | 'Elige dónde puede ponchar y localidades activas válidas.' |
| 58 | 'Solo un dueño puede cambiar dónde se puede marcar.' | 'Solo un dueño puede cambiar dónde se puede ponchar.' |

#### `src/components/time-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 7 (comment) | "Marcación" | "Ponche" |

#### `src/components/time-correction-context-copy.ts` (2)

| Line | Before | After |
|---|---|---|
| 70 | "Tiempo faltante aprobado · sin marcación del dispositivo" | "Tiempo faltante aprobado · sin ponche del dispositivo" |
| 72 | "Ajuste aprobado · la marcación original no cambia" | "Ajuste aprobado · el ponche original no cambia" |

#### `src/components/timecards-copy.ts` (13)

| Line | Before | After |
|---|---|---|
| 658 | "Marcación corregida" | "Ponche corregido" |
| 660 | "Marcación registrada" | "Ponche registrado" |
| 666 | "Marcaciones originales" | "Ponches originales" |
| 670 | "Sin marcaciones del dispositivo" | "Sin ponches del dispositivo" |
| 716 | "Falta marcar salida" | "Falta ponchar salida" |
| 810 | "Puedes finalizar cuando se cierre la marcación abierta." | "Puedes finalizar cuando se cierre el ponche abierto." |
| 818 | "Puedes aprobar cuando se cierre la marcación abierta." | "Puedes aprobar cuando se cierre el ponche abierto." |
| 1020 | "Revisa tus marcaciones registradas. Pide correcciones en Mi tiempo." | "Revisa tus ponches registrados. Pide correcciones en Mi tiempo." |
| 1022 | "Marcaciones por día" | "Ponches por día" |
| 1024 | "Cerrar marcaciones por día" | "Cerrar ponches por día" |
| 1108 | "Revisa las marcaciones y resuelve el tiempo abierto o las correcciones antes de aprobar." | "Revisa los ponches y resuelve el tiempo abierto o las correcciones antes de aprobar." |
| 1278 (comment) | "Marcación" | "Ponche" |
| 1629 | 'Sigue en Mi tiempo. Tus marcaciones originales se conservan.' | 'Sigue en Mi tiempo. Tus ponches originales se conservan.' |

#### `src/components/whos-working-copy.ts` (4)

| Line | Before | After |
|---|---|---|
| 2 (comment) | "Marcar entrada" | "Ponchar entrada" |
| 48 | 'Aparecen aquí cuando marcan entrada.' | 'Aparecen aquí cuando ponchan entrada.' |
| 54 | 'Entradas sin marcar' | 'Entradas sin ponchar' |
| 55 | 'Turnos que terminaron sin marcar entrada' | 'Turnos que terminaron sin ponchar entrada' |

#### `src/components/whos-working-corp-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 78 | 'Sin marcar entrada' | 'Sin ponchar' |

#### `src/lib/action-center/present.ts` (4)

| Line | Before | After |
|---|---|---|
| 96 | `${day} · ${asked}, ${lang === 'es' ? 'antes' : 'was'} ${time(wasStart)} ${lang === 'es' ? 'sin marcar salida' : 'with no clock-out'}` | `${day} · ${asked}, ${lang === 'es' ? 'antes' : 'was'} ${time(wasStart)} ${lang === 'es' ? 'sin ponchar salida' : 'with no clock-out'}` |
| 185 | 'Sin marcar entrada' | 'Sin ponchar' |
| 185 | 'Marcó entrada tarde' | 'Ponchó entrada tarde' |
| 185 | 'Sin marcar' | 'No ponchó entrada' |

#### `src/lib/activation/copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 44 | 'Registra una tableta para marcar ponches' | 'Registra una tableta para ponchar' |

#### `src/lib/auth-copy.ts` (1)

| Line | Before | After |
|---|---|---|
| 210 | "Marcar entrada" | "Ponchar entrada" |

#### `src/lib/onboarding/signup-copy.ts` (17)

| Line | Before | After |
|---|---|---|
| 201 | "Esto crea tu espacio de trabajo. Tu correo ya está confirmado." | "Esto crea tu empresa en NEVORA. Tu correo ya está confirmado." |
| 204 | "Dirección del espacio de trabajo" | "Dirección web de tu empresa" |
| 232 | "Crear espacio de trabajo" | "Crear empresa" |
| 235 | "Tu registro cambió en otra pestaña o ventana. Revisa tus datos y vuelve a crear el espacio de trabajo." | "Tu registro cambió en otra pestaña o ventana. Revisa tus datos y vuelve a crear la empresa." |
| 237 | "La creación de espacios de trabajo está en pausa por hoy. Inténtalo mañana." | "La creación de empresas está en pausa por hoy. Inténtalo mañana." |
| 238 | "No podemos crear espacios de trabajo nuevos ahora. Inténtalo más tarde." | "No podemos crear empresas nuevas ahora. Inténtalo más tarde." |
| 239 | "La creación de espacios de trabajo aún no está abierta aquí." | "La creación de empresas aún no está abierta aquí." |
| 240 | "No pudimos crear tu espacio de trabajo ahora. Inténtalo de nuevo en unos minutos." | "No pudimos crear tu empresa ahora. Inténtalo de nuevo en unos minutos." |
| 243 | "Creando tu espacio de trabajo" | "Creando tu empresa" |
| 245 | "Preparar tu espacio de trabajo" | "Preparar tu empresa" |
| 251 | "Tu espacio de trabajo necesita una revisión rápida" | "Tu empresa necesita una revisión rápida" |
| 253 | "No podemos verificar tu espacio de trabajo ahora. Seguiremos intentando." | "No podemos verificar tu empresa ahora. Seguiremos intentando." |
| 257 | "Tu espacio de trabajo está listo. Ahora escoge la contraseña con la que iniciarás sesión. Te llevaremos a {host}." | "Tu empresa está lista. Ahora escoge la contraseña con la que iniciarás sesión. Te llevaremos a {host}." |
| 258 | "Tu espacio de trabajo está listo. Ahora escoge la contraseña con la que iniciarás sesión." | "Tu empresa está lista. Ahora escoge la contraseña con la que iniciarás sesión." |
| 264 | "Tu espacio de trabajo está listo" | "Tu empresa está lista" |
| 265 | "Inicia sesión en la dirección de tu espacio de trabajo con tu ID y la contraseña que escogiste." | "Inicia sesión en la dirección web de tu empresa con tu ID y la contraseña que escogiste." |
| 274 | "Terminando tu espacio de trabajo. Esto puede tomar un minuto." | "Terminando de preparar tu empresa. Esto puede tomar un minuto." |

#### `src/lib/owner-advisor/workflow-contracts.ts` (1)

| Line | Before | After |
|---|---|---|
| 23 | "Un registro no tiene salida marcada." | "Un registro no tiene ponche de salida." |


## Tests and QA script

##### `scripts/clocker-ipad-ui-qa.mjs` (1)

| Line | Before | After |
|---|---|---|
| 93 | 'Marcar entrada' | 'Ponchar entrada' |

#### `src/components/clocker-copy.test.tsx` (6)

| Line | Before | After |
|---|---|---|
| 14 | 'Marcar entrada' | 'Ponchar entrada' |
| 70 | 'Esta referencia pertenece a otra marcación. Pide a tu gerente que la revise.' | 'Esta referencia pertenece a otro ponche. Pide a tu gerente que la revise.' |
| 71 | 'La verificación de tu PIN cambió. Ingresa tu PIN de nuevo; no se registró ninguna marcación dos veces.' | 'La verificación de tu PIN cambió. Ingresa tu PIN de nuevo; no se registró ningún ponche dos veces.' |
| 72 | 'No pudimos confirmar tu marcación. Toca Verificar estado de la acción antes de volver a intentarlo.' | 'No pudimos confirmar tu ponche. Toca Verificar estado de la acción antes de volver a intentarlo.' |
| 93 | 'Marcar entrada' | 'Ponchar entrada' |
| 93 | 'Marcar salida' | 'Ponchar salida' |

#### `src/components/clocker-phase8.test.tsx` (1)

| Line | Before | After |
|---|---|---|
| 19 | 'Tus marcaciones están guardadas en esta tableta' | 'Tus ponches están guardados en esta tableta' |

#### `src/components/clocker-photo/photo-settings.test.tsx` (1)

| Line | Before | After |
|---|---|---|
| 55 | 'Activa Tomar fotos de marcación para elegirlos.' | 'Activa Tomar fotos de ponche para elegirlos.' |

#### `src/components/clocker-premium.test.tsx` (1)

| Line | Before | After |
|---|---|---|
| 53 | 'Tu personal ya puede marcar.' | 'Tu personal ya puede ponchar.' |

#### `src/components/clocker-recovery-states.test.tsx` (1)

| Line | Before | After |
|---|---|---|
| 99 | 'Esta marcación se guardó' | 'Este ponche se guardó' |

#### `src/components/clocker-setup.test.tsx` (1)

| Line | Before | After |
|---|---|---|
| 64 | 'Tu equipo usará esta tableta para marcar en esta localidad.' | 'Tu equipo usará esta tableta para ponchar en esta localidad.' |

#### `src/components/employee-b/home-b.es.test.tsx` (2)

| Line | Before | After |
|---|---|---|
| 32 | 'Marca entrada en la tableta de Calle Loíza' | 'Poncha entrada en la tableta de Calle Loíza' |
| 32 | 'Ahí también marcas descansos y salida' | 'Ahí también ponchas descansos y salida' |

#### `src/components/employee-b/work-copy.test.ts` (5)

| Line | Before | After |
|---|---|---|
| 29 | 'Tu turno de 9 AM – 5 PM terminó. Marca tu salida en la tableta de Main Office.' | 'Tu turno de 9 AM – 5 PM terminó. Poncha tu salida en la tableta de Main Office.' |
| 36 | 'Sin marcar entrada · 12 min' | 'Sin ponchar · 12 min' |
| 41 (comment) | "marcar" | "ponchar" |
| 43 | 'Marca entrada en la tableta de Calle Loíza' | 'Poncha entrada en la tableta de Calle Loíza' |
| 59 | `Marcaste entrada a ${article} ${time}` | `Ponchaste entrada a ${article} ${time}` |

#### `src/components/employee-home-es.test.tsx` (1)

| Line | Before | After |
|---|---|---|
| 41 | 'Marca entrada en la tableta de Condado' | 'Poncha entrada en la tableta de Condado' |

#### `src/components/owner-advisor/render.test.tsx` (1)

| Line | Before | After |
|---|---|---|
| 230 | "No se infieren marcaciones" | "No se infieren ponches" |

#### `src/components/owner-b/owner-b-copy.test.tsx` (2)

| Line | Before | After |
|---|---|---|
| 15 | "Sin marcar" | "Sin ponchar" |
| 16 | "Sin marcar entrada" | "Sin ponchar" |

#### `src/components/owner-home-copy.test.tsx` (1)

| Line | Before | After |
|---|---|---|
| 33 | 'Sin marcar' | 'Sin ponchar' |

#### `src/components/phase3-team-i18n.test.tsx` (2)

| Line | Before | After |
|---|---|---|
| 22 | 'Sin marcar' | 'Sin ponchar' |
| 24 | 'Sin marcar entrada · 1 h 15 min' | 'Sin ponchar · 1 h 15 min' |


#### `src/test/spanish-glossary.test.ts`

- The header comment now says a punch is "ponche" (verb "ponchar").
- Added the note "Jose, Nov 26, 2026: "ponche/ponchar" is the one word for a punch, so "marcación" is retired;
  "espacio de trabajo" became "empresa"."
- `BANNED` gains `/marcaci[oó]n/i` and `/espacio de trabajo/i`.

## Voice guide (`docs/design/voice.md`)

| Line | Before | After |
|---|---|---|
| 47 | "Clock in" is "Marcar entrada", not "Reloj de entrada". | "Clock in" is "Ponchar entrada", not "Reloj de entrada". |
| 63 | (new) | Jose, Nov 26, 2026: 'ponche/ponchar' is the one word for a punch; 'espacio de trabajo' became 'empresa'. |
| 70 | One clock event \| Punch \| Marcación | One clock event \| Punch \| Ponche |
| 72 | Solicitud de corrección; "Corregir una marcación" | Solicitud de corrección; "Corregir un ponche" |
| 79 | (unchanged) The business \| … \| Empresa; tu trabajo \| workspace | "workspace" stays a Never word, Spanish "Empresa". |
| 91 | 3 empleados no han marcado entrada | 3 empleados no han ponchado entrada |
| 105 | Button: … "Marcar entrada". | Button: … "Ponchar entrada". |
| 152 | Ana R. · Marcó entrada 9 min tarde | Ana R. · Ponchó entrada 9 min tarde |
| 153 | Luis M. · Sin marcar entrada · 35 min | Luis M. · Sin ponchar · 35 min |
| 154 | Luis M. · Sin marcaciones en este turno | Luis M. · Sin ponches en este turno |
