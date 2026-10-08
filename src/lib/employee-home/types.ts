export type PublishedAssignment = {
  shiftId:string;assignmentEpisodeId:string;termsRevision:number;
  weekStart:string;date:string;startAt:string;endAt:string;
  locationId:string;locationLabel:string;positionLabel:string|null;
  designatedLead:boolean;publicationRevisionId:string;
};

export type PublishedAssignmentRead =
  | {observedAt:string;timeZone:string;nextShift:PublishedAssignment|null;currentShift:PublishedAssignment|null;publicationState:'complete'|'partial'}
  | {observedAt:null;timeZone:null;nextShift:null;currentShift:null;publicationState:'unavailable'};
