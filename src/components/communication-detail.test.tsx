import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('next/link',()=>({default:({children,...p}:ComponentProps<'a'>)=>createElement('a',p,children)}));
const read={state:'ready' as const,id:'12345678-1234-4234-8234-123456789abc',revisionId:'22345678-1234-4234-8234-123456789abc',contentHash:'b'.repeat(64),title:'Full update',body:'Line one\n<script>plain text</script>\nLast line before acknowledgement',type:'LOCATION_ANNOUNCEMENT' as const,publishedAt:'2026-10-08T12:00:00Z',editedAt:null,acknowledgement:'REQUIRED' as const,ownAcknowledgedAt:null,ownReadAt:null,authority:'a'.repeat(64),observedAt:'2026-10-08T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',expiresAt:null,authorContext:'Management',canWithdraw:false};
async function render(extra:Record<string,unknown>={}){const m=await import('./communication-detail').catch(()=>null);expect(m?.CommunicationDetailView).toBeTypeOf('function');return renderToStaticMarkup(createElement(m!.CommunicationDetailView,{read,paused:false,pending:false,notice:null,onAction:()=>{},onRefresh:()=>{},...extra}));}
it('shows complete escaped text before explicit required acknowledgement without Mark read',async()=>{const html=await render();expect(html).toContain('Last line before acknowledgement');expect(html.indexOf('Last line')).toBeLessThan(html.indexOf('Acknowledge update'));expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).not.toContain('Mark read');expect(html).not.toContain('attachment');expect(html).not.toContain('Reply');});
it('clears private content on pause and version conflict requires fresh review',async()=>{for(const extra of [{paused:true},{notice:'conflict'}]){const html=await render(extra);expect(html).not.toContain('Last line');expect(html).not.toContain('Acknowledge update');}expect(await render({notice:'conflict'})).toContain('Review latest');});
it('unknown result requires lookup and acknowledged version does not ask again',async()=>{expect(await render({notice:'unknown'})).toContain('Check status');const html=await render({read:{...read,ownAcknowledgedAt:'2026-10-08T12:01:00Z'}});expect(html).toContain('Acknowledged');expect(html).not.toContain('Acknowledge update');});
it('keeps manager editing and withdrawal available after a personal acknowledgement',async()=>{
 const html=await render({read:{...read,canWithdraw:true,ownAcknowledgedAt:'2026-10-08T12:01:00Z',management:{draft:{type:read.type,scope:{kind:'LOCATION',locationId:'loc-1'},title:read.title,body:read.body,acknowledgement:read.acknowledgement,expiresAt:null},recipients:[{name:'Fictional Recipient',acknowledgedAt:null}]}}});
 expect(html).toContain('/app/updates/compose?update='+read.id);
 expect(html).toContain('Withdraw update');
 expect(html).toMatch(/<details[\s>]/);
 expect(html).toContain('Fictional Recipient');
});
it('keeps required acknowledgement separate from an earlier read receipt',async()=>{
 const html=await render({read:{...read,ownReadAt:'2026-10-08T12:01:00Z'}});
 expect(html).toContain('type="checkbox"');expect(html).toContain('Acknowledge update');expect(html).not.toContain('Mark read');
});
it('offers Mark read only for informational content and renders a stored read receipt',async()=>{
 const optional={...read,acknowledgement:'OPTIONAL'};
 expect(await render({read:optional})).toContain('Mark read');expect(await render({read:optional})).not.toContain('type="checkbox"');
 const html=await render({read:{...optional,ownReadAt:'2026-10-08T12:01:00Z'}});
 expect(html).toContain('Marked read');expect(html).not.toContain('>Mark read</button>');
});
it('retains manager editing and withdrawal with a native recipient disclosure',async()=>{
 const html=await render({read:{...read,canWithdraw:true,sentCount:2,management:{draft:{},recipients:[{name:'Recipient one',acknowledgedAt:'2026-10-08T12:01:00Z'},{name:'Recipient two',acknowledgedAt:null}]}}});
 expect(html).toMatch(/<details[\s>]/);expect(html).toMatch(/<summary[\s>]/);expect(html).toContain('Recipient one');expect(html).toContain('Recipient two');
 expect(html).toContain('/app/updates/compose?update='+read.id);expect(html).toContain('Withdraw update');expect(html).not.toContain('type="checkbox"');
});
it('shows useful unavailable states without exposing the message or review action',async()=>{
 for(const state of ['withdrawn','unauthorized','unavailable']){
  const html=await render({read:{state,reason:'read_failed'}});expect(html).not.toContain('Last line');expect(html).not.toContain('Acknowledge update');expect(html).toMatch(/<h1[\s>]/);
 }
 const denied=await render({read:{state:'unauthorized',reason:'access_denied'}});expect(denied).toContain('href="/login"');
});
it('unknown results leave acknowledgement and withdrawal disabled while lookup remains available',async()=>{
 const html=await render({notice:'unknown',read:{...read,canWithdraw:true}});
 expect(html).toMatch(/<input[^>]*disabled=""/);expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Acknowledge update/);
 expect(html).toContain('Check status');expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Withdraw update/);
});

it('announces a pending review and offers sign-in after a signed-out action',async()=>{
 const pending=await render({pending:true});expect(pending).toContain('Confirming your review…');
 const denied=await render({notice:'signed-out'});expect(denied).toContain('Your session ended');expect(denied).toContain('href="/login"');expect(denied).not.toContain('Last line');
});
