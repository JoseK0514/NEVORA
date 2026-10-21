import assert from 'node:assert/strict';

export function requireSafeEnvironment(env: NodeJS.ProcessEnv) {
  for (const name of ['DATABASE_URL', 'FUEL_TEST_DATABASE_URL', 'NEVORA_SETUP_DATABASE_URL']) {
    assert.ok(!env[name], `Unset ${name}; this rehearsal creates its own clusters and accepts no database URL.`);
  }
}

export function requireCandidate(value: string) {
  assert.match(value, /^[a-f0-9]{40}$/, 'An explicit, full candidate commit is required.');
  return value;
}

export function requireOwned(labels: Record<string, string>, marker: string) {
  assert.match(marker, /^[a-f0-9]{32}$/);
  assert.equal(labels['nevora.database-rehearsal'], marker, 'Container ownership changed; refusing mutation or cleanup.');
}

export function requireLocalPort(value: string) {
  const match = /^127\.0\.0\.1:([0-9]+)$/.exec(value.trim());
  assert.ok(match, 'Only an owned loopback PostgreSQL binding is allowed.');
  const port = Number(match[1]);
  assert.ok(port > 0 && port <= 65535);
  return port;
}

export function requireMigrationCoverage(files: string[], ordered: string[], held: string[]) {
  assert.equal(new Set(ordered).size, ordered.length, 'Duplicate migration in the declared plan.');
  assert.deepEqual([...ordered, ...held].sort(), [...files].sort(), 'Migration inventory changed; explicitly review the plan.');
}
