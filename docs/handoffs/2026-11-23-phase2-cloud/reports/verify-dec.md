# DEC1–DEC10 re-verified on a production build (Nov 23, 2026)

Rechecks every decision surface on the shared tip `b7a75e80`, merged into `claude-codex-collab-nevora-core` as
`5ec53b51` (no conflicts). Nothing was off, so this package changes no code. It adds this file and
`shots/verify-dec/`.

## How it was checked
These were production builds (`NEVORA_OWNED_APP_PRODUCTION=1`) of `5ec53b51`, run with fictional data in a throwaway
Postgres through the scoped `tools/ui-scan` harness. The Owner was QAOWNER, and James Ortiz was signed in as Employee
and then as Lead.

Each page was scanned at 390 and 1440 with axe-core 4, with `label-content-name-mismatch` on. The harness also checked
for sideways overflow at every width, and ran the clipped and overlap audit at 390 with 200% root text. Team and the
Owner pages also ran at 320.

The Clocker used the committed K3 flow (`zz-scan.tar.gz`) at 390x844, at 390x844 with 200% text, and at 768x1024 and
1024x768, in English and Spanish. That capture mode doesn't run axe.

Shots are `shots/verify-dec/img/<dec>-<page>-<width>.webp` at quality 80. `390t` is 390 with 200% text. Phone shots are
full height.

## Per decision
| Decision | Surface | Shows? | Axe 390/1440 | Overflow | 200% text at 390 |
|---|---|---|---|---|---|
| DEC1 | Employee Home band | Hours "1 h 23 of 56 h" and Scheduled payday only; the card is "On shift now" | 0 / 0 | none | Only the known kit weekday labels ("Tue" over "24") |
| DEC1 | Employee Schedule band | "56 h this week" | 0 / 0 | none | Audit hits are the visually hidden "Open shifts and changes" heading and the closed "What changed" panel; nothing overlaps in the shot |
| DEC1 | Lead Home band | Hours and Scheduled payday only; the card title is "On shift now" with "Shift lead" | 0 / 0 | none | Only the kit weekday labels |
| DEC2, DEC3 | Team filters | Two rows of two at 320 and 390; "On the clock 7"; rows keep "Clocked in" | 0 / 0 | none at 320, 390 or 1440 | clean |
| DEC4 | C8 Copy receipt | English throughout ("Week copied", "All with warnings", "Availability not confirmed") | 0 / 0 | none | clean |
| DEC5 | Time exports, Paid time export | "Timecards can be approved from Mon, Nov 30."; the hold card's button reads "Review who's included" | 0 / 0 | none | Time exports: the audit's hits are rows inside its closed sheets; Paid time export: clean |
| DEC6 | Updates (Owner detail) | "Confirmed 0 of 10", "Not yet" per person | 0 / 0 | none | clean |
| DEC6 | Updates (Lead list and detail) | "To confirm", a "Confirm" button, "Confirm I read it", "Confirm that you've read it. Opening it doesn't count." | 0 / 0 | none | The list preview is cut after three lines by design; the audit measures the hidden part |
| DEC7 | Person › Access and sign-in | "Reset password · Give them a link to set a new password" | 0 / 0 | none | clean |
| DEC8 | Timecards, last week | Steps line gone from the page body; "3 timecards to approve · 3 need attention first" | 0 / 0 | none | clean |
| DEC9 | Clocker offline | "Time can't be recorded / This tablet is offline. / Tell a manager so your time gets recorded." and the Spanish "No se puede registrar el tiempo" | not run | none | Spanish at 200% wraps cleanly |
| DEC10 | Clocker unknown ID | "Employee ID or PIN not recognized. Check your Employee ID and PIN, or ask your manager." and the Spanish "ID de empleado o PIN no reconocido…" | not run | none | Spanish at 200% wraps cleanly |

## Tests
- tsc is clean on `5ec53b51`.
- The whole unit suite (`npm test`): 16,162 passed and 62 failed in 6 files, none of them UI files. All six failures are
  environmental:
  - **Shallow clone:** `src/lib/tenancy/*` (inventory ddl and schema-reducer, migrations backfill and ownership) read
    commit `7c628e37`, which this shallow clone doesn't have. `src/test/manual-publication.test.ts` stops with
    "Publication source must be an ancestor of current HEAD".
  - **Load:** `src/lib/operations/managed-runtime.test.ts` failed under the full run's load and passes alone (12/12).

## Noted, not changed
- **Kit (G88 family):** on Employee Schedule at 200% text, the "Confirm" button's label stays its normal size while the
  text around it doubles (phone kit button size in px).
- **Shared sheet pages:** Paid time export, Add shift and Edit shift have a 2px-wide, taller full-page box on phones.
  Nothing scrolls sideways. This is the form-sheet layout in `owner-b-pages.css`, which is already logged (12px gutter).
- **Wording (polish):** the Owner's update detail opens with a lone "Optional" (or "Must be read") label. "Confirming
  is optional" / "Must be confirmed" would match DEC6. This needs Jose's wording approval.
- **Gaps:** no axe pass on the Clocker (its capture mode has none), no 768 captures in this round for the app pages, and
  no WebKit.
