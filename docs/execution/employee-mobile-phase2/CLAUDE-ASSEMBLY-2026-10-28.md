# Employee mobile Phase 2 — assembly, verification and polish (Claude, October 28)

## Where this work is

- **Assembled revision:** detached worktree `.claude/worktrees/emp-p2-assembly`.
  - Base: `4a68e5c8` (Claude Phase 2 continuation head).
  - Merged with `claude-codex-collab-nevora` at `0f375dd7` (development `682ecea9` + Clocker + PR36 + refined mobile Access).
  - The merge commit is `99e1dbe5`; later commits are listed below.
- **Not pushed.** Jose's October 28 policy allows only `development`, `main` and `claude-codex-collab-nevora`, and asks for detached worktrees for isolation.
  - `claude/employee-mobile-phase2-20261027` was pushed after that policy, so it is a fourth remote head. Deleting it, or publishing this assembly to the collaboration branch, is Jose's call.
  - The local branches `claude/employee-mobile-phase2-20261027` and `claude/pr34-reconcile-20261027` predate the policy; leave them as they are, or archive them, per Jose.
- **Environment:** macOS, Node 24.19, Next 16.4.2 dev (Turbopack) and PostgreSQL 17.10 owned loopback clusters, Playwright 1.62 with Chromium 1243, Firefox 1543 and WebKit 2359. All data is fictional.
- **Preview harness:** scratch only, never committed. It seeds Isla Verde Cafés with current-week published shifts, punches and requests, plus the Pay browser test's publication rows.

## Assembly merge (`99e1dbe5`)

5 conflicts in 252 changed paths, each resolved as a union of the two owners' work:

- `theme.test.ts`: both test groups are kept. One Phase 2 assertion ("System clears the key") now expects `system`, the rule PR36 changed.
- `employee-home-quiet.tsx`: the mobile "Today" title plus PR35's `{intro}`.
- `owned-next-app.ts`, `payroll-postgres.mjs`: union of options and configs.
- `.21st/design.json`: both decision lists.

## Commits after the merge (each reproduced first, then verified)

| Commit | What | Evidence |
|---|---|---|
| `79ff84d1`, `b1dbedcc` | HARN-1: git file listing via a 64 MiB buffer helper (the repo listing is 1.2 MB; ENOBUFS reproduced), plus the type declaration. | The test builds a >1 MiB repo, proves the default buffer throws ENOBUFS, and proves the helper returns all 9,000 files. |
| `6a7a60b6` | Notifications: cancelled (superseded) notices were counted as "couldn't be checked". Any republished schedule showed "Nothing confirmed on this page". | Preview: coverage was `partial` with `items: []` for 6 notices, 3 of them cancelled. The new PostgreSQL case is RED (`partial`) then GREEN; Communications SQL 9/9. |
| `926439c9` | Large phones in landscape (915×412, 932×430, 956×440) got neither mobile nor desktop Employee styling, a broken hybrid. The phone condition is now `(max-height: 500px) and (orientation: landscape) and (pointer: coarse)`, an exact complement of the desktop exclusion. Employee-scoped files only. | Re-probed at 667×375, 844×390, 915×412, 932×430 and 956×440: phone layout, nav clearance, no sideways scroll. |
| `17204d78` | H-1: an expiry during an in-flight renewal said "Your access changed. Sign in again" and stopped polling. The six Phase 2 readers now use the established `() => 'read_failed'` override. | Browser RED: 14.7 s read plus 8 s slow renewal gives the sign-in message from 15 s on. GREEN: "couldn't be checked", then automatic recovery. A genuine 401 still shows sign-in. |
| `57405252` | M-4: withdraw, decline and cancel confirmations vanished on refresh and focus fell to `<body>`. | Browser RED, then GREEN in Chromium, WebKit and Firefox. The component test fails on the old view. |
| `7ab3b7bb` | Polish: Pay/Hours header and canvas, Hours back link, one status vocabulary, secondary-button token, select/textarea focus, Dark Off-clock chip, Puerto Rico time label, caret icon, paused copy, receipt locale. | Viewport captures in Light and Dark; Employee mobile unit tests 97/97. |

## Investigations (read-only agents; reports in `evidence/claude-assembly-2026-10-28/`)

- **Process-observation tests (item 5).** The mechanism is identified. `scripts/phase-e-owned.mjs` misreads a normal child exit that lands between two back-to-back `ps` reads, and load widens the window 10–30×. Fixes and deterministic boundary-fixture tests are specified there, but **not implemented**.
- **QA-CAL-1 (item 6).** About 65% an observation artifact: dev StrictMode fetches, aborts and refetches, and Playwright Firefox (Juggler) can drop terminal events for a request cancelled during `route.continue()`. The server log shows one real Calendar GET. The decisive Firefox experiment and a monitor fix that keeps its strength are specified, but **not run**.
- **Landscape audit (item 7).** No cited passing claim relied on a full-page Chromium capture except the Passkeys QA supplement's two legacy-role images. Eight batches never exercised coarse landscape. The 932×430 hybrid it suspected was reproduced and fixed (`926439c9`). Helpers that still capture full-page are listed.
- **Code inspection (20 findings, no authorization gaps).**
  - Fixed: H-1, M-1 through M-4, M-6, M-7, L-3, L-4, L-6, L-7 and L-9.
  - Dismissed with evidence: L-13 (Employee ID shows `AR0142`, not a UUID).
  - Open: M-5 (Updates compose eligibility shown only after the form is filled; needs a server read or Jose's wording), L-1, L-2, L-5, L-8, L-10, L-11 and L-12.

## Checks on the final head

Application head is `7ab3b7bb`. Test and harness-only commits follow:

- `4cf0da4b`, `040246fe`: Phase 1 driver selectors.
- `dafce221`: runner prefix for Pay and Deletion.
- `4dfc2806`: Pay and Deletion start as the explicit System choice under PR36.

Results (`evidence/claude-assembly-2026-10-28/final-run-summary.txt`):

- **Default suite at `7ab3b7bb`:** 10,147 passed, 7 failed, 801 skipped, 92 s.
  - All 7 failures are `phase-e-runner.test.ts` "workflow contract rejects …".
  - They reproduce on clean `claude-codex-collab-nevora` `0f375dd7`. The Clocker SQL allocation lists 35 of 42 files; the 7 new Clocker photo/PIN/review suites are unallocated. Owner: Clocker/collab.
  - The three process-observation tests passed in these runs. Their mechanism is still unfixed.
- **Browser journeys (owned PostgreSQL plus owned Next, fictional data, the test's own engines):**
  - Passed: Requests, Responses, Planning, Hours and Communications at `7ab3b7bb`; Pay and Deletion after the runner and System-choice commits.
  - Phase 1 **fails** in WebKit. It found two stale drivers, both fixed here: the `.employee-calendar-state` selector and the unscoped desktop Schedule locators. It then stops at line 88, where `.q-home` resolves to 2 elements after a 390→1440 resize in WebKit.
  - That remaining failure is **pre-existing**: it reproduces on the untouched `4a68e5c8` with only the selector fix. It is open. Either a hidden retained route copy (driver scoping) or WebKit genuinely mounting Home twice (a duplicate private read). Investigate before scoping the locator.
- `tsc --noEmit` is clean. ESLint is clean on changed files.

## Not done here (exact next steps)

1. Implement the specified process-observation fixes, RED first with the boundary fixtures, then a load replay.
2. Run the QA-CAL-1 Firefox experiment, then the monitor change if confirmed.
3. Fix the full-page capture helpers listed in the landscape audit, then replay landscape for the eight unexercised batches with the device-alerts pattern (coarse media asserted, tokens, contrast, 44px targets, nav clearance), at 667×375, 844×390 and 932×430.
4. Open Low findings, and M-5.
5. Reviewer closure, owned by the original authors: Deletion, Pay, QA-OWN-3 and Communications, plus independent review of every commit above.
6. Jose decisions: the three from `REMAINING-WORK.md`, plus publishing this assembly and the stray fourth branch.
7. Phase 3 has not started. Physical devices, assistive technology, hosted builds and release remain separate gates.
