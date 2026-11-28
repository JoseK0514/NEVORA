# Guide build on eb7d800d (Owner workflows)

`guides-eb7d800d.bundle` holds one commit on ref `guides-eb7d`: `8b7286bb2bffe3e46be7eae8a2aba49f6f5da659`, parent `eb7d800d`, the six PDFs and
`manifest.json` only (`--date 2026-11-27`). No guide text changed.

    git fetch docs/handoffs/2026-11-23-phase2-cloud/guides/guides-eb7d800d.bundle guides-eb7d

Application hash `2ab1c7e590b871c01f191d1cd65c0049097094b6ff693a55c9faddc4351b3140`; `check-manuals` verifies all six;
manual-publication and manual-bundle 57/57; pages: owner 9, manager-lead 4, employee 3, rondo 5, developer 7,
operations 7. Against 595d33bf: text identical apart from the markers; all 35 rendered pages differ only in the page-1
hash lines and the footer short SHA.

## Accuracy check
- All 277 quoted labels exist at eb7d800d (none gone since 2f8b31bc). "Copy previous week" appears in the removed lines
  only because its source line was reformatted; the label is unchanged.
- No guide sentence is now wrong. Guides mention Add shift, Copy previous week, Week templates, Employment dates,
  Pay rate and Scheduling rules' hours targets in general terms that still hold.
- View focus: online blur no longer clears location-scoped company views; a hidden tab, page hide or offline blur still
  does. The guides' "step away" sentences (Owner import, Manager/Lead import, Rondo, Operations) stay true.

## Suggested additions (not written)
- Owner, Build a schedule: **Add shift** can add several shifts at once; saved weeks open with **View and edit**
  (under **Saved weeks**).
- Owner and Manager/Lead, time off: declining can include an optional note, which the employee sees with the decision.
- Owner, Scheduling rules: the weekly hours wording ("Set an optional target for each person. Their maximum limits how
  many hours you can schedule each week until you change it.").
- Owner, Copy previous week: the copy receipt offers **Review weekly limits** when copied shifts hit a limit.
- Optional: location lists now offer **All**; the pay-rate reminder can be dismissed.
