import {resolveAvailabilityDay,type AvailabilityHours,type AvailabilityException,type WeeklyAvailability} from './availability';
import {resolveRestrictionDay,type RestrictionRule} from './restrictions';
/** Shared rule boundary. Employee normal/weekly/dated inputs never reopen an agreed restriction. */
export function resolveSchedulingDay(input:{date:string;normal:readonly AvailabilityHours[];weeks?:readonly WeeklyAvailability[];exceptions?:readonly AvailabilityException[];managementRestrictions?:readonly RestrictionRule[]}){
 const preference=resolveAvailabilityDay(input);
 const restriction=resolveRestrictionDay(input.date,input.managementRestrictions??[]);
 return {...preference,windows:restriction?.windows??preference.windows,preferredWindows:preference.windows,managementConfirmed:restriction!==null,restrictionVersion:restriction?.versionId??null};
}
