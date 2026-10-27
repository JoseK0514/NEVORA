import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {CalendarSubscriptionView} from '../calendar-subscription-panel';
const ready={state:'active' as const,id:'own',generation:'current',issuedAt:'2026-10-27',allowedLocationIds:['loc-1'],authority:'own',observedAt:'2026-10-27',validForMs:45000,canIssue:true};
const base={status:ready,url:null,paused:false,busy:false,notice:'',onCommand:()=>{},onCopy:()=>{},onRetry:()=>{},mobile:true};
it('uses the accepted mobile flow without the decorative desktop example',()=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base}/>);expect(html).toContain('em-calendar');expect(html).not.toContain('Example week');expect(html).toContain('Your published shifts');expect(html).toContain('Signing out');expect(html).toContain('does not stop');expect(html).toContain('cannot remove information already copied');expect(html).toContain('aria-controls="calendar-link-confirmation"');
});
it('does not offer issuance while current canonical eligibility is absent',()=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} status={{...ready,state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],canIssue:false}}/>);expect(html).toContain('No eligible work location');expect(html).not.toContain('>Create private link<');
});
it('keeps the one-time link labelled and manually selectable with provider-specific setup limits',()=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} url="PRIVATE-ONCE"/>);expect(html).toContain('Your private calendar link');expect(html).toContain('Copy link');expect(html).toContain('Select link');expect(html).toContain('Shown once');expect(html).toContain('Computer required');expect(html).toContain('Creating or copying');expect(html).not.toContain('Calendar connected');
});
it('limits an uncertain write to original recovery rather than replacement or revocation',()=>{
 const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} notice="The result is unknown." pendingKind="ROTATE"/>);expect(html).toContain('Retry original request');expect(html).not.toContain('>Revoke link<');expect(html).not.toContain('>Replace link<');
});
it('does not render private URL/provider or management actions after pause or denial',()=>{
 expect(renderToStaticMarkup(<CalendarSubscriptionView {...base}/>)).toContain('aria-labelledby="calendar-provider-title"');
 for(const props of [{paused:true},{status:{state:'unauthorized' as const,reason:'access_denied'}}]){
  const html=renderToStaticMarkup(<CalendarSubscriptionView {...base} {...props} url="PRIVATE-ONCE"/>);expect(html).not.toContain('PRIVATE-ONCE');expect(html).not.toContain('aria-labelledby="calendar-provider-title"');expect(html).not.toContain('https://support.apple.com/');expect(html).not.toContain('https://support.google.com/');expect(html).not.toContain('https://support.microsoft.com/');expect(html).not.toContain('>Revoke link<');
 }
});
