import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ManagerTimeCorrectionsSurface } from './manager-time-corrections';
import type { ManagerTimeCorrections } from '@/lib/time-corrections/read-model';

const ready: Extract<ManagerTimeCorrections,{state:'ready'}> = {
  state:'ready',
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

describe('D2 manager correction surface',()=>{
  it('distinguishes immutable recorded, canonical effective and pending proposed time with prior approval',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Current effective');
    expect(html).toContain('8:15 AM');
    expect(html).toContain('11:45 AM');
    expect(html).toContain('Prior decisions');
    expect(html).toContain('Checked earlier boundaries.');
    expect(html).toContain('America/Puerto_Rico');
  });
  it('does not present a cleared, unverified snapshot as a confirmed empty queue',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Updates paused');
    expect(html).not.toContain('No correction requests');
    expect(html).not.toContain('✓');
    expect(html).not.toContain('manager-corrections-count');
    expect(html).toContain('role="status"');
  });
  it('announces initial loading without counts or an empty claim',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={true} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Loading correction requests');expect(html).not.toContain('No correction requests');expect(html).not.toContain('manager-corrections-count');
  });
  it('keeps the Logic Fixer retry control independent of cleared queue presentation',()=>{
    const retry={operationId:'77777777-7777-4777-8777-777777777777',requestId:ready.requests[0].id,expectedRevision:1,decision:'APPROVE' as const};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={false} busyId={null} notice="Outcome unconfirmed" onDecision={vi.fn()} onRetry={vi.fn()} retry={retry}/>);
    expect(html).toContain('Retry same decision');expect(html).toContain('Updates paused');expect(html).not.toContain('No correction requests');
  });
  it('identifies the previous approved missing interval as adjustment evidence',()=>{
    const snapshot={...ready,requests:[{...ready.requests[0],kind:'MISSING_ENTRY' as const}]};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={snapshot} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Approved missing time');
    expect(html).not.toContain('<small>Recorded</small>');
  });
  it('shows recorded versus proposed values and bounded manager actions',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Correction requests');
    expect(html).toContain('Avery QA');
    expect(html).toContain('Recorded');
    expect(html).toContain('Proposed');
    expect(html).toContain('The tablet stayed open after I left.');
    expect(html).toContain('Approve');
    expect(html).toContain('Decline');
    expect(html).toContain('aria-label="Approve correction for Avery QA"');
    expect(html).toContain('aria-label="Decline correction for Avery QA"');
    expect(html).toContain('Original recorded punches stay unchanged');
  });

  it('disables self-review and explains that another reviewer is required',()=>{
    const snapshot={...ready,requests:[{...ready.requests[0],isSelf:true,employeeName:'Owner QA'}]};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={snapshot} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Another manager or owner must review your request.');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Approve<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Decline<\/button>/);
  });

  it('renders a calm empty state and never invents pending work',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{...ready,requests:[]}} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('No correction requests');
    expect(html).not.toContain('Approve');
  });

  it('fails visibly but without diagnostics when the protected reader is unavailable',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{state:'unavailable',reason:'read_failed'}} loading={false} busyId={null} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={null}/>);
    expect(html).toContain('Correction requests unavailable');
    expect(html).not.toMatch(/sql|postgres|token/i);
  });

  it('bounds new decisions and retry while an uncertain operation is in flight',()=>{
    const retry={operationId:'11111111-1111-4111-8111-111111111111',requestId:ready.requests[0].id,expectedRevision:1,decision:'APPROVE' as const};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={retry.requestId} notice={null} onDecision={vi.fn()} onRetry={vi.fn()} retry={retry}/>);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Retry same decision<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Approve<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Decline<\/button>/);
  });
});
