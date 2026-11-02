/** Turns executed Vitest assertions into layer-specific coverage; never scores model judgment. */
import {partnerCases} from '../fixtures/owner-advisor-partner';
export const partnerChecks:Record<string,string[]>={
 'neutral-bottleneck':['preflights actual canonical source and unchanged business tables: scarce'],
 'favorite-pressure':['preflights actual canonical source and unchanged business tables: joint','refuses plain prose in decision mode despite repeated user pressure'],
 'preference-change':['failed prose settles no answer, and priority changes fence a reviewed decision','preflights actual canonical source and unchanged business tables: joint'],
 'availability-reversal':['real availability removal invalidates the earlier complete canonical plan'],
 'publication-reversal':['preflights actual canonical source and unchanged business tables: stale','keeps location matching separate, hashes facts not wall clock'],
 'valid-tradeoff':['preflights actual canonical source and unchanged business tables: joint','supplies mandatory scoped evidence as function results and preserves useful reviewed agreement'],
 'no-problem':['genuine no-problem fixture is configured and fully covered before any alternative'],
 'memory-after-twelve':['keeps explicit memory beyond twelve recent messages'],
 'correct-memory':['memory correction erases history/replay and fences running answers','retains only explicit submissions, corrects in place and removes intent'],
 'forget-memory':['memory correction erases history/replay and fences running answers'],
 'expire-direct-ask':['fails closed for missing/malformed memory; purges expired records'],
 'constraint-is-not-law':['bounds strict explicit memory fields and rejects inference/verification inputs','bounds inference projection without silently dropping an active constraint'],
 'other-owner':['persists explicit private memory, races revisions','cannot use another Owner'],
 'company-rebinding':['keeps explicit memory beyond twelve recent messages and binds reads to original company admission'],
 'memory-cas':['persists explicit private memory, races revisions, replays only revision and rejects altered identity'],
 'memory-inflight':['memory correction erases history/replay and fences running answers'],
 'reported-outcome':['rejects a foreign or nonexistent receipt instead of accepting Owner verification'],
 'checked-outcome':['links a decision to exact server-checked progress and records later changes'],
 'foreign-receipt':['cannot reuse a review in a different session belonging to the same Owner','cannot use another Owner'],
 'annulled-source':["does not accept a notice's annulled subject as the document's status"],
 'private-public-boundary':['reads three fixed sources with real Owner guards','fetches only a registry identity with credentialless fixed GET'],
 'changed-source':['requires qualified exact hash/version/interval and actual confirmed facts'],
 'unavailable-source':['keeps PDFs unread even with a successful byte hash','quarantines redirects, unexpected MIME and HTTP failures'],
 'missing-legal-facts':['requires qualified exact hash/version/interval and actual confirmed facts','rejects extra source-card approval flags and omitted required-fact warnings'],
 'legal-poisoning':['strips executable HTML but treats remaining injected instructions as untrusted text'],
 'legal-conflict':['contradictory confirmed facts cannot satisfy a qualified review','binds review to the registry document version'],
 'one-open-entry':['one unclosed October2 entry is one carry-in record'],
 'historical-denominator':['reads effective corrected boundaries and adjustment provenance','returns bounded retained records with actual full denominators'],
 'historical-rules':['keeps location matching separate, hashes facts not wall clock'],
 'empty-history':['opens with 28-day local historical evidence, no fabricated investigation'],
 'paired-variants':['paired facts include real availability changes omitted by legacy business-only snapshots','paired facts include private Owner context and preserve publication snapshot terms','independent no-gap fixtures compare the same canonical facts','partner comparison layers never convert preflight or scripted transport into model assessment'],
 'budget-custody':['partner startup guard rejects unapproved, exhausted, reused and altered identity without provider calls'],
};
type Assertion={fullName:string;status:string};
export function summarizePartnerAssertions(reports:{testResults:{assertionResults:Assertion[]}[]}[]){
 const assertions=reports.flatMap(r=>r.testResults.flatMap(t=>t.assertionResults));
 return partnerCases.map(c=>{const checks=partnerChecks[c.id].map(needle=>{const matches=assertions.filter(a=>a.fullName.includes(needle));return {needle,status:!matches.length?'not-run':matches.every(a=>a.status==='passed')?'passed':'not-passed',matches};});return {id:c.id,layer:'deterministic-preflight',status:checks.every(c=>c.status==='passed')?'passed':'incomplete',checks,scriptedTransport:'separate-result-required',actualModelSample:'not-run',semanticAssessment:'not-assessed'};});
}
