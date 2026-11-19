# NEVORA Feature Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** complete and verify NEVORA's existing workforce workflows, then deliver selected usability improvements and separately scoped new capabilities.

**Architecture:** preserve existing authentication, company access, scheduling, tasks, communications and external-payroll domains. Complete their existing UI/API contracts before adding adjacent modules. This document is a delivery roadmap across independent subsystems; resume existing approved plans for completion work, and prepare a bounded design/implementation plan for each newly selected feature rather than executing this entire roadmap as one change.

**Tech Stack:** inspected Development package: Next.js 16.4.2, React 19.3.0, TypeScript, PostgreSQL/Neon, Vitest, existing owned browser/PostgreSQL runners and WebAuthn passkeys.

**Spec:** Jose's November 17 request for a plan following the competitor feature review; research and proposed opportunities are recorded in `/Users/josek0514/.codex/visualizations/2026/11/17/01a1e94c-85f6-7150-8838-c78bbe9df886/nevora-competitive-feature-review-2026-11-17.md`. That review is advice, not approval of all new features. Jose subsequently specified password safeguards and reuse of the existing bilingual email design, then explicitly selected **15 characters, following current NIST**. Those requirements are incorporated in Task 5 below; the other proposed new modules remain unselected.

## Global Constraints

- Development is the primary working/operating and acceptance release; apply production standards there.
- Codex owns backend/hosting and Claude owns UI unless reassigned.
- Main and production still require Jose's explicit authorization.
- Start release implementation from freshly fetched `origin/development`; reconcile `npm run check:development-sources` before another assembly.
- Preserve active worktrees, uncommitted work, original operation receipts and immutable historical records.
- Use isolated fictional test data; do not reuse production credentials or customer records.
- No real email/SMS, paid model evaluation, new provider activation or expanded data collection is authorized by this plan.
- Existing independent findings, communication activation holds and release controls retain their owners and authority.
- External payroll calculation remains the direction; a file export or approved statement does not confirm provider import or payment.

## Source and status boundary

Plan date: November 17, 2026, America/Puerto_Rico. Fresh fetch confirmed `origin/development` at `e8181384fc98d3c0edd988ae1cfc04819f63d2ee` in `JoseK0514/Fuel-Scheduler-`. The local checkout is clean before this document and remains on older `development` commit `0f8ffee52d85f48cd2fe890dc9aa682e995de4eb`; research used Git objects from the fetched head. Application code has not been changed or tested by this planning task.

Existing local evidence and handoffs are inputs, not fresh hosted verification. In particular, the Phase 5 dependency/index documents retain earlier Rondo-unintegrated descriptions. The newer Rondo integration handoff and actual current source supersede that limited description: knowledge/business/weekly backend work and business citation integration have advanced. Do not rebuild those implementations or represent an old pending CI statement as a current CI failure.

**Password/email follow-up source:** a later November 17 fetch advanced `origin/development` to `22107a24272f2347bbb59a3da1f54319632772a5`. Relevant password enrollment/reset callers still enforce an eight-character minimum. Account emails already include both languages and expiry wording, but the inspected renderer/transport are plain-text-only and the subjects/bodies lack company-specific branding. This observation does not relabel the earlier roadmap inspection as a later runtime test.

Primary owning sources at the inspected commit:

1. `docs/handoffs/2026-11-16-backend-phase5-claude-contract-index.json` — finance, scheduling decision facts, reminders/access/support and original-intent/history contracts.
2. `docs/handoffs/2026-11-16-backend-phase5-remaining-dependencies.json` — recorded U01/U02/U03/U09/U10/U11 and hosted/device dependencies, subject to current-source reconciliation.
3. `docs/handoffs/2026-11-16-rondo-development-integration.md` and `docs/qa/rondo-development-integration-20261116/index.json` — later Rondo source integration and sealed local evidence; not actual-model quality qualification.
4. `docs/guides/web/{owner,employee,manager-lead,rondo,operations}.md` — current source-based workflows and availability limits.
5. `src/lib/business-improvements/labor-budget/model.ts` — monetary output remains unavailable without an approved Finance method.
6. `src/app/login/{page.tsx,actions.ts,kept-id.ts}`, `src/lib/auth/{session.ts,session-issuance.ts}` — current 14-day persistence, passkeys and short-lived failed-login ID retention.

Repository paths below describe the inspected Development tree, not necessarily the older local checkout. Resolve them in the selected fresh implementation worktree.

## Review Focus

1. A request commits but its reply is lost: preserve and recover the original operation; never create a duplicate payroll export, reminder or request. Owned by Tasks 2 and 4.
2. An employee/Manager loses authority while a screen is open: remove private content and refuse stale actions. Owned by Tasks 2–6.
3. A count or source is incomplete: show unknown/partial coverage rather than zero or a falsely complete total. Owned by Tasks 2–3.
4. An account is used on a shared computer: persistence choice, remembered ID removal and server-side revocation must agree. Owned by Task 7.
5. Payroll/leave/cost data has effective dates, concurrent changes or corrections: use the authoritative version and reconcile differences instead of silently recalculating historical facts. Owned by Tasks 2, 9 and 10.

## Phase 1 — Finish the existing product

These are completion/acceptance tasks for the current product, not proposals to build scheduling or payroll again. Within current ownership, Tasks 2–5 can be prepared independently. Integration and qualification use one identified candidate.

### Task 1: Reconcile the completion checklist with current source

**Owner:** existing integration owner, with Codex backend and Claude UI evidence.

**Inputs:** the exact Development commit, the contract index, remaining dependencies, later Rondo handoff and existing owner plans.

**Produces:** one ledger per workflow: implemented, UI connected, locally tested, hosted verified, held, or still missing; exact source/evidence/owner/next action for each.

- [ ] Verify existing completion claims against the current owning implementation; record any superseded handoff entry.
- [ ] Preserve work already finished, including P4-AUTH-01's request-owned return correction and later Rondo source integration.
- [ ] Resume the existing plan for each unresolved bounded item; split only genuinely new scope into a separate design.
- [ ] Identify the selected Development deployment/database and current allowed provider/test window before hosted checks.

**Done when:** no workflow is labeled missing merely because it appears in an old handoff, and no code-only feature is labeled live.

### Task 2: Complete the existing payroll import/export/review experience

**Owner:** Claude UI; Codex API/finance-contract support.

**Source areas:** `src/components/payroll/`, `src/lib/payroll/`, `src/lib/payroll-export/`, `src/lib/period-close/`; FINANCE_V1/U01 and existing Phase 2 contracts.

- [ ] Close confirmed remaining CSV/JSON upload, employee mapping and exact-amount review/correction gaps.
- [ ] Complete explicit recorded-break treatment and whole-employee batch progress/recovery.
- [ ] Preserve immutable approved statements/history and show original versus replacement amounts clearly.
- [ ] Exercise invalid file/mapping, changed source, partial batches, lost reply, duplicate retry and revoked finance permission in the owned runtime.

**Done when:** an authorized Owner can complete export → external calculation → supported import → review → approval → separate statement publication, with recoverable outcomes. Payment remains with the external system.

### Task 3: Complete scheduling restrictions, action routing and truthful insights

**Owner:** Claude UI; Codex scheduling/read-contract support.

**Source areas:** `src/lib/data/scheduling-restrictions.server.ts`, `src/lib/action-center/`, `src/lib/employee-home/`, `src/lib/reports/`; SCHEDULING_DECISION_FACTS_V1/U02/U03/U09.

- [ ] Finish confirmed missing management agreements, effective-date/legacy states and employee disclosure/change requests.
- [ ] Use typed review permission and subject facts; align preview counts, full lists and independent-review eligibility.
- [ ] Show the selected period, missing/partial data and the actual meaning of coverage and lateness metrics.
- [ ] Verify Owner, Company Manager, location Manager, Lead and Employee paths, including no permission, changed revision, overnight work and incomplete reads.

**Done when:** people understand what is a preference, restriction, request or approved change; counts and labels agree with the authoritative records.

### Task 4: Complete tasks, communication and reminder journeys

**Owner:** Claude UI; Codex backend; existing communication/security release owners.

**Source areas:** `src/lib/{staff-tasks,communications,conversations,manager-reminders}/`; existing staff-task/conversation handoffs and REMINDERS_ACCESS_SUPPORT_V1/U10.

- [ ] Reconcile actual task/conversation/announcement UI coverage against the existing commands and reads; implement only remaining consumer gaps.
- [ ] Complete required acknowledgement, checklist completion and unresolved-work navigation.
- [ ] Show reminder eligible/cooldown/held/queued/unknown states and original-operation recovery.
- [ ] Exercise source resolution/revision changes, reassignment, membership removal, authority loss, retries and quiet-hour/daily-budget behavior.
- [ ] Retain D04/other activation holds until the owning policy and acceptance conditions are explicitly closed; provider/device delivery requires its own evidence.

**Done when:** the selected allowed workflow works end to end and clearly distinguishes read, acknowledged, saved, queued and delivered. An unresolved mandatory hold remains an explicit blocker.

### Task 5: Complete account help and support guidance

**Owner:** Claude UI; Codex authentication; support/operations responder.

**Source areas:** existing login/activation/recovery/passkey/profile/deletion consumers and `src/lib/server-error.ts`; U11 and the current request-owned destination contract.

- [ ] Close confirmed missing activation, initial-password replacement, password recovery and passkey explanations.
- [ ] Retain safe return navigation and show session-ended/refused/unavailable outcomes accurately.
- [ ] Complete copyable response-local support references, LAST_OWNER guidance and original deletion-request recovery.
- [ ] Verify invalid/expired/used proof, changed session, last usable Owner and one authorized diagnostic-reference-to-log lookup.
- [ ] Deliver the explicitly selected password and account-email requirements in Tasks 5A and 5B below, with the current authentication/UI owners.

**Done when:** users can recover access or reach the actual responder without sharing credentials; a request is never described as completed erasure.

#### Task 5A: Password policy — Jose's November 17 requirements

**Owners:** Codex server enforcement/security; Claude EN/ES password forms and rejection feedback.

**Standard and decision:** use the final [NIST SP 800-63B-4, section 3.1.1.2](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver), checked November 17. Its single-factor minimum is 15 characters; eight is permitted for passwords used only within multifactor authentication. NEVORA's inspected password path can create a session without a second factor. Jose explicitly selected **15 characters** after this distinction was explained. Offering passkeys as an alternative does not make the password-only path multifactor. This is a bounded password-policy requirement, not certification of the whole application against NIST.

**Source areas:** `src/lib/auth/password.ts`, `src/lib/auth/invitations/claim.server.ts`, `src/lib/auth/recovery.server.ts`, `src/lib/onboarding/owner-activation.server.ts`, other password-enrollment callers identified by a call-site inventory, `src/app/activate/activation-passwords.tsx`, `src/components/recovery-reset.tsx`, shared password-rule UI and `src/lib/auth-copy.ts`.

- [ ] Enforce one server-owned policy on every supported password creation/replacement path: **minimum 15 characters**, allow long passphrases including spaces, and accept at least 64 characters. Count Unicode code points consistently; do not truncate the submitted password. Preserve compatible verification of existing stored hashes; any normalization or legacy-short-password migration needs a deliberate versioned design rather than an accidental change to login semantics.
- [ ] Impose **no mandatory symbol, digit, uppercase or lowercase mixtures and no periodic password changes**. Preserve a required change after evidence of compromise and the existing first-use replacement of an operator-assigned temporary password; neither is a periodic rotation rule.
- [ ] Reject common and known-breached values using a maintained, versioned blocklist, plus context-specific Employee ID/company-name values and predictable derivatives from authoritative server context. Compare whole candidate values as NIST specifies; arbitrary rejection of every phrase containing a dictionary word or short company-name substring is not the intended rule. PB-026's earlier broad substring wording is superseded by the selected current-NIST interpretation.
- [ ] Keep password material out of logs, analytics and external messages. Prefer an approved local blocklist; any external breach-check service requires its own privacy/source review, and plaintext passwords must never be sent to it. An unavailable checker must have an explicit outcome and cannot silently count as a completed breach check.
- [ ] Impose no required symbol/number/uppercase mixture and no scheduled password expiry. Retain existing required initial-password replacement and compromise-triggered reset protections; these are separate from periodic rotation.
- [ ] Return stable, specific rejection reasons for a person legitimately choosing/replacing their password: too short, common, found in the selected breached-password corpus, based on Employee ID, or based on company name. Provide matching English/Spanish messages and corrective guidance. Keep invalid-proof and public sign-in/recovery responses from disclosing whether an account exists; do not return or echo the password.
- [ ] Replace the eight-character helper/validation consistently across client and server. Keep password-manager autofill, paste and accessible show/hide controls usable; the server remains authoritative if client validation is bypassed.
- [ ] Add regressions for 14 versus 15 code points; a long non-blocklisted phrase without digits/symbols; at least 64 characters; spaces and non-BMP Unicode; common/breached fixtures; Employee ID/company-derived fixtures; checker unavailability; all enrollment/reset entry points; protected proof admission; unchanged legacy hash verification; absence of age-based expiry/composition requirements; preservation of temporary-password/compromise replacement; and exact EN/ES reason-to-message mapping.

**Done when:** every new/replaced password uses the selected rule, accepted passphrases remain usable, both languages explain actual refusal reasons, and the migration status of pre-existing shorter passwords is documented. Do not claim whole-population compliance while legacy credentials remain outside the selected standard.

#### Task 5B: Account emails — implement the existing design request

**Owners:** Claude design/copy fidelity; Codex mail renderer/transport and trusted context.

**Design source:** **PB-022** in `docs/product/review-2026-11-11/reviews/review-public.json` (also summarized in the adjacent `review-public.md`), located at the follow-up source above. Reuse that request rather than inventing a different email design. It calls for branded HTML with a plain-text fallback, the official wordmark, a teal primary button, company name in the subject/first line, a personal greeting where available, and consistent account-setup language. It also removes the reset email's confusing “Can’t use this email?” ending. PB-016's old eight-character helper must follow Task 5A's selected 15-character minimum.

**Source areas:** `src/lib/auth/account-email-copy.ts`, `account-email-copy.test.ts`, `src/lib/auth/mail-transport.server.ts` and its existing tests, `src/lib/auth/recovery-delivery.server.ts`, `recovery-delivery.test.ts`, `src/lib/auth/invitations/delivery.server.ts` and related invitation fixtures. Extend existing contracts only as needed for HTML and authoritative company/recipient/issued-expiry context; preserve the owned transport and registration guards.

- [ ] Keep **English and Spanish in every invitation/reset message**, including the fallback, since recipient language is not currently stored for these flows. Match the application's current English and Spanish action names and approved PB-022 composition.
- [ ] Include the correct company name in the subject and opening content; use the recipient's first name when available and a neutral fallback otherwise. Escape company/person names in HTML, reject header injection, and derive the company from the proven workspace rather than caller-supplied identity. Avoid implying that another Owner invited an operator-created Owner.
- [ ] State reset-link lifetime plainly in both languages: the current reset link is single-use and expires in **15 minutes**. Invitation wording remains single-use/**7 days** only while that is the actual invitation policy. Derive any displayed deadline from the actual issued proof, preserving its true expiry when delivery is delayed or retried; never extend it through presentation code or conflate invitation and reset lifetimes.
- [ ] Send HTML and a usable equivalent plain-text body through the existing transport. Preserve exact workspace-bound fragment links, approved origin, registered recipient/staging-recipient restrictions, delivery deadline and failed-versus-unknown behavior. Add no tracking pixel or URL shortener.
- [ ] Verify rendered invitation/reset mail and the existing password-change notice where affected, using owned local SMTP capture and fictional data. Cover both languages, long/absent names, escaped characters, company isolation, subject injection, button/fallback destinations, actual expiry, expired/reused proofs, unknown SMTP outcome and disabled delivery.
- [ ] Have Claude review desktop/mobile email previews against PB-022 and app vocabulary. Real inbox/client delivery evidence remains separate and requires an authorized recipient/test window; local capture alone does not prove inbox delivery.

**Done when:** captured HTML/plain-text messages follow the existing design, identify the correct company, work in both languages and state the actual reset expiry without altering proof security. No real email is sent as a test under this planning request.

### Task 6: Qualify the combined Development experience

**Owner:** existing integrator and Codex hosting; Claude UI; independent QA/UI and physical-device owners.

- [ ] Reconcile the source inventory, select one candidate and run the affected existing unit/API/PostgreSQL/browser checks. Existing applicable evidence can be reused only with exact source-equivalence evidence.
- [ ] Verify all mandatory CI contexts on the selected source; preserve prior failures as history instead of presuming they still fail.
- [ ] Bind the hosted Development deployment, canonical schema/bootstrap, least-privilege connections and required configuration to that candidate; verify authorized synthetic journeys there.
- [ ] Complete applicable real phone/iPad/PWA/passkey, keyboard, screen-reader and loading/error/empty/success checks.
- [ ] Close required worker/retry, support, backup/restore and rollback evidence for enabled scope. Real provider sends/callbacks remain dependent on an explicit valid test authorization/window.
- [ ] Rebuild source-bound guides and obtain the applicable independent dispositions.

**Done when:** every included required workflow has source-bound combined and hosted evidence; remaining mandatory holds are not hidden behind a passing build. Main/production is still a separate Jose decision.

**Verification routing:** inspect scripts/configuration in the selected worktree before invoking them. Existing entry points include `npm run test:staff-tasks:owned`, `test:payroll:owned`, `test:passkeys:owned`, `test:mobile-access:owned`, `test:ui:combined`, `test:phase-e:sql`, `test:phase-e:ui`, `typecheck`, `lint` and `check:onboarding-manifest`. Select the relevant owned projects; do not launch workers, migrations or providers merely to obtain green output. Read the engineering-toolkit README before using its utilities.

## Phase 2 — Select the first new usability increments

These are recommendations for new scope. Each needs a bounded product/security design before implementation; the user's request for this roadmap does not select all of them.

### Task 7: Personal/shared-device controls and session management

**Owners:** Codex authentication; Claude sign-in/profile UI.

**Reuse:** existing login actions, session issuance/cookies, passkeys and lifecycle revocation.

- [ ] Specify personal/shared persistence, exact server/browser lifetime, optional remembered Employee ID and removal behavior. Do not silently extend the current 14-day period or introduce a verification exemption.
- [ ] Design a minimal own-session list with safe device labels and revoke-one/revoke-others, without fingerprinting.
- [ ] Add tests for browser restart, expiry, shared-device removal, target-session revocation, another user's session denial and reset/deactivation races.
- [ ] Integrate accessible sign-in/profile controls and verify on actual supported devices.

**Done when:** the selected persistence choice is effective and understandable, and the actual targeted sessions are revoked server-side.

### Task 8: Guided employee start and departure checklists

**Owners:** Claude journey UI; Codex lifecycle/task integration.

**Reuse:** invitations/activation, company setup, availability, Clocker PIN readiness and staff tasks.

- [ ] Define a minimal first-day template with per-item assignee, due date and progress: activate, provide availability, establish PIN and review first-shift/training instructions.
- [ ] Define lifecycle triggers and idempotent task creation; keep system readiness distinct from manually checked work.
- [ ] Verify retries, rehire/cancellation, location/role changes, privacy and incomplete activation.
- [ ] Add departure tasks for reassignment, equipment and provider follow-up while keeping access revocation immediate under the existing authorized lifecycle.

**Done when:** both person and manager see the right next step; a checklist does not falsely prove activation, training, external payment or returned equipment.

## Phase 3 — Add separately designed business capabilities

### Task 9: Labor cost versus budget

**Owners:** employer/product Finance decision; Codex calculation/source contracts; Claude scheduler presentation.

- [ ] Approve the planning arithmetic, time/break basis, currencies, rounding, effective-dated rate source and authorized audience.
- [ ] Reuse existing rate/budget custody; add deterministic calculations only after that method is defined.
- [ ] Show location/day/week projected cost and variance while editing a draft; keep actual recorded and payable time distinct.
- [ ] Verify changed rates, missing inputs, overnight work, concurrency and exact arithmetic against independent expected results.

**Done when:** authorized people can understand budget impact from traceable inputs; missing configuration yields no invented monetary result. Sales/POS forecasting is a later subproject.

### Task 10: PTO balance visibility, then accrual automation if needed

**Owners:** employer/payroll policy owner; Codex provider/ledger; Claude requests UI.

- [ ] Choose the authoritative balance source. Start with a read-only synchronized/imported provider balance when the employer's payroll provider owns it.
- [ ] Specify current balance, future approved usage, pending reservations, as-of time and change history.
- [ ] If NEVORA will own accruals, create a separate approved ledger/policy design for effective dates, carryover, adjustments and reconciliation.
- [ ] Verify duplicate import, stale provider data, concurrent requests, withdrawal and retrospective correction.

**Done when:** every displayed balance/change can be reconciled to its actual source and request state.

### Task 11: Employee documents and policy acknowledgements

**Owners:** product/privacy document-policy owner; Codex storage/evidence; Claude employee/manager UI.

- [ ] Define minimal document categories, viewers, upload validation and retention; start with operational documents.
- [ ] Implement exact-version acknowledgement and manager pending-status visibility using appropriate existing patterns.
- [ ] Verify replacement/withdrawal, deactivated employees, wrong tenant/role, malicious uploads and concurrent sign-off.
- [ ] Treat electronic signatures as a separately specified extension with its own evidence requirements.

**Done when:** the authorized person can read a document and acknowledge a specific immutable version; acknowledgement is not presented as a different type of signature.

## Phase 4 — Optional depth after the above

| Candidate | Existing foundation | Required next design |
| --- | --- | --- |
| Certification/expiry tracking | Position/location eligibility | Reviewed credentials, renewals and employer-defined scheduling consequences. |
| Manager handover | Staff tasks, history and communications | Location/date-scoped handover with unresolved work and explicit audience. |
| Direct payroll connection | Export profiles, provider mappings, external amounts/statements | Actual provider contract, permission, idempotency and outcome reconciliation. |
| Feedback/recognition | Existing employee surfaces and communication | Optional cadence, response visibility and defensible small-team privacy. |
| Expenses | Existing finance authority and external payroll direction | Receipt storage, approval, external processing and actual reimbursement evidence. |
| Reviews/hiring | Employee records and tasks | Confirm recurring customer demand; separately specify personnel visibility/candidate retention. |

These are not prerequisites for completing NEVORA's existing workforce product.

## Rondo coordination

Keep Rondo with its existing owner and roadmap. Its newer source integration is preserved. Reconcile remaining company-knowledge/business-management screens and weekly review consumers against current code; qualify actual provider/model behavior through that owner's authorized budget and case envelope. The 50-question target remains separate from source/browser integration evidence. This roadmap does not start another assistant, rerun paid evaluations or silently add external writers.

## Sequence and decisions

Recommended sequence: **close confirmed Phase 1 gaps → qualify that Development release → select Tasks 7–8 as the first usability package → separately approve/design Tasks 9–11 → consider Phase 4 depth.** Product design for later increments can be prepared while current completion work proceeds, without expanding an occupied implementation owner's scope.

The next action is to give the existing integrator and Claude a reconciled completion ledger from Task 1, then resume their approved outstanding contracts. New-scope decisions are device persistence policy, first-day checklist content, Finance calculation method, PTO ownership/policy and document access/retention. None requires guessing or a risk exception to finish this plan.

No calendar delivery promise is made before remaining work and owner capacity are reconciled. Each selected increment needs its own scope, dependency, owner, acceptance evidence and release record.

## Planning verification and state

- Fresh remote Development head checked; checkout preserved.
- Current package scripts, auth/budget source, contract index, dependency records and later Rondo integration read.
- Password/email follow-up: current official NIST final checked; Jose's explicit 15-character choice recorded; PB-022 design request and current password/copy/transport call sites inspected at the later fetched source. Tasks 5A/5B are requirements and planned acceptance, not implemented functionality.
- Existing source versus hosted availability kept separate; no current CI/deployment success or failure inferred from historical handoffs.
- Self-review: every previously discussed feature is mapped to completion, selected new scope or optional depth; five review-focus conditions are assigned to their tasks.
- This document is local and uncommitted. No application code, database, configuration, tickets, provider state or deployment changed; application tests were not run for this planning-only artifact.
