# Phase F tenant foundation implementation checkpoint

Status: local implementation in progress, not F10 verified. Owner authority is F-DEV-COMPLETE-001 with F-P01–F-P13 approved exactly against PRD SHA-256 `35e4084c2c365777c78f0d1e2e65533b06758c1f3062cf1b10feb539af8bf7a7`. Production remains NO-GO.

## Implemented contracts

Immutable legacy internal employment IDs remain distinct from the new tenant-local employee-number namespace. `tenancy/identity.ts` retains the exact existing trim/uppercase number normalization and requires separately captured database email comparison keys; it cannot infer employment ownership from mutable location/contact fields. Existing names, timezones, hashes, keys and inactive/history rows are preserved.

`tenancy/types.ts` defines four opaque TenantProof variants and a separate ProvisionerScope. Only `resolve.server.ts` issues ordinary proofs using private WeakMap identity. Copies, serialized objects, proxies and shaped inputs are not authority. Named parameterized resolver seams require actual database metadata; missing, malformed, ambiguous, mismatched or expired metadata denies or reports unavailable. Facts preserve exact UTC database version text, including microseconds and decimal revisions beyond JavaScript safe integers. A resolver pre-read is never final authority.

`tenancy/query-contract.ts` supplies closed server-built statements. The implemented names are WORKSPACE_SNAPSHOT and PORTAL_EMPLOYMENT_SNAPSHOT, available only to genuine portal proofs. Statements/batches are privately registered and bound to the exact issuing proof object. There is no raw SQL or caller-selected workspace builder. Batches copy statement order; outputs are decoded and foreign/malformed result rows are rejected. Other domain builders are not implemented.

`tenancy/executor.server.ts` runs each query as a noninteractive transaction: direct runtime-role assertion; parameterized transaction-local workspace/kind/principal/incarnation settings; deterministic database lock/current-proof guard; business statements with explicit tenant predicates; final current-proof guard. NeonQueryPromises remain unawaited until one transaction submission. Guard wrappers force SQL rollback if a helper returns false/null. Only ordered business results are returned. Cancellation reaches fetch options, failures are generic and are not automatically replayed. Cancellation/absence of a response does not prove that a mutation rolled back.

Dedicated NEVORA_APP_DATABASE_URL and NEVORA_WORKER_DATABASE_URL select separate runtime transports; DATABASE_URL is not a fallback. Only immutable role transport configuration is cached, with no active tenant, proof or AsyncLocal substitute. Legacy getDb remains for currently unconverted application consumers. The current source does not enable multi-customer operation.

## Database helpers required for executor integration

The following exact named contracts are referenced, but NOT installed or database-verified at this checkpoint:

- `nevora_tenancy.assert_runtime_role(text)` must return true or raise in the same transaction. APP/WORKER are direct LOGIN principals, never schema owners, superusers, BYPASSRLS, administrative-role members or bootstrap SET ROLE sessions.
- `nevora_tenancy.lock_and_assert_current_proof(jsonb)` must lock the workspace and principal/domain identities in deterministic order, then compare current lifecycle/incarnation, exact versions, role/grants, bearer digest/expiry, location scope and kind-specific device/PIN/calendar/worker/lease/environment/configuration facts after waits.
- `nevora_tenancy.assert_current_proof(jsonb)` must enforce final applicable authority/source/version checks while the transaction retains those locks. A future valid self-demotion/deactivation command needs a narrow, named captured-authority/receipt contract; no general skip-final-guard option exists.

RLS requires USING and WITH CHECK plus explicit tenant predicates, matching composite references and least-privilege grants. Source arrays/JSON, functions/views/triggers, frozen historical references and new-write sidecars still require complete semantic coverage and actual role tests. Global credential/recovery/push-installation fences must stay global. A shared runtime compromised with arbitrary SQL remains a separately documented residual risk; a tenant setting alone cannot establish protection against that compromise.

## Evidence and remaining gates

Source-bound root evidence lives in the calling chat's `work/f-dev/root/{identity,foundation,executor}` directories and the copied output checkpoints. Frozen foundation correction passed411 focused tests; executor/F1 affected run passed167, with TypeScript and lint. Six SDK1.1.0 wire tests intercept ALL HTTP calls and establish serialization/result-index behavior only. They are not actual Neon, runtime-role, RLS, lock/race or application tenant-isolation evidence.

The 68-table source registry/backfill plan is privileged migration preparation. It requires complete inactive/history captures, immutable ancestry, exact source/schema/snapshot checksums, typed payload lineage, write fencing and deterministic resume reconciliation. Current source corrections and the expand migration are still under disjoint writer custody. No metadata assertion is a substitute for actual snapshot/catalog/trigger/constraint verification.

F10-A001–A012 remain open where evidence is missing. Existing auth/recovery/activation, scheduling locks, E1/E2/E3, Clocker, workers/cache, schema cutover and seed-free restore have not been converted at this checkpoint. Full actual installed Neon HTTP/runtime-role and simultaneous A/B verification must pass before dependent multi-customer capabilities integrate. Keychain arrangement is approved only for preparation/dummy testing; resource creation/use still requires all prerequisites and separate final execution authority. F11 physical/manual cells and all F12 source/race/recovery/migration/traceability obligations remain mandatory. Independent completed-project disposition is deferred under E-OPS-005, not waived.
