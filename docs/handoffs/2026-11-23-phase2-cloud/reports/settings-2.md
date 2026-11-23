# Settings part 2 report (J13–J18), Nov 23, 2026

Branch `claude-codex-collab-nevora-settings-2`, from `claude-codex-collab-nevora` at `2f2387a9`.

## Commits

| Commit | What |
|---|---|
| `0099b474` | Clocker settings: Direction B page frame for tablets, shift matching, punch photos, photo review and PINs |
| `b44a8847` | Clocker tablets: the tablet sheet keeps its Settings form styles in the new frame |
| (this commit) | Captures, `rows.json` and this report |

Merge the two code commits; the last commit holds only captures and this report.

Commit trailers use this session's own `Claude-Session` link, not the one printed in `agent-brief.md` (that link names
another session).

## What changed

J13–J17 were on the older Quiet Settings frame (`SettingsFrame` from `wave-c-kit`, classes `q-page wc-page`). They now use
the Direction B page that Copy receipt and the other pushed Corp pages use: `CorpPage` with `CorpNav phoneOnly` (back link
and title in the phone band) and `CorpTitle wide` (title in the band from 768px). `ScopedReadFrame` still wraps the page.
The frame is one new component, `src/components/clocker-owner-frame.tsx`. Each page keeps its server reads, permissions,
forms, actions and data contracts.

J18 Billing is already on the approved Direction B sign-in look (DESIGN.MD, "Sign-in, recovery…": teal band, lifted
card, one teal button). It has no older part, and its wording is approved billing text, so it gets no code change. It
was gate-checked in three states.

### Per page

| Page | Change | Words before → after (390) | Button styles after |
|---|---|---|---|
| J13 Clocker tablets | New frame. Removed the band line "The shared tablets where your team clocks in and out." and the note "One tablet per location works best." (density rule 5: explanations shown on every visit) | 36 → 16 | 2: row (opens the tablet), Solid teal "Add tablet" |
| J14 Shift matching | New frame. Removed the band line "How the Clocker links a clock-in to a published shift." Paid-time lines unchanged | 49 → 49 in the card (band line gone) | 1 when changed: Solid teal "Save" (none until a value changes) |
| J15 Punch photos | New frame. Fixed two lines that sat off the card's text edge ("When this is on…" 2px at 390; "Turn on Take punch photos…" 6px at 1440) | unchanged in the card (band line gone) | 1 when changed: Solid teal "Save" |
| J16 Photo review | New frame, back to Punch photos. Removed the band line "Private company photos. Removing a photo preserves its time record." (the removal confirm still says it). The count line shows only when there are records. Removed "Only an authorized Owner can review photos." and "No camera or employee photo collection is started by this page." Card text on the kit inset at every width (was 16px). Review buttons 44px (were the small size) | 47 → 21 | 1: text "Refresh" (rows add a white "Review") |
| J17 Clocker PINs | New frame. Search (outlined field) and the kit's filter chips (`BFilters`, as on Team) now open the one people card. Removed the heading "13 people need a PIN" that repeated the "No PIN 13" chip | 139 → 164 (production fixture has 13 people) | 3: chips, white "Set PIN" (one per row), quiet "Reset PIN" |
| J18 Billing | None | 79 (Nov 22 sweep; unchanged) | Solid teal main, outlined teal second (only when billing can't be checked), text links |

### Buttons, overflow and alignment (production build, `b44a8847`)

Measured with `getBoundingClientRect` on every page at 390, 768 and 1440 (`measure.json` in the scratch folder).

- **Overflow:** page `scrollWidth` equals the viewport at every width on all six pages. 200% text at 390: no element
  past either edge on J13–J17.
- **Left edges:** the band title starts at 20 / 108 / 296 (phone CorpNav at 20, as on Copy receipt); cards span
  14–376 / 108–740 / 296–1108. Card text shares one edge: 33 / 131 / 319 on J13–J17.
- **Right edges:** J13 Add tablet ends at 357 / 717 / 1085 (the card text edge). J17 Set PIN ends on one edge per width.
  J14 Save ends at the 560px field block (approved F11 rule in `b-thirty-day.css`); J15 Save ends at the card's text edge.
- **Heights:** every button 44px or more (Add tablet and Shift matching's Save are 52px full width on phones). Filter
  chips are 36px inside a 44px track (kit). J13's row target is 40px tall from 768px (end sweep).
- **J18:** card 16–374 at 390; the main button 36–354, 52px; when both buttons show they are equal height (52px) and
  stacked full width.
- **Axe** (wcag2a/aa, 21aa, 22aa) on the production build: 0 violations on J13–J17 at 390 and 1440.
- **Keyboard:** on J17 at 390, Tab goes Skip to content → ‹ Settings → search → No PIN → PIN set → Set PIN, each with a
  teal 2px ring. The Add tablet sheet opens with focus on the name field.
- **Console:** 0 errors across all 15 production captures.

## Captures

`shots/settings-2/img/` (WebP, quality 80), Owner only (these pages are Owner-only):

- J13–J17 at 390, 768 and 1440 from ONE production build (`collab-qa.sh --production --serve` at `b44a8847`, under
  `flock /tmp/nevora-heavy.lock`), plus `j13-owner-sheet-390.webp` (Add tablet sheet).
- J18 at 390, 768, 1440 during a trial, and `-paused-` and `-unavailable-` variants. These come from the development
  build: the production fixture has billing switched off, so `/app/billing` is "not found" there. In a throwaway copy of
  the app (never the repository) billing was switched on and the browser answered `/api/commerce/status` with fictional
  replies. No commerce provider, payment or handoff was contacted (the handoff call was answered with an error).

## Impeccable audit

```
Impeccable audit: J13–J17 Owner Clocker settings (Owner, 390/768/1440, default + changed + sheet)
Checked: production build captures and measurements; dev-build 200% text at 390; axe; keyboard on J17

Blocking
(none left)

Should fix
1. [States] J17 loading: b-loading.tsx's "/app/settings/clocker/pins" entry still draws the band with a strip
   (band: 264, strip: true), so the page moves when it arrives. Fix in the kit: { ...detail, title: "Clocker PINs",
   cards: [{ rows: 6, avatar: true }] }. Kit file, read-only for this package.
2. [Hierarchy] J15's Save ends at the card's text edge; J14's stops at the 560px field block (F11). Pick one for both.

Polish
3. [Accessibility] Filter chips' accessible names run label and count together ("No PIN13") — kit BFilters, as on Team.
4. [Accessibility] J13 tablet row target is 40px tall from 768px.
5. [Accessibility] At 200% text the band title, kit buttons, chips and search placeholder keep px sizes (kit).

States: Empty ✓ (J13, J16, J17 kit states) · Loading ✗ (J17 frame mismatch, item 1) · Error ✓ (unchanged state cards)
· Success ✓ (unchanged notes) · Edge ✓ (200% text, 13 people)
Not checked: J16 with records (no fixture photos; unit-tested), Spanish (these pages render English for the Owner),
screen reader and Safari (no device here).
```

```
Impeccable audit: J18 Billing (Owner, 390/768/1440, trial · paused · can't check)
Checked: development build with fictional status replies; measurements

Blocking
(none)

Should fix
(none)

Polish
1. [Hierarchy] Approved billing words repeat "Velani" (intro and button) and "billing" (title and button). Left as
   approved; Jose's call.

States: Empty n/a · Loading ✓ in code ("Checking workplace access…"; not captured) · Error ✓ (can't check: amber note,
Refresh status as the teal button) · Success ✓ (trial) · Edge ✓ (paused: red note, Access paused)
Not checked: production build (billing off in the fixture; the step4-local suite covers it), axe, 200% text.
```

## Wording changes for Jose's OK

Trust lines removed from J16 Photo review (none added):

- "Only an authorized Owner can review photos." (only the Owner reaches the page)
- "No camera or employee photo collection is started by this page."

No payroll, tax, legal or billing wording changed. Paid-time lines on J14, the PIN privacy note on J17 and the photo
removal and retention lines on J16 are unchanged.

## Blocking items left

None in this package's files.

## Proposed ledger rows (end sweep unless marked)

| Screen | Gap | Kind | Status |
|---|---|---|---|
| Clocker PINs (kit `b-loading.tsx`) | Loading placeholder draws the old band with a search strip; the page now has a plain title band, so it shifts on arrival | Layout shift | open (kit owner) |
| Punch photos vs Shift matching | Save ends at the card edge on one and the 560px field edge on the other | Alignment | Jose |
| Clocker tablets | Row target 40px tall from 768px | Targets | end sweep |
| Clocker PINs, Team (kit `BFilters`) | Chip name reads "No PIN13" (label and count with no space) | Accessibility | end sweep |
| Clocker settings band (kit) | Band title, kit buttons, chips and search placeholder don't grow at 200% text | Accessibility | end sweep |
| Photo review | Rows with photos not captured (no fixture photos) | Evidence | open |
| Billing (Owner) | Approved words repeat "Velani" and "billing" | Wording | Jose |
| Billing (Owner) | Production-build capture needs the step4-local suite (billing is off in the collab fixture) | Evidence | open |
| Clocker copy | `tabletsSub`, `tabletsNote`, `matchingSub`, `photosSub` (EN/ES) are no longer shown | Cleanup | end sweep |
| Photo review | Two trust lines removed (above) | Wording | Jose |
