# Package S2: Settings consistency (report)

Branch `claude-codex-collab-nevora-settings-final`, from `claude-codex-collab-nevora` at `d2796086`. Fictional data only;
no deploys, publishing, payments or payroll submissions. No kit or shell files changed. One additive change to the
shared Settings parts: an optional `status` slot on `SwitchRowB` (`settings-b-form.tsx`) and one result-notice rule in
`settings-b.css`.

## Commits
| Commit | What |
|---|---|
| `6968ec3b` | J9 Break types dialog: Archive/Reactivate is a white secondary (Reactivate was red); red only on the Archive confirm. Empty-state Add is the one solid button. |
| `9463b81f` | One Add pattern: J13 ends its tablet list with the "+ Add tablet" row; J8's empty-state Add is solid. |
| `42d3b24a` | J12 Payroll settings: group labels inside the cards; Payroll's tabs stay. |
| `43b9a287` | J14 Shift matching: FieldB, the form is the card (direct child of the page), Save in the phone band after a change and at the card footer's right edge from 768. |
| `3ce12dce` | J15 Punch photos: SwitchRowB (keeps its On/Off words via the new `status` slot) and FieldB; Save as on J14; card is a direct child of the page. |
| `f72d6b65` | J10 Time off: an open policy saves from the phone band; Cancel stays at the card's end. |
| `3add6154` | J5 Locations: the second line no longer repeats the short name. |
| `2ca54479` | J5 error page titled "Locations" (was "Your workplaces"), no explanatory line; Settings result icons align with the first line. |
| `530607d9` | Tests expect the solid empty-state Add. |
| `6fddc7d9` | J14/J15: the unit ("minutes", "days") stays inside a 10rem field (found in the final capture). |

Checks: `tsc --noEmit` clean; oxlint clean on the changed paths; unit tests for Settings, Clocker devices, schedule grace,
punch photos, Time off and Payroll settings pass (175 tests in the Settings set, 28 Clocker devices, photos and grace).

## The nine items
1. **Save placement.** Phone band + card footer (`CorpFormFooter`, right edge from 768) now on J2, J3, J6, J7, J10, J11,
   J14, J15. J4 saves each switch as it changes (no Save). J12 keeps its effective-date and reason save card: that is the
   approved payroll change flow (an effective date and a reason are required), so it was not moved to the band. J8/J9
   dialogs keep the J3 order (white secondary, then the solid main; phones stack the main on top).
2. **Add pattern.** "+ Add …" rows on J5, J8, J9, J10 and now J13. Empty states keep one solid main action.
3. **J12 group labels** inside the cards (Pay schedule; Reminders and pay statements; People).
4. **J14/J15 on FieldB / SwitchRowB.**
5. **Locations repeats.** Card title and the always-true line were already gone; the full name now shows only when it
   says more than the short name ("Studio" / "West Office"), not "Calle Loíza" under "Northside Café · Calle Loíza".
6. **Break types buttons:** one solid main, white secondaries, red only for Archive's confirm.
7. **Positions explainer:** already removed on the base branch; verified.
8. **Time off empty state:** already "+ Add" rows on the base branch; verified.
9. **J5 result icon** aligns with the title line (`.c-setb-result .b-notice`); error title uses the page name.

Words before/after: "Your workplaces" → "Locations"; "Where your team works, each place's scheduling setup and its Clocker
link." removed (error page). Approved payroll, tax, legal, billing and privacy wording unchanged (J16's two privacy lines
included).

## Captures
`shots/settings-final/`: `J<n>-owner-<390|390t200|768|1440>.webp` for J1–J18, `index.html` (side by side, one row per
page) and `rows.json`. Production build (`NEVORA_OWNED_APP_PRODUCTION=1`), Owner, fictional workspace. Each capture is
viewport-height shots scrolled down the page and stitched (the fixed tab bar and sidebar appear once). J1–J18 captured at
`530607d9`; J10, J12, J13, J14 and J15 re-captured on a local merge of the shared tip `7ce8de66` (kit rem fixes) with
this branch at `6fddc7d9`. J18 is shown with billing on and no billing service in the build, so it shows the Owner
recovery frame's "We can't check billing right now".

Measured on every capture: no page overflow, no clipped or overlapping text, axe 0 violations, root font 32px on the
200% text captures. Left and right edges: cards share the narrow column's edges at every width; J14 and J15 end Save at
the card footer's right edge.

## Impeccable audit (changed pages)
- Hierarchy: one title per page in the band; group labels inside cards everywhere (J12 now matches); one solid button
  per view.
- Spacing: cards are direct children of the page on J14/J15 (J13 keeps its `ck-stack` grid, same gaps).
- Accessibility: no new aria-labels that differ from visible text; switch names are their labels; Add rows are buttons
  named by their text.
- States: Save appears only after a change (band on phones, footer from 768); Reload stays visible at every width when a
  save couldn't be confirmed.

## Left (for other packages)
- Package K (kit): J17 `CorpSegments` labels ("No PIN 12", "PIN set 0") spill out of their buttons at 390 and with 200%
  text (segment height, item 3). The capture's "spill" flag on `a.c-nav__back` at 768/1440 is the phone-only band link
  that is hidden there.
- End sweep (proposed rows): J13 tablet row buttons (`ck-trow__open`) showed no outline/box-shadow focus ring in the
  keyboard walk (may be drawn another way; confirm). J17 search field showed no focus ring. J14 screen readers hear "Shift
  matching" as the page title plus the form's hidden heading and legend; drop the hidden heading and legend.
