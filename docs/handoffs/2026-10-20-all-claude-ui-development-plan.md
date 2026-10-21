# All Claude UI integration into development

Jose authorized fixing the integration and merging the latest UI to development.
This is development authorization only; main, production deployments and hosted
database writes remain outside this task. Codex owns integration and verification.

## Pinned inputs

- Development: `d4b01453f7fabaa7ac739d049934527b6b366310`.
- Clean Manager/Owner and CI repairs (PR15): `a405b6080c5d0ca4086965bc6c37bf76713b511b` (includes `cb4cc5ca` and the original `87768b9e` input).
- Claude auth plus Employee/Lead and Clocker Signature UI: `b0632ce63104197c728bd062c168b28771ac4687` (includes `8107dfed`). This is the frozen Claude input; later changes need their own candidate.
- Policy pages/deletion requests: `d0b6d1f5e12f8602b947ad18cc40e04fc1180a6a`.
- Matching passkey server: `48ededa576f3951054dbf6d9394d10670b831c60`.
- Latest release-integration `898e99d4` is already included through auth/Manager inputs.

## Controls and verification

Preserve email-invitation activation; do not restore the retired ID/phone
activation. Preserve Company Access admission/response checks, notification
authority keys, native payroll worker startup, existing payroll/legal wording
and approved policy facts. Keep passkeys off by default and production migration
approval separate. Verify deletion requests cannot be bypassed by passkey login.

Use fictional users and owned loopback PostgreSQL only. Review all merge
conflicts, run types/lint/full units/build plus affected SQL and real browser
flows, then require hosted checks on the final combined SHA. Resolve test-driver
mismatches with evidence; never remove scenarios or weaken authorization,
privacy, concurrency, error, contrast or timing requirements to get green.

The existing verification chat owns PR15 and its CI repairs; this task uses a
separate descendant worktree and preserves that work. Reconcile development
again before merging the final candidate. Independent acceptance remains with
the independent reviewers; local/hosted test passes do not authorize production.

Evidence is outside Git under this chat's `all-ui-development-20261020` folder.
Final handoff will record exact checks, merge SHA and any remaining release gates.

## Integration repairs and observed evidence

The combined migration revokes sessions and passkeys atomically when deletion is
requested and fences an in-flight password login. Three real PostgreSQL
regressions failed before the fix; all 34 passkey SQL/service/route tests then
passed. Migration 0034 is a prerequisite for 0035. No hosted migration was run.

Browser and unit regressions also exposed an auth language switch enabled before
hydration, lost native statement viewing, stale private statement details during
loading, and a legacy Profile grid constraining the new layout. Those application
defects were repaired. Existing Schedule and Home assertions now use the actual
Signature semantics while preserving authorization and loading privacy checks.

Types, lint and all 66 release engineering checks passed at `368abce9`. Targeted
auth/policy checks passed (73), Schedule/language checks passed (33), and the
unchanged private statement regression tests passed (7). The initial full unit
run recorded 9,149 passes and four failures: three addressed integration
regressions and an unchanged 5-second typed-backfill timeout under local load.
That entire 68-test backfill file passed alone at its original limits. A final
full hosted run is required; these targeted reruns are not a full-suite pass.

The owned browser runs use fictional data and local PostgreSQL. At `6c72e7d6`,
the combined Chromium/WebKit run passed all 40 recorded journeys with zero page
errors, including native WebAuthn registration, removal confirmation focus,
removal, discoverable sign-in and deletion receipt/session/passkey revocation.
Public/authenticated screens were checked at 320/390/768/1440 pixels. Physical
Face ID has not been tested. The D1.3 attendance browser run also passed all 46
checks on that source; its temporary database was stopped.

Hosted validation on the earlier combined candidate `368abce9` passed 9,154 unit
tests (523 files), types, lint, production build, and both dependency audits with
zero vulnerabilities. Existing default-suite skips were retained. Subsequent
CSS, Clocker and driver changes still require the complete final hosted run.

Real mobile regressions were reproduced: bottom navigation obscured Home Refresh
and Profile Sign out. Restoring bottom clearance and native scroll padding made
the original keyboard/contrast assertions pass at 320/375 pixels; the final full
matrix remains mandatory. The new Profile passkey row also explicitly resets its
inherited flex direction, eliminating an oversized empty card. The combined
browser run verifies its bounded height. No assertions or scenarios were removed.

Driver repairs preserve the original requirements: held attendance responses make
privacy clearing observable without timer sleeps; Company Access's parent pause
replaces the unmounted child state; role-based controls avoid ambiguous new
section labels; schema equivalence includes 0034/0035 on both upgrade/fresh paths.
Contrast measurement now supports dark text on light backgrounds while still
rejecting a foreground crossing the background range (new red/green regressions).
Home's fresh-generation wait requires a visible fresh fact, including when its
semantic parent uses display:contents, and rejects the former location text.

The Profile calendar cleanup originally hid all unroled paragraphs, including the
private-link disclosure and refresh/connection caveat. The existing calendar
browser scenario reproduced this; the hide rule now targets only the redundant
introductory paragraph. Native request verification reads the Signature form's
visible one-day heading instead of the retired form's summary aside. The PR15
repair merge retains its explicit Manager grants, operational retirement checks,
cancelled-document response handling, and exact receipt command validation.

The full Home journey also reproduced a factual display regression: generic
"Review your schedule" text replaced the canonical "Schedule removed" update.
The view now preserves removed-schedule and review-unavailable wording. Two new
regressions failed before the fix; all 30 Home view tests then passed. The browser
scenario's original removed-schedule assertion is retained.

Tablet Home exposed dark breadcrumb text on the teal header; the scoped header
rule now keeps those labels white. Phone/tablet Home scenarios then passed. The
desktop hierarchy check measures the actual shift card boundary, preserving DOM
order and visual priority without mistaking its padded content for the card edge.

Whole Phase D passed 85 checks before finding that its held-JavaScript scenario
expected a recovery form through the new Company Access barrier. The driver now
requires the fresh-access placeholder, no reference field, no receipt button and
no receipt API request while initialization is held, then retains every real
receipt journey after scripts resume. A separate component regression verifies
disabled controls, no pre-hydration request even with a valid reference and an
initialized controller, and successful submission after hydration (4 tests pass).
The Updates disclosure uses the same bounded visible-render wait as Actions;
native Enter/Space, independent open states, focus and every row remain asserted.

PR16: https://github.com/JoseK0514/NEVORA/pull/16. The final merge gate is all
mandatory hosted checks on the combined candidate, plus reconciliation with the
current development head. Production, independent acceptance and physical-device
testing remain separate gates; passkeys remain off by default.

Jose requested moving the remaining verification to the cloud. Local browser
runners have stopped; subsequent tests and builds run on GitHub-hosted Ubuntu
runners with disposable fictional databases. No hosted application database is
used. Local edits and read-only monitoring continue without local test/build runs.

Hosted run 39529365071 passed the Phase E SQL suite and all 46 D1.3 attendance
checks. Whole Phase D passed 87 checks, including the delayed-script barrier and
actual receipt recovery, then reproduced duplicate active window focus clearing
the receipt through its parent ScopedReadFrame. The parent now ignores duplicate
active window focus while retaining retirement on blur, hidden/pagehide, offline,
storage/account changes and reconnection. Added component regressions cover those
lifecycle transitions; the unchanged browser assertion remains the integration
gate. These new regressions still require hosted validation.

The same hosted run timed out during communications bootstrap while the Owner
Home was still compiling its readers. The driver now explicitly foregrounds the
login tab and captures early responses before authentication, then gives pending
reads their existing 15-second response wait after sign-in. Every original route,
unauthenticated denial and authenticated 200 assertion remains required.

Hosted run 39530404293 passed Phase E SQL and the unchanged duplicate-focus
receipt assertion, then reproduced loss of the selected reference after real
blur/focus. Its screenshot shows the recovered authorized form with an empty
reference and no receipt. Clocker recovery now owns its selection outside its
ScopedReadFrame body, so retirement still removes private DOM while the existing
snapshot controller clears and re-reads receipt details. The page keys that
selection owner by operational authority, which binds workspace, actor, role,
access generation and session; changed authority discards the selection. The
server access check, client freshness barrier and validity limits remain. Added
selection-lifecycle and authority-composition regressions await hosted execution;
the original end-to-end blur/focus receipt assertion remains unchanged.

Hosted run 39531532680 then passed 98 whole-Phase-D checks, including receipt
restoration after blur, missing-receipt handling, offline privacy, email recovery,
session revocation and reused-proof denial. Assisted reset ended in the existing
unconfirmed-outcome message instead of success. The next cloud candidate adds
sanitized HTTP timings/statuses, foreground state, aggregate PostgreSQL waits,
proof-consumption booleans and fixed-route server timings to its failure report.
It records no proof, password, message body, SQL text or real customer data. The
application's 12-second abort, test deadlines and success/denial assertions remain
unchanged; this is diagnostic instrumentation, not a claimed reset fix.

Hosted run 39533192586 completed all 201 whole-Phase-D functional checks,
including successful assisted resets in Chromium (358 ms) and WebKit (117 ms).
The prior unconfirmed reset did not recur; no reset application change is claimed.
Two Owner browser runtime errors still failed acceptance. Ordinary setup and
teardown now wait for their existing network-settlement deadline, with lifecycle,
last-check and sanitized stack attribution for any remaining fatal page error.
Runtime failures remain fatal; completion of functional checks alone is not a pass.

That run also exposed retired My time CSS selectors in account-switch tests and
a Manager test waiting for a browser queue read through a withdrawn access frame.
The drivers now require the same exact session-denial text in the real Signature
view, verify fresh Manager authority through the actual authenticated API, and
require the old row/retry to disappear before releasing the original reply. A
shared five-case tested transport helper accepts a cancelled request only with
Playwright failure evidence; live late replies are still delivered and unknown
fulfillment errors still fail. All original 401/403, immutable receipt/event,
no-duplicate and late-private-data assertions remain. Login streams settle before
teardown and screenshots preserve the caret, avoiding injected hydration styles.

Navigation's Chromium 390 cell then reached native time-off submission and exposed
a driver mistake: the visible "1 day away" summary is an aria-live paragraph,
while the h1 remains "Time off". Its screenshot shows the correct one-day range.
The assertion now targets that exact live summary; every native invalid-date,
actual submission, stable-ID replay, outbox and Owner approval check is retained.

Attention completed Chromium's seven sizes and WebKit 320's functional actions,
but WebKit emitted native fetch-access diagnostics during document replacement.
The upstream mechanism is documented by a Playwright maintainer at
https://github.com/microsoft/playwright/issues/43120. The reviewed QA control and
regressions from PR15 `1002c9cc` are adopted as bounded test instrumentation:
each actual WebKit launch must reproduce handled cancellation in a
credential-free loopback fixture and verify independent detection of a genuine
window error and unhandled rejection. Only the exact native format for three
plain same-origin read paths, during an observed pending main-frame navigation,
may be recorded separately. Foreign/query/fragment/userinfo paths, teardown,
live-document events, actual TypeErrors and spoofed JavaScript exceptions remain
fatal. No broad error filter, scenario skip or deadline increase is introduced.
The full matrix and source/receipt validators remain required on the new SHA.
