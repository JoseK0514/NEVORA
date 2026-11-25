# Step 1: "Clock in at" on the person page (Owner), options

Design options only; no app code is merged. Rendered on the real Direction B person page (`/app/employees/[id]`), on a
production build with fictional data, reading Codex's `readClockerLocationAccess` (base 519b6c5d, migration 0078).
Prototype code stays on a local branch (`clocker-ui-step1-proto`), not pushed.

Fictional data: **Daniel Reyes** works at Main Office (main) and West Office, Clocker mode ASSIGNED. **Carmen Ortiz**
works at Main Office (main), West Office and Old San Juan, Clocker mode SELECTED with West Office and Old San Juan (her
main location excluded).

How the control says "this is the Clocker, not the schedule" without an explanation paragraph: the title is a clock
action ("Clock in at" / "Puede marcar en"), the default reads "Where they work" with the places it currently means, and
each location in the list carries a grey "Works here" tag, so where they can clock in and where they work are visibly two
different things.

Captures: `img/<option>-<view>-<390|390-text200|1440>.webp`; one Spanish capture (`a-sheet-carmen-es-390`,
`a-row-carmen-es-390`); states for the recommended option (`a-state-*`).

## Option A: a row, then a sheet (recommended)
A "Clock in at" row on the person page, under Work, shows the current answer ("Where they work · Main Office, West
Office"; Carmen: "West Office, Old San Juan"). It opens a sheet like Positions: three choices ("Where they work",
"Only these locations", "Every location · Includes locations added later"); "Only these locations" opens the location
list right under it.
**Trade-off:** one more tap to change it, but the person page gains one row, not a card, and the change happens in the
same sheet pattern as Positions.

## Option B: a Clocker card on Access and sign-in
On Access and sign-in, under the Clocker PIN row: a segmented choice (Where they work · Choose · All), the places it
means, or the location list for Choose, and Save.
**Trade-off:** everything about the Clocker sits together (PIN and where), but it's one level deeper, and "Where they
work" wraps inside its segment at 390 (a wrapped label is a bug by the UI guide), so the segment labels would need
shorter wording from Jose.

## Option C: every location, on the person page
An inline card listing every location with "Can clock in" or "Can't clock in", each tagged "Works here" where they work,
with the same segmented choice above.
**Trade-off:** the clearest picture of clock-in versus work, but it adds a card with a row per location to the person
page (density), grows with every location, and has the same segment wrapping as B.

## Recommendation
**A.** It keeps the person page dense (one row with the answer), uses the existing sheet pattern, and still shows the
work-versus-clock difference inside the sheet through the "Works here" tags. States captured for A:
- **Save:** after a change (Carmen: adding Main Office) Save becomes the card's one Solid action. It stays grey until
  something changed, and with "Only these locations" and nothing ticked it says "Choose at least one location".
- **Saving:** Save keeps its width, with the spinner and "Saving…"; the choices are disabled.
- **Saved:** a green kit notice, "Saved", shown only after the server confirms.
- **Couldn't confirm:** a kit notice (`BCallout`, amber) with the server's words, "Clocker location access could not be confirmed. Reload
  the profile before trying again.", and one action, "Reload profile"; the choices and Save are disabled.
- **Stale:** the same note with "This employee changed. Reload their profile before saving."

## Open points for Jose
- **Save placement.** In a built version, Save goes in the sheet header (Cancel · Clock in at · Save), as on Positions.
  The prototype keeps a full-width Save in the card so the busy state can be captured.
- **Spanish wording.** The Spanish text is a proposal: "Puede marcar en", "Donde trabaja", "Solo estas localidades",
  "Todas las localidades · Incluye localidades nuevas", "Trabaja aquí". The two server messages have no Spanish yet; the
  prototype shows a proposed translation.
- **Spanish page.** The person page around the control is still English in Spanish; only the control follows the
  language.
- **Line style.** Jose's note (Nov 25): the boxed outlines around the choices and the locations didn't look right. They
  came from the older form checklist. The options now use Jose's picks: Inline radio and Inline check, no ruled lines.

## Standards check (Jose asked, Nov 25)
Checked against DESIGN.MD, `docs/design/component-picks.md`, the design OS (`density.md`, `audit.md`, `voice.md`)
and `docs/design/ui-implementation-guide.md`:
- **Radio choice and Checkbox: Inline radio / Inline check** (component picks). The native control in teal beside its
  label, 44px rows, no ruled lines, no outlined box. *Fixed*: the first captures used the older ruled, boxed checklist.
- **Notice: no box** (DESIGN.MD premium pass 3A). The couldn't-confirm and stale states use `BCallout`: the glyph in
  its tinted circle, the ink title, one action. *Fixed*: the first captures used an amber box.
- **Segmented control: Sliding tile** (`CorpSegments`, options B and C). The glass `BSeg` is for the band only.
- **Action button and Saving button: Solid teal**, one per card; `BBusyLabel` keeps its width while saving; grey only
  while disabled (UI guide 6).
- **Density.** The person page gains one row in A. Each row is a title plus one line. Each fact appears once: the
  places in the row, the full list in the sheet. No explanation paragraph: the "Works here" tags do the explaining.
- **Copy.** Sentence case, no "simply" or exclamation marks; `{ en, es }` table; Spanish uses tú and the glossary
  ("Localidad", "Dueño"). The two server messages are Codex's wording, unchanged.
- **Checks run.** Production build, 390, 390 at 200% text (32px root) and 1440: no horizontal overflow, no clipped
  text, every control 44px or more. Two exceptions:
  - The kit callout's text action ("Reload profile") draws under 44px and needs the kit's reach ring (UI guide 7).
  - The Corp segmented control in B and C is under 44px at 1440 (its desktop size).
- **Not run yet** (they belong to the build step): axe, WebKit, keyboard order.
