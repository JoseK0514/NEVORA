# Independent SSR readiness regression review — 52e78722

Candidate: `52e7872255a5a01ae6a08d25b71a5fcac56204a5`, clean HEAD verified.
Scope: `scripts/attention-ssr-readiness-control.mjs` and integration into `scripts/attention-intent-readiness.check.mjs`.

codeQualityStatus: **WATCH**
recommendation: **APPROVE the persisted regression harness**.
blockers: **[]** in this bounded harness review. No product fix or release/cloud finding closure is approved here.

## Independent inspection

Read both complete scripts, exact commit diff, actual `EmployeeWeeklyConfirmation`, existing detachment helper, and independent QA SSR reproduction / UI remediation-design reports. Diff whitespace check passes. No runtime/test/build was launched and no source/HEAD/index changed, preserving the parent’s active RED run. This report is source/evidence assessment, not a claim that the new persisted run passed or reproduced yet.

## Actual-component and declared-boundary proof

Both SSR and browser bundles import the real confirmation component from the checkout. Server uses actual React renderToString; browser uses actual hydrateRoot and development StrictMode. The custom resolver substitutes only next/navigation and the action module. No component source/state/lifecycle callback is replaced. The fictional action throws if invoked, and the scenario never submits a command. Router refresh only increments a fixture counter.

Additional declared controls are material: CSS is omitted, visibility is overridden, and actual MessageChannel delivery is held to force an unarmed interval. The fixture is a loopback leaf document, not Next/RSC or PostgreSQL. The listener wrapper observes the real pagehide subscription, preserving native registration/removal and original callback arguments/this for this component's function-listener usage. Its counts do not certify unrelated listeners or general EventTarget semantics.

This establishes a discriminating exposed-form/readiness mechanism under a controlled scheduler, not historical cloud timing, native pre-hydration navigation, BFCache or secrecy of serialized props. The return limitations accurately preserve those distinctions. The opening comment's “only router/action boundaries fictional” should be read together with the explicit scheduler/visibility/CSS controls, not used as a claim of an unmodified browser environment.

## Assertions and ordering

The test captures SSR and pre-effect snapshots with zero active listeners, delivers early pagehide and checks zero invocations, then releases actual hydration and waits for the armed listener/form. It verifies original operation identity. If the old SSR form is present, it retains the full existing detachment timeout before the separate armed positive control. The positive control cannot erase RED: subsequent assertions require zero SSR/pre-effect authority fields, no initial buttons, preparing status, and a recorded form appearance with an active listener and an install timestamp no later than appearance.

MutationObserver records observable form attachment at its delivery checkpoint. This proves the intended ordering for the proposed effect-then-state-update implementation; it is not sub-task-level proof of every possible React DOM/effect ordering. Future refactors that rely on same-task attachment then listener installation should be assessed against the underlying invariant, not merely this timestamp check.

StrictMode replay is explicitly asserted (at least two registrations/one cleanup); router replacement cannot revive retired intent; actual unmount removes listeners; remount exposes only the same fixture operation with one armed listener and no autofocus. Already-hidden setup must remain blocked without any form appearance, and subsequent focus requests canonical refresh without restoring retired authority. These are meaningful missing-lifecycle/retirement regressions, not arbitrary implementation shape assertions.

## Existing behavior and result propagation

The original readiness control body is unchanged. It still proves actual pending-command retirement after a React commit, no completion before that commit, late response fencing, blocked rendering and normal committed refresh. The integration now requires BOTH controls, BOTH engines, passing status and browserClosed. It writes the nested SSR result and sets nonzero exit status on any failure. Existing 15-second page defaults and `waitForPrivateIntentClear` remain unchanged. There is no wider timeout, retry-until-green, relaxed error list, swallowed failed assertion or accepted unknown-as-unavailable behavior.

A captured failed engine remains failed even though the next engine is attempted. The old exposure branch deliberately incurs the full negative timeout; this is useful RED discrimination, not a production delay. The actual 14-cell Next Attention workflow and operation/retry/session-authority behavior remain separately mandatory.

## Privacy and cleanup

Only fictional literals are used. Persisted snapshots include authority field counts and same-operation boolean, not authority values, request bodies or credentials. Browser external requests are blocked and counted; success requires zero external and runtime errors. The standalone page does not access existing application sessions or a database. Error messages are URL-redacted; in this fictional leaf that is proportionate, not a general real-data diagnostic policy.

Both browser scopes use finally to release held tasks and await context/browser closure; outer finally closes the loopback server. Successful result custody explicitly requires disconnected browsers, and source hashes are checked unchanged by the integrating driver. If context.close itself throws, subsequent browser.close may not run; this is a preexisting cleanup pattern also used by the original control, and would fail execution rather than yield a green receipt. External process/port custody remains appropriate after exceptional runner failures. No new shutdown guarantee beyond awaited normal cleanup is inferred here.

## Findings by severity / skill perspectives

CRITICAL: none new.
HIGH: none new.
MEDIUM: none new.
LOW / limits: MutationObserver checkpoint granularity and exceptional cleanup described above; neither blocks the bounded regression harness.

Reapplied loaded programming/remove-ai-slops criteria. Tests observe actual SSR/action availability, real listener behavior and resulting DOM state; they are not prose pins, deletion-only tests, constant-mirroring tests or mocks that return the assertion. Synthetic scheduler/router/action/visibility boundaries are purposeful test seams, documented and excluded from broader certification. No production parsing/normalization, speculative product abstraction or untyped product escape hatch is introduced.

## Disposition

Approve the harness as the persisted RED/GREEN regression target. Require retained clean RED results, then separate independent review of the smallest product correction and independent rerun of both controls plus real full Attention scenarios. Original cloud QA-AT01 and the separate lifecycle finding retain their own evidence/closure decisions; this control does not connect historical timing to either by itself. Mandatory new-candidate CI, development verification, hosted approval/acceptance and production authorization remain separate. Only this external report was created; previous findings and other agents' work were preserved.
