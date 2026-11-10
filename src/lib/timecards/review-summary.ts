import type {TimecardItem,TimecardProjection} from './read-model';

export type TimecardReviewClassification='awaiting_approval'|'awaiting_finalization'|'finalized'|'untouched';

/** Display review work from an already validated projection, never command eligibility.
 * Entry presence matters: a newly opened entry can validly have zero elapsed time.
 * History retains reviewed zero-time cards until finalization. */
export function classifyTimecardReview(item:TimecardItem):TimecardReviewClassification{
 if(item.state==='FINALIZED')return 'finalized';
 if(!item.card.entries.length&&!item.history.length)return 'untouched';
 return item.state==='APPROVED'?'awaiting_finalization':'awaiting_approval';
}

/** Counts apply only to this authorized population and period. Callers must keep
 * unavailable/stale reads out of this ready-projection summary. */
export function summarizeTimecardReview(projection:Pick<TimecardProjection,'period'|'cards'>){
 const counts={total:projection.cards.length,review:0,awaitingApproval:0,awaitingFinalization:0,finalized:0,untouched:0};
 for(const item of projection.cards){
  switch(classifyTimecardReview(item)){
   case 'awaiting_approval':counts.awaitingApproval++;counts.review++;break;
   case 'awaiting_finalization':counts.awaitingFinalization++;counts.review++;break;
   case 'finalized':counts.finalized++;break;
   case 'untouched':counts.untouched++;break;
  }
 }
 return {period:{...projection.period},counts};
}
