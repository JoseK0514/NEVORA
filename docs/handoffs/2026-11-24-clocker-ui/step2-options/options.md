# Clocker UI step 2: how staff sign in on each tablet (design options)

Settings → Clocker tablets, Owner only. These are design options rendered in the real page frame with fictional data.
**No app code is merged.**
- **Base:** `origin/claude-codex-collab-nevora` at `9a5dc761`.
- **Contract** (handoff `2026-11-23-clocker-name-picker.md`, "Owner screens", first bullet):
  - `ClockerDeviceView.signInMode` is `EMPLOYEE_ID` or `NAME_PICKER`.
  - Only an enrolled, active tablet at an active location can switch.
  - `manageClockerDeviceAction` takes `operation=SET_SIGN_IN_MODE`, `deviceId`, `expectedVersion` and `signInMode`, and
    the screen then uses the returned device and version.
  - A replaced enrollment goes back to `EMPLOYEE_ID` and needs a fresh opt-in.
  - The picker is labelled as for staff-only areas.

**Fictional tablets** (Northside Café & Bakery):

| Tablet | Location | State | Sign-in |
|---|---|---|---|
| Front counter iPad | Calle Loíza | connected | Name picker + PIN |
| Kitchen iPad | Calle Loíza | connected | Employee ID + PIN (the one being switched) |
| Lobby iPad | Condado | not set up | can't switch |

**Components** (Jose's picks):
- Inline radio (the step-1 `clk-choice` rows: native control in teal, 48px rows, no box);
- the amber BCallout for the staff-only warning;
- a Solid teal main action that stays teal with "Saving…";
- the green kit notice for Saved.

**States in every option:** choice, confirm (turning the picker on), saving, saved, stale version, couldn't confirm.

**Shots** are in `shots/opt-<a|b|c>-<state>-<en|es>-<size>.webp`:
- 390, 390 at 200% text, 768 and 1440 in English;
- Spanish at 390 and 1440 for choice and confirm (Codex's labels "Núm. de empleado + PIN" and "Elegir nombre + PIN");
- 84 views, with 0 axe violations (wcag2a/aa, 21, 22aa), no horizontal overflow, and no sideways overflow in any sheet.

Full-page phone shots draw the fixed tab bar where the screen ended. That's how the capture works, not the layout.

## The words (all options)
- **Group:** "How staff sign in" / "Cómo se identifica el personal".
- **Employee ID + PIN:** "Each person types their employee ID, then their PIN." / "Núm. de empleado + PIN: Cada persona
  escribe su núm. de empleado y luego su PIN."
- **Name picker + PIN:** "For staff-only areas. People tap their name, then type their PIN." / "Elegir nombre + PIN:
  Para áreas solo del personal. Cada persona toca su nombre y escribe su PIN."
- **Warning (amber BCallout), title** "Only where just staff can see the tablet":
  - body: "Names are visible to anyone near this tablet. Each person still needs their own PIN, and Employee ID stays
    available on the tablet."
  - The Spanish uses tú (see the Spanish shots).
- **Main action:** "Turn on name picker" / "Activar elegir nombre". **Quiet action:** "Keep Employee ID" / "Seguir con
  núm. de empleado".
- **Saved:** "Kitchen iPad shows the name picker the next time someone signs in."
- **Stale and couldn't confirm:** the server's sentences, with "Refresh the list". See "Contract notes" below.
- **A tablet that can't switch:** "Set up this tablet first. Then you can choose how staff sign in."

## Option A: in the tablet's options
The row opens the tablet's existing options sheet. Its name, Replace and Remove keep their places; the mockup shows
only the new part. "How staff sign in" is an Inline radio pair in that sheet.

- **Choosing the picker** puts the amber warning right under the choice, and the sheet's one teal action becomes "Turn on
  name picker". The warning and the confirming press are the same step, with nothing extra to dismiss.
- **Going back to Employee ID** is a plain "Save" with no warning.
- **Every tablet row** gains its sign-in in the facts line: "Calle Loíza · Name picker + PIN · Last used today, 7:58 AM".
- **Saving:** the radios lock and the button keeps its width as "Saving…". **Saved:** the green notice in the sheet.
- **Stale and couldn't confirm:** amber notice with the server's sentence, radios locked, one "Refresh the list" button.
- **A tablet that can't switch** (not set up, or its location is off) shows the existing set-up action, and the sign-in
  group says why it's locked.

**Pros:**
- Everything about a tablet stays in one place, which fits the "organised" rows from Settings part 2.
- The sign-in is visible on every row.
- The warning is read at the moment of choosing.
- No new surfaces.

**Cons:**
- One tap deeper than B.
- The options sheet gets longer (name, sign-in, Replace, Remove).
- The confirm is inline rather than a separate step, so it relies on the Owner reading the amber note before pressing
  the teal button.

## Option B: a sign-in card on the page
Under the Tablets card, a second card "Sign-in on each tablet" lists every tablet with its own Inline radio pair: two
columns from 768px, stacked on phones.

- **Choosing the picker** opens a confirm dialog (Floating card): "Show names on Kitchen iPad?", the amber warning, then
  "Turn on name picker" and "Keep Employee ID".
- **Going back to Employee ID** saves straight away.
- **Saving, saved, stale and couldn't confirm** appear in place under that tablet, and nothing moves elsewhere.
- **A tablet that can't switch** shows the reason line instead of radios.

**Pros:**
- Every tablet's sign-in is visible and changeable at a glance, with no sheet for the safe direction.
- The confirm is a real, separate step.

**Cons:**
- It repeats the tablet list in a second card (two lists of the same three tablets), against the density rules.
- It's long on phones: with three tablets the card is taller than the screen.
- Saving on a radio change (with no Save button) is a pattern NEVORA doesn't use elsewhere in Settings.
- An accidental tap back to Employee ID saves without asking.

## Option C: a sign-in sheet from the row
Each connected tablet's row shows its sign-in as the row's white action button ("Name picker", "Employee ID"). It opens
a focused sheet, "How staff sign in" (Cancel), with the Inline radio pair and Save.

- **Choosing the picker and Save** goes to a second step in the same sheet: "Show names on Kitchen iPad?" (Back), the
  warning, then "Turn on name picker" and "Keep Employee ID".
- **Saved:** the green notice and Done.
- **Stale and couldn't confirm:** amber notice, radios locked, one "Refresh the list" button.

**Pros:**
- The mode is one tap from the list.
- The two-step confirm is the strongest guard.
- The sheet is about one thing.

**Cons:**
- It uses the row's single action slot, which pending and removed tablets already use for "New code" and "Set up
  again". Connected rows would now carry a button too, so every row has one, and the row and its button open different
  sheets.
- A short label ("Name picker") on a button reads as an action, not a state.
- It's a third kind of tablet sheet to build and maintain.

## Recommendation: Option A
It keeps one place per tablet (the options sheet everyone already uses), adds the sign-in to the facts line so the list
answers "which tablets show names?" without opening anything, and asks before the risky direction at the exact moment
of choosing. It needs the fewest new parts: one radio group, one callout and the existing teal action with its busy
label. B is the fastest to scan but duplicates the list and introduces save-on-change. C has the strongest confirm but
overloads the row's one action slot.

If Jose wants a separate confirm step, A can take C's second step inside the same options sheet ("Show names on
Kitchen iPad?", then Back) without changing anything else.

## Contract notes for the build
- **Stale vs couldn't confirm:** both come back as `{ ok: false, refresh: true }`. Only the sentence differs ("This
  device changed. Reload its current details and try again." / "We could not confirm the update. Refresh Devices before
  trying again."), and the UI must not compare display text. The shots show each server sentence under one title.
  - For "Not saved" and "Not confirmed" titles, Codex would need to return a code (for example `reason: 'STALE'`).
  - Otherwise one neutral title over the server's sentence works for both.
- **Spanish for the server's sentences:** they are English only. Step 1 maps each known sentence to Spanish in its copy
  table; step 2 needs the same for the two above. The Spanish shots use proposed translations.
- **Replacing a tablet** returns it to Employee ID. Option A's Replace confirm should say so: "The new tablet starts with
  Employee ID + PIN. Turn on the name picker again if you need it."
- **Use the returned device and version** after a save. The row's facts line updates from it, and a second change sends
  the new `expectedVersion`.
- **Every view the build changes** must still meet the guide: axe 0, 44px reach, 200% text, the busy label keeping the
  button's width, and focus moving to the result.

## How these were made
- A scratch preview component, not committed, rendered behind `?step2=<a|b|c>&state=…&lang=es` on the real Settings →
  Clocker tablets page.
- Production build of `9a5dc761` plus the scratch files, signed in as a fictional Owner on a throwaway local database.
  The tablets are fixed fictional data in the preview; no server action runs.
- Captured with the scan harness at 390, 390 at 200% text (root font 200%), 768 and 1440, with axe and an overflow,
  clipping and overlap probe.
- The probe's text overlaps on sheet states are the page behind the modal sheet; none are inside a sheet.
