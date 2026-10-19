import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {CalendarSubscriptionView} from './calendar-subscription-panel';
const state={state:'active' as const,id:'id',generation:'generation',issuedAt:'2026-10-08',allowedLocationIds:['loc-1'],authority:'authority'};
const base={status:state,url:'intentional-transient-url',paused:false,busy:false,notice:'',onCommand:()=>{},onCopy:()=>{},onRetry:()=>{}};
it('private link is absent while hidden even if a prior ready URL is provided',()=>{const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} paused/>);expect(html).not.toContain(base.url);expect(html).toContain('Calendar settings paused');});
it.each(['unauthorized','unavailable'] as const)('never renders a private URL or copy actions with %s status',state=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} status={{state,reason:'read_failed'}}/>);
 expect(html).not.toContain(base.url);expect(html).not.toContain('Copy link');expect(html).not.toContain('Select link');
});
it('lost URL offers deliberate Replace while explaining copied-data limits and client refresh',()=>{const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} url={null}/>);expect(html).toContain('Replace link');expect(html).toContain('Calendar apps refresh on their own schedule');expect(html).toContain('cannot remove information already copied');expect(html).not.toContain('Calendar connected');});
it('copy feedback belongs to completed copy only and manual selection remains available',()=>{const html=renderToStaticMarkup(<CalendarSubscriptionView {...base}/>);expect(html).toContain('Copy link');expect(html).toContain('Select link');expect(html).not.toContain('Link copied');expect(html).toContain('Apple Calendar');expect(html).toContain('Google Calendar');expect(html).toContain('Outlook');});

it('unknown issuance keeps only original-operation recovery available',()=>{const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} url={null} notice="The result is unknown. Retry the same operation to check it."/>);expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Replace link<\/button>/);expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Revoke link<\/button>/);expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>(<svg.*?<\/svg>)?Try again<span class="nv-sr"> to load the calendar link<\/span><\/button>/);});
