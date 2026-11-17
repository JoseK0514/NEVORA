# Email design request (Phase 5, PB-022)

From: builder C (UI). For: Codex (server owns every email). Date: Nov 17, 2026. Base commit: `ad814bad`.

**Nothing is wired.** No email template, sending code, transport or environment setting was changed. This file and the
two reference pages are a design request only. No email was sent while preparing it. The company, the person and the
link in the reference pages are fictional.

Reference files, in this folder:

- `invitation-reference.html` (English) and `invitation-reference-es.html` (Spanish). Self-contained: inline styles,
  table layout, no images, no web fonts, no remote assets. The wordmark is text. Checked in a browser: 0 remote
  requests, no sideways scroll at 390 or 640.
- Pictures: `email-invitation-reference-390.png`, `email-invitation-reference-640.png`,
  `email-invitation-reference-390-es.png`, `email-invitation-reference-640-es.png`.

## 1. Emails the app sends today

All are plain text. Found by reading the code at `ad814bad`.

| # | Email | Words | Sent from | Link | Lasts | Language today |
|---|---|---|---|---|---|---|
| 1 | Invitation to activate an account | `src/lib/auth/account-email-copy.ts:8-13` | `src/lib/auth/invitations/delivery.server.ts:18-19` | `{origin}/activate#proof=…` | 7 days, once (`expiresAt`) | English then Spanish in one body |
| 2 | Password reset | `src/lib/auth/account-email-copy.ts:15-19` | `src/lib/auth/recovery-delivery.server.ts:34-35` | `{origin}/reset-access#proof=…` | 15 minutes, once | English then Spanish in one body |
| 3 | Password was changed (notice) | `src/lib/auth/account-email-copy.ts:22-26` | `src/lib/auth/recovery-delivery.server.ts:37-38` | none; names `{origin}/login` | n/a | English then Spanish in one body |
| 4 | Verify your email (new business sign-up) | `src/lib/onboarding/verification-delivery.server.ts:16-18` | same file, line 19 | `{signupOrigin}/onboarding/verify?lang=…#proof=…` | `expiresAt` (I did not confirm the length) | One language (`locale`) |
| 5 | Billing: verify email, and sign-in link | `services/commerce/runtime.ts:73-77` | `services/commerce/worker.ts:47-51` | `message.url` (`#token=…`) | token expiry (I did not confirm the length) | English only |
| 6 | Billing notices: trial ends in 7 days, trial ends in 1 day, payment failed, workplace ready | `services/commerce/lifecycle-mail.ts:21-22` | `services/commerce/worker.ts:38` | `{origin}/app/billing` or `{origin}/login` | no token; an ordinary page | English only |
| 7 | Internal monitor alert to support@thevelani.com | `src/lib/operations/monitor.ts:49` | same | none | n/a | English. Internal. No design requested. |

All of 1 to 4 go through `validatedMailTransport().sendRegistered(email, subject, text)`
(`src/lib/auth/mail-transport.server.ts:22-33`), which takes `subject` and `text` only. 5 and 6 use the commerce
service's own `smtp.sendMail` (`services/commerce/runtime.ts:68-79`).

There is no email for assisted recovery: the recovery code is handed over in person by a Manager or Owner.

What is wrong today (PB-022, checked against the code):

- No company name and no person's name anywhere.
- The invitation says "Your Owner invited you" even when the person invited is an Owner.
- The reset email ends "Can’t use this email?", sent to someone who is reading that email.
- A long raw link with no button. Two languages stacked in every account email, and a two-language subject.
- The trial notice prints a UTC timestamp (`toUTCString()`), for example "Sat, 28 Nov 2026 04:00:00 GMT".
- The three billing emails are English only.

## 2. What every email should have

- **From name** "NEVORA". **Subject**: the company name first where the email is about a workplace. One language.
- **First line** names the company (and the person where the server has a first name).
- **One teal button** (`#0B6E69`, white bold label, pill). Nothing else in the email looks like a button.
- **Under the button**: what the link does, how long it lasts, and that it works once (when that is true).
- **The same link as text** under a line that says to copy it if the button does not open.
- **"Did not ask for this"**: what to do, in one or two sentences. Never "contact your Owner" (the reader may be one).
- **Footer**: "NEVORA is provided by VELANI LLC.", the mailing address from the approved policy fact
  (`POLICY_FACTS.BUSINESS_CONTACT_DETAILS`), and support@thevelani.com.
- **Plain-text part** in the same message (multipart/alternative), with the same words in the same order and the
  link on its own line.
- **Language**: one language per email when the server knows it. Invitation and reset do not know it today (see
  "For Codex"). Until they do, send the HTML with the English block, a thin rule, then the Spanish block, each with
  its own button, and a subject in one language only (English, with the Spanish subject as the preheader). Do not keep
  the "English / Spanish" double subject.
- **Dates**: in the workplace's time zone, written out ("November 24, 2026" / "24 de noviembre de 2026"). No UTC
  strings.
- No exclamation marks, no em dashes, no "simply", "just", "successfully".
- Light only. Width up to 528px card on a `#F2F5F4` page with the teal band behind the wordmark. In clients that drop
  negative margins (some Outlook versions) the card sits under the band instead of overlapping it; that is fine.
- No images are needed. If a logo image is added later it needs alt text "NEVORA" and must be hosted on the app's own
  domain.

`{Company}`, `{first name}`, `{Employee ID}`, `{date}`, `{link}` are values the server fills. Escape them for HTML.
Where a value is missing, use the fallback given.

## 3. Each email, as it should read

### 3.1 Invitation (email 1). Reference built: `invitation-reference.html`

| | English | Spanish |
|---|---|---|
| Subject | {Company} invited you to NEVORA | {Company} te invitó a NEVORA |
| Preheader | Set up your account to see your schedule, hours and pay. The link works once and expires in 7 days. | Configura tu cuenta para ver tu horario, tus horas y tu pago. El enlace funciona una sola vez y vence en 7 días. |
| Heading | {Company} invited you to NEVORA | {Company} te invitó a NEVORA |
| Greeting | Hi {first name}, | Hola, {nombre}: |
| Body | {Company} uses NEVORA for schedules, hours and pay. Set up your account to see yours. | {Company} usa NEVORA para horarios, horas y pago. Configura tu cuenta para ver los tuyos. |
| Button | Set up my account | Configurar mi cuenta |
| Under the button | The button opens a page where you create your password. This link works once and expires in 7 days, on {date}. | El botón abre una página donde creas tu contraseña. Este enlace funciona una sola vez y vence en 7 días, el {fecha}. |
| ID box (only when there is an ID) | Your Employee ID / {Employee ID} / You sign in with this ID and your password. | Tu ID de empleado / {ID} / Inicias sesión con este ID y tu contraseña. |
| Link as text | If the button does not open, copy this address into your browser: | Si el botón no abre, copia esta dirección en tu navegador: |
| Did not ask | Did not expect this? You can ignore this email. No account is set up unless you open the link. To ask about it, contact {Company}. | ¿No esperabas este correo? Puedes ignorarlo. No se configura ninguna cuenta si no abres el enlace. Si tienes preguntas, comunícate con {Company}. |

Fallbacks: no first name, "Hi," / "Hola:". No company name, subject "You are invited to NEVORA" / "Te invitaron a
NEVORA" and "Your workplace uses NEVORA…" / "Tu lugar de trabajo usa NEVORA…".

Plain-text part (English; Spanish follows the same order):

```
{Company} invited you to NEVORA

Hi {first name},

{Company} uses NEVORA for schedules, hours and pay. Set up your account to see yours.

Set up my account:
{link}

The link opens a page where you create your password. It works once and expires in 7 days, on {date}.

Your Employee ID: {Employee ID}
You sign in with this ID and your password.

Did not expect this? You can ignore this email. No account is set up unless you open the link. To ask about it, contact {Company}.

NEVORA is provided by VELANI LLC.
VELANI LLC, 1654 Calle Tulipan, Suite 100, San Juan, PR 00927
support@thevelani.com
```

### 3.2 Password reset (email 2)

| | English | Spanish |
|---|---|---|
| Subject | Reset your NEVORA password for {Company} | Restablece tu contraseña de NEVORA para {Company} |
| Heading | Reset your password | Restablece tu contraseña |
| Body | We received a request to reset the password for your NEVORA account at {Company}. | Recibimos una solicitud para restablecer la contraseña de tu cuenta de NEVORA en {Company}. |
| Button | Choose a new password | Elegir una contraseña nueva |
| Under the button | The button opens a page where you choose a new password. This link works once and expires in 15 minutes. | El botón abre una página donde eliges una contraseña nueva. Este enlace funciona una sola vez y vence en 15 minutos. |
| Link as text | If the button does not open, copy this address into your browser: | Si el botón no abre, copia esta dirección en tu navegador: |
| Did not ask | Did not ask for this? Your password has not changed and you do not need to do anything. If it keeps happening, tell a manager at {Company}. | ¿No lo pediste? Tu contraseña no ha cambiado y no tienes que hacer nada. Si sigue pasando, avísale a un gerente de {Company}. |

Remove the "Can’t use this email?" paragraph. If the link has expired the page already says how to ask for a new one.

### 3.3 Password was changed (email 3)

| | English | Spanish |
|---|---|---|
| Subject | Your NEVORA password for {Company} was changed | Se cambió tu contraseña de NEVORA para {Company} |
| Heading | Your password was changed | Se cambió tu contraseña |
| Body | The password for your NEVORA account at {Company} was changed on {date} at {time}. Every device was signed out. | La contraseña de tu cuenta de NEVORA en {Company} se cambió el {fecha} a las {hora}. Se cerró la sesión en todos los dispositivos. |
| If it was you | If you did this, you do not need to do anything. | Si fuiste tú, no tienes que hacer nada. |
| Button | Sign in | Iniciar sesión |
| Under the button | The button opens the NEVORA sign-in page. It is an ordinary page: it does not sign you in by itself and it does not expire. | El botón abre la página de inicio de sesión de NEVORA. Es una página normal: no inicia tu sesión por sí sola y no vence. |
| Was not you | If you did not do this, reset your password from the sign-in page now and tell a manager or the Owner at {Company}. | Si no fuiste tú, restablece tu contraseña desde la página de inicio de sesión ahora y avísale a un gerente o al dueño de {Company}. |

### 3.4 Verify your email (email 4, new business sign-up)

There is no company yet, so the subject names NEVORA only. This one already sends one language.

| | English | Spanish |
|---|---|---|
| Subject | Verify your email to set up NEVORA | Verifica tu correo para configurar NEVORA |
| Heading | Verify your email | Verifica tu correo |
| Body | You started setting up a business on NEVORA with this email address. Verify it to continue. | Comenzaste a configurar un negocio en NEVORA con este correo. Verifícalo para continuar. |
| Button | Verify my email | Verificar mi correo |
| Under the button | The button opens the next step of setup. This link works once and expires on {date} at {time}. | El botón abre el siguiente paso de la configuración. Este enlace funciona una sola vez y vence el {fecha} a las {hora}. |
| Did not ask | Did not start this? You can ignore this email. Nothing is created unless you open the link. | ¿No comenzaste esto? Puedes ignorar este correo. No se crea nada si no abres el enlace. |

### 3.5 Billing: verify email, and sign-in link (email 5)

| | English | Spanish |
|---|---|---|
| Subject (verify) | Verify your email for NEVORA billing | Verifica tu correo para la facturación de NEVORA |
| Subject (sign-in) | Your sign-in link for NEVORA billing | Tu enlace para entrar a la facturación de NEVORA |
| Body (verify) | Verify this email address to continue with plan and billing for {Company}. | Verifica este correo para continuar con el plan y la facturación de {Company}. |
| Body (sign-in) | Use this link to open plan and billing for {Company}. | Usa este enlace para abrir el plan y la facturación de {Company}. |
| Button | Verify my email / Open billing | Verificar mi correo / Abrir facturación |
| Under the button | This link works once and expires on {date} at {time}. Opening it does not charge anything. | Este enlace funciona una sola vez y vence el {fecha} a las {hora}. Abrirlo no cobra nada. |
| Did not ask | Did not ask for this? You can ignore this email. | ¿No lo pediste? Puedes ignorar este correo. |

### 3.6 Billing notices (email 6)

These four have no single-use link. The button opens an ordinary page and the reader signs in as usual. Say so.

| Notice | | English | Spanish |
|---|---|---|---|
| Trial, 7 days | Subject | {Company}: your NEVORA trial ends on {date} | {Company}: tu prueba de NEVORA termina el {fecha} |
| | Body | The free trial for {Company} ends on {date}. Choose a plan before then to keep your team's access. | La prueba gratis de {Company} termina el {fecha}. Elige un plan antes de esa fecha para mantener el acceso de tu equipo. |
| | Button | Choose a plan | Elegir un plan |
| Trial, 1 day | Subject | {Company}: your NEVORA trial ends tomorrow | {Company}: tu prueba de NEVORA termina mañana |
| | Body | The free trial for {Company} ends on {date}. Choose a plan today to keep your team's access. | La prueba gratis de {Company} termina el {fecha}. Elige un plan hoy para mantener el acceso de tu equipo. |
| | Button | Choose a plan | Elegir un plan |
| Payment failed | Subject | {Company}: we could not charge your card | {Company}: no pudimos cobrar a tu tarjeta |
| | Body | The renewal payment for {Company} did not go through. Update your payment method to keep your team's access. | El pago de renovación de {Company} no se completó. Actualiza tu método de pago para mantener el acceso de tu equipo. |
| | Button | Update payment method | Actualizar método de pago |
| Workplace ready | Subject | {Company} is ready on NEVORA | {Company} ya está listo en NEVORA |
| | Body | Your workplace is set up. Sign in with your Employee ID and password. | Tu lugar de trabajo está configurado. Inicia sesión con tu ID de empleado y tu contraseña. |
| | Button | Sign in | Iniciar sesión |
| All four | Under the button | The button opens NEVORA. You sign in as usual; the link does not expire and does not sign you in by itself. | El botón abre NEVORA. Inicias sesión como siempre; el enlace no vence y no inicia tu sesión por sí solo. |
| Billing three | Last line | Payments are made in Stripe. This email does not confirm a payment or change your plan. | Los pagos se hacen en Stripe. Este correo no confirma un pago ni cambia tu plan. |

The payment sentences follow the billing pages' own words (`src/components/commerce-recovery/copy.ts`). They do not
promise a date for a pause, because the email cannot know the grace period at the time it is read. If Codex wants the
date in, it must come from the same status the billing page shows.

## 4. For Codex: what the server needs so these can be built

1. **Company name and first name at send time.** `invitationEmail(link, employeeId)` and `recoveryEmail(link)` receive
   neither. The invitation needs the workplace's display name and the invited person's first name; reset and
   "password changed" need the workplace name.
2. **The reader's language.** Not stored when an Owner invites someone or when a reset is requested. Either store a
   language per person, pass the inviter's sign-in language with the invitation, or pass the `nv-lang` value of the
   browser that asked for the reset. Until then use the stacked two-language body in section 2.
3. **An HTML part.** `sendRegistered(email, subject, text)` and the commerce `sendMail` take text only. They need an
   `html` argument, sent as multipart/alternative with the text part kept. Keep `disableFileAccess` and
   `disableUrlAccess`.
4. **The expiry as a date** in the workplace's time zone for the invitation (the server already has `expiresAt`), and
   the real lifetime of the verify and billing links, which I did not confirm from the code.
5. **Remove** "Your Owner invited you" and the "Can’t use this email?" paragraph even if nothing else changes. These
   two are wording-only and need no new data.
6. **Tests that pin today's words** will need new expectations: `src/lib/auth/recovery-delivery.test.ts`, the
   invitation delivery tests, `src/lib/dev/capture.server.ts` (the local preview of the reset email), and the commerce
   lifecycle tests.
7. **Sender set-up** (SPF, DKIM, DMARC for the From domain) decides whether a branded email reaches the inbox. I did
   not check it.

## 5. For Jose to decide

- Every sentence in section 3 is new copy for review, in both languages.
- Whether the invitation should show the Employee ID in the email (it does today, as a plain line).
- Whether billing emails should go out in Spanish before a language is stored per business.
- The trial and payment emails are billing copy. They say nothing about payroll, taxes or moving money.

## 6. Not verified

- No email client was tested (Gmail, Apple Mail, Outlook). The reference was checked in Chromium only, at 390 and 640.
- Dark mode in mail clients was not tested. The reference declares light only; some clients still invert colours.
- Nothing was sent.
