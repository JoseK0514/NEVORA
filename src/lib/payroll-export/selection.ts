import type {TimecardItem} from '../timecards/read-model';
export function selectVisibleFinalized(cards:readonly TimecardItem[]):{selected:string[];excluded:number;overLimit:number}{
 const finalized=cards.filter(c=>c.state==='FINALIZED');
 return {selected:finalized.slice(0,100).map(c=>c.card.employeeId),excluded:cards.length-finalized.length,overLimit:Math.max(0,finalized.length-100)};
}
export function changeExportSelection(cards:readonly TimecardItem[],selected:readonly string[],employeeId:string,checked:boolean):string[]{
 if(!checked)return selected.filter(id=>id!==employeeId);
 if(selected.length>=100||selected.includes(employeeId)||!cards.some(c=>c.card.employeeId===employeeId&&c.state==='FINALIZED'))return [...selected];
 return [...selected,employeeId];
}
