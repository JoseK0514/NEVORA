import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// The subprocess boundary models pg_ctl reporting failure after creating its
// postmaster PID file. Actual entrypoint/finally logic runs on an owned fixture.
test('partial PostgreSQL startup invokes stop before removing owned data', () => {
  const bin = mkdtempSync(join(tmpdir(), 'nevora-pg-boundary-'));
  const trace = join(bin, 'trace');
  try {
    const body = `#!/bin/sh\ndata=\nwhile [ "$#" -gt 0 ]; do\n case "$1" in -D) shift; data="$1";; start) mkdir -p "$data"; touch "$data/postmaster.pid"; printf '%s\\n' "$data" >> ${JSON.stringify(trace)}; exit 1;; stop) test -f "$data/postmaster.pid" || exit 9; printf 'STOP\\n' >> ${JSON.stringify(trace)}; rm "$data/postmaster.pid"; exit 0;; esac\n shift\ndone\nexit 0\n`;
    for (const name of ['initdb', 'pg_ctl']) { writeFileSync(join(bin, name), body); chmodSync(join(bin, name), 0o700); }
    const result = spawnSync(process.execPath, [resolve('scripts/phase-c-release-postgres.mjs')], { env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR, NEVORA_TEST_PG_BIN: bin }, encoding: 'utf8' });
    assert.notEqual(result.status, 0, 'startup failure must remain a failure');
    const lines = readFileSync(trace, 'utf8').trim().split('\n');
    assert.equal(lines[1], 'STOP', 'partial startup requires explicit owned stop');
    assert.equal(existsSync(lines[0]), false, 'data removal follows successful stop');
  } finally { rmSync(bin, { recursive: true, force: true }); }
});
