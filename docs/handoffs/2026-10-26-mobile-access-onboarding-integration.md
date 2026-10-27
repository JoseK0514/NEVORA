# Frozen mobile Access v1 — application integration

Owner: Jose / NEVORA engineering. Target: `development`. Branch: `codex/mobile-access-onboarding-20261026`. No merge, environment flag change, production deployment or external delivery is authorized by this handoff.

## What is integrated

The approved mobile design now uses real `/login`, `/forgot-access`, `/reset-access` and `/activate` forms/controllers. New `/welcome` and `/access-help` routes provide English/Spanish welcome, Employee ID/email guidance, invitation assistance, sole-Owner assistance and separately gated Support drafts. Optional guidance appears below the real Employee Home heading; Schedule, My time and eligible Time off destinations use existing application routes and permissions.

The auth server action, API implementations, session/role guards, schemas, invitation lifecycle and email transport remain unchanged. This PR does not implement 10-character recovery codes: the existing full43-character proof stays authoritative and is scrubbed from a link before use. Passwords retain the source8–1024 bounds and are never trimmed. Locale and responsive presentation changes preserve values in memory; only one live form/proof controller operates. Desktop recovery/activation stays Quiet, including when the mobile flag is enabled.

The optional activation introduction requires a confirmed activation response and an actual matching authenticated Employee ID. Its state is ephemeral presentation, cleared on leaving the protected app; it grants no access and is not a durable first-use record. Manager/Owner dashboards do not receive this Employee guide. Actual Home data readers and release checks remain authoritative.

## Preview and rollback

Both server-only flags default off. In an explicitly selected nonproduction environment:

- `NEVORA_MOBILE_ACCESS_ENABLED=true` opts into mobile presentation and new public Help/welcome routes. It does not change authentication or enable delivery.
- `NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED=true` additionally publishes Support and sole-Owner contact drafts. Keep this off until the mailbox, monitoring, ownership, verification procedure and contact policies are approved. The presence of `support@thevelani.com` in source does not prove readiness.

Support opens a reviewed draft in the person's mail application; it does not send a message, open a case, prove identity or authorize an unlock. Clipboard denial leaves selectable text. No analytics, replay, browser identity storage, automatic resend, public account lookup or short-code service is added.

Rollback: unset/setfalse the mobile rollout flag and redeploy the approved environment normally. Legacy Access resumes and new welcome/Help routes return404. Unset the Support flag to hold intake independently. No schema/data rollback is needed. No environment has been enabled by this task.

## Frozen reference and remaining launch requirements

Frozen October26 archive remains in the design workspace, not copied wholesale into the app. SHA256: Access `6212ecbe602c799bb75228045b70942993be57badd842666249df8ca2d2480a3`; first-Home reference `1a16b0cf7ab779c825026c03316e072ef54832b4d94f2edf50643f5ae688d3dd`; policy prototype `20f5a580832192f3786737551d69c0e585e08556c9a24be4fbd30aa2aeb63f8a`. Production artwork provenance is in `public/assets/manifest.json`; scoped design decision is in `.21st/design.json`. Original prototype checks are not application integration evidence.

Before broad rollout: selected-environment acceptance; independent integrated UI/QA sign-off if required by release governance; real iOS/Android keyboard, autofill, accessibility and native mail/clipboard checks; approved support mailbox and identity-verification/runbook/escalation ownership; legal publication approval; approved real mail sender/deliverability and bilingual email content. Existing plain-text invitation/recovery emails and their transport are preserved here. Short manual codes need a separate coordinated backend/security change. The durable first-use model and any broader Home redesign are outside this PR.

## Review and verification

Candidate `c61376f476b184d3374816c3d87fb0a51603bbc5`; later handoff/evidence commits change no executable source. Default-suite inputs stayed identical during the run (only separately selected browser integration tests changed).

- Full default suite:580 files passed,27 skipped;9,636 tests passed,801 skipped,55 todo;470.83s. Existing skipped SQL/environment suites remain skipped; the dedicated mobile browser test uses an owned real database.
- Source-bound owned browser: PASS82.64s; Chromium/WebKit/Firefox,320/390/430px, EN/ES, normal/200% text,1440px desktop, one form and proof/password preservation, actual request/review/correction/reset, mismatch/invalid focus, revoked sessions and consumed proofs, logout/account switching and Employee/Manager invitation403s. Zero retained page errors. No real mail sent.
- Typecheck and lint passed; source-bound production build exit0 with clean/unchanged-source receipt. Inspector archive custody and configuration/release regressions passed (historical custody is not findings acceptance).
- 21st deterministic review:22 files,0 errors/0 warnings,24 informational color suggestions. Approved scoped palette recorded in .21st/design.json; no new dependencies.
- Audit:0 high/critical,1 pre-existing moderate Nodemailer advisory. No forced upgrade or risk waiver.

[Evidence, screenshots and reproducible commands](../evidence/mobile-access-onboarding-20261026/README.md) and [review remediation](../evidence/mobile-access-onboarding-20261026/review-remediation.md).

Reproduce from a clean committed checkout with Node24.19/npm11.17: `npm ci`; `npm test -- --maxWorkers=1`; `npm run typecheck`; `npm run lint`; `npm audit --audit-level=high`. For owned browser execution set explicit `NEVORA_TEST_PG_BIN` to PostgreSQL16 binaries, `NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE` to an installed Playwright package with Chromium/WebKit/Firefox, and `NEVORA_MOBILE_ACCESS_EVIDENCE` to a task-owned directory outside the repository; run `npm run test:mobile-access:owned`. Do not supply existing database/provider credentials. The source-custody guard refuses dirty/untracked application input. For a guarded build set `PHASE_E_EXPECTED_SHA` to the current40-character commit and `NEVORA_BUILD_RECEIPT` to an external output file; run `node scripts/release-build.mjs` in a scrubbed environment.

## Governance gate

Follow-up: Jose authorized source/CI reconciliation for PR35. The live inventory now passes at60 sources/6 heads; three already-merged tips are preserved in exact recovery tags. See the [merge-readiness handoff](2026-10-26-pr35-merge-readiness.md). This supersedes the inventory blocker below; matching hosted CI remains required.

At the fetched base `46e202786863279302026ee03a0e225c359fa55c`, `npm run check:development-sources` was already red: Claude-UI-Fix advanced; claude/home-clock-row, claude/quiet-check-skeleton and claude/quiet-everywhere unclassified;8 remote branches exceed the recorded ceiling6. This feature does not merge/delete other work, raise the ceiling or alter that inventory. Repository assembly owner must reconcile it before a merge-ready claim. Feature-branch publication may add another remote branch; it does not waive the gate.


## Delivery decisions

- Product: the approved October26 freeze supersedes older mobile Access styling only in the opt-in scope; desktop and role dashboards retain their design. The actual app is the source of account/company facts.
- Engineering/security: use the development line and isolated worktree; preserve auth/permissions/proof contracts and single controllers. Failed/incomplete browser runs are not acceptance evidence.
- Preserve43-character proofs and normal sign-in; shorter codes need a separate coordinated change. Confirmed matching-ID intro is generic, optional memory-only presentation.
- One whole-branch review is retained with author regression-based remediation. Independent UI/QA acceptance of the integrated app remains a separate gate where required.
- Use the existing recoverable activation-unavailable retry contract; terminal failure phases do not display confirmed IDs. Do not invent a new auth state to satisfy a presentation test.
- The existing owned runtime requires committed inputs; checkpoint commits allow exact-source verification. Native managed worktree creation could not apply to this projectless task, so Git created a task-owned isolated worktree without touching active work.
- Program/release: the user already authorized a tested PR to development. Draft PR preserves the unresolved assembly gate; no merge/deploy/rollout or unrelated branch cleanup is implied.
