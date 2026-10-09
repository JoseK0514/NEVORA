import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { EmployeeCsvLimits, EmployeeCsvMapping, EmployeeCsvPreviewSnapshot } from './csv';

const implementationPath = './csv';
const implementation: typeof import('./csv') | null = await import(implementationPath).catch(() => null);
const headers = ['Number', 'First', 'Last', 'Phone', 'Email', 'Role', 'Primary', 'Eligible', 'Positions'];
const fields = ['employeeNumber', 'firstName', 'lastName', 'phone', 'email', 'role', 'primaryLocationCode', 'eligibleLocationCodes', 'positionCodes'] as const;
const mapping: EmployeeCsvMapping = { version: 'F9-CSV-MAPPING-1', columns: fields.map((field, column) => ({ column, header: headers[column], field })) };
const limits = { maxBytes: 2 * 1024 * 1024, maxRows: 500, maxColumns: 20, maxCellCodePoints: 4096 } as const;
const first = 'E1,Éna,José,1 (787) 555-0100,Ena@example.test,,L1,L1; L2; L2,P1';
const document = (...rows: string[]) => headers.join(',') + '\n' + (rows.length ? rows.join('\n') : first);
const parse = (csv = document(), selected = mapping, bounded: EmployeeCsvLimits = limits) => implementation?.parseEmployeeCsv(csv, selected, bounded);
function canonical(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v !== null && typeof v === 'object') return '{' + Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, x]) => JSON.stringify(k) + ':' + canonical(x)).join(',') + '}';
  return JSON.stringify(v);
}
const hash = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex');
function snapshot(csv = document()): EmployeeCsvPreviewSnapshot {
  const binding = { workspaceId: 'tenant-a', workspaceCode: 'workspace-a', actorId: 'owner-a', purpose: 'EMPLOYEE_IMPORT_PREVIEW' as const,
    sourceVersion: 'source-1', catalogVersion: 'catalog-1', configurationVersion: 'config-1', namespaceVersion: 'namespace-1',
    schemaVersion: 'schema-1', sessionVersion: 'session-1', grantsVersion: 'grants-1', scopeVersion: 'scope-1', incarnation: '1' };
  const parsed = parse(csv); if (!parsed) throw Error('CSV module missing');
  const record: EmployeeCsvPreviewSnapshot['record'] = { binding, createdAt: '2026-10-09T14:00:00Z', csv, mapping: structuredClone(mapping), limits: { ...limits },
    catalogs: { complete: true, locations: [{ id: 'L1', code: 'L1', workspaceId: 'tenant-a', active: true }, { id: 'L2', code: 'L2', workspaceId: 'tenant-a', active: true }],
      positions: [{ id: 'P1', code: 'P1', workspaceId: 'tenant-a', active: true }] },
    namespace: { complete: true, numbers: [] },
    emailComparisons: parsed.normalizedRowsDigest === null ? null : { binding, normalizedRowsDigest: parsed.normalizedRowsDigest, complete: true,
      mode: 'ACTUAL_DATABASE_COMPARISON' as const, snapshotId: 'sql-snapshot-1', contractId: 'employees.email_ci' as const,
      expression: 'lower(email)' as const, comparatorSourceDigest: 'a'.repeat(64), collationDigest: 'b'.repeat(64),
      rows: parsed.rows.filter(r => r.normalized.email !== null && !r.errors.some(e => e.field === 'email')).map(r => ({ rowNumber: r.rowNumber, inputEmail: r.normalized.email!,
        expressionValue: 'SQL-observed-value-' + r.rowNumber, comparisonClass: 'SQL-class-' + r.rowNumber, conflictsExisting: false })) } };
  const v: EmployeeCsvPreviewSnapshot = { actor: { workspaceId: binding.workspaceId, actorId: binding.actorId, role: 'OWNER', portalState: 'ENABLED',
    workspaceActive: true, workforceActive: true, membershipCurrent: true, sessionCurrent: true, grantsCurrent: true,
    previewAllowed: true, errorDownloadAllowed: true, permittedFields: ['employee.identity', 'employee.contact', 'employee.role', 'employee.eligibility', 'employee.positions', 'csv.contacts'],
    expiresAt: '2026-10-09T15:00:00Z' },
    current: { ...binding, now: '2026-10-09T14:00:00Z', observedAt: '2026-10-09T14:00:00Z', expiresAt: '2026-10-09T14:00:30Z', sourceCurrent: true,
      complete: true, previewCreatedAt: record.createdAt, normalizedRowsDigest: parsed.normalizedRowsDigest, mappingDigest: hash(record.mapping), catalogDigest: hash(record.catalogs),
      namespaceDigest: hash(record.namespace), emailComparisonDigest: hash(record.emailComparisons) }, record };
  return v;
}
function rebind(v: EmployeeCsvPreviewSnapshot) {
  v.current.mappingDigest = hash(v.record.mapping); v.current.catalogDigest = hash(v.record.catalogs);
  v.current.namespaceDigest = hash(v.record.namespace); v.current.emailComparisonDigest = hash(v.record.emailComparisons);
}
const preview = (v: unknown) => implementation?.prepareEmployeeCsvPreview(v);

describe('F9 strict parser and explicit mapping', () => {
  it('exports the approved pure parser and no commitment service', () => {
    expect(implementation?.parseEmployeeCsv).toBeTypeOf('function'); expect(Object.keys(implementation ?? {})).not.toContain('commitEmployeeImport');
  });
  it('normalizes new numbers/NANP contacts with exact approved defaults and no credentials', () => {
    const p = parse(document(first.replace('E1,', ' e1 ,')))!;
    expect(p.state).toBe('parsed'); expect(p.rows[0].normalized).toMatchObject({ employeeNumber: 'E1', firstName: 'Éna', lastName: 'José', phone: '787-555-0100',
      email: 'Ena@example.test', role: 'EMPLOYEE', primaryLocationCode: 'L1', eligibleLocationCodes: ['L1', 'L2'], positionCodes: ['P1'] });
    expect(p.batchMode).toBe('ATOMIC_CREATE_ONLY'); expect(p.noMutation).toBe(true);
  });
  it('decodes strict UTF8 with optional BOM without a replacement fallback', () => {
    const good = new TextEncoder().encode('\uFEFF' + document()); const decoded = implementation?.decodeEmployeeCsvUpload(good);
    expect(decoded?.state).toBe('decoded'); if (decoded?.state === 'decoded') expect(parse(decoded.csv)?.state).toBe('parsed');
    for (const bytes of [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [0x80], [0xe2, 0x82]]) expect(implementation?.decodeEmployeeCsvUpload(new Uint8Array(bytes))).toMatchObject({ state: 'invalid', issue: { code: 'INVALID_UTF8' } });
  });
  it.each(['\ud800', '\udc00'])('rejects unpaired UTF16 %s rather than encoding a replacement', invalid => {
    expect(parse(document(first.replace('Éna', invalid)))?.issues.some(i => i.code === 'INVALID_UTF8')).toBe(true);
  });
  it('supports LF/CRLF, quoted commas/escaped quotes and tracks physical lines for multiline records', () => {
    const p = parse(document('E1,"Éna, ""J""",José,7875550100,,,L1,,', 'E2,"line\nname",José,7875550101,,,L1,,').replaceAll('\n', '\r\n'))!;
    expect(p.rows[0].normalized.firstName).toBe('Éna, "J"'); expect(p.rows[1]).toMatchObject({ rowNumber: 3, lineStart: 3, lineEnd: 4 });
    expect(p.rows[1].errors.some(e => e.code === 'INVALID_NAME')).toBe(true);
  });
  it.each(['E1,"open', 'E1,a"b,c', 'E1,"a" x,c', 'E1,a\rb,c'])('rejects strict format error %s without raw content in diagnostics', row => {
    const p = parse(document(row))!; expect(p.state).toBe('invalid'); expect(p.issues.length).toBeGreaterThan(0); expect(JSON.stringify(p.issues)).not.toContain(row);
  });
  it('ignores only entirely blank trailing physical lines, preserving an interior blank record and comma-only rows', () => {
    const p = parse(document(first) + '\n\n  \n')!; expect(p.rows).toHaveLength(1);
    expect(parse(document(first) + '\n\n' + first.replace('E1', 'E2'))?.rows).toHaveLength(3);
    expect(parse(document(first) + '\n,,,,,,,,')?.rows).toHaveLength(2);
  });
  it('buffers only a bounded number of possible interior records when an upload has many trailing blank lines', () => {
    let rawRecordsPushed = 0; const original = Array.prototype.push;
    Array.prototype.push = function(this: unknown[], ...values: unknown[]) {
      for (const v of values) if (v && typeof v === 'object' && Array.isArray((v as { cells?: unknown }).cells) && typeof (v as { blankLine?: unknown }).blankLine === 'boolean') rawRecordsPushed++;
      return Reflect.apply(original, this, values);
    };
    let p: ReturnType<typeof parse>;
    try { p = parse(document() + '\n'.repeat(30_000)); } finally { Array.prototype.push = original; }
    expect(p?.state).toBe('parsed'); expect(p?.rows).toHaveLength(1); expect(rawRecordsPushed).toBeLessThanOrEqual(2 * limits.maxRows + 2);
  });
  it('counts interior blank records at500 exactly and preserves original syntax diagnostics after deferred lines', () => {
    const p = parse(document() + '\n'.repeat(499) + first.replace('E1', 'E2'))!;
    expect(p.rows).toHaveLength(500); expect(p.rows.at(-1)).toMatchObject({ rowNumber: 501, lineStart: 501 });
    const tooMany = parse(document() + '\n'.repeat(500) + first.replace('E1', 'E2'))!;
    expect(tooMany.issues).toContainEqual(expect.objectContaining({ code: 'ROW_LIMIT', rowNumber: 502 }));
    const malformed = parse(document() + '\n'.repeat(10) + 'E2,"open')!;
    expect(malformed.issues).toContainEqual(expect.objectContaining({ code: 'CSV_FORMAT', rowNumber: 12, line: 12 }));
  });
  it('uses an explicit arbitrary source label for employeeNumber without treating it as an internal employee ID field', () => {
    const m = structuredClone(mapping); m.columns[0].header = 'Employee ID';
    const p = parse(document().replace('Number,', 'Employee ID,'), m)!;
    expect(p.state).toBe('parsed'); expect(p.rows[0].normalized.employeeNumber).toBe('E1');
    expect(Object.keys(p.rows[0].normalized)).not.toContain('employeeId');
  });
  it('rejects all unmapped columns until explicitly excluded, retaining excluded names but never cell contents', () => {
    const csv = document().replace(headers.join(','), headers.join(',') + ',Notes').replace(first, first + ',PRIVATE_NOTE');
    expect(parse(csv)?.issues.some(i => i.code === 'UNMAPPED_COLUMN')).toBe(true);
    const m = structuredClone(mapping); m.columns.push({ column: 9, header: 'Notes', field: null }); const p = parse(csv, m)!;
    expect(p.state).toBe('parsed'); expect(p.excludedColumns).toEqual([{ column: 9, name: 'Notes' }]); expect(JSON.stringify(p)).not.toContain('PRIVATE_NOTE');
  });
  it.each(['password', 'PasswordHash', 'activation', 'PIN', 'token', 'salary', 'attendanceScore', 'leaveReason', 'personalNote', 'administrativeScope', 'externalMessageFlag'])('explicitly rejects known forbidden %s even if excluded without echoing secret values', name => {
    const csv = document().replace(headers.join(','), headers.join(',') + ',' + name).replace(first, first + ',SECRET_SENTINEL');
    const m = structuredClone(mapping); m.columns.push({ column: 9, header: name, field: null }); const p = parse(csv, m)!;
    expect(p.state).toBe('invalid'); expect(p.issues.some(i => i.code === 'FORBIDDEN_COLUMN' && i.column === 9)).toBe(true); expect(JSON.stringify(p)).not.toContain('SECRET_SENTINEL');
  });
  it('requires exact header/ordinal mappings with required fields and no duplicate target/column', () => {
    for (const mutate of [(m: EmployeeCsvMapping) => { m.columns[0].header = 'wrong'; }, (m: EmployeeCsvMapping) => { m.columns[0].column = 1; },
      (m: EmployeeCsvMapping) => { m.columns[0].field = null; }, (m: EmployeeCsvMapping) => { m.columns[1].field = 'lastName'; }]) {
      const m = structuredClone(mapping); mutate(m); expect(parse(document(), m)?.state).toBe('invalid');
    }
  });
  it('shows duplicate header labels as ambiguous while exact ordinal mapping resolves their selection', () => {
    const m = structuredClone(mapping); m.columns[1].header = 'Name'; m.columns[2].header = 'Name';
    const p = parse(document().replace('First,Last', 'Name,Name'), m)!; expect(p.state).toBe('parsed');
    expect(p.headers.filter(h => h.ambiguous)).toEqual([{ column: 1, name: 'Name', ambiguous: true }, { column: 2, name: 'Name', ambiguous: true }]);
  });
  it('accepts exactly500 rows and rejects501 without silent chunking', () => {
    const row = (n: number) => `E${n},Ena,José,7875550100,,,L1,,`;
    expect(parse(document(...Array.from({ length: 500 }, (_, n) => row(n))))?.state).toBe('parsed');
    const p = parse(document(...Array.from({ length: 501 }, (_, n) => row(n))))!; expect(p.state).toBe('invalid'); expect(p.issues.some(i => i.code === 'ROW_LIMIT')).toBe(true);
  });
  it('enforces2MiB encoded bytes and20 columns, before returning proposed partial rows', () => {
    expect(parse('x'.repeat(limits.maxBytes + 1))?.issues.some(i => i.code === 'BYTE_LIMIT')).toBe(true);
    expect(parse('🙂'.repeat(limits.maxBytes / 4 + 1))?.issues.some(i => i.code === 'BYTE_LIMIT')).toBe(true);
    expect(parse(Array.from({ length: 21 }, (_, n) => 'C' + n).join(','))?.issues.some(i => i.code === 'COLUMN_LIMIT')).toBe(true);
  });
  it('accepts exactly2MiB with bounded excluded cells and rejects one added byte, without retaining excluded content', () => {
    const m = structuredClone(mapping); m.columns.push({ column: 9, header: 'Extra A', field: null }, { column: 10, header: 'Extra B', field: null });
    const lines = Array.from({ length: 500 }, (_, n) => `E${n},Ena,Jose,7875550100,,,L1,,,${'x'.repeat(4000)},${'y'.repeat(120)}`);
    const header = headers.join(',') + ',Extra A,Extra B'; let remaining = limits.maxBytes - Buffer.byteLength(header + '\n' + lines.join('\n'));
    for (let n = 0; remaining > 0; n++) { const add = Math.min(4096 - 120, remaining); lines[n] += 'y'.repeat(add); remaining -= add; }
    const csv = header + '\n' + lines.join('\n'); expect(Buffer.byteLength(csv)).toBe(limits.maxBytes);
    expect(parse(csv, m)?.state).toBe('parsed'); expect(parse(csv + 'z', m)?.issues.some(i => i.code === 'BYTE_LIMIT')).toBe(true);
    expect(implementation?.decodeEmployeeCsvUpload(new TextEncoder().encode(csv + 'z'))).toMatchObject({ state: 'invalid', issue: { code: 'BYTE_LIMIT' } });
  });
  it('accepts20 explicit columns, exact name/number/email bounds, and rejects larger or changed limit contracts', () => {
    const m = structuredClone(mapping); const extra = Array.from({ length: 11 }, (_, n) => 'Extra ' + n);
    extra.forEach((header, n) => m.columns.push({ column: n + 9, header, field: null }));
    const csv = document(first.replace('E1', 'A'.repeat(128)).replace('Éna', '🙂'.repeat(160)).replace('Ena@example.test', 'x'.repeat(252) + '@a'))
      .replace(headers.join(','), headers.join(',') + ',' + extra.join(',')) + ','.repeat(11);
    expect(parse(csv, m)?.state).toBe('parsed');
    expect(parse(document(), mapping, { ...limits, maxRows: 501 })?.issues.some(i => i.code === 'INVALID_LIMITS')).toBe(true);
  });
  it('counts escaped quotes and CRLF inside one parsed cell accurately at the cell boundary', () => {
    const m = structuredClone(mapping); m.columns.push({ column: 9, header: 'Extra', field: null });
    const file = (count: number) => document().replace(headers.join(','), headers.join(',') + ',Extra') + ',"' + '""'.repeat(count) + '"';
    expect(parse(file(4096), m)?.state).toBe('parsed'); expect(parse(file(4097), m)?.issues.some(i => i.code === 'CELL_LIMIT')).toBe(true);
  });
  it('counts cell limits as Unicode code points before lower field limits', () => {
    const p = parse(document(first.replace('Éna', '🙂'.repeat(4096))))!; expect(p.rows[0].errors.some(i => i.code === 'INVALID_NAME')).toBe(true); expect(p.issues.some(i => i.code === 'CELL_LIMIT')).toBe(false);
    expect(parse(document(first.replace('Éna', '🙂'.repeat(4097))))?.issues.some(i => i.code === 'CELL_LIMIT')).toBe(true);
  });
  it.each(['MANAGER', 'OWNER', 'ADMIN'])('rejects bulk role %s while retaining the literal mapped role for correction', role => {
    const p = parse(document(first.replace(',,L1', ',' + role + ',L1')))!; expect(p.rows[0].errors.some(i => i.code === 'INVALID_ROLE')).toBe(true); expect(p.rows[0].mapped.role).toBe(role);
  });
  it('permits LEAD and optional blank contacts/catalog lists with primary visibly included', () => {
    const p = parse(document('E1,Éna,José,7875550100,,LEAD,L1,, '))!; expect(p.rows[0].normalized).toMatchObject({ role: 'LEAD', email: null, eligibleLocationCodes: ['L1'], positionCodes: [] });
    expect(p.rows[0].warnings.some(w => w.code === 'PRIMARY_INCLUDED')).toBe(true);
  });
  it.each(['id space', 'A'.repeat(129), '=E1'])('rejects invalid new number %s', number => {
    expect(parse(document(first.replace('E1', number)))?.rows[0].errors.some(i => i.code === 'INVALID_NUMBER')).toBe(true);
  });
  it.each(['Ena\u0000', 'Ena\u200B', 'x'.repeat(161)])('rejects name controls/limit %s without truncation', name => {
    expect(parse(document(first.replace('Éna', name)))?.rows[0].errors.some(i => i.code === 'INVALID_NAME')).toBe(true);
  });
  it.each(['787555010012', '7875550100 ext', '447875550100'])('rejects phone extension/truncation/country inference %s', phone => {
    expect(parse(document(first.replace('1 (787) 555-0100', phone)))?.rows[0].errors.some(i => i.code === 'INVALID_PHONE')).toBe(true);
  });
  it.each(['a@@b', '@domain', 'a@', 'a b@c', 'x'.repeat(250) + '@abcde', 'a\u200B@b'])('uses existing email syntax/254 codepoint/control limits %s', email => {
    expect(parse(document(first.replace('Ena@example.test', email)))?.rows[0].errors.some(i => i.code === 'INVALID_EMAIL')).toBe(true);
  });
  it('rejects normalized number duplicates on every involved row, never merges identical records', () => {
    const p = parse(document(first, first.replace('E1', ' e1 ')))!; expect(p.state).toBe('invalid'); expect(p.rows.every(r => r.errors.some(i => i.code === 'FILE_NUMBER_DUPLICATE'))).toBe(true);
  });
  it('warns on shared names/phones without making contacts identity or rejecting creation', () => {
    const p = parse(document(first, first.replace('E1', 'E2').replace('Ena@example.test', 'Other@example.test')))!;
    expect(p.state).toBe('parsed'); expect(p.rows.every(r => r.warnings.some(w => w.code === 'SHARED_PHONE'))).toBe(true);
  });
});

describe('F9 pure source-bound preview and safe error DTO', () => {
  it('binds the immutable preview creation observation rather than extending authority after activity', () => {
    const v = snapshot(); Object.assign(v.current, { previewCreatedAt: v.record.createdAt });
    v.current.now = '2026-10-09T14:10:00Z'; v.current.observedAt = v.current.now; v.current.expiresAt = '2026-10-09T14:11:00Z'; v.record.createdAt = '2026-10-09T14:05:00Z';
    expect(preview(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('keeps business payload stable across fresh authority while binding the new grant/session in the preview fingerprint', () => {
    const original = snapshot(), next = snapshot();
    next.record.binding.grantsVersion = next.current.grantsVersion = 'new-grants'; next.record.binding.sessionVersion = next.current.sessionVersion = 'new-session'; rebind(next);
    const a = preview(original), b = preview(next); if (a?.state !== 'ready' || b?.state !== 'ready') throw Error('expected ready');
    expect(b.payloadDigest).toBe(a.payloadDigest); expect(b.previewDigest).not.toBe(a.previewDigest);
  });
  it('shows both primary and eligible location counts with explicit meaning', () => {
    const p = preview(snapshot()); if (p?.state !== 'ready') throw Error('expected ready');
    expect(p.locationSummary).toEqual([{ locationId: 'L1', primaryCount: 1, eligibleCount: 1 }, { locationId: 'L2', primaryCount: 0, eligibleCount: 1 }]);
  });
  it.each(['\u0000=1', '\u200B=1', '  +NAME', '-NAME', '@NAME', '\t=1'])('escapes spreadsheet formula/control prefix %s as literal authorized error data', name => {
    const v = snapshot(document(first.replace('Éna', name).replace('E1', '=bad'))); const p = implementation?.prepareEmployeeCsvErrorDownload(v);
    expect(p?.state).toBe('prepared'); if (p?.state !== 'prepared') throw Error('expected prepared'); expect(p.rows.flat()).toContain("'" + name);
  });
  it('shows authenticated syntax/mapping errors with no normalized row set, no SQL fallback and no partial proposal', () => {
    const v = snapshot(document('E1,"unterminated')); const p = preview(v);
    expect(p?.state).toBe('invalid'); if (p?.state !== 'invalid') throw Error('expected invalid');
    expect(p.issues.some(i => i.code === 'CSV_FORMAT')).toBe(true); expect(p.rows).toEqual([]); expect(p.summary).toEqual({ newRecords: 0, invalid: 0, conflicting: 0 });
    expect(implementation?.prepareEmployeeCsvErrorDownload(v)?.state).toBe('prepared');
  });
  it('preserves field-specific invalid-email diagnostics without requiring an SQL comparison for invalid input', () => {
    const v = snapshot(document(first.replace('Ena@example.test', 'bad@@email'))); const p = preview(v);
    expect(p?.state).toBe('invalid'); if (p?.state !== 'invalid') throw Error('expected invalid'); expect(p.rows[0].errors.some(e => e.code === 'INVALID_EMAIL')).toBe(true);
  });
  it('rejects inconsistent SQL expression/classes for exact identical email inputs without JS normalization', () => {
    const v = snapshot(document(first, first.replace('E1', 'E2')));
    expect(preview(v)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('rejects inconsistent SQL existing-collision flags inside one captured equality class', () => {
    const v = snapshot(document(first, first.replace('E1', 'E2').replace('Ena@example.test', 'other@example.test')));
    v.record.emailComparisons!.rows.forEach(r => r.comparisonClass = 'one-SQL-class'); v.record.emailComparisons!.rows[0].conflictsExisting = true; rebind(v);
    expect(preview(v)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('keeps valid identical-email duplicate observations conflicting on every involved row', () => {
    const v = snapshot(document(first, first.replace('E1', 'E2'))); const facts = v.record.emailComparisons!.rows;
    facts[1].expressionValue = facts[0].expressionValue; facts[1].comparisonClass = facts[0].comparisonClass; rebind(v);
    const p = preview(v); expect(p?.state).toBe('invalid'); if (p?.state !== 'invalid') throw Error('expected invalid'); expect(p.summary.conflicting).toBe(2);
  });
  it('rejects unsupported hidden mapping fields instead of silently hashing an alternate contract', () => {
    const m = structuredClone(mapping); Object.assign(m.columns[0], { password: 'SECRET_SENTINEL' });
    const p = parse(document(), m)!; expect(p.state).toBe('invalid'); expect(JSON.stringify(p)).not.toContain('SECRET_SENTINEL');
  });
  it('returns only all-batch proposals, exact role/catalog summary, ACTIVE/DISABLED and no mutation authority', () => {
    const v = snapshot(); const p = preview(v); expect(p?.state).toBe('ready');
    if (p?.state !== 'ready') throw Error('expected ready');
    expect(p.summary).toEqual({ newRecords: 1, invalid: 0, conflicting: 0 }); expect(p.rows[0].draft).toMatchObject({ role: 'EMPLOYEE', primaryLocationId: 'L1', eligibleLocationIds: ['L1', 'L2'], positionIds: ['P1'], workforceState: 'ACTIVE', portalState: 'DISABLED' });
    expect(p.expiresAt).toBe('2026-10-09T14:30:00Z'); expect(p.commitAuthority).toBe('NOT_ISSUED'); expect(p.batchMode).toBe('ATOMIC_CREATE_ONLY'); expect(JSON.stringify(p)).not.toMatch(/passwordHash|employeeId|calendarUrl|activationIntent/);
  });
  it.each(['MANAGER', 'LEAD', 'EMPLOYEE'] as const)('denies bulk preview to %s without private counts', role => {
    const v = snapshot(); v.actor.role = role; expect(preview(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it.each(['DISABLED', 'PROOF_PENDING', 'SUSPENDED'] as const)('denies portal state %s', state => {
    const v = snapshot(); v.actor.portalState = state; expect(preview(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it.each(['workspaceActive', 'workforceActive', 'membershipCurrent', 'sessionCurrent', 'grantsCurrent', 'previewAllowed'] as const)('fails closed after current %s is lost', field => {
    const v = snapshot(); v.actor[field] = false; expect(preview(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it.each(['sourceVersion', 'catalogVersion', 'configurationVersion', 'namespaceVersion', 'schemaVersion', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation'] as const)('rejects changed current %s before returning a preview', field => {
    const v = snapshot(); v.current[field] += '-new'; expect(preview(v)).toEqual({ state: 'conflict', nextAction: 'REPREVIEW' });
  });
  it.each(['normalizedRowsDigest', 'mappingDigest', 'catalogDigest', 'namespaceDigest', 'emailComparisonDigest'] as const)('rejects tampered %s instead of trusting a caller fingerprint', field => {
    const v = snapshot(); v.current[field] = 'f'.repeat(64); expect(preview(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('expires at30minutes exactly without an activity-based extension', () => {
    const v = snapshot(); v.current.now = '2026-10-09T14:30:00Z'; v.current.observedAt = v.current.now; v.current.expiresAt = '2026-10-09T14:31:00Z';
    expect(preview(v)).toEqual({ state: 'expired', nextAction: 'REPREVIEW' });
  });
  it('requires complete current catalog and namespace observations', () => {
    for (const part of ['catalogs', 'namespace', 'emailComparisons'] as const) { const v = snapshot(); v.record[part]!.complete = false; rebind(v); expect(preview(v)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' }); }
  });
  it.each(['sourceCurrent', 'complete'] as const)('returns no rows/counts when the current source %s is false', key => {
    const v = snapshot(); v.current[key] = false; expect(preview(v)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('rejects expired authority and future source observations without disclosing private preview rows', () => {
    const expired = snapshot(); expired.actor.expiresAt = expired.current.now;
    expect(preview(expired)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
    const future = snapshot(); future.current.observedAt = '2026-10-09T14:00:01Z';
    expect(preview(future)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('permits an explicit mapping without optional email or role and requires no database comparison for nonexistent emails', () => {
    const selected: EmployeeCsvMapping = { version: 'F9-CSV-MAPPING-1', columns: mapping.columns.filter(c => !['email', 'role'].includes(c.field ?? ''))
      .map((c, column) => ({ ...c, column })) };
    const csv = selected.columns.map(c => c.header).join(',') + '\nE1,Éna,José,7875550100,L1,L2,P1';
    const v = snapshot(csv); v.record.mapping = selected; v.record.emailComparisons = null;
    v.current.normalizedRowsDigest = parse(csv, selected)!.normalizedRowsDigest; rebind(v);
    const p = preview(v); expect(p?.state).toBe('ready'); if (p?.state !== 'ready') throw Error('expected ready');
    expect(p.rows[0].draft).toMatchObject({ email: null, role: 'EMPLOYEE' });
  });
  it.each(['ACTIVE', 'INACTIVE'] as const)('rejects an existing same-tenant %s number without restoring it', state => {
    const v = snapshot(); v.record.namespace.numbers.push({ workspaceId: 'tenant-a', employeeNumber: ' e1 ', normalizedNumber: 'E1', workforceState: state }); rebind(v);
    const p = preview(v); expect(p?.state).toBe('invalid'); if (p?.state !== 'invalid') throw Error('expected invalid'); expect(p.summary).toEqual({ newRecords: 0, invalid: 0, conflicting: 1 }); expect(p.rows[0].errors.some(e => e.code === 'EXISTING_NUMBER')).toBe(true);
  });
  it('uses captured SQL equality classes for file email collisions without JS case-folding', () => {
    const v = snapshot(document(first.replace('Ena@example.test', 'İ@example.test'), first.replace('E1', 'E2').replace('Ena@example.test', 'i@example.test')));
    v.record.emailComparisons!.rows.forEach(r => r.comparisonClass = 'SQL-shared-class'); rebind(v);
    const p = preview(v); expect(p?.state).toBe('invalid'); if (p?.state !== 'invalid') throw Error('expected invalid'); expect(p.rows.every(r => r.errors.some(e => e.code === 'FILE_EMAIL_DUPLICATE'))).toBe(true);
  });
  it('does not invent JS lower-case email conflicts when actual SQL classes differ', () => {
    const v = snapshot(document(first.replace('Ena@example.test', 'İ@example.test'), first.replace('E1', 'E2').replace('Ena@example.test', 'i\u0307@example.test')));
    expect(preview(v)?.state).toBe('ready');
  });
  it('rejects captured existing email conflicts without returning existing identity/contact', () => {
    const v = snapshot(); v.record.emailComparisons!.rows[0].conflictsExisting = true; rebind(v); const p = preview(v);
    expect(p?.state).toBe('invalid'); if (p?.state !== 'invalid') throw Error('expected invalid'); expect(p.rows[0].errors.some(e => e.code === 'EXISTING_EMAIL')).toBe(true);
  });
  it('rejects missing/wrong-row/wrong-email/unbound comparison observations without fallback', () => {
    for (const change of [(v: EmployeeCsvPreviewSnapshot) => { v.record.emailComparisons = null; },
      (v: EmployeeCsvPreviewSnapshot) => { v.record.emailComparisons!.rows = []; }, (v: EmployeeCsvPreviewSnapshot) => { v.record.emailComparisons!.rows[0].inputEmail = 'other@example.test'; },
      (v: EmployeeCsvPreviewSnapshot) => { v.record.emailComparisons!.binding = { ...v.record.binding, workspaceId: 'tenant-b' }; }]) {
      const v = snapshot(); change(v); rebind(v); expect(preview(v)?.state).toBe('unavailable');
    }
  });
  it('rejects inactive/unknown/ambiguous catalog codes without fuzzy names or auto-creation', () => {
    for (const change of [(v: EmployeeCsvPreviewSnapshot) => { v.record.catalogs.locations[0].active = false; },
      (v: EmployeeCsvPreviewSnapshot) => { v.record.catalogs.locations[0].code = 'another'; },
      (v: EmployeeCsvPreviewSnapshot) => { v.record.catalogs.locations.push({ id: 'L3', code: 'L1', workspaceId: 'tenant-a', active: true }); }]) {
      const v = snapshot(); change(v); rebind(v); const p = preview(v); expect(p?.state).toBe('invalid');
      if (p?.state !== 'invalid') throw Error('expected invalid'); expect(p.rows[0].errors.some(e => ['CATALOG_CODE_UNAVAILABLE', 'CATALOG_CODE_AMBIGUOUS'].includes(e.code))).toBe(true);
    }
  });
  it('never returns foreign catalog/number/actor fields or counts', () => {
    for (const change of [(v: EmployeeCsvPreviewSnapshot) => { v.record.catalogs.positions[0].workspaceId = 'FOREIGN_SENTINEL'; },
      (v: EmployeeCsvPreviewSnapshot) => { v.record.namespace.numbers.push({ workspaceId: 'FOREIGN_SENTINEL', employeeNumber: 'E1', normalizedNumber: 'E1', workforceState: 'ACTIVE' }); },
      (v: EmployeeCsvPreviewSnapshot) => { v.actor.workspaceId = 'FOREIGN_SENTINEL'; }]) {
      const v = snapshot(); change(v); rebind(v); const p = preview(v); expect(p?.state).toBe('unavailable'); expect(JSON.stringify(p)).not.toContain('FOREIGN_SENTINEL');
    }
  });
  it('any invalid row leaves every valid row merely proposed, never a partial commit subset', () => {
    const v = snapshot(document(first, first.replace('E1', 'E2').replace('Éna', '').replace('Ena@example.test', 'other@example.test'))); const p = preview(v); expect(p?.state).toBe('invalid');
    if (p?.state !== 'invalid') throw Error('expected invalid'); expect(p.summary).toEqual({ newRecords: 1, invalid: 1, conflicting: 0 }); expect(p.commitAuthority).toBe('NOT_ISSUED'); expect(p.rows[0].status).toBe('proposed');
  });
  it('binds exact ordered normalized records/mapping/actor/source/config/grants/catalog and30minute expiry deterministically', () => {
    const v = snapshot(), before = structuredClone(v), a = preview(v), b = preview(v); expect(a).toEqual(b); expect(v).toEqual(before);
    if (a?.state !== 'ready') throw Error('expected ready'); expect(a.payloadDigest).toMatch(/^[a-f0-9]{64}$/); expect(a.previewDigest).toMatch(/^[a-f0-9]{64}$/);
    const newer = snapshot(document(first.replace('Éna', 'Eva'))); const c = preview(newer); if (c?.state !== 'ready') throw Error('expected ready'); expect(c.payloadDigest).not.toBe(a.payloadDigest);
  });
  it('prepares formula-safe error cells only after current same-tenant field/export authorization', () => {
    const v = snapshot(document(first.replace('Éna', '=SUM(1)').replace('E1', '=bad'))); const p = implementation?.prepareEmployeeCsvErrorDownload(v);
    expect(p?.state).toBe('prepared'); if (p?.state !== 'prepared') throw Error('expected prepared'); expect(p.rows.flat()).toContain("'=SUM(1)"); expect(p.rows.flat()).toContain("'=bad");
    const denied = structuredClone(v); denied.actor.errorDownloadAllowed = false; expect(implementation?.prepareEmployeeCsvErrorDownload(denied)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
    denied.actor.errorDownloadAllowed = true; denied.actor.permittedFields = []; expect(implementation?.prepareEmployeeCsvErrorDownload(denied)?.state).toBe('unavailable');
  });
  it.each([null, {}, undefined])('fails closed for malformed observation %s', value => {
    expect(preview(value)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('rejects array/object accessors before executing untrusted getters', () => {
    const v = snapshot(); let calls = 0; Object.defineProperty(v.actor.permittedFields, '0', { get: () => { calls++; return 'csv.contacts'; } });
    expect(preview(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' }); expect(calls).toBe(0);
  });
  it('rejects hidden mandatory execution bindings instead of hashing two different hidden sessions identically', () => {
    const a = snapshot(), b = snapshot();
    Object.defineProperty(a.record.binding, 'sessionVersion', { value: 'hidden-session-a', enumerable: false }); a.current.sessionVersion = 'hidden-session-a'; rebind(a);
    Object.defineProperty(b.record.binding, 'sessionVersion', { value: 'hidden-session-b', enumerable: false }); b.current.sessionVersion = 'hidden-session-b'; rebind(b);
    const x = preview(a), y = preview(b);
    if (x?.state === 'ready' && y?.state === 'ready') expect(x.previewDigest).not.toBe(y.previewDigest);
    expect(x).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' }); expect(y).toEqual(x);
  });
  it.each(['actor', 'current', 'namespace', 'array'] as const)('rejects non-enumerable mandatory %s data before use', part => {
    const v = snapshot();
    if (part === 'actor') Object.defineProperty(v.actor, 'previewAllowed', { value: true, enumerable: false });
    if (part === 'current') Object.defineProperty(v.current, 'sourceVersion', { value: v.current.sourceVersion, enumerable: false });
    if (part === 'namespace') { const n = { workspaceId: 'tenant-a', employeeNumber: 'OTHER', normalizedNumber: 'OTHER', workforceState: 'ACTIVE' as const };
      Object.defineProperty(n, 'employeeNumber', { value: 'OTHER', enumerable: false }); v.record.namespace.numbers = [n]; rebind(v); }
    if (part === 'array') Object.defineProperty(v.actor.permittedFields, '0', { value: v.actor.permittedFields[0], enumerable: false });
    expect(preview(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it.each(['root', 'actor', 'mapping', 'array', 'bytes'] as const)('rejects %s Proxy input without invoking any reflection/read traps', part => {
    const v = snapshot(); let traps = 0;
    const handler = { getPrototypeOf: () => { traps++; throw Error('unexpected prototype trap'); }, ownKeys: () => { traps++; throw Error('unexpected keys trap'); },
      getOwnPropertyDescriptor: () => { traps++; throw Error('unexpected descriptor trap'); }, get: () => { traps++; throw Error('unexpected read trap'); } };
    let value: unknown = v;
    if (part === 'root') value = new Proxy(v, handler);
    if (part === 'actor') v.actor = new Proxy(v.actor, handler);
    if (part === 'mapping') v.record.mapping = new Proxy(v.record.mapping, handler);
    if (part === 'array') v.actor.permittedFields = new Proxy(v.actor.permittedFields, handler);
    if (part === 'bytes') expect(implementation?.decodeEmployeeCsvUpload(new Proxy(new Uint8Array(), handler))).toMatchObject({ state: 'invalid', issue: { code: 'INVALID_UTF8' } });
    else expect(preview(value)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
    expect(traps).toBe(0);
  });
});
