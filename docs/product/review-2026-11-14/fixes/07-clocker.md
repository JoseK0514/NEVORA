## WP7 Clocker: report

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp7.patch` (95 KB; reverse-applies cleanly against the worktree)

`git diff HEAD --stat`: 19 files changed, 432 insertions, 89 deletions.
- New: `src/app/clocker/[location]/error.tsx`, `src/app/clocker/[location]/loading.tsx`, `src/components/clocker-fallback.tsx`, `src/components/clocker-paused.tsx`, `src/components/clocker-pin-gate.test.tsx`
- Changed: `src/app/clocker/access/paused/page.tsx`, `src/components/clocker-{copy.ts,copy.test.tsx,icon.tsx,language.tsx,pin-gate.tsx,punch-panel.tsx,punch-panel.test.tsx,receipt.tsx,recovery.tsx,setup.tsx}`, `src/components/clocker.module.css`, `src/components/clocker-photo/punch-photo-flow.tsx`
- Outside scope, one-line matching test edit: `src/components/commerce-recovery/recovery.test.tsx`

Nothing was run in a browser. No server code, timer duration or punch logic changed.

### Findings

| ID | Status | What changed |
|---|---|---|
| RA-3 / UI-8 sign-in (item 1) | Done | Two steps in `clocker-pin-gate.tsx`: Employee ID, then PIN. The route accepts `employeeId` (`pin-transport.server.ts:8,23-24,58`), so the kiosk sends `{action:'verify',employeeId,pin}`. ID field: `type=text`, `inputMode=text`, `autoCapitalize=characters`, `autoCorrect=off`, `spellCheck=false`, `enterKeyHint=next`. The PIN step and keypad sizes are unchanged; a 48px back arrow sits over the heading row so the keypad does not move. |
| Privacy rules (item 1) | Done | ID and PIN clear together on the 20s idle timer, tab hide, Escape, page hide/restore, after a blocking error and after a successful verify. The ID is held in the field and a ref, never in React state. |
| RA-3 lockout (item 2) | Done | Reads `limitScope` and `retryAfterSeconds`. Heading "Your PIN is paused" (person) or "This tablet is paused" (device or workspace), then "Try again at 10:58 PM." in the kiosk locale and location time zone, rounded up to the minute. "Wait about five minutes" removed. The band no longer says "Paused" for a person-level pause. |
| NV-045 error codes (item 2) | Partly | The PIN gate now resolves text through `clockerErrorText` by code. Setup still reads `data.error`: see For Codex. |
| Extra status request (item 2) | Done | Dropped. The verify reply already carries `firstName` and `expiresAt`; the epoch, `document.hidden` and `privateScreenWindow` checks are kept, and the punch `state` read that follows proves the cookie. |
| NV-185 `otherCount` (item 2) | Done | The punch panel keeps `otherCount` and the saved-punch help shows one count line. The help link still appears only when the person has their own saved references. |
| RA-4 (item 3) | Done | `[location]/error.tsx` and `loading.tsx` render the kiosk frame in the tablet's saved language (English by default, as the kiosk). No sign-in link. |
| BR-10 (item 4) | Done | Sentence case and plain words; list below. |
| JR-26 (item 5) | Done | "Ask your Owner to contact NEVORA support." added to the verified-but-disabled note, and also to the setup screen's "Timekeeping is not available yet." note (same dead end). |
| RA-13 / JR-12 (item 6) | Done | The paused page renders through a client component that follows the kiosk's saved language. The Owner sign-in link is gone, replaced by the billing line. |
| RA-26 (item 7) | Done | A pointer tap on a pad key returns focus to the PIN field (`inputMode="none"` kept). Keyboard activation keeps focus on the key, and digits or Backspace typed there still reach the PIN. |
| RA-17 / SY-021 (item 8) | Done | Transparent outline on `.pin:focus-within`, the setup textarea and the new ID field. Explicit disabled colours on `.btn[secondary]`, `.link`, `.key` and `.act` instead of opacity. |
| RA-6 offline shell | Skipped | Not in the fix list; needs Jose's decision and a service worker. |
| DESIGN.MD (item 9) | Reported | Lines below; not edited. |

### Decisions I made that Jose should confirm
- **Workspace-level limit reads as "This tablet is paused".** Only two phrases were approved; the server has three scopes.
- **Person-level pause card:** the button says "Done" (not "Try again"), it shows "This screen clears after 30 seconds." and it returns to sign-in after 30s. Otherwise the next person reads "Your PIN is paused" as theirs. This adds a timer with an existing duration; none was changed.
- **Wrong entry message** is now "Employee ID or PIN not recognized…" for code `PIN_DENIED`, because the server's "PIN not recognized" misleads once an ID is typed. The ID stays for another try within a fresh 20s window; the message now also clears on that idle timer.
- **Blocked screens** no longer show "Your PIN is not your NEVORA password." under the card.
- **Paused page fallback:** a tablet with no saved kiosk language keeps the sign-in cookie's language (existing behaviour), not forced English.
- **Paused page, "could not be checked" case** shows only "Open billing on your own device." The "when billing is settled" sentence would not be true there.
- **Lockout hint** keeps the manager fallback as its own line: "You can ask a manager to record your time."

### Strings changed or added (EN → ES)
All in `src/components/clocker-copy.ts` unless noted.

Renamed (BR-10):
- :230 "Clock In" → "Clock in" (Marcar entrada, unchanged)
- :231 "Clock Out" → "Clock out" (Marcar salida, unchanged)
- :160 "Clock In recorded" → "Clock in recorded" (Entrada registrada)
- :163 "Clock Out recorded" → "Clock out recorded" (Salida registrada)
- :164 "Clock Out?" → "Clock out?" (¿Marcar salida?)
- :199 "Confirm Clock Out" → "Confirm clock out" (Confirmar salida)
- :211 "Try Again" → "Try again" (Intentar de nuevo)
- :190 "Refresh clock state" → "Refresh" (Actualizar estado → Actualizar)
- :90 "Help with a saved action" → "Something didn’t save?" (Ayuda con una marcación guardada → ¿Algo no se guardó?)
- :89 "Hide saved action help" → "Hide help" (Ocultar ayuda de marcaciones guardadas → Ocultar ayuda)
- :87 "Action reference" → "Reference" (Referencia de la marcación → Referencia)
- `clocker-photo/punch-photo-flow.tsx:13` "Photo for Clock In/Clock Out" → "Photo for Clock in/Clock out"

Removed:
- "Too many wrong PINs were entered on this tablet. Wait about five minutes, or ask a manager to record your time." and its Spanish line

New, sign-in and lockout:
- :255 "Enter your Employee ID" / "Ingresa tu ID de empleado"
- :256 "Employee ID" / "ID de empleado" (field label)
- :257 "Change Employee ID" / "Cambiar ID de empleado" (back arrow label)
- :258 "Don’t know your Employee ID? Ask your manager." / "¿No sabes tu ID de empleado? Pregúntale a tu gerente."
- :259 "Employee ID or PIN not recognized. Check both, or ask your manager." / "ID de empleado o PIN no reconocido. Revisa ambos o pide ayuda a tu gerente."
- :260 "Your PIN is paused" / "Tu PIN está en pausa"
- :314-317 `clockerRetryText`: "Try again at {time}." / "Inténtalo de nuevo a las {time}." ("a la" at one o'clock; no doubled full stop after "p. m.")
- :261 "You can ask a manager to record your time." / "Puedes pedirle a un gerente que registre tu tiempo."
- Existing lines reused on the person pause card: "Done" / "Listo", "This screen clears after 30 seconds."

New, other:
- :92 "{count} more saved on this tablet. Each person can check their own after their PIN." / "Otras guardadas en esta tableta: {count}. Cada persona puede revisar la suya después de ingresar su PIN."
- :157 "Ask your Owner to contact NEVORA support." / "Pide al dueño que contacte al soporte de NEVORA." (used at `clocker-pin-gate.tsx:213` and `clocker-setup.tsx:92`)
- :263 "Something went wrong" / "Algo salió mal"
- :264 "Something went wrong. Try again." / "Algo salió mal. Inténtalo de nuevo." (screen-reader alert)
- :265 "If it keeps happening, ask a manager to record your time." / "Si sigue pasando, pide a un gerente que registre tu tiempo."
- Loading screen reuses "Checking this tablet…" / "Revisando esta tableta…"

Paused page (:267-272; moved from the page into the copy file, wording unchanged except the last two):
- "Access could not be checked", "Clocker access is paused", "Clocking is unavailable right now. Ask your workplace Owner to review access and billing.", "Try Clocker again"
- New :270 "Open billing on your own device." / "Abre la facturación en tu propio dispositivo."
- New :271 "This tablet starts working again when billing is settled." / "Esta tableta vuelve a funcionar cuando la facturación esté al día."
- Removed: "Owner sign in" / "Iniciar sesión como propietario" and the `/login?returnTo=…` link

### Tests run
- `npx vitest run` on 18 files, 140 tests, all pass: the Clocker component tests (including the new `clocker-pin-gate.test.tsx`), `src/app/clocker`, `clocker-photo`, `commerce-recovery/recovery.test.tsx`, and the guard tests that read Clocker sources or CSS (`phase-c-governance-cleanup`, `no-page-entrance-motion`, `b-viewport`, `hex-guard`, `nevora-visible-branding`). A separate run of `not-found`, `clocker-recovery`, `pin-transport`, `navigation-access` and `clocker-runner` also passed.
- `npx eslint` on every changed and new `.ts`/`.tsx` file: clean.
- Not run, per the rules: `tsc`, the full suite, any browser. I read the diff for types instead.
- There is no DOM test environment, so the gate's step changes, timers and focus return are covered only by static markup and `requestPin` tests (request body, 429 parsing, codes).

### For Codex
1. **Setup cannot translate by code yet.** `setup.server.ts:129` reuses `SETUP_UNAVAILABLE` for "New tablet setup is paused…", so a code-first lookup would show the wrong sentence. `clocker-setup.tsx` still reads `data.error`. It needs a distinct code.
2. **`PIN_DENIED` text** still says "PIN not recognized for this location…"; the kiosk overrides it by code. Consider aligning the server sentence.
3. **Server sentences in title case:** "choose Check Setup" (`setup.server.ts:159`, `transport-errors.ts:9`) and "Tap Check Action Status" (`punch-command.ts:16`), while the buttons read "Check setup" / "Check action status".
4. **Scripts that press the old names or the PIN-only flow will fail** and are outside my scope: `scripts/clocker-ipad-ui-qa.mjs`, `clocker-journal-mounted-browser.mjs`, `clocker-staging-acceptance.mjs`, `phase-c-*-ui-qa.mjs`, `phase-c-punch-http-qa.mjs`, `phase-d-browser-qa.mjs`, and `src/test/integration/step4-lifecycle-browser.integration.ts` and `commerce-recovery-browser.integration.ts`.
   - They need: an Employee ID step before the PIN, the idle heading "Enter your Employee ID", the new button names, no `status` request after verify, and no "Owner sign in" link on the paused page.
   - `step4-lifecycle-browser` was already stale ("Start Break", "Clock In Recorded").
5. **Loading boundary and 404:** per Next's docs, a segment with `loading.tsx` streams, so an unknown kiosk key now returns HTTP 200 with the not-found UI and `noindex` instead of 404. Delete `src/app/clocker/[location]/loading.tsx` if the 404 status matters; `error.tsx` does not depend on it.

### Check in the browser
- ID step at 1024x768 and 768x1024 with the tablet keyboard open: the field should stay visible, especially in portrait where the card sits low.
- PIN step: back arrow beside the heading, no overlap with "Enter your PIN" / "Ingresa tu PIN" at phone width, keypad position unchanged.
- Lockout card for each scope, including the Spanish time ("a las 10:58 p. m.").
- VoiceOver on iPad: focus returning to the PIN field after a pad tap may move the VoiceOver cursor off the keypad. I could not verify this.
- Forced colours (Windows High Contrast): rings on the PIN field, ID field and setup textarea; the new disabled key colours while "Checking…".
- `/clocker/access/paused` on a tablet with Spanish saved: English is served first, then it switches after hydration (brief flash).
- Kiosk error screen: force a failure in the kiosk page. It covers `/clocker/[location]` only, not `/clocker/access/paused`.
- The portal's `time-clock-widget.tsx` still says "Clock In" / "Clock Out", so portal and kiosk now differ in case.

### DESIGN.MD lines to update (not edited)
- **1637-1639:** the exempt words (Clock In, Clock Out, Try Again) and "the status words the scripts press" no longer hold.
- **1646-1652 (PIN):** add the Employee ID step. "No lockout countdown: the server's `retryAfterSeconds` is a fixed 300" is wrong: the card now names who is paused and shows the clock time, the person card clears after 30s, and the lockout button is "Try again" or "Done" rather than Check connection.
- **1654-1656:** "Refresh clock state" and "Help with a saved action" are now "Refresh" and "Something didn’t save?".
- **1659:** "the action reference" is now "Reference".
- **1664-1667 (Unchanged / Keyboard):** the verify request now carries `employeeId` and the status request is gone; the 20s idle clear covers the ID; focus starts on the ID field, Enter moves to the PIN, Tab order includes the back arrow, and focus returns to the PIN field after a pad tap.
- **751 and 955**, and `.21st/DESIGN.md:68`: the same exempt-word list and the scripted step names ("Clock In", "Clock In Recorded", "Confirm Clock Out").
- Add notes for the kiosk error and loading screens and for the paused page (kiosk language, no Owner sign-in).
