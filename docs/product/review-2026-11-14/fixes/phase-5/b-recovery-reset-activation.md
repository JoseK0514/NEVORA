# Phase 5, package B: forgot password, reset, activation, assisted reset and the mobile access pages

Base `ad814bad`. Patch `b.patch` (34 files). Evidence `b-evidence/`. Nothing was pushed, no branch was made, the main checkout was not touched.
These surfaces are bilingual: every signed-out page renders English and Spanish from the existing language source, and every state has screenshots in both. The helper's page (`/app/account-recovery`) is signed in, so it renders English. Its Spanish is proven by unit tests.

## Findings

| Id | Status | What was done, what remains | Evidence |
|---|---|---|---|
| PB-014 | fixed on my pages. Two sentences remain in other packages | One word, "reset": titles, buttons, links, helpers, errors, the phone pages and the manager's page. Spanish as the finding gives it. The sentences the code decides on are unchanged. What a person reads is looked up in `authMessage`. The emails already say "reset" (listed under For Codex). | `forgot-empty-1440.png`, `forgot-empty-390-es.png`, `assist-receipt-1440.png` |
| PB-029 | fixed | "Reset your password", "Choose a new password", "Set up your account", in both languages. "You're set" kept. | `reset-code-needed-1440.png`, `activate-ready-1440.png` |
| PB-013 | partly | Link supplied the code: the field is hidden and one green line with a bold check says "Reset link accepted", with "Use a different code". No link: the field shows with one helper. A link the server refuses is said in the link's own words with two ways on. Remains: checking the code with the server when the page opens needs a server read (For Codex 3). | `reset-link-accepted-1440.png`, `reset-link-accepted-390-es.png`, `reset-link-refused-1440-es.png`, `reset-code-needed-1440.png` |
| PB-016 | fixed | Empty placeholders. The length rule is the helper of "New password". The match is the helper of "Confirm". Grey 6px dot until true, green bold check after. A mismatch is red text only after leaving the field or after the form refuses the pair. A rule is announced once, when it becomes true. The eye is on both fields and either one shows both. Same pair on reset, activation and the phone pages. | `reset-typing-900-es.png`, `reset-mismatch-left-field-390.png`, `activate-typing-390-es.png`, `activate-mismatch-900.png` |
| PB-017 | fixed. Carrying the ID from an emailed link needs Codex | 56px teal-50 circle, 28px bold check, "Password updated", one line, one filled button "Sign in". "Your next step" is gone. The Employee ID typed on the request page goes with the person to Sign in or to the reset page in the same tab. From an emailed link the page never learns the ID (For Codex 4). | `reset-done-real-1440-es.png`, `reset-done-forced-390.png` |
| PB-008 | fixed | The helper's receipt shows a QR code in a white 220px card, "Copy link" as the one filled button with a spoken confirmation, the time left, and what each person does. The raw code is behind "Show code". The QR is made in the browser by a local encoder with tests. No network call, no image request. | `assist-receipt-1440.png`, `assist-receipt-390.png`, `assist-receipt-code-shown-900.png`, `reset-from-helper-link-real-390.png`, `qr-read-back.txt` |
| PB-026 | needs Codex and Jose | Not built: the rule is a server decision. The client shows one rule only, the one the server enforces (8 characters). The finding's advice line was added and promises nothing. | `reset-link-accepted-1440.png` (line under the title), `activate-typing-390-es.png` |
| PB-023 | needs Codex | No first-sign-in fact exists. I searched `src` and `db` for first sign-in, first login and last login: nothing. The session carries no such field. Home's only hint is `useAccessJourney().confirmedId` (`src/components/employee-home-corp.tsx:157`), which is browser memory from activation in the same tab. Not built, as the brief says not to fake it. | none |
| Mobile access pages | fixed | Forgot, reset and activation on phones (flag on) now have the steps line, "what happens", "we asked for an email", the next step under every refusal, offline, not confirmed, the one field error style, the Support reference seam and the shared password pair, in both languages. | `mobile-access-*.png`, `all-mobile-access/` (176 pictures) |
| PB-037 (my pages) | fixed | Every field I render sets `enterKeyHint` ("next", then "go" on the last), `autoCorrect="off"`, `autoCapitalize`, `spellCheck={false}` and its `autoComplete` (`username`, `email`, `one-time-code`, `new-password`, `name`, `organization`). | tab orders in `all-flag-off/scan-log.json` (`p5bKeys`) |

## What was built

- **Reset your password** `/forgot-access` (signed out; from Sign in, "Forgot password?"). `src/components/recovery-request.tsx`. New title, line, "Email" with its helper in view, "Email me a reset link", "I have a reset code", "Can't use your email?". U11's steps, "what happens", "we asked for an email", refusals and offline are kept.
- **Choose a new password** `/reset-access` (signed out; from the emailed link, the helper's link, or "I have a reset code"). `src/components/recovery-reset.tsx`. The accepted-link line, the code field only when needed, the shared pair, "Save new password", the one-line finish.
- **Set up your account** `/activate` (signed out; from the invitation link). `src/app/activate/activation-passwords.tsx` now renders the shared pair. Steps, facts, refusals and "You're set" are U11's and unchanged.
- **The shared password pair** `src/components/access-recovery/password-pair.tsx`, used by reset, activation and both phone views. `RuleLine` in `src/components/auth-premium/password-rules.tsx`.
- **Help someone sign in** `/app/account-recovery` (Owner and Manager; from Team and from a person's page, unchanged). `src/components/assisted-recovery.tsx` and the new `src/components/access-recovery/assisted-receipt.tsx`. Reset wording on the form ("Make reset link"), the QR receipt.
- **QR encoder** `src/components/access-recovery/qr.ts` (byte mode, level M, versions 1 to 40, no dependency, 237 lines) with `qr.test.ts`.
- **Mobile access pages** (`NEVORA_MOBILE_ACCESS_ENABLED`, off by default): `src/components/mobile-access/recovery-views.tsx`, `activation-view.tsx`, `password-pair.tsx`, `copy.ts`, `help-view.tsx` (keyboard hints only), `journey.tsx` (one new method, `carry`).
- **Styles**: the brief names `src/components/access-recovery/access-recovery.css` as a new sheet. It already existed (U11 made it). I appended one Phase 5 block to it and imported it from my own components. `auth-b.css` and the shell are not touched. `!important` is only inside `@layer nv-b`. Media queries are the `b-viewport` aliases.

### Where the reset link lives, and for how long (PB-008)

1. The code is held in `AccountRecovery`'s React state (`issued`), exactly as before. `AccountRecovery` still clears it when the page is left, the window loses focus, the tab is hidden, the device goes offline, the code expires, or the helper chooses "Make another link". I did not change that.
2. The link is `origin + /reset-access#proof=<code>`. It is built in the browser inside `assisted-receipt.tsx`, in two places only: when the QR is drawn and when "Copy link" is pressed. It is never kept in state, never logged, never sent. The code is in the URL fragment, never in a query string. A fragment is not sent to a server.
3. In the page the link exists only as the QR's inline SVG path (dark modules, no text, no `href`, no `<img>`, no `src`). The code as text is in the page only while "Show code" is open. The capture checked the live page: the string `#proof=` is not in the document, and the code field count is 0 until "Show code".
4. The receipt component is mounted only while a code is issued. When `AccountRecovery` clears the code, the SVG, the code field and the component's own state leave the page together. The capture checked this after "Make another link": receipt 0, QR 0, code field 0.
5. The clipboard: after the helper presses "Copy link" or "Copy code", the device clipboard holds it until something else is copied. A page cannot clear that. The link works once and for 15 minutes.
6. On the other person's phone the existing code removes the fragment from the address at once. The capture saw `/reset-access` with no fragment and the accepted line.
7. A code longer than QR version 15 can hold is not drawn (the modules would be too small to scan at 220px). The receipt then says to copy the link. This state is covered by a unit test of the encoder only.

## Contract coverage

| Requirement | Status | Module, endpoint |
|---|---|---|
| "reset" everywhere a person sees it | done on my pages | `src/lib/auth-copy.ts` (my entries and `authMessage`), `access-recovery/copy.ts`, `mobile-access/copy.ts`. Server sentences untouched. |
| Imperative titles | done | same |
| Hide the code field when the link supplied it | done | `account-recovery.tsx`: one line changed. `setLinkProof(isPublicAccountProof(token))` now runs at every width, not only with mobile access. How the code is read, placed in the field and removed from the address is unchanged. |
| Check the code on load | waiting on Codex | needs a read that does not spend the code |
| Password pair | done | `password-pair.tsx`; `POST /api/auth/reset-access`, `POST /api/auth/activate` unchanged |
| Finish | done | `recovery-reset.tsx`, `recovery-views.tsx` |
| Employee ID carried | partly | `journey.carry` (memory only). Emailed link: waiting on Codex. |
| QR, Copy link, time left, who does what | done | `assisted-receipt.tsx`, `qr.ts`; `POST /api/manager/account-recovery` unchanged |
| Password rule | waiting on Codex and Jose | not built |
| First sign-in card | waiting on Codex | not built |
| Mobile access pages | done | `mobile-access/*` |
| Keyboard hints | done | all fields in my files |
| No change to recovery, reset, activation, passkey, session, token or rate-limit logic | kept | the only logic-adjacent line is the `setLinkProof` one above |

## States

"Real" means the page's own request was answered by the owned local server with fictional data. "Forced" means the request was answered in the page with `page.route`. "Client" means no request is involved. Files are in `b-evidence/all-flag-off/` at 320, 390, 900 and 1440, with `-es` for Spanish; the phone presentation is in `b-evidence/all-mobile-access/` (`ma-` prefix) at 320 and 390.

| Screen | State | How produced | File stem |
|---|---|---|---|
| Reset your password | empty, typing | client | `forgot-empty`, `forgot-typing` |
| | field errors | client | `forgot-field-errors` |
| | offline | real (browser offline, nothing sent) | `forgot-offline` |
| | refused | forced (500) | `forgot-refused-forced` |
| | unavailable | forced (request aborted) | `forgot-unavailable-forced` |
| | asked ("Check your email") | real (fictional unknown ID; the server gives the same hedged answer to everyone; no email is sent) | `forgot-asked` |
| Choose a new password | code needed, field errors | client | `reset-code-needed`, `reset-code-field-errors` |
| | link accepted | client (a fictional code of the right shape in the fragment; the server is not asked until submit) | `reset-link-accepted` |
| | typing (both rules met) | client | `reset-typing` |
| | mismatch after leaving the field | client | `reset-mismatch-left-field` |
| | mismatch refused by the form | client | `reset-mismatch-refused` |
| | link refused | real (the server refused the fictional code) | `reset-link-refused` |
| | typed code refused | real | `reset-code-refused` |
| | not confirmed (reply lost) | forced (aborted) | `reset-not-confirmed-forced` |
| | not confirmed (503) | forced | `reset-unavailable-forced` |
| | offline | real (browser offline) | `reset-offline` |
| | done | forced, and also real through the helper's link | `reset-done-forced`, `reset-done-real-*-es` |
| Set up your account | no link, unreadable link | client | `activate-no-link`, `activate-link-unreadable` |
| | ready, typing, field errors, mismatch | client | `activate-ready`, `activate-typing`, `activate-field-errors`, `activate-mismatch` |
| | offline | real (browser offline) | `activate-offline` |
| | link refused | real (the server refused the fictional invitation) | `activate-link-refused` |
| | unavailable, not confirmed, done | forced | `activate-unavailable-forced`, `activate-not-confirmed-forced`, `activate-done-forced` |
| Help someone sign in | form, confirmation missing | real page, client check | `assist-form`, `assist-form-not-confirmed-1440` |
| | receipt with QR | real (Owner signed in, code issued by the local server) | `assist-receipt` |
| | link copied | real | `assist-receipt-link-copied-1440` |
| | code shown | real | `assist-receipt-code-shown` |
| | the other person opens the link | real | `reset-from-helper-link-390`, `-es` |
| | they reset | real, end to end | `reset-done-real-390-es`, `reset-done-real-1440-es` |
| | offline, session ended, expired, not confirmed | unit tests only | `recovery-u11.test.tsx`, `assisted-recovery.test.tsx` |
| | QR too long | unit test of the encoder only | `qr.test.ts` |
| Phone pages (flag on) | the same states as above, plus Welcome and three help pages | same methods | `ma-*` |

QR proof: the pictures of the real receipt were read back with Apple's Core Image QR detector and the text equals the link the page put on the clipboard (`qr-read-back.txt`). All 40 QR versions at full capacity were read back the same way while building the encoder.

Capture log results: 252 width checks with the flag off and 142 with it on, plus 72 recaptures. Overflow 0 everywhere. No page error. No target of mine under 44px. One older target is small: the inline "Política de privacidad" link in the Owner contact help page (17 to 38px high, not changed by me).

## Keyboard and focus

Tab order, from the capture (1440, both languages):
- Reset your password: Sign in (back), Language, Employee ID [next], Email [go], Email me a reset link. Enter on an empty form moves focus to the Employee ID with its error.
- Choose a new password, code needed: Sign in, Language, Reset code [next], New password [next], eye, Confirm [go], eye, Save new password.
- Choose a new password, link accepted: Sign in, Language, Use a different code, New password [next], eye, Confirm [go], eye, Save new password. "Use a different code" clears the field, shows it and focuses it (existing behaviour).
- Set up your account: Sign in, Language, Create password [next], eye, Confirm [go], eye, Activate account.
- After a refusal, offline or not confirmed, focus moves to the message (`#reset-error`, `#recovery-error`, `#recovery-offline`, `#activation-offline`). After the finish, focus moves to the result (`role="status"`). On the helper's page, focus moves to "Reset link ready".
- Every focused control showed a 2px teal outline in the log.
- Pictures: `reset-keyboard-first-field-1440.png`, `forgot-keyboard-error-focus-1440-es.png`, `reset-done-keyboard-focus-1440-es.png`, `all-flag-off/keys-*.png`, `all-flag-off/assist-receipt-focus-copy-link-1440.png`.
- Reduced motion: every capture ran with `prefers-reduced-motion: reduce`. My styles add no animation and no transition.
- Not walked by keyboard in the browser: the helper's form and receipt beyond focus on "Copy link", and the phone presentation.

## English and Spanish

Signed-out pages: both rendered, both captured. Spanish follows the finding's wording and the register of the existing pages. `phase5.test.tsx` renders every state of the request, reset and activation pages at both presentations in Spanish and checks that no English leaks. It also checks that no visible string in the three copy modules says "recover" or "recupera".
Signed-in helper page: English on screen. `phase5.test.tsx` and `recovery-u11.test.tsx` render it in Spanish.

## Copy

Every new or changed sentence. No payroll sentence is among them.

#### auth-copy.ts

| Key | English | Spanish | |
|---|---|---|---|
| `forgotTitle` | Reset your password | Restablece tu contraseña | changed |
| `recoveryEmail` | Email | Correo | changed |
| `recoveryEmailHint` | The email your workplace has on file. | El correo que tiene tu lugar de trabajo. | changed |
| `requestRecovery` | Email me a reset link | Enviarme el enlace | changed |
| `requestingRecovery` | Asking for your link… | Pidiendo tu enlace… | changed |
| `requestingRecoveryStatus` | Asking for your reset link… | Pidiendo tu enlace para restablecerla… | changed |
| `checkEmail.expires` | The reset link works once and expires in 15 minutes. | El enlace funciona una sola vez y vence en 15 minutos. | changed |
| `haveRecoveryCode` | I have a reset code | Tengo un código | changed |
| `cantUseEmail` | Can’t use your email? | ¿No puedes usar tu correo? | changed |
| `cantUseEmailBody` | Ask your manager or Owner to help you reset your password. They must check who you are before they give you a reset code. | Pide a tu gerente o al dueño que te ayude a restablecer tu contraseña. Deben confirmar quién eres antes de darte un código. | changed |
| `requestNoScript` | Enable JavaScript to ask for a reset link, or ask your manager or Owner to help you reset your password. | Activa JavaScript para pedir un enlace, o pide a tu gerente o al dueño que te ayude a restablecer tu contraseña. | changed |
| `resetTitle` | Choose a new password | Elige una contraseña nueva | changed |
| `signInWithNewPassword` | Sign in | Iniciar sesión | changed |
| `recoveryCode` | Reset code | Código de restablecimiento | changed |
| `recoveryCodeHint` | Paste the code from your email or from your manager. | Pega el código de tu correo o el que te dio tu gerente. | changed |
| `atLeast8` | At least 8 characters | Al menos 8 caracteres | changed |
| `resetPassword` | Save new password | Guardar contraseña nueva | changed |
| `resettingPassword` | Saving new password… | Guardando contraseña nueva… | changed |
| `resettingStatus` | Saving your new password… | Guardando tu contraseña nueva… | changed |
| `useNewCode` | Use a new reset code | Usa un código nuevo | changed |
| `requestNewCode` | Get a new reset link | Pedir un enlace nuevo | changed |
| `needRecoveryCode` | Need a reset link? | ¿Necesitas un enlace? | changed |
| `needRecoveryCodeBody` | Ask for a reset link with the email your workplace has on file. If you can’t use that email, ask your manager or Owner. They must check who you are before they give you a code. | Pide un enlace con el correo que tiene tu lugar de trabajo. Si no puedes usar ese correo, pide ayuda a tu gerente o al dueño. Deben confirmar quién eres antes de darte un código. | changed |
| `reset.linkAccepted` | Reset link accepted | Enlace aceptado | new |
| `reset.useDifferentCode` | Use a different code | Usar otro código | new |
| `reset.linkRefusedTitle` | This link can’t be used | Este enlace no se puede usar | new |
| `reset.linkRefused` | This link has expired or was already used. Reset links last 15 minutes. | Este enlace venció o ya se usó. Los enlaces duran 15 minutos. | new |
| `reset.doneLine` | For your safety, we signed you out on every device. | Por seguridad, cerramos tu sesión en todos los dispositivos. | new |
| `reset.lengthMet` | The password is long enough | La contraseña ya tiene el largo necesario | new |
| `activateTitle` | Set up your account | Configura tu cuenta | changed |
| `quiet.forgotSub` | We’ll email you a reset link. | Te enviaremos un enlace para restablecerla. | changed |
| `quiet.resetTitle` | Choose a new password | Elige una contraseña nueva | changed |
| `quiet.resetSub` | Use a phrase you don’t use anywhere else. | Usa una frase que no uses en ningún otro lugar. | changed |
| `quiet.haveRecoveryCode` | I have a reset code | Tengo un código | changed |
| `invalid.email` | Enter your email | Escribe tu correo | changed |
| `invalid.code` | Paste your reset code | Pega tu código | changed |
| `invalid.codeShort` | Paste the complete reset code | Pega el código completo | changed |

Removed (no longer shown): `nextStep`, `recoveryCodePlaceholder`, `newPasswordPlaceholder`, `enterItAgain`, `quiet.emailPlaceholder`, `quiet.newPasswordPlaceholder`, `quiet.typeAgain`

#### access-recovery/copy.ts

| Key | English | Spanish | |
|---|---|---|---|
| `activation.phrase` | Use a phrase you don’t use anywhere else | Usa una frase que no uses en ningún otro lugar | new |
| `recovery.requestedSub` | We asked for a reset email to be sent. | Pedimos que se envíe un correo para restablecer tu contraseña. | changed |
| `recovery.next.requestFailed` | Your password has not changed. If this keeps happening, ask your manager or Owner for a reset code. | Tu contraseña no ha cambiado. Si esto sigue pasando, pide un código a tu gerente o al dueño. | changed |
| `recovery.next.mismatch` | Type the same new password in both fields, then choose Save new password. | Escribe la misma contraseña nueva en ambos campos y elige Guardar contraseña nueva. | changed |
| `assisted.summary` | Give someone a one-time link to reset their password. | Dale a alguien un enlace de un solo uso para restablecer su contraseña. | new |
| `assisted.how[1]` | You get a one-time reset link: a QR code they scan, or a link you copy. | Recibes un enlace de un solo uso: un código QR que la persona escanea o un enlace que copias. | changed |
| `assisted.how[2]` | They open it on their own phone and choose a new password. | La persona lo abre en su propio teléfono y elige una contraseña nueva. | changed |
| `assisted.lasts` | The link works once and lasts 15 minutes. | El enlace funciona una sola vez y dura 15 minutos. | changed |
| `assisted.readyTitle` | Reset link ready | Enlace listo | new |
| `assisted.readyFor` | For {id} · works once, until | Para {id} · funciona una sola vez, hasta las | new |
| `assisted.scan` | Have them scan this with their phone camera. It works once, until {time}. | Pídele que lo escanee con la cámara de su teléfono. Funciona una sola vez, hasta las {time}. | new |
| `assisted.qrLabel` | QR code that opens the reset page for {id} | Código QR que abre la página para restablecer la contraseña de {id} | new |
| `assisted.qrTooLong` | This link is too long for a QR code. Copy the link instead. | Este enlace es muy largo para un código QR. Copia el enlace. | new |
| `assisted.left` | {n} left | Tiempo restante: {n} | new |
| `assisted.leftLast` | Less than a minute left | Queda menos de un minuto | new |
| `assisted.copyLink` | Copy link | Copiar enlace | new |
| `assisted.linkCopied` | Link copied. It works once, until {time} | Enlace copiado. Funciona una sola vez, hasta las {time} | new |
| `assisted.linkCopyFailed` | Couldn’t copy the link. Show the code and read it out instead | No se pudo copiar el enlace. Muestra el código y díctalo | new |
| `assisted.showCode` | Show code | Mostrar código | new |
| `assisted.hideCode` | Hide code | Ocultar código | new |
| `assisted.codeLabel` | Reset code | Código de restablecimiento | new |
| `assisted.codeHelp` | If they can’t scan or open the link: on the sign-in page they choose Forgot password?, then I have a reset code, and type this code. | Si no puede escanear ni abrir el enlace: en la página de inicio de sesión elige ¿Olvidaste tu contraseña?, luego Tengo un código, y escribe este código. | new |
| `assisted.select` | Select | Seleccionar | new |
| `assisted.handoverLabel` | Hand it over | Entrega el enlace | changed |
| `assisted.youDo` | Show {id} this screen so they can scan the code, or copy the link and send it only to them. Do not post it in a group chat. | Muéstrale esta pantalla a {id} para que escanee el código, o copia el enlace y envíaselo solo a esa persona. No lo publiques en un chat de grupo. | changed |
| `assisted.theyDo` | They scan the code with their own phone, or open the link. The reset page opens with the code already in place, and they choose a new password. | Escanea el código con su propio teléfono o abre el enlace. La página se abre con el código ya puesto y elige una contraseña nueva. | changed |
| `assisted.timeDo` | Works once, until {time}. After that, check who they are again and make a new link. | Funciona una sola vez, hasta las {time}. Después, confirma otra vez quién es y crea un enlace nuevo. | changed |
| `assisted.another` | Make another link | Crear otro enlace | new |
| `assisted.anotherNote` | A new link retires any unused earlier one. This link hides when you leave this page. | Un enlace nuevo anula cualquier enlace anterior sin usar. Este enlace se oculta cuando sales de esta página. | new |
| `assisted.submit` | Make reset link | Crear enlace | new |
| `assisted.submitting` | Making link… | Creando enlace… | new |
| `assisted.submittingStatus` | Making the reset link. Checking your access first. | Creando el enlace. Primero comprobamos tu acceso. | new |
| `assisted.noScript` | Enable JavaScript to make a reset link. You can still go back with the link above. | Activa JavaScript para crear un enlace. Puedes volver con el enlace de arriba. | new |
| `assisted.offline` | Nothing was sent and no link was made. Reconnect, then try again. | No se envió nada y no se creó ningún enlace. Vuelve a conectarte e inténtalo de nuevo. | changed |
| `assisted.notConfirmedTitle` | Link not confirmed | Enlace sin confirmar | new |
| `assisted.notConfirmed` | The reset link could not be confirmed. Check their current access before you make another. | No pudimos confirmar el enlace. Revisa el acceso actual de la persona antes de crear otro. | new |
| `assisted.expiredTitle` | Reset link expired | El enlace venció | new |
| `assisted.expired` | This link expired. Check who they are again before you make another. | Este enlace venció. Confirma otra vez quién es antes de crear otro. | new |
| `assisted.endedTitle` | Your session ended | Tu sesión terminó | new |
| `assisted.ended` | Your session ended. Sign in again to make a reset link. | Tu sesión terminó. Inicia sesión de nuevo para crear un enlace. | new |
| `passkey.backBody` | Your password still works. If you forgot it, choose Forgot password? to get a reset link. | Tu contraseña sigue funcionando. Si la olvidaste, elige ¿Olvidaste tu contraseña? para recibir un enlace y restablecerla. | changed |

#### mobile-access/copy.ts

| Key | English | Spanish | |
|---|---|---|---|
| `assistActiveBody` | Use your Employee ID and the password you created. If you forgot your password, reset it instead of asking for another invitation. | Usa tu ID de empleado y la contraseña que creaste. Si la olvidaste, restablécela en lugar de pedir otra invitación. | changed |
| `assistActiveSub` | Sign in or reset your password. | Inicia sesión o restablece tu contraseña. | changed |
| `assistUnexpectedBody` | Check with your Owner before continuing. Don’t forward your invitation link or share your password or reset code. | Consulta al dueño antes de continuar. No reenvíes el enlace de invitación ni compartas tu contraseña o tu código. | changed |
| `cantEmailBody` | Ask your manager to put you in touch with someone at your workplace who can check who you are and give you a reset link or code. Manager and Owner accounts need another authorized Owner. | Pide a tu gerente que te ponga en contacto con alguien de tu trabajo que pueda verificar tu identidad y darte un código. Las cuentas de gerente o dueño necesitan a otro dueño autorizado. | changed |
| `checkEmail` | Check your inbox and spam folder. Open the reset link to choose a new password. | Revisa tu bandeja de entrada y el correo no deseado. Abre el enlace para elegir una contraseña nueva. | changed |
| `codeHint` | Paste the complete code from your email or from an authorized person at work. | Pega el código completo de tu correo o de una persona autorizada de tu trabajo. | changed |
| `expires` | Reset links and codes expire after 15 minutes and can be used once. | Los enlaces y códigos vencen en 15 minutos y solo se pueden usar una vez. | changed |
| `forgotSub` | We’ll email you a reset link. | Te enviaremos un enlace para restablecerla. | changed |
| `forgotTitle` | Reset your password | Restablece tu contraseña | changed |
| `haveCode` | I have a reset code | Tengo un código | changed |
| `helpEmail` | I can’t use my email | No puedo usar mi correo | changed |
| `helpEmailIntro` | Your workplace can help you reset your password another way. | Tu trabajo puede ayudarte a restablecer tu contraseña por otra vía. | changed |
| `helpEmployeeBody` | Ask your manager to connect you with someone authorized to check who you are and give you a reset link or code. | Pide a tu gerente que te ponga en contacto con alguien autorizado para confirmar quién eres y darte un enlace o un código. | changed |
| `helpPasswordSub` | Reset the password for your account. | Restablece la contraseña de tu cuenta. | changed |
| `helpPrivilegedBody` | You need another authorized Owner. A Manager can’t reset the password of a Manager or Owner account. | Necesitas a otro dueño autorizado. Un gerente no puede restablecer la contraseña de una cuenta de gerente o dueño. | changed |
| `invalidCodeBody` | It may have expired, already been used, or couldn’t be checked. Get a new reset link. | Puede haber vencido, haberse usado o no pudo comprobarse. Pide un enlace nuevo. | changed |
| `inviteTitle` | Create your password | Crea tu contraseña | changed |
| `needCode` | Need a reset link? | ¿Necesitas un enlace? | changed |
| `ownerEmailChoice` | I can use my email | Puedo usar mi correo | changed |
| `ownerEmailSub` | Reset your password with your Employee ID. | Restablece tu contraseña con tu ID de empleado. | changed |
| `ownerMailIssue` | I need help accessing my Owner account. I can’t use my registered email, and no other authorized Owner is available to help. | Necesito ayuda para acceder a mi cuenta de dueño. No puedo usar mi correo registrado y no hay otro dueño autorizado disponible para ayudarme. | changed |
| `ownerOtherBody` | Another authorized Owner can check who you are and give you a reset link or code. | Otro dueño autorizado puede confirmar quién eres y darte un enlace o un código para restablecer tu contraseña. | changed |
| `ownerOtherNote` | A Manager can’t reset an Owner’s password. Don’t share your password when asking for help. | Un gerente no puede restablecer la contraseña de un dueño. No compartas tu contraseña al pedir ayuda. | changed |
| `ownerPrivacyBody` | Keep passwords, reset codes, invitation links, bank details and identity documents out of this first email. | No incluyas contraseñas, códigos para restablecer, enlaces de invitación, datos bancarios ni documentos de identidad en este primer correo. | changed |
| `ownerUseCode` | Use a reset code | Usar un código | changed |
| `receivedSub` | If your details match an active account and its registered email is available, a reset link will be sent there. | Si los datos coinciden con una cuenta activa y su correo registrado está disponible, se enviará allí un enlace para restablecer tu contraseña. | changed |
| `recoveryCode` | Reset code | Código de restablecimiento | changed |
| `recoveryEmail` | Email | Correo | changed |
| `recoveryUnavailable` | We can’t take your request right now. Check your connection and try again, or get help from your workplace. | No podemos recibir tu solicitud ahora. Revisa tu conexión e inténtalo de nuevo, o pide ayuda en tu trabajo. | changed |
| `requestNew` | Get a new reset link | Pedir un enlace nuevo | changed |
| `requestRecovery` | Email me a reset link | Enviarme el enlace | changed |
| `requesting` | Asking for your link… | Pidiendo tu enlace… | changed |
| `resetDoneSub` | For your safety, we signed you out on every device. | Por seguridad, cerramos tu sesión en todos los dispositivos. | changed |
| `resetPassword` | Save new password | Guardar contraseña nueva | changed |
| `resetSub` | Use a phrase you don’t use anywhere else. | Usa una frase que no uses en ningún otro lugar. | changed |
| `resetTitle` | Choose a new password | Elige una contraseña nueva | changed |
| `resetUnknownBody` | We couldn’t confirm whether your password changed. Try signing in with your new password before you ask for another link. | No pudimos confirmar si se cambió tu contraseña. Intenta iniciar sesión con la contraseña nueva antes de pedir otro enlace. | changed |
| `resetting` | Saving new password… | Guardando contraseña nueva… | changed |
| `signInNew` | Sign in | Iniciar sesión | changed |
| `supportSafetyBody` | Don’t include passwords, reset codes, invitation links, identity documents, bank details or payroll information. Remove personal details from any screenshots you send. | No incluyas contraseñas, códigos para restablecer, enlaces de invitación, documentos de identidad, datos bancarios ni información de nómina. Oculta los datos personales en las capturas que envíes. | changed |

Removed (no longer shown): `codePlaceholder`, `confirmPlaceholder`, `linkLoaded`, `passwordHint`, `ruleLength`, `ruleMatch`, `ruleMatched`

#### What a person reads for each outcome sentence (auth-copy.ts, authMessage)

| Sentence the code decides on (unchanged) | English shown | Spanish shown |
|---|---|---|
| If the details match an active account, we’ll email recovery steps. Can’t use that email? Ask your manager or Owner for help. | If the details match an active account, we’ll email a reset link. Can’t use that email? Ask your manager or Owner for help. | Si los datos coinciden con una cuenta activa, te enviaremos por correo un enlace para restablecer tu contraseña. ¿No puedes usar ese correo? Pide ayuda a tu gerente o al dueño. |
| Recovery could not be confirmed. Keep your current access and try again. | We couldn’t confirm this. Try again in a moment. | No pudimos confirmarlo. Inténtalo de nuevo en un momento. |
| Recovery is unavailable. Try again or contact your manager for assisted recovery. | We can’t take your request right now. Try again, or ask your manager to help you reset your password. | No podemos recibir tu solicitud ahora. Inténtalo de nuevo o pide a tu gerente que te ayude a restablecer tu contraseña. |
| Your access ended. Sign in again. | This page expired. | Esta página venció. |
| Passwords do not match. | Passwords do not match. | Las contraseñas no coinciden. |
| This recovery code has expired, was already used, or cannot be verified. Request a new code or contact your manager. | This reset code has expired, was already used, or can’t be checked. Get a new reset link or ask your manager. | Este código venció, ya se usó o no se puede comprobar. Pide un enlace nuevo o habla con tu gerente. |
| The reset outcome could not be confirmed. Try signing in with your new password before requesting another code. | We couldn’t confirm the reset. Try signing in with your new password before you ask for another link. | No pudimos confirmar el restablecimiento. Intenta iniciar sesión con tu contraseña nueva antes de pedir otro enlace. |

Hard-coded English on the helper's form that I moved into the copy module (so it has Spanish): the summary, the submit button, the busy status, the no-JavaScript note and the three refusal titles and bodies. One hidden hint changed: "I independently confirmed this employee's identity and can hand over this link securely." (was "transfer this code"). Two page-level strings in `src/app/app/account-recovery/`: the loading title is now "Help someone sign in" with the summary "Give someone a one-time link to reset their password.", and the unavailable title is "Help someone sign in is unavailable".

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: clean in `src`.
- `npx eslint` on the 32 changed `.ts` and `.tsx` files, and on `src/app/api/auth/recovery/route.test.ts`: clean.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 896 files passed, 24 skipped; 13,664 tests passed, 741 skipped, 0 failed. (`src/test/manual-publication.test.ts` is outside those folders; run alone it fails as expected.)
- New tests: `qr.test.ts` (7), `phase5.test.tsx` (31). Updated pins, wording and markup only: `account-recovery.test.tsx`, `assisted-recovery.test.tsx`, `recovery-u11.test.tsx`, `mobile-access.integration.test.tsx`, `metadata.server.test.ts`, `activate/page.test.tsx`, `brand-pages.test.tsx`.
- One test in a server folder was touched: `src/app/api/auth/recovery/route.test.ts`. I changed only the expected Spanish sentence in its last assertion (the client's translation of the server's hedge). The security assertions in that test (identical answers for known and unknown details, both 202) are unchanged.
- Three browser integration tests pin words I changed. I updated their selectors and did not run them: `operator-password-browser.integration.ts` ("Save new password"), `step4-lifecycle-browser.integration.ts` ("Make reset link", "Show code" then "Reset code", "Save new password", the finish link by `a.q-btn[href="/login"]`), `mobile-access-browser.integration.ts` (the finish link).
- Browser captures with `cap.sh` on the owned local database: flag off (288 pictures), flag on (178), two recaptures after the last fixes (76).
- The patch reverse-applies cleanly on my HEAD (`git apply --check -R`).

## For Codex

1. **Password rule (PB-026).** Request: on reset and activation, refuse the most common passwords and any password that contains the Employee ID or the company name, and return a typed reason so the page can say which. The client shows no such rule today.
2. **First sign-in (PB-023).** Request: a server fact for "this is this person's first signed-in session" (and a way to mark the welcome card dismissed), on the session or the Home read, for Employee and Owner. The Owner list also needs three facts: team added, first schedule built, pay period set.
3. **Early check of a reset code (PB-013).** Request: a read that says whether a reset code is still usable without spending it, so an expired link is said before the person types two passwords. Today the page can only check the shape.
4. **Employee ID after a reset (PB-017).** `POST /api/auth/reset-access` returns only `{state:"reset"}`. If it also returned the Employee ID (as activation does), the finish could hand it to Sign in. Your call on whether that is acceptable to reveal to the holder of a valid code.
5. **Server sentence.** `src/app/api/auth/recovery/route.ts` still sends "we'll email recovery steps". The page shows "we'll email a reset link" through `authMessage`, which matches the server sentence exactly. If you change the server sentence, change the key in `MESSAGES` in `src/lib/auth-copy.ts` in the same commit, or the Spanish page falls back to English.
6. **Emails today** (`src/lib/auth/account-email-copy.ts`, not changed). Reset: subject "Reset your NEVORA password / Restablece tu contraseña de NEVORA", body "A password reset was requested for your NEVORA account. This single-use link expires in 15 minutes." It already says "reset" and matches the page title. Invitation: subject "Activate your NEVORA account / Activa tu cuenta de NEVORA"; the page title is now "Set up your account" and its button is still "Activate account". Changed: "Your NEVORA password was changed / Se cambió tu contraseña de NEVORA". Each email closes its English half with an em dash line as a separator.
7. **`account-recovery.tsx`.** One line changed (see Contract coverage). The English outcome sentences in that file are unchanged because the screens and tests decide on them.
8. **Sign-in's forced password replacement** sends people to `/reset-access#proof=`. That page now shows "Reset link accepted" for them too. Say if that flow needs its own words.
9. **`autoComplete="one-time-code"`** is now on the reset code field (it was `off`), as the brief asks.
10. The three browser tests listed under Checks run need a run on your side.

## For Jose to decide

1. Review the Spanish in the Copy table, above all "Enlace aceptado", "Usar otro código", "Guardar contraseña nueva" and the helper's handover sentences.
2. The title is "Set up your account" and the button is "Activate account" (U11's offline sentence names that button). Keep both, or rename the button.
3. The finish shows "Sign in" twice: the page's back pill and the filled button. The finding asks for "Sign in" on the button.
4. Under the finish button I kept U11's quiet line "Your time clock PIN did not change." The finding asks for one line; this is a second, smaller one.
5. A mismatch that the form refuses still shows U11's card above the fields and the red line under "Confirm". After only leaving the field, just the red line shows.
6. The advice "Use a phrase you don't use anywhere else" is the line under the title on reset and a line under the first field on activation.
7. The sign-in link still says "Forgot password?" (builder A's entry) and opens "Reset your password".
8. Assisted help now hands over a link first and the code second. The helper's page says "link" where it said "code".

## Needed from another package

- **A (sign-in and shell):** nothing is required for my pages to work. I read `t.signIn` for the finish button. If A renames the "Forgot password?" link, the passkey guidance sentence in `access-recovery/copy.ts` (`passkey.backBody`, `passkey.forgot`) quotes it.
- **Signed-in app, outside this phase:** `src/app/app/help/page.tsx:132` says "give them a recovery code", and `src/components/mobile-home-overview.tsx:57` says "Account recovery". Both should say "reset" (a reset link).
- `src/lib/auth-copy.ts` is shared with A. My edits are inside the reset, activation and `invalid` entries, the new `reset` group, and the message table at the end of the file. I removed five unused keys of mine (`nextStep`, `recoveryCodePlaceholder`, `newPasswordPlaceholder`, `enterItAgain`, and in `quiet`: `emailPlaceholder`, `newPasswordPlaceholder`, `typeAgain`).

## Not verified

- A real phone camera scanning the QR. It was read back by a desktop decoder from screenshots only.
- 200% text size.
- The three browser integration tests whose selectors I updated.
- Real email delivery, by design. No email was sent.
- Safari and Firefox. Captures are Chromium.
- The helper's receipt when the code expires on screen, goes offline or loses focus (existing clearing code, unit tests only), and a code too long for the QR.
- A screen reader. Roles, live regions and focus moves are checked in markup and in the capture log only.

## Follow-up: alternatives under the card (PB-015), the workplace chip (PB-021)

Patch `b2.patch` (11 files). It is the diff from the commit that has package B plus builder A's patch (`0a784aa4` in my worktree; A's patch applied with `git apply --3way`, no conflict) to my new HEAD. It holds only this follow-up.

**The rule now, on every page of mine:** the card holds the form and one filled button. Other ways on are text links in the shell's `nav.q-auth__links`, under the card. No outlined pill and no second button is left in a card.

Moved out of the card:

| Page | Action | Was | Now |
|---|---|---|---|
| Reset your password | "I have a reset code" | outlined pill under the filled button | text link in the links row |
| Reset your password | "Can't use your email?" | `details` in the card | a button in the links row with `aria-expanded` and `aria-controls`; its answer opens under the row in a quiet block |
| Check your email | "Check your details" | quiet button in the card | text button in the links row |
| Choose a new password | "Need a reset link?" | quiet button under the form | text link in the links row |
| Set up your account (form, no link, link refused) | "Already activated? Sign in" | quiet button, in the card when there is no form | text link in the links row |
| Set up your account, not confirmed, mobile access on | "Get invitation help" | a second filled button beside "Try signing in" | text link in the links row |
| Phone: Reset your password | "I have a reset code" | outlined pill in the card | text link under the card |
| Phone: Check your email | "Back to sign in", "I have a reset code" | text link and outlined pill in the card | "Back to sign in" is the card's one filled button; the code link is under the card |
| Phone: Choose a new password | "Need a reset link?" | quiet button under the card | text link in the links row |
| Phone: activation | "Already activated? Sign in"; "Get invitation help" when not confirmed | quiet button; outlined pill in the card | text links in the links row |
| Welcome | "Activate account" | outlined pill in the card | text link under the card, with Sign in's words "New here? Set up your account"; the line "Your workplace creates your account first." sits under it |

Left inside a card, with the reason:
- "Use a different code" beside "Reset link accepted": it acts on the code field it stands for, and it is a text link, not a button.
- The links inside a refusal ("Get a new reset link", "Try signing in", "Use a different code"): they are the next step of that message (U11), and focus lands on the message.
- The eye in each password field, and "Copy" beside the Employee ID on the activation finish: field controls.
- Access help: the topic rows are the page's content. On the Owner contact form, "Edit details" and "Clear contact details" are text links that act on the form. Each help card has one filled button. Not changed.
- Phone pages keep their disclosures ("Where do I find my Employee ID?" under its field; "No email received?", "Can't use your email?", "About this invitation" under the card). They were already outside the card or tied to a field.
- The helper's signed-in receipt is not a signed-out page: "Copy link" is filled, "Show code" is a text button, "Make another link" stays a grey pill.

**Workplace chip.** Forgot and reset pages now pass the public workplace name; the chip sits under the title using the shell's own chip rules (`.q-auth__hd > p`). Activation shows it when there is no link, when the link is refused and when the result is not confirmed. With the activation form on screen, and on its finish, I left it out: U11's line already says "Choose a password to join {workplace}" and two U11 tests pin that line and the finish header. When the name is unknown, no chip is shown.

**Keyboard attributes.** I checked A's list against my patch: all are present (forgot, reset code, both password fields, activation, the phone views, `assisted-employee`). `assisted-proof` is read-only, so it has the three "never correct" attributes and no `enterKeyHint`.

**Focus order** (capture, 1440): fields, the filled button, then the links row, then the closing line. Forgot: Employee ID, Email, "Email me a reset link", "I have a reset code", "Can't use your email?". The disclosure opens with Enter or Space. Pictures: `forgot-keyboard-links-row-1440.png`, `forgot-cant-email-open-1440.png`, `forgot-cant-email-open-390-es.png`.

**One thing for builder A.** On a desktop page taller than the window, the shell's 104px of room left the links row touching the closing line (seen on "Revisa tu correo" at 1440). I added room from my own sheet for my pages only (140px, and 248px while the answer is open). Sign in may need the same if its card ever grows.

**Checks.** Type check clean. Lint clean on the changed files. Full unit run: 898 files and 13,689 tests passed, 0 failed. Six new tests in `phase5.test.tsx` (37 in the file). All U11 tests pass unchanged in this follow-up. Captures on the combined tree: flag off, 31 states at 320, 390, 900 and 1440 in both languages (248 checks), a 1440 recapture after the spacing fix, and flag on at 320 and 390 (140 checks). Overflow 0, no page error, no target of mine under 44px. The affected pictures in `b-evidence/` were replaced. The helper's receipt pictures and the real end-to-end reset pictures are from the first delivery; that page did not change.

**Not verified in this follow-up:** the three browser integration tests, 200% text size, and the answer block without JavaScript (the button needs it; the page's existing no-JavaScript note gives the same guidance).
