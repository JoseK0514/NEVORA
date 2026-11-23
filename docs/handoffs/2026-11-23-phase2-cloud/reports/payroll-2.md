# Payroll 2 report (G1, G8, G10; lead's revised scope)

Branch: `claude-codex-collab-nevora-payroll-2`. It merges `claude-codex-collab-nevora` at `afff76a7`, and the source
matches origin except for the commits below.

The lead's scope went through several changes:
- The lead merged my item 7 (`6dc36d08`, origin `8f05f419`) and my back-link fix (`2cb844fa`, origin `ecb01708`).
- For items 5, 6 and 8 the lead kept the other session's versions, with the approved strings. My earlier commits for those items (`8bba304b`, `e48a6f2a`, `be309429`, `b3b8c5f4`) are not for merging; merge commit `625fbb90` takes origin's versions.
- I then took on item 4, the Pay chip at 200% text, and Payroll's steps at 200% text.

## Commits to merge
| Commit | What |
|---|---|
| `9104de3c` | Item 4, first step: the Owner's Time exports band reads "Payroll" from 768. Its payroll-tabs relabel was replaced by `a58fdbb2`. |
| `a58fdbb2` | Item 4 (G1, G8, J12): the tab labels come from `navigation.ts` payrollTabsFor ("Pay runs", "Time exports", "Settings"). From 768 the band reads "Payroll" on all three pages; phones keep each page's own title. `SettingsPageB` gains an optional `wideTitle` prop, an additive change to `settings-b.tsx`. |
| `e18c2c25` | G10 Pay: the band and card lines are in rem, at the same sizes by default. Covers `pay.css` and the `.ep-next` lines at `employee-b-work.css:199` and `employee-b-desktop.css:197/540`. |
| `2c4e556b` | G10 Pay: "Statement ready" / "Corrected" wraps under "Last pay statement" when they don't fit together. This covers the Employee, the Lead and Owner/Manager My pay. |
| `066b0b5d` | Payroll at 200% text: step titles use a 1.25rem line height (20px by default), the step number's circle uses 1.75rem, and the Prepare button wraps. |
| `aaaccf21` | Payroll at 200% text: the Prepare button shrinks to fit beside the phone’s 48px text offset (checked at 320 with 200% text: no longer clipped). |

## Per page
**G1 Payroll (Owner).** `payroll-tabs.tsx`, `payroll-corp.css`.
- Tab: before, "Payroll" (selected) sat under the band title "Payroll"; after, the tab reads "Pay runs".
- The relabel happens in `payrollTabs()`. The shell's own "Payroll" entry and `navigation.ts` are unchanged.
- Spanish: the Payroll tabs are English-only today, so there is no Spanish string to change.
- At 200% text the step titles wrap with even spacing, and the numbers 1, 2 and 3 sit inside their circles (checked at 320 and 390). The default size is unchanged.

**G8 Time exports (Owner).** `payroll-export.tsx`.
- From 768 the band says "Payroll" and the selected tab "Time exports" names the page, so the name no longer appears twice.
- The Manager's page has no tabs and keeps "Time exports". Phones keep "‹ Payroll" and the title "Time exports".

**G10 My pay (Owner, Elena, Daniel) and Pay (Employee).**
- My pay is the Employee Pay component with each person's own statements. The fictional data has none for the Owner, Elena or Daniel, so they see the Employee's empty state.
- The chip fix is in `employee-b/pay.css`. It's scoped to `.c-pay > .b-screen #b-pay-last`, so it works in every shell.

## Checks
- One production build per pass, fictional data, using the scoped harness with my plan added in a scratch copy only.
- Accounts: Owner `QAOWNER`, Manager `OWN-ELENA`, location Manager `OWN-DANI`, Employee James.
- Widths: 320 with 200% text, 390, 390 with 200% text, 768, 768 with 200% text, 1440, and 1440 with 200% text.
- Results:
  - axe: 0 violations on every screen and width.
  - No horizontal overflow anywhere.
  - Employee Pay at 390 with 200% text: the chip no longer runs off.
  - Payroll's prepare page (`/app/payroll/prepare`): clean at every width.
- Unit tests: payroll, payroll-export, the payroll routes, navigation and employee-b pass (428 and 418 tests across the two runs, 0 failures). `payroll-premium.test.tsx` now expects "Pay runs". Typecheck is clean.
- The shots in `shots/payroll-2/` come from the pass on `7f440bc2`, which is origin plus item 4 and the chip fix. They predate the Payroll 200% step fixes, which were checked in the later passes.

## Blocking items left (kit)
- At 320 with 200% text, the band title overlaps its right button: "Payroll" × "Settings", "Pay" or "My pay" × "See your hours". The kit already has `.b-title { flex-wrap: wrap }` and `.b-title__text { min-width: min-content }` under 767px, but something overrides them. This needs a kit or shell fix, since it affects every band that has a right button.
- Payroll at 390 with 200% text: the "Replaced" chip on a Recent payrolls row is cut off with an ellipsis. At 320 with 200% text, the "Payroll history" link and the "Net" column run past the card. These are in `payroll-runs.tsx` (Recent payrolls), which the other session owned.

## End sweep (proposed ledger rows)
- Kit, G88: Payroll tabs are 36px tall; the band back links are under 44px.
- Shell, Package K: from 768 the Owner/Manager shell hides `.b-screen`, so their My pay shows the corporate desktop half of the same component. Same cause as F10.
- Time exports at 768 with 200% text: the Paid time export detail line is cut off with an ellipsis in its row.
- Payroll settings (J12) still repeats "Payroll settings" in its band and its tab. I left it to the Settings session.

## Final recapture (from `e18c2c25`)
- Screens: G1–G9 and J12 for the Owner; G1 and G8 for Elena; My pay for the Owner, Elena, Daniel and James.
- Widths: 390, 390 with 200% text, 768 and 1440, with viewport-height phone shots. The files are in `shots/payroll-2/img`, listed in `rows.json`.
- Results:
  - axe: 0 violations on all 64 captures.
  - No horizontal overflow, overlap or off-screen text.
  - One clip: the "Replaced" chip on G1 Recent payrolls at 390 with 200% text (`payroll-runs.tsx`).
  - G8-m at 390 with 200% text was captured while the page was still loading.
- This supersedes the shot notes above.

## G1 Recent payrolls at 200% text (`84e266b1`, `404f14c6`)
- The card measures itself in em (a container query). When fewer than 16em fit across, which happens at 390 or 320 with 200% text and never at the default size, each amount moves under its row text and "Payroll history" moves under the title. The amount and "Net" wrap as words, and the rows' grey lines show in full instead of clamping at two lines. The wording is unchanged.
- Recapture from `404f14c6`: G1 (Owner and Elena) and G8-m at 390, 390 with 200% text, 320 with 200% text and 1440. Results: axe found 0 violations, with no clipping, overlap or overflow. The 1440 layout is unchanged, and G8-m was captured after load.
- The other pages' shots come from `84e266b1`, which differs only in this `/app/payroll` CSS. Results: axe found 0 violations, with no clipping or overflow at 390, 390 with 200% text, 320 with 200% text and 1440.
- Full `src/components` suite: 3,216 tests pass; typecheck is clean.

## G1 replaced row says it once (`5d20485a`)
- On the phone, Recent payrolls no longer shows a grey "Replaced" chip next to the line "Replaced by a correction". The line stays word for word, and so does the struck-through amount. This matches what `RunRow` already does on tablets and desktop, where sweep-1's `041840cc` is merged; that commit didn't cover the phone's row.
- Test: `payroll-premium.test.tsx` "batch 1 item 3: on the phone…". It fails without the fix and passes with it.
- Full `src/components` suite passes (3,225 tests). Typecheck and oxlint are clean.
- Recapture of G1 Owner from `5d20485a` at 390, 390 with 200% text and 1440: axe found 0 violations, with no clipping, overlap or overflow. The G1-o shots in `img/` are replaced.
