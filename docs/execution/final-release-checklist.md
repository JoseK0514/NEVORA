# NEVORA — mandatory final-release checks

This register records explicit release requirements. It supplements, rather than replaces, the Lettered Executive Program and each phase's acceptance evidence. An unchecked item is not certified by an earlier branch's passing tests.

## FR-AUTH-001 — Independent verification of final transactional authorization

**Status: OPEN — REQUIRED BEFORE PRODUCTION.**

Decision owner: Jose. Implementation and current technical-review owner: ChatGPT. Final independent reviewer: Codex.

On 2026-10-05, Jose approved a final ChatGPT review and fresh tests now, with Codex's independent review of this correction deferred to the final release before production. This changes the timing of review; it does not waive it. There is no additional Codex handoff required at this intermediate checkpoint.

Correction: `2e94143d6fef97bbb43b8cde45d893cf441dc45f` on `fix/phase-b-final-authorization`, exact parent `55c0c9bee2e81bfb07c9a241c81fb747c38ce309`.

Related finding: B-FR-01, the late-write session-expiry gap first reproduced in Create Position and Create Location and then in analogous management paths.

Current review: [Phase B authorization final self-review](phase-b-authorization-final-self-review.md). Implementation and original RED/GREEN evidence: [remediation record](phase-b-final-authorization-remediation.md).

### Phase B / Phase C reconciliation extension

The [local integration record](phase-b-c-reconciliation.md) preserves the accepted B correction together with C5 and the connected tablet UI. FR-AUTH-001 also covers the additional C1 final Owner checks and pinned enrollment-token lifetime. The final Codex review must include these integrated changes, not only the original B correction.

- [ ] Independently verify all 14 cases in `clocker-phase-b-reconciliation.integration.ts`, including five device-management late Owner-expiry paths, separate enrollment-token expiry, valid controls and B employee changes invalidating old PIN proof without deleting actual time.
- [ ] Replay the original 46 B expiry/control cases with the final Phase C schema installed using `vitest.phase-b-c-authority.config.mts` or a traceable equivalent; review the bounded exact-DML lock observers and retain rollback assertions.
- [ ] Retest single-writer tablet recovery, same employee/device-generation receipt scoping, cross-tab screen-verification binding and preserved versioned break snapshots on the final release SHA.

### Required evidence on the final integrated release candidate

- [ ] **Exact release identity.** Record the final integrated SHA and prove that all corrected management transaction boundaries are retained. Review semantic changes from Phase B/Phase C reconciliation, not only Git ancestry. Old `55c0c9b` evidence alone is insufficient.
- [ ] **Independent source review.** Codex reviews the correction and its final integrations, including final authority checks after all potentially blocking business/history/notification writes, rollback behavior, result indexing, retry handling and lock order. The self-review is not labeled independent certification.
- [ ] **Expiry and valid controls.** Independently run all 46 permanent regression cases (23 expired-session cases and 23 valid controls), or a traceably equivalent expanded suite. Retain table-lock and natural unique-key waits for Create Position/Location, plus catalogue, workspace, employee, schedule/publication, Time Off, deadline and generation boundaries. No discarded, silently skipped or weakened checks.
- [ ] **Self-change and pooled-connection protection.** Verify legitimate self-demotion/self-deactivation, last-Owner safeguards, fresh role/session checks on subsequent actions, and transaction-local captured authority. Missing, mismatched or expired captured authority must reject and roll back; it must not leak between transactions. Repeat or reconstruct the additional author-review probes rather than treating their earlier result as independent evidence.
- [ ] **Complete rollback.** Prove rejected writes preserve business records, revisions, qualifications/eligibility, sessions where applicable, audit/history, notification intents and delivery records. Do not accept a UI error as proof of database rollback or a failed response as proof that a transaction never committed.
- [ ] **Actual release transport and hosted Preview.** Exercise the real Neon HTTP transaction path and the exact hosted release candidate against an explicitly verified, isolated non-production database. Verify ordered statements remain in one transaction, final checks use database wall time, and transaction-local authority behaves correctly with the deployed connection/transport configuration. Use fictional records and disabled providers; do not inject expiry/locks into a live customer database.
- [ ] **Native browser and combined regression.** Verify affected form actions with actual login/cookies in Chromium and WebKit, expired/revoked authority recovery without false success or raw SQL exposure, and valid saves. Run the required combined Phase B + Phase C/release suites and verify the approved UI has not regressed.
- [ ] **Independent closure recorded.** Codex records the exact SHA, commands/results, environment, findings and evidence paths. ChatGPT reviews the result; Jose retains final production approval. If a blocking finding remains, production remains NO-GO.

Permanent expiry regression files (included in `npm run test:foundation:integration`):

`src/test/integration/phase-b-late-write-session.integration.ts`
`src/test/integration/phase-b-analogous-expiry.integration.ts`
`src/test/integration/phase-b-final-boundaries.integration.ts`

Additional self-review evidence, including `profile-authority-probes.mjs`:
`/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-final-self-review-2e94143/`

### Closure record — not completed

Final release SHA: PENDING
Codex reviewer/report: PENDING
Fresh independent test and hosted transport evidence: PENDING
ChatGPT release recommendation: PENDING
Jose production approval: PENDING

## Other release gates remain in force

The change above does not authorize a push, merge, production deployment, hosted migration, live timekeeping, real schedule publication or provider activation. Existing hosted schema/migration validation, backup/rollback readiness, combined functional/security/UI regression and explicit release approval remain separate requirements. Phase C reconciliation and its combined regression must pass before C6 continues. This register is documentation, not a newly installed automated deployment interlock.
