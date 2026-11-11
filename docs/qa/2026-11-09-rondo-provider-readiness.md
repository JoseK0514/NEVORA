# Rondo provider diagnostics and challenge readiness

Follow-up: the separately budgeted [live replay](2026-11-09-rondo-live-replay.md) and [$2 continuation](2026-11-09-rondo-live-completion.md) subsequently answered all three original failure cases safely and completed all thirteen Owner model scenarios. [Independent QA](2026-11-09-rondo-independent-review.md) approved the defined behavior pack; source reconciliation, integrated CI and hosted acceptance remain open. The results below describe the earlier local-readiness checkpoint.

November 9, 2026. Local follow-up over `537e4eb8454f0a0f072b4ef013e950054d15ee7d`, originally based on development `3446982085c32b238b4d329c98639f3978c6e8b2`. No branch, production deployment, remote push, customer mutation or new paid model call.

## Findings and remediation

The original three live failures remain **open for upstream reproduction**: NEVORA `exfiltration-and-hidden-instructions`; VELANI `es-injection-and-private-data` and `en-professional-under-pressure`. Their historical HTTP status/body was not retained. These changes fix demonstrated diagnostic/recovery defects, not an invented explanation for those rejections.

- NEVORA discarded HTTP status and rejected bodies, and could allow an arbitrary transport exception to escape the investigation. It now reduces failure diagnostics to a validated status and fixed category. Error-body reads are bounded to 4 KiB, 32 chunks and 250 ms, with stream cancellation. Network exceptions are sanitized; there is no automatic retry or fallback model.
- The Owner endpoint logs only fixed diagnostic fields. Public error JSON remains unchanged and excludes upstream metadata, raw bodies, headers, credentials, company records and causes.
- VELANI's engine discarded already-sanitized errors from a custom transport. It now preserves validated status/category fields and rejects arbitrary hint values. Its evaluation report retains those safe fields instead of storing only `provider_unavailable`. The existing SDK path and public API error contract remain intact.
- The new leadership runner records failed turns before stopping, including sanitized failure metadata and whether business records changed. It never turns an exception into an answer or semantic pass.

Regression evidence was recorded before each fix: two missing NEVORA diagnostics, an escaping transport exception, VELANI's lost status/arbitrary hint, and two lost failed-turn captures. Subsequent passing results are retained beside these failures.

## Sixteen executable fixtures

The [case pack](rondo-company-leadership-challenges.json) is now backed by real disposable PostgreSQL records, current authority checks, canonical coverage reads and real advisor service calls with an explicitly scripted transport. The readiness runner disables ambient external fetch and supplies fictional provider credentials only.

Thirteen cases exercise conversations: feasible control; one-worker/two-site shortage; accepted eight-hour tradeoff; availability removal and restoration across three turns; unavailable business systems; an unsupported policy overriding recorded hours; another Owner's private context; compound reported hazards; Spanish payroll uncertainty; one carry-in time record; empty current publication versus history/draft; changed priorities with unchanged facts; and source input limits.

Three cases exercise server invariants directly: Manager denial before inference; canonical draft recovery after a lost committed reply without duplicate assignments/publication/messages; and cancellation of an injected task investigation followed by rejection of the same failed request identity.

The suite also verifies failed-turn capture using both a typed provider failure and an arbitrary exception. Technical readiness is false if any of the 16 cases, the two capture checks or the no-network check fails. Scripted replies explicitly identify themselves; they are not reference model answers.

## Running the local suite

With locked dependencies installed and `NEVORA_TEST_PG_BIN` pointing to the existing local PostgreSQL tools:

```sh
node scripts/payroll-postgres.mjs vitest.rondo-leadership.config.mts
```

The owned runner rejects `DATABASE_URL`, creates a new loopback database and removes only its owned cluster afterward. It never seeds an existing environment. Results are written under `.omo/evidence/rondo-provider-challenges-20261109/`; `leadership-readiness.json` explicitly records `semanticAssessment: not-run` and `paidModelCalls: 0`.

`prepareLeadershipFixture()` and `runLeadershipConversation()` provide the fixture and conversation hooks for a later bounded model run. The conversation helper has no default fetch, credentials, model choice, budget admission or network access: the future live caller must supply a freshly admitted, budget-guarded advisor-service invoker. The 13 conversation cases contain 16 turns in total. The other three cases remain server invariants, not model reasoning scores. Capture the actual replies and failures, then review each against its oracle and critical-failure list independently.

## Verification and release impact

Final relevant runs: 258 NEVORA advisor unit tests, 153 advisor PostgreSQL integrations, 18 leadership-readiness/capture tests, and 196 VELANI tests with real PostgreSQL 17/pgvector — **625 passed, zero skipped**. TypeScript checks and the VELANI build passed. No UI was changed; browser acceptance was not rerun for this backend/test change.

All operating-data access remains Owner-only. Model tools were not expanded. Diagnostic categories describe the observed status/provider claim; they do not independently prove the upstream root cause. Logs contain no raw provider material.

The closed November 9 $5 ledger is not reused. The three original live failures and actual-model performance on this pack still require a newly authorized bounded run. Exact hosted environment acceptance, integration of the local commits and independent release review remain open. This is technical fixture readiness, not independent certification or production sign-off.
