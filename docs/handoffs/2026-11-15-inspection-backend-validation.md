# Inspection backend foundation — local evidence

Status: first local implementation batch; the full Claude handoff remains open. No customer, hosted-development or production acceptance is claimed.

## Source and ownership

Work started from freshly fetched development `18c75692b841c20cc34590e233abdfdbe2b757ea` in this chat's detached worktree. Backend/code candidate `da7c75ed34a6d1b467a391b3687d36b240fdeb7a` contains the implementation below. Later documentation-only commits regenerate the manuals and record evidence. No named branch was created, pushed or merged; no host/environment was configured or deployed. Claude's collaboration checkout at `ce4de4bc` and its uncommitted UI work were preserved.

Development remains Jose's primary working/operating and acceptance release, held to production standards. Codex owns backend/hosting; Claude owns UI. Combined verification belongs on development before promoting the exact verified release to main/production with Jose's approval.

## Implemented locally

| Item | Change | Limits |
|---|---|---|
| AR-1 foundation | `src/instrumentation.ts` hooks framework errors; `src/lib/server-error.ts` writes bounded JSON to stderr with route template, generated/internal request reference, fixed error class and validated digest/SQLSTATE. The caught commerce-status failure now reports through it. | No hosted log stream/retention or rendered UI digest correlation has been verified. Other swallowed failures need individual classification and call-site coverage; the hook cannot observe swallowed exceptions. |
| JR-5 | Ready invitation status adds required `deliveryAvailable`; ISSUE requires eligibility and configured delivery, while authorized REVOKE remains available. The same validated delivery factory and current-workspace runtime environment are used as for writes. Browser DTO parsing validates the boolean; typed fixtures are aligned. | This means configured capability, not guaranteed SMTP health or inbox delivery. No external mail was sent or hosted transport activated. Claude can use the field for an explanatory disabled state; `allowedCommands` already prevents the offered command when false. |
| AR-8, JR-24/25 | One typed exact-true registry routes 24 application/adapter modules through unchanged opt-in semantics. `.env.example` documents disabled product flags and blank origins; README reflects current delivery/branch rules. | Hosted flag values remain explicitly unobserved in the environment matrix. Current development still consumes NEVORA_CLOCKER_UI_V2, so it is retained until reviewed UI integration. No feature was enabled. |
| AR-21 part | CI now runs on collaboration-branch pushes as well as development/main. | Full config reachability inventory, named-project/base-config consolidation and performance work remain open. No remote CI run was started or claimed. |
| AR-22 | Validation runs the existing adversarial production-marker build scan. The scan now restores a prior source-bound build on both success and failure. | The scan's temporary rebuild is a probe; it must not replace the artifact named by the source-bound receipt. Actual hosted CI still needs to run. |
| Build integration | The fixed error-only observer is distinguished from the private portal startup hook by its exact source hash. Unknown hooks and partial native installation inputs still fail closed. | No portal installation, private database enrollment, startup identity or tenant authority was created. |
| Manuals | Six guides/PDFs were regenerated offline against code candidate da7c75ed and source-bound verification now passes. | This is the backend-only development source. Claude's renamed labels and Employee ID/PIN UI require another guide edit/rebuild after reviewed combined UI integration. |

## Regression and verification evidence

Full logs remain in `.superpowers/sdd/2026-11-15-inspection-backend-foundation/` in this worktree. These tests used fictional data, owned loopback Postgres/SMTP and the pinned installed browser runtime. No production credentials or customer data were copied.

- Initial focused import/delivery baseline: **20 passed**.
- Logger/hook/caught commerce route: watched missing implementation and missing caught-error reporting fail; **33 passed** after changes.
- Invitation/route/race SQL: watched the delivery capability fail before implementation; **23 passed**. The current-workspace configuration followup failed before its fix, then **12 passed**.
- Invitation parser/component unit checks: **34 passed**. No invitation read opened an SMTP connection.
- Registry/configuration/commerce/hosted-adapter unit checks: **364 passed**. The missing-example regression failed before `.env.example` was completed.
- Whole-project TypeScript and changed-file ESLint: **passed**. Full `npm run lint` also completed with **0 errors and 1 warning** in untouched `services/hosted/neon/workforcemonitor.entry.ts:17` (`import/no-anonymous-default-export`).
- Full `npm test -- --maxWorkers=2`: **12,995 passed, 936 skipped, 1 failed** across 909 files. The failure was `src/test/manual-publication.test.ts`, `Stale or foreign application content hash`. After the source-bound manual rebuild, that test independently **passed**. This is not described as a second whole-suite green run.
- Existing release-engineering suite plus marker-custody subprocess tests: **363 passed**.
- CI workflow and marker-preservation checks: **33 passed**; successful scan originally discarded the retained build, and the real subprocess regression caught that before the correction.
- Portal build-input checks: **18 passed**, including coherent native inputs, malformed OIDs, stale/modified sources, observer-only hook, partial native inputs and unknown hook rejection.
- Source-bound production build at **da7c75ed34a6d1b467a391b3687d36b240fdeb7a: passed** with source custody unchanged. Receipt location is recorded in `build-evidence-path` beside the logs.
- Actual adversarial production build/marker scan: **passed**, **4,901 artifacts** scanned with development markers absent. All **4,901 retained source-bound artifact hashes** were checked again after the scan and matched the original receipt; the original `.next` was restored.
- Owned onboarding invitation-batch suite: **14 passed**, owned cluster stopped/removed.
- Broader owned Company Access suite: **32 files, 520 passed**, owned cluster stopped. Final focused application/manual checks: **62 passed**; final workflow/build-input/marker checks: **51 passed**.

## Review and corrective work

The read-only code reviewer independently ran 61 focused application tests and 31 workflow checks; all passed. The original review requested changes for a HIGH build/receipt mismatch: marker probing replaced the source-bound `.next`. The unchanged original report is preserved in [the repository review record](reviews/2026-11-15-backend-foundation-initial-review.md).

The author corrected it with a real temporary-fixture subprocess test watched red then green, then ran the actual marker probe and checked every retained artifact hash against the original source receipt. The original review report intentionally remains unchanged; it does not pre-approve later fixes or certify release readiness. No second independent release certification is implied.

The first real production build also exposed the old build consumer's filename-only assumption about instrumentation. The new observer-only case failed before its fix. During those tests, three older positive native-source tests also failed: commit c9f71141 had changed the fixed unused bootstrap fixture's Next pin from 16.3.8 to 16.4.2 without updating its consumer's exact source hash. The diff was inspected, and the fixed hash was updated to that existing reviewed 16.4.2 preimage. No fixture assertion, stale-source rejection, private installation requirement or startup authorization was removed. All 18 consumer tests now pass, and the real observer build passes.

## Rulings and remaining work

- Hosted verification is held until exact environment custody is available; local evidence is not substituted for hosted logging/delivery. Cost: these release gates remain open.
- Global error digest wiring waits for Claude's reviewed UI contract; current development's component lacks that prop. Cost: displayed-reference correlation remains unverified.
- Actual owned SQL coverage replaced a proposed mocked invitation status test. Cost: those regressions require the local Postgres runtime.
- The legacy renderer flag stays documented because current development still uses it. Cost: remove it only with the reviewed UI transition.
- JR-23's assumed simple fix was rejected during implementation discovery: `must_change_password` is selected but not enforced by web login. Setting it to true alone would provide no password-replacement protection. It remains open until the complete password-proven replacement path and session guards are implemented and tested. No partial security fix is claimed.
- Jose approved external calculation and statements managed in NEVORA. Import-only enforcement across capabilities, service and worker is still open; the native engine has not been deleted, altered or activated. Native 2027 rules, native YTD policy and native-only enhancements stay outside that approved first-release scope.
- Daily/profile/notification read additions, billing/time-zone/reminder work, roster/kiosk contracts, QA-driver updates, full CI inventory and combined UI/backend qualification remain tracked in the [intake register](2026-11-15-inspection-backend-intake.md).
- Billing destination, Spanish timing, email-less staff activation, scoped Manager product scope, offline/late punches and attendance policy toggles remain Jose's decisions where the original handoff requires them. No such choice was inferred from payroll approval.

Governance position: local remediation evidence is available; combined-development and customer-release acceptance remain **held**. No independent inspection findings are self-closed. The next implementation scope is explicit import-only statements, the complete operator-password replacement flow and the remaining independent handoff contracts; combined UI acceptance follows the reviewed source integration. No additional permission is needed to continue the already approved bounded work.
