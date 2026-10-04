import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import type { GenerationActionState } from '../app/app/schedule/generation-actions';
import type { ScheduleGenerationReview } from '../lib/data/schedule-generation-review';
const harness=vi.hoisted(()=>({slots:[] as unknown[],cursor:0,dispatches:[] as ((form:FormData)=>Promise<void>)[]}));
vi.mock('react',async importOriginal=>{
  const actual=await importOriginal<typeof import('react')>();
  return {...actual,useState:(initial:unknown)=>{const slot=harness.cursor++;if(!(slot in harness.slots))harness.slots[slot]=initial;return [harness.slots[slot],(value:unknown)=>{harness.slots[slot]=typeof value==='function'?value(harness.slots[slot]):value;}];},useActionState:(action:(state:unknown,form:FormData)=>Promise<unknown>,initial:unknown)=>{const slot=harness.cursor++;if(!(slot in harness.slots))harness.slots[slot]=initial;const dispatch=async(form:FormData)=>{harness.slots[slot]=await action(harness.slots[slot],form);};harness.dispatches.push(dispatch);return [harness.slots[slot],dispatch,false];}};
});
vi.mock('@/app/app/schedule/generation-actions',()=>({generateWeekAction:vi.fn(),clearGenerationExclusionAction:vi.fn()}));
import { generateWeekAction,clearGenerationExclusionAction } from '@/app/app/schedule/generation-actions';
import { ScheduleGenerationControls } from './schedule-generation-controls';
const review:ScheduleGenerationReview={editable:true,attempted:1,needsSetup:0,coverage:null,exclusions:[{id:'event',locationId:'north',locationName:'North',date:'2026-10-05',startTime:'08:00',endTime:'16:00',needsLead:true}]};
const previous:GenerationActionState={status:'success',message:'No legal additions were found. Review the remaining gaps.',result:{status:'PARTIAL',changed:false,summary:{added:0,removed:0,preserved:1,attempted:1,needsSetup:0,coverage:{requiredMinutes:480,coveredMinutes:0,percentage:0,unavailable:false}},gaps:[],notices:['North · Manager excluded · Automatic fill off.']}};
function render(currentReview=review){harness.cursor=0;harness.dispatches=[];return renderToStaticMarkup(createElement(ScheduleGenerationControls,{weekStart:'2026-10-05',selectedLocation:'north',review:currentReview}));}
beforeEach(()=>{harness.slots=[];harness.cursor=0;harness.dispatches=[];vi.clearAllMocks();});
it('invalidates prior generation explanations after successful clear, survives fresh review, and shows the next generation result',async()=>{
  vi.mocked(generateWeekAction).mockResolvedValue(previous);render();await harness.dispatches[0](new FormData());
  expect(render()).toContain('North · Manager excluded · Automatic fill off.');
  vi.mocked(clearGenerationExclusionAction).mockResolvedValue({status:'success',message:'Automatic fill allowed for this need. Run Build Week or Fill Gaps Only when ready.'});
  await harness.dispatches[1](new FormData());
  const cleared=render({...review,exclusions:[]});
  expect(cleared).not.toContain('North · Manager excluded · Automatic fill off.');
  expect(cleared).not.toContain('No legal additions were found');
  expect(cleared).toContain('Automatic fill allowed for this need');
  expect(generateWeekAction).toHaveBeenCalledTimes(1);
  const fresh:GenerationActionState={status:'success',message:'Draft complete for configured coverage. Review before publishing.'};
  vi.mocked(generateWeekAction).mockResolvedValue(fresh);await harness.dispatches[0](new FormData());
  expect(render({...review,exclusions:[]})).toContain(fresh.message);
  expect(render({...review,exclusions:[]})).not.toContain('Run Build Week or Fill Gaps Only when ready.');
});
it('retains prior generation evidence and excluded state when clearing fails',async()=>{
  vi.mocked(generateWeekAction).mockResolvedValue(previous);render();await harness.dispatches[0](new FormData());render();
  vi.mocked(clearGenerationExclusionAction).mockResolvedValue({status:'error',message:'Your scheduling permission changed. Reload and try again.'});await harness.dispatches[1](new FormData());
  const html=render();expect(html).toContain('North · Manager excluded · Automatic fill off.');expect(html).toContain('Automatic fill off (1)');expect(html).toContain('Your scheduling permission changed');expect(html).not.toContain('Automatic fill allowed');
});
