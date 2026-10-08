import 'server-only';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import type {PublishedAssignmentRead} from '../employee-home/types';

export function projectPublishedAssignmentRows(_input:{observedAt:string;timeZone:string;future:Record<string,unknown>[];current:Record<string,unknown>[];coverageComplete:boolean}):PublishedAssignmentRead|null{return null;}
export async function readEmployeePublishedAssignments(_proof:SessionMutationProof,_executor?:SqlExecutor):Promise<PublishedAssignmentRead>{return {observedAt:null,timeZone:null,nextShift:null,currentShift:null,publicationState:'unavailable'};}
