# Settings Locations (J5 Locations, J6 Add location, J7 Edit location): report

Branch `claude-codex-collab-nevora-settings-locations`, started from `claude-codex-collab-nevora-settings-base`
(`cbc3d4bc`). Owner only. Fictional data on a throwaway local database; no deploys or publishing.

## Commits (code, merge these)
- `6ed6eecc9` J5–J7 on Settings' Direction B parts
- `3dd790498` tests for the Direction B markup
- `7140e7bb8` one left edge, 44px band action, equal next-step buttons, shared form fixes
- `95d9aef75` text in rem on Settings B forms and rows, next steps sized to their words
- `fe5087500` rows restack at large text; buttons keep 44px at 100%
- `82d5350d9` a restacked row value keeps its words whole
- `7c7251909` the saved result stays after the page refreshes

The shots commit (this report and `shots/settings-locations/`) comes last; merge only the code if you prefer.

## Files
- `src/app/app/settings/locations/page.tsx`, `new/page.tsx`, `[locationId]/page.tsx`: `SettingsFrame` (wave-c) replaced
  by `SettingsPageB`. Same `requireRoles(["OWNER"])`, same reads, same actions (`createLocationAction`,
  `updateLocationAction`), same `?q=` / `?status=` narrowing.
- `src/components/new-location-form.tsx`, `src/components/edit-location-form.tsx`: markup moved to `FieldB`,
  `SwitchRowB`, `ResultB`, `CorpRows`/`CorpRow`, `CorpFormFooter`. Roots are fragments: the form is the `.c-card` and
  is a direct child of `.c-page`; the result card follows it. Same field names, `required`, `pattern`, `maxLength`,
  hidden `id` / `expectedUpdatedAt`, one request per tap, discard guard, unconfirmed-save wording.
- Tests: `locations/page.test.tsx`, `foundation-pages.test.tsx` updated for the new markup (no row aria-labels, Corp
  classes). 23 tests pass in my paths.

## Shared parts: additive changes only (`settings-b.css`)
No change to `settings-b.tsx` or `settings-b-form.tsx`. Added to `settings-b.css`:
1. `form[data-done]` hides the band's `.c-setb-save` (an Add form that is done).
2. `.c-setb-save` in the band is 44px tall (it drew 40px).
3. `.c-setb-acts`: next-step buttons under a result (stacked full width on phones; equal width, right-aligned, from 768).
4. `.c-setb-rowlink` / `.c-setb-linkrow`: a row whose title is a link with a button on its right (Clocker link + Copy).
5. **Fix for every Settings B page:** `.c-error` glyph and words had no gap; now 4px.
6. **Fix for every Settings B page:** `ButtonLabel` drew "AddAdding…" / "SaveSaving…" side by side, because the swap
   rule is scoped to the older `.wc-page`. The same swap rule now applies under `.c-setb`. `SettingsFormB` uses
   `ButtonLabel`, so every page on `SettingsFormB` had this bug.
7. **200% text for every Settings B page:** field labels, help, errors, inputs, row values, buttons and the band action
   were fixed px. Same sizes in rem (no change at 100%); buttons keep 44px and grow with their words.
8. **Large text:** a list card (`.c-page.c-setb > .c-card:not(form)`) is an inline-size container; below 18rem of
   width (about 200% text on a phone) a row's value moves under its title instead of squeezing it to a word per line.
   At 100% no phone or wider card matches.

## Per page

### J5 Locations (`/app/settings/locations`)
- **What changed:** band with "‹ Settings" and "Locations" (phone) / large title (768+), then one white card of kit
  rows: map-pin icon in its tinted circle, short name, the facts line (full name · Needs setup / Inactive), the people
  count on the right, chevron. Last row "Add location" with the plus icon. Empty and no-match states are `CorpEmpty`.
- **Before → after words:** card title "Locations 2" removed (the band already says Locations); grey line "Each
  location keeps its own schedule." removed (always true); row aria-label "Edit <name>" removed (screen readers now
  hear the visible text). Empty: "No locations yet" / "Add the places your team works." / Add location; no match:
  "No matching locations" / Show all (unchanged words).
- **Visible strings (390 and 1440):** Settings · Locations · Main Office · Northside Main Office · 9 employees · West
  Office · Northside West Office · 4 employees · Add location. No repeats.
- **Buttons:** none on the page; empty state uses the Solid teal "Add location" (or the secondary "Show all").
- **Edges:** card 14–376 (390), 108–740 (768), 296–1108 (1440). Every row title at one left edge (81 / 179 / 367);
  counts share one right edge (329 / 689 / 1057); chevrons share one right edge. No overflow at 320, 390, 768, 1440 or
  390 with 200% text.

### J6 Add location (`/app/settings/locations/new`)
- **What changed:** band "‹ Locations" and "New location"; phones add from the band's "Add" (white pill, 44px), hidden
  once added. The form is one white card: Name, Short name, Clocker key (outlined 48px fields, labels above, help line
  "The Clocker key can’t be changed later."). Tablets and desktop: Cancel (secondary) and Add (Solid teal) in the
  card's footer, 120px each, 44px. Validation: the field's own sentence under it with the warning glyph, focus to the
  first wrong field. After an add: "Location added" with "Next: staffing", then "View locations" (Solid teal) and "Add
  another location" (secondary), equal widths.
- **Before → after words:** unchanged, except the busy label now reads "Adding…" in place of "Add".
- **Validation error state captured:** `J6-owner-390-error.webp`, `J6-owner-1440-error.webp` (empty names and a
  malformed Clocker key).
- **Edges:** labels and fields at one left edge (33 / 131 / 319); fields 560px max from 768. Footer buttons 44px.

### J7 Edit location (`/app/settings/locations/[locationId]`)
- **What changed:** band "‹ Locations" and the short name; phones save from the band (shown only once something
  changed, by the shared save-on-change rule); tablets and desktop from the card's footer (shown only once something
  changed). One card: Name, Short name, then kit rows: Active (switch row), Clocker link (teal link, 44px target) with
  a secondary "Copy" button (44px), Staffing "1 per shift ›", Who can work here "9 ›". Inactive: "Clocker link —
  Unavailable while inactive" (no link).
- **Fixed now:** "Location updated" disappeared right after a save: the form was keyed on the saved timestamp, so the
  page's refresh remounted it. The form now takes the server's values in place when nothing is being edited, and the
  result stays (`J7-owner-390-saved.webp`).
- **Words:** unchanged.
- **Edges:** labels, fields and row titles at one left edge (33 / 131 / 319); values and chevrons share one right edge.

## Checks run
- Typecheck (`tsc --noEmit`) clean; oxlint clean on my paths; `node scripts/run-rstest.mjs` on
  `src/app/app/settings/locations` and `foundation-pages.test.tsx`: 23 passed.
- Dev server iterations (4 rounds), then one production build capture (`NEVORA_OWNED_APP_PRODUCTION=1`, under
  `flock /tmp/nevora-heavy.lock`) as Owner `QAOWNER` with the scan harness plus a small Locations hook: 320, 390, 768,
  1440, 390 with 200% text, validation error at 390 and 1440, edit dirty, saved, add done.
- axe (390 and 1440, all three pages and the error state): 0 violations.
- Horizontal overflow: 0 at every width.
- Keyboard (J7, 1440): Name → Short name → Active switch → Clocker link → Copy → Staffing → Who can work here → Save,
  each with the 2px teal ring.
- Not captured: J5 empty and no-match states (covered by unit tests); reduced motion (the harness runs with
  `reducedMotion: 'reduce'` throughout; no motion on these pages beyond the kit's).

## Impeccable audit
- **Hierarchy:** one title per page in the band; one card; one Solid teal action per card (Add / Save) or none (J5).
- **Spacing:** kit card inset (16px), 16px between fields, 12px card-to-result, 8px between buttons.
- **Accessibility:** axe 0; every control 44px or more on my pages except the kit's band back link (below); row names
  are their visible text; errors tied to fields with `aria-describedby`; the result takes focus once.
- **States:** loading (existing skeleton), error route (existing `BRouteError`), not found (existing `BStateScreen`),
  empty, no match, validation error, busy, unconfirmed save, saved, added.

## Blocking items left
None on my pages.

## End-sweep items (proposed ledger rows; kit or app shell, not in my files)
| Proposed row | Where | Finding |
|---|---|---|
| end sweep | `CorpNav` back link from 768 (kit) | "‹ Settings" / "‹ Locations" in the band is 32px tall on tablets and desktop. |
| end sweep | `CorpNav` phone title (kit) | The phone band title is 28px fixed; it doesn't grow with 200% text. |
| end sweep | `ResultB` / `Notice` (shared) | In a two-line result the icon is centred on both lines, not on the title line. |
| end sweep | `locations/error.tsx` (package D wording) | The error screen's title is "Your workplaces" while the page is "Locations"; words left as approved. |
| note | J7 | The band title is the short name and the Short name field shows it too; it's the editable value, so left. |
