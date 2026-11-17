/** Client-safe business evidence DTOs. No authority, persistence or model imports. */
/** Closed, client-safe vocabularies. Unknown transport codes must fail closed. */
export const BUSINESS_FINDING_CODES = [
  'RECONCILIATION_DIFFERENCE', 'MISSING_OR_CONFLICTING_ANCHOR', 'SHARED_ACCOUNT_NOT_ALLOCATABLE',
  'BOUNDARY_ANCHOR_CONFLICT', 'PENDING_CASH_EXCLUDED', 'VOID_CASH_EXCLUDED',
  'OUTSIDE_POSTED_WINDOW', 'UNCONFIRMED_OBLIGATION', 'UNCONFIRMED_RECEIVABLE',
] as const;
export type BusinessFindingCode = typeof BUSINESS_FINDING_CODES[number];
export const BUSINESS_QUALIFIER_CODES = [
  'OWNER_REPORTED_COMPLETENESS', 'NO_FX_OR_PROFIT_INFERENCE', 'SOURCE_RECORDS_ONLY',
  'OWNER_DECLARED_ACCOUNT_PERIMETER', 'CURRENT_ACTIVE_LOCATION_PERIMETER', 'SOURCE_SUBTOTAL',
  'EXCLUSIVE_ACCOUNT_SUBTOTAL_ONLY', 'COMPLETE_LOCATION_CASH_UNAVAILABLE_SHARED_ACCOUNT',
  'HISTORICAL_AS_OF_RECORDS', 'CURRENT_WITHIN_PUBLISHED_FRESHNESS_POLICY',
  'OWNER_IMPORT_NOT_INDEPENDENTLY_VERIFIED', 'SOURCE_TIMEZONE_CHANGED_RESTAGE_REQUIRED',
  'PARTIAL_NOT_PUBLISHABLE', 'DRAFT_VALIDATION_ONLY',
] as const;
export type BusinessQualifierCode = typeof BUSINESS_QUALIFIER_CODES[number];
export const BUSINESS_UNAVAILABLE_CODES = [
  'INPUT_LIMIT', 'RESULT_LIMIT', 'MISSING_SOURCE', 'MISSING_MAP', 'INCOMPLETE_SCOPE', 'OVERLAP',
  'IDENTITY_CONFLICT', 'STALE', 'SHARED_ACCOUNT', 'UNAVAILABLE', 'DISABLED',
] as const;
export const BUSINESS_SCENARIO_UNAVAILABLE_CODES = ['INPUT_LIMIT', 'RESULT_LIMIT', 'NO_RECONCILED_ANCHOR'] as const;
export type BusinessScenarioUnavailable = typeof BUSINESS_SCENARIO_UNAVAILABLE_CODES[number];
export const BUSINESS_ERROR_CODES = ['forbidden', 'invalid', 'conflict', 'limit', 'unavailable', 'cancelled', 'disabled', 'busy'] as const;
export type BusinessErrorCode = typeof BUSINESS_ERROR_CODES[number];
export const BUSINESS_VALIDATION_CODES = [
  'INVALID_INPUT', 'INVALID_MONEY', 'INVALID_CSV_RECORD', 'INPUT_LIMIT', 'MISSING_SOURCE',
  'INCOMPLETE_SCOPE', 'OVERLAP', 'ACCOUNT_CURRENCY_CONFLICT', 'INVALID_MAP',
] as const;
export type BusinessValidationCode = typeof BUSINESS_VALIDATION_CODES[number];
export const BUSINESS_VALIDATION_FIELDS = [
  'CSV', 'CSV_columns', 'CSV_header', 'CSV_mapping', 'CSV_newline', 'CSV_quote',
  'acknowledgement', 'amountUnit', 'command', 'date', 'decimal_money', 'duplicate_account',
  'duplicate_record', 'duplicate_reference', 'enum', 'fields', 'format', 'id', 'input',
  'instant', 'map', 'mapping', 'metric_scope', 'name', 'ownership', 'policy', 'postedAt',
  'record_kind', 'record_window', 'records', 'reference', 'references', 'revision',
  'row_equation', 'scope', 'selection', 'sourceAsOf', 'unicode', 'window',
] as const;
export type BusinessValidationField = typeof BUSINESS_VALIDATION_FIELDS[number];
export type BusinessValidationDetail = { code: BusinessValidationCode; field: BusinessValidationField | null; row: number | null; line: number | null };
export type BusinessErrorResult = { state: 'error'; code: BusinessErrorCode; detail?: BusinessValidationDetail };
export type BusinessReviewReceipt = { readReceiptId: string; readReceiptExpiresAt: string };
export type BusinessLocation = { id: string; name: string };
function known<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}
export const isBusinessErrorCode = (value: unknown): value is BusinessErrorCode => known(value, BUSINESS_ERROR_CODES);
export const isBusinessFindingCode = (value: unknown): value is BusinessFindingCode => known(value, BUSINESS_FINDING_CODES);
export const isBusinessQualifierCode = (value: unknown): value is BusinessQualifierCode => known(value, BUSINESS_QUALIFIER_CODES);
export const isBusinessValidationCode = (value: unknown): value is BusinessValidationCode => known(value, BUSINESS_VALIDATION_CODES);
export const isBusinessValidationField = (value: unknown): value is BusinessValidationField => known(value, BUSINESS_VALIDATION_FIELDS);
/** Strict JSON envelope validation: no unknown codes or raw upstream detail. */
export function isBusinessErrorResult(value: unknown): value is BusinessErrorResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (![Object.prototype, null].includes(Object.getPrototypeOf(item)) ||
      item.state !== 'error' || !isBusinessErrorCode(item.code) ||
      Object.keys(item).some(key => !['state', 'code', 'detail'].includes(key))) return false;
  if (!Object.hasOwn(item, 'detail')) return true;
  if (!item.detail || typeof item.detail !== 'object' || Array.isArray(item.detail)) return false;
  const detail = item.detail as Record<string, unknown>;
  if (![Object.prototype, null].includes(Object.getPrototypeOf(detail)) ||
      Object.keys(detail).length !== 4 || Object.keys(detail).some(key => !['code', 'field', 'row', 'line'].includes(key)) ||
      !isBusinessValidationCode(detail.code) || detail.field !== null && !isBusinessValidationField(detail.field)) return false;
  return [detail.row, detail.line].every(v => v === null || typeof v === 'number' && Number.isSafeInteger(v) && v >= 1);
}
export type BusinessDomain = 'FINANCE' | 'SALES';
export type BusinessCurrency = 'USD' | 'EUR';
export type BusinessWindow = { fromAt: string; toAt: string };
export type BusinessSourceSpec = { sourceId: string | null; expectedRevision: number; name: string;
  domain: BusinessDomain; namespace: string; currency: BusinessCurrency; scale: 2; maxAgeMinutes: number };
type Row = { recordId: string; revision: string };
export type BusinessRecord = Row & (
  | { kind: 'BALANCE'; accountRef: string; at: string; amountMinor: string }
  | { kind: 'CASH'; accountRef: string; occurredAt: string; postedAt: string | null; state: 'POSTED' | 'PENDING' | 'REVERSED'; deltaMinor: string; reconciliationRef: string | null }
  | { kind: 'OBLIGATION' | 'RECEIVABLE'; accountRef: string; recordedAt: string; dueDate: string; amountMinor: string; state: 'OPEN' | 'SETTLED' | 'CANCELLED'; confirmation: 'SOURCE_CONFIRMED' | 'OWNER_REPORTED' | 'UNCONFIRMED' }
  | { kind: 'SALE' | 'REFUND'; orderRef: string; locationId: string; at: string; merchandiseMinor: string; discountMinor: string; taxMinor: string; collectedMinor: string }
  | { kind: 'CANCELLATION'; orderRef: string; locationId: string; at: string }
  | { kind: 'FEE'; orderRef: string; locationId: string; at: string; feeMinor: string });
export type BusinessVersionInput = { source: BusinessSourceSpec; window: BusinessWindow; sourceAsOf: string;
  completeness: 'COMPLETE' | 'PARTIAL'; records: BusinessRecord[] };
export type BusinessCsvMapping = { amountUnit: 'MINOR' | 'DECIMAL_MAJOR'; columns: Record<string, string>; constants: Record<string, string | null> };
export type BusinessLocationScope = { kind: 'ALL' } | { kind: 'SELECTED'; locationIds: string[] };
export type BusinessQuery = { window: BusinessWindow; selection: { kind: 'PRIMARY_PERIMETER' } | { kind: 'SOURCE'; sourceId: string };
  locationScope: BusinessLocationScope; temporalUse: 'CURRENT' | 'HISTORICAL' };
export type BusinessScenario = { anchorRecordId: string; throughDate: string; obligationRecordIds: string[]; receivableRecordIds: string[] };
export type BusinessFinanceQuery = BusinessQuery & { scenario: BusinessScenario | null };
export type BusinessMetricFamily = 'CASH' | 'OBLIGATIONS' | 'RECEIVABLES' | 'SALES';
export type BusinessMapCell = { sourceId: string; domain: BusinessDomain; metric: BusinessMetricFamily; currency: BusinessCurrency;
  window: BusinessWindow; role: 'PRIMARY' | 'CORROBORATING'; accountRefs: string[]; locationIds: string[] };
export type BusinessAccount = { accountRef: string; ownership: { kind: 'COMPANY_SHARED' } | { kind: 'EXCLUSIVE_LOCATION'; locationId: string } };
export type BusinessCoverageMap = { expectedRevision: number; accounts: BusinessAccount[]; cells: BusinessMapCell[] };
type Command = { requestId: string };
type Exact = { expectedRevision: number; digest: string; acknowledged: true };
export type BusinessCommand = Command & (
  | { op: 'stage_source_version'; format: 'JSON'; input: BusinessVersionInput }
  | { op: 'stage_source_version'; format: 'CSV'; csv: string; mapping: BusinessCsvMapping; metadata: Omit<BusinessVersionInput, 'records'> }
  | { op: 'read_source_version'; sourceId: string; versionId: string }
  | ({ op: 'publish_source_version'; sourceId: string; versionId: string; readReceiptId: string } & Exact)
  | ({ op: 'discard_source_version'; sourceId: string; versionId: string } & Exact)
  | { op: 'stage_coverage_map'; map: BusinessCoverageMap }
  | { op: 'read_coverage_map'; mapVersionId: string }
  | ({ op: 'publish_coverage_map'; mapVersionId: string; readReceiptId: string } & Exact)
  | ({ op: 'discard_coverage_map'; mapVersionId: string } & Exact)
  | ({ op: 'withdraw_source' | 'delete_source'; sourceId: string } & Exact)
  | { op: 'check_source_operation'; operationId: string }
  | { op: 'query_finance'; query: BusinessFinanceQuery }
  | { op: 'query_sales'; query: BusinessQuery });
export type BusinessReceipt = { operationId: string; kind: BusinessCommand['op']; sourceId: string | null;
  versionId: string | null; mapVersionId: string | null; revision: number; savedAt: string };
export type BusinessVersionView = { publishEligible?: boolean; validation?: { finance: FinanceMetrics | null; sales: SalesMetrics | null; qualifiers: BusinessQualifierCode[] }; timeZone: string; sourceId: string; versionId: string; digest: string; status: 'DRAFT' | 'PUBLISHED' | 'DISCARDED' | 'ERASED';
  metadata?: { window: BusinessWindow; sourceAsOf: string; completeness: 'COMPLETE' | 'PARTIAL'; rowCount: number; payloadBytes: number };
  current: boolean; input: BusinessVersionInput | null; publishedAt: string | null };
export type BusinessMapView = { mapVersionId: string; digest: string; status: 'DRAFT' | 'PUBLISHED' | 'DISCARDED'; input: BusinessCoverageMap | null; current: boolean };
export type BusinessSourceView = Omit<BusinessSourceSpec, 'sourceId' | 'expectedRevision'> & { sourceId: string; revision: number; active: boolean; deleted: boolean; scopeDigest: string };
export type BusinessCatalog = { revision: number; evidenceRevision: number; mapRevision?: number; timeZone: string; activeLocationIds: string[]; activeLocations: BusinessLocation[]; sources: BusinessSourceView[]; versions: BusinessVersionView[]; maps: BusinessMapView[] };
export type BusinessCitation = { sourceId: string; versionId: string; digest: string; name: string; namespace: string; timeZone: string;
  currency: BusinessCurrency; window: BusinessWindow; sourceAsOf: string; origin: 'OWNER_IMPORT' | 'CONNECTOR'; href: string };
export type BusinessUnavailable = typeof BUSINESS_UNAVAILABLE_CODES[number];
export type BusinessFinding = { code: BusinessFindingCode; accountRef: string | null; recordIds: string[]; differenceMinor: string | null; count?: number; window?: BusinessWindow; boundaryAt?:string };
export type FinanceCurrencyMetrics = { currency: BusinessCurrency; scale: 2; openingMinor: string | null; postedDeltaMinor: string; postedInflowMinor:string; postedOutflowMinor:string; postedCount:number; postedInflowCount:number; postedOutflowCount:number;
  calculatedClosingMinor: string | null; reportedClosingMinor: string | null; differenceMinor: string | null;
  reconciled: boolean; obligationsMinor: string; receivablesMinor: string; scenarioMinor: string | null; scenarioConditional: boolean; scenarioAccountRef: string | null; scenarioAnchorAt: string | null };
export type FinanceScenarioIdentity = { recordId: string; accountRef: string; currency: BusinessCurrency; sourceId: string; versionId: string; namespace: string };
export type FinanceScenarioInputs = { state: 'ready' | 'unavailable'; reason: BusinessScenarioUnavailable | null;
  anchors: (FinanceScenarioIdentity & { at: string; amountMinor: string })[];
  obligations: (FinanceScenarioIdentity & { dueDate: string; amountMinor: string; confirmation: 'SOURCE_CONFIRMED' | 'OWNER_REPORTED' })[];
  receivables: (FinanceScenarioIdentity & { dueDate: string; amountMinor: string; confirmation: 'SOURCE_CONFIRMED' | 'OWNER_REPORTED' })[] };
export type FinanceMetrics = { currencies: FinanceCurrencyMetrics[]; findings: BusinessFinding[]; excludedRows: number; scenarioInputs: FinanceScenarioInputs };
export type SalesMovementMetrics = {count:number; merchandiseMinor:string; discountsMinor:string; netMerchandiseMinor:string; taxMinor:string; collectionsMinor:string};
export type SalesCurrencyMetrics = { currency: BusinessCurrency; scale: 2; merchandiseMinor: string; discountsMinor: string;
  netMerchandiseMinor: string; taxMinor: string; collectionsMinor: string; feesMinor: string; netReceiptsMinor: string; cancellations: number; sales:SalesMovementMetrics; refunds:SalesMovementMetrics };
export type SalesMetrics = { currencies: SalesCurrencyMetrics[]; findings: BusinessFinding[]; excludedRows: number };
export type AdmittedBusinessVersion = { version: BusinessVersionView & { input: BusinessVersionInput }; window: BusinessWindow; accountRefs: string[]; locationIds: string[]; metrics: BusinessMetricFamily[] };
export type AdmittedBusinessScope = { domain: BusinessDomain; timeZone: string; query: BusinessQuery; versions: AdmittedBusinessVersion[]; accounts: BusinessAccount[];
  locationIds: string[]; completeScope: boolean; sourceSubtotal: boolean; incompleteReason?: BusinessUnavailable; observedAt: string; expiresAt: string; qualifiers: BusinessQualifierCode[] };
export type BusinessScopeAdmission = { state: 'ready'; scope: AdmittedBusinessScope } | { state: 'unavailable'; reason: BusinessUnavailable };
export type ValidatedBusinessMap = { input: BusinessCoverageMap; catalogRevision: number };
export type BusinessReadResult = { state: 'ready' | 'unavailable'; reason: BusinessUnavailable | null; domain: BusinessDomain;
  completeScope: boolean; sourceSubtotal: boolean; window: BusinessWindow; selection: BusinessQuery['selection']; locationScope: BusinessLocationScope; temporalUse: BusinessQuery['temporalUse']; scenario: BusinessScenario | null; observedAt: string; expiresAt: string | null;
  qualifiers: BusinessQualifierCode[]; finance: FinanceMetrics | null; sales: SalesMetrics | null; citations: BusinessCitation[] };
export type BusinessApiResult = { state: 'ready' | 'saved' | 'not_saved' | 'unavailable' | 'stale'; reason: BusinessUnavailable | null;
  catalog: BusinessCatalog | null; version: BusinessVersionView | null; map: BusinessMapView | null; receipt: BusinessReceipt | null;
  result: BusinessReadResult | null; readReceiptId: string | null; readReceiptExpiresAt: string | null; authority: string; observedAt: string; validForMs: number };
