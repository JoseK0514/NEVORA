// Frozen evaluation profile. Explicit provisioning only; this is not budget approval.
import { constants,closeSync,fsyncSync,lstatSync,openSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { isAbsolute, resolve, dirname } from 'node:path';
import { createPilotGuard } from './owner-advisor-pilot-core.mts';
export type { OwnerAdvisorPilot } from './owner-advisor-pilot-core.mts';
export const PILOT = Object.freeze({
    pilotId: 'owner-advisor-partner-20261101',
    baseUrl: 'https://br-blue-firefly-b759kjzm-api.ai.c-13.us-east-1.aws.neon.tech',
    model: 'gpt-6-1-sol', budgetMicrodollars: 10000000, reservationMicrodollars: 250000,
});
export const PILOT_ENDPOINT = PILOT.baseUrl + '/openai/v1/responses';
export const {validatePilot, initializePilot, assertPilotLedger, reservePilot, guardedFetch} = createPilotGuard(PILOT, {maxAttempts: 40, allowEmptyReasoningContent: true, allowHighEffort: true});

export const PARTNER_APPROVAL = 'jose-approved-new-owner-partner-ten-dollars-20261101';
export type PartnerAdmission = { approval?: string; ledgerPath: string; evidencePath: string; sourceHead: string; claimEvidence: (directory: string, source: string, dryRun: boolean) => Promise<void>; readCredential: () => Promise<string> };
export async function admitPartnerPilot(options: PartnerAdmission) {
  options = Object.freeze({...options});
  // Approval and fresh ledger/evidence admission precede any secret access.
  if (options.approval !== PARTNER_APPROVAL) throw Error('Fresh explicit Owner partner budget approval required');
  if (!/^[a-f0-9]{40}$/.test(options.sourceHead) || !isAbsolute(options.evidencePath) || resolve(options.evidencePath) !== options.evidencePath || options.evidencePath === process.cwd() || options.evidencePath.startsWith(process.cwd() + '/')) throw Error('Explicit external evidence and source identity required');
  const provisional = {...PILOT, ledgerPath:options.ledgerPath, credential:'ledger-validation-before-credential-access'};
  const fresh = () => { assertPilotLedger(provisional);
  if (JSON.parse(readFileSync(options.ledgerPath,'utf8')).attempts !== 0 || JSON.stringify(readdirSync(dirname(options.ledgerPath)).sort()) !== '["identity.json","ledger.json"]') throw Error('Fresh separately initialized ledger required; continuation is disabled'); };
  fresh();
  // Outside the frozen ledger directory: never change legacy reservation metadata.
  // Claim is permanent for this run; failures/crash residue never auto-release or reset it.
  const claimPath = dirname(options.ledgerPath) + '.run-ownership.json';
  const claim = JSON.stringify({pilotId:PILOT.pilotId,ledgerPath:options.ledgerPath,evidencePath:options.evidencePath,sourceHead:options.sourceHead,runId:randomUUID()});
  const fd = openSync(claimPath,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try { writeFileSync(fd,claim);fsyncSync(fd); } finally { closeSync(fd); }
  const parent = openSync(dirname(claimPath),constants.O_RDONLY);try {fsyncSync(parent);}finally{closeSync(parent);}
  await options.claimEvidence(options.evidencePath,options.sourceHead,false);
  const ownership = lstatSync(claimPath);
  if (!ownership.isFile() || ownership.isSymbolicLink() || ownership.nlink!==1 || ownership.uid!==process.getuid?.() || (ownership.mode&0o077)!==0 || readFileSync(claimPath,'utf8')!==claim) throw Error('Run ownership changed before credential admission');
  fresh();
  const pilot = {...provisional,credential:await options.readCredential()};
  validatePilot(pilot);
  assertPilotLedger(pilot);
  return pilot;
}

export function validatePartnerCatalog(catalog: unknown): unknown {
  const object = (v: unknown): v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!object(catalog) || !Array.isArray(catalog.data)) throw Error('Catalog model/rates unavailable');
  const model = catalog.data.find((m: unknown) => object(m) && m.id === PILOT.model);
  if (!object(model) || !object(model.pricing)) throw Error('Catalog model/rates unavailable');
  for (const [key,ceiling] of Object.entries({prompt:.000002,completion:.00001,input_cache_write:.0000025,input_cache_read:.0000025})) {
    const raw = model.pricing[key];
    if (!(typeof raw === 'number' || (typeof raw === 'string' && /^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw))) || !Number.isFinite(Number(raw)) || Number(raw)<0 || Number(raw)>ceiling) throw Error('Catalog model/rates exceed fixed reservation or are unknown');
  }
  return model;
}
