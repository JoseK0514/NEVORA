# Release gate, 2026-11-23 18:30 UTC

Release candidate `91c08d193` (origin/claude-codex-collab-nevora): `a087fea9f` plus the two QA test commits
(`4ecde955`, `494b82de` = `80d63a2e6`) plus the guide rebuild. Gated tree `5c76e1970` = `a087fea9f` + `80d63a2e6`; a
`git diff` shows it differs from `91c08d193` only in `docs/guides/`. Fictional data, owned throwaway Postgres 16, no
network beyond loopback.

| Check | Result |
|---|---|
| Typecheck | Pass |
| oxlint | Pass |
| Unit (`5c76e1970`) | 16,311 passed; 1 failed: `manual-publication` (the guide rebuild isn't in this tree) |
| `manual-publication` on `91c08d193` | **Pass** (G44 closed by the guide rebuild) |
| readiness-ui-browser, production build over https | **Pass**: Chromium 7/7, WebKit 7/7, 0 page errors (2 of 2 production runs with the https harness) |
| readiness-shift-concurrency-browser, production build | **Fail (harness)**: stops in Chromium after check 1 at the test's own router-read drain, before any scenario runs; the same on every production run today |
| Both tests, development build on `91c08d193` | readiness-ui: Chromium 7/7, WebKit 7/7. Concurrency: Chromium 20/20; WebKit failed after 4 checks on a cancelled authority read during a pending hard navigation. With sweep-1's test-only `15fb4720` and `156a1735` applied (local `1eadcfa02`): **2 of 2 runs pass**, Chromium 20/20 and WebKit 20/20, 0 errors |

## The stuck /app/schedule read in the concurrency test (production only)
- **What:** an ordinary (not prefetch) router read of `/app/schedule` made during sign-in gets 200 headers and
  never finishes. `schedule/loading.tsx` makes Next stream the fallback first.
- **Not the database.** `pg_stat_activity` and `pg_blocking_pids`, sampled every second through the whole production run
  (66 samples): every lock wait was on the `workspaces` singleton row (`… FOR SHARE` from the session and workspace
  guards vs `… FOR NO KEY UPDATE` from operational-scope, open-shifts, employee-profile, conversations and staff-tasks guard
  reads). Every one cleared within 1 s (query and transaction age 0 s); no session sat idle in a transaction for 2 s or
  more.
- **Not felt by people.** Probe on a production build over https, no concurrent writer: every `/app/schedule*` prefetch
  finished or was aborted within about 20 ms of its headers; real clicks from Home to Schedule took 448, 414 and 909 ms
  in Chromium and 1,286, 931 and 871 ms in WebKit, with the heading visible; DB connections went from 12 idle to 0 after
  navigation and close; no errors in the `next start` log.
- **So:** a test-harness interaction (the concurrency test's routes and observers on three sessions), not an app hang.
  A prefetch-only skip (`2a411faa3`) was tried and withdrawn: the read isn't a prefetch. The concurrency scenarios are
  proven on development builds only.
- Side note: every guarded read and write takes a row lock on the `workspaces` singleton, so concurrent requests queue
  on one row. Harmless at this scale.

## Test changes from QA today (merged by the lead)
- `5dcf46a6e` → `4ecde955`: readiness-ui waits for the reload before reading the shift's notes (the WebKit "Reload
  current shift" race, 3 of 13 runs).
- `80d63a2e6` → `494b82de`: both readiness tests serve production runs over https through the owned TLS proxy, so WebKit
  keeps the secure session cookie.

## Owner release sweep
`../release-sweep/owner/report.md`: 213 views (71 Owner routes at 390, 390 with 200% text and 1440, production build
over https). No overflow, clipping or overlap; 1 axe finding (color-contrast on the Team search field at 1440); phone
controls at 32–40px listed (all pass WCAG 2.5.8, miss the 44pt goal).
