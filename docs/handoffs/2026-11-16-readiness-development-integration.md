# November 16 readiness — combined development acceptance

Owner: Codex, continuing Jose's request to carry this work through development
acceptance. Claude owns the UI design; no other chat was messaged, interrupted,
or edited. Rondo functionality and SCRUM-199 remain outside scope.

Development is the operating and acceptance release, held to production
standards. No main merge, production deployment, paid activation, real messages
or customer-data testing is authorized by this work.

## Source and release custody

- Fresh remote development/base: `22a9d598eb470cd380ee739d7396f06ecf335ed5`.
- Preserved collaboration source: `40ccc4e4e5b74b48c8fd86ef50c4ec6efe9b4dd1`.
- Main held at `46d6dc76922bb273379baccd329e0af636d1dcb6`.
- Isolated detached worktree:
  `/Users/josek0514/.codex/worktrees/nevora-readiness-integration-20261116`.
- Original backend implementation:
  `c9de85ecef4f8eb2fb9f109e494bfde892022f65`.
- Original minimal form/history wiring:
  `eeed508eb475707912b998dbab6dcf0d7993cafa`; original delivery checkpoint
  `0a31f46c96221fb7aac8607c083677eca986a729`.
- Linear UI assembly:
  `dad3ce95fca8e7b43431614eb0db6f84054a43d2`. Collaboration history remains
  intact; the source inventory records the linear squash as its replacement.
  Current development's newer backend protections remain present.
- Follow-ups: `3f01ce1286185f70606cf23a37c9a47f8a88c8ca`,
  `55b2728abd0bea9cc00ddb4b4bc86ca5f24052c4`,
  `21662bc509927c11d5765e91ecb1542ac9caaf0c`,
  `78a9a63b3abd988e047c80bfe9f6c24a8abdbd40`,
  `1b6df0b561d7162f6511b9b08622f00f252007da` and `9f23c2f37c376d7974c71f1536eb73666a4fce9e`.
  Full identities remain in Git; the immutable candidate tag identifies the
  final manuals-qualified tree.

The first Actions tag, `candidate/backend-completion/20261116-readiness-combined-01`,
points to `a182687e1a75c76d32a72f0986f5f98424002f3f`.
[CI run 43870717602](https://github.com/JoseK0514/NEVORA/actions/runs/43870717602)
passed validate and all Clocker SQL shards, but failed other required gates.
It was not promoted. Candidate 02,
`candidate/backend-completion/20261116-readiness-combined-02`, points to
`7b57d149de2acb7e385c4d2392960b1cc70c3013`.
[CI run 43879626641](https://github.com/JoseK0514/NEVORA/actions/runs/43879626641)
passed validate, release-postgres, onboarding-backend, phase-e-postgres and all
Clocker SQL shards/aggregate. Its two readiness browser suites both passed
(14 + 38 checks, zero unexpected errors). Other combined browser gates and
[Mobile Access 43879626726](https://github.com/JoseK0514/NEVORA/actions/runs/43879626726)
failed. Candidate 02 was not promoted.

Candidate 03 is `candidate/backend-completion/20261116-readiness-combined-03`.
The immutable tag identifies its final manuals-qualified SHA. All mandatory
checks on that exact SHA, fresh remote-source reconciliation and combined
acceptance remain required before a normal fast-forward to development.
Never infer acceptance or deployment merely from a tag.

## Changes and decisions

SCRUM-204 validates each newly published commitment against current canonical
hard rules under transaction guards and final authority checks. Historical
published snapshots, approved restrictions, preferences policy and atomic
revision/outbox behavior are preserved.

SCRUM-205 carries `expectedReviewVersion` from the original manager review
through the action, writer and retries. Stale material changes are refused
transactionally. Deleted and out-of-scope records share the same private
`ACCESS_DENIED` response. Both existing forms retain submitted values and offer
copy-before-explicit-reload recovery. A Company delete transport failure is an
unknown outcome: further deletion submissions, including programmatic ones,
stop until an explicit current review. This closes a real lost-success/retry
case that otherwise let a fresh missing-row render discard the draft.

SCRUM-206 separates current summary reads from explicit bounded history pages.
The history cursor, stable ordering, completeness and artifact hashes are
preserved. There is no deletion, silent history truncation or raised arbitrary
event ceiling.

SCRUM-207 uses the existing structured logger and response correlation header
for unexpected handled failures. Expected validation, authorization and conflict
refusals remain distinct. No new vendor or sensitive request/provider logging
was added.

Combined-source checks also found incoming offline holds that could retain
private rows without a deadline. They now retain the original finite lease;
an offline hold cannot extend authority. Relevant expiry assertions remain.
SQL fixtures now supply eligible newly published coworkers and the review token
actually captured before each race. Existing UI drivers target the current
visible presentation and protected correction route. Clocker fixture bundles
embed the real local font. These changes preserve the assertions and controls.

## Executed evidence

External evidence root:
`/Users/josek0514/.codex/worktrees/nevora-readiness-integration-evidence-20261116`.
Original independent defect reproductions, SQL coverage and diagnostics tests
are recorded in `2026-11-16-readiness-backend-delivery.md` and its evidence.

| Execution | Actual result |
| --- | --- |
| Candidate 01 validate | 924 files and 13,796 tests passed; 944 existing skips; type/lint/build/manual gates passed on that earlier exact candidate. |
| Candidate 01 Clocker SQL | All four shards and aggregate passed. |
| Company actions/notification producers rerun | 95 PostgreSQL tests passed (`company-sql2.log`). Original review is captured before observers mutate the source/access. |
| Exchange race rerun | 36 PostgreSQL tests passed (`exchange-race2.log`), including acceptance-first stale edit refusal and manual-first ordering. |
| Calendar feed rerun | 19 PostgreSQL tests passed (owned Phase E SQL report); newly published private coworker is eligible. An earlier direct-run attempt refused missing suite custody and was not counted. |
| Original form/history browser scenario | 14 checks passed in Chromium/WebKit on clean `55b2728abd0bea9cc00ddb4b4bc86ca5f24052c4` (`browser-ui3/report.json`): stale/fresh edits/deletes, keyboard/mobile widths, complete 1,001-event traversal, original artifact hash and blur retirement. |
| Two-manager concurrency browser scenario | 38 checks passed with zero unexpected runtime errors on clean `9f23c2f37c376d7974c71f1536eb73666a4fce9e` (`browser-matrix7/report.json`). Company/location Managers, both race orders, reassignment, generated/manual transitions, committed lost replies, original token/draft preservation and offline lease expiry. |
| Diagnostic contracts | 20 Node checks passed (`diagnostic-contracts.log`). The browser uses the existing independently exercised WebKit cancellation mechanism and negative window-error/rejection controls; other errors stay fatal. |

Intermediate failed browser attempts remain evidence, including the real lost
delete recovery failure. One local diagnostic attempt invoked a WebKit-specific
probe on Chromium and was stopped; its owned cluster and processes were closed.
It is not passing evidence. A local full-unit attempt made under concurrent
source edits is also not a valid clean-candidate result; use the exact Actions
validate receipt instead.

## UI contract, Jira and next gate

`2026-11-16-readiness-backend-ui-contract.md` is the exact field/response/recovery
contract. The required functional wiring is implemented. Claude retains final
presentation ownership; there is no remaining unwired protection being claimed
complete here.

Jira comments 10417 (SCRUM-204), 10418 (SCRUM-205), 10419 (SCRUM-206) and 10420
(SCRUM-207) were saved and read back. They distinguish implementation, local
verification, the failed candidate and pending development acceptance. Earlier
implementation/UI receipts remain. The issues were not marked Done and
independent findings were not self-closed.

Engineering position: retain the canonical writer guards and original intent.
Security position: preserve scope/privacy and finite private-data authority.
Delivery/governance position: regenerate all required manuals, qualify the next
exact candidate through every mandatory check, recheck remote/source drift,
then use a normal fast-forward only. No production decision is requested.

Development acceptance is pending until the exact next candidate passes every
required Actions job and the combined release is verified. Record final check,
integration and deployment states in Jira; the immutable tag and Actions run
are the authority for candidate identity. Main/production remain held.

Tracked compact browser receipts and full-report hashes are in
`readiness-development-evidence-20261116/`. Typecheck passed on the final
application source; lint passed with the existing hosted-worker export warning.
Candidate 03's six manuals were rebuilt and verified from source
`3cdc1cac1b97a1b1409407df27a2ec638bb58adb`, application hash
`aafa37ad7ce717e72c421187028b02555788bf0ecada73fb49c275c02687c431`.

## Candidate 03 bounded follow-up

The additional application changes are in
`ada927badd2fea3ef6de5e1d2e0b7bc42f9fc824`: restore the existing first-activation
guide to the visible Employee Home, preserve its absence for returning users,
and retain the approved compact Back/confirmation paint with native 44px hit
bands. No screen redesign or Rondo behavior changed.

Browser drivers now use visible current cards, labels and person buttons;
confirmation geometry also proves a trusted outer-edge click reaches the
control without recording an acknowledgement. Management close deliberately
reopens and reviews a blank form after responsive inspector remounts; the
original operation/retry/privacy assertions remain. Manager login waits for
protected shell readiness instead of an idle network containing polling.
Home required-item checks preserve visible review links and action-needed
indicators in the current presentation.

| Local execution | Actual result |
| --- | --- |
| Management-close browser (`management5`) | Passed; six checks, Chromium/WebKit, real inactive worker/location/tablet close, privacy retirement, lost-response/account replacement and one canonical operation. Source `bc7aebc7005f3586b81176f042b358a1a0d663a4`. |
| Delegated-correction browser (`delegated3`) | Passed; three checks, Chromium/WebKit, separate reviewer and exact-operation private recovery. Source `5776872ea887e03b210921fa14d371257c64a987`. |
| Mobile Access main journey (`mobile5`) | Passed in Chromium/WebKit/Firefox, zero runtime/window exceptions. Activation, visible first guide, recovery, identity correction, logout/account switching and permission refusals. Source `ba53aa6375231a49fc2b8dfc7d095d192ebcc13b`. |
| Other Mobile Access files (`mobile3`) | Four passed: landscape/rotation, onboarding, recovery routes and recovery effects. The main journey failed there on old Spanish punctuation; its later complete result is `mobile5`. |
| Clocker journal lifecycle (`clocker3`) | Both engines passed, four fictional state reads each, zero writes, closed resources and unchanged source `c8956400c05a139934f8235c29cee66ebfa72175`. |
| Focused unit checks | Three files, 20 tests passed (`candidate3-focused-unit.log`). |
| Release engineering | 368 Node tests passed (`candidate3-engineering.log`). |
| Type/lint | Typecheck passed; lint had zero errors and the existing hosted-worker export warning. |

Failed intermediate runs are retained and are not passing evidence. Home's
complete seven-width suite has not passed locally: the latest recorded failure
was a duplicate hidden legacy H1 in a native keyboard path (`home6`); the driver
now targets the visible title. Earlier failures exposed old review-row selectors
and manager network-idle waits. The final exact-SHA Actions matrix remains the
gate; do not call the whole browser release accepted from the local successes.

The Rondo owner must resolve its separate gate: candidate 02's coverage-actions
and coverage-plan journeys hit a legacy Home AI-manager link under the mobile
header, and its main advisor journey retained a WebKit framework diagnostic.
Those Rondo files were not changed or waived here. No message or interruption
was sent to that owner or another chat. This is a written integration dependency.

Jira descriptions/labels and workflow status were updated and read back for
SCRUM-204–207: **In Progress**, implemented, acceptance pending. The obsolete
needs-reproduction label was removed. No issue was marked Done; development and
production remain unchanged by this work until the release gates permit them.

## Final bounded handoff status

Follow-up: `2026-11-16-readiness-webkit-navigation.md` records the independently
reproduced scheduling browser-navigation race and its 40-check Chromium/WebKit
repair. The old candidate-03 runtime failure remains failed evidence; use the
new handoff's exact source and subsequent candidate qualification.

Candidate 03 is `1e7a9257808372bc4cf6922ad21aab66a93820c7`:
[CI 43885969955](https://github.com/JoseK0514/NEVORA/actions/runs/43885969955),
[Mobile Access 43885969907](https://github.com/JoseK0514/NEVORA/actions/runs/43885969907).
It is **not accepted for development**. Several required browser jobs failed;
no check was waived and no development/main branch was pushed. Its source-bound
local optimized build passed, exit 0, clean and unchanged (`build3-source.json`).
All 21 focused unit tests passed at the normal timeout
(`candidate3-qualified-unit-final.log`). Two preceding manual-test runs timed
out locally; a diagnostic and then the unchanged normal-timeout run passed.
Those failures remain recorded; no test timeout or assertion was edited.

Post-candidate test-driver follow-ups end at
`9b20eb5769d5e246ee0968d955441387fb603fd5`. They are not covered by candidate
03's Actions receipts. They reset the separate keyboard path after the trusted
pointer probe, use the current Confirmed chip, count the rendered unpublished
notice, target the visible notification IDs, and replace the correction login's
network-idle wait with protected shell readiness. They make no additional
application or policy change. The manuals are rebuilt again after this written
handoff; use the final Git commit and application hash in their manifest.

The local attention rerun (`attention6`) passed its trusted native 44px pointer
probe, native keyboard traversal, republish conflict/refusal, current revision
confirmation, exact lost-response retry, privacy retirement and access-revocation
assertions in the first Chromium/320 cell. The suite then failed at the
unpublished-week coverage status assertion (script line 153 at that source).
It is **not** a passed 14-cell suite. Claude must review the current visible
coverage warning/semantics against that preserved assertion; do not remove the
completeness requirement to clear CI.

Other observed candidate-03 browser blockers for combined UI acceptance:

- Home: the notification-membership check reached a hidden legacy row; the
  visible-ID driver follow-up above is committed but needs the full matrix.
- Corrections: login waited for network idle while Manager polling continued;
  the readiness follow-up above needs the complete correction regression.
- Clocker: the real punch journey waited for the earlier `Enter your PIN`
  heading. Lifecycle/IndexedDB and break-filter probes passed, but the full
  journey did not.
- Attendance: the earlier collapsed `Time corrections and flagged clock-ins`
  control is no longer found; the whole Phase D/remediation gate also remains
  unqualified. Preserve the recorded-time, private-lifetime and correction
  assertions while aligning the actual visible workflow.
- Communications and calendar: required first-cell scenarios failed; inspect
  their `browser-failure-report.json` in candidate-03 Actions artifacts. Do not
  infer passing suites from the separately passing readiness probes.
- Mobile Access: the main local 18-check activation/recovery/account-switch
  journey passed in all three engines. The exact candidate's workflow failed a
  WebKit landscape assertion; the local landscape run had passed. Retain the
  discrepancy and qualify the exact CI artifact; hosted acceptance is pending.
- Rondo remains a separate owner's dependency, as recorded above.

These are bounded integration dependencies, not reopened backend findings or
authorization to redesign other owners' screens. Codex's four backend fixes and
the required stale-action/history wiring remain implemented. Claude retains UI
ownership; the integration owner must qualify one combined final source after
these blockers. No other chat was messaged, interrupted or modified.

Jira comments 10421–10424 record candidate 03, exact sources, passing local
checks and pending integration. The issues remain In Progress. Later Actions
and follow-up-source results must be added before development acceptance; no
independent finding was self-closed and nothing was deployed to production.
