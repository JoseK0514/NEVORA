import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseNativeArguments, nativeEnvironment, assertNativeCleanup, assertNativeProcess, captureNativeSource, assertNativeSource} from './native-owned.mjs';

const sha = 'a'.repeat(40);
const args = ['--mode', 'owned-local', '--expected-sha', sha, '--platform', 'contract'];
test('requires explicit local mode/source/platform and rejects ambiguous or device-unspecified work', () => {
  assert.deepEqual(parseNativeArguments(args), {mode:'owned-local', expectedSha:sha, platform:'contract', ownershipOnly:false});
  for (const values of [[], args.slice(2), ['--mode','production','--expected-sha',sha],
    ['--mode','owned-local','--expected-sha','wrong'], [...args,'--mode','owned-local'], [...args,'--unknown','x'],
    ['--mode','owned-local','--expected-sha',sha,'--platform','android'],
    ['--mode','owned-local','--expected-sha',sha,'--platform','ios']]) assert.throws(() => parseNativeArguments(values));
});
test('refuses inherited database selection, including remote/prod and unowned loopback', () => {
  for (const key of ['DATABASE_URL','NEVORA_APP_DATABASE_URL','NEVORA_WORKER_DATABASE_URL','NEVORA_SETUP_DATABASE_URL','FUEL_TEST_DATABASE_URL','NEVORA_OWNED_APP_DATABASE']) {
    for (const value of ['postgresql://fictional@production.example/private','postgresql://test@127.0.0.1:1234/existing'])
      assert.throws(() => nativeEnvironment({PATH:'/usr/bin',[key]:value}));
  }
});
test('children receive allowlisted tools and disabled providers, never ambient secrets or preloads', () => {
  const env = nativeEnvironment({PATH:'/usr/bin', HOME:'/fictional', NEVORA_TEST_PG_BIN:'/fictional/pg',
    OPENAI_API_KEY:'fictional-forbidden', DATABASE_PASSWORD:'fictional-forbidden', RESEND_API_KEY:'fictional-forbidden',
    NODE_OPTIONS:'--import untrusted.mjs', PGHOST:'remote.example', ANDROID_HOME:'/fictional/sdk'});
  assert.equal(env.PATH, '/usr/bin'); assert.equal(env.NEVORA_TEST_PG_BIN, '/fictional/pg');
  for (const key of ['OPENAI_API_KEY','DATABASE_PASSWORD','RESEND_API_KEY','NODE_OPTIONS','PGHOST']) assert.equal(env[key], undefined);
  assert.equal(env.PUSH_DELIVERY_ENABLED, 'false'); assert.equal(env.NEXT_TELEMETRY_DISABLED, '1');
});
test('cleanup requires the private canonical resource, matching marker and an external path', () => {
  const base=realpathSync(mkdtempSync(join(tmpdir(),'native-cleanup-test-'))), source=join(base,'source'); mkdirSync(source);
  const root=mkdtempSync(join(base,'nevora-native-owned-')), marker='b'.repeat(32);
  writeFileSync(join(root,'native-owner'),marker,{mode:0o600});
  try {
    assert.doesNotThrow(() => assertNativeCleanup({root,source,marker}));
    assert.throws(() => assertNativeCleanup({root,source,marker:'c'.repeat(32)}));
    assert.throws(() => assertNativeCleanup({root:source,source,marker}));
    const alias=join(base,'nevora-native-owned-alias'); symlinkSync(root,alias);
    assert.throws(() => assertNativeCleanup({root:alias,source,marker}));
  } finally { rmSync(base,{recursive:true,force:true}); }
});
test('a port/PID alone cannot authorize stopping a process', () => {
  const expected={pid:1234,port:5555,data:'/private/owned/data',started:123456,fingerprint:'d'.repeat(64),marker:'e'.repeat(32)};
  assert.doesNotThrow(() => assertNativeProcess(expected,{...expected}));
  for (const [key,value] of [['pid',2222],['port',5556],['data','/private/someone-else'],['started',123457],['fingerprint','f'.repeat(64)],['marker','0'.repeat(32)]])
    assert.throws(() => assertNativeProcess(expected,{...expected,[key]:value}));
  assert.throws(() => assertNativeProcess(expected,null));
});
test('mixed current-source bytes or a different SHA cannot produce acceptance', () => {
  const source=mkdtempSync(join(tmpdir(),'native-source-test-'));
  const git=(...values)=>execFileSync('git',values,{cwd:source,encoding:'utf8'}).trim();
  try {
    git('init','--quiet'); writeFileSync(join(source,'source.txt'),'original\n'); git('add','source.txt');
    git('-c','user.name=Native fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','fixture');
    const expected=git('rev-parse','HEAD'); const custody=captureNativeSource(source,expected);
    assert.doesNotThrow(()=>assertNativeSource(source,custody));
    assert.throws(()=>captureNativeSource(source,sha));
    writeFileSync(join(source,'source.txt'),'changed\n');
    assert.throws(()=>assertNativeSource(source,custody));
  } finally {rmSync(source,{recursive:true,force:true});}
});
