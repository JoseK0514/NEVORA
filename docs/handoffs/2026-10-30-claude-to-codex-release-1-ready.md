# Claude → Codex: NEVORA Release 1 is ready for inspection, then deploy

Date: 2026-10-30, corrected 2026-10-31 after the independent inspection (Phase 8), 2026-11-01 for the Owner premium upgrade (§1b), and 2026-11-01 for Codex's four-surface inspection fixes (§1c). Branch: `claude-codex-collab-nevora`.

**Frozen code candidate: `83397510a83d82420a3b6526c787f43a3092a839`** (Nov 1, after Codex's four-surface inspection). The full local gate (§4) and exact-head CI on draft PR #37 both passed on this exact SHA. Commits after it on `claude-codex-collab-nevora` (this handoff and its gate summary) change only `docs/`; check with `git diff --quiet 83397510a83d82420a3b6526c787f43a3092a839 HEAD -- . ':(exclude)docs'`, which must succeed. Deploy that SHA, or the branch head Claude names with this handoff when that check passes. `2c443138`, `cdb92cea` and `7b14776a` are superseded; do not deploy them. Any later change outside `docs/` makes a new candidate.

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

## 1a. Phase 8 changes (Oct 31, after the independent inspection)

The independent inspection (code, release audit, Owner UI and Employee UI reviewers) ran on 8e29c478. Everything below is on the release line after it.

**Pages rebuilt to the boards (Jose: "Fix all before release", "don't overcomplicate").** Every second-level Owner and Employee page that was still an older form is now built from the corporate kit, matched side by side with its board at 390 and checked at 320 and 1440:
- **Owner:**
  - Payroll: review, fix, people, prepare, history, settings and exports.
  - Schedule: the Edit/Add shift sheet, Build and publish, Find cover and Activity.
  - Team: Add/Edit employee (two steps), Person and Access.
  - Things to do, with "More to review" (`/app/inbox?view=more`) and request detail.
  - Insights, Team overview and Owner Timecards.
  - More, Settings and Clocker devices.
- **Employee:**
  - Time: Fix my time, Past timecards.
  - Pay: Pay history and Paycheck.
  - Requests: time off, availability and their sheets.
  - Account: Profile, Notifications and Alerts.
  - Calendar (`/app/profile/calendar`) and Passkeys (`/app/profile/passkeys`) now have their own pages, and Delete account was rebuilt.
- **Shell:** kit hit boxes are 44px; the desktop frame is 1040px; the sidebar has 9 links. The Employee availability, swap, callout and Open shifts pages light Schedule.

**"I can't work" on a shift with unpublished edits (Jose, Oct 31).**
- An employee can always send the report, and it is recorded against the published shift terms. Employees keep seeing those published terms.
- A manager's approval waits for Publish changes. It returns `PUBLISH_CHANGES_FIRST` with a link to `/app/schedule/publish?week=…#publish-changes`.
- The phone and desktop forms offer the board's four reasons: Sick, Family emergency, Transportation and Other. The server still accepts the earlier codes, so older reports stay readable.

**Payroll approval fix (f1a854b1). Please review.**
- The cause: closing-context evidence carried its `observedAt` capture time inside the review token and source fingerprint, so approving the same week later always read `NATIVE_REVIEW_STALE`.
- The fix: `fingerprintClosingEvidence()` (`src/lib/payroll/native/workweek-policy.ts`) drops `observedAt` from the canonical calculation (`calculate.ts`), the review-token facts (`preparation.ts`) and the source fingerprint (`source.server.ts`).
- Two new tests fail without the fix: `closing-context.test.ts` and `payroll-native.integration.ts`, which approves a `default00:01` week N later on closing evidence.

**Desktop time corrections. Please review.**
- The desktop Employee correction form now posts through the existing Server Action `saveEmployeeHoursCorrection`, the same path the phone already used.
- The action itself is unchanged.

**Other app fixes found by the inspection and the browser suites:**
- Calendar: the reset/revoke review no longer pulls focus back from Keep (a Chromium race).
- Schedule: "Confirm this week" has a 44px tap area; it is still drawn 36px.
- The desktop account menu has the calendar entry.
- The calendar copy falls back to plain text when the clipboard API is missing.
- Messages: Try again; aria-busy.
- Lead: Sign out is on More; availability is in the sidebar.
- Firefox focus ring; text wraps at 320.
- An access denial clears Fix my time's recovery state.
- The invitation panel uses kit buttons.

**Jose's decisions (Oct 31):**
- `NEVORA_PAYROLL_ENABLED=true` in production.
- Mobile Access is off.
- On 320px phones the week strip's days are about 40px wide (still 44px tall). Accepted.
- Making the kit respect the browser's text-size setting is the first item of Release 1.1. Page zoom already scales everything.

## 1b. Owner premium upgrade (Oct 31 – Nov 1, before Jose's device test)

Jose asked for a cleaner, more premium Owner side before testing on his devices. Two rounds, presentation only, on top of `7b14776a`:
- Round 1: `docs/product/reviews/owner-premium-2026-10-31/PLAN.md` (A1–A12, phone P1–P11, your review's A11/A12).
- Round 2: `ROUND2-PLAN.md` in the same folder (R1–R14): type scale (titles 24/30 phone, 28/34 desktop, also on Employee
  pages), tabular figures, calmer colour, one button and sheet system, Home with one focus, Timecards and Schedule grid
  polish, short motion, and a copy pass (`round2-critique-copy.md`).
- Jose's decisions: the NEVORA wordmark tile replaces the flame icon (manifest theme colour is now white; service worker
  cache `v5`); in-row badges and avatars are neutral grey, sidebar and tab totals stay teal; "Time" in the tab and sidebar,
  "Timecards" as the page title; "Share pay statements" (the status reads "Shared").

**No server action, API, schema, permission or migration changed.** Please still look at these presentation-side reads:
- `src/app/app/payroll/payroll-route.tsx`: Payroll sub-pages (not Home) read `listEmployees()` to show names first, inside
  the same gated route; a failed read falls back to the old rows.
- `src/app/app/payroll-export/page.tsx`: reads `readPayrollCapabilities(proof)` (inside `withOperationalCompany`) to show the
  Payroll tabs the person may use.
- `src/app/app/settings/clocker/pins/page.tsx`: reads `readOperationalDirectory(proof)` and `listPositions()` to show each
  person's role and position on Clocker PINs; a failed read shows names only.
- New page `src/app/app/timecards/corrections/page.tsx` (`MANAGER_ROLES`, `readOperationalAuthority`, the existing
  corrections component). Corrections also stay on Who's working, because 9 Phase D scripts use `#review` there.
- `schedule/generation-actions.ts`: one success message's wording only ("Build draft", "Fill gaps only").

**Visible text that changed** (the browser suites follow it; no check was removed or loosened): "Time corrections"
(collapsed row label "Time corrections and flagged clock-ins"), "Nothing to fix", "Hours worked", "How we count", one
Insights period control per width (phone segments This week / Last week / 30 days / Custom; menu on wider screens),
"Older items" (a plain row with no count), "Add tablet" / "Tablet name" / "Get setup code", "Check code", "Nothing saved
for this code", "Search by name", "Help for your team", "Save" / "Save help details", punch-photo events as switches, Sign
out once (More on phones, sidebar on desktop), "Help someone sign in", "Clocker tablets". The timecard sheet's accessible
name now includes the person ("Timecard Avery …").

## 1c. Codex's four-surface inspection fixes (Nov 1)

Codex inspected `2c443138` (`docs/handoffs/2026-11-01-codex-to-claude-four-surface-inspection.md`): GO WITH CONDITIONS,
six P2 and one P3. All seven are fixed in `8da26b10`; `83397510` adds the approved references (docs only). Each fix, its
files and evidence: `docs/handoffs/2026-11-01-claude-to-codex-inspection-response.md`. Summary:
- A1: the phone Requests summary shows a time-off request's whole range ("Nov 11 – 12 · 2 days"). The private Requests read
  now projects `endDate`, `startTime`, `endTime` (time off only; null for shift and can't-work rows) and the strict parser
  checks them. **This is the one data-shape change**: `/api/employee/requests` `recent[]` rows gained those three keys. Stored
  data, scope and routes are unchanged.
- B-01, B-02, B-03: list structure on Owner Profile (passkeys), Company profile (locked time zone help) and Features (radio
  group). axe: 0 violations, Chromium and WebKit, 390 and 1440, passkeys enabled.
- B-04: Copy Clocker link takes taps over 44px with its 32px look (opt-in `q-bs--hit`; no other button changed).
- A2, A3: Photo review on the kit in the settings gutter; Clocker tablets share the 16px phone gutter.
- References: the approved board sources and design spec (`docs/product/specs/corporate-mockups/`) and the round 1 and
  round 2 plans (`docs/product/reviews/owner-premium-2026-10-31/`) are now in the release tree.

Codex: please re-review the seven for closure; this handoff does not close them.

## 2. Migrations

- **Release 1 is the first production release of this line.** Codex's read-only preflight (Oct 31, `docs/handoffs/2026-10-31-codex-to-claude-release-1-preflight.md` in Codex's workspace) found production's catalog (Neon `rough-fire-63258908`, main branch, us-east-1) structurally identical to an owned local database built from `0001`–`0004`, with no migration ledger. Reconcile again at cutover, by **object presence, not filename prefix** (prefixes repeat, and other lines have used `0043`/`0044` for different files: check `SELECT to_regclass('public.schedule_pending_edits')` for this release's 0043).
- **The applied chain is 50 files** (corrected Oct 31, Codex PRE-01): `BASE_MIGRATIONS` (47, `0001` through `0043_schedule_pending_edits`) then `FINAL_MIGRATIONS` (3: `0031_native_payroll`, `0032_company_access_invitations`, `0042_company_invitation_lifetime`), by exact full filename from `db/migrations/order.ts`. The directory holds 52 because it also has the two `HELD_MIGRATIONS` (`0026_tenant_ownership_expand`, `0027_tenant_ownership_validate`): never apply those, nor development's `0044`/`0045`. From production's `0001`–`0004` baseline, **46 files remain**: start at `0005_time_clock`. `0043` is the only file added since the Oct 29 manifest. Never run fresh setup against the existing database.
- `0032_company_access_invitations` is irreversible after COMMIT (`LEGACY_ADOPTION`, no inverse SQL) and takes `SHARE ROW EXCLUSIVE` locks on `workspaces` and `employees`.
- **Five files have no outer transaction** (corrected Oct 31, Codex PRE-02): `0019_payroll_export_mappings`, `0033_management_alert_preferences`, `0038_read_path_indexes`, `0038_clocker_pin_operation_reference`, `0039_clocker_review_requests`. Wrap each in `BEGIN … COMMIT` with bounded timeouts and stop-on-error (runbook §5); never run one bare. `0038_read_path_indexes` builds plain indexes that block writes, including tablet punches: run it as its own step.
- Before `0008`, confirm its seeded workspace identity and the Clocker-key backfill are the intended company metadata (Codex preflight).
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
| `NEVORA_PAYROLL_ENABLED` | `true` (Jose, Oct 31; same as the Preview) |
| `NEVORA_INVITATION_DELIVERY_ENABLED` | as its own approval says (fails closed when unset) |
| `NEVORA_OWNER_ADVISOR_ENABLED`, `_DATA_APPROVED`, `_PROVIDER`, `_MODEL`, `_DAILY_LIMIT`, `OPENAI_API_KEY`, `NEON_AI_GATEWAY_*` | unset (the development preview sets the advisor on; Release 1 does not) |
| `NEVORA_UI_PREVIEW_ENABLED` | **must be absent**: `1` exposes `/ui-preview/*` |
| `NEVORA_SHOW_DRAFT_POLICIES` | unset |
| `NEVORA_CLOCKER_PUNCH_ENABLED` | as its own authorization says (off by default) |
| `NEVORA_ENVIRONMENT`, `NEVORA_CLOCKER_PHOTO_*` | photo capture stays closed unless the environment is `staging`, so Clocker photo review is unavailable in production |
| Push, passkeys | as their own approvals say |
| Company updates | nothing to set (see 1.4) |

- **Region:** the privacy policy says servers are in Northern Virginia (`src/lib/legal/policies.ts:21`). Codex's preflight found production Neon main in us-east-1 (matches) and only a cancelled historical Vercel Production deployment in iad1; the final deployment's function region and `DATABASE_URL` binding are still to verify. Don't carry over the fictional Preview's pdx1/us-west-2 setting. Production env values are hidden from the connector and remain unverified against the table above.

## 4. Evidence on the release SHA (owned local Postgres, fictional data, `DATABASE_URL` unset)

### Gate on the Owner premium candidate (Nov 1)

The full gate ran in one ordered pass on `83397510a83d82420a3b6526c787f43a3092a839` (Nov 1, 07:49–10:02 AST), clean tree
throughout, 70 of 70 steps passed. Summary: `docs/handoffs/2026-11-01-release-1-gate-summary.txt`. The earlier pass on
`cdb92cea` (00:49–03:02) also passed 70 of 70; the counts below are from `83397510`.

| Step | Result |
|---|---|
| Typecheck, lint, audit (prod and all), advisor pilot, release build | pass |
| CI-only checks: inspection custody (19), notifications/foundation config (6 + 8), release engineering (169) | pass |
| Unit | 10,439 passed, 801 skipped |
| Migrations; release Postgres; advisor integration | 11; 746 (284 + 46 + 176 + 163 + 77); 38 |
| Clocker shards 1–4 | 147 + 132 + 151 + 142 = 572 |
| Phase E startup and SQL | pass; 23 |
| 22 owned database integration configs | all pass (same counts as below) |
| Advisor browser; attendance UI; Phase D browser; remediation; D2 corrections UI | pass; 48; 207 checks 0 errors; 6; 282 |
| Home held response; Phase E Home, Communications, Calendar, Navigation, Attention | pass; 14 of 14 cells each |
| Clocker iPad UI; breaks UI; punch UI (now in the local gate, as in CI) | pass; 46; 90 |
| Mobile Access; Owner Things to do | 3; 1 |
| Employee phone configs | phase 1: 1; requests 39; planning 58; creation 48; responses 44; communications 178; hours 71; profile 185; calendar 256; pay 1; closure 1; deletion 15; device alerts 373; passkeys 294 |

How it reached green: the first browser pass on `9493492e` failed 13 suites, all on wording and controls round 2 changed.
The checks now follow the new text and structure; none was removed or loosened. Two things were real: the Things to do
check had stopped counting (the cards became kinds with count chips), so it counted nothing and passed vacuously; it reads
the chips again and still proves every action appears exactly once. The timecard sheet's name gained the person (above).
A chromium-only pending `/app/more` RSC request once held the Profile idle check under load; it passed in every later run.

After the gate, exact-head CI on draft PR #37 (`a9f0b342`) failed one job, `phase-d-attendance-ui`, at the D2 correction
browser step: in WebKit the manager's foreground return refreshes the page and cancels Who's working's own
`/api/manager/today` read, which WebKit reports as an access-control fetch failure. `448e7af1` (test only) classifies exactly
that event (that stage, that read, loopback origin, no query) as a recorded navigation cancellation; every other runtime
error stays fatal. Unit cases in `scripts/d2-runtime-failures.check.mjs`; local D2 re-run 282 checks; release engineering 169.

Exact-head CI on `83397510` (run 41303596912): 18 of 18 green on the third attempt, with no change between attempts. Attempts 1
and 2 ran on runners about twice as slow as usual (the 20-location planner unit test took 203s against 106s; unit tests
881s against 508s), so `validate` passed every step but crossed its 20-minute limit by seconds. Attempt 1 also failed D2 in
WebKit, waiting over 15s for the corrections list after the suite's deliberately delayed read; it passed on attempt 2 and
locally (282 checks on the same SHA). On attempt 3 `validate` took 12.5 minutes.

### Earlier candidate (`7b14776a`, Oct 31): history

The full gate ran in one ordered pass on `f486a96fed567c760a81a29934b7b1129301562d` (Oct 31, 10:31–12:43 AST), clean tree throughout. Script and logs: Claude's scratchpad `gate5/` (summary below is complete).

| Step | Result |
|---|---|
| Typecheck, lint, audit (prod and all), advisor pilot | pass |
| Release build (`NEVORA_BUILD_RECEIPT`) | pass |
| Unit | 10,405 passed, 801 skipped |
| Migrations | 11 passed |
| Release Postgres | 746 passed (foundation 284, Phase B authority 46, generation 176, exchanges 163, notifications 77) |
| Advisor integration | 38 passed |
| Clocker shards 1–4 | 147 + 132 + 151 + 142 = 572 passed |
| Phase E startup and SQL | pass; 23 passed |
| 22 owned database integration configs | all pass (native 44, configurable 37 and export 8 payroll; timecards 14; punches 72; corrections 36; company setup 3; account recovery 13; action center 5; management profile 14; employee schedule 6; reports 6; Phase D corrections 53 and remediation 13; six findings 15; passkeys 36; employee mobile SQL 65; Clocker breaks 31, C6 29, owner policy 65, punch 72, recovery 50) |
| Advisor browser | pass |
| Attendance UI | 48 checks |
| Phase D browser | 207 checks, 0 errors |
| Phase D remediation | 6 checks |
| D2 corrections UI | 282 checks |
| Home held-response check (`NODE_ENV=test`) | pass |
| Phase E Home, Communications, Calendar, Navigation, Attention | 14 of 14 cells each, 0 errors |
| Clocker iPad UI; Clocker breaks UI | pass; 46 checks |
| Mobile Access browser | 3 passed |
| Employee phone browser configs (cumulative; each run includes the earlier files) | phase 1: 1; requests 39; planning 58; creation 48; responses 44; communications 178; hours 71; profile 185; calendar 256; pay 1; closure 1; deletion 15; device alerts 373; passkeys 294 — all passed |
| Owner Things to do browser | 1 passed |

**After the gate.** Two commits sit on top of `f486a96f`:
- `95f9b79d` changes CI only: `.github/workflows/ci.yml` and the three files that pin it (`scripts/release-ci-contract.check.mjs`, `src/test/phase-c-release-ci.test.ts`, `src/test/phase-e-runner.test.ts`). See §5, CI coverage.
- `03e18d7c` and the commit that adds this section change `docs/` only.
- `1c17209b` changes one test: the Mobile Access browser suite now waits for the Support page before pressing Back. In Firefox the Back click could land on the Access help page's own back link first. CI's push run on `dc30ce9b` failed there while its PR run on the same commit passed. The suite passed 3 of 3 twice locally on `1c17209b`. No check removed.
- Exact-head CI on draft PR #37 then failed five jobs on `280a25fa`. Two were timing problems and three were CI-only Clocker checks still written for the pages before the boards. All five are fixed in tests only:
  - `48096e5d` Phase E Home (WebKit 320): leaving the phone Requests hub cancels its `/api/employee/requests` read, which WebKit reports as an access-control fetch failure. It is now a recognised navigation cancellation under the same rules as the Home, Time and Notifications reads (WebKit only, a pending document navigation, a verified diagnostic, a plain own read). Unit cases cover it and keep the query-string form fatal.
  - `48096e5d` Release Postgres (`generation-session`): the lock-wait helper gave up after 100 tight polls. It now waits up to 10 s, polling every 20 ms, and still requires PostgreSQL to report the actual block.
  - `25ce87b6` Clocker break-filter readiness: the check now bundles the component's CSS module (it failed to build).
  - `355d1408` Clocker Owner pages: setup starts from "Set up a new tablet" (dialog "Add device"). Break types are two lists ("Configured break types" and "Archived break types"), not a filter. Archiving now requires the row to leave one list and appear in the other.
  - `4ee6ec51`, `b398bd21`, `3ffed43c` Clocker punch UI: the pending action is read from the tablet's IndexedDB journal (since `57a04195`, Oct 27), and the storage-denied case denies the journal write. Every obsolete action now passes through the explicit "Review current status" step (since `37b8c20c`), with no record written before or after it.
  - `614b552d` Release Postgres (`schedule-settings-session`, CI on `4d166b1c`): the same tight lock-barrier poll. Every lock-barrier poll in the release Postgres suites now has room: back-to-back loops wait up to 10 s polling every 20 ms (`schedule-settings-session`, `deadline-handoff`, one `foundation` case), and loops that already sleep 10 ms poll up to 500 times. Each still requires PostgreSQL to report the actual block.
  - `e1690827` Mobile Access (CI on `f79e4ab2`, Chromium): after the account switch the suite waited for network idle on Manager Home, which polls its reads. It now waits for the loaded page and its main heading, then re-checks that no Employee guide appeared. It passed 3 of 3 twice locally.
  - `67d1f984` Notifications (CI on `04e7ce5f`, `concurrent_manager_groups… at 8 PR`): the test's barrier, meant to hold both reminder runners at QA-M's group write, matched `statements[0].values[1]`. Since `949abe5f` put an employee `FOR SHARE` (one value) first, it never engaged, so a group conflict depended on scheduling. It now matches the conflict-check statement itself. Test only; the reminder code is unchanged. **Codex: please confirm this matches your intent for that test.**
  - Local re-runs on these commits: release Postgres 746 passed (again on `614b552d` and `67d1f984`); Phase E Home 14 of 14; break-filter readiness 6 of 6; Clocker punch UI 90 checks in Chromium and WebKit; typecheck and lint pass.
- The commit that records this changes `docs/` only.

On `03e18d7c`, typecheck, lint, `test:release-engineering` and unit were re-run: typecheck and lint pass, `test:release-engineering` 168 passed, unit 10,405 passed and 801 skipped, clean tree.

**How the gate reached green (Oct 31).** No check was deleted or loosened:
- Gate 3 (`89377112`): a test file had an implicit-`any` callback that broke typecheck and the build; fixed in `463178fd`.
- Gate 4 (`463178fd`):
  - Phase E Navigation sampled axe while the Lead More tab was still pressed. The test now waits for the press to release (`c6c9207e`).
  - The employee phase 1 and closure suites were re-anchored to the boards. A dark-mode request now asserts the light look (light only in Release 1).
  - Calendar: the reset/revoke review pulled focus back from Keep in Chromium. Fixed in the app (`aefba58a`).
  - Schedule "Confirm this week" now has a 44px tap area (`01bf26aa`).
  - The passkey network config needed its evidence variable.
  - Phase E SQL failed once on "Owned resource observation failed"; it passed 10 of 10 on re-run and passed in gate 5.

**Oct 30 history.** The Oct 30 gate on `d3a5c7df` and its fixes (Navigation `actionsSettled()` bound at 10 s in `199159e9`; browser suites re-anchored to the approved UI; Who's working, Things to do, Insights, update page, calendar notice contrast and segment tap-area fixes) remain in the branch and are covered by the gate above.

**Hosted fictional Preview:**
- Neon `nevora-release1-preview-20261030` (us-west-2), Vercel Preview on this branch only, region pdx1.
- Claude redeploys it from the release head right after this commit and reports the result with the handoff message. Before this candidate it ran the `885003d6` app code (Nov 1).
- Link: https://nevora-git-claude-codex-collab-nevora-josekarlo-5933s-projects.vercel.app (Vercel sign-in or a share link).
- The Preview deploys from a local clone with a local-only marker commit and `regions:["pdx1"]`. Neither is in the branch.

## 5. Known gaps

- **Lead:** a Lead keeps the v5 look (Lead is on hold). The Phase E Home suite now runs as an Employee, so the v5 Lead Home has no browser coverage.
- **Board figures not in the employee reads:** "earned so far", pay amounts in the Pay list, scheduled hours on Time.
- **Compact 32px buttons:** only Copy Clocker link gained the 44px hit area (Codex B-04). List Approve/Decline, logo Upload and the other `q-bs` buttons keep 32px; Jose's call whether they get the same opt-in.
- **Desktop sidebar link height:** 36px (188×36). It meets WCAG 2.5.8 (24px), but not the 44px phone rule. Desktop only.
- **Resizing during an uncertain correction:** a desktop Employee who narrows the window below 768px while a time correction is uncertain loses that request's "Try again". The phone Time view replaces the desktop panel. It only happens when resizing during that state.
- **Navigation helper:** Playwright sometimes misses a server action's stream close (see §4). The suite now bounds that wait, and the SQL readbacks still prove one commit.
- **Flaky WebKit check:** `explicit-source-recovery` in the Phase D browser suite failed 1 of 3 iteration runs (stayed on "Current view needs a fresh check") and passed in the gate. No related code changed on this branch.
- **Non-CI suites with an unmatched local harness:** `company-access-*` and `premium-*` refuse the generic owned-DB runner. They fail the same way on 001031aa, the commit before this work.
- **Payroll drafts:** drafts prepared before 4fd3f426 must be recalculated (`NATIVE_REVIEW_STALE`).
- **Updates (D04):** held, see 1.4.

- **CI coverage (Codex PRE-03):** `ci.yml` runs on development/main pushes and on PRs to development, main, `phase-c/**` and `release/**`, so it has not run on the release SHA. On a PR, `github.sha` is GitHub's synthetic merge commit, not the head. The release SHA therefore includes a CI-only change: every checkout, `*_EXPECTED_SHA` and artifact name in `ci.yml` uses `github.event.pull_request.head.sha || github.sha`, so a PR run checks out and records the exact frozen head (push runs are unchanged). The contract checks (`scripts/release-ci-contract.check.mjs`, `phase-c-release-ci.test.ts`, `phase-e-runner.test.ts`) pin the new expression, and one more assertion fails if a bare `github.sha` returns. No assertion was removed; no `pull_request_target`. **Exact-head CI runs on a draft PR from `claude-codex-collab-nevora` to `main`** (Jose approved Oct 31; never merged by Claude; Codex fast-forwards `main` after Jose's go). Its runs must record the frozen SHA. CI-only steps the local gate did not run: inspection-evidence checks, `test:notifications:qa`, `test:foundation:qa`, `browser-render-readiness`, `attention-intent-readiness`, Clocker `--punch-ui` and break-filter readiness, Phase D whole-phase evidence, Phase E leaf/aggregate evidence and `verify-ci`. `test:release-engineering` ran locally on `03e18d7c` (168 passed). The Clocker punch UI and break-filter checks had been out of date since Oct 27 (they never ran on this branch before PR #37); both pass now (§4). Local-only (not in CI): the release1 migrations config, the 22 owned integration configs and the employee-mobile browser configs.
- **Suites not run on the release SHA:** company-access (31 files, 532 tests, including `schedule_pending_edits` assertions), premium-*, `phase-e-integration`, `owned-app-cancellation`. The generic owned runner fails company-access the same way on 001031aa (488 failed / 44 passed on both); another runner on 08728bc5 gave 496 passed / 36 failed, all 36 in `company-access-shift-changes.integration.ts` refusing a non-disposable target. Mobile Access (re-anchored to the corporate Home) and every employee-mobile browser config now run in the gate (§4).
- **UI gaps Jose accepted or deferred (Oct 31):** on 320px phones the week strip's days are about 40px wide (44px tall); the kit sets type in px, so the browser text-size setting doesn't enlarge it (page zoom does), first item of Release 1.1; Lead pages (on hold) show two `h1`s; More keeps the name visible during a held sign-out.
- **Clocker browser suites:** only the iPad UI suite runs with `NEVORA_CLOCKER_UI_V2=true`; `--punch-ui` and `--breaks-ui` run the old tablet look.
- **Older Clocker scripts outside CI and the gate** (`phase-c-devices-ui-qa`, `-monitor-ui-qa`, `-pins-ui-qa`, `-punch-http-qa`, `-employee-time-ui-qa`) were already written for pages before the boards and were not updated.
- **Time corrections** live on Who's working and on `/app/timecards/corrections`; moving them off Who's working and a corrections detail page are Release 1.1.
- **Release 1.1 (Jose, Oct 31):** the Lead role choice in Add employee; Add employee step 2 validation timing; a real prepare-by deadline setting; a dev-only React key warning on Schedule.
- **Pre-release payroll drafts:** reading as `NATIVE_REVIEW_STALE` rests on the hash compare at approval and the calculator version in `NATIVE_RULES_SHA256`; no test approves a pre-V11 draft. Drafts held under the old `DAILY_BOUNDARY_SENSITIVE` status show "Recalculate this draft".
- Gate logs live outside the repo (Claude's scratchpad `gate7/`); the summary is committed next to this file.

## 6. Not done here (yours or Jose's)

- Production migration, deploy, environment changes and any real notification, payment or credential: Codex after inspection and Jose's go.
- D04 (Updates) activation review.
- The stray remote head `claude/employee-mobile-phase2-20261027` and any branch cleanup: Jose's call.
