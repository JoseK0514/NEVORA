# Decision for Jose: the Lead and Employee band line that repeats the screen

On three screens the band says something the card right under it says again:
- **Lead Home** (from 768px): the band's first figure "On shift now · 9:30 AM – 5:30 PM · Shift lead · Customer
  Support" sits above the "Your shift" card, which shows the same time, position and Shift lead (NV-161).
- **Employee Home** (from 768px): "On shift until 5:30 PM · Customer Support · Main Office" sits above the On shift
  now card with the same range, position and place (EM-025). Phones already leave this figure out.
- **Employee Schedule** (every width): the band reads "7 shifts · 56 h this week" and the Confirm row under it reads
  "Nov 23–29 · 7 shifts".

## Options
- **A, as today.** The band keeps the shift figure (Home) and "7 shifts" (Schedule).
- **B, each fact once.** Home's band keeps only Hours and Scheduled payday, and the shift card says the shift.
  Schedule's band says "56 h this week" and the Confirm row keeps the shift count. Nothing else changes. B also needs
  one follow-up before it ships: with the band no longer saying "On shift now", the Lead's card title goes back from
  "Your shift" to "On shift now", as the Employee's already reads.

Shots in `img/`: `employee-home-<A|B>-<390|1440>`, `lead-home-…`, `employee-schedule-…`. Production build on fictional
data: A is `de3fd929`, B is the same tree with the band change. Axe finds 0 violations in both at 390 and 1440. At
390, Employee Home looks the same in A and B, because phones already hide the figure.

## Recommendation: B
It follows the page done gate's "each fact once". The shift stays in the most prominent place, the first card, and
the band's figures become the two things nothing else on Home says: hours worked and payday. B's code isn't merged
anywhere. It is two small edits, the band figures in `src/components/employee-b/home-b.tsx` and the band line in
`src/components/employee-schedule-corp.tsx`, plus the Lead card title, all ready to make if you choose B.
