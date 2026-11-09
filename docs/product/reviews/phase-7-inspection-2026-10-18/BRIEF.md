# Phase 7 zero-defect inspection: shared brief

October 18, 2026. Jose wants to find **no defect at all** when he inspects. Your job is to find every one first. Look at one thing at a time, measure it, and record it. "Looks fine" is not a result. A number is.

## What you inspect

The Manager and Owner phone screens built in Phase 2 of the premium direction, running on fictional data:

| Key | Path | Notes |
|---|---|---|
| home | `/app` | Owner has a "Finish setting up" card first |
| inbox | `/app/inbox` | also `?filter=now`, `?filter=requests`, `?filter=planning`; open each collapsed group (`details`) |
| review | `/app/requests?tab=pending&requestId=audit-timeoff` | add `&from=home` for the Home origin. **Never press Approve or Decline.** |
| schedule | `/app/schedule` | |
| team | `/app/employees` | |
| timecards | `/app/timecards` | |
| payroll | `/app/payroll` | Owner only |
| More sheet | tap **More** in the tab bar | |

Roles: Manager `AUDIT-M`, Owner `QAOWNER`. Widths: 320, 360, 390, 430 (phone, `isMobile`, `hasTouch`), 768, 1024, 1440. Landscape phone: 844×390. Large text: set root font size to 125% and 150%, e.g. `document.documentElement.style.fontSize = '125%'`.

## How to reach it

- Preview: `http://127.0.0.1:51346`. It's a local Next dev server on a throwaway Postgres with fictional people. It belongs to the main session. Don't stop or restart it.
- The password for every account is in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/rt/.password`. Read it from the file. Never print it, write it into a report or put it in a URL.
- Playwright module: `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`.
- Example scripts in `.../scratchpad/rt/` that you can copy into your own folder:
  - `crop-app.mjs`: sign in, then one viewport screenshot
  - `p2-shots.mjs`: full-page screenshots
  - `probe-app.mjs`: sign in, then evaluate JS
  - `p2-checks.mjs`: the existing 247 checks, so you don't repeat them blindly
- axe is at `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/premium-phase-1/node_modules/axe-core/axe.min.js`.
- Source under inspection: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/premium-phase-1`. Read it to find the cause of what you see, and give `file:line` for each finding.
  - Style and parts: `src/components/kit/kit.css`, `src/components/kit/kit.tsx`, `src/app/app/portal-premium.css`
  - Screens: `src/components/premium-home.tsx`, `src/components/manager-inbox.tsx`, `src/components/manager-time-off.tsx`
- The intended system:
  - `docs/product/reviews/premium-direction-2026-10-18/ui-designer.md`, section 3 (token sheet) in the main checkout
  - `PLAN.md`: F1–F9 and Phase 7
  - Phase 2 report: `.claude/worktrees/premium-phase-1/docs/product/specs/premium-phase-2/README.md`

## Rules

- **Read only.** Don't edit app code, CSS or tests, and don't commit.
- **Don't change data.** No Approve, Decline, Publish, Save, Submit, Delete, Copy week, Send, Add or Sign out. You may open menus, sheets, `details` and filters, focus fields without submitting, and follow links.
- Put your scripts and screenshots under `.../scratchpad/phase7/<your-role>/`. Write only your report file under `docs/product/reviews/phase-7-inspection-2026-10-18/`.
- Use fictional data only. Send nothing outside this machine.
- Past known limits: Playwright has no native blur and no real iPhone, and full-page screenshots draw sticky bars mid-image. A sticky bar in the middle of a full-page capture is a capture artifact, not a defect. Check sticky bars with viewport screenshots while scrolled.

## How to report

Write one file, `<your-role>.md`, in this folder.

- Put a one-paragraph verdict at the top.
- Then give a table of findings, worst first. Each finding has:
  - **ID** (your prefix plus a number)
  - **Screen, role and width**
  - **Element**, with a selector or visible text
  - **What is wrong, measured**, e.g. "Approve label baseline 2px lower than Decline's: 812 vs 810", "icon 1.5px above text centre", "card left edge 16px, next card 20px"
  - **Screenshot** path (a crop with the problem visible)
  - **Likely cause** at `file:line`
  - **Fix**, specific: values, not "align it"
  - **Severity:**
    - P0: broken, unreadable or unusable
    - P1: visibly wrong to a careful user
    - P2: a precision issue a designer would catch
- Then a list of what you checked and found correct, with the measurement, so the re-check knows what passed.
- Don't pad. Never invent a finding. If something is a judgment call, say so and say why.
