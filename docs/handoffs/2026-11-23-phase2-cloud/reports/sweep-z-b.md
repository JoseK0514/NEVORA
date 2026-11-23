# Package Z, half B: regression sweep (sections F to L)

Branch `claude-codex-collab-nevora-screens-final`, on `origin/claude-codex-collab-nevora` merged at `2651a312` (local
merge `05985bc6`). Fictional data, throwaway local Postgres, nothing sent.

## Commits
| Commit | Page | Regression | Fix |
|---|---|---|---|
| `74e54e7d` | J13 Clocker tablets | The new "+ Add tablet" row (S2, `ea544c11`) had a 36px button | Every tablet row's button is a 44px target (the tablet rows were 40px before today, logged and fixed with it so the rows stay one height: 68px at every width); test `clocker-owner-b-targets.test.ts` |
| `bfd49c74` | J14 Shift matching, J15 Punch photos | Since the fields moved to the shared field (S2), the unit inside the number field ("minutes", "days") stayed 16px at 200% text while its value grew to 32px | The unit is sized in rem in the pages' own CSS (16px phone, 15px from 768 at the default size, as the kit; 32px and 30px at 200%), centred in the field; test `clocker-field-unit.test.ts` |

Neither touches kit or shell files or any wording.

## Rows and profiles swept
Every ✓ (Jose, Nov 23) row from section F on, for each profile that opens it: F1 (O, M, Mℓ), F2 (O, M), F4 (O, M),
F5 (O), F6 (O, M), F7 (O), F8 (O), I1 (O, M, Mℓ, L, E), I2 privacy (L, E), I3 (L, E), I4 (L, E), I5 (L, E), I6 (O, M, Mℓ,
L, E), J1–J11, J13–J16, J18 (O), K15 (signed out). 51 page/profile pairs.

Not swept: K13 (someone else's punch in progress) needs the kiosk flow with a registered tablet; not run. J18 Billing
opens "Page not found" in this test app (billing isn't configured), so only that state was checked.

## How
- Two held copies of the owned test app (development build, not a production build), same fictional seed: the
  merged tip and a baseline at `1480ed4c` (this morning, before today's kit changes: band titles in rem, 44px phone
  band button, CorpCount, sidebar name, segment labels in rem).
- Each pair, both builds: 1440×900 (viewport capture, axe-core full run, measurements) and 390×844 with 200% text
  (axe, measurements, viewport-height captures scrolled down the page). Measured: page width vs viewport, text boxes
  overlapping, text clipped by its box, text past the right edge, controls under 44px tall, lines repeated on the
  page.
- Tip compared with baseline: anything new on the tip is a candidate; candidates were checked in the browser and by
  eye side by side, and every capture pair was pixel-diffed and the largest differences looked at.
- The approved shots for these rows aren't in the repository any more (the shot folders hold `rows.json` only), so the
  baseline build stands in for them.

## Results
- axe: 0 violations on every pair at 1440 and at 390 with 200% text, tip and baseline.
- Page width: equals the viewport on every pair at both sizes.
- New on the tip and real: the two above, both fixed and re-measured (J13–J15: no control under 44px except the kit's
  band back link; unit and value the same size; axe 0).
- New on the tip but not a defect (checked):
  - I2 Privacy (L, E) at 390/200%: a paragraph "overlapping" the Support link is inside a closed section (not drawn).
  - J2, J3, J4: overlap/clipping flags on `.c-sr` text, which is visually hidden (1px, clipped); it was `.q-sr` before
    today's Settings move, so the measurement missed it at baseline. J3's hidden Save button is `tabIndex=-1`.
  - I2 at 1440 lost its side contents list: intended (batch 1 item 15, each section title once, one list).
  - J1 smaller group labels, J2 "Locked while you have shifts" said once, J3/J4/J16 text that now grows with 200%,
    band titles and state titles that now grow (I3, J18, F8): intended changes, better at 200%.
- Unchanged from baseline (so not regressions), listed for the end sweep below.

## Before and after
`shots/sweep-z-b/`: after captures for every pair (`<row>-<profile>-1440.webp`, `<row>-<profile>-390-200.webp`, the
first viewport at 390 with 200% text), and the regressions' before (`before-j13-owner-1440.webp`,
`before-j14-owner-390-200.webp`, `before-j15-owner-390-200-b.webp`) next to their after.

## Proposed ledger rows (end sweep; present at baseline too)
| Page | Finding | Kind |
|---|---|---|
| Team F1 (O, M, Mℓ) | The band's filter segments ("All", "Clocked in 7" …) are 36px tall (G88, kit) | end sweep, kit |
| Every Settings and Team detail page at 1440 | The band back link ("‹ Settings", "‹ Team") is 32px tall (G88, kit) | end sweep, kit |
| F4 Person (O, M) at 390 | Phone band "Edit" is 40px tall | end sweep |
| I3 Calendar (L, E) at 390/200% | "Create calendar link" keeps a fixed-size label (`--mobile-body`) | end sweep |
| I5 Passkeys (L, E) at 390/200% | two controls under 44px (same as baseline) | end sweep |
| J4 Features | Screen readers meet two hidden "Saved" texts on load (a status line and the focus target after a save) | end sweep |
| Kit field `.c-in` / `.c-in__suffix` | Fixed 48px field height and 15–16px suffix in `corp.css`; pages using a unit suffix override it (J14, J15 now) | end sweep, kit |

## Gaps
Development build only; no production capture. K13 not swept. J18 only in its not-found state.
