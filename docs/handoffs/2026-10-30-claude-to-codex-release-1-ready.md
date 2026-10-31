# Claude → Codex: NEVORA Release 1 is ready for inspection, then deploy

Date: 2026-10-30, corrected 2026-10-31 after the independent inspection (Phase 8). Branch: `claude-codex-collab-nevora`.

**Release SHA: frozen and written here when the final candidate is handed over** (§4 is re-run on that exact commit; any later commit makes a new candidate). Inspection fixes are in progress; until this line names a full SHA, nothing here is ready to deploy.

**Deploy from that SHA only. Do not deploy from `development`:** since Oct 30 it also carries Codex's Owner AI work (migrations `0044_owner_advisor_notebook`, `0045_owner_coverage_actions`), which is not in Release 1. Git deployment is disabled (`vercel.json`); use the explicit Vercel deployment workflow from the frozen SHA (runbook §7). Whether collab is first merged to `main` is Jose's call; the deployed artifact must be built from the frozen SHA either way.

This hands Release 1 back for the last steps: independent inspection (8), Jose's device test (9), and your migration and deploy (10). Nothing here authorizes a production migration or deploy. Those wait for the inspection, Jose's device test and Jose's explicit go.

## 1. What Release 1 now contains (Claude's part, 9fe89683 onward)

**Corporate design (Jose, Oct 26), every Owner and Employee page.**
- Owner: Home, Things to do, Schedule (with Build and publish), Team, Person, Timecards, Payroll, Who's working, Insights, More, Settings pages and the Clocker devices section are on the corporate kit (`src/components/corp`). Desktop has the white sidebar shell.
- Employee: the corporate shell with the board tabs Home, Schedule, Time, Pay and Requests. More opens from the header avatar.
  - Home, More, Schedule (shift sheet, Open shifts) and Time are on the kit.
  - Pay, Requests, time off, Availability, timecards and corrections, Notifications, Updates, Profile and Delete account use the corporate bridge `src/app/app/corp-employee-bridge.css`. It remaps the `--em-*` tokens and shapes; the components are unchanged.
- A Lead keeps the v5 look (Lead is on hold, per Jose).
- Light only in Release 1.
- Clock-in stays tablet-only. Where a board shows a phone Clock in button, the app says "Clock in on the [location] tablet".

**Behaviour changes Jose approved:**
1. **Publish changes** (5f234911, needs migration 0043).
   - Manual edits to a published week are held with a per-edit history row.
   - The Schedule pill reads "Published · N changes", and Build and publish offers Publish changes.
   - An approved swap or callout publishes and notifies only itself.
2. **Payroll workweek** (5db8bfdf): week N can be paid without waiting for next Monday's card (00:01 workweek closing context).
3. **Overnight rule** (4fd3f426, Jose Oct 25, confirmed Oct 30).
   - A recorded entry counts wholly on the civil day it starts.
   - Daily overtime is time over 8 h in that day, and each minute counts once.
   - Midnight no longer blocks payroll (`DAILY_BOUNDARY_SENSITIVE` is gone from new runs).
   - Weekly / FLSA overtime and pay-period cuts still split at the exact instant.
   - Saved runs keep their stored evidence and old policy record and still verify.
   - `NATIVE_CALCULATOR_VERSION` is now `NEVORA_NATIVE_WAGE_V11_SHIFT_START_DAY`. **A draft prepared before this release reads as `NATIVE_REVIEW_STALE` and must be recalculated before approval.** Jose still wants PR labor counsel to confirm the 24-hour workday reading.
4. **Company updates held** (d67d652f, 08728bc5, 169e94e1).
   - While D04's live activation is held (`communicationDevelopmentGuard`), the app reads the updates module as off on any database but an owned local test database.
   - Home, More and the menus leave it out. Settings → Features shows "Coming in a later release", and the direct address explains the same.
   - The notification list's SELECT allowlist uses the same builder (`activePresentationSql`).
   - **No deploy setting.** Opening D04 later needs its own review; the Owner's switch then decides again.
5. **Clocker tablet**: `NEVORA_CLOCKER_UI_V2=true` for Release 1 (approved iPad look, corporate colours, system type). Punch enablement stays separately authorized.

## 2. Migrations

- **Release 1 is the first production release of this line.** Production's applied set is not verified: the last records (Oct 20 runbook, Oct 21 report) put it at about `0002`–`0004`, with no migration ledger. Reconcile the live schema against `db/migrations/order.ts` first (runbook §4), by **object presence, not filename prefix** (prefixes repeat, and other lines have used `0043`/`0044` for different files: check `SELECT to_regclass('public.schedule_pending_edits')` for this release's 0043).
- Then apply every `BASE_MIGRATIONS` entry from the first missing one through `0043_schedule_pending_edits`, then `0031_native_payroll`, `0032_company_access_invitations`, `0042_company_invitation_lifetime`. 52 files, each listed exactly once. `0043` is the only file added since the Oct 29 manifest.
- `0032_company_access_invitations` is irreversible after COMMIT (`LEGACY_ADOPTION`, no inverse SQL) and takes `SHARE ROW EXCLUSIVE` locks on `workspaces` and `employees`.
- Three files have no transaction of their own (`0038_read_path_indexes`, `0038_clocker_pin_operation_reference`, `0039_clocker_review_requests`); `0038_read_path_indexes` builds plain indexes that block writes, including tablet punches. Runbook §5 now has the steps.
- **Migrate before deploying the app.** If the app runs before `0031_workspace_presentation`, menus briefly show Updates (posting stays blocked); without `0043`, held edits fail.
- Open gates carried from `docs/execution/release-1-2026-10-29/MIGRATIONS.md`: a hosted isolated restore rehearsal of the full chain, a verified operator ledger and schema, and a large-table lock assessment.
- **Preflight data check (read-only):** Employee Home, next shift and the calendar feed now read the latest publication capture. Every PUBLISHED schedule with `week_start` on or after the current week must have a latest `schedule_publication_revisions` capture whose rows cover its live shifts with a non-null `source_shift_id`; any gap shows that week as empty to employees until an Owner publishes it. Resolve gaps (an Owner publish) before cutover.
- Rollback: leave `0043` installed and publish held edits first (runbook "Rollback").
- The overnight rule and the Updates hold need no migration.

## 3. Environment (Production)

As the runbook table, plus the values below. No env read was added since 9fe89683; `NEVORA_CLOCKER_UI_V2` is the only new value.

| Variable | Production value |
|---|---|
| `NEVORA_CLOCKER_UI_V2` | `true` (approved iPad look) |
| `NEVORA_MOBILE_ACCESS_ENABLED`, `NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED` | unset/off (Jose, Oct 31; same as the Preview). Welcome, Access help and the Home first-day guide stay off |
| `NEVORA_PAYROLL_ENABLED` | Jose to confirm (the Preview ran with `true`) |
| `NEVORA_INVITATION_DELIVERY_ENABLED` | as its own approval says (fails closed when unset) |
| `NEVORA_OWNER_ADVISOR_ENABLED`, `_DATA_APPROVED`, `_PROVIDER`, `_MODEL`, `_DAILY_LIMIT`, `OPENAI_API_KEY`, `NEON_AI_GATEWAY_*` | unset (the development preview sets the advisor on; Release 1 does not) |
| `NEVORA_UI_PREVIEW_ENABLED` | **must be absent**: `1` exposes `/ui-preview/*` |
| `NEVORA_SHOW_DRAFT_POLICIES` | unset |
| `NEVORA_CLOCKER_PUNCH_ENABLED` | as its own authorization says (off by default) |
| `NEVORA_ENVIRONMENT`, `NEVORA_CLOCKER_PHOTO_*` | photo capture stays closed unless the environment is `staging`, so Clocker photo review is unavailable in production |
| Push, passkeys | as their own approvals say |
| Company updates | nothing to set (see 1.4) |

- **Region:** the privacy policy says servers are in Northern Virginia (`src/lib/legal/policies.ts:21`); the fictional Preview ran in us-west-2 / pdx1. Confirm the production Vercel and Neon regions match the policy, or have the policy updated first.

## 4. Evidence on the release SHA (owned local Postgres, fictional data, `DATABASE_URL` unset)

The full gate ran in one ordered pass on `d3a5c7df` (Oct 30, 13:57–15:26 AST), clean tree throughout:

| Step | Result |
|---|---|
| Typecheck, lint, audit (prod and all), advisor pilot | pass |
| Release build (`NEVORA_BUILD_RECEIPT`) | pass |
| Unit | 10,350 passed, 801 skipped |
| Migrations | 11 passed |
| Release Postgres | 745 passed (foundation 283, Phase B authority 46, generation 176, exchanges 163, notifications 77) |
| Advisor integration | 38 passed |
| Clocker shards 1–4 | 147 + 132 + 151 + 142 = 572 passed |
| Phase E startup and SQL | pass; 23 passed |
| 22 owned database integration configs | all pass (native, configurable and export payroll; timecards; punches; corrections; company setup; account recovery; action center; management profile; employee schedule; reports; Phase D corrections and remediation; six findings; passkeys; employee mobile SQL; Clocker breaks, C6, owner policy, punch, recovery) |
| Advisor browser | pass |
| Attendance UI | 48 checks |
| Phase D browser | 207 checks, 0 errors |
| Phase D remediation | pass |
| D2 corrections UI | 282 checks |
| Phase E Home, Communications, Calendar, Attention | 14 of 14 cells each |
| Clocker iPad UI; Clocker breaks UI | pass; 46 checks |

Two steps ran again outside that pass:
- **Home held-response check:** the gate script started it without CI's `NODE_ENV=test`. Run as CI runs it on `d3a5c7df`, it passed in Chromium and WebKit.
- **Phase E Navigation:** it hung at the 30-minute limit three times in the phone time-off step. The cause was the test helper `actionsSettled()`, which awaited Playwright's `response.finished()` with no limit. With the same code instrumented, every action body finished within 20 ms. `199159e9` bounds that wait at 10 s (test only). On `199159e9`, Navigation passed 14 of 14 with 0 errors.

**Browser suites brought up to the approved UI on Oct 30.** No check was deleted; checks were re-anchored where the approved design moved a function:
- **Home:** clock status → Time; the full attention list → Notifications.
- **Navigation:** More from the avatar; phone pages are the mobile ports.
- **Calendar:** the entry is More → Add shifts to your calendar.
- **Communications:** the phone messages view.
- **Phase D/D2:** Who's working `#review`, corporate timecard detail, Things to do.

**App fixes found by those suites:**
- Who's working opens its review for Inbox links (`#review`, `#attendance-…`, `#correction-…`) and keeps a loading correction in place.
- Things to do opens a waiting timecard's own period.
- The phone Insights "Hours by person" lets a long name wrap. This is the one exception to the kit's one-line rows; Jose confirmed it.
- The phone update page re-reads after a stale acknowledge is refused.
- The Profile calendar notice has 4.5:1 contrast.
- The phone Time and Requests segments have 44px tap areas.

**Hosted fictional Preview:**
- Neon `nevora-release1-preview-20261030` (us-west-2), Vercel Preview on this branch only, region pdx1.
- Signed in as the fictional Owner and an Employee. Home, Schedule, Things to do, Team, Payroll, Time, Pay, Requests and More load from the hosted database.
- A tablet registered and showed the PIN screen. Updates is hidden as in 1.4.
- Link: https://nevora-git-claude-codex-collab-nevora-josekarlo-5933s-projects.vercel.app (Vercel sign-in or a share link).
- The Preview deploys from a local clone with a local-only marker commit and `regions:["pdx1"]`. Neither is in the branch.

## 5. Known gaps

- **Lead:** a Lead keeps the v5 look (Lead is on hold). The Phase E Home suite now runs as an Employee, so the v5 Lead Home has no browser coverage.
- **Board figures not in the employee reads:** "earned so far", pay amounts in the Pay list, scheduled hours on Time.
- **Desktop sidebar link height:** 36px (188×36). It meets WCAG 2.5.8 (24px), but not the 44px phone rule. Desktop only.
- **Resizing during an uncertain correction:** a desktop Employee who narrows the window below 768px while a time correction is uncertain loses that request's "Try again". The phone Time view replaces the desktop panel. It only happens when resizing during that state.
- **Navigation helper:** Playwright sometimes misses a server action's stream close (see §4). The suite now bounds that wait, and the SQL readbacks still prove one commit.
- **Flaky WebKit check:** `explicit-source-recovery` in the Phase D browser suite failed 1 of 3 iteration runs (stayed on "Current view needs a fresh check") and passed in the gate. No related code changed on this branch.
- **Non-CI suites with an unmatched local harness:** `company-access-*` and `premium-*` refuse the generic owned-DB runner. They fail the same way on 001031aa, the commit before this work.
- **Payroll drafts:** drafts prepared before 4fd3f426 must be recalculated (`NATIVE_REVIEW_STALE`).
- **Updates (D04):** held, see 1.4.

- **CI coverage:** `ci.yml` runs only on development/main pushes and PRs, so it has not run on the release SHA; the only collab workflow, Mobile Access, has been red since Oct 30 12:11 UTC (`mobile-access-browser.integration.ts:150` waits for the old Owner Home). The final candidate must run `ci.yml` through an authorized PR, with Mobile Access re-anchored. CI-only steps the local gate did not run: inspection-evidence checks, `test:notifications:qa`, `test:foundation:qa`, `test:release-engineering`, `browser-render-readiness`, `attention-intent-readiness`, Clocker `--punch-ui` and break-filter readiness, Phase D whole-phase evidence, Phase E leaf/aggregate evidence and `verify-ci`. Local-only (not in CI): the release1 migrations config and the 22 owned integration configs.
- **Suites not run on the release SHA:** company-access (31 files, 532 tests, including `schedule_pending_edits` assertions), premium-*, `phase-e-integration`, `owned-app-cancellation`, mobile-access browser. The generic owned runner fails company-access the same way on 001031aa (488 failed / 44 passed on both); another runner on 08728bc5 gave 496 passed / 36 failed, all 36 in `company-access-shift-changes.integration.ts` refusing a non-disposable target.
- **Clocker browser suites:** only the iPad UI suite runs with `NEVORA_CLOCKER_UI_V2=true`; `--punch-ui` and `--breaks-ui` run the old tablet look.
- **Pre-release payroll drafts:** reading as `NATIVE_REVIEW_STALE` rests on the hash compare at approval and the calculator version in `NATIVE_RULES_SHA256`; no test approves a pre-V11 draft. Drafts held under the old `DAILY_BOUNDARY_SENSITIVE` status show "Recalculate this draft".
- Gate logs live outside the repo (`.../scratchpad/final-gate/summary.txt` on Jose's Mac); the final candidate's summary will be committed next to this file.

## 6. Not done here (yours or Jose's)

- Production migration, deploy, environment changes and any real notification, payment or credential: Codex after inspection and Jose's go.
- D04 (Updates) activation review.
- The stray remote head `claude/employee-mobile-phase2-20261027` and any branch cleanup: Jose's call.
