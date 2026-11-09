# Android runtime baseline implementation plan

Spec: `docs/native/android-runtime-compatibility-proposal.md` (approved by Jose Nov4), extending the approved native Employee/Owner design. Owner: root, inline. Resume phases1–2; no production, signing, remote integration, different renderer or accessibility waiver.

## Global Constraints

Keep original native matrix assertions, 100ms polling and10recreation stress. Android minSdk29 and WebView149+ are explicitly approved. Preserve native window-focus retirement, browser cookies, protected foreground navigation, server auth, closed capability gates and default-off delivery. All SDK targets and fictional server data are invocation-owned. Use allowlisted environment. Do not edit sources during SDK source hashing. Existing prior branch/worktree work remains untouched.

## Review Focus

Check fail-closed parsing/unknown providers; gate every entry path before SessionProbe/WebView/private content; ensure the native browser fallback has fixed protected origin, no cookie/header/token transfer and a real user action; preserve outage/retry/lifecycle semantics; verify minSdk29 and no production configuration. Treat SDK149 data as local SDK qualification, not retail/provider/physical/store certification. The old failures and incomplete135fix remain retained. Only one fresh review of this new approved extension, then at most one correction pass; no re-review of the prior Phase2 plan.

### Task 1: Implement the approved native runtime gate

Files: Android build.gradle; new pure WebViewRuntimePolicy and JVM tests; PortalActivity; one targeted old-provider test in ShellInstrumentedTest.
Interfaces: supported(versionName) boolean with strict bounded numeric parsing, minimum major149; native update explanation and user-initiated browser fallback to configured `/app`; existing ten supported-runtime matrix cases unchanged.

1. On owned API32, restore exact original Google120 APK and source/provider custody. Add actual unsupported-provider UI regression and run it before app changes.
   Expected: RED because the native update screen does not exist.
2. Add policy input tests first, then implement strict policy, minSdk29 and native pre-probe/pre-WebView gate with update/browser actions.
   Expected: policy tests reject120/133/135/148/null/malformed/oversized versions and accept149/future numeric versions.
3. Run actual unsupported-provider UI test, including intercepted external browser intent and absent WebView/private content. Use public instrumentation only, no external network/account.
   Expected: GREEN on original Google120; original supported-runtime tests are not relabeled as old-provider passes.
4. Run all JVM tests, Debug/test/unsignedRelease builds and lint with owned output directories; update native README.
   Expected: all pass; minSdk29 present in built APK; no source/test weakening.
5. Commit bounded implementation and record task completion/evidence.

### Task 2: Qualify the supported runtime and hand off

Files: SDK evidence/receipts, native status/decision/spec docs. Consumes Task1 gate and exact labels/minimum.

1. Run complete default-mode Android fixture matrix with Google SDK149 on owned older/newer Android targets, preserving source and provider hashes. Include the separate cold process restart; count all ten cases.
   Expected:10+1 pass per selected supported target; no renderer flags/observer.
2. At a clean committed candidate run Android owned-local Next/PostgreSQL qualification with all18checks,3native roles/activation cases and independent cold restart.
   Expected: exact candidate/source, all checks pass and ownership closes; no real delivery/production credentials.
3. Preserve unchanged iOS/server qualification by exact source comparison; run appropriate harness guards if changed, do not re-run unchanged broad JS/SQL suites without cause.
   Expected: source custody supports retained prior evidence, no unsupported expanded claim.
4. Perform the required fresh review for this extension, one executor correction pass if needed, and required verification. Archive rulings/minors and actual results. Restore temporary provider updates/settings and stop exact owned SDK resources. Commit final handoff.
   Expected: local phases1–2 implementation/verification complete under approved runtime; Phase3/4 external gates explicit, no push/merge/deploy.


## Completed November4

Task1 implemented and verified atad9f38fa. Task2 qualified final backend-test candidate79f2d9cb, with identical application/foundation source, and the final handoff atf031146b. Single fresh extension review approved2d3c92ce with no blockers; nonblocking module extraction is deferred. Both task completion records, all rulings/minors, executed commands and evidence are archived in `docs/native/evidence/2026-11-04/runtime-baseline/progress.md`. Current status: local Phases1–2 complete, no push/merge/deploy, next Phase3 external qualification and source reconciliation before development integration. This plan's temporary workspace is retired after archival; sibling workspaces and the active detached worktree are preserved.
