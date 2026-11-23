# Settings part 2 report (J13–J15), Nov 23, 2026

Branch `claude-codex-collab-nevora-settings-2`. Scope changed at 11:42 UTC (lead session): this package is J13 Clocker
tablets, J14 Shift matching and J15 Punch photos, on the shared Settings parts from
`claude-codex-collab-nevora-settings-base` (`cbc3d4bc`). J16 Photo review, J17 Clocker PINs and J18 Billing went to
another session.

## Commits to merge

| Commit | What |
|---|---|
| `0099b474`, `b44a8847` | First pass (own frame for J13–J17; tablet sheet style fix) |
| `95742241` | Reverts the first shots/report commit `9b79e62e` (it covered J13–J18) |
| `28189e7c` | Merge of `claude-codex-collab-nevora-settings-base` (merged, not rebased, so the pushed branch was not rewritten) |
| `77aba825` | J13–J15 on `SettingsPageB`; own frame removed; J16 and J17 files back to the settings-base versions; accessibility fixes |
| `3bb402fc` | Drops a row-height rule that never applied (see Accessibility) |
| (this commit) | Captures, `rows.json` and this report; no app code |

Against `settings-base` the branch touches only: the J14 and J15 pages, `clocker-device-manager.tsx` and its test,
`clocker-owner-copy.ts`, `clocker-owner-b.css`, `clocker-owner-page.css` (new), `photo-settings.css`,
`clocker-schedule-grace.css`. No change to the shared Settings parts (nothing additive was needed).

**Overlap with the J16/J17 session:** `clocker-owner-b.css` is shared with Clocker PINs and the PIN editor. Its
`.q-page.ck-owner` selectors now read `:is(.q-page, .c-page).ck-owner`, so the same rules also reach the new Corp-based
page. Pages still on the Quiet frame are unaffected. Expect a merge touch-point there.

Commit trailers carry this session's own `Claude-Session` link, not the one in `agent-brief.md` (another session's).

## What changed

- **Frame (J13–J15):** off the older Quiet Settings frame (`SettingsFrame`, `q-page wc-page`) onto the shared
  `SettingsPageB` (CorpPage, phone CorpNav with ‹ Settings, CorpTitle on the band from 768px). Same reads, permissions,
  forms, actions and data contracts.
- **J13:** removed the band line "The shared tablets where your team clocks in and out." and the note "One tablet per
  location works best." (explanations shown on every visit). Words 36 → 16. The Add tablet / tablet options sheet keeps
  its Settings form styles through a box-less host (`wc-page`, `display: contents`); before that fix the busy label drew
  beside the idle one ("Get setup codeSaving…").
- **J14:** removed the band line "How the Clocker links a clock-in to a published shift." The paid-time lines are
  unchanged. Card body 49 words.
- **J15:** removed the band line; fixed two lines off the card's text edge ("When this is on…" 2px at 390, "Turn on
  Take punch photos…" 6px from 768px).
- **Shared form parts not swapped in:** `FieldB` draws the same kit classes (`c-field`, `c-in`) as the minutes and days
  fields. Swapping it in would replace J14's approved field error (D24) and change its `aria-describedby`.
  `SwitchRowB` has no On/Off words beside the switch, which J15 shows (Phase 6: the state never rests on colour).
  `SettingsFormB` expects a ConfigurationForm action; these forms send versioned saves and only show success when the
  server confirms them. So J14 and J15 keep their own form logic inside `SettingsPageB`. If every Settings page should
  share them, `SwitchRowB` needs an optional state word and `FieldB` needs the D24 error style.

## Accessibility (fixed on these pages now)

- **Screen-reader names:** a tablet's row had `aria-label="Manage <name>"`, which differs from what it shows. It now
  has no aria-label, so the row's name is its visible name and line. Each action's name now starts with its visible
  words ("Get setup code, Patio tablet", "New code, …", "Set up again, …"; Spanish too). axe
  `label-content-name-mismatch`: 0.
- **Text in rem:** `clocker-schedule-grace.css`, `photo-settings.css` and the setup-code steps and footer button in
  `clocker-owner-b.css` (all px text → rem).
- **Targets:** the tablet row's button box is 40px from 768px, but its overlay covers the whole row (68px; 82px on
  phones). axe `target-size`: 0. Every button is 44px or more.
- **Focus:** rings show on ‹ Settings, the tablet row (inset outline on the row) and Add tablet. The sheet opens with
  focus on Tablet name.

## Proof (one production build at `77aba825`, under `flock /tmp/nevora-heavy.lock`)

`3bb402fc` only removes a rule that never applied, so the captures stand for the tip.

- **Overflow:** page `scrollWidth` equals the viewport at 390, 768 and 1440 on all three pages. 200% text at 390 (dev
  build): nothing past either edge.
- **Edges:** band title at 20 / 108 / 296, cards 14–376 / 108–740 / 296–1108, card text on one edge (33 / 131 / 319).
- **Right edges:** Add tablet ends on the card's text edge (357 / 717 / 1085). J14's Save stops at the 560px field edge
  (approved F11). J15's Save ends at the card's text edge.
- **Buttons:**
  - J13 has the row and one Solid teal Add tablet (52px full width on phones, 44px from 768px).
  - J14 and J15 show one Solid teal Save only after a change.
  - No repeated wording on any page at any width.
- **axe** (wcag2a/aa, 21aa, 22aa, plus label-content-name-mismatch and target-size): 0 at 390, 768 and 1440 on all
  three pages.
- **Console:** 0 errors.
- **Captures:** `shots/settings-2/img/` (WebP q80), Owner only (Owner-only pages): j13, j14, j15 at 390, 768 and 1440,
  plus `j13-owner-sheet-390` and `-1440`.
- **Tests:** 124 pass beside the changed files; typecheck and oxlint are clean.

## Impeccable audit

```
Impeccable audit: J13–J15 Owner Clocker settings (Owner, 390/768/1440, default + changed + Add tablet sheet)
Checked: production-build captures and getBoundingClientRect measurements; axe; keyboard; 200% text at 390 (dev)

Blocking
(none)

Should fix
1. [Spacing] J15's Save ends at the card's text edge; J14's stops at the 560px field block (F11). Pick one for both
   (Jose).
2. [States] Loading: the kit's b-loading.tsx frames for these routes use the older "detail" band shape. It's close to
   SettingsPageB's band but not measured against it. Kit owner to check.

Polish
3. [Accessibility] At 200% text the band title, kit buttons and the switch rows' labels keep the kit's px sizes. These
   are kit and app-shell files, not this package's.

States: Empty ✓ (J13 no tablets, no location) · Loading ? (item 2) · Error ✓ (unchanged state cards) · Success ✓
(unchanged result notes) · Edge ✓ (200% text, unconfirmed save asks for a reload)
Not checked: Spanish screens (these pages render English for the Owner; the copy has Spanish), screen reader and Safari
(no device here), J13 setup-code card after Get setup code (unit-tested; not captured).
```

## Wording

No payroll, tax, legal or billing wording changed. Removed lines (all explanations, none approved text): the three band
lines above and J13's "One tablet per location works best." Screen-reader-only names changed for J13's actions (above).
The copy keys `tabletsSub`, `tabletsNote`, `matchingSub` and `photosSub` (EN/ES) are no longer shown; they stay in
`clocker-owner-copy.ts` for the lead to remove or keep.

## Blocking items left

None.

## Proposed ledger rows

| Screen | Gap | Kind | Status |
|---|---|---|---|
| Punch photos vs Shift matching | Save ends at the card edge on one and the 560px field edge on the other | Alignment | Jose |
| Settings shared parts | `SwitchRowB` has no On/Off words; `FieldB` lacks the D24 field error. Needed before J14 and J15 can use them | Kit | open (settings-base owner) |
| Clocker settings loading (kit `b-loading.tsx`) | Placeholder band shape not checked against `SettingsPageB` | Layout | open (kit owner) |
| Clocker settings band (kit) | Band title, kit buttons and switch labels in px don't grow at 200% text | Accessibility | open (kit owner) |
| Clocker copy | Four keys no longer shown | Cleanup | open |
