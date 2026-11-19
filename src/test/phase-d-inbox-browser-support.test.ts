import {expect,it} from '@rstest/core';
import {resolve} from 'node:path';
const {readVisibleInboxCards}=await import(resolve('scripts/phase-d-inbox-browser-support.mjs'));
const start='2026-09-21',end='2026-09-27',href=(id:string)=>`/app/timecards?start=${start}&end=${end}#timecard-${id}`;
const source=(id:string,actorMayReview:boolean,independentReviewRequired=false,concernsActor=false)=>({id:'TIMECARD:'+id,type:'TIMECARD',employeeId:id,href:href(id),review:{actorMayReview,independentReviewRequired,concernsActor,unavailableReason:actorMayReview?null:independentReviewRequired?'independent_review_required':'facts_unavailable',period:{startDate:start,endDate:end}}});
const sources=()=>[source('E',true),source('M',false,true,true)];
const names={E:'Avery',M:'Marco',U:'Quinn'};
const row=(id:string,label:string,detail:string)=>({href:href(id),label,text:detail,detail});
const observations=()=>[{id:'todo-waiting-timecards',label:'Timecards to approve1',count:1,hrefs:[href('E'),href('M')],rows:[row('E','Timecards to approve: Avery','1 of 2 timecards · Avery'),row('M','Your timecard. Another reviewer approves this one. It needs an Owner or a Manager with company access.','Sep 21 – 27Another reviewer approves this one')]}];
// This boundary supplies collected DOM observations; the real browser exercises extraction and native visibility.
const read=(cards=observations(),items=sources())=>readVisibleInboxCards({evaluateAll:async()=>structuredClone(cards)},items,names);
it('keeps the independent own row visible without counting it or duplicating the actionable period',async()=>{
 const [card]=await read();expect(card).toMatchObject({count:1,representedCount:1,nonReviewableCount:1,quietOnly:false});expect(card.rows).toHaveLength(2);
});
it('rejects a missing independent-review row rather than silently dropping the work',async()=>{const cards=observations();cards[0].rows.pop();await expect(read(cards)).rejects.toThrow();});
it('still rejects two actionable primary rows for the same period',async()=>{const cards=observations();cards[0].rows.push({...cards[0].rows[0]});await expect(read(cards)).rejects.toThrow('One actionable timecard row per period');});
it('rejects counting an independent subject in the actionable badge',async()=>{const cards=observations();cards[0].count=2;await expect(read(cards)).rejects.toThrow('displayed timecard count');});
it('rejects an independent subject name in the actionable group',async()=>{const cards=observations();cards[0].rows[0].label+=' Marco';await expect(read(cards)).rejects.toThrow('Non-reviewable subjects are absent');});
it('keeps missing review facts visible but uncounted, with an explicit unknown explanation',async()=>{
 const cards=observations();cards[0].rows[0].detail='1 of 3 timecards · Avery';cards[0].rows.push(row('U','Quinn. Who approves this could not be checked','Sep 21 – 27Who approves this could not be checked'));
 const [card]=await read(cards,[...sources(),source('U',false)]);expect(card).toMatchObject({count:1,representedCount:1,nonReviewableCount:2});
});
it('rejects a quiet independent row presented without its reviewer explanation',async()=>{const cards=observations();cards[0].rows[1].label='Your timecard';await expect(read(cards)).rejects.toThrow('independent reviewer');});
it('allows a group containing only another-reviewer work with no actionable badge',async()=>{
 const card=observations()[0];const quiet={...card,count:null,hrefs:[href('M')],rows:[card.rows[1]]};
 const [checked]=await readVisibleInboxCards({evaluateAll:async()=>structuredClone([quiet])},[sources()[1]],names);expect(checked).toMatchObject({count:null,representedCount:0,nonReviewableCount:1,quietOnly:true});
});

it('keeps an older source with omitted review facts visible and uncounted using its exact period link',async()=>{
 const card=observations()[0];const quiet={...card,count:null,hrefs:[href('U')],rows:[row('U','Quinn. Who approves this could not be checked','Who approves this could not be checked')]};
 const [checked]=await readVisibleInboxCards({evaluateAll:async()=>structuredClone([quiet])},[{id:'TIMECARD:U',type:'TIMECARD',employeeId:'U',href:href('U')}],names);expect(checked).toMatchObject({count:null,representedCount:0,nonReviewableCount:1});
});
