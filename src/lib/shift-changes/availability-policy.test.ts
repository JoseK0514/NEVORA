import {describe,it,expect} from 'vitest';
import {approvalAvailability} from './availability-policy';
describe('approval availability policy',()=>{
 it('reports the current rule once without repeating it as a row notice',()=>{
  expect(approvalAvailability('MANAGER_REVIEW','MANAGER_REVIEW',false)).toEqual({policy:{managerReviewRequired:true,rulePath:'Scheduling rules › Trades'},notice:null});
 });
 it('retains a recorded manual decision after current policy changes',()=>{
  expect(approvalAvailability('AUTOMATIC_WHEN_VALID','MANAGER_REVIEW',false)).toEqual({policy:{managerReviewRequired:false,rulePath:'Scheduling rules › Trades'},notice:'This request was submitted under manager review.'});
 });
 it('retains the individual overtime reason',()=>{
  expect(approvalAvailability('MANAGER_REVIEW','MANAGER_REVIEW',true).notice).toBe('Projected scheduled overtime needs manager review.');
 });
 it('keeps unknown policy unknown',()=>{expect(approvalAvailability(undefined,undefined,false).policy.managerReviewRequired).toBeNull();});
});
