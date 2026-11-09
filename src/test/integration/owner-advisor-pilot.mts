// Frozen evaluation profile. Explicit provisioning only; this is not budget approval.
import { createPilotGuard } from './owner-advisor-pilot-core.mts';
export type { OwnerAdvisorPilot } from './owner-advisor-pilot-core.mts';
export const PILOT = Object.freeze({
    pilotId: 'owner-advisor-20261022',
    baseUrl: 'https://br-blue-firefly-b759kjzm-api.ai.c-13.us-east-1.aws.neon.tech',
    model: 'gpt-6-1-sol', budgetMicrodollars: 5000000, reservationMicrodollars: 250000,
});
export const PILOT_ENDPOINT = PILOT.baseUrl + '/openai/v1/responses';
export const {validatePilot, initializePilot, assertPilotLedger, reservePilot, guardedFetch} = createPilotGuard(PILOT, {maxAttempts: 20});
