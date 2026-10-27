import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {HoursRecordsView} from './hours-records';
const noop=()=>{};
it('never presents zero recorded totals or correction controls when recorded time is unavailable',()=>{const html=renderToStaticMarkup(<HoursRecordsView data={{state:'unavailable',reason:'read_failed'}} entryId={null} onRefresh={noop}/>);expect(html).not.toContain('0h');expect(html).not.toContain('Request a correction');expect(html).toContain('role="status"');});
it('offers review of actual entry and break facts without adding a clock mutation control',()=>{const entry={id:'own-1',locationName:'Main Office',clockInAt:'2026-10-27T13:00:00Z',clockOutAt:'2026-10-27T17:00:00Z',state:'CLOCKED_OUT' as const,elapsedSeconds:14400,breakSeconds:900,breaks:[{id:'break-1',startAt:'2026-10-27T15:00:00Z',endAt:'2026-10-27T15:15:00Z',name:'Rest break',elapsedSeconds:900}]};const html=renderToStaticMarkup(<HoursRecordsView data={{state:'ready',observedAt:'2026-10-27T18:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',date:'2026-10-27',current:null,today:{entries:[entry],recordedSeconds:14400,breakSeconds:900},recent:{entries:[],total:0,limit:20}}} entryId="own-1" onRefresh={noop}/>);expect(html).toContain('Rest break');expect(html).toContain('9:00 AM');expect(html).toContain('Request a correction');expect(html).not.toMatch(/<button[^>]*>Clock (in|out)/);});
it('keeps original-operation recovery reachable after its fresh edit source disappears',async()=>{
 const {HoursCorrectionForm}=await import('./hours-corrections');
 const {HoursCorrectionOperation}=await import('./hours-operation');
 const operation=new HoursCorrectionOperation();
 await operation.submit({basis:'a'.repeat(32),command:{operationId:'c3849d11-f86e-4f08-8b90-84a8e2053290',kind:'ENTRY_BOUNDARY',timeEntryId:'no-longer-editable',proposedStartAt:'2026-10-27T13:00:00Z',proposedEndAt:'2026-10-27T17:00:00Z',reason:'Original proposal'}},async()=>({status:'unknown'}),()=>true);
 const html=renderToStaticMarkup(<HoursCorrectionForm snapshot={{state:'ready',authority:'a'.repeat(64),observedAt:'2026-10-27T18:00:00Z',timeZone:'America/Puerto_Rico',totalRequests:0,locations:[],targets:[],requests:[]}} basis={'b'.repeat(32)} edit="entry:no-longer-editable" draft={undefined} onDraft={noop} operation={operation} isActive otherPending={false} onSubmit={noop} onRetry={noop} onReset={noop} onRefresh={noop} onEdit={noop}/>);
 expect(html).toContain('Check submission status');expect(html).not.toContain('Send correction request');
});
