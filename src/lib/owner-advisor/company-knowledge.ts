import { createHash } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { AdvisorError, record } from './contracts';

export const knowledgeLimits = { profileBytes: 16384, documentBytes: 262144, documents: 20, versions: 100, storageBytes: 10485760, sources: 6, contextBytes: 24576 } as const;
export const profileFields = ['businessDescription', 'productsServices', 'customerCommitments', 'operatingProcedures', 'objectives', 'escalationRoles'] as const;
export type CompanyProfile = Partial<Record<typeof profileFields[number], string>> & { businessDescription: string };
type Base = { requestId: string; expectedRevision: number };
export type KnowledgeValidity = { effectiveFrom: string | null; effectiveUntil: string | null; reviewDue: string | null };
export type KnowledgeFence = { revision: number; fingerprint: string; validUntil: string | null };
export type KnowledgeCommand = Base & (
  | ({ op: 'draft_profile'; locale: 'en' | 'es'; fields: CompanyProfile; body: string; title: string; category: 'profile'; sourceName: null; documentId: null } & KnowledgeValidity)
  | ({ op: 'draft_document'; documentId: string | null; title: string; locale: 'en' | 'es'; category: string; body: string; sourceName: string | null } & KnowledgeValidity)
  | { op: 'publish'; documentId: string; versionId: string; reviewedTextDigest: string }
  | { op: 'archive'; documentId: string }
  | { op: 'delete'; documentId: string; acknowledged: true }
);
const fail = (): never => { throw new AdvisorError('invalid'); };
export const knowledgeUuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
export const knowledgeDigest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const keys = (value: Record<string, unknown>, allowed: string[]) => { if (Object.keys(value).some(key => !allowed.includes(key))) fail(); };
function sourceText(value: unknown, maxBytes: number) {
  if (typeof value !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || Buffer.from(value, 'utf8').toString('utf8') !== value) return fail();
  const text = value.replace(/\r\n?/g, '\n').trim();
  if (!text || Buffer.byteLength(text, 'utf8') > maxBytes) return fail();
  return text;
}
function instant(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > 64) return fail();
  try { return Temporal.Instant.from(value).toString(); } catch { return fail(); }
}
export function parseKnowledgeCommand(value: unknown): KnowledgeCommand {
  if (!record(value) || !knowledgeUuid(value.requestId) || !Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 0 || Number(value.expectedRevision) > 2147483646) return fail();
  const base = { requestId: value.requestId, expectedRevision: Number(value.expectedRevision) };
  if (value.op === 'publish' || value.op === 'archive' || value.op === 'delete') {
    keys(value, ['op', 'requestId', 'expectedRevision', 'documentId', ...(value.op === 'publish' ? ['versionId', 'reviewedTextDigest'] : value.op === 'delete' ? ['acknowledged'] : [])]);
    if (!knowledgeUuid(value.documentId)) return fail();
    if (value.op === 'publish') {
      if (!knowledgeUuid(value.versionId) || typeof value.reviewedTextDigest !== 'string' || !/^[a-f0-9]{64}$/.test(value.reviewedTextDigest)) return fail();
      return { ...base, op: value.op, documentId: value.documentId, versionId: value.versionId, reviewedTextDigest: value.reviewedTextDigest };
    }
    if (value.op === 'delete') { if (value.acknowledged !== true) return fail(); return { ...base, op: value.op, documentId: value.documentId, acknowledged: true }; }
    return { ...base, op: value.op, documentId: value.documentId };
  }
  if (value.op !== 'draft_profile' && value.op !== 'draft_document') return fail();
  keys(value, ['op', 'requestId', 'expectedRevision', 'locale', 'effectiveFrom', 'effectiveUntil', 'reviewDue', ...(value.op === 'draft_profile' ? ['fields'] : ['documentId', 'title', 'category', 'body', 'sourceName'])]);
  if (value.locale !== 'en' && value.locale !== 'es') return fail();
  const validity = { effectiveFrom: instant(value.effectiveFrom), effectiveUntil: instant(value.effectiveUntil), reviewDue: instant(value.reviewDue) };
  if (validity.effectiveFrom && validity.effectiveUntil && Temporal.Instant.compare(validity.effectiveFrom, validity.effectiveUntil) >= 0) return fail();
  if (value.op === 'draft_profile') {
    if (!record(value.fields)) return fail();
    keys(value.fields, [...profileFields]);
    const fields: CompanyProfile = { businessDescription: sourceText(value.fields.businessDescription, knowledgeLimits.profileBytes) };
    for (const key of profileFields.slice(1)) if (value.fields[key] !== undefined && value.fields[key] !== '') fields[key] = sourceText(value.fields[key], knowledgeLimits.profileBytes);
    const body = sourceText(profileFields.filter(key => fields[key]).map(key => `${key}:\n${fields[key]}`).join('\n\n'), knowledgeLimits.profileBytes);
    return { ...base, ...validity, op: value.op, locale: value.locale, fields, body, title: 'Company profile', category: 'profile', sourceName: null, documentId: null };
  }
  if (value.documentId !== null && !knowledgeUuid(value.documentId)) return fail();
  const title = sourceText(value.title, 240);
  if (/[\r\n\t]/.test(title) || typeof value.category !== 'string' || !['operations', 'products', 'service', 'policy', 'other'].includes(value.category)) return fail();
  let sourceName: string | null = null;
  if (value.sourceName !== undefined && value.sourceName !== null) {
    sourceName = sourceText(value.sourceName, 120);
    if (/[\\/\r\n\t]/.test(sourceName) || !/\.(txt|md)$/i.test(sourceName)) return fail();
  }
  return { ...base, ...validity, op: value.op, documentId: value.documentId, title, locale: value.locale, category: value.category, body: sourceText(value.body, knowledgeLimits.documentBytes), sourceName };
}
export const knowledgeSourceHref = (documentId: string, versionId: string) => `/api/owner/advisor/knowledge/entries/${documentId}/versions/${versionId}`;
export function knowledgeExcerpt(body: string, query: string, maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > knowledgeLimits.contextBytes) return fail();
  if (Buffer.byteLength(body, 'utf8') <= maxBytes) return { text: body, start: 0, end: body.length, complete: true };
  const lower = body.toLocaleLowerCase(), words = query.match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  const match = words.map(word => lower.indexOf(word.toLocaleLowerCase())).find(index => index >= 0) ?? 0;
  let start = Math.max(0, match - Math.min(256, Math.floor(maxBytes / 4)));
  if (/[\udc00-\udfff]/.test(body[start] ?? '')) start++;
  let end = start, bytes = 0;
  for (const point of body.slice(start)) {
    const size = Buffer.byteLength(point, 'utf8'); if (bytes + size > maxBytes) break;
    bytes += size; end += point.length;
  }
  return { text: body.slice(start, end), start, end, complete: start === 0 && end === body.length };
}
