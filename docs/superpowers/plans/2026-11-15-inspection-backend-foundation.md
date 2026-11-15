# Inspection backend foundation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the independent observability, invitation capability, operator-password, feature-registry and release-check fixes from Claude's Nov 14 inspection handoff without activating held features.

**Architecture:** Keep existing service, data, authorization and worker boundaries. Add client-safe capability fields and server-side configuration parsing; use one privacy-preserving error logger with the framework hook and explicit calls at unexpected caught failures. Separate payroll product scope and larger billing/read-contract work into their own subsequent plans, tracked in the intake register.

**Tech Stack:** Next.js 16.4.2, TypeScript 5.9, React 19.3, PostgreSQL, Vitest 5.0.5, existing Node test and owned-Postgres/browser harnesses. No new paid service or dependency.

**Spec:** [Incoming handoff](../../handoffs/2026-11-15-claude-inspection-backend-source.txt), [verified intake and latest payroll discussion](../../handoffs/2026-11-15-inspection-backend-intake.md). Claude's uncommitted UI reports live at `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB/docs/product/review-2026-11-14/fixes/`.

## Global constraints

- Development is the operating/acceptance release. Verify combined UI/backend there to production standards; main/production promotion needs Jose's approval.
- Only development, main and claude-codex-collab-nevora are permitted named branches; use the existing detached worktree for isolation.
- Preserve Claude's uncommitted work and UI ownership. Do not commit, overwrite, rebase, stash or reset that checkout.
- Never print/copy production credentials, send real messages, create real orders, activate paid services or make live charges for verification.
- Preserve authorization, tenant isolation, immutable statement versions, idempotency, uncertain-outcome receipts and source-bound manuals.
- Jose approved external calculation with imported statements on Nov 15; implement that scope in this chat. No new native calculation, ruleset, YTD policy or automatic activation is authorized by this plan.
- Tests use fictional data, an owned loopback Postgres cluster and owned SMTP. Inspect runner scripts before execution.

## Review focus

1. Error properties can contain secrets and identities: log only bounded, allowlisted metadata; test hostile strings and nested causes.
2. Delivery flag can be true while transport is invalid: status must report unavailable and omit ISSUE, while allowing authorized revocation.
3. An operator password must not reach operational pages or APIs before replacement: test real first login and all existing must-change guards.
4. Registry migration can change absent/invalid environment semantics: retain default-off booleans and test current admission-mode defaults before explicitly changing them.
5. CI refactor can silently skip a suite: record every existing config's execution path or explicit disposition before any consolidation, and fail for missing ownership.

---

### Task 1: Privacy-preserving server error reporting (AR-1)

**Files:** Create `src/lib/server-error.ts`, `src/lib/server-error.test.ts`, `src/instrumentation.ts`, `src/instrumentation.test.ts`; modify `src/app/global-error.tsx` and its applicable error-screen test; document hosting evidence in `docs/handoffs/2026-11-15-inspection-backend-validation.md`.

**Interfaces:** `reportServerError(error: unknown, context: {route: string; requestId?: string}): void` writes one structured JSON event through the server's standard error stream. Metadata fields: event, route template, generated/canonical bounded request reference, error class, digest and SQLSTATE where valid. Never emit message, stack, arbitrary object fields, bodies, headers, SQL text, query parameters or concrete identity-bearing paths. `onRequestError` uses Next's `Instrumentation.onRequestError` type. Digest is the framework-provided value, shared with the error screen.

- [ ] Write behavior tests: error with message/stack/cookie/password/token/SQL text produces only the allowed fields; nested database cause exposes only a valid SQLSTATE; hostile request reference/digest is dropped; one event is emitted and serialization cannot throw into the failure path.
- [ ] Run `npm test -- src/lib/server-error.test.ts src/instrumentation.test.ts --maxWorkers=1`; observe failure for absent implementation, then implement the allowlist and hook. Check the installed Next type; official reference is `docs/01-app/03-api-reference/03-file-conventions/instrumentation.mdx` in the Next.js source.
- [ ] Trace each API catch before adding explicit calls: expected validation/auth refusals are not unexpected server failures. Reuse route templates, and add call-site regression tests for the first unexpected caught failures. Do not claim the hook observes swallowed exceptions.
- [ ] Pass `error.digest` through global-error to the existing screen reference after comparing Claude's component contract. Test reference display without exposing raw error text.
- [ ] Rerun the focused suite, `npm run typecheck` and relevant error/auth/commerce tests. Review the diff and commit the bounded change.
- [ ] Identify the actual development host/log stream through the owning service. Exercise a controlled synthetic development error only after proving environment custody; retrieve the matching digest event and verify sensitive inputs are absent. Record local-only status if host access/custody is unavailable. Do not start a logging subscription or enable replay.

### Task 2: Truthful invitation delivery capability (JR-5)

**Files:** Modify `src/lib/auth/invitations/model.ts`, `service.server.ts`, `delivery.server.ts` only as necessary; extend `delivery.test.ts`; create `status.test.ts`; extend `src/test/integration/company-access-invitations.integration.ts` and the adjacent invitation route/race suites where required. Update DTO fixtures/consumers after a targeted reference search.

**Interfaces:** Add required `deliveryAvailable: boolean` to the ready `InvitationStatusResult`. Derive it from the same validated `invitationDelivery` factory used by writes; constructing capability does not send or connect. `allowedCommands` includes ISSUE only when eligibility is INVITABLE and delivery is available. REVOKE remains available under its current lifecycle rule. Existing server write refusal remains authoritative. Claude consumes the new field to disable/explain the action.

- [ ] Reproduce status advertising ISSUE while delivery is off with a ready fictional target and real status projection. Add tests for absent/false flag, true flag with invalid transport, valid owned SMTP, no-email/inactive/already-activated targets and revocation while delivery is off.
- [ ] Run focused tests and observe the expected capability failure before extending the DTO and status projection. Construct no live SMTP connection during a read.
- [ ] Run `npm test -- src/lib/auth/invitations --maxWorkers=1`, then `node scripts/payroll-postgres.mjs vitest.company-access-integration.config.mts` using the pinned owned local Postgres runtime. Cover replay, uncertain delivery and concurrent status changes. Expected: all selected suites pass; no remote database or SMTP connection.
- [ ] Document field and semantics for Claude. Keep invitation issue/revoke Owner-only; do not expand Manager access in this task. Review and commit.
- [ ] Inspect development delivery prerequisites through the owning host/store. Configure only a proven isolated authorized development environment with existing approved credentials; verify through an owned SMTP sink. External message verification needs explicit sending authorization. Report configured and tested separately.

### Task 3: Operator-issued Owner password requires replacement (JR-23)

**Files:** Modify `src/lib/company-bootstrap/server.ts`; add `src/lib/company-bootstrap/owner-profile.test.ts`; extend `scripts/company-setup.test.ts` and `src/test/integration/fresh-company-setup.integration.ts`; use existing login and must-change guards/tests.

**Interfaces:** `insertOwnerProfile` retains its signature. When `options.passwordHash` is supplied, create credentials with `must_change_password=true`. No password hash or credential row is created for inactive activation-link bootstrap paths that omit a hash.

- [ ] Add failing SQL/owned-database assertions for an operator password requiring replacement and an activation-path Owner having no credential until claim. Assert no password/hash appears in output.
- [ ] Run the new test red, make the smallest credential INSERT change, then run the bootstrap tests green.
- [ ] Run `node scripts/payroll-postgres.mjs vitest.company-setup-integration.config.mts`, then the existing owned login journey: replacement is required; operational entry is denied until replacement; replacement revokes appropriate sessions and permits a fresh login. Preserve initial activation behavior and existing Owner enrollment scope. Expected: complete selected suites pass against the owned cluster only.
- [ ] Do not rewrite customer credentials or migrate existing accounts silently. Document existing-account remediation as a separate operator action requiring exact environment/target custody. Review and commit.

### Task 4: Typed flag registry and operator documentation (AR-8, JR-24/25)

**Files:** Create `src/lib/feature-flags.ts`, `src/lib/feature-flags.test.ts`; modify existing boolean reader call sites in payroll, commerce, onboarding, mobile access and Owner advisor; update `.env.example`, `README.md`; add `docs/handoffs/2026-11-15-feature-environments.md` and a corresponding check script/test.

**Interfaces:** `readFeatureFlags(env: Readonly<Record<string,string|undefined>>): FeatureFlags` exposes named typed booleans. Only the exact string `true` enables an opt-in feature. Keep origins and admission/workspace modes as typed configuration fields with existing validators; do not call an origin a boolean. No browser module may import secrets or the full process environment snapshot.

- [ ] Inventory all production env readers, existing guards and hosted role capability allowlists. Enumerate concrete feature switches for payroll, commerce gate/API, invitation/onboarding mail and provider/provisioner, punch API, mobile access and advisor. Record dependent origin/key requirements without copying values.
- [ ] Add tests for missing, false, true, malformed values and cross-feature independence. Pin current admission-mode behavior separately; the example should explicitly show closed admission without silently altering legacy defaults in this mechanical registry change.
- [ ] Run tests red, implement the registry and route existing boolean entrypoints through it without changing enabled-feature policy. Extend hosted role capability tests when any new variable is genuinely required.
- [ ] Add all omitted variables named in the handoff to `.env.example`: booleans false, origins blank and admission closed. Document what exists and what is off by default in README. Retire stale current guidance for NEVORA_CLOCKER_UI_V2 while retaining historical evidence unchanged.
- [ ] Produce an environment matrix with observed source/date, actual host/deployment identity, safe nonsecret flag values and verification state. Mark unobserved hosted rows unknown; never fill them with assumed defaults. Keep desired values separate from observed values.
- [ ] Test the registry and affected entrypoint/host capability suites; run typecheck and lint on changed code. Review and commit.

### Task 5: Restore CI coverage without dropping suites (AR-21/22)

**Files:** Modify `.github/workflows/ci.yml`; extend `scripts/release-ci-contract.check.mjs`; create `scripts/vitest-config-inventory.mjs`, `scripts/vitest-config-inventory.check.mjs` and a versioned config-disposition manifest; introduce shared Vitest configuration/named projects only after inventory comparison. Inspect `scripts/release-build.mjs`, `scripts/verify-dev-production-absence.mjs` and existing Vitest configs before changing commands.

**Interfaces:** Every root Vitest config maps to a runnable package script, workflow or owning runner, or an explicit reviewed archival disposition. The inventory check fails for a newly orphaned/unknown config and never auto-approves it. Shared config must preserve suite-specific aliases, setup, timeout, isolation and browser/DB ownership.

- [ ] Add failing workflow tests for missing collaboration-branch push coverage and missing production-marker scan after a successful source-bound build. Add inventory fixtures with reachable, unknown and orphaned configs; use real command-graph parsing rather than merely searching for filenames in comments.
- [ ] Add `claude-codex-collab-nevora` to CI push triggers, retaining exact source-SHA custody and existing triggers. Add `npm run test:dev:production` after the release build with required isolated build-output inputs; do not run a meaningless source-only surrogate.
- [ ] Run Node workflow/inventory tests red then green. Inventory all current configs before consolidation; retain existing runnable commands while named projects are introduced. Compare collected test-file sets and per-suite environment/setup contracts before/after.
- [ ] Use `npm run test:release-engineering`, focused Vitest config tests and test collection comparison. Run the actual configured suites required by affected changes. Measure runtime rather than inventing a performance claim.
- [ ] Run full required CI on the exact committed candidate once integration authority/source are ready. Local YAML/contract success does not mean CI passed. Review and commit.

### Task 6: Review auth-adjacent UI changes and complete combined evidence

**Files:** Read Claude's diffs in `src/app/login/actions.ts`, `kept-id.ts`, `src/lib/auth/session.ts`, `permissions.ts`, `src/lib/auth-lang.server.ts` and the four schedule-settings guards. Changes to those UI-owned files require coordination within the agreed reviewed integration; no source overwrite. Record review in `docs/handoffs/2026-11-15-inspection-backend-validation.md`.

- [ ] Review kept-ID cookie normalization, 300-second lifetime, HttpOnly/SameSite/production Secure settings, consistent failure paths, clearing and browser visibility; test untrusted/malformed IDs and cross-user reuse. Do not log the ID.
- [ ] Review same-origin referer handling, safeReturnTo, session-ended query, wrong-role destination and guards. Test forged/cross-origin referer, loops and access denial through direct API entry. Classify findings without asserting authorization safety from renamed redirects.
- [ ] Run affected existing unit suites, then the owned PostgreSQL/browser suites listed in the source handoff against a reviewable snapshot of the actual combined code. Include mobile, keyboard/focus, denied/expired/loading/error/success states. Update QA scripts for Employee ID before PIN and exact new labels; preserve network, authorization and outcome assertions.
- [ ] After Claude UI is reviewed and committed and backend integrated, update `docs/guides/web` with current labels, external-payroll scope and Employee ID/PIN steps. Rebuild with `node scripts/manuals/build-manuals.mjs --date YYYY-MM-DD` using the actual Puerto Rico build date and pinned browser runtime from a clean committed application source. Run `src/test/manual-publication.test.ts`. Never bypass its hash failure.
- [ ] Reconcile development source inventory based on verified lineage and dispositions; run `npm run check:development-sources`. Qualify full combined UI/backend on development with exact SHA, hosted custody, actual CI results and remaining blockers.
- [ ] Finish one independent whole-change code review using the executing-plans review process; record evidence and unresolved findings. This is implementation review, not independent release certification.

## Subsequent subsystem plans retained in scope

The intake work register is the exhaustive handoff map; the foundation above is not a claim that all items are complete. Create separate executable plans after discovery for:

1. External-calculation statements: explicit release mode across capabilities/service/worker/native-settings commands; import reconciliation; reviewed publication; immutable source/version; imported correction delta; calendar boundaries including 2027; truthful new document wording with Jose/counsel approval. PY-5/6 and native YTD/publish enhancements remain held under the proposed import-only scope. Do not delete the native engine or historical rows.
2. Daily/profile/notification read contracts: additive, scoped data and workplace zone; richer factual list titles; optional UI consumers owned by Claude; privacy/freshness regressions.
3. Billing: first deliver zone, nav capability and stale route removal; then reminders and chosen billing-origin integration once Jose picks the page. Preserve checkout idempotency, refusal handling and webhook authority; verify sandbox with proven custody and no live charge.
4. Roster preview and kiosk response contracts: distinct disabled/outage and paused-setup codes, named positions and capacity observations; atomic final checks and canonical validation reasons; updated owned browser flows.
5. Language persistence/localization: only after Spanish timing is chosen, with reversible schema migration and safe per-recipient push/mail payload policy. Offline punch rules, Manager product scope and email-less activation stay decision-gated.

## Completion contract

For each implemented task: reproduce the current defect, watch the regression fail, make the minimum fix, rerun focused and required checks, record exact source/environment and commit. State every remaining failure by name. Backend foundation, the full handoff, combined-development acceptance and production readiness are distinct milestones; none is closed by this planning document.
