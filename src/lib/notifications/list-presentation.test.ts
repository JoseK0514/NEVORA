import {expect,it} from '@rstest/core';
import {notificationListPresentation} from './list-presentation';
import type {NotificationIntent,SourceSnapshot} from './types';
it('shows authorized outcomes and names without copying private notes or reasons',()=>{const source={kind:'TIME_OFF',record:{status:'APPROVED',employeeName:'Fictional QA',reason:'Private leave reason'}} as SourceSnapshot;const v=notificationListPresentation({type:'TIME_OFF_APPROVED'} as NotificationIntent,source,'Time-off update');expect(v).toEqual({eventType:'TIME_OFF_APPROVED',outcome:'APPROVED',names:['Fictional QA'],count:null,label:'Time off approved'});expect(JSON.stringify(v)).not.toContain('Private');});
it('retains a safe fallback for an unsupported presentation type',()=>{expect(notificationListPresentation({type:'OWNED'} as NotificationIntent,null,'Update')).toEqual({eventType:'OWNED',outcome:null,names:[],count:null,label:'Update'});});
