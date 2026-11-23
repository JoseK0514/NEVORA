# Density and how we decide

Added Nov 21, 2026 from the QA 1121 fix plan (`docs/handoffs/2026-11-22-qa1121-fix-plan.md`), which Jose approved.
The Nov 21 QA found the same facts repeated three times on Owner Home, rows with three facts in the sub-line, and
explanations shown on every visit. These rules stop that from coming back.

## Density rules

1. **Each fact appears once per screen.** If a count is in the band, the tile and the list header don't repeat it.
   Pick the place where the person acts on it.
2. **A row is a title plus one line.** A third line is for an exception only (for example "Clocked in late"), never
   for routine detail. Detail that is the same on every row (the location on every shift, "30 min break" on every
   Time row) is shown once, or only where it differs.
3. **The band holds the title and at most three figures.** Filters, notes and cards go below the band.
4. **One main action per card.** Other actions go in a ⋯ menu. This narrows the screen-level rule (one teal primary
   per screen) to each card.
5. **Explanations show once:** on the first visit, in an empty state, or behind an info button. Not on every visit.

Approved wording is exempt from cuts: payroll and legal lines, and any line DESIGN.MD records as approved (for example
"Needs your answer", DESIGN.MD Nov 21). If removing words would leave colour as the only cue, move the words instead.

The person page (one-line navigation rows) is the reference pattern for rows.

## How we decide

- **Rules that already decide something are applied, then mentioned.** The spacing scale, 44px targets, tokens, type
  roles, the density rules above and the voice guide don't need Jose's pick. Say which rule decided it.
- **A real design choice goes to Jose as 2–3 options.** Render each option on the real screen with fictional data and
  screenshot it at the widths that matter (usually 390 and 1440). Give one recommendation with the evidence behind it
  (measured height, contrast, line count, the rule it follows). Jose picks; record the pick in DESIGN.MD.
- **Trust wording needs Jose's OK.** Lines that say what did or didn't happen (published, notified, saved, paid) are
  shown to Jose before they ship.
- **Don't ask what the plan already answers.** If the fix plan or DESIGN.MD records a decision, follow it.

## In the audit

Under the Hierarchy lens (`audit.md`), count repeated facts, rows over two lines, band contents and actions per card,
and report each break of these rules as **Should fix** (or **Blocking** when it pushes the main action below the fold
on a 390 phone).
