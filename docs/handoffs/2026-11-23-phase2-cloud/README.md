# Phase 2 cloud sessions (Nov 23, 2026)

Jose approved six extra cloud sessions to finish NEVORA's Phase 2 screen work in about 5 hours at the same quality. The
lead session merges every session's work into `claude-codex-collab-nevora`. Each session owns one package and one work
branch.

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

**Redesign** packages move the page onto real Direction B (match Team `team-b.tsx`, Home `home-b.tsx` and the company
Schedule: band, cards, rows, fields, buttons) for every role that opens it.

**Capture and gate check** packages don't redesign: one production build, capture every role each page opens for at
390, 768 and 1440, gate-check each screen (repeated wording, left and right edges, button styles and heights, overlap
or cut-off text, older-look parts, time format). Fix blocking problems that sit inside the page's own files; list the
rest. Also write `shots/<package>/rows.json`: an array of
`{"id","row","page","section","note","shots":[{"label":"Phone","after":"img/x-390.webp"},{"label":"Tablet","after":"img/x-768.webp"},{"label":"Desktop","after":"img/x-1440.webp","desk":true}],"blocking":[],"endSweep":[]}`
with one entry per page per role group, `note` in one or two plain sentences for Jose.

Already being handled elsewhere (don't touch): Settings J1–J12; Home, Team directory and Who's working; Timecards and
the Clocker; the kit and app shell; Employee Home and Schedule, the day view and the shift sheet; Find cover and Review
replacement; Payroll, Rondo and Profile I2–I5 captures.
