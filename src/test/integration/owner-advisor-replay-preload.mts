import {createOwnedReplayFetch,OWNED_REPLAY_KEY,OWNED_REPLAY_MODEL} from './owner-advisor-replay-fetch.ts';
if(process.env.NEVORA_OWNER_ADVISOR_REPLAY_FIXTURE!=='owned-unmetered-replay'||process.env.OPENAI_API_KEY!==OWNED_REPLAY_KEY||process.env.NEVORA_OWNER_ADVISOR_MODEL!==OWNED_REPLAY_MODEL||!process.env.NEVORA_OWNED_APP_IDENTITY||!process.env.NEVORA_OWNED_APP_DATABASE||process.env.ANTHROPIC_API_KEY||process.env.NEON_AI_GATEWAY_TOKEN||process.env.DATABASE_URL)throw Error('Explicit owned unmetered replay configuration required');
globalThis.fetch=createOwnedReplayFetch(globalThis.fetch,process.env.NEVORA_OWNER_ADVISOR_REPLAY_ORIGIN??'',()=>console.error('OWNED_REPLAY_EXTERNAL_FETCH_DENIED'));
console.log('OWNED_REPLAY_FETCH_GUARD_ACTIVE');
