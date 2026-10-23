import {appendFileSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function ciMode(eventName,payload){
 if(eventName==='push'||eventName==='workflow_dispatch')return 'full';
 if(eventName==='pull_request'&&typeof payload?.pull_request?.draft==='boolean')
  return payload.pull_request.draft?'preflight':'full';
 throw Error('CI requires a supported event and an explicit PR draft state');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const payload=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 const mode=ciMode(process.env.GITHUB_EVENT_NAME,payload);
 if(!process.env.GITHUB_OUTPUT)throw Error('GitHub output file is required');
 appendFileSync(process.env.GITHUB_OUTPUT,`full=${mode==='full'}\n`);
 console.log(`CI mode: ${mode}. Draft preflight is not release acceptance.`);
}
