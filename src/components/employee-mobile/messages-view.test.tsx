import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {MessageInbox,MessageDetail,MessageRecovery} from './messages-view';
const noop=()=>{};
const item={id:'own',label:'Schedule update',at:'2026-10-27T13:00:00Z',href:'/app/notifications/open?notificationId=own',reviewState:'unread' as const,actionState:'required' as const};
it('explains current page search, required action and a partial source without suggesting generic mark read',()=>{const html=renderToStaticMarkup(<MessageInbox kind="notifications" items={[item]} partial search="" filter="all" timeZone="America/Puerto_Rico" onSearch={noop} onFilter={noop} onOpen={noop}/>);expect(html).toContain('Search this page');expect(html).toContain('Review schedule');expect(html).toContain('Some current notices');expect(html).not.toContain('Mark read');expect(html).not.toContain('All caught up');});
it('does not turn a filtered page or an unavailable source into an all-history empty claim',()=>{const html=renderToStaticMarkup(<MessageInbox kind="notifications" items={[item]} partial={false} search="No match" filter="all" timeZone="America/Puerto_Rico" onSearch={noop} onFilter={noop} onOpen={noop}/>);expect(html).toContain('No matches on this page');expect(html).not.toContain('No notifications');});
it('renders only own reading facts and permitted explicit actions with no recipient roster',()=>{const html=renderToStaticMarkup(<MessageDetail item={{state:'ready',id:'id',revisionId:'revision',contentHash:'hash',title:'Team update',body:'Please check the close.',type:'LOCATION_ANNOUNCEMENT',publishedAt:item.at,editedAt:null,acknowledgement:'REQUIRED',ownAcknowledgedAt:null,ownReadAt:null,authority:'authority',observedAt:item.at,validForMs:45000,timeZone:'America/Puerto_Rico',expiresAt:null,authorContext:'Location update',canWithdraw:false}} busy={false} onAction={noop}/>);expect(html).toContain('Acknowledge update');expect(html).not.toContain('Mark as read');expect(html).not.toContain('Withdraw update');expect(html).not.toMatch(/Recipients|Delivery confirmed|Everyone has read/);});
it('keeps original-operation lookup available when its content is gone and never offers a new send',()=>{const html=renderToStaticMarkup(<MessageRecovery state={{pending:false,notice:'unknown',hasUnknown:true,canRetry:false}} allowed onLookup={noop} onRetry={noop}/>);expect(html).toContain('Check submission status');expect(html).not.toContain('Send update');expect(html).not.toContain('Retry original submission');});
it('shows only the own original audience count without claiming delivery or coworker receipts',()=>{const html=renderToStaticMarkup(<MessageDetail item={{state:'ready',id:'id',revisionId:'revision',contentHash:'hash',title:'Own update',body:'Opening check.',type:'TODAYS_TEAM',publishedAt:item.at,editedAt:null,acknowledgement:'OPTIONAL',ownAcknowledgedAt:null,ownReadAt:null,authority:'authority',observedAt:item.at,validForMs:45000,timeZone:'America/Puerto_Rico',expiresAt:null,authorContext:'Your team update',canWithdraw:true,sentCount:3}} busy={false} onAction={noop}/>);expect(html).toContain('Original audience: 3 recipients');expect(html).not.toContain('Delivery confirmed');expect(html).not.toContain('Read by');});

it.each(['NONE','OPTIONAL','REQUIRED'] as const)('CR-3 preserves separate allowed reading actions for %s',mode=>{
 const html=renderToStaticMarkup(<MessageDetail item={{state:'ready',id:'id',revisionId:'revision',contentHash:'hash',title:'Team update',body:'Fictional content.',type:'LOCATION_ANNOUNCEMENT',publishedAt:'2026-10-27T13:00:00Z',editedAt:null,acknowledgement:mode,ownAcknowledgedAt:null,ownReadAt:null,authority:'authority',observedAt:'2026-10-27T13:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',expiresAt:null,authorContext:'Location update',canWithdraw:false}} busy={false} onAction={()=>{}}/>);
 expect(html.includes('Mark as read')).toBe(mode!=='REQUIRED');expect(html.includes('Acknowledge update')).toBe(mode!=='NONE');
});
it('never calls a partial page with no confirmed rows empty (CR-4)',()=>{
 for(const [search,filter] of [['','all'],['','unread'],['Schedule','all']] as const){
  const html=renderToStaticMarkup(<MessageInbox kind="notifications" items={search?[]:[]} partial search={search} filter={filter} timeZone="America/Puerto_Rico" onSearch={noop} onFilter={noop} onOpen={noop}/>);
  expect(html).toContain('Nothing confirmed on this page');expect(html).toContain('couldn’t be checked, so they aren’t listed');
  expect(html).not.toContain('There are no current items on this page');expect(html).not.toContain('No matches on this page');
  // One explanation, not a warning plus an empty claim.
  expect(html.match(/couldn’t be checked/g)).toHaveLength(1);
 }
 const complete=renderToStaticMarkup(<MessageInbox kind="updates" items={[]} partial={false} search="" filter="all" timeZone="America/Puerto_Rico" onSearch={noop} onFilter={noop} onOpen={noop}/>);
 expect(complete).toContain('There are no current items on this page');
});
