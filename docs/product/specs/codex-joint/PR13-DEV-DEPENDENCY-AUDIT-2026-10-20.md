# PR13 development dependency audit repair — 2026-10-20

The mandatory full dependency audit failed on Vite 8.3.1. This change updates only its lockfile record to 8.3.3, preserving the existing Vitest 5.0.2 peer relationship. Executable checkpoint: `abfd583d6582cd405ce39040ec8c34320cf9da06`, branch `codex/verify-preview-33`, based on clean `324e5f49a5779dc3d7ad1ad3e48123f13e88ccc4`.

## Cause and bounded change

The actual baseline `npm audit --json --audit-level=high` exited 1 with one high-severity Vite finding and advisories GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, and GHSA-587h-7wmj-h5pm. Each reported affected range includes 8.3.0 through 8.3.2. The separate production-only audit exited 0. Development classification is not an audit exemption.

The [upstream advisory](https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm) names Vite 8.3.3 as patched. The [Vite 8.3.3 release](https://github.com/vitejs/vite/releases/tag/v8.3.3) includes launch-editor 2.14.2. Current registry metadata, publication times, tarball URL and integrity were fetched directly. Both existing Vite consumers accept 8.3.3: Vitest `^6.4.0 || ^7.0.0 || ^8.0.0` and @vitest/mocker `^6.0.0 || ^7.0.0 || ^8.0.0`.

Using the supported [npm update options](https://docs.npmjs.com/cli/v11/commands/npm-update/), the actual command was:

```sh
npm update vite --package-lock-only --ignore-scripts --no-audit --no-fund --before=2026-10-06T04:10:20.000Z
```

The registry reported 8.3.3 published at `2026-10-06T04:10:19.326Z` and 8.3.4 at `2026-10-08T12:07:04.441Z`. The bound prevents selection of the newer release. The resulting graph was independently compared to the baseline: only `node_modules/vite` changed. Its version, resolved tarball and integrity are updated, and its Rolldown requirement becomes `~1.2.11`. Already-locked Rolldown 1.2.11 satisfies that requirement; no transitive package version changes were needed. npm also reordered two unchanged pdf-lib records; that unrelated ordering churn was removed with apply_patch. The final executable diff is four added and two removed lines in package-lock.json. package.json, production dependency records, app code, browser harness, workflows, CI thresholds and timeouts are unchanged.

## Verification and custody

Evidence root `E` is `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/pr13-dev-audit`. No active ulw-loop attempt was found; this is the task's assigned external evidence location. All commands ran in the isolated worktree `/Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler` with the repository's `safeEnvironment`, Node 24.19.0 and npm 11.17.0. No production credentials or real notifications/data were used.

For entries below using `run.mjs`, the exact invocation is `node E/run.mjs <kind> unchanged <command>`. That runner records the child exit code and full log, and compares HEAD, status and SHA256 hashes of every tracked file before/after execution. Final check kinds are `final/unit`, `final/types`, `final/lint`, `final/release`, `final/audit-all`, and `final/audit-production`. Each has adjacent `.log.receipt.json` and `.log.source.json`. The final checks started clean at the executable checkpoint and all source guards closed before this documentation was written.

| Criterion / scenario | Actual command | Binary observable | Captured artifact relative to E |
| --- | --- | --- | --- |
| Reproduce mandatory full audit failure | `npm audit --json --audit-level=high` | Exit 1; Vite high finding and three named advisories | `baseline/audit-all.log`, adjacent receipt |
| Preserve baseline production audit | `npm audit --omit=dev --json --audit-level=high` | Exit 0; zero vulnerabilities | `baseline/audit-production.log`, adjacent receipt |
| Bounded lock update | Command above via `run.mjs lock-update lock-update` | Exit 0; only lockfile changed | `lock-update.log`, receipt/source snapshot; `npm-generated.diff` |
| Fresh exact lock install, lifecycle scripts disabled | `npm ci --ignore-scripts --no-audit --no-fund` via kind `install` | Exit 0; source unchanged | `install.log`, receipt/source snapshot |
| Actual installed runtime and graph | `node E/verify-install.mjs` via kind `install-verification` | Exit 0; installed Vite8.3.3/Vitest5.0.2/Rolldown1.2.11; consumer ranges valid; downloaded tarball SHA512 matches lock/registry; esbuild0.28.2 transform succeeds | `install-verification.log`, receipt/source snapshot |
| Focused runtime and harness regression | `npm test -- src/test/phase-e-browser-runtime.test.ts src/test/phase-e-browser-evidence.test.ts` via kind `focused-precommit` | Exit 0; 173 tests in 2 files pass | `focused-precommit.log`, receipt/source snapshot |
| Full default unit suite, run alone | `npm test` | Exit 0; 7,579 passed / 801 skipped; 452 files passed / 27 skipped | `final/unit.log`, receipt/source snapshot |
| Type checking | `npm run typecheck` | Exit 0 | `final/types.log`, receipt/source snapshot |
| Lint | `npm run lint` | Exit 0 | `final/lint.log`, receipt/source snapshot |
| Release-engineering regressions | `npm run test:release-engineering` | Exit 0; actual Node output 66 passed, 0 failed/skipped | `final/release.log`, receipt/source snapshot |
| Patched full audit, original high threshold | `npm audit --json --audit-level=high` | Exit 0; zero vulnerabilities | `final/audit-all.log`, receipt/source snapshot |
| Patched production-only audit, original high threshold | `npm audit --omit=dev --json --audit-level=high` | Exit 0; zero vulnerabilities | `final/audit-production.log`, receipt/source snapshot |

Baseline audit/registry invocations used the inspected adjacent `E/../pr13-runtime-diagnostics/run-check.mjs BASELINE_SHA E/baseline <kind> <command>` wrapper, which likewise enforces clean source custody. Focused tests and installation were run before the executable commit and explicitly record a dirty lockfile with unchanged bytes across each run. Final full units and all final gates ran after that commit on the same installed patched dependencies. No previous unit artifacts or old node_modules were substituted. Skipped tests remain skipped, not certified. No implementation-test failures occurred; the intentional baseline audit failure remains retained.

Lockfile SHA256: `4239b5d38c09f0ca2ef41a946043c6a43e9577723c643dae68ae60b0ec3ec4d9`. package.json SHA256: `b6ef5283603a5f00fcfc64cce5f5e6c51b734869196aeb327c5af25d4fb72996`. `E/final/local-summary.json` retains measured counts, all actual exit codes, source custody, prior baseline results, and artifact hashes.

## Handoff and release limits

CTO position: the smallest compatible lockfile change is locally verified; owner is the Task5 implementation executor. CISO position: the observed mandatory dependency finding is remediated locally with unchanged thresholds and no exemption. Governance recommendation: GO WITH CONDITIONS for handoff, release impact CONDITION. Root must independently review this scoped patch, build the final combined candidate, perform its authorized push and fresh hosted CI, then complete the broader review. Local passing results do not establish hosted or production readiness.

Existing browser failures remain visible and are not closed by this audit repair. No normal local 70-cell rerun, production merge/deploy, permission widening, paid scan or risk exception occurred. No Jose decision is required for the completed bounded local patch. Production authorization remains separate. Rollback is an ordinary revert of the single lockfile commit; it would reopen the audit finding and release gate.
