# 34 Test Architect — end-to-end and visual-regression strategy

## Verdict

The v3 UI was proven by hand-run scripts, not by a suite that can run again. The coordinator scratchpad holds 387 `.mjs` probes, 19,670 PNGs and 16 GB in `/private/tmp`, and this session adds 91 more scripts. Those scripts use fixed ports, an `npx` cache path and absolute scratchpad paths, so a later change cannot be re-checked by the same means. The building blocks for a lasting suite already exist: `scripts/ui-checks/checks.mjs` is good, and CI already has a pinned Playwright 1.62.1 with Chromium and WebKit, its own Postgres, and SHA-bound evidence. What's missing is a frozen clock and seed, a production server under test, screenshot baselines, and a CI job for the Manager and Owner v3 screens.

## Recommendations

1. **Turn `scripts/ui-checks/checks.mjs` into a `@playwright/test` project (`tests/ui/`) and run it against a production build, not `next dev`.**
   *Why:* The preview runs `next dev` (`scripts/ui-checks/owned-preview-app-dev.mts:197`, `NODE_ENV: 'development'` at :182). Under the matrix it falls over. `checks-full.log` passed 69/224 and `checks-lite.log` 167/336, and a large share of the failures are load failures rather than UI failures: `page.goto: Timeout 30000ms`, `500`, and `canceling statement due to statement timeout` on `/app/exchange?tab=coverage` and `/app/availability`. One run ended in a crash (`page.addScriptTag … reading 'appendChild'`) and no results file was written. The README's rule "one checks.mjs per preview" works around this, but it doesn't fix it. CI already starts an owned Next app with Postgres (`scripts/phase-e-browser-qa.mjs:89-103`, which also refuses external requests), so reuse that harness in `next start` mode with the `validate` job's build. A Playwright test runner adds retries with traces, sharding, HTML reports, `toHaveScreenshot` and project-per-device configuration that the current script loops rebuild by hand.
   *Impact:* High · *Effort:* M · *Owner:* UI (spec code), Backend (owned-Next prod-mode switch)

2. **Make the data and the clock deterministic: one versioned fixture seed plus a frozen "now" on both the server and the client.**
   *Why:* `seed-extra.mts` uses `businessDate(new Date(), zone)` for dates. Route lists hard-code the week and IDs: `tools/pages.json` has `week=2026-10-19` and `audit-shift-0-1`. The cloud run needed extra fixtures added by hand: a future shift per payroll account, otherwise Swap and Unable to work redirect, plus the update ordering and copy receipts (`cloud-run.mjs`, the text in the `publish()` header). The app reads the clock in 19 `.tsx` and 23 `src/lib` call sites (`new Date()`/`Date.now()`). Playwright's `page.clock` only freezes the browser, while RSC pages render dates on the server. Without a server-side `NEVORA_TEST_NOW` (honoured only in owned test mode on loopback), every screenshot baseline changes daily. Fold seed-extra and the cloud supplemental fixtures into `tests/ui/fixtures/seed.mts` with named scenarios: `base`, `empty` (a workspace with no people or shifts), `large` (the existing `--large`), and `decided` (approved, declined and withdrawn requests).
   *Impact:* High · *Effort:* M · *Owner:* Backend (server clock and seed API), UI (fixtures)

3. **Add screenshot baselines in two tiers, generated only inside the pinned Playwright Linux image.**
   *Why:* Visual approval today is `signoff.mjs`/`sbs.mjs` montages that Jose reads by eye, with nothing to compare against next time. Tier 1 runs on every PR, about 60 shots. It covers the v3 Manager and Owner pages (Home, Inbox, request review, Schedule, Team, Timecards, Payroll, Updates, Settings) and Employee Home, My time and Requests, at 390×844 and 1440×900 with viewport-height captures, not full pages. It also takes component-level shots of `/ui-preview/kit`, which is a fixed, database-free page and the cheapest regression net for the shared kit. Settings: `animations: 'disabled'`, `reducedMotion: 'reduce'`, `caret: 'hide'`, mask relative times and avatars, `maxDiffPixelRatio ≈ 0.002`. The design calls for the system font, so Linux CI renders with fallback fonts. Treat baselines as regression references only, generate them in `mcr.microsoft.com/playwright:v1.62.1-noble` (including on a Mac via Docker), and keep design sign-off on macOS and real devices. The current 54 full-page review shots total 6.4 MB. Keep tier 1 in git and move tier 2 (nightly, all 50 routes) to an artifact store or LFS. A baseline update counts as Jose's design approval and needs a reviewer on the PR.
   *Impact:* High · *Effort:* M · *Owner:* UI; Product (Jose approves baseline changes)

4. **Choose viewports from the real breakpoints, and split the matrix into a PR gate and a nightly run instead of running every combination.**
   *Why:* The `checks.mjs` defaults are 8 widths × 4 text sizes × engines × accounts × routes. Across 50 `page.tsx` routes and 3 or 4 roles that comes to thousands of page loads, which is not workable on every push. The defaults also miss the breakpoints the CSS actually uses. The real boundaries are `max-width:760px`/`min-width:761px` (323 rules), `max-width:900px` (147), `1023/1024`, `1100`, `359/360` and `600`, and recent commits fix ranges at 761–1023 and 768–1299/1300. The 760/761, 900/901, 1100 and 1299/1300 edges are never tested.
   - PR gate: 390 and 1440 at 100% in Chromium, plus 390 in WebKit and 390 at 200% in Chromium.
   - Nightly: 320, 360, 430, 760, 761, 844×390, 900, 901, 1024, 1100, 1299, 1300 and 1440. Text at 100 and 200%, with 125 and 150% at 390 only. Both engines.
   - Keep the route × role list in one manifest (`tests/ui/routes.ts`). Today there are five drifting copies: `tools/routes-m.txt`, `tools/pages.json`, the list in `sweep.mjs`, `pages()` in `.claude/parallel/scripts/p2-checks.mjs`, and the cloud `route-inventory.json`.
   *Impact:* High · *Effort:* S · *Owner:* UI

5. **Fix four measurement flaws before they become permanent in the suite.**
   *Why:*
   - (a) `checks.mjs:50` applies text size after hydration (`document.documentElement.style.fontSize` 2.5 s after load), and `:77` gates CLS only at 100%. As a result, layout shift is never measured at large text. Inject a `<style>html{font-size:N%}</style>` through `addInitScript` instead: React 19 skips unexpected `<head>` nodes, and the hydration mismatch came from the `style` attribute. Then gate CLS at every text size.
   - (b) CLS is measured only on hard loads. The App Router has 44 `loading.tsx` skeletons that swap during client navigation, which `h8/run.mjs` measured once in an ad hoc "route" mode. Add a soft-navigation CLS check that clicks a tab or sidebar link, then measures.
   - (c) `tools/contrast.mjs` parses only `rgb()`/`rgba()`. Chromium reports the 24 `color-mix(...)` backgrounds (for example `globals.css:5000, 5004, 5093`, `typeface-theme.css:119`) as `color(srgb …)`, so the script silently skips them and measures against the wrong parent background. Use axe `color-contrast` plus a parser that handles `color()`, and add 3:1 checks for focus rings and selected states.
   - (d) `--axe` loads `node_modules/axe-core`, which is only a transitive `^4.10.0` dependency (`package-lock.json:3857`). Load the pinned 4.11.0 from `tools/ci-browser-runtime` instead.
   *Impact:* High · *Effort:* S · *Owner:* UI

6. **Write about 10 role journeys with web-first locators. Write paths run on a throwaway database per worker.**
   *Why:* The CI browser suites predate v3 and barely touch Manager and Owner: the calendar scenarios have 0 Manager/Owner mentions and attention has 1. Navigation scenarios use 19 class selectors (`.mobile-nav`, `.section-tabs`, `.employee-more-link`), which break whenever the markup changes. The flows that matter were checked once by hand with `swapflow.mjs`, `submit.mjs`, `calloutsend.mjs`, `delhold.mjs` and `notifoff.mjs`. Suggested journeys:
   - J1 Manager approves time off from Inbox, and the Home count drops to match. This is the "F1" check in `p2-checks.mjs`.
   - J2 Manager adds, edits and publishes a shift.
   - J3 Manager composes, previews the audience for, publishes and withdraws an Update.
   - J4 Owner reviews payroll and exports it (assert the file name and columns, not the bytes).
   - J5 Employee requests time off, then withdraws it.
   - J6 Employee swap and call-out.
   - J7 Lead opens My pay statements.
   - J8 Clocker PIN punch in and out.
   - J9 Sign in, forgot access, and sign out.
   - J10 Role gates: Employee to `/app/payroll` and Manager to Owner-only settings must redirect or deny.

   Use `getByRole`/`getByLabel`, and add `data-testid` only where no accessible name exists. Clone the database per worker from a Postgres template so tests stay independent and can run in parallel.
   *Impact:* High · *Effort:* L · *Owner:* UI (specs), Backend (template-DB fixture)

7. **Add loading, error and empty states that run without manual setup, using a test-only fault switch on the server.**
   *Why:* `tools/states.mjs` and `h8/run.mjs` fake errors with `page.route('**/api/**')`, which can't reach data fetched in Server Components. The recorded memory note on RSC abort and the review rule on what isn't proven both point to the same gap. With 10 `error.tsx` boundaries and server-rendered pages, the "Inbox must not claim zero work from a failed read" rule in `DEVICE-CHECKLIST.md` can't be tested from the browser alone. Add a loopback-only, test-mode-only fault switch in the owned preview's db adapter (for example a cookie such as `nv-test-fault=inbox:503`). Cover loading (a delayed skeleton screenshot), error (retry visible, no success copy), empty (the `empty` seed) and stale/offline (`context.setOffline`). Assert copy and focus as well as appearance.
   *Impact:* Medium · *Effort:* M · *Owner:* Backend (switch), UI (specs)

8. **Add a `ui-e2e` CI job, sharded, with reports on failure and a nightly schedule.**
   *Why:* `ci.yml` has no job for the v3 Manager and Owner UI. Its push triggers (`ci.yml:5`) don't include `claude/**`, so `claude/clean-manager` is checked only when a PR to `main` or `development` opens. Copy the `phase-e-ui` job's steps (pinned runtime, `install --with-deps chromium webkit`, Postgres 16). Shard 4 ways, run `retries: 1` with `trace: 'on-first-retry'`, upload the HTML report, diff PNGs and traces only on failure, and keep the PR gate at 12 minutes or less. Add `on: schedule` nightly for the full matrix from recommendation 4 and the tier-2 baselines. Mark flaky tests with `@quarantine` and track them in an issue; never let a timeout count as a pass. Later, extend the existing SHA-bound `report.json` check to this job's results.
   *Impact:* High · *Effort:* M · *Owner:* Backend (workflow ownership), UI (specs)

9. **Move off the ad hoc scripts in one planned pass, then delete them.**
   *Why:* The scripts can't be reproduced. They hard-code ports (`51204`, `59682`), the `npx` cache import path and absolute scratchpad paths. `.claude/parallel/` is fully gitignored (`.gitignore` = `*`) and holds `p2-checks.mjs` and `login.mjs` copies that have drifted from `scripts/ui-checks/`. `cloud-run.mjs:14` hard-codes seven branch names and October 19 report text. Mapping:
   - `checks.mjs`, `sweep.mjs`, `overflow.mjs`, `titles.mjs`, `tabs.mjs` and `large.mjs` become `layout.spec` (overflow, one h1, text floor, targets).
   - `cls*.mjs`, `skel*.mjs` and `h8/run.mjs` become `cls.spec`, covering hard and soft navigation.
   - `contrast.mjs`, `hit.mjs` and `fmd/hit.mjs` become `a11y.spec` (axe plus the fixed contrast parser).
   - `fmd/kb.mjs`, `ring.mjs`, `rings.mjs` and `fmp/focus.mjs` become `keyboard.spec` (tab order, visible focus, and focus not hidden under the sticky header or tab bar, WCAG 2.4.11).
   - `states*.mjs` becomes `states.spec`.
   - The flow scripts become the journeys in recommendation 6.
   - `signoff.mjs`, `sbs.mjs`, `shoot.mjs`, `fullshot.mjs` and `fmp/montage.mjs` become baselines.
   - Delete the one-off probes (`probe*.mjs`, `find-text`, `dbg`, `emp-b-probe*`).

   Order: harness, fixtures and recommendation 5 first. Then tier-1 baselines, journeys J1–J5, and the CI job. Clear `.claude/parallel` and the 16 GB of `/tmp` evidence once the suite is green twice.
   *Impact:* Medium · *Effort:* M · *Owner:* UI

10. **Keep a small manual device layer and test motion and dark mode on purpose.**
    *Why:* Linux WebKit is not iOS Safari, and the system-font design looks different there. Real VoiceOver and TalkBack checks in `DEVICE-CHECKLIST.md` are still "pending". Move that checklist into the repo as a release gate, with a results table per candidate SHA. GSAP is used in 17 files and there are 76 `prefers-reduced-motion` rules. Add a reduced-motion spec that asserts no GSAP tweens are active (`gsap.globalTimeline.getChildren().length === 0` after settle) and that the screenshot matches the static baseline. The CSS has 0 `prefers-color-scheme` rules, so add a nightly `colorScheme: 'dark'` and `forcedColors: 'active'` smoke that checks legibility and focus visibility, not appearance. The checklist already accepts "the app may stay light".
    *Impact:* Medium · *Effort:* S · *Owner:* UI; Product (Jose runs the device pass)

## What's good

- `scripts/ui-checks/checks.mjs` is a sound core. It is read-only, takes the engine as a parameter, resolves Playwright from `PLAYWRIGHT_RUNTIME_ROOT`, uses sensible floors (44 px touch, 24 px pointer, CLS ≤ 0.01) and writes JSON results.
- CI already has the hard parts: Playwright 1.62.1 and axe 4.11.0 pinned in `tools/ci-browser-runtime`, Chromium and WebKit, owned Postgres, blocking of external requests, and SHA-bound evidence checks.
- `seed-extra.mts` checks the cluster owner marker before writing, and `/ui-preview/kit` and `/ui-preview/home` are database-free pages that are ideal for component baselines.

## Not checked / limits

- No browser was used (per brief). I did not run any suite, measure run time, or confirm that the existing Phase D and E browser gates still pass against v3 markup.
- I did not inspect Linux font rendering differences or verify that a `<style>` injected at init avoids hydration warnings in this exact React 19.3 build. Both need a short spike.
- Coordinator `qa-out` was sampled (`fmd/`, `fmp/`, `DEVICE-CHECKLIST.md`), not read file by file. The script and PNG counts come from `find`.
- The run-time estimates and the 12-minute PR budget are planning targets, not measurements.
