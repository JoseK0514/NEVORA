# Prodcheck: production-build re-verify (Nov 23, 2026)

Branch `claude-codex-collab-nevora-prodcheck`, from `claude-codex-collab-nevora` at `552ceed3`. Fictional data, a
throwaway loopback Postgres, the owned local app built with `next build` (`NEVORA_OWNED_APP_PRODUCTION=1`, the source
manifest says `production: true`) and served at the owned https test origin through the owned TLS proxy, so the
"connection isn't secure" notice of a plain-http production build doesn't cover the phone captures. Every non-loopback
browser request was aborted. Nothing was sent.

## Commits
- `a5f1c8b9` Prodcheck: Delete my account label and an update's recipient state wrap at 200% text (CSS + 2 tests).
- Shots commit (this file and `shots/prodcheck/`): captures and data only, no code.

## How it was checked
- Scan harness (`tools/ui-scan`, the scoped package) with a scratch extension, not committed: Owner (QAOWNER, rich
  data), Manager Elena (OWN-ELENA), location Manager Daniel (OWN-DANI, Condado), Lead and Employee; Rondo, payroll,
  device alerts and passkeys switched on.
- Per capture: axe-core (all rules plus `label-content-name-mismatch` and `target-size`), page and text overflow past
  the screen, text clipped by an ancestor or ellipsised, text boxes overlapping, controls under 44px (with a hit test of
  the 44px around the centre), text that stays fixed px when the root goes to 200%, and a viewport-height capture
  (`img/<row>-<role>-<390|390t|1440>.webp`, 390t = 390 with 200% text, quality 80).
- Items 1, 2 and 4 at 390, 390 with 200% text and 1440; item 3 at 390 with 200% text and 1440. Home also measured layout
  shift (CLS) from a load with the HTTP cache off at 390 and 1440.
- Runs: `552ceed3` (all rows, 16:18–16:45 UTC); `d07eac13` (D1 with row clicks, I6 after the fix); `a5f1c8b9` (B7
  after the fix). `data/results.json` has every capture's numbers.

## Result
Production matches what the development build showed for items 1, 2 and 4, with one exception, B7 at 200% text. Two
defects showed only at 200% text, and both are fixed here:
1. **I6 Delete my account (Employee, Lead), 390 at 200% text:** "Enter your password to confirm" stayed on one line (the
   card is a `.b-keep`, the kit's nowrap) and ran past the card and the screen (page 424px wide). The end sweep's fix
   `48724ab7` covered only `.em-delete--team` (Owner, Manager). The wrap rule now sits on the shared confirm card in
   `employee-b/account.css`. After: no text past the screen for any role. Before: `img/I6-emp-390t-before.webp`,
   `img/I6-lead-390t-before.webp`.
2. **B7 Update detail (Owner), 390 at 200% text:** a recipient row's state ("This changed while you were looking." and
   Refresh, shown for Daniel, whose role changed after the update was sent) was cut off by the card. In the production
   DOM the row is `div.b-row` > `span.b-row__trail` with `flex: none`, so the trail never shrank. On phones a trail with
   words now takes its own line and wraps (`messages-manager-b.css`, page sheet only; `b-reminders.css` unchanged).
   Before: `img/B7-owner-390t-before.webp`.

Whole `src/components` suite before the push: 3245 passed, 0 failed. `tsc --noEmit` clean.

## Table (row, check, result)
Counts are summed over the widths in each row. The overlap count leaves out the D1 phone sheets: there the bottom sheet
sits over the page behind it, which the text-box check counts, and the captures show nothing overlapping. The clipped
count leaves out the decorative "·" separator (`eb-dots`) on Profile and More. "Under 44px" counts distinct controls;
they are the kit and shell items listed under "Left as they are".

| Row | Check | Result |
|---|---|---|
| B1 (Owner) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: on a phone the overdue payroll card ("Nov 9–15 has no payroll", Prepare Nov 9–15) is the first card under the band, before Things to do. Layout shift from a load with the cache off: 0 at 390 and 1440 (Owner); 0 and 0.0001 (Manager, a skeleton title). |
| B4 (Owner) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Band says the total once ("14 things need you · 11 timecards to approve"); All has no count. |
| B9 (Owner) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | The Contact note runs the card's full width at 1440. |
| F9 (Owner) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | On phones the guidance and Make reset link are inside the one form card. |
| F1 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F2 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F3 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F4 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F5 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F6 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F7 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F8 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G1 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 3 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G2 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G3 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G4 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G5 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G6 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G7 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G8 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 3 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G9 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| H1 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| H2 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| H3 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| H4 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| H5 (Owner) | 390t/1440: axe 1 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | axe color-contrast on the band's range line is the known false positive (white on the teal band, measured against the canvas; sweep-1 line 105). |
| H6 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I1 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I4 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Owner and Manager are sent to Profile (→), as the inventory marks. |
| I5 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Owner and Manager are sent to Profile (→), as the inventory marks. |
| J1 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J2 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J3 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J4 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J5 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J6 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J7 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J8 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J9 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J10 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J11 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J12 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 3 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J13 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J14 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J15 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J16 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J17 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| J18 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Default production state (billing not configured); the configured, mocked state belongs to package P / J18. |
| B1 (Manager (Elena)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: on a phone the overdue payroll card ("Nov 9–15 has no payroll", Prepare Nov 9–15) is the first card under the band, before Things to do. Layout shift from a load with the cache off: 0 at 390 and 1440 (Owner); 0 and 0.0001 (Manager, a skeleton title). |
| B4 (Manager (Elena)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Band says the total once ("14 things need you · 11 timecards to approve"); All has no count. |
| B9 (Manager (Elena)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | The Contact note runs the card's full width at 1440. |
| F9 (Manager (Elena)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | On phones the guidance and Make reset link are inside the one form card. |
| E1 (Manager (Elena)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Closed card: "Time off is decided by an Owner. Jose Natal decides requests at your locations." with Return to Home. |
| F1 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F2 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F3 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F4 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F6 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G8 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G9 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| H1 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| H5 (Manager (Elena)) | 390t/1440: axe 1 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | axe color-contrast on the band's range line is the known false positive (white on the teal band, measured against the canvas; sweep-1 line 105). |
| H6 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I1 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I4 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Owner and Manager are sent to Profile (→), as the inventory marks. |
| I5 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Owner and Manager are sent to Profile (→), as the inventory marks. |
| B2 (location Manager (Daniel)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Profile line reads "Manager · Condado". |
| F1 (location Manager (Daniel)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| F3 (location Manager (Daniel)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G10 (location Manager (Daniel)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| H1 (location Manager (Daniel)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I1 (location Manager (Daniel)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| G10 (Lead) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I1 (Lead) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I2-privacy (Lead) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I2-terms (Lead) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I3 (Lead) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I4 (Lead) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Owner and Manager are sent to Profile (→), as the inventory marks. |
| I5 (Lead) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Owner and Manager are sent to Profile (→), as the inventory marks. |
| G10 (Employee) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I1 (Employee) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I2-privacy (Employee) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I2-terms (Employee) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I3 (Employee) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| I4 (Employee) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Owner and Manager are sent to Profile (→), as the inventory marks. |
| I5 (Employee) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Owner and Manager are sent to Profile (→), as the inventory marks. |
| D1-list (Owner) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 3 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| D1-sheet-ready (Owner) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 3 · capture ✓ | Footer: Request time correction above Approve timecard, same edges, both in view; no dead button. |
| D1-sheet-waiting (Owner) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 3 · capture ✓ | Needs attention sits in the card; the footer is one line, "Approve after the waiting correction is reviewed."; Request time correction is not offered. |
| D1-review (Owner) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 15 · capture ✓ | From 768 the review panel's rows, checkbox and buttons use the card width. |
| I6 (Owner) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Fixed here: at 390 with 200% text the Employee and Lead label "Enter your password to confirm" ran past the card and screen; it now wraps (a5f1c8b9). |
| D1-list (Manager (Elena)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 3 · capture ✓ | Production build: axe clean, no sideways scroll, no clipped or overlapping text. |
| D1-sheet-ready (Manager (Elena)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 3 · capture ✓ | Footer: Request time correction above Approve timecard, same edges, both in view; no dead button. |
| D1-sheet-waiting (Manager (Elena)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 3 · capture ✓ | Needs attention sits in the card; the footer is one line, "Approve after the waiting correction is reviewed."; Request time correction is not offered. |
| D1-review (Manager (Elena)) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 16 · capture ✓ | From 768 the review panel's rows, checkbox and buttons use the card width. |
| I6 (Manager (Elena)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Fixed here: at 390 with 200% text the Employee and Lead label "Enter your password to confirm" ran past the card and screen; it now wraps (a5f1c8b9). |
| I6 (location Manager (Daniel)) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 1 · capture ✓ | Fixed here: at 390 with 200% text the Employee and Lead label "Enter your password to confirm" ran past the card and screen; it now wraps (a5f1c8b9). |
| I6 (Lead) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Fixed here: at 390 with 200% text the Employee and Lead label "Enter your password to confirm" ran past the card and screen; it now wraps (a5f1c8b9). |
| I6 (Employee) | 390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Fixed here: at 390 with 200% text the Employee and Lead label "Enter your password to confirm" ran past the card and screen; it now wraps (a5f1c8b9). |
| B7 (Owner) | 390/390t/1440: axe 0 · sideways 0 · clipped 0 · overlap 0 · under 44px 0 · capture ✓ | Remind sits on each person's row. Fixed here: at 200% text a row's "This changed while you were looking." and Refresh were cut off by the card; they now wrap (a5f1c8b9). |

Not covered here: K3, K13, K15 (Clocker). They were captured on a production build at the https origin by
clocker-states and clocker-k3 today. The billing-configured J18 belongs to package P.

## Left as they are (proposed end-sweep rows)
| Where | What | Why not fixed here |
|---|---|---|
| B7 Update detail, 390 at 200% text | Names break mid-word beside Remind ("Sofía Ménd ez", "Valeri a Díaz"): the pill keeps its width and the name column gets what's left | Layout decision (drop Remind under the name at large text?), not a small fix |
| Timecards week control (D1, 390 and 1440) | Segments are 36px tall; my 44px hit test (±22px around the centre) didn't confirm the 44px hit area that timecards-final measured 3px above and below | Kit segment (`c-seg`); needs a check on the kit's hit area |
| Payroll tabs (G1, G8, J12 at 1440) | `c-pay-tabs__tab` 36px | Kit/shell, as sweep-z item 5 |
| Form-head back links (F2, F8, F9, G6, G9 at 1440) | 32px tall | Kit/shell, as sweep-z item 5 |
| Home "What this measures" (B1, all widths) | 36px tall summary button | Kit `b-explain` |
| Timecards review checkboxes (D1 at 1440) | 32×44 | Width only; a 44px-wide label would fix it (timecards file) |
| J14, J15 number fields at 1440 | Measured 18px tall (`#clocker-grace-minutes`, `#photo-retention-days`) | Likely the input inside a taller field wrapper; check by eye |
| I6 Show password (Owner, Managers at 200% text) | 40px wide | Small; kit field button |
| H5 Insights at 1440 | axe color-contrast on the band's range line (white on teal judged against the canvas) | Known false positive (sweep-1 line 105) |

## Impeccable audit
```
Impeccable audit: production re-verify (Owner, Manager, location Manager, Lead, Employee; 390, 390 at 200%, 1440)
Blocking: none left.
Fixed: [Accessibility/200% text] I6 password label past the screen (Employee, Lead); B7 recipient state cut off (Owner).
Polish: B7 names break mid-word beside Remind at 200%; kit targets at 32–36px listed above.
States: Loading ✓ (Home CLS 0) · Closed ✓ (E1-M) · Conflict ✓ (B7 row) · Blocked ✓ (D1 waiting footer) · Empty/Error not captured
Not checked: 320px, 768px, WebKit, keyboard focus order, forced colours (other packages own them).
```
