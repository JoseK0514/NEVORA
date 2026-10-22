# Development CI consolidation — October 22, 2026

Jose authorized one development PR combining approved changes, repairing CI, and
one complete cloud verification of the final candidate. Production remains held.

## Source reconciliation

Base: freshly fetched `origin/development` at
`0f8ffee52d85f48cd2fe890dc9aa682e995de4eb` (PRs 15, 21 and 22 incorporated).
`npm run check:development-sources` passed with 49 classified remote branch heads
before assembly. The existing source inventory remains the scope authority.

- PR 14: exact head `985c8a7a` is already included in development.
- PR 13: exact head `c3fcc75f` is already included. Its draft production target
  does not authorize a main merge or release.
- PR 12: `c6b2db6a` is superseded by the incorporated, newer release controls.
- PR 11: `7ed42652` remains a historical governance reference. Current repository
  governance remains authoritative; this CI repair does not amend review policy.
- Previously held sources remain held. No application branch is silently added.

## Work and evidence ledger

- [x] Fetch origin, preserve shared checkout, reuse clean attached worktree.
- [x] Reconcile open PRs with the development assembly inventory.
- [x] Obtain actual attempt-3 failure logs and browser failure artifacts.
- [x] Stop unchanged attempt 4 after the Home failure recurred, saving remaining
  runner time while the repaired candidate is prepared.
- [x] Implement cause-based contrast, navigation, login, Inbox readiness,
  timecard-sheet focus, inactive-workspace and communication-cap repairs.
- [x] Preserve mandatory SQL/browser coverage, source custody and final evidence
  rejection; reduce duplicate and obsolete candidate executions.
- [x] Run affected lightweight regressions and scoped lint; inspect the diff.
- [x] Publish development PR 23; each corrected commit supersedes its older run.
- [ ] Record actual full-cloud results; failed/skipped/cancelled is not acceptance.

## Boundaries and ownership

Codex owns repair and verification. CTO requires cause-based fixes; CISO requires
unchanged live authorization and private-view lifetime controls; Governance
requires every existing mandatory test and evidence gate. Independent findings
are not self-closed. No production deployment, main merge, hosted database change,
real notification, payroll/legal wording change or review-policy waiver is part
of this work. Any remaining release approval belongs to Jose.

## Repairs and verification

The contrast helper bounds implicit and multi-stop sRGB gradients conservatively,
including every stop, while rejecting stacked images and unsupported paint. It
retains all four native interaction states and the existing 4.5 threshold.
Next's development badge is positioned through its documented configuration,
removing a dependency on the development preferences menu. Communications login
waits for navigation commit, the authenticated portal shell, and network idle.
No browser timeout was increased.

Inbox compares the complete canonical key set after a current ready render, and
the keyboard timecard journey checks focus inside the actual named detail sheet.
The inactivity fix distinguishes an explicitly disabled workspace from an unreadable
database; missing schema/read errors still remain unavailable. The cap fixture
publishes one real announcement, then seeds 100 additional schema-checked immutable
revisions and matching grants in its disposable database before checking all 101
sources and the existing 100-row partial response. Its 30-second budget is unchanged.

Feature candidates now run on PR events, while development/main retain push
verification. New commits cancel only superseded runs on the same PR. All 12 jobs,
70 Phase E cells, SQL suites, unit/type/lint/build/audit steps and evidence checks
remain. Existing npm caching is retained. Browser caching is omitted because
[Playwright advises against it](https://playwright.dev/docs/ci#caching-browsers):
restoration costs comparable time and Linux system dependencies still need installation.

Local evidence is limited to fast regression work: 38 affected Vitest tests,
72 release-engineering checks, six inventory regressions, scoped ESLint and the
50-source inventory passed.
The full cloud run is the acceptance gate; browser and SQL repairs are not yet
verified on the final candidate. The earlier intermittent account-replacement
WebKit runtime error remains fatal and its existing remediation case must execute.

The PR description and linked GitHub run record the final published candidate,
actual cloud results and remaining blockers without adding a docs-only CI rerun.

## First cloud candidate: remaining contract reconciliation

Run 39782282770 on merge candidate `6b1011dc` passed Phase E SQL (including
the cap fixture in 8.3 seconds), release PostgreSQL, Clocker PostgreSQL, and
Communications 14/14 with zero runtime errors.
Whole Phase D passed the repaired Inbox and timecard-sheet journeys, then reached
a later obsolete recovery assertion. The incorporated `4b582b65` and its existing
component regression explicitly retain the selected reference across an access
refresh and re-read the immutable receipt on return. The browser driver still
required discarding that reference and forbade the read. It now exercises the
current contract with the real fresh read held: blur clears private receipts,
the held response cannot reveal them, the reference survives, the returned read
must be authorized, no clock punch is sent, and the immutable ledger is unchanged.
No production behavior or privacy lifetime was weakened for this reconciliation.

The first full units ran 9,297 passing cases and found ten legacy push-trigger
expectations in `phase-e-runner.test.ts`. All ten cases now test PR routing instead,
each requiring every mandatory job and rejecting a duplicate feature push.
The focused trigger subset passes 20/20. Remaining full-source verification must
run on the corrected candidate; the earlier red result cannot certify it.

The post-freeze `NEVORA-50-inspectors` branch is now explicitly classified as a
reference in the source inventory. Its 409-file documentation-only diff was
checked through GitHub's paginated commit API; its findings are not self-closed.
The updated 51-source reconciliation passes. The existing Clocker component
contract and the corrected trigger cases pass 25 selected tests; scoped lint
and whitespace checks pass. A single corrected PR candidate supersedes the
unfinished first run; its full fresh verification remains required.

## Shared sign-in fixture isolation

The next run, 39784597895 on `1d73100d`, reproduced the Communications WebKit
430 seed timeout. Its screenshot shows the actual sign-in rate-limit message;
the runtime error list is empty. The ten-attempt, fifteen-minute account limit
explains why the shared QAOWNER account fails at cell eleven when the suite
finishes that portion inside one bucket, but passes across a bucket boundary.
Each Home, Communications and Navigation browser cell now receives its own
fictional Owner with real credentials and ordinary authorization. The production
limiter is unchanged. A real PostgreSQL regression verifies distinct Owner
identities and credentials, ten accepted attempts, rejection of the eleventh,
and an independent first attempt for the next Owner.

Home and Attendance in that run also failed before execution: the Ubuntu mirror
download took more than the existing eight-minute browser installation bound.
Those are setup failures, not successful test execution. No test or setup timeout
is extended. The affected runtime diagnostic regressions pass 141/141 locally,
and scoped lint passes; SQL and all browser cells still require cloud execution.

That run passed all 9,307 unit cases (with the pre-existing 801 skips), then
typecheck found an untyped aggregate count in the new cap fixture. The count
assertion now compares the complete returned row without accessing an unknown
property. Navigation reached the clean Requests hub, then waited for the obsolete
global document title. Its accessibility checks now require each route's actual
metadata title before running the same complete axe rule set.

## Hosted dependency download repair

Run 39787329289 reproduced the same eight-minute browser installation timeout
in Communications before any cell executed. Home and Attendance installed on
other runners, confirming that this is a variable hosted mirror download path.
Browser jobs now prefer `https://archive.ubuntu.com/ubuntu/` in GitHub's existing
mirror inventory, with the existing security archive and Azure mirror retained
as fallbacks. The helper accepts only that known three-mirror inventory and runs
only as root on a GitHub Linux runner. It does not edit repository definitions,
keyrings, signature verification or timeouts. The priority format is verified
against [GitHub's runner image configuration](https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/configure-apt-sources.sh).
Three local regressions verify preference/fallback preservation, refusal of
unexpected inventory, idempotence and refusal outside Actions; scoped lint passes.

The same candidate passed complete validation (units, types, repository lint,
production build and both audits), all three PostgreSQL jobs, and whole Phase D
(201 checks, zero runtime errors). Remediation then hit `/login?error=busy` in
WebKit's malformed-response case because Chromium had already used the same
RV-E1 account's budget. Each engine now has a fresh owned application/database;
the account/session replacement, late response and immutable mutation assertions
are retained. The new sign-in-budget regression now calls the password form's
always-active `admitLoginAttempt`, rather than the separate passkey-gated limiter.
That adjustment still requires real PostgreSQL execution on the final source.

Calendar stopped in its WebKit 430 sign-in wait after ten cells passed. Its
runtime error list is empty and its original receipt lacks the sign-in page, so
the cause is not established. Its wait now uses the navigation commit followed
by the rendered authenticated shell and ready current reads. A failure captures
the pre-issuance page plus a scrubbed route/error-enum diagnostic, without raw
URLs or calendar capabilities. No retry or larger timeout is introduced.

Home completed thirteen cells, then its final WebKit 1440 cell recorded the
native `notification-read` diagnostic during H11's intentionally interrupted
My Time request. H11 now waits for the unrelated notification bell's current
read before leaving, just as H08 already does. The My Time response remains held
through actual hard navigation; late-response/privacy assertions and all runtime
error rejection remain unchanged. No diagnostic is newly classified as harmless.

Navigation passed 320/375 and reached 390's saved weekly availability deadline
case. Its screenshot shows the correct locked submitted state; the driver still
waited for obsolete copy. It now requires the actual deadline message and
`Locked · submitted`, then checks the same disabled controls and unchanged SQL
records. These updates join the mirror fix in the same development PR.
