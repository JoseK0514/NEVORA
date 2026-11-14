import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {takeActivationFragment,ActivationInvitationView,readActivationResult} from './activation-invitation';

const wrapped='nw1_v1.'+'A'.repeat(16)+'.'+'B'.repeat(100)+'.'+'A'.repeat(22);
it.each(['#'+wrapped,'#proof='+wrapped])('scrubs and retains an isolated invitation envelope unchanged',hash=>{
 const calls:unknown[][]=[];
 expect(takeActivationFragment({hash,pathname:'/activate'},{replaceState:(...args:unknown[])=>{calls.push(args);}})).toBe(wrapped);
 expect(calls).toEqual([[null,'','/activate']]);
});
it.each([wrapped+'?private=1',wrapped+'&proof=other',wrapped.replace('nw1_','nw2_'),'%6E'+wrapped.slice(1),wrapped+'\n','nw1_v1.'+'A'.repeat(16)+'.'+'B'.repeat(4096)+'.'+'A'.repeat(22)])('scrubs but rejects a malformed or ambiguous isolated proof',proof=>{
 expect(takeActivationFragment({hash:'#proof='+proof,pathname:'/activate'},{replaceState:()=>{}})).toBeNull();
});

it.each(['#'+'A'.repeat(43),'#proof='+'A'.repeat(43)])('scrubs the complete URL before returning a canonical fragment proof',hash=>{
 const calls:unknown[][]=[];const proof=takeActivationFragment({hash,pathname:'/activate'},{replaceState:(...args:unknown[])=>{calls.push(args);}});
 expect(calls).toEqual([[null,'','/activate']]);expect(proof).toBe('A'.repeat(43));
});
it.each(['','#bad','#proof='+'A'.repeat(43)+'&proof=other','#%41'+'A'.repeat(42),'#'+'B'.repeat(43)])('scrubs but rejects malformed or ambiguous proof input',hash=>{
 const calls:unknown[][]=[];expect(takeActivationFragment({hash,pathname:'/activate'},{replaceState:(...args:unknown[])=>{calls.push(args);}})).toBeNull();expect(calls).toEqual([[null,'','/activate']]);
});
it('never releases the proof when history scrubbing fails',()=>{expect(()=>takeActivationFragment({hash:'#'+'A'.repeat(43),pathname:'/activate'},{replaceState:()=>{throw new Error('denied');}})).toThrow('Invitation could not be opened safely.');});
it.each(['missing','invalid'] as const)('offers a normal sign-in/help route without a no-proof activation fallback (%s)',phase=>{
 const html=renderToStaticMarkup(<ActivationInvitationView phase={phase} loginHref="/login" onSubmit={()=>{}}/>);
 expect(html).toContain('href="/login"');expect(html).not.toContain('<form');expect(html).not.toContain('name="phone"');expect(html).not.toContain('name="employeeId"');
});
it('does not offer another potentially completed activation after an uncertain outcome',()=>{
 const html=renderToStaticMarkup(<ActivationInvitationView phase="outcome_unknown" loginHref="/login" onSubmit={()=>{}}/>);
 expect(html).toContain('href="/login"');expect(html).not.toContain('type="submit"');
});

it.each([{state:['activated']},{state:'activated',proof:'private'},{state:'other'},null])('rejects malformed/expanded public result envelopes before using them',value=>{expect(()=>readActivationResult(value)).toThrow();});
it('accepts the own login ID only in the exact confirmed-success envelope',()=>{expect(readActivationResult({state:'activated',employeeId:'OWN-FIXTURE-ID'})).toEqual({state:'activated',employeeId:'OWN-FIXTURE-ID'});});
it.each([{state:'activated'},{state:'activated',employeeId:''},{state:'activated',employeeId:['OWN-FIXTURE-ID']},{state:'invalid',employeeId:'OWN-FIXTURE-ID'},{state:'unavailable',employeeId:'OWN-FIXTURE-ID'},{state:'outcome_unknown',employeeId:'OWN-FIXTURE-ID'}])('rejects missing success identity and any failure identity',value=>{expect(()=>readActivationResult(value)).toThrow();});
it('keeps a confirmed recipient ID visible until explicit normal sign-in',()=>{const html=renderToStaticMarkup(<ActivationInvitationView phase="activated" employeeId="OWN-FIXTURE-ID" loginHref="/login?activated=1" onSubmit={()=>{}}/>);expect(html).toContain('OWN-FIXTURE-ID');expect(html).toContain('Continue to sign in');expect(html).toContain('href="/login?activated=1"');});
it('offers Owner-assisted login-ID/status recovery for an unknown outcome',()=>{const html=renderToStaticMarkup(<ActivationInvitationView phase="outcome_unknown" loginHref="/login" onSubmit={()=>{}}/>);expect(html).toContain('confirm your account status and Employee ID');expect(html).not.toContain('type="submit"');});
