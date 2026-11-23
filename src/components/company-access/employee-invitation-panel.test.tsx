import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,rs} from '@rstest/core';
rs.mock('next/link',()=>({default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}));
import {EmployeeInvitationPanel} from './employee-invitation-panel';
import type {InvitationStatusResult} from '@/lib/auth/invitations/model';

// Backend contract (Nov 15, 2026): deliveryAvailable is configured capability (never proof of delivery) and
// allowedCommands is empty on a Manager's read-only readiness read.
const status=(over:Partial<Extract<InvitationStatusResult,{state:'ready'}>>={}):InvitationStatusResult=>({state:'ready',employeeId:'E1',employeeVersion:'1',eligibility:'INVITABLE',registeredEmailMasked:'a***@example.test',invitationRevision:1,invitation:null,delivery:'UNAVAILABLE',deliveryAvailable:true,allowedCommands:['ISSUE'],retryAfterMs:null,...over} as InvitationStatusResult);
const html=(s:InvitationStatusResult)=>renderToStaticMarkup(<EmployeeInvitationPanel employeeId="E1" actorId="OWNER" initialStatus={s}/>);

describe('invitation availability',()=>{
 it('an Owner with delivery configured can send',()=>{
  const out=html(status());
  expect(out).toContain('>Send invitation</button>');
  expect(out).not.toContain('aren’t turned on');
  expect(out).not.toContain('An Owner sends invitations');
 });
 it('says why before anyone tries when invitation email isn’t configured, and offers no Send',()=>{
  const out=html(status({deliveryAvailable:false,allowedCommands:[]}));
  expect(out).toContain('Email invitations aren’t turned on for this workplace yet, so an invitation can’t be sent.');
  expect(out).not.toContain('Send invitation');
 });
 it('a Manager’s read stays read-only: no Send or Cancel, and it says who sends invitations',()=>{
  const out=html(status({allowedCommands:[]}));
  expect(out).toContain('An Owner sends invitations.');
  expect(out).not.toMatch(/Send invitation|Send new invitation|Cancel invitation/);
  expect(out).toContain('Check invitation');
 });
 it('never calls a configured or accepted delivery a confirmed delivery',()=>{
  const out=html(status({invitation:{id:'i1',state:'ISSUED',issuedAt:'2026-11-15T12:00:00Z',expiresAt:'2026-11-22T12:00:00Z',issuerName:'Fictional Owner'},delivery:'PROVIDER_ACCEPTED',allowedCommands:['ISSUE','REVOKE']}));
  expect(out).toContain('Accepted for email delivery. This does not confirm receipt or activation.');
  expect(out).not.toMatch(/delivered|in (their|the) inbox|was received/i);
 });
});
