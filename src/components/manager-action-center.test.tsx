import {it,expect,vi} from 'vitest';
import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
import {ActionCenterSurface} from './manager-action-center';
import {parseActionCenter,type ActionCenter} from '../lib/action-center/project';
const ready:Extract<ActionCenter,{state:'ready'}>={state:'ready',observedAt:'2026-10-07T12:00:00Z',validForMs:45000,weekStart:'2026-10-05',counts:{total:25,scheduling:25,requests:0,timekeeping:0},limitedAttendance:false,items:Array.from({length:25},(_,i)=>({id:'A'+i,type:'AVAILABILITY_MISSING',category:'scheduling',priority:'MISSING_INPUT',title:'Availability needed',detail:'Fictional employee '+i,href:'/app/availability?week=2026-10-05'}))};
it('D7 preserves the full verified count and provides every deduplicated action beyond the preview',()=>{expect(parseActionCenter(ready,ready.weekStart)).toEqual(ready);const html=renderToStaticMarkup(<ActionCenterSurface snapshot={ready} connection="ready"/>);expect(html).toContain('Show all 25 actions');expect(html.match(/data-action-id=/g)).toHaveLength(20);const expanded=renderToStaticMarkup(<ActionCenterSurface snapshot={ready} connection="ready" expanded/>);expect(expanded.match(/data-action-id=/g)).toHaveLength(25);expect(expanded).toContain('week=2026-10-05');});
it.each(['loading','offline','reconnecting','unavailable','access_lost','paused'] as const)('D7 %s clears names/counts and cannot claim no actions',connection=>{const html=renderToStaticMarkup(<ActionCenterSurface snapshot={ready} connection={connection}/>);expect(html).not.toContain('Fictional employee');expect(html).not.toContain('Total actions');expect(html).not.toContain('No actions found');});
it('D7 only a verified empty source can show no actions; missing ready data remains unavailable',()=>{const empty={...ready,counts:{total:0,scheduling:0,requests:0,timekeeping:0},items:[]};expect(renderToStaticMarkup(<ActionCenterSurface snapshot={empty} connection="ready"/>)).toContain('No actions found in the checked sources');expect(renderToStaticMarkup(<ActionCenterSurface snapshot={null} connection="ready"/>)).toContain('Actions unavailable');});
it('D7 rejects count mismatch, duplicates, foreign destinations and unbounded lifetime',()=>{for(const bad of [{...ready,counts:{...ready.counts,total:0}},{...ready,items:[ready.items[0],ready.items[0]]},{...ready,items:[{...ready.items[0],href:'https://other.test'}]},{...ready,validForMs:45001}])expect(()=>parseActionCenter(bad,ready.weekStart)).toThrow();});

import * as managerSurfaces from './manager-action-center';
import type { ActionIntelligenceSurfaceProps } from './manager-action-center';
import { buildActionIntelligence } from '../lib/action-center/intelligence';
import type { ActionFact, ActionIntelligenceInput, ActionIntelligenceResult, SourceKey } from '../lib/action-center/intelligence';

// Plain fictional observations exercise the accepted projection before rendering;
// no fixture booleans authenticate callers or establish native/current authority.
const intelligenceNow = '2026-10-09T12:00:00Z';
const intelligenceBinding = { workspaceId: 'tenant-a', actorId: 'manager-a', role: 'MANAGER' as const,
  sessionVersion: 'session-2', grantsVersion: 'grant-3', scopeVersion: 'scope-4', viewId: 'view-5', weekStart: '2026-10-05' };
const intelligenceSources: SourceKey[] = ['scheduling', 'attendance', 'corrections', 'timecards'];
function intelligenceInput(): ActionIntelligenceInput {
  return {
    context: { ...intelligenceBinding, now: intelligenceNow, authorityExpiresAt: '2026-10-09T12:00:40Z', online: true,
      workforceActive: true, portalState: 'ENABLED', workspaceActive: true, membershipCurrent: true, sessionCurrent: true,
      grantsCurrent: true, actionCenterReadAllowed: true, timeZone: 'America/Puerto_Rico',
      administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['location-a'] },
      selectedLocationIds: ['location-a'], locations: [{ id: 'location-a', workspaceId: 'tenant-a', active: true },
        { id: 'location-b', workspaceId: 'tenant-a', active: true }],
      expectedSourceVersions: { scheduling: 's1', attendance: 'a1', corrections: 'c1', timecards: 't1' } },
    sources: intelligenceSources.map(source => ({ source, binding: { ...intelligenceBinding }, state: 'ready',
      version: ({ scheduling: 's1', attendance: 'a1', corrections: 'c1', timecards: 't1' })[source],
      observedAt: intelligenceNow, expiresAt: '2026-10-09T12:00:30Z', coverage: 'complete', rows: [] })),
  };
}
function intelligenceRequest(id = 'request-a'): ActionFact {
  return { kind: 'REQUEST', meta: { id: 'TIME_OFF:' + id, workspaceId: 'tenant-a', version: '1', currentVersion: '1',
    state: 'ACTIONABLE', footprintComplete: true, locationIds: ['location-a'], subjectIds: ['employee-a'],
    readAllowed: true, destinationAllowed: true, permittedFields: ['employee.identity', 'request'], deadlineAt: null,
    startAt: null, sourceTimestamp: '2026-10-09T11:00:00Z' },
    payload: { id, kind: 'TIME_OFF', employeeId: 'employee-a', employeeName: 'Fictional Alex', createdAt: '2026-10-09T11:00:00Z' } };
}
function withRequests(count = 1): ActionIntelligenceInput {
  const input = intelligenceInput(); const source = input.sources[0];
  if (source.state !== 'ready') throw Error('fixture');
  source.rows = Array.from({ length: count }, (_, index) => intelligenceRequest('request-' + String(index).padStart(2, '0')));
  return input;
}
function projected(input: ActionIntelligenceInput): ActionIntelligenceResult { return buildActionIntelligence(input); }
function display(snapshot: ActionIntelligenceResult | null, changes: Partial<ActionIntelligenceSurfaceProps> = {}) {
  // Probe inside the behavior test, so the initial missing renderer is a RED
  // assertion rather than a module import or test collection failure.
  const renderer: unknown = Reflect.get(managerSurfaces, 'ActionIntelligenceSurface');
  expect(renderer, 'isolated F1 renderer must be implemented').toBeTypeOf('function');
  const props: ActionIntelligenceSurfaceProps = { snapshot, connection: 'ready', expectedViewId: 'view-5',
    weekStart: '2026-10-05', now: intelligenceNow, onRefresh: vi.fn(), onRetrySource: vi.fn(), ...changes };
  return renderToStaticMarkup(createElement(renderer as (props: ActionIntelligenceSurfaceProps) => React.ReactNode, props));
}
function expectNoPrivateActions(html: string) {
  expect(html).not.toContain('Fictional Alex'); expect(html).not.toContain('Observed actions');
  expect(html).not.toContain('data-action-id'); expect(html).not.toContain('request-00');
  expect(html).not.toContain('No actions need review'); expect(html).toContain('unconfirmed');
}

it('F1 retains known authorized actions with named failed, loading and limited sections and observed-only counts', () => {
  const input = withRequests();
  input.sources[1] = { source: 'attendance', binding: { ...intelligenceBinding }, state: 'unavailable', reason: 'READ_FAILED' };
  input.sources[2] = { source: 'corrections', binding: { ...intelligenceBinding }, state: 'loading' };
  const timecards = input.sources[3]; if (timecards.state !== 'ready') throw Error('fixture'); timecards.coverage = 'limited';
  const result = projected(input); expect(result.state).toBe('partial');
  const html = display(result);
  expect(html).toContain('Fictional Alex'); expect(html).toContain('aria-label="Observed actions">1');
  expect(html).toContain('Attendance'); expect(html).toContain('Time corrections'); expect(html).toContain('Period timecards');
  expect(html).toContain('Read unavailable'); expect(html).toContain('Loading'); expect(html).toContain('Incomplete source');
  expect(html).toContain('Retry Attendance'); expect(html).toContain('Retry Time corrections'); expect(html).toContain('Retry Period timecards');
  expect(html).toContain('Counts include only observed actions'); expect(html).not.toContain('No actions need review');
});
it('F1 displays exact authorized next action, reason, source version and observed instant from the actual projection', () => {
  const result = projected(withRequests());
  if (result.state !== 'ready') throw Error('projection fixture');
  const item = result.items[0], html = display(result);
  expect(html).toContain(item.reason.text); expect(html).toContain(item.nextAction.label);
  expect(html).toContain('href="' + item.nextAction.href.replaceAll('&', '&amp;') + '"');
  expect(html).toContain('Source version'); expect(html).toContain('>' + item.sourceVersion + '<');
  expect(html).toContain('dateTime="' + item.observedAt + '"'); expect(html).toContain(item.observedAt);
  expect(html).not.toContain('>Review</a>');
});
it.each(['loading', 'limited', 'capped'] as const)('F1 zero observed actions with %s source cannot become all-clear', state => {
  const input = intelligenceInput();
  if (state === 'loading') input.sources[1] = { source: 'attendance', binding: { ...intelligenceBinding }, state: 'loading' };
  else { const source = input.sources[1]; if (source.state !== 'ready') throw Error('fixture'); source.coverage = state; }
  const result = projected(input); expect(result.state).toBe('partial');
  const html = display(result); expect(html).toContain('Action results are incomplete');
  expect(html).toContain('aria-label="Observed actions">0'); expect(html).not.toContain('No actions need review');
});
it('F1 all-source loading retains only named source status and never names, counts or all-clear', () => {
  const input = intelligenceInput(); input.sources = intelligenceSources.map(source => ({ source, binding: { ...intelligenceBinding }, state: 'loading' }));
  const result = projected(input); expect(result.state).toBe('loading');
  const html = display(result); expect(html).toContain('Loading actions'); expect(html).toContain('Retry Attendance');
  expectNoPrivateActions(html);
});
it('F1 all-source unavailable retains fixed retryable source failures without claiming checked totals', () => {
  const input = intelligenceInput(); input.sources = intelligenceSources.map(source => ({ source, binding: { ...intelligenceBinding }, state: 'unavailable', reason: 'READ_FAILED' }));
  const result = projected(input); expect(result.state).toBe('unavailable');
  const html = display(result); expect(html).toContain('Read unavailable'); expect(html).toContain('Retry Attendance');
  expectNoPrivateActions(html);
});
it('F1 only freshly complete authorized empty sources show the scoped no-action outcome', () => {
  const result = projected(intelligenceInput()); expect(result).toMatchObject({ state: 'ready', allClear: true });
  const html = display(result); expect(html).toContain('No actions need review in this authorized view');
  expect(html).not.toContain('Action results are incomplete'); expect(html).toContain('aria-label="Observed actions">0');
});
it.each(['loading', 'offline', 'reconnecting', 'unavailable', 'access_lost', 'paused'] as const)('F1 %s connection suppresses old projected names, counts and destinations', connection => {
  expectNoPrivateActions(display(projected(withRequests()), { connection }));
});
it.each([{ expectedViewId: 'replacement-view' }, { weekStart: '2026-10-12' }])('F1 replaced view/week %j suppresses a previously scoped result', changes => {
  expectNoPrivateActions(display(projected(withRequests()), changes));
});
it.each([
  ['2026-10-09T12:00:00.123455Z', true], ['2026-10-09T12:00:00.123456Z', false], ['2026-10-09T12:00:00.123457Z', false],
] as const)('F1 exact fractional expiry at %s retains actions only while strictly current (%s)', (now, current) => {
  const input = withRequests(); input.context.now = '2026-10-09T12:00:00.123400Z';
  input.context.authorityExpiresAt = '2026-10-09T12:00:00.123456Z';
  for (const source of input.sources) if (source.state === 'ready') { source.observedAt = input.context.now; source.expiresAt = input.context.authorityExpiresAt; }
  const result = projected(input); expect(result.state).toBe('ready');
  const html = display(result, { now });
  if (current) expect(html).toContain('Fictional Alex'); else expectNoPrivateActions(html);
});
it.each(['not-an-instant', '2026-10-09T12:00:00+99:99'])('F1 malformed current instant %s fails closed', now => {
  expectNoPrivateActions(display(projected(withRequests()), { now }));
});
it.each(['', 'not-an-instant'])('F1 malformed display expiry %s fails closed without inventing validity', validUntil => {
  const result = projected(withRequests()); if (result.state !== 'ready') throw Error('fixture');
  expectNoPrivateActions(display({ ...result, validUntil }));
});
it('F1 missing retry/refresh callbacks cannot present working actions', () => {
  const input = withRequests(); input.sources[1] = { source: 'attendance', binding: { ...intelligenceBinding }, state: 'unavailable', reason: 'READ_FAILED' };
  const html = display(projected(input), { onRetrySource: undefined, onRefresh: undefined });
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Retry Attendance<\/button>/);
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Refresh actions<\/button>/);
});
it('F1 expansion retains all projected actions without replacing the existing legacy expansion', () => {
  const result = projected(withRequests(25));
  const html = display(result), expanded = display(result, { expanded: true });
  expect(html.match(/data-action-id=/g)).toHaveLength(20); expect(html).toContain('Show all 25 observed actions');
  expect(expanded.match(/data-action-id=/g)).toHaveLength(25);
  expect(expanded).toContain('request-24');
});
it('F1 renderer never restores names or destinations removed by the accepted whole-scope projection', () => {
  const input = withRequests(); const source = input.sources[0]; if (source.state !== 'ready') throw Error('fixture');
  source.rows[0].meta.locationIds = ['location-b'];
  const result = projected(input); if (result.state !== 'ready') throw Error('fixture'); expect(result.items).toHaveLength(0);
  const html = display(result); expect(html).not.toContain('Fictional Alex'); expect(html).not.toContain('request-00');
  expect(html).toContain('No actions need review in this authorized view');
});

it('category filtering finds a request beyond the first twenty mixed actions',()=>{
 const snapshot:Extract<ActionCenter,{state:'ready'}>={...ready,counts:{total:26,scheduling:25,requests:1,timekeeping:0},items:[...ready.items,{id:'TIME_OFF:request-26',type:'TIME_OFF',category:'requests',priority:'REVIEW',title:'Time off for Avery',detail:'Two days requested',href:'/app/requests?tab=team&requestId=request-26'}]};
 const html=renderToStaticMarkup(<ActionCenterSurface snapshot={snapshot} connection="ready" category="requests"/>);
 expect(html.match(/data-action-id=/g)).toHaveLength(1);
 expect(html).toContain('Time off for Avery');
 expect(html).not.toContain('Fictional employee 0');
 expect(html).toContain('aria-pressed="true"');
 expect(html).toContain('Review time off');
  expect(html).toContain('Showing 1 of 1 request');
 expect(html).toContain('href="/app/requests?tab=team&amp;requestId=request-26#request-request-26"');
});
it('a verified empty category keeps an All actions reset without claiming all sources are empty',()=>{
 const html=renderToStaticMarkup(<ActionCenterSurface snapshot={ready} connection="ready" category="requests"/>);
 expect(html).toContain('No requests to review in the checked sources.');
 expect(html).toContain('All actions');
 expect(html).not.toContain('No actions found in the checked sources.');
 expect(html.match(/data-action-id=/g)).toBeNull();
});
it('unavailable data removes category controls even with a previous selection',()=>{
 const html=renderToStaticMarkup(<ActionCenterSurface snapshot={ready} connection="offline" category="scheduling"/>);
 expect(html).not.toContain('aria-pressed');
 expect(html).not.toContain('Fictional employee');
});
it('issue actions carry their own labels and exact record destinations',()=>{
 const samples=[
  {type:'AVAILABILITY_MISSING',href:'/app/availability?week=2026-10-05&employeeId=E-9',label:'View availability',destination:'/app/availability?week=2026-10-05&amp;employeeId=E-9#employee-E-9'},
  {type:'EXCHANGE',href:'/app/exchange?tab=requests&requestId=R-2',label:'Review shift request',destination:'/app/exchange?tab=requests&amp;requestId=R-2#request-R-2'},
  {type:'TARGET_MISSING',href:'/app/schedule/settings?employeeId=E-9',label:'Set hour target',destination:'/app/schedule/settings?employeeId=E-9#target-E-9'},
  {type:'HOURS_REVIEW',href:'/app/schedule?week=2026-10-05&employeeId=E-9',label:'Review weekly hours',destination:'/app/schedule?week=2026-10-05&amp;employeeId=E-9#schedule-employee-E-9'},
  {type:'DEADLINE_MISSING',href:'/app/schedule?week=2026-10-05',label:'Set deadline',destination:'/app/schedule?week=2026-10-05#schedule-deadline'},
 ] as const;
 for(const sample of samples){
  const snapshot:Extract<ActionCenter,{state:'ready'}>={...ready,counts:{total:1,scheduling:1,requests:0,timekeeping:0},items:[{...ready.items[0],type:sample.type,href:sample.href}]};
  const html=renderToStaticMarkup(<ActionCenterSurface snapshot={snapshot} connection="ready"/>);
  expect(html).toContain(sample.label);expect(html).toContain(`href="${sample.destination}"`);
 }
});
