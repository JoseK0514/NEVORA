# Employee mobile device alerts — independent code review

Reviewer: independent code-quality agent. 2026-10-27.

- Base: `059f4ac2fbd4cc50bb526bb0f1001465de2e2ce2`.
- Candidate: `4f9cc547ab3fd1ae1ca7431820132a991a5dd764`.
- Branch: `codex/employee-mobile-local-resume-20261027`.
- Scope: complete Alerts on this device batch, including canonical device lifecycle/server changes, shared Employee/Lead shell owner, protected page/profile entry, runtime parsing, owned fixture configuration and tests. No application, configuration or repository test changes made by this reviewer.
- Plan: `docs/execution/employee-mobile-device-alerts/plan.md`; execution ledger: `.superpowers/sdd/plan-employee-mobile-device-alerts/progress.md`.
- codeQualityStatus: **BLOCK**
- recommendation: **REQUEST_CHANGES**
- Bounded local continuation: **NO-GO for acceptance**; remediation and verification may continue locally. No hosted/release approval.

## CRITICAL
None identified in this bounded review.

## HIGH
### DEV-CR-1 — late passive status cookie strands a successful enrollment
**ISSUE / BLOCKER.** `src/lib/notifications/subscription-service.ts:194–203`, especially unconditional installation cookie rewrite at202, combined with `src/lib/notifications/device-client.ts:60–64,122–134` and the new shell polling/resume owner.

A passive status request captures the old installation proof and prepares its Set-Cookie. A deliberate enrollment then succeeds and returns the new generation cookie. If the older status response arrives last, the browser replaces the current proof with the old one. Epoch checks discard its JavaScript result but cannot discard browser-applied Set-Cookie. Passive refresh leaves the ready state visible and enable does not exclude refreshTask, so this is a reachable overlap. The service rewrite existed before this batch; the whole-batch canonical lifecycle integration must account for it rather than claim generation safety.

Independently reproduced against the actual candidate createPushHandlers: capture the old status cookie; enroll; assert enrollment cookie matches active generation; apply the delayed status cookie; request status and unsubscribe using the original enrolled generation. Result: status reports enabled=false, unsubscribe returns409 stale_generation, and persisted fake-repository row remains active. No cross-account disclosure is alleged. This breaks truthful enrollment state and normal generation-specific cleanup; local worker suppression does not fix the server enrollment.

Artifacts: `cookie-race.test.ts`, `review-vitest.config.mts`, `cookie-race.log` in the external review directory. The test passes by asserting the defective outcome. Handler-level deterministic response-order reproduction; not a real-browser cookie-order test or SQL proof. Root was informed immediately.

Required: eliminate stale status cookie overwrite at the canonical seam while preserving initial proof creation, renewal and cleanup semantics; add deterministic delayed-response regression and exercise browser enrollment/cleanup after that ordering. Do not solve by allowing stale-generation mutation or weakening identity guards.

## MEDIUM
### DEV-CR-2 — browser passive-refresh assertion does not await the refresh
**RISK / test relevance finding.** `src/test/integration/employee-mobile-device-alerts.integration.ts:64`.

After dispatching blur/focus, the test waits for Retry turn off, which was already visible before those events, and immediately compares own-counter values. It neither awaits the resulting status response nor establishes completed reconciliation. A delayed refresh that wrongly reclaims ownership can pass this assertion before it runs. This is not an implementation-constant test, but it can give false confidence for the exact race it claims to verify. The focused controller regression is useful and does not replace the browser boundary check.

Required before claiming this browser scenario verified: explicitly observe the post-focus status request and completed reconciliation, with a controlled delayed response, then assert ownership remains suppressed and cleanup targets the original generation. No arbitrary sleep.

## LOW
No additional actionable low-severity finding recorded. Dense one-line additions make review harder, but that alone is not treated as a correctness blocker.

## Verified evidence and strengths
Independently ran eight focused files (controller, protocol, push routes, device view, AppShell, original popover, popover focus, owned device environment): **145/145 tests passed**, `focused-unit.log`. Independently ran the external deterministic cookie reproduction: **1/1 passed proving the bad outcome**, `cookie-race.log`. `git diff --check 059f4ac2..4f9cc547` passed. Worktree was clean at review start. Initial external reproduction setup failed due missing alias; after configuring the repository-equivalent alias, actual handler executed. This was a harness correction, not a product fix.

Inspected actual code: page requires Employee/Lead; binding compares current authenticated session-derived authority before installation effects; runtime budget is tied to active employee/session and workspace; mutations retain canonical origin/body and generation constraints. No topic/coworker/other-device mutation surfaces added. Employee/Lead page and desktop popover consume a single shell provider; management keeps original PortalDeviceSetup. Enrollment waits for canonical server status and local ownership acknowledgement. Cleanup retains original generation and suppresses passive ownership reclaim. Native prompts remain gesture initiated. Owned fixture explicitly disables provider and test delivery and validates loopback origin.

## Skill-perspective check
Ran **remove-ai-slops** and **programming** perspective review after reading their SKILL.md criteria and TypeScript reference, plus repository independent QA and CISO instructions. Reviewed production and tests for deletion-only/tautological assertions, implementation constants, brittle prompt tests, needless parsing, abstraction and escape hatches. No deletion-only or natural-language LLM prompt tests introduced. UI labels used as user-visible assertions are not LLM prompt tests. Protocol validation is justified at the untrusted HTTP boundary; additional fresh server checks have concrete session/generation purposes, not gratuitous normalization. The asynchronous false-confidence test issue DEV-CR-2 violates the behavioral-test perspective. Manual type assertions at validated protocol boundaries and existing repository test-fixture conventions were inspected; no separate demonstrable high-impact defect is inferred solely from those styles. Repository-required toolchain retained rather than introducing the skill's preferred tooling.

## Limits and retained gates
I did not independently rerun the entire546-test selection, typecheck, lint, real PostgreSQL/browser matrix, physical OS/native prompt tests, assistive technology, external provider, hosted runtime, release or deployment. Root's reports are not substituted for those checks; its first owned-browser journey was still in progress when review began. No screenshot-based visual certification supplied here. Feature-off, desktop responsive crossing, actual session rebind while native permission is outstanding, and landscape outcomes need their stated browser evidence before acceptance. Existing13 baseline unit failures, process-observation instability, Calendar QA-CAL1 and previous Communications conditions remain open and are not closed by this report.

## Required next gate
Remediate DEV-CR-1, strengthen DEV-CR-2, provide exact new candidate SHA and source-bound focused plus owned-browser evidence, then request independent re-review. No acceptance/merge/deployment claim follows from this report.
