# Phase 3, round 4: re-check by ID, fast

October 19, 2026. Same five areas, same bar, same report format. Append `## Phase 3, round 4` to your own report file in this folder. Codex is running this same round in the cloud. Whichever finishes first counts, so be quick and complete. Release is tomorrow.

## Preview

- **New preview:** restarted at about 3:15 PM with the latest code (`claude/premium-phase-1` at 8c4264c) and the faster database pool. Expect far fewer 503s and timeouts. Retry a failed load once before calling it a gap.
- **URL:** `http://127.0.0.1:60059`.
- **Password:** `PREVIEW_OUT/evidence-*/access.json` (the newest `evidence-*`), where `PREVIEW_OUT` is `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/main`. Read it from the file. Never print it, write it down, or put it in a URL.
- **Signed-in states:** `PREVIEW_OUT/state/<account>.json`.
- **Accounts:**
  - Employee: `AUDIT-E` (Alexandra), `AUDIT-LONG` (long name), `AUDIT-ON` (clocked in), `AUDIT-BREAK` (on break), `payroll-qa-a`
  - Lead: `AUDIT-LEAD`, `payroll-qa-b` (two published pay statements)
  - Manager: `AUDIT-M`. Owner: `QAOWNER`.
  - Swap pair: AUDIT-E can swap `audit-next-0-1` with AUDIT-SWAP's weekend shifts. AUDIT-E's Availability page is no longer empty; use AUDIT-LONG for the empty state.
- **Playwright:** `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`.
- **Source:** `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/premium-phase-1`.

## Scope

**Pages:** every Employee and Lead page at 320, 360, 390, 430 and 844×390, at 100, 150 and 200% text. Use Chromium, with WebKit spot checks.
- Home and schedule: `/app`, `/app/schedule`, `/app/schedule?view=open`
- Requests: `/app/requests/hub`, `/app/requests?tab=new`, `/app/requests?tab=my`, `/app/exchange?tab=available`, `/app/exchange?tab=requests`
- Availability and time: `/app/availability`, `/app/my-time`, `/app/timecards`, `/app/my-pay`
- Account and messages: `/app/profile`, `/app/updates`, `/app/notifications`

**Also yours:**
- The shared phone shell (header, tab bar, More sheet, section tabs) for all four roles.
- Loading placeholders on every route, including Manager and Owner Home, Inbox, Schedule, Team, Timecards, Time exports, Payroll, and the single time-off review (`/app/requests?tab=pending&requestId=audit-timeoff`).

**Not yours:**
- 768–1440 on these pages (that's the Desktop chat).
- Firefox.
- Payroll wording. List it for Jose instead.

## Re-check these IDs, plus anything the fixes touched

| Area | IDs |
|---|---|
| Type, colour and copy | TC-P3-09, TC-P3-18 to TC-P3-31 |
| Alignment and geometry | AL-P3-03, AL-P3-12, AL-P3-13, AL-P3-17 to AL-P3-28 |
| Bars and stability | P3-ST-02, P3-ST-04, P3-ST-14 to P3-ST-23 |
| Widths and roles | P3-WR-01 to P3-WR-15 |
| Interaction and states | **full sweep.** Round 3 was stopped early; its partial notes are at the end of `interaction-states.md`. |

## What changed (check that it works and broke nothing)

**Words and line breaks:**
- `keepWhole` now also keeps " · ", weekdays ("Mon, Oct 19"), durations ("3h 40m") and Safari's "Oct 19 at 9:11 AM" together. A range breaks only after its dash.
- Short place names never break inside, and Home breaks inside a word only when it can't fit a line.
- Words:
  - waiting, declined, withdrawn
  - Unable to work
  - "No designated lead"
  - Back to Home
  - "Couldn’t load …" with a Try again button
  - "Your session ended" with Sign in
  - Withdraw copy: "Yes, withdraw this request", "Withdraw request", "Withdrawing…"
  - Exchange errors now speak to "you"
  - "No clock-out yet"
  - Home's band says "Scheduled until …"

**Heights and placeholders:**
- `HoldHeight` holds in the same render, so a failed read, a pause or going offline keeps the page height and your scroll position (Home, My time).
- Profile's loading status is for screen readers only.
- Placeholder bands grow with text size (the root layout sets `--nv-text-scale`) and have their own landscape heights.
- A single request's review has no section tabs from the first frame.

**Failures and focus:**
- A failed Time off send or Availability save keeps the page and your entries, and says it wasn't sent.
- Session failures point to signing in again.
- A sending button keeps focus.
- Focus rings are no longer clipped in Planning ahead, the Requests overview, Profile settings or Sign out.

**Layout:**
- 15px messages and toasts on phones and landscape.
- Employee headings use the kit roles (19/25/600 and 17/22/600), and text actions use 15/20/500.
- One quiet Refresh shape.
- Card insets of 20 (Availability week card, Shift requests cards, My time below 375).
- Time off form gaps and status tags at the top right.
- Profile cards are one width.
- Heads align on the baseline.

**Shared kit:**
- Kit pages start at the left edge on desktop.
- An "Inter Fallback" font with Inter's metrics.
- Avatars and tiles sized in rem.
- The More sheet's Close is sticky.
- Pill rows fade only when they truly overflow.
- Field edges are 3:1 on text boxes and search fields.
- A double tap sends once.

## Report

- Short and complete: a verdict with counts, the status of every listed ID, new findings with a measurement, crop, `file:line`, fix and severity, a short checked-and-correct list, and gaps.
- Read only. Answer every non-GET request in your own browser. One browser process at a time.
- Write your scripts and crops under `.../scratchpad/phase7/<your-area>/p3r4/`.
