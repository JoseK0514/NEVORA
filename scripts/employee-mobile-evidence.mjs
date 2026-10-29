import {join} from 'node:path';

/** A full configuration includes earlier journeys. Each gets its own external
 * directory so custody receipts and screenshots cannot overwrite one another. */
export function employeeMobileEvidence(root, suite) {
  const journeys = ['MOBILE','RESPONSES','CREATION','PLANNING','HOURS','MESSAGES','MESSAGES_REVIEW','PROFILE','CALENDAR','PASSKEYS','DEVICE','DELETION','PAY','CLOSURE'];
  return Object.fromEntries(journeys.map(name=>['NEVORA_EMPLOYEE_'+name+'_EVIDENCE',join(root,suite,name.toLowerCase())]));
}
