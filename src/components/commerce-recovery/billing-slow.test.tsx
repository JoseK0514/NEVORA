import * as actualReact from 'react' with { rstest: 'importActual' };
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import {STUCK_MS} from '../company-access/scoped-read-frame';

// J18 polish (Nov 24, 2026, Jose): a status check still running after S-01's threshold says it is still checking, in
// place of "Checking workplace access…", until the answer or the 10 s cut-off.
const preset=rs.hoisted(()=>({states:[] as unknown[]}));
rs.mock('react',()=>({...actualReact,useState:(initial:unknown)=>[preset.states.length?preset.states.shift():initial,()=>{}]}));
rs.mock('next/link',()=>({default:({children,prefetch:_prefetch,...props}:{children:unknown;prefetch?:boolean})=><a {...props}>{children as never}</a>}));
const {BillingRecovery,SLOW_CHECK_MS}=await import('./billing');
const render=(lang:'en'|'es',slow:boolean)=>{preset.states=[{phase:'loading'},false,false,slow];return renderToStaticMarkup(<BillingRecovery lang={lang} billingOrigin="https://billing.example.invalid" payrollEnabled timeZone={null}/>);};

it('uses the scoped read frame threshold',()=>{expect(SLOW_CHECK_MS).toBe(STUCK_MS);});
it.each([
 ['en','Checking workplace access…','Still checking your access. This connection is slow. Your billing details appear when the check finishes.'],
 ['es','Consultando el acceso del negocio…','Seguimos comprobando tu acceso. La conexión está lenta. Los detalles de facturación aparecen cuando termine la comprobación.'],
] as const)('%s: says it is still checking once the check is slow, in the same status line',(lang,checking,still)=>{
 const first=render(lang,false),later=render(lang,true);
 expect(first).toContain(checking);expect(first).not.toContain(still);
 expect(later).toContain(still);expect(later).not.toContain(checking);
 expect(later).toMatch(/<div aria-live="polite" aria-busy="true"><p class="[^"]*" role="status">Still|<div aria-live="polite" aria-busy="true"><p class="[^"]*" role="status">Seguimos/);
});
