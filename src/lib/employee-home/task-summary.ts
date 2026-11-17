import type {AttentionItem} from './types';

export type HomeTaskCounts={total:number;required:number;actionable:number;requiredHeld:number;informational:number};
export type HomeTaskSummary={
  state:'complete'|'partial';
  /** Total current authorized work is unknown until every source is complete. */
  counts:HomeTaskCounts|null;
  observedCounts:HomeTaskCounts;
  preview:{limit:3;requiredOutsidePreview:number};
  ranking:'actionable_deadline_then_required_then_actionable_then_latest_information_v1';
};

/** Consume the canonical full sorted/deduplicated aggregate, never a UI slice.
 * Categories overlap: a required item can also be actionable. */
export function summarizeHomeTasks(items:readonly AttentionItem[],complete:boolean):HomeTaskSummary {
  const observedCounts={total:items.length,required:items.filter(i=>i.required).length,actionable:items.filter(i=>i.actionable).length,
    requiredHeld:items.filter(i=>i.required&&!i.actionable).length,informational:items.filter(i=>!i.required&&!i.actionable).length};
  const work=items.filter(i=>i.required||i.actionable);
  return {state:complete?'complete':'partial',counts:complete?{...observedCounts}:null,observedCounts,
    preview:{limit:3,requiredOutsidePreview:work.slice(3).filter(i=>i.required).length},
    ranking:'actionable_deadline_then_required_then_actionable_then_latest_information_v1'};
}
