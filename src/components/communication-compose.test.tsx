import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import type {CommunicationContext,CommunicationDraft,CommunicationRead} from '../lib/communications/types';
import {ComposeForm} from './communication-compose';

rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('next/navigation',()=>({useRouter:()=>({push:rs.fn()})}));
const context:Extract<CommunicationContext,{state:'ready'}>={state:'ready',authority:'a'.repeat(64),observedAt:'2026-10-12T12:00:00Z',validForMs:45000,management:true,businessDate:'2026-10-12',timeZone:'America/Puerto_Rico',locations:[{id:'main',label:'Main Office',todayTeam:true}],shifts:[]};
const draft:CommunicationDraft={type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'main'},title:'Opening routine',body:'Line one\n<script>plain text</script>',acknowledgement:'REQUIRED',expiresAt:null};
const editing:Extract<CommunicationRead,{state:'ready'}>={state:'ready',id:'11111111-1111-4111-8111-111111111111',revisionId:'22222222-2222-4222-8222-222222222222',contentHash:'b'.repeat(64),title:draft.title,body:draft.body,type:draft.type,publishedAt:context.observedAt,editedAt:null,acknowledgement:'REQUIRED',ownAcknowledgedAt:null,ownReadAt:null,authority:context.authority,observedAt:context.observedAt,validForMs:45000,timeZone:context.timeZone,expiresAt:null,authorContext:'Management',canWithdraw:true,management:{draft,recipients:[]}};
const action={pending:false,notice:null,hasUnknown:false,canRetry:false,setNotice:rs.fn(),send:rs.fn(async()=>{}),lookup:rs.fn(async()=>{}),retry:rs.fn(async()=>{}),clear:rs.fn(),pause:rs.fn()};
function render(extra:Partial<ComponentProps<typeof ComposeForm>>={}) {
 return renderToStaticMarkup(createElement(ComposeForm,{context,mode:'manager',authority:context.authority,retained:{current:null},retain:rs.fn(),action,...extra}));
}
it('puts writing before delivery and requires audience review before any publication action',()=>{
 const html=render();expect(html.indexOf('id="communication-title"')).toBeLessThan(html.indexOf('id="communication-type"'));
 expect(html).toContain('>Next<');expect(html).not.toContain('>Publish update<');
 for(const field of ['communication-type','communication-location','communication-requirement'])expect(html).toContain(`id="${field}"`);
 for(const type of ['LOCATION_ANNOUNCEMENT','SHIFT_NOTE','OPERATIONAL_UPDATE','TODAYS_TEAM'])expect(html).toContain(`value="${type}"`);
 // Phase 2 (package Messages): Expires is an optional outlined date and time field; empty means it never expires.
 expect(html).toContain('for="communication-expiration">Expires</label>');expect(html).toContain('Empty means it never expires.');
});
it('keeps employee authorship limited to today’s team without management requirements',()=>{
 const html=render({context:{...context,management:false},mode:'employee'});expect(html).toContain('Today’s team');
 expect(html).not.toContain('id="communication-type"');expect(html).not.toContain('id="communication-requirement"');
 expect(html).toContain('id="communication-location"');expect(html).toContain('Preview audience');
});
it('shows escaped complete editing content and explains version-specific acknowledgements',()=>{
 const html=render({editing,initial:draft});expect(html).toContain('Opening routine');expect(html).toContain('&lt;script&gt;plain text&lt;/script&gt;');
 expect(html).not.toContain('<script>plain text');expect(html).toContain('Earlier confirmations stay with the version people reviewed.');
});
it('preserves stale retained editing content while requiring review of the latest version',()=>{
 const html=render({editing,initial:draft,retained:{current:{revisionId:'old-revision',values:{...draft,scopeKind:'LOCATION',locationId:'main',shiftId:'',title:'Retained draft',body:'Retained message',ack:'REQUIRED',expiration:'',useExpiry:false}}}});
 expect(html).toContain('Retained draft');expect(html).toContain('Your retained draft belongs to the version you originally reviewed.');
 expect(html).toContain('Review latest');expect(html).toContain('<fieldset disabled=""');expect(html).not.toContain('Publish new version');
});
it('locks an unknown result and keeps lookup and same-operation retry available',()=>{
 const html=render({action:{...action,notice:'unknown',hasUnknown:true,canRetry:true}});expect(html).toContain('<fieldset disabled=""');
 expect(html).toContain('Check status');expect(html).toContain('Retry original publication');expect(html).toContain('Publication needs a status check');
});
it('preserves the blocked state without showing private form content or publication controls',()=>{
 const html=render({action:{...action,notice:'blocked'}});expect(html).toContain('Your current permission does not allow publication.');
 expect(html).toContain('Return to updates');expect(html).not.toContain('communication-title');expect(html).not.toContain('Preview audience');
});
it('names the confirmation rule the DEC6 way in review and in the Manager list',async()=>{
 const {readFileSync}=await import('node:fs');
 for(const f of ['communication-compose.tsx','messages-manager-b.tsx','communication-detail.tsx','communication-copy.ts']){const src=readFileSync(new URL('./'+f,import.meta.url),'utf8');expect(src).not.toContain('Must be read');}
 // G98: the words moved unchanged into the en/es table (communication-copy.ts); compose reads them from there.
 const compose=readFileSync(new URL('./communication-copy.ts',import.meta.url),'utf8');
 expect(compose).toContain("mustBeConfirmed: 'Must be confirmed', confirmingOptional: 'Confirming is optional'");
});

it('keeps a complete Spanish acknowledgement switch target around its visible track', async () => {
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('./messages-manager-b.css',import.meta.url),'utf8');
 expect(css).toMatch(/\.mb-tog:lang\(es\)::before \{[^}]*inset: -7px 0;/);
});
