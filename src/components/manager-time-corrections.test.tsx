import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: ComponentProps<'a'>) => createElement('a', { href, ...props }, children) }));
vi.mock('./quiet/u1.css', () => ({}));
import { CorrectionDecisionRow, ManagerTimeCorrectionsSurface,pausedCorrectionNotice } from './manager-time-corrections';
import type { ManagerTimeCorrections } from '@/lib/time-corrections/read-model';

const ready: Extract<ManagerTimeCorrections,{state:'ready'}> = {
  state:'ready',
  validForMs:45000,
  observedAt:'2030-10-07T16:10:00Z',
  timeZone:'America/Puerto_Rico',
  requests:[{
    id:'66666666-6666-4666-8666-666666666666',
    kind:'ENTRY_BOUNDARY',
    status:'PENDING',
    revision:1,
    createdAt:'2030-10-07T16:05:00Z',
    locationId:'loc-1',
    locationName:'Fuel Coffee Drive',
    originalStartAt:'2030-10-07T12:00:00Z',
    originalEndAt:'2030-10-07T16:00:00Z',
    proposedStartAt:'2030-10-07T12:05:00Z',
    proposedEndAt:'2030-10-07T15:55:00Z',
    breakName:null,
    reason:'The tablet stayed open after I left.',
    baseChanged:false,
    context:{state:'confirmed',sourceKind:'ADJUSTMENT',startAt:'2030-10-07T12:15:00Z',endAt:'2030-10-07T15:45:00Z',totalDecisions:1,decisions:[{
      status:'APPROVED',decidedAt:'2030-10-07T16:02:00Z',startAt:'2030-10-07T12:15:00Z',endAt:'2030-10-07T15:45:00Z',note:'Checked earlier boundaries.',
    }]},
    employeeName:'Avery QA',
    isSelf:false,
  }],
};
const plain = (html: string) => html.replace(/ /g, ' ');

describe('D2 manager correction surface (Quiet, final pass)',()=>{
  it('distinguishes immutable recorded, canonical effective and pending proposed time with prior approval',()=>{
    const html=plain(renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>));
    expect(html).toContain('<b>Recorded</b><span>Oct 7, 8:00 AM – 12:00 PM</span>');
    expect(html).toContain('<b>Counts now</b><span>Oct 7, 8:15 AM – 11:45 AM</span>');
    expect(html).toContain('From an approved correction');
    expect(html).toContain('<b>Asked for</b><span>Oct 7, 8:05 AM – 11:55 AM</span>');
    expect(html).toContain('Earlier decisions');
    expect(html).toContain('Checked earlier boundaries.');
    expect(html).toContain('Times in Puerto Rico time');
    expect(html).not.toContain('America/Puerto_Rico');
  });
  it('does not present a cleared, unverified snapshot as a confirmed empty queue',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Updates paused');
    expect(html).not.toContain('Approve');
    expect(html).not.toContain('q-sec__aside');
    expect(html).toContain('role="status"');
  });
  it('announces initial loading without counts or an empty claim',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={true} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Checking correction requests');expect(html).toContain('aria-busy="true"');expect(html).not.toContain('q-sec__aside');
  });
  it('keeps the Logic Fixer retry control independent of cleared queue presentation',()=>{
    const retry={operationId:'77777777-7777-4777-8777-777777777777',requestId:ready.requests[0].id,expectedRevision:1,decision:'APPROVE' as const};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={false} busyId={null} notice="Outcome unconfirmed" onDecision={vi.fn()} onRetry={vi.fn()} retry={retry}/>);
    expect(html).toContain('Try again');expect(html).toContain('Updates paused');expect(html).not.toContain('Avery QA');
  });
  it('identifies the previous approved missing interval as adjustment evidence',()=>{
    const snapshot={...ready,requests:[{...ready.requests[0],kind:'MISSING_ENTRY' as const}]};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={snapshot} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('<b>Approved missing time</b>');
    expect(html).not.toContain('<b>Recorded</b>');
    expect(html).toContain('Missed punch');
  });
  it('shows who, what was asked and bounded manager actions in one Quiet row',()=>{
    const html=plain(renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>));
    expect(html).toContain('Correction requests');
    expect(html).toContain('<span class="q-sec__aside">1</span>');
    expect(html).toContain('<b>Avery QA</b><i>Clock times · Oct 7, 8:05 AM – 11:55 AM</i>');
    expect(html).toContain('The tablet stayed open after I left.');
    expect(html).toContain('aria-label="Approve correction for Avery QA"');
    expect(html).toContain('aria-label="Decline correction for Avery QA"');
    expect(html).toContain('The original Clocker record is kept.');
    expect(html).toContain('id="correction-66666666-6666-4666-8666-666666666666"');
  });

  it('disables self-review and explains that another reviewer is required',()=>{
    const snapshot={...ready,requests:[{...ready.requests[0],isSelf:true,employeeName:'Owner QA'}]};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={snapshot} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Another manager or owner must review your request.');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Approve<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Decline<\/button>/);
  });

  it('shows nothing for a confirmed empty queue and never invents pending work',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{...ready,requests:[]}} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toBe('');
  });

  it('keeps a decision receipt in view after the last request leaves the queue',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{...ready,requests:[]}} loading={false} busyId={null} notice="Correction approved. The original Clocker record is kept." onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Correction approved.');expect(html).not.toContain('Approve correction');
  });

  it('fails visibly but without diagnostics when the protected reader is unavailable',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{state:'unavailable',reason:'read_failed'}} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} onRefresh={vi.fn()} retry={null}/>);
    expect(html).toContain('Correction requests aren’t available right now.');
    expect(html).toContain('Try again');
    expect(html).not.toMatch(/sql|postgres|token/i);
  });

  it('bounds new decisions and retry while an uncertain operation is in flight',()=>{
    const retry={operationId:'11111111-1111-4111-8111-111111111111',requestId:ready.requests[0].id,expectedRevision:1,decision:'APPROVE' as const};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={retry.requestId} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={retry}/>);
    expect(html).toMatch(/<button class="q-btn q-btn--sec" type="button" disabled="">Try again<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Saving…<\/button>/);
    expect(html).not.toMatch(/<button(?![^>]*disabled)[^>]*>(Approve|Decline)<\/button>/);
  });
});

it.each([
 ['offline','offline'],['reconnecting','Reconnecting'],['access_lost','Sign in again'],['unavailable','aren’t available'],['loading','Checking'],['paused','Updates paused'],
] as const)('UX-04 %s clears an old ready queue without an empty claim',(connection,label)=>{const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} connection={connection} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);expect(html).toContain(label);expect(html).not.toContain('Avery QA');expect(html).not.toContain('q-sec__aside');});

it('UX-04 refuses an empty claim even when ready is supplied with a missing snapshot',()=>{const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={false} connection="ready" busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);expect(html).toContain('aren’t available');expect(html).not.toBe('');});

it('D8 private pause retains only non-identifying operation receipt feedback while clearing names/counts',()=>{
 const confirmed='Correction approved. The original Clocker record is kept.';
 expect(pausedCorrectionNotice(confirmed)).toBe(confirmed);expect(pausedCorrectionNotice('Avery private outcome')).toBeNull();
 const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} connection="paused" busyId={null} notice={pausedCorrectionNotice(confirmed)} onDecision={()=>{}} onRetry={()=>{}} retry={null}/>);
 expect(html).toContain(confirmed);expect(html).toContain('Updates paused');expect(html).not.toContain('Avery QA');expect(html).not.toContain('q-sec__aside');
});

it('the reusable decision row (for the timecard sheet) decides through its caller and names the request',()=>{
 const onDecision=vi.fn();
 const html=plain(renderToStaticMarkup(<ul><CorrectionDecisionRow item={{...ready.requests[0],kind:'MISSING_ENTRY',originalStartAt:null,originalEndAt:null,proposedStartAt:'2030-10-25T12:00:00Z',proposedEndAt:'2030-10-25T20:00:00Z'}} zone="America/Puerto_Rico" onDecision={onDecision} open/></ul>));
 expect(html).toContain('<i>Missed punch · Oct 25, 8:00 AM – 4:00 PM</i>');
 expect(html).toContain('<b>Recorded</b><span>Nothing recorded</span>');
 expect(html).toContain('<details class="q-details q-request__details" open="">');
 expect(html).toContain('class="q-bs q-bs--go"');
});
