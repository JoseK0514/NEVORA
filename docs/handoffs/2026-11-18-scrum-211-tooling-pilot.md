# SCRUM-211 tooling pilot

November 18, 2026. Pilot source `e7ed9923396a30a13228f4d2eddfc7fdf4a0f00c` (frozen candidate 02). GitHub Development was `22107a24272f2347bbb59a3da1f54319632772a5`. Use this report as pilot evidence. The existing SCRUM-83 integration chat owns any new release candidate, its full CI, and Development publication.

## Result

The bounded comparison passed. A larger compatibility screen and its follow-up repairs still failed before assertions in two suites that pass on Vitest, and existing release evidence readers reject the Rstest report contract. The condition for completing the migration was therefore unmet. This handoff contains no change to the candidate's application, test projects, lint configuration, dependencies, or audit gate. SCRUM-211 remains open.

[GitHub's advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) had no patched version and npm's latest picomatch remained 4.0.7 at the end of the pilot. Prefer a compatible published patch if one becomes available.

## Side-by-side runs

Node 24.19.0, macOS arm64, Vitest 5.0.5, Rstest 0.12.6, Oxlint 1.94.0, PostgreSQL 16.15, and Playwright 1.62.1 Chromium. The Vitest passes ran the original candidate tests. Rstest ran copies with only import and resolution adaptations plus an opt-in fixture mutation. The browser application was the original source at the frozen SHA, mirrored by the existing owned Next harness. Temporary PostgreSQL clusters were bound to loopback and stopped after each run.

| Suite and fixture change | Vitest | Rstest |
| --- | --- | --- |
| Historical schedule resolution. Move the synthetic publication start from 08:00 to 08:30. | 18 passed, then 17 passed and 1 failed on start time | Same counts and assertion |
| PostgreSQL session settings. Set the transaction-local time zone to Tahiti instead of Honolulu. | 2 passed, then 1 passed and 1 failed on the returned setting | Same counts and assertion |
| Operator password reset in Chromium. Restore the synthetic replacement-required flag immediately after the successful reset response. | 1 passed, then 1 failed on the persisted flag | Same counts and assertion |

Every intended failure exited 1 and reached the assertion. Early setup errors are excluded from the negative-control counts. The Rstest configuration needed Rspack's `.mjs` to `.mts` extension alias. Fixture copies were moved outside the application input roots so the browser source custody guard stayed active.

The existing ESLint release lint chain passed all 36 checks. Oxlint with the exact vendored Next.js plugin through its JavaScript plugin API matched ESLint on 30 fixtures: one deliberate violation per rule for all 22 active Next.js rules, four custom pages-root navigation cases, and four allowed navigation controls. The built-in Oxlint Next.js plugin could not configure `no-location-assign-relative-destination`. Five additional React Hooks rule fixtures also matched with the existing plugin loaded. This checks the observed diagnostics and severities, with project-wide lint parity still unverified.

An isolated root dependency experiment retained the vendored Next.js plugin and ESLint base for compatibility while replacing the Vitest/TypeScript ESLint dependency paths. There were zero picomatch copies. The locked install with `npm ci` and the exact `npm audit --audit-level=high` both exited 0. The React transform was also added to the disposable graph and the same audit still passed. The only finding was the moderate Next.js issue assigned to SCRUM-213. The audit result belongs to the dependency experiment, before the application-wide test and lint configuration has been ported.

## Migration qualification gaps

- `npm run check:test-projects` passed the original inventory of 81 configurations without orphans. Vitest discovered 1,021 files in the default project. The 71-file compatibility screen passed 69 files and skipped two on Vitest, with 1,145 passing tests and 68 intentional skips.
- With the React transform, mock rewrites, and static-import bridge, the Rstest screen reached 65 passing files, two skips, and four failed files. Focused attempts repaired two more files, including the schedule controls' partial React mock. The self-service guard and auth session suites still failed before collecting tests, in Rstest's initialization of a mocked module namespace. The last residual probe failed in both suites despite trying the documented static import approach. No assertion was skipped or relaxed to get a pass. The screen and focused reruns are exploratory comparisons, with no combined 71-file pass claimed.
- Rstest can preserve ordinary and hoisted mocks, and the static partial-mock pattern worked on workspace presentation and operating-system supervisor suites. The dynamic Home stage-reader bootstrap also passed all 142 assertions after converting its computed module paths to literal paths. These provide examples for follow-up, with incomplete coverage outside the inspected cases.
- The Rstest JSON output uses `status`, `summary`, and `files`. The Phase E, Clocker, and local Step 4 readers validate Vitest's `success`, count fields, and absolute per-file assertion records. Any reporter migration must preserve source files, identities, counts, statuses, and fail-closed checks for failed, skipped, empty, foreign, and duplicate records. No adapter was qualified here.
- Before combining a migration, re-run the residual auth and self-service suites with equivalent mock behavior, validate real positive and negative Rstest reports against the release readers, then compare the discovered file lists and execute all 81 projects with the same owned environment boundaries. Verify the effective whole-repository lint rules and the unchanged full audit after another clean install.

[SCRUM-211](https://thevelani-team.atlassian.net/browse/SCRUM-211) holds the disposition and integration references. Local retained output is under `/Users/josek0514/.codex/state/plugins/codex-security/scans/nevora-scrum-211/artifacts-160b5be28cab5efaa45ec0d641380261a62419f8aea4480a3dff85e420baba39/artifacts/scrum-211/pilot`, including the browser and SQL negative controls, Next.js lint comparison, and the residual Rstest screen.
