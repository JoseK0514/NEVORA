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

- Preview: `http://127.0.0.1:50933` (this session's own; don't stop or restart it). It is frozen while you inspect.
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
| Shell pieces flagged by `checks.mjs`: sidebar group labels at 12px, the header "Search" label at 14px on 320–360, the compact brand link 136×38 in landscape, the header actions nudging 4px on hydration | Shared shell (`app-shell.tsx`, `portal-*.css`), owned by other sessions; reported to the coordinator. File only if this page makes them worse. |
| A console 404 for `/api/management/profile` when no fixture is served | The route isn't built yet (CODEX.md); the page shows its failed-read state |
| Dark mode | The app has none |
| On-screen keyboard, Print / PDF | The page has no text fields and no Print |
| Spanish | Phase 6 |

## Report

Write `docs/product/specs/p35-profile/inspection/<area>.md` in the worktree above. Format as in `BRIEF.md`: verdict paragraph, findings worst first (ID with your prefix, page/role/width/browser/zoom, element, measured problem, screenshot path, cause at `file:line`, fix, P0/P1/P2), then what you checked and found correct with the measurement. End with one line: "Open P0–P2 in <area>: N". Never invent a finding; a number beats an opinion.

When you re-inspect after fixes, add a section `## Round N` to the same file: re-check every open finding, then your whole area again.

## Round 2 (October 19, after Jose's cuts in PARALLEL.md)

- **Scope:** re-check every round-1 finding in your report by ID, then whatever the fixes touched (below). Don't redo the full sweep; `checks.mjs` re-ran the width, text-size and browser sweep (Chromium and WebKit).
- **Where:** 320, 390, landscape 844x390 and 1440, in Chromium, with WebKit spot checks. 125–200% text where your finding needs it. No Firefox; don't file Firefox-only findings.
- **Not yours:** the shared shell (phone header, tab bar, More sheet, section tabs, desktop sidebar or header). Ignore shell flags from `checks.mjs`.
- **Report:** add `## Round 2` to your file: each round-1 ID as fixed or still open (with numbers), any new finding in full, and a short "checked and correct" list. End with "Open P0–P2 in <area>: N".
- **Build:** commits fa27b75 → 8 later ones, ending at the HEAD of `claude/p35-profile-6cdee8` (cherry-picked kit fix 9f7b649 included). Since 0542792: the card head leaves out the empty status line when Try again or Sign in shows; a short assigned list reads inline ("Main Office · West Office"); the label column is 5rem; Owner alert rows follow payroll (5 on, 4 off). Jose approved the design, the payroll wording and the alert topics.

What changed, so you know what to re-check:

| Area | Change |
|---|---|
| Read rhythm | A focus or `pageshow` without leaving first no longer clears a finished read. Leaving (blur, hidden, offline) clears; coming back reads again. |
| Held sizes | Paused, offline and failed keep the last ready values' size (hidden, under the note); re-reading after a return shows the last values with "Checking…". A session that ended keeps nothing. |
| Alert list | Loading rows draw the role's expected words as text-shaped grey bars (exact ready size); loading switches are thumbless grey pills. Paused, offline, failed and signed-out lay a panel (tile, words, Try again or Sign in) over a hidden copy of the rows. |
| Card head | Never empty (non-breaking space unless an action shows); stacks to two lines in every state when the card is narrower than 22rem; Try again keeps one width ("Trying again…" shares its cell). |
| Focus and names | Switches and Try again are never `disabled` while busy (aria-disabled / aria-busy), so focus stays; Try again's name is its visible words, described by the read sentence. |
| Announcements | Only a reader-started retry says "Trying again…"; its result is announced ("Your details loaded." / "Still couldn’t load…"). Each failed save is announced once with its topic. |
| Copy | "Not saved. You’re offline." / "Not saved. Sign in again."; error panel without "check your connection"; band summary drops "pay" without My pay; first row "All notifications"; topics "Shift requests", "When a clock-in needs your review". |
| Contact values | Each address or phone part is an inline-block that moves whole and wraps inside only if wider than the line; addresses break after the @ or before dots. |
| Locations | Company-wide scope is one line ("All 3 locations", no list); an assigned list over five shows a count and Show all above the names. |
| Geometry | Label column 5.5rem, value basis 8rem; detail hairlines run to the card edge (0.5px at 2x); foot has 4px padding; row focus rings drawn inside; save-error icon in em, hanging. |
| Contrast | Busy words and Sign out's pending label at full opacity (old 55% fade overridden on this page). |
| Server load | My pay uses the payroll flag directly; the page no longer repeats the layout's payroll read. |
| Placeholder band | 6.5rem on phones (portrait and landscape); desktop has none (shared rule). |

## Exit round 4 (October 19)

A **full sweep** of your whole area, the last one before Profile merges, plus your open IDs from round 3 (ROUND.md lists them).
- `checks.mjs` sweeps every width, text size and both browsers. Judge at 320, 390, 844x390, 768, 1024 and 1440 in Chromium, with WebKit spot checks; both roles; every state the harness can produce.
- Preview: `http://127.0.0.1:50933` (restarted with Codex's pooled database transport, so 500s should be gone).
- Don't file: one console 404 for `/api/manager/inbox-count` per load (the route is on `codex/premium-backend`), the shared shell, or approved wording.
- Report: add `## Exit round 4` to your file with every finding in full and a short checked-and-correct list. End with "Open P0–P2 in <area>: N".
