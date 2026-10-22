import { it, expect, vi } from 'vitest';
import { ownedAdvisorEnvironment } from './owned-next-app';
import { PILOT } from './owner-advisor-pilot.mjs';
it('ordinary owned runtimes ignore all ambient provider settings', () => { vi.stubEnv('NEON_AI_GATEWAY_TOKEN', 'ambient-secret'); vi.stubEnv('OPENAI_API_KEY', 'ambient-openai'); vi.stubEnv('NEVORA_OWNER_ADVISOR_MODEL', 'ambient-model'); try {
    expect(ownedAdvisorEnvironment()).toEqual({ NEVORA_OWNER_ADVISOR_ENABLED: 'false' });
    expect(ownedAdvisorEnvironment({ ownerAdvisorEnabled: true })).toEqual({ NEVORA_OWNER_ADVISOR_ENABLED: 'true' });
}
finally {
    vi.unstubAllEnvs();
} });
it('pilot requires explicit activation and fixed identity/model/endpoint', () => { const p = { ...PILOT, credential: 'fictional-key', ledgerPath: '/private/tmp/fictional-pilot/ledger.json' }; expect(() => ownedAdvisorEnvironment({ ownerAdvisorPilot: p })).toThrow(); for (const change of [{ model: 'other' }, { pilotId: 'other' }, { baseUrl: 'https://api.openai.com' }])
    expect(() => ownedAdvisorEnvironment({ ownerAdvisorEnabled: true, ownerAdvisorPilot: { ...p, ...change } })).toThrow(); const env = ownedAdvisorEnvironment({ ownerAdvisorEnabled: true, ownerAdvisorPilot: p }); expect(env.NEON_AI_GATEWAY_TOKEN).toBe('fictional-key'); expect(env.NEVORA_OWNER_ADVISOR_DAILY_LIMIT).toBe('20'); expect(env.NEVORA_OWNER_ADVISOR_PILOT).not.toContain('fictional-key'); });
