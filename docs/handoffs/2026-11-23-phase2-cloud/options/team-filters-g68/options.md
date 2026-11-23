# Decision for Jose: Team's filters on phones (G68)

On a 390px phone the four filters wrap three and one: All, Clocked in and Not clocked in on the first row, and
"Off today" alone, centred, on the second (Owner and Elena's Team).

## Options
- **A, as today.** The pills are sized to their labels and wrap: 3 + 1 at 390px. At 320px they already fall 2 + 2, and
  at 200% text they go one or two per row.
- **B, two rows of two while they fit.** When the card is at least 21rem wide (390px at the default text size), the
  four filters are two equal rows: All | Clocked in, Not clocked in | Off today. The width is in rem, so at 320px and at
  200% text the pills keep A's wrapping; an earlier fixed 2 × 2 grid squeezed "Not clocked in" onto two lines at 320px
  and onto three at 200% text. B only applies when there are four filters (a location Manager's Team has three and is
  unchanged).

Shots in `img/`: `team-<A|B>-<320|390|390t>` (Owner; 390t is 390 at 200% text). Production build on fictional data:
A is `c4399256`, B is the same tree with one rule in `src/app/app/owner-b-home.css`. Axe finds 0 violations in both,
and nothing is clipped at 200% text. 320px and 200% text look the same in A and B.

## Recommendation: B
It removes the lone "Off today" row at the most common phone width, so the control reads as one even block. Nothing
changes where the labels need the room. The code isn't merged; it is one container rule, ready if you choose B.
