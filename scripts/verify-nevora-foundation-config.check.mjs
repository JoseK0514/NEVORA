import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loopbackOrigin, matrixPlan, assertComplete, validateOutput } from './verify-nevora-foundation-config.mjs';

test('only explicit bare local HTTP origins; no credentials, paths, queries or remote targets', () => {
  assert.equal(loopbackOrigin('http://127.0.0.1:4281'), 'http://127.0.0.1:4281');
  for (const value of ['', 'https://example.com', 'http://127.0.0.1:4281/app', 'http://user@localhost:4', 'http://localhost:4/?x=1', 'http://localhost:4/#x', 'https://localhost:4']) assert.throws(() => loopbackOrigin(value), /loopback/);
});
test('all mandatory engine/width/customer matrices reject missing or duplicated cases', () => {
  const plan = matrixPlan();
  assert.equal(plan.protected.length, 456);
  assert.equal(plan.generic.length, 448);
  assert.equal(plan.setup.length, 56);
  const complete = Object.fromEntries(Object.entries(plan).map(([key, cases]) => [key, cases.map(id => ({ id, passed: true }))]));
  assertComplete(complete, plan);
  for (const key of Object.keys(plan)) {
    assert.throws(() => assertComplete({ ...complete, [key]: complete[key].slice(1) }, plan));
    assert.throws(() => assertComplete({ ...complete, [key]: [...complete[key].slice(1), complete[key][1]] }, plan));
    assert.throws(() => assertComplete({ ...complete, [key]: complete[key].map((r, i) => ({ ...r, passed: i !== 0 })) }, plan));
  }
});
test('evidence output remains outside repository including symlink and new descendant paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nevora-qa-guard-'));
  try {
    const repo = join(root, 'repo'); await mkdir(repo); await symlink(repo, join(root, 'alias'));
    for (const output of ['', 'relative', repo, join(repo, 'new'), join(root, 'alias', 'new', 'evidence')]) await assert.rejects(validateOutput(output, repo), /external/);
    await validateOutput(join(root, 'evidence'), repo);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('review decisions cannot bless stale pixels, absent provenance, runtime errors or duplicate IDs', async () => {
  const { applyReviewedComparisons } = await import('./verify-nevora-foundation-config.mjs');
  const plan = matrixPlan();
  const complete = () => ({ errors: [], ...Object.fromEntries(Object.entries(plan).map(([key, cases]) => [key, cases.map(id => ({ id, passed: true }))])) });
  const data = () => { const r = complete(); Object.assign(r.protected[0], { passed: false, before: { sha256: 'before' }, after: { sha256: 'after' }, freshBaselineMatches: true }); return r; };
  const decision = { id: plan.protected[0], beforeSha256: 'before', afterSha256: 'after', reason: 'Reviewed exact configured workspace text replacement.' };
  assert.equal(applyReviewedComparisons(data(), [decision]).protected[0].passed, true);
  for (const choices of [[], [decision, decision], [{ ...decision, afterSha256: 'stale' }], [{ ...decision, beforeSha256: 'stale' }], [{ ...decision, reason: 'OK' }]]) assert.throws(() => applyReviewedComparisons(data(), choices));
  const noBaseline = data(); noBaseline.protected[0].freshBaselineMatches = false; assert.throws(() => applyReviewedComparisons(noBaseline, [decision]));
  const errors = data(); errors.errors.push('Runtime failure'); assert.throws(() => applyReviewedComparisons(errors, [decision]));
});

test('native empty-date exception is narrowly bound to all three images and unchanged fresh source pairs', async () => {
 const {applyReviewedComparisons}=await import('./verify-nevora-foundation-config.mjs');
 const plan=matrixPlan(), id='webkit|employee|/app/requests|320';
 const data=()=>{const r={errors:[],...Object.fromEntries(Object.entries(plan).map(([key,ids])=>[key,ids.map(id=>({id,passed:true}))]))};Object.assign(r.protected.find(r=>r.id===id),{passed:false,engine:'webkit',path:'/app/requests',role:'employee',freshBaselineMatches:false,immutableBaselineHash:'original',before:{sha256:'pair'},after:{sha256:'pair'},pixelsEqual:true,geometryEqual:true,textEqual:true});return r;};
 const decision={id,kind:'native-empty-date-placeholder',immutableSha256:'original',beforeSha256:'pair',afterSha256:'pair',allChangesInsideEmptyDateInputs:true,fields:[{value:''},{value:''}],currentValues:['',''],changedPixels:20,reason:'Explicit native empty date placeholder three-image pixel review.'};
 assert.equal(applyReviewedComparisons(data(),[decision]).protected.find(r=>r.id===id).passed,true);
 for(const patch of [{immutableSha256:'stale'},{kind:'broad'},{allChangesInsideEmptyDateInputs:false},{fields:[{value:'2026-10-04'},{value:''}]},{changedPixels:0},{currentValues:['2026-10-04','']}])assert.throws(()=>applyReviewedComparisons(data(),[{...decision,...patch}]));
 for(const patch of [{engine:'chromium'},{path:'/app/schedule'},{role:'manager'},{geometryEqual:false},{textEqual:false},{after:{sha256:'changed'}}]){const r=data();Object.assign(r.protected.find(r=>r.id===id),patch);assert.throws(()=>applyReviewedComparisons(r,[decision]));}
});

test('route identity rejects a redirected page or unrelated body before capture', async () => {
 const {assertRouteIdentity}=await import('./verify-nevora-foundation-config.mjs');
 const requested='http://127.0.0.1:4281/app/exchange?lead';
 assert.doesNotThrow(()=>assertRouteIdentity(requested,requested,'Shift Requests'));
 assert.throws(()=>assertRouteIdentity(requested,'http://127.0.0.1:4281/app?lead','Welcome, Sam.'),/route/);
 assert.throws(()=>assertRouteIdentity(requested,requested,'Welcome, Sam.'),/heading/);
});

test('route identity preserves role and scenario query values while allowing parameter order', async () => {
  const { assertRouteIdentity } = await import('./verify-nevora-foundation-config.mjs');
  const requested = 'http://127.0.0.1:4285/app/schedule?manager&natural&two';
  assert.doesNotThrow(() => assertRouteIdentity(requested, 'http://127.0.0.1:4285/app/schedule?two&manager&natural', 'Weekly schedule'));
  for (const query of ['manager&natural', 'owner&natural&two', 'manager&wide&two', 'manager&natural&twenty', 'manager&natural&two&empty']) {
    assert.throws(() => assertRouteIdentity(requested, `http://127.0.0.1:4285/app/schedule?${query}`, 'Weekly schedule'), /query/);
  }
});

test('Schedule fitting rejects omitted week peers and actual label/week intersections', async () => {
  const { assertScheduleLocationFit } = await import('./verify-nevora-foundation-config.mjs');
  const clear = {
    locationTextBounds: [],
    locationActionOverlap: false,
    locationPeerRegions: ['Schedule week', 'Templates', 'More', '+ Add shift'],
    locationPeerOverlaps: [],
  };
  assertScheduleLocationFit(clear);
  assert.throws(() => assertScheduleLocationFit({
    ...clear,
    locationPeerOverlaps: [{ label: 'WWWWWWWWWWWWWWWW', peer: 'Schedule week', width: 150.234375 }],
  }), /toolbar/);
  assert.throws(() => assertScheduleLocationFit({ ...clear, locationPeerRegions: ['Templates', 'More', '+ Add shift'] }), /week/);
});
