// Ledger only: no app, preview, network, or browser operations.
import {readFile,writeFile,rename,mkdir,stat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
const arg=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];};
const template=new URL('../manual-queue.json',import.meta.url);
const report=arg('report'),file=report?join(resolve(report),'manual-ledger.json'):null;
let queue;
if(file){try{queue=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}}
queue??=JSON.parse(await readFile(template,'utf8'));
const stage=arg('stage'),id=arg('record');
if(id){
 if(!file)throw Error('A final report folder is required for recording evidence');
 if(process.env.PHASE3_RELEASED_SHA!==queue.sha)throw Error('Recording requires root release for the exact queue SHA');
 const row=queue.cases.find(r=>r.id===id);if(!row)throw Error('Unknown manual case ID');
 const status=arg('status'),note=arg('note'),evidence=arg('evidence');
 if(!['measured-fixed','finding','gap','not-applicable'].includes(status))throw Error('Choose measured-fixed, finding, gap or not-applicable');
 if(!note||note.length<12)throw Error('A concrete measured result or explicit gap reason is required');
 if(!evidence)throw Error('At least one evidence file or source-rationale file is required');
 const paths=evidence.split(',').map(x=>resolve(x));for(const path of paths)if(!(await stat(path)).isFile())throw Error('Evidence must be a file');
 row.history??=[];row.history.push({status:row.status,evidence:row.evidence,note:row.note,recordedAt:row.recordedAt});
 Object.assign(row,{status,note,evidence:paths,recordedAt:new Date().toISOString(),sha:queue.sha});
 queue.updatedAt=row.recordedAt;await mkdir(dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(queue,null,1));await rename(file+'.tmp',file);
}
const rows=queue.cases.filter(r=>!stage||r.stage===stage),counts={};for(const row of rows)counts[row.status]=(counts[row.status]??0)+1;
if(process.argv.includes('--next'))console.log(JSON.stringify(rows.find(r=>r.status==='pending')??null,null,2));
else console.log(JSON.stringify({sha:queue.sha,stage:stage??'all',total:rows.length,counts,exitComplete:queue.cases.every(r=>['measured-fixed','not-applicable'].includes(r.status)),file:file??'template-read-only'},null,2));
