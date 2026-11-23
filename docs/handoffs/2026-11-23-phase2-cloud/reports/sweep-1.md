# Accessibility sweep 1: Payroll G1–G10, Rondo H1–H6, Profile I2–I5

Branch `claude-codex-collab-nevora-sweep-1`, from `claude-codex-collab-nevora` at `8afc0f11`. Fictional data, a
throwaway loopback Postgres and the owned local app only; every non-loopback browser request was aborted. No
notifications, payments, AI provider calls (Rondo ran with its switches on and no provider), deploys or publishing.

## Commits (code)
| Commit | What |
|---|---|
| `bf7efcb5` | Names that contain their visible text (Payroll, Time exports, My pay); px text sizes to rem in the Payroll, Time exports, Insights and Rondo stylesheets; Insights fixed heights to min-heights; 44px policy contents links |
| `f11581cb` | Payroll Up next row label rebuilt from its visible text (superseded by `6f474c03`) |
| `6f474c03` | Up next row has no aria-label; when it doesn't show its step, the step is visually hidden text inside the row |
| `fa3a1877` | Payroll pill rows wrap at large text (a text overlap that rem sizing exposed at 200%); contents links keep 9px padding |
| `8b409ec2` | Policy links keep their 32px drawn box with a 44px hit area from a pseudo-element (the first attempt cut the bottom of the page at 768) |

Shots and this report are one separate commit. Captures: `shots/sweep-1/img/<row>-<role>-<width>.webp` (AFTER at 320, 390,
`390-t200` = 390 with 200% text, 768 and 1440; BEFORE at 390 and 1440 with `-before`). Raw per-screen data:
`shots/sweep-1/data/before-after.json`; the probe used: `shots/sweep-1/data/sweep.ts.txt`; the hit test:
`shots/sweep-1/data/i2-hit-test.json`.

## How it was checked
- **Production builds** (`NEVORA_OWNED_APP_PRODUCTION=1`, the scoped scan harness with a sweep module added): BEFORE at
  `8afc0f11`; AFTER at `fa3a1877` (all pages, all roles); the policy pages again at `8b409ec2` (Lead and Employee, every
  width) after the fix in that commit. Development-server runs were used only to iterate: Payroll axe at 390, 768 and
  1440 at `6f474c03`, and overlap checks at 320 and 200%.
- **Roles**: Owner `QAOWNER`, Manager `OWN-ELENA`, Manager limited to one location `OWN-DANI` (loc-2), Lead and
  Employee (fictional actors). Each page was opened for every role the inventory marks ✓. Owner and Manager (both kinds)
  on I4 and I5 are redirected to the I1 Profile page (`/app/profile#profile-device-alerts`, `#profile-passkeys`), so those
  pages aren't counted here; their findings are listed for I1 below.
- **Widths**: 320, 390, 390 with the root at 200%, 768, 1440.
- **Per screen**: axe-core 4.14.1 (all rules plus `label-content-name-mismatch` and `target-size`); controls inside the
  page under 44×44 (a wrapping label counts; inline text links noted, not counted); controls and labelled rows whose
  name doesn't contain their visible text; text that keeps its size when the root goes to 200% (fixed px); horizontal
  overflow; a Tab walk at 390 and 1440 (45 stops from the top) comparing each focused element's outline, box shadow,
  border and background with and without focus; in the final runs, overlapping and clipped text.

## Results (BEFORE at 8afc0f11 → AFTER), summed over the five widths
| Row | Route | Role | axe | band contrast (false positive) | names ≠ text | targets < 44 | fixed-px text at 200% | overflow | focus stops without ring |
|---|---|---|---|---|---|---|---|---|---|
| G1 | `/app/payroll` | Owner | 8 → 0 | 4 → 4 | 3 → 0 | 9 → 9 | 7 → 6 | 0 → 0 | 0 → 0 |
| G2 | `/app/payroll/prepare` | Owner | 10 → 0 | 0 → 0 | 10 → 0 | 2 → 2 | 14 → 2 | 0 → 0 | 0 → 0 |
| G3 | `/app/payroll/review` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 13 → 5 | 0 → 0 | 0 → 0 |
| G4 | `/app/payroll/people` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 132 → 12 | 0 → 0 | 0 → 0 |
| G5 | `/app/payroll/fix` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 2 → 2 | 0 → 0 | 0 → 0 |
| G6 | `/app/payroll/import` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | 0 → 0 |
| G7 | `/app/payroll/history` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 17 → 15 | 0 → 0 | 0 → 0 |
| G8 | `/app/payroll-export` | Manager | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 7 → 4 | 0 → 0 | 0 → 0 |
| G8 | `/app/payroll-export` | Owner | 0 → 0 | 4 → 4 | 0 → 0 | 6 → 6 | 7 → 4 | 0 → 0 | 0 → 0 |
| G9 | `/app/payroll-export/paid-time` | Manager | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | 0 → 0 |
| G9 | `/app/payroll-export/paid-time` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | 0 → 0 |
| G10 | `/app/my-pay` | Employee | 10 → 0 | 0 → 0 | 10 → 0 | 0 → 0 | 6 → 6 | 0 → 0 | 0 → 0 |
| G10 | `/app/my-pay` | Lead | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 4 → 4 | 0 → 0 | 0 → 0 |
| G10 | `/app/my-pay` | Manager (one location) | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 3 → 3 | 0 → 0 | 0 → 0 |
| H1 | `/app/ai-manager` | Manager | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 15 → 15 | 0 → 0 | 0 → 0 |
| H1 | `/app/ai-manager` | Manager (one location) | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 15 → 15 | 0 → 0 | 0 → 0 |
| H1 | `/app/ai-manager` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 30 → 30 | 0 → 0 | 0 → 0 |
| H2 | `/app/ai-manager/weekly` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 6 → 6 | 0 → 0 | 0 → 0 |
| H3 | `/app/ai-manager/business` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 5 → 4 | 3 → 3 | 0 → 0 | 0 → 0 |
| H4 | `/app/ai-manager/knowledge` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 5 → 5 | 4 → 4 | 0 → 0 | 0 → 0 |
| H5 | `/app/reports` | Manager | 0 → 0 | 2 → 2 | 0 → 0 | 12 → 12 | 11 → 9 | 0 → 0 | 0 → 0 |
| H5 | `/app/reports` | Owner | 0 → 0 | 2 → 2 | 0 → 0 | 12 → 12 | 11 → 9 | 0 → 0 | 0 → 0 |
| H6 | `/app/reports/christmas-bonus` | Manager | 0 → 0 | 0 → 0 | 0 → 0 | 4 → 4 | 0 → 0 | 0 → 0 | 0 → 0 |
| H6 | `/app/reports/christmas-bonus` | Owner | 0 → 0 | 0 → 0 | 0 → 0 | 4 → 4 | 0 → 0 | 0 → 0 | 0 → 0 |
| I2 | `/app/profile/privacy` | Employee | 0 → 0 | 0 → 0 | 0 → 0 | 16 → 5¹ | 1 → 1 | 0 → 0 | 0 → 0 |
| I2 | `/app/profile/privacy` | Lead | 0 → 0 | 0 → 0 | 0 → 0 | 16 → 5¹ | 1 → 1 | 0 → 0 | 0 → 0 |
| I2 | `/app/profile/terms` | Employee | 0 → 0 | 0 → 0 | 0 → 0 | 15 → 5¹ | 1 → 1 | 0 → 0 | 0 → 0 |
| I2 | `/app/profile/terms` | Lead | 0 → 0 | 0 → 0 | 0 → 0 | 15 → 5¹ | 1 → 1 | 0 → 0 | 0 → 0 |
| I3 | `/app/profile/calendar` | Employee | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 |
| I3 | `/app/profile/calendar` | Lead | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 0 → 0 | 0 → 0 |
| I4 | `/app/profile/device-alerts` | Employee | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 3 → 3 | 0 → 0 | 0 → 0 |
| I4 | `/app/profile/device-alerts` | Lead | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 3 → 3 | 0 → 0 | 0 → 0 |
| I5 | `/app/profile/passkeys` | Employee | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | 0 → 0 |
| I5 | `/app/profile/passkeys` | Lead | 0 → 0 | 0 → 0 | 0 → 0 | 2 → 2 | 1 → 1 | 0 → 0 | 0 → 0 |
| **All** | | | **28 → 0** | **12 → 12** | **23 → 0** | **153 → 110** | **326 → 173** | **0 → 0** | **0 → 0** |

¹ Three of the five are the policy links (Terms of Use, Support, Account deletion) at 1440: they keep their 32px drawn box,
and a hit test confirms the 44px area (points 5px above and below land on the link, 7px don't). The other two are the
band back link `‹ Profile` (kit).

"Band contrast" is axe reporting white band text (Payroll tabs, the Insights range line) against the page canvas: the
shell paints the teal band outside the element's ancestors, so axe can't see it. On screen it's white on teal (checked
in the captures). Not counted in the axe column.

## Per page: what changed
No visible wording changed. Approved payroll and tax wording is untouched. Button styles and heights are unchanged
except where a target grew (below). Left and right edges are unchanged: page heights match BEFORE at 320, 390, 768 and
1440 on every page, except Payroll People at 390, where the final run picked a different fictional run and captured it
while still loading (harness timing, not a code change).

- **G1 Payroll (Owner)**: screen-reader names. The Timecards step link had the name "Timecards, Can be approved from …";
  it's now its own text. The quiet Prepare link was named "Prepare payroll, Nov 23–29" while showing "Prepare Nov 23–29";
  it's now its own text. The desktop Up next row was "Weekly payroll, Nov 23–29, scheduled payday Fri, Dec 4, <people count>.
  Prepare payroll" (a count that isn't on screen). It now reads its own text, plus ". Prepare payroll" as hidden text when
  the row doesn't show its step. Text sizes in rem.
- **G2 Prepare payroll (Owner)**: Prepare buttons were named "Prepare payroll for Nov 9–15" while showing "Prepare Nov
  9–15"; now "Prepare Nov 9–15 payroll". Text sizes in rem (14 → 2 fixed). At 200% text the pill rows ("Prepare",
  "Choose dates") wrap, so the pill sits under its text instead of over it; nothing moves at normal size.
- **G3–G7 (Owner)**: text sizes in rem (People 132 → 12 fixed; the rest are kit).
- **G6 Import / G9 Paid time export**: batch buttons named "Check batch 3" / "Download the CSV for batch 3" while showing
  "Check this batch" / "Download CSV" are now "Check this batch, batch 3" and "Download CSV, batch 3" (Spanish to match).
  This state isn't in the fixture; unit-tested only.
- **G8 Time exports (Owner, Manager)**: "Select visible finalized timecards" (showing "Select all finalized") is now "Select
  all finalized timecards". The mapping form's button uses min-height, so its text can grow. rem text.
- **G10 My pay (Employee)**: the statement rows were named "Friday, November 13, 2026, replaced statement for Nov 2–8"
  while showing "Earlier version · Replaced by the Nov 13 correction". They're now named by their text (brief rule 7). Lead
  and Manager (one location) had nothing to fix.
- **H1–H4 Rondo**: no axe or name findings. rem for the date input and the knowledge add row (16px stays 16px at 100%).
  The rest is kit (below).
- **H5 Insights (Owner, Manager)**: rem text; the "open the section" link and the counted summary use min-height; menu
  items 40 → 44px (in the popover, not opened in the capture). The band tool buttons are drawn 44px by the shell at 768
  and up, so the page rule (40 → 44) changes nothing there.
- **H6 Christmas bonus**: nothing in its own files; the year button is kit or shell (below).
- **I2 Policy document (Lead, Employee)**: desktop contents links 40 → 44px (61px for a two-line entry), 4px taller each;
  the policy links row keeps its look with a 44px hit area from 768 up.
- **I3 Calendar, I4 Device alerts, I5 Passkeys (Lead, Employee)**: no findings in their own files.

## Checks run
- `npx tsc --noEmit -p .` clean; `oxlint` clean on the changed TSX/TS files.
- Unit tests beside the changes: `node scripts/run-rstest.mjs src/components/payroll src/components/employee-b/pay-b
  src/components/payroll-export src/components/payroll-import src/components/reports src/components/owner-advisor
  src/components/christmas-bonus`: 51 files, 647 tests pass at `bf7efcb5`; `src/components/payroll`: 334 pass at
  `6f474c03`. Updated tests that asserted the old names (`payroll-premium`, `pay-b`, `payroll-export.selection`).
- Keyboard: every Tab stop inside these pages shows a ring (2px teal, or white on the band) at 390 and 1440, BEFORE and
  AFTER. Reduced motion was on for every capture.

## Impeccable audit (accessibility sweep; hierarchy, spacing and states unchanged by design)
**Hierarchy.** Unchanged. One teal action per card holds on G1 and G2. At 200% text the Prepare pill now sits under its
period instead of across it.
**Spacing and alignment.** Edges and heights match BEFORE at normal size (above). Visible changes are limited to targets:
desktop contents links +4px, and pill rows wrapping at 200%.
**Accessibility.** axe 28 → 0 on these pages. Every name contains its visible text. Text in the pages' own styles now
follows the reader's size: what stays fixed at 200% is kit or shell. Remaining small targets are kit or shell (list
below). Focus rings: none missing in the pages.
**States.** Captured as the fixture renders them: Insights shows its error state ("Couldn't load insights": the
`/api/reports` read returns 503 in this fixture); Rondo shows its idle states (no provider); Lead My pay is empty ("No
published statements yet"); G5 Fix shows "Nothing stops this payroll". Loaded Insights, Rondo answers, and the import and
export batch states weren't captured.

## Blocking items left
None in these pages' own files.

## End-sweep items for the kit, the shell or other packages (proposed ledger rows)
| # | Where | Finding | Pages | Owner |
|---|---|---|---|---|
| S1-1 | Kit `c-nav__back`, `c-formhead__up`, `b-back` | Back links in the band are 32px tall at 768 and 1440 (G5 gave the Schedule band link a 44px hit area; these don't have it) | G2–G9, H1–H6, I2, I4, I5 | Kit |
| S1-2 | Kit `CorpNav` right slot | "Add" link 40px tall on phones | H3, H4 | Kit |
| S1-3 | Kit `b-btn--glass` | Band "Settings" button 40px tall on phones | G1 | Kit |
| S1-4 | Shell `owner-b-desktop.css` (`--b-seg-item-h`) | Band pill tabs 36px tall at 768 and 1440 | G1, G8 (Payroll tabs) | Shell |
| S1-5 | Kit `c-seg` | Insights period segments 36px tall on phones, and their text spills the fixed height at 200% | H5 | Kit |
| S1-6 | Kit `c-select-btn` / `b-thirty-day.css` | Christmas bonus year button 40px on phones | H6 | Kit/shell |
| S1-7 | Kit and shell type | Fixed px text that doesn't scale at 200%: `c-nav__title`, `c-section__label`, `c-field__label`/`__help`, `c-btn`, `c-num`, `c-row__value`, `c-stat__*`, `c-empty*`, `c-meta`, `c-pill`, `c-av`, `c-phone-sub`, `c-formhead__link`, Corp paragraphs (`c-payroll__state` on Time exports), `b-hbig`, `b-chip`, `b-segs__i`, `b-card__a`, `b-statecard__t`; `c-ins__range` in the band (`owner-b-pages.css`) | All | Kit/shell |
| S1-8 | Shell sidebar | `nav-link` items have no visible focus ring at 768 and 1440 | All | Shell |
| S1-9 | Shell | "This connection isn't secure" notice overlaps Insights content on phones (the owned http origin) | H5 | Shell/harness |
| S1-10 | Kit `b-row__s` | Phone tools row subtitle "Decide every recorded break, then send the hours…" is cut at 320 (two-line clamp) | G1 | Kit |
| S1-11 | I1 Profile (Owner, Manager) | "Phone, edit" and "Email, not added. Add an email" names don't contain the visible text; `q-nav__r` Edit 40px | I1 (where I4 and I5 redirect) | Requests and account |
| S1-12 | Harness | `/api/reports` returns 503 in the scan fixture, so loaded Insights can't be audited; Payroll subpages take the first run, which can change between runs | H5, G3–G5 | Harness |
| S1-13 | axe | Band text reported as 1.08:1 because the band isn't in the element's ancestry; consider marking the band for axe | G1, G8, H5 | Kit |

## Gaps
- Rondo ran with no provider, so only idle and empty states were audited. The import and export batch states, the Insights
  menus (popover) and the loaded Insights report weren't on screen.
- The Tab walk covers the first 45 stops from the top. On desktop the shell takes about 17 of those, so controls low on
  long pages (G4 People) were not reached. Ring checks compare focused and unfocused styles; they don't judge contrast.
- 200% text means the root font size set to 200%, not browser zoom.
- Owner and Manager on I4 and I5 land on I1 (redirect), so I4 and I5 were checked for Lead and Employee only.
