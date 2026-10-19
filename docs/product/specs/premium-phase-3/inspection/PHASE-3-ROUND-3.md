# Phase 3, round 3: full checklist, and the Phase 2 pages re-checked

October 19, 2026. Same five areas and the same report format as before. Append `## Phase 3, round 3` to your own report file. This round runs under Jose's new bar (`PLAN.md`, "Revised plan, October 19"): every page, every role, every state, every device. When it reaches zero, Phase 3 closes and every page built so far (Phase 2 and Phase 3) is at zero under the new checklist.

## What changed since round 2

- **New preview.** Jose's restart stopped the old one, and it also wiped the scratchpad, including your old scripts and crops. Write new ones.
  - Preview: `http://127.0.0.1:51302`
  - Password: `PREVIEW_OUT/evidence-*/access.json`, where `PREVIEW_OUT` is `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/main`. Read it from the file and never print it.
  - Signed-in browser states for every account: `PREVIEW_OUT/state/<account>.json`.
- **New fictional accounts and data:**
  - `AUDIT-ON`: clocked in.
  - `AUDIT-BREAK`: on break.
  - `AUDIT-LEAD`: now has published shifts this week and next, and an approved time-off request.
  - `AUDIT-E`: has approved, partial-day approved, declined and withdrawn time-off requests.
  - `payroll-qa-b`: a lead with pay statements.
  - The usual accounts are unchanged: `QAOWNER`, `AUDIT-M`, `AUDIT-E`, `AUDIT-LONG`, `payroll-qa-a`.
- **Automated checks:** `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/scripts/checks.mjs` (usage at the top of the file). The coordinator runs it before this round. You may run it too, one process at a time. Several at once stall the dev server.
- **Fixes made since round 2** (re-check each one, by your IDs):
  - **Week strip on My schedule:** one row at every width. Below 390 it has 10px insets and a fade at the edge it continues past (IS-66, WR-01, AL-P3-15).
  - **Notifications:**
    - kit rows (40px tile, 12px gap, title 17, meta 15) in every role
    - "Action required" and "Action available" as kit pills
    - Refresh as a quiet 44px control
    - the head kept to one line on phones
    - pills that fade and keep the focus ring in view
    - (IS-65, WR-02, TC-P3-14, AL-P3-02, AL-P3-13)
  - **Tab bar:** sized to its labels at 400px and below, with at least 11px between labels at 150% text (WR-03).
  - **Availability day rows:** the switch moves under the name with large text (WR-04).
  - **Kit buttons:** every employee and lead button below the band is a kit button (52px, radius 12). The Availability count is a kit pill (WR-05).
  - **Home:**
    - the shift time on the pass is back to 32px (TC-P3-15)
    - the pass and clock cards hold their own heights while paused or offline
    - the cards below the pass stay hidden during a cold load
    - the placeholder lines match the real ones
    - the To-do title no longer repeats "review required"
    - offline wording doesn't repeat the band
    - (ST-01, ST-02, AL-P3-10, AL-P3-14, TC-P3-10, TC-P3-16)
  - **Clock card:** keeps its height while loading, when ready and when its read fails (ST-12).
  - **My time:** the footer has the same lines while loading as when ready; on phones it stacks (ST-06).
  - **Timecards:** the band has its final height from the first frame (ST-13).
  - **Insets:** Profile settings rows at 20 (icon 36, text 68); the My pay privacy note at 16; Updates rows use a 40px tile (AL-P3-02, AL-P3-13).
  - **Gaps:**
    - 16 between band and first card on My time and Timecards
    - Timecards sections at 16
    - Notifications' lead line in the 16 rhythm
    - My schedule's blocks in the 16 rhythm
    - (AL-P3-03, AL-P3-04)
  - **Baselines:** heading pills ("Off clock", "0 entries", "Draft") sit on the title's baseline (AL-P3-06, AL-P3-11, AL-P3-12).
  - **Landscape and desktop cards:** Home's cards in landscape and on desktop have no border under the shadow (AL-P3-16).
  - **Copy:**
    - durations read "0h", "37m", "8h" or "8h 30m" everywhere (TC-P3-12)
    - times and dates never split ("Updated" stamps, timecard periods, shift lines, "What changed")
    - "Request a swap" in both places
    - "Puerto Rico time" everywhere
    - (TC-P3-09, TC-P3-10)
  - **Band summaries** fit one line at 320 ("Plan your time away.", "1 request waiting for approval.", "Shifts your team offers.").
  - **Time off:** the empty state is on kit roles (TC-P3-17); the withdraw confirmation's label is a 44px target.
  - **Landscape phone (844×390):** keeps the phone's type (the 15px floor). The kit's desktop sizes now start at 768px only on non-phones.
  - **Not changed, for privacy:** Home's name ("Hi, Alexandra.") clears while Home is paused or offline, like the rest of its private data. That's deliberate, so don't refile TC-P3-16's first half.

## Already known (don't refile, do say if you see more)

- **Home's Attendance view** (`/app?view=attendance`), Manager and Owner, 320–430: shows its empty state before the attendance read arrives, then shifts about 118px when the "Some comparisons are limited" notice appears (layout shift about 0.05). This is assigned to the desktop session, which owns that component.
- **Time exports** (`/app/payroll-export`), 360–430: a panel near the bottom collapses about 1s after load (layout shift 0.02–0.045). Also assigned to the desktop session.
- **Server errors (500) under heavy load.** When the Mac ran many browsers at once, the dev server returned 500 on some reads. That's server behaviour, for joint testing with Codex, not a screen defect. Retry once before filing a 500.
- **`AUDIT-SWAP`** (Riley Rivera) works only next Saturday and Sunday. Wave A is finding out why the swap view still offers no shifts to swap. Until then, choosing and comparing shifts in the swap flow is out of scope this round.
- **Large data** (200 people, very long names, a year of timecards) is checked in round 4 on a second preview. The Mac is too loaded to run it alongside this round.

## Scope

1. **Every Phase 3 screen** for Employee and Lead, from `PHASE-3-BRIEF.md`, plus the new states those accounts unlock:
   - clocked in and on break, on Home and My time
   - a lead's pass, schedule and swap view
   - the decided time-off timeline
   - a lead's My pay
2. **The Phase 2 screens again** (`BRIEF.md`: Home and its views, Inbox, the time-off review, Schedule, Team, Timecards, Payroll, Time exports, the More sheet) for Manager and Owner, **under the new checks only**. They reached zero under the old ones. AUDIT-ON and AUDIT-BREAK now change some Manager counts; that's data, not a defect.

## The new checks, for every screen in scope

- **Widths:** 320, 360, 390, 430, landscape 844×390. At 768–1440, only check that nothing is broken: desktop for these pages is Phase 4's.
- **Text:** 100, 125, 150 and 200%.
- **Browsers:** Chromium and WebKit. Jose cut Firefox on Oct 19, so don't file Firefox-only findings. Playwright is at `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`.
- **Submitting, on screen only:** for Time-off submit and withdraw, the Availability save, Request a correction, the Profile calendar link and the Updates review, check the pending state, failure (block the request in the browser), double tap (exactly one request leaves the browser) and slow network (throttle it).
  - Don't let a real submission through. Block or answer the request in the browser.
  - What the server saves is joint testing with Codex, not yours.
- **Session, on screen only:** answer a read or an action with 401, then 403, in the browser, and check what the screen shows.
- **Motion:** normal and reduced motion, in the stability area.
- **On-screen keyboard:** check Time off, Availability and Request a correction in the iOS Simulator (iPhone 17 Pro, Safari) and the Android emulator (`Nevora_Pixel_7_API_36`, Chrome; adb is at `~/Library/Android/sdk/platform-tools/adb`).
  - **Interaction inspector only**, so only one agent drives the simulators.
  - In the simulator and emulator the preview is at `http://127.0.0.1:51302`. On Android use `10.0.2.2:51302`, or run `adb reverse tcp:51302 tcp:51302` first.
- **Dark mode:** not applicable; the app has none.

## Rules

Read only, as always:
- Change no data.
- Never submit, approve, claim, swap, withdraw or confirm for real.
- Never print the password.
- Write only your own report file.

The preview stays frozen during this round.
