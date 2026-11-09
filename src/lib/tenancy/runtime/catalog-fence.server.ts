import 'server-only';

export type CatalogFenceSqlPlan<Mode extends 'RUNTIME_SHARED' | 'INSTALLER_EXCLUSIVE'> = Readonly<{
  mode: Mode;
  text: string;
  values: readonly [];
}>;

// Both plans derive the same native bigint key from the fixed protocol domain
// and current database OID. SHA-256/UTF8 is independent of session collation,
// search path, database name spelling and JS numeric precision. A truncated-key
// collision only serializes unrelated work; no identity/authority uses the hash.
// Qualified operators also prevent an unguarded caller search path from selecting
// a user operator while acquiring the fence before its first role/helper check.
const CATALOG_FENCE_KEY_SQL = `WITH catalog_fence_key AS MATERIALIZED (
  SELECT (
    'x'::pg_catalog.text OPERATOR(pg_catalog.||) pg_catalog.substr(
      pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
        'nevora.runtime.catalog-fence.v1:'::pg_catalog.text OPERATOR(pg_catalog.||) database_identity.oid::pg_catalog.text,
        'UTF8'::pg_catalog.name)), 'hex'::pg_catalog.text), 1, 16)
  )::pg_catalog.bit(64)::pg_catalog.int8 AS key
  FROM pg_catalog.pg_database AS database_identity
  WHERE database_identity.datname OPERATOR(pg_catalog.=) pg_catalog.current_database()
)`;
const NO_VALUES: readonly [] = Object.freeze([] as const);

// Execute as the first statement of the owning transaction, before any runtime
// role/helper call; retain through the final role/source check and transaction
// end. Autocommit use releases the lock with this statement and is insufficient.
// A blocked acquire must be followed by fresh catalog observations: this module
// neither selects transaction isolation nor validates a preexisting MVCC snapshot.
export const RUNTIME_CATALOG_SHARED_FENCE_SQL: CatalogFenceSqlPlan<'RUNTIME_SHARED'> = Object.freeze({
  mode: 'RUNTIME_SHARED',
  text: `${CATALOG_FENCE_KEY_SQL}\nSELECT pg_catalog.pg_advisory_xact_lock_shared(key) AS catalog_fence FROM catalog_fence_key;`,
  values: NO_VALUES,
});

// Every cooperating privileged registry/function/owner/ACL/route writer must
// acquire this before DDL or other object locks, retain it through reviewed
// version/current-catalog validation and COMMIT/ROLLBACK. Do not upgrade a shared
// hold to exclusive or acquire this after source/catalog locks. Installer identity,
// grants, source review and adoption by all writers are separate prerequisites.
// Cluster-wide role/membership/ownership writers must hold this in every affected
// runtime database. A hold in a maintenance database does not fence another one;
// coordinating those writers across databases remains an integration obligation.
export const INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL: CatalogFenceSqlPlan<'INSTALLER_EXCLUSIVE'> = Object.freeze({
  mode: 'INSTALLER_EXCLUSIVE',
  text: `${CATALOG_FENCE_KEY_SQL}\nSELECT pg_catalog.pg_advisory_xact_lock(key) AS catalog_fence FROM catalog_fence_key;`,
  values: NO_VALUES,
});

// These inert plans open no connection/transaction, change no role, install no
// object and authenticate no installer. Advisory locks cannot constrain a writer
// that ignores the protocol or a malicious superuser. Runtime/installer adoption,
// native lock ordering/concurrency/rollback, PG17/Neon and full F10 remain OPEN.
