import * as actualReact from 'react' with { rstest: 'importActual' };
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';

// J18 (Nov 24, 2026, both browsers): when the status can't be read (failed, or after a lapse), "Refresh status" is the
// page's one filled button. It comes first, above the outlined "Open billing in Velani", in reading and focus order,
// as the filled button does in every other state.
const preset=rs.hoisted(()=>({states:[] as unknown[]}));
rs.mock('react',()=>({...actualReact,useState:(initial:unknown)=>[preset.states.length?preset.states.shift():initial,()=>{}]}));
rs.mock('next/link',()=>({default:({children,prefetch:_prefetch,...props}:{children:unknown;prefetch?:boolean})=><a {...props}>{children as never}</a>}));
const {BillingRecovery}=await import('./billing');
const render=(state:unknown)=>{preset.states=[state,false,false];return renderToStaticMarkup(<BillingRecovery lang="en" billingOrigin="https://billing.example.invalid" payrollEnabled timeZone={null}/>);};
const at=(html:string,label:string)=>{const i=html.indexOf('>'+label+'<');expect(i).toBeGreaterThan(-1);return i;};

it('puts the filled Refresh status above Open billing when the status could not be read',()=>{
 const html=render({phase:'unavailable'});
 expect(at(html,'Refresh status')).toBeLessThan(at(html,'Open billing in Velani'));
 const refresh=html.slice(html.lastIndexOf('<button',at(html,'Refresh status')),at(html,'Refresh status'));
 const open=html.slice(html.lastIndexOf('<button',at(html,'Open billing in Velani')),at(html,'Open billing in Velani'));
 expect(refresh).not.toContain('disabled');expect(open).not.toBe(refresh);
});
it('keeps Open billing first, and Refresh status a text link below it, when the status is ready',()=>{
 const html=render({phase:'ready',status:{state:'paid',operational:true,trialEndsAt:null,paidThrough:'2026-12-20T00:00:00.000Z',graceEndsAt:null,plan:'small',employeeLimit:15,activeEmployees:8,reason:null,billing:true,export:true}});
 expect(at(html,'Open billing in Velani')).toBeLessThan(at(html,'Refresh status'));
});
