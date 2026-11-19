import { expect, it } from '@rstest/core';
import { parseTool } from './contracts';
import { investigate } from './loop.server';
import { parseAnswer } from '@/components/owner-advisor/public-response';
const observedAt = '2026-11-15T12:00:00Z';
const id = '11111111-1111-4111-8111-111111111111';
const href = `/api/owner/advisor/knowledge/entries/${id}/versions/${id}`;
it('accepts only the bounded query read and concrete private source route', () => {
  expect(parseTool('company_knowledge', '{"query":"apertura"}')).toEqual({ name: 'company_knowledge', args: { query: 'apertura' } });
  for (const args of [{ query: '' }, { query: 'x'.repeat(301) }, { query: 'x', workspaceId: id }, { query: 'x\n' }, { query: 'x', url: 'https://evil.invalid' }]) expect(() => parseTool('company_knowledge', JSON.stringify(args))).toThrow();
  const answer = (source: string) => parseAnswer({ state: 'answered', authority: 'Owner', observedAt, validForMs: 15000, answer: { text: 'Review guidance', sources: [{ label: 'Guidance', href: source, observedAt }] } });
  expect(answer(href).answer.sources).toHaveLength(1);
  for (const source of ['https://evil.invalid', href + '?workspace=other', href + '/../../', href.replace('/versions/', '/drafts/'), href.replace(id, 'invalid')]) expect(() => answer(source)).toThrow();
});
it('fails explicitly when mixed evidence exceeds eight citations instead of dropping sources', async () => {
  let turn = 0;
  await expect(investigate({ endpoint: 'https://provider.invalid', key: 'fictional', model: 'fictional', dailyLimit: 1 }, [], '', 'Explain', {
    companyKnowledge: true, signal: new AbortController().signal, check: async () => {},
    fetch: async () => Response.json({ output: ++turn === 1 ? [{ type: 'function_call', name: 'company_knowledge', arguments: '{"query":"opening"}', call_id: 'k' }] : [{ type: 'message', content: [{ type: 'output_text', text: 'Review' }] }] }),
    tool: async call => ({ observedAt, partial: false, data: {}, sources: call.name === 'company_briefing' ? [{ label: 'Today', href: '/app', observedAt }] : Array.from({ length: 8 }, (_, i) => ({ label: `Source ${i}`, href, observedAt })) }),
  })).rejects.toMatchObject({ code: 'limit' });
});
