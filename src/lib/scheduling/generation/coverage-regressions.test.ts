import { expect, it } from 'vitest';
import { automaticWeek } from '@/test/fixtures/automatic-week';
import { addDays } from '@/lib/date-utils';
import { deriveGenerationDemand } from './demand';
import { weeklyCoverageRegressions } from './coverage-regressions';

function dense() {
  const base=deriveGenerationDemand(automaticWeek(1)), template=base.blocks[0];
  const clock=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
  const blocks=Array.from({length:700},(_,index)=>({...template,date:addDays('2026-10-05',Math.floor(index/100)),
    startTime:clock(index%100*5),endTime:clock(index%100*5+5),requiredStaff:1,assignedStaff:1,requiresLead:true,leadCovered:true}));
  return {...base,blocks};
}
it('sweeps 700 admitted intervals without delaying unrelated timers beyond 50ms', async () => {
  const before=dense(),after={...before,blocks:[...before.blocks].reverse()};
  const started=performance.now(),timer=new Promise<number>(resolve=>setTimeout(()=>resolve(performance.now()-started),0));
  expect(weeklyCoverageRegressions(before,after)).toEqual([]);
  expect(await timer).toBeLessThan(50);
});
it('honors an already-aborted review before scanning dense intervals', () => {
  const before=dense(),controller=new AbortController();controller.abort();
  expect(()=>weeklyCoverageRegressions(before,before,controller.signal)).toThrow();
});
it('detects an uncovered piece of a previously fulfilled interval across split and absent after blocks', () => {
  const base=dense(),old={...base.blocks[0],startTime:'08:00',endTime:'10:00'};
  const before={...base,blocks:[old]},after={...base,blocks:[{...old,endTime:'09:00'},{...old,startTime:'09:00',leadCovered:false}]};
  expect(weeklyCoverageRegressions(before,after)).toEqual(['LEAD']);
  expect(weeklyCoverageRegressions(before,{...after,blocks:[]})).toEqual(['LEAD','STAFFING']);
});
