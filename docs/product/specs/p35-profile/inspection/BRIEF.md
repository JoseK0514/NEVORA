# Profile (Phase 3.5) inspection brief

October 19, 2026. You inspect **one area** of the new Owner and Manager Profile page. Read these first:
`/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/phase-7-inspection-2026-10-18/PARALLEL.md` (the inspection matrix and the design rules), `BRIEF.md` in that folder (method, severities and report format) and this file. Where they differ, this file wins on how to reach the page.

## The page

| | |
|---|---|
| Route | `/app/profile` |
| Roles | Owner `QAOWNER`, Manager `AUDIT-M`. Employee `AUDIT-E` and Lead `AUDIT-LEAD` still get the Phase 3 employee Profile (owned by another session): only check that they aren't broken by this change and aren't shown the new page. |
| Source | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/p35-profile-6cdee8`: `src/components/manager-profile/*` (page, client view, contract), `src/app/app/premium-profile.css` (all its styles), `src/app/app/profile/page.tsx` (only the role check), the kit in `src/components/kit/kit.{tsx,css}`. |
| Contract | `docs/product/specs/p35-profile/CODEX.md`. Contact, locations and alert switches come from `GET /api/management/profile` and `POST /api/management/profile/alerts`, which **don't exist on the server yet**. The harness below serves them from fixtures by intercepting the requests in the browser. |

Contents: band "Profile"; card **Your details** (Name, Role, Company, Email, Phone, Locations, Time zone; Owner: "Edit your details" link; Manager: ask-the-owner note); card **Pay** with My pay (only when payroll offers it; payroll is on in this preview); card **Notifications** (Notifications link, "Alerts on this device" row or a note, then "You’re told about" with one switch per topic); **Sign out**. Phones: one column. From 1024px: details left, the rest right.

## How to reach it

- Preview: `http://127.0.0.1:52269` (this session's own; don't stop or restart it). It is frozen while you inspect.
- Signed-in states: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/preview/state/<ACCOUNT>.json`. Never sign in yourself and never read or print the password.
- Harness: `docs/product/specs/p35-profile/inspection/harness/profile.mjs` in the worktree (run it with node from anywhere). Copy it into your own folder `.../scratchpad/inspect/<area>/` if you want to extend it; set `FIX` to the fixtures folder there. Flags:
  - `--account QAOWNER|AUDIT-M --w 390 --h 844 [--landscape] [--browser chromium|firefox|webkit] [--zoom 1.25|1.5|2]` (zoom sets the root font size, which is how text size is tested here)
  - `--fixture owner|manager|manager-empty|owner-large|unavailable` (no fixture means a 404: the endpoint isn't built)
  - `--read block|401|slow|hang` (failed read, signed out, slow, endless loading), `--save ok|fail|401|abort|slow`
  - `--reduced` (reduced motion), `--click "<css>" [--after ms]`, `--eval "<js>"`, `--out file.png [--full]`, `--wait ms`
  - It prints how many read and save requests left the browser (`counts`).
- Playwright: `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`. axe: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/premium-phase-1/node_modules/axe-core/axe.min.js`.
- Offline and pause: `context.setOffline(true)` after load, or dispatch `blur` / `focus` on `window` (the details clear while the window is left, by design, like the employee Profile).

## Rules

- Read only. Don't edit app code, CSS, tests or data. Don't commit.
- Alert switches may be tapped: the harness answers the save in the browser and nothing reaches the server. **Never press Sign out** (it ends the saved session for every inspector). Check its pending state by reading the code, or with a request route that you abort.
- Fictional data only. Nothing leaves this machine.
- Full-page screenshots draw the sticky tab bar mid-page. That is a capture artifact.

## Not in scope (don't file)

| Item | Why |
|---|---|
| No link to this page from the More sheet, the desktop account menu or the sidebar, and no "Profile" in the desktop header trail | Those live in `app-shell.tsx` and `navigation.ts`, owned by other sessions. The change has been requested from the coordinator. |
| The employee and Lead Profile itself, My pay, the Notifications list page and the device alerts sheet | Other sessions own them. File only if this change broke them. |
| What the server stores or sends after a save, and the real read | Joint testing with Codex |
| Topic wording ("You’re told about" list) | Proposal awaiting Jose; flag only rule breaks (case, apostrophes, blame words) |
| Dark mode | The app has none |
| On-screen keyboard, Print / PDF | The page has no text fields and no Print |
| Spanish | Phase 6 |

## Report

Write `docs/product/specs/p35-profile/inspection/<area>.md` in the worktree above. Format as in `BRIEF.md`: verdict paragraph, findings worst first (ID with your prefix, page/role/width/browser/zoom, element, measured problem, screenshot path, cause at `file:line`, fix, P0/P1/P2), then what you checked and found correct with the measurement. End with one line: "Open P0–P2 in <area>: N". Never invent a finding; a number beats an opinion.

When you re-inspect after fixes, add a section `## Round N` to the same file: re-check every open finding, then your whole area again.
