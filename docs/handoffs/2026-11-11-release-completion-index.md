# Web release completion packet

Jose's sequence: finish R08–R10, then R11–R16/R33, complete local verification and
independent review, then exact-candidate GitHub Actions, then fast-forward
development. Native, main application changes and production remain separate.
Three branches remain the ceiling. All work here is detached; held Claude UI is
classified but not silently imported.

## Implementation map

| Item | Contract and evidence |
| --- | --- |
| R08 client minimization | Prior qualified R08–R10 packet, statement SQL and real HTML/RSC privacy receipts |
| R09 complete reads | [Complete timecard/correction pages](2026-11-10-r09-complete-capacity-reads.md) |
| R10 audited close | [Management UI acceptance](2026-11-11-r10-management-ui-acceptance.md) |
| R11 delegated corrections | [Approved separate-requester/approver policy](2026-11-11-r11-delegated-corrections.md) |
| R12 cross-operation exports | [Exact artifact identity and operator custody](2026-11-11-r12-export-business-identity.md) |
| R13 correction payments | [Generation, replay and historical download refusal](2026-11-11-r13-correction-payment-refusal.md) |
| R14 timestamp invariants | [Canonical transaction sessions and login fence](2026-11-11-r14-timestamp-contract.md) |
| R15 capacity/CI | [Shared source assembly, measured limits and mandatory allocation](2026-11-11-r15-capacity-and-ci.md) |
| R16 key continuity | [Runtime/operator procedure](2026-11-11-r16-subscription-key-continuity.md), [managed-worker propagation repair](2026-11-11-r16-managed-keyring-propagation.md) |
| R33 repository controls | [Applied protections and candidate publication](2026-11-11-r33-repository-controls.md) |

R12's legacy-isolation warning describes its original baseline; R14 now explicitly
sets READ COMMITTED on both supported business transport modes. Existing deployment
defaults are not substituted for proof. The Manager's intentionally empty payroll
backlog retains a UTC `asOfDate`/`rangeEnd` after the session change; it produces no
periods/counts and current UI hides it. Owner business payroll dates remain explicitly
workspace-local. Do not claim every metadata date is workspace-local.

R12's current client now distinguishes confirmed `already_generated`, directs the
user to the original downloaded files and fences delayed response bodies against
privacy/account/source/expiry changes. Its [integration follow-up](2026-11-11-r12-duplicate-export-ui-integration.md)
corrects the older Phase D scenario that expected a second identical export:
the replacement must prove actual409 refusal, one stored export and original
authenticated API recovery, including mobile/desktop feedback captures. The old
8ee candidate's failed CI remains recorded; a new local browser/review/CI gate is
required. No catalogue/recovery UI or provider submission is claimed. Held Claude
integration must preserve this behavior. R13's unsupported correction-payment
consumer wording remains a held UI note. Server refusal, exact recovery and
historical download controls remain authoritative. Full held Claude UI, hosted
client/provider/operator and production acceptance are not claimed here.

## Source custody and qualification

The first combined frozen candidate743c383ea retained a full default run with
12,048 passed/857 skipped and27 failures in five boundary/fixture files. Its source
was unchanged. The follow-up updates exact migration order to include0058/0059/0060,
the new required management job and unchanged Mobile Access scratch input, and
gives transitive browser fixtures a distinct external capacity evidence directory.
Two further domain unit mocks use the same test-only session seam as the prior
R14 mock adaptations. Account deletion now asserts the stricter GREATEST+1µs
statement. Original negative controls, commit-uncertainty assertions and business
refusals are retained. No production transport/source gate is bypassed by a unit mock.

All failed receipts remain under
`/Users/josek0514/.codex/release-completion-20261111/`. Subsequent exact candidate,
tree, clean-source status, stages, raw logs, source-bound build/browser manifests
and independent verdict must identify the actual later commit. This index is an
implementation/handoff map, not evidence that pending combined or hosted gates passed.
The final qualification/publication receipts in that external directory are the
source of current execution status. Absent publication receipts mean no publication.

The later b0 source passes665 Clocker SQL checks but its first full foundation
cohort fails21/284. The [fixture-boundary repair](2026-11-11-r14-sql-fixture-boundaries.md)
and [active SQL adapter follow-up](2026-11-11-r14-active-sql-adapters.md) explain the
raw/injected timestamp parity and fault-hook changes, with actual142+60 passing
SQL cases. Those scoped results do not substitute for the final frozen combined
default/database/browser/build gates. All earlier failures remain recorded.

The [generation/management fixture follow-up](2026-11-11-r14-generation-management-fixtures.md)
then passes45 actual SQL checks, including five added late generation no-op
refusals. Its fault hooks observe the real post-proof/planning boundary; manual
assignment fixtures explicitly establish Company access and assert the intended
conflict/retry rather than swallowing an unrelated admission failure. The owned
SQL runner now selects the exact generation/exchange database namespaces for
those existing cohort configs without relaxing database custody checks.
R14 additionally has three actual legacy financial compatibility checks allocated
to the existing payroll-source SQL gate; see its timestamp-contract handoff for
pending-review, finalized-card and frozen approved-payroll behavior.

Independent R14-ALLOCATION-1 identified that the17 account-deletion SQL checks,
including future-token monotonic fencing, were locally selected but absent from
mandatory CI. The required release-postgres job now invokes their dedicated owned
timestamp-token config unconditionally and always retains its JSON result.
The regression contract fails against the earlier workflow and rejects removed,
conditional, allowed-failure or artifact-omitted variants. This is an allocation
repair, not a runtime/schema change; independent closure and the updated frozen
combined qualification remain required. The earlier e31 combined run passed all
767 release SQL cases and then stopped source-unchanged for this correction;
its unexecuted later stages remain unexecuted.

The next c9 qualification again passed767 release SQL cases, then onboarding
acceptance refused three unclassified additions before running its database
steps: the R10 close route, R11 delegated-request route and R14 session helper.
Their explicit inventory dispositions now describe current company/actor/domain
authority and the helper's caller-selected driver. The inventory scanner and
unseen-path refusal remain unchanged. This metadata correction does not change
application, test, schema or runtime bytes; its failed receipt is retained.

## Release boundary

After local and independent gates, publish a unique immutable candidate tag,
require every one of the ten current protected check contexts on that exact SHA,
then re-fetch/reconcile development and publish only by ordinary fast-forward.
No failed/unfinished gate is waived. The main application and Vercel Git deployment
hold remain untouched. Native stays excluded; no real notification, payroll payment,
provider export, customer mutation, hosted migration or key rotation is implicit.
Hosted rotation retirement requires database plus client/cleanup continuity;
capacity observations do not establish a hosted SLA. Default-branch Dependabot
alerts and disabled code scanning remain accurately reported separately.
