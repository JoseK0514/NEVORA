import {expect, it} from '@rstest/core';
import {readEmployeePublishedAssignments} from '../../lib/data/employee-published-assignments.server';
import {readEmployeeSchedule} from '../../lib/data/employee-schedule';
import {readEmployeeWeeklyReview} from '../../lib/data/employee-weekly-review.server';
import {createLocation, findActiveLocationByClockerKey, listLocations, updateLocation} from '../../lib/data/locations';
import {publishScheduleChanges} from '../../lib/data/publication-revisions';
import {deleteShift, getShiftForManagement} from '../../lib/data/schedules';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';

it('keeps optional addresses on the catalog and shares them only on authorized own shifts across two stores', async () => {
  const {db, q, owner, manager} = await companyAccessFixture();
  try {
    const executor = db.executor;
    const actor = {actorEmployeeId: owner.employee.id, proof: owner};
    const [legacy] = await listLocations({}, executor);
    expect(legacy.address).toBeNull();
    const main = await updateLocation({
      ...actor, id: legacy.id, name: legacy.name, shortName: legacy.shortName, active: true,
      expectedUpdatedAt: legacy.updatedAt, address: ' 1 Main St\r\nSan Juan, PR ',
    }, executor);
    expect(main.address).toBe('1 Main St\nSan Juan, PR');
    const west = await createLocation({
      ...actor, name: 'West Store', shortName: 'West', address: '90 West St',
    }, executor);
    await expect(createLocation({
      actorEmployeeId: manager.employee.id, proof: manager, name: 'Denied', shortName: 'Denied', address: 'Hidden',
    }, executor)).rejects.toThrow('Owner');

    const worker: SessionMutationProof = {
      employee: {id: 'target', firstName: 'Target', lastName: 'QA', role: 'EMPLOYEE', primaryLocationId: main.id},
      sessionTokenHash: 'd'.repeat(64),
    };
    const week = '2090-01-02';
    await q(`INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'target',clock_timestamp()+interval '1 hour')`, [worker.sessionTokenHash]);
    await q(`INSERT INTO schedules(id,location_id,week_start,status,created_by)
      VALUES ('main-address',$1,$3,'PUBLISHED','owner'),('west-address',$2,$3,'PUBLISHED','owner')`, [main.id, west.id, week]);
    await q(`INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time)
      VALUES ('main-own','main-address','target',$1,'08:00','09:00'),('west-own','west-address','target',$1,'10:00','11:00'),
        ('west-peer','west-address','manager',$1,'12:00','13:00')`, [week]);
    await q(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by)
      VALUES ('address-revision',$1,1,'PUBLISH','owner')`, [week]);
    await q(`INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time)
      SELECT sh.id,'address-revision',sh.id,sh.schedule_id,s.location_id,sh.employee_id,sh.date,sh.start_time,sh.end_time
      FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start=$1`, [week]);

    const read = () => readEmployeeWeeklyReview(worker, week, executor);
    const addresses = (result: Awaited<ReturnType<typeof read>>) => result.shifts.map(({id, locationAddress}) => ({id, locationAddress}));
    expect(addresses(await read())).toEqual([{id: 'main-own', locationAddress: main.address}]);
    expect((await readEmployeePublishedAssignments(worker, executor)).nextShift).toMatchObject({shiftId: 'main-own', locationAddress: main.address});
    await q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target',$1)", [west.id]);
    const edited = await updateLocation({
      ...actor, id: west.id, name: west.name, shortName: west.shortName, active: true, expectedUpdatedAt: west.updatedAt, address: '91 West St',
    }, executor);
    const expected = [{id: 'main-own', locationAddress: main.address}, {id: 'west-own', locationAddress: '91 West St'}];
    expect(addresses(await read())).toEqual(expected);
    expect((await readEmployeeSchedule(worker, week, executor)).shifts.map(({id, locationAddress}) => ({id, locationAddress}))).toEqual(expected);
    await expect(updateLocation({
      ...actor, id: west.id, name: west.name, shortName: west.shortName, active: true, expectedUpdatedAt: west.updatedAt, address: 'Stale value',
    }, executor)).rejects.toThrow('changed while you were editing');

    const retire = () => updateLocation({
      ...actor, id: west.id, name: west.name, shortName: west.shortName, active: false, expectedUpdatedAt: edited.updatedAt,
    }, executor);
    await expect(retire()).rejects.toMatchObject({blockers: ['SCHEDULE']});
    for (const shiftId of ['west-own', 'west-peer']) {
      const shift = await getShiftForManagement(shiftId, executor);
      expect(await deleteShift(shiftId, owner, executor, shift?.reviewVersion)).toBe(true);
    }
    expect(await publishScheduleChanges({weekStart: week, managerId: owner.employee.id, proof: owner}, executor))
      .toMatchObject({published: true});
    const archived = await retire();
    expect(archived.address).toBe('91 West St');
    expect((await listLocations({includeInactive: true}, executor)).find(location => location.id === west.id)).toMatchObject({active: false, address: '91 West St'});
    expect((await listLocations({}, executor)).some(location => location.id === west.id)).toBe(false);
    expect(await findActiveLocationByClockerKey(west.clockerKey, executor)).toBeNull();
    expect(addresses(await read())).toEqual([{id: 'main-own', locationAddress: main.address}]);
    await updateLocation({
      ...actor, id: main.id, name: main.name, shortName: main.shortName, active: true, expectedUpdatedAt: main.updatedAt, address: ' ',
    }, executor);
    expect(addresses(await read())).toEqual([{id: 'main-own', locationAddress: null}]);
  } finally {
    await db.dispose();
  }
});
