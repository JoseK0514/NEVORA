# Phase 6, package A: the kiosk's clock-in flow

Base `e9d2ba4e`. Evidence: [evidence-kiosk/](evidence-kiosk/). The builder captured 271 after and 56 before pictures; a selection is kept here, so some file names below are not in the folder. The run logs (`journey-*.json`) are kept in full.
The kiosk is bilingual on screen: everything here renders English and Spanish, with screenshots in both.
Presentation only. No punch, PIN, limiter, journal, photo or enrolment logic changed, and no API route or server module.

## 1. Findings

| # | Item | Status | What is true now | Evidence |
|---|---|---|---|---|
| 1 | Stable error codes | fixed (one part needs Codex) | Every refusal on the staff screens is picked by the server's code through `clocker-copy.ts` (`clockerPinErrorKey`, `clockerPunchErrorKey`). The server's English sentence is never drawn. A code the kiosk does not know gets the kiosk's general sentence with the manager fallback. The punch route sends four replies with no code: see For Codex 1. | `kiosk-wrong-entry-*`, `kiosk-server-unreachable-*`, `kiosk-tablet-needs-setup-*`, `kiosk-pin-again-*`; tests |
| 2 | Extra status request | already fixed (round 1), measured | Nothing left to drop. One clock-in is `pin:verify`, `punch:state`, `punch:execute`, `pin:clear`. The same before and after. The `state` read stays: it is the only reply with the clock state and the person's journal key. | `journey-before-en.json`, `journey-after-en.json` (`requests`) |
| 3 | "N more saved" from `otherCount` | fixed | The "Check your last punch" screen and the saved-punch help say "1 more saved on this tablet." or "2 more saved on this tablet." Never a name or a reference. The help link now appears on that screen straight after a punch could not be confirmed. | `kiosk-unconfirmed-clock-out-others-saved-*`, `kiosk-saved-help-*` |
| 4 | Receipt as the peak moment | fixed (one fact needs Codex) | Every receipt: what and when, the first name (the two break lines now carry it), the next fact the reply holds, the mark, the countdown, Done. Clock in has no extra fact: the reply has none. | `kiosk-receipt-clock-in-*`, `-break-start-*`, `-break-end-*`, `-clock-out-*` |
| 5 | Offline and failures (RA-6, MK-8) | fixed in the page; reload offline needs Codex | A kiosk offline card on the ID and PIN steps, an offline note on the clock screen, "not confirmed" with the action and its time, and a check that runs by itself when the connection returns. No queued punches. | `kiosk-offline-*`, `kiosk-ready-offline-*`, `kiosk-offline-punch-*`, `kiosk-error-screen-offline-*` |
| 6 | Language (RA-13) | fixed; two parts need Codex and Jose | The choice is kept in the tablet's browser storage. The paused, error and not-found pages follow it. A tablet with no choice now starts in the browser's language. | `kiosk-fresh-spanish-browser-1024x768.png`, `kiosk-paused-*`, `kiosk-not-found-*` |
| 7 | Shared-tablet honesty (JR-12, JR-26) | fixed | Paused page: no sign-in, "Open billing on your own device.", what staff do meanwhile, and the tablet's own language switch. Punches off: what it means, who can turn it on, what to do meanwhile. | `kiosk-paused-*`, `kiosk-punches-off-*` |
| 8 | The Clocker's not-found page | fixed | The 560px card, one VELANI line, who can fix the link, the tablet's language, no sign-in link. | `kiosk-not-found-*`, `before/before-not-found-*` |
| 9 | Kiosk wording | fixed | The three named phrases were done in round 1. This pass removed the rest of the system words. List in section 7. | every screenshot; tests |
| 10 | Accessibility (RA-17, RA-28) | fixed | High Contrast paints every edge and focus. 56px targets. Keypad is a labelled group with a live digit count. Focus moves to the heading when a card replaces the form. axe: 0 violations on 14 kiosk states in each language. | `kiosk-high-contrast-*`, `kiosk-keyboard-*`, `kiosk-small-tablet-*`, `kiosk-text-200-*` |

Journey: 45 of 45 steps pass in English and 44 of 44 in Spanish after the change (enrol, clock in, start and end a break, clock out, saved-punch recovery, a second location, both lockouts). The Spanish run has one step fewer because the English run also switches to Spanish and back. Before the change: 41 of 42 (the one miss was my capture script, a wrong Employee ID in its reduced-motion step, not the app; the after runs have three more steps: a Spanish browser on a fresh tablet, another person's saved punch, and text at 200%). Logs: `journey-before-en.json`, `journey-after-en.json`, `journey-after-es.json`.

## 2. What was built, by screen

All of it is on `/clocker/<key>` unless noted. Staff reach it on the shared tablet. Nothing was added to navigation.

- **Employee ID and PIN** (`clocker-pin-gate.tsx`). Refusals read by code. With no network the form gives way to one card: "This tablet is offline, so nothing can be recorded right now." "Tell a manager so your time gets recorded." It returns by itself. When the server cannot be reached the existing card says what was not done and checks again every 20 seconds while the tablet is in view. Nothing typed stays on screen. The keypad announces how many digits are in, never the digits.
- **Clock screen** (`clocker-punch-panel.tsx`). A punch that could not be confirmed says "Your clock in at 9:02 AM is not confirmed yet." and "This tablet kept the attempt and will not record it twice. Tell a manager now, then tap Check if it saved." It never says failed and never says saved. With no network it adds that the tablet checks again by itself, and it does: when the connection returns it runs the same read as the button. It never sends a punch again without the person.
- **Receipt** (`clocker-receipt.tsx`). Clock out: "Clocked in at" and "Since clock-in". End of a break: "Break started at" and "Break length". Start of a break: "Break type" and "Suggested length". Facts come only from the reply and from the screen the person acted on, and only when both name the same shift or break. No pay and no weekly total.
- **Saved-punch help** (`clocker-recovery.tsx`). Plain words. The count of other people's saved punches. Asking the Owner is the quiet button, so the screen keeps one filled button.
- **Error screen** (`clocker-fallback.tsx`). With no network it says so and retries when the connection returns.
- **Paused page** `/clocker/access/paused` (`clocker-paused.tsx`). The language switch is the tablet's own. Before, the page showed the sign-in switch, which a saved tablet choice overrode, so it looked broken.
- **Not found** `/clocker/<unknown key>` (`[location]/not-found.tsx`, new `not-found-body.tsx`).
- **Kiosk page** (`[location]/page.tsx`). Passes the served language to the kiosk.
- **Photo step** (`clocker-photo/`, presentation only). Plain words on the unconfirmed states and 56px targets. No capture rule changed.
- **Styles** (`clocker.module.css`). A forced-colours block, 56px targets, a small-tablet layout, the facts row. The band, the clock, the glow, the card and the keys at 1024x768 and 768x1024 are as they were.
- New client module `clocker-online.ts`: the browser's online state as a hook. It never decides whether a punch is sent.

`clocker-break-types.tsx` is in my list but it is the Owner's Break types settings screen, not a kiosk screen. I did not change it.

## 3. Item detail

### Item 1: every code the server can send, against the map

PIN route (`pin-transport.server.ts`, plus the shared origin check):

| Code | Status | Kiosk sentence |
|---|---|---|
| `PIN_DENIED` | 401 | Employee ID or PIN not recognized. Check both, or ask your manager. (round 1) |
| `PIN_LIMITED` | 429 | The paused card: who is paused and the clock time (round 1) |
| `PIN_INPUT_INVALID` | 400 | Enter exactly four PIN digits. |
| `DEVICE_REQUIRED` | 401 | This tablet is no longer set up for this location. + Ask a manager to set up this tablet again (Settings → Clocker tablets). |
| `PIN_UNAVAILABLE` | 503 | We couldn't reach NEVORA, so your PIN was not checked. Nothing was recorded. + Tell a manager so your time gets recorded. |
| `ORIGIN_REJECTED` | 403 | This tablet did not open the Clocker from its own link. Ask a manager to open it again. |
| `LOCATION_INVALID` | 400 | This tablet's link is not valid. Ask a manager to set up this tablet again. |
| `SETUP_UNAVAILABLE` | 503 | This tablet can't reach NEVORA right now. Nothing can be recorded until it does. |
| no code (older server) | by status | 429 paused, 401 not recognized, `device_required` set up again, 5xx not reached, else the general sentence |
| unknown code | any | We couldn't check your PIN. Try again, or ask a manager to record your time. |

Punch route (`PunchErrorCode` in `punch-command.ts`, 13 codes):

| Code | Kiosk sentence |
|---|---|
| `AUTH_REQUIRED`, `CONTEXT_CHANGED` | Your PIN check ran out. Enter your PIN again. A punch that isn't confirmed stays saved on this tablet. |
| `UNAVAILABLE` | Not confirmed: the action and its time, and that the tablet kept it (item 5) |
| `INVALID_INPUT` | This tablet sent something NEVORA couldn't read. Go back and try again, or ask a manager to record your time. |
| `STALE_STATE` | Your time changed since this screen loaded. |
| `COMMAND_REUSED` | This punch doesn't match what NEVORA has. Ask a manager to check it. |
| `INVALID_TRANSITION` | That can't be recorded from where you are now. |
| `OTHER_LOCATION` | Your shift is open at another location. Use the tablet there, or ask a manager. |
| `INTEGRITY` | Your time records need a manager's check. Nothing was changed. Ask a manager to record your time. |
| `CLOCK_INVALID` | The time on NEVORA's side doesn't match your records. Nothing was changed. Ask a manager to record your time. |
| `BREAK_TYPE_CHANGED` | That break is no longer offered. Go back and choose another one. |
| `SCHEDULE_CHANGED` | The schedule changed while this was being recorded. |
| `SUBSCRIPTION_REQUIRED` | New clock-ins are paused for this workplace. Your Owner can restore access. Ask a manager to record your time. |
| unknown code | We couldn't confirm that. Ask a manager to record your time. |

A refused punch keeps its saved attempt, so each of these is followed on screen by "This tablet kept the attempt and will not record it twice. Tell a manager now, then tap Check if it saved."

Other places checked:
- **Breaks**: `BREAK_TYPE_CHANGED` above. No other server text.
- **Photo step**: it draws its own phases. The six photo codes never reach the screen as text.
- **Saved-punch help** (`/review`): it reads only `state`. No server text.
- **Setup hand-off**: a tablet that lost its registration gets `DEVICE_REQUIRED` at the gate (above). The setup screen itself is builder B's.

Tests check the punch list against `punch-command.ts` and the PIN list against `pin-transport.server.ts`, so a new server code fails a test until it has a sentence in both languages.

### Item 2: requests per clock-in

Counted in the capture log from the press of Continue to the ID screen after Done:

| | Before | After |
|---|---|---|
| `pin:verify` | 1 | 1 |
| `pin:status` | 0 (round 1 removed it) | 0 |
| `punch:state` | 1 | 1 |
| `punch:execute` | 1 | 1 |
| `pin:clear` | 1 | 1 |

The log shows `punch:state` twice. That is the development build mounting the screen twice (React Strict Mode). A production build sends it once. I did not run a production build.
The `state` read cannot go: the verify reply carries only the first name and the expiry. The clock state, the allowed actions and the journal key come only from `state`.

### Item 5: what the kiosk says, by case

| Case | Says | Recovers |
|---|---|---|
| No network on the ID or PIN step | Not saved: nothing can be recorded. Tell a manager. | By itself when the connection returns |
| Server not reached at the PIN check | Your PIN was not checked. Nothing was recorded. Tell a manager. | Checks every 20 seconds and when the connection returns |
| No network on the clock screen | No connection. Wait for it to return before you clock in or out, or tell a manager. | The note goes when the connection returns |
| A punch that could not be confirmed | Your clock in at 9:02 AM is not confirmed yet. The tablet kept the attempt. Tell a manager now. | When the connection returns it checks; then "Send it again" if the server never got it |
| A saved punch found on the next PIN | Your clock in is not confirmed yet. (no time: the journal does not keep one) | Check if it saved |
| The saved punch can no longer be sent | Your earlier punch was not recorded and can no longer be sent. See your current status. | See current status |
| Render failure with no network | No connection, nothing can be recorded, tell a manager | Retries when the connection returns |

True state only. The journal keeps the attempt, so the kiosk says "kept" and "not confirmed", never "not saved" and never "saved".
The time shown is when the button was pressed on this tablet. NEVORA records its own time when the punch arrives.

**Service worker.** `public/` has one: `fuel-portal-sw.js`, scope `/app`. It does not cover `/clocker`. A reload with no connection shows the browser's own error page. See For Codex 4.

### Item 6: language

- **Where it is kept**: `localStorage` key `nevora.clocker.locale` in the tablet's browser, with an in-memory copy when storage is blocked. It stays for the next person.
- **Paused, error, not-found**: all three follow the tablet's choice. Not-found used the sign-in cookie before.
- **Spanish browser, fresh tablet**: before, English. Now Spanish: the kiosk page reads the sign-in language (the `nv-lang` cookie, else the browser's `Accept-Language`) and passes it. Captured: `kioskLang: "es"`, nothing stored.
- A tablet with a saved choice that differs from its browser language is served the browser's language and switches on load. This is the same brief flash the paused page already had.

### Item 10: accessibility

- **High Contrast** (forced colours emulation in Chromium): before, the keys, the PIN dots, the band chips and the buttons had no edge at all. Now every control has a border, the dots are system-coloured, bars use Highlight, and focus is a 3px system outline. Compare `before/before-high-contrast-pin-focus-1024x768.png` with `kiosk-high-contrast-key-focus-1024x768.png`.
- **Keypad**: real buttons in a `role="group"` named "PIN keypad". Each digit is "Number 5". A live line says "2 of 4 digits entered". Enter and Space press a focused key. Digits and Backspace typed on a focused key reach the PIN.
- **Live regions**: the wrong-entry line and every card message are `role="alert"`. The checking line, the digit count, the clear-soon reminder and the receipt's saved line are `role="status"`. Each new clock screen focuses its heading. A card that replaces the form (offline, not reached, paused, punches off) now focuses its heading too.
- **Targets**: 56px or more on every kiosk control. Before: links, the language switch, the back arrow, Reference and the help buttons were 48px. The capture finds none under 56px on any kiosk state.
- **Small tablet** (800x600): the PIN step did not fit before (Continue was cut, the language switch was off screen). It fits now with 56px keys.
- **768px height**: the PIN step is exactly 768px tall, so any tablet with a status bar had to scroll. The short-landscape layout now starts at 767px instead of 700px. At 768px and taller nothing changes.
- **Text at 200%** (512x384 at 2x): no sideways scroll and nothing clipped on the ID, PIN and clock screens.
- **axe-core 4** (WCAG 2 A and AA, 2.1, 2.2, best practice) on ID step, PIN step, wrong entry, clock screen, receipt, unconfirmed, saved help, person lockout, offline, offline punch, error screen, not found, punches off, paused: **0 violations** in English and in Spanish. Before: 1 on the not-found page (11px grey text, contrast 3.55). That lockup is gone.

## 4. States

| Screen | State | How produced | Evidence (each also `-768x1024` and `-es`) |
|---|---|---|---|
| ID step | empty | real | `kiosk-id-step-1024x768.png` |
| PIN step | empty, two digits, key pressed | real | `kiosk-pin-step-`, `kiosk-pin-two-digits-`, `kiosk-pin-mid-press-` |
| PIN step | wrong entry | real (401 from the local server) | `kiosk-wrong-entry-` |
| PIN step | checking | real, reply delayed in the browser | `kiosk-pin-checking-1024x768.png` |
| Gate | person paused | real: five wrong tries | `kiosk-lockout-person-` |
| Gate | tablet paused | real: wrong tries until the limit | `kiosk-lockout-tablet-` |
| Gate | offline | real: the browser context set offline | `kiosk-offline-`, `kiosk-back-online-1024x768.png` |
| Gate | server not reached | forced: request aborted | `kiosk-server-unreachable-` |
| Gate | server unavailable (503) | forced reply | `kiosk-server-unavailable-` |
| Gate | cannot reach on clear | forced: request aborted | `kiosk-cannot-reach-on-clear-` |
| Gate | tablet needs setup | real: the tablet's cookies cleared | `kiosk-tablet-needs-setup-` |
| Gate | verified, punches off | real: the app run with punches off | `kiosk-punches-off-` |
| Clock screen | off clock, clocked in, on break, no break types, other location | real | `kiosk-ready-*` |
| Clock screen | choose a break, confirm clock out (also on a break) | real | `kiosk-choose-break-`, `kiosk-confirm-clock-out-` |
| Clock screen | recording | real, reply delayed | `kiosk-sending-1024x768.png` |
| Clock screen | offline note | real: context offline | `kiosk-ready-offline-` |
| Clock screen | not confirmed | forced: `execute` aborted; and real offline | `kiosk-unconfirmed-clock-in-`, `kiosk-offline-punch-unconfirmed-` |
| Clock screen | others saved | real journal, after the forced abort above | `kiosk-unconfirmed-clock-out-others-saved-` |
| Clock screen | send it again, then recorded | real | `kiosk-send-it-again-`, `kiosk-offline-punch-after-reconnect-`, `kiosk-offline-punch-recorded-` |
| Clock screen | saved punch from the journal, no longer sendable | real (clocked in on another tablet) | `kiosk-unconfirmed-from-journal-`, `kiosk-earlier-punch-not-recorded-` |
| Clock screen | time not loaded | forced: request aborted | `kiosk-time-not-loaded-` |
| Clock screen | PIN again | forced 401 | `kiosk-pin-again-` |
| Clock screen | tablet cannot save | forced: storage blocked in the browser | `kiosk-tablet-cannot-save-` |
| Clock screen | privacy reminder | real | `kiosk-privacy-warning-` |
| Receipt | clock in, break start, break end, clock out | real | `kiosk-receipt-*` |
| Saved help | open, asked | real (the request reaches the local server) | `kiosk-saved-help-`, `kiosk-saved-help-asked-` |
| Photo step | photo, recorded without photo | forced policy (no camera) | `kiosk-photo-for-clock-out-`, `kiosk-photo-time-recorded-` |
| Error screen | error, error offline | forced render failure in the browser | `kiosk-error-screen-`, `kiosk-error-screen-offline-` |
| Not found | wrong key | real | `kiosk-not-found-` (also 800x600 and 390x844) |
| Paused | paused, could not be checked | real redirect with billing on and no billing service | `kiosk-paused-`, `kiosk-paused-not-checked-` |
| Small tablet | ID, PIN, clock screen, receipt | real | `kiosk-small-tablet-*-800x600.png` |
| High Contrast | ID focus, PIN focus, key focus, action focus, receipt | real, forced colours | `kiosk-high-contrast-*` |
| Reduced motion | wrong entry, receipt mark | real, reduced motion | `kiosk-reduced-motion-*` |
| Text 200% | ID, PIN, clock screen | real | `kiosk-text-200-*` |

Unit tests only: the punch sentences for codes the local server did not send in the run (all except the 401s), and the no-code fallbacks.
Setup screens in the folder (`kiosk-setup-*`) are builder B's screen as it was at my commit. They are there because the journey passes through them.

## 5. Keyboard and focus

- ID step: focus starts in the field. Tab: Continue, language. Enter moves to the PIN.
- PIN step: focus in the PIN field. Shift+Tab: back arrow. Tab: 1 to 9, Clear, 0, Delete, Continue, language. Enter submits. Escape clears and returns to the ID.
- Wrong entry: focus stays in the PIN field. The message is announced. Typing starts a new PIN.
- Clock screen: heading, the main action, Done, Refresh, "Something didn't save?".
- A card that replaces the form: focus on its heading. Logged: `offlineFocus: "H1 No connection"`.
- Not found: language switch, Try again, the legal links.
- Pictures: `kiosk-keyboard-id-field-`, `kiosk-keyboard-key-`, `kiosk-keyboard-error-`, `kiosk-keyboard-back-`, `kiosk-keyboard-ready-`, `kiosk-keyboard-not-found-toggle-`.
- Not tested: a real switch device and a real screen reader.

## 6. English and Spanish

The kiosk is bilingual on screen. Every new string is in `clocker-copy.ts` with its Spanish line, and both languages were captured through the whole journey. Tests render the receipt, the not-found page, the paused page and the error screen in Spanish and check that no English leaks. Spanish follows the kiosk's existing voice (tú).
Two things stay in English on a Spanish tablet, as before: "Powered by VELANI LLC" on the band and the menu path "Settings, Clocker tablets" (the Owner's screens are English).

## 7. Copy

No payroll sentence. Old to new first, then every new string.

| Was | Now |
|---|---|
| Check your last action | Check your last punch |
| Check action status | Check if it saved |
| Retry same action | Send it again |
| Recording your action… | Recording… |
| Clock state unavailable | We couldn't load your time |
| Browser storage needed | This tablet can't save right now |
| Previous action needs review | Someone else's punch is waiting |
| Verify your PIN again | Enter your PIN again |
| Review your current status / Review current status | See your current status / See current status |
| Checking tablet verification… | Checking… |
| Keep this screen open while the action is checked. | Keep this screen open while it saves. |
| Reading the latest saved information. | Getting your latest time. |
| Ask Owner to review / Requesting review… / Review requested / Retry original review request | Ask Owner to check / Asking… / Request sent / Ask again |
| Review request reference | Request reference |
| No break types are configured. Ask your Owner to add one. | There are no breaks to choose here yet. Ask your Owner to add one. |
| Your PIN is verified for this tablet. | Your PIN works on this tablet. |
| Time punches are not enabled yet. No worked time has been recorded. Ask your Owner to contact NEVORA support. | Clocking in is not turned on for this workplace yet. Nothing was recorded this time. Your Owner can ask NEVORA support to turn it on. Until then, ask a manager to record your time. |
| Enjoy your break. / Welcome back. | Enjoy your break, James. / Welcome back, James. (the approved lines stay when there is no name) |
| Clocked in (label on Clock out?) | Clocked in at (Spanish was "En turno", now "Entrada") |

Every new string:

**Errors by stable code (item 1): each says what happened and what to do next. The kiosk's way out is a manager.**

| English | Spanish |
|---|---|
| We couldn’t check your PIN. Try again, or ask a manager to record your time. | No pudimos verificar tu PIN. Inténtalo de nuevo o pide a un gerente que registre tu tiempo. |
| This tablet is no longer set up for this location. | Esta tableta ya no está configurada para esta ubicación. |
| This tablet’s link is not valid. Ask a manager to set up this tablet again. | El enlace de esta tableta no es válido. Pide a un gerente que vuelva a configurar esta tableta. |
| This tablet did not open the Clocker from its own link. Ask a manager to open it again. | Esta tableta no abrió Clocker desde su propio enlace. Pide a un gerente que lo abra de nuevo. |
| Your PIN check ran out. Enter your Employee ID and PIN again. | La verificación de tu PIN venció. Ingresa tu ID de empleado y tu PIN de nuevo. |
| Your PIN check ran out. Enter your PIN again. A punch that isn’t confirmed stays saved on this tablet. | La verificación de tu PIN venció. Ingresa tu PIN de nuevo. Una marcación sin confirmar queda guardada en esta tableta. |
| We couldn’t confirm that. Ask a manager to record your time. | No pudimos confirmarlo. Pide a un gerente que registre tu tiempo. |
| This tablet sent something NEVORA couldn’t read. Go back and try again, or ask a manager to record your time. | Esta tableta envió algo que NEVORA no pudo leer. Vuelve e inténtalo de nuevo, o pide a un gerente que registre tu tiempo. |
| Your time changed since this screen loaded. | Tu tiempo cambió desde que se cargó esta pantalla. |
| This punch doesn’t match what NEVORA has. Ask a manager to check it. | Esta marcación no coincide con lo que tiene NEVORA. Pide a un gerente que la revise. |
| That can’t be recorded from where you are now. | Eso no se puede registrar desde tu estado actual. |
| Your shift is open at another location. Use the tablet there, or ask a manager. | Tu turno está abierto en otra ubicación. Usa la tableta de allá o pregunta a un gerente. |
| Your time records need a manager’s check. Nothing was changed. Ask a manager to record your time. | Tus registros de tiempo necesitan que un gerente los revise. No se cambió nada. Pide a un gerente que registre tu tiempo. |
| The time on NEVORA’s side doesn’t match your records. Nothing was changed. Ask a manager to record your time. | La hora de NEVORA no coincide con tus registros. No se cambió nada. Pide a un gerente que registre tu tiempo. |
| That break is no longer offered. Go back and choose another one. | Ese descanso ya no está disponible. Vuelve y elige otro. |
| The schedule changed while this was being recorded. | El horario cambió mientras esto se registraba. |
| New clock-ins are paused for this workplace. Your Owner can restore access. Ask a manager to record your time. | Las nuevas entradas están pausadas en este negocio. El dueño puede restablecer el acceso. Pide a un gerente que registre tu tiempo. |

**Offline and unconfirmed (item 5, RA-6 and MK-8): what is and is not saved, what to do now, and that the tablet checks again.**

| English | Spanish |
|---|---|
| This tablet is offline, so nothing can be recorded right now. | Esta tableta no tiene conexión, así que ahora no se puede registrar nada. |
| Tell a manager so your time gets recorded. | Avísale a un gerente para que registre tu tiempo. |
| This screen comes back by itself when the connection returns. | Esta pantalla vuelve sola cuando regrese la conexión. |
| We couldn’t reach NEVORA, so your PIN was not checked. Nothing was recorded. | No pudimos conectar con NEVORA, así que tu PIN no se verificó. No se registró nada. |
| This tablet can’t reach NEVORA right now. Nothing can be recorded until it does. | Esta tableta no puede conectar con NEVORA en este momento. No se puede registrar nada hasta que lo logre. |
| This tablet checks again by itself. | Esta tableta vuelve a comprobar sola. |
| We couldn’t load your time, so nothing was recorded. Tell a manager if you need your time recorded now. | No pudimos cargar tu tiempo, así que no se registró nada. Avísale a un gerente si necesitas que registre tu tiempo ahora. |
| Your clock in at {time} is not confirmed yet. | Tu entrada ({time}) aún no está confirmada. |
| Your clock out at {time} is not confirmed yet. | Tu salida ({time}) aún no está confirmada. |
| Your break start at {time} is not confirmed yet. | El inicio de tu descanso ({time}) aún no está confirmado. |
| Your break end at {time} is not confirmed yet. | El fin de tu descanso ({time}) aún no está confirmado. |
| Your clock in is not confirmed yet. | Tu entrada aún no está confirmada. |
| Your clock out is not confirmed yet. | Tu salida aún no está confirmada. |
| Your break start is not confirmed yet. | El inicio de tu descanso aún no está confirmado. |
| Your break end is not confirmed yet. | El fin de tu descanso aún no está confirmado. |
| This tablet kept the attempt and will not record it twice. Tell a manager now, then tap Check if it saved. | Esta tableta guardó el intento y no lo registrará dos veces. Avísale a un gerente ahora y luego toca Revisar si se guardó. |
| No connection. This tablet checks again by itself when it returns. | Sin conexión. Esta tableta vuelve a revisar sola cuando regrese. |
| No connection. Wait for it to return before you clock in or out, or tell a manager. | Sin conexión. Espera a que regrese antes de marcar, o avísale a un gerente. |
| Your time is recorded. This tablet could not clear its saved copy; ask a manager to check the tablet. | Tu tiempo está registrado. Esta tableta no pudo borrar su copia guardada; pide a un gerente que revise la tableta. |

**Saved for later (item 3): a count of other people's saved punches, never whose they are.**

| English | Spanish |
|---|---|
| 1 more saved on this tablet. | 1 más guardada en esta tableta. |
| {count} more saved on this tablet. | {count} más guardadas en esta tableta. |
| Each person can check their own after their PIN. | Cada persona puede revisar la suya después de ingresar su PIN. |

**Plain words in place of system words (item 9).**

| English | Spanish |
|---|---|
| Check your last punch | Revisa tu última marcación |
| Check if it saved | Revisar si se guardó |
| Send it again | Enviar de nuevo |
| We haven’t confirmed your last punch yet. Tap Send it again; it won’t record twice. | Aún no hemos confirmado tu última marcación. Toca Enviar de nuevo; no se registrará dos veces. |
| Recording… | Registrando… |
| Keep this screen open while it saves. | Mantén esta pantalla abierta mientras se guarda. |
| Getting your latest time. | Consultando tu tiempo más reciente. |
| We couldn’t load your time | No pudimos cargar tu tiempo |
| This tablet can’t save right now | Esta tableta no puede guardar ahora |
| Someone else’s punch is waiting | La marcación de otra persona está pendiente |
| The person before you has a punch that isn’t confirmed on this tablet. Ask them to enter their PIN again. Nothing was recorded for you. | La persona anterior tiene una marcación sin confirmar en esta tableta. Pídele que ingrese su PIN de nuevo. No se registró nada para ti. |
| See your current status | Mira tu estado actual |
| See current status | Ver estado actual |
| Your earlier punch was not recorded and can no longer be sent. See your current status, then choose what to do. | Tu marcación anterior no se registró y ya no se puede enviar. Mira tu estado actual y luego elige qué hacer. |
| There are no breaks to choose here yet. Ask your Owner to add one. | Aquí aún no hay descansos para elegir. Pide al dueño que añada uno. |
| Something of yours is saved on this tablet for checking. Ask your Owner to check it. You can leave this screen; it stays saved. | Hay algo tuyo guardado en esta tableta para revisión. Pide al dueño que lo revise. Puedes salir de esta pantalla; queda guardado. |
| Ask Owner to check | Pedir al dueño que revise |
| Asking… | Enviando… |
| Request sent | Solicitud enviada |
| Ask again | Pedir de nuevo |
| Request reference | Referencia de la solicitud |
| Sending the request. | Enviando la solicitud. |
| Your Owner will see it under Clocker recovery. | El dueño la verá en Recuperación de Clocker. |
| We couldn’t confirm the request. Ask again; it won’t send twice. | No pudimos confirmar la solicitud. Pide de nuevo; no se enviará dos veces. |
| Your punch is not confirmed yet. Tap Check if it saved before doing anything else. | Tu marcación aún no está confirmada. Toca Revisar si se guardó antes de hacer otra cosa. |
| Getting ready… | Preparando… |
| Enter your PIN again to check a punch that isn’t confirmed. | Ingresa tu PIN de nuevo para revisar una marcación sin confirmar. |
| Photo preview | Vista previa de la foto |
| The camera is off. Use this photo to record your time. | La cámara está apagada. Usa esta foto para registrar tu tiempo. |
| Your time is recorded. The photo is not confirmed yet; checking it will not record your time twice. | Tu tiempo está registrado. La foto aún no está confirmada; revisarla no registrará tu tiempo dos veces. |

**Punches off for the workplace (item 7, JR-26): what it means and who can turn it on.**

| English | Spanish |
|---|---|
| Your PIN works on this tablet. | Tu PIN funciona en esta tableta. |
| Clocking in is not turned on for this workplace yet. | El registro de tiempo aún no está activado para este negocio. |
| Nothing was recorded this time. | Esta vez no se registró nada. |
| Your Owner can ask NEVORA support to turn it on. Until then, ask a manager to record your time. | El dueño puede pedir al soporte de NEVORA que lo active. Mientras tanto, pide a un gerente que registre tu tiempo. |
| Until then, ask a manager to record your time. | Mientras tanto, pide a un gerente que registre tu tiempo. |

**The receipt (item 4): the first name on every line, and the next useful fact the reply carries.**

| English | Spanish |
|---|---|
| Enjoy your break, {first}. | Disfruta tu descanso, {first}. |
| Welcome back, {first}. | Qué bueno verte de vuelta, {first}. |
| Clocked in at | Entrada |
| Break started at | Inicio del descanso |
| Break length | Duración del descanso |
| Break type | Tipo de descanso |
| Suggested length | Duración sugerida |
| {minutes} min | {minutes} min |

**Accessibility (item 10): the entered count, never the digits.**

| English | Spanish |
|---|---|
| {count} of 4 digits entered | {count} de 4 dígitos ingresados |

**The Clocker's own not-found page (item 8).**

| English | Spanish |
|---|---|
| This time clock link doesn’t work | El enlace de este reloj de asistencia no funciona |
| Error 404 | Error 404 |
| A manager or Owner can fix it | Un gerente o el dueño puede arreglarlo |
| They set up this tablet again with the current link, in Settings under Clocker tablets. | Vuelven a configurar esta tableta con el enlace actual, en Settings, en Clocker tablets. |

The old keys stay in the file. Builder B's setup screen and older tests still read some of them.

## 8. Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: `src` clean.
- `npx eslint` on every changed and new `.ts` and `.tsx` file: clean.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 900 files passed, 24 skipped, 13,740 tests passed, 0 failed.
- All three were run again after the last edit, with the same results. Kiosk tests alone: `npx vitest run src/components/clocker src/app/clocker`: 13 files, 116 tests, all pass. New file `clocker-phase6.test.tsx` (19 tests). Changed: `clocker-pin-gate.test.tsx` (19), `clocker-punch-panel.test.tsx` (8), `clocker-page.test.tsx` (7).
- `git apply --check -R p6patches/a.patch` in the worktree: the patch matches the commit (20 files, 825 lines added, 143 removed).
- Browser journey, real app on an owned local Postgres with fictional data (`sparse` workspace): before in English; after in English and Spanish at 1024x768 and 768x1024 with the extra states; punches off in both languages; paused page in both languages.
- I looked at the screenshots at both sizes in both languages, the small tablet, High Contrast and 200% text.

Notes on how it was run:
- The capture ran from a second detached worktree, `wt/p6a-cap`, kept at the same commit as `wt/p6a`, so I could keep working while a run was going (a capture fails if any source file changes during it; my first before run lost its log that way and was run again). I removed that worktree at the end.
- The `owner` role's fictional workspace has people already clocked in, which breaks the clock-in step. I used `sparse` (three people: Maria, James, Ana).
- Which commit each capture shows: both journeys are at `5b89eba4`; the punches-off screens are at the final commit `76a1a536`; the paused page is at `9f7de67a`. Between `5b89eba4` and the final commit only one sentence changed ("Nothing was recorded this time.", on the punches-off screen). Between `9f7de67a` and `5b89eba4`: kiosk stylesheet rules that the paused page does not use, and one test.
- My updated capture flow is at `p6a-work/clocker-flow.phase6.ts` in the scratch root (also in `wt/p6a/zz-scan/`). It adds the Employee ID step, the request count, axe, High Contrast, offline, the small tablet, 200% text, both lockouts, and two modes: `NEVORA_SCAN_CLOCKER_FLOW=preview` (punches off) and `=paused` with `NEVORA_SCAN_COMMERCE=1` (one line added to the scan test, copy at `p6a-work/owner-mobile-scan.integration.phase6.ts`). It is not in the patch.

Not run: a production build, a real iPad, a real screen reader, a real switch, Windows High Contrast itself (Chromium's emulation only), the `scripts/*.mjs` kiosk scripts.

## 9. For Codex

1. **Four punch replies have no code** (`punch-transport.server.ts`): punches disabled (503), origin refused (503 or 403), wrong header (403), tablet not registered (401). The kiosk reads the first three as "not confirmed" and the last as "enter your PIN again". Codes such as `PUNCH_DISABLED`, `ORIGIN_REJECTED` and `DEVICE_REQUIRED` would let it say the right thing at once. `postPunch` in `punch-client.ts` turns a missing code into `UNAVAILABLE`.
2. **Receipt facts the reply does not carry**: the scheduled end of the shift on clock in ("Your shift ends at 5:00 PM") and worked time today on clock out. A field on the receipt would be enough. Nothing for the week and nothing about pay.
3. **A default language for each tablet** (RA-13): a field on the device, returned by the setup `status` reply. The kiosk would use it when the tablet has no choice of its own.
4. **Reload with no connection** (RA-6): needs a service worker for `/clocker/` (the portal's is scoped to `/app`), with the kiosk page for the tablet's key, its scripts, styles and `fonts/clocker/inter-variable.ttf` kept for offline use. The page is `force-dynamic`, so what may be served from a cache is a server decision. Queued punches need server rules as well (which clock is trusted, how late a punch may arrive).
5. **The journal keeps no time for an attempt**, so after a reload the kiosk cannot say "at 9:02 AM". An `attemptedAt` in the journal record would fix that (`recovery-journal.ts`).
6. **Scripts that press the old names** will fail: `scripts/clocker-ipad-ui-qa.mjs`, `clocker-journal-mounted-browser.mjs`, `clocker-staging-acceptance.mjs`, `phase-c-punch-ui-qa.mjs`, `phase-d-browser-qa.mjs`, `payroll-workflow-ui-qa.mjs`, `document-appearance-browser.mjs`, `src/test/integration/shift-change-phase3-facts.integration.ts`. New names: "Check if it saved", "Send it again", "See current status", "Ask Owner to check", "Check your last punch". The punches-off note is found by `[data-clocker-punches-off]`.
7. The server's own sentences are no longer shown on staff screens, so their wording no longer matters there. The setup screen still reads them (builder B).

## 10. For Jose to decide

1. **The first name on the two break lines.** "Enjoy your break, James." and "Welcome back, James." You approved the lines without the name. I added it because every receipt should say whose it is.
2. **A fresh Spanish tablet now starts in Spanish.** Before, every tablet started in English. An Owner setting for each tablet is still the better answer (Codex 3).
3. **Does the language reset after each person?** Today the choice stays for the next person. I kept that.
4. **The not-found page has no sign-in link now.** Round 1 kept a quiet "Not a time clock? Go to sign in". A wrong link under `/clocker/` is a tablet, so I removed it. The one button is "Try again".
5. **"Not confirmed" instead of "not saved".** Your example said "is not saved yet". The kiosk cannot know that: the punch may have arrived. It says "is not confirmed yet" and that the tablet kept the attempt.
6. **The offline card says nothing is recorded.** Queued offline punches are not built. That is your call with Codex.
7. **Targets went from 48px to 56px** for links, the language switch, the back arrow and Reference. The PIN step on a tablet under 768px tall now uses the 64px keys it used under 700px.
8. **"Ask Owner to check" is now the quiet button**, so each screen keeps one filled teal button.
9. **Automatic checks.** The kiosk checks the connection every 20 seconds while it shows "No connection", and checks a waiting punch when the connection returns. It never sends a punch by itself.

## 11. Needed from another package

- `src/components/commerce-recovery/recovery.module.css` (billing pages): the paused page's "Try Clocker again" button is 52px. The kiosk floor is 56px.
- `src/app/not-found.css` (public pages): the legal links under the kiosk's not-found card are 42px tall.
- `clocker-setup.tsx` (builder B): it still draws the server's sentence. `clockerErrorText` is unchanged for it. Its "Timekeeping is not available yet." note could reuse the new punches-off wording.
- `clocker-copy.ts` is shared with builder B. My strings are one block at the end of the map and my functions are at the end of the file.
- `DESIGN.MD` (not in my files). Lines to update in the Clocker section: targets are 56px; keys 56px on a small landscape tablet; the short-landscape layout starts at 767px; the forced-colours rules; the offline card and its automatic check; "not confirmed" wording; receipt facts and names; the not-found page; the paused page's switch; a fresh tablet's language; the new button names.

## 12. Not verified

- A production build: the request count there (one `state`, not two) is from reading the code.
- Real devices: iPad Safari, the on-screen keyboard over the ID field, VoiceOver, a switch, Windows High Contrast.
- `navigator.onLine` on a network that is connected but reaches nothing: the kiosk then shows the "not reached" card after a failed request, not the offline card. That path was captured with aborted requests only.
- The punch sentences for codes the local server did not produce in the run. They are unit tested.
- The photo step with a real camera.
