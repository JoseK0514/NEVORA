# Time off for Owners: policies, balances, cancelling an approval (Claude UI, Nov 20, 2026)

Claude built the Owner's time off screens on `claude-codex-collab-nevora`, on Codex's PTO contract
([PTO, delegated time off and accrual](2026-11-19-pto-leave-accrual-claude.md)), merged into Collab in `8645eb5a`.

Release sequence: Development is the acceptance release. The integrator brings these commits into the Development
candidate and verifies the combined backend and UI there; main needs Jose's approval of the verified release. No server
route, migration, data contract or calculation changed.

- Collab commits on `d1012d0a`: `c9d042b9` (code), `7cb018fc` (guide text and DESIGN.MD), `d74a9578` (guides rebuilt), and
  the commit that adds this note and the [evidence](../product/review-2026-11-20-pto/README.md).

## What is on screen

| Where | What |
| --- | --- |
| Settings › **Time off policies** | Reads `GET /api/workforce/settings` (`data.policies`). Add Vacation, Sick or another policy; edit name, hours in a full day, hours earned per 100 hours worked, carryover cap, on/off. Each save is one `PTO_POLICY` with a fresh UUID and the policy's revision (0 to create); the code is fixed after creation. Lost reply or 503: Check again sends the same command; 409: reload. |
| Team › person › **Time off balance** (Owner only) | Reads `GET /api/workforce/pto/{employeeId}` and the policies. Balances by policy (enabled ones, plus turned-off ones still holding time), the latest 100 entries with their explanation (finalized timecards and period, approved or cancelled time off, who and why; `historyTruncated` said). **Adjust balance**: add or take away time, or an opening balance before anything else is recorded, with a date (today or earlier) and a required reason, reviewed as now / change / after, then one `PTO_POST` (`ADJUSTMENT` or `OPENING`, `sourceReference: null`) at the policy's current revision. A change below zero is stopped before sending. |
| Team time off › **Approved** | **Cancel approval** under each row opens an in-place confirmation; Cancel time off submits `reviewTimeOffAction` with `decision: "CANCELLED"` through `TimeOffDecisionForm` (lost replies handled as for Approve and Decline). The action now returns to `?tab=approved&cancelled=1`, where the list says the paid time went back to the balance. |

All three speak the portal language (English or Spanish) on their own page or card.

## For Codex (integrator)

1. Bring these commits into the Development candidate and rebuild the guides from the joined commit.
2. `reviewTimeOffAction`'s cancellation redirect moved from `?tab=team&cancelled=1` to `?tab=approved&cancelled=1` (and its
   refused cancellation to `?tab=approved&error=review`), because `tab=team` isn't a tab and the success was never shown.
3. Not built yet, on your contract: Manager delegated intake and own requests (`POST /api/workforce/leave`,
   `GET /api/workforce/leave/mine`), the paid-policy picker on the employee request form (`ptoPolicyId`), an employee's
   own balance view, and Puerto Rico accrual (`/api/workforce/pto-accrual`, `PR_SICK_CARRYOVER`).

## Not covered

WebKit, physical phones, a screen reader pass, hosted Development, and a paid request deducting and restoring a balance
in the browser (the fixture's waiting requests are unpaid).
