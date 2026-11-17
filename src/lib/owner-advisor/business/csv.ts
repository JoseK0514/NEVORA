import type { BusinessCsvMapping, BusinessVersionInput } from './contracts';
import { BUSINESS_INPUT_BYTES, checkpoint, exact, invalid, normalizeBusinessVersion, object, wellFormed } from './parse';
import { minor } from './money';
const fields = new Set('recordId revision kind accountRef at amountMinor occurredAt postedAt state deltaMinor reconciliationRef recordedAt dueDate confirmation orderRef locationId merchandiseMinor discountMinor taxMinor collectedMinor feeMinor'.split(' '));
export function parseCsvMapping(value: unknown): BusinessCsvMapping {
  const v = object(value); exact(v, 'amountUnit columns constants');
  if (v.amountUnit !== 'MINOR' && v.amountUnit !== 'DECIMAL_MAJOR') return invalid('amountUnit');
  const columns = object(v.columns), constants = object(v.constants);
  if (Object.keys(columns).length > fields.size || Object.keys(constants).length > fields.size) return invalid('mapping');
  const headers = new Set<string>();
  for (const [field, header] of Object.entries(columns)) {
    if (!fields.has(field) || Object.hasOwn(constants, field) || typeof header !== 'string' || !header || header.length > 128 || /[\r\n\x00]/.test(header) || headers.has(header)) return invalid('mapping'); headers.add(header);
  }
  for (const [field, entry] of Object.entries(constants)) if (!fields.has(field) || entry !== null && typeof entry !== 'string') return invalid('mapping');
  return { amountUnit: v.amountUnit, columns: { ...columns } as Record<string, string>, constants: { ...constants } as Record<string, string | null> };
}
function amount(value: string, unit: BusinessCsvMapping['amountUnit']): string {
  if (unit === 'MINOR') { minor(value); return value; }
  if (!/^-?(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(value)) return invalid('decimal_money');
  const negative = value.startsWith('-'), [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const result = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
  if (negative && result === BigInt(0)) return invalid('decimal_money');
  const text = (negative ? -result : result).toString(); minor(text); return text;
}
/** Explicit mapped RFC4180-style input. No formulas, ignored columns or date inference. */
export function parseBusinessCsv(text: string, mappingValue: BusinessCsvMapping, metadata: Omit<BusinessVersionInput, 'records'>, signal?: AbortSignal): BusinessVersionInput {
  checkpoint(signal); if (typeof text !== 'string') return invalid('CSV');
  exact(object(metadata), 'source window sourceAsOf completeness');
  if (text.length > BUSINESS_INPUT_BYTES || new TextEncoder().encode(text).byteLength > BUSINESS_INPUT_BYTES) throw Error('INPUT_LIMIT');
  wellFormed(text);
  const mapping = parseCsvMapping(mappingValue), rows: { fields: string[]; line: number }[] = [];
  let line = 1, rowLine = 1, cell = '', row: string[] = [], quoted = false, closed = false;
  function pushCell() { row.push(cell); cell = ''; closed = false; if (row.length > fields.size) throw Error('INPUT_LIMIT'); }
  function pushRow() { pushCell(); rows.push({ fields: row, line: rowLine }); row = []; if (rows.length > 1001) throw Error('INPUT_LIMIT'); }
  for (let i = 0; i < text.length; i++) {
    if (i % 1024 === 0) checkpoint(signal); const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } }
      else { cell += ch; if (ch === '\n') line++; }
    } else if (ch === '"') { if (cell || closed) return invalid('CSV_quote'); quoted = true; }
    else if (ch === ',') pushCell();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] !== '\n') return invalid('CSV_newline'); if (ch === '\r') i++; pushRow(); line++; rowLine = line; }
    else { if (closed || ch === '\0') return invalid('CSV_quote'); cell += ch; }
  }
  if (quoted) return invalid('CSV_quote'); if (cell || row.length || closed) pushRow();
  if (!rows.length) return invalid('CSV_header'); const headers = rows.shift()!.fields, mapped = Object.values(mapping.columns);
  if (new Set(headers).size !== headers.length || headers.length !== mapped.length || headers.some(h => !mapped.includes(h))) return invalid('CSV_mapping');
  const identities = new Set<string>();
  const records = rows.map((row, index) => {
    checkpoint(signal);
    try {
      if (row.fields.length !== headers.length) return invalid('CSV_columns'); const result: Record<string, unknown> = { ...mapping.constants };
      for (const [field, header] of Object.entries(mapping.columns)) {
        const value = row.fields[headers.indexOf(header)];
        if (value === '' && ['postedAt', 'reconciliationRef'].includes(field)) result[field] = null;
        else if (value !== '') result[field] = field.endsWith('Minor') ? amount(value, mapping.amountUnit) : value;
      }
      const parsed = normalizeBusinessVersion({ ...metadata, records: [result] }, signal).records[0];
      if (identities.has(parsed.recordId)) return invalid('duplicate_record');
      identities.add(parsed.recordId); return parsed;
    } catch (error) {
      checkpoint(signal); const code = error instanceof Error && error.message === 'INPUT_LIMIT' ? 'INPUT_LIMIT' : 'INVALID_CSV_RECORD';
      throw Error(`${code}:row ${index + 2}:line ${row.line}`);
    }
  });
  return normalizeBusinessVersion({ ...metadata, records }, signal);
}
