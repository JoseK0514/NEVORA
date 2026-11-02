import {test} from 'node:test';
import {stopNativePostgres,assertNativeResults,NATIVE_CONTRACT_CHECKS} from './native-owned.mjs';
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
test('a stalled disposable shutdown is bounded and reproves ownership before immediate shutdown', async () => {
  const lease={pid:1234,port:5555,data:'/private/owned/data',started:123456,fingerprint:'d'.repeat(64),marker:'e'.repeat(32)};
  const events=[];
  await stopNativePostgres({lease,observe:()=>{events.push('process');return {...lease};},verifyRoot:()=>events.push('root'),
    send:signal=>events.push(signal),waitForExit:async ms=>{events.push(ms);return ms===5000;}});
  assert.deepEqual(events,['root','process','SIGINT',15000,'root','process','SIGQUIT',5000]);
});
test('a changed process can never receive the immediate-shutdown fallback', async () => {
  const lease={pid:1234,port:5555,data:'/private/owned/data',started:123456,fingerprint:'d'.repeat(64),marker:'e'.repeat(32)};
  let observation=0;const signals=[];
  await assert.rejects(()=>stopNativePostgres({lease,observe:()=>({...lease,pid:++observation===1?1234:5678}),verifyRoot:()=>{},send:signal=>signals.push(signal),waitForExit:async()=>false}));
  assert.deepEqual(signals,['SIGINT']);
});
test('a large count or fixture run cannot stand in for named full-backend checks', () => {
  const expected={ownerId:'a'.repeat(32),checkpoint:'b'.repeat(40),platform:'android'};
  const report={...expected,status:'passed',ownershipClosed:true,checks:Array.from({length:30},(_,index)=>({name:'unrelated-'+index,status:'passed'}))};
  assert.throws(()=>assertNativeResults(report,expected));
  assert.throws(()=>assertNativeResults({...report,ownerId:'c'.repeat(32)},expected));
  assert.throws(()=>assertNativeResults({...report,ownershipClosed:false},expected));
  const valid={...report,devices:[{serial:'emulator-5558',webView:{accessibilityMode:'platform-default',runtimeFlagsSha256:null}}],checks:[...NATIVE_CONTRACT_CHECKS,'android-full-backend'].map(name=>({name,status:'passed'}))};
  assert.doesNotThrow(()=>assertNativeResults(valid,expected));
  assert.throws(()=>assertNativeResults({...valid,checks:valid.checks.map((value,index)=>index?value:{...value,status:'failed'})},expected));
  assert.throws(()=>assertNativeResults({...valid,checks:valid.checks.map(value=>value.name==='android-full-backend'?{...value,name:'android-transport-fixture'}:value)},expected));
  assert.throws(()=>assertNativeResults({...valid,devices:[{serial:'emulator-5558',webView:{accessibilityMode:'renderer-complete',runtimeFlagsSha256:'c'.repeat(64)}}]},expected));
  assert.throws(()=>assertNativeResults({...valid,devices:[]},expected));
});
test('ownership-only concurrency verification cannot be labeled as a device run', () => {
  assert.throws(()=>parseNativeArguments(['--mode','owned-local','--expected-sha',sha,'--ownership-only','--platform','android','--android-serial','emulator-5558']));
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
