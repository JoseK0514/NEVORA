import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

for (const fail of [false, true]) test(`marker scan preserves the source-bound build when scan ${fail ? 'fails' : 'passes'}`, () => {
  const fixture = mkdtempSync(join(tmpdir(), 'nevora-marker-custody-'));
  try {
    mkdirSync(join(fixture, '.next'));
    writeFileSync(join(fixture, '.next', 'source-bound-artifact'), 'original-reviewed-build');
    writeFileSync(join(fixture, 'next-env.d.ts'), 'original-generated-types');
    mkdirSync(join(fixture, 'node_modules/next/dist/bin'), {recursive:true});
    // Only the child build is substituted. Exercise the actual scanner's backup,
    // marker checking, failure handling and cleanup in a disposable local fixture.
    writeFileSync(join(fixture, 'node_modules/next/dist/bin/next'), `
      const fs = require('node:fs');
      fs.mkdirSync('.next', {recursive:true});
      fs.writeFileSync('.next/scanned-build', ${JSON.stringify(fail ? 'nv-force-error' : 'synthetic-clean-build')});
      fs.writeFileSync('next-env.d.ts', 'temporary-build-types');
    `);
    const run = spawnSync(process.execPath, [resolve('scripts/verify-dev-production-absence.mjs')], {cwd:fixture, encoding:'utf8'});
    assert.equal(run.status, fail ? 1 : 0, run.stderr);
    assert.equal(readFileSync(join(fixture, '.next/source-bound-artifact'), 'utf8'), 'original-reviewed-build');
    assert.equal(readFileSync(join(fixture, 'next-env.d.ts'), 'utf8'), 'original-generated-types');
    assert.deepEqual(readdirSync(join(fixture, '.next')), ['source-bound-artifact']);
    assert(!readdirSync(fixture).some(name => name.startsWith('.nevora-production-absence-')));
  } finally {rmSync(fixture, {recursive:true, force:true});}
});
