/** Preserve stored date strings; only Date instances are converted to UTC. */
export function databaseDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
