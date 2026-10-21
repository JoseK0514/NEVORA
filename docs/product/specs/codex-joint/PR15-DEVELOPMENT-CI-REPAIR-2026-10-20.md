# PR15 development CI repair

Owner: Codex. Jose explicitly authorized repairing CI and integrating the new UI
into `development`. PR15 targets `development`; PR13 remains a separate production
candidate. This report is an implementation handoff, not independent acceptance.

## Cause and change

Baseline PR15 head `aca6d2035bc3ffaad7303005672308c8ed2e1b04`, hosted run
[39517059190](https://github.com/JoseK0514/NEVORA/actions/runs/39517059190), failed
standalone QA imports and five SQL configuration imports of `server-only`.
Those processes now explicitly resolve Next's empty server marker in test context.
The standalone preload rejects non-test processes and inherited application or
worker database credentials. It retains the normal React renderer. Production
application and worker entrypoints retain their existing marker and conditions.

The notification worker test mixed npm's stderr with the worker's bounded error.
Its original failing raw stderr was unavailable, so its historical extra text is
unknown. A controlled npm-parent diagnostic reproduces the assertion failure.
The repaired test captures actual npm-script stderr separately and still requires
the exact original worker message, exit status and absence of module-load errors.
It also verifies the injected parent diagnostic without suppressing diagnostics.

Legacy SQL fixtures stopped before Company Access. Current fixtures explicitly
apply checked-in payroll prerequisites and Company Access only to new, loopback,
ownership-marked disposable databases. Adoption runs after legacy actors exist.
The dedicated adoption fixture retains its own staged migration sequence. An
actual SQL regression proves refreshing a fixture session never restores revoked
Manager scope or grants a new Manager implicit scope. Company Access exchange
tests explicitly select the exchange database constructor instead of requesting
a foundation database inside that job.

Old fault hooks counted or interrupted newly added authorization preflights.
Scheduling instrumentation now targets the real scheduling snapshot and guarded
generation batch; admission and response fences still execute real SQL. Lock
tests pause the actual mutation batch, excluding `SELECT ... FOR UPDATE` from
mutation detection. Existing retry limits, exact after-state proofs, native SQL
lock observation, rollback and unchanged-history checks remain. Session/logout
and workspace-change tests distinguish committed state from private response
disclosure: a final authority fence can deny the response after the write commits.
Denied communication notification writes assert the current `false` contract and
preserve the entire notification row and its original read timestamp.

Through `1002c9cc`, no application authorization, business logic, payroll wording, legal wording,
database migration source, mandatory job, scenario, threshold or runtime-error
failure policy was changed by these repairs.

## Evidence and remaining gate

Local evidence is retained under:
`/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/pr15-ci-repair`.
Red runs are failure history, not successful acceptance receipts.

- Full unit run: 9,111 passed; 801 existing skipped; 516 passing files and 27
  skipped files. Vitest reports 9,967 total cases, including existing pending cases.
- Types, lint and 66 release-engineering contract checks pass locally.
- Production build passes locally; no build/start migration script is configured.
- Foundation: 281 passed. Phase B authority: 46 passed.
- Exchange SQL: 199 passed. Notifications SQL: 77 passed.
- The complete five-group release SQL command passed:779 tests in33 files,
  zero failures, and its owned cluster closed.
- Local Attention and Communications: all 14 cells each passed at `87768b9e`,
  Chromium/WebKit at every required width, zero recorded runtime errors.
- Local Navigation exposed an unassigned Manager in the positive notification
  case. Hosted Attendance exposed the same fixture omission. Both positive cases
  now request a real explicit Owner Company scope assignment; negative cases
  and the fixture's lack of automatic grants remain. The SQL regression also
  verifies explicit grant success while another revoked Manager stays denied.
- Hosted Communications timed out during its first Chromium dashboard startup;
  the screenshot still shows Next compiling and no runtime error was recorded.
  Its four routes now receive bounded unauthenticated compilation preparation,
  each requiring401, followed by the original actual browser reads, each
  requiring200. Endpoint/status receipts are retained under a safe report name.
  Every15second assertion and fatal runtime-error check remains. This cold
  development-server preparation is not Schedule performance acceptance.
- Browser reruns and exact-candidate hosted checks remain required.
- Hosted Phase E SQL reached calendar-feed after eight preceding groups passed.
  Its19-case fixture used direct publication proofs without Company Access
  adoption. Explicit adoption after seeding the real actors repairs that fixture;
  the complete19-case focused run now passes. No production publication or feed
  code changed. Its subsequent complete owned run is recorded below.

At `cb4cc5ca`, the complete owned Phase E SQL gate passed all189 tests across
its10 explicit groups. Navigation and Communications each passed all14 browser
cells with zero runtime errors and closed ownership receipts, including the390
management binding and WebKit375/1440 cases. Attendance passed its real Owner,
Manager and Employee boundaries, then missed its200ms loading transition.
That test now holds each lifecycle/visibility/pageshow response until the
loading and private-row clearing assertions finish, then releases it and checks
the final state. Response payloads are captured at request entry; pending gates
release during teardown. No timeout, private clearing assertion or final-state
assertion was removed. The same explicit Manager scope setup is also applied to
the whole Phase D and account-remediation positive Manager fixtures found by the
helper-graph search. These final Phase D corrections require matching reruns.

The next Phase D run confirmed the held loading states, then exposed stale
inner-pane pause expectations. Company Access now retires the whole operational
view on pagehide/offline and renders `View paused`. Tests require that exact outer
state and retain protected-person/report absence checks. The late Manager
account-switch test now observes the replacement Manager's real GET200 with a
different bound authority and retirement of the old row before releasing the
held committed reply. No retry may reappear, stale intent must return403, and the
single original approval event must still belong to the first Manager. The old
inner `Correction access ended` label cannot survive the enclosing view's
retirement. The failed run's WebKit development-overlay fetch error is retained;
runtime failures remain fatal and must be absent in the matching rerun.

At `e806b028`, Attendance passed46 checks in both engines with zero errors.
The account-switch test reached the new Manager's ready queue, then its legacy
element-state helper rejected the already detached old row. The assertion now
checks actual node disconnection, or replacement of the original document,
alongside the exact old-row/retry absence and new-authority assertions. The
remaining whole Phase D/D2 pause assertions follow the same enclosing retirement
contract; pending-row counts, no-false-empty checks, geometry, stale-command403
and persisted decision history remain mandatory.

Hosted `cb4cc5ca` passed validate (including production build), Clocker,
release PostgreSQL and Phase E PostgreSQL. Calendar passed all14 browser cells
with zero errors but failed its leaf receipt validator: that validator still
required the old six-argument command. It now requires the exact eight-argument
command, including the candidate-local absolute QA preload. Missing and wrong
preload mutation tests must reject. No old-command fallback is accepted.

Hosted Communications WebKit768 recorded two fatal native fetch errors during
the revision navigation. That journey now foregrounds the real Manager view and
uses its `Edit update` link, so it exercises the actual protected edit transition.
This is a candidate repair, not an established closure of the intermittent error.
Hosted Home WebKit390 also recorded a fatal native fetch error during H11's
explicit hard route leave. H11 and its privacy/runtime assertions are unchanged.
The shared observer adds only static same-origin resource kinds, never raw URLs,
query values, opaque IDs, messages or stacks. Resource projection regression:
7failed/128passed before implementation; final138passed, including foreign-origin
and private-sentinel rejection. Every native event still fails the cell.

The exact preload receipt regression passed47 cases after the validator repair.
One initial concurrent run exceeded a5second unit-case budget; an isolated rerun
passed all47 without changing any timeout or assertion. The failure log remains.
Home's held-response transport now avoids fulfilling a request only when the
browser already reports it cancelled after a confirmed document navigation.
Live late responses still deliver, same-document paused responses still exercise
the original handler, and unknown fulfillment failures remain fatal even after
navigation. Regression:4failed before implementation,5passed afterward. H07/H08/
H11 privacy assertions and all runtime checks remain. This transport change is a
candidate repair; matching browser and hosted execution still decide acceptance.

Local `a405b608` whole Phase D reached82 passing Chromium checks, then timed out
waiting for the Clocker document's `load` event; its failure screenshot shows the
ready Clocker devices page. The navigation now requires DOM readiness, HTTP
success and the actual page heading before continuing. Recovery proof navigation
uses the same readiness contract and still requires the real Recovery code input,
fragment removal, proof consumption, reuse/expiry denial and session invalidation.
The original15second deadlines remain.

Hosted `a405b608` passed all46 Attendance checks. The combined Phase D job
then exposed a stale delayed-script recovery assertion: `ScopedReadFrame`
withholds the entire form until scripts establish fresh current access. Its
failure screenshot shows `Current view needs a fresh check`. The browser test
now requires that exact barrier and absence of the reference, submit control and
receipt rows while scripts are held, then requires enabled controls after
release and performs the same real immutable-receipt lookup.

A focused diagnostic using the complete Home scenario at WebKit390 reproduced
H08's held-read/navigation ordering failure with zero runtime errors. H08/H11 now
observe DOM readiness, HTTP success and the destination heading before releasing
the old response; subsequent network-idle, stale-private-row absence and fatal
runtime assertions remain. The external diagnostic intentionally retains the
complete14-cell validator and cannot produce acceptance for its missing13 cells.

The late committed Manager switch test now awaits the actual held transport's
settlement, allowing a cancelled request only when Playwright reports cancellation.
The replacement Manager's real authorized read must return200 with a different
authority. The old row must detach before release, no retry may return, stale
intent must receive403 and exactly one original approval must remain. The shared
transport helper retains five passing regression cases, including live late
delivery and fatal unknown failures. Matching browser execution remains required.

Hosted `a405b608` also passed Communications and Calendar, including their exact
leaf receipts. Validate, Clocker, release SQL and Phase E SQL passed. Home's
remaining WebKit320 event is now identified as a notification read during H08's
hard navigation; it is still fatal. Local `41dfed17` reproduced a different cold
route timeout: Requests took15.1seconds, including9.4seconds of compilation.
Home now prepares Requests/Schedule without credentials and requires their307
login denial before the actual browser journeys. Phase D similarly prepares its
three cold management routes. These are setup steps, not performance acceptance.
Its held Inbox response waiter now starts immediately before the held response
is released, after the original loading/private-absence assertions, rather than
spending its deadline on route compilation.

At `41dfed17` all14 account behavior checks passed, but two WebKit runtime events
still failed the gate. The next diagnostic adds case attribution and original
page-error stacks to that fictional-data suite. Missing-time checks passed6 and
report keyboard/scroll checks passed28. A separate local static HTTP/WebKit
navigation probe recorded zero errors in30 routed and30 unrouted iterations;
that probe does not establish closure of the real Next application failure.

The next account diagnostic reproduced WebKit errors in the Manager switch and
late-commit cases. The stacks identify React's error reporting and Next's
development diagnostic fetch, while the hydration diff identifies screenshot
caret style injection. The login helper now waits for its new page's network
settlement before closing it. Manager switch capture waits for actual old-row
detachment and settlement, preserves the caret style, and denies either app error
screen. The late-commit case also settles before teardown and denies error screens.
These are candidate lifecycle repairs; runtime errors still fail the entire gate.

D2 reached58 passing checks, then its Manager navigation exceeded a15second
global-network-idle deadline despite successful Attendance reads. It now requires
DOM readiness and HTTP success, then the same actual decision button must become
actionable. All command identity, recovery, rollback and persisted-history checks
remain. Home's prepared first Chromium320 cell passed its complete scenario; the
run was then explicitly terminated with owned cleanup to investigate the new
account findings. It is incomplete evidence and cannot satisfy the Home gate.

Jose requested moving remaining verification to the cloud. `8b38c220` was pushed
to the owned PR branch and GitHub Actions run39529944571 started on hosted Ubuntu
runners. All root-owned local QA processes have closed; an orphaned Next process
from whole Phase D r6 was identified by its ownership receipt, PID, command and
working directory, then terminated. No more heavy local verification is scheduled.
The complete focused WebKit390 Home scenario passed with zero runtime events;
its external one-cell runner then correctly rejected the missing13 cells.

A separate two-cell loopback experiment on pinned Playwright1.62.1/WebKit2336
reproduced the actual native message. Control: HTTP200, one server read, no error.
After the replacement document request arrived but before its response was
released: handled fetch rejection, no server read, no pagehide, no window error or
unhandled rejection, yet one native access-control `pageerror`. The external
receipt is `nevora-webkit-provisional-fetch-probe.log` in the evidence logs.
This matches the mechanism discussed by the [Playwright maintainer](https://github.com/microsoft/playwright/issues/43120).

The candidate observer runs that control against each actual WebKit launch and
only enables classification when the mechanism reproduces. It also tests that
the independent window error/unhandled-rejection observer detects real throws.
Only the exact same-origin native format for the three observed own-read paths
can be recorded as a navigation diagnostic, between an observed main-frame
navigation request and its commit/failure. Window exceptions, genuine TypeErrors,
foreign/unknown resources, ordinary live-document failures and teardown errors
remain fatal. A spoofed native-shaped JavaScript throw still fails through the
independent observer. Diagnostic receipts contain static resource kinds only.
The URL must also have no userinfo, query string or fragment. Three added rejection
cases failed before this restriction and passed afterward; the focused runtime
and classification regression set now passes160 cases.
No test is skipped and the full browser matrix, source custody and receipt gates
remain required. This classification remains a candidate until matching CI passes.

Local `8b38c220` account remediation still recorded a real WebKit TypeError in the
late Manager case, plus its development diagnostic fetch. Both remain fatal.
The helper's separate Chromium initial global-idle timeout now uses DOM readiness
and HTTP success before the same actual controls. Whole Phase D's cold Schedule
timeout is addressed by adding that route to unauthenticated compilation setup.
Cloud execution must close the outstanding behavior/runtime gates.

Hosted `8b38c220` reached the delayed-script and actual immutable Clocker receipt
checks, then rejected a legacy expectation that a focus event preserves the
inner receipt. The enclosing current-access frame retires and unmounts that
private view. The updated test requires immediate receipt absence, no automatic
receipt POST, a fresh empty reference field after authorization, and an explicit
same-reference review returning the same employee receipt. A real blur/focus must
repeat that privacy boundary; exactly two explicit checks may occur. This retains
the immutability/no-replay checks while following the new enclosing lifetime.

Hosted `9709f2dd` passed those Clocker checks and the first password reset/session
invalidation. The reset helper then incorrectly required an HTTP response for a
hash-only revisit, which Playwright correctly reports as null. A repeated reset
visit now first leaves the old reset document through `about:blank`, then requires
a real HTTP-success reset document, the code input and consumed fragment. This
exercises reuse and expiry against a fresh form and retains the15second deadlines.

Each SQL run starts a new owned local PostgreSQL16.15 cluster. Notifications and
external delivery are disabled. Completed runners closed their owned clusters.
Browser verification uses the existing pinned Playwright1.62.1 and axe4.11.0,
exact committed source custody and its original owned runtime checks.

Hosted `1002c9cc` passed types, lint, full units, the production build, all three
database jobs and all14 Home, Communications and Calendar browser cells. Whole
Phase D passed201 checks in each engine, including the fresh reset-document
regressions. The later D2 recovery suite exposed an application regression:
the enclosing current-access frame unmounts the private correction pane while
offline, which discarded its local uncertain review command.

The repair retains only that exact command in an in-memory React boundary above
the retiring private body. Its key binds actor, session, operational authority and
page; a different key discards recovery. A denied dashboard render omits the
boundary, and a denied correction read explicitly clears it. No queue rows, names or
snapshots are retained and no browser storage is used. A remounted pane still
requires a fresh authorized snapshot before enabling the existing explicit retry.
Late responses from the retired pane cannot clear a newer command. Approval,
decline, original-record immutability, same-operation replay and server guards
remain unchanged. The browser regression now requires the outer paused state and
zero private rows/retry controls offline, followed by the original exact-command
recovery and one persisted decision after fresh authorization.

The focused recovery checks pass43 cases in4 files; scoped lint and types pass.
Their failing-before evidence and logs are retained under `/tmp/nevora-pr15-review-recovery-*`.
The matching D2 browser run in both engines remains required in cloud CI.

Navigation on `1002c9cc` completed9 cells before WebKit390 recorded three native
access-control events for an unidentified resource. The per-launch control proved
the provisional-navigation mechanism and independent JavaScript-error observer,
but those application events were not classified and still failed the gate.
The next report identifies three additional static resources (profile, calendar
status and device status), the scenario stage and whether document navigation was
pending. This diagnostic change does not add those resources to the classifier.
Four new assertions failed before the metadata repair; the full diagnostic set
must remain green and the next actual cloud run must determine the cause.

Hosted `534ae15a` passed all three database jobs, full units, types and lint;
its build and later browser gates were still running at this update.
Communications passed14 cells. Home passed8 cells before WebKit375 recorded an
exact native notification-read diagnostic at the hard route-leave stage, after
the collector's main-frame commit boundary had closed. It remained fatal, with
no independent JavaScript exception reported. The next diagnostic records
requested/committed/DOM-ready/failed navigation phases and bounded relative timing
in both the actual application and its per-launch control, using the same observer.
The classification boundary is unchanged. Three metadata assertions failed
before this instrumentation; the diagnostic set passes167 cases afterward.
That Home journey checks Home readiness after its preceding pageshow but did not
wait for the independently refreshed notification bell. The navigation test now
requires that bell's actual ready state before departing, while the intentional
Home response remains held. The real hard navigation, cancelled/held response,
private-row absence and fresh re-entry assertions all remain, as does the fatal
runtime policy. This candidate readiness repair requires the next cloud run.

The same run's Navigation gate failed on a native operational-authority read at
the API stage, again after its commit boundary, so it was not classified. Calendar
executed all14 cells with zero runtime errors, but its separate leaf verifier
correctly rejected a resource receipt with `ppid:1`. The supervisor had proved
descent from its process-table observation before a later identity observation
recorded reparenting. Its receipt now retains the original independently observed
ancestry parent and records the later value separately as `lastObservedPpid`.
The leaf's parent check, random ownership marker, PID/birth/group/command checks,
live signal authorization and closed-resource checks are unchanged.
A real tiny-process regression simulates only that later PPID field: it failed
with the original receipt and passes after the fix; the unrelated-process refusal
also passes. Full lifecycle/negative regressions remain required in cloud CI.

CTO position for the application fix: recovery state belongs above the private
pane's lifetime, with its original immutable command identity. CISO position:
retain the current-access retirement, actor/session/scope/page isolation and live
server authorization. Governance position: the new application behavior and all
mandatory checks must pass on the final candidate before integration.

CTO position: repair test context and fixture fidelity while preserving current
server authority. CISO position: retain credential denial, real authorization
and private-response fences. Governance position: hosted mandatory checks must
pass on the exact candidate before the authorized development merge. Codex owns
implementation and matching evidence. No Jose decision is needed for that bounded
development integration.

Production remains separately held for the recorded independent UI findings,
Schedule performance decision and production migration authorization. No main
merge, production deployment, hosted database operation or real notification is
authorized by this development integration.
