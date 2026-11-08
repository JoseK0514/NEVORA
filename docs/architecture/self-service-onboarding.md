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

Provisioning implementation checkpoint (2026-11-08): control0003 journals verified-actor reservations, immutable source/policy/command custody, private provisioner leases and separate create-attempt acknowledgements. Policy versions become verified only when the email proof is claimed; an unclaimed public re-request cannot advance verified consent. New resources require isolated routing and a separate provisioner control principal on the same control database. Existing single-company deployments retain their mode and target; never flip their deployment to isolated as a shortcut.

The API artifact includes an ordered SQL-checksum manifest generated explicitly by `node scripts/onboarding-manifest.mjs --write`; check mode never writes. A worker compares the reserved hash, artifact and actual files before creating a resource. New databases/logins/resource names use control-issued UUID/HMAC identities, never customer SQL identifiers. Fresh bootstrap proves an empty public schema, applies canonical base/final migrations atomically, creates an inactive initial OWNER with no credentials, installs restricted APP/WORKER principals, and writes an immutable exact-resource receipt. Recovery verifies that receipt, current database/principal, anchor/incarnation and pending Owner; it never resets a password or an existing company.

Neon REST v2 has no documented create-time idempotency parameter or annotations field in the reviewed schema. The adapter uses an authenticated generated name and approved organization/region, then verifies the exact root branch, endpoint, database owner and creation window. Its first create-method network request is the journaled POST; successful creation followed by a failed metadata read remains unknown. A pending/unknown create intent is reconciled, never blindly POSTed again. Only an explicit429 rejection permits bounded retry. Missing transient metadata defers; foreign/ambiguous identity quarantines. No database is dropped as compensation.

`onboarding:worker` is one bounded invocation, disabled by default, using `NEVORA_PROVISIONER_WORKER_ENABLED`, a distinct `NEVORA_PROVISIONER_CONTROL_DATABASE_URL`, a private API key and `NEVORA_PROVISIONER_RESOURCE_POLICY`. That JSON must match the configured account/region/policy version and specify positive compute/transfer/storage quotas, bounded compute/autosuspend and nonzero history. Project-count and provider-unit quotas are not a verified dollar-spend guarantee. Actual entitlement, costs, roles, domain, region, sender and restore evidence remain hosted-enablement gates. No real provider request or real email was used for this implementation's tests.

Primary API reference consulted: https://api-docs.neon.tech/reference/createproject and the official neondatabase/neon-api-python REST v2 schema. The downloaded reference is retained with execution artifacts; no provider response or secret is copied into public receipts.

Task5 adds control0004 grant requests and company0049 activation functions. The web principal can queue/read an encrypted request but holds no provisioner URL. The disabled separate worker issues company grants through its private credential, then publishes READY. Claims bind registered origin/environment/workspace/incarnation, verified email fingerprint, employee revision and initial-Owner grant revision. After real scrypt, locks and live authority repeat before credential/consume/receipt commit. Fixed search_path is pg_catalog,public,pg_temp for existing canonical triggers; runtime schema CREATE and TEMP remain revoked. Company anchor activates before registry publication, failing closed across the two-store gap. A durable matching activation receipt is mandatory. No credential reset or automatic session minting occurs during recovery.

Task6 canonical setup composes the existing workspace/catalog/staffing/coverage mutation transaction with onboarding version/receipt statements. Its explicit writer selector leaves authorization-only preflight transactions untouched. A receipt failure rolls back the canonical change; common expectedVersion serializes two tabs, while changed replay conflicts. State reads use one canonical JSON SQL snapshot behind current Owner guards. Readiness reuses evaluateLocationReadiness and current rows, with no duplicate business-settings store. Optional module review/configuration continues through existing settings commands and remains independent of core readiness.
