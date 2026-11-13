import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { readMigrationPlan } from './migration-plan.mts';

const base = ['0001_initial.sql', '0002_schedule_health.sql', '0023_employee_attention_receipts.sql', '0023_template_ownership.sql'];
const final = ['0031_native_payroll.sql', '0032_company_access_invitations.sql', '0042_company_invitation_lifetime.sql'];
const sharedFinal = [...final, '0062_conversations.sql'];
const held = ['0026_tenant_ownership_expand.sql', '0027_tenant_ownership_validate.sql'];
const list = (files: string[]) => JSON.stringify(files);
function fixture(manifest = false) {
  const root = mkdtempSync(join(tmpdir(), 'nevora-migration-plan-'));
  const write = (path: string, text: string) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
  const declarations = `export const BASE_MIGRATIONS=${list(base)} as const;\nexport const FINAL_MIGRATIONS=${list(final)} as const;\nexport const HELD_MIGRATIONS=${list(held)} as const;`;
  const installer = `${manifest ? "import {BASE_MIGRATIONS,FINAL_MIGRATIONS} from '../db/migrations/order';" : ''}
    export async function setupCompany(){
      const migrations=await Promise.all(${manifest ? 'BASE_MIGRATIONS' : list(base.map(file => file.slice(0, -4)))}.map(async name=>name));
      const currentMigrations=await Promise.all(${manifest ? 'FINAL_MIGRATIONS' : list(final.map(file => file.slice(0, -4)))}.map(async name=>name));
    }`;
  write('scripts/company-setup.ts', installer);
  write('src/test/integration/local-postgres.ts', `export const CURRENT_MIGRATIONS=${list(base)} as const;`);
  for (const file of [...base, ...final, ...held]) write('db/migrations/' + file, '-- fictional schema inventory only');
  if (manifest) write('db/migrations/order.ts', declarations);
  return { root, write, installer, declarations, dispose: () => rmSync(root, { recursive: true, force: true }) };
}
function sharedFixture() {
  const f = fixture(true);
  f.write('db/migrations/order.ts', f.declarations.replace(list(final), list(sharedFinal)));
  f.write('db/migrations/0062_conversations.sql', '-- fictional schema inventory only');
  const installer = `import {canonicalCompanyManifest,installCompanyBase,installCompanyFinal} from '../src/lib/company-bootstrap/server';
    export async function setupCompany(client,input){return setupCompanyWithCredential(client,input,await hashPassword(input.owner.password));}
    export async function setupCompanyWithCredential(client,input,passwordHash){
      const manifest=await canonicalCompanyManifest();
      try {await installCompanyBase(client,manifest,input);await installCompanyFinal(client,manifest);} finally {}
    }`;
  const bootstrap = `import {BASE_MIGRATIONS,FINAL_MIGRATIONS} from '../../../db/migrations/order';
    export async function canonicalCompanyManifest(){
      const load=async(file)=>file;
      const base=await Promise.all(BASE_MIGRATIONS.map(load)),final=await Promise.all(FINAL_MIGRATIONS.map(load));
      return {base,final,hash:'fictional'};
    }
    export async function installCompanyBase(client,manifest){for(const migration of manifest.base)await client.query(migration.body);}
    export async function installCompanyFinal(client,manifest){for(const migration of manifest.final)await client.query(migration.body);}`;
  f.write('scripts/company-setup.ts', installer);
  f.write('src/lib/company-bootstrap/server.ts', bootstrap);
  return {...f, installer, bootstrap};
}
test('follows the shared bootstrap and hashes its source without executing it', () => {
  const f = sharedFixture();
  try {
    f.write('src/lib/company-bootstrap/server.ts', `throw Error('must never execute');\n${f.bootstrap}`);
    const plan = readMigrationPlan(f.root);
    assert.deepEqual(plan.current, [...base, ...sharedFinal]);
    assert.equal(plan.inputs.length, 4);
    assert.ok(plan.inputs.some(input => input.path === 'src/lib/company-bootstrap/server.ts'));
  } finally { f.dispose(); }
});
test('refuses shared-bootstrap delegation, import, argument and installation-order drift', () => {
  for (const installer of [
    (s: string) => s.replace('return setupCompanyWithCredential(client,input,', 'return setupCompanyWithCredential(other,input,'),
    (s: string) => s.replace('../src/lib/company-bootstrap/server', '../fictional-bootstrap'),
    (s: string) => s.replace('installCompanyBase(client,manifest,input)', 'installCompanyBase(client,other,input)'),
    (s: string) => s.replace('await installCompanyBase(client,manifest,input);await installCompanyFinal(client,manifest);',
      'await installCompanyFinal(client,manifest);await installCompanyBase(client,manifest,input);'),
  ]) {
    const f = sharedFixture();
    try { f.write('scripts/company-setup.ts', installer(f.installer)); assert.throws(() => readMigrationPlan(f.root), /bootstrap|import|manifest|inputs/); }
    finally { f.dispose(); }
  }
});
test('refuses shared-bootstrap manifest loading, return and consumption drift', () => {
  for (const bootstrap of [
    (s: string) => s.replace('../../../db/migrations/order', '../../../fictional-order'),
    (s: string) => s.replace('BASE_MIGRATIONS.map(load)', 'FINAL_MIGRATIONS.map(load)'),
    (s: string) => s.replace('return {base,final,', 'return {base:final,final:base,'),
    (s: string) => s.replace('of manifest.base', 'of manifest.final'),
  ]) {
    const f = sharedFixture();
    try { f.write('src/lib/company-bootstrap/server.ts', bootstrap(f.bootstrap)); assert.throws(() => readMigrationPlan(f.root), /import|manifest|consumption/); }
    finally { f.dispose(); }
  }
});
for (const manifest of [false, true]) test(`reads ${manifest ? 'canonical manifest' : 'legacy installer'} without sorting duplicate numeric prefixes`, () => {
  const f = fixture(manifest);
  try {
    const plan = readMigrationPlan(f.root);
    assert.equal(plan.source, manifest ? 'manifest' : 'legacy-installer');
    assert.deepEqual(plan.current, [...base, ...final]);
    assert.deepEqual(plan.held, held);
    assert.equal(plan.inputs.length, manifest ? 3 : 2);
    assert.ok(plan.inputs.every(input => /^[a-f0-9]{64}$/.test(input.sha256)));
  } finally { f.dispose(); }
});
test('rejects an unclassified migration instead of silently omitting it', () => {
  const f = fixture(true);
  try { f.write('db/migrations/0035_passkeys.sql', '-- fictional'); assert.throws(() => readMigrationPlan(f.root), /inventory changed/); }
  finally { f.dispose(); }
});
test('rejects adapter/manifest ordering drift', () => {
  const f = fixture(true);
  try { f.write('src/test/integration/local-postgres.ts', `const CURRENT_MIGRATIONS=${list([...base].reverse())} as const;`); assert.throws(() => readMigrationPlan(f.root), /disagree/); }
  finally { f.dispose(); }
});
test('rejects a present manifest that the installer does not consume', () => {
  const f = fixture(false);
  try { f.write('db/migrations/order.ts', f.declarations); assert.throws(() => readMigrationPlan(f.root), /must consume/); }
  finally { f.dispose(); }
});
test('rejects a manifest imported from a different module', () => {
  const f = fixture(true);
  try { f.write('scripts/company-setup.ts', f.installer.replace('../db/migrations/order', '../fictional-other-order')); assert.throws(() => readMigrationPlan(f.root), /must import/); }
  finally { f.dispose(); }
});
test('rejects executable and spread declarations without evaluating them', () => {
  for (const expression of ['(() => { throw new Error("must never execute"); })()', '[...OTHER_MIGRATIONS]']) {
    const f = fixture(true);
    try { f.write('db/migrations/order.ts', f.declarations.replace(list(base), expression)); assert.throws(() => readMigrationPlan(f.root), /literal/); }
    finally { f.dispose(); }
  }
});
test('rejects reordered final adoption and activation of held tenancy', () => {
  for (const text of [list([...final].reverse()), list([...final, held[0]])]) {
    const f = fixture(true);
    try { f.write('db/migrations/order.ts', f.declarations.replace(list(final), text)); assert.throws(() => readMigrationPlan(f.root), /final/); }
    finally { f.dispose(); }
  }
});
test('rejects unsafe migration paths and duplicate files', () => {
  for (const files of [['../../outside.sql'], [...base, base[0]]]) {
    const f = fixture(true);
    try {
      f.write('db/migrations/order.ts', f.declarations.replace(list(base), list(files)));
      f.write('src/test/integration/local-postgres.ts', `const CURRENT_MIGRATIONS=${list(files)} as const;`);
      assert.throws(() => readMigrationPlan(f.root), /basenames|Duplicate migration/);
    } finally { f.dispose(); }
  }
});
test('reads this checkout actual installer/adapter/inventory', () => {
  const plan = readMigrationPlan(process.cwd());
  assert.equal(plan.current[0], '0001_initial.sql');
  assert.deepEqual(plan.final, sharedFinal);
  assert.ok(plan.current.includes('0018_timecards.sql'));
  assert.ok(!plan.current.some(file => held.includes(file)));
});
test('plans only missing full filenames when an upgraded database already has the final adoption chain', () => {
  const current=readMigrationPlan(process.cwd()).current;
  const supplemental=['0038_read_path_indexes.sql','0039_native_payroll_setup_records.sql'];
  const previous=current.filter(file=>!supplemental.includes(file));
  assert.deepEqual(readMigrationPlan(process.cwd(),previous).missing,supplemental);
  assert.deepEqual(readMigrationPlan(process.cwd(),current).missing,[]);
});
test('stops unknown, prefix-only, duplicate and historical renamed ledger entries before upgrade planning', () => {
  for(const applied of [['0038'],['0038_native_payroll_setup_records.sql'],['0026_tenant_ownership_expand.sql'],['0001_initial.sql','0001_initial.sql']]){
    assert.throws(()=>readMigrationPlan(process.cwd(),applied),/ledger/);
  }
});
