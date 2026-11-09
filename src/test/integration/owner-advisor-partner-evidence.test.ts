import {expect,it} from 'vitest';
import {summarizePartnerAssertions} from './owner-advisor-partner-evidence';
it('partner comparison layers never convert preflight or scripted transport into model assessment',()=>{
 const result=summarizePartnerAssertions([{testResults:[{assertionResults:[{fullName:'genuine no-problem fixture is configured and fully covered before any alternative',status:'passed'}]}]}]);
 expect(result.find(r=>r.id==='no-problem')).toMatchObject({layer:'deterministic-preflight',status:'passed',actualModelSample:'not-run',semanticAssessment:'not-assessed'});
 expect(result.find(r=>r.id==='memory-after-twelve')!.status).toBe('incomplete');
});
it('partner comparison layers report absent guard evidence as not-run',()=>{
 const result=summarizePartnerAssertions([]);expect(result).toHaveLength(32);expect(result.every(r=>r.status==='incomplete'&&r.checks.every(c=>c.status==='not-run'))).toBe(true);
 expect(summarizePartnerAssertions([{testResults:[{assertionResults:[{fullName:'genuine no-problem fixture is configured and fully covered before any alternative',status:'failed'}]}]}]).find(r=>r.id==='no-problem')!.status).toBe('incomplete');
});

it('partner startup guard rejects unapproved, exhausted, reused and altered identity without provider calls',async()=>{
 const {execFileSync}=await import('node:child_process');
 // The guard suite uses only its own mkdtemp fictional ledgers and sentinel transports.
 expect(()=>execFileSync(process.execPath,['--test','src/test/integration/owner-advisor-partner-pilot.check.mts'],{encoding:'utf8',stdio:['ignore','pipe','pipe']})).not.toThrow();
});

it('requires direct enforced-hours and historical-requirement evidence rather than adjacent validation checks',()=>{
 const adjacent=['bounds strict explicit memory fields and rejects inference/verification inputs','bounds inference projection without silently dropping an active constraint','keeps location matching separate, hashes facts not wall clock'];
 const results=summarizePartnerAssertions([{testResults:[{assertionResults:adjacent.map(fullName=>({fullName,status:'passed'}))}]}]);
 for(const id of ['constraint-is-not-law','historical-rules'])expect(results.find(r=>r.id===id)!.status).toBe('incomplete');
});
