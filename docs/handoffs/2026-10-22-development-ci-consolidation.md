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

## Foreground timecard review after another account view

Run 39791567520 on `33b41c0f` cleared browser installation on all initial runners
and passed Phase E SQL, including the actual always-active sign-in limit. Its
Communications browser report has 14 passing cells and zero runtime errors.
Whole Phase D passed 122 checks before WebKit timed out at the second approval
in its detail sheet. The driver had opened the Lead page, then acted on the
background Manager sheet. Timecards intentionally clear their protected read
and close the sheet on blur. The driver now returns the Manager to the foreground,
loads the same current period, and explicitly reopens its sheet before approving
and finalizing. No product privacy behavior changes. Eleven selected existing
timecard privacy/focus/sheet regressions and scoped lint pass locally. The
remaining matrix is being collected before publishing this final driver correction;
its matching full cloud verification remains required.

## Notification bell lifecycle regression

The bell-ready wait alone did not resolve the final Home WebKit 1440 diagnostic
on `33b41c0f`: it again recorded a native notification-read error just after the
Schedule document committed. Inspection found the bell unconditionally paused
and restarted its protected fetch on duplicate foreground focus/pageshow events.
A new regression reproduced the unnecessary abort/restart on the original code.
The bell now tracks whether its view is active, following the existing timecard
pattern. Duplicate foreground events retain the current request; real blur,
hide, offline, unmount and explicit notification changes retain their fences.
Seven new lifetime regressions and six existing notification-panel tests pass.

Home adds an actual held authorized notification GET: it must stay one request
across duplicate foreground events, remain loading until release, and return a
current successful count. The existing held My Time hard-navigation journey and
all runtime-error rejection remain. This is an application lifecycle correction,
not a new diagnostic exception, and still needs matching cloud browser proof.
Calendar, Communications and Attention completed all fourteen cells each on
`33b41c0f`; validation and all three SQL jobs are green. The completed run failed
Attendance, Home and Navigation, so neither downstream evidence gate passed.

## Exact contrast diagnostic without another full candidate run

The completed candidate also passed Attention 14/14, leaving the three reported
primary failures (Attendance, Home and Navigation). Navigation's WebKit 375
Requests check found `color-contrast` after eight passing cells, with no runtime
error, but omitted the node detail. Optional cloud run 39797352478 on
`codex/browser-probe-20261022` at `77359b74` records axe target selectors and
contrast values without HTML, content or raw URLs. It reuses the established
probe-workflow pattern on its own branch; no additional PR or mandatory CI run
is created. Its source is classified as reference only. Its result is diagnostic
evidence and cannot certify the development candidate.

That diagnostic passed Requests contrast at WebKit 375, then found a later WebKit
1024 DOM-commit race immediately after a synthetic blur. Navigation now waits
for the cleared DOM and still asserts zero private rows before any refocus/read;
its separate synchronous abort and held-response fences stay unchanged.
The detailed axe projection is retained for every checked page. No contrast rule
or threshold is removed, and no visual correction is inferred from a passing
sample. Optional run 39799596894 at probe head `4806c387` repeats the WebKit 375
scenario in seven fresh owned applications to capture the intermittent contrast
finding. The 52-source inventory reconciles this updated reference head.

That repetition captured two Requests failures across seven isolated cases, all
with zero runtime errors and closed owned applications. Axe measured secondary
labels at 3.4–3.7:1 and the status tag at 3.7:1: unrelated sheet children were
faded together. The approved `data-sig-sheet` entrance starts at opacity zero
and lasts 280 ms (180 ms with reduced motion); screenshot/network readiness
does not guarantee its completion. Navigation now waits for the actual sheet's
computed opacity of one and finite entrance animations to finish before running
the unchanged axe rule set. It records before/after animation state beside the
detailed axe evidence. No product color, motion, threshold or timeout changes.

Optional probe `c1c10a67`, run 39801825674, passed the helper against the actual
stylesheet in both motion modes: a paused, partially faded sheet must keep it
pending; playing the animation must finish at opacity one. It then repeats the
seven isolated WebKit 375 cases: all seven passed, zero runtime errors, all owned
applications closed, and source unchanged. Actual sheet opacity before the wait
ranged from zero to 0.999927; every audit ran at opacity one with no remaining
entrance animation. The controlled paused samples were 0.727373 (normal motion)
and 0.871027 (reduced motion), and both stayed pending until actually played.
This is diagnostic proof only; the corrected
development candidate still requires all 12 mandatory jobs and 70 Phase E cells.

## In-process dependency copy

Run 39803771982 on merge `616b8baa` failed Home before any browser launch or
cell execution. Its supervisor receipt independently observed PID 5802 with the
same birth, parent and process group but a changed command hash. The expected
hash `26eb8f31…` exactly matches the owning Node browser-driver command; the
observed hash `cd018fd3…` exactly matches the fixture's `cp -R` command and its
captured mirror path. This proves the fork/exec startup observation race on the
long-running dependency copy, without recording command arguments in artifacts.

The fixture now copies dependencies with Node's in-process `cpSync`, using
recursive copy, verbatim relative symlinks and optional filesystem reflinks.
The complete process supervisor and all identity/ancestry/marker/signal checks
remain unchanged. The regression failed with the existing external helper and
passes with real nested files, executable modes, relative links, independent
bytes and missing-source refusal. Four focused copy/path tests and scoped lint
pass. All heavy verification remains in GitHub Actions; the current run is being
collected before publishing another combined correction.
API semantics: [Node 24 filesystem copy](https://nodejs.org/docs/latest-v24.x/api/fs.html#fscpsyncsrc-dest-options).

## Remediation landing-read readiness

The same run passed whole Phase D, all 14 account-replacement remediation cases
(both engines, zero runtime errors), and all six missing-context functional cases.
The missing-context report then failed its unchanged runtime-error gate on three
WebKit native fetch errors: Manager today, action-center and clock-monitor. Its
context helper returned at the login URL transition, before those landing reads
completed, then the case navigated to Attendance. The helper now observes the
three actual read responses before sign-in submission, requires status 200 and
completed response bodies, records their bounded paths/statuses, and waits for
the rendered authenticated shell and network idle before returning. No runtime
error is ignored, and the canonical successor, stale-baseline, history, 409 refusal
and immutable-leaf assertions remain. D2 and Clocker browser steps did not execute
after the remediation failure; final matching-source execution is still required.

Navigation in that run passed the formerly failing WebKit 375 contrast cell, then
WebKit 390 timed out in its old login helper waiting for the page `load` event.
Runtime errors were empty and all prior authority/account-replacement checks
had passed. It now uses the same navigation commit, authenticated shell and
network-idle login contract already proven by Communications/Calendar, with
bounded route/error-enum and pre-issuance screenshot diagnostics on failure.
Its timeout, role/view-binding checks and persisted workflow assertions remain.

Optional run 39807029737 on reference probe `0a300352` exercises the complete
Home matrix with in-process dependency copy, followed by the missing-context
case with its actual three-response landing barrier. Probe-only modes/workflow
remain excluded from the integration PR. Results still need collection before
the next combined development candidate and its complete mandatory verification.

The full run finished failed at 15:50:30 UTC with validation, all three SQL jobs,
Communications14, Calendar14 and Attention14 passed. The three primary failures
above caused both downstream gates to fail. It is supporting evidence only.
Optional Navigation probe `3190f661`, run 39809005671, exercises the actual
WebKit390 sign-in/account/authorization/form-persistence journey with the updated
login helper while the Home/missing-context diagnostic continues separately.

That Navigation probe passed all 21 checks, all five sign-ins reached the current
authenticated shell, runtime errors were zero, the app closed and source was
unchanged. The focused Home run passed twelve cells and reached WebKit1024's
final complete-zero sign-in, where the same legacy `load` wait timed out with
runtime errors empty. Its H11 held notification and early-navigation assertions
had already passed in that cell. Home now uses commit/shell/network-idle sign-in
with bounded diagnostics too; no timeout increase. The missing probe exposed an
incorrect GET-only matcher in the new barrier: Action Center uses POST for its
read. The matcher now uses GET/POST/GET as implemented by the three components,
records each successful completed response independently, and preserves all
functional/runtime assertions. Reference probe `5f0515e2` targets the remaining
Home WebKit1024/1440 cells and the corrected missing-context case before final
publication. No failed diagnostic is counted as acceptance.

Probe 39810397969 passed Home WebKit1024 (all 15 journey checks, errors zero),
and the corrected missing-context suite passed all six checks across both engines,
zero runtime errors, with six successful completed GET/POST/GET responses.
Home WebKit1440 failed its initial loading assertion: the new login helper waited
for network idle while H01 deliberately held the Home response, spending the
client's existing ten-second read deadline. Its screenshot shows the correct
unavailable state after expiry, not private facts. H01 now ends sign-in readiness
at commit plus rendered authenticated shell and then checks the actual held
loading state; subsequent sign-ins still require network idle. Every loading,
private-row, recorded-time and release assertion remains. Reference `19b61586`
repeats only the two final Home sizes; passed missing-time checks will next run
again within full mandatory CI. Diagnostic screenshot globs now select only
scenario output files, excluding copied application assets.

Run 39811827659 on `19b61586` passed both final Home sizes, all 15 journey checks
per cell, zero runtime errors, source unchanged and both owned applications closed.
The candidate's Home/Navigation/missing-context drivers, dependency copier,
notification bell and sheet readiness helper exactly match that probe source.
All 52 branch heads are reconciled after fetching origin; scoped lint and
whitespace checks pass. The corrections are being published together to PR23;
only its following complete, matching-source mandatory CI can certify the result.

## Current full-source sign-in diagnostic

Candidate `52bc0821`, merge `c564e31b`, full run 39812884979 passed Phase E SQL,
whole Phase D and remediation, then reached D2. Home passed ten cells and failed
WebKit430 during the second-account sign-in at H10: navigation commit timed out,
runtime errors were empty, and the original Home correctly cleared former-account
facts. The current artifact captured the primary page, but not the other page's
bounded route/error detail. Home sign-ins now emit a dedicated captured report
containing only stage, elapsed times, static route classes, HTTP methods/statuses,
redirect presence and request/navigation events; no actors, credentials, cookies,
headers or arbitrary URLs. This is diagnostic instrumentation, not a claimed fix.
Reference `f4a7eaf2` repeats WebKit430 in seven fresh owned applications to obtain
the actual sign-in transport evidence before choosing an application or harness
correction. Other current full-source jobs are still being collected.

The completed `52bc0821` run also passed release SQL and all 14 Communications,
Calendar and Attention cells. Its 9,316 unit tests passed, but types rejected the
new copy test's captured nullable global path. A local constant fixes the closure
type without a cast; both tests still pass, and cloud typecheck 39817453776 on
`a7da650c` passed with source unchanged. Lint/build/audits did not run past the
type failure on this candidate. Seven isolated Home430 repetitions (39815878309,
`f4a7eaf2`) passed all 35 sign-ins, zero runtime errors, source custody and cleanup.
The Home driver now requires actual current `/app` plus a visible authenticated
shell after the native click, retaining bounded transport receipts; it no longer
uses a separate navigation-event promise as the arrival oracle. Deliberately held
initial reads remain inspected before network idle. No timeout increases.

Navigation passed Chromium, then WebKit320 caught the development badge between
visibility and a null bounding-box read. The driver now samples the current
visible shadow-root button and its top-position rectangle in one bounded wait,
keeping the same `y < 100` assertion and recording its measured bounds.

D2 reached 67 checks, then its repeated `D2-E` password sign-ins hit the real
limiter at `/login?error=busy`. Each engine now has a fresh owned app/database.
Only non-identity response-loss setup reuses cookies from real completed fixture
sign-ins, held in memory; every reuse must pass current server authorization with
status 200. Explicit sign-out/account-switch/new-login and authority-loss tests
still perform fresh native sign-ins. No bucket is cleared, limit changed, token
manufactured or server gate bypassed. The sign-out journey follows the approved
Profile/Session control rather than the removed More-menu action; all request,
same-operation, stale-response and immutable-ledger assertions remain.

Clocker SQL never executed: Ubuntu's Azure mirror stalled package setup until
the unchanged 30-minute job limit cancelled it. The existing guarded official
mirror preference now precedes PostgreSQL installation in all three SQL jobs,
retaining both fallback mirrors and signature verification. A new CI regression
failed before this change; all 76 release-engineering checks now pass locally.

Reference `33de992d`, run 39819902970, verifies the four remaining surfaces in bounded cloud jobs:
the shared-server Home14 matrix; complete D2 correction/recovery and identity
journeys in both engines; Navigation WebKit320; and Clocker SQL plus browser
lifecycle/recovery. No diagnostic is a substitute for complete matching-source
mandatory CI on PR23. Production remains held.

The preceding optional `6e354c4a` diagnostic never started jobs: GitHub rejected
the runner context in job-level environment values. The actual annotation names
lines 19/21/23 and `runner.temp`. The corrected diagnostic sets those directories
in a step through `GITHUB_ENV`; Home and D2 runners started normally, with
Navigation and Clocker queued under the two-job concurrency cap. This optional
workflow is excluded from PR23 and does not alter its required gates.

D2 in run 39819902970 passed 238 checks, including both engines' uncertain-command,
account-switch and authority-denial cases, with zero runtime errors and 44 successful
server-authorized real-session reuses. WebKit then timed out locating the Manager
approval control for its keyboard audit after the lengthy Employee reflow journey.
Both contexts reported `hasFocus=true`; the report captured aborted Attendance and
Inbox reads, but omitted the Manager's final DOM state. The keyboard setup now
records that state, reopens the real current Attendance route after bringing it to
front, waits for the authorized queue, and keeps the actual focus/outline assertion.
The separate subsequent offline/hidden/pagehide/late-read/authority-loss checks
remain unchanged. Any failure now also captures the Manager state and screenshot.
Reference `953cebbc`, run 39821785620, reruns only full D2; the original run's Home,
Navigation and Clocker continue without duplicate execution.

Navigation WebKit320 in 39819902970 passed all 14 checks with zero errors, one completed
sign-in, measured badge geometry, real-stylesheet normal/reduced-motion readiness
regressions, unchanged source and closed owned app. Home's seven Chromium cells
passed, then WebKit320 completed all sign-ins but failed the fatal runtime check:
the exact native notification-fetch access-control diagnostic arrived on Schedule
591ms after the hard-navigation commit, outside the existing narrow pending-
navigation classification. It remains fatal. Reference `6d16a7c4`, run 39822296715,
adds bounded document-identity/lifecycle and notification-request tracing across
three Home320 repetitions. No new classification or runtime exemption is added.

D2 run 39821785620 on `953cebbc` passed all 282 checks across Chromium/WebKit,
with errors empty and owned cluster stopped. The Manager queue keyboard setup,
all response-loss/identity/authority tests and all remediation states executed.
The Home trace's three fresh applications passed with errors zero, source
unchanged and cleanup confirmed. Those successful notification reads started
after the Schedule document's `pageshow`. The warm shared-server discrepancy
still needs reproduction; reference `24c56d47`, run 39823552701, traces three
WebKit sizes against one shared application without a classification change.

That shared run passed all 15 checks at 320/375/430, errors zero, source unchanged
and owned app closed. The original native error is intermittent and its exact
trigger is not established by these successful repetitions. H11 now also waits
for Schedule's actual current notification read before returning to Home, recording
the ready route/state; network idle alone is not proof of completed hydration.
The original My Time response remains held through the hard navigation and every
runtime assertion remains fatal. Reference `4f2d622d`, run 39824553914, verifies this
barrier in the shared three-cell diagnostic and runs the full Clocker browser
suite independently of the long SQL suite. Full matching-source CI remains required.

The original combined Clocker diagnostic reached its optional 20-minute job bound
during still-progressing SQL tests, so it is cancelled and not acceptance. Its
mirror mutation/inventory rejection controls and 76 release-engineering checks
had passed. Mandatory Clocker SQL retains its existing 30-minute job budget; the
independent browser target in 39824553914 avoids coupling that proof to this
optional diagnostic bound. No test/job timeout in the required workflow changes.

Run 39824553914 on `4f2d622d` passed both focused targets. Shared Home320/375/430
each passed 15 checks, errors empty, actual Schedule notification state ready,
old held response outcome `document-left`, source unchanged and owned app closed.
Clocker passed all 90 browser checks in Chromium/WebKit, errors empty and owned
cluster stopped. These supporting results, full D2's 282 checks, Navigation320,
cloud typecheck and the 76 lightweight release regressions precede publication
of the combined correction to PR23. Only its full following matching-source
mandatory workflow can certify development readiness.

## Independent recorded-time readiness and stage instrumentation

Full run 39825708729 on PR head `e107f79f` / merge `d7e9c3a9` passed Phase E SQL,
but Home failed Chromium768 at H11 before clicking Refresh recorded time. Its
screenshot shows recorded time unavailable, runtime errors empty, and every
sign-in ready. Home readiness did not establish that the independent recorded-
time controller had completed its current read after lifecycle refresh. It now
foregrounds the page and checks actual OFF_CLOCK state plus an enabled refresh
control before installing the held-response route; native focus is also settled
before the hold. A controlled regression keeps Home ready while recorded time
is still loading and then keeps its control disabled; neither may release the
new wait. The actual existing My Time hold, navigation and runtime assertions
remain. `cb09d631`, run 39827424092, exercises the full shared Home14 matrix and
both engines' controlled readiness regressions.

That full run's units also found one real instrumentation-order regression:
9,315 passed and one failed because lifecycle setup called exposeBinding before
the existing stage-listener guard test reached its intentional stop. The fatal
page-error listener now registers immediately after its stage reader, before
diagnostic bindings. The original assertion is unchanged; it failed locally
before the correction and the entire 141-case runtime suite passes afterward.
Remaining jobs on the known-failed full candidate were cancelled to save runner
minutes. Cancellation is not a pass; every mandatory check remains required on
the next complete corrected source.

Home run 39827424092 passed 13 cells: all seven Chromium sizes (including the
formerly failing 768) and WebKit320/375/390/430/768/1024. Its optional 20-minute
job cap cancelled the last WebKit1440 cell before completion, so this remains
partial evidence. The required Home job retains its original 50-minute budget.
No optional or required timeout is raised, and the following full mandatory run
must execute all fourteen Home cells.

Run 39829897689 at `8c686c0f` passed all 141 runtime-observer regressions in the
cloud plus both engines' controlled Home and independent recorded-time readiness
regressions. Both negative recorded-time phases stayed pending; only actual
OFF_CLOCK plus enabled refresh released the wait. Both browsers closed, source
was clean and unchanged, and the corrected Home/control files exactly match
the pending integration correction. This supporting evidence does not substitute
for complete matching-source mandatory CI.

## Newly reviewed dependency advisories

Run 39830658700 on `ed29e7d4` / merge `3e94d26b` passed all three SQL jobs,
Communications14, all 9,316 unit cases (801 existing skips), types, repository lint,
configuration regressions and the production build. The production audit then
failed for Next 16.3.8. Remaining jobs were cancelled to save runner minutes.
This is partial verification, not acceptance of the next dependency set.

GitHub's reviewed advisory database added the Next cache-function RCE entry at
2026-10-22T16:42:31Z. The upstream [security release](https://github.com/vercel/next.js/releases/tag/v16.4.1)
fixes that RCE, the SVG image-optimization RCE and Server Action denial of service.
The candidate now pins Next 16.4.2, the following [patch release](https://github.com/vercel/next.js/releases/tag/v16.4.2).
The existing Node 24.19.0 and React 19.3.0 satisfy its published requirements.
Vitest is pinned to 5.0.5 to resolve both reported mocker advisories, whose
[fix begins at 5.0.3](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8).
No audit threshold, advisory exclusion or release control changes.

Exact Next version checks and generated-type-reference provenance now require
16.4.2; they do not accept a version range or the vulnerable runtime. A coherent
16.3.8 build/receipt rejection regression failed before the change and all 23
binding checks pass afterward. Six affected complete-byte manifest rejection
cases and scoped lint pass. The published Next tarball confirms the same two
generated type imports, development-badge hook/label and top-left configuration.
The development-only ESLint forks retain their actual 16.3.8 provenance; their
bytes/hashes are not relabeled or replaced by this runtime patch. The isolated
startup fixture remains unused and is not production activation.

The lockfile was generated with install scripts disabled; both production and
full lockfile audits report zero vulnerabilities. Local installed Next/Vitest
remain the earlier versions, so these lightweight checks are not execution proof
of the patched runtime. Full fresh cloud installation and every mandatory check
on the published dependency candidate remain required. Production stays held.

## Clocker device dialog hydration

The patched-runtime full run 39834916398 at `c9f71141` / merge `f7a8942f`
passed Phase E SQL and D1.3's 46 browser checks. Whole Phase D passed 82 Chromium
checks, then timed out filling Device name after Add device was clicked. The
failure screenshot shows the correct Clocker devices page with no open dialog;
the accessible field label agrees with the driver. Remaining jobs were cancelled
to save runner minutes. This run is not successful verification.

The server rendered Add device enabled before its client dialog handlers were
available. Two new server-rendering regressions failed on that behavior before
the correction. All device dialog entry buttons now wait for hydration using the
same external-store pattern as existing recovery controls. The active-location
restrictions, native dialog behavior, form fields, timeout and setup-code
assertions remain. All five existing component tests are preserved; all seven
component tests and scoped lint pass locally using the previously installed
runner. No local framework server or browser suite was started.

Focused cloud run 39836578478 on diagnostic source `47735441` tests actual delayed
JavaScript in Chromium and WebKit, then requires the enabled native Add device
button to open the correct dialog, accept name/location, cancel, and open again
from the keyboard without runtime errors. The source uses the same dependency
patch and component correction. It is supporting evidence only; the complete
matching-source mandatory workflow remains required after the final correction.

That focused run passed: each engine held 30 actual JavaScript requests, observed
the disabled Add device button and no dialog, then filled the native name and
location controls after release. Cancel and keyboard reopening passed; runtime
errors were empty. Both browsers and the owned app closed; source was clean and
unchanged. The component bytes match the correction being integrated. Results
are in the run's `development-ci-probe-47735441b6ba199426b4d5c4b1a23bf95fa9700b-home-trace`
artifact, `diagnostic-home-trace/probe-report.json`. The probe workflow and entry
point remain excluded from the integration PR. Every mandatory final-source
check is still required.

## Complete patched-runtime run and remaining browser repairs

Run 39837218227 at `01457412` / merge `b951cb2c` completed with eight successful
primary jobs: validate, Clocker/release/Phase E SQL, full Attendance, Home14,
Communications14 and Attention14. Validate passed 9,318 unit cases (801 existing
skips), types, repository lint, production build on Next 16.4.2, and both audits
with zero vulnerabilities. Its build receipt has clean unchanged source, exit0,
Node24.19.0, npm11.17.0 and the exact integration lock hash. Attendance also passed
the remediation source-bound validator and complete D2/Clocker browser stages.

Calendar passed seven Chromium cells, then WebKit320 timed out clicking Copy
link after the first completed clipboard confirmation. Its runtime-errors array
is empty. Navigation passed nine cells, then WebKit390 recorded one native
authority-read diagnostic 15ms after a document commit, outside the current
exemption. Its functional checks completed, but the runtime observer correctly
failed the cell. Aggregation and final evidence failed downstream. This run is
not acceptance of this or any later source.

Focused Calendar run 39840993385 at `5999fc22` passed all seven Chromium sizes
and WebKit320/375/390 with 12 checks each and zero runtime errors. Read-only
geometry samples captured the Copy button's real 0.98 press scale returning to
normal, and feedback focus/scroll changing after the copied text appeared. A new
driver wait requires the actual feedback container to own focus and the button's
finite animations to finish before the next native Copy click. The controlled
clipboard completion/rejection, private-URL retirement, native keyboard selection,
timeouts and pointer actions remain. A controlled regression holds real CSS motion
and focus independently in both engines and both motion preferences. It is being
verified in cloud run 39842149858 at `11021bec`; no success is assumed yet.

An earlier focused Calendar attempt, 39840360242, stopped before any scenario
because the diagnostic mistakenly invoked the WebKit-specific navigation control
in Chromium. The corrected diagnostic treats all runtime errors as fatal and
does not run that unrelated control in Chromium. Mandatory navigation-control
behavior and classification have not changed. Those diagnostic-only entry points
remain excluded from this PR.

Focused run 39841685356 at `16d2d45c` is tracing the actual WebKit390 Navigation
authority request's document, lifecycle and stage. Its first isolated case
reproduced a fatal error; the remaining cases and bounded trace are pending.
No runtime-error exemption has been broadened. Source-bound mandatory acceptance
still requires all 12 jobs and all 70 cells on the next corrected candidate.

Run 39842149858 passed the Calendar correction: all ten focused cells (Chromium7
and WebKit320/375/390), 12 functional checks per cell, zero runtime errors, clean
unchanged source and closed owned runtime. Its controlled rendering regression
also passed all four engine/motion combinations; visible text and focused-but-
paused real CSS motion did not release the helper, and completion allowed exactly
one native click. This remains supporting evidence, not Calendar14 acceptance.

The completed authority trace 39841685356 reproduced the same failure in one of
three isolated WebKit390 cases. The old Owner Requests document started the
authority fetch during the employee-decision stage, five milliseconds before
the native error and before that document's pagehide. The driver had observed
the action's reviewed URL and database approval, then started another login
while the post-action ScopedReadFrame was still recovering its fresh authority.
The next helper waits for the actual authorized Decision saved notice and removal
of the reviewed pending card, then retains the original SQL approval and employee
readback assertions. URL arrival alone no longer releases the account switch.
Substage labels now identify Owner login/review and employee decision separately.

Controlled rendering checks also hold the decision notice and pending-card
retirement separately: neither navigation without a decision view nor a notice
with the old card can release the helper. Cloud run 39843174333 at `f2f957cb`
is verifying those controls and three fresh real WebKit390 instances. No success
is assumed yet. Runtime errors remain fatal with the same existing narrow
diagnostic contract; no application authorization or lifetime rule changes.

Run 39843174333 passed all three corrected WebKit390 instances: 21 checks each,
zero runtime errors, clean unchanged source, closed owned apps and browser. Each
trace now shows both the initial and post-review authority reads completing in
the Owner review stage before the employee switch. All four engine/motion
controlled cases also passed both Calendar and reviewed-view barriers, including
the negative held states. The integrated helper, regression and two browser
scenario files match the tested diagnostic source. The optional probe workflow
and entry points remain excluded. Every required final-source job and all 70
browser cells remain mandatory; the following complete cloud run is the
acceptance gate, and supporting results are not stitched into its verdict.

## Tablet foreground precondition and failure evidence

Full run 39844594485 at `5d0abab1` / merge `5c586f20` passed Phase E SQL and
D1.3, then Whole Phase D timed out after 182 checks waiting for Clock In following
the initial WebKit tablet PIN sign-in. Chromium's whole journey had completed.
The remaining jobs were cancelled to save runner minutes. Cancellation is not a
pass; this source is not accepted. The preceding source's Whole Phase D had passed
both engines, so this finding requires direct diagnostic evidence.

The failure image was still pointed at the Owner's setup page, not the tablet.
The harness now selects the actual tablet page before its operations and masks
input/textarea fields in failure screenshots. Bounded failure metadata records
only route, focus, visibility, online state, PIN-gate phase and alert count. PIN
diagnostics retain only digit count and clear/verify/status HTTP codes, never PIN
values, setup codes, response bodies, cookies or headers.

The driver switched to the Owner for setup without explicitly foregrounding the
tablet again for PIN entry. The application intentionally resets verification on
hide and rejects verification while hidden. A foreground mismatch is a hypothesis
for the earlier failure; that image cannot prove its state. Before each native
PIN sequence, the corrected driver brings the tablet to the foreground, observes
actual visible/focused/online state and the enabled gate, and verifies four
entered digits before Continue. Application privacy clearing and all original
Clock In, uncertain-action, identity and immutable-record assertions remain.
Focused cloud run 39846653700 at `684dfbea` is executing the complete Whole Phase D
suite in both engines with these diagnostics; no success is assumed yet.

That focused run passed all 201 checks in both engines with errors empty and a
clean source checkpoint. All six native PIN attempts were focused, visible and
online with four digits entered; every verify/status response was 200. The owned
cluster stopped and was removed. The integrated Whole Phase D driver matches the
tested probe bytes. This proves the corrected journey, not the historical hidden
state that was never captured, and does not replace the next mandatory full run.

## Native secondary Home sign-in diagnostic

Run 39848109299 on `aca55916` / merge `70f19db9` passed validate (9,318 units,
types, repository lint, production build, both audits), all three SQL jobs, full
Attendance/remediation/D2/Clocker, Communications14 and Calendar14. Navigation and
Attention were still running when Home failed; those unfinished results are not
assumed successful. Home passed ten cells before WebKit430 timed out in the
replaced-session stage waiting for its secondary native sign-in to reach Home.
The trace records a POST /login with no response before the existing 30-second
wait expires, and runtime errors are empty. Primary-page capture shows the old
Home's private data cleared. It does not show the secondary page's state or prove
where that POST stalled. The full workflow remains unverified.

The Home sign-in diagnostic now labels primary/replacement targets, records
request completion as well as request/response/failure, and bounds page-state
capture. On failure it retains only safe login/app request statuses/durations
from the owned server log and grouped PostgreSQL wait states. It captures no
request/response bodies, credentials, cookies, headers or arbitrary server log
text, and masks input/textarea values in target screenshots. The actual native
sign-in and authenticated-arrival assertion remain unchanged; no retry or raised
timeout is introduced. Scoped lint, syntax and all 141 runtime-observer
regressions pass locally; no heavy local verification was started.

Focused cloud run 39851642862 at `d5e8eb13` is exercising the first four shared-
server Home WebKit cells, including real secondary account replacement, to
capture the missing distinction between browser, server and database waits. No
application or driver fix is claimed from diagnostics alone.

Run 39848109299 subsequently completed with Navigation14 and Attention14 also
passing: nine primary jobs succeeded, Home failed, and both downstream evidence
gates failed. That is 66 successful Phase E cells, not 70, and is not acceptance.
The production-build receipt binds clean, unchanged merge source `70f19db9` and
its exact lockfile; fresh Ubuntu ran Next 16.4.2. Validate passed 9,318 tests in
546 files, with 801 existing skipped tests, and both audits reported zero
vulnerabilities.

Focused run 39851642862 at `d5e8eb13` passed all four WebKit widths
320/375/390/430 with zero errors and owned cleanup, without reproducing the
secondary sign-in stall. It used a cold WebKit-only cohort and direct launch, so
it does not establish the cause of the official mixed-engine failure. Full Home
diagnostic run 39852649616 at `3632f232` replays the actual shared-server,
launchServer/connect, Chromium7 then WebKit7 matrix with the enhanced diagnostic.
Its optional job budget is 50 minutes, matching the unchanged mandatory Home
budget; no mandatory assertion, timeout or test is modified. Its result remains
pending and cannot substitute for all required final-source jobs.
