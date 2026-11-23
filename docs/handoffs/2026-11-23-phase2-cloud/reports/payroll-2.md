# Payroll 2: batch 1 findings 5–8 (G8, G9, G10)

Branch `claude-codex-collab-nevora-payroll-2`, based on `claude-codex-collab-nevora` at `00e19806`. I didn't touch
`payroll-runs.tsx` or `payroll-tabs.tsx` (items 1–4 belong to another session). There are no server, permission or data
contract changes.

## Commits
| Commit | What |
|---|---|
| `8bba304b` | G10 Pay: in Earlier, the replaced statement shows its own payday (muted) instead of "Earlier version" |
| `e48a6f2a` | G8 Time exports: the waiting line drops the week; the Manager's line drops "Go to Timecards" |
| `be309429` | G9 Paid time export: "Time exports" once; the button names the job |
| `6dc36d08` | G10 My pay: Owners and Managers get the Employee Pay component (`MyPay corporate` → `CorpPayView`/`PayB`) with their own statements; `QuietMyPay` removed |
| `2cb844fa` | G10 My pay: no band back link for Owners and Managers (in the Manager phone shell it drew over the logo) |
| `b3b8c5f4` | G10 Pay: statement rows drop their aria-label, so each row's name is its visible text (axe label-content-name-mismatch) |

The captures and this report are in the final shots commit.

## Per page
**G8 Time exports (Owner, company-wide Manager).** `src/components/payroll-export.tsx`.
- Before: "Timecards for Nov 23–29 can be approved from Mon, Nov 30. Go to Timecards" (the Manager's back link also reads "Timecards").
- After: "Timecards can be approved from Mon, Nov 30." The Owner's line keeps "Go to Timecards"; the Manager's has no link, because the back link goes there.
- Buttons are unchanged: "Create export" is the full-width main button (disabled until something is finalized).

**G9 Paid time export (hold card).** `src/components/payroll-import/copy.ts`.
- Before: back link "Time exports", body "…for this period on Time exports, then come back.", button "Open Time exports".
- After: body "Go through everyone on the team for this period, then come back.", button "Review who's included" (same link, `#who-is-included`).
- The other holds: peopleChanged reads "The export uses exactly the list of who's included." with "Review who's included", and alreadyComplete reads "The server already has a complete record of this period." with "See the files".
- Payroll and tax wording elsewhere is unchanged.

**G10 My pay (Owner, Manager, location Manager).** `src/app/app/my-pay/page.tsx`, `src/components/payroll/my-pay.tsx`, `pay-corp.tsx`, `pay-b.tsx`.
- The page reads the same statements from `/api/payroll/statements` through `MyPay`, now with `corporate` set for Owners and Managers.
- New optional `home` prop: the title reads "My pay" (Employees and Leads keep "Pay"). The paycheck and history back links read "My pay" for these roles.
- Before: "No statements yet. Only you can see them." After: the Employee's empty state, "No published statements yet / Your statements appear here after your employer shares them."
- The band button is "See your hours" (glass), linking to `/app/my-time`, which Owners and Managers have.

**G10 Pay (Employee, Lead).** `src/components/employee-b/pay-b.tsx`.
- Before: "Earlier version / Replaced by the Nov 13 correction".
- After: "Fri, Nov 13" (muted) / "Replaced by the correction". When the correction is on a different payday, the line reads "Replaced by the Nov 20 correction". Pay history uses the same rows.

## Checks
- Typecheck is clean and oxlint is clean on the changed files.
- Unit tests pass: `employee-b`, `employee-mobile/pay*`, `payroll`, `payroll-import`, `payroll-export`, `my-pay` (447 and 390 tests across the two runs, 0 failures). I updated `pay-b.test.tsx`, added a My pay block to `pay-corp.test.tsx` and removed `quiet-my-pay.test.tsx`.
- I ran one production build on fictional data (the scoped harness, with a local plan added in my scratch copy only).
- Accounts: Owner `QAOWNER`, Manager `OWN-ELENA`, location Manager `OWN-DANI` (loc-2), Employee James (actor 1, with a corrected statement).
- Widths: 390, 390 at 200% text, 768 and 1440.
- Results on every screen and width: no horizontal overflow, no clipped, overlapping or off-screen text, and axe reported 0 violations (Employee Pay had a label-content-name-mismatch before `b3b8c5f4`).
- Phone captures are viewport-height, one image per screen (`-v1`, `-v2`).
- Not captured: the Lead (the same component and data shape as the Employee), the Manager's G9 (the same screen as the Owner's) and the other hold kinds (only peopleNotReviewed was reachable).

## Impeccable audit
- **Hierarchy:** each page has one title in the band and one main action. My pay now matches Pay exactly on phones.
- **Spacing and alignment:** card edges line up at 16px on phones. At 1440 the My pay cards follow the narrow column.
- **Accessibility:** axe is clean. Pay rows are named by their visible text. Focus order follows the reading order.
- **States:** I checked the empty state (Owner, location Manager), corrected and replaced statements (Employee), the not-yet waiting line (Time exports) and the peopleNotReviewed hold (Paid time).

## Blocking items left
- At 768 and 1440 the selected Payroll tab repeats the band title. That's item 4, owned by the other session.

## End sweep (proposed ledger rows)
- Kit, G88: band back links ("Timecards", "Time exports", "Pay") and the Payroll tabs are under 44px.
- Shell, Package K: from 768 the Owner and Manager shell hides `.b-screen`, so their My pay shows the Employee's corporate desktop half (This pay period, Recent pay statements) instead of the B desktop layout. This is the same cause as Final fixes F10. Showing B here needs a shell selector change, not a page change.
- Kit: at 200% text the Pay band and card sub-lines (`.ep-next__p`, `.ep-big__s`) and the band labels stay fixed px. Nothing overlaps or clips.
- Time exports, Manager: "No one has finalized time for these dates. Go to Timecards" (shown when the week has ended) still has the link. It doesn't repeat anything on the page, so I left it.
