import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseDdlDeclarations } from './ddl';
import type { DdlConstraint, DdlJournal, DdlSpan } from './ddl';
import { loadPinnedMigrations } from './source';

const values = (ids: { normalized: string }[]) => ids.map(id => id.normalized);
const keys = (table: DdlJournal['tables'][number], kind: DdlConstraint['kind']) => table.constraints.filter(c => c.kind === kind);
function checkSpan(text: string, span: DdlSpan, raw: string) {
  expect(text.slice(span.startOffset, span.endOffset)).toBe(raw);
  expect(span.startByte).toBe(Buffer.byteLength(text.slice(0, span.startOffset)));
  expect(span.endByte).toBe(Buffer.byteLength(text.slice(0, span.endOffset)));
}

describe('bounded inert CREATE TABLE declarations', () => {
  it('captures actual column types and separates declared nullability from PK implication', () => {
    const result = parseDdlDeclarations('CREATE TABLE "Ops"."Roster" ("ID" uuid PRIMARY KEY, staff_id text NOT NULL, note text, amount numeric(8,2), stamp timestamp(3) with time zone, tags text[]);');
    expect(result.tables).toHaveLength(1);
    const table = result.tables[0];
    expect(table.name.normalized).toEqual(['Ops', 'Roster']);
    expect(table.columns.map(c => c.dataType.raw)).toEqual(['uuid', 'text', 'text', 'numeric(8,2)', 'timestamp(3) with time zone', 'text[]']);
    expect(table.columns[0].nullability).toEqual({ explicit: 'UNSPECIFIED', primaryKey: true });
    expect(table.columns[1].nullability).toEqual({ explicit: 'NOT_NULL', primaryKey: false });
    expect(table.columns[2].nullability).toEqual({ explicit: 'UNSPECIFIED', primaryKey: false });
  });

  it('folds unquoted ASCII identifiers, preserves quoted case and unescapes doubled quotes', () => {
    const table = parseDdlDeclarations('create table IF NOT EXISTS PUBLIC."x""Y" (Foo text UNIQUE, "Foo" TEXT NULL);').tables[0];
    expect(table.ifNotExists).toBe(true);
    expect(table.name.normalized).toEqual(['public', 'x"Y']);
    expect(table.columns.map(c => c.name.normalized)).toEqual(['foo', 'Foo']);
    expect(table.columns[1].nullability.explicit).toBe('NULL');
    expect(values(keys(table, 'UNIQUE')[0].columns)).toEqual(['foo']);
  });

  it('captures named composite PK, UNIQUE and FK declarations in their source order', () => {
    const text = 'CREATE TABLE child(tenant_id text, parent_id uuid, CONSTRAINT "PK" PRIMARY KEY(tenant_id,parent_id), UNIQUE(parent_id), CONSTRAINT fk FOREIGN KEY(tenant_id,parent_id) REFERENCES "Ops".Parent("Tenant",ID) ON DELETE RESTRICT ON UPDATE CASCADE);';
    const table = parseDdlDeclarations(text).tables[0];
    expect(values(keys(table, 'PRIMARY_KEY')[0].columns)).toEqual(['tenant_id', 'parent_id']);
    expect(keys(table, 'PRIMARY_KEY')[0].name?.normalized).toBe('PK');
    expect(table.columns.every(c => c.nullability.primaryKey)).toBe(true);
    const fk = keys(table, 'FOREIGN_KEY')[0];
    expect(values(fk.columns)).toEqual(['tenant_id', 'parent_id']);
    expect(fk.reference?.table.normalized).toEqual(['Ops', 'parent']);
    expect(values(fk.reference!.columns!)).toEqual(['Tenant', 'id']);
    expect(fk.reference?.optionsRaw).toBe('ON DELETE RESTRICT ON UPDATE CASCADE');
    checkSpan(text, fk.span, fk.raw);
  });

  it('captures inline FK/PK without interpreting a nearby comment as a constraint', () => {
    const table = parseDdlDeclarations('CREATE TABLE x(id text PRIMARY KEY REFERENCES parent(id) ON DELETE CASCADE, note text /* REFERENCES fake(id) NOT NULL */);').tables[0];
    expect(keys(table, 'FOREIGN_KEY')).toHaveLength(1);
    expect(keys(table, 'FOREIGN_KEY')[0].reference?.table.normalized).toEqual(['parent']);
    expect(values(keys(table, 'FOREIGN_KEY')[0].columns)).toEqual(['id']);
    expect(table.columns[1].nullability.explicit).toBe('UNSPECIFIED');
  });

  it('leaves omitted referenced columns unresolved instead of guessing a target PK', () => {
    const result = parseDdlDeclarations('CREATE TABLE x(id text REFERENCES parent);');
    expect(keys(result.tables[0], 'FOREIGN_KEY')[0].reference?.columns).toBeNull();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'REFERENCE_COLUMNS_UNSPECIFIED', severity: 'UNRESOLVED' }));
  });

  it('keeps defaults/checks opaque across nested commas, arrays and quoted SQL words', () => {
    const table = parseDdlDeclarations("CREATE TABLE x(meta jsonb DEFAULT jsonb_build_object('k,)', 'FOREIGN KEY') CHECK ((meta->>'x,y') IS NOT NULL), tags text[] DEFAULT ARRAY['a,b','PRIMARY KEY'], note text DEFAULT 'NOT NULL');").tables[0];
    expect(table.columns).toHaveLength(3);
    expect(keys(table, 'DEFAULT')[0].expression?.raw).toBe("jsonb_build_object('k,)', 'FOREIGN KEY')");
    expect(keys(table, 'CHECK')[0].expression?.raw).toBe("((meta->>'x,y') IS NOT NULL)");
    expect(keys(table, 'CHECK')[0].expression?.analysis).toBe('NOT_PERFORMED');
    expect(keys(table, 'PRIMARY_KEY')).toEqual([]);
    expect(table.columns[2].nullability.explicit).toBe('UNSPECIFIED');
  });

  it('does not invent tables or change a declaration from ALTER/DROP/DO/function bodies', () => {
    const text = 'CREATE TABLE t(id text);ALTER TABLE t ADD COLUMN secret text;DROP TABLE t;DO $$ BEGIN EXECUTE \'CREATE TABLE fake(x int)\'; END $$;CREATE FUNCTION f() RETURNS void AS $$ BEGIN NULL; END $$ LANGUAGE plpgsql;';
    const result = parseDdlDeclarations(text);
    expect(result.tables.map(t => t.name.normalized)).toEqual([['t']]);
    expect(result.tables[0].columns.map(c => c.name.normalized)).toEqual(['id']);
    expect(result.unresolved.map(s => s.code)).toEqual(['ALTER_NOT_REDUCED', 'DROP_NOT_REDUCED', 'BODY_NOT_INTERPRETED', 'UNSUPPORTED_CREATE_FORM']);
    expect(result.unresolved[2].raw).toContain('CREATE TABLE fake');
    expect(result.effectiveSchema).toBe('NOT_COMPUTED');
    expect(result.tenantOwnership).toBe('NOT_CLASSIFIED');
  });

  it.each([
    'CREATE TABLE x AS SELECT 1;',
    'CREATE TABLE x(LIKE parent INCLUDING ALL);',
    'CREATE TABLE x PARTITION OF parent FOR VALUES IN (1);',
    'CREATE TABLE x(id text) INHERITS(parent);',
    'CREATE TABLE x(id text GENERATED ALWAYS AS (1) STORED);',
    'CREATE TABLE x(id text COLLATE "C");',
  ])('preserves unsupported CREATE form without guessed columns: %s', text => {
    const result = parseDdlDeclarations(text);
    expect(result.tables).toEqual([]);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0].raw).toBe(text);
    expect(result.diagnostics[0].severity).toBe('UNSUPPORTED');
  });

  it.each([
    ['CREATE TABLE x(id text;', 'DDL_UNBALANCED_DELIMITER'],
    ['CREATE TABLE x(id text, "id" integer);', 'DDL_DUPLICATE_COLUMN'],
    ['CREATE TABLE x(id text, FOREIGN KEY(id) REFERENCES y(a,b));', 'DDL_FOREIGN_KEY_ARITY'],
    ['CREATE TABLE x(id text, PRIMARY KEY(missing));', 'DDL_UNKNOWN_LOCAL_COLUMN'],
    ['CREATE TABLE x(id text NOT NULL NULL);', 'DDL_CONFLICTING_NULLABILITY'],
  ])('reports malformed declarations explicitly: %s', (text, code) => {
    const result = parseDdlDeclarations(text);
    expect(result.tables).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code, severity: 'ERROR' }));
    expect(result.unresolved[0].raw).toBe(text);
  });

  it('preserves duplicate CREATE declarations rather than reducing them to an active schema', () => {
    const result = parseDdlDeclarations('CREATE TABLE x(id text);CREATE TABLE IF NOT EXISTS x(other int);');
    expect(result.tables.map(t => t.columns[0].name.normalized)).toEqual(['id', 'other']);
    expect(result.effectiveSchema).toBe('NOT_COMPUTED');
  });

  it('binds declaration, identifier, type and constraint spans to raw UTF-8 source', () => {
    const text = '-- é\r\nCREATE TABLE "Ü"."T" (\r\n "名" text DEFAULT \'😀\' NOT NULL,\r\n CONSTRAINT "clé" UNIQUE("名")\r\n);';
    const table = parseDdlDeclarations(text).tables[0];
    checkSpan(text, table.span, table.raw);
    checkSpan(text, table.name.span, table.name.raw);
    checkSpan(text, table.columns[0].span, table.columns[0].raw);
    checkSpan(text, table.columns[0].name.span, table.columns[0].name.raw);
    checkSpan(text, table.columns[0].dataType.span, table.columns[0].dataType.raw);
    for (const constraint of table.constraints) checkSpan(text, constraint.span, constraint.raw);
    expect(table.span).toMatchObject({ startLine: 2, endLine: 5 });
    expect(table.columns[0].span).toMatchObject({ startLine: 3, endLine: 3 });
    expect(table.name.normalized).toEqual(['Ü', 'T']);
  });

  it('fails closed on lexical errors and never treats dollar-body text as a declaration', () => {
    const text = "CREATE TABLE x(id text DEFAULT 'broken);";
    const result = parseDdlDeclarations(text);
    expect(result.tables).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNTERMINATED_STRING', severity: 'ERROR' }));
    expect(result.unresolved[0].raw).toBe(text);
  });

  it('keeps a terminal CRLF on its preceding line in unresolved source/diagnostic spans', () => {
    const text = 'CREATE TABLE x(id text /* broken\r\n';
    const result = parseDdlDeclarations(text);
    expect(result.unresolved[0].span).toMatchObject({ startLine: 1, endLine: 1 });
    expect(result.diagnostics[0].span).toMatchObject({ startLine: 1, endLine: 1 });
    checkSpan(text, result.unresolved[0].span, text);
  });
});

describe('read-only pinned M0 migration declaration regressions', () => {
  let migrations: Map<string, string>;
  beforeAll(() => {
    const pinned = loadPinnedMigrations({
      repo: fileURLToPath(new URL('../../../../', import.meta.url)),
      source: '7c628e374f03c9025b2c0cfd3568be033f07238d',
      tree: '5a2df7788b4a5f52b77b1273bedd59e191438379',
    });
    migrations = new Map(pinned.migrations.map(m => [m.path, m.text]));
  });
  const read = (path: string) => parseDdlDeclarations(migrations.get(path)!);
  it('extracts employee nullability/location FK without inventing workspace ALTER results', () => {
    const initial = read('db/migrations/0001_initial.sql');
    const employee = initial.tables.find(t => t.name.normalized[0] === 'employees')!;
    expect(employee.columns.find(c => c.name.normalized === 'phone')!.nullability.explicit).toBe('NOT_NULL');
    expect(employee.columns.find(c => c.name.normalized === 'email')!.nullability.explicit).toBe('UNSPECIFIED');
    expect(employee.columns.some(c => c.name.normalized === 'workspace_id')).toBe(false);
    const location = keys(employee, 'FOREIGN_KEY').find(c => values(c.columns)[0] === 'primary_location_id')!;
    expect(location.reference?.table.normalized).toEqual(['locations']);
    expect(values(location.reference!.columns!)).toEqual(['id']);
    const expansion = read('db/migrations/0008_workspace_positions.sql');
    expect(expansion.unresolved.some(s => s.code === 'ALTER_NOT_REDUCED' && s.raw.includes('workspace_id'))).toBe(true);
  });
  it('retains the actual Clocker composite device/location FK and nullable clock-out field', () => {
    const table = read('db/migrations/0005_time_clock.sql').tables.find(t => t.name.normalized[0] === 'time_entries')!;
    const fk = keys(table, 'FOREIGN_KEY').find(c => c.columns.length === 2)!;
    expect(values(fk.columns)).toEqual(['device_id', 'location_id']);
    expect(fk.reference?.table.normalized).toEqual(['clocker_devices']);
    expect(values(fk.reference!.columns!)).toEqual(['id', 'location_id']);
    expect(table.columns.find(c => c.name.normalized === 'clock_out_at')!.dataType.raw).toBe('timestamptz');
    expect(table.columns.find(c => c.name.normalized === 'clock_out_at')!.nullability.explicit).toBe('UNSPECIFIED');
  });
  it('retains communication receipt five-column FK order without inventing a direct employee FK', () => {
    const table = read('db/migrations/0024_contextual_communications.sql').tables.find(t => t.name.normalized[0] === 'communication_receipts')!;
    const fk = keys(table, 'FOREIGN_KEY')[0];
    expect(values(fk.columns)).toEqual(['workspace_id', 'communication_id', 'revision_id', 'employee_id', 'content_hash']);
    expect(fk.reference?.table.normalized).toEqual(['communication_recipients']);
    expect(values(fk.reference!.columns!)).toEqual(['workspace_id', 'communication_id', 'revision_id', 'employee_id', 'content_hash']);
    expect(keys(table, 'FOREIGN_KEY').some(c => c.reference?.table.normalized[0] === 'employees')).toBe(false);
  });
  it('captures calendar arrays/singleton PK/removal RESTRICT references without tenant classification', () => {
    const result = read('db/migrations/0025_calendar_subscriptions.sql');
    const clock = result.tables.find(t => t.name.normalized[0] === 'calendar_clock')!;
    expect(clock.columns[0].name.normalized).toBe('singleton');
    expect(clock.columns[0].dataType.raw).toBe('boolean');
    expect(clock.columns[0].nullability.primaryKey).toBe(true);
    const subscriptions = result.tables.find(t => t.name.normalized[0] === 'calendar_subscriptions')!;
    expect(subscriptions.columns.find(c => c.name.normalized === 'allowed_location_ids')!.dataType.raw).toBe('text[]');
    const removals = result.tables.find(t => t.name.normalized[0] === 'calendar_removals')!;
    expect(keys(removals, 'FOREIGN_KEY').filter(c => c.reference?.optionsRaw === 'ON DELETE RESTRICT').map(c => c.reference?.table.normalized[0])).toEqual(['schedule_publication_revision_shifts', 'schedule_publication_revisions']);
    expect(result.tenantOwnership).toBe('NOT_CLASSIFIED');
  });
  it('captures all currently pinned CREATE declarations with columns while retaining unresolved operations', () => {
    const journals = [...migrations.values()].map(parseDdlDeclarations);
    expect(journals.flatMap(j => j.tables)).toHaveLength(68);
    expect(journals.flatMap(j => j.unresolved).filter(s => s.kind === 'CREATE_TABLE')).toEqual([]);
    expect(journals.flatMap(j => j.tables).every(t => t.columns.length > 0 && t.columns.every(c => c.dataType.raw.length > 0))).toBe(true);
    expect(journals.some(j => j.unresolved.some(s => s.code === 'BODY_NOT_INTERPRETED'))).toBe(true);
    expect(journals.every(j => j.effectiveSchema === 'NOT_COMPUTED')).toBe(true);
  });
});
