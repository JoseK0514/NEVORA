# Claim counter bucket fixture review

codeQualityStatus: CLEAR
recommendation: APPROVE
blockers: []

Scope: uncommitted company-access-claim-admission.integration.ts and new company-access-claim-clock.test-support.ts in the root-owned checkout. No production source change or source edits by reviewer. Approval is for the bounded test correction, not repaired development qualification.

## Findings by severity
CRITICAL: none. HIGH: none. MEDIUM: none. LOW: no required change.

## Minimality and behavior preservation
The helper captures a database timestamp, then substitutes a new bound timestamptz parameter only for the exact date_bin15-minute clock expression in statements referencing company_invitation_claim_counters. It preserves existing parameter values, remaining statement text, actual query/transaction execution and AbortSignal forwarding. The real date_bin operation, bucket conflict/update, limit10,24-hour retention, locks, proof/role/session eligibility, expiry, password derivation, credential writes and consume events are not replaced by fake results.

Inspected companyAccessFixture: its q closure resolves db.executor dynamically, so fixture counter seeding and claim calls both use the same pinned input after counterFixture installs the wrapper. There is no split between real-time seeding and pinned claim reads. Error setup disposes the owned database. Only the three bucket-sensitive existing cases change fixture; other work-slot/error/unknown-commit cases retain their original clock behavior.

Existing assertions remain unchanged, including100 exhausted-proof rejections, no derivation, fresh invitation budget isolation, concurrent saturation/one consumption and97 historic buckets. The added real SQL rollover case first proves exhaustion/no hashing, advances only the counter clock one bucket, then proves activation/one hashing call, unchanged previous exhausted row and one new attempt. This preserves explicit rollover coverage rather than making rollover invisible throughout the suite.

## Risk of hiding production defects
The test now deliberately establishes a single stable bucket for tests whose precondition is exhaustion within that bucket. It does not test wall-clock crossing during those loops; the separate advancing case covers the resulting new-bucket behavior through real SQL. It cannot certify production scheduling/time progression, a15-minute real elapsed expiry, or every possible crossing between read/admission statements. Those are not claims made by this correction. Exact SQL-expression matching is narrow test instrumentation, not a general SQL parser or authorization layer; a future expression change needs fixture review. No rate limit or assertion was weakened to get green.

## Evidence inspected and causal limits
Verified retained artifact13992119615 ZIP SHA2567250f79eb54d94c7b92f3f3304b7ca21d9d74eb99d10e65d766127b3f1f6a1d4 against its download receipt and hosted upload log. Its foundation log shows515 passed/1 failed of516, with exhausted-proof expected invalid receiving activated. Hosted phase ends around23:15:30, consistent with a15-minute boundary during that suite but not direct timestamp proof of the failing counter read.

Inspected claim-bucket-boundary-red.log: forced test-only bucket advance reproduces the same activated-versus-invalid failure. This establishes a concrete mechanism and invalid test assumption; it does not retroactively prove exact CI bucket timestamps or rule out every other possible cause. Keep that distinction in the handoff.

Inspected claim-bucket-boundary-green.log:7/7 focused tests passed, owned cluster stopped. The full foundation log contained only startup at review time, so no full-foundation success is claimed. The typecheck log showed invocation without completion evidence; no typecheck success is inferred from that log alone. Independently ran only git diff --check (passed), not a server/test reproduction. Root owns remaining executions.

## Skill perspective and completion boundary
Programming/remove-ai-slops perspectives loaded earlier in this session were applied. Injecting a clock at the test SQL seam addresses nondeterminism while retaining the real behavior under assertion. The rollover test exercises an observable state change and old-bucket retention; it is not deletion-only, tautological, prompt-pinning or a copy of an implementation constant assertion. No unnecessary production extraction/parsing or speculative abstraction added.

No provider/CI rerun, DB query, new server, private custody access, source mutation or broad gate waiver. Only this report written. Actual-development242 failure remains retained; the corrected source still needs the required local and source-bound candidate/development qualification. No hosted acceptance or independent-audit closure.
