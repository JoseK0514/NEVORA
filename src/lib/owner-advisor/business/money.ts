/** Row integers are never routed through Number or a floating point conversion. */
export function minor(value: unknown, nonnegative = false): bigint {
  if (typeof value !== 'string' || !/^(0|-?[1-9][0-9]{0,17})$/.test(value) || (nonnegative && value.startsWith('-'))) throw Error('INVALID_MONEY');
  return BigInt(value);
}
export function moneyTotal(value: bigint): string {
  const result = value.toString();
  if (!/^(0|-?[1-9][0-9]{0,29})$/.test(result)) throw Error('RESULT_LIMIT');
  return result;
}
