# Claude UI contract — language and first-week setup

## Language

- On signed-in server renders, use `readPortalLanguage(proof)` from `src/lib/activation/language.server.ts`. For browser reads, use `GET /api/account/language` with `X-Nevora-Language-Preference: 1`. Both return `{state: "ready", savedLanguage: "en" | "es" | null, language: "en" | "es"}`. Effective language follows the saved choice, then the existing `nv-lang` device selection, then ranked browser languages, then English. Browser and sign-in choices remain fallbacks until someone explicitly saves a Profile choice.
- In Profile for Employee, Lead, Manager and Owner, show **Language / Idioma** with **English** and **Español** in both versions. Save with same-origin `PUT /api/account/language`, the same intent header, JSON content type and `{"language":"es"}` or `{"language":"en"}`. Wait for acknowledgement before changing the signed-in locale and refetch server-rendered content. On a lost response, read again to reconcile. Use the previous rendered choice while awaiting recovery. Handle invalid payloads (400), ended sessions (401), denied requests (403) and unavailable reads/writes (503). The endpoint identifies the actor from their current session. An existing Commerce restriction can return 402. Follow the existing billing or recovery flow.
- Set the document language, title and accessible names with the effective language. Use semantic translation keys for UI text and typed status/reason codes. Complete both dictionaries before rolling out each surface. Use `Intl` with `en-US` or `es-PR` and the workspace time zone for instants. Format date-only records as calendar dates and preserve pay currency, durations and amounts. Render names, custom rules, message bodies and employee-entered text as stored. Match English and Spanish for loading, empty, retry, permission, validation, confirmation, plural forms and screen-reader announcements.
- Signed-out auth keeps its local language switch. Shared Clocker screens use the tablet's language setting for setup, punch, break, receipts and paused/error pages. Localization of future email and push templates should resolve the recipient's saved choice inside the existing authorized delivery flow. Invitations for unset recipients retain existing bilingual copy. Push translations need the existing worker privacy tests and generic lock-screen content. Use counsel-approved text for legal translations.

## Employee and Lead first

| Screen | English / Español | Verify in each language |
| --- | --- | --- |
| `/login`, `/activate`, `/reset-access` | Sign in / Iniciar sesión. Activate your account / Activa tu cuenta | Language on arrival, validation, expired links, password setup, return to safe destination, first signed-in render. |
| `/app`, portal navigation | Home / Inicio. More / Más | Upcoming shift, today's time, task counts, hidden and restricted destinations, empty and offline screens. |
| `/app/schedule` | My schedule / Mi horario | Published shifts, details, no published shifts, acknowledgements, overnight dates and locale-safe week labels. |
| `/app/availability`, `/app/requests`, `/app/exchange` | Availability / Disponibilidad. Requests / Solicitudes. Shift swap / Intercambio de turnos | Deadline, leave, coverage and swaps, confirmations, pending/approved/declined, cancellation, retry and validation. |
| `/app/my-time`, `/app/timecards` | My time / Mi tiempo. Timecards / Tarjetas de tiempo | Punch and break status, past timecards, request a correction, correction status, scope and time-zone labels. |
| `/app/my-pay` | My pay / Mi pago | Pay dates, amounts and currency, statements, empty periods and restricted or unavailable pay. |
| `/app/updates`, `/app/notifications` | Updates / Avisos. Notifications / Notificaciones | Unread states, dates, failed loads, acknowledgment and links. Preserve message content. |
| `/app/profile`, Calendar, Passkeys and Device alerts | Profile / Perfil. Calendar / Calendario. Passkeys / Llaves de acceso | Change/resume language on another device, signed-out state, notification permissions, calendar feed actions, session expiry, Help, support and account deletion. |
| `/clocker/[location]` | Clock in / Registrar entrada. Clock out / Registrar salida | Tablet setup, identity/PIN, breaks, accepted and unconfirmed punches, rate-limit timing, paused and offline states. |

## Owner and Manager next

| Screen | English / Español | Verify in each language |
| --- | --- | --- |
| `/app`, `/app/profile`, `/app/inbox` | Home / Inicio. Language / Idioma. Inbox / Bandeja de entrada | Same account persistence, scoped work, current authority, empty/unavailable data and first-week setup for Owner. |
| `/app/employees`, `/app/settings` | Team / Equipo. Locations / Ubicaciones. Company policies / Políticas de la empresa | Roster and invitation actions, location and staffing rules, editable/locked fields, confirmation and Owner-only settings. |
| `/app/schedule`, `/app/schedule/publish` | Draft / Borrador. Publish schedule / Publicar horario | Week and location selection, rules/warnings, blocked publication, confirmation and historical publication. |
| `/app/requests`, `/app/timecards`, corrections and Clocker recovery | Review timecard / Revisar tarjeta de tiempo. Approve / Aprobar. Decline / Rechazar | Scoped approvals and transfers, independent review, stale data, corrections, and authority after a location or role change. |
| `/app/payroll`, `/app/payroll-export`, `/app/reports`, `/app/billing` | Payroll / Nómina. Time exports / Exportaciones de tiempo. Billing / Facturación | Capability-based action text, read-only and unavailable states, pay periods, figures, and billing handoff. |
| `/app/updates/compose`, `/app/ai-manager`, `/app/more`, Help | Send update / Enviar aviso. Help / Ayuda | Composer errors, permissions, reader-facing UI, help and role-specific destinations. |

## First-week setup on Owner Home

Use `GET /api/setup/first-week` with `X-Nevora-First-Week: 1`. A ready response has `steps` (ordered `{id, status, href}` entries with `complete` or `pending`), `completedCount`, and `nextStep` (first pending ID or `null`). The bilingual keys and titles live in `src/lib/activation/copy.ts`. Use the server's href and refresh after a source workflow or on return to Home. A 503 displays the localized unavailable and retry state. A 401 follows the existing session-expired flow. This read is for Owners. Managers open their existing scoped Team, Schedule and Timecards workflows.

| Step ID | Evidence |
| --- | --- |
| `ROSTER` | Another active person in the workspace roster. |
| `LOCATION_AND_RULES` | At least one active location. Every active location has staffing and coverage rules, at least one active eligible member, and active in-workspace positions for any assigned requirements. |
| `FIRST_SCHEDULE_PUBLISHED` | An explicit publication revision or a legacy schedule with a publication timestamp and published/archived state. |
| `TABLET_SETUP` | A currently enrolled active tablet with a credential at an active location. |
| `FIRST_TIMECARD_REVIEW` | A committed approval or finalization of a timecard containing recorded time rows. |

Roster, rules and tablet reflect current readiness. Publication and timecard review reflect completed actions in history. Translate progress with a single count template that handles plurals, including “1 of 5 complete” / “1 de 5 pasos completado”. Reuse the existing Home setup slot. Render first-week progress from its own response and keep recurring tasks in their existing workflows.
