# Sign-in and recovery: premium redesign (E4)

Approved by Jose on October 20, 2026 ("yep, let's get this implemented"), after directions A–E. The target is the E4 mockups in `png/` (all four pages, phone and desktop; `png/BOARD-E4.png` shows them together). Source for the mockups: `html/e4-*.html` with `auth.css` (the `.e2`, `.e3` and `.e4` sections) and `build.py`.

Branch: `claude/auth-premium`, from `claude/release-integration` (898e99d4). Owner of the build: the Wave C chat (it owns `src/app/login`, `forgot-access`, `reset-access`, `activate` and the compliance branch that touches the same files). Coordinator reviews and tests.

## Scope and rules

- Pages: `/login`, `/forgot-access`, `/reset-access`, `/activate`. Every role uses them, so the look is shared and is not scoped to Owner/Manager.
- **Look only.** Server actions, validation, rate limits, recovery tokens, error codes, redirects, session handling and analytics stay exactly as they are. Field names, `autocomplete` values and form semantics stay.
- Fictional data only. No real email or SMS sends while testing.
- Keep existing error, loading, locked-out, success and expired-link states. Restyle them; don't remove any.
- Compliance branch (`claude/nevora-compliance`): its footer links (Privacy, Terms, Support, Account deletion) go in this footer. Wave C knows the overlap in `login/page.tsx`, `login/actions.ts` and `auth-refinement.css`. Build so that branch merges cleanly; do not merge it here without Jose's go.

## Layout

**Desktop (≥ 1024px):** cream page. Left column (form) starts at x72, 420px wide, vertically centred. Right: the brand panel, inset 20px from the top, right and bottom edges, starting at 47% width, radius 24px.
- Top left: the NEVORA wordmark (15px tall). Top right of the left half: the English / Español switch.
- Bottom left: © 2026 VELANI LLC, then Privacy, Terms, Support (12px, `#8C8A84`).
- Panel: deep teal `#0D3634` with a fine grain overlay (SVG noise, `mix-blend-mode: overlay`, about 5% visible). The NEVORA Λ is drawn flat and large in `#164B48`, anchored bottom right, partly off the panel. The sky triangle `#35B6EC` is the only bright accent.
  - Copy, top left: eyebrow "NEVORA WORKFORCE", the line "Your week, in one place." (32/38, weight 500), and the supporting line "Shifts, hours, time off and pay, ready the moment you sign in."
  - Device: an iPhone frame (320×660, radius 52, Dynamic Island, side button) showing a static, fictional employee Today screen (greeting, next shift with "In 22 min", Clock in, this week's hours, an approved time-off request, tab bar). The frame is cropped by the panel's bottom edge. It is decorative: `aria-hidden="true"`, no links, no real data.
- 768–1023px: same layout with the panel narrower; below 768px use the phone layout.

**Phone (< 768px):** a deep teal band at the top (300px on sign in, 168px on the other three) with the Λ and sky triangle and the same grain. Sign in also shows the white wordmark, "Your week, in one place." and an EN / ES pill. The form sits on a cream sheet with 28px top corners that overlaps the band by about 38px. The other three pages show a "‹ Sign in" pill in the band (white text on 14% white).

## Tokens

| Token | Value | Use |
|---|---|---|
| cream | `#F4EFE7` | page and sheet |
| paper | `#FFFDF9` | field fill |
| ink | `#161C1B` | text, focus outline |
| ink-2 | `#5F625E` | secondary text |
| ink-3 | `#8C8A84` | legal, "or" |
| rule | `#E2DACD` | field border, link underline |
| deep | `#0D3634` | panel, primary button |
| mark | `#164B48` | the Λ on the panel |
| sky | `#35B6EC` | the triangle only |

Check every text pair at 4.5:1 and every control boundary at 3:1 (placeholder `#7A766F` on paper, ink-2 on cream, white on deep). Darken a value if it fails; don't shrink text to pass.

## Type and components

- System font face (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto`). Sizes in rem so 200% text works.
- Eyebrow: 12/16, weight 600, letter-spacing 1.4px, uppercase, ink-2, with a 22px workspace tile (the workspace logo when Branding has one, otherwise the initial on deep).
- Headline: 46/50, weight 500, letter-spacing −1.8px (phone 36/40, −1.3px). On sign in it follows the time of day: "Good morning" (5:00–11:59), "Good afternoon" (12:00–16:59), "Good evening" (otherwise), using the device clock. Render "Welcome back" on the server and swap it after hydration, so there's no mismatch and no blank title.
- Subtitle (desktop sign in only): "Sign in to see your schedule, time and pay." 17/25, ink-2.
- Labels: 13/18, weight 500, ink. An aside link on the right (Forgot access?) is ink-2 with a 1px underline in `rule`.
- Fields: 52px tall (phone 50), radius 10, paper fill, 1px rule border. Focus: ink border with a 0.5px ink ring plus a 4px `rgba(13,54,52,.08)` halo. Errors: keep the current error colour and message placement; the border takes the error colour.
- Primary button: 52px, radius 10, deep fill, white 16/20 weight 500. Pressed: 96% scale for 120ms (none with reduced motion). Busy: keep the current busy text.
- Secondary links: ink with a `rule` underline, 15/22.
- "or" divider and "Sign in with a passkey" (desktop) / "Sign in with Face ID" (phone): built (October 20, Jose: "including Face ID"). Shown only when `NEXT_PUBLIC_NEVORA_PASSKEYS=on` and the browser has WebAuthn. Codex builds the server: `POST /api/auth/passkey/login/{options,verify}`, `POST /api/auth/passkey/register/{options,verify}`, `GET /api/auth/passkeys`, `DELETE /api/auth/passkeys/:id`, errors `{error: not_supported | cancelled | not_found | rate_limited | account_disabled | unavailable}`. The client is `src/lib/passkeys/client.ts` (native `navigator.credentials`, no dependency). Profile has "Face ID and passkeys" (set up, list, remove with confirm); after a password sign-in on a phone with none saved, a one-time sheet offers it ("Not now" is remembered 30 days on that device).
- **Language switch: visible on all four pages (Jose, October 20: "leave the switch on… this is for dev").** It's a two-option segmented control ("English" / "Español"; on phones "EN" / "ES"). Choosing Español switches these four pages to the Spanish words below and stores the choice in a `nv-lang` cookie (one year, `SameSite=Lax`, not httpOnly). The rest of the app stays English until the Spanish phase. Set `lang` on the page content when Spanish is shown.

## Words

English stays as it is today, except for these approved changes: the sign-in title ("Good morning" etc.), the subtitle, "Your week, in one place." and the supporting line.

Spanish (reviewed by Jose, October 20: "tú" throughout, "Owner" in English, the copyright line translated; the policy pages stay English for launch):

| English | Español |
|---|---|
| Good morning / Good afternoon / Good evening | Buenos días / Buenas tardes / Buenas noches |
| Welcome back (server render before the greeting swaps in) | Te damos la bienvenida (Jose, October 20: gender-neutral) |
| Sign in to see your schedule, time and pay. | Inicia sesión para ver tu horario, tus horas y tu pago. |
| Your week, in one place. | Tu semana, en un solo lugar. |
| Shifts, hours, time off and pay, ready the moment you sign in. | Turnos, horas, tiempo libre y pago, listos al iniciar sesión. |
| Employee ID | ID de empleado |
| Enter your employee ID | Escribe tu ID de empleado |
| Password | Contraseña |
| Enter your password | Escribe tu contraseña |
| Forgot access? | ¿Olvidaste tu acceso? |
| Sign in | Iniciar sesión |
| New employee? Activate your account | ¿Primera vez aquí? Activa tu cuenta |
| Forgot access (title) | Recuperar acceso |
| Recovery email | Correo de recuperación |
| Use the email registered with your account. | Usa el correo registrado en tu cuenta. |
| Request recovery | Solicitar recuperación |
| I already have a recovery code | Ya tengo un código de recuperación |
| Can’t use your recovery email? | ¿No puedes usar tu correo de recuperación? |
| Set a new password | Crea una contraseña nueva |
| Recovery code | Código de recuperación |
| Filled from your recovery link, or paste the code you received. | Se completa desde tu enlace de recuperación, o pega el código que recibiste. |
| New password | Contraseña nueva |
| At least 8 characters. | Al menos 8 caracteres. |
| Confirm new password / Enter it again | Confirma la contraseña nueva / Escríbela otra vez |
| Reset password | Restablecer contraseña |
| Need a recovery code? | ¿Necesitas un código de recuperación? |
| Activate account | Activar cuenta |
| Phone number | Número de teléfono |
| Use the number your workplace has on file. | Usa el número que tiene tu lugar de trabajo. |
| Create password / Choose your password | Crea una contraseña / Elige tu contraseña |
| Confirm password / Re-enter your password | Confirma la contraseña / Vuelve a escribirla |
| Need your employee details? | ¿Necesitas tus datos de empleado? |
| Back to sign in / Sign in (pill) | Volver a iniciar sesión / Iniciar sesión |
| © 2026 VELANI LLC. All rights reserved. · Privacy · Terms · Support | © 2026 VELANI LLC. Todos los derechos reservados. · Privacidad · Términos · Ayuda |
| Device screen (decorative): TUESDAY, OCTOBER 20 · Good morning, Alex · NEXT SHIFT · In 22 min · Front desk · Main Office · Clock in · THIS WEEK · Scheduled · Worked · Next payday · Fri, Oct 23 · Time off · Oct 26 · Approved by Morgan · Approved · Home / Schedule / Requests / Pay | MARTES, 20 DE OCTUBRE · Buenos días, Alex · PRÓXIMO TURNO · En 22 min · Recepción · Oficina principal · Marcar entrada · ESTA SEMANA · Programadas · Trabajadas · Próximo pago · vie, 23 oct · Tiempo libre · 26 oct · Aprobado por Morgan · Aprobado · Inicio / Horario / Solicitudes / Pago |
| Waiting for Face ID… / Waiting for your passkey… | Esperando Face ID… / Esperando tu llave de acceso… |
| Face ID isn’t set up for NEVORA on this device. Sign in with your password, then set it up in Profile. | Face ID no está configurado para NEVORA en este dispositivo. Inicia sesión con tu contraseña y luego configúralo en tu perfil. |
| No passkey for NEVORA is saved on this device. Sign in with your password, then add one in Profile. | No hay una llave de acceso de NEVORA guardada en este dispositivo. Inicia sesión con tu contraseña y luego agrega una en tu perfil. |
| Too many tries. Wait a minute, then try again. | Demasiados intentos. Espera un minuto e inténtalo de nuevo. |
| This account can’t sign in. Contact your manager or Owner. | Esta cuenta no puede iniciar sesión. Comunícate con tu gerente o con el Owner. |
| Face ID / Passkey sign-in isn’t available right now. Sign in with your password. | El inicio de sesión con Face ID / llave de acceso no está disponible ahora. Inicia sesión con tu contraseña. |
| Face ID and passkeys | Face ID y llaves de acceso |
| Sign in with Face ID or your device’s passkey instead of typing your password. | Inicia sesión con Face ID o con la llave de acceso de tu dispositivo en vez de escribir tu contraseña. |
| Set up Face ID / Add a passkey / Setting up… | Configurar Face ID / Agregar una llave de acceso / Configurando… |
| Added {date} · Last used {date} · Not used yet | Agregada el {date} · Último uso: {date} · Sin usar todavía |
| Remove “{name}”? You’ll sign in with your password on that device until you set it up again. Remove / Keep | ¿Quitar “{name}”? Iniciarás sesión con tu contraseña en ese dispositivo hasta que lo configures de nuevo. Quitar / Conservar |
| Face ID is set up. / Passkey removed. | Face ID está configurado. / Llave de acceso quitada. |
| Couldn’t set up Face ID. Try again. / Couldn’t remove it. Try again. / Couldn’t load your passkeys. | No pudimos configurar Face ID. Inténtalo de nuevo. / No pudimos quitarla. Inténtalo de nuevo. / No pudimos cargar tus llaves de acceso. |
| This browser can’t use passkeys. Try Safari or Chrome on this device. | Este navegador no puede usar llaves de acceso. Prueba Safari o Chrome en este dispositivo. |
| Sign in faster next time with Face ID / Use Face ID instead of your password on this phone. / Not now | Inicia sesión más rápido la próxima vez con Face ID / Usa Face ID en vez de tu contraseña en este teléfono. / Ahora no |

Translate the existing server error messages for these pages the same way, keeping their meaning exact. List any you aren't sure of for Jose. ("Owner" stays in English in Spanish text, Jose, October 20.)

## Assets

- Wordmark: the pages use the app's own `BrandWordmark` (src/components/brand-mark.tsx), the official PNG recoloured through an SVG mask with the cyan A kept: navy `#051538` on cream, white in the phone band. The separate knockout file is no longer used. A true vector (SVG) from Jose would only sharpen it at very large sizes.
- The Λ mark: use an inline SVG (`M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z`, triangle `M146 330 L180 266 L214 330 Z`, viewBox `0 0 360 340`). It's decorative, `aria-hidden`.
- No photos and no external images; the grain is an inline SVG data URI.

## Motion

On load, the form column fades in and rises 8px over 360ms, and the device does the same 120ms later. Nothing loops. None of it runs with `prefers-reduced-motion`.

## Checks before review

- Chromium and WebKit at 320, 390 and 430 (phone), 768, 1024 and 1440, plus 844×390 landscape, at 100% and 200% text.
- All states on all four pages: empty, typing/focus, each server error, busy, locked out, expired or invalid recovery link, success. Also Spanish on every page.
- Keyboard order and visible focus; the switch works by keyboard and announces the selected language; 44px targets on touch.
- No sideways scroll; nothing overlaps; the device never covers the panel copy.
- Existing tests pass (`npm test`, `npm run typecheck`, `npm run lint`); update browser checks that look for the old words, and say which ones.
- Server behaviour is unchanged: run the existing auth action tests and diff `actions.ts` (it should only change if wording moves into a shared dictionary).
