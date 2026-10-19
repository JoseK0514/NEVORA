# Phase 4 desktop inspection: brief for the five inspectors

October 19, 2026. Read this, then `docs/product/reviews/phase-7-inspection-2026-10-18/PARALLEL.md` and `BRIEF.md` (both in the main checkout `/Users/josek0514/Desktop/NEVORA-UI-READINESS`). Those two set the bar, the severities (P0, P1, P2), the report format and the rules. This file says what is new in Phase 4 and where it runs.

## What changed in Phase 4 (desktop, 761px and wider; phones must be unchanged)

- **Sidebar (D-4).** "Employees" reads "Team". Requests left the sidebar: `/app/requests`, `/app/exchange` and `/app/availability` still work and light **Inbox**. Group labels are Plan, People, Time and pay, Workspace. The top-bar trail ends with the page's own name ("Plan › Inbox › Time off", "Time and pay › Timecards › Time exports"). Sidebar group labels and the "Powered by" line are 14px.
- **Band at most 200px** on Home, Home's three views, Inbox, Schedule, Team, Timecards, Payroll runs and Time exports. The band's eyebrow-row control (Refresh, Add shift, Add employee) overhangs the eyebrow line; Inbox filters sit on the title row; Home's view chips sit on the title row from 1024px (below 1024 the views' one-line description is hidden to keep the band under 200px).
- **Home.** Today runs the full width. Below 1180px one column; from 1180px, Next up, Also needs you and (Owner) Finish setting up on the left; This week, Plan ahead and Team tools on the right.
- **Inbox, list and detail.** From 1024px the list is on the left and a detail pane on the right (sticky). Clicking a row on a wide screen selects it (teal wash, 3px teal edge, `aria-current="true"`), keeps `?item=` in the URL and moves focus to the pane's heading; Escape in the pane returns focus to the row. The pane's button opens the full review (decisions stay there, O1). Ctrl/Cmd-click still opens the review. An "All requests" card (Time off, Shift requests, Availability) is under the pane, and under the list at 761–1023.
- **Team.** From 1024px the finder is one row and the list is a table: Name, Role, Location, Phone.
- **Legacy text floor.** Roster cells, timecard details, payroll guidance and export legends are 14px on desktop.
- **Load shifts removed** on Time exports (the period-close panel waits for the list) and on the Attendance view (its footer and Corrections wait for the read; the "limited" notice sits after the list).

## Pages, roles, URLs

| Key | URL | Roles |
|---|---|---|
| home | `/app` | Owner `QAOWNER`, Manager `AUDIT-M` |
| attendance | `/app?view=attendance` | both |
| team-overview | `/app?view=team` | both |
| activity | `/app?view=activity` | both |
| inbox | `/app/inbox`, `?filter=now`, `?filter=requests`, `?filter=planning`, `?item=<key>` | both |
| schedule | `/app/schedule` | both |
| team | `/app/employees` (also `?q=zzz` for empty, `?status=inactive`) | both |
| timecards | `/app/timecards` | both |
| payroll | `/app/payroll` | Owner (Manager is sent Home) |
| exports | `/app/payroll-export` | both |
| requests (fold) | `/app/requests`, `/app/exchange`, `/app/availability` | both; check only the sidebar and trail (the pages are Wave A's) |

Employee and Lead desktop is not in this round; it comes after Phase 3 closes.

## Where it runs

- Preview: read the URL from `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p4-desktop-240fe0/55a133fe-0aa8-4472-a3aa-f939856da789/scratchpad/preview/evidence-2026-10-19T13-09-58-832Z/access.json` (`url`). The password is in the same file; never print it.
- Signed-in browser states: `…/scratchpad/preview/state/<ACCOUNT>.json` (use as Playwright `storageState`; no need to sign in).
- Source: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/p4-desktop-240fe0`. Phase 4 styles: `src/app/app/premium-desktop.css`; Inbox: `src/components/manager-inbox.tsx`; shell: `src/components/app-shell.tsx`, `src/lib/navigation.ts`.
- Playwright: `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs` (Chromium, Firefox, WebKit).
- Put your scripts and screenshots under `…/scratchpad/inspect/<area>/`. Run one browser process at a time against the preview; parallel runs stall the dev server.

## The matrix for this round

Widths 768, 1024, 1440 (desktop), plus a regression look at 320, 360, 390, 430 and 844×390: phones and landscape phones must look exactly as before Phase 4. Text size 100, 125, 150 and 200% (`document.documentElement.style.fontSize`) after the page has loaded. Chromium, Firefox and WebKit. States: loading, ready, empty, offline, paused (window blurred), failed read (block `/api/manager/*` in the browser), signed out mid-use (force a 401), large data where the preview has it. Keyboard and focus, reduced motion. Submissions: none in this round; don't press anything that saves.

## Your report

Write `docs/product/specs/p4-desktop/inspection/<area>.md` in this worktree, in the format of `BRIEF.md`: verdict, findings worst first with measurements, screenshots, `file:line` and a specific fix, then what you checked and found correct. Areas: `alignment`, `stability`, `type-colour-copy`, `interaction-states`, `widths-roles`.
