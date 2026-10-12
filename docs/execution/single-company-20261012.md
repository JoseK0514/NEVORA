# Single-company delivery, 2026-10-12

## Approved scope

Jose directed: bypass Phase F, pause SaaS, deliver for one company quickly, and keep company information configurable. This is the current scope for this branch. Phase F is paused/bypassed, not accepted as complete. Historical Phase F artifacts and other working directories are preserved.

The development architecture already enforces one singleton workspace per database. Keep its normal employee authentication, role authorization, transactional session checks, scheduling, attendance and payroll features. Multiple locations and operational positions remain configured records within this one company. Multi-company switching, SaaS billing/signup, tenant onboarding and the F10 tenant A/B enrollment chain are deferred.

## Implementation

- Source: locally available `origin/development`, `b58496b84b21690f7be22474f7570da2d81af6c3`. Branch: `codex/single-company-20261012` in an isolated checkout.
- `scripts/setup-company.mts` and `scripts/company-setup.ts`: explicit selected database, validated company name/timezone/location/owner, atomic canonical 0001–0022 migration install, then generic configuration. Customer migration seeds exist only inside the uncommitted fresh-install transaction and are removed before commit. Existing public-schema objects cause refusal; no reset or conversion is provided.
- `scripts/bootstrap-owner.mjs`: generic operator bootstrap with explicit active primary location and eligibility, shared password hashing/input validation and transactional writes. No fixed customer/location IDs or employee prefix.
- `.env.example`: blank company and owner fields, separate setup target. Runtime company identity remains database-backed. NEVORA/VELANI product branding and legacy internal protocol identifiers remain product/compatibility identifiers, not customer configuration.
- First location requires Owner configuration for staffing, coverage and any positions. No staffing/qualification values are guessed during setup.
- `scripts/company-setup.test.ts` and `scripts/company-setup-qa.mjs`: input validation, real PostgreSQL setup, rerun refusal, rollback, concurrency, explicit owner location access and real application login/settings with fictional data.

## Operator use

Use existing approved stores or a private ignored `.env.local`. Company fields: `COMPANY_NAME`, `COMPANY_TIME_ZONE`, `COMPANY_LOCATION_NAME`, `COMPANY_LOCATION_SHORT_NAME`, `COMPANY_LOCATION_KEY`. Owner fields: `BOOTSTRAP_EMPLOYEE_ID`, `BOOTSTRAP_FIRST_NAME`, `BOOTSTRAP_LAST_NAME`, `BOOTSTRAP_PHONE`, `BOOTSTRAP_PASSWORD`, optional `BOOTSTRAP_EMAIL`.

Explicitly select `NEVORA_SETUP_ENVIRONMENT=development` or `production`, `NEVORA_SETUP_DATABASE_URL`, and matching `NEVORA_SETUP_DATABASE_NAME`. Setup never uses `DATABASE_URL` as a fallback. Production setup requires `sslmode=verify-full` and Jose's separate environment/production authorization.

```bash
node --env-file=.env.local --import tsx scripts/setup-company.mts
```

Use the emitted initial location ID when creating additional Owners with `BOOTSTRAP_PRIMARY_LOCATION_ID` and comma-separated `BOOTSTRAP_ELIGIBLE_LOCATION_IDS`. The primary location must be included. Existing IDs and missing/inactive locations are refused. Configure the initialized company's application `DATABASE_URL` separately and finish Owner Settings before scheduling.

## Verification and delivery state

Local implementation and verification are complete:

- `npm test`: 203 files passed; 2,131 tests passed. The first sandbox run passed 2,130 tests and failed the PostgreSQL runner because local port binding was prohibited. The approved execution outside that restriction passed all 2,131 without changing or weakening assertions.
- `npm run typecheck`: passed, including the new setup scripts. LSP was unavailable because its installation was previously declined; TypeScript compiler verification was used.
- `npm run lint`: passed.
- `npm run build`: passed with Next.js 16.3.8. The build warned about an unrelated parent-directory lockfile, which Next ignored; compilation and all route generation completed successfully.
- `npm run test:company:integration` with an existing PostgreSQL runtime and existing Playwright package: nine checks passed. Actual CLI install and hashed password verification; existing-schema refusal and singleton enforcement; selected-location-only owner access and missing/inactive location rejection; schema/data rollback after a late failure; successful retry with another company/timezone; concurrent setup admits exactly one caller; real wrong-password rejection and owner login/settings at 390px and 1440px. Keyboard focus, horizontal overflow and JavaScript page errors were checked. The ownership-marked cluster was stopped and removed.
- `git diff --check`: passed.

Browser/SQL evidence: `/Users/josek0514/.codex/visualizations/2026/10/12/01a12fb9-799d-71f3-add3-07ac8e708d53/single-company/verification.json`, `company-settings-390.png`, `company-settings-1440.png`, and the owned-app source/transport manifest. The browser ran the real Next application and canonical PostgreSQL schema with the established test-only PostgreSQL transport. Hosted Neon HTTP transport and production deployment were not tested. Test data is fictional and local; no existing customer data, production credentials, messages, orders or deployments were used.

The branch is local and has not been pushed, merged into development/main, or deployed. Next operational step: select the actual company configuration and approved target environment, then initialize and verify that hosted instance through the operator instructions above. Production activation remains a separate authorization.

Implementation owner: this Codex task. Product position: one configured company. Engineering position: retain the development singleton architecture and canonical schema. Security position: retain role/session controls and use an explicit operator target. Governance release impact: CONDITION, pending deployment environment selection and hosted acceptance. No independent audit closure or Phase F completion is claimed.
