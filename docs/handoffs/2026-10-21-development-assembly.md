# Development assembly - October 21, 2026

Jose authorized consolidation of the separate release parts and explicitly corrected the destination to **development**. Main is not a destination. This is a source integration checkpoint under the existing deployment hold, not production acceptance.

## Source and changes

Assembly branch: `codex/release-assembly-20261021`, based on development `d4b01453f7fabaa7ac739d049934527b6b366310`. Protected main checkpoint: `7ffd013e39a9763a0655aa092b159dea4cbbfb50`.

The [43-head inventory](2026-10-21-development-assembly-sources.json) identifies exact source heads and dispositions. Included work covers current Signature/auth/dark UI, Manager/Owner UI and confirmation fixes, compliance/deletion, passkey backend/UI, pre-release backend repairs, Company Access unavailable handling, preview/browser recovery repairs, migration-order fixes, CI/test repairs, database rehearsal v2, profile refinement and planning/inspection documentation. Old prototypes, historical evidence branches and separately held tenant/bootstrap work retain explicit references rather than replacing newer implementations or becoming active features.

Conflict reconciliation preserves both login admission budgets, deletion/session fencing, current Timecards read-sequence/expiry/privacy guards, canonical payroll document view/download, and later browser cancellation accounting. The canonical fresh-install base now includes0034 account deletion followed by0035 passkeys; native payroll and Company Access adoption remain last, after the company/Owner exist. Held tenant migrations remain excluded. The migration runbook now points at the canonical manifest.

Integration fixes: bilingual login-budget copy and actual error-page regression, router-aware retry harness, missing0034/0035 classification, duplicate Home helper import, diagnostic test module specifiers, current Company profile/timecard browser selectors, and a repeatable source-drift check. Application/database/locked-dependency bytes at the reviewed `d10e4adc4617c984f947f606c00485f638b7e49c` checkpoint are unchanged through `db4c7ecffb87dedc0498689bcebcf596dc8ccfd2`; subsequent changes are test-driver/source-checker and this handoff only. Final publication and build receipts bind their actual later commit, rather than relabeling earlier test runs.

## Fresh verification

Node24.19.0; locked npm install. No production credentials or existing application database selected. PostgreSQL suites used new invocation-owned loopback clusters and fictional data. Browser runtime: project-pinned Playwright1.62.1, Chromium and WebKit.

| Check actually run | Result |
| --- | --- |
| Focused activation/login/copy/pay/retry/migration unit checks |31/31 across7 files |
| Full default unit suite |9,284 passed;801 existing skips,539 passing files and27 skipped files |
| Root TypeScript, rehearsal TypeScript and ESLint |Passed |
| Rehearsal safety/parser/privacy checks |17/17 |
| Release-engineering checks |69/69 |
| Source-drift regression checks |6/6; live43-head inventory and included ancestry pass |
| Passkey SQL/service/routes |34/34 |
| Configurable payroll SQL |36/36 |
| Foundation SQL and Phase B authority SQL |281/281 and46/46 |
| Company Access |496 foundation cases passed; initial36 exchange cases refused the incorrectly selected foundation prefix, then all36 passed with a separately owned exchange cluster. The failed first aggregate is retained. |
| Actual Clocker/Company Access fixture diagnostics |2/2; intentional timeout trace retained; disposal passed |
| Combined auth/policy/employee browser suite |Passed40 scenario records across both engines, including144 route/width visits, password/language, WebAuthn and deletion/session/passkey revocation |
| Extended Phase D browser |82 Chromium checks passed, including Manager approve/finalize/reopen, history preservation,44px geometry, reports/download/print and privacy clearing; stopped at the older Device name locator. No full-suite pass claimed. |
| Fresh company setup |8 installer/bootstrap/rollback/concurrency checks passed; Owner sign-in/settings traversed after label repair; extended employee journey stopped at the older form selector. No full-suite pass claimed. |
| Production build |Passed with source-custody receipts; final publication receipt records the exact commit |
| Dependency audit |Production:0 vulnerabilities. Full graph:2 moderate development-tool advisories in Vitest5.0.2/@vitest/mocker; no high/critical findings. No force upgrade performed. |

## Open release checks

1. Release SQL stops after generation175/176. `schedule-generation.integration.ts` expects `operational_authorization` after workspace deactivation; the incoming D2 error distinction returns `operational_unavailable:read_failed` through `getWorkspace`. The operation refuses execution. Resolve the intended classification with its regression evidence; the assertion was not weakened. Exchanges/notifications later in that fail-fast command were not executed by that invocation.
2. Phase D browser stops at `dialog.getByLabel('Device name')`; the new Clocker settings markup needs a matching, behavior-preserving driver. The82 preceding checks are partial evidence, not an aggregate pass.
3. Company-setup extended employee workflow stops at `form.employee-form` / First name after the Manager form rebuild. Update the semantic driver and rerun the original workflow; do not remove its account/session/authorization checks.
4. Rehearsal v2's historical56/56 receipt remains bound to PR16 candidate98c63b9e. This task ran its17 safety checks and2 actual fixture diagnostics, not a new full Docker backup/restore rehearsal. Final production source, migration manifest, hosted transport, restore/recovery and other existing release gates still need their exact-candidate evidence.
5. Hosted CI is not represented as green. Previous Actions runs were blocked by the account budget; publication must retain actual new run conclusions. No billing or mandatory CI/release control was changed.

Full release is **NO-GO**. Development consolidation does not close independent findings, certify physical devices/FaceID, waive CI gates, authorize hosted migrations or authorize deployment. `vercel.json` retains `git.deploymentEnabled:false`.

## Review and custody

Fresh read-only review approved development integration at d10e4adc and its bounded script delta at db4c7ecf, with no new integration blockers. It is risk-focused review of752 changed files, not a line-by-line audit of every historical input. One nonblocking maintainability finding remains: the expanded Timecards module should eventually separate presentation from its privacy/lifetime coordinator. No broad refactor was added to this assembly. Production/independent QA certification remains separate.

Owner: assembly executor. CTO position: consolidate tested current implementations; security position: retain authorization, deletion and privacy controls; governance position: development integration approved while failed production gates remain open. No new policy/risk exception was inferred.

Raw execution evidence, earlier failed invocations, review reports, exact build receipts and cleanup verification are retained locally at:

`/Users/josek0514/.codex/visualizations/2026/10/15/01a13d55-8ffc-7143-b994-4f8e00036472/development-assembly-20261021`

`cleanup-verification.json` independently checks recorded Next PIDs absent and ports closed, the owned exchange root/PID gone, and known parent cluster roots absent. Every owned SQL runner reported its cluster stopped; owned Next receipts record closed:true. No unrelated preview process was stopped.

## Keeping development current

New release work starts from freshly fetched `origin/development`. Run `npm run check:development-sources` before the next assembly. It fails on changed/missing/unclassified remote heads, missing incorporated sources, and advances on development or the assembly branch absent from the checkout. Review and integrate changes before updating inventory pins/dispositions. This detects drift; it does not silently auto-merge or deploy. Older source branches and their history are preserved.
