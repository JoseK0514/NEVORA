# Navigation and schedule (batch-nav): capture and gate check

Branch `claude-codex-collab-nevora-batch-nav`, from `claude-codex-collab-nevora` at `2f2387a9`. Fictional data, a
throwaway local Postgres and the owned local app only. No notifications, deploys or publishing.

## Commits (code)

| Commit | What |
|---|---|
| `629d6b20` | C6 Build and publish says Published once; C13 Open shifts: Employee and Lead page on the corporate frame, kit rows with a quiet Claim, managers' empty line drops "authorized"; C14/C15 no stray rule at the card top, inline Refresh, desktop Offer-for-cover edge |
| `c8754a71` | C14 Offer for cover: no side padding on desktop |
| `1fda32f0` | C14 inline Refresh stays text on touch screens (rule moved into layer `nv-b`, where the touch floor lives) |
| `a4d74cfa` | B5 Requests error card: "We couldn't load your requests." (the Try again button follows, so the sentence no longer says it too) |
| `c48d6436` | Screen-reader names match the visible text (2-hour target, no end sweep): B4 filter pills read "All, 14" through a hidden ", " instead of an aria-label, and B4 rows, B5 request rows, the B2 profile row and B9 Email support drop their differing aria-labels |
| `772ff5a1` | B9 Employee Help: Email support's name matches its visible text |

The shots commit `12d92752` came before the last three code commits, which change no visible pixels (two accessible
names and one error sentence). A final docs commit updates `rows.json` and this report.

Checks: `tsc --noEmit` clean; oxlint clean on the changed paths; `run-rstest` on `src/app/app/schedule/publish`,
`src/app/app/exchange`, `src/app/app/requests`, `src/components/employee-mobile`: 0 failures. New or updated tests:
`publish/page.test.tsx` (Published once when the week is done), `open-shift-board.test.tsx` (claimable rows, no quiet
classes, one Claim, the one time format); `manager-inbox-corp.test.tsx` and `requests-b.test.tsx` now assert names
through visible text instead of aria-labels.

Axe after `c48d6436` and `772ff5a1` (development build; Owner, location Manager and Employee; B2, B4, B5, B9 at 390 and
1440): 0 violations, apart from Employee Help's Email support, which `772ff5a1` then fixed (unit-tested, not
re-captured). The Owner's Things to do didn't fully load in that development run (the same per-person concurrency
failure as below), so its rows are covered by the unit tests only.

## How it was captured

- **One production build** (`NEVORA_OWNED_APP_PRODUCTION=1`, head `629d6b20`): 51 page and role pairs × 390, 768 and 1440
  = 153 captures. Roles: Owner `QAOWNER`; company-wide Manager `OWN-ELENA` with Publish schedules at both locations;
  location Manager `OWN-DANI` (Condado, with Publish schedules); Lead `QA-SCAN-A`; Employee `QA-SCAN-B`. Pages where a
  role is redirected or sent to a notice were captured as what that person sees.
- Per capture: words, button styles, old-kit classes, overflow, card and band left/right edges, text left edges per
  card, every button's height and row, repeated strings, time strings against `7:00 AM – 3:00 PM`, axe at 390 and 1440.
- **Swap shift and Can't work (C14, C15) for the Lead and Employee:** the production run showed two faults that needed
  follow-up fixes (`c8754a71`, `1fda32f0`). Those 12 shots are from a development-build run at head `1fda32f0`, so they
  show the code that ships. Every other shot is from the production build.
- Harness: `zz-scan/nav.ts` and `gate.js` (scratch, not committed), added to the location Manager package from
  `tools/ui-scan/zz-scan-scoped.tar.gz` and run as `postgres` under `flock /tmp/nevora-heavy.lock`.

## Per page

Edges below are card left/right in px. Phone 390: band 0/0, cards 14/14. Tablet 768: cards 108/28 (80px rail, 28px
gutter). Desktop 1440: cards from 296; the right edge is 332 for the 812px column or 64 for full-width layouts. Every
page matched its pattern; overflow was 0 on all 153 captures; no button row had unequal heights; no bad time strings.

| # | Page | Roles | Changed | Words (390, before → after) | Button styles | Result |
|---|---|---|---|---|---|---|
| B2 | More | O, M, Mℓ, L, E | – | O 21 · M 22 · Mℓ 14 · L/E 63 | 1 (2 at 768/1440 for L/E: Profile and settings pill and Sign out) | Pass, except Mℓ's profile line doesn't name Condado (blocking, below) |
| B4 | Things to do | O, M, Mℓ (L, E redirect to B5) | – | O 316 · M 298 · Mℓ 37 | 4 (filter pills, Find cover, Decline/Approve, Review) | Mℓ now gets the real list (the Nov 22 double notice is gone). M 1440 failed to load (below). Count repeats left for Jose |
| B5 | Requests hub | notice for O, M, Mℓ; L, E | `a4d74cfa` (error wording) | managers 20 · L 74 · E 99 | 1–2 | Pass; band and card repeat "Waiting 5" (Jose) |
| B9 | Help | all | – | 82–101 | 0 | Pass |
| B10 | Restricted | M, Mℓ, L, E | – | 15–18 | 1 | Pass |
| B11 | Page not found | all | – | 23–24 | 1 (+ text link) | Pass |
| C5 | Find cover | O, M, Mℓ | – (capture only) | 48–64 | 1 | Captured for the Find cover agent |
| C6 | Build and publish | O, M, Mℓ | `629d6b20` | O 27 → 19 · M 24 → 16 · Mℓ 19 → 12 | 0–1 | Fixed: "Published" ×4 → ×1 |
| C11 | Availability agreement | L, E (O, M, Mℓ redirect to C10) | – | 32 | 1 | Pass; the Lead's copy loads (it failed on Nov 22) |
| C13 | Posted open shifts | all | `629d6b20` | managers 22 · L/E 15 | managers 1 · L/E 0 (empty) | Fixed: Employee/Lead frame and gutter; managers' empty wording |
| C14 | Ask for a swap | L, E (Mℓ → C12 notice) | `629d6b20`, `c8754a71`, `1fda32f0` | L 111 · E 61 | 2 (teal Send, inline Refresh) | Fixed: top rule, Refresh gap; Offer for cover 17 → 8px off Send's edge |
| C15 | Can't work | L, E (Mℓ → C12 notice) | `629d6b20` | 44 | 1 (red Send to manager) | Fixed: top rule |

### Before and after words

- C6, whole week published: before "This week · Nov 23–29 · Published / Calle Loíza · 36 shifts · Published / Condado ·
  22 shifts · Published / Everything planned this week is published." After "This week · Nov 23–29 · Published /
  Calle Loíza · 36 shifts / Condado · 22 shifts".
- C13 managers, empty: "No shift postings at your authorized locations." → "No posted shifts at your locations yet."
- B5 error: "We couldn't load your requests. Try again." [Try again] → "We couldn't load your requests." [Try again]
  (unit-tested; only seen by chance in the run).

## Impeccable audit

```
Impeccable audit: batch-nav pages (Owner, Manager, location Manager, Lead, Employee; 390, 768, 1440; loaded, empty,
notice, error-by-chance)
Checked: production build, 153 full-page captures with edge, button, repeat, time-format and axe probes; C14/C15
re-captured on the development build after their fixes.

Blocking
1. [States] B4 Things to do, company-wide Manager at 1440: "Things to do didn't load" in both runs. The server logs
   server_request_error on /api/manager/action-center (served as 503) while the same person had two other live sessions;
   the Lead's Requests hub failed the same way once at 1440. A manager with a phone and a laptop open could hit this.
   Fix: check the action center's per-person lock under concurrent sessions (server read; outside this package).
2. [Hierarchy] B2 More, location Manager: the profile line reads "Manager · Northside Café & Bakery" and never names
   Condado; the place a person works must be visible. Fix: show the Manager's locations as the Employee More does
   (needs a location-name read the page doesn't make today; not added here).
3. [Hierarchy] C11, C14, C15 for the location Manager land on C10/C12's "Company-wide access needed" card with a
   sentence about access. Owned by the Schedule tools package.

Fixed in this package
- [Accessibility] Screen-reader names on B2, B4, B5 and B9 rows and filters now contain the visible text.

Should fix (Jose's call: earlier reviews chose these)
4. [Density] B4: band "14 things need you" and filter "All 14" state one count; card titles repeat their filter counts
   (Open shifts 2 / Shifts 2). Set in reviews F5 and MG-005.
5. [Density] B5, Employee and Lead: band tile "Waiting 5" and the Waiting card "Waiting 5".

Polish
6. [Spacing] C14 desktop: "Offer this shift for cover instead" ends 8px inside Send's right edge (was 17px).
7. [Spacing] C6: after the closing line went, the card's bottom inset is 29px against 20px at the top.
8. [Spacing] C13 Employee/Lead phone: card gutter 16px (lined up with the band title) against 14px on other employee pages.

Accessibility: label-content-name-mismatch fixed on B2, B4, B5 and B9 (`c48d6436`, `772ff5a1`). Left, because they're in
the kit or other packages: B4's filter pills (kit `BSeg`) are 36px tall and their count pill fails contrast at 1440
(2 nodes); C5 and C10 findings belong to their packages. Swap's Refresh is 18px inline text with a 44px hit area from
its ::after. Keyboard focus was not walked in this package.

States: Empty ✓ (C13, B4 Mℓ short list) · Loading ✓ (harness waited it out; dev run showed skeletons) · Error ✓ (B4 M,
B5 L seen by chance) · Success ✗ (not driven: no form was submitted) · Edge ✓ (notices, redirects, partial swap read)
Not checked: 320 and 200% text (not in this package's capture plan); keyboard walk; Swap/Can't work as a sheet over
Schedule (@sheet); submitting any form.
```

## Blocking items left, and why

| Item | Why not fixed here |
|---|---|
| B4 Manager desktop "didn't load" (action center under concurrent sessions) | Server read; packages keep server behaviour as is |
| B2 location Manager: no location on the profile line | Needs a new read of location names |
| C11/C14/C15 location Manager land on "Company-wide access needed" | C10 and C12 pages (Schedule tools package) |

## Proposed ledger rows (end sweep unless marked)

| Screen | Gap | Kind |
|---|---|---|
| B4 Things to do (M, 1440) | "Things to do didn't load": /api/manager/action-center errors with 3 live sessions of one person (also B5 Lead once) | Server / blocking |
| B2 More (Mℓ) | Profile line doesn't name the Manager's location(s) | Wording / blocking |
| B4 Things to do | Band total and "All N" filter repeat; card titles repeat filter counts | Jose |
| B5 Requests (L, E) | "Waiting N" in band tile and card | Jose |
| B4 Things to do (kit `BSeg`) | Filter pills 36px tall; count pill contrast at 1440 (2 nodes) | Accessibility, kit |
| C14 Swap shift (desktop) | Offer for cover ends 8px inside Send's right edge | Alignment, end sweep |
| C6 Build and publish | Bottom inset 29px against 20px at top when the week is published | Spacing, end sweep |
| C13 Open shifts (L, E phone) | 16px card gutter against 14px elsewhere | Spacing, end sweep |
| C14 Swap shift | "Some teammates' shifts couldn't be checked." for every person in the scan data; check the seed or the partial read | Evidence |
