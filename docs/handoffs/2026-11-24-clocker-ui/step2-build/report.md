# Clocker UI step 2, built: "How staff sign in" on each tablet (Option A)

Jose picked Option A on Nov 25, 2026. Built on `claude-codex-collab-nevora-kit-final` after merging
`origin/claude-codex-collab-nevora` (`d89223d1`). Code and shots are in separate commits. Fictional data only, on a
throwaway local database. Nothing was deployed or published.

## Commits
| Hash | What |
|---|---|
| `b5884789` | The sign-in group in the tablet's options sheet, the facts line, the Replace line, copy, CSS and tests |
| `84734a4e` | Settings → Clocker tablets reads the Owner's portal language (English if it can't be read) |
| `0a456eb0` | Spanish times are built from fixed words, so the server and the browser agree (fixes React #418) |
| `27796e2c` | Removes an unreachable Spanish branch in the English time format (tsc) |
| `307902c4` | Each sign-in choice reaches 44px left of and above its circle; a CSS test |
| shots commit | This report and `img/` |

## What an Owner sees
- **Every tablet row's facts line** shows its mode: "Calle Loíza · Name picker + PIN · Last used Nov 24, 9:39 PM"
  ("Connected" is gone; the mode says more).
- **The tablet's options sheet** (name, Replace and Remove keep their places) gains "How staff sign in": two Inline
  radio choices, "Employee ID + PIN" and "Name picker + PIN", each with its one-line explanation.
  - **Choosing Name picker** shows the amber kit callout "Names are visible to anyone near this tablet" right under the
    choice (tied to the button with `aria-describedby`), and the action becomes "Turn on name picker".
  - **Going back to Employee ID** is a plain "Save", with no warning.
  - **Saving:** the choices lock; the button keeps its width and Solid teal fill with "Saving…".
  - **Saved:** the green kit notice ("Kitchen iPad shows the name picker the next time someone signs in."), which takes
    focus. The row's facts line and the sheet update from the returned device.
  - **Stale and couldn't confirm:** one neutral title, "Check this tablet", over the server's sentence (in Spanish from
    the copy table), an amber notice that takes focus, choices locked, and one 44px+ "Reload" (Solid teal, 52px).
  - **A definite refusal** (no reload needed) keeps the choice open with the server's sentence.
- **A tablet that can't switch** (not set up, removed, or its location is off) shows its mode read-only with one plain
  reason: "Set up this tablet first. Then you can choose how staff sign in." or the location-off line. No controls.
- **Replace tablet** confirm adds: "The new tablet starts with Employee ID + PIN. Turn on the name picker again if you
  need it."

Spanish labels follow Jose's choice: "ID de empleado + PIN" and "Elegir nombre + PIN" ("Núm. de empleado" is not used).

## Data contract (unchanged)
`manageClockerDeviceAction` gets exactly `operation=SET_SIGN_IN_MODE`, `deviceId`, `expectedVersion` (the version the
screen holds) and `signInMode`. The sign-in controls belong to an empty sibling `<form id="ck-signin-<id>">`, so the
rename form never sends them. The screen uses the returned device and version, so a second change sends the new
version. It decides by `ok` and `refresh`, never by the words. A request that fails outright is treated as couldn't
confirm.

**For Codex:** stale and couldn't-confirm both come back as `{ ok: false, refresh: true }`, so they share one title. A
distinct reason code (for example `reason: 'STALE' | 'UNCONFIRMED'`) would allow separate titles ("Not saved" /
"Not confirmed").

## Tests
- `src/components/clocker-sign-in.test.tsx` (13): the exact form fields; versions 7 → 8 → 9 across two saves; stale,
  refusal and lost-request handling; every state drawn (idle, confirm, back to ID, saving, saved, stale, couldn't
  confirm, refusal, read-only); Spanish with no English leak; every server sentence mapped.
- `src/components/clocker-device-manager.test.tsx`: the facts line, the sibling form, read-only reasons, `onSaved`
  updating the list and the open sheet, the Replace line.
- `src/components/clocker-owner-copy.test.ts`: the `{ en, es }` key match (existing), and exact Spanish times.
- `src/app/app/settings/clocker/page.test.tsx`: Spanish and the English fallback.
- `src/components/clocker-owner-b-targets.test.ts`: the reach rule.
- `src/app/app/settings/clocker/actions.test.ts` (existing, Codex): only an Owner can save a sign-in mode; a Manager is
  refused and the save isn't called.
- Clocker files: 54 of 54 pass. Full `src/components` + `src/app` passed at 5013 before `27796e2c`. tsc clean; oxlint
  0 errors.

## Browser verification (production build of `307902c4`, owned https origin, Chromium, reduced motion on)
**Views:** 50 checks at 390, 390 at 200% text, 768 and 1440, English and Spanish: the list, the sheet, confirm, saving,
saved, read-only, stale and couldn't confirm.
- axe (wcag2a/aa, 21, 22aa): 0 violations in all 50.
- Horizontal overflow: 0. Clipped text: 0.
- **Reach** (`elementFromPoint` at ±21.5px from each control's centre, inside the open sheet): 0 short in every sheet
  view (4–7 controls each). Before `307902c4` both radios missed left and above (relout8). The 8 short targets on the
  1440 list are the desktop sidebar's nav links (40px, existing, not this change).
- **Busy button:** Solid teal (`#0B6E69`, or `#095E5A` under the pointer), opacity 1, same width as idle (358px at
  390, 388px in the 420px sheet), `transition-property: background-color, color`.
- **Focus:** moves to the result notice after Saved, stale and couldn't confirm; back to the tablet's row
  (`scan-kitchen`) when the sheet closes.

**Round trip on the throwaway DB** (Kitchen iPad): v11 Employee ID → Turn on name picker → **v12 Name picker**, the row
says "Name picker + PIN" after a reload → Save → **v13 Employee ID**, persisted after reload. Each view's
"back to ID" save advanced the version again (v15 … v25), with no warning shown.

**Stale save from two Owners** (en-390, en-1440, es-390): both open Kitchen iPad at v5. Owner B turns on the name
picker (v6). Owner A's save is refused: the database stays v6 Name picker, A sees "Check this tablet" with the server's
sentence, and Reload shows B's change in the row.

**Couldn't confirm** (same three): the action's request is aborted in the browser; the notice and Reload appear and
the database is unchanged.

**Replace:** the confirm shows the Employee ID + PIN line.

Shots: `img/<state>-<en|es>-<390|390-text200|768|1440>.webp`, plus `replace-en-1440.webp`. Phone shots that include
the page behind the sheet draw it as the capture saw it.

## Notes and gaps
- **Spanish register:** the existing Clocker tablets strings use usted ("Solo usted ve este nombre", "Úselo cuando…");
  the new lines use tú, per the copy rules. They now sit side by side in the sheet (see `stale-es-390.webp`). Moving
  the older strings to tú is a separate copy change.
- **Language wiring:** the page didn't read the portal language before; it does now (`84734a4e`), so the whole page
  appears in Spanish for a Spanish Owner.
- **Hydration fix:** ICU's es-PR month and a.m./p.m. output differs between Node and Chromium, which threw React #418
  on Spanish pages. Spanish times now use fixed words (`0a456eb0`). English is unchanged.
- **Reach at 200% text** wasn't measured by the probe (axe, overflow and clipping were). At 200% the rows only grow.
- **One login retry:** es-390 at 200% hit the per-account session cap (`/login?error=busy`) and went through on the
  third try.
- **Leftover processes:** two throwaway Postgres clusters from earlier scan runs (`/tmp/nevora-payroll-owned-*`) are
  still running in this container; stopping one was refused by the permission check. They hold fictional data only.
