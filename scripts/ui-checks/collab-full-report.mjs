import assert from 'node:assert/strict';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = process.argv[2];
const read = async path => JSON.parse(await readFile(join(directory, path), 'utf8'));
const widths = [390, 1440];
const engines = ['chromium', 'webkit'];
const central = {
  A15: 'plans', A16: 'nevora-billing', A17: 'nevora-billing-return',
  A18: 'es-facturacion', A19: 'es-pago',
};
const routed = {
  F3: ['staff-list', 'staff-list-review', 'staff-list-receipt'],
  J18: ['workplace-billing-trial', 'workplace-billing-paused'],
  K15: ['clocker-paused'],
};
const separate = [...Object.keys(central), ...Object.keys(routed)].sort();

const runtime = await read('runtime.json');
const checkpoint = runtime.checkpoint;
assert.ok(runtime.production === true && /^[0-9a-f]{40}$/.test(checkpoint), 'Expected the production inventory runtime');
const inventories = await Promise.all([
  read('collab-inventory-results.json'),
  read('desktop/collab-inventory-results.json'),
]);
for (const inventory of inventories) {
  assert.equal(inventory.checkpoint, checkpoint);
  assert.deepEqual([...new Set(inventory.results.filter(row => row.observed === 'separate fixture').map(row => row.id))].sort(), separate);
}
assert.equal(inventories[0].inventoryRows, inventories[1].inventoryRows);
assert.deepEqual(inventories[0].sources, inventories[1].sources);

for (const suite of ['central-billing', 'step4-local']) {
  const cluster = await read(suite + '/owned-cluster.json');
  assert.equal(cluster.sourceSha, checkpoint);
  assert.ok(cluster.suite === suite && cluster.production && cluster.stopped && cluster.removed && cluster.exitCode === 0, suite);
}

const screenshots = Object.fromEntries(separate.map(id => [id, []]));
async function addScreenshot(id, path) {
  assert.ok((await stat(join(directory, path))).size > 0, path);
  screenshots[id].push(path);
}
const workspace = await read('step4-local/production-report.json');
assert.ok(workspace.sourceSha === checkpoint && workspace.production && workspace.complete, 'Routed workspace production report');
for (const engine of engines) {
  const billing = await read('central-billing/' + engine + '/report.json');
  assert.ok(billing.engine === engine && billing.production && billing.complete, engine + ' central billing production report');
  for (const [id, name] of Object.entries(central)) {
    for (const width of widths) await addScreenshot(id, 'central-billing/' + engine + '/' + name + '-' + width + '.png');
  }
  for (const [id, screens] of Object.entries(routed)) {
    for (const screen of screens) {
      for (const width of widths) {
        const filename = engine + '-' + screen + '-' + width + '.png';
        assert.ok(workspace.productionScreens.some(item =>
          item.engine === engine && item.screen === screen && item.width === width && item.screenshot === filename), filename);
        await addScreenshot(id, 'step4-local/' + filename);
      }
    }
  }
}

const { inventoryRows, sourcePages } = inventories[0];
const result = { checkpoint, production: true, inventoryRows, sourcePages, widths, separateFixtureScreenshots: screenshots };
await writeFile(join(directory, 'collab-full-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log('Collab production coverage', JSON.stringify({ checkpoint, inventoryRows, sourcePages, separateFixtureRows: separate.length }));
