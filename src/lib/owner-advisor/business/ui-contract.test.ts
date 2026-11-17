import { expect, it } from 'vitest';
import * as contracts from './contracts';
const api = contracts as unknown as Record<string, unknown>;

it('exports the closed public finding and qualifier vocabularies for reviewed UI copy', () => {
  expect(api.BUSINESS_FINDING_CODES).toEqual([
    'RECONCILIATION_DIFFERENCE', 'MISSING_OR_CONFLICTING_ANCHOR', 'SHARED_ACCOUNT_NOT_ALLOCATABLE',
    'BOUNDARY_ANCHOR_CONFLICT', 'PENDING_CASH_EXCLUDED', 'VOID_CASH_EXCLUDED',
    'OUTSIDE_POSTED_WINDOW', 'UNCONFIRMED_OBLIGATION', 'UNCONFIRMED_RECEIVABLE',
  ]);
  expect(api.BUSINESS_QUALIFIER_CODES).toEqual(expect.arrayContaining([
    'OWNER_DECLARED_ACCOUNT_PERIMETER', 'OWNER_REPORTED_COMPLETENESS', 'PARTIAL_NOT_PUBLISHABLE',
    'SOURCE_TIMEZONE_CHANGED_RESTAGE_REQUIRED', 'OWNER_IMPORT_NOT_INDEPENDENTLY_VERIFIED',
    'COMPLETE_LOCATION_CASH_UNAVAILABLE_SHARED_ACCOUNT',
  ]));
  for (const name of ['BUSINESS_FINDING_CODES', 'BUSINESS_QUALIFIER_CODES', 'BUSINESS_UNAVAILABLE_CODES',
    'BUSINESS_VALIDATION_CODES', 'BUSINESS_VALIDATION_FIELDS', 'BUSINESS_ERROR_CODES', 'BUSINESS_SCENARIO_UNAVAILABLE_CODES']) {
    const values = api[name] as string[];
    expect(Array.isArray(values), name).toBe(true);
    expect(new Set(values).size, name).toBe(values.length);
    expect(values.every(v => typeof v === 'string' && v.length > 0), name).toBe(true);
  }
});

it('exposes only business HTTP error codes, with a strict client-safe envelope guard', () => {
  expect(api.BUSINESS_SCENARIO_UNAVAILABLE_CODES).toEqual(['INPUT_LIMIT', 'RESULT_LIMIT', 'NO_RECONCILED_ANCHOR']);
  expect(api.BUSINESS_ERROR_CODES).toEqual(['forbidden', 'invalid', 'conflict', 'limit', 'unavailable', 'cancelled', 'disabled', 'busy']);
  expect(typeof api.isBusinessErrorResult).toBe('function');
  const valid = api.isBusinessErrorResult as (v: unknown) => boolean;
  for (const code of api.BUSINESS_ERROR_CODES as string[]) expect(valid({ state: 'error', code })).toBe(true);
  expect(valid({ state: 'error', code: 'invalid', detail: { code: 'INVALID_INPUT', field: 'duplicate_record', row: 3, line: null } })).toBe(true);
  expect(valid({ state: 'error', code: 'limit', detail: { code: 'INPUT_LIMIT', field: null, row: null, line: 2 } })).toBe(true);
});

it('fails closed on unknown codes, unsafe details, invalid positions and extra envelope fields', () => {
  expect(typeof api.isBusinessErrorResult).toBe('function');
  const valid = api.isBusinessErrorResult as (v: unknown) => boolean;
  for (const value of [null, [], {}, { state: 'saved', code: 'invalid' },
    { state: 'error', code: 'provider_failed' }, { state: 'error', code: 'new_code' },
    { state: 'error', code: 'invalid', raw: 'private' },
    ...[
      { code: 'NEW_DETAIL', field: null, row: null, line: null },
      { code: 'INVALID_INPUT', field: 'raw_financial_value', row: null, line: null },
      { code: 'INVALID_INPUT', field: 'map', row: 0, line: null },
      { code: 'INVALID_INPUT', field: 'map', row: 1.5, line: null },
      { code: 'INVALID_INPUT', field: 'map', row: null, line: -1 },
      { code: 'INVALID_INPUT', field: 'map', row: null, line: null, raw: 'private' },
    ].map(detail => ({ state: 'error', code: 'invalid', detail }))]) expect(valid(value)).toBe(false);
});

it('contains every finite validation field emitted by the existing parsers', () => {
  expect(api.BUSINESS_VALIDATION_FIELDS).toEqual(expect.arrayContaining([
    'input', 'fields', 'unicode', 'reference', 'id', 'revision', 'instant', 'date', 'window',
    'references', 'duplicate_reference', 'name', 'policy', 'record_window', 'postedAt',
    'row_equation', 'record_kind', 'records', 'sourceAsOf', 'duplicate_record', 'selection',
    'scope', 'map', 'ownership', 'duplicate_account', 'metric_scope', 'format', 'command',
    'acknowledgement', 'amountUnit', 'mapping', 'decimal_money', 'CSV', 'CSV_quote',
    'CSV_newline', 'CSV_header', 'CSV_mapping', 'CSV_columns', 'enum',
  ]));
});

