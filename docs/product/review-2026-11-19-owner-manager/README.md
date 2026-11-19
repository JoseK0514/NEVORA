# Owner and Manager controls: browser evidence (Nov 19, 2026)

SCRUM-215 (Manager controls), SCRUM-218 (first-week setup) and SCRUM-214 (pay rates and draft labor cost), built by
Claude on Development's contracts. The hand-back for the integrator is
[`docs/handoffs/2026-11-19-claude-owner-manager-controls.md`](../../handoffs/2026-11-19-claude-owner-manager-controls.md).

## How it was checked

Local Next development server, owned loopback PostgreSQL, the fictional workspace (Northside Café & Bakery: Owner Jose
Natal, Manager Elena Ruiz, two locations, Calle Loíza and Condado, people eligible at both). Playwright Chromium at
1440x900, 390x844 and 320x640. Spanish is the device's language (`nv-lang=es`, no saved choice), the order
`readPortalLanguage` follows. A lost reply is made by letting the request reach the app, then failing it in the browser.
Runs: `omf-flow` (code `88c2efa2`, grants, Manager, planning week, cost), `omz-pay` (pay, `eef9e241`), `omq-setup`
(first-week, `d22e8eaa`); the code each ran is the same as `d22e8eaa` for its screens.

## Results

| Ticket | Check | Result |
| --- | --- | --- |
| 215 | Owner grants Publish at Calle Loíza and Approve time off at both | Each switch moved on its receipt; the database held the three grants at revision 1. |
| 215 | Keyboard | Space on a focused switch saved it. Focus ring visible. |
| 215 | Lost reply on a revocation | "Not confirmed" with Check again; Check again sent the same command and confirmed it (off). |
| 215 | Manager Profile | "Publish schedules: Calle Loíza", "Approve time off: Every location you manage", "Review time exceptions: Not granted", "ask Jose Natal". After the Owner revoked leave approval: "Not granted". |
| 215 | Manager publishes Condado without the grant | Refused; the schedule says "You can't publish here… Ask an Owner, or publish the locations you can." |
| 215 | Manager opens Team time off with no leave grant | "Time off is decided by an Owner. … Jose Natal decides time off at your locations." In Spanish too. |
| 215 | Week starts on Sunday | Saved (revision 1). Schedule shows Sun Nov 15 to Sat Nov 21 as "Schedule week Nov 9 – Nov 15" (Sun 15, Open) and "Nov 16 – Nov 22" (Showing). The Manager reads the setting and the planning week, with what they can publish. Back to Monday, the card leaves. |
| 218 | Owner completes steps | The card read 2, then 3, then 4 of 5 as steps were completed, each time when the Owner came back to the tab (focus), without a reload; at 5 of 5 it left Home. Each step links to its workflow. The server read agreed at every step. |
| 218 | Loading, unavailable, Spanish | A skeleton while reading; a 503 shows "Setup progress is unavailable right now" with Try again; "4 de 5 pasos completados" in Spanish on a phone. One card on Home (checked in the DOM). |
| 214 | Pay rate page | No rate yet; then $17.50/h at Condado, an explicit zero at Calle Loíza ("Saved as zero"), a raise from Dec 3 ("From Dec 3, 2026: $18.75/h"). Four revisions in the database with their reasons. History reads "Condado: $17.50/h, then $18.75/h from Dec 3, 2026 · Calle Loíza: $0.00/h". |
| 214 | Validation and keyboard | Review with nothing filled: both fields marked, focus on "2 things to fix above". Tab order: Set a rate, Remove the rate, locations, Starts on, Hourly rate, Reason, Cancel, Review. A new step moves focus to its title. |
| 214 | Lost reply on a save | "Your change isn't confirmed yet", focus on it; Check again replayed the same save and confirmed it (revision 4). |
| 214 | Someone else saves first | "Pay rates changed" and Load latest rates. |
| 214 | Manager | No Pay rate row; `/pay` goes to Restricted; both endpoints answer 403; no cost card on the schedule. |
| 214 | Base scheduled pay | No rates anywhere: "No pay rates" with Open Team. Partly priced: "Incomplete · $458.40 for 3 of 22 shifts", later "$2,347.15 for 19 of 22 shifts". A 503 shows the failed card with Try again. Spanish shown. |
| All | Overflow | None at 390 and 320 on every new screen. |
| All | axe-core (WCAG 2.2 AA and best practice) | 0 findings in the new parts in 16 runs. Every run reports the app's existing `label-content-name-mismatch` on navigation links ("Things to do, 16", Home's live tiles), which these changes don't touch. |

Code checks on the final tree: TypeScript 0 errors in `src`, oxlint clean in `src`, the full suite, and the six guides
rebuilt and verified (see the hand-back for numbers).

## Not covered

WebKit and physical phones, a screen reader pass, hosted Development, and the 5th first-week step completed in the
browser (a timecard approval needs a recorded week; the fixture's own approval stood in). The pictures' sticky header
and skip link in full-page shots are capture artifacts.

## Pictures

| Pictures | Shows |
| --- | --- |
| `grants-before-1440`, `grants-granted-1440`, `grants-unknown-1440`, `grants-390`, `grants-320`, `grants-es-1440` | The Owner's grants panel: off, granted, not confirmed, phone, Spanish |
| `mgr-profile-1440`, `mgr-profile-390`, `mgr-profile-revoked-1440`, `mgr-profile-es-1440` | What the Manager can approve |
| `mgr-publish-refused-1440`, `mgr-timeoff-closed-1440`, `mgr-timeoff-es-1440` | Refusals that name who decides |
| `week-setting-saved-1440`, `week-setting-manager-1440`, `week-planner-1440`, `week-planner-390`, `week-planner-manager-1440`, `week-planner-es-1440` | Week starts on and the planning week |
| `setup-start-1440`, `setup-start-390`, `setup-roster-1440`, `setup-rules-1440`, `setup-loading-1440`, `setup-unavailable-1440`, `setup-es-1440`, `setup-es-390` | First-week setup as it is completed, and its states |
| `pay-person-row-1440`, `pay-loading-1440`, `pay-empty-1440`, `pay-empty-390`, `pay-edit-problems-1440`, `pay-review-1440`, `pay-review-390`, `pay-review-raise-1440`, `pay-history-1440`, `pay-history-320` | The pay rate page from empty to a history |
| `pay-unknown-1440`, `pay-unknown-checked-1440`, `pay-conflict-1440`, `pay-manager-closed-1440`, `pay-es-1440`, `pay-es-edit-390` | Unconfirmed save, conflict, Manager closed, Spanish |
| `cost-all-incomplete-1440`, `cost-loc-2-complete-1440`, `cost-all-390`, `cost-failed-1440`, `cost-es-1440` | Base scheduled pay |
