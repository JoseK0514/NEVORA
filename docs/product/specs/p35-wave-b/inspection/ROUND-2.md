# Wave B inspection, round 2: re-check

October 19, 2026. Every round-1 finding was worked through. The fixes are on the same preview (frozen while you look) at branch commit `2e7495c`. The brief, accounts, preview location and rules in `BRIEF.md` still apply, with the "Cuts" in PARALLEL.md (read that section first):

- **No shell.** Skip the phone header, tab bar, More sheet, section tabs and the desktop sidebar, account menu and header. They belong to the coordinator and the desktop chat.
- **No Firefox.** Chromium, with WebKit spot checks.
- **No sweep by hand.** `checks.mjs` runs the width, text-size and browser sweep for overflow, the 15px floor, targets, layout shift, errors and axe. Its results land in `.../scratchpad/wb/r2/*.txt` and `.../scratchpad/preview/checks/*.json`. Don't repeat it.
- **Re-check, don't re-sweep.** Check at 320, 390, landscape 844×390 and 1440, plus 768 and 1024 for desktop layouts.

## What each inspector does

1. Re-check every one of your round-1 findings by ID on the current build. Mark each one **Fixed** (with the new measurement), **Not fixed**, **Partly fixed** or **Regressed**, with `file:line`.
2. Inspect what the round's fixes touched, in your area, for new defects:
   - Insights: tables switch by card width (container queries); Period summary rows; At a glance in a subgrid with per-cell hairlines; the quiet refresh before a snapshot expires (the page should no longer empty every ~15s); the paused state; period and export errors beside their controls; "As of" time.
   - Update detail: the band carries the state, the card only the action; Withdraw asks first ("Withdraw this update for N people?"), then "Withdrawing…"; notices below the review card; focus to the result after Acknowledge.
   - Compose: field-level errors under Title, Message and Available until; the preview heading takes focus; "Sign in again" when signed out.
   - Templates: Save, Archive (asks first) and the week stepper (dims while the next week loads) through a client form that keeps the page on failure.
   - Scheduling rules: the save bar shows "Saving…", errors and "Scheduling rules saved." inside it; Add coverage period and Save quantities have their own status; Remove asks first; section links target the headings (`#rules-staffing`, `#rules-hours`, `#rules-coverage`, `#rules-policy`); the trade policy's order check; plain policy wording; inset row dividers; rows stack until 1180.
   - Payroll settings: cards, dates with their year, save progress and failures floating above the tab bar, "Saving…" labels; fields at the shared 48px (WR-55) with the darker field border.
   - Payroll runs (Owner and Manager): the stepper shows dots and the current step when five labels can't fit.
   - Loading placeholders: band heights per phone width, landscape and text size.
3. Append `## Round 2` to your own report: the status table by ID, new findings in the same format and severities, and one line saying whether your area now has zero open P0, P1 and P2.

## Decided, don't refile

| Item | Decision |
|---|---|
| Fields 48px (WR-55, shared) | PARALLEL.md's form pattern since Oct 19; Wave B no longer sets field height or text size |
| Tab bar highlights More on Templates and Scheduling rules | Coordinator: both live in the More sheet under Scheduling tools |
| Desktop sidebar highlights Settings for Owner Scheduling rules and Payroll settings | Desktop chat's call (D3), intended |
| Insights snapshot still retires if its refresh fails, and during print | Privacy contract (lifetime tests R01–R16); the quiet refresh covers the normal case |
| Report definitions wording (`lib/reports/project.ts`) and every payroll string | Need Jose's approval; listed in the Wave B report, not changed |
| Update detail and Compose bands in landscape show the full summary | Shared WR-41 decision (coordinator, a62cc79) |
| Root loading for `/app/updates/<id>`, the Inter font swap, payroll 401 wording | Fixed by the coordinator on `claude/premium-phase-1` (85dd657, 62cd033, aae87e4, 319d04a); they arrive with the merge, not on this preview |
| Templates Apply and Archive on real rows | No saved template in the fictional data; saving one would write. Measure on an inserted row as before |
