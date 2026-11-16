import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ownedBusinessWeek,ownedCorrectionEntryView} from './owned-browser-calendar.mjs';

test('Monday midnight belongs to the new Puerto Rico week, even when a just-finished shift started Sunday',()=>{
 const observedAt='2026-11-16T04:20:00Z',startAt='2026-11-16T00:20:00Z';
 assert.equal(ownedBusinessWeek(observedAt),'2026-11-16');
 assert.deepEqual(ownedCorrectionEntryView(startAt,observedAt),{view:'cards',href:'/app/my-time?view=cards&start=2026-11-09&end=2026-11-15'});
});
test('a Sunday local entry stays in the records journey before local midnight',()=>{
 assert.deepEqual(ownedCorrectionEntryView('2026-11-15T23:59:00Z','2026-11-16T03:59:00Z'),{view:'records',href:'/app/my-time'});
 assert.equal(ownedBusinessWeek('2026-11-16T03:59:59Z'),'2026-11-09');
 assert.equal(ownedBusinessWeek('2026-11-16T04:00:00Z'),'2026-11-16');
});
test('a completed Monday entry uses this week and week calculation survives year rollover',()=>{
 assert.deepEqual(ownedCorrectionEntryView('2026-11-16T04:01:00Z','2026-11-16T08:01:00Z'),{view:'records',href:'/app/my-time'});
 assert.equal(ownedBusinessWeek('2027-01-01T04:01:00Z'),'2026-12-28');
});
