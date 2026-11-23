# Integration QA final summary, Nov 23, 2026 (11:40–18:45 UTC)

Branch watched: `claude-codex-collab-nevora`, from `b40f60e99` to the release candidate `91c08d193`. QA ran past the
planned 17:30 end at the lead's request, for the fix verifications, the release gate and the Owner sweep. Runs: 12:25,
13:00, 13:20, 14:45, 15:15, 15:35 and 16:05, then the fix verifications and the release gate (see the dated notes in this
folder). Each full run: typecheck, oxlint, the unit suite, and both readiness browser tests on a production build
(plus a development build) in Chromium and WebKit. Fictional data, owned throwaway Postgres only; no real notifications,
deploys or publishing.

## Regressions caught and their fixes
| Found | What | Introduced by | Fixed by |
|---|---|---|---|
| 12:25 | `scoped-home-page.test.tsx`: new `place` prop not in the test (G41) | `79ea724d` | `59cdd567f` |
| 13:00 | `recovery-u11.test.tsx`: "How this works" became `<details>` | `fa9f2b72a` | `48724ab74` |
| 14:45 | `manager-inbox-corp.test.tsx` ×2: "All" lost its count | `9596f9342` | `2651a3121` |
| 14:45 | `review-details.test.tsx` "Payday counts" ×2: Timecards tile detail | `9596f9342` | `2651a3121` (U03 count still on Home) |
| 14:45 | `review-details.test.tsx` "another reviewer approves": row `aria-label` removed | `30cc4ab24` | `2651a3121` |
| 13:00–16:05 | WebKit: Payroll export page unmounted (period history and sheet lost) | pre-existing in `scoped-read-frame.tsx`, more frequent from about 13:00 | `002c9df6` (refresh, not replace) + `d3bbe73b` (keep a lapsed page mounted): 0 unmounts in 13 runs |
| 15:15–17:40 | WebKit "Reload current shift" race | test | `4ecde955` (QA `5dcf46a6e`) |
| all day | WebKit signed out on every production run (secure cookie over http) | test harness | `494b82de` (QA `80d63a2e6`) |

## Release gate (`91c08d193`)
See `2026-11-23T1830Z-release-gate.md`. Typecheck, lint, unit (except the guides test, now rebuilt), and
readiness-ui-browser on a production build in Chromium and WebKit pass. The concurrency test passes on development
builds (Chromium and WebKit 20/20, 2 of 2 runs, with sweep-1's `15fb4720` and `156a1735`); on production builds it stops in its own harness before any scenario runs. That isn't the app and isn't the
database (lock sampling and the probe in that note).

## Owner release sweep
`../release-sweep/owner/report.md`: 213 views, 1 axe contrast finding, phone targets at 32–40px.

## Still open
- readiness-shift-concurrency-browser on a production build (harness): the test's router-read drain waits on a
  `/app/schedule` RSC body that never finishes under its own setup. Needs a test-owner look; not a release blocker in QA's view.
- WebKit "access control checks" page errors (G69 family) seen twice in the development-build concurrency test (13:00, 13:20);
  none since 15:35.
- Not covered here: real iPhone and Safari, screen readers, Lighthouse.

## Environment notes for the next QA run
- WebKit 2336 and Chromium 1234 for the pinned `tools/ci-browser-runtime` Playwright 1.62.1, installed with
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-webkit` (plus `playwright install-deps webkit`).
- Browser tests run as `postgres`: `node scripts/payroll-postgres.mjs vitest.all-ui-browser.config.mts <the two
  readiness files>` with `NEVORA_OWNED_APP_PRODUCTION=1`, `NEVORA_READINESS_UI_EVIDENCE` and `NEVORA_READINESS_MATRIX_EVIDENCE`.
- Don't switch the checkout while an owned app is building ("Application source inventory changed").
- Unshallow the clone before reading `manual-publication.test.ts`.
