# Step 3: the iPad name picker on the Clocker kiosk, options

Design options only; no app code is merged. The prototype is a local WIP commit (`clocker-ui-step3-proto`, base
9a5dc761) on the real kiosk, with Codex's backend unchanged:
- **Roster:** `POST /api/clocker/[location]/pin {action:'roster'}`, read when sign-in opens and again each time it starts
  over, kept in memory only.
- **Verify:** `{action:'verify', selection, pin}`.

Production build on the owned https origin. A fictional enrolled iPad, "Front counter iPad", was switched to picker mode
with Codex's `setClockerDeviceSignInMode`.

**Fictional staff with Clocker PINs:**
- Twelve show in the picker: Ana C., Beatriz M., Carlos V., Daniela C., Eduardo R., Gabriela T., Héctor D., Isabel M.,
  James O., Javier P., Lucía O., Miguel S.
- Luis Santos and Luis Serrano are both "Luis S.", so the server leaves both out: an ambiguous name always goes through
  the Employee ID.

Sizes: iPad 768×1024 and 1024×768, and 390 at 100% and 200% text. Spanish captures for A and C, and the Employee ID
screen in Spanish.

## What every option shares
- **Names only.** Names are the server's "Ana C." form; no phone numbers, photos or recent names. A "recent" list would
  show the next person who clocked in before them on a shared tablet, so it's left out.
- **The way out.** "Use employee ID" is always on screen, under the line "Not on the list? Use your employee ID." That
  line is also the duplicate-name answer: the two "Luis S." aren't in the list, so they read it and use their ID
  (`*-duplicate`).
- **The PIN step.** Choosing a name opens today's PIN step with the name under "Enter your PIN" (`*-pin`). The back
  arrow is named "Choose another name". The keypad, errors, lockout, receipts and the 30-second clear are unchanged.
  - **Checked end to end:** Ana C. with her PIN reaches "Hi, Ana." (`a-verified-ready-768x1024`), and Done returns to
    the picker with the roster read again.
- **Fallbacks.** An empty list, or a tablet not in picker mode, shows the Employee ID form as today. A roster read
  failure shows the same form with one line, "Names couldn't load. Use your employee ID." (`roster-failed-*`).
- **Checks.** No horizontal overflow and no target under 44px at any size (every name row or tile is 56–64px). The
  kiosk's tokens, keys, field and secondary button are reused.

## Option A: search and list
A search field over an alphabetical list of name rows (60px, the kiosk's key style, with an arrow).
**Trade-off:** it scales to long lists and is familiar. But at 768×1024 the list scrolls inside a card that already sits
under the tall portrait band, so "Use employee ID" starts below the fold, and the search opens the on-screen keyboard
over half the iPad.

## Option B: letter first
Tiles for the first letters present (A B C …), then that letter's names as tiles, with "All letters" to go back.
**Trade-off:** no keyboard, big targets, and it scales to large teams. But every sign-in costs one extra tap, and a
letter with one person (most letters with 12 people) is a tap that only reveals one name.

## Option C: name tiles (recommended)
Every name as a tile in a grid, with initials in a white disc (from the name, not a photo): three columns at 768,
two at 1024 beside the band, one at 390. A search field appears above the grid only when there are more than 12
names.
**Trade-off:** one tap to find yourself and the fastest scan for a typical shift. On the iPad, all twelve names, the
hint and "Use employee ID" fit on one screen in both orientations. A very large team leans on the search field, as
A does.

## Recommendation
**C.** For the team sizes NEVORA serves, the whole list fits one iPad screen in both orientations. It's one tap with no
keyboard, and the way to the Employee ID stays in view. Above 12 names it gains A's search, so it scales without
B's extra tap.

## Open points for Jose
- **"Employee ID" casing.** The kiosk says "Employee ID" everywhere ("Enter your Employee ID"), while Codex's suggested
  label is "Use employee ID". I'd use "Use Employee ID" to match. Spanish has the same split: Codex suggests "Usar núm.
  de empleado", but the kiosk's form says "Ingresa tu ID de empleado". One term should win in both languages.
- **Initials discs in C.** They speed up scanning, but they're optional. Without them, the tiles are names only.
- **The threshold for search in C** (12) is a proposal.
- **On a 390 phone** (not the primary device), C's tiles stack in one column, so twelve names run past the screen and
  "Use employee ID" needs a scroll. If phones matter, pin "Use employee ID" under the band, or start the search field
  lower than 12 names.
- **The Owner's label for the mode** ("Name picker + PIN" / "Elegir nombre + PIN") belongs to step 2 and isn't shown
  here.
