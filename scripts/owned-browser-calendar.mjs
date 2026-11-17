import {Temporal} from '@js-temporal/polyfill';

const localDay=instant=>Temporal.Instant.from(instant).toZonedDateTimeISO('America/Puerto_Rico').toPlainDate();
export function ownedBusinessWeek(instant){
 const day=localDay(instant);
 return day.subtract({days:day.dayOfWeek-1}).toString();
}

// A real completed entry can belong to last week during Monday's first hours.
// Follow its actual timecard instead of inventing a future punch or extending a deadline.
export function ownedCorrectionEntryView(startAt,observedAt){
 const week=ownedBusinessWeek(startAt);
 return week===ownedBusinessWeek(observedAt)
  ?{view:'records',href:'/app/my-time'}
  :{view:'cards',href:`/app/my-time?view=cards&start=${week}&end=${Temporal.PlainDate.from(week).add({days:6})}`};
}
