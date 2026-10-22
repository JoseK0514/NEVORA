import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function prioritizeUbuntuArchive(source){
 const approved=['https://archive.ubuntu.com/ubuntu/','https://security.ubuntu.com/ubuntu/','http://azure.archive.ubuntu.com/ubuntu/'];
 const lines=source.trim().split(/\r?\n/).map(line=>line.trim().split(/\s+/));
 if(lines.length!==approved.length||new Set(lines.map(([url])=>url)).size!==approved.length||lines.some(([url,priority,...extra])=>!approved.includes(url)||!/^priority:[1-3]$/.test(priority??'')||extra.length))throw Error('Unexpected Ubuntu mirror inventory');
 return approved.map((url,index)=>`${url}\tpriority:${index+1}\n`).join('');
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 if(process.platform!=='linux'||process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='Linux'||process.getuid?.()!==0)throw Error('Ubuntu mirror preparation requires a GitHub Linux runner and root');
 const path='/etc/apt/apt-mirrors.txt';
 writeFileSync(path,prioritizeUbuntuArchive(readFileSync(path,'utf8')));
 console.log('Preferred the existing official Ubuntu HTTPS archive; package trust configuration is unchanged.');
}
