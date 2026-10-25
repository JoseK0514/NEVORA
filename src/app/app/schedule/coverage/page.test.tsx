import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { managementProof, schedulingSourceFixture } from '../../../../test/fixtures/management';
import { assignmentFacts } from '../../../../lib/data/assignment-facts.test-support';
import { deriveCoverageRepair, createCoverageRepairReview, assertCoverageRepairReview } from '../../../../lib/data/coverage-repair.server';
import type { GenerationSource } from '../../../../lib/data/generation-guards';
import { buildManagerActionItems } from '../../../../lib/assistance/manager-actions';
import type { CoverageRepairLocator } from '../../../../lib/scheduling/coverage-repair';
const m = vi.hoisted(() => ({ source: undefined as GenerationSource | undefined, role: 'MANAGER', calls: [] as Record<string, unknown>[],denied:false,companyLoads:vi.fn() }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: ComponentProps<'a'>) => createElement('a', props, children), useLinkStatus:()=>({pending:false}) }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw { destination }; } }));
vi.mock('@/lib/auth/permissions', () => ({ MANAGER_ROLES: ['MANAGER','OWNER'], requireRoles: async () => { if (m.role !== 'MANAGER') throw { destination: '/app' }; return { id: 'M' }; } }));
vi.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => managementProof('M') }));
// Page/coverage composition only. Current authorization is a mocked server
// boundary; production Frame lifetime is exercised by the mounted browser suite.
vi.mock('@/lib/company-access/operational-scope.server',()=>({
 readOperationalAuthority:async()=>({state:'ready',authority:'fixture',observedAt:'2030-10-07T12:00:00Z',validForMs:15000,scope:{mode:'COMPANY'},locations:[]}),
 withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>{if(m.denied)return {state:'unavailable',reason:'access_denied'};m.companyLoads();return {state:'ready',data:await load(),authority:'fixture',observedAt:'2030-10-07T12:00:00Z',validForMs:15000};},
}));
vi.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:()=>{throw Error('Unexpected restricted editor in Company coverage fixture');}}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
vi.mock('@/lib/data/coverage-repair.server', async original => {
  const actual = await original<typeof import('../../../../lib/data/coverage-repair.server')>();
  return { ...actual, readCoverageRepair: async (locator: CoverageRepairLocator, proof: ReturnType<typeof managementProof>, refresh: boolean) => {
    const result = actual.deriveCoverageRepair(m.source!, locator, refresh);
    return { ...result, candidates: result.candidates.map(c => ({ ...c, review: actual.createCoverageRepairReview(m.source!, result.locator, c.employeeId, proof) })) };
  }, readCoverageRepairSelection: async (token: string, proof: ReturnType<typeof managementProof>) => {
    const review = actual.assertCoverageRepairReview(m.source, token, proof); const c = review.result.candidates.find(c => c.employeeId === review.employeeId)!;
    return { locator: review.locator, employeeId: review.employeeId, employeeName: c.employeeName, locationName: review.result.location.shortName, positionName: review.result.position?.name, isDesignatedLead: review.result.designatedLead };
  } };
});
vi.mock('@/app/app/schedule/actions', () => ({ createShiftAction: vi.fn() }));
vi.mock('@/lib/data/workspaces', () => ({ getWorkspace: async () => ({ timeZone: 'America/Puerto_Rico' }) }));
vi.mock('@/lib/data/employees', () => ({ listEmployees: async () => m.source!.employees.map(e => ({ id: e.id, firstName: e.first_name, lastName: e.last_name, role: e.role, active: e.active, positionIds: m.source!.employee_positions.filter(p => p.employee_id === e.id).map(p => p.position_id) })), listLocations: async () => [{ id: 'loc-1', shortName: 'Fictional South' }] }));
vi.mock('@/lib/data/positions', () => ({ listPositions: async () => assignmentFacts().positions }));
vi.mock('@/lib/data/hour-fairness', () => ({ listHourFairness: async () => [] }));
vi.mock('@/lib/data/schedules', () => ({ getShiftValidationContext: async (input: Record<string, unknown>) => {
  m.calls.push(input); const e = m.source!.employees.find(e => e.id === input.employeeId)!;
  return { workspace: { id: 'test-workspace', active: true, timeZone: 'America/Puerto_Rico' }, location: { id: 'loc-1', workspaceId: 'test-workspace', active: true }, position: assignmentFacts().positions.find(p => p.id === input.positionId),
    employee: { active: true, role: e.role, eligibleLocationIds: ['loc-1'], positionIds: m.source!.employee_positions.filter(p => p.employee_id === e.id).map(p => p.position_id), maximumWeeklyHours: 40 }, existingShifts: [], availability: [{ dayOfWeek: 1, startTime: '00:00', endTime: '24:00' }], weeklyAvailability: [], approvedTimeOff: [] };
} }));
import CoveragePage from './page';
import NewShiftPage from '../new/page';

const week = '2030-10-07';
const gap = { key: `loc-1|${week}|08:00|12:00`, locationId: 'loc-1', locationName: 'Fictional South', date: week, startTime: '08:00', endTime: '12:00', gap: 2, requiresLead: true, positionCoverage: [{ positionId: 'barista', positionName: 'barista', missing: 1 }] };
function action(extra = {}) { return buildManagerActionItems({ weekStart: week, coverageGaps: [{ ...gap, ...extra }], availabilityDeadlineSet: true, coverageRulesConfigured: true })[0]; }
function params(href: string) { return Object.fromEntries(new URL(href, 'http://localhost').searchParams); }
beforeEach(() => {
  m.role = 'MANAGER'; m.calls.length = 0;m.denied=false;m.companyLoads.mockReset();
  m.source = schedulingSourceFixture({ assignmentFacts: assignmentFacts(), schedules: [], shifts: [], revisions: [], acknowledgements: [], recipients: [{ employeeId: 'E', role: 'LEAD', active: true, allowedLocationIds: ['loc-1'] }, { employeeId: 'U', role: 'EMPLOYEE', active: true, allowedLocationIds: ['loc-1'] }] });
  m.source.locations[0].short_name = 'Fictional South';
  m.source.employees.forEach(e => Object.assign(e, { first_name: 'Fictional', last_name: e.id === 'E' ? 'Qualified' : 'Unqualified' }));
  m.source.employee_positions = [{ employee_id: 'E', position_id: 'barista' }];
  m.source.location_staffing_settings = [{ location_id: 'loc-1', minimum_staff_per_shift: 2, requires_designated_lead: true }];
  m.source.location_coverage_windows = [{ id: 'coverage', location_id: 'loc-1', day_of_week: 1, start_time: '08:00', end_time: '12:00' }];
  m.source.coverage_window_position_requirements = [{ coverage_window_id: 'coverage', position_id: 'barista', quantity: 1 }];
});

it('actual manager position/Lead action opens the matching location/interval and excludes unqualified employees', async () => {
  const html = renderToStaticMarkup(await CoveragePage({ searchParams: Promise.resolve(params(action().href)) }));
  expect(html).toContain('Fictional South'); expect(html).toContain('barista'); expect(html).toContain('<b>Shift lead</b></span><span class="q-rv q-rv--l">Needed');
  expect(html).toContain('Fictional Qualified'); expect(html).not.toContain('Fictional Unqualified'); expect(html).toContain('1\u00a0person'); expect(html).toContain('No target set');
  expect(html).toContain('loc-1'); expect(html).toContain('location=loc-1'); expect(html).toContain('Earlier weeks under target are shown for context only');
  // T-5: each person is a radio row whose value is their review link; Assign opens the chosen one.
  const link = html.match(/value="([^"]*\/app\/schedule\/new\?review=[^"]+)"/)![1]; const p = params(link.replaceAll('&amp;', '&'));
  const selected = assertCoverageRepairReview(m.source, p.review, managementProof('M'));
  expect(selected.locator).toMatchObject({ locationId: 'loc-1', startTime: '08:00', endTime: '12:00', positionId: 'barista' });
  const form = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve(p) }));
  expect(form).toContain('name="positionId" value="barista"'); expect(form).toContain('name="isDesignatedLead" value="on"');
  expect(form).toContain('name="startTime" value="08:00"'); expect(form).toContain('name="endTime" value="12:00"');
  expect(form).toContain('Save replacement'); expect(form).not.toContain('<select');
  expect((form.match(/type="submit"/g) ?? []).length).toBe(1);
});

it('several missing positions expose all targets and require an explicit choice before candidates', async () => {
  m.source!.coverage_window_position_requirements.push({ coverage_window_id: 'coverage', position_id: 'cashier', quantity: 1 });
  const html = renderToStaticMarkup(await CoveragePage({ searchParams: Promise.resolve(params(action({ positionCoverage: [...gap.positionCoverage, { positionId: 'cashier', positionName: 'cashier', missing: 1 }] }).href)) }));
  expect(html).toContain('barista: 1 more needed'); expect(html).toContain('cashier: 1 more needed'); expect(html).not.toContain('Review replacement');
});

it('stale first review, stale second visit and stale selected form never refresh themselves', async () => {
  const locator = deriveCoverageRepair(m.source!, JSON.parse(params(action().href).repair)).locator;
  const review = createCoverageRepairReview(m.source!, locator, 'E', managementProof('M'));
  m.source!.location_staffing_settings[0].minimum_staff_per_shift = 3;
  for (let i = 0; i < 2; i++) {
    const html = renderToStaticMarkup(await CoveragePage({ searchParams: Promise.resolve(params(action().href)) }));
    expect(html).toContain('Coverage changed'); expect(html).toContain('Refresh</a>'); expect(html).not.toContain('Review replacement');
  }
  const form = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ review }) }));
  expect(form).toContain('This shift changed'); expect(form).not.toContain('Save replacement');
});

it('known successful position/Lead return truthfully shows the remaining staffing chooser without a refresh loop', async () => {
  m.source!.schedules = [{ id: 'schedule', location_id: 'loc-1', week_start: week, status: 'DRAFT' }];
  m.source!.shifts = [{ id: 'saved', schedule_id: 'schedule', employee_id: 'E', date: week, start_time: '08:00', end_time: '12:00', position_id: 'barista', is_designated_lead: true }];
  const html = renderToStaticMarkup(await CoveragePage({ searchParams: Promise.resolve({ ...params(action().href), refresh: '1', saved: '1' }) }));
  expect(html).toContain('Replacement saved'); expect(html).toContain('1 more person needed'); expect(html).toContain('Choose what to fill');
  expect(html).not.toContain('No shift was saved'); expect(html).not.toContain('Coverage changed'); expect(html).not.toContain('Review replacement');
});

it('a generic position-specific suggestion also carries the position through canonical validation and ordinary NewShift prefill', async () => {
  const p = { week, date: week, locationId: 'loc-1', start: '08:00', end: '12:00', positionId: 'barista' };
  const html = renderToStaticMarkup(await CoveragePage({ searchParams: Promise.resolve(p) }));
  expect(m.calls.every(c => c.positionId === 'barista')).toBe(true); expect(html).not.toContain('Fictional Unqualified');
  expect(html).toContain('positionId=barista');
  const form = renderToStaticMarkup(await NewShiftPage({ searchParams: Promise.resolve({ ...p, employeeId: 'E' }) }));
  expect(form).toContain('<option value="barista" selected="">');
});

it('Employee is redirected before repair suggestions are read', async () => {
  m.role = 'EMPLOYEE'; await expect(CoveragePage({ searchParams: Promise.resolve(params(action().href)) })).rejects.toMatchObject({ destination: '/app' });
});

it('a Company denial withholds both repair and generic suggestions before loading their source',async()=>{
 m.denied=true;
 for(const query of [params(action().href),{week,date:week,locationId:'loc-1',start:'08:00',end:'12:00',positionId:'barista'}]){
  const html=renderToStaticMarkup(await CoveragePage({searchParams:Promise.resolve(query)}));
  expect(html).toContain('current company-wide management access');expect(html).not.toContain('Fictional Qualified');expect(html).not.toContain('Review replacement');
 }
 expect(m.companyLoads).not.toHaveBeenCalled();expect(m.calls).toHaveLength(0);
});
