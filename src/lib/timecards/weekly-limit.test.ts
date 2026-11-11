import {it,expect} from 'vitest';
import {parseTimecardsResponse} from './read-model';
const period={startDate:'2026-11-09',endDate:'2026-11-15'};
it('reports unknown company weekly limit without inventing a threshold or changing card source',()=>{
 expect(parseTimecardsResponse({observedAt:'2026-11-10T12:00:00Z',cards:[]},period)).toMatchObject({weeklyHoursLimit:null});
});
