import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prioritizeUbuntuArchive} from './ci-ubuntu-mirrors.mjs';

const runnerMirrors='http://azure.archive.ubuntu.com/ubuntu/\tpriority:1\nhttps://archive.ubuntu.com/ubuntu/\tpriority:2\nhttps://security.ubuntu.com/ubuntu/\tpriority:3\n';
test('prefers the existing official HTTPS archive while retaining both runner fallbacks',()=>{
 const result=prioritizeUbuntuArchive(runnerMirrors);
 assert.equal(result,'https://archive.ubuntu.com/ubuntu/\tpriority:1\nhttps://security.ubuntu.com/ubuntu/\tpriority:2\nhttp://azure.archive.ubuntu.com/ubuntu/\tpriority:3\n');
 assert.equal(prioritizeUbuntuArchive(result),result);
});
test('refuses an unexpected mirror inventory instead of changing package trust',()=>{
 for(const source of ['',runnerMirrors.replace('https://archive.ubuntu.com','https://unexpected.invalid'),runnerMirrors+runnerMirrors.split('\n')[0]+'\n'])assert.throws(()=>prioritizeUbuntuArchive(source),/Unexpected Ubuntu mirror inventory/);
});
test('names the inventory it found, so a changed runner image can be reviewed',()=>{
 const changed=runnerMirrors.replace('http://azure.archive.ubuntu.com','http://eastus.azure.archive.ubuntu.com');
 assert.throws(()=>prioritizeUbuntuArchive(changed),error=>error.message.includes('http://eastus.azure.archive.ubuntu.com/ubuntu/ priority:1')&&error.message.includes('https://security.ubuntu.com/ubuntu/ priority:3'));
});
test('the command refuses execution outside GitHub Actions before touching system files',()=>{
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./ci-ubuntu-mirrors.mjs',import.meta.url))],{encoding:'utf8',env:{GITHUB_ACTIONS:'false',RUNNER_OS:'Linux'}});
 assert.equal(result.status,1);
 assert.match(result.stderr,/Ubuntu mirror preparation requires a GitHub Linux runner and root/);
});
