import {expect,it,rs} from '@rstest/core';
import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
import {CoverageReview,unconfirmedCheck,type CoverageReviewMode} from './coverage-review';

const read=(mode:CoverageReviewMode,draftHref?:string)=>renderToStaticMarkup(createElement(CoverageReview,{
 mode,employeeName:'Avery Rivera',replacedName:'Sam Cruz',shift:{date:'2026-10-14',startTime:'08:00',endTime:'16:00',minutes:480},
 locationName:'Condado',positionName:'Barista',isDesignatedLead:false,weekHours:{beforeMinutes:960,afterMinutes:1440,targetMinutes:2400},
 warnings:[],backHref:'/app/schedule/coverage?x=1',draftHref,action:async()=>({}),hidden:{coverageRepairReview:'token'},
}));

it('a location Manager’s draft review lets the button say what happens, with no line above it (G37)',()=>{
 const html=read('scoped-draft','/app/schedule/new?week=2026-10-12');
 expect(html).toContain('>Add draft shift</a>');
 expect(html).not.toContain('Opens Add shift');
 expect(html).not.toContain('c-review__outcome');
});

it('each other mode keeps its one line about what happens next',()=>{
 expect(read('publish')).toContain('We’ll notify Avery when you publish.');
 expect(read('draft')).toContain('Avery sees it once you publish the week.');
 expect(read('scoped-ask')).toContain('Company-wide access needed');
 expect(read('needs-publish-permission')).toContain('Publishing permission needed');
});

it('a lost or failed reply checks Find cover, in words that never claim nothing was saved (G58)',()=>{
 expect(unconfirmedCheck(true,'/app/schedule/coverage?x=1')).toEqual({title:'This change could not be confirmed. It may already be published; check coverage before you publish again.',label:'Check coverage',href:'/app/schedule/coverage?x=1'});
 expect(unconfirmedCheck(false,'/b').title).toBe('This change could not be confirmed. It may already be saved; check coverage before you save again.');
 for(const words of [unconfirmedCheck(true,'/a').title,unconfirmedCheck(false,'/a').title])expect(words).not.toContain('Nothing was saved');
});
