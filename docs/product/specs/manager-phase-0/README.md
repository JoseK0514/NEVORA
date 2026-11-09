# Phase 0 as the Manager: four defects, before and after

October 18, 2026 · Branch `NEVORA-UI-READINESS` at merge commit `8c4dd50` (owner batches 1–3, not pushed).

## What happened

The four defects from the manager review (D1–D4) were the same four the owner review called O1–O4. The owner-portal session had already fixed them on `claude/owner-batch-1`, then committed batches 2 and 3. At Jose's request those branches were merged here (`refs/heads/claude/owner-batch-3`, which contains 1 and 2). The merge had no conflicts. This folder checks the fixes as the **Manager** (fictional AUDIT-M, Morgan Rivera); the owner session's own evidence is in `../owner-batch-1/`.

## Before and after

| Defect | Before (manager review, code at `7b094d0`) | After (merged code, `8c4dd50`) |
|---|---|---|
| **D1** Inbox offered Approve and Decline, and a swipe, with no dates or note | [before/inbox-390.jpg](before/inbox-390.jpg) | [after/inbox-390.png](after/inbox-390.png): the request row has only "Review time off", which opens the full request with dates, Full day and the note ([after/request-review-390.png](after/request-review-390.png)) |
| **D2** Home said availability "0 of 10" (everyone) while Team said "0 of 5" | [before/home-390.jpg](before/home-390.jpg) | [after/home-390.png](after/home-390.png): "0 of 5", counting employees and leads only |
| **D3** Disabled Approve timecard buttons kept the solid teal fill | [before/timecards-390.jpg](before/timecards-390.jpg) | [after/timecards-390.png](after/timecards-390.png): no teal disabled buttons; each row says "Approve after Oct 18", or "Needs a different manager" on the manager's own card. Open-period cards no longer count as "Need attention" |
| **D4** All-day coverage read "12:00 AM – 12:00 AM" | [before/rules-390.jpg](before/rules-390.jpg) | [after/rules-390.png](after/rules-390.png): "All day"; a window ending at 24:00 reads "4:00 PM – midnight" |

Screenshots at 320 and 1440 are in `after/` too.

## Checks run (all on the merged code)

- **Manager browser checks:** 39 of 39 passed at 320, 390 and 1440 ([after/checks.json](after/checks.json)). They cover:
  - D1: no Approve or Decline button in the Inbox and no swipe hint. A 60-step Tab walk through the Inbox never lands on a decision control. "Review time off" opens the request at `/app/requests?tab=pending&requestId=audit-timeoff`, showing its dates, Full day and the note.
  - D2: Home reads "0 of 5", never "0 of 10".
  - D3: no disabled button keeps the teal fill (sampled `rgb(246, 247, 248)` background, `rgb(95, 99, 104)` text), and the reason ("Approve after Oct 18") is on screen.
  - D4: "All day" appears 7 times and "12:00 AM – 12:00 AM" never appears. A window ending at 24:00 reads "4:00 PM – midnight".
  - axe (WCAG 2.2 AA rules) reports no violations on Home, Inbox and Timecards at all three widths. Home and Inbox don't scroll sideways.
- **Unit tests:** the full suite passes: 7,245 tests in 431 files, 27 files skipped, none failed. Copies of the repo in other `.claude/worktrees` were excluded.

## How it was run

- A local Next dev server and a disposable PostgreSQL cluster with fictional people only, started from a clean copy of commit `8c4dd50`. Push and email are disabled. Nothing touched production.
- The fixture had no coverage window ending at midnight, so one fictional window (Friday 4:00 PM – midnight, Main Office) was added to that disposable database to check D4's midnight case. The all-day windows were already in the fixture.
- On the rules page, coverage now sits in collapsed per-location groups behind the "Recurring coverage" tab (owner batch 3). The check opens that tab and the Main Office group before reading the times.

## Not covered

- Swipe gestures on a real phone (the swipe code is deleted, so there is nothing left to swipe).
- A real iPhone or Android, large text and VoiceOver.
- Partial-day time-off requests: the fixture holds one full-day request.
- Owner batch 4, which is still in progress in its own worktree and isn't part of this merge.
