# Time and Team details: capture and gate check (batch-time-team)

Branch `claude-codex-collab-nevora-batch-time-team`, from `claude-codex-collab-nevora` (merged up to `65239ccb`).
Pages: D2 Time corrections, D3 Fix someone's time, D4 My time, D5 Clocker recovery; F2 Add person, F3 Import,
F5 Pay rate, F6 Restrictions, F7 Time off balance, F8 Clocker PIN. Every role each page opens for, plus the notice,
restricted or no-grant screen a role gets instead. Fictional data, a throwaway local Postgres, no real notifications.

## Commits (code)
| Commit | Page | Change |
|---|---|---|
| `3d8f8d24` | D2, D3, F6, F8 | Repeated wording: "Clock in / Clock out" on every request; D3 title twice on phones and "another manager" twice; F6 availability note repeated the amber note; F8 "4 digits" twice (en and es) |
| `8a03f78b` | D5 | "Fix in Timecards" link: its screen-reader name now starts with its visible words |
| `a84232d2` | F8 | The person's name is said once (the line under the title repeated it) |
| `6cf99d4b` | D2, D3, D4 | Correction ranges use the one time format ("Nov 19, 6:00 AM – 2:41 PM", was an arrow) |
| `7b157487` | D2 | Without access, the band shows only the title (it described a queue they can't open) |
| `6a463845`, `f5f69931` | F2, D3 | A closed page names itself: "Add employee" (was "Employee creation"), "Request time correction" (was "Time corrections") |
| `fe23473e` | D4 | Time rows are named by what they show (axe label-content-name-mismatch); the day, drawn aria-hidden, is screen-reader text first |
| `42d6a7b5` | D4 | "No time recorded yet this week" sits on the card's text edge (was 4px left at 768 and 1440) |
| `fac0de07`, `79679305` | D4 | Lead review: the This week footer note sat 28px under "Fix a missed punch"; now the row's 16px (rule in `@layer nv-b`, where the footer rule lives) |
| `f9c22269` | D4 | 200% text at 390: the hours drew over the time range; they now move to the next line |

Tests updated or added beside each change: `manager-time-corrections.test.tsx` (2 new), `clocker-pin-form.test.tsx`,
`restrictions-screen.test.tsx`, `employee-b/time-b.test.tsx`, `employees/new/page.test.tsx`. Typecheck and oxlint
clean; 664 tests across the touched areas pass (`manager-time-corrections`, `clocker*`, `restrictions`, `employee-b`,
`employee-mobile`, `employees/new`, `timecards`, `time-correction`, `clocker-pin-gate`, `timecards.batch`).

## Proof
One discovery production run (`8a03f78b`) found the issues fixed after it; the captures here are from the final
production run on `450280f8` (all fixes, merged with the shared branch), 78 captures, 390 / 768 / 1440, Chromium,
reduced motion. Probe per screen: visible strings and repeats, left and right edges of cards and blocks, button styles
and heights, hit size of every control (including the kit's 44px `::after` overlay), aria-labels that differ from
visible text, the time format, axe (whole page, at 390) and a Tab walk (390 and 1440).

Final run: axe 0 findings on every screen; time format 0 problems; document overflow 0 everywhere; every Tab stop in
main has a ring; no names that differ from their text; the only controls under 44px are the band back links at 1440
on D5, F2 and F8 (shared frames, below).

Roles: Owner `QAOWNER`; company-wide Manager Elena `OWN-ELENA` without and then with Review time exceptions; location
Manager Daniel `OWN-DANI` (Condado) without and then with the grant; Lead James and Employee Ana (fictional).

## Per page (words · button styles · button heights · left / right edges in px · overflow)
| Screen | 390 | 768 | 1440 |
|---|---|---|---|
| D2-owner | 91w 2b h44 L14/15 R14/15 ovf0 | 91w 2b h44 L108 R28 ovf0 | 91w 2b h44 L296 R332 ovf0 |
| D3-owner | 42w 1b h44 L14/15/33 R14/15/33 ovf0 | 42w 1b h44 L108/109/131 R28/29/51 ovf0 | 42w 1b h44 L296/297/319 R332/333/355 ovf0 |
| D4-owner-notice | 16w 1b h44 L14/15/95 R14/15/33/50/103 ovf0 | 16w 1b h44 L108/109 R100/101 ovf0 | 16w 1b h44 L296/297 R584/585 ovf0 |
| D5-owner | 75w 2b h36/52 L16/17/35/97 R16/17/35/74 ovf0 | 86w 2b h44 L108/109/131/193 R28/29/51/67/77 ovf0 | 86w 2b h36/44 L296/297/319/381 R332/333/355/551/561 ovf0 |
| F2-owner | 73w 1b h40 L14 R14 ovf0 | 74w 2b h44 L108 R28 ovf0 | 74w 2b h44 L296 R332 ovf0 |
| F3-owner-off | 26w 1b h44 L14/15/95 R14/15/33/36 ovf0 | 26w 1b h44 L108/109 R100/101 ovf0 | 26w 1b h44 L296/297 R584/585 ovf0 |
| F5-owner | 62w 1b h44 L14/15 R14/15 ovf0 | 64w 1b h44 L108/109 R28/29 ovf0 | 64w 1b h44 L296/297 R332/333 ovf0 |
| F6-owner | 45w 2b h44 L14 R14 ovf0 | 47w 2b h44 L108 R28 ovf0 | 47w 2b h44 L296 R332 ovf0 |
| F7-owner | 40w 0b h– L14/15 R14/15 ovf0 | 42w 0b h– L108/109 R28/29 ovf0 | 42w 0b h– L296/297 R332/333 ovf0 |
| F8-owner | 35w 1b h52 L16/17/35 R16/17/35 ovf0 | 35w 1b h44 L108/109/131 R28/29/77 ovf0 | 35w 1b h44 L296/297/319 R332/333/561 ovf0 |
| D2-manager-nogrant | 17w 0b h– L14 R14 ovf0 | 17w 0b h– L108 R28 ovf0 | 17w 0b h– L296 R332 ovf0 |
| D3-manager | 42w 1b h44 L14/15/33 R14/15/33 ovf0 | 42w 1b h44 L108/109/131 R28/29/51 ovf0 | 42w 1b h44 L296/297/319 R332/333/355 ovf0 |
| D4-manager-notice | 16w 1b h44 L14/15/95 R14/15/33/50/103 ovf0 | 16w 1b h44 L108/109 R100/101 ovf0 | 16w 1b h44 L296/297 R584/585 ovf0 |
| D5-manager-restricted | 16w 1b h44 L14/15/95 R14/15/33/49 ovf0 | 15w 1b h44 L108/109/193 R100/101/123/329 ovf0 | 15w 1b h44 L296/297/381 R584/585/607 ovf0 |
| F2-manager | 73w 1b h40 L14 R14 ovf0 | 74w 2b h44 L108 R28 ovf0 | 74w 2b h44 L296 R332 ovf0 |
| F3-manager-notice | 24w 1b h44 L14/15/95 R14/15/33/35 ovf0 | 24w 1b h44 L108/109 R100/101 ovf0 | 24w 1b h44 L296/297 R584/585 ovf0 |
| F5-manager-restricted | 16w 1b h44 L14/15/95 R14/15/33/49 ovf0 | 15w 1b h44 L108/109/193 R100/101/123/329 ovf0 | 15w 1b h44 L296/297/381 R584/585/607 ovf0 |
| F6-manager | 45w 2b h44 L14 R14 ovf0 | 47w 2b h44 L108 R28 ovf0 | 47w 2b h44 L296 R332 ovf0 |
| D2-locmgr-nogrant | 19w 0b h– L14 R14 ovf0 | 19w 0b h– L108 R28 ovf0 | 19w 0b h– L296 R332 ovf0 |
| D3-locmgr | 22w 1b h44 L14/15/95 R14/15/33/57 ovf0 | 22w 1b h44 L108/109/193 R100/101/123/337 ovf0 | 22w 1b h44 L296/297/381 R584/585/607 ovf0 |
| F2-locmgr | 21w 1b h44 L14/15/95 R14/15/33/57 ovf0 | 21w 1b h44 L108/109/193 R100/101/123/337 ovf0 | 21w 1b h44 L296/297/381 R584/585/607 ovf0 |
| F6-locmgr | 21w 1b h44 L14/15/95 R14/15/33/57 ovf0 | 21w 1b h44 L108/109/193 R100/101/123/337 ovf0 | 21w 1b h44 L296/297/381 R584/585/607 ovf0 |
| D2-manager | 91w 2b h44 L14/15 R14/15 ovf0 | 91w 2b h44 L108 R28 ovf0 | 91w 2b h44 L296 R332 ovf0 |
| D2-locmgr | 37w 0b h– L14/15/95 R14/15/33 ovf0 | 37w 0b h– L108/114/198 R28/106/128/219 ovf0 | 37w 0b h– L296/302/386 R332/590/612 ovf0 |
| D4-lead | 77w 1b h48 L14/15 R14/15 ovf0 | 77w 1b h48 L108/109 R28/29 ovf0 | 77w 1b h48 L296/297 R500/501 ovf0 |
| D4-employee | 60w 1b h48 L14/15 R14/15 ovf0 | 60w 1b h48 L108/109 R28/29 ovf0 | 60w 1b h48 L296/297 R500/501 ovf0 |

Edges: every page puts its cards at 14 / 108 / 296 px left and 14 / 28 / 332 px right (notices are a narrower centred
card by design). D5 and F8 cards sit at 16 px on phones (their Settings frame), 2 px in from the other pages.

D4 follow-up (lead review), production run on `f9c22269`: Employee and Lead at 390, 768, 1440 and 390 with 200% text.
Note gap 16px at every width (was 28px); row heights unchanged at normal sizes (59 / 64px); no overlap at 200% text;
axe 0; overflow 0. The D4 Lead and Employee captures are from this run.

## Before and after words
- D2 card sub-line: "Calle Loíza · Clock in / Clock out" → "Calle Loíza" (a missing time or a break keeps its label).
- D2 without access, band: "Fixes your team asked for. Original times are always kept. Times in Puerto Rico time." → none.
- D2, D3, D4 ranges: "Nov 19, 6:00 AM → 2:41 PM" → "Nov 19, 6:00 AM – 2:41 PM".
- D3 under the title: "Another manager reviews it." → none (the confirmation says it); phone title drawn once.
- D3 closed band: "Time corrections" → "Request time correction". F2 closed band: "Employee creation" → "Add employee".
- D4 rows, screen readers: "Monday, November 23, 6:32 AM – now, 1 h 27 min" (aria-label) → the row's own words with
  "Monday, November 23," first. Last week: "Last week, Nov 16–22, Approved, 5 shifts, 43 h" → "Nov 16–22 5 shifts 43 h"
  (the card heading says Last week and Approved).
- D5 link name: "Fix Maria Rivera’s time in Timecards" → "Fix in Timecards: Maria Rivera’s time" (es likewise).
- F6 under the card (no agreement yet): "Weekly availability is separate. …" → none (kept when an agreement exists).
- F8 hint: "4 digits. Each person needs their own." → "Each person needs their own." (es likewise); the line with the
  person's name under "Clocker PIN" → none.
- Pay (F5) and payroll wording: unchanged.

## Button styles
D2: Decline (quiet text) and Approve (kit outlined row action), 44px. D3, F8: one full-width or right-aligned solid
teal submit (disabled grey until ready), 44 / 52px. D5: Refresh (quiet text, 36px drawn, 44px hit) and Check code
(solid teal). F2: Next in the phone band (white, 40px), Cancel and Next under the card from 768. F5: Change pay rate
(solid teal). F6: Set the agreed times (solid teal) and No restrictions (outlined). D4: Past timecards (band glass
button, 48px). Notices: one solid or outlined step, 44px.

## Impeccable audit (gate)
- Hierarchy: one title per width on every screen (D3 fixed); each card leads with its state or its first field.
- Spacing and alignment: shared edges at every width (above); D4 empty line fixed; D5 / F8 2px phone inset noted.
- Accessibility: axe 0, rings on every stop, names match visible text (D4, D5 fixed); back links at 1440 listed.
- States: Owner, Managers with and without the grant, location Manager, Lead, Employee, notices and Restricted
  captured. Not captured: F3's import form (needs isolated workspace routing), D2 and F6 with requests waiting for
  the location Manager, loading and error states.
- Wording: each fact once on every screen except the items below that live in shared files.

## Left open (outside this package's files)
1. Kit / shell: band back link is 32px tall at 1440 on the Settings frame (D5, F8) and the sheet header (F2); the Corp
   back link has the 44px hit area (G5). The phone sheet header's Next on F2 is 40px.
2. Kit: D2's Approve is the outlined row action, not solid teal (every decision row uses it).
3. Shared Restricted page (D5, F5 for Managers): the back link and the button both say Home.
4. Shared OperationalUnavailable: F6's closed band says "Employee profile" (the profile read it shares with F5 and F7);
   needs a page-name option to say "When they can be scheduled" without breaking the read-failure title.
5. Shared OwnerOnlyNotice (F3): back link says Home on a Team page.
6. D5 and F8 still render through the older Settings frame (`wave-c-kit` SettingsFrame, q- / wc- classes) restyled to
   Direction B; they move with the Settings packages. Note for the lead: F8's hint copy lives in
   `clocker-owner-copy.ts`, which Settings part 2 may also touch.
7. D3: the confirmation checkbox text is a size larger than the field labels (shared management-close form style).
8. F5: with no rate set, two notes stack (the no-rate callout and the Owners-only note); the note is approved pay
   wording, so it stays for Jose to decide.
9. F3: the import form itself needs a capture on a build with isolated workspace routing.

## Proposed ledger rows
| Screen | Gap | Kind |
|---|---|---|
| Settings frame, sheet header | Band back link 32px at 1440 (D5, F8, F2); sheet Next 40px on phones | Accessibility (kit) |
| Decision rows | Approve is outlined, not the solid teal main button | Visual (kit) |
| Restricted page | "Home" twice (back link and button) | Wording (shared) |
| OperationalUnavailable | No page-name option; F6 closed band reads "Employee profile" | Wording (shared) |
| Import a staff list (F3) | Form not captured; back link reads Home | Evidence + wording |
| Pay rate (F5) | Two stacked notes when no rate is set (pay wording) | Product decision |
| Request time correction (D3) | Confirmation text larger than field labels | Visual (shared form) |
