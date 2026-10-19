# Wave B inspection brief

October 19, 2026. Phase 3.5 Wave B rebuilt seven weekly Owner and Manager pages on the kit, phone and desktop together. Your job is to find every defect in your one area before Jose does. Measure, locate and show each one. "Looks fine" is not a result; a number is.

Read first, in this order:

1. `/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/phase-7-inspection-2026-10-18/PARALLEL.md`: the bar, the full inspection matrix, the form pattern and how the design must look.
2. `/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/phase-7-inspection-2026-10-18/BRIEF.md`: report format and severities (P0, P1, P2). Its preview URL and password path are out of date; use the ones below.
3. `ROUND-2.md` in the same folder: items agreed earlier. Don't refile them.

## What you inspect

| Page | Route | Roles that can open it |
|---|---|---|
| Insights | `/app/reports` | Owner `QAOWNER`, Manager `AUDIT-M` |
| Templates | `/app/schedule/templates` (also `?week=2026-10-26`, and `?saved=1`, `?archived=1`, `?error=save`, `?applied=3&skipped=1&warnings=1`) | Owner, Manager |
| Scheduling rules | `/app/schedule/settings` (also `?saved=1`, `?error=invalid_hours`, `?windowSaved=1`) | Owner (can edit the trade policy), Manager (reads it) |
| Update detail | `/app/updates/<id>`: open `/app/updates` and follow the first update link | Owner, Manager, Lead `AUDIT-LEAD`, Employee `AUDIT-E` |
| Compose | `/app/updates/compose` | Owner and Manager ("Create update"), Lead and Employee ("Message today's team") |
| Payroll settings | `/app/settings/payroll` | Owner only (`QAOWNER`, `payroll-qa-owner`) |
| Payroll runs | `/app/payroll` | Manager with payroll access `payroll-qa-reviewer` (the Owner's view passed Phase 2; check it hasn't regressed) |

A role that can't open a page must be sent away cleanly (Employee on Insights, Manager on Payroll settings): check that too.

Source: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/p35-wave-b-808dfd`. Wave B styles are all in `src/app/app/premium-wave-b.css`; the kit is `src/components/kit/`. Components: `reports.tsx`, `communication-detail.tsx`, `communication-compose.tsx`, `rules-hours-list.tsx`, `position-quota-fields.tsx`, `shift-change-policy-fields.tsx`, `schedule-template-controls.tsx`, `payroll/payroll-settings.tsx`; pages under `src/app/app/{reports,schedule/templates,schedule/settings,updates,settings/payroll}`.

## How to reach it

- Preview: read `url` from the newest `access.json` under `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-b-808dfd/55ac0f42-ec52-4b85-a911-9b8ee813b392/scratchpad/preview/evidence-*/access.json`. The password is in the same file. **Never print it, write it anywhere or put it in a URL.**
- Signed-in browser states: `.../scratchpad/preview/state/<account>.json` for QAOWNER, AUDIT-M, AUDIT-LEAD, AUDIT-E, AUDIT-LONG, payroll-qa-reviewer, payroll-qa-owner, payroll-qa-manager.
- Playwright (Chromium, Firefox, WebKit): `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`. axe: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/node_modules/axe-core/axe.min.js`.
- Example helpers you can copy: `.../scratchpad/wb/common.mjs`, `shots.mjs`, `probe.mjs`.
- Put your own scripts and screenshots in `.../scratchpad/inspect/<your-area>/`.
- The dev server is shared and slow under load. Run your browsers one at a time, not in parallel, and allow 2 minutes for a first page load. If a page load times out, retry once before reporting anything.

## Rules

- **Read only.** Don't edit code, CSS, tests or data. Don't commit.
- **Nothing may reach the server as a change.** You may press Save, Publish, Apply, Archive, Remove, Acknowledge, Mark read, Withdraw and the payroll buttons **only** while a Playwright route holds or aborts every non-GET request (`page.route('**/*', r => r.request().method() === 'GET' ? r.continue() : r.abort())`, or hold it with a never-resolving handler to see the pending state). That is how you test pending, failure, double tap (count the requests your route saw) and slow network. Never let a POST, PUT, PATCH or DELETE through. Never press Sign out.
- To force a failed read, abort the matching GET (`/api/reports`, `/api/manager/communications/...` or `/api/employee/communications/...`, `/api/payroll/...`). To force signed-out mid-use, fulfil it with status 401; forbidden with 403. Offline: `context.setOffline(true)`.
- Fictional data only. Send nothing outside this machine.
- Known limits: no real iPhone here, Playwright has no native blur, and full-page screenshots draw sticky bars mid-image (a capture artifact, not a defect).

## The matrix, for every page and role above

Widths 320, 360, 390, 430, landscape 844×390, 768, 1024, 1440; text size 100, 125, 150 and 200% (root font size); Chromium, Firefox and WebKit; normal and reduced motion; states loading, ready, empty, partial, offline, paused, failed read, no access, signed out mid-use, decided and large data where the page has them; Print / Save PDF on Insights. Dark mode: not applicable (the app has none). The on-screen keyboard check in the simulators is run by the session, not by you.

## Report

Write one file: `docs/product/specs/p35-wave-b/inspection/<area>.md` in the worktree, where area is `alignment`, `stability`, `type-colour-copy`, `interaction-states` or `widths-roles`. One-paragraph verdict, then a findings table worst first (ID with your prefix, page, role, width, element, what's wrong measured, screenshot path, likely cause at `file:line`, a specific fix, severity), then what you checked and found correct, with measurements. Payroll and legal wording is out of scope for changes: list wording suggestions separately, not as defects. End with one line: does your area have zero open P0, P1 and P2?
