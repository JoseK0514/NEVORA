import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { reduceExplicitSchema } from './schema-reducer';
import type { SchemaFold, SchemaInput } from './schema-reducer';
import { loadPinnedMigrations } from './source';

const fold = (text: string) => reduceExplicitSchema([{ path: 'fiction.sql', text }]);
const active = (result: SchemaFold, name: string) => result.tables.find(t => t.active && t.name.join('.') === name)!;
const column = (result: SchemaFold, table: string, name: string) => active(result, table).columns.find(c => c.name === name)!;
const codes = (result: SchemaFold) => result.unknowns.map(u => u.code);

describe('ordered partial explicit DDL fold', () => {
  it('preserves declared CREATE fields/defaults and source provenance without execution claims', () => {
    const text = '-- é\r\nCREATE TABLE t(id uuid PRIMARY KEY, n integer NOT NULL DEFAULT 3, note text);';
    const result = fold(text);
    expect(column(result, 't', 'id').nullability).toEqual({ explicit: 'UNSPECIFIED', primaryKey: true, notNull: true });
    expect(column(result, 't', 'n').defaultExpression).toBe('3');
    expect(column(result, 't', 'note').nullability.notNull).toBeNull();
    const origin = active(result, 't').provenance[0];
    expect(origin.sourcePath).toBe('fiction.sql');
    expect(origin.sourceSha256).toBe(createHash('sha256').update(text).digest('hex'));
    expect(text.slice(origin.span.startOffset, origin.span.endOffset)).toBe(origin.raw);
    expect(result.scope).toBe('PARTIAL_EXPLICIT_DDL_FOLD');
    expect(result.effectiveSchema).toBe('NOT_COMPUTED');
  });

  it('applies ordered multi-action ADD/type/nullability/default/constraint actions without splitting expression commas', () => {
    const result = fold("CREATE TABLE t(a text PRIMARY KEY);ALTER TABLE t ADD COLUMN c numeric(8,2) DEFAULT round(1.5,1), ADD CONSTRAINT ux UNIQUE(a,c), ALTER COLUMN c SET NOT NULL, ALTER COLUMN a SET DEFAULT 'z';");
    expect(active(result, 't').columns.map(c => c.name)).toEqual(['a', 'c']);
    expect(column(result, 't', 'c').typeRaw).toBe('numeric(8,2)');
    expect(column(result, 't', 'c').defaultExpression).toBe('round(1.5,1)');
    expect(column(result, 't', 'c').nullability.notNull).toBe(true);
    expect(column(result, 't', 'a').defaultExpression).toBe("'z'");
    expect(active(result, 't').constraints.map(c => c.kind)).toEqual(['PRIMARY_KEY', 'UNIQUE']);
    expect(active(result, 't').constraints[1].columns).toEqual(['a', 'c']);
  });

  it('changes an explicit type and removes NOT NULL/default attributes while preserving lineage', () => {
    const result = fold('CREATE TABLE t(n integer NOT NULL DEFAULT 3);ALTER TABLE t ALTER COLUMN n TYPE numeric(8,2),ALTER COLUMN n DROP NOT NULL,ALTER COLUMN n DROP DEFAULT;');
    const n = column(result, 't', 'n');
    expect(n.typeRaw).toBe('numeric(8,2)');
    expect(n.nullability.notNull).toBe(false);
    expect(n.defaultExpression).toBeNull();
    expect(n.declaration.dataType.raw).toBe('integer');
    expect(n.provenance).toHaveLength(4);
  });

  it('renames composite local and inbound FK column identities and table targets while retaining raw declarations', () => {
    const result = fold('CREATE TABLE parent(a text,b text,PRIMARY KEY(a,b));CREATE TABLE child(x text,y text,FOREIGN KEY(x,y) REFERENCES parent(a,b));ALTER TABLE parent RENAME COLUMN a TO "A";ALTER TABLE parent RENAME TO "Parent";');
    expect(active(result, 'Parent').constraints[0].columns).toEqual(['A', 'b']);
    const fk = active(result, 'child').constraints[0];
    expect(fk.reference?.table).toEqual(['Parent']);
    expect(fk.reference?.columns).toEqual(['A', 'b']);
    expect(fk.declaration.reference?.table.normalized).toEqual(['parent']);
    expect(fk.declaration.reference?.columns?.map(c => c.normalized)).toEqual(['a', 'b']);
  });

  it('drops local composite keys/uniques with a column and retains surviving PK NOT NULL evidence', () => {
    const result = fold('CREATE TABLE t(a text,b text,PRIMARY KEY(a,b),UNIQUE(a));ALTER TABLE t DROP COLUMN a;');
    expect(active(result, 't').columns.map(c => c.name)).toEqual(['b']);
    expect(active(result, 't').constraints).toEqual([]);
    expect(column(result, 't', 'b').nullability.primaryKey).toBe(false);
    expect(column(result, 't', 'b').nullability.notNull).toBe(true);
    expect(active(result, 't').retiredColumns[0].declaration.name.normalized).toBe('a');
    expect(active(result, 't').retiredConstraints).toHaveLength(2);
  });

  it('does not partially apply a multi-action statement whose later DROP conflicts with an inbound FK', () => {
    const result = fold('CREATE TABLE p(id text PRIMARY KEY);CREATE TABLE c(id text REFERENCES p(id));ALTER TABLE p ADD COLUMN scratch text,DROP COLUMN id;');
    expect(active(result, 'p').columns.map(c => c.name)).toEqual(['id']);
    expect(codes(result)).toContain('DROP_COLUMN_REFERENCED');
    expect(result.events[result.events.length - 1].status).toBe('UNRESOLVED');
  });

  it('bounds a declared CASCADE to known FK removals and preserves unmodeled dependencies', () => {
    const result = fold('CREATE TABLE p(id text PRIMARY KEY);CREATE TABLE c(id text REFERENCES p(id));ALTER TABLE p DROP COLUMN id CASCADE;');
    expect(active(result, 'p').columns).toEqual([]);
    expect(active(result, 'c').constraints).toEqual([]);
    expect(active(result, 'c').retiredConstraints[0].reference?.columns).toEqual(['id']);
    expect(codes(result)).toContain('CASCADE_DEPENDENCIES_UNMODELED');
    expect(result.effectiveSchema).toBe('NOT_COMPUTED');
  });

  it('preserves table lifetimes across DROP/recreate and records absent guarded DROP', () => {
    const result = fold('CREATE TABLE t(id text);DROP TABLE t;DROP TABLE IF EXISTS t;CREATE TABLE t(other integer);');
    expect(result.tables).toHaveLength(2);
    expect(result.tables[0].active).toBe(false);
    expect(result.tables[0].columns[0].name).toBe('id');
    expect(active(result, 't').columns[0].name).toBe('other');
    expect(result.events.some(e => e.operation === 'DROP_TABLE' && e.status === 'SKIPPED_GUARD')).toBe(true);
  });

  it('does not fold the supported prefix of an unsupported multi-action ALTER', () => {
    const result = fold('CREATE TABLE t(id text);ALTER TABLE t ADD COLUMN c text,ENABLE ROW LEVEL SECURITY;');
    expect(active(result, 't').columns.map(c => c.name)).toEqual(['id']);
    expect(codes(result)).toContain('UNSUPPORTED_ALTER_ACTION');
    expect(result.unknowns.find(u => u.code === 'UNSUPPORTED_ALTER_ACTION')!.origin.raw).toContain('ADD COLUMN c');
  });

  it('records guarded source drift and duplicate declarations instead of replacing known fields', () => {
    const result = fold('CREATE TABLE t(id integer);ALTER TABLE t ADD COLUMN IF NOT EXISTS id integer;ALTER TABLE t ADD COLUMN IF NOT EXISTS id text;CREATE TABLE IF NOT EXISTS t(other text);');
    expect(column(result, 't', 'id').typeRaw).toBe('integer');
    expect(codes(result)).toContain('GUARDED_COLUMN_DRIFT');
    expect(codes(result)).toContain('GUARDED_TABLE_DRIFT');
    expect(result.events.some(e => e.operation === 'ADD_COLUMN' && e.status === 'SKIPPED_GUARD')).toBe(true);
  });

  it('does not guess the catalog-generated name of an anonymous CHECK targeted by DROP', () => {
    const result = fold('CREATE TABLE t(n integer CHECK(n>0));ALTER TABLE t DROP CONSTRAINT t_n_check;ALTER TABLE t ADD CONSTRAINT t_n_check CHECK(n>=0);');
    expect(codes(result)).toContain('CONSTRAINT_TARGET_UNRESOLVED');
    expect(active(result, 't').constraints.map(c => c.name)).toEqual([null, 't_n_check']);
    expect(active(result, 't').constraints[0].declaration.expression?.raw).toBe('(n>0)');
  });

  it('drops/renames explicit constraint names and retains column NOT NULL evidence after PK removal', () => {
    const result = fold('CREATE TABLE t(id text,CONSTRAINT pk PRIMARY KEY(id),CONSTRAINT ux UNIQUE(id));ALTER TABLE t DROP CONSTRAINT pk;ALTER TABLE t RENAME CONSTRAINT ux TO "UX";');
    expect(active(result, 't').constraints[0].name).toBe('UX');
    expect(active(result, 't').constraints[0].declaration.name?.normalized).toBe('ux');
    expect(column(result, 't', 'id').nullability).toEqual({ explicit: 'UNSPECIFIED', primaryKey: false, notNull: true });
  });

  it('keeps reference omissions and search-path-dependent target names unresolved', () => {
    const result = fold('CREATE TABLE one.p(id text PRIMARY KEY);CREATE TABLE c(a text REFERENCES p,b text REFERENCES one.p);');
    expect(active(result, 'c').constraints[0].reference?.columns).toBeNull();
    expect(codes(result)).toContain('REFERENCE_COLUMNS_UNSPECIFIED');
    expect(codes(result)).toContain('REFERENCE_TABLE_UNRESOLVED');
    expect(result.rowOwnership).toBe('NOT_CLASSIFIED');
  });

  it('rejects source hash drift before folding any declaration', () => {
    const result = reduceExplicitSchema([{ path: 'x.sql', text: 'CREATE TABLE x(id text);', sha256: '0'.repeat(64) }]);
    expect(result.tables).toEqual([]);
    expect(codes(result)).toContain('SOURCE_HASH_MISMATCH');
  });

  it('rejects ambiguous repeated source paths instead of reordering versions', () => {
    const result = reduceExplicitSchema([{ path: 'x.sql', text: 'CREATE TABLE x(id text);' }, { path: 'x.sql', text: 'DROP TABLE x;' }]);
    expect(result.tables).toEqual([]);
    expect(codes(result)).toContain('DUPLICATE_SOURCE_PATH');
  });

  it('retains TYPE USING and dynamic/body/DML/index effects without invented schema changes', () => {
    const result = fold('CREATE TABLE t(id text);ALTER TABLE t ALTER COLUMN id TYPE uuid USING id::uuid;DO $$ BEGIN EXECUTE \'ALTER TABLE t ADD COLUMN secret text\'; END $$;UPDATE t SET id=id;CREATE VIEW v AS SELECT * FROM t;CREATE INDEX ix ON t(id);');
    expect(column(result, 't', 'id').typeRaw).toBe('text');
    expect(active(result, 't').columns.map(c => c.name)).toEqual(['id']);
    expect(codes(result)).toContain('UNSUPPORTED_ALTER_TYPE_USING');
    expect(result.unknowns.filter(u => u.code === 'STATEMENT_EFFECT_UNMODELED')).toHaveLength(4);
    expect(result.transactionEffects).toBe('NOT_MODELED');
  });

  it('preserves opaque CHECK text across rename/drop and explicitly marks unresolved dependencies', () => {
    const result = fold("CREATE TABLE t(a text, CHECK(a<>''));ALTER TABLE t RENAME COLUMN a TO b;ALTER TABLE t DROP COLUMN b;");
    expect(active(result, 't').constraints[0].declaration.expression?.raw).toBe("(a<>'')");
    expect(codes(result)).toContain('OPAQUE_EXPRESSION_DEPENDENCY_UNRESOLVED');
    expect(codes(result)).toContain('OPAQUE_DROP_DEPENDENCIES_UNRESOLVED');
  });

  it('preserves exact multi-action source spans, input ordering and input immutability', () => {
    const sources: SchemaInput[] = [
      { path: '2-create.sql', text: 'CREATE TABLE t(id text);' },
      { path: '1-alter.sql', text: '-- é\r\nALTER TABLE t ADD COLUMN "名" text DEFAULT \'😀\',ALTER COLUMN "名" SET NOT NULL;' },
    ];
    const before = JSON.stringify(sources),result=reduceExplicitSchema(sources);
    expect(column(result, 't', '名').nullability.notNull).toBe(true);
    for (const event of result.events) {
      const source=sources[event.origin.sourceIndex].text,origin=event.origin;
      expect(source.slice(origin.span.startOffset,origin.span.endOffset)).toBe(origin.raw);
      expect(origin.span.startByte).toBe(Buffer.byteLength(source.slice(0,origin.span.startOffset)));
      expect(origin.span.endByte).toBe(Buffer.byteLength(source.slice(0,origin.span.endOffset)));
    }
    expect(JSON.stringify(sources)).toBe(before);
    expect(result.sources.map(s => s.path)).toEqual(['2-create.sql','1-alter.sql']);
  });

  it('rejects DROP NOT NULL under an active PK without making the column nullable', () => {
    const result=fold('CREATE TABLE t(id text PRIMARY KEY);ALTER TABLE t ALTER COLUMN id DROP NOT NULL;');
    expect(column(result,'t','id').nullability.notNull).toBe(true);
    expect(codes(result)).toContain('PRIMARY_KEY_NOT_NULL_REQUIRED');
  });

  it('does not guess which target columns an implicit FK depends on during CASCADE', () => {
    const result=fold('CREATE TABLE p(id text PRIMARY KEY,other text);CREATE TABLE c(id text REFERENCES p);ALTER TABLE p DROP COLUMN other CASCADE;');
    expect(active(result,'p').columns.map(c=>c.name)).toEqual(['id','other']);
    expect(active(result,'c').constraints).toHaveLength(1);
    expect(codes(result)).toContain('DROP_REFERENCE_COLUMNS_UNRESOLVED');
  });

  it('classifies ALTER VIEW and DROP INDEX as unsupported effects instead of malformed table actions', () => {
    const result=fold('CREATE TABLE t(id text);ALTER VIEW v RENAME COLUMN id TO x;DROP INDEX ix;');
    expect(result.unknowns.map(u=>[u.code,u.severity])).toEqual([['STATEMENT_EFFECT_UNMODELED','UNSUPPORTED'],['STATEMENT_EFFECT_UNMODELED','UNSUPPORTED']]);
    expect(result.events.at(-2)!.operation).toBe('ALTER');
    expect(result.events.at(-1)!.operation).toBe('DROP');
  });

  it('preserves the whole lexically blocked source and refuses a seemingly valid prefix', () => {
    const text="CREATE TABLE t(id text);UPDATE t SET id='broken";
    const result=fold(text);
    expect(result.tables).toEqual([]);
    expect(result.unknowns.find(u=>u.code==='LEXICAL_SOURCE_BLOCKED')!.origin.raw).toBe(text);
    expect(result.events[0].status).toBe('UNRESOLVED');
  });

  it('reports an empty source capture without implying an empty effective schema', () => {
    const result=reduceExplicitSchema([]);
    expect(codes(result)).toEqual(['EMPTY_SOURCE_CAPTURE']);
    expect(result.effectiveSchema).toBe('NOT_COMPUTED');
  });
});

describe('read-only exact M0 explicit ALTER declaration folds', () => {
  let sources: SchemaInput[];
  beforeAll(() => {
    sources=loadPinnedMigrations({repo:fileURLToPath(new URL('../../../../',import.meta.url)),source:'7c628e374f03c9025b2c0cfd3568be033f07238d',tree:'5a2df7788b4a5f52b77b1273bedd59e191438379'}).migrations.map(m => ({path:m.path,text:m.text,sha256:m.sha256}));
  });
  it('folds0008 workspace/clocker columns, ordered location UNIQUE and NOT VALID source metadata', () => {
    const result=reduceExplicitSchema(sources.filter(s => s.path.slice('db/migrations/'.length, 'db/migrations/'.length+4)<='0008'));
    expect(column(result,'locations','workspace_id').typeRaw).toBe('text');
    expect(column(result,'locations','workspace_id').nullability.notNull).toBe(true);
    expect(column(result,'locations','clocker_key').nullability.notNull).toBe(true);
    const constraints=active(result,'locations').constraints;
    expect(constraints.find(c => c.name==='location_clocker_key_unique')!.columns).toEqual(['workspace_id','clocker_key']);
    expect(constraints.find(c => c.name==='location_name_format')!.validation).toBe('NOT_VALID');
    expect(constraints.find(c => c.name==='location_name_format')!.provenance[0].sourcePath).toBe('db/migrations/0008_workspace_positions.sql');
  });
  it('folds0024 actual communication head composite FK while preserving unknown generated-name drops', () => {
    const result=reduceExplicitSchema(sources.filter(s => !s.path.includes('0025_')));
    const head=active(result,'communications').constraints.find(c => c.name==='communication_head_identity')!;
    expect(head.columns).toEqual(['workspace_id','id','head_revision_id']);
    expect(head.reference?.table).toEqual(['communication_revisions']);
    expect(head.reference?.columns).toEqual(['workspace_id','communication_id','id']);
    expect(codes(result)).toContain('CONSTRAINT_TARGET_UNRESOLVED');
    expect(result.effectiveSchema).toBe('NOT_COMPUTED');
  });
  it('folds0025 calendar additions followed by the actual multi-action SET NOT NULL declarations', () => {
    const result=reduceExplicitSchema(sources);
    for(const table of ['locations','schedule_publication_revisions']) {
      expect(column(result,table,'calendar_serial').typeRaw).toBe('integer');
      expect(column(result,table,'calendar_serial').nullability.notNull).toBe(true);
      expect(column(result,table,'calendar_modified_at').typeRaw).toBe('timestamptz');
      expect(column(result,table,'calendar_modified_at').nullability.notNull).toBe(true);
      expect(column(result,table,'calendar_modified_at').provenance.at(-1)!.sourcePath).toBe('db/migrations/0025_calendar_subscriptions.sql');
    }
    expect(result.unknowns.some(u => u.origin.raw.includes('UPDATE'))).toBe(true);
    expect(result.scope).toBe('PARTIAL_EXPLICIT_DDL_FOLD');
  });
});
