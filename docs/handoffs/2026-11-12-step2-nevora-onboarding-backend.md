# Step 2 — NEVORA onboarding backend handoff

Codex owns backend/hosting. Claude owns UI, navigation, EN/ES copy and visual
acceptance. Jose's November 12 policy makes development the primary operating
and acceptance release, held to production standards. Promotion of the exact
verified combined release to main/production requires his separate approval.
This bounded work stops after Step 2.

## Source and custody

- Repository: JoseK0514/NEVORA (configured historical Fuel-Scheduler- remote).
- Fresh development base: `242a993897aee4a213a1a9aefdecee2e86394b1f`.
- Initial runtime/test/fixture checkpoint: `e792b482a93311094e15a0711fe305f69c7d9634`.
- Initial guide checkpoint: `4aa3b0f64160560fa33e074bae6a0190b0056c85`.
- Final application/review/candidate/development identities: see the source-bound
  delivery receipt referenced below; initial checkpoints are not relabelled final.
- Detached worktree: `/Users/josek0514/.codex/worktrees/nevora-step2-onboarding-20261112`.
  Existing checkout/worktrees and Claude's work were preserved; no new branch.
- Velani is read-only context. Its completed consolidation at
  `f5082ed5be0e65bb322fe4047dd624ad73e9d493` and Step 1 migration repair remain
  intact. No inquiry/Rondo/website work was reopened. Step 1 PG17/hosted/UI gates
  retain their own owners; NEVORA's PG17 run does not qualify Velani's migration.

Plan: [bounded verification](../superpowers/plans/2026-11-12-step2-onboarding-verification.md).
Existing issue: [SCRUM-190](https://thevelani-team.atlassian.net/browse/SCRUM-190).
No duplicate initiative, external message or independent finding closure.

## Findings and changes

**Fixed and retested — refreshed signup operation recovery.** When commerce was
on, the existing billing proxy exemption allowed UUID operation polling but
omitted the existing `/api/onboarding/operations/current` recovery path. An
isolated signup origin has no company commerce binding, so proxy returned503
before the verified-signup handler could resume the original operation. RED
regression reproduced this actual proxy behavior. The one-line correction adds
only that exact path to the existing exemption. The existing handler still
requires a current verified signup cookie, actor ownership and exact signup
origin; guessed IDs, missing cookies and another actor remain denied. Adjacent
setup, people, invitation and malformed paths remain commercially restricted.
No signup admission, subscription policy or session authority is changed.

**Fixed and retested — stale UI fixture.** `setup-state.json` had three sections,
obsolete COVERAGE_REQUIRED/NOT_REQUESTED reasons and incomplete actions. Its
regression failed against the real canonical projection. The corrected nine-
section fixture and typed examples now explain actual states and recovery.
`provisioning-pending.json` uses current RECONCILING_RESOURCE rather than obsolete
RESOURCE_CONFIRMATION. These are contract examples, not a new runtime endpoint.

**Verified unchanged — NO BACKEND CHANGE REQUIRED** for the existing setup,
profile, invitation, provisioning and activation services. Added persistence
coverage, not replacement services. No schema/migration, API version, module
entitlement engine or commercial policy change. Optional modules remain optional.

| Requirement | Evidence and disposition |
| --- | --- |
| Closed admission/non-enumeration | Existing admission and owned registration tests: disabled config/requests, generic receipts, counters, duplicate submit, expiry/reverification. Verified unchanged. |
| Registration to Owner sign-in | Owned provisioning/activation/journey: one company/Owner, restricted APP/WORKER/control roles, same-operation unknown reconciliation, 202 until exact APP readiness, 200 activated/SIGN_IN with no session, then actual password action and real session read. Verified unchanged except proxy recovery correction. |
| Two-company isolation | Actual separate fictional A/B databases, duplicate OWNER-1/EMP-1, wrong host/purpose/environment/incarnation/session selectors denied. Verified unchanged. |
| Canonical readiness | Existing staffing/coverage removal plus new eligibility/staffing removal/recovery checks. Owner-only workplace can reach core READY; no employees, positions, wages or legal defaults invented. Verified unchanged. |
| Setup/profile atomicity | Existing lost-commit, changed replay, stale tabs and receipt-failure rollback cases preserve canonical profile/scope/eligibility and progress/receipts together. Verified unchanged. |
| Invitations | Explicit unique1–50 targets; max5 PREPARED per invocation; GET sends nothing; current versions/role generations/session authority, partial/no-email/failed/unknown outcomes, reviewed reissue and one-use activation. Verified unchanged, additional GET/logout coverage. |
| Trial/disabled modules | New real-DB test compares original provisioned_at with commerce trial start, then activation, refresh, replayed skips and final unchanged trial start/end; no devices/payroll setup created. Existing commerce tests retain restrictions. Verified unchanged. |
| UI/customer experience | Claude UI required. No rendered onboarding/browser usability, mobile, keyboard, locale, copy or visual acceptance claimed. |
| Hosted acceptance | Required separately; no provider/resource creation, external SMTP/SMS, Stripe/model calls, hosted migrations or deployments performed. |

The journey uses actual HTTP Request/Response adapters and normal password/session
services with an in-memory Next cookie adapter; it is not a rendered browser or
hosted TLS claim. Company persistence/concurrency uses disposable PostgreSQL17.10,
real SQL/roles/transactions; SDK fetch, provisioning and external transport are
owned/synthetic. Test helpers that seed sessions for domain cases do not replace
the separate normal-sign-in journey. No production credentials/customer data.

## Modified paths

Runtime: `src/lib/commerce/access.ts` only (one exact path exemption).
Regression: `src/lib/commerce/onboarding-recovery.test.ts`, onboarding
`contracts.test.ts`/`readiness.test.ts`, and integration
`onboarding-{provisioning,setup,invitations,commerce}.integration.ts`.
Fixture additions/corrections: `src/lib/onboarding/fixtures/v1/{README.md,
setup-state.json,provisioning-pending.json,readiness-cases.json,command-results.ts,
invitation-batches.ts,registration-states.json}`. Contract examples include all
current readiness reasons/actions and distinguish reserved union values.
Custody/docs: development source inventory target checkpoint, bounded plan,
this handoff and six source-bound guide PDFs/manifest. Guide prose is unchanged;
required publication regeneration binds the changed application/test inventory.
No UI/application page, navigation, style, schema or dependency change.

## Claude contract

Use the [v1 fixture index](../../src/lib/onboarding/fixtures/v1/README.md) and
[November11 closeout](2026-11-11-signup-backend-closeout.md). The older November7
opening planned wording remains historical. Types and route mapping are linked
from the fixture index; setup writes keep schemaVersion1, UUID operationId,
decimal-string expectedVersion and canonical payloads.

GET state outer ready means the read succeeded, not every module usable.
Sections/reasons/allowedActions come from canonical records, never screen flags.
Do not render a failed read as a fresh empty company. Reserved union values are
not current emissions or permissions. No compatible runtime projection addition
was necessary; existing configuration/destinations/person/status fields suffice.

Retain identical input/ID through timeout/202/unknown. Refresh signup through
registrations/current and operations/current; do not create another company.
After409 preserve safe form input, reread/review, then issue a changed command
with a new ID. Keep passwords/proofs in memory only. Activation never supplies
an employee session: normal sign-in follows acknowledged200. Employee creation,
credentials, invitation validity and delivery are separate. Never automatically
resend UNKNOWN; provider acceptance is not inbox delivery. Missing email remains
an honest block. SKIP never enables Clocker/payroll/notifications/Rondo. Trial
starts at original provisioning; no reset or deletion timer.

## Verification and failures

Exact commands, tool versions, totals, source hashes and redacted logs are in the
referenced evidence packet. Only executed checks are reported; retained earlier
results are labelled separately. Review findings and their follow-up remain
preserved, not overwritten as unconditional approval.

Observed failures retained:
- Fixture RED: one failed/two passed; obsolete projection reproduced.
- Proxy RED: one failed/five passed; operations/current returned503.
- Initial owned baseline:235 passed/1 failed because selected server package
  lacked pg_dump. Matching installed pg_dump/pg_restore17.10 corrected the local
  environment; operations6/6 and complete onboarding239/239 then passed.
- Initial release-build invocation omitted mandatory PHASE_E_EXPECTED_SHA and
  was refused before build. Corrected invocation retained that guard.
- Default-suite skips and existing warnings are recorded, never counted passed.

## Qualification custody at handoff freeze

Initial qualification at4aa3b0f64: full units12,766 passed/895 reported skips;
all seven source-bound onboarding stages passed (owned onboarding239,
Company Access516, exchange36, inventory/manifest/enrollment/managed-worker
checks). Separately executed release PostgreSQL: foundation286, authority46,
generation182, exchanges174, notifications80, all passed; Company Access516.
Focused onboarding/commerce290 passed. Typecheck/build passed; lint0errors and
one existing anonymous-default-export warning at workforcemonitor.entry.ts:17.
Release engineering246 passed; inspector archive custody passed (not findings
acceptance). Initial secret scan:2commits/46.57KB/no leaks.

Review M1/M2 (unchecked fixture assertion and incomplete in-flight logout test)
were corrected at `e01805601c50ff2227efd4315f36d932df6aa71d`.
Follow-up review is CLEAR/APPROVE/no blockers; independent86 unit cases passed,
owned invitation14 passed and typecheck passed. Both original and follow-up
reviews remain in the evidence packet. Runtime bytes remain the one-line fix.

The pre-existing development CI43325639433 onboarding failure is retained at
[the original run](https://github.com/JoseK0514/NEVORA/actions/runs/43325639433).
Its artifact13992119615 records515passed/1failed at the exhausted live-proof
pressure test in company-access-claim-admission.integration.ts:61. A15-minute
bucket rollover is consistent with the fixture/clock behavior but is **not a
proven cause or fixed production defect**. Local source-bound acceptance passed
that test. A new candidate must independently pass all mandatory contexts; no
original failure, assertion or rate-limit control is suppressed.

Final candidate/development checks were pending when this document was frozen.
The durable completion receipt is
`/Users/josek0514/.codex/nevora-step2-20261112/delivery.json`; it records exact
candidate/development SHA/tree, local source-bound results, immutable candidate
ref, protected-check run URLs/context/App IDs and final deployment readback.
Do not infer successful delivery from this checkpoint: read that receipt.
All raw logs, source-bound reports and failed evidence are preserved in the same
directory. This source document and the completion receipt form one handoff.

## Rollback and remaining gates

Rollback before hosted rollout is a source revert of the exact path exemption
and its fixtures/tests, requalification and a new approved candidate. No database
rollback is needed. Reverting reintroduces the refresh-recovery defect; do not
replace it with broader exemptions or automatic create/resend. No deployed
runtime was changed by this task.

Claude: integrate and accept EN/ES responsive/keyboard/refreshed/pending/stale/
partial/error flows against these services. No new backend page is required;
existing signup/activation/setup/people destinations remain the UI surface.

Hosted owner/Jose: separately authorize exact-source joined acceptance using the
original fictional companies, normal human-owned credential recovery, current
capacity, finite time/effect/cost ceiling and actual transport/inbox evidence.
Prior finite allowances are not renewed here. Preserve original worker custody,
source and independent release findings. Do not substitute new companies or
insert sessions to bypass a hosted gate. Public signup, paid activation, provider
calls, tax/pricing/retention policy, main/production and Step3 remain unapproved
by this work order. Existing decisions/budgets persist under their own scope.

Director positions: Engineering supports the narrow seam fix; Security preserves
signup actor/current Owner/company authority and unknown-outcome fences; Product
keeps stable v1 contracts and Claude UI ownership; Delivery/Governance require
source-bound checks and protected development delivery, with hosted/customer
release conditions kept separate. No material exception is requested.


STEP 2 CODEX BACKEND: BLOCKED AT HANDOFF FREEZE — final candidate/protected
checks and development delivery remain to be evidenced by the referenced
completion receipt. Application checkpoint e01805601c50ff2227efd4315f36d932df6aa71d;
base242a993897aee4a213a1a9aefdecee2e86394b1f. This checkpoint disposition is
superseded only by that exact-source receipt, never by assumption.
