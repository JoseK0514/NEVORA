# Recapture R: held rows (Nov 23, 2026)

Rechecks the held rows on the shared tip `9596f934`, merged into `claude-codex-collab-nevora-core` as `095e1667`.

## Commits
- `095e1667` Merge of `origin/claude-codex-collab-nevora` at 9596f934 (no conflicts).
- `31e28b58` Things to do: the More card waits for the list, so nothing moves while it loads on phones. It also
  updates two inbox tests that still expected a count on "All" (they failed on 9596f934 already).
- Shots commit (this file and `shots/recap-r/`): captures only, no code.

## How it was checked
Production build (`NEVORA_OWNED_APP_PRODUCTION=1`) on fictional data and a throwaway Postgres. Owner (QAOWNER), Manager
Elena (OWN-ELENA) and location Manager Daniel (OWN-DANI, Condado only) used the scoped scan harness with a scratch
extension. At 390 and 1440 it ran axe-core (with `label-content-name-mismatch` on) and a layout-shift (CLS) measure from
a cold load for Home and Things to do. It also logged a text, edge and button dump at every width and ran the
clipped/overlap audit at 390 with 200% root text. B1 and B4 come from the run on `31e28b58`; the other rows come from
`095e1667`, since `31e28b58` changes only Things to do.

Phone shots: each is one image taken with the viewport set to the page's full height, the same as scrolling down and
stitching. The fixed tab bar sits at the real bottom, so it doesn't cover a row mid-page. Shots are
`img/<row>-<role>-<390|390t|768|1440>.webp` (390t is 390 at 200% text), quality 80.

## Per row
| Row | Fix asked for | Shows? | Notes |
|---|---|---|---|
| B1-O Owner Home | No second Prepare while payroll is overdue; nothing moves while Things to do loads (G73) | Yes | One Prepare ("Prepare Nov 9–15"; 44px at 1440, 52px on phones). CLS 0 at 390 and 1440. Axe 0. |
| B1-M Manager Home | Timecards says its count once; G73 | Yes | "10 to approve", then "Pay period ended" and the payday; "10 of 11" is gone. CLS 0 at 390 and 1440. Axe 0. |
| B2-Ml More (Daniel) | The profile line names their place | Yes | "Manager · Condado". At 200% text the avatar centres on four lines (polish). |
| B4-O, B4-M Things to do | Band says the total once; All has no count | Yes | "14 things need you · 11 timecards to approve"; All has no count. **Fixed here:** on phones the More card was pushed down as the cards arrived (CLS 0.377 at 390); now 0. **Still failing:** the axe contrast item below. |
| B9-O, B9-M Help | Contact note uses the card's width at 1440 | Yes | The note runs the card's full width. The audit's overlap hits are a collapsed answer. |
| F9-O, F9-M Help someone sign in | On phones the guidance and Make reset link are inside the form card | Yes | Both inside the card; Make reset link is solid teal, full width, 52px. From 768 it sits at the form's right edge. |
| E1-M Team time off (Elena) | The closed card says time off once and leads back to Home | Yes | "Time off is decided by an Owner. Jose Natal decides requests at your locations." with Return to Home. |
| J17 Clocker PINs (Owner) | Filter labels at 390 with 200% text don't spill | Yes | "No PIN 12" and "PIN set 0" stay inside their pills. |

Axe found 0 violations on every row at 390 and 1440, except B4 at 1440 (below). No page scrolls sideways at any width.

## Blocking item left (kit)
- **G87, band filter counts at 1440 (Things to do; the same rule covers Payroll's and Timecards' band tabs):** the
  counts are the label's white at 62% on the band's teal, which is #aacecc on #1f7d78 = 2.9:1 (axe color-contrast,
  12.5px text). The cause is the Premium-pass rule in `src/app/app/b-foundation.css:1052` (`opacity: 0.62 !important`;
  the selected tab is 0.56 at 1053). That is a kit file, so I didn't change it. Measured: at 0.95 opacity a count on the
  band reaches 4.6:1, and at 1 it reaches 4.9:1. The canvas segments can keep 62% only if the grey still meets 4.5:1
  there. `owner-b-desktop.css:1047` also sets `opacity: .72` on the same counts, but the kit's `!important` rule
  overrides it.

## Impeccable audit
```
Impeccable audit: Recapture R rows (Owner, Manager, location Manager; 390, 390 at 200%, 768, 1440; live, fictional data)
Checked: production build captures, axe-core at 390 and 1440, CLS from cold load (Home, Things to do), text/edge/button
dumps, overlap audit at 200% text

Blocking
1. [Accessibility] Things to do band filter counts at 1440: 2.9:1 on the teal. Fix in b-foundation.css:1052 (kit): about
   0.95 opacity on band segments.

Fixed in this package
2. [States] Things to do loading on phones: the More card moved 0.38 CLS as the list arrived. It now waits (31e28b58).

Polish
3. [Spacing] More (Daniel) at 200% text: the avatar centres across the profile row's four lines instead of the first line.

States: Loading ✓ (Home, Things to do: CLS 0) · Closed/permission ✓ (E1-M) · Empty, Error, Success not captured
Not checked: 320px; WebKit; error and success states of these pages.
```
