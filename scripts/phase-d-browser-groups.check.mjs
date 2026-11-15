import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, readFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stageGroup, verifyGroupSet, verifyGroupNeeds} from './phase-d-browser-groups.mjs';

const custody = {checkpoint: 'a'.repeat(40), tree: 'b'.repeat(40), sourceClean: true};
const namespaces = {
  attendance: ['nevora-phase-d-browser-evidence', 'nevora-phase-d-remediation-evidence'],
  corrections: ['nevora-d2-browser-evidence'],
  clocker: ['nevora-clocker-browser-evidence'],
};
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'phase-d-group-control-'));
  try {
    const groups = {};
    for (const [group, names] of Object.entries(namespaces)) {
      const source = join(root, group), output = join(root, group + '-staged');
      for (const name of names) {
        mkdirSync(join(source, name, 'owned-next-1'), {recursive: true});
        writeFileSync(join(source, name, 'report.json'), JSON.stringify({...custody, checks: ['passed'], errors: []}));
        writeFileSync(join(source, name, 'owned-next-1', 'ownership.json'), '{"closed":true}');
        writeFileSync(join(source, name, 'private.log'), 'must not be packaged');
      }
      stageGroup({group, source, output, custody});
      groups[group] = output;
    }
    run({root, groups});
  } finally { rmSync(root, {recursive: true, force: true}); }
}
const needs = {'phase-d-browser-suite': {result: 'success'}};
test('group aggregation preserves namespaces and the exact staged byte inventories', () => fixture(({groups, root}) => {
  const output = join(root, 'merged');
  const receipt = verifyGroupSet({groups, custody, needs, output});
  assert.equal(receipt.files.length, 8);
  for (const names of Object.values(namespaces)) for (const name of names) {
    assert.equal(readFileSync(join(output, name, 'owned-next-1', 'ownership.json'), 'utf8'), '{"closed":true}');
    assert(!receipt.files.some(file => file.path.endsWith('private.log')));
  }
}));
test('aggregate refuses missing, additional, failed, cancelled or skipped dependencies', () => {
  for (const result of ['failure', 'cancelled', 'skipped', 'neutral', undefined]) {
    assert.throws(() => verifyGroupNeeds(result ? {'phase-d-browser-suite': {result}} : {}));
  }
  assert.throws(() => verifyGroupNeeds({...needs, unexpected: {result: 'success'}}));
  fixture(({groups, root}) => {
    delete groups.clocker;
    assert.throws(() => verifyGroupSet({groups, custody, needs, output: join(root, 'merged')}));
  });
});
test('aggregate refuses stale source, altered bytes, extra files and missing files', () => {
  for (const mutation of ['source', 'bytes', 'extra', 'missing', 'namespace', 'traversal', 'duplicate']) {
    fixture(({groups, root}) => {
      const manifestPath = join(groups.clocker, 'group-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (mutation === 'source') manifest.checkpoint = 'c'.repeat(40);
      if (mutation === 'bytes') writeFileSync(join(groups.clocker, manifest.files[0].path), 'changed');
      if (mutation === 'extra') writeFileSync(join(groups.clocker, 'unexpected.json'), '{}');
      if (mutation === 'missing') rmSync(join(groups.clocker, manifest.files[0].path));
      if (mutation === 'namespace') manifest.files[0].path = 'foreign/report.json';
      if (mutation === 'traversal') manifest.files[0].path = '../report.json';
      if (mutation === 'duplicate') manifest.files.push(manifest.files[0]);
      writeFileSync(manifestPath, JSON.stringify(manifest));
      assert.throws(() => verifyGroupSet({groups, custody, needs, output: join(root, 'merged')}), mutation);
    });
  }
});
test('staging and aggregation reject selected symlinks and existing destinations', () => fixture(({groups, root}) => {
  rmSync(join(groups.clocker, 'nevora-clocker-browser-evidence/report.json'));
  symlinkSync(join(groups.corrections, 'nevora-d2-browser-evidence/report.json'), join(groups.clocker, 'nevora-clocker-browser-evidence/report.json'));
  assert.throws(() => verifyGroupSet({groups, custody, needs, output: join(root, 'merged')}));
  assert.throws(() => stageGroup({group: 'clocker', source: groups.clocker, output: join(root, 'staged'), custody}));
  assert.throws(() => stageGroup({group: 'corrections', source: groups.corrections, output: groups.corrections, custody}));
}));
test('failed or missing groups retain valid diagnostics while the aggregate still fails', () => {
 for (const failure of ['failed', 'missing', 'missing-report']) fixture(({groups, root}) => {
  const output=join(root,'failed-aggregate');
  let result=needs;
  if(failure==='failed')result={'phase-d-browser-suite':{result:'failure'}};
  if(failure==='missing')delete groups.clocker;
  if(failure==='missing-report'){
   rmSync(join(root,'clocker','nevora-clocker-browser-evidence/report.json'));
   rmSync(groups.clocker,{recursive:true});
   stageGroup({group:'clocker',source:join(root,'clocker'),output:groups.clocker,custody});
  }
  assert.throws(()=>verifyGroupSet({groups,custody,needs:result,output}),failure);
  assert(existsSync(join(output,'nevora-d2-browser-evidence/report.json')),failure+' lost correction diagnostics');
  assert(existsSync(join(output,'nevora-phase-d-remediation-evidence/report.json')),failure+' lost remediation diagnostics');
 });
});
