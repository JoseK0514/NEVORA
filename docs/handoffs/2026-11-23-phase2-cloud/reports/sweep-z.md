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

## Pass 2: sections A–E on 2651a312 (kit band titles in rem, 44px phone band button)
Scope after the lead's split: approved rows in A–E only (F onward went to screens-final). Branch merged `2651a312`
(merge `5055b394`, clean). One production build (14:38–14:49 UTC), the same 45 page and role pairs from A–E at 390 with
200% text and 1440, the same harness and data as pass 1, so a pixel diff between the passes isolates what `2651a312`
changed.

| Check | Result |
|---|---|
| axe (A–E, both widths) | Unchanged from pass 1: clean except the pre-existing B3 Employee name finding |
| Targets, names, overflow | Unchanged (Find cover's differences are because it loaded this time and showed an error last time) |
| Pixel diff | Only time-driven ("Now", clocks) and load-timing differences, plus **B1 Home (location Manager) at 200% text** |

**B1 Home, location Manager, 390 with 200% text: changed since approval.** The band headline ("Checking today…")
now scales with the text size: about twice its approved size, two lines, pushing the figures down. "Good morning,
Daniel" above it doesn't scale, so the two no longer match. Nothing overflows or clips. The change comes from the kit
commit in `2651a312`, not the page. Whether big band titles should scale fully at 200% is a kit and design call, so I
left it. Captures: `img/B1-mgr-approved-390-t200.webp` (approved), `img/B1-mgr-loc-390-t200-before-2651a312.webp`,
`img/B1-mgr-loc-390-t200-after-2651a312.webp`. At 1440 nothing changed.

## Pass 3: the lead's two follow-ups (merged 72d6615b, merge b4ade5da)
**B3 Notifications (Employee): fixed in `62bb955f`.** Each notification row and folded group drops its hand-built
aria-label ("Confirm the week of Nov 23, 7 shifts, unread, action needed, …"); the name is now the row's own text
(title, grey line, chip, time), with the unread dot's meaning as b-sr text in the row ("unread, " / "2 unread, "). The
Unread tab drops `aria-label="Unread, 9"`; a space before its count (it collapses in the tab's grid) makes its name
"Unread 9". Production build of `62bb955f`, Employee, 320, 390, 390 with 200% text, 768 and 1440: axe clean at every
width (was 8 label-content-name-mismatch nodes), no overflow, no overlap. No visible change: at 1440 the only
pixel difference is the clock column; at 390 with 200% text the rows and tab are identical. The band is 4px shorter
because of the kit's phone band button in the tip merge, not this commit. Shots:
`img/B3-employee-{390-t200,1440}-{before,after}-fix.webp`. Tests: `account-b.test.tsx` asserts no row aria-label and the
b-sr unread text; employee-b and employee-mobile 254 pass; the whole `src/components` suite: 276 files, 3,211 tests, 0
failures. tsc and oxlint clean.

**D4 My time (Employee, 1440): not a change since approval; left as is.** The band's "This week" and "Breaks" figures
(`BLive` in `src/components/employee-b/time-b.tsx`) were already there at `7c37af0b` (02:06, before approval). They show
only when the week has recorded time (`m.week.length`). The approved Employee shot had "nothing recorded yet this week",
so the strip was hidden there; this run's fictional Employee is clocked in. They say each fact once: the week's total and
its breaks, against each shift's own hours on the card. On the first worked day the week total equals the one shift
("1 h 30"), so the number repeats only by coincidence.

Items 3 (A8 and A9 sign-up 404 without commerce) and 4 (the shell's "connection isn't secure" notice on the plain-http
harness origin) are harness-only, as noted above.

## Pass 4: Home band lines at 200% text (merged 2e98cf2d, merge 82f95b7e; fix 22b8f04b)
The lead asked for the band greeting in rem. Measured on the production build, the greeting ("Good morning, Daniel",
`.b-eyebrow`) already follows `--b-fs-body` (0.96875rem) and doubles at 200%. The band text that stayed put was the
date and place line under the title (`.b-hero .b-date`, 14px: "Monday, November 23 · Condado") and a figure's small
part ("/3", `.b-live__v small`, 14px). `22b8f04b` sets both to 0.875rem (the same 14px at 100%) in the four places the
kit draws them: `b-foundation.css`, `owner-b.css`, `owner-b-desktop.css` and `employee-b-work.css`. Employee and Lead Home
put the date and place in the greeting line itself, so they already scaled as a whole.

Production build of `22b8f04b`, location Manager and Employee Home at 390, 390 with 200% text and 1440:
- at 200% text nothing in the band stays fixed now (the 200% probe lists no band text); the location Manager's date and
  place wrap to two lines, with nothing clipped;
- axe clean, no overflow;
- at 100% the band is unchanged.

Tests: `src/app/app/kit-text-rem.test.ts` (new "Home band lines in rem" case); `src/components` plus `src/app/app`: 361
files, 4,252 tests, 0 failures.
Shots: `img/B1-mgr-loc-390-t200-{before,after}-band-rem.webp`, `img/B1-mgr-loc-390-after-band-rem.webp`,
`img/B1-employee-390{,-t200}-after-band-rem.webp`.

## Pass 5: Updates list names (merged bd2c353e, merge 404641a6; fix 062735ab)
The Employee and Lead Updates list ("Other updates") rows had a hand-built name ("title, state, time") that differed from
the row (axe label-content-name-mismatch on `#b-message-…`; it predates today). `062735ab` drops it, so each row is named
by its own text (title, author and place, day, and the state once read). An unread row, whose state is drawn only as the
dot, carries that state as b-sr text. No visible change. The merge conflict was two new test blocks side by side in
`kit-text-rem.test.ts`, kept both.

Production build of `062735ab`, Employee and Lead, `/app/updates` at 390, 390 with 200% text and 1440: axe clean at each,
no overflow. At 200% the geometry probe reports the To acknowledge card's clamped body box against its buttons; on screen
the body ends with an ellipsis above them (the clamp's hidden overflow, not drawn). Tests: `account-b.test.tsx` asserts
no row aria-label and the b-sr state; the whole `src/components` suite: 280 files, 3,229 tests, 0 failures. tsc and oxlint
clean. Shots: `img/B6-{employee,lead}-{390,1440}-after-names.webp`.
