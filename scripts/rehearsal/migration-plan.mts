import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import {missingMigrationFiles} from '../../src/lib/migration-order.ts';
import { requireMigrationCoverage } from './guards.mts';

const heldContract = ['0026_tenant_ownership_expand.sql', '0027_tenant_ownership_validate.sql'];
const finalContract = ['0031_native_payroll.sql', '0032_company_access_invitations.sql', '0042_company_invitation_lifetime.sql'];
const sharedFinalContract = [...finalContract, '0062_conversations.sql'];
const installerPath = 'scripts/company-setup.ts';
const adapterPath = 'src/test/integration/local-postgres.ts';
const manifestPath = 'db/migrations/order.ts';
const bootstrapPath = 'src/lib/company-bootstrap/server.ts';

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
function requireImport(source: ts.SourceFile, name: string, path: string) {
  const imported = source.statements.filter(ts.isImportDeclaration).some(node =>
    ts.isStringLiteral(node.moduleSpecifier) && [path, path + '.ts'].includes(node.moduleSpecifier.text)
    && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
    && node.importClause.namedBindings.elements.some(item => !item.propertyName && item.name.text === name));
  assert.ok(imported, `Installer must import ${name} from ${path}.`);
}

function functionBody(source: ts.SourceFile, name: string) {
  const matches = source.statements.filter(ts.isFunctionDeclaration).filter(node => node.name?.text === name);
  assert.equal(matches.length, 1, `Review the single ${name} bootstrap function.`);
  assert.ok(matches[0].body, `Missing ${name} body.`);
  return matches[0].body;
}
function namedCall(node: ts.Expression, name: string) {
  node = unwrap(node);
  assert.ok(ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name,
    `Review the direct ${name} bootstrap call.`);
  return node;
}
function awaited(node: ts.Expression) {
  node = unwrap(node);
  assert.ok(ts.isAwaitExpression(node), 'Bootstrap inputs must be awaited.');
  return unwrap(node.expression);
}
/** Follow the shared installer without importing or executing candidate code.
 * Refuse changed delegation/arguments instead of falling back to inventory alone. */
function sharedInstallerInputs(installer: ts.SourceFile, bootstrap: ts.SourceFile) {
  const entry = functionBody(installer, 'setupCompany');
  assert.equal(entry.statements.length, 1, 'Review setupCompany bootstrap delegation.');
  const returned = entry.statements[0];
  assert.ok(ts.isReturnStatement(returned) && returned.expression);
  const delegated = namedCall(returned.expression, 'setupCompanyWithCredential');
  assert.equal(delegated.arguments.length, 3);
  assert.ok(delegated.arguments.slice(0, 2).every((arg, i) => ts.isIdentifier(arg) && arg.text === ['client', 'input'][i]),
    'Review setupCompany forwarded inputs.');
  const body = functionBody(installer, 'setupCompanyWithCredential');
  const manifest = namedCall(awaited(declaration(body.statements, 'manifest')), 'canonicalCompanyManifest');
  assert.equal(manifest.arguments.length, 0);
  for (const name of ['canonicalCompanyManifest', 'installCompanyBase', 'installCompanyFinal']) {
    requireImport(installer, name, '../src/lib/company-bootstrap/server');
  }
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && ['installCompanyBase', 'installCompanyFinal'].includes(node.expression.text)) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(body);
  assert.deepEqual(calls.map(node => (node.expression as ts.Identifier).text), ['installCompanyBase', 'installCompanyFinal'],
    'Review the base/final bootstrap installation order.');
  assert.ok(calls.every(node => node.arguments.length >= 2 && node.arguments.slice(0, 2).every((arg, i) =>
    ts.isIdentifier(arg) && arg.text === ['client', 'manifest'][i])), 'Bootstrap must install the selected manifest.');
  const loader = functionBody(bootstrap, 'canonicalCompanyManifest');
  const result = loader.statements.filter(ts.isReturnStatement);
  assert.ok(result.length === 1 && result[0].expression && ts.isObjectLiteralExpression(result[0].expression),
    'Review canonical manifest return.');
  for (const [name, manifestName] of [['base', 'BASE_MIGRATIONS'], ['final', 'FINAL_MIGRATIONS']]) {
    requireImport(bootstrap, manifestName, '../../../db/migrations/order');
    const all = awaited(declaration(loader.statements, name));
    assert.ok(ts.isCallExpression(all) && ts.isPropertyAccessExpression(all.expression)
      && ts.isIdentifier(all.expression.expression) && all.expression.expression.text === 'Promise'
      && all.expression.name.text === 'all' && all.arguments.length === 1, 'Review canonical manifest loading.');
    const map = unwrap(all.arguments[0]);
    assert.ok(ts.isCallExpression(map) && ts.isPropertyAccessExpression(map.expression)
      && ts.isIdentifier(map.expression.expression) && map.expression.expression.text === manifestName
      && map.expression.name.text === 'map' && map.arguments.length === 1
      && ts.isIdentifier(map.arguments[0]) && map.arguments[0].text === 'load', 'Review canonical base/final manifest inputs.');
    assert.ok(result[0].expression.properties.some(property => ts.isShorthandPropertyAssignment(property) && property.name.text === name),
      'Canonical manifest must return its declared base/final inputs.');
    const consumer = functionBody(bootstrap, name === 'base' ? 'installCompanyBase' : 'installCompanyFinal');
    const loops = consumer.statements.filter(ts.isForOfStatement);
    assert.ok(loops.length === 1 && ts.isPropertyAccessExpression(loops[0].expression)
      && ts.isIdentifier(loops[0].expression.expression) && loops[0].expression.expression.text === 'manifest'
      && loops[0].expression.name.text === name, 'Review bootstrap base/final consumption.');
  }
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
  let base: string[], final: string[], held: string[];
  const source = existsSync(join(root, manifestPath)) ? 'manifest' : 'legacy-installer';
  const shared = installer.statements.some(node => ts.isFunctionDeclaration(node) && node.name?.text === 'setupCompanyWithCredential');
  const installerArrays = shared ? undefined : installerInputs(installer);
  if (source === 'manifest') {
    const manifest = read(manifestPath);
    base = literal(declaration(manifest.statements, 'BASE_MIGRATIONS'));
    final = literal(declaration(manifest.statements, 'FINAL_MIGRATIONS'));
    held = literal(declaration(manifest.statements, 'HELD_MIGRATIONS'));
    if (shared) sharedInstallerInputs(installer, read(bootstrapPath));
    else for (const [node, name] of [[installerArrays![0], 'BASE_MIGRATIONS'], [installerArrays![1], 'FINAL_MIGRATIONS']] as const) {
      assert.ok(ts.isIdentifier(node) && node.text === name, `Installer must consume ${name}; review declaration drift.`);
      requireImport(installer, name, '../db/migrations/order');
    }
  } else {
    assert.ok(installerArrays, 'Shared bootstrap requires the canonical manifest.');
    base = literal(installerArrays[0], true);
    final = literal(installerArrays[1], true);
    held = [...heldContract];
  }
  assert.deepEqual(base, adapterBase, 'Disposable adapter and actual installer disagree about base migration order.');
  assert.deepEqual(final, shared ? sharedFinalContract : finalContract, 'Review the final native-payroll/Company Access/conversations order.');
  assert.deepEqual(held, heldContract, 'Held tenancy migrations cannot enter this rehearsal.');
  const current = [...base, ...final];
  requireMigrationCoverage(readdirSync(join(root, 'db/migrations')).filter(file => file.endsWith('.sql')), current, held);
  const missing = missingMigrationFiles(current, applied);
  return { source, base, final, held, current, inputs, missing };
}
