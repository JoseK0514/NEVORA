# Settings: Clocker PIN photo review, Clocker PINs and Billing (package `settings-billing`)

Branch `claude-codex-collab-nevora-settings-billing`, started from `claude-codex-collab-nevora-settings-base` (cbc3d4bc).
Owner only on all three pages. Fictional data, a throwaway local Postgres, no payments, deploys or publishing.

## Commits
- `fcd80ecb` Settings: Clocker PINs and Photo review on Direction B
- `356786d9` Settings: Clocker PINs and Photo review text on the card's wide inset
- `638821e3` Billing: Owner card's text links and warning glyph scale with text
- `2fe13d26` Settings: Clocker PINs and Photo review controls scale with 200% text
- `e89b4df0` Settings: Clocker PINs search shows one focus ring
- shots and this report: the last commit on the branch (merge only the code commits above)

**Shared Settings parts:** not changed. Both Settings pages use `SettingsPageB` as is, plus the shared `.c-setb-cardnote`.
**Kit and app shell:** not changed (needed changes are listed at the end).
**Other packages' files:** not touched (J13 to J15: `clocker-owner-b.css`, `photo-settings.css`, `photo-settings.tsx` unchanged;
the J16 page simply stops importing `photo-settings.css`).

Checks: `tsc --noEmit` clean; oxlint clean on every changed path; unit tests beside the changes pass
(`clocker-pin-inventory`, `photo-review`, `commerce-recovery/*`, `clocker-owner-loading`, `owner-only-title`,
`settings/layout`, `settings/foundation-pages`, `b-loading-motion`, `b-states`: 170 + 43 passed, 0 failed).

## J17 Clocker PINs (`/app/settings/clocker/pins`)
**What changed.** `SettingsFrame` (older wave-c frame) → `SettingsPageB`. The B-kit inventory inside a second nested
`c-page` → Corp parts: one white card (`c-card`) holding the search, the tabs (`CorpSegments`), the rows (`CorpRows`/`CorpRow`
with `CorpAvatar`) and its note (`c-setb-cardnote`). The card is the page's first block, so it lifts over the band as on
every Settings page (the search had been straddling the band's edge at 1440). Same read (`listOwnerClockerPinStatuses`,
the Team directory and positions), same `requireRoles(['OWNER'])`, same links (`/app/employees/<id>/clocker-pin?from=pins`).

**Words.** Before: tab "No PIN 12", then a card heading "12 people need a PIN" (same count twice) and, under people
without a position, "No PIN yet" in the No PIN tab (always true there). After: the tab alone names the group; the list keeps
"12 people need a PIN" only as its screen-reader label. Every other string unchanged (copy file untouched).
Visible strings at 390 and 1440: ‹ Settings (phone) / Settings (desktop back) · Clocker PINs · Search by name · No PIN 12 ·
PIN set 0 · per row: name, "Front counter · Calle Loíza", Set PIN · "Each person clocks in with their own Employee ID and
PIN. Nobody can see a PIN after it is set, including you." No repeats.

**Buttons.** Set PIN: kit white secondary (`c-btn--secondary`), 44px, one per row, same width in every row. Reset PIN and
View profile: teal text action (`c-link--l`). Empty states: one white secondary (Clear search; "12 people need a PIN").
No solid teal on the page (no main action; each row has one action).

**Edges.** 390: card 14–376; search, avatars and note text start at 33; search and Set PIN end at 357. 768/1440: the
search, tabs and note moved to the kit's 22px wide inset, so search, avatars and note share 319 and the tabs and Set PIN
share the right edge 1086 at 1440. Overflow 0 at 390, 768, 1440 and 390 with 200% text; no clipped or overlapping text.

**End-sweep items fixed here.** Tab names were "No PIN, 12" (differs from visible "No PIN 12") → visible words. Row button
names were "Set a Clocker PIN for Maria Rivera" (visible "Set PIN" not at the start) → "Set PIN, Maria Rivera" (visible
words + hidden name). At 200% text the kit's search, tabs and buttons stayed at fixed px beside growing rows → page-scoped
rem sizes with growing heights (44px / 36px minimums). Double focus ring on the search → one. axe: 0 violations.

## J16 Photo review (`/app/settings/clocker/photos/review`)
**What changed.** `SettingsFrame` + a nested `c-page c-embed c-photos` → `SettingsPageB` (back ‹ Punch photos) with the cards
as the page's own. Same reads and actions (`listClockerPunchPhotosAction`, detail, remove), same focus moves, same messages.
The list card: kit rows with a white Review (44px) on the right. Results (loaded, failed, removal confirmed) now show in the
kit's notice card under the list (same words, same status/alert roles). The empty state is the kit's `BState`.

**Words.** Removed: band summary "Private company photos. Removing a photo preserves its time record." (the removal
confirmation already says the time record stays); lede "N original clock actions in the current company. Only an authorized
Owner can review photos." (the count moves beside the label as "Clock actions N", hidden at 0; only an Owner can open the page);
empty-state line "No camera or employee photo collection is started by this page." (explains the page). **Jose: if that last
sentence or the summary is approved privacy wording, say so and they go back.** Card label "Company punch photos" →
"Clock actions" (the back link already says Punch photos). Kept word for word: every message, the removal confirmation,
retention line and "Images open privately on request…" (now the record card's note).

**Buttons.** Review: white secondary, one per row. Record card: View private photo (solid teal, the card's one main action)
and Remove photo (white) side by side, equal width on phones; Keep photo / Confirm photo removal (danger). Refresh and Close
record: teal text in the card head.

**Edges.** Card label, empty state and text share the 22px inset at 768+ and 19px at 390; overflow 0 at every width.
End sweep fixed: Review and Refresh names now start with their visible word; px text → rem; 200% text scales. axe: 0.
**Gap:** no fixture holds real punch photos, so rows, the record card and the confirmation were checked in unit tests only.

## J18 Workplace billing (`/app/billing`, Owner)
**Why it keeps its own frame.** The page is a commerce recovery route: the layout (read-only for me) renders it without the
app shell so it opens while access is paused. `SettingsPageB` and `settings-b.css` need the shell, so moving it would change
routing and server behaviour. It already uses the Direction B sign-in frame (band, lifted white card, solid teal pill).

**What changed.** Wording, reads, the Velani handoff and every state unchanged. The card's text links (Refresh status,
Return to workspace, My pay statements) stand one per line, centred, 4px apart; before, at 200% text "Return to workspace"
wrapped left-aligned between the others and on desktop the three split 2 + 1. The callout's warning glyph is sized in em
(was fixed 18px). `recovery.module.css` only gains `linksStack` and `calloutIcon`; central billing and the paused Clocker page
don't use them.

**Buttons.** One solid teal pill per state (Open billing in Velani, or Refresh status when the status can't be read, with
Open billing as the white outline); everything else teal text, 44px.
**Evidence.** Captured from a fictional-data fixture of the real components (production React build, the app's tokens and
CSS, fetch answered in the page) for paid, payment-needs-attention and access-paused: overflow 0 at 390, 768, 1440 and 390
with 200% text; axe 0 violations (paid, grace, restricted, unavailable). The running app can't show these states without a
live commerce service (with the flag on and no service the scan shows "Page not found" / unreachable).

## Impeccable audit
| Check | J17 PINs | J16 Photo review | J18 Billing |
|---|---|---|---|
| Hierarchy | Title, then one card; tabs name the group; one action per row | Title, list card with count, record card on demand | Title, status rows, one main pill |
| Spacing | 4/8 scale; card inset 18 / 22 | same | unchanged sign-in rhythm |
| Accessibility | axe 0; names start with visible words; 44px buttons; one focus ring | axe 0; names fixed | axe 0; em glyph |
| States | list, empty (PIN set), no match, load failed | empty, loading, result, failure | loading, paid, grace, paused, unavailable, denied |
| 200% text | scales, nothing clipped | scales | scales, links centred |

## Blocking items left
None found on these pages.

## End-sweep items (proposed ledger rows, kit or shell, not fixed here)
| Proposed row | Where | Item |
|---|---|---|
| ES-SB1 | Kit `corp.css` / B layer | `c-seg` tabs are 36px tall with no 44px hit area under Direction B (scan measures 36). |
| ES-SB2 | Kit `corp.css` | `c-btn`, `c-seg`, `c-in`, `c-link` text is fixed px; pages need local rem overrides for 200% text. |
| ES-SB3 | Kit `corp.css` | `c-av` avatars stay 36px at 200% text. |
| ES-SB4 | Shared `settings-b.css` | `.c-setb-cardnote` uses the 18px inset at 768+, while kit rows use 22px: 4px off on every Settings card with rows (overridden locally on PINs). |
| ES-SB5 | `owner-b/b-loading.tsx` | The PINs loading frame still draws the old band strip (search in the band, 264px band); the page now has the search in the card. |
| ES-SB6 | Scan harness | `c-nav__back` reports text taller than its box at 768+ (scan "spill"); likely the kit's negative-margin link. |
| ES-SB7 | Billing route | From Settings → Plan and billing in good standing there's no way back to Settings (only Return to workspace → /app); changing it is routing, not presentation. |
