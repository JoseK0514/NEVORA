import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const out=import.meta.dirname;
const data=JSON.parse(await readFile(join(out,'dialog-center-proof.json'),'utf8'));
const phases=['ready-flex','ready-center','pending-flex','pending-center','failed-center','closed'];
const cases=new Map(), errors=[];
for(const row of data.records){if(row.error){errors.push(row);continue;}const phase=phases.find(p=>row.key.endsWith('-'+p));if(!phase){errors.push(row);continue;}const key=row.key.slice(0,-phase.length-1);if(!cases.has(key))cases.set(key,{});cases.get(key)[phase]=row;}
const result={checkpoint:data.checkpoint,cases:cases.size,records:data.records.length,completedCases:0,engines:{},readyButtonBoundsUnchanged:0,pendingButtonBoundsUnchanged:0,focusReturns:0,oneHeldPost:0,centeredPendingPrimary:0,maxPendingTextCenterError:0,maxButtonBoundsDelta:0,pendingButtonHeights:{},overflow:[],errors,consoleErrors:[],examples:[]};
const equal=(a,b)=>['x','y','width','height'].every(k=>{const delta=Math.abs(a[k]-b[k]);result.maxButtonBoundsDelta=Math.max(result.maxButtonBoundsDelta,delta);return delta<=1;});
for(const [key,c] of cases){
 const engine=key.split('-')[0];result.engines[engine]=(result.engines[engine]??0)+1;
 const missing=phases.filter(p=>!c[p]);if(missing.length){result.errors.push({key,missing});continue;}result.completedCases++;
 for(const [phase,counter] of [['ready','readyButtonBoundsUnchanged'],['pending','pendingButtonBoundsUnchanged']]){const a=c[phase+'-flex'].buttons,b=c[phase+'-center'].buttons;if(a.length===b.length&&a.every((e,i)=>equal(e.box,b[i].box)))result[counter]++;else result.errors.push({key,phase,reason:'button bounds changed'});}
 if(c.closed.focusBack)result.focusReturns++;
 if(['pending-flex','pending-center','failed-center','closed'].every(p=>c[p].posts===1))result.oneHeldPost++;
 const primary=c['pending-center'].buttons[0];result.pendingButtonHeights[primary.box.height]=(result.pendingButtonHeights[primary.box.height]??0)+1;result.maxPendingTextCenterError=Math.max(result.maxPendingTextCenterError,primary.textCenterError);if(primary.textCenterError<=1)result.centeredPendingPrimary++;
 for(const phase of ['ready-center','pending-center','failed-center'])for(const [i,b]of c[phase].buttons.entries())for(const rect of ['labelBox','textBox']){if(!b[rect])continue;const r=b[rect],p=b.box;if(r.x<p.x-1||r.y<p.y-1||r.right>p.right+1||r.bottom>p.bottom+1)result.overflow.push({key,phase,button:i,rect,buttonBox:p,label:r});}
 for(const phase of phases)for(const e of c[phase].errors??[])if(!result.consoleErrors.includes(e))result.consoleErrors.push(e);
 if(key.includes('Add_break_type')||key.includes('Archive_Rest_break')){const before=c['pending-flex'].buttons[0],after=primary;result.examples.push({key,before:{button:before.box,text:before.textBox,top:before.textTopInset,bottom:before.textBottomInset},after:{button:after.box,text:after.textBox,top:after.textTopInset,bottom:after.textBottomInset}});}
}
await writeFile(join(out,'dialog-center-summary.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,examples:result.examples.slice(0,2)},null,2));
