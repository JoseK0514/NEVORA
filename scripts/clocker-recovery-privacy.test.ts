import {expect,it} from 'vitest';
import {assertPrivateClockInRecovery} from './clocker-recovery-privacy';
import {makePunchCommand,readSubjectPendingPunch,saveSubjectPendingPunch,type ClockView} from '../src/lib/clocker/punch-client';

function fixture(){
  const view:ClockView={state:'ready',subject:'2468'.repeat(16),verificationId:'b'.repeat(60)+'2468',
    firstName:'Avery',expiresAt:'2026-10-23T12:00:00.000Z',locationId:'loc-1',
    snapshot:{revision:4,entry:null,break:null},atOtherLocation:false,breakTypes:[],allowedActions:['CLOCK_IN']};
  const command=makePunchCommand('CLOCK_IN',view,'24680000-0000-4000-8000-000000002468');
  const pending={subject:view.subject,command},values=new Map<string,string>();
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
  saveSubjectPendingPunch(storage,'2',pending);
  const text=[...values.values()][0];
  return {command,pending,text,read:()=>readSubjectPendingPunch(storage,'2',view.subject)};
}

it('accepts the real minimal recovery record when public opaque identifiers contain the fictional PIN digits',()=>{
  const {command,pending,text,read}=fixture();
  expect(read()).toEqual(pending);expect(text).toContain('2468');
  expect(()=>assertPrivateClockInRecovery(text,command)).not.toThrow();
});

for(const level of ['record','command','expected'] as const){
  it.each(['firstName','pin','pinSessionToken','deviceCredential','tokenHash','recordedAt','unexpected'])
    ('rejects additional '+level+' field %s without printing its value',key=>{
      const {command,text}=fixture(),value=JSON.parse(text);
      const target=level==='record'?value:level==='command'?value.command:value.command.expected;
      target[key]='fictional-private-sentinel';
      expect(()=>assertPrivateClockInRecovery(JSON.stringify(value),command)).toThrow('Recovery intent violates the public storage contract.');
      try{assertPrivateClockInRecovery(JSON.stringify(value),command);}catch(error){expect(String(error)).not.toContain('fictional-private-sentinel');}
    });
}

it.each(['2468','Avery','nev_pin_fictional','nev_dev_fictional'])('rejects a private value replacing the subject: %s',subject=>{
  const {command,pending}=fixture();expect(()=>assertPrivateClockInRecovery(JSON.stringify({...pending,subject}),command)).toThrow();
});

it('requires the exact actual sent command rather than another valid public operation',()=>{
  const {command,text}=fixture();expect(()=>assertPrivateClockInRecovery(text,{...command,commandId:'00000000-0000-4000-8000-000000000001'})).toThrow();
});

it('rejects another valid action with entry metadata in this strictly empty CLOCK_IN recovery case',()=>{
  const {command,pending}=fixture();
  const other={...command,action:'CLOCK_OUT',expected:{revision:4,timeEntryId:'fictional-entry',timeEntryVersion:1,breakEntryId:null,breakEntryVersion:null}};
  expect(()=>assertPrivateClockInRecovery(JSON.stringify({...pending,command:other}),other)).toThrow();
});

it.each(['{broken','null','[]','{}'])('rejects malformed recovery storage %s',text=>{
  expect(()=>assertPrivateClockInRecovery(text,fixture().command)).toThrow();
});

it('rejects a PIN or raw credential replacing command identity or verification',()=>{
  const {command,pending}=fixture();
  for(const bad of [{...command,commandId:'2468'},{...command,verificationId:'nev_pin_fictional'},{...command,verificationId:'nev_dev_fictional'}]){
    expect(()=>assertPrivateClockInRecovery(JSON.stringify({...pending,command:bad}),bad)).toThrow();
  }
});
