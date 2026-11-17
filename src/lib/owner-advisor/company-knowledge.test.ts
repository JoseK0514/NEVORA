import { expect, it } from 'vitest';
import { parseKnowledgeCommand, knowledgeDigest, knowledgeExcerpt, knowledgeSourceHref, knowledgeLimits } from './company-knowledge';
const id = '11111111-1111-4111-8111-111111111111';
const draft = () => ({ op: 'draft_document', requestId: id, expectedRevision: 0, documentId: null, title: 'Opening procedure', locale: 'en', category: 'operations', body: 'Open at 08:00.\r\nCheck the recorded roster.', sourceName: 'opening.md' });

it('normalizes a bounded textual draft with no caller-supplied tenant or execution authority', () => {
  const command = parseKnowledgeCommand(draft());
  expect(command).toMatchObject({ op: 'draft_document', documentId: null, body: 'Open at 08:00.\nCheck the recorded roster.', effectiveFrom: null, effectiveUntil: null, reviewDue: null });
  expect(() => parseKnowledgeCommand({ ...draft(), workspaceId: 'another-company' })).toThrow('invalid');
  expect(() => parseKnowledgeCommand({ ...draft(), execute: true })).toThrow('invalid');
});

it('uses a distinct structured company profile and bounds its canonical reviewed text', () => {
  const command = parseKnowledgeCommand({ op: 'draft_profile', requestId: id, expectedRevision: 0, locale: 'es', fields: { businessDescription: 'Café ficticio', productsServices: 'Café y meriendas' } });
  expect(command).toMatchObject({ op: 'draft_profile', fields: { businessDescription: 'Café ficticio', productsServices: 'Café y meriendas' } });
  expect('body' in command && command.body).toContain('Café ficticio');
  expect(() => parseKnowledgeCommand({ op: 'draft_profile', requestId: id, expectedRevision: 0, locale: 'en', fields: { businessDescription: '🙂'.repeat(5000) } })).toThrow('invalid');
  expect(() => parseKnowledgeCommand({ op: 'draft_profile', requestId: id, expectedRevision: 0, locale: 'en', fields: { businessDescription: 'Business', role: 'OWNER' } })).toThrow('invalid');
});

it.each(['\u0000hidden', '\ud800', 'x'.repeat(262145)])('rejects invalid or oversized source text', body => {
  expect(() => parseKnowledgeCommand({ ...draft(), body })).toThrow('invalid');
});

it.each(['../secret.txt', 'input.pdf', 'input.docx', 'name\n.txt'])('does not pretend to accept binary/unsafe upload names: %s', sourceName => {
  expect(() => parseKnowledgeCommand({ ...draft(), sourceName })).toThrow('invalid');
});

it('binds publication to the exact reviewed text digest and requires deliberate deletion', () => {
  const publish = { op: 'publish', requestId: id, expectedRevision: 2, documentId: id, versionId: id, reviewedTextDigest: knowledgeDigest('Exact reviewed text') };
  expect(parseKnowledgeCommand(publish)).toEqual(publish);
  expect(() => parseKnowledgeCommand({ ...publish, reviewedTextDigest: 'anything' })).toThrow('invalid');
  expect(() => parseKnowledgeCommand({ op: 'delete', requestId: id, expectedRevision: 3, documentId: id, acknowledged: false })).toThrow('invalid');
  expect(parseKnowledgeCommand({ op: 'delete', requestId: id, expectedRevision: 3, documentId: id, acknowledged: true })).toMatchObject({ acknowledged: true });
});

it('normalizes effective instants while keeping review-due advisory and rejecting impossible dates', () => {
  expect(parseKnowledgeCommand({ ...draft(), effectiveFrom: '2026-11-15T08:00:00-04:00', effectiveUntil: '2027-01-01T00:00:00Z', reviewDue: '2026-01-01T00:00:00Z' })).toMatchObject({ effectiveFrom: '2026-11-15T12:00:00Z', reviewDue: '2026-01-01T00:00:00Z' });
  expect(() => parseKnowledgeCommand({ ...draft(), effectiveFrom: '2026-02-30T00:00:00Z' })).toThrow('invalid');
  expect(() => parseKnowledgeCommand({ ...draft(), effectiveFrom: '2027-01-01T00:00:00Z', effectiveUntil: '2026-01-01T00:00:00Z' })).toThrow('invalid');
});

it('returns a true bounded Unicode excerpt with original offsets and honest omissions', () => {
  const body = 'Before '.repeat(100) + 'coffee policy ' + '☕🙂'.repeat(300);
  const result = knowledgeExcerpt(body, 'coffee', 80);
  expect(Buffer.byteLength(result.text, 'utf8')).toBeLessThanOrEqual(80);
  expect(body.slice(result.start, result.end)).toBe(result.text);
  expect(result.complete).toBe(false);
  expect(Buffer.from(result.text).toString('utf8')).toBe(result.text);
  expect(knowledgeExcerpt('Complete document.', '', 80)).toMatchObject({ text: 'Complete document.', complete: true });
  expect(knowledgeLimits.sources).toBe(6);
  expect(knowledgeSourceHref(id, id)).toBe(`/api/owner/advisor/knowledge/entries/${id}/versions/${id}`);
});
