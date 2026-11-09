# Phase 7 focused pass: Phase 3 (Employee and Lead)

October 19, 2026. Phase 3 put the employee and lead app on the same kit as Manager and Owner. This is the focused pass the plan calls for after each build phase: inspect only the new and changed employee screens, with the same rules, severities and report format as the Phase 2 pass (`BRIEF.md`, `ROUND-2.md`). Append a section headed `## Phase 3, round 1` to your own report file.

## Preview, accounts and rules

- Preview: `http://127.0.0.1:51346` (unchanged). Password file and rules as in `BRIEF.md`: read only, change no data, never print the password, never submit a form, claim, swap, withdrawal, confirmation or correction.
- Fictional accounts: `AUDIT-E` (employee), `AUDIT-LEAD` (lead), `AUDIT-LONG` (employee with a very long name) and `payroll-qa-a` (employee with pay statements). Signed-in browser states are saved in the scratchpad at `p3/state/<account>.json` if you want to reuse them.
- Widths: 320, 360, 390, 430, landscape 844×390, and 1440. Text sizes 100%, 125% and 150% where your area needs them.

## Screens in scope (employee and lead)

| Screen | Route | What changed |
|---|---|---|
| Home | `/app` | Kit band (greeting · date, "Hi, name.", one-line summary, "N items need your review" link). The green next-shift pass overlaps the band (D-1 A). Clock status, To do, Quick actions and Recent activity are kit cards |
| My schedule | `/app/schedule`, `?view=open`, `?intent=swap` | Band with "N shifts · Xh scheduled." and My shifts / Open shifts pills; week card, agenda, review and Planning ahead are kit cards |
| Requests overview | `/app/requests/hub` | Rebuilt on kit cards and rows |
| Time off | `/app/requests?tab=new`, `?tab=my` | Band with a waiting count and New request / My requests pills; each request has a status tag and a timeline (Sent, then Waiting / Approved / Declined / Withdrawn) |
| Shift requests | `/app/exchange?tab=available`, `?tab=requests` | Band and pills; each assigned shift is a kit card with its actions under "Shift options" |
| Availability | `/app/availability`, `?week=<date>` | Band with a Usual week / Specific week switch (Codex M5); the context card shows only for a specific week, the deadline card only when a deadline exists |
| My time, Timecards, My pay | `/app/my-time`, `/app/timecards`, `/app/my-pay` | Bands under the Pay / Hours section tabs |
| Profile, Updates, Notifications | `/app/profile`, `/app/updates`, `/app/notifications` | Bands; Notifications search is one field; filter pills no longer wrap |
| Shell | every employee page | Header joins the band; kit tab bar; the bell's "—" and the old error page are now kit for every role |

Updates and Notifications are shared with Manager and Owner, so check those roles there too.

## Deliberately not changed (don't refile)

| Item | Why |
|---|---|
| "Decided by whom and when" on the time-off timeline | The table records it, but the employee's read doesn't return it; adding it is a read-model change for Jose to approve |
| A payday date next to hours | Not in the employee's time or pay data today |
| Clock status inside the pass (UX E1) | Kept as its own card this phase |
| Desktop layout beyond "nothing broken" | Phase 4 |
| Spanish | Phase 6 |
| Everything in `ROUND-2.md`'s two tables | Agreed earlier |

## Report

Same format as before: ID, severity, measured evidence, `file:line` cause, crop, fix. End with one line: does your area have zero open defects on the Phase 3 screens?
