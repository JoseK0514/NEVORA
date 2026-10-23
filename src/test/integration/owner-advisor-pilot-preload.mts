import { guardedFetch } from './owner-advisor-pilot.mts';
const config = process.env.NEVORA_OWNER_ADVISOR_PILOT;
if (!config || !process.env.NEON_AI_GATEWAY_TOKEN)
    throw Error('Explicit owner advisor pilot configuration required');
globalThis.fetch = guardedFetch({ ...JSON.parse(config), credential: process.env.NEON_AI_GATEWAY_TOKEN }, globalThis.fetch);
