## WP6 report: signed-out pages

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp6.patch` (124 KB, reverses cleanly against the worktree).
**Source:** worktree `.../scratchpad/wt/wp6`, detached at `ce4de4bc`. Nothing committed, pushed or deployed. Not run in a browser. Release sequence unchanged: verify on development first, promote to main only after Jose approves.

`git diff HEAD --stat`: 34 files changed, 639 insertions, 142 deletions. New files: `src/app/login/kept-id.ts`, `src/app/support/copy.ts`, `src/app/account-deletion/copy.ts`, `src/components/auth-premium/doc-links.tsx`.

### Findings

| ID | Status | What changed |
|---|---|---|
| PB-006 / BR-15 | Done | After any sign-in error the Employee ID comes back as typed, the password stays empty and takes focus. The ID rides in a 5-minute HttpOnly cookie `nv-login-id` scoped to `/login` (never in the URL), set identically on every failure path and cleared on success. Both fields are still marked red (NV-189 unchanged). |
| PB-007 / JR-27 | Done (UI part) | A link that arrives but can't be read now shows the invalid state instead of the "no link" screen. Shape check only, in the browser, so nothing about any account is revealed. The server-rejected state uses the same new wording. |
| PB-003 / JR-28 | Done | "Continue to sign in" hands the ID to the sign-in field at every width, held in module memory for that one navigation (no browser storage). Desktop success card has a 56px check mark. |
| PB-002 | Done | "Invitation verified · {workspace}" replaced by a line that claims nothing. |
| PB-004 | Done | Desktop receipt is now "Check your email": envelope mark, the API's own hedged sentence, expiry, what to do if nothing arrives, "Back to sign in", and "Check your details" (reopens the form filled in). |
| RA-5 / PB-005 | Partly | `/login?ended=1` plus `returnTo` when the request's same-origin Referer is a portal page that `safeReturnTo` accepts. The reason is added only if the browser still presents a session cookie or came from a portal page, because `/` redirects to `/app` and every first visitor would otherwise read "Your session ended". Session timing and validation untouched. A hard load after natural expiry gets no note and no return path. |
| PY-21 | Done | Tagline and preview label changed. `signInSubtitle` and the `device` preview are currently unused keys; only `panelSupport` renders. |
| PB-019 | Done | Spanish says "Buenas tardes" until 7 PM (`greeting.eveningFrom`: 17 EN, 19 ES). |
| PB-020 | Done | No cookie: Spanish when Accept-Language ranks `es` ahead of `en`. The cookie still wins. |
| PB-001 / PB-025 / RA-12 | Done | Support, signed-out Account deletion and the public error screen follow the language and carry the switch. Privacy and Terms untouched and keep "(en inglés)". Account deletion now draws its own layout, because `legal-document.tsx` is out of scope and has no language switch. |
| RA-15 | Partly | Online: "Something went wrong on our side. Try again." plus "Reference: {digest}" when present. Offline: the connection wording. Covers the public screen, `AppErrorScreen` and the generic branch of `src/app/app/error.tsx`. Two gaps are under "Check in the browser". |
| JR-7 | Done (my part) | "Save this ID. You sign in with it." under the ID on desktop and phone. |

### Strings for Jose (old → new)

`src/lib/auth-copy.ts` (EN line / ES line):
- :33 / :188 `panelSupport`: "Shifts, hours, time off and pay, ready the moment you sign in." → "Shifts, hours, time off and pay statements, ready the moment you sign in." · "Turnos, horas, días libres y pago, listos al iniciar sesión." → "Turnos, horas, días libres y tus comprobantes de pago, listos al iniciar sesión."
- :30 / :185 `signInSubtitle`: "…schedule, time and pay." → "…schedule, time and pay statements." · "…tus horas y tu pago." → "…tus horas y tus comprobantes de pago."
- :36 / :190 `device.nextPayday`: "Next payday" → "Scheduled payday" · "Próximo pago" → "Día de pago programado"
- :71 / :225 `sessionEnded` (new): "Your session ended. Sign in to continue." · "Tu sesión terminó. Inicia sesión para continuar."
- :82-84 / :234-236 `checkEmail` (replaces `requestReceived` "Request received" / "Solicitud recibida"):
  - title: "Check your email" · "Revisa tu correo"
  - sub: "Look in your inbox and your spam folder." · "Busca en tu bandeja de entrada y en el correo no deseado."
  - expires: "The recovery link works once and expires in 15 minutes." · "El enlace de recuperación funciona una sola vez y vence en 15 minutos."
  - nothing: "Nothing after a few minutes? Check your Employee ID and email, then try again." · "¿No llega nada en unos minutos? Revisa tu ID de empleado y tu correo, e inténtalo de nuevo."
  - review: "Check your details" · "Revisar tus datos"
- :141 / :291 `activation.activatedSub`: "Keep your Employee ID. You will use it with the password you just created." → "Sign in with your Employee ID and the password you just created." · "Guarda tu ID de empleado. Lo usarás con la contraseña que acabas de crear." → "Inicia sesión con tu ID de empleado y la contraseña que acabas de crear."
- :144 / :294 (replaces `verified` "Invitation verified" / "Invitación verificada"): "Choose a password to join {workspace}." · "Elige una contraseña para unirte a {workspace}." With no workspace name: "Choose a password to finish setting up your account." · "Elige una contraseña para terminar de configurar tu cuenta."
- :145 / :295 `saveId` (new): "Save this ID. You sign in with it." · "Guarda este ID. Lo usas para iniciar sesión."
- :147 / :297 `invalid`: "This invitation link can’t be used. Ask your Owner for a new invitation. You can sign in if you have already activated." → "This link has expired or was already used." · "Este enlace de invitación no se puede usar. Pide una invitación nueva al dueño. Si ya activaste tu cuenta, puedes iniciar sesión." → "Este enlace venció o ya se usó."
- :147 / :297 `invalidNext` (new): "Ask your Owner or manager to send a new invitation." · "Pide al dueño o a tu gerente que te envíe una invitación nueva."
- :171-175 / :318-322 `errorScreen` (public error screen; ES is all new):
  - "This page didn’t load" · "Esta página no cargó"
  - "Something went wrong" · "Algo salió mal"
  - server (new): "Something went wrong on our side. Try again." · "Algo salió mal de nuestro lado. Inténtalo de nuevo."
  - offline: "Nothing was changed. Check your connection, then try again." · "No se cambió nada. Revisa tu conexión e inténtalo de nuevo."
  - "Reference: {reference}" · "Referencia: {reference}"
  - "Try again" · "Intentar de nuevo"
  - "Go to sign in" · "Ir a iniciar sesión"

`src/components/mobile-access/copy.ts`:
- :106 / :322 `idReceiptHint`: "Keep this ID somewhere you can find it." → "Save this ID. You sign in with it." · "Guarda este ID donde puedas encontrarlo." → "Guarda este ID. Lo usas para iniciar sesión."
- :112 / :328 `inviteInvalidBody`: "This invitation has expired, was already used, or can’t be verified. Ask your Owner for a new invitation. If you already activated your account, sign in." → "This link has expired or was already used. Ask your Owner or manager to send a new invitation." · ES → "Este enlace venció o ya se usó. Pide al dueño o a tu gerente que te envíe una invitación nueva."

`src/components/app-error-screen.tsx` :27, :32, :40 (portal, English only): "Check your connection, then try again." → online "Something went wrong on our side. Try again.", offline unchanged; new line "Reference: {digest}".

`src/app/support/copy.ts` :14-19 and :25-34 (all new Spanish; English unchanged):
- Chrome: "Ayuda", "Iniciar sesión", "Contacto", "Escríbenos por correo", "Preguntas frecuentes", "No puedo iniciar sesión", "Turnos, tiempo libre o pago" / "Pregunta a tu gerente", "Reportar un problema", "Correo postal".
- Safety note: "Nunca envíes por correo contraseñas, códigos, datos bancarios ni documentos de pago."
- Response commitment: "Nuestra meta es responder las consultas de ayuda y de privacidad en un plazo de dos días laborables. Los días laborables son de lunes a viernes, sin contar los días feriados que se observan en Puerto Rico. Las solicitudes que requieren investigación pueden tardar más en resolverse."
- The three answers are translated in full in the file.

`src/app/account-deletion/copy.ts` :17-31 (all new Spanish; English unchanged):
- "Elimina tu cuenta de NEVORA", "Iniciar sesión", "Iniciar solicitud de eliminación".
- Headings: "En la aplicación o en la web", "Qué pasa después", "Qué se elimina", "Qué se puede conservar", "Tu empleo y tu lugar de trabajo".
- Full body translation, including the 30-day period, the retention schedule and the backup window written out in Spanish. App screen names stay as the app shows them: "Profile (tu perfil)", "Delete my account (Eliminar mi cuenta)".

`src/components/auth-premium/doc-links.tsx` :8 (Spanish closing links on those two pages): "Privacidad (en inglés) · Términos (en inglés) · Ayuda · Eliminar cuenta".
`src/components/auth-premium/auth-back-nav.tsx` :21: Spanish wordmark label "NEVORA, iniciar sesión".

### Tests

- `npx eslint` on all 31 changed `.ts`/`.tsx` files: pass.
- `npx vitest run` on 20 files, 187 tests: pass. Includes `auth-copy`, `login/actions`, `login/page-message`, `activation-invitation`, `auth/session`, `app-error-screen`, `legal-pages`, `account-recovery`, `not-found`, `mobile-access.integration`, `lang-switch`, `brand-pages`, `access-help`, `portal-source-locks`.
- A further 23 neighbouring files (session-consuming actions, navigation, policies, premium-home and others) also passed.
- Isolated `tsc` over the changed files and their imports only (226 files, 2.4 s, not the project): no errors.
- Test edits for changed behaviour:
  - `legal-pages.test.tsx`: Support and Account deletion are now async pages.
  - `app-error-screen.test.tsx`: new wording, and the root boundary now shows the digest, which the old test forbade.
  - `account-recovery.test.tsx`: receipt title.
  - `session.test.ts`: `headers` added to its mock, plus redirect cases.
  - `src/test/integration/employee-mobile-phase1.integration.ts` :251 and :264: now wait on pathname `/login`, since a revoked or expired session lands on `/login?ended=1`. Not run (needs Postgres and a browser).

### For Codex

- **JR-7:** put the Employee ID in the invitation email or a post-activation confirmation, and add an Owner "workplace ready" email (`src/lib/auth/account-email-copy.ts:8-12`).
- **PB-002:** a read-only invitation check on load would let the page show an expired or used link before the person types passwords. Today only an unreadable link is caught on load.
- **JR-27:** "Ask for a new invitation" that raises an Owner task.
- **RA-5:** if `src/proxy.ts` stamped the requested path on `/app` requests, `returnTo` could be exact on hard loads.
- **`session.ts` pins:** `f1-native-source-pins.json` and `typed-guarded-backfill.postgres.test.ts` pin its hash as `f1cc1cd4…` (5141 bytes). HEAD was already `cbeb9769…` (6795 bytes) before my edit, so nothing newly breaks.
- **New cookie:** the login action now writes `nv-login-id` (HttpOnly, SameSite=Lax, Path=/login, 300 s, Secure in production).
- **PB-020:** email links that carry the language, and a stored language per person.
- **RA-15:** logging that lets support look up the digest (pairs with AR-1).

### Check in the browser

1. **Wrong password**, with JS and with JS off: ID kept, password empty and focused. The fill after a soft navigation depends on React's form reset picking up the server's new `defaultValue`.
2. **Activation to sign-in at 1440 with mobile Access off:** ID prefilled, password focused.
3. **Session-ended note** at 390 and 1440, EN and ES. With mobile Access on, alerts inside the card default to red; the teal override relies on selector specificity.
4. **Support and Account deletion:** language pill beside the wordmark at 390, 768 and 1440; the Spanish links row wrapping. Section ids on Account deletion changed from `legal-<slug>` to `legal-section-N` (nothing links to them).
5. **Error screens:** reference line placement; offline wording with the network off.
6. **RA-15 gaps, both outside my file scope:**
   - The employee Signature variant (`src/components/signature/system-state.tsx:35-45`) still blames the connection.
   - `src/app/global-error.tsx` does not pass the digest; it needs `digest={error.digest}`.
7. **Accept-Language reach:** `readAuthLang` is shared, so a Spanish browser with no cookie now also gets Spanish on Welcome, access-help, the billing recovery page, the Clocker paused page, and the Profile language row.
8. **Session-ended edge cases:** explicit sign-out then Back can show the note. Pages served with `Referrer-Policy: no-referrer` (Clocker settings, account recovery, the native shell) give no return path.
9. **A cut-off invitation link** also reads "This link has expired or was already used."
10. **Legal review:** the Spanish retention and backup wording on Account deletion is my translation of approved policy facts.
