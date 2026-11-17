# Package E: U11, access and recovery

Builder E. Worktree `wt/p4e`. Base `c30f530e` (on `9c661c3e`, Development `22107a24` merged in).
Release sequence (Jose, Nov 12, 2026): Development is the acceptance release. This patch is UI only. It is not merged, not pushed and not deployed. Promotion to main needs Jose's approval.

## What was built

All of it is presentation. No server module, route, rate limit, token rule or redirect check changed.

| Screen | Route | Who reaches it | What changed |
| --- | --- | --- | --- |
| Activate account | `/activate#proof=…` (public) | Anyone with an invitation link. "Activate account" under the sign-in card. | A steps line ("Step 2 of 3 · Create your password"). Under the passwords: what the password is for, what Employee ID is and where to get it, and where a passkey is added (only when passkeys are on). One field error style. An offline try sends nothing and keeps the invitation. Expired, used or already active link: why, and the one next step. Result not confirmed: its own amber screen, sign in first. Finish: "You're set", the ID, "Continue to sign in", and the ID arrives in the sign-in form. A line when someone else is signed in on the device. |
| Forgot password | `/forgot-access` (public) | "Forgot password?" under the sign-in card. | The steps line. "What happens" in three numbered lines before the form. After the request: "We asked for a recovery email to be sent", that the page cannot tell whether it was sent or arrived, how long the link lasts, what to do if nothing comes, and how often you can ask. A next step under every refusal. Offline is amber and sends nothing. |
| New password | `/reset-access` (public) | The recovery link, "I have a recovery code", or a temporary password at sign-in. | The steps line. Each refusal says what to do next. A lost reply and a 503 are amber ("not confirmed"), never red and never "done". Two passwords that differ use the field error style. The finish has a done mark and says the time clock PIN did not change. |
| Sign in | `/login` (public) | Everyone. | Under the passkey button: "Sign in with your face, fingerprint or screen lock. Nothing to remember." A closed prompt is a calm status. A passkey the server no longer knows: what happened, the password still works, and "Forgot password?". "This device can't use a passkey" in the button's place when the browser has no WebAuthn. Field errors in the one style. |
| Help someone sign in | `/app/account-recovery` (signed in) | Owner and Manager, from Team and from an employee's page (unchanged). | Before: a "How this works" card (three steps, 15 minutes, who cannot be helped this way). With a code: one card with the code, "Copy code", and "Hand it over": You, They, Time. Offline is its own notice. |
| Delete account | `/app/account/delete` (signed in) | Every role from Profile (unchanged). The new card can only appear for an Owner. | When the server answers `LAST_OWNER`: the "You're the only Owner" card replaces the form. Nothing else about the form changed. |
| Passkeys in Profile | `/app/profile#profile-passkeys` (signed in) | Owner and Manager, when passkeys are on. | The plain explanation, "your face or fingerprint stays on your device", "This device can't use a passkey" with what still works, "No passkey was added" after a closed prompt (information tone, not an error), "Passkey added" after success, and that removing does not sign you out. |
| Support reference | no route of its own | Shown inside the error states above. | The block is built and mounted. It renders nothing today because the reader always answers null. One line switches it on (see "For Codex"). |

New files: `src/components/access-recovery/` (`copy.ts`, `access-steps.tsx`, `support-reference.tsx`, `support-reference-seam.ts`, `last-owner-card.tsx`, `recovery-guidance.ts`, `access-recovery.css`, tests). Sign-in look styles are in `src/components/auth-premium/auth-b.css` (one rule edited in place, one new section at the end). No navigation entry was added. No new route, so no new entry in `b-loading.tsx`. `b-kit.tsx` was not changed. The last-Owner card uses the kit's `BState` and `BButtonLink`.

Passkeys are offered in this build behind `NEXT_PUBLIC_NEVORA_PASSKEYS=on` (`src/lib/passkeys/client.ts`, `src/lib/auth/passkeys/config.ts`). With the flag off nothing about passkeys renders, as before.

Mobile access (`NEVORA_MOBILE_ACCESS_ENABLED`) is off by default. With it on, phones use the separate views in `src/components/mobile-access/`. Those views were not changed. See "Not verified".

## Contract coverage

Contract: `docs/handoffs/2026-11-16-backend-phase4-claude-contract.md` (B10, B11, "Personal deletion and workplace closure").

| Requirement | Status | Endpoint or module used |
| --- | --- | --- |
| 1. Activation journey, each step says where you are and what comes next | done | `POST /api/auth/activate` (unchanged call), `src/app/activate/activation-invitation.tsx` |
| 1. Whose account, what is being set, what Employee ID is and where to find it | done. "Whose account" is the workspace name. The server does not tell the page the person's name before activation, so none is shown. | `getPublicWorkspaceName()` |
| 1. A passkey "if offered" | done. Activation itself offers no passkey. With passkeys on, the form says one can be added in Profile after sign-in. | `passkeysFlagOn()` |
| 1. Finish "You're set" with the ID carried into sign-in | done | existing `useAccessJourney().confirm` hand-off; checked in the browser (`carriedId`) |
| 1. Link opened twice, expired link, link for someone already active | done. The server answers `invalid` (400) for all three and does not say which, so one screen covers them: works once, lasts 7 days, sign in if you already activated, else ask for a new invitation. | `POST /api/auth/activate` |
| 1. Wrong account signed in | done as guidance: a line on the form and on the finish says who is signed in on the device and that signing in will replace them here. | `getSession()` read in `src/app/activate/page.tsx` (never throws; no line when it fails) |
| 1. Weak or mismatched password in the one error style | done. 16px bold warning glyph, red 13.5/18, no closing period. Measured in the browser. Applies to every field message on sign-in, recovery, reset and activation. | `auth-validation.tsx` (`FieldInvalid`, new `FieldError`), `AUTH_COPY.invalid` |
| 1. Offline | done. Nothing is sent, the invitation is kept in memory, the alert is amber and takes focus. | client check of `navigator.onLine` before the unchanged fetch |
| 2. Forgot password: say what will happen before they start | done | `recovery-request.tsx` |
| 2. "Check your email" honestly, what if nothing comes, when to ask again | done. "When to ask again" comes from the code, not the contract: see "For Codex" 2. | `POST /api/auth/recovery` (202 `accepted`) |
| 2. Reset form and finish | done | `POST /api/auth/reset-access` |
| 2. Every refusal and rate-limit state with a next step | done for `invalid` (400), `unavailable` (503), a lost reply, 401/403, mismatch, offline. The request route answers 202 even when the per-account limit is reached, so there is no rate-limit state to show there; the "ask again" sentence covers it. The reset limit answers through the same `invalid`/`unavailable` states. | `recovery-guidance.ts` maps AccountRecovery's outcome to the typed state |
| 2. Assisted path: what the helper does, what the other person does, how long the code lasts | done | `POST /api/manager/account-recovery` (unchanged call), `assisted-recovery.tsx` |
| 3. Passkey explanation, support detection, creation success, cancelled prompt, a passkey that no longer works, how to get back in | done on sign-in and in the Owner and Manager Profile. The Employee and Lead passkey page (`src/components/employee-mobile/passkeys.tsx`) already had its own explanation, unsupported, cancelled and success states and was left as it is. | `signInWithPasskey`, `registerPasskey` (unchanged) |
| 3. Do not change WebAuthn calls or verification | kept. `src/lib/passkeys/client.ts` and `management.ts` are untouched. | |
| 4. `LAST_OWNER`: calm state card, why, two real paths, nothing deleted, still signed in | done. Checked against the real server answer. | `requestAccountDeletion` action (unchanged), `last-owner-card.tsx` |
| 4. Preserve deletion-status recovery and separate `DEL-…` reference; unknown result never files a second request | kept. The form's `retry` flag, password-proven check and receipt are untouched. Unit tests pin them beside the new card. | `account-deletion-form.tsx` |
| 5. Support reference block, renders nothing without a reference, bound to one failed response | done, switched off. | `support-reference.tsx`, `support-reference-seam.ts` |
| 5. Mount points in the error states of items 1 to 4 behind one seam | done for activation (unavailable, not confirmed), forgot password (refusals), reset (refusals), assisted recovery (refusals), deletion (failure block and last-Owner card). Passkey errors have no mount: the response is consumed inside `src/lib/passkeys/client.ts`, which I did not change. Deletion is a server action with no response headers: see "For Codex" 3. | |
| 5. Unit test for the block; the exact one-line change | done | `access-recovery.test.tsx`; "For Codex" 1 |
| 6. Unit tests for every new state in both languages; auth tests kept | done. No existing assertion was changed or removed. | |
| Codex acceptance: refusal creates no deletion request and ends no session | confirmed on the real local server: `account_deletion_requests` 0 before and 0 after, the Owner's session rows 2 before and 2 after, `/app` still opens, and the form is back after a reload. | |
| Codex acceptance: EN/ES, keyboard/focus, supported device states | done for the public pages in the browser in both languages. The signed-in card is English on screen and Spanish by unit test (the signed-in app has no stored language yet). | |

## States

"Real" means the real app on the owned local Postgres with fictional data answered. "Forced" means the request was intercepted in the page (`page.route`) or the browser API was stubbed. "Unit" means unit test only. Each browser state was captured at 390 and 1440, in English and Spanish for the public pages. Files are in `e-evidence/` (30 chosen) and `e-evidence/full/` (all of them).

| Screen | State | How produced | Evidence |
| --- | --- | --- | --- |
| Activate | No link | Real | `activate-no-link-*` |
| Activate | Opening | Unit (it lasts a frame) | none |
| Activate | Create password (step 2) | Real: a fictional invited person and a live invitation row in the local database, link opened | `activate-create-password-*` (also 900 and 320) |
| Activate | Weak password | Real (form refuses before sending) | `activate-weak-password-*` |
| Activate | Passwords differ | Real (form refuses before sending) | `activate-passwords-differ-*` |
| Activate | Offline | Real page, browser set offline | `activate-offline-*` |
| Activate | Unavailable (503) | Forced | `activate-unavailable-*` |
| Activate | Result not confirmed | Forced (connection reset) | `activate-not-confirmed-*` |
| Activate | Link used twice | Real: same link submitted again, server answered 400 | `activate-link-used-*` |
| Activate | Link expired | Real: an invitation row that expired a day ago, server answered 400 | `activate-link-expired-*` |
| Activate | Link for someone already active | Same server answer and same screen as "used twice". Not captured separately. | `activate-link-used-*` |
| Activate | Link unreadable | Real (shape check in the browser) | `activate-link-unreadable-*` |
| Activate | Someone else signed in | Real: opened in the Owner's signed-in browser | `activate-someone-else-signed-in-*` |
| Activate | Done ("You're set") | Real: server answered 200 | `activate-done-*` |
| Activate | Done while someone else is signed in, then sign in | Real: in the Owner's browser the finish showed the line; after sign-in Profile was the new person's (the Owner was replaced on that device) | `activate-done-someone-else-signed-in-1440` |
| Activate | ID carried to sign-in, then signed in | Real: sign-in with the new password landed on `/app` | `activate-sign-in-id-carried-*`, `activate-signed-in-*` |
| Forgot password | Before you start | Real | `forgot-before-you-start-*` |
| Forgot password | Field errors | Real | `forgot-field-error-*` |
| Forgot password | Offline | Real page, browser offline | `forgot-offline-*` |
| Forgot password | Refused (non-202) | Forced (500) | `forgot-not-confirmed-*` |
| Forgot password | Unavailable (no reply) | Forced (connection reset) | `forgot-unavailable-*` |
| Forgot password | Check your email | Real: server answered 202. No email exists in this setup: mail delivery is off in the owned app and the ID was fictional. | `forgot-check-your-email-*` |
| New password | Form | Real | `reset-new-password-*` |
| New password | Field errors, passwords differ | Real | `reset-field-error-*`, `reset-passwords-differ-*` |
| New password | Code not valid | Real: a made-up code, server answered 400 | `reset-code-not-valid-*` |
| New password | Reply lost (not confirmed) | Forced (connection reset) | `reset-not-confirmed-*` |
| New password | Unavailable (503) | Forced | `reset-unavailable-*` |
| New password | Offline | Real page, browser offline | `reset-offline-*` |
| New password | Done | Real: a code issued by the Owner on `/app/account-recovery` (one per width, for two different fictional employees), opened as a link, server answered 200. English only. Spanish by unit test. | `reset-done-390`, `reset-done-1440` |
| Sign in | Passkey offered, field errors, refused sign-in | Real | `signin-passkey-offered-*`, `signin-field-error-*`, `signin-refused-*` |
| Sign in | Passkey prompt closed | Forced: `navigator.credentials.get` rejects as a closed prompt | `signin-passkey-cancelled-*` |
| Sign in | Passkey not accepted (removed, or none for NEVORA on the device) | Forced: verify answers `not_found`. Also seen for real: the owned app refuses passkey options (403 `not_found`, its passkey origin does not match its random port) and the same note showed. | `signin-passkey-not-accepted-*` |
| Sign in | Device can't use a passkey | Forced: `PublicKeyCredential` removed | `signin-passkey-unsupported-*` |
| Sign in | Passkey rate limit, unavailable, account disabled | Unit | none |
| Help someone sign in | Before, field error | Real | `assist-before-*`, `assist-field-error-*` |
| Help someone sign in | Offline | Real page, browser offline | `assist-offline-*` |
| Help someone sign in | Code ready, handover | Real: server answered 200 | `assist-handover-*` |
| Help someone sign in | Refusal with a reference | Unit | none |
| Delete account | Form ready | Real | `delete-ready-*` |
| Delete account | Last Owner | Real: the only Owner confirmed with the right password and the server refused | `delete-last-owner-*` |
| Delete account | Wrong password (unchanged) | Real | `delete-wrong-password-1440` |
| Delete account | Received, duplicate, unknown, plain unavailable (unchanged) | Unit | none |
| Profile passkeys | Explained, none saved | Real | `profile-passkeys-explained-*` |
| Profile passkeys | Device can't use a passkey | Forced | `profile-passkey-unsupported-*` |
| Profile passkeys | Prompt closed ("No passkey was added") | Forced: the options reply and a prompt that closes. The real options call is refused in the owned app (403), which shows "Couldn't add a passkey. Nothing changed. Try again" instead. | `profile-passkey-cancelled-*` |
| Profile passkeys | Added, with a saved passkey | Unit | none |
| Support reference | Nothing shown today | Real and forced: the forced 503 carried an `X-Nevora-Request-Id` header and no block appeared | `activate-unavailable-*` |
| Support reference | Block with a reference, then copied | Preview only. Captured on a temporary commit where the seam read the header itself (one line, reverted; not in the patch), with a forced 503 that carried `X-Nevora-Request-Id`. Copy put the reference on the clipboard, the status said "Support reference copied", and the next failed try without a header removed the block. | `support-reference-preview-*`, `support-reference-preview-copied-*` |

Which build each file came from: `activate-*`, `forgot-*` (except `forgot-reduced-motion-*`), the 900 and 320 sign-in shots and `owner-account-*` are from the build one commit before the last wording and style changes; nothing on those screens changed after. Everything else (`signin-*`, `profile-*`, `assist-*`, `reset-*`, `delete-*`, `forgot-reduced-motion-*`, `support-reference-preview-*`, `activate-done-someone-else-*`) is from the last capture, whose build differs from the patch by one line: the seam read the header for the preview. That line only affects a failed reply that carries `X-Nevora-Request-Id`, and only the preview step sent one.

Capture notes: full-page phone screenshots of signed-in pages draw the fixed tab bar in the middle of a long page. That is the capture, not the page.

## Keyboard and focus

Walked in the capture tool (Chromium, real app) with Tab, Enter and Space. Tab order as recorded:

- **Sign in (1440):** Language, Employee ID, Password, Show password, Sign in, Sign in with a passkey, Forgot password?, Activate account.
- **Activate, create password (1440):** Sign in (back), Language, Create password, Show passwords, Confirm password, Activate account, Already activated? Sign in.
- **Activate, done:** the result card takes focus when it appears. Then Employee ID (read only, selects itself), Copy Employee ID, Continue to sign in.
- **Help someone sign in, code ready:** the "Recovery code ready" line takes focus. Then the code, Select, Copy code, See the page they will use, Prepare another code.
- **Last-Owner card:** the card takes focus when it appears. Then Go to Team, Email support, Keep my account.

Where focus goes after a step or an error (recorded from `document.activeElement`):

| Moment | Focus lands on |
| --- | --- |
| Sign in, empty submit | Employee ID (first field with an error) |
| Sign in, after a refused sign-in or after activation | Password, with the Employee ID kept |
| Activate, weak password | Create password |
| Activate, passwords differ | Confirm password, with the error under it |
| Activate, offline | The offline alert |
| Activate, done | The result card ("You're set") |
| Forgot password, empty submit | Employee ID |
| Forgot password, offline or refused | The alert |
| Forgot password, check your email | The receipt. Next Tab: Back to sign in |
| New password, empty submit | Recovery code |
| New password, any refusal | The refusal block |
| New password, done | The receipt. Next Tab: Sign in with new password |
| Help someone sign in, empty submit | Employee ID |
| Help someone sign in, code ready | The "Recovery code ready" line |
| Delete account, last Owner | The card (`role="status"`, named by its title) |
| Delete account, wrong password (unchanged) | Password |

Visible focus: fields show the 2px teal ring; buttons and links show a 2px teal outline (computed style recorded for each stop). Screenshots: `activate-focus-first-field-*`, `signin-focus-first-field-*`, `activate-passwords-differ-*` (focus on the error field), `activate-done-focus-*`, `delete-last-owner-focus-*`, `assist-handover-focus-*`, `forgot-check-your-email-focus-*`.

Targets: every new control is 44px tall or has a 44px hit area (the probe found none under 40px except three that were already there: the "Team" and "Profile" back links at 32px in the shell and the "Select" button at 32 to 38px on the recovery code).

Reduced motion: every capture context ran with `prefers-reduced-motion: reduce`. On `/forgot-access` no element had a running transition or animation in that mode. With motion allowed, four elements have one (the three buttons' press scale at 0.16s and the caret at 0.15s), all existing. I added no motion. Screenshot: `forgot-reduced-motion-help-open-1440`.

Text size: at 200% root font size on a 390px phone, activation and forgot password had no horizontal overflow (`activate-create-password-text-200-390`, `forgot-before-you-start-text-200-390`). 320px: sign in, forgot password and activation captured in both languages, no overflow.

Not done: no screen reader was run. Live regions and roles are checked in unit tests only.

## English and Spanish

- **Public pages (sign in, activate, forgot password, new password): both languages render from the existing source** (`readAuthLang`: the `nv-lang` cookie, then the browser's language, then English). Screenshots in both.
- **Signed-in screens (help someone sign in, delete account, Profile passkeys): English on screen.** The signed-in app has no stored language per person yet. The new parts take a `lang` prop that defaults to `en`. Their Spanish is proven by unit tests that render the states in Spanish and check that no English sentence of these parts leaks (`recovery-u11.test.tsx`, `account-deletion-u11.test.tsx`, `passkey-u11.test.tsx`, `access-recovery.test.tsx`).
- All new strings are in one typed module, `src/components/access-recovery/copy.ts` (`ACCESS_COPY.en` / `.es`). A test checks every English key has a Spanish entry that is not empty and not the English text.
- Existing sentences were reused where they existed (`AUTH_COPY`). Eight existing field messages lost their closing period in both languages. Nothing else in `AUTH_COPY` changed.
- One known mix, already there: `AccountRecovery` names its outcomes with English sentences and `authMessage` translates the known ones. I did not change that mechanism. The new next-step lines are keyed to the typed state instead.

## Copy

No payroll sentence was added. The only mention of payroll is "payroll records" in the last-Owner card ("…so someone can manage the team, the schedule and payroll records"). It says nothing about paying anyone or filing anything.

Every new sentence, from `src/components/access-recovery/copy.ts`:

| Key | English | Spanish |
| --- | --- | --- |
| `steps.of` | Step {n} of {total} | Paso {n} de {total} |
| `steps.label` | Your progress | Tu progreso |
| `steps.activation[1]` | Open your invitation | Abre tu invitación |
| `steps.activation[2]` | Create your password | Crea tu contraseña |
| `steps.activation[3]` | Sign in | Inicia sesión |
| `steps.recovery[1]` | Ask for a link | Pide un enlace |
| `steps.recovery[2]` | Check your email | Revisa tu correo |
| `steps.recovery[3]` | Choose a new password | Elige una contraseña nueva |
| `activation.factsLabel` | What you are setting up | Lo que estás configurando |
| `activation.passwordFact` | This password is for NEVORA on the web and in the app. Your time clock PIN stays the same | Esta contraseña es para NEVORA en la web y en la aplicación. Tu PIN del reloj de asistencia sigue igual |
| `activation.idFact` | Your Employee ID is what you type to sign in. We show it next, and your Owner or manager can tell you | Tu ID de empleado es lo que escribes para iniciar sesión. Te lo mostramos enseguida, y tu gerente o el dueño te lo puede decir |
| `activation.passkeyFact` | After you sign in, you can add a passkey in Profile | Después de iniciar sesión puedes agregar una llave de acceso en tu perfil |
| `activation.doneTitle` | You’re set | Todo listo |
| `activation.doneSub` | Sign in with your Employee ID and your new password. | Inicia sesión con tu ID de empleado y tu contraseña nueva. |
| `activation.doneNext` | Next: sign in. Your Employee ID is already filled in for you. | Ahora: inicia sesión. Tu ID de empleado ya está escrito. |
| `activation.mismatch` | Enter the same password in both fields | Escribe la misma contraseña en ambos campos |
| `activation.offline` | You’re offline. Nothing was sent. Reconnect, then choose Activate account | No tienes conexión. No se envió nada. Vuelve a conectarte y elige Activar cuenta |
| `activation.invalidWhy` | An invitation link works once and lasts 7 days. | Un enlace de invitación funciona una sola vez y dura 7 días. |
| `activation.invalidActive` | If you already activated, sign in with your Employee ID. | Si ya activaste tu cuenta, inicia sesión con tu ID de empleado. |
| `activation.missingHow` | The link is in the email your workplace sent you. Open it on this device. | El enlace está en el correo que te envió tu lugar de trabajo. Ábrelo en este dispositivo. |
| `activation.unknownTitle` | Activation not confirmed yet | Tu activación aún no está confirmada |
| `activation.unknownFirst` | Try signing in first. If your Employee ID and new password work, you’re done. | Primero intenta iniciar sesión. Si tu ID de empleado y tu contraseña nueva funcionan, ya terminaste. |
| `activation.otherSession` | {name} is signed in to NEVORA on this device. Signing in as you will sign them out here. | {name} tiene una sesión de NEVORA abierta en este dispositivo. Al iniciar sesión con tu cuenta, se cerrará la suya aquí. |
| `activation.otherSessionUnnamed` | Someone else is signed in to NEVORA on this device. Signing in as you will sign them out here. | Otra persona tiene una sesión de NEVORA abierta en este dispositivo. Al iniciar sesión con tu cuenta, se cerrará la suya aquí. |
| `recovery.beforeLabel` | What happens | Qué va a pasar |
| `recovery.before[1]` | Enter your Employee ID and the email on your account. | Escribe tu ID de empleado y el correo de tu cuenta. |
| `recovery.before[2]` | If they match, we email a link that works once for 15 minutes. | Si coinciden, te enviamos un enlace que funciona una sola vez durante 15 minutos. |
| `recovery.before[3]` | Open the link and choose a new password. You are signed out everywhere, then you sign in again. | Abre el enlace y elige una contraseña nueva. Se cierra tu sesión en todos los dispositivos y vuelves a iniciar sesión. |
| `recovery.requestedSub` | We asked for a recovery email to be sent. | Pedimos que se envíe un correo de recuperación. |
| `recovery.notConfirmed` | This page can’t tell you whether the email was sent or has arrived. | Esta página no puede decirte si el correo se envió o ya llegó. |
| `recovery.askAgain` | You can ask up to 3 times in 15 minutes. After that, wait 15 minutes before you ask again. | Puedes pedirlo hasta 3 veces en 15 minutos. Después, espera 15 minutos antes de pedirlo otra vez. |
| `recovery.offline` | You’re offline. Nothing was sent. Reconnect, then try again | No tienes conexión. No se envió nada. Vuelve a conectarte e inténtalo de nuevo |
| `recovery.next.requestFailed` | Your password has not changed. If this keeps happening, ask your manager or Owner for a recovery code. | Tu contraseña no ha cambiado. Si esto sigue pasando, pide un código de recuperación a tu gerente o al dueño. |
| `recovery.next.requestUnavailable` | Your password has not changed. Check your connection before you try again. | Tu contraseña no ha cambiado. Revisa tu conexión antes de intentarlo de nuevo. |
| `recovery.next.mismatch` | Type the same new password in both fields, then choose Reset password. | Escribe la misma contraseña nueva en ambos campos y elige Restablecer contraseña. |
| `recovery.next.invalidCode` | A code works once and lasts 15 minutes. | Un código funciona una sola vez y dura 15 minutos. |
| `recovery.next.resetUnavailable` | The reset was not confirmed. Wait a few minutes, then try signing in with the new password. If that does not work, use the code again or ask for a new one. | El restablecimiento no se confirmó. Espera unos minutos e intenta iniciar sesión con la contraseña nueva. Si no funciona, usa el código otra vez o pide uno nuevo. |
| `recovery.next.ended` | Go back to sign in and start again. | Vuelve a iniciar sesión y empieza de nuevo. |
| `recovery.doneNote` | Your time clock PIN did not change. | Tu PIN del reloj de asistencia no cambió. |
| `assisted.howLabel` | How this works | Cómo funciona |
| `assisted.how[1]` | You check who they are, using details you already have. | Confirmas quién es la persona con datos que ya tienes. |
| `assisted.how[2]` | You get a one-time code and give it to them privately. | Recibes un código de un solo uso y se lo das en privado. |
| `assisted.how[3]` | They enter the code on the sign-in page and choose a new password. | La persona escribe el código en la página de inicio de sesión y elige una contraseña nueva. |
| `assisted.lasts` | The code works once and lasts 15 minutes. | El código funciona una sola vez y dura 15 minutos. |
| `assisted.limits` | You can’t do this for yourself. A Manager can’t do it for an Owner; another Owner must. | No puedes hacerlo para tu propia cuenta. Un gerente no puede hacerlo para un dueño; tiene que hacerlo otro dueño. |
| `assisted.handoverLabel` | Hand it over | Entrega el código |
| `assisted.you` | You | Tú |
| `assisted.youDo` | Give {id} this code in person or on a call. Do not post it in a group chat or email it. | Dale este código a {id} en persona o por llamada. No lo publiques en un chat de grupo ni lo envíes por correo. |
| `assisted.they` | They | La otra persona |
| `assisted.theyDo` | On the sign-in page they choose Forgot password?, then I have a recovery code, paste it and choose a new password. | En la página de inicio de sesión elige ¿Olvidaste tu contraseña?, luego Tengo un código de recuperación, lo pega y elige una contraseña nueva. |
| `assisted.time` | Time | Tiempo |
| `assisted.timeDo` | Works once, until {time}. After that, verify them again and get a new code. | Funciona una sola vez, hasta las {time}. Después, verifica a la persona otra vez y pide un código nuevo. |
| `assisted.after` | Their old password stops working when they finish. They are signed out everywhere and sign in again. Their time clock PIN does not change. | Su contraseña anterior deja de funcionar cuando termine. Se cierra su sesión en todos los dispositivos y vuelve a iniciar sesión. Su PIN del reloj de asistencia no cambia. |
| `assisted.copy` | Copy code | Copiar código |
| `assisted.copied` | Code copied | Código copiado |
| `assisted.copyFailed` | Couldn’t copy. Select the code instead | No se pudo copiar. Selecciona el código |
| `assisted.seePage` | See the page they will use | Ver la página que va a usar |
| `assisted.offlineTitle` | You’re offline | No tienes conexión |
| `assisted.offline` | Nothing was sent and no code was made. Reconnect, then try again. | No se envió nada y no se creó ningún código. Vuelve a conectarte e inténtalo de nuevo. |
| `passkey.what` | Sign in with your face, fingerprint or screen lock. Nothing to remember. | Inicia sesión con tu rostro, tu huella o el bloqueo de pantalla. Nada que recordar. |
| `passkey.private` | Your face or fingerprint stays on your device. NEVORA never receives it. | Tu rostro o tu huella se quedan en tu dispositivo. NEVORA nunca los recibe. |
| `passkey.unsupported` | This device can’t use a passkey | Este dispositivo no puede usar una llave de acceso |
| `passkey.unsupportedNext` | Sign in with your password. You can add a passkey later from a phone or computer with a screen lock. | Inicia sesión con tu contraseña. Más adelante puedes agregar una llave de acceso desde un teléfono o una computadora con bloqueo de pantalla. |
| `passkey.unsupportedManage` | You can still remove saved passkeys here. To add one, use a phone or computer with a screen lock. | Aquí todavía puedes quitar las llaves de acceso guardadas. Para agregar una, usa un teléfono o una computadora con bloqueo de pantalla. |
| `passkey.cancelledSignIn` | Passkey sign-in was cancelled. Nothing changed | Se canceló el inicio de sesión con llave de acceso. No cambió nada |
| `passkey.cancelledAdd` | No passkey was added | No se agregó ninguna llave de acceso |
| `passkey.added` | Passkey added. You can use it the next time you sign in. | Llave de acceso agregada. Puedes usarla la próxima vez que inicies sesión. |
| `passkey.addFailed` | Couldn’t add a passkey. Nothing changed. Try again | No pudimos agregar una llave de acceso. No cambió nada. Inténtalo de nuevo |
| `passkey.stale` | We couldn’t sign you in with a passkey | No pudimos iniciar tu sesión con una llave de acceso |
| `passkey.staleNext` | This device may not have a passkey for NEVORA, or the one it has may have been removed from your account. Sign in with your password, then add a passkey in Profile. | Puede que este dispositivo no tenga una llave de acceso de NEVORA, o que la que tiene se haya quitado de tu cuenta. Inicia sesión con tu contraseña y luego agrega una llave de acceso en tu perfil. |
| `passkey.back` | Getting back in without it | Cómo entrar sin ella |
| `passkey.backBody` | Your password still works. If you forgot it, choose Forgot password? to get a recovery link. | Tu contraseña sigue funcionando. Si la olvidaste, elige ¿Olvidaste tu contraseña? para recibir un enlace de recuperación. |
| `passkey.usePassword` | Use your password | Usa tu contraseña |
| `passkey.forgot` | Forgot password? | ¿Olvidaste tu contraseña? |
| `passkey.removeKeeps` | Removing a passkey does not sign you out. Your password still works. | Quitar una llave de acceso no cierra tu sesión. Tu contraseña sigue funcionando. |
| `lastOwner.title` | You’re the only Owner | Eres el único dueño |
| `lastOwner.why` | A workplace needs at least one Owner who can sign in, so someone can manage the team, the schedule and payroll records. | Un lugar de trabajo necesita al menos un dueño que pueda iniciar sesión, para que alguien administre el equipo, el horario y los registros de nómina. |
| `lastOwner.nothing` | Nothing was deleted. No request was created and you are still signed in. | No se eliminó nada. No se creó ninguna solicitud y tu sesión sigue abierta. |
| `lastOwner.pathsLabel` | What you can do | Lo que puedes hacer |
| `lastOwner.addTitle` | Add or activate another Owner first | Primero agrega o activa a otro dueño |
| `lastOwner.addBody` | They must finish activating their account and be able to sign in. Then come back here and confirm your deletion again with your password. | Esa persona tiene que terminar de activar su cuenta y poder iniciar sesión. Luego vuelve aquí y confirma tu eliminación otra vez con tu contraseña. |
| `lastOwner.addAction` | Go to Team | Ir a Equipo |
| `lastOwner.closeTitle` | Closing the company instead? | ¿Prefieres cerrar la empresa? |
| `lastOwner.closeBody` | That is a separate request. Email support and we will walk you through it. Writing to us does not close the company or cancel billing by itself. | Esa es una solicitud aparte. Escribe a soporte y te guiamos. Escribirnos no cierra la empresa ni cancela la facturación por sí solo. |
| `lastOwner.closeAction` | Email support | Escribir a soporte |
| `lastOwner.closeSubject` | Close our NEVORA workplace | Cerrar nuestro lugar de trabajo en NEVORA |
| `lastOwner.keep` | Keep my account | Conservar mi cuenta |
| `supportRef.label` | Support reference | Referencia de soporte |
| `supportRef.hint` | Share this with support so they can find what happened. It is not a password. | Compártela con soporte para que encuentren lo que pasó. No es una contraseña. |
| `supportRef.copy` | Copy | Copiar |
| `supportRef.copied` | Copied | Copiado |
| `supportRef.copiedStatus` | Support reference copied | Referencia de soporte copiada |
| `supportRef.failed` | Couldn’t copy. Select the reference instead | No se pudo copiar. Selecciona la referencia |

Existing sentences that changed (closing period removed, nothing else), `AUTH_COPY.invalid` in `src/lib/auth-copy.ts`:

| English | Spanish |
| --- | --- |
| Enter your Employee ID | Escribe tu ID de empleado |
| Enter your password | Escribe tu contraseña |
| Enter your recovery email | Escribe tu correo de recuperación |
| Enter an email address like name@example.com | Escribe un correo como nombre@ejemplo.com |
| Paste your recovery code | Pega tu código de recuperación |
| Paste the complete recovery code | Pega el código de recuperación completo |
| Create a password of at least 8 characters | Crea una contraseña de al menos 8 caracteres |
| Type the password again | Vuelve a escribir la contraseña |

Existing sentences no longer shown on the default pages (still in `AUTH_COPY`, still used by the mobile access views): "Account activated" as the finish title (now screen-reader text only), "Activation could not be confirmed." (the not-confirmed screen has its own title), "Enter the same password in both fields." with a period (the new line has none), and on the Owner and Manager Profile "Sign in with Face ID or your device's passkey instead of typing your password.", "Face ID is set up.", "Couldn't set up Face ID. Try again." and "This browser can't use passkeys. Try Safari or Chrome on this device." (replaced by the passkey lines above, which do not say Face ID on a computer).

A copy test enforces the rules on every new string in both languages: no exclamation marks, no em dashes, none of "simply", "just", "seamlessly", "successfully", "Oops", no system words, and no closing period on a field or inline line.

## Checks run

All from the worktree `wt/p4e`, final temporary commit `f0db73a1` (never pushed). The patch equals `git diff c30f530e f0db73a1` without the capture tool, and applies cleanly to a fresh copy of `c30f530e` (`git apply --check`).

| Check | Command | Result |
| --- | --- | --- |
| Types | `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` | 0 errors in `src` |
| Lint | `npx eslint` on the 25 changed `.ts`/`.tsx` files | clean |
| New unit tests | `access-recovery.test.tsx`, `activation-u11.test.tsx`, `recovery-u11.test.tsx`, `passkey-u11.test.tsx`, `account-deletion-u11.test.tsx` | pass, both languages |
| Nearby existing tests | activation, login actions, recovery, assisted recovery, mobile access, auth copy, passkey client and management, deletion actions and views, manager profile, legal pages, B viewport and layer tests, token and hex guards | 48 files, 550 tests pass. No existing assertion changed. |
| Whole suite | `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000` | 869 files pass, 24 skipped; 13,167 tests pass, 741 skipped; 0 failed |
| Browser | `cap.sh` with my own flow (`zz-scan/u11.ts`, not in the patch), role `owner`, passkeys flag on, owned local Postgres, fictional data | last full run: 55 steps ok, 0 failed, 0 page errors, horizontal overflow 0 on every shot; last partial run: 35 steps ok, 0 failed |

Real server answers recorded in the browser runs: activate 200 then 400 on the second use of the same link; expired link 400; forgot password 202; reset with a made-up code 400; assisted recovery 200; reset with the issued code 200 (both widths); sign-in after activation lands on `/app`; last-Owner refusal with 0 deletion requests and 2 Owner sessions before and after.

Measured field error style in the browser: 13.5px/18px, `rgb(180, 35, 24)`, glyph 16 by 16, text "Enter the same password in both fields" and "Enter your Employee ID".

Frame: the last-Owner card is 560px wide, left edge 296, top 248 at 1440 (24px under the band at 224). The cap.sh frame probe ran on `/app/account-recovery` and `/app/account/delete` at 1440, 900, 390 and 320 with overflow 0.

No email, SMS or push was sent. Mail delivery is off in the owned app. No paid model or provider was called. The main checkout was not touched.

## Not verified

- No screen reader run. Roles and live regions are unit-tested only.
- No real passkey ceremony. There is no authenticator in the capture browser, and the owned app refuses the passkey option calls (403) because its configured passkey origin does not match its random port. Prompt-closed and not-accepted states were forced. Passkey creation success in Profile is unit-tested only.
- The Support reference block has never been shown by the real reader: the module is not in this checkout. The preview used a one-line local reader on a temporary commit.
- Mobile access views (`NEVORA_MOBILE_ACCESS_ENABLED=true`) were not changed and not captured. With that flag on, phones do not get the steps line, the facts, the offline states or the Support reference mounts. Desktop and tablet do. The phone views do get the new field error style, because they use the same `FieldInvalid` line; that was not looked at in a browser.
- The Employee and Lead passkey page and their deletion view were not changed or re-captured.
- Manager: `/app/account-recovery` was captured as an Owner only. The new guidance does not depend on role, except that the "Reset a Clocker PIN" row stays Owner only as before.
- Deletion outcomes other than last Owner and wrong password (received, duplicate, unknown, busy, signed out, different account) were not re-captured; they are unchanged and unit-tested beside the new card.
- A real "already active" invitation link was not captured separately (same server answer and screen as a used link).
- The last-Owner card and "Help someone sign in" were not captured in Spanish (the signed-in app renders English). Spanish is unit-tested.
- Text at 200% was checked for overflow on activation and forgot password at 390 only.
- The owned app ran in development mode, not a production build.
- `DESIGN.MD` was not updated (shared file). Suggested entry: the access screens carry a steps line, the one field error style now applies to the sign-in pages, and "not confirmed" on those pages is amber.

## For Codex

1. **Switch the Support reference on (one line).** When `src/lib/support-reference.ts` is in Development, in `src/components/access-recovery/support-reference-seam.ts` replace
   `export const readSupportReference: SupportReferenceReader = () => null;`
   with
   `export { readSupportReference } from "@/lib/support-reference";`
   The signature already matches yours (`(response: Pick<Response, "headers">) => string | null`, read from your worktree). Nothing else changes. One test then needs its expectation flipped: "the seam answers null today" in `access-recovery.test.tsx`. The callers pass only failed responses (`supportReferenceOf` ignores `response.ok`), clear the value on every new attempt, and the block validates the UUID again before showing it.
2. **Recovery request budget.** The UI says "You can ask up to 3 times in 15 minutes. After that, wait 15 minutes before you ask again." That comes from `issueStatement` in `src/lib/auth/recovery.server.ts` (per-account `attempts < 3` in a 900 second bucket), not from the contract. Please confirm it is safe to say and stable, or give the sentence you want. If the number may change, I will drop the number and keep "wait 15 minutes".
3. **Deletion has no place for a Support reference.** `requestAccountDeletion` is a server action, so the client never sees a response header. The form already reads an optional `supportReference` string from the returned state (`supportReferenceOfState`, validated as a UUID) and shows the block in the failure state and on the last-Owner card. To use it, add `supportReference?: string` to the `failed`/`unavailable` variants of `DeletionFormState` and fill it from your reader on the server. Until then nothing shows.
4. **Passkey errors have no mount.** `src/lib/passkeys/client.ts` (`call`) consumes the response and returns only an error code. If passkey routes get diagnostics, return the reference beside the code (for example `{ ok: false, error, reference }`) and I will mount the block under the passkey note.
5. **Reset 503.** `POST /api/auth/reset-access` answers `unavailable` (503) from a catch-all. The UI treats it as "not confirmed" (amber) and never says the password was not changed, because a failure after COMMIT could land there. If 503 is always before commit, tell me and the sentence can say "Your password was not changed".
6. **Activation `invalid` covers three cases.** Used twice, expired and already active all answer `invalid` (400), as the contract says. The screen covers all three with one message. No change asked.
7. **`AccountRecovery` (client component) gained two small things:** an offline check before the unchanged fetch (nothing is sent when `navigator.onLine === false`), and a `reference` state read from the failed response through the seam. The request bodies, headers, timeouts, proof handling and the English outcome sentences are unchanged.
8. **Activation page reads the session** (`getSession()` in `src/app/activate/page.tsx`, wrapped so it can never throw) only to show "X is signed in on this device". It asks nothing about the invitation. Say if you would rather the public page not read it.

## For Jose to decide

1. The sentence about asking again ("up to 3 times in 15 minutes"). See "For Codex" 2.
2. The activation finish title changed from "Account activated" to "You're set", as in the brief. The screen-reader text still says "Account activated".
3. The line "Jose is signed in to NEVORA on this device. Signing in as you will sign them out here." It shows the first name of whoever is signed in on that device. Keep the name, or say "Someone else"?
4. Spanish wording throughout is a draft for your review (Puerto Rico register, as the existing sign-in pages). "Dueño" for Owner and "llave de acceso" for passkey follow the existing pages.
5. Field messages lost their closing period on sign-in, forgot password, reset and activation (the Phase 3 forms rule). The sentences in banners keep theirs.
6. On sign-in, when passkeys are on and the browser cannot use them, a grey note now takes the button's place. Before, nothing showed. Keep the note or go back to nothing?
7. The mobile access views (flag off today) do not have these additions yet. Build them when the flag is planned to go on?

## Needed from another package

None. The Employee and Lead passkey page and Profile belong to the Phase 4 Employee builders. I did not change them. If they want the same wording, the strings are in `ACCESS_COPY.passkey`.
