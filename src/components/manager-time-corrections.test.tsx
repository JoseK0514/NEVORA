import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, rs } from '@rstest/core';
import { ManagerTimeCorrectionsSurface,pausedCorrectionNotice } from './manager-time-corrections';
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

describe('D2 manager correction surface',()=>{
  it('distinguishes immutable recorded, canonical effective and pending proposed time with prior approval',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    expect(html).toContain('Current effective');
    expect(html).toContain('8:15 AM');
    expect(html).toContain('11:45 AM');
    expect(html).toContain('Prior decisions');
    expect(html).toContain('Checked earlier boundaries.');
    expect(html).toContain('Times in Puerto Rico time');
    expect(html).not.toContain('America/Puerto_Rico');
  });
  it('Phase 2 gate: a clock in and out request names only its location; other kinds keep their label',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    expect(html).toContain('Fuel Coffee Drive');
    expect(html).not.toContain('Clock in / Clock out');
    const missing=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{...ready,requests:[{...ready.requests[0],kind:'MISSING_ENTRY' as const}]}} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    expect(missing).toContain('Missing time');
  });
  it('Phase 2 gate: without access the band has only the title, and the card says why once',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={false} connection="not_allowed" busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null} band={{zone:'America/Puerto_Rico'}}/>);
    expect(html).toContain('You don’t have access to time corrections');
    expect(html).not.toContain('Fixes your team asked for');
    expect(html).not.toContain('c-phone-sub');
  });
  it('OW-015: on the Time corrections page the count and the note about times are said once, under the title',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null} band={{zone:'America/Puerto_Rico'}}/>);
    const line=`${ready.requests.length} waiting · Fixes your team asked for. Original times are always kept. Times in Puerto Rico time.`;
    // Twice in the markup (the phone's sub-line and the title's; one shows per width), never inside a card.
    expect(html.split(line).length-1).toBe(2);
    expect(html).not.toContain('correction-context-zone');
    expect(html).not.toContain('Approving changes the timecard');
    expect(html).toContain('class="manager-corrections-header sr-only"');
    expect(html).toContain('<h1 id="tcx-title"');
  });
  it('OW-015: before the read lands the sub-line has no count and uses the workplace zone',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={true} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null} band={{zone:'America/Puerto_Rico'}}/>);
    expect(html).toContain('>Fixes your team asked for. Original times are always kept. Times in Puerto Rico time.<');
    expect(html).not.toContain('waiting ·');
  });
  it('does not present a cleared, unverified snapshot as a confirmed empty queue',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    expect(html).toContain('Updates paused');
    expect(html).not.toContain('Nothing to fix');
    expect(html).not.toContain('✓');
    expect(html).not.toContain('manager-corrections-count');
    expect(html).toContain('role="status"');
  });
  it('announces initial loading without counts or an empty claim',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={true} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    expect(html).toContain('Loading correction requests');expect(html).not.toContain('Nothing to fix');expect(html).not.toContain('manager-corrections-count');
  });
  it('keeps the Logic Fixer retry control independent of cleared queue presentation',()=>{
    const retry={operationId:'77777777-7777-4777-8777-777777777777',requestId:ready.requests[0].id,expectedRevision:1,decision:'APPROVE' as const};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={false} busyId={null} notice="Outcome unconfirmed" onDecision={rs.fn()} onRetry={rs.fn()} retry={retry}/>);
    expect(html).toContain('Retry same decision');expect(html).toContain('Updates paused');expect(html).not.toContain('Nothing to fix');
  });
  it('identifies the previous approved missing interval as adjustment evidence',()=>{
    const snapshot={...ready,requests:[{...ready.requests[0],kind:'MISSING_ENTRY' as const}]};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={snapshot} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    expect(html).toContain('Approved missing time');
    expect(html).not.toContain('<small>Recorded</small>');
  });
  it('shows recorded versus proposed values and bounded manager actions',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    expect(html).toContain('Correction requests');
    expect(html).toContain('Avery QA');
    expect(html).toContain('Recorded');
    // Review B6 (NV-080): the decision's tiles are Recorded and Asked for, with how much it changes.
    expect(html).toContain('Asked for');expect(html).toContain('+20 min');
    expect(html).toContain('The tablet stayed open after I left.');
    expect(html).toContain('Approve');
    expect(html).toContain('Decline');
    expect(html).toContain('aria-label="Approve correction for Avery QA"');
    expect(html).toContain('aria-label="Decline correction for Avery QA"');
    // B7 wording (NV-020): the provenance line is plain language.
    expect(html).toContain('the original clock times stay in the history.');
  });

  it('disables self-review and explains that another reviewer is required',()=>{
    const snapshot={...ready,requests:[{...ready.requests[0],isSelf:true,employeeName:'Owner QA'}]};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={snapshot} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    // B7 wording (NV-020): plain self-review note, Owner capitalised as a role.
    expect(html).toContain('Another manager or an Owner reviews your own request.');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Approve<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Decline<\/button>/);
  });

  it('renders a calm empty state and never invents pending work',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{...ready,requests:[]}} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    expect(html).toContain('Nothing to fix');
    expect(html).not.toContain('Approve');
  });

  it('fails visibly but without diagnostics when the protected reader is unavailable',()=>{
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{state:'unavailable',reason:'read_failed'}} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
    expect(html).toContain('Correction requests unavailable');
    expect(html).not.toMatch(/sql|postgres|token/i);
  });

  it('bounds new decisions and retry while an uncertain operation is in flight',()=>{
    const retry={operationId:'11111111-1111-4111-8111-111111111111',requestId:ready.requests[0].id,expectedRevision:1,decision:'APPROVE' as const};
    const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} busyId={retry.requestId} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={retry}/>);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Retry same decision<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Approve<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Decline<\/button>/);
  });
});

it.each([
 ['offline','unavailable offline'],['reconnecting','Reconnecting'],['access_lost','access ended'],['not_allowed','have access to time corrections'],['unavailable','Correction requests unavailable'],['loading','Loading'],['paused','Updates paused'],
] as const)('UX-04 %s clears an old ready queue without an empty claim',(connection,label)=>{const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} connection={connection} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);expect(html).toContain(label);expect(html).not.toContain('Nothing to fix');expect(html).not.toContain('Avery QA');expect(html).not.toContain('manager-corrections-count');});

it('UX-04 refuses an empty claim even when ready is supplied with a missing snapshot',()=>{const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={null} loading={false} connection="ready" busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);expect(html).toContain('Correction requests unavailable');expect(html).not.toContain('Nothing to fix');});

it('D8 private pause retains only non-identifying operation receipt feedback while clearing names/counts',()=>{
 const confirmed='Correction approved. The original recorded punch remains unchanged.';
 expect(pausedCorrectionNotice(confirmed)).toBe(confirmed);expect(pausedCorrectionNotice('Avery private outcome')).toBeNull();
 const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={ready} loading={false} connection="paused" busyId={null} notice={pausedCorrectionNotice(confirmed)} onDecision={()=>{}} onRetry={()=>{}} retry={null}/>);
 expect(html).toContain('Correction approved');expect(html).toContain('Updates paused');expect(html).not.toContain('Avery QA');expect(html).not.toContain('Nothing to fix');expect(html).not.toContain('manager-corrections-count');
});

// QA A3-06 (Nov 21, 2026): Elena lacked the corrections permission and was told her access ended and to sign in again.
it('a missing permission says so and asks the Owner, with no sign-in',()=>{
 const html=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{state:'unavailable',reason:'permission_required'}} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
 expect(html).toContain('You don’t have access to time corrections');expect(html).toContain('Ask the Owner if you need it.');
 expect(html).not.toContain('Sign in');expect(html).not.toContain('access ended');
 const signedOut=renderToStaticMarkup(<ManagerTimeCorrectionsSurface snapshot={{state:'unavailable',reason:'access_denied'}} loading={false} busyId={null} notice={null} onDecision={rs.fn()} onRetry={rs.fn()} retry={null}/>);
 expect(signedOut).toContain('Sign in again');
});
