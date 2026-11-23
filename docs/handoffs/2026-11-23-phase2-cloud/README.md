# Phase 2 cloud sessions (Nov 23, 2026)

Jose approved six extra cloud sessions to finish NEVORA's Phase 2 screen work in about 5 hours at the same quality. The
lead session merges every session's work into `claude-codex-collab-nevora`. Each session owns one package and one work
branch.

## 2-hour target (Jose, Nov 23, 11:45 UTC): the whole app done by about 14:00 UTC
- There is no later end sweep for your pages. Fix the end-sweep items from `faster-plan.md` (screen-reader names that
  differ from visible text, focus rings, targets under 44px, axe findings, contrast, fixed px text) on your own pages
  now, along with the blocking items. Kit or app-shell fixes still go in your report.
- Capture AFTER only. Push code as you finish each page, so the lead can merge early; push the shots commit last.
- Settings pages build on the shared parts on branch `claude-codex-collab-nevora-settings-base`
  (`src/app/app/settings/settings-b*.tsx`, `settings-b.css`). Additive changes only; say so in the report.

## Late packages (lead, Nov 23, 14:20 UTC): rest of the app
Jose's standing instruction for Phase 2 is the full app, not only the first 12 packages ("not the 12 package the full
app"), and to keep starting new work as each part finishes ("if we have finish something continue creating sessions for
new work"). These packages carry that out. Each session merges `origin/claude-codex-collab-nevora` (9596f934 or later)
into its own branch first, pushes only to its own branch, and follows the Rules below. That includes the earlier
"don't capture" lines in briefs, which these packages replace for the pages listed.

| Package | Session branch | Pages |
|---|---|---|
| R: recapture held rows | `claude-codex-collab-nevora-core` | B1-O, B1-M, B2-Ml, B4-O-M, B9-O, B9-M, F9 (O, M), E1-M, J17 |
| X | `claude-codex-collab-nevora-settings-final` | F3 Import a staff list (O, M, Mℓ) to Direction B; I1-Ml Profile matched to I1-O/M |
| M | `claude-codex-collab-nevora-staff` | C12 Shift changes (O, M) to Direction B; C10 Availability (O) checked against C10-M |
| Z2: phone and keyboard sweep | `claude-codex-collab-nevora-batch-public` | Every Jose-approved row: 320px, keyboard and focus order, reduced motion; fix defects only |
| Z3: forced colours and language leaks | `claude-codex-collab-nevora-staff` (sections A–E), `claude-codex-collab-nevora-timecards-final` (F onward) | Every Jose-approved row: forced-colors active (A4-05) and Spanish inside English chrome (A4-07); fix defects only |
| K3 | `claude-codex-collab-nevora-clocker-states` | K3 Enter Employee ID (EN, ES) |
| Z: regression sweep | `claude-codex-collab-nevora-sweep-1` | Every Jose-approved row: axe, 390 at 200% text, 1440; fix regressions only |

Package P (billing pages A15–A19) is withdrawn: Jose set the sign-up and billing portal pages aside (gaps ledger G23,
"focus just on nevora"). Don't change or capture them. (The public-pages session had already finished it before the withdrawal reached it; its commits b2a233d2 and 03b2c198 stay on its branch, unmerged, until Jose decides.)

## Gap closure (Jose, Nov 23, 16:08 UTC): everything except the native app
Jose's words: "lets do all of them except anything regarding native application since that will be later, everything
else we do it now and approved to do it all, make sure we make multiple sessions we want to do this fast and also make
sure quality is never compromised". This approves the items below, including the server change in G17, rebuilding the
guides (G44), restoring the billing pages (package P), and the release once QA is green. Native app work is out.
Same rules as above: merge the shared tip first, push only to your own branch, fictional data, tests and the whole
src/components suite before every push, approved wording unchanged unless Jose decided otherwise.

| Item | Session branch | Work |
|---|---|---|
| G44 guides | `claude-codex-collab-nevora-screens-final` | Rebuild the guides with scripts/manuals/build-manuals.mjs so manual-publication passes |
| F3 live import | `claude-codex-collab-nevora-settings-final` | Run and capture the live import through the isolated-workspace lifecycle harness |
| G17 | `claude-codex-collab-nevora-staff` | A location Manager can open a person at their own locations (server and UI, scoped) |
| G98 and signed-in language | `claude-codex-collab-nevora-payroll-2` | Pages with Spanish copy follow the person's language; inventory the rest of the shell |
| Package P, J18 | `claude-codex-collab-nevora-batch-public` | Restore A15–A19 (revert the reverts) and check J18 with billing configured (mocked) |
| Flaky tests | `claude-codex-collab-nevora-sweep-1` | managed-runtime under load; shift-concurrency WebKit page errors; no skips |
| Clocker and motion | `claude-codex-collab-nevora-clocker-states` | K13 sweep, the offline fallback page, reduced motion at 390 and 1440 |
| Production re-verify | new session `claude-codex-collab-nevora-prodcheck` | Re-check on a production build everything verified only on a development build |
| QA | `claude-codex-collab-nevora-qa` | WebKit re-run of the scoped read frame fix, then the final production-build QA |

## Read first
1. `CLAUDE.md`, `DESIGN.MD`, `.claude/skills/nevora-design-os/SKILL.md` (with its references; the page done gate is at
   the end), `docs/design/voice.md`, `docs/design/component-picks.md`.
2. `agent-brief.md` in this folder: the rules from Jose's reviews (Direction B for real, title band, wording).
3. `faster-plan.md` in this folder: what to fix now vs at the end, and the lighter proof. It wins where the two differ.
4. `docs/product/page-inventory.md` for your pages, and `docs/product/gaps-ledger.md` for open rows on them.

## Set up (fresh container)
- `npm ci` (or `npm install` if `ci` fails on the lockfile), then `npx --no-install tsc --noEmit -p .` once.
- Screenshots: `tools/ui-scan/README.md` (`desk.sh`, Postgres 16 at `/usr/lib/postgresql/16/bin`, Chromium preinstalled,
  `SCAN_USER=postgres`). Location Manager captures: unpack `tools/ui-scan/zz-scan-scoped.tar.gz` to a scratch folder,
  set `SRC` to it and use `run-scoped.sh` in this folder. Production build: `NEVORA_OWNED_APP_PRODUCTION=1`.
- Tenancy tests need commit `7c628e374f03c9025b2c0cfd3568be033f07238d`:
  `git fetch --depth=1 --no-tags origin 7c628e374f03c9025b2c0cfd3568be033f07238d`.

## Rules
- Fictional data and a throwaway local database only. No real email, SMS, push, payments or AI provider calls. No
  deploys, publishing or paid generation.
- Same server reads, permissions, form actions and data contracts. Approved payroll, tax and legal wording stays word
  for word.
- Stay inside your package's files. Shared kit files (`src/components/owner-b/b-kit.tsx`, `src/components/corp/*`,
  the app shell) are read-only for you; if you need a change there, write it in your report.
- One time format: `7:00 AM – 3:00 PM`.
- Branch: start from `origin/claude-codex-collab-nevora`, work and push ONLY on your package branch
  `claude-codex-collab-nevora-<package>`. Don't push anywhere else, don't open pull requests.
- Commit messages end with the two lines in `agent-brief.md`. No model names anywhere else.
- Captures: put the webp captures you report (`<row>-<role>-<390|768|1440>.webp`, quality 80) in
  `docs/handoffs/2026-11-23-phase2-cloud/shots/<package>/` in ONE separate final commit, so the lead can review them
  and merge only the code.

## Report (final message, also as `docs/handoffs/2026-11-23-phase2-cloud/reports/<package>.md` in the shots commit)
Commits; per page: what changed, before/after words, button styles, overflow and alignment at each width; the
Impeccable audit; blocking items left and why; end-sweep items as proposed ledger rows.

## Packages
| Package | Branch suffix | Pages | Kind |
|---|---|---|---|
| Settings part 2 | `settings-2` | J13 Clocker devices, J14 schedule matching, J15 photos, J16 photo review, J17 PINs, J18 Billing | Redesign (older look) |
| Messages | `messages` | B3 Notifications (Manager), B6 Updates, B7 Update detail, B8 Compose (Owner and Manager) | Redesign (mixed) |
| Schedule tools | `schedule-tools` | C7 Templates, C9 Scheduling rules, C10 Availability (manager side), C12 Shift changes (manager side) | Redesign (mixed) |
| Requests and account | `requests-account` | E1 Time off (manager side), F4 Person, F9 Help someone sign in, I1 manager Profile, I6 Delete my account | Redesign (mixed) |
| Public pages | `batch-public` | A1–A14 signed out and public, English and Spanish | Capture and gate check |
| Navigation and schedule | `batch-nav` | B2, B4, B5, B9, B10, B11; C5, C6, C11, C13, C14, C15 | Capture and gate check |
| Time and Team details | `batch-time-team` | D2 Time corrections, D3 Fix someone's time, D4 My time, D5 Clocker recovery; F2 Add person, F3 Import, F5 Pay rate, F6 Restrictions, F7 Time off balance, F8 Clocker PIN | Capture and gate check |
| Clocker and phone app | `batch-clocker` | K1–K15 Clocker tablet flow and states (production build over the owned https origin, see `tools/ui-scan/README.md`), L1 phone app Alerts | Capture and gate check |
| Accessibility sweep 1 | `sweep-1` | Payroll G1–G10, Rondo H1–H6, Profile I2–I5 | End sweep |
| Integration QA | `qa` | The shared branch as packages merge | Regression check |

**Redesign** packages move the page onto real Direction B (match Team `team-b.tsx`, Home `home-b.tsx` and the company
Schedule: band, cards, rows, fields, buttons) for every role that opens it.

**Capture and gate check** packages don't redesign: one production build, capture every role each page opens for at
390, 768 and 1440, gate-check each screen (repeated wording, left and right edges, button styles and heights, overlap
or cut-off text, older-look parts, time format). Fix blocking problems that sit inside the page's own files; list the
rest. Also write `shots/<package>/rows.json`: an array of
`{"id","row","page","section","note","shots":[{"label":"Phone","after":"img/x-390.webp"},{"label":"Tablet","after":"img/x-768.webp"},{"label":"Desktop","after":"img/x-1440.webp","desk":true}],"blocking":[],"endSweep":[]}`
with one entry per page per role group, `note` in one or two plain sentences for Jose.

**End sweep** packages fix the items `faster-plan.md` defers: screen-reader names that differ from visible text, focus
rings, targets under 44px, axe findings, contrast and fixed px text sizes. Every width (320, 390, 390 with 200% text,
768, 1440), axe before and after, no visible change except rings and target sizes.

**Integration QA** doesn't change app code: every 30 minutes, fetch `claude-codex-collab-nevora`; when it moved, run
typecheck, oxlint, the full unit suite (`node scripts/run-rstest.mjs`), and the readiness browser tests
(`readiness-ui-browser`, `readiness-shift-concurrency-browser`) on a production build in Chromium and WebKit. Write
each run to `docs/handoffs/2026-11-23-phase2-cloud/qa/<time>.md` on your branch: new failures, the commit that
introduced each, and the likely cause. Run until about 17:30 UTC.

Already being handled elsewhere (don't touch): Settings J1–J12; Home, Team directory and Who's working; Timecards and
the Clocker; the kit and app shell; Employee Home and Schedule, the day view and the shift sheet; Find cover and Review
replacement; Payroll, Rondo and Profile I2–I5 captures.
