import { it, expect, vi } from 'vitest';
import { ownedAdvisorEnvironment } from './owned-next-app';
import { PILOT } from './owner-advisor-pilot.mjs';
const businessOff = {NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED:'false',NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED:'false'};
it('ordinary owned runtimes ignore all ambient provider settings', () => { vi.stubEnv('NEON_AI_GATEWAY_TOKEN', 'ambient-secret'); vi.stubEnv('OPENAI_API_KEY', 'ambient-openai'); vi.stubEnv('NEVORA_OWNER_ADVISOR_MODEL', 'ambient-model'); try {
    expect(ownedAdvisorEnvironment()).toEqual({ NEVORA_OWNER_ADVISOR_ENABLED: 'false', ...businessOff });
    expect(ownedAdvisorEnvironment({ ownerAdvisorEnabled: true })).toEqual({ NEVORA_OWNER_ADVISOR_ENABLED: 'true', ...businessOff });
}
finally {
    vi.unstubAllEnvs();
} });
it('pilot requires explicit activation and fixed identity/model/endpoint', () => { const p = { ...PILOT, credential: 'fictional-key', ledgerPath: '/private/tmp/fictional-pilot/ledger.json' }; expect(() => ownedAdvisorEnvironment({ ownerAdvisorPilot: p })).toThrow(); for (const change of [{ model: 'other' }, { pilotId: 'other' }, { baseUrl: 'https://api.openai.com' }])
    expect(() => ownedAdvisorEnvironment({ ownerAdvisorEnabled: true, ownerAdvisorPilot: { ...p, ...change } })).toThrow(); const env = ownedAdvisorEnvironment({ ownerAdvisorEnabled: true, ownerAdvisorPilot: p }); expect(env.NEON_AI_GATEWAY_TOKEN).toBe('fictional-key'); expect(env.NEVORA_OWNER_ADVISOR_DAILY_LIMIT).toBe('20'); expect(env.NEVORA_OWNER_ADVISOR_PILOT).not.toContain('fictional-key'); });
it('enables only explicitly selected weekly and knowledge flags in fictional unmetered app QA', () => {
  vi.stubEnv('NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED', 'true');
  vi.stubEnv('NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED', 'true');
  try {
    const ordinary = ownedAdvisorEnvironment({ ownerAdvisorEnabled: true });
    expect(ordinary.NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED).toBeUndefined();
    expect(ordinary.NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED).toBeUndefined();
    const selected = ownedAdvisorEnvironment({ ownerAdvisorEnabled: true, ownerAdvisorWeeklyEnabled: true, ownerAdvisorKnowledgeEnabled: true });
    expect(selected).toEqual({ NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED: 'true', NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED: 'true', ...businessOff });
    expect(ownedAdvisorEnvironment({ ownerAdvisorEnabled: true, ownerAdvisorWeeklyEnabled: false }).NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED).toBe('false');
    expect(Object.keys(selected).some(name => /KEY|TOKEN|PROVIDER|MODEL/.test(name))).toBe(false);
  } finally { vi.unstubAllEnvs(); }
});
it('overrides ambient business flags and provider keys with only the explicitly selected local evidence gates', () => {
  vi.stubEnv('NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED','true');vi.stubEnv('NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED','true');vi.stubEnv('ANTHROPIC_API_KEY','fictional-ambient-key');
  try { expect(ownedAdvisorEnvironment({ownerAdvisorEnabled:true})).toMatchObject(businessOff);
    const selected=ownedAdvisorEnvironment({ownerAdvisorEnabled:true,ownerAdvisorBusinessImportsEnabled:true,ownerAdvisorBusinessRetrievalEnabled:false});
    expect(selected).toMatchObject({NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED:'true',NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED:'false'});expect(Object.keys(selected).some(k=>/KEY|TOKEN|PROVIDER|MODEL/.test(k))).toBe(false);
  } finally {vi.unstubAllEnvs();}
});
it('configures the explicitly owned unmetered replay fixture without inheriting live keys or a paid pilot',()=>{
 const options={ownerAdvisorEnabled:true,ownerAdvisorReplayFixture:true};const env=ownedAdvisorEnvironment(options);expect(env.OPENAI_API_KEY).toBe('fictional-owned-replay-no-provider-access');expect(env.NEVORA_OWNER_ADVISOR_MODEL).toBe('fictional-owned-replay-only');expect(env.NEVORA_OWNER_ADVISOR_REPLAY_FIXTURE).toBe('owned-unmetered-replay');expect(env.ANTHROPIC_API_KEY).toBeUndefined();expect(env.NEON_AI_GATEWAY_TOKEN).toBeUndefined();
 expect(()=>ownedAdvisorEnvironment({ownerAdvisorReplayFixture:true} as typeof options)).toThrow();expect(()=>ownedAdvisorEnvironment({...options,ownerAdvisorPilot:{...PILOT,credential:'fictional-key',ledgerPath:'/private/tmp/fixture/ledger.json'}})).toThrow();
});
