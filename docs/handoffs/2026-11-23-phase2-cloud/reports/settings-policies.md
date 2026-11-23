# Settings policies and payroll: J10, J11, J12 (Owner only)

Branch `claude-codex-collab-nevora-settings-policies`, started from `claude-codex-collab-nevora-settings-base` (`cbc3d4bc`).

## Commits
- `7bdc04d8` Settings: time off policies, company policies and payroll settings on Direction B (code)
- `4e831355` Settings policies: wide inset for field stacks and card notes at 768 and up (code)
- The last commit (shots and this report) holds no app code; the lead can merge only the two commits above.

## Shared parts (additive only)
- `settings-b.tsx` `SettingsPageB`: new optional `lang` (passed to the page), and `back={null}` hides the phone band's
  back link while an in-page editor is open. Existing callers are unchanged (the default back is still Settings).
- `settings-b.css`, new rules only:
  - `.c-setb-choice` and `.c-setb-legend`: radio rows under a field label.
  - `.c-setb-sum`: an error summary inside a card.
  - `.c-setb-phoneacts`: an editor's Save and Cancel stacked full width on phones.
  - `.c-card > .c-rows + .c-rows` and `.c-empty + .c-rows`: the dividing line between two lists in one card.
  - `.c-setb-fields[hidden]`: stays hidden. The stack's `display: flex !important` rule overrode `hidden`. This is a
    fix every Settings page needs.
  - Field-stack inset (18px on phones, 22px at 768 and up), scoped to `.pto` and `.cp`.
- No changes to the kit (`b-kit.tsx`, `corp/*`) or the app shell.

## J10 Time off policies `/app/settings/time-off`
- **What changed:** `PoliciesScreen` now renders `SettingsPageB`, and each card is a direct child of the page.
  - QA A1-05 (three button styles in the empty state) is fixed. Add Vacation, Add Sick and Add another policy are now
    one style: kit rows with a bold plus icon.
  - The empty state is the kit's `c-empty` inside the Policies card.
  - The policies note is the card's grey footer note (`c-setb-cardnote`).
  - "Policy saved" is `ResultB` above the card. It takes focus, as before.
- **Editor:**
  - The kind choice (Vacation, Sick or Other) was a filter-chip row; it is now `RadioRowB` rows under the "Policy"
    label.
  - Fields use `FieldB`: outlined, with the error glyph and sentence, help linked by `aria-describedby`.
  - "People can use it" is `SwitchRowB`.
  - The error summary ("3 things to fix above") sits in the card.
  - Cancel and Save policy are in the card footer on 768 and up. On phones they are stacked full width at the card's
    end, and the band shows the title alone.
- **Words:** no string changed. Every visible string comes from `copy.ts` as before (English and Spanish).
- **Buttons:**
  - Solid teal: Save policy, 44px, the only main action.
  - Secondary: Cancel, plus Check again, Reload and Close in the attention cards (were `b-btn` ghost and quiet).
  - Adding a policy: kit rows.
- **Overflow and alignment (production build):**
  - 0px overflow at 390, 768, 1440 and 390 with 200% text.
  - Cards run 14–376 at 390, 108–740 at 768 and 296–1108 at 1440.
  - Row text is at 33, 131 and 319.

## J11 Company policies `/app/settings/company-policies`
- **What changed:** the page leaves the older Quiet look (`q-*`, `QuietNav`, `QuietHeader`). `page.tsx` renders
  `SettingsPageB`, and `CompanyPolicyEditor` returns a fragment whose cards are direct children of the page:
  - Applies to: an outlined select in a card.
  - Tell me about: a form card. Each rule is a `SwitchRowB` with its own fields under it, using `FieldB` selects and
    inputs. The legal line is the card's note, and Save is in the footer.
  - Records: Labor settings and History, as kit rows that open their details in place.
- **State cards:** the read, unauthorized, company-correction, historical, unusable-version, conflict and replacement
  states are `BState` in kit cards, with their buttons in the secondary style.
- **Save:**
  - Phones: Save is on the band (`form="policy-form"`). It shows once a rule changes, through the shared
    `data-save-on-change` and `data-dirty` rule.
  - Recovery and retry: Save replacement version and Try saving again are in the footer on 768 and up, and full width
    on phones.
- **Failed server read:** now `CorpErrorCard` inside `SettingsPageB`; it was the wave-c `SettingsFrame` block.
- **Words:**
  - All approved policy and legal wording is unchanged, including the state titles and lines, the replacement check,
    "Alerts only flag times…", the history lines and the labor review.
  - Removed one repeated heading: "Policy history" inside the History row, which repeated the row's "History".
  - Save's accessible name was "Save policies" while its visible text was "Save". The aria-label is gone, so the name
    is "Save".
- **Same behaviour:** the same reads (`/api/company-policies`), the same POST command, one save per tap, retry with
  the same operation id, the discard guard, and the scope select.
- **Overflow and alignment:**
  - 0px overflow at every width.
  - Fields, row text and the note share one left edge: 33 at 390 (18px inset), and from `4e831355` 131 at 768 and 319
    at 1440 (22px inset).
  - The off-screen `legend` text the scan lists as clipped is the screen-reader-only legend (`c-sr`).

## J12 Payroll settings `/app/settings/payroll`
- **What changed:** `PayrollSettings` renders `SettingsPageB`, with ‹ Payroll and the title on the phone band, and the
  large title and the approved scope sentence on wider screens. The Time and pay tabs follow.
  - Effective date, Reason for change, the draft impact, the note and "Save company preferences" now sit in a white card
    (`c-pset__savecard`). They stood on the grey canvas.
  - That card shows only while a row is open, as before.
- **Words:** no change. All payroll, tax and notice wording is word for word.
- **Buttons:**
  - Solid teal: Save company preferences, Save employee exception and Save payroll access. Each is the one main action
    in its own form.
  - Secondary: Add rule, Try again.
  - Danger: Remove rule.
- **Overflow and alignment:**
  - 0px overflow at every width.
  - The save card's fields share the rows' text edge: 33, 131 and 319.

## Checks run
- `tsc --noEmit`: clean.
- `oxlint` on the changed files: clean.
- `node scripts/run-rstest.mjs src/app/app/settings src/components/payroll`: 457 passed.
- `node scripts/run-rstest.mjs` on the J10 and J11 tests: 26 passed. The tests now assert the new kit classes instead of
  `q-rv--l` and `data-wc-save`.
- Development server on fictional data (owned dev app, seeded Owner `QAOWNER`, payroll fixture):
  - Page shots at 390 and 1440.
  - Interaction runs: J10 validation, J11 switches with the History row open, J12 every row open.
- axe-core (WCAG 2 A/AA, 2.1 AA, 2.2 AA) on `main` for J10 (list and editor), J11 (rule on, History open) and J12 (all
  rows open), at 390 and 1440. No violations in page content. The only finding is in the shared Payroll tabs (below).
- Production build (`NEVORA_OWNED_APP_PRODUCTION=1`, under `flock /tmp/nevora-heavy.lock`). Captured:
  - Each page at 390, 768 and 1440, plus 390 with 200% text.
  - Validation errors: J10 new policy at 390, and J12 save without a reason at 1440.
  - Two extra states: J10 empty at 1440, and J11 with a rule on at 1440.
  - Edge and overflow measurements are in the shots folder's `log.json`.

## Impeccable audit

```
Impeccable audit: J10 Time off policies, J11 Company policies, J12 Payroll settings (Owner, 390/768/1440 and 390 at 200%, list, editor, error, empty)
Checked: production build captures plus dev-server interaction runs; edges measured with getBoundingClientRect; axe-core.

Blocking
None left on the pages' own files.

Should fix (kit or shared, not in my files)
1. [Accessibility] Payroll tabs (`PayrollTabs`, shared with Payroll G pages): the unselected tabs on the band fail
   colour contrast (axe, 2 nodes) and are 36px tall. Fix: white text at full opacity on the band and min-height 44px,
   in the tabs component (Accessibility sweep 1 owns Payroll).
2. [Accessibility] The kit's wide back link "‹ Settings" in the band is 32px tall (all Settings pages). Fix: min-height
   44px in corp.css (kit).
3. [Accessibility] The shared phone band Save (`.c-setb-save`) is 40px tall. Fix: 44px in the shared part (settings-base
   owner).
4. [Spacing] The kit's field error (`.c-error`) has no gap between the warning glyph and its sentence. Fix: 4px gap
   (shared `FieldB` and kit).

Polish
5. [Hierarchy] At 200% text the phone band title stays smaller than the back link, and the On or Off chip (`BChip`)
   does not scale. Neither overlaps or clips. Kit items.
6. [Spacing] On Payroll settings the group cards stand 1px in from the page edge at 768 and up (pre-existing, in an
   `nv-b` layer rule). Change history and the new save card sit on the page edge.

States: Empty ✓ (J10, J11 "No changes yet") · Loading ✓ (route skeletons unchanged; J10 card skeleton) · Error ✓ (J10 field errors and summary, J11 unavailable read, J12 "Fill in Reason for change.") · Success ✓ (J10 "Policy saved" focused; J11 version notice; J12 feedback unchanged) · Edge ✓ (J11 historical location, unusable version, conflict, replacement; read in code and tests, not captured)
Not checked: 320px width (390 used); WebKit; screen-reader speech (names were checked through the DOM and axe); J11 location-scope captures (one location in the fixture).
```

## Blocking items left
None on these pages. The items above sit in the kit, the shared Settings parts or the shared Payroll tabs, which this
package may not change.

## Proposed ledger rows (end sweep)
| Page | Item | Where | Mark |
|---|---|---|---|
| J10–J18 | Wide back link "‹ Settings" is 32px tall | `corp.css` `.c-nav__back` / `c-title` back (kit) | end sweep |
| J1–J18 | Phone band Save `.c-setb-save` is 40px | `settings-b.css` (shared) | end sweep |
| J12, G pages | Payroll tabs contrast on the band and 36px targets | `payroll-tabs` | end sweep |
| All forms | No gap between error glyph and sentence in `.c-error` | kit and `FieldB` | end sweep |
| J10 | `BChip` text and the phone band title don't scale at 200% (no overlap) | kit | end sweep |
| J12 | Group cards 1px in from the page edge at 768 and up | `owner-b` layer | end sweep |
