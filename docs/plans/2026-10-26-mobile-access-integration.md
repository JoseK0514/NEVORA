# Frozen mobile Access v1 integration

Spec: Jose's approved frozen mobile-access-onboarding-v1-20261026; Access6212ecbe602c799bb75228045b70942993be57badd842666249df8ca2d2480a3; arrival1a16b0cf7ab779c825026c03316e072ef54832b4d94f2edf50643f5ae688d3dd. User authorizes application integration and a tested PR targeting the repository's development branch. No merge/deploy authorization.

Base: freshly fetched origin/development46e202786863279302026ee03a0e225c359fa55c. Isolated branch codex/mobile-access-onboarding-20261026. Primary checkout and all prior worktrees remain untouched.

## Global constraints

Preserve login server action, API payloads, role/session authorization, source43-character recovery proofs,15-minute invitation lifecycle and safe destinations. Do not implement/truncate short codes, publish policy references, enable sending, use production credentials or change schemas. No mock account/data/outcomes in production. Mobile visuals follow October26 approved freeze; desktop and separately maintained role dashboards stay in their current design. Use current React/Next patterns and real Phosphor/wordmark. New rollout flag defaults off; support intake remains separately gated until operational approval. Existing contact address is not proof of mailbox readiness.

## Tasks

1. Establish baseline, source inventory and regression/rollout tests. Run locked install and full default suite in a credential-free environment. Add meaningful failing tests for flags, mobile forms/locale, preserved proof/password constraints, assistance permissions and confirmed-only activation. Record expected RED then GREEN.
2. Implement the frozen mobile shell/tokens, warm welcome and shared in-memory journey state. Reuse application components and wordmark. Mobile-only media rules; desktop unchanged. Locale refresh preserves in-memory forms/proof without putting new data into URLs/storage.
3. Integrate actual login/recovery/activation presentation. Retain existing controllers and server handlers. Localize activation states, display confirmed real Employee ID, reuse native password-pair controls and honest unavailable/uncertain feedback. Automatic recovery proofs remain source43 characters. Tests must assert real form constraints and no syntactic 'verified invitation' claim.
4. Implement bilingual public Help/invitation/Owner assistance and gated Support draft/copy fallback. Preserve publication gates. No public status/resend/change-email/reset authority or actual messaging. Connect first-Home optional guidance to verified-session context and actual app destinations; no replacement fixture dashboard.
5. Verify typecheck/lint/full unit suite/build and owned PostgreSQL real-browser journeys with fake identities, isolated mail, real auth handlers and permission assertions; mobile320/390/430, enlarged text, focus, unavailable/invalid/success and desktop regressions. Preserve exact-source evidence. Run deterministic UI review. One fresh whole-branch reviewer at end; correct substantive findings with regression evidence.
6. Write source-bound handoff, remaining launch gates, feature flag instructions and validation/limits. Review diff, commit only relevant files, push feature branch, create/attach PR to development and inspect CI status. Do not merge or deploy. Existing branch inventory gate remains explicitly open unless safely reconciled within scope.

## Evidence and commands

External evidence: ../integration-evidence (task-owned, outside repository). Runtime owns only throwaway loopback PostgreSQL and synthetic accounts; mail disabled unless owned local SMTP fixture. npm build/start are next build/start (no migration hooks); actual application SQL/setup commands are not run against existing environments.

Expected required checks: npm test -- --maxWorkers=1; npm run typecheck; npm run lint; npm run build; scoped mobile-access owned browser suite; npm audit --audit-level=high. Inspect each result; report any failure rather than relaxing assertions/gates. Current source inventory is already red: Claude-UI-Fix advanced, three unclassified Claude branches and8 remote branches exceeding6 ceiling. No branch deletion/automatic assembly is in scope.


## Execution record

Runtime candidate `c61376f476b184d3374816c3d87fb0a51603bbc5`: Tasks1–5 implemented and verified locally. Full suite9,636 passed/801 skipped; owned three-engine mobile browser passed; type/lint/build passed. One fresh branch review and bounded regression-based author remediation are recorded in the [handoff](../handoffs/2026-10-26-mobile-access-onboarding-integration.md) and [evidence](../evidence/mobile-access-onboarding-20261026/README.md). Task6 publication targets a draft PR to development because the pre-existing source-assembly inventory gate remains unresolved. No rollout, merge, production/native-device verification or independent integrated certification is implied.
