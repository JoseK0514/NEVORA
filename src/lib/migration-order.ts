/** Full filenames are the ledger identity; an unfamiliar or duplicated row needs operator review. */
export function missingMigrationFiles(current: readonly string[], applied: readonly string[]): string[] {
  if (new Set(applied).size !== applied.length) throw Error('Duplicate full filename in migration ledger; operator reconciliation required.');
  for (const file of applied) {
    if (!current.includes(file)) throw Error('Unknown or held full filename in migration ledger: ' + file + '; operator reconciliation required.');
  }
  return current.filter(file => !applied.includes(file));
}
