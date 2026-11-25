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

## Motion (added Nov 25, at Jose's request: more premium through motion only)
Tiles, colours and the PIN layout are as captured above. GSAP (`src/components/clocker-motion.ts`) follows the design OS:
- transform and opacity only, with the b-tokens durations and `expo.out`;
- nothing over 0.6s, and nothing blocks a tap;
- each screen kills the motion it started on unmount or a screen change.

| Commit | What |
|---|---|
| `598b16e0` | Motion code and `clocker-motion.test.ts` |
| `b9c829f4` | Scan tool: `NEVORA_SCAN_CLOCKER_FLOW=motion` |
| shots commit | `motion/`: stills, reduced-motion end states, the recording |

1. **Shared name (FLIP).** The tapped tile's name is measured, then the name under "Enter your PIN" moves from there into
   place (0.30s, slight scale). "Choose another name" moves it back into its tile.
   - Measured after the PIN step's own scroll, before paint.
   - Mid-flight at 110ms, the name is still 21px from home; at 500ms it has landed (`flip-*`, `flip-back-*`).
2. **Tiles settle.** On entering sign-in, the tiles settle in with opacity and 6px of movement, 0.02s apart, capped at 8
   steps. All are done by 0.38s (tested for a list of 30), and the name coming home is left out (`settle-*`).
   - It uses opacity, not visibility, so tiles take taps at once: a tap on "Ana C." during the settle opened the PIN step.
3. **PIN dots.** A new digit's dot springs from 0.55 to 1 in 0.24s (`back.out(1.2)`): 0.55 at the start, 0.99 at 90ms,
   none at 450ms (`dot-*`).
   - A wrong PIN shakes the dots, not the field: −6, 5, −3, 2, 0px in 0.26s, beside the unchanged error text
     (`shake-*`).
   - This replaces the field's CSS keyframe shake, which was 8px on the whole field.
   - **For Jose:** the spring's slight overshoot is the only one on the kiosk; the design OS bans overshoot on work
     screens, and this was asked for.
4. **Done mark.** On the first "Hi, Ana." after a verified PIN, a done mark sits on the person's initial, out of flow.
   It settles from 0.6 and draws its tick, then the greeting fades in. Focus is on the heading from the start.
   - Frame by frame: the disc is at 0.6 and opacity 0 at 0ms and settled by 300ms. The tick is drawn by 200ms. The
     greeting goes from 0 at 150ms to 0.76 at 250ms and 1 by 450ms (`done-*`).
   - It's the kit's `BDoneMark` markup and class with kiosk styles. The kit module isn't imported because it brings
     owner-b.css (88 KB, including unscoped rules such as `.b-screen { display: none }`) into the kiosk.

**Reduced motion.** Every function returns null and touches nothing, so the state is drawn at once with no transform.
`reduced-*` shows each end state at 0ms:
- the computed transform is `none` on the chosen name, the dots and the mark;
- the mark's frames are steady from the first frame;
- the motion probe finds no animations, transitions or running animations.

**Layout shift.** The motion adds none. The full-motion and reduced-motion runs record the same shifts, and every source
is the kiosk shell's card resizing between screens (`.task`, `.when`, `.foot`).
- Most come right after a tap and don't count toward CLS: names to PIN 0.08, PIN to "Hi" 0.40 and 0.17.
- **Not from the motion, reported:** at page load there are two shifts that do count, 0.17 and 0.20. The second is the
  card resizing when the roster answers, from the waiting Employee ID form to the names.
- A fix is a product choice: either reserve the names' height while the roster loads, or show nothing in the card until
  it answers. Neither is built.

**Recording:** `motion/tap-pin-success-768x1024.webm`: tap "James O.", PIN, "Hi, James.", Clock in, the receipt.

**Tests:** `src/components/clocker-motion.test.ts` (6):
- each motion returns null under reduced motion and leaves the element untouched;
- the full path tweens only x, y, scale, opacity and strokeDashoffset, and stays at 0.6s or less;
- the settle is under 0.4s for 30 tiles, and a zero-distance flip is skipped;
- every motion function opens with its reduced branch;
- each screen pairs every motion it starts with `prefersReducedMotion()` and `stopMotion`;
- no pseudo-element inside `:is()` in the picker and kiosk CSS.

`src/components`: 3,440 passed. tsc and oxlint are clean.

**Not run:** WebKit (not installed here) and a real iPad. Smoothness on an iPad needs a device pass; here it's only
compositor properties, checked in Chromium.

## Follow-up: the way out on a phone (Nov 25)
| Commit | What |
|---|---|
| `b3fc173a` | Below 600px the names scroll in their own box, with "Use employee ID" right under it |
| `22850c52` | The box gives back the height of the changed-list line or the search field |
| `b8584a64` | Scan tool: reset the name box's own scroll after the reach probe |
| shots commit | `phone/`: every 390 capture, plus `before-after-*` |

**Why not scroll padding.** A sticky button over the page's scroll leaves a sliver of whichever tile rests under it. axe
`target-size` fails whenever that sliver is under 24px, and padding can't move a page that isn't scrolling.
- I checked this on a static page in Chromium: a sticky footer over 12 tiles failed at 1 of 4 resting offsets; a bounded
  scroll box passed at all 4.
- So on a phone the footer is "inside the card's scroll" literally:
  - the tiles scroll in a box of `max(13rem, 100svh − 27rem)` (`− 32rem` with the changed-list line or search);
  - the hint and the button sit directly under the box, and nothing covers a name;
  - the 3px focus ring stays inside the box (6px padding).
- The iPad (600px and up) keeps the plain list as captured, with the sticky rule kept for long lists.

**200% Spanish.** "Usar ID de empleado" still wraps whole to 109px. It no longer sticks over the names, so it never
covers the screen while they scroll.
- At 200% the band alone is about 420px, so the button is under the fold at the top of the page.
- One short page scroll brings the whole card into view, with the button under four names. You don't scroll past every
  name.
- Before and after: `phone/before-after-signin-es-390x844-text200(-full)`, `phone/before-after-stale-390x844`,
  `phone/before-after-signin-390x844`.

**Rechecked** (production build, Chromium, `NEVORA_SCAN_CLOCKER_FLOW=names`):
- 44 views: no overflow and nothing under 44px. Reach is OK everywhere; the only miss is the hidden skip link.
- axe, 18 checks: 0 violations, including the stale screen at 390. Nothing is suppressed.
- The way out at 390 and 100% is in view and on top in every state: sign-in, duplicate, stale, search at 13 names,
  Spanish. At 200% it's in view mid-list.
- Focus not obscured at 390 (100% and 200%): all 12 names clear.
- Focus walk: Carlos V. into the PIN step, "Choose another name" back, focus returns to Carlos V.
- Reduced motion: nothing runs.
- End to end:
  - Ana C. clocks in and out (one `CLOCKED_OUT` entry), James by Use employee ID, Luis Santos (duplicate) by ID.
  - Stale: Miguel is dropped and the line shows.
  - Roster failure: the ID form with its line, then sign-in by ID.
  - Hidden and Escape each trigger a fresh read.
- The 20-second idle clear and the focus order are unchanged.

## Follow-up: the load shift while the roster loads (Nov 25, lead's default)
| Commit | What |
|---|---|
| `1e696021` | A waiting area of reserved height instead of the disabled Employee ID form, with "Getting names…" past 1s |
| `352c3448` | The reserve is the names' height (lowest overall, measured below) |
| `8f82a801`, `ae7027ba`, `3353ab85` | Scan tool: `NEVORA_SCAN_CLOCKER_FLOW=cls` |
| shots commit | `load/` |

**While the roster loads.**
- The card keeps its title line (invisible, so nothing changes size when the title arrives) and a quiet area of reserved
  height. The language button stays.
- Past 1s, "Getting names…" / "Buscando nombres…" appears as a `role=status` line (`load/slow-0500ms`,
  `load/slow-1300ms`: empty at 0.5s, the line at 1.3s).
- Then the names or the Employee ID form. The read is still bounded by its 6s timeout, and a failed read shows the
  enabled form with its line (checked).

**CLS on load** (layout shifts without input, first 4s; production build, Chromium). Picker tablet / Employee ID tablet,
two loads each, identical:

| Size | Before: disabled form | Reserve = the form's height | **Reserve = the names' height (kept)** |
|---|---|---|---|
| 768×1024 | 0.370 / 0.167 | 0.370 / 0.167 | **0.030 / 0.233** |
| 1024×768 | 0.169 / 0.071 | 0.169 / 0.071 | **0.037 / 0.135** |
| 390×844 | 0.056 / 0.003 | 0.043 / 0.003 | **0.003 / 0.044** |
| Sum | 0.836 | 0.823 | **0.482** |

- **Where the shifts come from.** The first shift on every load is the setup screen's "checking" card giving way to the
  sign-in card (`.task` 417→608 at 768). It's outside the picker and was there before.
- **What the names' height changes.**
  - The card no longer resizes on a picker tablet, so both shifts collapse into one small move (0.03).
  - An Employee ID tablet now resizes once, from the reserve to its shorter form (+0.07 at 768, +0.06 at 1024, +0.04 at
    390). The lead's rule is to keep the lower overall, so this is the one kept; Jose may weigh the two tablet types
    differently.
- **The reserve is sized for about 12 names:**
  - 25.75rem on a portrait iPad;
  - 34.25rem in landscape;
  - on a phone, the name box plus its way out.
  A much smaller team shrinks the card once when the names arrive.
- **Ready time** (navigation to the names, or an enabled ID field):
  - Employee ID tablet: 145–185ms after, against 151–255ms before. It doesn't wait longer.
  - Picker tablet: 144–170ms.

**Rechecked on the final code** (`NEVORA_SCAN_CLOCKER_FLOW=names`):
- 44 views: no overflow, nothing under 44px, reach OK.
- axe, 18 checks: 0 violations.
- The way out is in view at 390 and 100% in every state.
- Focus is never hidden at 390; the focus walk passes.
- Reduced motion: nothing runs.
- End to end: Ana C. clocks in and out, James by ID, Luis (duplicate) by ID, stale, roster failure, hidden and Escape
  re-reads.
- `src/components`: 3,326 passed. tsc and oxlint are clean.

The dot spring is unchanged; the design OS overshoot question goes to Jose.
