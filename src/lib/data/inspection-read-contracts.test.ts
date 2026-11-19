import {expect,it} from '@rstest/core';
import {projectToday} from '../today/project';
import {parseEmployeeView} from '../employee-view';
import {projectActionRequestFact} from './action-request-facts.server';
it('Today carries observed setup facts without interpreting registration as punches enabled',()=>{
 const v=projectToday({observedAt:'2030-01-01T00:00:00Z',expiresAt:'2030-01-02T00:00:00Z',timeZone:'America/Puerto_Rico',today:'2029-12-31',shifts:[],entries:[],clockerRegistered:true,setupProgress:{teamSize:4,publishedSchedule:true,registeredClocks:1,peopleWithPins:3,paySchedule:true}});
 expect(v).toMatchObject({state:'ready',clockerRegistered:true,setupProgress:{teamSize:4,publishedSchedule:true,registeredClocks:1,peopleWithPins:3,paySchedule:true}});
});
it('profile carries only the signed-in person contact values',()=>{
 expect(parseEmployeeView({state:'ready',kind:'profile',observedAt:'2030-01-01T00:00:00Z',validForMs:15000,profile:{name:'Owned QA',role:'Employee',workspace:'Owned',timeZone:'America/Puerto_Rico',locations:['Main'],email:'qa@example.invalid',phone:'7875550100'}},'profile')).toMatchObject({profile:{email:'qa@example.invalid',phone:'7875550100'}});
});
it('exchange facts explicitly distinguish swap and cover',()=>{
 expect(projectActionRequestFact({kind:'EXCHANGE',exchange_kind:'SWAP',id:'owned',start_date:'2030-01-01',end_date:'2030-01-01',start_time:'08:00',end_time:'12:00',location_name:'Main',note:null})).toMatchObject({exchangeKind:'SWAP'});
});
