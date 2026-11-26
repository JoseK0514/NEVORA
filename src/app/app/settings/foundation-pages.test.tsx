import {it,expect,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {EmployeeSchedulingFields} from '../../../components/employee-scheduling-fields';
import type {Position} from '../../../lib/domain';
rs.mock('@/lib/auth/permissions',()=>({requireRoles:async()=>({id:'owner',role:'OWNER'})}));





rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'w',name:'Northside',timeZone:'America/New_York',active:true}),isWorkspaceTimezoneLocked:async()=>true,WorkspaceTimezoneLockedError:class extends Error{constructor(){super('Changing the business timezone requires a separately reviewed conversion because operational records already exist.');}}}));
rs.mock('@/lib/data/employees',()=>({listLocations:async()=>[{id:'east',workspaceId:'w',name:'East Office',shortName:'East',clockerKey:'east-office',active:true},{id:'old',workspaceId:'w',name:'Old Office',shortName:'Old',clockerKey:'old-office',active:false}],listEmployees:async()=>[]}));
rs.mock('@/lib/data/positions',()=>({listPositions:async()=>[]}));
rs.mock('@/lib/data/schedule-health',()=>({listLocationStaffingSettings:async()=>[],listCoverageWindows:async()=>[]}));
rs.mock('./actions',()=>({saveWorkspaceProfileAction:rs.fn(),createLocationAction:rs.fn(),updateLocationAction:rs.fn(),createPositionAction:rs.fn(),updatePositionAction:rs.fn()}));
import WorkspacePage from './workspace/page';
import LocationsPage from './locations/page';
import PositionsPage from './positions/page';
// Quiet (v4, approved Oct 23): a location is one row (short name, people, status); its setup lives on its own page.
it('lists a new location as needing setup and keeps inactive locations',async()=>{const html=renderToStaticMarkup(await LocationsPage());expect(html).toContain('Needs setup');expect(html).toContain('<a class="c-row" href="/app/settings/locations/east">');expect(html).toContain('Old');expect(html).toContain('Inactive');expect(html).toContain('href="/app/settings/locations/new"');expect(html).toContain('1 active of 2 locations');});
it('locked workspace uses a plain explanation, a read-only time zone and an editable name',async()=>{const html=renderToStaticMarkup(await WorkspacePage());expect(html).not.toContain('name="timeZone"');expect(html).toContain('<span class="c-row__value">New York</span>');expect(html).toContain('Time zone is locked because you have shifts and timecards. Contact support to change it.');expect(html).toMatch(/<input[^>]*name="name" value="Northside"\/>/);expect(html).toContain('form="company-profile-form"');expect(html).toContain('>Save</button>');});
it('empty catalog explicitly allows positionless shifts',async()=>{expect(renderToStaticMarkup(await PositionsPage())).toContain('Shifts can still be added without a position.');});
it('all inactive unheld qualifications shows accurate optional empty state',()=>{const html=renderToStaticMarkup(createElement(EmployeeSchedulingFields,{locations:[],positions:[{id:'old',name:'Retired',active:false} as Position]}));expect(html).toContain('No active positions available. Positions are optional');expect(html).not.toContain('Retired');});

it('announces position counts independently in Spanish', async () => {
  const {SETTINGS_COPY} = await import('./settings-copy');
  const {positionsStatus, activeOf} = SETTINGS_COPY.es;
  expect(positionsStatus(1, 1)).toBe('1 puesto activo y 1 archivado');
  expect(positionsStatus(1, 0)).toBe('1 puesto activo y 0 archivados');
  expect(positionsStatus(2, 1)).toBe('2 puestos activos y 1 archivado');
  expect(positionsStatus(0, 2)).toBe('0 puestos activos y 2 archivados');
  expect(activeOf(1, 1, 'restaurante')).toBe('restaurante · en uso: 1 de 1');
  expect(activeOf(1, 2, 'localidades')).toBe('localidades · en uso: 1 de 2');
});
