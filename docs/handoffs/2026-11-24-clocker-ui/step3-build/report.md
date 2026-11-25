# Clocker UI step 3, built: name tiles on a picker-mode tablet (Option C)

Jose picked Option C on Nov 25, 2026. Its wording is "Use employee ID" / "Usar ID de empleado"; the kiosk's term wins and
"núm." isn't used. Built on `claude-codex-collab-nevora-clocker-states` from the shared tip 9a5dc761, with Codex's
backend unchanged:
- **Roster:** `{action:'roster'}`.
- **Verify:** `{action:'verify', selection, pin}`.

Code and shots are in separate commits. Fictional data only, on a throwaway local database.

## Commits
| Hash | What |
|---|---|
| `b6470dfb` | Picker, roster model, copy table, wiring into the PIN screen, tests |
| `005ed0da` | Only the button sticks on a phone; focus stays clear of it (after the first browser pass) |
| `ba3f559a` | Scan tool: `NEVORA_SCAN_CLOCKER_FLOW=names` verification mode |
| shots commit | This report and `img/` |

## What a person sees on a picker-mode tablet
- **Sign-in: "Choose your name".**
  - Every name the server sends ("Ana C.") is a 64px tile with its initials in a white disc, in alphabetical order.
    Jose's decisions: no photos, and the initials discs stay.
  - The grid is three columns at 768, two at 1024 beside the band, and one at 390.
  - A search field appears only above 12 names. It matches the start of any word, ignoring accents and case ("luc" finds
    "Lucía O."). With no match, the line reads "No name matches. Use your employee ID."
- **The way out.** "Not on the list? Use your employee ID." sits above the "Use employee ID" button.
  - On the iPad everything fits one screen in both orientations.
  - On a 390 phone the button sticks to the bottom of the card while the names scroll under it, at its full height
    (56px). Only the button sticks; the hint stays in the flow, so at 200% text the sticky part is one button, not a
    third of the screen.
  - Scroll padding keeps a focused name from hiding under the button.
- **The PIN step.** It shows the chosen name under "Enter your PIN". The back arrow is "Choose another name", and it
  returns to the names with focus on the chosen one.
  - A wrong PIN for a chosen name says "PIN not recognized. Try again or ask your manager to check your PIN." (the
    kiosk's existing sentence). The name stays on screen.
  - The keypad, lockout, receipts and the 30-second clear are unchanged.
- **Use employee ID.** It opens today's Employee ID form, which has a back arrow, "Back to names". The Employee ID path
  and its request are unchanged.
- **Duplicate names.** The server leaves both "Luis S." out, so the hint is their answer; Luis Santos signs in by his ID.
- **A stale name.** The server answers a stale selection exactly like a wrong PIN (401 `PIN_DENIED`). So after a denied
  chosen name, the kiosk reads the roster again:
  - If the name is gone, the names return with one plain line, "The list changed. Choose your name again."
  - If the name is still there, it was the PIN.
- **Fallbacks.**
  - A tablet not in picker mode, or an empty list, shows the Employee ID form as today.
  - A failed read shows the same form with "Names couldn’t load. Use your employee ID."
  - Until the first answer arrives, the form waits (disabled), so a picker tablet never takes a stray tap on it.

## Roster memory (as the handoff and the UI guide require)
- **Read** on entering sign-in and on every start over: Done, Escape, the 20-second idle clear, and the private screen
  closing.
- **Kept** in React state only, never in storage. The chosen selection lives in a ref, like the typed Employee ID.
- **Dropped** on leaving sign-in: a verified person, a blocked or offline card, the tablet losing its setup (the 401
  `device_required` card), a location switch, and `visibilitychange` to hidden. Coming back reads the roster again.
- **Late replies** for an older read are discarded (a generation counter plus a per-effect `live` flag).
- **A mode switch on the server** shows on the next read (`employee_id` gives the form).

## Copy (`src/components/clocker-roster-copy.ts`, { en, es }, tú)
| Key | English | Spanish |
|---|---|---|
| title | Choose your name | Elige tu nombre |
| names | Names (list label) | Nombres |
| search | Search names | Buscar nombre |
| useId | Use employee ID | Usar ID de empleado |
| notListed | Not on the list? Use your employee ID. | ¿No apareces? Usa tu ID de empleado. |
| noMatch | No name matches. Use your employee ID. | Ningún nombre coincide. Usa tu ID de empleado. |
| failed | Names couldn’t load. Use your employee ID. | No se pudieron cargar los nombres. Usa tu ID de empleado. |
| stale | The list changed. Choose your name again. | La lista cambió. Elige tu nombre otra vez. |
| back | Choose another name | Elegir otro nombre |
| backToNames | Back to names | Volver a los nombres |

The kiosk's existing form still says "Enter your Employee ID" (capital E). The new lines use Jose's "employee ID" casing.
One casing everywhere is a later copy decision.

## Tests
- `src/components/clocker-roster.test.tsx` (12):
  - **Roster reply:** read strictly; an empty or malformed list falls back to the ID form, and a non-object reply is a
    failure.
  - **Request bodies:** exactly one of `employeeId` or `selection`. The gate uses `verifyBody`.
  - **Roster read:** a one-key `{action:'roster'}` body with the kiosk headers; it fails on 401 and on a network error.
  - **Search and initials:** sort, accent-free search, and initials.
  - **Rules:** the stale-selection rule and the late-reply rule.
  - **Copy:** EN/ES keys match, tú is used, "ID de empleado" is used, "núm." isn't.
  - **Picker render:** tiles, initials, no search at 12 names, search at 13, the stale line and the Spanish words.
  - **Form wait:** the ID form waits for the roster.
  - **Lifecycle wiring:** the sign-in condition, the clear on leaving, hidden and location switch, the re-read on start
    over, and the stale path.
  - **CSS:** only the button sticks, and the scroll padding is set.
- `clocker-pin-gate.test.tsx`: the body assertion now checks `verifyBody(...)`.
- `node scripts/run-rstest.mjs run src/components` on the final code: 3,320 passed, 0 failed.
- tsc and oxlint are clean.

## Browser verification
Production build, owned https origin, Chromium, `NEVORA_SCAN_CLOCKER_FLOW=names`. Fictional enrolled "Front counter
iPad", switched with Codex's `setClockerDeviceSignInMode`.
- **44 view checks:** 768×1024 and 1024×768 primary, plus 390 at 100% and 200% text, in EN and ES. Covered: sign-in,
  PIN, Use employee ID, roster failure, stale, duplicate, wrong PIN, and search at 13 names.
  - Horizontal overflow: none.
  - Under 44px: none.
  - Reach: every control reached at ±21.5px by `elementFromPoint`. The only exception is the hidden "Skip to time
    clock" link, which is off-screen until focused.
  - The only clipped text is screen-reader-only labels.
- **The way out at 390:** in view and on top (`elementFromPoint` hits it) at the top of the list and mid-list, at 100%
  and 200%, EN and ES.
- **axe** (WCAG 2.0/2.1/2.2 A and AA), 18 page checks: 0 violations, with one exception.
  - **The exception:** `target-size` on the stale screen at 390. The extra line moves the list, so the tile at the
    screen's bottom edge is mostly behind the sticky button.
  - That's the sticky pattern Jose chose: scrolling reveals the tile, and keyboard focus never lands under it (next
    check). It's reported, not suppressed.
- **Focus not obscured at 390** (100% and 200%): Tab through all 12 names; every focused tile's centre and lower edge are
  the tile itself.
- **Focus walk (768):**
  - The 12 names in order, then Use employee ID, then the language. Every stop has a 3px teal ring.
  - Enter on "Carlos V." opens the PIN step with focus in the PIN field.
  - Shift+Tab reaches "Choose another name"; Enter returns to the names with focus on "Carlos V."
- **Reduced motion:** on sign-in (a tile hovered) and the PIN step, there are no animations, no transitions and nothing
  running.
- **End to end, Ana C. by name:**
  - "Hi, Ana.", Clock in, receipt, Done.
  - Then Ana C. again, Clock out, receipt, Done.
  - The database shows one entry: clock in 03:08:43Z, clock out 03:08:46Z, `CLOCKED_OUT` (`img/e2e-*`).
  - While she was verified, no names were in the page. After Done, the roster was read once more.
- **Use employee ID:** James Ortiz by his ID reaches "Hi, James." (`img/useid-ready-768x1024`).
- **Duplicate:** no "Luis" tile. Luis Santos signs in by Use employee ID and his ID: "Hi, Luis."
  (`img/duplicate-ready-768x1024`).
- **Stale name:** Miguel S. is chosen, then renamed on the server to a third "Luis S.", so the server leaves him out.
  - His correct PIN is denied, the roster is read once more, and the names return without him and with "The list
    changed. Choose your name again." (`img/stale-*`).
- **Roster failure:** the roster request is aborted. The ID form shows "Names couldn’t load. Use your employee ID.", and
  James still signs in by ID (`img/failed-*`, `img/failed-es-*`).
- **Wrong PIN for a chosen name:** "PIN not recognized. Try again or ask your manager to check your PIN." with Beatriz
  M. still shown (`img/wrong-pin-*`).
- **Memory:**
  - Hidden: the tiles are gone (0).
  - Visible again: one fresh read.
  - Escape: one fresh read.
- **Request bodies seen:** `roster:{action}`, `clear:{action}`, `verify:{action,pin,selection}`,
  `verify:{action,employeeId,pin}`. Never both employeeId and selection.

**Not run.**
- WebKit isn't installed here: Chromium is preinstalled and the setup forbids `playwright install`. QA should do a
  Safari/iPadOS pass, especially for the sticky button, `:has()` scroll padding and the on-screen keyboard over search.
- A real iPad, and touch scrolling momentum under the sticky button.
- A late roster reply racing a newer one: the unit test covers the rule, and it isn't forced in the browser.

## Images (`img/`)
- **Sign-in:** `signin-*`, `signin-es-*` (390 also as `-full`).
- **PIN:** `pin-*`, `pin-es-*`, `wrong-pin-*`.
- **Use employee ID:** `useid-*`, `useid-es-*`, `useid-ready-768x1024`.
- **Duplicate:** `duplicate-*`, `duplicate-ready-768x1024`.
- **Stale:** `stale-*`.
- **Search:** `search13-*`, `search-luc-768x1024`, `search-none-768x1024`.
- **Roster failure:** `failed-*`, `failed-es-*`.
- **Focus:** `focus-back-768x1024`, `focus-return-768x1024`.
- **End to end:** `e2e-ready-in`, `e2e-clocked-in`, `e2e-clocked-out` (768×1024).

## Open points
- **Casing:** "Use employee ID" (new) beside "Enter your Employee ID" (existing form). Should one casing win?
- **390 at 200% text in Spanish:** "Usar ID de empleado" wraps to two lines, so the sticky button is 109px tall. One
  name shows above it at the top of the list, and the rest scroll.
- **The Owner's control for picker mode** is step 2 and isn't built here.
