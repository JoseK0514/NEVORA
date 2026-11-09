# Backend repair handoff — November 9, 2026

Implementation commit: `167b187e934025dc458d37f3b9bfc9356c57af29`, based on current development `4ef5f606932cff46932db78d1076d423bb98778e`. The original inspection candidate remains `90e03014`; do not relabel its deployed behavior as this source. Work is isolated in a detached worktree under the repository's three-branch policy.

## Delivered scope

- **B01:** exact immutable Vercel Preview origin admission, preserving production/isolated-workspace controls; private failure codes distinguish admission, authentication, authority, view and unavailable-source outcomes without changing existing response bodies.
- **B02:** Jose's explicitly approved approve-and-track-repair policy, implemented as a protected read model over saved leave and immutable published assignments. Stable repair identity, recorded reviewer ownership, pending conflict disclosure, own-record privacy, location scope, current authority/lifetime checks and Action Center inclusion. Draft changes cannot clear a conflict; a reviewed publication can. No second mutable task ledger, dismissal shortcut, assignment deletion or new migration.
- **B04:** required staff/position/lead minute aggregates on canonical schedule health; equivalent segmentation is invariant, unknown denominators remain null and surplus staffing cannot hide a different interval's shortfall.
- **B03/B05/B06 support:** a source-specific capability hold manifest, backend failure classifications and authorized optional person/request selectors for Claude. The actual recovery screens, selected-person navigation and coverage/leave presentation are Claude's work.

New APIs and complete integration instructions are in [CLAUDE-CONTRACT.md](CLAUDE-CONTRACT.md). Required optional-feature/schema qualification is in [capability-manifest.json](capability-manifest.json). The approved scope and checklist are in [PLAN.md](PLAN.md).

## Verification custody

`verification.json` is the authoritative final receipt. Terminal carriage returns/trailing whitespace in committed logs are normalized for Git; `evidence-normalization.json` records raw/normalized hashes and the retained full raw archive. Assertion results are unchanged. Retain the different runs separately:

- `unit.log`: first full default suite, 11,560 passed / 857 skipped / zero failed, before the additional aggregate-bound regression.
- `aggregate-bound-red.log`: observed failure proving the new aggregate bound was missing; the complete long transcript is preserved at the absolute runtime path recorded in the log. The regression passed after the bound was added.
- `unit-final.log`: full repeat with 11,560 passed / 857 skipped / **one failed** existing `src/test/phase-e-process.test.ts` changed-member observation, while a production build ran concurrently. Diagnostic: fail-closed `OWNERSHIP_UNAVAILABLE` during a fixture process's normal exit. No assertion, ownership guard, timeout or production code in that test was changed.
- `focused-final.log`: that entire process suite plus focused backend tests, unchanged repeat with 61 passed / zero failed. `unit-accepted.log` then passed the complete integrated-source default suite: 11,561 passed / 857 reported skipped / zero failed. An isolated retry is not presented as a whole-suite pass.
- `staffing-sql.log`, `leave-authority-sql.log`, `action-center-sql.log`: real invocation-owned loopback PostgreSQL with teardown, not mocks or shared/production data. They cover canonical approval/races, preserved assignment, draft-versus-published repair, current/scoped/own access and aggregate behavior.
- `http-admission.json`: ten real requests against the built app on two invocation-owned loopback servers, using synthetic Preview/production origin settings and no application credentials. The local TLS-termination simulation supplies HTTPS proxy metadata; a first attempt omitted it and correctly received origin rejection. No security check was relaxed to make the probe pass.
- `build*.log`, `typecheck.log`, `lint.log`: build and static checks. The final receipt binds accepted runs to the integrated source; earlier runs remain historical.

No UI, styles, public assets, native applications, dependencies, application configuration, shared database, deployment alias or provider settings were changed. Only owned local test databases were mutated; no real notifications were sent.

## Director positions, controls and release impact

| Function | Position and retained control |
|---|---|
| Product | Implement Jose's approved leave policy; do not expand paid-leave accounting, working-Manager self-service or native roles. |
| Engineering | Reuse canonical approval/publication/health sources and authority guards. The queue derives from durable facts rather than duplicating their mutation lifecycle. |
| Security | Allow only the exact platform-issued Preview host, retain all origin/intent/actor/session/scope/revision guards, omit private leave reasons and bind responses to current authority and observation lifetime. |
| Delivery | Claude owns UI; backend checks are separate from combined rendered/hosted acceptance. Preserve the concurrent invitation-claim fix included through current development. |
| Governance | GO WITH CONDITIONS for backend handoff; release impact CONDITION. No material policy exception or production authorization was inferred, and independent QA/UI findings are not self-closed. |

## Remaining gates and rollback

Claude integrates the recorded source and contract into the current UI, preserving Direction B. The shared old Preview still lacks optional schemas and does not contain these repairs. A new exact combined Preview must pass authenticated Home/Inbox/Timecards/Insights, correction approval, leave staffing repair, permission/revocation and populated scheduling → time → payroll-document scenarios, plus the matching required CI and UI/accessibility checks.

Optional AI/native-push capabilities stay held. Actual worker hosting/scheduler/responders/alarms, provider/device qualification, deletion fulfillment operations and independent acceptance remain separate gates. No production merge, deployment, migration or delivery activation is authorized by this packet.

Rollback is an ordinary reviewed source revert coordinated with the consuming UI. No new schema/data migration needs reversal. Preserve every approval, punch and publication history; never delete a request or rewrite immutable history to hide a staffing conflict. Existing approved leave remains approved even if a reader is rolled back.
