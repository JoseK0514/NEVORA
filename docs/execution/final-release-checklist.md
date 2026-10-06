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
- [ ] **Governance & Risk recommendation.** The Director of Governance & Risk consolidates applicable policy/control compliance, material residual risks, open exceptions, release-custody evidence and unresolved audit findings for the exact candidate. Any required exception or risk acceptance is explicitly decided by Jose; this recommendation does not replace independent QA/UI or security evidence.
- [ ] **Independent closure recorded.** Codex records the exact SHA, commands/results, environment, findings and evidence paths. ChatGPT reviews the result; Jose retains final production approval. If a blocking finding remains, production remains NO-GO.

Permanent expiry regression files (included in `npm run test:foundation:integration`):

`src/test/integration/phase-b-late-write-session.integration.ts`
`src/test/integration/phase-b-analogous-expiry.integration.ts`
`src/test/integration/phase-b-final-boundaries.integration.ts`

Additional self-review evidence, including `profile-authority-probes.mjs`:
`/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-final-self-review-2e94143/`

### C6 schedule-context coverage — included in FR-AUTH-001

The [C6 local checkpoint](phase-c-c6-checkpoint.md) does not close this gate. On the final integrated SHA, Codex must also verify the shared publication-week lock order before employee/device locks, source snapshot revalidation, identity expiry during a publication wait, exact immutable capture/ledger rollback, old-receipt replay without rematching, and no transaction-local context leakage on connection reuse. Rerun the 29 C6 SQL cases and 27 candidate cases, plus the three final-review probes (or durable equivalents), and prove the real Neon transaction transport on isolated Preview. Preserve privacy: detailed schedule context is not shared-tablet success metadata. No match/ambiguity must be turned into attendance or payroll policy.

### C7 Manager live operations — included in FR-AUTH-001

The [C7 checkpoint](phase-c-c7-checkpoint.md) does not close this gate. Codex must independently verify current Owner/Manager-only access at both route and SQL boundaries, session expiry during the actual blocked monitor SELECT, private/no-store responses, honest empty versus unavailable states, position snapshot privacy and preservation of actual overnight history. Retest queued requests after unmount/pause, obsolete-response ordering, 30-second visible-page polling, bounded snapshot/session lifetime, stalled-response recovery, offline/restored-page clearing and mobile navigation clearance. Run `clocker-monitor.integration.ts`, the C7 unit suites and `scripts/phase-c-monitor-ui-qa.mjs`, plus the supplemental layout/recovery script in the checkpoint evidence (or durable equivalent). The final hosted Neon/Preview transport and physical-device checks remain separate mandatory release validation. No automatic production activation is implied.

### C7 release-control reconciliation

[The local merge record](phase-c-c7-release-reconciliation.md) binds C7 `01357cd` and remote release controls `82f53d3` to fresh combined verification. No audit gate is closed by this local merge. CI and hosted/independent release evidence must identify the eventual integrated SHA; an earlier remote CI result does not certify C7 or later C8 changes.

### C8 Employee Home and My Time — included in FR-AUTH-001

The [C8 checkpoint](phase-c-c8-checkpoint.md) does not close this gate. On the final integrated SHA, Codex must independently verify Employee/Lead self-service scope derived only from the real portal cookie, rejected employee selectors, current authority after blocked reads, honest unavailable/empty states and private/no-store response handling. Retest exact recorded-time and break calculations across overnight/DST boundaries, explicitly bounded earlier history, preserved stored break names and the absence of payroll deductions or time-entry writes.

Replay `clocker-employee-time.integration.ts`, the employee-time projection/controller/route/component suites and `scripts/phase-c-employee-time-ui-qa.mjs`. Include C7 regression after shared private-controller extraction, short-session expiry, malformed/stalled responses, queued/obsolete requests, offline/restored-page cleanup, keyboard disclosures and mobile navigation clearance. The supplemental `layout-review.mjs` in the C8 evidence directory (or a durable equivalent) retains the additional 14 checks; use actual keyboard navigation and correctly convert CSS color formats without weakening contrast thresholds. Real hosted Neon/Preview, physical-device and final independent evidence must identify the final release SHA. No production activation is authorized by local C8 completion.

### C9/C10 Phase C frozen-candidate coverage

The [C9/C10 local checkpoint](phase-c-c9-c10-checkpoint.md) completes author-side Clocker UI acceptance and integrated local hardening; it does **not** close this release gate. Final independent review must use the exact published integrated SHA, not the local runtime predecessor or an earlier CI run.

- [ ] Rerun the complete Clocker persisted lifecycle and security suites, including device setup/rotation/revocation, PIN rate limiting/privacy reset, idempotent punch recovery, simultaneous tablets, explicit break types, schedule capture, Manager monitor and Employee My Time.
- [ ] Rerun the C9 browser acceptance in Chromium and WebKit at the required phone/tablet/desktop sizes, including 1024×768 and 768×1024, keyboard/focus, long content, loading/success/error/conflict/retry/recovery, double-action prevention and no runtime/hydration errors.
- [ ] Verify the active /clocker/[location] route has no dependency on the unreachable legacy ClockerKiosk demo/local-state path and that production punch activation remains an explicit environment decision.
- [ ] Run complete unit, Clocker, Foundation, authorization-replay, generation, shift-change, notification, configuration, typecheck, lint, build and production-dependency-audit gates on the exact release candidate.
- [ ] Record exact GitHub CI success, exact hosted Preview/Neon deployment-to-SHA mapping, isolated schema verification, Vercel project/team identity, observability and rollback readiness before production.
- [ ] Preserve all previously disclosed limitations: local browser evidence is not physical-iPad/screen-reader certification, and the earlier tiny unexplained Clocker paint differences are not silently reclassified as resolved.

### Executive Phase C release remediation

The [Phase C release remediation checkpoint](phase-c-release-remediation.md) addresses the local blocker set discovered after C9/C10 without closing this independent gate.

Local remediation now provides canonical numbered migrations 0011–0015, deterministic Employee My Time browser QA, a release PostgreSQL CI job covering Foundation/authorization/generation/exchanges/notifications, corrected architecture/release-control records, removal of the unreachable local-state Clocker demo and a production dependency audit with zero runtime vulnerabilities.

- [ ] The exact final candidate must prove migrations 0011–0015 on a fresh hosted-isolated database and as an upgrade from the exact hosted 0010 state. Local disposable-PostgreSQL proof is necessary but not sufficient.
- [ ] GitHub CI must pass on the exact published candidate SHA, including validate, Clocker PostgreSQL and release-postgres. Earlier remote SHA 82f53d3 does not certify the remediation.
- [ ] Hosted Preview and real Neon HTTP transport must map to that same exact SHA before independent authorization review.
- [ ] Codex must independently rerun/review FR-AUTH-001 and the C1–C10 release coverage against the final SHA; local author remediation is not independent closure.
- [ ] GitHub branch-protection/ruleset enforcement remains unavailable to verify on the current private-repository plan. Procedural frozen-SHA/PR/CI/approval controls remain mandatory.
- [ ] Development-only Next/ESLint audit advisories remain a disclosed tooling follow-up; production dependencies must continue to report zero high/critical runtime vulnerabilities.

### Closure record — not completed

Final release SHA: PENDING
Codex reviewer/report: PENDING
Fresh independent test and hosted transport evidence: PENDING
ChatGPT release recommendation: PENDING
Jose production approval: PENDING

## Other release gates remain in force

The change above does not authorize a push, merge, production deployment, hosted migration, live timekeeping, real schedule publication or provider activation. Existing hosted schema/migration validation, backup/rollback readiness, combined functional/security/UI regression and explicit release approval remain separate requirements. Phase C reconciliation and its combined regression must pass before C6 continues. This register is documentation, not a newly installed automated deployment interlock.
