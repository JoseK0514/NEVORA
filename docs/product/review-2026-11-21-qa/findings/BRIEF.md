# NEVORA senior UI QA — shared brief (Nov 21, 2026)

Five agents run in parallel. Read this whole file first, then your own section in the prompt you were given.

## What is under review
- Review branch: `origin/claude-codex-collab-nevora` at **`6601ee82a`** ("Say Spanish buttons use the infinitive…").
  The main checkout's local branch is 4 commits behind it; do not touch the main checkout.
- QA worktree (detached, read-only for you): `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/.ui-work/wt/qa1121`.
  Read source here. **Never edit app source, never commit, push, create or move branches, never run the app or tests in
  the main checkout** (it holds a `.env.local` for a shared database).
- Not on the review tip (in progress elsewhere, owned by another session — do not touch its folder
  `/Users/josek0514/Desktop/NEVORA-UI-READINESS/nevora-spanish`): branch `claude/full-spanish-20261121` (`425bdbf85`,
  signed-in Spanish). If you need it, make your own detached worktree under `.ui-work/wt/` (see HARNESS.md) and label
  every finding from it "unmerged branch 425bdbf85".

## Approved design (the yardstick)
- `DESIGN.MD` (repo root, 2,500 lines; later, route-specific sections override older blanket rules) and `.21st/DESIGN.md`.
  Latest sections: "Owner premium round (Nov 21, 2026)", Direction B foundation. Tokens: `src/app/b-tokens.css`,
  `src/app/app/b-foundation.css`. Voice: `docs/` voice guide on the review tip (`git log -3` shows it).
- Jose's recorded taste (deliberate decisions — do not flag these as defects; DO flag violations of them):
  no light tinted buttons/labels/message strips ("slop"); no "yellow box with a message"; messages in cards = icon
  circle + title + line, no box; icons in circles = Phosphor duotone; Phosphor is the icon family; success = `BDoneMark`
  (green disc, tick drawn once); counts beside titles = plain grey numerals; tab counts = quiet numerals + amber dot when
  an answer is needed; no coloured numerals in tinted pills; secondary/row buttons = white, one hairline, ink words;
  buttons squarer, 10px corners; grey detail boxes = label/value rows between two hairlines; Schedule shifts = white
  capsules on a day timeline. Direction B look ("B2") stays.
- Prior reviews to avoid re-reporting fixed items: `docs/product/review-2026-11-21-owner-premium/`,
  `docs/product/review-2026-11-20-owner-polish/`, `docs/product/FIXED-AND-REMAINING.md`,
  `docs/handoffs/2026-11-21-claude-owner-premium-round.md` (lists known gaps and server-side asks).

## Running the app (fictional data only)
- Read `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/.ui-work/HARNESS.md` before running anything.
- **A live held app is running** on the review tip with the rich Owner workspace (Northside QA Workforce, 12 people,
  3 weeks of schedules, payroll runs, requests; Rondo flags on, no AI provider/key so no model calls).
  URL: in `.ui-work/cap/qa-live/HOLD_URL`. Sign in at `/login` (Employee ID + password).
  - Owner: `QAOWNER` (Jose Natal). Company-wide Manager: `OWN-ELENA` (Elena Ruiz). Others: find Employee IDs on the
    Team pages as Owner. Password for seeded people: `TEST_PASSWORD` in `src/test/integration/owned-app-fixture.ts`.
  - **Only Agent 3 (workflows) may change data on the live app.** Everyone else: navigate, open and cancel dialogs,
    submit empty/invalid forms for error states, but do not publish, approve, invite, delete or save. Data may change
    under you because Agent 3 is working; note it rather than reporting it as a bug.
  - Do not stop the live app (never create `cap/qa-live/STOP`). The lead engineer owns it.
- Screenshots / scripted browsing: Playwright 1.62 at
  `NODE_PATH=/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/.ui-work/wt/qa1121/tools/ci-browser-runtime/node_modules`
  (Chromium, WebKit and Firefox are installed in `~/Library/Caches/ms-playwright`). Run headless. Keep at most one
  browser open at a time (the Mac has 16 GB and other agents share it). `axe-core` is in the worktree's `node_modules`.
- Fresh, isolated captures (own throwaway database, scripted flows such as the Clocker kiosk, Lead/Employee roles,
  signed-out pages in en/es): `.ui-work/cap-rs.sh wt/qa1121 cap/qa-<agent>-<name> <role> <widths> <routes> [ENV=VAL…]`
  run from `.ui-work/`. Only two capture slots exist and the live app holds one, so runs queue; keep them few and
  targeted. Run long ones with the Bash tool's background mode.
- **Do not use the built-in browser pane or the Chrome extension** (one shared pane; the lead uses it).
- Never send real email/SMS, never use real credentials, providers or paid generation.

## Output (each agent)
- Folder: `.ui-work/qa1121/<agentN>/` — scripts, screenshots, and `findings.md`.
- `findings.md` columns: ID (A1-01…), severity (P0 blocks release / P1 must fix before production / P2 should fix /
  P3 polish), area/route, role, viewport/device, what happens vs what should happen, evidence (file path; marked-up
  screenshot where visual), how verified (`chromium-desktop`, `chromium-touch-emulation`, `webkit-playwright`,
  `ios-simulator`, `real-device`, `source-only`, `axe`), and approved-exception check (which DESIGN.MD rule it breaks
  or "none — taste call").
- Also list: what you checked and found good, what you could not check and why.
- Evidence beats opinion. Reproduce every P0/P1 twice. Never claim a check you did not run (e.g. no VoiceOver claim
  from source reading).
- Marked-up screenshots: draw boxes/labels with Playwright (inject an absolutely positioned overlay with a 2px
  `#E5484D` outline and a numbered label over the element's bounding box) before taking the shot, or composite with a
  small node script. Name them `<ID>-<slug>.png`.
- Your final message back: a compact summary (top findings by severity with IDs, coverage, gaps) and the findings path.
