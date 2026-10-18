# Mobile branch starting checkpoint

Date: 2026-10-18, America/Puerto_Rico.

## Result and source

`codex/nevora-mobile-launch` is an isolated, pushed branch for the iOS/Android work. Task 1 has started; **G0 has not passed** and mobile feature implementation has not started. This checkpoint preserves the source and verifies a useful part of the web baseline. It does not certify the 270-commit full-app delta for release.

- Full-app baseline: `33b6dfa0f92f47b3c8b417aba57f52108589bc69`.
- Documentation/source-custody checkpoint and successful build: `f7af552f8c550939d00c02bb007eb145856b8bbd`.
- Browser QA selector fix: `9085a37061e7952e89c3251d2fa60edcd2edcdd9`.
- Runtime: Node `24.19.0`, npm `11.17.0`; locked install completed with `npm ci --no-audit --no-fund`.
- Application source, deployment controls and database migrations are unchanged from the full-app baseline.

## Checks actually run

Database checks used newly created, owned PostgreSQL 17.10 clusters on loopback with fictional data. Existing application/test database environment variables were unset. The company browser test used the existing engineering-toolkit Playwright runtime and its owned Next.js mirror. Both database runners stopped their own clusters after completing.

| Check | Observed result | Local evidence file |
|---|---|---|
| `npm test -- --maxWorkers=1`, initial baseline | Exit 0; 408 files passed, 27 skipped; 7,068 tests passed, 801 skipped as reported by Vitest | `unit.log` |
| Same unit command after the QA selector fix, at `9085a370` | Exit 0; 408 files passed, 27 skipped; 7,068 tests passed, 801 skipped as reported by Vitest | `unit-final.log` |
| `npm run typecheck` | Exit 0 | `typecheck.log` |
| `npm run lint` | Exit 0; zero errors and one existing warning | `lint.log` |
| `npm run test:notifications:qa` | 6 passed, 0 failed | `notifications-config.log` |
| `npm run test:foundation:qa` | 8 passed, 0 failed | `foundation-config.log` |
| `npm run test:release-engineering` | 51 passed, 0 failed | `release-engineering.log` |
| `node scripts/release-build.mjs`, clean source checkpoint `f7af552f` | Exit 0; source clean and unchanged, with source-bound build receipt | `build.log` |
| `npm audit --omit=dev --audit-level=high --json` | Exit 0; 0 reported vulnerabilities | `production-audit.json` |
| `npm audit --audit-level=high --json` | Exit 0; 0 reported vulnerabilities | `full-audit.json` |
| `npm run test:clocker:owned` | Exit 0; 34 files and 515 tests passed | `clocker-postgres.log` |
| `npm run test:company:integration`, after selector correction | Exit 0; all 19 logged checks passed | `company-setup-fixed.log` |
| `node --check scripts/company-setup-qa.mjs`; `git diff --check` | Exit 0 | Command results in execution record |

Logs above are under the local ignored workspace `.superpowers/sdd/2026-10-18-nevora-ios-android-launch/`. They are not committed. The external source-bound build receipt is at `/Users/josek0514/.codex/.chatgpt-projects/g-p-6abf0d9359708191a1e72c421bc4de9d/docs/execution/nevora-mobile-start-20261018/build-source.json`. These machine-local records are separate from remote CI evidence.

The company setup checks exercised fresh setup, rollback, repeat/concurrent setup, employee creation/editing, activation, password hashing, actual sign-in, role denials, deactivation/session revocation, and owner policy settings at 390px and 1440px. These checks cover those scenarios only; they do not establish complete web or native parity.

## Failure found and correction

The first fully configured company setup run timed out at `scripts/company-setup-qa.mjs:244`: its exact role selector requested `Activate account`, but the current activation component renders `Activate Account`. The fix changes that string only, keeping exact matching and every password-storage, sign-in, authorization and revocation assertion. The full owned company setup runner then passed. No application behavior was changed to satisfy the test.

An earlier invocation stopped because the browser runner's evidence/runtime environment was missing. The rerun supplied the existing explicit runtime and task-owned evidence directory. No environment guard was bypassed.

## Existing warning and limits

- ESLint reports `react-hooks/exhaustive-deps` in `src/components/employee-weekly-confirmation.tsx:18:25` about `generation.current` in effect cleanup. This existing application warning remains recorded and unchanged.
- npm installation reported pending allow-scripts notices for `esbuild`, `fsevents` and `unrs-resolver`; package permissions were not expanded.
- The default unit suite skips gated tests; its pass is not proof that the separate PostgreSQL/browser jobs ran.
- Dependency audits report the registry's known advisories at the time of execution; they are not a security certification.

## Checkpoint review

A separate read-only reviewer inspected the changed QA script, before/after browser logs, baseline evidence and custody archive, independently verifying all 174 archived entries against both the manifest and original source bytes. It found no blocking code issue and approved this bounded starting checkpoint. One stale historical sentence in the plan was corrected to distinguish planning time from execution time. The local report is `.omo/evidence/nevora-mobile-start-code-review.md`.

The review did not assess the 270 inherited commits, future native implementation, store policy acceptance or hosted release readiness. Those remain separate plan gates. At review time the final unit rerun and final push were still pending. The unit rerun subsequently passed as recorded above; this results document is the documentation-only successor to the verified QA fix.

## Remaining G0 work

1. Establish exact-candidate remote CI. The current push filters in `.github/workflows/ci.yml` exclude this mobile branch. A reviewed PR targeting `development` or a reviewed CI trigger change is needed; no PR has been created by this checkpoint.
2. Complete and record the remaining applicable governed suites, including release PostgreSQL, Phase D/E SQL/browser/evidence, payroll, and migration upgrade coverage. The company and Clocker checks above cover only part of this requirement.
3. Reconcile the upcoming web release's frozen SHA and schema candidate. The explicit 33-migration single-company order is documented in [source baseline](source-baseline.md); hosted schema identity, authorized migration, backup and rollback remain unverified. The paused SaaS migrations stay excluded.
4. Record independent baseline/release review and confirm the release candidate disables preview/local-only surfaces. Production is not inferred from a local successful build.

After G0, Task 2 defines production native authentication/contracts and imports the prototype selectively. Its local-only endpoints must retain their evaluation restrictions. Full role parity, privacy/support/deletion, moderation, native push, device testing, signing and stores remain later plan items.

## Release boundary

Only the feature branch was pushed. `main`, remote `development`, the occupied shared checkout and the original native POC were not changed. No production deployment, hosted database migration, customer-data test or real notification was performed. Merge remains a later reviewed action after the web release and applicable gates; creating this branch authorizes neither promotion nor publication.
