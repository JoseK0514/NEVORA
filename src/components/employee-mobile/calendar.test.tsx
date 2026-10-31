import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {CalendarSubscriptionView} from '../calendar-subscription-panel';
const ready={state:'active' as const,id:'own',generation:'current',issuedAt:'2026-10-27',allowedLocationIds:['loc-1'],authority:'own',observedAt:'2026-10-27',validForMs:45000,canIssue:true};
const base={status:ready,url:null,paused:false,busy:false,notice:'',onCommand:()=>{},onCopy:()=>{},onRetry:()=>{},mobile:true};
it('board E-Calendar: link card with status, setup per calendar app, then Reset link in red',()=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base}/>);
 expect(html).toContain('Your calendar link');expect(html).toContain('>Active<');expect(html).toContain('Your shifts, in your calendar');expect(html).toContain('Or add it straight to');
 expect(html).toContain('Apple Calendar');expect(html).toContain('Google Calendar');expect(html).toContain('>Reset link<');expect(html).toContain('The old link stops working right away.');expect(html).toContain('>Revoke link<');
 expect(html).toContain('aria-controls="calendar-link-confirmation"');expect(html).not.toContain('Example week');expect(html).not.toContain('Check NEVORA');
 expect(html.match(/class="c-btn"/g)??[]).toHaveLength(0);
});
it('offers one primary to create a link when there is none',()=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} status={{...ready,state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[]}}/>);
 expect(html).toContain('>Off<');expect(html).toContain('>Create calendar link<');expect(html.match(/class="c-btn"/g)).toHaveLength(1);expect(html).not.toContain('>Reset link<');
});
it('does not offer issuance while current canonical eligibility is absent',()=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} status={{...ready,state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],canIssue:false}}/>);expect(html).toContain('No eligible work location');expect(html).not.toContain('>Create calendar link<');
});
it('keeps the one-time link labelled and selectable, with one primary Copy calendar link',()=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} url="PRIVATE-ONCE"/>);expect(html).toContain('Your private calendar link');expect(html).toContain('PRIVATE-ONCE');expect(html).toContain('>Copy calendar link<');expect(html).toContain('Shown once');expect(html).not.toContain('Calendar connected');
 expect(html.match(/class="c-btn"/g)).toHaveLength(1);
});
it('limits an uncertain write to original recovery rather than replacement or revocation',()=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} notice="The result is unknown." pendingKind="ROTATE"/>);expect(html).toContain('Retry original request');expect(html).not.toContain('>Revoke link<');expect(html).not.toContain('>Reset link<');
});
it('does not render private URL/provider or management actions after pause or denial',()=>{
 expect(renderToStaticMarkup(<CalendarSubscriptionView {...base}/>)).toContain('aria-labelledby="calendar-provider-title"');
 for(const props of [{paused:true},{status:{state:'unauthorized' as const,reason:'access_denied'}}]){
  const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} {...props} url="PRIVATE-ONCE"/>);expect(html).not.toContain('PRIVATE-ONCE');expect(html).not.toContain('aria-labelledby="calendar-provider-title"');expect(html).not.toContain('>Revoke link<');expect(html).not.toContain('>Reset link<');
 }
});
