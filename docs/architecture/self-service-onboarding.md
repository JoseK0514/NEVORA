# Self-service onboarding backend

Implementation baseline: e2872f30ea8548b1310ea4a9b25813352decf82a. Approved scope: SCRUM-166; backend Codex, UI Claude. This document records implementation state, not production readiness.

The approved design is in ../superpowers/specs/2026-11-07-self-service-owner-onboarding-design.md and the task ledger is .superpowers/sdd/2026-11-07-self-service-owner-onboarding/progress.md.

## Boundaries

- The control database stores verified signup, operation receipts and workspace routing; business records remain in separate one-company databases.
- Public registration returns the same verification-request response without disclosing existing signup/company membership.
- Configuration defaults disabled and no provider project creation is allowed without a positive explicit resource ceiling and account/policy custody.
- Registration command schemas and protected command envelopes reject client roles, database selectors and extra authority fields.
- An issued workspace database binding selects a transport. Existing current credential/session/role/transaction checks still authorize the business action.
- The existing shared-database tenant foundation and held migrations are not activated by this feature.

## Current implementation

Task0 introduces version1 contract/configuration validators. Task1 adds a separate control schema, verified-email registration, encrypted short-lived delivery/claim custody, actor-bound signup sessions, final transaction authority guards and registration/config/verification routes. docs/handoffs/onboarding-entrypoint-inventory.json remains the initial routing audit: production business entries are unconverted until Task2/3 implementation and evidence classify them. Do not enable multi-company mode from the presence of registration files.

Test data uses example.invalid names, fake delivery, loopback PostgreSQL and simulated provider operations. No production database credentials are copied into this worktree.

## Required runtime settings

NEVORA_ONBOARDING_ENABLED is false by default. Enabled logic requires an explicit test/development/production environment, signup origin, portal base domain, dedicated control database, three distinct32-byte base64url keys, retention days, verification platform limit, region and operating owner reference. Provider execution is separately disabled; enabling it also requires an account reference, policy version and a positive approved daily project limit. Production control connections require verify-full TLS and cannot target loopback.

Keys and connection strings are server configuration, never UI fixtures/DTOs. Setup defaults: verification30minutes; pre-business signup session24hours; bootstrap15minutes; resend cooldown60seconds; verification5sends per email/IP per15minutes plus the configured platform cap. Existing employee invitation validity/limits stay unchanged.

## Release state

Local contracts/configuration and control-database registration are implementation increments. Request isolation, provisioning, Owner activation, canonical setup, people, invitation orchestration, integrated UI and hosted operating acceptance are subsequent plan tasks. Their readiness must be evidenced individually. Signup configuration additionally requires reviewed NEVORA_ONBOARDING_TERMS_VERSION and NEVORA_ONBOARDING_PRIVACY_VERSION matching the actual served legal documents; fixture versions are not production policy approval.

Implementation checkpoint — registered routing (2026-11-07): `NEVORA_WORKSPACE_MODE=isolated` disables cached legacy transports before use. A server-only registry resolver privately issues immutable routing custody. `applicationSql` and the shared executor run real Neon HTTP transactions with a company identity lock, restricted-login and company guard before the business statements, and the same guard before commit. Runtime principals cannot own relations, routines, schemas or databases, inherit roles, or have elevated PostgreSQL flags. Existing actor/session/lease checks remain business authority. Explicit callback context carries routing only; React caches are request-render scoped. A registry or secret failure never selects a default company. Signup enablement and routing enablement are separate controls, so stopping new registrations does not disable established workspace resolution. Authentication/public-proof/worker entrypoints remain Task3 obligations in the inventory.

Local isolation evidence uses actual separate disposable PostgreSQL17 databases behind the installed Neon HTTP protocol. It does not establish hosted Neon role/transport behavior.
