import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireSafeEnvironment, requireCandidate, requireOwned, requireLocalPort, requireMigrationCoverage } from './guards.mts';

test('rejects every inherited application/test/setup database selector', () => {
  for (const name of ['DATABASE_URL', 'FUEL_TEST_DATABASE_URL', 'NEVORA_SETUP_DATABASE_URL']) {
    assert.throws(() => requireSafeEnvironment({ [name]: 'postgresql://fictional.invalid/never-connect' }));
  }
  requireSafeEnvironment({});
});
test('requires a full immutable candidate identity', () => {
  for (const value of ['main', 'development', 'HEAD', '1234567']) assert.throws(() => requireCandidate(value));
  assert.equal(requireCandidate('a'.repeat(40)), 'a'.repeat(40));
});
test('only accepts owned container labels', () => {
  const marker = 'a'.repeat(32);
  requireOwned({ 'nevora.database-rehearsal': marker }, marker);
  assert.throws(() => requireOwned({}, marker));
  assert.throws(() => requireOwned({ 'nevora.database-rehearsal': 'b'.repeat(32) }, marker));
});
test('rejects remote and wildcard PostgreSQL bindings', () => {
  assert.equal(requireLocalPort('127.0.0.1:54321\n'), 54321);
  for (const value of ['0.0.0.0:5432', 'example.invalid:5432', '[::]:5432', '127.0.0.1:0', '127.0.0.1:65536']) {
    assert.throws(() => requireLocalPort(value));
  }
});
test('cannot silently omit newly added or duplicated migration files', () => {
  requireMigrationCoverage(['a.sql', 'held.sql'], ['a.sql'], ['held.sql']);
  assert.throws(() => requireMigrationCoverage(['a.sql', 'new.sql'], ['a.sql'], []));
  assert.throws(() => requireMigrationCoverage(['a.sql'], ['a.sql', 'a.sql'], []));
});
