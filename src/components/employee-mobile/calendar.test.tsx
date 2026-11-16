import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import type {ReactElement} from 'react';
import {CalendarSubscriptionView} from '../calendar-subscription-panel';
import {onlyB,withoutB} from '../owner-b/test-support';
// The corporate layout (tablets and desktop) and the phone screen (Direction B): both render, CSS shows one.
const corp=(element:ReactElement)=>withoutB(renderToStaticMarkup(element)),phone=(element:ReactElement)=>onlyB(renderToStaticMarkup(element));
const ready={state:'active' as const,id:'own',generation:'current',issuedAt:'2026-10-27',allowedLocationIds:['loc-1'],authority:'own',observedAt:'2026-10-27',validForMs:45000,canIssue:true};
const base={status:ready,url:null,paused:false,busy:false,notice:'',onCommand:()=>{},onCopy:()=>{},onRetry:()=>{},mobile:true};
// B7 wording (glossary "Calendar feed"): Reset/Revoke link are now "Get a new link" and "Turn off link".
it('board E-Calendar: link card with status, setup per calendar app, then Reset link in red',()=>{
 const html=corp(<CalendarSubscriptionView {...base}/>);
 expect(html).toContain('Your calendar link');expect(html).toContain('>Active<');expect(html).toContain('Your shifts, in your calendar');expect(html).toContain('Or add it straight to');
 expect(html).toContain('Apple Calendar');expect(html).toContain('Google Calendar');expect(html).toContain('>Get a new link<');expect(html).toContain('The old link stops working right away.');expect(html).toContain('>Turn off link<');
 expect(html).toContain('aria-controls="calendar-link-confirmation"');expect(html).not.toContain('Example week');expect(html).not.toContain('Check NEVORA');
 expect(html.match(/class="c-btn"/g)??[]).toHaveLength(0);
});
it('offers one primary to create a link when there is none',()=>{
 const html=corp(<CalendarSubscriptionView {...base} status={{...ready,state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[]}}/>);
 expect(html).toContain('>Off<');expect(html).toContain('>Create calendar link<');expect(html.match(/class="c-btn"/g)).toHaveLength(1);expect(html).not.toContain('>Get a new link<');
});
it('does not offer issuance while current canonical eligibility is absent',()=>{
 const html=corp(<CalendarSubscriptionView {...base} status={{...ready,state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],canIssue:false}}/>);expect(html).toContain('No eligible work location');expect(html).not.toContain('>Create calendar link<');
});
it('keeps the one-time link labelled and selectable, with one primary Copy calendar link',()=>{
 const html=corp(<CalendarSubscriptionView {...base} url="PRIVATE-ONCE"/>);expect(html).toContain('Your private calendar link');expect(html).toContain('PRIVATE-ONCE');expect(html).toContain('>Copy calendar link<');expect(html).toContain('Shown once');expect(html).not.toContain('Calendar connected');
 expect(html.match(/class="c-btn"/g)).toHaveLength(1);
});
it('limits an uncertain write to original recovery rather than replacement or revocation',()=>{
 const html=corp(<CalendarSubscriptionView {...base} notice="The result is unknown." pendingKind="ROTATE"/>);expect(html).toContain('Retry original request');expect(html).not.toContain('>Turn off link<');expect(html).not.toContain('>Get a new link<');
});
it('does not render private URL/provider or management actions after pause or denial',()=>{
 expect(renderToStaticMarkup(<CalendarSubscriptionView {...base}/>)).toContain('aria-labelledby="calendar-provider-title"');
 for(const props of [{paused:true},{status:{state:'unauthorized' as const,reason:'access_denied'}}]){
  const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} {...props} url="PRIVATE-ONCE"/>);expect(html).not.toContain('PRIVATE-ONCE');expect(html).not.toContain('aria-labelledby="b-calendar-providers-h"');expect(html).not.toContain('aria-labelledby="calendar-provider-title"');expect(html).not.toContain('>Turn off link<');expect(html).not.toContain('>Get a new link<');
 }
});
it('Direction B phone screen: the link card with its chip, the keep-it-private note and one primary; providers; Reset and Revoke',()=>{
 const none=phone(<CalendarSubscriptionView {...base} status={{...ready,state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[]}}/>);
 for(const value of ['Add to calendar','Keep your shifts in the calendar you already use','Your calendar link','>Off<','picks up schedule changes the next time it refreshes','Keep the link to yourself','Anyone with it can see your shift times and locations.','>Create calendar link<','Or add it straight to','Apple Calendar','Google Calendar','Outlook'])expect(none).toContain(value);
 expect(none).toContain('href="/app/more"');expect(none.match(/class="b-btn b-btn--teal b-btn--full b-btn--big"/g)).toHaveLength(1);expect(none).not.toContain('>Get a new link<');
 const active=phone(<CalendarSubscriptionView {...base}/>);expect(active).toContain('>Active<');expect(active).toContain('>Get a new link<');expect(active).toContain('>Turn off link<');expect(active).toContain('aria-controls="b-calendar-link-confirmation"');
 const once=phone(<CalendarSubscriptionView {...base} url="PRIVATE-ONCE"/>);expect(once).toContain('PRIVATE-ONCE');expect(once).toContain('>Copy calendar link<');expect(once).toContain('id="b-calendar-link"');
 expect(phone(<CalendarSubscriptionView {...base} notice="The result is unknown." pendingKind="ROTATE"/>)).toContain('Retry original request');
 expect(phone(<CalendarSubscriptionView {...base} paused/>)).toContain('Calendar settings paused.');
 const denied=phone(<CalendarSubscriptionView {...base} status={{state:'unauthorized',reason:'access_denied'}}/>);expect(denied).toContain('href="/login"');expect(denied).not.toContain('Or add it straight to');
 const page=renderToStaticMarkup(<CalendarSubscriptionView {...base} url="PRIVATE-ONCE"/>),ids=[...page.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);expect(new Set(ids).size).toBe(ids.length);
});
