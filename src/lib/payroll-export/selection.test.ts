import {expect,it} from 'vitest';
import type {TimecardItem} from '../timecards/read-model';
import {selectVisibleFinalized,changeExportSelection} from './selection';
const item=(id:string,state:TimecardItem['state']='FINALIZED')=>({card:{employeeId:id},state} as TimecardItem);
it('selects only visible finalized cards with explicit nonfinalized and overflow exclusions',()=>{
 const cards=[item('DRAFT','DRAFT'),...Array.from({length:101},(_,i)=>item(`E${i}`))];
 const result=selectVisibleFinalized(cards);expect(result.selected).toHaveLength(100);expect(result.selected[0]).toBe('E0');expect(result.selected[99]).toBe('E99');expect(result.excluded).toBe(1);expect(result.overLimit).toBe(1);
});
it('caps manual selection at 100, excludes nonfinalized or unseen and supports deliberate deselection',()=>{
 const cards=Array.from({length:101},(_,i)=>item(`E${i}`)),selected=cards.slice(0,100).map(c=>c.card.employeeId);
 expect(changeExportSelection(cards,selected,'E100',true)).toEqual(selected);
 expect(changeExportSelection(cards,selected,'E1',false)).toHaveLength(99);
 expect(changeExportSelection([item('E1','DRAFT')],[],'E1',true)).toEqual([]);
 expect(changeExportSelection(cards,[],'HIDDEN',true)).toEqual([]);
 expect(changeExportSelection(cards,['E0'],'E0',true)).toEqual(['E0']);
});
