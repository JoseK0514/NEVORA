# Package Z: regression sweep of approved screens (Nov 23, 2026)

Branch `claude-codex-collab-nevora-sweep-1`, merged with `claude-codex-collab-nevora` at `9596f934` (merge `c7ab36ad`;
`src` is identical to `9596f934`). Fictional data, a throwaway loopback Postgres, the owned local app; non-loopback
browser requests aborted.

## Result
**No regressions found, so no code changed.** One pre-existing axe finding and one layout change since approval are
listed for you below. Neither came from today's kit merges (CorpCount, CorpSegments, BLive, band titles, rem text).

## How
- One production build of `c7ab36ad` (14:18–14:33 UTC), plus a short second build (14:35) for the Employee Schedule
  full length and Passkeys with the passkeys switch on.
- Every approved (✓ Jose, Nov 23) row in `docs/product/page-inventory.md`, one role per row (two where the roles render
  different components): 61 page and role pairs, 390 with 200% text and 1440 at viewport height (122 captures).
- Per capture: axe-core 4.14.1 (with label-content-name-mismatch and target-size), names against visible text, targets
  under 44px, overlapping and clipped text, horizontal overflow, repeated lines.
- Compared with the approved shots from each package branch's `shots/<package>/rows.json`: a coarse image difference
  to rank every pair, then by eye for every pair that differed (composites of reference and now).

## Table (page, role, checks, result, captures in `shots/sweep-z/img`)
| Row | Role | Checks | Result | Captures |
|---|---|---|---|---|
| A3 | public | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `A3-public-390-t200.webp` · `A3-public-1440.webp` |
| A4 | public | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `A4-public-390-t200.webp` · `A4-public-1440.webp` |
| A5 | public | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `A5-public-390-t200.webp` · `A5-public-1440.webp` |
| A6 | public | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `A6-public-390-t200.webp` · `A6-public-1440.webp` |
| A7 | public | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `A7-public-390-t200.webp` · `A7-public-1440.webp` |
| A8 | public | axe clean · no overflow · HTTP 404 | 404 in a production build (sign-up needs commerce on); the approved shot is a dev build. Not a regression. | `A8-public-390-t200.webp` · `A8-public-1440.webp` |
| A9 | public | axe clean · no overflow · HTTP 404 | 404 in a production build, as A8. Not a regression. | `A9-public-390-t200.webp` · `A9-public-1440.webp` |
| A10 | public | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `A10-public-390-t200.webp` · `A10-public-1440.webp` |
| A11 | public | axe clean · no overflow · HTTP 200 | Section names listed twice at 1440 (contents and accordions): the same as the approved shot. | `A11-public-390-t200.webp` · `A11-public-1440.webp` |
| A12 | public | axe clean · no overflow · HTTP 200 | As A11. | `A12-public-390-t200.webp` · `A12-public-1440.webp` |
| A13 | public | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `A13-public-390-t200.webp` · `A13-public-1440.webp` |
| A14 | public | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `A14-public-390-t200.webp` · `A14-public-1440.webp` |
| B1 | mloc | axe clean · no overflow · HTTP 200 | Matches; the approved shot is the company Manager, so compared by layout only. The http-origin notice overlaps the phone capture (harness). | `B1-mgr-loc-390-t200.webp` · `B1-mgr-loc-1440.webp` |
| B2 | emp | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `B2-employee-390-t200.webp` · `B2-employee-1440.webp` |
| B2 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `B2-owner-390-t200.webp` · `B2-owner-1440.webp` |
| B3 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `B3-owner-390-t200.webp` · `B3-owner-1440.webp` |
| B4 | mloc | axe clean · no overflow · HTTP 200 | Matches. The http-origin notice overlaps the phone capture (harness). | `B4-mgr-loc-390-t200.webp` · `B4-mgr-loc-1440.webp` |
| B6 | owner | axe clean · no overflow · HTTP 200 | No approved Owner shot (references are Employee/Lead); checked by gate only. | `B6-owner-390-t200.webp` · `B6-owner-1440.webp` |
| B7 | owner | axe clean · no overflow · HTTP 200 | No approved Owner shot; checked by gate only. | `B7-owner-390-t200.webp` · `B7-owner-1440.webp` |
| B8 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `B8-owner-390-t200.webp` · `B8-owner-1440.webp` |
| B9 | emp | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `B9-employee-390-t200.webp` · `B9-employee-1440.webp` |
| B9 | mloc | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `B9-mgr-loc-390-t200.webp` · `B9-mgr-loc-1440.webp` |
| B10 | manager | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `B10-manager-390-t200.webp` · `B10-manager-1440.webp` |
| B11 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `B11-owner-390-t200.webp` · `B11-owner-1440.webp` |
| C1 | emp | axe clean · no overflow · HTTP 200 | Matches (only data differs). The geometry flag is the desktop card header hidden on phones. | `C1-employee-390-t200.webp` · `C1-employee-1440.webp` |
| C1 | mloc | axe clean · no overflow · HTTP 200 | Matches by layout; the reference is a different Manager. Clipped-text flag at 1440 is hidden print text. | `C1-mgr-loc-390-t200.webp` · `C1-mgr-loc-1440.webp` |
| C2 | mloc | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C2-mgr-loc-390-t200.webp` · `C2-mgr-loc-1440.webp` |
| C2 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C2-owner-390-t200.webp` · `C2-owner-1440.webp` |
| B3 | emp | axe label-content-name-mismatch ×8 · no overflow · HTTP 200 | Pre-existing, not a regression: 8 axe label-content-name-mismatch nodes (rows named "…, unread, action needed, …"; the labels date from 02:06 today, before the kit merges). Listed, not fixed. | `B3-employee-390-t200.webp` · `B3-employee-1440.webp` |
| C4 | mloc | axe clean · no overflow · HTTP 200 | Shift scan-0 is outside his location, so the guard shows; the approved form state wasn’t reproduced. | `C4-mgr-loc-390-t200.webp` · `C4-mgr-loc-1440.webp` |
| C4 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C4-owner-390-t200.webp` · `C4-owner-1440.webp` |
| C5 | owner | axe clean · no overflow · HTTP 200 | Without a shift the route goes to the Schedule (open view); approved shot had a shift. Not comparable. | `C5-owner-390-t200.webp` · `C5-owner-1440.webp` |
| C6 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C6-owner-390-t200.webp` · `C6-owner-1440.webp` |
| C7 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C7-owner-390-t200.webp` · `C7-owner-1440.webp` |
| C9 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C9-owner-390-t200.webp` · `C9-owner-1440.webp` |
| C10 | manager | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C10-manager-390-t200.webp` · `C10-manager-1440.webp` |
| C11 | emp | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C11-employee-390-t200.webp` · `C11-employee-1440.webp` |
| C13 | emp | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C13-employee-390-t200.webp` · `C13-employee-1440.webp` |
| C13 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `C13-owner-390-t200.webp` · `C13-owner-1440.webp` |
| C14 | emp | axe clean · no overflow · HTTP 200 | Without a shift the route opens the Schedule picker; approved shot had a shift. Not comparable. | `C14-employee-390-t200.webp` · `C14-employee-1440.webp` |
| C15 | emp | axe clean · no overflow · HTTP 200 | As C14. | `C15-employee-390-t200.webp` · `C15-employee-1440.webp` |
| D1 | owner | axe clean · no overflow · HTTP 200 | The http-origin security notice covers the phone figures (harness); desktop matches. | `D1-owner-390-t200.webp` · `D1-owner-1440.webp` |
| D2 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `D2-owner-390-t200.webp` · `D2-owner-1440.webp` |
| D3 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `D3-owner-390-t200.webp` · `D3-owner-1440.webp` |
| D4 | emp | axe clean · no overflow · HTTP 200 | Layout change since approval: from 768 the band now shows This week and Breaks figures (not in the approved shot). Flag for Jose/lead; not changed. | `D4-employee-390-t200.webp` · `D4-employee-1440.webp` |
| D5 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `D5-owner-390-t200.webp` · `D5-owner-1440.webp` |
| E1 | owner | axe clean · no overflow · HTTP 200 | Matches. The http-origin notice overlaps the phone capture (harness). | `E1-owner-390-t200.webp` · `E1-owner-1440.webp` |
| F1 | mloc | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `F1-mgr-loc-390-t200.webp` · `F1-mgr-loc-1440.webp` |
| F2 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `F2-owner-390-t200.webp` · `F2-owner-1440.webp` |
| F4 | owner | axe clean · no overflow · HTTP 200 | No approved shot in the package branches; gate only. | `F4-owner-390-t200.webp` · `F4-owner-1440.webp` |
| F5 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `F5-owner-390-t200.webp` · `F5-owner-1440.webp` |
| F6 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `F6-owner-390-t200.webp` · `F6-owner-1440.webp` |
| F7 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `F7-owner-390-t200.webp` · `F7-owner-1440.webp` |
| F8 | owner | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `F8-owner-390-t200.webp` · `F8-owner-1440.webp` |
| I1 | owner | axe clean · no overflow · HTTP 200 | No approved Owner shot (references are Employee/Lead); gate only. | `I1-owner-390-t200.webp` · `I1-owner-1440.webp` |
| I2 | emp | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `I2-employee-390-t200.webp` · `I2-employee-1440.webp` |
| I3 | emp | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `I3-employee-390-t200.webp` · `I3-employee-1440.webp` |
| I4 | emp | axe clean · no overflow · HTTP 200 | Matches the approved shot (layout, buttons, text at 200%). | `I4-employee-390-t200.webp` · `I4-employee-1440.webp` |
| I5 | emp | axe clean · no overflow · HTTP 200 | Clean with the passkeys switch on (second run). | `I5-employee-390-t200.webp` · `I5-employee-1440.webp` |
| I6 | emp | axe clean · no overflow · HTTP 200 | No approved shot; gate only. | `I6-employee-390-t200.webp` · `I6-employee-1440.webp` |
| I6 | owner | axe clean · no overflow · HTTP 200 | No approved shot; gate only. | `I6-owner-390-t200.webp` · `I6-owner-1440.webp` |

Not covered: C8 Copy receipt (needs a copy operation id) and C3 Review replacement (needs a review id); neither has an
approved shot in the package branches.

## Items for the lead
1. **B3 Notifications (Employee):** 8 axe `label-content-name-mismatch` nodes. Rows and folds are named "…, unread,
   action needed, …", which differs from the visible row text (`src/components/employee-b/messages-b.tsx` lines 118 and
   156). These labels date from `7c37af0b` (02:06), not from today's kit merges, so I didn't change them. A fix is to
   drop the aria-labels and put the unread and action-needed state in visually hidden text inside the row.
2. **D4 My time (Employee, 1440):** the band now shows "This week" and "Breaks" figures that the approved shot doesn't
   have. This looks intentional (later package work), but it differs from what Jose approved.
3. **A8, A9 sign-up:** 404 in a production build without commerce on; their approved shots came from a dev build.
4. **Harness:** on the plain-http owned origin the shell shows "This connection isn't secure" over the content (D1, E1,
   B1, B4 phone captures). The approved shots came from the https origin. Not an app regression.
5. Small targets the sweep saw are the known kit/shell rows from sweep 1 (band back links 32px, 36px segments, 40px
   band buttons); unchanged since approval.
