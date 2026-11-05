import React from 'react';
import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:vi.fn(),reconcileShiftChangeAction:vi.fn()}));
import {CreationView} from './creation-view';
import {EmployeeCreationOperation} from './creation-operation';
import {creationKey,type EmployeeCreationSnapshot,type CreationDraft} from '@/lib/employee-creation';
const fields={sourceShiftId:'own',sourceEpisodeId:'11111111-1111-4111-8111-111111111111',sourceTermsFingerprint:'v1:'+'a'.repeat(64)};
const read:Extract<EmployeeCreationSnapshot,{state:'ready'}>={state:'ready',kind:'creation',authority:'a'.repeat(64),observedAt:'2026-10-27T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',enabled:true,mode:'callout',selection:'own',source:{id:'own',date:'2026-11-03',weekStart:'2026-11-02',startTime:'22:00',endTime:'06:00',location:'Main',position:'Support',lead:false,fields},targets:[],partial:false,check:{allowed:true,notice:null},coverage:{allowed:false,notice:null}};
const draft:CreationDraft={sourceKey:creationKey(fields),targetKey:null,reason:'OTHER',note:'Unsaved private note'};
const render=(snapshot:EmployeeCreationSnapshot|null=read,paused=false,d=draft)=>renderToStaticMarkup(<CreationView state={{snapshot,paused,refreshing:false}} authority={read.authority} mode="callout" sourceId="own" draft={d} operation={new EmployeeCreationOperation()} onDraft={()=>{}} onReview={()=>{}} onRefresh={()=>{}} onSubmit={()=>{}} onRetry={()=>{}}/>);
it('renders native own-report choices, required Other details and original overnight shift without management actions',()=>{
 const html=render();expect(html).toContain('Ends Wed, Nov 4');expect(html).toContain('type="radio"');expect(html).toContain('needed for Other');expect(html).toContain('Send to manager');expect(html).not.toContain('Approve');
});
it('releases private draft and shift UI on pause, denial, changed binding or module-off',()=>{
 for(const [snapshot,paused]of [[read,true],[{state:'unavailable',reason:'access_denied'},false],[{...read,authority:'b'.repeat(64)},false],[{...read,enabled:false,source:null},false]] as const){const html=render(snapshot as EmployeeCreationSnapshot,paused);expect(html).not.toContain('Unsaved private note');expect(html).not.toContain('Main');expect(html).not.toContain('Send to manager');}
});
it('requires a deliberate source review after new terms without discarding the unsent note',()=>{
 const html=render(read,false,{...draft,sourceKey:'old-reviewed-terms'});expect(html).toContain('Review updated shift');expect(html).toContain('Unsaved private note');expect(html).toMatch(/disabled[^>]*>Send to manager/);
});
it('keeps failed swap discovery distinct from empty and preserves the separately checked cover destination',()=>{
 const snapshot={...read,mode:'swap' as const,targets:null,partial:true,check:{allowed:false,notice:'Some checks unavailable'},coverage:{allowed:true,notice:null}};
 const html=renderToStaticMarkup(<CreationView state={{snapshot,paused:false,refreshing:false}} authority={read.authority} mode="swap" sourceId="own" draft={draft} operation={new EmployeeCreationOperation()} onDraft={()=>{}} onReview={()=>{}} onRefresh={()=>{}} onSubmit={()=>{}} onRetry={()=>{}}/>);
 expect(html).toContain('Shift options couldn’t be checked');expect(html).not.toContain('No eligible shifts');expect(html).toContain('Offer this shift for cover instead');
});
it('shows one explanation for verified-empty swap choices',()=>{
 const snapshot={...read,mode:'swap' as const,targets:[],check:{allowed:false,notice:'No eligible shifts to swap with right now.'}};
 const html=renderToStaticMarkup(<CreationView state={{snapshot,paused:false,refreshing:false}} authority={read.authority} mode="swap" sourceId="own" draft={draft} operation={new EmployeeCreationOperation()} onDraft={()=>{}} onReview={()=>{}} onRefresh={()=>{}} onSubmit={()=>{}} onRetry={()=>{}}/>);
 expect(html.match(/No eligible shifts to swap with right now\./g)).toHaveLength(1);
});
it('names no one it cannot name: the can’t-work and cover rows are text only, with no icon tile (upscale S10)',()=>{
 const callout=render();expect(callout).toContain('Your manager gets this right away');expect(callout).not.toMatch(/class="c-av/);
 const snapshot={...read,mode:'cover' as const,check:{allowed:true,notice:null}};
 const cover=renderToStaticMarkup(<CreationView state={{snapshot,paused:false,refreshing:false}} authority={read.authority} mode="cover" sourceId="own" draft={draft} operation={new EmployeeCreationOperation()} onDraft={()=>{}} onReview={()=>{}} onRefresh={()=>{}} onSubmit={()=>{}} onRetry={()=>{}}/>);
 expect(cover).toContain('Your team at Main');expect(cover).not.toMatch(/class="c-av/);
});
