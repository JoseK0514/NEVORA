# Wave C exit round (round 4), run locally

October 19, 2026. Codex started round 4 on `5f7c166`. It reported nothing new for 45 minutes, so by the coordinator's rule the same round runs locally, and whichever finishes first counts. The code is identical to `5f7c166`; the only later commits are documents.

- **Preview:** `http://127.0.0.1:50431`. This is a fresh preview, so the password is new. Signed-in states are in `.../scratchpad/preview/state/<account>.json`, and the password is in the newest `.../scratchpad/preview/evidence-*/access.json`. Read it from the file only; never print it.
- **Bar and report format:** `docs/product/specs/codex-joint/INSPECTION-BRIEF.md` on `claude/premium-phase-1`, the shared bar. Read it, then this folder's `BRIEF.md` for the pages and accounts, and `ROUND-2.md` / `ROUND-3.md` for decided items. Don't refile those.
- **This is an exit round:** a full sweep of your area on every Wave C page and role, with judgment at 320, 390, 844×390 and 1440 (plus 768 and 1024 for desktop layout) in Chromium, and spot checks in WebKit. `checks.mjs` runs the width, text-size and browser sweep separately, so don't run it.
- **Out of scope:** no Firefox, and not the shared shell (header, tab bar, More sheet, desktop sidebar). The iOS keyboard pass is the coordinator's.
- **Read only:** answer or abort every submission in your own browser. Don't change data.
- **Report:** append `## Round 4 (exit)` to your area's report in this folder. Include the status of every earlier ID still listed in `ROUND.md`, new findings in the usual format, a short "checked and correct" list, and one line: zero open P0–P2 in your area, yes or no.
- **Time:** about 45 minutes. The dev server is shared, so use one browser at a time and retry a 500 once.
