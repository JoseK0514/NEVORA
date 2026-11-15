# Named test projects

The canonical inventory is `scripts/vitest-projects.json`: 80 named configurations, including the rehearsal configuration. Each compatibility file merges `vitest.shared.mts`; existing owned runners, fixture admission, database prefixes, nested projects, timeouts and assertions remain in place. `vitest.config.mts` loads the selected `NEVORA_TEST_PROJECT` only (default `unit`). Loading every owned config during an ordinary unit run would violate their explicit environment admission and is intentionally avoided.

- `npm test -- <file/filter>` runs the default unit project. It does not activate a database, browser, native fixture or service.
- `NEVORA_TEST_PROJECT=<name> npx vitest list` selects a named configuration. Owned configurations still refuse absent/foreign prerequisites. Use their existing owned runner for execution rather than supplying application credentials.
- Existing commands such as `node scripts/payroll-postgres.mjs vitest.native-payroll-integration.config.mts` retain the exact owned database creation and cleanup. They now report their project name.
- `npm run check:test-projects` compares tracked and untracked config paths with the inventory, rejects unknown/missing/duplicate paths or names and requires each named shared configuration. CI runs this check and its orphan regression. Registration establishes reachability; it does not claim every project is executed on every CI event.

Primary reference: Vitest v5.0.3 projects/migration documentation (shared configs, nested projects and alias inheritance). The installed version remains 5.0.5; no packages or browser runtimes were upgraded. Unit isolation remains enabled because suites use independent mocks and environments. Performance assertions are deferred to actual complete runs; no test or assertion was removed to reduce duration.
