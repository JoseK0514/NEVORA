# Sweep gap: C3 Review replacement and C8 Copy receipt (Owner)

Package Z couldn't capture these because each needs a live id. The harness now gets both from fictional data in a
throwaway database. For C8, it opens Publish for the week of Dec 7 and presses Copy last week, which gives a real
`operation` id. For C3, it opens Find cover for tonight's open shift and takes the first candidate's signed `review`
link (Ana Colon). The copy runs first because the copy changes the schedule, so a review taken before it opens as
"Coverage changed".

Production build of `93d15e53` (the merge of 7a79c96c), Owner. Captured at 390, 390 with 200% text, 768 and 1440.
- **C3:** "Review replacement" shows the shift card (Mon, Nov 23 · 6:00 PM – 12:00 AM, ends Tue, Nov 24 · Calle Loíza
  · 38 h this week, target 40 h), "We'll notify Ana when you publish.", a solid Publish change and a text Cancel. Axe
  finds 0 violations at 390 and 1440. At 200% text nothing is clipped or overlapping, the time breaks after its dash,
  and Publish change is full width.
- **C8:** "Week copied" shows "51 shifts · Dec 7–13", Review schedule, and With warnings (Availability not confirmed)
  with one row per person; times read as "6:00 AM – 2:00 PM". Axe finds 0 violations at 390 and 1440, and nothing is
  clipped at 200% text.

Comparison: no approved C3 or C8 shots exist under `docs/handoffs`, and this clone's history is shallow, so I compared
against the inventory and the review notes. Both pages are Direction B (band, white cards, the kit's buttons) and
neither shows "Publishing permission needed" to the Owner. I found no regression and changed no code. One end-sweep
note: C8 shows "51" twice when every copied shift has a warning ("51 shifts" and "With warnings 51").
