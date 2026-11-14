/** Transport completeness, not a customer/admission limit. Pages remain bounded. */
export type CompleteReadManifest = {
  version: 'COMPLETE_READ_V1'; pageSize: number; totalRows: number; pageCounts: number[];
};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function completeReadManifest(value: unknown, totalRows: number, pageSize: number): CompleteReadManifest | undefined {
  if (!Number.isSafeInteger(totalRows) || totalRows < 0 || !Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw Error('Invalid complete read bounds');
  }
  if (value === undefined) {
    if (totalRows > pageSize) throw Error('Missing complete read pages');
    return undefined;
  }
  if (!object(value) || value.version !== 'COMPLETE_READ_V1' || value.pageSize !== pageSize ||
      value.totalRows !== totalRows || !Array.isArray(value.pageCounts) ||
      value.pageCounts.length !== Math.max(1, Math.ceil(totalRows / pageSize)) ||
      Object.keys(value).some(key => !['version','pageSize','totalRows','pageCounts'].includes(key))) {
    throw Error('Invalid complete read pages');
  }
  const pageCounts: number[] = [];
  for (let index = 0; index < value.pageCounts.length; index++) {
    const count = value.pageCounts[index];
    if (!Number.isSafeInteger(count) || count !== Math.min(pageSize, totalRows - index * pageSize)) {
      throw Error('Incomplete read pages');
    }
    pageCounts.push(count);
  }
  return { version: 'COMPLETE_READ_V1', pageSize, totalRows, pageCounts };
}

/** A single SQL snapshot may return many bounded pages; none may be silently lost. */
export function assembleCompleteReadPages(value: unknown, field: string, pageSize: number): {
  observedAt: string; rows: unknown[]; paging: CompleteReadManifest;
} {
  if (!Array.isArray(value) || !value.length || !object(value[0]) ||
      typeof value[0].observedAt !== 'string' || !Number.isFinite(Date.parse(value[0].observedAt))) {
    throw Error('Missing complete read pages');
  }
  const {observedAt, totalRows} = value[0];
  if (!Number.isSafeInteger(totalRows) || Number(totalRows) < 0 || !Number.isSafeInteger(pageSize) || pageSize < 1 ||
      value.length !== Math.max(1, Math.ceil(Number(totalRows) / pageSize))) {
    throw Error('Invalid complete read bounds');
  }
  const rows: unknown[] = [], pageCounts: number[] = [];
  for (let index = 0; index < value.length; index++) {
    const page = value[index];
    if (!object(page) || page.observedAt !== observedAt || page.totalRows !== totalRows || page.pageIndex !== index ||
        !Array.isArray(page[field]) || page[field].length !== Math.min(pageSize, Number(totalRows) - index * pageSize)) {
      throw Error('Incomplete read pages');
    }
    pageCounts.push(page[field].length);
    for (const row of page[field]) rows.push(row);
  }
  return {observedAt, rows, paging: {version: 'COMPLETE_READ_V1', pageSize, totalRows: Number(totalRows), pageCounts}};
}
