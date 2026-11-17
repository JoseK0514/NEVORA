import { expect, it, vi } from 'vitest';
import { investigate } from './loop.server';
import type { ToolCall } from './contracts';
const config = { endpoint: 'https://provider.invalid/responses', model: 'fictional', key: 'fictional', dailyLimit: 3 };
const args = { weekStart: '2026-11-16', locationScope: { kind: 'ALL' } };
const call = (name: string, value: unknown, id: string) => ({ type: 'function_call', name, arguments: JSON.stringify(value), call_id: id });
const prose = { output: [{ type: 'message', content: [{ type: 'output_text', text: 'Only a bounded inspection was requested.' }] }] };
const deps = () => ({ check: vi.fn(async () => {}), signal: new AbortController().signal,
  tool: vi.fn(async (_call: ToolCall, _budget: { sourceSlots: number; occurrence?: number }) => ({ observedAt: new Date().toISOString(), sources: [], partial: false, data: {} })) });

it('rejects an unadvertised weekly call before any additional read effect', async () => {
  const d = deps();
  await expect(investigate(config, [], '', 'Inspect', { ...d, fetch: async () => Response.json({ output: [call('weekly_plan', args, 'bad-call')] }) })).rejects.toMatchObject({ code: 'invalid' });
  expect(d.tool).toHaveBeenCalledTimes(1);
});

it('assigns read occurrences on the server and preserves the original eight-call budget', async () => {
  const d = deps(); let round = 0;
  await investigate(config, [], '', 'Inspect', { ...d, weeklyPlanning: true, fetch: async (_url, init) => {
    const body = JSON.parse(String(init.body));
    expect(body.tools.filter((t: { name: string }) => t.name === 'weekly_plan')).toHaveLength(1);
    return Response.json(round++ === 0 ? { output: [call('weekly_plan', args, 'untrusted-provider-id'), call('weekly_plan', args, 'different-untrusted-id')] } : prose);
  } });
  expect(d.tool.mock.calls.map(([, budget]) => budget.occurrence)).toEqual([0, 1, 2]);
  const bounded = deps();
  await expect(investigate(config, [], '', 'Inspect', { ...bounded, weeklyPlanning: true,
    fetch: async () => Response.json({ output: Array.from({ length: 8 }, (_, i) => call('weekly_plan', args, String(i))) }) })).rejects.toMatchObject({ code: 'limit' });
  expect(bounded.tool).toHaveBeenCalledTimes(1);
});

it('validates the whole provider batch before a malformed weekly call can accompany another read', async () => {
  const d = deps();
  await expect(investigate(config, [], '', 'Inspect', { ...d, weeklyPlanning: true, fetch: async () => Response.json({ output: [
    call('coverage_plan', { date: '2026-11-16' }, 'day'), call('weekly_plan', { ...args, mode: 'BUILD_WEEK' }, 'weekly'),
  ] }) })).rejects.toMatchObject({ code: 'invalid' });
  expect(d.tool).toHaveBeenCalledTimes(1);
});
