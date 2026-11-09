# Codex, in the cloud: be the inspectors for all six chats

You're Codex, working in the cloud on NEVORA (`JoseK0514/NEVORA`). The release is **October 20, 2026**. Six Claude chats are rebuilding every screen. Until now, each chat ran five inspectors on Jose's Mac. The Mac is overloaded: inspectors lose hours to 503s and timeouts, and that is the slowest step left.

**From now on, you run the inspection rounds for all six chats.** The chats keep fixing; you find what's still wrong. This takes over most of the remaining wall time, so do it at the same bar. An independent eye should be stricter, not looser.

## Read first

All on `claude/premium-phase-1` (pull it again whenever you start a round):
1. `docs/product/specs/codex-joint/INSPECTION-BRIEF.md`: the bar, the five areas, the matrix, the design rules, the rules, and the report format. **Follow it exactly.**
2. `scripts/ui-checks/README.md`: the preview, the extra test data, sign-in and the automated checks.
3. `DESIGN.MD` and `.21st/DESIGN.md`.
4. The chat's own earlier reports, so you re-check by ID:
   - `docs/product/specs/premium-phase-3/inspection/*.md` for Phase 3
   - `docs/product/specs/<folder>/inspection/*.md` on each chat's branch

## Rules

- **Read only on every `claude/*` branch.** Never push to one, never merge, never deploy.
- **Where you write:**
  - Reports go to your own branch `codex/inspections`.
  - Backend fixes stay on `codex/premium-backend`, as before.
- **Data:** fictional only, nothing sent out. Submissions are answered in your own browser and never reach the server. Never print the password.
- **Load:** run as many previews in parallel as your machine allows, one per branch, each with its own `PREVIEW_OUT`. Run only one `checks.mjs` at a time per preview.

## The chats

| Chat | Branch | Folder (`docs/product/specs/…`) | Pages |
|---|---|---|---|
| Phase 3 (coordinator) | `claude/premium-phase-1` | `premium-phase-3` | Every Employee and Lead page; also the shared shell and kit |
| Profile | `claude/p35-profile-6cdee8` | `p35-profile` | Owner and Manager Profile |
| Wave A | `claude/p35-wave-a-1283c8` | `p35-wave-a` | Add and Edit shift, Coverage, Copy week, manager Time off, Shift requests, Availability, Team member, New employee, Clocker PIN, Swap, Unable to work |
| Wave B | `claude/p35-wave-b-808dfd` | `p35-wave-b` | Insights, Templates, Scheduling rules, Update detail and Compose, Payroll settings and runs |
| Wave C | `claude/p35-wave-c-93e13c` | `p35-wave-c` | Settings and every Settings page, Account recovery, Clocker recovery |
| Desktop | `claude/p4-desktop-240fe0` | `p4-desktop` | 768–1440 for Manager and Owner pages, then Employee and Lead; the desktop sidebar, header and account menu |

## How a round starts

A chat that finishes a round of fixes commits and pushes its branch with `docs/product/specs/<folder>/ROUND.md`. That file holds:
- the round number and the commit to inspect
- the routes and roles
- the finding IDs to re-check
- what the fixes touched
- whether this is an exit round (a full sweep by all five areas)

**Your loop:**
1. Every 10 minutes, `git fetch` and read each branch's `ROUND.md`.
2. When a branch has a round you haven't inspected, start it on that exact commit:
   - start a preview with `PREVIEW_SOURCE` set to that branch's checkout
   - run `seed-extra.mts`; for any round that asks for large data, run a second preview with `--large`
   - run `login.mjs` for every account in the brief
3. Run `checks.mjs` over the chat's routes and roles at every width and text size, in Chromium and WebKit, then again with `--axe` at 390 and 1440.
4. Inspect all five areas per `INSPECTION-BRIEF.md`:
   - **Round 1** and **exit rounds:** a full sweep.
   - **Later rounds:** re-check the listed IDs, plus anything the fixes touched.
5. Push the reports to `codex/inspections`:
   - `<folder>/round-<N>/<area>.md`, using the areas `alignment`, `stability`, `type-colour-copy`, `interaction-states`, `widths-roles`
   - `<folder>/round-<N>/checks.json`
   - crops under `<folder>/round-<N>/crops/`
6. Add one line to `codex/inspections:STATUS.md`:
   `<time> · <chat> round <N> on <commit> · P0 x, P1 y, P2 z · <zero | not zero>`
   Jose and the chats read this file.
7. Repeat until every chat reports zero in all five areas on an exit round.

**Order when several are waiting:**
1. Phase 3 (coordinator), because the shell and kit affect everyone
2. Wave A
3. Wave B
4. Wave C
5. Profile
6. Desktop

If your task has to end before everything is at zero, write where you stopped at the top of `STATUS.md`. Jose will restart you with "continue the inspection loop".

## What stays on the Mac

- **On-screen keyboard checks** in the iOS Simulator and the Android emulator. Each chat does those locally at exit.
- **Jose's real-device pass.**

## Tonight

When Jose says the branches are merged, inspect `codex/release-candidate`, or the merged `claude/premium-phase-1` if Jose names it. That's one combined full sweep of every page, all five areas, looking especially for things that differ between chats:
- two versions of the same control
- spacing that changes from one page to the next
- words that differ for the same thing

Report it under `release/round-<N>/` on `codex/inspections`.
