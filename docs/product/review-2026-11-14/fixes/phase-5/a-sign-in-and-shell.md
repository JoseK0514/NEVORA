# Phase 5, package A: the sign-in page and the shell every signed-out page shares

Patch: `a.patch` (base `ad814bad`, 15 files). Evidence: `a-evidence/` (30 pictures, plus `before/` and `reuse/`).
Worktree `wt/p5a`, temporary detached commits only. Nothing pushed, no branch, main checkout untouched.
Release sequence unchanged: verify on Development first, promote to main only after Jose approves.

## Findings

| ID | Status | What changed | Evidence |
|---|---|---|---|
| PB-010 | fixed (option A) | `/` goes to `/login` in one hop when the browser presents no session cookie. With a cookie it still goes to `/app`, which alone decides if the session is valid. The sign-in page now carries the front-door pieces: proof rows, "New here? Set up your account", Employee ID help. | `bare-domain-1440.png` (log: hops `/` then `/login`, at 4 widths, both languages) |
| PB-011 | fixed, with two wording changes for truth | No eyebrow. "Powered by VELANI LLC" is gone from the panel (the footer keeps the one © line). Three proof rows at the panel's foot. Phones and tablets have no panel, so Sign in shows the same rows under its links. I changed two of the finding's three sentences: see "For Jose to decide" 1 and 2. | `signin-empty-1440.png`, `signin-empty-1440-es.png`, `signin-empty-900.png` |
| PB-012 | fixed | Links: "Forgot password?" and "New here? Set up your account" / "¿Primera vez? Configura tu cuenta". Helper under Employee ID at every width, in both languages, tied to the field with `aria-describedby`. | `signin-empty-390.png`, `signin-empty-390-es.png` |
| PB-009 | fixed (the sign-in line only) | Spanish only: one grey line under the links, "Por ahora, la aplicación está en inglés después de iniciar sesión." The employee guide's language and app translation are not in this package. | `signin-empty-390-es.png`, `signin-empty-1440-es.png` |
| PB-005 | fixed (the look and the words); redirect untouched | Round 1's `/login?ended=1` note was already teal with the info icon. New words in both languages. "Pick up where you left off" shows only when a vetted return address is present; without one it says "Sign in to continue". | `signin-session-ended-390-es.png`, `signin-session-ended-1440.png` |
| PB-027 | fixed | No password placeholder. "e.g. 10482" / "p. ej., 10482" kept. | every sign-in picture |
| PB-030 | fixed, and a colour bug found | The finding's sentence, both languages, from the existing `error=busy` state. The note was rendering red with an hourglass (the red rule out-ranked the amber one). It is amber now. Passkey wording says "attempts" too. | `signin-too-many-attempts-390.png`, `signin-too-many-attempts-1440-es.png`; before: `before/signin-too-many-attempts-1440-es.png` |
| PB-031 | fixed (look only) | Centred "or", then an outlined 48px pill with Phosphor bold Fingerprint (computers) or ScanSmiley (phones). The button now lines up with Sign in on phones (it was 40px narrower). A refusal leads with the alert icon. The hand-drawn face glyph is gone. U11's words, states and tests are unchanged. | `signin-passkey-offered-1440.png`, `signin-passkey-offered-390-es.png`, `signin-passkey-refused-390-es.png`, `signin-passkey-cancelled-1440.png`, `signin-passkey-unsupported-390.png` |
| PB-036 | fixed | After activation: "Welcome" / "Te damos la bienvenida", the same on the server and after, so nothing swaps. On a plain visit the title no longer changes under the reader: the line is always laid out (41px before and after), the hour's greeting is the first one read, and it fades in over 150ms only when motion is allowed. | `signin-after-activation-1440.png`, `signin-after-activation-320-es.png`, `signin-reduced-motion-1440.png` |
| PB-037 | fixed on Sign in and in the shared password field; B's fields listed below | Employee ID: `enterKeyHint="next"`, `autoCorrect="off"`, `autoCapitalize="none"`, `spellCheck={false}`, `autoComplete="username"`. Password: `enterKeyHint="go"`, `autoComplete="current-password"`. `PasswordInput` now sets the three "never correct" attributes for every caller. No `inputMode="numeric"`: Employee IDs contain letters. | unit tests |
| PB-015 | fixed for the shell and Sign in; Forgot password's markup is B's | The shell rule is in `auth-b.css`: links 24px under the card, 15.5px/600 teal, centred, 20px apart, wrapping onto centred rows. With mobile Access on, Sign in's links were inside the desktop card; they hang under it now. | `signin-empty-1440.png`, `shell-forgot-1440.png` (still shows B's outlined pill) |
| PB-018 | fixed for the sign-in footer and the Spanish closing links | "(en inglés)" removed. On phones the line stacks as two centred lines and no line starts with a dot. | `signin-empty-320-es.png`, `shell-forgot-390-es.png` |
| PB-021 | fixed (the band); the workspace chip on sub-pages is B's content | Phone sub-pages: wordmark left and language right on row 1, the way back on row 2 (44px), then the title. | `shell-forgot-390.png`, `shell-forgot-390-es.png` |
| PB-028 | fixed | Measured on Sign in and Forgot password at 1440: title to subtitle 8, subtitle to first content 24, label to field 8, field to next label 20, last field to button 24. | `signin-empty-1440.png`, `shell-forgot-1440.png` |
| PB-032 | fixed | Language pill: 36px drawn, 48px to the touch. Back link on phones: 44px drawn, 48px to the touch. Band starts 16px under the status area plus the safe-area inset. Legal links measured 42px and are 44px now. | `shell-forgot-390.png` |
| PB-029 (sign-in part) | already as asked | The greeting stays on Sign in. | every sign-in picture |

## What was built

**Bare domain `/`** (`src/app/page.tsx`). Anyone. A page-level redirect, not a routing rule: there is no middleware for `/`. It reads only whether the session cookie is present, never its value.

**Sign in `/login`** (`src/app/login/page.tsx`). Anyone. Reached from `/`, from every sub-page's back link, and from an ended session.
- Card: greeting and workspace chip, Employee ID with its helper, Password, Sign in. With passkeys on: "or" and the outlined passkey pill.
- Under the card: the two links, the Spanish language line, and on phones and tablets the three proof rows.
- Desktop panel: wordmark, the product line, the support line, the three proof rows.

**The shell** (`auth-shell.tsx`, `auth-back-nav.tsx`, `auth-b.css`, `brand-legal.tsx` footer, `doc-links.tsx`) for Sign in, Forgot password, New password, Activate, Welcome and Access help.

## Shell rules, for builders B and C and for DESIGN.MD

- The card holds the form and its one filled button.
- Alternatives: `<nav class="q-auth__links">` as the last child of the column, outside the form or card. Or a `<div class="q-auth__under">` that holds the nav plus other lines. Both sit 24px under the card at every width. On desktop the block may be 56px wider than the card on each side and the card keeps 104px of room under it.
- Field helper: `<p class="q-auth__fieldhelp">`, 13.5px grey, 6px under the field.
- Desktop rhythm is set by the shell for `.q-hd`, `.q-fl`, labels and a button that directly follows a field or the `.q-auth__fields` fieldset.
- A wait note is `q-auth__alert q-auth__alert--wait` and is amber even when it also carries `q-error`.

## States

"Real" means the real app on the owned local Postgres with fictional data. "Forced" means the browser API was stubbed or a reply intercepted.

| Screen | State | Produced | Evidence |
|---|---|---|---|
| Sign in | Empty, 320 / 390 / 900 / 1440, EN and ES | Real | `signin-empty-*` |
| Sign in | Pressed with nothing typed (field errors) | Real | `signin-missing-fields-390.png` |
| Sign in | Wrong credentials, ID kept, caret on password | Real (the login action answered) | `signin-wrong-credentials-kept-id-1440.png`, `-320-es.png` |
| Sign in | Too many attempts | Real page, state opened by its address `/login?error=busy` (the limiter was not tripped) | `signin-too-many-attempts-*` |
| Sign in | Session ended, with a return address | Real page, opened by its address `/login?ended=1&returnTo=/app/requests` | `signin-session-ended-*` |
| Sign in | After activation | Real page, opened by its address `/login?activated=1` | `signin-after-activation-*` |
| Sign in | Passkey offered | Real (`NEXT_PUBLIC_NEVORA_PASSKEYS=on`) | `signin-passkey-offered-*` |
| Sign in | Passkey not accepted | Real: the owned app refuses passkey options (its origin does not match its random port), as U11 reported | `signin-passkey-refused-390-es.png` |
| Sign in | Passkey prompt closed | Forced: options reply intercepted, `navigator.credentials.get` rejects | `signin-passkey-cancelled-1440.png` |
| Sign in | Device can't use a passkey | Forced: `PublicKeyCredential` removed | `signin-passkey-unsupported-390.png` |
| Sign in | Passkey rate limit, unavailable, account disabled | Unit test only | none |
| Sign in | Offline | Real: the browser was set offline before pressing Sign in. The existing public error screen answers with the connection wording. Sign in has no offline note of its own. | `signin-offline-390-es.png` |
| Sign in | Reduced motion; no JavaScript | Real | `signin-reduced-motion-1440.png`; log |
| Sign in | 200% text at 390 | Real | `signin-text-200-390-es.png` |
| Bare domain | No cookie | Real | `bare-domain-1440.png` |
| Bare domain | With a cookie | Unit test only | none |
| Shell | Forgot password at 390 and 1440, EN and ES | Real | `shell-forgot-*` |
| Shell | Mobile Access on: Sign in and Forgot at 390, 900, 1440, EN and ES | Real, final commit | `reuse/access-on-*` |

## Pages that reuse the shell: before and after

Compared pixel by pixel at 320, 390, 900 and 1440 in both languages (`before/` is base `ad814bad`).

- Billing recovery `/pages/nevora-billing`, `/pages/plans`, `/pages/nevora-billing-return`, Clocker paused `/clocker/access/paused`, the 404: English identical. Spanish differs only in the footer line, where "(en inglés)" is gone. `/pages/es-pago` always reads Spanish, so its footer changed at both settings.
- Public error screen (the offline capture): identical in all 8 pictures.
- Privacy, Support, Account deletion under 1024px: the band starts 2px higher (18px to 16px, PB-032), so everything sits 2px higher. At 1440 English is identical.
- Support and Account deletion in Spanish: the closing links lost "(en inglés)" and are one line shorter on phones (20px).
- One 18-pixel anti-aliasing flicker on the wordmark of `billing-return` at 390, not a layout change.

## Keyboard and focus

Walked with Tab in the capture tool, both languages. Every stop shows the 2px ring (white on the band, teal elsewhere).

- Sign in, 1440: language, Employee ID, Password, show password, Sign in, [passkey when on], Forgot password?, New here?, Privacy, Terms, Support.
- Sign in, 390: the same, with the support address after the two links.
- Forgot password, 1440: back, language, then the form.
- Forgot password, 390: language, back, then the form. This matches what is seen: row 1 then row 2. The back link is rendered twice and the stylesheet displays one, so the other is neither focusable nor announced.
- The panel's support address is plain text, not a link. As a link it became the first Tab stop on every signed-out page.
- After an error the caret goes to the password (round 1 behaviour, unchanged). Enter submits.
- Pictures: `signin-focus-employee-id-1440.png`, `signin-passkey-focus-1440.png`.

## English and Spanish

The surface is bilingual on screen. Every state above was captured in both languages. All new strings are in `src/lib/auth-copy.ts` with `en` and `es`.

## Copy for Jose

| Key | English | Spanish |
|---|---|---|
| `greeting.first` (new) | Welcome | Te damos la bienvenida |
| `greeting.welcome` (ES changed) | Welcome back | Hola de nuevo (was "Te damos la bienvenida") |
| `proof.security` (new) | Encrypted sign-in. Your employer controls your records. | Inicio de sesión cifrado. Tu empleador controla tus registros. |
| `proof.languages` (new) | Sign-in and account help in English and Spanish. | Inicio de sesión y ayuda con la cuenta en inglés y español. |
| `proof.help*` (new) | Help at support@thevelani.com. We aim to reply within two business days. | Ayuda en support@thevelani.com. Nuestra meta es responder en dos días laborables. |
| `proof.label` (new, screen readers) | About NEVORA | Sobre NEVORA |
| `employeeIdHelp` (new) | The ID you got when you set up your account. Ask your manager if you don't have it. | El ID que recibiste al configurar tu cuenta. Si no lo tienes, pídeselo a tu gerente. |
| `setUpAccount` (new) | New here? Set up your account | ¿Primera vez? Configura tu cuenta |
| `appLanguageNote` (new) | (none) | Por ahora, la aplicación está en inglés después de iniciar sesión. |
| `loginBusy` (changed) | Too many attempts. For your safety, sign-in is paused for 15 minutes. If you forgot your password, you can reset it now. | Demasiados intentos. Por seguridad, pausamos el inicio de sesión durante 15 minutos. Si olvidaste tu contraseña, puedes restablecerla ahora. |
| `passkeyRateLimited` (EN changed) | Too many attempts. Wait a minute, then try again. | Demasiados intentos. Espera un minuto e inténtalo de nuevo. (unchanged) |
| `sessionEnded` (changed) | You were signed out to keep your account safe. Sign in to continue. | Cerramos tu sesión para proteger tu cuenta. Inicia sesión para continuar. |
| `sessionEndedReturn` (new) | You were signed out to keep your account safe. Sign in to pick up where you left off. | Cerramos tu sesión para proteger tu cuenta. Inicia sesión para continuar donde estabas. |
| Footer and closing links | unchanged | Privacidad · Términos · Ayuda (no "(en inglés)") |

No payroll sentence was added or changed. Removed from the screen: the eyebrow "NEVORA Workforce", the panel's "Powered by VELANI LLC", the password placeholder. Unused keys left in place for other callers: `panelEyebrow` (the billing recovery frame uses it), `quiet.passwordPlaceholder`, `activateAccount` (Activate's button).

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: `src` clean.
- `npx eslint` on the 14 changed `.ts`/`.tsx` files: clean.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 896 files passed, 24 skipped; 13,645 tests passed, 741 skipped; no failure.
- New tests: `src/app/login/page-front-door.test.tsx` (6 tests, 10 cases) and `src/components/auth-premium/auth-shell-p5.test.tsx` (6 tests, 9 cases).
- Changed assertions, all wording or markup, none about security behaviour:
  - `src/app/login/page-message.test.tsx`: the two new sentences. Added: amber class on the wait note; the return promise is withheld without a vetted address; an outside address is still refused and carries no `returnTo`.
  - `src/app/legal-pages.test.tsx` (one assertion, C's area): the Spanish closing links no longer say "(en inglés)".
- U11's `passkey-u11.test.tsx` passes unchanged.
- Browser captures with `cap.sh` in public mode: default flags (all pages, 4 widths, 2 languages), passkeys on, mobile Access on. No horizontal overflow at any width. No page error.
- Measured in the browser: the rhythm numbers, the 48px hit areas, redirect hops, greeting height and animation with motion allowed and reduced, title visibility without JavaScript at 0.3s and 1.8s.

Not run: integration suites (`src/test/integration/**`), a real phone, a screen reader, Safari.

## For Codex

1. PB-030: please confirm a password reset is allowed while sign-in is paused. From reading (not changing) `recovery.server.ts`, recovery has its own limits table and does not consult the login limiter, so the new sentence looks true.
2. PB-005: a hard page load after natural expiry still carries no return address (round 1 note; `src/proxy.ts` would need to stamp the path). The note then says "Sign in to continue", which stays true.
3. PB-010: `src/app/page.tsx` names the session cookie `fuel_session` itself because `session.ts` does not export the name. If you export it, this page should import it. Integration tests that expect `/` to land on `/app` first should be checked; I found none in the unit suite.
4. PB-009: the employee guide is still called with `lang="en"` (`src/app/app/page.tsx`), outside this package.

## For Jose to decide

1. Proof row 2. The finding gave "In English and Spanish". The app after sign-in is English, and the same page now says so in Spanish (PB-009), so I wrote "Sign-in and account help in English and Spanish."
2. Proof row 3. The finding gave "Help within two business days". The Support page says it is a goal, so I wrote "We aim to reply within two business days."
3. Spanish fallback greeting "Hola de nuevo". It shows only without JavaScript or on a very slow load. "Te damos la bienvenida" moved to the after-activation greeting, as the finding asks.
4. Session-ended wording has two forms so it never promises a return that will not happen.
5. The proof rows also show under the links on phones and tablets. The finding only asked for the desktop panel; the landing recommendation asks the sign-in page to carry the introduction everywhere. Easy to remove (one line) if the phone page should stay shorter.
6. The greeting's server words wait up to 1.2s out of sight so the hour's greeting is the first one read. That is a one-step reveal, not travel, so it is not behind the reduced-motion query. Say if you prefer the server words to show at once.

## Needed from another package

**Builder B**
- PB-015: on Forgot password move "I have a recovery code" and "Can't use your email?" out of the card into `<nav class="q-auth__links">` as the column's last child, and drop the outlined pill. New password and Activate the same. The shell places and styles it.
- PB-037: pass these on your fields (I cannot reach them):
  - Forgot: `recovery-employee-id` `enterKeyHint="next"` `autoCorrect="off"`; `recovery-email` `enterKeyHint="go"`.
  - New password: `reset-proof` `enterKeyHint="next"` `autoCorrect="off"` `autoCapitalize="none"` `spellCheck={false}`; `reset-password` `enterKeyHint="next"`; `reset-confirm-password` `enterKeyHint="go"` plus the three "never correct" attributes (it is a raw input, not `PasswordInput`).
  - Activate: password `enterKeyHint="next"`, confirmation `enterKeyHint="go"`.
  - Mobile Access views and assisted recovery (`assisted-proof`, `assisted-employee`): the same pattern.
- PB-028: the shell sets 24px under the subtitle and 0 above a form's first field. Where your steps line or list sits between them, its own bottom margin (18px) decides the gap to the first label. Fields wrapped in an extra `div` do not get the 20px rule.
- PB-021: the workspace chip under the title on Forgot, New password and Activate is page content.
- Sign in's second link now reads "New here? Set up your account". PB-029 suggests Activate's title becomes "Set up your account" to match.

**Builder C**
- PB-001: the footer and the Spanish closing links no longer say "(en inglés)". Privacy and Terms need the one Spanish note at the top of the page that PB-001 gives. Until then a Spanish reader gets no warning.
- `legal-pages.test.tsx`: I changed one assertion there. Expect a small merge.
- PB-018 on policy pages: the English closing links (`QuietPolicyLinks`, yours) still wrap with a leading dot at 390. The Spanish line does the same at 320 only.
- Public error screen at 390: the language pill's label touches the pill's edge. It is the same before my change (`not-found.css` / `public-error-screen.css`).
- Policy bands under 1024px now start 2px higher (see above).

## Not verified

- The 30 pictures were not all taken on the final commit. The default-flag pictures are two temporary commits back; the passkey pictures are four back. What changed after them: the passkey label's centring (before the passkey run), large-text rules for the links and the workspace chip, and rules scoped to `main#mobile-access-page`. A pixel comparison of the default pages before and after the large-text rules showed no difference (one 8-pixel flicker). The final commit was captured with mobile Access on (`reuse/access-on-*`), type-checked, linted and unit-tested (the three sign-in test folders rerun; the full suite ran one commit earlier, before a two-line change to Access-only CSS).
- Too many attempts, session ended and after activation were opened by their addresses. The limiter, a real expiry and a real activation were not exercised here; their redirects are unchanged.
- No real device, no screen reader, no Safari. `min-height: 1lh` needs Safari 16.4 or later; older browsers simply skip it and the line still holds because the text is always laid out.
- With mobile Access on I checked Sign in and Forgot password by eye at three widths. I did not capture a base picture with Access on, so there is no pixel comparison for it.
- `auth-b.css` is an older unlayered sheet (it is not in the `b-viewport` test list). My rules follow its own specificity ladder instead of `@layer nv-b`, so the pages' own sheets keep the precedence they have today. Its media queries use only alias widths plus `(hover: hover)` and `prefers-reduced-motion`.
