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
    employeeName:'Avery QA',
    isSelf:false,
  }],
};

describe('D2 manager correction surface',()=>{
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
});
