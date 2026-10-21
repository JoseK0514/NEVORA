# Upscale review: Owner and Manager app

October 20, 2026. Jose asked: look across the Owner and Manager app and find what we can **upscale**, meaning what would make it feel more premium, clearer or more valuable to a demanding client. This is not a defect hunt. The pages have passed defect inspection, so report opportunities, ranked by impact.

## What you review

- **Build:** the release-candidate integration build (the "clean v3" Owner and Manager look Jose approved on October 19), running on the Profile chat's preview: **`http://127.0.0.1:55450`**. The coordinator's own integration preview is down, so this preview runs a read-only copy of its source.
- **Signed-in states** (Playwright `storageState`): `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/upscale/state/<ACCOUNT>.json`. Accounts are `QAOWNER` (Owner), `AUDIT-M` (Manager) and `payroll-qa-owner` (Owner with payroll data). Never sign in yourself, and never read or print a password.
- **Playwright:** `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`. Chromium only.
- **Pages** (all render as Owner): Home (`/app`, plus its Attendance, Team overview and Schedule activity views from the sidebar's "Team tools"), Inbox, Schedule (with Add shift `/app/schedule/new`, Templates, Scheduling rules), Team (`/app/employees` and a member's detail), Updates, Notifications, Timecards, Payroll, Time exports (`/app/payroll-export`), Insights (`/app/reports`), Settings (hub and its pages), Account recovery, Clocker recovery, Profile, My pay. Check the Manager's view of each page it can open.
- **Widths:** 390×844 (phone: `isMobile`, `hasTouch`) and 1440×900. Glance at 768 only if a layout idea depends on it.
- **Profile's contact, locations and alerts** come from `/api/management/profile`, which may not be backed by this preview's database. To see the ready state, answer it in your own browser with `page.route` using the fixtures in `docs/product/specs/p35-profile/fixtures/` of the worktree below.

## Benchmarks and constraints

- **Gusto is the benchmark** for clarity and polish. Also consider the best of Homebase, When I Work, Deputy, 7shifts, Rippling and Square Team where relevant.
- Read `DESIGN.MD`, `.21st/DESIGN.md` and `docs/product/TEAM-RULES.md` in `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/p35-profile-6cdee8`, plus the clean v3 spec if it's there (`docs/product/specs/clean-manager/spec.md`). Keep NEVORA's brand, Phosphor icons and the approved v3 direction. Ideas that break them must say so and why.
- **Don't propose:** dark mode or Spanish (both scheduled later), or anything that only restates a known defect.
- Note anything that needs server or data work (Codex owns the backend), and whether an idea needs Jose's approval (payroll and legal wording always does).

## Rules

- **Read only.** Don't edit app code, CSS, tests or data. Don't commit. Never press Approve, Decline, Publish, Save, Send, Delete, Copy week or Sign out, and never submit a form. You may open menus, sheets, filters and `details`, and follow links.
- One browser at a time, and close it when you finish. The Mac is heavily loaded.
- Fictional data only. Send nothing outside this machine.
- Put scripts and screenshots in `.../scratchpad/upscale/<your-role>/`.

## Report

Write one file: `docs/product/reviews/upscale-2026-10-20/<your-role>.md` in the worktree above.

1. A short verdict paragraph: where the app stands against Gusto, and the one upscale with the most value.
2. **Opportunities, ranked by impact** (aim for 8–15, quality over count). For each:
   - **ID** (your prefix plus a number)
   - **Page(s), role, width**
   - **What it is today:** observed, with a screenshot crop path
   - **The upscale:** specific (what changes, where, how it looks or behaves), with the benchmark it borrows from if any
   - **Why it matters:** the client value
   - **Effort:** S, M or L
   - **Needs:** UI only, server or data (Codex), or Jose's approval
3. **Quick wins:** S-effort, UI-only items you'd do first.
4. **Leave as is:** what already reads premium, so nobody churns it.

Don't pad. A sharp, evidenced idea beats a long list.
