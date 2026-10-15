import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {takeActivationFragment,ActivationInvitationView,readActivationResult} from './activation-invitation';

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
