export type PublishedAssignment = {
  shiftId:string;assignmentEpisodeId:string;termsRevision:number;
  weekStart:string;date:string;startAt:string;endAt:string;
  locationId:string;locationLabel:string;positionLabel:string|null;
  designatedLead:boolean;publicationRevisionId:string;
};

export type PublishedAssignmentRead =
  | {observedAt:string;timeZone:string;nextShift:PublishedAssignment|null;currentShift:PublishedAssignment|null;publicationState:'complete'|'partial';unpublishedLocations?:string[]}
  | {observedAt:null;timeZone:null;nextShift:null;currentShift:null;publicationState:'unavailable'};

import type {AttentionRef} from '../employee-attention/types';
export type SourceState='complete'|'partial'|'unavailable'|'not_applicable';
export type SourceObservation={state:SourceState;observedAt:string;version:string|null;reason:string|null;validUntil?:string};
export type HomeSource='schedule'|'acknowledgements'|'exchanges'|'timeOff'|'ownTime'|'communications';
export type AttentionItem={ref:AttentionRef;label:string;href:string;required:boolean;actionable:boolean;deadlineAt:string|null;changedAt:string};
export type HomeSnapshot={observedAt:string;authority:string;timeZone:string;validForMs:number;
 sources:Record<HomeSource,SourceObservation>;publicationState:'complete'|'partial'|'unavailable';
 nextShift:PublishedAssignment|null;currentShift:PublishedAssignment|null;attention:AttentionItem[];
 /** Names of the person's own locations that have not published this week, when partial. */
 unpublishedLocations?:string[]};
export type EmployeeHomeRead={state:'ready'|'partial';snapshot:HomeSnapshot;allSet:boolean}|{state:'unauthorized'|'unavailable';reason:string};
