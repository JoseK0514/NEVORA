import { decodeTypedMigrationWireValue } from '../migrations/typed-wire';

export type WorkspaceIncarnationValidation = Readonly<{ status: 'VALID'; value: string }> |
  Readonly<{ status: 'INVALID'; code: 'INVALID_WORKSPACE_INCARNATION' }>;
export type WorkspaceIncarnationComparison = Readonly<{ status: 'MATCH' | 'MISMATCH' }> |
  Readonly<{ status: 'INVALID'; code: 'INVALID_WORKSPACE_INCARNATION' }>;
const INVALID = Object.freeze({ status: 'INVALID' as const, code: 'INVALID_WORKSPACE_INCARNATION' as const });

/** Exact positive native-int8 syntax only. Reuse the accepted lossless bigint
 * wire decoder rather than coerce/normalize values or introduce another parser.
 * This frozen data outcome issues no credential, tenant proof, database fact,
 * mutation authority or recovery guarantee. Other revision contracts are separate.
 */
export function validateWorkspaceIncarnation(value: unknown): WorkspaceIncarnationValidation {
  const decoded = decodeTypedMigrationWireValue('bigint', value);
  if (decoded.status !== 'DECODED' || decoded.value.kind !== 'SCALAR') return INVALID;
  const text = decoded.value.wire.text;
  if (text === '0' || text.startsWith('-')) return INVALID;
  return Object.freeze({ status: 'VALID' as const, value: text });
}
/** MATCH means only exact equality of two valid primitive wire strings.
 * It never certifies current counter state, issuer identity or held locks.
 */
export function compareWorkspaceIncarnations(left: unknown, right: unknown): WorkspaceIncarnationComparison {
  const first = validateWorkspaceIncarnation(left);
  if (first.status === 'INVALID') return INVALID;
  const second = validateWorkspaceIncarnation(right);
  if (second.status === 'INVALID') return INVALID;
  return Object.freeze({ status: first.value === second.value ? 'MATCH' as const : 'MISMATCH' as const });
}
