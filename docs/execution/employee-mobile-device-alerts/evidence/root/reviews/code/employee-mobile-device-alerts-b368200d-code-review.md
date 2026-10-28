# Device alerts independent follow-up review — b368200d

Reviewed candidate `b368200d33e6c3498d468f2ea386b99c21a68b3a`, base `059f4ac2fbd4cc50bb526bb0f1001465de2e2ce2`, on branch `codex/employee-mobile-local-resume-20261027`. Scope: original DEV-CR-1/2 remediation and all eight files changed since original reviewed candidate4f9cc547. Original NO-GO report and failing-behavior reproduction are preserved unchanged. This is a separate review, not a replacement of historical evidence.

- codeQualityStatus: **WATCH**
- recommendation: **APPROVE** for bounded local continuation only.
- Independent recommendation: **GO WITH CONDITIONS**.
- blockers: No remaining independently established CRITICAL/HIGH code defect in this follow-up scope. Full feature acceptance remains gated on source-bound owned-browser evidence and retained broader conditions.

## CRITICAL
None identified.

## HIGH
**DEV-CR-1 repaired for the bound Employee/Lead path; independent handler-level verification complete.**

`src/lib/notifications/subscription-service.ts:197–205` now omits unchanged proof writes for bound requests. Initial proof issuance and actual associated-session changes may still write. Unbound legacy behavior remains untouched. `src/lib/notifications/device-client.ts:358–375` additionally places bound status network responses under the existing subscription lifecycle Web Lock, bypassing nested acquisition only when this runtime already holds its enrollment lock. The lock covers actual response completion, not merely JavaScript result application. This is consistent with the existing single shared owner, epoch and native-operation fences.

Independent artifact `cookie-race-closure.test.ts` invokes actual handlers with a valid bound request, inspects cookie setter calls and verifies zero old installation-cookie writes, performs enrollment, applies any delayed queued cookie writes, then verifies status remains enabled and original-generation cleanup returns200/complete. **1/1 passed** in `cookie-race-closure.log`. Original `cookie-race.test.ts` and log remain intact and still document the old candidate's incorrect behavior. The fake repository does not implement persistent detach, so this verifies handler state/proof and receipt behavior; it is not SQL detach or browser scheduling evidence.

Residual boundary: legacy unbound status intentionally retains its pre-existing cookie rewrite behavior; cross-surface interleavings with legacy callers are not certified fixed. No cross-account disclosure or new regression is established here. Do not describe the repair as a universal fix to every legacy status caller. Actual browser lock ordering/new-proof scenarios remain part of the owned-browser gate.

## MEDIUM
**DEV-CR-2 source repair verified; browser execution evidence pending.**

`src/test/integration/employee-mobile-device-alerts.integration.ts:64` now holds the actual status response, observes the distinct loading state, releases the response, awaits final error and only then samples worker ownership. `DeviceController.reconcile()` explicitly takes the visible loading path when cleanup is pending. This removes the previous wait on an already-visible Retry button. The assertion meaningfully distinguishes a completed recovery transition from the stale pre-refresh UI. This review did not execute the competing browser/database suite while root's run02 was active; do not claim the real browser case passed based on this source review.

## LOW
None added.

## Independent checks
- Eight focused test files: **147/147 PASS**, `focused-unit-closure.log`; exact command is recorded in that log.
- Actual-write bound-cookie repair reproduction: **1/1 PASS**, `cookie-race-closure.log`, config `closure-vitest.config.mts`.
- `git diff --check 059f4ac2..b368200d`: PASS.
- All eight-file remediation diff inspected, including profile copy/link polish, original-generation replacement test, native capability gate, test fixture and browser origin changes.
- The installed NextRequest characterization passes in the independently executed owned-device-environment test. Only owned fixture/browser origin moved to exact localhost with original port. Production origin rejection was not modified.
- No application/test/configuration source edited by this reviewer. External review tests and reports only.

## Skill perspectives
Previously loaded remove-ai-slops and programming criteria reapplied to this delta. The new cookie test checks observable enrollment and original-generation cleanup, not deletion-only absence. The original-generation replacement test asserts requests preserve the reviewed generation when canonical state changes. No LLM prompt prose pinning, needless production normalization or speculative abstraction introduced. The previous false-confidence test problem has a concrete synchronization repair. No additional violation requiring changes established in this delta.

## Conditions and next gate
Approval is bounded local continuation, not acceptance/deployment. Root's run02 was ongoing; independent full browser, PostgreSQL, physical OS/native permission, assistive-technology/provider/hosted certification were not performed. Review the source-bound owned journey result and ensure its exact candidate and limitations are retained. Any further code fix needs its own diff verification. Retain13 historical baseline unit failures, process-observation instability, CalendarQA-CAL1 and Communications conditions. No prior condition is closed here.
