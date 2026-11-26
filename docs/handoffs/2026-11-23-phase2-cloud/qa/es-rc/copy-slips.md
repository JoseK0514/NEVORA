# Spanish copy slips on 0f61b708 (draft from a source scan; sightings on screen are added from the sweep)

The glossary is `docs/design/voice.md` lines 63–79. "One concept, one word" is line 50, and "tú" applies everywhere. Each
line below is a Spanish value in a copy table. **Fix:** the lead's batch commit (puñetazo/golpe, hoja de tiempo, "fijas
PIN de reloj en", "dueños y administradores") already covers some of these.

## Glossary "Never" words

| File:line | Now | Should be (glossary) |
|---|---|---|
| src/components/workforce/permission-copy.ts:57 | "Aprobar tiempo libre" · "solicitudes de tiempo libre" | días libres ("tiempo libre" is a Never word) |
| src/components/workforce/permission-copy.ts:87 | "Un dueño decide el tiempo libre" | días libres |
| src/components/action-center-navigation-copy.ts:46 | "Ver la brecha de cobertura" | turno disponible (gap and coverage gap are Never) |
| src/components/manager-action-center-copy.ts:222, :224 | "Brecha de cobertura {count}…" | turno(s) disponible(s) |
| src/components/manager-inbox-copy.ts:343 | "Abre la brecha de cobertura para llenarla" | turno disponible |
| src/lib/onboarding/signup-copy.ts:201, :204, :232, :235 | "espacio de trabajo" | empresa (workspace is Never) |
| src/components/employee-b/account-b-client-copy.ts:596 | "El espacio de trabajo de tu empresa…" | "Tu empresa…" |
| src/components/employee-mobile/deletion-copy.ts:153, :402 | "El espacio de trabajo de tu empresa…" | "Tu empresa…" / "tu trabajo" |
| src/components/manager-inbox-copy.ts:311, :321 | "tu bandeja de entrada" (the manager's to-do list) | Pendientes (Inbox is Never) |
| src/components/manager-issue-focus-copy.ts:8 | "…en tu bandeja de entrada." | Pendientes |
| src/components/notification-inbox-copy.ts:364 | "Buscar en esta bandeja de entrada" | Buscar en Avisos (or Pendientes, depending on the screen) |
| src/components/owner-b/home-b-copy.ts:294 | "Trabajando ahora" | En turno ("Working" is Never for clocked in) |
| src/components/manager-dashboard-copy.ts:83 · manager-inbox-copy.ts:111 · manager-inbox-corp-copy.ts:336 | "Quién está trabajando" | Quién está en turno |

## One concept, one word: punch = "marcación"

| File:line | Now |
|---|---|
| src/app/app/help/page-copy.ts:76 | "Configurar el reloj de ponche" |
| src/components/owner-b/home-b-copy.ts:232 | "Reloj de ponche" |
| src/components/owner-advisor/advisor-copy.ts:216 · src/components/owner-b/owner-b-copy.ts:136 | "Sin ponchar" (the glossary's clocked-in pair is "En turno", so this is "Sin marcar entrada") |
| src/components/workforce/permission-copy.ts:58 | "ponches omitidos" → "marcaciones omitidas" |
| src/lib/activation/copy.ts:44 | "Registra una tableta para marcar ponches" → "…para las marcaciones" |
| src/components/clocker-photo/punch-photo-flow-copy.ts:170 | "comprobar un golpe" (in the lead's batch) |

## "usted" where the voice is "tú"

| File:line | Now |
|---|---|
| src/components/clocker-owner-copy.ts:383 | "En la tableta, abra la cámara." · "Apúntela…" · "Toque el enlace y luego toque…" |
| src/components/clocker-owner-copy.ts:577 | "Verifique una entrada o salida…" |
| src/components/clocker-owner-copy.ts:586 | "Revise su conexión y actualice." |
| src/components/clocker-owner-copy.ts:599, :600 | "Escriba el código…" |
| src/components/clocker-owner-copy.ts:609 | "Revise cada uno con la persona…" |
| src/components/configured-attendance-policies-copy.ts:130, :132 | "Actualice para…" |
| src/components/employee-b/messages-b-copy.ts:250 · employee-mobile/messages-view-copy.ts:170, :174 | "Actualice para comprobar…" |
| src/components/manager-action-center-copy.ts:344, :386 | "Actualice una lectura protegida actual…" (also reads as machine translation) |
| src/components/owner-b/moments-copy.ts:164 (and the file, line 8: "Puerto Rico, usted") | "Actualice los registros…" (the file says usted on purpose; it conflicts with voice.md) |

## Wrong sense or machine translation

| File:line | Now | Note |
|---|---|---|
| src/components/availability-editor-copy.ts:114 | "Al enviar con cada día disponible no disponible, le indica a tu gerente que no puede trabajar esta semana" | Garbled ("every available day unavailable") and mixes usted ("le indica") with tú. |
| src/components/manager-action-center-copy.ts:344, :386 | "Actualice una lectura protegida actual antes de revisar" | Literal "protected read"; internal wording shown to people. |
| src/components/employee-mobile/messages-view-copy.ts:170 | "Algunas notificaciones actuales…" | "Notice" should be Aviso, not notificación. |
