# Decision for Jose: "Clocked in" is both a Team filter and a row status (G14)

Team's filter "Clocked in 7" sits right above rows that say "Clocked in" (Owner and Elena, every width).

## Options
- **A, as today.** The filter and the rows both say "Clocked in".
- **B, the filter says "On the clock".** The filters read All · On the clock 7 · Not clocked in 0 · Off today 4, and the
  rows keep "Clocked in" and "Clocked in late · 2 min".

You suggested renaming the row status. I chose the reverse because the rows' "Clocked in" is the word Home's Today
list, Who's working ("Clocked in 7") and the Schedule's live rows all use for the same state, and "Clocked in late" is
built on it. Renaming only the filter changes one label instead of a status that appears on four screens.

Shots in `img/`: `team-<A|B>-<390|1440>` (Owner). Production build on fictional data: A is `c4399256`, B changes the
label in `src/components/owner-b/team-b.tsx` (phones) and `src/components/team-desk-people.tsx` (desktop). Axe finds 0
violations in both.

## Recommendation: B
The filter names a group ("who's on the clock") and each row reports its state ("Clocked in"), so the page stops
reading the same two words twice without changing the status vocabulary the rest of the app uses. One downside: "On
the clock" and "Not clocked in" are no longer exact opposites. If that matters more, keep A. The code isn't merged;
it is two one-word changes, ready if you choose B.
