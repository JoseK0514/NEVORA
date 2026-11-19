# NEVORA collaboration branch release test plan

Run the fictional customer journey and its failure and recovery cases on `JoseK0514/NEVORA:claude-codex-collab-nevora`. A release verdict applies to the tested commit and the identified staging deployments.

The starting collaboration candidate is `9af91ef2b2fa69b292ed4cf524e9f03e3d9d0819`. Development SHA `e0e8efe9ce1aeee8a2961cd92684ff1a38f95550` is the historical baseline. Its Development CI and Mobile Access runs passed. [Baseline CI](https://github.com/JoseK0514/NEVORA/actions/runs/44595317748) · [Baseline Mobile Access](https://github.com/JoseK0514/NEVORA/actions/runs/44595317789)

The current qualification scope starts from collaboration head `a87826f6833c3572ea429939dbd688dd94549863`. It includes Manager action grants, planning-week display, Owner first-week setup, wages, and base scheduled pay. The protected SCRUM-190 replay targets the Development SHA above. [Owner and Manager handoff](../handoffs/2026-11-19-claude-owner-manager-controls.md) · [SCRUM-190](https://thevelani-team.atlassian.net/browse/SCRUM-190)

## Prepare and run the candidate

1. Fetch the collaboration and Development refs. Resolve the candidate once and run from a clean detached worktree. Source-bound runners check the worktree status and record the commit and tree.
2. Use the toolchain pinned by the release workflows. Install application and browser dependencies from their lockfiles. Set `NEVORA_TEST_PG_BIN` to the directory containing PostgreSQL 16's `initdb`, `pg_ctl`, `pg_dump`, and `pg_restore`. [CI](../../.github/workflows/ci.yml) · [Mobile Access](../../.github/workflows/mobile-access.yml)
3. Use a new private evidence directory outside the checkout for each attempt. Use a shell with fixture-only settings. Keep `DATABASE_URL`, `FUEL_TEST_DATABASE_URL`, `NEVORA_CONTROL_DATABASE_URL`, `NEVORA_COMMERCE_DATABASE_URL`, and live provider credentials unset. The owned runners start and stop their own loopback databases.

```bash
git fetch --no-tags origin \
  refs/heads/claude-codex-collab-nevora:refs/remotes/origin/claude-codex-collab-nevora \
  refs/heads/development:refs/remotes/origin/development
NEVORA_QA_SHA=$(git rev-parse --verify 'origin/claude-codex-collab-nevora^{commit}')
NEVORA_QA_ROOT=$(mktemp -d)
git worktree add --detach "$NEVORA_QA_ROOT/source" "$NEVORA_QA_SHA"
cd "$NEVORA_QA_ROOT/source"
npm ci
npm ci --prefix tools/ci-browser-runtime
export NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE="$PWD/tools/ci-browser-runtime/package.json"
export NEVORA_PLAYWRIGHT_BIN="$PWD/tools/ci-browser-runtime/node_modules/.bin/playwright"
"$NEVORA_PLAYWRIGHT_BIN" install chromium webkit firefox
test "$(git rev-parse HEAD)" = "$NEVORA_QA_SHA"
test -z "$(git status --porcelain)"
```

Run the source inventory and onboarding manifest as separate gates so both outcomes are recorded. Keep evidence for each suite even when another gate fails.

```bash
npm run check:development-sources
npm run check:onboarding-manifest
node --test scripts/release-ci-contract.check.mjs
```

The candidate's push runs should return all ten required contexts on the exact SHA. On a pull request, CI and Mobile Access select the PR head. Use the push or approved immutable candidate-tag runs for the exact release SHA. Record the GitHub run URLs and artifact names.

```bash
gh api "repos/JoseK0514/NEVORA/commits/$NEVORA_QA_SHA/check-runs" --paginate \
  --jq '.check_runs[] | [.name,.status,.conclusion,.details_url] | @tsv'
```

| Workflow | Required check contexts |
|---|---|
| CI | `validate`, `clocker-postgres`, `release-postgres`, `management-review-ui`, `phase-d-attendance-ui`, `phase-e-postgres`, `phase-e-ui`, `phase-e-evidence`, `onboarding-backend` |
| Mobile Access | `mobile-access` |

### Local suites for the release journey

Run from the clean worktree prepared above. Each browser or backend command supplies its own fixture. Execute the hosted rows separately to prove SSO, provider side effects, and deployment identity.

```bash
NEVORA_ONBOARDING_EXPECTED_SHA="$NEVORA_QA_SHA" \
  NEVORA_ONBOARDING_EVIDENCE_DIR="$NEVORA_QA_ROOT/onboarding" node scripts/onboarding-acceptance.mjs

mkdir -p "$NEVORA_QA_ROOT/mobile"
NEVORA_MOBILE_ACCESS_EVIDENCE="$NEVORA_QA_ROOT/mobile" \
  npm run test:mobile-access:owned -- --reporter=default --reporter=json \
  --outputFile="$NEVORA_QA_ROOT/mobile/vitest-results.json"

NEVORA_STEP4_EXPECTED_SHA="$NEVORA_QA_SHA" \
  NEVORA_STEP4_EVIDENCE="$NEVORA_QA_ROOT/step4" node scripts/step4-local-acceptance.mjs

NEVORA_CENTRAL_BILLING_EXPECTED_SHA="$NEVORA_QA_SHA" \
  NEVORA_CENTRAL_BILLING_EVIDENCE="$NEVORA_QA_ROOT/central-billing" node scripts/central-billing-local-acceptance.mjs
```

## Candidate coverage map

The suites below supply starting fixtures and assertions. Mark each case passed only when its stated outcome and evidence have been checked.

| Cases | Candidate surface and dependencies | Existing automation or fixture |
|---|---|---|
| SIGNUP-01–05, ACCESS-01 | Signup host `/onboarding`, `/onboarding/verify`, `/api/onboarding/config`, registrations, verification, workspaces and operations. Company host `/onboarding/activate` and `/login`. Control migrations, registration mail and provisioner. | `onboarding-acceptance.mjs`, Step 4, and `mobile-access:owned`. Hosted signup, delivered mail, and deployed worker readback need hosted execution. |
| ACCESS-02–05 | Owner setup and invitation batches, role landing under `/app`, invite `/activate`, `/forgot-access` and `/reset-access`. Distinct control and workforce principals, notification worker and revocation. | Step 4, onboarding `invitations`, `journey` and `isolation-auth` suites, Mobile Access, `test:passkeys:network`. |
| ACCESS-06, WORK-06–07 | Owner grants in Team and Manager Profile, `/api/workforce/settings`, `/api/workforce/permissions`, planning calendar and schedule, and Owner Home `/api/setup/first-week`. | `workforce-ui.test.tsx`, `first-week-setup.test.tsx`, workforce PTO integration, and the Owner and Manager browser walkthrough. |
| WORK-01–05 | `/app/schedule`, `/app/schedule/publish`, `/app/requests`, `/app/inbox`, and `/api/calendar/[token]/schedule.ics`. Changes in migration `0070_scheduling_authority_pto.sql`, location authority, and automatic notifications. | `test:phase-e:sql`, `test:phase-e:ui`, `test:release:postgres`, and the workforce PTO tests under `vitest.company-access-integration.config.mts`. Check the actual click and recovery paths for WORK-05. |
| TIME-01–06 | `/clocker/[location]`, its PIN and punch routes, `/app/settings/clocker/matching`, and `/app/timecards`. Grace migration `0069_clocker_early_grace.sql` and the short-screen PIN layout. | `test:clocker:owned`, `test:phase-d:attendance-ui`, and the Clocker browser group. TIME-02 needs the physical iPad evidence. |
| PAY-01–02 | `/app/timecards/corrections`, `/app/payroll/review`, `/app/reports/christmas-bonus`, and payroll exports. Employment dates in migration `0068_employee_employment_dates.sql` and the payroll worker. | `test:payroll:owned`, `test:phase-d2:corrections-ui`, dedicated native and configurable payroll SQL, and the Christmas-bonus report integration. |
| PAY-03–04 | Owner Pay rate under `/app/employees/[employeeId]/pay`, wage settings and history, and the Owner Schedule's base scheduled pay estimate. | `wages-ui.test.tsx`, `wage-plan.test.ts`, compensation integration, and the Owner and Manager browser walkthrough. |
| BILL-01–04 | `/app/billing` → `/pages/nevora-billing` → Stripe Checkout → `/pages/nevora-billing-return`. Commerce API, signed webhook, queue and reconcile workers, and the commerce migration chain. | `test:commerce:owned`, central billing browser evidence and the signed-event fixtures. Hosted Stripe sandbox events and provider state need their own evidence. |
| RONDO-01 | `/api/owner/advisor`, `/api/owner/advisor/knowledge`, `/api/owner/advisor/business`, and `/api/manager/advisor`. Reviewed company knowledge and source visibility gates. | `vitest.owner-advisor-browser.config.mts`, `vitest.owner-advisor-integration.config.mts`, and `vitest.rondo-leadership.config.mts` under the owned PostgreSQL runner. |
| OPS-01–03 | Signup and company `/healthz`, authenticated operator/monitor status, onboarding and workforce operations workers, control and commerce stores. Workforce order comes from `db/migrations/order.ts`, including its final sequence. | `test:release:postgres`, onboarding `operations`, and the worker and hosted handler tests. Record all three schema versions and measure the isolated restore. |
| GUIDE-01 | Six PDFs in `docs/guides/web/publication` including the candidate's rebuilt Owner, Manager/Lead, Employee, Rondo, Developer, and Operations guides. | Use the publication manifest and compare the changed workflows against the open PDFs for the target source. |

In protected staging, match each host's application SHA, Neon worker source SHA and stage, and the database binding. Read back `NEVORA_ONBOARDING_ENVIRONMENT=test`, `NEVORA_COMMERCE_ENVIRONMENT=staging`, and the approved Neon staging profile. Record enabled states for enrollment, signup admission/provisioner, commerce and payroll, and the Rondo Owner, Manager, and Knowledge flags. Record only enabled states and non-sensitive IDs. Confirm EN/ES language persistence with `0071_user_language_preferences.sql` applied. Use signed test events against approved fixtures for failure recovery. [Neon runtime profile](../../services/hosted/neon/runtime-profile.ts)

## Release setup

- **Candidate.** Record the full commit SHA, build, deployment IDs for signup and company hosts, current alias targets for rollback, canonical migration versions, and enabled feature flags. Verify the built SHA on both hosts and use the same SHA in the release evidence.
- **Isolation.** Use Vercel SSO, the approved isolated onboarding profile, an owned test control database and workforce databases, Stripe test mode, and approved test inboxes. Verify the app and workers use the same profile before enabling temporary worker or mail settings. The existing Neon staging profile expects onboarding environment `test`. Record public `signupEnabled=false` before and after the hosted run. [Runtime profile](https://github.com/JoseK0514/NEVORA/blob/e0e8efe9ce1aeee8a2961cd92684ff1a38f95550/services/hosted/neon/runtime-profile.ts)
- **Fixtures.** Use two fictional workplaces with separate locations, workforces, and credentials. Create Workplace A through the hosted signup flow. Preseed Workplace B with distinctive records for isolation tests. Give billing its own fictional workspace and test customer. Use a separate fixture for migrations and restore.
- **Scheduling.** The signup owner owns the hosted signup window, the billing owner owns Stripe sandbox, and device QA owns the physical Clocker run. Parallelize owned suites and read-only staging checks. Book separate windows for tests sharing an alias, recipient policy, worker binding, or compute cap. Write down who can change each shared setting and who restores it.
- **Coverage.** Run the primary journey in a desktop browser and with an Employee using mobile Safari. Exercise English and Spanish on signup, email, activation, and recovery. Use Chromium and WebKit for broader automation. Record the actual device and OS for the iPad and other supported native targets. Use Puerto Rico as the main time zone and a separate daylight-saving fixture for schedule and time calculations.

Freeze the local workforce fixture to a Puerto Rico date with a 09:00–17:00 shift and a 12:00–12:30 unpaid break. Expect 480 elapsed minutes, one 30-minute break and 450 payable minutes. Use different location and shift labels in Workplace B so an incorrect result is recognizable in reads and exports. For the hosted and physical runs, calculate the expected totals from the actual punch timestamps and the fixture's approved pay rules.

## First hosted journey

| Case | Action | Pass criteria and evidence | Owner |
|---|---|---|---|
| SIGNUP-01 | Open protected signup and its company-host activation route. Submit the fictional Owner through the approved private form. | Both hosts serve the exact SHA under SSO. The private form is available on staging. The Owner email visibly arrives in the approved inbox and its verification path works. Record the deployment IDs and inbox receipt time. | Signup |
| SIGNUP-02 | Verify the Owner, then use the verification link in a fresh session. | The first use advances the intended registration. The later use cannot establish a second signup session. Record the two outcomes without recording the link. | Signup |
| SIGNUP-03 | Lose the response after a test provisioning request is accepted, then recover using the original operation. | The owner-facing flow recovers. Records show one workplace, one Owner, and one provisioned resource for that operation. Record the operation receipt and counts. | Signup |
| ACCESS-01 | Follow Owner activation, set the password, and sign in using the returned Employee ID on the company domain. | Sign-in reaches the correct workplace with Owner access. The activation proof is single-use and the password policy is enforced. | Signup |
| ACCESS-02 | Add a location and invite the Manager and Employee. Activate both through their actual inboxes. Repeat an invitation after the app loses the saved response. | Each role reaches its expected landing page. One saved invitation and one received email per intended recipient for the original operation. Record send and inbox receipt separately. | Signup |
| WORK-01 | Publish a shift as an authorized planner and open the Employee schedule on mobile. | Employee sees the published date, local start and end, role, and location. Verify an unpublished change stays hidden until publication. | Workforce |
| TIME-01 | Clock in, start and end a break, and clock out. Approve the resulting timecard with an authorized reviewer. | One shift, one break, and one approved timecard have the expected recorded and payable minutes. Reconcile the punch log, review screen, and report. | Workforce |
| TIME-02 | Repeat `TIME-01` on a physical iPad with the supported Clocker setup. | The hardware run produces the same correct records. Record hardware, OS, build or deployment, and any offline recovery exercised. Prior device evidence can be reused when QA verifies its applicability to the candidate and scope. | Device QA |
| BILL-01 | From a fictional billing workplace, have the Owner follow the billing handoff and complete real Stripe test-mode Checkout. | The signed delivery is accepted, NEVORA shows the correct plan and access, and Stripe shows one expected subscription. Record test-mode provider event and app operation identifiers. | Billing |
| BILL-02 | Exercise failed payment and recovery, then schedule a downgrade at renewal with a fixture above the lower plan’s headcount cap. | Failed payment follows the applicable access rules. Recovery restores the expected access once payment succeeds. Downgrade follows renewal and applies the approved over-cap policy. Record Stripe and NEVORA states at each transition. | Billing |
| OPS-01 | Restore a backup of a fictional workspace to a separate test database and rerun a short sign-in and data check. | The intended users can sign in. Roles, schedules, timecards, and key totals match the source fixture. Record the restore target and actual elapsed times against existing recovery objectives. | Operations |

## Focused regression matrix

Expand each row into repeatable fixtures and assertions in the existing suite before treating it as automated coverage. Use owned PostgreSQL for durable writes and a browser for the user-visible behavior.

| Case | Exercise | Required assertion | Primary layer |
|---|---|---|---|
| SIGNUP-04 | Closed public signup, unapproved address on staging, expired verification, wrong signup host | Each request is refused according to its contract. No registration, email, or workspace is created by a refused attempt. | Hosted smoke and onboarding |
| SIGNUP-05 | EN and ES verification, locale persistence, unavailable provider or worker | Email and screen agree in language, the right route loads, and the app gives the expected unavailable or pending state without duplicate work. | Browser and onboarding |
| ACCESS-03 | Manager with limited location scope, Lead, and Employee | Allowed actions work. Actions outside role or scope are refused on both the screen and server. | Browser and PostgreSQL |
| ACCESS-04 | Use each role’s normal app requests with data from the other fictional workplace | No cross-workspace record, search result, notification, export, or mutation is exposed. | API and PostgreSQL |
| ACCESS-05 | Password or passkey recovery, 15-character minimum for password flows, expired proof, and revoked sessions | Legitimate recovery succeeds. Invalid and reused proofs fail. Revoked sessions lose access. | Mobile Access and passkey suites |
| ACCESS-06 | Grant, revoke, and replay each Manager action grant at one of two locations. Sign in as Manager and compare Profile, schedule publishing, time-off approval and correction access. | Owner gets one confirmed update after a lost reply. Manager sees exact granted locations and actions. Authorized action succeeds at its granted location and is refused outside it or after revocation. Check role rotation and self-review restrictions. | Owned browser and workforce permissions |
| WORK-02 | Approve PTO, decline a request, and lose the response to a saved decision | Schedule and balances reflect the approved state. A retry or readback never applies the decision twice. | Browser and PostgreSQL |
| WORK-03 | Shift conflict, unpublished changes, and local-date rollover | Supported conflicts and concurrent edits resolve as specified. Employee views reflect publication and the correct workspace date. | Browser and PostgreSQL |
| WORK-04 | Notification and schedule update with an expired or revoked access link | The correct recipient gets the update and access is checked again when opened. Revoked access fails. | Phase E and notifications |
| WORK-05 | As an authorized Manager and Owner, save a PTO decision from the inbox during a held response and retry from the resulting UI. Review tablet request rows and long names in the schedule grid. | Readback shows one decision. Staff schedule and balance agree. The inbox conveys the saved or pending state after the interruption, keeps the next action visible, and returns focus appropriately. Tablet rows and whole-grid names remain readable. | Browser and PTO fixture |
| WORK-06 | Owner sets planning week to Sunday, reviews both underlying schedule weeks, and switches back to Monday. Open a previously published schedule and repeat on the Manager profile. | Planning dates and links match the workspace time zone. Published schedule keys and history stay correct. The Manager reads planning rules and the app refuses an unauthorized setting change. | Browser and planning calendar |
| WORK-07 | Open Owner Home during first-week setup. Complete a step, return to the tab, and exercise service unavailable, retry, and completion in EN and ES. Repeat with Manager. | The five-step count follows server evidence, links open the expected workflow, and the completed card leaves Home. Retry restores the current count. Manager sees their own Home and no setup card. | Browser and first-week fixture |
| TIME-03 | Early clock-in at the configured grace boundary and with the zero-minute default | Schedule matching uses the configured boundary. Existing workplaces retain the zero-minute default. | Clocker integration |
| TIME-04 | Open punch with no scheduled end just below, at, and above 12 hours | The warning appears only after the threshold. The punch stays open for review. | Attendance |
| TIME-05 | Offline or interrupted Clocker attempt, reconnect, and duplicate submission | A confirmed punch is recorded once. Unconfirmed or refused attempts show the correct recovery path. | Clocker integration and device |
| TIME-06 | Open Clocker on a short portrait handset and in landscape. Use its PIN pad with touch and keyboard, including a refused PIN, recovery, and a valid punch. | Heading, PIN state, keypad, and primary action are usable at each supported size. Errors clear appropriately and the valid punch records once. | Clocker browser and physical iPad |
| PAY-01 | Termination and hire dates, closed timecards, a correction, and payroll review | Authorization and applicability rules hold. Corrections reconcile to source timecards. Calculation and approval gates stay in force. | PostgreSQL and browser |
| PAY-02 | Puerto Rico Christmas bonus hours with finalized and unfinalized timecards | Only eligible finalized hours appear in the hours report. Validate period boundaries and the documented treatment of breaks. | Report integration |
| PAY-03 | As Owner, set and remove a location wage, record a zero, and schedule a future rate at workplace midnight. Replay a saved change after a lost reply and load the latest rates after a revision conflict. | Missing and zero rates display distinctly. Unselected locations retain their rates. History shows one durable change per confirmed intent. Manager gets a restricted screen and the wage APIs refuse reads and writes. | Browser and compensation integration |
| PAY-04 | Compare Owner Schedule's base scheduled pay with an independently computed fixture containing confirmed rates, missing rates, and a daylight-saving transition. Repeat with unavailable data. | Per-location hours, priced shifts, and included base pay reconcile. The UI identifies an incomplete estimate and lists its exclusions. A failed read presents the recovery path. | Browser and compensation integration |
| BILL-03 | Duplicate and out-of-order signed Stripe test events, and a lost Checkout response | One subscription and correct final access state. Older events cannot undo a newer valid state. | Commerce integration and hosted sandbox |
| BILL-04 | Unpaid trial expiry, recovery access, and cancellation at the intended date | Access and cancellation match the approved lifecycle rules in both Stripe and NEVORA. | Commerce integration |
| RONDO-01 | Owner and Manager access with reviewed data, empty data, and default-off features | Results use the intended company and role scope. Reviewed actions follow their existing approval gates. Default-off features stay off. | Phase E and Owner Advisor browser |
| OPS-02 | Fresh install and upgrade from the supported pre-release schema | Migrations run in canonical order. Existing data survives, and a migrated fixture still supports sign-in, scheduling, and timecard review. | Release PostgreSQL |
| OPS-03 | Liveness, provider or worker interruption, retry, and restoration of staging settings | Health and operational status match the expected state. Recovery leaves no duplicate side effects. Alias and temporary setting readback match the intended final state. | Owned services and protected staging |
| GUIDE-01 | Open each candidate PDF and reconcile the manifest's source and hashes. Follow the changed signup, PTO/Clocker, and Rondo steps using the applicable roles. | Six files open with legible text and navigation, match the distribution manifest, and describe the controls the candidate actually renders. | Documentation and browser |

## Browser QA and independent UI review

Use Chromium and WebKit against the same seeded candidate, at 320px, 390px, a tablet width and landscape, and 1440px. Keep physical mobile Safari and Clocker hardware in the hosted journey. Compare the candidate with the design system and approved references. Reuse the owned UI tools for axe, geometry, target size, contrast checks and load measurements where available. Keep preview login state and credential files private. [Design system](../../DESIGN.MD) · [Owned UI tools](../../scripts/ui-checks/README.md)

After starting the owned preview and writing the fixture login states as described in the UI tools README, run the read-only geometry and axe pass. Keep one process per preview and review every record in the generated report.

```bash
PLAYWRIGHT_RUNTIME_ROOT="$PWD/tools/ci-browser-runtime" \
  node scripts/ui-checks/checks.mjs --routes /app,/app/schedule \
  --accounts AUDIT-E,AUDIT-M --widths 320,390,844x390,768,1440 \
  --text 100,200 --browsers chromium,webkit --axe
```

| Case | Procedure and evidence |
|---|---|
| UI-01 Browser smoke and clicks | Open protected signup, login/recovery, Employee Home and schedule, Owner inbox/payroll and Clocker with the correct fixtures. Record URL, title, visible heading and first viewport, control action, expected next screen or durable state, and app console/page errors. Test Back, reload and redirect return. On the owned fixture, double-tap Save, dismiss a sheet mid-transition, and resume after network loss. Check focus, visible recovery and durable state after each action. |
| UI-02 Layout and visual regression | Capture the same fixture, route, locale, viewport, browser, fonts, and stable application state on candidate and approved baseline. Review EN/ES wrapping, sticky UI, loading/empty/error states, clipping, overlap and scroll traps. Include 200% text and capture a labeled before/after pair for each mismatch. |
| UI-03 Keyboard and axe | Run WCAG A/AA axe rules and check keyboard-only access, visible focus, labels, error links, dialogs and focus return on Escape or close. Confirm touch target geometry and manual rendered contrast. Record the selector and impact for each verified violation. |
| UI-04 Screen readers | On physical iPhone Safari with VoiceOver, and Windows/NVDA in a supported browser, run signup, recovery, schedule navigation, and approvals to the extent supported on each device. Record OS, browser and screen-reader version, reading order, accessible name, exact status/error announcement, and any focus loss. |
| UI-05 Performance and motion | Repeat matched cold and warm runs on the same production-built fixture, device and network. Record the measurement conditions and median timing for navigation, the first usable control and the action result. Collect LCP and CLS and record interaction timings or INP when available. Trace long tasks, forced layout, compositing and dropped frames on sheet open/close, Clocker feedback and auth motion. Confirm reduced-motion handling, pause behavior, and immediate exit under repeated interaction. Compare with the approved baseline and existing budgets. |
| UI-06 Usability | Ask a first-time tester to find their first shift, resolve a time-off decision and recover access using only on-screen cues. Record completion without coaching, first wrong turn, clicks or taps, timing, and the label or state that caused confusion. Use a fresh fictional account after each attempt. |

Independent UI and QA reviewers record VERIFIED, ISSUE, RISK, or BLOCKER with evidence and report their GO, GO WITH CONDITIONS, or NO-GO recommendation to Jose. Retain separate reviewer ownership and closure evidence.

## Operational evidence

- Query `GET /healthz` and `HEAD /healthz` on each expected host. Record 200, no-store, and the small liveness response. Verify dependency readiness through authenticated operator or worker status.
- For a held response or worker interruption, align application, control/workforce DB, worker and provider timestamps with the same redacted operation ID. Capture the first failing response, job status and retry count, accepted and duplicate delivery counts, durable record counts, and final readback. Record signup and company deployment IDs and the configured latency/availability alert result when applicable.
- During the staging window, use the existing request and worker telemetry to record success/error counts, p95 duration where the sample supports it, and queue age before, during, and after recovery. Use route templates and worker names for aggregate metrics. Keep operation IDs in redacted case evidence or trace links.
- Retain a redacted start/end settings snapshot with the run. Confirm public signup is closed and record final alias, recipient policy, worker, and capacity readbacks. Keep artifacts scoped to the attempt.

## Known results for the starting SHA

Release status is **NO-GO** while required CI, source inventory, and hosted/device evidence are open.

| Gate | Observed | Result | Owner |
|---|---|---|---|
| Required GitHub checks | Eight passed. The Owner Advisor business-answer browser test captured a WebKit access-control error for `/api/notifications`. The dependent `phase-d-attendance-ui` and `phase-e-evidence` checks failed. [CI](https://github.com/JoseK0514/NEVORA/actions/runs/44621619099) · [Mobile Access](https://github.com/JoseK0514/NEVORA/actions/runs/44621618873) | Failed | Release Engineering and Rondo |
| Development inventory | `check:development-sources` reports `Branch advanced: claude-codex-collab-nevora`. Reconcile the changed head and evidence before updating the recorded source. | Failed | Release Engineering |
| Onboarding manifest | Canonical manifest matches source. | Passed | Signup |
| Local owned onboarding | 253 of 255 tests passed. Activation queue rotation and provisioning retry after a transient read both timed out. The owned cluster was removed. The wrapper stopped before the remaining acceptance steps. | Failed | Signup |
| Focused unit tests | 123 passed across onboarding pages, Manager Inbox, and reduced motion. | Passed | Signup and Workforce |
| Guide bundle integrity | All six PDFs opened in the parser, matched their manifest hashes, and referenced an ancestor source commit. Workflow walkthroughs remain open under GUIDE-01. | Passed | Documentation |
| Local public browser smoke | Chromium at 390px and WebKit at 1440px opened sign-in and followed the recovery link with visible headings, correct page titles, and zero browser-reported errors. Local `GET` and `HEAD /healthz` returned 200. | Passed | Access and Operations |
| Local Mobile Access suite | The first attempt hit the host's WebKit library prerequisite. The separate exact-SHA GitHub Mobile Access run passed. | Blocked | Access |
| Local Owner Advisor WebKit retry | Timed out during sign-in navigation on a cold local build. GitHub reached the later notifications assertion. | Failed | Rondo |
| Local account-recovery retry | Eight Chromium fixture combinations passed. WebKit timed out waiting for the first recovery proof field to hydrate. | Failed | Access |
| Hosted and physical device matrix | Needs protected staging mapped to the candidate, owned approved inboxes and Stripe sandbox, and the physical device window. | Not run | Signup, Billing, Workforce, Operations, Device QA |

Reproduce the Owner Advisor failure with the isolated browser runner. Capture the first unexpected console/page error and compare the prior source before proposing a product or test fix. The dependent gates need a fresh successful run on the qualifying SHA.

The focused WebKit rerun on the starting SHA failed at the same final reload assertion with a native access-control diagnostic for the operational-authority GET. GitHub observed the corresponding notifications GET diagnostic. The candidate test uses the existing per-browser reload controls and GET witnesses to classify those events during the pending reload. Real window exceptions, unproven requests, and errors outside the reload still fail the case.

The two local onboarding timeouts passed in separate owned PostgreSQL runs at their original test deadlines. The activation queue case took 25.3 seconds and the provisioning retry took 2.35 seconds. Keep the original full-suite result with the two retries. Verify the full onboarding gate on the candidate SHA.

The candidate's inventory records the observed collaboration head and retains its held status. Use the existing `candidate/backend-completion/**` tag workflow to verify the new commit while preserving the branch head recorded by that inventory check.

On candidate `58be11dc`, GitHub passed the revised Owner Advisor business-answer test in Chromium and WebKit, full onboarding backend, and Mobile Access. The wider Owner Advisor gate recorded Chromium timeouts in business lifetime and weekly plan setup. CI validation found the old branch-list assertion and stale guide bindings. Keep these results attached to that tag when verifying its successor. [Candidate CI](https://github.com/JoseK0514/NEVORA/actions/runs/44633079927) · [Mobile Access](https://github.com/JoseK0514/NEVORA/actions/runs/44633079836)

The `a87826f6` handoff reports that a Manager with a grant at one location cannot publish that location through the current UI. Track this as an open ACCESS-06 blocker even when GitHub checks pass. The handoff also identifies open typed-refusal behavior for corrections and time off. [Owner and Manager handoff](../handoffs/2026-11-19-claude-owner-manager-controls.md)

On the updated scope, 27 focused unit tests passed. The branch push's durable commerce job timed out while installing the fictional `SELF_SERVICE` company. The exact case passed in isolation in 2.57 seconds with its original five-second deadline. Check the full onboarding gate on the qualification tag. [Collaboration CI](https://github.com/JoseK0514/NEVORA/actions/runs/44635911252/job/135954238714)

```bash
NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE="$NEVORA_QA_ROOT/owner-advisor" \
  node scripts/payroll-postgres.mjs vitest.owner-advisor-browser.config.mts \
  src/test/integration/owner-advisor-business-answer-browser.integration.ts
```

## Run a case and capture the result

For each critical write, test the normal path, a refused attempt, a failure before saving, and a saved operation whose response was lost. Use the same operation ID when testing the recovery contract. Read the resulting state independently of the original response. When the write has a provider side effect, compare the application record, durable record, and provider or inbox record.

Use this format in the release handoff.

| Case ID | SHA and deployment | Fixture, role, browser/device | Expected | Observed | Result | Evidence | Owner |
|---|---|---|---|---|---|---|---|
| `SIGNUP-03` | Fill at run time | Fictional Workplace A, Owner, Safari | One operation, workplace, Owner, and provisioned resource after retry | Fill at run time | Not run | Redacted operation receipt and record counts | Signup |

Use **Passed**, **Failed**, **Blocked**, or **Not run**. A failed attempt and its retry get separate records. For failures, attach the first incorrect result, backend or provider state, and reproduction details. For blockers, name the missing access or dependency and the person who owns it. Keep session tokens, passwords, proof fragments, email links, and unrelated personal data out of artifacts.

## Run cadence and acceptance

| When | Reuse in NEVORA | Completion condition |
|---|---|---|
| Every change | `npm test` with focused files, typecheck and lint, and the affected owned database or browser suite | Changed behavior and its failure path pass. |
| Nightly | `test:clocker:owned`, `test:release:postgres`, `test:phase-e:sql`, `test:phase-e:ui`, `test:mobile-access:owned`, `test:passkeys:network`, `test:payroll:owned`, and `test:commerce:owned`, selected and run in their owned environments | Run the broad regression matrix. Track failed, blocked, or uncovered rows against an owner. |
| Release candidate | GitHub’s ten protected checks, `check:development-sources`, `check:onboarding-manifest`, and hosted and device evidence for the candidate’s release scope | Mandatory cases pass on the release SHA and relevant staging deployment. A reviewer verifies the evidence and cleanup. |

The release reviewer checks that each critical part of the customer journey has evidence and that any applicable hosted or device case has an actual result. A defect in workspace isolation, access, money movement, timekeeping, or required recovery blocks the affected release scope. Use the repository’s existing approval process for any exception. Record hosted sandbox readiness and live Stripe readiness separately.

End every hosted window by restoring temporary mail, worker, admission, and capacity settings to the recorded values. Verify the final alias bindings and public closed state. Keep sanitized evidence from the test and its cleanup together.
