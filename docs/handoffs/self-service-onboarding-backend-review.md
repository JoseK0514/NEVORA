# Review custody and author disposition

2026-11-08. The fresh reviewer requested changes at the historical candidate below. This record preserves that independent result. The author then regraded the six HIGH findings plus sender readiness, mutation composition and inventory coverage as Important and performed one RED-to-GREEN fix pass. There was no second reviewer and no claim that the reviewer approved the fixes.

| Finding | Fix and behavioral evidence |
|---|---|
| Activation starvation/fairness | Eligible registrations/registry filtered before SKIP LOCKED claim; requeue advances ordering. Ten abandoned + two live companies regression. |
| Dispatch ceiling | Account-wide UTC-day advisory lock and durable attempt slot; confirmed rejections alone release capacity. Prior-day insertion + concurrent lower-cap dispatch regression and existing unknown-create recovery. |
| Canonical stale edits | Additive0052 advances one shared revision per transaction for established settings/profile/catalog writers. Existing workspace/staffing/coverage writer then stale onboarding regressions, atomic receipt rollback. |
| WORKER takeover | Enumerated relations/column capabilities, checked immutable row-lock columns and fixed no-write lock definer. Actual restricted-login credential/session/role SQL denials and real payroll lease completion/notification dispatch receipt. |
| Proof expiry during lock wait | Consuming UPDATE rechecks digest/environment/unused/unretired/deadline and must return one row. Actual unchanged row lock held across expiry mints no session. |
| Signup refresh | Protected no-store registrations/current GET from the exact signup cookie; refreshed and reverified stale tab recovery, no secret/email projection, foreign/duplicate cookie denials. |
| Sender readiness | Uses the actual workspace-scoped sender configuration, preserves CHECK_STATUS, removes INVITE and reports DELIVERY_NOT_CONFIGURED when unavailable. |
| SQL marker fail-open | Explicit mutation/read transaction composition replaces spelling detection. Unexpected transaction refuses before SQL; canonical writes and common receipts remain atomic. |
| Inventory coverage | Tracked routes, server-action directives (including inline/comment/no-semicolon), worker/function boundaries and direct provider/database imports checked; bounded test exemptions, unseen paths fail. |

Full final-source suite/report is recorded by the acceptance command and local ledger. Minor/declined scopes and all rulings are preserved in [decisions](self-service-onboarding-decisions.md). They remain open where evidence is absent.

---

# Whole-branch backend review

**BLOCK · REQUEST_CHANGES**. Reviewed base e2872f30ea8548b1310ea4a9b25813352decf82a through 40e11b8258f53eef962f55c1687eb02e9fbb6cf2 and the acceptance default change at 2e7937a453796d2294493c9f21a983e3eb8a83d2. Detached checkout. Review artifact only. No application or test edits.

## Strengths and evidence

The routing transport binds the actual login, company anchor, environment and incarnation before and after each business transaction. Owner activation takes parent locks, checks the company grant against live target state after hashing and journals credential consumption in the same database transaction. The provider worker persists an attempt before sending, searches for the exact resource on recovery and avoids a duplicate POST after an ambiguous result. Invitation batch dispatch durably claims each item before invoking the canonical invitation service and reads each child receipt on recovery. The SQL restore workflow preserves a suspended state across the two stores and supports retrying the same retirement operation.

Inspected the code, spec, plan, contract, ledger, runbook, integration tests and evidence. The 40e11b825 report in .omo/evidence/onboarding/40e11b8258f53eef962f55c1687eb02e9fbb6cf2-f7d84027-92d9-49dc-83bc-362185763bdc/report.json records a manifest and owned onboarding pass followed by a legacy runner failure. The scoped backup-green log records six passing operations tests. No fresh suite was run by this reviewer. The subsequent acceptance script change forwards the same local binary default to the legacy runner. A newer run is the executor's verification.

## CRITICAL

None identified.

## HIGH / Important blockers

1. **Activation worker starvation.** src/lib/onboarding/owner-activation.server.ts:86 selects the ten oldest operations before checking registration expiry or current registry state. Ten abandoned expired registrations fill the window on every invocation and the worker reports idle while a new valid Owner is waiting. Line 143 also leaves updated_at unchanged when requeuing a live idle candidate. Filter eligible registrations and registry rows before limiting and rotate deferred candidates fairly. Test ten expired operations followed by one live operation.
2. **Daily creation budget can be exceeded.** src/lib/onboarding/provisioning/store.server.ts:27 counts operations reserved today. src/lib/onboarding/provisioning/orchestrator.server.ts:55 journals and dispatches creates without enforcing today's account budget. With limit one, a reservation on each side of UTC midnight and a stopped worker produces two creations on the second day. Acquire durable account/day dispatch slots with the attempt, preserve uncertainty and enforce a lowered ceiling against backlogs.
3. **Stale canonical settings can overwrite newer business data.** src/lib/onboarding/setup.server.ts:72 checks only onboarding_progress. src/lib/data/workspaces.ts:68 obtains the canonical version on the server when the stale command arrives. Save a new name through the established workspace settings interface, then submit the earlier onboarding form. That settings change leaves the onboarding revision unchanged, so the stale name replaces it. Make externally updated canonical revisions participate in the guarded write for each affected adapter, including staffing and coverage. Test through both normal entry points.
4. **Worker can take over an Owner account.** src/lib/company-bootstrap/server.ts:58 and :63 grant the job login full CRUD on every business relation outside seven excluded tables. This includes employee_credentials, employee_sessions and employees. A compromised payroll/notification worker credential can reset a real Owner password or mint a session in its company. Define actual worker table/column privileges, deny credential/session/role writes, and prove real job behavior plus SQL denials under that login.
5. **Expired signup proof can mint a new session after a row-lock wait.** src/lib/onboarding/registration.server.ts:102 tests expiration in the locking SELECT. A concurrent transaction can hold the same unmodified row until expiry. The consuming UPDATE at :107 predicates only on id, then :108 creates a fresh signup session. Enforce the full live-digest test in the consuming UPDATE after acquiring the lock and require one returned row before issuing any session. Cover an actual row-lock wait across the deadline.
6. **Verified signup cannot resume from its current cookie before reservation.** src/lib/onboarding/registration.server.ts:34 supplies readRegistration without a route. src/lib/onboarding/provisioning/store.server.ts:23 returns version_changed without the current version, and :43 returns ACCESS_DENIED when there is no provisioning operation. A refreshed browser with only its valid cookie or an old tab after reverification cannot recover the expected revision to submit its workspace. Add a session-protected current-registration read on the signup origin and test recovery without browser-stored proof, email resend or revision guessing.

## MEDIUM

- **Sender availability omitted.** src/lib/onboarding/readiness.server.ts:11 always offers INVITE. With sender disabled, src/lib/onboarding/invitation-batch.server.ts:66 rejects that action. Derive sender availability from the real settings, return its actionable reason and keep status readable.
- **SQL-text matching can fail open.** src/lib/onboarding/setup.server.ts:69 sends unrecognized SQL straight to the executor. Markers at :89 recognize mutation by spelling. A canonical writer changing whitespace, adding a CTE, or moving its mutation can commit a business write without revision or receipt and return MUTATION_NOT_CONFIRMED at :104. Use an explicit transaction-composition seam and refuse unexpected write paths before execution. The same mechanism wraps employee creation and batch preparation.
- **Incomplete UI fixtures.** docs/handoffs/2026-11-07-onboarding-backend-ui-contract.md:68 calls for versioned fixtures covering the result union, including unavailable sender, partial group, invalid activation and recovery. src/lib/onboarding/fixtures/v1 contains only four JSON cases. Provide the missing examples from actual response shapes for the UI handoff.
- **Inventory gate misses new routes.** scripts/onboarding-acceptance.mjs:13 checks for missing classifications only beneath src/app/api/onboarding. A new public download, auth, action or job outside that subtree can be absent while this check passes. Compare the tracked runtime entrypoint set against the inventory using explicit coverage rules and bounded exemptions.
- **Implementation-mirroring assertion.** src/lib/onboarding/invitation-batch.test.ts:6 invokes the same pure helper with identical arguments on both sides. The integration tests already cover child identity on replay. Test receipt recovery via the normal operation or remove that assertion.

## LOW / Minor

- docs/handoffs/2026-11-07-onboarding-backend-ui-contract.md:3 still presents implemented endpoints as planned. Update the opening status and clearly date historical checkpoints.

## Skill and scope dispositions

Consulted remove-ai-slops and programming, including the TypeScript perspective. The matching-by-SQL behavior and implementation-mirroring test above violate those perspectives. No deletion-only new test was identified in the reviewed changes. Actual PostgreSQL transactions, process termination, restored images, loopback SMTP and behavioral replay assertions supply substantive coverage.

## Declined to judge

- Actual browser, locale, keyboard, mobile and native installed-shell behavior. The integrated UI and installed native surface are absent from the review packet.
- Neon account permissions/cost entitlements, exact hosted HTTP transport, live DNS/TLS, provider backup custody and real mail arrival. The evidence uses owned PostgreSQL and simulated provider/loopback delivery.
- Hosted CI, branch-protection state, production approval and independent release/security certification. No remote or production action was authorized in this review.
- Live post-restore reactivation. The operator runbook leaves the company suspended and requires a separate reviewed recovery operation.
- Final pass/fail for verification running after 2e7937a45. The parent owns that evidence.

**Merge assessment**: request changes for the six HIGH findings. No hosted or release readiness disposition follows from this review.
