# Nov 15 inspection backend intake

Status: source verified; handoff accepted; Jose approved implementation in this chat on Nov 15. The first local backend batch is implemented; current evidence and remaining items are in [the validation record](2026-11-15-inspection-backend-validation.md).

## Source custody

- Repository: `JoseK0514/Fuel-Scheduler-` (the live Git remote; older inventory metadata names NEVORA).
- Fresh remote development: `18c75692b841c20cc34590e233abdfdbe2b757ea`.
- Claude collaboration: `ce4de4bc492f1e8a1635bc55a7a335bd82f067fe`; the remote head matches the pasted handoff.
- Claude's checkout: `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB`. Its UI work and review reports are uncommitted and were inspected read-only. They were not copied into application source, staged, committed, or approved by Codex.
- Codex workspace: `/Users/josek0514/.codex/worktrees/nevora-inspection-backend/NEVORA Development`, detached from freshly fetched development. No new branch created.
- Exact incoming handoff: [source text](2026-11-15-claude-inspection-backend-source.txt). Claude's uncommitted per-area reports remain in the collaboration checkout at `docs/product/review-2026-11-14/fixes/`.

The first managed-worktree creation failed because the partial clone lacked checkout blobs. The missing development checkout blobs were fetched from the existing remote, and the managed-worktree retry succeeded. No source checkout was reset.

## Jose's latest payroll direction

Jose wrote: “I think what we want is something for now that can provide the statements but i think for now we will have the calculation done out of nevora, what do you think?”

Recommendation: use the existing external-amount import and statement workflow for this release. Approved hours can be exported for an accountant or external payroll system. Import externally calculated gross, deductions, employer contributions and net; validate reconciliation and employee/period identity; review, approve and share statements. Payments and remittances happen externally. Preserve the source reference and immutable statement history.

Jose approved this statements-only direction and implementation in this chat on Nov 15. It does not authorize customer activation or final payroll/legal wording. It supersedes the intake's original multiple-choice alternatives as the current product discussion. Native 2027 calculation and native-only enhancements should not be implemented before resolving this direction.

Verified in current development code:

- `src/lib/payroll/contracts.ts` defines `NEVORA_PAYROLL_IMPORT_V1`, with USD minor-unit strings and a source name/reference. This is structured amount import, not arbitrary accountant PDF upload or universal provider/CSV compatibility.
- `src/lib/payroll/model.ts:211` validates population, unique employees, dates, exact money, itemized amounts and gross minus deductions equals net. It validates supplied arithmetic; it does not establish correct tax treatment.
- `src/lib/payroll/service.ts` supports import, reviewed approval and linked corrections; `src/lib/payroll/documents.ts` produces statements from imported rows.
- Both `service.ts` PREPARE and `worker.ts` PREPARE currently select native calculation based on `nativeSchemaAvailable`. Capabilities also report native availability based on schema alone. A new explicit server-side calculation mode is necessary; hiding UI alone is insufficient.
- Historical native statements/runs must remain readable. An import-only setting must not mutate approved history or reinterpret an existing native run as imported.
- Imported statements follow the existing `automation.publish` preference; a change to the product's default sharing policy needs a separate decision.

## Work register

| Group | Incoming items | Disposition |
|---|---|---|
| Observability | AR-1; global error digest | Ready to plan: allowlisted structured error metadata, framework hook, explicit logging of unexpected caught failures, hosted log evidence. No request bodies, tokens, raw paths with identities, query strings or SQL text. |
| Invitations and account setup | JR-5, JR-7, JR-23; Manager sign-in status | Delivery capability read and first-password-change fix are actionable. Preserve Owner-only invitation writes. Manager read needs the existing approved scope/privacy controls. Email content can be tested through owned SMTP; external sends remain unauthorized. Owner-ready email must use a durable existing event/outbox rather than sending from a read. |
| Flags and operator docs | AR-8, JR-24, JR-25, JR-26 | Typed registry and default-off examples are actionable. Do not enable payroll or punches merely because a workplace is provisioned. Per-workplace activation requires environment identity, prerequisites and approved policy. Read current environment state through its owning service before claiming a checked hosted flag table. |
| External statements | PY-1, PY-2, PY-4, PY-5, PY-6, PY-8, PY-11; payroll period link, rule confirmation, period-close messages | Scope discussion in progress. Recommend import-only release mode. Native tax rules, native amount export, native publication changes and native YTD-policy changes are held. Correction deltas also apply to imports. Existing statement versions remain immutable; new copy requires Jose/counsel review. |
| Billing | JR-2, JR-3, JR-9, JR-30; status/refusal/checkout contracts; Search capability | Time zone, explicit capabilities and stale route removal are actionable. One billing destination remains Jose's decision. Billing reminder effects require durable deduplication, retries, cancellation and local provider tests. No live charges or unapproved real mail. |
| Daily read contracts | Today `clockerRegistered`; setup progress; correction facts; exchange kind | Actionable additive reads derived from current authorized source data. Reuse existing setup reads where sufficient. Scope and freshness must match current authorization and snapshot lifetime. |
| Personal profile and notifications | Profile email/phone; richer list facts; RA-16 | Actionable bounded read additions. Use authorized current facts, safe destinations and workplace time zone. Do not widen recipient/source access to improve text. |
| Language | RA-2, RA-11 | Persisting language and localized delivery need a schema/migration plan and Jose's Spanish timing decision. Language inferred from Accept-Language is a presentation fallback, not permission to overwrite a saved preference. Review service-worker privacy allowlist with payload changes. |
| Kiosk | Distinct paused-setup code and server button wording; RA-6; MK-4 | Error-code/text changes are actionable. Offline/late-arriving punches and early/forgotten-punch policies require decisions before server rules. No automatic punch synthesis. |
| Staff list import | Disabled vs outage; capacity preview; position names; canonical validation code | Actionable additive contracts, preserving authoritative capacity checks and atomic/idempotent save. Preview is never capacity reservation. |
| CI and manuals | AR-21, AR-22; named projects/config reachability; QA scripts; browser suites; manuals | Actionable, with combined-source verification dependent on the reviewed/committed Claude UI. Keep tests and assertions intact. Manual rebuild waits for a clean committed combined source; never relax source binding. |
| Other policy decisions | JR-6, AR-5 | Staff without email and location-scoped Manager product scope stay with Jose. No new activation channel or expanded permission without that decision. |

## Leadership positions and controls

- Product: retain the handoff scope and explicit policy decisions; recommend external calculation with imported statements for the first release.
- Engineering: preserve existing modules, authorization, immutable documents, transactional/idempotent commands and worker lease behavior. Start with local regression evidence before changes.
- Security/privacy: fail closed for uncertain tenant/environment identity; log only allowlisted metadata; minimize personal-data exposure; keep invitation mutations Owner-only; force operator-issued password replacement.
- Technical assurance: schema availability is not sufficient calculation-policy authorization. This must be addressed at service, worker and capabilities boundaries.
- Program: implementation, verification, hosted acceptance and release acceptance remain separate. The register above is an intake, not a closure report.
- Governance: GO for read-only discovery and planning. Release impact CONDITION; customer release remains held until affected mandatory gates are evidenced. No independent audit findings are self-closed.

## Intake evidence (before implementation)

- Read current AGENTS.md, package scripts, relevant backend implementation/tests, the pasted handoff and Claude's review reports.
- `git ls-remote` confirmed both remote source heads; fetched origin and verified a clean detached development worktree before adding intake documents.
- Ran `npm run check:development-sources` in the older main checkout after fetch: failed because remote development/assembly were ahead and main had advanced. The checkout was preserved.
- Ran the source-inventory checker from the isolated current-development workspace: failed with `Branch advanced: claude-codex-collab-nevora`. This remaining drift must be reconciled before any assembly. Do not update historical inventory entries merely to obtain green output.
- No application tests, production build, browser integration suite, hosted log/delivery check or payment test has been run in this chat. Claude's results are handoff claims, not independent Codex evidence.
- No application code, schema, hosted configuration, customer data, live message, main branch or production deployment changed.

## Next gate

Continue the approved [foundation plan](../superpowers/plans/2026-11-15-inspection-backend-foundation.md) and the [external-calculation plan](../superpowers/plans/2026-11-15-external-payroll-statements.md), then the remaining register items with their decisions and evidence. Claude retains UI ownership. Integrate reviewed backend and UI on development, qualify the exact combined SHA there to production standards, and promote that exact release to main/production only after Jose's explicit approval. No repeated approval is needed for already approved bounded implementation.
