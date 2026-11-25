# Clocker UI step 1, built: "Clock in at" on the person page (Option A)

Jose picked Option A on Nov 25, 2026. Built on `claude-codex-collab-nevora-clocker-states` from the shared tip 519b6c5d
(Codex's backend: migration 0078, `readClockerLocationAccess`, `saveClockerLocationAccessAction`). Code and shots are in
separate commits. Fictional data only, on a throwaway local database. Steps 2 and 3 are not started.

## Commits
| Hash | What |
|---|---|
| `5366c88d` | The row, the sheet, copy, model, CSS and tests |
| `168a0074` | Scan tool: `NEVORA_SCAN_CLK=1` verification mode |
| `794da738` | Choice rows 48px, so every row reaches 44px from its centre; a CSS test for the look |
| `0bb3ec7f` | Save stays Solid teal while saving (Jose's pick) |
| shots commit | This report and `img/` |

## What an Owner sees
- **Person page:** one row under Work, "Clock in at", with the answer on one line:
  - "Where they work · Main Office, West Office" (ASSIGNED);
  - the chosen places, "West Office, Old San Juan" (SELECTED);
  - "Every location · Includes locations added later" (ALL).
  - If Codex's read fails, the row says "Unavailable" and has no link; the page stays up.
- **The sheet** ("Clock in at", Cancel): three Inline radio choices, "Where they work" (with the places it means), "Only
  these locations" and "Every location".
  - Under "Only these locations", an Inline check list of active locations, each marked "Works here" and "· Main".
  - It follows Jose's picks: the native control in teal beside its label, 48px rows, no box, no ruled lines.
- **Save** is the one Solid teal action. It stays off until the answer changes.
  - "Only these locations" with nothing ticked says "Choose at least one location to save." and Save stays off.
  - While saving, Save keeps its width and teal fill with "Saving…", the choices are off, and a second press does nothing.
  - "Saved" (green kit notice) takes focus.
- **Couldn't confirm and stale:** Codex's sentences unchanged ("Clocker location access could not be confirmed. Reload
  the profile before trying again." / "This employee changed. Reload their profile before saving.").
  - They appear in an amber kit notice that takes focus, with "Reload profile".
  - The sheet is locked until the reload.
  - A request that fails outright is treated as couldn't-confirm.
- **Cancel** returns to the person page at `#clock-in-at`, and the row's link takes focus again.
- **Not shown to:** Managers, Employees, or an Owner looking at another Owner (no Clocker PIN there either). The
  `?edit=clocker` address sends them back to the person page.

## Data contract (unchanged)
`saveClockerLocationAccessAction` gets exactly `employeeId`, `mode`, `expectedUpdatedAt` (the `updatedAt` from
`readClockerLocationAccess`), and one `locationId` per tick, only for SELECTED; ASSIGNED and ALL send none. The screen
decides by `ok` and `refresh`, never by the words.

## Tests
- `src/components/team/clocker-location-access.test.tsx` (19):
  - the copy key match (EN/ES), tú and the glossary, every server sentence in Spanish;
  - the field contract (SELECTED with de-duplicated ids; none for ASSIGNED and ALL; no other keys);
  - summary, tags, starting ticks, change and validation rules, and the stale refresh;
  - every state drawn: idle, changed, nothing ticked, saving, saved, couldn't confirm, stale, a refusal without reload,
    and Spanish;
  - the CSS look: 48px rows, no box or ruled line, teal native controls, rem text.
- `src/app/app/employees/[employeeId]/page.test.tsx` (+2, 17 in all): the row for an Owner with the current answer;
  nothing for a Manager (and Codex's read isn't called); "Unavailable" on a failed read; nothing for another Owner; the
  sheet for an Owner; the redirect for anyone else and on a failed read; Cancel back to `#clock-in-at`.
- tsc and oxlint are clean on the changed files.

## Browser verification (production build, owned https origin, Chromium; `NEVORA_SCAN_CLK=1`)
- **Views.** Daniel's and Carmen's row and sheet at 320, 390, 768 and 1440, each at 100% and 200% text (32px root), plus
  Spanish at 390 and 390 at 200%, and every save state: 50 view checks.
  - Horizontal overflow: none. Clipped text: none. Reach: every control reached at ±21.5px by `elementFromPoint`;
    inputs are judged through their 48px label rows.
- **axe** (WCAG 2.0/2.1/2.2 A and AA): 0 violations on 9 page checks (rows and sheets at 390 and 1440, the Spanish sheet).
- **Focus walk** (Carmen's sheet): Cancel, the radio group (one stop, on the checked choice), Main Office, West Office,
  Old San Juan, then out of the sheet (Save is off until something changes). Every stop has a 2px ring.
  - Saved, couldn't-confirm and stale each move focus to the result.
  - Cancel returns to the person page with focus on the "Clock in at" row link.
- **Reduced motion.** With prefers-reduced-motion, changing a choice runs only colour, background and the kit's
  1-to-none `scale` on Save (equal values, nothing moves; see Kit findings).
- **Round trip on the throwaway database (Daniel).** Before: ASSIGNED, none.
  1. "Only these locations", untick Main Office, Save. Saved, focus on the result, Save off again.
  2. Reload: SELECTED with West Office; database `SELECTED {loc-2}`.
  3. "Every location", Save, reload: ALL; database `ALL {}`. The row now reads "Every location · Includes locations
     added later".
- **Couldn't confirm.** The reply is held for 5s, so Saving shows, then the request is dropped: Codex's sentence appears
  with focus, and the sheet is locked. Reload profile shows the saved state (SELECTED, West Office and Old San Juan).
- **Stale, from two contexts.** Two Owners open Carmen's sheet. A ticks Main Office and saves (Saved). B chooses "Every
  location" and saves: "This employee changed. Reload their profile before saving." with focus, and the sheet locked.
  Reload profile shows A's save (SELECTED, all three).
- **Manager.** The scan's Manager (a fictional person made Manager, with no locations) gets "Outside the locations you
  manage" for the person, so there is no row and the sheet address shows no sheet. A company-wide Manager is covered by
  the page unit test (no row; the sheet address redirects).
- **Suites.** `node scripts/run-rstest.mjs run src/components src/app`: 4,994 passed, 0 failed. tsc clean.

**Not run.**
- WebKit: it isn't installed in this container (only Chromium is preinstalled, and the setup forbids `playwright install`).
  It needs a WebKit pass where it's available.
- 200% at 768 and 1440 is covered; 1024 wasn't in the list.

**Before and after.**
- Before (base 519b6c5d): `img/before-person-daniel-390.webp`, `-1440`, `img/before-person-carmen-390.webp`.
- After: `img/clk-row-daniel-390.webp`, `img/clk-row-daniel-1440.webp`, `img/clk-row-carmen-390.webp`.
- The only change on the person page is the "Clock in at" row between Work and Access and sign-in.

## The Hours card ("The whole schedule couldn't be read" / "Not available")
It's the fixture, not a UI bug. `readOperationalEmployeeHours` reports the week's schedule as complete only when every
location the person may work at has a published schedule this week
(`src/lib/company-access/operational-read.server.ts`, `scheduledComplete`). The scan publishes a schedule only for Main
Office, and Daniel and Carmen also work at West Office (Carmen at Old San Juan), so the card correctly refuses to show a
partial figure. The person page's wording for that case is the approved Phase 8 line. No change made.

## Spanish strings for staff's review list
| Key | English | Spanish (proposed) |
|---|---|---|
| title | Clock in at | Puede marcar en |
| where | Where they work | Donde trabaja |
| only | Only these locations | Solo estas localidades |
| every | Every location | Todas las localidades |
| everyDetail | Includes locations added later | Incluye las localidades que se añadan |
| locations | Locations | Localidades |
| worksHere | Works here | Trabaja aquí |
| main | Main | Principal |
| chooseOne | Choose at least one location to save. | Elige al menos una localidad para guardar. |
| save / saving / saved | Save / Saving… / Saved | Guardar / Guardando… / Guardado |
| cancel | Cancel | Cancelar |
| reload | Reload profile | Volver a cargar el perfil |
| unavailable | Unavailable | No disponible |
| none | No active locations | No hay localidades activas |
| server: unconfirmed | Clocker location access could not be confirmed. Reload the profile before trying again. | No se pudo confirmar dónde puede marcar. Vuelve a cargar el perfil antes de intentarlo de nuevo. |
| server: stale | This employee changed. Reload their profile before saving. | Este empleado cambió. Vuelve a cargar su perfil antes de guardar. |
| server: invalid | Choose a location access mode and valid active locations. | Elige dónde puede marcar y localidades activas válidas. |
| server: not Owner | Only an Owner may change Clocker location access. | Solo un dueño puede cambiar dónde se puede marcar. |

The rest of the person page around the row is still English in Spanish (outside this step).

## Kit findings (not changed here)
- **Disabled buttons:** `owner-b.css` greys every disabled `.b-btn`, busy or not, while `b-foundation.css` keeps a busy
  button's fill. So the kit's own `BButton` (which disables while busy) shows a grey saving button, against Jose's
  Solid teal pick. This sheet avoids it.
- **Reduced motion:** with reduced motion the kit's `.b-btn` still transitions `scale` from 1 (disabled) to none
  (enabled). These are equal values, so nothing moves, but the transition is listed.
