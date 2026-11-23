/** Signed-in Spanish (es-rest): every leaf key of a copy table, sorted, so a test can check that the English and Spanish
 * halves have the same keys at every depth. */
export function keyPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [prefix];
  return Object.keys(value).sort().flatMap(key => keyPaths((value as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key));
}
