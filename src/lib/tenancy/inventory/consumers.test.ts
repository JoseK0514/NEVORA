import { describe, expect, it } from 'vitest';
import { inventorySourceCandidates } from './consumers';

describe('inert TypeScript source consumer candidates', () => {
  it('retains default, renamed, namespace, type-only and side-effect imports', () => {
    const source = "import sql from 'fictional-db';\nimport { query as run, type Row } from './query';\nimport * as db from './client';\nimport './setup';\nrun('SELECT 1'); db.query('SELECT 2');";
    const result = inventorySourceCandidates('src/data.ts', source);
    expect(result.bindings.map(binding => [binding.localName, binding.importedName, binding.moduleSpecifier, binding.typeOnly])).toEqual([
      ['sql', 'default', 'fictional-db', false], ['run', 'query', './query', false], ['Row', 'Row', './query', true], ['db', '*', './client', false],
    ]);
    expect(result.imports.some(item => item.kind === 'SIDE_EFFECT_IMPORT' && item.moduleSpecifier === './setup')).toBe(true);
    expect(result.calls.map(call => [call.kind, call.resolution, call.binding?.localName, call.members])).toEqual([
      ['CALL', 'IMPORT_BINDING', 'run', []], ['CALL', 'IMPORT_BINDING', 'db', ['query']],
    ]);
  });

  it('extracts static destructured, namespace and member CommonJS require candidates', () => {
    const result = inventorySourceCandidates('scripts/read.cjs', "const { query: run, transaction } = require('fictional-pg'); const db = require('./db'); const get = require('./db').getDb; run('SELECT 1'); db['query']('SELECT 2'); get();");
    expect(result.bindings.map(binding => [binding.localName, binding.importedName, binding.moduleSpecifier])).toEqual([
      ['run','query','fictional-pg'], ['transaction','transaction','fictional-pg'], ['db','*','./db'], ['get','getDb','./db'],
    ]);
    expect(result.calls.find(call => call.target === "db['query']")).toMatchObject({ resolution:'IMPORT_BINDING', members:['query'] });
    expect(result.imports.filter(item => item.kind === 'REQUIRE_CANDIDATE')).toHaveLength(3);
  });

  it('does not manufacture imports or calls from comments or ordinary source-looking strings', () => {
    const result = inventorySourceCandidates('src/notes.ts', "// import { query } from 'pg'; query('SELECT 1');\n/* db.query('SELECT 2') */\nconst note = \"require('pg').query('SELECT 3')\"; const another = \"db.query('SELECT 4')\";");
    expect(result.bindings).toEqual([]); expect(result.imports).toEqual([]); expect(result.calls).toEqual([]); expect(result.fragments).toEqual([]);
  });

  it('retains fragment-only files without pretending a literal is an executed SQL sink', () => {
    const result = inventorySourceCandidates('src/fragments.ts', "export const where = 'WHERE workspace_id = $1'; export const statement = 'SELECT id FROM fictional_rows';");
    expect(result.calls).toEqual([]);
    expect(result.fragments.map(fragment => [fragment.leadingKeyword, fragment.staticParts, fragment.composition])).toEqual([
      ['WHERE',['WHERE workspace_id = $1'],'LITERAL'], ['SELECT',['SELECT id FROM fictional_rows'],'LITERAL'],
    ]);
    expect(result.sqlSinks).toBe('NOT_CLASSIFIED');
  });

  it('retains tagged templates, interpolation spans and unresolved receivers', () => {
    const source = "import { sql } from './db'; sql`SELECT id FROM things WHERE id = ${id}`; factory().query('SELECT 2');";
    const result = inventorySourceCandidates('src/read.ts', source);
    expect(result.calls.find(call => call.kind === 'TAGGED_TEMPLATE')).toMatchObject({ target:'sql', resolution:'IMPORT_BINDING' });
    const fragment = result.fragments.find(item => item.composition === 'TEMPLATE_INTERPOLATION')!;
    expect(fragment.staticParts).toEqual(['SELECT id FROM things WHERE id = ', '']);
    expect(fragment.interpolations.map(span => source.slice(span.startOffset, span.endOffset))).toEqual(['id']);
    expect(result.observations.map(item => item.code)).toContain('DYNAMIC_SQL_FRAGMENT');
    expect(result.calls.find(call => call.target === 'factory().query')).toMatchObject({ resolution:'INDIRECT_RECEIVER' });
  });

  it('records dynamic members, identifiers and module expressions explicitly', () => {
    const result = inventorySourceCandidates('src/dynamic.ts', "import * as db from './db'; db[method]('SELECT 1'); unknownRunner(fragment); const adapter = require(moduleName); import(otherModule);");
    expect(result.calls.find(call => call.target === 'db[method]')).toMatchObject({ resolution:'DYNAMIC_MEMBER', binding:{localName:'db'} });
    expect(result.calls.find(call => call.target === 'unknownRunner')).toMatchObject({ resolution:'UNRESOLVED_IDENTIFIER' });
    expect(result.observations.map(item => item.code)).toEqual(expect.arrayContaining(['DYNAMIC_MEMBER','UNRESOLVED_IDENTIFIER','DYNAMIC_MODULE_SPECIFIER','DYNAMIC_IMPORT']));
    expect(result.bindings.some(binding => binding.localName === 'adapter')).toBe(false);
  });

  it('preserves lexical shadowing rather than attaching a parameter or local call to an import', () => {
    const result = inventorySourceCandidates('src/shadow.ts', "import { query } from './db'; query('SELECT 1'); function local(query: any) { query('SELECT 2'); } { const query = custom; query('SELECT 3'); } query('SELECT 4');");
    expect(result.calls.filter(call => call.target === 'query').map(call => call.resolution)).toEqual(['IMPORT_BINDING','LOCAL_BINDING','LOCAL_BINDING','IMPORT_BINDING']);
    expect(result.observations.some(item => item.code === 'LOCAL_BINDING_UNRESOLVED')).toBe(true);
  });

  it('treats hoisted var declarations conservatively within their function scope', () => {
    const result = inventorySourceCandidates('src/var.ts', "import { query } from './db'; function read() { query('SELECT 1'); if (ready) { var query = custom; } } query('SELECT 2');");
    expect(result.calls.filter(call => call.target === 'query').map(call => call.resolution)).toEqual(['LOCAL_BINDING','IMPORT_BINDING']);
  });

  it('does not attach a named class expression or shadowed require to an import', () => {
    const result = inventorySourceCandidates('src/class.ts', "import { query } from './db'; const Local = class query { read() { query('SELECT 1'); } }; query('SELECT 2'); function load(require: any) { const { query: custom } = require('./other'); custom('SELECT 3'); }");
    expect(result.calls.filter(call => call.target === 'query').map(call => call.resolution)).toEqual(['LOCAL_BINDING','IMPORT_BINDING']);
    expect(result.bindings.some(binding => binding.localName === 'custom')).toBe(false);
    expect(result.observations.some(item => item.code === 'SHADOWED_REQUIRE')).toBe(true);
  });

  it('retains static import-equals aliases and constructor syntax as candidates', () => {
    const result = inventorySourceCandidates('src/client.ts', "import pg = require('fictional-pg'); import { Client as PgClient } from 'fictional-pg'; new PgClient(); pg.query('SELECT 1');");
    expect(result.bindings.map(binding => [binding.localName,binding.importedName])).toEqual([['pg','*'],['PgClient','Client']]);
    expect(result.calls.find(call => call.kind === 'CONSTRUCT')).toMatchObject({ binding:{localName:'PgClient'}, resolution:'IMPORT_BINDING' });
  });

  it('reports type-only runtime references and runtime binding mutation as unresolved', () => {
    const result = inventorySourceCandidates('src/type.ts', "import type { Query } from './db'; Query('SELECT 1'); const { query } = require('./db'); query = replacement; query('SELECT 2');");
    expect(result.calls.find(call => call.target === 'Query')).toMatchObject({ resolution:'TYPE_ONLY_BINDING' });
    expect(result.calls.find(call => call.target === 'query')).toMatchObject({ resolution:'MUTATED_BINDING' });
    expect(result.observations.map(item => item.code)).toEqual(expect.arrayContaining(['TYPE_ONLY_RUNTIME_REFERENCE','BINDING_MUTATION']));
  });

  it.each([
    ['ROOT-C01', "({ query } = replacement);"],
    ['ROOT-C02', "[query] = replacement;"],
    ['nested object/default', "({ payload: { selected: query = fallback } } = replacement);"],
    ['nested array/rest/default', "({ payload: [query = fallback, ...rest] } = replacement);"],
    ['object rest', "({ ...query } = replacement);"],
    ['array rest', "[...query] = replacement;"],
  ])('marks actual reassigned require binding in runtime-valid let pattern %s', (_label, assignment) => {
    const source = "let { query, fallback } = require('./db'); let rest; " + assignment + " query('SELECT 1'); fallback('SELECT 2');";
    const result = inventorySourceCandidates('src/mutation.ts', source);
    expect(result.calls.find(call => call.target === 'query')).toMatchObject({resolution:'MUTATED_BINDING'});
    expect(result.calls.find(call => call.target === 'fallback')).toMatchObject({resolution:'IMPORT_BINDING'});
    expect(result.observations.some(item => item.code.startsWith('TS_PARSE_'))).toBe(false);
    expect(result.observations.some(item => item.code === 'BINDING_MUTATION')).toBe(true);
  });

  it('assigns renamed object values without mutating their unrelated key identifiers', () => {
    const result = inventorySourceCandidates('src/renamed.ts', "let { query, transaction } = require('./db'); ({ query: transaction } = replacement); query('SELECT 1'); transaction('SELECT 2');");
    expect(result.calls.find(call => call.target === 'query')).toMatchObject({resolution:'IMPORT_BINDING'});
    expect(result.calls.find(call => call.target === 'transaction')).toMatchObject({resolution:'MUTATED_BINDING'});
  });

  it('observes member assignment uncertainty without falsely rebinding its receiver or computed key', () => {
    const result = inventorySourceCandidates('src/member.ts', "let { query, key } = require('./db'); let receiver = require('./receiver'); ({ query: receiver[key] } = replacement); query('SELECT 1'); key(); receiver();");
    for (const target of ['query','key','receiver']) expect(result.calls.find(call => call.target === target)).toMatchObject({resolution:'IMPORT_BINDING'});
    expect(result.observations.some(item => item.code === 'MEMBER_ASSIGNMENT_UNRESOLVED')).toBe(true);
  });

  it.each([
    ['for-of identifier', "for (query of runners) { query('SELECT 1'); }"],
    ['for-in identifier', "for (query in runners) { query('SELECT 1'); }"],
    ['for-of renamed object', "for ({ picked: query } of runners) { query('SELECT 1'); }"],
    ['for-in array', "for ([query] in runners) { query('SELECT 1'); }"],
  ])('records nondeclaration loop assignment targets for %s', (_label, loop) => {
    const source = "let { query, fallback } = require('./db'); " + loop + " fallback('SELECT 2');";
    const result = inventorySourceCandidates('src/loop-assignment.ts', source);
    expect(result.calls.find(call => call.target === 'query')).toMatchObject({resolution:'MUTATED_BINDING'});
    expect(result.calls.find(call => call.target === 'fallback')).toMatchObject({resolution:'IMPORT_BINDING'});
    expect(result.observations.some(item => item.code.startsWith('TS_PARSE_'))).toBe(false);
  });

  it('keeps declared loop bindings and their reassignment local to the loop', () => {
    const source = "let { query } = require('./db'); for (let query of runners) { query = replacement; query('SELECT 1'); } for (const { query } of runners) { query('SELECT 2'); } for (let query in runners) { query('SELECT 3'); } query('SELECT 4');";
    const result = inventorySourceCandidates('src/loop-declaration.ts', source);
    expect(result.calls.filter(call => call.target === 'query').map(call => call.resolution)).toEqual(['LOCAL_BINDING','LOCAL_BINDING','LOCAL_BINDING','IMPORT_BINDING']);
    expect(result.observations.some(item => item.code === 'BINDING_MUTATION')).toBe(false);
    expect(result.observations.some(item => item.code.startsWith('TS_PARSE_'))).toBe(false);
  });

  it('keeps concatenated SQL literal candidates with their unresolved composition', () => {
    const result = inventorySourceCandidates('src/build.ts', "const statement = prefix + 'WHERE id = $1';");
    expect(result.fragments).toHaveLength(1); expect(result.fragments[0].composition).toBe('CONCATENATED');
    expect(result.observations.some(item => item.code === 'DYNAMIC_SQL_FRAGMENT')).toBe(true);
  });

  it('returns exact UTF16/UTF8 spans and CRLF lines without normalizing source text', () => {
    const source = "// 🐾 é\r\nimport { query as run } from './db';\r\nrun('SELECT 1');";
    const result = inventorySourceCandidates('src/span.ts', source); const call = result.calls[0];
    expect(source.slice(call.span.startOffset,call.span.endOffset)).toBe("run('SELECT 1')");
    expect(call.span.startByte).toBe(Buffer.byteLength(source.slice(0,call.span.startOffset)));
    expect(call.span.endByte).toBe(Buffer.byteLength(source.slice(0,call.span.endOffset)));
    expect(call.span.startLine).toBe(3); expect(call.span.endLine).toBe(3);
  });

  it.each([
    ['src/test/integration/read.ts','TEST'],['src/test/fixtures/read.ts','FIXTURE'],['tests/read.test.ts','TEST'],['scripts/read.mjs','SCRIPT'],['src/read.tsx','APPLICATION'],
  ])('retains candidate source category for %s', (path, expected) => {
    expect(inventorySourceCandidates(path, "const sql = 'SELECT 1';").sourceCategory).toBe(expected);
  });

  it('never executes analyzed code or resolves imports and makes no completeness claim', () => {
    const sentinel = '__fictionalConsumerExecution'; const globals = globalThis as unknown as Record<string,unknown>;
    const before = globals[sentinel];
    const source = "import './missing-module'; globalThis.__fictionalConsumerExecution = true; require('no-such-package'); throw new Error('must never execute');";
    const result = inventorySourceCandidates('src/inert.ts',source);
    expect(globals[sentinel]).toBe(before);
    expect(result).toMatchObject({ analysis:'INERT_AST_CANDIDATES_ONLY', transitiveClosure:'NOT_PERFORMED', sqlSinks:'NOT_CLASSIFIED', tenantOwnership:'NOT_CLASSIFIED', completeness:'NOT_CLAIMED' });
    expect(inventorySourceCandidates('src/inert.ts',source)).toEqual(result);
  });

  it('retains parser errors rather than reporting valid or complete source', () => {
    const result = inventorySourceCandidates('src/broken.ts', "import { query from './db'; query('SELECT 1');");
    expect(result.observations.some(item => item.code.startsWith('TS_PARSE_'))).toBe(true);
    expect(result.completeness).toBe('NOT_CLAIMED');
  });

  it('bounds source bytes before parsing and reports unsupported extensions', () => {
    expect(inventorySourceCandidates('src/huge.ts', 'a'.repeat(1024 * 1024 + 1)).observations[0].code).toBe('SOURCE_SIZE_LIMIT');
    expect(inventorySourceCandidates('notes.sql','SELECT 1;').observations[0].code).toBe('UNSUPPORTED_SOURCE_KIND');
  });
});
