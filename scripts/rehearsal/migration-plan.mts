import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import {missingMigrationFiles} from '../../src/lib/migration-order.ts';
import { requireMigrationCoverage } from './guards.mts';

const heldContract = ['0026_tenant_ownership_expand.sql', '0027_tenant_ownership_validate.sql'];
const finalContract = ['0031_native_payroll.sql', '0032_company_access_invitations.sql', '0042_company_invitation_lifetime.sql'];
const installerPath = 'scripts/company-setup.ts';
const adapterPath = 'src/test/integration/local-postgres.ts';
const manifestPath = 'db/migrations/order.ts';

function parse(path: string, text: string) {
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}
function unwrap(node: ts.Expression): ts.Expression {
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node)) node = node.expression;
  return node;
}
function declaration(statements: ts.NodeArray<ts.Statement>, name: string) {
  const found = statements.flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [])
    .filter(node => ts.isIdentifier(node.name) && node.name.text === name);
  assert.equal(found.length, 1, `Review the single ${name} migration declaration.`);
  assert.ok(found[0].initializer, `Missing ${name} initializer.`);
  return unwrap(found[0].initializer);
}
function literal(node: ts.Expression, stems = false): string[] {
  node = unwrap(node);
  assert.ok(ts.isArrayLiteralExpression(node), 'Migration order must be a literal array; dynamic expressions require review.');
  return node.elements.map(item => {
    assert.ok(ts.isStringLiteral(item), 'Migration arrays accept only string literals, without spreads or executable expressions.');
    const file = stems ? item.text + '.sql' : item.text;
    assert.match(file, /^[0-9]{4}_[a-z0-9_]+\.sql$/, 'Only declared migration basenames are allowed.');
    return file;
  });
}
/** Inspect the actual installer inputs without importing/executing candidate code. */
function installerInputs(source: ts.SourceFile) {
  const functions = source.statements.filter(ts.isFunctionDeclaration).filter(node => node.name?.text === 'setupCompany');
  assert.equal(functions.length, 1, 'Review the actual setupCompany installer.');
  assert.ok(functions[0].body);
  return ['migrations', 'currentMigrations'].map(name => {
    let node = declaration(functions[0].body!.statements, name);
    assert.ok(ts.isAwaitExpression(node), `${name} must await its declared migration inputs.`);
    node = unwrap(node.expression);
    assert.ok(ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'Promise'
      && node.expression.name.text === 'all' && node.arguments.length === 1, `Review ${name}: expected Promise.all.`);
    const mapped = unwrap(node.arguments[0]);
    assert.ok(ts.isCallExpression(mapped) && ts.isPropertyAccessExpression(mapped.expression)
      && mapped.expression.name.text === 'map', `Review ${name}: expected the declared array's map.`);
    return unwrap(mapped.expression.expression);
  });
}
function requireManifestImport(source: ts.SourceFile, name: string) {
  const imported = source.statements.filter(ts.isImportDeclaration).some(node =>
    ts.isStringLiteral(node.moduleSpecifier) && /^\.\.\/db\/migrations\/order(?:\.ts)?$/.test(node.moduleSpecifier.text)
    && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
    && node.importClause.namedBindings.elements.some(item => !item.propertyName && item.name.text === name));
  assert.ok(imported, `Installer must import ${name} from the authoritative migration manifest.`);
}

export function readMigrationPlan(root: string, applied: readonly string[] = []) {
  const inputs: { path: string; sha256: string }[] = [];
  const read = (path: string) => {
    const text = readFileSync(join(root, path), 'utf8');
    inputs.push({ path, sha256: createHash('sha256').update(text).digest('hex') });
    return parse(path, text);
  };
  const installer = read(installerPath);
  const adapter = read(adapterPath);
  const adapterBase = literal(declaration(adapter.statements, 'CURRENT_MIGRATIONS'));
  const [installerBase, installerFinal] = installerInputs(installer);
  let base: string[], final: string[], held: string[];
  const source = existsSync(join(root, manifestPath)) ? 'manifest' : 'legacy-installer';
  if (source === 'manifest') {
    const manifest = read(manifestPath);
    base = literal(declaration(manifest.statements, 'BASE_MIGRATIONS'));
    final = literal(declaration(manifest.statements, 'FINAL_MIGRATIONS'));
    held = literal(declaration(manifest.statements, 'HELD_MIGRATIONS'));
    for (const [node, name] of [[installerBase, 'BASE_MIGRATIONS'], [installerFinal, 'FINAL_MIGRATIONS']] as const) {
      assert.ok(ts.isIdentifier(node) && node.text === name, `Installer must consume ${name}; review declaration drift.`);
      requireManifestImport(installer, name);
    }
  } else {
    base = literal(installerBase, true);
    final = literal(installerFinal, true);
    held = [...heldContract];
  }
  assert.deepEqual(base, adapterBase, 'Disposable adapter and actual installer disagree about base migration order.');
  assert.deepEqual(final, finalContract, 'Review the final native-payroll/Company Access order.');
  assert.deepEqual(held, heldContract, 'Held tenancy migrations cannot enter this rehearsal.');
  const current = [...base, ...final];
  requireMigrationCoverage(readdirSync(join(root, 'db/migrations')).filter(file => file.endsWith('.sql')), current, held);
  const missing = missingMigrationFiles(current, applied);
  return { source, base, final, held, current, inputs, missing };
}
